import type { Vec3 } from "../../../types";
import { buildCSRFromTriplets, solvePCG, dot, type CSRMatrix, type Triplet } from "./sparse";

// ============================================================================
// 2D FINITE ELEMENT ANALYSIS MODULE
// ============================================================================

export interface FEModel2D {
  nx: number;
  ny: number;
  numNodes: number;
  numElems: number;
  numDofs: number;
  coords: Float64Array; // [x0, y0, x1, y1, ...] node coordinates
  conn: Uint32Array; // [n0, n1, n2, n3, ...] element connectivity (4 nodes per Q4 element)
  edofMat: Uint32Array; // [dof0, dof1, ..., dof7, ...] element DOF mapping (8 DOFs per element)
  fixedDofs: Uint32Array; // Fixed DOF indices
  forces: Float64Array; // Force vector (length = numDofs)
  bounds: { min: Vec3; max: Vec3 };
}

export type DofMap = {
  freeDofs: Uint32Array;
  dofMap: Int32Array;
};

/**
 * Create 2D FE model from grid parameters and boundary conditions
 */
export function createFEModel2D(
  nx: number,
  ny: number,
  bounds: { min: Vec3; max: Vec3 },
  fixedDofs: Set<number>,
  loads: Map<number, number>
): FEModel2D {
  const numNodes = (nx + 1) * (ny + 1);
  const numElems = nx * ny;
  const numDofs = numNodes * 2; // 2 DOFs per node (ux, uy)
  
  // Node coordinates
  const coords = new Float64Array(numNodes * 2);
  const dx = (bounds.max.x - bounds.min.x) / nx;
  const dy = (bounds.max.y - bounds.min.y) / ny;
  
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const nodeIdx = j * (nx + 1) + i;
      coords[nodeIdx * 2] = bounds.min.x + i * dx;
      coords[nodeIdx * 2 + 1] = bounds.min.y + j * dy;
    }
  }
  
  // Element connectivity (Q4: counter-clockwise from bottom-left)
  const conn = new Uint32Array(numElems * 4);
  for (let ey = 0; ey < ny; ey++) {
    for (let ex = 0; ex < nx; ex++) {
      const elemIdx = ey * nx + ex;
      const n0 = ey * (nx + 1) + ex;
      const n1 = n0 + 1;
      const n2 = n0 + (nx + 1) + 1;
      const n3 = n0 + (nx + 1);
      
      conn[elemIdx * 4] = n0;
      conn[elemIdx * 4 + 1] = n1;
      conn[elemIdx * 4 + 2] = n2;
      conn[elemIdx * 4 + 3] = n3;
    }
  }
  
  // Element DOF mapping (8 DOFs per element: [ux0, uy0, ux1, uy1, ux2, uy2, ux3, uy3])
  const edofMat = new Uint32Array(numElems * 8);
  for (let e = 0; e < numElems; e++) {
    for (let n = 0; n < 4; n++) {
      const nodeIdx = conn[e * 4 + n];
      edofMat[e * 8 + n * 2] = nodeIdx * 2;       // ux
      edofMat[e * 8 + n * 2 + 1] = nodeIdx * 2 + 1; // uy
    }
  }
  
  // Force vector
  const forces = new Float64Array(numDofs);
  for (const [dof, force] of loads) {
    forces[dof] = force;
  }
  
  // Fixed DOFs array
  const fixedDofsArray = new Uint32Array(fixedDofs);
  
  return {
    nx,
    ny,
    numNodes,
    numElems,
    numDofs,
    coords,
    conn,
    edofMat,
    fixedDofs: fixedDofsArray,
    forces,
    bounds
  };
}

export function buildDofMap(
  numDofs: number,
  fixedDofs: Uint32Array | Set<number>
): DofMap {
  const fixedSet = fixedDofs instanceof Set ? fixedDofs : new Set(fixedDofs);
  const dofMap = new Int32Array(numDofs);
  dofMap.fill(-1);
  const freeDofsList: number[] = [];

  for (let i = 0; i < numDofs; i++) {
    if (!fixedSet.has(i)) {
      dofMap[i] = freeDofsList.length;
      freeDofsList.push(i);
    }
  }

  return { freeDofs: new Uint32Array(freeDofsList), dofMap };
}

/**
 * Compute Q4 element stiffness matrix for plane stress
 * Returns 8x8 matrix for E=1 (scale by E later for SIMP)
 */
export function computeKeQ4(
  nu: number = 0.3,
  dx: number = 1,
  dy: number = 1
): Float64Array {
  // Plane stress constitutive matrix (for E=1)
  const D = new Float64Array(9);
  const factor = 1.0 / (1.0 - nu * nu);
  D[0] = factor;           // D11
  D[1] = factor * nu;      // D12
  D[2] = 0;                // D13
  D[3] = factor * nu;      // D21
  D[4] = factor;           // D22
  D[5] = 0;                // D23
  D[6] = 0;                // D31
  D[7] = 0;                // D32
  D[8] = factor * (1 - nu) / 2; // D33
  
  const invDx = 2.0 / Math.max(1e-12, dx);
  const invDy = 2.0 / Math.max(1e-12, dy);
  const detJ = (dx * dy) / 4.0;

  // 2x2 Gauss integration points and weights
  const gp = 1.0 / Math.sqrt(3.0);
  const gaussPts = [
    { xi: -gp, eta: -gp, w: 1.0 },
    { xi: gp, eta: -gp, w: 1.0 },
    { xi: gp, eta: gp, w: 1.0 },
    { xi: -gp, eta: gp, w: 1.0 }
  ];
  
  // Element stiffness matrix (8x8)
  const Ke = new Float64Array(64);
  
  // Integrate over Gauss points
  for (const pt of gaussPts) {
    const { xi, eta, w } = pt;
    
    // Shape function derivatives in natural coordinates
    const dN_dxi = [
      -(1 - eta) / 4,
      (1 - eta) / 4,
      (1 + eta) / 4,
      -(1 + eta) / 4
    ];
    const dN_deta = [
      -(1 - xi) / 4,
      -(1 + xi) / 4,
      (1 + xi) / 4,
      (1 - xi) / 4
    ];
    
    // B matrix (3x8): [dN/dx; dN/dy; dN/dy, dN/dx] for each node
    const B = new Float64Array(24);
    for (let i = 0; i < 4; i++) {
      B[i * 2] = dN_dxi[i] * invDx;           // dN/dx for ux
      B[i * 2 + 1] = 0;               // 0 for uy
      B[8 + i * 2] = 0;               // 0 for ux
      B[8 + i * 2 + 1] = dN_deta[i] * invDy;  // dN/dy for uy
      B[16 + i * 2] = dN_deta[i] * invDy;     // dN/dy for ux
      B[16 + i * 2 + 1] = dN_dxi[i] * invDx;  // dN/dx for uy
    }
    
    // Ke += B^T * D * B * detJ * w
    // Compute D * B (3x8)
    const DB = new Float64Array(24);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 8; j++) {
        let sum = 0;
        for (let k = 0; k < 3; k++) {
          sum += D[i * 3 + k] * B[k * 8 + j];
        }
        DB[i * 8 + j] = sum;
      }
    }
    
    // Compute B^T * DB (8x8)
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        let sum = 0;
        for (let k = 0; k < 3; k++) {
          sum += B[k * 8 + i] * DB[k * 8 + j];
        }
        Ke[i * 8 + j] += sum * detJ * w;
      }
    }
  }
  
  return Ke;
}

/**
 * Assemble global stiffness matrix in CSR format
 */
export function assembleKCSR(
  model: FEModel2D,
  rhoBar: Float64Array,
  penal: number,
  E0: number,
  Emin: number,
  Ke0: Float64Array
): CSRMatrix {
  const triplets: Triplet[] = [];
  
  // Assemble each element
  for (let e = 0; e < model.numElems; e++) {
    // SIMP material interpolation
    const rho = rhoBar[e];
    const E = Emin + Math.pow(rho, penal) * (E0 - Emin);
    
    // Scaled element stiffness
    const scale = E;
    
    // Add to global matrix
    for (let i = 0; i < 8; i++) {
      const dofI = model.edofMat[e * 8 + i];
      for (let j = 0; j < 8; j++) {
        const dofJ = model.edofMat[e * 8 + j];
        const value = Ke0[i * 8 + j] * scale;
        
        if (Math.abs(value) > 1e-14) {
          triplets.push({ row: dofI, col: dofJ, value });
        }
      }
    }
  }
  
  return buildCSRFromTriplets(triplets, model.numDofs, model.numDofs);
}

/**
 * Apply boundary conditions via DOF elimination
 * Returns reduced system for free DOFs only
 */
export function applyBCElimination(
  K: CSRMatrix,
  f: Float64Array,
  fixedDofs: Uint32Array
): { Kff: CSRMatrix; ff: Float64Array; freeDofs: Uint32Array } {
  const bcMap = buildDofMap(K.nrows, fixedDofs);
  const { Kff, ff } = applyBCEliminationWithMap(K, f, bcMap);
  return { Kff, ff, freeDofs: bcMap.freeDofs };
}

export function applyBCEliminationWithMap(
  K: CSRMatrix,
  f: Float64Array,
  bcMap: DofMap
): { Kff: CSRMatrix; ff: Float64Array } {
  const { freeDofs, dofMap } = bcMap;
  const nfree = freeDofs.length;
  const triplets: Triplet[] = [];
  const ff = new Float64Array(nfree);

  for (let i = 0; i < nfree; i++) {
    const dofI = freeDofs[i];
    ff[i] = f[dofI];

    for (let j = K.rowPtr[dofI]; j < K.rowPtr[dofI + 1]; j++) {
      const dofJ = K.colIdx[j];
      const jFree = dofMap[dofJ];
      if (jFree >= 0) {
        triplets.push({ row: i, col: jFree, value: K.values[j] });
      }
    }
  }

  const Kff = buildCSRFromTriplets(triplets, nfree, nfree);
  return { Kff, ff };
}

const reduceToFreeDofs = (
  vector: Float64Array,
  freeDofs: Uint32Array,
  out?: Float64Array
): Float64Array => {
  const reduced = out ?? new Float64Array(freeDofs.length);
  for (let i = 0; i < freeDofs.length; i++) {
    reduced[i] = vector[freeDofs[i]];
  }
  return reduced;
};

/**
 * Solve FE system: K * u = f
 * Returns full displacement vector (including fixed DOFs = 0)
 */
export function solveFE(
  K: CSRMatrix,
  f: Float64Array,
  fixedDofs: Uint32Array,
  cgTol: number = 1e-6,
  cgMaxIters: number = 1000,
  options?: { x0?: Float64Array; bcMap?: DofMap }
): { u: Float64Array; converged: boolean; iters: number } {
  const bcMap = options?.bcMap ?? buildDofMap(K.nrows, fixedDofs);
  const { Kff, ff } = applyBCEliminationWithMap(K, f, bcMap);
  const x0Reduced = options?.x0
    ? reduceToFreeDofs(options.x0, bcMap.freeDofs)
    : undefined;

  const result = solvePCG(Kff, ff, x0Reduced, cgTol, cgMaxIters);

  const u = new Float64Array(K.nrows);
  for (let i = 0; i < bcMap.freeDofs.length; i++) {
    u[bcMap.freeDofs[i]] = result.x[i];
  }

  return { u, converged: result.converged, iters: result.iters };
}

/**
 * Compute compliance: C = f^T * u
 */
export function computeCompliance(f: Float64Array, u: Float64Array): number {
  return dot(f, u);
}

/**
 * Compute element strain energy: ce = u_e^T * Ke0 * u_e
 * Returns array of ce for each element
 */
export function computeElementCe(
  model: FEModel2D,
  u: Float64Array,
  Ke0: Float64Array,
  out?: Float64Array
): Float64Array {
  const ce = out ?? new Float64Array(model.numElems);

  for (let e = 0; e < model.numElems; e++) {
    let energy = 0;
    const base = e * 8;

    for (let i = 0; i < 8; i++) {
      const dofI = model.edofMat[base + i];
      const ui = u[dofI];
      let sum = 0;
      const row = i * 8;
      for (let j = 0; j < 8; j++) {
        const dofJ = model.edofMat[base + j];
        sum += Ke0[row + j] * u[dofJ];
      }
      energy += ui * sum;
    }

    ce[e] = energy;
  }

  return ce;
}

/**
 * Compute SIMP sensitivities: dC/drho = -p * rho^(p-1) * (E0 - Emin) * ce
 */
export function computeSensitivitiesSIMP(
  rhoBar: Float64Array,
  ce: Float64Array,
  penal: number,
  E0: number,
  Emin: number,
  out?: Float64Array
): Float64Array {
  const dc = out ?? new Float64Array(rhoBar.length);

  for (let e = 0; e < rhoBar.length; e++) {
    const rho = Math.max(1e-6, rhoBar[e]); // Guard against zero
    dc[e] = -penal * Math.pow(rho, penal - 1) * (E0 - Emin) * ce[e];
  }

  return dc;
}
