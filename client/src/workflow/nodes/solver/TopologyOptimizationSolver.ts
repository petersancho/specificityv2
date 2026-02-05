import type { WorkflowNodeDefinition } from "../../nodeRegistry";
import type { Geometry, RenderMesh, Vec3, MeshGeometry } from "../../../types";
import type { GoalSpecification, AnchorGoal, LoadGoal } from "./types";

/**
 * Topology Optimization Solver Node
 * 
 * This solver generates topologically optimized structures using:
 * 1. Goal-based optimization (anchor, load)
 * 2. Point cloud generation (optimized based on goals)
 * 3. Curve network generation (constrained connectivity)
 * 4. Multipipe operation (pipes along curves)
 * 
 * Named after Leonhard Euler (topology pioneer, Euler characteristic).
 */
export const TopologyOptimizationSolverNode: WorkflowNodeDefinition = {
  type: "topologyOptimizationSolver",
  label: "Topology Optimization",
  shortLabel: "TOPO",
  description: "Generates topologically optimized structures using goal-based optimization.",
  category: "solver",
  semanticOps: ['solver.topologyOptimization'],
  iconId: "topologyOptimizationSolver",
  inputs: [
    {
      key: "geometry",
      label: "Geometry",
      type: "geometry",
      description: "Input geometry defines the domain for optimization.",
    },
    {
      key: "goals",
      label: "Goals",
      type: "goal",
      allowMultiple: true,
      description: "Optimization goals (anchor, load).",
    },
  ],
  outputs: [
    {
      key: "optimizedMesh",
      label: "Optimized Mesh",
      type: "mesh",
      description: "Topologically optimized structure (multipipe result).",
    },
    {
      key: "pointCloud",
      label: "Point Cloud",
      type: "geometry",
      description: "Generated point cloud for visualization.",
    },
    {
      key: "curveNetwork",
      label: "Curve Network",
      type: "geometry",
      description: "Generated curve network for visualization.",
    },
    {
      key: "pointCount",
      label: "Point Count",
      type: "number",
      description: "Number of points generated.",
    },
    {
      key: "curveCount",
      label: "Curve Count",
      type: "number",
      description: "Number of curves generated.",
    },
    {
      key: "volume",
      label: "Volume",
      type: "number",
      description: "Volume of optimized structure.",
    },
    {
      key: "surfaceArea",
      label: "Surface Area",
      type: "number",
      description: "Surface area of optimized structure.",
    },
  ],
  parameters: [
    {
      key: "pointDensity",
      label: "Point Density",
      type: "number",
      defaultValue: 100,
      min: 10,
      max: 1000,
      step: 10,
      description: "Deprecated. Use Density Threshold for SIMP-derived point selection.",
    },
    {
      key: "nx",
      label: "Resolution X",
      type: "number",
      defaultValue: 40,
      min: 20,
      max: 100,
      step: 2,
      description: "Grid resolution in X (lower = faster, higher = more detail).",
    },
    {
      key: "ny",
      label: "Resolution Y",
      type: "number",
      defaultValue: 30,
      min: 20,
      max: 100,
      step: 2,
      description: "Grid resolution in Y (lower = faster, higher = more detail).",
    },
    {
      key: "nz",
      label: "Resolution Z",
      type: "number",
      defaultValue: 20,
      min: 1,
      max: 80,
      step: 1,
      description: "Grid resolution in Z (1 for 2D, 20-80 for 3D, lower = faster).",
    },
    {
      key: "volFrac",
      label: "Volume Fraction",
      type: "number",
      defaultValue: 0.4,
      min: 0.1,
      max: 0.9,
      step: 0.05,
      description: "Target material fraction.",
    },
    {
      key: "penalStart",
      label: "Penalty Start",
      type: "number",
      defaultValue: 1.0,
      min: 1.0,
      max: 3.0,
      step: 0.1,
      description: "Initial SIMP penalty exponent.",
    },
    {
      key: "penalEnd",
      label: "Penalty End",
      type: "number",
      defaultValue: 3.0,
      min: 2.0,
      max: 5.0,
      step: 0.1,
      description: "Final SIMP penalty exponent.",
    },
    {
      key: "penalRampIters",
      label: "Penalty Ramp Iterations",
      type: "number",
      defaultValue: 60,
      min: 10,
      max: 200,
      step: 5,
      description: "Iterations to ramp penalty.",
    },
    {
      key: "rmin",
      label: "Filter Radius",
      type: "number",
      defaultValue: 1.2,
      min: 0.5,
      max: 3.0,
      step: 0.1,
      description: "Sensitivity filter radius (lower = faster, higher = smoother).",
    },
    {
      key: "move",
      label: "Move Limit",
      type: "number",
      defaultValue: 0.15,
      min: 0.05,
      max: 0.3,
      step: 0.01,
      description: "Max density change per iteration.",
    },
    {
      key: "maxIters",
      label: "Max Iterations",
      type: "number",
      defaultValue: 80,
      min: 10,
      max: 200,
      step: 10,
      description: "Maximum SIMP iterations (lower = faster convergence).",
    },
    {
      key: "tolChange",
      label: "Convergence Tolerance",
      type: "number",
      defaultValue: 0.001,
      min: 0.0001,
      max: 0.01,
      step: 0.0001,
      description: "Stopping criterion.",
    },
    {
      key: "E0",
      label: "Young's Modulus",
      type: "number",
      defaultValue: 1.0,
      min: 0.1,
      max: 10,
      step: 0.1,
      description: "Solid material stiffness.",
    },
    {
      key: "Emin",
      label: "Min Stiffness",
      type: "number",
      defaultValue: 1e-9,
      min: 1e-12,
      max: 1e-3,
      step: 1e-9,
      description: "Void stiffness floor.",
    },
    {
      key: "rhoMin",
      label: "Min Density",
      type: "number",
      defaultValue: 1e-3,
      min: 1e-5,
      max: 0.05,
      step: 1e-3,
      description: "Minimum density clamp.",
    },
    {
      key: "nu",
      label: "Poisson Ratio",
      type: "number",
      defaultValue: 0.3,
      min: 0.1,
      max: 0.45,
      step: 0.01,
      description: "Poisson's ratio.",
    },
    {
      key: "cgTol",
      label: "CG Tolerance",
      type: "number",
      defaultValue: 1e-6,
      min: 1e-10,
      max: 1e-3,
      step: 1e-6,
      description: "Conjugate gradient tolerance.",
    },
    {
      key: "cgMaxIters",
      label: "CG Max Iters",
      type: "number",
      defaultValue: 120,
      min: 50,
      max: 500,
      step: 10,
      description: "Conjugate gradient max iterations (lower = faster per iteration).",
    },
    {
      key: "densityThreshold",
      label: "Density Threshold",
      type: "number",
      defaultValue: 0.3,
      min: 0.1,
      max: 0.9,
      step: 0.05,
      description: "Density cutoff for extracting points from SIMP field.",
    },
    {
      key: "maxLinksPerPoint",
      label: "Max Links Per Point",
      type: "number",
      defaultValue: 4,
      min: 2,
      max: 8,
      step: 1,
      description: "Maximum connectivity degree for each point.",
    },
    {
      key: "maxSpanLength",
      label: "Max Span Length",
      type: "number",
      defaultValue: 1.0,
      min: 0.1,
      max: 10.0,
      step: 0.1,
      description: "Maximum distance between connected points.",
    },
    {
      key: "pipeRadius",
      label: "Pipe Radius",
      type: "number",
      defaultValue: 0.05,
      min: 0.01,
      max: 1.0,
      step: 0.01,
      description: "Radius for multipipe operation.",
    },
    {
      key: "pipeSegments",
      label: "Pipe Segments",
      type: "number",
      defaultValue: 12,
      min: 6,
      max: 32,
      step: 1,
      description: "Multipipe smoothness.",
    },
    {
      key: "seed",
      label: "Random Seed",
      type: "number",
      defaultValue: 42,
      min: 0,
      max: 9999,
      step: 1,
      description: "Random seed for optimization.",
    },
  ],
  display: {
    nameGreek: "Ἐπιλύτης Τοπολογικῆς Βελτιστοποίησης",
    nameEnglish: "Topology Optimization Solver",
    romanization: "Epilýtēs Topologikís Veltitopoíisis",
    description: "Generates topologically optimized structures using point cloud → curve network → multipipe.",
  },
  customUI: {
    dashboardButton: {
      label: "Open Topology Simulator",
      component: "TopologyOptimizationSimulatorDashboard",
    },
  },
  compute: (args) => {
    const { parameters, inputs, context } = args;
    const toNumber = (value: unknown, fallback: number) => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
      }
      return fallback;
    };
    
    const pointDensity = Math.max(10, Math.min(1000, Math.round(
      Number(parameters.pointDensity ?? 100)
    )));
    const maxLinksPerPoint = Math.max(2, Math.min(8, Math.round(
      Number(parameters.maxLinksPerPoint ?? 4)
    )));
    const maxSpanLength = Math.max(0.1, Math.min(10.0, 
      Number(parameters.maxSpanLength ?? 1.0)
    ));
    const pipeRadius = Math.max(0.01, Math.min(1.0, 
      Number(parameters.pipeRadius ?? 0.05)
    ));
    const seed = Math.max(0, Math.min(9999, Math.round(
      Number(parameters.seed ?? 42)
    )));
    const simulationStep = parameters.simulationStep ?? 'idle';
    
    const emptyResult = {
      optimizedMesh: null,
      pointCloud: null,
      curveNetwork: null,
      pointCount: 0,
      curveCount: 0,
      volume: 0,
      surfaceArea: 0,
    };

    const cachedOptimizedMeshId =
      typeof parameters.optimizedMeshId === "string" ? parameters.optimizedMeshId : null;
    const cachedPointCloudId =
      typeof parameters.pointCloudId === "string" ? parameters.pointCloudId : null;
    const cachedCurveNetworkId =
      typeof parameters.curveNetworkId === "string" ? parameters.curveNetworkId : null;
    const hasCached =
      Boolean(cachedOptimizedMeshId) ||
      Boolean(cachedPointCloudId) ||
      Boolean(cachedCurveNetworkId);

    if (hasCached) {
      return {
        optimizedMesh: cachedOptimizedMeshId,
        pointCloud: cachedPointCloudId,
        curveNetwork: cachedCurveNetworkId,
        pointCount: Math.max(0, Math.round(toNumber(parameters.pointCount, 0))),
        curveCount: Math.max(0, Math.round(toNumber(parameters.curveCount, 0))),
        volume: Math.max(0, toNumber(parameters.volume, 0)),
        surfaceArea: Math.max(0, toNumber(parameters.surfaceArea, 0)),
      };
    }
    
    // Return empty result if simulation is idle
    if (simulationStep === 'idle') {
      return emptyResult;
    }
    
    // Get input geometry
    const geometryId = inputs.geometry as string | undefined;
    if (!geometryId) {
      return emptyResult;
    }
    
    const geometry = context.geometryById.get(geometryId) as Geometry | undefined;
    if (!geometry) {
      return emptyResult;
    }
    
    // Check if geometry has mesh data
    const meshGeometry = geometry as MeshGeometry;
    if (!meshGeometry.mesh || meshGeometry.type !== "mesh") {
      return emptyResult;
    }
    
    const mesh = meshGeometry.mesh;
    if (!mesh.positions || mesh.positions.length === 0) {
      return emptyResult;
    }
    
    // Get goals
    const goalsInput = inputs.goals;
    const goals: GoalSpecification[] = [];
    if (Array.isArray(goalsInput)) {
      for (const g of goalsInput) {
        if (g && typeof g === 'object') {
          goals.push(g as unknown as GoalSpecification);
        }
      }
    } else if (goalsInput && typeof goalsInput === 'object') {
      goals.push(goalsInput as unknown as GoalSpecification);
    }
    
    // NOTE: Actual optimization is performed in the simulator dashboard
    // using the SIMP algorithm. This node just returns empty results when idle.
    // The dashboard generates geometry directly and registers it in the store.
    return emptyResult;
  },
};
