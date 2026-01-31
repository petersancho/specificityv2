import type {
  FitnessMetric,
  GeneDefinition,
  Individual,
  SolverConfig,
  SolverOutputs,
} from "../../workflow/nodes/solver/biological/types";

export type BiologicalSolverRunExportV1 = {
  schema: "lingua.biological-solver.run@v1";
  generatedAt: string;
  config: SolverConfig;
  genes: GeneDefinition[];
  metrics: FitnessMetric[];
  best: Pick<
    Individual,
    "id" | "genome" | "genomeString" | "fitness" | "fitnessBreakdown" | "generation" | "rank"
  > | null;
  generations: Array<{
    id: number;
    stats: {
      bestFitness: number;
      meanFitness: number;
      worstFitness: number;
      diversityStdDev: number;
      evaluationTime: number;
    };
    bestIds: string[];
  }>;
};

const nowIsoString = () => new Date().toISOString();

export const toBiologicalSolverRunExportV1 = (args: {
  config: SolverConfig;
  genes: GeneDefinition[];
  metrics: FitnessMetric[];
  outputs: SolverOutputs;
}): BiologicalSolverRunExportV1 => {
  const history = args.outputs.history?.generations ?? [];
  const best = args.outputs.best
    ? {
        id: args.outputs.best.id,
        genome: [...args.outputs.best.genome],
        genomeString: args.outputs.best.genomeString,
        fitness: args.outputs.best.fitness,
        fitnessBreakdown: args.outputs.best.fitnessBreakdown,
        generation: args.outputs.best.generation,
        rank: args.outputs.best.rank,
      }
    : null;

  return {
    schema: "lingua.biological-solver.run@v1",
    generatedAt: nowIsoString(),
    config: args.config,
    genes: args.genes,
    metrics: args.metrics,
    best,
    generations: history.map((generation) => ({
      id: generation.id,
      stats: { ...generation.statistics },
      bestIds: [...generation.population]
        .sort((a, b) => b.fitness - a.fitness)
        .slice(0, 3)
        .map((individual) => individual.id),
    })),
  };
};

export const toBiologicalSolverRunNodeExampleScript = (
  exportData: BiologicalSolverRunExportV1
) => {
  const fileName = "biological-solver-run.json";
  const expectedSchema = exportData.schema;

  return [
    "const fs = require(\"node:fs\");",
    "\nconst input = process.argv[2] ?? \"" + fileName + "\";",
    "const expectedSchema = \"" + expectedSchema + "\";",
    "let run;",
    "try {",
    "  const raw = fs.readFileSync(input, \"utf8\");",
    "  run = JSON.parse(raw);",
    "} catch (error) {",
    "  console.error(\"Failed to read or parse run file\", error);",
    "  process.exit(1);",
    "}",
    "\nconsole.log(run.schema);",
    "if (expectedSchema && run.schema !== expectedSchema) {",
    "  console.warn(\"Unexpected schema\", run.schema);",
    "}",
    "console.log(\"generatedAt\", run.generatedAt);",
    "console.log(\"generations\", run.config.generations);",
    "\nif (run.best) {",
    "  console.log(\"bestFitness\", run.best.fitness);",
    "  console.log(\"bestGenome\", run.best.genome);",
    "  console.log(\"bestGenomeString\", run.best.genomeString);",
    "}",
    "\nconsole.log(\"firstGenBestIds\", run.generations?.[0]?.bestIds ?? []);",
    "\n// Genes + metrics are included so you can map genome indices back to graph controls.",
    "console.log(\"geneCount\", run.genes?.length ?? 0);",
    "console.log(\"metricCount\", run.metrics?.length ?? 0);",
  ].join("\n");
};
