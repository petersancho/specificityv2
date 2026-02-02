import type { Vec3 } from "../types";
import { EPSILON, isZero } from "./constants";

/**
 * Vector addition: a + b
 */
export const add = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});

/**
 * Vector subtraction: a - b
 */
export const sub = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});

export const subtract = sub;

/**
 * Scalar multiplication: v * s
 */
export const scale = (v: Vec3, s: number): Vec3 => ({
  x: v.x * s,
  y: v.y * s,
  z: v.z * s,
});

/**
 * Component-wise multiplication: a * b
 */
export const multiply = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x * b.x,
  y: a.y * b.y,
  z: a.z * b.z,
});

/**
 * Component-wise division: a / b
 */
export const divide = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x / b.x,
  y: a.y / b.y,
  z: a.z / b.z,
});

/**
 * Dot product: a · b
 */
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

/**
 * Cross product: a × b
 */
export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

/**
 * Vector length (magnitude): |v|
 */
export const length = (v: Vec3): number => Math.sqrt(dot(v, v));

/**
 * Squared length (avoids sqrt): |v|²
 */
export const lengthSquared = (v: Vec3): number => dot(v, v);

/**
 * Distance between two points: |b - a|
 */
export const distance = (a: Vec3, b: Vec3): number => length(sub(a, b));

/**
 * Squared distance (avoids sqrt): |b - a|²
 */
export const distanceSquared = (a: Vec3, b: Vec3): number => lengthSquared(sub(a, b));

/**
 * Normalize vector to unit length: v / |v|
 */
export const normalize = (v: Vec3): Vec3 => {
  const len = length(v);
  if (!Number.isFinite(len) || len < EPSILON.GEOMETRIC) return { x: 0, y: 0, z: 0 };
  return scale(v, 1 / len);
};

/**
 * Linear interpolation: a + t * (b - a)
 */
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});

/**
 * Negate vector: -v
 */
export const negate = (v: Vec3): Vec3 => ({
  x: -v.x,
  y: -v.y,
  z: -v.z,
});

/**
 * Absolute value of each component: |v|
 */
export const abs = (v: Vec3): Vec3 => ({
  x: Math.abs(v.x),
  y: Math.abs(v.y),
  z: Math.abs(v.z),
});

/**
 * Minimum of each component: min(a, b)
 */
export const min = (a: Vec3, b: Vec3): Vec3 => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  z: Math.min(a.z, b.z),
});

/**
 * Maximum of each component: max(a, b)
 */
export const max = (a: Vec3, b: Vec3): Vec3 => ({
  x: Math.max(a.x, b.x),
  y: Math.max(a.y, b.y),
  z: Math.max(a.z, b.z),
});

/**
 * Clamp each component between min and max
 */
export const clamp = (v: Vec3, minVal: Vec3, maxVal: Vec3): Vec3 => ({
  x: Math.max(minVal.x, Math.min(maxVal.x, v.x)),
  y: Math.max(minVal.y, Math.min(maxVal.y, v.y)),
  z: Math.max(minVal.z, Math.min(maxVal.z, v.z)),
});

/**
 * Project vector a onto vector b: (a · b̂) * b̂
 */
export const project = (a: Vec3, onto: Vec3): Vec3 => {
  const ontoNorm = normalize(onto);
  return scale(ontoNorm, dot(a, ontoNorm));
};

/**
 * Reject vector a from vector b: a - project(a, b)
 */
export const reject = (a: Vec3, from: Vec3): Vec3 => {
  return sub(a, project(a, from));
};

/**
 * Reflect vector v across normal n: v - 2(v · n)n
 */
export const reflect = (v: Vec3, normal: Vec3): Vec3 => {
  const n = normalize(normal);
  return sub(v, scale(n, 2 * dot(v, n)));
};

/**
 * Angle between two vectors (radians): arccos((a · b) / (|a| * |b|))
 */
export const angle = (a: Vec3, b: Vec3): number => {
  const lenA = length(a);
  const lenB = length(b);
  if (lenA < EPSILON.GEOMETRIC || lenB < EPSILON.GEOMETRIC) return 0;
  const cosAngle = dot(a, b) / (lenA * lenB);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
};

/**
 * Signed angle between two vectors around a normal (radians)
 */
export const signedAngle = (a: Vec3, b: Vec3, normal: Vec3): number => {
  const unsignedAngle = angle(a, b);
  const sign = dot(cross(a, b), normal);
  return sign >= 0 ? unsignedAngle : -unsignedAngle;
};

/**
 * Scalar triple product: a · (b × c)
 */
export const triple = (a: Vec3, b: Vec3, c: Vec3): number => {
  return dot(a, cross(b, c));
};

/**
 * Get a perpendicular vector to v
 */
export const perpendicular = (v: Vec3): Vec3 => {
  const absX = Math.abs(v.x);
  const absY = Math.abs(v.y);
  const absZ = Math.abs(v.z);
  
  if (absX <= absY && absX <= absZ) {
    return normalize(cross(v, { x: 1, y: 0, z: 0 }));
  } else if (absY <= absZ) {
    return normalize(cross(v, { x: 0, y: 1, z: 0 }));
  } else {
    return normalize(cross(v, { x: 0, y: 0, z: 1 }));
  }
};

/**
 * Check if vector is effectively zero
 */
export const isVecZero = (v: Vec3, epsilon = EPSILON.GEOMETRIC): boolean => {
  return Math.abs(v.x) < epsilon && Math.abs(v.y) < epsilon && Math.abs(v.z) < epsilon;
};

/**
 * Check if two vectors are effectively equal
 */
export const isVecEqual = (a: Vec3, b: Vec3, epsilon = EPSILON.GEOMETRIC): boolean => {
  return (
    Math.abs(a.x - b.x) < epsilon &&
    Math.abs(a.y - b.y) < epsilon &&
    Math.abs(a.z - b.z) < epsilon
  );
};

/**
 * Check if two vectors are parallel (angle ≈ 0 or π)
 */
export const isParallel = (a: Vec3, b: Vec3, epsilon = EPSILON.ANGULAR): boolean => {
  const aNorm = normalize(a);
  const bNorm = normalize(b);
  const dotProduct = Math.abs(dot(aNorm, bNorm));
  return Math.abs(dotProduct - 1) < epsilon;
};

/**
 * Check if two vectors are perpendicular (angle ≈ π/2)
 */
export const isPerpendicular = (a: Vec3, b: Vec3, epsilon = EPSILON.ANGULAR): boolean => {
  return Math.abs(dot(normalize(a), normalize(b))) < epsilon;
};

/**
 * Check if three points are colinear
 */
export const isColinear = (a: Vec3, b: Vec3, c: Vec3, epsilon = EPSILON.GEOMETRIC): boolean => {
  const ab = sub(b, a);
  const ac = sub(c, a);
  const crossProduct = cross(ab, ac);
  return length(crossProduct) < epsilon;
};

/**
 * Check if points are coplanar
 */
export const isCoplanar = (points: Vec3[], epsilon = EPSILON.GEOMETRIC): boolean => {
  if (points.length < 4) return true;
  
  const a = points[0];
  const b = points[1];
  const c = points[2];
  
  const ab = sub(b, a);
  const ac = sub(c, a);
  const normal = normalize(cross(ab, ac));
  
  if (isVecZero(normal, epsilon)) return true;
  
  for (let i = 3; i < points.length; i++) {
    const ap = sub(points[i], a);
    const dist = Math.abs(dot(ap, normal));
    if (dist > epsilon) return false;
  }
  
  return true;
};

/**
 * Batch operations for SIMD optimization
 */

export const addBatch = (vectors: Vec3[], offset: Vec3): Vec3[] => {
  return vectors.map(v => add(v, offset));
};

export const scaleBatch = (vectors: Vec3[], scale: number): Vec3[] => {
  return vectors.map(v => ({ x: v.x * scale, y: v.y * scale, z: v.z * scale }));
};

export const normalizeBatch = (vectors: Vec3[]): Vec3[] => {
  return vectors.map(normalize);
};
