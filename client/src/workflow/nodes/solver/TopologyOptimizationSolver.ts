import type { WorkflowNodeDefinition } from "../../nodeRegistry";
import type { Geometry, RenderMesh, Vec3, MeshGeometry } from "../../../types";
import type { GoalSpecification, AnchorGoal, LoadGoal } from "./types";

/**
 * Topology Optimization Solver Node
 * 
 * This solver generates topologically optimized structures using:
 * 1. SIMP (Solid Isotropic Material with Penalization) optimization
 * 2. Goal-based boundary conditions (anchor, load)
 * 3. Marching cubes isosurface extraction at density threshold
 * 4. Optional smoothing post-processing
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
  iconId: "solver",
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
      description: "Topologically optimized structure (marching cubes isosurface).",
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
      defaultValue: 100,
      min: 20,
      max: 150,
      step: 2,
      description: "Grid resolution in X (higher = smoother geometry, slower computation).",
    },
    {
      key: "ny",
      label: "Resolution Y",
      type: "number",
      defaultValue: 75,
      min: 20,
      max: 150,
      step: 2,
      description: "Grid resolution in Y (higher = smoother geometry, slower computation).",
    },
    {
      key: "nz",
      label: "Resolution Z",
      type: "number",
      defaultValue: 40,
      min: 1,
      max: 120,
      step: 1,
      description: "Grid resolution in Z (1 for 2D, 40-100 for 3D, higher = smoother).",
    },
    {
      key: "volFrac",
      label: "Volume Fraction",
      type: "number",
      defaultValue: 0.4,
      min: 0.1,
      max: 0.9,
      step: 0.05,
      description: "Target material fraction (0.3-0.5 typical).",
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
      max: 6.0,
      step: 0.1,
      description: "Final SIMP penalty exponent (3.0 standard).",
    },
    {
      key: "rmin",
      label: "Filter Radius",
      type: "number",
      defaultValue: 2.5,
      min: 0.5,
      max: 5.0,
      step: 0.1,
      description: "Sensitivity filter radius (prevents checkerboarding).",
    },
    {
      key: "move",
      label: "Move Limit",
      type: "number",
      defaultValue: 0.2,
      min: 0.05,
      max: 0.3,
      step: 0.01,
      description: "Max density change per iteration (0.2 standard).",
    },
    {
      key: "maxIters",
      label: "Max Iterations",
      type: "number",
      defaultValue: 300,
      min: 10,
      max: 2000,
      step: 10,
      description: "Maximum SIMP iterations (300-500 typical, 1000+ for high-quality results).",
    },
    {
      key: "minIterations",
      label: "Min Iterations",
      type: "number",
      defaultValue: 150,
      min: 0,
      max: 1000,
      step: 10,
      description: "Minimum iterations before convergence check (150+ recommended for quality results).",
    },
    {
      key: "tolChange",
      label: "Convergence Tolerance",
      type: "number",
      defaultValue: 0.01,
      min: 0.0001,
      max: 0.05,
      step: 0.001,
      description: "Stopping criterion (max density change).",
    },
    {
      key: "E0",
      label: "Young's Modulus",
      type: "number",
      defaultValue: 1.0,
      min: 0.1,
      max: 100,
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
      defaultValue: 0.2,
      min: 0.05,
      max: 0.9,
      step: 0.05,
      description: "Isosurface cutoff for marching cubes (0.2 = more geometry visible, 0.5+ = only high-density regions).",
    },
    {
      key: "grayTol",
      label: "Gray Level Tolerance",
      type: "number",
      defaultValue: 0.03,
      min: 0.01,
      max: 0.2,
      step: 0.01,
      description: "Maximum gray level for convergence (0.03 = 3% gray, forces crisp 0/1 designs).",
    },
    {
      key: "betaMax",
      label: "Beta Max",
      type: "number",
      defaultValue: 64,
      min: 16,
      max: 512,
      step: 16,
      description: "Maximum Heaviside projection sharpness (64 standard).",
    },
    {
      key: "penalStep",
      label: "Penalty Step",
      type: "number",
      defaultValue: 0.05,
      min: 0.01,
      max: 0.5,
      step: 0.01,
      description: "Penalty increment per continuation step (0.05 balanced for quality and speed).",
    },
    {
      key: "betaMultiplier",
      label: "Beta Multiplier",
      type: "number",
      defaultValue: 1.1,
      min: 1.01,
      max: 2.0,
      step: 0.01,
      description: "Beta multiplier per continuation step (1.1 balanced for quality and speed).",
    },
    {
      key: "enableRollback",
      label: "Enable Rollback",
      type: "boolean",
      defaultValue: true,
      description: "Rollback to best design when compliance regresses (prevents losing good designs).",
    },
    {
      key: "rollbackThreshold",
      label: "Rollback Threshold",
      type: "number",
      defaultValue: 1.10,
      min: 1.05,
      max: 1.50,
      step: 0.05,
      description: "Compliance regression ratio that triggers rollback (1.10 = 10% worse than best).",
    },
    {
      key: "contStableIters",
      label: "Stable Iterations",
      type: "number",
      defaultValue: 15,
      min: 3,
      max: 30,
      step: 1,
      description: "Consecutive stable iterations required before advancing continuation parameters.",
    },
    {
      key: "contTolRel",
      label: "Stability Tolerance",
      type: "number",
      defaultValue: 0.002,
      min: 0.0001,
      max: 0.02,
      step: 0.0001,
      description: "Relative change threshold for stability detection (0.002 = 0.2% change).",
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
    description: "Generates topologically optimized structures using SIMP optimization and marching cubes isosurface extraction.",
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
    const seed = Math.max(0, Math.min(9999, Math.round(
      Number(parameters.seed ?? 42)
    )));
    const simulationStep = parameters.simulationStep ?? 'idle';
    
    const emptyResult = {
      optimizedMesh: null,
      volume: 0,
      surfaceArea: 0,
    };

    const cachedOptimizedMeshId =
      typeof parameters.optimizedMeshId === "string" 
        ? parameters.optimizedMeshId 
        : null;
    const hasCached = Boolean(cachedOptimizedMeshId);

    if (hasCached) {
      return {
        optimizedMesh: cachedOptimizedMeshId,
        volume: Math.max(0, toNumber(parameters.volume, 0)),
        surfaceArea: Math.max(0, toNumber(parameters.surfaceArea, 0)),
      };
    }
    
    // Return empty result if simulation is idle (no cached mesh)
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
