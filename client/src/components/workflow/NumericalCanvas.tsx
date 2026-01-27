import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { renderIconDataUrl, type IconId } from "../../webgl/ui/WebGLIconRenderer";
import WebGLButton from "../ui/WebGLButton";
import { isWorkflowNodeInvalid } from "./workflowValidation";
import {
  NODE_CATEGORY_BY_ID,
  PORT_TYPE_COLOR,
  getNodeDefinition,
  resolveNodeParameters,
  resolveNodePorts,
  type WorkflowPortSpec,
} from "./nodeCatalog";

type ViewTransform = {
  x: number;
  y: number;
  scale: number;
};

type Vec2 = { x: number; y: number };

type HitTarget =
  | { type: "none" }
  | { type: "node"; nodeId: string }
  | { type: "port"; nodeId: string; portKey: string; isOutput: boolean }
  | { type: "edge"; edgeId: string };

type ContextMenuState = {
  screen: Vec2;
  world: Vec2;
  target: HitTarget;
};

type ContextMenuAction = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
};

type DragState =
  | { type: "none" }
  | { type: "pan"; startPos: Vec2; startTransform: ViewTransform }
  | { type: "node"; nodeId: string; startPos: Vec2; nodeStartPos: Vec2 }
  | { type: "edge"; sourceNodeId: string; sourcePort: string; currentPos: Vec2 }
  | {
      type: "box";
      startScreen: Vec2;
      currentScreen: Vec2;
      startWorld: Vec2;
      currentWorld: Vec2;
      isAdditive: boolean;
    };

type NumericalCanvasProps = {
  width: number;
  height: number;
};

type CanvasPalette = {
  canvasBg: string;
  gridMinor: string;
  gridMajor: string;
  edge: string;
  edgeSoft: string;
  edgeHover: string;
  edgePreview: string;
  nodeFill: string;
  nodeFillHover: string;
  nodeStroke: string;
  nodeStrokeHover: string;
  nodeShadow: string;
  nodeErrorBorder: string;
  nodeErrorOverlay: string;
  nodeErrorFill: string;
  nodeWarningBorder: string;
  nodeWarningOverlay: string;
  nodeWarningFill: string;
  text: string;
  textMuted: string;
  portFill: string;
  portFillHover: string;
  portStroke: string;
};

const NODE_WIDTH = 198;
const NODE_MIN_HEIGHT = 108;
const NODE_BORDER_RADIUS = 10;
const NODE_BAND_HEIGHT = 18;
const NODE_SHADOW_OFFSET = 4;
const PORT_RADIUS = 6;
const PORT_ROW_HEIGHT = 18;
const PORTS_START_OFFSET = 72;
const PORTS_BOTTOM_PADDING = 18;
const ICON_SIZE = 26;
const ICON_PADDING = 10;
const EDGE_HIT_RADIUS = 6;
const EDGE_SAMPLE_COUNT = 24;
const MIN_SCALE = 0.05;
const MAX_SCALE = 8.0;
const ZOOM_SPEED = 0.0014;
const GRID_MINOR_BASE = 24;
const GRID_MAJOR_FACTOR = 5;

const readCssVar = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
};

const getPalette = (): CanvasPalette => {
  const bg = readCssVar("--roslyn-cream", "#f3f5f2");
  const surface = readCssVar("--roslyn-cream", "#f7f3ea");
  const surfaceMuted = readCssVar("--roslyn-cream", "#fbf8f2");
  const border = readCssVar("--ink-1000", "#0f0f0f");
  const text = readCssVar("--ink-1000", "#141414");
  const muted = readCssVar("--ink-700", "#4a4a4a");
  const edge = readCssVar("--ink-1000", "#1d1d1d");
  const edgeSoft = readCssVar("--ink-400", "rgba(0, 0, 0, 0.2)");
  const accent = readCssVar("--ink-1000", "#000000");
  const gridMinor = readCssVar("--canvas-grid-minor", "rgba(20, 20, 20, 0.08)");
  const gridMajor = readCssVar("--canvas-grid-major", "rgba(20, 20, 20, 0.18)");
  const portFill = readCssVar("--color-handle-dot-soft", "#0b7a80");
  const portFillHover = readCssVar("--color-handle-dot-strong", "#0f8b92");
  const portStroke = readCssVar("--ink-1000", "#0f0f0f");
  const nodeErrorBorder = readCssVar("--node-error-border", "#dc3545");
  const nodeErrorOverlay = readCssVar("--node-error-overlay", "rgba(128, 128, 128, 0.3)");
  const nodeErrorFill = readCssVar("--node-error-bg", "rgba(220, 53, 69, 0.15)");
  const nodeWarningBorder = readCssVar("--node-warning-border", "#d97706");
  const nodeWarningOverlay = readCssVar("--node-warning-overlay", "rgba(217, 119, 6, 0.18)");
  const nodeWarningFill = readCssVar("--node-warning-bg", "rgba(245, 158, 11, 0.12)");

  return {
    canvasBg: bg,
    gridMinor,
    gridMajor,
    edge,
    edgeSoft,
    edgeHover: accent,
    edgePreview: "rgba(20, 20, 20, 0.55)",
    nodeFill: surface,
    nodeFillHover: surfaceMuted,
    nodeStroke: border,
    nodeStrokeHover: accent,
    nodeShadow: "rgba(0, 0, 0, 0.32)",
    nodeErrorBorder,
    nodeErrorOverlay,
    nodeErrorFill,
    nodeWarningBorder,
    nodeWarningOverlay,
    nodeWarningFill,
    text,
    textMuted: muted,
    portFill,
    portFillHover,
    portStroke,
  };
};

const distanceToSegment = (point: Vec2, start: Vec2, end: Vec2) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq;
  const clamped = Math.min(1, Math.max(0, t));
  const projectedX = start.x + clamped * dx;
  const projectedY = start.y + clamped * dy;
  return Math.hypot(point.x - projectedX, point.y - projectedY);
};

const cubicBezierPoint = (t: number, p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2): Vec2 => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  const a = mt2 * mt;
  const b = 3 * mt2 * t;
  const c = 3 * mt * t2;
  const d = t * t2;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
};

type NodeDefinition = NonNullable<ReturnType<typeof getNodeDefinition>>;

type PortLayout = {
  port: WorkflowPortSpec;
  x: number;
  y: number;
  isOutput: boolean;
};

type NodeLayout = {
  nodeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  definition?: NodeDefinition;
  parameters: Record<string, unknown>;
  inputs: PortLayout[];
  outputs: PortLayout[];
  inputByKey: Map<string, PortLayout>;
  outputByKey: Map<string, PortLayout>;
  defaultInputKey?: string;
  defaultOutputKey?: string;
};

const ICON_DATA_URL_CACHE = new Map<string, string>();
const ICON_IMAGE_CACHE = new Map<string, HTMLImageElement>();
const ICON_RESOLUTION = 96;

const getIconImage = (iconId?: string) => {
  if (!iconId || typeof document === "undefined") return null;
  const cachedImage = ICON_IMAGE_CACHE.get(iconId);
  if (cachedImage) return cachedImage;
  const cachedUrl = ICON_DATA_URL_CACHE.get(iconId);
  const url = cachedUrl ?? renderIconDataUrl(iconId as Parameters<typeof renderIconDataUrl>[0], ICON_RESOLUTION);
  ICON_DATA_URL_CACHE.set(iconId, url);
  const image = new Image();
  image.src = url;
  ICON_IMAGE_CACHE.set(iconId, image);
  return image;
};

const resolvePortColor = (port: WorkflowPortSpec, fallback: string) =>
  PORT_TYPE_COLOR[port.type] ?? fallback;

const computeNodeLayout = (node: any): NodeLayout => {
  const definition = getNodeDefinition(node.type);
  const parameters = resolveNodeParameters(node);
  const ports = resolveNodePorts(node, parameters);
  const inputCount = ports.inputs.length;
  const outputCount = ports.outputs.length;
  const rowCount = Math.max(inputCount, outputCount, 1);
  const portsHeight = rowCount * PORT_ROW_HEIGHT;
  const height = Math.max(
    NODE_MIN_HEIGHT,
    PORTS_START_OFFSET + portsHeight + PORTS_BOTTOM_PADDING
  );
  const portsStartY = node.position.y + PORTS_START_OFFSET;

  const distributePorts = (portsList: WorkflowPortSpec[], isOutput: boolean) => {
    const offsetRows = (rowCount - portsList.length) / 2;
    return portsList.map<PortLayout>((port, index) => {
      const rowIndex = offsetRows + index;
      const y = portsStartY + rowIndex * PORT_ROW_HEIGHT + PORT_ROW_HEIGHT / 2;
      return {
        port,
        x: isOutput ? node.position.x + NODE_WIDTH : node.position.x,
        y,
        isOutput,
      };
    });
  };

  const inputs = distributePorts(ports.inputs, false);
  const outputs = distributePorts(ports.outputs, true);
  const inputByKey = new Map(inputs.map((layout) => [layout.port.key, layout]));
  const outputByKey = new Map(outputs.map((layout) => [layout.port.key, layout]));
  const defaultOutputKey =
    definition?.primaryOutputKey && outputByKey.has(definition.primaryOutputKey)
      ? definition.primaryOutputKey
      : outputs[0]?.port.key;
  const defaultInputKey = inputs[0]?.port.key;

  return {
    nodeId: node.id,
    x: node.position.x,
    y: node.position.y,
    width: NODE_WIDTH,
    height,
    definition,
    parameters,
    inputs,
    outputs,
    inputByKey,
    outputByKey,
    defaultInputKey,
    defaultOutputKey,
  };
};

const computeNodeLayouts = (nodes: any[]) => {
  const layouts = new Map<string, NodeLayout>();
  nodes.forEach((node) => {
    layouts.set(node.id, computeNodeLayout(node));
  });
  return layouts;
};

const buildConnectedInputSet = (edges: any[], layouts: Map<string, NodeLayout>) => {
  const connectedByNode = new Map<string, Set<string>>();
  edges.forEach((edge) => {
    const targetLayout = layouts.get(edge.target);
    const targetKey = edge.targetHandle ?? targetLayout?.defaultInputKey;
    if (!targetKey) return;
    const set = connectedByNode.get(edge.target);
    if (set) {
      set.add(targetKey);
      return;
    }
    connectedByNode.set(edge.target, new Set([targetKey]));
  });
  return connectedByNode;
};

const getMissingRequiredInputs = (
  layout: NodeLayout,
  connectedInputs: Set<string> | undefined
) => {
  const connected = connectedInputs ?? new Set<string>();
  return layout.inputs
    .filter((portLayout) => portLayout.port.required && !connected.has(portLayout.port.key))
    .map((portLayout) => portLayout.port.label);
};

const resolvePortLayout = (
  layout: NodeLayout | undefined,
  portKey: string | null | undefined,
  isOutput: boolean
) => {
  if (!layout) return null;
  const resolvedKey =
    portKey ?? (isOutput ? layout.defaultOutputKey : layout.defaultInputKey);
  if (!resolvedKey) return null;
  const map = isOutput ? layout.outputByKey : layout.inputByKey;
  return map.get(resolvedKey) ?? null;
};

const resolveEdgeEndpoints = (edge: any, layouts: Map<string, NodeLayout>) => {
  const sourceLayout = layouts.get(edge.source);
  const targetLayout = layouts.get(edge.target);
  if (!sourceLayout || !targetLayout) return null;
  const sourcePort = resolvePortLayout(sourceLayout, edge.sourceHandle, true);
  const targetPort = resolvePortLayout(targetLayout, edge.targetHandle, false);
  if (!sourcePort || !targetPort) return null;
  return { sourceLayout, targetLayout, sourcePort, targetPort };
};

export const NumericalCanvas = ({ width, height }: NumericalCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paletteRef = useRef<CanvasPalette>(getPalette());
  const layoutRef = useRef<Map<string, NodeLayout>>(new Map());
  const [viewTransform, setViewTransform] = useState<ViewTransform>({
    x: width / 2,
    y: height / 2,
    scale: 1.0,
  });
  const [dragState, setDragState] = useState<DragState>({ type: "none" });
  const [hoveredTarget, setHoveredTarget] = useState<HitTarget>({ type: "none" });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const nodes = useProjectStore((state) => state.workflow.nodes);
  const edges = useProjectStore((state) => state.workflow.edges);
  const geometry = useProjectStore((state) => state.geometry);
  const selectedGeometryIds = useProjectStore((state) => state.selectedGeometryIds);
  const onNodesChange = useProjectStore((state) => state.onNodesChange);
  const onEdgesChange = useProjectStore((state) => state.onEdgesChange);
  const onConnect = useProjectStore((state) => state.onConnect);
  const deleteSelectedNodes = useProjectStore((state) => state.deleteSelectedNodes);
  const addGeometryReferenceNode = useProjectStore((state) => state.addGeometryReferenceNode);
  const syncWorkflowGeometryToRoslyn = useProjectStore((state) => state.syncWorkflowGeometryToRoslyn);
  const setSelectedGeometryIds = useProjectStore((state) => state.setSelectedGeometryIds);
  const updateNodeData = useProjectStore((state) => state.updateNodeData);

  useEffect(() => {
    paletteRef.current = getPalette();
    const observer = new MutationObserver(() => {
      paletteRef.current = getPalette();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preventWheelScroll = (event: WheelEvent) => {
      event.preventDefault();
    };
    canvas.addEventListener("wheel", preventWheelScroll, { passive: false });
    return () => canvas.removeEventListener("wheel", preventWheelScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Backspace" && event.key !== "Delete") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const hasSelectedNodes = nodes.some((node) => node.selected);
      if (hasSelectedNodes) {
        event.preventDefault();
        deleteSelectedNodes();
        return;
      }
      const selectedEdges = edges.filter((edge) => edge.selected).map((edge) => edge.id);
      if (selectedEdges.length === 0) return;
      event.preventDefault();
      onEdgesChange(selectedEdges.map((id) => ({ id, type: "remove" as const })));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelectedNodes, edges, nodes, onEdgesChange]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const palette = paletteRef.current;
      const layouts = computeNodeLayouts(nodes);
      layoutRef.current = layouts;
      const connectedInputs = buildConnectedInputSet(edges, layouts);

      ctx.save();
      ctx.translate(viewTransform.x, viewTransform.y);
      ctx.scale(viewTransform.scale, viewTransform.scale);

      drawBackground(ctx, width, height, viewTransform, palette);
      drawConnections(ctx, edges, layouts, hoveredTarget, palette, viewTransform);
      drawNodes(ctx, nodes, edges, layouts, connectedInputs, geometry, hoveredTarget, palette);

      if (dragState.type === "edge") {
        drawEdgePreview(ctx, dragState, layouts, palette, viewTransform);
      }

      ctx.restore();

      if (dragState.type === "box") {
        drawSelectionBox(ctx, dragState, palette);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [width, height, viewTransform, nodes, edges, hoveredTarget, dragState]);

  const screenToWorld = (screenX: number, screenY: number): Vec2 => {
    return {
      x: (screenX - viewTransform.x) / viewTransform.scale,
      y: (screenY - viewTransform.y) / viewTransform.scale,
    };
  };

  const clearNodeSelection = () => {
    const changes = nodes
      .filter((node) => node.selected)
      .map((node) => ({ id: node.id, type: "select" as const, selected: false }));
    if (changes.length > 0) {
      onNodesChange(changes);
    }
  };

  const clearEdgeSelection = () => {
    const changes = edges
      .filter((edge) => edge.selected)
      .map((edge) => ({ id: edge.id, type: "select" as const, selected: false }));
    if (changes.length > 0) {
      onEdgesChange(changes);
    }
  };

  const clearSelection = () => {
    clearNodeSelection();
    clearEdgeSelection();
  };

  const applyNodeSelection = (selectedIds: Set<string>, isAdditive: boolean) => {
    const nextSelectedIds = new Set<string>();
    if (isAdditive) {
      nodes.forEach((node) => {
        if (node.selected) nextSelectedIds.add(node.id);
      });
    }
    selectedIds.forEach((id) => nextSelectedIds.add(id));
    const changes = nodes.flatMap((node) => {
      const nextSelected = nextSelectedIds.has(node.id);
      if (Boolean(node.selected) === nextSelected) return [];
      return [{ id: node.id, type: "select" as const, selected: nextSelected }];
    });
    if (changes.length > 0) {
      onNodesChange(changes);
    }
    if (!isAdditive || selectedIds.size > 0) {
      clearEdgeSelection();
    }
  };

  const setNodeSelection = (nodeId: string, isMultiSelect: boolean) => {
    const changes = nodes.flatMap((node) => {
      const isTarget = node.id === nodeId;
      const nextSelected = isTarget
        ? isMultiSelect
          ? !node.selected
          : true
        : isMultiSelect
          ? Boolean(node.selected)
          : false;
      if (Boolean(node.selected) === nextSelected) return [];
      return [{ id: node.id, type: "select" as const, selected: nextSelected }];
    });
    if (changes.length > 0) {
      onNodesChange(changes);
    }
    clearEdgeSelection();
  };

  const setEdgeSelection = (edgeId: string, isMultiSelect: boolean) => {
    const changes = edges.flatMap((edge) => {
      const isTarget = edge.id === edgeId;
      const nextSelected = isTarget
        ? isMultiSelect
          ? !edge.selected
          : true
        : isMultiSelect
          ? Boolean(edge.selected)
          : false;
      if (Boolean(edge.selected) === nextSelected) return [];
      return [{ id: edge.id, type: "select" as const, selected: nextSelected }];
    });
    if (changes.length > 0) {
      onEdgesChange(changes);
    }
    clearNodeSelection();
  };

  const getLayouts = () => {
    if (layoutRef.current.size > 0) return layoutRef.current;
    const computed = computeNodeLayouts(nodes);
    layoutRef.current = computed;
    return computed;
  };

  const selectedGeometryId =
    selectedGeometryIds[selectedGeometryIds.length - 1] ?? null;
  const selectedGeometry = selectedGeometryId
    ? geometry.find((item) => item.id === selectedGeometryId) ?? null
    : null;
  const selectedGeometryType = selectedGeometry?.type;

  const removeEdgesByIds = (edgeIds: string[]) => {
    if (edgeIds.length === 0) return;
    onEdgesChange(edgeIds.map((id) => ({ id, type: "remove" as const })));
  };

  const resolveEdgePortKey = (edge: any, nodeId: string, isOutput: boolean) => {
    const layouts = getLayouts();
    const layout = layouts.get(nodeId);
    const fallback = isOutput ? layout?.defaultOutputKey : layout?.defaultInputKey;
    const handle = isOutput ? edge.sourceHandle : edge.targetHandle;
    return handle ?? fallback ?? null;
  };

  const getEdgesForPort = (nodeId: string, portKey: string, isOutput: boolean) =>
    edges.filter((edge) => {
      if (isOutput && edge.source !== nodeId) return false;
      if (!isOutput && edge.target !== nodeId) return false;
      const resolvedKey = resolveEdgePortKey(edge, nodeId, isOutput);
      return resolvedKey === portKey;
    });

  const findGeometryReferenceNode = (geometryId: string) =>
    useProjectStore
      .getState()
      .workflow.nodes.find(
        (node) => node.type === "geometryReference" && node.data?.geometryId === geometryId
      ) ?? null;

  const positionNodeAt = (nodeId: string, position: Vec2) => {
    onNodesChange([
      {
        id: nodeId,
        type: "position",
        position,
      },
    ]);
  };

  const ensureGeometryReferenceAt = (geometryId: string, world: Vec2) => {
    const existing = findGeometryReferenceNode(geometryId);
    if (existing) {
      return existing;
    }
    const beforeIds = new Set(useProjectStore.getState().workflow.nodes.map((node) => node.id));
    addGeometryReferenceNode(geometryId);
    const afterNodes = useProjectStore.getState().workflow.nodes;
    const created = afterNodes.find(
      (node) => node.type === "geometryReference" && !beforeIds.has(node.id)
    );
    if (!created) return null;
    const position = {
      x: world.x - NODE_WIDTH - 56,
      y: world.y - NODE_MIN_HEIGHT * 0.5,
    };
    positionNodeAt(created.id, position);
    return created;
  };

  const getNodeContext = (nodeId: string) => {
    const node =
      useProjectStore.getState().workflow.nodes.find((entry) => entry.id === nodeId) ?? null;
    if (!node?.type) return null;
    const parameters = resolveNodeParameters(node);
    const ports = resolveNodePorts(node, parameters);
    const definition = getNodeDefinition(node.type);
    return { node, parameters, ports, definition };
  };

  const getGeometryOutputKey = (nodeId: string) => {
    const context = getNodeContext(nodeId);
    if (!context) return null;
    const primary = context.definition?.primaryOutputKey;
    if (
      primary &&
      context.ports.outputs.some((port) => port.key === primary && port.type === "geometry")
    ) {
      return primary;
    }
    return context.ports.outputs.find((port) => port.type === "geometry")?.key ?? null;
  };

  const getFirstGeometryInputKey = (nodeId: string) => {
    const context = getNodeContext(nodeId);
    if (!context) return null;
    return context.ports.inputs.find((port) => port.type === "geometry")?.key ?? null;
  };

  const getPortSpec = (nodeId: string, portKey: string, isOutput: boolean) => {
    const context = getNodeContext(nodeId);
    if (!context) return null;
    const ports = isOutput ? context.ports.outputs : context.ports.inputs;
    return ports.find((port) => port.key === portKey) ?? null;
  };

  const connectReferenceToPort = (
    geometryId: string,
    world: Vec2,
    targetNodeId: string,
    targetPortKey: string
  ) => {
    const referenceNode = ensureGeometryReferenceAt(geometryId, world);
    if (!referenceNode) return;
    const sourcePortKey = getGeometryOutputKey(referenceNode.id);
    if (!sourcePortKey) return;
    onConnect({
      source: referenceNode.id,
      sourceHandle: sourcePortKey,
      target: targetNodeId,
      targetHandle: targetPortKey,
    });
  };

  const ontologizeNode = (nodeId: string) => {
    syncWorkflowGeometryToRoslyn(nodeId);
    const refreshed = useProjectStore
      .getState()
      .workflow.nodes.find((entry) => entry.id === nodeId);
    if (!refreshed) return;
    const geometryKey = getGeometryOutputKey(nodeId);
    const outputValue =
      geometryKey && refreshed.data?.outputs ? refreshed.data.outputs[geometryKey] : null;
    if (typeof outputValue === "string") {
      const exists = useProjectStore.getState().geometry.some((item) => item.id === outputValue);
      if (exists) {
        setSelectedGeometryIds([outputValue]);
      }
      return;
    }
    if (typeof refreshed.data?.geometryId === "string") {
      const exists = useProjectStore
        .getState()
        .geometry.some((item) => item.id === refreshed.data?.geometryId);
      if (exists) {
        setSelectedGeometryIds([refreshed.data.geometryId]);
      }
    }
  };

  const contextMenuActions = useMemo<ContextMenuAction[]>(() => {
    if (!contextMenu) return [];
    const actions: ContextMenuAction[] = [];
    const closeMenu = (action: () => void) => () => {
      action();
      setContextMenu(null);
    };
    const geometryLabel = selectedGeometryId
      ? `Reference Selected Geometry (${selectedGeometryId})`
      : "Reference Selected Geometry";

    if (contextMenu.target.type === "edge") {
      const target = contextMenu.target;
      actions.push({
        label: "Disconnect Wire",
        onSelect: closeMenu(() => removeEdgesByIds([target.edgeId])),
        danger: true,
      });
      return actions;
    }

    if (contextMenu.target.type === "port") {
      const target = contextMenu.target;
      const world = contextMenu.world;
      const portEdges = getEdgesForPort(
        target.nodeId,
        target.portKey,
        target.isOutput
      );
      if (portEdges.length > 0) {
        actions.push({
          label: "Disconnect Wire",
          onSelect: closeMenu(() => removeEdgesByIds(portEdges.map((edge) => edge.id))),
          danger: true,
        });
      }
      const port = getPortSpec(target.nodeId, target.portKey, target.isOutput);
      if (!target.isOutput && port?.type === "geometry") {
        actions.push({
          label: geometryLabel,
          disabled: !selectedGeometryId,
          onSelect: closeMenu(() => {
            if (!selectedGeometryId) return;
            connectReferenceToPort(
              selectedGeometryId,
              world,
              target.nodeId,
              target.portKey
            );
          }),
        });
      }
      return actions;
    }

    if (contextMenu.target.type === "node") {
      const target = contextMenu.target;
      const world = contextMenu.world;
      const geometryOutputKey = getGeometryOutputKey(target.nodeId);
      if (geometryOutputKey) {
        actions.push({
          label: "Ontologize to Roslyn",
          onSelect: closeMenu(() => ontologizeNode(target.nodeId)),
        });
      }

      const geometryInputKey = getFirstGeometryInputKey(target.nodeId);
      const node = nodes.find((entry) => entry.id === target.nodeId);
      const isGeometryReference = node?.type === "geometryReference";

      if (isGeometryReference) {
        actions.push({
          label: geometryLabel,
          disabled: !selectedGeometryId,
          onSelect: closeMenu(() => {
            if (!selectedGeometryId) return;
            updateNodeData(target.nodeId, {
              geometryId: selectedGeometryId,
              geometryType: selectedGeometryType,
              isLinked: true,
              label: selectedGeometryId,
            });
          }),
        });
      } else if (geometryInputKey) {
        actions.push({
          label: geometryLabel,
          disabled: !selectedGeometryId,
          onSelect: closeMenu(() => {
            if (!selectedGeometryId) return;
            connectReferenceToPort(
              selectedGeometryId,
              world,
              target.nodeId,
              geometryInputKey
            );
          }),
        });
      } else {
        actions.push({
          label: geometryLabel,
          disabled: !selectedGeometryId,
          onSelect: closeMenu(() => {
            if (!selectedGeometryId) return;
            ensureGeometryReferenceAt(selectedGeometryId, world);
          }),
        });
      }
      return actions;
    }

    const world = contextMenu.world;
    actions.push({
      label: geometryLabel,
      disabled: !selectedGeometryId,
      onSelect: closeMenu(() => {
        if (!selectedGeometryId) return;
        ensureGeometryReferenceAt(selectedGeometryId, world);
      }),
    });
    return actions;
  }, [
    contextMenu,
    nodes,
    edges,
    selectedGeometryId,
    selectedGeometryType,
    updateNodeData,
  ]);

  const contextMenuButtonStyle = useMemo(() => {
    const style = {
      width: "100%",
      justifyContent: "flex-start",
      textAlign: "left",
    } as CSSProperties;
    const vars = style as Record<string, string>;
    vars["--webgl-button-padding-x"] = "12px";
    vars["--webgl-button-padding-y"] = "6px";
    vars["--webgl-button-min-height"] = "36px";
    vars["--webgl-button-icon-size"] = "18px";
    vars["--webgl-button-gap"] = "8px";
    vars["--webgl-button-font-size"] = "12px";
    return style;
  }, []);

  const resolveContextMenuIconId = (action: ContextMenuAction): IconId => {
    const label = action.label.toLowerCase();
    if (label.includes("disconnect")) return "delete";
    if (label.includes("reference")) return "geometryReference";
    if (label.includes("ontologize")) return "brandRoslyn";
    return "advanced";
  };

  const resolveContextMenuShortLabel = (action: ContextMenuAction) => {
    const label = action.label;
    if (label.startsWith("Reference Selected Geometry")) {
      if (!selectedGeometryId) return "Reference";
      const shortId = selectedGeometryId.slice(0, 6);
      return `Ref ${shortId}`;
    }
    if (label.startsWith("Disconnect")) return "Disconnect";
    if (label.startsWith("Ontologize")) return "Ontologize";
    return label;
  };

  const findEdgeHit = (
    point: Vec2,
    layouts: Map<string, NodeLayout>
  ): HitTarget | null => {
    if (edges.length === 0) return null;
    let closestEdgeId: string | null = null;
    let closestDistance = EDGE_HIT_RADIUS;

    edges.forEach((edge) => {
      const endpoints = resolveEdgeEndpoints(edge, layouts);
      if (!endpoints) return;

      const sourceX = endpoints.sourcePort.x;
      const sourceY = endpoints.sourcePort.y;
      const targetX = endpoints.targetPort.x;
      const targetY = endpoints.targetPort.y;
      const dx = targetX - sourceX;
      const controlOffset = Math.abs(dx) * 0.5;

      const p0 = { x: sourceX, y: sourceY };
      const p1 = { x: sourceX + controlOffset, y: sourceY };
      const p2 = { x: targetX - controlOffset, y: targetY };
      const p3 = { x: targetX, y: targetY };

      let previous = p0;
      let minDistance = Infinity;
      for (let i = 1; i <= EDGE_SAMPLE_COUNT; i += 1) {
        const t = i / EDGE_SAMPLE_COUNT;
        const next = cubicBezierPoint(t, p0, p1, p2, p3);
        const distance = distanceToSegment(point, previous, next);
        if (distance < minDistance) {
          minDistance = distance;
        }
        previous = next;
      }

      if (minDistance < closestDistance) {
        closestDistance = minDistance;
        closestEdgeId = edge.id;
      }
    });

    return closestEdgeId ? { type: "edge", edgeId: closestEdgeId } : null;
  };

  const hitTest = (worldX: number, worldY: number): HitTarget => {
    const layouts = getLayouts();
    const portHitRadius = PORT_RADIUS * 2;

    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      const node = nodes[i];
      const layout = layouts.get(node.id) ?? computeNodeLayout(node);
      if (!layouts.has(node.id)) {
        layouts.set(node.id, layout);
      }

      for (const portLayout of layout.outputs) {
        const distance = Math.hypot(worldX - portLayout.x, worldY - portLayout.y);
        if (distance < portHitRadius) {
          return {
            type: "port",
            nodeId: node.id,
            portKey: portLayout.port.key,
            isOutput: true,
          };
        }
      }

      for (const portLayout of layout.inputs) {
        const distance = Math.hypot(worldX - portLayout.x, worldY - portLayout.y);
        if (distance < portHitRadius) {
          return {
            type: "port",
            nodeId: node.id,
            portKey: portLayout.port.key,
            isOutput: false,
          };
        }
      }

      const withinNode =
        worldX >= layout.x &&
        worldX <= layout.x + layout.width &&
        worldY >= layout.y &&
        worldY <= layout.y + layout.height;
      if (withinNode) {
        return { type: "node", nodeId: node.id };
      }
    }

    const edgeHit = findEdgeHit({ x: worldX, y: worldY }, layouts);
    if (edgeHit) return edgeHit;
    return { type: "none" };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);
    const target = hitTest(world.x, world.y);
    const isMultiSelect = e.metaKey || e.ctrlKey;

    if (e.button !== 2 && contextMenu) {
      setContextMenu(null);
    }

    if (e.button !== 2) {
      try {
        if (!canvas.hasPointerCapture(e.pointerId)) {
          canvas.setPointerCapture(e.pointerId);
        }
      } catch {
        // Pointer capture is best-effort; keep interactions working without it.
      }
    }

    if (e.button === 2) {
      e.preventDefault();
      return;
    }

    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setDragState({
        type: "pan",
        startPos: { x: screenX, y: screenY },
        startTransform: { ...viewTransform },
      });
      e.preventDefault();
      return;
    }

    if (target.type === "edge" && e.button === 0) {
      setEdgeSelection(target.edgeId, isMultiSelect);
      e.preventDefault();
      return;
    }

    if (target.type === "port" && target.isOutput) {
      setDragState({
        type: "edge",
        sourceNodeId: target.nodeId,
        sourcePort: target.portKey,
        currentPos: world,
      });
      e.preventDefault();
      return;
    }

    if (target.type === "node") {
      const node = nodes.find((n) => n.id === target.nodeId);
      if (node) {
        if (e.button === 0) {
          setNodeSelection(target.nodeId, isMultiSelect);
        }
        setDragState({
          type: "node",
          nodeId: target.nodeId,
          startPos: { x: screenX, y: screenY },
          nodeStartPos: { x: node.position.x, y: node.position.y },
        });
        e.preventDefault();
      }
      return;
    }

    if (target.type === "none" && e.button === 0) {
      setDragState({
        type: "box",
        startScreen: { x: screenX, y: screenY },
        currentScreen: { x: screenX, y: screenY },
        startWorld: world,
        currentWorld: world,
        isAdditive: isMultiSelect,
      });
      setHoveredTarget({ type: "none" });
      e.preventDefault();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);

    if (dragState.type === "pan") {
      const dx = screenX - dragState.startPos.x;
      const dy = screenY - dragState.startPos.y;
      setViewTransform({
        x: dragState.startTransform.x + dx,
        y: dragState.startTransform.y + dy,
        scale: dragState.startTransform.scale,
      });
      return;
    }

    if (dragState.type === "node") {
      const dx = (screenX - dragState.startPos.x) / viewTransform.scale;
      const dy = (screenY - dragState.startPos.y) / viewTransform.scale;
      const newX = dragState.nodeStartPos.x + dx;
      const newY = dragState.nodeStartPos.y + dy;

      onNodesChange([
        {
          id: dragState.nodeId,
          type: "position",
          position: { x: newX, y: newY },
        },
      ]);
      return;
    }

    if (dragState.type === "edge") {
      setDragState({ ...dragState, currentPos: world });
      return;
    }

    if (dragState.type === "box") {
      setDragState({
        ...dragState,
        currentScreen: { x: screenX, y: screenY },
        currentWorld: world,
      });
      return;
    }

    const target = hitTest(world.x, world.y);
    setHoveredTarget(target);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore capture release failures.
    }

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);

    if (dragState.type === "edge") {
      const target = hitTest(world.x, world.y);
      if (target.type === "port" && !target.isOutput) {
        onConnect({
          source: dragState.sourceNodeId,
          sourceHandle: dragState.sourcePort,
          target: target.nodeId,
          targetHandle: target.portKey,
        });
      }
    }

    if (dragState.type === "box") {
      const dx = dragState.currentScreen.x - dragState.startScreen.x;
      const dy = dragState.currentScreen.y - dragState.startScreen.y;
      const distance = Math.hypot(dx, dy);
      const selection = new Set<string>();
      if (distance < 4) {
        if (!dragState.isAdditive) {
          clearSelection();
        }
      } else {
        const minX = Math.min(dragState.startWorld.x, dragState.currentWorld.x);
        const maxX = Math.max(dragState.startWorld.x, dragState.currentWorld.x);
        const minY = Math.min(dragState.startWorld.y, dragState.currentWorld.y);
        const maxY = Math.max(dragState.startWorld.y, dragState.currentWorld.y);
        const layouts = getLayouts();
        nodes.forEach((node) => {
          const layout = layouts.get(node.id) ?? computeNodeLayout(node);
          if (!layouts.has(node.id)) {
            layouts.set(node.id, layout);
          }
          const nodeMinX = layout.x;
          const nodeMaxX = layout.x + layout.width;
          const nodeMinY = layout.y;
          const nodeMaxY = layout.y + layout.height;
          const intersects =
            nodeMaxX >= minX && nodeMinX <= maxX && nodeMaxY >= minY && nodeMinY <= maxY;
          if (intersects) {
            selection.add(node.id);
          }
        });
        if (selection.size > 0 || !dragState.isAdditive) {
          applyNodeSelection(selection, dragState.isAdditive);
        }
      }
    }

    setDragState({ type: "none" });
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (contextMenu) {
      setContextMenu(null);
    }

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const worldBefore = screenToWorld(screenX, screenY);

    const delta = -e.deltaY * ZOOM_SPEED;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, viewTransform.scale * (1 + delta)));

    const worldAfter = {
      x: (screenX - viewTransform.x) / newScale,
      y: (screenY - viewTransform.y) / newScale,
    };

    const offsetX = (worldAfter.x - worldBefore.x) * newScale;
    const offsetY = (worldAfter.y - worldBefore.y) * newScale;

    setViewTransform({
      x: viewTransform.x + offsetX,
      y: viewTransform.y + offsetY,
      scale: newScale,
    });

    e.preventDefault();
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    event.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);
    const target = hitTest(world.x, world.y);

    if (target.type === "edge") {
      setEdgeSelection(target.edgeId, false);
    } else if (target.type === "node") {
      setNodeSelection(target.nodeId, false);
    } else if (target.type === "port") {
      setNodeSelection(target.nodeId, false);
    } else {
      clearSelection();
    }

    setHoveredTarget(target);
    setContextMenu({
      screen: { x: screenX, y: screenY },
      world,
      target,
    });
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
      }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          background: "var(--color-bg)",
          cursor:
            dragState.type === "pan"
              ? "grabbing"
              : dragState.type === "node"
                ? "move"
                : hoveredTarget.type === "node"
                  ? "grab"
                  : hoveredTarget.type === "edge"
                    ? "pointer"
                  : hoveredTarget.type === "port"
                    ? "crosshair"
                    : "default",
          touchAction: "none",
        }}
      />
      {contextMenu && contextMenuActions.length > 0 ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            left: `${contextMenu.screen.x}px`,
            top: `${contextMenu.screen.y}px`,
            minWidth: "196px",
            padding: "6px",
            borderRadius: "10px",
            border: "1px solid rgba(0, 0, 0, 0.2)",
            background: "var(--roslyn-cream, #f7f3ea)",
            boxShadow: "2px 6px 16px rgba(0, 0, 0, 0.28)",
            zIndex: 5,
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {contextMenuActions.map((action) => {
            const isDanger = Boolean(action.danger);
            return (
              <WebGLButton
                key={action.label}
                type="button"
                role="menuitem"
                disabled={action.disabled}
                onClick={action.onSelect}
                label={action.label}
                shortLabel={resolveContextMenuShortLabel(action)}
                iconId={resolveContextMenuIconId(action)}
                variant={isDanger ? "primary" : "command"}
                accentColor={isDanger ? "#ef4444" : undefined}
                shape="rounded"
                size="sm"
                style={contextMenuButtonStyle}
                tooltip={action.label}
                tooltipPosition="right"
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  transform: ViewTransform,
  palette: CanvasPalette
) {
  const zoom = transform.scale;
  let minorStep = GRID_MINOR_BASE;
  if (zoom > 2.5) minorStep = 18;
  else if (zoom < 0.7) minorStep = 32;
  const majorStep = minorStep * GRID_MAJOR_FACTOR;

  const worldLeft = -transform.x / transform.scale;
  const worldTop = -transform.y / transform.scale;
  const worldRight = worldLeft + width / transform.scale;
  const worldBottom = worldTop + height / transform.scale;

  ctx.fillStyle = palette.canvasBg;
  ctx.fillRect(
    worldLeft - majorStep,
    worldTop - majorStep,
    worldRight - worldLeft + majorStep * 2,
    worldBottom - worldTop + majorStep * 2
  );

  const drawGrid = (step: number, color: string, lineWidthPx: number) => {
    const startX = Math.floor(worldLeft / step) * step;
    const startY = Math.floor(worldTop / step) * step;
    const endX = worldRight + step;
    const endY = worldBottom + step;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidthPx / transform.scale;

    const path = new Path2D();
    for (let x = startX; x < endX; x += step) {
      path.moveTo(x, startY);
      path.lineTo(x, endY);
    }
    for (let y = startY; y < endY; y += step) {
      path.moveTo(startX, y);
      path.lineTo(endX, y);
    }
    ctx.stroke(path);
  };

  drawGrid(minorStep, palette.gridMinor, 1);
  drawGrid(majorStep, palette.gridMajor, 1.5);
}

function drawConnections(
  ctx: CanvasRenderingContext2D,
  edges: any[],
  layouts: Map<string, NodeLayout>,
  hoveredTarget: HitTarget,
  palette: CanvasPalette,
  transform: ViewTransform
) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  edges.forEach((edge) => {
    const endpoints = resolveEdgeEndpoints(edge, layouts);
    if (!endpoints) return;

    const sourceX = endpoints.sourcePort.x;
    const sourceY = endpoints.sourcePort.y;
    const targetX = endpoints.targetPort.x;
    const targetY = endpoints.targetPort.y;

    const dx = targetX - sourceX;
    const controlOffset = Math.abs(dx) * 0.5;

    const isHovered = hoveredTarget.type === "edge" && hoveredTarget.edgeId === edge.id;
    const isSelected = Boolean(edge.selected);
    const isActive = isHovered || isSelected;
    const portColor = resolvePortColor(endpoints.sourcePort.port, palette.edge);
    const baseColor = isActive ? palette.edgeHover : portColor;
    const baseWidth =
      endpoints.sourcePort.port.type === "geometry"
        ? 2.6
        : endpoints.sourcePort.port.type === "vector"
          ? 2.4
          : 2.1;
    const lineWidth = (isActive ? baseWidth + 0.7 : baseWidth) / transform.scale;
    const haloWidth = lineWidth + 2.1 / transform.scale;

    const path = new Path2D();
    path.moveTo(sourceX, sourceY);
    path.bezierCurveTo(
      sourceX + controlOffset,
      sourceY,
      targetX - controlOffset,
      targetY,
      targetX,
      targetY
    );

    ctx.save();
    ctx.strokeStyle = portColor;
    ctx.globalAlpha = isActive ? 0.38 : 0.22;
    ctx.lineWidth = haloWidth;
    ctx.stroke(path);
    ctx.restore();

    ctx.strokeStyle = baseColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke(path);
  });
}

function drawEdgePreview(
  ctx: CanvasRenderingContext2D,
  dragState: Extract<DragState, { type: "edge" }>,
  layouts: Map<string, NodeLayout>,
  palette: CanvasPalette,
  transform: ViewTransform
) {
  const sourceLayout = layouts.get(dragState.sourceNodeId);
  const sourcePort = resolvePortLayout(sourceLayout, dragState.sourcePort, true);
  if (!sourcePort) return;

  const sourceX = sourcePort.x;
  const sourceY = sourcePort.y;
  const targetX = dragState.currentPos.x;
  const targetY = dragState.currentPos.y;

  const dx = targetX - sourceX;
  const controlOffset = Math.abs(dx) * 0.5;
  const portColor = resolvePortColor(sourcePort.port, palette.edge);
  const baseWidth =
    sourcePort.port.type === "geometry"
      ? 2.6
      : sourcePort.port.type === "vector"
        ? 2.4
        : 2.1;
  const lineWidth = (baseWidth + 0.4) / transform.scale;
  const haloWidth = lineWidth + 1.6 / transform.scale;
  const dash = [6 / transform.scale, 6 / transform.scale];

  ctx.save();
  ctx.strokeStyle = portColor;
  ctx.globalAlpha = 0.24;
  ctx.lineWidth = haloWidth;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(sourceX, sourceY);
  ctx.bezierCurveTo(
    sourceX + controlOffset,
    sourceY,
    targetX - controlOffset,
    targetY,
    targetX,
    targetY
  );
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = portColor;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(sourceX, sourceY);
  ctx.bezierCurveTo(
    sourceX + controlOffset,
    sourceY,
    targetX - controlOffset,
    targetY,
    targetX,
    targetY
  );
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawNodes(
  ctx: CanvasRenderingContext2D,
  nodes: any[],
  edges: any[],
  layouts: Map<string, NodeLayout>,
  connectedInputsByNode: Map<string, Set<string>>,
  geometry: any[],
  hoveredTarget: HitTarget,
  palette: CanvasPalette
) {
  const formatNumber = (value: number, decimals = 1) => {
    const rounded = Number(value.toFixed(decimals));
    return Number.isInteger(rounded) ? String(Math.trunc(rounded)) : String(rounded);
  };

  const formatValue = (value: unknown): string => {
    if (value == null) return "—";
    if (typeof value === "number") return formatNumber(value, Math.abs(value) < 10 ? 3 : 2);
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      if (value.length === 0) return "[]";
      const preview = value.slice(0, 3).map((entry) => formatValue(entry)).join(", ");
      return value.length > 3 ? `[${preview}, …]` : `[${preview}]`;
    }
    const maybeVec = value as { x?: unknown; y?: unknown; z?: unknown };
    if (
      typeof maybeVec.x === "number" &&
      typeof maybeVec.y === "number" &&
      typeof maybeVec.z === "number"
    ) {
      return `(${formatNumber(maybeVec.x, 2)}, ${formatNumber(maybeVec.y, 2)}, ${formatNumber(
        maybeVec.z,
        2
      )})`;
    }
    return String(value);
  };

  const truncateToWidth = (text: string, maxWidth: number) => {
    if (!text) return "";
    if (ctx.measureText(text).width <= maxWidth) return text;
    const ellipsis = "…";
    let trimmed = text;
    while (trimmed.length > 1 && ctx.measureText(trimmed + ellipsis).width > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    return trimmed.length > 1 ? `${trimmed}${ellipsis}` : ellipsis;
  };

  nodes.forEach((node) => {
    const layout = layouts.get(node.id) ?? computeNodeLayout(node);
    if (!layouts.has(node.id)) {
      layouts.set(node.id, layout);
    }

    const x = layout.x;
    const y = layout.y;
    const height = layout.height;

    const isHovered = hoveredTarget.type === "node" && hoveredTarget.nodeId === node.id;
    const isInvalid = isWorkflowNodeInvalid(node.type, node.data, geometry);
    const missingRequiredInputs = getMissingRequiredInputs(
      layout,
      connectedInputsByNode.get(node.id)
    );
    const showWarning = missingRequiredInputs.length > 0 && !isInvalid;
    const definition = layout.definition ?? getNodeDefinition(node.type);
    const category = definition ? NODE_CATEGORY_BY_ID.get(definition.category) : undefined;
    const categoryBand = category?.band ?? "#ece8e2";
    const categoryAccent = category?.accent ?? palette.nodeStroke;
    const fallbackPortColor = category?.port ?? palette.portFill;
    const label = node.data?.label ?? definition?.label ?? node.type ?? "Node";
    const iconSpace = definition?.iconId ? ICON_SIZE + ICON_PADDING + 4 : 0;
    const labelMaxWidth = NODE_WIDTH - 24 - iconSpace;
    const detailMaxWidth = NODE_WIDTH - 24;

    // Draw a crisp offset shadow to help the nodes read as buttons.
    ctx.save();
    ctx.fillStyle = palette.nodeShadow;
    ctx.beginPath();
    ctx.roundRect(x, y + NODE_SHADOW_OFFSET, NODE_WIDTH, height, NODE_BORDER_RADIUS);
    ctx.fill();
    ctx.restore();

    const baseFill = isHovered ? palette.nodeFillHover : palette.nodeFill;
    ctx.fillStyle = isInvalid
      ? palette.nodeErrorFill
      : showWarning
        ? palette.nodeWarningFill
        : baseFill;
    ctx.strokeStyle = isInvalid
      ? palette.nodeErrorBorder
      : showWarning
        ? palette.nodeWarningBorder
        : isHovered
          ? palette.nodeStrokeHover
          : palette.nodeStroke;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(x, y, NODE_WIDTH, height, NODE_BORDER_RADIUS);
    ctx.fill();
    ctx.stroke();

    if (isInvalid) {
      ctx.save();
      ctx.fillStyle = palette.nodeErrorOverlay;
      ctx.beginPath();
      ctx.roundRect(x, y, NODE_WIDTH, height, NODE_BORDER_RADIUS);
      ctx.fill();
      ctx.restore();
    }

    if (showWarning) {
      ctx.save();
      ctx.fillStyle = palette.nodeWarningOverlay;
      ctx.beginPath();
      ctx.roundRect(x, y, NODE_WIDTH, height, NODE_BORDER_RADIUS);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, NODE_WIDTH, height, NODE_BORDER_RADIUS);
    ctx.clip();
    ctx.fillStyle = categoryBand;
    ctx.fillRect(x, y, NODE_WIDTH, NODE_BAND_HEIGHT);
    ctx.fillStyle = categoryAccent;
    ctx.fillRect(x, y + NODE_BAND_HEIGHT - 1.5, NODE_WIDTH, 1.5);
    ctx.restore();

    if (category) {
      ctx.fillStyle = categoryAccent;
      ctx.font = '600 9px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(category.label.toUpperCase(), x + 10, y + 4);
    }

    const iconImage = getIconImage(definition?.iconId);
    if (definition?.iconId && iconImage && iconImage.complete && iconImage.naturalWidth > 0) {
      const iconX = x + NODE_WIDTH - ICON_PADDING - ICON_SIZE;
      const iconY = y + NODE_BAND_HEIGHT + 6;
      ctx.save();
      ctx.globalAlpha = 0.98;
      ctx.drawImage(iconImage, iconX, iconY, ICON_SIZE, ICON_SIZE);
      ctx.restore();
    }

    ctx.fillStyle = palette.text;
    ctx.font = '600 13px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const labelText = truncateToWidth(label, labelMaxWidth);
    ctx.fillText(labelText, x + 12, y + NODE_BAND_HEIGHT + 8);

    const detailY = y + NODE_BAND_HEIGHT + 32;
    const evaluationError = node.data?.evaluationError;
    const outputs = node.data?.outputs ?? {};
    const primaryOutputKey = definition?.primaryOutputKey ?? layout.defaultOutputKey;
    const primaryOutputValue = primaryOutputKey ? outputs[primaryOutputKey] : undefined;

    if (evaluationError) {
      ctx.fillStyle = palette.nodeErrorBorder;
      ctx.font = '600 10px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
      const errorText = truncateToWidth(`Error: ${evaluationError}`, detailMaxWidth);
      ctx.fillText(errorText, x + 12, detailY);
    } else if (showWarning) {
      ctx.fillStyle = palette.nodeWarningBorder;
      ctx.font = '600 10px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
      const warningText = truncateToWidth(
        `Needs: ${missingRequiredInputs.join(", ")}`,
        detailMaxWidth
      );
      ctx.fillText(warningText, x + 12, detailY);
    } else if (node.type === "topologyOptimize") {
      ctx.fillStyle = palette.textMuted;
      ctx.font = '500 11px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
      const settings = node.data?.topologySettings ?? {
        volumeFraction: 0.4,
        penaltyExponent: 3,
        filterRadius: 1.5,
        maxIterations: 80,
      };
      const progress = node.data?.topologyProgress ?? { iteration: 0, status: "idle" };
      const vfLabel = `VF ${Math.round(settings.volumeFraction * 100)}%`;
      const penaltyLabel = `P${formatNumber(settings.penaltyExponent, 1)}`;
      const radiusLabel = `R${formatNumber(settings.filterRadius, 1)}`;
      const settingsText = truncateToWidth(
        `${vfLabel} | ${penaltyLabel} | ${radiusLabel}`,
        detailMaxWidth
      );
      ctx.fillText(settingsText, x + 12, detailY);
      ctx.font = '500 10px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
      const progressText = truncateToWidth(
        `Iter ${progress.iteration}/${settings.maxIterations} · ${String(progress.status)}`,
        detailMaxWidth
      );
      ctx.fillText(progressText, x + 12, detailY + 16);
    } else {
      const detailText =
        primaryOutputValue != null
          ? `= ${formatValue(primaryOutputValue)}`
          : definition?.description ??
            (node.type ? `Type: ${node.type}` : `ID: ${node.id.slice(0, 8)}`);
      ctx.fillStyle = palette.textMuted;
      ctx.font = '500 11px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
      const detailLabel = truncateToWidth(detailText, detailMaxWidth);
      ctx.fillText(detailLabel, x + 12, detailY);
    }

    const portFont = '600 9px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
    const portLabelMaxWidth = NODE_WIDTH - 48;

    const drawPort = (portLayout: PortLayout) => {
      const port = portLayout.port;
      const portColor = resolvePortColor(port, fallbackPortColor);
      const isPortHovered =
        hoveredTarget.type === "port" &&
        hoveredTarget.nodeId === node.id &&
        hoveredTarget.portKey === port.key &&
        hoveredTarget.isOutput === portLayout.isOutput;

      ctx.save();
      ctx.font = portFont;
      ctx.textBaseline = "middle";
      ctx.textAlign = portLayout.isOutput ? "right" : "left";
      ctx.fillStyle = portColor;
      ctx.globalAlpha = isPortHovered ? 1 : 0.86;
      const labelText = truncateToWidth(port.label, portLabelMaxWidth);
      const labelX = portLayout.isOutput ? x + NODE_WIDTH - 14 : x + 12;
      ctx.fillText(labelText, labelX, portLayout.y);
      ctx.restore();

      ctx.fillStyle = portColor;
      ctx.beginPath();
      ctx.arc(portLayout.x, portLayout.y, PORT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      if (isPortHovered) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(portLayout.x, portLayout.y, PORT_RADIUS * 0.72, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = palette.portStroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    layout.inputs.forEach(drawPort);
    layout.outputs.forEach(drawPort);
  });
}

function drawSelectionBox(
  ctx: CanvasRenderingContext2D,
  dragState: Extract<DragState, { type: "box" }>,
  palette: CanvasPalette
) {
  const minX = Math.min(dragState.startScreen.x, dragState.currentScreen.x);
  const minY = Math.min(dragState.startScreen.y, dragState.currentScreen.y);
  const width = Math.abs(dragState.currentScreen.x - dragState.startScreen.x);
  const height = Math.abs(dragState.currentScreen.y - dragState.startScreen.y);
  if (width < 2 && height < 2) return;
  ctx.save();
  ctx.fillStyle = palette.edgeHover;
  ctx.strokeStyle = palette.edgeHover;
  ctx.globalAlpha = 0.12;
  ctx.fillRect(minX, minY, width, height);
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1;
  ctx.strokeRect(minX, minY, width, height);
  ctx.restore();
}
