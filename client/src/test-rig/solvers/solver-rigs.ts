import { NODE_DEFINITIONS } from "../../workflow/nodeRegistry";
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
  translateMeshGeometry,
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

export const CHEMISTRY_SOLVER_RIG_VARIANTS = [
  "basic",
  "regions",
  "textInputs",
  "disabled",
] as const;
export type ChemistrySolverRigVariant = (typeof CHEMISTRY_SOLVER_RIG_VARIANTS)[number];

export const DEFAULT_CHEMISTRY_SOLVER_RIG_VARIANT: ChemistrySolverRigVariant = "regions";

const getNodeDefinition = (type: string) => {
  const node = NODE_DEFINITIONS.find((definition) => definition.type === type);
  if (!node) {
    throw new Error(`Missing node definition for ${type}`);
  }
  return node;
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
    config,
  };
};

export const runTopologySolverRig = (nodeType: "topologySolver" | "voxelSolver") => {
  const solverNode = getNodeDefinition(nodeType);
  const isoNode = getNodeDefinition("extractIsosurface");
  const baseGeometry = createBoxGeometry(`geo-${nodeType}`, { width: 1.8, height: 1.2, depth: 1.4 });
  const context = createTestContext(`${nodeType}-context`, [baseGeometry]);

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
    inputs: { domain: baseGeometry.id, goals },
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
  const baseGeometry = createBoxGeometry("geo-chemistry", { width: 2.2, height: 1.4, depth: 1.6 });

  const anchorTop = translateMeshGeometry(
    createBoxGeometry("geo-chemistry-anchorTop", { width: 2.0, height: 0.25, depth: 1.4 }),
    { x: 0, y: 0.55, z: 0 }
  );
  const anchorBottom = translateMeshGeometry(
    createBoxGeometry("geo-chemistry-anchorBottom", { width: 2.0, height: 0.25, depth: 1.4 }),
    { x: 0, y: -0.55, z: 0 }
  );
  const thermalCore = translateMeshGeometry(
    createBoxGeometry("geo-chemistry-thermalCore", { width: 0.7, height: 1.2, depth: 0.6 }),
    { x: 0, y: 0, z: 0 }
  );
  const visionStrip = translateMeshGeometry(
    createBoxGeometry("geo-chemistry-visionStrip", { width: 2.0, height: 1.1, depth: 0.35 }),
    { x: 0, y: 0, z: 0.55 }
  );

  const geometry = [baseGeometry, anchorTop, anchorBottom, thermalCore, visionStrip];
  const context = createTestContext("chemistry-context", geometry);

  const goals =
    variant === "basic"
      ? buildChemistryGoalsBasic()
      : buildChemistryGoalsRegions({ anchorTop, anchorBottom, thermalCore, visionStrip });

  const seeds = variant === "basic" ? buildChemistrySeedsBasic() : buildChemistrySeedsRegions();

  const materials = variant === "textInputs" ? [] : buildChemistryMaterials(baseGeometry.id);

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
      goals,
    },
    parameters,
    context,
  });

  const outputGeometry = wrapMeshGeometry(parameters.geometryId, outputs.mesh as RenderMesh);
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
