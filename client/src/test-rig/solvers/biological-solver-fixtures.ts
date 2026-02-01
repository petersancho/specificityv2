import type { Geometry } from "../../types";
import type { Individual, SolverConfig } from "../../workflow/nodes/solver/biological/types";

export const buildBiologicalConfig = (): SolverConfig => ({
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
});

export const makeIndividual = (
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

export const buildGeneration0 = (baseGeometryId: string): Individual[] => [
  makeIndividual("ind-0-a", [0.25, -0.35, 0.6], 0.74, 0, 2, {
    fitnessBreakdown: { growth: 0.42, homeostasis: 0.32 },
    geometryIds: [baseGeometryId],
  }),
  makeIndividual("ind-0-b", [0.32, -0.22, 0.55], 0.78, 0, 1, {
    fitnessBreakdown: { growth: 0.46, homeostasis: 0.32 },
    geometryIds: [baseGeometryId],
  }),
  makeIndividual("ind-0-c", [0.11, -0.48, 0.61], 0.63, 0, 3, {
    fitnessBreakdown: { growth: 0.36, homeostasis: 0.27 },
    geometryIds: [baseGeometryId],
  }),
  makeIndividual("ind-0-d", [0.44, -0.18, 0.4], 0.51, 0, 4, {
    fitnessBreakdown: { growth: 0.31, homeostasis: 0.2 },
    geometryIds: [baseGeometryId],
  }),
];

export const buildGeneration1 = (baseGeometryId: string, baseGeometry?: Geometry): Individual[] => [
  makeIndividual("ind-1-a", [0.31, -0.33, 0.64], 0.81, 1, 2, {
    fitnessBreakdown: { growth: 0.5, homeostasis: 0.31 },
    geometryIds: [baseGeometryId],
  }),
  makeIndividual("ind-1-b", [0.37, -0.19, 0.7], 0.86, 1, 1, {
    fitnessBreakdown: { growth: 0.55, homeostasis: 0.31 },
    geometryIds: [baseGeometryId],
    geometry: baseGeometry ? [baseGeometry] : undefined,
  }),
  makeIndividual("ind-1-c", [0.08, -0.52, 0.66], 0.62, 1, 3, {
    fitnessBreakdown: { growth: 0.35, homeostasis: 0.27 },
    geometryIds: [baseGeometryId],
  }),
  makeIndividual("ind-1-d", [0.4, -0.11, 0.48], 0.49, 1, 4, {
    fitnessBreakdown: { growth: 0.29, homeostasis: 0.2 },
    geometryIds: [baseGeometryId],
  }),
];

export const buildFitnessMetrics = () => [
  { id: "growth", name: "Growth", mode: "maximize" as const, weight: 1 },
  { id: "homeostasis", name: "Homeostasis", mode: "maximize" as const, weight: 1 },
];
