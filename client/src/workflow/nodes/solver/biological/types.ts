import type { Geometry } from "../../../../types";

export type GeneDefinition = {
  id: string;
  name: string;
  min: number;
  max: number;
  step: number;
  currentValue: number;
  type: "continuous" | "discrete";
};

export type GenomeSpec = {
  genes: GeneDefinition[];
  encodeStrategy?: "dash-join";
};

export type FitnessMetric = {
  id: string;
  name: string;
  mode: "maximize" | "minimize";
  weight: number;
  source?: {
    nodeId: string;
    portKey: string;
  };
};

export type FitnessSpec = {
  metrics: FitnessMetric[];
  defaultMode?: "maximize" | "minimize";
  defaultWeight?: number;
};

export type SolverConfig = {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  elitism: number;
  selectionMethod: "tournament" | "roulette" | "rank";
  tournamentSize: number;
  mutationType: "gaussian" | "uniform";
  crossoverType: "uniform" | "single-point";
  seedFromCurrent: boolean;
  randomSeed?: number | null;
};

export type Individual = {
  id: string;
  genome: number[];
  genomeString: string;
  fitness: number;
  fitnessBreakdown?: Record<string, number>;
  generation: number;
  rank: number;
  geometryIds?: string[];
  geometry?: Geometry[];
  thumbnail?: string | null;
};

export type GenerationStats = {
  bestFitness: number;
  meanFitness: number;
  worstFitness: number;
  diversityStdDev: number;
  evaluationTime: number;
};

export type GenerationRecord = {
  id: number;
  population: Individual[];
  statistics: GenerationStats;
  convergenceMetrics: {
    improvementRate: number;
    stagnationCount: number;
  };
};

export type SolverHistory = {
  generations: GenerationRecord[];
  config: SolverConfig;
};

export type PopulationBests = {
  generation: number;
  individuals: Individual[];
};

export type Gallery = {
  allIndividuals: Individual[];
  byGeneration: Record<number, Individual[]>;
  bestOverall: string | null;
  userSelections: string[];
};

export type EvaluationResult = {
  genomeString: string;
  metrics: Record<string, number>;
  geometryIds: string[];
  geometry?: Geometry[];
  thumbnail?: string | null;
};

export type SolverOutputs = {
  best: Individual | null;
  populationBests: PopulationBests[];
  history: SolverHistory | null;
  gallery: Gallery | null;
  selectedGeometry: string[];
};
