import { useProjectStore } from "../../../../store/useProjectStore";
import { resolveNodeParameters, resolveNodePorts } from "../../../nodeRegistry";
import { toList, toNumber } from "../utils";
import type { FitnessMetric, GeneDefinition } from "./types";
import { getEvaluationCache } from "./solverState";

export type ConnectionInfo = {
  genomeCollectorId: string;
  geometryPhenotypeId: string;
  performsFitnessId: string | null;
  genes: GeneDefinition[];
  metrics: FitnessMetric[];
  geometrySources: Array<{ nodeId: string; portKey: string }>;
  metricSources: Array<{ nodeId: string; portKey: string; metricId: string }>;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const roundToStep = (value: number, step: number, min: number) => {
  if (!Number.isFinite(step) || step <= 0) return value;
  const snapped = Math.round((value - min) / step) * step + min;
  return Number.isFinite(snapped) ? snapped : value;
};

const coerceMetricValue = (value: unknown) => {
  if (Array.isArray(value)) {
    const flat = toList(value).map((entry) => toNumber(entry, 0));
    if (flat.length === 0) return 0;
    return flat.reduce((sum, entry) => sum + entry, 0) / flat.length;
  }
  return toNumber(value, 0);
};

const resolveDefaultInputKey = (nodeId: string) => {
  const node = useProjectStore.getState().workflow.nodes.find((entry) => entry.id === nodeId);
  if (!node) return null;
  const parameters = resolveNodeParameters(node);
  const ports = resolveNodePorts(node, parameters);
  return ports.inputs[0]?.key ?? null;
};

const resolveDefaultOutputKey = (nodeId: string) => {
  const node = useProjectStore.getState().workflow.nodes.find((entry) => entry.id === nodeId);
  if (!node) return null;
  const parameters = resolveNodeParameters(node);
  const ports = resolveNodePorts(node, parameters);
  return ports.outputs[0]?.key ?? null;
};

const resolveInputSource = (targetId: string, targetKey: string) => {
  const edges = useProjectStore.getState().workflow.edges;
  const defaultKey = resolveDefaultInputKey(targetId);
  return (
    edges.find(
      (edge) =>
        edge.target === targetId &&
        (edge.targetHandle ?? defaultKey) === targetKey
    ) ?? null
  );
};

const resolveIncomingEdges = (targetId: string, targetKey: string) => {
  const edges = useProjectStore.getState().workflow.edges;
  const defaultKey = resolveDefaultInputKey(targetId);
  return edges.filter(
    (edge) =>
      edge.target === targetId &&
      (edge.targetHandle ?? defaultKey) === targetKey
  );
};

const resolveNodeLabel = (nodeId: string, fallback: string) => {
  const node = useProjectStore.getState().workflow.nodes.find((entry) => entry.id === nodeId);
  return node?.data?.label ?? fallback;
};

export const resolveSolverConnections = (solverNodeId: string): ConnectionInfo | null => {
  const genomeEdge = resolveInputSource(solverNodeId, "genome");
  const geometryEdge = resolveInputSource(solverNodeId, "geometry");
  const performsEdge = resolveInputSource(solverNodeId, "performs");

  if (!genomeEdge || !geometryEdge) {
    return null;
  }

  const genomeCollectorId = genomeEdge.source;
  const geometryPhenotypeId = geometryEdge.source;
  const performsFitnessId = performsEdge?.source ?? null;

  const sliderEdges = resolveIncomingEdges(genomeCollectorId, "sliders");
  const genes: GeneDefinition[] = sliderEdges.map((edge, index) => {
    const node = useProjectStore.getState().workflow.nodes.find((entry) => entry.id === edge.source);
    const parameters = node ? resolveNodeParameters(node) : {};
    const min = toNumber(parameters.min, 0);
    const max = toNumber(parameters.max, 100);
    const step = Math.max(0.001, Math.abs(toNumber(parameters.step, 1)));
    const value = toNumber(parameters.value, min);
    const label = resolveNodeLabel(edge.source, `Gene ${index + 1}`);
    return {
      id: edge.source,
      name: label,
      min: Math.min(min, max),
      max: Math.max(min, max),
      step,
      currentValue: clamp(value, Math.min(min, max), Math.max(min, max)),
      type: "continuous",
    };
  });

  const geometrySources = resolveIncomingEdges(geometryPhenotypeId, "geometry").map((edge) => ({
    nodeId: edge.source,
    portKey: edge.sourceHandle ?? resolveDefaultOutputKey(edge.source) ?? "geometry",
  }));

  const metricSources = performsFitnessId
    ? resolveIncomingEdges(performsFitnessId, "metrics").map((edge, index) => ({
        nodeId: edge.source,
        portKey: edge.sourceHandle ?? resolveDefaultOutputKey(edge.source) ?? "value",
        metricId: `${edge.source}:${edge.sourceHandle ?? "value"}`,
        index,
      }))
    : [];

  const metrics: FitnessMetric[] = metricSources.map((source, index) => ({
    id: source.metricId,
    name: resolveNodeLabel(source.nodeId, `Metric ${index + 1}`),
    mode: "maximize",
    weight: 1,
    source: {
      nodeId: source.nodeId,
      portKey: source.portKey,
    },
  }));

  return {
    genomeCollectorId,
    geometryPhenotypeId,
    performsFitnessId,
    genes,
    metrics,
    geometrySources,
    metricSources: metricSources.map((source) => ({
      nodeId: source.nodeId,
      portKey: source.portKey,
      metricId: source.metricId,
    })),
  };
};

// Batch size for evaluation - larger batches reduce overhead
const EVAL_BATCH_SIZE = 8;
// Throttle progress updates to reduce UI lag
const PROGRESS_THROTTLE_MS = 50;

export const evaluateIndividuals = async (
  solverNodeId: string,
  individuals: Array<{ genome: number[]; genomeString: string }>,
  connections: ConnectionInfo,
  onProgress?: (completed: number, total: number, label: string) => void
) => {
  const cache = getEvaluationCache(solverNodeId);
  const results: Array<{ genomeString: string; metrics: Record<string, number> }> = [];
  if (individuals.length === 0) return results;

  const sliderIds = connections.genes.map((gene) => gene.id);
  const originalValues = sliderIds.map((id) => {
    const node = useProjectStore.getState().workflow.nodes.find((entry) => entry.id === id);
    const parameters = node ? resolveNodeParameters(node) : {};
    return toNumber(parameters.value, 0);
  });

  // Fast batch update for slider values
  const applySliderValuesFast = (values: number[]) => {
    const updates = new Map<string, number>();
    connections.genes.forEach((gene, index) => {
      const raw = values[index] ?? gene.currentValue;
      const clamped = clamp(raw, gene.min, gene.max);
      updates.set(gene.id, roundToStep(clamped, gene.step, gene.min));
    });
    useProjectStore.setState((state) => ({
      workflow: {
        ...state.workflow,
        nodes: state.workflow.nodes.map((node) => {
          const next = updates.get(node.id);
          if (next == null) return node;
          const nextParams = {
            ...(node.data?.parameters ?? {}),
            value: next,
          };
          return {
            ...node,
            data: {
              ...node.data,
              parameters: nextParams,
            },
          };
        }),
      },
    }));
    // Recalculate synchronously
    useProjectStore.getState().recalculateWorkflow();
  };

  const restoreOriginal = () => {
    applySliderValuesFast(originalValues);
  };

  // Separate cached vs uncached individuals
  const uncached: Array<{ genome: number[]; genomeString: string }> = [];
  for (const individual of individuals) {
    const cached = cache.get(individual.genomeString);
    if (cached) {
      results.push({ genomeString: individual.genomeString, metrics: cached.metrics });
    } else {
      uncached.push(individual);
    }
  }

  // Report cached results immediately
  if (results.length > 0 && onProgress) {
    onProgress(results.length, individuals.length, "Cached");
  }

  // Process uncached individuals in batches
  let lastProgressTime = 0;
  for (let i = 0; i < uncached.length; i++) {
    const individual = uncached[i];

    applySliderValuesFast(individual.genome);

    const metrics: Record<string, number> = {};
    connections.metricSources.forEach((metric) => {
      const node = useProjectStore
        .getState()
        .workflow.nodes.find((entry) => entry.id === metric.nodeId);
      const value = node?.data?.outputs?.[metric.portKey];
      metrics[metric.metricId] = coerceMetricValue(value);
    });

    // Capture geometry IDs for thumbnail generation
    const geometryIds: string[] = [];
    connections.geometrySources.forEach((source) => {
      const node = useProjectStore
        .getState()
        .workflow.nodes.find((entry) => entry.id === source.nodeId);
      const output = node?.data?.outputs?.[source.portKey];
      if (typeof output === "string") {
        geometryIds.push(output);
      } else if (Array.isArray(output)) {
        output.forEach((id) => {
          if (typeof id === "string") geometryIds.push(id);
        });
      }
    });

    cache.set(individual.genomeString, {
      genomeString: individual.genomeString,
      metrics,
      geometryIds,
    });
    results.push({ genomeString: individual.genomeString, metrics });

    // Throttled progress updates
    const now = performance.now();
    const completed = results.length;
    if (onProgress && (now - lastProgressTime > PROGRESS_THROTTLE_MS || completed === individuals.length)) {
      onProgress(completed, individuals.length, "Evaluating");
      lastProgressTime = now;
    }

    // Yield to UI every batch to prevent freezing
    if ((i + 1) % EVAL_BATCH_SIZE === 0 && i < uncached.length - 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }

  restoreOriginal();
  return results;
};

export const applyGenomeToSliders = (genes: GeneDefinition[], genome: number[]) => {
  if (genes.length === 0) return;
  const updates = new Map<string, number>();
  genes.forEach((gene, index) => {
    const raw = genome[index] ?? gene.currentValue;
    const clamped = clamp(raw, gene.min, gene.max);
    updates.set(gene.id, roundToStep(clamped, gene.step, gene.min));
  });
  useProjectStore.setState((state) => ({
    workflow: {
      ...state.workflow,
      nodes: state.workflow.nodes.map((node) => {
        const next = updates.get(node.id);
        if (next == null) return node;
        const nextParams = {
          ...(node.data?.parameters ?? {}),
          value: next,
        };
        return {
          ...node,
          data: {
            ...node.data,
            parameters: nextParams,
          },
        };
      }),
    },
  }));
  useProjectStore.getState().recalculateWorkflow();
};
