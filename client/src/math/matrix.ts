import type { Vec3 } from "../types";
import type { Quaternion } from "./quaternion";

export type Mat4 = Float32Array;

export const identity = (): Mat4 =>
  new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);

export const multiply = (a: Mat4, b: Mat4): Mat4 => {
  const result = new Float32Array(16);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      result[col * 4 + row] = sum;
    }
  }
  return result;
};

export const translation = (v: Vec3): Mat4 => {
  const m = identity();
  m[12] = v.x;
  m[13] = v.y;
  m[14] = v.z;
  return m;
};

export const scaling = (s: Vec3): Mat4 => {
  const m = identity();
  m[0] = s.x;
  m[5] = s.y;
  m[10] = s.z;
  return m;
};

export const rotationFromQuaternion = (q: Quaternion): Mat4 => {
  const { x, y, z, w } = q;
  const m = identity();
  m[0] = 1 - 2 * (y * y + z * z);
  m[1] = 2 * (x * y + w * z);
  m[2] = 2 * (x * z - w * y);
  m[4] = 2 * (x * y - w * z);
  m[5] = 1 - 2 * (x * x + z * z);
  m[6] = 2 * (y * z + w * x);
  m[8] = 2 * (x * z + w * y);
  m[9] = 2 * (y * z - w * x);
  m[10] = 1 - 2 * (x * x + y * y);
  return m;
};

export const transformPoint = (m: Mat4, p: Vec3): Vec3 => {
  const x = m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12];
  const y = m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13];
  const z = m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14];
  const w = m[3] * p.x + m[7] * p.y + m[11] * p.z + m[15];
  if (Math.abs(w) > 1e-10 && w !== 1) {
    return { x: x / w, y: y / w, z: z / w };
  }
  return { x, y, z };
};

export const transformDirection = (m: Mat4, v: Vec3): Vec3 => ({
  x: m[0] * v.x + m[4] * v.y + m[8] * v.z,
  y: m[1] * v.x + m[5] * v.y + m[9] * v.z,
  z: m[2] * v.x + m[6] * v.y + m[10] * v.z,
});

export const invertRigid = (m: Mat4): Mat4 => {
  const result = identity();
  result[0] = m[0];
  result[4] = m[1];
  result[8] = m[2];
  result[1] = m[4];
  result[5] = m[5];
  result[9] = m[6];
  result[2] = m[8];
  result[6] = m[9];
  result[10] = m[10];

  const tx = m[12];
  const ty = m[13];
  const tz = m[14];

  result[12] = -(result[0] * tx + result[4] * ty + result[8] * tz);
  result[13] = -(result[1] * tx + result[5] * ty + result[9] * tz);
  result[14] = -(result[2] * tx + result[6] * ty + result[10] * tz);
  return result;
};
