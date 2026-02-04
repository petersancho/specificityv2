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

/**
 * Compute Q4 element stiffness matrix for plane stress
 * Returns 8x8 matrix for unit square element with E=1
 * 
 * DOF ordering per node: [ux, uy]
 * Node ordering: counter-clockwise from bottom-left (0,1,2,3)
 * Total DOFs: [ux0, uy0, ux1, uy1, ux2, uy2, ux3, uy3]
 * 
 * Strain vector: [εxx, εyy, γxy]^T
 * B matrix maps DOFs to strains: ε = B * u
 */
export function computeKeQ4(nu: number = 0.3): Float64Array {
  // Plane stress constitutive matrix D (3x3) for E=1
  // σ = D * ε where σ = [σxx, σyy, τxy]^T
  const factor = 1.0 / (1.0 - nu * nu);
  const D11 = factor;
  const D12 = factor * nu;
  const D33 = factor * (1 - nu) / 2;
  
  // 2x2 Gauss quadrature points and weights
  const gp = 1.0 / Math.sqrt(3.0);
  const gaussPts = [
    { xi: -gp, eta: -gp, w: 1.0 },
    { xi:  gp, eta: -gp, w: 1.0 },
    { xi:  gp, eta:  gp, w: 1.0 },
    { xi: -gp, eta:  gp, w: 1.0 }
  ];
  
  // Element stiffness matrix (8x8), stored row-major
  const Ke = new Float64Array(64);
  
  // Integrate over Gauss points
  for (const pt of gaussPts) {
    const { xi, eta, w } = pt;
    
    // Shape function derivatives in natural coordinates (ξ, η)
    // N_i = (1/4)(1 + ξ_i*ξ)(1 + η_i*η) for bilinear Q4
    // Node positions in natural coords: (-1,-1), (1,-1), (1,1), (-1,1)
    const dN_dxi = [
      -0.25 * (1 - eta),  // Node 0: (-1,-1)
       0.25 * (1 - eta),  // Node 1: ( 1,-1)
       0.25 * (1 + eta),  // Node 2: ( 1, 1)
      -0.25 * (1 + eta)   // Node 3: (-1, 1)
    ];
    const dN_deta = [
      -0.25 * (1 - xi),   // Node 0
      -0.25 * (1 + xi),   // Node 1
       0.25 * (1 + xi),   // Node 2
       0.25 * (1 - xi)    // Node 3
    ];
    
    // For unit square element [-1,1] x [-1,1] in natural coords
    // mapping to [0,1] x [0,1] in physical coords:
    // Jacobian J = [dx/dξ  dy/dξ ] = [0.5  0 ]
    //              [dx/dη  dy/dη ]   [0    0.5]
    // detJ = 0.25, but we compute Ke for unit element and scale later
    // So use detJ = 1 here (will scale by actual element area in assembly)
    // 
    // For unit square in natural coords, J = 0.5*I, so:
    // dN/dx = (1/0.5) * dN/dξ = 2 * dN/dξ (but we absorb this in scaling)
    // 
    // Actually, for [-1,1]^2 -> [-1,1]^2 (unit natural), J = I, detJ = 1
    // The actual element size scaling happens in assembly via elemArea
    const detJ = 1.0;
    
    // Build B matrix (3 rows x 8 cols)
    // B relates strain to displacement: ε = B * u
    // 
    // εxx = ∂u/∂x = Σ (∂Ni/∂x) * uxi
    // εyy = ∂v/∂y = Σ (∂Ni/∂y) * uyi  
    // γxy = ∂u/∂y + ∂v/∂x = Σ (∂Ni/∂y * uxi + ∂Ni/∂x * uyi)
    //
    // For DOF order [ux0, uy0, ux1, uy1, ux2, uy2, ux3, uy3]:
    // B = [dN0/dx,   0,    dN1/dx,   0,    dN2/dx,   0,    dN3/dx,   0   ]  <- εxx
    //     [  0,    dN0/dy,   0,    dN1/dy,   0,    dN2/dy,   0,    dN3/dy]  <- εyy
    //     [dN0/dy, dN0/dx, dN1/dy, dN1/dx, dN2/dy, dN2/dx, dN3/dy, dN3/dx]  <- γxy
    
    const B = new Float64Array(24); // 3 x 8
    for (let i = 0; i < 4; i++) {
      const col_ux = i * 2;      // Column for ux_i
      const col_uy = i * 2 + 1;  // Column for uy_i
      
      // Row 0 (εxx): dNi/dx in ux column, 0 in uy column
      B[0 * 8 + col_ux] = dN_dxi[i];
      B[0 * 8 + col_uy] = 0;
      
      // Row 1 (εyy): 0 in ux column, dNi/dy in uy column
      B[1 * 8 + col_ux] = 0;
      B[1 * 8 + col_uy] = dN_deta[i];
      
      // Row 2 (γxy): dNi/dy in ux column, dNi/dx in uy column
      B[2 * 8 + col_ux] = dN_deta[i];
      B[2 * 8 + col_uy] = dN_dxi[i];
    }
    
    // Compute Ke += B^T * D * B * detJ * w
    // First compute D * B (3x8)
    const DB = new Float64Array(24);
    for (let j = 0; j < 8; j++) {
      // DB[0,j] = D[0,0]*B[0,j] + D[0,1]*B[1,j] + D[0,2]*B[2,j]
      DB[0 * 8 + j] = D11 * B[0 * 8 + j] + D12 * B[1 * 8 + j];
      // DB[1,j] = D[1,0]*B[0,j] + D[1,1]*B[1,j] + D[1,2]*B[2,j]
      DB[1 * 8 + j] = D12 * B[0 * 8 + j] + D11 * B[1 * 8 + j];
      // DB[2,j] = D[2,0]*B[0,j] + D[2,1]*B[1,j] + D[2,2]*B[2,j]
      DB[2 * 8 + j] = D33 * B[2 * 8 + j];
    }
    
    // Now compute B^T * DB (8x8) and accumulate
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        // Ke[i,j] += sum_k B[k,i] * DB[k,j]
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
  
  // Scale Ke0 by element size (assumes unit square in natural coords)
  const dx = (model.bounds.max.x - model.bounds.min.x) / model.nx;
  const dy = (model.bounds.max.y - model.bounds.min.y) / model.ny;
  const elemArea = dx * dy;
  
  // Assemble each element
  for (let e = 0; e < model.numElems; e++) {
    // SIMP material interpolation
    const rho = rhoBar[e];
    const E = Emin + Math.pow(rho, penal) * (E0 - Emin);
    
    // Scaled element stiffness
    const scale = E * elemArea;
    
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
  // Build free DOF list
  const fixedSet = new Set(fixedDofs);
  const freeDofsList: number[] = [];
  for (let i = 0; i < K.nrows; i++) {
    if (!fixedSet.has(i)) {
      freeDofsList.push(i);
    }
  }
  const freeDofs = new Uint32Array(freeDofsList);
  const nfree = freeDofs.length;
  
  // Build DOF mapping
  const dofMap = new Map<number, number>();
  for (let i = 0; i < nfree; i++) {
    dofMap.set(freeDofs[i], i);
  }
  
  // Extract submatrix Kff and subvector ff
  const triplets: Triplet[] = [];
  const ff = new Float64Array(nfree);
  
  for (let i = 0; i < nfree; i++) {
    const dofI = freeDofs[i];
    ff[i] = f[dofI];
    
    for (let j = K.rowPtr[dofI]; j < K.rowPtr[dofI + 1]; j++) {
      const dofJ = K.colIdx[j];
      if (dofMap.has(dofJ)) {
        const jFree = dofMap.get(dofJ)!;
        triplets.push({ row: i, col: jFree, value: K.values[j] });
      }
    }
  }
  
  const Kff = buildCSRFromTriplets(triplets, nfree, nfree);
  
  return { Kff, ff, freeDofs };
}

/**
 * Solve FE system: K * u = f
 * Returns full displacement vector (including fixed DOFs = 0)
 */
export function solveFE(
  K: CSRMatrix,
  f: Float64Array,
  fixedDofs: Uint32Array,
  cgTol: number = 1e-6,
  cgMaxIters: number = 1000
): { u: Float64Array; converged: boolean; iters: number } {
  // Apply boundary conditions
  const { Kff, ff, freeDofs } = applyBCElimination(K, f, fixedDofs);
  
  // Solve reduced system
  const result = solvePCG(Kff, ff, undefined, cgTol, cgMaxIters);
  
  // Scatter to full displacement vector
  const u = new Float64Array(K.nrows);
  for (let i = 0; i < freeDofs.length; i++) {
    u[freeDofs[i]] = result.x[i];
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
  Ke0: Float64Array
): Float64Array {
  const ce = new Float64Array(model.numElems);
  
  // Scale Ke0 by element size
  const dx = (model.bounds.max.x - model.bounds.min.x) / model.nx;
  const dy = (model.bounds.max.y - model.bounds.min.y) / model.ny;
  const elemArea = dx * dy;
  
  for (let e = 0; e < model.numElems; e++) {
    // Extract element displacements
    const ue = new Float64Array(8);
    for (let i = 0; i < 8; i++) {
      ue[i] = u[model.edofMat[e * 8 + i]];
    }
    
    // Compute Ke0 * ue
    const Kue = new Float64Array(8);
    for (let i = 0; i < 8; i++) {
      let sum = 0;
      for (let j = 0; j < 8; j++) {
        sum += Ke0[i * 8 + j] * ue[j];
      }
      Kue[i] = sum;
    }
    
    // Compute ue^T * Kue
    let energy = 0;
    for (let i = 0; i < 8; i++) {
      energy += ue[i] * Kue[i];
    }
    
    ce[e] = energy * elemArea;
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
  Emin: number
): Float64Array {
  const dc = new Float64Array(rhoBar.length);
  
  for (let e = 0; e < rhoBar.length; e++) {
    const rho = Math.max(1e-6, rhoBar[e]); // Guard against zero
    dc[e] = -penal * Math.pow(rho, penal - 1) * (E0 - Emin) * ce[e];
  }
  
  return dc;
}
