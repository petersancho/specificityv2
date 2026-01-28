import type { Vec3 } from "../types";
import { normalize } from "./vector";

export type Quaternion = { x: number; y: number; z: number; w: number };

const EPSILON = 1e-10;

export const identity = (): Quaternion => ({ x: 0, y: 0, z: 0, w: 1 });

export const fromAxisAngle = (axis: Vec3, angle: number): Quaternion => {
  const halfAngle = angle * 0.5;
  const s = Math.sin(halfAngle);
  const normalized = normalize(axis);
  return {
    x: normalized.x * s,
    y: normalized.y * s,
    z: normalized.z * s,
    w: Math.cos(halfAngle),
  };
};

export const multiply = (a: Quaternion, b: Quaternion): Quaternion => ({
  x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
});

export const conjugate = (q: Quaternion): Quaternion => ({
  x: -q.x,
  y: -q.y,
  z: -q.z,
  w: q.w,
});

export const slerp = (a: Quaternion, b: Quaternion, t: number): Quaternion => {
  let cosHalfTheta = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  let bCopy = { ...b };

  if (cosHalfTheta < 0) {
    bCopy = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
    cosHalfTheta = -cosHalfTheta;
  }

  if (cosHalfTheta >= 1.0 - EPSILON) {
    return {
      x: a.x + t * (bCopy.x - a.x),
      y: a.y + t * (bCopy.y - a.y),
      z: a.z + t * (bCopy.z - a.z),
      w: a.w + t * (bCopy.w - a.w),
    };
  }

  const halfTheta = Math.acos(cosHalfTheta);
  const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

  const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
  const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

  return {
    x: a.x * ratioA + bCopy.x * ratioB,
    y: a.y * ratioA + bCopy.y * ratioB,
    z: a.z * ratioA + bCopy.z * ratioB,
    w: a.w * ratioA + bCopy.w * ratioB,
  };
};

export const rotateVector = (q: Quaternion, v: Vec3): Vec3 => {
  const tx = 2 * (q.y * v.z - q.z * v.y);
  const ty = 2 * (q.z * v.x - q.x * v.z);
  const tz = 2 * (q.x * v.y - q.y * v.x);

  return {
    x: v.x + q.w * tx + (q.y * tz - q.z * ty),
    y: v.y + q.w * ty + (q.z * tx - q.x * tz),
    z: v.z + q.w * tz + (q.x * ty - q.y * tx),
  };
};
