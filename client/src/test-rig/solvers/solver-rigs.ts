import { NODE_DEFINITIONS } from "../../workflow/nodeRegistry";
import type { RenderMesh } from "../../types";
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
  translateMeshGeometry,
  wrapMeshGeometry,
} from "./rig-utils";

export const CHEMISTRY_SOLVER_RIG_VARIANTS = [
  "basic",
  "regions",
  "textInputs",
  "disabled",
] as const;
export type ChemistrySolverRigVariant = (typeof CHEMISTRY_SOLVER_RIG_VARIANTS)[number];

export const DEFAULT_CHEMISTRY_SOLVER_RIG_VARIANT: ChemistrySolverRigVariant = "regions";

const TEXT_INPUT_MATERIALS_OBJECT = [
  { material: { name: "Steel", color: [0.75, 0.75, 0.78] }, weight: 1 },
  { material: { name: "Ceramic", color: [0.9, 0.2, 0.2] }, weight: 0.7 },
  { material: { name: "Glass", color: [0.2, 0.4, 0.9] }, weight: 0.6 },
] as const;
const TEXT_INPUT_MATERIALS = JSON.stringify(TEXT_INPUT_MATERIALS_OBJECT);
const TEXT_INPUT_SEEDS = "0 0 0 0.6 0 0";

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

  const blendGoal: ChemistryBlendGoal = {
    goalType: "chemBlend",
    weight: 0.55,
    geometry: { elements: [] },
    parameters: {
      smoothness: 0.75,
      diffusivity: 1.25,
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
    weight: variant === "basic" ? 0.25 : 0.45,
    geometry: { elements: [] },
    parameters: {
      loadVector: { x: 0, y: 1, z: 0 },
      structuralPenalty: 1.25,
      regionGeometryIds:
        variant === "regions" || variant === "textInputs"
          ? [anchorTop.id, anchorBottom.id]
          : undefined,
    },
  };

  const transparencyGoal = {
    goalType: "chemTransparency" as const,
    weight: 0.35,
    geometry: { elements: [] },
    parameters: {
      opticalWeight: 2.0,
      regionGeometryIds:
        variant === "regions" || variant === "textInputs" ? [visionStrip.id] : undefined,
    },
  };

  const thermalGoal = {
    goalType: "chemThermal" as const,
    weight: 0.45,
    geometry: { elements: [] },
    parameters: {
      mode: "insulate" as const,
      thermalWeight: 2.5,
      regionGeometryIds:
        variant === "regions" || variant === "textInputs" ? [thermalCore.id] : undefined,
    },
  };

  const goals =
    variant === "basic"
      ? [blendGoal, massGoal, stiffnessGoal]
      : [blendGoal, massGoal, stiffnessGoal, transparencyGoal, thermalGoal];

  const goalRegions = {
    stiffness: Array.isArray(stiffnessGoal.parameters.regionGeometryIds)
      ? stiffnessGoal.parameters.regionGeometryIds
      : [],
    transparency: Array.isArray(transparencyGoal.parameters.regionGeometryIds)
      ? transparencyGoal.parameters.regionGeometryIds
      : [],
    thermal: Array.isArray(thermalGoal.parameters.regionGeometryIds)
      ? thermalGoal.parameters.regionGeometryIds
      : [],
  };

  const parameters = {
    geometryId: "chemistry-out",
    particleCount: 6000,
    particleDensity: 1.0,
    iterations: 55,
    fieldResolution: 36,
    isoValue: 0.12,
    convergenceTolerance: 0.002,
    blendStrength: 0.7,
    historyLimit: 80,
    seed: 7,
    materialOrder: "Steel, Ceramic, Glass",
    seedMaterial: "Steel",
    seedStrength: 0.85,
    seedRadius: 0.25,
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
      materials:
        variant === "textInputs"
          ? []
          : [
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
      materialsText:
        variant === "textInputs"
          ? TEXT_INPUT_MATERIALS
          : undefined,
      seeds:
        variant === "basic"
          ? [
              {
                position: { x: 0, y: 0, z: 0 },
                material: "Glass",
                strength: 0.9,
                radius: 0.4,
              },
            ]
          : [
              { position: { x: 0, y: -0.55, z: 0 }, material: "Steel", strength: 0.9, radius: 0.35 },
              { position: { x: 0, y: 0, z: 0 }, material: "Ceramic", strength: 0.92, radius: 0.3 },
              { position: { x: 0, y: 0, z: 0.55 }, material: "Glass", strength: 0.9, radius: 0.3 },
            ],
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
  const baseGeometry = createSphereGeometry("geo-bio", 1, 12);
  const nodeId = "biological-rig";

  resetBiologicalSolverState(nodeId);

  const individual: Individual = {
    id: "ind-0",
    genome: [0.25, -0.35, 0.6],
    genomeString: "0.25,-0.35,0.6",
    fitness: 0.82,
    generation: 0,
    rank: 1,
    geometryIds: [baseGeometry.id],
    geometry: [baseGeometry],
    thumbnail: null,
  };

  const config: SolverConfig = {
    populationSize: 16,
    generations: 6,
    mutationRate: 0.18,
    crossoverRate: 0.7,
    elitism: 2,
    selectionMethod: "tournament",
    tournamentSize: 3,
    mutationType: "gaussian",
    crossoverType: "uniform",
    seedFromCurrent: false,
    randomSeed: 42,
  };

  const outputs: SolverOutputs = {
    best: individual,
    populationBests: [
      {
        generation: 0,
        individuals: [individual],
      },
    ],
    history: {
      generations: [
        {
          id: 0,
          population: [individual],
          statistics: {
            bestFitness: 0.82,
            meanFitness: 0.82,
            worstFitness: 0.82,
            diversityStdDev: 0,
            evaluationTime: 0.1,
          },
          convergenceMetrics: {
            improvementRate: 0.1,
            stagnationCount: 0,
          },
        },
      ],
      config,
    },
    gallery: {
      allIndividuals: [individual],
      byGeneration: { 0: [individual] },
      bestOverall: individual.id,
      userSelections: [],
    },
    selectedGeometry: [],
  };

  updateBiologicalSolverState(nodeId, {
    outputs,
    config,
    status: "running",
    generation: 1,
    progress: { current: 1, total: 1, status: "complete" },
    metrics: [],
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
    individual,
    config,
  };
};
