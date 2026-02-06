import React, { useState, useMemo, useEffect, useRef } from "react";
import styles from "./TopologyOptimizationSimulatorDashboard.module.css";
import { useProjectStore } from "../store/useProjectStore";
import { computeMeshArea } from "../geometry/mesh";
import { computeMeshVolumeAndCentroid } from "../geometry/physical";
import type { RenderMesh, Vec3 } from "../types";
import type { SimpParams, SolverFrame, SimulationState, SimulationHistory, GoalMarkers } from "./workflow/topology/types";
import { is3DMode } from "./workflow/topology/simp";
import { extractGoalMarkers, generateGeometryFromDensities } from "./workflow/topology/geometry";
import { TopologyConvergence, TopologyGeometryPreview } from "./workflow/topology/TopologyUI";
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
  const baseMeshRef = useRef<RenderMesh | null>(null);

  const updateNodeData = useProjectStore((state) => state.updateNodeData);
  const addGeometryMesh = useProjectStore((state) => state.addGeometryMesh);
  const selectGeometry = useProjectStore((state) => state.selectGeometry);
  
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

  const resolveNumber = (key: string, defaultValue: number = 0) => {
    if (inputOverrides.has(key)) {
      const value = inputOverrides.get(key);
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
    const value = (parameters as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    return defaultValue;
  };

  // SIMP parameters - use node default values from TopologyOptimizationSolver.ts
  const nx = resolveNumber("nx", 100);
  const ny = resolveNumber("ny", 75);
  const nz = resolveNumber("nz", 40);
  const volFrac = resolveNumber("volFrac", 0.4);
  const penalStart = resolveNumber("penalStart", 1.0);
  const penalEnd = resolveNumber("penalEnd", 3.0);
  const penalRampIters = resolveNumber("penalRampIters", 0);
  const rmin = resolveNumber("rmin", 2.5);
  const move = resolveNumber("move", 0.2);
  const maxIters = resolveNumber("maxIters", 300);
  const tolChange = resolveNumber("tolChange", 0.01);
  // Force minIterations to be at least 80 (even if node has old default value)
  const minIterations = Math.max(80, resolveNumber("minIterations", 80));
  const grayTol = resolveNumber("grayTol", 0.03);
  const betaMax = resolveNumber("betaMax", 64);
  const E0 = resolveNumber("E0", 1.0);
  const Emin = resolveNumber("Emin", 1e-9);
  const rhoMin = resolveNumber("rhoMin", 1e-3);
  const nu = resolveNumber("nu", 0.3);
  const cgTol = resolveNumber("cgTol", 1e-6);
  const cgMaxIters = resolveNumber("cgMaxIters", 120);
  const densityThreshold = resolveNumber("densityThreshold", 0.2);

  const hasGeometry = !!geometryEdge;
  const goalsCount = goalEdges.length;

  // Get geometry and goals
  const baseMesh = useMemo(() => {
    console.log('[TOPOLOGY] ⚠️⚠️⚠️ Computing baseMesh:', {
      hasGeometryEdge: !!geometryEdge,
      hasGeometrySourceNode: !!geometrySourceNode,
      geometrySourceNodeType: geometrySourceNode?.type,
      geometrySourceNodeId: geometrySourceNode?.id,
    });
    
    if (!geometryEdge || !geometrySourceNode) {
      console.error('[TOPOLOGY] ❌ baseMesh is NULL because:', {
        geometryEdge: geometryEdge ? 'EXISTS' : 'NULL',
        geometrySourceNode: geometrySourceNode ? 'EXISTS' : 'NULL',
      });
      return null;
    }
    
    console.log('[TOPOLOGY] Source node type:', geometrySourceNode.type);
    console.log('[TOPOLOGY] Source node data:', geometrySourceNode.data);
    
    // Try direct geometry output first (Box Builder, Sphere, etc.)
    const directGeometry = geometrySourceNode.data?.outputs?.geometry;
    console.log('[TOPOLOGY] Direct geometry output:', directGeometry ? 'EXISTS' : 'NULL');
    
    if (directGeometry && typeof directGeometry === 'object' && 'type' in directGeometry) {
      const geomObj = directGeometry as { type: string; mesh?: RenderMesh };
      console.log('[TOPOLOGY] Direct geometry type:', geomObj.type);
      console.log('[TOPOLOGY] Direct geometry has mesh:', !!geomObj.mesh);
      if (geomObj.type === 'mesh' && geomObj.mesh) {
        console.log('[TOPOLOGY] ✅ Using mesh from direct geometry output:', {
          vertices: geomObj.mesh.positions.length / 3,
          indices: geomObj.mesh.indices?.length || 0,
        });
        return geomObj.mesh;
      }
    }
    
    // Try geometry ID (Geometry Reference nodes)
    const geometryId = geometrySourceNode.data?.geometryId || geometrySourceNode.data?.outputs?.geometryId;
    console.log('[TOPOLOGY] Geometry ID:', geometryId);
    
    if (geometryId) {
      const geom = geometryStore.find(g => g.id === geometryId);
      console.log('[TOPOLOGY] Found geometry in store:', geom ? 'EXISTS' : 'NULL');
      if (geom?.type === 'mesh') {
        console.log('[TOPOLOGY] ✅ Using mesh from geometry store:', {
          vertices: geom.mesh?.positions.length / 3,
          indices: geom.mesh?.indices?.length || 0,
        });
        return geom.mesh;
      }
    }
    
    console.error('[TOPOLOGY] ❌ No valid mesh geometry found');
    console.error('[TOPOLOGY] Tried: directGeometry, geometryId');
    console.error('[TOPOLOGY] geometrySourceNode.data:', JSON.stringify(geometrySourceNode.data, null, 2));
    return null;
  }, [geometryEdge, geometrySourceNode, geometryStore]);

  const baseBounds = useMemo(() => {
    if (!baseMesh) return null;
    return calculateMeshBounds(baseMesh);
  }, [baseMesh]);

  // Keep baseMeshRef in sync with baseMesh to avoid stale closure issues in callbacks
  useEffect(() => {
    baseMeshRef.current = baseMesh;
    console.log('[TOPOLOGY] baseMeshRef updated:', baseMesh ? 'EXISTS' : 'NULL');
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
        densityThreshold
      );
      
      // Register geometries in the store
      if (DEBUG) {
        console.log('[GEOM] Registering geometries in store...');
        console.log('[GEOM] Node ID:', nodeId);
      }
      
      const cachedOptimizedMeshId =
        typeof parameters.optimizedMeshId === "string"
          ? parameters.optimizedMeshId
          : typeof outputs.optimizedMesh === "string"
            ? outputs.optimizedMesh
            : undefined;

      // Add black vertex colors to the isosurface mesh
      const numVertices = geometryOutput.isosurface.positions.length / 3;
      const colors = new Array(numVertices * 3).fill(0); // Black color (0, 0, 0) for all vertices
      const isosurfaceMeshWithColors = {
        ...geometryOutput.isosurface,
        colors,
      };
      
      const isosurfaceId = addGeometryMesh(isosurfaceMeshWithColors, { 
        sourceNodeId: nodeId,
        recordHistory: true,
        geometryId: cachedOptimizedMeshId,
        metadata: { generatedBy: 'topology-optimization', type: 'isosurface' }
      });
      console.log('[TOPOLOGY] ✅ Registered isosurface geometry:', isosurfaceId);
      console.log('[TOPOLOGY] Isosurface mesh:', {
        vertices: geometryOutput.isosurface.positions.length / 3,
        triangles: geometryOutput.isosurface.indices.length / 3,
        hasColors: !!isosurfaceMeshWithColors.colors,
        colorCount: isosurfaceMeshWithColors.colors?.length ?? 0,
        hasNormals: !!isosurfaceMeshWithColors.normals,
        normalCount: isosurfaceMeshWithColors.normals?.length ?? 0,
        hasIndices: !!isosurfaceMeshWithColors.indices,
        indexCount: isosurfaceMeshWithColors.indices?.length ?? 0,
      });
      
      // Verify the geometry was added to the store correctly
      const state = useProjectStore.getState();
      const addedGeometry = state.geometry.find(g => g.id === isosurfaceId);
      if (addedGeometry) {
        console.log('[TOPOLOGY] ✅ Geometry found in store:', {
          id: addedGeometry.id,
          type: addedGeometry.type,
          hasMesh: 'mesh' in addedGeometry && !!addedGeometry.mesh,
          meshVertices: 'mesh' in addedGeometry && addedGeometry.mesh ? addedGeometry.mesh.positions.length / 3 : 0,
          meshTriangles: 'mesh' in addedGeometry && addedGeometry.mesh ? addedGeometry.mesh.indices.length / 3 : 0,
        });
      } else {
        console.error('[TOPOLOGY] ❌ Geometry NOT found in store after addGeometryMesh!');
      }
      
      // Log geometry bounds to help diagnose visibility issues
      const positions = geometryOutput.isosurface.positions;
      if (positions.length > 0) {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (let i = 0; i < positions.length; i += 3) {
          minX = Math.min(minX, positions[i]);
          minY = Math.min(minY, positions[i + 1]);
          minZ = Math.min(minZ, positions[i + 2]);
          maxX = Math.max(maxX, positions[i]);
          maxY = Math.max(maxY, positions[i + 1]);
          maxZ = Math.max(maxZ, positions[i + 2]);
        }
        const sizeX = maxX - minX;
        const sizeY = maxY - minY;
        const sizeZ = maxZ - minZ;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;
        console.log('[TOPOLOGY] ⚠️⚠️⚠️ GEOMETRY BOUNDS:', {
          min: { x: minX.toFixed(3), y: minY.toFixed(3), z: minZ.toFixed(3) },
          max: { x: maxX.toFixed(3), y: maxY.toFixed(3), z: maxZ.toFixed(3) },
          size: { x: sizeX.toFixed(3), y: sizeY.toFixed(3), z: sizeZ.toFixed(3) },
          center: { x: centerX.toFixed(3), y: centerY.toFixed(3), z: centerZ.toFixed(3) },
        });
      }

      const surfaceArea = computeMeshArea(
        geometryOutput.isosurface.positions,
        geometryOutput.isosurface.indices
      );
      const { volume_m3 } = computeMeshVolumeAndCentroid(geometryOutput.isosurface);

      updateNodeData(
        nodeId,
        {
          parameters: {
            optimizedMeshId: isosurfaceId,
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
            optimizedMesh: isosurfaceId,
            volume: volume_m3,
            surfaceArea,
          },
        },
        { recalculate: true }
      );
      
      console.log('[TOPOLOGY] ✅ Updated node outputs with geometry ID:', isosurfaceId);
      console.log('[TOPOLOGY] Recalculation triggered: true');
      
      // Select the geometry in Roslyn so it's visible
      console.log('[TOPOLOGY] ⚠️ About to select geometry in Roslyn:', isosurfaceId);
      selectGeometry(isosurfaceId, false);
      console.log('[TOPOLOGY] ✅✅✅ Selected geometry in Roslyn:', isosurfaceId);
      
      // Verify geometry is in store (reuse state from line 343)
      const geometryExists = state.geometry.some(g => g.id === isosurfaceId);
      console.log('[TOPOLOGY] Geometry exists in store:', geometryExists);
      console.log('[TOPOLOGY] Total geometries in store:', state.geometry.length);
      
      // Verify geometry is selected
      const isSelected = state.selectedGeometryIds.includes(isosurfaceId);
      console.log('[TOPOLOGY] Geometry is selected:', isSelected);
      console.log('[TOPOLOGY] Selected geometry IDs:', state.selectedGeometryIds);
      
      if (DEBUG) {
        console.log(`[GEOM] ✅ Generated topology optimization isosurface:
          - Mesh ID: ${isosurfaceId}
          - Vertices: ${geometryOutput.vertexCount}
          - Volume: ${volume_m3.toFixed(6)} m³
          - Surface Area: ${surfaceArea.toFixed(6)} m²`);
      }
      
    } catch (error) {
      console.error('[GEOM] ❌ Failed to generate geometry from density field:', error);
      throw error;
    }
  };
  

  const HISTORY_LIMIT = 2500; // Store full history for long runs (up to 2000 iterations)

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
    // CRITICAL: Use baseMeshRef.current to avoid stale closure issues
    // The baseMesh from the closure may be stale if it changed after the callback was created
    const currentBaseMesh = baseMeshRef.current;
    
    // CRITICAL: Log every frame to diagnose preview issues
    console.log(`[TOPOLOGY] ⚠️⚠️⚠️ handleFrame iter=${frame.iter}:`, {
      baseMesh: currentBaseMesh ? 'EXISTS' : 'NULL',
      baseMeshFromClosure: baseMesh ? 'EXISTS' : 'NULL',
      baseMeshVertices: currentBaseMesh ? currentBaseMesh.positions.length / 3 : 0,
      hasDensities: frame.densities ? frame.densities.length : 0,
      iter10: frame.iter % 10 === 0,
      converged: frame.converged,
    });
    
    if (!currentBaseMesh) {
      console.error('[TOPOLOGY] ❌❌❌ CRITICAL: baseMeshRef.current is NULL in handleFrame!');
      console.error('[TOPOLOGY] This means preview geometry cannot be generated!');
      console.error('[TOPOLOGY] baseMesh from closure:', baseMesh ? 'EXISTS' : 'NULL');
      console.error('[TOPOLOGY] You need to check why baseMesh is not being set correctly!');
    }
    
    const shouldGeneratePreview = currentBaseMesh && (frame.iter % 10 === 0 || frame.converged);
    
    console.log('[TOPOLOGY] shouldGeneratePreview:', shouldGeneratePreview, {
      hasBaseMesh: !!currentBaseMesh,
      isIter10: frame.iter % 10 === 0,
      isConverged: frame.converged,
    });
    
    if (shouldGeneratePreview) {
      console.log('[TOPOLOGY] ⚠️ GENERATING PREVIEW at iteration', frame.iter);
      try {
        const t0 = performance.now();
        const bounds = calculateMeshBounds(currentBaseMesh);
        console.log('[TOPOLOGY] Preview bounds:', bounds);
        
        const field = {
          densities: frame.densities,
          nx, ny, nz,
          bounds
        };
        console.log('[TOPOLOGY] Preview field:', { nx, ny, nz, densityCount: frame.densities?.length });
        
        // ⚠️⚠️⚠️ CRITICAL DIAGNOSTIC: Log density values at different positions
        if (frame.densities && frame.densities.length > 0) {
          const d = frame.densities;
          const total = d.length;
          
          // Sample densities at corners and center
          const cornerIdx = 0;
          const centerIdx = Math.floor(nx/2) + Math.floor(ny/2) * nx + Math.floor(nz/2) * nx * ny;
          const maxCornerIdx = (nx-1) + (ny-1) * nx + (nz-1) * nx * ny;
          
          // Count distribution
          let below01 = 0, below02 = 0, below05 = 0, above05 = 0, above08 = 0, above09 = 0;
          let minD = Infinity, maxD = -Infinity;
          for (let i = 0; i < total; i++) {
            const v = d[i];
            if (v < minD) minD = v;
            if (v > maxD) maxD = v;
            if (v < 0.1) below01++;
            if (v < 0.2) below02++;
            if (v < 0.5) below05++;
            if (v > 0.5) above05++;
            if (v > 0.8) above08++;
            if (v > 0.9) above09++;
          }
          
          console.log('[TOPOLOGY] ⚠️⚠️⚠️ DENSITY FIELD FROM SIMP SOLVER:', {
            iter: frame.iter,
            totalElements: total,
            expectedElements: nx * ny * nz,
            range: `[${minD.toFixed(4)}, ${maxD.toFixed(4)}]`,
            cornerDensity: d[cornerIdx]?.toFixed(4),
            centerDensity: centerIdx < total ? d[centerIdx]?.toFixed(4) : 'OOB',
            maxCornerDensity: maxCornerIdx < total ? d[maxCornerIdx]?.toFixed(4) : 'OOB',
            distribution: {
              'below 0.1': `${below01} (${(100*below01/total).toFixed(1)}%)`,
              'below 0.2': `${below02} (${(100*below02/total).toFixed(1)}%)`,
              'below 0.5': `${below05} (${(100*below05/total).toFixed(1)}%)`,
              'above 0.5': `${above05} (${(100*above05/total).toFixed(1)}%)`,
              'above 0.8': `${above08} (${(100*above08/total).toFixed(1)}%)`,
              'above 0.9': `${above09} (${(100*above09/total).toFixed(1)}%)`,
            }
          });
          
          // Sample a line through the center in X direction
          const cy = Math.floor(ny/2);
          const cz = Math.floor(nz/2);
          const lineX: string[] = [];
          for (let x = 0; x < nx; x += Math.max(1, Math.floor(nx/10))) {
            const idx = x + cy * nx + cz * nx * ny;
            if (idx < total) {
              lineX.push(d[idx].toFixed(2));
            }
          }
          console.log(`[TOPOLOGY] Density line through center (X direction, y=${cy}, z=${cz}):`, lineX.join(' '));
          
          // Sample a line through the center in Y direction
          const cx = Math.floor(nx/2);
          const lineY: string[] = [];
          for (let y = 0; y < ny; y += Math.max(1, Math.floor(ny/10))) {
            const idx = cx + y * nx + cz * nx * ny;
            if (idx < total) {
              lineY.push(d[idx].toFixed(2));
            }
          }
          console.log(`[TOPOLOGY] Density line through center (Y direction, x=${cx}, z=${cz}):`, lineY.join(' '));
        }
        
        const result = generateGeometryFromDensities(
          field,
          densityThreshold
        );
        
        console.log('[TOPOLOGY] ✅ Preview result:', {
          hasIsosurface: !!result.isosurface,
          positions: result.isosurface?.positions?.length || 0,
          indices: result.isosurface?.indices?.length || 0,
        });
        
        // ⚠️⚠️⚠️ DEBUG: Log the first few vertex positions from marching cubes
        if (result.isosurface && result.isosurface.positions && result.isosurface.positions.length > 0) {
          const pos = result.isosurface.positions;
          console.log('[TOPOLOGY] ⚠️⚠️⚠️ MARCHING CUBES OUTPUT - First 10 vertices:');
          for (let i = 0; i < Math.min(30, pos.length); i += 3) {
            console.log(`  v${i/3}: (${pos[i].toFixed(2)}, ${pos[i+1].toFixed(2)}, ${pos[i+2].toFixed(2)})`);
          }
          
          // Compute bounds of marching cubes output
          let mcMinX = Infinity, mcMinY = Infinity, mcMinZ = Infinity;
          let mcMaxX = -Infinity, mcMaxY = -Infinity, mcMaxZ = -Infinity;
          for (let i = 0; i < pos.length; i += 3) {
            const x = pos[i], y = pos[i+1], z = pos[i+2];
            if (x < mcMinX) mcMinX = x; if (x > mcMaxX) mcMaxX = x;
            if (y < mcMinY) mcMinY = y; if (y > mcMaxY) mcMaxY = y;
            if (z < mcMinZ) mcMinZ = z; if (z > mcMaxZ) mcMaxZ = z;
          }
          console.log('[TOPOLOGY] ⚠️⚠️⚠️ MARCHING CUBES OUTPUT BOUNDS:', {
            min: { x: mcMinX.toFixed(2), y: mcMinY.toFixed(2), z: mcMinZ.toFixed(2) },
            max: { x: mcMaxX.toFixed(2), y: mcMaxY.toFixed(2), z: mcMaxZ.toFixed(2) },
            size: { 
              x: (mcMaxX - mcMinX).toFixed(2), 
              y: (mcMaxY - mcMinY).toFixed(2), 
              z: (mcMaxZ - mcMinZ).toFixed(2) 
            },
            inputBounds: {
              min: bounds.min,
              max: bounds.max,
            }
          });
          
          console.log('[TOPOLOGY] ✅✅✅ SETTING PREVIEW GEOMETRY with', result.isosurface.positions.length / 3, 'vertices');
          setPreviewGeometry(result.isosurface);
        } else {
          console.warn('[TOPOLOGY] ⚠️ Preview result has no geometry - NOT setting previewGeometry');
        }
        
        const t1 = performance.now();
        console.log(`[TOPOLOGY] Preview generation took ${(t1 - t0).toFixed(1)}ms`);
      } catch (error) {
        console.error('[TOPOLOGY] ❌ Preview generation error:', error);
      }
    } else {
      console.log('[TOPOLOGY] ⏭️ Skipping preview generation:', {
        baseMesh: currentBaseMesh ? 'EXISTS' : 'NULL',
        iter10: frame.iter % 10 === 0,
        converged: frame.converged,
      });
    }

    if (frame.converged) {
      isRunningRef.current = false;
      setSimulationState('converged');
      
      // ALWAYS log convergence (not just in DEBUG mode)
      console.log('[TOPOLOGY] ⚠️⚠️⚠️ SIMULATION CONVERGED at iteration', frame.iter);
      console.log('[TOPOLOGY] frame.converged:', frame.converged);
      console.log('[TOPOLOGY] baseMesh:', currentBaseMesh ? 'exists' : 'NULL');
      console.log('[TOPOLOGY] frame.densities:', frame.densities ? `${frame.densities.length} elements` : 'NULL');
      console.log('[TOPOLOGY] Current simulation state:', simulationState);
      console.log('[TOPOLOGY] isRunningRef.current:', isRunningRef.current);
      
      if (currentBaseMesh) {
        try {
          console.log('[TOPOLOGY] ⚠️⚠️⚠️ GENERATING FINAL GEOMETRY...');
          generateAndRegisterGeometry(frame, currentBaseMesh);
          console.log('[TOPOLOGY] ✅✅✅ Geometry generation completed successfully');
        } catch (error) {
          console.error('[TOPOLOGY] ❌❌❌ Geometry generation FAILED:', error);
          console.error('[TOPOLOGY] Error stack:', error);
        }
      } else {
        console.error('[TOPOLOGY] ❌❌❌ Cannot generate geometry: baseMesh is null');
      }
    }
  };

  const handleDone = () => {
    isRunningRef.current = false;
    setSimulationState('converged');
    console.log('[TOPOLOGY] ⚠️⚠️⚠️ SIMULATION COMPLETED (handleDone called)');
    
    // CRITICAL: Use baseMeshRef.current to avoid stale closure issues
    const currentBaseMesh = baseMeshRef.current;
    
    // Generate and register final geometry
    if (currentFrame && currentFrame.densities && currentBaseMesh) {
      try {
        console.log('[TOPOLOGY] ⚠️⚠️⚠️ GENERATING FINAL GEOMETRY FROM handleDone...');
        console.log('[TOPOLOGY] currentFrame.iter:', currentFrame.iter);
        console.log('[TOPOLOGY] currentFrame.compliance:', currentFrame.compliance);
        console.log('[TOPOLOGY] currentFrame.densities.length:', currentFrame.densities.length);
        generateAndRegisterGeometry(currentFrame, currentBaseMesh);
        console.log('[TOPOLOGY] ✅✅✅ Final geometry generation completed successfully');
      } catch (error) {
        console.error('[TOPOLOGY] ❌❌❌ Final geometry generation FAILED:', error);
        console.error('[TOPOLOGY] Error stack:', error);
      }
    } else {
      console.error('[TOPOLOGY] ❌❌❌ Cannot generate final geometry:');
      console.error('[TOPOLOGY]   currentFrame:', currentFrame ? 'exists' : 'NULL');
      console.error('[TOPOLOGY]   currentFrame.densities:', currentFrame?.densities ? `${currentFrame.densities.length} elements` : 'NULL');
      console.error('[TOPOLOGY]   baseMesh (from ref):', currentBaseMesh ? 'exists' : 'NULL');
    }
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
      minIterations,
      grayTol,
      betaMax,
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
    console.log('[TOPOLOGY] ⚠️ CRITICAL PARAMETER CHECK:', {
      minIterations: simpParams.minIterations,
      maxIters: simpParams.maxIters,
      'minIterations from resolveNumber': minIterations,
      'parameters.minIterations': (parameters as Record<string, unknown>).minIterations,
    });
    
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
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div className={styles.headerBar} />
        <div className={styles.headerContent}>
          <div className={styles.title}>
            <span className={styles.titleGreek}>Τοπολογική Βελτιστοποίηση</span>
            <span className={styles.titleEnglish}>Topology Optimization</span>
            <span className={styles.titleSubtext}>Euclid · SIMP Algorithm</span>
          </div>
          <div className={styles.headerControls}>
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
                    Maximum solver iterations (10-2000)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="10"
                    max="2000"
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
                    Consecutive stable iterations required (10-100)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={minIterations}
                    onChange={(e) => handleParameterChange("minIterations", Number(e.target.value))}
                    className={styles.slider}
                    disabled={simulationState === 'running'}
                  />
                  <span className={styles.parameterValue}>{minIterations}</span>
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
                    value={grayTol}
                    onChange={(e) => handleParameterChange("grayTol", Number(e.target.value))}
                    className={styles.slider}
                    disabled={simulationState === 'running'}
                  />
                  <span className={styles.parameterValue}>{grayTol.toFixed(2)}</span>
                </div>
              </div>

              <div className={styles.parameterGroup}>
                <label className={styles.parameterLabel}>
                  Beta Max
                  <span className={styles.parameterDescription}>
                    Max Heaviside projection sharpness (16-512, higher = sharper 0/1)
                  </span>
                </label>
                <div className={styles.parameterControl}>
                  <input
                    type="range"
                    min="16"
                    max="512"
                    step="16"
                    value={betaMax}
                    onChange={(e) => handleParameterChange("betaMax", Number(e.target.value))}
                    className={styles.slider}
                    disabled={simulationState === 'running'}
                  />
                  <span className={styles.parameterValue}>{betaMax}</span>
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
            </div>
          </div>
        )}

        {activeTab === "simulator" && (
          <div className={styles.simulatorTab}>
            <div className={styles.sideBySideLayout}>
              <div className={styles.geometryFloating}>
                <TopologyGeometryPreview
                  geometry={previewGeometry}
                  width={500}
                  height={500}
                />
              </div>

              <div className={styles.convergenceView}>
                <h3 className={styles.viewTitle}>Convergence Monitor</h3>
                <TopologyConvergence
                  history={history}
                  width={500}
                  height={450}
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
