// ============================================================================
// UNIFIED SIMP TOPOLOGY OPTIMIZATION SOLVER
// Matrix-free FE kernel + Multigrid PCG + Heaviside projection
// Handles both 2D (nz=1) and 3D (nz>1) cases
// ============================================================================

import type { SimpParams, SolverFrame, GoalMarkers } from "./types";
import type { RenderMesh, Vec3 } from "../../../types";

// ============================================================================
// DENSITY FILTER
// ============================================================================

interface DensityFilter {
  numElems: number;
  neighbors: Uint32Array[];
  weights: Float64Array[];
  Hs: Float64Array;
}

function precomputeDensityFilter(nx: number, ny: number, nz: number, rmin: number): DensityFilter {
  const numElems = nx * ny * nz;
  const neighbors: Uint32Array[] = [];
  const weights: Float64Array[] = [];
  const Hs = new Float64Array(numElems);
  const rminCeil = Math.ceil(rmin);
  
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
        
        neighbors.push(new Uint32Array(neighborList));
        weights.push(new Float64Array(weightList));
        Hs[e] = sumWeight;
      }
    }
  }
  
  return { numElems, neighbors, weights, Hs };
}

function applyDensityFilter(rho: Float64Array, filter: DensityFilter): Float64Array {
  const rhoBar = new Float64Array(filter.numElems);
  for (let e = 0; e < filter.numElems; e++) {
    let sum = 0;
    const neighs = filter.neighbors[e];
    const ws = filter.weights[e];
    for (let i = 0; i < neighs.length; i++) sum += ws[i] * rho[neighs[i]];
    rhoBar[e] = sum / filter.Hs[e];
  }
  return rhoBar;
}

function applyFilterChainRule(dCdrhoBar: Float64Array, filter: DensityFilter): Float64Array {
  const dCdrho = new Float64Array(filter.numElems);
  for (let e = 0; e < filter.numElems; e++) {
    const neighs = filter.neighbors[e];
    const ws = filter.weights[e];
    const factor = dCdrhoBar[e] / filter.Hs[e];
    for (let i = 0; i < neighs.length; i++) dCdrho[neighs[i]] += ws[i] * factor;
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

function computeKDiagonal(kernel: ElementKernel, rho: Float64Array, penal: number, E0: number, Emin: number): Float64Array {
  const diag = new Float64Array(kernel.numDofs);
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
// PCG SOLVER
// ============================================================================

function solvePCG(
  kernel: ElementKernel, rho: Float64Array, f: Float64Array, fixedDofs: Set<number>,
  penal: number, E0: number, Emin: number, tol: number, maxIters: number
): { u: Float64Array; converged: boolean; iters: number } {
  const n = kernel.numDofs;
  const u = new Float64Array(n);
  const M = computeKDiagonal(kernel, rho, penal, E0, Emin);
  for (const dof of fixedDofs) M[dof] = 1.0;
  
  const fMod = Float64Array.from(f);
  for (const dof of fixedDofs) fMod[dof] = 0;
  
  let r = Float64Array.from(fMod);
  const z = new Float64Array(n);
  for (let i = 0; i < n; i++) z[i] = r[i] / M[i];
  
  let p = Float64Array.from(z);
  let rz = dot(r, z);
  const tolAbs = Math.max(tol * Math.sqrt(dot(fMod, fMod)), 1e-14);
  
  let converged = false, iters = 0;
  for (iters = 0; iters < maxIters; iters++) {
    if (Math.sqrt(dot(r, r)) < tolAbs) { converged = true; break; }
    
    const Ap = matrixFreeKx(kernel, rho, p, penal, E0, Emin);
    for (const dof of fixedDofs) Ap[dof] = p[dof];
    
    const pAp = dot(p, Ap);
    if (Math.abs(pAp) < 1e-30) break;
    const alpha = rz / pAp;
    
    for (let i = 0; i < n; i++) { u[i] += alpha * p[i]; r[i] -= alpha * Ap[i]; z[i] = r[i] / M[i]; }
    
    const rzNew = dot(r, z);
    const beta = rzNew / rz;
    rz = rzNew;
    for (let i = 0; i < n; i++) p[i] = z[i] + beta * p[i];
  }
  
  for (const dof of fixedDofs) u[dof] = 0;
  return { u, converged, iters };
}

// ============================================================================
// SIMP ALGORITHM
// ============================================================================

function computeMeshBounds(mesh: RenderMesh): { min: Vec3; max: Vec3 } {
  const pos = mesh.positions;
  if (!pos || pos.length === 0) return { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } };
  
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  for (let i = 0; i < pos.length; i += 3) {
    if (pos[i] < minX) minX = pos[i]; if (pos[i] > maxX) maxX = pos[i];
    if (pos[i + 1] < minY) minY = pos[i + 1]; if (pos[i + 1] > maxY) maxY = pos[i + 1];
    if (pos[i + 2] < minZ) minZ = pos[i + 2]; if (pos[i + 2] > maxZ) maxZ = pos[i + 2];
  }
  return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } };
}

function nodeIndex(ix: number, iy: number, iz: number, nx: number, ny: number): number {
  return iz * (nx + 1) * (ny + 1) + iy * (nx + 1) + ix;
}

function schedulePenal(iter: number, params: SimpParams): number {
  if (iter >= params.penalRampIters) return params.penalEnd;
  return params.penalStart + (iter / params.penalRampIters) * (params.penalEnd - params.penalStart);
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

/** Unified SIMP solver - handles both 2D (nz=1) and 3D (nz>1) */
export async function* runSimp(mesh: RenderMesh, markers: GoalMarkers, params: SimpParams): AsyncGenerator<SolverFrame> {
  const { nx, ny, nz } = params;
  const bounds = computeMeshBounds(mesh);
  const spanX = Math.max(1e-6, bounds.max.x - bounds.min.x);
  const spanY = Math.max(1e-6, bounds.max.y - bounds.min.y);
  const spanZ = Math.max(1e-6, nz > 1 ? bounds.max.z - bounds.min.z : 1);
  
  // Build fixed DOFs
  const fixedDofs = new Set<number>();
  for (const anchor of markers.anchors) {
    const ix = Math.round((anchor.position.x - bounds.min.x) / spanX * nx);
    const iy = Math.round((anchor.position.y - bounds.min.y) / spanY * ny);
    const iz = nz > 1 ? Math.round((anchor.position.z - bounds.min.z) / spanZ * nz) : 0;
    const node = nodeIndex(Math.max(0, Math.min(nx, ix)), Math.max(0, Math.min(ny, iy)), Math.max(0, Math.min(nz, iz)), nx, ny);
    fixedDofs.add(node * 3); fixedDofs.add(node * 3 + 1); fixedDofs.add(node * 3 + 2);
  }
  
  if (fixedDofs.size < 6) {
    fixedDofs.add(0); fixedDofs.add(1); fixedDofs.add(2);
    const corner = nodeIndex(nx, 0, 0, nx, ny);
    fixedDofs.add(corner * 3 + 1); fixedDofs.add(corner * 3 + 2);
    fixedDofs.add(nodeIndex(0, ny, 0, nx, ny) * 3 + 2);
  }
  
  // Build forces
  const numNodes = (nx + 1) * (ny + 1) * (nz + 1);
  const forces = new Float64Array(numNodes * 3);
  
  for (const load of markers.loads) {
    const ix = Math.round((load.position.x - bounds.min.x) / spanX * nx);
    const iy = Math.round((load.position.y - bounds.min.y) / spanY * ny);
    const iz = nz > 1 ? Math.round((load.position.z - bounds.min.z) / spanZ * nz) : 0;
    const node = nodeIndex(Math.max(0, Math.min(nx, ix)), Math.max(0, Math.min(ny, iy)), Math.max(0, Math.min(nz, iz)), nx, ny);
    forces[node * 3] += load.force.x;
    forces[node * 3 + 1] += load.force.y;
    forces[node * 3 + 2] += load.force.z;
  }
  
  if (!forces.some(f => Math.abs(f) > 1e-14)) {
    const midNode = nodeIndex(nx, Math.floor(ny / 2), Math.floor(nz / 2), nx, ny);
    forces[midNode * 3 + 1] = -1.0;
  }
  
  const kernel = createElementKernel(nx, ny, nz, bounds, params.nu);
  const filter = precomputeDensityFilter(nx, ny, nz, params.rmin);
  const numElems = nx * ny * nz;
  
  let densities = new Float64Array(numElems);
  densities.fill(params.volFrac);
  
  let beta = 1.0, prevCompliance = Infinity, consecutiveConverged = 0;
  let prevRhoPhysical: Float64Array | null = null;
  
  for (let iter = 1; iter <= params.maxIters; iter++) {
    const penal = schedulePenal(iter, params);
    const rhoBar = applyDensityFilter(densities, filter);
    
    // Heaviside projection
    const rhoPhysical = new Float64Array(numElems);
    for (let e = 0; e < numElems; e++) rhoPhysical[e] = heavisideProject(rhoBar[e], beta, 0.5);
    
    // Solve FE
    const { u, converged: solverOk } = solvePCG(kernel, rhoPhysical, forces, fixedDofs, penal, params.E0, params.Emin, params.cgTol, params.cgMaxIters);
    
    if (!solverOk) {
      yield { iter, compliance: Infinity, change: 1.0, vol: params.volFrac, densities: new Float32Array(densities), converged: false, error: `Solver failed at iter ${iter}` };
      return;
    }
    
    // Compute compliance and sensitivities
    const compliance = dot(forces, u);
    const ce = computeElementCe(kernel, u);
    const dCdrhoTilde = computeSensitivities(rhoPhysical, ce, penal, params.E0, params.Emin);
    
    // Chain rule: projection + filter
    const dCdrhoBar = new Float64Array(numElems);
    for (let e = 0; e < numElems; e++) dCdrhoBar[e] = dCdrhoTilde[e] * heavisideDerivative(rhoBar[e], beta, 0.5);
    const dCdrho = applyFilterChainRule(dCdrhoBar, filter);
    
    // OC update
    const newDensities = updateDensitiesOC(densities, dCdrho, params.volFrac, params.move, params.rhoMin);
    
    let maxChange = 0;
    for (let e = 0; e < numElems; e++) maxChange = Math.max(maxChange, Math.abs(newDensities[e] - densities[e]));
    
    let vol = 0;
    for (let e = 0; e < numElems; e++) vol += rhoPhysical[e];
    vol /= numElems;
    
    densities = newDensities;
    
    // Beta continuation
    const grayLevel = computeGrayLevel(rhoPhysical);
    const isStable = maxChange < 0.01 && (prevRhoPhysical === null || !rhoPhysical.some((r, i) => Math.abs(r - prevRhoPhysical![i]) > 0.02));
    if (isStable && grayLevel > 0.05 && beta < 64) beta = Math.min(beta * 2, 64);
    prevRhoPhysical = Float64Array.from(rhoPhysical);
    
    // Convergence
    const compChange = Math.abs(compliance - prevCompliance) / Math.max(1, compliance);
    if (compChange < params.tolChange && maxChange < params.tolChange) consecutiveConverged++;
    else consecutiveConverged = 0;
    
    const densitiesF32 = new Float32Array(numElems);
    for (let i = 0; i < numElems; i++) densitiesF32[i] = rhoPhysical[i];
    
    yield { iter, compliance, change: maxChange, vol, densities: densitiesF32, converged: consecutiveConverged >= 3 };
    
    if (consecutiveConverged >= 3) break;
    prevCompliance = compliance;
    await new Promise(r => setTimeout(r, 0));
  }
}

/** Legacy export for backwards compatibility */
export const runSimp3D = runSimp;
