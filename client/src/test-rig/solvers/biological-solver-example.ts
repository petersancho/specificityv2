import { NODE_DEFINITIONS } from "../../workflow/nodeRegistry";
import { createTestContext, wrapMeshGeometry } from "./rig-utils";
import {
  buildBiologicalConfig,
  buildGeneration0,
  buildGeneration1,
  buildFitnessMetrics,
} from "./biological-solver-fixtures";
import {
  buildBiologicalSolverRunReport,
  logBiologicalSolverRunReport,
} from "./biological-solver-report";
import { buildBiologicalHeroGeometry } from "./solver-hero-geometry";
import {
  resetBiologicalSolverState,
  updateBiologicalSolverState,
} from "../../workflow/nodes/solver/biological/solverState";
import type { SolverOutputs } from "../../workflow/nodes/solver/biological/types";

const getNodeDefinition = (type: string) => {
  const node = NODE_DEFINITIONS.find((definition) => definition.type === type);
  if (!node) {
    throw new Error(`Missing node definition for ${type}`);
  }
  return node;
};

export const runBiologicalSolverExample = () => {
  const biologicalNode = getNodeDefinition("biologicalSolver");
  const evolutionNode = getNodeDefinition("biologicalEvolutionSolver");
  
  const heroMesh = buildBiologicalHeroGeometry();
  const baseGeometry = wrapMeshGeometry("geo-bio", heroMesh);
  const nodeId = "biological-example";

  resetBiologicalSolverState(nodeId);

  const config = buildBiologicalConfig();
  const generation0 = buildGeneration0(baseGeometry.id);
  const generation1 = buildGeneration1(baseGeometry.id, baseGeometry);
  const best = generation1[1];

  const selectedGeometry =
    best.geometryIds && best.geometryIds.length > 0 ? best.geometryIds : [baseGeometry.id];

  const outputs: SolverOutputs = {
    best,
    populationBests: [
      { generation: 0, individuals: [generation0[1]] },
      { generation: 1, individuals: [best] },
    ],
    history: {
      generations: [
        {
          id: 0,
          population: generation0,
          statistics: {
            bestFitness: 0.78,
            meanFitness: 0.665,
            worstFitness: 0.51,
            diversityStdDev: 0.13,
            evaluationTime: 0.12,
          },
          convergenceMetrics: {
            improvementRate: 0.04,
            stagnationCount: 0,
          },
        },
        {
          id: 1,
          population: generation1,
          statistics: {
            bestFitness: 0.86,
            meanFitness: 0.695,
            worstFitness: 0.49,
            diversityStdDev: 0.14,
            evaluationTime: 0.11,
          },
          convergenceMetrics: {
            improvementRate: 0.08,
            stagnationCount: 0,
          },
        },
      ],
      config,
    },
    gallery: {
      allIndividuals: [...generation0, ...generation1],
      byGeneration: { 0: generation0, 1: generation1 },
      bestOverall: best.id,
      userSelections: [],
    },
    selectedGeometry,
  };

  updateBiologicalSolverState(nodeId, {
    outputs,
    config,
    status: "paused",
    generation: 2,
    progress: { current: 2, total: 2, status: "complete" },
    metrics: buildFitnessMetrics(),
    error: null,
  });

  const context = createTestContext(nodeId, [baseGeometry]);

  const biologicalOutputs = biologicalNode.compute({
    inputs: {},
    parameters: {},
    context,
  });

  const evolutionOutputs = evolutionNode.compute({
    inputs: {},
    parameters: {},
    context,
  });

  resetBiologicalSolverState(nodeId);

  const report = buildBiologicalSolverRunReport({
    label: "example/biological",
    config,
    outputs,
    baseGeometry,
  });

  logBiologicalSolverRunReport(report);

  return {
    report,
    biologicalOutputs,
    evolutionOutputs,
    baseGeometry,
    best,
    config,
  };
};

const main = () => {
  runBiologicalSolverExample();
};

const maybeMain = (import.meta as ImportMeta & { main?: boolean }).main;
if (maybeMain === true) {
  main();
}
