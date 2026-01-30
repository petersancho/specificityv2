import { useProjectStore } from "../../../../store/useProjectStore";
import { resolveNodeParameters, resolveNodePorts } from "../../../nodeRegistry";
import { toList, toNumber } from "../utils";
import type { GoalSpecification } from "../types";
import type { FitnessMetric, GeneDefinition } from "./types";
import type { Geometry, RenderMesh } from "../../../../types";
import { getEvaluationCache } from "./solverState";

export type ConnectionInfo = {
  genomeCollectorId: string;
  geometryPhenotypeId: string;
  performsFitnessId: string | null;
  genes: GeneDefinition[];
  metrics: FitnessMetric[];
  goals: GoalSpecification[];
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

const safeClone = <T,>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const cloneMeshData = (mesh: RenderMesh | undefined) =>
  mesh
    ? {
        positions: [...mesh.positions],
        normals: [...mesh.normals],
        uvs: [...mesh.uvs],
        indices: [...mesh.indices],
      }
    : null;

const cloneGeometryItem = (item: Geometry): Geometry => safeClone(item);

const createSnapshotId = (prefix: string) =>
  `solver-${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;

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

const isGoalSpec = (value: unknown): value is GoalSpecification =>
  Boolean(value) && typeof value === "object" && "goalType" in (value as object);

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

  const domainSources = resolveIncomingEdges(solverNodeId, "domain").map((edge) => ({
    nodeId: edge.source,
    portKey: edge.sourceHandle ?? resolveDefaultOutputKey(edge.source) ?? "geometry",
  }));

  const combinedGeometrySources = [...geometrySources, ...domainSources];

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

  const goalSources = resolveIncomingEdges(solverNodeId, "goals").map((edge) => ({
    nodeId: edge.source,
    portKey: edge.sourceHandle ?? resolveDefaultOutputKey(edge.source) ?? "goal",
  }));

  const goals = goalSources
    .map((source) => {
      const node = useProjectStore.getState().workflow.nodes.find((entry) => entry.id === source.nodeId);
      return node?.data?.outputs?.[source.portKey];
    })
    .flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []))
    .filter(isGoalSpec) as unknown as GoalSpecification[];

  return {
    genomeCollectorId,
    geometryPhenotypeId,
    performsFitnessId,
    genes,
    metrics,
    goals,
    geometrySources: combinedGeometrySources,
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

    // Capture geometry IDs for solver snapshots
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

    const geometryItems: Geometry[] = [];
    const snapshotIds: string[] = [];
    if (geometryIds.length > 0) {
      const geometryById = new Map(
        useProjectStore.getState().geometry.map((item) => [item.id, item])
      );
      const processed = new Set<string>();
      const addSnapshotItem = (item: Geometry) => {
        if (processed.has(item.id)) return;
        processed.add(item.id);
        if ("mesh" in item && item.mesh) {
          const mesh = cloneMeshData(item.mesh);
          if (!mesh) return;
          const snapshotId = createSnapshotId("mesh");
          geometryItems.push({
            id: snapshotId,
            type: "mesh",
            mesh,
            layerId: item.layerId,
            area_m2: item.area_m2,
            thickness_m: item.thickness_m,
            sourceNodeId: item.sourceNodeId,
            metadata: item.metadata,
            primitive: item.type === "mesh" ? item.primitive : undefined,
          });
          snapshotIds.push(snapshotId);
          return;
        }
        if (item.type === "polyline") {
          const vertexIds = item.vertexIds.map((vertexId) => {
            const vertex = geometryById.get(vertexId);
            if (!vertex || vertex.type !== "vertex") {
              return createSnapshotId("vertex");
            }
            const vertexIdSnapshot = createSnapshotId("vertex");
            geometryItems.push({
              ...cloneGeometryItem(vertex),
              id: vertexIdSnapshot,
            });
            return vertexIdSnapshot;
          });
          const polylineId = createSnapshotId("polyline");
          geometryItems.push({
            ...cloneGeometryItem(item),
            id: polylineId,
            vertexIds,
          });
          snapshotIds.push(polylineId);
          return;
        }
        const snapshotId = createSnapshotId(item.type);
        geometryItems.push({
          ...cloneGeometryItem(item),
          id: snapshotId,
        });
        snapshotIds.push(snapshotId);
      };
      geometryIds.forEach((id) => {
        const item = geometryById.get(id);
        if (!item) return;
        addSnapshotItem(item);
      });
    }

    cache.set(individual.genomeString, {
      genomeString: individual.genomeString,
      metrics,
      geometryIds: snapshotIds.length > 0 ? snapshotIds : geometryIds,
      geometry: geometryItems,
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

export const deriveGoalTuning = (
  goals?: GoalSpecification[] | null
): { mutationRateScale: number; populationScale: number } => {
  if (!Array.isArray(goals) || goals.length === 0) {
    return { mutationRateScale: 1, populationScale: 1 };
  }

  let mutationRateScale = 1;
  let populationScale = 1;

  goals.forEach((goal) => {
    const weight = clamp(toNumber(goal.weight, 0), 0, 1);
    const params = goal.parameters ?? {};
    switch (goal.goalType) {
      case "growth": {
        const growthRate = clamp(toNumber(params.growthRate, 0.6), 0, 3);
        const carryingCapacity = clamp(toNumber(params.carryingCapacity, 1), 0.1, 5);
        mutationRateScale *= 1 + weight * (growthRate - 0.5) * 0.4;
        populationScale *= 1 + weight * (carryingCapacity - 1) * 0.15;
        break;
      }
      case "morphogenesis": {
        const branchingFactor = clamp(toNumber(params.branchingFactor, 0.6), 0, 2);
        mutationRateScale *= 1 + weight * branchingFactor * 0.5;
        break;
      }
      case "homeostasis": {
        const damping = clamp(toNumber(params.damping, 0.5), 0, 1);
        const stressLimit = clamp(toNumber(params.stressLimit, 1), 0.1, 10);
        mutationRateScale *= 1 - weight * damping * 0.6;
        populationScale *= 1 + weight * (stressLimit - 1) * 0.05;
        break;
      }
      default:
        break;
    }
  });

  return {
    mutationRateScale: clamp(mutationRateScale, 0.35, 2),
    populationScale: clamp(populationScale, 0.6, 2),
  };
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
