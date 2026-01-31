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

type TopologyScenario = "cantilever" | "bridge";

const TOPOLOGY_SCENARIO_CONFIG: Record<
  TopologyScenario,
  {
    anchorAxis: "x" | "y" | "z";
    loadAxis: "x" | "y" | "z";
    force: { x: number; y: number; z: number };
    weights: { volume: number; stiffness: number; load: number; anchor: number };
  }
> = {
  cantilever: {
    anchorAxis: "x",
    loadAxis: "x",
    force: { x: 0, y: -120, z: 0 },
    weights: { volume: 0.4, stiffness: 0.25, load: 0.2, anchor: 0.15 },
  },
  bridge: {
    anchorAxis: "y",
    loadAxis: "y",
    force: { x: 0, y: -180, z: 0 },
    weights: { volume: 0.4, stiffness: 0.25, load: 0.2, anchor: 0.15 },
  },
};

const buildTopologyGoals = (
  mesh: RenderMesh,
  scenario: TopologyScenario,
  volumeFraction: number
): GoalSpecification[] => {
  const config = TOPOLOGY_SCENARIO_CONFIG[scenario];
  const anchorAxis = config.anchorAxis;
  const loadAxis = config.loadAxis;
  const anchorMode: "min" | "max" = "min";
  const loadMode: "min" | "max" = "max";
  const anchorIndices = findVertexIndicesAtExtent(mesh, anchorAxis, anchorMode);
  const loadIndices = findVertexIndicesAtExtent(mesh, loadAxis, loadMode);
  if (anchorIndices.length === 0) {
    throw new Error(`Topology rig ${scenario}: no anchor vertices found`);
  }
  if (loadIndices.length === 0) {
    throw new Error(`Topology rig ${scenario}: no load vertices found`);
  }

  const volume: VolumeGoal = {
    goalType: "volume",
    weight: config.weights.volume,
    target: volumeFraction,
    geometry: { elements: [] },
    parameters: {
      targetVolume: volumeFraction,
      materialDensity: 7800,
      allowedDeviation: 0.1,
    },
  };

  const stiffness: StiffnessGoal = {
    goalType: "stiffness",
    weight: config.weights.stiffness,
    target: 1,
    constraint: { min: 0, max: 1 },
    geometry: { elements: loadIndices },
    parameters: {
      youngModulus: 2.1e9,
      poissonRatio: 0.3,
      targetStiffness: 1,
    },
  };

  const load: LoadGoal = {
    goalType: "load",
    weight: config.weights.load,
    target: 1,
    geometry: { elements: loadIndices },
    parameters: {
      force: config.force,
      applicationPoints: loadIndices,
      distributed: true,
      loadType: "static",
    },
  };

  const anchor: AnchorGoal = {
    goalType: "anchor",
    weight: config.weights.anchor,
    target: 0,
    geometry: { elements: anchorIndices },
    parameters: {
      fixedDOF: { x: true, y: true, z: true },
      anchorType: "fixed",
      springStiffness: 0,
    },
  };

  return [volume, stiffness, load, anchor];
};

const summarizeDensityField = (densities: number[]) => {
  if (densities.length === 0) {
    return { min: 0, max: 0, mean: 0, stdDev: 0 };
  }
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (let i = 0; i < densities.length; i += 1) {
    const value = densities[i];
    if (value < min) min = value;
    if (value > max) max = value;
    sum += value;
  }
  const mean = sum / densities.length;
  let variance = 0;
  for (let i = 0; i < densities.length; i += 1) {
    const delta = densities[i] - mean;
    variance += delta * delta;
  }
  const stdDev = Math.sqrt(variance / densities.length);
  return { min, max, mean, stdDev };
};

const buildDensityHistogram = (densities: number[], buckets = 10) => {
  const counts = new Array<number>(buckets).fill(0);
  if (densities.length === 0) {
    return { buckets, counts };
  }
  densities.forEach((value) => {
    const clamped = Math.max(0, Math.min(1, value));
    const idx = Math.min(buckets - 1, Math.floor(clamped * buckets));
    counts[idx] += 1;
  });
  return { buckets, counts };
};

const buildMidSlice = (densities: number[], resolution: number): number[][] | null => {
  const requestedResolution = Math.max(1, Math.floor(resolution));
  let res = requestedResolution;
  const requestedCellCount = res * res * res;
  if (densities.length !== requestedCellCount) {
    const inferred = Math.round(Math.cbrt(densities.length));
    if (inferred > 0 && inferred * inferred * inferred === densities.length) {
      res = inferred;
    } else {
      return null;
    }
  }
  const layer = Math.floor(res / 2);
  const slice: number[][] = [];
  const zOffset = layer * res * res;
  for (let y = 0; y < res; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < res; x += 1) {
      const idx = zOffset + y * res + x;
      const value = densities[idx] ?? 0;
      row.push(Math.round(value * 1000) / 1000);
    }
    slice.push(row);
  }
  return slice;
};

export const runTopologySolverRig = (nodeType: "topologySolver" | "voxelSolver") => {
  const solverNode = getNodeDefinition(nodeType);
  const isoNode = getNodeDefinition("extractIsosurface");
  const scenario: TopologyScenario = nodeType === "topologySolver" ? "cantilever" : "bridge";
  const baseGeometry = createBoxGeometry(`geo-${nodeType}-${scenario}`, {
    width: 1.8,
    height: 1.2,
    depth: 1.4,
  });
  const context = createTestContext(`${nodeType}-${scenario}-context`, [baseGeometry]);

  const settings = {
    volumeFraction: 0.6,
    penaltyExponent: 3,
    filterRadius: 2,
    iterations: 40,
    resolution: 12,
  };

  const goals = buildTopologyGoals(baseGeometry.mesh, scenario, settings.volumeFraction);

  // Settings are passed via inputs so they can be driven by other nodes; the solver falls back
  // to parameter defaults when inputs are absent.
  const outputs = solverNode.compute({
    inputs: { domain: baseGeometry.id, goals, ...settings },
    parameters: {},
    context,
  });

  const densityField = Array.isArray(outputs.densityField)
    ? (outputs.densityField as number[])
    : [];
  const densityStats = summarizeDensityField(densityField);
  const histogram = buildDensityHistogram(densityField);
  const midSlice = buildMidSlice(densityField, outputs.resolution ?? settings.resolution);

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

  const report = {
    solver: nodeType,
    scenario,
    settings,
    goals,
    objective: outputs.objective,
    constraint: outputs.constraint,
    bestScore: outputs.bestScore,
    density: {
      cellCount: densityField.length,
      ...densityStats,
      histogram,
      midSlice,
    },
    isoSurface: {
      isoValue: isoParams.isoValue,
      vertexCount: Math.floor((outputGeometry.mesh.positions.length ?? 0) / 3),
      triangleCount: Math.floor((outputGeometry.mesh.indices.length ?? 0) / 3),
    },
  };

  return {
    outputs,
    isoOutputs,
    outputGeometry,
    baseGeometry,
    goals,
    scenario,
    report,
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
