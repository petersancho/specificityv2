import { getNodeDefinition } from "../utils/test-utils";
import type { Geometry, RenderMesh } from "../../types";
import { buildStressVertexColors } from "../../utils/stressColors";
import type {
  AnalysisType,
  AnchorGoal,
  ChemistryBlendGoal,
  ChemistryMassGoal,
  ChemistryStiffnessGoal,
  GoalSpecification,
  LoadGoal,
  SolverConfiguration,
  StiffnessGoal,
  VolumeGoal,
} from "../../workflow/nodes/solver/types";
import {
  createTestContext,
  findVertexIndicesAtExtent,
  wrapMeshGeometry,
} from "./rig-utils";
import { buildPhysicsGoals } from "./physics-solver-fixtures";
import {
  buildChemistryConfig,
  buildChemistryGoalsBasic,
  buildChemistryGoalsRegions,
  buildChemistryMaterials,
  buildChemistrySeedsBasic,
  buildChemistrySeedsRegions,
  TEXT_INPUT_MATERIALS,
  TEXT_INPUT_SEEDS,
} from "./chemistry-solver-fixtures";
import {
  buildPhysicsHeroGeometry,
  buildChemistryHeroGeometry,
  buildVoxelHeroGeometry,
} from "./solver-hero-geometry";

export const CHEMISTRY_SOLVER_RIG_VARIANTS = [
  "basic",
  "regions",
  "textInputs",
  "disabled",
] as const;
export type ChemistrySolverRigVariant = (typeof CHEMISTRY_SOLVER_RIG_VARIANTS)[number];

export const DEFAULT_CHEMISTRY_SOLVER_RIG_VARIANT: ChemistrySolverRigVariant = "regions";

export const runPhysicsSolverRig = (analysisType: AnalysisType) => {
  const node = getNodeDefinition("physicsSolver");
  const heroMesh = buildPhysicsHeroGeometry();
  const baseGeometry = wrapMeshGeometry(`geo-physics-${analysisType}`, heroMesh);
  const context = createTestContext(`physics-${analysisType}`, [baseGeometry]);
  const goals = buildPhysicsGoals(
    baseGeometry.mesh,
    analysisType === "dynamic" ? "dynamic" : "static"
  );
  const config: SolverConfiguration = {
    maxIterations: 250,
    convergenceTolerance: 1e-6,
    analysisType,
    timeStep: analysisType === "dynamic" ? 0.02 : undefined,
    animationFrames: analysisType === "static" ? undefined : 20,
    useGPU: false,
    chunkSize: 64,
    safetyLimits: {
      maxDeformation: 100,
      maxStress: 1e12,
    },
  };

  const parameters = {
    geometryId: `physics-${analysisType}-out`,
    analysisType,
    maxIterations: config.maxIterations,
    convergenceTolerance: config.convergenceTolerance,
    animationFrames: analysisType === "static" ? 0 : (config.animationFrames ?? 0),
    timeStep: config.timeStep ?? 0.02,
    maxDeformation: config.safetyLimits.maxDeformation,
    maxStress: config.safetyLimits.maxStress,
    useGPU: config.useGPU,
    chunkSize: config.chunkSize,
  };

  const outputs = node.compute({
    inputs: { baseMesh: baseGeometry.id, goals: goals as unknown as Record<string, unknown>[] },
    parameters,
    context,
  });

  const outputMesh = (() => {
    const mesh = outputs.mesh as RenderMesh;
    const stressField = Array.isArray(outputs.stressField)
      ? (outputs.stressField as number[])
      : [];
    const stressColors =
      stressField.length > 0 ? buildStressVertexColors(mesh, stressField) : null;
    return stressColors ? { ...mesh, colors: stressColors } : mesh;
  })();

  const outputGeometryId = typeof outputs.geometry === "string" ? outputs.geometry : parameters.geometryId;
  const outputGeometry = wrapMeshGeometry(outputGeometryId, outputMesh);
  context.geometryById.set(outputGeometry.id, outputGeometry);

  return {
    outputs,
    outputGeometry,
    baseGeometry,
    goals,
    parameters,
    config,
  };
};

export const runTopologySolverRig = (nodeType: "topologySolver" | "voxelSolver") => {
  const solverNode = getNodeDefinition(nodeType);
  const isoNode = getNodeDefinition("extractIsosurface");
  const heroMesh = buildVoxelHeroGeometry();
  const baseGeometry = wrapMeshGeometry(`geo-${nodeType}`, heroMesh);
  const context = createTestContext(`${nodeType}-context`, [baseGeometry]);

  if (nodeType === "voxelSolver") {
    const parameters = { resolution: 16 };
    const outputs = solverNode.compute({
      inputs: { geometry: baseGeometry.id, resolution: parameters.resolution },
      parameters,
      context,
    });

    const isoParams = {
      geometryId: `${nodeType}-iso`,
      isoValue: 0.5,
      resolution: parameters.resolution,
    };

    const isoOutputs = isoNode.compute({
      inputs: { voxelGrid: outputs.voxelGrid ?? null },
      parameters: isoParams,
      context,
    });

    const meshValue = isoOutputs.mesh;
    const isoMesh: RenderMesh =
      meshValue && typeof meshValue === "object"
        ? (meshValue as RenderMesh)
        : { positions: [], normals: [], uvs: [], indices: [] };

    const outputGeometry = wrapMeshGeometry(isoParams.geometryId, isoMesh);

    return {
      outputs,
      isoOutputs,
      outputGeometry,
      baseGeometry,
      goals: [],
      parameters,
    };
  }

  const anchorIndices = findVertexIndicesAtExtent(baseGeometry.mesh, "x", "min");
  const loadIndices = findVertexIndicesAtExtent(baseGeometry.mesh, "x", "max");

  const goals: GoalSpecification[] = [
    {
      goalType: "anchor",
      weight: 0.35,
      target: 0,
      geometry: { elements: anchorIndices },
      parameters: {
        fixedDOF: { x: true, y: true, z: true },
        anchorType: "fixed",
        springStiffness: 0,
      },
    } satisfies AnchorGoal,
    {
      goalType: "load",
      weight: 0.35,
      target: 1,
      geometry: { elements: loadIndices },
      parameters: {
        force: { x: 0, y: -120, z: 0 },
        applicationPoints: loadIndices,
        distributed: true,
        loadType: "static",
      },
    } satisfies LoadGoal,
    {
      goalType: "stiffness",
      weight: 0.2,
      target: 1,
      constraint: { min: 0, max: 1 },
      geometry: { elements: loadIndices },
      parameters: {
        youngModulus: 2.0e9,
        poissonRatio: 0.3,
        targetStiffness: 1,
      },
    } satisfies StiffnessGoal,
    {
      goalType: "volume",
      weight: 0.1,
      target: 1,
      geometry: { elements: [] },
      parameters: {
        materialDensity: 1200,
        allowedDeviation: 0.05,
        targetVolume: 1,
      },
    } satisfies VolumeGoal,
  ];

  const parameters = {
    volumeFraction: 0.35,
    penaltyExponent: 3,
    filterRadius: 2,
    iterations: 40,
    resolution: 16,
  };
  const outputs = solverNode.compute({
    inputs: { domain: baseGeometry.id, goals: goals as unknown as Record<string, unknown>[] },
    parameters,
    context,
  });

  const isoParams = {
    geometryId: `${nodeType}-iso`,
    isoValue: 0.35,
    resolution: outputs.resolution ?? 12,
  };

  const isoOutputs = isoNode.compute({
    inputs: { voxelGrid: outputs.voxelGrid ?? outputs.densityField },
    parameters: isoParams,
    context,
  });

  const outputGeometry = wrapMeshGeometry(
    isoParams.geometryId,
    isoOutputs.mesh as RenderMesh
  );

  return {
    outputs,
    isoOutputs,
    outputGeometry,
    baseGeometry,
    goals,
    parameters,
  };
};

export const runChemistrySolverRig = (
  variant: ChemistrySolverRigVariant = DEFAULT_CHEMISTRY_SOLVER_RIG_VARIANT
) => {
  const solverNode = getNodeDefinition("chemistrySolver");
  const heroGeometry = buildChemistryHeroGeometry();
  const baseGeometry = wrapMeshGeometry("geo-chemistry", heroGeometry.base);

  const anchorTop = wrapMeshGeometry("geo-chemistry-shell", heroGeometry.regions.shell);
  const anchorBottom = wrapMeshGeometry("geo-chemistry-core", heroGeometry.regions.core);
  const thermalCore = wrapMeshGeometry("geo-chemistry-fibers", heroGeometry.regions.fibers);
  const visionStrip = wrapMeshGeometry("geo-chemistry-inclusions", heroGeometry.regions.inclusions);

  const geometry = [baseGeometry, anchorTop, anchorBottom, thermalCore, visionStrip];
  const context = createTestContext("chemistry-context", geometry);

  const goals =
    variant === "basic"
      ? buildChemistryGoalsBasic()
      : buildChemistryGoalsRegions({ anchorTop, anchorBottom, thermalCore, visionStrip });

  const seeds = variant === "basic" ? buildChemistrySeedsBasic() : buildChemistrySeedsRegions();

  const materials = buildChemistryMaterials(baseGeometry.id);

  const config = buildChemistryConfig();

  const goalRegions = {
    stiffness:
      variant === "regions" || variant === "textInputs" ? [anchorTop.id, anchorBottom.id] : [],
    transparency: variant === "regions" || variant === "textInputs" ? [visionStrip.id] : [],
    thermal: variant === "regions" || variant === "textInputs" ? [thermalCore.id] : [],
  };

  const parameters = {
    geometryId: "chemistry-out",
    ...config,
    ...(variant === "textInputs"
      ? {
          materialsText: TEXT_INPUT_MATERIALS,
          seedsText: TEXT_INPUT_SEEDS,
        }
      : {}),
  };

  const outputs = solverNode.compute({
    inputs: {
      enabled: variant !== "disabled",
      domain: baseGeometry.id,
      materials,
      materialsText: variant === "textInputs" ? TEXT_INPUT_MATERIALS : undefined,
      seeds,
      goals: goals as unknown as Record<string, unknown>[],
    },
    parameters,
    context,
  });

  const meshValue = outputs.mesh;
  const outputMesh: RenderMesh =
    meshValue && typeof meshValue === "object"
      ? (meshValue as RenderMesh)
      : { positions: [], normals: [], uvs: [], indices: [] };

  const outputGeometryId = typeof outputs.geometry === "string" ? outputs.geometry : parameters.geometryId;
  const outputGeometry = wrapMeshGeometry(outputGeometryId, outputMesh);
  context.geometryById.set(outputGeometry.id, outputGeometry);

  return {
    variant,
    outputs,
    outputGeometry,
    baseGeometry,
    context,
    regions:
      variant === "regions" || variant === "textInputs"
        ? { anchorTop, anchorBottom, thermalCore, visionStrip }
        : null,
    parameters,
    goalRegions,
  };
};
