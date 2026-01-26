import type { Vec3 } from "../types";
import { add, dot, length, scale, sub } from "../geometry/math";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const closestPointOnSegment = (point: Vec3, a: Vec3, b: Vec3): Vec3 => {
  const ab = sub(b, a);
  const t = dot(sub(point, a), ab) / Math.max(dot(ab, ab), 1e-12);
  const clamped = clamp(t, 0, 1);
  return add(a, scale(ab, clamped));
};

export const distancePointToSegment = (point: Vec3, a: Vec3, b: Vec3) =>
  length(sub(point, closestPointOnSegment(point, a, b)));

export const distanceRayToSegment = (
  rayOrigin: Vec3,
  rayDir: Vec3,
  a: Vec3,
  b: Vec3
) => {
  const u = rayDir;
  const v = sub(b, a);
  const w0 = sub(rayOrigin, a);
  const aDot = dot(u, u);
  const bDot = dot(u, v);
  const cDot = dot(v, v);
  const dDot = dot(u, w0);
  const eDot = dot(v, w0);
  const denom = aDot * cDot - bDot * bDot;
  let sc = 0;
  let tc = 0;
  if (denom > 1e-8) {
    sc = (bDot * eDot - cDot * dDot) / denom;
    sc = Math.max(sc, 0);
  }
  if (cDot > 1e-8) {
    tc = (aDot * eDot - bDot * dDot) / denom;
  } else {
    tc = 0;
  }
  tc = clamp(tc, 0, 1);
  const pointOnRay = add(rayOrigin, scale(u, sc));
  const pointOnSeg = add(a, scale(v, tc));
  return length(sub(pointOnRay, pointOnSeg));
};

export const findClosestSegmentIndex = (
  rayOrigin: Vec3,
  rayDir: Vec3,
  points: Vec3[],
  maxDistance: number
) => {
  let closestIndex = -1;
  let closestDistance = maxDistance;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const d = distanceRayToSegment(rayOrigin, rayDir, a, b);
    if (d < closestDistance) {
      closestDistance = d;
      closestIndex = i;
    }
  }
  return closestIndex;
};

export const findClosestVertexIndex = (
  rayOrigin: Vec3,
  rayDir: Vec3,
  points: Vec3[],
  maxDistance: number
) => {
  let closestIndex = -1;
  let closestDistance = maxDistance;
  points.forEach((point, index) => {
    const toPoint = sub(point, rayOrigin);
    const t = dot(toPoint, rayDir);
    if (t < 0) return;
    const closest = add(rayOrigin, scale(rayDir, t));
    const d = length(sub(point, closest));
    if (d < closestDistance) {
      closestDistance = d;
      closestIndex = index;
    }
  });
  return closestIndex;
};

export const getTriangleEdgeFromPoint = (
  point: Vec3,
  a: Vec3,
  b: Vec3,
  c: Vec3
) => {
  const ab = distancePointToSegment(point, a, b);
  const bc = distancePointToSegment(point, b, c);
  const ca = distancePointToSegment(point, c, a);
  if (ab <= bc && ab <= ca) return 0;
  if (bc <= ab && bc <= ca) return 1;
  return 2;
};
