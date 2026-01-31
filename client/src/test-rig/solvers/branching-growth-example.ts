import { deriveGoalTuning } from "../../workflow/nodes/solver/biological/evaluation";
import type { SolverConfig } from "../../workflow/nodes/solver/biological/types";
import type { GoalSpecification } from "../../workflow/nodes/solver/types";
import type { RenderMesh } from "../../types";
import { meshBounds } from "./rig-utils";
import { runBiologicalSolverRig } from "./solver-rigs";
import { BRANCHING_GROWTH_GENOME_DIMENSION } from "./branching-growth-contract";

type MeshSummary = {
  vertexCount: number;
  triangleCount: number;
  bounds: ReturnType<typeof meshBounds> | null;
  hasColors: boolean;
  isTriangleMesh: boolean;
};


const summarizeMesh = (mesh: RenderMesh): MeshSummary => {
  const isTriangleMesh =
    mesh.positions.length > 0 &&
    mesh.indices.length > 0 &&
    mesh.positions.length % 3 === 0 &&
    mesh.indices.length % 3 === 0;

  if (!isTriangleMesh) {
    throw new Error(
      `BranchingGrowth solver test rig expects triangle mesh baseGeometry (positions=${mesh.positions.length}, indices=${mesh.indices.length})`
    );
  }

  const vertexCount = mesh.positions.length / 3;
  const triangleCount = mesh.indices.length / 3;
  const bounds = meshBounds(mesh);
  return {
    vertexCount,
    triangleCount,
    bounds,
    hasColors: Array.isArray(mesh.colors) && mesh.colors.length > 0,
    isTriangleMesh,
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
    status: string;
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
