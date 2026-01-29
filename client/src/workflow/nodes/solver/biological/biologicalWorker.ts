import type { FitnessMetric, GeneDefinition, SolverConfig } from "./types";

type WorkerInitMessage = {
  type: "INIT";
  config: SolverConfig;
  genes: GeneDefinition[];
  metrics: FitnessMetric[];
  seedGenome?: number[] | null;
};

type WorkerEvolveMessage = { type: "EVOLVE"; generations: number };
type WorkerStopMessage = { type: "STOP" };
type WorkerPauseMessage = { type: "PAUSE" };
type WorkerResumeMessage = { type: "RESUME" };
type WorkerResetMessage = { type: "RESET" };

type WorkerEvaluationResultMessage = {
  type: "EVALUATION_RESULTS";
  results: Array<{
    genomeString: string;
    metrics: Record<string, number>;
  }>;
};

type WorkerIncomingMessage =
  | WorkerInitMessage
  | WorkerEvolveMessage
  | WorkerStopMessage
  | WorkerPauseMessage
  | WorkerResumeMessage
  | WorkerResetMessage
  | WorkerEvaluationResultMessage;

type EvaluationRequest = {
  id: string;
  genome: number[];
  genomeString: string;
};

type IndividualState = {
  id: string;
  genome: number[];
  genomeString: string;
  fitness: number;
  fitnessBreakdown: Record<string, number>;
  generation: number;
  rank: number;
};

type GenerationStats = {
  bestFitness: number;
  meanFitness: number;
  worstFitness: number;
  diversityStdDev: number;
  evaluationTime: number;
};

type GenerationRecord = {
  id: number;
  population: IndividualState[];
  statistics: GenerationStats;
  convergenceMetrics: { improvementRate: number; stagnationCount: number };
};

const EPSILON = 1e-9;

let config: SolverConfig | null = null;
let genes: GeneDefinition[] = [];
let metrics: FitnessMetric[] = [];
let population: IndividualState[] = [];
let history: GenerationRecord[] = [];
let generation = 0;
let running = false;
let paused = false;
let stopRequested = false;
let stagnationCount = 0;
let randomFn: (() => number) | null = null;
const fitnessCache = new Map<string, Record<string, number>>();
let pendingEvaluation: ((results: WorkerEvaluationResultMessage["results"]) => void) | null =
  null;

const createSeededRandom = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const random = () => (randomFn ? randomFn() : Math.random());

const randomGaussian = () => {
  const u1 = Math.max(EPSILON, random());
  const u2 = Math.max(EPSILON, random());
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const roundToStep = (value: number, step: number, min: number) => {
  if (!Number.isFinite(step) || step <= 0) return value;
  const snapped = Math.round((value - min) / step) * step + min;
  return Number.isFinite(snapped) ? snapped : value;
};

const encodeGenome = (values: number[]) => values.map((v) => Number(v).toFixed(6)).join("-");

const createIndividual = (values: number[], generationId: number): IndividualState => ({
  id: `ind_${generationId}_${Math.floor(random() * 1e9)}`,
  genome: values,
  genomeString: encodeGenome(values),
  fitness: 0,
  fitnessBreakdown: {},
  generation: generationId,
  rank: 0,
});

const initializePopulation = (seedGenome?: number[] | null) => {
  if (!config) return [];
  const populationSize = Math.max(5, Math.min(200, Math.round(config.populationSize)));
  const initial: IndividualState[] = [];
  if (config.seedFromCurrent && seedGenome && seedGenome.length === genes.length) {
    initial.push(createIndividual(seedGenome, generation));
  }
  while (initial.length < populationSize) {
    const genome = genes.map((gene, idx) => {
      const base =
        config?.seedFromCurrent && seedGenome && seedGenome[idx] != null
          ? seedGenome[idx]
          : gene.min + random() * (gene.max - gene.min);
      const perturb =
        config?.seedFromCurrent && seedGenome && seedGenome[idx] != null
          ? (random() - 0.5) * (gene.max - gene.min) * 0.2
          : 0;
      const value = clamp(base + perturb, gene.min, gene.max);
      return roundToStep(value, gene.step, gene.min);
    });
    initial.push(createIndividual(genome, generation));
  }
  return initial;
};

const selectParent = () => {
  if (!config || population.length === 0) return population[0];
  switch (config.selectionMethod) {
    case "roulette": {
      const total = population.reduce((sum, ind) => sum + ind.fitness, 0);
      if (total <= EPSILON) {
        return population[Math.floor(random() * population.length)];
      }
      const spin = random() * (total || 1);
      let acc = 0;
      for (const ind of population) {
        acc += ind.fitness;
        if (acc >= spin) return ind;
      }
      return population[population.length - 1];
    }
    case "rank": {
      const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
      const ranks = sorted.map((_, i) => sorted.length - i);
      const total = ranks.reduce((sum, r) => sum + r, 0);
      const spin = random() * total;
      let acc = 0;
      for (let i = 0; i < sorted.length; i++) {
        acc += ranks[i];
        if (acc >= spin) return sorted[i];
      }
      return sorted[sorted.length - 1];
    }
    case "tournament":
    default: {
      const size = Math.max(2, Math.min(config.tournamentSize, population.length));
      let best = population[Math.floor(random() * population.length)];
      for (let i = 1; i < size; i++) {
        const candidate = population[Math.floor(random() * population.length)];
        if (candidate.fitness > best.fitness) {
          best = candidate;
        }
      }
      return best;
    }
  }
};

const applyCrossover = (parentA: IndividualState, parentB: IndividualState) => {
  if (!config) return [parentA.genome, parentB.genome];
  if (random() > config.crossoverRate) {
    return [parentA.genome.slice(), parentB.genome.slice()];
  }
  if (config.crossoverType === "single-point") {
    const point = Math.floor(random() * parentA.genome.length);
    const childA = [...parentA.genome.slice(0, point), ...parentB.genome.slice(point)];
    const childB = [...parentB.genome.slice(0, point), ...parentA.genome.slice(point)];
    return [childA, childB];
  }
  const childA: number[] = [];
  const childB: number[] = [];
  parentA.genome.forEach((value, idx) => {
    if (random() < 0.5) {
      childA.push(value);
      childB.push(parentB.genome[idx]);
    } else {
      childA.push(parentB.genome[idx]);
      childB.push(value);
    }
  });
  return [childA, childB];
};

const applyMutation = (genome: number[]) => {
  if (!config) return genome;
  return genome.map((value, idx) => {
    if (random() > config.mutationRate) return value;
    const gene = genes[idx];
    if (!gene) return value;
    if (config.mutationType === "uniform") {
      const next = gene.min + random() * (gene.max - gene.min);
      return roundToStep(clamp(next, gene.min, gene.max), gene.step, gene.min);
    }
    const sigma = 0.1 * (gene.max - gene.min);
    const next = value + randomGaussian() * sigma;
    return roundToStep(clamp(next, gene.min, gene.max), gene.step, gene.min);
  });
};

const requestEvaluation = (individuals: EvaluationRequest[]) => {
  if (individuals.length === 0) {
    return Promise.resolve([] as WorkerEvaluationResultMessage["results"]);
  }
  self.postMessage({ type: "REQUEST_EVALUATION", individuals });
  return new Promise<WorkerEvaluationResultMessage["results"]>((resolve) => {
    pendingEvaluation = resolve;
  });
};

const computeDiversityStdDev = () => {
  if (population.length === 0 || genes.length === 0) return 0;
  const geneCount = genes.length;
  const means = new Array(geneCount).fill(0);
  population.forEach((ind) => {
    ind.genome.forEach((value, idx) => {
      means[idx] += value;
    });
  });
  means.forEach((_, idx) => {
    means[idx] /= population.length;
  });
  const variances = new Array(geneCount).fill(0);
  population.forEach((ind) => {
    ind.genome.forEach((value, idx) => {
      const diff = value - means[idx];
      variances[idx] += diff * diff;
    });
  });
  const stds = variances.map((v) => Math.sqrt(v / population.length));
  const total = stds.reduce((sum, v) => sum + v, 0);
  return total / geneCount;
};

const evaluatePopulation = async () => {
  const start = performance.now();
  const pending = population.filter((ind) => !fitnessCache.has(ind.genomeString));
  const results = await requestEvaluation(
    pending.map((ind) => ({
      id: ind.id,
      genome: ind.genome,
      genomeString: ind.genomeString,
    }))
  );
  results.forEach((result) => {
    fitnessCache.set(result.genomeString, result.metrics ?? {});
  });

  const metricRanges = new Map<string, { min: number; max: number }>();
  metrics.forEach((metric) => {
    metricRanges.set(metric.id, { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY });
  });

  population.forEach((ind) => {
    const values = fitnessCache.get(ind.genomeString) ?? {};
    metrics.forEach((metric) => {
      const value = Number(values[metric.id] ?? 0);
      const range = metricRanges.get(metric.id);
      if (!range) return;
      range.min = Math.min(range.min, value);
      range.max = Math.max(range.max, value);
    });
  });

  const totalWeight = metrics.reduce((sum, metric) => sum + (metric.weight || 0), 0);
  population.forEach((ind) => {
    const values = fitnessCache.get(ind.genomeString) ?? {};
    const breakdown: Record<string, number> = {};
    let score = 0;
    metrics.forEach((metric) => {
      const value = Number(values[metric.id] ?? 0);
      const range = metricRanges.get(metric.id);
      if (!range) return;
      const span = range.max - range.min;
      let normalized = span <= EPSILON ? 0.5 : (value - range.min) / span;
      if (metric.mode === "minimize") normalized = 1 - normalized;
      breakdown[metric.id] = normalized;
      score += normalized * (metric.weight || 0);
    });
    ind.fitnessBreakdown = breakdown;
    ind.fitness = totalWeight > EPSILON ? score / totalWeight : 0;
  });

  population.sort((a, b) => b.fitness - a.fitness);
  population.forEach((ind, idx) => {
    ind.rank = idx + 1;
  });

  const fitnessValues = population.map((ind) => ind.fitness);
  const bestFitness = fitnessValues.length > 0 ? Math.max(...fitnessValues) : 0;
  const worstFitness = fitnessValues.length > 0 ? Math.min(...fitnessValues) : 0;
  const meanFitness =
    fitnessValues.length > 0
      ? fitnessValues.reduce((sum, value) => sum + value, 0) / fitnessValues.length
      : 0;
  const evaluationTime = performance.now() - start;

  return {
    statistics: {
      bestFitness,
      meanFitness,
      worstFitness,
      diversityStdDev: computeDiversityStdDev(),
      evaluationTime,
    },
  };
};

const recordGeneration = (stats: GenerationStats) => {
  const previousBest = history.length > 0 ? history[history.length - 1].statistics.bestFitness : 0;
  const currentBest = stats.bestFitness;
  const improvementRate =
    Math.abs(previousBest) > EPSILON ? (currentBest - previousBest) / Math.abs(previousBest) : 0;
  if (Math.abs(currentBest - previousBest) < 0.001) {
    stagnationCount += 1;
  } else {
    stagnationCount = 0;
  }
  const record: GenerationRecord = {
    id: generation,
    population: population.map((ind) => ({ ...ind })),
    statistics: stats,
    convergenceMetrics: {
      improvementRate,
      stagnationCount,
    },
  };
  history.push(record);
};

const evolveGeneration = async () => {
  if (!config) return;
  const next: IndividualState[] = [];
  const eliteCount = Math.max(0, Math.min(config.elitism, population.length));
  const elites = population.slice(0, eliteCount).map((ind) => ({ ...ind }));

  while (next.length < config.populationSize - eliteCount) {
    const parentA = selectParent();
    const parentB = selectParent();
    const [childA, childB] = applyCrossover(parentA, parentB);
    const genomeA = applyMutation(childA);
    const genomeB = applyMutation(childB);
    next.push(createIndividual(genomeA, generation));
    if (next.length < config.populationSize - eliteCount) {
      next.push(createIndividual(genomeB, generation));
    }
  }
  population = [...next, ...elites].slice(0, config.populationSize);
  const { statistics } = await evaluatePopulation();
  recordGeneration(statistics);
  self.postMessage({
    type: "GENERATION_COMPLETE",
    generation,
    population,
    statistics,
    convergenceMetrics: history[history.length - 1]?.convergenceMetrics ?? {
      improvementRate: 0,
      stagnationCount: 0,
    },
  });
};

const runEvolution = async (count: number) => {
  if (!config) return;
  running = true;
  stopRequested = false;
  paused = false;
  for (let i = 0; i < count; i++) {
    if (stopRequested) break;
    if (paused) break;
    generation += 1;
    await evolveGeneration();
  }
  running = false;
  self.postMessage({ type: "ALL_COMPLETE", generation, history });
};

self.onmessage = async (event: MessageEvent<WorkerIncomingMessage>) => {
  const message = event.data;
  if (message.type === "EVALUATION_RESULTS") {
    if (pendingEvaluation) {
      pendingEvaluation(message.results ?? []);
      pendingEvaluation = null;
    }
    return;
  }
  if (message.type === "RESET") {
    config = null;
    genes = [];
    metrics = [];
    population = [];
    history = [];
    generation = 0;
    fitnessCache.clear();
    running = false;
    paused = false;
    stopRequested = false;
    stagnationCount = 0;
    self.postMessage({ type: "RESET_COMPLETE" });
    return;
  }
  if (message.type === "PAUSE") {
    paused = true;
    running = false;
    self.postMessage({ type: "PAUSED" });
    return;
  }
  if (message.type === "STOP") {
    stopRequested = true;
    running = false;
    self.postMessage({ type: "STOPPED" });
    return;
  }
  if (message.type === "RESUME") {
    paused = false;
    self.postMessage({ type: "RESUMED" });
    return;
  }
  if (message.type === "INIT") {
    config = message.config;
    genes = message.genes ?? [];
    metrics = message.metrics ?? [];
    randomFn =
      typeof config.randomSeed === "number" ? createSeededRandom(config.randomSeed) : null;
    generation = 0;
    history = [];
    fitnessCache.clear();
    stagnationCount = 0;
    population = initializePopulation(message.seedGenome ?? null);
    const { statistics } = await evaluatePopulation();
    recordGeneration(statistics);
    self.postMessage({
      type: "INITIALIZED",
      generation,
      population,
      statistics,
      convergenceMetrics: history[history.length - 1]?.convergenceMetrics ?? {
        improvementRate: 0,
        stagnationCount: 0,
      },
    });
    return;
  }
  if (message.type === "EVOLVE") {
    if (running || paused) return;
    const count = Math.max(1, Math.min(message.generations, 200));
    await runEvolution(count);
  }
};
