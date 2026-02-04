import type { Vec3 } from "../../../types";
import { precomputeDensityFilter, applyDensityFilter } from "./filter";

export type NodeField = {
  values: Float32Array;
  nx: number;
  ny: number;
  nz: number;
  bounds: { min: Vec3; max: Vec3 };
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const buildNodeFieldFromElements = (
  densities: Float64Array,
  nx: number,
  ny: number,
  nz: number,
  bounds: { min: Vec3; max: Vec3 }
): NodeField => {
  const nodeNx = nx + 1;
  const nodeNy = ny + 1;
  const nodeNz = nz + 1;
  const nodeCount = nodeNx * nodeNy * nodeNz;
  const sums = new Float32Array(nodeCount);
  const counts = new Uint16Array(nodeCount);

  const elemIndex = (ix: number, iy: number, iz: number) =>
    iz * nx * ny + iy * nx + ix;
  const nodeIndex = (ix: number, iy: number, iz: number) =>
    iz * nodeNx * nodeNy + iy * nodeNx + ix;

  for (let iz = 0; iz < nz; iz++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const value = densities[elemIndex(ix, iy, iz)] ?? 0;
        const clamped = Number.isFinite(value) ? clamp01(value) : 0;
        for (let dz = 0; dz <= 1; dz++) {
          for (let dy = 0; dy <= 1; dy++) {
            for (let dx = 0; dx <= 1; dx++) {
              const nxIdx = ix + dx;
              const nyIdx = iy + dy;
              const nzIdx = iz + dz;
              const nIdx = nodeIndex(nxIdx, nyIdx, nzIdx);
              sums[nIdx] += clamped;
              counts[nIdx] += 1;
            }
          }
        }
      }
    }
  }

  const values = new Float32Array(nodeCount);
  for (let i = 0; i < nodeCount; i++) {
    const count = counts[i] || 1;
    values[i] = sums[i] / count;
  }

  return { values, nx: nodeNx, ny: nodeNy, nz: nodeNz, bounds };
};

export const applyHeavisideProjection = (
  field: NodeField,
  beta: number,
  eta: number
): NodeField => {
  const values = new Float32Array(field.values.length);
  const betaSafe = Math.max(1e-3, beta);
  const denom = Math.tanh(betaSafe * eta) + Math.tanh(betaSafe * (1 - eta));

  for (let i = 0; i < field.values.length; i++) {
    const rho = clamp01(field.values[i]);
    const projected =
      (Math.tanh(betaSafe * eta) + Math.tanh(betaSafe * (rho - eta))) / denom;
    values[i] = clamp01(projected);
  }

  return { ...field, values };
};

export const scheduleBeta = (
  iter: number,
  rampIters: number,
  betaStart: number,
  betaEnd: number
) => {
  if (rampIters <= 1) return betaEnd;
  const t = Math.max(0, Math.min(1, iter / rampIters));
  return betaStart + t * (betaEnd - betaStart);
};

export const resampleNodeField = (
  field: NodeField,
  refineFactor: number
): NodeField => {
  const factor = Math.max(1, Math.round(refineFactor));
  if (factor === 1) return field;

  const elemNx = field.nx - 1;
  const elemNy = field.ny - 1;
  const elemNz = field.nz - 1;
  const nodeNx = elemNx * factor + 1;
  const nodeNy = elemNy * factor + 1;
  const nodeNz = elemNz * factor + 1;

  const values = new Float32Array(nodeNx * nodeNy * nodeNz);
  const src = field.values;
  const srcNx = field.nx;
  const srcNy = field.ny;
  const srcNz = field.nz;

  const srcIndex = (ix: number, iy: number, iz: number) =>
    iz * srcNx * srcNy + iy * srcNx + ix;

  const sample = (x: number, y: number, z: number) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const z0 = Math.floor(z);
    const x1 = Math.min(srcNx - 1, x0 + 1);
    const y1 = Math.min(srcNy - 1, y0 + 1);
    const z1 = Math.min(srcNz - 1, z0 + 1);
    const tx = x - x0;
    const ty = y - y0;
    const tz = z - z0;

    const c000 = src[srcIndex(x0, y0, z0)];
    const c100 = src[srcIndex(x1, y0, z0)];
    const c010 = src[srcIndex(x0, y1, z0)];
    const c110 = src[srcIndex(x1, y1, z0)];
    const c001 = src[srcIndex(x0, y0, z1)];
    const c101 = src[srcIndex(x1, y0, z1)];
    const c011 = src[srcIndex(x0, y1, z1)];
    const c111 = src[srcIndex(x1, y1, z1)];

    const c00 = c000 * (1 - tx) + c100 * tx;
    const c10 = c010 * (1 - tx) + c110 * tx;
    const c01 = c001 * (1 - tx) + c101 * tx;
    const c11 = c011 * (1 - tx) + c111 * tx;
    const c0 = c00 * (1 - ty) + c10 * ty;
    const c1 = c01 * (1 - ty) + c11 * ty;
    return c0 * (1 - tz) + c1 * tz;
  };

  const scaleX = elemNx > 0 ? elemNx / (nodeNx - 1) : 0;
  const scaleY = elemNy > 0 ? elemNy / (nodeNy - 1) : 0;
  const scaleZ = elemNz > 0 ? elemNz / (nodeNz - 1) : 0;

  let idx = 0;
  for (let z = 0; z < nodeNz; z++) {
    const fz = scaleZ * z;
    for (let y = 0; y < nodeNy; y++) {
      const fy = scaleY * y;
      for (let x = 0; x < nodeNx; x++) {
        const fx = scaleX * x;
        values[idx] = clamp01(sample(fx, fy, fz));
        idx += 1;
      }
    }
  }

  return {
    values,
    nx: nodeNx,
    ny: nodeNy,
    nz: nodeNz,
    bounds: field.bounds,
  };
};

export const filterNodeField = (
  field: NodeField,
  rmin: number,
  maxNodes: number = 500000
): NodeField => {
  if (!Number.isFinite(rmin) || rmin <= 0) return field;
  const nodeCount = field.values.length;
  if (nodeCount > maxNodes) return field;

  const filter = precomputeDensityFilter(field.nx, field.ny, field.nz, rmin);
  const input = new Float64Array(nodeCount);
  for (let i = 0; i < nodeCount; i++) {
    input[i] = clamp01(field.values[i]);
  }

  const filtered = applyDensityFilter(input, filter);
  const values = new Float32Array(nodeCount);
  for (let i = 0; i < nodeCount; i++) {
    const value = filtered[i];
    values[i] = Number.isFinite(value) ? clamp01(value) : 0;
  }

  return { ...field, values };
};
