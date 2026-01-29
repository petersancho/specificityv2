import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { useProjectStore, type NodeType } from "../../store/useProjectStore";
import { renderIconDataUrl, type IconId } from "../../webgl/ui/WebGLIconRenderer";
import type { RGBA } from "../../webgl/ui/WebGLUIRenderer";
import WebGLButton from "../ui/WebGLButton";
import WorkflowGeometryViewer from "./WorkflowGeometryViewer";
import { isWorkflowNodeInvalid } from "./workflowValidation";
import {
  buildPanelLines,
  formatInlineValue,
  resolvePanelFormatOptions,
} from "./panelFormat";
import {
  NODE_CATEGORY_BY_ID,
  PORT_TYPE_COLOR,
  buildNodeTooltipLines,
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

type SliderSnapMode = "off" | "step";

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

type TooltipData = {
  title: string;
  lines: string[];
};

type PendingReference =
  | { kind: "node"; nodeId: string; world: Vec2 }
  | { kind: "port"; nodeId: string; portKey: string; world: Vec2 }
  | { kind: "canvas"; world: Vec2 };

type DragState =
  | { type: "none" }
  | { type: "pan"; startPos: Vec2; startTransform: ViewTransform }
  | {
      type: "node";
      nodeId: string;
      startPos: Vec2;
      nodeStartPos: Vec2;
      dragNodes: Array<{ id: string; startPos: Vec2 }>;
    }
  | {
      type: "resize";
      nodeId: string;
      startWorld: Vec2;
      startSize: { width: number; height: number };
    }
  | { type: "edge"; sourceNodeId: string; sourcePort: string; currentPos: Vec2 }
  | {
      type: "slider";
      nodeId: string;
      bounds: { x: number; y: number; width: number; height: number };
      min: number;
      max: number;
      step: number;
      snapMode: SliderSnapMode;
      precisionOverride: number | null;
    }
  | {
      type: "box";
      startScreen: Vec2;
      currentScreen: Vec2;
      startWorld: Vec2;
      currentWorld: Vec2;
      isAdditive: boolean;
    };

type InlineEditorState =
  | { type: "group"; nodeId: string; value: string; original: string }
  | { type: "note"; nodeId: string; value: string; original: string }
  | { type: "slider"; nodeId: string; value: string; original: string };

type NumericalCanvasProps = {
  width: number;
  height: number;
  pendingNodeType?: NodeType | null;
  onDropNode?: (type: NodeType, world: Vec2) => void;
  onRequestNodeSettings?: (nodeId: string) => void;
  mode?: "standard" | "minimap";
  enableMinimapPanZoom?: boolean;
  captureMode?: "transparent" | "white" | null;
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
const VIEWER_NODE_MIN_HEIGHT = 230;
const VIEWER_INSET = 12;
const VIEWER_TOP_OFFSET = PORTS_START_OFFSET + PORT_ROW_HEIGHT + 8;
const VIEWER_BOTTOM_OFFSET = 14;
const PANEL_CONTENT_TOP = NODE_BAND_HEIGHT + 32;
const PANEL_CONTENT_BOTTOM = 16;
const PANEL_LINE_HEIGHT = 14;
const PANEL_TEXT_INSET_X = 16;
const PANEL_MAX_HEIGHT = 220;
const GROUP_MIN_WIDTH = 260;
const GROUP_MIN_HEIGHT = 180;
const GROUP_PADDING = 18;
const GROUP_HEADER_HEIGHT = 24;
const GROUP_BORDER_RADIUS = 16;
const GROUP_RESIZE_HANDLE = 16;
const NOTE_WIDTH = 240;
const NOTE_MIN_HEIGHT = 120;
const NOTE_BORDER_RADIUS = 12;
const NOTE_LINE_HEIGHT = 14;
const NOTE_TEXT_INSET_X = 14;
const NOTE_PADDING_TOP = 14;
const NOTE_PADDING_BOTTOM = 16;
const SLIDER_PORT_OFFSET = 6;
const SLIDER_TRACK_HEIGHT = 8;
const SLIDER_TRACK_INSET_X = 16;
const SLIDER_THUMB_RADIUS = 7;
const SLIDER_LABEL_HEIGHT = 20;
const SLIDER_HEADER_TOP = 8;
const SLIDER_HEADER_PADDING_X = 14;
const SLIDER_SETTINGS_SIZE = 12;
const SLIDER_SETTINGS_GAP = 6;
const SLIDER_VALUE_WIDTH = 62;
const SLIDER_VALUE_HEIGHT = 16;
const ICON_SIZE = 26;
const ICON_PADDING = 10;
const EDGE_HIT_RADIUS = 6;
const EDGE_SAMPLE_COUNT = 24;
const MIN_SCALE = 0.35;
const MAX_SCALE = 3.5;
const MINIMAP_MIN_SCALE = 0.18;
const MINIMAP_MAX_SCALE = 2.1;
const MINIMAP_PADDING_MIN = 18;
const MINIMAP_PADDING_MAX = 56;
const ZOOM_SPEED = 0.0012;
const ZOOM_STEP = 1.12;
const RIGHT_CLICK_HOLD_MS = 240;
const GRID_MINOR_BASE = 24;
const GRID_MAJOR_FACTOR = 5;
const GRID_SNAP_KEY = "lingua.numericaGridSnap";
const SHORTCUT_OVERLAY_KEY = "lingua.numericaShortcutOverlay";

const clampValue = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const isEditableTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.isContentEditable
  );
};

const resolveGridSteps = (zoom: number) => {
  let minor = GRID_MINOR_BASE;
  if (zoom > 2.5) minor = 18;
  else if (zoom < 0.7) minor = 32;
  const major = minor * GRID_MAJOR_FACTOR;
  return { minor, major };
};

const collectGeometryIds = (value: unknown) => {
  const ids: string[] = [];
  const walk = (entry: unknown) => {
    if (typeof entry === "string") {
      ids.push(entry);
      return;
    }
    if (Array.isArray(entry)) {
      entry.forEach(walk);
    }
  };
  walk(value);
  return ids;
};

const formatNumber = (value: number, decimals = 1) => {
  const rounded = Number(value.toFixed(decimals));
  return Number.isInteger(rounded) ? String(Math.trunc(rounded)) : String(rounded);
};

const readNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return fallback;
};

const resolveStepDecimals = (step: number) => {
  if (!Number.isFinite(step)) return 0;
  const normalized = Math.abs(step).toString();
  if (normalized.includes("e")) {
    const [base, expRaw] = normalized.split("e");
    const exp = Number(expRaw);
    const baseDecimals = base.split(".")[1]?.length ?? 0;
    if (Number.isFinite(exp)) {
      return Math.max(0, baseDecimals - exp);
    }
  }
  const decimals = normalized.split(".")[1];
  return decimals ? decimals.length : 0;
};

const resolveValueDecimals = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  const normalized = Math.abs(value).toString();
  if (normalized.includes("e")) {
    const [base, expRaw] = normalized.split("e");
    const exp = Number(expRaw);
    const baseDecimals = base.split(".")[1]?.length ?? 0;
    if (Number.isFinite(exp)) {
      return Math.max(0, baseDecimals - exp);
    }
  }
  const decimals = normalized.split(".")[1];
  return decimals ? decimals.length : 0;
};

const isSliderSnapMode = (value: unknown): value is SliderSnapMode =>
  value === "off" || value === "step";

const snapNumberToStep = (value: number, step: number, min: number) => {
  if (!Number.isFinite(step) || step <= 0) return value;
  const snapped = Math.round((value - min) / step) * step + min;
  const decimals = Math.min(6, resolveStepDecimals(step));
  if (decimals <= 0) return Math.round(snapped);
  const factor = Math.pow(10, decimals);
  return Math.round(snapped * factor) / factor;
};

const roundToPrecision = (value: number, precision: number | null) => {
  if (precision == null || !Number.isFinite(precision)) return value;
  const clamped = Math.min(6, Math.max(0, Math.round(precision)));
  if (clamped <= 0) return Math.round(value);
  const factor = Math.pow(10, clamped);
  return Math.round(value * factor) / factor;
};

const formatSliderValue = (
  value: number,
  step: number,
  snapMode: SliderSnapMode,
  precisionOverride: number | null
) => {
  const basePrecision =
    precisionOverride == null || !Number.isFinite(precisionOverride)
      ? Math.min(6, resolveStepDecimals(step))
      : Math.min(6, Math.max(0, Math.round(precisionOverride)));
  const precision =
    precisionOverride == null && snapMode === "off"
      ? Math.min(6, Math.max(basePrecision, resolveValueDecimals(value)))
      : basePrecision;
  return formatNumber(value, precision);
};

const readCssVar = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
};

const getPalette = (): CanvasPalette => {
  const bg = readCssVar("--sp-porcelain", "#f5f2ee");
  const surface = readCssVar("--sp-porcelain", "#f5f2ee");
  const surfaceMuted = readCssVar("--sp-uiGrey", "#e9e6e2");
  const border = readCssVar("--sp-divider", "#c9c5c0");
  const text = readCssVar("--sp-ink", "#1f1f22");
  const muted = readCssVar("--sp-muted", "#6a6661");
  const edge = readCssVar("--sp-ink", "#1f1f22");
  const edgeSoft = readCssVar("--canvas-edge-soft", "rgba(31, 31, 34, 0.2)");
  const accent = readCssVar("--sp-ink", "#1f1f22");
  const gridMinor = readCssVar("--canvas-grid-minor", "rgba(20, 20, 20, 0.08)");
  const gridMajor = readCssVar("--canvas-grid-major", "rgba(20, 20, 20, 0.18)");
  const portFill = readCssVar("--sp-divider", "#c9c5c0");
  const portFillHover = readCssVar("--sp-divider", "#c9c5c0");
  const portStroke = readCssVar("--sp-ink", "#1f1f22");
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
  panelLines?: string[];
  noteLines?: string[];
  portsStartOffset: number;
};

type SliderConfig = {
  value: number;
  min: number;
  max: number;
  step: number;
  snapMode: SliderSnapMode;
  precisionOverride: number | null;
  rawValue: number;
};

type SliderInteractionConfig = Pick<
  SliderConfig,
  "min" | "max" | "step" | "snapMode" | "precisionOverride"
>;

const ICON_DATA_URL_CACHE = new Map<string, string>();
const ICON_IMAGE_CACHE = new Map<string, HTMLImageElement>();
const ICON_RESOLUTION = 96;
const COLOR_CACHE = new Map<string, RGBA>();
let colorParseCtx: CanvasRenderingContext2D | null = null;

const ensureColorParseContext = () => {
  if (colorParseCtx) {
    const attrs =
      typeof colorParseCtx.getContextAttributes === "function"
        ? colorParseCtx.getContextAttributes()
        : null;
    if (attrs?.willReadFrequently) {
      return colorParseCtx;
    }
    colorParseCtx = null;
  }
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 2;
  colorParseCtx = canvas.getContext("2d", { willReadFrequently: true });
  return colorParseCtx;
};

const parseCssColor = (value: string | undefined, fallback: RGBA): RGBA => {
  if (!value) return fallback;
  const cached = COLOR_CACHE.get(value);
  if (cached) return cached;
  const ctx = ensureColorParseContext();
  if (!ctx) return fallback;
  ctx.clearRect(0, 0, 2, 2);
  ctx.fillStyle = "#000";
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  const rgba: RGBA = [data[0] / 255, data[1] / 255, data[2] / 255, data[3] / 255];
  COLOR_CACHE.set(value, rgba);
  return rgba;
};

const rgbaToCss = (rgba: RGBA, alphaOverride?: number) => {
  const alpha = alphaOverride ?? rgba[3];
  return `rgba(${Math.round(rgba[0] * 255)}, ${Math.round(rgba[1] * 255)}, ${Math.round(
    rgba[2] * 255
  )}, ${alpha})`;
};

const getTintKey = (tint?: RGBA) =>
  tint ? tint.map((value) => Math.round(value * 255)).join("-") : "default";

const getIconImage = (iconId?: string, tint?: RGBA) => {
  if (!iconId || typeof document === "undefined") return null;
  const cacheKey = `${iconId}|${getTintKey(tint)}`;
  const cachedImage = ICON_IMAGE_CACHE.get(cacheKey);
  if (cachedImage) return cachedImage;
  const cachedUrl = ICON_DATA_URL_CACHE.get(cacheKey);
  const url =
    cachedUrl ??
    renderIconDataUrl(iconId as Parameters<typeof renderIconDataUrl>[0], ICON_RESOLUTION, {
      tint,
    });
  ICON_DATA_URL_CACHE.set(cacheKey, url);
  const image = new Image();
  image.src = url;
  ICON_IMAGE_CACHE.set(cacheKey, image);
  return image;
};

const resolvePortColor = (port: WorkflowPortSpec, fallback: string) =>
  PORT_TYPE_COLOR[port.type] ?? fallback;

const resolveSliderConfig = (node: any) => {
  const parameters = resolveNodeParameters(node);
  const rawMin = readNumber(parameters.min, 0);
  const rawMax = readNumber(parameters.max, 100);
  const rawStep = readNumber(parameters.step, 1);
  const rawValue = readNumber(parameters.value, rawMin);
  const snapMode = isSliderSnapMode(parameters.snapMode)
    ? parameters.snapMode
    : typeof parameters.snap === "boolean"
      ? parameters.snap
        ? "step"
        : "off"
      : "step";
  const hasSnapMode = isSliderSnapMode(parameters.snapMode);
  const precisionRaw =
    hasSnapMode || parameters.precision == null
      ? null
      : typeof parameters.precision === "number"
        ? parameters.precision
        : typeof parameters.precision === "string" && parameters.precision.trim().length > 0
          ? Number(parameters.precision)
          : null;
  const precisionOverride =
    precisionRaw == null || !Number.isFinite(precisionRaw)
      ? null
      : Math.min(6, Math.max(0, Math.round(precisionRaw)));
  const step = rawStep > 0 ? Math.abs(rawStep) : 1;
  const min = Math.min(rawMin, rawMax);
  const max = Math.max(rawMin, rawMax);
  const snapped = snapMode === "step" ? snapNumberToStep(rawValue, step, min) : rawValue;
  const rounded =
    precisionOverride != null ? roundToPrecision(snapped, precisionOverride) : snapped;
  const value = clampValue(rounded, min, max);
  return { value, min, max, step, snapMode, precisionOverride, rawValue };
};

const getSliderBounds = (layout: NodeLayout) => {
  const portTop = layout.y + layout.portsStartOffset;
  const idealCenter = layout.y + Math.max(38, layout.height * 0.55);
  const idealTrackY = idealCenter - SLIDER_TRACK_HEIGHT / 2;
  const minTrackY = layout.y + 40;
  const maxTrackY = portTop - 8 - SLIDER_TRACK_HEIGHT;
  const trackY = Math.min(Math.max(idealTrackY, minTrackY), maxTrackY);
  return {
    x: layout.x + SLIDER_TRACK_INSET_X,
    y: trackY,
    width: layout.width - SLIDER_TRACK_INSET_X * 2,
    height: SLIDER_TRACK_HEIGHT,
  };
};

const getSliderSettingsBounds = (layout: NodeLayout) => {
  const headerTop = layout.y + SLIDER_HEADER_TOP;
  const headerHeight = SLIDER_LABEL_HEIGHT;
  return {
    x: layout.x + layout.width - SLIDER_HEADER_PADDING_X - SLIDER_SETTINGS_SIZE,
    y: headerTop + (headerHeight - SLIDER_SETTINGS_SIZE) / 2,
    width: SLIDER_SETTINGS_SIZE,
    height: SLIDER_SETTINGS_SIZE,
  };
};

const getSliderValueBounds = (layout: NodeLayout) => {
  const headerTop = layout.y + SLIDER_HEADER_TOP;
  const headerHeight = SLIDER_LABEL_HEIGHT;
  const settings = getSliderSettingsBounds(layout);
  const rightEdge = settings.x - SLIDER_SETTINGS_GAP;
  return {
    x: rightEdge - SLIDER_VALUE_WIDTH,
    y: headerTop + (headerHeight - SLIDER_VALUE_HEIGHT) / 2,
    width: SLIDER_VALUE_WIDTH,
    height: SLIDER_VALUE_HEIGHT,
  };
};

const getPanelContentBounds = (layout: NodeLayout) => ({
  x: layout.x + PANEL_TEXT_INSET_X,
  y: layout.y + PANEL_CONTENT_TOP,
  width: layout.width - PANEL_TEXT_INSET_X * 2,
  height: Math.max(0, layout.height - PANEL_CONTENT_TOP - PANEL_CONTENT_BOTTOM),
});

const truncateToWidth = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) => {
  if (!text) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "…";
  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(trimmed + ellipsis).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed.length > 1 ? `${trimmed}${ellipsis}` : ellipsis;
};

const isPointInRect = (point: Vec2, rect: { x: number; y: number; width: number; height: number }) =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height;

const isPointInGroupResizeHandle = (point: Vec2, layout: NodeLayout) => {
  const handleX = layout.x + layout.width - GROUP_RESIZE_HANDLE;
  const handleY = layout.y + layout.height - GROUP_RESIZE_HANDLE;
  return (
    point.x >= handleX &&
    point.x <= layout.x + layout.width &&
    point.y >= handleY &&
    point.y <= layout.y + layout.height
  );
};

const computeNodeLayout = (node: any): NodeLayout => {
  const definition = getNodeDefinition(node.type);
  const parameters = resolveNodeParameters(node);
  if (node.type === "group") {
    const size = node.data?.groupSize;
    const width = Math.max(GROUP_MIN_WIDTH, readNumber(size?.width, GROUP_MIN_WIDTH));
    const height = Math.max(GROUP_MIN_HEIGHT, readNumber(size?.height, GROUP_MIN_HEIGHT));
    return {
      nodeId: node.id,
      x: node.position.x,
      y: node.position.y,
      width,
      height,
      definition,
      parameters,
      inputs: [],
      outputs: [],
      inputByKey: new Map(),
      outputByKey: new Map(),
      portsStartOffset: GROUP_HEADER_HEIGHT,
    };
  }
  if (node.type === "textNote") {
    const nodeOutputs = node.data?.outputs ?? {};
    const noteOutputKey = definition?.primaryOutputKey ?? "data";
    const fallbackText = typeof parameters.text === "string" ? parameters.text : "";
    const noteValue =
      nodeOutputs[noteOutputKey] ?? (fallbackText.length > 0 ? fallbackText : null);
    const noteOptions = resolvePanelFormatOptions(parameters);
    const hasContent =
      noteValue != null &&
      !(typeof noteValue === "string" && noteValue.trim().length === 0);
    const noteLines = hasContent ? buildPanelLines(noteValue, noteOptions) : ["Edit me!"];
    const ports = resolveNodePorts(node, parameters);
    const inputCount = ports.inputs.length;
    const outputCount = ports.outputs.length;
    const rowCount = Math.max(inputCount, outputCount, 1);
    const portsHeight = rowCount * PORT_ROW_HEIGHT;
    const noteHeight =
      NOTE_PADDING_TOP + noteLines.length * NOTE_LINE_HEIGHT + NOTE_PADDING_BOTTOM;
    const portsStartOffset = noteHeight + 8;
    const width = NOTE_WIDTH;
    const height = Math.max(
      NOTE_MIN_HEIGHT,
      portsStartOffset + portsHeight + PORTS_BOTTOM_PADDING
    );
    const portsStartY = node.position.y + portsStartOffset;

    const distributePorts = (portsList: WorkflowPortSpec[], isOutput: boolean) => {
      const offsetRows = (rowCount - portsList.length) / 2;
      return portsList.map<PortLayout>((port, index) => {
        const rowIndex = offsetRows + index;
        const y = portsStartY + rowIndex * PORT_ROW_HEIGHT + PORT_ROW_HEIGHT / 2;
        return {
          port,
          x: isOutput ? node.position.x + width : node.position.x,
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
      width,
      height,
      definition,
      parameters,
      inputs,
      outputs,
      inputByKey,
      outputByKey,
      defaultInputKey,
      defaultOutputKey,
      portsStartOffset,
      noteLines,
    };
  }
  const ports = resolveNodePorts(node, parameters);
  const inputCount = ports.inputs.length;
  const outputCount = ports.outputs.length;
  const rowCount = Math.max(inputCount, outputCount, 1);
  const portsHeight = rowCount * PORT_ROW_HEIGHT;
  const portsStartOffset =
    node.type === "slider" ? PORTS_START_OFFSET + SLIDER_PORT_OFFSET : PORTS_START_OFFSET;
  const minHeight = node.type === "geometryViewer" ? VIEWER_NODE_MIN_HEIGHT : NODE_MIN_HEIGHT;
  const nodeOutputs = node.data?.outputs ?? {};
  const panelOutputKey = definition?.primaryOutputKey ?? ports.outputs[0]?.key ?? "data";
  const panelFallback =
    node.type === "panel" && typeof parameters.text === "string" ? parameters.text : null;
  const panelValue =
    nodeOutputs[panelOutputKey] ?? (panelFallback && panelFallback.length > 0 ? panelFallback : null);
  const panelOptions = node.type === "panel" ? resolvePanelFormatOptions(parameters) : null;
  const panelLines =
    node.type === "panel" && panelOptions ? buildPanelLines(panelValue, panelOptions) : undefined;
  const panelContentHeight = panelLines
    ? PANEL_CONTENT_TOP + panelLines.length * PANEL_LINE_HEIGHT + PANEL_CONTENT_BOTTOM
    : 0;
  const panelHeight = panelLines ? Math.min(panelContentHeight, PANEL_MAX_HEIGHT) : 0;
  const height = Math.max(
    minHeight,
    portsStartOffset + portsHeight + PORTS_BOTTOM_PADDING,
    panelHeight
  );
  const portsStartY = node.position.y + portsStartOffset;

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
    panelLines,
    portsStartOffset,
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
    .filter((portLayout) => {
      const paramKey = portLayout.port.parameterKey;
      if (!paramKey) return true;
      const value = layout.parameters?.[paramKey];
      return value == null;
    })
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

export const NumericalCanvas = ({
  width,
  height,
  pendingNodeType,
  onDropNode,
  mode = "standard",
  enableMinimapPanZoom = false,
  captureMode = null,
}: NumericalCanvasProps) => {
  const isMinimap = mode === "minimap";
  const interactionsEnabled = !isMinimap;
  const panZoomEnabled = isMinimap && enableMinimapPanZoom;
  const canvasInteractive = interactionsEnabled || panZoomEnabled;
  const captureActive = Boolean(captureMode);
  const minScale = isMinimap ? MINIMAP_MIN_SCALE : MIN_SCALE;
  const maxScale = isMinimap ? MINIMAP_MAX_SCALE : MAX_SCALE;
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
  const [sliderHover, setSliderHover] = useState<{
    nodeId: string;
    part: "track" | "value" | "settings";
  } | null>(null);
  const [focusedSliderId, setFocusedSliderId] = useState<string | null>(null);
  const [inlineEditor, setInlineEditor] = useState<InlineEditorState | null>(null);
  const [sliderPopoverId, setSliderPopoverId] = useState<string | null>(null);
  const inlineEditorRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [gridSnapEnabled, setGridSnapEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(GRID_SNAP_KEY);
    if (stored === null) return true;
    return stored === "true";
  });
  const [showShortcutOverlay, setShowShortcutOverlay] = useState(() => {
    if (typeof window === "undefined" || isMinimap) return false;
    return window.localStorage.getItem(SHORTCUT_OVERLAY_KEY) === "true";
  });
  const spacePanRef = useRef(false);
  const [spacePan, setSpacePan] = useState(false);
  const [pendingReference, setPendingReference] = useState<PendingReference | null>(null);
  const shortcutOverlayEnabled =
    interactionsEnabled && showShortcutOverlay && !captureActive;
  const pointerScreenRef = useRef<Vec2>({ x: 0, y: 0 });
  const rightPanRef = useRef<{ start: Vec2 } | null>(null);
  const suppressContextMenuRef = useRef(false);
  const rightHoldTimeoutRef = useRef<number | null>(null);
  const rightClickHeldRef = useRef(false);

  const nodes = useProjectStore((state) => state.workflow.nodes);
  const edges = useProjectStore((state) => state.workflow.edges);
  const geometry = useProjectStore((state) => state.geometry);
  const selectedGeometryIds = useProjectStore((state) => state.selectedGeometryIds);
  const onNodesChange = useProjectStore((state) => state.onNodesChange);
  const onEdgesChange = useProjectStore((state) => state.onEdgesChange);
  const onConnect = useProjectStore((state) => state.onConnect);
  const deleteSelectedNodes = useProjectStore((state) => state.deleteSelectedNodes);
  const addNodeAt = useProjectStore((state) => state.addNodeAt);
  const addGeometryReferenceNode = useProjectStore((state) => state.addGeometryReferenceNode);
  const syncWorkflowGeometryToRoslyn = useProjectStore((state) => state.syncWorkflowGeometryToRoslyn);
  const setSelectedGeometryIds = useProjectStore((state) => state.setSelectedGeometryIds);
  const updateNodeData = useProjectStore((state) => state.updateNodeData);

  const viewerNodes = useMemo(() => {
    const targets = nodes.filter((node) => node.type === "geometryViewer");
    if (targets.length === 0) return [];
    const layouts = computeNodeLayouts(nodes);
    const availableGeometryIds = new Set(geometry.map((item) => item.id));
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const fallbackId = selectedGeometryIds[0];
    const fallbackGeometryId =
      fallbackId && availableGeometryIds.has(fallbackId) ? fallbackId : null;

    return targets.map((node) => {
      const layout = layouts.get(node.id) ?? computeNodeLayout(node);
      const inputKey = layout.defaultInputKey ?? "geometry";
      const edge = edges.find(
        (entry) =>
          entry.target === node.id &&
          (entry.targetHandle ?? inputKey) === inputKey
      );
      let geometryIds = fallbackGeometryId ? [fallbackGeometryId] : [];

      if (edge) {
        const sourceLayout = layouts.get(edge.source);
        const outputKey = edge.sourceHandle ?? sourceLayout?.defaultOutputKey;
        const sourceNode = nodeById.get(edge.source);
        const outputValue = outputKey
          ? sourceNode?.data?.outputs?.[outputKey]
          : undefined;
        const resolvedIds = collectGeometryIds(outputValue)
          .filter((id) => availableGeometryIds.has(id));
        const uniqueIds = Array.from(new Set(resolvedIds));
        geometryIds = uniqueIds.length > 0 ? uniqueIds : geometryIds;
      }

      return { nodeId: node.id, layout, geometryIds };
    });
  }, [nodes, edges, geometry, selectedGeometryIds]);

  useEffect(() => {
    if (!inlineEditor) return;
    const id = requestAnimationFrame(() => {
      const element = inlineEditorRef.current;
      if (!element) return;
      element.focus();
      if (typeof element.select === "function") {
        element.select();
      }
    });
    return () => cancelAnimationFrame(id);
  }, [inlineEditor]);

  useEffect(() => {
    if (!isMinimap) return;
    if (width <= 0 || height <= 0) return;

    const layouts = computeNodeLayouts(nodes);
    if (layouts.size === 0) {
      setViewTransform((prev) => {
        const next = { x: width / 2, y: height / 2, scale: 1 };
        const same =
          Math.abs(prev.x - next.x) < 0.5 &&
          Math.abs(prev.y - next.y) < 0.5 &&
          Math.abs(prev.scale - next.scale) < 0.001;
        return same ? prev : next;
      });
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    layouts.forEach((layout) => {
      minX = Math.min(minX, layout.x);
      minY = Math.min(minY, layout.y);
      maxX = Math.max(maxX, layout.x + layout.width);
      maxY = Math.max(maxY, layout.y + layout.height);
    });

    const boundsWidth = Math.max(1, maxX - minX);
    const boundsHeight = Math.max(1, maxY - minY);
    const padding = clampValue(
      Math.min(width, height) * 0.12,
      MINIMAP_PADDING_MIN,
      MINIMAP_PADDING_MAX
    );
    const availableWidth = Math.max(1, width - padding * 2);
    const availableHeight = Math.max(1, height - padding * 2);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const fitScale = Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight);
    const scale = clampValue(fitScale, MINIMAP_MIN_SCALE, MINIMAP_MAX_SCALE);
    const next = {
      x: width / 2 - centerX * scale,
      y: height / 2 - centerY * scale,
      scale,
    };

    setViewTransform((prev) => {
      const same =
        Math.abs(prev.x - next.x) < 0.5 &&
        Math.abs(prev.y - next.y) < 0.5 &&
        Math.abs(prev.scale - next.scale) < 0.001;
      return same ? prev : next;
    });
  }, [height, isMinimap, nodes, width]);

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
    if (!canvasInteractive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preventWheelScroll = (event: WheelEvent) => {
      event.preventDefault();
    };
    canvas.addEventListener("wheel", preventWheelScroll, { passive: false });
    return () => canvas.removeEventListener("wheel", preventWheelScroll);
  }, [canvasInteractive]);

  useEffect(() => {
    if (!interactionsEnabled || typeof window === "undefined") return;
    window.localStorage.setItem(GRID_SNAP_KEY, String(gridSnapEnabled));
  }, [gridSnapEnabled, interactionsEnabled]);

  useEffect(() => {
    if (!interactionsEnabled || typeof window === "undefined") return;
    window.localStorage.setItem(SHORTCUT_OVERLAY_KEY, String(showShortcutOverlay));
  }, [showShortcutOverlay, interactionsEnabled]);

  useEffect(() => {
    if (!interactionsEnabled) return;
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
  }, [deleteSelectedNodes, edges, interactionsEnabled, nodes, onEdgesChange]);

  useEffect(() => {
    if (!interactionsEnabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      if (isEditableTarget(event.target)) return;
      if (!spacePanRef.current) {
        spacePanRef.current = true;
        setSpacePan(true);
      }
      event.preventDefault();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      if (spacePanRef.current) {
        spacePanRef.current = false;
        setSpacePan(false);
      }
    };

    const handleBlur = () => {
      spacePanRef.current = false;
      setSpacePan(false);
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [interactionsEnabled]);

  useEffect(() => {
    if (!interactionsEnabled) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
        setPendingReference(null);
        setSliderPopoverId(null);
        setInlineEditor(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [interactionsEnabled]);

  useEffect(() => {
    if (!interactionsEnabled || !focusedSliderId) return;
    if (nodes.some((node) => node.id === focusedSliderId && node.type === "slider")) {
      return;
    }
    setFocusedSliderId(null);
  }, [focusedSliderId, interactionsEnabled, nodes]);

  useEffect(() => {
    if (!interactionsEnabled) return;
    const handleSliderKeyDown = (event: KeyboardEvent) => {
      if (!focusedSliderId) return;
      if (inlineEditor) return;
      if (isEditableTarget(event.target)) return;
      const node = nodes.find((entry) => entry.id === focusedSliderId);
      if (!node || node.type !== "slider") return;
      const config = resolveSliderConfig(node);
      const baseStep = config.step > 0 ? config.step : 1;
      const scale = event.shiftKey ? 0.1 : event.metaKey || event.ctrlKey ? 10 : 1;

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const stepValue = baseStep * scale;
        const nextValue = resolveSliderValue(
          config.value + direction * stepValue,
          config,
          stepValue
        );
        updateNodeData(node.id, { parameters: { value: nextValue } });
        event.preventDefault();
        return;
      }

      if (event.key === "Home") {
        updateNodeData(node.id, { parameters: { value: config.min } });
        event.preventDefault();
        return;
      }

      if (event.key === "End") {
        updateNodeData(node.id, { parameters: { value: config.max } });
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", handleSliderKeyDown);
    return () => window.removeEventListener("keydown", handleSliderKeyDown);
  }, [focusedSliderId, inlineEditor, interactionsEnabled, nodes, updateNodeData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const baseDpr = window.devicePixelRatio || 1;
    const renderScale = isMinimap ? 1.5 : 1;
    const dpr = Math.min(baseDpr * renderScale, 3);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const palette = paletteRef.current;
      const layouts = computeNodeLayouts(nodes);
      layoutRef.current = layouts;
      const connectedInputs = buildConnectedInputSet(edges, layouts);

      const tooltip = captureActive
        ? null
        : resolveHoverTooltip(hoveredTarget, layouts, connectedInputs);
      const backgroundMode =
        captureMode === "white"
          ? "white"
          : captureMode === "transparent"
            ? "transparent"
            : "grid";

      ctx.save();
      ctx.translate(viewTransform.x, viewTransform.y);
      ctx.scale(viewTransform.scale, viewTransform.scale);

      drawBackground(ctx, width, height, viewTransform, palette, backgroundMode);
      drawGroupNodes(ctx, nodes, layouts, hoveredTarget, palette);
      drawConnections(ctx, edges, layouts, hoveredTarget, palette, viewTransform);
      drawNodes(
        ctx,
        nodes,
        edges,
        layouts,
        connectedInputs,
        geometry,
        hoveredTarget,
        palette,
        sliderHover,
        focusedSliderId,
        sliderPopoverId,
        dragState
      );

      if (dragState.type === "edge" && !captureActive) {
        drawEdgePreview(ctx, dragState, layouts, palette, viewTransform);
      }

      ctx.restore();

      if (dragState.type === "box" && !captureActive) {
        drawSelectionBox(ctx, dragState, palette);
      }

      if (tooltip && !captureActive) {
        drawTooltip(ctx, tooltip, pointerScreenRef.current, width, height, palette);
      }

      if (pendingReference && !captureActive) {
        drawPendingReferenceHint(ctx, width, height, palette);
      }

      if (shortcutOverlayEnabled && !captureActive) {
        drawShortcutOverlay(ctx, width, height, palette, gridSnapEnabled);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    width,
    height,
    viewTransform,
    nodes,
    edges,
    hoveredTarget,
    dragState,
    sliderHover,
    focusedSliderId,
    sliderPopoverId,
    pendingReference,
    shortcutOverlayEnabled,
    gridSnapEnabled,
    captureMode,
  ]);

  const screenToWorld = (screenX: number, screenY: number): Vec2 => {
    return {
      x: (screenX - viewTransform.x) / viewTransform.scale,
      y: (screenY - viewTransform.y) / viewTransform.scale,
    };
  };

  const resolveSliderValue = (
    rawValue: number,
    config: SliderInteractionConfig,
    snapStep?: number
  ) => {
    const min = Math.min(config.min, config.max);
    const max = Math.max(config.min, config.max);
    const baseStep = config.step > 0 ? config.step : 1;
    const step = snapStep && snapStep > 0 ? snapStep : baseStep;
    let next = rawValue;
    if (config.snapMode === "step") {
      next = snapNumberToStep(next, step, min);
    }
    if (config.precisionOverride != null) {
      next = roundToPrecision(next, config.precisionOverride);
    }
    return clampValue(next, min, max);
  };

  const setSliderValueFromPointer = (
    nodeId: string,
    bounds: { x: number; y: number; width: number; height: number },
    config: SliderInteractionConfig,
    pointer: Vec2,
    fineAdjust: boolean
  ) => {
    const { min, max, step, snapMode } = config;
    if (!Number.isFinite(min) || !Number.isFinite(max) || bounds.width <= 0) return;
    const clampedMin = Math.min(min, max);
    const clampedMax = Math.max(min, max);
    const t = clampValue((pointer.x - bounds.x) / bounds.width, 0, 1);
    const rawValue = clampedMin + t * (clampedMax - clampedMin);
    const stepValue = snapMode === "step" && fineAdjust ? step / 10 : step;
    const nextValue = resolveSliderValue(rawValue, config, stepValue);
    updateNodeData(nodeId, {
      parameters: {
        value: nextValue,
      },
    });
  };

  const isCanvasActive = () => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    if (document.activeElement === canvas) return true;
    try {
      return canvas.matches(":hover");
    } catch {
      return false;
    }
  };

  const panBy = (dx: number, dy: number) => {
    setViewTransform((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  };

  const zoomAt = (screen: Vec2, scaleFactor: number) => {
    setViewTransform((prev) => {
      const nextScale = clampValue(prev.scale * scaleFactor, minScale, maxScale);
      if (nextScale === prev.scale) return prev;
      const worldX = (screen.x - prev.x) / prev.scale;
      const worldY = (screen.y - prev.y) / prev.scale;
      return {
        scale: nextScale,
        x: screen.x - worldX * nextScale,
        y: screen.y - worldY * nextScale,
      };
    });
  };

  const resetView = () => {
    setViewTransform({
      x: width / 2,
      y: height / 2,
      scale: 1.0,
    });
  };

  const frameNodes = (nodeIds?: Set<string>) => {
    const targetNodes =
      nodeIds && nodeIds.size > 0
        ? nodes.filter((node) => nodeIds.has(node.id))
        : nodes;
    if (targetNodes.length === 0) return;
    const layouts = getLayouts();
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    targetNodes.forEach((node) => {
      const layout = layouts.get(node.id) ?? computeNodeLayout(node);
      if (!layouts.has(node.id)) {
        layouts.set(node.id, layout);
      }
      minX = Math.min(minX, layout.x);
      minY = Math.min(minY, layout.y);
      maxX = Math.max(maxX, layout.x + layout.width);
      maxY = Math.max(maxY, layout.y + layout.height);
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;
    const boundsWidth = Math.max(1, maxX - minX);
    const boundsHeight = Math.max(1, maxY - minY);
    const padding = Math.max(32, Math.min(width, height) * 0.1);
    const availableWidth = Math.max(1, width - padding * 2);
    const availableHeight = Math.max(1, height - padding * 2);
    const scale = clampValue(
      Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight),
      minScale,
      maxScale
    );
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setViewTransform({
      scale,
      x: width / 2 - centerX * scale,
      y: height / 2 - centerY * scale,
    });
  };

  const snapToGrid = (value: number, step: number) => {
    if (!Number.isFinite(step) || step <= 0) return value;
    return Math.round(value / step) * step;
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

  const beginInlineEdit = (type: InlineEditorState["type"], nodeId: string) => {
    const node = nodes.find((entry) => entry.id === nodeId);
    if (!node) return;
    const parameters = resolveNodeParameters(node);
    const current =
      type === "group"
        ? typeof parameters.title === "string" && parameters.title.trim().length > 0
          ? parameters.title
          : node.data?.label ?? "Group"
        : typeof parameters.text === "string"
          ? parameters.text
          : "";
    setInlineEditor({ type, nodeId, value: current, original: current });
    setSliderPopoverId(null);
    setContextMenu(null);
    setNodeSelection(nodeId, false);
  };

  const beginSliderValueEdit = (nodeId: string) => {
    const node = nodes.find((entry) => entry.id === nodeId);
    if (!node || node.type !== "slider") return;
    const parameters = resolveNodeParameters(node);
    const sliderConfig = resolveSliderConfig(node);
    const rawValue = parameters.value;
    const initial =
      typeof rawValue === "number" || typeof rawValue === "string"
        ? String(rawValue)
        : formatSliderValue(
            sliderConfig.value,
            sliderConfig.step,
            sliderConfig.snapMode,
            sliderConfig.precisionOverride
          );
    setInlineEditor({ type: "slider", nodeId, value: initial, original: initial });
    setSliderPopoverId(null);
    setContextMenu(null);
    setNodeSelection(nodeId, false);
    setFocusedSliderId(nodeId);
  };

  const commitInlineEdit = () => {
    if (!inlineEditor) return;
    if (inlineEditor.type === "group") {
      const trimmed = inlineEditor.value.trim();
      const nextTitle =
        trimmed.length > 0 ? trimmed : inlineEditor.original.trim() || "Group";
      updateNodeData(inlineEditor.nodeId, {
        label: nextTitle,
        parameters: { title: nextTitle },
      });
    } else if (inlineEditor.type === "note") {
      updateNodeData(inlineEditor.nodeId, {
        parameters: { text: inlineEditor.value },
      });
    } else {
      const node = nodes.find((entry) => entry.id === inlineEditor.nodeId);
      if (node && node.type === "slider") {
        const trimmed = inlineEditor.value.trim();
        const parsed = trimmed.length > 0 ? Number(trimmed) : Number.NaN;
        if (Number.isFinite(parsed)) {
          const config = resolveSliderConfig(node);
          const nextValue = resolveSliderValue(parsed, config, config.step);
          updateNodeData(node.id, { parameters: { value: nextValue } });
        }
      }
    }
    setInlineEditor(null);
  };

  const cancelInlineEdit = () => {
    setInlineEditor(null);
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

  const addTextNoteAt = (world: Vec2) => {
    const noteIndex = nodes.filter((node) => node.type === "textNote").length + 1;
    const noteId = addNodeAt("textNote", { x: world.x, y: world.y });
    updateNodeData(noteId, {
      label: `Note ${noteIndex}`,
      parameters: { text: "Edit me!" },
    });
    onNodesChange([
      ...nodes
        .filter((node) => node.selected)
        .map((node) => ({ id: node.id, type: "select" as const, selected: false })),
      { id: noteId, type: "select" as const, selected: true },
    ]);
  };

  const createGroupFromSelection = () => {
    const selectedNodes = nodes.filter(
      (node) => node.selected && node.type !== "group"
    );
    if (selectedNodes.length < 2) return;
    const layouts = getLayouts();
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    selectedNodes.forEach((node) => {
      const layout = layouts.get(node.id) ?? computeNodeLayout(node);
      if (!layouts.has(node.id)) {
        layouts.set(node.id, layout);
      }
      minX = Math.min(minX, layout.x);
      minY = Math.min(minY, layout.y);
      maxX = Math.max(maxX, layout.x + layout.width);
      maxY = Math.max(maxY, layout.y + layout.height);
    });
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;
    const width = Math.max(GROUP_MIN_WIDTH, maxX - minX + GROUP_PADDING * 2);
    const height = Math.max(
      GROUP_MIN_HEIGHT,
      maxY - minY + GROUP_PADDING * 2 + GROUP_HEADER_HEIGHT
    );
    const position = {
      x: minX - GROUP_PADDING,
      y: minY - GROUP_PADDING - GROUP_HEADER_HEIGHT,
    };
    const groupIndex = nodes.filter((node) => node.type === "group").length + 1;
    const title = `Group ${groupIndex}`;
    const groupId = addNodeAt("group", position);
    updateNodeData(groupId, {
      label: title,
      groupSize: { width, height },
      groupNodeIds: selectedNodes.map((node) => node.id),
      parameters: { title },
    });
    const changes = [
      ...nodes
        .filter((node) => node.selected)
        .map((node) => ({ id: node.id, type: "select" as const, selected: false })),
      { id: groupId, type: "select" as const, selected: true },
    ];
    onNodesChange(changes);
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

  useEffect(() => {
    if (!interactionsEnabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (!isCanvasActive()) return;

      const key = event.key;
      if ((event.metaKey || event.ctrlKey) && key.toLowerCase() === "a") {
        event.preventDefault();
        const allNodes = new Set(nodes.map((node) => node.id));
        applyNodeSelection(allNodes, false);
        return;
      }

      if (key.toLowerCase() === "f") {
        event.preventDefault();
        const selectedIds = new Set(
          nodes.filter((node) => node.selected).map((node) => node.id)
        );
        if (event.shiftKey || selectedIds.size === 0) {
          frameNodes();
        } else {
          frameNodes(selectedIds);
        }
        return;
      }

      if (key === "0") {
        event.preventDefault();
        resetView();
        return;
      }

      if (key === "?") {
        event.preventDefault();
        setShowShortcutOverlay((prev) => !prev);
        return;
      }

      if (key.toLowerCase() === "g") {
        event.preventDefault();
        setGridSnapEnabled((prev) => !prev);
        return;
      }

      if (key.startsWith("Arrow")) {
        event.preventDefault();
        const base = event.shiftKey ? 140 : 70;
        switch (key) {
          case "ArrowLeft":
            panBy(-base, 0);
            break;
          case "ArrowRight":
            panBy(base, 0);
            break;
          case "ArrowUp":
            panBy(0, -base);
            break;
          case "ArrowDown":
            panBy(0, base);
            break;
          default:
            break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    applyNodeSelection,
    frameNodes,
    interactionsEnabled,
    isCanvasActive,
    nodes,
    panBy,
    resetView,
    width,
    height,
  ]);

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
    setSelectedGeometryIds([geometryId]);
  };

  const referenceGeometryToNode = (geometryId: string, world: Vec2, targetNodeId: string) => {
    const geometryInputKey = getFirstGeometryInputKey(targetNodeId);
    const node = nodes.find((entry) => entry.id === targetNodeId);
    const isGeometryReference = node?.type === "geometryReference";

    if (isGeometryReference) {
      updateNodeData(targetNodeId, {
        geometryId,
        geometryType: geometry.find((item) => item.id === geometryId)?.type,
        isLinked: true,
        label: geometryId,
      });
      setSelectedGeometryIds([geometryId]);
      return;
    }

    if (geometryInputKey) {
      connectReferenceToPort(geometryId, world, targetNodeId, geometryInputKey);
      return;
    }

    ensureGeometryReferenceAt(geometryId, world);
    setSelectedGeometryIds([geometryId]);
  };

  useEffect(() => {
    if (!pendingReference) return;
    if (!selectedGeometryId) return;

    if (pendingReference.kind === "port") {
      connectReferenceToPort(
        selectedGeometryId,
        pendingReference.world,
        pendingReference.nodeId,
        pendingReference.portKey
      );
    } else if (pendingReference.kind === "node") {
      referenceGeometryToNode(
        selectedGeometryId,
        pendingReference.world,
        pendingReference.nodeId
      );
    } else {
      ensureGeometryReferenceAt(selectedGeometryId, pendingReference.world);
      setSelectedGeometryIds([selectedGeometryId]);
    }

    setPendingReference(null);
  }, [
    pendingReference,
    selectedGeometryId,
    geometry,
    nodes,
  ]);

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
    if (!interactionsEnabled) return [];
    if (!contextMenu) return [];
    const actions: ContextMenuAction[] = [];
    const closeMenu = (action: () => void) => () => {
      action();
      setContextMenu(null);
    };
    const geometryLabel = selectedGeometryId
      ? `Reference Selected Geometry (${selectedGeometryId})`
      : "Reference Selected Geometry";
    const pickLabel = "Refer to Object";
    const groupSelectionCount = nodes.filter(
      (node) => node.selected && node.type !== "group"
    ).length;

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
          label: pickLabel,
          onSelect: closeMenu(() =>
            setPendingReference({
              kind: "port",
              nodeId: target.nodeId,
              portKey: target.portKey,
              world,
            })
          ),
        });
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
      const nodeInputEdges = edges.filter((edge) => edge.target === target.nodeId);
      const nodeOutputEdges = edges.filter((edge) => edge.source === target.nodeId);
      const geometryOutputKey = getGeometryOutputKey(target.nodeId);
      const node = nodes.find((entry) => entry.id === target.nodeId);
      if (geometryOutputKey) {
        actions.push({
          label: "Ontologize to Roslyn",
          onSelect: closeMenu(() => ontologizeNode(target.nodeId)),
        });
      }

      actions.push({
        label: "Frame Node",
        onSelect: closeMenu(() => frameNodes(new Set([target.nodeId]))),
      });

      if (node?.type === "group") {
        actions.push({
          label: "Rename Group",
          onSelect: closeMenu(() => {
            beginInlineEdit("group", target.nodeId);
          }),
        });
      }

      if (node?.type === "textNote") {
        actions.push({
          label: "Edit Note",
          onSelect: closeMenu(() => {
            beginInlineEdit("note", target.nodeId);
          }),
        });
      }

      if (groupSelectionCount > 1) {
        actions.push({
          label: "Group Selection",
          onSelect: closeMenu(() => createGroupFromSelection()),
        });
      }

      if (node?.type === "slider") {
        actions.push({
          label: "Slider Settings",
          onSelect: closeMenu(() => {
            setSliderPopoverId(target.nodeId);
          }),
        });
      }

      if (nodeInputEdges.length > 0) {
        actions.push({
          label: "Disconnect Inputs",
          onSelect: closeMenu(() =>
            removeEdgesByIds(nodeInputEdges.map((edge) => edge.id))
          ),
          danger: true,
        });
      }

      if (nodeOutputEdges.length > 0) {
        actions.push({
          label: "Disconnect Outputs",
          onSelect: closeMenu(() =>
            removeEdgesByIds(nodeOutputEdges.map((edge) => edge.id))
          ),
          danger: true,
        });
      }

      const geometryInputKey = getFirstGeometryInputKey(target.nodeId);
      const isGeometryReference = node?.type === "geometryReference";

      actions.push({
        label: pickLabel,
        onSelect: closeMenu(() =>
          setPendingReference({
            kind: "node",
            nodeId: target.nodeId,
            world,
          })
        ),
      });

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

      actions.push({
        label: "Delete Node",
        onSelect: closeMenu(() => {
          const edgeIds = new Set<string>();
          nodeInputEdges.forEach((edge) => edgeIds.add(edge.id));
          nodeOutputEdges.forEach((edge) => edgeIds.add(edge.id));
          if (edgeIds.size > 0) {
            removeEdgesByIds(Array.from(edgeIds));
          }
          onNodesChange([{ id: target.nodeId, type: "remove" as const }]);
        }),
        danger: true,
      });
      return actions;
    }

    const world = contextMenu.world;
    const selectedNodeIds = new Set(
      nodes.filter((node) => node.selected).map((node) => node.id)
    );
    if (selectedNodeIds.size > 0) {
      actions.push({
        label: "Frame Selection",
        onSelect: closeMenu(() => frameNodes(selectedNodeIds)),
      });
    }
    if (groupSelectionCount > 1) {
      actions.push({
        label: "Group Selection",
        onSelect: closeMenu(() => createGroupFromSelection()),
      });
    }
    actions.push({
      label: "Add Text Note",
      onSelect: closeMenu(() => addTextNoteAt(world)),
    });
    actions.push({
      label: "Frame All Nodes",
      onSelect: closeMenu(() => frameNodes()),
    });
    actions.push({
      label: "Zoom In",
      onSelect: closeMenu(() => zoomAt(contextMenu.screen, ZOOM_STEP)),
    });
    actions.push({
      label: "Zoom Out",
      onSelect: closeMenu(() => zoomAt(contextMenu.screen, 1 / ZOOM_STEP)),
    });
    actions.push({
      label: "Reset View",
      onSelect: closeMenu(() => resetView()),
    });
    actions.push({
      label: gridSnapEnabled ? "Disable Grid Snap" : "Enable Grid Snap",
      onSelect: closeMenu(() => setGridSnapEnabled((prev) => !prev)),
    });
    actions.push({
      label: shortcutOverlayEnabled ? "Hide Shortcuts" : "Show Shortcuts",
      onSelect: closeMenu(() => setShowShortcutOverlay((prev) => !prev)),
    });
    actions.push({
      label: pickLabel,
      onSelect: closeMenu(() =>
        setPendingReference({
          kind: "canvas",
          world,
        })
      ),
    });
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
    frameNodes,
    zoomAt,
    resetView,
    gridSnapEnabled,
    interactionsEnabled,
    shortcutOverlayEnabled,
    addTextNoteAt,
    beginInlineEdit,
    createGroupFromSelection,
    setSliderPopoverId,
    width,
    height,
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
    if (label.includes("delete")) return "delete";
    if (label.includes("disconnect")) return "delete";
    if (label.includes("frame all")) return "frameAll";
    if (label.includes("frame")) return "focus";
    if (label.includes("zoom")) return "zoomCursor";
    if (label.includes("reset view")) return "focus";
    if (label.includes("grid snap")) return "selectionFilter";
    if (label.includes("snap")) return "selectionFilter";
    if (label.includes("shortcuts")) return "advanced";
    if (label.includes("refer to object")) return "referenceActive";
    if (label.includes("reference")) return "geometryReference";
    if (label.includes("ontologize")) return "brandRoslyn";
    if (label.includes("slider")) return "numberConstant";
    return "advanced";
  };

  const resolveContextMenuShortLabel = (action: ContextMenuAction) => {
    const label = action.label;
    if (label.startsWith("Refer to Object")) return "Refer";
    if (label.startsWith("Reference Selected Geometry")) {
      if (!selectedGeometryId) return "Reference";
      const shortId = selectedGeometryId.slice(0, 6);
      return `Ref ${shortId}`;
    }
    if (label.startsWith("Delete")) return "Delete";
    if (label.startsWith("Frame Selection")) return "Frame Sel";
    if (label.startsWith("Frame All")) return "Frame All";
    if (label.startsWith("Frame Node")) return "Frame Node";
    if (label.startsWith("Reset View")) return "Reset";
    if (label.startsWith("Zoom In")) return "Zoom +";
    if (label.startsWith("Zoom Out")) return "Zoom -";
    if (label.startsWith("Enable Grid Snap")) return "Snap On";
    if (label.startsWith("Disable Grid Snap")) return "Snap Off";
    if (label.startsWith("Show Shortcuts")) return "Help On";
    if (label.startsWith("Hide Shortcuts")) return "Help Off";
    if (label.startsWith("Disconnect")) return "Disconnect";
    if (label.startsWith("Ontologize")) return "Ontologize";
    return label;
  };

  const resolveHoverTooltip = (
    target: HitTarget,
    layouts: Map<string, NodeLayout>,
    connectedInputs: Map<string, Set<string>>
  ): TooltipData | null => {
    if (target.type === "none") return null;

    if (target.type === "node") {
      const context = getNodeContext(target.nodeId);
      if (!context) return null;
      const label =
        context.definition?.label ?? context.node.data?.label ?? context.node.type ?? "Node";
      const lines = buildNodeTooltipLines(context.definition ?? undefined, context.ports);
      const layout = layouts.get(target.nodeId);
      if (layout) {
        const missing = getMissingRequiredInputs(layout, connectedInputs.get(target.nodeId));
        if (missing.length > 0) {
          lines.push(`Needs: ${missing.join(", ")}`);
        }
      }
      if (context.node.data?.evaluationError) {
        lines.push(`Error: ${context.node.data.evaluationError}`);
      }
      return { title: label, lines };
    }

    if (target.type === "port") {
      const port = getPortSpec(target.nodeId, target.portKey, target.isOutput);
      const portLabel = port?.label ?? target.portKey;
      const title = `${portLabel} ${target.isOutput ? "Output" : "Input"}`;
      const lines: string[] = [];
      if (port) {
        lines.push(`Type: ${port.type}`);
        if (!target.isOutput && port.required) {
          lines.push("Required input");
        }
        if (port.description) {
          lines.push(port.description);
        }
      }
      return { title, lines };
    }

    if (target.type === "edge") {
      const edge = edges.find((entry) => entry.id === target.edgeId);
      if (!edge) return null;
      const sourceNode = nodes.find((node) => node.id === edge.source);
      const targetNode = nodes.find((node) => node.id === edge.target);
      const sourceLayout = layouts.get(edge.source);
      const targetLayout = layouts.get(edge.target);
      const sourcePort = sourceLayout
        ? resolvePortLayout(sourceLayout, edge.sourceHandle, true)?.port
        : null;
      const targetPort = targetLayout
        ? resolvePortLayout(targetLayout, edge.targetHandle, false)?.port
        : null;
      const sourceLabel = sourcePort?.label ?? edge.sourceHandle ?? "Output";
      const targetLabel = targetPort?.label ?? edge.targetHandle ?? "Input";
      const title = "Connection";
      const sourceNodeLabel =
        sourceNode?.data?.label ?? sourceNode?.type ?? edge.source;
      const targetNodeLabel =
        targetNode?.data?.label ?? targetNode?.type ?? edge.target;
      const lines = [`${sourceNodeLabel}:${sourceLabel} → ${targetNodeLabel}:${targetLabel}`];
      return { title, lines };
    }

    return null;
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
    const orderedNodes = [
      ...nodes.filter((node) => node.type === "group"),
      ...nodes.filter((node) => node.type !== "group"),
    ];

    for (let i = orderedNodes.length - 1; i >= 0; i -= 1) {
      const node = orderedNodes[i];
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
    canvas.focus();

    if (panZoomEnabled) {
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      pointerScreenRef.current = { x: screenX, y: screenY };
      if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
      if (contextMenu) {
        setContextMenu(null);
      }
      try {
        if (!canvas.hasPointerCapture(e.pointerId)) {
          canvas.setPointerCapture(e.pointerId);
        }
      } catch {
        // Pointer capture is best-effort; keep interactions working without it.
      }
      setDragState({
        type: "pan",
        startPos: { x: screenX, y: screenY },
        startTransform: { ...viewTransform },
      });
      e.preventDefault();
      return;
    }

    suppressContextMenuRef.current = false;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    pointerScreenRef.current = { x: screenX, y: screenY };
    const world = screenToWorld(screenX, screenY);
    const target = hitTest(world.x, world.y);
    const isMultiSelect = e.metaKey || e.ctrlKey;
    const targetNode =
      target.type === "node" ? nodes.find((entry) => entry.id === target.nodeId) : null;
    if (!targetNode || targetNode.type !== "slider") {
      setFocusedSliderId((prev) => (prev ? null : prev));
    }

    if (e.button !== 2 && contextMenu) {
      setContextMenu(null);
    }

    if (
      sliderPopoverId &&
      (target.type !== "node" || target.nodeId !== sliderPopoverId)
    ) {
      setSliderPopoverId(null);
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
      rightClickHeldRef.current = false;
      if (rightHoldTimeoutRef.current) {
        window.clearTimeout(rightHoldTimeoutRef.current);
      }
      rightHoldTimeoutRef.current = window.setTimeout(() => {
        rightClickHeldRef.current = true;
      }, RIGHT_CLICK_HOLD_MS);
      rightPanRef.current = { start: { x: screenX, y: screenY } };
      setDragState({
        type: "pan",
        startPos: { x: screenX, y: screenY },
        startTransform: { ...viewTransform },
      });
      return;
    }

    if (e.button === 1 || (e.button === 0 && (e.shiftKey || spacePanRef.current))) {
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
        if (node.type === "group") {
          const layouts = getLayouts();
          const layout = layouts.get(node.id) ?? computeNodeLayout(node);
          if (!layouts.has(node.id)) {
            layouts.set(node.id, layout);
          }
          if (isPointInGroupResizeHandle(world, layout) && e.button === 0) {
            if (e.button === 0) {
              setNodeSelection(target.nodeId, isMultiSelect);
            }
            setDragState({
              type: "resize",
              nodeId: node.id,
              startWorld: world,
              startSize: { width: layout.width, height: layout.height },
            });
            e.preventDefault();
            return;
          }
        }
        if (node.type === "slider") {
          const layouts = getLayouts();
          const layout = layouts.get(node.id) ?? computeNodeLayout(node);
          if (!layouts.has(node.id)) {
            layouts.set(node.id, layout);
          }
          const sliderBounds = getSliderBounds(layout);
          const valueBounds = getSliderValueBounds(layout);
          const settingsBounds = getSliderSettingsBounds(layout);
          if (!isMultiSelect) {
            if (isPointInRect(world, settingsBounds) && e.button === 0) {
              setNodeSelection(target.nodeId, isMultiSelect);
              setFocusedSliderId(node.id);
              setSliderPopoverId((prev) => (prev === node.id ? null : node.id));
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            if (isPointInRect(world, valueBounds) && e.button === 0) {
              beginSliderValueEdit(node.id);
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            if (isPointInRect(world, sliderBounds)) {
              if (e.button === 0) {
                setNodeSelection(target.nodeId, isMultiSelect);
              }
              const sliderConfig = resolveSliderConfig(node);
              setSliderValueFromPointer(
                node.id,
                sliderBounds,
                sliderConfig,
                world,
                e.shiftKey
              );
              setDragState({
                type: "slider",
                nodeId: node.id,
                bounds: sliderBounds,
                min: sliderConfig.min,
                max: sliderConfig.max,
                step: sliderConfig.step,
                snapMode: sliderConfig.snapMode,
                precisionOverride: sliderConfig.precisionOverride,
              });
              setFocusedSliderId(node.id);
              e.preventDefault();
              e.stopPropagation();
              return;
            }
          }
        }
        if (node.type === "slider") {
          setFocusedSliderId(node.id);
        }
        const selectedNodes = nodes.filter((entry) => entry.selected);
        const hasMultipleSelected = selectedNodes.length > 1;
        const isAlreadySelected = Boolean(node.selected);
        if (e.button === 0) {
          if (!(isAlreadySelected && hasMultipleSelected && !isMultiSelect)) {
            setNodeSelection(target.nodeId, isMultiSelect);
          }
        }
        const dragSeeds =
          hasMultipleSelected && isAlreadySelected ? selectedNodes : [node];
        const dragNodeMap = new Map<string, { id: string; startPos: Vec2 }>();
        dragSeeds.forEach((entry) => {
          dragNodeMap.set(entry.id, {
            id: entry.id,
            startPos: { x: entry.position.x, y: entry.position.y },
          });
        });
        if (node.type === "group" && Array.isArray(node.data?.groupNodeIds)) {
          node.data.groupNodeIds.forEach((groupNodeId) => {
            const member = nodes.find((entry) => entry.id === groupNodeId);
            if (!member) return;
            dragNodeMap.set(member.id, {
              id: member.id,
              startPos: { x: member.position.x, y: member.position.y },
            });
          });
        }
        const dragNodes = Array.from(dragNodeMap.values());
        setDragState({
          type: "node",
          nodeId: target.nodeId,
          startPos: { x: screenX, y: screenY },
          nodeStartPos: { x: node.position.x, y: node.position.y },
          dragNodes,
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

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactionsEnabled || panZoomEnabled || inlineEditor) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);
    const target = hitTest(world.x, world.y);
    if (target.type !== "node") return;
    const node = nodes.find((entry) => entry.id === target.nodeId);
    if (!node) return;
    const layouts = getLayouts();
    const layout = layouts.get(node.id) ?? computeNodeLayout(node);
    if (!layouts.has(node.id)) {
      layouts.set(node.id, layout);
    }
    if (node.type === "group") {
      const inHeader =
        world.x >= layout.x &&
        world.x <= layout.x + layout.width &&
        world.y >= layout.y &&
        world.y <= layout.y + GROUP_HEADER_HEIGHT;
      if (inHeader) {
        beginInlineEdit("group", node.id);
      }
      return;
    }
    if (node.type === "textNote") {
      beginInlineEdit("note", node.id);
      return;
    }
    if (node.type === "slider") {
      setSliderPopoverId(node.id);
      setFocusedSliderId(node.id);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    pointerScreenRef.current = { x: screenX, y: screenY };
    const world = screenToWorld(screenX, screenY);

    if (dragState.type === "pan") {
      const dx = screenX - dragState.startPos.x;
      const dy = screenY - dragState.startPos.y;
      if (rightPanRef.current) {
        const distance = Math.hypot(
          screenX - rightPanRef.current.start.x,
          screenY - rightPanRef.current.start.y
        );
        if (distance > 4) {
          suppressContextMenuRef.current = true;
          rightClickHeldRef.current = true;
        }
      }
      setViewTransform({
        x: dragState.startTransform.x + dx,
        y: dragState.startTransform.y + dy,
        scale: dragState.startTransform.scale,
      });
      return;
    }

    if (panZoomEnabled) {
      return;
    }

    if (dragState.type === "slider") {
      setSliderValueFromPointer(
        dragState.nodeId,
        dragState.bounds,
        {
          min: dragState.min,
          max: dragState.max,
          step: dragState.step,
          snapMode: dragState.snapMode,
          precisionOverride: dragState.precisionOverride,
        },
        world,
        e.shiftKey
      );
      setSliderHover({ nodeId: dragState.nodeId, part: "track" });
      return;
    }

    if (dragState.type === "resize") {
      const dx = world.x - dragState.startWorld.x;
      const dy = world.y - dragState.startWorld.y;
      let nextWidth = dragState.startSize.width + dx;
      let nextHeight = dragState.startSize.height + dy;
      if (gridSnapEnabled && !e.altKey) {
        const { minor } = resolveGridSteps(viewTransform.scale);
        nextWidth = snapToGrid(nextWidth, minor);
        nextHeight = snapToGrid(nextHeight, minor);
      }
      updateNodeData(dragState.nodeId, {
        groupSize: {
          width: Math.max(GROUP_MIN_WIDTH, nextWidth),
          height: Math.max(GROUP_MIN_HEIGHT, nextHeight),
        },
      });
      return;
    }

    if (dragState.type === "node") {
      const dx = (screenX - dragState.startPos.x) / viewTransform.scale;
      const dy = (screenY - dragState.startPos.y) / viewTransform.scale;
      let nextDx = dx;
      let nextDy = dy;
      if (gridSnapEnabled && !e.altKey) {
        const { minor } = resolveGridSteps(viewTransform.scale);
        const snappedX = snapToGrid(dragState.nodeStartPos.x + dx, minor);
        const snappedY = snapToGrid(dragState.nodeStartPos.y + dy, minor);
        nextDx = snappedX - dragState.nodeStartPos.x;
        nextDy = snappedY - dragState.nodeStartPos.y;
      }

      const changes = dragState.dragNodes.map((entry) => ({
        id: entry.id,
        type: "position" as const,
        position: {
          x: entry.startPos.x + nextDx,
          y: entry.startPos.y + nextDy,
        },
      }));
      onNodesChange(changes);
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
    let nextSliderHover: { nodeId: string; part: "track" | "value" | "settings" } | null =
      null;
    if (target.type === "node") {
      const node = nodes.find((entry) => entry.id === target.nodeId);
      if (node?.type === "slider") {
        const layouts = getLayouts();
        const layout = layouts.get(node.id) ?? computeNodeLayout(node);
        if (!layouts.has(node.id)) {
          layouts.set(node.id, layout);
        }
        const sliderBounds = getSliderBounds(layout);
        const valueBounds = getSliderValueBounds(layout);
        const settingsBounds = getSliderSettingsBounds(layout);
        if (isPointInRect(world, settingsBounds)) {
          nextSliderHover = { nodeId: node.id, part: "settings" };
        } else if (isPointInRect(world, valueBounds)) {
          nextSliderHover = { nodeId: node.id, part: "value" };
        } else if (isPointInRect(world, sliderBounds)) {
          nextSliderHover = { nodeId: node.id, part: "track" };
        }
      }
    }
    setSliderHover(nextSliderHover);
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

    if (panZoomEnabled) {
      setDragState({ type: "none" });
      return;
    }

    if (pendingNodeType && onDropNode && dragState.type === "none" && e.button === 0) {
      onDropNode(pendingNodeType, world);
      setContextMenu(null);
      setDragState({ type: "none" });
      return;
    }

    if (dragState.type === "slider") {
      setDragState({ type: "none" });
      return;
    }

    if (dragState.type === "resize") {
      setDragState({ type: "none" });
      return;
    }

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

    if (rightPanRef.current) {
      rightPanRef.current = null;
    }
    if (rightHoldTimeoutRef.current) {
      window.clearTimeout(rightHoldTimeoutRef.current);
      rightHoldTimeoutRef.current = null;
    }
    setDragState({ type: "none" });
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (contextMenu) {
      setContextMenu(null);
    }
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    pointerScreenRef.current = { x: screenX, y: screenY };

    const DOM_DELTA_LINE = 1;
    const DOM_DELTA_PAGE = 2;
    const lineHeight = 16;
    let deltaX = e.deltaX;
    let deltaY = e.deltaY;

    if (e.deltaMode === DOM_DELTA_LINE) {
      deltaX *= lineHeight;
      deltaY *= lineHeight;
    } else if (e.deltaMode === DOM_DELTA_PAGE) {
      deltaX *= width;
      deltaY *= height;
    }

    const isZoomGesture = e.ctrlKey || e.metaKey || e.deltaMode === DOM_DELTA_LINE;
    if (isZoomGesture) {
      const delta = deltaY !== 0 ? deltaY : deltaX;
      const scaleFactor = Math.exp(-delta * ZOOM_SPEED);
      zoomAt({ x: screenX, y: screenY }, scaleFactor);
      return;
    }

    const world = screenToWorld(screenX, screenY);
    const target = hitTest(world.x, world.y);
    if (target.type === "node") {
      const node = nodes.find((entry) => entry.id === target.nodeId);
      if (node?.type === "slider") {
        const layouts = getLayouts();
        const layout = layouts.get(node.id) ?? computeNodeLayout(node);
        if (!layouts.has(node.id)) {
          layouts.set(node.id, layout);
        }
        const sliderBounds = getSliderBounds(layout);
        const valueBounds = getSliderValueBounds(layout);
        const isOverSlider =
          isPointInRect(world, sliderBounds) || isPointInRect(world, valueBounds);
        if (isOverSlider && (focusedSliderId === node.id || e.altKey)) {
          const config = resolveSliderConfig(node);
          const baseStep = config.step > 0 ? config.step : 1;
          const scale = e.shiftKey ? 0.1 : 1;
          const wheelDelta = deltaY !== 0 ? deltaY : deltaX;
          if (wheelDelta !== 0) {
            const direction = -Math.sign(wheelDelta);
            const stepDelta = baseStep * scale * direction;
            const nextValue = resolveSliderValue(
              config.value + stepDelta,
              config,
              baseStep * scale
            );
            updateNodeData(node.id, { parameters: { value: nextValue } });
            setFocusedSliderId(node.id);
            return;
          }
        }
      }
    }
    if (target.type === "node") {
      const node = nodes.find((entry) => entry.id === target.nodeId);
      if (node?.type === "panel") {
        const layouts = getLayouts();
        const layout = layouts.get(node.id) ?? computeNodeLayout(node);
        if (!layouts.has(node.id)) {
          layouts.set(node.id, layout);
        }
        const panelBounds = getPanelContentBounds(layout);
        if (isPointInRect(world, panelBounds)) {
          const rawLines = layout.panelLines ?? ["—"];
          const visibleLines = Math.max(
            1,
            Math.floor(panelBounds.height / PANEL_LINE_HEIGHT)
          );
          const maxScroll = Math.max(0, rawLines.length - visibleLines);
          if (maxScroll > 0) {
            const baseStep = Math.max(1, PANEL_LINE_HEIGHT * viewTransform.scale);
            const stepCount = Math.max(1, Math.round(Math.abs(deltaY) / baseStep));
            const scrollDelta = Math.sign(deltaY) * stepCount;
            const current = Math.round(readNumber(node.data?.panelScroll, 0));
            const next = Math.min(maxScroll, Math.max(0, current + scrollDelta));
            if (next !== current) {
              updateNodeData(node.id, { panelScroll: next });
            }
            return;
          }
          if (node.data?.panelScroll) {
            updateNodeData(node.id, { panelScroll: 0 });
          }
        }
      }
    }

    setViewTransform((prev) => ({
      ...prev,
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    event.preventDefault();
    if (panZoomEnabled) return;
    if (suppressContextMenuRef.current || rightClickHeldRef.current) {
      suppressContextMenuRef.current = false;
      rightClickHeldRef.current = false;
      return;
    }

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

  const canvasBackground = captureActive
    ? captureMode === "white"
      ? "#ffffff"
      : "transparent"
    : "var(--color-bg)";

  const inlineEditorNode = inlineEditor
    ? nodes.find((node) => node.id === inlineEditor.nodeId) ?? null
    : null;
  const inlineEditorLayout = inlineEditorNode
    ? getLayouts().get(inlineEditorNode.id) ?? computeNodeLayout(inlineEditorNode)
    : null;
  const inlineEditorScreen =
    inlineEditorLayout && inlineEditor?.type !== "slider"
      ? {
          left: inlineEditorLayout.x * viewTransform.scale + viewTransform.x,
          top: inlineEditorLayout.y * viewTransform.scale + viewTransform.y,
          width: inlineEditorLayout.width * viewTransform.scale,
          height: inlineEditorLayout.height * viewTransform.scale,
        }
      : null;
  const sliderValueScreen =
    inlineEditorLayout && inlineEditor?.type === "slider"
      ? (() => {
          const bounds = getSliderValueBounds(inlineEditorLayout);
          return {
            left: bounds.x * viewTransform.scale + viewTransform.x,
            top: bounds.y * viewTransform.scale + viewTransform.y,
            width: bounds.width * viewTransform.scale,
            height: bounds.height * viewTransform.scale,
          };
        })()
      : null;

  const sliderPopoverNode = sliderPopoverId
    ? nodes.find((node) => node.id === sliderPopoverId) ?? null
    : null;
  const sliderPopoverLayout = sliderPopoverNode
    ? getLayouts().get(sliderPopoverNode.id) ?? computeNodeLayout(sliderPopoverNode)
    : null;
  const sliderPopoverConfig =
    sliderPopoverNode && sliderPopoverNode.type === "slider"
      ? resolveSliderConfig(sliderPopoverNode)
      : null;
  const sliderPopoverScreen = sliderPopoverLayout
    ? {
        left:
          sliderPopoverLayout.x * viewTransform.scale +
          viewTransform.x +
          sliderPopoverLayout.width * viewTransform.scale +
          12,
        top: sliderPopoverLayout.y * viewTransform.scale + viewTransform.y,
        width: 220,
      }
    : null;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
      }}
    >
      {interactionsEnabled && (
        <div
          style={{
            position: "absolute",
            left: "12px",
            top: "10px",
            zIndex: 4,
          }}
          data-capture-hide="true"
        >
          <WebGLButton
            label="Shortcuts"
            shortLabel="Help"
            iconId="advanced"
            variant="command"
            size="sm"
            shape="rounded"
            active={shortcutOverlayEnabled}
            hideLabel
            tooltip="Shortcuts"
            tooltipShortcut="?"
            tooltipPosition="right"
            onClick={() => {
              setContextMenu(null);
              setShowShortcutOverlay((prev) => !prev);
            }}
          />
        </div>
      )}
      <canvas
        ref={canvasRef}
        tabIndex={canvasInteractive ? 0 : -1}
        aria-label="Numerica canvas"
        onPointerDown={canvasInteractive ? handlePointerDown : undefined}
        onPointerMove={canvasInteractive ? handlePointerMove : undefined}
        onPointerUp={canvasInteractive ? handlePointerUp : undefined}
        onDoubleClick={canvasInteractive ? handleDoubleClick : undefined}
        onWheel={canvasInteractive ? handleWheel : undefined}
        onContextMenu={canvasInteractive ? handleContextMenu : undefined}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          background: canvasBackground,
          cursor: panZoomEnabled
            ? dragState.type === "pan"
              ? "grabbing"
              : "grab"
            : dragState.type === "pan"
              ? "grabbing"
              : spacePan
                ? "grab"
                : dragState.type === "resize"
                ? "nwse-resize"
                : dragState.type === "slider"
                ? "ew-resize"
                : sliderHover?.part === "value"
                  ? "text"
                  : sliderHover?.part === "settings"
                    ? "pointer"
                    : sliderHover?.part === "track"
                      ? "ew-resize"
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
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        {viewerNodes.map((viewer) => {
          const scale = viewTransform.scale;
          const frameLeft =
            viewer.layout.x * scale + viewTransform.x + VIEWER_INSET * scale;
          const frameTop =
            viewer.layout.y * scale + viewTransform.y + VIEWER_TOP_OFFSET * scale;
          const frameWidth =
            (viewer.layout.width - VIEWER_INSET * 2) * scale;
          const frameHeight =
            (viewer.layout.height - VIEWER_TOP_OFFSET - VIEWER_BOTTOM_OFFSET) * scale;
          if (frameWidth < 4 || frameHeight < 4) return null;
          if (
            frameLeft > width ||
            frameTop > height ||
            frameLeft + frameWidth < 0 ||
            frameTop + frameHeight < 0
          ) {
            return null;
          }
          return (
            <div
              key={viewer.nodeId}
              style={{
                position: "absolute",
                left: `${frameLeft}px`,
                top: `${frameTop}px`,
                width: `${frameWidth}px`,
                height: `${frameHeight}px`,
                pointerEvents: "auto",
              }}
            >
              <WorkflowGeometryViewer geometryIds={viewer.geometryIds} />
            </div>
          );
        })}
        {inlineEditor && inlineEditor.type === "slider" && sliderValueScreen ? (
          <input
            ref={inlineEditorRef as RefObject<HTMLInputElement>}
            type="text"
            value={inlineEditor.value}
            onChange={(event) =>
              setInlineEditor((prev) =>
                prev ? { ...prev, value: event.target.value } : prev
              )
            }
            onBlur={() => commitInlineEdit()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitInlineEdit();
              } else if (event.key === "Escape") {
                event.preventDefault();
                cancelInlineEdit();
              } else if (event.key === "Tab") {
                event.preventDefault();
                commitInlineEdit();
                canvasRef.current?.focus();
              }
            }}
            onPointerDown={(event) => event.stopPropagation()}
            style={{
              position: "absolute",
              left: sliderValueScreen.left,
              top: sliderValueScreen.top,
              width: Math.max(48, sliderValueScreen.width),
              height: Math.max(16, sliderValueScreen.height),
              padding: "2px 6px",
              borderRadius: 6,
              border: "1px solid var(--sp-divider, #c9c5c0)",
              background: "var(--sp-porcelain, #f5f2ee)",
              color: "var(--sp-ink, #1f1f22)",
              font: `600 ${Math.max(
                10,
                11 * viewTransform.scale
              )}px \"Proxima Nova\", \"Helvetica Neue\", Arial, sans-serif`,
              textAlign: "right",
              pointerEvents: "auto",
              zIndex: 4,
            }}
          />
        ) : inlineEditor && inlineEditorScreen && inlineEditorLayout ? (
          inlineEditor.type === "group" ? (
            <input
              ref={inlineEditorRef as RefObject<HTMLInputElement>}
              value={inlineEditor.value}
              onChange={(event) =>
                setInlineEditor((prev) =>
                  prev ? { ...prev, value: event.target.value } : prev
                )
              }
              onBlur={() => commitInlineEdit()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitInlineEdit();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  cancelInlineEdit();
                }
              }}
              onPointerDown={(event) => event.stopPropagation()}
              style={{
                position: "absolute",
                left: inlineEditorScreen.left + 8,
                top: inlineEditorScreen.top + 4,
                width: Math.max(120, inlineEditorScreen.width - 24),
                height: Math.max(18, 18 * viewTransform.scale),
                padding: "2px 6px",
                borderRadius: 6,
                border: "1px solid rgba(31, 31, 34, 0.25)",
                background: "rgba(255, 255, 255, 0.98)",
                color: "#1f1f22",
                font: `600 ${Math.max(
                  10,
                  11 * viewTransform.scale
                )}px \"Proxima Nova\", \"Helvetica Neue\", Arial, sans-serif`,
                pointerEvents: "auto",
                zIndex: 4,
              }}
            />
          ) : (
            <textarea
              ref={inlineEditorRef as RefObject<HTMLTextAreaElement>}
              value={inlineEditor.value}
              onChange={(event) =>
                setInlineEditor((prev) =>
                  prev ? { ...prev, value: event.target.value } : prev
                )
              }
              onBlur={() => commitInlineEdit()}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelInlineEdit();
                } else if (
                  event.key === "Enter" &&
                  (event.metaKey || event.ctrlKey)
                ) {
                  event.preventDefault();
                  commitInlineEdit();
                }
              }}
              onPointerDown={(event) => event.stopPropagation()}
              style={{
                position: "absolute",
                left:
                  inlineEditorScreen.left +
                  NOTE_TEXT_INSET_X * viewTransform.scale,
                top:
                  inlineEditorScreen.top +
                  NOTE_PADDING_TOP * viewTransform.scale,
                width:
                  inlineEditorScreen.width -
                  NOTE_TEXT_INSET_X * 2 * viewTransform.scale,
                height:
                  inlineEditorScreen.height -
                  (NOTE_PADDING_TOP + NOTE_PADDING_BOTTOM) * viewTransform.scale,
                padding: 0,
                border: "1px solid rgba(191, 143, 69, 0.35)",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.35)",
                color: "#3b332d",
                font: `500 ${Math.max(
                  10,
                  11 * viewTransform.scale
                )}px \"Proxima Nova\", \"Helvetica Neue\", Arial, sans-serif`,
                lineHeight: `${Math.max(
                  Math.max(10, 11 * viewTransform.scale) * 1.3,
                  NOTE_LINE_HEIGHT * viewTransform.scale
                )}px`,
                resize: "none",
                outline: "none",
                pointerEvents: "auto",
                zIndex: 4,
              }}
            />
          )
        ) : null}
        {sliderPopoverNode &&
        sliderPopoverLayout &&
        sliderPopoverScreen &&
        sliderPopoverConfig ? (
          <div
            style={{
              position: "absolute",
              left: `${Math.max(
                8,
                Math.min(width - sliderPopoverScreen.width - 8, sliderPopoverScreen.left)
              )}px`,
              top: `${Math.max(8, Math.min(height - 240, sliderPopoverScreen.top))}px`,
              width: `${sliderPopoverScreen.width}px`,
              padding: "10px",
              borderRadius: "10px",
              border: "1px solid var(--sp-divider, #c9c5c0)",
              background: "var(--sp-porcelain, #f5f2ee)",
              boxShadow: "var(--shadow-panel, 0 10px 24px rgba(0, 0, 0, 0.18))",
              color: "var(--sp-ink, #1f1f22)",
              font: '500 11px "Proxima Nova", "Helvetica Neue", Arial, sans-serif',
              display: "grid",
              gap: "8px",
              pointerEvents: "auto",
              zIndex: 4,
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.06em",
              }}
            >
              SLIDER
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                gap: "8px",
              }}
            >
              <label style={{ display: "grid", gap: "4px" }}>
                Min
                <input
                  type="number"
                  value={sliderPopoverConfig.min}
                  step="0.01"
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isFinite(next)) {
                      if (next > sliderPopoverConfig.max) {
                        updateNodeData(sliderPopoverNode.id, {
                          parameters: { min: sliderPopoverConfig.max, max: next },
                        });
                      } else {
                        updateNodeData(sliderPopoverNode.id, {
                          parameters: { min: next },
                        });
                      }
                    }
                  }}
                  style={{
                    padding: "4px 6px",
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: 6,
                    border: "1px solid var(--sp-divider, #c9c5c0)",
                    background: "var(--sp-porcelain, #f5f2ee)",
                  }}
                />
              </label>
              <label style={{ display: "grid", gap: "4px" }}>
                Max
                <input
                  type="number"
                  value={sliderPopoverConfig.max}
                  step="0.01"
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isFinite(next)) {
                      if (next < sliderPopoverConfig.min) {
                        updateNodeData(sliderPopoverNode.id, {
                          parameters: { min: next, max: sliderPopoverConfig.min },
                        });
                      } else {
                        updateNodeData(sliderPopoverNode.id, {
                          parameters: { max: next },
                        });
                      }
                    }
                  }}
                  style={{
                    padding: "4px 6px",
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: 6,
                    border: "1px solid var(--sp-divider, #c9c5c0)",
                    background: "var(--sp-porcelain, #f5f2ee)",
                  }}
                />
              </label>
              <label style={{ display: "grid", gap: "4px" }}>
                Step
                <input
                  type="number"
                  value={sliderPopoverConfig.step}
                  step="0.01"
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isFinite(next)) {
                      updateNodeData(sliderPopoverNode.id, {
                        parameters: { step: next },
                      });
                    }
                  }}
                  style={{
                    padding: "4px 6px",
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: 6,
                    border: "1px solid var(--sp-divider, #c9c5c0)",
                    background: "var(--sp-porcelain, #f5f2ee)",
                  }}
                />
              </label>
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "11px",
              }}
            >
              <input
                type="checkbox"
                checked={sliderPopoverConfig.snapMode === "step"}
                onChange={(event) => {
                  updateNodeData(sliderPopoverNode.id, {
                    parameters: { snapMode: event.target.checked ? "step" : "off" },
                  });
                }}
              />
              Snap to step
            </label>
          </div>
        ) : null}
      </div>
      {interactionsEnabled && contextMenu && contextMenuActions.length > 0 ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            left: `${contextMenu.screen.x}px`,
            top: `${contextMenu.screen.y}px`,
            minWidth: "196px",
            padding: "6px",
            borderRadius: "6px",
            border: "1px solid rgba(0, 0, 0, 0.2)",
            background: "var(--roslyn-cream, #f7f3ea)",
            boxShadow: "2px 6px 16px rgba(0, 0, 0, 0.28)",
            zIndex: 5,
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
          data-capture-hide="true"
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
  palette: CanvasPalette,
  mode: "grid" | "transparent" | "white" = "grid"
) {
  if (mode === "transparent") return;
  const zoom = transform.scale;
  const { minor: minorStep, major: majorStep } = resolveGridSteps(zoom);

  const worldLeft = -transform.x / transform.scale;
  const worldTop = -transform.y / transform.scale;
  const worldRight = worldLeft + width / transform.scale;
  const worldBottom = worldTop + height / transform.scale;

  ctx.fillStyle = mode === "white" ? "#ffffff" : palette.canvasBg;
  ctx.fillRect(
    worldLeft - majorStep,
    worldTop - majorStep,
    worldRight - worldLeft + majorStep * 2,
    worldBottom - worldTop + majorStep * 2
  );

  if (mode === "white") return;

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

function drawGroupNodes(
  ctx: CanvasRenderingContext2D,
  nodes: any[],
  layouts: Map<string, NodeLayout>,
  hoveredTarget: HitTarget,
  palette: CanvasPalette
) {
  nodes.forEach((node) => {
    if (node.type !== "group") return;
    const layout = layouts.get(node.id) ?? computeNodeLayout(node);
    if (!layouts.has(node.id)) {
      layouts.set(node.id, layout);
    }

    const x = layout.x;
    const y = layout.y;
    const width = layout.width;
    const height = layout.height;
    const isHovered = hoveredTarget.type === "node" && hoveredTarget.nodeId === node.id;
    const isSelected = Boolean(node.selected);
    const title =
      typeof layout.parameters.title === "string" && layout.parameters.title.trim().length > 0
        ? layout.parameters.title
        : node.data?.label ?? "Group";
    const memberCount = Array.isArray(node.data?.groupNodeIds)
      ? node.data.groupNodeIds.length
      : 0;
    const fallbackFill = parseCssColor(
      readCssVar("--sp-porcelain", "#f5f2ee"),
      [0.96, 0.95, 0.93, 1]
    );
    const rawFill =
      typeof layout.parameters.color === "string" ? layout.parameters.color : undefined;
    const fill = rgbaToCss(parseCssColor(rawFill, fallbackFill), 1);

    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = isHovered || isSelected ? palette.nodeStrokeHover : palette.nodeStroke;
    ctx.lineWidth = isSelected ? 2 : 1.5;
    if (isSelected) {
      ctx.setLineDash([7, 5]);
    }
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, GROUP_BORDER_RADIUS);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.fillStyle = palette.text;
    ctx.font = '600 11px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const titleText = truncateToWidth(ctx, title, width - 80);
    ctx.fillText(titleText, x + 12, y + 6);

    if (memberCount > 0) {
      const badgeLabel = `${memberCount} node${memberCount === 1 ? "" : "s"}`;
      ctx.font = '600 9px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
      const textWidth = ctx.measureText(badgeLabel).width;
      const badgeWidth = Math.max(40, textWidth + 10);
      const badgeHeight = GROUP_HEADER_HEIGHT - 8;
      const badgeX = x + width - badgeWidth - 10;
      const badgeY = y + 4;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6);
      ctx.fill();
      ctx.fillStyle = palette.textMuted;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeLabel, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2 + 0.5);
    }

    ctx.save();
    ctx.strokeStyle = isHovered || isSelected ? palette.nodeStrokeHover : palette.nodeStroke;
    ctx.lineWidth = 1;
    const handleOffset = 4;
    for (let i = 0; i < 3; i += 1) {
      const inset = handleOffset + i * 4;
      ctx.beginPath();
      ctx.moveTo(x + width - inset - 6, y + height - 2);
      ctx.lineTo(x + width - 2, y + height - inset - 6);
      ctx.stroke();
    }
    ctx.restore();
  });
}

function drawNodes(
  ctx: CanvasRenderingContext2D,
  nodes: any[],
  edges: any[],
  layouts: Map<string, NodeLayout>,
  connectedInputsByNode: Map<string, Set<string>>,
  geometry: any[],
  hoveredTarget: HitTarget,
  palette: CanvasPalette,
  sliderHover: { nodeId: string; part: "track" | "value" | "settings" } | null,
  focusedSliderId: string | null,
  sliderPopoverId: string | null,
  dragState: DragState
) {
  const defaultIconTint = parseCssColor(palette.text, [0.12, 0.12, 0.13, 1]);

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
    const iconTint = parseCssColor(categoryAccent, defaultIconTint);
    const baseLabel = node.data?.label ?? definition?.label ?? node.type ?? "Node";
    const label = node.type === "panel" ? "DATA" : baseLabel;
    const isSlider = node.type === "slider";
    const sliderHoverPart =
      isSlider && sliderHover?.nodeId === node.id ? sliderHover.part : null;
    const isSliderFocused = isSlider && focusedSliderId === node.id;
    const isSliderActive =
      isSlider && dragState.type === "slider" && dragState.nodeId === node.id;
    const isSliderSettingsOpen = isSlider && sliderPopoverId === node.id;

    if (node.type === "group") {
      return;
    }

    if (node.type === "textNote") {
      const noteOutputs = node.data?.outputs ?? {};
      const noteOutputKey = definition?.primaryOutputKey ?? "data";
      const fallbackText =
        typeof layout.parameters.text === "string" ? layout.parameters.text : "";
      const hasUpstream =
        noteOutputKey in noteOutputs && noteOutputs[noteOutputKey] != null;
      const hasFallback = fallbackText.trim().length > 0;
      const hasContent = hasUpstream || hasFallback;
      const linesToDraw = layout.noteLines ?? ["Edit me!"];
      const isSelected = Boolean(node.selected);
      const fill = isHovered ? "#fff5d8" : "#fff1c6";
      const border = isSelected ? "#f59e0b" : "rgba(191, 143, 69, 0.55)";

      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
      ctx.beginPath();
      ctx.roundRect(x, y + 3, layout.width, layout.height, NOTE_BORDER_RADIUS);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = fill;
      ctx.strokeStyle = border;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, layout.width, layout.height, NOTE_BORDER_RADIUS);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, layout.width, layout.height, NOTE_BORDER_RADIUS);
      ctx.clip();
      ctx.fillStyle = hasContent ? "#3b332d" : "#8c7a5f";
      ctx.font = '500 11px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      linesToDraw.forEach((line, index) => {
        const lineY = y + NOTE_PADDING_TOP + index * NOTE_LINE_HEIGHT;
        const trimmed = truncateToWidth(ctx, line, layout.width - NOTE_TEXT_INSET_X * 2);
        ctx.fillText(trimmed, x + NOTE_TEXT_INSET_X, lineY);
      });
      ctx.restore();

      const portFont = '600 9px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
      const noteWidth = layout.width;
      const portLabelMaxWidth = noteWidth - 48;
      const drawPort = (portLayout: PortLayout) => {
        const port = portLayout.port;
        const portColor = resolvePortColor(port, fallbackPortColor);
        const isPortHovered =
          hoveredTarget.type === "port" &&
          hoveredTarget.nodeId === node.id &&
          hoveredTarget.portKey === port.key &&
          hoveredTarget.isOutput === portLayout.isOutput;

        ctx.save();
        if (port.label) {
          ctx.font = portFont;
          ctx.textBaseline = "middle";
          ctx.textAlign = portLayout.isOutput ? "right" : "left";
          ctx.fillStyle = portColor;
          ctx.globalAlpha = isPortHovered ? 1 : 0.86;
          const labelText = truncateToWidth(ctx, port.label, portLabelMaxWidth);
          const labelX = portLayout.isOutput ? x + noteWidth - 14 : x + 12;
          ctx.fillText(labelText, labelX, portLayout.y);
        }
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
        ctx.save();
        ctx.strokeStyle = categoryAccent ?? palette.portStroke;
        ctx.globalAlpha = isPortHovered ? 0.9 : 0.55;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      };

      layout.inputs.forEach(drawPort);
      layout.outputs.forEach(drawPort);
      return;
    }

    const iconSpace =
      !isSlider && definition?.iconId ? ICON_SIZE + ICON_PADDING + 4 : 0;
    const labelMaxWidth = isSlider ? NODE_WIDTH - 72 : NODE_WIDTH - 24 - iconSpace;
    const detailMaxWidth = NODE_WIDTH - 24;
    const nodeRadius = isSlider ? height / 2 : NODE_BORDER_RADIUS;

    // Draw a crisp offset shadow to help the nodes read as buttons.
    ctx.save();
    ctx.fillStyle = palette.nodeShadow;
    ctx.beginPath();
    ctx.roundRect(x, y + NODE_SHADOW_OFFSET, NODE_WIDTH, height, nodeRadius);
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
    ctx.roundRect(x, y, NODE_WIDTH, height, nodeRadius);
    ctx.fill();
    ctx.stroke();

    if (isInvalid) {
      ctx.save();
      ctx.fillStyle = palette.nodeErrorOverlay;
      ctx.beginPath();
      ctx.roundRect(x, y, NODE_WIDTH, height, nodeRadius);
      ctx.fill();
      ctx.restore();
    }

    if (showWarning) {
      ctx.save();
      ctx.fillStyle = palette.nodeWarningOverlay;
      ctx.beginPath();
      ctx.roundRect(x, y, NODE_WIDTH, height, nodeRadius);
      ctx.fill();
      ctx.restore();
    }

    if (!isSlider) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, NODE_WIDTH, height, nodeRadius);
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
    }

    const iconImage = !isSlider ? getIconImage(definition?.iconId, iconTint) : null;
    if (!isSlider && definition?.iconId && iconImage && iconImage.complete && iconImage.naturalWidth > 0) {
      const iconX = x + NODE_WIDTH - ICON_PADDING - ICON_SIZE;
      const iconY = y + NODE_BAND_HEIGHT + 6;
      ctx.save();
      ctx.globalAlpha = 0.98;
      ctx.drawImage(iconImage, iconX, iconY, ICON_SIZE, ICON_SIZE);
      ctx.restore();
    }

    if (!isSlider) {
      ctx.fillStyle = palette.text;
      ctx.font = '600 13px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const labelText = truncateToWidth(ctx, label, labelMaxWidth);
      ctx.fillText(labelText, x + 12, y + NODE_BAND_HEIGHT + 8);
    }

    const detailY = isSlider ? y + 34 : y + NODE_BAND_HEIGHT + 32;
    const evaluationError = node.data?.evaluationError;
    const outputs = node.data?.outputs ?? {};
    const primaryOutputKey = definition?.primaryOutputKey ?? layout.defaultOutputKey;
    const primaryOutputValue = primaryOutputKey ? outputs[primaryOutputKey] : undefined;

    if (node.type === "panel") {
      const rawLines = evaluationError
        ? [`Error: ${evaluationError}`]
        : layout.panelLines ?? ["—"];
      const panelBounds = getPanelContentBounds(layout);
      const visibleLines = Math.max(1, Math.floor(panelBounds.height / PANEL_LINE_HEIGHT));
      const maxScroll = Math.max(0, rawLines.length - visibleLines);
      const scrollRaw = readNumber(node.data?.panelScroll, 0);
      const scroll = Math.min(maxScroll, Math.max(0, Math.round(scrollRaw)));
      const lines = rawLines.slice(scroll, scroll + visibleLines);
      const maxWidth = panelBounds.width - 6;

      ctx.save();
      ctx.beginPath();
      ctx.rect(panelBounds.x, panelBounds.y, panelBounds.width, panelBounds.height);
      ctx.clip();
      ctx.fillStyle = palette.text;
      ctx.font =
        '500 11px "JetBrains Mono", "IBM Plex Mono", "SFMono-Regular", ui-monospace, monospace';
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      lines.forEach((line, index) => {
        const lineY = panelBounds.y + index * PANEL_LINE_HEIGHT;
        const trimmed = truncateToWidth(ctx, line, maxWidth);
        ctx.fillText(trimmed, panelBounds.x, lineY);
      });
      ctx.restore();
    } else if (node.type === "slider") {
      const sliderConfig = resolveSliderConfig(node);
      const outputValue =
        typeof primaryOutputValue === "number"
          ? primaryOutputValue
          : readNumber(primaryOutputValue, sliderConfig.value);
      const value =
        typeof outputValue === "number" && Number.isFinite(outputValue)
          ? outputValue
          : sliderConfig.value;
      const valueText = formatSliderValue(
        value,
        sliderConfig.step,
        sliderConfig.snapMode,
        sliderConfig.precisionOverride
      );

      ctx.fillStyle = palette.text;
      ctx.font = '600 12px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const valueBounds = getSliderValueBounds(layout);
      const settingsBounds = getSliderSettingsBounds(layout);
      const sliderLabelMaxWidth = Math.max(
        0,
        valueBounds.x - (x + SLIDER_HEADER_PADDING_X) - 6
      );
      const labelText = truncateToWidth(ctx, label, sliderLabelMaxWidth);
      ctx.fillText(labelText, x + SLIDER_HEADER_PADDING_X, y + SLIDER_HEADER_TOP + 2);

      ctx.fillStyle = palette.textMuted;
      ctx.font = '600 11px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = "right";
      const valueLabel = truncateToWidth(ctx, valueText, valueBounds.width);
      ctx.fillText(
        valueLabel,
        valueBounds.x + valueBounds.width,
        valueBounds.y + 1
      );

      const settingsActive = sliderHoverPart === "settings" || isSliderSettingsOpen;
      const settingsTint = parseCssColor(
        settingsActive ? categoryAccent : palette.textMuted,
        defaultIconTint
      );
      if (settingsActive) {
        ctx.save();
        ctx.fillStyle = rgbaToCss(settingsTint, 0.14);
        ctx.beginPath();
        ctx.roundRect(
          settingsBounds.x - 3,
          settingsBounds.y - 3,
          settingsBounds.width + 6,
          settingsBounds.height + 6,
          6
        );
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.fillStyle = rgbaToCss(settingsTint);
      const dotGap = 3.6;
      const dotRadius = settingsActive ? 1.7 : 1.4;
      const dotCenterX = settingsBounds.x + settingsBounds.width / 2;
      const dotCenterY = settingsBounds.y + settingsBounds.height / 2;
      ctx.beginPath();
      ctx.arc(dotCenterX - dotGap, dotCenterY, dotRadius, 0, Math.PI * 2);
      ctx.arc(dotCenterX, dotCenterY, dotRadius, 0, Math.PI * 2);
      ctx.arc(dotCenterX + dotGap, dotCenterY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (evaluationError && isHovered) {
        ctx.fillStyle = palette.nodeErrorBorder;
        ctx.font = '600 10px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
        ctx.textAlign = "left";
        const errorText = truncateToWidth(ctx, `Error: ${evaluationError}`, detailMaxWidth);
        ctx.fillText(errorText, x + 14, detailY);
      }

      const sliderBounds = getSliderBounds(layout);
      const normalized =
        sliderConfig.max <= sliderConfig.min
          ? 0
          : clampValue(
              (value - sliderConfig.min) / (sliderConfig.max - sliderConfig.min),
              0,
              1
            );
      const trackY = sliderBounds.y + sliderBounds.height / 2;
      const fillX = sliderBounds.x + sliderBounds.width * normalized;
      const isTrackHover = sliderHoverPart === "track";
      const thumbRadius =
        SLIDER_THUMB_RADIUS +
        (isTrackHover || isSliderActive ? 2 : 0) +
        (node.selected ? 1 : 0);
      const tubeHeight = sliderBounds.height + 8;
      const tubeY = trackY - tubeHeight / 2;
      const tubeRadius = tubeHeight / 2;
      const fillWidth = Math.min(
        sliderBounds.width,
        Math.max(tubeHeight, sliderBounds.width * normalized)
      );
      const trackTint = parseCssColor(palette.nodeStroke, defaultIconTint);
      const trackBg = rgbaToCss(trackTint, isTrackHover || isSliderActive ? 0.22 : 0.14);
      const outlineTint = parseCssColor(palette.nodeFill, defaultIconTint);
      const outlineColor = rgbaToCss(outlineTint, 0.7);

      ctx.save();
      ctx.fillStyle = trackBg;
      ctx.beginPath();
      ctx.roundRect(sliderBounds.x, tubeY, sliderBounds.width, tubeHeight, tubeRadius);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = categoryAccent;
      ctx.globalAlpha = isTrackHover || isSliderActive ? 0.95 : 0.85;
      ctx.beginPath();
      ctx.roundRect(sliderBounds.x, tubeY, fillWidth, tubeHeight, tubeRadius);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(
        sliderBounds.x + 1,
        tubeY + 1,
        sliderBounds.width - 2,
        tubeHeight - 2,
        tubeRadius - 1
      );
      ctx.stroke();
      ctx.restore();

      if (isSliderFocused) {
        ctx.save();
        ctx.strokeStyle = categoryAccent;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(
          sliderBounds.x - 2,
          tubeY - 4,
          sliderBounds.width + 4,
          tubeHeight + 8,
          (tubeHeight + 8) / 2
        );
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = isTrackHover || isSliderActive ? palette.nodeFillHover : palette.nodeFill;
      ctx.strokeStyle = categoryAccent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(fillX, trackY, thumbRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (evaluationError && isHovered) {
      ctx.fillStyle = palette.nodeErrorBorder;
      ctx.font = '600 10px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
      const errorText = truncateToWidth(ctx, `Error: ${evaluationError}`, detailMaxWidth);
      ctx.fillText(errorText, x + 12, detailY);
    } else if (showWarning && isHovered) {
      ctx.fillStyle = palette.nodeWarningBorder;
      ctx.font = '600 10px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
      const warningText = truncateToWidth(
        ctx,
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
        ctx,
        `${vfLabel} | ${penaltyLabel} | ${radiusLabel}`,
        detailMaxWidth
      );
      ctx.fillText(settingsText, x + 12, detailY);
      ctx.font = '500 10px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
      const progressText = truncateToWidth(
        ctx,
        `Iter ${progress.iteration}/${settings.maxIterations} · ${String(progress.status)}`,
        detailMaxWidth
      );
      ctx.fillText(progressText, x + 12, detailY + 16);
    } else {
      const detailText =
        primaryOutputValue != null
          ? `= ${formatInlineValue(primaryOutputValue)}`
          : definition?.description ??
            (node.type ? `Type: ${node.type}` : `ID: ${node.id.slice(0, 8)}`);
      ctx.fillStyle = palette.textMuted;
      ctx.font = '500 11px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
      const detailLabel = truncateToWidth(ctx, detailText, detailMaxWidth);
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
      if (node.type !== "panel" && port.label) {
        ctx.font = portFont;
        ctx.textBaseline = "middle";
        ctx.textAlign = portLayout.isOutput ? "right" : "left";
        ctx.fillStyle = portColor;
        ctx.globalAlpha = isPortHovered ? 1 : 0.86;
        const labelText = truncateToWidth(ctx, port.label, portLabelMaxWidth);
        const labelX = portLayout.isOutput ? x + NODE_WIDTH - 14 : x + 12;
        ctx.fillText(labelText, labelX, portLayout.y);
      }
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
      ctx.save();
      ctx.strokeStyle = categoryAccent ?? palette.portStroke;
      ctx.globalAlpha = isPortHovered ? 0.9 : 0.55;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
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

const wrapTooltipLine = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) => {
  if (!text) return [""];
  if (ctx.measureText(text).width <= maxWidth) return [text];

  const words = text.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
      return;
    }
    if (current) lines.push(current);
    if (ctx.measureText(word).width <= maxWidth) {
      current = word;
      return;
    }
    let chunk = "";
    for (const char of word) {
      const next = chunk + char;
      if (ctx.measureText(next).width <= maxWidth || chunk.length === 0) {
        chunk = next;
      } else {
        lines.push(chunk);
        chunk = char;
      }
    }
    current = chunk;
  });
  if (current) lines.push(current);
  return lines;
};

const buildTooltipLines = (
  ctx: CanvasRenderingContext2D,
  rawLines: string[],
  maxWidth: number,
  titleFont: string,
  bodyFont: string
) => {
  const lines: Array<{ text: string; isTitle: boolean }> = [];
  rawLines.forEach((line, index) => {
    const isTitle = index === 0;
    ctx.font = isTitle ? titleFont : bodyFont;
    const segments = line.split(/\r?\n/);
    segments.forEach((segment) => {
      if (segment.length === 0) {
        lines.push({ text: "", isTitle });
        return;
      }
      wrapTooltipLine(ctx, segment, maxWidth).forEach((part) => {
        lines.push({ text: part, isTitle });
      });
    });
  });
  if (lines.length === 0) lines.push({ text: "", isTitle: true });
  return lines;
};

function drawTooltip(
  ctx: CanvasRenderingContext2D,
  tooltip: TooltipData,
  pointer: Vec2,
  width: number,
  height: number,
  palette: CanvasPalette
) {
  const baseTitleSize = 12;
  const baseBodySize = 11;
  const baseLineHeight = 16;
  const basePaddingX = 10;
  const basePaddingY = 8;
  const rawLines = [tooltip.title, ...tooltip.lines].filter((line) => line.length > 0);
  if (rawLines.length === 0) return;

  const maxWidth = Math.min(420, Math.max(1, width - 24));
  const maxHeight = Math.max(24, height - 12);

  const buildLayout = (titleSize: number, bodySize: number) => {
    const scale = bodySize / baseBodySize;
    const paddingX = basePaddingX * scale;
    const paddingY = basePaddingY * scale;
    const lineHeight = baseLineHeight * scale;
    const titleFont = `600 ${titleSize}px "Proxima Nova", "Helvetica Neue", Arial, sans-serif`;
    const bodyFont = `500 ${bodySize}px "Proxima Nova", "Helvetica Neue", Arial, sans-serif`;
    const lines = buildTooltipLines(ctx, rawLines, maxWidth, titleFont, bodyFont);
    const widths = lines.map((line) => {
      ctx.font = line.isTitle ? titleFont : bodyFont;
      return ctx.measureText(line.text).width;
    });
    const contentWidth = Math.min(
      maxWidth,
      Math.max(...widths, 80 * scale)
    );
    const totalWidth = contentWidth + paddingX * 2;
    const totalHeight = lines.length * lineHeight + paddingY * 2;
    return {
      lines,
      titleFont,
      bodyFont,
      paddingX,
      paddingY,
      lineHeight,
      totalWidth,
      totalHeight,
    };
  };

  let titleSize = baseTitleSize;
  let bodySize = baseBodySize;
  let layout = buildLayout(titleSize, bodySize);
  while (layout.totalHeight > maxHeight && bodySize > 9) {
    titleSize -= 1;
    bodySize -= 1;
    layout = buildLayout(titleSize, bodySize);
  }

  ctx.save();
  let x = pointer.x + 14;
  let y = pointer.y + 14;
  if (x + layout.totalWidth > width - 6) x = width - layout.totalWidth - 6;
  if (y + layout.totalHeight > height - 6) y = height - layout.totalHeight - 6;
  x = Math.max(6, x);
  y = Math.max(6, y);

  ctx.fillStyle = "rgba(15, 15, 15, 0.92)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, layout.totalWidth, layout.totalHeight, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = palette.text;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  layout.lines.forEach((line, index) => {
    ctx.font = line.isTitle ? layout.titleFont : layout.bodyFont;
    ctx.fillStyle = line.isTitle ? "#f8fafc" : "rgba(248, 250, 252, 0.85)";
    ctx.fillText(
      line.text,
      x + layout.paddingX,
      y + layout.paddingY + index * layout.lineHeight
    );
  });

  ctx.restore();
}

function drawPendingReferenceHint(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: CanvasPalette
) {
  const text = "Select geometry in Roslyn to complete reference.";
  ctx.save();
  ctx.font = '600 11px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
  const paddingX = 10;
  const paddingY = 6;
  const textWidth = ctx.measureText(text).width;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = 22;
  const x = Math.max(8, width - boxWidth - 12);
  const y = 10;

  ctx.fillStyle = "rgba(217, 119, 6, 0.85)";
  ctx.strokeStyle = "rgba(120, 53, 15, 0.8)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, boxWidth, boxHeight, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = palette.text;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + paddingX, y + boxHeight / 2);
  ctx.restore();
}

function drawShortcutOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: CanvasPalette,
  gridSnapEnabled: boolean
) {
  const title = "Numerica Shortcuts";
  const lines = [
    "Mouse wheel: Zoom",
    "Trackpad scroll: Pan",
    "Pinch/Ctrl+Wheel: Zoom",
    "Right-drag: Pan",
    "Space: Pan (drag)",
    "F: Frame selection",
    "Shift+F: Frame all",
    "G: Grid snap " + (gridSnapEnabled ? "On" : "Off"),
    "Alt: Free drag",
    "?: Toggle help",
    "Ctrl/Cmd+A: Select all",
  ];

  const paddingX = 12;
  const paddingY = 10;
  const lineHeight = 16;
  const titleFont = '600 12px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';
  const lineFont = '500 11px "Proxima Nova", "Helvetica Neue", Arial, sans-serif';

  ctx.save();
  ctx.font = titleFont;
  const widths = [ctx.measureText(title).width];
  ctx.font = lineFont;
  lines.forEach((line) => widths.push(ctx.measureText(line).width));
  const contentWidth = Math.max(...widths);
  const boxWidth = contentWidth + paddingX * 2;
  const boxHeight = (lines.length + 1) * lineHeight + paddingY * 2;

  const x = 12;
  const y = Math.max(12, height - boxHeight - 12);

  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  ctx.strokeStyle = "rgba(15, 23, 42, 0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, boxWidth, boxHeight, 10);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  ctx.font = titleFont;
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(title, x + paddingX, y + paddingY);

  ctx.font = lineFont;
  ctx.fillStyle = "rgba(248, 250, 252, 0.86)";
  lines.forEach((line, index) => {
    ctx.fillText(line, x + paddingX, y + paddingY + lineHeight * (index + 1));
  });

  ctx.restore();
}
