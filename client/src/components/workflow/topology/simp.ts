// ============================================================================
// UNIFIED SIMP TOPOLOGY OPTIMIZATION SOLVER
// Matrix-free FE kernel + Multigrid PCG + Heaviside projection
// Handles both 2D (nz=1) and 3D (nz>1) cases
// ============================================================================

import type { SimpParams, SolverFrame, GoalMarkers } from "./types";
import type { RenderMesh, Vec3 } from "../../../types";
import { validateProblem, DefaultValidationConfig, type ValidationConfig } from "./validation";
import { SimpValidationError, hasErrors } from "./errors";
import { computeStrictBounds, worldToGrid, gridToNodeIndex, buildDofMapping } from "./coordinateFrames";

// ============================================================================
// DENSITY FILTER (Flat Sparse Storage for Performance)
// ============================================================================

interface DensityFilter {
  numElems: number;
  neighborData: Uint32Array;
  weightData: Float64Array;
  offsets: Uint32Array;
  Hs: Float64Array;
}

function precomputeDensityFilter(nx: number, ny: number, nz: number, rmin: number): DensityFilter {
  const numElems = nx * ny * nz;
  const rminCeil = Math.ceil(rmin);
  
  const tempNeighbors: number[][] = [];
  const tempWeights: number[][] = [];
  const Hs = new Float64Array(numElems);
  
  for (let ez = 0; ez < nz; ez++) {
    for (let ey = 0; ey < ny; ey++) {
      for (let ex = 0; ex < nx; ex++) {
        const e = ez * nx * ny + ey * nx + ex;
        const neighborList: number[] = [];
        const weightList: number[] = [];
        let sumWeight = 0;
        
        for (let kz = Math.max(0, ez - rminCeil); kz <= Math.min(nz - 1, ez + rminCeil); kz++) {
          for (let jy = Math.max(0, ey - rminCeil); jy <= Math.min(ny - 1, ey + rminCeil); jy++) {
            for (let ix = Math.max(0, ex - rminCeil); ix <= Math.min(nx - 1, ex + rminCeil); ix++) {
              const dist = Math.sqrt((ex - ix) ** 2 + (ey - jy) ** 2 + (ez - kz) ** 2);
              if (dist <= rmin) {
                const weight = rmin - dist;
                neighborList.push(kz * nx * ny + jy * nx + ix);
                weightList.push(weight);
                sumWeight += weight;
              }
            }
          }
        }
        
        tempNeighbors.push(neighborList);
        tempWeights.push(weightList);
        Hs[e] = sumWeight;
      }
    }
  }
  
  let totalNnz = 0;
  for (const neighs of tempNeighbors) totalNnz += neighs.length;
  
  const neighborData = new Uint32Array(totalNnz);
  const weightData = new Float64Array(totalNnz);
  const offsets = new Uint32Array(numElems + 1);
  
  let offset = 0;
  for (let e = 0; e < numElems; e++) {
    offsets[e] = offset;
    const neighs = tempNeighbors[e];
    const weights = tempWeights[e];
    for (let i = 0; i < neighs.length; i++) {
      neighborData[offset] = neighs[i];
      weightData[offset] = weights[i];
      offset++;
    }
  }
  offsets[numElems] = offset;
  
  return { numElems, neighborData, weightData, offsets, Hs };
}

function applyDensityFilter(rho: Float64Array, filter: DensityFilter, out?: Float64Array): Float64Array {
  const rhoBar = out ?? new Float64Array(filter.numElems);
  for (let e = 0; e < filter.numElems; e++) {
    let sum = 0;
    const start = filter.offsets[e];
    const end = filter.offsets[e + 1];
    for (let i = start; i < end; i++) {
      sum += filter.weightData[i] * rho[filter.neighborData[i]];
    }
    rhoBar[e] = filter.Hs[e] > 1e-14 ? sum / filter.Hs[e] : rho[e];
  }
  return rhoBar;
}

function applyFilterChainRule(dCdrhoBar: Float64Array, filter: DensityFilter, out?: Float64Array): Float64Array {
  const dCdrho = out ?? new Float64Array(filter.numElems);
  dCdrho.fill(0);
  for (let e = 0; e < filter.numElems; e++) {
    const factor = dCdrhoBar[e] / filter.Hs[e];
    const start = filter.offsets[e];
    const end = filter.offsets[e + 1];
    for (let i = start; i < end; i++) {
      dCdrho[filter.neighborData[i]] += filter.weightData[i] * factor;
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

function computeGrayLevel(rho: Float64Array): number {
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

function matrixFreeKx(kernel: ElementKernel, rho: Float64Array, x: Float64Array, penal: number, E0: number, Emin: number): Float64Array {
  const y = new Float64Array(kernel.numDofs);
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
  return y;
}

function computeKDiagonal(kernel: ElementKernel, rho: Float64Array, penal: number, E0: number, Emin: number, out?: Float64Array): Float64Array {
  const diag = out ?? new Float64Array(kernel.numDofs);
  diag.fill(0);
  for (let e = 0; e < kernel.numElems; e++) {
    const scale = (Emin + Math.pow(rho[e], penal) * (E0 - Emin)) * kernel.elemVol;
    for (let i = 0; i < 24; i++) diag[kernel.edofMat[e * 24 + i]] += kernel.Ke0Diag[i] * scale;
  }
  for (let i = 0; i < diag.length; i++) if (Math.abs(diag[i]) < 1e-14) diag[i] = 1.0;
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
  if (uPrev) {
    for (let i = 0; i < n; i++) u[i] = uPrev[i];
  }
  
  computeKDiagonal(kernel, rho, penal, E0, Emin, M);
  for (const dof of fixedDofs) M[dof] = 1.0;
  
  for (let i = 0; i < n; i++) fMod[i] = f[i];
  for (const dof of fixedDofs) fMod[dof] = 0;
  
  if (uPrev) {
    const Ku = matrixFreeKx(kernel, rho, u, penal, E0, Emin);
    for (let i = 0; i < n; i++) r[i] = fMod[i] - Ku[i];
    for (const dof of fixedDofs) r[dof] = 0;
  } else {
    for (let i = 0; i < n; i++) r[i] = fMod[i];
  }
  
  for (let i = 0; i < n; i++) z[i] = r[i] / M[i];
  for (let i = 0; i < n; i++) p[i] = z[i];
  
  let rz = dot(r, z);
  const tolAbs = Math.max(tol * Math.sqrt(dot(fMod, fMod)), 1e-14);
  
  let converged = false, iters = 0;
  for (iters = 0; iters < maxIters; iters++) {
    const resNorm = Math.sqrt(dot(r, r));
    if (resNorm < tolAbs) { converged = true; break; }
    if (!Number.isFinite(resNorm)) break;
    
    const ApData = matrixFreeKx(kernel, rho, p, penal, E0, Emin);
    for (let i = 0; i < n; i++) Ap[i] = ApData[i];
    for (const dof of fixedDofs) Ap[dof] = 0;
    
    const pAp = dot(p, Ap);
    if (Math.abs(pAp) < 1e-30 || !Number.isFinite(pAp)) break;
    const alpha = rz / pAp;
    if (!Number.isFinite(alpha)) break;
    
    for (let i = 0; i < n; i++) {
      u[i] += alpha * p[i];
      r[i] -= alpha * Ap[i];
      z[i] = r[i] / M[i];
    }
    
    const rzNew = dot(r, z);
    if (!Number.isFinite(rzNew)) break;
    const beta = rzNew / rz;
    rz = rzNew;
    
    for (let i = 0; i < n; i++) p[i] = z[i] + beta * p[i];
    for (const dof of fixedDofs) p[dof] = 0;
  }
  
  for (const dof of fixedDofs) u[dof] = 0;
  return { u, converged, iters };
}

// ============================================================================
// SIMP ALGORITHM
// ============================================================================

const ADAPTIVE_CG_TOL_EARLY = 1e-2;
const ADAPTIVE_CG_TOL_MID = 1e-3;
const ADAPTIVE_CG_EARLY_ITERS = 10;
const ADAPTIVE_CG_MID_ITERS = 30;

const MOVE_LIMIT_STABLE_THRESHOLD = 0.005;
const MOVE_LIMIT_UNSTABLE_THRESHOLD = 0.05;
const MOVE_LIMIT_INCREASE_FACTOR = 1.1;
const MOVE_LIMIT_DECREASE_FACTOR = 0.8;
const MOVE_LIMIT_MAX = 0.3;
const MOVE_LIMIT_MIN = 0.01;

const BETA_INCREASE_FACTOR = 1.5;



function nodeIndex(ix: number, iy: number, iz: number, nx: number, ny: number): number {
  return iz * (nx + 1) * (ny + 1) + iy * (nx + 1) + ix;
}



function computeSensitivities(rho: Float64Array, ce: Float64Array, penal: number, E0: number, Emin: number): Float64Array {
  const dc = new Float64Array(rho.length);
  const dE = E0 - Emin;
  for (let e = 0; e < rho.length; e++) dc[e] = -penal * Math.pow(rho[e], penal - 1) * dE * ce[e];
  return dc;
}

function updateDensitiesOC(densities: Float64Array, sens: Float64Array, volFrac: number, move: number, rhoMin: number): Float64Array<ArrayBuffer> {
  const n = densities.length;
  const newDensities = new Float64Array(n);
  
  let minSens = Infinity, maxSens = -Infinity;
  for (let i = 0; i < n; i++) {
    const absSens = Math.abs(sens[i]);
    if (absSens > 1e-14) { minSens = Math.min(minSens, absSens); maxSens = Math.max(maxSens, absSens); }
  }
  
  let l1 = minSens > 1e-14 ? minSens * 1e-4 : 1e-10;
  let l2 = maxSens > 1e-14 ? maxSens * 1e4 : 1e9;
  
  for (let bisect = 0; bisect < 100 && (l2 - l1) > 1e-4 * l2; bisect++) {
    const lmid = 0.5 * (l1 + l2);
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
  
  const numNodes = (nx + 1) * (ny + 1) * (nz + 1);
  const forces = new Float64Array(numNodes * 3);
  
  for (const [dof, force] of loadedDofs.entries()) {
    forces[dof] = force;
  }
  
  const kernel = createElementKernel(nx, ny, nz, bounds, params.nu);
  const filter = precomputeDensityFilter(nx, ny, nz, params.rmin);
  const numElems = nx * ny * nz;
  
  let densities = new Float64Array(numElems);
  densities.fill(params.volFrac);
  
  const minIterations = params.minIterations ?? 3;
  const grayTol = params.grayTol ?? 0.05;
  const betaMax = params.betaMax ?? 64;
  
  let beta = 1.0;
  let penal = params.penalStart;
  let moveLimit = params.move;
  let prevCompliance = Infinity;
  let consecutiveConverged = 0;
  let uPrev = new Float64Array(kernel.numDofs);
  
  const pcgWorkspace = createPCGWorkspace(kernel.numDofs);
  const rhoBar = new Float64Array(numElems);
  const rhoPhysical = new Float64Array(numElems);
  const dCdrhoBar = new Float64Array(numElems);
  const dCdrho = new Float64Array(numElems);
  
  const penalRampRate = (params.penalEnd - params.penalStart) / params.penalRampIters;
  
  for (let iter = 1; iter <= params.maxIters; iter++) {
    applyDensityFilter(densities, filter, rhoBar);
    
    for (let e = 0; e < numElems; e++) {
      rhoPhysical[e] = heavisideProject(rhoBar[e], beta, 0.5);
    }
    
    const adaptiveCgTol = iter <= ADAPTIVE_CG_EARLY_ITERS ? ADAPTIVE_CG_TOL_EARLY : 
                           iter <= ADAPTIVE_CG_MID_ITERS ? ADAPTIVE_CG_TOL_MID : 
                           params.cgTol;
    
    const { u, converged: solverOk, iters: cgIters } = solvePCG(
      kernel, rhoPhysical, forces, fixedDofs, penal, params.E0, params.Emin,
      adaptiveCgTol, params.cgMaxIters, pcgWorkspace, iter === 1 ? undefined : uPrev
    );
    
    if (!solverOk) {
      yield { iter, compliance: Infinity, change: 1.0, vol: params.volFrac, densities: new Float32Array(densities), converged: false, error: `PCG failed at iter ${iter}` };
      return;
    }
    
    for (let i = 0; i < kernel.numDofs; i++) uPrev[i] = u[i];
    
    const compliance = dot(forces, u);
    if (!Number.isFinite(compliance) || compliance <= 0) {
      yield { iter, compliance: Infinity, change: 1.0, vol: params.volFrac, densities: new Float32Array(densities), converged: false, error: `Invalid compliance at iter ${iter}` };
      return;
    }
    
    const ce = computeElementCe(kernel, u);
    const dCdrhoTilde = computeSensitivities(rhoPhysical, ce, penal, params.E0, params.Emin);
    
    for (let e = 0; e < numElems; e++) {
      dCdrhoBar[e] = dCdrhoTilde[e] * heavisideDerivative(rhoBar[e], beta, 0.5);
    }
    applyFilterChainRule(dCdrhoBar, filter, dCdrho);
    
    const newDensities = updateDensitiesOC(densities, dCdrho, params.volFrac, moveLimit, params.rhoMin);
    
    let maxChange = 0;
    for (let e = 0; e < numElems; e++) {
      maxChange = Math.max(maxChange, Math.abs(newDensities[e] - densities[e]));
    }
    
    let vol = 0;
    for (let e = 0; e < numElems; e++) vol += rhoPhysical[e];
    vol /= numElems;
    
    densities = newDensities;
    
    const grayLevel = computeGrayLevel(rhoPhysical);
    const compChange = Math.abs(compliance - prevCompliance) / Math.max(1, compliance);
    
    const isConverging = compChange < params.tolChange && maxChange < params.tolChange;
    const isDiscrete = grayLevel < grayTol;
    
    if (isConverging && isDiscrete) {
      consecutiveConverged++;
    } else if (isConverging) {
      consecutiveConverged = Math.max(0, consecutiveConverged - 1);
    } else {
      consecutiveConverged = 0;
    }
    
    if (isConverging && maxChange < MOVE_LIMIT_STABLE_THRESHOLD) {
      moveLimit = Math.min(moveLimit * MOVE_LIMIT_INCREASE_FACTOR, MOVE_LIMIT_MAX);
    } else if (!isConverging && maxChange > MOVE_LIMIT_UNSTABLE_THRESHOLD) {
      moveLimit = Math.max(moveLimit * MOVE_LIMIT_DECREASE_FACTOR, MOVE_LIMIT_MIN);
    }
    
    if (isConverging && grayLevel > grayTol && beta < betaMax) {
      beta = Math.min(beta * BETA_INCREASE_FACTOR, betaMax);
      consecutiveConverged = 0;
    }
    
    if (iter < params.penalRampIters) {
      penal = params.penalStart + iter * penalRampRate;
    } else {
      penal = params.penalEnd;
    }
    
    const densitiesF32 = new Float32Array(numElems);
    for (let i = 0; i < numElems; i++) densitiesF32[i] = rhoPhysical[i];
    
    yield { iter, compliance, change: maxChange, vol, densities: densitiesF32, converged: consecutiveConverged >= minIterations };
    
    if (consecutiveConverged >= minIterations) break;
    
    prevCompliance = compliance;
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
