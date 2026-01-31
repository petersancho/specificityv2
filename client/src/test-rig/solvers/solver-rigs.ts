import { NODE_DEFINITIONS } from "../../workflow/nodeRegistry";
import type { Geometry, RenderMesh } from "../../types";
import { buildStressVertexColors } from "../../utils/stressColors";
import type {
  AnchorGoal,
  AnalysisType,
  ChemistryBlendGoal,
  ChemistryMassGoal,
  ChemistryStiffnessGoal,
  GoalSpecification,
  LoadGoal,
  StiffnessGoal,
  VolumeGoal,
} from "../../workflow/nodes/solver/types";
import type { SolverOutputs, Individual, SolverConfig } from "../../workflow/nodes/solver/biological/types";
import {
  resetBiologicalSolverState,
  updateBiologicalSolverState,
} from "../../workflow/nodes/solver/biological/solverState";
import {
  createBoxGeometry,
  createSphereGeometry,
  createTestContext,
  findVertexIndicesAtExtent,
  wrapMeshGeometry,
} from "./rig-utils";

const getNodeDefinition = (type: string) => {
  const node = NODE_DEFINITIONS.find((definition) => definition.type === type);
  if (!node) {
    throw new Error(`Missing node definition for ${type}`);
  }
  return node;
};

const buildPhysicsGoals = (
  mesh: RenderMesh,
  loadType: "static" | "dynamic" | "cyclic"
): GoalSpecification[] => {
  const anchorIndices = findVertexIndicesAtExtent(mesh, "y", "min");
  const loadIndices = findVertexIndicesAtExtent(mesh, "y", "max");

  const stiffness: StiffnessGoal = {
    goalType: "stiffness",
    weight: 0.3,
    target: 1,
    constraint: { min: 0, max: 1 },
    geometry: { elements: loadIndices },
    parameters: {
      youngModulus: 2.1e9,
      poissonRatio: 0.3,
      targetStiffness: 1,
    },
  };

  const volume: VolumeGoal = {
    goalType: "volume",
    weight: 0.2,
    target: 1,
    geometry: { elements: [] },
    parameters: {
      targetVolume: 1,
      materialDensity: 7800,
      allowedDeviation: 0.1,
    },
  };

  const load: LoadGoal = {
    goalType: "load",
    weight: 0.3,
    target: 1,
    geometry: { elements: loadIndices },
    parameters: {
      force: { x: 0, y: -120, z: 0 },
      applicationPoints: loadIndices,
      distributed: true,
      loadType,
      timeProfile: loadType === "dynamic" ? [0, 0.5, 1, 0.5, 0] : undefined,
      frequency: loadType === "cyclic" ? 2 : undefined,
    },
  };

  const anchor: AnchorGoal = {
    goalType: "anchor",
    weight: 0.2,
    target: 0,
    geometry: { elements: anchorIndices },
    parameters: {
      fixedDOF: { x: true, y: true, z: true },
      anchorType: "fixed",
      springStiffness: 0,
    },
  };

  return [stiffness, volume, load, anchor];
};

export const runPhysicsSolverRig = (analysisType: AnalysisType) => {
  const node = getNodeDefinition("physicsSolver");
  const baseGeometry = createBoxGeometry(`geo-physics-${analysisType}`, {
    width: 2,
    height: 1.2,
    depth: 1.5,
  });
  const context = createTestContext(`physics-${analysisType}`, [baseGeometry]);
  const goals = buildPhysicsGoals(
    baseGeometry.mesh,
    analysisType === "dynamic" ? "dynamic" : "static"
  );
  const parameters = {
    geometryId: `physics-${analysisType}-out`,
    analysisType,
    maxIterations: 250,
    convergenceTolerance: 1e-6,
    animationFrames: analysisType === "static" ? 0 : 20,
    timeStep: 0.02,
    maxDeformation: 100,
    maxStress: 1e12,
    useGPU: false,
    chunkSize: 64,
  };

  const outputs = node.compute({
    inputs: { baseMesh: baseGeometry.id, goals },
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

  const outputGeometry = wrapMeshGeometry(
    parameters.geometryId,
    outputMesh
  );

  return {
    outputs,
    outputGeometry,
    baseGeometry,
    goals,
    parameters,
  };
};

export const runTopologySolverRig = (nodeType: "topologySolver" | "voxelSolver") => {
  const solverNode = getNodeDefinition(nodeType);
  const isoNode = getNodeDefinition("extractIsosurface");
  const baseGeometry = createBoxGeometry(`geo-${nodeType}`, { width: 1.8, height: 1.2, depth: 1.4 });
  const context = createTestContext(`${nodeType}-context`, [baseGeometry]);

  const parameters = {
    volumeFraction: 0.6,
    penaltyExponent: 3,
    filterRadius: 1,
    iterations: 24,
    resolution: 12,
  };

  const outputs = solverNode.compute({
    inputs: { domain: baseGeometry.id },
    parameters,
    context,
  });

  const isoParams = {
    geometryId: `${nodeType}-iso`,
    isoValue: 0.12,
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
  };
};

export const runChemistrySolverRig = () => {
  const solverNode = getNodeDefinition("chemistrySolver");
  const baseGeometry = createBoxGeometry("geo-chemistry", { width: 2.2, height: 1.4, depth: 1.6 });
  const context = createTestContext("chemistry-context", [baseGeometry]);

  const blendGoal: ChemistryBlendGoal = {
    goalType: "chemBlend",
    weight: 0.45,
    geometry: { elements: [] },
    parameters: {
      smoothness: 0.7,
      diffusivity: 1.1,
    },
  };

  const massGoal: ChemistryMassGoal = {
    goalType: "chemMass",
    weight: 0.35,
    geometry: { elements: [] },
    parameters: {
      targetMassFraction: 0.6,
      densityPenalty: 1.2,
    },
  };

  const stiffnessGoal: ChemistryStiffnessGoal = {
    goalType: "chemStiffness",
    weight: 0.2,
    geometry: { elements: [] },
    parameters: {
      loadVector: { x: 0, y: 1, z: 0 },
      structuralPenalty: 1.1,
    },
  };

  const parameters = {
    geometryId: "chemistry-out",
    particleCount: 10000,
    particleDensity: 1.0,
    iterations: 40,
    fieldResolution: 48,
    isoValue: 0.12,
    convergenceTolerance: 0.002,
    blendStrength: 0.7,
    historyLimit: 60,
    seed: 7,
    materialOrder: "Steel, Ceramic, Glass",
  };

  const outputs = solverNode.compute({
    inputs: {
      domain: baseGeometry.id,
      materials: [
        {
          geometryId: baseGeometry.id,
          material: { name: "Steel", color: [0.75, 0.75, 0.78] },
          weight: 1,
        },
        {
          geometryId: baseGeometry.id,
          material: { name: "Ceramic", color: [0.9, 0.2, 0.2] },
          weight: 0.7,
        },
        {
          geometryId: baseGeometry.id,
          material: { name: "Glass", color: [0.2, 0.4, 0.9] },
          weight: 0.6,
        },
      ],
      seeds: [
        {
          position: { x: 0, y: 0, z: 0 },
          material: "Glass",
          strength: 0.9,
          radius: 0.4,
        },
      ],
      goals: [blendGoal, massGoal, stiffnessGoal],
    },
    parameters,
    context,
  });

  const outputGeometry = wrapMeshGeometry(
    parameters.geometryId,
    outputs.mesh as RenderMesh
  );

  context.geometryById.set(outputGeometry.id, outputGeometry);

  return {
    outputs,
    outputGeometry,
    baseGeometry,
    context,
  };
};

export const runBiologicalSolverRig = () => {
  const biologicalNode = getNodeDefinition("biologicalSolver");
  const evolutionNode = getNodeDefinition("biologicalEvolutionSolver");
  const baseGeometry = createSphereGeometry("geo-bio", 1, 10);
  const nodeId = "biological-rig";

  resetBiologicalSolverState(nodeId);

  const config: SolverConfig = {
    populationSize: 4,
    generations: 2,
    mutationRate: 0.18,
    crossoverRate: 0.7,
    elitism: 1,
    selectionMethod: "tournament",
    tournamentSize: 3,
    mutationType: "gaussian",
    crossoverType: "uniform",
    seedFromCurrent: false,
    randomSeed: 42,
  };

  const makeIndividual = (
    id: string,
    genome: number[],
    fitness: number,
    generation: number,
    rank: number,
    options?: {
      fitnessBreakdown?: Record<string, number>;
      geometryIds?: string[];
      geometry?: Geometry[];
    }
  ): Individual => ({
    id,
    genome,
    genomeString: genome.join(","),
    fitness,
    fitnessBreakdown: options?.fitnessBreakdown,
    generation,
    rank,
    geometryIds: options?.geometryIds,
    geometry: options?.geometry,
    thumbnail: null,
  });

  const generation0: Individual[] = [
    makeIndividual("ind-0-a", [0.25, -0.35, 0.6], 0.74, 0, 2, {
      fitnessBreakdown: { growth: 0.42, homeostasis: 0.32 },
      geometryIds: [baseGeometry.id],
    }),
    makeIndividual("ind-0-b", [0.32, -0.22, 0.55], 0.78, 0, 1, {
      fitnessBreakdown: { growth: 0.46, homeostasis: 0.32 },
      geometryIds: [baseGeometry.id],
    }),
    makeIndividual("ind-0-c", [0.11, -0.48, 0.61], 0.63, 0, 3, {
      fitnessBreakdown: { growth: 0.36, homeostasis: 0.27 },
      geometryIds: [baseGeometry.id],
    }),
    makeIndividual("ind-0-d", [0.44, -0.18, 0.4], 0.51, 0, 4, {
      fitnessBreakdown: { growth: 0.31, homeostasis: 0.2 },
      geometryIds: [baseGeometry.id],
    }),
  ];

  const generation1: Individual[] = [
    makeIndividual("ind-1-a", [0.31, -0.33, 0.64], 0.81, 1, 2, {
      fitnessBreakdown: { growth: 0.5, homeostasis: 0.31 },
      geometryIds: [baseGeometry.id],
    }),
    makeIndividual("ind-1-b", [0.37, -0.19, 0.7], 0.86, 1, 1, {
      fitnessBreakdown: { growth: 0.55, homeostasis: 0.31 },
      geometryIds: [baseGeometry.id],
      geometry: [baseGeometry],
    }),
    makeIndividual("ind-1-c", [0.08, -0.52, 0.66], 0.62, 1, 3, {
      fitnessBreakdown: { growth: 0.35, homeostasis: 0.27 },
      geometryIds: [baseGeometry.id],
    }),
    makeIndividual("ind-1-d", [0.4, -0.11, 0.48], 0.49, 1, 4, {
      fitnessBreakdown: { growth: 0.29, homeostasis: 0.2 },
      geometryIds: [baseGeometry.id],
    }),
  ];

  const best = generation1[1];

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
    selectedGeometry: best.geometryIds ?? [],
  };

  updateBiologicalSolverState(nodeId, {
    outputs,
    config,
    status: "paused",
    generation: 2,
    progress: { current: 2, total: 2, status: "complete" },
    metrics: [
      { id: "growth", name: "Growth", mode: "maximize", weight: 1 },
      { id: "homeostasis", name: "Homeostasis", mode: "maximize", weight: 1 },
    ],
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

  return {
    biologicalOutputs,
    evolutionOutputs,
    baseGeometry,
    best,
    config,
  };
};
