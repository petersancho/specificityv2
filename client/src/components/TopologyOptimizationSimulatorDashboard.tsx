import React, { useState, useMemo, useEffect, useRef } from "react";
import styles from "./TopologyOptimizationSimulatorDashboard.module.css";
import { useProjectStore } from "../store/useProjectStore";
import { computeMeshArea } from "../geometry/mesh";
import { computeMeshVolumeAndCentroid } from "../geometry/physical";
import type { RenderMesh, Vec3 } from "../types";
import type { SimpParams, SolverFrame, SimulationState, SimulationHistory, GoalMarkers } from "./workflow/topology/types";
import { extractGoalMarkers } from "./workflow/topology/goals";
import { TopologyRenderer } from "./workflow/topology/TopologyRenderer";
import { TopologyConvergence } from "./workflow/topology/TopologyConvergence";
import { TopologyGeometryPreview } from "./workflow/topology/TopologyGeometryPreview";
import { generateGeometryFromDensities } from "./workflow/topology/geometryGeneratorV2";
import { applyPlasticwrapSmoothing } from "./workflow/topology/plasticwrapSmoothing";
import { generateIsosurfaceMeshFromDensities } from "./workflow/topology/isosurface";
import { semanticOpEnd, semanticOpStart } from "../semantic/semanticTracer";
import { SemanticOpsPanel } from "./workflow/SemanticOpsPanel";
import { useSemanticMetrics } from "../semantic/useSemanticMetrics";
import { getSemanticOpMeta } from "../semantic/semanticOpRegistry";
import LinguaLogo from "./LinguaLogo";

// ============================================================================
// TOPOLOGY OPTIMIZATION SIMULATOR DASHBOARD
// Visual-first, geometry-centric, modular simulator
// ============================================================================

const DEBUG = false; // Set to true for verbose logging

type TopologyOptimizationSimulatorDashboardProps = {
  nodeId: string;
  onClose: () => void;
};

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const toBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
};

const toString = (value: unknown, fallback: string) => {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
};

// Helper to calculate mesh bounds
const calculateMeshBounds = (mesh: RenderMesh): { min: Vec3; max: Vec3 } => {
  const positions = mesh.positions;
  if (positions.length === 0) {
    return { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } };
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
};

export const TopologyOptimizationSimulatorDashboard: React.FC<
  TopologyOptimizationSimulatorDashboardProps
> = ({ nodeId, onClose }) => {
  const [activeTab, setActiveTab] = useState<"setup" | "simulator" | "output">("simulator");
  const [scale, setScale] = useState(75);
  const [simulationState, setSimulationState] = useState<SimulationState>('idle');
  const [currentFrame, setCurrentFrame] = useState<SolverFrame | undefined>();
  const [history, setHistory] = useState<SimulationHistory>({
    compliance: [],
    change: [],
    vol: []
  });
  const [markers, setMarkers] = useState<GoalMarkers | null>(null);
  const [previewGeometry, setPreviewGeometry] = useState<RenderMesh | null>(null);
  const [semanticRunId, setSemanticRunId] = useState<string | null>(null);
  const lastUiUpdateRef = useRef(0);
  const lastPreviewUpdateRef = useRef(0);
  const lastRoslynSyncRef = useRef(0);
  const previewBusyRef = useRef(false);
  const lastFrameRef = useRef<SolverFrame | null>(null);
  const geometryGeneratedRef = useRef(false);
  const semanticRunIdRef = useRef<string | null>(null);
  const baseMeshRef = useRef<RenderMesh | null>(null);
  const previewMeshIdRef = useRef<string | null>(null);
  const stallCountRef = useRef(0);
  const stabilityGuardRef = useRef(false);
  
  const solverGeneratorRef = useRef<AsyncGenerator<SolverFrame> | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);

  const {
    nodes,
    edges,
    updateNodeData,
    geometry,
    addGeometryMesh,
    syncWorkflowGeometryToRoslyn,
    toggleGeometryVisibility,
  } = useProjectStore(
    (state) => ({
      nodes: state.workflow.nodes,
      edges: state.workflow.edges,
      updateNodeData: state.updateNodeData,
      geometry: state.geometry,
      addGeometryMesh: state.addGeometryMesh,
      syncWorkflowGeometryToRoslyn: state.syncWorkflowGeometryToRoslyn,
      toggleGeometryVisibility: state.toggleGeometryVisibility,
    })
  );

  const solverNode = useMemo(
    () => nodes.find((node) => node.id === nodeId),
    [nodes, nodeId]
  );

  const parameters = solverNode?.data?.parameters ?? {};
  const outputs = solverNode?.data?.outputs ?? {};

  const semanticMetrics = useSemanticMetrics({
    nodeId,
    runId: semanticRunId ?? "default",
  });
  const recentSemanticEvents = useMemo(
    () => semanticMetrics.events.slice(-8).reverse(),
    [semanticMetrics.events]
  );

  const inputOverrides = useMemo(() => {
    const overrides = new Map<string, unknown>();
    const outputKeyFallback = (sourceNode?: typeof nodes[number]) => {
      if (!sourceNode?.data?.outputs) return null;
      if ("value" in sourceNode.data.outputs) return "value";
      const keys = Object.keys(sourceNode.data.outputs);
      return keys.length > 0 ? keys[0] : null;
    };

    for (const edge of edges) {
      if (edge.target !== nodeId) continue;
      const targetHandle = edge.targetHandle;
      if (!targetHandle) continue;
      const sourceNode = nodes.find((node) => node.id === edge.source);
      if (!sourceNode?.data?.outputs) continue;
      const outputKey = edge.sourceHandle ?? outputKeyFallback(sourceNode);
      if (!outputKey) continue;
      overrides.set(targetHandle, sourceNode.data.outputs[outputKey]);
    }
    return overrides;
  }, [edges, nodeId, nodes]);

  const resolveNumber = (key: string, fallback: number) => {
    if (inputOverrides.has(key)) {
      return toNumber(inputOverrides.get(key), fallback);
    }
    return toNumber((parameters as Record<string, unknown>)[key], fallback);
  };

  const resolveBoolean = (key: string, fallback: boolean) => {
    if (inputOverrides.has(key)) {
      return toBoolean(inputOverrides.get(key), fallback);
    }
    return toBoolean((parameters as Record<string, unknown>)[key], fallback);
  };

  const resolveString = (key: string, fallback: string) => {
    if (inputOverrides.has(key)) {
      return toString(inputOverrides.get(key), fallback);
    }
    return toString((parameters as Record<string, unknown>)[key], fallback);
  };

  // SIMP parameters
  const nx = resolveNumber("nx", 80);
  const ny = resolveNumber("ny", 60);
  const nz = resolveNumber("nz", 1);
  const volFrac = resolveNumber("volFrac", 0.4);
  const penalStart = resolveNumber("penalStart", 1.0);
  const penalEnd = resolveNumber("penalEnd", 3.0);
  const penalRampIters = resolveNumber("penalRampIters", 60);
  const rmin = resolveNumber("rmin", 1.5);
  const move = resolveNumber("move", 0.15);
  const maxIters = resolveNumber("maxIters", 150);
  const tolChange = resolveNumber("tolChange", 0.001);
  const E0 = resolveNumber("E0", 1.0);
  const Emin = resolveNumber("Emin", 1e-9);
  const rhoMin = resolveNumber("rhoMin", 1e-3);
  const nu = resolveNumber("nu", 0.3);
  const cgTol = resolveNumber("cgTol", 1e-6);
  const cgMaxIters = resolveNumber("cgMaxIters", 1000);
  
  // Geometry generation parameters
  const densityThreshold = resolveNumber("densityThreshold", 0.3);
  const maxLinksPerPoint = resolveNumber("maxLinksPerPoint", 6);
  const maxSpanLength = resolveNumber("maxSpanLength", 1.5);
  const pipeRadius = resolveNumber("pipeRadius", 0.045);
  const pipeSegmentsRaw = resolveNumber("pipeSegments", 12);
  const pipeSegments = Math.max(6, Math.min(32, Math.round(pipeSegmentsRaw)));
  const liveRoslyn = resolveBoolean("liveRoslyn", true);
  const plasticwrapEnabled = resolveBoolean("plasticwrapEnabled", true);
  const plasticwrapDistance = resolveNumber("plasticwrapDistance", 0.25);
  const plasticwrapSmooth = resolveNumber("plasticwrapSmooth", 0.55);
  const roslynSyncInterval = resolveNumber("roslynSyncInterval", 1500);
  const convergenceStrategy = resolveString("convergenceStrategy", "balanced");
  const strategyKeyRaw = convergenceStrategy.toLowerCase();
  const strategyKey = ["steady", "balanced", "turbo"].includes(strategyKeyRaw)
    ? strategyKeyRaw
    : "balanced";
  const emitEvery =
    strategyKey === "steady" ? 1 : strategyKey === "turbo" ? (nz > 1 ? 4 : 3) : (nz > 1 ? 3 : 2);
  const yieldEvery = emitEvery;
  const cgBoostFactor = strategyKey === "steady" ? 4 : strategyKey === "turbo" ? 2 : 3;
  const cgMaxMultiplier = strategyKey === "steady" ? 1.5 : strategyKey === "turbo" ? 0.7 : 1;
  const effectiveCgMaxIters = Math.max(50, Math.round(cgMaxIters * cgMaxMultiplier));
  const clearcoatIntensity = resolveNumber("clearcoatIntensity", 0.6);
  const clearcoatRoughness = resolveNumber("clearcoatRoughness", 0.2);
  const liveFrame = currentFrame ?? lastFrameRef.current;
  const liveIteration = liveFrame?.iter ?? 0;
  const liveCompliance = liveFrame?.compliance ?? 0;
  const liveChange = liveFrame?.change ?? 0;
  const liveVolume = liveFrame?.vol ?? 0;
  const liveFeIters = liveFrame?.feIters ?? null;
  const liveFeConverged = liveFrame?.feConverged;

  // Check connections
  const geometryEdge = useMemo(
    () => edges.find((edge) => edge.target === nodeId && edge.targetHandle === "geometry"),
    [edges, nodeId]
  );
  const goalEdges = useMemo(
    () => edges.filter((edge) => edge.target === nodeId && edge.targetHandle === "goals"),
    [edges, nodeId]
  );

  const hasGeometry = !!geometryEdge;
  const goalsCount = goalEdges.length;

  // Get geometry and goals
  const resolveBaseMesh = (geometryList = geometry) => {
    if (!geometryEdge) return null;

    const sourceNode = nodes.find((n) => n.id === geometryEdge.source);
    if (!sourceNode) return null;

    if (DEBUG) console.log('[TOPOLOGY] Source node type:', sourceNode.type);

    const directGeometry = sourceNode.data?.outputs?.geometry;
    if (typeof directGeometry === "string") {
      const geom = geometryList.find((g) => g.id === directGeometry);
      if (geom?.type === "mesh") {
        if (DEBUG) console.log('[TOPOLOGY] Using mesh from geometry output id');
        return geom.mesh;
      }
    }
    if (directGeometry && typeof directGeometry === "object" && "type" in directGeometry) {
      const geomObj = directGeometry as { type: string; mesh?: RenderMesh };
      if (geomObj.type === "mesh" && geomObj.mesh) {
        if (DEBUG) console.log("[TOPOLOGY] Using mesh from direct geometry output");
        return geomObj.mesh;
      }
    }
    if (directGeometry && typeof directGeometry === "object" && "mesh" in directGeometry) {
      const geomObj = directGeometry as { mesh?: RenderMesh };
      if (geomObj.mesh) {
        if (DEBUG) console.log("[TOPOLOGY] Using mesh from geometry output mesh");
        return geomObj.mesh;
      }
    }

    const geometryId =
      sourceNode.data?.geometryId ||
      sourceNode.data?.outputs?.geometryId ||
      (typeof directGeometry === "string" ? directGeometry : undefined);
    if (geometryId) {
      const geom = geometryList.find((g) => g.id === geometryId);
      if (geom?.type === "mesh") {
        if (DEBUG) console.log("[TOPOLOGY] Using mesh from geometry store");
        return geom.mesh;
      }
    }

    return null;
  };

  const baseMesh = useMemo(
    () => resolveBaseMesh(),
    [geometryEdge, nodes, geometry]
  );

  useEffect(() => {
    if (baseMesh) {
      baseMeshRef.current = baseMesh;
    }
  }, [baseMesh]);

  const baseBounds = useMemo(() => {
    if (!baseMesh) return null;
    return calculateMeshBounds(baseMesh);
  }, [baseMesh]);

  const goals = useMemo(() => {
    const goalList: any[] = [];
    for (const edge of goalEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const goal = sourceNode?.data?.outputs?.goal;
      if (goal && typeof goal === 'object') {
        goalList.push(goal);
      }
    }
    return goalList;
  }, [goalEdges, nodes]);

  const baseVolume = useMemo(() => {
    if (!baseMesh) return 0;
    const { volume_m3 } = computeMeshVolumeAndCentroid(baseMesh);
    return Number.isFinite(volume_m3) ? volume_m3 : 0;
  }, [baseMesh]);

  const goalVolumeFraction = useMemo(() => {
    if (baseVolume <= 0) return null;
    const volumeGoal = goals.find((goal) => goal?.goalType === "volume");
    if (!volumeGoal || typeof volumeGoal !== "object") return null;
    const goalAny = volumeGoal as { target?: number; parameters?: Record<string, unknown> };
    const targetParam = goalAny.parameters?.targetVolume;
    const target =
      typeof goalAny.target === "number" && Number.isFinite(goalAny.target)
        ? goalAny.target
        : typeof targetParam === "number" && Number.isFinite(targetParam)
          ? targetParam
          : null;
    if (!target || target <= 0) return null;
    const ratio = target / baseVolume;
    return Math.max(0.05, Math.min(0.95, ratio));
  }, [baseVolume, goals]);

  const effectiveVolFrac = goalVolumeFraction ?? volFrac;

  const goalStiffness = useMemo(() => {
    const stiffnessGoal = goals.find((goal) => goal?.goalType === "stiffness");
    if (!stiffnessGoal || typeof stiffnessGoal !== "object") return null;
    const params = (stiffnessGoal as { parameters?: Record<string, unknown> }).parameters ?? {};
    const youngModulus =
      typeof params.youngModulus === "number" && Number.isFinite(params.youngModulus)
        ? params.youngModulus
        : null;
    const poissonRatio =
      typeof params.poissonRatio === "number" && Number.isFinite(params.poissonRatio)
        ? params.poissonRatio
        : null;
    return { youngModulus, poissonRatio };
  }, [goals]);

  const effectiveE0 = goalStiffness?.youngModulus ?? E0;
  const effectiveNu = goalStiffness?.poissonRatio ?? nu;

  // Parameter change handler
  const handleParameterChange = (key: string, value: number | string) => {
    updateNodeData(nodeId, { parameters: { [key]: value } }, { recalculate: false });
  };

  const handleBooleanChange = (key: string, value: boolean) => {
    updateNodeData(nodeId, { parameters: { [key]: value } }, { recalculate: false });
  };

  const beginSemanticRun = () => {
    const runId = `${nodeId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
    semanticRunIdRef.current = runId;
    setSemanticRunId(runId);
    return runId;
  };

  const markSemanticInstant = (opId: string, ok = true, error?: string) => {
    const runId = semanticRunIdRef.current;
    if (!runId) return;
    semanticOpStart({ nodeId, runId, opId });
    semanticOpEnd({ nodeId, runId, opId, ok, error });
  };

  const formatSemanticOp = (opId: string) => {
    const meta = getSemanticOpMeta(opId);
    return meta?.label ?? opId;
  };

  // Extract goal markers
  const sameMarkers = (a: GoalMarkers | null, b: GoalMarkers | null) => {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.anchors.length !== b.anchors.length || a.loads.length !== b.loads.length) return false;
    const equalVec = (v1: Vec3, v2: Vec3) =>
      v1.x === v2.x && v1.y === v2.y && v1.z === v2.z;
    for (let i = 0; i < a.anchors.length; i += 1) {
      if (!equalVec(a.anchors[i].position, b.anchors[i].position)) return false;
    }
    for (let i = 0; i < a.loads.length; i += 1) {
      if (!equalVec(a.loads[i].position, b.loads[i].position)) return false;
      if (!equalVec(a.loads[i].force, b.loads[i].force)) return false;
    }
    return true;
  };

  useEffect(() => {
    if (DEBUG) console.log('[TOPOLOGY] Extracting goal markers...');
    
    if (!baseMesh || !hasGeometry) {
      setMarkers((prev) => (prev ? null : prev));
      return;
    }

    try {
      const extracted = extractGoalMarkers(baseMesh, goals);
      if (DEBUG) console.log('[TOPOLOGY] ✅ Extracted goal markers:', extracted);
      setMarkers((prev) => (sameMarkers(prev, extracted) ? prev : extracted));
    } catch (error) {
      console.error('[TOPOLOGY] ❌ Failed to extract goal markers:', error);
      setMarkers((prev) => (prev ? null : prev));
    }
  }, [baseMesh, goals, hasGeometry]);


  // Generate and register 3D geometry from converged density field
  const generateAndRegisterGeometry = (frame: SolverFrame, mesh: RenderMesh) => {
    const runId = semanticRunIdRef.current;
    if (runId) {
      semanticOpStart({ nodeId, runId, opId: "simulator.topology.finalize" });
    }
    try {
      // Calculate bounds from mesh
      const bounds = calculateMeshBounds(mesh);
      
      // Generate geometry from density field
      // Convert Float32Array to Float64Array if needed
      const densities = frame.densities instanceof Float64Array 
        ? frame.densities 
        : new Float64Array(frame.densities);
      
      const geometryOutput = generateGeometryFromDensities(
        {
          densities,
          nx,
          ny,
          nz,
          bounds,
        },
        densityThreshold,
        maxLinksPerPoint,
        maxSpanLength,
        pipeRadius,
        pipeSegments
      );
      const isoMesh = generateIsosurfaceMeshFromDensities(
        {
          densities,
          nx,
          ny,
          nz,
          bounds,
        },
        densityThreshold,
        {
          filterRadius: rmin,
          iter: frame.iter,
          rampIters: penalRampIters,
          betaStart: 2,
          betaEnd: 16,
          eta: 0.5,
          refineFactor: 2,
          smoothing: {
            iterations: 15,
            lambda: 0.5,
            mu: -0.53,
          },
        }
      );

      const optimizedMesh = plasticwrapEnabled
        ? applyPlasticwrapSmoothing(isoMesh, {
            distance: plasticwrapDistance,
            smooth: plasticwrapSmooth,
          })
        : isoMesh;
      if (plasticwrapEnabled) {
        markSemanticInstant("simulator.topology.plasticwrap");
      }
      
      // Register geometries in the store
      if (DEBUG) {
        console.log('[GEOM] Registering geometries in store...');
        console.log('[GEOM] Node ID:', nodeId);
      }
      
      const cachedPointCloudId =
        typeof parameters.pointCloudId === "string"
          ? parameters.pointCloudId
          : typeof outputs.pointCloud === "string"
            ? outputs.pointCloud
            : undefined;
      const cachedCurveNetworkId =
        typeof parameters.curveNetworkId === "string"
          ? parameters.curveNetworkId
          : typeof outputs.curveNetwork === "string"
            ? outputs.curveNetwork
            : undefined;
      const cachedOptimizedMeshId =
        typeof parameters.optimizedMeshId === "string"
          ? parameters.optimizedMeshId
          : typeof outputs.optimizedMesh === "string"
            ? outputs.optimizedMesh
            : undefined;

      const pointCloudId = addGeometryMesh(geometryOutput.pointCloud, { 
        sourceNodeId: nodeId,
        recordHistory: false,
        geometryId: cachedPointCloudId,
        metadata: {
          generatedBy: "topology-optimization",
          type: "point-cloud",
          label: "Topology Points",
          customMaterial: { hex: "#FFDD00" },
        },
      });
      if (DEBUG) console.log('[GEOM] Registered point cloud:', pointCloudId);
      
      const curveNetworkId = addGeometryMesh(geometryOutput.curveNetwork, { 
        sourceNodeId: nodeId,
        recordHistory: false,
        geometryId: cachedCurveNetworkId,
        metadata: {
          generatedBy: "topology-optimization",
          type: "curve-network",
          label: "Topology Curves",
          customMaterial: { hex: "#FF0099" },
        },
      });
      if (DEBUG) console.log('[GEOM] Registered curve network:', curveNetworkId);
      
      const multipipeId = addGeometryMesh(optimizedMesh, { 
        sourceNodeId: nodeId,
        recordHistory: false,
        geometryId: cachedOptimizedMeshId,
        metadata: {
          generatedBy: "topology-optimization",
          type: "isosurface",
          label: "Topology Surface",
          customMaterial: {
            hex: "#00D4FF",
            sheenIntensity: 0.22,
            ambientStrength: 0.62,
            clearcoatIntensity,
            clearcoatRoughness,
          },
        },
      });
      if (DEBUG) console.log('[GEOM] Registered surface:', multipipeId);

      const surfaceArea = computeMeshArea(
        optimizedMesh.positions,
        optimizedMesh.indices
      );
      const { volume_m3 } = computeMeshVolumeAndCentroid(optimizedMesh);

      updateNodeData(
        nodeId,
        {
          geometryId: multipipeId,
          geometryIds: [pointCloudId, curveNetworkId, multipipeId],
          geometryType: "mesh",
          isLinked: true,
          parameters: {
            optimizedMeshId: multipipeId,
            pointCloudId,
            curveNetworkId,
            pointCount: geometryOutput.pointCount,
            curveCount: geometryOutput.curveCount,
            volume: volume_m3,
            surfaceArea,
            simulationStep: "complete",
          },
          topologyProgress: {
            iteration: frame.iter,
            objective: frame.compliance,
            constraint: frame.vol,
            status: "complete",
          },
          outputs: {
            optimizedMesh: multipipeId,
            pointCloud: pointCloudId,
            curveNetwork: curveNetworkId,
            pointCount: geometryOutput.pointCount,
            curveCount: geometryOutput.curveCount,
            volume: volume_m3,
            surfaceArea,
          },
        },
        { recalculate: true }
      );
      toggleGeometryVisibility(pointCloudId, true);
      toggleGeometryVisibility(curveNetworkId, true);
      toggleGeometryVisibility(multipipeId, true);
      syncWorkflowGeometryToRoslyn(nodeId);
      if (runId) {
        semanticOpEnd({ nodeId, runId, opId: "simulator.topology.finalize", ok: true });
      }
      
      if (DEBUG) {
        console.log(`[GEOM] ✅ Generated topology optimization geometry:
          - Point cloud: ${pointCloudId} (${geometryOutput.pointCount} points)
          - Curve network: ${curveNetworkId} (${geometryOutput.curveCount} curves)
          - Surface: ${multipipeId}`);
      }
      
    } catch (error) {
      if (runId) {
        semanticOpEnd({
          nodeId,
          runId,
          opId: "simulator.topology.finalize",
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      console.error('[GEOM] ❌ Failed to generate geometry from density field:', error);
      throw error;
    }
  };

  const registerPreviewGeometry = (mesh: RenderMesh, frame: SolverFrame) => {
    const runId = semanticRunIdRef.current;
    if (runId) {
      semanticOpStart({ nodeId, runId, opId: "simulator.topology.sync" });
    }
    try {
      const cachedOptimizedMeshId =
        typeof parameters.optimizedMeshId === "string"
          ? parameters.optimizedMeshId
          : typeof outputs.optimizedMesh === "string"
            ? outputs.optimizedMesh
            : previewMeshIdRef.current ?? undefined;

      const previewMeshId = addGeometryMesh(mesh, {
        sourceNodeId: nodeId,
        recordHistory: false,
        geometryId: cachedOptimizedMeshId,
        metadata: {
          generatedBy: "topology-optimization",
          type: "isosurface-preview",
          label: "Topology Preview Surface",
          customMaterial: {
            hex: "#00D4FF",
            sheenIntensity: 0.22,
            ambientStrength: 0.62,
            clearcoatIntensity,
            clearcoatRoughness,
          },
        },
      });
      previewMeshIdRef.current = previewMeshId;

      updateNodeData(
        nodeId,
        {
          geometryId: previewMeshId,
          geometryIds: [previewMeshId],
          geometryType: "mesh",
          isLinked: true,
          parameters: {
            optimizedMeshId: previewMeshId,
            simulationStep: "running",
          },
          topologyProgress: {
            iteration: frame.iter,
            objective: frame.compliance,
            constraint: frame.vol,
            status: "running",
          },
          outputs: {
            ...outputs,
            optimizedMesh: previewMeshId,
            volume: baseVolume > 0 ? baseVolume * frame.vol : frame.vol,
            surfaceArea: undefined,
          },
        },
        { recalculate: false }
      );
      toggleGeometryVisibility(previewMeshId, true);
      syncWorkflowGeometryToRoslyn(nodeId);
      if (runId) {
        semanticOpEnd({ nodeId, runId, opId: "simulator.topology.sync", ok: true });
      }
    } catch (error) {
      if (runId) {
        semanticOpEnd({
          nodeId,
          runId,
          opId: "simulator.topology.sync",
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      console.error("[TOPOLOGY] ❌ Failed to sync preview geometry:", error);
    }
  };
  

  const handleFrame = (frame: SolverFrame) => {
    lastFrameRef.current = frame;
    markSemanticInstant("simulator.topology.step");
    const now = performance.now();
    const shouldUpdateUi =
      now - lastUiUpdateRef.current > 50 ||
      frame.iter === 1 ||
      frame.converged;
    if (shouldUpdateUi) {
      lastUiUpdateRef.current = now;
      setCurrentFrame(frame);
      setHistory((prev) => {
        const nextCompliance = [...prev.compliance, frame.compliance];
        const nextChange = [...prev.change, frame.change];
        const nextVol = [...prev.vol, frame.vol];
        const limit = 400;
        return {
          compliance: nextCompliance.slice(-limit),
          change: nextChange.slice(-limit),
          vol: nextVol.slice(-limit),
        };
      });
    }

    if (frame.feConverged === false) {
      stallCountRef.current += 1;
    } else {
      stallCountRef.current = 0;
    }

    if (
      frame.feConverged === false &&
      stallCountRef.current >= 3 &&
      !stabilityGuardRef.current
    ) {
      stabilityGuardRef.current = true;
      updateNodeData(
        nodeId,
        {
          parameters: { convergenceStrategy: "steady" },
        },
        { recalculate: false }
      );
      const tunedCgMax = Math.max(50, Math.round(cgMaxIters * 1.5));
      workerRef.current?.postMessage({
        type: "tune",
        params: {
          emitEvery: 1,
          yieldEvery: 1,
          cgMaxIters: tunedCgMax,
          cgBoostFactor: 4,
        },
      });
      markSemanticInstant("simulator.topology.stabilityGuard");
    }

    if (baseMesh && !previewBusyRef.current && now - lastPreviewUpdateRef.current > 650) {
      previewBusyRef.current = true;
      lastPreviewUpdateRef.current = now;
      try {
        const bounds = calculateMeshBounds(baseMesh);
        const field = {
          densities: Float64Array.from(frame.densities),
          nx,
          ny,
          nz,
          bounds,
        };
        const previewMesh = generateIsosurfaceMeshFromDensities(
          field,
          densityThreshold,
          {
            filterRadius: rmin,
            iter: frame.iter,
            rampIters: penalRampIters,
            betaStart: 2,
            betaEnd: 16,
            eta: 0.5,
            refineFactor: 1,
            smoothing: {
              iterations: 4,
              lambda: 0.5,
              mu: -0.53,
            },
          }
        );
        setPreviewGeometry(previewMesh);
        markSemanticInstant("simulator.topology.preview");
        if (liveRoslyn && now - lastRoslynSyncRef.current > roslynSyncInterval) {
          lastRoslynSyncRef.current = now;
          registerPreviewGeometry(previewMesh, frame);
        }
      } catch (error) {
        console.error('[TOPOLOGY] Preview generation error:', error);
      } finally {
        previewBusyRef.current = false;
      }
    }

    if (frame.converged) {
      isRunningRef.current = false;
      setSimulationState('converged');
      markSemanticInstant("simulator.topology.converge");
      if (DEBUG) {
        console.log('[TOPOLOGY] Simulation converged! Generating geometry...');
        console.log('[TOPOLOGY] baseMesh:', baseMesh ? 'exists' : 'NULL');
        console.log('[TOPOLOGY] frame.densities:', frame.densities ? `${frame.densities.length} elements` : 'NULL');
      }
      if (baseMesh) {
        try {
          generateAndRegisterGeometry(frame, baseMesh);
          geometryGeneratedRef.current = true;
          if (DEBUG) console.log('[TOPOLOGY] ✅ Geometry generation completed successfully');
        } catch (error) {
          console.error('[TOPOLOGY] ❌ Geometry generation FAILED:', error);
        }
      } else {
        console.error('[TOPOLOGY] ❌ Cannot generate geometry: baseMesh is null');
      }
    }
  };

  // Start simulation
  const handleStart = async () => {
    if (simulationState === "running") return;
    if (goals.length === 0) {
      console.error('[TOPOLOGY] ❌ Cannot start: solver goals are required');
      setSimulationState('error');
      return;
    }

    let startMesh = baseMesh;
    if (!startMesh && geometryEdge) {
      const sourceNode = nodes.find((n) => n.id === geometryEdge.source);
      if (sourceNode) {
        syncWorkflowGeometryToRoslyn(sourceNode.id);
        startMesh = resolveBaseMesh(useProjectStore.getState().geometry);
      }
    }
    if (!startMesh) {
      console.error('[TOPOLOGY] ❌ Cannot start: missing geometry input');
      setSimulationState('error');
      return;
    }

    let startMarkers = markers;
    if (!startMarkers) {
      try {
        startMarkers = extractGoalMarkers(startMesh, goals);
        setMarkers(startMarkers);
      } catch (error) {
        console.error('[TOPOLOGY] ❌ Failed to extract goal markers:', error);
        startMarkers = null;
      }
    }
    if (!startMarkers) {
      console.error('[TOPOLOGY] ❌ Cannot start: missing goal markers');
      setSimulationState('error');
      return;
    }
    if (startMarkers.anchors.length === 0 || startMarkers.loads.length === 0) {
      console.error('[TOPOLOGY] ❌ Cannot start: anchor and load goals must define vertices');
      setSimulationState('error');
      return;
    }

    if (DEBUG) console.log('[TOPOLOGY] Starting simulation...');
    beginSemanticRun();
    markSemanticInstant("simulator.topology.initialize");
    
    isRunningRef.current = true;
    stallCountRef.current = 0;
    stabilityGuardRef.current = false;
    setSimulationState('running');
    setHistory({ compliance: [], change: [], vol: [] });
    setCurrentFrame(undefined);
    lastFrameRef.current = null;
    geometryGeneratedRef.current = false;
    previewMeshIdRef.current = null;
    updateNodeData(
      nodeId,
      {
        parameters: { simulationStep: "running" },
        topologyProgress: {
          iteration: 0,
          objective: 0,
          constraint: effectiveVolFrac,
          status: "running",
        },
      },
      { recalculate: false }
    );

    const simpParams: SimpParams = {
      nx, ny, nz,
      volFrac: effectiveVolFrac,
      penal: penalStart, // Will be updated via continuation
      penalStart,
      penalEnd,
      penalRampIters,
      rmin,
      move,
      maxIters,
      tolChange,
      E0: effectiveE0,
      Emin,
      rhoMin,
      nu: effectiveNu,
      cgTol,
      cgMaxIters: effectiveCgMaxIters,
      emitEvery,
      yieldEvery,
      cgBoostFactor,
    };

    if (DEBUG) console.log('[TOPOLOGY] SIMP parameters:', simpParams);

    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    const worker = new Worker(
      new URL("./workflow/topology/simpWorker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const message = event.data as { type: string; frame?: SolverFrame; error?: string };
      if (message.type === "frame" && message.frame) {
        handleFrame(message.frame);
      }
      if (message.type === "done") {
        isRunningRef.current = false;
        setSimulationState('converged');
        if (!geometryGeneratedRef.current && baseMesh && lastFrameRef.current) {
          try {
            generateAndRegisterGeometry(lastFrameRef.current, baseMesh);
            geometryGeneratedRef.current = true;
          } catch (error) {
            console.error('[TOPOLOGY] ❌ Geometry generation FAILED:', error);
          }
        }
      }
      if (message.type === "error") {
        console.error('Simulation error:', message.error);
        isRunningRef.current = false;
        setSimulationState('error');
      }
    };
    worker.onerror = (event) => {
      console.error('Simulation worker error:', event.message);
      isRunningRef.current = false;
      setSimulationState('error');
    };

    worker.postMessage({
      type: "start",
      mesh: startMesh,
      markers: startMarkers,
      params: simpParams,
    });
  };

  const handleSyncRoslyn = () => {
    const frame = lastFrameRef.current ?? currentFrame;
    const mesh = baseMesh ?? baseMeshRef.current;
    if (!frame || !mesh) return;
    if (previewGeometry) {
      registerPreviewGeometry(previewGeometry, frame);
      return;
    }
    try {
      const bounds = calculateMeshBounds(mesh);
      const previewMesh = generateIsosurfaceMeshFromDensities(
        {
          densities: Float64Array.from(frame.densities),
          nx,
          ny,
          nz,
          bounds,
        },
        densityThreshold,
        {
          filterRadius: rmin,
          iter: frame.iter,
          rampIters: penalRampIters,
          betaStart: 2,
          betaEnd: 16,
          eta: 0.5,
          refineFactor: 1,
          smoothing: {
            iterations: 4,
            lambda: 0.5,
            mu: -0.53,
          },
        }
      );
      setPreviewGeometry(previewMesh);
      registerPreviewGeometry(previewMesh, frame);
    } catch (error) {
      console.error("[TOPOLOGY] ❌ Failed to sync preview geometry:", error);
    }
  };

  const handleFinalizeNow = () => {
    const frame = lastFrameRef.current ?? currentFrame;
    const mesh = baseMesh ?? baseMeshRef.current;
    if (!frame || !mesh) return;
    try {
      generateAndRegisterGeometry(frame, mesh);
      geometryGeneratedRef.current = true;
    } catch (error) {
      console.error("[TOPOLOGY] ❌ Finalize failed:", error);
    }
  };

  // Pause simulation
  const handlePause = () => {
    if (simulationState === 'running') {
      isRunningRef.current = false;
      setSimulationState('paused');
      workerRef.current?.postMessage({ type: "pause" });
      markSemanticInstant("simulator.topology.pause");
    }
  };

  // Resume simulation
  const handleResume = () => {
    if (simulationState === 'paused') {
      isRunningRef.current = true;
      setSimulationState('running');
      workerRef.current?.postMessage({ type: "resume" });
      markSemanticInstant("simulator.topology.resume");
    }
  };

  // Reset simulation
  const handleReset = () => {
    isRunningRef.current = false;
    semanticRunIdRef.current = null;
    setSemanticRunId(null);
    stallCountRef.current = 0;
    stabilityGuardRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    solverGeneratorRef.current = null;
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "stop" });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setSimulationState('idle');
    setCurrentFrame(undefined);
    setHistory({ compliance: [], change: [], vol: [] });
    setPreviewGeometry(null);
    previewMeshIdRef.current = null;
    updateNodeData(
      nodeId,
      {
        parameters: { simulationStep: "idle" },
        topologyProgress: {
          iteration: 0,
          objective: 0,
          constraint: 0,
          status: "idle",
        },
      },
      { recalculate: false }
    );
    markSemanticInstant("simulator.topology.reset");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (simulationState !== "running") return;
    workerRef.current?.postMessage({
      type: "tune",
      params: {
        emitEvery,
        yieldEvery,
        cgMaxIters: effectiveCgMaxIters,
        cgBoostFactor,
      },
    });
  }, [simulationState, emitEvery, yieldEvery, effectiveCgMaxIters, cgBoostFactor]);

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardBody} style={{ fontSize: `${scale}%` }}>
        <div className={styles.header}>
          <div className={styles.headerBar} />
          <div className={styles.headerContent}>
            <div className={styles.title}>
              <div className={styles.titleRow}>
                <LinguaLogo size={22} withText />
                <span className={styles.titleGreek}>Τοπολογική Βελτιστοποίηση</span>
              </div>
              <span className={styles.titleEnglish}>Topology Optimization</span>
              <span className={styles.titleSubtext}>
                Euclid · SIMP Algorithm · Ontology Trace
              </span>
            </div>
            <div className={styles.headerControls}>
              <label className={styles.scaleControl}>
                Scale:
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                />
                <span>{scale}%</span>
              </label>
              <button className={styles.closeButton} onClick={onClose}>
                ✕
              </button>
            </div>
          </div>
        </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "setup" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("setup")}
        >
          Setup
        </button>
        <button
          className={`${styles.tab} ${activeTab === "simulator" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("simulator")}
        >
          Simulator
        </button>
        <button
          className={`${styles.tab} ${activeTab === "output" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("output")}
        >
          Output
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === "setup" && (
          <div className={styles.setupTab}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Connected Inputs</h3>
              <div className={styles.connectionStatus}>
                <div className={styles.connectionItem}>
                  <span className={styles.connectionLabel}>Geometry:</span>
                  <span
                    className={`${styles.connectionValue} ${
                      hasGeometry ? styles.connected : styles.disconnected
                    }`}
                  >
                    {hasGeometry ? "Connected" : "Not Connected"}
                  </span>
                </div>
                <div className={styles.connectionItem}>
                  <span className={styles.connectionLabel}>Goals:</span>
                  <span
                    className={`${styles.connectionValue} ${
                      goalsCount > 0 ? styles.connected : styles.optional
                    }`}
                  >
                    {goalsCount > 0 ? `${goalsCount} Connected` : "Optional"}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Grid Resolution</h3>
              
              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Resolution X
                  <span className={styles.parameterDescription}>
                    Number of elements in X direction (10-100)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={nx}
                    onChange={(e) => handleParameterChange("nx", Number(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{nx}</span>
                </div>
              </div>

              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Resolution Y
                  <span className={styles.parameterDescription}>
                    Number of elements in Y direction (10-100)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={ny}
                    onChange={(e) => handleParameterChange("ny", Number(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{ny}</span>
                </div>
              </div>

              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Resolution Z
                  <span className={styles.parameterDescription}>
                    Number of elements in Z direction (1-40)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    step="1"
                    value={nz}
                    onChange={(e) => handleParameterChange("nz", Number(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{nz}</span>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>SIMP Parameters</h3>
              
              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Volume Fraction
                  <span className={styles.parameterDescription}>
                    Target material usage (0.1-0.9)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={volFrac}
                    onChange={(e) => handleParameterChange("volFrac", Number(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{(volFrac * 100).toFixed(0)}%</span>
                </div>
              </div>

              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Penalty Start
                  <span className={styles.parameterDescription}>
                    Initial SIMP penalty (1.0-3.0, typically 1.0)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.1"
                    value={penalStart}
                    onChange={(e) => handleParameterChange("penalStart", Number(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{penalStart.toFixed(1)}</span>
                </div>
              </div>

              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Penalty End
                  <span className={styles.parameterDescription}>
                    Final SIMP penalty (2.0-5.0, typically 3.0)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="2.0"
                    max="5.0"
                    step="0.1"
                    value={penalEnd}
                    onChange={(e) => handleParameterChange("penalEnd", Number(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{penalEnd.toFixed(1)}</span>
                </div>
              </div>

              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Penalty Ramp Iterations
                  <span className={styles.parameterDescription}>
                    Iterations to ramp penalty (10-100)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={penalRampIters}
                    onChange={(e) => handleParameterChange("penalRampIters", Number(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{penalRampIters}</span>
                </div>
              </div>

              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Move Limit
                  <span className={styles.parameterDescription}>
                    Maximum density change per iteration (0.05-0.3)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="0.05"
                    max="0.3"
                    step="0.01"
                    value={move}
                    onChange={(e) => handleParameterChange("move", Number(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{move.toFixed(2)}</span>
                </div>
              </div>

              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Filter Radius
                  <span className={styles.parameterDescription}>
                    Sensitivity filter radius (0.5-3.0)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={rmin}
                    onChange={(e) => handleParameterChange("rmin", Number(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{rmin.toFixed(1)}</span>
                </div>
              </div>

              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Max Iterations
                  <span className={styles.parameterDescription}>
                    Maximum solver iterations (10-200)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="10"
                    value={maxIters}
                    onChange={(e) => handleParameterChange("maxIters", Number(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{maxIters}</span>
                </div>
              </div>

              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Convergence Tolerance
                  <span className={styles.parameterDescription}>
                    Stopping criterion (0.0001-0.01)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="0.0001"
                    max="0.01"
                    step="0.0001"
                    value={tolChange}
                    onChange={(e) => handleParameterChange("tolChange", Number(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{tolChange.toFixed(4)}</span>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Convergence Strategy</h3>
              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Strategy
                  <span className={styles.parameterDescription}>
                    Balance speed vs stability by adapting emit cadence + CG iterations
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <select
                    className={styles.strategySelect}
                    value={strategyKey}
                    onChange={(e) =>
                      handleParameterChange("convergenceStrategy", e.target.value)
                    }
                  >
                    <option value="steady">Steady (stable)</option>
                    <option value="balanced">Balanced</option>
                    <option value="turbo">Turbo (fast)</option>
                  </select>
                  <span className={styles.parameterValue}>
                    emit:{emitEvery} · cg:{effectiveCgMaxIters}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Geometry Extraction</h3>

              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Density Threshold
                  <span className={styles.parameterDescription}>
                    Minimum density to keep (0.1-0.9)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={densityThreshold}
                    onChange={(e) =>
                      handleParameterChange("densityThreshold", Number(e.target.value))
                    }
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{densityThreshold.toFixed(2)}</span>
                </div>
              </div>

              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Max Links Per Point
                  <span className={styles.parameterDescription}>
                    Connectivity degree (2-8)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="2"
                    max="8"
                    step="1"
                    value={maxLinksPerPoint}
                    onChange={(e) =>
                      handleParameterChange("maxLinksPerPoint", Number(e.target.value))
                    }
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{maxLinksPerPoint}</span>
                </div>
              </div>

              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Max Span Length
                  <span className={styles.parameterDescription}>
                    Maximum link length (0.5-3.0)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={maxSpanLength}
                    onChange={(e) =>
                      handleParameterChange("maxSpanLength", Number(e.target.value))
                    }
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{maxSpanLength.toFixed(1)}</span>
                </div>
              </div>

              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Pipe Radius
                  <span className={styles.parameterDescription}>
                    Multipipe thickness (0.01-0.2)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="0.01"
                    max="0.2"
                    step="0.005"
                    value={pipeRadius}
                    onChange={(e) =>
                      handleParameterChange("pipeRadius", Number(e.target.value))
                    }
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{pipeRadius.toFixed(3)}</span>
                </div>
              </div>

              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Pipe Segments
                  <span className={styles.parameterDescription}>
                    Smoothness vs speed (6-32)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="6"
                    max="32"
                    step="1"
                    value={pipeSegments}
                    onChange={(e) =>
                      handleParameterChange("pipeSegments", Number(e.target.value))
                    }
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{pipeSegments}</span>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Refinement (Plasticwrap)</h3>
              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Wrap Distance
                  <span className={styles.parameterDescription}>
                    Post-process smoothing distance applied after convergence (0.05-1.0)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={plasticwrapDistance}
                    onChange={(e) =>
                      handleParameterChange("plasticwrapDistance", Number(e.target.value))
                    }
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{plasticwrapDistance.toFixed(2)}</span>
                </div>
              </div>
              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Wrap Smoothness
                  <span className={styles.parameterDescription}>
                    Higher values preserve the natural topology silhouette (0-1)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={plasticwrapSmooth}
                    onChange={(e) =>
                      handleParameterChange("plasticwrapSmooth", Number(e.target.value))
                    }
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{plasticwrapSmooth.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Material Finish</h3>
              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Clearcoat Intensity
                  <span className={styles.parameterDescription}>
                    Plastic wrap gloss strength (0-1)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={clearcoatIntensity}
                    onChange={(e) =>
                      handleParameterChange("clearcoatIntensity", Number(e.target.value))
                    }
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{clearcoatIntensity.toFixed(2)}</span>
                </div>
              </div>
              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Clearcoat Roughness
                  <span className={styles.parameterDescription}>
                    Lower values = tighter highlights (0.02-1.0)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="0.02"
                    max="1"
                    step="0.02"
                    value={clearcoatRoughness}
                    onChange={(e) =>
                      handleParameterChange("clearcoatRoughness", Number(e.target.value))
                    }
                    className={styles.slider}
                  />
                  <span className={styles.parameterValue}>{clearcoatRoughness.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "simulator" && (
          <div className={styles.simulatorTab}>
            <div className={styles.simulatorLayout}>
              <div className={styles.geometryView}>
                <h3 className={styles.viewTitle}>
                  {nz > 1 ? "SIMP Density Field (3D)" : "SIMP Density Field (2D)"}
                </h3>
                {markers && baseMesh ? (
                  <TopologyRenderer
                    fe={{ 
                      nx, 
                      ny, 
                      nz, 
                      numElements: nx * ny * nz, 
                      numNodes: (nx + 1) * (ny + 1) * (nz + 1), 
                      numDofs: (nx + 1) * (ny + 1) * (nz + 1) * 3, 
                      elementSize: { 
                        x: Math.max(1e-6, (baseBounds?.max.x ?? 1) - (baseBounds?.min.x ?? 0)) / nx, 
                        y: Math.max(1e-6, (baseBounds?.max.y ?? 1) - (baseBounds?.min.y ?? 0)) / ny, 
                        z:
                          nz > 1
                            ? Math.max(1e-6, (baseBounds?.max.z ?? 1) - (baseBounds?.min.z ?? 0)) / nz
                            : 0,
                      }, 
                      bounds: baseBounds ?? { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 0 } } 
                    }}
                    markers={markers}
                    frame={currentFrame}
                    width={600}
                    height={450}
                  />
                ) : (
                  <div className={styles.noGeometry}>
                    {hasGeometry ? 'Initializing...' : 'Connect geometry to begin'}
                  </div>
                )}
              </div>

              <div className={styles.geometryPreviewView}>
                <h3 className={styles.viewTitle}>Optimized Multipipe Preview (3D)</h3>
                <TopologyGeometryPreview
                  geometry={previewGeometry}
                  width={600}
                  height={450}
                />
                <div className={styles.previewHint}>
                  Drag to rotate • Updates every {emitEvery} iterations
                </div>
              </div>
            </div>

            <div className={styles.convergenceSection}>
              <div className={styles.convergenceView}>
                <h3 className={styles.viewTitle}>Convergence Monitor</h3>
                <TopologyConvergence
                  history={history}
                  width={1200}
                  height={250}
                />
              </div>
            </div>

            <div className={styles.simulatorMetrics}>
              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <span className={styles.metricTitle}>Live Telemetry</span>
                  <span className={styles.metricBadge}>{simulationState.toUpperCase()}</span>
                </div>
                <div className={styles.metricGrid}>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Iteration</span>
                    <span className={styles.metricValue}>{liveIteration}</span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Compliance</span>
                    <span className={styles.metricValue}>{liveCompliance.toFixed(4)}</span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Volume</span>
                    <span className={styles.metricValue}>{(liveVolume * 100).toFixed(1)}%</span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Change</span>
                    <span className={styles.metricValue}>{liveChange.toFixed(4)}</span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>FE Status</span>
                    <span className={styles.metricValue}>
                      {liveFeConverged === false
                        ? "Stalled"
                        : liveFeConverged === true
                          ? "Converged"
                          : "--"}
                    </span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>FE Iters</span>
                    <span className={styles.metricValue}>{liveFeIters ?? "--"}</span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Stalls</span>
                    <span className={styles.metricValue}>{stallCountRef.current}</span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Target Vol</span>
                    <span className={styles.metricValue}>{(effectiveVolFrac * 100).toFixed(1)}%</span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Density Cut</span>
                    <span className={styles.metricValue}>{densityThreshold.toFixed(2)}</span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Strategy</span>
                    <span className={styles.metricValue}>{strategyKey}</span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Emit Every</span>
                    <span className={styles.metricValue}>{emitEvery}</span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>CG Max</span>
                    <span className={styles.metricValue}>{effectiveCgMaxIters}</span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>CG Boost</span>
                    <span className={styles.metricValue}>{cgBoostFactor}x</span>
                  </div>
                </div>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <span className={styles.metricTitle}>Semantic Pulse</span>
                  <span className={styles.metricBadge}>
                    {semanticRunId ? "RUN" : "IDLE"}
                  </span>
                </div>
                <div className={styles.metricGrid}>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Ops</span>
                    <span className={styles.metricValue}>{semanticMetrics.totalOperations}</span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Errors</span>
                    <span className={styles.metricValue}>{semanticMetrics.totalErrors}</span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Duration</span>
                    <span className={styles.metricValue}>
                      {Math.round(semanticMetrics.totalDuration)}ms
                    </span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Run Id</span>
                    <span className={styles.metricValue}>
                      {semanticRunId ? semanticRunId.slice(0, 10) : "—"}
                    </span>
                  </div>
                </div>
                <div className={styles.semanticEvents}>
                  {recentSemanticEvents.length === 0 ? (
                    <div className={styles.noEvents}>Waiting for semantic ops…</div>
                  ) : (
                    recentSemanticEvents.map((event, index) => (
                      <div
                        key={`${event.opId}-${event.phase}-${event.t}-${index}`}
                        className={styles.semanticEvent}
                      >
                        <span className={styles.eventOp}>{formatSemanticOp(event.opId)}</span>
                        <span className={styles.eventPhase}>
                          {event.phase === "start" ? "start" : event.ok === false ? "error" : "end"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className={styles.metricCard}>
                <SemanticOpsPanel
                  nodeId={nodeId}
                  nodeType="topologyOptimizationSolver"
                  runId={semanticRunId ?? "default"}
                />
              </div>
            </div>

            <div className={styles.simulationControls}>
              <div className={styles.controlButtons}>
                {simulationState === 'idle' && (
                  <button
                    className={styles.startButton}
                    onClick={handleStart}
                    disabled={!markers || !(baseMesh || baseMeshRef.current)}
                  >
                    ▶ Start Optimization
                  </button>
                )}
                {simulationState === 'running' && (
                  <button
                    className={styles.pauseButton}
                    onClick={handlePause}
                  >
                    ⏸ Pause
                  </button>
                )}
                {simulationState === 'paused' && (
                  <>
                    <button
                      className={styles.resumeButton}
                      onClick={handleResume}
                    >
                      ▶ Resume
                    </button>
                    <button
                      className={styles.resetButton}
                      onClick={handleReset}
                    >
                      ⏹ Reset
                    </button>
                  </>
                )}
                {(simulationState === 'converged' || simulationState === 'error') && (
                  <button
                    className={styles.resetButton}
                    onClick={handleReset}
                  >
                    ⏹ Reset
                  </button>
                )}
                <button
                  className={styles.secondaryButton}
                  onClick={handleSyncRoslyn}
                  disabled={(!lastFrameRef.current && !currentFrame) || !(baseMesh || baseMeshRef.current)}
                >
                  ⟲ Sync Roslyn
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={handleFinalizeNow}
                  disabled={(!lastFrameRef.current && !currentFrame) || !(baseMesh || baseMeshRef.current)}
                >
                  ◆ Finalize Now
                </button>
              </div>

              <div className={styles.controlToggles}>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={liveRoslyn}
                    onChange={(event) =>
                      handleBooleanChange("liveRoslyn", event.target.checked)
                    }
                  />
                  <span>Live Roslyn</span>
                </label>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={plasticwrapEnabled}
                    onChange={(event) =>
                      handleBooleanChange("plasticwrapEnabled", event.target.checked)
                    }
                  />
                  <span>Plasticwrap</span>
                </label>
              </div>

              <div className={styles.statusDisplay}>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>State:</span>
                  <span className={`${styles.statusValue} ${styles[`status${simulationState.charAt(0).toUpperCase() + simulationState.slice(1)}`]}`}>
                    {simulationState.toUpperCase()}
                  </span>
                </div>
                {currentFrame && (
                  <>
                    <div className={styles.statusItem}>
                      <span className={styles.statusLabel}>Iteration:</span>
                      <span className={styles.statusValue}>{currentFrame.iter}</span>
                    </div>
                    <div className={styles.statusItem}>
                      <span className={styles.statusLabel}>Compliance:</span>
                      <span className={styles.statusValue}>{currentFrame.compliance.toFixed(2)}</span>
                    </div>
                    <div className={styles.statusItem}>
                      <span className={styles.statusLabel}>Volume:</span>
                      <span className={styles.statusValue}>{(currentFrame.vol * 100).toFixed(1)}%</span>
                    </div>
                    <div className={styles.statusItem}>
                      <span className={styles.statusLabel}>FE:</span>
                      <span className={styles.statusValue}>
                        {currentFrame.feConverged === false ? "Stalled" : "OK"}
                      </span>
                    </div>
                    <div className={styles.statusItem}>
                      <span className={styles.statusLabel}>CG Iters:</span>
                      <span className={styles.statusValue}>
                        {typeof currentFrame.feIters === "number" ? currentFrame.feIters : "-"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "output" && (
          <div className={styles.outputTab}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Simulation Results</h3>
              {currentFrame ? (
                <div className={styles.outputGrid}>
                  <div className={styles.outputItem}>
                    <span className={styles.outputLabel}>Final Iteration:</span>
                    <span className={styles.outputValue}>{currentFrame.iter}</span>
                  </div>
                  <div className={styles.outputItem}>
                    <span className={styles.outputLabel}>Final Compliance:</span>
                    <span className={styles.outputValue}>{currentFrame.compliance.toFixed(4)}</span>
                  </div>
                  <div className={styles.outputItem}>
                    <span className={styles.outputLabel}>Final Volume Fraction:</span>
                    <span className={styles.outputValue}>{(currentFrame.vol * 100).toFixed(2)}%</span>
                  </div>
                  <div className={styles.outputItem}>
                    <span className={styles.outputLabel}>Final Change:</span>
                    <span className={styles.outputValue}>{currentFrame.change.toFixed(6)}</span>
                  </div>
                  <div className={styles.outputItem}>
                    <span className={styles.outputLabel}>Converged:</span>
                    <span className={styles.outputValue}>{currentFrame.converged ? 'Yes' : 'No'}</span>
                  </div>
                  <div className={styles.outputItem}>
                    <span className={styles.outputLabel}>Grid Size:</span>
                    <span className={styles.outputValue}>{nx} × {ny} × {nz}</span>
                  </div>
                </div>
              ) : (
                <div className={styles.noResults}>
                  Run simulation to see results
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
