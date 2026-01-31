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
import type {
  FitnessMetric,
  GeneDefinition,
  GenerationRecord,
  Individual,
  SolverConfig,
  SolverOutputs,
} from "../../workflow/nodes/solver/biological/types";
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
  const baseGeometry = createSphereGeometry("geo-bio", 1, 12);
  const nodeId = "biological-rig";

  resetBiologicalSolverState(nodeId);

  const createSeededRandom = (seed: number) => {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), t | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };

  const random = createSeededRandom(42);

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const roundToStep = (value: number, step: number, min: number) => {
    if (!Number.isFinite(step) || step <= 0) return value;
    const snapped = Math.round((value - min) / step) * step + min;
    return Number.isFinite(snapped) ? snapped : value;
  };

  const encodeGenome = (values: number[]) =>
    values.map((value) => Number(value).toFixed(6)).join("-");

  const genes: GeneDefinition[] = [
    {
      id: "gene-canopy-height",
      name: "Canopy height",
      min: 0.4,
      max: 2.4,
      step: 0.02,
      currentValue: 1.2,
      type: "continuous",
    },
    {
      id: "gene-canopy-span",
      name: "Canopy span",
      min: 1,
      max: 6,
      step: 0.05,
      currentValue: 3.25,
      type: "continuous",
    },
    {
      id: "gene-canopy-depth",
      name: "Canopy depth",
      min: 0.8,
      max: 4.2,
      step: 0.05,
      currentValue: 2.1,
      type: "continuous",
    },
    {
      id: "gene-branching",
      name: "Branching",
      min: 0.1,
      max: 1,
      step: 0.01,
      currentValue: 0.6,
      type: "continuous",
    },
    {
      id: "gene-damping",
      name: "Homeostasis damping",
      min: 0,
      max: 1,
      step: 0.01,
      currentValue: 0.45,
      type: "continuous",
    },
  ];

  const metrics: FitnessMetric[] = [
    { id: "metric:area", name: "Area", mode: "maximize", weight: 0.55 },
    { id: "metric:mass", name: "Material", mode: "minimize", weight: 0.3 },
    { id: "metric:stability", name: "Stability", mode: "maximize", weight: 0.15 },
  ];

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

  const targetGenome = [1.6, 4.2, 2.6, 0.75, 0.25];

  if (targetGenome.length !== genes.length) {
    throw new Error("Expected target genome length to match gene count");
  }

  const normalizeDistance = (genome: number[]) => {
    let acc = 0;
    for (let i = 0; i < genes.length; i += 1) {
      const gene = genes[i];
      const value = genome[i] ?? gene.currentValue;
      const target = targetGenome[i] ?? gene.currentValue;
      const range = Math.max(1e-6, gene.max - gene.min);
      const delta = (value - target) / range;
      acc += delta * delta;
    }
    return Math.sqrt(acc / Math.max(1, genes.length));
  };

  const computeFitnessBreakdown = (genome: number[]) => {
    const distance = normalizeDistance(genome);
    const area = clamp(1 - distance, 0, 1);
    const mass = clamp(distance * 1.15, 0, 1);
    const stability = clamp(1 - Math.abs((genome[3] ?? 0.6) - 0.7), 0, 1);

    return {
      "metric:area": area,
      "metric:mass": mass,
      "metric:stability": stability,
    };
  };

  const computeFitness = (breakdown: Record<string, number>) => {
    let fitness = 0;
    metrics.forEach((metric) => {
      const raw = clamp(breakdown[metric.id] ?? 0, 0, 1);
      const score = metric.mode === "minimize" ? 1 - raw : raw;
      fitness += score * metric.weight;
    });
    return fitness;
  };

  const computeDiversityStdDev = (population: Individual[]) => {
    if (population.length === 0) return 0;
    const geneCount = genes.length;
    const means = new Array(geneCount).fill(0);
    population.forEach((individual) => {
      individual.genome.forEach((value, idx) => {
        means[idx] += value;
      });
    });
    means.forEach((_, idx) => {
      means[idx] /= population.length;
    });
    const variances = new Array(geneCount).fill(0);
    population.forEach((individual) => {
      individual.genome.forEach((value, idx) => {
        const diff = value - means[idx];
        variances[idx] += diff * diff;
      });
    });
    variances.forEach((_, idx) => {
      variances[idx] /= population.length;
    });
    const variance = variances.reduce((sum, entry) => sum + entry, 0) / Math.max(1, geneCount);
    return Math.sqrt(variance);
  };

  const meanFitness = (population: Individual[]) =>
    population.reduce((sum, individual) => sum + individual.fitness, 0) /
    Math.max(1, population.length);

  const buildGenome = (generation: number) => {
    const progress = config.generations <= 1 ? 1 : generation / (config.generations - 1);
    return genes.map((gene, idx) => {
      const base = gene.min + random() * (gene.max - gene.min);
      const target = targetGenome[idx] ?? gene.currentValue;
      const blended = base * (1 - progress * 0.75) + target * (progress * 0.75);
      const noise = (random() - 0.5) * (gene.max - gene.min) * (1 - progress) * 0.18;
      return roundToStep(clamp(blended + noise, gene.min, gene.max), gene.step, gene.min);
    });
  };

  const generations: GenerationRecord[] = [];
  let bestOverall: Individual | null = null;
  let stagnationCount = 0;
  let previousBestFitness: number | null = null;

  for (let generationId = 0; generationId < config.generations; generationId += 1) {
    const population: Individual[] = Array.from({ length: config.populationSize }, (_, idx) => {
      const genome = buildGenome(generationId);
      const breakdown = computeFitnessBreakdown(genome);
      const fitness = computeFitness(breakdown);
      const genomeString = encodeGenome(genome);

      return {
        id: `bio-g${generationId}-i${idx}`,
        genome,
        genomeString,
        fitness,
        fitnessBreakdown: breakdown,
        generation: generationId,
        rank: 0,
        geometryIds: [baseGeometry.id],
        geometry: [baseGeometry],
        thumbnail: null,
      };
    });

    population.sort((a, b) => b.fitness - a.fitness);
    population.forEach((individual, index) => {
      individual.rank = index + 1;
    });

    const best = population[0];
    const worst = population[population.length - 1];

    if (!bestOverall || best.fitness > bestOverall.fitness) {
      bestOverall = best;
    }

    const bestFitness = best?.fitness ?? 0;
    const improvementRate =
      previousBestFitness == null || Math.abs(previousBestFitness) < 1e-6
        ? 0
        : (bestFitness - previousBestFitness) / Math.abs(previousBestFitness);
    if (previousBestFitness != null && bestFitness - previousBestFitness < 0.001) {
      stagnationCount += 1;
    } else {
      stagnationCount = 0;
    }
    previousBestFitness = bestFitness;

    generations.push({
      id: generationId,
      population,
      statistics: {
        bestFitness: bestFitness,
        meanFitness: meanFitness(population),
        worstFitness: worst?.fitness ?? 0,
        diversityStdDev: computeDiversityStdDev(population),
        evaluationTime: 0.02 + random() * 0.03,
      },
      convergenceMetrics: {
        improvementRate,
        stagnationCount,
      },
    });
  }

  const bestWithGeometry: Individual | null = bestOverall
    ? {
        ...bestOverall,
        geometryIds: [baseGeometry.id],
        geometry: [baseGeometry],
      }
    : null;

  const outputs: SolverOutputs = {
    best: bestWithGeometry,
    populationBests: generations.map((generation) => ({
      generation: generation.id,
      individuals: generation.population.slice(0, 3),
    })),
    history: {
      generations,
      config,
    },
    gallery: {
      allIndividuals: generations.flatMap((generation) => generation.population),
      byGeneration: Object.fromEntries(
        generations.map((generation) => [generation.id, generation.population])
      ) as Record<number, Individual[]>,
      bestOverall: bestWithGeometry?.id ?? null,
      userSelections: bestWithGeometry ? [bestWithGeometry.id] : [],
    },
    selectedGeometry: bestWithGeometry ? [baseGeometry.id] : [],
  };

  updateBiologicalSolverState(nodeId, {
    outputs,
    config,
    status: "stopped",
    generation: config.generations,
    progress: {
      current: config.generations,
      total: config.generations,
      status: "complete",
    },
    metrics,
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
    genes,
    metrics,
    config,
    outputs,
  };
};
