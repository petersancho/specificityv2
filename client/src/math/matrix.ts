import type { Vec3 } from "../types";
import type { Quaternion } from "./quaternion";
import { EPSILON } from "./constants";

export type Mat4 = Float32Array;

/**
 * Create identity matrix
 */
export const identity = (): Mat4 =>
  new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);

/**
 * Matrix multiplication: a * b
 */
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

/**
 * Create translation matrix
 */
export const translation = (v: Vec3): Mat4 => {
  const m = identity();
  m[12] = v.x;
  m[13] = v.y;
  m[14] = v.z;
  return m;
};

/**
 * Create scaling matrix
 */
export const scaling = (s: Vec3): Mat4 => {
  const m = identity();
  m[0] = s.x;
  m[5] = s.y;
  m[10] = s.z;
  return m;
};

/**
 * Create rotation matrix from quaternion
 */
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

/**
 * Create rotation matrix from axis and angle
 */
export const rotationFromAxisAngle = (axis: Vec3, angle: number): Mat4 => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  const { x, y, z } = axis;
  
  const m = identity();
  m[0] = t * x * x + c;
  m[1] = t * x * y + s * z;
  m[2] = t * x * z - s * y;
  m[4] = t * x * y - s * z;
  m[5] = t * y * y + c;
  m[6] = t * y * z + s * x;
  m[8] = t * x * z + s * y;
  m[9] = t * y * z - s * x;
  m[10] = t * z * z + c;
  return m;
};

/**
 * Create look-at matrix (view matrix)
 */
export const lookAt = (eye: Vec3, target: Vec3, up: Vec3): Mat4 => {
  const zAxis = {
    x: eye.x - target.x,
    y: eye.y - target.y,
    z: eye.z - target.z,
  };
  const zLen = Math.sqrt(zAxis.x * zAxis.x + zAxis.y * zAxis.y + zAxis.z * zAxis.z);
  zAxis.x /= zLen;
  zAxis.y /= zLen;
  zAxis.z /= zLen;
  
  const xAxis = {
    x: up.y * zAxis.z - up.z * zAxis.y,
    y: up.z * zAxis.x - up.x * zAxis.z,
    z: up.x * zAxis.y - up.y * zAxis.x,
  };
  const xLen = Math.sqrt(xAxis.x * xAxis.x + xAxis.y * xAxis.y + xAxis.z * xAxis.z);
  xAxis.x /= xLen;
  xAxis.y /= xLen;
  xAxis.z /= xLen;
  
  const yAxis = {
    x: zAxis.y * xAxis.z - zAxis.z * xAxis.y,
    y: zAxis.z * xAxis.x - zAxis.x * xAxis.z,
    z: zAxis.x * xAxis.y - zAxis.y * xAxis.x,
  };
  
  const m = identity();
  m[0] = xAxis.x;
  m[1] = yAxis.x;
  m[2] = zAxis.x;
  m[4] = xAxis.y;
  m[5] = yAxis.y;
  m[6] = zAxis.y;
  m[8] = xAxis.z;
  m[9] = yAxis.z;
  m[10] = zAxis.z;
  m[12] = -(xAxis.x * eye.x + xAxis.y * eye.y + xAxis.z * eye.z);
  m[13] = -(yAxis.x * eye.x + yAxis.y * eye.y + yAxis.z * eye.z);
  m[14] = -(zAxis.x * eye.x + zAxis.y * eye.y + zAxis.z * eye.z);
  return m;
};

/**
 * Create perspective projection matrix
 */
export const perspective = (fov: number, aspect: number, near: number, far: number): Mat4 => {
  const f = 1 / Math.tan(fov / 2);
  const rangeInv = 1 / (near - far);
  
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (near + far) * rangeInv;
  m[11] = -1;
  m[14] = near * far * rangeInv * 2;
  return m;
};

/**
 * Create orthographic projection matrix
 */
export const orthographic = (
  left: number,
  right: number,
  bottom: number,
  top: number,
  near: number,
  far: number
): Mat4 => {
  const m = identity();
  m[0] = 2 / (right - left);
  m[5] = 2 / (top - bottom);
  m[10] = -2 / (far - near);
  m[12] = -(right + left) / (right - left);
  m[13] = -(top + bottom) / (top - bottom);
  m[14] = -(far + near) / (far - near);
  return m;
};

/**
 * Transform point by matrix (applies translation)
 */
export const transformPoint = (m: Mat4, p: Vec3): Vec3 => {
  const x = m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12];
  const y = m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13];
  const z = m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14];
  const w = m[3] * p.x + m[7] * p.y + m[11] * p.z + m[15];
  if (Math.abs(w) > EPSILON.NUMERIC && w !== 1) {
    return { x: x / w, y: y / w, z: z / w };
  }
  return { x, y, z };
};

/**
 * Transform direction by matrix (ignores translation)
 */
export const transformDirection = (m: Mat4, v: Vec3): Vec3 => ({
  x: m[0] * v.x + m[4] * v.y + m[8] * v.z,
  y: m[1] * v.x + m[5] * v.y + m[9] * v.z,
  z: m[2] * v.x + m[6] * v.y + m[10] * v.z,
});

/**
 * Invert rigid transformation matrix (rotation + translation only)
 * Fast but only works for rigid transformations
 */
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

/**
 * Calculate determinant of matrix
 */
export const determinant = (m: Mat4): number => {
  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
  const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
  const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
  const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;

  return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
};

/**
 * Invert general matrix (works for any invertible matrix)
 * Slower than invertRigid but handles scaling and shearing
 */
export const invert = (m: Mat4): Mat4 | null => {
  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
  const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
  const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
  const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;

  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (Math.abs(det) < EPSILON.NUMERIC) {
    return null;
  }

  det = 1 / det;

  const result = new Float32Array(16);
  result[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  result[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  result[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  result[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  result[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  result[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  result[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  result[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  result[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  result[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  result[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  result[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  result[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  result[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  result[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  result[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

  return result;
};

/**
 * Transpose matrix
 */
export const transpose = (m: Mat4): Mat4 => {
  const result = new Float32Array(16);
  result[0] = m[0];
  result[1] = m[4];
  result[2] = m[8];
  result[3] = m[12];
  result[4] = m[1];
  result[5] = m[5];
  result[6] = m[9];
  result[7] = m[13];
  result[8] = m[2];
  result[9] = m[6];
  result[10] = m[10];
  result[11] = m[14];
  result[12] = m[3];
  result[13] = m[7];
  result[14] = m[11];
  result[15] = m[15];
  return result;
};

/**
 * Decompose matrix into translation, rotation, and scale
 */
export const decompose = (m: Mat4): { translation: Vec3; rotation: Quaternion; scale: Vec3 } => {
  const translation: Vec3 = {
    x: m[12],
    y: m[13],
    z: m[14],
  };

  const sx = Math.sqrt(m[0] * m[0] + m[1] * m[1] + m[2] * m[2]);
  const sy = Math.sqrt(m[4] * m[4] + m[5] * m[5] + m[6] * m[6]);
  const sz = Math.sqrt(m[8] * m[8] + m[9] * m[9] + m[10] * m[10]);

  const scale: Vec3 = { x: sx, y: sy, z: sz };

  const rotMat = identity();
  rotMat[0] = m[0] / sx;
  rotMat[1] = m[1] / sx;
  rotMat[2] = m[2] / sx;
  rotMat[4] = m[4] / sy;
  rotMat[5] = m[5] / sy;
  rotMat[6] = m[6] / sy;
  rotMat[8] = m[8] / sz;
  rotMat[9] = m[9] / sz;
  rotMat[10] = m[10] / sz;

  const trace = rotMat[0] + rotMat[5] + rotMat[10];
  let rotation: Quaternion;

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    rotation = {
      w: 0.25 / s,
      x: (rotMat[6] - rotMat[9]) * s,
      y: (rotMat[8] - rotMat[2]) * s,
      z: (rotMat[1] - rotMat[4]) * s,
    };
  } else if (rotMat[0] > rotMat[5] && rotMat[0] > rotMat[10]) {
    const s = 2 * Math.sqrt(1 + rotMat[0] - rotMat[5] - rotMat[10]);
    rotation = {
      w: (rotMat[6] - rotMat[9]) / s,
      x: 0.25 * s,
      y: (rotMat[4] + rotMat[1]) / s,
      z: (rotMat[8] + rotMat[2]) / s,
    };
  } else if (rotMat[5] > rotMat[10]) {
    const s = 2 * Math.sqrt(1 + rotMat[5] - rotMat[0] - rotMat[10]);
    rotation = {
      w: (rotMat[8] - rotMat[2]) / s,
      x: (rotMat[4] + rotMat[1]) / s,
      y: 0.25 * s,
      z: (rotMat[9] + rotMat[6]) / s,
    };
  } else {
    const s = 2 * Math.sqrt(1 + rotMat[10] - rotMat[0] - rotMat[5]);
    rotation = {
      w: (rotMat[1] - rotMat[4]) / s,
      x: (rotMat[8] + rotMat[2]) / s,
      y: (rotMat[9] + rotMat[6]) / s,
      z: 0.25 * s,
    };
  }

  return { translation, rotation, scale };
};

/**
 * Compose matrix from translation, rotation, and scale
 */
export const compose = (translation: Vec3, rotation: Quaternion, scale: Vec3): Mat4 => {
  const rotMat = rotationFromQuaternion(rotation);
  const result = identity();

  result[0] = rotMat[0] * scale.x;
  result[1] = rotMat[1] * scale.x;
  result[2] = rotMat[2] * scale.x;
  result[4] = rotMat[4] * scale.y;
  result[5] = rotMat[5] * scale.y;
  result[6] = rotMat[6] * scale.y;
  result[8] = rotMat[8] * scale.z;
  result[9] = rotMat[9] * scale.z;
  result[10] = rotMat[10] * scale.z;
  result[12] = translation.x;
  result[13] = translation.y;
  result[14] = translation.z;

  return result;
};
