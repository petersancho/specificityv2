import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { WebGLUIRenderer, type RGBA } from "../webgl/ui/WebGLUIRenderer";
import { WebGLTextRenderer } from "../webgl/ui/WebGLTextRenderer";
import { WebGLIconRenderer, type IconId } from "../webgl/ui/WebGLIconRenderer";
import { safeLocalStorageGet, safeLocalStorageSet } from "../utils/safeStorage";

export type { IconId };

export type WebGLTopBarAction = {
  id: string;
  label: string;
  tooltip: string;
  tooltipContent?: ReactNode;
  onClick: () => void;
  shortLabel?: string;
  icon?: IconId;
  iconTint?: string;
  groupLabel?: string;
  category?: TopBarCategory;
  isActive?: boolean;
  isDisabled?: boolean;
  groupBreakBefore?: boolean;
};

type Rect = { x: number; y: number; width: number; height: number };

type LayoutButton = { id: string; rect: Rect; action: WebGLTopBarAction };

type LayoutState = {
  buttons: LayoutButton[];
  separators: Rect[];
  groups: Array<{ label: string; rect: Rect }>;
  labelOffset: number;
  height: number;
  totalWidth: number;
  visibleWidth: number;
};

type WebGLPanelTopBarProps = {
  actions: WebGLTopBarAction[];
  label?: string;
  className?: string;
  logoTone?: "roslyn" | "numerica" | "neutral";
  panelScale?: number;
  onPanelScaleChange?: (nextScale: number) => void;
  allowWheelScale?: boolean;
};

type LogoLayout = {
  rect: Rect;
  textX: number;
  textY: number;
  baseText: string;
  accentText: string;
  baseSize: { width: number; height: number };
  accentSize: { width: number; height: number };
  accentX: number;
  isWebgl: boolean;
};

const rgb = (r: number, g: number, b: number, a = 1): RGBA => [
  r / 255,
  g / 255,
  b / 255,
  a,
];

const PALETTE = {
  button: rgb(233, 230, 226, 1),
  buttonHover: rgb(238, 235, 231, 1),
  buttonActive: rgb(224, 220, 214, 1),
  border: rgb(201, 197, 192, 1),
  shadow: rgb(28, 34, 46, 1),
  shadowDeep: rgb(22, 28, 40, 0.85),
  glow: rgb(0, 0, 0, 0),
  highlight: rgb(255, 255, 255, 0),
  icon: rgb(38, 44, 58, 0.95),
  iconActive: rgb(38, 44, 58, 1),
  iconDisabled: rgb(120, 120, 120, 0.45),
  logoFill: rgb(248, 246, 243, 1),
  logoFillSoft: rgb(240, 237, 233, 1),
  logoStroke: rgb(192, 188, 183, 1),
  logoText: rgb(24, 24, 28, 0.96),
  logoAccent: rgb(11, 138, 151, 1),
  logoAccentDeep: rgb(81, 50, 194, 1),
  logoGlow: rgb(255, 255, 255, 0.24),
  tooltipBg: rgb(20, 24, 34, 0.96),
  tooltipBorder: rgb(24, 30, 42, 0.9),
};

type TopBarCategory =
  | "primitive"
  | "curve"
  | "nurbs"
  | "mesh"
  | "transform"
  | "edit"
  | "selection"
  | "orientation"
  | "gumball"
  | "pivot"
  | "cplane"
  | "workflow"
  | "group"
  | "camera"
  | "view"
  | "math"
  | "neutral";

const CATEGORY_TINTS: Record<TopBarCategory, RGBA> = {
  primitive: rgb(179, 83, 28, 1),
  curve: rgb(15, 90, 79, 1),
  nurbs: rgb(13, 91, 85, 1),
  mesh: rgb(67, 32, 111, 1),
  transform: rgb(139, 58, 43, 1),
  edit: rgb(154, 29, 96, 1),
  selection: rgb(138, 90, 0, 1),
  orientation: rgb(31, 106, 51, 1),
  gumball: rgb(11, 94, 112, 1),
  pivot: rgb(106, 47, 166, 1),
  cplane: rgb(14, 95, 98, 1),
  workflow: rgb(15, 90, 48, 1),
  group: rgb(34, 50, 72, 1),
  camera: rgb(31, 75, 155, 1),
  view: rgb(60, 47, 136, 1),
  math: rgb(125, 86, 0, 1),
  neutral: rgb(45, 52, 68, 1),
};

const LOGO_FONT_FAMILY =
  '"Helvetica Neue", "Montreal Neue", "Space Grotesk", Helvetica, Arial, sans-serif';
const LOGO_BASE_WEIGHT = 700;
const LOGO_ACCENT_WEIGHT = 800;

const LOGO_ACCENTS: Record<
  "roslyn" | "numerica" | "neutral",
  { primary: RGBA; deep: RGBA }
> = {
  roslyn: { primary: rgb(11, 138, 151, 1), deep: rgb(194, 22, 107, 1) },
  numerica: { primary: rgb(81, 50, 194, 1), deep: rgb(11, 138, 151, 1) },
  neutral: { primary: PALETTE.logoAccent, deep: PALETTE.logoAccentDeep },
};

const resolveLogoAccent = (tone?: "roslyn" | "numerica" | "neutral") =>
  LOGO_ACCENTS[tone ?? "neutral"] ?? LOGO_ACCENTS.neutral;

const BUTTON_SIZE = 40;
const BUTTON_GAP = 6;
const PADDING_X = 10;
const PADDING_Y = 8;
const LABEL_HEIGHT = 10;
const LABEL_GAP = 4;
const SHADOW_OFFSET = 3;
const BUTTON_RADIUS = 4;
const BUTTON_STROKE = 1.5;
const ICON_INSET = 6;
const SEPARATOR_GAP = 10;
const SEPARATOR_WIDTH = 2;
const PANEL_SCALE_KEY = "lingua.webglPanelScale";
const MIN_PANEL_SCALE = 0.4;
const MAX_PANEL_SCALE = 1.05;
const PANEL_SCALE_SPEED = 0.0015;
const PANEL_SUPERSAMPLE = 1.6;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const mix = (a: RGBA, b: RGBA, t: number): RGBA => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
  a[3] + (b[3] - a[3]) * t,
];

const lighten = (color: RGBA, amount: number) => mix(color, rgb(255, 255, 255, 1), amount);
const darken = (color: RGBA, amount: number) => mix(color, rgb(0, 0, 0, 1), amount);
const withAlpha = (color: RGBA, alpha: number): RGBA => [
  color[0],
  color[1],
  color[2],
  alpha,
];

let parseCanvas: HTMLCanvasElement | null = null;
let parseCtx: CanvasRenderingContext2D | null = null;

const ensureParseContext = () => {
  if (parseCtx) return parseCtx;
  if (typeof document === "undefined") return null;
  parseCanvas = document.createElement("canvas");
  parseCanvas.width = 2;
  parseCanvas.height = 2;
  parseCtx = parseCanvas.getContext("2d");
  return parseCtx;
};

const parseCssColor = (value: string | undefined, fallback: RGBA): RGBA => {
  if (!value) return fallback;
  const ctx = ensureParseContext();
  if (!ctx) return fallback;
  ctx.clearRect(0, 0, 2, 2);
  ctx.fillStyle = "#000";
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  return [data[0] / 255, data[1] / 255, data[2] / 255, data[3] / 255];
};

const ACTION_ICON_MAP: Record<string, IconId> = {
  point: "point",
  line: "line",
  polyline: "polyline",
  rectangle: "rectangle",
  circle: "circle",
  primitive: "primitive",
  curve: "arc",
  box: "box",
  sphere: "sphere",
  move: "move",
  rotate: "rotate",
  scale: "scale",
  undo: "undo",
  redo: "redo",
  delete: "delete",
  focus: "focus",
  frameall: "frameAll",
  copy: "copy",
  paste: "paste",
  duplicate: "duplicate",
  gumball: "gumball",
  interpolate: "interpolate",
  "geometry-reference": "geometryReference",
  "point-generator": "pointGenerator",
  "line-builder": "lineBuilder",
  "circle-generator": "circleGenerator",
  "box-builder": "boxBuilder",
  "transform-node": "transform",
  surface: "surface",
  loft: "loft",
  extrude: "extrude",
  meshconvert: "surface",
  nurbsrestore: "interpolate",
  nurbsbox: "box",
  nurbssphere: "sphere",
  nurbscylinder: "primitive",
  "extrude-node": "extrude",
  "selection-filter": "selectionFilter",
  "display-mode": "displayMode",
  "reference-active": "referenceActive",
  "reference-all": "referenceAll",
  group: "group",
  ungroup: "ungroup",
  "advanced-toggle": "advanced",
  "transform-orientation": "transformOrientation",
  "pivot-mode": "pivotMode",
  "cplane-xy": "cplaneXY",
  "cplane-xz": "cplaneXZ",
  "cplane-yz": "cplaneYZ",
  "cplane-align": "cplaneAlign",
  capture: "capture",
};

const ACTION_CATEGORY_MAP: Record<string, TopBarCategory> = {
  point: "primitive",
  primitive: "primitive",
  box: "primitive",
  sphere: "primitive",
  line: "curve",
  polyline: "curve",
  rectangle: "curve",
  arc: "nurbs",
  circle: "nurbs",
  curve: "nurbs",
  interpolate: "nurbs",
  nurbsbox: "nurbs",
  nurbssphere: "nurbs",
  nurbscylinder: "nurbs",
  surface: "mesh",
  loft: "mesh",
  extrude: "mesh",
  meshconvert: "mesh",
  nurbsrestore: "mesh",
  move: "transform",
  rotate: "transform",
  scale: "transform",
  gumball: "transform",
  mirror: "transform",
  array: "transform",
  transform: "transform",
  offset: "transform",
  undo: "edit",
  redo: "edit",
  copy: "edit",
  paste: "edit",
  duplicate: "edit",
  delete: "edit",
  focus: "view",
  frameall: "view",
  capture: "view",
  "selection-filter": "selection",
  "display-mode": "view",
  "transform-orientation": "orientation",
  "pivot-mode": "pivot",
  "reference-active": "workflow",
  "reference-all": "workflow",
  group: "group",
  ungroup: "group",
  "cplane-xy": "cplane",
  "cplane-xz": "cplane",
  "cplane-yz": "cplane",
  "cplane-align": "cplane",
};

const SHORT_LABEL_OVERRIDES: Record<string, string> = {
  point: "PT",
  primitive: "PRM",
  line: "LN",
  polyline: "PLY",
  rectangle: "REC",
  circle: "CIR",
  arc: "ARC",
  curve: "CRV",
  interpolate: "INT",
  nurbsbox: "NBX",
  nurbssphere: "NSP",
  nurbscylinder: "NCY",
  surface: "SRF",
  loft: "LFT",
  extrude: "EXT",
  move: "MOV",
  rotate: "ROT",
  scale: "SCL",
  gumball: "GMB",
  undo: "UND",
  redo: "RED",
  copy: "CPY",
  paste: "PST",
  duplicate: "DUP",
  delete: "DEL",
  focus: "FCS",
  frameall: "FRM",
  "selection-object": "OBJ",
  "selection-vertex": "VTX",
  "selection-edge": "EDG",
  "selection-face": "FCE",
  "orient-world": "WRD",
  "orient-local": "LOC",
  "orient-view": "VIE",
  "orient-cplane": "CPL",
  "gumball-align-boundingBox": "BOX",
  "gumball-align-cplane": "CPL",
  "pivot-selection": "SEL",
  "pivot-world": "WRD",
  "pivot-picked": "PCK",
  "pivot-cursor": "CUR",
  "pivot-origin": "ORG",
  "cplane-xy": "XY",
  "cplane-xz": "XZ",
  "cplane-yz": "YZ",
  "cplane-align": "ALN",
  "reference-active": "RFA",
  "reference-all": "RFL",
  group: "GRP",
  ungroup: "UNG",
  "camera-zoom-cursor": "ZOM",
  "camera-invert-zoom": "INV",
  "camera-upright": "UPR",
  capture: "CAP",
};

export const resolveTopBarShortLabel = (action: WebGLTopBarAction) => {
  if (action.shortLabel) return action.shortLabel.toUpperCase();
  const override = SHORT_LABEL_OVERRIDES[action.id];
  if (override) return override;
  const normalized = action.label.replace(/[^a-z0-9]+/gi, " ").trim();
  if (!normalized) return action.label.slice(0, 3).toUpperCase();
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  let initials = words.map((word) => word[0]).join("");
  if (initials.length >= 3) return initials.slice(0, 3).toUpperCase();
  const extra = words[0].slice(1, 1 + (3 - initials.length));
  initials += extra;
  return initials.toUpperCase();
};

const resolveIconId = (action: WebGLTopBarAction): IconId =>
  action.icon ?? ACTION_ICON_MAP[action.id] ?? "primitive";

const resolveActionCategory = (action: WebGLTopBarAction): TopBarCategory => {
  if (action.category) return action.category;
  const mapped = ACTION_CATEGORY_MAP[action.id];
  if (mapped) return mapped;
  if (action.id.startsWith("selection-")) return "selection";
  if (action.id.startsWith("orient-")) return "orientation";
  if (action.id.startsWith("gumball-align")) return "gumball";
  if (action.id.startsWith("pivot-")) return "pivot";
  if (action.id.startsWith("cplane-")) return "cplane";
  if (action.id.startsWith("camera-")) return "camera";
  if (action.id.startsWith("reference-")) return "workflow";
  return "neutral";
};

const resolveActionTint = (action: WebGLTopBarAction): RGBA => {
  const category = resolveActionCategory(action);
  const categoryTint = CATEGORY_TINTS[category] ?? PALETTE.icon;
  if (category !== "neutral") return categoryTint;
  return parseCssColor(action.iconTint, categoryTint);
};

const resolveGroupLabelColor = (label: string): RGBA => {
  const normalized = label.trim().toLowerCase();
  if (normalized.includes("primitive")) return withAlpha(CATEGORY_TINTS.primitive, 0.82);
  if (normalized.includes("curve")) return withAlpha(CATEGORY_TINTS.curve, 0.82);
  if (normalized.includes("nurbs")) return withAlpha(CATEGORY_TINTS.nurbs, 0.82);
  if (normalized.includes("mesh")) return withAlpha(CATEGORY_TINTS.mesh, 0.82);
  if (normalized.includes("math")) return withAlpha(CATEGORY_TINTS.math, 0.82);
  if (normalized.includes("transform")) return withAlpha(CATEGORY_TINTS.transform, 0.82);
  if (normalized.includes("edit")) return withAlpha(CATEGORY_TINTS.edit, 0.82);
  if (normalized.includes("selection")) return withAlpha(CATEGORY_TINTS.selection, 0.82);
  if (normalized.includes("orientation")) return withAlpha(CATEGORY_TINTS.orientation, 0.82);
  if (normalized.includes("gumball")) return withAlpha(CATEGORY_TINTS.gumball, 0.82);
  if (normalized.includes("pivot")) return withAlpha(CATEGORY_TINTS.pivot, 0.82);
  if (normalized.includes("c-plane") || normalized.includes("cplane")) {
    return withAlpha(CATEGORY_TINTS.cplane, 0.82);
  }
  if (normalized.includes("workflow")) return withAlpha(CATEGORY_TINTS.workflow, 0.82);
  if (normalized.includes("group")) return withAlpha(CATEGORY_TINTS.group, 0.82);
  if (normalized.includes("camera")) return withAlpha(CATEGORY_TINTS.camera, 0.82);
  if (normalized.includes("view")) return withAlpha(CATEGORY_TINTS.view, 0.82);
  return withAlpha(PALETTE.icon, 0.72);
};

const WebGLPanelTopBar = ({
  actions,
  label,
  className,
  logoTone,
  panelScale,
  onPanelScaleChange,
  allowWheelScale = true,
}: WebGLPanelTopBarProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const uiRef = useRef<WebGLUIRenderer | null>(null);
  const textRef = useRef<WebGLTextRenderer | null>(null);
  const iconRef = useRef<WebGLIconRenderer | null>(null);
  const dprRef = useRef(1);
  const hoveredIdRef = useRef<string | null>(null);
  const focusRectRef = useRef<Rect | null>(null);
  const keyboardModeRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const layoutRef = useRef<LayoutState>({
    buttons: [],
    separators: [],
    groups: [],
    labelOffset: 0,
    height: 0,
    totalWidth: 0,
    visibleWidth: 0,
  });
  const [internalScale, setInternalScale] = useState(() => {
    if (typeof window === "undefined") return 0.85;
    const stored = safeLocalStorageGet(PANEL_SCALE_KEY);
    const parsed = stored ? Number(stored) : 0.85;
    if (!Number.isFinite(parsed)) return 0.85;
    return clamp(parsed, MIN_PANEL_SCALE, MAX_PANEL_SCALE);
  });
  const isControlled = typeof panelScale === "number";
  const effectiveScale = clamp(
    isControlled ? panelScale : internalScale,
    MIN_PANEL_SCALE,
    MAX_PANEL_SCALE
  );
  const metrics = useMemo(() => {
    const logoFontSize = 12 * effectiveScale;
    const logoPadX = 8 * effectiveScale;
    const logoPadY = 3 * effectiveScale;
    const logoHeight = logoFontSize * 1.35 + logoPadY * 2;
    const shortLabelSize = 10 * effectiveScale;
    const shortLabelHeight = Math.max(
      shortLabelSize + 2 * effectiveScale,
      BUTTON_SIZE * effectiveScale * 0.22
    );

    return {
      buttonSize: BUTTON_SIZE * effectiveScale,
      buttonGap: BUTTON_GAP * effectiveScale,
      paddingX: PADDING_X * effectiveScale,
      paddingY: PADDING_Y * effectiveScale,
      labelHeight: Math.max(LABEL_HEIGHT * effectiveScale, logoHeight),
      labelGap: LABEL_GAP * effectiveScale,
      groupLabelHeight: 8 * effectiveScale,
      groupLabelGap: 3 * effectiveScale,
      groupLabelSize: 8 * effectiveScale,
      shadowOffset: SHADOW_OFFSET * effectiveScale,
      buttonRadius: BUTTON_RADIUS * effectiveScale,
      buttonStroke: Math.max(1, BUTTON_STROKE * effectiveScale),
      iconInset: ICON_INSET * effectiveScale,
      separatorGap: SEPARATOR_GAP * effectiveScale,
      separatorWidth: Math.max(1, SEPARATOR_WIDTH * effectiveScale),
      shortLabelSize,
      shortLabelHeight,
      shortLabelInsetX: Math.max(2, 3 * effectiveScale),
      iconLabelGap: Math.max(1, 1.5 * effectiveScale),
      iconShadowOffset: Math.max(1, 1.2 * effectiveScale),
      labelSize: 10 * effectiveScale,
      logoFontSize,
      logoPadX,
      logoPadY,
      logoAccentGap: 4 * effectiveScale,
      logoRadius: 4 * effectiveScale,
      logoStroke: Math.max(1, effectiveScale),
      logoShadowOffset: 1.1 * effectiveScale,
      logoUnderlineHeight: Math.max(1, 1.6 * effectiveScale),
      logoUnderlineInset: 3 * effectiveScale,
      logoTracking: -0.35 * effectiveScale,
      logoAccentTracking: -0.2 * effectiveScale,
      tooltipFontSize: 12 * effectiveScale,
      tooltipPaddingX: 10 * effectiveScale,
      tooltipPaddingY: 6 * effectiveScale,
    };
  }, [effectiveScale]);
  const [barHeight, setBarHeight] = useState(70);
  const [scrollX, setScrollX] = useState(0);
  const scrollRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isControlled) return;
    safeLocalStorageSet(PANEL_SCALE_KEY, internalScale.toFixed(3));
  }, [internalScale, isControlled]);

  const drawRect = (rect: Rect, color: RGBA) => {
    const ui = uiRef.current;
    if (!ui) return;
    const dpr = dprRef.current;
    ui.drawRect(rect.x * dpr, rect.y * dpr, rect.width * dpr, rect.height * dpr, color);
  };

  const drawRoundedRect = (rect: Rect, radius: number, color: RGBA) => {
    const ui = uiRef.current;
    if (!ui) return;
    const dpr = dprRef.current;
    ui.drawRoundedRect(
      rect.x * dpr,
      rect.y * dpr,
      rect.width * dpr,
      rect.height * dpr,
      radius * dpr,
      color
    );
  };

  const drawLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    color: RGBA
  ) => {
    const ui = uiRef.current;
    if (!ui) return;
    const dpr = dprRef.current;
    ui.drawLine(x1 * dpr, y1 * dpr, x2 * dpr, y2 * dpr, thickness * dpr, color);
  };

  const drawCircle = (
    cx: number,
    cy: number,
    radius: number,
    thickness: number,
    color: RGBA
  ) => {
    const ui = uiRef.current;
    if (!ui) return;
    const dpr = dprRef.current;
    ui.drawCircle(cx * dpr, cy * dpr, radius * dpr, thickness * dpr, color);
  };

  const drawArc = (
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    thickness: number,
    color: RGBA
  ) => {
    const segments = 18;
    for (let i = 0; i < segments; i += 1) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const a0 = startAngle + (endAngle - startAngle) * t0;
      const a1 = startAngle + (endAngle - startAngle) * t1;
      const x0 = cx + Math.cos(a0) * radius;
      const y0 = cy + Math.sin(a0) * radius;
      const x1 = cx + Math.cos(a1) * radius;
      const y1 = cy + Math.sin(a1) * radius;
      drawLine(x0, y0, x1, y1, thickness, color);
    }
  };

  const drawRectStroke = (rect: Rect, thickness: number, color: RGBA) => {
    const ui = uiRef.current;
    if (!ui) return;
    const dpr = dprRef.current;
    ui.drawRectStroke(
      rect.x * dpr,
      rect.y * dpr,
      rect.width * dpr,
      rect.height * dpr,
      thickness * dpr,
      color
    );
  };

  const drawShadowRect = (rect: Rect, offset: number, color: RGBA) => {
    drawRect(
      {
        x: rect.x + offset,
        y: rect.y + offset,
        width: rect.width,
        height: rect.height,
      },
      color
    );
  };

  const drawShadowRoundedRect = (rect: Rect, radius: number, offset: number, color: RGBA) => {
    drawRoundedRect(
      {
        x: rect.x + offset,
        y: rect.y + offset,
        width: rect.width,
        height: rect.height,
      },
      radius,
      color
    );
  };

  const drawText = (text: string, x: number, y: number, size: number, color: RGBA) => {
    const textRenderer = textRef.current;
    const canvas = canvasRef.current;
    if (!textRenderer || !canvas) return;
    const dpr = dprRef.current;
    textRenderer.setText(text, {
      fontSize: size * dpr,
      paddingX: 2 * dpr,
      paddingY: 2 * dpr,
      color: "#ffffff",
    });
    textRenderer.draw(
      x * dpr,
      y * dpr,
      { width: canvas.width, height: canvas.height },
      color
    );
  };

  const drawIcon = (icon: IconId, cx: number, cy: number, size: number, color: RGBA) => {
    switch (icon) {
      case "point":
      case "pointGenerator":
        drawCircle(cx, cy, size * 0.18, 2, color);
        drawLine(cx - size * 0.32, cy, cx + size * 0.32, cy, 2, color);
        drawLine(cx, cy - size * 0.32, cx, cy + size * 0.32, 2, color);
        break;
      case "line":
      case "lineBuilder":
        drawLine(cx - size * 0.4, cy + size * 0.2, cx + size * 0.4, cy - size * 0.2, 2, color);
        drawCircle(cx - size * 0.4, cy + size * 0.2, size * 0.08, 2, color);
        drawCircle(cx + size * 0.4, cy - size * 0.2, size * 0.08, 2, color);
        break;
      case "arc": {
        const arcCx = cx + size * 0.02;
        const arcCy = cy + size * 0.08;
        const radius = size * 0.34;
        const startAngle = Math.PI * 1.05;
        const endAngle = Math.PI * 1.95;
        drawArc(arcCx, arcCy, radius, startAngle, endAngle, 2, color);
        const startX = arcCx + Math.cos(startAngle) * radius;
        const startY = arcCy + Math.sin(startAngle) * radius;
        const endX = arcCx + Math.cos(endAngle) * radius;
        const endY = arcCy + Math.sin(endAngle) * radius;
        const midAngle = (startAngle + endAngle) * 0.5;
        const midX = arcCx + Math.cos(midAngle) * radius;
        const midY = arcCy + Math.sin(midAngle) * radius;
        drawCircle(startX, startY, size * 0.075, 2, color);
        drawCircle(endX, endY, size * 0.075, 2, color);
        drawCircle(midX, midY, size * 0.065, 2, color);
        break;
      }
      case "polyline":
        drawLine(cx - size * 0.4, cy + size * 0.2, cx - size * 0.05, cy - size * 0.2, 2, color);
        drawLine(cx - size * 0.05, cy - size * 0.2, cx + size * 0.4, cy + size * 0.15, 2, color);
        drawCircle(cx - size * 0.4, cy + size * 0.2, size * 0.07, 2, color);
        drawCircle(cx - size * 0.05, cy - size * 0.2, size * 0.07, 2, color);
        drawCircle(cx + size * 0.4, cy + size * 0.15, size * 0.07, 2, color);
        break;
      case "rectangle":
        drawRectStroke(
          { x: cx - size * 0.32, y: cy - size * 0.22, width: size * 0.64, height: size * 0.44 },
          2,
          color
        );
        break;
      case "circle":
      case "circleGenerator":
        drawCircle(cx, cy, size * 0.32, 2, color);
        break;
      case "box":
      case "boxBuilder":
        drawRectStroke(
          { x: cx - size * 0.3, y: cy - size * 0.25, width: size * 0.6, height: size * 0.5 },
          2,
          color
        );
        drawLine(cx - size * 0.3, cy - size * 0.05, cx + size * 0.3, cy - size * 0.05, 2, color);
        break;
      case "sphere":
        drawCircle(cx, cy, size * 0.32, 2, color);
        drawLine(cx - size * 0.32, cy, cx + size * 0.32, cy, 2, color);
        break;
      case "move":
        drawLine(cx - size * 0.35, cy, cx + size * 0.35, cy, 2, color);
        drawLine(cx, cy - size * 0.35, cx, cy + size * 0.35, 2, color);
        break;
      case "rotate":
        drawCircle(cx, cy, size * 0.3, 2, color);
        drawLine(cx + size * 0.3, cy, cx + size * 0.45, cy - size * 0.15, 2, color);
        break;
      case "scale":
        drawRectStroke(
          { x: cx - size * 0.25, y: cy - size * 0.25, width: size * 0.5, height: size * 0.5 },
          2,
          color
        );
        drawLine(cx + size * 0.2, cy - size * 0.2, cx + size * 0.35, cy - size * 0.35, 2, color);
        break;
      case "geometryReference":
        drawCircle(cx, cy, size * 0.3, 2, color);
        drawLine(cx - size * 0.3, cy, cx + size * 0.3, cy, 2, color);
        drawLine(cx, cy - size * 0.3, cx, cy + size * 0.3, 2, color);
        break;
      case "transform":
        drawLine(cx - size * 0.3, cy, cx + size * 0.3, cy, 2, color);
        drawLine(cx, cy - size * 0.3, cx, cy + size * 0.3, 2, color);
        drawCircle(cx, cy, size * 0.22, 2, color);
        break;
      case "extrude":
        drawRectStroke(
          { x: cx - size * 0.2, y: cy - size * 0.2, width: size * 0.4, height: size * 0.4 },
          2,
          color
        );
        drawLine(cx, cy - size * 0.35, cx, cy - size * 0.2, 2, color);
        drawLine(cx - size * 0.1, cy - size * 0.32, cx, cy - size * 0.42, 2, color);
        drawLine(cx + size * 0.1, cy - size * 0.32, cx, cy - size * 0.42, 2, color);
        break;
      default:
        drawCircle(cx, cy, size * 0.3, 2, color);
        break;
    }
  };

  const getButtonIconLayout = (rect: Rect) => {
    const iconInsetX = metrics.iconInset;
    const iconInsetY = Math.max(3, metrics.iconInset * 0.7);
    const iconAreaHeight =
      rect.height - iconInsetY * 2 - metrics.shortLabelHeight - metrics.iconLabelGap;
    const iconMaxSize = Math.max(
      1,
      Math.min(rect.width - iconInsetX * 2, iconAreaHeight)
    );
    const iconAreaTop = rect.y + iconInsetY;
    const iconX = rect.x + (rect.width - iconMaxSize) / 2;
    const iconY = iconAreaTop + Math.max(0, (iconAreaHeight - iconMaxSize) / 2);
    const iconRect = { x: iconX, y: iconY, width: iconMaxSize, height: iconMaxSize };
    const labelRect = {
      x: rect.x + metrics.shortLabelInsetX,
      y: rect.y + rect.height - metrics.shortLabelHeight,
      width: rect.width - metrics.shortLabelInsetX * 2,
      height: metrics.shortLabelHeight,
    };
    return { iconRect, labelRect };
  };

  const drawCenteredLabel = (text: string, rect: Rect, size: number, color: RGBA) => {
    const textRenderer = textRef.current;
    const canvas = canvasRef.current;
    if (!textRenderer || !canvas) return;
    const dpr = dprRef.current;
    textRenderer.setText(text, {
      fontSize: size * dpr,
      paddingX: 0,
      paddingY: 0,
      color: "#ffffff",
    });
    const textSize = textRenderer.getSize();
    const textWidth = textSize.width / dpr;
    const textHeight = textSize.height / dpr;
    const x = rect.x + rect.width / 2 - textWidth / 2;
    const y = rect.y + rect.height / 2 - textHeight / 2;
    textRenderer.draw(
      x * dpr,
      y * dpr,
      { width: canvas.width, height: canvas.height },
      color
    );
  };

  const measureTrackedText = (
    text: string,
    fontSize: number,
    fontWeight: number,
    tracking: number
  ) => {
    const textRenderer = textRef.current;
    if (!textRenderer) {
      const width = text.length * fontSize * 0.6 + Math.max(0, text.length - 1) * tracking;
      return { width, height: fontSize };
    }
    const dpr = dprRef.current;
    let width = 0;
    let height = 0;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      textRenderer.setText(char, {
        fontSize: fontSize * dpr,
        fontWeight,
        fontFamily: LOGO_FONT_FAMILY,
        paddingX: 0,
        paddingY: 0,
        color: "#ffffff",
      });
      const size = textRenderer.getSize();
      width += size.width / dpr;
      height = Math.max(height, size.height / dpr);
      if (i < text.length - 1) {
        width += tracking;
      }
    }
    return { width, height };
  };

  const drawTrackedText = (
    text: string,
    startX: number,
    startY: number,
    fontSize: number,
    fontWeight: number,
    tracking: number,
    color: RGBA
  ) => {
    const textRenderer = textRef.current;
    const canvas = canvasRef.current;
    if (!textRenderer || !canvas) return;
    const dpr = dprRef.current;
    const resolution = { width: canvas.width, height: canvas.height };
    let x = startX;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      textRenderer.setText(char, {
        fontSize: fontSize * dpr,
        fontWeight,
        fontFamily: LOGO_FONT_FAMILY,
        paddingX: 0,
        paddingY: 0,
        color: "#ffffff",
      });
      const size = textRenderer.getSize();
      textRenderer.draw(x * dpr, startY * dpr, resolution, color);
      x += size.width / dpr;
      if (i < text.length - 1) {
        x += tracking;
      }
    }
  };

  const getLogoLayout = (labelText: string): LogoLayout | null => {
    const normalized = labelText.trim();
    if (!normalized) return null;

    const upper = normalized.toUpperCase();
    const compact = upper.replace(/\s+/g, "");
    const isWebgl = compact === "WEBGL";
    const baseText = isWebgl ? "WEB" : upper;
    const accentText = isWebgl ? "GL" : "";

    const baseSize = measureTrackedText(
      baseText,
      metrics.logoFontSize,
      LOGO_BASE_WEIGHT,
      metrics.logoTracking
    );
    const accentSize = accentText
      ? measureTrackedText(
          accentText,
          metrics.logoFontSize,
          LOGO_ACCENT_WEIGHT,
          metrics.logoAccentTracking
        )
      : { width: 0, height: 0 };

    const baseWidth = baseSize.width;
    const accentWidth = accentSize.width;
    const textWidth =
      baseWidth + (accentText ? metrics.logoAccentGap + accentWidth : 0);
    const textHeight = Math.max(baseSize.height, accentSize.height);

    const rectHeight = Math.max(
      metrics.labelHeight,
      textHeight + metrics.logoPadY * 2
    );
    const rectWidth = textWidth + metrics.logoPadX * 2;
    const rect: Rect = {
      x: metrics.paddingX,
      y: metrics.paddingY,
      width: rectWidth,
      height: rectHeight,
    };
    const textX = rect.x + metrics.logoPadX;
    const textY = rect.y + rect.height * 0.5 - textHeight * 0.5;
    const accentX = textX + baseWidth + (accentText ? metrics.logoAccentGap : 0);

    return {
      rect,
      textX,
      textY,
      baseText,
      accentText,
      baseSize,
      accentSize,
      accentX,
      isWebgl,
    };
  };

  const drawLogoBackground = (logo: LogoLayout) => {
    const rect = logo.rect;
    const radius = Math.min(metrics.logoRadius, rect.height / 2);
    const stroke = metrics.logoStroke;
    const accents = resolveLogoAccent(logoTone);

    drawShadowRoundedRect(rect, radius, metrics.logoShadowOffset, withAlpha(PALETTE.shadow, 0.22));
    drawRoundedRect(rect, radius, PALETTE.logoFill);
    drawRoundedRect(
      {
        x: rect.x + stroke,
        y: rect.y + stroke,
        width: rect.width - stroke * 2,
        height: rect.height * 0.4,
      },
      Math.max(2, radius - stroke),
      withAlpha(PALETTE.logoGlow, 0.2)
    );
    drawRectStroke(rect, stroke, PALETTE.logoStroke);

    if (logo.accentText) {
      const accentWidth = logo.accentSize.width;
      const underlineHeight = metrics.logoUnderlineHeight;
      const underlineY =
        rect.y + rect.height - underlineHeight - metrics.logoUnderlineInset;
      const underlineRect = {
        x: logo.accentX,
        y: underlineY,
        width: accentWidth,
        height: underlineHeight,
      };
      drawRoundedRect(
        underlineRect,
        underlineHeight * 0.6,
        withAlpha(accents.primary, 0.95)
      );
      if (underlineRect.width > underlineHeight * 2) {
        drawRoundedRect(
          {
            x: underlineRect.x + underlineRect.width * 0.55,
            y: underlineRect.y,
            width: underlineRect.width * 0.45,
            height: underlineRect.height,
          },
          underlineRect.height * 0.6,
          withAlpha(accents.deep, 0.95)
        );
      }
    }
  };

  const drawLogoText = (logo: LogoLayout) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const shadowOffset = metrics.logoShadowOffset * 0.8;
    const accents = resolveLogoAccent(logoTone);

    drawTrackedText(
      logo.baseText,
      logo.textX + shadowOffset,
      logo.textY + shadowOffset,
      metrics.logoFontSize,
      LOGO_BASE_WEIGHT,
      metrics.logoTracking,
      withAlpha(PALETTE.shadowDeep, 0.6)
    );
    drawTrackedText(
      logo.baseText,
      logo.textX,
      logo.textY,
      metrics.logoFontSize,
      LOGO_BASE_WEIGHT,
      metrics.logoTracking,
      PALETTE.logoText
    );

    if (logo.accentText) {
      drawTrackedText(
        logo.accentText,
        logo.accentX + shadowOffset * 0.6,
        logo.textY + shadowOffset * 0.6,
        metrics.logoFontSize,
        LOGO_ACCENT_WEIGHT,
        metrics.logoAccentTracking,
        withAlpha(accents.primary, 0.35)
      );
      drawTrackedText(
        logo.accentText,
        logo.accentX,
        logo.textY,
        metrics.logoFontSize,
        LOGO_ACCENT_WEIGHT,
        metrics.logoAccentTracking,
        accents.primary
      );
    }
  };

  const layoutButtons = (width: number) => {
    const safeWidth = Math.max(1, width);
    const hasGroupLabels = actions.some((action) => Boolean(action.groupLabel));
    const labelOffset = label ? metrics.labelHeight + metrics.labelGap : 0;
    const groupOffset = hasGroupLabels
      ? metrics.groupLabelHeight + metrics.groupLabelGap
      : 0;
    const height = metrics.paddingY * 2 + labelOffset + groupOffset + metrics.buttonSize;
    const y = metrics.paddingY + labelOffset + groupOffset;
    const separators: Rect[] = [];
    const groups: Array<{ label: string; rect: Rect }> = [];
    let x = metrics.paddingX;
    let currentGroup: { label: string; startX: number; endX: number } | null = null;

    const closeGroup = () => {
      if (!currentGroup) return;
      const width = Math.max(metrics.buttonSize, currentGroup.endX - currentGroup.startX);
      groups.push({
        label: currentGroup.label,
        rect: {
          x: currentGroup.startX,
          y: metrics.paddingY + labelOffset,
          width,
          height: metrics.groupLabelHeight,
        },
      });
      currentGroup = null;
    };

    const buttons = actions.map((action) => {
      if (action.groupBreakBefore && x > metrics.paddingX) {
        closeGroup();
        const separatorRect = {
          x: x + metrics.separatorGap * 0.5,
          y: y + 5 * effectiveScale,
          width: metrics.separatorWidth,
          height: metrics.buttonSize - 10 * effectiveScale,
        };
        separators.push(separatorRect);
        x += metrics.separatorGap + metrics.separatorWidth;
      }
      if (action.groupLabel) {
        closeGroup();
        currentGroup = { label: action.groupLabel, startX: x, endX: x };
      }
      const rect = { x, y, width: metrics.buttonSize, height: metrics.buttonSize };
      x += metrics.buttonSize + metrics.buttonGap;
      if (currentGroup) {
        currentGroup.endX = rect.x + rect.width;
      }
      return { id: action.id, rect, action };
    });
    closeGroup();

    const totalWidth = Math.max(safeWidth, x - metrics.buttonGap + metrics.paddingX);
    layoutRef.current = {
      buttons,
      separators,
      groups,
      labelOffset,
      height,
      totalWidth,
      visibleWidth: safeWidth,
    };

    const maxScroll = Math.max(0, totalWidth - safeWidth);
    const nextScroll = clamp(scrollRef.current, 0, maxScroll);
    if (nextScroll !== scrollRef.current) {
      scrollRef.current = nextScroll;
      setScrollX(nextScroll);
    }

    setBarHeight(height);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    const ui = uiRef.current;
    const textRenderer = textRef.current;
    const iconRenderer = iconRef.current;
    if (!canvas || !gl || !ui || !textRenderer) return;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const scrollOffset = scrollRef.current;
    const logoLayout = label ? getLogoLayout(label) : null;

    ui.begin(canvas.width, canvas.height);
    if (logoLayout) {
      drawLogoBackground(logoLayout);
    }
    layoutRef.current.separators.forEach((separator) => {
      const rect = {
        x: separator.x - scrollOffset,
        y: separator.y,
        width: separator.width,
        height: separator.height,
      };
      drawRoundedRect(rect, 1, withAlpha(PALETTE.border, 0.6));
    });
    layoutRef.current.buttons.forEach((button) => {
      const { action } = button;
      const rect = {
        x: button.rect.x - scrollOffset,
        y: button.rect.y,
        width: button.rect.width,
        height: button.rect.height,
      };
      const isDisabled = Boolean(action.isDisabled);
      const isHovered = hoveredIdRef.current === button.id && !isDisabled;
      const isActive = Boolean(action.isActive);
      const category = resolveActionCategory(action);
      const categoryTint = resolveActionTint(action);
      const baseFill = isActive
        ? PALETTE.buttonActive
        : isHovered
          ? PALETTE.buttonHover
          : PALETTE.button;
      const disabledFill = withAlpha(mix(baseFill, rgb(210, 210, 210, 1), 0.45), 0.6);
      const finalFill = isDisabled ? disabledFill : baseFill;
      const borderBase = isActive
        ? darken(PALETTE.border, 0.08)
        : isHovered
          ? darken(PALETTE.border, 0.04)
          : PALETTE.border;
      const border = withAlpha(borderBase, isDisabled ? 0.45 : 1);
      const radius = Math.min(metrics.buttonRadius, rect.width / 2, rect.height / 2);
      const stroke = metrics.buttonStroke;
      const shadowOffset = isHovered ? metrics.shadowOffset * 1.1 : metrics.shadowOffset;

      const shadowBase = darken(categoryTint, 0.72);
      const shadowAlpha = isDisabled ? 0.25 : isHovered || isActive ? 0.5 : 0.38;
      drawShadowRoundedRect(
        rect,
        radius,
        shadowOffset,
        withAlpha(shadowBase, shadowAlpha)
      );

      drawRoundedRect(rect, radius, border);

      const innerRect = {
        x: rect.x + stroke,
        y: rect.y + stroke,
        width: rect.width - stroke * 2,
        height: rect.height - stroke * 2,
      };
      drawRoundedRect(innerRect, Math.max(2, radius - stroke), finalFill);

      if (!isDisabled && category !== "neutral") {
        const accentWidth = Math.max(2, Math.round(3 * effectiveScale));
        const accentInset = Math.max(4, Math.round(5 * effectiveScale));
        const accentRect = {
          x: innerRect.x + accentInset,
          y: innerRect.y + accentInset,
          width: accentWidth,
          height: Math.max(2, innerRect.height - accentInset * 2),
        };
        drawRoundedRect(
          accentRect,
          Math.max(1, accentWidth * 0.6),
          withAlpha(categoryTint, isHovered || isActive ? 0.9 : 0.78)
        );
      }

      if (keyboardModeRef.current && hoveredIdRef.current === button.id && !isDisabled) {
        drawRoundedRect(
          {
            x: rect.x - 2,
            y: rect.y - 2,
            width: rect.width + 4,
            height: rect.height + 4,
          },
          radius + 2,
          withAlpha(PALETTE.shadow, 0.5)
        );
      }
    });
    ui.flush();

    layoutRef.current.groups.forEach((group) => {
      const rect = {
        x: group.rect.x - scrollOffset,
        y: group.rect.y,
        width: group.rect.width,
        height: group.rect.height,
      };
      drawCenteredLabel(
        group.label.toUpperCase(),
        rect,
        metrics.groupLabelSize,
        resolveGroupLabelColor(group.label)
      );
    });

    const dpr = dprRef.current;

    const labelButtons = layoutRef.current.buttons;

    if (iconRenderer) {
      iconRenderer.begin(canvas.width, canvas.height);
      labelButtons.forEach((button) => {
        const iconId = resolveIconId(button.action);
        const renderRect = {
          x: button.rect.x - scrollOffset,
          y: button.rect.y,
          width: button.rect.width,
          height: button.rect.height,
        };
        const { iconRect } = getButtonIconLayout(renderRect);
        const iconRectDpr = {
          x: iconRect.x * dpr,
          y: iconRect.y * dpr,
          width: iconRect.width * dpr,
          height: iconRect.height * dpr,
        };

        const baseTint = resolveActionTint(button.action);
        const highlightTint = lighten(baseTint, 0.08);
        const isHighlighted =
          hoveredIdRef.current === button.id || Boolean(button.action.isActive);
        const tint = button.action.isDisabled
          ? withAlpha(mix(baseTint, PALETTE.iconDisabled, 0.6), 0.45)
          : isHighlighted
            ? highlightTint
            : baseTint;

        const shadowOffset = metrics.iconShadowOffset * dpr;
        const shadowTint = withAlpha(
          darken(baseTint, 0.6),
          button.action.isDisabled ? 0.25 : 0.4
        );
        iconRenderer.drawIcon(
          {
            x: iconRectDpr.x + shadowOffset,
            y: iconRectDpr.y + shadowOffset,
            width: iconRectDpr.width,
            height: iconRectDpr.height,
          },
          iconId,
          shadowTint
        );
        iconRenderer.drawIcon(iconRectDpr, iconId, tint);
      });
      iconRenderer.flush();
    } else {
      labelButtons.forEach((button) => {
        const renderRect = {
          x: button.rect.x - scrollOffset,
          y: button.rect.y,
          width: button.rect.width,
          height: button.rect.height,
        };
        const { iconRect } = getButtonIconLayout(renderRect);
        const baseTint = resolveActionTint(button.action);
        const highlightTint = lighten(baseTint, 0.08);
        const isHighlighted =
          hoveredIdRef.current === button.id || Boolean(button.action.isActive);
        const tint = button.action.isDisabled
          ? withAlpha(mix(baseTint, PALETTE.iconDisabled, 0.6), 0.45)
          : isHighlighted
            ? highlightTint
            : baseTint;
        const shadowOffset = metrics.iconShadowOffset;
        const shadowTint = withAlpha(
          darken(baseTint, 0.6),
          button.action.isDisabled ? 0.25 : 0.4
        );
        drawIcon(
          resolveIconId(button.action),
          iconRect.x + iconRect.width * 0.5 + shadowOffset,
          iconRect.y + iconRect.height * 0.5 + shadowOffset,
          iconRect.width,
          shadowTint
        );
        drawIcon(
          resolveIconId(button.action),
          iconRect.x + iconRect.width * 0.5,
          iconRect.y + iconRect.height * 0.5,
          iconRect.width,
          tint
        );
      });
    }

    labelButtons.forEach((button) => {
      const renderRect = {
        x: button.rect.x - scrollOffset,
        y: button.rect.y,
        width: button.rect.width,
        height: button.rect.height,
      };
      const { labelRect } = getButtonIconLayout(renderRect);
      const isHighlighted = hoveredIdRef.current === button.id || button.action.isActive;
      const baseTint = resolveActionTint(button.action);
      const labelColor = button.action.isDisabled
        ? withAlpha(mix(baseTint, PALETTE.iconDisabled, 0.6), 0.45)
        : isHighlighted
          ? lighten(baseTint, 0.08)
          : withAlpha(baseTint, 0.9);
      drawCenteredLabel(
        resolveTopBarShortLabel(button.action),
        labelRect,
        metrics.shortLabelSize,
        labelColor
      );
    });

    if (logoLayout) {
      drawLogoText(logoLayout);
    } else if (label) {
      drawText(label, metrics.paddingX, metrics.paddingY, metrics.labelSize, PALETTE.icon);
    }

    const hovered = layoutRef.current.buttons.find(
      (button) => button.id === hoveredIdRef.current
    );
    if (!hovered) return;

    const tooltipText = hovered.action.tooltip || hovered.action.label;
    const paddingX = metrics.tooltipPaddingX;
    const paddingY = metrics.tooltipPaddingY;
    const fontSize = metrics.tooltipFontSize;
    const canvasWidth = canvas.width / dpr;
    const canvasHeight = canvas.height / dpr;
    const maxTooltipWidth = Math.min(360, Math.max(1, canvasWidth - 24));

    textRenderer.setText(tooltipText, {
      fontSize: fontSize * dpr,
      paddingX: paddingX * dpr,
      paddingY: paddingY * dpr,
      maxWidth: maxTooltipWidth * dpr,
      lineHeight: Math.round(fontSize * 1.35 * dpr),
      color: "#ffffff",
    });
    const textSize = textRenderer.getSize();
    const tooltipWidth = textSize.width / dpr;
    const tooltipHeight = textSize.height / dpr;
    let tooltipX = pointerRef.current.x + 14;
    let tooltipY = pointerRef.current.y + 16;

    if (keyboardModeRef.current && focusRectRef.current) {
      const focusRect = focusRectRef.current;
      tooltipX = focusRect.x + focusRect.width + 12;
      tooltipY = focusRect.y + focusRect.height / 2 - tooltipHeight / 2;
    }

    tooltipX = clamp(tooltipX, 6, Math.max(6, canvasWidth - tooltipWidth - 6));
    tooltipY = clamp(tooltipY, 6, Math.max(6, canvasHeight - tooltipHeight - 6));
    const rect = {
      x: tooltipX,
      y: tooltipY,
      width: tooltipWidth,
      height: tooltipHeight,
    };

    ui.begin(canvas.width, canvas.height);
    const tooltipRadius = 6;
    drawShadowRoundedRect(rect, tooltipRadius, 4, withAlpha(PALETTE.shadowDeep, 0.7));
    drawRoundedRect(rect, tooltipRadius, PALETTE.tooltipBorder);
    drawRoundedRect(
      {
        x: rect.x + 1,
        y: rect.y + 1,
        width: rect.width - 2,
        height: rect.height - 2,
      },
      Math.max(2, tooltipRadius - 1),
      PALETTE.tooltipBg
    );
    ui.flush();

    textRenderer.draw(
      rect.x * dpr,
      rect.y * dpr,
      { width: canvas.width, height: canvas.height },
      [1, 1, 1, 1]
    );
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true, alpha: true });
    if (!gl) return;
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    glRef.current = gl;
    uiRef.current = new WebGLUIRenderer(gl);
    textRef.current = new WebGLTextRenderer(gl);
    iconRef.current = new WebGLIconRenderer(gl);
    draw();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(3, (window.devicePixelRatio || 1) * PANEL_SUPERSAMPLE);
      dprRef.current = dpr;
      layoutButtons(rect.width);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(layoutRef.current.height * dpr));
      draw();
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [actions, label, effectiveScale, metrics]);

  useEffect(() => {
    draw();
  }, [actions, label, effectiveScale]);

  useEffect(() => {
    scrollRef.current = scrollX;
    draw();
  }, [scrollX]);

  const focusButton = (button: LayoutButton | null) => {
    if (!button || button.action.isDisabled) return;
    keyboardModeRef.current = true;
    const maxScroll = Math.max(0, layoutRef.current.totalWidth - layoutRef.current.visibleWidth);
    let nextScroll = scrollRef.current;
    const leftEdge = button.rect.x;
    const rightEdge = button.rect.x + button.rect.width;
    const padding = 6;
    if (leftEdge < nextScroll + padding) {
      nextScroll = Math.max(0, leftEdge - padding);
    } else if (rightEdge > nextScroll + layoutRef.current.visibleWidth - padding) {
      nextScroll = Math.min(maxScroll, rightEdge - layoutRef.current.visibleWidth + padding);
    }

    if (nextScroll !== scrollRef.current) {
      scrollRef.current = nextScroll;
      setScrollX(nextScroll);
    }

    const rect = {
      x: button.rect.x - nextScroll,
      y: button.rect.y,
      width: button.rect.width,
      height: button.rect.height,
    };
    hoveredIdRef.current = button.id;
    focusRectRef.current = rect;
    pointerRef.current = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    draw();
  };

  const focusNextButton = (direction: 1 | -1) => {
    const buttons = layoutRef.current.buttons;
    if (buttons.length === 0) return;
    const currentIndex = buttons.findIndex((button) => button.id === hoveredIdRef.current);
    let index = currentIndex >= 0 ? currentIndex : direction === 1 ? -1 : 0;

    for (let i = 0; i < buttons.length; i += 1) {
      index = (index + direction + buttons.length) % buttons.length;
      if (!buttons[index].action.isDisabled) {
        focusButton(buttons[index]);
        return;
      }
    }
  };

  const hitTest = (x: number, y: number) => {
    const layoutX = x + scrollRef.current;
    return (
      layoutRef.current.buttons.find(
        (button) =>
          layoutX >= button.rect.x &&
          layoutX <= button.rect.x + button.rect.width &&
          y >= button.rect.y &&
          y <= button.rect.y + button.rect.height
      ) ?? null
    );
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    keyboardModeRef.current = false;
    focusRectRef.current = null;
    pointerRef.current = { x, y };
    const hit = hitTest(x, y);
    hoveredIdRef.current = hit?.id ?? null;
    canvas.style.cursor = hit && !hit.action.isDisabled ? "pointer" : "default";
    draw();
  };

  const handlePointerLeave = () => {
    if (keyboardModeRef.current) return;
    hoveredIdRef.current = null;
    draw();
  };

  const handlePointerUp = () => {
    const hit = layoutRef.current.buttons.find(
      (button) => button.id === hoveredIdRef.current
    );
    if (!hit || hit.action.isDisabled) return;
    hit.action.onClick();
  };

  const handleFocus = () => {
    if (layoutRef.current.buttons.length === 0) return;
    const current = layoutRef.current.buttons.find(
      (button) => button.id === hoveredIdRef.current && !button.action.isDisabled
    );
    if (current) {
      focusButton(current);
      return;
    }
    focusNextButton(1);
  };

  const handleBlur = () => {
    keyboardModeRef.current = false;
    hoveredIdRef.current = null;
    focusRectRef.current = null;
    draw();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusNextButton(1);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusNextButton(-1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusButton(layoutRef.current.buttons.find((button) => !button.action.isDisabled) ?? null);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      const buttons = [...layoutRef.current.buttons].reverse();
      focusButton(buttons.find((button) => !button.action.isDisabled) ?? null);
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      const hit = layoutRef.current.buttons.find(
        (button) => button.id === hoveredIdRef.current
      );
      if (!hit || hit.action.isDisabled) return;
      hit.action.onClick();
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    if (allowWheelScale && (event.ctrlKey || event.metaKey || event.altKey)) {
      if (event.cancelable) {
        event.preventDefault();
      }
      const delta = -event.deltaY * PANEL_SCALE_SPEED;
      const nextScale = clamp(
        effectiveScale * Math.exp(delta),
        MIN_PANEL_SCALE,
        MAX_PANEL_SCALE
      );
      if (nextScale !== effectiveScale) {
        if (isControlled) {
          onPanelScaleChange?.(nextScale);
        } else {
          setInternalScale(nextScale);
        }
      }
      return;
    }
    const maxScroll = Math.max(0, layoutRef.current.totalWidth - layoutRef.current.visibleWidth);
    if (maxScroll <= 0) return;
    if (event.cancelable) {
      event.preventDefault();
    }
    const dominantDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const nextScroll = clamp(scrollRef.current + dominantDelta, 0, maxScroll);
    if (nextScroll === scrollRef.current) return;
    scrollRef.current = nextScroll;
    setScrollX(nextScroll);
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: barHeight }}
      data-no-workspace-pan
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
        role="toolbar"
        aria-label={label ? `${label} toolbar` : "Panel toolbar"}
        tabIndex={0}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
      />
    </div>
  );
};

export default WebGLPanelTopBar;
