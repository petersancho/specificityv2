import type { RenderMesh, Vec3 } from "../../types";
import type {
  AnchorGoal,
  GoalSpecification,
  LoadGoal,
  SolverConfiguration,
  SolverResult,
  StiffnessGoal,
  VolumeGoal,
} from "../../workflow/nodes/solver/types";
import { meshBounds } from "./rig-utils";
import { safeFinite, summarizeScalarSeries } from "../utils/report-utils";

const vecLength = (vector: Vec3) =>
  Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);

const summarizeVec3Series = (values: ArrayLike<Vec3> | null | undefined) => {
  if (!values || values.length === 0) {
    return {
      count: 0,
      finiteCount: 0,
      nonFiniteCount: 0,
      maxMagnitude: 0,
      meanMagnitude: 0,
      rmsMagnitude: 0,
    };
  }

  let finiteCount = 0;
  let nonFiniteCount = 0;
  let maxMagnitude = 0;
  let sumMagnitude = 0;
  let sumSquares = 0;
  for (let i = 0; i < values.length; i += 1) {
    const candidate = values[i];
    if (!candidate) continue;
    const magnitude = vecLength(candidate);
    if (!Number.isFinite(magnitude)) {
      nonFiniteCount += 1;
      continue;
    }
    finiteCount += 1;
    if (magnitude > maxMagnitude) maxMagnitude = magnitude;
    sumMagnitude += magnitude;
    sumSquares += magnitude * magnitude;
  }

  const meanMagnitude = finiteCount > 0 ? sumMagnitude / finiteCount : 0;
  const rmsMagnitude = finiteCount > 0 ? Math.sqrt(sumSquares / finiteCount) : 0;

  return {
    count: values.length,
    finiteCount,
    nonFiniteCount,
    maxMagnitude,
    meanMagnitude,
    rmsMagnitude,
  };
};

const summarizeGoals = (goals: GoalSpecification[]) =>
  goals.map((goal) => {
    const base = {
      goalType: goal.goalType,
      weight: safeFinite(goal.weight),
      target: typeof goal.target === "number" ? safeFinite(goal.target) : undefined,
      elementCount: goal.geometry?.elements?.length ?? 0,
      constraint: goal.constraint ?? undefined,
    };

    if (goal.goalType === "load") {
      const parameters = (goal as LoadGoal).parameters;
      const force = parameters.force;
      const forceMagnitude = vecLength(force);
      return {
        ...base,
        loadType: parameters.loadType,
        distributed: parameters.distributed,
        force,
        forceMagnitude,
        frequency: parameters.frequency,
      };
    }

    if (goal.goalType === "anchor") {
      const parameters = (goal as AnchorGoal).parameters;
      return {
        ...base,
        anchorType: parameters.anchorType,
        fixedDOF: parameters.fixedDOF,
        springStiffness: parameters.springStiffness,
      };
    }

    if (goal.goalType === "stiffness") {
      const parameters = (goal as StiffnessGoal).parameters;
      return {
        ...base,
        youngModulus: parameters.youngModulus,
        poissonRatio: parameters.poissonRatio,
        targetStiffness: parameters.targetStiffness,
      };
    }

    if (goal.goalType === "volume") {
      const parameters = (goal as VolumeGoal).parameters;
      return {
        ...base,
        targetVolume: parameters.targetVolume,
        materialDensity: parameters.materialDensity,
        allowedDeviation: parameters.allowedDeviation,
      };
    }

    return base;
  });

export type PhysicsComputeMode = "cpu" | "worker" | "cpu-fallback";

export type PhysicsSolverRunReport = {
  label: string;
  timestamp: string;
  computeMode: PhysicsComputeMode;
  mesh: {
    vertexCount: number;
    triangleCount: number;
    bounds: { min: Vec3; max: Vec3 };
  };
  deformedMesh?: {
    bounds: { min: Vec3; max: Vec3 };
  };
  goals: ReturnType<typeof summarizeGoals>;
  config: SolverConfiguration;
  result: {
    success: boolean;
    iterations: number;
    convergenceAchieved: boolean;
    finalObjectiveValue: number;
    warnings: string[];
    errors: string[];
    performanceMetrics: SolverResult["performanceMetrics"];
  };
  stats: {
    displacements: ReturnType<typeof summarizeVec3Series>;
    stressField: ReturnType<typeof summarizeScalarSeries>;
  };
};

export const buildPhysicsSolverRunReport = (args: {
  label: string;
  timestamp?: string;
  computeMode: PhysicsComputeMode;
  mesh: RenderMesh;
  goals: GoalSpecification[];
  config: SolverConfiguration;
  result: SolverResult;
}) => {
  const { label, computeMode, mesh, goals, config, result } = args;
  const timestamp = args.timestamp ?? new Date().toISOString();
  const vertexCount = Math.floor(mesh.positions.length / 3);
  const triangleCount = Math.floor(mesh.indices.length / 3);
  const bounds = meshBounds(mesh);
  const deformedMesh = result.deformedMesh ? meshBounds(result.deformedMesh) : null;

  return {
    label,
    timestamp,
    computeMode,
    mesh: {
      vertexCount,
      triangleCount,
      bounds,
    },
    deformedMesh: deformedMesh ? { bounds: deformedMesh } : undefined,
    goals: summarizeGoals(goals),
    config: { ...config, safetyLimits: { ...config.safetyLimits } },
    result: {
      success: result.success,
      iterations: result.iterations,
      convergenceAchieved: result.convergenceAchieved,
      finalObjectiveValue: safeFinite(result.finalObjectiveValue),
      warnings: result.warnings,
      errors: result.errors,
      performanceMetrics: result.performanceMetrics,
    },
    stats: {
      displacements: summarizeVec3Series(result.displacements),
      stressField: summarizeScalarSeries(result.stressField),
    },
  } satisfies PhysicsSolverRunReport;
};

export const logPhysicsSolverRunReport = (report: PhysicsSolverRunReport) => {
  console.log(`[PHYSICS] ${report.label} (${report.computeMode})`);
  console.log(JSON.stringify(report, null, 2));
};
