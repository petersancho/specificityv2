import type { Vec3 } from "../types";
import { normalize } from "./vector";
import { EPSILON } from "./constants";

export type Quaternion = { x: number; y: number; z: number; w: number };

/**
 * Create identity quaternion (no rotation)
 */
export const identity = (): Quaternion => ({ x: 0, y: 0, z: 0, w: 1 });

/**
 * Create quaternion from axis and angle
 */
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

/**
 * Convert quaternion to axis and angle
 */
export const toAxisAngle = (q: Quaternion): { axis: Vec3; angle: number } => {
  const angle = 2 * Math.acos(q.w);
  const s = Math.sqrt(1 - q.w * q.w);
  
  if (s < EPSILON.GEOMETRIC) {
    return {
      axis: { x: 1, y: 0, z: 0 },
      angle: 0,
    };
  }
  
  return {
    axis: {
      x: q.x / s,
      y: q.y / s,
      z: q.z / s,
    },
    angle,
  };
};

/**
 * Create quaternion from Euler angles (XYZ order)
 */
export const fromEuler = (x: number, y: number, z: number, order = "XYZ"): Quaternion => {
  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);

  if (order === "XYZ") {
    return {
      x: s1 * c2 * c3 + c1 * s2 * s3,
      y: c1 * s2 * c3 - s1 * c2 * s3,
      z: c1 * c2 * s3 + s1 * s2 * c3,
      w: c1 * c2 * c3 - s1 * s2 * s3,
    };
  } else if (order === "YXZ") {
    return {
      x: s1 * c2 * c3 + c1 * s2 * s3,
      y: c1 * s2 * c3 - s1 * c2 * s3,
      z: c1 * c2 * s3 - s1 * s2 * c3,
      w: c1 * c2 * c3 + s1 * s2 * s3,
    };
  } else if (order === "ZXY") {
    return {
      x: s1 * c2 * c3 - c1 * s2 * s3,
      y: c1 * s2 * c3 + s1 * c2 * s3,
      z: c1 * c2 * s3 + s1 * s2 * c3,
      w: c1 * c2 * c3 - s1 * s2 * s3,
    };
  } else if (order === "ZYX") {
    return {
      x: s1 * c2 * c3 - c1 * s2 * s3,
      y: c1 * s2 * c3 + s1 * c2 * s3,
      z: c1 * c2 * s3 - s1 * s2 * c3,
      w: c1 * c2 * c3 + s1 * s2 * s3,
    };
  } else if (order === "YZX") {
    return {
      x: s1 * c2 * c3 + c1 * s2 * s3,
      y: c1 * s2 * c3 + s1 * c2 * s3,
      z: c1 * c2 * s3 - s1 * s2 * c3,
      w: c1 * c2 * c3 - s1 * s2 * s3,
    };
  } else if (order === "XZY") {
    return {
      x: s1 * c2 * c3 - c1 * s2 * s3,
      y: c1 * s2 * c3 - s1 * c2 * s3,
      z: c1 * c2 * s3 + s1 * s2 * c3,
      w: c1 * c2 * c3 + s1 * s2 * s3,
    };
  }

  return identity();
};

/**
 * Convert quaternion to Euler angles (XYZ order)
 */
export const toEuler = (q: Quaternion, order = "XYZ"): { x: number; y: number; z: number } => {
  const { x, y, z, w } = q;

  if (order === "XYZ") {
    const sinX = 2 * (w * x + y * z);
    const cosX = 1 - 2 * (x * x + y * y);
    const sinY = 2 * (w * y - z * x);
    const sinZ = 2 * (w * z + x * y);
    const cosZ = 1 - 2 * (y * y + z * z);

    return {
      x: Math.atan2(sinX, cosX),
      y: Math.asin(Math.max(-1, Math.min(1, sinY))),
      z: Math.atan2(sinZ, cosZ),
    };
  }

  return { x: 0, y: 0, z: 0 };
};

/**
 * Create quaternion that rotates from one direction to another
 */
export const lookRotation = (forward: Vec3, up: Vec3): Quaternion => {
  const f = normalize(forward);
  const u = normalize(up);
  
  const right = {
    x: u.y * f.z - u.z * f.y,
    y: u.z * f.x - u.x * f.z,
    z: u.x * f.y - u.y * f.x,
  };
  const rightLen = Math.sqrt(right.x * right.x + right.y * right.y + right.z * right.z);
  right.x /= rightLen;
  right.y /= rightLen;
  right.z /= rightLen;
  
  const upNew = {
    x: f.y * right.z - f.z * right.y,
    y: f.z * right.x - f.x * right.z,
    z: f.x * right.y - f.y * right.x,
  };
  
  const trace = right.x + upNew.y + f.z;
  
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    return {
      w: 0.25 / s,
      x: (upNew.z - f.y) * s,
      y: (f.x - right.z) * s,
      z: (right.y - upNew.x) * s,
    };
  } else if (right.x > upNew.y && right.x > f.z) {
    const s = 2 * Math.sqrt(1 + right.x - upNew.y - f.z);
    return {
      w: (upNew.z - f.y) / s,
      x: 0.25 * s,
      y: (upNew.x + right.y) / s,
      z: (f.x + right.z) / s,
    };
  } else if (upNew.y > f.z) {
    const s = 2 * Math.sqrt(1 + upNew.y - right.x - f.z);
    return {
      w: (f.x - right.z) / s,
      x: (upNew.x + right.y) / s,
      y: 0.25 * s,
      z: (f.y + upNew.z) / s,
    };
  } else {
    const s = 2 * Math.sqrt(1 + f.z - right.x - upNew.y);
    return {
      w: (right.y - upNew.x) / s,
      x: (f.x + right.z) / s,
      y: (f.y + upNew.z) / s,
      z: 0.25 * s,
    };
  }
};

/**
 * Quaternion multiplication: a * b
 */
export const multiply = (a: Quaternion, b: Quaternion): Quaternion => ({
  x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
});

/**
 * Quaternion conjugate: q*
 */
export const conjugate = (q: Quaternion): Quaternion => ({
  x: -q.x,
  y: -q.y,
  z: -q.z,
  w: q.w,
});

/**
 * Quaternion inverse: q⁻¹
 */
export const inverse = (q: Quaternion): Quaternion => {
  const lenSq = q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w;
  if (lenSq < EPSILON.NUMERIC) {
    return identity();
  }
  const invLenSq = 1 / lenSq;
  return {
    x: -q.x * invLenSq,
    y: -q.y * invLenSq,
    z: -q.z * invLenSq,
    w: q.w * invLenSq,
  };
};

/**
 * Quaternion dot product
 */
export const dot = (a: Quaternion, b: Quaternion): number => {
  return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
};

/**
 * Quaternion length (magnitude)
 */
export const length = (q: Quaternion): number => {
  return Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
};

/**
 * Normalize quaternion to unit length
 */
export const normalizeQuat = (q: Quaternion): Quaternion => {
  const len = length(q);
  if (len < EPSILON.NUMERIC) {
    return identity();
  }
  return {
    x: q.x / len,
    y: q.y / len,
    z: q.z / len,
    w: q.w / len,
  };
};

/**
 * Spherical linear interpolation: slerp(a, b, t)
 */
export const slerp = (a: Quaternion, b: Quaternion, t: number): Quaternion => {
  let cosHalfTheta = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  let bCopy = { ...b };

  if (cosHalfTheta < 0) {
    bCopy = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
    cosHalfTheta = -cosHalfTheta;
  }

  if (cosHalfTheta >= 1.0 - EPSILON.GEOMETRIC) {
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

/**
 * Rotate vector by quaternion
 */
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
