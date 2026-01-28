import type { PlaneDefinition, Vec3 } from "../types";
import {
  add,
  cross,
  distance,
  dot,
  lerp,
  length,
  normalize,
  scale,
  sub,
} from "../math/vector";

export { add, sub, scale, dot, cross, length, distance, normalize, lerp };

export const centroid = (points: Vec3[]): Vec3 => {
  if (points.length === 0) return { x: 0, y: 0, z: 0 };
  const sum = points.reduce(
    (acc, point) => add(acc, point),
    { x: 0, y: 0, z: 0 }
  );
  return scale(sum, 1 / points.length);
};

export const computeNormalNewell = (points: Vec3[]): Vec3 => {
  if (points.length < 3) return { x: 0, y: 1, z: 0 };
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    nx += (current.y - next.y) * (current.z + next.z);
    ny += (current.z - next.z) * (current.x + next.x);
    nz += (current.x - next.x) * (current.y + next.y);
  }
  return normalize({ x: nx, y: ny, z: nz });
};

const jacobiEigenDecomposition = (matrix: number[][]) => {
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const a = matrix.map((row) => [...row]);
  const maxIterations = 32;
  for (let iter = 0; iter < maxIterations; iter += 1) {
    let p = 0;
    let q = 1;
    let max = Math.abs(a[p][q]);
    for (let i = 0; i < 3; i += 1) {
      for (let j = i + 1; j < 3; j += 1) {
        const value = Math.abs(a[i][j]);
        if (value > max) {
          max = value;
          p = i;
          q = j;
        }
      }
    }
    if (max < 1e-10) break;
    const theta = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const app = a[p][p];
    const aqq = a[q][q];
    const apq = a[p][q];
    a[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    a[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    a[p][q] = 0;
    a[q][p] = 0;
    for (let i = 0; i < 3; i += 1) {
      if (i === p || i === q) continue;
      const aip = a[i][p];
      const aiq = a[i][q];
      a[i][p] = c * aip - s * aiq;
      a[p][i] = a[i][p];
      a[i][q] = s * aip + c * aiq;
      a[q][i] = a[i][q];
    }
    for (let i = 0; i < 3; i += 1) {
      const vip = v[i][p];
      const viq = v[i][q];
      v[i][p] = c * vip - s * viq;
      v[i][q] = s * vip + c * viq;
    }
  }
  return { values: [a[0][0], a[1][1], a[2][2]], vectors: v };
};

export const buildPlaneFromNormal = (
  origin: Vec3,
  normal: Vec3
): PlaneDefinition => {
  const n = normalize(normal);
  const reference =
    Math.abs(n.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const xAxis = normalize(cross(reference, n));
  const yAxis = normalize(cross(n, xAxis));
  return { origin, normal: n, xAxis, yAxis };
};

export const computeBestFitPlane = (points: Vec3[]): PlaneDefinition => {
  const center = centroid(points);
  if (points.length < 3) {
    return buildPlaneFromNormal(center, { x: 0, y: 1, z: 0 });
  }
  let cxx = 0;
  let cxy = 0;
  let cxz = 0;
  let cyy = 0;
  let cyz = 0;
  let czz = 0;
  points.forEach((point) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const dz = point.z - center.z;
    cxx += dx * dx;
    cxy += dx * dy;
    cxz += dx * dz;
    cyy += dy * dy;
    cyz += dy * dz;
    czz += dz * dz;
  });
  const matrix = [
    [cxx, cxy, cxz],
    [cxy, cyy, cyz],
    [cxz, cyz, czz],
  ];
  const { values, vectors } = jacobiEigenDecomposition(matrix);
  let smallestIndex = 0;
  if (values[1] < values[smallestIndex]) smallestIndex = 1;
  if (values[2] < values[smallestIndex]) smallestIndex = 2;
  const normal = normalize({
    x: vectors[0][smallestIndex],
    y: vectors[1][smallestIndex],
    z: vectors[2][smallestIndex],
  });
  const safeNormal =
    length(normal) > 0.0001 ? normal : computeNormalNewell(points);
  return buildPlaneFromNormal(center, safeNormal);
};

export const projectPointToPlane = (point: Vec3, plane: PlaneDefinition) => {
  const relative = sub(point, plane.origin);
  return {
    u: dot(relative, plane.xAxis),
    v: dot(relative, plane.yAxis),
  };
};

export const unprojectPointFromPlane = (
  uv: { u: number; v: number },
  plane: PlaneDefinition
): Vec3 => {
  const alongX = scale(plane.xAxis, uv.u);
  const alongY = scale(plane.yAxis, uv.v);
  return add(plane.origin, add(alongX, alongY));
};

export const distanceToPlane = (point: Vec3, plane: PlaneDefinition) => {
  const relative = sub(point, plane.origin);
  return dot(relative, plane.normal);
};
