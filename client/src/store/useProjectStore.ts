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
  NurbsCurveGeometry,
  NurbsSurfaceGeometry,
  BRepGeometry,
  BRepData,
  BRepCurve,
  BRepSurface,
  MeshPrimitiveGeometry,
  NURBSCurve,
  NURBSSurface,
  SceneNode,
  SelectionMode,
  SnapSettings,
  TransformOrientation,
  GumballAlignment,
  GumballStepSettings,
  GumballSettings,
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
import { computeMeshVolumeAndCentroid, computePrimitivePhysicalProperties, resolveDensity } from "../geometry/physical";
import { withTessellationMetadata } from "../geometry/meshTessellation";
import { tessellateCurveAdaptive, tessellateSurfaceAdaptive } from "../geometry/tessellation";
import { tessellateBRepToMesh, brepFromMesh, createBRepBox, createBRepSphere, createBRepCylinder } from "../geometry/brep";
import {
  computeBestFitPlane,
  buildPlaneFromNormal,
  projectPointToPlane,
  unprojectPointFromPlane,
} from "../geometry/math";
import {
  PRIMITIVE_NODE_CATALOG,
  PRIMITIVE_NODE_KIND_BY_TYPE,
  PRIMITIVE_NODE_TYPE_IDS,
} from "../data/primitiveCatalog";
import { createArcNurbs, createCircleNurbs } from "../geometry/arc";
import { createNurbsCurveFromPoints, interpolateNurbsCurve } from "../geometry/nurbs";
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
import { hexToRgb, normalizeHexColor, normalizeRgbInput, rgbToHex } from "../utils/color";
import { buildStressVertexColors } from "../utils/stressColors";
import { buildChemistrySolverExampleScript } from "../workflow/nodes/solver/chemistry/exampleScripting";
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
  showMoveArms: boolean;
  gumballStep: GumballStepSettings;
  gumballSettings: GumballSettings;
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
  setShowMoveArms: (show: boolean) => void;
  setGumballStep: (settings: Partial<GumballStepSettings>) => void;
  setGumballSettings: (settings: Partial<GumballSettings>) => void;
  setPivotMode: (mode: PivotMode) => void;
  setPivotPosition: (position: Vec3) => void;
  setPivotCursorPosition: (position: Vec3 | null) => void;
  setPivotPickedPosition: (position: Vec3 | null) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setViewSolidity: (
    value: number,
    options?: { overrideDisplayMode?: boolean }
  ) => void;
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
  addGeometryNurbsCurve: (nurbs: NURBSCurve, options?: NurbsCurveInsertOptions) => string;
  addGeometryNurbsSurface: (
    nurbs: NURBSSurface,
    options?: NurbsSurfaceInsertOptions
  ) => string;
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
    options: LoftInsertOptions
  ) => string;
  addGeometryExtrude: (
    mesh: RenderMesh,
    profileIds: string[],
    options: ExtrudeInsertOptions
  ) => string;
  addGeometryItems: (
    items: Geometry[],
    options?: { selectIds?: string[]; recordHistory?: boolean }
  ) => void;
  replaceGeometryBatch: (
    items: Geometry[],
    options?: { recordHistory?: boolean }
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
  updateGeometryMetadata: (
    id: string,
    metadata: Record<string, unknown> | undefined,
    options?: { recordHistory?: boolean }
  ) => void;
  deleteGeometry: (
    ids: string[] | string,
    options?: { recordHistory?: boolean }
  ) => void;
  setMaterialAssignment: (assignment: MaterialAssignment) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  addNode: (type: NodeType) => void;
  addNodeAt: (type: NodeType, position: { x: number; y: number }) => string;
  addGeometryReferenceNode: (geometryId?: string) => string | null;
  addPhysicsSolverRig: (position: { x: number; y: number }) => void;
  addBiologicalSolverRig: (position: { x: number; y: number }) => void;
  addChemistrySolverRig: (position: { x: number; y: number }) => void;
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
  "pipeSweep",
  "pipeMerge",
  "primitive",
  ...(PRIMITIVE_NODE_TYPE_IDS as NodeType[]),
  "box",
  "sphere",
  "boolean",
  "offset",
  "pointCloud",
  "geometryArray",
  "extractIsosurface",
  "meshConvert",
  "nurbsToMesh",
  "brepToMesh",
  "meshToBrep",
  "meshBoolean",
  "geodesicSphere",
  "stlImport",
  "physicsSolver",
  "chemistrySolver",
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

const defaultGumballStep: GumballStepSettings = {
  distance: 1,
  angle: 1,
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
  showPointPickDebug: false,
  showEdges: true,
  showControlPoints: false,
};

const defaultGumballSettings: GumballSettings = {
  clickToStep: true,
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

type LoftInsertOptions = {
  degree: 1 | 2 | 3;
  closed: boolean;
  geometryId?: string;
  layerId?: string;
  recordHistory?: boolean;
  selectIds?: string[];
  sourceNodeId?: string;
  metadata?: Record<string, unknown>;
};

type ExtrudeInsertOptions = {
  distance: number;
  direction: Vec3;
  capped: boolean;
  geometryId?: string;
  layerId?: string;
  recordHistory?: boolean;
  selectIds?: string[];
  sourceNodeId?: string;
  metadata?: Record<string, unknown>;
};

type NurbsCurveInsertOptions = {
  recordHistory?: boolean;
  selectIds?: string[];
  layerId?: string;
  area_m2?: number;
  thickness_m?: number;
  sourceNodeId?: string;
  metadata?: Record<string, unknown>;
  closed?: boolean;
};

type NurbsSurfaceInsertOptions = {
  recordHistory?: boolean;
  selectIds?: string[];
  layerId?: string;
  area_m2?: number;
  thickness_m?: number;
  sourceNodeId?: string;
  metadata?: Record<string, unknown>;
  mesh?: RenderMesh;
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

const dotVec3 = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;

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

const translateControlPoints = (points: Vec3[], delta: Vec3) =>
  points.map((point) => addVec3(point, delta));

const translateControlPointGrid = (grid: Vec3[][], delta: Vec3) =>
  grid.map((row) => row.map((point) => addVec3(point, delta)));

const translateBRepCurve = (curve: BRepCurve, delta: Vec3): BRepCurve => {
  if (curve.kind === "line") {
    return {
      ...curve,
      start: addVec3(curve.start, delta),
      end: addVec3(curve.end, delta),
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
        origin: addVec3(surface.plane.origin, delta),
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
    position: addVec3(vertex.position, delta),
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

const transformControlPoints = (points: Vec3[], matrix: Mat4) =>
  points.map((point) => transformPoint(matrix, point));

const transformControlPointGrid = (grid: Vec3[][], matrix: Mat4) =>
  grid.map((row) => row.map((point) => transformPoint(matrix, point)));

const transformBRepCurve = (curve: BRepCurve, matrix: Mat4): BRepCurve => {
  if (curve.kind === "line") {
    return {
      ...curve,
      start: transformPoint(matrix, curve.start),
      end: transformPoint(matrix, curve.end),
    };
  }
  if (curve.kind === "nurbs") {
    return {
      ...curve,
      curve: {
        ...curve.curve,
        controlPoints: transformControlPoints(curve.curve.controlPoints, matrix),
      },
    };
  }
  return curve;
};

const transformBRepSurface = (surface: BRepSurface, matrix: Mat4): BRepSurface => {
  if (surface.kind === "plane") {
    const origin = surface.plane.origin;
    const originTransformed = transformPoint(matrix, origin);
    const xAxisEnd = transformPoint(matrix, addVec3(origin, surface.plane.xAxis));
    const yAxisEnd = transformPoint(matrix, addVec3(origin, surface.plane.yAxis));
    const xAxis = subtractVec3(xAxisEnd, originTransformed);
    const yAxis = subtractVec3(yAxisEnd, originTransformed);
    return {
      ...surface,
      plane: {
        ...surface.plane,
        origin: originTransformed,
        xAxis,
        yAxis,
        normal: surface.plane.normal,
      },
    };
  }
  if (surface.kind === "nurbs") {
    return {
      ...surface,
      surface: {
        ...surface.surface,
        controlPoints: transformControlPointGrid(surface.surface.controlPoints, matrix),
      },
    };
  }
  return surface;
};

const transformBRepData = (brep: BRepData, matrix: Mat4): BRepData => ({
  ...brep,
  vertices: brep.vertices.map((vertex) => ({
    ...vertex,
    position: transformPoint(matrix, vertex.position),
  })),
  edges: brep.edges.map((edge) => ({
    ...edge,
    curve: transformBRepCurve(edge.curve, matrix),
  })),
  faces: brep.faces.map((face) => ({
    ...face,
    surface: transformBRepSurface(face.surface, matrix),
  })),
});

const resolveGeometryMesh = (geometry: Geometry): RenderMesh | null => {
  if (geometry.type === "nurbsSurface") {
    if (geometry.mesh?.positions?.length) return geometry.mesh;
    const tessellated = tessellateSurfaceAdaptive(geometry.nurbs);
    return {
      positions: Array.from(tessellated.positions),
      normals: Array.from(tessellated.normals),
      indices: Array.from(tessellated.indices),
      uvs: Array.from(tessellated.uvs),
    };
  }
  if (geometry.type === "brep") {
    if (geometry.mesh?.positions?.length) return geometry.mesh;
    return tessellateBRepToMesh(geometry.brep);
  }
  if ("mesh" in geometry && geometry.mesh) {
    if (geometry.type === "surface" && geometry.nurbs) {
      const tessellated = tessellateSurfaceAdaptive(geometry.nurbs);
      return {
        positions: Array.from(tessellated.positions),
        normals: Array.from(tessellated.normals),
        indices: Array.from(tessellated.indices),
        uvs: Array.from(tessellated.uvs),
      };
    }
    return geometry.mesh;
  }
  return null;
};

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

  if (geometry.type === "nurbsCurve") {
    const existing = updates.get(geometryId) as Partial<NurbsCurveGeometry> | undefined;
    const baseNurbs = (existing?.nurbs ?? geometry.nurbs) as NURBSCurve;
    const nextNurbs = {
      ...baseNurbs,
      controlPoints: translateControlPoints(baseNurbs.controlPoints, delta),
    };
    updates.set(geometryId, { ...(existing ?? {}), nurbs: nextNurbs });
    return;
  }

  if (geometry.type === "nurbsSurface") {
    const existing = updates.get(geometryId) as Partial<NurbsSurfaceGeometry> | undefined;
    const baseNurbs = (existing?.nurbs ?? geometry.nurbs) as NURBSSurface;
    const nextNurbs = {
      ...baseNurbs,
      controlPoints: translateControlPointGrid(baseNurbs.controlPoints, delta),
    };
    updates.set(geometryId, { ...(existing ?? {}), nurbs: nextNurbs });
    return;
  }

  if (geometry.type === "brep") {
    const existing = updates.get(geometryId) as Partial<BRepGeometry> | undefined;
    const baseBrep = (existing?.brep ?? geometry.brep) as BRepData;
    const nextBrep = translateBRepData(baseBrep, delta);
    const nextUpdate: Partial<BRepGeometry> = { ...(existing ?? {}), brep: nextBrep };
    if (geometry.mesh) {
      const baseMesh = (existing?.mesh ?? geometry.mesh) as RenderMesh;
      const positions = baseMesh.positions.slice();
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += delta.x;
        positions[i + 1] += delta.y;
        positions[i + 2] += delta.z;
      }
      nextUpdate.mesh = { ...baseMesh, positions };
    }
    const baseCentroid = existing?.centroid ?? geometry.centroid;
    if (baseCentroid) {
      nextUpdate.centroid = addVec3(baseCentroid, delta);
    }
    if (existing?.volume_m3 !== undefined || geometry.volume_m3 !== undefined) {
      nextUpdate.volume_m3 = existing?.volume_m3 ?? geometry.volume_m3;
    }
    if (existing?.mass_kg !== undefined || geometry.mass_kg !== undefined) {
      nextUpdate.mass_kg = existing?.mass_kg ?? geometry.mass_kg;
    }
    if (existing?.inertiaTensor_kg_m2 !== undefined || geometry.inertiaTensor_kg_m2 !== undefined) {
      nextUpdate.inertiaTensor_kg_m2 =
        existing?.inertiaTensor_kg_m2 ?? geometry.inertiaTensor_kg_m2;
    }
    updates.set(geometryId, nextUpdate);
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
    const baseCentroid = (existing as Partial<Geometry> | undefined)?.centroid ?? geometry.centroid;
    if (baseCentroid) {
      nextUpdate.centroid = addVec3(baseCentroid, delta);
    }
    const existingGeometry = existing as Partial<Geometry> | undefined;
    if (existingGeometry?.volume_m3 !== undefined || geometry.volume_m3 !== undefined) {
      nextUpdate.volume_m3 = existingGeometry?.volume_m3 ?? geometry.volume_m3;
    }
    if (existingGeometry?.mass_kg !== undefined || geometry.mass_kg !== undefined) {
      nextUpdate.mass_kg = existingGeometry?.mass_kg ?? geometry.mass_kg;
    }
    if (
      existingGeometry?.inertiaTensor_kg_m2 !== undefined ||
      geometry.inertiaTensor_kg_m2 !== undefined
    ) {
      nextUpdate.inertiaTensor_kg_m2 =
        existingGeometry?.inertiaTensor_kg_m2 ?? geometry.inertiaTensor_kg_m2;
    }
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

  if (geometry.type === "nurbsCurve") {
    const existing = updates.get(geometryId) as Partial<NurbsCurveGeometry> | undefined;
    const baseNurbs = (existing?.nurbs ?? geometry.nurbs) as NURBSCurve;
    const nextNurbs = {
      ...baseNurbs,
      controlPoints: transformControlPoints(baseNurbs.controlPoints, matrix),
    };
    updates.set(geometryId, { ...(existing ?? {}), nurbs: nextNurbs });
    return;
  }

  if (geometry.type === "nurbsSurface") {
    const existing = updates.get(geometryId) as Partial<NurbsSurfaceGeometry> | undefined;
    const baseNurbs = (existing?.nurbs ?? geometry.nurbs) as NURBSSurface;
    const nextNurbs = {
      ...baseNurbs,
      controlPoints: transformControlPointGrid(baseNurbs.controlPoints, matrix),
    };
    updates.set(geometryId, { ...(existing ?? {}), nurbs: nextNurbs });
    return;
  }

    if (geometry.type === "brep") {
      const existing = updates.get(geometryId) as Partial<BRepGeometry> | undefined;
      const baseBrep = (existing?.brep ?? geometry.brep) as BRepData;
      const nextBrep = transformBRepData(baseBrep, matrix);
      const nextUpdate: Partial<BRepGeometry> = { ...(existing ?? {}), brep: nextBrep };
      if (geometry.mesh) {
        const baseMesh = (existing?.mesh ?? geometry.mesh) as RenderMesh;
        const positions = applyMatrixToPositions(baseMesh.positions, matrix);
        const normals =
          baseMesh.indices.length > 0 ? computeVertexNormals(positions, baseMesh.indices) : baseMesh.normals;
        nextUpdate.mesh = { ...baseMesh, positions, normals };
        nextUpdate.area_m2 = computeMeshArea(positions, baseMesh.indices);
        const { volume_m3, centroid } = computeMeshVolumeAndCentroid(nextUpdate.mesh);
        nextUpdate.volume_m3 = volume_m3;
        nextUpdate.centroid = centroid ?? undefined;
        const density = resolveDensity(geometry.metadata ?? nextUpdate.metadata);
        nextUpdate.mass_kg = density && volume_m3 > 0 ? density * volume_m3 : undefined;
      }
      updates.set(geometryId, nextUpdate);
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
    const { volume_m3, centroid } = computeMeshVolumeAndCentroid(nextMesh);
    const density = resolveDensity(geometry.metadata ?? (existing as Geometry | undefined)?.metadata);
    const nextUpdate: Partial<Geometry> & {
      primitive?: MeshPrimitiveGeometry["primitive"];
    } = {
      ...(existing ?? {}),
      mesh: nextMesh,
      area_m2: nextArea,
      volume_m3,
      centroid: centroid ?? undefined,
      mass_kg: density && volume_m3 > 0 ? density * volume_m3 : undefined,
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

const upsertPolylineGeometry = (
  geometryId: string,
  points: Vec3[],
  options: { closed: boolean; degree: 1 | 2 | 3 },
  state: {
    geometryById: Map<string, Geometry>;
    updates: Map<string, Partial<Geometry>>;
    itemsToAdd: Geometry[];
    idsToRemove: Set<string>;
  }
) => {
  const { geometryById, updates, itemsToAdd, idsToRemove } = state;
  const existing = geometryById.get(geometryId);
  const layerId = existing?.layerId ?? "layer-default";
  if (existing && existing.type === "polyline") {
    const vertexIds = existing.vertexIds;
    if (vertexIds.length === points.length) {
      vertexIds.forEach((vertexId, index) => {
        updates.set(vertexId, { position: points[index] });
      });
      updates.set(geometryId, {
        vertexIds,
        closed: options.closed,
        degree: options.degree,
      });
      return vertexIds;
    }
    vertexIds.forEach((vertexId) => idsToRemove.add(vertexId));
  }

  const nextVertexIds = points.map(() => createGeometryId("vertex"));
  const vertexItems: Geometry[] = points.map((point, index) => ({
    id: nextVertexIds[index],
    type: "vertex",
    position: point,
    layerId,
    area_m2: 1,
    thickness_m: 0.1,
  }));
  itemsToAdd.push(...vertexItems);
  if (existing && existing.type === "polyline") {
    updates.set(geometryId, {
      vertexIds: nextVertexIds,
      closed: options.closed,
      degree: options.degree,
    });
  } else {
    itemsToAdd.push({
      id: geometryId,
      type: "polyline",
      vertexIds: nextVertexIds,
      closed: options.closed,
      degree: options.degree,
      layerId,
    });
  }
  return nextVertexIds;
};

const upsertSurfaceGeometry = (
  geometryId: string,
  points: Vec3[],
  state: {
    geometryById: Map<string, Geometry>;
    updates: Map<string, Partial<Geometry>>;
    itemsToAdd: Geometry[];
    idsToRemove: Set<string>;
  }
) => {
  const { geometryById, updates, itemsToAdd, idsToRemove } = state;
  const { mesh, plane } = generateSurfaceMesh([points]);
  const existing = geometryById.get(geometryId);
  const layerId = existing?.layerId ?? "layer-default";
  const existingLoop =
    existing && existing.type === "surface" ? existing.loops[0] ?? [] : [];
  if (existing && existing.type === "surface" && existingLoop.length === points.length) {
    existingLoop.forEach((vertexId, index) => {
      updates.set(vertexId, { position: points[index] });
    });
    updates.set(geometryId, { mesh, plane, loops: [existingLoop] });
    return existingLoop;
  }
  existingLoop.forEach((vertexId) => idsToRemove.add(vertexId));

  const nextVertexIds = points.map(() => createGeometryId("vertex"));
  const vertexItems: Geometry[] = points.map((point, index) => ({
    id: nextVertexIds[index],
    type: "vertex",
    position: point,
    layerId,
    area_m2: 1,
    thickness_m: 0.1,
  }));
  itemsToAdd.push(...vertexItems);
  if (existing && existing.type === "surface") {
    updates.set(geometryId, { mesh, plane, loops: [nextVertexIds] });
  } else {
    itemsToAdd.push({
      id: geometryId,
      type: "surface",
      mesh,
      loops: [nextVertexIds],
      plane,
      layerId,
    });
  }
  return nextVertexIds;
};

const upsertNurbsCurveGeometry = (
  geometryId: string,
  nurbs: NURBSCurve,
  closed: boolean,
  state: {
    geometryById: Map<string, Geometry>;
    updates: Map<string, Partial<Geometry>>;
    itemsToAdd: Geometry[];
  }
) => {
  const { geometryById, updates, itemsToAdd } = state;
  const existing = geometryById.get(geometryId);
  const layerId = existing?.layerId ?? "layer-default";
  if (existing && existing.type === "nurbsCurve") {
    updates.set(geometryId, { nurbs, closed });
    return;
  }
  itemsToAdd.push({
    id: geometryId,
    type: "nurbsCurve",
    nurbs,
    closed,
    layerId,
  });
};

const upsertNurbsSurfaceGeometry = (
  geometryId: string,
  nurbs: NURBSSurface,
  mesh: RenderMesh | undefined,
  state: {
    geometryById: Map<string, Geometry>;
    updates: Map<string, Partial<Geometry>>;
    itemsToAdd: Geometry[];
  }
) => {
  const { geometryById, updates, itemsToAdd } = state;
  const existing = geometryById.get(geometryId);
  const layerId = existing?.layerId ?? "layer-default";
  if (existing && existing.type === "nurbsSurface") {
    updates.set(geometryId, { nurbs, mesh });
    return;
  }
  itemsToAdd.push({
    id: geometryId,
    type: "nurbsSurface",
    nurbs,
    mesh,
    layerId,
  });
};

const upsertBRepGeometry = (
  geometryId: string,
  brep: BRepData,
  mesh: RenderMesh | undefined,
  state: {
    geometryById: Map<string, Geometry>;
    updates: Map<string, Partial<Geometry>>;
    itemsToAdd: Geometry[];
  },
  options?: {
    primitive?: MeshPrimitiveGeometry["primitive"];
    metadata?: Record<string, unknown>;
  }
) => {
  const { geometryById, updates, itemsToAdd } = state;
  const existing = geometryById.get(geometryId);
  const layerId = existing?.layerId ?? "layer-default";
  const metadata = options?.metadata ?? existing?.metadata;
  const physical =
    mesh
      ? options?.primitive
        ? computePrimitivePhysicalProperties(mesh, options.primitive, metadata)
        : (() => {
            const { volume_m3, centroid } = computeMeshVolumeAndCentroid(mesh);
            return {
              area_m2: computeMeshArea(mesh.positions, mesh.indices),
              volume_m3,
              centroid,
              mass_kg: undefined as number | undefined,
              inertiaTensor_kg_m2: undefined as BRepGeometry["inertiaTensor_kg_m2"],
            };
          })()
      : null;
  if (existing && existing.type === "brep") {
    updates.set(geometryId, {
      brep,
      mesh,
      ...(physical ? physical : null),
      metadata,
    });
    return;
  }
  itemsToAdd.push({
    id: geometryId,
    type: "brep",
    brep,
    mesh,
    layerId,
    ...(physical ? physical : null),
    metadata,
  });
};

const upsertMeshGeometry = (
  geometryId: string,
  mesh: RenderMesh,
  primitive: MeshPrimitiveGeometry["primitive"] | undefined,
  state: {
    geometryById: Map<string, Geometry>;
    updates: Map<string, Partial<Geometry>>;
    itemsToAdd: Geometry[];
  }
) => {
  const { geometryById, updates, itemsToAdd } = state;
  const existing = geometryById.get(geometryId);
  const metadata = existing?.metadata;
  const physical = primitive
    ? computePrimitivePhysicalProperties(mesh, primitive, metadata)
    : (() => {
        const { volume_m3, centroid } = computeMeshVolumeAndCentroid(mesh);
        return {
          area_m2: computeMeshArea(mesh.positions, mesh.indices),
          volume_m3,
          centroid,
          mass_kg: undefined as number | undefined,
          inertiaTensor_kg_m2: undefined as MeshPrimitiveGeometry["inertiaTensor_kg_m2"],
        };
      })();
  if (existing && "mesh" in existing) {
    updates.set(geometryId, {
      mesh,
      primitive,
      area_m2: physical.area_m2,
      volume_m3: physical.volume_m3,
      centroid: physical.centroid ?? undefined,
      mass_kg: physical.mass_kg,
      inertiaTensor_kg_m2: physical.inertiaTensor_kg_m2,
    });
    return;
  }
  const layerId = existing?.layerId ?? "layer-default";
  itemsToAdd.push({
    id: geometryId,
    type: "mesh",
    mesh,
    layerId,
    area_m2: physical.area_m2,
    volume_m3: physical.volume_m3,
    centroid: physical.centroid ?? undefined,
    mass_kg: physical.mass_kg,
    inertiaTensor_kg_m2: physical.inertiaTensor_kg_m2,
    primitive,
  });
};

const applySeedGeometryNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[],
  cPlane: CPlane
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  const itemsToAdd: Geometry[] = [];
  const idsToRemove = new Set<string>();
  let didApply = false;
  const touchedGeometryIds = new Set<string>();

  const nextNodes = nodes.map((node) => {
    const outputs = node.data?.outputs;
    if (!outputs || node.data?.evaluationError) {
      return node;
    }

    if (node.type === "point") {
      const position =
        asVec3(outputs?.position) ??
        ({ x: asNumber(outputs?.x, 0), y: asNumber(outputs?.y, 0), z: asNumber(outputs?.z, 0) } as Vec3);
      if (!Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z)) {
        return node;
      }
      let geometryId =
        typeof outputs?.geometry === "string"
          ? outputs.geometry
          : typeof node.data?.geometryId === "string"
            ? node.data.geometryId
            : null;
      if (!geometryId) {
        geometryId = createGeometryId("vertex");
      }
      const existing = geometryById.get(geometryId);
      if (existing && existing.type === "vertex") {
        updates.set(geometryId, { position });
      } else {
        itemsToAdd.push({
          id: geometryId,
          type: "vertex",
          position,
          layerId: existing?.layerId ?? "layer-default",
          area_m2: 1,
          thickness_m: 0.1,
        });
      }
      didApply = true;
      touchedGeometryIds.add(geometryId);
      return {
        ...node,
        data: {
          ...node.data,
          geometryId,
          geometryType: "vertex",
          point: position,
          isLinked: true,
        },
      };
    }

    if (node.type === "rectangle") {
      let geometryId =
        typeof outputs?.geometry === "string"
          ? outputs.geometry
          : typeof node.data?.geometryId === "string"
            ? node.data.geometryId
            : null;
      const center = asVec3(outputs?.center);
      const width = asNumber(outputs?.width, Number.NaN);
      const height = asNumber(outputs?.height, Number.NaN);
      if (!center || !Number.isFinite(width) || !Number.isFinite(height)) {
        return node;
      }
      if (!geometryId) {
        geometryId = createGeometryId("polyline");
      }
      const points = buildRectanglePoints(center, width, height, cPlane);
      const vertexIds = upsertPolylineGeometry(
        geometryId,
        points,
        { closed: true, degree: 1 },
        { geometryById, updates, itemsToAdd, idsToRemove }
      );
      didApply = true;
      touchedGeometryIds.add(geometryId);
      return {
        ...node,
        data: {
          ...node.data,
          geometryId,
          geometryType: "polyline",
          vertexIds,
          closed: true,
          isLinked: true,
        },
      };
    }

    if (node.type === "circle") {
      let geometryId =
        typeof outputs?.geometry === "string"
          ? outputs.geometry
          : typeof node.data?.geometryId === "string"
            ? node.data.geometryId
            : null;
      const center = asVec3(outputs?.center);
      const radius = asNumber(outputs?.radius, Number.NaN);
      if (!center || !Number.isFinite(radius) || radius <= 0) {
        return node;
      }
      if (!geometryId) {
        geometryId = createGeometryId("nurbsCurve");
      }
      const normal = asVec3(outputs?.normal);
      const plane =
        normal && lengthVec3(normal) > 1e-6
          ? buildPlaneFromNormal(center, normal)
          : cPlane;
      const nurbs = createCircleNurbs(plane, center, radius);
      upsertNurbsCurveGeometry(geometryId, nurbs, true, { geometryById, updates, itemsToAdd });
      didApply = true;
      touchedGeometryIds.add(geometryId);
      return {
        ...node,
        data: {
          ...node.data,
          geometryId,
          geometryType: "nurbsCurve",
          closed: true,
          isLinked: true,
        },
      };
    }

    if (node.type === "box") {
      let geometryId =
        typeof outputs?.geometry === "string"
          ? outputs.geometry
          : typeof node.data?.geometryId === "string"
            ? node.data.geometryId
            : null;
      const anchor = asVec3(outputs?.anchor) ?? { x: 0, y: 0, z: 0 };
      const width = asNumber(outputs?.width, Number.NaN);
      const height = asNumber(outputs?.height, Number.NaN);
      const depth = asNumber(outputs?.depth, Number.NaN);
      const representation = String(outputs?.representation ?? node.data?.parameters?.representation ?? "mesh");
      if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(depth)) {
        return node;
      }
      const existing = geometryId ? geometryById.get(geometryId) : null;
      if (!geometryId || (representation === "brep" && existing?.type !== "brep")) {
        geometryId = createGeometryId(representation === "brep" ? "brep" : "mesh");
      }
      const centerMode = Boolean(outputs?.centerMode);
      const center = centerMode
        ? anchor
        : { x: anchor.x + width * 0.5, y: anchor.y + height * 0.5, z: anchor.z + depth * 0.5 };
      const baseMesh = generateBoxMesh({ width, height, depth }, 1);
      const mesh = translateMesh(baseMesh, center);
      if (representation === "brep") {
        const brep = createBRepBox(width, height, depth, center);
        upsertBRepGeometry(
          geometryId,
          brep,
          mesh,
          { geometryById, updates, itemsToAdd },
          {
            primitive: {
              kind: "box",
              origin: center,
              dimensions: { width, height, depth },
            },
          }
        );
      } else {
        upsertMeshGeometry(
          geometryId,
          mesh,
          {
            kind: "box",
            origin: center,
            dimensions: { width, height, depth },
          },
          { geometryById, updates, itemsToAdd }
        );
      }
      didApply = true;
      touchedGeometryIds.add(geometryId);
      return {
        ...node,
        data: {
          ...node.data,
          geometryId,
          geometryType: representation === "brep" ? "brep" : "mesh",
          boxOrigin: anchor,
          boxDimensions: { width, height, depth },
          isLinked: true,
        },
      };
    }

    if (node.type === "sphere") {
      let geometryId =
        typeof outputs?.geometry === "string"
          ? outputs.geometry
          : typeof node.data?.geometryId === "string"
            ? node.data.geometryId
            : null;
      const center = asVec3(outputs?.center) ?? { x: 0, y: 0, z: 0 };
      const radius = asNumber(outputs?.radius, Number.NaN);
      const representation = String(outputs?.representation ?? node.data?.parameters?.representation ?? "mesh");
      if (!Number.isFinite(radius) || radius <= 0) {
        return node;
      }
      const existing = geometryId ? geometryById.get(geometryId) : null;
      if (!geometryId || (representation === "brep" && existing?.type !== "brep")) {
        geometryId = createGeometryId(representation === "brep" ? "brep" : "mesh");
      }
      const baseMesh = generateSphereMesh(radius, 24);
      const mesh = translateMesh(baseMesh, center);
      if (representation === "brep") {
        const brep = createBRepSphere(radius, center);
        upsertBRepGeometry(
          geometryId,
          brep,
          mesh,
          { geometryById, updates, itemsToAdd },
          { primitive: { kind: "sphere", origin: center, radius } }
        );
      } else {
        upsertMeshGeometry(
          geometryId,
          mesh,
          {
            kind: "sphere",
            origin: center,
            radius,
          },
          { geometryById, updates, itemsToAdd }
        );
      }
      didApply = true;
      touchedGeometryIds.add(geometryId);
      return {
        ...node,
        data: {
          ...node.data,
          geometryId,
          geometryType: representation === "brep" ? "brep" : "mesh",
          sphereOrigin: center,
          sphereRadius: radius,
          isLinked: true,
        },
      };
    }

    const primitiveKind =
      node.type === "primitive" && typeof outputs?.kind === "string"
        ? (outputs.kind as PrimitiveKind)
        : resolvePrimitiveKindForNode(node.type as NodeType, node.data?.parameters);
    if (primitiveKind) {
      let geometryId =
        typeof outputs?.geometry === "string"
          ? outputs.geometry
          : typeof node.data?.geometryId === "string"
            ? node.data.geometryId
            : null;
      const representation = String(outputs?.representation ?? node.data?.parameters?.representation ?? "mesh");
      const existing = geometryId ? geometryById.get(geometryId) : null;
      if (!geometryId || (representation === "brep" && existing?.type !== "brep")) {
        geometryId = createGeometryId(representation === "brep" ? "brep" : "mesh");
      }
      const paramValues =
        outputs?.params && typeof outputs.params === "object"
          ? (outputs.params as Record<string, number>)
          : null;
      const config = paramValues
        ? ({ kind: primitiveKind, ...paramValues } as Parameters<typeof generatePrimitiveMesh>[0])
        : resolvePrimitiveConfig(node.data?.parameters, { kind: primitiveKind });
      const mesh = generatePrimitiveMesh(config);
      const origin = { x: 0, y: 0, z: 0 };
      const translated = translateMesh(mesh, origin);
      if (representation === "brep" && (primitiveKind === "box" || primitiveKind === "sphere" || primitiveKind === "cylinder")) {
        const brep =
          primitiveKind === "box"
            ? createBRepBox(config.size ?? 1, config.height ?? 1, config.size ?? 1, origin)
            : primitiveKind === "sphere"
              ? createBRepSphere(config.radius ?? 0.5, origin)
              : createBRepCylinder(config.radius ?? 0.5, config.height ?? 1, origin);
        const primitiveInfo =
          primitiveKind === "box"
            ? {
                kind: "box" as const,
                origin,
                dimensions: { width: config.size ?? 1, height: config.size ?? 1, depth: config.size ?? 1 },
              }
            : primitiveKind === "sphere"
              ? { kind: "sphere" as const, origin, radius: config.radius ?? 0.5 }
              : { kind: "cylinder" as const, origin, radius: config.radius ?? 0.5, height: config.height ?? 1 };
        upsertBRepGeometry(
          geometryId,
          brep,
          translated,
          { geometryById, updates, itemsToAdd },
          { primitive: primitiveInfo }
        );
      } else {
        upsertMeshGeometry(
          geometryId,
          translated,
          {
            kind: primitiveKind,
            origin,
            params: { ...(config as Record<string, number>) },
          },
          { geometryById, updates, itemsToAdd }
        );
      }
      didApply = true;
      touchedGeometryIds.add(geometryId);
      return {
        ...node,
        data: {
          ...node.data,
          geometryId,
          geometryType: representation === "brep" ? "brep" : "mesh",
          isLinked: true,
        },
      };
    }

    return node;
  });

  if (!didApply && idsToRemove.size === 0 && itemsToAdd.length === 0) {
    return { nodes: nextNodes, geometry, didApply, touchedGeometryIds };
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

  return { nodes: nextNodes, geometry: nextGeometry, didApply: true, touchedGeometryIds };
};

const applyDependentGeometryNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[],
  cPlane: CPlane
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  const itemsToAdd: Geometry[] = [];
  const idsToRemove = new Set<string>();
  let didApply = false;
  const touchedGeometryIds = new Set<string>();

  const nextNodes = nodes.map((node) => {
    const outputs = node.data?.outputs;
    if (!outputs || node.data?.evaluationError) {
      return node;
    }

    if (node.type === "line") {
      let geometryId =
        typeof outputs?.geometry === "string"
          ? outputs.geometry
          : typeof node.data?.geometryId === "string"
            ? node.data.geometryId
            : null;
      const points = Array.isArray(outputs?.points)
        ? (outputs.points as unknown[]).map((entry) => asVec3(entry)).filter(Boolean) as Vec3[]
        : [];
      if (points.length < 2) return node;
      if (!geometryId) {
        geometryId = createGeometryId("polyline");
      }
      const vertexIds = upsertPolylineGeometry(
        geometryId,
        points.slice(0, 2),
        { closed: false, degree: 1 },
        { geometryById, updates, itemsToAdd, idsToRemove }
      );
      didApply = true;
      touchedGeometryIds.add(geometryId);
      return {
        ...node,
        data: {
          ...node.data,
          geometryId,
          geometryType: "polyline",
          vertexIds,
          closed: false,
          isLinked: true,
        },
      };
    }

    if (node.type === "arc") {
      let geometryId =
        typeof outputs?.geometry === "string"
          ? outputs.geometry
          : typeof node.data?.geometryId === "string"
            ? node.data.geometryId
            : null;
      const start = asVec3(outputs?.start);
      const end = asVec3(outputs?.end);
      const through = asVec3(outputs?.through);
      if (!start || !end || !through) return node;
      if (!geometryId) {
        geometryId = createGeometryId("nurbsCurve");
      }
      const plane = computeBestFitPlane([start, through, end]);
      const nurbs =
        createArcNurbs(plane, start, end, through) ??
        createNurbsCurveFromPoints([start, through, end], 2, false);
      upsertNurbsCurveGeometry(geometryId, nurbs, false, { geometryById, updates, itemsToAdd });
      didApply = true;
      touchedGeometryIds.add(geometryId);
      return {
        ...node,
        data: {
          ...node.data,
          geometryId,
          geometryType: "nurbsCurve",
          closed: false,
          isLinked: true,
        },
      };
    }

    if (node.type === "curve") {
      let geometryId =
        typeof outputs?.geometry === "string"
          ? outputs.geometry
          : typeof node.data?.geometryId === "string"
            ? node.data.geometryId
            : null;
      const controlPoints = Array.isArray(outputs?.points)
        ? (outputs.points as unknown[]).map((entry) => asVec3(entry)).filter(Boolean) as Vec3[]
        : [];
      if (controlPoints.length < 2) return node;
      if (!geometryId) {
        geometryId = createGeometryId("nurbsCurve");
      }
      const degree = Math.min(3, Math.max(1, Math.round(asNumber(outputs?.degree, 3)))) as 1 | 2 | 3;
      const closed = Boolean(outputs?.closed);
      const nurbs = closed
        ? createNurbsCurveFromPoints(controlPoints, degree, true)
        : interpolateNurbsCurve(controlPoints, degree);
      upsertNurbsCurveGeometry(geometryId, nurbs, closed, { geometryById, updates, itemsToAdd });
      didApply = true;
      touchedGeometryIds.add(geometryId);
      return {
        ...node,
        data: {
          ...node.data,
          geometryId,
          geometryType: "nurbsCurve",
          closed,
          isLinked: true,
        },
      };
    }

    if (node.type === "polyline") {
      let geometryId =
        typeof outputs?.geometry === "string"
          ? outputs.geometry
          : typeof node.data?.geometryId === "string"
            ? node.data.geometryId
            : null;
      const points = Array.isArray(outputs?.points)
        ? (outputs.points as unknown[]).map((entry) => asVec3(entry)).filter(Boolean) as Vec3[]
        : [];
      if (points.length < 2) return node;
      if (!geometryId) {
        geometryId = createGeometryId("polyline");
      }
      const closed = Boolean(outputs?.closed);
      const vertexIds = upsertPolylineGeometry(
        geometryId,
        points,
        { closed, degree: 1 },
        { geometryById, updates, itemsToAdd, idsToRemove }
      );
      didApply = true;
      touchedGeometryIds.add(geometryId);
      return {
        ...node,
        data: {
          ...node.data,
          geometryId,
          geometryType: "polyline",
          vertexIds,
          closed,
          isLinked: true,
        },
      };
    }

    if (node.type === "pointCloud") {
      const rawPoints = Array.isArray(outputs?.points)
        ? (outputs.points as unknown[])
        : outputs?.points != null
          ? [outputs.points]
          : [];
      const points = rawPoints.map((entry) => asVec3(entry)).filter(Boolean) as Vec3[];
      const existingIds = Array.isArray(node.data?.geometryIds) ? node.data.geometryIds : [];

      const removeGeometry = (geometryId: string) => {
        const existing = geometryById.get(geometryId);
        idsToRemove.add(geometryId);
        if (existing?.type === "polyline") {
          existing.vertexIds.forEach((vertexId) => idsToRemove.add(vertexId));
        }
      };

      if (points.length === 0) {
        if (existingIds.length > 0) {
          existingIds.forEach((id) => removeGeometry(id));
          didApply = true;
        }
        return {
          ...node,
          data: {
            ...node.data,
            geometryIds: [],
            geometryType: "vertex",
            isLinked: true,
          },
        };
      }

      const nextIds: string[] = [];
      for (let i = 0; i < points.length; i += 1) {
        const point = points[i];
        const existingId = existingIds[i];
        const existing = existingId ? geometryById.get(existingId) : null;
        if (existing && existing.type === "vertex") {
          updates.set(existingId, { position: point });
          nextIds.push(existingId);
          touchedGeometryIds.add(existingId);
          didApply = true;
          continue;
        }
        if (existing) {
          removeGeometry(existing.id);
        }
        const geometryId = createGeometryId("vertex");
        itemsToAdd.push({
          id: geometryId,
          type: "vertex",
          position: point,
          layerId: existing?.layerId ?? "layer-default",
          area_m2: 1,
          thickness_m: 0.1,
        });
        nextIds.push(geometryId);
        touchedGeometryIds.add(geometryId);
        didApply = true;
      }

      if (existingIds.length > points.length) {
        existingIds.slice(points.length).forEach((id) => removeGeometry(id));
        didApply = true;
      }

      return {
        ...node,
        data: {
          ...node.data,
          geometryIds: nextIds,
          geometryType: "vertex",
          isLinked: true,
        },
      };
    }

    if (node.type === "surface") {
      let geometryId =
        typeof outputs?.geometry === "string"
          ? outputs.geometry
          : typeof node.data?.geometryId === "string"
            ? node.data.geometryId
            : null;
      const points = Array.isArray(outputs?.points)
        ? (outputs.points as unknown[]).map((entry) => asVec3(entry)).filter(Boolean) as Vec3[]
        : [];
      if (points.length < 3) return node;
      if (!geometryId) {
        geometryId = createGeometryId("surface");
      }
      const vertexIds = upsertSurfaceGeometry(
        geometryId,
        points,
        { geometryById, updates, itemsToAdd, idsToRemove }
      );
      didApply = true;
      touchedGeometryIds.add(geometryId);
      return {
        ...node,
        data: {
          ...node.data,
          geometryId,
          geometryType: "surface",
          vertexIds,
          isLinked: true,
        },
      };
    }

    return node;
  });

  if (!didApply && idsToRemove.size === 0 && itemsToAdd.length === 0) {
    return { nodes: nextNodes, geometry, didApply, touchedGeometryIds };
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

  return { nodes: nextNodes, geometry: nextGeometry, didApply: true, touchedGeometryIds };
};

const resolveTransformGeometryId = (node: WorkflowNode): string | null => {
  const outputs = node.data?.outputs;
  if (typeof outputs?.geometry === "string") return outputs.geometry;
  const dataGeometryId = node.data?.geometryId;
  if (typeof dataGeometryId === "string") return dataGeometryId;
  const parameterGeometryId = node.data?.parameters?.geometryId;
  if (typeof parameterGeometryId === "string") return parameterGeometryId;
  return null;
};

const resetTransformCachesForGeometry = (
  nodes: WorkflowNode[],
  touchedGeometryIds: Set<string>
) => {
  if (touchedGeometryIds.size === 0) return nodes;
  return nodes.map((node) => {
    if (node.type !== "move" && node.type !== "rotate" && node.type !== "scale") {
      return node;
    }
    const geometryId = resolveTransformGeometryId(node);
    if (!geometryId || !touchedGeometryIds.has(geometryId)) {
      return node;
    }
    const data = { ...(node.data ?? {}) };
    if (node.type === "move") {
      data.moveGeometryId = undefined;
      data.moveOffset = undefined;
    }
    if (node.type === "rotate") {
      data.rotateGeometryId = undefined;
      data.rotateAxis = undefined;
      data.rotatePivot = undefined;
      data.rotateAngle = undefined;
    }
    if (node.type === "scale") {
      data.scaleGeometryId = undefined;
      data.scaleVector = undefined;
      data.scalePivot = undefined;
    }
    return { ...node, data };
  });
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
    const sectionIds = Array.isArray(outputs?.sectionIds)
      ? outputs.sectionIds.filter((entry): entry is string => typeof entry === "string")
      : existing.type === "loft"
        ? existing.sectionIds
        : [];
    const degreeRaw = asNumber(outputs?.degree, asNumber(node.data?.parameters?.degree, 3));
    const degree = Math.min(3, Math.max(1, Math.round(degreeRaw))) as 1 | 2 | 3;
    const closed =
      typeof outputs?.closed === "boolean"
        ? outputs.closed
        : typeof node.data?.parameters?.closed === "boolean"
          ? node.data.parameters.closed
          : existing.type === "loft"
            ? existing.closed
            : false;
    const sectionClosed =
      typeof outputs?.sectionClosed === "boolean"
        ? outputs.sectionClosed
        : typeof node.data?.parameters?.sectionClosed === "boolean"
          ? node.data.parameters.sectionClosed
          : undefined;
    const samplesValue = asNumber(outputs?.samples, asNumber(node.data?.parameters?.samples, Number.NaN));
    const baseMetadata = (existing as LoftGeometry).metadata ?? {};
    const nextMetadata =
      sectionClosed != null || Number.isFinite(samplesValue)
        ? {
            ...baseMetadata,
            sectionClosed: sectionClosed ?? baseMetadata.sectionClosed,
            samples: Number.isFinite(samplesValue) ? samplesValue : baseMetadata.samples,
          }
        : baseMetadata;
    const { volume_m3, centroid } = computeMeshVolumeAndCentroid(mesh);
    const density = resolveDensity(nextMetadata);
    const mass_kg = density && volume_m3 > 0 ? density * volume_m3 : undefined;
    updates.set(geometryId, {
      mesh,
      area_m2: computeMeshArea(mesh.positions, mesh.indices),
      volume_m3,
      centroid: centroid ?? undefined,
      mass_kg,
      sectionIds,
      degree,
      closed,
      metadata: nextMetadata,
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
    const profileIds = Array.isArray(outputs?.profileIds)
      ? outputs.profileIds.filter((entry): entry is string => typeof entry === "string")
      : existing.type === "extrude"
        ? existing.profileIds
        : [];
    const { volume_m3, centroid } = computeMeshVolumeAndCentroid(mesh);
    const density = resolveDensity(existing.metadata);
    const mass_kg = density && volume_m3 > 0 ? density * volume_m3 : undefined;
    updates.set(geometryId, {
      mesh,
      area_m2: computeMeshArea(mesh.positions, mesh.indices),
      volume_m3,
      centroid: centroid ?? undefined,
      mass_kg,
      distance,
      direction: direction ?? { x: 0, y: 0, z: 0 },
      capped,
      profileIds,
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
    const segmentCount = Math.max(0, Math.round(asNumber(outputs?.segmentCount, 0)));
    const jointCount = Math.max(0, Math.round(asNumber(outputs?.jointCount, 0)));
    const joints = Array.isArray(outputs?.joints)
      ? (outputs.joints as unknown[])
          .map((entry) => asVec3(entry))
          .filter((entry): entry is Vec3 => Boolean(entry))
      : [];
    const sourceGeometryIds = Array.isArray(outputs?.sourceGeometryIds)
      ? outputs.sourceGeometryIds.filter((entry): entry is string => typeof entry === "string")
      : [];
    const baseMetadata = (existing as MeshPrimitiveGeometry).metadata ?? {};
    const basePipe =
      baseMetadata.pipe && typeof baseMetadata.pipe === "object"
        ? (baseMetadata.pipe as Record<string, unknown>)
        : {};
    const nextMetadata = {
      ...baseMetadata,
      pipe: {
        ...basePipe,
        segmentCount,
        jointCount,
        joints,
        sourceGeometryIds,
      },
    };
    const { volume_m3, centroid } = computeMeshVolumeAndCentroid(mesh);
    const density = resolveDensity(nextMetadata);
    const mass_kg = density && volume_m3 > 0 ? density * volume_m3 : undefined;
    updates.set(geometryId, {
      mesh,
      area_m2: computeMeshArea(mesh.positions, mesh.indices),
      volume_m3,
      centroid: centroid ?? undefined,
      mass_kg,
      metadata: nextMetadata,
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

const applyPipeSweepNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "pipeSweep") return node;
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
    const pipeCount = Math.max(0, Math.round(asNumber(outputs?.pipeCount, 0)));
    const jointCount = Math.max(0, Math.round(asNumber(outputs?.jointCount, 0)));
    const sourceGeometryIds = Array.isArray(outputs?.sourceGeometryIds)
      ? outputs.sourceGeometryIds.filter((entry): entry is string => typeof entry === "string")
      : [];
    const baseMetadata = (existing as MeshPrimitiveGeometry).metadata ?? {};
    const basePipe =
      baseMetadata.pipe && typeof baseMetadata.pipe === "object"
        ? (baseMetadata.pipe as Record<string, unknown>)
        : {};
    const nextMetadata = {
      ...baseMetadata,
      pipe: {
        ...basePipe,
        pipeCount,
        jointCount,
        sourceGeometryIds,
      },
    };
    const { volume_m3, centroid } = computeMeshVolumeAndCentroid(mesh);
    const density = resolveDensity(nextMetadata);
    const mass_kg = density && volume_m3 > 0 ? density * volume_m3 : undefined;
    updates.set(geometryId, {
      mesh,
      area_m2: computeMeshArea(mesh.positions, mesh.indices),
      volume_m3,
      centroid: centroid ?? undefined,
      mass_kg,
      metadata: nextMetadata,
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

const applyPipeMergeNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "pipeMerge") return node;
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
    const { volume_m3, centroid } = computeMeshVolumeAndCentroid(mesh);
    const density = resolveDensity(existing.metadata);
    const mass_kg = density && volume_m3 > 0 ? density * volume_m3 : undefined;
    updates.set(geometryId, {
      mesh,
      area_m2: computeMeshArea(mesh.positions, mesh.indices),
      volume_m3,
      centroid: centroid ?? undefined,
      mass_kg,
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

const resolveMeshIndices = (mesh: RenderMesh) => {
  if (mesh.indices.length > 0) return mesh.indices;
  return Array.from({ length: mesh.positions.length / 3 }, (_, i) => i);
};

const offsetMeshAlongNormals = (mesh: RenderMesh, distance: number): RenderMesh => {
  if (!Number.isFinite(distance) || distance === 0) return mesh;
  const indices = resolveMeshIndices(mesh);
  const baseNormals =
    mesh.normals.length === mesh.positions.length
      ? mesh.normals
      : computeVertexNormals(mesh.positions, indices);
  const positions = mesh.positions.slice();
  for (let i = 0; i < positions.length; i += 3) {
    const nx = baseNormals[i] ?? 0;
    const ny = baseNormals[i + 1] ?? 0;
    const nz = baseNormals[i + 2] ?? 0;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    positions[i] += (nx / len) * distance;
    positions[i + 1] += (ny / len) * distance;
    positions[i + 2] += (nz / len) * distance;
  }
  const normals = computeVertexNormals(positions, indices);
  return { ...mesh, positions, normals, indices: mesh.indices.length > 0 ? mesh.indices : indices };
};

const applyOffsetSurfaceNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "offsetSurface") return node;
    const outputs = node.data?.outputs;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    const distance = asNumber(outputs?.distance, asNumber(node.data?.parameters?.distance, 0));
    if (!geometryId || !Number.isFinite(distance)) return node;
    const existing = geometryById.get(geometryId);
    if (!existing || !("mesh" in existing) || !existing.mesh) return node;

    const previousGeometryId = node.data?.offsetSurfaceGeometryId ?? null;
    const previousDistance = node.data?.offsetSurfaceDistance ?? 0;
    const baseDistance =
      previousGeometryId && previousGeometryId === geometryId ? previousDistance : 0;
    const delta = distance - baseDistance;
    if (Math.abs(delta) < 1e-6) {
      return {
        ...node,
        data: {
          ...node.data,
          offsetSurfaceGeometryId: geometryId,
          offsetSurfaceDistance: distance,
        },
      };
    }

    const mesh = offsetMeshAlongNormals(existing.mesh, delta);
    const { volume_m3, centroid } = computeMeshVolumeAndCentroid(mesh);
    const density = resolveDensity(existing.metadata);
    const mass_kg = density && volume_m3 > 0 ? density * volume_m3 : undefined;
    const geometryUpdate: Partial<Geometry> = {
      mesh,
      area_m2: computeMeshArea(mesh.positions, mesh.indices),
      volume_m3,
      centroid: centroid ?? undefined,
      mass_kg,
    };
    if (existing.type === "surface" && existing.mesh.positions.length >= 3) {
      const indices = resolveMeshIndices(existing.mesh);
      const baseNormals =
        existing.mesh.normals.length === existing.mesh.positions.length
          ? existing.mesh.normals
          : computeVertexNormals(existing.mesh.positions, indices);
      let normalSum = { x: 0, y: 0, z: 0 };
      for (let i = 0; i + 2 < baseNormals.length; i += 3) {
        normalSum = addVec3(normalSum, {
          x: baseNormals[i] ?? 0,
          y: baseNormals[i + 1] ?? 0,
          z: baseNormals[i + 2] ?? 0,
        });
      }
      const avgNormal = normalizeVec3Safe(normalSum, { x: 0, y: 1, z: 0 });
      const alignedNormal =
        existing.plane && dotVec3(existing.plane.normal, avgNormal) < 0
          ? scaleVec3(existing.plane.normal, -1)
          : existing.plane?.normal ?? avgNormal;
      const offsetVec = scaleVec3(alignedNormal, delta);
      if (existing.plane) {
        geometryUpdate.plane = {
          ...existing.plane,
          origin: addVec3(existing.plane.origin, offsetVec),
          normal: alignedNormal,
        };
      } else {
        const points: Vec3[] = [];
        for (let i = 0; i + 2 < mesh.positions.length; i += 3) {
          points.push({
            x: mesh.positions[i],
            y: mesh.positions[i + 1],
            z: mesh.positions[i + 2],
          });
        }
        const computedPlane = computeBestFitPlane(points);
        const planeNormal =
          dotVec3(computedPlane.normal, avgNormal) < 0
            ? scaleVec3(computedPlane.normal, -1)
            : computedPlane.normal;
        geometryUpdate.plane = {
          ...computedPlane,
          normal: planeNormal,
        };
      }
      existing.loops.forEach((loop) => {
        loop.forEach((vertexId) => {
          const vertex = geometryById.get(vertexId);
          if (!vertex || vertex.type !== "vertex") return;
          updates.set(vertexId, {
            position: addVec3(vertex.position, offsetVec),
          });
        });
      });
    }
    updates.set(geometryId, geometryUpdate);
    didApply = true;
    return {
      ...node,
      data: {
        ...node.data,
        offsetSurfaceGeometryId: geometryId,
        offsetSurfaceDistance: distance,
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

const clampValue = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

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

const snapNumberToStep = (value: number, step: number, min: number) => {
  if (!Number.isFinite(step) || step <= 0) return value;
  const snapped = Math.round((value - min) / step) * step + min;
  const decimals = Math.min(6, resolveStepDecimals(step));
  if (decimals <= 0) return Math.round(snapped);
  const factor = Math.pow(10, decimals);
  return Math.round(snapped * factor) / factor;
};

const toVec3 = (value: unknown): Vec3 | null => {
  const direct = asVec3(value);
  if (direct) return direct;
  if (Array.isArray(value) && value.length >= 3) {
    const x = asNumber(value[0], Number.NaN);
    const y = asNumber(value[1], Number.NaN);
    const z = asNumber(value[2], Number.NaN);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      return { x, y, z };
    }
  }
  return null;
};

const collectVec3List = (value: unknown): Vec3[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => toVec3(entry))
      .filter((entry): entry is Vec3 => Boolean(entry));
  }
  const single = toVec3(value);
  return single ? [single] : [];
};

const collectNumberList = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    const single = asNumber(value, Number.NaN);
    return Number.isFinite(single) ? [single] : [];
  }
  return value
    .map((entry) => asNumber(entry, Number.NaN))
    .filter((entry) => Number.isFinite(entry));
};

type FieldSample = {
  position: Vec3;
  vector?: Vec3;
  scalar?: number;
  radius?: number;
};

const pickVec3FromRecord = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const candidate = toVec3(record[key]);
    if (candidate) return candidate;
  }
  return null;
};

const pickNumberFromRecord = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const candidate = asNumber(record[key], Number.NaN);
    if (Number.isFinite(candidate)) return candidate;
  }
  return Number.NaN;
};

const parseFieldSampleEntry = (entry: unknown): FieldSample | null => {
  if (Array.isArray(entry)) {
    if (entry.length >= 2) {
      const position = toVec3(entry[0]);
      if (position) {
        const vector = toVec3(entry[1]);
        if (vector) return { position, vector };
        const scalar = asNumber(entry[1], Number.NaN);
        if (Number.isFinite(scalar)) return { position, scalar };
      }
    }
    if (entry.length >= 6) {
      const position = toVec3(entry.slice(0, 3));
      const vector = toVec3(entry.slice(3, 6));
      if (position && vector) return { position, vector };
    }
    if (entry.length >= 4) {
      const position = toVec3(entry.slice(0, 3));
      const scalar = asNumber(entry[3], Number.NaN);
      if (position && Number.isFinite(scalar)) return { position, scalar };
    }
  }

  if (entry && typeof entry === "object") {
    const record = entry as Record<string, unknown>;
    const position =
      pickVec3FromRecord(record, ["position", "point", "origin", "center", "pos", "p"]) ??
      toVec3(record);
    if (!position) return null;
    const vector = pickVec3FromRecord(record, [
      "vector",
      "direction",
      "displacement",
      "field",
      "force",
      "value",
    ]);
    let scalar: number | null = null;
    if (!vector) {
      const candidate = pickNumberFromRecord(record, [
        "value",
        "scalar",
        "strength",
        "magnitude",
        "intensity",
      ]);
      if (Number.isFinite(candidate)) scalar = candidate;
    }
    const radius = pickNumberFromRecord(record, ["radius", "falloff", "range", "distance"]);
    if (!vector && scalar == null) return null;
    const sample: FieldSample = { position };
    if (vector) sample.vector = vector;
    if (scalar != null) sample.scalar = scalar;
    if (Number.isFinite(radius)) sample.radius = radius;
    return sample;
  }

  return null;
};

const collectFieldSamples = (value: unknown): FieldSample[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => parseFieldSampleEntry(entry))
      .filter((entry): entry is FieldSample => Boolean(entry));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const positions = collectVec3List(
      record.positions ?? record.points ?? record.sources ?? record.centers
    );
    if (positions.length > 0) {
      const vectors = collectVec3List(
        record.vectors ??
          record.directions ??
          record.fields ??
          record.displacements ??
          record.forces
      );
      const scalars =
        vectors.length === 0
          ? collectNumberList(
              record.values ??
                record.scalars ??
                record.magnitudes ??
                record.strengths ??
                record.intensities
            )
          : [];
      const radii = collectNumberList(
        record.radii ?? record.ranges ?? record.falloffs ?? record.distances
      );
      const samples: FieldSample[] = [];
      positions.forEach((position, index) => {
        const vector = vectors.length > 0 ? vectors[index % vectors.length] : null;
        const scalar =
          vectors.length === 0 && scalars.length > 0 ? scalars[index % scalars.length] : null;
        const radius = radii.length > 0 ? radii[index % radii.length] : null;
        if (!vector && !Number.isFinite(scalar ?? Number.NaN)) return;
        const sample: FieldSample = { position };
        if (vector) sample.vector = vector;
        if (Number.isFinite(scalar ?? Number.NaN)) sample.scalar = scalar as number;
        if (Number.isFinite(radius ?? Number.NaN)) sample.radius = radius as number;
        samples.push(sample);
      });
      if (samples.length > 0) return samples;
    }

    const single = parseFieldSampleEntry(value);
    return single ? [single] : [];
  }

  const single = parseFieldSampleEntry(value);
  return single ? [single] : [];
};

const flattenPoints = (points: Vec3[]) =>
  points.flatMap((point) => [point.x, point.y, point.z]);

const expandPoints = (values: number[]) => {
  const points: Vec3[] = [];
  for (let i = 0; i + 2 < values.length; i += 3) {
    points.push({ x: values[i], y: values[i + 1], z: values[i + 2] });
  }
  return points;
};

const computeFilletedPolylinePoints = (
  points: Vec3[],
  radius: number,
  segments: number,
  closed: boolean
) => {
  if (points.length < 3 || radius <= 0 || segments <= 0) return points;
  const plane = computeBestFitPlane(points);
  const projected = points.map((point) => projectPointToPlane(point, plane));
  const count = projected.length;
  const steps = Math.max(1, Math.round(segments));

  const getPoint = (index: number) => projected[(index + count) % count];
  const output: Array<{ u: number; v: number }> = [];

  for (let i = 0; i < count; i += 1) {
    if (!closed && (i === 0 || i === count - 1)) {
      const current = projected[i];
      output.push({ u: current.u, v: current.v });
      continue;
    }
    const prev = getPoint(i - 1);
    const current = getPoint(i);
    const next = getPoint(i + 1);
    const v1 = { x: prev.u - current.u, y: prev.v - current.v };
    const v2 = { x: next.u - current.u, y: next.v - current.v };
    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);
    if (len1 < 1e-6 || len2 < 1e-6) {
      output.push({ u: current.u, v: current.v });
      continue;
    }
    const u1 = { x: v1.x / len1, y: v1.y / len1 };
    const u2 = { x: v2.x / len2, y: v2.y / len2 };
    const dot = clampValue(u1.x * u2.x + u1.y * u2.y, -1, 1);
    const theta = Math.acos(dot);
    if (!Number.isFinite(theta) || theta < 1e-3 || Math.abs(Math.PI - theta) < 1e-3) {
      output.push({ u: current.u, v: current.v });
      continue;
    }
    const tanHalf = Math.tan(theta / 2);
    if (Math.abs(tanHalf) < 1e-6) {
      output.push({ u: current.u, v: current.v });
      continue;
    }
    const offset = Math.min(radius / tanHalf, len1 * 0.5, len2 * 0.5);
    if (!Number.isFinite(offset) || offset <= 1e-6) {
      output.push({ u: current.u, v: current.v });
      continue;
    }
    const effectiveRadius = offset * tanHalf;
    const t1 = { x: current.u + u1.x * offset, y: current.v + u1.y * offset };
    const t2 = { x: current.u + u2.x * offset, y: current.v + u2.y * offset };
    const bisector = { x: u1.x + u2.x, y: u1.y + u2.y };
    const bisLen = Math.hypot(bisector.x, bisector.y);
    if (bisLen < 1e-6) {
      output.push({ u: current.u, v: current.v });
      continue;
    }
    const bis = { x: bisector.x / bisLen, y: bisector.y / bisLen };
    const sinHalf = Math.sin(theta / 2);
    if (Math.abs(sinHalf) < 1e-6) {
      output.push({ u: current.u, v: current.v });
      continue;
    }
    const center = {
      x: current.u + bis.x * (effectiveRadius / sinHalf),
      y: current.v + bis.y * (effectiveRadius / sinHalf),
    };
    const startAngle = Math.atan2(t1.y - center.y, t1.x - center.x);
    const endAngle = Math.atan2(t2.y - center.y, t2.x - center.x);
    let delta = endAngle - startAngle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    const arcPoints: Array<{ u: number; v: number }> = [];
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      const angle = startAngle + delta * t;
      arcPoints.push({
        u: center.x + Math.cos(angle) * effectiveRadius,
        v: center.y + Math.sin(angle) * effectiveRadius,
      });
    }
    arcPoints.forEach((pt, index) => {
      if (output.length === 0) {
        output.push(pt);
        return;
      }
      if (index === 0) {
        const last = output[output.length - 1];
        if (Math.hypot(last.u - pt.u, last.v - pt.v) > 1e-6) {
          output.push(pt);
        }
        return;
      }
      output.push(pt);
    });
  }

  return output.map((point) => unprojectPointFromPlane({ u: point.u, v: point.v }, plane));
};

const applyFilletNodesToGeometry = (
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

  const nextNodes = nodes.map((node) => {
    if (node.type !== "fillet") return node;
    const outputs = node.data?.outputs;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    if (!geometryId) return node;
    const existing = geometryById.get(geometryId);
    if (!existing || existing.type !== "polyline") return node;

    const radius = asNumber(outputs?.radius, asNumber(node.data?.parameters?.radius, 0));
    const segments = Math.max(
      1,
      Math.round(asNumber(outputs?.segments, asNumber(node.data?.parameters?.segments, 6)))
    );

    let basePoints = node.data?.filletGeometryId === geometryId ? node.data?.filletBasePoints : undefined;
    if (!basePoints || basePoints.length < 2) {
      basePoints = collectPolylinePoints(existing);
    }

    const nextPoints =
      radius > 0 ? computeFilletedPolylinePoints(basePoints, radius, segments, existing.closed) : basePoints;

    if (nextPoints.length < 2) return node;

    const vertexIds = existing.vertexIds;
    if (vertexIds.length === nextPoints.length) {
      vertexIds.forEach((vertexId, index) => {
        updates.set(vertexId, { position: nextPoints[index] });
      });
      didApply = true;
      return {
        ...node,
        data: {
          ...node.data,
          filletGeometryId: geometryId,
          filletBasePoints: basePoints,
        },
      };
    }

    vertexIds.forEach((vertexId) => idsToRemove.add(vertexId));
    const layerId = existing.layerId ?? "layer-default";
    const nextVertexIds = nextPoints.map(() => createGeometryId("vertex"));
    const vertexItems: Geometry[] = nextPoints.map((point, index) => ({
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
        filletGeometryId: geometryId,
        filletBasePoints: basePoints,
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

const buildVertexAdjacency = (indices: number[], vertexCount: number) => {
  const adjacency = Array.from({ length: vertexCount }, () => new Set<number>());
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];
    adjacency[a].add(b);
    adjacency[a].add(c);
    adjacency[b].add(a);
    adjacency[b].add(c);
    adjacency[c].add(a);
    adjacency[c].add(b);
  }
  return adjacency;
};

const applyFilletEdgesNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "filletEdges") return node;
    const outputs = node.data?.outputs;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    if (!geometryId) return node;
    const existing = geometryById.get(geometryId);
    if (!existing || !("mesh" in existing) || !existing.mesh) return node;

    const radius = asNumber(outputs?.radius, asNumber(node.data?.parameters?.radius, 0));
    const segments = Math.max(
      1,
      Math.round(asNumber(outputs?.segments, asNumber(node.data?.parameters?.segments, 6)))
    );
    if (!Number.isFinite(radius) || radius <= 0) {
      return {
        ...node,
        data: {
          ...node.data,
          filletEdgesGeometryId: geometryId,
          filletEdgesBasePositions: existing.mesh.positions.slice(),
          filletEdgesBaseIndices: resolveMeshIndices(existing.mesh),
          filletEdgesBaseUvs: existing.mesh.uvs?.slice() ?? [],
        },
      };
    }

    const basePositions =
      node.data?.filletEdgesGeometryId === geometryId &&
      Array.isArray(node.data?.filletEdgesBasePositions) &&
      node.data.filletEdgesBasePositions.length > 0
        ? node.data.filletEdgesBasePositions
        : existing.mesh.positions.slice();
    const baseIndices =
      node.data?.filletEdgesGeometryId === geometryId &&
      Array.isArray(node.data?.filletEdgesBaseIndices) &&
      node.data.filletEdgesBaseIndices.length > 0
        ? node.data.filletEdgesBaseIndices
        : resolveMeshIndices(existing.mesh);
    const baseUvs =
      node.data?.filletEdgesGeometryId === geometryId &&
      Array.isArray(node.data?.filletEdgesBaseUvs) &&
      node.data.filletEdgesBaseUvs.length > 0
        ? node.data.filletEdgesBaseUvs
        : (existing.mesh.uvs?.slice() ?? []);

    const vertexCount = basePositions.length / 3;
    const faces: Array<[number, number, number]> = [];
    for (let i = 0; i + 2 < baseIndices.length; i += 3) {
      faces.push([baseIndices[i], baseIndices[i + 1], baseIndices[i + 2]]);
    }

    const edgeMap = new Map<
      string,
      {
        a: number;
        b: number;
        faces: Array<{ faceIndex: number; a: number; b: number; c: number }>;
      }
    >();
    faces.forEach((face, faceIndex) => {
      const [i0, i1, i2] = face;
      const edges: Array<[number, number, number]> = [
        [i0, i1, i2],
        [i1, i2, i0],
        [i2, i0, i1],
      ];
      edges.forEach(([a, b, c]) => {
        const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
        const entry = edgeMap.get(key);
        if (entry) {
          entry.faces.push({ faceIndex, a, b, c });
        } else {
          edgeMap.set(key, { a: Math.min(a, b), b: Math.max(a, b), faces: [{ faceIndex, a, b, c }] });
        }
      });
    });

    const edgeInput = outputs?.edges;
    const edgeSegments = Array.isArray(edgeInput)
      ? edgeInput.map((entry) => (Array.isArray(entry) ? entry : null)).filter(Boolean)
      : [];
    if (edgeSegments.length === 0) return node;

    const findNearestIndex = (point: Vec3) => {
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < vertexCount; i += 1) {
        const ix = basePositions[i * 3] ?? 0;
        const iy = basePositions[i * 3 + 1] ?? 0;
        const iz = basePositions[i * 3 + 2] ?? 0;
        const dx = ix - point.x;
        const dy = iy - point.y;
        const dz = iz - point.z;
        const dist = dx * dx + dy * dy + dz * dz;
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      return best;
    };

    const selectedEdges = new Map<
      string,
      {
        entry: {
          a: number;
          b: number;
          faces: Array<{ faceIndex: number; a: number; b: number; c: number }>;
        };
        slices: Array<{ a: number; b: number }>;
      }
    >();

    edgeSegments.forEach((segment) => {
      if (!segment) return;
      const [aValue, bValue] = segment as unknown[];
      let aIndex: number | null = null;
      let bIndex: number | null = null;
      if (typeof aValue === "number" && typeof bValue === "number") {
        if (Number.isFinite(aValue) && Number.isFinite(bValue)) {
          aIndex = Math.round(aValue);
          bIndex = Math.round(bValue);
        }
      } else {
        const va = toVec3(aValue);
        const vb = toVec3(bValue);
        if (va && vb) {
          aIndex = findNearestIndex(va);
          bIndex = findNearestIndex(vb);
        }
      }
      if (aIndex == null || bIndex == null) return;
      const key = `${Math.min(aIndex, bIndex)}-${Math.max(aIndex, bIndex)}`;
      const entry = edgeMap.get(key);
      if (!entry || entry.faces.length < 2) return;
      selectedEdges.set(key, { entry, slices: [] });
    });

    if (selectedEdges.size === 0) return node;

    const positions = basePositions.slice();
    const addVertex = (point: Vec3) => {
      positions.push(point.x, point.y, point.z);
      return positions.length / 3 - 1;
    };

    selectedEdges.forEach((record) => {
      const { entry } = record;
      const [faceA, faceB] = entry.faces;
      const aIndex = entry.a;
      const bIndex = entry.b;
      const ax = basePositions[aIndex * 3] ?? 0;
      const ay = basePositions[aIndex * 3 + 1] ?? 0;
      const az = basePositions[aIndex * 3 + 2] ?? 0;
      const bx = basePositions[bIndex * 3] ?? 0;
      const by = basePositions[bIndex * 3 + 1] ?? 0;
      const bz = basePositions[bIndex * 3 + 2] ?? 0;
      const edgeDir = normalizeVec3Safe({ x: bx - ax, y: by - ay, z: bz - az }, { x: 1, y: 0, z: 0 });

      const faceNormal = (face: { a: number; b: number; c: number }) => {
        const pa = vec3FromPositions(basePositions, face.a);
        const pb = vec3FromPositions(basePositions, face.b);
        const pc = vec3FromPositions(basePositions, face.c);
        const u = subtractVec3(pb, pa);
        const v = subtractVec3(pc, pa);
        return normalizeVec3Safe(
          {
            x: u.y * v.z - u.z * v.y,
            y: u.z * v.x - u.x * v.z,
            z: u.x * v.y - u.y * v.x,
          },
          { x: 0, y: 1, z: 0 }
        );
      };

      const mid = { x: (ax + bx) * 0.5, y: (ay + by) * 0.5, z: (az + bz) * 0.5 };
      const computeSideDirection = (face: { a: number; b: number; c: number }) => {
        const normal = faceNormal(face);
        const raw = normalizeVec3Safe(
          {
            x: normal.y * edgeDir.z - normal.z * edgeDir.y,
            y: normal.z * edgeDir.x - normal.x * edgeDir.z,
            z: normal.x * edgeDir.y - normal.y * edgeDir.x,
          },
          { x: 0, y: 1, z: 0 }
        );
        const toCorner = subtractVec3(vec3FromPositions(basePositions, face.c), mid);
        const sign = dotVec3(raw, toCorner) >= 0 ? 1 : -1;
        return { normal, side: scaleVec3(raw, sign) };
      };

      const faceDataA = computeSideDirection(faceA);
      const faceDataB = computeSideDirection(faceB);
      const n1 = faceDataA.normal;
      const n2 = faceDataB.normal;
      const s1 = faceDataA.side;
      const s2 = faceDataB.side;

      const sliceCount = Math.max(1, segments);
      for (let i = 0; i <= sliceCount; i += 1) {
        const t = sliceCount === 0 ? 0 : i / sliceCount;
        const dir = normalizeVec3Safe(
          {
            x: s1.x + (s2.x - s1.x) * t,
            y: s1.y + (s2.y - s1.y) * t,
            z: s1.z + (s2.z - s1.z) * t,
          },
          s1
        );
        const aPoint = { x: ax + dir.x * radius, y: ay + dir.y * radius, z: az + dir.z * radius };
        const bPoint = { x: bx + dir.x * radius, y: by + dir.y * radius, z: bz + dir.z * radius };
        const aNew = addVertex(aPoint);
        const bNew = addVertex(bPoint);
        record.slices.push({ a: aNew, b: bNew });
      }
    });

    const newIndices: number[] = [];
    faces.forEach((face, faceIndex) => {
      const [i0, i1, i2] = face;
      const faceEdges: Array<[number, number]> = [
        [i0, i1],
        [i1, i2],
        [i2, i0],
      ];
      const selected = faceEdges
        .map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`)
        .filter((key) => selectedEdges.has(key));
      if (selected.length !== 1) {
        newIndices.push(i0, i1, i2);
        return;
      }
      const edgeKey = selected[0];
      const edgeData = selectedEdges.get(edgeKey);
      if (!edgeData) {
        newIndices.push(i0, i1, i2);
        return;
      }
      const faceEntry = edgeData.entry.faces.find((faceInfo) => faceInfo.faceIndex === faceIndex);
      if (!faceEntry) {
        newIndices.push(i0, i1, i2);
        return;
      }
      const isFirstFace = edgeData.entry.faces[0].faceIndex === faceIndex;
      const sliceIndex = isFirstFace ? 0 : edgeData.slices.length - 1;
      const slice = edgeData.slices[sliceIndex];
      const replaceIndex = (value: number) => {
        if (value === edgeData.entry.a) return slice.a;
        if (value === edgeData.entry.b) return slice.b;
        return value;
      };
      newIndices.push(replaceIndex(i0), replaceIndex(i1), replaceIndex(i2));
    });

    selectedEdges.forEach((edgeData) => {
      const slices = edgeData.slices;
      const [faceA, faceB] = edgeData.entry.faces;
      const n1 = (() => {
        const pa = vec3FromPositions(basePositions, faceA.a);
        const pb = vec3FromPositions(basePositions, faceA.b);
        const pc = vec3FromPositions(basePositions, faceA.c);
        const u = subtractVec3(pb, pa);
        const v = subtractVec3(pc, pa);
        return normalizeVec3Safe(
          {
            x: u.y * v.z - u.z * v.y,
            y: u.z * v.x - u.x * v.z,
            z: u.x * v.y - u.y * v.x,
          },
          { x: 0, y: 1, z: 0 }
        );
      })();
      const n2 = (() => {
        const pa = vec3FromPositions(basePositions, faceB.a);
        const pb = vec3FromPositions(basePositions, faceB.b);
        const pc = vec3FromPositions(basePositions, faceB.c);
        const u = subtractVec3(pb, pa);
        const v = subtractVec3(pc, pa);
        return normalizeVec3Safe(
          {
            x: u.y * v.z - u.z * v.y,
            y: u.z * v.x - u.x * v.z,
            z: u.x * v.y - u.y * v.x,
          },
          { x: 0, y: 1, z: 0 }
        );
      })();
      const targetNormal = normalizeVec3Safe(
        { x: n1.x + n2.x, y: n1.y + n2.y, z: n1.z + n2.z },
        n1
      );

      for (let i = 0; i + 1 < slices.length; i += 1) {
        const a0 = slices[i].a;
        const b0 = slices[i].b;
        const a1 = slices[i + 1].a;
        const b1 = slices[i + 1].b;
        const pA0 = vec3FromPositions(positions, a0);
        const pB0 = vec3FromPositions(positions, b0);
        const pA1 = vec3FromPositions(positions, a1);
        const edgeNormal = normalizeVec3Safe(
          {
            x: (pB0.y - pA0.y) * (pA1.z - pA0.z) - (pB0.z - pA0.z) * (pA1.y - pA0.y),
            y: (pB0.z - pA0.z) * (pA1.x - pA0.x) - (pB0.x - pA0.x) * (pA1.z - pA0.z),
            z: (pB0.x - pA0.x) * (pA1.y - pA0.y) - (pB0.y - pA0.y) * (pA1.x - pA0.x),
          },
          targetNormal
        );
        const dot = dotVec3(edgeNormal, targetNormal);
        if (dot >= 0) {
          newIndices.push(a0, b0, b1, a0, b1, a1);
        } else {
          newIndices.push(a0, b1, b0, a0, a1, b1);
        }
      }
    });

    const normals = computeVertexNormals(positions, newIndices);
    const uvs: number[] =
      baseUvs.length === vertexCount * 2
        ? [...baseUvs, ...new Array((positions.length / 3 - vertexCount) * 2).fill(0)]
        : new Array((positions.length / 3) * 2).fill(0);

    const nextMesh = {
      ...existing.mesh,
      positions,
      normals,
      indices: newIndices,
      uvs,
    };
    const { volume_m3, centroid } = computeMeshVolumeAndCentroid(nextMesh);
    const density = resolveDensity(existing.metadata);
    const mass_kg = density && volume_m3 > 0 ? density * volume_m3 : undefined;
    updates.set(geometryId, {
      mesh: nextMesh,
      area_m2: computeMeshArea(positions, newIndices),
      volume_m3,
      centroid: centroid ?? undefined,
      mass_kg,
    });
    didApply = true;

    return {
      ...node,
      data: {
        ...node.data,
        filletEdgesGeometryId: geometryId,
        filletEdgesBasePositions: basePositions,
        filletEdgesBaseIndices: baseIndices,
        filletEdgesBaseUvs: baseUvs,
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

const TESSELLATION_NODE_TYPES = new Set<NodeType>([
  "subdivideMesh",
  "dualMesh",
  "insetFaces",
  "extrudeFaces",
  "meshRelax",
  "meshBoolean",
  "triangulateMesh",
  "geodesicSphere",
  "voronoiPattern",
  "hexagonalTiling",
  "offsetPattern",
  "meshRepair",
  "meshUVs",
  "meshDecimate",
  "quadRemesh",
]);

const applyTessellationNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  const itemsToAdd: Geometry[] = [];
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (!node.type || !TESSELLATION_NODE_TYPES.has(node.type as NodeType)) return node;
    const outputs = node.data?.outputs;
    let geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    let updatedNode = node;
    if (!geometryId && node.type === "geodesicSphere") {
      geometryId = createGeometryId("mesh");
      updatedNode = {
        ...node,
        data: {
          ...node.data,
          geometryId,
          geometryType: "mesh",
          isLinked: true,
        },
      };
    }
    const mesh = outputs?.mesh as RenderMesh | undefined;
    if (!geometryId || !mesh || !Array.isArray(mesh.positions) || !Array.isArray(mesh.indices)) {
      return updatedNode;
    }
    const existing = geometryById.get(geometryId);
    const tessellation = outputs?.tessellation as { positions: number[]; faces: number[][]; uvs?: number[] } | undefined;
    const nextMetadata =
      tessellation && typeof tessellation === "object"
        ? withTessellationMetadata(
            (existing?.metadata as Record<string, unknown> | undefined) ?? {},
            tessellation
          )
        : existing?.metadata;
    const area = computeMeshArea(mesh.positions, mesh.indices);
    if (existing && "mesh" in existing) {
      updates.set(geometryId, { mesh, area_m2: area, metadata: nextMetadata });
    } else {
      itemsToAdd.push({
        id: geometryId,
        type: "mesh",
        mesh,
        layerId: existing?.layerId ?? "layer-default",
        area_m2: area,
        metadata: nextMetadata,
      });
    }
    didApply = true;
    return updatedNode;
  });

  if (!didApply && itemsToAdd.length === 0) {
    return { nodes: nextNodes, geometry, didApply: false };
  }

  let nextGeometry = geometry.map((item) => {
    const update = updates.get(item.id);
    return update ? ({ ...item, ...update } as Geometry) : item;
  });
  if (itemsToAdd.length > 0) {
    nextGeometry = [...nextGeometry, ...itemsToAdd];
  }

  return { nodes: nextNodes, geometry: nextGeometry, didApply: true };
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

const buildBoundaryLoops = (edges: Array<{ a: number; b: number }>) => {
  const adjacency = new Map<number, Set<number>>();
  const edgeKey = (u: number, v: number) => `${Math.min(u, v)}-${Math.max(u, v)}`;
  const visited = new Set<string>();

  edges.forEach(({ a, b }) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)?.add(b);
    adjacency.get(b)?.add(a);
  });

  const loops: number[][] = [];
  edges.forEach(({ a, b }) => {
    const key = edgeKey(a, b);
    if (visited.has(key)) return;
    let start = a;
    let prev = a;
    let current = b;
    const loop = [start, current];
    visited.add(key);

    for (let guard = 0; guard < edges.length * 2; guard += 1) {
      if (current === start) break;
      const neighbors = adjacency.get(current);
      if (!neighbors || neighbors.size === 0) break;
      let next: number | null = null;
      for (const candidate of neighbors) {
        if (candidate !== prev) {
          next = candidate;
          break;
        }
      }
      if (next == null) {
        const first = neighbors.values().next().value as number | undefined;
        next = first ?? null;
      }
      if (next == null) break;
      const nextKey = edgeKey(current, next);
      if (visited.has(nextKey)) break;
      visited.add(nextKey);
      prev = current;
      current = next;
      loop.push(current);
      if (current === start) break;
    }

    if (loop.length > 2 && loop[loop.length - 1] === start) {
      loop.pop();
    }
    if (loop.length >= 3) loops.push(loop);
  });

  return loops;
};

const buildThickenedMesh = (
  basePositions: number[],
  baseIndices: number[],
  baseUvs: number[],
  thickness: number,
  sides: string
): RenderMesh => {
  if (!Number.isFinite(thickness) || thickness === 0) {
    const indices = baseIndices.length > 0 ? baseIndices : Array.from({ length: basePositions.length / 3 }, (_, i) => i);
    const normals = computeVertexNormals(basePositions, indices);
    return {
      positions: basePositions.slice(),
      normals,
      uvs: baseUvs.slice(),
      indices,
    };
  }

  const vertexCount = Math.floor(basePositions.length / 3);
  const indices = baseIndices.length > 0 ? baseIndices : Array.from({ length: vertexCount }, (_, i) => i);
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

const applyThickenMeshNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "thickenMesh") return node;
    const outputs = node.data?.outputs;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    if (!geometryId) return node;
    const existing = geometryById.get(geometryId);
    if (!existing || !("mesh" in existing) || !existing.mesh) return node;

    const thickness = asNumber(
      outputs?.thickness,
      asNumber(node.data?.parameters?.thickness, 1)
    );
    const sides = String(outputs?.sides ?? node.data?.parameters?.sides ?? "both").toLowerCase();
    const basePositions =
      node.data?.thickenGeometryId === geometryId &&
      Array.isArray(node.data?.thickenBasePositions) &&
      node.data.thickenBasePositions.length > 0
        ? node.data.thickenBasePositions
        : existing.mesh.positions.slice();
    const baseIndices =
      node.data?.thickenGeometryId === geometryId &&
      Array.isArray(node.data?.thickenBaseIndices) &&
      node.data.thickenBaseIndices.length > 0
        ? node.data.thickenBaseIndices
        : resolveMeshIndices(existing.mesh);
    const baseUvs =
      node.data?.thickenGeometryId === geometryId &&
      Array.isArray(node.data?.thickenBaseUvs) &&
      node.data.thickenBaseUvs.length > 0
        ? node.data.thickenBaseUvs
        : (existing.mesh.uvs?.slice() ?? []);

    const mesh = buildThickenedMesh(
      basePositions,
      baseIndices,
      baseUvs,
      thickness,
      sides
    );
    const { volume_m3, centroid } = computeMeshVolumeAndCentroid(mesh);
    const density = resolveDensity(existing.metadata);
    const mass_kg = density && volume_m3 > 0 ? density * volume_m3 : undefined;
    updates.set(geometryId, {
      mesh,
      area_m2: computeMeshArea(mesh.positions, mesh.indices),
      volume_m3,
      centroid: centroid ?? undefined,
      mass_kg,
    });
    didApply = true;
    return {
      ...node,
      data: {
        ...node.data,
        thickenGeometryId: geometryId,
        thickenOffset: thickness,
        thickenBasePositions: basePositions,
        thickenBaseIndices: baseIndices,
        thickenBaseUvs: baseUvs,
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

const collectGeometryPoints = (
  geometry: Geometry,
  geometryById: Map<string, Geometry>
) => {
  if (geometry.type === "vertex") return [geometry.position];
  if (geometry.type === "polyline") {
    const points: Vec3[] = [];
    geometry.vertexIds.forEach((vertexId) => {
      const vertex = geometryById.get(vertexId);
      if (vertex && vertex.type === "vertex") {
        points.push(vertex.position);
      }
    });
    return points;
  }
  if (geometry.type === "nurbsCurve") {
    const tessellated = tessellateCurveAdaptive(geometry.nurbs);
    return tessellated.points;
  }
  const mesh = resolveGeometryMesh(geometry);
  if (mesh) {
    const positions = mesh.positions;
    const points: Vec3[] = [];
    for (let i = 0; i + 2 < positions.length; i += 3) {
      points.push({ x: positions[i], y: positions[i + 1], z: positions[i + 2] });
    }
    return points;
  }
  return [];
};

type TargetSamples =
  | { kind: "points"; points: Vec3[] }
  | { kind: "segments"; segments: Array<[Vec3, Vec3]> }
  | { kind: "triangles"; triangles: Array<[Vec3, Vec3, Vec3]> };

const vec3FromPositions = (positions: number[], index: number): Vec3 => ({
  x: positions[index * 3] ?? 0,
  y: positions[index * 3 + 1] ?? 0,
  z: positions[index * 3 + 2] ?? 0,
});

const buildTargetSamples = (
  geometry: Geometry,
  geometryById: Map<string, Geometry>
): TargetSamples => {
  if (geometry.type === "vertex") {
    return { kind: "points", points: [geometry.position] };
  }
  if (geometry.type === "polyline") {
    const points = collectGeometryPoints(geometry, geometryById);
    if (points.length < 2) return { kind: "points", points };
    const segments: Array<[Vec3, Vec3]> = [];
    for (let i = 0; i + 1 < points.length; i += 1) {
      segments.push([points[i], points[i + 1]]);
    }
    if (geometry.closed && points.length > 2) {
      segments.push([points[points.length - 1], points[0]]);
    }
    return { kind: "segments", segments };
  }
  if (geometry.type === "nurbsCurve") {
    const points = collectGeometryPoints(geometry, geometryById);
    if (points.length < 2) return { kind: "points", points };
    const segments: Array<[Vec3, Vec3]> = [];
    for (let i = 0; i + 1 < points.length; i += 1) {
      segments.push([points[i], points[i + 1]]);
    }
    if (geometry.closed && points.length > 2) {
      segments.push([points[points.length - 1], points[0]]);
    }
    return { kind: "segments", segments };
  }
  const mesh = resolveGeometryMesh(geometry);
  if (mesh) {
    const positions = mesh.positions;
    const indices = resolveMeshIndices(mesh);
    const triangles: Array<[Vec3, Vec3, Vec3]> = [];
    for (let i = 0; i + 2 < indices.length; i += 3) {
      const a = indices[i];
      const b = indices[i + 1];
      const c = indices[i + 2];
      triangles.push([
        vec3FromPositions(positions, a),
        vec3FromPositions(positions, b),
        vec3FromPositions(positions, c),
      ]);
    }
    return { kind: "triangles", triangles };
  }
  return { kind: "points", points: [] };
};

const closestPointOnSegment = (p: Vec3, a: Vec3, b: Vec3) => {
  const ab = subtractVec3(b, a);
  const ap = subtractVec3(p, a);
  const denom = dotVec3(ab, ab);
  if (denom <= 1e-10) return a;
  const t = clampValue(dotVec3(ap, ab) / denom, 0, 1);
  return addVec3(a, scaleVec3(ab, t));
};

const closestPointOnTriangle = (p: Vec3, a: Vec3, b: Vec3, c: Vec3) => {
  const ab = subtractVec3(b, a);
  const ac = subtractVec3(c, a);
  const ap = subtractVec3(p, a);
  const d1 = dotVec3(ab, ap);
  const d2 = dotVec3(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;

  const bp = subtractVec3(p, b);
  const d3 = dotVec3(ab, bp);
  const d4 = dotVec3(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;

  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return addVec3(a, scaleVec3(ab, v));
  }

  const cp = subtractVec3(p, c);
  const d5 = dotVec3(ab, cp);
  const d6 = dotVec3(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;

  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return addVec3(a, scaleVec3(ac, w));
  }

  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    return addVec3(b, scaleVec3(subtractVec3(c, b), w));
  }

  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  return addVec3(a, addVec3(scaleVec3(ab, v), scaleVec3(ac, w)));
};

const findClosestPoint = (p: Vec3, target: TargetSamples) => {
  if (target.kind === "points") {
    if (target.points.length === 0) return p;
    let best = target.points[0];
    let bestDist = Number.POSITIVE_INFINITY;
    target.points.forEach((point) => {
      const dx = point.x - p.x;
      const dy = point.y - p.y;
      const dz = point.z - p.z;
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < bestDist) {
        bestDist = dist;
        best = point;
      }
    });
    return best;
  }
  if (target.kind === "segments") {
    if (target.segments.length === 0) return p;
    let best = target.segments[0][0];
    let bestDist = Number.POSITIVE_INFINITY;
    target.segments.forEach(([a, b]) => {
      const point = closestPointOnSegment(p, a, b);
      const dx = point.x - p.x;
      const dy = point.y - p.y;
      const dz = point.z - p.z;
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < bestDist) {
        bestDist = dist;
        best = point;
      }
    });
    return best;
  }
  if (target.kind === "triangles") {
    if (target.triangles.length === 0) return p;
    let best = target.triangles[0][0];
    let bestDist = Number.POSITIVE_INFINITY;
    target.triangles.forEach(([a, b, c]) => {
      const point = closestPointOnTriangle(p, a, b, c);
      const dx = point.x - p.x;
      const dy = point.y - p.y;
      const dz = point.z - p.z;
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < bestDist) {
        bestDist = dist;
        best = point;
      }
    });
    return best;
  }
  return p;
};

type Ray = { origin: Vec3; dir: Vec3 };

const intersectRayTriangle = (ray: Ray, a: Vec3, b: Vec3, c: Vec3) => {
  const EPS = 1e-7;
  const edge1 = subtractVec3(b, a);
  const edge2 = subtractVec3(c, a);
  const pvec = {
    x: ray.dir.y * edge2.z - ray.dir.z * edge2.y,
    y: ray.dir.z * edge2.x - ray.dir.x * edge2.z,
    z: ray.dir.x * edge2.y - ray.dir.y * edge2.x,
  };
  const det = dotVec3(edge1, pvec);
  if (Math.abs(det) < EPS) return null;
  const invDet = 1 / det;
  const tvec = subtractVec3(ray.origin, a);
  const u = dotVec3(tvec, pvec) * invDet;
  if (u < 0 || u > 1) return null;
  const qvec = {
    x: tvec.y * edge1.z - tvec.z * edge1.y,
    y: tvec.z * edge1.x - tvec.x * edge1.z,
    z: tvec.x * edge1.y - tvec.y * edge1.x,
  };
  const v = dotVec3(ray.dir, qvec) * invDet;
  if (v < 0 || u + v > 1) return null;
  const t = dotVec3(edge2, qvec) * invDet;
  if (t <= 1e-6) return null;
  return { t, point: addVec3(ray.origin, scaleVec3(ray.dir, t)) };
};

const raycastTriangles = (
  ray: Ray,
  triangles: Array<[Vec3, Vec3, Vec3]>,
  maxDistance: number
) => {
  let bestT = Number.POSITIVE_INFINITY;
  let bestPoint: Vec3 | null = null;
  triangles.forEach(([a, b, c]) => {
    const hit = intersectRayTriangle(ray, a, b, c);
    if (!hit) return;
    if (Number.isFinite(maxDistance) && maxDistance > 0 && hit.t > maxDistance) return;
    if (hit.t < bestT) {
      bestT = hit.t;
      bestPoint = hit.point;
    }
  });
  return bestPoint ? { t: bestT, point: bestPoint } : null;
};

const applyPlasticwrapNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "plasticwrap") return node;
    const outputs = node.data?.outputs;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    const targetId = typeof outputs?.target === "string" ? outputs.target : null;
    if (!geometryId || !targetId) return node;
    const source = geometryById.get(geometryId);
    const target = geometryById.get(targetId);
    if (!source || !target) return node;

    const targetSamples = buildTargetSamples(target, geometryById);

    const distance = Math.max(
      0,
      asNumber(outputs?.distance, asNumber(node.data?.parameters?.distance, 0))
    );
    const smooth = clampValue(
      asNumber(outputs?.smooth, asNumber(node.data?.parameters?.smooth, 0.5)),
      0,
      1
    );
    const strength = 1 - smooth;
    const maxDistance = distance > 0 ? distance : Number.POSITIVE_INFINITY;

    if (source.type === "vertex") {
      const basePositions =
        node.data?.plasticwrapGeometryId === geometryId &&
        Array.isArray(node.data?.plasticwrapBasePositions) &&
        node.data.plasticwrapBasePositions.length >= 3
          ? node.data.plasticwrapBasePositions
          : flattenPoints([source.position]);
      const base = expandPoints(basePositions)[0] ?? source.position;
      const best = findClosestPoint(base, targetSamples);
      const deltaVec = subtractVec3(best, base);
      const len = lengthVec3(deltaVec);
      const clamped = distance > 0 && len > distance ? scaleVec3(deltaVec, distance / len) : deltaVec;
      const moved = addVec3(base, scaleVec3(clamped, strength));
      updates.set(source.id, { position: moved });
      didApply = true;
      return {
        ...node,
        data: {
          ...node.data,
          plasticwrapGeometryId: geometryId,
          plasticwrapBasePositions: basePositions,
        },
      };
    }

    if (source.type === "polyline") {
      const points = collectGeometryPoints(source, geometryById);
      const basePositions =
        node.data?.plasticwrapGeometryId === geometryId &&
        Array.isArray(node.data?.plasticwrapBasePositions) &&
        node.data.plasticwrapBasePositions.length === points.length * 3
          ? node.data.plasticwrapBasePositions
          : flattenPoints(points);
      const basePoints = expandPoints(basePositions);
      const nextPoints = basePoints.map((base) => {
        const best = findClosestPoint(base, targetSamples);
        const deltaVec = subtractVec3(best, base);
        const len = lengthVec3(deltaVec);
        const clamped =
          distance > 0 && len > distance ? scaleVec3(deltaVec, distance / len) : deltaVec;
        return addVec3(base, scaleVec3(clamped, strength));
      });
      source.vertexIds.forEach((vertexId, index) => {
        updates.set(vertexId, { position: nextPoints[index] });
      });
      didApply = true;
      return {
        ...node,
        data: {
          ...node.data,
          plasticwrapGeometryId: geometryId,
          plasticwrapBasePositions: basePositions,
        },
      };
    }

    if ("mesh" in source && source.mesh) {
      const basePositions =
        node.data?.plasticwrapGeometryId === geometryId &&
        Array.isArray(node.data?.plasticwrapBasePositions) &&
        node.data.plasticwrapBasePositions.length === source.mesh.positions.length
          ? node.data.plasticwrapBasePositions
          : source.mesh.positions.slice();
      const nextPositions = basePositions.slice();
      const targetTriangles =
        targetSamples.kind === "triangles" ? targetSamples.triangles : [];
      const canRaycast = targetTriangles.length > 0;
      const baseIndices = resolveMeshIndices(source.mesh);
      const baseNormals = canRaycast
        ? computeVertexNormals(basePositions, baseIndices)
        : [];
      for (let i = 0; i + 2 < basePositions.length; i += 3) {
        const base = { x: basePositions[i], y: basePositions[i + 1], z: basePositions[i + 2] };
        let best: Vec3 | null = null;
        if (canRaycast) {
          const normalRaw = {
            x: baseNormals[i] ?? 0,
            y: baseNormals[i + 1] ?? 0,
            z: baseNormals[i + 2] ?? 0,
          };
          if (!isNearlyZeroVec3(normalRaw)) {
            const normal = normalizeVec3Safe(normalRaw, normalRaw);
            const forward = raycastTriangles(
              { origin: base, dir: normal },
              targetTriangles,
              maxDistance
            );
            const backward = raycastTriangles(
              { origin: base, dir: scaleVec3(normal, -1) },
              targetTriangles,
              maxDistance
            );
            if (forward && backward) {
              best = forward.t <= backward.t ? forward.point : backward.point;
            } else {
              best = forward?.point ?? backward?.point ?? null;
            }
          }
        }
        if (!best) {
          best = findClosestPoint(base, targetSamples);
        }
        const deltaVec = subtractVec3(best, base);
        const len = lengthVec3(deltaVec);
        const clamped =
          distance > 0 && len > distance ? scaleVec3(deltaVec, distance / len) : deltaVec;
        const moved = addVec3(base, scaleVec3(clamped, strength));
        nextPositions[i] = moved.x;
        nextPositions[i + 1] = moved.y;
        nextPositions[i + 2] = moved.z;
      }
      const indices = resolveMeshIndices(source.mesh);
      const normals = computeVertexNormals(nextPositions, indices);
      const nextMesh = {
        ...source.mesh,
        positions: nextPositions,
        normals,
        indices: source.mesh.indices.length > 0 ? source.mesh.indices : indices,
      };
      const { volume_m3, centroid } = computeMeshVolumeAndCentroid(nextMesh);
      const density = resolveDensity(source.metadata);
      const mass_kg = density && volume_m3 > 0 ? density * volume_m3 : undefined;
      updates.set(geometryId, {
        mesh: nextMesh,
        area_m2: computeMeshArea(nextPositions, indices),
        volume_m3,
        centroid: centroid ?? undefined,
        mass_kg,
      });
      didApply = true;
      return {
        ...node,
        data: {
          ...node.data,
          plasticwrapGeometryId: geometryId,
          plasticwrapBasePositions: basePositions,
        },
      };
    }

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

const ensureDoubleSidedMesh = (mesh: RenderMesh) => {
  const indices = resolveMeshIndices(mesh);
  const existing = new Set<string>();
  for (let i = 0; i + 2 < indices.length; i += 3) {
    existing.add(`${indices[i]}-${indices[i + 1]}-${indices[i + 2]}`);
  }
  const nextIndices = indices.slice();
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];
    const reverseKey = `${a}-${c}-${b}`;
    if (!existing.has(reverseKey)) {
      nextIndices.push(a, c, b);
    }
  }
  if (nextIndices.length === indices.length) return mesh;
  const normals = computeVertexNormals(mesh.positions, nextIndices);
  return {
    ...mesh,
    indices: mesh.indices.length > 0 ? nextIndices : nextIndices,
    normals,
  };
};

const applySolidNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "solid") return node;
    const outputs = node.data?.outputs;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    if (!geometryId) return node;
    const existing = geometryById.get(geometryId);
    if (!existing || !("mesh" in existing) || !existing.mesh) return node;
    const indices = resolveMeshIndices(existing.mesh);
    const boundaryEdges = collectBoundaryEdges(indices);
    let mesh = existing.mesh;
    if (boundaryEdges.length > 0) {
      const loops = buildBoundaryLoops(boundaryEdges);
      const capMeshes: RenderMesh[] = [];
      loops.forEach((loop) => {
        if (loop.length < 3) return;
        const loopPoints = loop.map((index) => vec3FromPositions(existing.mesh.positions, index));
        const cap = generateSurfaceMesh([loopPoints]).mesh;
        if (cap.positions.length > 0 && cap.indices.length > 0) {
          capMeshes.push(cap);
        }
      });
      if (capMeshes.length > 0) {
        mesh = mergeRenderMeshes([existing.mesh, ...capMeshes]);
      }
    }
    if (boundaryEdges.length === 0) {
      mesh = ensureDoubleSidedMesh(existing.mesh);
    }
    const { volume_m3, centroid } = computeMeshVolumeAndCentroid(mesh);
    const density = resolveDensity(existing.metadata);
    const mass_kg = density && volume_m3 > 0 ? density * volume_m3 : undefined;
    updates.set(geometryId, {
      mesh,
      area_m2: computeMeshArea(mesh.positions, mesh.indices),
      volume_m3,
      centroid: centroid ?? undefined,
      mass_kg,
    });
    didApply = true;
    return {
      ...node,
      data: {
        ...node.data,
        solidGeometryId: geometryId,
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

const applyCustomMaterialNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const resolveExistingHex = (metadata: Record<string, unknown> | undefined) => {
    if (!metadata || typeof metadata !== "object") return null;
    const custom = (metadata as { customMaterial?: unknown }).customMaterial;
    if (!custom || typeof custom !== "object") return null;
    const record = custom as { color?: unknown; hex?: unknown };
    if (typeof record.hex === "string") {
      return normalizeHexColor(record.hex);
    }
    const color = normalizeRgbInput(record.color);
    return color ? rgbToHex(color) : null;
  };

  const resolveCustomMaterial = (
    outputs: Record<string, unknown> | undefined,
    parameters: Record<string, unknown> | undefined
  ) => {
    const color = normalizeRgbInput(outputs?.color);
    if (color) {
      return { color, hex: rgbToHex(color) };
    }
    const rawHex =
      typeof outputs?.hex === "string"
        ? outputs.hex
        : typeof parameters?.color === "string"
          ? parameters.color
          : null;
    const normalizedHex = normalizeHexColor(rawHex);
    const rgb = normalizedHex ? hexToRgb(normalizedHex) : null;
    if (!rgb) return null;
    return { color: rgb, hex: normalizedHex };
  };

  const nextNodes = nodes.map((node) => {
    if (node.type !== "customMaterial") return node;
    const outputs = node.data?.outputs as Record<string, unknown> | undefined;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    if (!geometryId) return node;
    const existing = geometryById.get(geometryId);
    if (!existing) return node;

    const resolved = resolveCustomMaterial(outputs, node.data?.parameters);
    if (!resolved) return node;

    const existingHex = resolveExistingHex(existing.metadata);
    if (existingHex === resolved.hex) {
      return node;
    }

    const existingCustom =
      (existing.metadata as { customMaterial?: unknown } | undefined)?.customMaterial;
    const existingRecord =
      existingCustom && typeof existingCustom === "object"
        ? (existingCustom as Record<string, unknown>)
        : {};

    updates.set(geometryId, {
      metadata: {
        ...(existing.metadata ?? {}),
        customMaterial: {
          ...existingRecord,
          color: resolved.color,
          hex: resolved.hex,
        },
      },
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

const sampleSpatialField = (
  point: Vec3,
  samples: FieldSample[],
  falloffRadius: number
) => {
  let vectorSum = { x: 0, y: 0, z: 0 };
  let scalarSum = 0;
  let vectorWeight = 0;
  let scalarWeight = 0;

  samples.forEach((sample) => {
    const delta = subtractVec3(point, sample.position);
    const dist = lengthVec3(delta);
    const radius =
      Number.isFinite(sample.radius) && (sample.radius ?? 0) > 0
        ? (sample.radius as number)
        : falloffRadius;
    let weight = 1;
    if (radius > 0) {
      const t = 1 - dist / radius;
      if (t <= 0) return;
      weight = t * t;
    }
    if (sample.vector) {
      vectorSum = addVec3(vectorSum, scaleVec3(sample.vector, weight));
      vectorWeight += weight;
    }
    if (Number.isFinite(sample.scalar ?? Number.NaN)) {
      scalarSum += (sample.scalar as number) * weight;
      scalarWeight += weight;
    }
  });

  const vector =
    vectorWeight > 0 ? scaleVec3(vectorSum, 1 / vectorWeight) : { x: 0, y: 0, z: 0 };
  const scalar = scalarWeight > 0 ? scalarSum / scalarWeight : 0;
  return { vector, scalar, vectorWeight, scalarWeight };
};

const applyFieldTransformationNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "fieldTransformation") return node;
    const outputs = node.data?.outputs;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    if (!geometryId) return node;
    const existing = geometryById.get(geometryId);
    if (!existing) return node;

    const strength = asNumber(
      outputs?.strength,
      asNumber(node.data?.parameters?.strength, 1)
    );
    const falloff = Math.max(
      0,
      asNumber(outputs?.falloff, asNumber(node.data?.parameters?.falloff, 1))
    );
    const fieldValue = outputs?.field;
    const fieldSamples = collectFieldSamples(fieldValue);
    const useSpatialField = fieldSamples.length > 0;
    const fieldVecs = useSpatialField ? [] : collectVec3List(fieldValue);
    const fieldScalars =
      !useSpatialField && fieldVecs.length === 0 ? collectNumberList(fieldValue) : [];
    const hasScalarSamples =
      useSpatialField &&
      fieldSamples.some((sample) => Number.isFinite(sample.scalar ?? Number.NaN));

    if (existing.type === "vertex") {
      const basePositions =
        node.data?.fieldTransformGeometryId === geometryId &&
        Array.isArray(node.data?.fieldTransformBasePositions) &&
        node.data.fieldTransformBasePositions.length >= 3
          ? node.data.fieldTransformBasePositions
          : flattenPoints([existing.position]);
      const base = expandPoints(basePositions)[0] ?? existing.position;
      let displacement = { x: 0, y: 0, z: 0 };
      if (useSpatialField) {
        const sampled = sampleSpatialField(base, fieldSamples, falloff);
        if (sampled.vectorWeight > 0) {
          displacement = addVec3(displacement, sampled.vector);
        }
        if (sampled.scalarWeight > 0) {
          displacement = addVec3(displacement, { x: 0, y: sampled.scalar, z: 0 });
        }
        displacement = scaleVec3(displacement, strength);
      } else if (fieldVecs.length > 0) {
        const vec = fieldVecs[0];
        displacement = scaleVec3(vec, strength * falloff);
      } else if (fieldScalars.length > 0) {
        displacement = { x: 0, y: fieldScalars[0] * strength * falloff, z: 0 };
      }
      const moved = addVec3(base, displacement);
      updates.set(existing.id, { position: moved });
      didApply = true;
      return {
        ...node,
        data: {
          ...node.data,
          fieldTransformGeometryId: geometryId,
          fieldTransformBasePositions: basePositions,
        },
      };
    }

    if (existing.type === "polyline") {
      const points = collectGeometryPoints(existing, geometryById);
      const basePositions =
        node.data?.fieldTransformGeometryId === geometryId &&
        Array.isArray(node.data?.fieldTransformBasePositions) &&
        node.data.fieldTransformBasePositions.length === points.length * 3
          ? node.data.fieldTransformBasePositions
          : flattenPoints(points);
      const basePoints = expandPoints(basePositions);
      const plane = computeBestFitPlane(basePoints);
      const nextPoints = basePoints.map((base, index) => {
        let displacement = { x: 0, y: 0, z: 0 };
        if (useSpatialField) {
          const sampled = sampleSpatialField(base, fieldSamples, falloff);
          if (sampled.vectorWeight > 0) {
            displacement = addVec3(displacement, sampled.vector);
          }
          if (sampled.scalarWeight > 0) {
            displacement = addVec3(
              displacement,
              scaleVec3(plane.normal, sampled.scalar)
            );
          }
          displacement = scaleVec3(displacement, strength);
        } else if (fieldVecs.length > 0) {
          const vec = fieldVecs[index % fieldVecs.length];
          displacement = scaleVec3(vec, strength * falloff);
        } else if (fieldScalars.length > 0) {
          const scalar = fieldScalars[index % fieldScalars.length];
          displacement = scaleVec3(plane.normal, scalar * strength * falloff);
        }
        return addVec3(base, displacement);
      });
      existing.vertexIds.forEach((vertexId, index) => {
        updates.set(vertexId, { position: nextPoints[index] });
      });
      didApply = true;
      return {
        ...node,
        data: {
          ...node.data,
          fieldTransformGeometryId: geometryId,
          fieldTransformBasePositions: basePositions,
        },
      };
    }

    if ("mesh" in existing && existing.mesh) {
      const basePositions =
        node.data?.fieldTransformGeometryId === geometryId &&
        Array.isArray(node.data?.fieldTransformBasePositions) &&
        node.data.fieldTransformBasePositions.length === existing.mesh.positions.length
          ? node.data.fieldTransformBasePositions
          : existing.mesh.positions.slice();
      const indices = resolveMeshIndices(existing.mesh);
      const normals =
        (!useSpatialField && fieldScalars.length > 0) || hasScalarSamples
          ? computeVertexNormals(basePositions, indices)
          : [];
      const nextPositions = basePositions.slice();
      const vertexCount = basePositions.length / 3;
      for (let i = 0; i < vertexCount; i += 1) {
        const base = {
          x: basePositions[i * 3] ?? 0,
          y: basePositions[i * 3 + 1] ?? 0,
          z: basePositions[i * 3 + 2] ?? 0,
        };
        let displacement = { x: 0, y: 0, z: 0 };
        if (useSpatialField) {
          const sampled = sampleSpatialField(base, fieldSamples, falloff);
          if (sampled.vectorWeight > 0) {
            displacement = addVec3(displacement, sampled.vector);
          }
          if (sampled.scalarWeight > 0) {
            const nx = normals[i * 3] ?? 0;
            const ny = normals[i * 3 + 1] ?? 0;
            const nz = normals[i * 3 + 2] ?? 0;
            displacement = addVec3(displacement, {
              x: nx * sampled.scalar,
              y: ny * sampled.scalar,
              z: nz * sampled.scalar,
            });
          }
          displacement = scaleVec3(displacement, strength);
        } else if (fieldVecs.length > 0) {
          const vec = fieldVecs[i % fieldVecs.length];
          displacement = scaleVec3(vec, strength * falloff);
        } else if (fieldScalars.length > 0) {
          const scalar = fieldScalars[i % fieldScalars.length];
          const nx = normals[i * 3] ?? 0;
          const ny = normals[i * 3 + 1] ?? 0;
          const nz = normals[i * 3 + 2] ?? 0;
          displacement = {
            x: nx * scalar * strength * falloff,
            y: ny * scalar * strength * falloff,
            z: nz * scalar * strength * falloff,
          };
        }
        const moved = addVec3(base, displacement);
        nextPositions[i * 3] = moved.x;
        nextPositions[i * 3 + 1] = moved.y;
        nextPositions[i * 3 + 2] = moved.z;
      }
      const nextNormals = computeVertexNormals(nextPositions, indices);
      const nextMesh = {
        ...existing.mesh,
        positions: nextPositions,
        normals: nextNormals,
        indices: existing.mesh.indices.length > 0 ? existing.mesh.indices : indices,
      };
      const { volume_m3, centroid } = computeMeshVolumeAndCentroid(nextMesh);
      const density = resolveDensity(existing.metadata);
      const mass_kg = density && volume_m3 > 0 ? density * volume_m3 : undefined;
      updates.set(geometryId, {
        mesh: nextMesh,
        area_m2: computeMeshArea(nextPositions, indices),
        volume_m3,
        centroid: centroid ?? undefined,
        mass_kg,
      });
      didApply = true;
      return {
        ...node,
        data: {
          ...node.data,
          fieldTransformGeometryId: geometryId,
          fieldTransformBasePositions: basePositions,
        },
      };
    }

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
    if (source.type === "nurbsCurve") {
      const geometryId = createGeometryId("nurbsCurve");
      const nurbs = {
        ...source.nurbs,
        controlPoints: transformControlPoints(source.nurbs.controlPoints, matrix),
      };
      return {
        geometryId,
        items: [
          {
            id: geometryId,
            type: "nurbsCurve",
            nurbs,
            closed: source.closed,
            layerId,
            area_m2: source.area_m2,
            thickness_m: source.thickness_m,
            metadata: source.metadata,
          },
        ],
      };
    }
    if (source.type === "nurbsSurface") {
      const geometryId = createGeometryId("nurbsSurface");
      const nurbs = {
        ...source.nurbs,
        controlPoints: transformControlPointGrid(source.nurbs.controlPoints, matrix),
      };
      const mesh = source.mesh ? transformMesh(source.mesh, matrix) : undefined;
      const area = mesh ? computeMeshArea(mesh.positions, mesh.indices) : source.area_m2;
      return {
        geometryId,
        items: [
          {
            id: geometryId,
            type: "nurbsSurface",
            nurbs,
            mesh,
            layerId,
            area_m2: area,
            thickness_m: source.thickness_m,
            metadata: source.metadata,
          },
        ],
      };
    }
    if (source.type === "brep") {
      const geometryId = createGeometryId("brep");
      const brep = transformBRepData(source.brep, matrix);
      const mesh = source.mesh ? transformMesh(source.mesh, matrix) : undefined;
      const area = mesh ? computeMeshArea(mesh.positions, mesh.indices) : source.area_m2;
      const volumeAndCentroid = mesh ? computeMeshVolumeAndCentroid(mesh) : null;
      const density = resolveDensity(source.metadata);
      const mass_kg =
        density && volumeAndCentroid && volumeAndCentroid.volume_m3 > 0
          ? density * volumeAndCentroid.volume_m3
          : undefined;
      return {
        geometryId,
        items: [
          {
            id: geometryId,
            type: "brep",
            brep,
            mesh,
            layerId,
            area_m2: area,
            volume_m3: volumeAndCentroid?.volume_m3,
            centroid: volumeAndCentroid?.centroid ?? undefined,
            mass_kg,
            thickness_m: source.thickness_m,
            metadata: source.metadata,
          },
        ],
      };
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
      const volumeAndCentroid = computeMeshVolumeAndCentroid(mesh);
      const density = resolveDensity(source.metadata);
      base.area_m2 = computeMeshArea(mesh.positions, mesh.indices);
      base.volume_m3 = volumeAndCentroid.volume_m3;
      base.centroid = volumeAndCentroid.centroid ?? undefined;
      base.mass_kg =
        density && volumeAndCentroid.volume_m3 > 0
          ? density * volumeAndCentroid.volume_m3
          : undefined;
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
    if (source.type === "nurbsCurve" && target.type === "nurbsCurve") {
      const nurbs = {
        ...source.nurbs,
        controlPoints: transformControlPoints(source.nurbs.controlPoints, matrix),
      };
      updates.set(target.id, { nurbs, closed: source.closed });
      return true;
    }
    if (source.type === "nurbsSurface" && target.type === "nurbsSurface") {
      const nurbs = {
        ...source.nurbs,
        controlPoints: transformControlPointGrid(source.nurbs.controlPoints, matrix),
      };
      const mesh = source.mesh ? transformMesh(source.mesh, matrix) : undefined;
      const area = mesh ? computeMeshArea(mesh.positions, mesh.indices) : target.area_m2;
      updates.set(target.id, { nurbs, mesh, area_m2: area });
      return true;
    }
    if (source.type === "brep" && target.type === "brep") {
      const brep = transformBRepData(source.brep, matrix);
      const mesh = source.mesh ? transformMesh(source.mesh, matrix) : undefined;
      const area = mesh ? computeMeshArea(mesh.positions, mesh.indices) : target.area_m2;
      updates.set(target.id, { brep, mesh, area_m2: area });
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
    const { volume_m3, centroid } = computeMeshVolumeAndCentroid(mesh);
    const density = resolveDensity(existing.metadata);
    const mass_kg = density && volume_m3 > 0 ? density * volume_m3 : undefined;
    updates.set(geometryId, {
      mesh,
      area_m2: computeMeshArea(mesh.positions, mesh.indices),
      volume_m3,
      centroid: centroid ?? undefined,
      mass_kg,
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
    if (
      node.type !== "meshConvert" &&
      node.type !== "nurbsToMesh" &&
      node.type !== "brepToMesh" &&
      node.type !== "meshToBrep"
    ) {
      return node;
    }
    const outputs = node.data?.outputs;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    if (!geometryId) return node;

    if (node.type === "meshToBrep") {
      const brep = outputs?.brep as BRepData | undefined;
      if (!brep) return node;
      const existing = geometryById.get(geometryId);
      if (!existing || existing.type !== "brep") return node;
      const mesh = outputs?.mesh as RenderMesh | undefined;
      const volumeAndCentroid = mesh ? computeMeshVolumeAndCentroid(mesh) : null;
      const density = resolveDensity(existing.metadata);
      const mass_kg =
        density && volumeAndCentroid && volumeAndCentroid.volume_m3 > 0
          ? density * volumeAndCentroid.volume_m3
          : undefined;
      updates.set(geometryId, {
        brep,
        mesh,
        area_m2: mesh ? computeMeshArea(mesh.positions, mesh.indices) : existing.area_m2,
        volume_m3: volumeAndCentroid?.volume_m3,
        centroid: volumeAndCentroid?.centroid ?? undefined,
        mass_kg,
      });
      didApply = true;
      return node;
    }

    const mesh = outputs?.mesh as RenderMesh | undefined;
    if (!mesh) return node;
    const existing = geometryById.get(geometryId);
    if (!existing || !("mesh" in existing)) return node;
    const { volume_m3, centroid } = computeMeshVolumeAndCentroid(mesh);
    const density = resolveDensity(existing.metadata);
    const mass_kg = density && volume_m3 > 0 ? density * volume_m3 : undefined;
    updates.set(geometryId, {
      mesh,
      area_m2: computeMeshArea(mesh.positions, mesh.indices),
      volume_m3,
      centroid: centroid ?? undefined,
      mass_kg,
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

const applyPhysicsSolverNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "physicsSolver") return node;
    const outputs = node.data?.outputs;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    if (!geometryId) return node;
    const mesh = outputs?.mesh as RenderMesh | undefined;
    if (!mesh || !Array.isArray(mesh.positions) || !Array.isArray(mesh.indices)) {
      return node;
    }
    const stressField = Array.isArray(outputs?.stressField)
      ? (outputs?.stressField as number[])
      : [];
    const stressColors =
      stressField.length > 0 ? buildStressVertexColors(mesh, stressField) : null;
    const meshWithColors = stressColors
      ? { ...mesh, colors: stressColors }
      : { ...mesh, colors: undefined };
    const existing = geometryById.get(geometryId);
    if (!existing || !("mesh" in existing)) return node;
    updates.set(geometryId, {
      mesh: meshWithColors,
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

const applyChemistrySolverNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "chemistrySolver") return node;
    const outputs = node.data?.outputs;
    const geometryId =
      typeof outputs?.geometry === "string"
        ? outputs.geometry
        : typeof node.data?.geometryId === "string"
          ? node.data.geometryId
          : null;
    if (!geometryId) return node;
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

const coerceFilePayload = (value: unknown) => {
  if (!value || typeof value !== "object") return null;
  const payload = value as { name?: string; type?: string; data?: string };
  if (typeof payload.data !== "string") return null;
  return payload;
};

const getFileExtension = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === trimmed.length - 1) return "";
  return trimmed.slice(lastDot + 1).toLowerCase();
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
    const geometryId =
      typeof node.data?.geometryId === "string" ? node.data.geometryId : null;
    const file = coerceFilePayload(parameters.file);
    const existing = geometryId ? geometryById.get(geometryId) : null;
    const geometryEmpty =
      existing && "mesh" in existing
        ? !existing.mesh?.positions || existing.mesh.positions.length === 0
        : false;
    const importNow = parameters.importNow === true || (Boolean(file) && geometryEmpty);
    if (!importNow) return node;
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
      if (existing && "mesh" in existing) {
        const fileName = typeof file.name === "string" ? file.name : "";
        const mimeType = typeof file.type === "string" ? file.type : "";
        const extension =
          getFileExtension(fileName) ||
          (mimeType.includes("/") ? mimeType.split("/")[1].toLowerCase() : "") ||
          "stl";
        const metadata = {
          ...(existing.metadata ?? {}),
          sourceFile: {
            name: fileName,
            type: mimeType,
            extension,
          },
        };
        updates.set(geometryId, {
          mesh,
          area_m2: computeMeshArea(mesh.positions, mesh.indices),
          metadata,
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
  if (trimmed.length === 0) return `lingua-export${extension}`;
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
    const fileNameBase = String(parameters.fileName ?? "lingua-export");

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
    case "nurbsCurve": {
      const normalized: NurbsCurveGeometry = {
        id: item.id,
        type: "nurbsCurve",
        nurbs: item.nurbs,
        closed: item.closed,
        layerId,
        area_m2: item.area_m2,
        thickness_m: item.thickness_m,
      };
      return normalized;
    }
    case "nurbsSurface": {
      const normalized: NurbsSurfaceGeometry = {
        id: item.id,
        type: "nurbsSurface",
        nurbs: item.nurbs,
        mesh: item.mesh,
        layerId,
        area_m2: item.area_m2,
        thickness_m: item.thickness_m,
      };
      return normalized;
    }
    case "brep": {
      const normalized: BRepGeometry = {
        id: item.id,
        type: "brep",
        brep: item.brep,
        mesh: item.mesh,
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
  showMoveArms: true,
  gumballStep: defaultGumballStep,
  gumballSettings: defaultGumballSettings,
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
    const selectGeometryIds = (ids: string[]) => {
      if (!Array.isArray(ids) || ids.length === 0) return false;
      const geometryIdSet = new Set(get().geometry.map((item) => item.id));
      const unique = Array.from(new Set(ids)).filter((id) => geometryIdSet.has(id));
      if (unique.length === 0) return false;
      get().setSelectedGeometryIds(unique);
      return true;
    };
    const collectGeometryIds = (value: unknown, bucket: string[]) => {
      if (typeof value === "string") {
        bucket.push(value);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((entry) => collectGeometryIds(entry, bucket));
      }
    };
    const selectFromValue = (value: unknown) => {
      const ids: string[] = [];
      collectGeometryIds(value, ids);
      return selectGeometryIds(ids);
    };
    const trySelectFromNode = (candidate: WorkflowNode) => {
      if (!candidate) return false;
      const outputs = candidate.data?.outputs ?? null;
      const definition = getNodeDefinition(candidate.type);
      const parameters = resolveNodeParameters(candidate);
      const ports = resolveNodePorts(candidate, parameters);
      const geometryOutputKey =
        definition?.primaryOutputKey &&
        ports.outputs.some(
          (port) => port.key === definition.primaryOutputKey && port.type === "geometry"
        )
          ? definition.primaryOutputKey
          : ports.outputs.find((port) => port.type === "geometry")?.key;
      const outputValue = geometryOutputKey && outputs ? outputs[geometryOutputKey] : null;

      if (selectFromValue(outputValue)) return true;
      if (outputs) {
        if (selectFromValue((outputs as Record<string, unknown>).geometryList)) return true;
        if (selectFromValue((outputs as Record<string, unknown>).geometryIds)) return true;
      }
      if (selectIfExists(candidate.data?.geometryId)) return true;
      const geometryIds = Array.isArray(candidate.data?.geometryIds)
        ? candidate.data.geometryIds
        : [];
      if (selectGeometryIds(geometryIds)) return true;
      return false;
    };
    if (node.type === "pointCloud") {
      const geometryIds = Array.isArray(node.data?.geometryIds) ? node.data.geometryIds : [];
      if (selectGeometryIds(geometryIds)) {
        return;
      }
    }
    const outputParams = node.data?.outputs;
    const primitiveKind =
      node.type === "primitive" && typeof outputParams?.kind === "string"
        ? (outputParams.kind as PrimitiveKind)
        : resolvePrimitiveKindForNode(node.type as NodeType, node.data?.parameters);
    if (primitiveKind) {
      const parameters = node.data?.parameters;
      const paramValues =
        outputParams?.params && typeof outputParams.params === "object"
          ? (outputParams.params as Record<string, number>)
          : null;
      const resolved = paramValues
        ? ({ kind: primitiveKind, ...paramValues } as Parameters<typeof generatePrimitiveMesh>[0])
        : resolvePrimitiveConfig(parameters, { kind: primitiveKind });
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
      const params = node.data?.parameters ?? {};
      const outputs = node.data?.outputs ?? {};
      const width = asNumber(outputs.width ?? params.boxWidth, node.data?.boxDimensions?.width ?? 1);
      const height = asNumber(outputs.height ?? params.boxHeight, node.data?.boxDimensions?.height ?? 1);
      const depth = asNumber(outputs.depth ?? params.boxDepth, node.data?.boxDimensions?.depth ?? 1);
      if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(depth)) return;
      const anchor = readVec3Parameter(
        params,
        "boxOrigin",
        node.data?.boxOrigin ?? { x: 0, y: 0, z: 0 }
      );
      const centerMode = Boolean(outputs.centerMode ?? params.centerMode);
      const origin = centerMode
        ? anchor
        : { x: anchor.x + width * 0.5, y: anchor.y + height * 0.5, z: anchor.z + depth * 0.5 };
      const geometryId = get().addGeometryBox({
        size: { width, height, depth },
        origin,
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
      const params = node.data?.parameters ?? {};
      const outputs = node.data?.outputs ?? {};
      const radius = asNumber(outputs.radius ?? params.sphereRadius, node.data?.sphereRadius ?? 0.5);
      if (!Number.isFinite(radius)) return;
      const origin = readVec3Parameter(
        params,
        "sphereCenter",
        node.data?.sphereOrigin ?? { x: 0, y: 0, z: 0 }
      );
      const geometryId = get().addGeometrySphere({
        radius,
        origin,
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
    if (node.type === "surface") {
      const outputs = node.data?.outputs ?? {};
      const geometryId =
        typeof outputs.geometry === "string"
          ? outputs.geometry
          : typeof node.data?.geometryId === "string"
            ? node.data.geometryId
            : null;
      if (selectIfExists(geometryId)) return;
      const points = Array.isArray(outputs.points)
        ? (outputs.points as unknown[])
            .map((entry) => asVec3(entry))
            .filter((entry): entry is Vec3 => Boolean(entry))
        : [];
      if (points.length < 3) return;
      const vertexIds = points.map(() => createGeometryId("vertex"));
      const layerId = get().layers[0]?.id ?? "layer-default";
      const vertexItems: Geometry[] = points.map((point, index) => ({
        id: vertexIds[index],
        type: "vertex",
        position: point,
        layerId,
        area_m2: 1,
        thickness_m: 0.1,
      }));
      const { mesh, plane } = generateSurfaceMesh([points]);
      const surfaceId = geometryId ?? createGeometryId("surface");
      const surfaceItem: Geometry = {
        id: surfaceId,
        type: "surface",
        mesh,
        loops: [vertexIds],
        plane,
        layerId,
        sourceNodeId: nodeId,
        metadata: { label: node.data?.label ?? "Surface" },
      };
      get().addGeometryItems([...vertexItems, surfaceItem], {
        selectIds: [surfaceId],
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
                    geometryType: "surface",
                    vertexIds,
                    isLinked: true,
                  },
                }
              : entry
          ),
        },
      }));
      selectIfExists(surfaceId);
      get().recalculateWorkflow();
      return;
    }
    if (node.type === "loft") {
      const outputs = node.data?.outputs ?? {};
      const mesh = outputs.mesh as RenderMesh | undefined;
      if (!mesh || mesh.positions.length < 3) return;
      const sectionIds = Array.isArray(outputs.sectionIds)
        ? outputs.sectionIds.filter((entry): entry is string => typeof entry === "string")
        : [];
      const degreeRaw = asNumber(outputs.degree, asNumber(node.data?.parameters?.degree, 3));
      const degree = Math.min(3, Math.max(1, Math.round(degreeRaw))) as 1 | 2 | 3;
      const closed =
        typeof outputs.closed === "boolean"
          ? outputs.closed
          : Boolean(node.data?.parameters?.closed);
      const sectionClosed =
        typeof outputs.sectionClosed === "boolean"
          ? outputs.sectionClosed
          : typeof node.data?.parameters?.sectionClosed === "boolean"
            ? node.data.parameters.sectionClosed
            : undefined;
      const samplesValue = asNumber(outputs.samples, asNumber(node.data?.parameters?.samples, Number.NaN));
      const geometryId = get().addGeometryLoft(mesh, sectionIds, {
        degree,
        closed,
        geometryId: node.data?.geometryId,
        sourceNodeId: nodeId,
        metadata: {
          label: node.data?.label ?? "Loft",
          sectionClosed,
          samples: Number.isFinite(samplesValue) ? samplesValue : undefined,
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
                    geometryType: "loft",
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
    if (node.type === "extrude") {
      const outputs = node.data?.outputs ?? {};
      const mesh = outputs.mesh as RenderMesh | undefined;
      if (!mesh || mesh.positions.length < 3) return;
      const profileIds = Array.isArray(outputs.profileIds)
        ? outputs.profileIds.filter((entry): entry is string => typeof entry === "string")
        : [];
      const distance = asNumber(outputs.distance, asNumber(node.data?.parameters?.distance, 0));
      const direction = asVec3(outputs.direction) ?? { x: 0, y: 1, z: 0 };
      const capped =
        typeof outputs.capped === "boolean"
          ? outputs.capped
          : typeof node.data?.parameters?.capped === "boolean"
            ? node.data.parameters.capped
            : true;
      const geometryId = get().addGeometryExtrude(mesh, profileIds, {
        distance,
        direction,
        capped,
        geometryId: node.data?.geometryId,
        sourceNodeId: nodeId,
        metadata: {
          label: node.data?.label ?? "Extrude",
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
                    geometryType: "extrude",
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
    if (node.type === "pipeSweep" || node.type === "pipeMerge") {
      const outputs = node.data?.outputs ?? {};
      const mesh = outputs.mesh as RenderMesh | undefined;
      if (!mesh || mesh.positions.length < 3) return;
      const metadata: Record<string, unknown> = {
        label: node.data?.label ?? (node.type === "pipeSweep" ? "Pipe" : "Pipe Merge"),
      };
      if (node.type === "pipeSweep") {
        metadata.pipe = {
          segmentCount: asNumber(outputs.segmentCount, 0),
          jointCount: asNumber(outputs.jointCount, 0),
          joints: Array.isArray(outputs.joints)
            ? (outputs.joints as unknown[])
                .map((entry) => asVec3(entry))
                .filter((entry): entry is Vec3 => Boolean(entry))
            : [],
          sourceGeometryIds: Array.isArray(outputs.sourceGeometryIds)
            ? outputs.sourceGeometryIds.filter((entry): entry is string => typeof entry === "string")
            : [],
        };
      } else {
        metadata.pipe = {
          pipeCount: asNumber(outputs.pipeCount, 0),
          jointCount: asNumber(outputs.jointCount, 0),
          sourceGeometryIds: Array.isArray(outputs.sourceGeometryIds)
            ? outputs.sourceGeometryIds.filter((entry): entry is string => typeof entry === "string")
            : [],
        };
      }
      const geometryId = get().addGeometryMesh(mesh, {
        geometryId: node.data?.geometryId,
        sourceNodeId: nodeId,
        recordHistory: true,
        metadata,
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
    
    if (node.type === "chemistrySolver") {
      const outputsRaw = node.data?.outputs;
      if (!outputsRaw || typeof outputsRaw !== "object") {
        if (import.meta.env.DEV) {
          console.warn("Chemistry solver produced invalid outputs payload", {
            nodeId,
            outputsRaw,
          });
        }
        return;
      }
      const outputs = outputsRaw as Record<string, unknown>;
      const meshCandidate = outputs.mesh;
      if (!meshCandidate || typeof meshCandidate !== "object") return;
      const mesh = meshCandidate as RenderMesh;
      const positions = (mesh as any).positions as { length?: unknown } | undefined;
      if (!positions || typeof positions.length !== "number" || positions.length < 3) return;
      
      const materials = Array.isArray(outputs.materials) ? outputs.materials : [];
      const materialParticles = Array.isArray(outputs.materialParticles)
        ? outputs.materialParticles
        : [];
      const materialField =
        outputs.materialField && typeof outputs.materialField === "object"
          ? (outputs.materialField as Record<string, unknown>)
          : undefined;
      const history = Array.isArray(outputs.history) ? outputs.history : [];
      const diagnostics =
        outputs.diagnostics && typeof outputs.diagnostics === "object"
          ? (outputs.diagnostics as Record<string, unknown>)
          : undefined;
      const chemistryWarnings: string[] = [];
      const rawTotalEnergy = outputs.totalEnergy;
      const totalEnergy = asNumber(rawTotalEnergy, 0);
      if (
        rawTotalEnergy !== undefined &&
        typeof rawTotalEnergy !== "number"
      ) {
        chemistryWarnings.push("totalEnergy was non-numeric; defaulted to 0");
      }
      if (
        import.meta.env.DEV &&
        rawTotalEnergy !== undefined &&
        typeof rawTotalEnergy !== "number"
      ) {
        console.warn("Chemistry solver totalEnergy was non-numeric, defaulting to 0", {
          nodeId,
          rawTotalEnergy,
        });
      }
      const status = typeof outputs.status === "string" ? outputs.status : "unknown";
      const diagnosticsIterations = diagnostics?.iterations;
      const iterationsUsed =
        typeof diagnosticsIterations === "number" &&
        Number.isFinite(diagnosticsIterations) &&
        diagnosticsIterations > 0
          ? diagnosticsIterations
          : history.length;

      let exampleScript: string | undefined;
      let exampleScriptError: string | undefined;
      let exampleSummary: { fieldResolution: { x: number; y: number; z: number } } | undefined;
      try {
        const result = buildChemistrySolverExampleScript(outputs);
        exampleSummary = result.summary;
        exampleScript = result.script.trim().length > 0 ? result.script : undefined;
      } catch (error) {
        exampleScriptError = error instanceof Error ? error.message : String(error);
        if (import.meta.env.DEV) {
          console.warn("Chemistry example script generation failed", error);
        }
      }

      const fallbackResolution = (() => {
        if (!materialField || typeof materialField !== "object") {
          return { x: 0, y: 0, z: 0 };
        }
        const resolution = (materialField as { resolution?: unknown }).resolution;
        if (!resolution || typeof resolution !== "object") {
          return { x: 0, y: 0, z: 0 };
        }
        const raw = resolution as Record<string, unknown>;
        const x = raw.x;
        const y = raw.y;
        const z = raw.z;
        if (
          typeof x === "number" &&
          Number.isFinite(x) &&
          typeof y === "number" &&
          Number.isFinite(y) &&
          typeof z === "number" &&
          Number.isFinite(z)
        ) {
          return { x, y, z };
        }
        return { x: 0, y: 0, z: 0 };
      })();
      const fieldResolution = exampleSummary?.fieldResolution ?? fallbackResolution;
      
      const metadata: Record<string, unknown> = {
        label: node.data?.label ?? "Chemistry Solver Result",
        chemistryResult: {
          materials,
          particleCount: materialParticles.length,
          fieldResolution,
          totalEnergy,
          status,
          iterations: iterationsUsed,
          hasColors: Boolean(mesh.colors && mesh.colors.length > 0),
          ...(exampleScript ? { exampleScript } : {}),
          ...(exampleScriptError ? { exampleScriptError } : {}),
          ...(exampleSummary ? { exampleSummary } : {}),
          ...(chemistryWarnings.length ? { warnings: chemistryWarnings } : {}),
        },
      };
      
      const geometryId = get().addGeometryMesh(mesh, {
        geometryId: node.data?.geometryId,
        sourceNodeId: nodeId,
        recordHistory: true,
        metadata,
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
    
    if (node.type === "physicsSolver") {
      const outputs = node.data?.outputs ?? {};
      const mesh = outputs.mesh as RenderMesh | undefined;
      if (!mesh || mesh.positions.length < 3) return;
      
      const stressField = outputs.stressField as any[] | undefined;
      const displacements = outputs.displacements as any[] | undefined;
      const diagnostics = outputs.diagnostics as any | undefined;
      const result = outputs.result as any | undefined;
      
      const metadata: Record<string, unknown> = {
        label: node.data?.label ?? "Physics Solver Result",
        physicsResult: {
          hasStressField: Boolean(stressField && Array.isArray(stressField) && stressField.length > 0),
          hasDisplacements: Boolean(displacements && Array.isArray(displacements) && displacements.length > 0),
          hasColors: Boolean(mesh.colors && mesh.colors.length > 0),
          analysisType: result?.analysisType ?? "static",
          maxDeformation: result?.maxDeformation ?? 0,
          maxStress: result?.maxStress ?? 0,
          iterations: diagnostics?.iterations ?? 0,
        },
      };
      
      const geometryId = get().addGeometryMesh(mesh, {
        geometryId: node.data?.geometryId,
        sourceNodeId: nodeId,
        recordHistory: true,
        metadata,
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

    if (trySelectFromNode(node)) {
      return;
    }

    get().recalculateWorkflow();

    const refreshed = get().workflow.nodes.find((entry) => entry.id === nodeId);
    if (!refreshed) return;
    if (trySelectFromNode(refreshed)) {
      return;
    }
  },
  addGeometryReferenceNode: (geometryId) => {
    const resolvedGeometryId =
      geometryId ??
      get().selectedGeometryIds[get().selectedGeometryIds.length - 1] ??
      get().geometry[0]?.id;
    if (!resolvedGeometryId) return null;
    const selected = get().geometry.find((item) => item.id === resolvedGeometryId);
    if (!selected) return null;
    const existing = get().workflow.nodes.some(
      (node) =>
        node.type === "geometryReference" && node.data?.geometryId === resolvedGeometryId
    );
    if (existing) return null;
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
    return id;
  },
  addPhysicsSolverRig: (position) => {
    /**
     * Physics Solver Test Rig: Cantilevered Canopy Scenario
     * 
     * Creates a complete analysis setup:
     * - Geometry Reference → connects Roslyn mesh to baseMesh
     * - Anchor Goal (Ἄγκυρα) → fixed supports at one end (required)
     * - Load Goal (Βάρος) → gravitational/wind forces on canopy
     * - Volume Goal (Ὄγκος) → material budget (required with Load)
     * - Stiffness Goal (Σκληρότης) → structural steel properties
     * - Physics Solver (Ἐπιλύτης Φυσικῆς) → equilibrium analysis (Kd = F)
     * - Geometry Viewer → visualize deformed result
     */
    const ts = Date.now();
    const NODE_WIDTH = 200;
    const NODE_HEIGHT = 120;
    const H_GAP = 60;
    const V_GAP = 40;

    // Column 0: Solver parameter nodes
    const maxIterationsId = `node-number-maxIterations-${ts}`;
    const maxIterationsPos = { x: position.x, y: position.y - (NODE_HEIGHT + V_GAP) * 2 };

    const convergenceId = `node-number-convergence-${ts}`;
    const convergencePos = { x: position.x, y: position.y - (NODE_HEIGHT + V_GAP) };

    const useGPUId = `node-toggleSwitch-useGPU-${ts}`;
    const useGPUPos = { x: position.x + NODE_WIDTH + H_GAP, y: position.y - (NODE_HEIGHT + V_GAP) * 2 };

    const chunkSizeId = `node-number-chunkSize-${ts}`;
    const chunkSizePos = { x: position.x + NODE_WIDTH + H_GAP, y: position.y - (NODE_HEIGHT + V_GAP) };

    // Column 1: Geometry Reference
    const geoRefId = `node-geometryReference-${ts}`;
    const geoRefPos = { x: position.x, y: position.y };

    // Column 2: Goal nodes (stacked vertically)
    const col2X = position.x + NODE_WIDTH + H_GAP;
    const anchorId = `node-anchorGoal-${ts}`;
    const anchorPos = { x: col2X, y: position.y };

    const loadId = `node-loadGoal-${ts}`;
    const loadPos = { x: col2X, y: position.y + NODE_HEIGHT + V_GAP };

    const volumeId = `node-volumeGoal-${ts}`;
    const volumePos = { x: col2X, y: position.y + (NODE_HEIGHT + V_GAP) * 2 };

    const stiffnessId = `node-stiffnessGoal-${ts}`;
    const stiffnessPos = { x: col2X, y: position.y + (NODE_HEIGHT + V_GAP) * 3 };

    // Column 3: Physics Solver
    const solverId = `node-physicsSolver-${ts}`;
    const solverPos = { x: col2X + NODE_WIDTH + H_GAP, y: position.y + NODE_HEIGHT };
    const solverGeometryId = createGeometryId("mesh");

    // Column 4: Geometry Viewer
    const viewerId = `node-geometryViewer-${ts}`;
    const viewerPos = { x: col2X + (NODE_WIDTH + H_GAP) * 2, y: position.y + NODE_HEIGHT };

    const baseGeometryId =
      get().selectedGeometryIds[0] ?? get().geometry[0]?.id ?? null;
    const baseGeometry = baseGeometryId
      ? get().geometry.find((item) => item.id === baseGeometryId)
      : null;
    const baseLabel =
      baseGeometry &&
      typeof (baseGeometry.metadata as { label?: unknown } | undefined)?.label === "string"
        ? ((baseGeometry.metadata as { label?: unknown }).label as string)
        : null;
    const baseMesh = baseGeometry ? resolveGeometryMesh(baseGeometry) : null;
    const axisIndex = (axis: "x" | "y" | "z") => (axis === "x" ? 0 : axis === "y" ? 1 : 2);
    const findIndicesAtExtent = (
      mesh: RenderMesh,
      axis: "x" | "y" | "z",
      mode: "min" | "max"
    ) => {
      const axisOffset = axisIndex(axis);
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      for (let i = 0; i < mesh.positions.length; i += 3) {
        const value = mesh.positions[i + axisOffset];
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
      if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
      const target = mode === "min" ? min : max;
      const epsilon = Math.max(1e-6, Math.abs(max - min) * 0.01);
      const indices: number[] = [];
      const count = Math.floor(mesh.positions.length / 3);
      for (let i = 0; i < count; i += 1) {
        const value = mesh.positions[i * 3 + axisOffset];
        if (Math.abs(value - target) <= epsilon) indices.push(i);
      }
      return indices;
    };
    const anchorIndices = baseMesh ? findIndicesAtExtent(baseMesh, "y", "min") : [];
    const loadIndices = baseMesh ? findIndicesAtExtent(baseMesh, "y", "max") : [];
    const listColX = col2X - NODE_WIDTH - H_GAP * 0.5;
    const anchorListId = `node-listCreate-anchor-${ts}`;
    const anchorListPos = { x: listColX, y: anchorPos.y };
    const loadListId = `node-listCreate-load-${ts}`;
    const loadListPos = { x: listColX, y: loadPos.y };

    const newNodes = [
      // Parameter nodes
      {
        id: maxIterationsId,
        type: "number" as const,
        position: maxIterationsPos,
        data: {
          label: "Max Iterations",
          parameters: { value: 1000 },
        },
      },
      {
        id: convergenceId,
        type: "number" as const,
        position: convergencePos,
        data: {
          label: "Convergence",
          parameters: { value: 0.000001 },
        },
      },
      {
        id: useGPUId,
        type: "toggleSwitch" as const,
        position: useGPUPos,
        data: {
          label: "Use GPU",
          parameters: { value: true },
        },
      },
      {
        id: chunkSizeId,
        type: "number" as const,
        position: chunkSizePos,
        data: {
          label: "Chunk Size",
          parameters: { value: 1000 },
        },
      },
      {
        id: geoRefId,
        type: "geometryReference" as const,
        position: geoRefPos,
        data: {
          label: baseLabel ?? "Canopy Mesh",
          geometryId: baseGeometryId ?? undefined,
          geometryType: baseGeometry?.type,
          isLinked: Boolean(baseGeometryId),
        },
      },
      {
        id: anchorListId,
        type: "listCreate" as const,
        position: anchorListPos,
        data: {
          label: "Anchor Vertices",
          parameters: {
            itemsText: anchorIndices.join(", "),
          },
        },
      },
      {
        id: anchorId,
        type: "anchorGoal" as const,
        position: anchorPos,
        data: {
          label: "Fixed Supports",
          parameters: {
            anchorType: "fixed",
            fixX: true,
            fixY: true,
            fixZ: true,
            weight: 1.0,
          },
        },
      },
      {
        id: loadListId,
        type: "listCreate" as const,
        position: loadListPos,
        data: {
          label: "Load Vertices",
          parameters: {
            itemsText: loadIndices.join(", "),
          },
        },
      },
      {
        id: loadId,
        type: "loadGoal" as const,
        position: loadPos,
        data: {
          label: "Gravity + Wind",
          parameters: {
            forceX: 0,
            forceY: 0,
            forceZ: -5000, // Downward gravity load (N)
            distributed: true,
            loadType: "static",
            weight: 1.0,
          },
        },
      },
      {
        id: volumeId,
        type: "volumeGoal" as const,
        position: volumePos,
        data: {
          label: "Material Budget",
          parameters: {
            materialDensity: 7850, // Steel (kg/m³)
            allowedDeviation: 0.05,
            weight: 0.8,
          },
        },
      },
      {
        id: stiffnessId,
        type: "stiffnessGoal" as const,
        position: stiffnessPos,
        data: {
          label: "Steel Properties",
          parameters: {
            youngModulus: 200e9, // Steel E = 200 GPa
            poissonRatio: 0.3,
            weight: 1.0,
          },
        },
      },
      {
        id: solverId,
        type: "physicsSolver" as const,
        position: solverPos,
        data: {
          label: "Ἐπιλύτης Φυσικῆς",
          geometryId: solverGeometryId,
          geometryType: "mesh",
          isLinked: true,
          parameters: {
            analysisType: "static",
            maxDeformation: 10,
            maxStress: 1e9,
          },
        },
      },
      {
        id: viewerId,
        type: "geometryViewer" as const,
        position: viewerPos,
        data: { label: "Result Preview" },
      },
    ];

    // Wire connections: parameters → solver, goals → solver, geometry → baseMesh, solver → viewer
    const newEdges = [
      // Max Iterations → Physics Solver
      {
        id: `edge-${maxIterationsId}-${solverId}-maxIterations`,
        source: maxIterationsId,
        sourceHandle: "value",
        target: solverId,
        targetHandle: "maxIterations",
      },
      // Convergence → Physics Solver
      {
        id: `edge-${convergenceId}-${solverId}-convergence`,
        source: convergenceId,
        sourceHandle: "value",
        target: solverId,
        targetHandle: "convergenceTolerance",
      },
      // Use GPU → Physics Solver
      {
        id: `edge-${useGPUId}-${solverId}-useGPU`,
        source: useGPUId,
        sourceHandle: "value",
        target: solverId,
        targetHandle: "useGPU",
      },
      // Chunk Size → Physics Solver
      {
        id: `edge-${chunkSizeId}-${solverId}-chunkSize`,
        source: chunkSizeId,
        sourceHandle: "value",
        target: solverId,
        targetHandle: "chunkSize",
      },
      // Geometry Reference → Physics Solver (baseMesh)
      {
        id: `edge-${geoRefId}-${solverId}-baseMesh`,
        source: geoRefId,
        sourceHandle: "geometry",
        target: solverId,
        targetHandle: "baseMesh",
      },
      // Anchor Goal → Physics Solver (goals)
      {
        id: `edge-${anchorId}-${solverId}`,
        source: anchorId,
        sourceHandle: "goal",
        target: solverId,
        targetHandle: "goals",
      },
      // Anchor Vertices → Anchor Goal (vertices)
      {
        id: `edge-${anchorListId}-${anchorId}-vertices`,
        source: anchorListId,
        sourceHandle: "list",
        target: anchorId,
        targetHandle: "vertices",
      },
      // Load Goal → Physics Solver (goals)
      {
        id: `edge-${loadId}-${solverId}`,
        source: loadId,
        sourceHandle: "goal",
        target: solverId,
        targetHandle: "goals",
      },
      // Load Vertices → Load Goal (application points)
      {
        id: `edge-${loadListId}-${loadId}-applicationPoints`,
        source: loadListId,
        sourceHandle: "list",
        target: loadId,
        targetHandle: "applicationPoints",
      },
      // Volume Goal → Physics Solver (goals)
      {
        id: `edge-${volumeId}-${solverId}`,
        source: volumeId,
        sourceHandle: "goal",
        target: solverId,
        targetHandle: "goals",
      },
      // Stiffness Goal → Physics Solver (goals)
      {
        id: `edge-${stiffnessId}-${solverId}`,
        source: stiffnessId,
        sourceHandle: "goal",
        target: solverId,
        targetHandle: "goals",
      },
      // Physics Solver → Geometry Viewer
      {
        id: `edge-${solverId}-${viewerId}`,
        source: solverId,
        sourceHandle: "geometry",
        target: viewerId,
        targetHandle: "geometry",
      },
    ];

    const emptyMesh: RenderMesh = { positions: [], normals: [], uvs: [], indices: [] };
    const solverGeometry: Geometry = {
      id: solverGeometryId,
      type: "mesh",
      mesh: emptyMesh,
      layerId: "layer-default",
      sourceNodeId: solverId,
      metadata: {
        label: "Physics Solver Output",
      },
    };
    get().addGeometryItems([solverGeometry], {
      selectIds: get().selectedGeometryIds,
      recordHistory: true,
    });

    set((state) => ({
      workflowHistory: appendWorkflowHistory(state.workflowHistory, state.workflow),
      workflow: {
        ...state.workflow,
        nodes: [...state.workflow.nodes, ...newNodes],
        edges: [...state.workflow.edges, ...newEdges],
      },
    }));
    get().recalculateWorkflow();
  },
  addBiologicalSolverRig: (position) => {
    /**
     * Biological Solver Test Rig: Pavilion Canopy Optimization
     *
     * Creates a complete evolutionary optimization setup:
     * - Sliders (5 genes) → Genome Collector → Biological Solver
     * - Box geometry → Geometry Phenotype → Biological Solver
     * - Measurement nodes → Performs Fitness → Biological Solver
     * - Biology goals (morphogenesis, homeostasis) → Biological Solver
     *
     * Demonstrates optimization of canopy dimensions for max area, min material.
     */
    const ts = Date.now();
    const NODE_WIDTH = 180;
    const NODE_HEIGHT = 100;
    const H_GAP = 50;
    const V_GAP = 30;

    // Column 1: Sliders (genes for the genome)
    const slider1Id = `node-slider-width-${ts}`;
    const slider1Pos = { x: position.x, y: position.y };

    const slider2Id = `node-slider-depth-${ts}`;
    const slider2Pos = { x: position.x, y: position.y + NODE_HEIGHT + V_GAP };

    const slider3Id = `node-slider-height-${ts}`;
    const slider3Pos = { x: position.x, y: position.y + (NODE_HEIGHT + V_GAP) * 2 };

    const slider4Id = `node-slider-edge-${ts}`;
    const slider4Pos = { x: position.x, y: position.y + (NODE_HEIGHT + V_GAP) * 3 };

    const slider5Id = `node-slider-subdiv-${ts}`;
    const slider5Pos = { x: position.x, y: position.y + (NODE_HEIGHT + V_GAP) * 4 };

    // Column 2: Genome Collector + Box geometry
    const col2X = position.x + NODE_WIDTH + H_GAP;
    const genomeCollectorId = `node-genomeCollector-${ts}`;
    const genomeCollectorPos = { x: col2X, y: position.y + NODE_HEIGHT };

    const boxId = `node-box-${ts}`;
    const boxPos = { x: col2X, y: position.y + (NODE_HEIGHT + V_GAP) * 3 };

    // Column 3: Geometry Phenotype + Measurement nodes + Biology goals
    const col3X = col2X + NODE_WIDTH + H_GAP;
    const geometryPhenotypeId = `node-geometryPhenotype-${ts}`;
    const geometryPhenotypePos = { x: col3X, y: position.y + (NODE_HEIGHT + V_GAP) * 3 };

    const measureAreaId = `node-measurement-area-${ts}`;
    const measureAreaPos = { x: col3X, y: position.y };

    const measureVolumeId = `node-measurement-volume-${ts}`;
    const measureVolumePos = { x: col3X, y: position.y + NODE_HEIGHT + V_GAP };

    const morphogenesisId = `node-morphogenesisGoal-${ts}`;
    const morphogenesisPos = { x: col3X, y: position.y + (NODE_HEIGHT + V_GAP) * 5 };

    const homeostasisId = `node-homeostasisGoal-${ts}`;
    const homeostasisPos = { x: col3X, y: position.y + (NODE_HEIGHT + V_GAP) * 6 };

    // Column 4: Performs Fitness
    const col4X = col3X + NODE_WIDTH + H_GAP;
    const performsFitnessId = `node-performsFitness-${ts}`;
    const performsFitnessPos = { x: col4X, y: position.y + NODE_HEIGHT / 2 };

    // Column 5: Biological Solver
    const col5X = col4X + NODE_WIDTH + H_GAP;
    const solverId = `node-biologicalSolver-${ts}`;
    const solverPos = { x: col5X, y: position.y + NODE_HEIGHT * 2 };

    const newNodes = [
      // Sliders (genome genes)
      {
        id: slider1Id,
        type: "slider" as const,
        position: slider1Pos,
        data: {
          label: "Canopy Width",
          parameters: {
            min: 6,
            max: 14,
            step: 0.5,
            defaultValue: 10,
          },
        },
      },
      {
        id: slider2Id,
        type: "slider" as const,
        position: slider2Pos,
        data: {
          label: "Canopy Depth",
          parameters: {
            min: 4,
            max: 10,
            step: 0.5,
            defaultValue: 7,
          },
        },
      },
      {
        id: slider3Id,
        type: "slider" as const,
        position: slider3Pos,
        data: {
          label: "Peak Height",
          parameters: {
            min: 2.5,
            max: 5,
            step: 0.1,
            defaultValue: 3.5,
          },
        },
      },
      {
        id: slider4Id,
        type: "slider" as const,
        position: slider4Pos,
        data: {
          label: "Edge Drop",
          parameters: {
            min: 0.3,
            max: 1.5,
            step: 0.1,
            defaultValue: 0.8,
          },
        },
      },
      {
        id: slider5Id,
        type: "slider" as const,
        position: slider5Pos,
        data: {
          label: "Subdivisions",
          parameters: {
            min: 2,
            max: 6,
            step: 1,
            defaultValue: 3,
          },
        },
      },
      // Genome Collector
      {
        id: genomeCollectorId,
        type: "genomeCollector" as const,
        position: genomeCollectorPos,
        data: { label: "Genome Collector" },
      },
      // Box geometry (parametric canopy base)
      {
        id: boxId,
        type: "box" as const,
        position: boxPos,
        data: {
          label: "Canopy Box",
          parameters: {
            width: 10,
            height: 0.2,
            depth: 7,
            centerMode: true,
          },
        },
      },
      // Geometry Phenotype
      {
        id: geometryPhenotypeId,
        type: "geometryPhenotype" as const,
        position: geometryPhenotypePos,
        data: { label: "Geometry Phenotype" },
      },
      // Measurement nodes for fitness
      {
        id: measureAreaId,
        type: "measurement" as const,
        position: measureAreaPos,
        data: {
          label: "Measure Area",
          parameters: { property: "area" },
        },
      },
      {
        id: measureVolumeId,
        type: "measurement" as const,
        position: measureVolumePos,
        data: {
          label: "Measure Volume",
          parameters: { property: "volume" },
        },
      },
      // Performs Fitness
      {
        id: performsFitnessId,
        type: "performsFitness" as const,
        position: performsFitnessPos,
        data: {
          label: "Performs Fitness",
          parameters: {
            defaultMode: "maximize",
            defaultWeight: 1,
          },
        },
      },
      // Biology goals
      {
        id: morphogenesisId,
        type: "morphogenesisGoal" as const,
        position: morphogenesisPos,
        data: {
          label: "Morphogenesis",
          parameters: {
            branchingFactor: 0.5,
            patternScale: 1,
            anisotropy: 0.2,
            weight: 0.6,
          },
        },
      },
      {
        id: homeostasisId,
        type: "homeostasisGoal" as const,
        position: homeostasisPos,
        data: {
          label: "Homeostasis",
          parameters: {
            stabilityTarget: 0.7,
            damping: 0.5,
            stressLimit: 1.5,
            weight: 0.4,
          },
        },
      },
      // Biological Solver
      {
        id: solverId,
        type: "biologicalSolver" as const,
        position: solverPos,
        data: {
          label: "Biological Solver",
          parameters: {
            populationSize: 32,
            generations: 24,
            mutationRate: 0.18,
            seed: 42,
          },
        },
      },
    ];

    // Wire connections
    const newEdges = [
      // Sliders → Genome Collector (sliders input, multi)
      {
        id: `edge-${slider1Id}-${genomeCollectorId}`,
        source: slider1Id,
        sourceHandle: "value",
        target: genomeCollectorId,
        targetHandle: "sliders",
      },
      {
        id: `edge-${slider2Id}-${genomeCollectorId}`,
        source: slider2Id,
        sourceHandle: "value",
        target: genomeCollectorId,
        targetHandle: "sliders",
      },
      {
        id: `edge-${slider3Id}-${genomeCollectorId}`,
        source: slider3Id,
        sourceHandle: "value",
        target: genomeCollectorId,
        targetHandle: "sliders",
      },
      {
        id: `edge-${slider4Id}-${genomeCollectorId}`,
        source: slider4Id,
        sourceHandle: "value",
        target: genomeCollectorId,
        targetHandle: "sliders",
      },
      {
        id: `edge-${slider5Id}-${genomeCollectorId}`,
        source: slider5Id,
        sourceHandle: "value",
        target: genomeCollectorId,
        targetHandle: "sliders",
      },
      // Box → Geometry Phenotype
      {
        id: `edge-${boxId}-${geometryPhenotypeId}`,
        source: boxId,
        sourceHandle: "geometry",
        target: geometryPhenotypeId,
        targetHandle: "geometry",
      },
      // Box → Measurement (area)
      {
        id: `edge-${boxId}-${measureAreaId}`,
        source: boxId,
        sourceHandle: "geometry",
        target: measureAreaId,
        targetHandle: "geometry",
      },
      // Box → Measurement (volume)
      {
        id: `edge-${boxId}-${measureVolumeId}`,
        source: boxId,
        sourceHandle: "geometry",
        target: measureVolumeId,
        targetHandle: "geometry",
      },
      // Measurements → Performs Fitness (metrics input, multi)
      {
        id: `edge-${measureAreaId}-${performsFitnessId}`,
        source: measureAreaId,
        sourceHandle: "area",
        target: performsFitnessId,
        targetHandle: "metrics",
      },
      {
        id: `edge-${measureVolumeId}-${performsFitnessId}`,
        source: measureVolumeId,
        sourceHandle: "volume",
        target: performsFitnessId,
        targetHandle: "metrics",
      },
      // Genome Collector → Biological Solver (genome input)
      {
        id: `edge-${genomeCollectorId}-${solverId}`,
        source: genomeCollectorId,
        sourceHandle: "genome",
        target: solverId,
        targetHandle: "genome",
      },
      // Geometry Phenotype → Biological Solver (geometry input)
      {
        id: `edge-${geometryPhenotypeId}-${solverId}`,
        source: geometryPhenotypeId,
        sourceHandle: "phenotype",
        target: solverId,
        targetHandle: "geometry",
      },
      // Performs Fitness → Biological Solver (performs input)
      {
        id: `edge-${performsFitnessId}-${solverId}`,
        source: performsFitnessId,
        sourceHandle: "fitness",
        target: solverId,
        targetHandle: "performs",
      },
      // Morphogenesis Goal → Biological Solver (goals input)
      {
        id: `edge-${morphogenesisId}-${solverId}`,
        source: morphogenesisId,
        sourceHandle: "goal",
        target: solverId,
        targetHandle: "goals",
      },
      // Homeostasis Goal → Biological Solver (goals input)
      {
        id: `edge-${homeostasisId}-${solverId}`,
        source: homeostasisId,
        sourceHandle: "goal",
        target: solverId,
        targetHandle: "goals",
      },
      // Connect sliders to box dimensions for parametric control
      {
        id: `edge-${slider1Id}-${boxId}-width`,
        source: slider1Id,
        sourceHandle: "value",
        target: boxId,
        targetHandle: "width",
      },
      {
        id: `edge-${slider2Id}-${boxId}-depth`,
        source: slider2Id,
        sourceHandle: "value",
        target: boxId,
        targetHandle: "depth",
      },
      {
        id: `edge-${slider3Id}-${boxId}-height`,
        source: slider3Id,
        sourceHandle: "value",
        target: boxId,
        targetHandle: "height",
      },
    ];

    set((state) => ({
      workflowHistory: appendWorkflowHistory(state.workflowHistory, state.workflow),
      workflow: {
        ...state.workflow,
        nodes: [...state.workflow.nodes, ...newNodes],
        edges: [...state.workflow.edges, ...newEdges],
      },
    }));
    get().recalculateWorkflow();
  },
  addChemistrySolverRig: (position) => {
    /**
     * Chemistry Solver Test Rig: Curtain Wall Mullion with Thermal Break
     *
     * Creates a complete material optimization setup for a unitized curtain
     * wall mullion profile requiring:
     * - Structural steel at anchor zones (top/bottom connections to slab)
     * - Ceramic thermal break through the core to prevent condensation
     * - Glass-compatible interface at glazing contact surfaces
     * - Mass optimization to reduce embodied carbon
     *
     * Nodes created:
     * - Density Slider → controls solver particle density
     * - Toggle Switch → enable/disable solver execution
     * - Geometry Reference (Domain) → mullion profile from Roslyn
     * - Geometry Reference (Anchor Zones) → steel nucleation regions
     * - Geometry Reference (Thermal Core) → ceramic thermal break region
     * - Geometry Reference (Vision Strip) → glass interface region
     * - Stiffness Goal (Τέλος Σκληρότητος) → bias steel toward load paths
     * - Mass Goal (Τέλος Ἐλαχίστου Ὄγκου) → minimize total mass
     * - Blend Goal (Τέλος Κράσεως) → smooth manufacturable gradients
     * - Transparency Goal (Τέλος Διαφανείας) → glass at glazing interface
     * - Thermal Goal (Τέλος Ῥοῆς Θερμότητος) → ceramic insulation in core
     * - Chemistry Solver (Ἐπιλύτης Χημείας) → material transmutation
     * - Geometry Viewer → visualize graded result
     */
    const ts = Date.now();
    const NODE_WIDTH = 200;
    const NODE_HEIGHT = 120;
    const H_GAP = 60;
    const V_GAP = 40;

    const GROUP_PADDING = 14;
    const GROUP_HEADER_HEIGHT = 20;
    // Keep in sync with `NumericalCanvas.tsx` node layout constants.
    const RIG_NODE_WIDTH = 180;
    const RIG_NODE_MIN_HEIGHT = 98;
    const RIG_SLIDER_NODE_MIN_HEIGHT = 76;
    const RIG_VIEWER_NODE_MIN_HEIGHT = 210;
    const RIG_PORT_ROW_HEIGHT = 16;
    const RIG_PORTS_START_OFFSET = 64;
    const RIG_PORTS_BOTTOM_PADDING = 18;
    const RIG_SLIDER_PORT_OFFSET = 6;

    const CANVAS_GROUP_MIN_WIDTH = 230;
    const CANVAS_GROUP_MIN_HEIGHT = 160;
    const GROUP_MIN_WIDTH = Math.max(RIG_NODE_WIDTH + GROUP_PADDING * 2, CANVAS_GROUP_MIN_WIDTH);
    const GROUP_MIN_HEIGHT = Math.max(
      RIG_NODE_MIN_HEIGHT + GROUP_PADDING * 2 + GROUP_HEADER_HEIGHT,
      CANVAS_GROUP_MIN_HEIGHT
    );

    type RigFrame = {
      id: string;
      position: { x: number; y: number };
      size: { width: number; height: number };
    };

    type GroupBox = {
      position: { x: number; y: number };
      groupSize: { width: number; height: number };
    };

    const warnRig = (...args: Parameters<typeof console.warn>) => {
      if (import.meta.env.DEV) {
        console.warn(...args);
      }
    };

    const computeGroupBox = (
      frames: RigFrame[],
      fallbackPosition: { x: number; y: number }
    ): GroupBox => {
      const fallbackGroupBox = (pos: { x: number; y: number }): GroupBox => ({
        position: { x: pos.x, y: pos.y },
        groupSize: { width: GROUP_MIN_WIDTH, height: GROUP_MIN_HEIGHT },
      });
      const isValidFrame = (frame: RigFrame) =>
        Number.isFinite(frame.position.x) &&
        Number.isFinite(frame.position.y) &&
        Number.isFinite(frame.size.width) &&
        Number.isFinite(frame.size.height) &&
        // Strict: zero-sized nodes shouldn't exist in this rig builder.
        frame.size.width > 0 &&
        frame.size.height > 0;

      const valid = frames.filter(isValidFrame);
      const invalid = frames.filter((frame) => !isValidFrame(frame));
      if (invalid.length > 0) {
        warnRig(
          "Chemistry solver rig: ignoring invalid frames while computing group bounds",
          invalid.map((frame) => frame.id)
        );
      }
      if (valid.length === 0) {
        warnRig(
          "Chemistry solver rig: falling back to default group bounds (no valid frames)",
          fallbackPosition
        );
        return fallbackGroupBox(fallbackPosition);
      }

      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      valid.forEach((frame) => {
        minX = Math.min(minX, frame.position.x);
        minY = Math.min(minY, frame.position.y);
        maxX = Math.max(maxX, frame.position.x + frame.size.width);
        maxY = Math.max(maxY, frame.position.y + frame.size.height);
      });

      if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
        // Defensive: even after filtering frames, ensure bounds are finite.
        warnRig(
          "Chemistry solver rig: falling back to default group bounds (invalid min/max)",
          { minX, minY, maxX, maxY }
        );
        return fallbackGroupBox(fallbackPosition);
      }

      const width = Math.max(GROUP_MIN_WIDTH, maxX - minX + GROUP_PADDING * 2);
      const height = Math.max(
        GROUP_MIN_HEIGHT,
        // Match `NumericalCanvas.tsx`: position is top-left of the header, and
        // `groupSize.height` includes the header.
        maxY - minY + GROUP_PADDING * 2 + GROUP_HEADER_HEIGHT
      );
      return {
        position: {
          x: minX - GROUP_PADDING,
          y: minY - GROUP_PADDING - GROUP_HEADER_HEIGHT,
        },
        groupSize: { width, height },
      };
    };

    // Approximate node sizing for initial rig layout; keep in sync with
    // `NumericalCanvas.tsx`'s `computeNodeLayout()`.
    const resolveRigFrame = (node: WorkflowNode): RigFrame => {
      const ports = resolveNodePorts(node);
      const rowCount = Math.max(ports.inputs.length, ports.outputs.length, 1);
      const portsHeight = rowCount * RIG_PORT_ROW_HEIGHT;
      const portsStartOffset =
        node.type === "slider"
          ? RIG_PORTS_START_OFFSET + RIG_SLIDER_PORT_OFFSET
          : RIG_PORTS_START_OFFSET;
      const isViewerNode =
        node.type === "geometryViewer" ||
        node.type === "customPreview" ||
        node.type === "customViewer";
      const minHeight = isViewerNode
        ? RIG_VIEWER_NODE_MIN_HEIGHT
        : node.type === "slider"
          ? RIG_SLIDER_NODE_MIN_HEIGHT
          : RIG_NODE_MIN_HEIGHT;
      const height = Math.max(minHeight, portsStartOffset + portsHeight + RIG_PORTS_BOTTOM_PADDING);
      return {
        id: node.id,
        position: node.position,
        size: { width: RIG_NODE_WIDTH, height },
      };
    };

    const createGroupNode = (
      groupId: string,
      title: string,
      groupNodeIds: string[],
      groupBox: GroupBox,
      options?: { color?: string }
    ) => ({
      id: groupId,
      type: "group" as const,
      position: groupBox.position,
      data: {
        label: title,
        groupSize: groupBox.groupSize,
        groupNodeIds,
        parameters: { title, color: options?.color ?? "#f5f2ee" },
      },
    });

    // Column 0: Solver controls and parameters
    const toggleSwitchId = `node-conditionalToggleButton-${ts}`;
    const toggleSwitchPos = { x: position.x, y: position.y - (NODE_HEIGHT + V_GAP) * 2 };

    const densitySliderId = `node-slider-density-${ts}`;
    const densitySliderPos = { x: position.x, y: position.y - (NODE_HEIGHT + V_GAP) };

    const particleCountId = `node-number-particleCount-${ts}`;
    const particleCountPos = { x: position.x + NODE_WIDTH + H_GAP, y: position.y - (NODE_HEIGHT + V_GAP) * 2 };

    const iterationsId = `node-number-iterations-${ts}`;
    const iterationsPos = { x: position.x + NODE_WIDTH + H_GAP, y: position.y - (NODE_HEIGHT + V_GAP) };

    const fieldResolutionId = `node-slider-fieldResolution-${ts}`;
    const fieldResolutionPos = { x: position.x + (NODE_WIDTH + H_GAP) * 2, y: position.y - (NODE_HEIGHT + V_GAP) * 2 };

    const isoValueId = `node-slider-isoValue-${ts}`;
    const isoValuePos = { x: position.x + (NODE_WIDTH + H_GAP) * 2, y: position.y - (NODE_HEIGHT + V_GAP) };

    const blendStrengthId = `node-slider-blendStrength-${ts}`;
    const blendStrengthPos = { x: position.x + (NODE_WIDTH + H_GAP) * 3, y: position.y - (NODE_HEIGHT + V_GAP) * 2 };

    const convergenceId = `node-number-convergence-${ts}`;
    const convergencePos = { x: position.x + (NODE_WIDTH + H_GAP) * 3, y: position.y - (NODE_HEIGHT + V_GAP) };

    // Column 1: Geometry Reference nodes (domain + seed regions)
    const domainId = `node-geometryReference-domain-${ts}`;
    const domainPos = { x: position.x, y: position.y };

    const anchorZonesId = `node-geometryReference-anchors-${ts}`;
    const anchorZonesPos = { x: position.x, y: position.y + NODE_HEIGHT + V_GAP };

    const thermalCoreId = `node-geometryReference-thermal-${ts}`;
    const thermalCorePos = { x: position.x, y: position.y + (NODE_HEIGHT + V_GAP) * 2 };

    const visionStripId = `node-geometryReference-vision-${ts}`;
    const visionStripPos = { x: position.x, y: position.y + (NODE_HEIGHT + V_GAP) * 3 };

    // Column 2: Goal nodes (stacked vertically)
    const col2X = position.x + NODE_WIDTH + H_GAP;

    const stiffnessGoalId = `node-chemistryStiffnessGoal-${ts}`;
    const stiffnessGoalPos = { x: col2X, y: position.y };

    const massGoalId = `node-chemistryMassGoal-${ts}`;
    const massGoalPos = { x: col2X, y: position.y + NODE_HEIGHT + V_GAP };

    const blendGoalId = `node-chemistryBlendGoal-${ts}`;
    const blendGoalPos = { x: col2X, y: position.y + (NODE_HEIGHT + V_GAP) * 2 };

    const transparencyGoalId = `node-chemistryTransparencyGoal-${ts}`;
    const transparencyGoalPos = { x: col2X, y: position.y + (NODE_HEIGHT + V_GAP) * 3 };

    const thermalGoalId = `node-chemistryThermalGoal-${ts}`;
    const thermalGoalPos = { x: col2X, y: position.y + (NODE_HEIGHT + V_GAP) * 4 };

    // Column 3: Chemistry Solver
    const solverId = `node-chemistrySolver-${ts}`;
    const solverPos = { x: col2X + NODE_WIDTH + H_GAP, y: position.y + NODE_HEIGHT * 1.5 };
    const solverGeometryId = createGeometryId("mesh");

    // Column 4: Geometry Viewer
    const viewerId = `node-geometryViewer-${ts}`;
    const viewerPos = { x: col2X + (NODE_WIDTH + H_GAP) * 2, y: position.y + NODE_HEIGHT * 1.5 };

    const controlsGroupId = `node-group-chemistry-controls-${ts}`;
    const inputsGroupId = `node-group-chemistry-inputs-${ts}`;
    const goalsGroupId = `node-group-chemistry-goals-${ts}`;
    const outputGroupId = `node-group-chemistry-output-${ts}`;

    const controlsNodes = [
      {
        id: toggleSwitchId,
        type: "conditionalToggleButton" as const,
        position: toggleSwitchPos,
        data: {
          label: "Solver Toggle",
          parameters: {
            enabled: true,
          },
        },
      },
      {
        id: densitySliderId,
        type: "slider" as const,
        position: densitySliderPos,
        data: {
          label: "Particle Density",
          parameters: {
            min: 0.1,
            max: 1,
            step: 0.05,
            value: 0.5,
          },
        },
      },
      {
        id: particleCountId,
        type: "number" as const,
        position: particleCountPos,
        data: {
          label: "Particle Count",
          parameters: {
            value: 10000,
          },
        },
      },
      {
        id: iterationsId,
        type: "number" as const,
        position: iterationsPos,
        data: {
          label: "Iterations",
          parameters: {
            value: 40,
          },
        },
      },
      {
        id: fieldResolutionId,
        type: "slider" as const,
        position: fieldResolutionPos,
        data: {
          label: "Field Resolution",
          parameters: {
            min: 8,
            max: 96,
            step: 4,
            value: 48,
          },
        },
      },
      {
        id: isoValueId,
        type: "slider" as const,
        position: isoValuePos,
        data: {
          label: "Iso Value",
          parameters: {
            min: 0,
            max: 1,
            step: 0.01,
            value: 0.12,
          },
        },
      },
      {
        id: blendStrengthId,
        type: "slider" as const,
        position: blendStrengthPos,
        data: {
          label: "Blend Strength",
          parameters: {
            min: 0,
            max: 2,
            step: 0.05,
            value: 0.7,
          },
        },
      },
      {
        id: convergenceId,
        type: "number" as const,
        position: convergencePos,
        data: {
          label: "Convergence",
          parameters: {
            value: 0.002,
          },
        },
      },
    ];

    const inputsNodes = [
      {
        id: domainId,
        type: "geometryReference" as const,
        position: domainPos,
        data: {
          label: "Mullion Domain",
          parameters: {},
        },
      },
      {
        id: anchorZonesId,
        type: "geometryReference" as const,
        position: anchorZonesPos,
        data: {
          label: "Anchor Zones (Steel)",
          parameters: {},
        },
      },
      {
        id: thermalCoreId,
        type: "geometryReference" as const,
        position: thermalCorePos,
        data: {
          label: "Thermal Core (Ceramic)",
          parameters: {},
        },
      },
      {
        id: visionStripId,
        type: "geometryReference" as const,
        position: visionStripPos,
        data: {
          label: "Vision Strip (Glass)",
          parameters: {},
        },
      },
    ];

    const goalsNodes = [
      {
        id: stiffnessGoalId,
        type: "chemistryStiffnessGoal" as const,
        position: stiffnessGoalPos,
        data: {
          label: "Τέλος Σκληρότητος",
          parameters: {
            loadVectorX: 0,
            loadVectorY: -1, // Gravity direction
            loadVectorZ: 0,
            structuralPenalty: 1.5,
            weight: 0.7, // Primary structural driver
          },
        },
      },
      {
        id: massGoalId,
        type: "chemistryMassGoal" as const,
        position: massGoalPos,
        data: {
          label: "Τέλος Ἐλαχίστου Ὄγκου",
          parameters: {
            targetMassFraction: 0.55, // 45% material removal target
            densityPenalty: 1.2,
            weight: 0.4, // Secondary to stiffness
          },
        },
      },
      {
        id: blendGoalId,
        type: "chemistryBlendGoal" as const,
        position: blendGoalPos,
        data: {
          label: "Τέλος Κράσεως",
          parameters: {
            smoothness: 0.75, // Smooth for additive manufacturing
            diffusivity: 1.2,
            weight: 0.6,
          },
        },
      },
      {
        id: transparencyGoalId,
        type: "chemistryTransparencyGoal" as const,
        position: transparencyGoalPos,
        data: {
          label: "Τέλος Διαφανείας",
          parameters: {
            opticalWeight: 2.0, // Strong bias toward transparent material
            weight: 0.45,
          },
        },
      },
      {
        id: thermalGoalId,
        type: "chemistryThermalGoal" as const,
        position: thermalGoalPos,
        data: {
          label: "Τέλος Ῥοῆς Θερμότητος",
          parameters: {
            mode: "insulate", // Minimize heat transfer
            thermalWeight: 2.5,
            weight: 0.65, // Critical for condensation prevention
          },
        },
      },
    ];

    const outputNodes = [
      {
        id: solverId,
        type: "chemistrySolver" as const,
        position: solverPos,
        data: {
          label: "Ἐπιλύτης Χημείας",
          geometryId: solverGeometryId,
          geometryType: "mesh",
          isLinked: true,
          parameters: {
            historyLimit: 100,
            seed: 1,
            materialOrder: "Steel, Ceramic, Glass",
            materialsText: JSON.stringify([
              { material: { name: "Steel", color: [0.75, 0.75, 0.78] } },
              { material: { name: "Ceramic", color: [0.9, 0.2, 0.2] } },
              { material: { name: "Glass", color: [0.2, 0.4, 0.9] } },
            ]),
            seedMaterial: "Steel",
            seedStrength: 0.85,
            seedRadius: 0.25,
          },
        },
      },
      {
        id: viewerId,
        type: "geometryViewer" as const,
        position: viewerPos,
        data: { label: "Graded Material Preview" },
      },
    ];

    const buildRigGroupNode = (
      groupId: string,
      title: string,
      nodes: WorkflowNode[],
      anchorPosition: { x: number; y: number },
      options?: { color?: string }
    ): ReturnType<typeof createGroupNode> | null => {
      if (nodes.length === 0) {
        return null;
      }
      const frames: RigFrame[] = nodes.map((node) => resolveRigFrame(node));
      const groupBox = computeGroupBox(frames, anchorPosition);
      return createGroupNode(
        groupId,
        title,
        nodes.map((node) => node.id),
        groupBox,
        options
      );
    };

    const groups = [
      {
        groupId: controlsGroupId,
        title: "Solver Controls",
        color: "#e3f2fd",
        nodes: controlsNodes,
      },
      {
        groupId: inputsGroupId,
        title: "Domain + Seeds",
        color: "#e8f5e9",
        nodes: inputsNodes,
      },
      {
        groupId: goalsGroupId,
        title: "Goals",
        color: "#fff3e0",
        nodes: goalsNodes,
      },
      {
        groupId: outputGroupId,
        title: "Solve + Preview",
        color: "#f3e5f5",
        nodes: outputNodes,
      },
    ];

    const groupNodes = groups
      .map((group) =>
        buildRigGroupNode(group.groupId, group.title, group.nodes, position, { color: group.color })
      )
      .filter((node): node is NonNullable<typeof node> => node != null);

    class RigConfigError extends Error {
      constructor(message: string) {
        super(message);
        this.name = "RigConfigError";
      }
    }

    const groupTitleById = new Map(groups.map((group) => [group.groupId, group.title] as const));
    // Rig template invariant: a node should not appear in multiple groups.
    const groupOwnerByNodeId = new Map<string, string>();
    groups.forEach((group) => {
      group.nodes.forEach((node) => {
        const prevOwner = groupOwnerByNodeId.get(node.id);
        if (prevOwner && prevOwner !== group.groupId) {
          const prevTitle = groupTitleById.get(prevOwner);
          const currentTitle = groupTitleById.get(group.groupId);
          throw new RigConfigError(
            `Chemistry solver rig config error: node ${node.id} appears in multiple groups: ${prevOwner}${prevTitle ? ` ("${prevTitle}")` : ""}, ${group.groupId}${currentTitle ? ` ("${currentTitle}")` : ""}`
          );
        }
        groupOwnerByNodeId.set(node.id, group.groupId);
      });
    });

    const childNodes = Array.from(
      new Map(
        groups
          .flatMap((group) => group.nodes)
          .map((node) => [node.id, node] as const)
      ).values()
    );

    const newNodes = [...groupNodes, ...childNodes];

    // Wire connections
    const newEdges = [
      // Toggle Switch → Chemistry Solver (enabled)
      {
        id: `edge-${toggleSwitchId}-${solverId}-enabled`,
        source: toggleSwitchId,
        sourceHandle: "enabled",
        target: solverId,
        targetHandle: "enabled",
      },
      // Density Slider → Chemistry Solver (particle density)
      {
        id: `edge-${densitySliderId}-${solverId}-density`,
        source: densitySliderId,
        sourceHandle: "value",
        target: solverId,
        targetHandle: "particleDensity",
      },
      // Particle Count → Chemistry Solver
      {
        id: `edge-${particleCountId}-${solverId}-particleCount`,
        source: particleCountId,
        sourceHandle: "value",
        target: solverId,
        targetHandle: "particleCount",
      },
      // Iterations → Chemistry Solver
      {
        id: `edge-${iterationsId}-${solverId}-iterations`,
        source: iterationsId,
        sourceHandle: "value",
        target: solverId,
        targetHandle: "iterations",
      },
      // Field Resolution → Chemistry Solver
      {
        id: `edge-${fieldResolutionId}-${solverId}-fieldResolution`,
        source: fieldResolutionId,
        sourceHandle: "value",
        target: solverId,
        targetHandle: "fieldResolution",
      },
      // Iso Value → Chemistry Solver
      {
        id: `edge-${isoValueId}-${solverId}-isoValue`,
        source: isoValueId,
        sourceHandle: "value",
        target: solverId,
        targetHandle: "isoValue",
      },
      // Blend Strength → Chemistry Solver
      {
        id: `edge-${blendStrengthId}-${solverId}-blendStrength`,
        source: blendStrengthId,
        sourceHandle: "value",
        target: solverId,
        targetHandle: "blendStrength",
      },
      // Convergence → Chemistry Solver
      {
        id: `edge-${convergenceId}-${solverId}-convergence`,
        source: convergenceId,
        sourceHandle: "value",
        target: solverId,
        targetHandle: "convergenceTolerance",
      },
      // Domain Geometry → Chemistry Solver (domain input)
      {
        id: `edge-${domainId}-${solverId}-domain`,
        source: domainId,
        sourceHandle: "geometry",
        target: solverId,
        targetHandle: "domain",
      },
      // Anchor Zones → Chemistry Solver (seeds for steel nucleation)
      {
        id: `edge-${anchorZonesId}-${solverId}-seeds`,
        source: anchorZonesId,
        sourceHandle: "geometry",
        target: solverId,
        targetHandle: "seeds",
      },
      // Thermal Core → Chemistry Solver (seeds for ceramic)
      {
        id: `edge-${thermalCoreId}-${solverId}-seeds`,
        source: thermalCoreId,
        sourceHandle: "geometry",
        target: solverId,
        targetHandle: "seeds",
      },
      // Vision Strip → Chemistry Solver (seeds for glass)
      {
        id: `edge-${visionStripId}-${solverId}-seeds`,
        source: visionStripId,
        sourceHandle: "geometry",
        target: solverId,
        targetHandle: "seeds",
      },
      // Anchor Zones → Chemistry Solver (materials input order: Steel, Ceramic, Glass)
      {
        id: `edge-${anchorZonesId}-${solverId}-materials`,
        source: anchorZonesId,
        sourceHandle: "geometry",
        target: solverId,
        targetHandle: "materials",
      },
      // Thermal Core → Chemistry Solver (materials input)
      {
        id: `edge-${thermalCoreId}-${solverId}-materials`,
        source: thermalCoreId,
        sourceHandle: "geometry",
        target: solverId,
        targetHandle: "materials",
      },
      // Vision Strip → Chemistry Solver (materials input)
      {
        id: `edge-${visionStripId}-${solverId}-materials`,
        source: visionStripId,
        sourceHandle: "geometry",
        target: solverId,
        targetHandle: "materials",
      },
      // Anchor Zones → Stiffness Goal (region input)
      {
        id: `edge-${anchorZonesId}-${stiffnessGoalId}-region`,
        source: anchorZonesId,
        sourceHandle: "geometry",
        target: stiffnessGoalId,
        targetHandle: "region",
      },
      // Vision Strip → Transparency Goal (region input)
      {
        id: `edge-${visionStripId}-${transparencyGoalId}-region`,
        source: visionStripId,
        sourceHandle: "geometry",
        target: transparencyGoalId,
        targetHandle: "region",
      },
      // Thermal Core → Thermal Goal (region input)
      {
        id: `edge-${thermalCoreId}-${thermalGoalId}-region`,
        source: thermalCoreId,
        sourceHandle: "geometry",
        target: thermalGoalId,
        targetHandle: "region",
      },
      // Stiffness Goal → Chemistry Solver (goals)
      {
        id: `edge-${stiffnessGoalId}-${solverId}`,
        source: stiffnessGoalId,
        sourceHandle: "goal",
        target: solverId,
        targetHandle: "goals",
      },
      // Mass Goal → Chemistry Solver (goals)
      {
        id: `edge-${massGoalId}-${solverId}`,
        source: massGoalId,
        sourceHandle: "goal",
        target: solverId,
        targetHandle: "goals",
      },
      // Blend Goal → Chemistry Solver (goals)
      {
        id: `edge-${blendGoalId}-${solverId}`,
        source: blendGoalId,
        sourceHandle: "goal",
        target: solverId,
        targetHandle: "goals",
      },
      // Transparency Goal → Chemistry Solver (goals)
      {
        id: `edge-${transparencyGoalId}-${solverId}`,
        source: transparencyGoalId,
        sourceHandle: "goal",
        target: solverId,
        targetHandle: "goals",
      },
      // Thermal Goal → Chemistry Solver (goals)
      {
        id: `edge-${thermalGoalId}-${solverId}`,
        source: thermalGoalId,
        sourceHandle: "goal",
        target: solverId,
        targetHandle: "goals",
      },
      // Chemistry Solver → Geometry Viewer
      {
        id: `edge-${solverId}-${viewerId}`,
        source: solverId,
        sourceHandle: "geometry",
        target: viewerId,
        targetHandle: "geometry",
      },
    ];

    const emptyMesh: RenderMesh = { positions: [], normals: [], uvs: [], indices: [] };
    const solverGeometry: Geometry = {
      id: solverGeometryId,
      type: "mesh",
      mesh: emptyMesh,
      layerId: "layer-default",
      sourceNodeId: solverId,
      metadata: {
        label: "Chemistry Solver Output",
      },
    };
    get().addGeometryItems([solverGeometry], {
      selectIds: get().selectedGeometryIds,
      recordHistory: true,
    });

    set((state) => ({
      workflowHistory: appendWorkflowHistory(state.workflowHistory, state.workflow),
      workflow: {
        ...state.workflow,
        nodes: [...state.workflow.nodes, ...newNodes],
        edges: [...state.workflow.edges, ...newEdges],
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
  setShowMoveArms: (show) => set({ showMoveArms: show }),
  setGumballStep: (settings) =>
    set((state) => ({ gumballStep: { ...state.gumballStep, ...settings } })),
  setGumballSettings: (settings) =>
    set((state) => ({ gumballSettings: { ...state.gumballSettings, ...settings } })),
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
    set((state) => {
      if (mode === "silhouette") {
        return { displayMode: mode };
      }
      return {
        displayMode: mode,
        viewSolidity: resolveSolidityFromDisplayMode(mode),
      };
    });
  },
  setViewSolidity: (value, options) => {
    const viewSolidity = clamp01(value);
    set((state) => {
      if (state.displayMode === "silhouette" && !options?.overrideDisplayMode) {
        return { viewSolidity };
      }
      return {
        viewSolidity,
        displayMode: resolveDisplayModeFromSolidity(viewSolidity),
      };
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
          showMoveArms: state.showMoveArms,
          gumballSettings: state.gumballSettings,
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
      showMoveArms: get().showMoveArms,
      gumballSettings: get().gumballSettings,
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
      showMoveArms: snapshot.showMoveArms,
      gumballSettings: snapshot.gumballSettings ?? defaultGumballSettings,
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
      showMoveArms: get().showMoveArms,
      gumballSettings: get().gumballSettings,
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
      showMoveArms: snapshot.showMoveArms,
      gumballSettings: snapshot.gumballSettings ?? defaultGumballSettings,
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
  addGeometryNurbsCurve: (nurbs, options) => {
    const id = createGeometryId("nurbsCurve");
    const recordHistory = options?.recordHistory ?? true;
    if (recordHistory) {
      get().recordModelerHistory();
    }
    const layerId = withDefaultLayerId(options?.layerId, get());
    const item: Geometry = {
      id,
      type: "nurbsCurve",
      nurbs,
      closed: options?.closed ?? false,
      layerId,
      area_m2: options?.area_m2,
      thickness_m: options?.thickness_m,
      sourceNodeId: options?.sourceNodeId,
      metadata: options?.metadata,
    };
    get().addGeometryItems([item], {
      selectIds: options?.selectIds ?? [id],
      recordHistory: false,
    });
    return id;
  },
  addGeometryNurbsSurface: (nurbs, options) => {
    const id = createGeometryId("nurbsSurface");
    const recordHistory = options?.recordHistory ?? true;
    if (recordHistory) {
      get().recordModelerHistory();
    }
    const layerId = withDefaultLayerId(options?.layerId, get());
    const item: Geometry = {
      id,
      type: "nurbsSurface",
      nurbs,
      mesh: options?.mesh,
      layerId,
      area_m2: options?.area_m2,
      thickness_m: options?.thickness_m,
      sourceNodeId: options?.sourceNodeId,
      metadata: options?.metadata,
    };
    get().addGeometryItems([item], {
      selectIds: options?.selectIds ?? [id],
      recordHistory: false,
    });
    return id;
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
    const primitive =
      options?.primitive ??
      (options?.metadata?.primitive as MeshPrimitiveGeometry["primitive"] | undefined);
    const physical =
      primitive != null
        ? computePrimitivePhysicalProperties(translatedMesh, primitive, options?.metadata)
        : (() => {
            const { volume_m3, centroid } = computeMeshVolumeAndCentroid(translatedMesh);
            return {
              area_m2: options?.area_m2 ?? computeMeshArea(translatedMesh.positions, translatedMesh.indices),
              volume_m3,
              centroid,
              mass_kg: undefined as number | undefined,
              inertiaTensor_kg_m2: undefined as MeshPrimitiveGeometry["inertiaTensor_kg_m2"],
            };
          })();
    set((state) => {
      const layerId = withDefaultLayerId(options?.layerId, state);
      const nextGeometry: Geometry = {
        id,
        type: "mesh",
        mesh: translatedMesh,
        layerId,
        area_m2: physical.area_m2,
        volume_m3: physical.volume_m3,
        centroid: physical.centroid ?? undefined,
        mass_kg: physical.mass_kg,
        inertiaTensor_kg_m2: physical.inertiaTensor_kg_m2,
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
    const recordHistory = options?.recordHistory ?? true;
    if (recordHistory) {
      get().recordModelerHistory();
    }
    const id = options?.geometryId ?? createGeometryId("loft");
    const area = computeMeshArea(mesh.positions, mesh.indices);
    const { volume_m3, centroid } = computeMeshVolumeAndCentroid(mesh);
    const density = resolveDensity(options?.metadata);
    const mass_kg =
      density && volume_m3 > 0 ? density * volume_m3 : undefined;
    set((state) => {
      const existing = state.geometry.find((item) => item.id === id);
      const layerId =
        existing?.layerId ?? withDefaultLayerId(options?.layerId, state);
      const nextGeometry: Geometry = {
        id,
        type: "loft",
        mesh,
        sectionIds,
        degree: options.degree,
        closed: options.closed,
        layerId,
        area_m2: area,
        volume_m3,
        centroid: centroid ?? undefined,
        mass_kg,
        sourceNodeId: options?.sourceNodeId ?? existing?.sourceNodeId,
        metadata: options?.metadata ?? existing?.metadata,
      };
      const geometryExists = Boolean(existing);
      const geometryList = geometryExists
        ? state.geometry.map((item) => (item.id === id ? nextGeometry : item))
        : [...state.geometry, nextGeometry];
      const nextLayers = state.layers.map((layer) => {
        if (layer.id !== layerId) return layer;
        if (layer.geometryIds.includes(id)) return layer;
        return { ...layer, geometryIds: [...layer.geometryIds, id] };
      });
      const existingNode = state.sceneNodes.find((node) => node.geometryId === id);
      const nodeLabel =
        options?.metadata?.label != null
          ? String(options.metadata.label)
          : existingNode?.name;
      const nextSceneNodes = [
        ...state.sceneNodes.filter((node) => node.geometryId !== id),
        createGeometrySceneNode(id, nodeLabel),
      ];
      return {
        geometry: geometryList,
        layers: nextLayers,
        selectedGeometryIds: options?.selectIds ?? [id],
        sceneNodes: nextSceneNodes,
      };
    });
    get().recalculateWorkflow();
    return id;
  },
  addGeometryExtrude: (mesh, profileIds, options) => {
    const recordHistory = options?.recordHistory ?? true;
    if (recordHistory) {
      get().recordModelerHistory();
    }
    const id = options?.geometryId ?? createGeometryId("extrude");
    const area = computeMeshArea(mesh.positions, mesh.indices);
    const { volume_m3, centroid } = computeMeshVolumeAndCentroid(mesh);
    const density = resolveDensity(options?.metadata);
    const mass_kg =
      density && volume_m3 > 0 ? density * volume_m3 : undefined;
    set((state) => {
      const existing = state.geometry.find((item) => item.id === id);
      const layerId =
        existing?.layerId ?? withDefaultLayerId(options?.layerId, state);
      const nextGeometry: Geometry = {
        id,
        type: "extrude",
        mesh,
        profileIds,
        distance: options.distance,
        direction: options.direction,
        capped: options.capped,
        layerId,
        area_m2: area,
        volume_m3,
        centroid: centroid ?? undefined,
        mass_kg,
        sourceNodeId: options?.sourceNodeId ?? existing?.sourceNodeId,
        metadata: options?.metadata ?? existing?.metadata,
      };
      const geometryExists = Boolean(existing);
      const geometryList = geometryExists
        ? state.geometry.map((item) => (item.id === id ? nextGeometry : item))
        : [...state.geometry, nextGeometry];
      const nextLayers = state.layers.map((layer) => {
        if (layer.id !== layerId) return layer;
        if (layer.geometryIds.includes(id)) return layer;
        return { ...layer, geometryIds: [...layer.geometryIds, id] };
      });
      const existingNode = state.sceneNodes.find((node) => node.geometryId === id);
      const nodeLabel =
        options?.metadata?.label != null
          ? String(options.metadata.label)
          : existingNode?.name;
      const nextSceneNodes = [
        ...state.sceneNodes.filter((node) => node.geometryId !== id),
        createGeometrySceneNode(id, nodeLabel),
      ];
      return {
        geometry: geometryList,
        layers: nextLayers,
        selectedGeometryIds: options?.selectIds ?? [id],
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
  replaceGeometryBatch: (items, options) => {
    const recordHistory = options?.recordHistory ?? true;
    if (recordHistory) {
      get().recordModelerHistory();
    }
    set((state) => {
      const itemMap = new Map(items.map((item) => [item.id, item]));
      const nextGeometry = state.geometry.map((item) =>
        itemMap.get(item.id) ?? item
      ) as Geometry[];
      return { geometry: nextGeometry } satisfies Partial<ProjectStore>;
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
  updateGeometryMetadata: (id, metadata, options) => {
    const recordHistory = options?.recordHistory ?? false;
    if (recordHistory) {
      get().recordModelerHistory();
    }
    set((state) => {
      const nextGeometry = state.geometry.map((item) => {
        if (item.id !== id) return item;
        const nextMetadata = metadata === undefined
          ? undefined
          : { ...(item.metadata ?? {}), ...metadata };
        return { ...item, metadata: nextMetadata } as Geometry;
      });
      return { geometry: nextGeometry } satisfies Partial<ProjectStore>;
    });
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

          if (node.type === "slider" && nextParameters) {
            const roundToPrecision = (value: number, precision: number) => {
              if (!Number.isFinite(precision)) return value;
              const clamped = Math.min(6, Math.max(0, Math.round(precision)));
              if (clamped <= 0) {
                return Math.round(value);
              }
              const factor = Math.pow(10, clamped);
              return Math.round(value * factor) / factor;
            };
            const rawMin = asNumber(nextParameters.min, 0);
            const rawMax = asNumber(nextParameters.max, 100);
            const min = Math.min(rawMin, rawMax);
            const max = Math.max(rawMin, rawMax);
            const stepRaw = asNumber(nextParameters.step, 1);
            const step = stepRaw > 0 ? Math.abs(stepRaw) : 1;
            const snapModeRaw = nextParameters.snapMode;
            const hasSnapMode = snapModeRaw === "off" || snapModeRaw === "step";
            const snapMode = hasSnapMode
              ? snapModeRaw
              : typeof nextParameters.snap === "boolean"
                ? nextParameters.snap
                  ? "step"
                  : "off"
                : "step";
            const precisionRaw = hasSnapMode
              ? Number.NaN
              : asNumber(nextParameters.precision, 2);
            const precision =
              Number.isFinite(precisionRaw) &&
              !Number.isNaN(precisionRaw)
                ? Math.min(6, Math.max(0, Math.round(precisionRaw)))
                : null;
            const rawValue = asNumber(nextParameters.value, min);
            const snapped =
              snapMode === "step" ? snapNumberToStep(rawValue, step, min) : rawValue;
            const rounded = precision != null ? roundToPrecision(snapped, precision) : snapped;
            nextParameters = {
              ...(nextParameters ?? {}),
              min,
              max,
              step,
              value: clampValue(rounded, min, max),
              ...(hasSnapMode ? { snapMode } : { snap: snapMode === "step", precision }),
            };
          }
          const nextDataPatch: Partial<WorkflowNodeData> = { ...data };

          if (node.type === "point" && nextParameters) {
            const current = node.data?.point ?? { x: 0, y: 0, z: 0 };
            nextDataPatch.point = {
              x: asNumber(nextParameters.x, current.x),
              y: asNumber(nextParameters.y, current.y),
              z: asNumber(nextParameters.z, current.z),
            };
          }

          if (
            (node.type === "line" ||
              node.type === "arc" ||
              node.type === "curve" ||
              node.type === "polyline" ||
              node.type === "surface") &&
            typeof nextParameters?.pointsText === "string"
          ) {
            nextDataPatch.pointsText = nextParameters.pointsText;
          }

          if (
            (node.type === "curve" || node.type === "polyline") &&
            typeof nextParameters?.closed === "boolean"
          ) {
            nextDataPatch.closed = nextParameters.closed;
          }

          if (node.type === "box" && nextParameters) {
            const current = node.data?.boxDimensions ?? { width: 1, height: 1, depth: 1 };
            nextDataPatch.boxDimensions = {
              width: asNumber(nextParameters.boxWidth, current.width),
              height: asNumber(nextParameters.boxHeight, current.height),
              depth: asNumber(nextParameters.boxDepth, current.depth),
            };
            nextDataPatch.boxOrigin = readVec3Parameter(
              nextParameters,
              "boxOrigin",
              node.data?.boxOrigin ?? { x: 0, y: 0, z: 0 }
            );
          }

          if (node.type === "sphere" && nextParameters) {
            nextDataPatch.sphereRadius = asNumber(
              nextParameters.sphereRadius,
              node.data?.sphereRadius ?? 0.5
            );
            nextDataPatch.sphereOrigin = readVec3Parameter(
              nextParameters,
              "sphereCenter",
              node.data?.sphereOrigin ?? { x: 0, y: 0, z: 0 }
            );
          }
          return {
            ...node,
            data: {
              ...node.data,
              ...nextDataPatch,
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
          const plane = computeBestFitPlane([start, through, end]);
          const nurbs =
            createArcNurbs(plane, start, end, through) ??
            createNurbsCurveFromPoints([start, through, end], 2, false);
          const arcId = node.data.geometryId ?? createGeometryId("nurbsCurve");
          const existing = get().geometry.find((item) => item.id === arcId);
          if (existing && existing.type === "nurbsCurve") {
            get().updateGeometry(arcId, { nurbs, closed: false });
          } else {
            if (node.data.vertexIds?.length) {
              get().deleteGeometry(node.data.vertexIds, { recordHistory: true });
            }
            if (existing) {
              get().deleteGeometry(existing.id, { recordHistory: true });
            }
            const arcItem: Geometry = {
              id: arcId,
              type: "nurbsCurve",
              nurbs,
              closed: false,
              layerId: "layer-default",
            };
            get().addGeometryItems([arcItem], {
              selectIds: get().selectedGeometryIds,
              recordHistory: true,
            });
          }
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
                        geometryType: "nurbsCurve",
                        closed: false,
                        vertexIds: undefined,
                      },
                    }
                  : entry
              ),
            },
          }));
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
          const closed = coerceBoolean(parameters.closed, false);
          const nurbs = closed
            ? createNurbsCurveFromPoints(controlPoints, degree, true)
            : interpolateNurbsCurve(controlPoints, degree);
          const curveId = node.data.geometryId ?? createGeometryId("nurbsCurve");
          const existing = get().geometry.find((item) => item.id === curveId);
          if (existing && existing.type === "nurbsCurve") {
            get().updateGeometry(curveId, { nurbs, closed });
          } else {
            if (node.data.vertexIds?.length) {
              get().deleteGeometry(node.data.vertexIds, { recordHistory: true });
            }
            if (existing) {
              get().deleteGeometry(existing.id, { recordHistory: true });
            }
            const curveItem: Geometry = {
              id: curveId,
              type: "nurbsCurve",
              nurbs,
              closed,
              layerId: "layer-default",
            };
            get().addGeometryItems([curveItem], {
              selectIds: get().selectedGeometryIds,
              recordHistory: true,
            });
          }
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
                        geometryType: "nurbsCurve",
                        closed,
                        vertexIds: undefined,
                      },
                    }
                  : entry
              ),
            },
          }));
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
        const center = {
          x: Number(parameters.centerX ?? 0),
          y: Number(parameters.centerY ?? 0),
          z: Number(parameters.centerZ ?? 0),
        };
        const normal = {
          x: Number(parameters.normalX ?? 0),
          y: Number(parameters.normalY ?? 1),
          z: Number(parameters.normalZ ?? 0),
        };
        if (Number.isFinite(radius) && radius > 0) {
          const plane =
            lengthVec3(normal) > 1e-6 ? buildPlaneFromNormal(center, normal) : get().cPlane;
          const nurbs = createCircleNurbs(plane, center, radius);
          const circleId = node.data.geometryId ?? createGeometryId("nurbsCurve");
          const existing = get().geometry.find((item) => item.id === circleId);
          if (existing && existing.type === "nurbsCurve") {
            get().updateGeometry(circleId, { nurbs, closed: true });
          } else {
            if (node.data.vertexIds?.length) {
              get().deleteGeometry(node.data.vertexIds, { recordHistory: true });
            }
            if (existing) {
              get().deleteGeometry(existing.id, { recordHistory: true });
            }
            const circleItem: Geometry = {
              id: circleId,
              type: "nurbsCurve",
              nurbs,
              closed: true,
              layerId: "layer-default",
            };
            get().addGeometryItems([circleItem], {
              selectIds: get().selectedGeometryIds,
              recordHistory: true,
            });
          }
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
                        geometryType: "nurbsCurve",
                        closed: true,
                        vertexIds: undefined,
                      },
                    }
                  : entry
              ),
            },
          }));
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
        text: "Text",
        group: "Group",
      colorPicker: "Color Picker",
      customMaterial: "Custom Material",
      geometryViewer: "Geometry Viewer",
      customViewer: "Custom Viewer",
      customPreview: "Custom Preview",
      previewFilter: "Filter",
      meshConvert: "Mesh Convert",
      nurbsToMesh: "NURBS to Mesh",
      brepToMesh: "B-Rep to Mesh",
      meshToBrep: "Mesh to B-Rep",
      subdivideMesh: "Subdivide Mesh",
      dualMesh: "Dual Mesh",
      insetFaces: "Inset Faces",
      extrudeFaces: "Extrude Faces",
      meshRelax: "Mesh Relax",
      selectFaces: "Select Faces",
      meshBoolean: "Mesh Boolean",
      triangulateMesh: "Triangulate Mesh",
      geodesicSphere: "Geodesic Sphere",
      voronoiPattern: "Voronoi Pattern",
      hexagonalTiling: "Hexagonal Tiling",
      offsetPattern: "Offset Pattern",
      meshRepair: "Mesh Repair",
      meshUVs: "Generate UVs",
      meshDecimate: "Mesh Decimate",
      quadRemesh: "Quad Remesh",
      stlExport: "STL Export",
      stlImport: "STL Import",
      point: "Point Generator",
      pointCloud: "Point Cloud",
      line: "Line",
      rectangle: "Rectangle",
      circle: "Circle",
      arc: "Arc",
      curve: "Curve",
      polyline: "Polyline",
      surface: "Surface",
      loft: "Loft",
      extrude: "Extrude",
      pipeSweep: "Pipe",
      pipeMerge: "Pipe Merge",
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
      physicsSolver: "Ἐπιλύτης Φυσικῆς",
      voxelSolver: "Ἐπιλύτης Φογκελ",
      biologicalSolver: "Ἐπιλύτης Βιολογίας",
      biologicalEvolutionSolver: "Biological Solver",
      chemistrySolver: "Ἐπιλύτης Χημείας",
      stiffnessGoal: "Σκληρότης",
      volumeGoal: "Ὄγκος",
      loadGoal: "Βάρος",
      anchorGoal: "Ἄγκυρα",
      genomeCollector: "Genome Collector",
      geometryPhenotype: "Geometry Phenotype",
      performsFitness: "Performs Fitness",
      growthGoal: "Αὔξησις",
      nutrientGoal: "Θρέψις",
      morphogenesisGoal: "Μορφογένεσις",
      homeostasisGoal: "Ὁμοιόστασις",
      chemistryMaterialGoal: "Ὕλη",
      chemistryStiffnessGoal: "Τέλος Σκληρότητος",
      chemistryMassGoal: "Τέλος Ἐλαχίστου Ὄγκου",
      chemistryBlendGoal: "Τέλος Κράσεως",
      chemistryTransparencyGoal: "Τέλος Διαφανείας",
      chemistryThermalGoal: "Τέλος Ῥοῆς Θερμότητος",
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
      textNote: "Text Note",
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
      const fallbackId = get().geometry[0]?.id ?? null;
      if (fallbackId) {
        data.geometryId = fallbackId;
      }
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
    if (type === "customMaterial") {
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
      const center = {
        x: typeof parameters.centerX === "number" ? parameters.centerX : 0,
        y: typeof parameters.centerY === "number" ? parameters.centerY : 0,
        z: typeof parameters.centerZ === "number" ? parameters.centerZ : 0,
      };
      const normal = {
        x: typeof parameters.normalX === "number" ? parameters.normalX : 0,
        y: typeof parameters.normalY === "number" ? parameters.normalY : 1,
        z: typeof parameters.normalZ === "number" ? parameters.normalZ : 0,
      };
      const plane =
        lengthVec3(normal) > 1e-6 ? buildPlaneFromNormal(center, normal) : get().cPlane;
      const nurbs = createCircleNurbs(plane, center, radius);
      const circleId = createGeometryId("nurbsCurve");
      data.geometryId = circleId;
      data.geometryType = "nurbsCurve";
      data.closed = true;
      data.isLinked = true;
      const circleItem: Geometry = {
        id: circleId,
        type: "nurbsCurve",
        nurbs,
        closed: true,
        layerId: "layer-default",
      };
      get().addGeometryItems([circleItem], {
        selectIds: get().selectedGeometryIds,
        recordHistory: true,
      });
    }
    if (type === "arc") {
      data.pointsText = "0 0 0  1 0 0  0.5 0 0.6";
      data.closed = false;
      const controlPoints = parsePointsText(data.pointsText).slice(0, 3);
      const [start, end, through] = controlPoints;
      const plane =
        start && end && through ? computeBestFitPlane([start, through, end]) : get().cPlane;
      const nurbs =
        start && end && through
          ? createArcNurbs(plane, start, end, through) ??
            createNurbsCurveFromPoints([start, through, end], 2, false)
          : createNurbsCurveFromPoints(controlPoints, 2, false);
      const arcId = createGeometryId("nurbsCurve");
      data.geometryId = arcId;
      data.geometryType = "nurbsCurve";
      data.isLinked = true;
      const arcItem: Geometry = {
        id: arcId,
        type: "nurbsCurve",
        nurbs,
        closed: false,
        layerId: "layer-default",
      };
      get().addGeometryItems([arcItem], {
        selectIds: get().selectedGeometryIds,
        recordHistory: true,
      });
    }
    if (type === "curve") {
      data.pointsText = "0 0 0  1 0 0  1 0 1  0 0 1";
      const controlPoints = parsePointsText(data.pointsText);
      const degreeRaw = typeof parameters.degree === "number" ? parameters.degree : 3;
      const degree = Math.min(3, Math.max(1, Math.round(degreeRaw))) as 1 | 2 | 3;
      const closed = Boolean(parameters.closed);
      data.closed = closed;
      const nurbs = closed
        ? createNurbsCurveFromPoints(controlPoints, degree, true)
        : interpolateNurbsCurve(controlPoints, degree);
      const curveId = createGeometryId("nurbsCurve");
      data.geometryId = curveId;
      data.geometryType = "nurbsCurve";
      data.isLinked = true;
      const curveItem: Geometry = {
        id: curveId,
        type: "nurbsCurve",
        nurbs,
        closed,
        layerId: "layer-default",
      };
      get().addGeometryItems([curveItem], {
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

    if (type === "meshConvert" || type === "nurbsToMesh" || type === "brepToMesh" || type === "stlImport") {
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

    if (type === "physicsSolver") {
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
          label: labels[type] ?? "Physics Solver",
        },
      };
      get().addGeometryItems([meshItem], {
        selectIds: get().selectedGeometryIds,
        recordHistory: true,
      });
    }

    if (type === "chemistrySolver") {
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
          label: labels[type] ?? "Chemistry Solver",
        },
      };
      get().addGeometryItems([meshItem], {
        selectIds: get().selectedGeometryIds,
        recordHistory: true,
      });
    }

    if (type === "meshToBrep") {
      const emptyMesh: RenderMesh = { positions: [], normals: [], uvs: [], indices: [] };
      const brepId = createGeometryId("brep");
      data.geometryId = brepId;
      data.geometryType = "brep";
      data.isLinked = true;
      const brepItem: Geometry = {
        id: brepId,
        type: "brep",
        brep: { vertices: [], edges: [], loops: [], faces: [], solids: [] },
        mesh: emptyMesh,
        layerId: "layer-default",
        sourceNodeId: id,
        metadata: {
          label: labels[type] ?? "B-Rep",
        },
      };
      get().addGeometryItems([brepItem], {
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
    if (type === "pipeSweep" || type === "pipeMerge") {
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
        metadata: { label: labels[type] ?? "Pipe" },
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
    if (type === "pointCloud") {
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
    return id;
  },
  onNodesChange: (changes) => {
    const previousNodes = get().workflow.nodes;
    const removedNodes = changes
      .filter((change) => change.type === "remove")
      .map((change) => previousNodes.find((node) => node.id === change.id))
      .filter(Boolean) as WorkflowNode[];
    const removedNodeIds = new Set(removedNodes.map((node) => node.id));
    set((state) => ({
      workflowHistory: shouldTrackNodeChange(changes)
        ? appendWorkflowHistory(state.workflowHistory, state.workflow)
        : state.workflowHistory,
      workflow: {
        ...state.workflow,
        nodes: (() => {
          const nextNodes = applyNodeChanges(changes, state.workflow.nodes);
          if (removedNodeIds.size === 0) return nextNodes;
          return nextNodes.map((node) => {
            if (node.type !== "group" || !Array.isArray(node.data?.groupNodeIds)) {
              return node;
            }
            const nextGroupNodeIds = node.data.groupNodeIds.filter(
              (groupNodeId) => !removedNodeIds.has(groupNodeId)
            );
            if (nextGroupNodeIds.length === node.data.groupNodeIds.length) {
              return node;
            }
            return {
              ...node,
              data: {
                ...node.data,
                groupNodeIds: nextGroupNodeIds,
              },
            };
          });
        })(),
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

    const hasDuplicate = state.workflow.edges.some(
      (edge) =>
        edge.source === normalizedConnection.source &&
        edge.target === normalizedConnection.target &&
        (edge.sourceHandle ?? defaultSourceKey) === normalizedConnection.sourceHandle &&
        (edge.targetHandle ?? defaultTargetKey) === normalizedConnection.targetHandle
    );
    if (hasDuplicate) return;

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
    try {
      const state = get();
      const prunedWorkflow = pruneWorkflowState(state.workflow);
      const evaluated = evaluateWorkflow(
        prunedWorkflow.nodes,
        prunedWorkflow.edges,
        state.geometry
      );
    const seedApplied = applySeedGeometryNodesToGeometry(
      evaluated.nodes,
      state.geometry,
      state.cPlane
    );
      const evaluatedAfterSeed = evaluateWorkflow(
        seedApplied.nodes,
        evaluated.edges,
        seedApplied.geometry
      );
    const dependentApplied = applyDependentGeometryNodesToGeometry(
      evaluatedAfterSeed.nodes,
      seedApplied.geometry,
      state.cPlane
    );
    const evaluatedAfterCreate = evaluateWorkflow(
      dependentApplied.nodes,
      evaluatedAfterSeed.edges,
      dependentApplied.geometry
    );
    const upstreamTouched = new Set<string>([
      ...seedApplied.touchedGeometryIds,
      ...dependentApplied.touchedGeometryIds,
    ]);
    const nodesWithResetTransforms = resetTransformCachesForGeometry(
      evaluatedAfterCreate.nodes,
      upstreamTouched
    );
    const moveApplied = applyMoveNodesToGeometry(
      nodesWithResetTransforms,
      dependentApplied.geometry
    );
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
      const pipeApplied = applyPipeSweepNodesToGeometry(
        booleanApplied.nodes,
        booleanApplied.geometry
      );
      const pipeMerged = applyPipeMergeNodesToGeometry(
        pipeApplied.nodes,
        pipeApplied.geometry
      );
      const offsetApplied = applyOffsetNodesToGeometry(
        pipeMerged.nodes,
        pipeMerged.geometry
      );
      const offsetSurfaceApplied = applyOffsetSurfaceNodesToGeometry(
        offsetApplied.nodes,
        offsetApplied.geometry
      );
      const filletApplied = applyFilletNodesToGeometry(
        offsetSurfaceApplied.nodes,
        offsetSurfaceApplied.geometry
      );
      const filletEdgesApplied = applyFilletEdgesNodesToGeometry(
        filletApplied.nodes,
        filletApplied.geometry
      );
      const tessellationApplied = applyTessellationNodesToGeometry(
        filletEdgesApplied.nodes,
        filletEdgesApplied.geometry
      );
      const thickenApplied = applyThickenMeshNodesToGeometry(
        tessellationApplied.nodes,
        tessellationApplied.geometry
      );
      const plasticwrapApplied = applyPlasticwrapNodesToGeometry(
        thickenApplied.nodes,
        thickenApplied.geometry
      );
      const solidApplied = applySolidNodesToGeometry(
        plasticwrapApplied.nodes,
        plasticwrapApplied.geometry
      );
      const fieldApplied = applyFieldTransformationNodesToGeometry(
        solidApplied.nodes,
        solidApplied.geometry
      );
      const arrayApplied = applyGeometryArrayNodesToGeometry(
        fieldApplied.nodes,
        fieldApplied.geometry
      );
      const isoApplied = applyIsosurfaceNodesToGeometry(
        arrayApplied.nodes,
        arrayApplied.geometry
      );
      const meshApplied = applyMeshConvertNodesToGeometry(
        isoApplied.nodes,
        isoApplied.geometry
      );
      const solverApplied = applyPhysicsSolverNodesToGeometry(
        meshApplied.nodes,
        meshApplied.geometry
      );
      const chemistryApplied = applyChemistrySolverNodesToGeometry(
        solverApplied.nodes,
        solverApplied.geometry
      );
      const importApplied = applyImportNodesToGeometry(
        chemistryApplied.nodes,
        chemistryApplied.geometry
      );
      const customMaterialApplied = applyCustomMaterialNodesToGeometry(
        importApplied.nodes,
        importApplied.geometry
      );
      const exportHandled = handleExportNodes(
        customMaterialApplied.nodes,
        customMaterialApplied.geometry
      );
      const finalEvaluated = evaluateWorkflow(
        exportHandled.nodes,
        evaluatedAfterCreate.edges,
        customMaterialApplied.geometry
      );
      const nextGeometry = customMaterialApplied.geometry;
      const previousIds = new Set(state.geometry.map((item) => item.id));
      const nextIds = new Set(nextGeometry.map((item) => item.id));
      const geometryIdsChanged =
        previousIds.size !== nextIds.size ||
        Array.from(nextIds).some((id) => !previousIds.has(id));
      const nextState: Partial<ProjectStore> = {
        geometry: nextGeometry,
        workflow: {
          nodes: finalEvaluated.nodes,
          edges: finalEvaluated.edges,
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
    } catch (error) {
      console.error("Workflow recalculation failed.", error);
    }
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
