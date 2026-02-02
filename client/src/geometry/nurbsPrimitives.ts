import type { NURBSCurve, NURBSSurface, Vec3 } from "../types";
import { createCircleNurbs } from "./arc";
import { add, scale , EPSILON } from "./math";

const DEFAULT_MAX_ARC = Math.PI / 3;

const buildArcSegments = (startAngle: number, endAngle: number, maxAngle: number) => {
  const sweep = endAngle - startAngle;
  const safeMax = Number.isFinite(maxAngle) && maxAngle > 0 ? maxAngle : Math.PI / 2;
  const count = Math.max(1, Math.ceil(Math.abs(sweep) / safeMax));
  const segments: Array<{ a0: number; a1: number }> = [];
  for (let i = 0; i < count; i += 1) {
    const t0 = i / count;
    const t1 = (i + 1) / count;
    segments.push({
      a0: startAngle + sweep * t0,
      a1: startAngle + sweep * t1,
    });
  }
  return segments;
};

const buildArcNurbs = (
  center: Vec3,
  radius: number,
  xAxis: Vec3,
  yAxis: Vec3,
  startAngle: number,
  endAngle: number,
  maxAngle = DEFAULT_MAX_ARC
): NURBSCurve => {
  const segments = buildArcSegments(startAngle, endAngle, maxAngle);
  const controlPoints: Vec3[] = [];
  const weights: number[] = [];

  segments.forEach((segment, index) => {
    const theta = segment.a1 - segment.a0;
    const mid = (segment.a0 + segment.a1) * 0.5;
    const cosHalf = Math.cos(theta * 0.5);
    const scaleFactor = radius / Math.max(cosHalf, EPSILON.DISTANCE);

    const p0 = add(
      center,
      add(
        scale(xAxis, Math.cos(segment.a0) * radius),
        scale(yAxis, Math.sin(segment.a0) * radius)
      )
    );
    const p2 = add(
      center,
      add(
        scale(xAxis, Math.cos(segment.a1) * radius),
        scale(yAxis, Math.sin(segment.a1) * radius)
      )
    );
    const p1 = add(
      center,
      add(
        scale(xAxis, Math.cos(mid) * scaleFactor),
        scale(yAxis, Math.sin(mid) * scaleFactor)
      )
    );

    if (index === 0) {
      controlPoints.push(p0);
      weights.push(1);
    }
    controlPoints.push(p1, p2);
    weights.push(cosHalf, 1);
  });

  const degree = 2;
  const segmentCount = segments.length;
  const knots: number[] = [];
  for (let i = 0; i <= degree; i += 1) knots.push(0);
  for (let i = 1; i < segmentCount; i += 1) {
    const value = i / segmentCount;
    for (let j = 0; j < degree; j += 1) knots.push(value);
  }
  for (let i = 0; i <= degree; i += 1) knots.push(1);

  return { controlPoints, weights, knots, degree };
};

const UNIT_PLANE = {
  origin: { x: 0, y: 0, z: 0 },
  normal: { x: 0, y: 1, z: 0 },
  xAxis: { x: 1, y: 0, z: 0 },
  yAxis: { x: 0, y: 0, z: 1 },
};

export const createNurbsSphereSurface = (radius: number): NURBSSurface => {
  const circle = createCircleNurbs(UNIT_PLANE, UNIT_PLANE.origin, 1);
  const meridian = buildArcNurbs(
    { x: 0, y: 0, z: 0 },
    radius,
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    Math.PI / 2,
    -Math.PI / 2,
    DEFAULT_MAX_ARC
  );

  const uCount = circle.controlPoints.length;
  const vCount = meridian.controlPoints.length;
  const controlPoints: Vec3[][] = Array.from({ length: uCount }, () =>
    Array.from({ length: vCount }, () => ({ x: 0, y: 0, z: 0 }))
  );
  const weights: number[][] = Array.from({ length: uCount }, () =>
    Array.from({ length: vCount }, () => 1)
  );

  for (let u = 0; u < uCount; u += 1) {
    const circlePoint = circle.controlPoints[u];
    const circleWeight = circle.weights?.[u] ?? 1;
    for (let v = 0; v < vCount; v += 1) {
      const meridianPoint = meridian.controlPoints[v];
      const meridianWeight = meridian.weights?.[v] ?? 1;
      const radial = meridianPoint.x;
      controlPoints[u][v] = {
        x: circlePoint.x * radial,
        y: meridianPoint.y,
        z: circlePoint.z * radial,
      };
      weights[u][v] = circleWeight * meridianWeight;
    }
  }

  return {
    controlPoints,
    knotsU: circle.knots,
    knotsV: meridian.knots,
    degreeU: circle.degree,
    degreeV: meridian.degree,
    weights,
  };
};

export const createNurbsCylinderSurface = (
  radius: number,
  height: number
): NURBSSurface => {
  const circle = createCircleNurbs(UNIT_PLANE, UNIT_PLANE.origin, radius);
  const controlPoints: Vec3[][] = circle.controlPoints.map((point) => [
    { x: point.x, y: 0, z: point.z },
    { x: point.x, y: height, z: point.z },
  ]);
  const weights = circle.weights
    ? circle.weights.map((weight) => [weight, weight])
    : undefined;
  return {
    controlPoints,
    knotsU: circle.knots,
    knotsV: [0, 0, 1, 1],
    degreeU: circle.degree,
    degreeV: 1,
    weights,
  };
};

const createBilinearSurface = (
  p00: Vec3,
  p10: Vec3,
  p11: Vec3,
  p01: Vec3
): NURBSSurface => ({
  controlPoints: [
    [p00, p01],
    [p10, p11],
  ],
  knotsU: [0, 0, 1, 1],
  knotsV: [0, 0, 1, 1],
  degreeU: 1,
  degreeV: 1,
});

export const createNurbsBoxSurfaces = (
  width: number,
  height: number,
  depth: number
): NURBSSurface[] => {
  const halfW = width * 0.5;
  const halfD = depth * 0.5;
  const x0 = -halfW;
  const x1 = halfW;
  const y0 = 0;
  const y1 = height;
  const z0 = -halfD;
  const z1 = halfD;

  const top = createBilinearSurface(
    { x: x0, y: y1, z: z1 },
    { x: x1, y: y1, z: z1 },
    { x: x1, y: y1, z: z0 },
    { x: x0, y: y1, z: z0 }
  );
  const bottom = createBilinearSurface(
    { x: x0, y: y0, z: z0 },
    { x: x1, y: y0, z: z0 },
    { x: x1, y: y0, z: z1 },
    { x: x0, y: y0, z: z1 }
  );
  const right = createBilinearSurface(
    { x: x1, y: y0, z: z0 },
    { x: x1, y: y1, z: z0 },
    { x: x1, y: y1, z: z1 },
    { x: x1, y: y0, z: z1 }
  );
  const left = createBilinearSurface(
    { x: x0, y: y0, z: z1 },
    { x: x0, y: y1, z: z1 },
    { x: x0, y: y1, z: z0 },
    { x: x0, y: y0, z: z0 }
  );
  const front = createBilinearSurface(
    { x: x0, y: y0, z: z1 },
    { x: x1, y: y0, z: z1 },
    { x: x1, y: y1, z: z1 },
    { x: x0, y: y1, z: z1 }
  );
  const back = createBilinearSurface(
    { x: x1, y: y0, z: z0 },
    { x: x0, y: y0, z: z0 },
    { x: x0, y: y1, z: z0 },
    { x: x1, y: y1, z: z0 }
  );

  return [top, bottom, right, left, front, back];
};
