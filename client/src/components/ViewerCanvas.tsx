import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import {
  Canvas,
  useFrame,
  useThree,
  type EventManager,
  type ThreeEvent,
} from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import {
  BackSide,
  Box3,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  FogExp2,
  FrontSide,
  Intersection,
  MOUSE,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Gizmo, type GizmoHandle } from "./gizmo/Gizmo";
import { useProjectStore } from "../store/useProjectStore";
import type {
  CPlane,
  ComponentSelection,
  DisplayMode,
  Geometry,
  GridSettings,
  Material,
  ModelerSnapshot,
  PlaneDefinition,
  PolylineGeometry,
  RenderMesh,
  TransformMode,
  TransformOrientation,
  ViewSettings,
  Vec3,
  VertexGeometry,
} from "../types";
import {
  add,
  centroid,
  computeBestFitPlane,
  cross,
  distance,
  distanceToPlane,
  dot,
  length,
  normalize,
  projectPointToPlane,
  scale,
  sub,
  unprojectPointFromPlane,
} from "../geometry/math";
import { ensureClosedLoop, interpolatePolyline } from "../geometry/curves";
import {
  computeMeshArea,
  generateBoxMesh,
  generateCylinderMesh,
  generateExtrudeMesh,
  generateLoftMesh,
  generateSphereMesh,
  generateSurfaceMesh,
  generateTorusMesh,
  transformMesh,
} from "../geometry/mesh";
import {
  applyToPositions,
  basisFromPlane,
  rotateAroundAxis,
  scaleAroundPivot,
  translatePoint,
  WORLD_BASIS,
  type Basis,
} from "../geometry/transform";
import {
  findClosestSegmentIndex,
  findClosestVertexIndex,
  getTriangleEdgeFromPoint,
} from "../selection/picking";

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

type ViewerCanvasProps = {
  activeCommandId?: string | null;
  commandRequest?: CommandRequest | null;
  primitiveSettings?: PrimitiveSettings;
  rectangleSettings?: RectangleSettings;
  circleSettings?: CircleSettings;
  onCommandComplete?: (commandId: string) => void;
};

type CommandRequest = {
  id: string;
  input: string;
  requestId: number;
};

type MaterialSurface = {
  roughness: number;
  metalness: number;
  opacity?: number;
  transparent?: boolean;
};

const DEFAULT_MATERIAL_COLOR = "#eaeaf0";
const MATERIAL_CATEGORY_COLORS: Record<string, string> = {
  Mineral: "#eaeaf0",
  Metal: "#6b7280",
  Timber: "#f5f5f7",
  Glass: "#f5f5f7",
  Interior: "#eaeaf0",
  Masonry: "#eaeaf0",
  Insulation: "#f5f5f7",
  Surface: "#eaeaf0",
};
const MATERIAL_COLOR_PALETTE = [
  "#eaeaf0",
  "#f5f5f7",
  "#6b7280",
];
const SNAP_COLORS: Record<string, string> = {
  grid: "#9a9a96",
  vertex: "#fdfdfc",
  endpoint: "#fdfdfc",
  midpoint: "#c2c2be",
  intersection: "#f6f6f4",
  perpendicular: "#dededb",
  tangent: "#efefed",
};

const VIEWER_HOVER_COLOR = "#f5f5f7";
const VIEWER_SELECTED_COLOR = "#fdfdfc";
const VIEWER_EMISSIVE_IDLE = "#050505";
const VIEWER_EDGE_COLOR = "#9a9a96";
const VIEWER_EDGE_HOVER_COLOR = "#c2c2be";
const VIEWER_EDGE_SELECTED_COLOR = "#fdfdfc";
const VIEWER_NORMALS_COLOR = "#c2c2be";
const VIEWER_GRID_COLOR = "#111111";
const VIEWER_AXIS_PRIMARY_COLOR = "#fdfdfc";
const VIEWER_AXIS_SECONDARY_COLOR = "#c2c2be";
const VIEWER_AXIS_TERTIARY_COLOR = "#9a9a96";
const VIEWER_DRAFT_COLOR = "#c2c2be";
const VIEWER_PREVIEW_COLOR = "#dededb";
const VIEWER_PREVIEW_EMISSIVE = "#fdfdfc";
const VIEWER_ATMOSPHERE_TOP = "#111111";
const VIEWER_ATMOSPHERE_BOTTOM = "#050505";
const VIEWER_FOG_COLOR = "#050505";
const VIEWER_BACKGROUND_COLOR = "#050505";
const VIEWER_GROUND_COLOR = "#080808";
const MATERIAL_SURFACE_BY_CATEGORY: Record<string, MaterialSurface> = {
  Mineral: { roughness: 0.9, metalness: 0.05 },
  Metal: { roughness: 0.3, metalness: 0.8 },
  Timber: { roughness: 0.7, metalness: 0.1 },
  Glass: { roughness: 0.15, metalness: 0.1, opacity: 0.6, transparent: true },
  Interior: { roughness: 0.6, metalness: 0.2 },
  Masonry: { roughness: 0.8, metalness: 0.05 },
  Insulation: { roughness: 0.95, metalness: 0 },
  Surface: { roughness: 0.8, metalness: 0.1 },
};

const formatValue = (value: number, decimals = 3) => value.toFixed(decimals);

const getMaterialColor = (material?: Material) => {
  if (!material) return DEFAULT_MATERIAL_COLOR;
  const categoryColor = MATERIAL_CATEGORY_COLORS[material.category];
  if (categoryColor) return categoryColor;
  const hash = Array.from(material.id).reduce(
    (total, char) => total + char.charCodeAt(0),
    0
  );
  return MATERIAL_COLOR_PALETTE[hash % MATERIAL_COLOR_PALETTE.length];
};

const getMaterialSurface = (material?: Material): MaterialSurface => {
  const surface = material ? MATERIAL_SURFACE_BY_CATEGORY[material.category] : null;
  return {
    roughness: surface?.roughness ?? 0.7,
    metalness: surface?.metalness ?? 0.1,
    opacity: surface?.opacity,
    transparent: surface?.transparent,
  };
};

type SnapIndicator = {
  point: Vec3;
  type: string;
  label?: string;
};

type HoverTarget = {
  kind: "object" | "vertex" | "edge" | "face";
  geometryId: string;
  vertexId?: string;
  index?: number;
};

type TransformConstraint = {
  kind: "axis" | "plane" | "screen" | "free";
  axis?: "x" | "y" | "z";
  plane?: "xy" | "yz" | "xz";
};

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
  plane?: Plane;
  startPoint?: Vec3;
  startVector?: Vec3;
  startDistance?: number;
  targets: TransformTargets;
  startVertexPositions: Map<string, Vec3>;
  startMeshPositions: Map<string, number[]>;
  meshExtras: Map<string, { normals: number[]; uvs: number[]; indices: number[] }>;
  historySnapshot: ModelerSnapshot;
  temporaryIds?: string[];
  previousSelection?: string[];
  typedDelta?: Vec3;
  typedAngle?: number;
  typedScale?: Vec3;
};

type TransformPreview = {
  delta?: Vec3;
  angle?: number;
  scale?: Vec3;
};

type SegmentCandidate = {
  geometryId: string;
  index: number;
  a: Vec3;
  b: Vec3;
};

type CameraTransition = {
  startPosition: Vec3;
  endPosition: Vec3;
  startTarget: Vec3;
  endTarget: Vec3;
  startTime: number;
  duration: number;
};

const DEFAULT_MARKER_SIZE_PX = 10;
const DEFAULT_MARKER_SCALE = 0.5;
const DEFAULT_PRIMITIVE_SETTINGS: PrimitiveSettings = {
  kind: "box",
  size: 1,
  radius: 0.5,
  height: 1,
  tube: 0.2,
  radialSegments: 24,
  tubularSegments: 36,
};
const DEFAULT_RECTANGLE_SETTINGS: RectangleSettings = { width: 1.6, height: 1 };
const DEFAULT_CIRCLE_SETTINGS: CircleSettings = { radius: 0.8, segments: 32 };

const MESH_SILHOUETTE_MATERIAL = new MeshBasicMaterial({
  color: VIEWER_BACKGROUND_COLOR,
  side: BackSide,
  transparent: true,
  opacity: 0.68,
  depthWrite: false,
});

const noopRaycast: Mesh["raycast"] = () => null;

const SceneAtmosphere = () => {
  const { scene } = useThree();
  const gradientMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          topColor: { value: new Color(VIEWER_ATMOSPHERE_TOP) },
          bottomColor: { value: new Color(VIEWER_ATMOSPHERE_BOTTOM) },
          offset: { value: 600 },
          exponent: { value: 0.9 },
        },
        vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 bottomColor;
          uniform float offset;
          uniform float exponent;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition + offset).y;
            float mixValue = max(pow(max(h, 0.0), exponent), 0.0);
            gl_FragColor = vec4(mix(bottomColor, topColor, mixValue), 1.0);
          }
        `,
        side: BackSide,
        depthWrite: false,
      }),
    []
  );
  const domeGeometry = useMemo(() => new SphereGeometry(2400, 64, 64), []);
  const groundGeometry = useMemo(() => new PlaneGeometry(4800, 4800, 1, 1), []);

  useEffect(
    () => () => {
      gradientMaterial.dispose();
      domeGeometry.dispose();
      groundGeometry.dispose();
    },
    [gradientMaterial, domeGeometry, groundGeometry]
  );

  useEffect(() => {
    const previousFog = scene.fog;
    const previousBackground = scene.background;
    const fog = new FogExp2(VIEWER_FOG_COLOR, 0.012);
    scene.fog = fog;
    scene.background = new Color(VIEWER_BACKGROUND_COLOR);
    return () => {
      scene.fog = previousFog ?? null;
      scene.background = previousBackground ?? null;
    };
  }, [scene]);

  return (
    <group>
      <mesh
        geometry={domeGeometry}
        material={gradientMaterial}
        renderOrder={-200}
        frustumCulled={false}
        raycast={noopRaycast}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.3, 0]}
        renderOrder={-150}
        frustumCulled={false}
        raycast={noopRaycast}
      >
        <primitive object={groundGeometry} attach="geometry" />
        <meshBasicMaterial
          color={VIEWER_GROUND_COLOR}
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

const VertexMarker = ({
  position,
  isSelected,
  isHovered,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  onContextMenu,
  color,
  surface,
  userData,
}: {
  position: Vec3;
  isSelected: boolean;
  isHovered: boolean;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOver: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (event: ThreeEvent<PointerEvent>) => void;
  onContextMenu: (event: ThreeEvent<MouseEvent>) => void;
  color: string;
  surface: MaterialSurface;
  userData?: Record<string, unknown>;
}) => {
  const meshRef = useRef<Mesh>(null);
  const { camera, size } = useThree();
  useFrame(() => {
    if (!meshRef.current) return;
    const worldPosition = new Vector3();
    meshRef.current.getWorldPosition(worldPosition);
    const distanceToCamera = camera.position.distanceTo(worldPosition);
    if (!("fov" in camera)) return;
    const fov = (camera as PerspectiveCamera).fov;
    const height = 2 * Math.tan((fov * Math.PI) / 360) * distanceToCamera;
    const worldPerPixel = height / size.height;
    const scale = worldPerPixel * DEFAULT_MARKER_SIZE_PX;
    meshRef.current.scale.setScalar(scale);
  });
  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y, position.z]}
      userData={userData}
      onPointerDown={onPointerDown}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onContextMenu={onContextMenu}
    >
      <sphereGeometry args={[DEFAULT_MARKER_SCALE, 16, 16]} />
      <meshStandardMaterial
        color={isHovered ? VIEWER_HOVER_COLOR : color}
        emissive={isSelected ? VIEWER_SELECTED_COLOR : VIEWER_EMISSIVE_IDLE}
        emissiveIntensity={isSelected ? 0.65 : isHovered ? 0.45 : 0.2}
        roughness={surface.roughness}
        metalness={surface.metalness}
        opacity={surface.opacity}
        transparent={surface.transparent}
      />
    </mesh>
  );
};

const MeshSurface = ({
  mesh,
  material,
  isSelected,
  isHovered,
  displayMode,
  isPanModifier = false,
  isPanDragging = false,
  isControlsActive = false,
  onSelect,
  onHover,
  userData,
  viewSettings,
}: {
  mesh: RenderMesh;
  material?: Material;
  isSelected: boolean;
  isHovered: boolean;
  displayMode: DisplayMode;
  isPanModifier?: boolean;
  isPanDragging?: boolean;
  isControlsActive?: boolean;
  onSelect: (event: ThreeEvent<PointerEvent>) => void;
  onHover: (isHovered: boolean) => void;
  userData?: Record<string, unknown>;
  viewSettings: ViewSettings;
}) => {
  const color = getMaterialColor(material);
  const surface = getMaterialSurface(material);
  const isWireframe = displayMode === "wireframe";
  const isGhosted = displayMode === "ghosted";
  const showEdges = displayMode === "shaded_edges";
  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    if (mesh.positions.length === 0) return geo;
    geo.setAttribute(
      "position",
      new Float32BufferAttribute(mesh.positions, 3)
    );
    if (mesh.normals.length === mesh.positions.length) {
      geo.setAttribute("normal", new Float32BufferAttribute(mesh.normals, 3));
    }
    if (mesh.uvs.length > 0) {
      geo.setAttribute("uv", new Float32BufferAttribute(mesh.uvs, 2));
    }
    if (mesh.indices.length > 0) {
      geo.setIndex(mesh.indices);
    }
    if (mesh.normals.length !== mesh.positions.length) {
      geo.computeVertexNormals();
    }
    return geo;
  }, [mesh]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const normalGeometry = useMemo(() => {
    if (!viewSettings.showNormals) return null;
    if (mesh.positions.length === 0) return null;
    const normals =
      mesh.normals.length === mesh.positions.length
        ? mesh.normals
        : geometry.attributes.normal?.array ?? [];
    if (normals.length !== mesh.positions.length) return null;
    const positions: number[] = [];
    const scale = 0.1;
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const x = mesh.positions[i];
      const y = mesh.positions[i + 1];
      const z = mesh.positions[i + 2];
      const nx = normals[i];
      const ny = normals[i + 1];
      const nz = normals[i + 2];
      positions.push(x, y, z, x + nx * scale, y + ny * scale, z + nz * scale);
    }
    const normalGeo = new BufferGeometry();
    normalGeo.setAttribute("position", new Float32BufferAttribute(positions, 3));
    return normalGeo;
  }, [mesh.positions, mesh.normals, geometry, viewSettings.showNormals]);
  useEffect(() => () => normalGeometry?.dispose(), [normalGeometry]);
  return (
    <>
      <mesh
        geometry={geometry}
        userData={userData}
        onPointerDown={(event: ThreeEvent<PointerEvent>) => {
          if (isPanModifier || isPanDragging || isControlsActive) return;
          if (event.button !== 0) return;
          event.stopPropagation();
          onSelect(event);
        }}
        onContextMenu={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          event.nativeEvent.preventDefault();
        }}
        onPointerOver={(event: ThreeEvent<PointerEvent>) => {
          if (isPanModifier || isPanDragging || isControlsActive) return;
          event.stopPropagation();
          onHover(true);
        }}
        onPointerOut={(event: ThreeEvent<PointerEvent>) => {
          if (isPanModifier || isPanDragging || isControlsActive) return;
          event.stopPropagation();
          onHover(false);
        }}
      >
        <meshStandardMaterial
          color={isHovered ? VIEWER_HOVER_COLOR : color}
          emissive={isSelected ? VIEWER_SELECTED_COLOR : VIEWER_EMISSIVE_IDLE}
          emissiveIntensity={isSelected ? 0.5 : isHovered ? 0.3 : 0.15}
          roughness={surface.roughness}
          metalness={surface.metalness}
          opacity={isGhosted ? 0.3 : surface.opacity ?? 0.9}
          transparent
          side={viewSettings.backfaceCulling ? FrontSide : DoubleSide}
          wireframe={isWireframe}
        />
        {viewSettings.showNormals && normalGeometry && (
          <lineSegments geometry={normalGeometry}>
            <lineBasicMaterial color={VIEWER_NORMALS_COLOR} />
          </lineSegments>
        )}
        {showEdges && (
          <Edges scale={1.002} color={VIEWER_EDGE_COLOR} threshold={15} />
        )}
      </mesh>
      {!isWireframe && (
        <mesh
          geometry={geometry}
          material={MESH_SILHOUETTE_MATERIAL}
          scale={[1.01, 1.01, 1.01]}
          renderOrder={-10}
          raycast={noopRaycast}
        />
      )}
    </>
  );
}
;

const PreviewMesh = ({ mesh }: { mesh: RenderMesh }) => {
  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute(
      "position",
      new Float32BufferAttribute(mesh.positions, 3)
    );
    if (mesh.indices.length > 0) {
      geo.setIndex(mesh.indices);
    }
    geo.computeVertexNormals();
    return geo;
  }, [mesh]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const materialRef = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    const pulse = 0.4 + Math.sin(clock.getElapsedTime() * 2.2) * 0.15;
    materialRef.current.opacity = pulse;
  });
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        ref={materialRef}
        color={VIEWER_PREVIEW_COLOR}
        emissive={VIEWER_PREVIEW_EMISSIVE}
        emissiveIntensity={0.6}
        transparent
        opacity={0.4}
        roughness={0.5}
        metalness={0.1}
        side={DoubleSide}
      />
    </mesh>
  );
};

const CameraAnimator = ({
  controlsRef,
  animationRef,
  onUpdate,
}: {
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
  animationRef: MutableRefObject<CameraTransition | null>;
  onUpdate: (position: Vec3, target: Vec3) => void;
}) => {
  useFrame(({ clock }) => {
    const animation = animationRef.current;
    if (!animation) return;
    if (animation.startTime === 0) {
      animation.startTime = clock.getElapsedTime();
    }
    const elapsed = clock.getElapsedTime() - animation.startTime;
    const t = Math.min(elapsed / animation.duration, 1);
    const lerp = (start: Vec3, end: Vec3) => ({
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
      z: start.z + (end.z - start.z) * t,
    });
    const nextPosition = lerp(animation.startPosition, animation.endPosition);
    const nextTarget = lerp(animation.startTarget, animation.endTarget);
    if (controlsRef.current) {
      controlsRef.current.object.position.set(
        nextPosition.x,
        nextPosition.y,
        nextPosition.z
      );
      controlsRef.current.target.set(nextTarget.x, nextTarget.y, nextTarget.z);
      controlsRef.current.update();
    }
    onUpdate(nextPosition, nextTarget);
    if (t >= 1) {
      animationRef.current = null;
    }
  });
  return null;
};

const CPlaneGrid = ({
  plane,
  gridSettings,
}: {
  plane: CPlane;
  gridSettings: GridSettings;
}) => {
  const { camera } = useThree();
  const [gridScale, setGridScale] = useState(1);

  useFrame(() => {
    if (!gridSettings.adaptive) return;
    const distanceToOrigin = camera.position.distanceTo(
      new Vector3(plane.origin.x, plane.origin.y, plane.origin.z)
    );
    const targetScale = Math.max(1, Math.pow(2, Math.round(Math.log2(distanceToOrigin / 6))));
    if (targetScale !== gridScale) {
      setGridScale(targetScale);
    }
  });

  const gridGeometry = useMemo(() => {
    const geo = new BufferGeometry();
    const spacing = gridSettings.spacing * (gridSettings.adaptive ? gridScale : 1);
    const majorSpan = spacing * gridSettings.majorLinesEvery;
    const extent = majorSpan * 4;
    const size = extent * 2;
    const divisions = Math.max(4, Math.round(size / spacing));
    const half = size / 2;
    const step = spacing;
    const positions: number[] = [];
    for (let i = 0; i <= divisions; i += 1) {
      const offset = -half + i * step;
      const startX = {
        x: plane.origin.x + plane.xAxis.x * offset + plane.yAxis.x * -half,
        y: plane.origin.y + plane.xAxis.y * offset + plane.yAxis.y * -half,
        z: plane.origin.z + plane.xAxis.z * offset + plane.yAxis.z * -half,
      };
      const endX = {
        x: plane.origin.x + plane.xAxis.x * offset + plane.yAxis.x * half,
        y: plane.origin.y + plane.xAxis.y * offset + plane.yAxis.y * half,
        z: plane.origin.z + plane.xAxis.z * offset + plane.yAxis.z * half,
      };
      positions.push(startX.x, startX.y, startX.z, endX.x, endX.y, endX.z);
      const startY = {
        x: plane.origin.x + plane.yAxis.x * offset + plane.xAxis.x * -half,
        y: plane.origin.y + plane.yAxis.y * offset + plane.xAxis.y * -half,
        z: plane.origin.z + plane.yAxis.z * offset + plane.xAxis.z * -half,
      };
      const endY = {
        x: plane.origin.x + plane.yAxis.x * offset + plane.xAxis.x * half,
        y: plane.origin.y + plane.yAxis.y * offset + plane.xAxis.y * half,
        z: plane.origin.z + plane.yAxis.z * offset + plane.xAxis.z * half,
      };
      positions.push(startY.x, startY.y, startY.z, endY.x, endY.y, endY.z);
    }
    geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
    return geo;
  }, [plane, gridScale, gridSettings.spacing, gridSettings.adaptive, gridSettings.majorLinesEvery]);
  useEffect(() => () => gridGeometry.dispose(), [gridGeometry]);
  const axisLength = gridSettings.spacing * gridSettings.majorLinesEvery * 1.2;
  return (
    <>
      <lineSegments geometry={gridGeometry}>
        <lineBasicMaterial color={VIEWER_GRID_COLOR} transparent opacity={0.45} />
      </lineSegments>
      <Line
        points={[
          [plane.origin.x, plane.origin.y, plane.origin.z],
          [
            plane.origin.x + plane.xAxis.x * axisLength,
            plane.origin.y + plane.xAxis.y * axisLength,
            plane.origin.z + plane.xAxis.z * axisLength,
          ],
        ]}
        color={VIEWER_AXIS_PRIMARY_COLOR}
        lineWidth={2}
      />
      <Line
        points={[
          [plane.origin.x, plane.origin.y, plane.origin.z],
          [
            plane.origin.x + plane.yAxis.x * axisLength,
            plane.origin.y + plane.yAxis.y * axisLength,
            plane.origin.z + plane.yAxis.z * axisLength,
          ],
        ]}
        color={VIEWER_AXIS_SECONDARY_COLOR}
        lineWidth={2}
      />
      <Line
        points={[
          [plane.origin.x, plane.origin.y, plane.origin.z],
          [
            plane.origin.x + plane.normal.x * axisLength,
            plane.origin.y + plane.normal.y * axisLength,
            plane.origin.z + plane.normal.z * axisLength,
          ],
        ]}
        color={VIEWER_AXIS_TERTIARY_COLOR}
        lineWidth={2}
      />
    </>
  );
};

const ViewerCanvas = ({
  activeCommandId = null,
  commandRequest = null,
  primitiveSettings = DEFAULT_PRIMITIVE_SETTINGS,
  rectangleSettings = DEFAULT_RECTANGLE_SETTINGS,
  circleSettings = DEFAULT_CIRCLE_SETTINGS,
  onCommandComplete,
}: ViewerCanvasProps) => {
  const geometry = useProjectStore((state) => state.geometry);
  const materials = useProjectStore((state) => state.materials);
  const assignments = useProjectStore((state) => state.assignments);
  const layers = useProjectStore((state) => state.layers);
  const cPlane = useProjectStore((state) => state.cPlane);
  const selectionMode = useProjectStore((state) => state.selectionMode);
  const componentSelection = useProjectStore((state) => state.componentSelection);
  const transformOrientation = useProjectStore(
    (state) => state.transformOrientation
  );
  const setTransformOrientation = useProjectStore(
    (state) => state.setTransformOrientation
  );
  const pivot = useProjectStore((state) => state.pivot);
  const displayMode = useProjectStore((state) => state.displayMode);
  const viewSettings = useProjectStore((state) => state.viewSettings);
  const snapSettings = useProjectStore((state) => state.snapSettings);
  const gridSettings = useProjectStore((state) => state.gridSettings);
  const cameraState = useProjectStore((state) => state.camera);
  const hiddenGeometryIds = useProjectStore((state) => state.hiddenGeometryIds);
  const lockedGeometryIds = useProjectStore((state) => state.lockedGeometryIds);
  const sceneNodes = useProjectStore((state) => state.sceneNodes);
  const selectedGeometryIds = useProjectStore(
    (state) => state.selectedGeometryIds
  );
  const selectGeometry = useProjectStore((state) => state.selectGeometry);
  const setSelectedGeometryIds = useProjectStore(
    (state) => state.setSelectedGeometryIds
  );
  const setComponentSelection = useProjectStore(
    (state) => state.setComponentSelection
  );
  const clearComponentSelection = useProjectStore(
    (state) => state.clearComponentSelection
  );
  const setPivotPosition = useProjectStore((state) => state.setPivotPosition);
  const setPivotCursorPosition = useProjectStore(
    (state) => state.setPivotCursorPosition
  );
  const setPivotPickedPosition = useProjectStore(
    (state) => state.setPivotPickedPosition
  );
  const setCameraState = useProjectStore((state) => state.setCameraState);
  const recordModelerHistory = useProjectStore(
    (state) => state.recordModelerHistory
  );
  const addGeometryPoint = useProjectStore((state) => state.addGeometryPoint);
  const addGeometryPolyline = useProjectStore((state) => state.addGeometryPolyline);
  const addGeometryPolylineFromPoints = useProjectStore(
    (state) => state.addGeometryPolylineFromPoints
  );
  const addGeometrySurface = useProjectStore((state) => state.addGeometrySurface);
  const addGeometryLoft = useProjectStore((state) => state.addGeometryLoft);
  const addGeometryExtrude = useProjectStore((state) => state.addGeometryExtrude);
  const addGeometryItems = useProjectStore((state) => state.addGeometryItems);
  const addGeometryMesh = useProjectStore((state) => state.addGeometryMesh);
  const updateGeometry = useProjectStore((state) => state.updateGeometry);
  const updateGeometryBatch = useProjectStore(
    (state) => state.updateGeometryBatch
  );
  const deleteGeometry = useProjectStore((state) => state.deleteGeometry);
  const setCPlane = useProjectStore((state) => state.setCPlane);
  const [hoveredTarget, setHoveredTarget] = useState<HoverTarget | null>(null);
  const [snapIndicator, setSnapIndicator] = useState<SnapIndicator | null>(null);
  const [transformPreview, setTransformPreview] = useState<TransformPreview | null>(
    null
  );
  const transformPreviewRef = useRef<TransformPreview | null>(null);
  const transformPreviewFrameRef = useRef<number | null>(null);
  const [pickStack, setPickStack] = useState<HoverTarget[]>([]);
  const [pickIndex, setPickIndex] = useState(0);
  const lastPointerRayRef = useRef<{ origin: Vec3; dir: Vec3 } | null>(null);
  const [cPlaneDraftPoints, setCPlaneDraftPoints] = useState<Vec3[] | null>(null);
  const [boxSelectState, setBoxSelectState] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
    startPoint: Vec3;
    endPoint: Vec3;
  } | null>(null);
  const [isPanModifier, setIsPanModifier] = useState(false);
  const [isPanDragging, setIsPanDragging] = useState(false);
  const [isControlsActive, setIsControlsActive] = useState(false);
  const [isGizmoDragging, setIsGizmoDragging] = useState(false);
  const gizmoDragRef = useRef(false);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null
  );
  const [webglStatus, setWebglStatus] = useState<"lost" | "restored" | null>(
    null
  );
  const eventsRef = useRef<EventManager<HTMLCanvasElement> | null>(null);

  const toThreePointerEvent = (
    event: ThreeEvent<PointerEvent> | React.PointerEvent | PointerEvent
  ) => event as unknown as ThreeEvent<PointerEvent>;

  const toThreeMouseEvent = (
    event: ThreeEvent<MouseEvent> | React.MouseEvent | MouseEvent
  ) => event as unknown as ThreeEvent<MouseEvent>;

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

  const transformReadout = useMemo(() => {
    if (!transformPreview) return null;
    if (transformPreview.delta) {
      return `Delta ${formatValue(transformPreview.delta.x)}, ${formatValue(
        transformPreview.delta.y
      )}, ${formatValue(transformPreview.delta.z)}`;
    }
    if (typeof transformPreview.angle === "number") {
      const degrees = (transformPreview.angle * 180) / Math.PI;
      return `Angle ${formatValue(degrees, 2)} deg`;
    }
    if (transformPreview.scale) {
      return `Scale ${formatValue(transformPreview.scale.x)}, ${formatValue(
        transformPreview.scale.y
      )}, ${formatValue(transformPreview.scale.z)}`;
    }
    return null;
  }, [transformPreview]);
  const [polylineDraft, setPolylineDraft] = useState<{
    vertexIds: string[];
    closed: boolean;
  } | null>(null);
  const polylineDraftRef = useRef<typeof polylineDraft>(polylineDraft);
  useEffect(() => {
    polylineDraftRef.current = polylineDraft;
  }, [polylineDraft]);
  const [loftOptions, setLoftOptions] = useState({
    degree: 2 as 1 | 2 | 3,
    closed: false,
  });
  const [surfaceOptions, setSurfaceOptions] = useState({
    epsilon: 0.02,
    planeMode: "auto" as "auto" | "world" | "cplane",
  });
  const [extrudeOptions, setExtrudeOptions] = useState({
    distance: 1,
    directionMode: "cplane" as "axis" | "cplane" | "vector",
    direction: { x: 0, y: 1, z: 0 } as Vec3,
    capped: true,
  });
  const [loftPreview, setLoftPreview] = useState<RenderMesh | null>(null);
  const [surfacePreview, setSurfacePreview] = useState<{
    mesh: RenderMesh;
    plane: PlaneDefinition;
    needsPlaneConfirm: boolean;
  } | null>(null);
  const [extrudePreview, setExtrudePreview] = useState<RenderMesh | null>(null);
  const [isGumballExtruding, setIsGumballExtruding] = useState(false);
  const transformSessionRef = useRef<TransformSession | null>(null);
  const extrudeSessionRef = useRef<{
    axis: Vec3;
    plane: Plane;
    startPoint: Vec3;
    startDistance: number;
  } | null>(null);
  const cameraTransitionRef = useRef<CameraTransition | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      setIsPanModifier(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      setIsPanModifier(false);
    };
    const handleBlur = () => setIsPanModifier(false);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    if (!canvasElement) return;
    const handleLost = (event: Event) => {
      event.preventDefault();
      setWebglStatus("lost");
    };
    const handleRestored = () => {
      setWebglStatus("restored");
      setTimeout(() => setWebglStatus(null), 1500);
    };
    canvasElement.addEventListener("webglcontextlost", handleLost, false);
    canvasElement.addEventListener("webglcontextrestored", handleRestored, false);
    return () => {
      canvasElement.removeEventListener("webglcontextlost", handleLost);
      canvasElement.removeEventListener("webglcontextrestored", handleRestored);
    };
  }, [canvasElement]);

  useEffect(() => {
    if (!eventsRef.current) return;
    eventsRef.current.enabled = !isControlsActive;
  }, [isControlsActive]);

  useEffect(() => {
    return () => {
      if (transformPreviewFrameRef.current !== null) {
        cancelAnimationFrame(transformPreviewFrameRef.current);
        transformPreviewFrameRef.current = null;
      }
    };
  }, []);
  const materialById = useMemo(() => {
    const map = new Map<string, Material>();
    materials.forEach((material) => map.set(material.id, material));
    return map;
  }, [materials]);
  const geometryMaterialMap = useMemo(() => {
    const map = new Map<string, string>();
    assignments.forEach((assignment) => {
      if (assignment.geometryId) {
        map.set(assignment.geometryId, assignment.materialId);
      }
    });
    return map;
  }, [assignments]);
  const layerMaterialMap = useMemo(() => {
    const map = new Map<string, string>();
    assignments.forEach((assignment) => {
      if (assignment.layerId) {
        map.set(assignment.layerId, assignment.materialId);
      }
    });
    return map;
  }, [assignments]);
  const resolveMaterialForGeometry = (item: Geometry) => {
    const materialId =
      geometryMaterialMap.get(item.id) ??
      layerMaterialMap.get(item.layerId) ??
      materials[0]?.id;
    if (!materialId) return undefined;
    return materialById.get(materialId);
  };
  const hasSelection =
    selectedGeometryIds.length > 0 || componentSelection.length > 0;
  const isCommandActive = Boolean(activeCommandId);
  const isVertexCommand = activeCommandId === "point";
  const isPolylineCommand = activeCommandId === "polyline";
  const isRectangleCommand = activeCommandId === "rectangle";
  const isCircleCommand = activeCommandId === "circle";
  const isPrimitiveCommand = activeCommandId === "primitive";
  const autoGumballActive = (!activeCommandId || activeCommandId === "point") && hasSelection;
  const activeTransformMode = (() => {
    if (activeCommandId === "move" || activeCommandId === "transform") return "move" as const;
    if (activeCommandId === "rotate") return "rotate" as const;
    if (activeCommandId === "scale") return "scale" as const;
    if (activeCommandId === "gumball" || autoGumballActive) {
      return selectionMode === "object" ? "gumball" : "move";
    }
    if (autoGumballActive) return "move" as const;
    return null;
  })();
  const isGizmoVisible =
    Boolean(activeTransformMode) &&
    (selectedGeometryIds.length > 0 || componentSelection.length > 0);

  const orbitMouseButtons = useMemo(() => {
    if (isPanModifier) {
      return {
        LEFT: MOUSE.PAN,
        MIDDLE: MOUSE.PAN,
        RIGHT: MOUSE.PAN,
      };
    }
    return {
      LEFT: undefined as unknown as typeof MOUSE.ROTATE,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.ROTATE,
    };
  }, [isPanModifier]);
  const gridStep = Math.max(
    1e-6,
    snapSettings.gridStep || gridSettings.spacing || 1
  );
  const snapPrecision = Math.max(0, `${gridStep}`.split(".")[1]?.length ?? 0);
  const snapValue = (value: number) =>
    Number((Math.round(value / gridStep) * gridStep).toFixed(snapPrecision));
  const visibleGeometry = useMemo(
    () => geometry.filter((item) => !hiddenGeometryIds.includes(item.id)),
    [geometry, hiddenGeometryIds]
  );
  const vertexItems = useMemo(
    () =>
      visibleGeometry.filter((item) => item.type === "vertex") as VertexGeometry[],
    [visibleGeometry]
  );
  const polylineItems = useMemo(
    () =>
      visibleGeometry.filter((item) => item.type === "polyline") as PolylineGeometry[],
    [visibleGeometry]
  );
  const vertexMap = useMemo(
    () => new Map(vertexItems.map((item) => [item.id, item])),
    [vertexItems]
  );

  const getMeshPoint = (mesh: RenderMesh, index: number): Vec3 => ({
    x: mesh.positions[index * 3],
    y: mesh.positions[index * 3 + 1],
    z: mesh.positions[index * 3 + 2],
  });

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

  const buildModelerSnapshot = (): ModelerSnapshot => ({
    geometry,
    layers,
    assignments,
    selectedGeometryIds,
    componentSelection,
    selectionMode,
    cPlane,
    pivot,
    transformOrientation,
    displayMode,
    viewSettings,
    snapSettings,
    gridSettings,
    camera: cameraState,
    hiddenGeometryIds,
    lockedGeometryIds,
    sceneNodes,
  });

  const computeBoundsForIds = (ids: string[]) => {
    const box = new Box3();
    let hasPoint = false;
    ids.forEach((id) => {
      const item = geometry.find((entry) => entry.id === id);
      if (!item) return;
      if (item.type === "vertex") {
        box.expandByPoint(new Vector3(item.position.x, item.position.y, item.position.z));
        hasPoint = true;
        return;
      }
      if (item.type === "polyline") {
        item.vertexIds.forEach((vertexId) => {
          const vertex = vertexMap.get(vertexId);
          if (!vertex) return;
          box.expandByPoint(
            new Vector3(vertex.position.x, vertex.position.y, vertex.position.z)
          );
          hasPoint = true;
        });
        return;
      }
      if ("mesh" in item) {
        for (let i = 0; i < item.mesh.positions.length; i += 3) {
          box.expandByPoint(
            new Vector3(
              item.mesh.positions[i],
              item.mesh.positions[i + 1],
              item.mesh.positions[i + 2]
            )
          );
        }
        hasPoint = true;
      }
    });
    return hasPoint ? box : null;
  };

  const frameBounds = (box: Box3) => {
    if (!controlsRef.current) return;
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxSize = Math.max(size.x, size.y, size.z, 0.001);
    const fov = (cameraState.fov * Math.PI) / 180;
    const distance = (maxSize / (2 * Math.tan(fov / 2))) * 1.4;
    const currentDirection = normalize(
      sub(cameraState.position, cameraState.target)
    );
    const safeDirection =
      length(currentDirection) > 0.0001 ? currentDirection : { x: 1, y: 1, z: 1 };
    const endTarget = { x: center.x, y: center.y, z: center.z };
    const endPosition = add(endTarget, scale(safeDirection, distance));
    cameraTransitionRef.current = {
      startPosition: cameraState.position,
      endPosition,
      startTarget: cameraState.target,
      endTarget,
      startTime: 0,
      duration: 0.35,
    };
  };

  const applyBoxSelection = (state: {
    start: { x: number; y: number };
    end: { x: number; y: number };
    startPoint: Vec3;
    endPoint: Vec3;
  }) => {
    const isCrossing = state.end.x < state.start.x;
    const startUv = projectPointToPlane(state.startPoint, cPlane);
    const endUv = projectPointToPlane(state.endPoint, cPlane);
    const minU = Math.min(startUv.u, endUv.u);
    const maxU = Math.max(startUv.u, endUv.u);
    const minV = Math.min(startUv.v, endUv.v);
    const maxV = Math.max(startUv.v, endUv.v);

    const isInside = (point: Vec3) => {
      const uv = projectPointToPlane(point, cPlane);
      return uv.u >= minU && uv.u <= maxU && uv.v >= minV && uv.v <= maxV;
    };

    if (selectionMode === "object") {
      const nextSelected: string[] = [];
      visibleGeometry.forEach((item) => {
        if (lockedGeometryIds.includes(item.id)) return;
        const points: Vec3[] = [];
        if (item.type === "vertex") {
          points.push(item.position);
        } else if (item.type === "polyline") {
          item.vertexIds.forEach((vertexId) => {
            const vertex = vertexMap.get(vertexId);
            if (vertex) points.push(vertex.position);
          });
        } else if ("mesh" in item) {
          for (let i = 0; i < item.mesh.positions.length; i += 3) {
            points.push({
              x: item.mesh.positions[i],
              y: item.mesh.positions[i + 1],
              z: item.mesh.positions[i + 2],
            });
          }
        }
        if (points.length === 0) return;
        const hits = points.filter(isInside);
        const isSelected = isCrossing
          ? hits.length > 0
          : hits.length === points.length;
        if (isSelected) nextSelected.push(item.id);
      });
      setSelectedGeometryIds(nextSelected);
      return;
    }

    if (selectionMode === "vertex") {
      const nextSelections: ComponentSelection[] = [];
      vertexItems.forEach((vertex) => {
        if (lockedGeometryIds.includes(vertex.id)) return;
        if (isInside(vertex.position)) {
          nextSelections.push({
            kind: "vertex",
            geometryId: vertex.id,
            vertexId: vertex.id,
          });
        }
      });
      visibleGeometry.forEach((item) => {
        if (!("mesh" in item)) return;
        const mesh = item.mesh;
        for (let i = 0; i < mesh.positions.length; i += 3) {
          const point = {
            x: mesh.positions[i],
            y: mesh.positions[i + 1],
            z: mesh.positions[i + 2],
          };
          if (isInside(point)) {
            nextSelections.push({
              kind: "vertex",
              geometryId: item.id,
              vertexIndex: i / 3,
            });
          }
        }
      });
      setComponentSelection(nextSelections);
      return;
    }

    if (selectionMode === "edge") {
      const nextSelections: ComponentSelection[] = [];
      polylineItems.forEach((polyline) => {
        const points = polyline.vertexIds
          .map((id) => vertexMap.get(id)?.position)
          .filter(Boolean) as Vec3[];
        for (let i = 0; i < points.length - 1; i += 1) {
          const midpoint = centroid([points[i], points[i + 1]]);
          if (isInside(midpoint)) {
            nextSelections.push({
              kind: "edge",
              geometryId: polyline.id,
              edgeIndex: i,
              vertexIds: [polyline.vertexIds[i], polyline.vertexIds[i + 1]],
            });
          }
        }
        if (polyline.closed && points.length > 2) {
          const midpoint = centroid([points[points.length - 1], points[0]]);
          if (isInside(midpoint)) {
            nextSelections.push({
              kind: "edge",
              geometryId: polyline.id,
              edgeIndex: points.length - 1,
              vertexIds: [
                polyline.vertexIds[points.length - 1],
                polyline.vertexIds[0],
              ],
            });
          }
        }
      });
      setComponentSelection(nextSelections);
      return;
    }

    if (selectionMode === "face") {
      const nextSelections: ComponentSelection[] = [];
      visibleGeometry.forEach((item) => {
        if (!("mesh" in item)) return;
        const mesh = item.mesh;
        const indices =
          mesh.indices.length > 0
            ? mesh.indices
            : Array.from(
                { length: mesh.positions.length / 3 },
                (_, index) => index
              );
        for (let i = 0; i < indices.length; i += 3) {
          const a = getMeshPoint(mesh, indices[i]);
          const b = getMeshPoint(mesh, indices[i + 1]);
          const c = getMeshPoint(mesh, indices[i + 2]);
          const mid = centroid([a, b, c]);
          if (isInside(mid)) {
            nextSelections.push({
              kind: "face",
              geometryId: item.id,
              faceIndex: i / 3,
              vertexIndices: [indices[i], indices[i + 1], indices[i + 2]],
            });
          }
        }
      });
      setComponentSelection(nextSelections);
    }
  };

  const componentOverlay = useMemo(() => {
    const edges: Array<[Vec3, Vec3]> = [];
    const faces: Vec3[] = [];
    const vertices: Vec3[] = [];
    componentSelection.forEach((selection) => {
      const item = geometry.find((entry) => entry.id === selection.geometryId);
      if (!item) return;
      const vertexSelection = asVertexSelection(selection);
      if (vertexSelection) {
        if (vertexSelection.vertexId) {
          const vertex = vertexMap.get(vertexSelection.vertexId);
          if (vertex) vertices.push(vertex.position);
          return;
        }
        if (vertexSelection.vertexIndex != null && "mesh" in item) {
          vertices.push(getMeshPoint(item.mesh, vertexSelection.vertexIndex));
        }
        return;
      }
      const edgeSelection = asEdgeSelection(selection);
      if (edgeSelection) {
        if (edgeSelection.vertexIds) {
          const a = vertexMap.get(edgeSelection.vertexIds[0]);
          const b = vertexMap.get(edgeSelection.vertexIds[1]);
          if (a && b) edges.push([a.position, b.position]);
          return;
        }
        if (edgeSelection.vertexIndices && "mesh" in item) {
          edges.push([
            getMeshPoint(item.mesh, edgeSelection.vertexIndices[0]),
            getMeshPoint(item.mesh, edgeSelection.vertexIndices[1]),
          ]);
        }
        return;
      }
      const faceSelection = asFaceSelection(selection);
      if (faceSelection && "mesh" in item) {
        faceSelection.vertexIndices.forEach((index) => {
          faces.push(getMeshPoint(item.mesh, index));
        });
      }
    });
    return { edges, faces, vertices };
  }, [componentSelection, geometry, vertexMap]);

  const componentFaceGeometry = useMemo(() => {
    const geo = new BufferGeometry();
    if (componentOverlay.faces.length < 3) return geo;
    const positions: number[] = [];
    for (let i = 0; i < componentOverlay.faces.length; i += 3) {
      const a = componentOverlay.faces[i];
      const b = componentOverlay.faces[i + 1];
      const c = componentOverlay.faces[i + 2];
      if (!a || !b || !c) continue;
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    }
    geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }, [componentOverlay.faces]);

  useEffect(() => () => componentFaceGeometry.dispose(), [componentFaceGeometry]);

  const hoverOverlay = useMemo(() => {
    if (!hoveredTarget) return { points: [] as Vec3[] };
    const item = geometry.find((entry) => entry.id === hoveredTarget.geometryId);
    if (!item) return { points: [] as Vec3[] };
    const points: Vec3[] = [];
    if (item.type === "vertex") {
      points.push(item.position);
      return { points };
    }
    if (item.type === "polyline") {
      item.vertexIds.forEach((id) => {
        const vertex = vertexMap.get(id);
        if (vertex) points.push(vertex.position);
      });
      return { points };
    }
    if ("mesh" in item) {
      const bounds = computeBoundsForIds([item.id]);
      if (!bounds) return { points };
      const min = bounds.min;
      const max = bounds.max;
      points.push(
        { x: min.x, y: min.y, z: min.z },
        { x: min.x, y: min.y, z: max.z },
        { x: min.x, y: max.y, z: min.z },
        { x: min.x, y: max.y, z: max.z },
        { x: max.x, y: min.y, z: min.z },
        { x: max.x, y: min.y, z: max.z },
        { x: max.x, y: max.y, z: min.z },
        { x: max.x, y: max.y, z: max.z }
      );
      const center = new Vector3();
      bounds.getCenter(center);
      points.push({ x: center.x, y: center.y, z: center.z });
      return { points };
    }
    return { points };
  }, [hoveredTarget, geometry, vertexMap, computeBoundsForIds]);

  useEffect(() => {
    if (pivot.mode !== "selection") return;
    if (selectionPoints.length === 0) {
      setPivotPosition({ x: 0, y: 0, z: 0 });
      return;
    }
    setPivotPosition(centroid(selectionPoints));
  }, [pivot.mode, selectionPoints, setPivotPosition]);
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
        .map((id) => ({ id, point: vertexMap.get(id)?.position }))
        .filter((item): item is { id: string; point: Vec3 } => Boolean(item.point));
      if (points.length === 0) return;
      candidates.push({ point: points[0].point, vertexId: points[0].id });
      if (!polyline.closed && points.length > 1) {
        const last = points[points.length - 1];
        candidates.push({ point: last.point, vertexId: last.id });
      }
    });
    return candidates;
  }, [polylineItems, snapSettings.endpoints, vertexMap]);

  const segmentCandidates = useMemo(() => {
    const segments: SegmentCandidate[] = [];
    polylineItems.forEach((polyline) => {
      const points = polyline.vertexIds
        .map((id) => vertexMap.get(id)?.position)
        .filter(Boolean) as Vec3[];
      for (let i = 0; i < points.length - 1; i += 1) {
        segments.push({ geometryId: polyline.id, index: i, a: points[i], b: points[i + 1] });
      }
      if (polyline.closed && points.length > 2) {
        segments.push({
          geometryId: polyline.id,
          index: points.length - 1,
          a: points[points.length - 1],
          b: points[0],
        });
      }
    });
    return segments;
  }, [polylineItems, vertexMap]);

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

  const getPlacementPlane = (plane: CPlane) => {
    const normal = new Vector3(plane.normal.x, plane.normal.y, plane.normal.z);
    const point = new Vector3(plane.origin.x, plane.origin.y, plane.origin.z);
    return new Plane().setFromNormalAndCoplanarPoint(normal, point);
  };

  const buildAxisDragPlane = (
    axisVec: Vec3,
    pivotPoint: Vec3,
    referenceDirection?: Vec3
  ) => {
    const axis = new Vector3(axisVec.x, axisVec.y, axisVec.z);
    if (axis.lengthSq() < 1e-8) {
      const fallbackNormal = new Vector3(
        cPlane.normal.x,
        cPlane.normal.y,
        cPlane.normal.z
      );
      return new Plane().setFromNormalAndCoplanarPoint(
        fallbackNormal,
        new Vector3(pivotPoint.x, pivotPoint.y, pivotPoint.z)
      );
    }
    axis.normalize();
    const pivot = new Vector3(pivotPoint.x, pivotPoint.y, pivotPoint.z);
    const candidateSources: Array<Vec3 | undefined> = [
      referenceDirection,
      cPlane.normal,
      orientationBasis.xAxis,
      orientationBasis.yAxis,
      orientationBasis.zAxis,
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
    ];

    for (const source of candidateSources) {
      if (!source) continue;
      const reference = new Vector3(source.x, source.y, source.z);
      if (reference.lengthSq() < 1e-8) continue;
      reference.normalize();
      const normal = new Vector3().crossVectors(axis, reference);
      if (normal.lengthSq() < 1e-8) continue;
      normal.normalize();
      return new Plane().setFromNormalAndCoplanarPoint(normal, pivot);
    }

    const fallback = Math.abs(axis.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
    const fallbackNormal = new Vector3().crossVectors(axis, fallback).normalize();
    if (fallbackNormal.lengthSq() < 1e-8) {
      const defaultNormal = new Vector3(
        cPlane.normal.x,
        cPlane.normal.y,
        cPlane.normal.z
      );
      return new Plane().setFromNormalAndCoplanarPoint(defaultNormal, pivot);
    }
    return new Plane().setFromNormalAndCoplanarPoint(fallbackNormal, pivot);
  };

  const placementMatrix = useMemo(() => {
    const matrix = new Matrix4();
    const xAxis = new Vector3(cPlane.xAxis.x, cPlane.xAxis.y, cPlane.xAxis.z);
    const yAxis = new Vector3(cPlane.yAxis.x, cPlane.yAxis.y, cPlane.yAxis.z);
    const normal = new Vector3(cPlane.normal.x, cPlane.normal.y, cPlane.normal.z);
    matrix.makeBasis(xAxis, yAxis, normal);
    matrix.setPosition(
      new Vector3(cPlane.origin.x, cPlane.origin.y, cPlane.origin.z)
    );
    return matrix;
  }, [cPlane]);

  const snapPoint = (point: Vec3) => {
    const snapRadius = gridStep * 0.75;
    let bestPoint: Vec3 | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    let snappedVertexId: string | undefined;
    let snapType = "";

    const consider = (candidate: Vec3, type: string, vertexId?: string) => {
      const d = distance(point, candidate);
      if (d <= snapRadius && d < bestDistance) {
        bestDistance = d;
        bestPoint = candidate;
        snappedVertexId = vertexId;
        snapType = type;
      }
    };

    if (snapSettings.vertices) {
      vertexItems.forEach((vertex) => {
        consider(vertex.position, "vertex", vertex.id);
      });
    }
    if (snapSettings.endpoints) {
      endpointCandidates.forEach((candidate) => {
        consider(candidate.point, "endpoint", candidate.vertexId);
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
      segmentCandidates.forEach((segment) => {
        const nearest = projectPointToPlane(point, cPlane);
        const a2 = projectPointToPlane(segment.a, cPlane);
        const b2 = projectPointToPlane(segment.b, cPlane);
        const denom =
          (b2.u - a2.u) * (b2.u - a2.u) + (b2.v - a2.v) * (b2.v - a2.v);
        if (denom < 1e-8) return;
        const t =
          ((nearest.u - a2.u) * (b2.u - a2.u) +
            (nearest.v - a2.v) * (b2.v - a2.v)) /
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

    if (bestPoint) {
      setSnapIndicator({ point: bestPoint, type: snapType });
      return { point: bestPoint, vertexId: snappedVertexId, type: snapType };
    }
    if (snapSettings.grid) {
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
      setSnapIndicator({ point: snapped, type: "grid" });
      return { point: snapped, type: "grid" };
    }
    setSnapIndicator(null);
    return { point };
  };

  const buildTransformTargets = (overrideIds?: string[]): TransformTargets => {
    const vertexIds = new Set<string>();
    const meshTargets = new Map<
      string,
      { positions: number[]; indices: Set<number> }
    >();

    const addVertexId = (id: string) => {
      if (lockedGeometryIds.includes(id)) return;
      vertexIds.add(id);
    };

    const addMeshIndices = (geometryId: string, mesh: RenderMesh, indices: number[]) => {
      if (lockedGeometryIds.includes(geometryId)) return;
      const entry =
        meshTargets.get(geometryId) ??
        { positions: mesh.positions, indices: new Set<number>() };
      indices.forEach((index) => entry.indices.add(index));
      meshTargets.set(geometryId, entry);
    };

    if (componentSelection.length > 0) {
      componentSelection.forEach((selection) => {
        const item = geometry.find((entry) => entry.id === selection.geometryId);
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
      const idsToUse = overrideIds ?? selectedGeometryIds;
      idsToUse.forEach((id) => {
        if (lockedGeometryIds.includes(id)) return;
        const item = geometry.find((entry) => entry.id === id);
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

  const createGeometryId = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const collectGeometryDependencies = (ids: string[]) => {
    const collected = new Set<string>();
    const stack = [...ids];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || collected.has(current)) continue;
      const item = geometry.find((entry) => entry.id === current);
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

  const duplicateSelectionForTransform = () => {
    if (selectedGeometryIds.length === 0) return null;
    const ids = collectGeometryDependencies(selectedGeometryIds);
    const idMap = new Map<string, string>();
    const cloned = ids
      .map((id) => geometry.find((entry) => entry.id === id))
      .filter(Boolean)
      .map((item) => {
        const prefix =
          item!.type === "vertex"
            ? "vertex"
            : item!.type === "polyline"
              ? "polyline"
              : item!.type === "surface"
                ? "surface"
                : item!.type === "loft"
                  ? "loft"
                  : "extrude";
        const nextId = createGeometryId(prefix);
        idMap.set(item!.id, nextId);
        return { ...structuredClone(item!), id: nextId };
      }) as Geometry[];
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
    addGeometryItems(remapped, {
      selectIds: remapped.map((item) => item.id),
      recordHistory: true,
    });
    return remapped.map((item) => item.id);
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

  const updateComponentSelection = (
    selection: ComponentSelection,
    isMultiSelect: boolean
  ) => {
    if (!isMultiSelect) {
      setComponentSelection([selection]);
      return;
    }
    const existing = componentSelection.find((item) =>
      isSameComponent(item, selection)
    );
    if (existing) {
      setComponentSelection(
        componentSelection.filter((item) => !isSameComponent(item, selection))
      );
      return;
    }
    setComponentSelection([...componentSelection, selection]);
  };

  const applyTransformToTargets = (
    session: TransformSession,
    transformPoint: (point: Vec3) => Vec3
  ) => {
    const updates: Array<{ id: string; data: Partial<Geometry> }> = [];
    session.targets.vertexIds.forEach((id) => {
      const start = session.startVertexPositions.get(id);
      if (!start) return;
      const next = transformPoint(start);
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

  const startTransformSession = (
    mode: TransformMode,
    constraint: TransformConstraint,
    event: ThreeEvent<PointerEvent>,
    overrideIds?: string[],
    temporaryIds?: string[]
  ) => {
    if (!mode) return;
    if (!event.camera || !event.ray) return;
    const targets = buildTransformTargets(overrideIds);
    if (targets.vertexIds.length === 0 && targets.meshTargets.size === 0) return;
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
    targets.meshTargets.forEach((target, geometryId) => {
      const item = geometry.find((entry) => entry.id === geometryId);
      if (!item || !("mesh" in item)) return;
      startMeshPositions.set(geometryId, item.mesh.positions.slice());
      meshExtras.set(geometryId, {
        normals: item.mesh.normals,
        uvs: item.mesh.uvs,
        indices: item.mesh.indices,
      });
    });

    const cameraDir = new Vector3();
    event.camera.getWorldDirection(cameraDir);
    const cameraDirection: Vec3 = {
      x: cameraDir.x,
      y: cameraDir.y,
      z: cameraDir.z,
    };

    let axis: Vec3 | undefined;
    if (constraint.axis) {
      axis =
        constraint.axis === "x"
          ? orientationBasis.xAxis
          : constraint.axis === "y"
            ? orientationBasis.yAxis
            : orientationBasis.zAxis;
    }

    let plane: Plane | undefined;
    if (constraint.kind === "plane" && constraint.plane) {
      const normal =
        constraint.plane === "xy"
          ? orientationBasis.zAxis
          : constraint.plane === "yz"
            ? orientationBasis.xAxis
            : orientationBasis.yAxis;
      plane = new Plane().setFromNormalAndCoplanarPoint(
        new Vector3(normal.x, normal.y, normal.z),
        new Vector3(resolvedPivot.x, resolvedPivot.y, resolvedPivot.z)
      );
    } else if (constraint.kind === "axis" && axis) {
      plane = buildAxisDragPlane(axis, resolvedPivot, cameraDirection);
    } else if (constraint.kind === "screen") {
      plane = new Plane().setFromNormalAndCoplanarPoint(
        new Vector3(cameraDirection.x, cameraDirection.y, cameraDirection.z),
        new Vector3(resolvedPivot.x, resolvedPivot.y, resolvedPivot.z)
      );
    } else if (mode === "rotate" && axis) {
      plane = new Plane().setFromNormalAndCoplanarPoint(
        new Vector3(axis.x, axis.y, axis.z),
        new Vector3(resolvedPivot.x, resolvedPivot.y, resolvedPivot.z)
      );
    }

    const startPoint = plane
      ? (() => {
          const intersection = new Vector3();
          if (!event.ray.intersectPlane(plane, intersection)) return undefined;
          return { x: intersection.x, y: intersection.y, z: intersection.z };
        })()
      : undefined;

    const startVector =
      mode === "rotate" && startPoint
        ? sub(startPoint, resolvedPivot)
        : undefined;

    const startDistance =
      mode === "scale" && startPoint
        ? distance(startPoint, resolvedPivot)
        : undefined;

    transformSessionRef.current = {
      mode,
      orientation: transformOrientation,
      constraint,
      pivot: resolvedPivot,
      basis: orientationBasis,
      axis,
      plane,
      startPoint,
      startVector,
      startDistance,
      targets,
      startVertexPositions,
      startMeshPositions,
      meshExtras,
      historySnapshot: buildModelerSnapshot(),
      temporaryIds,
      previousSelection: selectedGeometryIds,
    };
  };

  const startTransformSessionFromInput = (
    mode: TransformMode,
    constraint: TransformConstraint,
    temporaryIds?: string[],
    previousSelection?: string[]
  ) => {
    if (!mode) return;
    const targets = buildTransformTargets();
    if (targets.vertexIds.length === 0 && targets.meshTargets.size === 0) return;
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
    targets.meshTargets.forEach((target, geometryId) => {
      const item = geometry.find((entry) => entry.id === geometryId);
      if (!item || !("mesh" in item)) return;
      startMeshPositions.set(geometryId, item.mesh.positions.slice());
      meshExtras.set(geometryId, {
        normals: item.mesh.normals,
        uvs: item.mesh.uvs,
        indices: item.mesh.indices,
      });
    });
    let axis: Vec3 | undefined;
    if (constraint.axis) {
      axis =
        constraint.axis === "x"
          ? orientationBasis.xAxis
          : constraint.axis === "y"
            ? orientationBasis.yAxis
            : orientationBasis.zAxis;
    }
    let plane: Plane | undefined;
    if (constraint.kind === "plane" && constraint.plane) {
      const normal =
        constraint.plane === "xy"
          ? orientationBasis.zAxis
          : constraint.plane === "yz"
            ? orientationBasis.xAxis
            : orientationBasis.yAxis;
      plane = new Plane().setFromNormalAndCoplanarPoint(
        new Vector3(normal.x, normal.y, normal.z),
        new Vector3(resolvedPivot.x, resolvedPivot.y, resolvedPivot.z)
      );
    } else if (constraint.kind === "axis" && axis) {
      plane = buildAxisDragPlane(axis, resolvedPivot, lastPointerRayRef.current?.dir ?? undefined);
    } else if (constraint.kind === "screen") {
      const dir = lastPointerRayRef.current?.dir ?? orientationBasis.zAxis;
      plane = new Plane().setFromNormalAndCoplanarPoint(
        new Vector3(dir.x, dir.y, dir.z),
        new Vector3(resolvedPivot.x, resolvedPivot.y, resolvedPivot.z)
      );
    } else if (mode === "rotate" && axis) {
      plane = new Plane().setFromNormalAndCoplanarPoint(
        new Vector3(axis.x, axis.y, axis.z),
        new Vector3(resolvedPivot.x, resolvedPivot.y, resolvedPivot.z)
      );
    }
    transformSessionRef.current = {
      mode,
      orientation: transformOrientation,
      constraint,
      pivot: resolvedPivot,
      basis: orientationBasis,
      axis,
      plane,
      targets,
      startVertexPositions,
      startMeshPositions,
      meshExtras,
      historySnapshot: buildModelerSnapshot(),
      temporaryIds,
      previousSelection: previousSelection ?? selectedGeometryIds,
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
      const axis = session.axis ?? orientationBasis.zAxis;
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

  const resetGizmoDrag = () => {
    gizmoDragRef.current = false;
    setIsGizmoDragging(false);
    if (controlsRef.current) {
      controlsRef.current.enabled = true;
    }
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
    if (session.temporaryIds && session.temporaryIds.length > 0) {
      deleteGeometry(session.temporaryIds, { recordHistory: false });
    }
    if (session.previousSelection) {
      setSelectedGeometryIds(session.previousSelection);
    }
    transformSessionRef.current = null;
    scheduleTransformPreview(null);
    resetGizmoDrag();
  };

  useEffect(() => {
    if (!activeTransformMode && transformSessionRef.current) {
      cancelTransformSession();
    }
  }, [activeTransformMode]);

  const commitTransformSession = () => {
    const session = transformSessionRef.current;
    if (!session) return;
    recordModelerHistory(session.historySnapshot);
    transformSessionRef.current = null;
    scheduleTransformPreview(null);
    resetGizmoDrag();
  };

  const updateTransformFromPointer = (event: ThreeEvent<PointerEvent>) => {
    if (!event.ray) return;
    const session = transformSessionRef.current;
    if (!session) return;
    if (session.typedDelta || session.typedAngle || session.typedScale) return;
    const plane = session.plane;
    if (!plane) return;
    const intersection = new Vector3();
    if (!event.ray.intersectPlane(plane, intersection)) return;
    const hitPoint = { x: intersection.x, y: intersection.y, z: intersection.z };

    if (session.mode === "move") {
      let delta = session.startPoint
        ? sub(hitPoint, session.startPoint)
        : sub(hitPoint, session.pivot);
      if (session.constraint.kind === "axis" && session.axis) {
        const axis = normalize(session.axis);
        const axisDistance = dot(delta, axis);
        const snappedDistance = snapSettings.grid
          ? snapValue(axisDistance)
          : axisDistance;
        delta = scale(axis, snappedDistance);
      } else if (session.constraint.kind === "plane") {
        if (snapSettings.grid) {
          const snappedPivot = snapPoint(add(session.pivot, delta)).point;
          delta = sub(snappedPivot, session.pivot);
        }
      } else if (snapSettings.grid) {
        const snappedPivot = snapPoint(add(session.pivot, delta)).point;
        delta = sub(snappedPivot, session.pivot);
      }
      updateTransformSession(session, { delta });
      return;
    }

    if (session.mode === "rotate" && session.axis && session.startVector) {
      const currentVector = sub(hitPoint, session.pivot);
      const angle = Math.atan2(
        length(cross(session.startVector, currentVector)),
        dot(session.startVector, currentVector)
      );
      const sign = dot(cross(session.startVector, currentVector), session.axis) < 0 ? -1 : 1;
      let signedAngle = angle * sign;
      if (snapSettings.angleStep > 0) {
        const step = (snapSettings.angleStep * Math.PI) / 180;
        signedAngle = Math.round(signedAngle / step) * step;
      }
      updateTransformSession(session, { angle: signedAngle });
      return;
    }

    if (session.mode === "scale") {
      if (session.constraint.kind === "axis" && session.axis) {
        const axis = normalize(session.axis);
        const axisDistance = dot(sub(hitPoint, session.pivot), axis);
        const baseDistance =
          session.startDistance && session.startDistance !== 0
            ? session.startDistance
            : 1;
        let factor = axisDistance / baseDistance;
        if (!Number.isFinite(factor) || factor === 0) factor = 1;
        if (snapSettings.grid) {
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
      if (snapSettings.grid) {
        const step = 0.1;
        factor = Math.round(factor / step) * step;
      }
      updateTransformSession(session, { scale: { x: factor, y: factor, z: factor } });
    }
  };

  const startExtrudeSession = (event: ThreeEvent<PointerEvent>) => {
    if (extrudeProfiles.length === 0) return false;
    if (!event.camera || !event.ray) return false;
    const cameraDir = new Vector3();
    event.camera.getWorldDirection(cameraDir);
    const plane = new Plane().setFromNormalAndCoplanarPoint(
      cameraDir,
      new Vector3(resolvedPivot.x, resolvedPivot.y, resolvedPivot.z)
    );
    const intersection = new Vector3();
    if (!event.ray.intersectPlane(plane, intersection)) return false;
    const axis = normalize(cPlane.normal);
    extrudeSessionRef.current = {
      axis,
      plane,
      startPoint: { x: intersection.x, y: intersection.y, z: intersection.z },
      startDistance: extrudeOptions.distance,
    };
    setExtrudeOptions((prev) => ({
      ...prev,
      directionMode: "cplane",
      direction: cPlane.normal,
    }));
    setIsGumballExtruding(true);
    return true;
  };

  const updateExtrudeFromPointer = (event: ThreeEvent<PointerEvent>) => {
    const session = extrudeSessionRef.current;
    if (!session || !event.ray) return;
    const intersection = new Vector3();
    if (!event.ray.intersectPlane(session.plane, intersection)) return;
    const hitPoint = { x: intersection.x, y: intersection.y, z: intersection.z };
    const delta = sub(hitPoint, session.startPoint);
    const axisDistance = dot(delta, session.axis);
    const nextDistance = Math.max(0.01, session.startDistance + axisDistance);
    setExtrudeOptions((prev) => ({ ...prev, distance: nextDistance }));
  };

  const handleGizmoStart = (handle: GizmoHandle, event: ThreeEvent<PointerEvent>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.nativeEvent?.preventDefault?.();
    const targetElement = event.target as EventTarget & {
      setPointerCapture?: (pointerId: number) => void;
    };
    targetElement.setPointerCapture?.(event.pointerId);
    if (handle.kind === "extrude") {
      const started = startExtrudeSession(event);
      if (started) {
        gizmoDragRef.current = true;
        setIsGumballExtruding(true);
        if (controlsRef.current) {
          controlsRef.current.enabled = false;
        }
      }
      return;
    }
    const modeFromHandle = (() => {
      if (handle.kind === "rotate") return "rotate" as const;
      if (handle.kind === "scale") return "scale" as const;
      return "move" as const;
    })();
    const constraint = (() => {
      if (handle.kind === "axis") {
        return { kind: "axis", axis: handle.axis } as TransformConstraint;
      }
      if (handle.kind === "plane") {
        return { kind: "plane", plane: handle.plane } as TransformConstraint;
      }
      if (handle.kind === "screen") {
        return { kind: "screen" } as TransformConstraint;
      }
      if (handle.kind === "rotate") {
        return { kind: "axis", axis: handle.axis } as TransformConstraint;
      }
      if (handle.kind === "scale") {
        return { kind: "axis", axis: handle.axis } as TransformConstraint;
      }
      return { kind: "screen" } as TransformConstraint;
    })();
    const overrideIds = event.altKey ? duplicateSelectionForTransform() ?? undefined : undefined;
    startTransformSession(modeFromHandle, constraint, event, overrideIds, overrideIds);
    if (transformSessionRef.current) {
      gizmoDragRef.current = true;
      setIsGumballExtruding(false);
      setIsGizmoDragging(true);
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
      updateTransformFromPointer(event);
    }
  };

  const handleGizmoDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!gizmoDragRef.current || !transformSessionRef.current) return;
    updateTransformFromPointer(event);
  };

  const handleGizmoEnd = (event: ThreeEvent<PointerEvent>) => {
    if (!gizmoDragRef.current) return;
    event.stopPropagation();
    const targetElement = event.target as EventTarget & {
      releasePointerCapture?: (pointerId: number) => void;
    };
    targetElement.releasePointerCapture?.(event.pointerId);
    if (transformSessionRef.current) {
      commitTransformSession();
    } else {
      resetGizmoDrag();
    }
  };

  const handlePlaceVertex = (point: Vec3) => {
    const snapped = snapPoint(point).point;
    addGeometryPoint(snapped);
  };

  const buildRectanglePoints = (center: Vec3, width: number, height: number) => {
    const halfW = Math.max(width, 0.0001) / 2;
    const halfH = Math.max(height, 0.0001) / 2;
    const corner = (dx: number, dy: number) =>
      add(
        center,
        add(scale(cPlane.xAxis, dx * halfW), scale(cPlane.yAxis, dy * halfH))
      );
    return [
      corner(-1, -1),
      corner(1, -1),
      corner(1, 1),
      corner(-1, 1),
    ];
  };

  const buildCirclePoints = (center: Vec3, radius: number, segments: number) => {
    const count = Math.max(12, Math.round(segments));
    const safeRadius = Math.max(radius, 0.0001);
    const points: Vec3[] = [];
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count;
      const offset = add(
        scale(cPlane.xAxis, Math.cos(angle) * safeRadius),
        scale(cPlane.yAxis, Math.sin(angle) * safeRadius)
      );
      points.push(add(center, offset));
    }
    return points;
  };

  const handlePlaceRectangle = (point: Vec3) => {
    const snapped = snapPoint(point).point;
    const points = buildRectanglePoints(
      snapped,
      rectangleSettings.width,
      rectangleSettings.height
    );
    addGeometryPolylineFromPoints(points, { closed: true, degree: 1 });
  };

  const handlePlaceCircle = (point: Vec3) => {
    const snapped = snapPoint(point).point;
    const points = buildCirclePoints(
      snapped,
      circleSettings.radius,
      circleSettings.segments
    );
    addGeometryPolylineFromPoints(points, { closed: true, degree: 1 });
  };

  const handlePlacePrimitive = (point: Vec3) => {
    const snapped = snapPoint(point).point;
    const basis = {
      xAxis: cPlane.xAxis,
      yAxis: cPlane.yAxis,
      normal: cPlane.normal,
    };
    const safeSize = Math.max(primitiveSettings.size, 0.0001);
    const safeRadius = Math.max(primitiveSettings.radius, 0.0001);
    const safeHeight = Math.max(primitiveSettings.height, 0.0001);
    const safeTube = Math.max(primitiveSettings.tube, 0.0001);
    let mesh: RenderMesh;
    switch (primitiveSettings.kind) {
      case "sphere":
        mesh = generateSphereMesh(safeRadius, primitiveSettings.radialSegments);
        break;
      case "cylinder":
        mesh = generateCylinderMesh(
          safeRadius,
          safeHeight,
          primitiveSettings.radialSegments
        );
        break;
      case "torus":
        mesh = generateTorusMesh(
          safeRadius,
          safeTube,
          Math.max(12, primitiveSettings.radialSegments),
          Math.max(16, primitiveSettings.tubularSegments)
        );
        break;
      case "box":
      default:
        mesh = generateBoxMesh({ width: safeSize, height: safeSize, depth: safeSize });
        break;
    }
    const worldMesh = transformMesh(mesh, snapped, basis);
    const area = computeMeshArea(worldMesh.positions, worldMesh.indices);
    addGeometryMesh(worldMesh, { area_m2: area });
  };

  const addPolylineVertex = (point: Vec3, existingVertexId?: string) => {
    const snapped = snapPoint(point);
    const vertexId = existingVertexId ?? snapped.vertexId ?? addGeometryPoint(snapped.point);
    const current = polylineDraftRef.current ?? { vertexIds: [], closed: false };
    const lastId = current.vertexIds[current.vertexIds.length - 1];
    if (lastId === vertexId) {
      return;
    }
    const firstId = current.vertexIds[0];
    if (firstId && vertexId === firstId && current.vertexIds.length >= 2) {
      setPolylineDraft((draft) => (draft ? { ...draft, closed: true } : draft));
      commitPolylineDraft(true);
      return;
    }
    setPolylineDraft((draft) => {
      const nextDraft = draft ?? { vertexIds: [], closed: false };
      return {
        ...nextDraft,
        vertexIds: [...nextDraft.vertexIds, vertexId],
      };
    });
  };

  const resetPolylineDraft = () => {
    setPolylineDraft({ vertexIds: [], closed: false });
  };

  const commitPolylineDraft = (closedOverride?: boolean) => {
    if (!polylineDraft || polylineDraft.vertexIds.length < 2) return;
    const wasClosed = closedOverride ?? polylineDraft.closed;
    addGeometryPolyline(polylineDraft.vertexIds, {
      closed: wasClosed,
      degree: 1,
    });
    resetPolylineDraft();
    if (wasClosed) {
      onCommandComplete?.("polyline");
    }
  };

  const parseNumbers = (input: string) =>
    (input.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi) ?? [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

  const parsePointsInput = (input: string) => {
    const numbers = parseNumbers(input);
    if (numbers.length < 2) return [];
    const groupSize = numbers.length % 3 === 0 ? 3 : 2;
    const points: Vec3[] = [];
    for (let i = 0; i + groupSize - 1 < numbers.length; i += groupSize) {
      if (groupSize === 3) {
        points.push({ x: numbers[i], y: numbers[i + 1], z: numbers[i + 2] });
      } else {
        points.push({ x: numbers[i], y: 0, z: numbers[i + 1] });
      }
    }
    return points;
  };

  const parseDegree = (input: string) => {
    const match =
      input.match(/degree\s*=?\s*([1-3])/i) ?? input.match(/\b([1-3])\b/);
    if (!match) return null;
    const value = Number(match[1]);
    if (value < 1 || value > 3) return null;
    return value as 1 | 2 | 3;
  };

  const parseDistance = (input: string) => {
    const match = input.match(/distance\s*=?\s*(-?\d*\.?\d+)/i);
    if (match) return Number(match[1]);
    const numbers = parseNumbers(input);
    return numbers.length > 0 ? numbers[0] : null;
  };

  const buildExtrudeMeshFromSelection = (distanceOverride?: number) => {
    if (extrudeProfiles.length === 0) return null;
    const distance = distanceOverride ?? extrudeOptions.distance;
    const direction =
      extrudeOptions.directionMode === "cplane"
        ? cPlane.normal
        : extrudeOptions.direction;
    return generateExtrudeMesh(
      extrudeProfiles.map((profile) => ({
        points: profile.points,
        closed: profile.closed,
      })),
      {
        direction: normalize(direction),
        distance,
        capped: extrudeOptions.capped,
      }
    );
  };

  const commitExtrudeFromSelection = (distanceOverride?: number) => {
    const mesh = buildExtrudeMeshFromSelection(distanceOverride);
    if (!mesh) return;
    const profileIds = extrudeProfiles.map((profile) => profile.id);
    if (profileIds.length === 0) return;
    const distance = distanceOverride ?? extrudeOptions.distance;
    const direction =
      extrudeOptions.directionMode === "cplane"
        ? cPlane.normal
        : extrudeOptions.direction;
    const extrudeId = addGeometryExtrude(mesh, profileIds, {
      distance,
      direction: normalize(direction),
      capped: extrudeOptions.capped,
    });
    const area = computeMeshArea(mesh.positions, mesh.indices);
    updateGeometry(extrudeId, { area_m2: area, thickness_m: distance });
    setExtrudePreview(null);
  };

  const parseAxisConstraint = (input: string): TransformConstraint | null => {
    const axisMatch = input.match(/axis\s*=?\s*([xyz])\b/i);
    const planeMatch = input.match(/\b(xy|yz|xz)\b/i);
    const screenMatch = input.match(/\bscreen\b/i);
    if (axisMatch) {
      const axis = axisMatch[1].toLowerCase() as "x" | "y" | "z";
      return { kind: "axis", axis };
    }
    if (planeMatch) {
      const plane = planeMatch[1].toLowerCase() as "xy" | "yz" | "xz";
      return { kind: "plane", plane };
    }
    if (screenMatch) return { kind: "screen" };
    return null;
  };

  const parseVectorInput = (input: string): Vec3 | null => {
    const xMatch = input.match(/x\s*=?\s*(-?\d*\.?\d+)/i);
    const yMatch = input.match(/y\s*=?\s*(-?\d*\.?\d+)/i);
    const zMatch = input.match(/z\s*=?\s*(-?\d*\.?\d+)/i);
    if (xMatch || yMatch || zMatch) {
      return {
        x: xMatch ? Number(xMatch[1]) : 0,
        y: yMatch ? Number(yMatch[1]) : 0,
        z: zMatch ? Number(zMatch[1]) : 0,
      };
    }
    const numbers = parseNumbers(input);
    if (numbers.length >= 3) {
      return { x: numbers[0], y: numbers[1], z: numbers[2] };
    }
    if (numbers.length === 2) {
      return { x: numbers[0], y: 0, z: numbers[1] };
    }
    return null;
  };

  const parseScaleInput = (input: string): Vec3 | null => {
    const uniformMatch = input.match(/uniform\s*=?\s*(-?\d*\.?\d+)/i);
    if (uniformMatch) {
      const factor = Number(uniformMatch[1]);
      return { x: factor, y: factor, z: factor };
    }
    const xMatch = input.match(/x\s*=?\s*(-?\d*\.?\d+)/i);
    const yMatch = input.match(/y\s*=?\s*(-?\d*\.?\d+)/i);
    const zMatch = input.match(/z\s*=?\s*(-?\d*\.?\d+)/i);
    if (xMatch || yMatch || zMatch) {
      return {
        x: xMatch ? Number(xMatch[1]) : 1,
        y: yMatch ? Number(yMatch[1]) : 1,
        z: zMatch ? Number(zMatch[1]) : 1,
      };
    }
    const numbers = parseNumbers(input);
    if (numbers.length > 0) {
      const factor = numbers[0];
      return { x: factor, y: factor, z: factor };
    }
    return null;
  };

  const parseAngleInput = (input: string): number | null => {
    const match = input.match(/angle\s*=?\s*(-?\d*\.?\d+)/i);
    const numbers = parseNumbers(input);
    const value = match ? Number(match[1]) : numbers.length > 0 ? numbers[0] : null;
    if (!Number.isFinite(value ?? NaN)) return null;
    return (value ?? 0) * (Math.PI / 180);
  };

  const handleCommandInput = (commandId: string, input: string) => {
    const lower = input.toLowerCase();
    if (commandId === "point") {
      // Allow empty input - vertex placement works via clicking, not typing
      if (input.trim()) {
        const points = parsePointsInput(input);
        points.forEach((point) => handlePlaceVertex(point));
      }
      return;
    }
    if (commandId === "polyline") {
      if (lower.includes("cancel") || lower.includes("reset")) {
        resetPolylineDraft();
        return;
      }
      const closeOverride = lower.includes("close")
        ? true
        : lower.includes("open")
          ? false
          : undefined;
      if (lower.includes("close")) {
        setPolylineDraft((draft) =>
          draft ? { ...draft, closed: true } : { vertexIds: [], closed: true }
        );
      }
      if (lower.includes("open")) {
        setPolylineDraft((draft) =>
          draft ? { ...draft, closed: false } : { vertexIds: [], closed: false }
        );
      }
      if (lower.includes("done") || lower.includes("accept")) {
        commitPolylineDraft(closeOverride);
        return;
      }
      const points = parsePointsInput(input);
      points.forEach((point) => addPolylineVertex(point));
      return;
    }
    if (commandId === "interpolate") {
      const degree = parseDegree(lower);
      if (!degree) return;
      selectedGeometryIds.forEach((id) => {
        const item = geometry.find((entry) => entry.id === id);
        if (item?.type === "polyline") {
          updateGeometry(id, { degree });
        }
      });
      return;
    }
    if (commandId === "loft") {
      if (lower.includes("accept") || lower.includes("done")) {
        if (!loftPreview) return;
        const loftIds = selectedGeometryIds.filter((id) =>
          geometry.some((item) => item.id === id && item.type === "polyline")
        );
        const loftId = addGeometryLoft(loftPreview, loftIds, loftOptions);
        const area = computeMeshArea(loftPreview.positions, loftPreview.indices);
        updateGeometry(loftId, { area_m2: area });
        setLoftPreview(null);
        return;
      }
      if (lower.includes("cancel")) {
        setLoftPreview(null);
        return;
      }
      const degree = parseDegree(lower);
      if (degree) {
        setLoftOptions((prev) => ({ ...prev, degree }));
      }
      if (lower.includes("closed")) {
        setLoftOptions((prev) => ({ ...prev, closed: true }));
      }
      if (lower.includes("open")) {
        setLoftOptions((prev) => ({ ...prev, closed: false }));
      }
      return;
    }
    if (commandId === "surface") {
      if (lower.includes("accept") || lower.includes("done")) {
        if (!surfacePreview) return;
        const loopIds = selectedGeometryIds.filter((id) => {
          const item = geometry.find((entry) => entry.id === id);
          return item?.type === "polyline" && item.closed;
        });
        const surfaceId = addGeometrySurface(
          surfacePreview.mesh,
          loopIds.map((id) => {
            const polyline = geometry.find(
              (item) => item.id === id && item.type === "polyline"
            ) as PolylineGeometry | undefined;
            return polyline?.vertexIds ?? [];
          }),
          surfacePreview.plane
        );
        const area = computeMeshArea(
          surfacePreview.mesh.positions,
          surfacePreview.mesh.indices
        );
        updateGeometry(surfaceId, { area_m2: area });
        setCPlane(surfacePreview.plane);
        setSurfacePreview(null);
        return;
      }
      if (lower.includes("cancel")) {
        setSurfacePreview(null);
        return;
      }
      const epsilonMatch = lower.match(/epsilon\s*=?\s*(-?\d*\.?\d+)/);
      if (epsilonMatch) {
        const epsilon = Number(epsilonMatch[1]);
        if (Number.isFinite(epsilon)) {
          setSurfaceOptions((prev) => ({ ...prev, epsilon }));
        }
      }
      if (lower.includes("plane=world") || lower.includes("plane world")) {
        setSurfaceOptions((prev) => ({ ...prev, planeMode: "world" }));
      }
      if (lower.includes("plane=cplane") || lower.includes("plane cplane")) {
        setSurfaceOptions((prev) => ({ ...prev, planeMode: "cplane" }));
      }
      if (lower.includes("plane=auto") || lower.includes("plane auto")) {
        setSurfaceOptions((prev) => ({ ...prev, planeMode: "auto" }));
      }
      return;
    }
    if (commandId === "extrude") {
      if (lower.includes("accept") || lower.includes("done")) {
        commitExtrudeFromSelection();
        return;
      }
      if (lower.includes("cancel")) {
        setExtrudePreview(null);
        return;
      }
      const distanceValue = parseDistance(lower);
      const shouldAutoCommit =
        Number.isFinite(distanceValue ?? NaN) &&
        !lower.includes("preview") &&
        !lower.includes("set");
      if (Number.isFinite(distanceValue ?? NaN)) {
        setExtrudeOptions((prev) => ({
          ...prev,
          distance: distanceValue ?? prev.distance,
        }));
      }
      if (lower.includes("cap")) {
        setExtrudeOptions((prev) => ({
          ...prev,
          capped: !lower.includes("nocap") && !lower.includes("no-cap"),
        }));
      }
      const axisMatch = lower.match(/axis\s*=?\s*([xyz])/);
      if (axisMatch) {
        const axis = axisMatch[1];
        const direction =
          axis === "x"
            ? { x: 1, y: 0, z: 0 }
            : axis === "y"
              ? { x: 0, y: 1, z: 0 }
              : { x: 0, y: 0, z: 1 };
        setExtrudeOptions((prev) => ({
          ...prev,
          directionMode: "axis",
          direction,
        }));
      }
      if (lower.includes("cplane")) {
        setExtrudeOptions((prev) => ({
          ...prev,
          directionMode: "cplane",
          direction: cPlane.normal,
        }));
      }
      const vectorMatch = lower.match(
        /vector\s*=?\s*(-?\d*\.?\d+)\s*[,\s]\s*(-?\d*\.?\d+)\s*[,\s]\s*(-?\d*\.?\d+)/
      );
      if (vectorMatch) {
        const direction = {
          x: Number(vectorMatch[1]),
          y: Number(vectorMatch[2]),
          z: Number(vectorMatch[3]),
        };
        setExtrudeOptions((prev) => ({
          ...prev,
          directionMode: "vector",
          direction,
        }));
      }
      if (shouldAutoCommit && distanceValue != null) {
        commitExtrudeFromSelection(distanceValue);
        return;
      }
      return;
    }
    if (commandId === "move" || commandId === "transform") {
      if (lower.includes("cancel")) {
        cancelTransformSession();
        return;
      }
      if (lower.includes("accept") || lower.includes("done")) {
        commitTransformSession();
        return;
      }
      if (lower.includes("world")) setTransformOrientation("world");
      if (lower.includes("local")) setTransformOrientation("local");
      if (lower.includes("cplane") || lower.includes("c-plane")) {
        setTransformOrientation("cplane");
      }
      const constraint = parseAxisConstraint(lower) ?? { kind: "screen" };
      if (lower.includes("start")) {
        const idsMatch = lower.match(/ids\s*=?\s*([a-z0-9-_,]+)/);
        const tempIds = idsMatch
          ? idsMatch[1].split(",").map((id) => id.trim()).filter(Boolean)
          : undefined;
        const prevMatch = lower.match(/prev\s*=?\s*([a-z0-9-_,]+)/);
        const prevIds = prevMatch
          ? prevMatch[1].split(",").map((id) => id.trim()).filter(Boolean)
          : undefined;
        if (!transformSessionRef.current) {
          startTransformSessionFromInput("move", constraint, tempIds, prevIds);
        }
        return;
      }
      const delta = parseVectorInput(input);
      if (!delta) return;
      if (!transformSessionRef.current) {
        startTransformSessionFromInput("move", constraint);
      }
      const session = transformSessionRef.current;
      if (!session) return;
      session.typedDelta = delta;
      updateTransformSession(session, { delta });
      return;
    }
    if (commandId === "rotate") {
      if (lower.includes("cancel")) {
        cancelTransformSession();
        return;
      }
      if (lower.includes("accept") || lower.includes("done")) {
        commitTransformSession();
        return;
      }
      if (lower.includes("world")) setTransformOrientation("world");
      if (lower.includes("local")) setTransformOrientation("local");
      if (lower.includes("cplane") || lower.includes("c-plane")) {
        setTransformOrientation("cplane");
      }
      const constraint = parseAxisConstraint(lower) ?? { kind: "axis", axis: "z" };
      const angle = parseAngleInput(input);
      if (angle == null) return;
      if (!transformSessionRef.current) {
        startTransformSessionFromInput("rotate", constraint);
      }
      const session = transformSessionRef.current;
      if (!session) return;
      session.typedAngle = angle;
      updateTransformSession(session, { angle });
      return;
    }
    if (commandId === "scale") {
      if (lower.includes("cancel")) {
        cancelTransformSession();
        return;
      }
      if (lower.includes("accept") || lower.includes("done")) {
        commitTransformSession();
        return;
      }
      if (lower.includes("world")) setTransformOrientation("world");
      if (lower.includes("local")) setTransformOrientation("local");
      if (lower.includes("cplane") || lower.includes("c-plane")) {
        setTransformOrientation("cplane");
      }
      const constraint = parseAxisConstraint(lower) ?? { kind: "screen" };
      const scaleValue = parseScaleInput(input);
      if (!scaleValue) return;
      if (!transformSessionRef.current) {
        startTransformSessionFromInput("scale", constraint);
      }
      const session = transformSessionRef.current;
      if (!session) return;
      session.typedScale = scaleValue;
      updateTransformSession(session, { scale: scaleValue });
      return;
    }
    if (commandId === "cplane") {
      if (lower.includes("world xy") || lower.includes("worldxy")) {
        setCPlane({
          origin: { x: 0, y: 0, z: 0 },
          normal: { x: 0, y: 1, z: 0 },
          xAxis: { x: 1, y: 0, z: 0 },
          yAxis: { x: 0, y: 0, z: 1 },
        });
        return;
      }
      if (lower.includes("world xz") || lower.includes("worldxz")) {
        setCPlane({
          origin: { x: 0, y: 0, z: 0 },
          normal: { x: 0, y: 0, z: 1 },
          xAxis: { x: 1, y: 0, z: 0 },
          yAxis: { x: 0, y: 1, z: 0 },
        });
        return;
      }
      if (lower.includes("world yz") || lower.includes("worldyz")) {
        setCPlane({
          origin: { x: 0, y: 0, z: 0 },
          normal: { x: 1, y: 0, z: 0 },
          xAxis: { x: 0, y: 1, z: 0 },
          yAxis: { x: 0, y: 0, z: 1 },
        });
        return;
      }
      if (lower.includes("selection")) {
        if (selectionPoints.length < 3) return;
        setCPlane(selectionPlane);
      }
      if (lower.includes("3point") || lower.includes("3-point")) {
        setCPlaneDraftPoints([]);
      }
      return;
    }
    if (commandId === "focus") {
      const bounds = computeBoundsForIds(selectedGeometryIds);
      if (bounds) frameBounds(bounds);
      return;
    }
    if (commandId === "frameall") {
      const allIds = visibleGeometry.map((item) => item.id);
      const bounds = computeBoundsForIds(allIds);
      if (bounds) frameBounds(bounds);
      return;
    }
  };

  useEffect(() => {
    if (!commandRequest) return;
    if (commandRequest.id !== activeCommandId) return;
    handleCommandInput(commandRequest.id, commandRequest.input);
  }, [commandRequest, activeCommandId]);

  useEffect(() => {
    if (activeCommandId !== "polyline") {
      setPolylineDraft(null);
    } else if (!polylineDraft) {
      setPolylineDraft({ vertexIds: [], closed: false });
    }
  }, [activeCommandId]);

  const extrudeProfiles = useMemo(
    () =>
      selectedGeometryIds
        .map((id) => geometry.find((item) => item.id === id))
        .filter((item): item is PolylineGeometry => item?.type === "polyline")
        .map((polyline) => ({
          id: polyline.id,
          closed: polyline.closed,
          points: polyline.vertexIds
            .map((id) => vertexMap.get(id)?.position)
            .filter(Boolean) as Vec3[],
        }))
        .filter((profile) => profile.points.length >= 2),
    [geometry, selectedGeometryIds, vertexMap]
  );
  const isExtrudeActive = activeCommandId === "extrude" || isGumballExtruding;
  const canExtrude = extrudeProfiles.length > 0;

  useEffect(() => {
    if (activeCommandId !== "loft") {
      setLoftPreview(null);
      return;
    }
    const selectedProfiles = selectedGeometryIds
      .map((id) => geometry.find((item) => item.id === id))
      .filter((item): item is PolylineGeometry => item?.type === "polyline");
    if (selectedProfiles.length < 2) {
      setLoftPreview(null);
      return;
    }
    const sections = selectedProfiles.map((polyline) =>
      polyline.vertexIds
        .map((id) => vertexMap.get(id)?.position)
        .filter(Boolean) as Vec3[]
    );
    const sectionClosed = selectedProfiles.every((polyline) => polyline.closed);
    const mesh = generateLoftMesh(sections, {
      degree: loftOptions.degree,
      sectionClosed,
      closed: loftOptions.closed,
    });
    setLoftPreview(mesh);
  }, [activeCommandId, selectedGeometryIds, geometry, loftOptions, vertexMap]);

  useEffect(() => {
    if (activeCommandId !== "surface") {
      setSurfacePreview(null);
      return;
    }
    const selectedProfiles = selectedGeometryIds
      .map((id) => geometry.find((item) => item.id === id))
      .filter((item): item is PolylineGeometry => item?.type === "polyline");
    const closedProfiles = selectedProfiles.filter((profile) => profile.closed);
    if (closedProfiles.length === 0) {
      setSurfacePreview(null);
      return;
    }
    const loops = closedProfiles.map((polyline) =>
      polyline.vertexIds
        .map((id) => vertexMap.get(id)?.position)
        .filter(Boolean) as Vec3[]
    );
    const planeMode = surfaceOptions.planeMode;
    const planeOverride: PlaneDefinition = (() => {
      if (planeMode === "world") {
        return {
          origin: { x: 0, y: 0, z: 0 },
          normal: { x: 0, y: 1, z: 0 },
          xAxis: { x: 1, y: 0, z: 0 },
          yAxis: { x: 0, y: 0, z: 1 },
        } satisfies PlaneDefinition;
      }
      if (planeMode === "cplane") {
        return cPlane;
      }
      const fallback = computeBestFitPlane(loops.flat());
      return fallback;
    })();
    const { mesh, plane } = generateSurfaceMesh(loops, planeOverride);
    const resolvedPlane = plane ?? planeOverride;
    const points = loops.flat();
    const maxDistance = points.reduce((max, point) => {
      const d = Math.abs(distanceToPlane(point, resolvedPlane));
      return Math.max(max, d);
    }, 0);
    setSurfacePreview({
      mesh,
      plane: resolvedPlane,
      needsPlaneConfirm: maxDistance > surfaceOptions.epsilon,
    });
  }, [activeCommandId, selectedGeometryIds, geometry, surfaceOptions, cPlane, vertexMap]);

  useEffect(() => {
    if (!isExtrudeActive) {
      setExtrudePreview(null);
      return;
    }
    if (extrudeProfiles.length === 0) {
      setExtrudePreview(null);
      return;
    }
    const direction =
      extrudeOptions.directionMode === "cplane"
        ? cPlane.normal
        : extrudeOptions.direction;
    const mesh = generateExtrudeMesh(
      extrudeProfiles.map((profile) => ({
        points: profile.points,
        closed: profile.closed,
      })),
      {
        direction: normalize(direction),
        distance: extrudeOptions.distance,
        capped: extrudeOptions.capped,
      }
    );
    setExtrudePreview(mesh);
  }, [isExtrudeActive, extrudeProfiles, extrudeOptions, cPlane]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Backspace" && event.key !== "Delete") return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (selectedGeometryIds.length === 0) return;
      deleteGeometry(selectedGeometryIds);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedGeometryIds, deleteGeometry]);

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
        if (transformSessionRef.current) {
          event.preventDefault();
          cancelTransformSession();
        }
        if (activeCommandId) {
          event.preventDefault();
          handleCommandInput(activeCommandId, "cancel");
        }
        return;
      }
      if (event.key === "Enter") {
        if (transformSessionRef.current) {
          event.preventDefault();
          commitTransformSession();
        }
        if (activeCommandId) {
          event.preventDefault();
          handleCommandInput(activeCommandId, "accept");
        }
        return;
      }
      if (event.key === "Tab") {
        if (pickStack.length === 0) return;
        event.preventDefault();
        const nextIndex = (pickIndex + 1) % pickStack.length;
        setPickIndex(nextIndex);
        const nextSelection = pickStack[nextIndex];
        selectGeometry(nextSelection.geometryId, false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    pickStack,
    pickIndex,
    selectionMode,
    selectGeometry,
    updateComponentSelection,
    cancelTransformSession,
    commitTransformSession,
    activeCommandId,
    handleCommandInput,
  ]);

  const polylineDraftPoints = useMemo(() => {
    if (!polylineDraft) return [];
    const points = polylineDraft.vertexIds
      .map((id) => vertexMap.get(id)?.position)
      .filter(Boolean) as Vec3[];
    if (polylineDraft.closed && points.length > 2) {
      return [...points, points[0]];
    }
    return points;
  }, [polylineDraft, vertexMap]);

  const needsPlacementPlane =
    ((isVertexCommand ||
      isPolylineCommand ||
      isRectangleCommand ||
      isCircleCommand ||
      isPrimitiveCommand) &&
      isCommandActive) ||
    Boolean(cPlaneDraftPoints);

  const updateControlsTarget = (target: Vec3) => {
    if (!controlsRef.current) return;
    controlsRef.current.target.set(target.x, target.y, target.z);
    controlsRef.current.update();
    setCameraState({ target });
  };

  const lastCameraSyncRef = useRef<{
    position: Vec3;
    target: Vec3;
  }>({ position: cameraState.position, target: cameraState.target });
  const pendingCameraRef = useRef<{ position: Vec3; target: Vec3 } | null>(null);

  const handleControlsChange = () => {
    if (!controlsRef.current) return;
    const position = controlsRef.current.object?.position;
    const target = controlsRef.current.target;
    if (!position || !target) return;
    const nextPosition = { x: position.x, y: position.y, z: position.z };
    const nextTarget = { x: target.x, y: target.y, z: target.z };
    if (
      !Number.isFinite(nextPosition.x) ||
      !Number.isFinite(nextPosition.y) ||
      !Number.isFinite(nextPosition.z) ||
      !Number.isFinite(nextTarget.x) ||
      !Number.isFinite(nextTarget.y) ||
      !Number.isFinite(nextTarget.z)
    ) {
      return;
    }
    const last = lastCameraSyncRef.current;
    const moved =
      distance(last.position, nextPosition) > 1e-4 ||
      distance(last.target, nextTarget) > 1e-4;
    if (!moved) return;
    pendingCameraRef.current = { position: nextPosition, target: nextTarget };
  };

  const commitCameraState = () => {
    const next = pendingCameraRef.current;
    if (!next) return;
    lastCameraSyncRef.current = next;
    setCameraState(next);
    pendingCameraRef.current = null;
  };

  useEffect(() => {
    if (!controlsRef.current) return;
    if (
      !Number.isFinite(cameraState.position.x) ||
      !Number.isFinite(cameraState.position.y) ||
      !Number.isFinite(cameraState.position.z) ||
      !Number.isFinite(cameraState.target.x) ||
      !Number.isFinite(cameraState.target.y) ||
      !Number.isFinite(cameraState.target.z) ||
      !Number.isFinite(cameraState.up.x) ||
      !Number.isFinite(cameraState.up.y) ||
      !Number.isFinite(cameraState.up.z)
    ) {
      return;
    }
    controlsRef.current.object.position.set(
      cameraState.position.x,
      cameraState.position.y,
      cameraState.position.z
    );
    controlsRef.current.object.up.set(
      cameraState.up.x,
      cameraState.up.y,
      cameraState.up.z
    );
    controlsRef.current.target.set(
      cameraState.target.x,
      cameraState.target.y,
      cameraState.target.z
    );
    controlsRef.current.update();
    lastCameraSyncRef.current = {
      position: cameraState.position,
      target: cameraState.target,
    };
  }, [cameraState.position, cameraState.target, cameraState.up]);

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.zoomSpeed =
      cameraState.zoomSpeed * (cameraState.invertZoom ? -1 : 1);
    controlsRef.current.rotateSpeed = cameraState.orbitSpeed;
    controlsRef.current.panSpeed = cameraState.panSpeed;
    if (cameraState.upright) {
      controlsRef.current.minPolarAngle = 0.01;
      controlsRef.current.maxPolarAngle = Math.PI / 2 - 0.01;
    } else {
      controlsRef.current.minPolarAngle = 0;
      controlsRef.current.maxPolarAngle = Math.PI - 0.01;
    }
    if ("zoomToCursor" in controlsRef.current) {
      (controlsRef.current as unknown as { zoomToCursor: boolean }).zoomToCursor =
        cameraState.zoomToCursor;
    }
  }, [
    cameraState.zoomSpeed,
    cameraState.invertZoom,
    cameraState.orbitSpeed,
    cameraState.panSpeed,
    cameraState.upright,
    cameraState.zoomToCursor,
  ]);

  // Camera target updates only happen via explicit focus/frame commands, not on selection changes
  // This prevents the camera from zooming/moving on every click

  return (
    <Canvas
      style={{ width: "100%", height: "100%", display: "block" }}
      onCreated={({ gl, events }) => {
        setCanvasElement(gl.domElement);
        eventsRef.current = events;
      }}
      camera={{
        position: [cameraState.position.x, cameraState.position.y, cameraState.position.z],
        fov: cameraState.fov,
        up: [cameraState.up.x, cameraState.up.y, cameraState.up.z],
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) {
          if ((event.button === 2 && isPanModifier) || event.button === 1) {
            setIsPanDragging(true);
          }
          return;
        }
        if (
          isPanModifier ||
          isPanDragging ||
          isControlsActive ||
          gizmoDragRef.current ||
          isGizmoDragging ||
          isGumballExtruding ||
          extrudeSessionRef.current
        ) {
          return;
        }
        const threeEvent = toThreePointerEvent(event);
        if (!threeEvent.ray) return;
        if (event.nativeEvent?.stopImmediatePropagation) {
          event.nativeEvent.stopImmediatePropagation();
        }
        if (event.nativeEvent?.preventDefault) {
          event.nativeEvent.preventDefault();
        }
        if (event.nativeEvent?.stopPropagation) {
          event.nativeEvent.stopPropagation();
        }
        threeEvent.stopPropagation();
        const plane = getPlacementPlane(cPlane);
        const intersection = new Vector3();
        if (!threeEvent.ray.intersectPlane(plane, intersection)) return;
        setBoxSelectState({
          start: { x: event.clientX, y: event.clientY },
          end: { x: event.clientX, y: event.clientY },
          startPoint: { x: intersection.x, y: intersection.y, z: intersection.z },
          endPoint: { x: intersection.x, y: intersection.y, z: intersection.z },
        });
      }}
      onPointerMissed={(event) => {
        if (isPanModifier || isPanDragging || isControlsActive) return;
        if (event.button !== 0) return;
        if (!isCommandActive) {
          selectGeometry(null);
          clearComponentSelection();
        }
      }}
      onContextMenu={(event) => {
        const threeEvent = toThreeMouseEvent(event);
        threeEvent.nativeEvent.preventDefault();
        threeEvent.stopPropagation();
      }}
      onPointerMove={(event) => {
        const threeEvent = toThreePointerEvent(event);
        if (isPanModifier || isPanDragging || isControlsActive) return;
        if (!threeEvent.ray) return;
        if (extrudeSessionRef.current) {
          updateExtrudeFromPointer(threeEvent);
          return;
        }
        lastPointerRayRef.current = {
          origin: {
            x: threeEvent.ray.origin.x,
            y: threeEvent.ray.origin.y,
            z: threeEvent.ray.origin.z,
          },
          dir: {
            x: threeEvent.ray.direction.x,
            y: threeEvent.ray.direction.y,
            z: threeEvent.ray.direction.z,
          },
        };
        if (pivot.mode === "cursor") {
          const plane = getPlacementPlane(cPlane);
          const intersection = new Vector3();
          if (threeEvent.ray.intersectPlane(plane, intersection)) {
            setPivotCursorPosition({
              x: intersection.x,
              y: intersection.y,
              z: intersection.z,
            });
          }
        }
        if (boxSelectState) {
          const plane = getPlacementPlane(cPlane);
          const intersection = new Vector3();
          if (threeEvent.ray.intersectPlane(plane, intersection)) {
            setBoxSelectState((current) =>
              current
                ? {
                    ...current,
                    end: { x: event.clientX, y: event.clientY },
                    endPoint: {
                      x: intersection.x,
                      y: intersection.y,
                      z: intersection.z,
                    },
                  }
                : null
            );
          }
          return;
        }
        if (!transformSessionRef.current) {
          const candidates = (threeEvent.intersections ?? [])
            .map((intersection) => intersection.object?.userData?.geometryId)
            .filter((geometryId): geometryId is string => Boolean(geometryId));
          const unique = Array.from(new Set(candidates));
          const nextStack = unique.map((geometryId) => {
            const kind: HoverTarget["kind"] =
              selectionMode === "object" ? "object" : selectionMode;
            return { kind, geometryId };
          });
          if (nextStack.length > 0) {
            setPickStack(nextStack);
            setPickIndex(0);
          } else if (pickStack.length > 0) {
            setPickStack([]);
            setPickIndex(0);
          }
        }
        updateTransformFromPointer(threeEvent);
      }}
      onPointerUp={() => {
        if (extrudeSessionRef.current) {
          commitExtrudeFromSelection();
          extrudeSessionRef.current = null;
          setIsGumballExtruding(false);
          resetGizmoDrag();
          return;
        }
        if (isPanDragging) {
          setIsPanDragging(false);
        }
        if (gizmoDragRef.current && transformSessionRef.current) {
          commitTransformSession();
          return;
        }
        if (gizmoDragRef.current) {
          resetGizmoDrag();
        }
        if (boxSelectState) {
          applyBoxSelection(boxSelectState);
          setBoxSelectState(null);
          return;
        }
        // Keep transform session active for confirm/cancel.
      }}
      onPointerLeave={() => {
        if (extrudeSessionRef.current) {
          extrudeSessionRef.current = null;
          setIsGumballExtruding(false);
          setExtrudePreview(null);
          resetGizmoDrag();
        }
        if (isPanDragging) {
          setIsPanDragging(false);
        }
        if (gizmoDragRef.current) {
          if (transformSessionRef.current) {
            commitTransformSession();
          } else {
            resetGizmoDrag();
          }
        }
      }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[4, 4, 4]} intensity={0.8} />
      {boxSelectState && (
        <Html fullscreen>
          <div
            style={{
              position: "absolute",
              left: Math.min(boxSelectState.start.x, boxSelectState.end.x),
              top: Math.min(boxSelectState.start.y, boxSelectState.end.y),
              width: Math.abs(boxSelectState.end.x - boxSelectState.start.x),
              height: Math.abs(boxSelectState.end.y - boxSelectState.start.y),
              border:
                "1px solid color-mix(in srgb, var(--color-accent) 85%, transparent)",
              background:
                "color-mix(in srgb, var(--color-accent) 18%, transparent)",
              pointerEvents: "none",
            }}
          />
        </Html>
      )}
      {webglStatus === "lost" && (
        <Html fullscreen>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "color-mix(in srgb, var(--color-bg) 75%, transparent)",
              color: "var(--color-text)",
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "0.02em",
              textAlign: "center",
            }}
          >
            WebGL context lost. Try reloading the page.
          </div>
        </Html>
      )}
      {pickStack.length > 1 && (
        <Html fullscreen>
          <div
            style={{
              position: "absolute",
              left: 16,
              top: 16,
              background: "var(--color-glass-strong)",
              color: "var(--color-text)",
              padding: "6px 8px",
              borderRadius: "6px",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              pointerEvents: "none",
            }}
          >
            Cycle: {pickIndex + 1}/{pickStack.length}{" "}
            {pickStack[pickIndex]?.geometryId ?? ""}
          </div>
        </Html>
      )}
      <CPlaneGrid plane={cPlane} gridSettings={gridSettings} />
      {needsPlacementPlane && (
        <mesh
          matrix={placementMatrix}
          matrixAutoUpdate={false}
          onPointerDown={(event) => {
            if (isPanModifier || isPanDragging || isControlsActive) return;
            if (event.button !== 0) return;
            if (!event.ray) return;
            event.stopPropagation();
            const plane = getPlacementPlane(cPlane);
            const intersection = new Vector3();
            if (!event.ray.intersectPlane(plane, intersection)) return;
            const point = { x: intersection.x, y: intersection.y, z: intersection.z };
            if (cPlaneDraftPoints) {
              const nextPoints = [...cPlaneDraftPoints, point];
              if (nextPoints.length >= 3) {
                setCPlane(computeBestFitPlane(nextPoints));
                setCPlaneDraftPoints(null);
              } else {
                setCPlaneDraftPoints(nextPoints);
              }
              return;
            }
            if (isPrimitiveCommand) {
              handlePlacePrimitive(point);
              return;
            }
            if (isRectangleCommand) {
              handlePlaceRectangle(point);
              return;
            }
            if (isCircleCommand) {
              handlePlaceCircle(point);
              return;
            }
            if (isPolylineCommand) {
              addPolylineVertex(point);
            } else {
              handlePlaceVertex(point);
            }
          }}
        >
          <planeGeometry args={[200, 200]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
      {snapIndicator && (
        <mesh
          position={[
            snapIndicator.point.x,
            snapIndicator.point.y,
            snapIndicator.point.z,
          ]}
        >
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshBasicMaterial
            color={SNAP_COLORS[snapIndicator.type] ?? VIEWER_AXIS_PRIMARY_COLOR}
          />
        </mesh>
      )}
      {visibleGeometry.map((item) => {
        const isObjectSelected = selectedGeometryIds.includes(item.id);
        const isComponentSelected = componentSelection.some(
          (selection) => selection.geometryId === item.id
        );
        const isSelected =
          selectionMode === "object" ? isObjectSelected : isComponentSelected;
        const material = resolveMaterialForGeometry(item);
        const isHovered = hoveredTarget?.geometryId === item.id;
        if (item.type === "vertex") {
          const materialSurface = getMaterialSurface(material);
          return (
            <VertexMarker
              key={item.id}
              position={item.position}
              isSelected={isSelected}
              isHovered={isHovered}
              color={getMaterialColor(material)}
              surface={materialSurface}
              userData={{ geometryId: item.id, kind: "vertex" }}
              onPointerDown={(event) => {
                if (isPanModifier || isPanDragging || isControlsActive) return;
                if (event.button !== 0) return;
                event.stopPropagation();
                if (pivot.mode === "picked") {
                  setPivotPickedPosition(item.position);
                }
                if (lockedGeometryIds.includes(item.id)) return;
                if (isVertexCommand) {
                  handlePlaceVertex(item.position);
                  return;
                }
                if (isPolylineCommand) {
                  addPolylineVertex(item.position, item.id);
                  return;
                }
                if (selectionMode === "vertex") {
                  updateComponentSelection(
                    { kind: "vertex", geometryId: item.id, vertexId: item.id },
                    event.shiftKey
                  );
                } else {
                  selectGeometry(item.id, event.shiftKey);
                }
                if (activeCommandId === "move" || activeCommandId === "transform") {
                  const overrideIds = event.altKey
                    ? duplicateSelectionForTransform() ?? undefined
                    : undefined;
                  startTransformSession(
                    "move",
                    { kind: "screen" },
                    event,
                    overrideIds,
                    overrideIds
                  );
                }
              }}
              onContextMenu={(event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation();
                event.nativeEvent.preventDefault();
              }}
              onPointerOver={(event) => {
                if (isPanModifier || isPanDragging || isControlsActive) return;
                event.stopPropagation();
                setHoveredTarget({ kind: "vertex", geometryId: item.id, vertexId: item.id });
              }}
              onPointerOut={(event) => {
                if (isPanModifier || isPanDragging || isControlsActive) return;
                event.stopPropagation();
                setHoveredTarget((current) =>
                  current?.geometryId === item.id && current.kind === "vertex" ? null : current
                );
              }}
            />
          );
        }
        if (item.type === "polyline") {
          const points = item.vertexIds
            .map((id) => vertexMap.get(id)?.position)
            .filter(Boolean) as Vec3[];
          if (points.length < 2) return null;
          const interpolated = interpolatePolyline(
            points,
            item.degree,
            item.closed,
            Math.max(points.length * 6, 24)
          );
          const displayPoints = item.closed
            ? ensureClosedLoop(interpolated)
            : interpolated;
          const linePoints = displayPoints.map(
            (point) => new Vector3(point.x, point.y, point.z)
          );
          const handlePolylinePointerDown = (event: ThreeEvent<PointerEvent>) => {
            if (isPanModifier || isPanDragging || isControlsActive) return;
            if (event.button !== 0) return;
            event.stopPropagation();
            if (pivot.mode === "picked") {
              setPivotPickedPosition({
                x: event.point.x,
                y: event.point.y,
                z: event.point.z,
              });
            }
            if (lockedGeometryIds.includes(item.id)) return;
            const ray = event.ray;
            if (selectionMode === "edge" && ray) {
              const edgePoints = item.closed ? [...points, points[0]] : points;
              const index = findClosestSegmentIndex(
                {
                  x: ray.origin.x,
                  y: ray.origin.y,
                  z: ray.origin.z,
                },
                {
                  x: ray.direction.x,
                  y: ray.direction.y,
                  z: ray.direction.z,
                },
                edgePoints,
                gridStep * 1.5
              );
              if (index >= 0) {
                const nextIndex = index === points.length - 1 ? 0 : index + 1;
                updateComponentSelection(
                  {
                    kind: "edge",
                    geometryId: item.id,
                    edgeIndex: index,
                    vertexIds: [item.vertexIds[index], item.vertexIds[nextIndex]],
                  },
                  event.shiftKey
                );
                return;
              }
            }
            if (selectionMode === "vertex" && ray) {
              const index = findClosestVertexIndex(
                {
                  x: ray.origin.x,
                  y: ray.origin.y,
                  z: ray.origin.z,
                },
                {
                  x: ray.direction.x,
                  y: ray.direction.y,
                  z: ray.direction.z,
                },
                points,
                gridStep * 1.5
              );
              if (index >= 0) {
                updateComponentSelection(
                  {
                    kind: "vertex",
                    geometryId: item.id,
                    vertexId: item.vertexIds[index],
                  },
                  event.shiftKey
                );
                return;
              }
            }
            selectGeometry(item.id, event.shiftKey);
          };
          const handlePolylinePointerOver = (event: ThreeEvent<PointerEvent>) => {
            if (isPanModifier || isPanDragging || isControlsActive) return;
            event.stopPropagation();
            const kind =
              selectionMode === "edge"
                ? "edge"
                : selectionMode === "vertex"
                  ? "vertex"
                  : "object";
            setHoveredTarget({ kind, geometryId: item.id, index: 0 });
          };
          const handlePolylinePointerOut = (event: ThreeEvent<PointerEvent>) => {
            if (isPanModifier || isPanDragging || isControlsActive) return;
            event.stopPropagation();
            setHoveredTarget((current) =>
              current?.geometryId === item.id ? null : current
            );
          };
          const hitCurve = new CatmullRomCurve3(linePoints, item.closed);
          const tubularSegments = Math.max(linePoints.length * 3, 64);
          const hitRadius = Math.max(gridStep * 0.6, 0.05);
          return (
            <group key={item.id}>
              <mesh
                userData={{ geometryId: item.id, kind: "polyline-hit" }}
                onPointerDown={handlePolylinePointerDown}
                onPointerOver={handlePolylinePointerOver}
                onPointerOut={handlePolylinePointerOut}
              >
                <tubeGeometry
                  args={[hitCurve, tubularSegments, hitRadius, 8, item.closed]}
                />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
              <Line
                points={linePoints}
                color={
                  isSelected
                    ? VIEWER_EDGE_SELECTED_COLOR
                    : isHovered
                      ? VIEWER_EDGE_HOVER_COLOR
                      : VIEWER_EDGE_COLOR
                }
                lineWidth={isSelected ? 3 : 2}
                transparent
                opacity={isSelected ? 1 : 0.8}
                userData={{ geometryId: item.id, kind: "polyline" }}
                onPointerDown={handlePolylinePointerDown}
                onContextMenu={(event) => {
                  const threeEvent = toThreeMouseEvent(event);
                  threeEvent.stopPropagation();
                  threeEvent.nativeEvent.preventDefault();
                }}
                onPointerOver={handlePolylinePointerOver}
                onPointerOut={handlePolylinePointerOut}
              />
            </group>
          );
        }
        if ("mesh" in item) {
          return (
            <MeshSurface
              key={item.id}
              mesh={item.mesh}
              material={material}
              isSelected={isSelected}
              isHovered={isHovered}
              displayMode={displayMode}
              isPanModifier={isPanModifier}
              isPanDragging={isPanDragging}
              isControlsActive={isControlsActive}
              viewSettings={viewSettings}
              userData={{ geometryId: item.id, kind: "mesh" }}
              onSelect={(event) => {
                if (lockedGeometryIds.includes(item.id)) return;
                if (pivot.mode === "picked") {
                  setPivotPickedPosition({
                    x: event.point.x,
                    y: event.point.y,
                    z: event.point.z,
                  });
                }
                if (selectionMode === "face" || selectionMode === "edge" || selectionMode === "vertex") {
                  const faceIndex =
                    event.faceIndex ??
                    event.intersections?.[0]?.faceIndex ??
                    null;
                  if (faceIndex == null) return;
                  const indices = item.mesh.indices;
                  const baseIndex = faceIndex * 3;
                  const vertexIndices =
                    indices.length >= baseIndex + 3
                      ? [
                          indices[baseIndex],
                          indices[baseIndex + 1],
                          indices[baseIndex + 2],
                        ]
                      : [baseIndex, baseIndex + 1, baseIndex + 2];
                  if (selectionMode === "face") {
                    updateComponentSelection(
                      {
                        kind: "face",
                        geometryId: item.id,
                        faceIndex,
                        vertexIndices: [
                          vertexIndices[0],
                          vertexIndices[1],
                          vertexIndices[2],
                        ],
                      },
                      event.shiftKey
                    );
                    return;
                  }
                  const a = getMeshPoint(item.mesh, vertexIndices[0]);
                  const b = getMeshPoint(item.mesh, vertexIndices[1]);
                  const c = getMeshPoint(item.mesh, vertexIndices[2]);
                  if (selectionMode === "edge") {
                    const edgeIndex = getTriangleEdgeFromPoint(
                      event.point,
                      a,
                      b,
                      c
                    );
                    const edgeVertices =
                      edgeIndex === 0
                        ? [vertexIndices[0], vertexIndices[1]]
                        : edgeIndex === 1
                          ? [vertexIndices[1], vertexIndices[2]]
                          : [vertexIndices[2], vertexIndices[0]];
                    updateComponentSelection(
                      {
                        kind: "edge",
                        geometryId: item.id,
                        edgeIndex,
                        vertexIndices: [edgeVertices[0], edgeVertices[1]],
                      },
                      event.shiftKey
                    );
                    return;
                  }
                  if (selectionMode === "vertex") {
                    const distances = [
                      distance(event.point, a),
                      distance(event.point, b),
                      distance(event.point, c),
                    ];
                    const minIndex = distances.indexOf(Math.min(...distances));
                    updateComponentSelection(
                      {
                        kind: "vertex",
                        geometryId: item.id,
                        vertexIndex: vertexIndices[minIndex],
                      },
                      event.shiftKey
                    );
                    return;
                  }
                }
                selectGeometry(item.id, event.shiftKey);
              }}
              onHover={(isHovering) =>
                setHoveredTarget(isHovering ? { kind: "object", geometryId: item.id } : null)
              }
            />
          );
        }
        return null;
      })}
      {componentOverlay.vertices.map((point, index) => (
        <mesh key={`component-vertex-${index}`} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[0.04, 10, 10]} />
          <meshBasicMaterial color={VIEWER_SELECTED_COLOR} />
        </mesh>
      ))}
      {hoverOverlay.points.map((point, index) => (
        <mesh key={`hover-point-${index}`} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color={VIEWER_HOVER_COLOR} />
        </mesh>
      ))}
      {componentOverlay.edges.map((edge, index) => (
        <Line
          key={`component-edge-${index}`}
          points={[
            [edge[0].x, edge[0].y, edge[0].z],
            [edge[1].x, edge[1].y, edge[1].z],
          ]}
          color={VIEWER_SELECTED_COLOR}
          lineWidth={3}
        />
      ))}
      {componentOverlay.faces.length > 0 && (
        <mesh geometry={componentFaceGeometry}>
          <meshBasicMaterial
            color={VIEWER_SELECTED_COLOR}
            transparent
            opacity={0.25}
            side={DoubleSide}
          />
        </mesh>
      )}
      <CameraAnimator
        controlsRef={controlsRef}
        animationRef={cameraTransitionRef}
        onUpdate={(position, target) => setCameraState({ position, target })}
      />
      {polylineDraftPoints.length > 1 && (
        <Line
          points={polylineDraftPoints.map((point) => [point.x, point.y, point.z])}
          color={VIEWER_DRAFT_COLOR}
          lineWidth={2}
          dashed
          dashScale={2}
          dashSize={0.4}
          gapSize={0.25}
        />
      )}
      {loftPreview && <PreviewMesh mesh={loftPreview} />}
      {surfacePreview?.mesh && <PreviewMesh mesh={surfacePreview.mesh} />}
      {extrudePreview && <PreviewMesh mesh={extrudePreview} />}
      {(selectionPoints.length > 0 || pivot.mode !== "selection") && (
        <mesh position={[resolvedPivot.x, resolvedPivot.y, resolvedPivot.z]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshBasicMaterial color={VIEWER_SELECTED_COLOR} />
        </mesh>
      )}
      {transformReadout && (
        <Html
          position={[resolvedPivot.x, resolvedPivot.y + 0.18, resolvedPivot.z]}
          center
        >
          <div
            style={{
              background: "var(--color-glass-strong)",
              color: "var(--color-text)",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.02em",
            }}
          >
            {transformReadout}
          </div>
        </Html>
      )}
      {isGizmoVisible && activeTransformMode && (
        <Gizmo
          pivot={resolvedPivot}
          orientation={orientationBasis}
          mode={activeTransformMode}
          onStart={handleGizmoStart}
          onDrag={handleGizmoDrag}
          onEnd={handleGizmoEnd}
          visible={isGizmoVisible}
          showExtrude={isExtrudeActive && canExtrude}
        />
      )}
      <OrbitControls
        ref={controlsRef}
        enableDamping={false}
        enablePan
        enableZoom
        enableRotate={!isCommandActive}
        mouseButtons={orbitMouseButtons}
        onStart={() => {
          if (gizmoDragRef.current) return;
          setIsControlsActive(true);
        }}
        onEnd={() => {
          if (gizmoDragRef.current) return;
          setIsControlsActive(false);
          commitCameraState();
        }}
        onChange={handleControlsChange}
      />
    </Canvas>
  );
};

export default ViewerCanvas;
