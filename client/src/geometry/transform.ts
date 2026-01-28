import type { PlaneDefinition, Vec3 } from "../types";
import { add, dot, normalize, scale, sub } from "./math";
import { fromAxisAngle } from "../math/quaternion";
import {
  identity,
  multiply,
  rotationFromQuaternion,
  scaling,
  transformPoint,
  translation,
  type Mat4,
} from "../math/matrix";

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
  const matrix = createRotationMatrixAroundAxis(pivot, axis, angleRad);
  return transformPoint(matrix, point);
};

export const scaleAroundPivot = (
  point: Vec3,
  pivot: Vec3,
  factors: Vec3,
  basis: Basis
): Vec3 => {
  const matrix = createScaleMatrixAroundPivot(pivot, factors, basis);
  return transformPoint(matrix, point);
};

const basisToMatrix = (basis: Basis): Mat4 => {
  const m = identity();
  m[0] = basis.xAxis.x;
  m[1] = basis.xAxis.y;
  m[2] = basis.xAxis.z;
  m[4] = basis.yAxis.x;
  m[5] = basis.yAxis.y;
  m[6] = basis.yAxis.z;
  m[8] = basis.zAxis.x;
  m[9] = basis.zAxis.y;
  m[10] = basis.zAxis.z;
  return m;
};

const invertBasisMatrix = (basis: Basis): Mat4 => {
  const m = identity();
  m[0] = basis.xAxis.x;
  m[1] = basis.yAxis.x;
  m[2] = basis.zAxis.x;
  m[4] = basis.xAxis.y;
  m[5] = basis.yAxis.y;
  m[6] = basis.zAxis.y;
  m[8] = basis.xAxis.z;
  m[9] = basis.yAxis.z;
  m[10] = basis.zAxis.z;
  return m;
};

export const createRotationMatrixAroundAxis = (
  pivot: Vec3,
  axis: Vec3,
  angleRad: number
): Mat4 => {
  const axisNormalized = normalize(axis);
  const rotation = rotationFromQuaternion(fromAxisAngle(axisNormalized, angleRad));
  const toPivot = translation(pivot);
  const fromPivot = translation(scale(pivot, -1));
  return multiply(multiply(toPivot, rotation), fromPivot);
};

export const createScaleMatrixAroundPivot = (
  pivot: Vec3,
  factors: Vec3,
  basis: Basis
): Mat4 => {
  const toPivot = translation(pivot);
  const fromPivot = translation(scale(pivot, -1));
  const basisMatrix = basisToMatrix(basis);
  const basisInverse = invertBasisMatrix(basis);
  const scaleMatrix = scaling(factors);
  return multiply(
    multiply(toPivot, multiply(basisMatrix, multiply(scaleMatrix, basisInverse))),
    fromPivot
  );
};

export const applyMatrixToPositions = (
  positions: number[],
  matrix: Mat4
): number[] => {
  const next = positions.slice();
  for (let i = 0; i < positions.length; i += 3) {
    const point = { x: positions[i], y: positions[i + 1], z: positions[i + 2] };
    const transformed = transformPoint(matrix, point);
    next[i] = transformed.x;
    next[i + 1] = transformed.y;
    next[i + 2] = transformed.z;
  }
  return next;
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
