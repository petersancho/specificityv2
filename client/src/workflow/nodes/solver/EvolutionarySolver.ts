/**
 * Evolutionary Solver (Ἐπιλύτης Ἐξελικτικός - Epilytēs Exeliktikos)
 * 
 * Genetic algorithm-based evolutionary optimization solver.
 * Optimizes geometry configurations through selection, crossover, and mutation.
 * 
 * Ontological Type: Evolutionary Optimization (population-based search)
 * Named After: Charles Darwin (evolutionary theory)
 */

import type { WorkflowNodeDefinition, WorkflowComputeContext } from "../../nodeRegistry";
import type { Geometry, RenderMesh } from "../../../types";
import { createSolverMetadata, attachSolverMetadata } from "../../../numerica/solverGeometry";

interface EvolutionaryGenome {
  parameters: Record<string, number>;
  fitness?: number;
}

interface EvolutionaryPopulation {
  individuals: EvolutionaryGenome[];
  generation: number;
  bestFitness: number;
  averageFitness: number;
  bestIndividual: EvolutionaryGenome;
}

interface EvolutionaryParams {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  elitismCount: number;
  selectionMethod: 'tournament' | 'roulette' | 'rank';
  crossoverMethod: 'single-point' | 'two-point' | 'uniform' | 'arithmetic';
  mutationMethod: 'gaussian' | 'uniform' | 'creep';
  fitnessFunction: 'minimize-area' | 'maximize-volume' | 'minimize-surface-area';
  convergenceTolerance: number;
  seed: number;
}

interface EvolutionaryResult {
  populations: EvolutionaryPopulation[];
  bestIndividual: EvolutionaryGenome;
  converged: boolean;
  convergenceGeneration?: number;
  totalGenerations: number;
}

/**
 * Seeded pseudo-random number generator (LCG)
 */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Initialize population with random genomes
 */
function initializePopulation(
  size: number,
  parameterRanges: Record<string, [number, number]>,
  seed: number
): EvolutionaryGenome[] {
  const random = createRandom(seed);
  const population: EvolutionaryGenome[] = [];
  
  for (let i = 0; i < size; i++) {
    const parameters: Record<string, number> = {};
    
    for (const [key, [min, max]] of Object.entries(parameterRanges)) {
      parameters[key] = min + random() * (max - min);
    }
    
    population.push({ parameters });
  }
  
  return population;
}

/**
 * Evaluate fitness for a genome
 * (Simplified - in real implementation, this would generate geometry and measure properties)
 */
function evaluateFitness(
  genome: EvolutionaryGenome,
  fitnessFunction: string,
  context: WorkflowComputeContext
): number {
  // For now, use a simple mathematical fitness function
  // In a real implementation, this would:
  // 1. Generate geometry using genome parameters
  // 2. Measure geometric properties (area, volume, etc.)
  // 3. Return fitness value
  
  const params = genome.parameters;
  
  switch (fitnessFunction) {
    case 'minimize-area': {
      // Example: minimize sum of squared parameters
      return Object.values(params).reduce((sum, val) => sum + val * val, 0);
    }
    case 'maximize-volume': {
      // Example: maximize product of parameters
      return -Object.values(params).reduce((prod, val) => prod * Math.abs(val), 1);
    }
    case 'minimize-surface-area': {
      // Example: minimize sum of absolute parameters
      return Object.values(params).reduce((sum, val) => sum + Math.abs(val), 0);
    }
    default:
      return 0;
  }
}

/**
 * Tournament selection
 */
function tournamentSelection(
  population: EvolutionaryGenome[],
  tournamentSize: number,
  random: () => number
): EvolutionaryGenome {
  let best: EvolutionaryGenome | null = null;
  
  for (let i = 0; i < tournamentSize; i++) {
    const candidate = population[Math.floor(random() * population.length)];
    if (!best || (candidate.fitness ?? Infinity) < (best.fitness ?? Infinity)) {
      best = candidate;
    }
  }
  
  return best!;
}

/**
 * Roulette wheel selection
 */
function rouletteSelection(
  population: EvolutionaryGenome[],
  random: () => number
): EvolutionaryGenome {
  // Convert fitness to selection probability (lower fitness = higher probability)
  const maxFitness = Math.max(...population.map(g => g.fitness ?? 0));
  const weights = population.map(g => maxFitness - (g.fitness ?? 0) + 1);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  let r = random() * totalWeight;
  for (let i = 0; i < population.length; i++) {
    r -= weights[i];
    if (r <= 0) return population[i];
  }
  
  return population[population.length - 1];
}

/**
 * Rank selection
 */
function rankSelection(
  population: EvolutionaryGenome[],
  random: () => number
): EvolutionaryGenome {
  // Sort by fitness (ascending)
  const sorted = [...population].sort((a, b) => (a.fitness ?? 0) - (b.fitness ?? 0));
  
  // Assign ranks (best = highest rank)
  const totalRank = (sorted.length * (sorted.length + 1)) / 2;
  let r = random() * totalRank;
  
  for (let i = 0; i < sorted.length; i++) {
    r -= (sorted.length - i);
    if (r <= 0) return sorted[i];
  }
  
  return sorted[sorted.length - 1];
}

/**
 * Select parent using specified method
 */
function selectParent(
  population: EvolutionaryGenome[],
  method: string,
  random: () => number
): EvolutionaryGenome {
  switch (method) {
    case 'tournament':
      return tournamentSelection(population, 3, random);
    case 'roulette':
      return rouletteSelection(population, random);
    case 'rank':
      return rankSelection(population, random);
    default:
      return tournamentSelection(population, 3, random);
  }
}

/**
 * Single-point crossover
 */
function singlePointCrossover(
  parent1: EvolutionaryGenome,
  parent2: EvolutionaryGenome,
  random: () => number
): EvolutionaryGenome {
  const keys = Object.keys(parent1.parameters);
  const crossoverPoint = Math.floor(random() * keys.length);
  
  const childParams: Record<string, number> = {};
  keys.forEach((key, i) => {
    childParams[key] = i < crossoverPoint ? parent1.parameters[key] : parent2.parameters[key];
  });
  
  return { parameters: childParams };
}

/**
 * Two-point crossover
 */
function twoPointCrossover(
  parent1: EvolutionaryGenome,
  parent2: EvolutionaryGenome,
  random: () => number
): EvolutionaryGenome {
  const keys = Object.keys(parent1.parameters);
  const point1 = Math.floor(random() * keys.length);
  const point2 = Math.floor(random() * keys.length);
  const [start, end] = point1 < point2 ? [point1, point2] : [point2, point1];
  
  const childParams: Record<string, number> = {};
  keys.forEach((key, i) => {
    childParams[key] = (i >= start && i < end) ? parent2.parameters[key] : parent1.parameters[key];
  });
  
  return { parameters: childParams };
}

/**
 * Uniform crossover
 */
function uniformCrossover(
  parent1: EvolutionaryGenome,
  parent2: EvolutionaryGenome,
  random: () => number
): EvolutionaryGenome {
  const childParams: Record<string, number> = {};
  
  for (const key of Object.keys(parent1.parameters)) {
    childParams[key] = random() < 0.5 ? parent1.parameters[key] : parent2.parameters[key];
  }
  
  return { parameters: childParams };
}

/**
 * Arithmetic crossover
 */
function arithmeticCrossover(
  parent1: EvolutionaryGenome,
  parent2: EvolutionaryGenome,
  random: () => number
): EvolutionaryGenome {
  const alpha = random();
  const childParams: Record<string, number> = {};
  
  for (const key of Object.keys(parent1.parameters)) {
    childParams[key] = alpha * parent1.parameters[key] + (1 - alpha) * parent2.parameters[key];
  }
  
  return { parameters: childParams };
}

/**
 * Crossover using specified method
 */
function crossover(
  parent1: EvolutionaryGenome,
  parent2: EvolutionaryGenome,
  method: string,
  random: () => number
): EvolutionaryGenome {
  switch (method) {
    case 'single-point':
      return singlePointCrossover(parent1, parent2, random);
    case 'two-point':
      return twoPointCrossover(parent1, parent2, random);
    case 'uniform':
      return uniformCrossover(parent1, parent2, random);
    case 'arithmetic':
      return arithmeticCrossover(parent1, parent2, random);
    default:
      return singlePointCrossover(parent1, parent2, random);
  }
}

/**
 * Gaussian mutation
 */
function gaussianMutation(
  genome: EvolutionaryGenome,
  mutationRate: number,
  parameterRanges: Record<string, [number, number]>,
  random: () => number
): EvolutionaryGenome {
  const mutatedParams: Record<string, number> = { ...genome.parameters };
  
  for (const [key, value] of Object.entries(mutatedParams)) {
    if (random() < mutationRate) {
      const [min, max] = parameterRanges[key];
      const range = max - min;
      const sigma = range * 0.1; // 10% of range
      
      // Box-Muller transform for Gaussian random
      const u1 = random();
      const u2 = random();
      const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      
      mutatedParams[key] = Math.max(min, Math.min(max, value + gaussian * sigma));
    }
  }
  
  return { parameters: mutatedParams };
}

/**
 * Uniform mutation
 */
function uniformMutation(
  genome: EvolutionaryGenome,
  mutationRate: number,
  parameterRanges: Record<string, [number, number]>,
  random: () => number
): EvolutionaryGenome {
  const mutatedParams: Record<string, number> = { ...genome.parameters };
  
  for (const [key, value] of Object.entries(mutatedParams)) {
    if (random() < mutationRate) {
      const [min, max] = parameterRanges[key];
      mutatedParams[key] = min + random() * (max - min);
    }
  }
  
  return { parameters: mutatedParams };
}

/**
 * Creep mutation
 */
function creepMutation(
  genome: EvolutionaryGenome,
  mutationRate: number,
  parameterRanges: Record<string, [number, number]>,
  random: () => number
): EvolutionaryGenome {
  const mutatedParams: Record<string, number> = { ...genome.parameters };
  
  for (const [key, value] of Object.entries(mutatedParams)) {
    if (random() < mutationRate) {
      const [min, max] = parameterRanges[key];
      const range = max - min;
      const delta = (random() - 0.5) * range * 0.1; // ±5% of range
      
      mutatedParams[key] = Math.max(min, Math.min(max, value + delta));
    }
  }
  
  return { parameters: mutatedParams };
}

/**
 * Mutate genome using specified method
 */
function mutate(
  genome: EvolutionaryGenome,
  mutationRate: number,
  parameterRanges: Record<string, [number, number]>,
  method: string,
  random: () => number
): EvolutionaryGenome {
  switch (method) {
    case 'gaussian':
      return gaussianMutation(genome, mutationRate, parameterRanges, random);
    case 'uniform':
      return uniformMutation(genome, mutationRate, parameterRanges, random);
    case 'creep':
      return creepMutation(genome, mutationRate, parameterRanges, random);
    default:
      return gaussianMutation(genome, mutationRate, parameterRanges, random);
  }
}

/**
 * Run evolutionary optimization
 */
function runEvolution(
  params: EvolutionaryParams,
  parameterRanges: Record<string, [number, number]>,
  context: WorkflowComputeContext
): EvolutionaryResult {
  const random = createRandom(params.seed);
  const populations: EvolutionaryPopulation[] = [];
  
  // Initialize population
  let population = initializePopulation(params.populationSize, parameterRanges, params.seed);
  
  // Evaluate initial population
  population.forEach(genome => {
    genome.fitness = evaluateFitness(genome, params.fitnessFunction, context);
  });
  
  let prevBestFitness = Infinity;
  let convergenceGeneration: number | undefined;
  
  for (let gen = 0; gen < params.generations; gen++) {
    // Sort by fitness (ascending - lower is better)
    population.sort((a, b) => (a.fitness ?? Infinity) - (b.fitness ?? Infinity));
    
    const bestFitness = population[0].fitness ?? Infinity;
    const averageFitness = population.reduce((sum, g) => sum + (g.fitness ?? 0), 0) / population.length;
    
    // Store population snapshot
    populations.push({
      individuals: population.map(g => ({ ...g })),
      generation: gen,
      bestFitness,
      averageFitness,
      bestIndividual: { ...population[0] },
    });
    
    // Check convergence
    if (Math.abs(bestFitness - prevBestFitness) < params.convergenceTolerance) {
      convergenceGeneration = gen;
      break;
    }
    prevBestFitness = bestFitness;
    
    // Create next generation
    const nextGeneration: EvolutionaryGenome[] = [];
    
    // Elitism: preserve best individuals
    for (let i = 0; i < params.elitismCount; i++) {
      nextGeneration.push({ ...population[i] });
    }
    
    // Generate offspring
    while (nextGeneration.length < params.populationSize) {
      const parent1 = selectParent(population, params.selectionMethod, random);
      const parent2 = selectParent(population, params.selectionMethod, random);
      
      let offspring: EvolutionaryGenome;
      
      if (random() < params.crossoverRate) {
        offspring = crossover(parent1, parent2, params.crossoverMethod, random);
      } else {
        offspring = { parameters: { ...parent1.parameters } };
      }
      
      offspring = mutate(offspring, params.mutationRate, parameterRanges, params.mutationMethod, random);
      offspring.fitness = evaluateFitness(offspring, params.fitnessFunction, context);
      
      nextGeneration.push(offspring);
    }
    
    population = nextGeneration;
  }
  
  // Final sort
  population.sort((a, b) => (a.fitness ?? Infinity) - (b.fitness ?? Infinity));
  
  return {
    populations,
    bestIndividual: population[0],
    converged: convergenceGeneration !== undefined,
    convergenceGeneration,
    totalGenerations: populations.length,
  };
}

export const EvolutionarySolver: WorkflowNodeDefinition = {
  type: "evolutionarySolver",
  category: "solver",
  semanticOps: ['solver.evolutionary'],
  label: "Evolutionary Solver",
  shortLabel: "Evolutionary",
  description: "Genetic algorithm-based evolutionary optimization solver for geometry configuration",
  iconId: "solver",
  
  inputs: [
    {
      name: "domain",
      type: "geometry",
      label: "Domain",
      description: "Domain geometry for optimization",
      required: true,
    },
  ],
  
  outputs: [
    {
      name: "geometry",
      type: "geometry",
      label: "Geometry",
      description: "Optimized geometry configuration",
    },
  ],
  
  parameters: [
    {
      name: "populationSize",
      type: "number",
      label: "Population Size",
      description: "Number of individuals per generation",
      default: 50,
      min: 10,
      max: 200,
    },
    {
      name: "generations",
      type: "number",
      label: "Generations",
      description: "Maximum number of generations",
      default: 100,
      min: 10,
      max: 1000,
    },
    {
      name: "mutationRate",
      type: "number",
      label: "Mutation Rate",
      description: "Probability of mutation (0-1)",
      default: 0.1,
      min: 0.0,
      max: 1.0,
    },
    {
      name: "crossoverRate",
      type: "number",
      label: "Crossover Rate",
      description: "Probability of crossover (0-1)",
      default: 0.8,
      min: 0.0,
      max: 1.0,
    },
    {
      name: "elitismCount",
      type: "number",
      label: "Elitism Count",
      description: "Number of best individuals to preserve",
      default: 2,
      min: 0,
      max: 10,
    },
    {
      name: "selectionMethod",
      type: "string",
      label: "Selection Method",
      description: "Parent selection method",
      default: "tournament",
      options: ["tournament", "roulette", "rank"],
    },
    {
      name: "crossoverMethod",
      type: "string",
      label: "Crossover Method",
      description: "Crossover operator",
      default: "single-point",
      options: ["single-point", "two-point", "uniform", "arithmetic"],
    },
    {
      name: "mutationMethod",
      type: "string",
      label: "Mutation Method",
      description: "Mutation operator",
      default: "gaussian",
      options: ["gaussian", "uniform", "creep"],
    },
    {
      name: "fitnessFunction",
      type: "string",
      label: "Fitness Function",
      description: "Optimization objective",
      default: "minimize-area",
      options: ["minimize-area", "maximize-volume", "minimize-surface-area"],
    },
    {
      name: "convergenceTolerance",
      type: "number",
      label: "Convergence Tolerance",
      description: "Fitness change threshold for convergence",
      default: 1e-6,
      min: 1e-10,
      max: 1e-2,
    },
    {
      name: "seed",
      type: "number",
      label: "Random Seed",
      description: "Seed for deterministic random generation",
      default: 42,
      min: 0,
      max: 999999,
    },
  ],
  
  compute: async (inputs, parameters, context: WorkflowComputeContext) => {
    const startTime = performance.now();
    
    // Extract parameters
    const params = parameters as EvolutionaryParams;
    
    // Get domain geometry
    const domainId = inputs.domain as string;
    if (!domainId) {
      throw new Error("EvolutionarySolver requires domain geometry");
    }
    
    const domainGeometry = context.geometryById.get(domainId);
    if (!domainGeometry || domainGeometry.type !== "mesh") {
      throw new Error("EvolutionarySolver requires mesh geometry as domain");
    }
    
    // Define parameter ranges (example - in real implementation, these would come from genome nodes)
    const parameterRanges: Record<string, [number, number]> = {
      width: [0.1, 10.0],
      height: [0.1, 10.0],
      depth: [0.1, 10.0],
    };
    
    // Run evolutionary optimization
    const result = runEvolution(params, parameterRanges, context);
    
    // For now, return the domain geometry (in real implementation, generate optimized geometry)
    const geometryId = `evolutionary-output-${Date.now()}`;
    const baseGeometry: Geometry = {
      id: geometryId,
      type: "mesh",
      mesh: domainGeometry.mesh,
    };
    
    // Attach solver metadata (ROSLYN-NUMERICA bridge)
    const solverMetadata = createSolverMetadata(
      "evolutionary",
      "EvolutionarySolver (Darwin)",
      result.totalGenerations,
      result.converged,
      {
        parameters: {
          populationSize: params.populationSize,
          generations: params.generations,
          mutationRate: params.mutationRate,
          crossoverRate: params.crossoverRate,
          elitismCount: params.elitismCount,
          selectionMethod: params.selectionMethod,
          crossoverMethod: params.crossoverMethod,
          mutationMethod: params.mutationMethod,
          fitnessFunction: params.fitnessFunction,
          seed: params.seed,
        },
        bestFitness: result.bestIndividual.fitness,
        bestParameters: result.bestIndividual.parameters,
        convergenceGeneration: result.convergenceGeneration,
        populationHistory: result.populations.map(p => ({
          generation: p.generation,
          bestFitness: p.bestFitness,
          averageFitness: p.averageFitness,
        })),
      }
    );
    
    const geometryWithMetadata = attachSolverMetadata(baseGeometry, solverMetadata);
    
    // Register geometry in context
    context.geometryById.set(geometryId, geometryWithMetadata);
    
    const computeTime = performance.now() - startTime;
    
    return {
      geometry: geometryId,
      metadata: {
        solver: "EvolutionarySolver (Darwin)",
        generations: result.totalGenerations,
        converged: result.converged,
        convergenceGeneration: result.convergenceGeneration,
        bestFitness: result.bestIndividual.fitness,
        bestParameters: result.bestIndividual.parameters,
        computeTime,
      },
    };
  },
};
