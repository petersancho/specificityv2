import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useProjectStore } from "../store/useProjectStore";
import { GeometryRenderAdapter, createLineBufferData, type RenderableGeometry } from "../geometry/renderAdapter";
import { computeArcPolyline, createArcNurbs, createCircleNurbs } from "../geometry/arc";
import {
  createNurbsCurveFromPoints,
  interpolateNurbsCurve,
  refineRaySurfaceIntersection,
} from "../geometry/nurbs";
import {
  createNurbsBoxSurfaces,
  createNurbsCylinderSurface,
  createNurbsSphereSurface,
} from "../geometry/nurbsPrimitives";
import {
  hitTestComponent,
  hitTestObject,
  type HitTestResult,
} from "../geometry/hitTest";
import { tessellateCurveAdaptive, tessellateSurfaceAdaptive } from "../geometry/tessellation";
import { tessellateBRepToMesh } from "../geometry/brep";
import {
  add,
  centroid,
  computeBestFitPlane,
  cross,
  distance,
  dot,
  length,
  normalize,
  projectPointToPlane,
  scale,
  sub,
  unprojectPointFromPlane,
} from "../geometry/math";
import {
  basisFromPlane,
  fromBasis,
  rotateAroundAxis,
  scaleAroundPivot,
  translatePoint,
  type Basis,
  WORLD_BASIS,
} from "../geometry/transform";
import {
  DEFAULT_PRIMITIVE_CONFIG,
  computeVertexNormals,
  generatePrimitiveMesh,
  type PrimitiveMeshConfig,
} from "../geometry/mesh";
import { hexToRgb, normalizeRgbInput } from "../utils/color";
import {
  normalizePaletteValues,
  resolvePaletteColor,
  resolvePaletteShading,
  type RenderPaletteId,
} from "../utils/renderPalette";
import { PRIMITIVE_COMMAND_IDS } from "../data/primitiveCatalog";
import { WebGLRenderer, type Camera } from "../webgl/WebGLRenderer";
import {
  VIEW_STYLE,
  adjustForSelection,
  clamp01,
  darkenColor,
  lerp,
  mixColor,
  smoothstep,
} from "../webgl/viewProfile";
import {
  createGumballPickMeshes,
  createGumballBuffers,
  disposeGumballBuffers,
  GUMBALL_AXIS_COLORS,
  GUMBALL_METRICS,
  GUMBALL_PLANE_COLORS,
  GUMBALL_UNIFORM_SCALE_COLOR,
  getGumballTransforms,
  type GumballHandleId,
  type GumballMode,
  renderGumball,
  type GumballBuffers,
} from "../webgl/gumball";
import type {
  CameraState,
  ComponentSelection,
  Geometry,
  ModelerSnapshot,
  NURBSCurve,
  NURBSSurface,
  PolylineGeometry,
  RenderMesh,
  TransformMode,
  TransformOrientation,
  Vec3,
  VertexGeometry,
} from "../types";
import type { GeometryBuffer } from "../webgl/BufferManager";

const ORBIT_SPEED = 0.006;
const PAN_SPEED = 0.0025;
const ZOOM_SPEED = 0.001;
const MIN_DISTANCE = 0.4;
const MAX_DISTANCE = 120;
const GRID_EXTENT_MULTIPLIER = 120;
const GRID_MINOR_STEP = 1;
const GRID_OFFSET_Y = -0.002;
const SELECTION_DRAG_THRESHOLD = 8;
const PICK_PIXEL_THRESHOLD = 20;
const EDGE_PIXEL_THRESHOLD = 16;
const COMPONENT_PICK_PIXEL_THRESHOLD = 26;
const COMPONENT_EDGE_PIXEL_THRESHOLD = 20;
const COMPONENT_POINT_PICK_RADIUS_PX = 14;
const POINT_HANDLE_RADIUS_PX = 6;
const POINT_HANDLE_OUTLINE_PX = 1.5;
const POINT_HANDLE_PICK_RADIUS_PX = 11;
const POINT_DRAG_THRESHOLD = 4;
const PREVIEW_LINE_ID = "__preview-line";
const PREVIEW_MESH_ID = "__preview-mesh";
const PREVIEW_EDGE_ID = "__preview-mesh-edges";
const HOVER_LINE_ID = "__hover-line";

const resolveViewerDpr = () => {
  if (typeof window === "undefined") return 1;
  const baseDpr = window.devicePixelRatio || 1;
  const scaled = baseDpr * (VIEW_STYLE.renderQualityScale ?? 1);
  const maxDpr = VIEW_STYLE.maxRenderDpr ?? scaled;
  return Math.min(scaled, maxDpr);
};
const HOVER_FACE_ID = "__hover-face";
const GUMBALL_HOVER_PREVIEW_ID = "__gumball_hover_preview";
const SELECTED_LINE_ID = "__selected-line";
const SELECTED_FACE_ID = "__selected-face";
const SELECTED_POINT_ID = "__selected-point";
const GUMBALL_PIXEL_SIZE = 150;
const GUMBALL_FULLSCREEN_SCALE = 0.9;
const GUMBALL_VIEWPORT_ZOOM_MIN = 0.45;
const GUMBALL_VIEWPORT_ZOOM_MAX = 2.6;
const GUMBALL_PROMPT_FADE_DELAY = 520;
const GUMBALL_PROMPT_REMOVE_DELAY = 820;
const GUMBALL_CLICK_THRESHOLD = 2;
const GUMBALL_STEP_DEFAULT_DISTANCE = 1;
const GUMBALL_STEP_DEFAULT_ANGLE = 1;
const BOUNDING_BOX_COLOR: [number, number, number] = [0.95, 0.86, 0.35];
const SILHOUETTE_BASE_COLOR: [number, number, number] = [0, 0, 0];
const SILHOUETTE_SELECTED_COLOR: [number, number, number] = [0.2, 0.2, 0.2];
const POINT_FILL_COLOR: [number, number, number] = [1, 0.82, 0.16];
const POINT_OUTLINE_COLOR: [number, number, number] = [0, 0, 0];

const SNAP_COLORS: Record<string, string> = {
  grid: "#9a9a96",
  vertex: "#fdfdfc",
  endpoint: "#fdfdfc",
  midpoint: "#c2c2be",
  intersection: "#f6f6f4",
  perpendicular: "#dededb",
  tangent: "#efefed",
};

const GUMBALL_PICK_MESHES = createGumballPickMeshes();

type CustomMaterialOverrides = {
  color?: [number, number, number];
  ambientStrength?: number;
  sheenIntensity?: number;
};

const resolveCustomMaterialOverrides = (metadata?: Geometry["metadata"]) => {
  if (!metadata || typeof metadata !== "object") return null;
  const custom = (metadata as { customMaterial?: unknown }).customMaterial;
  if (!custom || typeof custom !== "object") return null;
  const record = custom as {
    color?: unknown;
    hex?: unknown;
    palette?: unknown;
    paletteValues?: unknown;
    paletteSwatch?: unknown;
  };
  const baseColor = normalizeRgbInput(record.color);
  const hexColor = typeof record.hex === "string" ? hexToRgb(record.hex) : null;
  const palette =
    typeof record.palette === "string"
      ? (record.palette as RenderPaletteId)
      : null;
  const paletteValues = normalizePaletteValues(record.paletteValues);
  const paletteSwatch = typeof record.paletteSwatch === "string" ? record.paletteSwatch : null;

  let color = baseColor ?? hexColor ?? null;
  let ambientStrength: number | undefined;
  let sheenIntensity: number | undefined;

  if (palette && paletteValues) {
    if (!color) {
      const paletteColor = resolvePaletteColor({
        palette,
        values: paletteValues,
        swatch: paletteSwatch,
        baseColor: color,
      });
      if (paletteColor) {
        color = paletteColor;
      }
    }
    const shading = resolvePaletteShading(palette, paletteValues);
    ambientStrength = shading.ambientStrength;
    sheenIntensity = shading.sheenIntensity;
  }

  if (!color && ambientStrength == null && sheenIntensity == null) return null;

  return {
    color: color ?? undefined,
    ambientStrength,
    sheenIntensity,
  } as CustomMaterialOverrides;
};

type PrimitiveSettings = PrimitiveMeshConfig;

type RectangleSettings = {
  width: number;
  height: number;
};

type CircleSettings = {
  radius: number;
  segments: number;
};

type CurveSettings = {
  degree: 1 | 2 | 3;
  resolution: number;
  closed: boolean;
  interpolate: boolean;
};

const DEFAULT_PRIMITIVE_SETTINGS: PrimitiveSettings = DEFAULT_PRIMITIVE_CONFIG;

const DEFAULT_RECTANGLE_SETTINGS: RectangleSettings = {
  width: 1.6,
  height: 1,
};

const DEFAULT_CIRCLE_SETTINGS: CircleSettings = {
  radius: 0.8,
  segments: 32,
};

const DEFAULT_CURVE_SETTINGS: CurveSettings = {
  degree: 3,
  resolution: 64,
  closed: false,
  interpolate: false,
};

const PRIMITIVE_COMMAND_SET = new Set(PRIMITIVE_COMMAND_IDS);
const NURBS_PRIMITIVE_COMMAND_IDS = ["nurbsbox", "nurbssphere", "nurbscylinder"] as const;
const NURBS_PRIMITIVE_COMMAND_SET = new Set<string>(NURBS_PRIMITIVE_COMMAND_IDS);

const isPrimitiveCommand = (commandId?: string | null) =>
  Boolean(
    commandId &&
      (PRIMITIVE_COMMAND_SET.has(commandId) || NURBS_PRIMITIVE_COMMAND_SET.has(commandId))
  );

const isNurbsPrimitiveCommand = (commandId?: string | null) =>
  Boolean(commandId && NURBS_PRIMITIVE_COMMAND_SET.has(commandId));

type ViewerCanvasProps = {
  activeCommandId?: string | null;
  commandRequest?: { id: string; input: string; requestId: number } | null;
  primitiveSettings?: unknown;
  rectangleSettings?: unknown;
  circleSettings?: unknown;
  onCommandComplete?: (commandId: string) => void;
  cameraOverride?: CameraState | null;
  onCameraStateChange?: (stateUpdate: Partial<CameraState>) => void;
  interactionsEnabled?: boolean;
  isFullscreen?: boolean;
};

type DragState =
  | {
      mode: "orbit" | "pan";
      pointer: { x: number; y: number };
      startCamera: { position: Vec3; target: Vec3 };
      startAngles: { theta: number; phi: number; radius: number };
    }
  | { mode: "none" };

type PreviewState =
  | { kind: "line"; points: Vec3[]; closed: boolean }
  | { kind: "mesh"; mesh: RenderMesh }
  | null;

type SelectionDragState = {
  pointerId: number;
  start: { x: number; y: number };
  current: { x: number; y: number };
  isBoxSelection: boolean;
  shiftKey: boolean;
  ctrlShiftKey: boolean;
  componentKind?: "vertex" | "edge" | "face";
};

type PointDragState = {
  pointerId: number;
  startPointer: { x: number; y: number };
  moved: boolean;
};

type PointHandleHover = {
  id: string;
  position: Vec3;
  screen: { x: number; y: number; depth: number };
  distance: number;
};

type SelectionBounds = {
  corners: Vec3[];
};

type PickResult = HitTestResult;

type ScreenRect = { x: number; y: number; width: number; height: number };

type GumballHandle =
  | { kind: "axis"; axis: "x" | "y" | "z" }
  | { kind: "plane"; plane: "xy" | "yz" | "xz" }
  | { kind: "rotate"; axis: "x" | "y" | "z" }
  | { kind: "scale"; axis?: "x" | "y" | "z"; uniform?: boolean }
  | { kind: "pivot" }
  | {
      kind: "extrude";
      geometryId: string;
      faceIndex: number;
      vertexIndices: [number, number, number];
      center: Vec3;
      normal: Vec3;
    };

type GumballDragState = {
  pointerId: number;
  handle: GumballHandle;
  handleId: GumballHandleId | null;
  startPointer: { x: number; y: number };
  moved: boolean;
};

type TransformConstraint =
  | { kind: "axis"; axis: "x" | "y" | "z" }
  | { kind: "plane"; plane: "xy" | "yz" | "xz" }
  | { kind: "screen" }
  | { kind: "free" };

type TransformTargets = {
  vertexIds: string[];
  meshTargets: Map<string, { positions: number[]; indices: number[] }>;
};

type TransformSession = {
  mode: TransformMode;
  orientation: TransformOrientation;
  constraint: TransformConstraint;
  pivot: Vec3;
  basis: Basis;
  axis?: Vec3;
  plane?: { origin: Vec3; normal: Vec3 };
  startPoint?: Vec3;
  startVector?: Vec3;
  startDistance?: number;
  targets: TransformTargets;
  startVertexPositions: Map<string, Vec3>;
  startMeshPositions: Map<string, number[]>;
  meshExtras: Map<string, { normals: number[]; uvs: number[]; indices: number[] }>;
  historySnapshot: ModelerSnapshot;
  typedDelta?: Vec3;
  typedAngle?: number;
  typedScale?: Vec3;
  scaleMode?: "uniform" | "axis";
  scaleAxis?: "x" | "y" | "z";
};

type TransformPreview = {
  delta?: Vec3;
  angle?: number;
  scale?: Vec3;
  distance?: number;
};

type ExtrudeHandle = {
  geometryId: string;
  faceIndex: number;
  vertexIndices: [number, number, number];
  center: Vec3;
  normal: Vec3;
};

type ExtrudeSession = {
  handles: ExtrudeHandle[];
  axis: Vec3;
  plane: { origin: Vec3; normal: Vec3 };
  startPoint: Vec3;
  startDistance: number;
  baseMeshes: Map<
    string,
    { positions: number[]; indices: number[]; normals: number[]; uvs: number[] }
  >;
  historySnapshot: ModelerSnapshot;
};

type TransformInputState = {
  mode: "move" | "rotate" | "scale" | "extrude";
  x?: string;
  y?: string;
  z?: string;
  angle?: string;
  scale?: string;
  scaleMode?: "uniform" | "axis";
  scaleAxis?: "x" | "y" | "z";
  distance?: string;
};

type SnapIndicator = {
  point: Vec3;
  type: string;
};

type SnapCandidate = {
  point: Vec3;
  type: string;
  distance: number;
};

type SnapCycleState = {
  candidates: SnapCandidate[];
  index: number;
  basePoint: Vec3 | null;
};

type GumballState = {
  selectionPoints: Vec3[];
  orientation: Basis;
  pivot: Vec3;
  mode: GumballMode | null;
  visible: boolean;
};

type PolylineRenderData = {
  points: Vec3[];
  parameters: number[];
  curve: NURBSCurve | null;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const computeGumballScale = (
  camera: { position: Vec3; fov: number },
  pivot: Vec3,
  viewportHeight: number,
  pixelSize = GUMBALL_PIXEL_SIZE
) => {
  const distanceValue = length(sub(camera.position, pivot));
  const safeDistance = Math.max(distanceValue, 0.01);
  const fovRad = toRadians(camera.fov);
  const height = 2 * Math.tan(fovRad * 0.5) * safeDistance;
  const worldPerPixel = height / Math.max(viewportHeight, 1);
  return worldPerPixel * pixelSize;
};

const GUMBALL_WIDGET_SCALE = 0.82;
const GUMBALL_WIDGET_PADDING = 0.24;

const computeCornerGumballViewport = (
  camera: { position: Vec3; target: Vec3; up: Vec3; fov: number },
  canvas: HTMLCanvasElement,
  zoom = 1,
  pixelSize = GUMBALL_PIXEL_SIZE
) => {
  const viewDir = normalize(sub(camera.target, camera.position));
  const depth = Math.max(length(sub(camera.position, camera.target)), 0.1);
  const fovRad = toRadians(camera.fov);
  const viewHeight = 2 * Math.tan(fovRad * 0.5) * depth;
  const viewWidth = viewHeight * (canvas.width / Math.max(canvas.height, 1));
  let up = normalize(camera.up);
  if (length(up) < 1e-6) {
    up = { x: 0, y: 1, z: 0 };
  }
  let right = cross(viewDir, up);
  if (length(right) < 1e-6) {
    const fallback = Math.abs(viewDir.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    right = cross(viewDir, fallback);
  }
  right = normalize(right);
  const screenUp = normalize(cross(right, viewDir));
  const viewBasis = { xAxis: right, yAxis: screenUp, zAxis: viewDir };

  const worldPerPixel = viewHeight / Math.max(canvas.height, 1);
  const baseScale = worldPerPixel * pixelSize * GUMBALL_WIDGET_SCALE;
  const safeZoom = clamp(zoom, GUMBALL_VIEWPORT_ZOOM_MIN, GUMBALL_VIEWPORT_ZOOM_MAX);
  const scaleValue = baseScale * safeZoom;

  const gumballRadius = Math.max(
    GUMBALL_METRICS.axisLength,
    GUMBALL_METRICS.rotateRadius + GUMBALL_METRICS.rotateTube,
    GUMBALL_METRICS.scaleHandleOffset + GUMBALL_METRICS.scaleHandleSize * 0.6,
    GUMBALL_METRICS.planeOffset + GUMBALL_METRICS.planeSize
  );
  const ringMargin = (gumballRadius + GUMBALL_WIDGET_PADDING) * scaleValue;
  const offsetX = Math.max(0, viewWidth * 0.5 - ringMargin);
  const offsetY = Math.max(0, viewHeight * 0.5 - ringMargin);
  const center = add(
    add(add(camera.position, scale(viewBasis.zAxis, depth)), scale(viewBasis.xAxis, offsetX)),
    scale(viewBasis.yAxis, offsetY)
  );
  return { center, scale: scaleValue, basis: viewBasis, radius: gumballRadius * scaleValue };
};

const computeGumballViewportScreenRect = (
  camera: { position: Vec3; target: Vec3; up: Vec3; fov: number },
  canvas: HTMLCanvasElement,
  zoom: number,
  pixelSize = GUMBALL_PIXEL_SIZE
): ScreenRect | null => {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  const cameraPayload = toCamera({
    position: camera.position,
    target: camera.target,
    up: camera.up,
    fov: camera.fov,
    aspect: rect.width / rect.height,
  });
  const viewProjection = multiplyMatrices(
    computeProjectionMatrix(cameraPayload),
    computeViewMatrix(cameraPayload)
  );

  const widgetState = computeCornerGumballViewport(camera, canvas, zoom, pixelSize);
  const worldPerPixel = widgetState.scale / pixelSize;
  const panelPadding = worldPerPixel * 6;
  const panelScale = widgetState.radius + panelPadding;
  const panelDepth = worldPerPixel * 6;
  const panelCenter = add(widgetState.center, scale(widgetState.basis.zAxis, panelDepth));
  const right = scale(widgetState.basis.xAxis, panelScale);
  const up = scale(widgetState.basis.yAxis, panelScale);
  const corners = [
    add(add(panelCenter, right), up),
    add(add(panelCenter, right), scale(up, -1)),
    add(add(panelCenter, scale(right, -1)), up),
    add(add(panelCenter, scale(right, -1)), scale(up, -1)),
  ];
  const projected = corners
    .map((corner) => projectPointToScreen(corner, viewProjection, rect))
    .filter((point): point is ScreenPoint => Boolean(point));
  if (projected.length === 0) return null;

  const minX = Math.min(...projected.map((point) => point.x));
  const maxX = Math.max(...projected.map((point) => point.x));
  const minY = Math.min(...projected.map((point) => point.y));
  const maxY = Math.max(...projected.map((point) => point.y));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const buildViewBasis = (cameraState: {
  position: Vec3;
  target: Vec3;
  up: Vec3;
}): Basis => {
  const viewDir = normalize(sub(cameraState.target, cameraState.position));
  if (length(viewDir) < 1e-6) {
    return WORLD_BASIS;
  }
  let up = normalize(cameraState.up);
  if (length(up) < 1e-6) {
    up = { x: 0, y: 1, z: 0 };
  }
  let xAxis = cross(up, viewDir);
  if (length(xAxis) < 1e-6) {
    const fallback = Math.abs(viewDir.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    xAxis = cross(fallback, viewDir);
  }
  xAxis = normalize(xAxis);
  const yAxis = normalize(cross(viewDir, xAxis));
  return { xAxis, yAxis, zAxis: viewDir };
};

const buildBasisFromNormal = (normal: Vec3): Basis => {
  const n = normalize(normal);
  if (length(n) < 1e-6) {
    return WORLD_BASIS;
  }
  const reference =
    Math.abs(n.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const xAxis = normalize(cross(reference, n));
  const zAxis = normalize(cross(n, xAxis));
  return { xAxis, yAxis: n, zAxis };
};

const jacobiEigenDecomposition = (matrix: number[][]) => {
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const a = matrix.map((row) => [...row]);
  const maxIterations = 32;
  for (let iter = 0; iter < maxIterations; iter += 1) {
    let p = 0;
    let q = 1;
    let max = Math.abs(a[p][q]);
    for (let i = 0; i < 3; i += 1) {
      for (let j = i + 1; j < 3; j += 1) {
        const value = Math.abs(a[i][j]);
        if (value > max) {
          max = value;
          p = i;
          q = j;
        }
      }
    }
    if (max < 1e-10) break;
    const theta = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const app = a[p][p];
    const aqq = a[q][q];
    const apq = a[p][q];
    a[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    a[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    a[p][q] = 0;
    a[q][p] = 0;
    for (let i = 0; i < 3; i += 1) {
      if (i === p || i === q) continue;
      const aip = a[i][p];
      const aiq = a[i][q];
      a[i][p] = c * aip - s * aiq;
      a[p][i] = a[i][p];
      a[i][q] = s * aip + c * aiq;
      a[q][i] = a[i][q];
    }
    for (let i = 0; i < 3; i += 1) {
      const vip = v[i][p];
      const viq = v[i][q];
      v[i][p] = c * vip - s * viq;
      v[i][q] = s * vip + c * viq;
    }
  }
  return { values: [a[0][0], a[1][1], a[2][2]], vectors: v };
};

const computePrincipalBasis = (points: Vec3[]): Basis | null => {
  if (points.length < 3) return null;
  const center = centroid(points);
  let cxx = 0;
  let cxy = 0;
  let cxz = 0;
  let cyy = 0;
  let cyz = 0;
  let czz = 0;
  points.forEach((point) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const dz = point.z - center.z;
    cxx += dx * dx;
    cxy += dx * dy;
    cxz += dx * dz;
    cyy += dy * dy;
    cyz += dy * dz;
    czz += dz * dz;
  });
  const { values, vectors } = jacobiEigenDecomposition([
    [cxx, cxy, cxz],
    [cxy, cyy, cyz],
    [cxz, cyz, czz],
  ]);
  const order = [0, 1, 2].sort((a, b) => values[b] - values[a]);
  const sortedValues = order.map((index) => values[index]);
  const maxValue = sortedValues[0] ?? 0;
  const midValue = sortedValues[1] ?? 0;
  const minValue = sortedValues[2] ?? 0;
  const valueSpan = Math.max(maxValue, 1e-12);
  const nearIsotropic = Math.abs(maxValue - minValue) / valueSpan < 0.03;
  if (nearIsotropic) {
    return WORLD_BASIS;
  }
  const planarAmbiguous =
    Math.abs(maxValue - midValue) / valueSpan < 0.03 && minValue / valueSpan < 0.03;
  if (planarAmbiguous) {
    return null;
  }
  const axisFromIndex = (index: number) =>
    normalize({ x: vectors[0][index], y: vectors[1][index], z: vectors[2][index] });
  const xAxis = axisFromIndex(order[0]);
  const yAxis = axisFromIndex(order[1]);
  let zAxis = axisFromIndex(order[2]);
  if (length(xAxis) < 1e-6 || length(yAxis) < 1e-6 || length(zAxis) < 1e-6) {
    return null;
  }
  const crossAxis = cross(xAxis, yAxis);
  if (length(crossAxis) < 1e-6) {
    return null;
  }
  if (dot(crossAxis, zAxis) < 0) {
    zAxis = scale(zAxis, -1);
  }
  return { xAxis, yAxis, zAxis };
};

const buildModelMatrix = (basis: Basis, position: Vec3, scaleValue: number) =>
  new Float32Array([
    basis.xAxis.x * scaleValue,
    basis.yAxis.x * scaleValue,
    basis.zAxis.x * scaleValue,
    0,
    basis.xAxis.y * scaleValue,
    basis.yAxis.y * scaleValue,
    basis.zAxis.y * scaleValue,
    0,
    basis.xAxis.z * scaleValue,
    basis.yAxis.z * scaleValue,
    basis.zAxis.z * scaleValue,
    0,
    position.x,
    position.y,
    position.z,
    1,
  ]);

const toCamera = (state: {
  position: Vec3;
  target: Vec3;
  up: Vec3;
  fov: number;
  aspect: number;
}): Camera => ({
  position: [state.position.x, state.position.y, state.position.z],
  target: [state.target.x, state.target.y, state.target.z],
  up: [state.up.x, state.up.y, state.up.z],
  fov: toRadians(state.fov),
  aspect: state.aspect,
  near: 0.05,
  far: 200,
});

const getSpherical = (position: Vec3, target: Vec3) => {
  const offset = sub(position, target);
  const radius = length(offset) || 1;
  const theta = Math.atan2(offset.x, offset.z);
  const phi = Math.acos(clamp(offset.y / radius, -0.999, 0.999));
  return { radius, theta, phi };
};

const fromSpherical = (target: Vec3, radius: number, theta: number, phi: number): Vec3 => ({
  x: target.x + radius * Math.sin(phi) * Math.sin(theta),
  y: target.y + radius * Math.cos(phi),
  z: target.z + radius * Math.sin(phi) * Math.cos(theta),
});

const getCameraAxes = (position: Vec3, target: Vec3, up: Vec3) => {
  const forward = normalize(sub(target, position));
  const right = normalize(cross(forward, up));
  const trueUp = normalize(cross(right, forward));
  return { right, up: trueUp };
};

const asVertexSelection = (
  selection: ComponentSelection
): Extract<ComponentSelection, { kind: "vertex" }> | null =>
  selection.kind === "vertex" ? selection : null;

const asEdgeSelection = (
  selection: ComponentSelection
): Extract<ComponentSelection, { kind: "edge" }> | null =>
  selection.kind === "edge" ? selection : null;

const asFaceSelection = (
  selection: ComponentSelection
): Extract<ComponentSelection, { kind: "face" }> | null =>
  selection.kind === "face" ? selection : null;

const getMeshPoint = (mesh: RenderMesh, index: number): Vec3 => ({
  x: mesh.positions[index * 3],
  y: mesh.positions[index * 3 + 1],
  z: mesh.positions[index * 3 + 2],
});

type Ray = { origin: Vec3; dir: Vec3 };

type ScreenPoint = { x: number; y: number; depth: number };

const multiplyMatrices = (a: Float32Array, b: Float32Array) => {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col += 1) {
    const colOffset = col * 4;
    for (let row = 0; row < 4; row += 1) {
      out[colOffset + row] =
        a[row] * b[colOffset] +
        a[row + 4] * b[colOffset + 1] +
        a[row + 8] * b[colOffset + 2] +
        a[row + 12] * b[colOffset + 3];
    }
  }
  return out;
};

const computeViewMatrix = (camera: Camera) => {
  const EPS = 1e-6;
  const [ex, ey, ez] = camera.position;
  const [cx, cy, cz] = camera.target;
  const [ux, uy, uz] = camera.up;

  let zx = ex - cx;
  let zy = ey - cy;
  let zz = ez - cz;
  let zlen = Math.sqrt(zx * zx + zy * zy + zz * zz);
  if (zlen < EPS) {
    zx = 0;
    zy = 0;
    zz = 1;
    zlen = 1;
  }
  const znx = zx / zlen;
  const zny = zy / zlen;
  const znz = zz / zlen;

  let xx = uy * znz - uz * zny;
  let xy = uz * znx - ux * znz;
  let xz = ux * zny - uy * znx;
  let xlen = Math.sqrt(xx * xx + xy * xy + xz * xz);
  if (xlen < EPS) {
    const fallbackUp = Math.abs(zny) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const [fux, fuy, fuz] = fallbackUp;
    xx = fuy * znz - fuz * zny;
    xy = fuz * znx - fux * znz;
    xz = fux * zny - fuy * znx;
    xlen = Math.sqrt(xx * xx + xy * xy + xz * xz) || 1;
  }
  const xnx = xx / xlen;
  const xny = xy / xlen;
  const xnz = xz / xlen;

  const yx = zny * xnz - znz * xny;
  const yy = znz * xnx - znx * xnz;
  const yz = znx * xny - zny * xnx;

  return new Float32Array([
    xnx, yx, znx, 0,
    xny, yy, zny, 0,
    xnz, yz, znz, 0,
    -(xnx * ex + xny * ey + xnz * ez),
    -(yx * ex + yy * ey + yz * ez),
    -(znx * ex + zny * ey + znz * ez),
    1,
  ]);
};

const computeProjectionMatrix = (camera: Camera) => {
  const EPS = 1e-6;
  const clampValue = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));
  const safeAspect = camera.aspect > EPS ? camera.aspect : 1;
  const safeNear = Math.max(camera.near, EPS);
  const safeFar = Math.max(camera.far, safeNear + 1);
  const safeFov = clampValue(camera.fov, 0.05, Math.PI - 0.05);

  const f = 1.0 / Math.tan(safeFov / 2);
  const rangeInv = 1.0 / (safeNear - safeFar);

  return new Float32Array([
    f / safeAspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (safeNear + safeFar) * rangeInv, -1,
    0, 0, safeNear * safeFar * rangeInv * 2, 0,
  ]);
};

const projectPointToScreen = (
  point: Vec3,
  viewProjection: Float32Array,
  rect: DOMRect
): ScreenPoint | null => {
  const x = point.x;
  const y = point.y;
  const z = point.z;
  const clipX =
    viewProjection[0] * x +
    viewProjection[4] * y +
    viewProjection[8] * z +
    viewProjection[12];
  const clipY =
    viewProjection[1] * x +
    viewProjection[5] * y +
    viewProjection[9] * z +
    viewProjection[13];
  const clipZ =
    viewProjection[2] * x +
    viewProjection[6] * y +
    viewProjection[10] * z +
    viewProjection[14];
  const clipW =
    viewProjection[3] * x +
    viewProjection[7] * y +
    viewProjection[11] * z +
    viewProjection[15];
  if (!Number.isFinite(clipW) || clipW <= 1e-6) return null;
  const ndcX = clipX / clipW;
  const ndcY = clipY / clipW;
  const depth = clipZ / clipW;
  const screenX = (ndcX * 0.5 + 0.5) * rect.width;
  const screenY = (1 - (ndcY * 0.5 + 0.5)) * rect.height;
  if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) return null;
  return { x: screenX, y: screenY, depth };
};

const isVec3 = (value: unknown): value is Vec3 =>
  Boolean(value) &&
  typeof (value as Vec3).x === "number" &&
  typeof (value as Vec3).y === "number" &&
  typeof (value as Vec3).z === "number" &&
  Number.isFinite((value as Vec3).x) &&
  Number.isFinite((value as Vec3).y) &&
  Number.isFinite((value as Vec3).z);

const isZeroVec3 = (value: Vec3) =>
  Math.abs(value.x) < 1e-6 && Math.abs(value.y) < 1e-6 && Math.abs(value.z) < 1e-6;

const formatDimensionValue = (value: number) => {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const decimals = abs >= 10 ? 1 : abs >= 1 ? 2 : 3;
  const rounded = Number(value.toFixed(decimals));
  return Number.isInteger(rounded) ? String(Math.trunc(rounded)) : String(rounded);
};

const transformPoint = (matrix: Float32Array, point: Vec3): Vec3 => ({
  x: matrix[0] * point.x + matrix[4] * point.y + matrix[8] * point.z + matrix[12],
  y: matrix[1] * point.x + matrix[5] * point.y + matrix[9] * point.z + matrix[13],
  z: matrix[2] * point.x + matrix[6] * point.y + matrix[10] * point.z + matrix[14],
});

const intersectRayTriangle = (ray: Ray, a: Vec3, b: Vec3, c: Vec3) => {
  const EPS = 1e-7;
  const edge1 = sub(b, a);
  const edge2 = sub(c, a);
  const pvec = cross(ray.dir, edge2);
  const det = dot(edge1, pvec);
  if (Math.abs(det) < EPS) return null;
  const invDet = 1 / det;
  const tvec = sub(ray.origin, a);
  const u = dot(tvec, pvec) * invDet;
  if (u < 0 || u > 1) return null;
  const qvec = cross(tvec, edge1);
  const v = dot(ray.dir, qvec) * invDet;
  if (v < 0 || u + v > 1) return null;
  const t = dot(edge2, qvec) * invDet;
  if (t < 0) return null;
  return { t };
};

const intersectRayMesh = (
  ray: Ray,
  mesh: RenderMesh,
  modelMatrix: Float32Array
) => {
  const { positions, indices } = mesh;
  if (!positions || positions.length < 9) return null;
  const indexList = indices.length > 0 ? indices : null;
  let bestT = Number.POSITIVE_INFINITY;
  const getVertex = (index: number) =>
    transformPoint(modelMatrix, {
      x: positions[index * 3],
      y: positions[index * 3 + 1],
      z: positions[index * 3 + 2],
    });
  if (indexList) {
    for (let i = 0; i + 2 < indexList.length; i += 3) {
      const a = getVertex(indexList[i]);
      const b = getVertex(indexList[i + 1]);
      const c = getVertex(indexList[i + 2]);
      const hit = intersectRayTriangle(ray, a, b, c);
      if (hit && hit.t < bestT) {
        bestT = hit.t;
      }
    }
  } else {
    for (let i = 0; i + 8 < positions.length; i += 9) {
      const a = transformPoint(modelMatrix, {
        x: positions[i],
        y: positions[i + 1],
        z: positions[i + 2],
      });
      const b = transformPoint(modelMatrix, {
        x: positions[i + 3],
        y: positions[i + 4],
        z: positions[i + 5],
      });
      const c = transformPoint(modelMatrix, {
        x: positions[i + 6],
        y: positions[i + 7],
        z: positions[i + 8],
      });
      const hit = intersectRayTriangle(ray, a, b, c);
      if (hit && hit.t < bestT) {
        bestT = hit.t;
      }
    }
  }
  return Number.isFinite(bestT) ? bestT : null;
};



const normalizeRect = (start: { x: number; y: number }, end: { x: number; y: number }) => {
  const x0 = Math.min(start.x, end.x);
  const y0 = Math.min(start.y, end.y);
  const x1 = Math.max(start.x, end.x);
  const y1 = Math.max(start.y, end.y);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
};

const buildEdgeIndexBuffer = (mesh: RenderMesh) => {
  const edges = new Set<string>();
  const indicesOut: number[] = [];
  const addEdge = (a: number, b: number) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (edges.has(key)) return;
    edges.add(key);
    indicesOut.push(a, b);
  };
  const indices = mesh.indices;
  if (indices.length >= 3) {
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i];
      const b = indices[i + 1];
      const c = indices[i + 2];
      addEdge(a, b);
      addEdge(b, c);
      addEdge(c, a);
    }
  } else {
    for (let i = 0; i < mesh.positions.length / 3; i += 3) {
      addEdge(i, i + 1);
      addEdge(i + 1, i + 2);
      addEdge(i + 2, i);
    }
  }
  return new Uint16Array(indicesOut);
};

const WebGLViewerCanvas = (_props: ViewerCanvasProps) => {
  const {
    activeCommandId = null,
    commandRequest = null,
    onCommandComplete,
    cameraOverride = null,
    onCameraStateChange,
    interactionsEnabled = true,
    isFullscreen = false,
  } = _props;
  const gumballPixelSize = isFullscreen
    ? GUMBALL_PIXEL_SIZE * GUMBALL_FULLSCREEN_SCALE
    : GUMBALL_PIXEL_SIZE;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const gumballBuffersRef = useRef<GumballBuffers | null>(null);
  const gumballPanelBufferRef = useRef<GeometryBuffer | null>(null);
  const gumballPanelEdgeBufferRef = useRef<GeometryBuffer | null>(null);
  const gumballPanelGridBufferRef = useRef<GeometryBuffer | null>(null);
  const adapterRef = useRef<GeometryRenderAdapter | null>(null);
  const geometryRef = useRef<Geometry[]>([]);
  const customMaterialMapRef = useRef(new Map<string, CustomMaterialOverrides>());
  const cameraRef = useRef(cameraOverride ?? useProjectStore.getState().camera);
  const selectionRef = useRef(useProjectStore.getState().selectedGeometryIds);
  const selectionModeRef = useRef(useProjectStore.getState().selectionMode);
  const hiddenRef = useRef(useProjectStore.getState().hiddenGeometryIds);
  const viewSettingsRef = useRef(useProjectStore.getState().viewSettings);
  const viewSolidityRef = useRef(useProjectStore.getState().viewSolidity);
  const displayModeRef = useRef(useProjectStore.getState().displayMode);
  const gumballStepRef = useRef(useProjectStore.getState().gumballStep);
  const showRotationRingsRef = useRef(useProjectStore.getState().showRotationRings);
  const showMoveArmsRef = useRef(useProjectStore.getState().showMoveArms);
  const dragRef = useRef<DragState>({ mode: "none" });
  const gridMinorBufferRef = useRef<GeometryBuffer | null>(null);
  const gridMajorBufferRef = useRef<GeometryBuffer | null>(null);
  const gumballStateRef = useRef<GumballState>({
    selectionPoints: [],
    orientation: WORLD_BASIS,
    pivot: { x: 0, y: 0, z: 0 },
    mode: null,
    visible: false,
  });
  const gumballDragRef = useRef<GumballDragState | null>(null);
  const gumballHoverRef = useRef<GumballHandleId | null>(null);
  const gumballHoverPreviewBufferRef = useRef<GeometryBuffer | null>(null);
  const gumballHoverPreviewDirtyRef = useRef(true);
  const gumballViewportZoomRef = useRef(1);
  const extrudeHoverRef = useRef<ExtrudeHandle | null>(null);
  const transformSessionRef = useRef<TransformSession | null>(null);
  const extrudeSessionRef = useRef<ExtrudeSession | null>(null);
  const pivotDragPlaneRef = useRef<{ origin: Vec3; normal: Vec3 } | null>(null);
  const transformPreviewRef = useRef<TransformPreview | null>(null);
  const transformPreviewFrameRef = useRef<number | null>(null);
  const [transformPreview, setTransformPreview] = useState<TransformPreview | null>(
    null
  );
  const [transformInputs, setTransformInputs] = useState<TransformInputState | null>(
    null
  );
  const [gumballPrompt, setGumballPrompt] = useState<{
    text: string;
    visible: boolean;
  } | null>(null);
  const gumballPromptFadeRef = useRef<number | null>(null);
  const gumballPromptRemoveRef = useRef<number | null>(null);
  const transformInputsRef = useRef<TransformInputState | null>(null);
  const transformInputEditingRef = useRef(false);
  const transformFieldRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [snapIndicator, setSnapIndicator] = useState<SnapIndicator | null>(null);
  const snapCycleRef = useRef<SnapCycleState>({
    candidates: [],
    index: 0,
    basePoint: null,
  });
  const [pivotInputs, setPivotInputs] = useState({ x: "0", y: "0", z: "0" });
  const pivotInputEditingRef = useRef(false);
  const [showPivotPanel, setShowPivotPanel] = useState(false);
  const lastCommandRequestIdRef = useRef<number | null>(null);
  const activeCommandIdRef = useRef<string | null>(activeCommandId);
  const onCommandCompleteRef = useRef<ViewerCanvasProps["onCommandComplete"]>(
    onCommandComplete
  );
  const componentSelectionRef = useRef(useProjectStore.getState().componentSelection);
  const lockedRef = useRef(useProjectStore.getState().lockedGeometryIds);
  const cPlaneRef = useRef(useProjectStore.getState().cPlane);
  const pivotRef = useRef(useProjectStore.getState().pivot);
  const snapSettingsRef = useRef(useProjectStore.getState().snapSettings);
  const gridSettingsRef = useRef(useProjectStore.getState().gridSettings);
  const transformOrientationRef = useRef(useProjectStore.getState().transformOrientation);
  const orientationBasisRef = useRef<Basis>(WORLD_BASIS);
  const resolvedPivotRef = useRef<Vec3>({ x: 0, y: 0, z: 0 });
  const primitiveConfigRef = useRef(DEFAULT_PRIMITIVE_SETTINGS);
  const rectangleConfigRef = useRef(DEFAULT_RECTANGLE_SETTINGS);
  const circleConfigRef = useRef(DEFAULT_CIRCLE_SETTINGS);
  const curveConfigRef = useRef(DEFAULT_CURVE_SETTINGS);
  const pointerPlaneRef = useRef<Vec3 | null>(null);
  const lineStartRef = useRef<Vec3 | null>(null);
  const arcStartRef = useRef<Vec3 | null>(null);
  const arcEndRef = useRef<Vec3 | null>(null);
  const rectangleStartRef = useRef<Vec3 | null>(null);
  const circleCenterRef = useRef<Vec3 | null>(null);
  const primitiveCenterRef = useRef<Vec3 | null>(null);
  const selectionDragRef = useRef<SelectionDragState | null>(null);
  const previewStateRef = useRef<PreviewState>(null);
  const previewDirtyRef = useRef(true);
  const previewLineBufferRef = useRef<GeometryBuffer | null>(null);
  const previewMeshBufferRef = useRef<GeometryBuffer | null>(null);
  const previewEdgeBufferRef = useRef<GeometryBuffer | null>(null);
  const resizeCanvasRef = useRef<(() => void) | null>(null);
  const selectionBoundsBufferRef = useRef<GeometryBuffer | null>(null);
  const selectionBoundsRef = useRef<SelectionBounds | null>(null);
  const hoverSelectionRef = useRef<ComponentSelection | null>(null);
  const hoverDirtyRef = useRef(true);
  const hoverLineBufferRef = useRef<GeometryBuffer | null>(null);
  const hoverMeshBufferRef = useRef<GeometryBuffer | null>(null);
  const selectedLineBufferRef = useRef<GeometryBuffer | null>(null);
  const selectedFaceBufferRef = useRef<GeometryBuffer | null>(null);
  const selectedPointBufferRef = useRef<GeometryBuffer | null>(null);
  const selectedComponentDirtyRef = useRef(true);
  const pointDragRef = useRef<PointDragState | null>(null);
  const pointHoverRef = useRef<PointHandleHover | null>(null);
  const [pointHoverDebug, setPointHoverDebug] = useState<PointHandleHover | null>(null);
  const pointHoverDebugRef = useRef<PointHandleHover | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [modifierKeys, setModifierKeys] = useState({
    shift: false,
    ctrl: false,
    meta: false,
    alt: false,
  });

  useEffect(() => {
    const handleModifierEvent = (event: KeyboardEvent) => {
      setModifierKeys({
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        meta: event.metaKey,
        alt: event.altKey,
      });
    };
    const resetModifiers = () =>
      setModifierKeys({ shift: false, ctrl: false, meta: false, alt: false });
    window.addEventListener("keydown", handleModifierEvent);
    window.addEventListener("keyup", handleModifierEvent);
    window.addEventListener("blur", resetModifiers);
    return () => {
      window.removeEventListener("keydown", handleModifierEvent);
      window.removeEventListener("keyup", handleModifierEvent);
      window.removeEventListener("blur", resetModifiers);
    };
  }, []);

  const geometry = useProjectStore((state) => state.geometry);
  const workflowNodes = useProjectStore((state) => state.workflow.nodes);
  const workflowEdges = useProjectStore((state) => state.workflow.edges);
  const customMaterialMap = useMemo(() => {
    const map = new Map<string, CustomMaterialOverrides>();
    geometry.forEach((item) => {
      const overrides = resolveCustomMaterialOverrides(item.metadata);
      if (overrides) {
        map.set(item.id, overrides);
      }
    });
    return map;
  }, [geometry]);
  const storeCamera = useProjectStore((state) => state.camera);
  const camera = cameraOverride ?? storeCamera;
  const selectedGeometryIds = useProjectStore((state) => state.selectedGeometryIds);
  const hiddenGeometryIds = useProjectStore((state) => state.hiddenGeometryIds);
  const lockedGeometryIds = useProjectStore((state) => state.lockedGeometryIds);
  const viewSettings = useProjectStore((state) => state.viewSettings);
  const gridSettings = useProjectStore((state) => state.gridSettings);
  const snapSettings = useProjectStore((state) => state.snapSettings);
  const displayMode = useProjectStore((state) => state.displayMode);
  const viewSolidity = useProjectStore((state) => state.viewSolidity);
  const gumballStep = useProjectStore((state) => state.gumballStep);
  const selectionMode = useProjectStore((state) => state.selectionMode);
  const componentSelection = useProjectStore((state) => state.componentSelection);
  const transformOrientation = useProjectStore((state) => state.transformOrientation);
  const gumballAlignment = useProjectStore((state) => state.gumballAlignment);
  const showRotationRings = useProjectStore((state) => state.showRotationRings);
  const showMoveArms = useProjectStore((state) => state.showMoveArms);
  const cPlane = useProjectStore((state) => state.cPlane);
  const pivot = useProjectStore((state) => state.pivot);
  const setStoreCameraState = useProjectStore((state) => state.setCameraState);
  const setPivotMode = useProjectStore((state) => state.setPivotMode);
  const setPivotPosition = useProjectStore((state) => state.setPivotPosition);
  const setPivotPickedPosition = useProjectStore((state) => state.setPivotPickedPosition);
  const setPivotCursorPosition = useProjectStore((state) => state.setPivotCursorPosition);
  const updateGeometryBatch = useProjectStore((state) => state.updateGeometryBatch);
  const recordModelerHistory = useProjectStore((state) => state.recordModelerHistory);
  const addGeometryPoint = useProjectStore((state) => state.addGeometryPoint);
  const addGeometryPolylineFromPoints = useProjectStore(
    (state) => state.addGeometryPolylineFromPoints
  );
  const addGeometryNurbsCurve = useProjectStore((state) => state.addGeometryNurbsCurve);
  const addGeometryBox = useProjectStore((state) => state.addGeometryBox);
  const addGeometrySphere = useProjectStore((state) => state.addGeometrySphere);
  const addGeometryMesh = useProjectStore((state) => state.addGeometryMesh);
  const addGeometryItems = useProjectStore((state) => state.addGeometryItems);

  const primitiveConfig = useMemo(
    () => ({
      ...DEFAULT_PRIMITIVE_SETTINGS,
      ...(_props.primitiveSettings as Partial<PrimitiveSettings> | undefined),
    }),
    [_props.primitiveSettings]
  );
  const rectangleConfig = useMemo(
    () => ({
      ...DEFAULT_RECTANGLE_SETTINGS,
      ...(_props.rectangleSettings as Partial<RectangleSettings> | undefined),
    }),
    [_props.rectangleSettings]
  );
  const circleConfig = useMemo(
    () => ({
      ...DEFAULT_CIRCLE_SETTINGS,
      ...(_props.circleSettings as Partial<CircleSettings> | undefined),
    }),
    [_props.circleSettings]
  );

  const polylinePointsRef = useRef<Vec3[]>([]);
  const curvePointsRef = useRef<Vec3[]>([]);

  const notifyCommandComplete = (commandId?: string | null) => {
    if (!commandId) return;
    onCommandCompleteRef.current?.(commandId);
  };

  const completeActiveCommand = () => {
    notifyCommandComplete(activeCommandIdRef.current);
  };

  const applyCameraState = useCallback(
    (stateUpdate: Partial<CameraState>) => {
      if (onCameraStateChange) {
        onCameraStateChange(stateUpdate);
        return;
      }
      setStoreCameraState(stateUpdate);
    },
    [onCameraStateChange, setStoreCameraState]
  );

  const showGumballPrompt = (text: string) => {
    if (!text) return;
    if (gumballPromptFadeRef.current != null) {
      window.clearTimeout(gumballPromptFadeRef.current);
    }
    if (gumballPromptRemoveRef.current != null) {
      window.clearTimeout(gumballPromptRemoveRef.current);
    }
    setGumballPrompt({ text, visible: true });
    gumballPromptFadeRef.current = window.setTimeout(() => {
      setGumballPrompt((prev) => (prev ? { ...prev, visible: false } : prev));
    }, GUMBALL_PROMPT_FADE_DELAY);
    gumballPromptRemoveRef.current = window.setTimeout(() => {
      setGumballPrompt(null);
    }, GUMBALL_PROMPT_REMOVE_DELAY);
  };

  useEffect(() => {
    return () => {
      if (gumballPromptFadeRef.current != null) {
        window.clearTimeout(gumballPromptFadeRef.current);
      }
      if (gumballPromptRemoveRef.current != null) {
        window.clearTimeout(gumballPromptRemoveRef.current);
      }
    };
  }, []);

  const vertexItems = useMemo(
    () => geometry.filter((item): item is VertexGeometry => item.type === "vertex"),
    [geometry]
  );
  const vertexMap = useMemo(
    () => new Map(vertexItems.map((item) => [item.id, item])),
    [vertexItems]
  );
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
  const collectGeometryPoints = (item: Geometry): Vec3[] => {
    if (item.type === "vertex") {
      return [item.position];
    }
    if (item.type === "polyline") {
      return item.vertexIds
        .map((vertexId) => vertexMap.get(vertexId)?.position)
        .filter((point): point is Vec3 => Boolean(point));
    }
    if (item.type === "nurbsCurve") {
      return item.nurbs.controlPoints.map((point) => ({ ...point }));
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
  };
  const referencedVertexIds = useMemo(() => {
    const ids = new Set<string>();
    geometry.forEach((item) => {
      if (item.type === "polyline") {
        item.vertexIds.forEach((id) => ids.add(id));
      }
    });
    return ids;
  }, [geometry]);
  const polylineItems = useMemo(
    () => geometry.filter((item): item is PolylineGeometry => item.type === "polyline"),
    [geometry]
  );
  const selectionPoints = useMemo(() => {
    const points: Vec3[] = [];
    if (componentSelection.length > 0) {
      componentSelection.forEach((selection) => {
        const item = geometry.find((entry) => entry.id === selection.geometryId);
        if (!item) return;
        const vertexSelection = asVertexSelection(selection);
        if (vertexSelection) {
          if (vertexSelection.vertexId) {
            const vertex = vertexMap.get(vertexSelection.vertexId);
            if (vertex) points.push(vertex.position);
            return;
          }
          if (vertexSelection.vertexIndex != null && "mesh" in item) {
            points.push(getMeshPoint(item.mesh, vertexSelection.vertexIndex));
          }
          return;
        }
        const edgeSelection = asEdgeSelection(selection);
        if (edgeSelection) {
          if (edgeSelection.vertexIds) {
            edgeSelection.vertexIds.forEach((id) => {
              const vertex = vertexMap.get(id);
              if (vertex) points.push(vertex.position);
            });
            return;
          }
          if (edgeSelection.vertexIndices && "mesh" in item) {
            edgeSelection.vertexIndices.forEach((index) => {
              points.push(getMeshPoint(item.mesh, index));
            });
          }
          return;
        }
        const faceSelection = asFaceSelection(selection);
        if (faceSelection && "mesh" in item) {
          faceSelection.vertexIndices.forEach((index) => {
            points.push(getMeshPoint(item.mesh, index));
          });
        }
      });
      return points;
    }
    selectedGeometryIds.forEach((id) => {
      const item = geometry.find((entry) => entry.id === id);
      if (!item) return;
      points.push(...collectGeometryPoints(item));
    });
    return points;
  }, [componentSelection, geometry, selectedGeometryIds, vertexMap]);
  const extrudeHandles = useMemo(() => {
    const handles: ExtrudeHandle[] = [];
    componentSelection.forEach((selection) => {
      const faceSelection = asFaceSelection(selection);
      if (!faceSelection) return;
      const item = geometry.find((entry) => entry.id === faceSelection.geometryId);
      if (!item || !("mesh" in item)) return;
      const [i0, i1, i2] = faceSelection.vertexIndices;
      const a = getMeshPoint(item.mesh, i0);
      const b = getMeshPoint(item.mesh, i1);
      const c = getMeshPoint(item.mesh, i2);
      const normal = normalize(cross(sub(b, a), sub(c, a)));
      if (length(normal) < 1e-6) return;
      const center = {
        x: (a.x + b.x + c.x) / 3,
        y: (a.y + b.y + c.y) / 3,
        z: (a.z + b.z + c.z) / 3,
      };
      handles.push({
        geometryId: faceSelection.geometryId,
        faceIndex: faceSelection.faceIndex,
        vertexIndices: faceSelection.vertexIndices,
        center,
        normal,
      });
    });
    return handles;
  }, [componentSelection, geometry]);
  const selectionPlane = useMemo(
    () => computeBestFitPlane(selectionPoints),
    [selectionPoints]
  );
  const localSelectionBasis = useMemo(() => {
    const primaryId = selectedGeometryIds[selectedGeometryIds.length - 1];
    const primary = geometry.find((item) => item.id === primaryId);
    if (primary && "plane" in primary && primary.plane) {
      return basisFromPlane(primary.plane);
    }
    const principalBasis = computePrincipalBasis(selectionPoints);
    if (principalBasis) return principalBasis;
    return basisFromPlane(selectionPlane);
  }, [geometry, selectedGeometryIds, selectionPlane, selectionPoints]);
  const gumballBasis = useMemo(
    () => (gumballAlignment === "cplane" ? basisFromPlane(cPlane) : localSelectionBasis),
    [gumballAlignment, cPlane, localSelectionBasis]
  );
  const selectionBounds = useMemo(
    () => computeOrientedBounds(selectionPoints, gumballBasis),
    [selectionPoints, gumballBasis]
  );
  const orientationBasis = useMemo(() => {
    if (transformOrientation === "world") return WORLD_BASIS;
    if (transformOrientation === "view") return buildViewBasis(camera);
    if (transformOrientation === "cplane") return basisFromPlane(cPlane);
    return localSelectionBasis;
  }, [transformOrientation, camera, cPlane, localSelectionBasis]);
  const resolvedPivot = useMemo(() => {
    if (pivot.mode === "cursor" && pivot.cursorPosition) {
      return pivot.cursorPosition;
    }
    if (pivot.mode === "picked" && pivot.pickedPosition) {
      return pivot.pickedPosition;
    }
    if (pivot.mode === "origin" || pivot.mode === "world") {
      return { x: 0, y: 0, z: 0 };
    }
    return pivot.position;
  }, [pivot]);

  useEffect(() => {
    if (pivot.mode !== "selection") return;
    const next =
      selectionPoints.length === 0
        ? { x: 0, y: 0, z: 0 }
        : centroid(selectionPoints);
    if (
      pivot.position.x === next.x &&
      pivot.position.y === next.y &&
      pivot.position.z === next.z
    ) {
      return;
    }
    setPivotPosition(next);
  }, [pivot.mode, selectionPoints, setPivotPosition]);

  const getGridStep = () => {
    const snap = snapSettingsRef.current;
    const grid = gridSettingsRef.current;
    return Math.max(1e-6, snap.gridStep || grid.spacing || 1);
  };

  const resolveGumballStep = (value: number | undefined, fallback: number) => {
    if (!Number.isFinite(value)) return fallback;
    if (value <= 0) return fallback;
    return value;
  };

  const snapValue = (value: number) => {
    const step = getGridStep();
    const precision = Math.max(0, `${step}`.split(".")[1]?.length ?? 0);
    return Number((Math.round(value / step) * step).toFixed(precision));
  };

  const snapToStep = (value: number, step: number) => {
    const safeStep = Math.max(1e-6, step);
    const precision = Math.max(0, `${safeStep}`.split(".")[1]?.length ?? 0);
    return Number((Math.round(value / safeStep) * safeStep).toFixed(precision));
  };

  const segmentCandidates = useMemo(() => {
    const segments: Array<{ a: Vec3; b: Vec3 }> = [];
    polylineItems.forEach((polyline) => {
      const points = polyline.vertexIds
        .map((id) => vertexMap.get(id)?.position)
        .filter(Boolean) as Vec3[];
      for (let i = 0; i < points.length - 1; i += 1) {
        segments.push({ a: points[i], b: points[i + 1] });
      }
      if (polyline.closed && points.length > 2) {
        segments.push({ a: points[points.length - 1], b: points[0] });
      }
    });
    return segments;
  }, [polylineItems, vertexMap]);

  const midpointCandidates = useMemo(() => {
    if (!snapSettings.midpoints) return [];
    const candidates: Vec3[] = [];
    polylineItems.forEach((polyline) => {
      const points = polyline.vertexIds
        .map((id) => vertexMap.get(id)?.position)
        .filter(Boolean) as Vec3[];
      for (let i = 0; i < points.length - 1; i += 1) {
        const a = points[i];
        const b = points[i + 1];
        candidates.push({
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
          z: (a.z + b.z) / 2,
        });
      }
      if (polyline.closed && points.length > 2) {
        const a = points[points.length - 1];
        const b = points[0];
        candidates.push({
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
          z: (a.z + b.z) / 2,
        });
      }
    });
    return candidates;
  }, [polylineItems, snapSettings.midpoints, vertexMap]);

  const endpointCandidates = useMemo(() => {
    if (!snapSettings.endpoints) return [];
    const candidates: Array<{ point: Vec3; vertexId: string }> = [];
    polylineItems.forEach((polyline) => {
      const points = polyline.vertexIds
        .map((vertexId) => ({ vertexId, point: vertexMap.get(vertexId)?.position }))
        .filter((item): item is { vertexId: string; point: Vec3 } => Boolean(item.point));
      if (points.length === 0) return;
      candidates.push(points[0]);
      if (points.length > 1) {
        candidates.push(points[points.length - 1]);
      }
    });
    return candidates;
  }, [polylineItems, snapSettings.endpoints, vertexMap]);

  const intersectionCandidates = useMemo(() => {
    if (!snapSettings.intersections) return [];
    const points: Vec3[] = [];
    for (let i = 0; i < segmentCandidates.length; i += 1) {
      const segA = segmentCandidates[i];
      const a0 = projectPointToPlane(segA.a, cPlane);
      const a1 = projectPointToPlane(segA.b, cPlane);
      for (let j = i + 1; j < segmentCandidates.length; j += 1) {
        const segB = segmentCandidates[j];
        const b0 = projectPointToPlane(segB.a, cPlane);
        const b1 = projectPointToPlane(segB.b, cPlane);
        const denom =
          (a1.u - a0.u) * (b1.v - b0.v) - (a1.v - a0.v) * (b1.u - b0.u);
        if (Math.abs(denom) < 1e-8) continue;
        const ua =
          ((b1.u - b0.u) * (a0.v - b0.v) - (b1.v - b0.v) * (a0.u - b0.u)) /
          denom;
        const ub =
          ((a1.u - a0.u) * (a0.v - b0.v) - (a1.v - a0.v) * (a0.u - b0.u)) /
          denom;
        if (ua < 0 || ua > 1 || ub < 0 || ub > 1) continue;
        const intersection = {
          u: a0.u + ua * (a1.u - a0.u),
          v: a0.v + ua * (a1.v - a0.v),
        };
        points.push(unprojectPointFromPlane(intersection, cPlane));
      }
    }
    return points;
  }, [segmentCandidates, snapSettings.intersections, cPlane]);

  function computeOrientedBounds(points: Vec3[], basis: Basis): SelectionBounds | null {
    if (points.length === 0) return null;
    const min = { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY, z: Number.POSITIVE_INFINITY };
    const max = { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY, z: Number.NEGATIVE_INFINITY };
    points.forEach((point) => {
      const x = dot(point, basis.xAxis);
      const y = dot(point, basis.yAxis);
      const z = dot(point, basis.zAxis);
      min.x = Math.min(min.x, x);
      min.y = Math.min(min.y, y);
      min.z = Math.min(min.z, z);
      max.x = Math.max(max.x, x);
      max.y = Math.max(max.y, y);
      max.z = Math.max(max.z, z);
    });
    const corners: Vec3[] = [
      fromBasis({ x: min.x, y: min.y, z: min.z }, basis),
      fromBasis({ x: max.x, y: min.y, z: min.z }, basis),
      fromBasis({ x: max.x, y: max.y, z: min.z }, basis),
      fromBasis({ x: min.x, y: max.y, z: min.z }, basis),
      fromBasis({ x: min.x, y: min.y, z: max.z }, basis),
      fromBasis({ x: max.x, y: min.y, z: max.z }, basis),
      fromBasis({ x: max.x, y: max.y, z: max.z }, basis),
      fromBasis({ x: min.x, y: max.y, z: max.z }, basis),
    ];
    return { corners };
  }

  const computeSelectionExtents = (points: Vec3[], basis: Basis) => {
    if (points.length === 0) {
      return { x: 0, y: 0, z: 0, max: 0 };
    }
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;
    points.forEach((point) => {
      const x = dot(point, basis.xAxis);
      const y = dot(point, basis.yAxis);
      const z = dot(point, basis.zAxis);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    });
    const extentX = maxX - minX;
    const extentY = maxY - minY;
    const extentZ = maxZ - minZ;
    return {
      x: extentX,
      y: extentY,
      z: extentZ,
      max: Math.max(extentX, extentY, extentZ),
    };
  };

  const computeBoundsForIds = (ids: string[]) => {
    const min = { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY, z: Number.POSITIVE_INFINITY };
    const max = { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY, z: Number.NEGATIVE_INFINITY };
    let hasPoint = false;

    const includePoint = (point: Vec3) => {
      min.x = Math.min(min.x, point.x);
      min.y = Math.min(min.y, point.y);
      min.z = Math.min(min.z, point.z);
      max.x = Math.max(max.x, point.x);
      max.y = Math.max(max.y, point.y);
      max.z = Math.max(max.z, point.z);
      hasPoint = true;
    };

    ids.forEach((id) => {
      const item = geometry.find((entry) => entry.id === id);
      if (!item) return;
      collectGeometryPoints(item).forEach(includePoint);
    });

    if (!hasPoint) return null;
    return { min, max };
  };

  const computeBoundsForGeometry = (item: Geometry) => {
    const min = {
      x: Number.POSITIVE_INFINITY,
      y: Number.POSITIVE_INFINITY,
      z: Number.POSITIVE_INFINITY,
    };
    const max = {
      x: Number.NEGATIVE_INFINITY,
      y: Number.NEGATIVE_INFINITY,
      z: Number.NEGATIVE_INFINITY,
    };
    let hasPoint = false;
    const includePoint = (point: Vec3) => {
      min.x = Math.min(min.x, point.x);
      min.y = Math.min(min.y, point.y);
      min.z = Math.min(min.z, point.z);
      max.x = Math.max(max.x, point.x);
      max.y = Math.max(max.y, point.y);
      max.z = Math.max(max.z, point.z);
      hasPoint = true;
    };

    collectGeometryPoints(item).forEach(includePoint);

    if (!hasPoint) return null;
    return { min, max };
  };

  const geometryBoundsMap = useMemo(() => {
    const boundsMap = new Map<string, { min: Vec3; max: Vec3 }>();
    geometry.forEach((item) => {
      const bounds = computeBoundsForGeometry(item);
      if (bounds) boundsMap.set(item.id, bounds);
    });
    return boundsMap;
  }, [geometry, vertexMap]);
  const geometryBoundsRef = useRef(geometryBoundsMap);

  useEffect(() => {
    geometryBoundsRef.current = geometryBoundsMap;
  }, [geometryBoundsMap]);

  const frameBounds = (bounds: { min: Vec3; max: Vec3 }) => {
    const size = {
      x: bounds.max.x - bounds.min.x,
      y: bounds.max.y - bounds.min.y,
      z: bounds.max.z - bounds.min.z,
    };
    const center = {
      x: (bounds.min.x + bounds.max.x) * 0.5,
      y: (bounds.min.y + bounds.max.y) * 0.5,
      z: (bounds.min.z + bounds.max.z) * 0.5,
    };
    const maxSize = Math.max(size.x, size.y, size.z, 0.001);
    const fov = toRadians(cameraRef.current.fov);
    const distance = (maxSize / (2 * Math.tan(fov / 2))) * 1.4;
    const currentDirection = normalize(
      sub(cameraRef.current.position, cameraRef.current.target)
    );
    const safeDirection =
      length(currentDirection) > 0.0001 ? currentDirection : { x: 1, y: 1, z: 1 };
    const nextPosition = add(center, scale(safeDirection, distance));
    applyCameraState({ position: nextPosition, target: center });
  };

  const clampNonZero = (value: number, fallback: number) => {
    if (!Number.isFinite(value)) return fallback;
    if (Math.abs(value) < 1e-6) return fallback;
    return value;
  };

  const createGeometryId = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const safeAxis = (axis: Vec3, fallback: Vec3) =>
    length(axis) > 1e-6 ? normalize(axis) : fallback;

  const intersectRayWithPlane = (ray: Ray, planeOrigin: Vec3, planeNormal: Vec3) => {
    const denom = dot(planeNormal, ray.dir);
    if (Math.abs(denom) < 1e-6) return null;
    const t = dot(planeNormal, sub(planeOrigin, ray.origin)) / denom;
    if (t < 0) return null;
    return add(ray.origin, scale(ray.dir, t));
  };

  const projectPointOntoPlane = (point: Vec3, planeOrigin: Vec3, planeNormal: Vec3) => {
    const normal = safeAxis(planeNormal, { x: 0, y: 1, z: 0 });
    const offset = sub(point, planeOrigin);
    const distanceAlong = dot(offset, normal);
    return sub(point, scale(normal, distanceAlong));
  };

  const getRotatePlaneHit = (
    context: NonNullable<ReturnType<typeof getPointerContext>>,
    axis: Vec3,
    pivotPoint: Vec3
  ) => {
    const axisNormal = safeAxis(axis, { x: 1, y: 0, z: 0 });
    const direct = intersectRayWithPlane(context.ray, pivotPoint, axisNormal);
    if (direct) return direct;
    const cameraDirection = safeAxis(
      sub(
        {
          x: context.cameraPayload.target[0],
          y: context.cameraPayload.target[1],
          z: context.cameraPayload.target[2],
        },
        {
          x: context.cameraPayload.position[0],
          y: context.cameraPayload.position[1],
          z: context.cameraPayload.position[2],
        }
      ),
      { x: 0, y: 0, z: -1 }
    );
    const screenHit = intersectRayWithPlane(context.ray, pivotPoint, cameraDirection);
    if (!screenHit) return null;
    return projectPointOntoPlane(screenHit, pivotPoint, axisNormal);
  };

  const getRayFromPointer = (event: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

    const cam = cameraRef.current;
    const forward = normalize(sub(cam.target, cam.position));
    const right = normalize(cross(forward, cam.up));
    const up = normalize(cross(right, forward));
    const tanFov = Math.tan(toRadians(cam.fov) / 2);
    const aspect = rect.width / rect.height;

    const direction = normalize(
      add(
        forward,
        add(scale(right, ndcX * aspect * tanFov), scale(up, ndcY * tanFov))
      )
    );

    return { ray: { origin: cam.position, dir: direction } satisfies Ray, rect };
  };

  const getPointerOnPlane = (event: PointerEvent): Vec3 | null => {
    const context = getRayFromPointer(event);
    if (!context) return null;
    const plane = cPlaneRef.current;
    const planeNormal = safeAxis(plane.normal, { x: 0, y: 1, z: 0 });
    return intersectRayWithPlane(context.ray, plane.origin, planeNormal);
  };

  const getPlaneAxes = () => {
    const plane = cPlaneRef.current;
    const planeNormal = safeAxis(plane.normal, { x: 0, y: 1, z: 0 });
    const worldUp = Math.abs(planeNormal.y) < 0.99 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    const fallbackXAxis = normalize(cross(worldUp, planeNormal));
    const fallbackYAxis = normalize(cross(planeNormal, fallbackXAxis));
    const xAxis = safeAxis(plane.xAxis, fallbackXAxis);
    const yAxis = safeAxis(plane.yAxis, fallbackYAxis);
    return { planeNormal, xAxis, yAxis };
  };

  const transformMeshToPlane = (mesh: RenderMesh, origin: Vec3) => {
    const { planeNormal, xAxis, yAxis } = getPlaneAxes();
    const zAxis = scale(yAxis, -1);
    const positions: number[] = new Array(mesh.positions.length);
    const normals: number[] = new Array(mesh.normals.length);
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const lx = mesh.positions[i];
      const ly = mesh.positions[i + 1];
      const lz = mesh.positions[i + 2];
      const world = add(
        origin,
        add(scale(xAxis, lx), add(scale(planeNormal, ly), scale(zAxis, lz)))
      );
      positions[i] = world.x;
      positions[i + 1] = world.y;
      positions[i + 2] = world.z;
    }
    for (let i = 0; i < mesh.normals.length; i += 3) {
      const nx = mesh.normals[i];
      const ny = mesh.normals[i + 1];
      const nz = mesh.normals[i + 2];
      const rotated = add(
        scale(xAxis, nx),
        add(scale(planeNormal, ny), scale(zAxis, nz))
      );
      const safeNormal = safeAxis(rotated, planeNormal);
      normals[i] = safeNormal.x;
      normals[i + 1] = safeNormal.y;
      normals[i + 2] = safeNormal.z;
    }
    return { positions, normals, uvs: mesh.uvs, indices: mesh.indices } satisfies RenderMesh;
  };

  const transformNurbsSurfaceToPlane = (
    surface: NURBSSurface,
    origin: Vec3,
    offset?: Vec3
  ): NURBSSurface => {
    const { planeNormal, xAxis, yAxis } = getPlaneAxes();
    const zAxis = scale(yAxis, -1);
    const localOffset = offset ?? { x: 0, y: 0, z: 0 };
    const controlPoints = surface.controlPoints.map((row) =>
      row.map((point) => {
        const local = add(point, localOffset);
        return add(
          origin,
          add(scale(xAxis, local.x), add(scale(planeNormal, local.y), scale(zAxis, local.z)))
        );
      })
    );
    const weights = surface.weights ? surface.weights.map((row) => [...row]) : undefined;
    return {
      controlPoints,
      knotsU: [...surface.knotsU],
      knotsV: [...surface.knotsV],
      degreeU: surface.degreeU,
      degreeV: surface.degreeV,
      weights,
    };
  };

  const buildSurfaceMesh = (surface: NURBSSurface): RenderMesh => {
    const tessellated = tessellateSurfaceAdaptive(surface);
    return {
      positions: Array.from(tessellated.positions),
      normals: Array.from(tessellated.normals),
      uvs: Array.from(tessellated.uvs),
      indices: Array.from(tessellated.indices),
    };
  };

  const seatMeshOnPlane = (mesh: RenderMesh) => {
    if (mesh.positions.length === 0) return mesh;
    let minY = Number.POSITIVE_INFINITY;
    for (let i = 1; i < mesh.positions.length; i += 3) {
      minY = Math.min(minY, mesh.positions[i]);
    }
    if (!Number.isFinite(minY) || Math.abs(minY) < 1e-6) return mesh;
    const positions = mesh.positions.slice();
    for (let i = 1; i < positions.length; i += 3) {
      positions[i] -= minY;
    }
    return { ...mesh, positions };
  };

  const createRectangleAt = (origin: Vec3) => {
    const { xAxis, yAxis } = getPlaneAxes();
    const config = rectangleConfigRef.current;
    const width = Math.max(0.05, clampNonZero(config.width, DEFAULT_RECTANGLE_SETTINGS.width));
    const height = Math.max(0.05, clampNonZero(config.height, DEFAULT_RECTANGLE_SETTINGS.height));
    const halfW = width * 0.5;
    const halfH = height * 0.5;
    const offsetX = scale(xAxis, halfW);
    const offsetY = scale(yAxis, halfH);
    const points = [
      sub(sub(origin, offsetX), offsetY),
      sub(add(origin, offsetX), offsetY),
      add(add(origin, offsetX), offsetY),
      add(sub(origin, offsetX), offsetY),
    ];
    addGeometryPolylineFromPoints(points, { closed: true, degree: 1 });
  };

  const createCircleAt = (origin: Vec3) => {
    const { xAxis, yAxis } = getPlaneAxes();
    const config = circleConfigRef.current;
    const radius = Math.max(0.05, clampNonZero(config.radius, DEFAULT_CIRCLE_SETTINGS.radius));
    const segments = Math.max(8, Math.round(config.segments));
    const points: Vec3[] = [];
    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      const offset = add(
        scale(xAxis, Math.cos(angle) * radius),
        scale(yAxis, Math.sin(angle) * radius)
      );
      points.push(add(origin, offset));
    }
    addGeometryPolylineFromPoints(points, { closed: true, degree: 1 });
  };

  const resolvePrimitiveParams = (scalarOverride?: number) => {
    const config = primitiveConfigRef.current;
    const radialSegments = Math.max(6, Math.round(config.radialSegments));
    const tubularSegments = Math.max(6, Math.round(config.tubularSegments));
    const detail = Math.max(0, Math.round(config.detail ?? DEFAULT_PRIMITIVE_SETTINGS.detail));
    const sizeScalar =
      scalarOverride ?? clampNonZero(config.size, DEFAULT_PRIMITIVE_SETTINGS.size) * 0.5;
    const size = Math.max(0.08, sizeScalar * 2);
    const radius = Math.max(
      0.08,
      scalarOverride ?? clampNonZero(config.radius, DEFAULT_PRIMITIVE_SETTINGS.radius)
    );
    const height = Math.max(
      0.12,
      scalarOverride
        ? radius * 2
        : clampNonZero(config.height, DEFAULT_PRIMITIVE_SETTINGS.height)
    );
    const tube = Math.max(
      0.04,
      scalarOverride
        ? Math.max(radius * 0.35, 0.04)
        : clampNonZero(config.tube, DEFAULT_PRIMITIVE_SETTINGS.tube)
    );
    const innerRadius = Math.max(
      0.02,
      clampNonZero(config.innerRadius ?? config.tube, DEFAULT_PRIMITIVE_SETTINGS.innerRadius)
    );
    const topRadius = Math.max(
      0.02,
      clampNonZero(config.topRadius ?? config.tube, DEFAULT_PRIMITIVE_SETTINGS.topRadius)
    );
    const capHeight = Math.max(
      0.02,
      clampNonZero(config.capHeight, DEFAULT_PRIMITIVE_SETTINGS.capHeight)
    );
    const exponent1 = clampNonZero(
      config.exponent1,
      DEFAULT_PRIMITIVE_SETTINGS.exponent1
    );
    const exponent2 = clampNonZero(
      config.exponent2,
      DEFAULT_PRIMITIVE_SETTINGS.exponent2
    );
    return {
      config,
      radialSegments,
      tubularSegments,
      detail,
      size,
      radius,
      height,
      tube,
      innerRadius,
      topRadius,
      capHeight,
      exponent1,
      exponent2,
    };
  };

  const buildPrimitiveMesh = (origin: Vec3, scalarOverride?: number) => {
    const resolved = resolvePrimitiveParams(scalarOverride);
    const localMesh = generatePrimitiveMesh({
      kind: resolved.config.kind,
      size: resolved.size,
      radius: resolved.radius,
      height: resolved.height,
      tube: resolved.tube,
      radialSegments: resolved.radialSegments,
      tubularSegments: resolved.tubularSegments,
      innerRadius: resolved.innerRadius,
      topRadius: resolved.topRadius,
      capHeight: resolved.capHeight,
      detail: resolved.detail,
      exponent1: resolved.exponent1,
      exponent2: resolved.exponent2,
    });
    const mesh = transformMeshToPlane(seatMeshOnPlane(localMesh), origin);

    return {
      mesh,
      metadata: {
        primitive: {
          kind: resolved.config.kind,
          origin,
          dimensions:
            resolved.config.kind === "box"
              ? { width: resolved.size, height: resolved.size, depth: resolved.size }
              : undefined,
          radius: resolved.radius,
          height: resolved.height,
          tube: resolved.tube,
          innerRadius: resolved.innerRadius,
          topRadius: resolved.topRadius,
          capHeight: resolved.capHeight,
          detail: resolved.detail,
          exponent1: resolved.exponent1,
          exponent2: resolved.exponent2,
          params: {
            size: resolved.size,
            radialSegments: resolved.radialSegments,
            tubularSegments: resolved.tubularSegments,
          },
        },
      },
    };
  };

  const createNurbsPrimitiveAt = (origin: Vec3, scalarOverride?: number) => {
    const resolved = resolvePrimitiveParams(scalarOverride);
    let surfaces: NURBSSurface[] = [];
    let offset: Vec3 | undefined;

    switch (resolved.config.kind) {
      case "box":
        surfaces = createNurbsBoxSurfaces(resolved.size, resolved.size, resolved.size);
        break;
      case "sphere":
        surfaces = [createNurbsSphereSurface(resolved.radius)];
        offset = { x: 0, y: resolved.radius, z: 0 };
        break;
      case "cylinder":
        surfaces = [createNurbsCylinderSurface(resolved.radius, resolved.height)];
        break;
      default:
        return;
    }

    const layerId = useProjectStore.getState().layers[0]?.id ?? "layer-default";
    const metadata = {
      primitive: {
        kind: resolved.config.kind,
        origin,
        dimensions:
          resolved.config.kind === "box"
            ? { width: resolved.size, height: resolved.size, depth: resolved.size }
            : undefined,
        radius: resolved.radius,
        height: resolved.height,
        tube: resolved.tube,
        innerRadius: resolved.innerRadius,
        topRadius: resolved.topRadius,
        capHeight: resolved.capHeight,
        detail: resolved.detail,
        exponent1: resolved.exponent1,
        exponent2: resolved.exponent2,
        params: {
          size: resolved.size,
          radialSegments: resolved.radialSegments,
          tubularSegments: resolved.tubularSegments,
        },
      },
    };

    const geometryItems: Geometry[] = surfaces.map((surface) => {
      const nurbsSurface = transformNurbsSurfaceToPlane(surface, origin, offset);
      const mesh = buildSurfaceMesh(nurbsSurface);
      return {
        id: createGeometryId("nurbsSurface"),
        type: "nurbsSurface",
        mesh,
        nurbs: nurbsSurface,
        layerId,
        metadata,
      };
    });

    if (geometryItems.length === 0) return;
    addGeometryItems(geometryItems, {
      selectIds: geometryItems.map((item) => item.id),
    });
  };

  const createPrimitiveAt = (origin: Vec3, scalarOverride?: number) => {
    if (isNurbsPrimitiveCommand(activeCommandIdRef.current)) {
      createNurbsPrimitiveAt(origin, scalarOverride);
      return;
    }
    const built = buildPrimitiveMesh(origin, scalarOverride);
    if (!built) return;
    addGeometryMesh(built.mesh, { metadata: built.metadata });
  };

  const appendPolylinePoint = (point: Vec3) => {
    polylinePointsRef.current = [...polylinePointsRef.current, point];
  };

  const commitPolyline = () => {
    if (polylinePointsRef.current.length >= 2) {
      addGeometryPolylineFromPoints(polylinePointsRef.current, {
        closed: false,
        degree: 1,
      });
    }
    polylinePointsRef.current = [];
  };

  const cancelPolyline = () => {
    polylinePointsRef.current = [];
  };

  const clampCurveDegree = (value: number): 1 | 2 | 3 => {
    if (value <= 1) return 1;
    if (value >= 3) return 3;
    return 2;
  };

  const updateCurveFromInput = (input: string) => {
    const next = { ...curveConfigRef.current };
    const degreeMatch =
      input.match(/degree\s*=?\s*(\d+)/i) ?? input.match(/\bdeg\s*=?\s*(\d+)/i);
    if (degreeMatch) {
      next.degree = clampCurveDegree(Number(degreeMatch[1]));
    }
    const resolutionMatch =
      input.match(/resolution\s*=?\s*(\d+)/i) ??
      input.match(/\bres\s*=?\s*(\d+)/i) ??
      input.match(/segments\s*=?\s*(\d+)/i);
    if (resolutionMatch) {
      const parsed = Number(resolutionMatch[1]);
      if (Number.isFinite(parsed)) {
        next.resolution = Math.min(256, Math.max(16, Math.round(parsed)));
      }
    }
    const lower = input.toLowerCase();
    if (lower.includes("closed")) next.closed = true;
    if (lower.includes("open")) next.closed = false;
    if (lower.includes("interpolate") || lower.includes("interp")) {
      next.interpolate = true;
    }
    if (lower.includes("approx") || lower.includes("control")) {
      next.interpolate = false;
    }
    curveConfigRef.current = next;
  };

  const computeCurvePoints = (points: Vec3[]) => {
    if (points.length < 2) return points;
    const config = curveConfigRef.current;
    const resolution = Math.max(16, Math.round(config.resolution));
    if (config.degree <= 1 || points.length < config.degree + 1) {
      return config.closed ? [...points, points[0]] : points;
    }
    const curve =
      config.interpolate && !config.closed
        ? interpolateNurbsCurve(points, config.degree, { parameterization: "chord" })
        : createNurbsCurveFromPoints(points, config.degree, config.closed);
    const tessellated = tessellateCurveAdaptive(curve, {
      maxSamples: resolution,
      minSamples: Math.max(8, Math.floor(resolution / 4)),
    });
    const sampled = tessellated.points;
    if (!config.closed || sampled.length === 0) return sampled;
    const first = sampled[0];
    const last = sampled[sampled.length - 1];
    const isClosed =
      Math.abs(first.x - last.x) < 1e-6 &&
      Math.abs(first.y - last.y) < 1e-6 &&
      Math.abs(first.z - last.z) < 1e-6;
    return isClosed ? sampled : [...sampled, { ...first }];
  };

  const appendCurvePoint = (point: Vec3) => {
    curvePointsRef.current = [...curvePointsRef.current, point];
  };

  const commitCurve = () => {
    if (curvePointsRef.current.length >= 2) {
      const config = curveConfigRef.current;
      const controlPoints = curvePointsRef.current;
      if (
        config.interpolate &&
        !config.closed &&
        config.degree > 1 &&
        controlPoints.length >= config.degree + 1
      ) {
        const nurbs = interpolateNurbsCurve(controlPoints, config.degree, {
          parameterization: "chord",
        });
        addGeometryNurbsCurve(nurbs, { closed: config.closed });
      } else {
        addGeometryPolylineFromPoints(controlPoints, {
          closed: config.closed,
          degree: config.degree,
        });
      }
    }
    curvePointsRef.current = [];
  };

  const cancelCurve = () => {
    curvePointsRef.current = [];
  };

  const computeLineFromDrag = (start: Vec3, current: Vec3) => {
    const delta = sub(current, start);
    if (length(delta) < 1e-5) return null;
    return { points: [start, current] as Vec3[] };
  };

  const createLineFromDrag = (start: Vec3, current: Vec3) => {
    const line = computeLineFromDrag(start, current);
    if (!line) return;
    addGeometryPolylineFromPoints(line.points, { closed: false, degree: 1 });
  };

  const computeArcFromPoints = (start: Vec3, end: Vec3, through: Vec3) => {
    const baseSegments = Math.max(24, Math.round(circleConfigRef.current.segments));
    const arcPoints = computeArcPolyline(cPlaneRef.current, start, end, through, baseSegments);
    if (!arcPoints || arcPoints.length < 2) {
      return { points: [start, end] as Vec3[], nurbs: null as NURBSCurve | null };
    }
    const nurbs = createArcNurbs(cPlaneRef.current, start, end, through);
    return { points: arcPoints, nurbs };
  };

  const createArcFromPoints = (start: Vec3, end: Vec3, through: Vec3) => {
    const arc = computeArcFromPoints(start, end, through);
    if (arc.nurbs) {
      addGeometryNurbsCurve(arc.nurbs, { closed: false });
    } else {
      addGeometryPolylineFromPoints(arc.points, { closed: false, degree: 1 });
    }
  };

  const computeRectangleFromDrag = (start: Vec3, current: Vec3) => {
    const { xAxis, yAxis } = getPlaneAxes();
    const delta = sub(current, start);
    const dx = dot(delta, xAxis);
    const dy = dot(delta, yAxis);
    if (Math.abs(dx) < 1e-5 && Math.abs(dy) < 1e-5) return null;
    const width = Math.max(0.05, Math.abs(dx));
    const height = Math.max(0.05, Math.abs(dy));
    const dirX = Math.sign(dx) || 1;
    const dirY = Math.sign(dy) || 1;
    const center = add(start, add(scale(xAxis, dx * 0.5), scale(yAxis, dy * 0.5)));
    const offsetX = scale(xAxis, width * 0.5 * dirX);
    const offsetY = scale(yAxis, height * 0.5 * dirY);
    const points = [
      sub(sub(center, offsetX), offsetY),
      sub(add(center, offsetX), offsetY),
      add(add(center, offsetX), offsetY),
      add(sub(center, offsetX), offsetY),
    ];
    return { center, width, height, points };
  };

  const createRectangleFromDrag = (start: Vec3, current: Vec3) => {
    const rectangle = computeRectangleFromDrag(start, current);
    if (!rectangle) return;
    addGeometryPolylineFromPoints(rectangle.points, { closed: true, degree: 1 });
  };

  const computeCircleFromDrag = (center: Vec3, current: Vec3) => {
    const { xAxis, yAxis } = getPlaneAxes();
    const delta = sub(current, center);
    const dx = dot(delta, xAxis);
    const dy = dot(delta, yAxis);
    const radius = Math.max(0.05, Math.hypot(dx, dy));
    const segments = Math.max(8, Math.round(circleConfigRef.current.segments));
    const points: Vec3[] = [];
    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      const offset = add(
        scale(xAxis, Math.cos(angle) * radius),
        scale(yAxis, Math.sin(angle) * radius)
      );
      points.push(add(center, offset));
    }
    const nurbs = createCircleNurbs(cPlaneRef.current, center, radius);
    return { radius, points, nurbs };
  };

  const createCircleFromDrag = (center: Vec3, current: Vec3) => {
    const circle = computeCircleFromDrag(center, current);
    addGeometryNurbsCurve(circle.nurbs, { closed: true });
  };

  const computePrimitiveScalarFromDrag = (start: Vec3, current: Vec3) => {
    const { xAxis, yAxis } = getPlaneAxes();
    const delta = sub(current, start);
    const dx = dot(delta, xAxis);
    const dy = dot(delta, yAxis);
    return Math.max(0.1, Math.hypot(dx, dy));
  };

  const createPrimitiveFromDrag = (start: Vec3, current: Vec3) => {
    const scalar = computePrimitiveScalarFromDrag(start, current);
    createPrimitiveAt(start, scalar);
  };

  const setSelectionState = (ids: string[], components: ComponentSelection[]) => {
    selectionRef.current = ids;
    componentSelectionRef.current = components;
    useProjectStore.setState({
      selectedGeometryIds: ids,
      componentSelection: components,
    });
  };

  const isSameComponent = (a: ComponentSelection, b: ComponentSelection) => {
    if (a.kind !== b.kind) return false;
    if (a.geometryId !== b.geometryId) return false;
    if (a.kind === "vertex" && b.kind === "vertex") {
      return a.vertexId === b.vertexId && a.vertexIndex === b.vertexIndex;
    }
    if (a.kind === "edge" && b.kind === "edge") {
      return (
        a.edgeIndex === b.edgeIndex &&
        a.vertexIds?.[0] === b.vertexIds?.[0] &&
        a.vertexIds?.[1] === b.vertexIds?.[1] &&
        a.vertexIndices?.[0] === b.vertexIndices?.[0] &&
        a.vertexIndices?.[1] === b.vertexIndices?.[1]
      );
    }
    if (a.kind === "face" && b.kind === "face") {
      return (
        a.faceIndex === b.faceIndex &&
        a.vertexIndices[0] === b.vertexIndices[0] &&
        a.vertexIndices[1] === b.vertexIndices[1] &&
        a.vertexIndices[2] === b.vertexIndices[2]
      );
    }
    return false;
  };

  const updateComponentSelection = (selection: ComponentSelection, isMultiSelect: boolean) => {
    if (!isMultiSelect) {
      setSelectionState([], [selection]);
      return;
    }
    const current = componentSelectionRef.current;
    const exists = current.find((item) => isSameComponent(item, selection));
    const next = exists
      ? current.filter((item) => !isSameComponent(item, selection))
      : [...current, selection];
    setSelectionState([], next);
  };

  const setHoverSelection = (selection: ComponentSelection | null) => {
    const current = hoverSelectionRef.current;
    if (!selection && !current) return;
    if (selection && current && isSameComponent(selection, current)) return;
    hoverSelectionRef.current = selection;
    hoverDirtyRef.current = true;
  };

  const rectIntersects = (
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ) =>
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y;

  const getPointerContext = (event: PointerEvent) => {
    const rayContext = getRayFromPointer(event);
    if (!rayContext) return null;
    const { ray, rect } = rayContext;
    const cameraState = cameraRef.current;
    const cameraPayload = toCamera({
      position: cameraState.position,
      target: cameraState.target,
      up: cameraState.up,
      fov: cameraState.fov,
      aspect: rect.width / rect.height,
    });
    const viewProjection = multiplyMatrices(
      computeProjectionMatrix(cameraPayload),
      computeViewMatrix(cameraPayload)
    );
    const pointer = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const plane = cPlaneRef.current;
    const planeNormal = safeAxis(plane.normal, { x: 0, y: 1, z: 0 });
    const planePoint = intersectRayWithPlane(ray, plane.origin, planeNormal);
    return { rect, ray, pointer, cameraPayload, viewProjection, planePoint };
  };

  const nurbsSurfacePickCache = useRef(
    new Map<string, { surface: NURBSSurface; mesh: RenderMesh }>()
  );
  const brepPickCache = useRef(new Map<string, { brep: unknown; mesh: RenderMesh }>());

  const getSurfacePickMesh = (item: Geometry): RenderMesh | null => {
    if (item.type === "nurbsSurface") {
      const cache = nurbsSurfacePickCache.current;
      const cached = cache.get(item.id);
      if (cached && cached.surface === item.nurbs) {
        return cached.mesh;
      }
      const tessellated = tessellateSurfaceAdaptive(item.nurbs);
      const mesh: RenderMesh = {
        positions: Array.from(tessellated.positions),
        normals: Array.from(tessellated.normals),
        indices: Array.from(tessellated.indices),
        uvs: Array.from(tessellated.uvs),
      };
      cache.set(item.id, { surface: item.nurbs, mesh });
      return mesh;
    }

    if (item.type === "brep") {
      const cache = brepPickCache.current;
      const cached = cache.get(item.id);
      if (cached && cached.brep === item.brep) {
        return cached.mesh;
      }
      const mesh = item.mesh ?? tessellateBRepToMesh(item.brep);
      cache.set(item.id, { brep: item.brep, mesh });
      return mesh;
    }

    if (!("mesh" in item) || !item.mesh) return null;
    if (item.type !== "surface" || !item.nurbs) return item.mesh;
    const cache = nurbsSurfacePickCache.current;
    const cached = cache.get(item.id);
    if (cached && cached.surface === item.nurbs) {
      return cached.mesh;
    }
    const tessellated = tessellateSurfaceAdaptive(item.nurbs);
    const mesh: RenderMesh = {
      positions: Array.from(tessellated.positions),
      normals: Array.from(tessellated.normals),
      indices: Array.from(tessellated.indices),
      uvs: Array.from(tessellated.uvs),
    };
    cache.set(item.id, { surface: item.nurbs, mesh });
    return mesh;
  };

  const getPolylineRenderData = (
    points: Vec3[],
    degree: 1 | 2 | 3,
    closed: boolean,
    nurbs?: NURBSCurve | null
  ): PolylineRenderData => {
    if (points.length < 2) {
      return { points, parameters: [], curve: null };
    }
    const resolvedDegree = nurbs?.degree ?? degree;
    if (resolvedDegree <= 1 || points.length < resolvedDegree + 1) {
      const linearPoints = closed ? [...points, points[0]] : points;
      return { points: linearPoints, parameters: [], curve: null };
    }
    const curve = (() => {
      if (!nurbs) {
        return createNurbsCurveFromPoints(points, degree, closed);
      }
      const expectedLength = points.length + nurbs.degree + 1;
      if (nurbs.knots.length !== expectedLength) {
        return createNurbsCurveFromPoints(points, degree, closed);
      }
      const weights =
        nurbs.weights && nurbs.weights.length === points.length ? nurbs.weights : undefined;
      return {
        controlPoints: points,
        knots: nurbs.knots,
        degree: nurbs.degree,
        weights,
      } satisfies NURBSCurve;
    })();
    const tessellated = tessellateCurveAdaptive(curve);
    let sampled = tessellated.points;
    let parameters = tessellated.parameters;
    if (closed && sampled.length > 0) {
      const first = sampled[0];
      const last = sampled[sampled.length - 1];
      const isClosed =
        Math.abs(first.x - last.x) < 1e-6 &&
        Math.abs(first.y - last.y) < 1e-6 &&
        Math.abs(first.z - last.z) < 1e-6;
      if (!isClosed) {
        sampled = [...sampled, { ...first }];
        const lastParam = parameters[parameters.length - 1] ?? 0;
        parameters = [...parameters, lastParam];
      }
      if (sampled.length > 0) {
        sampled[sampled.length - 1] = { ...first };
      }
    }
    return { points: sampled, parameters, curve };
  };

  const getPolylineRenderPoints = (
    points: Vec3[],
    degree: 1 | 2 | 3,
    closed: boolean,
    nurbs?: NURBSCurve | null
  ) => getPolylineRenderData(points, degree, closed, nurbs).points;

  const pickPointHandle = (
    context: NonNullable<ReturnType<typeof getPointerContext>>,
    options?: { includeReferenced?: boolean; pickRadius?: number }
  ): PointHandleHover | null => {
    const hidden = new Set(hiddenRef.current);
    const locked = new Set(lockedRef.current);
    const allowReferenced = options?.includeReferenced ?? false;
    const pickRadius = options?.pickRadius ?? POINT_HANDLE_PICK_RADIUS_PX;
    const depthEpsilon = 1e-6;
    let best: PointHandleHover | null = null;
    let bestDepth = Number.POSITIVE_INFINITY;
    let bestDistance = Number.POSITIVE_INFINITY;

    geometryRef.current.forEach((item) => {
      if (item.type !== "vertex") return;
      if (hidden.has(item.id) || locked.has(item.id)) return;
      if (!allowReferenced && referencedVertexIds.has(item.id)) return;
      const screen = projectPointToScreen(item.position, context.viewProjection, context.rect);
      if (!screen) return;
      const distance = Math.hypot(context.pointer.x - screen.x, context.pointer.y - screen.y);
      if (distance > pickRadius) return;
      if (
        screen.depth < bestDepth - depthEpsilon ||
        (Math.abs(screen.depth - bestDepth) <= depthEpsilon && distance < bestDistance)
      ) {
        bestDepth = screen.depth;
        bestDistance = distance;
        best = { id: item.id, position: item.position, screen, distance };
      }
    });

    return best;
  };

  const resolveVertexSelectionPosition = (
    selection: Extract<ComponentSelection, { kind: "vertex" }>
  ): Vec3 | null => {
    if (selection.vertexId) {
      return vertexMap.get(selection.vertexId)?.position ?? null;
    }
    if (selection.vertexIndex != null) {
      const item = geometryRef.current.find((entry) => entry.id === selection.geometryId);
      if (item && "mesh" in item) {
        return getMeshPoint(item.mesh, selection.vertexIndex);
      }
    }
    return null;
  };

  const computeBarycentric = (p: Vec3, a: Vec3, b: Vec3, c: Vec3) => {
    const v0 = sub(b, a);
    const v1 = sub(c, a);
    const v2 = sub(p, a);
    const d00 = dot(v0, v0);
    const d01 = dot(v0, v1);
    const d11 = dot(v1, v1);
    const d20 = dot(v2, v0);
    const d21 = dot(v2, v1);
    const denom = d00 * d11 - d01 * d01;
    if (Math.abs(denom) < 1e-12) return null;
    const v = (d11 * d20 - d01 * d21) / denom;
    const w = (d00 * d21 - d01 * d20) / denom;
    const u = 1 - v - w;
    return { u, v, w };
  };

  const refineNurbsIntersection = (
    item: Geometry,
    mesh: RenderMesh,
    point: Vec3,
    vertexIndices: [number, number, number],
    ray: { origin: Vec3; dir: Vec3 }
  ): Vec3 => {
    if (item.type !== "surface" || !item.nurbs) return point;
    if (mesh.uvs.length < (vertexIndices[2] + 1) * 2) return point;
    const [i0, i1, i2] = vertexIndices;
    const a = getMeshPoint(mesh, i0);
    const b = getMeshPoint(mesh, i1);
    const c = getMeshPoint(mesh, i2);
    const bary = computeBarycentric(point, a, b, c);
    if (!bary) return point;

    const uv0 = { u: mesh.uvs[i0 * 2] ?? 0, v: mesh.uvs[i0 * 2 + 1] ?? 0 };
    const uv1 = { u: mesh.uvs[i1 * 2] ?? 0, v: mesh.uvs[i1 * 2 + 1] ?? 0 };
    const uv2 = { u: mesh.uvs[i2 * 2] ?? 0, v: mesh.uvs[i2 * 2 + 1] ?? 0 };

    const uv = {
      u: bary.u * uv0.u + bary.v * uv1.u + bary.w * uv2.u,
      v: bary.u * uv0.v + bary.v * uv1.v + bary.w * uv2.v,
    };

    const uMin = item.nurbs.knotsU[item.nurbs.degreeU];
    const uMax = item.nurbs.knotsU[item.nurbs.knotsU.length - item.nurbs.degreeU - 1];
    const vMin = item.nurbs.knotsV[item.nurbs.degreeV];
    const vMax = item.nurbs.knotsV[item.nurbs.knotsV.length - item.nurbs.degreeV - 1];

    const initial = {
      u: uMin + uv.u * (uMax - uMin),
      v: vMin + uv.v * (vMax - vMin),
    };

    const refined = refineRaySurfaceIntersection(
      item.nurbs,
      { origin: ray.origin, direction: ray.dir },
      initial,
      { maxIterations: 8, tolerance: 1e-5 }
    );

    return refined.point;
  };

  const pickObject = (
    context: NonNullable<ReturnType<typeof getPointerContext>>
  ): PickResult | null => {
    return hitTestObject({
      geometry,
      vertexMap,
      referencedVertexIds,
      hidden: new Set(hiddenRef.current),
      locked: new Set(lockedRef.current),
      context,
      pickPixelThreshold: PICK_PIXEL_THRESHOLD,
      pointPixelThreshold: POINT_HANDLE_PICK_RADIUS_PX,
      getSurfacePickMesh,
      getPolylineRenderData,
      refineSurfaceIntersection: refineNurbsIntersection,
    });
  };

  const pickComponent = (
    context: NonNullable<ReturnType<typeof getPointerContext>>,
    mode?: "vertex" | "edge" | "face"
  ): PickResult | null => {
    return hitTestComponent({
      geometry,
      vertexMap,
      hidden: new Set(hiddenRef.current),
      locked: new Set(lockedRef.current),
      context,
      pickPixelThreshold: COMPONENT_PICK_PIXEL_THRESHOLD,
      pointPixelThreshold: Math.max(POINT_HANDLE_PICK_RADIUS_PX, COMPONENT_POINT_PICK_RADIUS_PX),
      edgePixelThreshold: COMPONENT_EDGE_PIXEL_THRESHOLD,
      mode,
      getSurfacePickMesh,
      getPolylineRenderData,
      refineSurfaceIntersection: refineNurbsIntersection,
    });
  };

  const applyPick = (
    pick: PickResult | null,
    shiftKey: boolean,
    ctrlShiftKey: boolean
  ) => {
    if (!pick) {
      if (!shiftKey) {
        setSelectionState([], []);
      }
      return;
    }

    if (pivotRef.current.mode === "picked" && pick.point) {
      setPivotPickedPosition(pick.point);
    }

    if (ctrlShiftKey && pick.kind === "component") {
      updateComponentSelection(pick.selection, shiftKey);
      return;
    }

    const geometryId = pick.kind === "object" ? pick.geometryId : pick.selection.geometryId;
    const current = selectionRef.current;
    if (!shiftKey) {
      setSelectionState([geometryId], []);
      return;
    }
    if (current.includes(geometryId)) {
      setSelectionState(current.filter((id) => id !== geometryId), []);
    } else {
      setSelectionState([...current, geometryId], []);
    }
  };

  const resolveComponentMode = () => {
    const mode = selectionModeRef.current;
    return mode === "object" ? "face" : mode;
  };

  const selectWithBox = (
    context: NonNullable<ReturnType<typeof getPointerContext>>,
    rect: { x: number; y: number; width: number; height: number },
    shiftKey: boolean
  ) => {
    const hidden = new Set(hiddenRef.current);
    const locked = new Set(lockedRef.current);
    const ids: string[] = [];

    geometry.forEach((item) => {
      if (hidden.has(item.id) || locked.has(item.id)) return;
      if (item.type === "vertex" && referencedVertexIds.has(item.id)) return;
      const bounds = geometryBoundsMap.get(item.id);
      if (!bounds) return;
      const { min, max } = bounds;
      const corners: Vec3[] = [
        { x: min.x, y: min.y, z: min.z },
        { x: max.x, y: min.y, z: min.z },
        { x: min.x, y: max.y, z: min.z },
        { x: max.x, y: max.y, z: min.z },
        { x: min.x, y: min.y, z: max.z },
        { x: max.x, y: min.y, z: max.z },
        { x: min.x, y: max.y, z: max.z },
        { x: max.x, y: max.y, z: max.z },
      ];
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      let hasProjection = false;
      corners.forEach((corner) => {
        const projected = projectPointToScreen(corner, context.viewProjection, context.rect);
        if (!projected) return;
        minX = Math.min(minX, projected.x);
        minY = Math.min(minY, projected.y);
        maxX = Math.max(maxX, projected.x);
        maxY = Math.max(maxY, projected.y);
        hasProjection = true;
      });
      if (!hasProjection) return;
      const screenRect = {
        x: minX,
        y: minY,
        width: Math.max(0, maxX - minX),
        height: Math.max(0, maxY - minY),
      };
      if (rectIntersects(rect, screenRect)) {
        ids.push(item.id);
      }
    });

    if (ids.length === 0) {
      if (!shiftKey) setSelectionState([], []);
      return;
    }

    if (!shiftKey) {
      setSelectionState(ids, []);
      return;
    }

    const merged = new Set(selectionRef.current);
    ids.forEach((id) => merged.add(id));
    setSelectionState(Array.from(merged), []);
  };

  const resetSnapCycle = () => {
    snapCycleRef.current = { candidates: [], index: 0, basePoint: null };
  };

  const isSameSnapCandidateList = (
    a: SnapCandidate[],
    b: SnapCandidate[]
  ) => {
    if (a.length !== b.length) return false;
    return a.every((candidate, index) => {
      const other = b[index];
      if (!other) return false;
      if (candidate.type !== other.type) return false;
      return distance(candidate.point, other.point) <= 1e-6;
    });
  };

  const collectSnapCandidates = (
    point: Vec3,
    options?: { includeGrid?: boolean }
  ): SnapCandidate[] => {
    const snapSettings = snapSettingsRef.current;
    const snapRadius = getGridStep() * 0.75;
    const candidates: SnapCandidate[] = [];

    const consider = (candidate: Vec3, type: string) => {
      const d = distance(point, candidate);
      if (d <= snapRadius) {
        candidates.push({ point: candidate, type, distance: d });
      }
    };

    if (snapSettings.vertices) {
      vertexItems.forEach((vertex) => {
        consider(vertex.position, "vertex");
      });
    }
    if (snapSettings.endpoints) {
      endpointCandidates.forEach((candidate) => {
        consider(candidate.point, "endpoint");
      });
    }
    if (snapSettings.midpoints) {
      midpointCandidates.forEach((candidate) => {
        consider(candidate, "midpoint");
      });
    }
    if (snapSettings.intersections) {
      intersectionCandidates.forEach((candidate) => {
        consider(candidate, "intersection");
      });
    }
    if (snapSettings.perpendicular || snapSettings.tangent) {
      const cPlane = cPlaneRef.current;
      segmentCandidates.forEach((segment) => {
        const nearest = projectPointToPlane(point, cPlane);
        const a2 = projectPointToPlane(segment.a, cPlane);
        const b2 = projectPointToPlane(segment.b, cPlane);
        const denom =
          (b2.u - a2.u) * (b2.u - a2.u) + (b2.v - a2.v) * (b2.v - a2.v);
        if (denom < 1e-8) return;
        const t =
          ((nearest.u - a2.u) * (b2.u - a2.u) + (nearest.v - a2.v) * (b2.v - a2.v)) /
          denom;
        const clamped = Math.min(Math.max(t, 0), 1);
        const projected = unprojectPointFromPlane(
          {
            u: a2.u + (b2.u - a2.u) * clamped,
            v: a2.v + (b2.v - a2.v) * clamped,
          },
          cPlane
        );
        if (snapSettings.perpendicular) {
          consider(projected, "perpendicular");
        } else if (snapSettings.tangent) {
          consider(projected, "tangent");
        }
      });
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.distance - b.distance);
      return candidates;
    }

    if (options?.includeGrid !== false && snapSettings.grid) {
      const cPlane = cPlaneRef.current;
      const relative = sub(point, cPlane.origin);
      const u = dot(relative, cPlane.xAxis);
      const v = dot(relative, cPlane.yAxis);
      const w = dot(relative, cPlane.normal);
      const snapped = add(
        cPlane.origin,
        add(
          add(scale(cPlane.xAxis, snapValue(u)), scale(cPlane.yAxis, snapValue(v))),
          scale(cPlane.normal, w)
        )
      );
      return [{ point: snapped, type: "grid", distance: distance(point, snapped) }];
    }

    return [];
  };

  const selectSnapCandidate = (basePoint: Vec3, candidates: SnapCandidate[]) => {
    if (candidates.length === 0) {
      resetSnapCycle();
      return null;
    }
    const current = snapCycleRef.current;
    const moved =
      !current.basePoint || distance(current.basePoint, basePoint) > getGridStep() * 0.1;
    const sameList = isSameSnapCandidateList(current.candidates, candidates);
    const nextIndex = moved || !sameList ? 0 : Math.min(current.index, candidates.length - 1);
    snapCycleRef.current = {
      candidates,
      index: nextIndex,
      basePoint,
    };
    return candidates[nextIndex] ?? null;
  };

  const cycleSnapCandidate = () => {
    const current = snapCycleRef.current;
    if (current.candidates.length <= 1) return null;
    const nextIndex = (current.index + 1) % current.candidates.length;
    snapCycleRef.current = { ...current, index: nextIndex };
    return current.candidates[nextIndex] ?? null;
  };

  const snapPoint = (
    point: Vec3,
    options?: { allow?: boolean; includeGrid?: boolean }
  ) => {
    if (options?.allow === false) {
      setSnapIndicator(null);
      resetSnapCycle();
      return { point };
    }

    const candidates = collectSnapCandidates(point, { includeGrid: options?.includeGrid });
    const selected = candidates[0] ?? null;
    if (selected) {
      setSnapIndicator({ point: selected.point, type: selected.type });
      return { point: selected.point, type: selected.type };
    }

    setSnapIndicator(null);
    resetSnapCycle();
    return { point };
  };

  const setPreviewLine = (points: Vec3[], closed: boolean) => {
    previewStateRef.current = { kind: "line", points, closed };
    previewDirtyRef.current = true;
  };

  const setPreviewMesh = (mesh: RenderMesh) => {
    previewStateRef.current = { kind: "mesh", mesh };
    previewDirtyRef.current = true;
  };

  const clearPreview = () => {
    previewStateRef.current = null;
    previewDirtyRef.current = true;
  };

  const refreshPreview = (pointerPoint: Vec3 | null) => {
    pointerPlaneRef.current = pointerPoint;
    const commandId = activeCommandIdRef.current;
    if (!commandId) {
      clearPreview();
      return;
    }

    if (commandId === "polyline") {
      if (polylinePointsRef.current.length === 0) {
        clearPreview();
        return;
      }
      const points = pointerPoint
        ? [...polylinePointsRef.current, pointerPoint]
        : [...polylinePointsRef.current];
      setPreviewLine(points, false);
      return;
    }

    if (commandId === "curve") {
      if (curvePointsRef.current.length === 0) {
        clearPreview();
        return;
      }
      const controlPoints = pointerPoint
        ? [...curvePointsRef.current, pointerPoint]
        : [...curvePointsRef.current];
      if (controlPoints.length < 2) {
        clearPreview();
        return;
      }
      const previewPoints = computeCurvePoints(controlPoints);
      setPreviewLine(previewPoints, curveConfigRef.current.closed);
      return;
    }

    if (commandId === "line") {
      if (!lineStartRef.current || !pointerPoint) {
        clearPreview();
        return;
      }
      const line = computeLineFromDrag(lineStartRef.current, pointerPoint);
      if (!line) {
        clearPreview();
        return;
      }
      setPreviewLine(line.points, false);
      return;
    }

    if (commandId === "arc") {
      if (!arcStartRef.current || !pointerPoint) {
        clearPreview();
        return;
      }
      if (!arcEndRef.current) {
        setPreviewLine([arcStartRef.current, pointerPoint], false);
        return;
      }
      const arc = computeArcFromPoints(arcStartRef.current, arcEndRef.current, pointerPoint);
      setPreviewLine(arc.points, false);
      return;
    }

    if (commandId === "rectangle") {
      if (!rectangleStartRef.current || !pointerPoint) {
        clearPreview();
        return;
      }
      const rectangle = computeRectangleFromDrag(rectangleStartRef.current, pointerPoint);
      if (!rectangle) {
        clearPreview();
        return;
      }
      setPreviewLine([...rectangle.points, rectangle.points[0]], true);
      return;
    }

    if (commandId === "circle") {
      if (!circleCenterRef.current || !pointerPoint) {
        clearPreview();
        return;
      }
      const circle = computeCircleFromDrag(circleCenterRef.current, pointerPoint);
      setPreviewLine([...circle.points, circle.points[0]], true);
      return;
    }

    if (isPrimitiveCommand(commandId)) {
      if (!primitiveCenterRef.current || !pointerPoint) {
        clearPreview();
        return;
      }
      const scalar = computePrimitiveScalarFromDrag(primitiveCenterRef.current, pointerPoint);
      const built = buildPrimitiveMesh(primitiveCenterRef.current, scalar);
      if (!built) {
        clearPreview();
        return;
      }
      setPreviewMesh(built.mesh);
      return;
    }

    clearPreview();
  };

  const buildModelerSnapshot = (): ModelerSnapshot => {
    const state = useProjectStore.getState();
    return {
      geometry: state.geometry,
      layers: state.layers,
      assignments: state.assignments,
      selectedGeometryIds: state.selectedGeometryIds,
      componentSelection: state.componentSelection,
      selectionMode: state.selectionMode,
      cPlane: state.cPlane,
      pivot: state.pivot,
      transformOrientation: state.transformOrientation,
      gumballAlignment: state.gumballAlignment,
      showRotationRings: state.showRotationRings,
      showMoveArms: state.showMoveArms,
      displayMode: state.displayMode,
      viewSolidity: state.viewSolidity,
      viewSettings: state.viewSettings,
      snapSettings: state.snapSettings,
      gridSettings: state.gridSettings,
      camera: state.camera,
      hiddenGeometryIds: state.hiddenGeometryIds,
      lockedGeometryIds: state.lockedGeometryIds,
      sceneNodes: state.sceneNodes,
    };
  };

  const isSameTransformPreview = (
    next: TransformPreview | null,
    current: TransformPreview | null
  ) => {
    if (next === current) return true;
    if (!next || !current) return false;
    if (next.delta && current.delta) {
      return (
        next.delta.x === current.delta.x &&
        next.delta.y === current.delta.y &&
        next.delta.z === current.delta.z
      );
    }
    if (typeof next.angle === "number" && typeof current.angle === "number") {
      return next.angle === current.angle;
    }
    if (next.scale && current.scale) {
      return (
        next.scale.x === current.scale.x &&
        next.scale.y === current.scale.y &&
        next.scale.z === current.scale.z
      );
    }
    if (typeof next.distance === "number" && typeof current.distance === "number") {
      return next.distance === current.distance;
    }
    return false;
  };

  const scheduleTransformPreview = (preview: TransformPreview | null) => {
    if (isSameTransformPreview(preview, transformPreviewRef.current)) return;
    transformPreviewRef.current = preview;
    if (transformPreviewFrameRef.current !== null) return;
    transformPreviewFrameRef.current = requestAnimationFrame(() => {
      transformPreviewFrameRef.current = null;
      setTransformPreview(transformPreviewRef.current);
    });
  };

  const buildTransformTargets = (overrideIds?: string[]): TransformTargets => {
    const vertexIds = new Set<string>();
    const meshTargets = new Map<string, { positions: number[]; indices: Set<number> }>();

    const addVertexId = (id: string) => {
      if (lockedRef.current.includes(id)) return;
      vertexIds.add(id);
    };

    const addMeshIndices = (geometryId: string, mesh: RenderMesh, indices: number[]) => {
      if (lockedRef.current.includes(geometryId)) return;
      const entry =
        meshTargets.get(geometryId) ??
        { positions: mesh.positions, indices: new Set<number>() };
      indices.forEach((index) => entry.indices.add(index));
      meshTargets.set(geometryId, entry);
    };

    const currentGeometry = geometryRef.current;
    if (componentSelectionRef.current.length > 0) {
      componentSelectionRef.current.forEach((selection) => {
        const item = currentGeometry.find((entry) => entry.id === selection.geometryId);
        if (!item) return;
        const vertexSelection = asVertexSelection(selection);
        if (vertexSelection) {
          if (vertexSelection.vertexId) addVertexId(vertexSelection.vertexId);
          if (vertexSelection.vertexIndex != null && "mesh" in item) {
            addMeshIndices(item.id, item.mesh, [vertexSelection.vertexIndex]);
          }
          return;
        }
        const edgeSelection = asEdgeSelection(selection);
        if (edgeSelection) {
          if (edgeSelection.vertexIds) {
            edgeSelection.vertexIds.forEach((id) => addVertexId(id));
          }
          if (edgeSelection.vertexIndices && "mesh" in item) {
            addMeshIndices(item.id, item.mesh, edgeSelection.vertexIndices);
          }
          return;
        }
        const faceSelection = asFaceSelection(selection);
        if (faceSelection && "mesh" in item) {
          addMeshIndices(item.id, item.mesh, faceSelection.vertexIndices);
        }
      });
    } else {
      const idsToUse = overrideIds ?? selectionRef.current;
      idsToUse.forEach((id) => {
        if (lockedRef.current.includes(id)) return;
        const item = currentGeometry.find((entry) => entry.id === id);
        if (!item) return;
        if (item.type === "vertex") {
          addVertexId(item.id);
          return;
        }
        if (item.type === "polyline") {
          item.vertexIds.forEach((vertexId) => addVertexId(vertexId));
          return;
        }
        if ("mesh" in item) {
          const indices = Array.from(
            { length: item.mesh.positions.length / 3 },
            (_, index) => index
          );
          addMeshIndices(item.id, item.mesh, indices);
        }
      });
    }

    const finalized = new Map<string, { positions: number[]; indices: number[] }>();
    meshTargets.forEach((entry, geometryId) => {
      finalized.set(geometryId, {
        positions: entry.positions,
        indices: Array.from(entry.indices),
      });
    });

    return { vertexIds: Array.from(vertexIds), meshTargets: finalized };
  };

  const applyTransformToTargets = (
    session: TransformSession,
    transformPoint: (point: Vec3) => Vec3
  ) => {
    const updates: Array<{ id: string; data: Partial<Geometry> }> = [];
    session.targets.vertexIds.forEach((id) => {
      const startPosition = session.startVertexPositions.get(id) ?? vertexMap.get(id)?.position;
      if (!startPosition) return;
      const next = transformPoint(startPosition);
      updates.push({ id, data: { position: next } });
    });
    session.targets.meshTargets.forEach((target, geometryId) => {
      const basePositions = session.startMeshPositions.get(geometryId);
      const extras = session.meshExtras.get(geometryId);
      if (!basePositions || !extras) return;
      const nextPositions = basePositions.slice();
      target.indices.forEach((index) => {
        const point = {
          x: basePositions[index * 3],
          y: basePositions[index * 3 + 1],
          z: basePositions[index * 3 + 2],
        };
        const next = transformPoint(point);
        nextPositions[index * 3] = next.x;
        nextPositions[index * 3 + 1] = next.y;
        nextPositions[index * 3 + 2] = next.z;
      });
      updates.push({
        id: geometryId,
        data: {
          mesh: {
            positions: nextPositions,
            normals: extras.normals,
            uvs: extras.uvs,
            indices: extras.indices,
          },
        },
      });
    });
    if (updates.length > 0) {
      updateGeometryBatch(updates, { recordHistory: false });
    }
  };

  const updateTransformSession = (
    session: TransformSession,
    preview: TransformPreview
  ) => {
    if (session.mode === "move" && preview.delta) {
      applyTransformToTargets(session, (point) =>
        translatePoint(point, preview.delta ?? { x: 0, y: 0, z: 0 })
      );
    }
    if (session.mode === "rotate" && typeof preview.angle === "number") {
      const axis = session.axis ?? session.basis.zAxis;
      applyTransformToTargets(session, (point) =>
        rotateAroundAxis(point, session.pivot, axis, preview.angle ?? 0)
      );
    }
    if (session.mode === "scale" && preview.scale) {
      applyTransformToTargets(session, (point) =>
        scaleAroundPivot(point, session.pivot, preview.scale ?? { x: 1, y: 1, z: 1 }, session.basis)
      );
    }
    scheduleTransformPreview(preview);
  };

  const resetGumballDrag = () => {
    gumballDragRef.current = null;
  };

  const cancelTransformSession = () => {
    const session = transformSessionRef.current;
    if (!session) return;
    const updates: Array<{ id: string; data: Partial<Geometry> }> = [];
    session.startVertexPositions.forEach((position, id) => {
      updates.push({ id, data: { position } });
    });
    session.startMeshPositions.forEach((positions, geometryId) => {
      const extras = session.meshExtras.get(geometryId);
      if (!extras) return;
      updates.push({
        id: geometryId,
        data: {
          mesh: {
            positions,
            normals: extras.normals,
            uvs: extras.uvs,
            indices: extras.indices,
          },
        },
      });
    });
    if (updates.length > 0) {
      updateGeometryBatch(updates, { recordHistory: false });
    }
    transformSessionRef.current = null;
    scheduleTransformPreview(null);
    setTransformInputs(null);
    resetGumballDrag();
    transformInputEditingRef.current = false;
    setSnapIndicator(null);
    resetSnapCycle();
  };

  const commitTransformSession = () => {
    const session = transformSessionRef.current;
    if (!session) return;
    recordModelerHistory(session.historySnapshot);
    transformSessionRef.current = null;
    scheduleTransformPreview(null);
    setTransformInputs(null);
    resetGumballDrag();
    transformInputEditingRef.current = false;
    setSnapIndicator(null);
    resetSnapCycle();
  };

  const buildAxisDragPlane = (
    axisVec: Vec3,
    pivotPoint: Vec3,
    referenceDirection?: Vec3,
    basisOverride?: Basis
  ) => {
    const basis = basisOverride ?? orientationBasisRef.current;
    const plane = cPlaneRef.current;
    const axis = normalize(axisVec);
    if (length(axis) < 1e-8) {
      return { origin: pivotPoint, normal: plane.normal };
    }
    const candidateSources: Array<Vec3 | undefined> = [
      referenceDirection,
      plane.normal,
      basis.xAxis,
      basis.yAxis,
      basis.zAxis,
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
    ];

    for (const source of candidateSources) {
      if (!source) continue;
      const reference = normalize(source);
      if (length(reference) < 1e-8) continue;
      const normal = cross(axis, reference);
      if (length(normal) < 1e-8) continue;
      return { origin: pivotPoint, normal: normalize(normal) };
    }

    const fallback = Math.abs(axis.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    const fallbackNormal = normalize(cross(axis, fallback));
    if (length(fallbackNormal) < 1e-8) {
      return { origin: pivotPoint, normal: plane.normal };
    }
    return { origin: pivotPoint, normal: fallbackNormal };
  };

  const startTransformSession = (
    mode: TransformMode,
    constraint: TransformConstraint,
    context: NonNullable<ReturnType<typeof getPointerContext>>,
    options?: { basis?: Basis; pivot?: Vec3; planeOrigin?: Vec3 }
  ) => {
    resetSnapCycle();
    const basis = options?.basis ?? orientationBasisRef.current;
    const pivotPoint = options?.pivot ?? resolvedPivotRef.current;
    const planeOrigin = options?.planeOrigin ?? pivotPoint;
    const orientationMode = transformOrientationRef.current;
    const targets = buildTransformTargets();
    if (targets.vertexIds.length === 0 && targets.meshTargets.size === 0) return false;

    const startVertexPositions = new Map<string, Vec3>();
    targets.vertexIds.forEach((id) => {
      const vertex = vertexMap.get(id);
      if (vertex) {
        startVertexPositions.set(id, vertex.position);
      }
    });
    const startMeshPositions = new Map<string, number[]>();
    const meshExtras = new Map<
      string,
      { normals: number[]; uvs: number[]; indices: number[] }
    >();
    targets.meshTargets.forEach((_, geometryId) => {
      const item = geometryRef.current.find((entry) => entry.id === geometryId);
      if (!item || !("mesh" in item)) return;
      startMeshPositions.set(geometryId, item.mesh.positions.slice());
      meshExtras.set(geometryId, {
        normals: item.mesh.normals,
        uvs: item.mesh.uvs,
        indices: item.mesh.indices,
      });
    });

    const cameraDirection = normalize(
      sub(
        {
          x: context.cameraPayload.target[0],
          y: context.cameraPayload.target[1],
          z: context.cameraPayload.target[2],
        },
        {
          x: context.cameraPayload.position[0],
          y: context.cameraPayload.position[1],
          z: context.cameraPayload.position[2],
        }
      )
    );

    let axis: Vec3 | undefined;
    if (constraint.kind === "axis") {
      axis =
        constraint.axis === "x"
          ? basis.xAxis
          : constraint.axis === "y"
            ? basis.yAxis
            : basis.zAxis;
    }

    let plane: { origin: Vec3; normal: Vec3 } | undefined;
    if (constraint.kind === "plane" && constraint.plane) {
      const normal =
        constraint.plane === "xy"
          ? basis.zAxis
          : constraint.plane === "yz"
            ? basis.xAxis
            : basis.yAxis;
      plane = { origin: planeOrigin, normal };
    } else if (constraint.kind === "axis" && axis) {
      plane = buildAxisDragPlane(axis, planeOrigin, cameraDirection, basis);
    } else if (constraint.kind === "screen") {
      plane = { origin: planeOrigin, normal: cameraDirection };
    } else if (mode === "rotate" && axis) {
      plane = { origin: planeOrigin, normal: axis };
    }

    let startPoint = plane
      ? intersectRayWithPlane(context.ray, plane.origin, plane.normal)
      : null;
    if (mode === "rotate" && axis && !startPoint) {
      startPoint = getRotatePlaneHit(context, axis, pivotPoint);
    }

    const startVector =
      mode === "rotate" && startPoint ? sub(startPoint, pivotPoint) : undefined;
    const startDistance =
      mode === "scale" && startPoint ? distance(startPoint, pivotPoint) : undefined;

    const scaleMode =
      mode === "scale" && constraint.kind === "screen" ? "uniform" : "axis";

    transformSessionRef.current = {
      mode,
      orientation: orientationMode,
      constraint,
      pivot: pivotPoint,
      basis,
      axis,
      plane,
      startPoint: startPoint ?? undefined,
      startVector,
      startDistance,
      targets,
      startVertexPositions,
      startMeshPositions,
      meshExtras,
      historySnapshot: buildModelerSnapshot(),
      scaleMode,
      scaleAxis: constraint.kind === "axis" ? constraint.axis : undefined,
    };

    setTransformInputs(() => {
      if (mode === "move") {
        return { mode: "move", x: "0", y: "0", z: "0" };
      }
      if (mode === "rotate") {
        return { mode: "rotate", angle: "0" };
      }
      if (mode === "scale" && scaleMode === "uniform") {
        return { mode: "scale", scale: "1", scaleMode: "uniform" };
      }
      if (mode === "scale") {
        return {
          mode: "scale",
          x: "1",
          y: "1",
          z: "1",
          scaleMode: "axis",
          scaleAxis: constraint.kind === "axis" ? constraint.axis : undefined,
        };
      }
      return null;
    });
    transformInputEditingRef.current = false;
    return true;
  };

  const resolveGumballPrompt = (handle: GumballHandle, mode: TransformMode | "extrude") => {
    if (handle.kind === "pivot") return "";
    if (mode === "rotate" || handle.kind === "rotate") {
      return "Rotate: drag ring or type angle, Enter";
    }
    if (mode === "scale" || handle.kind === "scale") {
      return "Scale: drag handle or type values, Enter";
    }
    if (mode === "extrude" || handle.kind === "extrude") {
      return "Extrude: drag or type distance, Enter";
    }
    return "Move: drag handle or type X/Y/Z, Enter";
  };

  const applyGumballClickStep = (handle: GumballHandle) => {
    const stepDistance = resolveGumballStep(
      gumballStepRef.current.distance,
      GUMBALL_STEP_DEFAULT_DISTANCE
    );
    const stepAngleDeg = resolveGumballStep(
      gumballStepRef.current.angle,
      GUMBALL_STEP_DEFAULT_ANGLE
    );
    if (handle.kind === "axis") {
      const session = transformSessionRef.current;
      const axis = session?.axis;
      if (!session || !axis || length(axis) < 1e-6) return false;
      const delta = scale(normalize(axis), stepDistance);
      updateTransformSession(session, { delta });
      commitTransformSession();
      return true;
    }
    if (handle.kind === "rotate") {
      const session = transformSessionRef.current;
      if (!session) return false;
      const angle = (stepAngleDeg * Math.PI) / 180;
      updateTransformSession(session, { angle });
      commitTransformSession();
      return true;
    }
    if (handle.kind === "extrude") {
      const session = extrudeSessionRef.current;
      if (!session) return false;
      const distanceValue = stepDistance;
      applyExtrudeToMeshes(session, distanceValue);
      scheduleTransformPreview({ distance: distanceValue });
      commitExtrudeSession();
      return true;
    }
    return false;
  };

  const updateTransformFromPointer = (
    context: NonNullable<ReturnType<typeof getPointerContext>>,
    event: PointerEvent
  ) => {
    const session = transformSessionRef.current;
    if (!session) return;
    if (session.typedDelta || session.typedAngle || session.typedScale) return;
    const plane = session.plane;
    if (!plane) return;
    const intersection = intersectRayWithPlane(context.ray, plane.origin, plane.normal);
    let hitPoint = intersection;
    if (!hitPoint && session.mode === "rotate" && session.axis) {
      hitPoint = getRotatePlaneHit(context, session.axis, session.pivot);
    }
    if (!hitPoint) return;

    const snapDisabled = event.ctrlKey || event.metaKey;
    const useStep = event.shiftKey && !snapDisabled;
    const allowSnap = !snapDisabled;
    const snapSettings = snapSettingsRef.current;
    const gridStep = getGridStep();
    const stepDistance = resolveGumballStep(
      gumballStepRef.current.distance,
      GUMBALL_STEP_DEFAULT_DISTANCE
    );
    const stepAngleDeg = resolveGumballStep(
      gumballStepRef.current.angle,
      GUMBALL_STEP_DEFAULT_ANGLE
    );

    if (session.mode === "move") {
      let delta = session.startPoint
        ? sub(hitPoint, session.startPoint)
        : sub(hitPoint, session.pivot);
      const basePoint = add(session.pivot, delta);
      if (session.constraint.kind === "axis" && session.axis) {
        const axis = normalize(session.axis);
        let axisDistance = dot(delta, axis);
        if (useStep) {
          axisDistance = snapToStep(axisDistance, stepDistance);
          resetSnapCycle();
          setSnapIndicator({
            point: add(session.pivot, scale(axis, axisDistance)),
            type: "grid",
          });
        } else if (allowSnap) {
          const rawCandidates = collectSnapCandidates(basePoint, { includeGrid: false });
          const axisCandidates = rawCandidates
            .map((candidate) => {
              const projectedDistance = dot(sub(candidate.point, session.pivot), axis);
              const projectedPoint = add(session.pivot, scale(axis, projectedDistance));
              const offAxisDistance = distance(candidate.point, projectedPoint);
              if (offAxisDistance <= gridStep * 0.75) {
                return { ...candidate, point: projectedPoint };
              }
              return null;
            })
            .filter((candidate): candidate is SnapCandidate => Boolean(candidate));
          const selected = selectSnapCandidate(basePoint, axisCandidates);
          if (selected) {
            axisDistance = dot(sub(selected.point, session.pivot), axis);
            setSnapIndicator({ point: selected.point, type: selected.type });
          } else if (snapSettings.grid) {
            axisDistance = snapValue(axisDistance);
            resetSnapCycle();
            setSnapIndicator({
              point: add(session.pivot, scale(axis, axisDistance)),
              type: "grid",
            });
          } else {
            resetSnapCycle();
            setSnapIndicator(null);
          }
        } else {
          resetSnapCycle();
          setSnapIndicator(null);
        }
        delta = scale(axis, axisDistance);
      } else if (session.constraint.kind === "plane") {
        if (useStep) {
          const planeAxes =
            session.constraint.plane === "xy"
              ? [session.basis.xAxis, session.basis.yAxis]
              : session.constraint.plane === "yz"
                ? [session.basis.yAxis, session.basis.zAxis]
                : [session.basis.xAxis, session.basis.zAxis];
          const [axisA, axisB] = planeAxes;
          const distanceA = snapToStep(dot(delta, axisA), stepDistance);
          const distanceB = snapToStep(dot(delta, axisB), stepDistance);
          delta = add(scale(axisA, distanceA), scale(axisB, distanceB));
          resetSnapCycle();
          setSnapIndicator({
            point: add(session.pivot, delta),
            type: "grid",
          });
        } else if (allowSnap) {
          const rawCandidates = collectSnapCandidates(basePoint, { includeGrid: true });
          const planeCandidates = rawCandidates.filter((candidate) => {
            const planeDistance = Math.abs(
              dot(sub(candidate.point, session.pivot), plane.normal)
            );
            return planeDistance <= gridStep * 0.75;
          });
          const selected = selectSnapCandidate(basePoint, planeCandidates);
          if (selected) {
            const planeDistance = dot(sub(selected.point, session.pivot), plane.normal);
            const projected = sub(selected.point, scale(plane.normal, planeDistance));
            delta = sub(projected, session.pivot);
            setSnapIndicator({ point: projected, type: selected.type });
          } else {
            resetSnapCycle();
            setSnapIndicator(null);
          }
        } else {
          resetSnapCycle();
          setSnapIndicator(null);
        }
      } else if (allowSnap) {
        const candidates = collectSnapCandidates(basePoint, { includeGrid: true });
        const selected = selectSnapCandidate(basePoint, candidates);
        if (selected) {
          delta = sub(selected.point, session.pivot);
          setSnapIndicator({ point: selected.point, type: selected.type });
        } else {
          resetSnapCycle();
          setSnapIndicator(null);
        }
      } else {
        resetSnapCycle();
        setSnapIndicator(null);
      }
      updateTransformSession(session, { delta });
      return;
    }

    if (session.mode === "rotate" && session.axis && session.startVector) {
      setSnapIndicator(null);
      resetSnapCycle();
      const currentVector = sub(hitPoint, session.pivot);
      const angle = Math.atan2(
        length(cross(session.startVector, currentVector)),
        dot(session.startVector, currentVector)
      );
      const sign = dot(cross(session.startVector, currentVector), session.axis) < 0 ? -1 : 1;
      let signedAngle = angle * sign;
      if (useStep) {
        const step = (stepAngleDeg * Math.PI) / 180;
        if (step > 0) {
          signedAngle = Math.round(signedAngle / step) * step;
        }
      } else if (!snapDisabled && snapSettings.angleStep > 0) {
        const step = (snapSettings.angleStep * Math.PI) / 180;
        signedAngle = Math.round(signedAngle / step) * step;
      }
      updateTransformSession(session, { angle: signedAngle });
      return;
    }

    if (session.mode === "scale") {
      setSnapIndicator(null);
      resetSnapCycle();
      if (session.constraint.kind === "axis" && session.axis) {
        const axis = normalize(session.axis);
        const axisDistance = dot(sub(hitPoint, session.pivot), axis);
        const baseDistance =
          session.startDistance && session.startDistance !== 0
            ? session.startDistance
            : 1;
        let factor = axisDistance / baseDistance;
        if (!Number.isFinite(factor) || factor === 0) factor = 1;
        if (allowSnap && snapSettings.grid) {
          const step = 0.1;
          factor = Math.round(factor / step) * step;
        }
        const axisId = session.constraint.axis ?? "x";
        const scaleVector =
          axisId === "x"
            ? { x: factor, y: 1, z: 1 }
            : axisId === "y"
              ? { x: 1, y: factor, z: 1 }
              : { x: 1, y: 1, z: factor };
        updateTransformSession(session, { scale: scaleVector });
        return;
      }
      const baseDistance =
        session.startDistance && session.startDistance !== 0 ? session.startDistance : 1;
      let factor = distance(hitPoint, session.pivot) / baseDistance;
      if (!Number.isFinite(factor) || factor === 0) factor = 1;
      if (allowSnap && snapSettings.grid) {
        const step = 0.1;
        factor = Math.round(factor / step) * step;
      }
      updateTransformSession(session, { scale: { x: factor, y: factor, z: factor } });
    }
  };

  const applyMoveSnapCandidate = (session: TransformSession, candidate: SnapCandidate) => {
    if (session.constraint.kind === "axis" && session.axis) {
      const axis = normalize(session.axis);
      const projectedDistance = dot(sub(candidate.point, session.pivot), axis);
      const projectedPoint = add(session.pivot, scale(axis, projectedDistance));
      setSnapIndicator({ point: projectedPoint, type: candidate.type });
      updateTransformSession(session, { delta: scale(axis, projectedDistance) });
      return;
    }
    if (session.constraint.kind === "plane" && session.plane) {
      const planeDistance = dot(sub(candidate.point, session.pivot), session.plane.normal);
      const projected = sub(candidate.point, scale(session.plane.normal, planeDistance));
      setSnapIndicator({ point: projected, type: candidate.type });
      updateTransformSession(session, { delta: sub(projected, session.pivot) });
      return;
    }
    setSnapIndicator({ point: candidate.point, type: candidate.type });
    updateTransformSession(session, { delta: sub(candidate.point, session.pivot) });
  };

  const applyPivotSnapCandidate = (candidate: SnapCandidate) => {
    setPivotMode("picked");
    setPivotPickedPosition(candidate.point);
    setSnapIndicator({ point: candidate.point, type: candidate.type });
  };

  const startPivotDrag = (
    context: NonNullable<ReturnType<typeof getPointerContext>>
  ) => {
    const cameraDirection = normalize(
      sub(
        {
          x: context.cameraPayload.target[0],
          y: context.cameraPayload.target[1],
          z: context.cameraPayload.target[2],
        },
        {
          x: context.cameraPayload.position[0],
          y: context.cameraPayload.position[1],
          z: context.cameraPayload.position[2],
        }
      )
    );
    const origin = resolvedPivotRef.current;
    const plane = { origin, normal: cameraDirection };
    const startPoint = intersectRayWithPlane(context.ray, plane.origin, plane.normal);
    if (!startPoint) return false;
    pivotDragPlaneRef.current = plane;
    setPivotMode("picked");
    setPivotPickedPosition(origin);
    resetSnapCycle();
    return true;
  };

  const updatePivotFromPointer = (
    context: NonNullable<ReturnType<typeof getPointerContext>>
  ) => {
    const plane = pivotDragPlaneRef.current;
    if (!plane) return;
    const intersection = intersectRayWithPlane(context.ray, plane.origin, plane.normal);
    if (!intersection) return;
    const basePoint = intersection;
    const candidates = collectSnapCandidates(basePoint, { includeGrid: true });
    const selected = selectSnapCandidate(basePoint, candidates);
    if (selected) {
      applyPivotSnapCandidate(selected);
      return;
    }
    resetSnapCycle();
    setSnapIndicator(null);
    setPivotMode("picked");
    setPivotPickedPosition(basePoint);
  };

  const applyExtrudeToMeshes = (session: ExtrudeSession, distanceValue: number) => {
    const grouped = new Map<string, ExtrudeHandle[]>();
    session.handles.forEach((handle) => {
      const group = grouped.get(handle.geometryId) ?? [];
      group.push(handle);
      grouped.set(handle.geometryId, group);
    });

    const updates: Array<{ id: string; data: Partial<Geometry> }> = [];
    grouped.forEach((handles, geometryId) => {
      const base = session.baseMeshes.get(geometryId);
      if (!base) return;
      const nextPositions = base.positions.slice();
      const nextIndices = base.indices.slice();
      handles.forEach((handle) => {
        const [i0, i1, i2] = handle.vertexIndices;
        const a = {
          x: base.positions[i0 * 3],
          y: base.positions[i0 * 3 + 1],
          z: base.positions[i0 * 3 + 2],
        };
        const b = {
          x: base.positions[i1 * 3],
          y: base.positions[i1 * 3 + 1],
          z: base.positions[i1 * 3 + 2],
        };
        const c = {
          x: base.positions[i2 * 3],
          y: base.positions[i2 * 3 + 1],
          z: base.positions[i2 * 3 + 2],
        };
        const offset = scale(handle.normal, distanceValue);
        const a2 = add(a, offset);
        const b2 = add(b, offset);
        const c2 = add(c, offset);
        const baseIndex = nextPositions.length / 3;
        nextPositions.push(
          a2.x,
          a2.y,
          a2.z,
          b2.x,
          b2.y,
          b2.z,
          c2.x,
          c2.y,
          c2.z
        );
        if (distanceValue >= 0) {
          nextIndices.push(baseIndex, baseIndex + 1, baseIndex + 2);
        } else {
          nextIndices.push(baseIndex, baseIndex + 2, baseIndex + 1);
        }

        const pushSide = (aIndex: number, bIndex: number, aNew: number, bNew: number) => {
          if (distanceValue >= 0) {
            nextIndices.push(aIndex, bNew, bIndex, aIndex, aNew, bNew);
          } else {
            nextIndices.push(aIndex, bIndex, bNew, aIndex, bNew, aNew);
          }
        };
        pushSide(i0, i1, baseIndex, baseIndex + 1);
        pushSide(i1, i2, baseIndex + 1, baseIndex + 2);
        pushSide(i2, i0, baseIndex + 2, baseIndex);
      });

      const normals = computeVertexNormals(nextPositions, nextIndices);
      updates.push({
        id: geometryId,
        data: {
          mesh: {
            positions: nextPositions,
            normals,
            uvs: base.uvs,
            indices: nextIndices,
          },
        },
      });
    });

    if (updates.length > 0) {
      updateGeometryBatch(updates, { recordHistory: false });
    }
  };

  const startExtrudeSession = (
    handle: ExtrudeHandle,
    context: NonNullable<ReturnType<typeof getPointerContext>>,
    handlesOverride?: ExtrudeHandle[]
  ) => {
    resetSnapCycle();
    const handles = handlesOverride ?? extrudeHandles;
    if (handles.length === 0) return false;
    const axis = normalize(handle.normal);
    if (length(axis) < 1e-6) return false;
    const baseMeshes = new Map<
      string,
      { positions: number[]; indices: number[]; normals: number[]; uvs: number[] }
    >();
    handles.forEach((entry) => {
      if (baseMeshes.has(entry.geometryId)) return;
      const item = geometryRef.current.find((geom) => geom.id === entry.geometryId);
      if (!item || !("mesh" in item)) return;
      baseMeshes.set(entry.geometryId, {
        positions: item.mesh.positions.slice(),
        indices: item.mesh.indices.slice(),
        normals: item.mesh.normals.slice(),
        uvs: item.mesh.uvs.slice(),
      });
    });
    const cameraDirection = normalize(
      sub(
        {
          x: context.cameraPayload.target[0],
          y: context.cameraPayload.target[1],
          z: context.cameraPayload.target[2],
        },
        {
          x: context.cameraPayload.position[0],
          y: context.cameraPayload.position[1],
          z: context.cameraPayload.position[2],
        }
      )
    );
    const plane = { origin: handle.center, normal: cameraDirection };
    const startPoint = intersectRayWithPlane(context.ray, plane.origin, plane.normal);
    if (!startPoint) return false;
    extrudeSessionRef.current = {
      handles,
      axis,
      plane,
      startPoint,
      startDistance: 0,
      baseMeshes,
      historySnapshot: buildModelerSnapshot(),
    };
    setTransformInputs({ mode: "extrude", distance: "0" });
    transformInputEditingRef.current = false;
    scheduleTransformPreview({ distance: 0 });
    return true;
  };

  const updateExtrudeFromPointer = (
    context: NonNullable<ReturnType<typeof getPointerContext>>,
    event: PointerEvent
  ) => {
    const session = extrudeSessionRef.current;
    if (!session) return;
    const intersection = intersectRayWithPlane(context.ray, session.plane.origin, session.plane.normal);
    if (!intersection) return;
    const delta = sub(intersection, session.startPoint);
    let distanceValue = session.startDistance + dot(delta, session.axis);
    const snapSettings = snapSettingsRef.current;
    const snapDisabled = event.ctrlKey || event.metaKey;
    const useStep = event.shiftKey && !snapDisabled;
    const stepDistance = resolveGumballStep(
      gumballStepRef.current.distance,
      GUMBALL_STEP_DEFAULT_DISTANCE
    );
    if (useStep) {
      distanceValue = snapToStep(distanceValue, stepDistance);
      const handle = session.handles[0];
      if (handle) {
        setSnapIndicator({
          point: add(handle.center, scale(session.axis, distanceValue)),
          type: "grid",
        });
      }
    } else if (!snapDisabled && snapSettings.grid) {
      distanceValue = snapValue(distanceValue);
      const handle = session.handles[0];
      if (handle) {
        setSnapIndicator({
          point: add(handle.center, scale(session.axis, distanceValue)),
          type: "grid",
        });
      }
    } else {
      setSnapIndicator(null);
    }
    applyExtrudeToMeshes(session, distanceValue);
    scheduleTransformPreview({ distance: distanceValue });
  };

  const cancelExtrudeSession = () => {
    const session = extrudeSessionRef.current;
    if (!session) return;
    const updates: Array<{ id: string; data: Partial<Geometry> }> = [];
    session.baseMeshes.forEach((base, geometryId) => {
      updates.push({
        id: geometryId,
        data: {
          mesh: {
            positions: base.positions,
            normals: base.normals,
            uvs: base.uvs,
            indices: base.indices,
          },
        },
      });
    });
    if (updates.length > 0) {
      updateGeometryBatch(updates, { recordHistory: false });
    }
    extrudeSessionRef.current = null;
    scheduleTransformPreview(null);
    setTransformInputs(null);
    resetGumballDrag();
    transformInputEditingRef.current = false;
    setSnapIndicator(null);
    resetSnapCycle();
  };

  const commitExtrudeSession = () => {
    const session = extrudeSessionRef.current;
    if (!session) return;
    recordModelerHistory(session.historySnapshot);
    extrudeSessionRef.current = null;
    scheduleTransformPreview(null);
    setTransformInputs(null);
    resetGumballDrag();
    transformInputEditingRef.current = false;
    setSnapIndicator(null);
    resetSnapCycle();
  };

  const getGumballHandleId = (handle: GumballHandle): GumballHandleId | null => {
    if (handle.kind === "axis") return `axis-${handle.axis}`;
    if (handle.kind === "plane") return `plane-${handle.plane}`;
    if (handle.kind === "rotate") return `rotate-${handle.axis}`;
    if (handle.kind === "scale") {
      if (handle.uniform) return "scale-uniform";
      if (handle.axis) return `scale-${handle.axis}`;
    }
    if (handle.kind === "pivot") return "pivot";
    return null;
  };

  const pickGumballHandle = (
    context: NonNullable<ReturnType<typeof getPointerContext>>,
    options?: { allowPivot?: boolean }
  ) => {
    const gumballState = gumballStateRef.current;
    if (!gumballState.visible || !gumballState.mode) return null;
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const widgetState = computeCornerGumballViewport(
      cameraRef.current,
      canvas,
      gumballViewportZoomRef.current,
      gumballPixelSize
    );
    const pointer = context.pointer;
    const viewportRect = computeGumballViewportScreenRect(
      cameraRef.current,
      canvas,
      gumballViewportZoomRef.current,
      gumballPixelSize
    );
    if (!viewportRect) return null;
    const viewportPadding = 2;
    if (
      pointer.x < viewportRect.x - viewportPadding ||
      pointer.x > viewportRect.x + viewportRect.width + viewportPadding ||
      pointer.y < viewportRect.y - viewportPadding ||
      pointer.y > viewportRect.y + viewportRect.height + viewportPadding
    ) {
      return null;
    }
    const pivot = widgetState.center;
    const gumballTransforms = getGumballTransforms({
      position: widgetState.center,
      orientation: gumballState.orientation,
      scale: widgetState.scale,
      mode: gumballState.mode,
    });
    const addMeshCandidate = (
      handle: GumballHandle,
      handleId: GumballHandleId | null,
      mesh: RenderMesh,
      modelMatrix: Float32Array
    ) => {
      const tRay = intersectRayMesh(context.ray, mesh, modelMatrix);
      if (tRay == null) return false;
      addCandidate(handle, handleId, 0, 0, 0, tRay);
      return true;
    };
    let scaleHit = false;

    const showMove =
      showMoveArmsRef.current &&
      (gumballState.mode === "move" || gumballState.mode === "gumball");
    const showRotate = (gumballState.mode === "rotate" || gumballState.mode === "gumball") &&
      showRotationRingsRef.current;
    const showScale = gumballState.mode === "scale" || gumballState.mode === "gumball";
    const showExtrude = gumballState.mode === "gumball" && extrudeHandles.length > 0;
    const allowPivot = options?.allowPivot ?? false;

    const candidates: Array<{
      handle: GumballHandle;
      handleId: GumballHandleId | null;
      distance: number;
      score: number;
      depth: number;
    }> = [];

    const addCandidate = (
      handle: GumballHandle,
      handleId: GumballHandleId | null,
      distance: number,
      maxDistance: number,
      bias = 0,
      depth?: number
    ) => {
      if (distance <= maxDistance) {
        candidates.push({
          handle,
          handleId,
          distance,
          score: distance - bias,
          depth: depth ?? Number.POSITIVE_INFINITY,
        });
      }
    };

    if (showScale) {
      if (
        addMeshCandidate(
          { kind: "scale", axis: "x" },
          "scale-x",
          GUMBALL_PICK_MESHES.scale,
          gumballTransforms.scaleX
        )
      ) {
        scaleHit = true;
      }
      if (
        addMeshCandidate(
          { kind: "scale", axis: "y" },
          "scale-y",
          GUMBALL_PICK_MESHES.scale,
          gumballTransforms.scaleY
        )
      ) {
        scaleHit = true;
      }
      if (
        addMeshCandidate(
          { kind: "scale", axis: "z" },
          "scale-z",
          GUMBALL_PICK_MESHES.scale,
          gumballTransforms.scaleZ
        )
      ) {
        scaleHit = true;
      }
      if (
        addMeshCandidate(
          { kind: "scale", uniform: true },
          "scale-uniform",
          GUMBALL_PICK_MESHES.scale,
          gumballTransforms.scaleUniform
        )
      ) {
        scaleHit = true;
      }
    }

    if (showMove && !scaleHit) {
      addMeshCandidate(
        { kind: "axis", axis: "x" },
        "axis-x",
        GUMBALL_PICK_MESHES.axis,
        gumballTransforms.xAxis
      );
      addMeshCandidate(
        { kind: "axis", axis: "y" },
        "axis-y",
        GUMBALL_PICK_MESHES.axis,
        gumballTransforms.yAxis
      );
      addMeshCandidate(
        { kind: "axis", axis: "z" },
        "axis-z",
        GUMBALL_PICK_MESHES.axis,
        gumballTransforms.zAxis
      );
      addMeshCandidate(
        { kind: "plane", plane: "xy" },
        "plane-xy",
        GUMBALL_PICK_MESHES.plane,
        gumballTransforms.xy
      );
      addMeshCandidate(
        { kind: "plane", plane: "yz" },
        "plane-yz",
        GUMBALL_PICK_MESHES.plane,
        gumballTransforms.yz
      );
      addMeshCandidate(
        { kind: "plane", plane: "xz" },
        "plane-xz",
        GUMBALL_PICK_MESHES.plane,
        gumballTransforms.xz
      );
    }

    if (showRotate && !scaleHit) {
      addMeshCandidate(
        { kind: "rotate", axis: "x" },
        "rotate-x",
        GUMBALL_PICK_MESHES.ring,
        gumballTransforms.rotateX
      );
      addMeshCandidate(
        { kind: "rotate", axis: "y" },
        "rotate-y",
        GUMBALL_PICK_MESHES.ring,
        gumballTransforms.rotateY
      );
      addMeshCandidate(
        { kind: "rotate", axis: "z" },
        "rotate-z",
        GUMBALL_PICK_MESHES.ring,
        gumballTransforms.rotateZ
      );
    }

    if (allowPivot) {
      addMeshCandidate(
        { kind: "pivot" },
        "pivot",
        GUMBALL_PICK_MESHES.scaleCenter,
        gumballTransforms.pivot
      );
    }

    if (showExtrude) {
      const primaryHandle = extrudeHandles[0];
      if (primaryHandle) {
        const average = extrudeHandles.reduce(
          (acc, handle) => add(acc, handle.normal),
          { x: 0, y: 0, z: 0 }
        );
        const axis = length(average) > 1e-6 ? normalize(average) : primaryHandle.normal;
        const extrudeOffset = GUMBALL_METRICS.extrudeHandleOffset * widgetState.scale;
        const proxyCenter = add(pivot, scale(axis, extrudeOffset));
        const basis = buildBasisFromNormal(axis);
        const modelMatrix = buildModelMatrix(basis, proxyCenter, widgetState.scale * 0.28);
        const tRay = intersectRayMesh(context.ray, GUMBALL_PICK_MESHES.scale, modelMatrix);
        if (tRay != null) {
          addCandidate(
            {
              kind: "extrude",
              geometryId: primaryHandle.geometryId,
              faceIndex: primaryHandle.faceIndex,
              vertexIndices: primaryHandle.vertexIndices,
              center: proxyCenter,
              normal: axis,
            },
            null,
            0,
            0,
            0,
            tRay
          );
        }
      }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => {
      const scoreDelta = a.score - b.score;
      if (Math.abs(scoreDelta) > 1e-6) return scoreDelta;
      return a.depth - b.depth;
    });
    return candidates[0];
  };

  const formatInputValue = (value: number, decimals = 3) => {
    if (!Number.isFinite(value)) return "0";
    const fixed = value.toFixed(decimals);
    return fixed.replace(/\.?0+$/, "");
  };

  const parseExpressionValue = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const allowed = /^[0-9+\-*/%^().\s]*$/;
    if (!allowed.test(trimmed)) return null;
    const sanitized = trimmed.replace(/\^/g, "**");
    try {
      const result = new Function(`"use strict"; return (${sanitized});`)();
      if (typeof result === "number" && Number.isFinite(result)) return result;
    } catch {
      return null;
    }
    return null;
  };

  const resolveNumericInput = (value: string | undefined, fallback: number) => {
    const parsed = value != null ? parseExpressionValue(value) : null;
    return parsed == null ? fallback : parsed;
  };

  const getTransformFieldOrder = (inputs: TransformInputState | null) => {
    if (!inputs) return [];
    if (inputs.mode === "move") return ["x", "y", "z"];
    if (inputs.mode === "rotate") return ["angle"];
    if (inputs.mode === "scale") {
      return inputs.scaleMode === "uniform" ? ["scale"] : ["x", "y", "z"];
    }
    if (inputs.mode === "extrude") return ["distance"];
    return [];
  };

  const focusTransformField = (field: string) => {
    const input = transformFieldRefs.current[field];
    if (!input) return;
    input.focus();
    input.select();
  };

  const handleTransformFieldKeyDown = (
    field: string,
    event: ReactKeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const order = getTransformFieldOrder(transformInputsRef.current);
      if (order.length === 0) return;
      const currentIndex = order.indexOf(field);
      const direction = event.shiftKey ? -1 : 1;
      const nextIndex = (currentIndex + direction + order.length) % order.length;
      focusTransformField(order[nextIndex]);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (transformSessionRef.current) {
        commitTransformSession();
        completeActiveCommand();
      } else if (extrudeSessionRef.current) {
        commitExtrudeSession();
        completeActiveCommand();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (transformSessionRef.current) {
        cancelTransformSession();
      } else if (extrudeSessionRef.current) {
        cancelExtrudeSession();
      }
    }
  };

  const applyMoveInput = (nextValues: Partial<TransformInputState>) => {
    setTransformInputs((prev) => {
      if (!prev || prev.mode !== "move") return prev;
      return { ...prev, ...nextValues };
    });
    const session = transformSessionRef.current;
    const current = transformInputsRef.current;
    if (!session || !current || current.mode !== "move") return;
    const next = { ...current, ...nextValues };
    const delta = {
      x: resolveNumericInput(next.x, 0),
      y: resolveNumericInput(next.y, 0),
      z: resolveNumericInput(next.z, 0),
    };
    session.typedDelta = delta;
    updateTransformSession(session, { delta });
  };

  const applyRotateInput = (nextValues: Partial<TransformInputState>) => {
    setTransformInputs((prev) => {
      if (!prev || prev.mode !== "rotate") return prev;
      return { ...prev, ...nextValues };
    });
    const session = transformSessionRef.current;
    const current = transformInputsRef.current;
    if (!session || !current || current.mode !== "rotate") return;
    const next = { ...current, ...nextValues };
    const angleDeg = resolveNumericInput(next.angle, 0);
    const angleRad = (angleDeg * Math.PI) / 180;
    session.typedAngle = angleRad;
    updateTransformSession(session, { angle: angleRad });
  };

  const nudgeRotateInput = (deltaDeg: number) => {
    const current = transformInputsRef.current;
    if (!current || current.mode !== "rotate") return;
    const angle = resolveNumericInput(current.angle, 0);
    const next = angle + deltaDeg;
    applyRotateInput({ angle: formatInputValue(next, 2) });
  };

  const applyScaleInput = (nextValues: Partial<TransformInputState>) => {
    setTransformInputs((prev) => {
      if (!prev || prev.mode !== "scale") return prev;
      return { ...prev, ...nextValues };
    });
    const session = transformSessionRef.current;
    const current = transformInputsRef.current;
    if (!session || !current || current.mode !== "scale") return;
    const next = { ...current, ...nextValues };
    if (next.scaleMode === "uniform") {
      const factor = resolveNumericInput(next.scale, 1);
      const scaleValue = { x: factor, y: factor, z: factor };
      session.typedScale = scaleValue;
      updateTransformSession(session, { scale: scaleValue });
      return;
    }
    const scaleValue = {
      x: resolveNumericInput(next.x, 1),
      y: resolveNumericInput(next.y, 1),
      z: resolveNumericInput(next.z, 1),
    };
    session.typedScale = scaleValue;
    updateTransformSession(session, { scale: scaleValue });
  };

  const applyExtrudeInput = (nextValues: Partial<TransformInputState>) => {
    setTransformInputs((prev) => {
      if (!prev || prev.mode !== "extrude") return prev;
      return { ...prev, ...nextValues };
    });
    const session = extrudeSessionRef.current;
    const current = transformInputsRef.current;
    if (!session || !current || current.mode !== "extrude") return;
    const next = { ...current, ...nextValues };
    const distanceValue = resolveNumericInput(next.distance, 0);
    applyExtrudeToMeshes(session, distanceValue);
    scheduleTransformPreview({ distance: distanceValue });
  };

  const applyPivotInput = (nextValues: Partial<{ x: string; y: string; z: string }>) => {
    setPivotInputs((prev) => ({ ...prev, ...nextValues }));
    const next = { ...pivotInputs, ...nextValues };
    const fallback = resolvedPivotRef.current;
    const x = resolveNumericInput(next.x, fallback.x);
    const y = resolveNumericInput(next.y, fallback.y);
    const z = resolveNumericInput(next.z, fallback.z);
    setPivotMode("picked");
    setPivotPickedPosition({ x, y, z });
  };

  const setPivotPreset = (preset: "centroid" | "origin" | "bbox") => {
    if (preset === "centroid") {
      setPivotMode("selection");
      return;
    }
    if (preset === "origin") {
      setPivotMode("origin");
      return;
    }
    const bounds = computeBoundsForIds(selectionRef.current);
    if (!bounds) return;
    const center = {
      x: (bounds.min.x + bounds.max.x) / 2,
      y: (bounds.min.y + bounds.max.y) / 2,
      z: (bounds.min.z + bounds.max.z) / 2,
    };
    setPivotMode("picked");
    setPivotPickedPosition(center);
  };

  useEffect(() => {
    if (!transformInputs || transformInputEditingRef.current) return;
    if (!transformPreview) return;
    if (transformInputs.mode === "move" && transformPreview.delta) {
      const nextX = formatInputValue(transformPreview.delta?.x ?? 0);
      const nextY = formatInputValue(transformPreview.delta?.y ?? 0);
      const nextZ = formatInputValue(transformPreview.delta?.z ?? 0);
      if (
        transformInputs.x === nextX &&
        transformInputs.y === nextY &&
        transformInputs.z === nextZ
      ) {
        return;
      }
      setTransformInputs((prev) =>
        prev && prev.mode === "move"
          ? {
              ...prev,
              x: nextX,
              y: nextY,
              z: nextZ,
            }
          : prev
      );
      return;
    }
    if (transformInputs.mode === "rotate" && typeof transformPreview.angle === "number") {
      const angleDeg = (transformPreview.angle * 180) / Math.PI;
      const nextAngle = formatInputValue(angleDeg, 2);
      if (transformInputs.angle === nextAngle) {
        return;
      }
      setTransformInputs((prev) =>
        prev && prev.mode === "rotate"
          ? {
              ...prev,
              angle: nextAngle,
            }
          : prev
      );
      return;
    }
    if (transformInputs.mode === "scale" && transformPreview.scale) {
      if (transformInputs.scaleMode === "uniform") {
        const nextScale = formatInputValue(transformPreview.scale?.x ?? 1);
        if (transformInputs.scale === nextScale) {
          return;
        }
        setTransformInputs((prev) =>
          prev && prev.mode === "scale"
            ? {
                ...prev,
                scale: nextScale,
              }
            : prev
        );
        return;
      }
      const nextX = formatInputValue(transformPreview.scale?.x ?? 1);
      const nextY = formatInputValue(transformPreview.scale?.y ?? 1);
      const nextZ = formatInputValue(transformPreview.scale?.z ?? 1);
      if (
        transformInputs.x === nextX &&
        transformInputs.y === nextY &&
        transformInputs.z === nextZ
      ) {
        return;
      }
      setTransformInputs((prev) =>
        prev && prev.mode === "scale"
          ? {
              ...prev,
              x: nextX,
              y: nextY,
              z: nextZ,
            }
          : prev
      );
      return;
    }
    if (transformInputs.mode === "extrude" && typeof transformPreview.distance === "number") {
      const nextDistance = formatInputValue(transformPreview.distance ?? 0);
      if (transformInputs.distance === nextDistance) {
        return;
      }
      setTransformInputs((prev) =>
        prev && prev.mode === "extrude"
          ? {
              ...prev,
              distance: nextDistance,
            }
          : prev
      );
    }
  }, [transformInputs, transformPreview]);

  const updatePreviewBuffers = () => {
    if (!previewDirtyRef.current) return;
    const renderer = rendererRef.current;
    if (!renderer) return;

    const preview = previewStateRef.current;
    const emptyFloat = new Float32Array();

    const lineBuffer =
      previewLineBufferRef.current ?? renderer.createGeometryBuffer(PREVIEW_LINE_ID);
    previewLineBufferRef.current = lineBuffer;
    const meshBuffer =
      previewMeshBufferRef.current ?? renderer.createGeometryBuffer(PREVIEW_MESH_ID);
    previewMeshBufferRef.current = meshBuffer;
    const edgeBuffer =
      previewEdgeBufferRef.current ?? renderer.createGeometryBuffer(PREVIEW_EDGE_ID);
    previewEdgeBufferRef.current = edgeBuffer;

    if (!preview) {
      lineBuffer.setData({
        positions: emptyFloat,
        prevPositions: emptyFloat,
        nextPositions: emptyFloat,
        sides: emptyFloat,
      });
      meshBuffer.setData({ positions: emptyFloat, normals: emptyFloat, indices: new Uint16Array() });
      edgeBuffer.setData({ positions: emptyFloat, indices: new Uint16Array() });
      previewDirtyRef.current = false;
      return;
    }

    if (preview.kind === "line") {
      const lineData = createLineBufferData(preview.points);
      lineBuffer.setData({
        positions: lineData.positions,
        prevPositions: lineData.prevPositions,
        nextPositions: lineData.nextPositions,
        sides: lineData.sides,
      });
      meshBuffer.setData({ positions: emptyFloat, normals: emptyFloat, indices: new Uint16Array() });
      edgeBuffer.setData({ positions: emptyFloat, indices: new Uint16Array() });
      previewDirtyRef.current = false;
      return;
    }

    meshBuffer.setData({
      positions: new Float32Array(preview.mesh.positions),
      normals: new Float32Array(preview.mesh.normals),
      indices: new Uint16Array(preview.mesh.indices),
    });
    edgeBuffer.setData({
      positions: new Float32Array(preview.mesh.positions),
      indices: buildEdgeIndexBuffer(preview.mesh),
    });
    lineBuffer.setData({
      positions: emptyFloat,
      prevPositions: emptyFloat,
      nextPositions: emptyFloat,
      sides: emptyFloat,
    });
    previewDirtyRef.current = false;
  };

  const updateHoverBuffers = () => {
    if (!hoverDirtyRef.current) return;
    const renderer = rendererRef.current;
    if (!renderer) return;

    const hover = hoverSelectionRef.current;
    const emptyFloat = new Float32Array();
    const lineBuffer =
      hoverLineBufferRef.current ?? renderer.createGeometryBuffer(HOVER_LINE_ID);
    hoverLineBufferRef.current = lineBuffer;
    const meshBuffer =
      hoverMeshBufferRef.current ?? renderer.createGeometryBuffer(HOVER_FACE_ID);
    hoverMeshBufferRef.current = meshBuffer;

    const clearBuffers = () => {
      lineBuffer.setData({
        positions: emptyFloat,
        prevPositions: emptyFloat,
        nextPositions: emptyFloat,
        sides: emptyFloat,
      });
      meshBuffer.setData({ positions: emptyFloat, normals: emptyFloat, indices: new Uint16Array() });
    };

    if (!hover) {
      clearBuffers();
      hoverDirtyRef.current = false;
      return;
    }

    const setLinePoints = (points: Vec3[]) => {
      if (points.length < 2) {
        lineBuffer.setData({
          positions: emptyFloat,
          prevPositions: emptyFloat,
          nextPositions: emptyFloat,
          sides: emptyFloat,
        });
        return;
      }
      const lineData = createLineBufferData(points);
      lineBuffer.setData({
        positions: lineData.positions,
        prevPositions: lineData.prevPositions,
        nextPositions: lineData.nextPositions,
        sides: lineData.sides,
      });
    };

    meshBuffer.setData({ positions: emptyFloat, normals: emptyFloat, indices: new Uint16Array() });

    if (hover.kind === "face") {
      const item = geometryRef.current.find((entry) => entry.id === hover.geometryId);
      if (!item || !("mesh" in item)) {
        clearBuffers();
        hoverDirtyRef.current = false;
        return;
      }
      const mesh = item.mesh;
      const [i0, i1, i2] = hover.vertexIndices;
      const a = getMeshPoint(mesh, i0);
      const b = getMeshPoint(mesh, i1);
      const c = getMeshPoint(mesh, i2);
      const normal = normalize(cross(sub(b, a), sub(c, a)));
      const normalVec =
        Number.isFinite(normal.x) && Number.isFinite(normal.y) && Number.isFinite(normal.z)
          ? normal
          : { x: 0, y: 1, z: 0 };

      meshBuffer.setData({
        positions: new Float32Array([
          a.x, a.y, a.z,
          b.x, b.y, b.z,
          c.x, c.y, c.z,
        ]),
        normals: new Float32Array([
          normalVec.x, normalVec.y, normalVec.z,
          normalVec.x, normalVec.y, normalVec.z,
          normalVec.x, normalVec.y, normalVec.z,
        ]),
        indices: new Uint16Array([0, 1, 2]),
      });
      setLinePoints([a, b, c, a]);
      hoverDirtyRef.current = false;
      return;
    }

    if (hover.kind === "edge") {
      let a: Vec3 | null = null;
      let b: Vec3 | null = null;
      if (hover.vertexIds) {
        const va = vertexMap.get(hover.vertexIds[0]);
        const vb = vertexMap.get(hover.vertexIds[1]);
        if (va && vb) {
          a = va.position;
          b = vb.position;
        }
      } else if (hover.vertexIndices) {
        const item = geometryRef.current.find((entry) => entry.id === hover.geometryId);
        if (item && "mesh" in item) {
          a = getMeshPoint(item.mesh, hover.vertexIndices[0]);
          b = getMeshPoint(item.mesh, hover.vertexIndices[1]);
        }
      }
      if (a && b) {
        setLinePoints([a, b]);
      } else {
        setLinePoints([]);
      }
      hoverDirtyRef.current = false;
      return;
    }

    if (hover.kind === "vertex") {
      let position: Vec3 | null = null;
      if (hover.vertexId) {
        const vertex = vertexMap.get(hover.vertexId);
        if (vertex) position = vertex.position;
      } else if (hover.vertexIndex != null) {
        const item = geometryRef.current.find((entry) => entry.id === hover.geometryId);
        if (item && "mesh" in item) {
          position = getMeshPoint(item.mesh, hover.vertexIndex);
        }
      }

      const canvas = canvasRef.current;
      if (position && canvas) {
        const scaleValue = computeGumballScale(
          cameraRef.current,
          position,
          canvas.height,
          gumballPixelSize
        );
        const worldPerPixel = scaleValue / gumballPixelSize;
        const size = worldPerPixel * 6;
        const basis = buildViewBasis(cameraRef.current);
        const right = basis.xAxis;
        const up = basis.yAxis;
        const p1 = add(position, add(scale(right, size), scale(up, size)));
        const p2 = add(position, add(scale(right, size), scale(up, -size)));
        const p3 = add(position, add(scale(right, -size), scale(up, -size)));
        const p4 = add(position, add(scale(right, -size), scale(up, size)));
        setLinePoints([p1, p2, p3, p4, p1]);
      } else {
        setLinePoints([]);
      }
      hoverDirtyRef.current = false;
      return;
    }

    hoverDirtyRef.current = false;
  };

  const updateGumballHoverPreviewBuffers = (
    canvas: HTMLCanvasElement,
    pixelSize: number
  ) => {
    if (!gumballHoverPreviewDirtyRef.current) return;
    const renderer = rendererRef.current;
    if (!renderer) return;

    const buffer =
      gumballHoverPreviewBufferRef.current ??
      renderer.createGeometryBuffer(GUMBALL_HOVER_PREVIEW_ID);
    gumballHoverPreviewBufferRef.current = buffer;

    const emptyFloat = new Float32Array();
    const clearBuffers = () => {
      buffer.setData({ positions: emptyFloat, indices: new Uint16Array() });
    };

    const dragHandle = gumballDragRef.current?.handle ?? null;
    const hoverHandleId = gumballDragRef.current?.handleId ?? gumballHoverRef.current;
    const hoverExtrude: ExtrudeHandle | null =
      dragHandle && dragHandle.kind === "extrude" ? dragHandle : extrudeHoverRef.current;

    if (!hoverHandleId && !hoverExtrude) {
      clearBuffers();
      gumballHoverPreviewDirtyRef.current = false;
      return;
    }

    const gumballState = gumballStateRef.current;
    if (!gumballState.visible) {
      clearBuffers();
      gumballHoverPreviewDirtyRef.current = false;
      return;
    }

    const basis = gumballState.orientation;
    const pivot = gumballState.pivot;
    const extents = computeSelectionExtents(gumballState.selectionPoints, basis);
    const maxExtent = extents.max;
    const gumballScale = computeGumballScale(cameraRef.current, pivot, canvas.height, pixelSize);
    const worldPerPixel = gumballScale / pixelSize;
    const minPlaneExtent = worldPerPixel * 24;
    const minAxisLength = worldPerPixel * 42;
    const minRotateRadius = worldPerPixel * 36;
    const minExtrudeOffset = worldPerPixel * 16;

    const positions: number[] = [];
    const pushSegment = (a: Vec3, b: Vec3) => {
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    };

    const axisVector = (axis: "x" | "y" | "z") => {
      if (axis === "x") return basis.xAxis;
      if (axis === "y") return basis.yAxis;
      return basis.zAxis;
    };

    const planeAxes = (plane: "xy" | "yz" | "xz") => {
      if (plane === "xy") return { u: basis.xAxis, v: basis.yAxis, su: extents.x, sv: extents.y };
      if (plane === "yz") return { u: basis.yAxis, v: basis.zAxis, su: extents.y, sv: extents.z };
      return { u: basis.xAxis, v: basis.zAxis, su: extents.x, sv: extents.z };
    };

    if (hoverExtrude) {
      const axis = normalize(hoverExtrude.normal);
      if (length(axis) > 1e-6) {
        const previewOffset =
          Math.max(maxExtent * 0.2, minExtrudeOffset) || minExtrudeOffset;
        const edgeMap = new Map<
          string,
          { a: Vec3; b: Vec3; count: number }
        >();
        const faceSelections = componentSelectionRef.current
          .map(asFaceSelection)
          .filter(
            (
              selection
            ): selection is Extract<ComponentSelection, { kind: "face" }> =>
              Boolean(selection)
          );
        const selections =
          faceSelections.length > 0
            ? faceSelections
            : [
                {
                  kind: "face",
                  geometryId: hoverExtrude.geometryId,
                  faceIndex: hoverExtrude.faceIndex,
                  vertexIndices: hoverExtrude.vertexIndices,
                },
              ];

        selections.forEach((selection) => {
          const item = geometryRef.current.find((entry) => entry.id === selection.geometryId);
          if (!item || !("mesh" in item)) return;
          const mesh = item.mesh;
          const [i0, i1, i2] = selection.vertexIndices;
          const addEdge = (aIndex: number, bIndex: number) => {
            const key =
              aIndex < bIndex
                ? `${selection.geometryId}:${aIndex}:${bIndex}`
                : `${selection.geometryId}:${bIndex}:${aIndex}`;
            const existing = edgeMap.get(key);
            if (existing) {
              existing.count += 1;
              return;
            }
            edgeMap.set(key, {
              a: getMeshPoint(mesh, aIndex),
              b: getMeshPoint(mesh, bIndex),
              count: 1,
            });
          };
          addEdge(i0, i1);
          addEdge(i1, i2);
          addEdge(i2, i0);
        });

        edgeMap.forEach((edge) => {
          if (edge.count !== 1) return;
          const a = edge.a;
          const b = edge.b;
          const aOffset = add(a, scale(axis, previewOffset));
          const bOffset = add(b, scale(axis, previewOffset));
          pushSegment(a, b);
          pushSegment(aOffset, bOffset);
          pushSegment(a, aOffset);
          pushSegment(b, bOffset);
        });
      }
    } else if (hoverHandleId?.startsWith("axis-")) {
      const axis = hoverHandleId.split("-")[1] as "x" | "y" | "z";
      const axisDir = normalize(axisVector(axis));
      if (length(axisDir) > 1e-6) {
        const axisLength = Math.max(maxExtent * 0.75, minAxisLength);
        const end = add(pivot, scale(axisDir, axisLength));
        pushSegment(pivot, end);
      }
    } else if (hoverHandleId?.startsWith("plane-")) {
      const plane = hoverHandleId.split("-")[1] as "xy" | "yz" | "xz";
      const { u, v, su, sv } = planeAxes(plane);
      const halfU = Math.max(su * 0.5, minPlaneExtent);
      const halfV = Math.max(sv * 0.5, minPlaneExtent);
      const corner1 = add(pivot, add(scale(u, halfU), scale(v, halfV)));
      const corner2 = add(pivot, add(scale(u, -halfU), scale(v, halfV)));
      const corner3 = add(pivot, add(scale(u, -halfU), scale(v, -halfV)));
      const corner4 = add(pivot, add(scale(u, halfU), scale(v, -halfV)));
      pushSegment(corner1, corner2);
      pushSegment(corner2, corner3);
      pushSegment(corner3, corner4);
      pushSegment(corner4, corner1);
    } else if (hoverHandleId?.startsWith("rotate-")) {
      const axis = hoverHandleId.split("-")[1] as "x" | "y" | "z";
      const axisDir = normalize(axisVector(axis));
      if (length(axisDir) > 1e-6) {
        const radius = Math.max(maxExtent * 0.6, minRotateRadius);
        const planeBasis = buildBasisFromNormal(axisDir);
        const u = planeBasis.xAxis;
        const v = planeBasis.zAxis;
        const segments = 48;
        let prev = add(pivot, scale(u, radius));
        for (let i = 1; i <= segments; i += 1) {
          const t = (i / segments) * Math.PI * 2;
          const next = add(
            pivot,
            add(scale(u, Math.cos(t) * radius), scale(v, Math.sin(t) * radius))
          );
          pushSegment(prev, next);
          prev = next;
        }
      }
    }

    if (positions.length === 0) {
      clearBuffers();
      gumballHoverPreviewDirtyRef.current = false;
      return;
    }

    const positionsArray = new Float32Array(positions);
    const vertexCount = positionsArray.length / 3;
    const indices = new Uint16Array(vertexCount);
    for (let i = 0; i < vertexCount; i += 1) {
      indices[i] = i;
    }
    buffer.setData({ positions: positionsArray, indices });
    gumballHoverPreviewDirtyRef.current = false;
  };

  const updateSelectedComponentBuffers = () => {
    if (!selectedComponentDirtyRef.current) return;
    const renderer = rendererRef.current;
    if (!renderer) return;

    const emptyFloat = new Float32Array();
    const emptyIndex = new Uint16Array();

    const lineBuffer =
      selectedLineBufferRef.current ?? renderer.createGeometryBuffer(SELECTED_LINE_ID);
    selectedLineBufferRef.current = lineBuffer;
    const faceBuffer =
      selectedFaceBufferRef.current ?? renderer.createGeometryBuffer(SELECTED_FACE_ID);
    selectedFaceBufferRef.current = faceBuffer;
    const pointBuffer =
      selectedPointBufferRef.current ?? renderer.createGeometryBuffer(SELECTED_POINT_ID);
    selectedPointBufferRef.current = pointBuffer;

    const selections = componentSelectionRef.current;
    if (!selections || selections.length === 0) {
      lineBuffer.setData({ positions: emptyFloat, indices: emptyIndex });
      faceBuffer.setData({ positions: emptyFloat, normals: emptyFloat, indices: emptyIndex });
      pointBuffer.setData({ positions: emptyFloat });
      selectedComponentDirtyRef.current = false;
      return;
    }

    const edgePositions: number[] = [];
    const edgeIndices: number[] = [];
    const facePositions: number[] = [];
    const faceNormals: number[] = [];
    const faceIndices: number[] = [];
    const pointPositions: number[] = [];

    selections.forEach((selection) => {
      if (selection.kind === "vertex") {
        if (selection.vertexId) {
          const vertex = vertexMap.get(selection.vertexId);
          if (vertex) {
            pointPositions.push(vertex.position.x, vertex.position.y, vertex.position.z);
          }
          return;
        }
        if (selection.vertexIndex != null) {
          const item = geometryRef.current.find((entry) => entry.id === selection.geometryId);
          if (item && "mesh" in item) {
            const point = getMeshPoint(item.mesh, selection.vertexIndex);
            pointPositions.push(point.x, point.y, point.z);
          }
        }
        return;
      }

      if (selection.kind === "edge") {
        let a: Vec3 | null = null;
        let b: Vec3 | null = null;
        if (selection.vertexIds) {
          const va = vertexMap.get(selection.vertexIds[0]);
          const vb = vertexMap.get(selection.vertexIds[1]);
          if (va && vb) {
            a = va.position;
            b = vb.position;
          }
        } else if (selection.vertexIndices) {
          const item = geometryRef.current.find((entry) => entry.id === selection.geometryId);
          if (item && "mesh" in item) {
            a = getMeshPoint(item.mesh, selection.vertexIndices[0]);
            b = getMeshPoint(item.mesh, selection.vertexIndices[1]);
          }
        }
        if (a && b) {
          const baseIndex = edgePositions.length / 3;
          edgePositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
          edgeIndices.push(baseIndex, baseIndex + 1);
        }
        return;
      }

      if (selection.kind === "face") {
        const item = geometryRef.current.find((entry) => entry.id === selection.geometryId);
        if (!item || !("mesh" in item)) return;
        const [i0, i1, i2] = selection.vertexIndices;
        const a = getMeshPoint(item.mesh, i0);
        const b = getMeshPoint(item.mesh, i1);
        const c = getMeshPoint(item.mesh, i2);
        const normal = normalize(cross(sub(b, a), sub(c, a)));
        const normalVec =
          Number.isFinite(normal.x) && Number.isFinite(normal.y) && Number.isFinite(normal.z)
            ? normal
            : { x: 0, y: 1, z: 0 };
        const baseIndex = facePositions.length / 3;
        facePositions.push(
          a.x, a.y, a.z,
          b.x, b.y, b.z,
          c.x, c.y, c.z
        );
        faceNormals.push(
          normalVec.x, normalVec.y, normalVec.z,
          normalVec.x, normalVec.y, normalVec.z,
          normalVec.x, normalVec.y, normalVec.z
        );
        faceIndices.push(baseIndex, baseIndex + 1, baseIndex + 2);

        const edgeBase = edgePositions.length / 3;
        edgePositions.push(
          a.x, a.y, a.z,
          b.x, b.y, b.z,
          b.x, b.y, b.z,
          c.x, c.y, c.z,
          c.x, c.y, c.z,
          a.x, a.y, a.z
        );
        edgeIndices.push(
          edgeBase,
          edgeBase + 1,
          edgeBase + 2,
          edgeBase + 3,
          edgeBase + 4,
          edgeBase + 5
        );
      }
    });

    lineBuffer.setData({
      positions: edgePositions.length ? new Float32Array(edgePositions) : emptyFloat,
      indices: edgeIndices.length ? new Uint16Array(edgeIndices) : emptyIndex,
    });
    faceBuffer.setData({
      positions: facePositions.length ? new Float32Array(facePositions) : emptyFloat,
      normals: faceNormals.length ? new Float32Array(faceNormals) : emptyFloat,
      indices: faceIndices.length ? new Uint16Array(faceIndices) : emptyIndex,
    });
    pointBuffer.setData({
      positions: pointPositions.length ? new Float32Array(pointPositions) : emptyFloat,
    });
    selectedComponentDirtyRef.current = false;
  };

  const isSameBounds = (a: SelectionBounds | null, b: SelectionBounds | null) => {
    if (!a || !b) return false;
    if (a.corners.length !== b.corners.length) return false;
    for (let i = 0; i < a.corners.length; i += 1) {
      const left = a.corners[i];
      const right = b.corners[i];
      if (
        left.x !== right.x ||
        left.y !== right.y ||
        left.z !== right.z
      ) {
        return false;
      }
    }
    return true;
  };

  const updateSelectionBoundsBuffer = (bounds: SelectionBounds | null) => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const buffer =
      selectionBoundsBufferRef.current ?? renderer.createGeometryBuffer("__selection_bounds");
    selectionBoundsBufferRef.current = buffer;

    const emptyFloat = new Float32Array();
    if (!bounds) {
      buffer.setData({ positions: emptyFloat, indices: new Uint16Array() });
      selectionBoundsRef.current = null;
      return;
    }

    if (isSameBounds(bounds, selectionBoundsRef.current)) {
      return;
    }

    selectionBoundsRef.current = bounds;
    const positions = new Float32Array(
      bounds.corners.flatMap((corner) => [corner.x, corner.y, corner.z])
    );
    const indices = new Uint16Array([
      0, 1,
      1, 2,
      2, 3,
      3, 0,
      4, 5,
      5, 6,
      6, 7,
      7, 4,
      0, 4,
      1, 5,
      2, 6,
      3, 7,
    ]);
    buffer.setData({ positions, indices });
  };

  const hasSelection =
    selectedGeometryIds.length > 0 || componentSelection.length > 0;
  const autoGumballActive =
    (!activeCommandId || activeCommandId === "point") && hasSelection;
  const activeTransformMode: GumballMode | null = (() => {
    if (activeCommandId === "move" || activeCommandId === "transform") {
      return "move";
    }
    if (activeCommandId === "rotate") return "rotate";
    if (activeCommandId === "scale") return "scale";
    if (activeCommandId === "gumball" || autoGumballActive) {
      return "gumball";
    }
    if (autoGumballActive) return "gumball";
    return null;
  })();
  const isGizmoVisible = Boolean(activeTransformMode) && hasSelection;

  useEffect(() => {
    if (activeCommandId !== "polyline") {
      polylinePointsRef.current = [];
    }
    if (activeCommandId !== "curve") {
      curvePointsRef.current = [];
    }
    if (activeCommandId !== "line") {
      lineStartRef.current = null;
    }
    if (activeCommandId !== "arc") {
      arcStartRef.current = null;
      arcEndRef.current = null;
    }
    if (activeCommandId !== "rectangle") {
      rectangleStartRef.current = null;
    }
    if (activeCommandId !== "circle") {
      circleCenterRef.current = null;
    }
    if (!isPrimitiveCommand(activeCommandId)) {
      primitiveCenterRef.current = null;
    }
    selectionDragRef.current = null;
    setSelectionBox(null);
    previewStateRef.current = null;
    previewDirtyRef.current = true;
  }, [activeCommandId]);

  useEffect(() => {
    geometryRef.current = geometry;
    customMaterialMapRef.current = customMaterialMap;
    if (hoverSelectionRef.current) {
      hoverDirtyRef.current = true;
    }
    gumballHoverPreviewDirtyRef.current = true;
  }, [geometry, customMaterialMap]);

  useEffect(() => {
    cameraRef.current = camera;
    if (hoverSelectionRef.current?.kind === "vertex") {
      hoverDirtyRef.current = true;
    }
    gumballHoverPreviewDirtyRef.current = true;
  }, [camera]);

  useEffect(() => {
    selectionRef.current = selectedGeometryIds;
  }, [selectedGeometryIds]);

  useEffect(() => {
    selectionModeRef.current = selectionMode;
  }, [selectionMode]);

  useEffect(() => {
    hiddenRef.current = hiddenGeometryIds;
  }, [hiddenGeometryIds]);

  useEffect(() => {
    viewSettingsRef.current = viewSettings;
  }, [viewSettings]);

  useEffect(() => {
    if (!viewSettings.showPointPickDebug) {
      setPointHoverDebug(null);
    }
  }, [viewSettings.showPointPickDebug]);

  useEffect(() => {
    pointHoverDebugRef.current = pointHoverDebug;
  }, [pointHoverDebug]);

  useEffect(() => {
    viewSolidityRef.current = viewSolidity;
  }, [viewSolidity]);

  useEffect(() => {
    displayModeRef.current = displayMode;
  }, [displayMode]);

  useEffect(() => {
    gumballStepRef.current = gumballStep;
  }, [gumballStep]);

  useEffect(() => {
    showRotationRingsRef.current = showRotationRings;
  }, [showRotationRings]);

  useEffect(() => {
    showMoveArmsRef.current = showMoveArms;
  }, [showMoveArms]);

  useEffect(() => {
    activeCommandIdRef.current = activeCommandId;
  }, [activeCommandId]);

  useEffect(() => {
    onCommandCompleteRef.current = onCommandComplete;
  }, [onCommandComplete]);

  useEffect(() => {
    componentSelectionRef.current = componentSelection;
    selectedComponentDirtyRef.current = true;
    gumballHoverPreviewDirtyRef.current = true;
  }, [componentSelection]);

  useEffect(() => {
    if (componentSelectionRef.current.length > 0) {
      selectedComponentDirtyRef.current = true;
    }
  }, [geometry]);

  useEffect(() => {
    lockedRef.current = lockedGeometryIds;
  }, [lockedGeometryIds]);

  useEffect(() => {
    cPlaneRef.current = cPlane;
  }, [cPlane]);

  useEffect(() => {
    pivotRef.current = pivot;
  }, [pivot]);

  useEffect(() => {
    snapSettingsRef.current = snapSettings;
  }, [snapSettings]);

  useEffect(() => {
    gridSettingsRef.current = gridSettings;
  }, [gridSettings]);

  useEffect(() => {
    transformOrientationRef.current = transformOrientation;
  }, [transformOrientation]);

  useEffect(() => {
    orientationBasisRef.current = orientationBasis;
  }, [orientationBasis]);

  useEffect(() => {
    resolvedPivotRef.current = resolvedPivot;
  }, [resolvedPivot]);

  useEffect(() => {
    transformInputsRef.current = transformInputs;
  }, [transformInputs]);

  useEffect(() => {
    if (pivotInputEditingRef.current) return;
    const next = {
      x: formatInputValue(resolvedPivot.x),
      y: formatInputValue(resolvedPivot.y),
      z: formatInputValue(resolvedPivot.z),
    };
    setPivotInputs((prev) =>
      prev.x === next.x && prev.y === next.y && prev.z === next.z ? prev : next
    );
  }, [resolvedPivot]);

  useEffect(() => {
    if (!transformInputs) {
      setShowPivotPanel(false);
    }
  }, [transformInputs]);

  useEffect(() => {
    primitiveConfigRef.current = primitiveConfig;
    previewDirtyRef.current = true;
    refreshPreview(pointerPlaneRef.current);
  }, [primitiveConfig]);

  useEffect(() => {
    rectangleConfigRef.current = rectangleConfig;
    previewDirtyRef.current = true;
    refreshPreview(pointerPlaneRef.current);
  }, [rectangleConfig]);

  useEffect(() => {
    circleConfigRef.current = circleConfig;
    previewDirtyRef.current = true;
    refreshPreview(pointerPlaneRef.current);
  }, [circleConfig]);

  useEffect(() => {
    if (!commandRequest) return;
    if (commandRequest.requestId === lastCommandRequestIdRef.current) return;
    lastCommandRequestIdRef.current = commandRequest.requestId;

    if (commandRequest.id === "focus") {
      if (selectedGeometryIds.length === 0) return;
      const bounds = computeBoundsForIds(selectedGeometryIds);
      if (bounds) frameBounds(bounds);
      return;
    }
    if (commandRequest.id === "frameall") {
      const visibleIds = geometry
        .filter((item) => !hiddenGeometryIds.includes(item.id))
        .map((item) => item.id);
      if (visibleIds.length === 0) return;
      const bounds = computeBoundsForIds(visibleIds);
      if (bounds) frameBounds(bounds);
      return;
    }
    if (commandRequest.id === "polyline") {
      const lower = commandRequest.input.toLowerCase();
      if (lower.includes("cancel")) {
        cancelPolyline();
        clearPreview();
        notifyCommandComplete(commandRequest.id);
        return;
      }
      if (lower.includes("accept") || lower.includes("finish") || lower.includes("done")) {
        commitPolyline();
        clearPreview();
        notifyCommandComplete(commandRequest.id);
      }
      return;
    }
    if (commandRequest.id === "curve") {
      const lower = commandRequest.input.toLowerCase();
      updateCurveFromInput(commandRequest.input);
      if (lower.includes("cancel")) {
        cancelCurve();
        clearPreview();
        notifyCommandComplete(commandRequest.id);
        return;
      }
      if (lower.includes("accept") || lower.includes("finish") || lower.includes("done")) {
        commitCurve();
        clearPreview();
        notifyCommandComplete(commandRequest.id);
        return;
      }
      refreshPreview(pointerPlaneRef.current);
      return;
    }

    const lower = commandRequest.input.toLowerCase();
    const pointerPoint = pointerPlaneRef.current;

    if (commandRequest.id === "line") {
      if (lower.includes("cancel")) {
        lineStartRef.current = null;
        clearPreview();
        notifyCommandComplete(commandRequest.id);
        return;
      }
      if (
        pointerPoint &&
        lineStartRef.current &&
        (lower.includes("accept") || lower.includes("finish") || lower.includes("done"))
      ) {
        createLineFromDrag(lineStartRef.current, pointerPoint);
        lineStartRef.current = null;
        clearPreview();
        notifyCommandComplete(commandRequest.id);
      }
      return;
    }

    if (commandRequest.id === "arc") {
      if (lower.includes("cancel")) {
        arcStartRef.current = null;
        arcEndRef.current = null;
        clearPreview();
        notifyCommandComplete(commandRequest.id);
        return;
      }
      if (
        pointerPoint &&
        arcStartRef.current &&
        arcEndRef.current &&
        (lower.includes("accept") || lower.includes("finish") || lower.includes("done"))
      ) {
        const start = arcStartRef.current;
        const end = arcEndRef.current;
        createArcFromPoints(start, end, pointerPoint);
        arcStartRef.current = null;
        arcEndRef.current = null;
        clearPreview();
        notifyCommandComplete(commandRequest.id);
      }
      return;
    }

    if (commandRequest.id === "rectangle") {
      if (lower.includes("cancel")) {
        rectangleStartRef.current = null;
        clearPreview();
        notifyCommandComplete(commandRequest.id);
        return;
      }
      if (
        pointerPoint &&
        rectangleStartRef.current &&
        (lower.includes("accept") || lower.includes("finish") || lower.includes("done"))
      ) {
        createRectangleFromDrag(rectangleStartRef.current, pointerPoint);
        rectangleStartRef.current = null;
        clearPreview();
        notifyCommandComplete(commandRequest.id);
      }
      return;
    }

    if (commandRequest.id === "circle") {
      if (lower.includes("cancel")) {
        circleCenterRef.current = null;
        clearPreview();
        notifyCommandComplete(commandRequest.id);
        return;
      }
      if (
        pointerPoint &&
        circleCenterRef.current &&
        (lower.includes("accept") || lower.includes("finish") || lower.includes("done"))
      ) {
        createCircleFromDrag(circleCenterRef.current, pointerPoint);
        circleCenterRef.current = null;
        clearPreview();
        notifyCommandComplete(commandRequest.id);
      }
      return;
    }

    if (isPrimitiveCommand(commandRequest.id)) {
      if (lower.includes("cancel")) {
        primitiveCenterRef.current = null;
        clearPreview();
        notifyCommandComplete(commandRequest.id);
        return;
      }
      if (
        pointerPoint &&
        primitiveCenterRef.current &&
        (lower.includes("accept") || lower.includes("finish") || lower.includes("done"))
      ) {
        createPrimitiveFromDrag(primitiveCenterRef.current, pointerPoint);
        primitiveCenterRef.current = null;
        clearPreview();
        notifyCommandComplete(commandRequest.id);
      }
    }
  }, [commandRequest, geometry, hiddenGeometryIds, selectedGeometryIds]);

  useEffect(() => {
    gumballStateRef.current = {
      selectionPoints,
      orientation: gumballBasis,
      pivot: resolvedPivot,
      mode: activeTransformMode,
      visible: isGizmoVisible,
    };
    gumballHoverPreviewDirtyRef.current = true;
  }, [selectionPoints, gumballBasis, resolvedPivot, activeTransformMode, isGizmoVisible]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new WebGLRenderer(canvas);
    const adapter = new GeometryRenderAdapter(renderer, (id) =>
      geometryRef.current.find((item) => item.id === id)
    );
    rendererRef.current = renderer;
    gumballBuffersRef.current = createGumballBuffers(renderer);
    gumballPanelBufferRef.current = renderer.createGeometryBuffer("__gumball_panel");
    gumballPanelEdgeBufferRef.current = renderer.createGeometryBuffer("__gumball_panel_edge");
    gumballPanelGridBufferRef.current = renderer.createGeometryBuffer("__gumball_panel_grid");
    adapterRef.current = adapter;
    previewLineBufferRef.current = null;
    previewMeshBufferRef.current = null;
    previewEdgeBufferRef.current = null;
    selectionBoundsBufferRef.current = null;
    selectionBoundsRef.current = null;
    previewDirtyRef.current = true;
    gumballHoverPreviewBufferRef.current = null;
    gumballHoverPreviewDirtyRef.current = true;

    if (
      gumballPanelBufferRef.current &&
      gumballPanelEdgeBufferRef.current &&
      gumballPanelGridBufferRef.current
    ) {
      const panelPositions = new Float32Array([
        -1, -1, 0,
        1, -1, 0,
        1, 1, 0,
        -1, 1, 0,
      ]);
      const panelNormals = new Float32Array([
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
      ]);
      const panelIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
      const panelEdgeIndices = new Uint16Array([0, 1, 1, 2, 2, 3, 3, 0]);
      gumballPanelBufferRef.current.setData({
        positions: panelPositions,
        normals: panelNormals,
        indices: panelIndices,
      });
      gumballPanelEdgeBufferRef.current.setData({
        positions: panelPositions,
        indices: panelEdgeIndices,
      });

      const gridPositions: number[] = [];
      const gridIndices: number[] = [];
      let gridCursor = 0;
      const extent = 0.88;
      const lines = 7;
      const step = (extent * 2) / Math.max(1, lines - 1);
      const dotLength = 0.05;
      const gap = 0.055;
      const stride = dotLength + gap;

      const pushSegment = (x1: number, y1: number, x2: number, y2: number) => {
        gridPositions.push(x1, y1, 0, x2, y2, 0);
        gridIndices.push(gridCursor, gridCursor + 1);
        gridCursor += 2;
      };

      for (let i = 0; i < lines; i += 1) {
        const coord = -extent + step * i;
        for (let y = -extent; y < extent; y += stride) {
          const y2 = Math.min(y + dotLength, extent);
          pushSegment(coord, y, coord, y2);
        }
        for (let x = -extent; x < extent; x += stride) {
          const x2 = Math.min(x + dotLength, extent);
          pushSegment(x, coord, x2, coord);
        }
      }

      gumballPanelGridBufferRef.current.setData({
        positions: new Float32Array(gridPositions),
        indices: new Uint16Array(gridIndices),
      });
    }

    return () => {
      if (gumballBuffersRef.current) {
        disposeGumballBuffers(renderer, gumballBuffersRef.current);
        gumballBuffersRef.current = null;
      }
      if (gumballPanelBufferRef.current) {
        renderer.deleteGeometryBuffer(gumballPanelBufferRef.current.id);
        gumballPanelBufferRef.current = null;
      }
      if (gumballPanelEdgeBufferRef.current) {
        renderer.deleteGeometryBuffer(gumballPanelEdgeBufferRef.current.id);
        gumballPanelEdgeBufferRef.current = null;
      }
      if (gumballPanelGridBufferRef.current) {
        renderer.deleteGeometryBuffer(gumballPanelGridBufferRef.current.id);
        gumballPanelGridBufferRef.current = null;
      }
      if (gumballHoverPreviewBufferRef.current) {
        renderer.deleteGeometryBuffer(gumballHoverPreviewBufferRef.current.id);
        gumballHoverPreviewBufferRef.current = null;
      }
      renderer.dispose();
      adapter.dispose();
      rendererRef.current = null;
      adapterRef.current = null;
      previewLineBufferRef.current = null;
      previewMeshBufferRef.current = null;
      previewEdgeBufferRef.current = null;
      selectionBoundsBufferRef.current = null;
      selectionBoundsRef.current = null;
    };
  }, []);

  const buildGridGeometry = (spacing: number, majorEvery: number) => {
    const safeSpacing = Math.max(0.01, spacing);
    const safeMajorEvery = Math.max(1, Math.round(majorEvery));
    const extent = safeSpacing * GRID_EXTENT_MULTIPLIER;
    const lineCount = Math.max(1, Math.floor(extent / safeSpacing));

    const minorPositions: number[] = [];
    const minorIndices: number[] = [];
    const majorPositions: number[] = [];
    const majorIndices: number[] = [];

    const pushLine = (
      positions: number[],
      indices: number[],
      ax: number,
      ay: number,
      az: number,
      bx: number,
      by: number,
      bz: number
    ) => {
      const index = positions.length / 3;
      positions.push(ax, ay, az, bx, by, bz);
      indices.push(index, index + 1);
    };

    for (let i = -lineCount; i <= lineCount; i += GRID_MINOR_STEP) {
      const coord = i * safeSpacing;
      const isMajor = i % safeMajorEvery === 0;
      const targetPositions = isMajor ? majorPositions : minorPositions;
      const targetIndices = isMajor ? majorIndices : minorIndices;

      pushLine(
        targetPositions,
        targetIndices,
        -extent,
        GRID_OFFSET_Y,
        coord,
        extent,
        GRID_OFFSET_Y,
        coord
      );
      pushLine(
        targetPositions,
        targetIndices,
        coord,
        GRID_OFFSET_Y,
        -extent,
        coord,
        GRID_OFFSET_Y,
        extent
      );
    }

    return {
      minor: {
        positions: new Float32Array(minorPositions),
        indices: new Uint16Array(minorIndices),
      },
      major: {
        positions: new Float32Array(majorPositions),
        indices: new Uint16Array(majorIndices),
      },
    };
  };

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    const { minor, major } = buildGridGeometry(
      gridSettings.spacing,
      gridSettings.majorLinesEvery
    );

    const minorBufferId = "grid__minor";
    const majorBufferId = "grid__major";

    const minorBuffer =
      gridMinorBufferRef.current ?? renderer.createGeometryBuffer(minorBufferId);
    minorBuffer.setData({
      positions: minor.positions,
      indices: minor.indices,
    });
    gridMinorBufferRef.current = minorBuffer;

    const majorBuffer =
      gridMajorBufferRef.current ?? renderer.createGeometryBuffer(majorBufferId);
    majorBuffer.setData({
      positions: major.positions,
      indices: major.indices,
    });
    gridMajorBufferRef.current = majorBuffer;

    return () => {
      renderer.deleteGeometryBuffer(minorBufferId);
      renderer.deleteGeometryBuffer(majorBufferId);
      gridMinorBufferRef.current = null;
      gridMajorBufferRef.current = null;
    };
  }, [gridSettings]);

  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter) return;

    const geometryIds = new Set(geometry.map((item) => item.id));
    geometry.forEach((item) => adapter.updateGeometry(item));

    adapter.getAllRenderables().forEach((renderable) => {
      if (!geometryIds.has(renderable.id)) {
        adapter.removeGeometry(renderable.id);
      }
    });
  }, [geometry]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return;

    const resizeWith = (width: number, height: number) => {
      const dpr = resolveViewerDpr();
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      renderer.setSize(canvas.width, canvas.height);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      resizeWith(width, height);
    });

    resizeCanvasRef.current = () => {
      const rect = canvas.getBoundingClientRect();
      resizeWith(rect.width, rect.height);
    };

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const safeReleasePointerCapture = (pointerId: number) => {
      try {
        canvas.releasePointerCapture(pointerId);
      } catch {
        // Ignore release errors when capture was not established.
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const context = getPointerContext(event);
      if (!context) return;
      const x = context.pointer.x;
      const y = context.pointer.y;
      const commandId = activeCommandIdRef.current;
      const isLeftClick = event.button === 0;
      const isMiddleClick = event.button === 1;
      const isRightClick = event.button === 2;
      const componentMode = selectionModeRef.current !== "object" || event.shiftKey;
      const componentKind = componentMode ? resolveComponentMode() : undefined;
      const shiftKey = event.ctrlKey || event.metaKey;
      const ctrlShiftKey = componentMode;

      if (isRightClick && commandId === "polyline") {
        commitPolyline();
        clearPreview();
        completeActiveCommand();
        event.preventDefault();
        return;
      }
      if (isRightClick && commandId === "curve") {
        commitCurve();
        clearPreview();
        completeActiveCommand();
        event.preventDefault();
        return;
      }

      if (isMiddleClick || isRightClick) {
        const startCamera = {
          position: { ...cameraRef.current.position },
          target: { ...cameraRef.current.target },
        };
        const startAngles = getSpherical(startCamera.position, startCamera.target);
        const mode = isRightClick ? (event.shiftKey ? "pan" : "orbit") : "pan";
        dragRef.current = { mode, pointer: { x, y }, startCamera, startAngles };
        canvas.setPointerCapture(event.pointerId);
        return;
      }

      pointerPlaneRef.current = context.planePoint;
      if (pivotRef.current.mode === "cursor" && context.planePoint) {
        setPivotCursorPosition(context.planePoint);
      }

      if (isLeftClick) {
        const gumballPick = pickGumballHandle(context, {
          allowPivot: event.ctrlKey || event.metaKey,
        });
        if (gumballPick) {
          const { handle, handleId } = gumballPick;
          if (handle.kind === "pivot") {
            if (startPivotDrag(context)) {
              gumballDragRef.current = {
                pointerId: event.pointerId,
                handle,
                handleId,
                startPointer: { x: context.pointer.x, y: context.pointer.y },
                moved: false,
              };
              canvas.setPointerCapture(event.pointerId);
              updatePivotFromPointer(context);
            }
            return;
          }
          if (handle.kind === "extrude") {
            if (startExtrudeSession(handle, context)) {
              gumballDragRef.current = {
                pointerId: event.pointerId,
                handle,
                handleId: null,
                startPointer: { x: context.pointer.x, y: context.pointer.y },
                moved: false,
              };
              canvas.setPointerCapture(event.pointerId);
              showGumballPrompt(resolveGumballPrompt(handle, "extrude"));
            }
            return;
          }
          if (
            handle.kind === "scale" &&
            !event.shiftKey &&
            handle.axis &&
            gumballStateRef.current.mode === "gumball" &&
            extrudeHandles.length > 0
          ) {
            const basis = gumballStateRef.current.orientation;
            const axis =
              handle.axis === "x"
                ? basis.xAxis
                : handle.axis === "y"
                  ? basis.yAxis
                  : basis.zAxis;
            if (length(axis) > 1e-6) {
              const handlesOverride = extrudeHandles.map((entry) => ({
                ...entry,
                normal: axis,
              }));
              const primary = handlesOverride[0];
              if (primary && startExtrudeSession(primary, context, handlesOverride)) {
                const extrudeHandle: GumballHandle = {
                  kind: "extrude",
                  geometryId: primary.geometryId,
                  faceIndex: primary.faceIndex,
                  vertexIndices: primary.vertexIndices,
                  center: primary.center,
                  normal: axis,
                };
                gumballDragRef.current = {
                  pointerId: event.pointerId,
                  handle: extrudeHandle,
                  handleId: null,
                  startPointer: { x: context.pointer.x, y: context.pointer.y },
                  moved: false,
                };
                canvas.setPointerCapture(event.pointerId);
                showGumballPrompt(resolveGumballPrompt(extrudeHandle, "extrude"));
                return;
              }
            }
          }
          const modeFromHandle: TransformMode =
            handle.kind === "rotate"
              ? "rotate"
              : handle.kind === "scale"
                ? "scale"
                : "move";
          const constraint: TransformConstraint =
            handle.kind === "axis"
              ? { kind: "axis", axis: handle.axis }
              : handle.kind === "plane"
                ? { kind: "plane", plane: handle.plane }
                : handle.kind === "rotate"
                  ? { kind: "axis", axis: handle.axis }
                  : handle.kind === "scale"
                    ? handle.uniform
                      ? { kind: "screen" }
                      : { kind: "axis", axis: handle.axis ?? "x" }
                    : { kind: "screen" };
          const started = startTransformSession(modeFromHandle, constraint, context, {
            basis: gumballStateRef.current.orientation,
          });
          if (started) {
            gumballDragRef.current = {
              pointerId: event.pointerId,
              handle,
              handleId,
              startPointer: { x: context.pointer.x, y: context.pointer.y },
              moved: false,
            };
            canvas.setPointerCapture(event.pointerId);
            updateTransformFromPointer(context, event);
            showGumballPrompt(resolveGumballPrompt(handle, modeFromHandle));
          }
          return;
        }
        const gumballViewport = computeGumballViewportScreenRect(
          cameraRef.current,
          canvas,
          gumballViewportZoomRef.current,
          gumballPixelSize
        );
        if (gumballViewport) {
          const padding = 6;
          const insideViewport =
            x >= gumballViewport.x - padding &&
            x <= gumballViewport.x + gumballViewport.width + padding &&
            y >= gumballViewport.y - padding &&
            y <= gumballViewport.y + gumballViewport.height + padding;
          if (insideViewport) {
            return;
          }
        }

        if (event.altKey) {
          const pick = pickComponent(context) ?? pickObject(context);
          const basePoint = pick?.point ?? context.planePoint;
          if (basePoint) {
            const snapped = snapPoint(basePoint, { allow: true });
            setPivotMode("picked");
            setPivotPickedPosition(snapped.point);
          }
          return;
        }

        if (!commandId) {
          if (componentMode && componentKind === "vertex") {
            const componentPick = pickComponent(context, "vertex");
            if (componentPick?.kind === "component" && componentPick.selection.kind === "vertex") {
              const selectionPoint =
                componentPick.point ?? resolveVertexSelectionPosition(componentPick.selection);
              if (selectionPoint) {
                setSelectionState([componentPick.selection.geometryId], [componentPick.selection]);
                const started = startTransformSession(
                  "move",
                  { kind: "screen" },
                  context,
                  { pivot: selectionPoint }
                );
                if (started) {
                  pointDragRef.current = {
                    pointerId: event.pointerId,
                    startPointer: { x: context.pointer.x, y: context.pointer.y },
                    moved: false,
                  };
                  canvas.setPointerCapture(event.pointerId);
                  event.preventDefault();
                  event.stopPropagation();
                  return;
                }
              }
            }
          } else if (!event.shiftKey) {
            const pointPick = pickPointHandle(context, { includeReferenced: true });
            if (pointPick) {
              setSelectionState([pointPick.id], []);
              const started = startTransformSession(
                "move",
                { kind: "screen" },
                context,
                { pivot: pointPick.position }
              );
              if (started) {
                pointDragRef.current = {
                  pointerId: event.pointerId,
                  startPointer: { x: context.pointer.x, y: context.pointer.y },
                  moved: false,
                };
                canvas.setPointerCapture(event.pointerId);
                event.preventDefault();
                event.stopPropagation();
                return;
              }
            }
          }
        }
      }

      if (isLeftClick && commandId) {
        const hitPoint = context.planePoint;
        if (!hitPoint) return;
        if (commandId === "point") {
          addGeometryPoint(hitPoint);
          clearPreview();
          return;
        }
        if (commandId === "line") {
          if (!lineStartRef.current) {
            lineStartRef.current = hitPoint;
            refreshPreview(hitPoint);
            return;
          }
          createLineFromDrag(lineStartRef.current, hitPoint);
          if (event.detail >= 2) {
            lineStartRef.current = null;
            clearPreview();
            completeActiveCommand();
            return;
          }
          lineStartRef.current = hitPoint;
          refreshPreview(hitPoint);
          return;
        }
        if (commandId === "arc") {
          if (!arcStartRef.current) {
            arcStartRef.current = hitPoint;
            arcEndRef.current = null;
            refreshPreview(hitPoint);
            return;
          }
          if (!arcEndRef.current) {
            arcEndRef.current = hitPoint;
            refreshPreview(hitPoint);
            return;
          }
          const start = arcStartRef.current;
          const end = arcEndRef.current;
          createArcFromPoints(start, end, hitPoint);
          if (event.detail >= 2) {
            arcStartRef.current = null;
            arcEndRef.current = null;
            clearPreview();
            completeActiveCommand();
            return;
          }
          arcStartRef.current = end;
          arcEndRef.current = null;
          refreshPreview(hitPoint);
          return;
        }
        if (commandId === "curve") {
          if (event.detail >= 2 && curvePointsRef.current.length >= 2) {
            commitCurve();
            clearPreview();
            completeActiveCommand();
            return;
          }
          appendCurvePoint(hitPoint);
          refreshPreview(hitPoint);
          return;
        }
        if (commandId === "polyline") {
          if (event.detail >= 2 && polylinePointsRef.current.length >= 2) {
            commitPolyline();
            clearPreview();
            completeActiveCommand();
            return;
          }
          appendPolylinePoint(hitPoint);
          refreshPreview(hitPoint);
          return;
        }
        if (commandId === "rectangle") {
          if (!rectangleStartRef.current) {
            rectangleStartRef.current = hitPoint;
            refreshPreview(hitPoint);
            return;
          }
          createRectangleFromDrag(rectangleStartRef.current, hitPoint);
          rectangleStartRef.current = null;
          clearPreview();
          completeActiveCommand();
          return;
        }
        if (commandId === "circle") {
          if (!circleCenterRef.current) {
            circleCenterRef.current = hitPoint;
            refreshPreview(hitPoint);
            return;
          }
          createCircleFromDrag(circleCenterRef.current, hitPoint);
          circleCenterRef.current = null;
          clearPreview();
          completeActiveCommand();
          return;
        }
        if (isPrimitiveCommand(commandId)) {
          if (!primitiveCenterRef.current) {
            primitiveCenterRef.current = hitPoint;
            refreshPreview(hitPoint);
            return;
          }
          createPrimitiveFromDrag(primitiveCenterRef.current, hitPoint);
          primitiveCenterRef.current = null;
          clearPreview();
          completeActiveCommand();
          return;
        }
      }

      selectionDragRef.current = {
        pointerId: event.pointerId,
        start: { x, y },
        current: { x, y },
        isBoxSelection: false,
        shiftKey,
        ctrlShiftKey,
        componentKind,
      };
      setSelectionBox(null);
      canvas.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (drag.mode !== "none") {
        const context = getPointerContext(event);
        if (!context) return;
        const dx = context.pointer.x - drag.pointer.x;
        const dy = context.pointer.y - drag.pointer.y;

        if (drag.mode === "orbit") {
          const nextTheta = drag.startAngles.theta - dx * ORBIT_SPEED;
          const nextPhi = clamp(
            drag.startAngles.phi - dy * ORBIT_SPEED,
            0.1,
            Math.PI - 0.1
          );
          const nextPosition = fromSpherical(
            drag.startCamera.target,
            drag.startAngles.radius,
            nextTheta,
            nextPhi
          );
          applyCameraState({ position: nextPosition });
          return;
        }

        const radius = drag.startAngles.radius;
        const panScale = radius * PAN_SPEED;
        const { right, up } = getCameraAxes(
          drag.startCamera.position,
          drag.startCamera.target,
          cameraRef.current.up
        );
        const offset = add(scale(right, -dx * panScale), scale(up, dy * panScale));
        applyCameraState({
          position: add(drag.startCamera.position, offset),
          target: add(drag.startCamera.target, offset),
        });
        return;
      }

      const gumballDrag = gumballDragRef.current;
      if (gumballDrag && gumballDrag.pointerId === event.pointerId) {
        const context = getPointerContext(event);
        if (!context) return;
        if (!gumballDrag.moved) {
          const dx = context.pointer.x - gumballDrag.startPointer.x;
          const dy = context.pointer.y - gumballDrag.startPointer.y;
          if (Math.hypot(dx, dy) > GUMBALL_CLICK_THRESHOLD) {
            gumballDrag.moved = true;
          }
        }
        if (gumballDrag.handle.kind === "pivot") {
          updatePivotFromPointer(context);
        } else if (gumballDrag.handle.kind === "extrude") {
          updateExtrudeFromPointer(context, event);
        } else {
          updateTransformFromPointer(context, event);
        }
        return;
      }

      const pointDrag = pointDragRef.current;
      if (pointDrag && pointDrag.pointerId === event.pointerId) {
        const context = getPointerContext(event);
        if (!context) return;
        if (!pointDrag.moved) {
          const dx = context.pointer.x - pointDrag.startPointer.x;
          const dy = context.pointer.y - pointDrag.startPointer.y;
          if (Math.hypot(dx, dy) > POINT_DRAG_THRESHOLD) {
            pointDrag.moved = true;
          }
        }
        updateTransformFromPointer(context, event);
        return;
      }

      const context = getPointerContext(event);
      if (!context) return;
      pointerPlaneRef.current = context.planePoint;
      if (pivotRef.current.mode === "cursor" && context.planePoint) {
        setPivotCursorPosition(context.planePoint);
      }
      refreshPreview(context.planePoint);

      if (!selectionDragRef.current) {
        const hoverPick = pickGumballHandle(context, {
          allowPivot: event.ctrlKey || event.metaKey,
        });
        const nextHandleId = hoverPick?.handleId ?? null;
        const nextExtrude =
          hoverPick?.handle.kind === "extrude" ? hoverPick.handle : null;
        const prevHandleId = gumballHoverRef.current;
        const prevExtrude = extrudeHoverRef.current;
        if (
          prevHandleId !== nextHandleId ||
          prevExtrude?.geometryId !== nextExtrude?.geometryId ||
          prevExtrude?.faceIndex !== nextExtrude?.faceIndex
        ) {
          gumballHoverPreviewDirtyRef.current = true;
        }
        gumballHoverRef.current = nextHandleId;
        extrudeHoverRef.current = nextExtrude;

        const hoverComponentMode = selectionModeRef.current !== "object" || event.shiftKey;
        if (hoverComponentMode) {
          const hoverPickComponent = pickComponent(context, resolveComponentMode());
          setHoverSelection(
            hoverPickComponent?.kind === "component"
              ? hoverPickComponent.selection
              : null
          );
        } else {
          setHoverSelection(null);
        }

        const pointHover = pickPointHandle(context, { includeReferenced: true });
        pointHoverRef.current = pointHover;
        if (viewSettingsRef.current.showPointPickDebug) {
          const prevId = pointHoverDebugRef.current?.id ?? null;
          const nextId = pointHover?.id ?? null;
          if (prevId !== nextId) {
            setPointHoverDebug(pointHover);
          }
        }
      }

      const dragSelection = selectionDragRef.current;
      if (!dragSelection || dragSelection.pointerId !== event.pointerId) return;
      dragSelection.current = context.pointer;
      if (dragSelection.ctrlShiftKey) {
        dragSelection.isBoxSelection = false;
        setSelectionBox(null);
        return;
      }
      const rect = normalizeRect(dragSelection.start, dragSelection.current);
      const dragDistance = Math.hypot(rect.width, rect.height);
      if (dragDistance > SELECTION_DRAG_THRESHOLD) {
        dragSelection.isBoxSelection = true;
        setSelectionBox(rect);
      } else {
        dragSelection.isBoxSelection = false;
        setSelectionBox(null);
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (drag.mode !== "none") {
        dragRef.current = { mode: "none" };
        safeReleasePointerCapture(event.pointerId);
        return;
      }

      const gumballDrag = gumballDragRef.current;
      if (gumballDrag && gumballDrag.pointerId === event.pointerId) {
        if (!gumballDrag.moved && applyGumballClickStep(gumballDrag.handle)) {
          safeReleasePointerCapture(event.pointerId);
          return;
        }
        if (gumballDrag.handle.kind === "pivot") {
          gumballDragRef.current = null;
          pivotDragPlaneRef.current = null;
          setSnapIndicator(null);
          resetSnapCycle();
        } else if (gumballDrag.handle.kind === "extrude") {
          gumballDragRef.current = null;
          setSnapIndicator(null);
          resetSnapCycle();
          // Keep the extrude panel open so values can be entered and confirmed with Enter.
        } else if (gumballDrag.handle.kind === "rotate") {
          gumballDragRef.current = null;
          setSnapIndicator(null);
          resetSnapCycle();
          // Keep the rotate panel open so values can be entered and confirmed with Enter.
        } else if (
          gumballDrag.handle.kind === "axis" ||
          gumballDrag.handle.kind === "plane" ||
          gumballDrag.handle.kind === "scale"
        ) {
          gumballDragRef.current = null;
          setSnapIndicator(null);
          resetSnapCycle();
          // Keep the transform panel open so values can be entered and confirmed with Enter.
        } else {
          commitTransformSession();
          completeActiveCommand();
        }
        safeReleasePointerCapture(event.pointerId);
        return;
      }

      const pointDrag = pointDragRef.current;
      if (pointDrag && pointDrag.pointerId === event.pointerId) {
        pointDragRef.current = null;
        safeReleasePointerCapture(event.pointerId);
        if (pointDrag.moved) {
          commitTransformSession();
        } else {
          cancelTransformSession();
        }
        return;
      }

      const selectionDrag = selectionDragRef.current;
      if (!selectionDrag || selectionDrag.pointerId !== event.pointerId) return;
      selectionDragRef.current = null;
      safeReleasePointerCapture(event.pointerId);

      const context = getPointerContext(event);
      setSelectionBox(null);
      if (!context) return;
      pointerPlaneRef.current = context.planePoint;
      refreshPreview(context.planePoint);

      if (selectionDrag.ctrlShiftKey) {
        const componentPick = pickComponent(
          context,
          selectionDrag.componentKind ?? resolveComponentMode()
        );
        applyPick(componentPick, selectionDrag.shiftKey, true);
        return;
      }

      if (selectionDrag.isBoxSelection) {
        const rect = normalizeRect(selectionDrag.start, selectionDrag.current);
        selectWithBox(context, rect, selectionDrag.shiftKey);
        return;
      }

      const pick = pickObject(context);
      applyPick(pick, selectionDrag.shiftKey, false);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const delta = event.deltaY;
      const current = cameraRef.current;
      const offset = sub(current.position, current.target);
      const radius = length(offset);
      const nextRadius = clamp(radius * (1 + delta * ZOOM_SPEED * current.zoomSpeed), MIN_DISTANCE, MAX_DISTANCE);
      const direction = normalize(offset);
      const nextPosition = add(current.target, scale(direction, nextRadius));
      applyCameraState({ position: nextPosition });
    };

    const handleDoubleClick = () => {
      if (activeCommandIdRef.current !== "polyline") return;
      if (polylinePointsRef.current.length < 2) return;
      commitPolyline();
      clearPreview();
      completeActiveCommand();
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("dblclick", handleDoubleClick);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("dblclick", handleDoubleClick);
    };
  }, [
    addGeometryMesh,
    addGeometryPoint,
    addGeometryPolylineFromPoints,
    geometry,
    geometryBoundsMap,
    interactionsEnabled,
    referencedVertexIds,
    applyCameraState,
    setPivotCursorPosition,
    setPivotPickedPosition,
    vertexMap,
  ]);

  useEffect(() => {
    if (!interactionsEnabled) return;
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

      if (event.key === "Tab") {
        const session = transformSessionRef.current;
        if (session?.mode === "move") {
          event.preventDefault();
          const candidate = cycleSnapCandidate();
          if (candidate) {
            applyMoveSnapCandidate(session, candidate);
          }
          return;
        }
        const gumballDrag = gumballDragRef.current;
        if (gumballDrag?.handle.kind === "pivot") {
          event.preventDefault();
          const candidate = cycleSnapCandidate();
          if (candidate) {
            applyPivotSnapCandidate(candidate);
          }
        }
      }

      if (event.key === "Escape") {
        if (transformSessionRef.current) {
          cancelTransformSession();
          return;
        }
        if (extrudeSessionRef.current) {
          cancelExtrudeSession();
          return;
        }
        if (gumballDragRef.current?.handle.kind === "pivot") {
          gumballDragRef.current = null;
          pivotDragPlaneRef.current = null;
          setSnapIndicator(null);
          resetSnapCycle();
          return;
        }
        selectionDragRef.current = null;
        setSelectionBox(null);
        lineStartRef.current = null;
        arcStartRef.current = null;
        arcEndRef.current = null;
        rectangleStartRef.current = null;
        circleCenterRef.current = null;
        primitiveCenterRef.current = null;
        cancelPolyline();
        cancelCurve();
        clearPreview();
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        const componentSelection = componentSelectionRef.current;
        const componentIds = new Set(componentSelection.map((item) => item.geometryId));
        const selectionIds =
          componentIds.size > 0 ? Array.from(componentIds) : selectionRef.current;
        if (selectionIds.length === 0) return;
        event.preventDefault();
        if (transformSessionRef.current) {
          cancelTransformSession();
        }
        if (extrudeSessionRef.current) {
          cancelExtrudeSession();
        }
        if (gumballDragRef.current?.handle.kind === "pivot") {
          gumballDragRef.current = null;
          pivotDragPlaneRef.current = null;
          setSnapIndicator(null);
          resetSnapCycle();
        }
        useProjectStore.getState().deleteGeometry(selectionIds);
        return;
      }

      if (event.key !== "Enter") return;
      if (transformSessionRef.current) {
        commitTransformSession();
        completeActiveCommand();
        return;
      }
      if (extrudeSessionRef.current) {
        commitExtrudeSession();
        completeActiveCommand();
        return;
      }
      const pointerPoint = pointerPlaneRef.current;
      const commandId = activeCommandIdRef.current;
      if (commandId === "polyline") {
        commitPolyline();
        clearPreview();
        completeActiveCommand();
        return;
      }
      if (commandId === "curve") {
        commitCurve();
        clearPreview();
        completeActiveCommand();
        return;
      }
      if (!pointerPoint) return;
      if (commandId === "line" && lineStartRef.current) {
        createLineFromDrag(lineStartRef.current, pointerPoint);
        lineStartRef.current = pointerPoint;
        refreshPreview(pointerPoint);
        return;
      }
      if (commandId === "arc" && arcStartRef.current && arcEndRef.current) {
        const start = arcStartRef.current;
        const end = arcEndRef.current;
        createArcFromPoints(start, end, pointerPoint);
        arcStartRef.current = end;
        arcEndRef.current = null;
        refreshPreview(pointerPoint);
        return;
      }
      if (commandId === "rectangle" && rectangleStartRef.current) {
        createRectangleFromDrag(rectangleStartRef.current, pointerPoint);
        rectangleStartRef.current = null;
        clearPreview();
        completeActiveCommand();
        return;
      }
      if (commandId === "circle" && circleCenterRef.current) {
        createCircleFromDrag(circleCenterRef.current, pointerPoint);
        circleCenterRef.current = null;
        clearPreview();
        completeActiveCommand();
        return;
      }
      if (isPrimitiveCommand(commandId) && primitiveCenterRef.current) {
        createPrimitiveFromDrag(primitiveCenterRef.current, pointerPoint);
        primitiveCenterRef.current = null;
        clearPreview();
        completeActiveCommand();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setHoverSelection(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [interactionsEnabled]);

  useEffect(() => {
    let frameId: number;

    const render = () => {
      const renderer = rendererRef.current;
      const adapter = adapterRef.current;
      const canvas = canvasRef.current;
      if (!renderer || !adapter || !canvas) {
        frameId = requestAnimationFrame(render);
        return;
      }

      renderer.setClearColor(VIEW_STYLE.clearColor);
      renderer.clear();

      const cameraState = cameraRef.current;
      const cameraPayload = toCamera({
        position: cameraState.position,
        target: cameraState.target,
        up: cameraState.up,
        fov: cameraState.fov,
        aspect: canvas.width / canvas.height,
      });

      updatePreviewBuffers();
      updateHoverBuffers();
      updateGumballHoverPreviewBuffers(canvas, gumballPixelSize);
      updateSelectedComponentBuffers();
      updateSelectionBoundsBuffer(isGizmoVisible ? selectionBounds : null);

      const selection = new Set(selectionRef.current);
      const hasSelection = selection.size > 0;
      const hidden = new Set(hiddenRef.current);
      const isSilhouette = displayModeRef.current === "silhouette";
      const viewSolidity = clamp01(viewSolidityRef.current);
      const smoothSolidity = smoothstep(0, 1, viewSolidity);
      const silhouetteBlend = smoothstep(0.12, 1, viewSolidity);
      const silhouetteFill = Math.pow(silhouetteBlend, 1.35);
      const silhouetteDash = Math.pow(1 - silhouetteBlend, 1.15);
      const solidBlend = isSilhouette ? 1 : smoothSolidity;
      const baseMeshOpacity = isSilhouette ? 1 : Math.pow(smoothSolidity, 1.12);
      const showMesh = isSilhouette ? true : baseMeshOpacity > 0.02;
      const nonSolidBlend = isSilhouette ? 0 : 1 - smoothSolidity;
      const edgeFade = isSilhouette ? 1 : smoothSolidity;
      const wireframeBoost = isSilhouette ? 0 : Math.pow(1 - smoothSolidity, 1.25);
      renderer.setBackfaceCulling(false);
      const showEdges = !isSilhouette;
      const renderScale = lerp(1, VIEW_STYLE.solidRenderScale, solidBlend);
      const baseDpr = resolveViewerDpr();
      const dpr = baseDpr * renderScale;
      const edgePrimaryWidth = VIEW_STYLE.edgePrimaryWidth * dpr;
      const edgeSecondaryWidth = VIEW_STYLE.edgeSecondaryWidth * dpr;
      const edgeTertiaryWidth = VIEW_STYLE.edgeTertiaryWidth * dpr;
      const edgeBias = lerp(0.00022, 0.00045, edgeFade);
      const edgeDepthBias = edgeBias * 1.5;
      const lineDepthBias = edgeBias * 1.15;
      const pointDepthBias = edgeBias * 1.8;
      const pointRadius = POINT_HANDLE_RADIUS_PX * baseDpr;
      const pointOutline = POINT_HANDLE_OUTLINE_PX * baseDpr;
      const edgeOpacityScale = lerp(1, 0.8, edgeFade);
      const edgeInternalScale = lerp(1, 0.7, edgeFade);
      const edgeAAStrength = lerp(0.22, 1.0, smoothSolidity);
      const edgePixelSnap = lerp(0.65, 0.0, smoothSolidity);

      const gridMinorBuffer = gridMinorBufferRef.current;
      const gridMajorBuffer = gridMajorBufferRef.current;
      if (gridMinorBuffer) {
        renderer.renderEdges(gridMinorBuffer, cameraPayload, {
          edgeColor: VIEW_STYLE.gridMinor,
          opacity: 0.35,
          dashEnabled: 0,
        });
      }
      if (gridMajorBuffer) {
        renderer.renderEdges(gridMajorBuffer, cameraPayload, {
          edgeColor: VIEW_STYLE.gridMajor,
          opacity: 0.5,
          dashEnabled: 0,
        });
      }

      const renderables = adapter
        .getAllRenderables()
        .filter((renderable) => !hidden.has(renderable.id));
      const viewDir = normalize(sub(cameraState.target, cameraState.position));
      const meshRenderables = renderables
        .filter((renderable) => renderable.type !== "polyline")
        .map((renderable) => {
          const bounds = geometryBoundsRef.current.get(renderable.id);
          const center = bounds
            ? {
                x: (bounds.min.x + bounds.max.x) * 0.5,
                y: (bounds.min.y + bounds.max.y) * 0.5,
                z: (bounds.min.z + bounds.max.z) * 0.5,
              }
            : { x: 0, y: 0, z: 0 };
          const depth = dot(sub(center, cameraState.position), viewDir);
          return { renderable, depth };
        })
        .sort((a, b) => b.depth - a.depth);

      const renderPointHandle = (renderable: RenderableGeometry, isSelected: boolean) => {
        const fillColor = adjustForSelection(
          POINT_FILL_COLOR,
          isSelected,
          hasSelection
        );
        renderer.renderPoints(
          renderable.buffer,
          cameraPayload,
          {
            pointRadius,
            outlineWidth: pointOutline,
            fillColor,
            outlineColor: POINT_OUTLINE_COLOR,
            depthBias: pointDepthBias,
            opacity: 1,
          },
          { depthFunc: "lequal", depthMask: false, blend: true }
        );
      };

      const renderMesh = (renderable: RenderableGeometry, isSelected: boolean) => {
        if (renderable.type === "vertex") return;
        if (!showMesh || baseMeshOpacity <= 0) return;
        if (isSilhouette) {
          const fillOpacity = clamp01(silhouetteFill);
          if (fillOpacity <= 0.01) return;
          const materialColor = isSelected
            ? SILHOUETTE_SELECTED_COLOR
            : SILHOUETTE_BASE_COLOR;
          renderer.renderGeometry(renderable.buffer, cameraPayload, {
            materialColor,
            lightPosition: VIEW_STYLE.lightPosition,
            lightColor: VIEW_STYLE.light,
            ambientColor: VIEW_STYLE.ambient,
            ambientStrength: 1,
            cameraPosition: cameraPayload.position,
            selectionHighlight: VIEW_STYLE.selection,
            isSelected: isSelected ? 0.6 : 0,
            sheenIntensity: 0,
            opacity: fillOpacity,
          });
          return;
        }

        const customOverrides = customMaterialMapRef.current.get(renderable.id);
        const baseColor = customOverrides?.color ?? VIEW_STYLE.mesh;
        const materialColor = adjustForSelection(baseColor, isSelected, hasSelection);
        const selectionFactor = hasSelection
          ? lerp(
              1,
              isSelected
                ? 1.02
                : baseMeshOpacity > 0.7
                  ? 0.9
                  : 0.75,
              clamp01(nonSolidBlend)
            )
          : 1;
        const opacity = clamp(
          baseMeshOpacity * selectionFactor,
          0.2,
          1
        );
        const geometryUniforms = {
          materialColor,
          lightPosition: VIEW_STYLE.lightPosition,
          lightColor: VIEW_STYLE.light,
          ambientColor: VIEW_STYLE.ambient,
          ambientStrength:
            customOverrides?.ambientStrength ?? VIEW_STYLE.ambientStrength,
          cameraPosition: cameraPayload.position,
          selectionHighlight: VIEW_STYLE.selection,
          isSelected: isSelected ? 0.6 : 0,
          sheenIntensity:
            customOverrides?.sheenIntensity ?? viewSettingsRef.current.sheen ?? 0.08,
          opacity,
        };
        if (opacity < 0.999 && (showEdges || isSilhouette)) {
          renderer.renderGeometryDepth(renderable.buffer, cameraPayload, geometryUniforms);
        }
        renderer.renderGeometry(renderable.buffer, cameraPayload, geometryUniforms);
      };

      const renderMeshEdges = (renderable: RenderableGeometry, isSelected: boolean) => {
        const edgeBuffer = renderable.edgeBuffer;
        const edgeJoinBuffer = renderable.edgeJoinBuffer;
        if (renderable.type === "vertex") {
          return;
        }

        if (isSilhouette) {
          const edgeLineBuffers = renderable.edgeLineBuffers;
          const silhouetteColor = isSelected
            ? SILHOUETTE_SELECTED_COLOR
            : SILHOUETTE_BASE_COLOR;
          const dashOpacity = Math.min(1, silhouetteDash * 0.9);
          if (edgeBuffer && dashOpacity > 0.02) {
            const dashColor = mixColor(silhouetteColor, [1, 1, 1], 0.25);
            renderer.renderEdges(
              edgeBuffer,
              cameraPayload,
              {
                edgeColor: dashColor,
                opacity: dashOpacity,
                dashEnabled: 1,
                dashScale: 0.06,
                depthBias: edgeDepthBias,
                lineWidth: 1.7 * dpr,
              },
              { depthFunc: "lequal" }
            );
          }

          if (edgeLineBuffers && edgeLineBuffers.length > 0) {
            const edgeWidths: [number, number, number] = [
              edgeTertiaryWidth * 0.6,
              edgeSecondaryWidth * 0.7,
              edgePrimaryWidth * 1.6,
            ];
            const edgeOpacities: [number, number, number] = [0, 0, 1];
            edgeLineBuffers.forEach((edgeLineBuffer) => {
              renderer.renderEdgeLines(
                edgeLineBuffer,
                cameraPayload,
                {
                  resolution: [canvas.width, canvas.height],
                  edgeWidths,
                  edgeOpacities,
                  edgeColorInternal: silhouetteColor,
                  edgeColorCrease: silhouetteColor,
                  edgeColorSilhouette: silhouetteColor,
                  depthBias: edgeDepthBias,
                  edgeAAStrength: 1,
                  edgePixelSnap: 0.9,
                },
                {
                  depthFunc: "lequal",
                  depthMask: false,
                  blend: true,
                }
              );
            });
            if (edgeJoinBuffer) {
              renderer.renderEdgeJoins(
                edgeJoinBuffer,
                cameraPayload,
                {
                  resolution: [canvas.width, canvas.height],
                  edgeWidths,
                  edgeOpacities,
                  edgeColorInternal: silhouetteColor,
                  edgeColorCrease: silhouetteColor,
                  edgeColorSilhouette: silhouetteColor,
                  depthBias: edgeDepthBias,
                  edgeAAStrength: 1,
                  edgePixelSnap,
                },
                {
                  depthFunc: "lequal",
                  depthMask: false,
                  blend: true,
                }
              );
            }
          } else if (edgeBuffer) {
            renderer.renderEdges(
              edgeBuffer,
              cameraPayload,
              {
                edgeColor: silhouetteColor,
                opacity: 1,
                dashEnabled: 0,
                depthBias: edgeDepthBias,
                lineWidth: edgePrimaryWidth * 1.6,
              },
              { depthFunc: "lequal" }
            );
            if (edgeJoinBuffer) {
              const edgeWidths: [number, number, number] = [
                edgeTertiaryWidth * 0.6,
                edgeSecondaryWidth * 0.7,
                edgePrimaryWidth * 1.6,
              ];
              const edgeOpacities: [number, number, number] = [0, 0, 1];
              renderer.renderEdgeJoins(
                edgeJoinBuffer,
                cameraPayload,
                {
                  resolution: [canvas.width, canvas.height],
                  edgeWidths,
                  edgeOpacities,
                  edgeColorInternal: silhouetteColor,
                  edgeColorCrease: silhouetteColor,
                  edgeColorSilhouette: silhouetteColor,
                  depthBias: edgeDepthBias,
                  edgeAAStrength: 1,
                  edgePixelSnap,
                },
                {
                  depthFunc: "lequal",
                  depthMask: false,
                  blend: true,
                }
              );
            }
          }
          return;
        }

        if (!showEdges) return;
        const customOverrides = customMaterialMapRef.current.get(renderable.id);
        const baseColor = customOverrides?.color ?? VIEW_STYLE.mesh;
        const edgeLineBuffers = renderable.edgeLineBuffers;
        const edgeBase = darkenColor(
          adjustForSelection(baseColor, isSelected, hasSelection),
          0.22
        );
        const edgeInternalColor = mixColor(edgeBase, [1, 1, 1], 0.28);
        const edgeCreaseColor = edgeBase;
        const edgeSilhouetteColor = darkenColor(edgeBase, 0.2);
        const internalWidthScale = lerp(1, 0.9, wireframeBoost);
        const creaseWidthScale = lerp(1, 1.12, wireframeBoost * 0.7);
        const silhouetteWidthScale = lerp(1, 1.5, wireframeBoost);
        const edgeWidths: [number, number, number] = [
          edgeTertiaryWidth * internalWidthScale,
          edgeSecondaryWidth * creaseWidthScale,
          edgePrimaryWidth * silhouetteWidthScale,
        ];
        const internalOpacityScale = lerp(1, 0.55, wireframeBoost);
        const creaseOpacityScale = lerp(1, 0.8, wireframeBoost * 0.6);
        const silhouetteOpacityScale = lerp(1, 1.15, wireframeBoost);
        const edgeOpacities: [number, number, number] = [
          Math.min(
            1,
            VIEW_STYLE.edgeTertiaryOpacity *
              edgeOpacityScale *
              edgeInternalScale *
              internalOpacityScale
          ),
          Math.min(
            1,
            VIEW_STYLE.edgeSecondaryOpacity *
              edgeOpacityScale *
              creaseOpacityScale
          ),
          Math.min(
            1,
            VIEW_STYLE.edgePrimaryOpacity *
              edgeOpacityScale *
              silhouetteOpacityScale
          ),
        ];

        if (edgeLineBuffers && edgeLineBuffers.length > 0) {
          edgeLineBuffers.forEach((edgeLineBuffer) => {
            renderer.renderEdgeLines(
              edgeLineBuffer,
              cameraPayload,
              {
                resolution: [canvas.width, canvas.height],
                edgeWidths,
                edgeOpacities,
                edgeColorInternal: edgeInternalColor,
                edgeColorCrease: edgeCreaseColor,
                edgeColorSilhouette: edgeSilhouetteColor,
                depthBias: edgeDepthBias,
                edgeAAStrength,
                edgePixelSnap,
              },
              {
                depthFunc: "lequal",
                depthMask: false,
                blend: true,
              }
            );
          });
          if (edgeJoinBuffer) {
            renderer.renderEdgeJoins(
              edgeJoinBuffer,
              cameraPayload,
              {
                resolution: [canvas.width, canvas.height],
                edgeWidths,
                edgeOpacities,
                edgeColorInternal: edgeInternalColor,
                edgeColorCrease: edgeCreaseColor,
                edgeColorSilhouette: edgeSilhouetteColor,
                depthBias: edgeDepthBias,
                edgeAAStrength,
                edgePixelSnap,
              },
              {
                depthFunc: "lequal",
                depthMask: false,
                blend: true,
              }
            );
          }
        } else if (edgeBuffer) {
          renderer.renderEdges(
            edgeBuffer,
            cameraPayload,
            {
              edgeColor: edgeCreaseColor,
              opacity: 1,
              dashEnabled: 0,
              depthBias: edgeDepthBias,
              lineWidth: 3.2 * dpr,
            },
            { depthFunc: "lequal" }
          );
          if (edgeJoinBuffer) {
            renderer.renderEdgeJoins(
              edgeJoinBuffer,
              cameraPayload,
              {
                resolution: [canvas.width, canvas.height],
                edgeWidths,
                edgeOpacities,
                edgeColorInternal: edgeInternalColor,
                edgeColorCrease: edgeCreaseColor,
                edgeColorSilhouette: edgeSilhouetteColor,
                depthBias: edgeDepthBias,
                edgeAAStrength,
                edgePixelSnap,
              },
              {
                depthFunc: "lequal",
                depthMask: false,
                blend: true,
              }
            );
          }
        }
      };

      const polylineRenderables = renderables.filter(
        (renderable) => renderable.type === "polyline"
      );
      const renderPolyline = (renderable: RenderableGeometry, isSelected: boolean) => {
        const lineColor = isSilhouette
          ? isSelected
            ? SILHOUETTE_SELECTED_COLOR
            : SILHOUETTE_BASE_COLOR
          : darkenColor(
              adjustForSelection(
                customMaterialMapRef.current.get(renderable.id)?.color ?? VIEW_STYLE.mesh,
                isSelected,
                hasSelection
              ),
              0.22
            );
        renderer.renderLine(
          renderable.buffer,
          cameraPayload,
          {
            lineWidth: 6 * dpr,
            resolution: [canvas.width, canvas.height],
            lineColor,
            lineOpacity: 1,
            depthBias: lineDepthBias,
            selectionHighlight: [0, 0, 0],
            isSelected: 0,
            linePixelSnap: edgePixelSnap,
          },
          { depthFunc: "lequal", depthMask: false }
        );
      };

      meshRenderables.forEach(({ renderable }) => {
        const isSelected = selection.has(renderable.id);
        renderMesh(renderable, isSelected);
        renderMeshEdges(renderable, isSelected);
      });
      polylineRenderables.forEach((renderable) => {
        const isSelected = selection.has(renderable.id);
        renderPolyline(renderable, isSelected);
      });
      meshRenderables.forEach(({ renderable }) => {
        if (renderable.type !== "vertex") return;
        const isSelected = selection.has(renderable.id);
        renderPointHandle(renderable, isSelected);
      });

      const selectedLineBuffer = selectedLineBufferRef.current;
      const selectedFaceBuffer = selectedFaceBufferRef.current;
      const selectedPointBuffer = selectedPointBufferRef.current;
      const componentSelections = componentSelectionRef.current;
      const hasComponentSelection = componentSelections.length > 0;
      if (hasComponentSelection) {
        const highlightColor: [number, number, number] = [0.2, 0.64, 0.66];
        if (selectedFaceBuffer && selectedFaceBuffer.indexCount > 0) {
          renderer.renderGeometry(selectedFaceBuffer, cameraPayload, {
            materialColor: highlightColor,
            lightPosition: VIEW_STYLE.lightPosition,
            lightColor: VIEW_STYLE.light,
            ambientColor: VIEW_STYLE.ambient,
            ambientStrength: VIEW_STYLE.ambientStrength,
            selectionHighlight: VIEW_STYLE.selection,
            isSelected: 0,
            sheenIntensity: viewSettingsRef.current.sheen ?? 0.08,
            opacity: 0.38,
          });
        }
        if (selectedLineBuffer && selectedLineBuffer.indexCount > 0) {
          renderer.renderEdges(
            selectedLineBuffer,
            cameraPayload,
            {
              edgeColor: highlightColor,
              opacity: 0.95,
              dashEnabled: 0,
              depthBias: edgeDepthBias,
              lineWidth: 2 * dpr,
            },
            { depthFunc: "lequal" }
          );
        }
        if (selectedPointBuffer && selectedPointBuffer.vertexCount > 0) {
          renderer.renderPoints(
            selectedPointBuffer,
            cameraPayload,
            {
              pointRadius: pointRadius * 1.35,
              outlineWidth: pointOutline,
              fillColor: highlightColor,
              outlineColor: POINT_OUTLINE_COLOR,
              depthBias: pointDepthBias,
              opacity: 1,
            },
            { depthFunc: "lequal", depthMask: false, blend: true }
          );
        }
      }

      const preview = previewStateRef.current;
      const previewLineBuffer = previewLineBufferRef.current;
      const previewMeshBuffer = previewMeshBufferRef.current;
      const previewEdgeBuffer = previewEdgeBufferRef.current;
      if (preview?.kind === "line" && previewLineBuffer) {
        renderer.renderLine(previewLineBuffer, cameraPayload, {
          lineWidth: 2.2 * dpr,
          resolution: [canvas.width, canvas.height],
          lineColor: [0.2, 0.64, 0.66],
          lineOpacity: 0.75,
          selectionHighlight: VIEW_STYLE.selection,
          isSelected: 0,
          linePixelSnap: edgePixelSnap,
        }, { depthFunc: "always", depthMask: false });
      } else if (preview?.kind === "mesh" && previewMeshBuffer) {
        renderer.renderGeometry(previewMeshBuffer, cameraPayload, {
          materialColor: [0.2, 0.64, 0.66],
          lightPosition: VIEW_STYLE.lightPosition,
          lightColor: VIEW_STYLE.light,
          ambientColor: VIEW_STYLE.ambient,
          ambientStrength: VIEW_STYLE.ambientStrength,
          selectionHighlight: VIEW_STYLE.selection,
          isSelected: 0,
          sheenIntensity: viewSettingsRef.current.sheen ?? 0.08,
          opacity: 0.5,
        });
        if (previewEdgeBuffer) {
          renderer.renderEdges(previewEdgeBuffer, cameraPayload, {
            edgeColor: [0.2, 0.64, 0.66],
            opacity: 0.95,
            dashEnabled: 0,
          });
        }
      }

      const hoverSelection = hoverSelectionRef.current;
      const hoverLineBuffer = hoverLineBufferRef.current;
      const hoverMeshBuffer = hoverMeshBufferRef.current;
      if (hoverSelection && hoverMeshBuffer && hoverSelection.kind === "face") {
        renderer.renderGeometry(hoverMeshBuffer, cameraPayload, {
          materialColor: [0.2, 0.64, 0.66],
          lightPosition: VIEW_STYLE.lightPosition,
          lightColor: VIEW_STYLE.light,
          ambientColor: VIEW_STYLE.ambient,
          ambientStrength: VIEW_STYLE.ambientStrength,
          selectionHighlight: VIEW_STYLE.selection,
          isSelected: 0,
          sheenIntensity: viewSettingsRef.current.sheen ?? 0.08,
          opacity: 0.28,
        });
      }
      if (hoverSelection && hoverLineBuffer) {
        renderer.renderLine(
          hoverLineBuffer,
          cameraPayload,
          {
            lineWidth: 3.2 * dpr,
            resolution: [canvas.width, canvas.height],
            lineColor: [0.2, 0.64, 0.66],
            lineOpacity: 0.9,
            depthBias: lineDepthBias,
            selectionHighlight: [0, 0, 0],
            isSelected: 0,
            linePixelSnap: edgePixelSnap,
          },
          { depthFunc: "lequal", depthMask: false }
        );
      }

      const gumballHoverPreviewBuffer = gumballHoverPreviewBufferRef.current;
      if (gumballHoverPreviewBuffer && gumballHoverPreviewBuffer.vertexCount > 0) {
        const previewColor: [number, number, number] = [0.78, 0.8, 0.82];
        const previewOpacity = isSilhouette ? 0.6 : 0.45;
        renderer.renderEdges(
          gumballHoverPreviewBuffer,
          cameraPayload,
          {
            edgeColor: previewColor,
            opacity: previewOpacity,
            dashEnabled: 1,
            dashScale: 0.06 / baseDpr,
            lineWidth: 1.05 * baseDpr,
            depthBias: lineDepthBias,
          },
          { depthFunc: "lequal" }
        );
      }

      const boundsBuffer = selectionBoundsBufferRef.current;
      if (isGizmoVisible && selectionBounds && boundsBuffer) {
        renderer.renderEdges(
          boundsBuffer,
          cameraPayload,
          {
            edgeColor: BOUNDING_BOX_COLOR,
            opacity: 0.9,
            dashEnabled: 0,
          },
          { depthFunc: "always" }
        );
      }

      const gumballState = gumballStateRef.current;
      const gumballBuffers = gumballBuffersRef.current;
      if (gumballState?.visible && gumballState.mode && gumballBuffers) {
        const widgetState = computeCornerGumballViewport(
          cameraState,
          canvas,
          gumballViewportZoomRef.current,
          gumballPixelSize
        );
        const activeHandle =
          gumballDragRef.current?.handleId ?? gumballHoverRef.current ?? null;
        const gumballOpacityScale = isSilhouette ? 1 : lerp(0.65, 1, smoothSolidity);
        const gumballSolid = true;
        const gumballHighlight = isSilhouette
          ? undefined
          : ([0.05, 0.05, 0.05] as [number, number, number]);
        const gumballSolidColor = isSilhouette ? SILHOUETTE_BASE_COLOR : undefined;
        const gumballTransforms = getGumballTransforms({
          position: widgetState.center,
          orientation: gumballState.orientation,
          scale: widgetState.scale,
          mode: gumballState.mode,
          activeHandle,
        });

        const showMove =
          showMoveArmsRef.current &&
          (gumballState.mode === "move" || gumballState.mode === "gumball");
        const showScale = gumballState.mode === "scale" || gumballState.mode === "gumball";
        const showRings =
          showRotationRingsRef.current &&
          (gumballState.mode === "rotate" || gumballState.mode === "gumball");
        const showRotate = showRings;
        renderGumball(
          renderer,
          cameraPayload,
          gumballBuffers,
          {
            position: widgetState.center,
            orientation: gumballState.orientation,
            scale: widgetState.scale,
            mode: gumballState.mode,
            activeHandle,
          },
          {
            lightPosition: VIEW_STYLE.lightPosition,
            lightColor: VIEW_STYLE.light,
            ambientColor: VIEW_STYLE.ambient,
            ambientStrength: VIEW_STYLE.ambientStrength,
            sheenIntensity: viewSettingsRef.current.sheen ?? 0.08,
            showRotate: showRings,
            showMove: showMoveArmsRef.current,
            axisOpacity: (gumballSolid ? 1 : 0.95) * gumballOpacityScale,
            planeOpacity: (gumballSolid ? 0.85 : 0.6) * gumballOpacityScale,
            highlightColor: gumballHighlight,
            solidMode: gumballSolid,
            solidColor: gumballSolidColor,
          }
        );

        const connectorDashScale = 0.08 / baseDpr;
        const connectorOpacity = 0.75 * gumballOpacityScale;
        const connectorLineWidth = 1.1 * baseDpr;
        const renderGumballConnector = (
          buffer: GeometryBuffer | undefined,
          modelMatrix: Float32Array,
          baseColor: [number, number, number],
          opacityScale = 1
        ) => {
          if (!buffer) return;
          const edgeColor = mixColor(baseColor, [1, 1, 1], 0.25);
          renderer.renderEdges(
            buffer,
            cameraPayload,
            {
              modelMatrix,
              edgeColor,
              opacity: connectorOpacity * opacityScale,
              dashEnabled: 1,
              dashScale: connectorDashScale,
              lineWidth: connectorLineWidth,
              depthBias: lineDepthBias,
            },
            { depthFunc: "lequal" }
          );
        };

        if (showScale) {
          renderGumballConnector(
            gumballBuffers.scaleConnector,
            gumballTransforms.xAxis,
            GUMBALL_AXIS_COLORS.x
          );
          renderGumballConnector(
            gumballBuffers.scaleConnector,
            gumballTransforms.yAxis,
            GUMBALL_AXIS_COLORS.y
          );
          renderGumballConnector(
            gumballBuffers.scaleConnector,
            gumballTransforms.zAxis,
            GUMBALL_AXIS_COLORS.z
          );
        }

        const gumballEdgeOpacities: [number, number, number] = [
          Math.min(
            1,
            VIEW_STYLE.edgeTertiaryOpacity * edgeOpacityScale * edgeInternalScale
          ) * gumballOpacityScale,
          Math.min(1, VIEW_STYLE.edgeSecondaryOpacity * edgeOpacityScale) *
            gumballOpacityScale,
          Math.min(1, VIEW_STYLE.edgePrimaryOpacity * edgeOpacityScale) *
            gumballOpacityScale,
        ];
        const renderGumballEdges = (
          buffers: GeometryBuffer[] | undefined,
          modelMatrix: Float32Array,
          baseColor: [number, number, number],
          opacityScale = 1
        ) => {
          if (gumballSolid) return;
          if (!buffers || buffers.length === 0) return;
          const edgeBase = darkenColor(baseColor, 0.28);
          const edgeInternalColor = mixColor(edgeBase, [1, 1, 1], 0.25);
          const edgeCreaseColor = edgeBase;
          const edgeSilhouetteColor = darkenColor(edgeBase, 0.18);
          const scaledOpacities: [number, number, number] = [
            gumballEdgeOpacities[0] * opacityScale,
            gumballEdgeOpacities[1] * opacityScale,
            gumballEdgeOpacities[2] * opacityScale,
          ];
          buffers.forEach((buffer) => {
            renderer.renderEdgeLines(
              buffer,
              cameraPayload,
              {
                modelMatrix,
                resolution: [canvas.width, canvas.height],
                edgeWidths: [
                  edgeTertiaryWidth,
                  edgeSecondaryWidth,
                  edgePrimaryWidth * 1.1,
                ],
                edgeOpacities: scaledOpacities,
                edgeColorInternal: edgeInternalColor,
                edgeColorCrease: edgeCreaseColor,
                edgeColorSilhouette: edgeSilhouetteColor,
                depthBias: edgeDepthBias,
                edgeAAStrength,
                edgePixelSnap,
              },
              {
                depthFunc: "lequal",
                depthMask: false,
                blend: true,
              }
            );
          });
        };

        if (showMove) {
          renderGumballEdges(
            gumballBuffers.axisEdgeLines,
            gumballTransforms.xAxis,
            GUMBALL_AXIS_COLORS.x
          );
          renderGumballEdges(
            gumballBuffers.axisEdgeLines,
            gumballTransforms.yAxis,
            GUMBALL_AXIS_COLORS.y
          );
          renderGumballEdges(
            gumballBuffers.axisEdgeLines,
            gumballTransforms.zAxis,
            GUMBALL_AXIS_COLORS.z
          );
          renderGumballEdges(
            gumballBuffers.planeEdgeLines,
            gumballTransforms.xy,
            GUMBALL_PLANE_COLORS.xy,
            0.85
          );
          renderGumballEdges(
            gumballBuffers.planeEdgeLines,
            gumballTransforms.yz,
            GUMBALL_PLANE_COLORS.yz,
            0.85
          );
          renderGumballEdges(
            gumballBuffers.planeEdgeLines,
            gumballTransforms.xz,
            GUMBALL_PLANE_COLORS.xz,
            0.85
          );
        }
        if (showRotate) {
          renderGumballEdges(
            gumballBuffers.ringEdgeLines,
            gumballTransforms.rotateX,
            GUMBALL_AXIS_COLORS.x
          );
          renderGumballEdges(
            gumballBuffers.ringEdgeLines,
            gumballTransforms.rotateY,
            GUMBALL_AXIS_COLORS.y
          );
          renderGumballEdges(
            gumballBuffers.ringEdgeLines,
            gumballTransforms.rotateZ,
            GUMBALL_AXIS_COLORS.z
          );
        }
        if (showScale) {
          renderGumballEdges(
            gumballBuffers.scaleEdgeLines,
            gumballTransforms.scaleX,
            GUMBALL_AXIS_COLORS.x
          );
          renderGumballEdges(
            gumballBuffers.scaleEdgeLines,
            gumballTransforms.scaleY,
            GUMBALL_AXIS_COLORS.y
          );
          renderGumballEdges(
            gumballBuffers.scaleEdgeLines,
            gumballTransforms.scaleZ,
            GUMBALL_AXIS_COLORS.z
          );
          renderGumballEdges(
            gumballBuffers.scaleEdgeLines,
            gumballTransforms.scaleUniform,
            GUMBALL_UNIFORM_SCALE_COLOR
          );
        }
        renderGumballEdges(
          gumballBuffers.scaleCenterEdgeLines,
          gumballTransforms.pivot,
          GUMBALL_UNIFORM_SCALE_COLOR,
          0.9
        );

        if (gumballState.mode === "gumball" && extrudeHandles.length > 0) {
          const primaryHandle = extrudeHandles[0];
          if (primaryHandle) {
            const average = extrudeHandles.reduce(
              (acc, handle) => add(acc, handle.normal),
              { x: 0, y: 0, z: 0 }
            );
            const axis = length(average) > 1e-6 ? normalize(average) : primaryHandle.normal;
            const extrudeOffset = GUMBALL_METRICS.extrudeHandleOffset * widgetState.scale;
            const proxyCenter = add(widgetState.center, scale(axis, extrudeOffset));
            const basis = buildBasisFromNormal(axis);
            const modelMatrix = buildModelMatrix(
              basis,
              proxyCenter,
              widgetState.scale * 0.28
            );
            const isActive = gumballDragRef.current?.handle.kind === "extrude";
            const isHover = Boolean(extrudeHoverRef.current);
            const color = isActive || isHover ? gumballHighlight : [0.94, 0.94, 0.94];
            const connectorColor = color ?? [0.94, 0.94, 0.94];
            const connectorMatrix = buildModelMatrix(
              basis,
              widgetState.center,
              widgetState.scale
            );
            renderGumballConnector(
              gumballBuffers.extrudeConnector,
              connectorMatrix,
              connectorColor,
              0.9
            );
            renderer.renderGeometry(gumballBuffers.scale, cameraPayload, {
              modelMatrix,
              materialColor: color,
              lightPosition: VIEW_STYLE.lightPosition,
              lightColor: VIEW_STYLE.light,
              ambientColor: VIEW_STYLE.ambient,
              ambientStrength: VIEW_STYLE.ambientStrength,
              sheenIntensity: viewSettingsRef.current.sheen ?? 0.08,
              opacity: 0.95 * gumballOpacityScale,
            });
            renderGumballEdges(
              gumballBuffers.scaleEdgeLines,
              modelMatrix,
              color,
              0.9
            );
          }
        }
      }

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const axisLabelColors: Record<"x" | "y" | "z", string> = {
    x: "#e26161",
    y: "#5bbf76",
    z: "#5b86d6",
  };

  const canvasRect = canvasRef.current?.getBoundingClientRect() ?? null;
  const overlayCamera = canvasRect
    ? toCamera({
        position: camera.position,
        target: camera.target,
        up: camera.up,
        fov: camera.fov,
        aspect: canvasRect.width / Math.max(canvasRect.height, 1),
      })
    : null;
  const overlayViewProjection =
    overlayCamera && canvasRect
      ? multiplyMatrices(
          computeProjectionMatrix(overlayCamera),
          computeViewMatrix(overlayCamera)
        )
      : null;
  const snapScreen =
    snapIndicator && overlayViewProjection && canvasRect
      ? projectPointToScreen(snapIndicator.point, overlayViewProjection, canvasRect)
      : null;
  const gumballScreen =
    isGizmoVisible && overlayViewProjection && canvasRect
      ? projectPointToScreen(resolvedPivot, overlayViewProjection, canvasRect)
      : null;
  const anchorLinkedNodes = useMemo(() => {
    const linked = new Set<string>();
    workflowEdges.forEach((edge) => {
      if (edge.targetHandle === "anchor") {
        linked.add(edge.target);
      }
    });
    return linked;
  }, [workflowEdges]);
  const annotationOverlays =
    overlayViewProjection && canvasRect
      ? workflowNodes.flatMap((node) => {
          if (node.type !== "annotations") return [];
          const outputs = node.data?.outputs ?? {};
          const annotation = outputs.annotation as
            | { geometry?: unknown; anchor?: unknown; text?: unknown; size?: unknown }
            | undefined;
          const geometryId =
            typeof outputs.geometry === "string"
              ? outputs.geometry
              : typeof annotation?.geometry === "string"
                ? annotation.geometry
                : null;
          const outputAnchor = isVec3(outputs.anchor)
            ? outputs.anchor
            : isVec3(annotation?.anchor)
              ? annotation?.anchor
              : null;
          const hasAnchorInput = anchorLinkedNodes.has(node.id);
          let anchor = outputAnchor;
          if (
            (!anchor || (!hasAnchorInput && isZeroVec3(anchor))) &&
            geometryId &&
            geometryBoundsMap.has(geometryId)
          ) {
            const bounds = geometryBoundsMap.get(geometryId);
            if (bounds) {
              anchor = {
                x: (bounds.min.x + bounds.max.x) * 0.5,
                y: (bounds.min.y + bounds.max.y) * 0.5,
                z: (bounds.min.z + bounds.max.z) * 0.5,
              };
            }
          }
          if (!anchor) return [];
          const text =
            typeof outputs.text === "string"
              ? outputs.text
              : typeof annotation?.text === "string"
                ? annotation.text
                : "Annotation";
          if (String(text).trim().length === 0) return [];
          const size =
            typeof outputs.size === "number"
              ? outputs.size
              : typeof annotation?.size === "number"
                ? annotation.size
                : 1;
          const screen = projectPointToScreen(anchor, overlayViewProjection, canvasRect);
          if (!screen) return [];
          return [
            {
              id: node.id,
              x: screen.x,
              y: screen.y,
              depth: screen.depth,
              text,
              size,
            },
          ];
        })
      : [];
  const dimensionOverlays =
    overlayViewProjection && canvasRect
      ? workflowNodes.flatMap((node) => {
          if (node.type !== "dimensions") return [];
          const outputs = node.data?.outputs ?? {};
          const min = outputs.boundsMin;
          const max = outputs.boundsMax;
          if (!isVec3(min) || !isVec3(max)) return [];
          const width =
            typeof outputs.width === "number" ? outputs.width : max.x - min.x;
          const height =
            typeof outputs.height === "number" ? outputs.height : max.y - min.y;
          const depthValue =
            typeof outputs.depth === "number" ? outputs.depth : max.z - min.z;
          if (
            !Number.isFinite(width) ||
            !Number.isFinite(height) ||
            !Number.isFinite(depthValue)
          ) {
            return [];
          }
          const hasDimension =
            Math.abs(width) > 1e-6 ||
            Math.abs(height) > 1e-6 ||
            Math.abs(depthValue) > 1e-6;
          if (!hasDimension) return [];
          const center = {
            x: (min.x + max.x) * 0.5,
            y: (min.y + max.y) * 0.5,
            z: (min.z + max.z) * 0.5,
          };
          const screen = projectPointToScreen(center, overlayViewProjection, canvasRect);
          if (!screen) return [];
          return [
            {
              id: node.id,
              x: screen.x,
              y: screen.y,
              depth: screen.depth,
              width,
              height,
              depthValue,
            },
          ];
        })
      : [];
  const orientationBadge =
    transformOrientation === "world"
      ? "W"
      : transformOrientation === "local"
        ? "L"
        : transformOrientation === "view"
          ? "V"
          : "C";
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
        onContextMenu={(event) => event.preventDefault()}
      />
      {snapIndicator && snapScreen && (
        <div
          style={{
            position: "absolute",
            left: snapScreen.x - 5,
            top: snapScreen.y - 5,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: SNAP_COLORS[snapIndicator.type] ?? "#fdfdfc",
            border: "1px solid rgba(0, 0, 0, 0.35)",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
      )}
      {viewSettings.showPointPickDebug && pointHoverDebug && (
        <>
          <div
            style={{
              position: "absolute",
              left: pointHoverDebug.screen.x - POINT_HANDLE_PICK_RADIUS_PX,
              top: pointHoverDebug.screen.y - POINT_HANDLE_PICK_RADIUS_PX,
              width: POINT_HANDLE_PICK_RADIUS_PX * 2,
              height: POINT_HANDLE_PICK_RADIUS_PX * 2,
              borderRadius: "50%",
              border: "1px dashed rgba(0, 0, 0, 0.65)",
              boxShadow: "0 0 0 1px rgba(255, 210, 96, 0.35)",
              pointerEvents: "none",
              zIndex: 5,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: pointHoverDebug.screen.x + POINT_HANDLE_PICK_RADIUS_PX + 6,
              top: pointHoverDebug.screen.y - POINT_HANDLE_PICK_RADIUS_PX - 6,
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(24, 22, 20, 0.86)",
              border: "1px solid rgba(0, 0, 0, 0.4)",
              color: "#f7f3ea",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.04em",
              pointerEvents: "none",
              zIndex: 6,
            }}
          >
            {pointHoverDebug.id}
          </div>
        </>
      )}
      {gumballScreen && (
        <div
          style={{
            position: "absolute",
            left: gumballScreen.x + 12,
            top: gumballScreen.y - 12,
            padding: "2px 6px",
            borderRadius: 4,
            background: "rgba(250, 246, 240, 0.9)",
            border: "1px solid rgba(0, 0, 0, 0.2)",
            color: "#2b2620",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          {orientationBadge}
        </div>
      )}
      {gumballPrompt && (
        <div
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            padding: "4px 8px",
            borderRadius: 4,
            background: "rgba(24, 22, 20, 0.86)",
            border: "1px solid rgba(0, 0, 0, 0.35)",
            color: "#f7f3ea",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            opacity: gumballPrompt.visible ? 1 : 0,
            transform: gumballPrompt.visible ? "translateY(0)" : "translateY(-4px)",
            transition: "opacity 220ms ease, transform 220ms ease",
            pointerEvents: "none",
            zIndex: 3,
          }}
        >
          {gumballPrompt.text}
        </div>
      )}
      {annotationOverlays.map((item) => {
        const size = Number.isFinite(item.size) ? item.size : 1;
        const fontSize = Math.max(10, Math.min(16, 10 + size * 2));
        const dotSize = Math.max(5, Math.min(10, 4 + size * 1.6));
        return (
          <div
            key={item.id}
            style={{
              position: "absolute",
              left: item.x,
              top: item.y,
              transform: "translate(-50%, -100%)",
              pointerEvents: "none",
              zIndex: 4,
            }}
          >
            <div
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: "50%",
                background: "#fdfbf6",
                border: "1px solid rgba(0, 0, 0, 0.35)",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
                margin: "0 auto",
              }}
            />
            <div
              style={{
                marginTop: 6,
                padding: "6px 8px",
                borderRadius: 6,
                background: "rgba(252, 249, 244, 0.95)",
                border: "1px solid rgba(0, 0, 0, 0.18)",
                boxShadow: "0 8px 16px rgba(0, 0, 0, 0.18)",
                color: "#2b2620",
                fontSize,
                fontWeight: 600,
                whiteSpace: "pre-line",
                maxWidth: 240,
              }}
            >
              {String(item.text ?? "")}
            </div>
          </div>
        );
      })}
      {dimensionOverlays.map((item) => (
        <div
          key={item.id}
          style={{
            position: "absolute",
            left: item.x,
            top: item.y,
            transform: "translate(-50%, -100%)",
            pointerEvents: "none",
            zIndex: 4,
          }}
        >
          <div
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              background: "rgba(24, 22, 20, 0.86)",
              border: "1px solid rgba(0, 0, 0, 0.4)",
              color: "#f7f3ea",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              display: "flex",
              gap: 8,
              boxShadow: "0 8px 18px rgba(0, 0, 0, 0.24)",
            }}
          >
            <span>W {formatDimensionValue(item.width)}</span>
            <span>H {formatDimensionValue(item.height)}</span>
            <span>D {formatDimensionValue(item.depthValue)}</span>
          </div>
        </div>
      ))}
      {transformInputs && (
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            padding: "10px 12px",
            borderRadius: 6,
            background: "rgba(252, 249, 244, 0.96)",
            border: "1px solid rgba(0, 0, 0, 0.12)",
            boxShadow: "0 10px 24px rgba(0, 0, 0, 0.14)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            fontSize: 12,
            color: "#2b2620",
            pointerEvents: "auto",
            zIndex: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 11 }}>
              {transformInputs.mode}
            </span>
            {transformInputs.mode === "rotate" && (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => nudgeRotateInput(-15)}
                  style={{
                    borderRadius: 4,
                    border: "1px solid rgba(0, 0, 0, 0.2)",
                    background: "#f1ece4",
                    padding: "2px 6px",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  -15°
                </button>
                <button
                  type="button"
                  onClick={() => nudgeRotateInput(15)}
                  style={{
                    borderRadius: 4,
                    border: "1px solid rgba(0, 0, 0, 0.2)",
                    background: "#f1ece4",
                    padding: "2px 6px",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  +15°
                </button>
                <button
                  type="button"
                  onClick={() => nudgeRotateInput(45)}
                  style={{
                    borderRadius: 4,
                    border: "1px solid rgba(0, 0, 0, 0.2)",
                    background: "#f1ece4",
                    padding: "2px 6px",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  +45°
                </button>
              </div>
            )}
          </div>
          {transformInputs.mode === "move" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {(["x", "y", "z"] as const).map((axis) => (
                <label
                  key={axis}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: axisLabelColors[axis], fontWeight: 700 }}>
                    {axis.toUpperCase()}
                  </span>
                  <input
                    ref={(el) => {
                      transformFieldRefs.current[axis] = el;
                    }}
                    value={transformInputs[axis] ?? ""}
                    onChange={(event) =>
                      applyMoveInput({ [axis]: event.target.value } as Partial<TransformInputState>)
                    }
                    onFocus={() => {
                      transformInputEditingRef.current = true;
                    }}
                    onBlur={() => {
                      transformInputEditingRef.current = false;
                    }}
                    onKeyDown={(event) => handleTransformFieldKeyDown(axis, event)}
                    style={{
                      width: 64,
                      padding: "4px 6px",
                      borderRadius: 4,
                      border: "1px solid rgba(0, 0, 0, 0.2)",
                      background: "#fff",
                      color: "#2b2620",
                      fontSize: 12,
                    }}
                  />
                </label>
              ))}
            </div>
          )}
          {transformInputs.mode === "rotate" && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <span style={{ fontWeight: 700 }}>Angle</span>
              <input
                ref={(el) => {
                  transformFieldRefs.current.angle = el;
                }}
                value={transformInputs.angle ?? ""}
                onChange={(event) => applyRotateInput({ angle: event.target.value })}
                onFocus={() => {
                  transformInputEditingRef.current = true;
                }}
                onBlur={() => {
                  transformInputEditingRef.current = false;
                }}
                onKeyDown={(event) => handleTransformFieldKeyDown("angle", event)}
                style={{
                  width: 72,
                  padding: "4px 6px",
                  borderRadius: 4,
                  border: "1px solid rgba(0, 0, 0, 0.2)",
                  background: "#fff",
                  color: "#2b2620",
                  fontSize: 12,
                }}
              />
              <span style={{ fontSize: 11 }}>deg</span>
            </label>
          )}
          {transformInputs.mode === "scale" && transformInputs.scaleMode === "uniform" && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <span style={{ fontWeight: 700 }}>Scale</span>
              <input
                ref={(el) => {
                  transformFieldRefs.current.scale = el;
                }}
                value={transformInputs.scale ?? ""}
                onChange={(event) => applyScaleInput({ scale: event.target.value })}
                onFocus={() => {
                  transformInputEditingRef.current = true;
                }}
                onBlur={() => {
                  transformInputEditingRef.current = false;
                }}
                onKeyDown={(event) => handleTransformFieldKeyDown("scale", event)}
                style={{
                  width: 72,
                  padding: "4px 6px",
                  borderRadius: 4,
                  border: "1px solid rgba(0, 0, 0, 0.2)",
                  background: "#fff",
                  color: "#2b2620",
                  fontSize: 12,
                }}
              />
            </label>
          )}
          {transformInputs.mode === "scale" && transformInputs.scaleMode !== "uniform" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {(["x", "y", "z"] as const).map((axis) => {
                const isActive = transformInputs.scaleAxis === axis;
                return (
                  <label
                    key={axis}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                    }}
                  >
                    <span style={{ color: axisLabelColors[axis], fontWeight: 700 }}>
                      {axis.toUpperCase()}
                    </span>
                    <input
                      ref={(el) => {
                      transformFieldRefs.current[axis] = el;
                    }}
                    value={transformInputs[axis] ?? ""}
                      onChange={(event) =>
                        applyScaleInput(
                          { [axis]: event.target.value } as Partial<TransformInputState>
                        )
                      }
                      onFocus={() => {
                        transformInputEditingRef.current = true;
                      }}
                      onBlur={() => {
                        transformInputEditingRef.current = false;
                      }}
                      onKeyDown={(event) => handleTransformFieldKeyDown(axis, event)}
                      style={{
                        width: 64,
                        padding: "4px 6px",
                        borderRadius: 4,
                        border: isActive
                          ? `2px solid ${axisLabelColors[axis]}`
                          : "1px solid rgba(0, 0, 0, 0.2)",
                        background: "#fff",
                        color: "#2b2620",
                        fontSize: 12,
                      }}
                    />
                  </label>
                );
              })}
            </div>
          )}
          {transformInputs.mode === "extrude" && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <span style={{ fontWeight: 700 }}>Distance</span>
              <input
                ref={(el) => {
                  transformFieldRefs.current.distance = el;
                }}
                value={transformInputs.distance ?? ""}
                onChange={(event) => applyExtrudeInput({ distance: event.target.value })}
                onFocus={() => {
                  transformInputEditingRef.current = true;
                }}
                onBlur={() => {
                  transformInputEditingRef.current = false;
                }}
                onKeyDown={(event) => handleTransformFieldKeyDown("distance", event)}
                style={{
                  width: 80,
                  padding: "4px 6px",
                  borderRadius: 4,
                  border: "1px solid rgba(0, 0, 0, 0.2)",
                  background: "#fff",
                  color: "#2b2620",
                  fontSize: 12,
                }}
              />
            </label>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              onClick={() => setShowPivotPanel((prev) => !prev)}
              style={{
                borderRadius: 4,
                border: "1px solid rgba(0, 0, 0, 0.2)",
                background: showPivotPanel ? "#ede6db" : "#f6f1e9",
                padding: "2px 6px",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              Pivot
            </button>
            {showPivotPanel && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {(["x", "y", "z"] as const).map((axis) => (
                  <label
                    key={`pivot-${axis}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                    }}
                  >
                    <span style={{ color: axisLabelColors[axis], fontWeight: 700 }}>
                      {axis.toUpperCase()}
                    </span>
                    <input
                      value={pivotInputs[axis]}
                      onChange={(event) =>
                        applyPivotInput(
                          { [axis]: event.target.value } as Partial<{
                            x: string;
                            y: string;
                            z: string;
                          }>
                        )
                      }
                      onFocus={() => {
                        pivotInputEditingRef.current = true;
                      }}
                      onBlur={() => {
                        pivotInputEditingRef.current = false;
                      }}
                      style={{
                        width: 64,
                        padding: "4px 6px",
                        borderRadius: 4,
                        border: "1px solid rgba(0, 0, 0, 0.2)",
                        background: "#fff",
                        color: "#2b2620",
                        fontSize: 12,
                      }}
                    />
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => setPivotPreset("centroid")}
                  style={{
                    borderRadius: 4,
                    border: "1px solid rgba(0, 0, 0, 0.2)",
                    background: "#f1ece4",
                    padding: "2px 6px",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  Centroid
                </button>
                <button
                  type="button"
                  onClick={() => setPivotPreset("origin")}
                  style={{
                    borderRadius: 4,
                    border: "1px solid rgba(0, 0, 0, 0.2)",
                    background: "#f1ece4",
                    padding: "2px 6px",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  Origin
                </button>
                <button
                  type="button"
                  onClick={() => setPivotPreset("bbox")}
                  style={{
                    borderRadius: 4,
                    border: "1px solid rgba(0, 0, 0, 0.2)",
                    background: "#f1ece4",
                    padding: "2px 6px",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  BBox
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {selectionBox && (
        <div
          style={{
            position: "absolute",
            left: selectionBox.x,
            top: selectionBox.y,
            width: selectionBox.width,
            height: selectionBox.height,
            border: "1.5px solid rgba(9, 92, 138, 0.95)",
            background: "rgba(24, 156, 226, 0.16)",
            boxShadow: "2px 4px 0 rgba(0, 0, 0, 0.24)",
            borderRadius: 4,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
};

export default WebGLViewerCanvas;
