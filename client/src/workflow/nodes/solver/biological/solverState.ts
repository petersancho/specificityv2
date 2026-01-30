import type {
  EvaluationResult,
  FitnessMetric,
  SolverConfig,
  SolverOutputs,
} from "./types";

export type SolverRuntimeState = {
  outputs: SolverOutputs;
  config: SolverConfig;
  status: "idle" | "initialized" | "running" | "paused" | "stopped" | "error";
  generation: number;
  progress: { current: number; total: number; status: string } | null;
  metrics: FitnessMetric[];
  lastUpdated: number;
  error?: string | null;
};

export const DEFAULT_SOLVER_CONFIG: SolverConfig = {
  populationSize: 20,
  generations: 10,
  mutationRate: 0.1,
  crossoverRate: 0.7,
  elitism: 2,
  selectionMethod: "tournament",
  tournamentSize: 3,
  mutationType: "gaussian",
  crossoverType: "uniform",
  seedFromCurrent: false,
  randomSeed: null,
};

const DEFAULT_OUTPUTS: SolverOutputs = {
  best: null,
  populationBests: [],
  history: null,
  gallery: null,
  selectedGeometry: [],
};

const solverStateByNode = new Map<string, SolverRuntimeState>();
const evaluationCacheByNode = new Map<string, Map<string, EvaluationResult>>();

export const getBiologicalSolverState = (nodeId: string): SolverRuntimeState => {
  const existing = solverStateByNode.get(nodeId);
  if (existing) return existing;
  const initial: SolverRuntimeState = {
    outputs: { ...DEFAULT_OUTPUTS },
    config: { ...DEFAULT_SOLVER_CONFIG },
    status: "idle",
    generation: 0,
    progress: null,
    metrics: [],
    lastUpdated: Date.now(),
    error: null,
  };
  solverStateByNode.set(nodeId, initial);
  return initial;
};

export const updateBiologicalSolverState = (
  nodeId: string,
  patch: Partial<SolverRuntimeState>
) => {
  const current = getBiologicalSolverState(nodeId);
  const next = {
    ...current,
    ...patch,
    outputs: patch.outputs ?? current.outputs,
    config: patch.config ?? current.config,
    metrics: patch.metrics ?? current.metrics,
    progress: patch.progress ?? current.progress,
    status: patch.status ?? current.status,
    generation: patch.generation ?? current.generation,
    error: patch.error ?? current.error,
    lastUpdated: Date.now(),
  };
  solverStateByNode.set(nodeId, next);
  return next;
};

export const resetBiologicalSolverState = (nodeId: string) => {
  solverStateByNode.delete(nodeId);
  evaluationCacheByNode.delete(nodeId);
};

export const getBiologicalSolverOutputs = (nodeId: string) =>
  getBiologicalSolverState(nodeId).outputs;

export const getEvaluationCache = (nodeId: string) => {
  const existing = evaluationCacheByNode.get(nodeId);
  if (existing) return existing;
  const created = new Map<string, EvaluationResult>();
  evaluationCacheByNode.set(nodeId, created);
  return created;
};

export const clearEvaluationCache = (nodeId: string) => {
  evaluationCacheByNode.set(nodeId, new Map());
};
