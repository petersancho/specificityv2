import { deriveGoalTuning } from "../../workflow/nodes/solver/biological/evaluation";
import type { SolverConfig } from "../../workflow/nodes/solver/biological/types";
import type { GoalSpecification } from "../../workflow/nodes/solver/types";
import type { RenderMesh } from "../../types";
import { meshBounds } from "./rig-utils";
import { runBiologicalSolverRig } from "./solver-rigs";
import { BRANCHING_GROWTH_GENOME_DIMENSION } from "./branching-growth-contract";
import type { SolverRuntimeState } from "../../workflow/nodes/solver/biological/solverState";

type MeshSummary = {
  valid: boolean;
  vertexCount: number;
  triangleCount: number;
  bounds: ReturnType<typeof meshBounds> | null;
  hasColors: boolean;
  isTriangleMesh: boolean;
  validationWarnings?: string[];
};


const summarizeMesh = (mesh: RenderMesh): MeshSummary => {
  const validationWarnings: string[] = [];
  const isTriangleMesh =
    mesh.positions.length > 0 &&
    mesh.indices.length > 0 &&
    mesh.positions.length % 3 === 0 &&
    mesh.indices.length % 3 === 0;

  if (!isTriangleMesh) {
    validationWarnings.push(
      `Expected triangle mesh (got positions=${mesh.positions.length}, indices=${mesh.indices.length})`
    );
  }

  const vertexCount = isTriangleMesh ? mesh.positions.length / 3 : 0;
  const triangleCount = isTriangleMesh ? mesh.indices.length / 3 : 0;
  const bounds = isTriangleMesh ? meshBounds(mesh) : null;
  return {
    valid: isTriangleMesh,
    vertexCount,
    triangleCount,
    bounds,
    hasColors: Array.isArray(mesh.colors) && mesh.colors.length > 0,
    isTriangleMesh,
    validationWarnings: validationWarnings.length > 0 ? validationWarnings : undefined,
  };
};

export type BranchingGrowthSolverExampleV1 = {
  schemaVersion: 1;
  solver: "biologicalSolver";
  timestamp: string;
  config: Pick<
    SolverConfig,
    | "populationSize"
    | "generations"
    | "mutationRate"
    | "crossoverRate"
    | "elitism"
    | "selectionMethod"
    | "mutationType"
    | "crossoverType"
    | "randomSeed"
  >;
  goals: {
    growth: GoalSpecification;
  };
  goalTuning: {
    mutationRateScale: number;
    populationScale: number;
  };
  outputs: {
    bestScore: number;
    bestGenomeVector3: { x: number; y: number; z: number };
    evaluations: number;
    status: SolverRuntimeState["status"];
  };
  bestIndividual: {
    id: string;
    genome: number[];
    fitness: number;
    generation: number;
    rank: number;
  };
  baseGeometry: {
    id: string;
    mesh: MeshSummary;
  };
};

export const makeBranchingGrowthExampleGrowthGoal = (): GoalSpecification => ({
  goalType: "growth",
  weight: 1,
  target: 0.7,
  geometry: {
    elements: [0, 1, 2, 3, 4],
  },
  parameters: {
    growthRate: 2,
    targetBiomass: 0.7,
    carryingCapacity: 3,
  },
});

export const generateBranchingGrowthSolverExample = (): BranchingGrowthSolverExampleV1 => {
  const { biologicalOutputs, baseGeometry, individual, config } = runBiologicalSolverRig();

  if (individual.genome.length !== BRANCHING_GROWTH_GENOME_DIMENSION) {
    throw new Error(
      `BranchingGrowth example expects genome length ${BRANCHING_GROWTH_GENOME_DIMENSION} (got ${individual.genome.length})`
    );
  }

  const [branchX, branchY, branchZ] = individual.genome;

  const growthGoal = makeBranchingGrowthExampleGrowthGoal();

  const goalTuning = deriveGoalTuning([growthGoal]);

  return {
    schemaVersion: 1,
    solver: "biologicalSolver",
    timestamp: new Date().toISOString(),
    config: {
      populationSize: config.populationSize,
      generations: config.generations,
      mutationRate: config.mutationRate,
      crossoverRate: config.crossoverRate,
      elitism: config.elitism,
      selectionMethod: config.selectionMethod,
      mutationType: config.mutationType,
      crossoverType: config.crossoverType,
      randomSeed: config.randomSeed,
    },
    goals: {
      growth: growthGoal,
    },
    goalTuning: {
      mutationRateScale: goalTuning.mutationRateScale,
      populationScale: goalTuning.populationScale,
    },
    outputs: {
      bestScore: biologicalOutputs.bestScore,
      bestGenomeVector3: {
        x: branchX,
        y: branchY,
        z: branchZ,
      },
      evaluations: biologicalOutputs.evaluations,
      status: biologicalOutputs.status,
    },
    bestIndividual: {
      id: individual.id,
      genome: [...individual.genome],
      fitness: individual.fitness,
      generation: individual.generation,
      rank: individual.rank,
    },
    baseGeometry: {
      id: baseGeometry.id,
      mesh: summarizeMesh(baseGeometry.mesh),
    },
  };
};
