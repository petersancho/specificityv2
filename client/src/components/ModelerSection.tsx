import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import WebGLViewerCanvas from "./WebGLViewerCanvas";
import { type WebGLTopBarAction, resolveTopBarShortLabel } from "./WebGLPanelTopBar";
import WebGLStatusFooter from "./WebGLStatusFooter";
import WebGLTitleLogo from "./WebGLTitleLogo";
import { NumericalCanvas } from "./workflow/NumericalCanvas";
import { createIconSignature } from "./workflow/iconSignature";
import { safeLocalStorageGet, safeLocalStorageSet } from "../utils/safeStorage";
import WebGLButton from "./ui/WebGLButton";
import WebGLSelect from "./ui/WebGLSelect";
import IconButton from "./ui/IconButton";
import WebGLSlider from "./ui/WebGLSlider";
import TooltipCard from "./ui/TooltipCard";
import { useProjectStore } from "../store/useProjectStore";
import styles from "./ModelerSection.module.css";
import {
  COMMAND_DEFINITIONS,
  COMMAND_PREFIX,
  parseCommandInput,
  type CommandDefinition,
} from "../commands/registry";
import { COMMAND_DESCRIPTIONS, COMMAND_SEMANTICS } from "../data/commandDescriptions";
import type {
  BRepCurve,
  BRepData,
  BRepSurface,
  CameraState,
  CPlane,
  Geometry,
  NURBSCurve,
  NURBSSurface,
  PlaneDefinition,
  PolylineGeometry,
  PrimitiveKind,
  RenderMesh,
  Vec3,
} from "../types";
import {
  add,
  centroid,
  computeBestFitPlane,
  dot,
  normalize,
  scale,
  sub,
} from "../geometry/math";
import {
  DEFAULT_PRIMITIVE_CONFIG,
  computeMeshArea,
  computeVertexNormals,
  generateBoxMesh,
  generateExtrudeMesh,
  generateLoftMesh,
  generateSurfaceMesh,
} from "../geometry/mesh";
import { PRIMITIVE_COMMAND_IDS, PRIMITIVE_KIND_BY_COMMAND } from "../data/primitiveCatalog";
import { offsetPolyline2D } from "../geometry/booleans";
import type { IconId } from "../webgl/ui/WebGLIconRenderer";
import { VIEW_STYLE } from "../webgl/viewProfile";
import { hexToRgb, normalizeHexColor, normalizeRgbInput, rgbToHex, type RGB } from "../utils/color";
import { resolvePaletteColor, type RenderPaletteId } from "../utils/renderPalette";
import { mergeRenderMeshes } from "../utils/meshIo";
import {
  tessellateCurveAdaptive,
  tessellateSurfaceAdaptive,
} from "../geometry/tessellation";
import { brepFromMesh, tessellateBRepToMesh } from "../geometry/brep";
import { interpolateNurbsCurve } from "../geometry/nurbs";


const selectionModeOptions = [
  {
    value: "object",
    label: "Object",
    iconId: "box",
    tooltip: "Object selection mode. Picks whole geometry objects.",
  },
  {
    value: "vertex",
    label: "Vertex",
    iconId: "point",
    tooltip: "Vertex mode. Selects points using screen-space tolerance.",
  },
  {
    value: "edge",
    label: "Edge",
    iconId: "line",
    tooltip: "Edge mode. Selects edges using screen-space tolerance.",
  },
  {
    value: "face",
    label: "Face",
    iconId: "rectangle",
    tooltip: "Face mode. Selects faces directly.",
  },
] as const;

const transformOrientationOrder = ["world", "local", "view", "cplane"] as const;

const transformOrientationOptions = [
  {
    value: "world",
    label: "World",
    iconId: "frameAll",
    tooltip: "World orientation. Align transforms to global axes.",
  },
  {
    value: "local",
    label: "Local",
    iconId: "gumball",
    tooltip: "Local orientation. Align transforms to the object's axes.",
  },
  {
    value: "view",
    label: "View",
    iconId: "displayMode",
    tooltip: "View orientation. Align transforms to the camera view plane.",
  },
  {
    value: "cplane",
    label: "C-Plane",
    iconId: "cplaneXY",
    tooltip: "C-Plane orientation. Align transforms to the active construction plane.",
  },
] as const;

const DEFAULT_RENDER_MATERIAL_COLOR = VIEW_STYLE.mesh;
const DEFAULT_RENDER_MATERIAL_HEX = rgbToHex(DEFAULT_RENDER_MATERIAL_COLOR);

type RenderFilterId = RenderPaletteId | "silhouette";

const RENDER_FILTER_OPTIONS = [
  { value: "color", label: "SOLID" },
  { value: "cmyk", label: "CMYK" },
  { value: "pms", label: "PMS" },
  { value: "hsl", label: "HSL" },
  { value: "silhouette", label: "Silhouette" },
] as const;

type RenderPaletteSliderSpec = {
  label: string;
  tooltip: string;
  min: number;
  max: number;
  step: number;
  accentColor: string;
  iconId: IconId;
};

type RenderPaletteSliderValues = Record<RenderPaletteId, [number, number]>;

const RENDER_PALETTE_SLIDERS: Record<
  RenderPaletteId,
  [RenderPaletteSliderSpec, RenderPaletteSliderSpec]
> = {
  color: [
    {
      label: "solid",
      tooltip: "Solid filter strength.",
      min: 0,
      max: 1,
      step: 0.01,
      accentColor: "#f97316",
      iconId: "displayMode",
    },
    {
      label: "white light",
      tooltip: "Solid filter contrast.",
      min: 0,
      max: 1,
      step: 0.01,
      accentColor: "#2b2620",
      iconId: "sphere",
    },
  ],
  cmyk: [
    {
      label: "Ink Load",
      tooltip: "CMYK ink load.",
      min: 0,
      max: 1,
      step: 0.01,
      accentColor: "#00b7eb",
      iconId: "displayMode",
    },
    {
      label: "Key",
      tooltip: "CMYK key (black).",
      min: 0,
      max: 1,
      step: 0.01,
      accentColor: "#111111",
      iconId: "sphere",
    },
  ],
  pms: [
    {
      label: "Pantone Tint",
      tooltip: "Pantone tint strength.",
      min: 0,
      max: 1,
      step: 0.01,
      accentColor: "#f97316",
      iconId: "displayMode",
    },
    {
      label: "Pantone Shade",
      tooltip: "Pantone shade depth.",
      min: 0,
      max: 1,
      step: 0.01,
      accentColor: "#2b2620",
      iconId: "sphere",
    },
  ],
  hsl: [
    {
      label: "Hue",
      tooltip: "Hue angle (0-360).",
      min: 0,
      max: 360,
      step: 1,
      accentColor: "#1f6a33",
      iconId: "displayMode",
    },
    {
      label: "Lightness",
      tooltip: "Lightness level.",
      min: 0,
      max: 1,
      step: 0.01,
      accentColor: "#f7f3ea",
      iconId: "sphere",
    },
  ],
};

const createDefaultRenderPaletteSliders = (): RenderPaletteSliderValues => ({
  color: [0.62, 0.28],
  cmyk: [0.7, 0.18],
  pms: [0.6, 0.35],
  hsl: [210, 0.55],
});

type ColorWheelPalette = RenderFilterId;
type ColorWheelId = "material";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRgb = (a: RGB, b: RGB, t: number): RGB => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
const mixWithWhite = (color: RGB, t: number): RGB => lerpRgb([1, 1, 1], color, t);
const buildWheelStops = (hexes: string[]): RGB[] =>
  hexes.map((hex) => hexToRgb(hex) ?? [0, 0, 0]);

const COLOR_WHEEL_STOPS: Record<ColorWheelPalette, RGB[]> = {
  color: buildWheelStops([
    "#ff4b4b",
    "#ffd84b",
    "#7dff47",
    "#47ffd6",
    "#4b7dff",
    "#c44bff",
    "#ff4fa3",
    "#ff4b4b",
  ]),
  hsl: buildWheelStops([
    "#ff4b4b",
    "#ffd84b",
    "#7dff47",
    "#47ffd6",
    "#4b7dff",
    "#c44bff",
    "#ff4fa3",
    "#ff4b4b",
  ]),
  cmyk: buildWheelStops(["#0b8a97", "#c2166b", "#c07a00", "#0b8a97"]),
  pms: buildWheelStops(["#b3531c", "#f5f2ee", "#c9c5c0", "#0b8a97", "#b3531c"]),
  silhouette: buildWheelStops(["#000000", "#000000"]),
};

type WheelSample = {
  rgb: RGB;
};

const sampleWheel = (
  palette: ColorWheelPalette,
  x: number,
  y: number,
  size: number
): WheelSample | null => {
  if (palette === "silhouette") {
    return { rgb: [0, 0, 0] };
  }
  const center = size / 2;
  const dx = x - center;
  const dy = y - center;
  const rawRadius = Math.hypot(dx, dy) / center;
  if (!Number.isFinite(rawRadius) || rawRadius > 1) return null;
  const radius = clamp01(rawRadius);
  const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
  const t = angle / (Math.PI * 2);
  const stops = COLOR_WHEEL_STOPS[palette];
  const segments = stops.length - 1;
  const scaled = t * segments;
  const index = Math.min(segments - 1, Math.max(0, Math.floor(scaled)));
  const localT = scaled - index;
  const hueColor = lerpRgb(stops[index], stops[index + 1], localT);
  const rgb = mixWithWhite(hueColor, clamp01(radius));
  return { rgb };
};


type ViewportKind = "axonometric" | "top" | "left" | "right";

const VIEWPORT_OPTIONS: Array<{ id: ViewportKind; label: string }> = [
  { id: "axonometric", label: "Axonometric" },
  { id: "top", label: "Top" },
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
];

const cloneCameraState = (camera: CameraState): CameraState => ({
  ...camera,
  position: { ...camera.position },
  target: { ...camera.target },
  up: { ...camera.up },
});

const computeViewDistance = (camera: CameraState) => {
  const dx = camera.position.x - camera.target.x;
  const dy = camera.position.y - camera.target.y;
  const dz = camera.position.z - camera.target.z;
  return Math.max(0.1, Math.hypot(dx, dy, dz));
};

const buildViewportCamera = (base: CameraState, viewport: ViewportKind): CameraState => {
  const viewDistance = computeViewDistance(base);
  const next = cloneCameraState(base);
  switch (viewport) {
    case "top":
      return {
        ...next,
        position: {
          x: base.target.x,
          y: base.target.y + viewDistance,
          z: base.target.z,
        },
        up: { x: 0, y: 0, z: 1 },
      };
    case "left":
      return {
        ...next,
        position: {
          x: base.target.x - viewDistance,
          y: base.target.y,
          z: base.target.z,
        },
        up: { x: 0, y: 1, z: 0 },
      };
    case "right":
      return {
        ...next,
        position: {
          x: base.target.x + viewDistance,
          y: base.target.y,
          z: base.target.z,
        },
        up: { x: 0, y: 1, z: 0 },
      };
    case "axonometric":
    default:
      return next;
  }
};

const buildViewportCameras = (base: CameraState): Record<ViewportKind, CameraState> => ({
  axonometric: buildViewportCamera(base, "axonometric"),
  top: buildViewportCamera(base, "top"),
  left: buildViewportCamera(base, "left"),
  right: buildViewportCamera(base, "right"),
});

const pivotModeOptions = [
  {
    value: "selection",
    label: "Selection",
    iconId: "selectionFilter",
    tooltip: "Selection pivot. Use the selection centroid as pivot.",
  },
  {
    value: "world",
    label: "World",
    iconId: "frameAll",
    tooltip: "World pivot. Use the global origin as pivot.",
  },
  {
    value: "picked",
    label: "Picked",
    iconId: "pointGenerator",
    tooltip: "Picked pivot. Use the last picked point as pivot.",
  },
  {
    value: "cursor",
    label: "Cursor",
    iconId: "focus",
    tooltip: "Cursor pivot. Use the current cursor position.",
  },
  {
    value: "origin",
    label: "Origin",
    iconId: "point",
    tooltip: "Origin pivot. Use the absolute world origin.",
  },
] as const;

const ROSLYN_PANEL_SCALE_KEY = "lingua.webglPanelScale";
const MIN_ROSLYN_PANEL_SCALE = 0.4;
const MAX_ROSLYN_PANEL_SCALE = 1.05;
const PANEL_SCALE_SPEED = 0.0015;
const ROSLYN_PALETTE_COLLAPSED_KEY = "lingua.roslynPaletteCollapsed";
const MINIMAP_MARGIN = 12;

const ROSLYN_PALETTE_SECTIONS: Array<{
  id: string;
  label: string;
  description: string;
  groups: string[];
}> = [
  {
    id: "geometry",
    label: "Geometry",
    description: "Primitives, curves, NURBS, BREP, meshes",
    groups: ["Primitive", "Curve", "NURBS", "BREP", "Mesh"],
  },
  {
    id: "transform",
    label: "Transform",
    description: "Move, rotate, scale, gumball",
    groups: ["Transform", "Gumball"],
  },
];

const ROSLYN_GROUP_ACCENTS: Record<string, string> = {
  Primitive: "#FF00FF",
  Curve: "#FF33FF",
  NURBS: "#00FF80",
  BREP: "#3300FF",
  Mesh: "#1AB3FF",
  Transform: "#661AFF",
  Edit: "#FF4D66",
  Selection: "#FFFF00",
  Orientation: "#33FFCC",
  Gumball: "#00FFFF",
  Pivot: "#FFCC00",
  "C-Plane": "#00FF00",
  Workflow: "#80FFE6",
  Groups: "#99FF80",
  Camera: "#4DFFFF",
  View: "#B200FF",
};

const resolveRoslynGroupAccent = (label: string) =>
  ROSLYN_GROUP_ACCENTS[label] ?? "#343c4a";

const COMMAND_CATEGORY_LABELS: Record<string, string> = {
  geometry: "Geometry",
  transform: "Transform",
  edit: "Edit",
  view: "View",
  performs: "Command",
};

const resolveCommandCategoryLabel = (category?: string) =>
  (category && COMMAND_CATEGORY_LABELS[category]) ?? category ?? "Command";

const resolveCommandSemantics = (category?: string) =>
  (category && COMMAND_SEMANTICS[category]) ?? COMMAND_SEMANTICS.performs;

const cleanCommandPrompt = (prompt?: string, label?: string) => {
  if (!prompt) return label ?? "";
  const prefix = new RegExp(`^${label}\\s*:\\s*`, "i");
  return prompt.replace(prefix, "").trim();
};

const buildCommandDocsHref = (commandId: string) =>
  `#/docs/roslyn/${encodeURIComponent(commandId)}`;

type CommandRequest = {
  id: string;
  input: string;
  requestId: number;
};

type CommandSuggestion = {
  command: CommandDefinition;
  input: string;
};

type MinimapPosition = {
  x: number;
  y: number;
};

type MinimapDragState = {
  pointerId: number;
  startPointer: { x: number; y: number };
  startPosition: MinimapPosition;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

type NurbsConversionPayload =
  | {
      sourceType: "polyline";
      vertexIds: string[];
      vertexPositions: Record<string, Vec3>;
      closed: boolean;
      degree: 1 | 2 | 3;
      nurbs?: NURBSCurve;
    }
  | {
      sourceType: "surface";
      loops: string[][];
      vertexPositions: Record<string, Vec3>;
      nurbs?: NURBSSurface;
      plane?: PlaneDefinition;
    }
  | {
      sourceType: "nurbsCurve";
      closed: boolean;
      nurbs?: NURBSCurve;
    }
  | {
      sourceType: "nurbsSurface";
      nurbs?: NURBSSurface;
    };

type BRepConversionPayload = {
  sourceType: "brep";
  brep: BRepData;
};

const cloneValue = <T,>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const COMMAND_ICON_ID_MAP: Record<string, IconId> = {
  box: "box",
  sphere: "sphere",
  frameall: "frameAll",
  "geometry-reference": "geometryReference",
  "point-generator": "pointGenerator",
  "line-builder": "lineBuilder",
  curve: "interpolate",
  mirror: "transform",
  array: "transform",
  "circle-generator": "circleGenerator",
  "box-builder": "boxBuilder",
  "transform-node": "transform",
  "extrude-node": "extrude",
  meshconvert: "surface",
  nurbsrestore: "interpolate",
  nurbsbox: "box",
  nurbssphere: "sphere",
  nurbscylinder: "primitive",
  "selection-filter": "selectionFilter",
  "display-mode": "displayMode",
  selectionfilter: "selectionFilter",
  display: "displayMode",
  grid: "ruler",
  snapping: "point",
  tolerance: "ruler",
  view: "frameAll",
  camera: "upright",
  orbit: "rotate",
  pan: "move",
  zoom: "zoomCursor",
  pivot: "pivotMode",
  cplane: "cplaneAlign",
  isolate: "hide",
  outliner: "group",
  cancel: "close",
  confirm: "run",
  cycle: "repeat",
  status: "script",
  morph: "gumball",
  "reference-active": "referenceActive",
  "reference-all": "referenceAll",
  "advanced-toggle": "advanced",
  "transform-orientation": "transformOrientation",
  "pivot-mode": "pivotMode",
  "cplane-xy": "cplaneXY",
  "cplane-xz": "cplaneXZ",
  "cplane-yz": "cplaneYZ",
  "cplane-align": "cplaneAlign",
  meshmerge: "boolean",
  meshflip: "rotate",
  meshthicken: "offset",
  breptomesh: "surface",
  meshtobrep: "surface",
};

const PRIMITIVE_COMMAND_ID_SET = new Set(PRIMITIVE_COMMAND_IDS);
const NURBS_PRIMITIVE_KIND_BY_COMMAND = new Map<string, PrimitiveKind>([
  ["nurbsbox", "box"],
  ["nurbssphere", "sphere"],
  ["nurbscylinder", "cylinder"],
]);

const resolveCommandIconId = (commandId: string): IconId => {
  if (PRIMITIVE_COMMAND_ID_SET.has(commandId)) {
    return `primitive:${commandId}`;
  }
  const nurbsKind = NURBS_PRIMITIVE_KIND_BY_COMMAND.get(commandId);
  if (nurbsKind) {
    return `primitive:${nurbsKind}`;
  }
  return COMMAND_ICON_ID_MAP[commandId] ?? (commandId as IconId);
};

const COMMAND_CATEGORY_TINTS = {
  primitive: "#FF00FF",
  curve: "#FF33FF",
  nurbs: "#00FF80",
  brep: "#3300FF",
  mesh: "#1AB3FF",
  neutral: "#00FFFF",
} as const;

const PRIMITIVE_COMMANDS = new Set(["point", ...PRIMITIVE_COMMAND_IDS]);

const CURVE_COMMANDS = new Set(["line", "polyline", "rectangle"]);

const NURBS_COMMANDS = new Set([
  "circle",
  "arc",
  "curve",
  "interpolate",
  "nurbsbox",
  "nurbssphere",
  "nurbscylinder",
]);

const BREP_COMMANDS = new Set(["surface", "loft", "extrude", "boolean", "meshtobrep"]);

const MESH_COMMANDS = new Set([
  "meshconvert",
  "breptomesh",
  "nurbsrestore",
  "meshmerge",
  "meshflip",
  "meshthicken",
]);

const TRANSFORM_COMMANDS = new Set([
  "transform",
  "move",
  "rotate",
  "scale",
  "offset",
  "mirror",
  "array",
  "morph",
]);

const GUMBALL_COMMANDS = new Set(["gumball"]);
const PIVOT_COMMANDS = new Set(["pivot"]);

const SELECTION_COMMANDS = new Set([
  "selectionfilter",
  "cycle",
  "snapping",
  "grid",
  "tolerance",
]);

const C_PLANE_COMMANDS = new Set(["cplane"]);

const CAMERA_COMMANDS = new Set(["camera", "orbit", "pan", "zoom"]);

const VIEW_COMMANDS = new Set([
  "focus",
  "frameall",
  "view",
  "display",
  "isolate",
  "status",
]);

const WORKFLOW_COMMANDS = new Set(["outliner"]);

const EDIT_COMMANDS = new Set([
  "undo",
  "redo",
  "copy",
  "paste",
  "duplicate",
  "delete",
  "cancel",
  "confirm",
]);

const resolveCommandGroupLabel = (commandId: string) => {
  if (PRIMITIVE_COMMANDS.has(commandId)) return "Primitive";
  if (CURVE_COMMANDS.has(commandId)) return "Curve";
  if (NURBS_COMMANDS.has(commandId)) return "NURBS";
  if (BREP_COMMANDS.has(commandId)) return "BREP";
  if (MESH_COMMANDS.has(commandId)) return "Mesh";
  if (GUMBALL_COMMANDS.has(commandId)) return "Gumball";
  if (PIVOT_COMMANDS.has(commandId)) return "Pivot";
  if (C_PLANE_COMMANDS.has(commandId)) return "C-Plane";
  if (SELECTION_COMMANDS.has(commandId)) return "Selection";
  if (CAMERA_COMMANDS.has(commandId)) return "Camera";
  if (VIEW_COMMANDS.has(commandId)) return "View";
  if (WORKFLOW_COMMANDS.has(commandId)) return "Workflow";
  if (EDIT_COMMANDS.has(commandId)) return "Edit";
  if (TRANSFORM_COMMANDS.has(commandId)) return "Transform";
  return "Edit";
};

const resolveCommandCategory = (
  commandId: string
): keyof typeof COMMAND_CATEGORY_TINTS => {
  if (PRIMITIVE_COMMANDS.has(commandId)) return "primitive";
  if (CURVE_COMMANDS.has(commandId)) return "curve";
  if (NURBS_COMMANDS.has(commandId)) return "nurbs";
  if (BREP_COMMANDS.has(commandId)) return "brep";
  if (MESH_COMMANDS.has(commandId)) return "mesh";
  return "neutral";
};

const resolveCommandIconTint = (commandId: string) =>
  COMMAND_CATEGORY_TINTS[resolveCommandCategory(commandId)];

const renderCommandIcon = (commandId: string) => {
  switch (commandId) {
    case "point":
      return (
        <svg {...iconProps} aria-hidden="true">
          <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
          <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />
        </svg>
      );
    case "line":
      return (
        <svg {...iconProps} aria-hidden="true">
          <path d="M5 17L19 7" />
          <circle cx="5" cy="17" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="19" cy="7" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "polyline":
      return (
        <svg {...iconProps} aria-hidden="true">
          <polyline points="4 18 9 8 15 14 20 6" />
          <circle cx="4" cy="18" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="9" cy="8" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="15" cy="14" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="20" cy="6" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "rectangle":
      return (
        <svg {...iconProps} aria-hidden="true">
          <rect x="5" y="6" width="14" height="12" rx="2" />
          <path d="M5 10h14M5 14h14" />
        </svg>
      );
    case "circle":
      return (
        <svg {...iconProps} aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "arc":
      return (
        <svg {...iconProps} aria-hidden="true">
          <path d="M5 16a7 7 0 0 1 14-6" />
          <circle cx="5" cy="16" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="19" cy="10" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "curve":
      return (
        <svg {...iconProps} aria-hidden="true">
          <path d="M4 17c3-7 9-9 16-9" />
          <circle cx="4" cy="17" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="9.5" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="20" cy="8" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "primitive":
      return (
        <svg {...iconProps} aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <path d="M6 12h12M12 6v12" />
        </svg>
      );
    case "interpolate":
      return (
        <svg {...iconProps} aria-hidden="true">
          <path d="M4 16c3-6 9-8 16-8" />
          <circle cx="4" cy="16" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="10" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="20" cy="8" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "boolean":
      return (
        <svg {...iconProps} aria-hidden="true">
          <circle cx="10" cy="12" r="5" />
          <circle cx="14" cy="12" r="5" />
        </svg>
      );
    case "loft":
      return (
        <svg {...iconProps} aria-hidden="true">
          <path d="M6 7h12" />
          <path d="M4 12h16" />
          <path d="M6 17h12" />
        </svg>
      );
    case "surface":
      return (
        <svg {...iconProps} aria-hidden="true">
          <rect x="5" y="6" width="14" height="12" rx="2" />
          <path d="M5 10h14M10 6v12M14 6v12" />
        </svg>
      );
    case "extrude":
      return (
        <svg {...iconProps} aria-hidden="true">
          <rect x="7" y="9" width="10" height="10" rx="2" />
          <path d="M12 4v6M9 7l3-3 3 3" />
        </svg>
      );
    case "transform":
      return (
        <svg {...iconProps} aria-hidden="true">
          <path d="M12 4v16M4 12h16" />
          <path d="M12 4l-2 2M12 4l2 2M12 20l-2-2M12 20l2-2" />
          <path d="M4 12l2-2M4 12l2 2M20 12l-2-2M20 12l-2 2" />
        </svg>
      );
    case "move":
      return (
        <svg {...iconProps} aria-hidden="true">
          <path d="M12 3v18M3 12h18" />
          <path d="M12 3l-2 2M12 3l2 2M12 21l-2-2M12 21l2-2" />
          <path d="M3 12l2-2M3 12l2 2M21 12l-2-2M21 12l-2 2" />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "rotate":
      return (
        <svg {...iconProps} aria-hidden="true">
          <path d="M7 9a6 6 0 1 1-1 5" />
          <path d="M6 6v4h4" />
        </svg>
      );
    case "scale":
      return (
        <svg {...iconProps} aria-hidden="true">
          <rect x="6" y="6" width="10" height="10" rx="2" />
          <path d="M10 14l8-8M13 6h5v5" />
        </svg>
      );
    case "gumball":
      return (
        <svg {...iconProps} aria-hidden="true">
          <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
          <path d="M12 4v5M12 15v5M4 12h5M15 12h5" />
        </svg>
      );
    case "undo":
      return (
        <svg {...iconProps} aria-hidden="true">
          <path d="M9 7H5v4" />
          <path d="M5 11c2-4 8-6 12-2 2 2 2 6 0 8" />
        </svg>
      );
    case "redo":
      return (
        <svg {...iconProps} aria-hidden="true">
          <path d="M15 7h4v4" />
          <path d="M19 11c-2-4-8-6-12-2-2 2-2 6 0 8" />
        </svg>
      );
    case "delete":
      return (
        <svg {...iconProps} aria-hidden="true">
          <path d="M7 8h10" />
          <rect x="8" y="8" width="8" height="11" rx="1.6" />
          <path d="M10 6h4" />
          <path d="M11 11v6M13 11v6" />
        </svg>
      );
    case "focus":
      return (
        <svg {...iconProps} aria-hidden="true">
          <circle cx="12" cy="12" r="5.5" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      );
    case "frameall":
      return (
        <svg {...iconProps} aria-hidden="true">
          <rect x="5" y="5" width="14" height="14" rx="2.4" />
          <path d="M9 9L6 6M15 9l3-3M9 15l-3 3M15 15l3 3" />
        </svg>
      );
    case "copy":
      return (
        <svg {...iconProps} aria-hidden="true">
          <rect x="7" y="7" width="11" height="11" rx="2" />
          <rect x="5" y="5" width="11" height="11" rx="2" />
        </svg>
      );
    case "paste":
      return (
        <svg {...iconProps} aria-hidden="true">
          <rect x="7" y="8" width="10" height="12" rx="2" />
          <rect x="9" y="4" width="6" height="4" rx="1.4" />
          <path d="M10 12h4M10 15h4" />
        </svg>
      );
    case "duplicate":
      return (
        <svg {...iconProps} aria-hidden="true">
          <rect x="6" y="9" width="10" height="10" rx="2" />
          <rect x="10" y="5" width="8" height="8" rx="2" />
        </svg>
      );
    case "morph":
      return (
        <svg {...iconProps} aria-hidden="true">
          <path d="M4 15c3-6 7-6 10 0s4 6 6 0" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps} aria-hidden="true">
          <circle cx="12" cy="12" r="6" />
        </svg>
      );
  }
};

type ModelerSectionProps = {
  onCaptureRequest?: (element: HTMLElement) => Promise<void> | void;
  captureDisabled?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
};

type MeshGeometry = Extract<Geometry, { type: "mesh" }>;

const isMeshGeometry = (item?: Geometry | null): item is MeshGeometry =>
  Boolean(item && item.type === "mesh");

const collectMeshPoints = (mesh: RenderMesh): Vec3[] => {
  const points: Vec3[] = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    points.push({
      x: mesh.positions[i],
      y: mesh.positions[i + 1],
      z: mesh.positions[i + 2],
    });
  }
  return points;
};

const ModelerSection = ({
  onCaptureRequest,
  captureDisabled,
  isFullscreen: isFullscreenProp = false,
  onToggleFullscreen,
}: ModelerSectionProps) => {
  const geometry = useProjectStore((state) => state.geometry);
  const layers = useProjectStore((state) => state.layers);
  const assignments = useProjectStore((state) => state.assignments);
  const materials = useProjectStore((state) => state.materials);
  const selectionMode = useProjectStore((state) => state.selectionMode);
  const setSelectionMode = useProjectStore((state) => state.setSelectionMode);
  const componentSelection = useProjectStore(
    (state) => state.componentSelection
  );
  const setComponentSelection = useProjectStore(
    (state) => state.setComponentSelection
  );
  const addGeometryReferenceNode = useProjectStore(
    (state) => state.addGeometryReferenceNode
  );
  const workflowNodes = useProjectStore((state) => state.workflow.nodes);
  const renameLayer = useProjectStore((state) => state.renameLayer);
  const renameSceneNode = useProjectStore((state) => state.renameSceneNode);
  const transformOrientation = useProjectStore(
    (state) => state.transformOrientation
  );
  const setTransformOrientation = useProjectStore(
    (state) => state.setTransformOrientation
  );
  const gumballAlignment = useProjectStore((state) => state.gumballAlignment);
  const setGumballAlignment = useProjectStore((state) => state.setGumballAlignment);
  const showRotationRings = useProjectStore((state) => state.showRotationRings);
  const setShowRotationRings = useProjectStore((state) => state.setShowRotationRings);
  const showMoveArms = useProjectStore((state) => state.showMoveArms);
  const setShowMoveArms = useProjectStore((state) => state.setShowMoveArms);
  const pivot = useProjectStore((state) => state.pivot);
  const setPivotMode = useProjectStore((state) => state.setPivotMode);
  const setDisplayMode = useProjectStore((state) => state.setDisplayMode);
  const displayMode = useProjectStore((state) => state.displayMode);
  const viewSolidity = useProjectStore((state) => state.viewSolidity);
  const setViewSolidity = useProjectStore((state) => state.setViewSolidity);
  const viewSettings = useProjectStore((state) => state.viewSettings);
  const setViewSettings = useProjectStore((state) => state.setViewSettings);
  const snapSettings = useProjectStore((state) => state.snapSettings);
  const setSnapSettings = useProjectStore((state) => state.setSnapSettings);
  const gridSettings = useProjectStore((state) => state.gridSettings);
  const setGridSettings = useProjectStore((state) => state.setGridSettings);
  const setCPlane = useProjectStore((state) => state.setCPlane);
  const resetCPlane = useProjectStore((state) => state.resetCPlane);
  const cPlane = useProjectStore((state) => state.cPlane);
  const cameraState = useProjectStore((state) => state.camera);
  const isFullscreen = Boolean(isFullscreenProp);
  const setCameraPreset = useProjectStore((state) => state.setCameraPreset);
  const setCameraState = useProjectStore((state) => state.setCameraState);
  const undoModeler = useProjectStore((state) => state.undoModeler);
  const redoModeler = useProjectStore((state) => state.redoModeler);
  const recordModelerHistory = useProjectStore((state) => state.recordModelerHistory);
  const clipboard = useProjectStore((state) => state.clipboard);
  const setClipboard = useProjectStore((state) => state.setClipboard);
  const addGeometryItems = useProjectStore((state) => state.addGeometryItems);
  const addGeometryMesh = useProjectStore((state) => state.addGeometryMesh);
  const addGeometryPolylineFromPoints = useProjectStore(
    (state) => state.addGeometryPolylineFromPoints
  );
  const addGeometryLoft = useProjectStore((state) => state.addGeometryLoft);
  const addGeometryExtrude = useProjectStore((state) => state.addGeometryExtrude);
  const replaceGeometryBatch = useProjectStore(
    (state) => state.replaceGeometryBatch
  );
  const updateGeometryBatch = useProjectStore((state) => state.updateGeometryBatch);
  const deleteGeometry = useProjectStore((state) => state.deleteGeometry);
  const hiddenGeometryIds = useProjectStore((state) => state.hiddenGeometryIds);
  const lockedGeometryIds = useProjectStore((state) => state.lockedGeometryIds);
  const toggleGeometryVisibility = useProjectStore(
    (state) => state.toggleGeometryVisibility
  );
  const toggleGeometryLock = useProjectStore((state) => state.toggleGeometryLock);
  const sceneNodes = useProjectStore((state) => state.sceneNodes);
  const createGroup = useProjectStore((state) => state.createGroup);
  const ungroup = useProjectStore((state) => state.ungroup);
  const selectedGeometryIds = useProjectStore(
    (state) => state.selectedGeometryIds
  );
  const selectGeometry = useProjectStore((state) => state.selectGeometry);
  const setSelectedGeometryIds = useProjectStore(
    (state) => state.setSelectedGeometryIds
  );
  const [activeCommand, setActiveCommand] = useState<CommandDefinition | null>(
    null
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showStatusBar, setShowStatusBar] = useState(true);
  const [panelScale, setPanelScale] = useState(() => {
    if (typeof window === "undefined") return 0.85;
    const stored = safeLocalStorageGet(ROSLYN_PANEL_SCALE_KEY);
    const parsed = stored ? Number(stored) : 0.85;
    if (!Number.isFinite(parsed)) return 0.85;
    return Math.min(
      MAX_ROSLYN_PANEL_SCALE,
      Math.max(MIN_ROSLYN_PANEL_SCALE, parsed)
    );
  });
  const [paletteCollapsed, setPaletteCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return safeLocalStorageGet(ROSLYN_PALETTE_COLLAPSED_KEY) === "true";
  });
  const [renderPanelOpen, setRenderPanelOpen] = useState(false);
  const [renderFilter, setRenderFilter] = useState<RenderFilterId>("color");
  const [renderPalette, setRenderPalette] = useState<RenderPaletteId>("color");
  const [renderPaletteSliders, setRenderPaletteSliders] =
    useState<RenderPaletteSliderValues>(() => createDefaultRenderPaletteSliders());
  const [activeColorWheel, setActiveColorWheel] = useState<ColorWheelId | null>(null);
  const colorWheelDragRef = useRef<ColorWheelId | null>(null);
  const [commandBarHeight, setCommandBarHeight] = useState(0);
  const [primitiveSettings, setPrimitiveSettings] = useState(() => ({
    ...DEFAULT_PRIMITIVE_CONFIG,
  }));
  const [rectangleSettings, setRectangleSettings] = useState({
    width: 1.6,
    height: 1,
  });
  const [circleSettings, setCircleSettings] = useState({
    radius: 0.8,
    segments: 32,
  });
  const [commandInput, setCommandInput] = useState("");
  const [commandError, setCommandError] = useState("");
  const [commandRequest, setCommandRequest] = useState<CommandRequest | null>(
    null
  );
  const [fullscreenViewports, setFullscreenViewports] = useState<ViewportKind[]>([
    "axonometric",
    "top",
    "left",
    "right",
  ]);
  const [fullscreenCameras, setFullscreenCameras] = useState<
    Record<ViewportKind, CameraState>
  >(() => buildViewportCameras(cameraState));
  const fullscreenCamerasRef = useRef(fullscreenCameras);
  const lastActiveViewportRef = useRef<ViewportKind>("axonometric");
  const wasFullscreenRef = useRef(isFullscreen);
  const isFullscreenStatusHidden = isFullscreen;
  const commandRequestIdRef = useRef(0);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const [footerRoot, setFooterRoot] = useState<HTMLElement | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerHoverRef = useRef(false);
  const minimapDockRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const minimapDragRef = useRef<MinimapDragState | null>(null);
  const [minimapSize, setMinimapSize] = useState({ width: 0, height: 0 });
  const [minimapPosition, setMinimapPosition] = useState<MinimapPosition | null>(
    null
  );
  const [minimapCollapsed, setMinimapCollapsed] = useState(false);
  const [minimapDragging, setMinimapDragging] = useState(false);
  const commandBarRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLElement | null>(null);
  const renderPanelRef = useRef<HTMLDivElement | null>(null);
  const renderTabRef = useRef<HTMLButtonElement | null>(null);

  const buildSuggestionInput = (command: CommandDefinition) => {
    const raw = commandInput.trim();
    if (!raw) return command.id;
    const normalized = raw.toLowerCase();
    const prefixMatch = normalized.match(COMMAND_PREFIX);
    const prefixLength = prefixMatch ? prefixMatch[0].length : 0;
    const prefix = prefixLength ? raw.slice(0, prefixLength) : "";
    const withoutPrefix = raw.slice(prefixLength).trim();
    if (!withoutPrefix) return `${prefix}${command.id}`.trim();
    const [, ...rest] = withoutPrefix.split(/\s+/);
    const args = rest.join(" ");
    return `${prefix}${command.id}${args ? ` ${args}` : ""}`.trim();
  };

  const commandMatches = useMemo(() => {
    const raw = commandInput.trim();
    if (!raw) return [];
    const parsed = parseCommandInput(commandInput);
    if (parsed.command) return [];

    const normalized = raw.toLowerCase();
    const prefixMatch = normalized.match(COMMAND_PREFIX);
    const prefixLength = prefixMatch ? prefixMatch[0].length : 0;
    const withoutPrefix = raw.slice(prefixLength).trim();
    if (!withoutPrefix) return [];

    const [token] = withoutPrefix.split(/\s+/);
    if (!token) return [];
    const normalizedToken = token.toLowerCase();

    const scored = COMMAND_DEFINITIONS.map((command) => {
      const id = command.id.toLowerCase();
      const label = command.label.toLowerCase();
      let score = 4;
      if (id.startsWith(normalizedToken)) score = 0;
      else if (label.startsWith(normalizedToken)) score = 1;
      else if (id.includes(normalizedToken)) score = 2;
      else if (label.includes(normalizedToken)) score = 3;
      return { command, score };
    }).filter((entry) => entry.score < 4);

    return scored
      .sort((a, b) => a.score - b.score || a.command.label.localeCompare(b.command.label))
      .slice(0, 6)
      .map((entry) => entry.command);
  }, [commandInput]);

  const commandPrimarySuggestion = useMemo<CommandSuggestion | null>(() => {
    const raw = commandInput.trim();
    if (!raw) return null;
    const parsed = parseCommandInput(commandInput);
    if (parsed.command) {
      return { command: parsed.command, input: raw };
    }
    const primary = commandMatches[0];
    if (!primary) return null;
    return { command: primary, input: buildSuggestionInput(primary) };
  }, [commandInput, commandMatches]);

  const commandMeta = useMemo(() => {
    if (commandError) return null;
    const trimmed = commandInput.trim();
    if (!trimmed) return "Type to search";
    if (commandPrimarySuggestion) {
      return `Run: ${commandPrimarySuggestion.command.label}`;
    }
    return "No matches";
  }, [commandError, commandInput, commandPrimarySuggestion]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setFooterRoot(document.getElementById("workspace-footer-root"));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    safeLocalStorageSet(ROSLYN_PANEL_SCALE_KEY, panelScale.toFixed(3));
  }, [panelScale]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    safeLocalStorageSet(ROSLYN_PALETTE_COLLAPSED_KEY, String(paletteCollapsed));
  }, [paletteCollapsed]);

  useEffect(() => {
    if (paletteCollapsed) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && paletteRef.current?.contains(target)) return;
      setPaletteCollapsed(true);
    };
    window.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () =>
      window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
  }, [paletteCollapsed]);

  useEffect(() => {
    if (!renderPanelOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && renderPanelRef.current?.contains(target)) return;
      if (target && renderTabRef.current?.contains(target)) return;
      setRenderPanelOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () =>
      window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
  }, [renderPanelOpen]);

  useLayoutEffect(() => {
    const node = commandBarRef.current;
    if (!node) return;
    const measure = () => {
      setCommandBarHeight(node.offsetHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!isFullscreen || minimapCollapsed || typeof window === "undefined") return;
    const node = minimapRef.current;
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      setMinimapSize({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [isFullscreen, minimapCollapsed]);

  useEffect(() => {
    if (isFullscreen && !minimapCollapsed) return;
    setMinimapSize({ width: 0, height: 0 });
    minimapDragRef.current = null;
    setMinimapDragging(false);
  }, [isFullscreen, minimapCollapsed]);

  const clampPanelScale = (value: number) =>
    Math.min(MAX_ROSLYN_PANEL_SCALE, Math.max(MIN_ROSLYN_PANEL_SCALE, value));

  const resolveMinimapMetrics = () => {
    const container = viewerRef.current;
    const minimap = minimapDockRef.current;
    if (!container || !minimap) return null;
    const containerRect = container.getBoundingClientRect();
    const minimapRect = minimap.getBoundingClientRect();
    const minX = MINIMAP_MARGIN;
    const minY = MINIMAP_MARGIN;
    const maxX = Math.max(
      minX,
      containerRect.width - minimapRect.width - MINIMAP_MARGIN
    );
    const maxY = Math.max(
      minY,
      containerRect.height - minimapRect.height - MINIMAP_MARGIN
    );

    return {
      position: {
        x: minimapRect.left - containerRect.left,
        y: minimapRect.top - containerRect.top,
      },
      bounds: { minX, minY, maxX, maxY },
    };
  };

  const clampMinimapPosition = (
    position: MinimapPosition,
    bounds: MinimapDragState["bounds"]
  ) => ({
    x: Math.min(bounds.maxX, Math.max(bounds.minX, position.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, position.y)),
  });

  const handleMinimapPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-minimap-action='true']")) return;
    if (!target?.closest("[data-minimap-drag-handle='true']")) return;

    const metrics = resolveMinimapMetrics();
    if (!metrics) return;

    event.preventDefault();
    event.stopPropagation();

    const startPosition = clampMinimapPosition(
      minimapPosition ?? metrics.position,
      metrics.bounds
    );

    if (!minimapPosition) {
      setMinimapPosition(startPosition);
    }

    minimapDragRef.current = {
      pointerId: event.pointerId,
      startPointer: { x: event.clientX, y: event.clientY },
      startPosition,
      bounds: metrics.bounds,
    };
    setMinimapDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleMinimapPointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const dragState = minimapDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragState.startPointer.x;
    const deltaY = event.clientY - dragState.startPointer.y;
    const next = clampMinimapPosition(
      {
        x: dragState.startPosition.x + deltaX,
        y: dragState.startPosition.y + deltaY,
      },
      dragState.bounds
    );
    setMinimapPosition((prev) =>
      prev && Math.abs(prev.x - next.x) < 0.5 && Math.abs(prev.y - next.y) < 0.5
        ? prev
        : next
    );
  };

  const handleMinimapPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = minimapDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    minimapDragRef.current = null;
    setMinimapDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleCommandBarWheel = (
    event: React.WheelEvent<HTMLDivElement>
  ) => {
    if (!(event.ctrlKey || event.metaKey || event.altKey)) return;
    event.preventDefault();
    const delta = -event.deltaY * PANEL_SCALE_SPEED;
    setPanelScale((prev) => clampPanelScale(prev * Math.exp(delta)));
  };

  const scaledCommandBarHeight = commandBarHeight
    ? Math.max(1, commandBarHeight * panelScale)
    : 0;

  const commandBarShellStyle = useMemo(() => {
    if (!scaledCommandBarHeight) return undefined;
    return {
      height: `${scaledCommandBarHeight}px`,
      minHeight: `${scaledCommandBarHeight}px`,
    };
  }, [scaledCommandBarHeight]);

  const commandBarScaleStyle = useMemo(
    () => ({
      transform: `scale(${panelScale})`,
      transformOrigin: "top left",
    }),
    [panelScale]
  );

  useEffect(() => {
    fullscreenCamerasRef.current = fullscreenCameras;
  }, [fullscreenCameras]);

  useEffect(() => {
    if (isFullscreen && !wasFullscreenRef.current) {
      setFullscreenCameras(buildViewportCameras(cameraState));
      lastActiveViewportRef.current = fullscreenViewports[0] ?? "axonometric";
    }
    wasFullscreenRef.current = isFullscreen;
  }, [isFullscreen, cameraState, fullscreenViewports]);

  const cameraPreferences = useMemo(
    () => ({
      preset: cameraState.preset,
      zoomToCursor: cameraState.zoomToCursor,
      invertZoom: cameraState.invertZoom,
      upright: cameraState.upright,
      orbitSpeed: cameraState.orbitSpeed,
      panSpeed: cameraState.panSpeed,
      zoomSpeed: cameraState.zoomSpeed,
    }),
    [
      cameraState.preset,
      cameraState.zoomToCursor,
      cameraState.invertZoom,
      cameraState.upright,
      cameraState.orbitSpeed,
      cameraState.panSpeed,
      cameraState.zoomSpeed,
    ]
  );

  useEffect(() => {
    if (!isFullscreen) return;
    setFullscreenCameras((prev) => ({
      axonometric: { ...prev.axonometric, ...cameraPreferences },
      top: { ...prev.top, ...cameraPreferences },
      left: { ...prev.left, ...cameraPreferences },
      right: { ...prev.right, ...cameraPreferences },
    }));
  }, [isFullscreen, cameraPreferences]);

  const resolveViewportCamera = (viewport: ViewportKind): CameraState =>
    fullscreenCameras[viewport];

  const handleViewportCameraChange = useCallback(
    (viewport: ViewportKind, update: Partial<CameraState>) => {
      const current = fullscreenCamerasRef.current[viewport];
      const nextCamera = { ...current, ...update };
      setFullscreenCameras((prev) => ({
        ...prev,
        [viewport]: nextCamera,
      }));
      lastActiveViewportRef.current = viewport;
      setCameraState({
        position: nextCamera.position,
        target: nextCamera.target,
        up: nextCamera.up,
        fov: nextCamera.fov,
      });
    },
    [setCameraState]
  );

  const viewportCameraHandlers = useMemo(
    () => ({
      axonometric: (update: Partial<CameraState>) =>
        handleViewportCameraChange("axonometric", update),
      top: (update: Partial<CameraState>) =>
        handleViewportCameraChange("top", update),
      left: (update: Partial<CameraState>) =>
        handleViewportCameraChange("left", update),
      right: (update: Partial<CameraState>) =>
        handleViewportCameraChange("right", update),
    }),
    [handleViewportCameraChange]
  );

  const resolveActiveViewport = () =>
    lastActiveViewportRef.current ?? fullscreenViewports[0] ?? "axonometric";

  const applyActiveViewportCameraUpdate = (update: Partial<CameraState>) => {
    if (isFullscreen) {
      handleViewportCameraChange(resolveActiveViewport(), update);
      return;
    }
    setCameraState(update);
  };

  const updateViewportSlot = (index: number, next: ViewportKind) => {
    setFullscreenViewports((prev) => {
      const nextSlots = prev.slice();
      nextSlots[index] = next;
      return nextSlots;
    });
    lastActiveViewportRef.current = next;
  };

  const selectedPolylines = useMemo(
    () =>
      selectedGeometryIds
        .map((id) => geometry.find((item) => item.id === id))
        .filter((item): item is PolylineGeometry => item?.type === "polyline"),
    [geometry, selectedGeometryIds]
  );

  const selectedCurves = useMemo(
    () =>
      selectedGeometryIds
        .map((id) => geometry.find((item) => item.id === id))
        .filter(
          (item): item is PolylineGeometry | Extract<Geometry, { type: "nurbsCurve" }> =>
            item?.type === "polyline" || item?.type === "nurbsCurve"
        ),
    [geometry, selectedGeometryIds]
  );

  const loftSelectionState = useMemo<{ ready: boolean; message: string }>(() => {
    if (selectionMode !== "object") {
      return {
        ready: false,
        message: "Switch the selection filter to Object to loft curves.",
      };
    }
    if (selectedCurves.length === 0) {
      return { ready: false, message: "Select at least two curves to loft." };
    }
    if (selectedCurves.length === 1) {
      return { ready: false, message: "Select one more curve to loft." };
    }
    return { ready: true, message: "" };
  }, [selectionMode, selectedCurves.length]);

  const primarySelectedGeometryId =
    selectedGeometryIds[selectedGeometryIds.length - 1] ?? null;

  const referencedGeometryIds = useMemo(() => {
    const ids = new Set<string>();
    workflowNodes.forEach((node) => {
      if (node.type === "geometryReference" && node.data?.geometryId) {
        ids.add(node.data.geometryId);
      }
    });
    return ids;
  }, [workflowNodes]);

  const selectedGeometry =
    geometry.find((item) => item.id === primarySelectedGeometryId) ?? geometry[0];
  const selectedGeometryLabel =
    selectionMode !== "object"
      ? componentSelection.length > 0
        ? `${componentSelection.length} ${selectionMode} selected`
        : "None"
      : selectedGeometryIds.length > 1
        ? `${selectedGeometryIds.length} selected`
        : selectedGeometry?.id ?? "None";
  const selectedLayer = layers.find(
    (layer) => layer.id === selectedGeometry?.layerId
  );
  const customMaterial = useMemo(() => {
    const metadata = selectedGeometry?.metadata;
    if (!metadata || typeof metadata !== "object") return null;
    const custom = (metadata as { customMaterial?: unknown }).customMaterial;
    if (!custom || typeof custom !== "object") return null;
    const customRecord = custom as { color?: unknown; hex?: unknown };
    const color = normalizeRgbInput(customRecord.color);
    const hex =
      typeof customRecord.hex === "string"
        ? normalizeHexColor(customRecord.hex)
        : color
          ? rgbToHex(color)
          : null;
    const resolvedColor = color ?? (hex ? hexToRgb(hex) : null);
    if (!resolvedColor) return null;
    return { color: resolvedColor, hex: hex ?? rgbToHex(resolvedColor) };
  }, [selectedGeometry]);
  const assignedGeometryMaterialId = assignments.find(
    (assignment) => assignment.geometryId === selectedGeometry?.id
  )?.materialId;
  const assignedLayerMaterialId = assignments.find(
    (assignment) => assignment.layerId === selectedLayer?.id
  )?.materialId;
  const assignedMaterialId =
    assignedGeometryMaterialId ?? assignedLayerMaterialId ?? materials[0]?.id;
  const selectedMaterial = materials.find(
    (material) => material.id === assignedMaterialId
  );
  const selectedMaterialLabel =
    customMaterial
      ? "Custom"
      : selectedMaterial?.name ??
        (materials.length === 0 ? "Loading..." : "Unassigned");

  const extrudeCommand = useMemo(
    () => COMMAND_DEFINITIONS.find((command) => command.id === "extrude") ?? null,
    []
  );

  const activeSnapsLabel = useMemo(() => {
    const labels = [
      snapSettings.grid ? "grid" : null,
      snapSettings.vertices ? "vertex" : null,
      snapSettings.endpoints ? "endpoint" : null,
      snapSettings.midpoints ? "midpoint" : null,
      snapSettings.intersections ? "intersection" : null,
      snapSettings.perpendicular ? "perpendicular" : null,
      snapSettings.tangent ? "tangent" : null,
    ].filter(Boolean);
    return labels.length > 0 ? labels.join(", ") : "none";
  }, [snapSettings]);

  const hasExtrudeProfile = useMemo(
    () =>
      selectedGeometryIds.some(
        (id) => {
          const type = geometry.find((item) => item.id === id)?.type;
          return type === "polyline" || type === "nurbsCurve";
        }
      ),
    [geometry, selectedGeometryIds]
  );

  const geometryMap = useMemo(
    () => new Map(geometry.map((item) => [item.id, item])),
    [geometry]
  );
  const materialPickerHex = customMaterial?.hex ?? DEFAULT_RENDER_MATERIAL_HEX;
  const materialPickerDisabled = selectedGeometryIds.length === 0;
  type CustomMaterialMetadata = {
    color?: RGB;
    hex?: string;
    palette?: RenderPaletteId;
    paletteValues?: [number, number];
    paletteSwatch?: string;
  };
  const updateSelectedCustomMaterial = useCallback(
    (build: (current: CustomMaterialMetadata | null) => CustomMaterialMetadata) => {
      if (selectedGeometryIds.length === 0) return;
      const updates = selectedGeometryIds
        .map((id) => {
          const existing = geometryMap.get(id);
          if (!existing) return null;
          const metadata = existing.metadata ?? {};
          const custom =
            (metadata as { customMaterial?: unknown }).customMaterial;
          const current =
            custom && typeof custom === "object"
              ? (custom as CustomMaterialMetadata)
              : null;
          return {
            id,
            data: {
              metadata: {
                ...metadata,
                customMaterial: build(current),
              },
            },
          };
        })
        .filter(Boolean) as Array<{ id: string; data: Partial<Geometry> }>;
      if (updates.length === 0) return;
      updateGeometryBatch(updates, { recordHistory: true });
    },
    [geometryMap, selectedGeometryIds, updateGeometryBatch]
  );
  const handleMaterialColorChange = (nextHex: string) => {
    if (selectedGeometryIds.length === 0) return;
    const normalized =
      normalizeHexColor(nextHex) ?? normalizeHexColor(materialPickerHex) ?? DEFAULT_RENDER_MATERIAL_HEX;
    const rgb = hexToRgb(normalized) ?? DEFAULT_RENDER_MATERIAL_COLOR;
    const palette = renderFilter === "silhouette" ? renderPalette : renderFilter;
    if (renderFilter !== "silhouette") {
      setRenderPalette(palette);
    }
    updateSelectedCustomMaterial((current) => ({
      ...(current ?? {}),
      color: rgb,
      hex: normalized,
      palette,
      paletteValues: renderPaletteSliders[palette],
    }));
  };
  const applyRenderPaletteToSelection = useCallback(
    (
      palette: RenderPaletteId,
      values: [number, number],
      options?: { swatch?: string | null; updateColor?: boolean }
    ) => {
      if (selectedGeometryIds.length === 0) return;
      const baseColor =
        hexToRgb(materialPickerHex) ?? DEFAULT_RENDER_MATERIAL_COLOR;
      const updateColor = options?.updateColor ?? true;
      const paletteColor = updateColor
        ? resolvePaletteColor({
            palette,
            values,
            swatch: options?.swatch,
            baseColor,
          })
        : null;
      const nextHex = paletteColor ? rgbToHex(paletteColor) : null;
      updateSelectedCustomMaterial((current) => {
        const next: CustomMaterialMetadata = {
          ...(current ?? {}),
          palette,
          paletteValues: values,
        };
        if (options?.swatch !== undefined) {
          next.paletteSwatch = options.swatch ?? undefined;
        }
        if (updateColor && paletteColor && nextHex) {
          next.color = paletteColor;
          next.hex = nextHex;
        }
        return next;
      });
    },
    [materialPickerHex, selectedGeometryIds.length, updateSelectedCustomMaterial]
  );
  const handleRenderFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as RenderFilterId;
    setRenderFilter(next);
    if (next === "silhouette") {
      setDisplayMode("silhouette");
      return;
    }
    setRenderPalette(next);
    applyRenderPaletteToSelection(next, renderPaletteSliders[next], {
      updateColor: false,
    });
    if (displayMode === "silhouette") {
      setViewSolidity(viewSolidity, { overrideDisplayMode: true });
    }
  };
  useEffect(() => {
    if (!renderPanelOpen && activeColorWheel) {
      setActiveColorWheel(null);
    }
  }, [activeColorWheel, renderPanelOpen]);
  useEffect(() => {
    if (materialPickerDisabled && activeColorWheel === "material") {
      setActiveColorWheel(null);
    }
  }, [activeColorWheel, materialPickerDisabled]);

  const updateWheelColor = (
    id: ColorWheelId,
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    const palette = renderFilter as ColorWheelPalette;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const sample = sampleWheel(palette, x, y, Math.min(rect.width, rect.height));
    if (!sample) return;
    if (palette === "silhouette") {
      setDisplayMode("silhouette");
      return;
    }
    if (id === "material") {
      handleMaterialColorChange(rgbToHex(sample.rgb));
    }
  };

  const handleWheelPointerDown =
    (id: ColorWheelId) => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      colorWheelDragRef.current = id;
      event.currentTarget.setPointerCapture(event.pointerId);
      updateWheelColor(id, event);
    };

  const handleWheelPointerMove =
    (id: ColorWheelId) => (event: ReactPointerEvent<HTMLDivElement>) => {
      if (colorWheelDragRef.current !== id) return;
      event.preventDefault();
      event.stopPropagation();
      updateWheelColor(id, event);
    };

  const handleWheelPointerUp =
    (id: ColorWheelId) => (event: ReactPointerEvent<HTMLDivElement>) => {
      if (colorWheelDragRef.current !== id) return;
      colorWheelDragRef.current = null;
      event.preventDefault();
      event.stopPropagation();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    };
  const handleRenderPaletteSliderChange = (
    palette: RenderPaletteId,
    index: 0 | 1,
    value: number
  ) => {
    const current = renderPaletteSliders[palette];
    const nextValues: [number, number] = index === 0 ? [value, current[1]] : [current[0], value];
    setRenderPaletteSliders((prev) => {
      const current = prev[palette];
      const next: [number, number] = index === 0 ? [value, current[1]] : [current[0], value];
      return { ...prev, [palette]: next };
    });
    applyRenderPaletteToSelection(palette, nextValues, { updateColor: false });
  };
  const activeRenderPaletteSliders = RENDER_PALETTE_SLIDERS[renderPalette];
  const activeRenderPaletteValues = renderPaletteSliders[renderPalette];
  const vertexMap = useMemo(
    () =>
      new Map(
        geometry
          .filter((item) => item.type === "vertex")
          .map((item) => [item.id, item])
      ),
    [geometry]
  );

  const collectGeometryPoints = useCallback(
    (item: Geometry): Vec3[] => {
      if (item.type === "vertex") {
        return [item.position];
      }
      if (item.type === "polyline") {
        return item.vertexIds
          .map((vertexId) => vertexMap.get(vertexId)?.position)
          .filter((point): point is Vec3 => Boolean(point));
      }
      if (item.type === "nurbsCurve") {
        const points = item.nurbs.controlPoints;
        return points.length > 0 ? points.map((point) => ({ ...point })) : [];
      }
      if (item.type === "nurbsSurface") {
        if (item.mesh && item.mesh.positions.length > 0) {
          return collectMeshPoints(item.mesh);
        }
        return item.nurbs.controlPoints.flat().map((point) => ({ ...point }));
      }
      if (item.type === "brep") {
        if (item.brep.vertices.length > 0) {
          return item.brep.vertices.map((vertex) => vertex.position);
        }
        if (item.mesh && item.mesh.positions.length > 0) {
          return collectMeshPoints(item.mesh);
        }
        return [];
      }
      if ("mesh" in item && item.mesh) {
        return collectMeshPoints(item.mesh);
      }
      return [];
    },
    [vertexMap]
  );

  const offsetSelectedPolylines = (distance: number) => {
    if (selectionMode !== "object") {
      return { error: "Switch the selection filter to Object to offset curves." };
    }
    if (selectedPolylines.length === 0) {
      return { error: "Select one or more polylines to offset." };
    }

    const normalizeOrFallback = (axis: Vec3, fallback: Vec3) => {
      const normalized = normalize(axis);
      return Math.hypot(normalized.x, normalized.y, normalized.z) > 1e-6
        ? normalized
        : fallback;
    };

    const origin = cPlane.origin;
    const xAxis = normalizeOrFallback(cPlane.xAxis, { x: 1, y: 0, z: 0 });
    const yAxis = normalizeOrFallback(cPlane.yAxis, { x: 0, y: 0, z: 1 });
    const normal = normalizeOrFallback(cPlane.normal, { x: 0, y: 1, z: 0 });

    const toPlane = (point: Vec3): Vec3 => {
      const delta = sub(point, origin);
      return {
        x: dot(delta, xAxis),
        y: dot(delta, yAxis),
        z: dot(delta, normal),
      };
    };

    const fromPlane = (coords: Vec3): Vec3 =>
      add(
        origin,
        add(
          scale(xAxis, coords.x),
          add(scale(yAxis, coords.y), scale(normal, coords.z))
        )
      );

    const nextIds: string[] = [];

    selectedPolylines.forEach((polyline) => {
      const points = polyline.vertexIds
        .map((vertexId) => vertexMap.get(vertexId)?.position)
        .filter((point): point is Vec3 => Boolean(point));
      if (points.length < 2) return;
      const localPoints = points.map(toPlane);
      const offsetLocal = offsetPolyline2D(localPoints, distance, polyline.closed);
      if (offsetLocal.length < 2) return;
      const worldPoints = offsetLocal.map(fromPlane);
      const nextId = addGeometryPolylineFromPoints(worldPoints, {
        closed: Boolean(polyline.closed),
        degree: polyline.degree,
      });
      if (nextId) nextIds.push(nextId);
    });

    if (nextIds.length === 0) {
      return { error: "Offset failed for the current selection." };
    }

    setSelectedGeometryIds(nextIds);
    return { count: nextIds.length };
  };

  const resolveNurbsConversionPayload = (
    metadata?: Record<string, unknown> | null
  ): NurbsConversionPayload | null => {
    if (!metadata || typeof metadata !== "object") return null;
    const payload = (metadata as { nurbsConversion?: unknown }).nurbsConversion;
    if (!payload || typeof payload !== "object") return null;
    const sourceType = (payload as { sourceType?: unknown }).sourceType;
    if (
      sourceType === "polyline" ||
      sourceType === "surface" ||
      sourceType === "nurbsCurve" ||
      sourceType === "nurbsSurface"
    ) {
      return payload as NurbsConversionPayload;
    }
    return null;
  };

  const stripNurbsConversionMetadata = (metadata?: Record<string, unknown>) => {
    if (!metadata) return undefined;
    if (typeof metadata !== "object") return metadata;
    const { nurbsConversion, ...rest } = metadata as Record<string, unknown>;
    return Object.keys(rest).length > 0 ? rest : undefined;
  };

  const resolveBrepConversionPayload = (
    metadata?: Record<string, unknown> | null
  ): BRepConversionPayload | null => {
    if (!metadata || typeof metadata !== "object") return null;
    const payload = (metadata as { brepConversion?: unknown }).brepConversion;
    if (!payload || typeof payload !== "object") return null;
    const brep = (payload as { brep?: unknown }).brep;
    if (!brep || typeof brep !== "object") return null;
    return payload as BRepConversionPayload;
  };

  const stripBrepConversionMetadata = (metadata?: Record<string, unknown>) => {
    if (!metadata) return undefined;
    if (typeof metadata !== "object") return metadata;
    const { brepConversion, ...rest } = metadata as Record<string, unknown>;
    return Object.keys(rest).length > 0 ? rest : undefined;
  };

  const normalizeClosedLoop = (points: Vec3[]) => {
    if (points.length < 2) return points;
    const first = points[0];
    const last = points[points.length - 1];
    const dx = first.x - last.x;
    const dy = first.y - last.y;
    const dz = first.z - last.z;
    if (Math.hypot(dx, dy, dz) < 1e-6) {
      return points.slice(0, -1);
    }
    return points;
  };

  const collectCurveSamples = (item: Geometry) => {
    if (item.type === "polyline") {
      const points = item.vertexIds
        .map((vertexId) => vertexMap.get(vertexId)?.position)
        .filter((point): point is Vec3 => Boolean(point));
      return points.length >= 2
        ? { points: normalizeClosedLoop(points), closed: item.closed }
        : null;
    }
    if (item.type === "nurbsCurve") {
      const tessellated = tessellateCurveAdaptive(item.nurbs);
      const points =
        tessellated.points.length > 0
          ? tessellated.points
          : item.nurbs.controlPoints;
      return points.length >= 2
        ? { points: normalizeClosedLoop(points), closed: Boolean(item.closed) }
        : null;
    }
    return null;
  };

  const convertSelectionToMesh = () => {
    if (selectionMode !== "object") {
      return { error: "Switch the selection filter to Object to convert geometry." };
    }

    const directionFallback = { x: 0, y: 1, z: 0 };
    const direction = normalize(cPlane.normal);
    const resolvedDirection =
      Math.hypot(direction.x, direction.y, direction.z) > 1e-6
        ? direction
        : directionFallback;
    const distance =
      Number.isFinite(gridSettings.spacing) && gridSettings.spacing > 0
        ? gridSettings.spacing
        : 0.1;

    const replacements: Geometry[] = [];
    const conversionIds = new Set<string>();
    const conversionPayloads = new Map<string, NurbsConversionPayload>();

    selectedGeometryIds.forEach((id) => {
      const item = geometryMap.get(id);
      if (!item) return;
      if (item.type === "polyline" && item.nurbs) {
        const controlPositions: Record<string, Vec3> = {};
        item.vertexIds.forEach((vertexId) => {
          const vertex = vertexMap.get(vertexId);
          if (vertex) {
            controlPositions[vertexId] = vertex.position;
          }
        });
        const tessellated = tessellateCurveAdaptive(item.nurbs);
        const points = tessellated.points;
        if (points.length < 2) return;
        const mesh = generateExtrudeMesh(
          [{ points, closed: item.closed }],
          { direction: resolvedDirection, distance, capped: item.closed }
        );
        const payload: NurbsConversionPayload = {
          sourceType: "polyline",
          vertexIds: [...item.vertexIds],
          vertexPositions: controlPositions,
          closed: item.closed,
          degree: item.degree,
          nurbs: cloneValue(item.nurbs),
        };
        const metadata = {
          ...(item.metadata ?? {}),
          nurbsConversion: payload,
        };
        replacements.push({
          id: item.id,
          type: "mesh",
          mesh,
          layerId: item.layerId,
          area_m2: computeMeshArea(mesh.positions, mesh.indices),
          thickness_m: item.thickness_m,
          sourceNodeId: item.sourceNodeId,
          metadata,
        });
        conversionIds.add(item.id);
        conversionPayloads.set(item.id, payload);
      }
      if (item.type === "surface" && item.nurbs) {
        const surfacePositions: Record<string, Vec3> = {};
        item.loops.forEach((loop) => {
          loop.forEach((vertexId) => {
            const vertex = vertexMap.get(vertexId);
            if (vertex) {
              surfacePositions[vertexId] = vertex.position;
            }
          });
        });
        const tessellated = tessellateSurfaceAdaptive(item.nurbs);
        const mesh = {
          positions: Array.from(tessellated.positions),
          normals: Array.from(tessellated.normals),
          uvs: Array.from(tessellated.uvs),
          indices: Array.from(tessellated.indices),
        };
        const payload: NurbsConversionPayload = {
          sourceType: "surface",
          loops: item.loops.map((loop) => [...loop]),
          vertexPositions: surfacePositions,
          nurbs: cloneValue(item.nurbs),
          plane: item.plane ? cloneValue(item.plane) : undefined,
        };
        const metadata = {
          ...(item.metadata ?? {}),
          nurbsConversion: payload,
        };
        replacements.push({
          id: item.id,
          type: "mesh",
          mesh,
          layerId: item.layerId,
          area_m2: computeMeshArea(mesh.positions, mesh.indices),
          thickness_m: item.thickness_m,
          sourceNodeId: item.sourceNodeId,
          metadata,
        });
        conversionIds.add(item.id);
        conversionPayloads.set(item.id, payload);
      }
      if (item.type === "nurbsCurve") {
        const tessellated = tessellateCurveAdaptive(item.nurbs);
        const points = tessellated.points;
        if (points.length < 2) return;
        const closed = Boolean(item.closed);
        const mesh = generateExtrudeMesh(
          [{ points, closed }],
          { direction: resolvedDirection, distance, capped: closed }
        );
        const payload: NurbsConversionPayload = {
          sourceType: "nurbsCurve",
          closed,
          nurbs: cloneValue(item.nurbs),
        };
        const metadata = {
          ...(item.metadata ?? {}),
          nurbsConversion: payload,
        };
        replacements.push({
          id: item.id,
          type: "mesh",
          mesh,
          layerId: item.layerId,
          area_m2: computeMeshArea(mesh.positions, mesh.indices),
          thickness_m: item.thickness_m,
          sourceNodeId: item.sourceNodeId,
          metadata,
        });
        conversionIds.add(item.id);
        conversionPayloads.set(item.id, payload);
      }
      if (item.type === "nurbsSurface") {
        const tessellated = tessellateSurfaceAdaptive(item.nurbs);
        const mesh = {
          positions: Array.from(tessellated.positions),
          normals: Array.from(tessellated.normals),
          uvs: Array.from(tessellated.uvs),
          indices: Array.from(tessellated.indices),
        };
        const payload: NurbsConversionPayload = {
          sourceType: "nurbsSurface",
          nurbs: cloneValue(item.nurbs),
        };
        const metadata = {
          ...(item.metadata ?? {}),
          nurbsConversion: payload,
        };
        replacements.push({
          id: item.id,
          type: "mesh",
          mesh,
          layerId: item.layerId,
          area_m2: computeMeshArea(mesh.positions, mesh.indices),
          thickness_m: item.thickness_m,
          sourceNodeId: item.sourceNodeId,
          metadata,
        });
        conversionIds.add(item.id);
        conversionPayloads.set(item.id, payload);
      }
    });

    if (replacements.length === 0) {
      return { error: "Select NURBS curves or surfaces to convert." };
    }

    const protectedVertexIds = new Set<string>();
    geometry.forEach((item) => {
      if (conversionIds.has(item.id)) return;
      const deps = collectGeometryDependencies([item.id]);
      deps.forEach((depId) => {
        if (geometryMap.get(depId)?.type === "vertex") {
          protectedVertexIds.add(depId);
        }
      });
    });

    const verticesToDelete = new Set<string>();
    conversionPayloads.forEach((payload) => {
      if (payload.sourceType !== "polyline" && payload.sourceType !== "surface") {
        return;
      }
      const vertexIds =
        payload.sourceType === "polyline" ? payload.vertexIds : payload.loops.flat();
      vertexIds.forEach((vertexId) => {
        if (!protectedVertexIds.has(vertexId)) {
          verticesToDelete.add(vertexId);
        }
      });
    });

    replaceGeometryBatch(replacements, { recordHistory: true });
    if (verticesToDelete.size > 0) {
      deleteGeometry(Array.from(verticesToDelete), { recordHistory: false });
    }
    setSelectedGeometryIds(Array.from(conversionIds));
    return { count: replacements.length };
  };

  const restoreSelectionToNurbs = () => {
    if (selectionMode !== "object") {
      return { error: "Switch the selection filter to Object to restore NURBS." };
    }

    const replacements: Geometry[] = [];
    const vertexItems: Geometry[] = [];
    const vertexUpdates: Array<{ id: string; data: Partial<Geometry> }> = [];
    const pendingVertexIds = new Set<string>();

    selectedGeometryIds.forEach((id) => {
      const item = geometryMap.get(id);
      if (!item || item.type !== "mesh") return;
      const payload = resolveNurbsConversionPayload(item.metadata);
      if (!payload) return;
      const metadata = stripNurbsConversionMetadata(item.metadata);

      if (payload.sourceType === "polyline") {
        payload.vertexIds.forEach((vertexId) => {
          if (pendingVertexIds.has(vertexId)) return;
          const position = payload.vertexPositions[vertexId];
          if (!position) return;
          const existing = geometryMap.get(vertexId);
          if (!existing) {
            pendingVertexIds.add(vertexId);
            vertexItems.push({
              id: vertexId,
              type: "vertex",
              position,
              layerId: item.layerId,
              area_m2: 1,
              thickness_m: 0.1,
            });
          } else if (existing.type === "vertex") {
            pendingVertexIds.add(vertexId);
            vertexUpdates.push({ id: vertexId, data: { position } });
          }
        });
        replacements.push({
          id: item.id,
          type: "polyline",
          vertexIds: [...payload.vertexIds],
          closed: payload.closed,
          degree: payload.degree,
          nurbs: payload.nurbs ? cloneValue(payload.nurbs) : undefined,
          layerId: item.layerId,
          area_m2: item.area_m2,
          thickness_m: item.thickness_m,
          sourceNodeId: item.sourceNodeId,
          metadata,
        });
        return;
      }

      if (payload.sourceType === "surface") {
        payload.loops.flat().forEach((vertexId) => {
          if (pendingVertexIds.has(vertexId)) return;
          const position = payload.vertexPositions[vertexId];
          if (!position) return;
          const existing = geometryMap.get(vertexId);
          if (!existing) {
            pendingVertexIds.add(vertexId);
            vertexItems.push({
              id: vertexId,
              type: "vertex",
              position,
              layerId: item.layerId,
              area_m2: 1,
              thickness_m: 0.1,
            });
          } else if (existing.type === "vertex") {
            pendingVertexIds.add(vertexId);
            vertexUpdates.push({ id: vertexId, data: { position } });
          }
        });
        const mesh = payload.nurbs
          ? (() => {
              const tessellated = tessellateSurfaceAdaptive(payload.nurbs);
              return {
                positions: Array.from(tessellated.positions),
                normals: Array.from(tessellated.normals),
                uvs: Array.from(tessellated.uvs),
                indices: Array.from(tessellated.indices),
              };
            })()
          : item.mesh;
        replacements.push({
          id: item.id,
          type: "surface",
          mesh,
          nurbs: payload.nurbs ? cloneValue(payload.nurbs) : undefined,
          loops: payload.loops.map((loop) => [...loop]),
          plane: payload.plane ? cloneValue(payload.plane) : undefined,
          layerId: item.layerId,
          area_m2: computeMeshArea(mesh.positions, mesh.indices),
          thickness_m: item.thickness_m,
          sourceNodeId: item.sourceNodeId,
          metadata,
        });
      }

      if (payload.sourceType === "nurbsCurve") {
        if (!payload.nurbs) {
          return;
        }
        replacements.push({
          id: item.id,
          type: "nurbsCurve",
          nurbs: cloneValue(payload.nurbs),
          closed: payload.closed,
          layerId: item.layerId,
          area_m2: item.area_m2,
          thickness_m: item.thickness_m,
          sourceNodeId: item.sourceNodeId,
          metadata,
        });
      }

      if (payload.sourceType === "nurbsSurface") {
        if (!payload.nurbs) {
          return;
        }
        const mesh = payload.nurbs
          ? (() => {
              const tessellated = tessellateSurfaceAdaptive(payload.nurbs);
              return {
                positions: Array.from(tessellated.positions),
                normals: Array.from(tessellated.normals),
                uvs: Array.from(tessellated.uvs),
                indices: Array.from(tessellated.indices),
              };
            })()
          : item.mesh;
        replacements.push({
          id: item.id,
          type: "nurbsSurface",
          mesh,
          nurbs: cloneValue(payload.nurbs),
          layerId: item.layerId,
          area_m2: mesh ? computeMeshArea(mesh.positions, mesh.indices) : item.area_m2,
          thickness_m: item.thickness_m,
          sourceNodeId: item.sourceNodeId,
          metadata,
        });
      }
    });

    if (replacements.length === 0) {
      return { error: "Select meshes created from NURBS to restore." };
    }

    replaceGeometryBatch(replacements, { recordHistory: true });
    if (vertexItems.length > 0) {
      addGeometryItems(vertexItems, {
        recordHistory: false,
        selectIds: replacements.map((item) => item.id),
      });
    }
    if (vertexUpdates.length > 0) {
      updateGeometryBatch(vertexUpdates, { recordHistory: false });
    }
    setSelectedGeometryIds(replacements.map((item) => item.id));
    return { count: replacements.length };
  };

  const resolveMeshFromGeometry = (item: Geometry): RenderMesh | null => {
    if (item.type === "nurbsSurface") {
      if (item.mesh && item.mesh.positions.length > 0) {
        return item.mesh;
      }
      const tessellated = tessellateSurfaceAdaptive(item.nurbs);
      return {
        positions: Array.from(tessellated.positions),
        normals: Array.from(tessellated.normals),
        uvs: Array.from(tessellated.uvs),
        indices: Array.from(tessellated.indices),
      };
    }
    if (item.type === "brep") {
      if (item.mesh && item.mesh.positions.length > 0) {
        return item.mesh;
      }
      return tessellateBRepToMesh(item.brep);
    }
    if ("mesh" in item && item.mesh) {
      if (item.type === "surface" && item.nurbs) {
        const tessellated = tessellateSurfaceAdaptive(item.nurbs);
        return {
          positions: Array.from(tessellated.positions),
          normals: Array.from(tessellated.normals),
          uvs: Array.from(tessellated.uvs),
          indices: Array.from(tessellated.indices),
        };
      }
      return item.mesh;
    }
    return null;
  };

  const convertSelectionToMeshFromBrep = () => {
    if (selectionMode !== "object") {
      return { error: "Switch the selection filter to Object to convert B-Reps." };
    }

    const replacements: Geometry[] = [];
    const conversionIds = new Set<string>();

    selectedGeometryIds.forEach((id) => {
      const item = geometryMap.get(id);
      if (!item || item.type !== "brep") return;
      const mesh = resolveMeshFromGeometry(item);
      if (!mesh) return;
      const payload: BRepConversionPayload = {
        sourceType: "brep",
        brep: cloneValue(item.brep),
      };
      const metadata = {
        ...(item.metadata ?? {}),
        brepConversion: payload,
      };
      replacements.push({
        id: item.id,
        type: "mesh",
        mesh,
        layerId: item.layerId,
        area_m2: computeMeshArea(mesh.positions, mesh.indices),
        thickness_m: item.thickness_m,
        sourceNodeId: item.sourceNodeId,
        metadata,
      });
      conversionIds.add(item.id);
    });

    if (replacements.length === 0) {
      return { error: "Select one or more B-Rep solids to convert." };
    }

    replaceGeometryBatch(replacements, { recordHistory: true });
    setSelectedGeometryIds(Array.from(conversionIds));
    return { count: replacements.length };
  };

  const convertSelectionToBrep = () => {
    if (selectionMode !== "object") {
      return { error: "Switch the selection filter to Object to convert meshes." };
    }

    const replacements: Geometry[] = [];

    selectedGeometryIds.forEach((id) => {
      const item = geometryMap.get(id);
      if (!item || item.type === "brep") return;
      const mesh = resolveMeshFromGeometry(item);
      if (!mesh) return;
      const conversionPayload = resolveBrepConversionPayload(item.metadata);
      const brep = conversionPayload?.brep ?? brepFromMesh(mesh);
      const metadata = stripBrepConversionMetadata(item.metadata);
      replacements.push({
        id: item.id,
        type: "brep",
        brep: cloneValue(brep),
        mesh,
        layerId: item.layerId,
        area_m2: computeMeshArea(mesh.positions, mesh.indices),
        thickness_m: item.thickness_m,
        sourceNodeId: item.sourceNodeId,
        metadata,
      });
    });

    if (replacements.length === 0) {
      return { error: "Select one or more meshes to convert to B-Rep." };
    }

    replaceGeometryBatch(replacements, { recordHistory: true });
    setSelectedGeometryIds(replacements.map((item) => item.id));
    return { count: replacements.length };
  };

  const interpolateSelectedPolylines = () => {
    if (selectionMode !== "object") {
      return { error: "Switch the selection filter to Object to interpolate." };
    }

    const replacements: Geometry[] = [];
    const conversionIds = new Set<string>();
    const polylineVertexIds = new Map<string, string[]>();

    selectedGeometryIds.forEach((id) => {
      const item = geometryMap.get(id);
      if (!item || item.type !== "polyline") return;
      const points = item.vertexIds
        .map((vertexId) => vertexMap.get(vertexId)?.position)
        .filter((point): point is Vec3 => Boolean(point));
      if (points.length < 2) return;
      const degree = Math.min(3, Math.max(1, item.degree)) as 1 | 2 | 3;
      const nurbs = interpolateNurbsCurve(points, degree, {
        parameterization: "chord",
      });
      replacements.push({
        id: item.id,
        type: "nurbsCurve",
        nurbs,
        closed: item.closed,
        layerId: item.layerId,
        area_m2: item.area_m2,
        thickness_m: item.thickness_m,
        sourceNodeId: item.sourceNodeId,
        metadata: item.metadata,
      });
      conversionIds.add(item.id);
      polylineVertexIds.set(item.id, [...item.vertexIds]);
    });

    if (replacements.length === 0) {
      return { error: "Select one or more polylines to interpolate." };
    }

    const protectedVertexIds = new Set<string>();
    geometry.forEach((item) => {
      if (conversionIds.has(item.id)) return;
      const deps = collectGeometryDependencies([item.id]);
      deps.forEach((depId) => {
        if (geometryMap.get(depId)?.type === "vertex") {
          protectedVertexIds.add(depId);
        }
      });
    });

    const verticesToDelete = new Set<string>();
    polylineVertexIds.forEach((vertexIds) => {
      vertexIds.forEach((vertexId) => {
        if (!protectedVertexIds.has(vertexId)) {
          verticesToDelete.add(vertexId);
        }
      });
    });

    replaceGeometryBatch(replacements, { recordHistory: true });
    if (verticesToDelete.size > 0) {
      deleteGeometry(Array.from(verticesToDelete), { recordHistory: false });
    }
    setSelectedGeometryIds(Array.from(conversionIds));
    return { count: replacements.length };
  };

  const createSurfaceFromSelection = () => {
    if (selectionMode !== "object") {
      return { error: "Switch the selection filter to Object to create a surface." };
    }

    const selectedCurves = selectedGeometryIds
      .map((id) => geometryMap.get(id))
      .filter((item): item is Geometry => Boolean(item))
      .map((item) => ({ item, sample: collectCurveSamples(item) }))
      .filter((entry) => Boolean(entry.sample));

    const closedLoops = selectedCurves
      .filter((entry) => entry.sample?.closed)
      .map((entry) => entry.sample as { points: Vec3[]; closed: boolean });

    if (closedLoops.length === 0) {
      return { error: "Select at least one closed curve to create a surface." };
    }

    const loopPoints = closedLoops
      .map((entry) => normalizeClosedLoop(entry.points))
      .filter((points) => points.length >= 3);

    if (loopPoints.length === 0) {
      return { error: "Surface boundaries must have at least 3 points." };
    }

    const layerId =
      selectedCurves[0]?.item.layerId ?? geometry[0]?.layerId ?? "layer-default";
    const loops: string[][] = [];
    const vertexItems: Geometry[] = [];
    loopPoints.forEach((loop) => {
      const vertexIds = loop.map(() => createGeometryId("vertex"));
      loops.push(vertexIds);
      loop.forEach((point, index) => {
        vertexItems.push({
          id: vertexIds[index],
          type: "vertex",
          position: point,
          layerId,
          area_m2: 1,
          thickness_m: 0.1,
        });
      });
    });

    const { mesh, plane } = generateSurfaceMesh(loopPoints);
    if (mesh.positions.length < 3) {
      return { error: "Surface generation failed for the selected curves." };
    }

    const surfaceId = createGeometryId("surface");
    const surfaceItem: Geometry = {
      id: surfaceId,
      type: "surface",
      mesh,
      loops,
      plane,
      layerId,
      metadata: {
        sourceCurveIds: selectedCurves.map((entry) => entry.item.id),
      },
    };

    addGeometryItems([...vertexItems, surfaceItem], {
      selectIds: [surfaceId],
      recordHistory: true,
    });
    return { id: surfaceId };
  };

  const loftSelection = (input: string) => {
    if (selectionMode !== "object") {
      return { error: "Switch the selection filter to Object to loft curves." };
    }

    const sections = selectedGeometryIds
      .map((id) => geometryMap.get(id))
      .filter((item): item is Geometry => Boolean(item))
      .map((item) => ({ item, sample: collectCurveSamples(item) }))
      .filter((entry) => Boolean(entry.sample));

    if (sections.length < 2) {
      return { error: "Select at least two curves to loft." };
    }

    const points = sections
      .map((entry) => entry.sample as { points: Vec3[]; closed: boolean })
      .map((entry) => entry.points)
      .filter((entry) => entry.length >= 2);

    if (points.length < 2) {
      return { error: "Selected curves need at least two points to loft." };
    }

    const degreeMatch = input.match(/degree\s*=?\s*(\d+)/i);
    const samplesMatch = input.match(/samples?\s*=?\s*(\d+)/i);
    const degreeRaw = degreeMatch ? Number(degreeMatch[1]) : 3;
    const degree = Math.min(3, Math.max(1, Math.round(degreeRaw))) as 1 | 2 | 3;
    const samplesRaw = samplesMatch ? Number(samplesMatch[1]) : 24;
    const samples = Math.max(8, Math.round(samplesRaw));
    const sectionClosed = sections.every((entry) => entry.sample?.closed);
    const closed = /\bclosed\b/i.test(input);
    const mesh = generateLoftMesh(points, {
      degree,
      sectionClosed,
      closed,
      samples,
    });

    if (mesh.positions.length < 3) {
      return { error: "Loft failed for the selected curves." };
    }

    const sectionIds = sections.map((entry) => entry.item.id);
    const loftId = addGeometryLoft(mesh, sectionIds, {
      degree,
      closed,
      sectionClosed,
      samples,
      layerId: sections[0]?.item.layerId,
      metadata: { sectionClosed, samples },
    });
    return { id: loftId };
  };

  const extrudeSelection = (input: string) => {
    if (selectionMode !== "object") {
      return { error: "Switch the selection filter to Object to extrude." };
    }

    const profiles = selectedGeometryIds
      .map((id) => geometryMap.get(id))
      .filter((item): item is Geometry => Boolean(item))
      .map((item) => ({ item, sample: collectCurveSamples(item) }))
      .filter((entry) => Boolean(entry.sample));

    if (profiles.length === 0) {
      return { error: "Select one or more curves to extrude." };
    }

    const lower = input.toLowerCase();
    const spacingFallback =
      Number.isFinite(gridSettings.spacing) && gridSettings.spacing !== 0
        ? gridSettings.spacing
        : 1;
    const distance = parseFirstNumber(input) ?? spacingFallback;
    const axisMatch = input.match(/axis\s*=?\s*([xyz])/i) ?? input.match(/\b([xyz])\b/i);
    const axisKey = axisMatch ? (axisMatch[1].toLowerCase() as "x" | "y" | "z") : null;
    const baseDirection = normalize(cPlane.normal);
    const direction =
      axisKey != null
        ? resolveAxisVector(axisKey)
        : Math.hypot(baseDirection.x, baseDirection.y, baseDirection.z) > 1e-6
          ? baseDirection
          : { x: 0, y: 1, z: 0 };
    const capped = lower.includes("nocap") ? false : !lower.includes("open");

    const createdIds: string[] = [];
    recordModelerHistory();

    profiles.forEach((entry) => {
      const sample = entry.sample as { points: Vec3[]; closed: boolean };
      if (sample.points.length < 2) return;
      const profileClosed = sample.closed;
      const mesh = generateExtrudeMesh(
        [{ points: sample.points, closed: profileClosed }],
        {
          direction,
          distance,
          capped: capped && profileClosed,
        }
      );
      if (mesh.positions.length < 3) return;
      const extrudeId = addGeometryExtrude(mesh, [entry.item.id], {
        distance,
        direction,
        capped: capped && profileClosed,
        layerId: entry.item.layerId,
        recordHistory: false,
      });
      createdIds.push(extrudeId);
    });

    if (createdIds.length === 0) {
      return { error: "Extrude failed for the selected curves." };
    }

    setSelectedGeometryIds(createdIds);
    return { count: createdIds.length };
  };

  const booleanSelection = () => {
    if (selectionMode !== "object") {
      return { error: "Switch the selection filter to Object to boolean." };
    }

    const sources = selectedGeometryIds
      .map((id) => ({ id, item: geometryMap.get(id) }))
      .filter((entry) => Boolean(entry.item))
      .map((entry) => ({
        id: entry.id,
        mesh: entry.item ? resolveMeshFromGeometry(entry.item) : null,
      }))
      .filter((entry) => Boolean(entry.mesh)) as Array<{ id: string; mesh: RenderMesh }>;

    const meshes = sources.map((entry) => entry.mesh);

    if (meshes.length < 2) {
      return { error: "Select at least two solids to boolean." };
    }

    const merged = mergeRenderMeshes(meshes);
    recordModelerHistory();
    const mergedId = addGeometryMesh(merged, {
      recordHistory: false,
      metadata: { booleanSourceIds: sources.map((entry) => entry.id) },
    });
    deleteGeometry(
      sources.map((entry) => entry.id),
      { recordHistory: false }
    );
    setSelectedGeometryIds([mergedId]);
    return { count: 1 };
  };

  const ensureMeshIndices = (mesh: RenderMesh) =>
    mesh.indices.length > 0
      ? mesh.indices
      : Array.from({ length: Math.floor(mesh.positions.length / 3) }, (_, i) => i);

  const flipMesh = (mesh: RenderMesh): RenderMesh => {
    const indices = ensureMeshIndices(mesh);
    const flippedIndices: number[] = [];
    for (let i = 0; i + 2 < indices.length; i += 3) {
      flippedIndices.push(indices[i], indices[i + 2], indices[i + 1]);
    }
    const normals =
      mesh.normals.length === mesh.positions.length
        ? mesh.normals.map((value) => -value)
        : computeVertexNormals(mesh.positions, flippedIndices);
    return { ...mesh, indices: flippedIndices, normals };
  };

  const mergeSelectedMeshes = () => {
    if (selectionMode !== "object") {
      return { error: "Switch the selection filter to Object to merge meshes." };
    }
    const meshes = selectedGeometryIds
      .map((id) => geometryMap.get(id))
      .filter(isMeshGeometry);
    if (meshes.length < 2) {
      return { error: "Select at least two meshes to merge." };
    }
    const merged = mergeRenderMeshes(meshes.map((item) => item.mesh));
    const lastMesh = meshes[meshes.length - 1];
    const metadata = stripNurbsConversionMetadata(lastMesh?.metadata);
    recordModelerHistory();
    const mergedId = addGeometryMesh(merged, {
      recordHistory: false,
      layerId: lastMesh?.layerId,
      thickness_m: lastMesh?.thickness_m,
      metadata,
    });
    deleteGeometry(
      meshes.map((item) => item.id),
      { recordHistory: false }
    );
    setSelectedGeometryIds([mergedId]);
    return { count: 1 };
  };

  const flipSelectedMeshes = () => {
    if (selectionMode !== "object") {
      return { error: "Switch the selection filter to Object to flip meshes." };
    }
    const meshes = selectedGeometryIds
      .map((id) => geometryMap.get(id))
      .filter(isMeshGeometry);
    if (meshes.length === 0) {
      return { error: "Select one or more meshes to flip." };
    }
    const updates = meshes.map((item) => {
      const nextMesh = flipMesh(item.mesh);
      return {
        id: item.id,
        data: {
          mesh: nextMesh,
          area_m2: computeMeshArea(nextMesh.positions, nextMesh.indices),
        },
      };
    });
    updateGeometryBatch(updates, { recordHistory: true });
    return { count: updates.length };
  };

  const collectBoundaryEdges = (indices: number[]) => {
    const edgeMap = new Map<string, { a: number; b: number; count: number }>();
    for (let i = 0; i + 2 < indices.length; i += 3) {
      const tri = [indices[i], indices[i + 1], indices[i + 2]];
      for (let e = 0; e < 3; e += 1) {
        const a = tri[e];
        const b = tri[(e + 1) % 3];
        const min = Math.min(a, b);
        const max = Math.max(a, b);
        const key = `${min}-${max}`;
        const existing = edgeMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          edgeMap.set(key, { a, b, count: 1 });
        }
      }
    }
    return Array.from(edgeMap.values()).filter((edge) => edge.count === 1);
  };

  const buildThickenedMesh = (
    basePositions: number[],
    baseIndices: number[],
    baseUvs: number[],
    thickness: number,
    sides: string
  ): RenderMesh => {
    if (!Number.isFinite(thickness) || thickness === 0) {
      const indices =
        baseIndices.length > 0
          ? baseIndices
          : Array.from({ length: basePositions.length / 3 }, (_, i) => i);
      const normals = computeVertexNormals(basePositions, indices);
      return {
        positions: basePositions.slice(),
        normals,
        uvs: baseUvs.slice(),
        indices,
      };
    }

    const vertexCount = Math.floor(basePositions.length / 3);
    const indices =
      baseIndices.length > 0
        ? baseIndices
        : Array.from({ length: vertexCount }, (_, i) => i);
    const normals = computeVertexNormals(basePositions, indices);

    const mode = sides.toLowerCase();
    const offsetOuter = mode === "inward" ? 0 : mode === "both" ? thickness * 0.5 : thickness;
    const offsetInner = mode === "outward" ? 0 : mode === "both" ? -thickness * 0.5 : -thickness;

    const positions: number[] = [];
    const outerPositions: number[] = [];
    const innerPositions: number[] = [];
    for (let i = 0; i < vertexCount; i += 1) {
      const x = basePositions[i * 3] ?? 0;
      const y = basePositions[i * 3 + 1] ?? 0;
      const z = basePositions[i * 3 + 2] ?? 0;
      const nx = normals[i * 3] ?? 0;
      const ny = normals[i * 3 + 1] ?? 0;
      const nz = normals[i * 3 + 2] ?? 0;
      outerPositions.push(x + nx * offsetOuter, y + ny * offsetOuter, z + nz * offsetOuter);
      innerPositions.push(x + nx * offsetInner, y + ny * offsetInner, z + nz * offsetInner);
    }
    positions.push(...outerPositions, ...innerPositions);

    const uvCount = Math.floor(baseUvs.length / 2);
    const uvs: number[] = [];
    if (uvCount === vertexCount) {
      uvs.push(...baseUvs, ...baseUvs);
    } else if (vertexCount > 0) {
      uvs.push(...new Array(vertexCount * 2).fill(0), ...new Array(vertexCount * 2).fill(0));
    }

    const combinedIndices: number[] = [];
    combinedIndices.push(...indices);
    for (let i = 0; i + 2 < indices.length; i += 3) {
      const a = indices[i];
      const b = indices[i + 1];
      const c = indices[i + 2];
      combinedIndices.push(a + vertexCount, c + vertexCount, b + vertexCount);
    }

    const boundaryEdges = collectBoundaryEdges(indices);
    boundaryEdges.forEach((edge) => {
      const a = edge.a;
      const b = edge.b;
      const aInner = a + vertexCount;
      const bInner = b + vertexCount;
      combinedIndices.push(a, b, bInner);
      combinedIndices.push(a, bInner, aInner);
    });

    const finalNormals = computeVertexNormals(positions, combinedIndices);
    return {
      positions,
      normals: finalNormals,
      uvs,
      indices: combinedIndices,
    };
  };

  const thickenSelectedMeshes = (thickness: number, sides: string) => {
    if (selectionMode !== "object") {
      return { error: "Switch the selection filter to Object to thicken meshes." };
    }
    if (!Number.isFinite(thickness) || thickness <= 0) {
      return { error: "Provide a positive thickness for mesh thicken." };
    }
    const meshes = selectedGeometryIds
      .map((id) => geometryMap.get(id))
      .filter(isMeshGeometry);
    if (meshes.length === 0) {
      return { error: "Select one or more meshes to thicken." };
    }
    const updates = meshes.map((item) => {
      const indices = ensureMeshIndices(item.mesh);
      const nextMesh = buildThickenedMesh(
        item.mesh.positions,
        indices,
        item.mesh.uvs ?? [],
        thickness,
        sides
      );
      return {
        id: item.id,
        data: {
          mesh: nextMesh,
          area_m2: computeMeshArea(nextMesh.positions, nextMesh.indices),
        },
      };
    });
    updateGeometryBatch(updates, { recordHistory: true });
    return { count: updates.length };
  };

  const selectionPoints = useMemo(() => {
    const points: Vec3[] = [];
    selectedGeometryIds.forEach((id) => {
      const item = geometryMap.get(id);
      if (!item) return;
      points.push(...collectGeometryPoints(item));
    });
    return points;
  }, [collectGeometryPoints, geometryMap, selectedGeometryIds]);

  const canAlignSelectionPlane = selectionPoints.length >= 3;

  useEffect(() => {
    if (snapSettings.gridStep === gridSettings.spacing) return;
    setSnapSettings({ gridStep: gridSettings.spacing });
  }, [gridSettings.spacing, snapSettings.gridStep, setSnapSettings]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (activeCommand) {
        setActiveCommand(null);
      }
      if (commandError) {
        setCommandError("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCommand, commandError]);

  useEffect(() => {
    if (activeCommand?.id !== "loft") return;
    setCommandError(loftSelectionState.ready ? "" : loftSelectionState.message);
  }, [activeCommand?.id, loftSelectionState.ready, loftSelectionState.message]);

  const activateCommand = (command: CommandDefinition) => {
    setActiveCommand(command);
    setCommandError("");
  };

  const createGeometryId = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const translateControlPoints = (points: Vec3[], delta: Vec3) =>
    points.map((point) => add(point, delta));

  const translateControlPointGrid = (grid: Vec3[][], delta: Vec3) =>
    grid.map((row) => row.map((point) => add(point, delta)));

  const translateBRepCurve = (curve: BRepCurve, delta: Vec3): BRepCurve => {
    if (curve.kind === "line") {
      return {
        ...curve,
        start: add(curve.start, delta),
        end: add(curve.end, delta),
      };
    }
    if (curve.kind === "nurbs") {
      return {
        ...curve,
        curve: {
          ...curve.curve,
          controlPoints: translateControlPoints(curve.curve.controlPoints, delta),
        },
      };
    }
    return curve;
  };

  const translateBRepSurface = (surface: BRepSurface, delta: Vec3): BRepSurface => {
    if (surface.kind === "plane") {
      return {
        ...surface,
        plane: {
          ...surface.plane,
          origin: add(surface.plane.origin, delta),
        },
      };
    }
    if (surface.kind === "nurbs") {
      return {
        ...surface,
        surface: {
          ...surface.surface,
          controlPoints: translateControlPointGrid(surface.surface.controlPoints, delta),
        },
      };
    }
    return surface;
  };

  const translateBRepData = (brep: BRepData, delta: Vec3): BRepData => ({
    ...brep,
    vertices: brep.vertices.map((vertex) => ({
      ...vertex,
      position: add(vertex.position, delta),
    })),
    edges: brep.edges.map((edge) => ({
      ...edge,
      curve: translateBRepCurve(edge.curve, delta),
    })),
    faces: brep.faces.map((face) => ({
      ...face,
      surface: translateBRepSurface(face.surface, delta),
    })),
  });

  const transformControlPoints = (
    points: Vec3[],
    transformPoint: (point: Vec3) => Vec3
  ) => points.map((point) => transformPoint(point));

  const transformControlPointGrid = (
    grid: Vec3[][],
    transformPoint: (point: Vec3) => Vec3
  ) => grid.map((row) => row.map((point) => transformPoint(point)));

  const transformBRepCurve = (
    curve: BRepCurve,
    transformPoint: (point: Vec3) => Vec3
  ): BRepCurve => {
    if (curve.kind === "line") {
      return {
        ...curve,
        start: transformPoint(curve.start),
        end: transformPoint(curve.end),
      };
    }
    if (curve.kind === "nurbs") {
      return {
        ...curve,
        curve: {
          ...curve.curve,
          controlPoints: transformControlPoints(curve.curve.controlPoints, transformPoint),
        },
      };
    }
    return curve;
  };

  const transformBRepSurface = (
    surface: BRepSurface,
    transformPoint: (point: Vec3) => Vec3,
    transformVector: (vector: Vec3) => Vec3
  ): BRepSurface => {
    if (surface.kind === "plane") {
      return {
        ...surface,
        plane: {
          ...surface.plane,
          origin: transformPoint(surface.plane.origin),
          xAxis: transformVector(surface.plane.xAxis),
          yAxis: transformVector(surface.plane.yAxis),
          normal: normalize(transformVector(surface.plane.normal)),
        },
      };
    }
    if (surface.kind === "nurbs") {
      return {
        ...surface,
        surface: {
          ...surface.surface,
          controlPoints: transformControlPointGrid(surface.surface.controlPoints, transformPoint),
        },
      };
    }
    return surface;
  };

  const transformBRepData = (
    brep: BRepData,
    transformPoint: (point: Vec3) => Vec3,
    transformVector: (vector: Vec3) => Vec3
  ): BRepData => ({
    ...brep,
    vertices: brep.vertices.map((vertex) => ({
      ...vertex,
      position: transformPoint(vertex.position),
    })),
    edges: brep.edges.map((edge) => ({
      ...edge,
      curve: transformBRepCurve(edge.curve, transformPoint),
    })),
    faces: brep.faces.map((face) => ({
      ...face,
      surface: transformBRepSurface(face.surface, transformPoint, transformVector),
    })),
  });

  const collectGeometryDependencies = (ids: string[]) => {
    const collected = new Set<string>();
    const stack = [...ids];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || collected.has(current)) continue;
      const item = geometryMap.get(current);
      if (!item) continue;
      collected.add(current);
      if (item.type === "polyline") {
        item.vertexIds.forEach((vertexId) => stack.push(vertexId));
      }
      if (item.type === "surface") {
        item.loops.forEach((loop) => loop.forEach((vertexId) => stack.push(vertexId)));
      }
      if (item.type === "loft") {
        item.sectionIds.forEach((sectionId) => stack.push(sectionId));
      }
      if (item.type === "extrude") {
        item.profileIds.forEach((profileId) => stack.push(profileId));
      }
    }
    return Array.from(collected);
  };

  const computeSelectionPivot = (ids: string[]): Vec3 => {
    const points: Vec3[] = [];
    ids.forEach((id) => {
      const item = geometryMap.get(id);
      if (!item) return;
      points.push(...collectGeometryPoints(item));
    });
    return points.length > 0 ? centroid(points) : { x: 0, y: 0, z: 0 };
  };

  const copySelection = () => {
    if (selectedGeometryIds.length === 0) return;
    const ids = collectGeometryDependencies(selectedGeometryIds);
    const payload = ids
      .map((id) => geometryMap.get(id))
      .filter(Boolean) as Geometry[];
    setClipboard({
      geometry: payload.map((item) => structuredClone(item)),
      layers: layers.map((layer) => structuredClone(layer)),
      assignments: assignments.map((assignment) => structuredClone(assignment)),
      selectedGeometryIds: [...selectedGeometryIds],
      pivot: computeSelectionPivot(selectedGeometryIds),
    });
  };

  const pasteSelection = (mode: "inplace" | "cursor" | "origin") => {
    if (!clipboard || clipboard.geometry.length === 0) return;
    const previousSelection = [...selectedGeometryIds];
    const idMap = new Map<string, string>();
    const cloned = clipboard.geometry.map((item) => {
      const prefix =
        item.type === "vertex"
          ? "vertex"
          : item.type === "polyline"
            ? "polyline"
            : item.type === "surface"
              ? "surface"
              : item.type === "loft"
                ? "loft"
                : "extrude";
      const nextId = createGeometryId(prefix);
      idMap.set(item.id, nextId);
      return { ...structuredClone(item), id: nextId };
    });

    const remapped = cloned.map((item) => {
      if (item.type === "polyline") {
        return {
          ...item,
          vertexIds: item.vertexIds.map((id) => idMap.get(id) ?? id),
        };
      }
      if (item.type === "surface") {
        return {
          ...item,
          loops: item.loops.map((loop) => loop.map((id) => idMap.get(id) ?? id)),
        };
      }
      if (item.type === "loft") {
        return {
          ...item,
          sectionIds: item.sectionIds.map((id) => idMap.get(id) ?? id),
        };
      }
      if (item.type === "extrude") {
        return {
          ...item,
          profileIds: item.profileIds.map((id) => idMap.get(id) ?? id),
        };
      }
      return item;
    });

    const pivotTarget =
      mode === "origin"
        ? { x: 0, y: 0, z: 0 }
        : mode === "cursor" && pivot.cursorPosition
          ? pivot.cursorPosition
          : mode === "cursor"
            ? cameraState.target
            : clipboard.pivot;
    const delta = sub(pivotTarget, clipboard.pivot);
    const translated = remapped.map((item) => {
      if (item.type === "vertex") {
        return {
          ...item,
          position: add(item.position, delta),
        };
      }
      if (item.type === "nurbsCurve") {
        return {
          ...item,
          nurbs: {
            ...item.nurbs,
            controlPoints: translateControlPoints(item.nurbs.controlPoints, delta),
          },
        };
      }
      if (item.type === "nurbsSurface") {
        const nextNurbs = {
          ...item.nurbs,
          controlPoints: translateControlPointGrid(item.nurbs.controlPoints, delta),
        };
        if (item.mesh) {
          const positions = item.mesh.positions.slice();
          for (let i = 0; i < positions.length; i += 3) {
            positions[i] += delta.x;
            positions[i + 1] += delta.y;
            positions[i + 2] += delta.z;
          }
          return {
            ...item,
            nurbs: nextNurbs,
            mesh: { ...item.mesh, positions },
          };
        }
        return { ...item, nurbs: nextNurbs };
      }
      if (item.type === "brep") {
        const nextBrep = translateBRepData(item.brep, delta);
        if (item.mesh) {
          const positions = item.mesh.positions.slice();
          for (let i = 0; i < positions.length; i += 3) {
            positions[i] += delta.x;
            positions[i + 1] += delta.y;
            positions[i + 2] += delta.z;
          }
          return {
            ...item,
            brep: nextBrep,
            mesh: { ...item.mesh, positions },
          };
        }
        return { ...item, brep: nextBrep };
      }
      if ("mesh" in item) {
        const positions = item.mesh.positions.slice();
        for (let i = 0; i < positions.length; i += 3) {
          positions[i] += delta.x;
          positions[i + 1] += delta.y;
          positions[i + 2] += delta.z;
        }
        return {
          ...item,
          mesh: { ...item.mesh, positions },
        };
      }
      return item;
    });

    addGeometryItems(translated, {
      selectIds: translated.map((item) => item.id),
      recordHistory: true,
    });
    setActiveCommand(COMMAND_DEFINITIONS.find((c) => c.id === "move") ?? null);
    dispatchCommandRequest(
      "move",
      `start ids=${translated.map((item) => item.id).join(",")} prev=${previousSelection.join(",")}`
    );
  };

  const duplicateSelection = () => {
    copySelection();
    pasteSelection("cursor");
  };

  type GeometryTransform = {
    point: (point: Vec3) => Vec3;
    vector?: (vector: Vec3) => Vec3;
  };

  const cloneGeometryWithTransform = (
    sourceItems: Geometry[],
    transform: GeometryTransform
  ) => {
    const idMap = new Map<string, string>();
    const cloned = sourceItems.map((item) => {
      const prefix = item.type === "mesh" ? "mesh" : item.type;
      const nextId = createGeometryId(prefix);
      idMap.set(item.id, nextId);
      return {
        ...structuredClone(item),
        id: nextId,
        sourceNodeId: undefined,
      } as Geometry;
    });

    const remapped = cloned.map((item) => {
      if (item.type === "polyline") {
        return {
          ...item,
          vertexIds: item.vertexIds.map((id) => idMap.get(id) ?? id),
        };
      }
      if (item.type === "surface") {
        return {
          ...item,
          loops: item.loops.map((loop) => loop.map((id) => idMap.get(id) ?? id)),
        };
      }
      if (item.type === "loft") {
        return {
          ...item,
          sectionIds: item.sectionIds.map((id) => idMap.get(id) ?? id),
        };
      }
      if (item.type === "extrude") {
        return {
          ...item,
          profileIds: item.profileIds.map((id) => idMap.get(id) ?? id),
        };
      }
      return item;
    });

    const vectorTransform = transform.vector ?? ((vector: Vec3) => vector);

    const transformed = remapped.map((item) => {
      if (item.type === "vertex") {
        return {
          ...item,
          position: transform.point(item.position),
        };
      }
      if (item.type === "nurbsCurve") {
        return {
          ...item,
          nurbs: {
            ...item.nurbs,
            controlPoints: transformControlPoints(item.nurbs.controlPoints, transform.point),
          },
        };
      }
      if (item.type === "nurbsSurface") {
        const nextNurbs = {
          ...item.nurbs,
          controlPoints: transformControlPointGrid(item.nurbs.controlPoints, transform.point),
        };
        if (item.mesh) {
          const positions = item.mesh.positions.slice();
          for (let i = 0; i < positions.length; i += 3) {
            const point = {
              x: positions[i],
              y: positions[i + 1],
              z: positions[i + 2],
            };
            const next = transform.point(point);
            positions[i] = next.x;
            positions[i + 1] = next.y;
            positions[i + 2] = next.z;
          }
          const normals = item.mesh.normals.slice();
          for (let i = 0; i < normals.length; i += 3) {
            const normal = {
              x: normals[i],
              y: normals[i + 1],
              z: normals[i + 2],
            };
            const next = normalize(vectorTransform(normal));
            normals[i] = next.x;
            normals[i + 1] = next.y;
            normals[i + 2] = next.z;
          }
          return {
            ...item,
            nurbs: nextNurbs,
            mesh: { ...item.mesh, positions, normals },
          };
        }
        return { ...item, nurbs: nextNurbs };
      }
      if (item.type === "brep") {
        const nextBrep = transformBRepData(item.brep, transform.point, vectorTransform);
        if (item.mesh) {
          const positions = item.mesh.positions.slice();
          for (let i = 0; i < positions.length; i += 3) {
            const point = {
              x: positions[i],
              y: positions[i + 1],
              z: positions[i + 2],
            };
            const next = transform.point(point);
            positions[i] = next.x;
            positions[i + 1] = next.y;
            positions[i + 2] = next.z;
          }
          const normals = item.mesh.normals.slice();
          for (let i = 0; i < normals.length; i += 3) {
            const normal = {
              x: normals[i],
              y: normals[i + 1],
              z: normals[i + 2],
            };
            const next = normalize(vectorTransform(normal));
            normals[i] = next.x;
            normals[i + 1] = next.y;
            normals[i + 2] = next.z;
          }
          return {
            ...item,
            brep: nextBrep,
            mesh: { ...item.mesh, positions, normals },
          };
        }
        return { ...item, brep: nextBrep };
      }
      if ("mesh" in item) {
        const positions = item.mesh.positions.slice();
        for (let i = 0; i < positions.length; i += 3) {
          const point = {
            x: positions[i],
            y: positions[i + 1],
            z: positions[i + 2],
          };
          const next = transform.point(point);
          positions[i] = next.x;
          positions[i + 1] = next.y;
          positions[i + 2] = next.z;
        }
        const normals = item.mesh.normals.slice();
        for (let i = 0; i < normals.length; i += 3) {
          const normal = {
            x: normals[i],
            y: normals[i + 1],
            z: normals[i + 2],
          };
          const next = normalize(vectorTransform(normal));
          normals[i] = next.x;
          normals[i + 1] = next.y;
          normals[i + 2] = next.z;
        }
        const base = {
          ...item,
          mesh: { ...item.mesh, positions, normals },
        };
        if (item.type !== "mesh") {
          return base;
        }
        const primitive = item.primitive
          ? { ...item.primitive, origin: transform.point(item.primitive.origin) }
          : item.primitive;
        return {
          ...base,
          primitive,
        };
      }
      return item;
    });

    return { items: transformed, idMap };
  };

  const duplicateSelectionWithTransforms = (
    copies: number,
    transformForCopy: (copyIndex: number) => GeometryTransform
  ) => {
    if (copies <= 0) return { error: "Array count must be at least 2." };
    if (selectionMode !== "object") {
      return { error: "Switch the selection filter to Object to transform geometry." };
    }
    if (selectedGeometryIds.length === 0) {
      return { error: "Select geometry to transform." };
    }

    const baseSelectionIds = [...selectedGeometryIds];
    const dependencyIds = collectGeometryDependencies(baseSelectionIds);
    const sourceItems = dependencyIds
      .map((id) => geometryMap.get(id))
      .filter(Boolean) as Geometry[];

    if (sourceItems.length === 0) {
      return { error: "Unable to resolve geometry dependencies." };
    }

    const allItems: Geometry[] = [];
    const selectIds: string[] = [];

    for (let copyIndex = 0; copyIndex < copies; copyIndex += 1) {
      const { items, idMap } = cloneGeometryWithTransform(
        sourceItems,
        transformForCopy(copyIndex)
      );
      allItems.push(...items);
      baseSelectionIds.forEach((id) => {
        const mapped = idMap.get(id);
        if (mapped) selectIds.push(mapped);
      });
    }

    const uniqueSelectIds = Array.from(new Set(selectIds));
    if (allItems.length === 0 || uniqueSelectIds.length === 0) {
      return { error: "No geometry was created." };
    }

    addGeometryItems(allItems, {
      selectIds: uniqueSelectIds,
      recordHistory: true,
    });

    return { count: uniqueSelectIds.length };
  };

  const parseAxisKey = (input: string): "x" | "y" | "z" => {
    const axisMatch = input.match(/axis\s*=?\s*([xyz])/i);
    if (axisMatch) {
      const key = axisMatch[1].toLowerCase();
      return key === "y" ? "y" : key === "z" ? "z" : "x";
    }
    const tokenMatch = input.match(/\b([xyz])\b/i);
    if (tokenMatch) {
      const key = tokenMatch[1].toLowerCase();
      return key === "y" ? "y" : key === "z" ? "z" : "x";
    }
    return "x";
  };

  const resolveAxisVector = (axisKey: "x" | "y" | "z") => {
    const normalizeOrFallback = (axis: Vec3, fallback: Vec3) => {
      const normalized = normalize(axis);
      return Math.hypot(normalized.x, normalized.y, normalized.z) > 1e-6
        ? normalized
        : fallback;
    };
    const xAxis = normalizeOrFallback(cPlane.xAxis, { x: 1, y: 0, z: 0 });
    const yAxis = normalizeOrFallback(cPlane.yAxis, { x: 0, y: 0, z: 1 });
    const normal = normalizeOrFallback(cPlane.normal, { x: 0, y: 1, z: 0 });
    if (axisKey === "y") return yAxis;
    if (axisKey === "z") return normal;
    return xAxis;
  };

  const mirrorSelection = (axisKey: "x" | "y" | "z") => {
    const pivotPoint = computeSelectionPivot(selectedGeometryIds);
    const axisVector = resolveAxisVector(axisKey);
    const normal = normalize(axisVector);
    const reflectPoint = (point: Vec3) => {
      const delta = sub(point, pivotPoint);
      const distanceToPlane = dot(delta, normal);
      return sub(point, scale(normal, 2 * distanceToPlane));
    };
    const reflectVector = (vector: Vec3) => {
      const projection = dot(vector, normal);
      return sub(vector, scale(normal, 2 * projection));
    };
    return duplicateSelectionWithTransforms(1, () => ({
      point: reflectPoint,
      vector: reflectVector,
    }));
  };

  const arraySelection = (axisKey: "x" | "y" | "z", spacing: number, count: number) => {
    const copies = Math.max(0, Math.round(count) - 1);
    if (!Number.isFinite(spacing) || spacing === 0) {
      return { error: "Provide a non-zero spacing for array." };
    }
    if (copies <= 0) {
      return { error: "Array count must be at least 2." };
    }
    const direction = resolveAxisVector(axisKey);
    return duplicateSelectionWithTransforms(copies, (copyIndex) => {
      const step = copyIndex + 1;
      const delta = scale(direction, spacing * step);
      return {
        point: (point) => add(point, delta),
      };
    });
  };

  const parseArraySettings = (input: string) => {
    const lower = input.toLowerCase();
    const axis = parseAxisKey(lower);
    const countMatch = lower.match(/count\s*=?\s*(\d+)/i);
    const spacingMatch =
      lower.match(/spacing\s*=?\s*(-?\d*\.?\d+)/i) ??
      lower.match(/distance\s*=?\s*(-?\d*\.?\d+)/i);

    const defaultSpacing =
      Number.isFinite(gridSettings.spacing) && gridSettings.spacing !== 0
        ? gridSettings.spacing
        : 1;

    let count = countMatch ? Number(countMatch[1]) : 3;
    const fallbackNumber = parseFirstNumber(input);
    if (!countMatch && fallbackNumber != null && !spacingMatch) {
      count = fallbackNumber;
    }

    const spacing = spacingMatch
      ? Number(spacingMatch[1])
      : defaultSpacing;

    return {
      axis,
      count: Math.max(2, Math.round(count)),
      spacing,
    };
  };

  const parseMeshThickenSettings = (input: string) => {
    const lower = input.toLowerCase();
    const thicknessMatch =
      lower.match(/thickness\s*=?\s*(-?\d*\.?\d+)/i) ??
      lower.match(/distance\s*=?\s*(-?\d*\.?\d+)/i);
    const fallbackNumber = parseFirstNumber(input);
    const thickness = thicknessMatch ? Number(thicknessMatch[1]) : fallbackNumber ?? 1;
    const sides = lower.includes("inward")
      ? "inward"
      : lower.includes("outward")
        ? "outward"
        : "both";
    return { thickness, sides };
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isEditableElement = (element: HTMLElement | null) =>
        Boolean(
          element &&
            (element.tagName === "INPUT" ||
              element.tagName === "TEXTAREA" ||
              element.isContentEditable)
        );
      const target = event.target as HTMLElement | null;
      const activeElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (isEditableElement(target) || isEditableElement(activeElement)) {
        return;
      }
      if (
        viewerHoverRef.current &&
        !event.defaultPrevented &&
        !event.isComposing &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.key.length === 1 &&
        event.key !== " "
      ) {
        const input = commandInputRef.current;
        if (input && !input.disabled && !input.readOnly) {
          event.preventDefault();
          const nextChar = event.key;
          setCommandInput((prev) => `${prev}${nextChar}`);
          if (commandError) {
            setCommandError("");
          }
          input.focus({ preventScroll: true });
          requestAnimationFrame(() => {
            if (!commandInputRef.current) return;
            const length = commandInputRef.current.value.length;
            commandInputRef.current.setSelectionRange(length, length);
          });
          return;
        }
      }
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redoModeler();
        } else {
          undoModeler();
        }
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === "y") {
        event.preventDefault();
        redoModeler();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === "c") {
        event.preventDefault();
        copySelection();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === "v") {
        event.preventDefault();
        pasteSelection("cursor");
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === "d") {
        event.preventDefault();
        duplicateSelection();
        return;
      }
      if (!event.altKey && !event.ctrlKey && !event.metaKey) {
        if (event.key === "1") {
          event.preventDefault();
          setSelectionMode("object");
          return;
        }
        if (event.key === "2") {
          event.preventDefault();
          setSelectionMode("vertex");
          return;
        }
        if (event.key === "3") {
          event.preventDefault();
          setSelectionMode("edge");
          return;
        }
        if (event.key === "4") {
          event.preventDefault();
          setSelectionMode("face");
          return;
        }
      }
      if (key === "c" && !(event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        const index = transformOrientationOrder.indexOf(transformOrientation);
        const next =
          transformOrientationOrder[(index + 1) % transformOrientationOrder.length];
        setTransformOrientation(next);
        return;
      }
      if (key === "f") {
        event.preventDefault();
        if (event.shiftKey) {
          dispatchCommandRequest("frameall", "");
        } else {
          dispatchCommandRequest("focus", "");
        }
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    copySelection,
    pasteSelection,
    duplicateSelection,
    undoModeler,
    redoModeler,
    transformOrientation,
    setTransformOrientation,
    setSelectionMode,
    commandError,
    setCommandInput,
    setCommandError,
  ]);

  const sceneNodeMap = useMemo(
    () => new Map(sceneNodes.map((node) => [node.id, node])),
    [sceneNodes]
  );

  const handleCapture = async () => {
    if (!viewerRef.current || !onCaptureRequest) return;
    const container = viewerRef.current;
    const rect = container.getBoundingClientRect();
    const maxEdge = 2400;
    const maxOutputEdge = 8192;
    const baseEdge = Math.max(rect.width, rect.height, 1);
    const scale = Math.max(1, maxEdge / baseEdge);
    const captureWidth = Math.round(rect.width * scale);
    const captureHeight = Math.round(rect.height * scale);
    const desiredScale = Math.min(4, (window.devicePixelRatio || 1) * 2);
    const safeScale = Math.min(
      desiredScale,
      maxOutputEdge / Math.max(captureWidth, captureHeight, 1)
    );
    const exportScale = Math.max(1, safeScale);
    const prevStyles = {
      width: container.style.width,
      height: container.style.height,
      position: container.style.position,
      left: container.style.left,
      top: container.style.top,
      zIndex: container.style.zIndex,
    };
    const prevDataset = {
      captureMode: container.dataset.captureMode,
      captureScale: container.dataset.captureScale,
    };
    container.dataset.captureMode = "roslyn";
    container.dataset.captureScale = String(exportScale);
    container.classList.add(styles.captureActive);
    container.style.width = `${captureWidth}px`;
    container.style.height = `${captureHeight}px`;
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.zIndex = "-1";
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    try {
      await onCaptureRequest(container);
    } finally {
      container.classList.remove(styles.captureActive);
      container.style.width = prevStyles.width;
      container.style.height = prevStyles.height;
      container.style.position = prevStyles.position;
      container.style.left = prevStyles.left;
      container.style.top = prevStyles.top;
      container.style.zIndex = prevStyles.zIndex;
      if (prevDataset.captureMode) {
        container.dataset.captureMode = prevDataset.captureMode;
      } else {
        delete container.dataset.captureMode;
      }
      if (prevDataset.captureScale) {
        container.dataset.captureScale = prevDataset.captureScale;
      } else {
        delete container.dataset.captureScale;
      }
    }
  };

  const collectGroupGeometryIds = (groupId: string) => {
    const ids: string[] = [];
    const visit = (nodeId: string) => {
      const node = sceneNodeMap.get(nodeId);
      if (!node) return;
      if (node.type === "geometry" && node.geometryId) {
        ids.push(node.geometryId);
      }
      node.childIds.forEach((childId) => visit(childId));
    };
    visit(groupId);
    return ids;
  };

  const setGroupVisibility = (groupId: string, visible: boolean) => {
    const ids = collectGroupGeometryIds(groupId);
    ids.forEach((id) => toggleGeometryVisibility(id, visible));
  };

  const setGroupLock = (groupId: string, locked: boolean) => {
    const ids = collectGroupGeometryIds(groupId);
    ids.forEach((id) => toggleGeometryLock(id, locked));
  };

  const showAllGeometry = () => {
    geometry.forEach((item) => toggleGeometryVisibility(item.id, true));
  };

  const hideSelection = () => {
    selectedGeometryIds.forEach((id) => toggleGeometryVisibility(id, false));
  };

  const isolateSelection = () => {
    geometry.forEach((item) =>
      toggleGeometryVisibility(item.id, selectedGeometryIds.includes(item.id))
    );
  };

  const lockSelection = () => {
    selectedGeometryIds.forEach((id) => toggleGeometryLock(id, true));
  };

  const unlockAllGeometry = () => {
    geometry.forEach((item) => toggleGeometryLock(item.id, false));
  };

  const renderSceneNode = (nodeId: string, depth = 0) => {
    const node = sceneNodeMap.get(nodeId);
    if (!node) return null;
    const isGeometry = node.type === "geometry";
    const geometryId = node.geometryId ?? "";
    const groupIds = !isGeometry ? collectGroupGeometryIds(node.id) : [];
    const isHidden = isGeometry
      ? hiddenGeometryIds.includes(geometryId)
      : groupIds.length > 0 && groupIds.every((id) => hiddenGeometryIds.includes(id));
    const isLocked = isGeometry
      ? lockedGeometryIds.includes(geometryId)
      : groupIds.length > 0 && groupIds.every((id) => lockedGeometryIds.includes(id));
    const isSelected = isGeometry && selectedGeometryIds.includes(geometryId);
    const nodeIconId: IconId = isGeometry ? "primitive" : "group";
    const nodeTooltip =
      isGeometry && isLocked
        ? `${node.name} is locked`
        : `Select ${node.name}. Double-click to rename.`;
    return (
      <div key={node.id}>
        <div
          className={`${styles.outlinerItem} ${
            isSelected || node.id === selectedGroupId ? styles.outlinerItemActive : ""
          }`}
          style={{ paddingLeft: `${depth * 12}px` }}
        >
          <WebGLButton
            type="button"
            className={styles.outlinerLabel}
            label={node.name}
            iconId={nodeIconId}
            variant="outliner"
            size="xs"
            shape="pill"
            tooltip={nodeTooltip}
            tooltipPosition="right"
            onClick={() => {
              if (isGeometry) {
                if (!isLocked) {
                  selectGeometry(geometryId, false);
                  const moveCommand = COMMAND_DEFINITIONS.find(
                    (command) => command.id === "move"
                  );
                  if (moveCommand) {
                    activateCommand(moveCommand);
                  }
                  dispatchCommandRequest("move", "start");
                }
                return;
              }
              setSelectedGroupId(node.id);
              setSelectedGeometryIds(collectGroupGeometryIds(node.id));
            }}
            onDoubleClick={() => {
              const nextName = window.prompt("Rename", node.name);
              if (nextName && nextName.trim()) {
                renameSceneNode(node.id, nextName.trim());
              }
            }}
          />
          <div className={styles.outlinerActions}>
            <WebGLButton
              type="button"
              className={styles.outlinerAction}
              label={isHidden ? `Show ${node.name}` : `Hide ${node.name}`}
              iconId={isHidden ? "show" : "hide"}
              hideLabel
              variant="outliner"
              size="xs"
              shape="square"
              tooltip={isHidden ? "Show" : "Hide"}
              tooltipPosition="right"
              onClick={() => {
                if (isGeometry) {
                  toggleGeometryVisibility(geometryId);
                } else {
                  setGroupVisibility(node.id, isHidden);
                }
              }}
            />
            <WebGLButton
              type="button"
              className={styles.outlinerAction}
              label={isLocked ? `Unlock ${node.name}` : `Lock ${node.name}`}
              iconId={isLocked ? "unlock" : "lock"}
              hideLabel
              variant="outliner"
              size="xs"
              shape="square"
              tooltip={isLocked ? "Unlock" : "Lock"}
              tooltipPosition="right"
              onClick={() => {
                if (isGeometry) {
                  toggleGeometryLock(geometryId);
                } else {
                  setGroupLock(node.id, !isLocked);
                }
              }}
            />
          </div>
        </div>
        {node.childIds.map((childId) => renderSceneNode(childId, depth + 1))}
      </div>
    );
  };

  const ensurePlanarDefaults = () => {
    setSnapSettings({ grid: true });
    setTransformOrientation("cplane");
  };

  const handleCommandClick = (command: CommandDefinition) => {
    if (command.id === "rectangle" || command.id === "circle") {
      ensurePlanarDefaults();
    }
    handleCommandSubmit(command.id);
    setPaletteCollapsed(true);
  };

  const dispatchCommandRequest = (id: string, input: string) => {
    commandRequestIdRef.current += 1;
    setCommandRequest({ id, input, requestId: commandRequestIdRef.current });
  };

  const parseNumeric = (value: string | undefined, fallback: number) => {
    if (!value) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const parseFirstNumber = (input: string) => {
    const match = input.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/i);
    return match ? Number(match[0]) : null;
  };

  const updatePrimitiveFromInput = (input: string, forcedKind?: PrimitiveKind) => {
    const lower = input.toLowerCase();
    setPrimitiveSettings((prev) => {
      const next = { ...prev };
      if (forcedKind) {
        next.kind = forcedKind;
      } else {
        const kindMatchers: Array<{ kind: typeof next.kind; matches: string[] }> = [
          {
            kind: "truncatedIcosahedron",
            matches: ["truncated icosahedron", "truncated-icosahedron", "soccer", "bucky"],
          },
          {
            kind: "truncatedOctahedron",
            matches: ["truncated octahedron", "truncated-octahedron"],
          },
          { kind: "truncatedCube", matches: ["truncated cube", "truncated-cube"] },
          {
            kind: "rhombicDodecahedron",
            matches: ["rhombic dodecahedron", "rhombic-dodecahedron", "rhombic"],
          },
          { kind: "geodesicDome", matches: ["geodesic dome", "geodesic"] },
          { kind: "torusKnot", matches: ["torus knot", "torus-knot", "torusknot", "knot"] },
          {
            kind: "utahTeapot",
            matches: ["utah teapot", "utah-teapot", "teapot", "utah"],
          },
          { kind: "mobiusStrip", matches: ["mobius", "moebius"] },
          { kind: "oneSheetHyperboloid", matches: ["one-sheet", "one sheet", "hyperboloid"] },
          {
            kind: "hyperbolicParaboloid",
            matches: ["hyperbolic paraboloid", "hyperbolic-paraboloid", "hyperbolic", "saddle"],
          },
          { kind: "superellipsoid", matches: ["superellipsoid", "super-ellipsoid"] },
          { kind: "ellipsoid", matches: ["ellipsoid"] },
          { kind: "sphericalCap", matches: ["spherical cap", "spherical-cap", "dome"] },
          { kind: "hemisphere", matches: ["hemisphere", "hemi"] },
          { kind: "capsule", matches: ["capsule", "pill"] },
          { kind: "pipe", matches: ["pipe", "hollow cylinder", "hollow-cyl"] },
          { kind: "ring", matches: ["ring", "annulus"] },
          { kind: "disk", matches: ["disk", "disc"] },
          { kind: "frustum", matches: ["frustum"] },
          { kind: "bipyramid", matches: ["bipyramid", "bi-pyramid"] },
          {
            kind: "triangularPrism",
            matches: ["triangular prism", "triangular-prism", "triangular"],
          },
          {
            kind: "pentagonalPrism",
            matches: ["pentagonal prism", "pentagonal-prism", "pentagonal"],
          },
          { kind: "hexagonalPrism", matches: ["hexagonal prism", "hexagonal-prism", "hexagonal"] },
          { kind: "tetrahedron", matches: ["tetrahedron", "tetra"] },
          { kind: "octahedron", matches: ["octahedron", "octa"] },
          { kind: "icosahedron", matches: ["icosahedron", "icosa"] },
          { kind: "dodecahedron", matches: ["dodecahedron", "dodeca"] },
          { kind: "pyramid", matches: ["pyramid", "pyr"] },
          { kind: "torus", matches: ["torus", "toroid"] },
          { kind: "cylinder", matches: ["cylinder"] },
          { kind: "sphere", matches: ["sphere"] },
          { kind: "box", matches: ["box", "cube"] },
        ];
        for (const matcher of kindMatchers) {
          if (matcher.matches.some((match) => lower.includes(match))) {
            next.kind = matcher.kind;
            break;
          }
        }
      }
      const sizeMatch = input.match(/size\s*=?\s*(-?\d*\.?\d+)/i);
      if (sizeMatch) {
        next.size = parseNumeric(sizeMatch[1], next.size);
      }
      const radiusMatch =
        input.match(/radius\s*=?\s*(-?\d*\.?\d+)/i) ??
        input.match(/\br\s*=?\s*(-?\d*\.?\d+)/i);
      if (radiusMatch) {
        next.radius = parseNumeric(radiusMatch[1], next.radius);
      }
      const innerMatch =
        input.match(/inner\s*=?\s*(-?\d*\.?\d+)/i) ??
        input.match(/innerRadius\s*=?\s*(-?\d*\.?\d+)/i);
      if (innerMatch) {
        next.innerRadius = parseNumeric(innerMatch[1], next.innerRadius);
      }
      const topMatch =
        input.match(/top\s*=?\s*(-?\d*\.?\d+)/i) ??
        input.match(/topRadius\s*=?\s*(-?\d*\.?\d+)/i);
      if (topMatch) {
        next.topRadius = parseNumeric(topMatch[1], next.topRadius);
      }
      const capMatch =
        input.match(/cap\s*=?\s*(-?\d*\.?\d+)/i) ??
        input.match(/capHeight\s*=?\s*(-?\d*\.?\d+)/i);
      if (capMatch) {
        next.capHeight = parseNumeric(capMatch[1], next.capHeight);
      }
      const heightMatch = input.match(/height\s*=?\s*(-?\d*\.?\d+)/i);
      if (heightMatch) {
        next.height = parseNumeric(heightMatch[1], next.height);
      }
      const tubeMatch = input.match(/tube\s*=?\s*(-?\d*\.?\d+)/i);
      if (tubeMatch) {
        next.tube = parseNumeric(tubeMatch[1], next.tube);
      }
      const detailMatch =
        input.match(/detail\s*=?\s*(\d+)/i) ??
        input.match(/subdiv\s*=?\s*(\d+)/i);
      if (detailMatch) {
        next.detail = Math.max(0, Math.round(parseNumeric(detailMatch[1], next.detail)));
      }
      const exp1Match = input.match(/exp1\s*=?\s*(-?\d*\.?\d+)/i);
      if (exp1Match) {
        next.exponent1 = parseNumeric(exp1Match[1], next.exponent1);
      }
      const exp2Match = input.match(/exp2\s*=?\s*(-?\d*\.?\d+)/i);
      if (exp2Match) {
        next.exponent2 = parseNumeric(exp2Match[1], next.exponent2);
      }
      const expMatch =
        input.match(/exp\s*=?\s*(-?\d*\.?\d+)/i) ??
        input.match(/exponent\s*=?\s*(-?\d*\.?\d+)/i);
      if (expMatch && !exp1Match && !exp2Match) {
        const exp = parseNumeric(expMatch[1], next.exponent1);
        next.exponent1 = exp;
        next.exponent2 = exp;
      }
      const radialMatch = input.match(/segments\s*=?\s*(\d+)/i);
      if (radialMatch) {
        next.radialSegments = Math.max(
          6,
          Math.round(parseNumeric(radialMatch[1], next.radialSegments))
        );
      }
      const tubularMatch = input.match(/tubular\s*=?\s*(\d+)/i);
      if (tubularMatch) {
        next.tubularSegments = Math.max(
          8,
          Math.round(parseNumeric(tubularMatch[1], next.tubularSegments))
        );
      }
      const fallbackNumber = parseFirstNumber(input);
      if (fallbackNumber != null && !sizeMatch && !radiusMatch) {
        const sizeDriven = new Set([
          "box",
          "pyramid",
          "wedge",
          "hyperbolicParaboloid",
        ]);
        if (sizeDriven.has(next.kind)) {
          next.size = fallbackNumber;
        } else {
          next.radius = fallbackNumber;
        }
      }
      return next;
    });
  };

  const updateRectangleFromInput = (input: string) => {
    const widthMatch = input.match(/width\s*=?\s*(-?\d*\.?\d+)/i);
    const heightMatch = input.match(/height\s*=?\s*(-?\d*\.?\d+)/i);
    const numbers = (input.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi) ?? []).map(
      (value) => Number(value)
    );
    setRectangleSettings((prev) => ({
      width: widthMatch
        ? parseNumeric(widthMatch[1], prev.width)
        : numbers[0] ?? prev.width,
      height: heightMatch
        ? parseNumeric(heightMatch[1], prev.height)
        : numbers[1] ?? prev.height,
    }));
  };

  const updateCircleFromInput = (input: string) => {
    const radiusMatch = input.match(/radius\s*=?\s*(-?\d*\.?\d+)/i);
    const segmentsMatch = input.match(/segments\s*=?\s*(\d+)/i);
    const fallback = parseFirstNumber(input);
    setCircleSettings((prev) => ({
      radius: radiusMatch
        ? parseNumeric(radiusMatch[1], prev.radius)
        : fallback ?? prev.radius,
      segments: segmentsMatch
        ? Math.max(8, Math.round(parseNumeric(segmentsMatch[1], prev.segments)))
        : prev.segments,
    }));
  };

  const handleCommandSubmit = (inputOverride?: string) => {
    const rawInput = inputOverride ?? commandInput;
    const trimmed = rawInput.trim();
    if (!trimmed) return;
    const parsed = parseCommandInput(rawInput);
    if (parsed.command) {
      const commandId = parsed.command.id;
      const args = parsed.args ?? "";
      const lower = args.toLowerCase();
      setPaletteCollapsed(true);
      const commandKind = PRIMITIVE_KIND_BY_COMMAND.get(commandId);
      if (commandKind) {
        ensurePlanarDefaults();
        updatePrimitiveFromInput(rawInput, commandKind);
        activateCommand(parsed.command);
        setCommandInput("");
        setCommandError("");
        return;
      }
      const nurbsPrimitiveKind = NURBS_PRIMITIVE_KIND_BY_COMMAND.get(commandId);
      if (nurbsPrimitiveKind) {
        ensurePlanarDefaults();
        updatePrimitiveFromInput(rawInput, nurbsPrimitiveKind);
        activateCommand(parsed.command);
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "offset") {
        const distanceInput = args || rawInput;
        const parsedDistance = parseFirstNumber(distanceInput);
        const distance =
          parsedDistance ??
          (Number.isFinite(gridSettings.spacing) ? gridSettings.spacing : 1);
        const result = offsetSelectedPolylines(distance);
        setActiveCommand(null);
        setCommandInput("");
        setCommandError(result.error ?? "");
        return;
      }
      if (commandId === "mirror") {
        const axisKey = parseAxisKey(args || rawInput);
        const result = mirrorSelection(axisKey);
        setActiveCommand(null);
        setCommandInput("");
        setCommandError(result.error ?? "");
        return;
      }
      if (commandId === "array") {
        const settings = parseArraySettings(args || rawInput);
        const result = arraySelection(
          settings.axis,
          settings.spacing,
          settings.count
        );
        setActiveCommand(null);
        setCommandInput("");
        setCommandError(result.error ?? "");
        return;
      }
      if (commandId === "meshconvert") {
        const result = convertSelectionToMesh();
        setActiveCommand(null);
        setCommandInput("");
        setCommandError(result.error ?? "");
        return;
      }
      if (commandId === "breptomesh") {
        const result = convertSelectionToMeshFromBrep();
        setActiveCommand(null);
        setCommandInput("");
        setCommandError(result.error ?? "");
        return;
      }
      if (commandId === "meshtobrep") {
        const result = convertSelectionToBrep();
        setActiveCommand(null);
        setCommandInput("");
        setCommandError(result.error ?? "");
        return;
      }
      if (commandId === "nurbsrestore") {
        const result = restoreSelectionToNurbs();
        setActiveCommand(null);
        setCommandInput("");
        setCommandError(result.error ?? "");
        return;
      }
      if (commandId === "interpolate") {
        const result = interpolateSelectedPolylines();
        setActiveCommand(null);
        setCommandInput("");
        setCommandError(result.error ?? "");
        return;
      }
      if (commandId === "surface") {
        const result = createSurfaceFromSelection();
        setActiveCommand(null);
        setCommandInput("");
        setCommandError(result.error ?? "");
        return;
      }
      if (commandId === "loft") {
        const result = loftSelection(args || rawInput);
        setActiveCommand(null);
        setCommandInput("");
        setCommandError(result.error ?? "");
        return;
      }
      if (commandId === "extrude") {
        const result = extrudeSelection(args || rawInput);
        setActiveCommand(null);
        setCommandInput("");
        setCommandError(result.error ?? "");
        return;
      }
      if (commandId === "boolean") {
        const result = booleanSelection();
        setActiveCommand(null);
        setCommandInput("");
        setCommandError(result.error ?? "");
        return;
      }
      if (commandId === "meshmerge") {
        const result = mergeSelectedMeshes();
        setActiveCommand(null);
        setCommandInput("");
        setCommandError(result.error ?? "");
        return;
      }
      if (commandId === "meshflip") {
        const result = flipSelectedMeshes();
        setActiveCommand(null);
        setCommandInput("");
        setCommandError(result.error ?? "");
        return;
      }
      if (commandId === "meshthicken") {
        const settings = parseMeshThickenSettings(args || rawInput);
        const result = thickenSelectedMeshes(settings.thickness, settings.sides);
        setActiveCommand(null);
        setCommandInput("");
        setCommandError(result.error ?? "");
        return;
      }
      if (commandId === "rectangle") {
        updateRectangleFromInput(args || rawInput);
        activateCommand(parsed.command);
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "circle") {
        updateCircleFromInput(args || rawInput);
        activateCommand(parsed.command);
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "undo") {
        undoModeler();
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "redo") {
        redoModeler();
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "copy") {
        copySelection();
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "paste") {
        const mode = lower.includes("inplace")
          ? "inplace"
          : lower.includes("origin")
            ? "origin"
            : "cursor";
        pasteSelection(mode);
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "duplicate") {
        duplicateSelection();
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "focus" || commandId === "frameall") {
        dispatchCommandRequest(commandId, "");
        setActiveCommand(null);
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "screenshot") {
        if (!captureDisabled) {
          void handleCapture();
        }
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "delete") {
        if (selectedGeometryIds.length > 0) {
          const shouldDelete =
            selectedGeometryIds.length > 20
              ? window.confirm(
                  `Delete ${selectedGeometryIds.length} items? This cannot be undone without undo.`
                )
              : true;
          if (shouldDelete) {
            deleteGeometry(selectedGeometryIds);
          }
        }
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "selectionfilter") {
        const resolveMode = (value: string) => {
          if (/\b(object|obj)\b/.test(value)) return "object";
          if (/\b(vertex|vert|vtx|point)\b/.test(value)) return "vertex";
          if (/\b(edge|edg)\b/.test(value)) return "edge";
          if (/\b(face|fce)\b/.test(value)) return "face";
          return null;
        };
        const explicit = resolveMode(lower);
        if (explicit) {
          setSelectionMode(explicit);
        } else {
          const order = ["object", "vertex", "edge", "face"] as const;
          const currentIndex = Math.max(0, order.indexOf(selectionMode as (typeof order)[number]));
          const nextMode = order[(currentIndex + 1) % order.length];
          setSelectionMode(nextMode);
        }
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "snapping") {
        setSnapSettings({
          grid: lower.includes("grid") ? !lower.includes("nogrid") : snapSettings.grid,
          vertices: lower.includes("vertex")
            ? !lower.includes("novertex")
            : snapSettings.vertices,
          endpoints: lower.includes("endpoint")
            ? !lower.includes("noendpoint")
            : snapSettings.endpoints,
          midpoints: lower.includes("midpoint")
            ? !lower.includes("nomidpoint")
            : snapSettings.midpoints,
          intersections: lower.includes("intersection")
            ? !lower.includes("nointersection")
            : snapSettings.intersections,
          perpendicular: lower.includes("perpendicular")
            ? !lower.includes("noperpendicular")
            : snapSettings.perpendicular,
          tangent: lower.includes("tangent")
            ? !lower.includes("notangent")
            : snapSettings.tangent,
        });
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "grid") {
        const spacingMatch = lower.match(/spacing\s*=?\s*(-?\d*\.?\d+)/);
        const unitsMatch = lower.match(/units\s*=?\s*([a-z]+)/);
        setGridSettings({
          spacing: spacingMatch ? Number(spacingMatch[1]) : gridSettings.spacing,
          units: unitsMatch ? unitsMatch[1] : gridSettings.units,
          adaptive: lower.includes("adaptive")
            ? !lower.includes("noadaptive")
            : gridSettings.adaptive,
        });
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "display") {
        if (lower.includes("silhouette")) setDisplayMode("silhouette");
        else if (lower.includes("wire")) setDisplayMode("wireframe");
        else if (lower.includes("ghost")) setDisplayMode("ghosted");
        else setDisplayMode("shaded");
        if (lower.includes("backface")) {
          setViewSettings({ backfaceCulling: !lower.includes("nobackface") });
        }
        if (lower.includes("normals")) {
          setViewSettings({ showNormals: !lower.includes("nonormals") });
        }
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "isolate") {
        if (lower.includes("show")) {
          showAllGeometry();
        } else if (lower.includes("unlock")) {
          unlockAllGeometry();
        } else if (lower.includes("lock")) {
          lockSelection();
        } else if (lower.includes("hide")) {
          hideSelection();
        } else {
          isolateSelection();
        }
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "camera") {
        setCameraPreset("standard");
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "view") {
        const activeCamera = isFullscreen
          ? fullscreenCameras[resolveActiveViewport()]
          : cameraState;
        const dist = computeViewDistance(activeCamera);
        if (lower.includes("top")) {
          applyActiveViewportCameraUpdate({
            position: {
              x: activeCamera.target.x,
              y: activeCamera.target.y + dist,
              z: activeCamera.target.z,
            },
          });
        } else if (lower.includes("front")) {
          applyActiveViewportCameraUpdate({
            position: {
              x: activeCamera.target.x,
              y: activeCamera.target.y,
              z: activeCamera.target.z + dist,
            },
          });
        } else if (lower.includes("right")) {
          applyActiveViewportCameraUpdate({
            position: {
              x: activeCamera.target.x + dist,
              y: activeCamera.target.y,
              z: activeCamera.target.z,
            },
          });
        } else if (lower.includes("persp")) {
          applyActiveViewportCameraUpdate({ fov: 28 });
        } else if (lower.includes("ortho")) {
          applyActiveViewportCameraUpdate({ fov: 20 });
        }
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "orbit") {
        const speedMatch = lower.match(/speed\s*=?\s*(-?\d*\.?\d+)/);
        setCameraState({
          orbitSpeed: speedMatch ? Number(speedMatch[1]) : cameraState.orbitSpeed,
          upright: lower.includes("upright")
            ? true
            : lower.includes("noupright")
              ? false
              : cameraState.upright,
        });
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "pan") {
        const speedMatch = lower.match(/speed\s*=?\s*(-?\d*\.?\d+)/);
        setCameraState({
          panSpeed: speedMatch ? Number(speedMatch[1]) : cameraState.panSpeed,
        });
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "zoom") {
        const speedMatch = lower.match(/speed\s*=?\s*(-?\d*\.?\d+)/);
        setCameraState({
          zoomSpeed: speedMatch ? Number(speedMatch[1]) : cameraState.zoomSpeed,
          invertZoom: lower.includes("invert")
            ? true
            : lower.includes("normal")
              ? false
              : cameraState.invertZoom,
          zoomToCursor: lower.includes("cursor")
            ? true
            : lower.includes("nocursor")
              ? false
              : cameraState.zoomToCursor,
        });
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "pivot") {
        if (lower.includes("world")) setPivotMode("world");
        else if (lower.includes("origin")) setPivotMode("origin");
        else if (lower.includes("cursor")) setPivotMode("cursor");
        else if (lower.includes("picked")) setPivotMode("picked");
        else setPivotMode("selection");
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "status") {
        setShowStatusBar((prev) => !prev);
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "tolerance") {
        const absMatch = lower.match(/abs(?:olute)?\s*=?\s*(-?\d*\.?\d+)/);
        const angleMatch = lower.match(/angle\s*=?\s*(-?\d*\.?\d+)/);
        setSnapSettings({
          gridStep: absMatch ? Number(absMatch[1]) : snapSettings.gridStep,
          angleStep: angleMatch ? Number(angleMatch[1]) : snapSettings.angleStep,
        });
        setCommandInput("");
        setCommandError("");
        return;
      }
      activateCommand(parsed.command);
      dispatchCommandRequest(commandId, args);
      setCommandInput("");
      if (commandId === "loft" && !loftSelectionState.ready) {
        setCommandError(loftSelectionState.message);
      } else {
        setCommandError("");
      }
      return;
    }
    if (activeCommand) {
      dispatchCommandRequest(activeCommand.id, trimmed);
      setCommandInput("");
      if (activeCommand.id !== "loft") {
        setCommandError("");
      }
      return;
    }
    setCommandError("Command not recognized.");
  };

  const handleCommandComplete = (commandId: string) => {
    setActiveCommand((prev) => (prev?.id === commandId ? null : prev));
    setCommandError("");
  };

  const selectionAlreadyLinked = useMemo(() => {
    if (!primarySelectedGeometryId) return false;
    return referencedGeometryIds.has(primarySelectedGeometryId);
  }, [primarySelectedGeometryId, referencedGeometryIds]);

  const handleSendSelectionToWorkflow = () => {
    if (!primarySelectedGeometryId || selectionAlreadyLinked) return;
    addGeometryReferenceNode(primarySelectedGeometryId);
  };

  const formatGeometryType = (type?: Geometry["type"]) => {
    switch (type) {
      case "vertex":
        return "Point";
      case "polyline":
        return "Polyline";
      case "nurbsCurve":
        return "NURBS Curve";
      case "nurbsSurface":
        return "NURBS Surface";
      case "surface":
        return "Surface";
      case "loft":
        return "Loft";
      case "extrude":
        return "Extrude";
      case "mesh":
        return "Mesh";
      case "brep":
        return "B-Rep";
      default:
        return "Geometry";
    }
  };

  const statusBlocks = [
    { label: "Selected", value: selectedGeometryLabel },
    { label: "Mode", value: activeCommand?.label ?? "Idle" },
    { label: "Layer", value: selectedLayer?.name ?? "Default" },
    { label: "Material", value: selectedMaterialLabel },
    { label: "Filter", value: selectionMode },
    { label: "Pivot", value: pivot.mode },
    { label: "Orient", value: transformOrientation },
    {
      label: "Gumball",
      value: gumballAlignment === "boundingBox" ? "BBox" : "C-Plane",
    },
    { label: "Snaps", value: activeSnapsLabel },
  ];

  const rotationSnapEnabled = snapSettings.angleStep >= 89.5;
  const handleRotationSnapToggle = (next: boolean) => {
    setSnapSettings({ angleStep: next ? 90 : 0 });
  };
  const gumballAlignmentIsCPlane = gumballAlignment === "cplane";
  const handleGumballAlignmentToggle = (next: boolean) => {
    setGumballAlignment(next ? "cplane" : "boundingBox");
  };
  const isSilhouetteFilter = renderFilter === "silhouette";
  const viewSliderLabel = isSilhouetteFilter ? "Silhouette" : "View";
  const viewSliderTooltip = isSilhouetteFilter
    ? "Blend from dashed edges to solid silhouette."
    : "Slide between Solid, Ghosted, and Wireframe.";

  const footerContent = isFullscreenStatusHidden ? null : (
      <WebGLStatusFooter
        shortcuts={[
          { key: "⌘Z", label: "Undo" },
          { key: "⌘⇧Z", label: "Redo" },
        ]}
        title="Roslyn"
        titleTone="roslyn"
        centerChips={[
          `Grid: ${gridSettings.spacing}${gridSettings.units}`,
          `Snaps: ${activeSnapsLabel}`,
        ]}
        rightChips={[
          `Selected: ${selectedGeometryLabel}`,
          `Mode: ${activeCommand?.label ?? "Idle"}`,
          `Filter: ${selectionMode}`,
        ]}
        toggles={[
          {
            label: "Move Arms",
            checked: showMoveArms,
            onChange: setShowMoveArms,
          },
          {
            label: "Rotation Rings",
            checked: showRotationRings,
            onChange: setShowRotationRings,
          },
          {
            label: "C-Plane Align",
            checked: gumballAlignmentIsCPlane,
            onChange: handleGumballAlignmentToggle,
          },
          {
            label: "90° Snap",
            checked: rotationSnapEnabled,
            onChange: handleRotationSnapToggle,
          },
        ]}
      />
    );

  const commandActions: WebGLTopBarAction[] = COMMAND_DEFINITIONS.filter(
    (command) => command.id !== "screenshot"
  ).map((command) => {
    const meta = COMMAND_DESCRIPTIONS[command.id];
    const category = meta?.category ?? command.category ?? "performs";
    const description =
      meta?.description ?? cleanCommandPrompt(command.prompt, command.label);
    const shortcut = meta?.shortcut ? ` (${meta.shortcut})` : "";
    const accent = resolveRoslynGroupAccent(resolveCommandGroupLabel(command.id));
    return {
      id: command.id,
      label: command.label,
      tooltip: `${description}${shortcut}`,
      tooltipContent: (
        <TooltipCard
          title={command.label}
          kindLabel="Roslyn Command"
          categoryLabel={resolveCommandCategoryLabel(category)}
          semantic={resolveCommandSemantics(category)}
          description={description}
          href={buildCommandDocsHref(command.id)}
          accentColor={accent}
          shortcut={meta?.shortcut}
        />
      ),
      onClick: () => handleCommandClick(command),
      isActive: activeCommand?.id === command.id,
      icon: resolveCommandIconId(command.id),
      iconTint: resolveCommandIconTint(command.id),
      groupLabel: resolveCommandGroupLabel(command.id),
    };
  });

  const referenceAllDisabled =
    selectedGeometryIds.length === 0 ||
    selectedGeometryIds.every((id) => referencedGeometryIds.has(id));
  const handleReferenceAll = () => {
    selectedGeometryIds.forEach((id) => {
      if (!referencedGeometryIds.has(id)) {
        addGeometryReferenceNode(id);
      }
    });
  };

  const groupDisabled = selectedGeometryIds.length < 2;
  const handleGroupSelection = () => {
    if (groupDisabled) return;
    const groupId = createGroup(`Group ${sceneNodes.length + 1}`, selectedGeometryIds);
    setSelectedGroupId(groupId);
  };
  const handleUngroupSelection = () => {
    if (!selectedGroupId) return;
    ungroup(selectedGroupId);
    setSelectedGroupId(null);
  };

  const approxEqual = (a: number, b: number, epsilon = 1e-4) => Math.abs(a - b) <= epsilon;
  const sameVec = (a: Vec3, b: Vec3) =>
    approxEqual(a.x, b.x) && approxEqual(a.y, b.y) && approxEqual(a.z, b.z);
  const sameAxes = (a: CPlane, b: CPlane) => sameVec(a.xAxis, b.xAxis) && sameVec(a.yAxis, b.yAxis);

  const WORLD_XY_PLANE: CPlane = {
    origin: { x: 0, y: 0, z: 0 },
    normal: { x: 0, y: 1, z: 0 },
    xAxis: { x: 1, y: 0, z: 0 },
    yAxis: { x: 0, y: 0, z: 1 },
  };
  const WORLD_XZ_PLANE: CPlane = {
    origin: { x: 0, y: 0, z: 0 },
    normal: { x: 0, y: 0, z: 1 },
    xAxis: { x: 1, y: 0, z: 0 },
    yAxis: { x: 0, y: 1, z: 0 },
  };
  const WORLD_YZ_PLANE: CPlane = {
    origin: { x: 0, y: 0, z: 0 },
    normal: { x: 1, y: 0, z: 0 },
    xAxis: { x: 0, y: 1, z: 0 },
    yAxis: { x: 0, y: 0, z: 1 },
  };

  const isWorldXY = sameAxes(cPlane, WORLD_XY_PLANE);
  const isWorldXZ = sameAxes(cPlane, WORLD_XZ_PLANE);
  const isWorldYZ = sameAxes(cPlane, WORLD_YZ_PLANE);
  const isAlignedPlane = !isWorldXY && !isWorldXZ && !isWorldYZ;

  const handleAlignSelectionPlane = () => {
    if (!canAlignSelectionPlane) return;
    const plane = computeBestFitPlane(selectionPoints);
    setCPlane(plane);
  };

  const selectionModeActions: WebGLTopBarAction[] = selectionModeOptions.map(
    (option) => ({
      id: `selection-${option.value}`,
      label: option.label,
      tooltip: option.tooltip,
      onClick: () => {
        setSelectionMode(option.value as typeof selectionMode);
        setPaletteCollapsed(true);
      },
      isActive: selectionMode === option.value,
      icon: option.iconId as IconId,
      iconTint: COMMAND_CATEGORY_TINTS.neutral,
      groupLabel: "Selection",
    })
  );

  const transformOrientationActions: WebGLTopBarAction[] = transformOrientationOptions.map(
    (option) => ({
      id: `orient-${option.value}`,
      label: option.label,
      tooltip: option.tooltip,
      onClick: () =>
        setTransformOrientation(option.value as typeof transformOrientation),
      isActive: transformOrientation === option.value,
      icon: option.iconId as IconId,
      iconTint: COMMAND_CATEGORY_TINTS.neutral,
      groupLabel: "Orientation",
    })
  );

  const pivotModeActions: WebGLTopBarAction[] = pivotModeOptions.map((option) => ({
    id: `pivot-${option.value}`,
    label: option.label,
    tooltip: option.tooltip,
    onClick: () => setPivotMode(option.value as typeof pivot.mode),
    isActive: pivot.mode === option.value,
    icon: option.iconId as IconId,
    iconTint: COMMAND_CATEGORY_TINTS.neutral,
    groupLabel: "Pivot",
  }));

  const workflowActions: WebGLTopBarAction[] = [
    {
      id: "reference-active",
      label: "Reference Active",
      tooltip: "Reference the active selection into Numerica.",
      onClick: handleSendSelectionToWorkflow,
      isDisabled: !primarySelectedGeometryId || selectionAlreadyLinked,
      icon: "referenceActive",
      iconTint: COMMAND_CATEGORY_TINTS.neutral,
      groupLabel: "Workflow",
    },
    {
      id: "reference-all",
      label: "Reference All",
      tooltip: "Reference all selected geometry into Numerica (skips linked).",
      onClick: handleReferenceAll,
      isDisabled: referenceAllDisabled,
      icon: "referenceAll",
      iconTint: COMMAND_CATEGORY_TINTS.neutral,
      groupLabel: "Workflow",
    },
  ];

  const groupActions: WebGLTopBarAction[] = [
    {
      id: "group",
      label: "Group",
      tooltip: "Group the selected geometry.",
      onClick: handleGroupSelection,
      isDisabled: groupDisabled,
      icon: "group",
      iconTint: COMMAND_CATEGORY_TINTS.neutral,
      groupLabel: "Groups",
    },
    {
      id: "ungroup",
      label: "Ungroup",
      tooltip: "Ungroup the currently selected group.",
      onClick: handleUngroupSelection,
      isDisabled: !selectedGroupId,
      icon: "ungroup",
      iconTint: COMMAND_CATEGORY_TINTS.neutral,
      groupLabel: "Groups",
    },
  ];

  const cplaneActions: WebGLTopBarAction[] = [
    {
      id: "cplane-xy",
      label: "World XY",
      tooltip: "Set the construction plane to World XY.",
      onClick: () => resetCPlane(),
      isActive: isWorldXY,
      icon: "cplaneXY",
      iconTint: COMMAND_CATEGORY_TINTS.neutral,
      groupLabel: "C-Plane",
    },
    {
      id: "cplane-xz",
      label: "World XZ",
      tooltip: "Set the construction plane to World XZ.",
      onClick: () => setCPlane(WORLD_XZ_PLANE),
      isActive: isWorldXZ,
      icon: "cplaneXZ",
      iconTint: COMMAND_CATEGORY_TINTS.neutral,
      groupLabel: "C-Plane",
    },
    {
      id: "cplane-yz",
      label: "World YZ",
      tooltip: "Set the construction plane to World YZ.",
      onClick: () => setCPlane(WORLD_YZ_PLANE),
      isActive: isWorldYZ,
      icon: "cplaneYZ",
      iconTint: COMMAND_CATEGORY_TINTS.neutral,
      groupLabel: "C-Plane",
    },
    {
      id: "cplane-align",
      label: "Align Selection",
      tooltip: "Align the construction plane to the current selection.",
      onClick: handleAlignSelectionPlane,
      isDisabled: !canAlignSelectionPlane,
      isActive: isAlignedPlane,
      icon: "cplaneAlign",
      iconTint: COMMAND_CATEGORY_TINTS.neutral,
      groupLabel: "C-Plane",
    },
  ];

  const cameraActions: WebGLTopBarAction[] = [
    {
      id: "camera-zoom-cursor",
      label: "Zoom to Cursor",
      tooltip: "Zoom around the cursor position.",
      onClick: () => setCameraState({ zoomToCursor: !cameraState.zoomToCursor }),
      isActive: cameraState.zoomToCursor,
      icon: "zoomCursor",
      iconTint: COMMAND_CATEGORY_TINTS.neutral,
      groupLabel: "Camera",
    },
    {
      id: "camera-invert-zoom",
      label: "Invert Zoom",
      tooltip: "Invert scroll direction for zoom.",
      onClick: () => setCameraState({ invertZoom: !cameraState.invertZoom }),
      isActive: cameraState.invertZoom,
      icon: "invertZoom",
      iconTint: COMMAND_CATEGORY_TINTS.neutral,
      groupLabel: "Camera",
    },
    {
      id: "camera-upright",
      label: "Upright",
      tooltip: "Keep the camera upright while orbiting.",
      onClick: () => setCameraState({ upright: !cameraState.upright }),
      isActive: cameraState.upright,
      icon: "upright",
      iconTint: COMMAND_CATEGORY_TINTS.neutral,
      groupLabel: "Camera",
    },
  ];

  const paletteActions: WebGLTopBarAction[] = [
    ...commandActions,
    ...selectionModeActions,
    ...transformOrientationActions,
    ...pivotModeActions,
    ...cplaneActions,
    ...workflowActions,
    ...groupActions,
    ...cameraActions,
  ];

  const paletteGroups = useMemo(() => {
    const groups = new Map<
      string,
      { label: string; actions: WebGLTopBarAction[]; accent: string }
    >();
    paletteActions.forEach((action) => {
      const label = action.groupLabel ?? "Commands";
      const group =
        groups.get(label) ?? {
          label,
          actions: [],
          accent: resolveRoslynGroupAccent(label),
        };
      group.actions.push(action);
      groups.set(label, group);
    });
    return Array.from(groups.values());
  }, [paletteActions]);

  const paletteSections = useMemo(() => {
    const groupMap = new Map(paletteGroups.map((group) => [group.label, group]));
    return ROSLYN_PALETTE_SECTIONS.map((section) => {
      const groups = section.groups
        .map((label) => groupMap.get(label))
        .filter((group): group is NonNullable<typeof group> => Boolean(group));
      return { ...section, groups };
    }).filter((section) => section.groups.length > 0);
  }, [paletteGroups]);

  return (
    <>
      <section className={styles.section} data-fullscreen={isFullscreen ? "true" : "false"}>
        <div className={styles.header}>
          <div className={styles.headerCluster}>
            <WebGLTitleLogo title="Roslyn" tone="roslyn" />
            <div
              className={styles.commandBarShell}
              style={commandBarShellStyle}
              onWheel={handleCommandBarWheel}
              data-no-workspace-pan
            >
              <div
                className={styles.commandBar}
                ref={commandBarRef}
                style={commandBarScaleStyle}
              >
                <div className={styles.commandInputRow}>
                  <span className={styles.srOnly}>Search commands</span>
                  <input
                    ref={commandInputRef}
                    className={styles.commandInput}
                    type="search"
                    value={commandInput}
                    onChange={(event) => {
                      setCommandInput(event.target.value);
                      if (commandError) setCommandError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleCommandSubmit(commandPrimarySuggestion?.input);
                      }
                    }}
                    placeholder="Search commands…"
                    aria-label="Search commands"
                  />
                  {commandMeta && (
                    <span className={styles.commandMeta} aria-live="polite">
                      {commandMeta}
                    </span>
                  )}
                </div>
                {commandError && (
                  <span className={styles.commandErrorText}>{commandError}</span>
                )}
              </div>
            </div>
        </div>
        <div className={styles.headerCluster}>
          {onToggleFullscreen && (
            <IconButton
              size="sm"
              label={isFullscreen ? "Exit full screen" : "Enter full screen"}
              iconId={isFullscreen ? "close" : "frameAll"}
                tooltip={isFullscreen ? "Exit full screen" : "Full screen"}
                tooltipPosition="bottom"
                onClick={onToggleFullscreen}
              />
            )}
          </div>
        </div>
        <div className={styles.body}>
          <div className={styles.viewer} data-panel-drag="true" ref={viewerRef}>
            <div
              className={styles.paletteDock}
              data-collapsed={paletteCollapsed ? "true" : "false"}
            >
              {paletteCollapsed ? (
                <WebGLButton
                  type="button"
                  className={styles.paletteToggle}
                  label="Open Roslyn palette"
                  iconId="brandRoslyn"
                  hideLabel
                  size="sm"
                  variant="icon"
                  shape="square"
                  tooltip="Open Roslyn palette"
                  tooltipPosition="right"
                  onClick={() => setPaletteCollapsed(false)}
                />
              ) : (
                <aside className={styles.palette} ref={paletteRef}>
                  <div className={styles.paletteHeader}>
                    <div className={styles.paletteHeaderText}>
                      <span className={styles.paletteTitle}>Command Library</span>
                      <WebGLTitleLogo
                        title="Roslyn"
                        tone="roslyn"
                        className={styles.paletteSubtitleLogo}
                      />
                    </div>
                    <div className={styles.paletteControls}>
                      <WebGLButton
                        type="button"
                        label="Collapse palette"
                        iconId="chevronDown"
                        hideLabel
                        size="xs"
                        variant="icon"
                        shape="square"
                        onClick={() => setPaletteCollapsed(true)}
                      />
                    </div>
                  </div>
                  <div className={styles.paletteGroups}>
                    {paletteSections.map((section) => (
                      <div key={section.id} className={styles.paletteSection}>
                        <div className={styles.paletteSectionHeader}>
                          <span className={styles.paletteSectionTitle}>
                            {section.label}
                          </span>
                          <span className={styles.paletteSectionMeta}>
                            {section.description}
                          </span>
                        </div>
                        <div className={styles.paletteSectionGroups}>
                          {section.groups.map((group) => (
                            <div key={group.label} className={styles.paletteGroup}>
                              <div className={styles.paletteGroupHeader}>
                                <span
                                  className={styles.paletteGroupDot}
                                  style={{ backgroundColor: group.accent }}
                                  aria-hidden="true"
                                />
                                <div className={styles.paletteGroupText}>
                                  <span className={styles.paletteGroupTitle}>
                                    {group.label}
                                  </span>
                                  <span className={styles.paletteGroupMeta}>
                                    {group.actions.length} tools
                                  </span>
                                </div>
                              </div>
                              <div className={styles.paletteGroupGrid}>
                                {group.actions.map((action) => (
                                  <WebGLButton
                                    key={action.id}
                                    type="button"
                                    className={styles.paletteItem}
                                    style={
                                      group.accent
                                        ? ({
                                            ["--palette-accent" as string]: group.accent,
                                          } as CSSProperties)
                                        : undefined
                                    }
                                    label={action.label}
                                    iconId={action.icon ?? "primitive"}
                                    iconStyle="sticker"
                                    iconTintOverride={group.accent}
                                    iconSignature={createIconSignature(action.id)}
                                    hideLabel
                                    variant="palette"
                                    size="lg"
                                    shape="square"
                                    accentColor={group.accent}
                                    tooltip={action.tooltipContent ?? action.tooltip}
                                    tooltipPosition="bottom"
                                    tooltipMaxWidth={action.tooltipContent ? 300 : undefined}
                                    tooltipInteractive={Boolean(action.tooltipContent)}
                                    tooltipBoundaryRef={paletteRef}
                                    tooltipBoundaryPadding={8}
                                    disabled={action.isDisabled}
                                    onClick={action.onClick}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </aside>
              )}
            </div>
            <div
              className={styles.viewerInner}
              onContextMenu={(event) => event.preventDefault()}
              onPointerEnter={() => {
                viewerHoverRef.current = true;
              }}
              onPointerLeave={() => {
                viewerHoverRef.current = false;
              }}
              data-no-workspace-pan
              data-panel-drag="true"
              data-fullscreen={isFullscreen ? "true" : "false"}
            >
              {isFullscreen ? (
                <div className={styles.viewerGrid}>
                  {fullscreenViewports.map((viewport, index) => {
                    const cameraOverride = resolveViewportCamera(viewport);
                    return (
                      <div key={`${viewport}-${index}`} className={styles.viewerCell}>
                        <div className={styles.viewerCellLabel}>
                          <WebGLSelect
                            label="Viewport"
                            iconId="displayMode"
                            value={viewport}
                            size="xs"
                            variant="ghost"
                            className={styles.viewerCellSelect}
                            onChange={(event) =>
                              updateViewportSlot(
                                index,
                                event.target.value as ViewportKind
                              )
                            }
                            onPointerDown={(event) => event.stopPropagation()}
                            onPointerUp={(event) => event.stopPropagation()}
                            onPointerCancel={(event) => event.stopPropagation()}
                          >
                            {VIEWPORT_OPTIONS.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </WebGLSelect>
                        </div>
                        <WebGLViewerCanvas
                          activeCommandId={activeCommand?.id ?? null}
                          commandRequest={commandRequest}
                          primitiveSettings={primitiveSettings}
                          rectangleSettings={rectangleSettings}
                          circleSettings={circleSettings}
                          onCommandComplete={handleCommandComplete}
                          cameraOverride={cameraOverride ?? undefined}
                          onCameraStateChange={viewportCameraHandlers[viewport]}
                          isFullscreen={isFullscreen}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <WebGLViewerCanvas
                  activeCommandId={activeCommand?.id ?? null}
                  commandRequest={commandRequest}
                  primitiveSettings={primitiveSettings}
                  rectangleSettings={rectangleSettings}
                  circleSettings={circleSettings}
                  onCommandComplete={handleCommandComplete}
                  isFullscreen={isFullscreen}
                />
              )}
            </div>
            {isFullscreen && (
              <>
                {!minimapCollapsed ? (
                  <div
                    ref={minimapDockRef}
                    className={styles.numericaMinimap}
                    data-dragging={minimapDragging ? "true" : "false"}
                    data-no-workspace-pan
                    style={
                      minimapPosition
                        ? {
                            left: `${minimapPosition.x}px`,
                            top: `${minimapPosition.y}px`,
                            right: "auto",
                            bottom: "auto",
                          }
                        : undefined
                    }
                    onPointerDown={handleMinimapPointerDown}
                    onPointerMove={handleMinimapPointerMove}
                    onPointerUp={handleMinimapPointerUp}
                    onPointerCancel={handleMinimapPointerUp}
                  >
                    <div
                      className={styles.numericaMinimapHeader}
                      data-minimap-drag-handle="true"
                    >
                      <div className={styles.numericaMinimapLabel}>Numerica</div>
                      <IconButton
                        className={styles.numericaMinimapCollapse}
                        size="sm"
                        iconId="close"
                        label="Hide Numerica minimap"
                        tooltip="Hide Numerica minimap"
                        tooltipPosition="left"
                        onClick={() => setMinimapCollapsed(true)}
                        onPointerDown={(event) => event.stopPropagation()}
                        data-minimap-action="true"
                        style={{ width: 28, height: 28 }}
                      />
                    </div>
                    <div className={styles.numericaMinimapCanvas} ref={minimapRef}>
                      {minimapSize.width > 0 && minimapSize.height > 0 && (
                        <NumericalCanvas
                          width={minimapSize.width}
                          height={minimapSize.height}
                          mode="minimap"
                          enableMinimapPanZoom
                          hoverPopupsEnabled={false}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <WebGLButton
                    className={styles.numericaMinimapToggle}
                    label="Show Numerica minimap"
                    shortLabel="Numerica"
                    iconId="brandNumerica"
                    size="sm"
                    variant="chip"
                    shape="pill"
                    tooltip="Show Numerica minimap"
                    tooltipPosition="left"
                    onClick={() => setMinimapCollapsed(false)}
                  />
                )}
              </>
            )}
            <div
              className={styles.renderMaterialDock}
              data-open={renderPanelOpen ? "true" : "false"}
              data-no-workspace-pan
            >
              <button
                ref={renderTabRef}
                type="button"
                className={styles.renderMaterialTab}
                data-open={renderPanelOpen ? "true" : "false"}
                onClick={() => setRenderPanelOpen((prev) => !prev)}
              >
                Render/Material
              </button>
              <div
                ref={renderPanelRef}
                className={styles.renderMaterialPanel}
                data-open={renderPanelOpen ? "true" : "false"}
              >
                <div className={styles.renderMaterialHeader}>
                  <span>Render/Material</span>
                  <span className={styles.renderMaterialMeta}>
                    {materialPickerDisabled
                      ? "No selection"
                      : `${selectedGeometryIds.length} selected`}
                  </span>
                </div>
                <div className={styles.renderMaterialRow}>
                  <span className={styles.renderMaterialLabel}>Color</span>
                  <div className={styles.renderMaterialInlineControls}>
                    <div className={styles.renderMaterialWheelWrap}>
                      <button
                        type="button"
                        className={styles.renderMaterialWheel}
                        data-palette={renderFilter}
                        disabled={materialPickerDisabled}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (materialPickerDisabled) return;
                          setActiveColorWheel((prev) =>
                            prev === "material" ? null : "material"
                          );
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        onPointerUp={(event) => event.stopPropagation()}
                        onPointerCancel={(event) => event.stopPropagation()}
                        aria-label="Pick material color"
                      >
                        <span
                          className={styles.renderMaterialWheelDot}
                          style={{
                            background:
                              renderFilter === "silhouette"
                                ? "#000000"
                                : materialPickerHex,
                          }}
                        />
                      </button>
                      {activeColorWheel === "material" && (
                        <div
                          className={styles.renderMaterialWheelPopover}
                          data-palette={renderFilter}
                          onPointerDown={handleWheelPointerDown("material")}
                          onPointerMove={handleWheelPointerMove("material")}
                          onPointerUp={handleWheelPointerUp("material")}
                          onPointerCancel={handleWheelPointerUp("material")}
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.renderMaterialHex}>{materialPickerHex}</div>
                <div className={styles.renderMaterialDivider} />
                <div className={styles.renderMaterialGroup}>
                  <span className={styles.renderMaterialGroupLabel}>Filters</span>
                  <WebGLSelect
                    label="Filter"
                    iconId="displayMode"
                    value={renderFilter}
                    size="sm"
                    variant="command"
                    className={styles.renderMaterialControl}
                    onChange={handleRenderFilterChange}
                    onPointerDown={(event) => event.stopPropagation()}
                    onPointerUp={(event) => event.stopPropagation()}
                    onPointerCancel={(event) => event.stopPropagation()}
                  >
                    {RENDER_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </WebGLSelect>
                </div>
                <div className={styles.renderMaterialGroup}>
                  {renderFilter === "silhouette" ? (
                    <>
                      <div className={styles.renderMaterialSliderRow}>
                        <span className={styles.renderMaterialFieldLabel}>
                          {viewSliderLabel}
                        </span>
                        <WebGLSlider
                          label={viewSliderLabel}
                          tooltip={viewSliderTooltip}
                          iconId="displayMode"
                          value={viewSolidity}
                          min={0}
                          max={1}
                          step={0.00025}
                          onChange={setViewSolidity}
                          variant="command"
                          size="sm"
                          shape="rounded"
                          accentColor="#0b8a97"
                          className={styles.renderMaterialControl}
                          onPointerDown={(event) => event.stopPropagation()}
                          onPointerUp={(event) => event.stopPropagation()}
                          onPointerCancel={(event) => event.stopPropagation()}
                        />
                      </div>
                      <div className={styles.renderMaterialSliderRow}>
                        <span className={styles.renderMaterialFieldLabel}>Sheen</span>
                        <WebGLSlider
                          label="Sheen"
                          tooltip="Glossy highlight intensity (white light)."
                          iconId="sphere"
                          value={viewSettings.sheen ?? 0.08}
                          min={0}
                          max={0.15}
                          step={0.005}
                          onChange={(value) => setViewSettings({ sheen: value })}
                          variant="command"
                          size="sm"
                          shape="rounded"
                          accentColor="#f7f3ea"
                          className={styles.renderMaterialControl}
                          onPointerDown={(event) => event.stopPropagation()}
                          onPointerUp={(event) => event.stopPropagation()}
                          onPointerCancel={(event) => event.stopPropagation()}
                        />
                      </div>
                    </>
                  ) : (
                    activeRenderPaletteSliders.map((slider, index) => {
                      const sliderIndex = index as 0 | 1;
                      return (
                        <div
                          key={slider.label}
                          className={styles.renderMaterialSliderRow}
                        >
                          <span className={styles.renderMaterialFieldLabel}>
                            {slider.label}
                          </span>
                          <WebGLSlider
                            label={slider.label}
                            tooltip={slider.tooltip}
                            iconId={slider.iconId}
                            value={activeRenderPaletteValues[sliderIndex]}
                            min={slider.min}
                            max={slider.max}
                            step={slider.step}
                            onChange={(value) =>
                              handleRenderPaletteSliderChange(
                                renderPalette,
                                sliderIndex,
                                value
                              )
                            }
                            variant="command"
                            size="sm"
                            shape="rounded"
                            accentColor={slider.accentColor}
                            className={styles.renderMaterialControl}
                            disabled={materialPickerDisabled}
                            onPointerDown={(event) => event.stopPropagation()}
                            onPointerUp={(event) => event.stopPropagation()}
                            onPointerCancel={(event) => event.stopPropagation()}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {footerRoot && showStatusBar && createPortal(footerContent, footerRoot)}
    </>
  );
}

export default ModelerSection;
