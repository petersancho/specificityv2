import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { isWorkflowNodeInvalid } from "./workflowValidation";

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

type DragState =
  | { type: "none" }
  | { type: "pan"; startPos: Vec2; startTransform: ViewTransform }
  | { type: "node"; nodeId: string; startPos: Vec2; nodeStartPos: Vec2 }
  | { type: "edge"; sourceNodeId: string; sourcePort: string; currentPos: Vec2 };

type NumericalCanvasProps = {
  width: number;
  height: number;
};

type CanvasPalette = {
  canvasBg: string;
  grid: string;
  edge: string;
  edgeHover: string;
  edgePreview: string;
  nodeFill: string;
  nodeFillHover: string;
  nodeStroke: string;
  nodeStrokeHover: string;
  nodeErrorBorder: string;
  nodeErrorOverlay: string;
  nodeErrorFill: string;
  text: string;
  textMuted: string;
  portFill: string;
  portFillHover: string;
  portStroke: string;
};

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;
const NODE_BORDER_RADIUS = 8;
const PORT_RADIUS = 6;
const PORT_OFFSET_Y = 40;
const MIN_SCALE = 0.1;
const MAX_SCALE = 3.0;
const ZOOM_SPEED = 0.001;

const readCssVar = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
};

const getPalette = (): CanvasPalette => {
  const bg = readCssVar("--color-bg", "#050505");
  const surface = readCssVar("--color-surface", "#111111");
  const surfaceMuted = readCssVar("--color-surface-muted", "#1c1c1c");
  const border = readCssVar("--color-border", "#404040");
  const text = readCssVar("--color-text", "#e0e0e0");
  const muted = readCssVar("--color-muted", "#808080");
  const edge = readCssVar("--color-edge", "#666666");
  const accent = readCssVar("--color-accent", "#e0e0e0");
  const grid = readCssVar("--color-grid-dot", "rgba(253, 253, 252, 0.08)");
  const portFill = readCssVar("--color-handle-dot-soft", "#555555");
  const portFillHover = readCssVar("--color-handle-dot-strong", "#888888");
  const portStroke = readCssVar("--color-handle-stroke", "#999999");
  const nodeErrorBorder = readCssVar("--node-error-border", "#dc3545");
  const nodeErrorOverlay = readCssVar("--node-error-overlay", "rgba(128, 128, 128, 0.3)");
  const nodeErrorFill = readCssVar("--node-error-bg", "rgba(220, 53, 69, 0.15)");

  return {
    canvasBg: bg,
    grid,
    edge,
    edgeHover: accent,
    edgePreview: muted,
    nodeFill: surface,
    nodeFillHover: surfaceMuted,
    nodeStroke: border,
    nodeStrokeHover: accent,
    nodeErrorBorder,
    nodeErrorOverlay,
    nodeErrorFill,
    text,
    textMuted: muted,
    portFill,
    portFillHover,
    portStroke,
  };
};

export const NumericalCanvas = ({ width, height }: NumericalCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paletteRef = useRef<CanvasPalette>(getPalette());
  const [viewTransform, setViewTransform] = useState<ViewTransform>({
    x: width / 2,
    y: height / 2,
    scale: 1.0,
  });
  const [dragState, setDragState] = useState<DragState>({ type: "none" });
  const [hoveredTarget, setHoveredTarget] = useState<HitTarget>({ type: "none" });

  const nodes = useProjectStore((state) => state.workflow.nodes);
  const edges = useProjectStore((state) => state.workflow.edges);
  const geometry = useProjectStore((state) => state.geometry);
  const onNodesChange = useProjectStore((state) => state.onNodesChange);
  const onConnect = useProjectStore((state) => state.onConnect);

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

      ctx.save();
      ctx.translate(viewTransform.x, viewTransform.y);
      ctx.scale(viewTransform.scale, viewTransform.scale);

      drawBackground(ctx, width, height, viewTransform, palette);
      drawConnections(ctx, nodes, edges, hoveredTarget, palette);
      drawNodes(ctx, nodes, geometry, hoveredTarget, palette);

      if (dragState.type === "edge") {
        drawEdgePreview(ctx, nodes, dragState, palette);
      }

      ctx.restore();

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

  const hitTest = (worldX: number, worldY: number): HitTarget => {
    for (const node of nodes) {
      const nx = node.position.x;
      const ny = node.position.y;

      const outputPortX = nx + NODE_WIDTH;
      const outputPortY = ny + PORT_OFFSET_Y;
      const distToOutput = Math.hypot(worldX - outputPortX, worldY - outputPortY);
      if (distToOutput < PORT_RADIUS * 2) {
        return { type: "port", nodeId: node.id, portKey: "output", isOutput: true };
      }

      const inputPortX = nx;
      const inputPortY = ny + PORT_OFFSET_Y;
      const distToInput = Math.hypot(worldX - inputPortX, worldY - inputPortY);
      if (distToInput < PORT_RADIUS * 2) {
        return { type: "port", nodeId: node.id, portKey: "input", isOutput: false };
      }

      if (
        worldX >= nx &&
        worldX <= nx + NODE_WIDTH &&
        worldY >= ny &&
        worldY <= ny + NODE_HEIGHT
      ) {
        return { type: "node", nodeId: node.id };
      }
    }

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

    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setDragState({
        type: "pan",
        startPos: { x: screenX, y: screenY },
        startTransform: { ...viewTransform },
      });
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
        setDragState({
          type: "node",
          nodeId: target.nodeId,
          startPos: { x: screenX, y: screenY },
          nodeStartPos: { x: node.position.x, y: node.position.y },
        });
        e.preventDefault();
      }
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

    const target = hitTest(world.x, world.y);
    setHoveredTarget(target);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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

    setDragState({ type: "none" });
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      style={{
        display: "block",
        background: "var(--color-bg)",
        cursor:
          dragState.type === "pan"
            ? "grabbing"
            : dragState.type === "node"
              ? "move"
              : hoveredTarget.type === "node"
                ? "grab"
                : hoveredTarget.type === "port"
                  ? "crosshair"
                  : "default",
        touchAction: "none",
      }}
    />
  );
};

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  transform: ViewTransform,
  palette: CanvasPalette
) {
  const gridSize = 20;

  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;

  const startX = Math.floor(-transform.x / transform.scale / gridSize) * gridSize;
  const startY = Math.floor(-transform.y / transform.scale / gridSize) * gridSize;
  const endX = startX + width / transform.scale + gridSize;
  const endY = startY + height / transform.scale + gridSize;

  for (let x = startX; x < endX; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();
  }

  for (let y = startY; y < endY; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }
}

function drawConnections(
  ctx: CanvasRenderingContext2D,
  nodes: any[],
  edges: any[],
  hoveredTarget: HitTarget,
  palette: CanvasPalette
) {
  edges.forEach((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (!sourceNode || !targetNode) return;

    const sourceX = sourceNode.position.x + NODE_WIDTH;
    const sourceY = sourceNode.position.y + PORT_OFFSET_Y;
    const targetX = targetNode.position.x;
    const targetY = targetNode.position.y + PORT_OFFSET_Y;

    const dx = targetX - sourceX;
    const controlOffset = Math.abs(dx) * 0.5;

    const isHovered = hoveredTarget.type === "edge" && hoveredTarget.edgeId === edge.id;
    ctx.strokeStyle = isHovered ? palette.edgeHover : palette.edge;
    ctx.lineWidth = isHovered ? 3 : 2;

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
  });
}

function drawEdgePreview(
  ctx: CanvasRenderingContext2D,
  nodes: any[],
  dragState: Extract<DragState, { type: "edge" }>,
  palette: CanvasPalette
) {
  const sourceNode = nodes.find((n) => n.id === dragState.sourceNodeId);
  if (!sourceNode) return;

  const sourceX = sourceNode.position.x + NODE_WIDTH;
  const sourceY = sourceNode.position.y + PORT_OFFSET_Y;
  const targetX = dragState.currentPos.x;
  const targetY = dragState.currentPos.y;

  const dx = targetX - sourceX;
  const controlOffset = Math.abs(dx) * 0.5;

  ctx.strokeStyle = palette.edgePreview;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);

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
  geometry: any[],
  hoveredTarget: HitTarget,
  palette: CanvasPalette
) {
  nodes.forEach((node) => {
    const x = node.position.x;
    const y = node.position.y;

    const isHovered = hoveredTarget.type === "node" && hoveredTarget.nodeId === node.id;
    const isInvalid = isWorkflowNodeInvalid(node.type, node.data, geometry);

    const baseFill = isHovered ? palette.nodeFillHover : palette.nodeFill;
    ctx.fillStyle = isInvalid ? palette.nodeErrorFill : baseFill;
    ctx.strokeStyle = isInvalid
      ? palette.nodeErrorBorder
      : isHovered
        ? palette.nodeStrokeHover
        : palette.nodeStroke;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(x, y, NODE_WIDTH, NODE_HEIGHT, NODE_BORDER_RADIUS);
    ctx.fill();
    ctx.stroke();

    if (isInvalid) {
      ctx.fillStyle = palette.nodeErrorOverlay;
      ctx.fill();
    }

    ctx.fillStyle = palette.text;
    ctx.font = "14px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(node.data?.label ?? node.type ?? "Node", x + 10, y + 10);

    ctx.fillStyle = palette.textMuted;
    ctx.font = "12px sans-serif";
    ctx.fillText(node.type ? `Type: ${node.type}` : `ID: ${node.id.slice(0, 8)}`, x + 10, y + 35);

    const inputPortX = x;
    const inputPortY = y + PORT_OFFSET_Y;
    const isInputHovered =
      hoveredTarget.type === "port" &&
      hoveredTarget.nodeId === node.id &&
      !hoveredTarget.isOutput;

    ctx.fillStyle = isInputHovered ? palette.portFillHover : palette.portFill;
    ctx.beginPath();
    ctx.arc(inputPortX, inputPortY, PORT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.portStroke;
    ctx.lineWidth = 1;
    ctx.stroke();

    const outputPortX = x + NODE_WIDTH;
    const outputPortY = y + PORT_OFFSET_Y;
    const isOutputHovered =
      hoveredTarget.type === "port" &&
      hoveredTarget.nodeId === node.id &&
      hoveredTarget.isOutput;

    ctx.fillStyle = isOutputHovered ? palette.portFillHover : palette.portFill;
    ctx.beginPath();
    ctx.arc(outputPortX, outputPortY, PORT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.portStroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}
