import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type RefObject,
} from "react";
import { useProjectStore, type NodeType } from "../../store/useProjectStore";
import type { DisplayMode, ViewSettings } from "../../types";
import { arrayBufferToBase64 } from "../../utils/binary";
import { safeLocalStorageGet, safeLocalStorageSet } from "../../utils/safeStorage";
import { renderIconDataUrl, type IconId } from "../../webgl/ui/WebGLIconRenderer";
import { WebGLUIRenderer, type RGBA } from "../../webgl/ui/WebGLUIRenderer";
import WebGLButton from "../ui/WebGLButton";
import WorkflowGeometryViewer from "./WorkflowGeometryViewer";
import ChemistryMaterialPopup from "./chemistry/ChemistryMaterialPopup";
import { isWorkflowNodeInvalid } from "./workflowValidation";
import {
  buildPanelLines,
  formatInlineValue,
  resolvePanelFormatOptions,
} from "./panelFormat";
import { inspectValue, formatGeometrySummary } from "./dataInspect";
import {
  NODE_CATEGORY_BY_ID,
  NODE_DEFINITIONS,
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

type NodeSearchPopupState = {
  screen: Vec2;
  world: Vec2;
};

type PreviewFilterSpec = {
  displayMode?: DisplayMode;
  viewSolidity?: number;
  viewSettings?: Partial<ViewSettings>;
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
  | {
      type: "resizeText";
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
  | { type: "text"; nodeId: string; value: string; original: string };

type NumericalCanvasProps = {
  width: number;
  height: number;
  pendingNodeType?: NodeType | null;
  onDropNode?: (type: NodeType, world: Vec2) => void;
  onRequestNodeSettings?: (nodeId: string) => void;
  onOpenDashboard?: (nodeId: string) => void;
  mode?: "standard" | "minimap";
  enableMinimapPanZoom?: boolean;
  captureMode?: "transparent" | "white" | null;
  hoverPopupsEnabled?: boolean;
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
  nodeErrorFill: string;
  nodeWarningBorder: string;
  nodeWarningFill: string;
  text: string;
  textMuted: string;
  portFill: string;
  portFillHover: string;
  portStroke: string;
};

const NODE_WIDTH = 180;
const NODE_MIN_HEIGHT = 98;
const SLIDER_NODE_MIN_HEIGHT = 76;
const NODE_BORDER_RADIUS = 4;
const NODE_BAND_HEIGHT = 16;
const NODE_SHADOW_OFFSET = 4;
const PORT_RADIUS = 5;
const PORT_ROW_HEIGHT = 16;
const PORTS_START_OFFSET = 64;
const PORTS_BOTTOM_PADDING = 18;
const VIEWER_NODE_MIN_HEIGHT = 210;
const VIEWER_INSET = 10;
const VIEWER_BOTTOM_OFFSET = 12;
const PANEL_CONTENT_TOP = NODE_BAND_HEIGHT + 28;
const PANEL_CONTENT_BOTTOM = 12;
const PANEL_LINE_HEIGHT = 13;
const PANEL_TEXT_INSET_X = 12;
const PANEL_MAX_HEIGHT = 200;
const GROUP_MIN_WIDTH = 230;
const GROUP_MIN_HEIGHT = 160;
const GROUP_PADDING = 14;
const GROUP_HEADER_HEIGHT = 20;
const GROUP_BORDER_RADIUS = 3;
const GROUP_RESIZE_HANDLE = 14;
const TEXT_NODE_DEFAULT_SIZE = 24;
const TEXT_NODE_LINE_HEIGHT = 1.12;
const TEXT_NODE_HIT_PADDING = 6;
const TEXT_NODE_MIN_WIDTH = 120;
const TEXT_NODE_MIN_HEIGHT = 60;
const TEXT_NODE_DEFAULT_WIDTH = 240;
const TEXT_NODE_DEFAULT_HEIGHT = 120;
const TEXT_NODE_PADDING_X = 10;
const TEXT_NODE_PADDING_Y = 10;
const TEXT_NODE_FONT_FAMILY =
  '"Caveat", "Kalam", "Patrick Hand", "Bradley Hand", "Segoe Print", cursive';
const NOTE_WIDTH = 210;
const NOTE_MIN_HEIGHT = 100;
const NOTE_BORDER_RADIUS = 3;
const NOTE_LINE_HEIGHT = 13;
const NOTE_TEXT_INSET_X = 12;
const NOTE_PADDING_TOP = 10;
const NOTE_PADDING_BOTTOM = 12;
const SLIDER_PORT_OFFSET = 6;
const SLIDER_TRACK_HEIGHT = 7;
const SLIDER_TRACK_INSET_X = 14;
const SLIDER_THUMB_RADIUS = 6;
const SLIDER_VALUE_WIDTH = 48;
const SLIDER_VALUE_GAP = 6;
const SLIDER_TRACK_COLOR = "#3a3632";
const SLIDER_FILL_COLOR = "#f5a623";
const SLIDER_THUMB_COLOR = "#ffffff";
const SLIDER_THUMB_STROKE = "#f5a623";
const SLIDER_VALUE_COLOR = "#f5a623";
const ICON_SIZE = 28;
const ICON_PADDING = 10;
const DETAIL_BOTTOM_PADDING = 10;
const DETAIL_LINE_HEIGHT = 13;
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
const SOLVER_NODE_FILL_TOP = "#9933ff";
const SOLVER_NODE_FILL_BOTTOM = "#7700dd";
const SOLVER_NODE_FILL_TOP_HOVER = "#aa44ff";
const SOLVER_NODE_FILL_BOTTOM_HOVER = "#8811ee";
const SOLVER_NODE_BORDER = "#6600cc";
const GOAL_NODE_FILL_TOP = "#cc99ff";
const GOAL_NODE_FILL_BOTTOM = "#aa66ff";
const GOAL_NODE_FILL_TOP_HOVER = "#ddaaff";
const GOAL_NODE_FILL_BOTTOM_HOVER = "#bb77ff";
const GOAL_NODE_BORDER = "#9933ff";
const SOLVER_NODE_TEXT = "#ffffff";
const SOLVER_NODE_TEXT_MUTED = "rgba(255, 255, 255, 0.78)";
const GOAL_NODE_TEXT = "#2a2a2a";
const GOAL_NODE_TEXT_MUTED = "#444444";
const SOLVER_BAND_TINT = "rgba(255, 255, 255, 0.16)";
const GOAL_BAND_TINT = "rgba(255, 255, 255, 0.45)";
const SOLVER_BAND_ACCENT = "rgba(255, 255, 255, 0.6)";
const GOAL_BAND_ACCENT = "rgba(151, 128, 232, 0.7)";

const clampValue = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const DISPLAY_MODE_OPTIONS: DisplayMode[] = [
  "shaded",
  "wireframe",
  "shaded_edges",
  "ghosted",
  "silhouette",
];

const coercePreviewFilter = (value: unknown): PreviewFilterSpec | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const displayModeRaw = record.displayMode;
  const displayMode =
    typeof displayModeRaw === "string" &&
    (DISPLAY_MODE_OPTIONS as string[]).includes(displayModeRaw)
      ? (displayModeRaw as DisplayMode)
      : undefined;

  const viewSolidityRaw = record.viewSolidity;
  const viewSolidity =
    typeof viewSolidityRaw === "number" && Number.isFinite(viewSolidityRaw)
      ? clampValue(viewSolidityRaw, 0, 1)
      : undefined;

  const viewSettingsRaw = record.viewSettings;
  let viewSettings: Partial<ViewSettings> | undefined;
  if (viewSettingsRaw && typeof viewSettingsRaw === "object") {
    const settings = viewSettingsRaw as Record<string, unknown>;
    viewSettings = {};
    if (typeof settings.backfaceCulling === "boolean") {
      viewSettings.backfaceCulling = settings.backfaceCulling;
    }
    if (typeof settings.showNormals === "boolean") {
      viewSettings.showNormals = settings.showNormals;
    }
    if (typeof settings.sheen === "number" && Number.isFinite(settings.sheen)) {
      viewSettings.sheen = clampValue(settings.sheen, 0, 1);
    }
    if (Object.keys(viewSettings).length === 0) {
      viewSettings = undefined;
    }
  }

  if (!displayMode && viewSolidity == null && !viewSettings) return null;
  return { displayMode, viewSolidity, viewSettings };
};

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

let textMeasureContext: CanvasRenderingContext2D | null = null;

const getTextMeasureContext = () => {
  if (textMeasureContext) return textMeasureContext;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  textMeasureContext = canvas.getContext("2d");
  return textMeasureContext;
};

const resolveTextFont = (size: number, weight = 500) =>
  `${weight} ${size}px ${TEXT_NODE_FONT_FAMILY}`;

const measureTextWidth = (text: string, font: string, size: number) => {
  const ctx = getTextMeasureContext();
  if (!ctx) {
    return Math.max(TEXT_NODE_MIN_WIDTH, size * 0.6 * Math.max(1, text.length));
  }
  ctx.font = font;
  return ctx.measureText(text).width;
};

const wrapTextToWidth = (text: string, font: string, size: number, maxWidth: number): string[] => {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const p of paragraphs) {
    const words = p.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const next = `${current} ${words[i]}`;
      if (measureTextWidth(next, font, size) <= maxWidth) {
        current = next;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
  }

  return lines;
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
  const bg = "#f8f6f2";
  const surface = "#ffffff";
  const surfaceMuted = "#faf8f5";
  const border = "#000000";
  const text = "#000000";
  const muted = "#666666";
  const edge = "#000000";
  const edgeSoft = "rgba(0, 0, 0, 0.25)";
  const accent = "#00d4ff";
  const gridMinor = "rgba(0, 0, 0, 0.06)";
  const gridMajor = "rgba(0, 0, 0, 0.12)";
  const portFill = "#8800ff";
  const portFillHover = "#9933ff";
  const portStroke = "#000000";
  const nodeErrorBorder = "#ff0066";
  const nodeErrorFill = "#ffcce6";
  const nodeWarningBorder = "#ffdd00";
  const nodeWarningFill = "#fff9cc";

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
    nodeShadow: "#000000",
    nodeErrorBorder,
    nodeErrorFill,
    nodeWarningBorder,
    nodeWarningFill,
    text,
    textMuted: muted,
    portFill,
    portFillHover,
    portStroke,
  };
};

const createNodeGradient = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  top: string,
  bottom: string
) => {
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  return gradient;
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
  textLines?: string[];
  textFontSize?: number;
  textLineHeight?: number;
  portsStartOffset: number;
};

type PortRenderState = {
  hovered: boolean;
  active: boolean;
  connected: boolean;
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
const ICON_RESOLUTION = 1024;
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

const mixColor = (from: RGBA, to: RGBA, t: number): RGBA => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t,
  from[2] + (to[2] - from[2]) * t,
  from[3] + (to[3] - from[3]) * t,
];

const withAlpha = (color: RGBA, alpha: number): RGBA => [
  color[0],
  color[1],
  color[2],
  alpha,
];

const darken = (color: RGBA, amount: number): RGBA =>
  mixColor(color, [0, 0, 0, color[3]], amount);

const lighten = (color: RGBA, amount: number): RGBA =>
  mixColor(color, [1, 1, 1, color[3]], amount);

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
  const trackWidth = layout.width - SLIDER_TRACK_INSET_X * 2 - SLIDER_VALUE_WIDTH - SLIDER_VALUE_GAP;
  return {
    x: layout.x + SLIDER_TRACK_INSET_X,
    y: trackY,
    width: trackWidth,
    height: SLIDER_TRACK_HEIGHT,
    valueX: layout.x + SLIDER_TRACK_INSET_X + trackWidth + SLIDER_VALUE_GAP,
    valueWidth: SLIDER_VALUE_WIDTH,
  };
};

const getPanelContentBounds = (layout: NodeLayout) => ({
  x: layout.x + PANEL_TEXT_INSET_X,
  y: layout.y + PANEL_CONTENT_TOP,
  width: layout.width - PANEL_TEXT_INSET_X * 2,
  height: Math.max(0, layout.height - PANEL_CONTENT_TOP - PANEL_CONTENT_BOTTOM),
});

const getTextNoteContentBounds = (layout: NodeLayout) => ({
  x: layout.x + NOTE_TEXT_INSET_X,
  y: layout.y + NOTE_PADDING_TOP,
  width: layout.width - NOTE_TEXT_INSET_X * 2,
  height: Math.max(0, layout.portsStartOffset - NOTE_PADDING_TOP - 8),
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

const resolveGroupResizeHandleSize = (scale: number) => {
  if (!Number.isFinite(scale) || scale <= 0) return GROUP_RESIZE_HANDLE;
  return Math.max(GROUP_RESIZE_HANDLE, GROUP_RESIZE_HANDLE / scale);
};

const isPointInGroupResizeHandle = (
  point: Vec2,
  layout: NodeLayout,
  scale: number
) => {
  const handleSize = resolveGroupResizeHandleSize(scale);
  const handleX = layout.x + layout.width - handleSize;
  const handleY = layout.y + layout.height - handleSize;
  return (
    point.x >= handleX &&
    point.x <= layout.x + layout.width &&
    point.y >= handleY &&
    point.y <= layout.y + layout.height
  );
};

const isPointInTextResizeHandle = (
  point: Vec2,
  layout: NodeLayout,
  scale: number
) => {
  const handleSize = resolveGroupResizeHandleSize(scale);
  const handleX = layout.x + layout.width - handleSize;
  const handleY = layout.y + layout.height - handleSize;
  return (
    point.x >= handleX &&
    point.x <= layout.x + layout.width &&
    point.y >= handleY &&
    point.y <= layout.y + layout.height
  );
};

const computeNodeLayout = (node: any, geometryItems?: any[]): NodeLayout => {
  const definition = getNodeDefinition(node.type);
  const parameters = resolveNodeParameters(node);
  if (node.type === "text") {
    const rawText = typeof parameters.text === "string" ? parameters.text : "";
    const text = rawText.trim().length > 0 ? rawText : "Text";
    const size = Math.min(96, Math.max(8, readNumber(parameters.size, TEXT_NODE_DEFAULT_SIZE)));
    const font = resolveTextFont(size);
    const lineHeight = size * TEXT_NODE_LINE_HEIGHT;

    const stored = node.data?.textSize;
    const width = Math.max(
      TEXT_NODE_MIN_WIDTH,
      stored?.width ?? TEXT_NODE_DEFAULT_WIDTH
    );

    const wrapWidth = Math.max(1, width - TEXT_NODE_PADDING_X * 2);
    const lines = wrapTextToWidth(text, font, size, wrapWidth);

    const contentHeight = TEXT_NODE_PADDING_Y * 2 + lines.length * lineHeight;
    const height = Math.max(
      TEXT_NODE_MIN_HEIGHT,
      stored?.height ?? Math.max(TEXT_NODE_DEFAULT_HEIGHT, contentHeight)
    );

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
      portsStartOffset: 0,
      textLines: lines,
      textFontSize: size,
      textLineHeight: lineHeight,
    };
  }
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
    let noteValue =
      nodeOutputs[noteOutputKey] ?? (fallbackText.length > 0 ? fallbackText : null);
    
    const noteOptions = resolvePanelFormatOptions(parameters);
    const hasContent =
      noteValue != null &&
      !(typeof noteValue === "string" && noteValue.trim().length === 0);
    
    // Use the universal data inspector for textNote display
    const noteLines = hasContent
      ? inspectValue(noteValue, {
          resolveGeometry: (id: string) =>
            geometryItems?.find((item) => item.id === id),
          maxLines: noteOptions.maxLines,
          showMeshPositions: !!noteOptions.showMeshPositions,
        })
      : ["Edit me!"];
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
  const isViewerNode =
    node.type === "geometryViewer" || node.type === "customPreview" || node.type === "customViewer";
  const minHeight = isViewerNode
    ? VIEWER_NODE_MIN_HEIGHT
    : node.type === "slider"
      ? SLIDER_NODE_MIN_HEIGHT
      : NODE_MIN_HEIGHT;
  const nodeOutputs = node.data?.outputs ?? {};
  const panelOutputKey = definition?.primaryOutputKey ?? ports.outputs[0]?.key ?? "data";
  const panelFallback =
    node.type === "panel" && typeof parameters.text === "string" ? parameters.text : null;
  let panelValue =
    nodeOutputs[panelOutputKey] ?? (panelFallback && panelFallback.length > 0 ? panelFallback : null);
  
  const panelOptions = node.type === "panel" ? resolvePanelFormatOptions(parameters) : null;
  
  // Use the universal data inspector for panel display
  const panelLines =
    node.type === "panel" && panelOptions
      ? inspectValue(panelValue, {
          resolveGeometry: (id: string) =>
            geometryItems?.find((item) => item.id === id),
          maxLines: panelOptions.maxLines,
          showMeshPositions: !!panelOptions.showMeshPositions,
        })
      : undefined;
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

const computeNodeLayouts = (nodes: any[], geometryItems?: any[]) => {
  const layouts = new Map<string, NodeLayout>();
  const nodeById = new Map<string, any>();
  nodes.forEach((node) => {
    nodeById.set(node.id, node);
    layouts.set(node.id, computeNodeLayout(node, geometryItems));
  });
  nodes.forEach((node) => {
    if (node.parentNode) {
      const parentNode = nodeById.get(node.parentNode);
      if (parentNode) {
        const layout = layouts.get(node.id);
        if (layout) {
          layout.x += parentNode.position.x;
          layout.y += parentNode.position.y;
          layout.inputs.forEach((p) => {
            p.x += parentNode.position.x;
            p.y += parentNode.position.y;
          });
          layout.outputs.forEach((p) => {
            p.x += parentNode.position.x;
            p.y += parentNode.position.y;
          });
        }
      }
    }
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

const buildConnectedOutputSet = (edges: any[], layouts: Map<string, NodeLayout>) => {
  const connectedByNode = new Map<string, Set<string>>();
  edges.forEach((edge) => {
    const sourceLayout = layouts.get(edge.source);
    const sourceKey = edge.sourceHandle ?? sourceLayout?.defaultOutputKey;
    if (!sourceKey) return;
    const set = connectedByNode.get(edge.source);
    if (set) {
      set.add(sourceKey);
      return;
    }
    connectedByNode.set(edge.source, new Set([sourceKey]));
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

const SOLVER_NODE_TYPES = new Set([
  "chemistrySolver",
  "physicsSolver",
  "evolutionarySolver",
  "voxelSolver",
  "topologyOptimizationSolver",
]);

export const NumericalCanvas = ({
  width,
  height,
  pendingNodeType,
  onDropNode,
  onOpenDashboard,
  mode = "standard",
  enableMinimapPanZoom = false,
  captureMode = null,
  hoverPopupsEnabled = true,
}: NumericalCanvasProps) => {
  const isMinimap = mode === "minimap";
  const interactionsEnabled = !isMinimap;
  const panZoomEnabled = isMinimap && enableMinimapPanZoom;
  const canvasInteractive = interactionsEnabled || panZoomEnabled;
  const captureActive = Boolean(captureMode);
  const minScale = isMinimap ? MINIMAP_MIN_SCALE : MIN_SCALE;
  const maxScale = isMinimap ? MINIMAP_MAX_SCALE : MAX_SCALE;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const portCanvasRef = useRef<HTMLCanvasElement>(null);
  const portGlRef = useRef<WebGLRenderingContext | null>(null);
  const portUiRef = useRef<WebGLUIRenderer | null>(null);
  const paletteRef = useRef<CanvasPalette>(getPalette());
  const layoutRef = useRef<Map<string, NodeLayout>>(new Map());
  const [viewTransform, setViewTransform] = useState<ViewTransform>({
    x: width / 2,
    y: height / 2,
    scale: 1.0,
  });
  const [dragState, setDragState] = useState<DragState>({ type: "none" });
  const [hoveredTarget, setHoveredTarget] = useState<HitTarget>({ type: "none" });
  const [groupResizeHoverId, setGroupResizeHoverId] = useState<string | null>(null);
  const [textResizeHoverId, setTextResizeHoverId] = useState<string | null>(null);
  const [sliderHover, setSliderHover] = useState<{
    nodeId: string;
    part: "track";
  } | null>(null);
  const [focusedSliderId, setFocusedSliderId] = useState<string | null>(null);
  const [inlineEditor, setInlineEditor] = useState<InlineEditorState | null>(null);
  const [sliderPopoverId, setSliderPopoverId] = useState<string | null>(null);
  const inlineEditorRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [nodeSearchPopup, setNodeSearchPopup] = useState<NodeSearchPopupState | null>(null);
  const [nodeSearchQuery, setNodeSearchQuery] = useState("");
  const [nodeSearchIndex, setNodeSearchIndex] = useState(0);
  const [chemistryMaterialPopupNodeId, setChemistryMaterialPopupNodeId] = useState<string | null>(null);
  const nodeSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [gridSnapEnabled, setGridSnapEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = safeLocalStorageGet(GRID_SNAP_KEY);
    if (stored === null) return true;
    return stored === "true";
  });
  const [showShortcutOverlay, setShowShortcutOverlay] = useState(() => {
    if (typeof window === "undefined" || isMinimap) return false;
    return safeLocalStorageGet(SHORTCUT_OVERLAY_KEY) === "true";
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
  const lastRightClickRef = useRef<{ time: number; screen: Vec2 } | null>(null);
  const doubleRightClickRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingFileAddRef = useRef<Vec2 | null>(null);
  const pendingFileTargetRef = useRef<string | null>(null);

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
    const targets = nodes.filter(
      (node) =>
        node.type === "geometryViewer" ||
        node.type === "customPreview" ||
        node.type === "customViewer"
    );
    if (targets.length === 0) return [];
    const layouts = computeNodeLayouts(nodes, geometry);
    const availableGeometryIds = new Set(geometry.map((item) => item.id));
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const fallbackId = selectedGeometryIds[0];
    const fallbackGeometryId =
      fallbackId && availableGeometryIds.has(fallbackId) ? fallbackId : null;

    return targets.map((node) => {
      const layout = layouts.get(node.id) ?? computeNodeLayout(node, geometry);
      const inputKey = layout.defaultInputKey ?? "geometry";
      const edge = edges.find(
        (entry) =>
          entry.target === node.id &&
          (entry.targetHandle ?? inputKey) === inputKey
      );
      let geometryIds = fallbackGeometryId ? [fallbackGeometryId] : [];
      let filterSpec: PreviewFilterSpec | null = null;

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

      if (
        node.type === "customPreview" ||
        node.type === "geometryViewer" ||
        node.type === "customViewer"
      ) {
        const filterEdge = edges.find(
          (entry) =>
            entry.target === node.id &&
            (entry.targetHandle ?? "filter") === "filter"
        );
        if (filterEdge) {
          const sourceLayout = layouts.get(filterEdge.source);
          const outputKey = filterEdge.sourceHandle ?? sourceLayout?.defaultOutputKey;
          const sourceNode = nodeById.get(filterEdge.source);
          const outputValue = outputKey
            ? sourceNode?.data?.outputs?.[outputKey]
            : undefined;
          filterSpec = coercePreviewFilter(outputValue);
        }
      }

      return { nodeId: node.id, layout, geometryIds, filter: filterSpec };
    });
  }, [nodes, edges, geometry, selectedGeometryIds]);

  const searchableNodeOptions = useMemo(
    () => NODE_DEFINITIONS.filter((definition) => definition.type !== "primitive"),
    []
  );

  const nodeSearchResults = useMemo(() => {
    const normalized = nodeSearchQuery.trim().toLowerCase();
    const list =
      normalized.length === 0
        ? searchableNodeOptions
        : searchableNodeOptions.filter((definition) => {
            const categoryLabel =
              NODE_CATEGORY_BY_ID.get(definition.category)?.label.toLowerCase() ?? "";
            const displayEnglish = definition.display?.nameEnglish ?? "";
            const displayGreek = definition.display?.nameGreek ?? "";
            const displayRoman = definition.display?.romanization ?? "";
            const haystack = [
              definition.label,
              definition.shortLabel,
              definition.description,
              definition.type,
              categoryLabel,
              displayEnglish,
              displayGreek,
              displayRoman,
            ]
              .filter(Boolean)
              .map((value) => String(value).toLowerCase())
              .join(" ");
            return haystack.includes(normalized);
          });
    return list.slice(0, 8);
  }, [nodeSearchQuery, searchableNodeOptions]);

  const inlineEditorKey = inlineEditor
    ? `${inlineEditor.type}:${inlineEditor.nodeId}`
    : null;

  useEffect(() => {
    if (!inlineEditorKey) return;
    const id = requestAnimationFrame(() => {
      const element = inlineEditorRef.current;
      if (!element) return;
      element.focus();
      if (typeof element.select === "function") {
        element.select();
      }
    });
    return () => cancelAnimationFrame(id);
  }, [inlineEditorKey]);

  useEffect(() => {
    if (!nodeSearchPopup) return;
    const id = requestAnimationFrame(() => {
      nodeSearchInputRef.current?.focus();
      nodeSearchInputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [nodeSearchPopup]);

  useEffect(() => {
    setNodeSearchIndex(0);
  }, [nodeSearchQuery]);

  useEffect(() => {
    if (!isMinimap) return;
    if (width <= 0 || height <= 0) return;

    const layouts = computeNodeLayouts(nodes, geometry);
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
    const canvas = portCanvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true, alpha: true });
    if (!gl) return;
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    portGlRef.current = gl;
    portUiRef.current = new WebGLUIRenderer(gl);
  }, []);

  useEffect(() => {
    if (!interactionsEnabled || typeof window === "undefined") return;
    safeLocalStorageSet(GRID_SNAP_KEY, String(gridSnapEnabled));
  }, [gridSnapEnabled, interactionsEnabled]);

  useEffect(() => {
    if (!interactionsEnabled || typeof window === "undefined") return;
    safeLocalStorageSet(SHORTCUT_OVERLAY_KEY, String(showShortcutOverlay));
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
        setNodeSearchPopup(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [interactionsEnabled]);

  useEffect(() => {
    if (!pendingNodeType) return;
    setHoveredTarget({ type: "none" });
    setSliderHover(null);
    const handlePointerMove = (event: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      pointerScreenRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [pendingNodeType]);

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
      const layouts = computeNodeLayouts(nodes, geometry);
      layoutRef.current = layouts;
      const connectedInputs = buildConnectedInputSet(edges, layouts);

      const tooltip =
        captureActive || !hoverPopupsEnabled
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
      drawGroupNodes(ctx, nodes, layouts, hoveredTarget, palette, geometry);
      drawConnections(ctx, edges, layouts, hoveredTarget, palette, viewTransform);
      const renderPortBodies =
        captureActive ||
        !portUiRef.current ||
        !portGlRef.current ||
        !portCanvasRef.current;
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
        dragState,
        renderPortBodies
      );

      if (!renderPortBodies && portCanvasRef.current && portGlRef.current && portUiRef.current) {
        renderWebGLPorts({
          gl: portGlRef.current,
          ui: portUiRef.current,
          canvas: portCanvasRef.current,
          width,
          height,
          dpr,
          viewTransform,
          layouts,
          edges,
          hoveredTarget,
          dragState,
          palette,
          connectedInputs,
          isMinimap,
          captureActive,
        });
      }

      if (pendingNodeType && !captureActive) {
        const pointer = pointerScreenRef.current;
        const pendingWorld = screenToWorld(pointer.x, pointer.y);
        const ghostNode = {
          id: "__pending-node",
          type: pendingNodeType,
          position: { x: pendingWorld.x, y: pendingWorld.y },
          data: {},
          selected: false,
        };
        const ghostLayouts = new Map<string, NodeLayout>();
        const ghostLayout = computeNodeLayout(ghostNode);
        ghostLayouts.set(ghostNode.id, ghostLayout);
        const ghostConnectedInputs = new Map<string, Set<string>>();
        const requiredInputs = ghostLayout.inputs
          .filter((portLayout) => portLayout.port.required)
          .map((portLayout) => portLayout.port.key);
        ghostConnectedInputs.set(ghostNode.id, new Set(requiredInputs));
        drawNodes(
          ctx,
          [ghostNode],
          [],
          ghostLayouts,
          ghostConnectedInputs,
          geometry,
          { type: "none" },
          palette,
          null,
          null,
          { type: "none" },
          true,
          new Set([ghostNode.id]),
          0.45
        );
      }

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
    pendingNodeType,
    pendingReference,
    shortcutOverlayEnabled,
    gridSnapEnabled,
    captureMode,
    hoverPopupsEnabled,
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
      const layout = layouts.get(node.id) ?? computeNodeLayout(node, geometry);
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
    } else if (inlineEditor.type === "text") {
      const trimmed = inlineEditor.value.trim();
      const nextText = trimmed.length > 0 ? inlineEditor.value : "Text";
      const nextLabel = nextText.split("\n")[0].trim().slice(0, 40) || "Text";
      updateNodeData(inlineEditor.nodeId, {
        label: nextLabel,
        parameters: { text: nextText },
      });
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

  const handleNodeSearchSelect = (type: NodeType) => {
    if (!nodeSearchPopup) return;
    addNodeAt(type, { x: nodeSearchPopup.world.x, y: nodeSearchPopup.world.y });
    setNodeSearchPopup(null);
    setNodeSearchQuery("");
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
      const layout = layouts.get(node.id) ?? computeNodeLayout(node, geometry);
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

  const openStlFilePicker = (world: Vec2 | null, targetNodeId?: string | null) => {
    pendingFileAddRef.current = world;
    pendingFileTargetRef.current = targetNodeId ?? null;
    const input = fileInputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  };

  const handleStlFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const world = pendingFileAddRef.current ?? { x: 0, y: 0 };
    const targetNodeId = pendingFileTargetRef.current;
    pendingFileAddRef.current = null;
    pendingFileTargetRef.current = null;
    try {
      const buffer = await file.arrayBuffer();
      if (targetNodeId) {
        const targetNode = nodes.find((entry) => entry.id === targetNodeId);
        if (targetNode?.type === "stlImport") {
          const nextParameters = {
            ...(targetNode.data?.parameters ?? {}),
            file: {
              name: file.name,
              type: file.type,
              data: arrayBufferToBase64(buffer),
            },
            importNow: true,
          };
          updateNodeData(targetNodeId, { parameters: nextParameters });
          return;
        }
      }
      const importNodeId = addNodeAt("stlImport", { x: world.x, y: world.y });
      const viewerNodeId = addNodeAt("geometryViewer", {
        x: world.x + NODE_WIDTH + 80,
        y: world.y,
      });
      updateNodeData(importNodeId, {
        parameters: {
          file: {
            name: file.name,
            type: file.type,
            data: arrayBufferToBase64(buffer),
          },
          importNow: true,
        },
      });
      onConnect({
        source: importNodeId,
        target: viewerNodeId,
        sourceHandle: "geometry",
        targetHandle: "geometry",
      });
    } catch (error) {
      console.error("Failed to import STL from context menu.", error);
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
    const computed = computeNodeLayouts(nodes, geometry);
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
    const hasGeometry = geometry.some((item) => item.id === selectedGeometryId);
    if (!hasGeometry) {
      setPendingReference(null);
      return;
    }
    try {
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
    } catch (error) {
      console.error("Numerica reference failed.", error);
    } finally {
      setPendingReference(null);
    }
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
      try {
        action();
      } catch (error) {
        console.error("Numerica menu action failed.", error);
      } finally {
        setContextMenu(null);
      }
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

      actions.push({
        label: node?.hidden ? "Show Node" : "Hide Node",
        onSelect: closeMenu(() => {
          onNodesChange([
            {
              id: target.nodeId,
              type: "update" as const,
              updates: { hidden: !node?.hidden },
            },
          ]);
        }),
      });



      if (node?.type && SOLVER_NODE_TYPES.has(node.type)) {
        actions.push({
          label: "Open Simulator",
          onSelect: closeMenu(() => onOpenDashboard?.(target.nodeId)),
        });
      }

      if (node?.type === "chemistryMaterialGoal") {
        actions.push({
          label: "Assign Materials",
          onSelect: closeMenu(() => setChemistryMaterialPopupNodeId(target.nodeId)),
        });
      }

      if (node?.type === "stlImport") {
        const stlImportDef = getNodeDefinition("stlImport");
        const fileParam = stlImportDef?.parameters?.find((p) => p.key === "file");
        actions.push({
          label: fileParam?.label ? `Select ${fileParam.label}…` : "Select STL File…",
          onSelect: closeMenu(() => openStlFilePicker(null, target.nodeId)),
        });
        actions.push({
          label: "Reference Selected Mesh",
          disabled: !selectedGeometryId || selectedGeometryType !== "mesh",
          onSelect: closeMenu(() => {
            if (!selectedGeometryId || selectedGeometryType !== "mesh") return;
            updateNodeData(target.nodeId, {
              geometryId: selectedGeometryId,
              geometryType: selectedGeometryType,
              isLinked: true,
            });
          }),
        });
      }

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

      if (node?.type === "text") {
        actions.push({
          label: "Edit Text",
          onSelect: closeMenu(() => {
            beginInlineEdit("text", target.nodeId);
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
          label: "Edit Settings",
          onSelect: closeMenu(() => {
            setSliderPopoverId(target.nodeId);
            setFocusedSliderId(target.nodeId);
          }),
        });
      }

      if (node?.type === "genomeCollector") {
        const selectedSliders = nodes.filter(
          (entry) => entry.selected && entry.type === "slider"
        );
        actions.push({
          label: "Add Selected Sliders",
          disabled: selectedSliders.length === 0,
          onSelect: closeMenu(() => {
            selectedSliders.forEach((slider) => {
              onConnect({
                source: slider.id,
                sourceHandle: "value",
                target: target.nodeId,
                targetHandle: "sliders",
              });
            });
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
    const selectedNodes = nodes.filter((node) => node.selected);
    const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));
    if (selectedNodeIds.size > 0) {
      actions.push({
        label: "Frame Selection",
        onSelect: closeMenu(() => frameNodes(selectedNodeIds)),
      });
      
      const allSelectedHidden = selectedNodes.every((node) => node.hidden);
      const someSelectedHidden = selectedNodes.some((node) => node.hidden);
      
      if (someSelectedHidden) {
        actions.push({
          label: "Show Selected Nodes",
          onSelect: closeMenu(() => {
            const changes = selectedNodes.map((node) => ({
              id: node.id,
              type: "update" as const,
              updates: { hidden: false },
            }));
            onNodesChange(changes);
          }),
        });
      }
      
      if (!allSelectedHidden) {
        actions.push({
          label: "Hide Selected Nodes",
          onSelect: closeMenu(() => {
            const changes = selectedNodes.map((node) => ({
              id: node.id,
              type: "update" as const,
              updates: { hidden: true },
            }));
            onNodesChange(changes);
          }),
        });
      }
    }
    if (groupSelectionCount > 1) {
      actions.push({
        label: "Group Selection",
        onSelect: closeMenu(() => createGroupFromSelection()),
      });
    }
    const stlImportDef = getNodeDefinition("stlImport");
    const textNoteDef = getNodeDefinition("textNote");
    actions.push({
      label: stlImportDef ? `Add ${stlImportDef.label}` : "Add File (STL)",
      onSelect: closeMenu(() => openStlFilePicker(world, null)),
    });
    actions.push({
      label: textNoteDef ? `Add ${textNoteDef.label}` : "Add Text Note",
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
    openStlFilePicker,
    beginInlineEdit,
    createGroupFromSelection,
    setSliderPopoverId,
    setFocusedSliderId,
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
    if (label.includes("add file")) return "load";
    if (label.includes("select stl")) return "load";
    if (label.includes("physics solver rig")) return "solver";
    if (label.includes("chemistry solver rig")) return "solver";
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
    if (label.startsWith("Reference Selected Mesh")) {
      if (!selectedGeometryId) return "Reference";
      const shortId = selectedGeometryId.slice(0, 6);
      return `Ref ${shortId}`;
    }
    if (label.startsWith("Add STL Import")) return "Add STL";
    if (label.startsWith("Add Text Note")) return "Add Note";
    if (label.startsWith("Select STL File")) return "Select File";
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
    if (label.startsWith("Edit Settings")) return "Settings";
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
      const layout = layouts.get(node.id) ?? computeNodeLayout(node, geometry);
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

      const hitPadding = node.type === "text" ? TEXT_NODE_HIT_PADDING : 0;
      const withinNode =
        worldX >= layout.x - hitPadding &&
        worldX <= layout.x + layout.width + hitPadding &&
        worldY >= layout.y - hitPadding &&
        worldY <= layout.y + layout.height + hitPadding;
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

    if (nodeSearchPopup) {
      setNodeSearchPopup(null);
      setNodeSearchQuery("");
    }

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

    if (pendingNodeType && e.button === 0) {
      setHoveredTarget({ type: "none" });
      e.preventDefault();
      return;
    }
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
      
      // Check for double-right-click
      const now = Date.now();
      const lastClick = lastRightClickRef.current;
      const DOUBLE_CLICK_MS = 300;
      
      if (lastClick && now - lastClick.time < DOUBLE_CLICK_MS) {
        // Double-right-click detected
        doubleRightClickRef.current = true;
        lastRightClickRef.current = null;
        // Don't start panning, let the context menu show
        return;
      } else {
        // Single right-click - start panning
        lastRightClickRef.current = { time: now, screen: { x: screenX, y: screenY } };
        doubleRightClickRef.current = false;
      }
      
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
          const layout = layouts.get(node.id) ?? computeNodeLayout(node, geometry);
          if (!layouts.has(node.id)) {
            layouts.set(node.id, layout);
          }
          if (
            isPointInGroupResizeHandle(world, layout, viewTransform.scale) &&
            e.button === 0
          ) {
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
        if (node.type === "text") {
          const layouts = getLayouts();
          const layout = layouts.get(node.id) ?? computeNodeLayout(node, geometry);
          if (!layouts.has(node.id)) {
            layouts.set(node.id, layout);
          }
          if (
            isPointInTextResizeHandle(world, layout, viewTransform.scale) &&
            e.button === 0
          ) {
            if (e.button === 0) {
              setNodeSelection(target.nodeId, isMultiSelect);
            }
            setDragState({
              type: "resizeText",
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
          const layout = layouts.get(node.id) ?? computeNodeLayout(node, geometry);
          if (!layouts.has(node.id)) {
            layouts.set(node.id, layout);
          }
          const sliderBounds = getSliderBounds(layout);
          if (!isMultiSelect) {
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
    const layout = layouts.get(node.id) ?? computeNodeLayout(node, geometry);
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
    if (node.type === "text") {
      beginInlineEdit("text", node.id);
      return;
    }
    if (node.type === "textNote") {
      beginInlineEdit("note", node.id);
      return;
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

    if (pendingNodeType && dragState.type === "none") {
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

    if (dragState.type === "resizeText") {
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
        textSize: {
          width: Math.max(TEXT_NODE_MIN_WIDTH, nextWidth),
          height: Math.max(TEXT_NODE_MIN_HEIGHT, nextHeight),
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
    let nextSliderHover: { nodeId: string; part: "track" } | null = null;
    let nextGroupResizeHoverId: string | null = null;
    let nextTextResizeHoverId: string | null = null;
    if (target.type === "node") {
      const node = nodes.find((entry) => entry.id === target.nodeId);
      if (node?.type === "group") {
        const layouts = getLayouts();
        const layout = layouts.get(node.id) ?? computeNodeLayout(node, geometry);
        if (!layouts.has(node.id)) {
          layouts.set(node.id, layout);
        }
        if (isPointInGroupResizeHandle(world, layout, viewTransform.scale)) {
          nextGroupResizeHoverId = node.id;
        }
      }
      if (node?.type === "text") {
        const layouts = getLayouts();
        const layout = layouts.get(node.id) ?? computeNodeLayout(node, geometry);
        if (!layouts.has(node.id)) {
          layouts.set(node.id, layout);
        }
        if (isPointInTextResizeHandle(world, layout, viewTransform.scale)) {
          nextTextResizeHoverId = node.id;
        }
      }
      if (node?.type === "slider") {
        const layouts = getLayouts();
        const layout = layouts.get(node.id) ?? computeNodeLayout(node, geometry);
        if (!layouts.has(node.id)) {
          layouts.set(node.id, layout);
        }
        const sliderBounds = getSliderBounds(layout);
        if (isPointInRect(world, sliderBounds)) {
          nextSliderHover = { nodeId: node.id, part: "track" };
        }
      }
    }
    setSliderHover(nextSliderHover);
    if (nextGroupResizeHoverId !== groupResizeHoverId) {
      setGroupResizeHoverId(nextGroupResizeHoverId);
    }
    if (nextTextResizeHoverId !== textResizeHoverId) {
      setTextResizeHoverId(nextTextResizeHoverId);
    }
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
          const layout = layouts.get(node.id) ?? computeNodeLayout(node, geometry);
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
        const layout = layouts.get(node.id) ?? computeNodeLayout(node, geometry);
        if (!layouts.has(node.id)) {
          layouts.set(node.id, layout);
        }
        const sliderBounds = getSliderBounds(layout);
        const isOverSlider = isPointInRect(world, sliderBounds);
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
        const layout = layouts.get(node.id) ?? computeNodeLayout(node, geometry);
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
      
      if (node?.type === "textNote") {
        const layouts = getLayouts();
        const layout = layouts.get(node.id) ?? computeNodeLayout(node, geometry);
        if (!layouts.has(node.id)) {
          layouts.set(node.id, layout);
        }
        const noteBounds = getTextNoteContentBounds(layout);
        if (isPointInRect(world, noteBounds)) {
          const rawLines = layout.noteLines ?? ["Edit me!"];
          const visibleLines = Math.max(
            1,
            Math.floor(noteBounds.height / NOTE_LINE_HEIGHT)
          );
          const maxScroll = Math.max(0, rawLines.length - visibleLines);
          if (maxScroll > 0) {
            const baseStep = Math.max(1, NOTE_LINE_HEIGHT * viewTransform.scale);
            const stepCount = Math.max(1, Math.round(Math.abs(deltaY) / baseStep));
            const scrollDelta = Math.sign(deltaY) * stepCount;
            const current = Math.round(readNumber(node.data?.textNoteScroll, 0));
            const next = Math.min(maxScroll, Math.max(0, current + scrollDelta));
            if (next !== current) {
              updateNodeData(node.id, { textNoteScroll: next });
            }
            return;
          }
          if (node.data?.textNoteScroll) {
            updateNodeData(node.id, { textNoteScroll: 0 });
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
    if (nodeSearchPopup) {
      setNodeSearchPopup(null);
      setNodeSearchQuery("");
    }
    // Only show context menu on double-right-click
    if (!doubleRightClickRef.current) {
      doubleRightClickRef.current = false;
      return;
    }
    if (suppressContextMenuRef.current || rightClickHeldRef.current) {
      suppressContextMenuRef.current = false;
      rightClickHeldRef.current = false;
      doubleRightClickRef.current = false;
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
    doubleRightClickRef.current = false;
  };

  const activeSearchResult =
    nodeSearchResults.length > 0
      ? nodeSearchResults[Math.min(nodeSearchIndex, nodeSearchResults.length - 1)]
      : null;

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
    inlineEditorLayout
      ? {
          left: inlineEditorLayout.x * viewTransform.scale + viewTransform.x,
          top: inlineEditorLayout.y * viewTransform.scale + viewTransform.y,
          width: inlineEditorLayout.width * viewTransform.scale,
          height: inlineEditorLayout.height * viewTransform.scale,
        }
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
                : dragState.type === "resizeText"
                ? "nwse-resize"
                : dragState.type === "slider"
                ? "ew-resize"
                : sliderHover?.part === "track"
                  ? "ew-resize"
                  : groupResizeHoverId
                    ? "nwse-resize"
                    : textResizeHoverId
                    ? "nwse-resize"
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
      <canvas
        ref={portCanvasRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl"
        onChange={handleStlFileSelect}
        style={{ display: "none" }}
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
          const rowCount = Math.max(
            viewer.layout.inputs.length,
            viewer.layout.outputs.length,
            1
          );
          const viewerTopOffset =
            viewer.layout.portsStartOffset + rowCount * PORT_ROW_HEIGHT + 6;
          const frameLeft =
            viewer.layout.x * scale + viewTransform.x + VIEWER_INSET * scale;
          const frameTop =
            viewer.layout.y * scale + viewTransform.y + viewerTopOffset * scale;
          const frameWidth =
            (viewer.layout.width - VIEWER_INSET * 2) * scale;
          const frameHeight =
            (viewer.layout.height - viewerTopOffset - VIEWER_BOTTOM_OFFSET) * scale;
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
              <WorkflowGeometryViewer
                geometryIds={viewer.geometryIds}
                displayMode={viewer.filter?.displayMode}
                viewSolidity={viewer.filter?.viewSolidity}
                viewSettings={viewer.filter?.viewSettings}
              />
            </div>
          );
        })}
        {inlineEditor && inlineEditorScreen && inlineEditorLayout ? (
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
                borderRadius: 4,
                border: "1px solid rgba(31, 31, 34, 0.25)",
                background: "rgba(255, 255, 255, 0.98)",
                color: "#1f1f22",
                font: `600 ${Math.max(
                  10,
                  11 * viewTransform.scale
                )}px \"Montreal Neue\", \"Space Grotesk\", sans-serif`,
                pointerEvents: "auto",
                zIndex: 4,
              }}
            />
          ) : inlineEditor.type === "text" ? (
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
                left: inlineEditorScreen.left,
                top: inlineEditorScreen.top,
                width: Math.max(160, inlineEditorScreen.width + 80),
                height: Math.max(24, inlineEditorScreen.height + 6),
                padding: 0,
                border: "none",
                borderBottom: "1px dashed rgba(31, 31, 34, 0.35)",
                background: "transparent",
                color: "#1f1f22",
                font: `500 ${Math.max(
                  12,
                  (inlineEditorLayout.textFontSize ?? TEXT_NODE_DEFAULT_SIZE) *
                    viewTransform.scale
                )}px ${TEXT_NODE_FONT_FAMILY}`,
                lineHeight: `${Math.max(
                  12,
                  (inlineEditorLayout.textLineHeight ??
                    TEXT_NODE_DEFAULT_SIZE * TEXT_NODE_LINE_HEIGHT) *
                    viewTransform.scale
                )}px`,
                outline: "none",
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
                borderRadius: 5,
                background: "rgba(255, 255, 255, 0.35)",
                color: "#3b332d",
                font: `500 ${Math.max(
                  10,
                  11 * viewTransform.scale
                )}px \"Montreal Neue\", \"Space Grotesk\", sans-serif`,
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
              borderRadius: "7px",
              border: "1px solid var(--sp-divider, #c9c5c0)",
              background: "var(--sp-porcelain, #f5f2ee)",
              boxShadow: "var(--shadow-panel, 0 10px 24px rgba(0, 0, 0, 0.18))",
              color: "var(--sp-ink, #1f1f22)",
              font: '500 11px "Montreal Neue", "Space Grotesk", sans-serif',
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
                    borderRadius: 4,
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
                    borderRadius: 4,
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
                    borderRadius: 4,
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
            borderRadius: "4px",
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
      {interactionsEnabled && nodeSearchPopup ? (() => {
        const popupWidth = 260;
        const popupHeight = 220;
        const left = Math.max(8, Math.min(width - popupWidth - 8, nodeSearchPopup.screen.x));
        const top = Math.max(8, Math.min(height - popupHeight - 8, nodeSearchPopup.screen.y));
        return (
          <div
            role="dialog"
            style={{
              position: "absolute",
              left: `${left}px`,
              top: `${top}px`,
              width: `${popupWidth}px`,
              padding: "10px",
              borderRadius: "10px",
              border: "1px solid rgba(0, 0, 0, 0.2)",
              background: "var(--roslyn-cream, #f7f3ea)",
              boxShadow: "0 10px 24px rgba(0, 0, 0, 0.24)",
              display: "grid",
              gap: "8px",
              pointerEvents: "auto",
              zIndex: 6,
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(31, 31, 34, 0.7)",
              }}
            >
              Node Search
            </div>
            <input
              ref={nodeSearchInputRef}
              type="search"
              placeholder="Type to search…"
              value={nodeSearchQuery}
              onChange={(event) => setNodeSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setNodeSearchIndex((prev) =>
                    Math.min(prev + 1, Math.max(0, nodeSearchResults.length - 1))
                  );
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setNodeSearchIndex((prev) => Math.max(0, prev - 1));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  if (activeSearchResult) {
                    handleNodeSearchSelect(activeSearchResult.type as NodeType);
                  }
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setNodeSearchPopup(null);
                  setNodeSearchQuery("");
                }
              }}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid rgba(0, 0, 0, 0.2)",
                background: "#ffffff",
                font: '500 11px "Montreal Neue", "Space Grotesk", sans-serif',
              }}
            />
            <div
              style={{
                display: "grid",
                gap: "4px",
                maxHeight: `${popupHeight - 96}px`,
                overflowY: "auto",
                paddingRight: "2px",
              }}
            >
              {nodeSearchResults.length === 0 ? (
                <div
                  style={{
                    fontSize: "11px",
                    color: "rgba(31, 31, 34, 0.55)",
                    padding: "4px 2px",
                  }}
                >
                  No matches.
                </div>
              ) : (
                nodeSearchResults.map((definition, index) => {
                  const isActive = index === nodeSearchIndex;
                  const category =
                    NODE_CATEGORY_BY_ID.get(definition.category)?.label ?? definition.category;
                  const greek = definition.display?.nameGreek ?? definition.label;
                  const english = definition.display?.nameEnglish ?? definition.label;
                  return (
                    <button
                      key={definition.type}
                      type="button"
                      onClick={() => handleNodeSearchSelect(definition.type as NodeType)}
                      onPointerDown={(event) => event.stopPropagation()}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                        padding: "6px 8px",
                        borderRadius: 8,
                        border: isActive
                          ? "1px solid rgba(122, 92, 255, 0.6)"
                          : "1px solid transparent",
                        background: isActive ? "rgba(122, 92, 255, 0.12)" : "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#1f1f22",
                        }}
                      >
                        {greek}
                      </span>
                      <span
                        style={{
                          fontSize: "9px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "rgba(31, 31, 34, 0.6)",
                        }}
                      >
                        {english} · {category}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })() : null}

      {interactionsEnabled && chemistryMaterialPopupNodeId ? (
        <div data-capture-hide="true">
          <ChemistryMaterialPopup
            nodeId={chemistryMaterialPopupNodeId}
            onClose={() => setChemistryMaterialPopupNodeId(null)}
          />
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
    const portColor = resolvePortColor(endpoints.sourcePort.port, "#8800ff");
    const baseColor = isActive ? "#00d4ff" : portColor;
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

const drawCapsule = (
  ui: WebGLUIRenderer,
  scale: number,
  start: Vec2,
  end: Vec2,
  radius: number,
  color: RGBA
) => {
  ui.drawLine(start.x * scale, start.y * scale, end.x * scale, end.y * scale, radius * 2 * scale, color);
  ui.drawFilledCircle(start.x * scale, start.y * scale, radius * scale, color);
  ui.drawFilledCircle(end.x * scale, end.y * scale, radius * scale, color);
};

const drawPortOutlet = (
  ui: WebGLUIRenderer,
  scale: number,
  position: Vec2,
  radius: number,
  baseColor: RGBA,
  state: PortRenderState,
  shadowColor: RGBA,
  time: number,
  isMinimap: boolean
) => {
  const px = position.x * scale;
  const py = position.y * scale;
  const r = radius * scale;

  if (radius <= 2 || isMinimap) {
    ui.drawFilledCircle(px, py, Math.max(1, r), withAlpha(baseColor, 0.9));
    return;
  }

  if (state.hovered || state.active) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.006);
    const glowAlpha = state.hovered ? 0.28 + pulse * 0.08 : 0.2 + pulse * 0.06;
    ui.drawFilledCircle(px, py, r * 1.7, withAlpha(baseColor, glowAlpha));
  }

  ui.drawFilledCircle(px + r * 0.18, py + r * 0.24, r * 1.12, withAlpha(shadowColor, 0.3));
  ui.drawFilledCircle(px, py, r * 1.03, darken(baseColor, 0.34));
  ui.drawFilledCircle(px, py, r * 0.82, lighten(baseColor, 0.18));
  ui.drawFilledCircle(px - r * 0.05, py + r * 0.06, r * 0.48, darken(baseColor, 0.65));

  const slotWidth = r * 0.7;
  const slotHeight = Math.max(1, r * 0.14);
  ui.drawRect(px - slotWidth / 2, py - slotHeight / 2, slotWidth, slotHeight, withAlpha(darken(baseColor, 0.78), 0.92));

  if (state.connected) {
    ui.drawFilledCircle(px, py, r * 0.22, withAlpha(lighten(baseColor, 0.35), 0.95));
  }

  ui.drawFilledCircle(px - r * 0.3, py - r * 0.3, r * 0.18, withAlpha([1, 1, 1, 1], 0.35));
};

const drawPortPlug = (
  ui: WebGLUIRenderer,
  scale: number,
  position: Vec2,
  direction: Vec2,
  radius: number,
  baseColor: RGBA,
  state: PortRenderState,
  time: number
) => {
  if (radius <= 2) return;
  const bodyRadius = Math.max(1.2, radius * 0.45);
  const bodyLength = radius * 2.2;
  const collarLength = radius * 0.9;
  const insert = state.hovered || state.active ? 0.16 : 0.3;
  const base = {
    x: position.x + direction.x * radius * insert,
    y: position.y + direction.y * radius * insert,
  };
  const tip = {
    x: base.x + direction.x * bodyLength,
    y: base.y + direction.y * bodyLength,
  };

  const bodyColor = mixColor([0.08, 0.08, 0.09, 1], baseColor, 0.35);
  const collarColor = mixColor([0.2, 0.2, 0.22, 1], baseColor, 0.45);
  const ringColor = lighten(baseColor, 0.22);

  if (state.hovered || state.active) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.007);
    const glowAlpha = state.hovered ? 0.22 + pulse * 0.08 : 0.16 + pulse * 0.06;
    drawCapsule(
      ui,
      scale,
      base,
      { x: tip.x + direction.x * bodyRadius * 0.6, y: tip.y + direction.y * bodyRadius * 0.6 },
      bodyRadius * 0.95,
      withAlpha(baseColor, glowAlpha)
    );
  }

  drawCapsule(ui, scale, base, tip, bodyRadius, bodyColor);

  const collarStart = {
    x: base.x - direction.x * collarLength * 0.2,
    y: base.y - direction.y * collarLength * 0.2,
  };
  const collarEnd = {
    x: base.x + direction.x * collarLength,
    y: base.y + direction.y * collarLength,
  };
  drawCapsule(ui, scale, collarStart, collarEnd, bodyRadius * 1.05, collarColor);

  const ringStart = {
    x: tip.x - direction.x * bodyRadius * 0.2,
    y: tip.y - direction.y * bodyRadius * 0.2,
  };
  const ringEnd = {
    x: tip.x + direction.x * bodyRadius * 0.65,
    y: tip.y + direction.y * bodyRadius * 0.65,
  };
  drawCapsule(ui, scale, ringStart, ringEnd, bodyRadius * 0.7, ringColor);

  const highlight = {
    x: tip.x - direction.y * bodyRadius * 0.35 + direction.x * bodyRadius * 0.2,
    y: tip.y + direction.x * bodyRadius * 0.35 + direction.y * bodyRadius * 0.2,
  };
  ui.drawFilledCircle(highlight.x * scale, highlight.y * scale, bodyRadius * 0.38 * scale, withAlpha([1, 1, 1, 1], 0.32));
};

const renderWebGLPorts = ({
  gl,
  ui,
  canvas,
  width,
  height,
  dpr,
  viewTransform,
  layouts,
  edges,
  hoveredTarget,
  dragState,
  palette,
  connectedInputs,
  isMinimap,
  captureActive,
}: {
  gl: WebGLRenderingContext;
  ui: WebGLUIRenderer;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  dpr: number;
  viewTransform: ViewTransform;
  layouts: Map<string, NodeLayout>;
  edges: any[];
  hoveredTarget: HitTarget;
  dragState: DragState;
  palette: CanvasPalette;
  connectedInputs: Map<string, Set<string>>;
  isMinimap: boolean;
  captureActive: boolean;
}) => {
  const pixelWidth = Math.max(1, Math.floor(width * dpr));
  const pixelHeight = Math.max(1, Math.floor(height * dpr));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  gl.viewport(0, 0, pixelWidth, pixelHeight);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  ui.begin(pixelWidth, pixelHeight);

  const scale = viewTransform.scale;
  const portRadius = PORT_RADIUS * scale;
  const fallbackPortColor = parseCssColor(palette.portFill, [0.15, 0.15, 0.16, 1]);
  const shadowColor = parseCssColor(palette.nodeShadow, [0, 0, 0, 0.35]);
  const time = captureActive ? 0 : performance.now();
  const connectedOutputs = buildConnectedOutputSet(edges, layouts);

  const worldToScreen = (pos: Vec2) => ({
    x: pos.x * scale + viewTransform.x,
    y: pos.y * scale + viewTransform.y,
  });

  const activePort =
    dragState.type === "edge"
      ? {
          nodeId: dragState.sourceNodeId,
          portKey: dragState.sourcePort,
          isOutput: true,
        }
      : null;

  layouts.forEach((layout) => {
    const nodeId = layout.nodeId;
    const inputConnections = connectedInputs.get(nodeId);
    const outputConnections = connectedOutputs.get(nodeId);

    const drawPort = (portLayout: PortLayout) => {
      const port = portLayout.port;
      const portColor = resolvePortColor(port, palette.portFill);
      const baseColor = parseCssColor(portColor, fallbackPortColor);
      const isHovered =
        hoveredTarget.type === "port" &&
        hoveredTarget.nodeId === nodeId &&
        hoveredTarget.portKey === port.key &&
        hoveredTarget.isOutput === portLayout.isOutput;
      const isActive =
        Boolean(activePort) &&
        activePort?.nodeId === nodeId &&
        activePort?.portKey === port.key &&
        activePort?.isOutput === portLayout.isOutput;
      const connected = portLayout.isOutput
        ? outputConnections?.has(port.key) ?? false
        : inputConnections?.has(port.key) ?? false;

      const screenPos = worldToScreen({ x: portLayout.x, y: portLayout.y });
      drawPortOutlet(
        ui,
        dpr,
        screenPos,
        portRadius,
        baseColor,
        { hovered: isHovered, active: isActive, connected },
        shadowColor,
        time,
        isMinimap
      );
    };

    layout.inputs.forEach(drawPort);
    layout.outputs.forEach(drawPort);
  });

  const portCounts = new Map<string, number>();
  const registerPort = (layout: NodeLayout, portLayout: PortLayout) => {
    const key = `${layout.nodeId}:${portLayout.port.key}:${portLayout.isOutput ? "o" : "i"}`;
    portCounts.set(key, (portCounts.get(key) ?? 0) + 1);
  };

  edges.forEach((edge) => {
    const endpoints = resolveEdgeEndpoints(edge, layouts);
    if (!endpoints) return;
    registerPort(endpoints.sourceLayout, endpoints.sourcePort);
    registerPort(endpoints.targetLayout, endpoints.targetPort);
  });

  const portUsage = new Map<string, number>();
  const nextPortOffset = (layout: NodeLayout, portLayout: PortLayout) => {
    const key = `${layout.nodeId}:${portLayout.port.key}:${portLayout.isOutput ? "o" : "i"}`;
    const total = portCounts.get(key) ?? 1;
    const index = portUsage.get(key) ?? 0;
    portUsage.set(key, index + 1);
    const offsetIndex = index - (total - 1) / 2;
    return offsetIndex * portRadius * 0.9;
  };

  edges.forEach((edge) => {
    const endpoints = resolveEdgeEndpoints(edge, layouts);
    if (!endpoints) return;

    const sourceColor = parseCssColor(
      resolvePortColor(endpoints.sourcePort.port, palette.portFill),
      fallbackPortColor
    );

    const drawPlugAt = (layout: NodeLayout, portLayout: PortLayout) => {
      const offset = nextPortOffset(layout, portLayout);
      const screenPos = worldToScreen({ x: portLayout.x, y: portLayout.y });
      screenPos.y += offset;
      const direction = portLayout.isOutput ? { x: 1, y: 0 } : { x: -1, y: 0 };
      const isHovered =
        hoveredTarget.type === "port" &&
        hoveredTarget.nodeId === layout.nodeId &&
        hoveredTarget.portKey === portLayout.port.key &&
        hoveredTarget.isOutput === portLayout.isOutput;
      drawPortPlug(
        ui,
        dpr,
        screenPos,
        direction,
        portRadius,
        sourceColor,
        { hovered: isHovered, active: false, connected: true },
        time
      );
    };

    drawPlugAt(endpoints.sourceLayout, endpoints.sourcePort);
    drawPlugAt(endpoints.targetLayout, endpoints.targetPort);
  });

  if (dragState.type === "edge") {
    const sourceLayout = layouts.get(dragState.sourceNodeId);
    const sourcePort = resolvePortLayout(sourceLayout, dragState.sourcePort, true);
    if (sourceLayout && sourcePort) {
      const sourceColor = parseCssColor(
        resolvePortColor(sourcePort.port, palette.portFill),
        fallbackPortColor
      );
      const sourcePos = worldToScreen({ x: sourcePort.x, y: sourcePort.y });
      drawPortPlug(
        ui,
        dpr,
        sourcePos,
        { x: 1, y: 0 },
        portRadius,
        sourceColor,
        { hovered: true, active: true, connected: true },
        time
      );

      const targetPos = worldToScreen(dragState.currentPos);
      const dx = targetPos.x - sourcePos.x;
      const dy = targetPos.y - sourcePos.y;
      const len = Math.hypot(dx, dy) || 1;
      const direction = { x: dx / len, y: dy / len };
      drawPortPlug(
        ui,
        dpr,
        targetPos,
        direction,
        portRadius,
        sourceColor,
        { hovered: true, active: true, connected: false },
        time
      );
    }
  }

  ui.flush();
};

function drawGroupNodes(
  ctx: CanvasRenderingContext2D,
  nodes: any[],
  layouts: Map<string, NodeLayout>,
  hoveredTarget: HitTarget,
  palette: CanvasPalette,
  geometry: any[]
) {
  nodes.forEach((node) => {
    if (node.type !== "group") return;
    const layout = layouts.get(node.id) ?? computeNodeLayout(node, geometry);
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
    ctx.fillStyle = palette.nodeShadow;
    ctx.beginPath();
    ctx.roundRect(x, y + NODE_SHADOW_OFFSET, width, height, GROUP_BORDER_RADIUS);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = isHovered || isSelected ? "#00d4ff" : "#000000";
    ctx.lineWidth = isSelected ? 3 : 2;
    if (isSelected) {
      ctx.setLineDash([8, 4]);
    }
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, GROUP_BORDER_RADIUS);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.fillStyle = palette.text;
    ctx.font = '600 11px "Montreal Neue", "Space Grotesk", sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const titleText = truncateToWidth(ctx, title, width - 80);
    ctx.fillText(titleText, x + 10, y + 5);

    if (memberCount > 0) {
      const badgeLabel = `${memberCount} node${memberCount === 1 ? "" : "s"}`;
      ctx.font = '600 9px "Montreal Neue", "Space Grotesk", sans-serif';
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
  sliderHover: { nodeId: string; part: "track" } | null,
  focusedSliderId: string | null,
  dragState: DragState,
  renderPortBodies: boolean,
  ghostNodeIds?: Set<string>,
  ghostAlpha = 0.45
) {
  const defaultIconTint = parseCssColor(palette.text, [0.12, 0.12, 0.13, 1]);

  nodes.forEach((node) => {
    const isGhost = ghostNodeIds?.has(node.id) ?? false;
    const isHidden = node.hidden ?? false;
    if (isGhost) {
      ctx.save();
      ctx.globalAlpha *= ghostAlpha;
    } else if (isHidden) {
      ctx.save();
      ctx.globalAlpha *= 0.3;
    }
    const layout = layouts.get(node.id) ?? computeNodeLayout(node, geometry);
    if (!layouts.has(node.id)) {
      layouts.set(node.id, layout);
    }

    const x = layout.x;
    const y = layout.y;
    const height = layout.height;

    const isHovered =
      !isGhost && hoveredTarget.type === "node" && hoveredTarget.nodeId === node.id;
    const isInvalid = isGhost ? false : isWorkflowNodeInvalid(node.type, node.data, geometry);
    const missingRequiredInputs = isGhost
      ? []
      : getMissingRequiredInputs(layout, connectedInputsByNode.get(node.id));
    const showWarning = !isGhost && missingRequiredInputs.length > 0 && !isInvalid;
    const definition = layout.definition ?? getNodeDefinition(node.type);
    const category = definition ? NODE_CATEGORY_BY_ID.get(definition.category) : undefined;
    const baseCategoryBand = category?.band ?? "#ece8e2";
    const categoryAccent = category?.accent ?? palette.nodeStroke;
    const fallbackPortColor = category?.port ?? palette.portFill;
    const isSolverNode = definition?.category === "solver";
    const isGoalNode = definition?.category === "goal";
    const categoryBand = isSolverNode
      ? SOLVER_BAND_TINT
      : isGoalNode
        ? GOAL_BAND_TINT
        : baseCategoryBand;
    const categoryBandAccent = isSolverNode
      ? SOLVER_BAND_ACCENT
      : isGoalNode
        ? GOAL_BAND_ACCENT
        : categoryAccent;
    const categoryLabelColor = isSolverNode
      ? "rgba(255, 255, 255, 0.85)"
      : isGoalNode
        ? "#4b3f73"
        : categoryAccent;
    const nodeTextColor = isSolverNode
      ? SOLVER_NODE_TEXT
      : isGoalNode
        ? GOAL_NODE_TEXT
        : palette.text;
    const nodeMutedTextColor = isSolverNode
      ? SOLVER_NODE_TEXT_MUTED
      : isGoalNode
        ? GOAL_NODE_TEXT_MUTED
        : palette.textMuted;
    const iconTint = parseCssColor(categoryAccent, defaultIconTint);
    const baseLabel = node.data?.label ?? definition?.label ?? node.type ?? "Node";
    const label = node.type === "panel" ? "DATA" : baseLabel;
    const isSlider = node.type === "slider";
    const sliderHoverPart =
      isGhost || !isSlider || !sliderHover || sliderHover.nodeId !== node.id ? null : sliderHover.part;
    const isSliderFocused = !isGhost && isSlider && focusedSliderId === node.id;
    const isSliderActive =
      !isGhost && isSlider && dragState.type === "slider" && dragState.nodeId === node.id;

    if (node.type === "text") {
      const textLines =
        layout.textLines ??
        (typeof layout.parameters.text === "string"
          ? layout.parameters.text.split("\n")
          : ["Text"]);
      const fontSize = Math.min(
        96,
        Math.max(8, readNumber(layout.parameters.size, TEXT_NODE_DEFAULT_SIZE))
      );
      const lineHeight = layout.textLineHeight ?? fontSize * TEXT_NODE_LINE_HEIGHT;
      const font = resolveTextFont(fontSize);
      const textColor = palette.text;
      const width = layout.width;
      const height = layout.height;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();

      ctx.font = font;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = textColor;

      let cursorY = y + TEXT_NODE_PADDING_Y;
      textLines.forEach((line) => {
        ctx.fillText(line, x + TEXT_NODE_PADDING_X, cursorY);
        cursorY += lineHeight;
      });

      ctx.restore();

      ctx.save();
      ctx.strokeStyle = isHovered ? palette.nodeStrokeHover : palette.nodeStroke;
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

      if (isGhost || isHidden) {
        ctx.restore();
      }
      return;
    }

    if (node.type === "group") {
      if (isGhost) {
        ctx.restore();
      }
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
      const rawLines = layout.noteLines ?? ["Edit me!"];
      const isSelected = Boolean(node.selected);
      const fill = isHovered ? "#fff5d8" : "#fff1c6";
      const border = isSelected ? "#f59e0b" : "#bf8f45";

      ctx.save();
      ctx.fillStyle = palette.nodeShadow;
      ctx.beginPath();
      ctx.roundRect(x, y + NODE_SHADOW_OFFSET, layout.width, layout.height, NOTE_BORDER_RADIUS);
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

      const noteBounds = getTextNoteContentBounds(layout);
      const visibleLines = Math.max(1, Math.floor(noteBounds.height / NOTE_LINE_HEIGHT));
      const maxScroll = Math.max(0, rawLines.length - visibleLines);
      const scrollRaw = readNumber(node.data?.textNoteScroll, 0);
      const scroll = Math.min(maxScroll, Math.max(0, Math.round(scrollRaw)));
      const linesToDraw = rawLines.slice(scroll, scroll + visibleLines);

      ctx.save();
      ctx.beginPath();
      ctx.rect(noteBounds.x, noteBounds.y, noteBounds.width, noteBounds.height);
      ctx.clip();
      ctx.fillStyle = hasContent ? "#3b332d" : "#8c7a5f";
      ctx.font = '500 11px "Montreal Neue", "Space Grotesk", sans-serif';
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      linesToDraw.forEach((line, index) => {
        const lineY = noteBounds.y + index * NOTE_LINE_HEIGHT;
        const trimmed = truncateToWidth(ctx, line, noteBounds.width);
        ctx.fillText(trimmed, noteBounds.x, lineY);
      });
      ctx.restore();

      const portFont = '600 9px "Montreal Neue", "Space Grotesk", sans-serif';
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
          const labelX = portLayout.isOutput ? x + noteWidth - 12 : x + 10;
          ctx.fillText(labelText, labelX, portLayout.y);
        }
        ctx.restore();

        if (!renderPortBodies) {
          return;
        }

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
      if (isGhost) {
        ctx.restore();
      }
      return;
    }

    const labelMaxWidth = isSlider ? NODE_WIDTH - 64 : NODE_WIDTH - 20;
    const detailMaxWidth = NODE_WIDTH - 20;
    const nodeRadius = isSlider ? 0 : NODE_BORDER_RADIUS;

    if (!isSlider) {
      // Draw a crisp offset shadow to help the nodes read as buttons.
      ctx.save();
      ctx.fillStyle = palette.nodeShadow;
      ctx.beginPath();
      ctx.roundRect(x, y + NODE_SHADOW_OFFSET, NODE_WIDTH, height, nodeRadius);
      ctx.fill();
      ctx.restore();

      const baseFill = isSolverNode
        ? createNodeGradient(
            ctx,
            x,
            y,
            NODE_WIDTH,
            height,
            isHovered ? SOLVER_NODE_FILL_TOP_HOVER : SOLVER_NODE_FILL_TOP,
            isHovered ? SOLVER_NODE_FILL_BOTTOM_HOVER : SOLVER_NODE_FILL_BOTTOM
          )
        : isGoalNode
          ? createNodeGradient(
              ctx,
              x,
              y,
              NODE_WIDTH,
              height,
              isHovered ? GOAL_NODE_FILL_TOP_HOVER : GOAL_NODE_FILL_TOP,
              isHovered ? GOAL_NODE_FILL_BOTTOM_HOVER : GOAL_NODE_FILL_BOTTOM
            )
          : isHovered
            ? palette.nodeFillHover
            : palette.nodeFill;
      ctx.fillStyle = isInvalid
        ? palette.nodeErrorFill
        : showWarning
          ? palette.nodeWarningFill
          : baseFill;
      ctx.strokeStyle = isInvalid
        ? palette.nodeErrorBorder
        : showWarning
          ? palette.nodeWarningBorder
          : isSolverNode
            ? SOLVER_NODE_BORDER
            : isGoalNode
              ? GOAL_NODE_BORDER
              : isHovered
                ? palette.nodeStrokeHover
                : palette.nodeStroke;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(x, y, NODE_WIDTH, height, nodeRadius);
      ctx.fill();
      ctx.stroke();
    }

    if (!isSlider) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, NODE_WIDTH, height, nodeRadius);
      ctx.clip();
      ctx.fillStyle = categoryBand;
      ctx.fillRect(x, y, NODE_WIDTH, NODE_BAND_HEIGHT);
      ctx.fillStyle = categoryBandAccent;
      ctx.fillRect(x, y + NODE_BAND_HEIGHT - 1.5, NODE_WIDTH, 1.5);
      ctx.restore();

      if (category) {
        ctx.fillStyle = categoryLabelColor;
        ctx.font = '600 9px "Montreal Neue", "Space Grotesk", sans-serif';
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(category.label.toUpperCase(), x + 9, y + 3);
      }
    }

    const iconImage = !isSlider ? getIconImage(definition?.iconId, iconTint) : null;
    if (!isSlider && definition?.iconId && iconImage && iconImage.complete && iconImage.naturalWidth > 0) {
      const iconIsSoft =
        node.type === "panel" ||
        node.type === "geometryViewer" ||
        node.type === "customPreview" ||
        node.type === "customViewer";
      const iconScale = iconIsSoft ? 0.78 : 1;
      const iconLimit = Math.min(
        ICON_SIZE,
        NODE_WIDTH - ICON_PADDING * 2,
        height - NODE_BAND_HEIGHT - ICON_PADDING * 2
      );
      const iconSize = Math.max(0, iconLimit * iconScale);
      const iconX = x + (NODE_WIDTH - iconSize) / 2;
      const iconY = y + height * 0.5 - iconSize * 0.5;
      ctx.save();
      ctx.globalAlpha = iconIsSoft ? 0.16 : 0.98;
      ctx.drawImage(iconImage, iconX, iconY, iconSize, iconSize);
      ctx.restore();
    }

    if (!isSlider) {
      ctx.fillStyle = nodeTextColor;
      const labelFont =
        definition?.category === "solver" || definition?.category === "goal"
          ? '600 13px "Noto Serif", "GFS Didot", serif'
          : '600 13px "Montreal Neue", "Space Grotesk", sans-serif';
      ctx.font = labelFont;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const labelText = truncateToWidth(ctx, label, labelMaxWidth);
      ctx.fillText(labelText, x + 10, y + NODE_BAND_HEIGHT + 6);
    }

    const detailBlockHeight =
      node.type === "topologyOptimize" ? DETAIL_LINE_HEIGHT * 2 : DETAIL_LINE_HEIGHT;
    const detailY = isSlider
      ? y + 34
      : y + height - DETAIL_BOTTOM_PADDING - detailBlockHeight;
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
      const barHeight = sliderBounds.height;
      const barY = sliderBounds.y;
      const fillWidth = Math.min(
        sliderBounds.width,
        Math.max(barHeight, sliderBounds.width * normalized)
      );

      ctx.save();
      ctx.fillStyle = SLIDER_TRACK_COLOR;
      ctx.beginPath();
      ctx.roundRect(sliderBounds.x, barY, sliderBounds.width, barHeight, barHeight / 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = SLIDER_FILL_COLOR;
      ctx.beginPath();
      ctx.roundRect(sliderBounds.x, barY, fillWidth, barHeight, barHeight / 2);
      ctx.fill();
      ctx.restore();

      const range = sliderConfig.max - sliderConfig.min;
      if (range > 1e-6) {
        const maxTicks = 24;
        const tickPositions: number[] = [];
        if (sliderConfig.snapMode === "step" && sliderConfig.step > 0) {
          const stepCount = Math.max(1, Math.round(range / sliderConfig.step));
          const desiredTicks = Math.min(maxTicks, stepCount + 1);
          const interval = Math.max(1, Math.ceil(stepCount / Math.max(1, desiredTicks - 1)));
          for (let i = 0; i <= stepCount; i += interval) {
            const t = i / stepCount;
            tickPositions.push(sliderBounds.x + sliderBounds.width * t);
          }
          const endX = sliderBounds.x + sliderBounds.width;
          if (tickPositions.length === 0 || Math.abs(tickPositions[tickPositions.length - 1] - endX) > 0.5) {
            tickPositions.push(endX);
          }
        } else {
          const tickCount = 7;
          for (let i = 0; i < tickCount; i += 1) {
            const t = i / (tickCount - 1);
            tickPositions.push(sliderBounds.x + sliderBounds.width * t);
          }
        }

        const tickInset = 1;
        const tickHeight = Math.max(3, barHeight - tickInset * 2);
        const tickTop = trackY - tickHeight / 2;
        const tickWidth = 2;

        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        tickPositions.forEach((position) => {
          const tickX = Math.round(position) - tickWidth / 2;
          ctx.fillRect(tickX, tickTop, tickWidth, tickHeight);
        });
        ctx.restore();
      }

      if (isSliderFocused) {
        ctx.save();
        ctx.strokeStyle = SLIDER_FILL_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sliderBounds.x, barY + barHeight + 4);
        ctx.lineTo(sliderBounds.x + sliderBounds.width, barY + barHeight + 4);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = SLIDER_THUMB_COLOR;
      ctx.strokeStyle = SLIDER_THUMB_STROKE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fillX, trackY, thumbRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      const valueText = formatSliderValue(value, sliderConfig.step, sliderConfig.snapMode, sliderConfig.precisionOverride);
      ctx.save();
      ctx.fillStyle = SLIDER_VALUE_COLOR;
      ctx.font = '700 12px "Montreal Neue", "Space Grotesk", sans-serif';
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(valueText, sliderBounds.valueX + sliderBounds.valueWidth - 4, trackY);
      ctx.restore();

      if (evaluationError && isHovered) {
        ctx.fillStyle = palette.nodeErrorBorder;
        ctx.font = '600 10px "Montreal Neue", "Space Grotesk", sans-serif';
        ctx.textAlign = "left";
        const errorText = truncateToWidth(ctx, `Error: ${evaluationError}`, detailMaxWidth);
        ctx.fillText(errorText, x + 10, detailY);
      }
    } else if (evaluationError && isHovered) {
      ctx.fillStyle = palette.nodeErrorBorder;
      ctx.font = '600 10px "Montreal Neue", "Space Grotesk", sans-serif';
      const errorText = truncateToWidth(ctx, `Error: ${evaluationError}`, detailMaxWidth);
      ctx.fillText(errorText, x + 10, detailY);
    } else if (showWarning && isHovered) {
      ctx.fillStyle = palette.nodeWarningBorder;
      ctx.font = '600 10px "Montreal Neue", "Space Grotesk", sans-serif';
      const warningText = truncateToWidth(
        ctx,
        `Needs: ${missingRequiredInputs.join(", ")}`,
        detailMaxWidth
      );
      ctx.fillText(warningText, x + 10, detailY);
    } else if (node.type === "topologyOptimize") {
      ctx.fillStyle = nodeMutedTextColor;
      ctx.font = '500 11px "Montreal Neue", "Space Grotesk", sans-serif';
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
      ctx.fillText(settingsText, x + 10, detailY);
      ctx.font = '500 10px "Montreal Neue", "Space Grotesk", sans-serif';
      const progressText = truncateToWidth(
        ctx,
        `Iter ${progress.iteration}/${settings.maxIterations} · ${String(progress.status)}`,
        detailMaxWidth
      );
      ctx.fillText(progressText, x + 10, detailY + DETAIL_LINE_HEIGHT + 2);
    } else {
      const resolveGeom = (id: string) => geometry?.find((item: { id: string }) => item.id === id);
      const geomSummary = primaryOutputValue != null
        ? formatGeometrySummary(primaryOutputValue, 0, resolveGeom)
        : null;
      const detailText =
        geomSummary != null
          ? geomSummary
          : primaryOutputValue != null
            ? `= ${formatInlineValue(primaryOutputValue)}`
            : definition?.description ??
              (node.type ? `Type: ${node.type}` : `ID: ${node.id.slice(0, 8)}`);
      ctx.fillStyle = nodeMutedTextColor;
      ctx.font = '500 11px "Montreal Neue", "Space Grotesk", sans-serif';
      const detailLabel = truncateToWidth(ctx, detailText, detailMaxWidth);
      ctx.fillText(detailLabel, x + 10, detailY);
    }

    const portFont = '600 9px "Montreal Neue", "Space Grotesk", sans-serif';
    const portLabelMaxWidth = NODE_WIDTH - 40;

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
        const labelX = portLayout.isOutput ? x + NODE_WIDTH - 12 : x + 10;
        ctx.fillText(labelText, labelX, portLayout.y);
      }
      ctx.restore();

      if (!renderPortBodies) {
        return;
      }

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
    if (isGhost || isHidden) {
      ctx.restore();
    }
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
    const titleFont = `600 ${titleSize}px "Montreal Neue", "Space Grotesk", sans-serif`;
    const bodyFont = `500 ${bodySize}px "Montreal Neue", "Space Grotesk", sans-serif`;
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
  ctx.font = '600 11px "Montreal Neue", "Space Grotesk", sans-serif';
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
  const titleFont = '600 12px "Montreal Neue", "Space Grotesk", sans-serif';
  const lineFont = '500 11px "Montreal Neue", "Space Grotesk", sans-serif';

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
