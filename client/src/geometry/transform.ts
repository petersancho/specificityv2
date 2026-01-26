import type { PlaneDefinition, Vec3 } from "../types";
import { add, cross, dot, normalize, scale, sub } from "./math";

export type Basis = {
  xAxis: Vec3;
  yAxis: Vec3;
  zAxis: Vec3;
};

export const WORLD_BASIS: Basis = {
  xAxis: { x: 1, y: 0, z: 0 },
  yAxis: { x: 0, y: 1, z: 0 },
  zAxis: { x: 0, y: 0, z: 1 },
};

export const basisFromPlane = (plane: PlaneDefinition): Basis => ({
  xAxis: plane.xAxis,
  yAxis: plane.yAxis,
  zAxis: plane.normal,
});

export const toBasis = (vector: Vec3, basis: Basis): Vec3 => ({
  x: dot(vector, basis.xAxis),
  y: dot(vector, basis.yAxis),
  z: dot(vector, basis.zAxis),
});

export const fromBasis = (coords: Vec3, basis: Basis): Vec3 =>
  add(
    add(scale(basis.xAxis, coords.x), scale(basis.yAxis, coords.y)),
    scale(basis.zAxis, coords.z)
  );

export const translatePoint = (point: Vec3, delta: Vec3): Vec3 => add(point, delta);

export const rotateAroundAxis = (
  point: Vec3,
  pivot: Vec3,
  axis: Vec3,
  angleRad: number
): Vec3 => {
  const v = sub(point, pivot);
  const k = normalize(axis);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const term1 = scale(v, cos);
  const term2 = scale(cross(k, v), sin);
  const term3 = scale(k, dot(k, v) * (1 - cos));
  return add(pivot, add(add(term1, term2), term3));
};

export const scaleAroundPivot = (
  point: Vec3,
  pivot: Vec3,
  factors: Vec3,
  basis: Basis
): Vec3 => {
  const local = toBasis(sub(point, pivot), basis);
  const scaled = {
    x: local.x * factors.x,
    y: local.y * factors.y,
    z: local.z * factors.z,
  };
  return add(pivot, fromBasis(scaled, basis));
};

export const applyToPositions = (
  positions: number[],
  transform: (point: Vec3, index: number) => Vec3
): number[] => {
  const next = positions.slice();
  for (let i = 0; i < positions.length; i += 3) {
    const point = { x: positions[i], y: positions[i + 1], z: positions[i + 2] };
    const transformed = transform(point, i / 3);
    next[i] = transformed.x;
    next[i + 1] = transformed.y;
    next[i + 2] = transformed.z;
  }
  return next;
};
