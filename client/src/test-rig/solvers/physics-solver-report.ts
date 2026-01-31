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

export type ScalarStats = {
  count: number;
  finite: number;
  nonFinite: number;
  min: number;
  max: number;
  mean: number;
};

export type MeshSummary = {
  vertexCount: number;
  triangleCount: number;
  bounds: { min: Vec3; max: Vec3 };
};

export type PhysicsGoalSummary = {
  goalType: GoalSpecification["goalType"];
  weight: number;
  target?: number;
  elementCount: number;
  parameters: Record<string, unknown>;
};

export type PhysicsSolverReport = {
  name: string;
  mesh: {
    input: MeshSummary;
    output: MeshSummary;
  };
  goals: PhysicsGoalSummary[];
  config: SolverConfiguration;
  result: {
    success: boolean;
    iterations: number;
    convergenceAchieved: boolean;
    finalObjectiveValue: number;
    warnings: string[];
    errors: string[];
    performance: {
      computeTimeMs: number;
      memoryUsedMB: number;
    };
    fields: {
      stressField: ScalarStats;
      displacementMagnitude: ScalarStats;
      animationFrames: number | null;
    };
  };
};

export const summarizeScalarField = (values: number[] | null | undefined): ScalarStats => {
  const list = values ?? [];
  let finite = 0;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let nonFinite = 0;

  for (let i = 0; i < list.length; i += 1) {
    const value = list[i];
    if (!Number.isFinite(value)) {
      nonFinite += 1;
      continue;
    }
    finite += 1;
    sum += value;
    if (value < min) min = value;
    if (value > max) max = value;
  }

  const mean = finite > 0 ? sum / finite : 0;
  return {
    count: list.length,
    finite,
    nonFinite,
    min: Number.isFinite(min) ? min : 0,
    max: Number.isFinite(max) ? max : 0,
    mean: Number.isFinite(mean) ? mean : 0,
  };
};

const summarizeDisplacementMagnitudes = (displacements: Vec3[] | null | undefined): ScalarStats => {
  const mags: number[] = [];
  const list = displacements ?? [];
  mags.length = list.length;
  for (let i = 0; i < list.length; i += 1) {
    const disp = list[i];
    const x = Number(disp?.x ?? 0);
    const y = Number(disp?.y ?? 0);
    const z = Number(disp?.z ?? 0);
    const mag = Math.sqrt(x * x + y * y + z * z);
    mags[i] = mag;
  }
  return summarizeScalarField(mags);
};

export const summarizeMesh = (mesh: RenderMesh): MeshSummary => {
  const vertexCount = Math.floor(mesh.positions.length / 3);
  const triangleCount = Math.floor(mesh.indices.length / 3);
  const min: Vec3 = { x: Infinity, y: Infinity, z: Infinity };
  const max: Vec3 = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = mesh.positions[i];
    const y = mesh.positions[i + 1];
    const z = mesh.positions[i + 2];
    if (x < min.x) min.x = x;
    if (y < min.y) min.y = y;
    if (z < min.z) min.z = z;
    if (x > max.x) max.x = x;
    if (y > max.y) max.y = y;
    if (z > max.z) max.z = z;
  }
  const safe = (value: number) => (Number.isFinite(value) ? value : 0);
  return {
    vertexCount,
    triangleCount,
    bounds: {
      min: { x: safe(min.x), y: safe(min.y), z: safe(min.z) },
      max: { x: safe(max.x), y: safe(max.y), z: safe(max.z) },
    },
  };
};

export const summarizeGoals = (goals: GoalSpecification[]): PhysicsGoalSummary[] =>
  goals.map((goal) => {
    switch (goal.goalType) {
      case "load": {
        const load = goal as LoadGoal;
        return {
          goalType: load.goalType,
          weight: load.weight,
          target: load.target,
          elementCount: load.geometry.elements.length,
          parameters: {
            force: load.parameters.force,
            distributed: load.parameters.distributed,
            loadType: load.parameters.loadType,
            applicationPointCount: load.parameters.applicationPoints.length,
            timeProfileLength: load.parameters.timeProfile?.length ?? 0,
            frequency: load.parameters.frequency ?? null,
          },
        };
      }
      case "anchor": {
        const anchor = goal as AnchorGoal;
        return {
          goalType: anchor.goalType,
          weight: anchor.weight,
          target: anchor.target,
          elementCount: anchor.geometry.elements.length,
          parameters: {
            fixedDOF: anchor.parameters.fixedDOF,
            anchorType: anchor.parameters.anchorType ?? null,
            springStiffness: anchor.parameters.springStiffness ?? 0,
          },
        };
      }
      case "stiffness": {
        const stiffness = goal as StiffnessGoal;
        return {
          goalType: stiffness.goalType,
          weight: stiffness.weight,
          target: stiffness.target,
          elementCount: stiffness.geometry.elements.length,
          parameters: {
            youngModulus: stiffness.parameters.youngModulus,
            poissonRatio: stiffness.parameters.poissonRatio,
            targetStiffness: stiffness.parameters.targetStiffness ?? null,
          },
        };
      }
      case "volume": {
        const volume = goal as VolumeGoal;
        return {
          goalType: volume.goalType,
          weight: volume.weight,
          target: volume.target,
          elementCount: volume.geometry.elements.length,
          parameters: {
            targetVolume: volume.parameters.targetVolume ?? null,
            materialDensity: volume.parameters.materialDensity,
            allowedDeviation: volume.parameters.allowedDeviation,
          },
        };
      }
      default:
        return {
          goalType: goal.goalType,
          weight: goal.weight,
          target: goal.target,
          elementCount: goal.geometry.elements.length,
          parameters: {
            ...goal.parameters,
          },
        };
    }
  });

export const buildPhysicsSolverReport = (args: {
  name: string;
  inputMesh: RenderMesh;
  outputMesh: RenderMesh;
  goals: GoalSpecification[];
  config: SolverConfiguration;
  result: SolverResult;
}): PhysicsSolverReport => {
  const memoryUsedMB = args.result.performanceMetrics.memoryUsed / (1024 * 1024);
  return {
    name: args.name,
    mesh: {
      input: summarizeMesh(args.inputMesh),
      output: summarizeMesh(args.outputMesh),
    },
    goals: summarizeGoals(args.goals),
    config: args.config,
    result: {
      success: args.result.success,
      iterations: args.result.iterations,
      convergenceAchieved: args.result.convergenceAchieved,
      finalObjectiveValue: args.result.finalObjectiveValue,
      warnings: args.result.warnings,
      errors: args.result.errors,
      performance: {
        computeTimeMs: args.result.performanceMetrics.computeTime,
        memoryUsedMB: Number.isFinite(memoryUsedMB) ? memoryUsedMB : 0,
      },
      fields: {
        stressField: summarizeScalarField(args.result.stressField),
        displacementMagnitude: summarizeDisplacementMagnitudes(args.result.displacements),
        animationFrames: args.result.animation ? args.result.animation.frames.length : null,
      },
    },
  };
};
