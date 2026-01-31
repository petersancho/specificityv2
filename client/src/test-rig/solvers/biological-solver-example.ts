import type { Geometry } from "../../types";
import type {
  FitnessMetric,
  GenerationRecord,
  Individual,
  SolverConfig,
  SolverOutputs,
} from "../../workflow/nodes/solver/biological/types";
import { createBoxGeometry, createSphereGeometry } from "./rig-utils";

// Deterministic, JSON-friendly sample output used for solver validation and example scripting.

export type BiologicalSolverExampleSeed = {
  geometries: Geometry[];
  config: SolverConfig;
  metrics: FitnessMetric[];
  outputs: SolverOutputs;
  bestIndividual: Individual;
  evaluationCount: number;
};

const BIOLOGICAL_EXAMPLE_PARAMS = {
  genome: {
    gene0: { base: 0.1, generationStep: 0.06, indexStep: 0.04 },
    gene1: { base: -0.35, indexStep: 0.07 },
    gene2: { base: 0.55, generationStep: -0.05, indexStep: 0.03 },
  },
  stagnationThreshold: 0.002,
  evaluationTime: { base: 0.05, generationStep: 0.02 },
} as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const mean = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const stdDev = (values: number[]) => {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const variance = mean(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
};

const formatGenomeString = (genome: number[]) => genome.map((gene) => gene.toFixed(3)).join(",");

const computeFitness = (breakdown: Record<string, number>, metrics: FitnessMetric[]) => {
  if (metrics.length === 0) return 0;
  const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0) || 1;
  const weighted = metrics.reduce((sum, metric) => {
    const value = breakdown[metric.id] ?? 0;
    const signed = metric.mode === "minimize" ? -value : value;
    return sum + signed * metric.weight;
  }, 0);
  return weighted / totalWeight;
};

const buildIndividualsForGeneration = (
  generation: number,
  size: number,
  metrics: FitnessMetric[],
  geometryPool: Geometry[]
) => {
  const individuals: Individual[] = [];

  for (let index = 0; index < size; index += 1) {
    const g0 = clamp(
      BIOLOGICAL_EXAMPLE_PARAMS.genome.gene0.base +
        generation * BIOLOGICAL_EXAMPLE_PARAMS.genome.gene0.generationStep +
        index * BIOLOGICAL_EXAMPLE_PARAMS.genome.gene0.indexStep,
      -1,
      1
    );
    const g1 = clamp(
      BIOLOGICAL_EXAMPLE_PARAMS.genome.gene1.base +
        index * BIOLOGICAL_EXAMPLE_PARAMS.genome.gene1.indexStep,
      -1,
      1
    );
    const g2 = clamp(
      BIOLOGICAL_EXAMPLE_PARAMS.genome.gene2.base +
        generation * BIOLOGICAL_EXAMPLE_PARAMS.genome.gene2.generationStep +
        index * BIOLOGICAL_EXAMPLE_PARAMS.genome.gene2.indexStep,
      -1,
      1
    );
    const genome = [g0, g1, g2];
    const genomeString = formatGenomeString(genome);

    const breakdown = {
      growthPotential: clamp(0.6 + g0 * 0.4, 0, 1),
      nutrientUptake: clamp(0.55 + g1 * 0.3, 0, 1),
      morphogenesis: clamp(0.5 + g2 * 0.35, 0, 1),
    };

    const geometry = geometryPool[(index + generation) % geometryPool.length];
    const fitness = computeFitness(breakdown, metrics);

    individuals.push({
      id: `g${generation}-i${index}`,
      genome,
      genomeString,
      fitness,
      fitnessBreakdown: breakdown,
      generation,
      rank: 0,
      geometryIds: [geometry.id],
      geometry: [geometry],
      thumbnail: null,
    });
  }

  return individuals
    .slice()
    .sort((a, b) => b.fitness - a.fitness)
    .map((individual, index) => ({ ...individual, rank: index + 1 }));
};

const buildGenerationRecord = (
  generation: number,
  population: Individual[],
  previousBest: number | null,
  stagnationCount: number
) => {
  const fitness = population.map((individual) => individual.fitness);
  const bestFitness = fitness.length > 0 ? fitness[0] : 0;
  const worstFitness = fitness.length > 0 ? fitness[fitness.length - 1] : 0;
  const meanFitness = mean(fitness);
  const diversityStdDev = stdDev(fitness);

  const improvementRate = previousBest == null ? bestFitness : bestFitness - previousBest;
  const nextStagnation =
    improvementRate > BIOLOGICAL_EXAMPLE_PARAMS.stagnationThreshold
      ? 0
      : stagnationCount + 1;

  return {
    record: {
      id: generation,
      population,
      statistics: {
        bestFitness,
        meanFitness,
        worstFitness,
        diversityStdDev,
        evaluationTime:
          BIOLOGICAL_EXAMPLE_PARAMS.evaluationTime.base +
          generation * BIOLOGICAL_EXAMPLE_PARAMS.evaluationTime.generationStep,
      },
      convergenceMetrics: {
        improvementRate,
        stagnationCount: nextStagnation,
      },
    } satisfies GenerationRecord,
    bestFitness,
    stagnationCount: nextStagnation,
  };
};

export const buildBiologicalSolverExampleSeed = (): BiologicalSolverExampleSeed => {
  const geometries: Geometry[] = [
    createSphereGeometry("geo-bio-domain", 1, 12),
    createSphereGeometry("geo-bio-sprout", 0.75, 10),
    createBoxGeometry("geo-bio-scaffold", { width: 1.6, height: 1.1, depth: 1.3 }, 1),
  ];

  const metrics: FitnessMetric[] = [
    {
      id: "growthPotential",
      name: "Growth potential",
      mode: "maximize",
      weight: 0.45,
    },
    {
      id: "nutrientUptake",
      name: "Nutrient uptake",
      mode: "maximize",
      weight: 0.3,
    },
    {
      id: "morphogenesis",
      name: "Morphogenesis",
      mode: "maximize",
      weight: 0.25,
    },
  ];

  const config: SolverConfig = {
    populationSize: 10,
    generations: 3,
    mutationRate: 0.22,
    crossoverRate: 0.7,
    elitism: 2,
    selectionMethod: "tournament",
    tournamentSize: 3,
    mutationType: "gaussian",
    crossoverType: "uniform",
    seedFromCurrent: false,
    randomSeed: 42,
  };

  const generationRecords: GenerationRecord[] = [];
  let previousBest: number | null = null;
  let stagnationCount = 0;

  for (let generation = 0; generation < config.generations; generation += 1) {
    const population = buildIndividualsForGeneration(
      generation,
      config.populationSize,
      metrics,
      geometries
    );

    const built = buildGenerationRecord(generation, population, previousBest, stagnationCount);
    generationRecords.push(built.record);
    previousBest = built.bestFitness;
    stagnationCount = built.stagnationCount;
  }

  const allIndividuals = generationRecords.flatMap((record) => record.population);
  const bestIndividual = allIndividuals.reduce<Individual | null>((best, individual) => {
    if (!best) return individual;
    return individual.fitness > best.fitness ? individual : best;
  }, null);

  const safeBest = bestIndividual ?? allIndividuals[0];
  if (!safeBest) {
    throw new Error("Expected at least one individual in the biological solver example seed.");
  }

  const outputs: SolverOutputs = {
    best: safeBest,
    populationBests: generationRecords.map((record) => ({
      generation: record.id,
      individuals: record.population.slice(0, 3),
    })),
    history: {
      generations: generationRecords,
      config,
    },
    gallery: {
      allIndividuals,
      byGeneration: Object.fromEntries(
        generationRecords.map((record) => [record.id, record.population])
      ) as Record<number, Individual[]>,
      bestOverall: safeBest?.id ?? null,
      userSelections: safeBest?.geometryIds?.length ? safeBest.geometryIds : [],
    },
    selectedGeometry: safeBest?.geometryIds?.length ? safeBest.geometryIds : [],
  };

  return {
    geometries,
    config,
    metrics,
    outputs,
    bestIndividual: safeBest,
    evaluationCount: allIndividuals.length,
  };
};
