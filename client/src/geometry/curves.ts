import type { Vec3 } from "../types";
import { distance, lerp , EPSILON } from "./math";

const EPSILON_DISTANCE = EPSILON.DISTANCE;

const blend = (a: Vec3, b: Vec3, wa: number, wb: number): Vec3 => ({
  x: a.x * wa + b.x * wb,
  y: a.y * wa + b.y * wb,
  z: a.z * wa + b.z * wb,
});

const parameterize = (t: number, p0: Vec3, p1: Vec3, alpha: number) => {
  const d = distance(p0, p1);
  const step = Math.pow(Math.max(d, EPSILON_DISTANCE), alpha);
  return t + step;
};

const catmullRomPoint = (
  p0: Vec3,
  p1: Vec3,
  p2: Vec3,
  p3: Vec3,
  t: number,
  alpha: number
): Vec3 => {
  const t0 = 0;
  const t1 = parameterize(t0, p0, p1, alpha);
  const t2 = parameterize(t1, p1, p2, alpha);
  const t3 = parameterize(t2, p2, p3, alpha);

  const tt = t1 + (t2 - t1) * t;

  const denomA1 = t1 - t0;
  const denomA2 = t2 - t1;
  const denomA3 = t3 - t2;

  const A1 = blend(
    p0,
    p1,
    denomA1 !== 0 ? (t1 - tt) / denomA1 : 0,
    denomA1 !== 0 ? (tt - t0) / denomA1 : 0
  );
  const A2 = blend(
    p1,
    p2,
    denomA2 !== 0 ? (t2 - tt) / denomA2 : 0,
    denomA2 !== 0 ? (tt - t1) / denomA2 : 0
  );
  const A3 = blend(
    p2,
    p3,
    denomA3 !== 0 ? (t3 - tt) / denomA3 : 0,
    denomA3 !== 0 ? (tt - t2) / denomA3 : 0
  );

  const denomB1 = t2 - t0;
  const denomB2 = t3 - t1;

  const B1 = blend(
    A1,
    A2,
    denomB1 !== 0 ? (t2 - tt) / denomB1 : 0,
    denomB1 !== 0 ? (tt - t0) / denomB1 : 0
  );
  const B2 = blend(
    A2,
    A3,
    denomB2 !== 0 ? (t3 - tt) / denomB2 : 0,
    denomB2 !== 0 ? (tt - t1) / denomB2 : 0
  );

  const denomC = t2 - t1;
  return blend(
    B1,
    B2,
    denomC !== 0 ? (t2 - tt) / denomC : 0,
    denomC !== 0 ? (tt - t1) / denomC : 0
  );
};

export const polylineLength = (points: Vec3[]) => {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += distance(points[i - 1], points[i]);
  }
  return total;
};

export const resampleByArcLength = (
  points: Vec3[],
  count: number,
  closed = false
): Vec3[] => {
  if (points.length === 0) return [];
  if (points.length === 1 || count <= 1) return [points[0]];
  const source = closed ? [...points, points[0]] : points;
  const lengths: number[] = [0];
  for (let i = 1; i < source.length; i += 1) {
    lengths[i] = lengths[i - 1] + distance(source[i - 1], source[i]);
  }
  const total = lengths[lengths.length - 1];
  if (total === 0) {
    return Array.from({ length: count }, () => ({ ...points[0] }));
  }
  const step = total / (count - (closed ? 0 : 1));
  const samples: Vec3[] = [];
  for (let i = 0; i < count; i += 1) {
    const target = step * i;
    let segment = 1;
    while (segment < lengths.length && lengths[segment] < target) {
      segment += 1;
    }
    const prevLength = lengths[segment - 1];
    const nextLength = lengths[segment] ?? total;
    const t =
      nextLength === prevLength
        ? 0
        : (target - prevLength) / (nextLength - prevLength);
    const sample = lerp(source[segment - 1], source[segment] ?? source[0], t);
    samples.push(sample);
  }
  if (!closed) return samples;
  return samples.slice(0, count);
};

export const interpolatePolyline = (
  points: Vec3[],
  degree: 1 | 2 | 3,
  closed = false,
  resolution = 64
): Vec3[] => {
  if (points.length < 2) return points;
  if (degree === 1) return points;
  const totalSegments = closed ? points.length : points.length - 1;
  const samplesPerSegment = Math.max(1, Math.round(resolution / totalSegments));
  const alpha = degree === 2 ? 0.5 : 0.0;

  const samples: Vec3[] = [];

  for (let i = 0; i < totalSegments; i += 1) {
    const index = (value: number) =>
      closed
        ? (value + points.length) % points.length
        : Math.max(0, Math.min(points.length - 1, value));

    const p0 = points[index(i - 1)];
    const p1 = points[index(i)];
    const p2 = points[index(i + 1)];
    const p3 = points[index(i + 2)];

    for (let s = 0; s < samplesPerSegment; s += 1) {
      if (!closed && i > 0 && s === 0) continue;
      const t = s / samplesPerSegment;
      samples.push(catmullRomPoint(p0, p1, p2, p3, t, alpha));
    }
  }

  if (!closed) {
    samples.push(points[points.length - 1]);
  }

  return samples;
};

export const ensureClosedLoop = (points: Vec3[]) => {
  if (points.length === 0) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (distance(first, last) < EPSILON.DISTANCE) return points;
  return [...points, first];
};
