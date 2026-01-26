import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "reactflow";
import type {
  ECCRecord,
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
  RenderMesh,
  VertexGeometry,
  PolylineGeometry,
  SurfaceGeometry,
  LoftGeometry,
  ExtrudeGeometry,
  MeshPrimitiveGeometry,
  SceneNode,
  SelectionMode,
  SnapSettings,
  TransformOrientation,
  ViewSettings,
  Vec3,
  WorkflowNodeData,
  WorkflowState,
} from "../types";
import {
  generateSurfaceMesh,
  generateBoxMesh,
  generateSphereMesh,
  computeMeshArea,
} from "../geometry/mesh";

type SaveEntry = {
  id: string;
  name: string;
  savedAt: string;
};

type ComputedMetrics = {
  mass_kg: number;
  materialGWP_kgCO2e: number;
  gwpIntensity_kgCO2e_per_kg: number;
  compositeGWP_kgCO2e: number;
  assemblyGWP_kgCO2e: number;
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
    if (change.type === "add" || change.type === "remove") return true;
    if (change.type === "position") return !change.dragging;
    if (change.type === "reset") return true;
    return false;
  });

const shouldTrackEdgeChange = (changes: EdgeChange[]) =>
  changes.some((change) => change.type === "remove" || change.type === "reset");

type ProjectStore = {
  materials: Material[];
  ecc: ECCRecord[];
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
  pivot: PivotState;
  displayMode: DisplayMode;
  viewSettings: ViewSettings;
  snapSettings: SnapSettings;
  gridSettings: GridSettings;
  camera: CameraState;
  clipboard: ClipboardPayload | null;
  modelerHistoryPast: ModelerSnapshot[];
  modelerHistoryFuture: ModelerSnapshot[];
  workflow: WorkflowState;
  workflowHistory: WorkflowState[];
  dataValues: Record<string, number>;
  computed: ComputedMetrics;
  saves: SaveEntry[];
  currentSaveId: string | null;
  projectName: string;
  setMaterials: (materials: Material[]) => void;
  setEcc: (records: ECCRecord[]) => void;
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
  setPivotMode: (mode: PivotMode) => void;
  setPivotPosition: (position: Vec3) => void;
  setPivotCursorPosition: (position: Vec3 | null) => void;
  setPivotPickedPosition: (position: Vec3 | null) => void;
  setDisplayMode: (mode: DisplayMode) => void;
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
    layerId?: string;
  }) => string | null;
  addGeometryPolylineFromPoints: (
    points: Vec3[],
    options?: {
      closed?: boolean;
      degree?: 1 | 2 | 3;
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

export type NodeType =
  | "geometryReference"
  | "point"
  | "polyline"
  | "surface"
  | "box"
  | "sphere";

const supportedWorkflowNodeTypes: NodeType[] = [
  "geometryReference",
  "point",
  "polyline",
  "surface",
  "box",
  "sphere",
];

const pruneWorkflowState = (workflow: WorkflowState): WorkflowState => {
  const nodes = workflow.nodes.filter(
    (node) =>
      !node.type ||
      supportedWorkflowNodeTypes.includes(node.type as NodeType)
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
};

const defaultCamera: CameraState = {
  position: { x: 2, y: 2, z: 2 },
  target: { x: 0, y: 0, z: 0 },
  up: { x: 0, y: 1, z: 0 },
  preset: "blender",
  zoomToCursor: true,
  invertZoom: false,
  upright: false,
  orbitSpeed: 1,
  panSpeed: 1,
  zoomSpeed: 1,
  fov: 50,
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

const defaultNodes: Node<WorkflowNodeData>[] = [
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
    data: { label: "Point", geometryId: "vertex-1", point: { x: 0, y: 0, z: 0 } },
  },
];

const defaultEdges: Edge[] = [];

const defaultWorkflow: WorkflowState = {
  nodes: defaultNodes,
  edges: defaultEdges,
};

const emptyMetrics: ComputedMetrics = {
  mass_kg: 0,
  materialGWP_kgCO2e: 0,
  gwpIntensity_kgCO2e_per_kg: 0,
  compositeGWP_kgCO2e: 0,
  assemblyGWP_kgCO2e: 0,
};

const computeWorkflowOutputs = (
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
  materials: Material[],
  eccRecords: ECCRecord[],
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
      node.type === "polyline" ||
      node.type === "surface" ||
      node.type === "box" ||
      node.type === "sphere"
    ) {
      if (data.geometryId) {
        outputs.geometryId = data.geometryId;
        outputs.geometryType = data.geometryType ?? node.type;
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

    outputMap[node.id] = outputs;
  });

  const nextNodes = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      outputs: outputMap[node.id] ?? {},
    },
  }));

  return { nodes: nextNodes, dataValues: {}, metrics: emptyMetrics };
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
  ecc: [],
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
  pivot: defaultPivot,
  displayMode: "shaded",
  viewSettings: defaultViewSettings,
  snapSettings: defaultSnapSettings,
  gridSettings: defaultGridSettings,
  camera: defaultCamera,
  clipboard: null,
  modelerHistoryPast: [],
  modelerHistoryFuture: [],
  workflow: defaultWorkflow,
  workflowHistory: [],
  dataValues: {},
  computed: emptyMetrics,
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
  setEcc: (records) => {
    set({ ecc: records });
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
    set({ displayMode: mode });
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
          displayMode: state.displayMode,
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
      displayMode: get().displayMode,
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
      displayMode: snapshot.displayMode,
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
      displayMode: get().displayMode,
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
      displayMode: snapshot.displayMode,
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
        nodes: state.workflow.nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...data } }
            : node
        ),
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
    }
    get().recalculateWorkflow();
  },
  addNode: (type) => {
    const id = `node-${type}-${Date.now()}`;
    const position = { x: 120, y: 120 + Math.random() * 120 };
    const labels: Record<NodeType, string> = {
      geometryReference: "Geometry Reference",
      point: "Point",
      polyline: "Polyline",
      surface: "Surface",
      box: "Box",
      sphere: "Sphere",
    };
    const data: WorkflowNodeData = {
      label: labels[type],
    };
    if (type === "geometryReference") {
      data.geometryId = get().geometry[0]?.id ?? "vertex-1";
    }
    if (type === "point") {
      data.point = { x: 0, y: 0, z: 0 };
      const geometryId = createGeometryId("vertex");
      data.geometryId = geometryId;
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
    if (type === "polyline") {
      data.pointsText = "0 0 0  1 0 0  1 0 1";
      data.closed = false;
      const points = parsePointsText(data.pointsText);
      const vertexIds = points.map(() => createGeometryId("vertex"));
      data.vertexIds = vertexIds;
      const polylineId = createGeometryId("polyline");
      data.geometryId = polylineId;
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
      .filter(Boolean) as Node<WorkflowNodeData>[];
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
      const geometryIds = removedNodes
        .map((node) => node.data?.geometryId)
        .filter(Boolean) as string[];
      const vertexIds = removedNodes
        .flatMap((node) => node.data?.vertexIds ?? [])
        .filter(Boolean);
      const idsToDelete = Array.from(new Set([...geometryIds, ...vertexIds]));
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
    set((state) => ({
      workflowHistory: appendWorkflowHistory(
        state.workflowHistory,
        state.workflow
      ),
      workflow: {
        ...state.workflow,
        edges: addEdge(connection, state.workflow.edges),
      },
    }));
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
    const geometryIds = removedNodes
      .map((node) => node.data?.geometryId)
      .filter(Boolean) as string[];
    const vertexIds = removedNodes
      .flatMap((node) => node.data?.vertexIds ?? [])
      .filter(Boolean);
    const idsToDelete = Array.from(new Set([...geometryIds, ...vertexIds]));
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
    const outputs = computeWorkflowOutputs(
      prunedWorkflow.nodes,
      prunedWorkflow.edges,
      state.materials,
      state.ecc,
      state.geometry
    );
    set({
      workflow: { ...prunedWorkflow, nodes: outputs.nodes },
      dataValues: outputs.dataValues,
      computed: outputs.metrics,
    });
  },
  pruneWorkflow: () =>
    set((state) => {
      const prunedWorkflow = pruneWorkflowState(state.workflow);
      if (prunedWorkflow === state.workflow) return {};
      return { workflow: prunedWorkflow };
    }),
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
