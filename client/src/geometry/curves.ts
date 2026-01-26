import { CatmullRomCurve3, Vector3 } from "three";
import type { Vec3 } from "../types";
import { distance, lerp } from "./math";

const toVector3 = (point: Vec3) => new Vector3(point.x, point.y, point.z);
const fromVector3 = (point: Vector3): Vec3 => ({
  x: point.x,
  y: point.y,
  z: point.z,
});

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
  const curve = new CatmullRomCurve3(
    points.map(toVector3),
    closed,
    degree === 2 ? "centripetal" : "catmullrom",
    degree === 2 ? 0.5 : 0.0
  );
  const sampled = curve.getPoints(resolution);
  return sampled.map(fromVector3);
};

export const ensureClosedLoop = (points: Vec3[]) => {
  if (points.length === 0) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (distance(first, last) < 1e-6) return points;
  return [...points, first];
};
