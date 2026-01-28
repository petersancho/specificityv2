import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import WebGLViewerCanvas from "./WebGLViewerCanvas";
import { type WebGLTopBarAction, resolveTopBarShortLabel } from "./WebGLPanelTopBar";
import WebGLStatusFooter from "./WebGLStatusFooter";
import WebGLTitleLogo from "./WebGLTitleLogo";
import { NumericalCanvas } from "./workflow/NumericalCanvas";
import WebGLButton from "./ui/WebGLButton";
import IconButton from "./ui/IconButton";
import WebGLSlider from "./ui/WebGLSlider";
import { useProjectStore } from "../store/useProjectStore";
import styles from "./ModelerSection.module.css";
import {
  COMMAND_DEFINITIONS,
  COMMAND_PREFIX,
  parseCommandInput,
  type CommandDefinition,
} from "../commands/registry";
import { COMMAND_DESCRIPTIONS } from "../data/commandDescriptions";
import type {
  CameraState,
  CPlane,
  Geometry,
  GumballAlignment,
  PolylineGeometry,
  PrimitiveKind,
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
import { DEFAULT_PRIMITIVE_CONFIG } from "../geometry/mesh";
import { PRIMITIVE_COMMAND_IDS, PRIMITIVE_KIND_BY_COMMAND } from "../data/primitiveCatalog";
import { offsetPolyline2D } from "../geometry/booleans";
import type { IconId } from "../webgl/ui/WebGLIconRenderer";


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

const gumballAlignmentOptions = [
  {
    value: "boundingBox",
    label: "Bounding Box",
    iconId: "gumball",
    tooltip: "Align the gumball to the selection's bounding box.",
  },
  {
    value: "cplane",
    label: "C-Plane",
    iconId: "cplaneXY",
    tooltip: "Align the gumball to the active construction plane.",
  },
] as const;

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

const ROSLYN_PANEL_SCALE_KEY = "specificity.webglPanelScale";
const MIN_ROSLYN_PANEL_SCALE = 0.4;
const MAX_ROSLYN_PANEL_SCALE = 1.05;
const PANEL_SCALE_SPEED = 0.0015;
const ROSLYN_PALETTE_COLLAPSED_KEY = "specificity.roslynPaletteCollapsed";

const ROSLYN_PALETTE_SECTIONS: Array<{
  id: string;
  label: string;
  description: string;
  groups: string[];
}> = [
  {
    id: "geometry",
    label: "Geometry",
    description: "Primitives, curves, surfaces",
    groups: ["Primitive", "Curve", "Mesh"],
  },
  {
    id: "transform",
    label: "Transform",
    description: "Move, rotate, orient, pivot",
    groups: ["Transform", "Orientation", "Gumball", "Pivot"],
  },
  {
    id: "selection",
    label: "Selection",
    description: "Selection modes + C-Plane",
    groups: ["Selection", "C-Plane"],
  },
  {
    id: "workflow",
    label: "Workflow",
    description: "Reference + groups",
    groups: ["Workflow", "Groups"],
  },
  {
    id: "view",
    label: "View",
    description: "Camera + capture",
    groups: ["Camera", "View"],
  },
  {
    id: "edit",
    label: "Edit",
    description: "Undo, redo, duplicate",
    groups: ["Edit"],
  },
];

const ROSLYN_GROUP_ACCENTS: Record<string, string> = {
  Primitive: "#ff6040",
  Curve: "#1eb8a0",
  Mesh: "#4876ff",
  Transform: "#935eff",
  Edit: "#ff5c86",
  Selection: "#f6ac38",
  Orientation: "#42d28c",
  Gumball: "#35beff",
  Pivot: "#cc6aff",
  "C-Plane": "#5cd2bc",
  Workflow: "#9adb48",
  Groups: "#00b6a6",
  Camera: "#6299ff",
  View: "#b078ff",
};

const resolveRoslynGroupAccent = (label: string) =>
  ROSLYN_GROUP_ACCENTS[label] ?? "#343c4a";

type CommandRequest = {
  id: string;
  input: string;
  requestId: number;
};

type CommandSuggestion = {
  command: CommandDefinition;
  input: string;
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
};

const PRIMITIVE_COMMAND_ID_SET = new Set(PRIMITIVE_COMMAND_IDS);

const resolveCommandIconId = (commandId: string): IconId =>
  COMMAND_ICON_ID_MAP[commandId] ??
  (PRIMITIVE_COMMAND_ID_SET.has(commandId) ? "primitive" : (commandId as IconId));

const COMMAND_CATEGORY_TINTS = {
  primitive: "#ff6040",
  curve: "#1eb8a0",
  mesh: "#4876ff",
  neutral: "#343c4a",
} as const;

const PRIMITIVE_COMMANDS = new Set(["point", ...PRIMITIVE_COMMAND_IDS]);

const CURVE_COMMANDS = new Set([
  "line",
  "polyline",
  "rectangle",
  "circle",
  "arc",
  "curve",
  "interpolate",
]);

const MESH_COMMANDS = new Set(["surface", "loft", "extrude", "boolean"]);

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
  const pivot = useProjectStore((state) => state.pivot);
  const setPivotMode = useProjectStore((state) => state.setPivotMode);
  const setDisplayMode = useProjectStore((state) => state.setDisplayMode);
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
  const clipboard = useProjectStore((state) => state.clipboard);
  const setClipboard = useProjectStore((state) => state.setClipboard);
  const addGeometryItems = useProjectStore((state) => state.addGeometryItems);
  const addGeometryPolylineFromPoints = useProjectStore(
    (state) => state.addGeometryPolylineFromPoints
  );
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
    const stored = window.localStorage.getItem(ROSLYN_PANEL_SCALE_KEY);
    const parsed = stored ? Number(stored) : 0.85;
    if (!Number.isFinite(parsed)) return 0.85;
    return Math.min(
      MAX_ROSLYN_PANEL_SCALE,
      Math.max(MIN_ROSLYN_PANEL_SCALE, parsed)
    );
  });
  const [paletteCollapsed, setPaletteCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(ROSLYN_PALETTE_COLLAPSED_KEY) === "true";
  });
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
  const commandRequestIdRef = useRef(0);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const [footerRoot, setFooterRoot] = useState<HTMLElement | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const [minimapSize, setMinimapSize] = useState({ width: 0, height: 0 });
  const commandBarRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLElement | null>(null);

  const commandSuggestion = useMemo<CommandSuggestion | null>(() => {
    const raw = commandInput.trim();
    if (!raw) return null;
    const parsed = parseCommandInput(commandInput);
    if (parsed.command) return null;

    const normalized = raw.toLowerCase();
    const prefixMatch = normalized.match(COMMAND_PREFIX);
    const prefixLength = prefixMatch ? prefixMatch[0].length : 0;
    const prefix = prefixLength ? raw.slice(0, prefixLength) : "";
    const withoutPrefix = raw.slice(prefixLength).trim();
    if (!withoutPrefix) return null;

    const [token, ...rest] = withoutPrefix.split(/\s+/);
    if (!token) return null;
    const normalizedToken = token.toLowerCase();
    const match = COMMAND_DEFINITIONS.find(
      (command) =>
        command.id.startsWith(normalizedToken) ||
        command.label.toLowerCase().startsWith(normalizedToken)
    );
    if (!match) return null;

    const args = rest.join(" ");
    const suggestionInput = `${prefix}${match.id}${args ? ` ${args}` : ""}`.trim();
    return { command: match, input: suggestionInput };
  }, [commandInput]);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    setFooterRoot(document.getElementById("workspace-footer-root"));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ROSLYN_PANEL_SCALE_KEY, panelScale.toFixed(3));
  }, [panelScale]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      ROSLYN_PALETTE_COLLAPSED_KEY,
      String(paletteCollapsed)
    );
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
    if (!isFullscreen || typeof window === "undefined") return;
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
  }, [isFullscreen]);

  const clampPanelScale = (value: number) =>
    Math.min(MAX_ROSLYN_PANEL_SCALE, Math.max(MIN_ROSLYN_PANEL_SCALE, value));

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

  const viewDistance = useMemo(() => {
    const dx = cameraState.position.x - cameraState.target.x;
    const dy = cameraState.position.y - cameraState.target.y;
    const dz = cameraState.position.z - cameraState.target.z;
    return Math.max(0.1, Math.hypot(dx, dy, dz));
  }, [cameraState.position, cameraState.target]);

  const topCamera = useMemo<CameraState>(
    () => ({
      ...cameraState,
      position: {
        x: cameraState.target.x,
        y: cameraState.target.y + viewDistance,
        z: cameraState.target.z,
      },
      up: { x: 0, y: 0, z: 1 },
    }),
    [cameraState, viewDistance]
  );

  const leftCamera = useMemo<CameraState>(
    () => ({
      ...cameraState,
      position: {
        x: cameraState.target.x - viewDistance,
        y: cameraState.target.y,
        z: cameraState.target.z,
      },
      up: { x: 0, y: 1, z: 0 },
    }),
    [cameraState, viewDistance]
  );

  const rightCamera = useMemo<CameraState>(
    () => ({
      ...cameraState,
      position: {
        x: cameraState.target.x + viewDistance,
        y: cameraState.target.y,
        z: cameraState.target.z,
      },
      up: { x: 0, y: 1, z: 0 },
    }),
    [cameraState, viewDistance]
  );

  const selectedPolylines = useMemo(
    () =>
      selectedGeometryIds
        .map((id) => geometry.find((item) => item.id === id))
        .filter((item): item is PolylineGeometry => item?.type === "polyline"),
    [geometry, selectedGeometryIds]
  );

  const loftSelectionState = useMemo<{ ready: boolean; message: string }>(() => {
    if (selectionMode !== "object") {
      return {
        ready: false,
        message: "Switch the selection filter to Object to loft curves.",
      };
    }
    if (selectedPolylines.length === 0) {
      return { ready: false, message: "Select at least two polylines to loft." };
    }
    if (selectedPolylines.length === 1) {
      return { ready: false, message: "Select one more polyline to loft." };
    }
    return { ready: true, message: "" };
  }, [selectionMode, selectedPolylines.length]);

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
    selectedMaterial?.name ?? (materials.length === 0 ? "Loading..." : "Unassigned");

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
        (id) => geometry.find((item) => item.id === id)?.type === "polyline"
      ),
    [geometry, selectedGeometryIds]
  );

  const geometryMap = useMemo(
    () => new Map(geometry.map((item) => [item.id, item])),
    [geometry]
  );
  const vertexMap = useMemo(
    () =>
      new Map(
        geometry
          .filter((item) => item.type === "vertex")
          .map((item) => [item.id, item])
      ),
    [geometry]
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

  const selectionPoints = useMemo(() => {
    const points: Vec3[] = [];
    selectedGeometryIds.forEach((id) => {
      const item = geometryMap.get(id);
      if (!item) return;
      if (item.type === "vertex") {
        points.push(item.position);
        return;
      }
      if (item.type === "polyline") {
        item.vertexIds.forEach((vertexId) => {
          const vertex = vertexMap.get(vertexId);
          if (vertex) points.push(vertex.position);
        });
        return;
      }
      if ("mesh" in item) {
        for (let i = 0; i < item.mesh.positions.length; i += 3) {
          points.push({
            x: item.mesh.positions[i],
            y: item.mesh.positions[i + 1],
            z: item.mesh.positions[i + 2],
          });
        }
      }
    });
    return points;
  }, [geometryMap, vertexMap, selectedGeometryIds]);

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
      if (item.type === "vertex") {
        points.push(item.position);
        return;
      }
      if (item.type === "polyline") {
        item.vertexIds.forEach((vertexId) => {
          const vertex = vertexMap.get(vertexId);
          if (vertex) points.push(vertex.position);
        });
        return;
      }
      if ("mesh" in item) {
        for (let i = 0; i < item.mesh.positions.length; i += 3) {
          points.push({
            x: item.mesh.positions[i],
            y: item.mesh.positions[i + 1],
            z: item.mesh.positions[i + 2],
          });
        }
      }
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
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
  ]);

  const sceneNodeMap = useMemo(
    () => new Map(sceneNodes.map((node) => [node.id, node])),
    [sceneNodes]
  );

  const handleCapture = async () => {
    if (!viewerRef.current || !onCaptureRequest) return;
    const container = viewerRef.current;
    const prevStyles = {
      width: container.style.width,
      height: container.style.height,
      position: container.style.position,
      left: container.style.left,
      top: container.style.top,
      zIndex: container.style.zIndex,
    };
    container.classList.add(styles.captureActive);
    container.style.width = "1600px";
    container.style.height = "900px";
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.zIndex = "-1";
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
    resetCPlane(undefined, { recordHistory: false });
    setSnapSettings({ grid: true });
    setTransformOrientation("cplane");
  };

  const handleCommandClick = (command: CommandDefinition) => {
    if (command.id === "rectangle" || command.id === "circle") {
      ensurePlanarDefaults();
    }
    handleCommandSubmit(command.id);
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
      const commandKind = PRIMITIVE_KIND_BY_COMMAND.get(commandId);
      if (commandKind) {
        ensurePlanarDefaults();
        updatePrimitiveFromInput(rawInput, commandKind);
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
        if (lower.includes("vertex")) setSelectionMode("vertex");
        else if (lower.includes("edge")) setSelectionMode("edge");
        else if (lower.includes("face")) setSelectionMode("face");
        else setSelectionMode("object");
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
        if (lower.includes("wire")) setDisplayMode("wireframe");
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
        const dist = Math.max(
          0.1,
          Math.sqrt(
            Math.pow(cameraState.position.x - cameraState.target.x, 2) +
              Math.pow(cameraState.position.y - cameraState.target.y, 2) +
              Math.pow(cameraState.position.z - cameraState.target.z, 2)
          )
        );
        if (lower.includes("top")) {
          setCameraState({
            position: {
              x: cameraState.target.x,
              y: cameraState.target.y + dist,
              z: cameraState.target.z,
            },
          });
        } else if (lower.includes("front")) {
          setCameraState({
            position: {
              x: cameraState.target.x,
              y: cameraState.target.y,
              z: cameraState.target.z + dist,
            },
          });
        } else if (lower.includes("right")) {
          setCameraState({
            position: {
              x: cameraState.target.x + dist,
              y: cameraState.target.y,
              z: cameraState.target.z,
            },
          });
        } else if (lower.includes("persp")) {
          setCameraState({ fov: 28 });
        } else if (lower.includes("ortho")) {
          setCameraState({ fov: 20 });
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
      case "surface":
        return "Surface";
      case "loft":
        return "Loft";
      case "extrude":
        return "Extrude";
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

  const footerContent = (
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
          label: "Rotation Rings",
          checked: showRotationRings,
          onChange: setShowRotationRings,
        },
        {
          label: "90° Snap",
          checked: rotationSnapEnabled,
          onChange: handleRotationSnapToggle,
        },
      ]}
    />
  );

  const commandActions: WebGLTopBarAction[] = COMMAND_DEFINITIONS.map((command) => {
    const meta = COMMAND_DESCRIPTIONS[command.id];
    const shortcut = meta?.shortcut ? ` (${meta.shortcut})` : "";
    return {
      id: command.id,
      label: command.label,
      tooltip: `${meta?.description ?? command.prompt}${shortcut}`,
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
      onClick: () => setSelectionMode(option.value as typeof selectionMode),
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

  const gumballAlignmentActions: WebGLTopBarAction[] = gumballAlignmentOptions.map(
    (option) => ({
      id: `gumball-align-${option.value}`,
      label: option.label,
      tooltip: option.tooltip,
      onClick: () =>
        setGumballAlignment(option.value as typeof gumballAlignment),
      isActive: gumballAlignment === option.value,
      icon: option.iconId as IconId,
      iconTint: COMMAND_CATEGORY_TINTS.neutral,
      groupLabel: "Gumball",
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

  const captureAction: WebGLTopBarAction = {
    id: "capture",
    label: "Capture",
    tooltip: "Capture a render of the current viewport.",
    shortLabel: "CAP",
    onClick: handleCapture,
    isDisabled: captureDisabled,
    icon: "capture",
    iconTint: COMMAND_CATEGORY_TINTS.neutral,
    groupLabel: "View",
  };

  const paletteActions: WebGLTopBarAction[] = [
    ...commandActions,
    ...selectionModeActions,
    ...transformOrientationActions,
    ...gumballAlignmentActions,
    ...pivotModeActions,
    ...cplaneActions,
    ...workflowActions,
    ...groupActions,
    ...cameraActions,
    captureAction,
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
      <section className={styles.section}>
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
                  <input
                    ref={commandInputRef}
                    className={styles.commandInput}
                    value={commandInput}
                    onChange={(event) => {
                      setCommandInput(event.target.value);
                      if (commandError) setCommandError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleCommandSubmit(commandSuggestion?.input);
                      }
                    }}
                    placeholder="Command…"
                  />
                  <WebGLButton
                    type="button"
                    className={styles.commandActionPrimary}
                    onClick={() => handleCommandSubmit(commandSuggestion?.input)}
                    label="Run command"
                    shortLabel="Run"
                    iconId="run"
                    variant="primary"
                    accentColor="#00c2d1"
                    elevated
                    size="sm"
                    tooltip="Run command"
                  />
                </div>
                {commandError && (
                  <span className={styles.commandErrorText}>{commandError}</span>
                )}
                {!commandError && commandMatches.length > 0 && (
                  <div className={styles.commandSuggestions}>
                    <div className={styles.commandSuggestionsHeader}>
                      <span className={styles.commandSuggestionsLabel}>Suggestions</span>
                      {commandSuggestion && (
                        <span className={styles.commandSuggestionsHint}>
                          Enter to run {commandSuggestion.command.label}
                        </span>
                      )}
                    </div>
                    <div className={styles.commandSuggestionList}>
                      {commandMatches.map((command) => (
                        <button
                          key={command.id}
                          type="button"
                          className={styles.commandSuggestionItem}
                          onClick={() => {
                            const nextInput = buildSuggestionInput(command);
                            setCommandError("");
                            handleCommandSubmit(nextInput);
                            commandInputRef.current?.focus();
                          }}
                        >
                          <span className={styles.commandSuggestionName}>
                            {command.label}
                          </span>
                          <span className={styles.commandSuggestionMeta}>
                            {command.id}
                          </span>
                          <span className={styles.commandSuggestionPrompt}>
                            {command.prompt}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={styles.headerCluster}>
            <IconButton
              size="sm"
              label="Capture viewport"
              iconId="capture"
              tooltip="Capture a render of the current viewport"
              tooltipPosition="bottom"
              onClick={handleCapture}
              disabled={captureDisabled}
            />
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
                                    shortLabel={resolveTopBarShortLabel(action)}
                                    iconId={action.icon ?? "primitive"}
                                    variant="palette"
                                    shape="square"
                                    accentColor={group.accent}
                                    tooltip={action.tooltip}
                                    tooltipPosition="bottom"
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
              data-no-workspace-pan
              data-panel-drag="true"
              data-fullscreen={isFullscreen ? "true" : "false"}
            >
              {isFullscreen ? (
                <div className={styles.viewerGrid}>
                  <div className={styles.viewerCell}>
                    <div className={styles.viewerCellLabel}>Axonometric</div>
                    <WebGLViewerCanvas
                      activeCommandId={activeCommand?.id ?? null}
                      commandRequest={commandRequest}
                      primitiveSettings={primitiveSettings}
                      rectangleSettings={rectangleSettings}
                      circleSettings={circleSettings}
                      onCommandComplete={handleCommandComplete}
                    />
                  </div>
                  <div className={`${styles.viewerCell} ${styles.viewerCellPassive}`}>
                    <div className={styles.viewerCellLabel}>Top</div>
                    <WebGLViewerCanvas
                      activeCommandId={activeCommand?.id ?? null}
                      commandRequest={commandRequest}
                      primitiveSettings={primitiveSettings}
                      rectangleSettings={rectangleSettings}
                      circleSettings={circleSettings}
                      onCommandComplete={handleCommandComplete}
                      cameraOverride={topCamera}
                      interactionsEnabled={false}
                    />
                  </div>
                  <div className={`${styles.viewerCell} ${styles.viewerCellPassive}`}>
                    <div className={styles.viewerCellLabel}>Left</div>
                    <WebGLViewerCanvas
                      activeCommandId={activeCommand?.id ?? null}
                      commandRequest={commandRequest}
                      primitiveSettings={primitiveSettings}
                      rectangleSettings={rectangleSettings}
                      circleSettings={circleSettings}
                      onCommandComplete={handleCommandComplete}
                      cameraOverride={leftCamera}
                      interactionsEnabled={false}
                    />
                  </div>
                  <div className={`${styles.viewerCell} ${styles.viewerCellPassive}`}>
                    <div className={styles.viewerCellLabel}>Right</div>
                    <WebGLViewerCanvas
                      activeCommandId={activeCommand?.id ?? null}
                      commandRequest={commandRequest}
                      primitiveSettings={primitiveSettings}
                      rectangleSettings={rectangleSettings}
                      circleSettings={circleSettings}
                      onCommandComplete={handleCommandComplete}
                      cameraOverride={rightCamera}
                      interactionsEnabled={false}
                    />
                  </div>
                </div>
              ) : (
                <WebGLViewerCanvas
                  activeCommandId={activeCommand?.id ?? null}
                  commandRequest={commandRequest}
                  primitiveSettings={primitiveSettings}
                  rectangleSettings={rectangleSettings}
                  circleSettings={circleSettings}
                  onCommandComplete={handleCommandComplete}
                />
              )}
            </div>
            {isFullscreen && (
              <div className={styles.numericaMinimap} aria-hidden="true">
                <div className={styles.numericaMinimapLabel}>Numerica</div>
                <div className={styles.numericaMinimapCanvas} ref={minimapRef}>
                  {minimapSize.width > 0 && minimapSize.height > 0 && (
                    <NumericalCanvas
                      width={minimapSize.width}
                      height={minimapSize.height}
                      mode="minimap"
                    />
                  )}
                </div>
              </div>
            )}
            <div className={styles.viewerModeCorner} data-no-workspace-pan>
              <WebGLSlider
                label="View"
                tooltip="Slide between Solid, Ghosted, and Wireframe."
                iconId="displayMode"
                value={viewSolidity}
                min={0}
                max={1}
                step={0.00025}
                onChange={setViewSolidity}
                variant="command"
                size="sm"
                shape="rounded"
                accentColor="#00c2d1"
                className={styles.viewerModeControl}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onPointerCancel={(event) => event.stopPropagation()}
              />
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
                className={styles.viewerModeControl}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onPointerCancel={(event) => event.stopPropagation()}
              />
            </div>
          </div>
        </div>
      </section>
      {footerRoot && showStatusBar && createPortal(footerContent, footerRoot)}
    </>
  );
}

export default ModelerSection;
