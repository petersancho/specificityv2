import type { Vec3, RenderMesh } from "../../../types";

// ============================================================================
// SIMP TOPOLOGY OPTIMIZATION - TYPE CONTRACTS
// ============================================================================

/**
 * SIMP algorithm parameters
 */
export type SimpParams = {
  nx: number;              // Grid resolution X
  ny: number;              // Grid resolution Y
  nz: number;              // Grid resolution Z (1 for 2D)
  volFrac: number;         // Target volume fraction (0-1)
  penal: number;           // SIMP penalty exponent (current value, updated via continuation)
  penalStart: number;      // Starting penalty (typically 1.0)
  penalEnd: number;        // Final penalty (typically 3.0-5.0)
  penalRampIters: number;  // DEPRECATED: No longer used with adaptive continuation
  rmin: number;            // Filter radius in elements
  move: number;            // Move limit (0.1-0.2)
  maxIters: number;        // Maximum iterations
  tolChange: number;       // Convergence tolerance
  minIterations?: number;  // Minimum stable iterations for convergence
  grayTol?: number;        // Gray level tolerance (0 = pure 0/1, 1 = all gray)
  betaMax?: number;        // Maximum beta for Heaviside projection (default 256)
  E0: number;              // Young's modulus (solid material)
  Emin: number;            // Minimum stiffness (void material)
  rhoMin: number;          // Minimum density
  nu: number;              // Poisson's ratio
  cgTol: number;           // CG solver tolerance
  cgMaxIters: number;      // CG solver max iterations
  strictConvergence?: boolean; // Fail if FE solver does not converge
  emitEvery?: number;      // Emit frames every N iterations
  yieldEvery?: number;     // Yield to main thread every N iterations
  cgBoostFactor?: number;  // Boost factor for CG iterations when solver stalls
  // Adaptive continuation parameters (ultra-conservative defaults)
  penalStep?: number;      // Penalty increment per step (default 0.05)
  betaMultiplier?: number; // Beta multiplier per step (default 1.1)
  contStableIters?: number; // Iterations of stability before continuation advance (default 15)
  contTolRel?: number;     // Relative compliance tolerance for stability (default 0.002 = 0.2%)
  enableRollback?: boolean; // Enable checkpoint/rollback to best design (default true)
  rollbackThreshold?: number; // Compliance regression threshold for rollback (default 1.10 = 10%)
};

/**
 * Goal region metadata (PhD-level geometry analysis)
 */
export type GoalRegionMetadata = {
  vertices: number[];
  positions: Vec3[];
  centroid: Vec3;
  weightedCentroid: Vec3;
  totalArea: number;
  averageNormal: Vec3;
  bounds: { min: Vec3; max: Vec3 };
  isValid: boolean;
  validationErrors: string[];
};

/**
 * Distributed nodes for boundary conditions
 * Replaces point loads/anchors with region-based distribution
 */
export type DistributedNodes = {
  nodeIds: number[];
  weights: number[]; // Normalized weights (sum = 1.0 for loads)
};

/**
 * Goal markers extracted from goal nodes
 * UPDATED: Now includes distributed nodes for proper BC mapping
 */
export type AnchorMarker = {
  position: Vec3; // Reference centroid (for visualization)
  vertices: number[]; // Original vertex indices
  distributed?: DistributedNodes; // Distributed grid nodes
  dofMask?: [boolean, boolean, boolean]; // DOF constraints [x, y, z]
  metadata?: GoalRegionMetadata;
};

export type LoadMarker = {
  position: Vec3; // Reference centroid (for visualization)
  force: Vec3; // Total resultant force
  vertices: number[]; // Original vertex indices
  distributed?: DistributedNodes; // Distributed grid nodes
  metadata?: GoalRegionMetadata;
};

export type GoalMarkers = {
  anchors: AnchorMarker[];
  loads: LoadMarker[];
};

/**
 * Finite element model (internal to solver)
 */
export type FEModel = {
  nx: number;
  ny: number;
  nz: number;
  numElements: number;
  numNodes: number;
  numDofs: number;
  elementSize: Vec3;
  bounds: {
    min: Vec3;
    max: Vec3;
  };
};

/**
 * Boundary conditions
 */
export type BoundaryConditions = {
  fixedDofs: Set<number>;
  loads: Map<number, number>;  // dof -> force value
};

/**
 * Geometry setup result (output of setup module)
 */
export type SetupResult = {
  fe: FEModel;
  bc: BoundaryConditions;
  initialDensities: Float32Array;
  markers: GoalMarkers;
};

/**
 * Solver iteration frame (output of solver module)
 */
export type SolverFrame = {
  iter: number;
  compliance: number;
  change: number;
  vol: number;
  densities: Float32Array;
  converged: boolean;
  feConverged?: boolean;
  feIters?: number;
  error?: string;
  timings?: {
    filterMs?: number | string;
    solveMs?: number | string;
    updateMs?: number | string;
    totalMs?: number | string;
    cgIters?: number;
    cgTol?: string;
  };
};

/**
 * Simulation state
 */
export type SimulationState = 'idle' | 'running' | 'paused' | 'converged' | 'error';

/**
 * Simulation history for graphing
 */
export type SimulationHistory = {
  compliance: number[];
  change: number[];
  vol: number[];
};
