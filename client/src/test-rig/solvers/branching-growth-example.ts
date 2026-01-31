import { deriveGoalTuning } from "../../workflow/nodes/solver/biological/evaluation";
import type { GoalSpecification } from "../../workflow/nodes/solver/types";
import type { RenderMesh } from "../../types";
import { meshBounds } from "./rig-utils";
import { runBiologicalSolverRig } from "./solver-rigs";

const summarizeMesh = (mesh: RenderMesh) => {
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

export const generateBranchingGrowthSolverExample = () => {
  const { biologicalOutputs, baseGeometry, individual, config } = runBiologicalSolverRig();

  const growthGoal: GoalSpecification = {
    goalType: "growth",
    weight: 1,
    target: 0.7,
    geometry: {
      elements: [0, 1, 2, 3, 4],
    },
    parameters: {
      growthRate: 1.5,
      targetBiomass: 0.7,
      carryingCapacity: 2,
    },
  };

  const goalTuning = deriveGoalTuning([growthGoal]);

  return {
    schemaVersion: 1,
    solver: "biologicalSolver",
    timestamp: new Date().toISOString(),
    example: {
      config,
      goalTuning: {
        growthGoal,
        ...goalTuning,
      },
      outputs: {
        bestScore: biologicalOutputs.bestScore,
        bestGenome: biologicalOutputs.bestGenome,
        evaluations: biologicalOutputs.evaluations,
        populationSize: biologicalOutputs.populationSize,
        generations: biologicalOutputs.generations,
        mutationRate: biologicalOutputs.mutationRate,
        status: biologicalOutputs.status,
      },
      bestIndividual: {
        id: individual.id,
        genomeString: individual.genomeString,
        fitness: individual.fitness,
        generation: individual.generation,
        rank: individual.rank,
      },
      baseGeometry: {
        id: baseGeometry.id,
        mesh: summarizeMesh(baseGeometry.mesh),
      },
    },
  };
};
