import { create } from "zustand";

type Connection = {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

type NodeChange =
  | { id: string; type: "position"; position: { x: number; y: number } }
  | { id: string; type: "remove" }
  | { id: string; type: "select"; selected: boolean };

type EdgeChange =
  | { id: string; type: "remove" }
  | { id: string; type: "select"; selected: boolean };

function applyNodeChanges(changes: NodeChange[], nodes: any[]): any[] {
  let result = [...nodes];
  for (const change of changes) {
    if (change.type === "position") {
      result = result.map((node) =>
        node.id === change.id
          ? { ...node, position: change.position }
          : node
      );
    } else if (change.type === "remove") {
      result = result.filter((node) => node.id !== change.id);
    } else if (change.type === "select") {
      result = result.map((node) =>
        node.id === change.id
          ? { ...node, selected: change.selected }
          : node
      );
    }
  }
  return result;
}

function applyEdgeChanges(changes: EdgeChange[], edges: any[]): any[] {
  let result = [...edges];
  for (const change of changes) {
    if (change.type === "remove") {
      result = result.filter((edge) => edge.id !== change.id);
    } else if (change.type === "select") {
      result = result.map((edge) =>
        edge.id === change.id
          ? { ...edge, selected: change.selected }
          : edge
      );
    }
  }
  return result;
}

function addEdge(connection: Connection, edges: any[]): any[] {
  const newEdge = {
    id: `${connection.source}-${connection.target}-${Date.now()}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
  };
  return [...edges, newEdge];
}
import type {
  CPlane,
  CameraPreset,
  CameraState,
  ClipboardPayload,
  ComponentSelection,
  DisplayMode,
  Geometry,
  GridSettings,
  Layer,
  Material,
  MaterialAssignment,
  ModelerSnapshot,
  PlaneDefinition,
  PivotMode,
  PivotState,
  ProjectSavePayload,
  PrimitiveKind,
  RenderMesh,
  TopologyOptimizationProgress,
  TopologyOptimizationSettings,
  VertexGeometry,
  PolylineGeometry,
  SurfaceGeometry,
  LoftGeometry,
  ExtrudeGeometry,
  MeshPrimitiveGeometry,
  NURBSCurve,
  SceneNode,
  SelectionMode,
  SnapSettings,
  TransformOrientation,
  GumballAlignment,
  ViewSettings,
  Vec3,
  WorkflowNodeData,
  WorkflowState,
  WorkflowNode,
  WorkflowEdge,
} from "../types";
import {
  SOLIDITY_PRESETS,
  clamp01,
  resolveDisplayModeFromSolidity,
  resolveSolidityFromDisplayMode,
} from "../view/solidity";
import {
  generateSurfaceMesh,
  generateBoxMesh,
  generateSphereMesh,
  generatePrimitiveMesh,
  DEFAULT_PRIMITIVE_CONFIG,
  computeMeshArea,
  computeVertexNormals,
} from "../geometry/mesh";
import {
  PRIMITIVE_NODE_CATALOG,
  PRIMITIVE_NODE_KIND_BY_TYPE,
  PRIMITIVE_NODE_TYPE_IDS,
} from "../data/primitiveCatalog";
import { computeArcPolyline } from "../geometry/arc";
import { interpolatePolyline } from "../geometry/curves";
import {
  applyMatrixToPositions,
  createRotationMatrixAroundAxis,
  createScaleMatrixAroundPivot,
  WORLD_BASIS,
} from "../geometry/transform";
import { transformPoint, translation, type Mat4 } from "../math/matrix";
import { evaluateWorkflow } from "../workflow/workflowEngine";
import {
  getDefaultParameters,
  getNodeDefinition,
  isPortTypeCompatible,
  resolveNodeParameters,
  resolveNodePorts,
  resolvePortByKey,
} from "../workflow/nodeRegistry";
import {
  SUPPORTED_WORKFLOW_NODE_TYPES,
  type NodeType,
} from "../workflow/nodeTypes";
import { base64ToArrayBuffer } from "../utils/binary";
import { downloadBlob } from "../utils/download";
import {
  exportMeshToStlAscii,
  mergeRenderMeshes,
  parseStl,
  scaleRenderMesh,
} from "../utils/meshIo";
export type { NodeType } from "../workflow/nodeTypes";

type SaveEntry = {
  id: string;
  name: string;
  savedAt: string;
};

const MAX_WORKFLOW_HISTORY = 40;

const cloneWorkflow = (workflow: WorkflowState): WorkflowState => {
  if (typeof structuredClone === "function") {
    return structuredClone(workflow);
  }
  return JSON.parse(JSON.stringify(workflow)) as WorkflowState;
};

const appendWorkflowHistory = (
  history: WorkflowState[],
  workflow: WorkflowState
) => [...history, cloneWorkflow(workflow)].slice(-MAX_WORKFLOW_HISTORY);

const shouldTrackNodeChange = (changes: NodeChange[]) =>
  changes.some((change) => {
    if (change.type === "remove") return true;
    if (change.type === "position") return true;
    return false;
  });

const shouldTrackEdgeChange = (changes: EdgeChange[]) =>
  changes.some((change) => change.type === "remove");

type ProjectStore = {
  materials: Material[];
  geometry: Geometry[];
  layers: Layer[];
  assignments: MaterialAssignment[];
  selectedGeometryIds: string[];
  selectionMode: SelectionMode;
  componentSelection: ComponentSelection[];
  sceneNodes: SceneNode[];
  hiddenGeometryIds: string[];
  lockedGeometryIds: string[];
  cPlane: CPlane;
  transformOrientation: TransformOrientation;
  gumballAlignment: GumballAlignment;
  showRotationRings: boolean;
  pivot: PivotState;
  displayMode: DisplayMode;
  viewSolidity: number;
  viewSettings: ViewSettings;
  snapSettings: SnapSettings;
  gridSettings: GridSettings;
  camera: CameraState;
  clipboard: ClipboardPayload | null;
  modelerHistoryPast: ModelerSnapshot[];
  modelerHistoryFuture: ModelerSnapshot[];
  workflow: WorkflowState;
  workflowHistory: WorkflowState[];
  saves: SaveEntry[];
  currentSaveId: string | null;
  projectName: string;
  setMaterials: (materials: Material[]) => void;
  setSaves: (saves: SaveEntry[]) => void;
  selectGeometry: (id: string | null, isMultiSelect?: boolean) => void;
  setSelectedGeometryIds: (ids: string[]) => void;
  setSelectionMode: (mode: SelectionMode) => void;
  setComponentSelection: (items: ComponentSelection[], merge?: boolean) => void;
  clearComponentSelection: () => void;
  setSceneNodes: (nodes: SceneNode[]) => void;
  renameLayer: (id: string, name: string) => void;
  renameSceneNode: (id: string, name: string) => void;
  setTransformOrientation: (orientation: TransformOrientation) => void;
  setGumballAlignment: (alignment: GumballAlignment) => void;
  setShowRotationRings: (show: boolean) => void;
  setPivotMode: (mode: PivotMode) => void;
  setPivotPosition: (position: Vec3) => void;
  setPivotCursorPosition: (position: Vec3 | null) => void;
  setPivotPickedPosition: (position: Vec3 | null) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setViewSolidity: (value: number) => void;
  setViewSettings: (settings: Partial<ViewSettings>) => void;
  setSnapSettings: (settings: Partial<SnapSettings>) => void;
  setGridSettings: (settings: Partial<GridSettings>) => void;
  setCameraState: (state: Partial<CameraState>) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  setClipboard: (payload: ClipboardPayload | null) => void;
  toggleGeometryVisibility: (id: string, visible?: boolean) => void;
  toggleGeometryLock: (id: string, locked?: boolean) => void;
  createGroup: (name: string, geometryIds: string[]) => string;
  ungroup: (groupId: string) => void;
  recordModelerHistory: (snapshot?: ModelerSnapshot) => void;
  undoModeler: () => void;
  redoModeler: () => void;
  addGeometryPoint: (position?: Vec3) => string;
  addGeometryPolyline: (vertexIds: string[], options?: {
    closed?: boolean;
    degree?: 1 | 2 | 3;
    nurbs?: NURBSCurve;
    layerId?: string;
  }) => string | null;
  addGeometryPolylineFromPoints: (
    points: Vec3[],
    options?: {
      closed?: boolean;
      degree?: 1 | 2 | 3;
      nurbs?: NURBSCurve;
      recordHistory?: boolean;
      selectIds?: string[];
      layerId?: string;
    }
  ) => string | null;
  addGeometrySurface: (
    mesh: RenderMesh,
    loops: string[][],
    plane?: PlaneDefinition
  ) => string;
  addGeometryMesh: (
    mesh: RenderMesh,
    options?: MeshInsertOptions
  ) => string;
  addGeometryBox: (
    options: BoxInsertOptions
  ) => string;
  addGeometrySphere: (
    options: SphereInsertOptions
  ) => string;
  addGeometryLoft: (
    mesh: RenderMesh,
    sectionIds: string[],
    options: { degree: 1 | 2 | 3; closed: boolean }
  ) => string;
  addGeometryExtrude: (
    mesh: RenderMesh,
    profileIds: string[],
    options: { distance: number; direction: Vec3; capped: boolean }
  ) => string;
  addGeometryItems: (
    items: Geometry[],
    options?: { selectIds?: string[]; recordHistory?: boolean }
  ) => void;
  updateGeometryBatch: (
    updates: Array<{ id: string; data: Partial<Geometry> }>,
    options?: { recordHistory?: boolean }
  ) => void;
  updateGeometry: (
    id: string,
    data: Partial<Geometry>,
    options?: { recordHistory?: boolean }
  ) => void;
  deleteGeometry: (
    ids: string[] | string,
    options?: { recordHistory?: boolean }
  ) => void;
  setMaterialAssignment: (assignment: MaterialAssignment) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  addNode: (type: NodeType) => void;
  addNodeAt: (type: NodeType, position: { x: number; y: number }) => void;
  addGeometryReferenceNode: (geometryId?: string) => void;
  syncWorkflowGeometryToRoslyn: (nodeId: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  undoWorkflow: () => void;
  deleteSelectedNodes: () => void;
  loadProject: (project: ProjectSavePayload) => void;
  getProjectPayload: () => ProjectSavePayload;
  recalculateWorkflow: () => void;
  pruneWorkflow: () => void;
  setProjectName: (name: string) => void;
  setCurrentSaveId: (id: string | null) => void;
  setCPlane: (plane: CPlane, options?: { recordHistory?: boolean }) => void;
  resetCPlane: (origin?: Vec3, options?: { recordHistory?: boolean }) => void;
};

const supportedWorkflowNodeTypes = new Set<string>(
  SUPPORTED_WORKFLOW_NODE_TYPES as string[]
);

const PRIMITIVE_NODE_TYPE_SET = new Set<NodeType>(
  PRIMITIVE_NODE_TYPE_IDS as NodeType[]
);

const GEOMETRY_OWNING_NODE_TYPES = new Set<NodeType>([
  "point",
  "line",
  "rectangle",
  "circle",
  "arc",
  "curve",
  "polyline",
  "surface",
  "loft",
  "extrude",
  "primitive",
  ...(PRIMITIVE_NODE_TYPE_IDS as NodeType[]),
  "box",
  "sphere",
  "boolean",
  "offset",
  "geometryArray",
  "extractIsosurface",
  "meshConvert",
  "stlImport",
]);

const pruneWorkflowState = (workflow: WorkflowState): WorkflowState => {
  const nodes = workflow.nodes.filter(
    (node) =>
      !node.type ||
      supportedWorkflowNodeTypes.has(node.type)
  );
  if (nodes.length === workflow.nodes.length) {
    return workflow;
  }
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = workflow.edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );
  return { ...workflow, nodes, edges };
};

let geometrySequence = 0;
let sceneSequence = 0;

const createGeometryId = (prefix: string) =>
  `${prefix}-${Date.now()}-${geometrySequence++}`;

const createSceneNodeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${sceneSequence++}`;

const withDefaultLayerId = (layerId: string | undefined, state: ProjectStore) =>
  layerId ?? state.layers[0]?.id ?? "layer-default";

const defaultGeometry: Geometry = {
  id: "vertex-1",
  type: "vertex",
  position: { x: 0, y: 0, z: 0 },
  layerId: "layer-default",
  area_m2: 1,
  thickness_m: 0.1,
};

const defaultCPlane: CPlane = {
  origin: { x: 0, y: 0, z: 0 },
  normal: { x: 0, y: 1, z: 0 },
  xAxis: { x: 1, y: 0, z: 0 },
  yAxis: { x: 0, y: 0, z: 1 },
};

const defaultSnapSettings: SnapSettings = {
  grid: true,
  vertices: true,
  endpoints: true,
  midpoints: false,
  intersections: false,
  perpendicular: false,
  tangent: false,
  gridStep: 0.25,
  angleStep: 15,
};

const defaultGridSettings: GridSettings = {
  spacing: 1,
  units: "m",
  adaptive: true,
  majorLinesEvery: 5,
};

const defaultViewSettings: ViewSettings = {
  backfaceCulling: false,
  showNormals: false,
  sheen: 0.08,
};

const defaultTopologySettings: TopologyOptimizationSettings = {
  volumeFraction: 0.4,
  penaltyExponent: 3,
  filterRadius: 1.5,
  maxIterations: 80,
  convergenceTolerance: 0.001,
};

const defaultTopologyProgress: TopologyOptimizationProgress = {
  iteration: 0,
  objective: 0,
  constraint: 0,
  status: "idle",
};

const defaultCamera: CameraState = {
  position: { x: 2, y: 2, z: 2 },
  target: { x: 0, y: 0, z: 0 },
  up: { x: 0, y: 1, z: 0 },
  preset: "standard",
  zoomToCursor: true,
  invertZoom: false,
  upright: false,
  orbitSpeed: 1,
  panSpeed: 1,
  zoomSpeed: 1,
  fov: 28,
};

const defaultPivot: PivotState = {
  mode: "selection",
  position: { x: 0, y: 0, z: 0 },
};

const defaultLayers: Layer[] = [
  {
    id: "layer-default",
    name: "Default Layer",
    geometryIds: ["vertex-1"],
    visible: true,
    locked: false,
    parentId: null,
  },
];

const defaultAssignments: MaterialAssignment[] = [
  { layerId: "layer-default", materialId: "concrete" },
];

const createGeometrySceneNode = (geometryId: string, name?: string): SceneNode => ({
  id: createSceneNodeId("node"),
  name: name ?? geometryId,
  type: "geometry" as const,
  geometryId,
  parentId: null,
  childIds: [],
  visible: true,
  locked: false,
});

const defaultSceneNodes: SceneNode[] = [createGeometrySceneNode("vertex-1", "Vertex 1")];

const buildSceneNodesFromGeometry = (geometry: Geometry[]): SceneNode[] =>
  geometry.map((item) =>
    createGeometrySceneNode(
      item.id,
      item.metadata?.label ? String(item.metadata.label) : undefined
    )
  );

const reconcileGeometryCollections = (
  geometry: Geometry[],
  layers: Layer[],
  sceneNodes: SceneNode[],
  assignments: MaterialAssignment[],
  hiddenGeometryIds: string[],
  lockedGeometryIds: string[],
  selectedGeometryIds: string[]
) => {
  const geometryIds = new Set(geometry.map((item) => item.id));
  const geometryByLayer = new Map<string, string[]>();
  geometry.forEach((item) => {
    const layerId = item.layerId ?? "layer-default";
    const list = geometryByLayer.get(layerId);
    if (list) {
      list.push(item.id);
    } else {
      geometryByLayer.set(layerId, [item.id]);
    }
  });

  let nextLayers = layers.map((layer) => ({
    ...layer,
    geometryIds: geometryByLayer.get(layer.id) ?? [],
  }));

  geometryByLayer.forEach((ids, layerId) => {
    if (nextLayers.some((layer) => layer.id === layerId)) return;
    nextLayers = [
      ...nextLayers,
      {
        id: layerId,
        name: layerId,
        geometryIds: ids,
        visible: true,
        locked: false,
        parentId: null,
      },
    ];
  });

  const filteredNodes = sceneNodes.filter(
    (node) => !node.geometryId || geometryIds.has(node.geometryId)
  );
  const existingNodeIds = new Set(filteredNodes.map((node) => node.id));
  const cleanedNodes = filteredNodes.map((node) => ({
    ...node,
    childIds: node.childIds.filter((childId) => existingNodeIds.has(childId)),
  }));
  const geometryIdsInScene = new Set(
    cleanedNodes.filter((node) => node.geometryId).map((node) => node.geometryId as string)
  );
  const missingGeometry = geometry.filter((item) => !geometryIdsInScene.has(item.id));
  const newSceneNodes = missingGeometry.map((item) =>
    createGeometrySceneNode(
      item.id,
      item.metadata?.label ? String(item.metadata.label) : undefined
    )
  );
  const nextSceneNodes = [...cleanedNodes, ...newSceneNodes];

  const nextAssignments = assignments.filter(
    (assignment) => !assignment.geometryId || geometryIds.has(assignment.geometryId)
  );
  const nextHidden = hiddenGeometryIds.filter((id) => geometryIds.has(id));
  const nextLocked = lockedGeometryIds.filter((id) => geometryIds.has(id));
  const nextSelected = selectedGeometryIds.filter((id) => geometryIds.has(id));

  return {
    layers: nextLayers,
    sceneNodes: nextSceneNodes,
    assignments: nextAssignments,
    hiddenGeometryIds: nextHidden,
    lockedGeometryIds: nextLocked,
    selectedGeometryIds: nextSelected,
  };
};

const defaultNodes: WorkflowNode[] = [
  {
    id: "node-geometry-ref",
    type: "geometryReference",
    position: { x: 20, y: 40 },
    data: { label: "Geometry Reference", geometryId: "vertex-1" },
  },
  {
    id: "node-point",
    type: "point",
    position: { x: 220, y: 40 },
    data: {
      label: "Point Generator",
      geometryId: "vertex-1",
      geometryType: "vertex",
      isLinked: true,
      point: { x: 0, y: 0, z: 0 },
    },
  },
];

const defaultEdges: WorkflowEdge[] = [];

const defaultWorkflow: WorkflowState = {
  nodes: defaultNodes,
  edges: defaultEdges,
};

const computeWorkflowOutputs = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  geometry: Geometry[]
) => {
  const outputMap: Record<
    string,
    Record<string, number | string | boolean | Array<number | string | boolean>>
  > = {};
  const resolveGeometry = (geometryId?: string) =>
    geometry.find((item) => item.id === geometryId) ?? geometry[0];

  nodes.forEach((node) => {
    const data = node.data ?? { label: node.type ?? "Node" };
    const outputs: Record<
      string,
      number | string | boolean | Array<number | string | boolean>
    > = {};

    if (node.type === "geometryReference") {
      const selected = resolveGeometry(data.geometryId);
      if (selected) {
        outputs.geometryId = selected.id;
        outputs.layerId = selected.layerId;
        outputs.geometryType = selected.type;
        outputs.isLinked = true;
      }
    }

    if (
      node.type === "point" ||
      node.type === "line" ||
      node.type === "arc" ||
      node.type === "curve" ||
      node.type === "polyline" ||
      node.type === "surface" ||
      node.type === "primitive" ||
      (node.type && PRIMITIVE_NODE_TYPE_SET.has(node.type as NodeType)) ||
      node.type === "box" ||
      node.type === "sphere"
    ) {
      if (data.geometryId) {
        outputs.geometryId = data.geometryId;
        outputs.geometryType =
          data.geometryType ??
          (node.type === "line" || node.type === "arc" || node.type === "curve"
            ? "polyline"
            : node.type === "primitive" ||
                (node.type && PRIMITIVE_NODE_TYPE_SET.has(node.type as NodeType)) ||
                node.type === "box" ||
                node.type === "sphere"
              ? "mesh"
              : node.type);
        outputs.isLinked = true;
      }
      if (node.type === "box" && data.boxDimensions) {
        const { width, height, depth } = data.boxDimensions;
        outputs.volume_m3 = (width ?? 0) * (height ?? 0) * (depth ?? 0);
      }
      if (node.type === "sphere" && data.sphereRadius != null) {
        outputs.volume_m3 = (4 / 3) * Math.PI * Math.pow(data.sphereRadius, 3);
      }
    }

    if (node.type === "topologyOptimize") {
      const settings = data.topologySettings ?? defaultTopologySettings;
      const progress = data.topologyProgress ?? defaultTopologyProgress;
      outputs.volumeFraction = settings.volumeFraction;
      outputs.penaltyExponent = settings.penaltyExponent;
      outputs.filterRadius = settings.filterRadius;
      outputs.maxIterations = settings.maxIterations;
      outputs.convergenceTolerance = settings.convergenceTolerance;
      outputs.iteration = progress.iteration;
      outputs.objective = progress.objective;
      outputs.constraint = progress.constraint;
      outputs.status = progress.status;
    }

    outputMap[node.id] = outputs;
  });

  const nextNodes = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      outputs: outputMap[node.id] ?? {},
    },
  }));

  return { nodes: nextNodes };
};

type MeshInsertOptions = {
  recordHistory?: boolean;
  selectIds?: string[];
  layerId?: string;
  area_m2?: number;
  thickness_m?: number;
  sourceNodeId?: string;
  geometryId?: string;
  metadata?: Record<string, unknown>;
  primitive?: MeshPrimitiveGeometry["primitive"];
  origin?: Vec3;
};

type BoxInsertOptions = MeshInsertOptions & {
  origin?: Vec3;
  size: { width: number; height: number; depth: number };
  segments?: number;
};

type SphereInsertOptions = MeshInsertOptions & {
  origin?: Vec3;
  radius: number;
  segments?: number;
};

const readNumberParam = (
  parameters: Record<string, unknown> | undefined,
  key: string,
  fallback: number
) => {
  const value = parameters?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return fallback;
};

const resolvePrimitiveConfig = (
  parameters: Record<string, unknown> | undefined,
  overrides?: Partial<typeof DEFAULT_PRIMITIVE_CONFIG> & { kind?: PrimitiveKind }
) => {
  const base = DEFAULT_PRIMITIVE_CONFIG;
  const kindValue = String(
    overrides?.kind ?? parameters?.kind ?? base.kind
  ) as PrimitiveKind;
  return {
    ...base,
    kind: kindValue,
    size: readNumberParam(parameters, "size", overrides?.size ?? base.size),
    radius: readNumberParam(parameters, "radius", overrides?.radius ?? base.radius),
    height: readNumberParam(parameters, "height", overrides?.height ?? base.height),
    tube: readNumberParam(parameters, "tube", overrides?.tube ?? base.tube),
    innerRadius: readNumberParam(
      parameters,
      "innerRadius",
      overrides?.innerRadius ?? base.innerRadius
    ),
    topRadius: readNumberParam(
      parameters,
      "topRadius",
      overrides?.topRadius ?? base.topRadius
    ),
    capHeight: readNumberParam(
      parameters,
      "capHeight",
      overrides?.capHeight ?? base.capHeight
    ),
    detail: Math.max(
      0,
      Math.round(readNumberParam(parameters, "detail", overrides?.detail ?? base.detail))
    ),
    exponent1: readNumberParam(
      parameters,
      "exponent1",
      overrides?.exponent1 ?? base.exponent1
    ),
    exponent2: readNumberParam(
      parameters,
      "exponent2",
      overrides?.exponent2 ?? base.exponent2
    ),
    radialSegments: Math.max(
      3,
      Math.round(
        readNumberParam(
          parameters,
          "radialSegments",
          overrides?.radialSegments ?? base.radialSegments
        )
      )
    ),
    tubularSegments: Math.max(
      3,
      Math.round(
        readNumberParam(
          parameters,
          "tubularSegments",
          overrides?.tubularSegments ?? base.tubularSegments
        )
      )
    ),
  };
};

const resolvePrimitiveKindForNode = (
  nodeType: NodeType | undefined,
  parameters: Record<string, unknown> | undefined
): PrimitiveKind | null => {
  if (!nodeType) return null;
  if (nodeType === "primitive") {
    return String(parameters?.kind ?? DEFAULT_PRIMITIVE_CONFIG.kind) as PrimitiveKind;
  }
  return PRIMITIVE_NODE_KIND_BY_TYPE.get(nodeType) ?? null;
};

const translateMesh = (mesh: RenderMesh, offset: Vec3): RenderMesh => {
  if (!offset.x && !offset.y && !offset.z) return mesh;
  const positions = mesh.positions.slice();
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] += offset.x ?? 0;
    positions[i + 1] += offset.y ?? 0;
    positions[i + 2] += offset.z ?? 0;
  }
  return { ...mesh, positions };
};

const addVec3 = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});

const subtractVec3 = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});

const buildCirclePoints = (
  center: Vec3,
  radius: number,
  segments: number,
  plane: CPlane
) => {
  const count = Math.max(8, Math.round(segments));
  const points: Vec3[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const alongX = { x: plane.xAxis.x * x, y: plane.xAxis.y * x, z: plane.xAxis.z * x };
    const alongY = { x: plane.yAxis.x * y, y: plane.yAxis.y * y, z: plane.yAxis.z * y };
    points.push(addVec3(center, addVec3(alongX, alongY)));
  }
  return points;
};

const buildRectanglePoints = (
  center: Vec3,
  width: number,
  height: number,
  plane: CPlane
) => {
  const halfW = width * 0.5;
  const halfH = height * 0.5;
  const offsets = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ];
  return offsets.map((offset) => {
    const alongX = {
      x: plane.xAxis.x * offset.x,
      y: plane.xAxis.y * offset.x,
      z: plane.xAxis.z * offset.x,
    };
    const alongY = {
      x: plane.yAxis.x * offset.y,
      y: plane.yAxis.y * offset.y,
      z: plane.yAxis.z * offset.y,
    };
    return addVec3(center, addVec3(alongX, alongY));
  });
};

const isNearlyZeroVec3 = (value: Vec3, epsilon = 1e-6) =>
  Math.abs(value.x) + Math.abs(value.y) + Math.abs(value.z) <= epsilon;

const lengthVec3 = (value: Vec3) =>
  Math.sqrt(value.x * value.x + value.y * value.y + value.z * value.z);

const scaleVec3 = (value: Vec3, scale: number): Vec3 => ({
  x: value.x * scale,
  y: value.y * scale,
  z: value.z * scale,
});

const normalizeVec3Safe = (value: Vec3, fallback: Vec3): Vec3 => {
  const len = lengthVec3(value);
  if (!Number.isFinite(len) || len < 1e-8) return fallback;
  return scaleVec3(value, 1 / len);
};

const isNearlyEqualVec3 = (a: Vec3, b: Vec3, epsilon = 1e-5) =>
  Math.abs(a.x - b.x) <= epsilon &&
  Math.abs(a.y - b.y) <= epsilon &&
  Math.abs(a.z - b.z) <= epsilon;

const applyMoveDeltaToGeometry = (
  geometryById: Map<string, Geometry>,
  updates: Map<string, Partial<Geometry>>,
  geometryId: string,
  delta: Vec3
) => {
  const geometry = geometryById.get(geometryId);
  if (!geometry || isNearlyZeroVec3(delta)) return;

  if (geometry.type === "vertex") {
    const existing = updates.get(geometryId) as Partial<VertexGeometry> | undefined;
    const basePosition = existing?.position ?? geometry.position;
    updates.set(geometryId, {
      ...(existing ?? {}),
      position: addVec3(basePosition, delta),
    });
    return;
  }

  if (geometry.type === "polyline") {
    geometry.vertexIds.forEach((vertexId) => {
      const vertex = geometryById.get(vertexId);
      if (!vertex || vertex.type !== "vertex") return;
      const existing = updates.get(vertexId) as Partial<VertexGeometry> | undefined;
      const basePosition = existing?.position ?? vertex.position;
      updates.set(vertexId, {
        ...(existing ?? {}),
        position: addVec3(basePosition, delta),
      });
    });
    return;
  }

  if ("mesh" in geometry && geometry.mesh) {
    const existing = updates.get(geometryId) as Partial<
      SurfaceGeometry | LoftGeometry | ExtrudeGeometry | MeshPrimitiveGeometry
    > | undefined;
    const baseMesh = (existing?.mesh ?? geometry.mesh) as RenderMesh;
    const positions = baseMesh.positions.slice();
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += delta.x;
      positions[i + 1] += delta.y;
      positions[i + 2] += delta.z;
    }
    const nextMesh: RenderMesh = {
      ...baseMesh,
      positions,
    };
    const nextUpdate: Partial<Geometry> & {
      primitive?: MeshPrimitiveGeometry["primitive"];
      plane?: PlaneDefinition;
    } = {
      ...(existing ?? {}),
      mesh: nextMesh,
    };
    if (geometry.type === "mesh" && geometry.primitive) {
      const existingMesh = existing as Partial<MeshPrimitiveGeometry> | undefined;
      const basePrimitive = (existingMesh?.primitive ?? geometry.primitive) as NonNullable<
        MeshPrimitiveGeometry["primitive"]
      >;
      nextUpdate.primitive = {
        ...basePrimitive,
        origin: addVec3(basePrimitive.origin, delta),
      };
    }
    if ("plane" in geometry && geometry.plane) {
      const existingSurface = existing as Partial<SurfaceGeometry> | undefined;
      const basePlane = (existingSurface?.plane ?? geometry.plane) as PlaneDefinition;
      nextUpdate.plane = {
        ...basePlane,
        origin: addVec3(basePlane.origin, delta),
      };
    }
    updates.set(geometryId, nextUpdate);
  }
};

const applyMatrixToGeometry = (
  geometryById: Map<string, Geometry>,
  updates: Map<string, Partial<Geometry>>,
  geometryId: string,
  matrix: Mat4
) => {
  const geometry = geometryById.get(geometryId);
  if (!geometry) return;

  if (geometry.type === "vertex") {
    const existing = updates.get(geometryId) as Partial<VertexGeometry> | undefined;
    const basePosition = existing?.position ?? geometry.position;
    const nextPosition = transformPoint(matrix, basePosition);
    updates.set(geometryId, {
      ...(existing ?? {}),
      position: nextPosition,
    });
    return;
  }

  if (geometry.type === "polyline") {
    geometry.vertexIds.forEach((vertexId) => {
      const vertex = geometryById.get(vertexId);
      if (!vertex || vertex.type !== "vertex") return;
      const existing = updates.get(vertexId) as Partial<VertexGeometry> | undefined;
      const basePosition = existing?.position ?? vertex.position;
      const nextPosition = transformPoint(matrix, basePosition);
      updates.set(vertexId, {
        ...(existing ?? {}),
        position: nextPosition,
      });
    });
    return;
  }

  if ("mesh" in geometry && geometry.mesh) {
    const existing = updates.get(geometryId) as Partial<
      SurfaceGeometry | LoftGeometry | ExtrudeGeometry | MeshPrimitiveGeometry
    > | undefined;
    const baseMesh = (existing?.mesh ?? geometry.mesh) as RenderMesh;
    const positions = applyMatrixToPositions(baseMesh.positions, matrix);
    const normals =
      baseMesh.indices.length > 0 ? computeVertexNormals(positions, baseMesh.indices) : baseMesh.normals;
    const nextMesh: RenderMesh = {
      ...baseMesh,
      positions,
      normals,
    };
    const nextArea = computeMeshArea(positions, baseMesh.indices);
    const nextUpdate: Partial<Geometry> & {
      primitive?: MeshPrimitiveGeometry["primitive"];
    } = {
      ...(existing ?? {}),
      mesh: nextMesh,
      area_m2: nextArea,
    };
    if (geometry.type === "mesh" && geometry.primitive) {
      const existingMesh = existing as Partial<MeshPrimitiveGeometry> | undefined;
      const basePrimitive = (existingMesh?.primitive ?? geometry.primitive) as NonNullable<
        MeshPrimitiveGeometry["primitive"]
      >;
      nextUpdate.primitive = {
        ...basePrimitive,
        origin: transformPoint(matrix, basePrimitive.origin),
      };
    }
    updates.set(geometryId, nextUpdate);
  }
};

const asVec3 = (value: unknown): Vec3 | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { x?: unknown; y?: unknown; z?: unknown };
  if (
    typeof candidate.x === "number" &&
    typeof candidate.y === "number" &&
    typeof candidate.z === "number" &&
    Number.isFinite(candidate.x) &&
    Number.isFinite(candidate.y) &&
    Number.isFinite(candidate.z)
  ) {
    return { x: candidate.x, y: candidate.y, z: candidate.z };
  }
  return null;
};

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return fallback;
};

const readVec3Parameter = (
  parameters: Record<string, unknown> | undefined,
  prefix: string,
  fallback: Vec3
): Vec3 => {
  if (!parameters) return fallback;
  return {
    x: asNumber(parameters[`${prefix}X`], fallback.x),
    y: asNumber(parameters[`${prefix}Y`], fallback.y),
    z: asNumber(parameters[`${prefix}Z`], fallback.z),
  };
};

const applyMoveNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "move") return node;
    const outputs = node.data?.outputs;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    const offset = asVec3(outputs?.offset);
    if (!geometryId || !offset) return node;

    const previousGeometryId = node.data?.moveGeometryId ?? null;
    const previousOffset = node.data?.moveOffset ?? { x: 0, y: 0, z: 0 };
    const baseOffset =
      previousGeometryId && previousGeometryId === geometryId
        ? previousOffset
        : { x: 0, y: 0, z: 0 };
    const delta = subtractVec3(offset, baseOffset);
    if (!isNearlyZeroVec3(delta)) {
      applyMoveDeltaToGeometry(geometryById, updates, geometryId, delta);
      didApply = true;
    }

    return {
      ...node,
      data: {
        ...node.data,
        moveGeometryId: geometryId,
        moveOffset: offset,
      },
    };
  });

  if (!didApply) {
    return { nodes: nextNodes, geometry, didApply };
  }

  const nextGeometry = geometry.map((item) => {
    const update = updates.get(item.id);
    return update ? ({ ...item, ...update } as Geometry) : item;
  });

  return { nodes: nextNodes, geometry: nextGeometry, didApply };
};

const applyRotateNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "rotate") return node;
    const outputs = node.data?.outputs;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    const axis = asVec3(outputs?.axis);
    const pivot = asVec3(outputs?.pivot) ?? { x: 0, y: 0, z: 0 };
    const angle = asNumber(outputs?.angle, 0);
    if (!geometryId || !axis) {
      return node;
    }
    const axisLength = lengthVec3(axis);
    if (!Number.isFinite(angle) || axisLength < 1e-8) {
      return {
        ...node,
        data: {
          ...node.data,
          rotateGeometryId: geometryId,
          rotateAxis: axis,
          rotatePivot: pivot,
          rotateAngle: angle,
        },
      };
    }

    const previousGeometryId = node.data?.rotateGeometryId ?? null;
    const previousAxis = node.data?.rotateAxis ?? null;
    const previousPivot = node.data?.rotatePivot ?? null;
    const previousAngle = typeof node.data?.rotateAngle === "number" ? node.data.rotateAngle : 0;
    const angleRad = (angle * Math.PI) / 180;

    let applied = false;
    if (previousGeometryId && previousGeometryId === geometryId && previousAxis && previousPivot) {
      const sameAxis = isNearlyEqualVec3(previousAxis, axis);
      const samePivot = isNearlyEqualVec3(previousPivot, pivot);
      if (sameAxis && samePivot) {
        const delta = angle - previousAngle;
        if (Math.abs(delta) > 1e-4) {
          const deltaMatrix = createRotationMatrixAroundAxis(
            pivot,
            axis,
            (delta * Math.PI) / 180
          );
          applyMatrixToGeometry(geometryById, updates, geometryId, deltaMatrix);
          applied = true;
        }
      } else {
        if (Math.abs(previousAngle) > 1e-4) {
          const undoMatrix = createRotationMatrixAroundAxis(
            previousPivot,
            previousAxis,
            (-previousAngle * Math.PI) / 180
          );
          applyMatrixToGeometry(geometryById, updates, geometryId, undoMatrix);
          applied = true;
        }
        if (Math.abs(angle) > 1e-4) {
          const nextMatrix = createRotationMatrixAroundAxis(pivot, axis, angleRad);
          applyMatrixToGeometry(geometryById, updates, geometryId, nextMatrix);
          applied = true;
        }
      }
    } else if (Math.abs(angle) > 1e-4) {
      const nextMatrix = createRotationMatrixAroundAxis(pivot, axis, angleRad);
      applyMatrixToGeometry(geometryById, updates, geometryId, nextMatrix);
      applied = true;
    }

    if (applied) didApply = true;

    return {
      ...node,
      data: {
        ...node.data,
        rotateGeometryId: geometryId,
        rotateAxis: axis,
        rotatePivot: pivot,
        rotateAngle: angle,
      },
    };
  });

  if (!didApply) {
    return { nodes: nextNodes, geometry, didApply };
  }

  const nextGeometry = geometry.map((item) => {
    const update = updates.get(item.id);
    return update ? ({ ...item, ...update } as Geometry) : item;
  });

  return { nodes: nextNodes, geometry: nextGeometry, didApply };
};

const applyScaleNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "scale") return node;
    const outputs = node.data?.outputs;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    const scale = asVec3(outputs?.scale);
    const pivot = asVec3(outputs?.pivot) ?? { x: 0, y: 0, z: 0 };
    if (!geometryId || !scale) {
      return node;
    }

    const previousGeometryId = node.data?.scaleGeometryId ?? null;
    const previousScale = node.data?.scaleVector ?? null;
    const previousPivot = node.data?.scalePivot ?? null;

    const hasScale = Number.isFinite(scale.x) && Number.isFinite(scale.y) && Number.isFinite(scale.z);
    if (!hasScale) {
      return node;
    }

    const nearlyIdentity =
      Math.abs(scale.x - 1) < 1e-4 &&
      Math.abs(scale.y - 1) < 1e-4 &&
      Math.abs(scale.z - 1) < 1e-4;

    let applied = false;
    if (previousGeometryId && previousGeometryId === geometryId && previousScale && previousPivot) {
      const sameScale = isNearlyEqualVec3(previousScale, scale);
      const samePivot = isNearlyEqualVec3(previousPivot, pivot);
      if (!sameScale || !samePivot) {
        if (
          Math.abs(previousScale.x - 1) > 1e-4 ||
          Math.abs(previousScale.y - 1) > 1e-4 ||
          Math.abs(previousScale.z - 1) > 1e-4
        ) {
          const invScale = {
            x: previousScale.x === 0 ? 1 : 1 / previousScale.x,
            y: previousScale.y === 0 ? 1 : 1 / previousScale.y,
            z: previousScale.z === 0 ? 1 : 1 / previousScale.z,
          };
          const undoMatrix = createScaleMatrixAroundPivot(previousPivot, invScale, WORLD_BASIS);
          applyMatrixToGeometry(geometryById, updates, geometryId, undoMatrix);
          applied = true;
        }
        if (!nearlyIdentity) {
          const nextMatrix = createScaleMatrixAroundPivot(pivot, scale, WORLD_BASIS);
          applyMatrixToGeometry(geometryById, updates, geometryId, nextMatrix);
          applied = true;
        }
      }
    } else if (!nearlyIdentity) {
      const nextMatrix = createScaleMatrixAroundPivot(pivot, scale, WORLD_BASIS);
      applyMatrixToGeometry(geometryById, updates, geometryId, nextMatrix);
      applied = true;
    }

    if (applied) didApply = true;

    return {
      ...node,
      data: {
        ...node.data,
        scaleGeometryId: geometryId,
        scaleVector: scale,
        scalePivot: pivot,
      },
    };
  });

  if (!didApply) {
    return { nodes: nextNodes, geometry, didApply };
  }

  const nextGeometry = geometry.map((item) => {
    const update = updates.get(item.id);
    return update ? ({ ...item, ...update } as Geometry) : item;
  });

  return { nodes: nextNodes, geometry: nextGeometry, didApply };
};

const applyLoftNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "loft") return node;
    const outputs = node.data?.outputs;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    const mesh = outputs?.mesh as RenderMesh | undefined;
    if (!geometryId || !mesh) return node;
    const existing = geometryById.get(geometryId);
    if (!existing || !("mesh" in existing)) return node;
    updates.set(geometryId, {
      mesh,
      area_m2: computeMeshArea(mesh.positions, mesh.indices),
    });
    didApply = true;
    return node;
  });

  if (!didApply) {
    return { nodes: nextNodes, geometry, didApply };
  }

  const nextGeometry = geometry.map((item) => {
    const update = updates.get(item.id);
    return update ? ({ ...item, ...update } as Geometry) : item;
  });

  return { nodes: nextNodes, geometry: nextGeometry, didApply };
};

const applyExtrudeNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "extrude") return node;
    const outputs = node.data?.outputs;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    const mesh = outputs?.mesh as RenderMesh | undefined;
    if (!geometryId || !mesh) return node;
    const existing = geometryById.get(geometryId);
    if (!existing || !("mesh" in existing)) return node;
    const direction = asVec3(outputs?.direction);
    const distance = asNumber(outputs?.distance, 0);
    const capped =
      typeof node.data?.parameters?.capped === "boolean"
        ? node.data.parameters.capped
        : true;
    updates.set(geometryId, {
      mesh,
      area_m2: computeMeshArea(mesh.positions, mesh.indices),
      distance,
      direction: direction ?? { x: 0, y: 0, z: 0 },
      capped,
    } as Partial<ExtrudeGeometry>);
    didApply = true;
    return node;
  });

  if (!didApply) {
    return { nodes: nextNodes, geometry, didApply };
  }

  const nextGeometry = geometry.map((item) => {
    const update = updates.get(item.id);
    return update ? ({ ...item, ...update } as Geometry) : item;
  });

  return { nodes: nextNodes, geometry: nextGeometry, didApply };
};

const applyBooleanNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "boolean") return node;
    const outputs = node.data?.outputs;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    const mesh = outputs?.mesh as RenderMesh | undefined;
    if (!geometryId || !mesh) return node;
    const existing = geometryById.get(geometryId);
    if (!existing || !("mesh" in existing)) return node;
    updates.set(geometryId, {
      mesh,
      area_m2: computeMeshArea(mesh.positions, mesh.indices),
    });
    didApply = true;
    return node;
  });

  if (!didApply) {
    return { nodes: nextNodes, geometry, didApply };
  }

  const nextGeometry = geometry.map((item) => {
    const update = updates.get(item.id);
    return update ? ({ ...item, ...update } as Geometry) : item;
  });

  return { nodes: nextNodes, geometry: nextGeometry, didApply };
};

const applyOffsetNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  const itemsToAdd: Geometry[] = [];
  const idsToRemove = new Set<string>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "offset") return node;
    const outputs = node.data?.outputs;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    const pointsRaw = outputs?.points;
    if (!geometryId || !Array.isArray(pointsRaw)) return node;
    const points = pointsRaw
      .map((point) => asVec3(point))
      .filter((point): point is Vec3 => Boolean(point));
    if (points.length < 2) return node;
    const existing = geometryById.get(geometryId);
    if (!existing || existing.type !== "polyline") return node;
    const vertexIds = existing.vertexIds;
    if (vertexIds.length === points.length) {
      vertexIds.forEach((vertexId, index) => {
        const vertex = geometryById.get(vertexId);
        if (!vertex || vertex.type !== "vertex") return;
        updates.set(vertexId, { position: points[index] });
      });
      didApply = true;
      return {
        ...node,
        data: {
          ...node.data,
          vertexIds,
        },
      };
    }
    vertexIds.forEach((vertexId) => idsToRemove.add(vertexId));
    const layerId = existing.layerId ?? "layer-default";
    const nextVertexIds = points.map(() => createGeometryId("vertex"));
    const vertexItems: Geometry[] = points.map((point, index) => ({
      id: nextVertexIds[index],
      type: "vertex",
      position: point,
      layerId,
      area_m2: 1,
      thickness_m: 0.1,
    }));
    updates.set(geometryId, { vertexIds: nextVertexIds });
    itemsToAdd.push(...vertexItems);
    didApply = true;
    return {
      ...node,
      data: {
        ...node.data,
        vertexIds: nextVertexIds,
      },
    };
  });

  if (!didApply && idsToRemove.size === 0 && itemsToAdd.length === 0) {
    return { nodes: nextNodes, geometry, didApply };
  }

  let nextGeometry = geometry
    .filter((item) => !idsToRemove.has(item.id))
    .map((item) => {
      const update = updates.get(item.id);
      return update ? ({ ...item, ...update } as Geometry) : item;
    });
  if (itemsToAdd.length > 0) {
    nextGeometry = [...nextGeometry, ...itemsToAdd];
  }

  return { nodes: nextNodes, geometry: nextGeometry, didApply: true };
};

const applyGeometryArrayNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  const itemsToAdd: Geometry[] = [];
  const idsToRemove = new Set<string>();
  let didApply = false;

  const readAxis = (parameters: Record<string, unknown> | undefined, key: string, fallback: Vec3) =>
    normalizeVec3Safe(readVec3Parameter(parameters, key, fallback), fallback);

  const buildTransforms = (parameters: Record<string, unknown>) => {
    const mode = String(parameters.mode ?? "linear");
    if (mode === "grid") {
      const xAxis = readAxis(parameters, "xAxis", { x: 1, y: 0, z: 0 });
      const yAxis = readAxis(parameters, "yAxis", { x: 0, y: 1, z: 0 });
      const xSpacing = asNumber(parameters.xSpacing, 1);
      const ySpacing = asNumber(parameters.ySpacing, 1);
      const xCount = Math.max(1, Math.round(asNumber(parameters.xCount, 3)));
      const yCount = Math.max(1, Math.round(asNumber(parameters.yCount, 3)));
      const transforms: Mat4[] = [];
      for (let y = 0; y < yCount; y += 1) {
        for (let x = 0; x < xCount; x += 1) {
          const offset = addVec3(scaleVec3(xAxis, x * xSpacing), scaleVec3(yAxis, y * ySpacing));
          transforms.push(translation(offset));
        }
      }
      return transforms;
    }
    if (mode === "polar") {
      const center = readVec3Parameter(parameters, "center", { x: 0, y: 0, z: 0 });
      const axis = readAxis(parameters, "axis", { x: 0, y: 1, z: 0 });
      const count = Math.max(1, Math.round(asNumber(parameters.count, 8)));
      const startAngle = asNumber(parameters.startAngle, 0);
      const sweep = asNumber(parameters.sweep, 360);
      const includeEnd = Boolean(parameters.includeEnd);
      const step = count <= 1 ? 0 : sweep / (includeEnd ? Math.max(1, count - 1) : count);
      const transforms: Mat4[] = [];
      for (let i = 0; i < count; i += 1) {
        const angle = (startAngle + step * i) * (Math.PI / 180);
        transforms.push(createRotationMatrixAroundAxis(center, axis, angle));
      }
      return transforms;
    }
    const direction = readAxis(parameters, "direction", { x: 1, y: 0, z: 0 });
    const spacing = asNumber(parameters.spacing, 1);
    const count = Math.max(1, Math.round(asNumber(parameters.count, 4)));
    const step = scaleVec3(direction, spacing);
    const transforms: Mat4[] = [];
    for (let i = 0; i < count; i += 1) {
      transforms.push(translation(scaleVec3(step, i)));
    }
    return transforms;
  };

  const collectPolylinePoints = (polyline: PolylineGeometry): Vec3[] => {
    const points: Vec3[] = [];
    polyline.vertexIds.forEach((vertexId) => {
      const vertex = geometryById.get(vertexId);
      if (vertex && vertex.type === "vertex") {
        points.push(vertex.position);
      }
    });
    return points;
  };

  const transformMesh = (mesh: RenderMesh, matrix: Mat4): RenderMesh => {
    const positions = applyMatrixToPositions(mesh.positions, matrix);
    const normals =
      mesh.indices.length > 0 ? computeVertexNormals(positions, mesh.indices) : mesh.normals;
    return { ...mesh, positions, normals };
  };

  const cloneGeometry = (source: Geometry, matrix: Mat4): { geometryId: string; items: Geometry[] } | null => {
    const layerId = source.layerId ?? "layer-default";
    if (source.type === "vertex") {
      const geometryId = createGeometryId("vertex");
      const position = transformPoint(matrix, source.position);
      return {
        geometryId,
        items: [
          {
            id: geometryId,
            type: "vertex",
            position,
            layerId,
            area_m2: source.area_m2,
            thickness_m: source.thickness_m,
            metadata: source.metadata,
          },
        ],
      };
    }
    if (source.type === "polyline") {
      const points = collectPolylinePoints(source);
      if (points.length < 2) return null;
      const vertexIds = points.map(() => createGeometryId("vertex"));
      const vertices: Geometry[] = points.map((point, index) => ({
        id: vertexIds[index],
        type: "vertex",
        position: transformPoint(matrix, point),
        layerId,
        area_m2: 1,
        thickness_m: 0.1,
      }));
      const geometryId = createGeometryId("polyline");
      const polyline: Geometry = {
        ...source,
        id: geometryId,
        vertexIds,
        layerId,
      };
      return { geometryId, items: [...vertices, polyline] };
    }
    if ("mesh" in source && source.mesh) {
      const geometryId = createGeometryId(source.type === "mesh" ? "mesh" : source.type);
      const mesh = transformMesh(source.mesh, matrix);
      const base = { ...source, id: geometryId, mesh, layerId } as Geometry;
      if (base.type === "mesh" && base.primitive) {
        base.primitive = {
          ...base.primitive,
          origin: transformPoint(matrix, base.primitive.origin),
        };
      }
      base.area_m2 = computeMeshArea(mesh.positions, mesh.indices);
      return { geometryId, items: [base] };
    }
    return null;
  };

  const updateDuplicate = (
    target: Geometry,
    source: Geometry,
    matrix: Mat4
  ): boolean => {
    if (source.type === "vertex" && target.type === "vertex") {
      const position = transformPoint(matrix, source.position);
      updates.set(target.id, { position });
      return true;
    }
    if (source.type === "polyline" && target.type === "polyline") {
      const points = collectPolylinePoints(source).map((point) => transformPoint(matrix, point));
      if (points.length < 2 || points.length !== target.vertexIds.length) {
        return false;
      }
      target.vertexIds.forEach((vertexId, index) => {
        updates.set(vertexId, { position: points[index] });
      });
      updates.set(target.id, {
        closed: source.closed,
        degree: source.degree,
      });
      return true;
    }
    if ("mesh" in source && source.mesh && "mesh" in target && target.mesh) {
      if (source.type !== target.type) {
        return false;
      }
      const mesh = transformMesh(source.mesh, matrix);
      const area = computeMeshArea(mesh.positions, mesh.indices);
      const baseUpdate = { mesh, area_m2: area };
      if (target.type === "loft" && source.type === "loft") {
        updates.set(target.id, {
          ...baseUpdate,
          sectionIds: source.sectionIds,
          degree: source.degree,
          closed: source.closed,
        });
      }
      if (target.type === "extrude" && source.type === "extrude") {
        updates.set(target.id, {
          ...baseUpdate,
          profileIds: source.profileIds,
          distance: source.distance,
          direction: source.direction,
          capped: source.capped,
        });
      }
      if (target.type === "surface" && source.type === "surface") {
        updates.set(target.id, {
          ...baseUpdate,
          loops: source.loops,
          plane: source.plane,
        });
      }
      if (target.type === "mesh" && source.type === "mesh") {
        updates.set(target.id, {
          ...baseUpdate,
          primitive: source.primitive
            ? {
                ...source.primitive,
                origin: transformPoint(matrix, source.primitive.origin),
              }
            : undefined,
        });
      } else if (
        target.type !== "loft" &&
        target.type !== "extrude" &&
        target.type !== "surface"
      ) {
        updates.set(target.id, baseUpdate);
      }
      return true;
    }
    return false;
  };

  const nextNodes = nodes.map((node) => {
    if (node.type !== "geometryArray") return node;
    const outputs = node.data?.outputs;
    const sourceId = typeof outputs?.geometry === "string" ? outputs.geometry : null;
    const existingIds = Array.isArray(node.data?.geometryIds) ? node.data.geometryIds : [];
    if (!sourceId) {
      if (existingIds.length > 0) {
        existingIds.forEach((id) => idsToRemove.add(id));
        didApply = true;
      }
      return {
        ...node,
        data: {
          ...node.data,
          geometryIds: [],
          arraySourceGeometryId: undefined,
        },
      };
    }
    const sourceGeometry = geometryById.get(sourceId);
    if (!sourceGeometry) return node;
    const parameters = resolveNodeParameters(node);
    const transforms = buildTransforms(parameters);
    const desiredCount = transforms.length;
    const sourceChanged =
      node.data?.arraySourceGeometryId && node.data.arraySourceGeometryId !== sourceId;
    let existingIdsMutable = existingIds;
    if (sourceChanged && existingIds.length > 0) {
      existingIds.forEach((id) => idsToRemove.add(id));
      existingIdsMutable = [];
    }
    const nextIds: string[] = [];
    for (let i = 0; i < desiredCount; i += 1) {
      const matrix = transforms[i];
      const existingId = existingIdsMutable[i];
      const existingGeometry = existingId ? geometryById.get(existingId) : null;
      if (existingGeometry && updateDuplicate(existingGeometry, sourceGeometry, matrix)) {
        nextIds.push(existingId);
        didApply = true;
        continue;
      }
      if (existingGeometry) {
        idsToRemove.add(existingGeometry.id);
        if (existingGeometry.type === "polyline") {
          existingGeometry.vertexIds.forEach((vertexId) => idsToRemove.add(vertexId));
        }
      }
      const cloned = cloneGeometry(sourceGeometry, matrix);
      if (cloned) {
        itemsToAdd.push(...cloned.items);
        nextIds.push(cloned.geometryId);
        didApply = true;
      }
    }
    if (existingIdsMutable.length > desiredCount) {
      existingIdsMutable.slice(desiredCount).forEach((id) => {
        idsToRemove.add(id);
        const existing = geometryById.get(id);
        if (existing?.type === "polyline") {
          existing.vertexIds.forEach((vertexId) => idsToRemove.add(vertexId));
        }
      });
      didApply = true;
    }
    return {
      ...node,
      data: {
        ...node.data,
        geometryIds: nextIds,
        arraySourceGeometryId: sourceId,
      },
    };
  });

  if (!didApply && idsToRemove.size === 0 && itemsToAdd.length === 0) {
    return { nodes: nextNodes, geometry, didApply };
  }

  let nextGeometry = geometry
    .filter((item) => !idsToRemove.has(item.id))
    .map((item) => {
      const update = updates.get(item.id);
      return update ? ({ ...item, ...update } as Geometry) : item;
    });
  if (itemsToAdd.length > 0) {
    nextGeometry = [...nextGeometry, ...itemsToAdd];
  }

  return { nodes: nextNodes, geometry: nextGeometry, didApply: true };
};

const applyIsosurfaceNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "extractIsosurface") return node;
    const geometryId = node.data?.geometryId;
    if (!geometryId) return node;
    const outputs = node.data?.outputs;
    const mesh = outputs?.mesh as RenderMesh | undefined;
    if (!mesh || !Array.isArray(mesh.positions) || !Array.isArray(mesh.indices)) {
      return node;
    }
    const existing = geometryById.get(geometryId);
    if (!existing || !("mesh" in existing)) return node;
    updates.set(geometryId, {
      mesh,
      area_m2: computeMeshArea(mesh.positions, mesh.indices),
    });
    didApply = true;
    return node;
  });

  if (!didApply) {
    return { nodes: nextNodes, geometry, didApply };
  }

  const nextGeometry = geometry.map((item) => {
    const update = updates.get(item.id);
    return update ? ({ ...item, ...update } as Geometry) : item;
  });

  return { nodes: nextNodes, geometry: nextGeometry, didApply };
};

const applyMeshConvertNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "meshConvert") return node;
    const outputs = node.data?.outputs;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    const mesh = outputs?.mesh as RenderMesh | undefined;
    if (!geometryId || !mesh) return node;
    const existing = geometryById.get(geometryId);
    if (!existing || !("mesh" in existing)) return node;
    updates.set(geometryId, {
      mesh,
      area_m2: computeMeshArea(mesh.positions, mesh.indices),
    });
    didApply = true;
    return node;
  });

  if (!didApply) {
    return { nodes: nextNodes, geometry, didApply };
  }

  const nextGeometry = geometry.map((item) => {
    const update = updates.get(item.id);
    return update ? ({ ...item, ...update } as Geometry) : item;
  });

  return { nodes: nextNodes, geometry: nextGeometry, didApply };
};

const coerceFilePayload = (value: unknown) => {
  if (!value || typeof value !== "object") return null;
  const payload = value as { name?: string; type?: string; data?: string };
  if (typeof payload.data !== "string") return null;
  return payload;
};

const applyImportNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;
  let didUpdateNodes = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "stlImport") return node;
    const parameters = node.data?.parameters ?? {};
    const importNow = parameters.importNow === true;
    if (!importNow) return node;
    const geometryId =
      typeof node.data?.geometryId === "string" ? node.data.geometryId : null;
    const file = coerceFilePayload(parameters.file);
    if (!geometryId || !file) {
      const nextParameters = { ...parameters, importNow: false };
      didUpdateNodes = true;
      return { ...node, data: { ...node.data, parameters: nextParameters } };
    }

    try {
      const buffer = base64ToArrayBuffer(file.data ?? "");
      const scale = typeof parameters.scale === "number" ? parameters.scale : 1;
      const parsed = parseStl(buffer);
      const mesh = scaleRenderMesh(parsed, scale);
      const existing = geometryById.get(geometryId);
      if (existing && "mesh" in existing) {
        updates.set(geometryId, {
          mesh,
          area_m2: computeMeshArea(mesh.positions, mesh.indices),
        });
        didApply = true;
      }
    } catch (error) {
      console.error("Failed to import STL", error);
    }

    const nextParameters = { ...parameters, importNow: false };
    didUpdateNodes = true;
    return { ...node, data: { ...node.data, parameters: nextParameters } };
  });

  if (!didApply) {
    return { nodes: didUpdateNodes ? nextNodes : nodes, geometry, didApply };
  }

  const nextGeometry = geometry.map((item) => {
    const update = updates.get(item.id);
    return update ? ({ ...item, ...update } as Geometry) : item;
  });

  return {
    nodes: didUpdateNodes ? nextNodes : nodes,
    geometry: nextGeometry,
    didApply,
  };
};

const ensureFileExtension = (name: string, extension: string) => {
  const trimmed = name.trim();
  if (trimmed.length === 0) return `specificity-export${extension}`;
  return trimmed.toLowerCase().endsWith(extension) ? trimmed : `${trimmed}${extension}`;
};

const handleExportNodes = (nodes: WorkflowNode[], geometry: Geometry[]) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  let didUpdateNodes = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "stlExport") return node;
    const parameters = node.data?.parameters ?? {};
    const exportNow = parameters.exportNow === true;
    if (!exportNow) return node;

    const geometryIds = Array.isArray(node.data?.outputs?.geometryList)
      ? (node.data?.outputs?.geometryList as string[])
      : [];
    const meshes = geometryIds
      .map((id) => geometryById.get(id))
      .filter((item): item is Geometry => Boolean(item))
      .flatMap((item) => ("mesh" in item && item.mesh ? [item.mesh] : []));

    const scale = typeof parameters.scale === "number" ? parameters.scale : 1;
    const fileNameBase = String(parameters.fileName ?? "specificity-export");

    if (meshes.length > 0) {
      const merged = mergeRenderMeshes(meshes);
      const stl = exportMeshToStlAscii(merged, { name: fileNameBase, scale });
      const fileName = ensureFileExtension(fileNameBase, ".stl");
      downloadBlob(new Blob([stl], { type: "model/stl" }), fileName);
    }

    const nextParameters = { ...parameters, exportNow: false };
    didUpdateNodes = true;
    return { ...node, data: { ...node.data, parameters: nextParameters } };
  });

  return { nodes: didUpdateNodes ? nextNodes : nodes };
};

const normalizeGeometryLayer = (
  item: Geometry,
  defaultLayerId: string
): Geometry => {
  if (item.layerId) return item;
  const layerId = defaultLayerId;
  switch (item.type) {
    case "vertex": {
      const normalized: VertexGeometry = {
        id: item.id,
        type: "vertex",
        position: item.position,
        layerId,
        area_m2: item.area_m2,
        thickness_m: item.thickness_m,
      };
      return normalized;
    }
    case "polyline": {
      const normalized: PolylineGeometry = {
        id: item.id,
        type: "polyline",
        vertexIds: item.vertexIds,
        closed: item.closed,
        degree: item.degree,
        nurbs: item.nurbs,
        layerId,
        area_m2: item.area_m2,
        thickness_m: item.thickness_m,
      };
      return normalized;
    }
    case "surface": {
      const normalized: SurfaceGeometry = {
        id: item.id,
        type: "surface",
        mesh: item.mesh,
        nurbs: item.nurbs,
        loops: item.loops,
        plane: item.plane,
        layerId,
        area_m2: item.area_m2,
        thickness_m: item.thickness_m,
      };
      return normalized;
    }
    case "loft": {
      const normalized: LoftGeometry = {
        id: item.id,
        type: "loft",
        mesh: item.mesh,
        sectionIds: item.sectionIds,
        degree: item.degree,
        closed: item.closed,
        layerId,
        area_m2: item.area_m2,
        thickness_m: item.thickness_m,
      };
      return normalized;
    }
    case "extrude": {
      const normalized: ExtrudeGeometry = {
        id: item.id,
        type: "extrude",
        mesh: item.mesh,
        profileIds: item.profileIds,
        distance: item.distance,
        direction: item.direction,
        capped: item.capped,
        layerId,
        area_m2: item.area_m2,
        thickness_m: item.thickness_m,
      };
      return normalized;
    }
    default:
      return item;
  }
};

const cloneModelerSnapshot = (snapshot: ModelerSnapshot): ModelerSnapshot => {
  if (typeof structuredClone === "function") {
    return structuredClone(snapshot);
  }
  return JSON.parse(JSON.stringify(snapshot)) as ModelerSnapshot;
};

const MAX_MODELER_HISTORY = 60;

const parsePointsText = (input?: string): Vec3[] => {
  if (!input) return [];
  const numbers = input
    .split(/[\s,]+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
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

export const useProjectStore = create<ProjectStore>((set, get) => ({
  materials: [],
  geometry: [defaultGeometry],
  layers: defaultLayers,
  assignments: defaultAssignments,
  selectedGeometryIds: [defaultGeometry.id],
  selectionMode: "object",
  componentSelection: [],
  sceneNodes: defaultSceneNodes,
  hiddenGeometryIds: [],
  lockedGeometryIds: [],
  cPlane: defaultCPlane,
  transformOrientation: "world",
  gumballAlignment: "boundingBox",
  showRotationRings: true,
  pivot: defaultPivot,
  displayMode: "shaded",
  viewSolidity: SOLIDITY_PRESETS.shaded,
  viewSettings: defaultViewSettings,
  snapSettings: defaultSnapSettings,
  gridSettings: defaultGridSettings,
  camera: defaultCamera,
  clipboard: null,
  modelerHistoryPast: [],
  modelerHistoryFuture: [],
  workflow: defaultWorkflow,
  workflowHistory: [],
  saves: [],
  currentSaveId: null,
  projectName: "Untitled Project",
  setMaterials: (materials) => {
    set({ materials });
    get().recalculateWorkflow();
  },
  syncWorkflowGeometryToRoslyn: (nodeId) => {
    const node = get().workflow.nodes.find((entry) => entry.id === nodeId);
    if (!node) return;
    const selectIfExists = (geometryId: string | null | undefined) => {
      if (!geometryId) return false;
      const exists = get().geometry.some((item) => item.id === geometryId);
      if (!exists) return false;
      get().setSelectedGeometryIds([geometryId]);
      return true;
    };
    const primitiveKind = resolvePrimitiveKindForNode(node.type as NodeType, node.data?.parameters);
    if (primitiveKind) {
      const parameters = node.data?.parameters;
      const resolved = resolvePrimitiveConfig(parameters, { kind: primitiveKind });
      const mesh = generatePrimitiveMesh(resolved);
      const origin = { x: 0, y: 0, z: 0 };
      const geometryId = get().addGeometryMesh(mesh, {
        origin,
        sourceNodeId: nodeId,
        geometryId: node.data?.geometryId,
        recordHistory: true,
        metadata: {
          label: node.data?.label ?? "Primitive",
          primitive: { kind: resolved.kind, origin, params: { ...resolved } },
        },
        selectIds: node.data?.geometryId ? [node.data.geometryId] : undefined,
      });
      set((state) => ({
        workflow: {
          ...state.workflow,
          nodes: state.workflow.nodes.map((entry) =>
            entry.id === nodeId
              ? {
                  ...entry,
                  data: {
                    ...entry.data,
                    geometryId,
                    geometryType: "mesh",
                    isLinked: true,
                  },
                }
              : entry
          ),
        },
      }));
      selectIfExists(geometryId);
      get().recalculateWorkflow();
      return;
    }
    if (node.type === "box") {
      const dims = node.data?.boxDimensions;
      if (!dims) return;
      const geometryId = get().addGeometryBox({
        size: dims,
        origin: node.data?.boxOrigin,
        sourceNodeId: nodeId,
        geometryId: node.data?.geometryId,
        recordHistory: true,
        metadata: { label: node.data?.label ?? "Box" },
        selectIds: node.data?.geometryId ? [node.data.geometryId] : undefined,
      });
      set((state) => ({
        workflow: {
          ...state.workflow,
          nodes: state.workflow.nodes.map((entry) =>
            entry.id === nodeId
              ? {
                  ...entry,
                  data: {
                    ...entry.data,
                    geometryId,
                    geometryType: "mesh",
                    isLinked: true,
                  },
                }
              : entry
          ),
        },
      }));
      selectIfExists(geometryId);
      get().recalculateWorkflow();
      return;
    }
    if (node.type === "sphere") {
      const radius = node.data?.sphereRadius;
      if (radius == null) return;
      const geometryId = get().addGeometrySphere({
        radius,
        origin: node.data?.sphereOrigin,
        sourceNodeId: nodeId,
        geometryId: node.data?.geometryId,
        recordHistory: true,
        metadata: { label: node.data?.label ?? "Sphere" },
        selectIds: node.data?.geometryId ? [node.data.geometryId] : undefined,
      });
      set((state) => ({
        workflow: {
          ...state.workflow,
          nodes: state.workflow.nodes.map((entry) =>
            entry.id === nodeId
              ? {
                  ...entry,
                  data: {
                    ...entry.data,
                    geometryId,
                    geometryType: "mesh",
                    isLinked: true,
                  },
                }
              : entry
          ),
        },
      }));
      selectIfExists(geometryId);
      get().recalculateWorkflow();
      return;
    }

    const definition = getNodeDefinition(node.type);
    const parameters = resolveNodeParameters(node);
    const ports = resolveNodePorts(node, parameters);
    const geometryOutputKey =
      definition?.primaryOutputKey &&
      ports.outputs.some(
        (port) => port.key === definition.primaryOutputKey && port.type === "geometry"
      )
        ? definition.primaryOutputKey
        : ports.outputs.find((port) => port.type === "geometry")?.key;

    const outputValue =
      geometryOutputKey && node.data?.outputs ? node.data.outputs[geometryOutputKey] : null;

    if (typeof outputValue === "string" && selectIfExists(outputValue)) {
      return;
    }

    if (typeof node.data?.geometryId === "string") {
      selectIfExists(node.data.geometryId);
    }
  },
  addGeometryReferenceNode: (geometryId) => {
    const resolvedGeometryId =
      geometryId ?? get().selectedGeometryIds[get().selectedGeometryIds.length - 1] ?? get().geometry[0]?.id;
    if (!resolvedGeometryId) return;
    const selected = get().geometry.find((item) => item.id === resolvedGeometryId);
    const existing = get().workflow.nodes.some(
      (node) =>
        node.type === "geometryReference" && node.data?.geometryId === resolvedGeometryId
    );
    if (existing) return;
    const id = `node-geometry-ref-${Date.now()}`;
    const position = { x: 80 + Math.random() * 160, y: 60 + Math.random() * 160 };
    const data: WorkflowNodeData = {
      label: selected?.id ?? "Geometry Reference",
      geometryId: resolvedGeometryId,
      geometryType: selected?.type,
      isLinked: true,
    };
    set((state) => ({
      workflowHistory: appendWorkflowHistory(state.workflowHistory, state.workflow),
      workflow: {
        ...state.workflow,
        nodes: [...state.workflow.nodes, { id, type: "geometryReference", position, data }],
      },
    }));
    get().recalculateWorkflow();
  },
  setSaves: (saves) => set({ saves }),
  selectGeometry: (id, isMultiSelect = false) =>
    set((state) => {
      if (!id) {
        return { selectedGeometryIds: [], componentSelection: [] };
      }
      if (!isMultiSelect) {
        return { selectedGeometryIds: [id], componentSelection: [] };
      }
      const selected = state.selectedGeometryIds;
      if (selected.includes(id)) {
        return {
          selectedGeometryIds: selected.filter((selectedId) => selectedId !== id),
          componentSelection: [],
        };
      }
      return { selectedGeometryIds: [...selected, id], componentSelection: [] };
    }),
  setSelectedGeometryIds: (ids) =>
    set({
      selectedGeometryIds: ids,
      componentSelection: [],
    }),
  setSelectionMode: (mode) =>
    set(() => ({
      selectionMode: mode,
      componentSelection: [],
    })),
  setComponentSelection: (items, merge = false) =>
    set((state) => ({
      componentSelection: merge ? [...state.componentSelection, ...items] : items,
    })),
  clearComponentSelection: () => set({ componentSelection: [] }),
  setSceneNodes: (nodes) => set({ sceneNodes: nodes }),
  renameLayer: (id, name) => {
    get().recordModelerHistory();
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, name } : layer
      ),
    }));
  },
  renameSceneNode: (id, name) => {
    get().recordModelerHistory();
    set((state) => ({
      sceneNodes: state.sceneNodes.map((node) =>
        node.id === id ? { ...node, name } : node
      ),
    }));
  },
  setTransformOrientation: (orientation) => set({ transformOrientation: orientation }),
  setGumballAlignment: (alignment) => set({ gumballAlignment: alignment }),
  setShowRotationRings: (show) => set({ showRotationRings: show }),
  setPivotMode: (mode) =>
    set((state) => ({
      pivot: { ...state.pivot, mode },
    })),
  setPivotPosition: (position) =>
    set((state) => ({
      pivot: { ...state.pivot, position },
    })),
  setPivotCursorPosition: (position) =>
    set((state) => ({
      pivot: { ...state.pivot, cursorPosition: position ?? undefined },
    })),
  setPivotPickedPosition: (position) =>
    set((state) => ({
      pivot: { ...state.pivot, pickedPosition: position ?? undefined },
    })),
  setDisplayMode: (mode) => {
    get().recordModelerHistory();
    set({
      displayMode: mode,
      viewSolidity: resolveSolidityFromDisplayMode(mode),
    });
  },
  setViewSolidity: (value) => {
    const viewSolidity = clamp01(value);
    set({
      viewSolidity,
      displayMode: resolveDisplayModeFromSolidity(viewSolidity),
    });
  },
  setViewSettings: (settings) => {
    get().recordModelerHistory();
    set((state) => ({
      viewSettings: { ...state.viewSettings, ...settings },
    }));
  },
  setSnapSettings: (settings) => {
    get().recordModelerHistory();
    set((state) => ({
      snapSettings: { ...state.snapSettings, ...settings },
    }));
  },
  setGridSettings: (settings) => {
    get().recordModelerHistory();
    set((state) => ({
      gridSettings: { ...state.gridSettings, ...settings },
    }));
  },
  setCameraState: (stateUpdate) =>
    set((state) => ({
      camera: { ...state.camera, ...stateUpdate },
    })),
  setCameraPreset: (preset) =>
    set((state) => ({
      camera: { ...state.camera, preset },
    })),
  setClipboard: (payload) => set({ clipboard: payload }),
  toggleGeometryVisibility: (id, visible) => {
    get().recordModelerHistory();
    set((state) => {
      const isHidden = state.hiddenGeometryIds.includes(id);
      const nextHidden =
        visible === undefined
          ? isHidden
            ? state.hiddenGeometryIds.filter((item) => item !== id)
            : [...state.hiddenGeometryIds, id]
          : visible
            ? state.hiddenGeometryIds.filter((item) => item !== id)
            : [...state.hiddenGeometryIds, id];
      const nextSceneNodes = state.sceneNodes.map((node) =>
        node.geometryId === id ? { ...node, visible: !nextHidden.includes(id) } : node
      );
      return { hiddenGeometryIds: nextHidden, sceneNodes: nextSceneNodes };
    });
  },
  toggleGeometryLock: (id, locked) => {
    get().recordModelerHistory();
    set((state) => {
      const isLocked = state.lockedGeometryIds.includes(id);
      const nextLocked =
        locked === undefined
          ? isLocked
            ? state.lockedGeometryIds.filter((item) => item !== id)
            : [...state.lockedGeometryIds, id]
          : locked
            ? [...state.lockedGeometryIds, id]
            : state.lockedGeometryIds.filter((item) => item !== id);
      const nextSceneNodes = state.sceneNodes.map((node) =>
        node.geometryId === id ? { ...node, locked: nextLocked.includes(id) } : node
      );
      return { lockedGeometryIds: nextLocked, sceneNodes: nextSceneNodes };
    });
  },
  createGroup: (name, geometryIds) => {
    get().recordModelerHistory();
    const groupId = createSceneNodeId("group");
    set((state) => {
      const childIds = state.sceneNodes
        .filter((node) => node.geometryId && geometryIds.includes(node.geometryId))
        .map((node) => node.id);
      const nextNodes = state.sceneNodes.map((node) => {
        if (childIds.includes(node.id)) {
          return { ...node, parentId: groupId };
        }
        return node;
      });
      const groupNode: SceneNode = {
        id: groupId,
        name,
        type: "group",
        parentId: null,
        childIds,
        visible: true,
        locked: false,
      };
      return { sceneNodes: [...nextNodes, groupNode] };
    });
    return groupId;
  },
  ungroup: (groupId) => {
    get().recordModelerHistory();
    set((state) => {
      const groupNode = state.sceneNodes.find((node) => node.id === groupId);
      if (!groupNode || groupNode.type !== "group") return state;
      const nextNodes = state.sceneNodes
        .filter((node) => node.id !== groupId)
        .map((node) =>
          node.parentId === groupId ? { ...node, parentId: null } : node
        );
      return { sceneNodes: nextNodes };
    });
  },
  recordModelerHistory: (snapshot) =>
    set((state) => {
      const nextSnapshot =
        snapshot ??
        cloneModelerSnapshot({
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
          displayMode: state.displayMode,
          viewSolidity: state.viewSolidity,
          viewSettings: state.viewSettings,
          snapSettings: state.snapSettings,
          gridSettings: state.gridSettings,
          camera: state.camera,
          hiddenGeometryIds: state.hiddenGeometryIds,
          lockedGeometryIds: state.lockedGeometryIds,
          sceneNodes: state.sceneNodes,
        });
      const past = [...state.modelerHistoryPast, nextSnapshot].slice(
        -MAX_MODELER_HISTORY
      );
      return { modelerHistoryPast: past, modelerHistoryFuture: [] };
    }),
  undoModeler: () => {
    const { modelerHistoryPast, modelerHistoryFuture } = get();
    if (modelerHistoryPast.length === 0) return;
    const snapshot = modelerHistoryPast[modelerHistoryPast.length - 1];
    const current = cloneModelerSnapshot({
      geometry: get().geometry,
      layers: get().layers,
      assignments: get().assignments,
      selectedGeometryIds: get().selectedGeometryIds,
      componentSelection: get().componentSelection,
      selectionMode: get().selectionMode,
      cPlane: get().cPlane,
      pivot: get().pivot,
      transformOrientation: get().transformOrientation,
      gumballAlignment: get().gumballAlignment,
      showRotationRings: get().showRotationRings,
      displayMode: get().displayMode,
      viewSolidity: get().viewSolidity,
      viewSettings: get().viewSettings,
      snapSettings: get().snapSettings,
      gridSettings: get().gridSettings,
      camera: get().camera,
      hiddenGeometryIds: get().hiddenGeometryIds,
      lockedGeometryIds: get().lockedGeometryIds,
      sceneNodes: get().sceneNodes,
    });
    set({
      geometry: snapshot.geometry,
      layers: snapshot.layers,
      assignments: snapshot.assignments,
      selectedGeometryIds: snapshot.selectedGeometryIds,
      componentSelection: snapshot.componentSelection,
      selectionMode: snapshot.selectionMode,
      cPlane: snapshot.cPlane,
      pivot: snapshot.pivot,
      transformOrientation: snapshot.transformOrientation,
      gumballAlignment: snapshot.gumballAlignment,
      showRotationRings: snapshot.showRotationRings,
      displayMode: snapshot.displayMode,
      viewSolidity: snapshot.viewSolidity,
      viewSettings: snapshot.viewSettings,
      snapSettings: snapshot.snapSettings,
      gridSettings: snapshot.gridSettings,
      camera: snapshot.camera,
      hiddenGeometryIds: snapshot.hiddenGeometryIds,
      lockedGeometryIds: snapshot.lockedGeometryIds,
      sceneNodes: snapshot.sceneNodes,
      modelerHistoryPast: modelerHistoryPast.slice(0, -1),
      modelerHistoryFuture: [...modelerHistoryFuture, current],
    });
    get().recalculateWorkflow();
  },
  redoModeler: () => {
    const { modelerHistoryPast, modelerHistoryFuture } = get();
    if (modelerHistoryFuture.length === 0) return;
    const snapshot = modelerHistoryFuture[modelerHistoryFuture.length - 1];
    const current = cloneModelerSnapshot({
      geometry: get().geometry,
      layers: get().layers,
      assignments: get().assignments,
      selectedGeometryIds: get().selectedGeometryIds,
      componentSelection: get().componentSelection,
      selectionMode: get().selectionMode,
      cPlane: get().cPlane,
      pivot: get().pivot,
      transformOrientation: get().transformOrientation,
      gumballAlignment: get().gumballAlignment,
      showRotationRings: get().showRotationRings,
      displayMode: get().displayMode,
      viewSolidity: get().viewSolidity,
      viewSettings: get().viewSettings,
      snapSettings: get().snapSettings,
      gridSettings: get().gridSettings,
      camera: get().camera,
      hiddenGeometryIds: get().hiddenGeometryIds,
      lockedGeometryIds: get().lockedGeometryIds,
      sceneNodes: get().sceneNodes,
    });
    set({
      geometry: snapshot.geometry,
      layers: snapshot.layers,
      assignments: snapshot.assignments,
      selectedGeometryIds: snapshot.selectedGeometryIds,
      componentSelection: snapshot.componentSelection,
      selectionMode: snapshot.selectionMode,
      cPlane: snapshot.cPlane,
      pivot: snapshot.pivot,
      transformOrientation: snapshot.transformOrientation,
      gumballAlignment: snapshot.gumballAlignment,
      showRotationRings: snapshot.showRotationRings,
      displayMode: snapshot.displayMode,
      viewSolidity: snapshot.viewSolidity,
      viewSettings: snapshot.viewSettings,
      snapSettings: snapshot.snapSettings,
      gridSettings: snapshot.gridSettings,
      camera: snapshot.camera,
      hiddenGeometryIds: snapshot.hiddenGeometryIds,
      lockedGeometryIds: snapshot.lockedGeometryIds,
      sceneNodes: snapshot.sceneNodes,
      modelerHistoryPast: [...modelerHistoryPast, current].slice(
        -MAX_MODELER_HISTORY
      ),
      modelerHistoryFuture: modelerHistoryFuture.slice(0, -1),
    });
    get().recalculateWorkflow();
  },
  addGeometryPoint: (position) => {
    get().recordModelerHistory();
    const id = createGeometryId("vertex");
    const nextPosition = position ?? {
      x: Number((Math.random() * 2 - 1).toFixed(2)),
      y: 0,
      z: Number((Math.random() * 2 - 1).toFixed(2)),
    };
    set((state) => {
      const layerId = withDefaultLayerId(undefined, state);
      const nextGeometry: Geometry = {
        id,
        type: "vertex",
        position: nextPosition,
        layerId,
        area_m2: 1,
        thickness_m: 0.1,
      };
      const nextLayers = state.layers.map((layer) =>
        layer.id === layerId
          ? { ...layer, geometryIds: [...layer.geometryIds, id] }
          : layer
      );
      const nextSceneNodes = [...state.sceneNodes, createGeometrySceneNode(id)];
      return {
        geometry: [...state.geometry, nextGeometry],
        layers: nextLayers,
        selectedGeometryIds: [id],
        sceneNodes: nextSceneNodes,
      };
    });
    get().recalculateWorkflow();
    return id;
  },
  addGeometryPolyline: (vertexIds, options) => {
    if (vertexIds.length < 2) return null;
    get().recordModelerHistory();
    const id = createGeometryId("polyline");
    set((state) => {
      const layerId = withDefaultLayerId(options?.layerId, state);
      const nextGeometry: Geometry = {
        id,
        type: "polyline",
        vertexIds,
        closed: options?.closed ?? false,
        degree: options?.degree ?? 1,
        nurbs: options?.nurbs,
        layerId,
      };
      const nextLayers = state.layers.map((layer) =>
        layer.id === layerId
          ? { ...layer, geometryIds: [...layer.geometryIds, id] }
          : layer
      );
      const nextSceneNodes = [...state.sceneNodes, createGeometrySceneNode(id)];
      return {
        geometry: [...state.geometry, nextGeometry],
        layers: nextLayers,
        selectedGeometryIds: [id],
        sceneNodes: nextSceneNodes,
      };
    });
    get().recalculateWorkflow();
    return id;
  },
  addGeometryPolylineFromPoints: (points, options) => {
    if (points.length < 2) return null;
    const recordHistory = options?.recordHistory ?? true;
    if (recordHistory) {
      get().recordModelerHistory();
    }
    const polylineId = createGeometryId("polyline");
    const vertexIds = points.map(() => createGeometryId("vertex"));
    const defaultLayerId = withDefaultLayerId(options?.layerId, get());
    const vertexItems: Geometry[] = points.map((point, index) => ({
      id: vertexIds[index],
      type: "vertex",
      position: point,
      layerId: defaultLayerId,
      area_m2: 1,
      thickness_m: 0.1,
    }));
    const polylineItem: Geometry = {
      id: polylineId,
      type: "polyline",
      vertexIds,
      closed: options?.closed ?? false,
      degree: options?.degree ?? 1,
      nurbs: options?.nurbs,
      layerId: defaultLayerId,
    };
    get().addGeometryItems([...vertexItems, polylineItem], {
      selectIds: options?.selectIds ?? [polylineId],
      recordHistory: false,
    });
    return polylineId;
  },
  addGeometrySurface: (mesh, loops, plane) => {
    get().recordModelerHistory();
    const id = createGeometryId("surface");
    set((state) => {
      const layerId = withDefaultLayerId(undefined, state);
      const nextGeometry: Geometry = {
        id,
        type: "surface",
        mesh,
        loops,
        plane,
        layerId,
      };
      const nextLayers = state.layers.map((layer) =>
        layer.id === layerId
          ? { ...layer, geometryIds: [...layer.geometryIds, id] }
          : layer
      );
      const nextSceneNodes = [...state.sceneNodes, createGeometrySceneNode(id)];
      return {
        geometry: [...state.geometry, nextGeometry],
        layers: nextLayers,
        selectedGeometryIds: [id],
        sceneNodes: nextSceneNodes,
      };
    });
    get().recalculateWorkflow();
    return id;
  },
  addGeometryMesh: (mesh, options) => {
    const recordHistory = options?.recordHistory ?? true;
    if (recordHistory) {
      get().recordModelerHistory();
    }
    const id = options?.geometryId ?? createGeometryId("mesh");
    const translatedMesh = options?.origin
      ? translateMesh(mesh, options.origin)
      : mesh;
    const area = options?.area_m2 ?? computeMeshArea(translatedMesh.positions, translatedMesh.indices);
    const primitive =
      options?.primitive ??
      (options?.metadata?.primitive as MeshPrimitiveGeometry["primitive"] | undefined);
    set((state) => {
      const layerId = withDefaultLayerId(options?.layerId, state);
      const nextGeometry: Geometry = {
        id,
        type: "mesh",
        mesh: translatedMesh,
        layerId,
        area_m2: area,
        thickness_m: options?.thickness_m,
        sourceNodeId: options?.sourceNodeId,
        metadata: options?.metadata,
        primitive,
      } satisfies MeshPrimitiveGeometry;
      const nextLayers = state.layers.map((layer) =>
        layer.id === layerId
          ? { ...layer, geometryIds: [...layer.geometryIds, id] }
          : layer
      );
      const nextSceneNodes = [
        ...state.sceneNodes.filter((node) => node.geometryId !== id),
        createGeometrySceneNode(id, options?.metadata?.label as string | undefined),
      ];
      const geometryExists = state.geometry.some((item) => item.id === id);
      const geometryList = geometryExists
        ? state.geometry.map((item) => (item.id === id ? nextGeometry : item))
        : [...state.geometry, nextGeometry];
      return {
        geometry: geometryList,
        layers: nextLayers,
        selectedGeometryIds: options?.selectIds ?? [id],
        sceneNodes: nextSceneNodes,
      } satisfies Partial<ProjectStore>;
    });
    get().recalculateWorkflow();
    return id;
  },
  addGeometryBox: (options) => {
    const mesh = generateBoxMesh(options.size, options.segments);
    return get().addGeometryMesh(mesh, {
      ...options,
      metadata: {
        ...(options.metadata ?? {}),
        primitive: {
          kind: "box",
          origin: options.origin ?? { x: 0, y: 0, z: 0 },
          dimensions: options.size,
        },
      },
    });
  },
  addGeometrySphere: (options) => {
    const mesh = generateSphereMesh(options.radius, options.segments);
    return get().addGeometryMesh(mesh, {
      ...options,
      metadata: {
        ...(options.metadata ?? {}),
        primitive: {
          kind: "sphere",
          origin: options.origin ?? { x: 0, y: 0, z: 0 },
          radius: options.radius,
        },
      },
    });
  },
  addGeometryLoft: (mesh, sectionIds, options) => {
    get().recordModelerHistory();
    const id = createGeometryId("loft");
    set((state) => {
      const layerId = withDefaultLayerId(undefined, state);
      const nextGeometry: Geometry = {
        id,
        type: "loft",
        mesh,
        sectionIds,
        degree: options.degree,
        closed: options.closed,
        layerId,
      };
      const nextLayers = state.layers.map((layer) =>
        layer.id === layerId
          ? { ...layer, geometryIds: [...layer.geometryIds, id] }
          : layer
      );
      const nextSceneNodes = [...state.sceneNodes, createGeometrySceneNode(id)];
      return {
        geometry: [...state.geometry, nextGeometry],
        layers: nextLayers,
        selectedGeometryIds: [id],
        sceneNodes: nextSceneNodes,
      };
    });
    get().recalculateWorkflow();
    return id;
  },
  addGeometryExtrude: (mesh, profileIds, options) => {
    get().recordModelerHistory();
    const id = createGeometryId("extrude");
    set((state) => {
      const layerId = withDefaultLayerId(undefined, state);
      const nextGeometry: Geometry = {
        id,
        type: "extrude",
        mesh,
        profileIds,
        distance: options.distance,
        direction: options.direction,
        capped: options.capped,
        layerId,
      };
      const nextLayers = state.layers.map((layer) =>
        layer.id === layerId
          ? { ...layer, geometryIds: [...layer.geometryIds, id] }
          : layer
      );
      const nextSceneNodes = [...state.sceneNodes, createGeometrySceneNode(id)];
      return {
        geometry: [...state.geometry, nextGeometry],
        layers: nextLayers,
        selectedGeometryIds: [id],
        sceneNodes: nextSceneNodes,
      };
    });
    get().recalculateWorkflow();
    return id;
  },
  addGeometryItems: (items, options) => {
    const recordHistory = options?.recordHistory ?? true;
    if (recordHistory) {
      get().recordModelerHistory();
    }
    set((state) => {
      const defaultLayerId = state.layers[0]?.id ?? "layer-default";
      const normalizedItems = items.map((item) =>
        normalizeGeometryLayer(item, defaultLayerId)
      );

      const nextLayers = state.layers.map((layer) => {
        const additions = normalizedItems
          .filter((item) => item.layerId === layer.id)
          .map((item) => item.id);
        if (additions.length === 0) return layer;
        return { ...layer, geometryIds: [...layer.geometryIds, ...additions] };
      });

      const missingLayers = normalizedItems
        .map((item) => item.layerId)
        .filter((layerId) => !state.layers.some((layer) => layer.id === layerId));

      const nextLayerList =
        missingLayers.length > 0
          ? [
              ...nextLayers,
              ...missingLayers.map((id) => ({
                id,
                name: id,
                geometryIds: normalizedItems
                  .filter((item) => item.layerId === id)
                  .map((item) => item.id),
                visible: true,
                locked: false,
                parentId: null,
              })),
            ]
          : nextLayers;

      const newSceneNodes = normalizedItems.map((item) =>
        createGeometrySceneNode(item.id)
      );

      return {
        geometry: [...state.geometry, ...normalizedItems],
        layers: nextLayerList,
        selectedGeometryIds:
          options?.selectIds ?? normalizedItems.map((item) => item.id),
        sceneNodes: [...state.sceneNodes, ...newSceneNodes],
      } satisfies Partial<ProjectStore>;
    });
    get().recalculateWorkflow();
  },
  updateGeometryBatch: (updates, options) => {
    const recordHistory = options?.recordHistory ?? true;
    if (recordHistory) {
      get().recordModelerHistory();
    }
    set((state) => {
      const updateMap = new Map(updates.map((update) => [update.id, update.data]));
      const nextGeometry = state.geometry.map((item) =>
        updateMap.has(item.id) ? { ...item, ...updateMap.get(item.id) } : item
      ) as Geometry[];
      return { geometry: nextGeometry } satisfies Partial<ProjectStore>;
    });
    get().recalculateWorkflow();
  },
  updateGeometry: (id, data, options) => {
    get().updateGeometryBatch([{ id, data }], options);
  },
  deleteGeometry: (ids, options) => {
    const recordHistory = options?.recordHistory ?? true;
    if (recordHistory) {
      get().recordModelerHistory();
    }
    const idList = Array.isArray(ids) ? ids : [ids];
    const deleteSet = new Set(idList);
    set((state) => {
      const removedVertices = new Set(
        state.geometry
          .filter((item) => deleteSet.has(item.id) && item.type === "vertex")
          .map((item) => item.id)
      );
      let nextGeometry = state.geometry.filter((item) => !deleteSet.has(item.id));
      if (removedVertices.size > 0) {
        const geometryToRemove = new Set<string>();
        nextGeometry = nextGeometry.map((item) => {
          if (item.type !== "polyline") return item;
          const filteredIds = item.vertexIds.filter(
            (vertexId) => !removedVertices.has(vertexId)
          );
          if (filteredIds.length < 2) {
            geometryToRemove.add(item.id);
            return item;
          }
          return { ...item, vertexIds: filteredIds };
        });
        nextGeometry = nextGeometry.filter((item) => !geometryToRemove.has(item.id));
      }
      const remainingIds = new Set(nextGeometry.map((item) => item.id));
      const nextSceneNodes = state.sceneNodes
        .filter((node) => !node.geometryId || remainingIds.has(node.geometryId))
        .map((node) => ({
          ...node,
          childIds: node.childIds.filter((childId) =>
            state.sceneNodes.some((child) => child.id === childId)
          ),
        }));
      const nextLayers = state.layers.map((layer) => ({
        ...layer,
        geometryIds: layer.geometryIds.filter((id) =>
          nextGeometry.some((item) => item.id === id)
        ),
      }));
      const nextAssignments = state.assignments.filter(
        (assignment) =>
          !assignment.geometryId || nextGeometry.some((item) => item.id === assignment.geometryId)
      );
      return {
        geometry: nextGeometry,
        layers: nextLayers,
        assignments: nextAssignments,
        selectedGeometryIds: state.selectedGeometryIds.filter(
          (selectedId) => !deleteSet.has(selectedId)
        ),
        componentSelection: [],
        sceneNodes: nextSceneNodes,
      };
    });
    get().recalculateWorkflow();
  },
  setMaterialAssignment: (assignment) => {
    if (!assignment.layerId && !assignment.geometryId) return;
    get().recordModelerHistory();
    set((state) => {
      const nextAssignments = state.assignments.filter((item) => {
        if (assignment.geometryId) {
          return item.geometryId !== assignment.geometryId;
        }
        if (assignment.layerId) {
          return item.layerId !== assignment.layerId || item.geometryId != null;
        }
        return true;
      });
      return { assignments: [...nextAssignments, assignment] };
    });
    get().recalculateWorkflow();
  },
  updateNodeData: (nodeId, data) => {
    set((state) => ({
      workflow: {
        ...state.workflow,
        nodes: state.workflow.nodes.map((node) => {
          if (node.id !== nodeId) return node;
          const mergedParameters = data.parameters
            ? { ...(node.data?.parameters ?? {}), ...data.parameters }
            : node.data?.parameters;
          let nextParameters = mergedParameters;
          let nextTopologySettings = data.topologySettings ?? node.data?.topologySettings;

          if (node.type === "topologyOptimize") {
            const coerceNumber = (value: unknown, fallback: number) => {
              if (typeof value === "number" && Number.isFinite(value)) return value;
              if (typeof value === "boolean") return value ? 1 : 0;
              if (typeof value === "string" && value.trim().length > 0) {
                const parsed = Number(value);
                if (Number.isFinite(parsed)) return parsed;
              }
              return fallback;
            };

            const settingsPatch = data.topologySettings;
            if (settingsPatch && !data.parameters) {
              const resolvedSettings = {
                volumeFraction: coerceNumber(
                  settingsPatch.volumeFraction,
                  defaultTopologySettings.volumeFraction
                ),
                penaltyExponent: coerceNumber(
                  settingsPatch.penaltyExponent,
                  defaultTopologySettings.penaltyExponent
                ),
                filterRadius: coerceNumber(
                  settingsPatch.filterRadius,
                  defaultTopologySettings.filterRadius
                ),
                maxIterations: coerceNumber(
                  settingsPatch.maxIterations,
                  defaultTopologySettings.maxIterations
                ),
                convergenceTolerance: coerceNumber(
                  settingsPatch.convergenceTolerance,
                  defaultTopologySettings.convergenceTolerance
                ),
              };
              nextTopologySettings = resolvedSettings;
              nextParameters = {
                ...(mergedParameters ?? {}),
                volumeFraction: resolvedSettings.volumeFraction,
                penaltyExponent: resolvedSettings.penaltyExponent,
                filterRadius: resolvedSettings.filterRadius,
                maxIterations: resolvedSettings.maxIterations,
                convergenceTolerance: resolvedSettings.convergenceTolerance,
              };
            } else {
              const baseSettings = nextTopologySettings ?? defaultTopologySettings;
              const resolvedSettings = {
                volumeFraction: coerceNumber(
                  mergedParameters?.volumeFraction,
                  baseSettings.volumeFraction
                ),
                penaltyExponent: coerceNumber(
                  mergedParameters?.penaltyExponent,
                  baseSettings.penaltyExponent
                ),
                filterRadius: coerceNumber(
                  mergedParameters?.filterRadius,
                  baseSettings.filterRadius
                ),
                maxIterations: coerceNumber(
                  mergedParameters?.maxIterations,
                  baseSettings.maxIterations
                ),
                convergenceTolerance: coerceNumber(
                  mergedParameters?.convergenceTolerance,
                  baseSettings.convergenceTolerance
                ),
              };

              nextTopologySettings = resolvedSettings;
              nextParameters = {
                ...(mergedParameters ?? {}),
                volumeFraction: resolvedSettings.volumeFraction,
                penaltyExponent: resolvedSettings.penaltyExponent,
                filterRadius: resolvedSettings.filterRadius,
                maxIterations: resolvedSettings.maxIterations,
                convergenceTolerance: resolvedSettings.convergenceTolerance,
              };
            }
          }
          return {
            ...node,
            data: {
              ...node.data,
              ...data,
              topologySettings: nextTopologySettings,
              parameters: nextParameters,
            },
          };
        }),
      },
    }));
    const node = get().workflow.nodes.find((entry) => entry.id === nodeId);
    if (node && node.data) {
      if (node.type === "point") {
        const point = node.data.point ?? { x: 0, y: 0, z: 0 };
        if (node.data.geometryId) {
          get().updateGeometry(node.data.geometryId, { position: point });
        } else {
          const geometryId = createGeometryId("vertex");
          get().addGeometryItems(
            [
              {
                id: geometryId,
                type: "vertex",
                position: point,
                layerId: "layer-default",
                area_m2: 1,
                thickness_m: 0.1,
              },
            ],
            { selectIds: get().selectedGeometryIds, recordHistory: true }
          );
          set((state) => ({
            workflow: {
              ...state.workflow,
              nodes: state.workflow.nodes.map((entry) =>
                entry.id === nodeId
                  ? { ...entry, data: { ...entry.data, geometryId } }
                  : entry
              ),
            },
          }));
        }
      }
      const primitiveKind = resolvePrimitiveKindForNode(node.type as NodeType, node.data.parameters);
      if (primitiveKind) {
        const parameters = node.data.parameters;
        const config = resolvePrimitiveConfig(parameters, { kind: primitiveKind });
        const mesh = generatePrimitiveMesh(config);
        const origin = { x: 0, y: 0, z: 0 };
        const geometryId = get().addGeometryMesh(mesh, {
          origin,
          sourceNodeId: nodeId,
          geometryId: node.data.geometryId,
          recordHistory: true,
          selectIds: get().selectedGeometryIds,
          metadata: {
            label: node.data?.label ?? "Primitive",
            primitive: { kind: config.kind, origin, params: { ...config } },
          },
        });
        set((state) => ({
          workflow: {
            ...state.workflow,
            nodes: state.workflow.nodes.map((entry) =>
              entry.id === nodeId
                ? {
                    ...entry,
                    data: {
                      ...entry.data,
                      geometryId,
                      geometryType: "mesh",
                      isLinked: true,
                    },
                  }
                : entry
            ),
          },
        }));
      }
      if (node.type === "line") {
        const parsed = parsePointsText(node.data.pointsText);
        const points = parsed.length >= 2 ? parsed.slice(0, 2) : [];
        if (points.length === 2) {
          const reuse =
            node.data.geometryId &&
            node.data.vertexIds &&
            node.data.vertexIds.length === 2;
          if (reuse && node.data.geometryId && node.data.vertexIds) {
            node.data.vertexIds.forEach((vertexId, index) => {
              const point = points[index];
              if (!point) return;
              get().updateGeometry(vertexId, { position: point });
            });
            get().updateGeometry(node.data.geometryId, {
              vertexIds: node.data.vertexIds,
              closed: false,
            });
          } else {
            if (node.data.vertexIds?.length) {
              get().deleteGeometry(node.data.vertexIds, { recordHistory: true });
            }
            const vertexIds = points.map(() => createGeometryId("vertex"));
            const lineId = node.data.geometryId ?? createGeometryId("polyline");
            const vertexItems: Geometry[] = points.map((point, index) => ({
              id: vertexIds[index],
              type: "vertex",
              position: point,
              layerId: "layer-default",
              area_m2: 1,
              thickness_m: 0.1,
            }));
            const lineItem: Geometry = {
              id: lineId,
              type: "polyline",
              vertexIds,
              closed: false,
              degree: 1,
              layerId: "layer-default",
            };
            get().addGeometryItems([...vertexItems, lineItem], {
              selectIds: get().selectedGeometryIds,
              recordHistory: true,
            });
            set((state) => ({
              workflow: {
                ...state.workflow,
                nodes: state.workflow.nodes.map((entry) =>
                  entry.id === nodeId
                    ? {
                        ...entry,
                        data: {
                          ...entry.data,
                          geometryId: lineId,
                          geometryType: "polyline",
                          vertexIds,
                          closed: false,
                        },
                      }
                    : entry
                ),
              },
            }));
          }
        }
      }
      if (node.type === "arc") {
        const parsed = parsePointsText(node.data.pointsText);
        const controlPoints = parsed.length >= 3 ? parsed.slice(0, 3) : [];
        if (controlPoints.length === 3) {
          const [start, end, through] = controlPoints;
          const arcPoints =
            computeArcPolyline(get().cPlane, start, end, through, 48) ?? [start, end];
          const reuse =
            node.data.geometryId &&
            node.data.vertexIds &&
            node.data.vertexIds.length === arcPoints.length;
          if (reuse && node.data.geometryId && node.data.vertexIds) {
            node.data.vertexIds.forEach((vertexId, index) => {
              const point = arcPoints[index];
              if (!point) return;
              get().updateGeometry(vertexId, { position: point });
            });
            get().updateGeometry(node.data.geometryId, {
              vertexIds: node.data.vertexIds,
              closed: false,
            });
          } else {
            if (node.data.vertexIds?.length) {
              get().deleteGeometry(node.data.vertexIds, { recordHistory: true });
            }
            const vertexIds = arcPoints.map(() => createGeometryId("vertex"));
            const arcId = node.data.geometryId ?? createGeometryId("polyline");
            const vertexItems: Geometry[] = arcPoints.map((point, index) => ({
              id: vertexIds[index],
              type: "vertex",
              position: point,
              layerId: "layer-default",
              area_m2: 1,
              thickness_m: 0.1,
            }));
            const arcItem: Geometry = {
              id: arcId,
              type: "polyline",
              vertexIds,
              closed: false,
              degree: 1,
              layerId: "layer-default",
            };
            get().addGeometryItems([...vertexItems, arcItem], {
              selectIds: get().selectedGeometryIds,
              recordHistory: true,
            });
            set((state) => ({
              workflow: {
                ...state.workflow,
                nodes: state.workflow.nodes.map((entry) =>
                  entry.id === nodeId
                    ? {
                        ...entry,
                        data: {
                          ...entry.data,
                          geometryId: arcId,
                          geometryType: "polyline",
                          vertexIds,
                          closed: false,
                        },
                      }
                    : entry
                ),
              },
            }));
          }
        }
      }
      if (node.type === "curve") {
        const controlPoints = parsePointsText(node.data.pointsText);
        if (controlPoints.length >= 2) {
          const parameters = node.data.parameters ?? {};
          const coerceNumber = (value: unknown, fallback: number) => {
            if (typeof value === "number" && Number.isFinite(value)) return value;
            if (typeof value === "string" && value.trim().length > 0) {
              const parsed = Number(value);
              if (Number.isFinite(parsed)) return parsed;
            }
            return fallback;
          };
          const coerceBoolean = (value: unknown, fallback: boolean) => {
            if (typeof value === "boolean") return value;
            if (typeof value === "string") {
              const lower = value.trim().toLowerCase();
              if (lower === "true") return true;
              if (lower === "false") return false;
            }
            return fallback;
          };
          const degreeRaw = coerceNumber(parameters.degree, 3);
          const degree = Math.min(3, Math.max(1, Math.round(degreeRaw))) as 1 | 2 | 3;
          const resolutionRaw = coerceNumber(parameters.resolution, 64);
          const resolution = Math.min(256, Math.max(16, Math.round(resolutionRaw)));
          const closed = coerceBoolean(parameters.closed, false);
          const curvePoints = interpolatePolyline(controlPoints, degree, closed, resolution);
          const reuse =
            node.data.geometryId &&
            node.data.vertexIds &&
            node.data.vertexIds.length === curvePoints.length;
          if (reuse && node.data.geometryId && node.data.vertexIds) {
            node.data.vertexIds.forEach((vertexId, index) => {
              const point = curvePoints[index];
              if (!point) return;
              get().updateGeometry(vertexId, { position: point });
            });
            get().updateGeometry(node.data.geometryId, {
              vertexIds: node.data.vertexIds,
              closed,
            });
          } else {
            if (node.data.vertexIds?.length) {
              get().deleteGeometry(node.data.vertexIds, { recordHistory: true });
            }
            const vertexIds = curvePoints.map(() => createGeometryId("vertex"));
            const curveId = node.data.geometryId ?? createGeometryId("polyline");
            const vertexItems: Geometry[] = curvePoints.map((point, index) => ({
              id: vertexIds[index],
              type: "vertex",
              position: point,
              layerId: "layer-default",
              area_m2: 1,
              thickness_m: 0.1,
            }));
            const curveItem: Geometry = {
              id: curveId,
              type: "polyline",
              vertexIds,
              closed,
              degree,
              layerId: "layer-default",
            };
            get().addGeometryItems([...vertexItems, curveItem], {
              selectIds: get().selectedGeometryIds,
              recordHistory: true,
            });
            set((state) => ({
              workflow: {
                ...state.workflow,
                nodes: state.workflow.nodes.map((entry) =>
                  entry.id === nodeId
                    ? {
                        ...entry,
                        data: {
                          ...entry.data,
                          geometryId: curveId,
                          geometryType: "polyline",
                          vertexIds,
                          closed,
                        },
                      }
                    : entry
                ),
              },
            }));
          }
        }
      }
      if (node.type === "polyline") {
        const points = parsePointsText(node.data.pointsText);
        if (points.length >= 2) {
          const reuse =
            node.data.geometryId &&
            node.data.vertexIds &&
            node.data.vertexIds.length === points.length;
          if (reuse && node.data.geometryId && node.data.vertexIds) {
            node.data.vertexIds.forEach((vertexId, index) => {
              const point = points[index];
              if (!point) return;
              get().updateGeometry(vertexId, { position: point });
            });
            get().updateGeometry(node.data.geometryId, {
              vertexIds: node.data.vertexIds,
              closed: Boolean(node.data.closed),
            });
          } else {
            if (node.data.vertexIds?.length) {
              get().deleteGeometry(node.data.vertexIds, { recordHistory: true });
            }
            const vertexIds = points.map(() => createGeometryId("vertex"));
            const polylineId = node.data.geometryId ?? createGeometryId("polyline");
            const vertexItems: Geometry[] = points.map((point, index) => ({
              id: vertexIds[index],
              type: "vertex",
              position: point,
              layerId: "layer-default",
              area_m2: 1,
              thickness_m: 0.1,
            }));
            const polylineItem: Geometry = {
              id: polylineId,
              type: "polyline",
              vertexIds,
              closed: Boolean(node.data.closed),
              degree: 1,
              layerId: "layer-default",
            };
            get().addGeometryItems([...vertexItems, polylineItem], {
              selectIds: get().selectedGeometryIds,
              recordHistory: true,
            });
            set((state) => ({
              workflow: {
                ...state.workflow,
                nodes: state.workflow.nodes.map((entry) =>
                  entry.id === nodeId
                    ? {
                        ...entry,
                        data: {
                          ...entry.data,
                          geometryId: polylineId,
                          vertexIds,
                        },
                      }
                    : entry
                ),
              },
            }));
          }
        }
      }
      if (node.type === "surface") {
        const points = parsePointsText(node.data.pointsText);
        if (points.length >= 3) {
          const reuse =
            node.data.geometryId &&
            node.data.vertexIds &&
            node.data.vertexIds.length === points.length;
          if (reuse && node.data.geometryId && node.data.vertexIds) {
            node.data.vertexIds.forEach((vertexId, index) => {
              const point = points[index];
              if (!point) return;
              get().updateGeometry(vertexId, { position: point });
            });
            const { mesh, plane } = generateSurfaceMesh([points]);
            get().updateGeometry(node.data.geometryId, {
              mesh,
              loops: [node.data.vertexIds],
              plane,
            });
          } else {
            if (node.data.vertexIds?.length) {
              get().deleteGeometry(node.data.vertexIds, { recordHistory: true });
            }
            const vertexIds = points.map(() => createGeometryId("vertex"));
            const surfaceId = node.data.geometryId ?? createGeometryId("surface");
            const vertexItems: Geometry[] = points.map((point, index) => ({
              id: vertexIds[index],
              type: "vertex",
              position: point,
              layerId: "layer-default",
              area_m2: 1,
              thickness_m: 0.1,
            }));
            const { mesh, plane } = generateSurfaceMesh([points]);
            const surfaceItem: Geometry = {
              id: surfaceId,
              type: "surface",
              mesh,
              loops: [vertexIds],
              plane,
              layerId: "layer-default",
            };
            get().addGeometryItems([...vertexItems, surfaceItem], {
              selectIds: get().selectedGeometryIds,
              recordHistory: true,
            });
            set((state) => ({
              workflow: {
                ...state.workflow,
                nodes: state.workflow.nodes.map((entry) =>
                  entry.id === nodeId
                    ? {
                        ...entry,
                        data: {
                          ...entry.data,
                          geometryId: surfaceId,
                          vertexIds,
                        },
                      }
                    : entry
                ),
              },
            }));
          }
        }
      }
      if (node.type === "rectangle") {
        const parameters = node.data.parameters ?? {};
        const width = Number(parameters.width ?? 1);
        const height = Number(parameters.height ?? 1);
        const center = {
          x: Number(parameters.centerX ?? 0),
          y: Number(parameters.centerY ?? 0),
          z: Number(parameters.centerZ ?? 0),
        };
        if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
          const points = buildRectanglePoints(center, width, height, get().cPlane);
          const reuse =
            node.data.geometryId &&
            node.data.vertexIds &&
            node.data.vertexIds.length === points.length;
          if (reuse && node.data.geometryId && node.data.vertexIds) {
            node.data.vertexIds.forEach((vertexId, index) => {
              const point = points[index];
              if (!point) return;
              get().updateGeometry(vertexId, { position: point });
            });
            get().updateGeometry(node.data.geometryId, {
              vertexIds: node.data.vertexIds,
              closed: true,
            });
          } else {
            if (node.data.vertexIds?.length) {
              get().deleteGeometry(node.data.vertexIds, { recordHistory: true });
            }
            const vertexIds = points.map(() => createGeometryId("vertex"));
            const rectId = node.data.geometryId ?? createGeometryId("polyline");
            const vertexItems: Geometry[] = points.map((point, index) => ({
              id: vertexIds[index],
              type: "vertex",
              position: point,
              layerId: "layer-default",
              area_m2: 1,
              thickness_m: 0.1,
            }));
            const rectItem: Geometry = {
              id: rectId,
              type: "polyline",
              vertexIds,
              closed: true,
              degree: 1,
              layerId: "layer-default",
            };
            get().addGeometryItems([...vertexItems, rectItem], {
              selectIds: get().selectedGeometryIds,
              recordHistory: true,
            });
            set((state) => ({
              workflow: {
                ...state.workflow,
                nodes: state.workflow.nodes.map((entry) =>
                  entry.id === nodeId
                    ? {
                        ...entry,
                        data: {
                          ...entry.data,
                          geometryId: rectId,
                          geometryType: "polyline",
                          vertexIds,
                          closed: true,
                        },
                      }
                    : entry
                ),
              },
            }));
          }
        }
      }
      if (node.type === "circle") {
        const parameters = node.data.parameters ?? {};
        const radius = Number(parameters.radius ?? 1);
        const segments = Number(parameters.segments ?? 48);
        const center = {
          x: Number(parameters.centerX ?? 0),
          y: Number(parameters.centerY ?? 0),
          z: Number(parameters.centerZ ?? 0),
        };
        if (Number.isFinite(radius) && radius > 0) {
          const points = buildCirclePoints(center, radius, segments, get().cPlane);
          const reuse =
            node.data.geometryId &&
            node.data.vertexIds &&
            node.data.vertexIds.length === points.length;
          if (reuse && node.data.geometryId && node.data.vertexIds) {
            node.data.vertexIds.forEach((vertexId, index) => {
              const point = points[index];
              if (!point) return;
              get().updateGeometry(vertexId, { position: point });
            });
            get().updateGeometry(node.data.geometryId, {
              vertexIds: node.data.vertexIds,
              closed: true,
            });
          } else {
            if (node.data.vertexIds?.length) {
              get().deleteGeometry(node.data.vertexIds, { recordHistory: true });
            }
            const vertexIds = points.map(() => createGeometryId("vertex"));
            const circleId = node.data.geometryId ?? createGeometryId("polyline");
            const vertexItems: Geometry[] = points.map((point, index) => ({
              id: vertexIds[index],
              type: "vertex",
              position: point,
              layerId: "layer-default",
              area_m2: 1,
              thickness_m: 0.1,
            }));
            const circleItem: Geometry = {
              id: circleId,
              type: "polyline",
              vertexIds,
              closed: true,
              degree: 2,
              layerId: "layer-default",
            };
            get().addGeometryItems([...vertexItems, circleItem], {
              selectIds: get().selectedGeometryIds,
              recordHistory: true,
            });
            set((state) => ({
              workflow: {
                ...state.workflow,
                nodes: state.workflow.nodes.map((entry) =>
                  entry.id === nodeId
                    ? {
                        ...entry,
                        data: {
                          ...entry.data,
                          geometryId: circleId,
                          geometryType: "polyline",
                          vertexIds,
                          closed: true,
                        },
                      }
                    : entry
                ),
              },
            }));
          }
        }
      }
    }
    get().recalculateWorkflow();
  },
  addNode: (type) => {
    const position = { x: 120, y: 120 + Math.random() * 120 };
    get().addNodeAt(type, position);
  },
  addNodeAt: (type, position) => {
    const id = `node-${type}-${Date.now()}`;
    const labels: Partial<Record<NodeType, string>> = {
      geometryReference: "Geometry Reference",
      geometryViewer: "Geometry Viewer",
      meshConvert: "Mesh Convert",
      stlExport: "STL Export",
      stlImport: "STL Import",
      point: "Point Generator",
      line: "Line",
      rectangle: "Rectangle",
      circle: "Circle",
      arc: "Arc",
      curve: "Curve",
      polyline: "Polyline",
      surface: "Surface",
      loft: "Loft",
      extrude: "Extrude",
      primitive: "Primitive",
      box: "Box Builder",
      sphere: "Sphere",
      boolean: "Boolean",
      offset: "Offset",
      fillet: "Fillet",
      filletEdges: "Fillet Edges",
      offsetSurface: "Offset Surface",
      thickenMesh: "Thicken Mesh",
      plasticwrap: "Plasticwrap",
      solid: "Solid",
      measurement: "Measurement",
      dimensions: "Dimensions",
      geometryArray: "Geometry Array",
      rotate: "Rotate",
      scale: "Scale",
      fieldTransformation: "Field Transformation",
      voxelizeGeometry: "Voxelize Geometry",
      extractIsosurface: "Extract Isosurface",
      topologyOptimize: "Topology Optimize",
      topologySolver: "Topology Solver",
      biologicalSolver: "Biological Solver",
      origin: "Origin",
      unitX: "Unit X",
      unitY: "Unit Y",
      unitZ: "Unit Z",
      unitXYZ: "Unit XYZ",
      moveVector: "Move Vector",
      scaleVector: "Scale Vector",
      number: "Number",
      add: "Add",
      subtract: "Subtract",
      multiply: "Multiply",
      divide: "Divide",
      clamp: "Clamp",
      min: "Min",
      max: "Max",
      expression: "Expression",
      scalarFunctions: "Scalar Functions",
      conditional: "Conditional",
      vectorConstruct: "Vector Compose",
      vectorDeconstruct: "Vector Decompose",
      vectorAdd: "Vector Add",
      vectorSubtract: "Vector Subtract",
      vectorScale: "Vector Scale",
      vectorLength: "Vector Length",
      vectorNormalize: "Vector Normalize",
      vectorDot: "Vector Dot",
      vectorCross: "Vector Cross",
      distance: "Distance",
      vectorFromPoints: "Vector From Points",
      vectorAngle: "Vector Angle",
      vectorLerp: "Vector Lerp",
      vectorProject: "Vector Project",
      pointAttractor: "Point Attractor",
      move: "Move",
      movePoint: "Move Point",
      movePointByVector: "Move Point By Vector",
      rotateVectorAxis: "Rotate Vector",
      mirrorVector: "Mirror Vector",
      listCreate: "List Create",
      listLength: "List Length",
      listItem: "List Item",
      listIndexOf: "List Index Of",
      listPartition: "List Partition",
      listFlatten: "List Flatten",
      listSlice: "List Slice",
      listReverse: "List Reverse",
      listSum: "List Sum",
      listAverage: "List Average",
      listMin: "List Min",
      listMax: "List Max",
      listMedian: "List Median",
      listStdDev: "List Std Dev",
      geometryInfo: "Geometry Info",
      metadataPanel: "Metadata Panel",
      annotations: "Annotations",
      geometryVertices: "Geometry Vertices",
      geometryEdges: "Geometry Edges",
      geometryFaces: "Geometry Faces",
      geometryNormals: "Geometry Normals",
      geometryControlPoints: "Control Points",
      range: "Range",
      linspace: "Linspace",
      remap: "Remap",
      random: "Random",
      repeat: "Repeat",
      linearArray: "Linear Array",
      polarArray: "Polar Array",
      gridArray: "Grid Array",
      sineWave: "Sine Wave",
      cosineWave: "Cosine Wave",
      sawtoothWave: "Sawtooth Wave",
      triangleWave: "Triangle Wave",
      squareWave: "Square Wave",
    };
    PRIMITIVE_NODE_CATALOG.forEach((entry) => {
      labels[entry.id as NodeType] = entry.label;
    });
    const parameters = getDefaultParameters(type);
    const data: WorkflowNodeData = {
      label: labels[type] ?? type,
      parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
    };
    if (type === "geometryReference") {
      data.geometryId = get().geometry[0]?.id ?? "vertex-1";
    }
    if (type === "move") {
      const geometryId =
        get().selectedGeometryIds[0] ?? get().geometry[0]?.id ?? null;
      if (geometryId) {
        data.geometryId = geometryId;
        data.moveGeometryId = geometryId;
        data.moveOffset = { x: 0, y: 0, z: 0 };
      }
    }
    if (type === "rotate" || type === "scale") {
      const geometryId =
        get().selectedGeometryIds[0] ?? get().geometry[0]?.id ?? null;
      if (geometryId) {
        data.geometryId = geometryId;
      }
    }
    if (type === "point") {
      data.point = { x: 0, y: 0, z: 0 };
      const geometryId = createGeometryId("vertex");
      data.geometryId = geometryId;
      data.geometryType = "vertex";
      data.isLinked = true;
      get().addGeometryItems(
        [
          {
            id: geometryId,
            type: "vertex",
            position: data.point,
            layerId: "layer-default",
            area_m2: 1,
            thickness_m: 0.1,
          },
        ],
        { selectIds: get().selectedGeometryIds, recordHistory: true }
      );
    }
    if (type === "line") {
      data.pointsText = "0 0 0  1 0 0";
      data.closed = false;
      const points = parsePointsText(data.pointsText).slice(0, 2);
      const vertexIds = points.map(() => createGeometryId("vertex"));
      data.vertexIds = vertexIds;
      const lineId = createGeometryId("polyline");
      data.geometryId = lineId;
      data.geometryType = "polyline";
      data.isLinked = true;
      const vertexItems: Geometry[] = points.map((point, index) => ({
        id: vertexIds[index],
        type: "vertex",
        position: point,
        layerId: "layer-default",
        area_m2: 1,
        thickness_m: 0.1,
      }));
      const lineItem: Geometry = {
        id: lineId,
        type: "polyline",
        vertexIds,
        closed: false,
        degree: 1,
        layerId: "layer-default",
      };
      get().addGeometryItems([...vertexItems, lineItem], {
        selectIds: get().selectedGeometryIds,
        recordHistory: true,
      });
    }
    if (type === "rectangle") {
      const width = typeof parameters.width === "number" ? parameters.width : 1;
      const height = typeof parameters.height === "number" ? parameters.height : 1;
      const center = {
        x: typeof parameters.centerX === "number" ? parameters.centerX : 0,
        y: typeof parameters.centerY === "number" ? parameters.centerY : 0,
        z: typeof parameters.centerZ === "number" ? parameters.centerZ : 0,
      };
      const points = buildRectanglePoints(center, width, height, get().cPlane);
      const vertexIds = points.map(() => createGeometryId("vertex"));
      data.vertexIds = vertexIds;
      const rectId = createGeometryId("polyline");
      data.geometryId = rectId;
      data.geometryType = "polyline";
      data.isLinked = true;
      const vertexItems: Geometry[] = points.map((point, index) => ({
        id: vertexIds[index],
        type: "vertex",
        position: point,
        layerId: "layer-default",
        area_m2: 1,
        thickness_m: 0.1,
      }));
      const rectItem: Geometry = {
        id: rectId,
        type: "polyline",
        vertexIds,
        closed: true,
        degree: 1,
        layerId: "layer-default",
      };
      get().addGeometryItems([...vertexItems, rectItem], {
        selectIds: get().selectedGeometryIds,
        recordHistory: true,
      });
    }
    if (type === "circle") {
      const radius = typeof parameters.radius === "number" ? parameters.radius : 1;
      const segments = typeof parameters.segments === "number" ? parameters.segments : 48;
      const center = {
        x: typeof parameters.centerX === "number" ? parameters.centerX : 0,
        y: typeof parameters.centerY === "number" ? parameters.centerY : 0,
        z: typeof parameters.centerZ === "number" ? parameters.centerZ : 0,
      };
      const points = buildCirclePoints(center, radius, segments, get().cPlane);
      const vertexIds = points.map(() => createGeometryId("vertex"));
      data.vertexIds = vertexIds;
      const circleId = createGeometryId("polyline");
      data.geometryId = circleId;
      data.geometryType = "polyline";
      data.isLinked = true;
      const vertexItems: Geometry[] = points.map((point, index) => ({
        id: vertexIds[index],
        type: "vertex",
        position: point,
        layerId: "layer-default",
        area_m2: 1,
        thickness_m: 0.1,
      }));
      const circleItem: Geometry = {
        id: circleId,
        type: "polyline",
        vertexIds,
        closed: true,
        degree: 2,
        layerId: "layer-default",
      };
      get().addGeometryItems([...vertexItems, circleItem], {
        selectIds: get().selectedGeometryIds,
        recordHistory: true,
      });
    }
    if (type === "arc") {
      data.pointsText = "0 0 0  1 0 0  0.5 0 0.6";
      data.closed = false;
      const controlPoints = parsePointsText(data.pointsText).slice(0, 3);
      const [start, end, through] = controlPoints;
      const arcPoints =
        start && end && through
          ? computeArcPolyline(get().cPlane, start, end, through, 48) ?? [start, end]
          : controlPoints;
      const vertexIds = arcPoints.map(() => createGeometryId("vertex"));
      data.vertexIds = vertexIds;
      const arcId = createGeometryId("polyline");
      data.geometryId = arcId;
      data.geometryType = "polyline";
      data.isLinked = true;
      const vertexItems: Geometry[] = arcPoints.map((point, index) => ({
        id: vertexIds[index],
        type: "vertex",
        position: point,
        layerId: "layer-default",
        area_m2: 1,
        thickness_m: 0.1,
      }));
      const arcItem: Geometry = {
        id: arcId,
        type: "polyline",
        vertexIds,
        closed: false,
        degree: 1,
        layerId: "layer-default",
      };
      get().addGeometryItems([...vertexItems, arcItem], {
        selectIds: get().selectedGeometryIds,
        recordHistory: true,
      });
    }
    if (type === "curve") {
      data.pointsText = "0 0 0  1 0 0  1 0 1  0 0 1";
      const controlPoints = parsePointsText(data.pointsText);
      const degreeRaw = typeof parameters.degree === "number" ? parameters.degree : 3;
      const degree = Math.min(3, Math.max(1, Math.round(degreeRaw))) as 1 | 2 | 3;
      const resolutionRaw =
        typeof parameters.resolution === "number" ? parameters.resolution : 64;
      const resolution = Math.min(256, Math.max(16, Math.round(resolutionRaw)));
      const closed = Boolean(parameters.closed);
      data.closed = closed;
      const curvePoints = interpolatePolyline(controlPoints, degree, closed, resolution);
      const vertexIds = curvePoints.map(() => createGeometryId("vertex"));
      data.vertexIds = vertexIds;
      const curveId = createGeometryId("polyline");
      data.geometryId = curveId;
      data.geometryType = "polyline";
      data.isLinked = true;
      const vertexItems: Geometry[] = curvePoints.map((point, index) => ({
        id: vertexIds[index],
        type: "vertex",
        position: point,
        layerId: "layer-default",
        area_m2: 1,
        thickness_m: 0.1,
      }));
      const curveItem: Geometry = {
        id: curveId,
        type: "polyline",
        vertexIds,
        closed,
        degree,
        layerId: "layer-default",
      };
      get().addGeometryItems([...vertexItems, curveItem], {
        selectIds: get().selectedGeometryIds,
        recordHistory: true,
      });
    }
    if (type === "polyline") {
      data.pointsText = "0 0 0  1 0 0  1 0 1";
      data.closed = false;
      const points = parsePointsText(data.pointsText);
      const vertexIds = points.map(() => createGeometryId("vertex"));
      data.vertexIds = vertexIds;
      const polylineId = createGeometryId("polyline");
      data.geometryId = polylineId;
      data.geometryType = "polyline";
      data.isLinked = true;
      const vertexItems: Geometry[] = points.map((point, index) => ({
        id: vertexIds[index],
        type: "vertex",
        position: point,
        layerId: "layer-default",
        area_m2: 1,
        thickness_m: 0.1,
      }));
      const polylineItem: Geometry = {
        id: polylineId,
        type: "polyline",
        vertexIds,
        closed: false,
        degree: 1,
        layerId: "layer-default",
      };
      get().addGeometryItems([...vertexItems, polylineItem], {
        selectIds: get().selectedGeometryIds,
        recordHistory: true,
      });
    }
    if (type === "surface") {
      data.pointsText = "0 0 0  1 0 0  1 0 1  0 0 1";
      data.closed = true;
      const points = parsePointsText(data.pointsText);
      const vertexIds = points.map(() => createGeometryId("vertex"));
      data.vertexIds = vertexIds;
      const surfaceId = createGeometryId("surface");
      data.geometryId = surfaceId;
      data.geometryType = "surface";
      data.isLinked = true;
      const vertexItems: Geometry[] = points.map((point, index) => ({
        id: vertexIds[index],
        type: "vertex",
        position: point,
        layerId: "layer-default",
        area_m2: 1,
        thickness_m: 0.1,
      }));
      const { mesh, plane } = generateSurfaceMesh([points]);
      const surfaceItem: Geometry = {
        id: surfaceId,
        type: "surface",
        mesh,
        loops: [vertexIds],
        plane,
        layerId: "layer-default",
      };
      get().addGeometryItems([...vertexItems, surfaceItem], {
        selectIds: get().selectedGeometryIds,
        recordHistory: true,
      });
    }

    if (type === "loft") {
      const emptyMesh: RenderMesh = { positions: [], normals: [], uvs: [], indices: [] };
      const loftId = createGeometryId("loft");
      data.geometryId = loftId;
      data.geometryType = "loft";
      data.isLinked = true;
      const loftItem: Geometry = {
        id: loftId,
        type: "loft",
        mesh: emptyMesh,
        sectionIds: [],
        degree: 3,
        closed: false,
        layerId: "layer-default",
      };
      get().addGeometryItems([loftItem], {
        selectIds: get().selectedGeometryIds,
        recordHistory: true,
      });
    }

    if (type === "extrude") {
      const emptyMesh: RenderMesh = { positions: [], normals: [], uvs: [], indices: [] };
      const extrudeId = createGeometryId("extrude");
      data.geometryId = extrudeId;
      data.geometryType = "extrude";
      data.isLinked = true;
      const extrudeItem: Geometry = {
        id: extrudeId,
        type: "extrude",
        mesh: emptyMesh,
        profileIds: [],
        distance: 0,
        direction: { x: 0, y: 1, z: 0 },
        capped: true,
        layerId: "layer-default",
      };
      get().addGeometryItems([extrudeItem], {
        selectIds: get().selectedGeometryIds,
        recordHistory: true,
      });
    }

    if (type === "meshConvert" || type === "stlImport") {
      const emptyMesh: RenderMesh = { positions: [], normals: [], uvs: [], indices: [] };
      const meshId = createGeometryId("mesh");
      data.geometryId = meshId;
      data.geometryType = "mesh";
      data.isLinked = true;
      const meshItem: Geometry = {
        id: meshId,
        type: "mesh",
        mesh: emptyMesh,
        layerId: "layer-default",
        sourceNodeId: id,
        metadata: {
          label: labels[type] ?? "Mesh",
        },
      };
      get().addGeometryItems([meshItem], {
        selectIds: get().selectedGeometryIds,
        recordHistory: true,
      });
    }

    const primitiveKind = resolvePrimitiveKindForNode(type, parameters);
    if (primitiveKind) {
      const config = resolvePrimitiveConfig(parameters, { kind: primitiveKind });
      const mesh = generatePrimitiveMesh(config);
      const origin = { x: 0, y: 0, z: 0 };
      const geometryId = get().addGeometryMesh(mesh, {
        origin,
        sourceNodeId: id,
        recordHistory: true,
        selectIds: get().selectedGeometryIds,
        metadata: {
          label: labels[type],
          primitive: { kind: config.kind, origin, params: { ...config } },
        },
      });
      data.geometryId = geometryId;
      data.geometryType = "mesh";
      data.isLinked = true;
    }

    if (type === "box") {
      data.boxOrigin = { x: 0, y: 0, z: 0 };
      data.boxDimensions = { width: 1, height: 1, depth: 1 };
      const geometryId = get().addGeometryBox({
        origin: data.boxOrigin,
        size: data.boxDimensions,
        sourceNodeId: id,
        recordHistory: true,
        selectIds: get().selectedGeometryIds,
        metadata: { label: labels[type] },
      });
      data.geometryId = geometryId;
      data.geometryType = "mesh";
      data.isLinked = true;
    }

    if (type === "boolean") {
      const emptyMesh: RenderMesh = {
        positions: [],
        normals: [],
        uvs: [],
        indices: [],
      };
      const geometryId = get().addGeometryMesh(emptyMesh, {
        sourceNodeId: id,
        recordHistory: true,
        selectIds: get().selectedGeometryIds,
        metadata: { label: labels[type] },
      });
      data.geometryId = geometryId;
      data.geometryType = "mesh";
      data.isLinked = true;
    }
    if (type === "offset") {
      const points = buildRectanglePoints({ x: 0, y: 0, z: 0 }, 1, 1, get().cPlane);
      const vertexIds = points.map(() => createGeometryId("vertex"));
      const offsetId = createGeometryId("polyline");
      data.geometryId = offsetId;
      data.geometryType = "polyline";
      data.vertexIds = vertexIds;
      data.isLinked = true;
      const vertexItems: Geometry[] = points.map((point, index) => ({
        id: vertexIds[index],
        type: "vertex",
        position: point,
        layerId: "layer-default",
        area_m2: 1,
        thickness_m: 0.1,
      }));
      const offsetItem: Geometry = {
        id: offsetId,
        type: "polyline",
        vertexIds,
        closed: true,
        degree: 1,
        layerId: "layer-default",
      };
      get().addGeometryItems([...vertexItems, offsetItem], {
        selectIds: get().selectedGeometryIds,
        recordHistory: true,
      });
    }
    if (type === "geometryArray") {
      data.geometryIds = [];
    }

    if (type === "topologyOptimize") {
      data.topologySettings = { ...defaultTopologySettings };
      data.topologyProgress = { ...defaultTopologyProgress };
    }

    if (type === "sphere") {
      data.sphereOrigin = { x: 0, y: 0, z: 0 };
      data.sphereRadius = 0.5;
      const geometryId = get().addGeometrySphere({
        origin: data.sphereOrigin,
        radius: data.sphereRadius,
        sourceNodeId: id,
        recordHistory: true,
        selectIds: get().selectedGeometryIds,
        metadata: { label: labels[type] },
      });
      data.geometryId = geometryId;
      data.geometryType = "mesh";
      data.isLinked = true;
    }
    if (type === "extractIsosurface") {
      const emptyMesh: RenderMesh = {
        positions: [],
        normals: [],
        uvs: [],
        indices: [],
      };
      const geometryId = get().addGeometryMesh(emptyMesh, {
        sourceNodeId: id,
        recordHistory: true,
        selectIds: get().selectedGeometryIds,
        metadata: { label: labels[type] },
      });
      data.geometryId = geometryId;
      data.geometryType = "mesh";
      data.isLinked = true;
    }

    set((state) => ({
      workflowHistory: appendWorkflowHistory(
        state.workflowHistory,
        state.workflow
      ),
      workflow: {
        ...state.workflow,
        nodes: [
          ...state.workflow.nodes,
          { id, type, position, data },
        ],
      },
    }));
    get().recalculateWorkflow();
  },
  onNodesChange: (changes) => {
    const previousNodes = get().workflow.nodes;
    const removedNodes = changes
      .filter((change) => change.type === "remove")
      .map((change) => previousNodes.find((node) => node.id === change.id))
      .filter(Boolean) as WorkflowNode[];
    set((state) => ({
      workflowHistory: shouldTrackNodeChange(changes)
        ? appendWorkflowHistory(state.workflowHistory, state.workflow)
        : state.workflowHistory,
      workflow: {
        ...state.workflow,
        nodes: applyNodeChanges(changes, state.workflow.nodes),
      },
    }));
    if (removedNodes.length > 0) {
      const ownedNodes = removedNodes.filter(
        (node) => node.type && GEOMETRY_OWNING_NODE_TYPES.has(node.type as NodeType)
      );
      const geometryIds = ownedNodes
        .map((node) => node.data?.geometryId)
        .filter(Boolean) as string[];
      const arrayGeometryIds = ownedNodes
        .flatMap((node) => node.data?.geometryIds ?? [])
        .filter(Boolean) as string[];
      const geometryById = new Map(get().geometry.map((item) => [item.id, item]));
      const arrayVertexIds = arrayGeometryIds.flatMap((geometryId) => {
        const geometry = geometryById.get(geometryId);
        return geometry?.type === "polyline" ? geometry.vertexIds : [];
      });
      const vertexIds = ownedNodes
        .flatMap((node) => node.data?.vertexIds ?? [])
        .filter(Boolean);
      const idsToDelete = Array.from(
        new Set([...geometryIds, ...arrayGeometryIds, ...arrayVertexIds, ...vertexIds])
      );
      if (idsToDelete.length > 0) {
        get().deleteGeometry(idsToDelete, { recordHistory: true });
      }
    }
    get().recalculateWorkflow();
  },
  onEdgesChange: (changes) => {
    set((state) => ({
      workflowHistory: shouldTrackEdgeChange(changes)
        ? appendWorkflowHistory(state.workflowHistory, state.workflow)
        : state.workflowHistory,
      workflow: {
        ...state.workflow,
        edges: applyEdgeChanges(changes, state.workflow.edges),
      },
    }));
    get().recalculateWorkflow();
  },
  onConnect: (connection) => {
    const state = get();
    const sourceNode = state.workflow.nodes.find((node) => node.id === connection.source);
    const targetNode = state.workflow.nodes.find((node) => node.id === connection.target);
    if (!sourceNode || !targetNode) return;
    if (!sourceNode.type || !targetNode.type) return;

    const sourceParameters = resolveNodeParameters(sourceNode);
    const targetParameters = resolveNodeParameters(targetNode);
    const sourcePorts = resolveNodePorts(sourceNode, sourceParameters);
    const targetPorts = resolveNodePorts(targetNode, targetParameters);
    const sourceDefinition = getNodeDefinition(sourceNode.type);

    const defaultSourceKey = sourceDefinition?.primaryOutputKey ?? sourcePorts.outputs[0]?.key;
    const defaultTargetKey = targetPorts.inputs[0]?.key;
    const sourceKey = connection.sourceHandle ?? defaultSourceKey;
    const targetKey = connection.targetHandle ?? defaultTargetKey;
    if (!sourceKey || !targetKey) return;

    const sourcePort = resolvePortByKey(sourcePorts.outputs, sourceKey);
    const targetPort = resolvePortByKey(targetPorts.inputs, targetKey);
    if (!sourcePort || !targetPort) return;
    if (!isPortTypeCompatible(sourcePort.type, targetPort.type)) return;

    const normalizedConnection = {
      ...connection,
      sourceHandle: sourceKey,
      targetHandle: targetKey,
    };

    set((current) => {
      const filteredEdges = targetPort.allowMultiple
        ? current.workflow.edges
        : current.workflow.edges.filter(
            (edge) => !(edge.target === connection.target && edge.targetHandle === targetKey)
          );
      return {
        workflowHistory: appendWorkflowHistory(current.workflowHistory, current.workflow),
        workflow: {
          ...current.workflow,
          edges: addEdge(normalizedConnection, filteredEdges),
        },
      };
    });
    get().recalculateWorkflow();
  },
  undoWorkflow: () => {
    const { workflowHistory } = get();
    if (workflowHistory.length === 0) return;
    const previous = workflowHistory[workflowHistory.length - 1];
    set((state) => ({
      workflow: cloneWorkflow(previous),
      workflowHistory: state.workflowHistory.slice(0, -1),
    }));
    get().recalculateWorkflow();
  },
  deleteSelectedNodes: () => {
    const { workflow } = get();
    const selectedIds = workflow.nodes
      .filter((node) => node.selected)
      .map((node) => node.id);
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const removedNodes = workflow.nodes.filter((node) => selectedSet.has(node.id));
    set((state) => ({
      workflowHistory: appendWorkflowHistory(
        state.workflowHistory,
        state.workflow
      ),
      workflow: {
        ...state.workflow,
        nodes: state.workflow.nodes.filter((node) => !selectedSet.has(node.id)),
        edges: state.workflow.edges.filter(
          (edge) => !selectedSet.has(edge.source) && !selectedSet.has(edge.target)
        ),
      },
    }));
    const ownedNodes = removedNodes.filter(
      (node) => node.type && GEOMETRY_OWNING_NODE_TYPES.has(node.type as NodeType)
    );
    const geometryIds = ownedNodes
      .map((node) => node.data?.geometryId)
      .filter(Boolean) as string[];
    const geometryById = new Map(get().geometry.map((item) => [item.id, item]));
    const vertexIds = ownedNodes
      .flatMap((node) => node.data?.vertexIds ?? [])
      .filter(Boolean);
    const arrayGeometryIds = ownedNodes
      .flatMap((node) => node.data?.geometryIds ?? [])
      .filter(Boolean) as string[];
    const arrayVertexIds = arrayGeometryIds.flatMap((geometryId) => {
      const geometry = geometryById.get(geometryId);
      return geometry?.type === "polyline" ? geometry.vertexIds : [];
    });
    const idsToDelete = Array.from(
      new Set([...geometryIds, ...arrayGeometryIds, ...arrayVertexIds, ...vertexIds])
    );
    if (idsToDelete.length > 0) {
      get().deleteGeometry(idsToDelete, { recordHistory: true });
    }
    get().recalculateWorkflow();
  },
  loadProject: (project) => {
    const nextLayers = project.layers.map((layer) => ({
      ...layer,
      visible: layer.visible ?? true,
      locked: layer.locked ?? false,
      parentId: layer.parentId ?? null,
    }));
    const nextGeometry = project.geometry;
    set({
      geometry: nextGeometry,
      layers: nextLayers,
      assignments: project.assignments,
      selectedGeometryIds: project.geometry.length > 0 ? [project.geometry[0].id] : [],
      selectionMode: "object",
      componentSelection: [],
      sceneNodes: buildSceneNodesFromGeometry(nextGeometry),
      hiddenGeometryIds: [],
      lockedGeometryIds: [],
      cPlane: defaultCPlane,
      transformOrientation: "world",
      pivot: defaultPivot,
      displayMode: "shaded",
      viewSolidity: SOLIDITY_PRESETS.shaded,
      viewSettings: defaultViewSettings,
      snapSettings: defaultSnapSettings,
      gridSettings: defaultGridSettings,
      camera: defaultCamera,
      clipboard: null,
      modelerHistoryPast: [],
      modelerHistoryFuture: [],
      workflow: pruneWorkflowState(project.workflow),
      workflowHistory: [],
    });
    get().recalculateWorkflow();
  },
  getProjectPayload: () => {
    const state = get();
    return {
      geometry: state.geometry,
      layers: state.layers,
      assignments: state.assignments,
      workflow: state.workflow,
    };
  },
  recalculateWorkflow: () => {
    const state = get();
    const prunedWorkflow = pruneWorkflowState(state.workflow);
    const evaluated = evaluateWorkflow(
      prunedWorkflow.nodes,
      prunedWorkflow.edges,
      state.geometry
    );
    const moveApplied = applyMoveNodesToGeometry(evaluated.nodes, state.geometry);
    if (moveApplied.didApply) {
      get().recordModelerHistory();
    }
    const rotateApplied = applyRotateNodesToGeometry(
      moveApplied.nodes,
      moveApplied.geometry
    );
    const scaleApplied = applyScaleNodesToGeometry(
      rotateApplied.nodes,
      rotateApplied.geometry
    );
    const loftApplied = applyLoftNodesToGeometry(
      scaleApplied.nodes,
      scaleApplied.geometry
    );
    const extrudeApplied = applyExtrudeNodesToGeometry(
      loftApplied.nodes,
      loftApplied.geometry
    );
    const booleanApplied = applyBooleanNodesToGeometry(
      extrudeApplied.nodes,
      extrudeApplied.geometry
    );
    const offsetApplied = applyOffsetNodesToGeometry(
      booleanApplied.nodes,
      booleanApplied.geometry
    );
    const arrayApplied = applyGeometryArrayNodesToGeometry(
      offsetApplied.nodes,
      offsetApplied.geometry
    );
    const isoApplied = applyIsosurfaceNodesToGeometry(
      arrayApplied.nodes,
      arrayApplied.geometry
    );
    const meshApplied = applyMeshConvertNodesToGeometry(
      isoApplied.nodes,
      isoApplied.geometry
    );
    const importApplied = applyImportNodesToGeometry(
      meshApplied.nodes,
      meshApplied.geometry
    );
    const exportHandled = handleExportNodes(importApplied.nodes, importApplied.geometry);
    const nextGeometry = importApplied.geometry;
    const previousIds = new Set(state.geometry.map((item) => item.id));
    const nextIds = new Set(nextGeometry.map((item) => item.id));
    const geometryIdsChanged =
      previousIds.size !== nextIds.size ||
      Array.from(nextIds).some((id) => !previousIds.has(id));
    const nextState: Partial<ProjectStore> = {
      geometry: nextGeometry,
      workflow: {
        nodes: exportHandled.nodes,
        edges: evaluated.edges,
      },
    };
    if (geometryIdsChanged) {
      Object.assign(
        nextState,
        reconcileGeometryCollections(
          nextGeometry,
          state.layers,
          state.sceneNodes,
          state.assignments,
          state.hiddenGeometryIds,
          state.lockedGeometryIds,
          state.selectedGeometryIds
        )
      );
    }
    set(nextState);
  },
  pruneWorkflow: () => {
    set((state) => {
      const prunedWorkflow = pruneWorkflowState(state.workflow);
      if (prunedWorkflow === state.workflow) return {};
      return { workflow: prunedWorkflow };
    });
    get().recalculateWorkflow();
  },
  setProjectName: (name) => set({ projectName: name }),
  setCurrentSaveId: (id) => set({ currentSaveId: id }),
  setCPlane: (plane, options) => {
    if (options?.recordHistory !== false) {
      get().recordModelerHistory();
    }
    set({ cPlane: plane });
  },
  resetCPlane: (origin, options) => {
    const target = origin
      ? { x: origin.x, y: origin.y, z: origin.z }
      : { x: 0, y: 0, z: 0 };
    const basePlane: CPlane = {
      origin: target,
      normal: { x: 0, y: 1, z: 0 },
      xAxis: { x: 1, y: 0, z: 0 },
      yAxis: { x: 0, y: 0, z: 1 },
    };
    get().setCPlane(basePlane, options);
  },
}));
