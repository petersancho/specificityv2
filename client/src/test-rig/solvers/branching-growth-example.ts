import { deriveGoalTuning } from "../../workflow/nodes/solver/biological/evaluation";
import type { SolverConfig } from "../../workflow/nodes/solver/biological/types";
import type { GoalSpecification } from "../../workflow/nodes/solver/types";
import type { RenderMesh } from "../../types";
import { meshBounds } from "./rig-utils";
import { runBiologicalSolverRig } from "./solver-rigs";

type MeshSummary = {
  vertexCount: number;
  triangleCount: number;
  bounds: ReturnType<typeof meshBounds>;
  hasColors: boolean;
};

const summarizeMesh = (mesh: RenderMesh): MeshSummary => {
  const vertexCount = Math.floor(mesh.positions.length / 3);
  const triangleCount = Math.floor(mesh.indices.length / 3);
  const bounds = meshBounds(mesh);
  return {
    vertexCount,
    triangleCount,
    bounds,
    hasColors: Array.isArray(mesh.colors) && mesh.colors.length > 0,
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
      bestGenomeVector3: biologicalOutputs.bestGenome,
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
