import React, { useState, useMemo, useEffect, useRef } from "react";
import styles from "./TopologyOptimizationSimulatorDashboard.module.css";
import { useProjectStore } from "../store/useProjectStore";
import { computeMeshArea } from "../geometry/mesh";
import { computeMeshVolumeAndCentroid } from "../geometry/physical";
import type { RenderMesh, Vec3 } from "../types";
import type { SimpParams, SolverFrame, SimulationState, SimulationHistory, GoalMarkers } from "./workflow/topology/types";
import { is3DMode } from "./workflow/topology/simp";
import { extractGoalMarkers, generateGeometryFromDensities } from "./workflow/topology/geometry";
import { TopologyRenderer, TopologyConvergence, TopologyGeometryPreview } from "./workflow/topology/TopologyUI";
import { SimpWorkerClient } from "./workflow/topology/simpWorkerClient";

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
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState<SolverFrame | undefined>();
  const [history, setHistory] = useState<SimulationHistory>({
    compliance: [],
    change: [],
    vol: []
  });
  const [markers, setMarkers] = useState<GoalMarkers | null>(null);
  const [previewGeometry, setPreviewGeometry] = useState<RenderMesh | null>(null);
  
  const workerClientRef = useRef<SimpWorkerClient | null>(null);
  const isRunningRef = useRef(false);

  const updateNodeData = useProjectStore((state) => state.updateNodeData);
  const addGeometryMesh = useProjectStore((state) => state.addGeometryMesh);
  
  // Use stable selectors to avoid infinite loops
  const solverNode = useProjectStore((state) => 
    state.workflow.nodes.find((node) => node.id === nodeId)
  );
  
  const edges = useProjectStore((state) => state.workflow.edges);
  
  // Get only the edge IDs we need, not the entire arrays
  const geometryEdgeId = useMemo(() => {
    const edge = edges.find((edge) => edge.target === nodeId && edge.targetHandle === "geometry");
    return edge ? edge.source : null;
  }, [edges, nodeId]);
  
  const goalEdgeIds = useMemo(() => {
    return edges
      .filter((edge) => edge.target === nodeId && edge.targetHandle === "goals")
      .map(edge => edge.source);
  }, [edges, nodeId]);
  
  // Get specific nodes by ID (stable references)
  const geometrySourceNode = useProjectStore((state) => 
    geometryEdgeId ? state.workflow.nodes.find((n) => n.id === geometryEdgeId) : null
  );
  
  // Use JSON.stringify for deep comparison of goal nodes
  const goalSourceNodesRaw = useProjectStore((state) => {
    if (goalEdgeIds.length === 0) return [];
    return goalEdgeIds
      .map(id => state.workflow.nodes.find((n) => n.id === id))
      .filter((n): n is NonNullable<typeof n> => n !== undefined);
  });
  
  const goalSourceNodes = useMemo(() => goalSourceNodesRaw, [
    JSON.stringify(goalSourceNodesRaw.map(n => ({ id: n.id, data: n.data })))
  ]);
  
  const geometryStore = useProjectStore((state) => state.geometry);
  
  // Reconstruct edges for compatibility
  const geometryEdge = useMemo(() => 
    edges.find((edge) => edge.target === nodeId && edge.targetHandle === "geometry"),
    [edges, nodeId]
  );
  
  const goalEdges = useMemo(() => 
    edges.filter((edge) => edge.target === nodeId && edge.targetHandle === "goals"),
    [edges, nodeId]
  );

  const parameters = solverNode?.data?.parameters ?? {};
  const outputs = solverNode?.data?.outputs ?? {};

  // Get all source nodes for input overrides
  const inputSourceNodes = useProjectStore((state) => {
    const relevantEdges = state.workflow.edges.filter(e => e.target === nodeId);
    return relevantEdges.map(edge => ({
      edge,
      node: state.workflow.nodes.find(n => n.id === edge.source)
    })).filter(item => item.node);
  });

  const inputOverrides = useMemo(() => {
    const overrides = new Map<string, unknown>();
    const outputKeyFallback = (sourceNode?: any) => {
      if (!sourceNode?.data?.outputs) return null;
      if ("value" in sourceNode.data.outputs) return "value";
      const keys = Object.keys(sourceNode.data.outputs);
      return keys.length > 0 ? keys[0] : null;
    };

    for (const { edge, node: sourceNode } of inputSourceNodes) {
      const targetHandle = edge.targetHandle;
      if (!targetHandle) continue;
      if (!sourceNode?.data?.outputs) continue;
      const outputKey = edge.sourceHandle ?? outputKeyFallback(sourceNode);
      if (!outputKey) continue;
      overrides.set(targetHandle, sourceNode.data.outputs[outputKey]);
    }
    return overrides;
  }, [inputSourceNodes, nodeId]);

  const resolveNumber = (key: string, fallback: number) => {
    if (inputOverrides.has(key)) {
      return toNumber(inputOverrides.get(key), fallback);
    }
    return toNumber((parameters as Record<string, unknown>)[key], fallback);
  };

  // SIMP parameters
  const nx = resolveNumber("nx", 40);
  const ny = resolveNumber("ny", 30);
  const nz = resolveNumber("nz", 20);
  const volFrac = resolveNumber("volFrac", 0.4);
  const penalStart = resolveNumber("penalStart", 1.0);
  const penalEnd = resolveNumber("penalEnd", 3.0);
  const penalRampIters = resolveNumber("penalRampIters", 60);
  const rmin = resolveNumber("rmin", 1.2);
  const move = resolveNumber("move", 0.15);
  const maxIters = resolveNumber("maxIters", 80);
  const tolChange = resolveNumber("tolChange", 0.001);
  const E0 = resolveNumber("E0", 1.0);
  const Emin = resolveNumber("Emin", 1e-9);
  const rhoMin = resolveNumber("rhoMin", 1e-3);
  const nu = resolveNumber("nu", 0.3);
  const cgTol = resolveNumber("cgTol", 1e-6);
  const cgMaxIters = resolveNumber("cgMaxIters", 120);
  
  // Geometry generation parameters (optimized for stability over quality)
  const densityThreshold = resolveNumber("densityThreshold", 0.3);
  const maxLinksPerPoint = resolveNumber("maxLinksPerPoint", 4);  // Reduced from 6 for simpler topology
  const maxSpanLength = resolveNumber("maxSpanLength", 1.2);      // Reduced from 1.5 for fewer curves
  const pipeRadius = resolveNumber("pipeRadius", 0.035);          // Reduced from 0.045 for less geometry
  const pipeSegmentsRaw = resolveNumber("pipeSegments", 6);       // Reduced from 12 for pixelated look
  const pipeSegments = Math.max(4, Math.min(32, Math.round(pipeSegmentsRaw)));

  const hasGeometry = !!geometryEdge;
  const goalsCount = goalEdges.length;

  // Get geometry and goals
  const baseMesh = useMemo(() => {
    if (!geometryEdge || !geometrySourceNode) return null;
    
    if (DEBUG) console.log('[TOPOLOGY] Source node type:', geometrySourceNode.type);
    
    // Try direct geometry output first (Box Builder, Sphere, etc.)
    const directGeometry = geometrySourceNode.data?.outputs?.geometry;
    if (directGeometry && typeof directGeometry === 'object' && 'type' in directGeometry) {
      const geomObj = directGeometry as { type: string; mesh?: RenderMesh };
      if (geomObj.type === 'mesh' && geomObj.mesh) {
        if (DEBUG) console.log('[TOPOLOGY] Using mesh from direct geometry output');
        return geomObj.mesh;
      }
    }
    
    // Try geometry ID (Geometry Reference nodes)
    const geometryId = geometrySourceNode.data?.geometryId || geometrySourceNode.data?.outputs?.geometryId;
    if (geometryId) {
      const geom = geometryStore.find(g => g.id === geometryId);
      if (geom?.type === 'mesh') {
        if (DEBUG) console.log('[TOPOLOGY] Using mesh from geometry store');
        return geom.mesh;
      }
    }
    
    console.error('[TOPOLOGY] ❌ No valid mesh geometry found');
    return null;
  }, [geometryEdge, geometrySourceNode, geometryStore]);

  const baseBounds = useMemo(() => {
    if (!baseMesh) return null;
    return calculateMeshBounds(baseMesh);
  }, [baseMesh]);

  const goals = useMemo(() => {
    const goalList: any[] = [];
    for (const sourceNode of goalSourceNodes) {
      const goal = sourceNode?.data?.outputs?.goal;
      if (goal && typeof goal === 'object') {
        goalList.push(goal);
      }
    }
    return goalList;
  }, [goalSourceNodes]);

  // Parameter change handler
  const handleParameterChange = (key: string, value: number) => {
    updateNodeData(nodeId, { parameters: { [key]: value } }, { recalculate: false });
  };

  // Extract goal markers
  useEffect(() => {
    if (DEBUG) console.log('[TOPOLOGY] Extracting goal markers...');
    
    if (!baseMesh || !hasGeometry) {
      setMarkers(null);
      return;
    }

    try {
      const extracted = extractGoalMarkers(baseMesh, goals);
      if (DEBUG) console.log('[TOPOLOGY] ✅ Extracted goal markers:', extracted);
      setMarkers(extracted);
    } catch (error) {
      console.error('[TOPOLOGY] ❌ Failed to extract goal markers:', error);
      setMarkers(null);
    }
  }, [baseMesh, goals, hasGeometry]);

  // Generate and register 3D geometry from converged density field
  const generateAndRegisterGeometry = (frame: SolverFrame, mesh: RenderMesh) => {
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
        metadata: { generatedBy: 'topology-optimization', type: 'point-cloud' }
      });
      if (DEBUG) console.log('[GEOM] Registered point cloud:', pointCloudId);
      
      const curveNetworkId = addGeometryMesh(geometryOutput.curveNetwork, { 
        sourceNodeId: nodeId,
        recordHistory: false,
        geometryId: cachedCurveNetworkId,
        metadata: { generatedBy: 'topology-optimization', type: 'curve-network' }
      });
      if (DEBUG) console.log('[GEOM] Registered curve network:', curveNetworkId);
      
      const multipipeId = addGeometryMesh(geometryOutput.multipipe, { 
        sourceNodeId: nodeId,
        recordHistory: false,
        geometryId: cachedOptimizedMeshId,
        metadata: { generatedBy: 'topology-optimization', type: 'multipipe' }
      });
      if (DEBUG) console.log('[GEOM] Registered multipipe:', multipipeId);

      const surfaceArea = computeMeshArea(
        geometryOutput.multipipe.positions,
        geometryOutput.multipipe.indices
      );
      const { volume_m3 } = computeMeshVolumeAndCentroid(geometryOutput.multipipe);

      updateNodeData(
        nodeId,
        {
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
        { recalculate: false }
      );
      
      if (DEBUG) {
        console.log(`[GEOM] ✅ Generated topology optimization geometry:
          - Point cloud: ${pointCloudId} (${geometryOutput.pointCount} points)
          - Curve network: ${curveNetworkId} (${geometryOutput.curveCount} curves)
          - Multipipe: ${multipipeId}`);
      }
      
    } catch (error) {
      console.error('[GEOM] ❌ Failed to generate geometry from density field:', error);
      throw error;
    }
  };
  

  const HISTORY_LIMIT = 100;

  const appendLimited = (arr: number[], value: number, limit = HISTORY_LIMIT) => {
    if (arr.length < limit) return [...arr, value];
    return [...arr.slice(arr.length - (limit - 1)), value];
  };

  const handleFrame = (frame: SolverFrame) => {
    setCurrentFrame(frame);
    setHistory(prev => ({
      compliance: appendLimited(prev.compliance, frame.compliance),
      change: appendLimited(prev.change, frame.change),
      vol: appendLimited(prev.vol, frame.vol)
    }));

    // Log performance metrics every 10 iterations
    if (frame.iter % 10 === 0 && frame.timings) {
      console.log(`[TOPOLOGY] Iter ${frame.iter} performance:`, {
        filterMs: typeof frame.timings.filterMs === 'number' ? frame.timings.filterMs.toFixed(1) : frame.timings.filterMs,
        solveMs: typeof frame.timings.solveMs === 'number' ? frame.timings.solveMs.toFixed(1) : frame.timings.solveMs,
        updateMs: typeof frame.timings.updateMs === 'number' ? frame.timings.updateMs.toFixed(1) : frame.timings.updateMs,
        totalMs: typeof frame.timings.totalMs === 'number' ? frame.timings.totalMs.toFixed(1) : frame.timings.totalMs,
        cgIters: frame.timings.cgIters ?? frame.feIters,
        cgTol: frame.timings.cgTol,
        compliance: frame.compliance.toFixed(2),
      });

      // Log memory usage (Chrome only)
      const pm = (performance as any).memory;
      if (pm) {
        console.log('[TOPOLOGY] Memory:', {
          usedMB: Math.round(pm.usedJSHeapSize / 1024 / 1024),
          totalMB: Math.round(pm.totalJSHeapSize / 1024 / 1024),
        });
      }
    }

    updateNodeData(
      nodeId,
      {
        topologyProgress: {
          iteration: frame.iter,
          objective: frame.compliance,
          constraint: frame.vol,
          status: "running",
        },
      },
      { recalculate: false }
    );

    // Generate preview geometry every 10 iterations OR at convergence
    const shouldGeneratePreview = baseMesh && (frame.iter % 10 === 0 || frame.converged);
    if (shouldGeneratePreview) {
      try {
        const t0 = performance.now();
        const bounds = calculateMeshBounds(baseMesh);
        const field = {
          densities: frame.densities,
          nx, ny, nz,
          bounds
        };
        const result = generateGeometryFromDensities(
          field,
          densityThreshold,
          maxLinksPerPoint,
          maxSpanLength,
          pipeRadius,
          pipeSegments
        );
        
        setPreviewGeometry(prev => {
          if (prev) {
            // Clear old arrays to allow GC
            prev.positions = [];
            prev.normals = [];
            prev.uvs = [];
            prev.indices = [];
          }
          return result.multipipe;
        });
        
        const t1 = performance.now();
        console.log(`[TOPOLOGY] Preview generation took ${(t1 - t0).toFixed(1)}ms`);
      } catch (error) {
        console.error('[TOPOLOGY] Preview generation error:', error);
      }
    }

    if (frame.converged) {
      isRunningRef.current = false;
      setSimulationState('converged');
      
      if (DEBUG) {
        console.log('[TOPOLOGY] Simulation converged! Generating geometry...');
        console.log('[TOPOLOGY] baseMesh:', baseMesh ? 'exists' : 'NULL');
        console.log('[TOPOLOGY] frame.densities:', frame.densities ? `${frame.densities.length} elements` : 'NULL');
      }
      
      if (baseMesh) {
        try {
          generateAndRegisterGeometry(frame, baseMesh);
          if (DEBUG) console.log('[TOPOLOGY] ✅ Geometry generation completed successfully');
        } catch (error) {
          console.error('[TOPOLOGY] ❌ Geometry generation FAILED:', error);
        }
      } else {
        console.error('[TOPOLOGY] ❌ Cannot generate geometry: baseMesh is null');
      }
    }
  };

  const handleDone = () => {
    isRunningRef.current = false;
    setSimulationState('converged');
    console.log('[TOPOLOGY] Simulation completed');
  };

  const handleError = (error: string) => {
    isRunningRef.current = false;
    setSimulationState('error');
    setSimulationError(error);
    console.error('[TOPOLOGY] Simulation error:', error);
  };

  // Start simulation
  const handleStart = async () => {
    if (!baseMesh || !markers || simulationState === 'running') {
      console.error('[TOPOLOGY] ❌ Cannot start: missing requirements');
      setSimulationError('Missing geometry or goal markers. Connect geometry and goals first.');
      return;
    }

    if (DEBUG) console.log('[TOPOLOGY] Starting simulation...');
    
    isRunningRef.current = true;
    setSimulationState('running');
    setSimulationError(null);
    setHistory({ compliance: [], change: [], vol: [] });
    setCurrentFrame(undefined);
    setPreviewGeometry(null);
    updateNodeData(
      nodeId,
      {
        parameters: { simulationStep: "running" },
        topologyProgress: {
          iteration: 0,
          objective: 0,
          constraint: volFrac,
          status: "running",
        },
      },
      { recalculate: false }
    );

    const simpParams: SimpParams = {
      nx, ny, nz,
      volFrac,
      penal: penalStart,
      penalStart,
      penalEnd,
      penalRampIters,
      rmin,
      move,
      maxIters,
      tolChange,
      minIterations: toNumber(parameters.minIterations, 30),
      grayTol: toNumber(parameters.grayTol, 0.05),
      betaMax: toNumber(parameters.betaMax, 64),
      E0,
      Emin,
      rhoMin,
      nu,
      cgTol,
      cgMaxIters
    };

    console.log('[TOPOLOGY] Solver Node ID:', nodeId);
    console.log('[TOPOLOGY] Grid resolution:', { nx, ny, nz });
    console.log('[TOPOLOGY] Total nodes:', (nx + 1) * (ny + 1) * (nz + 1));
    console.log('[TOPOLOGY] Using web worker for computation');
    
    if (nz < 15) {
      console.error('[TOPOLOGY] ⚠️⚠️⚠️ CRITICAL: Low Z resolution detected (nz=' + nz + ') ⚠️⚠️⚠️');
      console.error('[TOPOLOGY] This will cause BC_CONFLICT errors!');
      console.error('[TOPOLOGY] Current defaults: nx=40, ny=30, nz=20');
      console.error('[TOPOLOGY] Your rig has: nx=' + nx + ', ny=' + ny + ', nz=' + nz);
      console.error('[TOPOLOGY] ACTION REQUIRED: Delete this rig and create a new one!');
      console.error('[TOPOLOGY] Solver Node ID:', nodeId);
    }
    
    if (DEBUG) console.log('[TOPOLOGY] SIMP parameters:', simpParams);
    
    if (!workerClientRef.current) {
      workerClientRef.current = new SimpWorkerClient();
    }

    workerClientRef.current.start(baseMesh, markers, simpParams, {
      onFrame: handleFrame,
      onDone: handleDone,
      onError: handleError,
    }, {
      frameStride: 1,        // Send frame every iteration for real-time convergence monitoring
      frameIntervalMs: 200,  // At most 5 fps for smooth visual feedback
    });
  };

  // Pause simulation
  const handlePause = () => {
    if (simulationState === 'running' && workerClientRef.current) {
      isRunningRef.current = false;
      setSimulationState('paused');
      workerClientRef.current.pause();
    }
  };

  // Resume simulation
  const handleResume = () => {
    if (simulationState === 'paused' && workerClientRef.current) {
      isRunningRef.current = true;
      setSimulationState('running');
      workerClientRef.current.resume();
    }
  };

  // Reset simulation
  const handleReset = () => {
    isRunningRef.current = false;
    if (workerClientRef.current) {
      workerClientRef.current.stop();
    }
    setSimulationState('idle');
    setSimulationError(null);
    setCurrentFrame(undefined);
    setHistory({ compliance: [], change: [], vol: [] });
    setPreviewGeometry(null);
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
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workerClientRef.current) {
        workerClientRef.current.terminate();
        workerClientRef.current = null;
      }
      
      setPreviewGeometry(prev => {
        if (prev) {
          prev.positions = [];
          prev.normals = [];
          prev.uvs = [];
          prev.indices = [];
        }
        return null;
      });
    };
  }, []);

  return (
    <div className={styles.dashboard} style={{ fontSize: `${scale}%` }}>
      <div className={styles.header}>
        <div className={styles.headerBar} />
        <div className={styles.headerContent}>
          <div className={styles.title}>
            <span className={styles.titleGreek}>Τοπολογική Βελτιστοποίηση</span>
            <span className={styles.titleEnglish}>Topology Optimization</span>
            <span className={styles.titleSubtext}>Euclid · SIMP Algorithm</span>
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
              
              {nz < 60 && (
                <div style={{
                  padding: '12px',
                  marginBottom: '16px',
                  background: 'rgba(255, 165, 0, 0.1)',
                  border: '1px solid rgba(255, 165, 0, 0.3)',
                  borderRadius: '4px',
                  color: '#ffa500'
                }}>
                  <strong>⚠️ Low Resolution Warning</strong>
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', lineHeight: '1.4' }}>
                    Current Z resolution (nz={nz}) is low for 3D problems. This may cause BC_CONFLICT errors.
                    <br />
                    <strong>Recommended:</strong> nz ≥ 60 (current default: 80)
                    <br />
                    <strong>Action:</strong> Delete this rig and create a new one to get updated defaults.
                  </p>
                </div>
              )}
              
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
                    disabled={simulationState === 'running'}
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
                    disabled={simulationState === 'running'}
                  />
                  <span className={styles.parameterValue}>{ny}</span>
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
                    disabled={simulationState === 'running'}
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
                    disabled={simulationState === 'running'}
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
                    disabled={simulationState === 'running'}
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
                    disabled={simulationState === 'running'}
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
                    disabled={simulationState === 'running'}
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
                    disabled={simulationState === 'running'}
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
                    disabled={simulationState === 'running'}
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
                    disabled={simulationState === 'running'}
                  />
                  <span className={styles.parameterValue}>{tolChange.toFixed(4)}</span>
                </div>
              </div>

              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Min Stable Iterations
                  <span className={styles.parameterDescription}>
                    Consecutive stable iterations required (1-10)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={toNumber(parameters.minIterations, 30)}
                    onChange={(e) => handleParameterChange("minIterations", Number(e.target.value))}
                    className={styles.slider}
                    disabled={simulationState === 'running'}
                  />
                  <span className={styles.parameterValue}>{toNumber(parameters.minIterations, 30)}</span>
                </div>
              </div>

              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Gray Level Tolerance
                  <span className={styles.parameterDescription}>
                    Max gray level for convergence (0.01-0.2, lower = more binary)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="0.01"
                    max="0.2"
                    step="0.01"
                    value={toNumber(parameters.grayTol, 0.05)}
                    onChange={(e) => handleParameterChange("grayTol", Number(e.target.value))}
                    className={styles.slider}
                    disabled={simulationState === 'running'}
                  />
                  <span className={styles.parameterValue}>{toNumber(parameters.grayTol, 0.05).toFixed(2)}</span>
                </div>
              </div>

              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Beta Max
                  <span className={styles.parameterDescription}>
                    Max Heaviside projection sharpness (64-512, higher = sharper 0/1)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="64"
                    max="512"
                    step="64"
                    value={toNumber(parameters.betaMax, 64)}
                    onChange={(e) => handleParameterChange("betaMax", Number(e.target.value))}
                    className={styles.slider}
                    disabled={simulationState === 'running'}
                  />
                  <span className={styles.parameterValue}>{toNumber(parameters.betaMax, 64)}</span>
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
                    disabled={simulationState === 'running'}
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
                    disabled={simulationState === 'running'}
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
                    disabled={simulationState === 'running'}
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
                    disabled={simulationState === 'running'}
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
                    disabled={simulationState === 'running'}
                  />
                  <span className={styles.parameterValue}>{pipeSegments}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "simulator" && (
          <div className={styles.simulatorTab}>
            <div className={styles.simulatorLayout}>
              <div className={styles.geometryView}>
                <h3 className={styles.viewTitle}>Density Field Evolution</h3>
                {markers && baseMesh ? (
                  <TopologyRenderer
                    fe={{ 
                      nx, 
                      ny, 
                      nz, 
                      numElements: nx * ny * nz, 
                      numNodes: (nx + 1) * (ny + 1) * (nz > 1 ? nz + 1 : 1), 
                      numDofs: (nx + 1) * (ny + 1) * (nz > 1 ? nz + 1 : 1) * (nz > 1 ? 3 : 2), 
                      elementSize: { 
                        x: Math.max(1e-6, (baseBounds?.max.x ?? 1) - (baseBounds?.min.x ?? 0)) / nx, 
                        y: Math.max(1e-6, (baseBounds?.max.y ?? 1) - (baseBounds?.min.y ?? 0)) / ny, 
                        z: nz > 1 ? Math.max(1e-6, (baseBounds?.max.z ?? 1) - (baseBounds?.min.z ?? 0)) / nz : 0 
                      }, 
                      bounds: baseBounds ?? { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: nz > 1 ? 1 : 0 } } 
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
                <h3 className={styles.viewTitle}>3D Geometry Preview</h3>
                <TopologyGeometryPreview
                  geometry={previewGeometry}
                  width={600}
                  height={450}
                />
                <div className={styles.previewHint}>
                  Drag to rotate • Updates every 10 iterations
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

            <div className={styles.simulationControls}>
              <div className={styles.controlButtons}>
                {simulationState === 'idle' && (
                  <button
                    className={styles.startButton}
                    onClick={handleStart}
                    disabled={!markers || !baseMesh}
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
                      <span className={styles.statusValue} style={{ 
                        color: currentFrame.compliance > 1e8 ? '#ff4444' : 'inherit',
                        fontWeight: currentFrame.compliance > 1e8 ? 'bold' : 'normal'
                      }}>
                        {currentFrame.compliance > 1e6 
                          ? currentFrame.compliance.toExponential(2) 
                          : currentFrame.compliance.toFixed(2)}
                      </span>
                    </div>
                    {currentFrame.compliance > 1e8 && (
                      <div className={styles.warningMessage} style={{
                        backgroundColor: '#442200',
                        border: '1px solid #ff8800',
                        padding: '8px',
                        marginTop: '8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        <strong>⚠️ WARNING:</strong> Compliance is extremely high ({currentFrame.compliance.toExponential(2)}). 
                        This usually means force magnitude is too large. 
                        Delete this rig and create a new one (new rigs use correct force scale).
                      </div>
                    )}
                    <div className={styles.statusItem}>
                      <span className={styles.statusLabel}>Volume:</span>
                      <span className={styles.statusValue}>{(currentFrame.vol * 100).toFixed(1)}%</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {simulationError && (
              <div className={styles.errorMessage}>
                <strong>Error:</strong> {simulationError}
              </div>
            )}
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
            
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>3D Geometry Preview</h3>
              {previewGeometry ? (
                <div>
                  <TopologyGeometryPreview
                    geometry={previewGeometry}
                    width={800}
                    height={600}
                  />
                  <div className={styles.previewHint}>
                    Drag to rotate • Scroll to zoom • Last updated: Iteration {currentFrame?.iter ?? 0}
                  </div>
                </div>
              ) : (
                <div className={styles.noResults}>
                  {simulationState === 'idle' ? 'Run simulation to generate geometry' : 'Waiting for geometry... (updates every 10 iterations)'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
