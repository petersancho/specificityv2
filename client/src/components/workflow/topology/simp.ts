// ============================================================================
// UNIFIED SIMP TOPOLOGY OPTIMIZATION SOLVER
// ============================================================================
//
// MATHEMATICAL FOUNDATION:
// 
// 1. SIMP (Solid Isotropic Material with Penalization)
//    - Material interpolation: E(ρ) = Emin + ρ^p * (E0 - Emin)
//    - Penalty p: 1 → 3 (continuation for convergence)
//    - Drives densities toward 0/1 (void/solid)
//
// 2. Optimization Problem:
//    - Minimize: Compliance C = f^T u (structural flexibility)
//    - Subject to: Volume constraint Σρ = V_target
//    - Where: K(ρ) u = f (equilibrium equation)
//
// 3. Sensitivity Analysis:
//    - dC/dρ = -p * ρ^(p-1) * (E0 - Emin) * u^T K_e u
//    - Negative sensitivity → increasing density decreases compliance
//
// 4. Optimality Criteria (OC) Update:
//    - Bisection to find Lagrange multiplier λ
//    - ρ_new = ρ * sqrt(-dC/dρ / λ)
//    - Move limit: |ρ_new - ρ| ≤ move (stability)
//    - Ensures volume constraint satisfied
//
// 5. Density Filter (Lazarov & Sigmund 2011):
//    - Separable 3D convolution: O(N·K) instead of O(N·K³)
//    - Prevents checkerboarding and mesh dependency
//    - Chain rule for sensitivity backpropagation
//
// 6. Heaviside Projection (Guest et al. 2004):
//    - Projects filtered densities to 0/1
//    - β: 1 → 64 (continuation for convergence)
//    - Eliminates gray elements (intermediate densities)
//
// 7. Matrix-Free FEA:
//    - No global stiffness matrix assembly
//    - Element-by-element matrix-vector products
//    - Memory: O(N) instead of O(N²)
//
// 8. PCG Solver (Preconditioned Conjugate Gradient):
//    - Diagonal preconditioner: M = diag(K)
//    - Warm-start from previous iteration
//    - Adaptive tolerance: loose early, tight late
//    - Regularization: K_reg = K + εI (handles rigid body modes)
//
// CONVERGENCE CRITERIA:
//    - Compliance change < 0.1%
//    - Density change < 0.3%
//    - Gray level < 5% (discrete 0/1 solution)
//    - Stable for 8+ consecutive iterations
//
// REFERENCES:
//    - Bendsøe & Sigmund (2003) - Topology Optimization
//    - Sigmund (2001) - 99-line topology optimization code
//    - Lazarov & Sigmund (2011) - Separable density filter
//    - Guest et al. (2004) - Heaviside projection
//
// ============================================================================

import type { SimpParams, SolverFrame, GoalMarkers } from "./types";
import type { RenderMesh, Vec3 } from "../../../types";
import { validateProblem, DefaultValidationConfig, type ValidationConfig } from "./validation";
import { SimpValidationError, hasErrors } from "./errors";

const DEBUG = false;

const MAX_MEMORY_MB = 400;
const PCG_DIVERGENCE_FACTOR = 1e10;
const PCG_MIN_ITERS_BEFORE_DIVERGENCE_CHECK = 5;

// ============================================================================
// DIVERGENCE DETECTION - Sliding Window Tracker
// ============================================================================

class ComplianceTracker {
  private history: number[] = [];
  private best = Number.POSITIVE_INFINITY;
  private consecutiveBadWindows = 0;

  constructor(
    private windowSize: number,
    private tolBest: number,           // e.g. 0.015 => 1.5%
    private badWindowsToStop: number,  // e.g. 3
  ) {}

  update(c: number) {
    this.best = Math.min(this.best, c);
    this.history.push(c);
    if (this.history.length > this.windowSize) this.history.shift();

    if (this.history.length < this.windowSize) {
      return { diverged: false, best: this.best, slope: 0, consecutiveBadWindows: 0 };
    }

    // Simple slope estimate over window (least-squares on indices)
    const n = this.history.length;
    let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
    for (let i = 0; i < n; i++) {
      const x = i;
      const y = this.history[i];
      sumX += x; sumY += y; sumXX += x * x; sumXY += x * y;
    }
    const denom = n * sumXX - sumX * sumX;
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;

    const worseThanBest = c > this.best * (1 + this.tolBest);
    const trendingUp = slope > 0;

    if (worseThanBest && trendingUp) this.consecutiveBadWindows++;
    else this.consecutiveBadWindows = 0;

    return {
      diverged: this.consecutiveBadWindows >= this.badWindowsToStop,
      best: this.best,
      slope,
      consecutiveBadWindows: this.consecutiveBadWindows
    };
  }
}

// ============================================================================
// STABILITY HELPERS
// ============================================================================

function assertFiniteNumber(name: string, v: number): void {
  if (!Number.isFinite(v)) {
    throw new Error(`[SIMP] ${name} is not finite: ${v}`);
  }
}

function assertFiniteArray(name: string, a: ArrayLike<number>, sampleStride = 97): void {
  for (let i = 0; i < a.length; i += sampleStride) {
    const v = a[i];
    if (!Number.isFinite(v)) {
      throw new Error(`[SIMP] ${name}[${i}] is not finite: ${v}`);
    }
  }
}

function estimateMemoryMB(nx: number, ny: number, nz: number): number {
  const numElems = nx * ny * nz;
  const numNodes = (nx + 1) * (ny + 1) * (nz + 1);
  const numDofs = numNodes * 3;
  
  const bytesPerElem = 8 * 10;
  const bytesPerDof = 8 * 8;
  
  const totalBytes = numElems * bytesPerElem + numDofs * bytesPerDof;
  return totalBytes / (1024 * 1024);
}

// ============================================================================
// DENSITY FILTER (Separable 3D Convolution for Performance)
// Based on Lazarov & Sigmund (2011) - O(N·K) instead of O(N·K³)
// ============================================================================

interface SeparableDensityFilter {
  nx: number;
  ny: number;
  nz: number;
  numElems: number;
  weightsX: Float32Array;
  weightsY: Float32Array;
  weightsZ: Float32Array;
  radiusX: number;
  radiusY: number;
  radiusZ: number;
  normFactor: number;
  temp1: Float32Array;
  temp2: Float32Array;
}

function build1DWeights(rmin: number): { weights: Float32Array; radius: number } {
  const r = Math.ceil(rmin);
  const weights: number[] = [];
  
  for (let d = -r; d <= r; d++) {
    const dist = Math.abs(d);
    if (dist <= rmin) {
      weights.push(rmin - dist);
    }
  }
  
  return { weights: new Float32Array(weights), radius: r };
}

function precomputeSeparableDensityFilter(nx: number, ny: number, nz: number, rmin: number): SeparableDensityFilter {
  const t0 = performance.now();
  const numElems = nx * ny * nz;
  
  const { weights: weightsX, radius: radiusX } = build1DWeights(rmin);
  const { weights: weightsY, radius: radiusY } = build1DWeights(rmin);
  const { weights: weightsZ, radius: radiusZ } = build1DWeights(rmin);
  
  let sumWeights = 0;
  for (let i = 0; i < weightsX.length; i++) sumWeights += weightsX[i];
  const normFactor = sumWeights > 1e-14 ? 1.0 / (sumWeights * sumWeights * sumWeights) : 1.0;
  
  const temp1 = new Float32Array(numElems);
  const temp2 = new Float32Array(numElems);
  
  const t1 = performance.now();
  const totalWeights = weightsX.length + weightsY.length + weightsZ.length;
  console.log(`[SIMP] Separable density filter precomputed in ${(t1 - t0).toFixed(1)}ms (${numElems} elements, ${totalWeights} total weights, radius=${rmin.toFixed(1)})`);
  
  return { nx, ny, nz, numElems, weightsX, weightsY, weightsZ, radiusX, radiusY, radiusZ, normFactor, temp1, temp2 };
}

function applySeparableDensityFilter(rho: Float32Array, filter: SeparableDensityFilter, out?: Float32Array): Float32Array {
  const { nx, ny, nz, weightsX, weightsY, weightsZ, radiusX, radiusY, radiusZ, normFactor, temp1, temp2 } = filter;
  const rhoBar = out ?? new Float32Array(filter.numElems);
  
  const centerX = radiusX;
  const centerY = radiusY;
  const centerZ = radiusZ;
  
  temp1.fill(0);
  for (let ez = 0; ez < nz; ez++) {
    for (let ey = 0; ey < ny; ey++) {
      for (let ex = 0; ex < nx; ex++) {
        const e = ez * nx * ny + ey * nx + ex;
        let sum = 0;
        for (let i = 0; i < weightsX.length; i++) {
          const dx = i - centerX;
          const ix = ex + dx;
          if (ix >= 0 && ix < nx) {
            const neighbor = ez * nx * ny + ey * nx + ix;
            sum += weightsX[i] * rho[neighbor];
          }
        }
        temp1[e] = sum;
      }
    }
  }
  
  temp2.fill(0);
  for (let ez = 0; ez < nz; ez++) {
    for (let ey = 0; ey < ny; ey++) {
      for (let ex = 0; ex < nx; ex++) {
        const e = ez * nx * ny + ey * nx + ex;
        let sum = 0;
        for (let j = 0; j < weightsY.length; j++) {
          const dy = j - centerY;
          const jy = ey + dy;
          if (jy >= 0 && jy < ny) {
            const neighbor = ez * nx * ny + jy * nx + ex;
            sum += weightsY[j] * temp1[neighbor];
          }
        }
        temp2[e] = sum;
      }
    }
  }
  
  rhoBar.fill(0);
  for (let ez = 0; ez < nz; ez++) {
    for (let ey = 0; ey < ny; ey++) {
      for (let ex = 0; ex < nx; ex++) {
        const e = ez * nx * ny + ey * nx + ex;
        let sum = 0;
        for (let k = 0; k < weightsZ.length; k++) {
          const dz = k - centerZ;
          const kz = ez + dz;
          if (kz >= 0 && kz < nz) {
            const neighbor = kz * nx * ny + ey * nx + ex;
            sum += weightsZ[k] * temp2[neighbor];
          }
        }
        rhoBar[e] = sum * normFactor;
      }
    }
  }
  
  return rhoBar;
}

function applySeparableFilterChainRule(dCdrhoBar: Float32Array, filter: SeparableDensityFilter, out?: Float32Array): Float32Array {
  const { nx, ny, nz, weightsX, weightsY, weightsZ, radiusX, radiusY, radiusZ, normFactor, temp1, temp2 } = filter;
  const dCdrho = out ?? new Float32Array(filter.numElems);
  
  const centerX = radiusX;
  const centerY = radiusY;
  const centerZ = radiusZ;
  
  temp2.fill(0);
  for (let ez = 0; ez < nz; ez++) {
    for (let ey = 0; ey < ny; ey++) {
      for (let ex = 0; ex < nx; ex++) {
        const e = ez * nx * ny + ey * nx + ex;
        const val = dCdrhoBar[e] * normFactor;
        for (let k = 0; k < weightsZ.length; k++) {
          const dz = k - centerZ;
          const kz = ez + dz;
          if (kz >= 0 && kz < nz) {
            const neighbor = kz * nx * ny + ey * nx + ex;
            temp2[neighbor] += weightsZ[k] * val;
          }
        }
      }
    }
  }
  
  temp1.fill(0);
  for (let ez = 0; ez < nz; ez++) {
    for (let ey = 0; ey < ny; ey++) {
      for (let ex = 0; ex < nx; ex++) {
        const e = ez * nx * ny + ey * nx + ex;
        const val = temp2[e];
        for (let j = 0; j < weightsY.length; j++) {
          const dy = j - centerY;
          const jy = ey + dy;
          if (jy >= 0 && jy < ny) {
            const neighbor = ez * nx * ny + jy * nx + ex;
            temp1[neighbor] += weightsY[j] * val;
          }
        }
      }
    }
  }
  
  dCdrho.fill(0);
  for (let ez = 0; ez < nz; ez++) {
    for (let ey = 0; ey < ny; ey++) {
      for (let ex = 0; ex < nx; ex++) {
        const e = ez * nx * ny + ey * nx + ex;
        const val = temp1[e];
        for (let i = 0; i < weightsX.length; i++) {
          const dx = i - centerX;
          const ix = ex + dx;
          if (ix >= 0 && ix < nx) {
            const neighbor = ez * nx * ny + ey * nx + ix;
            dCdrho[neighbor] += weightsX[i] * val;
          }
        }
      }
    }
  }
  
  return dCdrho;
}

// ============================================================================
// HEAVISIDE PROJECTION
// ============================================================================

function heavisideProject(rhoBar: number, beta: number, eta: number): number {
  const tanhBetaEta = Math.tanh(beta * eta);
  const denom = tanhBetaEta + Math.tanh(beta * (1.0 - eta));
  return (tanhBetaEta + Math.tanh(beta * (rhoBar - eta))) / denom;
}

function heavisideDerivative(rhoBar: number, beta: number, eta: number): number {
  const tanhBetaEta = Math.tanh(beta * eta);
  const denom = tanhBetaEta + Math.tanh(beta * (1.0 - eta));
  const tanhTerm = Math.tanh(beta * (rhoBar - eta));
  return beta * (1.0 - tanhTerm * tanhTerm) / denom;
}

function computeGrayLevel(rho: Float32Array | Float64Array): number {
  let sum = 0;
  for (let i = 0; i < rho.length; i++) sum += rho[i] * (1.0 - rho[i]);
  return (4.0 * sum) / rho.length;
}

// ============================================================================
// MATRIX-FREE FE KERNEL
// ============================================================================

interface ElementKernel {
  nx: number; ny: number; nz: number;
  numElems: number; numNodes: number; numDofs: number;
  elemVol: number;
  Ke0: Float64Array;
  Ke0Diag: Float64Array;
  edofMat: Uint32Array;
  bounds: { min: Vec3; max: Vec3 };
}

function computeKe0H8(nu: number): Float64Array {
  const Ke = new Float64Array(576);
  const factor = 1.0 / ((1.0 + nu) * (1.0 - 2.0 * nu));
  const D = new Float64Array([
    factor * (1 - nu), factor * nu, factor * nu, 0, 0, 0,
    factor * nu, factor * (1 - nu), factor * nu, 0, 0, 0,
    factor * nu, factor * nu, factor * (1 - nu), 0, 0, 0,
    0, 0, 0, factor * (1 - 2 * nu) / 2, 0, 0,
    0, 0, 0, 0, factor * (1 - 2 * nu) / 2, 0,
    0, 0, 0, 0, 0, factor * (1 - 2 * nu) / 2
  ]);
  
  const gp = 1.0 / Math.sqrt(3.0);
  const gaussPts = [
    [-gp, -gp, -gp], [gp, -gp, -gp], [gp, gp, -gp], [-gp, gp, -gp],
    [-gp, -gp, gp], [gp, -gp, gp], [gp, gp, gp], [-gp, gp, gp]
  ];
  const nodeXi = [-1, 1, 1, -1, -1, 1, 1, -1];
  const nodeEta = [-1, -1, 1, 1, -1, -1, 1, 1];
  const nodeZeta = [-1, -1, -1, -1, 1, 1, 1, 1];
  
  for (const [xi, eta, zeta] of gaussPts) {
    const dN_dxi = new Float64Array(8), dN_deta = new Float64Array(8), dN_dzeta = new Float64Array(8);
    for (let i = 0; i < 8; i++) {
      dN_dxi[i] = 0.125 * nodeXi[i] * (1 + nodeEta[i] * eta) * (1 + nodeZeta[i] * zeta);
      dN_deta[i] = 0.125 * (1 + nodeXi[i] * xi) * nodeEta[i] * (1 + nodeZeta[i] * zeta);
      dN_dzeta[i] = 0.125 * (1 + nodeXi[i] * xi) * (1 + nodeEta[i] * eta) * nodeZeta[i];
    }
    
    const B = new Float64Array(144);
    for (let i = 0; i < 8; i++) {
      const ux = i * 3, uy = i * 3 + 1, uz = i * 3 + 2;
      B[0 * 24 + ux] = dN_dxi[i];
      B[1 * 24 + uy] = dN_deta[i];
      B[2 * 24 + uz] = dN_dzeta[i];
      B[3 * 24 + ux] = dN_deta[i]; B[3 * 24 + uy] = dN_dxi[i];
      B[4 * 24 + uy] = dN_dzeta[i]; B[4 * 24 + uz] = dN_deta[i];
      B[5 * 24 + ux] = dN_dzeta[i]; B[5 * 24 + uz] = dN_dxi[i];
    }
    
    const DB = new Float64Array(144);
    for (let j = 0; j < 24; j++) {
      for (let r = 0; r < 6; r++) {
        let sum = 0;
        for (let k = 0; k < 6; k++) sum += D[r * 6 + k] * B[k * 24 + j];
        DB[r * 24 + j] = sum;
      }
    }
    
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 24; j++) {
        let sum = 0;
        for (let k = 0; k < 6; k++) sum += B[k * 24 + i] * DB[k * 24 + j];
        Ke[i * 24 + j] += sum;
      }
    }
  }
  return Ke;
}

function createElementKernel(nx: number, ny: number, nz: number, bounds: { min: Vec3; max: Vec3 }, nu: number): ElementKernel {
  const numElems = nx * ny * nz;
  const numNodes = (nx + 1) * (ny + 1) * (nz + 1);
  const numDofs = numNodes * 3;
  const dx = (bounds.max.x - bounds.min.x) / nx;
  const dy = (bounds.max.y - bounds.min.y) / ny;
  const dz = nz > 1 ? (bounds.max.z - bounds.min.z) / nz : 1;
  const elemVol = dx * dy * dz;
  
  const Ke0 = computeKe0H8(nu);
  const Ke0Diag = new Float64Array(24);
  for (let i = 0; i < 24; i++) Ke0Diag[i] = Ke0[i * 24 + i];
  
  const nxy = (nx + 1) * (ny + 1);
  const edofMat = new Uint32Array(numElems * 24);
  
  for (let ez = 0; ez < nz; ez++) {
    for (let ey = 0; ey < ny; ey++) {
      for (let ex = 0; ex < nx; ex++) {
        const e = ez * nx * ny + ey * nx + ex;
        const n0 = ez * nxy + ey * (nx + 1) + ex;
        const nodes = [n0, n0 + 1, n0 + (nx + 1) + 1, n0 + (nx + 1), n0 + nxy, n0 + nxy + 1, n0 + nxy + (nx + 1) + 1, n0 + nxy + (nx + 1)];
        for (let i = 0; i < 8; i++) {
          edofMat[e * 24 + i * 3] = nodes[i] * 3;
          edofMat[e * 24 + i * 3 + 1] = nodes[i] * 3 + 1;
          edofMat[e * 24 + i * 3 + 2] = nodes[i] * 3 + 2;
        }
      }
    }
  }
  
  return { nx, ny, nz, numElems, numNodes, numDofs, elemVol, Ke0, Ke0Diag, edofMat, bounds };
}

// Regularization factor to prevent singular/near-singular matrix (handles rigid body modes)
// Increased from 1e-6 to 1e-4, then to 1e-3 to handle ill-conditioning as material is removed
// With E0=1.0 and elemVol≈0.001, regScale = 1e-3 * 1.0 * 0.001 = 1e-6 (effective for ill-conditioned problems)
// This prevents compliance explosion when structure becomes weak with insufficient boundary conditions
const MATRIX_REGULARIZATION = 1e-3;

function matrixFreeKx(kernel: ElementKernel, rho: Float64Array, x: Float64Array, penal: number, E0: number, Emin: number, out?: Float64Array, fixedDofs?: Set<number>): Float64Array {
  const y = out ?? new Float64Array(kernel.numDofs);
  if (out) y.fill(0);
  const ue = new Float64Array(24), Kue = new Float64Array(24);
  
  for (let e = 0; e < kernel.numElems; e++) {
    const E = Emin + Math.pow(rho[e], penal) * (E0 - Emin);
    const scale = E * kernel.elemVol;
    for (let i = 0; i < 24; i++) ue[i] = x[kernel.edofMat[e * 24 + i]];
    for (let i = 0; i < 24; i++) {
      let sum = 0;
      for (let j = 0; j < 24; j++) sum += kernel.Ke0[i * 24 + j] * ue[j];
      Kue[i] = sum * scale;
    }
    for (let i = 0; i < 24; i++) y[kernel.edofMat[e * 24 + i]] += Kue[i];
  }
  
  // Add small regularization term: y += ε * x
  // This makes the matrix positive definite even if there are rigid body modes
  const regScale = E0 * kernel.elemVol * MATRIX_REGULARIZATION;
  for (let i = 0; i < kernel.numDofs; i++) {
    if (!fixedDofs || !fixedDofs.has(i)) {
      y[i] += regScale * x[i];
    }
  }
  
  return y;
}

function computeKDiagonal(kernel: ElementKernel, rho: Float64Array, penal: number, E0: number, Emin: number, out?: Float64Array): Float64Array {
  const diag = out ?? new Float64Array(kernel.numDofs);
  diag.fill(0);
  for (let e = 0; e < kernel.numElems; e++) {
    const scale = (Emin + Math.pow(rho[e], penal) * (E0 - Emin)) * kernel.elemVol;
    for (let i = 0; i < 24; i++) diag[kernel.edofMat[e * 24 + i]] += kernel.Ke0Diag[i] * scale;
  }
  
  // Add regularization term to diagonal (must match matrixFreeKx regularization)
  const regScale = E0 * kernel.elemVol * MATRIX_REGULARIZATION;
  for (let i = 0; i < diag.length; i++) {
    diag[i] += regScale;
  }
  
  // Ensure diagonal entries are positive and not too small (for numerical stability)
  let sumDiag = 0, countNonZero = 0;
  for (let i = 0; i < diag.length; i++) {
    if (diag[i] > 1e-14) { sumDiag += diag[i]; countNonZero++; }
  }
  const avgDiag = countNonZero > 0 ? sumDiag / countNonZero : 1.0;
  const minDiag = avgDiag * 1e-8; // Minimum is 1e-8 times average
  for (let i = 0; i < diag.length; i++) {
    if (diag[i] < minDiag) diag[i] = minDiag;
  }
  return diag;
}

function computeElementCe(kernel: ElementKernel, u: Float64Array): Float64Array {
  const ce = new Float64Array(kernel.numElems);
  const ue = new Float64Array(24), Kue = new Float64Array(24);
  
  for (let e = 0; e < kernel.numElems; e++) {
    for (let i = 0; i < 24; i++) ue[i] = u[kernel.edofMat[e * 24 + i]];
    for (let i = 0; i < 24; i++) {
      let sum = 0;
      for (let j = 0; j < 24; j++) sum += kernel.Ke0[i * 24 + j] * ue[j];
      Kue[i] = sum;
    }
    let energy = 0;
    for (let i = 0; i < 24; i++) energy += ue[i] * Kue[i];
    ce[e] = energy * kernel.elemVol;
  }
  return ce;
}

function dot(a: Float64Array, b: Float64Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

// ============================================================================
// PCG SOLVER (with Workspace Pooling and Warm Start)
// ============================================================================

interface PCGWorkspace {
  r: Float64Array;
  z: Float64Array;
  p: Float64Array;
  Ap: Float64Array;
  M: Float64Array;
  fMod: Float64Array;
}

function createPCGWorkspace(numDofs: number): PCGWorkspace {
  return {
    r: new Float64Array(numDofs),
    z: new Float64Array(numDofs),
    p: new Float64Array(numDofs),
    Ap: new Float64Array(numDofs),
    M: new Float64Array(numDofs),
    fMod: new Float64Array(numDofs)
  };
}

function solvePCG(
  kernel: ElementKernel, rho: Float64Array, f: Float64Array, fixedDofs: Set<number>,
  penal: number, E0: number, Emin: number, tol: number, maxIters: number,
  workspace: PCGWorkspace, uPrev?: Float64Array
): { u: Float64Array; converged: boolean; iters: number } {
  const n = kernel.numDofs;
  const { r, z, p, Ap, M, fMod } = workspace;
  
  const u = new Float64Array(n);
  
  computeKDiagonal(kernel, rho, penal, E0, Emin, M);
  
  for (const dof of fixedDofs) M[dof] = 1.0;
  
  for (let i = 0; i < n; i++) fMod[i] = f[i];
  for (const dof of fixedDofs) fMod[dof] = 0;
  
  // Check if warm-start is viable by computing initial residual
  let useWarmStart = false;
  if (uPrev) {
    for (let i = 0; i < n; i++) u[i] = uPrev[i];
    matrixFreeKx(kernel, rho, u, penal, E0, Emin, r, fixedDofs);
    for (let i = 0; i < n; i++) r[i] = fMod[i] - r[i];
    for (const dof of fixedDofs) r[dof] = 0;
    
    const resNormWarm = Math.sqrt(dot(r, r));
    const fNorm = Math.sqrt(dot(fMod, fMod));
    
    // Only use warm-start if initial residual is reasonable (< 100% of force norm)
    // If resNorm > fNorm, the warm-start is worse than starting from zero!
    if (resNormWarm < fNorm) {
      useWarmStart = true;
    } else {
      // Warm-start is bad, do cold start instead
      for (let i = 0; i < n; i++) u[i] = 0;
      for (let i = 0; i < n; i++) r[i] = fMod[i];
    }
  } else {
    for (let i = 0; i < n; i++) r[i] = fMod[i];
  }
  
  for (let i = 0; i < n; i++) z[i] = r[i] / M[i];
  for (let i = 0; i < n; i++) p[i] = z[i];
  
  let rz = dot(r, z);
  
  // Adaptive tolerance based on initial residual
  // If problem is ill-conditioned (large initial residual), use looser tolerance
  const fNorm = Math.sqrt(dot(fMod, fMod));
  const resNorm0Check = Math.sqrt(dot(r, r));
  const adaptiveTolFactor = resNorm0Check > fNorm ? Math.min(resNorm0Check / fNorm, 10.0) : 1.0;
  const tolAbs = Math.max(tol * adaptiveTolFactor * fNorm, 1e-14);
  
  let resNorm0 = -1;
  
  let converged = false, iters = 0;
  let lastLogIter = -100;
  
  for (iters = 0; iters < maxIters; iters++) {
    const resNorm = Math.sqrt(dot(r, r));
    
    if (iters === 0) {
      resNorm0 = resNorm;
      const warmStartStatus = uPrev ? (useWarmStart ? 'yes' : 'rejected') : 'no';
      console.log(`[PCG] Starting: resNorm0=${resNorm.toExponential(2)}, tol=${tolAbs.toExponential(2)}, warmStart=${warmStartStatus}, maxIters=${maxIters}, fixedDofs=${fixedDofs.size}`);
      
      // Warn if insufficient boundary conditions (need at least 6 DOFs to prevent rigid body modes)
      if (fixedDofs.size < 6) {
        console.warn(`[PCG] WARNING: Only ${fixedDofs.size} DOFs are fixed. Need at least 6 to prevent rigid body modes (3 translations + 3 rotations). This may cause slow convergence or divergence.`);
      }
    }
    
    // Log progress every 100 iterations
    if (iters > 0 && iters % 100 === 0 && iters !== lastLogIter) {
      console.log(`[PCG] iter ${iters}: resNorm=${resNorm.toExponential(2)}, ratio=${(resNorm/resNorm0).toExponential(2)}`);
      lastLogIter = iters;
    }
    
    if (iters >= PCG_MIN_ITERS_BEFORE_DIVERGENCE_CHECK && resNorm0 > 0 && resNorm > resNorm0 * PCG_DIVERGENCE_FACTOR) {
      console.error(`[PCG] Diverging at iter ${iters} (resNorm grew from ${resNorm0.toExponential(2)} to ${resNorm.toExponential(2)}). Check boundary conditions.`);
      for (const dof of fixedDofs) u[dof] = 0;
      return { u, converged: false, iters };
    }
    
    if (resNorm < tolAbs) { 
      converged = true;
      console.log(`[PCG] Converged in ${iters} iterations (resNorm=${resNorm.toExponential(2)}, tol=${tolAbs.toExponential(2)})`);
      break;
    }
    if (!Number.isFinite(resNorm)) {
      console.error(`[PCG] resNorm is ${resNorm} at iter ${iters}. Numerical instability detected.`);
      break;
    }
    
    matrixFreeKx(kernel, rho, p, penal, E0, Emin, Ap, fixedDofs);
    for (const dof of fixedDofs) Ap[dof] = 0;
    
    const pAp = dot(p, Ap);
    if (Math.abs(pAp) < 1e-30 || !Number.isFinite(pAp)) {
      console.error(`[PCG] pAp=${pAp} at iter ${iters}. Matrix may be singular or ill-conditioned.`);
      break;
    }
    const alpha = rz / pAp;
    if (!Number.isFinite(alpha)) {
      console.error(`[PCG] alpha=${alpha} at iter ${iters} (rz=${rz}, pAp=${pAp}). Numerical instability.`);
      break;
    }
    
    for (let i = 0; i < n; i++) {
      u[i] += alpha * p[i];
      r[i] -= alpha * Ap[i];
      z[i] = r[i] / M[i];
    }
    
    const rzNew = dot(r, z);
    if (!Number.isFinite(rzNew)) {
      console.error(`[PCG] rzNew=${rzNew} at iter ${iters}. Numerical instability.`);
      break;
    }
    const betaCG = rzNew / rz;
    rz = rzNew;
    
    for (let i = 0; i < n; i++) p[i] = z[i] + betaCG * p[i];
    for (const dof of fixedDofs) p[dof] = 0;
  }
  
  for (const dof of fixedDofs) u[dof] = 0;
  
  if (!converged && iters >= maxIters) {
    console.warn(`[PCG] Did not converge in ${iters} iterations (resNorm=${Math.sqrt(dot(r, r)).toExponential(2)}, tol=${tolAbs.toExponential(2)})`);
  }
  
  return { u, converged, iters };
}

// ============================================================================
// SIMP ALGORITHM
// ============================================================================

const ADAPTIVE_CG_TOL_EARLY = 1e-2;  // 1% error - early iterations (problem is ill-conditioned with uniform density)
const ADAPTIVE_CG_TOL_MID = 1e-2;    // 1% error - mid iterations (keep loose to handle ill-conditioning)
const ADAPTIVE_CG_TOL_LATE = 1e-2;   // 1% error - late iterations (keep loose to avoid slowdown)
const ADAPTIVE_CG_EARLY_ITERS = 40;  // Keep loose tolerance longer
const ADAPTIVE_CG_MID_ITERS = 120;   // Delay tightening to avoid slowdown at iteration 80

const STABLE_WINDOW = 10;  // Need 10 consecutive converged iterations for stability (ensures true convergence)

function computeSensitivities(rho: Float64Array, ce: Float64Array, penal: number, E0: number, Emin: number): Float64Array {
  const dc = new Float64Array(rho.length);
  const dE = E0 - Emin;
  for (let e = 0; e < rho.length; e++) dc[e] = -penal * Math.pow(rho[e], penal - 1) * dE * ce[e];
  return dc;
}

function updateDensitiesOC(densities: Float32Array, sens: Float32Array, volFrac: number, move: number, rhoMin: number, iter?: number): Float32Array {
  const n = densities.length;
  const newDensities = new Float32Array(n);
  
  let minSens = Infinity, maxSens = -Infinity, sumSens = 0;
  for (let i = 0; i < n; i++) {
    const absSens = Math.abs(sens[i]);
    if (absSens > 1e-14) { minSens = Math.min(minSens, absSens); maxSens = Math.max(maxSens, absSens); }
    sumSens += sens[i];
  }
  const meanSens = sumSens / n;
  
  let l1 = minSens > 1e-14 ? minSens * 1e-4 : 1e-10;
  let l2 = maxSens > 1e-14 ? maxSens * 1e4 : 1e9;
  
  let finalLmid = 0;
  for (let bisect = 0; bisect < 200 && (l2 - l1) > 1e-6 * l2; bisect++) {
    const lmid = 0.5 * (l1 + l2);
    finalLmid = lmid;
    let vol = 0;
    
    for (let i = 0; i < n; i++) {
      const Be = -sens[i] / lmid;
      let rhoNew = Be <= 0 ? densities[i] : densities[i] * Math.sqrt(Be);
      rhoNew = Math.max(densities[i] - move, Math.min(densities[i] + move, rhoNew));
      rhoNew = Math.max(rhoMin, Math.min(1.0, rhoNew));
      newDensities[i] = rhoNew;
      vol += rhoNew;
    }
    
    if (vol / n > volFrac) l1 = lmid; else l2 = lmid;
  }
  
  if (iter && (iter <= 5 || iter % 20 === 0)) {
    let volBefore = 0, volAfter = 0;
    for (let i = 0; i < n; i++) {
      volBefore += densities[i];
      volAfter += newDensities[i];
    }
    console.log(`[OC UPDATE] Iter ${iter}:`, {
      sensRange: `[${minSens.toExponential(2)}, ${maxSens.toExponential(2)}]`,
      meanSens: meanSens.toExponential(2),
      lagrangeMult: finalLmid.toExponential(2),
      volBefore: (volBefore / n).toFixed(4),
      volAfter: (volAfter / n).toFixed(4),
      targetVol: volFrac.toFixed(4),
    });
  }
  
  return newDensities;
}

/** Check if 3D mode based on nz parameter */
export function is3DMode(nz: number): boolean {
  return nz > 1;
}

/** Validated SIMP solver - handles both 2D (nz=1) and 3D (nz>1) with strict validation */
export async function* runSimp(
  mesh: RenderMesh,
  markers: GoalMarkers,
  params: SimpParams,
  config: ValidationConfig = DefaultValidationConfig
): AsyncGenerator<SolverFrame> {
  const validation = validateProblem(mesh, markers, params, config);
  
  if (hasErrors(validation.issues)) {
    throw new SimpValidationError(validation.issues);
  }
  
  if (!validation.validated) {
    throw new Error('Validation succeeded but no validated problem returned');
  }
  
  const { bounds, fixedDofs, loadedDofs } = validation.validated;
  const { nx, ny, nz } = params;
  
  const numElems = nx * ny * nz;
  
  const estimatedMB = estimateMemoryMB(nx, ny, nz);
  if (estimatedMB > MAX_MEMORY_MB) {
    throw new Error(`Model too large (est. ${Math.round(estimatedMB)}MB > ${MAX_MEMORY_MB}MB max). Reduce resolution.`);
  }
  
  console.log(`[SIMP] Starting optimization: ${numElems} elements, est. ${Math.round(estimatedMB)}MB`);
  
  const numNodes = (nx + 1) * (ny + 1) * (nz + 1);
  const forces = new Float64Array(numNodes * 3);
  
  for (const [dof, force] of loadedDofs.entries()) {
    forces[dof] = force;
  }
  
  let forceL2 = 0, forceMax = 0;
  for (let i = 0; i < forces.length; i++) {
    forceL2 += forces[i] * forces[i];
    forceMax = Math.max(forceMax, Math.abs(forces[i]));
  }
  forceL2 = Math.sqrt(forceL2);
  
  console.log(`[SIMP] Force stats:`, {
    l2Norm: forceL2.toExponential(3),
    maxAbs: forceMax.toExponential(3),
    numLoadedDofs: loadedDofs.size,
    numFixedDofs: fixedDofs.size,
    totalDofs: numNodes * 3,
    fixedRatio: (fixedDofs.size / (numNodes * 3) * 100).toFixed(2) + '%',
  });
  
  // Check if we have enough boundary conditions
  if (fixedDofs.size < 3) {
    console.warn(`[SIMP] WARNING: Only ${fixedDofs.size} fixed DOFs. Structure may be under-constrained (rigid body modes). Consider adding more anchor points.`);
  }
  
  if (forceMax >= 100) {
    console.warn(`[SIMP] WARNING: Force magnitude is very high (${forceMax.toFixed(1)}). If PCG fails to converge, try reducing force magnitude to 0.1-10.0 range.`);
  }
  
  const kernel = createElementKernel(nx, ny, nz, bounds, params.nu);
  const filter = precomputeSeparableDensityFilter(nx, ny, nz, params.rmin);
  
  let densities = new Float32Array(numElems);
  densities.fill(params.volFrac);
  
  // Min iterations allows penalty/projection continuation to work properly
  // Set to 0 to check convergence immediately (not recommended - continuation needs time)
  // Recommended: 80-150 iterations for penalty (1→3) and beta (1→betaMax) to ramp up
  // CRITICAL FIX: Force minIterations to be at least 150, regardless of what's passed
  const rawMinIterations = params.minIterations;
  const minIterations = Math.max(150, typeof rawMinIterations === 'number' && Number.isFinite(rawMinIterations) && rawMinIterations > 0
    ? rawMinIterations 
    : 150);  // Default to 150 if not specified or 0 (ensures quality results)
  const grayTol = params.grayTol ?? 0.05;  // 5% gray elements
  const betaMax = params.betaMax ?? 64;    // Match UI default
  
  console.log(`[SIMP] ⚠️⚠️⚠️ VERSION 2.0 - FORCED MIN ITERATIONS ⚠️⚠️⚠️`);
  console.log(`[SIMP] Configuration: rawMinIterations=${rawMinIterations}, minIterations=${minIterations}, maxIters=${params.maxIters}, grayTol=${grayTol}, betaMax=${betaMax}`);
  
  let beta = 1.0;
  let penal = params.penalStart;
  const moveLimit = params.move;
  let compliancePrev = Infinity;
  let consecutiveConverged = 0;
  let uPrev = new Float64Array(kernel.numDofs);
  
  // Continuation state tracking
  let lastContinuationChangeIter = 0;
  let stableIterCount = 0;   // Count of consecutive stable iterations
  
  // Oscillation detection (detects limit cycles by tracking sign changes in compliance)
  const OSCILLATION_WINDOW = 10;                          // Check last N compliance values
  let complianceHistory: number[] = [];                   // Track compliance history
  let oscillationDetected = false;                        // Pause continuation if oscillating
  
  // Divergence detection (sliding window tracker catches gradual increases)
  const complianceTracker = new ComplianceTracker(
    30,    // windowSize: track last 30 iterations
    0.015, // tolBest: 1.5% worse than best is concerning
    3      // badWindowsToStop: stop after 3 consecutive bad windows
  );
  
  // Adaptive continuation parameters (from params or defaults)
  const PENALTY_STEP = params.penalStep ?? 0.05;          // Fixed step size (balanced for quality and speed)
  const BETA_MULTIPLIER = params.betaMultiplier ?? 1.1;   // Beta multiplier (balanced for quality and speed)
  const CONT_STABLE_ITERS = params.contStableIters ?? 15; // Stability required before changes (balanced)
  const CONT_TOL_REL = params.contTolRel ?? 0.002;        // Stability tolerance: 0.2%
  const MIN_CHANGE_GAP = 40;                              // Minimum gap between changes (balanced)
  
  // Checkpoint/rollback for best design (prevents losing good designs)
  // CRITICAL: Must save AND restore penalty/beta along with densities!
  // Otherwise, rolling back densities to a low-penalty design while keeping high penalty
  // causes the design to fail (compliance increases instead of decreasing).
  const ENABLE_ROLLBACK = params.enableRollback ?? true;
  const ROLLBACK_THRESHOLD = params.rollbackThreshold ?? 1.10; // 10% regression triggers rollback
  let bestCompliance = Infinity;
  let bestDensities: Float32Array | null = null;
  let bestCompliancePrev = Infinity;  // For restoring compliancePrev on rollback
  let bestPenal = penal;              // Save penalty at best design
  let bestBeta = beta;                // Save beta at best design
  let bestIter = 0;
  let rollbackCount = 0;
  const MAX_ROLLBACKS = 5; // Allow more rollbacks since we now restore parameters properly
  const ROLLBACK_COOLDOWN = 20; // Iterations to wait after rollback before allowing another
  let lastRollbackIter = -ROLLBACK_COOLDOWN; // Track when last rollback occurred
  
  const pcgWorkspace = createPCGWorkspace(kernel.numDofs);
  const rhoBar = new Float32Array(numElems);
  const rhoPhysical = new Float32Array(numElems);
  const rhoPhysicalF64 = new Float64Array(numElems);
  const dCdrhoBar = new Float32Array(numElems);
  const dCdrho = new Float32Array(numElems);
  
  if (DEBUG) {
    console.log('[SIMP] Starting optimization loop', {
      maxIters: params.maxIters,
      volFrac: params.volFrac,
      tolChange: params.tolChange,
      minIterations,
    });
  }
  
  for (let iter = 1; iter <= params.maxIters; iter++) {
    const t0 = performance.now();
    
    // Defensive check: ensure working arrays are not detached (would happen if buffer was transferred)
    if (densities.byteLength === 0 || rhoPhysical.byteLength === 0) {
      throw new Error(`[SIMP] Working arrays detached at iter ${iter} (likely buffer transfer issue)`);
    }
    
    applySeparableDensityFilter(densities, filter, rhoBar);
    
    // Check if enough iterations have passed since last change
    const gapOk = (iter - lastContinuationChangeIter) >= MIN_CHANGE_GAP;
    
    // Adaptive stability check: compliance must be stable for CONT_STABLE_ITERS iterations
    const isStable = stableIterCount >= CONT_STABLE_ITERS;
    
    // CRITICAL: Only allow continuation if compliance is improving (decreasing)
    // Check if compliance has been decreasing over the last few iterations
    const complianceImproving = complianceHistory.length >= 3 && 
      complianceHistory[complianceHistory.length - 1] < complianceHistory[complianceHistory.length - 3];
    
    // Decide on parameter changes (NEVER change both in same iteration)
    // Pause continuation if oscillation detected OR compliance is not improving
    let parameterChanged = false;
    
    if (!oscillationDetected && (complianceImproving || iter <= 50)) {
      // Priority 1: Penalty ladder (only when stable and improving)
      if (!parameterChanged && gapOk && isStable && penal < params.penalEnd - 1e-9) {
        const penalNew = Math.min(params.penalEnd, penal + PENALTY_STEP);
        if (penalNew > penal + 1e-9) {
          penal = penalNew;
          parameterChanged = true;
          stableIterCount = 0;
          if (DEBUG) console.log(`[SIMP] Penalty: ${penal.toFixed(2)} at iteration ${iter}`);
        }
      }
      
      // Priority 2: Beta increase (only when penalty >= 2.0 and stable and improving)
      const betaCanIncrease = isStable && (penal >= Math.min(params.penalEnd, 2.0));
      
      if (!parameterChanged && gapOk && betaCanIncrease && beta < betaMax - 1e-9) {
        const betaNew = Math.min(betaMax, beta * BETA_MULTIPLIER);
        if (betaNew > beta + 1e-9) {
          beta = betaNew;
          parameterChanged = true;
          stableIterCount = 0;
          if (DEBUG) console.log(`[SIMP] Beta: ${beta.toFixed(1)} at iteration ${iter}`);
        }
      }
    } else if (!complianceImproving && iter > 50 && !oscillationDetected) {
      console.log(`[SIMP] ⚠️ Pausing continuation at iteration ${iter}: Compliance not improving (${complianceHistory[complianceHistory.length - 1].toExponential(3)} vs ${complianceHistory[complianceHistory.length - 3].toExponential(3)})`);
    }
    
    // Update continuation state
    if (parameterChanged) {
      lastContinuationChangeIter = iter;
    }
    
    for (let e = 0; e < numElems; e++) {
      rhoPhysical[e] = heavisideProject(rhoBar[e], beta, 0.5);
      rhoPhysicalF64[e] = rhoPhysical[e];
    }
    
    const tFilter = performance.now();
    
    // Adaptive CG tolerance: loose early (ill-conditioned), tight late (well-conditioned)
    // Keep CG tolerance constant throughout to avoid slowdown
    // User's cgTol parameter is ignored to prevent sudden tightening
    const adaptiveCgTol = iter <= ADAPTIVE_CG_EARLY_ITERS ? ADAPTIVE_CG_TOL_EARLY : 
                           iter <= ADAPTIVE_CG_MID_ITERS ? ADAPTIVE_CG_TOL_MID : 
                           ADAPTIVE_CG_TOL_LATE;
    
    const { u, converged: solverOk, iters: cgIters } = solvePCG(
      kernel, rhoPhysicalF64, forces, fixedDofs, penal, params.E0, params.Emin,
      adaptiveCgTol, params.cgMaxIters, pcgWorkspace, iter === 1 ? undefined : uPrev
    );
    
    const tSolve = performance.now();
    
    // Check if solution is usable (not NaN/Infinity)
    let solutionUsable = true;
    for (let i = 0; i < Math.min(100, u.length); i++) {
      if (!Number.isFinite(u[i])) {
        solutionUsable = false;
        break;
      }
    }
    
    if (!solutionUsable) {
      console.error(`[SIMP] PCG produced NaN/Infinity at iteration ${iter}. Check boundary conditions and force magnitude.`);
      yield { iter, compliance: Infinity, change: 1.0, vol: params.volFrac, densities: new Float32Array(densities), converged: false, error: `PCG produced invalid solution at iter ${iter}. Check boundary conditions.` };
      return;
    }
    
    // PCG not converging is OK in early iterations - the problem is ill-conditioned with uniform density
    // As densities evolve toward 0/1, conditioning improves
    if (!solverOk) {
      console.warn(`[SIMP] PCG did not fully converge at iteration ${iter} (${cgIters} iters). Continuing with approximate solution.`);
    }
    
    for (let i = 0; i < kernel.numDofs; i++) uPrev[i] = u[i];
    
    const compliance = dot(forces, u);
    assertFiniteNumber("compliance", compliance);
    
    if (compliance <= 0) {
      yield { iter, compliance: Infinity, change: 1.0, vol: params.volFrac, densities: new Float32Array(densities), converged: false, error: `Invalid compliance at iter ${iter}: ${compliance}` };
      return;
    }
    
    // Detect compliance explosion (usually means PCG solution is inaccurate due to ill-conditioning)
    if (iter > 1 && compliance > compliancePrev * 10.0) {
      console.error(`[SIMP] Compliance exploded from ${compliancePrev.toFixed(2)} to ${compliance.toFixed(2)} at iteration ${iter}. This usually means the structure is ill-conditioned (insufficient boundary conditions or too much material removed). Try adding more anchor points or reducing force magnitude.`);
      yield { iter, compliance: Infinity, change: 1.0, vol: params.volFrac, densities: new Float32Array(densities), converged: false, error: `Compliance exploded at iter ${iter}. Add more anchor points or reduce force.` };
      return;
    }
    
    assertFiniteArray("densities", densities, 97);
    
    const ce = computeElementCe(kernel, u);
    const dCdrhoTilde = computeSensitivities(rhoPhysicalF64, ce, penal, params.E0, params.Emin);
    
    for (let e = 0; e < numElems; e++) {
      dCdrhoBar[e] = dCdrhoTilde[e] * heavisideDerivative(rhoBar[e], beta, 0.5);
    }
    applySeparableFilterChainRule(dCdrhoBar, filter, dCdrho);
    
    const newDensities = updateDensitiesOC(densities, dCdrho, params.volFrac, moveLimit, params.rhoMin, iter);
    
    let maxChange = 0;
    for (let e = 0; e < numElems; e++) {
      maxChange = Math.max(maxChange, Math.abs(newDensities[e] - densities[e]));
    }
    
    for (let e = 0; e < numElems; e++) densities[e] = newDensities[e];
    
    let vol = 0;
    for (let e = 0; e < numElems; e++) vol += densities[e];
    vol /= numElems;
    
    const tUpdate = performance.now();
    
    const grayLevel = computeGrayLevel(rhoPhysical);
    
    const eps = 1e-12;
    const relCompChange = Math.abs(compliance - compliancePrev) / Math.max(Math.abs(compliancePrev), eps);
    
    // Update stability counter for adaptive continuation
    if (relCompChange < CONT_TOL_REL) {
      stableIterCount++;
    } else {
      stableIterCount = 0;
    }
    
    // Divergence detection: Sliding window tracker catches gradual increases
    const divStatus = complianceTracker.update(compliance);
    if (divStatus.diverged) {
      console.error(`[SIMP] ❌ DIVERGENCE DETECTED at iteration ${iter}:`);
      console.error(`[SIMP]    Current compliance: ${compliance.toExponential(3)}`);
      console.error(`[SIMP]    Best compliance: ${divStatus.best.toExponential(3)}`);
      console.error(`[SIMP]    Trend slope: ${divStatus.slope.toExponential(3)} (positive = increasing)`);
      console.error(`[SIMP]    Consecutive bad windows: ${divStatus.consecutiveBadWindows}`);
      console.error(`[SIMP] This usually means penalty/beta increased too aggressively or the structure is ill-conditioned.`);
      console.error(`[SIMP] Try: (1) reducing penalty step, (2) reducing beta multiplier, (3) adding more anchor points.`);
      yield { 
        iter, 
        compliance, 
        change: maxChange, 
        vol, 
        densities: bestDensities ? new Float32Array(bestDensities) : rhoPhysical, 
        converged: false, 
        error: `Divergence detected: compliance trending upward (best: ${divStatus.best.toExponential(3)}, current: ${compliance.toExponential(3)}). Returning best design from iteration ${bestIter}.` 
      };
      break;
    }
    
    // Checkpoint best design (for rollback)
    // CRITICAL: Save penalty and beta along with densities so they stay in sync!
    if (compliance < bestCompliance) {
      bestCompliance = compliance;
      bestDensities = new Float32Array(densities);
      bestCompliancePrev = compliancePrev;
      bestPenal = penal;  // Save penalty at this design
      bestBeta = beta;    // Save beta at this design
      bestIter = iter;
    }
    
    // Oscillation detection: Check if compliance is oscillating (limit cycle)
    // Detect by counting sign changes in compliance derivative
    complianceHistory.push(compliance);
    if (complianceHistory.length > OSCILLATION_WINDOW) {
      complianceHistory.shift(); // Keep only last N values
      
      // Count sign changes in compliance derivative (indicates oscillation)
      let signChanges = 0;
      for (let i = 2; i < complianceHistory.length; i++) {
        const prevDelta = complianceHistory[i-1] - complianceHistory[i-2];
        const currDelta = complianceHistory[i] - complianceHistory[i-1];
        if (prevDelta * currDelta < 0) signChanges++;
      }
      
      // If compliance changes direction frequently (>60% of time), we're oscillating
      const oscillationRatio = signChanges / (complianceHistory.length - 2);
      if (oscillationRatio > 0.6 && !oscillationDetected) {
        oscillationDetected = true;
        console.log(`[SIMP] ⚠️ OSCILLATION DETECTED: Compliance changing direction ${(oscillationRatio * 100).toFixed(0)}% of time. Pausing continuation.`);
      }
      
      // Resume continuation if oscillation has stopped
      if (oscillationDetected && oscillationRatio < 0.3) {
        oscillationDetected = false;
        console.log(`[SIMP] ✅ Oscillation resolved. Resuming continuation.`);
      }
    }
    
    // Rollback if compliance regressed significantly (prevents losing good designs)
    const rollbackCooldownOk = (iter - lastRollbackIter) >= ROLLBACK_COOLDOWN;
    if (ENABLE_ROLLBACK && bestDensities && rollbackCount < MAX_ROLLBACKS && rollbackCooldownOk) {
      const regressionRatio = compliance / bestCompliance;
      if (regressionRatio > ROLLBACK_THRESHOLD && iter > bestIter + 5) {
        rollbackCount++;
        console.log(`[SIMP] ⚠️ ROLLBACK #${rollbackCount}: Compliance regressed ${((regressionRatio - 1) * 100).toFixed(1)}% from best (${bestCompliance.toExponential(3)} at iter ${bestIter}).`);
        console.log(`[SIMP] ⚠️ ROLLBACK: Restoring densities AND parameters: penal ${penal.toFixed(2)} → ${bestPenal.toFixed(2)}, β ${beta.toFixed(1)} → ${bestBeta.toFixed(1)}`);
        
        // Restore best densities
        for (let e = 0; e < numElems; e++) {
          densities[e] = bestDensities[e];
        }
        
        // CRITICAL: Restore penalty and beta along with densities!
        // A low-penalty design can't survive at high penalty
        penal = bestPenal;
        beta = bestBeta;
        
        compliancePrev = bestCompliancePrev;
        lastRollbackIter = iter;
        stableIterCount = 0;
        lastContinuationChangeIter = iter;
      }
    }
    
    // Convergence criteria (all must be satisfied):
    // 1. Compliance change < 0.1% (optimization converged)
    // 2. Density change < 0.3% (design stabilized)
    // 3. Gray level < 5% (discrete 0/1 solution)
    // NOTE: Removed continuation requirement - optimizer can converge at any penalty/beta
    //       if compliance is stable. This prevents forcing continuation when it causes divergence.
    const complianceConverged = relCompChange < 0.0005;  // 0.05% (tighter for better optimization)
    const densityConverged = maxChange < 0.002;          // 0.2% (tighter for better optimization)
    const isDiscrete = grayLevel < grayTol;              // < 3% (default)
    
    // Optional: Track continuation progress for logging (not required for convergence)
    const continuationComplete = penal >= params.penalEnd * 0.95 && beta >= betaMax * 0.9;
    
    const isConverging = complianceConverged && densityConverged && isDiscrete;
    
    const timings = {
      filterMs: (tFilter - t0).toFixed(1),
      solveMs: (tSolve - tFilter).toFixed(1),
      updateMs: (tUpdate - tSolve).toFixed(1),
      totalMs: (tUpdate - t0).toFixed(1),
      cgIters,
      cgTol: adaptiveCgTol.toExponential(1),
    };
    
    // Simple logging every 10 iterations or early/late in optimization
    if (iter % 10 === 0 || iter <= 5 || (minIterations > 0 && iter >= minIterations - 5)) {
      console.log(`[SIMP] Iteration ${iter}:`, {
        compliance: compliance.toExponential(3),
        change: relCompChange.toExponential(3),
        vol: vol.toFixed(3),
        gray: grayLevel.toFixed(3),
        penal: `${penal.toFixed(2)}/${params.penalEnd.toFixed(2)}`,
        beta: `${beta.toFixed(1)}/${betaMax.toFixed(1)}`,
        contDone: continuationComplete ? '✓' : '✗',
        stable: stableIterCount,
        oscillating: oscillationDetected,
        cgIters,
      });
    }
    
    // Track consecutive converged iterations (need 5+ for stability)
    if (isConverging) {
      consecutiveConverged++;
    } else {
      consecutiveConverged = 0;
    }
    
    // Check if converged (all criteria must be met)
    const minItersReached = iter >= minIterations;
    const stableEnough = consecutiveConverged >= STABLE_WINDOW;
    const complianceValid = Number.isFinite(compliance) && compliance > 0;
    const hasConverged = complianceValid && minItersReached && stableEnough;
    
    // Debug logging for convergence check
    if (iter % 10 === 0 || (iter >= minIterations - 5 && iter <= minIterations + 5)) {
      console.log(`[SIMP] Convergence check at iter ${iter}:`, {
        minItersReached: `${minItersReached} (${iter} >= ${minIterations})`,
        stableEnough: `${stableEnough} (${consecutiveConverged} >= ${STABLE_WINDOW})`,
        complianceValid: complianceValid,
        hasConverged: hasConverged,
      });
    }
    
    yield { 
      iter, 
      compliance, 
      change: maxChange, 
      vol, 
      densities: rhoPhysical, 
      converged: hasConverged,
      feIters: cgIters,
      timings,
    };
    
    if (hasConverged) {
      console.log(`[SIMP] ✅ CONVERGED at iteration ${iter}`, {
        compliance: compliance.toExponential(3),
        relCompChange: relCompChange.toExponential(3) + ' (< 0.05% ✓)',
        maxChange: maxChange.toFixed(4) + ' (< 0.2% ✓)',
        vol: vol.toFixed(3),
        grayLevel: grayLevel.toFixed(3) + ` (< ${(grayTol * 100).toFixed(0)}% ✓)`,
        penalty: `${penal.toFixed(2)}/${params.penalEnd.toFixed(2)} (${continuationComplete ? '✓' : 'partial'})`,
        beta: `${beta.toFixed(1)}/${betaMax.toFixed(1)} (${continuationComplete ? '✓' : 'partial'})`,
        consecutiveConverged: `${consecutiveConverged} (≥ 10 ✓)`,
        minIterations,
        minItersReached: minItersReached ? '✓' : '✗',
        note: continuationComplete ? 'Full continuation complete' : 'Converged before full continuation (compliance stable)',
      });
      break;
    }
    
    if (!complianceValid) {
      console.error(`[SIMP] Stopping at iteration ${iter} due to invalid compliance: ${compliance}`);
      yield { iter, compliance, change: maxChange, vol, densities: rhoPhysical, converged: false, error: `Invalid compliance: ${compliance}` };
      break;
    }
    
    compliancePrev = compliance;
    await new Promise(r => setTimeout(r, 0));
  }
}

/** Permissive SIMP solver - attempts to run with fallbacks for backward compatibility */
export async function* runSimpPermissive(
  mesh: RenderMesh,
  markers: GoalMarkers,
  params: SimpParams
): AsyncGenerator<SolverFrame> {
  const permissiveConfig: ValidationConfig = {
    ...DefaultValidationConfig,
    mode: 'permissive',
    policies: {
      missingLoad: 'warn',
      missingSupport: 'warn',
      loadOnFixedDof: 'warn'
    }
  };
  
  try {
    yield* runSimp(mesh, markers, params, permissiveConfig);
  } catch (error) {
    if (error instanceof SimpValidationError) {
      yield {
        iter: 0,
        compliance: Infinity,
        change: 1.0,
        vol: params.volFrac,
        densities: new Float32Array(params.nx * params.ny * params.nz),
        converged: false,
        error: error.message
      };
    } else {
      throw error;
    }
  }
}

/** Legacy export for backwards compatibility */
export const runSimp3D = runSimpPermissive;
