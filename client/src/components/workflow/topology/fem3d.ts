import type { Vec3 } from "../../../types";
import { buildCSRFromTriplets, type CSRMatrix, type Triplet } from "./sparse";

// ============================================================================
// 3D FINITE ELEMENT ANALYSIS MODULE (Hexahedral, Linear)
// ============================================================================

export interface FEModel3D {
  nx: number;
  ny: number;
  nz: number;
  numNodes: number;
  numElems: number;
  numDofs: number;
  coords: Float64Array; // [x0,y0,z0, x1,y1,z1, ...]
  conn: Uint32Array; // [n0..n7] per element
  edofMat: Uint32Array; // [dof0..dof23] per element
  fixedDofs: Uint32Array;
  forces: Float64Array;
  bounds: { min: Vec3; max: Vec3 };
}

export function createFEModel3D(
  nx: number,
  ny: number,
  nz: number,
  bounds: { min: Vec3; max: Vec3 },
  fixedDofs: Set<number>,
  loads: Map<number, number>
): FEModel3D {
  const numNodes = (nx + 1) * (ny + 1) * (nz + 1);
  const numElems = nx * ny * nz;
  const numDofs = numNodes * 3;

  const coords = new Float64Array(numNodes * 3);
  const dx = (bounds.max.x - bounds.min.x) / nx;
  const dy = (bounds.max.y - bounds.min.y) / ny;
  const dz = (bounds.max.z - bounds.min.z) / nz;

  let nodeIdx = 0;
  for (let k = 0; k <= nz; k++) {
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) {
        coords[nodeIdx * 3] = bounds.min.x + i * dx;
        coords[nodeIdx * 3 + 1] = bounds.min.y + j * dy;
        coords[nodeIdx * 3 + 2] = bounds.min.z + k * dz;
        nodeIdx += 1;
      }
    }
  }

  const conn = new Uint32Array(numElems * 8);
  const sliceStride = (nx + 1) * (ny + 1);
  for (let ez = 0; ez < nz; ez++) {
    for (let ey = 0; ey < ny; ey++) {
      for (let ex = 0; ex < nx; ex++) {
        const e = ez * nx * ny + ey * nx + ex;
        const n0 = ez * sliceStride + ey * (nx + 1) + ex;
        const n1 = n0 + 1;
        const n3 = n0 + (nx + 1);
        const n2 = n3 + 1;
        const n4 = n0 + sliceStride;
        const n5 = n4 + 1;
        const n7 = n4 + (nx + 1);
        const n6 = n7 + 1;

        const base = e * 8;
        conn[base] = n0;
        conn[base + 1] = n1;
        conn[base + 2] = n2;
        conn[base + 3] = n3;
        conn[base + 4] = n4;
        conn[base + 5] = n5;
        conn[base + 6] = n6;
        conn[base + 7] = n7;
      }
    }
  }

  const edofMat = new Uint32Array(numElems * 24);
  for (let e = 0; e < numElems; e++) {
    for (let n = 0; n < 8; n++) {
      const node = conn[e * 8 + n];
      const dofBase = node * 3;
      const base = e * 24 + n * 3;
      edofMat[base] = dofBase;
      edofMat[base + 1] = dofBase + 1;
      edofMat[base + 2] = dofBase + 2;
    }
  }

  const forces = new Float64Array(numDofs);
  for (const [dof, force] of loads) {
    forces[dof] = force;
  }

  return {
    nx,
    ny,
    nz,
    numNodes,
    numElems,
    numDofs,
    coords,
    conn,
    edofMat,
    fixedDofs: new Uint32Array(fixedDofs),
    forces,
    bounds,
  };
}

export function computeKeHex(nu: number = 0.3): Float64Array {
  const Ke = new Float64Array(24 * 24);

  const factor = 1.0 / ((1.0 + nu) * (1.0 - 2.0 * nu));
  const D = new Float64Array(36);
  const a = (1 - nu) * factor;
  const b = nu * factor;
  const c = (1 - 2 * nu) * 0.5 * factor;
  D[0] = a; D[1] = b; D[2] = b;
  D[6] = b; D[7] = a; D[8] = b;
  D[12] = b; D[13] = b; D[14] = a;
  D[21] = c;
  D[28] = c;
  D[35] = c;

  const gp = 1.0 / Math.sqrt(3.0);
  const gauss = [-gp, gp];
  const signs = [
    { xi: -1, eta: -1, zeta: -1 },
    { xi: 1, eta: -1, zeta: -1 },
    { xi: 1, eta: 1, zeta: -1 },
    { xi: -1, eta: 1, zeta: -1 },
    { xi: -1, eta: -1, zeta: 1 },
    { xi: 1, eta: -1, zeta: 1 },
    { xi: 1, eta: 1, zeta: 1 },
    { xi: -1, eta: 1, zeta: 1 },
  ];

  for (const xi of gauss) {
    for (const eta of gauss) {
      for (const zeta of gauss) {
        const dNdx = new Float64Array(8);
        const dNdy = new Float64Array(8);
        const dNdz = new Float64Array(8);

        for (let i = 0; i < 8; i++) {
          const s = signs[i];
          dNdx[i] = 0.125 * s.xi * (1 + s.eta * eta) * (1 + s.zeta * zeta);
          dNdy[i] = 0.125 * s.eta * (1 + s.xi * xi) * (1 + s.zeta * zeta);
          dNdz[i] = 0.125 * s.zeta * (1 + s.xi * xi) * (1 + s.eta * eta);
        }

        const B = new Float64Array(6 * 24);
        for (let i = 0; i < 8; i++) {
          const col = i * 3;
          const dx = dNdx[i];
          const dy = dNdy[i];
          const dz = dNdz[i];
          B[col] = dx;
          B[24 + col + 1] = dy;
          B[48 + col + 2] = dz;
          B[72 + col] = dy;
          B[72 + col + 1] = dx;
          B[96 + col + 1] = dz;
          B[96 + col + 2] = dy;
          B[120 + col] = dz;
          B[120 + col + 2] = dx;
        }

        const DB = new Float64Array(6 * 24);
        for (let i = 0; i < 6; i++) {
          for (let j = 0; j < 24; j++) {
            let sum = 0;
            for (let k = 0; k < 6; k++) {
              sum += D[i * 6 + k] * B[k * 24 + j];
            }
            DB[i * 24 + j] = sum;
          }
        }

        for (let i = 0; i < 24; i++) {
          for (let j = 0; j < 24; j++) {
            let sum = 0;
            for (let k = 0; k < 6; k++) {
              sum += B[k * 24 + i] * DB[k * 24 + j];
            }
            Ke[i * 24 + j] += sum;
          }
        }
      }
    }
  }

  return Ke;
}

export function assembleKCSR3D(
  model: FEModel3D,
  rhoBar: Float64Array,
  penal: number,
  E0: number,
  Emin: number,
  Ke0: Float64Array
): CSRMatrix {
  const triplets: Triplet[] = [];
  const dx = (model.bounds.max.x - model.bounds.min.x) / model.nx;
  const dy = (model.bounds.max.y - model.bounds.min.y) / model.ny;
  const dz = (model.bounds.max.z - model.bounds.min.z) / model.nz;
  const elemVolume = dx * dy * dz;

  for (let e = 0; e < model.numElems; e++) {
    const rho = rhoBar[e];
    const E = Emin + Math.pow(rho, penal) * (E0 - Emin);
    const scale = E * elemVolume;

    for (let i = 0; i < 24; i++) {
      const dofI = model.edofMat[e * 24 + i];
      for (let j = 0; j < 24; j++) {
        const dofJ = model.edofMat[e * 24 + j];
        const value = Ke0[i * 24 + j] * scale;
        if (Math.abs(value) > 1e-14) {
          triplets.push({ row: dofI, col: dofJ, value });
        }
      }
    }
  }

  return buildCSRFromTriplets(triplets, model.numDofs, model.numDofs);
}

export function computeElementCe3D(
  model: FEModel3D,
  u: Float64Array,
  Ke0: Float64Array
): Float64Array {
  const ce = new Float64Array(model.numElems);
  const dx = (model.bounds.max.x - model.bounds.min.x) / model.nx;
  const dy = (model.bounds.max.y - model.bounds.min.y) / model.ny;
  const dz = (model.bounds.max.z - model.bounds.min.z) / model.nz;
  const elemVolume = dx * dy * dz;

  for (let e = 0; e < model.numElems; e++) {
    const ue = new Float64Array(24);
    for (let i = 0; i < 24; i++) {
      ue[i] = u[model.edofMat[e * 24 + i]];
    }

    const Kue = new Float64Array(24);
    for (let i = 0; i < 24; i++) {
      let sum = 0;
      for (let j = 0; j < 24; j++) {
        sum += Ke0[i * 24 + j] * ue[j];
      }
      Kue[i] = sum;
    }

    let energy = 0;
    for (let i = 0; i < 24; i++) {
      energy += ue[i] * Kue[i];
    }

    ce[e] = energy * elemVolume;
  }

  return ce;
}
