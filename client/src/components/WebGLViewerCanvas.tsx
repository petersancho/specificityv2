import { useEffect, useMemo, useRef, useState } from "react";
import { useProjectStore } from "../store/useProjectStore";
import { GeometryRenderAdapter, createLineBufferData } from "../geometry/renderAdapter";
import { computeArcPolyline } from "../geometry/arc";
import { interpolatePolyline } from "../geometry/curves";
import {
  add,
  centroid,
  computeBestFitPlane,
  cross,
  dot,
  length,
  normalize,
  scale,
  sub,
} from "../geometry/math";
import { basisFromPlane, type Basis, WORLD_BASIS } from "../geometry/transform";
import {
  generateBoxMesh,
  generateCylinderMesh,
  generateSphereMesh,
  generateTorusMesh,
} from "../geometry/mesh";
import { WebGLRenderer, type Camera } from "../webgl/WebGLRenderer";
import type {
  ComponentSelection,
  Geometry,
  RenderMesh,
  TransformMode,
  Vec3,
  VertexGeometry,
} from "../types";
import type { GeometryBuffer } from "../webgl/BufferManager";

const ORBIT_SPEED = 0.006;
const PAN_SPEED = 0.0025;
const ZOOM_SPEED = 0.001;
const MIN_DISTANCE = 0.4;
const MAX_DISTANCE = 120;
const GRID_EXTENT_MULTIPLIER = 60;
const GRID_MINOR_STEP = 1;
const GRID_OFFSET_Y = -0.002;
const SELECTION_DRAG_THRESHOLD = 6;
const PICK_PIXEL_THRESHOLD = 16;
const EDGE_PIXEL_THRESHOLD = 12;
const PREVIEW_LINE_ID = "__preview-line";
const PREVIEW_MESH_ID = "__preview-mesh";
const PREVIEW_EDGE_ID = "__preview-mesh-edges";

const VIEW_STYLE = {
  clearColor: [0, 0, 0, 0] as [number, number, number, number],
  mesh: [0.06, 0.56, 0.6] as [number, number, number],
  edge: [0.06, 0.06, 0.06] as [number, number, number],
  hiddenEdge: [0.1, 0.1, 0.1] as [number, number, number],
  selection: [0.2, 0.14, 0.05] as [number, number, number],
  ambient: [0.62, 0.64, 0.62] as [number, number, number],
  light: [0.74, 0.76, 0.74] as [number, number, number],
  lightPosition: [12, 18, 10] as [number, number, number],
  ghostedOpacity: 0.22,
  hiddenEdgeOpacity: 0.45,
  dashScale: 0.045,
  gridMinor: [0.73, 0.76, 0.73] as [number, number, number],
  gridMajor: [0.58, 0.62, 0.58] as [number, number, number],
};

type PrimitiveKind = "box" | "sphere" | "cylinder" | "torus";

type PrimitiveSettings = {
  kind: PrimitiveKind;
  size: number;
  radius: number;
  height: number;
  tube: number;
  radialSegments: number;
  tubularSegments: number;
};

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
};

const DEFAULT_PRIMITIVE_SETTINGS: PrimitiveSettings = {
  kind: "box",
  size: 1,
  radius: 0.5,
  height: 1,
  tube: 0.2,
  radialSegments: 24,
  tubularSegments: 36,
};

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
};

type ViewerCanvasProps = {
  activeCommandId?: string | null;
  commandRequest?: { id: string; input: string; requestId: number } | null;
  primitiveSettings?: unknown;
  rectangleSettings?: unknown;
  circleSettings?: unknown;
  onCommandComplete?: (commandId: string) => void;
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
};

type PickResult =
  | { kind: "object"; geometryId: string; depth: number; point: Vec3 | null }
  | { kind: "component"; selection: ComponentSelection; depth: number; point: Vec3 | null };

type GumballMode = TransformMode | "gumball";

type GumballState = {
  selectionPoints: Vec3[];
  orientation: Basis;
  pivot: Vec3;
  mode: GumballMode | null;
  visible: boolean;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

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

const distancePointToSegment2d = (
  point: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
) => {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const denom = abx * abx + aby * aby;
  if (denom <= 1e-12) {
    const dx = point.x - a.x;
    const dy = point.y - a.y;
    return Math.hypot(dx, dy);
  }
  const t = clamp(((point.x - a.x) * abx + (point.y - a.y) * aby) / denom, 0, 1);
  const px = a.x + abx * t;
  const py = a.y + aby * t;
  return Math.hypot(point.x - px, point.y - py);
};

const normalizeRect = (start: { x: number; y: number }, end: { x: number; y: number }) => {
  const x0 = Math.min(start.x, end.x);
  const y0 = Math.min(start.y, end.y);
  const x1 = Math.max(start.x, end.x);
  const y1 = Math.max(start.y, end.y);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
};

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
  const point = add(ray.origin, scale(ray.dir, t));
  return { t, point };
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
  const { activeCommandId = null, commandRequest = null } = _props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const adapterRef = useRef<GeometryRenderAdapter | null>(null);
  const geometryRef = useRef<Geometry[]>([]);
  const cameraRef = useRef(useProjectStore.getState().camera);
  const selectionRef = useRef(useProjectStore.getState().selectedGeometryIds);
  const hiddenRef = useRef(useProjectStore.getState().hiddenGeometryIds);
  const viewSettingsRef = useRef(useProjectStore.getState().viewSettings);
  const displayModeRef = useRef(useProjectStore.getState().displayMode);
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
  const lastCommandRequestIdRef = useRef<number | null>(null);
  const activeCommandIdRef = useRef<string | null>(activeCommandId);
  const componentSelectionRef = useRef(useProjectStore.getState().componentSelection);
  const lockedRef = useRef(useProjectStore.getState().lockedGeometryIds);
  const cPlaneRef = useRef(useProjectStore.getState().cPlane);
  const pivotRef = useRef(useProjectStore.getState().pivot);
  const snapSettingsRef = useRef(useProjectStore.getState().snapSettings);
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
  const [selectionBox, setSelectionBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const geometry = useProjectStore((state) => state.geometry);
  const camera = useProjectStore((state) => state.camera);
  const selectedGeometryIds = useProjectStore((state) => state.selectedGeometryIds);
  const hiddenGeometryIds = useProjectStore((state) => state.hiddenGeometryIds);
  const lockedGeometryIds = useProjectStore((state) => state.lockedGeometryIds);
  const viewSettings = useProjectStore((state) => state.viewSettings);
  const gridSettings = useProjectStore((state) => state.gridSettings);
  const snapSettings = useProjectStore((state) => state.snapSettings);
  const displayMode = useProjectStore((state) => state.displayMode);
  const selectionMode = useProjectStore((state) => state.selectionMode);
  const componentSelection = useProjectStore((state) => state.componentSelection);
  const transformOrientation = useProjectStore((state) => state.transformOrientation);
  const cPlane = useProjectStore((state) => state.cPlane);
  const pivot = useProjectStore((state) => state.pivot);
  const setCameraState = useProjectStore((state) => state.setCameraState);
  const setPivotPickedPosition = useProjectStore((state) => state.setPivotPickedPosition);
  const setPivotCursorPosition = useProjectStore((state) => state.setPivotCursorPosition);
  const addGeometryPoint = useProjectStore((state) => state.addGeometryPoint);
  const addGeometryPolylineFromPoints = useProjectStore(
    (state) => state.addGeometryPolylineFromPoints
  );
  const addGeometryBox = useProjectStore((state) => state.addGeometryBox);
  const addGeometrySphere = useProjectStore((state) => state.addGeometrySphere);
  const addGeometryMesh = useProjectStore((state) => state.addGeometryMesh);

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

  const vertexItems = useMemo(
    () => geometry.filter((item): item is VertexGeometry => item.type === "vertex"),
    [geometry]
  );
  const vertexMap = useMemo(
    () => new Map(vertexItems.map((item) => [item.id, item])),
    [vertexItems]
  );
  const referencedVertexIds = useMemo(() => {
    const ids = new Set<string>();
    geometry.forEach((item) => {
      if (item.type === "polyline") {
        item.vertexIds.forEach((id) => ids.add(id));
      }
    });
    return ids;
  }, [geometry]);
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
  }, [componentSelection, geometry, selectedGeometryIds, vertexMap]);
  const selectionPlane = useMemo(
    () => computeBestFitPlane(selectionPoints),
    [selectionPoints]
  );
  const orientationBasis = useMemo(() => {
    if (transformOrientation === "world") return WORLD_BASIS;
    if (transformOrientation === "cplane") return basisFromPlane(cPlane);
    const primaryId = selectedGeometryIds[selectedGeometryIds.length - 1];
    const primary = geometry.find((item) => item.id === primaryId);
    if (primary && "plane" in primary && primary.plane) {
      return basisFromPlane(primary.plane);
    }
    return basisFromPlane(selectionPlane);
  }, [transformOrientation, cPlane, geometry, selectedGeometryIds, selectionPlane]);
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
      if (item.type === "vertex") {
        includePoint(item.position);
        return;
      }
      if (item.type === "polyline") {
        item.vertexIds.forEach((vertexId) => {
          const vertex = vertexMap.get(vertexId);
          if (vertex) includePoint(vertex.position);
        });
        return;
      }
      if ("mesh" in item) {
        for (let i = 0; i < item.mesh.positions.length; i += 3) {
          includePoint({
            x: item.mesh.positions[i],
            y: item.mesh.positions[i + 1],
            z: item.mesh.positions[i + 2],
          });
        }
      }
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

    if (item.type === "vertex") {
      includePoint(item.position);
    } else if (item.type === "polyline") {
      item.vertexIds.forEach((vertexId) => {
        const vertex = vertexMap.get(vertexId);
        if (vertex) includePoint(vertex.position);
      });
    } else if ("mesh" in item) {
      for (let i = 0; i < item.mesh.positions.length; i += 3) {
        includePoint({
          x: item.mesh.positions[i],
          y: item.mesh.positions[i + 1],
          z: item.mesh.positions[i + 2],
        });
      }
    }

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
    setCameraState({ position: nextPosition, target: center });
  };

  const clampNonZero = (value: number, fallback: number) => {
    if (!Number.isFinite(value)) return fallback;
    if (Math.abs(value) < 1e-6) return fallback;
    return value;
  };

  const safeAxis = (axis: Vec3, fallback: Vec3) =>
    length(axis) > 1e-6 ? normalize(axis) : fallback;

  const intersectRayWithPlane = (ray: Ray, planeOrigin: Vec3, planeNormal: Vec3) => {
    const denom = dot(planeNormal, ray.dir);
    if (Math.abs(denom) < 1e-6) return null;
    const t = dot(planeNormal, sub(planeOrigin, ray.origin)) / denom;
    if (t < 0) return null;
    return add(ray.origin, scale(ray.dir, t));
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

  const buildPrimitiveMesh = (origin: Vec3, scalarOverride?: number) => {
    const config = primitiveConfigRef.current;
    const radialSegments = Math.max(8, Math.round(config.radialSegments));
    const tubularSegments = Math.max(12, Math.round(config.tubularSegments));
    const boxSegments = Math.max(1, Math.round(radialSegments / 12));

    if (config.kind === "sphere") {
      const radius = Math.max(
        0.08,
        scalarOverride ?? clampNonZero(config.radius, DEFAULT_PRIMITIVE_SETTINGS.radius)
      );
      const mesh = transformMeshToPlane(generateSphereMesh(radius, radialSegments), origin);
      return {
        mesh,
        metadata: {
          primitive: { kind: "sphere", origin, radius },
        },
      };
    }

    if (config.kind === "cylinder") {
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
      const mesh = transformMeshToPlane(
        generateCylinderMesh(radius, height, radialSegments),
        origin
      );
      return {
        mesh,
        metadata: {
          primitive: { kind: "cylinder", origin, radius, height },
        },
      };
    }

    if (config.kind === "torus") {
      const radius = Math.max(
        0.12,
        scalarOverride ?? clampNonZero(config.radius, DEFAULT_PRIMITIVE_SETTINGS.radius)
      );
      const tube = Math.max(
        0.04,
        scalarOverride
          ? Math.max(radius * 0.35, 0.04)
          : clampNonZero(config.tube, DEFAULT_PRIMITIVE_SETTINGS.tube)
      );
      const mesh = transformMeshToPlane(
        generateTorusMesh(radius, tube, radialSegments, tubularSegments),
        origin
      );
      return {
        mesh,
        metadata: {
          primitive: { kind: "torus", origin, radius, tube },
        },
      };
    }

    const halfSize = Math.max(
      0.08,
      scalarOverride ?? clampNonZero(config.size, DEFAULT_PRIMITIVE_SETTINGS.size) * 0.5
    );
    const size = halfSize * 2;
    const mesh = transformMeshToPlane(
      generateBoxMesh({ width: size, height: size, depth: size }, boxSegments),
      origin
    );
    return {
      mesh,
      metadata: {
        primitive: {
          kind: "box",
          origin,
          dimensions: { width: size, height: size, depth: size },
        },
      },
    };
  };

  const createPrimitiveAt = (origin: Vec3, scalarOverride?: number) => {
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
    curveConfigRef.current = next;
  };

  const computeCurvePoints = (points: Vec3[]) => {
    if (points.length < 2) return points;
    const config = curveConfigRef.current;
    const resolution = Math.max(16, Math.round(config.resolution));
    return interpolatePolyline(points, config.degree, config.closed, resolution);
  };

  const appendCurvePoint = (point: Vec3) => {
    curvePointsRef.current = [...curvePointsRef.current, point];
  };

  const commitCurve = () => {
    if (curvePointsRef.current.length >= 2) {
      const config = curveConfigRef.current;
      const curvePoints = computeCurvePoints(curvePointsRef.current);
      addGeometryPolylineFromPoints(curvePoints, {
        closed: config.closed,
        degree: config.degree,
      });
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
      return { points: [start, end] as Vec3[] };
    }
    return { points: arcPoints };
  };

  const createArcFromPoints = (start: Vec3, end: Vec3, through: Vec3) => {
    const arc = computeArcFromPoints(start, end, through);
    addGeometryPolylineFromPoints(arc.points, { closed: false, degree: 1 });
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
    return { radius, points };
  };

  const createCircleFromDrag = (center: Vec3, current: Vec3) => {
    const circle = computeCircleFromDrag(center, current);
    addGeometryPolylineFromPoints(circle.points, { closed: true, degree: 1 });
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
      setSelectionState([selection.geometryId], [selection]);
      return;
    }
    const current = componentSelectionRef.current;
    const exists = current.find((item) => isSameComponent(item, selection));
    const next = exists
      ? current.filter((item) => !isSameComponent(item, selection))
      : [...current, selection];
    const ids = new Set(selectionRef.current);
    ids.add(selection.geometryId);
    setSelectionState(Array.from(ids), next);
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

  const pickObject = (
    context: NonNullable<ReturnType<typeof getPointerContext>>
  ): PickResult | null => {
    const hidden = new Set(hiddenRef.current);
    const locked = new Set(lockedRef.current);
    const pointer = context.pointer;
    const rect = context.rect;
    const viewProjection = context.viewProjection;
    let best: PickResult | null = null;
    let bestDepth = Number.POSITIVE_INFINITY;

    const consider = (geometryId: string, depth: number, point: Vec3 | null) => {
      if (!Number.isFinite(depth)) return;
      if (depth < bestDepth) {
        bestDepth = depth;
        best = { kind: "object", geometryId, depth, point };
      }
    };

    geometry.forEach((item) => {
      if (hidden.has(item.id) || locked.has(item.id)) return;
      if (item.type === "vertex" && referencedVertexIds.has(item.id)) return;

      if (item.type === "vertex") {
        const screen = projectPointToScreen(item.position, viewProjection, rect);
        if (!screen) return;
        const distance = Math.hypot(pointer.x - screen.x, pointer.y - screen.y);
        if (distance <= PICK_PIXEL_THRESHOLD) {
          consider(item.id, screen.depth, item.position);
        }
        return;
      }

      if (item.type === "polyline") {
        const points = item.vertexIds
          .map((id) => vertexMap.get(id)?.position)
          .filter(Boolean) as Vec3[];
        if (points.length < 2) return;
        const edgePoints = item.closed ? [...points, points[0]] : points;
        let bestDistance = Number.POSITIVE_INFINITY;
        let bestDepthLocal = Number.POSITIVE_INFINITY;
        for (let i = 0; i < edgePoints.length - 1; i += 1) {
          const a = projectPointToScreen(edgePoints[i], viewProjection, rect);
          const b = projectPointToScreen(edgePoints[i + 1], viewProjection, rect);
          if (!a || !b) continue;
          const distance = distancePointToSegment2d(pointer, a, b);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestDepthLocal = Math.min(a.depth, b.depth);
          }
        }
        if (bestDistance <= PICK_PIXEL_THRESHOLD) {
          consider(item.id, bestDepthLocal, null);
        }
        return;
      }

      if (!("mesh" in item)) return;
      const mesh = item.mesh;
      const indices = mesh.indices;
      let nearestT = Number.POSITIVE_INFINITY;
      let nearestPoint: Vec3 | null = null;

      const triangleCount =
        indices.length >= 3 ? Math.floor(indices.length / 3) : Math.floor(mesh.positions.length / 9);

      for (let faceIndex = 0; faceIndex < triangleCount; faceIndex += 1) {
        const baseIndex = faceIndex * 3;
        const i0 = indices.length >= baseIndex + 3 ? indices[baseIndex] : baseIndex;
        const i1 = indices.length >= baseIndex + 3 ? indices[baseIndex + 1] : baseIndex + 1;
        const i2 = indices.length >= baseIndex + 3 ? indices[baseIndex + 2] : baseIndex + 2;
        const a = getMeshPoint(mesh, i0);
        const b = getMeshPoint(mesh, i1);
        const c = getMeshPoint(mesh, i2);
        const intersection = intersectRayTriangle(context.ray, a, b, c);
        if (!intersection) continue;
        if (intersection.t < nearestT) {
          nearestT = intersection.t;
          nearestPoint = intersection.point;
        }
      }

      if (!nearestPoint) return;
      const screen = projectPointToScreen(nearestPoint, viewProjection, rect);
      consider(item.id, screen?.depth ?? nearestT, nearestPoint);
    });

    return best;
  };

  const pickComponent = (
    context: NonNullable<ReturnType<typeof getPointerContext>>
  ): PickResult | null => {
    const hidden = new Set(hiddenRef.current);
    const locked = new Set(lockedRef.current);
    const pointer = context.pointer;
    const rect = context.rect;
    const viewProjection = context.viewProjection;
    let best: PickResult | null = null;
    let bestDepth = Number.POSITIVE_INFINITY;

    const consider = (selection: ComponentSelection, depth: number, point: Vec3 | null) => {
      if (!Number.isFinite(depth)) return;
      if (depth < bestDepth) {
        bestDepth = depth;
        best = { kind: "component", selection, depth, point };
      }
    };

    geometry.forEach((item) => {
      if (hidden.has(item.id) || locked.has(item.id)) return;

      if (item.type === "polyline") {
        const points = item.vertexIds
          .map((id) => vertexMap.get(id)?.position)
          .filter(Boolean) as Vec3[];
        if (points.length < 2) return;
        const edgePoints = item.closed ? [...points, points[0]] : points;
        const edgeVertexIds = item.closed
          ? [...item.vertexIds, item.vertexIds[0]]
          : item.vertexIds;
        let closestIndex = -1;
        let bestDistance = Number.POSITIVE_INFINITY;
        let bestDepthLocal = Number.POSITIVE_INFINITY;
        for (let i = 0; i < edgePoints.length - 1; i += 1) {
          const aScreen = projectPointToScreen(edgePoints[i], viewProjection, rect);
          const bScreen = projectPointToScreen(edgePoints[i + 1], viewProjection, rect);
          if (!aScreen || !bScreen) continue;
          const distance = distancePointToSegment2d(pointer, aScreen, bScreen);
          if (distance < bestDistance) {
            bestDistance = distance;
            closestIndex = i;
            bestDepthLocal = Math.min(aScreen.depth, bScreen.depth);
          }
        }
        if (closestIndex >= 0 && bestDistance <= PICK_PIXEL_THRESHOLD) {
          const a = edgePoints[closestIndex];
          const b = edgePoints[closestIndex + 1];
          const midpoint = scale(add(a, b), 0.5);
          consider(
            {
              kind: "edge",
              geometryId: item.id,
              edgeIndex: closestIndex,
              vertexIds: [edgeVertexIds[closestIndex], edgeVertexIds[closestIndex + 1]],
            },
            bestDepthLocal,
            midpoint
          );
        }
        return;
      }

      if (!("mesh" in item)) return;
      const mesh = item.mesh;
      const indices = mesh.indices;
      const triangleCount =
        indices.length >= 3 ? Math.floor(indices.length / 3) : Math.floor(mesh.positions.length / 9);

      let bestFaceIndex = -1;
      let bestIntersection: { t: number; point: Vec3; vertexIndices: [number, number, number] } | null =
        null;

      for (let faceIndex = 0; faceIndex < triangleCount; faceIndex += 1) {
        const baseIndex = faceIndex * 3;
        const i0 = indices.length >= baseIndex + 3 ? indices[baseIndex] : baseIndex;
        const i1 = indices.length >= baseIndex + 3 ? indices[baseIndex + 1] : baseIndex + 1;
        const i2 = indices.length >= baseIndex + 3 ? indices[baseIndex + 2] : baseIndex + 2;
        const a = getMeshPoint(mesh, i0);
        const b = getMeshPoint(mesh, i1);
        const c = getMeshPoint(mesh, i2);
        const intersection = intersectRayTriangle(context.ray, a, b, c);
        if (!intersection) continue;
        if (!bestIntersection || intersection.t < bestIntersection.t) {
          bestFaceIndex = faceIndex;
          bestIntersection = {
            t: intersection.t,
            point: intersection.point,
            vertexIndices: [i0, i1, i2],
          };
        }
      }

      if (!bestIntersection) return;
      const [i0, i1, i2] = bestIntersection.vertexIndices;
      const a = getMeshPoint(mesh, i0);
      const b = getMeshPoint(mesh, i1);
      const c = getMeshPoint(mesh, i2);
      const aScreen = projectPointToScreen(a, viewProjection, rect);
      const bScreen = projectPointToScreen(b, viewProjection, rect);
      const cScreen = projectPointToScreen(c, viewProjection, rect);
      const screenPoint = projectPointToScreen(bestIntersection.point, viewProjection, rect);
      const depth = screenPoint?.depth ?? bestIntersection.t;

      if (aScreen && bScreen && cScreen) {
        const edges = [
          {
            edge: [i0, i1] as [number, number],
            distance: distancePointToSegment2d(pointer, aScreen, bScreen),
            localIndex: 0,
          },
          {
            edge: [i1, i2] as [number, number],
            distance: distancePointToSegment2d(pointer, bScreen, cScreen),
            localIndex: 1,
          },
          {
            edge: [i2, i0] as [number, number],
            distance: distancePointToSegment2d(pointer, cScreen, aScreen),
            localIndex: 2,
          },
        ];
        edges.sort((lhs, rhs) => lhs.distance - rhs.distance);
        const closest = edges[0];
        if (closest.distance <= EDGE_PIXEL_THRESHOLD) {
          consider(
            {
              kind: "edge",
              geometryId: item.id,
              edgeIndex: bestFaceIndex * 3 + closest.localIndex,
              vertexIndices: [closest.edge[0], closest.edge[1]],
            },
            depth,
            bestIntersection.point
          );
          return;
        }
      }

      consider(
        {
          kind: "face",
          geometryId: item.id,
          faceIndex: bestFaceIndex,
          vertexIndices: [i0, i1, i2],
        },
        depth,
        bestIntersection.point
      );
    });

    return best;
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

    if (commandId === "primitive") {
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
      lineBuffer.setData({ positions: emptyFloat, nextPositions: emptyFloat, sides: emptyFloat });
      meshBuffer.setData({ positions: emptyFloat, normals: emptyFloat, indices: new Uint16Array() });
      edgeBuffer.setData({ positions: emptyFloat, indices: new Uint16Array() });
      previewDirtyRef.current = false;
      return;
    }

    if (preview.kind === "line") {
      const lineData = createLineBufferData(preview.points);
      lineBuffer.setData({
        positions: lineData.positions,
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
    lineBuffer.setData({ positions: emptyFloat, nextPositions: emptyFloat, sides: emptyFloat });
    previewDirtyRef.current = false;
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
      return selectionMode === "object" ? "gumball" : "move";
    }
    if (autoGumballActive) return "move";
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
    if (activeCommandId !== "primitive") {
      primitiveCenterRef.current = null;
    }
    selectionDragRef.current = null;
    setSelectionBox(null);
    previewStateRef.current = null;
    previewDirtyRef.current = true;
  }, [activeCommandId]);

  useEffect(() => {
    geometryRef.current = geometry;
  }, [geometry]);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    selectionRef.current = selectedGeometryIds;
  }, [selectedGeometryIds]);

  useEffect(() => {
    hiddenRef.current = hiddenGeometryIds;
  }, [hiddenGeometryIds]);

  useEffect(() => {
    viewSettingsRef.current = viewSettings;
  }, [viewSettings]);

  useEffect(() => {
    displayModeRef.current = displayMode;
  }, [displayMode]);

  useEffect(() => {
    activeCommandIdRef.current = activeCommandId;
  }, [activeCommandId]);

  useEffect(() => {
    componentSelectionRef.current = componentSelection;
  }, [componentSelection]);

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
        return;
      }
      if (lower.includes("accept") || lower.includes("finish") || lower.includes("done")) {
        commitPolyline();
        clearPreview();
      }
      return;
    }
    if (commandRequest.id === "curve") {
      const lower = commandRequest.input.toLowerCase();
      updateCurveFromInput(commandRequest.input);
      if (lower.includes("cancel")) {
        cancelCurve();
        clearPreview();
        return;
      }
      if (lower.includes("accept") || lower.includes("finish") || lower.includes("done")) {
        commitCurve();
        clearPreview();
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
        return;
      }
      if (
        pointerPoint &&
        lineStartRef.current &&
        (lower.includes("accept") || lower.includes("finish") || lower.includes("done"))
      ) {
        createLineFromDrag(lineStartRef.current, pointerPoint);
        lineStartRef.current = pointerPoint;
        refreshPreview(pointerPoint);
      }
      return;
    }

    if (commandRequest.id === "arc") {
      if (lower.includes("cancel")) {
        arcStartRef.current = null;
        arcEndRef.current = null;
        clearPreview();
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
        arcStartRef.current = end;
        arcEndRef.current = null;
        refreshPreview(pointerPoint);
      }
      return;
    }

    if (commandRequest.id === "rectangle") {
      if (lower.includes("cancel")) {
        rectangleStartRef.current = null;
        clearPreview();
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
      }
      return;
    }

    if (commandRequest.id === "circle") {
      if (lower.includes("cancel")) {
        circleCenterRef.current = null;
        clearPreview();
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
      }
      return;
    }

    if (commandRequest.id === "primitive") {
      if (lower.includes("cancel")) {
        primitiveCenterRef.current = null;
        clearPreview();
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
      }
    }
  }, [commandRequest, geometry, hiddenGeometryIds, selectedGeometryIds]);

  useEffect(() => {
    gumballStateRef.current = {
      selectionPoints,
      orientation: orientationBasis,
      pivot: resolvedPivot,
      mode: activeTransformMode,
      visible: isGizmoVisible,
    };
  }, [selectionPoints, orientationBasis, resolvedPivot, activeTransformMode, isGizmoVisible]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new WebGLRenderer(canvas);
    const adapter = new GeometryRenderAdapter(renderer, (id) =>
      geometryRef.current.find((item) => item.id === id)
    );
    rendererRef.current = renderer;
    adapterRef.current = adapter;
    previewLineBufferRef.current = null;
    previewMeshBufferRef.current = null;
    previewEdgeBufferRef.current = null;
    previewDirtyRef.current = true;

    return () => {
      renderer.dispose();
      adapter.dispose();
      rendererRef.current = null;
      adapterRef.current = null;
      previewLineBufferRef.current = null;
      previewMeshBufferRef.current = null;
      previewEdgeBufferRef.current = null;
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

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      renderer.setSize(canvas.width, canvas.height);
    });

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
      const ctrlShiftKey = event.ctrlKey && event.shiftKey;
      const shiftKey = event.shiftKey && !event.ctrlKey;

      if (isRightClick && commandId === "polyline") {
        commitPolyline();
        clearPreview();
        event.preventDefault();
        return;
      }
      if (isRightClick && commandId === "curve") {
        commitCurve();
        clearPreview();
        event.preventDefault();
        return;
      }

      if (isMiddleClick || isRightClick) {
        const startCamera = {
          position: { ...cameraRef.current.position },
          target: { ...cameraRef.current.target },
        };
        const startAngles = getSpherical(startCamera.position, startCamera.target);
        const mode = isMiddleClick ? "pan" : "orbit";
        dragRef.current = { mode, pointer: { x, y }, startCamera, startAngles };
        canvas.setPointerCapture(event.pointerId);
        return;
      }

      pointerPlaneRef.current = context.planePoint;
      if (pivotRef.current.mode === "cursor" && context.planePoint) {
        setPivotCursorPosition(context.planePoint);
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
          return;
        }
        if (commandId === "primitive") {
          if (!primitiveCenterRef.current) {
            primitiveCenterRef.current = hitPoint;
            refreshPreview(hitPoint);
            return;
          }
          createPrimitiveFromDrag(primitiveCenterRef.current, hitPoint);
          primitiveCenterRef.current = null;
          clearPreview();
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
          setCameraState({ position: nextPosition });
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
        setCameraState({
          position: add(drag.startCamera.position, offset),
          target: add(drag.startCamera.target, offset),
        });
        return;
      }

      const context = getPointerContext(event);
      if (!context) return;
      pointerPlaneRef.current = context.planePoint;
      if (pivotRef.current.mode === "cursor" && context.planePoint) {
        setPivotCursorPosition(context.planePoint);
      }
      refreshPreview(context.planePoint);

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
        const componentPick = pickComponent(context);
        const fallbackPick = componentPick ?? pickObject(context);
        applyPick(fallbackPick, selectionDrag.shiftKey, true);
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
      setCameraState({ position: nextPosition });
    };

    const handleDoubleClick = () => {
      if (activeCommandIdRef.current !== "polyline") return;
      if (polylinePointsRef.current.length < 2) return;
      commitPolyline();
      clearPreview();
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
    referencedVertexIds,
    setCameraState,
    setPivotCursorPosition,
    setPivotPickedPosition,
    vertexMap,
  ]);

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

      if (event.key === "Escape") {
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

      if (event.key !== "Enter") return;
      const pointerPoint = pointerPlaneRef.current;
      const commandId = activeCommandIdRef.current;
      if (commandId === "polyline") {
        commitPolyline();
        clearPreview();
        return;
      }
      if (commandId === "curve") {
        commitCurve();
        clearPreview();
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
        return;
      }
      if (commandId === "circle" && circleCenterRef.current) {
        createCircleFromDrag(circleCenterRef.current, pointerPoint);
        circleCenterRef.current = null;
        clearPreview();
        return;
      }
      if (commandId === "primitive" && primitiveCenterRef.current) {
        createPrimitiveFromDrag(primitiveCenterRef.current, pointerPoint);
        primitiveCenterRef.current = null;
        clearPreview();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

      renderer.setBackfaceCulling(viewSettingsRef.current.backfaceCulling);
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

      const selection = new Set(selectionRef.current);
      componentSelectionRef.current.forEach((entry) => selection.add(entry.geometryId));
      const hidden = new Set(hiddenRef.current);
      const displayModeRaw = displayModeRef.current;
      const displayMode =
        displayModeRaw === "wireframe" || displayModeRaw === "ghosted"
          ? displayModeRaw
          : "shaded";
      const showMesh = displayMode !== "wireframe";
      const showEdges = displayMode !== "shaded";
      const showHiddenEdges = displayMode !== "shaded";
      const meshOpacity = displayMode === "ghosted" ? VIEW_STYLE.ghostedOpacity : 1;

      const gridMinorBuffer = gridMinorBufferRef.current;
      const gridMajorBuffer = gridMajorBufferRef.current;
      if (gridMinorBuffer) {
        renderer.renderEdges(gridMinorBuffer, cameraPayload, {
          edgeColor: VIEW_STYLE.gridMinor,
          opacity: 0.7,
          dashEnabled: 0,
        });
      }
      if (gridMajorBuffer) {
        renderer.renderEdges(gridMajorBuffer, cameraPayload, {
          edgeColor: VIEW_STYLE.gridMajor,
          opacity: 0.92,
          dashEnabled: 0,
        });
      }

      adapter.getAllRenderables().forEach((renderable) => {
        if (hidden.has(renderable.id)) return;
        const isSelected = selection.has(renderable.id);
        if (renderable.type === "polyline") {
          renderer.renderLine(renderable.buffer, cameraPayload, {
            lineWidth: 2 * (window.devicePixelRatio || 1),
            resolution: [canvas.width, canvas.height],
            lineColor: VIEW_STYLE.edge,
            selectionHighlight: VIEW_STYLE.selection,
            isSelected: isSelected ? 1 : 0,
          });
          return;
        }

        if (showMesh) {
          renderer.renderGeometry(renderable.buffer, cameraPayload, {
            materialColor: VIEW_STYLE.mesh,
            lightPosition: VIEW_STYLE.lightPosition,
            lightColor: VIEW_STYLE.light,
            ambientColor: VIEW_STYLE.ambient,
            selectionHighlight: VIEW_STYLE.selection,
            isSelected: isSelected ? 1 : 0,
            opacity: meshOpacity,
          });
        }

        if (!showEdges || !renderable.edgeBuffer) return;

        renderer.renderEdges(renderable.edgeBuffer, cameraPayload, {
          edgeColor: VIEW_STYLE.edge,
          opacity: 1,
          dashEnabled: 0,
        });

        if (showHiddenEdges) {
          renderer.renderEdges(
            renderable.edgeBuffer,
            cameraPayload,
            {
              edgeColor: VIEW_STYLE.hiddenEdge,
              opacity: VIEW_STYLE.hiddenEdgeOpacity,
              dashEnabled: 1,
              dashScale: VIEW_STYLE.dashScale,
            },
            { depthFunc: "greater" }
          );
        }
      });

      const preview = previewStateRef.current;
      const previewLineBuffer = previewLineBufferRef.current;
      const previewMeshBuffer = previewMeshBufferRef.current;
      const previewEdgeBuffer = previewEdgeBufferRef.current;
      if (preview?.kind === "line" && previewLineBuffer) {
        renderer.renderLine(previewLineBuffer, cameraPayload, {
          lineWidth: 2.6 * (window.devicePixelRatio || 1),
          resolution: [canvas.width, canvas.height],
          lineColor: [0.08, 0.54, 0.78],
          selectionHighlight: VIEW_STYLE.selection,
          isSelected: 0,
        });
      } else if (preview?.kind === "mesh" && previewMeshBuffer) {
        renderer.renderGeometry(previewMeshBuffer, cameraPayload, {
          materialColor: [0.09, 0.62, 0.78],
          lightPosition: VIEW_STYLE.lightPosition,
          lightColor: VIEW_STYLE.light,
          ambientColor: VIEW_STYLE.ambient,
          selectionHighlight: VIEW_STYLE.selection,
          isSelected: 0,
          opacity: 0.72,
        });
        if (previewEdgeBuffer) {
          renderer.renderEdges(previewEdgeBuffer, cameraPayload, {
            edgeColor: [0.04, 0.18, 0.22],
            opacity: 0.95,
            dashEnabled: 0,
          });
        }
      }

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
        onContextMenu={(event) => event.preventDefault()}
      />
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
            borderRadius: 8,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
};

export default WebGLViewerCanvas;
