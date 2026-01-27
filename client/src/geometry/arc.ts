import type { PlaneDefinition, Vec3 } from "../types";
import { add, cross, dot, length, normalize, scale, sub } from "./math";

type Vec2 = { x: number; y: number };

const EPSILON = 1e-6;
const TAU = Math.PI * 2;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeAngle = (angle: number) => {
  let next = angle % TAU;
  if (next < 0) next += TAU;
  return next;
};

const resolvePlaneBasis = (plane: PlaneDefinition) => {
  const safeNormal =
    length(plane.normal) > EPSILON ? normalize(plane.normal) : { x: 0, y: 1, z: 0 };
  const worldUp = Math.abs(safeNormal.y) < 0.99 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const fallbackXAxis = normalize(cross(worldUp, safeNormal));
  const safeXAxis =
    length(plane.xAxis) > EPSILON ? normalize(plane.xAxis) : fallbackXAxis;
  let safeYAxis =
    length(plane.yAxis) > EPSILON ? normalize(plane.yAxis) : normalize(cross(safeNormal, safeXAxis));
  if (length(safeYAxis) <= EPSILON || Math.abs(dot(safeXAxis, safeYAxis)) > 0.999) {
    safeYAxis = normalize(cross(safeNormal, safeXAxis));
  }
  return {
    origin: plane.origin,
    normal: safeNormal,
    xAxis: safeXAxis,
    yAxis: safeYAxis,
  };
};

const toPlane2D = (point: Vec3, origin: Vec3, xAxis: Vec3, yAxis: Vec3): Vec2 => {
  const delta = sub(point, origin);
  return {
    x: dot(delta, xAxis),
    y: dot(delta, yAxis),
  };
};

const fromPlane2D = (
  point: Vec2,
  origin: Vec3,
  xAxis: Vec3,
  yAxis: Vec3
): Vec3 => add(origin, add(scale(xAxis, point.x), scale(yAxis, point.y)));

const computeCircleCenter2D = (a: Vec2, b: Vec2, c: Vec2) => {
  const aSq = a.x * a.x + a.y * a.y;
  const bSq = b.x * b.x + b.y * b.y;
  const cSq = c.x * c.x + c.y * c.y;
  const denom =
    2 *
    (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(denom) < EPSILON) return null;
  const ux =
    (aSq * (b.y - c.y) + bSq * (c.y - a.y) + cSq * (a.y - b.y)) / denom;
  const uy =
    (aSq * (c.x - b.x) + bSq * (a.x - c.x) + cSq * (b.x - a.x)) / denom;
  return { x: ux, y: uy } satisfies Vec2;
};

const computeArcSweep = (startAngle: number, midAngle: number, endAngle: number) => {
  const start = normalizeAngle(startAngle);
  const mid = normalizeAngle(midAngle);
  const end = normalizeAngle(endAngle);
  const sweepCCW = (end - start + TAU) % TAU;
  const midOffsetCCW = (mid - start + TAU) % TAU;
  const midOnCCW = midOffsetCCW <= sweepCCW + 1e-4;
  if (midOnCCW) return sweepCCW;
  return sweepCCW - TAU;
};

export const computeArcPolyline = (
  plane: PlaneDefinition,
  start: Vec3,
  end: Vec3,
  through: Vec3,
  baseSegments = 48
): Vec3[] | null => {
  const basis = resolvePlaneBasis(plane);
  const a2 = toPlane2D(start, basis.origin, basis.xAxis, basis.yAxis);
  const b2 = toPlane2D(end, basis.origin, basis.xAxis, basis.yAxis);
  const c2 = toPlane2D(through, basis.origin, basis.xAxis, basis.yAxis);
  const center2 = computeCircleCenter2D(a2, b2, c2);
  if (!center2) return null;

  const radius = Math.hypot(a2.x - center2.x, a2.y - center2.y);
  if (!Number.isFinite(radius) || radius < EPSILON) return null;

  const startAngle = Math.atan2(a2.y - center2.y, a2.x - center2.x);
  const midAngle = Math.atan2(c2.y - center2.y, c2.x - center2.x);
  const endAngle = Math.atan2(b2.y - center2.y, b2.x - center2.x);
  const sweep = computeArcSweep(startAngle, midAngle, endAngle);
  const sweepAbs = Math.abs(sweep);
  const segmentCount = clamp(
    Math.round((baseSegments * sweepAbs) / TAU),
    8,
    Math.max(8, baseSegments * 2)
  );

  const points: Vec3[] = [];
  for (let i = 0; i <= segmentCount; i += 1) {
    const t = i / segmentCount;
    const angle = startAngle + sweep * t;
    const point2: Vec2 = {
      x: center2.x + radius * Math.cos(angle),
      y: center2.y + radius * Math.sin(angle),
    };
    points.push(fromPlane2D(point2, basis.origin, basis.xAxis, basis.yAxis));
  }
  return points;
};

