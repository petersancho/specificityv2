import type { Geometry } from "../../types";
import type { Individual, SolverConfig, SolverOutputs } from "../../workflow/nodes/solver/biological/types";
import { meshBounds } from "./rig-utils";

interface BiologicalSolverReportInput {
  label: string;
  config: SolverConfig;
  outputs: SolverOutputs;
  baseGeometry: Geometry;
}

interface BiologicalSolverReport {
  label: string;
  timestamp: string;
  config: SolverConfig;
  best: {
    id: string;
    genome: number[];
    fitness: number;
    generation: number;
    rank: number;
    fitnessBreakdown?: Record<string, number>;
  };
  population: {
    totalIndividuals: number;
    generations: number;
    bestFitnessPerGeneration: number[];
    meanFitnessPerGeneration: number[];
    diversityPerGeneration: number[];
  };
  geometry: {
    baseGeometryId: string;
    selectedGeometryIds: string[];
    bestGeometryCount: number;
  };
  convergence: {
    finalBestFitness: number;
    improvementRate: number;
    stagnationCount: number;
  };
}

const summarizePopulation = (outputs: SolverOutputs) => {
  const generations = outputs.history?.generations ?? [];
  const totalIndividuals = generations.reduce(
    (sum, gen) => sum + (gen.population?.length ?? 0),
    0
  );

  const bestFitnessPerGeneration = generations.map(
    (gen) => gen.statistics?.bestFitness ?? 0
  );
  const meanFitnessPerGeneration = generations.map(
    (gen) => gen.statistics?.meanFitness ?? 0
  );
  const diversityPerGeneration = generations.map(
    (gen) => gen.statistics?.diversityStdDev ?? 0
  );

  return {
    totalIndividuals,
    generations: generations.length,
    bestFitnessPerGeneration,
    meanFitnessPerGeneration,
    diversityPerGeneration,
  };
};

export const buildBiologicalSolverRunReport = (
  input: BiologicalSolverReportInput
): BiologicalSolverReport => {
  const best = input.outputs.best;
  const population = summarizePopulation(input.outputs);
  
  const lastGeneration = input.outputs.history?.generations?.[input.outputs.history.generations.length - 1];
  const convergenceMetrics = lastGeneration?.convergenceMetrics ?? {
    improvementRate: 0,
    stagnationCount: 0,
  };

  return {
    label: input.label,
    timestamp: new Date().toISOString(),
    config: input.config,
    best: {
      id: best.id,
      genome: best.genome,
      fitness: best.fitness,
      generation: best.generation,
      rank: best.rank,
      fitnessBreakdown: best.fitnessBreakdown,
    },
    population,
    geometry: {
      baseGeometryId: input.baseGeometry.id,
      selectedGeometryIds: input.outputs.selectedGeometry ?? [],
      bestGeometryCount: best.geometry?.length ?? 0,
    },
    convergence: {
      finalBestFitness: best.fitness,
      improvementRate: convergenceMetrics.improvementRate,
      stagnationCount: convergenceMetrics.stagnationCount,
    },
  };
};

export const logBiologicalSolverRunReport = (report: BiologicalSolverReport) => {
  console.log("\n=== Biological Solver Run Report ===");
  console.log(`Label: ${report.label}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log("\nConfiguration:");
  console.log(`  Population Size: ${report.config.populationSize}`);
  console.log(`  Generations: ${report.config.generations}`);
  console.log(`  Mutation Rate: ${report.config.mutationRate}`);
  console.log(`  Crossover Rate: ${report.config.crossoverRate}`);
  console.log(`  Elitism: ${report.config.elitism}`);
  console.log(`  Selection Method: ${report.config.selectionMethod}`);
  console.log(`  Mutation Type: ${report.config.mutationType}`);
  console.log(`  Crossover Type: ${report.config.crossoverType}`);
  console.log("\nBest Individual:");
  console.log(`  ID: ${report.best.id}`);
  console.log(`  Genome: [${report.best.genome.map((v) => v.toFixed(3)).join(", ")}]`);
  console.log(`  Fitness: ${report.best.fitness.toFixed(4)}`);
  console.log(`  Generation: ${report.best.generation}`);
  console.log(`  Rank: ${report.best.rank}`);
  
  if (report.best.fitnessBreakdown) {
    console.log("  Fitness Breakdown:");
    Object.entries(report.best.fitnessBreakdown).forEach(([key, value]) => {
      console.log(`    ${key}: ${value.toFixed(4)}`);
    });
  }
  
  console.log("\nPopulation:");
  console.log(`  Total Individuals: ${report.population.totalIndividuals}`);
  console.log(`  Generations: ${report.population.generations}`);
  console.log("  Best Fitness per Generation:");
  report.population.bestFitnessPerGeneration.forEach((fitness, i) => {
    console.log(`    Gen ${i}: ${fitness.toFixed(4)}`);
  });
  console.log("  Mean Fitness per Generation:");
  report.population.meanFitnessPerGeneration.forEach((fitness, i) => {
    console.log(`    Gen ${i}: ${fitness.toFixed(4)}`);
  });
  console.log("  Diversity per Generation:");
  report.population.diversityPerGeneration.forEach((diversity, i) => {
    console.log(`    Gen ${i}: ${diversity.toFixed(4)}`);
  });
  
  console.log("\nGeometry:");
  console.log(`  Base Geometry ID: ${report.geometry.baseGeometryId}`);
  console.log(`  Selected Geometry IDs: ${report.geometry.selectedGeometryIds.join(", ")}`);
  console.log(`  Best Geometry Count: ${report.geometry.bestGeometryCount}`);
  
  console.log("\nConvergence:");
  console.log(`  Final Best Fitness: ${report.convergence.finalBestFitness.toFixed(4)}`);
  console.log(`  Improvement Rate: ${report.convergence.improvementRate.toFixed(4)}`);
  console.log(`  Stagnation Count: ${report.convergence.stagnationCount}`);
  
  console.log("====================================\n");
};
