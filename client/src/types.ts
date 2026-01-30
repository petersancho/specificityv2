export type WorkflowNode = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: WorkflowNodeData;
  selected?: boolean;
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  selected?: boolean;
};

export type Material = {
  id: string;
  name: string;
  density_kg_m3: number;
  category: string;
  source: string;
};

export type Vec3 = { x: number; y: number; z: number };

export type NURBSCurve = {
  controlPoints: Vec3[];
  knots: number[];
  degree: number;
  weights?: number[];
};

export type NURBSSurface = {
  controlPoints: Vec3[][];
  knotsU: number[];
  knotsV: number[];
  degreeU: number;
  degreeV: number;
  weights?: number[][];
};


export type PlaneDefinition = {
  origin: Vec3;
  normal: Vec3;
  xAxis: Vec3;
  yAxis: Vec3;
};

export type CPlane = PlaneDefinition;

export type RenderMesh = {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
};

export type NurbsCurveGeometry = {
  id: string;
  type: "nurbsCurve";
  nurbs: NURBSCurve;
  closed?: boolean;
  layerId: string;
  area_m2?: number;
  thickness_m?: number;
  sourceNodeId?: string;
  metadata?: Record<string, unknown>;
};

export type NurbsSurfaceGeometry = {
  id: string;
  type: "nurbsSurface";
  nurbs: NURBSSurface;
  mesh?: RenderMesh;
  layerId: string;
  area_m2?: number;
  thickness_m?: number;
  sourceNodeId?: string;
  metadata?: Record<string, unknown>;
};

export type BRepSurface =
  | { kind: "nurbs"; surface: NURBSSurface }
  | { kind: "plane"; plane: PlaneDefinition };

export type BRepCurve =
  | { kind: "nurbs"; curve: NURBSCurve }
  | { kind: "line"; start: Vec3; end: Vec3 };

export type BRepVertex = {
  id: string;
  position: Vec3;
};

export type BRepEdge = {
  id: string;
  curve: BRepCurve;
  vertices: [string, string];
};

export type BRepOrientedEdge = {
  edgeId: string;
  reversed?: boolean;
};

export type BRepLoop = {
  id: string;
  edges: BRepOrientedEdge[];
};

export type BRepFace = {
  id: string;
  surface: BRepSurface;
  loops: string[];
};

export type BRepSolid = {
  id: string;
  faces: string[];
};

export type BRepData = {
  vertices: BRepVertex[];
  edges: BRepEdge[];
  loops: BRepLoop[];
  faces: BRepFace[];
  solids?: BRepSolid[];
};

export type VoxelGrid = {
  resolution: { x: number; y: number; z: number };
  bounds: { min: Vec3; max: Vec3 };
  cellSize: Vec3;
  densities: number[];
};

export type VertexGeometry = {
  id: string;
  type: "vertex";
  position: Vec3;
  layerId: string;
  area_m2?: number;
  thickness_m?: number;
  sourceNodeId?: string;
  metadata?: Record<string, unknown>;
};

export type PolylineGeometry = {
  id: string;
  type: "polyline";
  vertexIds: string[];
  closed: boolean;
  degree: 1 | 2 | 3;
  nurbs?: NURBSCurve;
  layerId: string;
  area_m2?: number;
  thickness_m?: number;
  sourceNodeId?: string;
  metadata?: Record<string, unknown>;
};

export type SurfaceGeometry = {
  id: string;
  type: "surface";
  mesh: RenderMesh;
  nurbs?: NURBSSurface;
  loops: string[][];
  plane?: PlaneDefinition;
  layerId: string;
  area_m2?: number;
  thickness_m?: number;
  sourceNodeId?: string;
  metadata?: Record<string, unknown>;
};

export type LoftGeometry = {
  id: string;
  type: "loft";
  mesh: RenderMesh;
  sectionIds: string[];
  degree: 1 | 2 | 3;
  closed: boolean;
  layerId: string;
  area_m2?: number;
  thickness_m?: number;
  sourceNodeId?: string;
  metadata?: Record<string, unknown>;
};

export type ExtrudeGeometry = {
  id: string;
  type: "extrude";
  mesh: RenderMesh;
  profileIds: string[];
  distance: number;
  direction: Vec3;
  capped: boolean;
  layerId: string;
  area_m2?: number;
  thickness_m?: number;
  sourceNodeId?: string;
  metadata?: Record<string, unknown>;
};

export type PrimitiveKind =
  | "box"
  | "sphere"
  | "cylinder"
  | "torus"
  | "pyramid"
  | "tetrahedron"
  | "octahedron"
  | "icosahedron"
  | "dodecahedron"
  | "hemisphere"
  | "capsule"
  | "disk"
  | "ring"
  | "triangularPrism"
  | "pentagonalPrism"
  | "hexagonalPrism"
  | "torusKnot"
  | "utahTeapot"
  | "frustum"
  | "mobiusStrip"
  | "ellipsoid"
  | "wedge"
  | "sphericalCap"
  | "bipyramid"
  | "rhombicDodecahedron"
  | "truncatedCube"
  | "truncatedOctahedron"
  | "truncatedIcosahedron"
  | "pipe"
  | "superellipsoid"
  | "hyperbolicParaboloid"
  | "geodesicDome"
  | "oneSheetHyperboloid";

export type MeshPrimitiveInfo = {
  kind: PrimitiveKind;
  origin: Vec3;
  dimensions?: { width: number; height: number; depth: number };
  radius?: number;
  height?: number;
  tube?: number;
  innerRadius?: number;
  topRadius?: number;
  capHeight?: number;
  detail?: number;
  exponent1?: number;
  exponent2?: number;
  params?: Record<string, number>;
};

export type MeshGeometry = {
  id: string;
  type: "mesh";
  mesh: RenderMesh;
  layerId: string;
  primitive?: MeshPrimitiveInfo;
  area_m2?: number;
  thickness_m?: number;
  sourceNodeId?: string;
  metadata?: Record<string, unknown>;
};

export type MeshPrimitiveGeometry = MeshGeometry;

export type BRepGeometry = {
  id: string;
  type: "brep";
  brep: BRepData;
  mesh?: RenderMesh;
  layerId: string;
  area_m2?: number;
  thickness_m?: number;
  sourceNodeId?: string;
  metadata?: Record<string, unknown>;
};

export type Geometry =
  | VertexGeometry
  | PolylineGeometry
  | SurfaceGeometry
  | LoftGeometry
  | ExtrudeGeometry
  | MeshGeometry
  | NurbsCurveGeometry
  | NurbsSurfaceGeometry
  | BRepGeometry;

export type SelectionMode = "object" | "vertex" | "edge" | "face";

export type ComponentSelection =
  | {
      kind: "vertex";
      geometryId: string;
      vertexId?: string;
      vertexIndex?: number;
    }
  | {
      kind: "edge";
      geometryId: string;
      edgeIndex: number;
      vertexIds?: [string, string];
      vertexIndices?: [number, number];
    }
  | {
      kind: "face";
      geometryId: string;
      faceIndex: number;
      vertexIndices: [number, number, number];
    };

export type TransformMode = "move" | "rotate" | "scale" | null;
export type TransformOrientation = "world" | "local" | "view" | "cplane";
export type GumballAlignment = "boundingBox" | "cplane";
export type PivotMode = "world" | "selection" | "cursor" | "picked" | "origin";

export type GumballStepSettings = {
  distance: number;
  angle: number;
};

export type DisplayMode =
  | "shaded"
  | "wireframe"
  | "shaded_edges"
  | "ghosted"
  | "silhouette";

export type ViewSettings = {
  backfaceCulling: boolean;
  showNormals: boolean;
  sheen: number;
  showPointPickDebug?: boolean;
  showEdges?: boolean;
  showControlPoints?: boolean;
};

export type GumballSettings = {
  clickToStep: boolean;
};

export type SnapSettings = {
  grid: boolean;
  vertices: boolean;
  endpoints: boolean;
  midpoints: boolean;
  intersections: boolean;
  perpendicular: boolean;
  tangent: boolean;
  gridStep: number;
  angleStep: number;
};

export type GridSettings = {
  spacing: number;
  units: string;
  adaptive: boolean;
  majorLinesEvery: number;
};

export type CameraPreset = "standard";

export type CameraState = {
  position: Vec3;
  target: Vec3;
  up: Vec3;
  preset: CameraPreset;
  zoomToCursor: boolean;
  invertZoom: boolean;
  upright: boolean;
  orbitSpeed: number;
  panSpeed: number;
  zoomSpeed: number;
  fov: number;
};

export type PivotState = {
  mode: PivotMode;
  position: Vec3;
  pickedPosition?: Vec3;
  cursorPosition?: Vec3;
};

export type ClipboardPayload = {
  geometry: Geometry[];
  layers: Layer[];
  assignments: MaterialAssignment[];
  selectedGeometryIds: string[];
  pivot: Vec3;
  sourceCPlane?: CPlane;
};

export type SceneNode = {
  id: string;
  name: string;
  type: "group" | "geometry";
  geometryId?: string;
  parentId?: string | null;
  childIds: string[];
  visible: boolean;
  locked: boolean;
};

export type ModelerSnapshot = {
  geometry: Geometry[];
  layers: Layer[];
  assignments: MaterialAssignment[];
  selectedGeometryIds: string[];
  componentSelection: ComponentSelection[];
  selectionMode: SelectionMode;
  cPlane: CPlane;
  pivot: PivotState;
  transformOrientation: TransformOrientation;
  gumballAlignment: GumballAlignment;
  showRotationRings: boolean;
  showMoveArms: boolean;
  gumballSettings?: GumballSettings;
  displayMode: DisplayMode;
  viewSolidity: number;
  viewSettings: ViewSettings;
  snapSettings: SnapSettings;
  gridSettings: GridSettings;
  camera: CameraState;
  hiddenGeometryIds: string[];
  lockedGeometryIds: string[];
  sceneNodes: SceneNode[];
};

export type Layer = {
  id: string;
  name: string;
  geometryIds: string[];
  visible?: boolean;
  locked?: boolean;
  parentId?: string | null;
};

export type MaterialAssignment = {
  layerId?: string;
  geometryId?: string;
  materialId: string;
};

export type TopologyOptimizationSettings = {
  volumeFraction: number;
  penaltyExponent: number;
  filterRadius: number;
  maxIterations: number;
  convergenceTolerance: number;
};

export type TopologyOptimizationProgress = {
  iteration: number;
  objective: number;
  constraint: number;
  status: "idle" | "running" | "complete";
};

type WorkflowPrimitive = number | string | boolean | Vec3 | Record<string, unknown>;

export type WorkflowValue = WorkflowPrimitive | WorkflowValue[] | null | undefined;

export type WorkflowNodeData = {
  label: string;
  geometryId?: string;
  geometryIds?: string[];
  geometryType?: Geometry["type"];
  isLinked?: boolean;
  point?: Vec3;
  pointsText?: string;
  closed?: boolean;
  vertexIds?: string[];
  boxOrigin?: Vec3;
  boxDimensions?: { width: number; height: number; depth: number };
  sphereOrigin?: Vec3;
  sphereRadius?: number;
  moveOffset?: Vec3;
  moveGeometryId?: string;
  rotateGeometryId?: string;
  rotateAxis?: Vec3;
  rotatePivot?: Vec3;
  rotateAngle?: number;
  scaleGeometryId?: string;
  scaleVector?: Vec3;
  scalePivot?: Vec3;
  offsetSurfaceGeometryId?: string;
  offsetSurfaceDistance?: number;
  filletGeometryId?: string;
  filletBasePoints?: Vec3[];
  filletEdgesGeometryId?: string;
  filletEdgesBasePositions?: number[];
  filletEdgesBaseIndices?: number[];
  filletEdgesBaseUvs?: number[];
  thickenGeometryId?: string;
  thickenOffset?: number;
  thickenBasePositions?: number[];
  thickenBaseIndices?: number[];
  thickenBaseUvs?: number[];
  plasticwrapGeometryId?: string;
  plasticwrapBasePositions?: number[];
  solidGeometryId?: string;
  fieldTransformGeometryId?: string;
  fieldTransformBasePositions?: number[];
  arraySourceGeometryId?: string;
  topologySettings?: TopologyOptimizationSettings;
  topologyProgress?: TopologyOptimizationProgress;
  groupSize?: { width: number; height: number };
  groupNodeIds?: string[];
  panelScroll?: number;
  parameters?: Record<string, unknown>;
  evaluationError?: string;
  outputs?: Record<string, WorkflowValue>;
};

export type WorkflowState = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type ProjectSavePayload = {
  geometry: Geometry[];
  layers: Layer[];
  assignments: MaterialAssignment[];
  workflow: WorkflowState;
};

export type ProjectSave = {
  id: string;
  name: string;
  savedAt: string;
  project: ProjectSavePayload;
};
