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
  penalEnd: number;        // Final penalty (typically 3.0)
  penalRampIters: number;  // Iterations to ramp from start to end
  rmin: number;            // Filter radius in elements
  move: number;            // Move limit (0.1-0.2)
  maxIters: number;        // Maximum iterations
  tolChange: number;       // Convergence tolerance
  E0: number;              // Young's modulus (solid material)
  Emin: number;            // Minimum stiffness (void material)
  rhoMin: number;          // Minimum density
  nu: number;              // Poisson's ratio
  cgTol: number;           // CG solver tolerance
  cgMaxIters: number;      // CG solver max iterations
  strictConvergence?: boolean; // Fail if FE solver does not converge
};

/**
 * Goal markers extracted from goal nodes
 */
export type AnchorMarker = {
  position: Vec3;
};

export type LoadMarker = {
  position: Vec3;
  force: Vec3;
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
