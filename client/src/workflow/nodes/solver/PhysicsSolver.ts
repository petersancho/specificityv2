import type { WorkflowNodeDefinition } from "../../nodeRegistry";
import { resolveMeshFromGeometry } from "../../../geometry/meshTessellation";
import type { GoalSpecification, SolverConfiguration, SolverResult } from "./types";
import { validatePhysicsGoals } from "./validation";
import { solvePhysicsChunkedSync } from "./solverInterface";
import { clamp, toBoolean, toNumber } from "./utils";

export const PhysicsSolverNode: WorkflowNodeDefinition = {
  type: "physicsSolver",
  label: "Ἐπιλύτης Φυσικῆς",
  shortLabel: "Physics",
  description: "Computes physical equilibrium states for structural systems.",
  category: "solver",
  iconId: "solver",
  display: {
    nameGreek: "Ἐπιλύτης Φυσικῆς",
    nameEnglish: "Physics Solver",
    romanization: "Epilýtēs Physikês",
    description: "Computes physical equilibrium states for structural systems.",
  },
  inputs: [
    {
      key: "goals",
      label: "Goals",
      type: "goal",
      allowMultiple: true,
      required: true,
      description: "Goal specifications for physics solver.",
    },
    {
      key: "baseMesh",
      label: "Base Mesh",
      type: "geometry",
      required: true,
      description: "Structural mesh to analyze.",
    },
  ],
  outputs: [
    {
      key: "geometry",
      label: "Geometry",
      type: "geometry",
      description: "Deformed geometry id.",
    },
    {
      key: "mesh",
      label: "Deformed Mesh",
      type: "any",
      description: "Deformed mesh data.",
    },
    {
      key: "result",
      label: "Result",
      type: "solverResult",
      description: "Solver result payload.",
    },
    {
      key: "animation",
      label: "Animation",
      type: "animation",
      description: "Animation frames for dynamic or modal analysis.",
    },
    {
      key: "stressField",
      label: "Stress Field",
      type: "any",
      description: "Per-element stress values.",
    },
    {
      key: "displacements",
      label: "Displacements",
      type: "any",
      description: "Per-vertex displacement vectors.",
    },
    {
      key: "diagnostics",
      label: "Diagnostics",
      type: "any",
      description: "Solver diagnostics and performance metrics.",
    },
  ],
  parameters: [
    {
      key: "maxIterations",
      label: "Max Iterations",
      type: "number",
      defaultValue: 1000,
      min: 10,
      max: 10000,
    },
    {
      key: "convergenceTolerance",
      label: "Convergence Tolerance",
      type: "number",
      defaultValue: 1e-6,
      min: 1e-12,
      max: 1e-2,
    },
    {
      key: "analysisType",
      label: "Analysis Type",
      type: "select",
      defaultValue: "static",
      options: [
        { label: "Static", value: "static" },
        { label: "Dynamic", value: "dynamic" },
        { label: "Modal", value: "modal" },
      ],
    },
    {
      key: "animationFrames",
      label: "Animation Frames",
      type: "number",
      defaultValue: 60,
      min: 10,
      max: 300,
      enabled: (params) => params.analysisType !== "static",
    },
    {
      key: "timeStep",
      label: "Time Step (s)",
      type: "number",
      defaultValue: 0.01,
      min: 0.001,
      max: 1,
      enabled: (params) => params.analysisType === "dynamic",
    },
    {
      key: "maxDeformation",
      label: "Max Deformation",
      type: "number",
      defaultValue: 10,
      min: 0.1,
      max: 100,
    },
    {
      key: "maxStress",
      label: "Max Stress (Pa)",
      type: "number",
      defaultValue: 1e9,
      min: 1e6,
      max: 1e12,
    },
    {
      key: "useGPU",
      label: "Use GPU",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "chunkSize",
      label: "Chunk Size",
      type: "number",
      defaultValue: 1000,
      min: 100,
      max: 10000,
    },
  ],
  primaryOutputKey: "geometry",
  compute: ({ inputs, parameters, context }) => {
    const baseMeshId = typeof inputs.baseMesh === "string" ? inputs.baseMesh : null;
    if (!baseMeshId) {
      throw new Error("Base mesh input is required.");
    }

    const geometry = context.geometryById.get(baseMeshId);
    if (!geometry) {
      throw new Error("Referenced base mesh could not be found.");
    }

    const mesh = resolveMeshFromGeometry(geometry);
    if (!mesh) {
      throw new Error("Base geometry does not contain mesh data.");
    }

    const rawGoals = Array.isArray(inputs.goals)
      ? inputs.goals
      : inputs.goals
        ? [inputs.goals]
        : [];
    const goals = rawGoals.filter(
      (goal): goal is GoalSpecification =>
        Boolean(goal) && typeof goal === "object" && "goalType" in (goal as object)
    );

    const validation = validatePhysicsGoals(goals);
    if (!validation.valid) {
      throw new Error(`Goal validation failed: ${validation.errors.join(", ")}`);
    }

    const normalizedGoals = validation.normalizedGoals ?? goals;

    const analysisTypeRaw = typeof parameters.analysisType === "string" ? parameters.analysisType : "static";
    const analysisType = analysisTypeRaw === "dynamic" || analysisTypeRaw === "modal" ? analysisTypeRaw : "static";

    const config: SolverConfiguration = {
      maxIterations: clamp(toNumber(parameters.maxIterations, 1000), 10, 10000),
      convergenceTolerance: clamp(toNumber(parameters.convergenceTolerance, 1e-6), 1e-12, 1e-2),
      analysisType,
      timeStep: analysisType === "dynamic" ? toNumber(parameters.timeStep, 0.01) : undefined,
      animationFrames: analysisType === "static" ? undefined : Math.round(toNumber(parameters.animationFrames, 60)),
      useGPU: toBoolean(parameters.useGPU, true),
      chunkSize: Math.round(clamp(toNumber(parameters.chunkSize, 1000), 100, 10000)),
      safetyLimits: {
        maxDeformation: toNumber(parameters.maxDeformation, 10),
        maxStress: toNumber(parameters.maxStress, 1e9),
      },
    };

    const result = solvePhysicsChunkedSync(
      {
        mesh,
        goals: normalizedGoals,
        config,
      },
      config.chunkSize
    ) as SolverResult;

    if (validation.warnings.length > 0) {
      result.warnings.push(...validation.warnings);
    }

    if (!result.success) {
      throw new Error(`Physics solver failed: ${result.errors.join(", ")}`);
    }

    const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;

    return {
      geometry: geometryId,
      mesh: result.deformedMesh ?? mesh,
      result,
      animation: result.animation ?? null,
      stressField: result.stressField ?? [],
      displacements: result.displacements ?? [],
      diagnostics: {
        iterations: result.iterations,
        convergence: result.convergenceAchieved,
        computeTime: result.performanceMetrics.computeTime,
        memoryUsed: result.performanceMetrics.memoryUsed,
        warnings: result.warnings,
      },
    };
  },
};
