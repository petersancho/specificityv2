import { generateBoxMesh } from "../../geometry/mesh";
import type {
  Geometry,
  MeshGeometry,
  RenderMesh,
  Vec3,
  WorkflowEdge,
  WorkflowNode,
} from "../../types";
import { useProjectStore } from "../../store/useProjectStore";
import { findVertexIndicesAtExtent, wrapMeshGeometry } from "./rig-utils";

export type PhysicsAnalysisType = "static" | "dynamic" | "modal";

export type PhysicsSolverWorkflowOutputs = {
  geometry: string | null;
  mesh: RenderMesh;
  result: {
    success: boolean;
    iterations: number;
    finalObjectiveValue: number;
  };
  animation: { frames: RenderMesh[]; timeStamps: number[] } | null;
  stressField: number[];
  displacements: Vec3[];
};

export type ChemistrySolverWorkflowOutputs = {
  status: string;
  mesh: RenderMesh;
  materialParticles: Array<Record<string, unknown>>;
  materialField:
    | {
        resolution: { x: number; y: number; z: number };
        densities: number[];
      }
    | null;
  materials: Array<Record<string, unknown>>;
};

type ProjectStoreApi = typeof useProjectStore;

const resetProjectStore = (store: ProjectStoreApi) => {
  store.setState(store.getInitialState(), true);
};

const runWorkflowSynchronously = (store: ProjectStoreApi) => {
  // `recalculateWorkflow()` is synchronous today; we rely on node outputs +
  // geometry updates being available immediately after this call.
  store.getState().recalculateWorkflow();
};

const safeStringify = (value: unknown) => {
  try {
    const json = JSON.stringify(value);
    return json.length > 2000 ? `${json.slice(0, 2000)}…` : json;
  } catch {
    return "<unserializable details>";
  }
};

const ensureNonEmpty = (
  value: number[],
  label: string,
  context: string,
  details?: Record<string, unknown>
) => {
  if (!Array.isArray(value) || value.length === 0) {
    const extra = details ? ` details=${safeStringify(details)}` : "";
    throw new Error(
      `${label} is empty in ${context} (length=${value?.length ?? 0}).${extra}`
    );
  }
};

const ensureValidIndices = (
  indices: number[],
  maxIndexExclusive: number,
  label: string,
  context: string,
  details?: Record<string, unknown>
) => {
  ensureNonEmpty(indices, label, context, details);

  const invalid: number[] = [];
  for (const index of indices) {
    if (!Number.isInteger(index) || index < 0 || index >= maxIndexExclusive) {
      invalid.push(index);
    }
  }

  if (invalid.length > 0) {
    const baseDetails = {
      ...details,
      maxIndexExclusive,
      invalid,
    };
    const extra = ` details=${safeStringify(baseDetails)}`;
    throw new Error(`${label} contains invalid indices: [${invalid.join(", ")}].${extra}`);
  }
};

const createEmptyMesh = (): RenderMesh => ({
  positions: [],
  normals: [],
  uvs: [],
  indices: [],
});

const createBoxMeshGeometry = (id: string, options?: { size?: number }) => {
  const size = options?.size ?? 1;
  return {
    ...wrapMeshGeometry(
      id,
      generateBoxMesh({ width: size, height: size, depth: size }, 1)
    ),
    layerId: "layer-default",
  };
};

const computePhysicsRigIndices = (mesh: RenderMesh) => {
  const baseVertexCount = Math.floor(mesh.positions.length / 3);
  if (baseVertexCount === 0) {
    throw new Error("computePhysicsRigIndices: base mesh has zero vertices.");
  }

  const anchorIndices = findVertexIndicesAtExtent(mesh, "y", "min");
  const loadIndices = findVertexIndicesAtExtent(mesh, "y", "max");
  const stiffnessCandidates = findVertexIndicesAtExtent(mesh, "x", "min");

  const stiffnessIndices = stiffnessCandidates.length > 0 ? stiffnessCandidates : loadIndices;
  const stiffnessSource =
    stiffnessCandidates.length > 0
      ? { axis: "x", extent: "min" }
      : { axis: "y", extent: "max", fallback: "loadIndices" };

  return {
    baseVertexCount,
    anchorIndices,
    loadIndices,
    stiffnessIndices,
    stiffnessSource,
  };
};

const applyRigState = (
  store: ProjectStoreApi,
  args: {
    geometry: Geometry[];
    workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
    selectedGeometryIds: string[];
  }
) => {
  const current = store.getState();
  store.setState({
    geometry: args.geometry,
    workflow: { ...current.workflow, ...args.workflow },
    selectedGeometryIds: args.selectedGeometryIds,
    workflowHistory: [],
  });
};

export const runPhysicsSolverWorkflowRig = (
  analysisType: PhysicsAnalysisType,
  store: ProjectStoreApi = useProjectStore
) => {
  resetProjectStore(store);

  const baseGeometryId = "physics-base";
  const outputGeometryId = `physics-${analysisType}-out`;
  const animationFrames = analysisType === "static" ? 0 : 20;
  const maxIterations = 120;
  const timeProfileId = "node-physics-time-profile";

  const baseGeometry = createBoxMeshGeometry(baseGeometryId);
  const { baseVertexCount, anchorIndices, loadIndices, stiffnessIndices, stiffnessSource } =
    computePhysicsRigIndices(baseGeometry.mesh);
  const outputGeometry: MeshGeometry = {
    id: outputGeometryId,
    type: "mesh",
    mesh: createEmptyMesh(),
    layerId: "layer-default",
    sourceNodeId: "node-physics-solver",
    metadata: {
      label: `Physics Solver Output (${analysisType})`,
    },
  };

  ensureValidIndices(anchorIndices, baseVertexCount, "anchor indices", "runPhysicsSolverWorkflowRig", {
    analysisType,
    geometryId: baseGeometryId,
    axis: "y",
    extent: "min",
    baseVertexCount,
    count: anchorIndices.length,
  });
  ensureValidIndices(loadIndices, baseVertexCount, "load indices", "runPhysicsSolverWorkflowRig", {
    analysisType,
    geometryId: baseGeometryId,
    axis: "y",
    extent: "max",
    baseVertexCount,
    count: loadIndices.length,
  });
  ensureValidIndices(
    stiffnessIndices,
    baseVertexCount,
    "stiffness indices",
    "runPhysicsSolverWorkflowRig",
    {
      analysisType,
      geometryId: baseGeometryId,
      ...stiffnessSource,
      baseVertexCount,
      count: stiffnessIndices.length,
    }
  );

  const nodes: WorkflowNode[] = [
    {
      id: "node-physics-geo-ref",
      type: "geometryReference",
      position: { x: 0, y: 0 },
      data: {
        geometryId: baseGeometryId,
      },
    },
    {
      id: "node-physics-anchor-list",
      type: "listCreate",
      position: { x: 0, y: 180 },
      data: {
        parameters: {
          itemsText: anchorIndices.join(", "),
        },
      },
    },
    {
      id: "node-physics-load-list",
      type: "listCreate",
      position: { x: 0, y: 320 },
      data: {
        parameters: {
          itemsText: loadIndices.join(", "),
        },
      },
    },
    {
      id: "node-physics-stiffness-list",
      type: "listCreate",
      position: { x: 0, y: 400 },
      data: {
        parameters: {
          itemsText: stiffnessIndices.join(", "),
        },
      },
    },
    ...(analysisType === "dynamic"
      ? ([
          {
            id: timeProfileId,
            type: "listCreate",
            position: { x: 0, y: 460 },
            data: {
              parameters: {
                itemsText: "0, 0.5, 1, 0.5, 0",
              },
            },
          },
        ] satisfies WorkflowNode[])
      : []),
    {
      id: "node-physics-anchor-goal",
      type: "anchorGoal",
      position: { x: 220, y: 180 },
      data: {
        parameters: {
          anchorType: "fixed",
          weight: 1.0,
        },
      },
    },
    {
      id: "node-physics-load-goal",
      type: "loadGoal",
      position: { x: 220, y: 320 },
      data: {
        parameters: {
          forceX: 0,
          forceY: 0,
          forceZ: -1500,
          distributed: true,
          loadType: analysisType === "dynamic" ? "dynamic" : "static",
          weight: 1.0,
        },
      },
    },
    {
      id: "node-physics-volume-goal",
      type: "volumeGoal",
      position: { x: 220, y: 460 },
      data: {
        parameters: {
          materialDensity: 7850,
          allowedDeviation: 0.05,
          weight: 0.8,
        },
      },
    },
    {
      id: "node-physics-stiffness-goal",
      type: "stiffnessGoal",
      position: { x: 220, y: 600 },
      data: {
        parameters: {
          youngModulus: 200e9,
          poissonRatio: 0.3,
          weight: 1.0,
        },
      },
    },
    {
      id: "node-physics-solver",
      type: "physicsSolver",
      position: { x: 460, y: 260 },
      data: {
        geometryId: outputGeometryId,
        geometryType: "mesh",
        isLinked: true,
        parameters: {
          analysisType,
          maxIterations,
          convergenceTolerance: 1e-5,
          animationFrames,
          timeStep: analysisType === "dynamic" ? 0.02 : undefined,
          maxDeformation: 10,
          maxStress: 1e9,
          useGPU: false,
          chunkSize: 64,
        },
      },
    },
  ];

  const edges: WorkflowEdge[] = [
    {
      id: "edge-geo-ref-to-solver",
      source: "node-physics-geo-ref",
      sourceHandle: "geometry",
      target: "node-physics-solver",
      targetHandle: "baseMesh",
    },
    {
      id: "edge-anchor-list-to-anchor-goal",
      source: "node-physics-anchor-list",
      sourceHandle: "list",
      target: "node-physics-anchor-goal",
      targetHandle: "vertices",
    },
    {
      id: "edge-load-list-to-load-goal",
      source: "node-physics-load-list",
      sourceHandle: "list",
      target: "node-physics-load-goal",
      targetHandle: "applicationPoints",
    },
    ...(analysisType === "dynamic"
      ? ([
          {
            id: "edge-time-profile-to-load-goal",
            source: timeProfileId,
            sourceHandle: "list",
            target: "node-physics-load-goal",
            targetHandle: "timeProfile",
          },
        ] satisfies WorkflowEdge[])
      : []),
    {
      id: "edge-stiffness-list-to-stiffness-goal",
      source: "node-physics-stiffness-list",
      sourceHandle: "list",
      target: "node-physics-stiffness-goal",
      targetHandle: "elements",
    },
    {
      id: "edge-anchor-to-solver",
      source: "node-physics-anchor-goal",
      sourceHandle: "goal",
      target: "node-physics-solver",
      targetHandle: "goals",
    },
    {
      id: "edge-load-to-solver",
      source: "node-physics-load-goal",
      sourceHandle: "goal",
      target: "node-physics-solver",
      targetHandle: "goals",
    },
    {
      id: "edge-volume-to-solver",
      source: "node-physics-volume-goal",
      sourceHandle: "goal",
      target: "node-physics-solver",
      targetHandle: "goals",
    },
    {
      id: "edge-stiffness-to-solver",
      source: "node-physics-stiffness-goal",
      sourceHandle: "goal",
      target: "node-physics-solver",
      targetHandle: "goals",
    },
  ];

  applyRigState(store, {
    geometry: [baseGeometry, outputGeometry],
    workflow: { nodes, edges },
    selectedGeometryIds: [baseGeometryId],
  });
  runWorkflowSynchronously(store);

  const state = store.getState();
  const solverNode = state.workflow.nodes.find((node) => node.id === "node-physics-solver");
  if (!solverNode) {
    throw new Error("Physics workflow rig is missing solver node.");
  }
  if (!solverNode.data?.outputs) {
    throw new Error("Physics workflow rig solver outputs missing.");
  }
  const outputs = solverNode.data.outputs as PhysicsSolverWorkflowOutputs;
  const nextOutputGeometry = state.geometry.find((item) => item.id === outputGeometryId);
  const nextBaseGeometry = state.geometry.find((item) => item.id === baseGeometryId);

  if (!nextOutputGeometry || nextOutputGeometry.type !== "mesh") {
    throw new Error("Physics workflow rig did not produce output geometry.");
  }
  if (!nextBaseGeometry || nextBaseGeometry.type !== "mesh") {
    throw new Error("Physics workflow rig base geometry missing.");
  }

  return {
    outputs,
    outputGeometry: nextOutputGeometry,
    baseGeometry: nextBaseGeometry,
    parameters: { analysisType, animationFrames, maxIterations },
  };
};

export const runChemistrySolverWorkflowRig = (store: ProjectStoreApi = useProjectStore) => {
  resetProjectStore(store);

  const baseGeometryId = "chemistry-domain";
  const outputGeometryId = "chemistry-out";

  const baseGeometry = createBoxMeshGeometry(baseGeometryId, { size: 1.2 });
  const outputGeometry: MeshGeometry = {
    id: outputGeometryId,
    type: "mesh",
    mesh: createEmptyMesh(),
    layerId: "layer-default",
    sourceNodeId: "node-chemistry-solver",
    metadata: { label: "Chemistry Solver Output" },
  };

  const nodes: WorkflowNode[] = [
    {
      id: "node-chemistry-geo-ref",
      type: "geometryReference",
      position: { x: 0, y: 0 },
      data: {
        geometryId: baseGeometryId,
      },
    },
    {
      id: "node-chemistry-blend-goal",
      type: "chemistryBlendGoal",
      position: { x: 240, y: 0 },
      data: {
        parameters: {
          smoothness: 0.65,
          diffusivity: 1,
          weight: 0.6,
        },
      },
    },
    {
      id: "node-chemistry-solver",
      type: "chemistrySolver",
      position: { x: 480, y: 0 },
      data: {
        geometryId: outputGeometryId,
        geometryType: "mesh",
        isLinked: true,
        parameters: {
          enabled: true,
          particleCount: 400,
          particleDensity: 0.5,
          iterations: 8,
          fieldResolution: 16,
          isoValue: 0.15,
          convergenceTolerance: 0.02,
          blendStrength: 0.6,
          historyLimit: 50,
          seed: 1,
          materialOrder: "Steel, Ceramic, Glass",
        },
      },
    },
  ];

  const edges: WorkflowEdge[] = [
    {
      id: "edge-domain-to-chemistry-solver",
      source: "node-chemistry-geo-ref",
      sourceHandle: "geometry",
      target: "node-chemistry-solver",
      targetHandle: "domain",
    },
    {
      id: "edge-blend-to-chemistry-solver",
      source: "node-chemistry-blend-goal",
      sourceHandle: "goal",
      target: "node-chemistry-solver",
      targetHandle: "goals",
    },
  ];

  applyRigState(store, {
    geometry: [baseGeometry, outputGeometry],
    workflow: { nodes, edges },
    selectedGeometryIds: [baseGeometryId],
  });
  runWorkflowSynchronously(store);

  const state = store.getState();
  const solverNode = state.workflow.nodes.find((node) => node.id === "node-chemistry-solver");
  if (!solverNode) {
    throw new Error("Chemistry workflow rig is missing solver node.");
  }
  if (!solverNode.data?.outputs) {
    throw new Error("Chemistry workflow rig solver outputs missing.");
  }
  const outputs = solverNode.data.outputs as ChemistrySolverWorkflowOutputs;
  const nextOutputGeometry = state.geometry.find((item) => item.id === outputGeometryId);

  if (!nextOutputGeometry || nextOutputGeometry.type !== "mesh") {
    throw new Error("Chemistry workflow rig did not produce output geometry.");
  }

  return {
    outputs,
    outputGeometry: nextOutputGeometry,
  };
};
