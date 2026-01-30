import type { Geometry, WorkflowEdge, WorkflowNode } from "../types";
import {
  buildGeometryMaps,
  coerceValueToPortType,
  computeNodeOutputs,
  getNodeDefinition,
  isPortTypeCompatible,
  resolveNodeParameters,
  resolveNodePorts,
  resolvePortByKey,
  type WorkflowNodeDefinition,
  type WorkflowPortSpec,
  type WorkflowValue,
} from "./nodeRegistry";
import { isSupportedNodeType, type NodeType } from "./nodeTypes";

type NodeMeta = {
  node: WorkflowNode;
  definition: WorkflowNodeDefinition;
  parameters: Record<string, unknown>;
  ports: { inputs: WorkflowPortSpec[]; outputs: WorkflowPortSpec[] };
  inputByKey: Map<string, WorkflowPortSpec>;
  outputByKey: Map<string, WorkflowPortSpec>;
  defaultInputKey?: string;
  defaultOutputKey?: string;
};

type TargetKey = string;

type EvaluatedNode = {
  outputs: Record<string, WorkflowValue>;
  error: string | null;
};

type EngineResult = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

type WorkflowPrimitive = number | string | boolean | { x: number; y: number; z: number };

const flattenWorkflowValue = (value: WorkflowValue): Array<WorkflowPrimitive | null | undefined> => {
  const flattened: Array<WorkflowPrimitive | null | undefined> = [];
  const walk = (entry: WorkflowValue) => {
    if (Array.isArray(entry)) {
      entry.forEach((nested) => walk(nested as WorkflowValue));
      return;
    }
    flattened.push(entry as WorkflowPrimitive | null | undefined);
  };
  walk(value);
  return flattened;
};

const makeTargetKey = (nodeId: string, portKey: string) => `${nodeId}::${portKey}` as TargetKey;

const buildNodeMeta = (nodes: WorkflowNode[]) => {
  const metaById = new Map<string, NodeMeta>();
  nodes.forEach((node) => {
    if (!isSupportedNodeType(node.type)) return;
    const definition = getNodeDefinition(node.type);
    if (!definition) return;
    const parameters = resolveNodeParameters(node);
    const ports = resolveNodePorts(node, parameters);
    const inputByKey = new Map(ports.inputs.map((port) => [port.key, port]));
    const outputByKey = new Map(ports.outputs.map((port) => [port.key, port]));
    const defaultOutputKey =
      definition.primaryOutputKey && outputByKey.has(definition.primaryOutputKey)
        ? definition.primaryOutputKey
        : ports.outputs[0]?.key;
    const defaultInputKey = ports.inputs[0]?.key;

    metaById.set(node.id, {
      node,
      definition,
      parameters,
      ports,
      inputByKey,
      outputByKey,
      defaultInputKey,
      defaultOutputKey,
    });
  });
  return metaById;
};

const resolveEdgePorts = (edge: WorkflowEdge, metaById: Map<string, NodeMeta>) => {
  const sourceMeta = metaById.get(edge.source);
  const targetMeta = metaById.get(edge.target);
  if (!sourceMeta || !targetMeta) return null;

  const sourcePortKey = edge.sourceHandle ?? sourceMeta.defaultOutputKey;
  const targetPortKey = edge.targetHandle ?? targetMeta.defaultInputKey;
  if (!sourcePortKey || !targetPortKey) return null;

  const sourcePort = resolvePortByKey(sourceMeta.ports.outputs, sourcePortKey);
  const targetPort = resolvePortByKey(targetMeta.ports.inputs, targetPortKey);
  if (!sourcePort || !targetPort) return null;
  if (!isPortTypeCompatible(sourcePort.type, targetPort.type)) return null;

  return {
    sourceMeta,
    targetMeta,
    sourcePort,
    targetPort,
    sourcePortKey,
    targetPortKey,
  };
};

const pruneEdges = (edges: WorkflowEdge[], metaById: Map<string, NodeMeta>) => {
  const result: WorkflowEdge[] = [];
  const indexByTarget = new Map<TargetKey, number>();

  edges.forEach((edge) => {
    if (edge.source === edge.target) return;
    const resolved = resolveEdgePorts(edge, metaById);
    if (!resolved) return;

    const {
      sourcePort,
      targetPort,
      sourcePortKey,
      targetPortKey,
    } = resolved;

    const normalized: WorkflowEdge = {
      ...edge,
      sourceHandle: sourcePortKey,
      targetHandle: targetPortKey,
    };

    if (targetPort.allowMultiple) {
      result.push(normalized);
      return;
    }

    const targetKey = makeTargetKey(edge.target, targetPortKey);
    const existingIndex = indexByTarget.get(targetKey);
    if (existingIndex == null) {
      indexByTarget.set(targetKey, result.length);
      result.push(normalized);
      return;
    }

    result[existingIndex] = normalized;
  });

  return result;
};

const buildEdgesByTarget = (edges: WorkflowEdge[]) => {
  const edgesByTarget = new Map<TargetKey, WorkflowEdge[]>();
  edges.forEach((edge) => {
    if (!edge.targetHandle) return;
    const key = makeTargetKey(edge.target, edge.targetHandle);
    const list = edgesByTarget.get(key);
    if (list) {
      list.push(edge);
    } else {
      edgesByTarget.set(key, [edge]);
    }
  });
  return edgesByTarget;
};

const collectInputValue = (
  port: WorkflowPortSpec,
  meta: NodeMeta,
  edgesByTarget: Map<TargetKey, WorkflowEdge[]>,
  evaluateOutput: (nodeId: string, outputKey: string) => WorkflowValue,
  metaById: Map<string, NodeMeta>
) => {
  const targetKey = makeTargetKey(meta.node.id, port.key);
  const incomingEdges = edgesByTarget.get(targetKey) ?? [];

  if (incomingEdges.length === 0) {
    if (port.parameterKey) {
      const parameterValue = meta.parameters[port.parameterKey] as WorkflowValue;
      if (parameterValue != null) {
        const coerced = coerceValueToPortType(parameterValue, port.type);
        return port.allowMultiple ? flattenWorkflowValue(coerced) : coerced;
      }
    }
    if (port.defaultValue !== undefined) {
      const coerced = coerceValueToPortType(port.defaultValue as WorkflowValue, port.type);
      return port.allowMultiple ? flattenWorkflowValue(coerced) : coerced;
    }
    return undefined;
  }

  const resolvedValues = incomingEdges.map((edge) => {
    const sourceMeta = metaById.get(edge.source);
    if (!sourceMeta) {
      throw new Error("Connected source node is missing.");
    }
    const outputKey = edge.sourceHandle ?? sourceMeta.defaultOutputKey;
    if (!outputKey) {
      throw new Error("Source node has no output port.");
    }
    const value = evaluateOutput(edge.source, outputKey);
    return coerceValueToPortType(value, port.type);
  });

  if (!port.allowMultiple) {
    return resolvedValues[resolvedValues.length - 1];
  }

  const flattened: Array<WorkflowPrimitive | null | undefined> = [];
  resolvedValues.forEach((value) => {
    flattened.push(...flattenWorkflowValue(value));
  });
  return flattened;
};

export const evaluateWorkflow = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  geometry: Geometry[]
): EngineResult => {
  const prunedNodes = nodes.filter((node) => isSupportedNodeType(node.type));
  const metaById = buildNodeMeta(prunedNodes);

  const prunedEdges = pruneEdges(edges, metaById);
  const edgesByTarget = buildEdgesByTarget(prunedEdges);
  const geometryMaps = buildGeometryMaps(geometry);

  const evaluationCache = new Map<string, EvaluatedNode>();
  const evaluationStack: string[] = [];

  const evaluateNode = (nodeId: string): EvaluatedNode => {
    const cached = evaluationCache.get(nodeId);
    if (cached) return cached;

    const meta = metaById.get(nodeId);
    if (!meta) {
      const missingResult: EvaluatedNode = {
        outputs: {},
        error: "Node definition is missing.",
      };
      evaluationCache.set(nodeId, missingResult);
      return missingResult;
    }

    if (evaluationStack.includes(nodeId)) {
      const cycle = [...evaluationStack, nodeId].join(" -> ");
      const cycleResult: EvaluatedNode = {
        outputs: {},
        error: `Cycle detected: ${cycle}`,
      };
      evaluationCache.set(nodeId, cycleResult);
      return cycleResult;
    }

    evaluationStack.push(nodeId);

    try {
      const inputs: Record<string, WorkflowValue> = {};
      meta.ports.inputs.forEach((port) => {
        inputs[port.key] = collectInputValue(
          port,
          meta,
          edgesByTarget,
          evaluateOutput,
          metaById
        );
      });

      const outputs = computeNodeOutputs(meta.definition, {
        inputs,
        parameters: meta.parameters,
        context: {
          nodeId,
          geometryById: geometryMaps.geometryById,
          vertexById: geometryMaps.vertexById,
        },
      });

      const evaluated: EvaluatedNode = {
        outputs,
        error: null,
      };
      evaluationCache.set(nodeId, evaluated);
      return evaluated;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Node evaluation failed.";
      const failed: EvaluatedNode = { outputs: {}, error: message };
      evaluationCache.set(nodeId, failed);
      return failed;
    } finally {
      evaluationStack.pop();
    }
  };

  const evaluateOutput = (nodeId: string, outputKey: string) => {
    const evaluated = evaluateNode(nodeId);
    if (evaluated.error) {
      throw new Error(evaluated.error);
    }
    if (outputKey in evaluated.outputs) {
      return evaluated.outputs[outputKey];
    }
    const availableKeys = Object.keys(evaluated.outputs);
    const hint =
      availableKeys.length > 0
        ? `Available outputs: ${availableKeys.join(", ")}.`
        : "No outputs are available.";
    throw new Error(`Output "${outputKey}" is missing on node "${nodeId}". ${hint}`);
  };

  prunedNodes.forEach((node) => {
    const meta = metaById.get(node.id);
    if (!meta) return;
    const evaluated = evaluateNode(node.id);
    if (!evaluated.error) {
      meta.ports.outputs.forEach((port) => {
        if (!(port.key in evaluated.outputs)) {
          evaluated.outputs[port.key] = undefined;
        }
      });
    }
  });

  const nextNodes = prunedNodes.map((node) => {
    const evaluated = evaluationCache.get(node.id);
    if (!evaluated) return node;
    const nextOutputs = evaluated.outputs;
    const nextError = evaluated.error;
    const nextData = {
      ...node.data,
      outputs: nextOutputs,
      evaluationError: nextError ?? undefined,
    };
    return { ...node, data: nextData };
  });

  return {
    nodes: nextNodes,
    edges: prunedEdges,
  };
};

export const pruneWorkflowToSupportedTypes = (nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
  const prunedNodes = nodes.filter((node) => isSupportedNodeType(node.type));
  const nodeIds = new Set(prunedNodes.map((node) => node.id));
  const prunedEdges = edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );
  return { nodes: prunedNodes, edges: prunedEdges };
};
