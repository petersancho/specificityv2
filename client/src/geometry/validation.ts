/**
 * Validation utilities for geometry and rendering pipeline
 * Ensures mesh attributes meet required invariants before GPU upload
 */

import { warnOnce } from "../utils/warnOnce";

/**
 * Validate that positions array is properly aligned (length divisible by 3)
 * @throws Error if positions.length % 3 !== 0
 */
export function assertPositionsValid(positions: ArrayLike<number>, context: string): void {
  if (positions.length % 3 !== 0) {
    throw new Error(
      `[${context}] positions.length must be multiple of 3, got ${positions.length}`
    );
  }
}

/**
 * Clamp value to [0, 1] range
 */
export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Validate that colors array matches positions length and is properly aligned
 * @returns true if colors are valid, false otherwise
 */
export function validateColorsLength(
  positions: ArrayLike<number>,
  colors: ArrayLike<number> | undefined,
  context: string
): colors is ArrayLike<number> {
  if (!colors) return false;
  
  if (colors.length !== positions.length) {
    warnOnce(
      `${context}:colors-length`,
      `[${context}] colors length ${colors.length} != positions length ${positions.length}; ignoring colors`
    );
    return false;
  }
  
  if (colors.length % 3 !== 0) {
    warnOnce(
      `${context}:colors-mod3`,
      `[${context}] colors length must be multiple of 3; ignoring colors`
    );
    return false;
  }
  
  return true;
}

/**
 * Normalize non-negative values to sum to 1
 * Clamps negative values to 0, then normalizes
 * @returns normalized array (sum = 1) or all zeros if sum ≈ 0
 */
export function normalizeNonNegative(values: number[], epsilon = 1e-12): number[] {
  let sum = 0;
  const clamped = values.map(v => {
    if (!Number.isFinite(v) || v < 0) return 0;
    return v;
  });
  
  for (const v of clamped) {
    sum += v;
  }
  
  if (sum <= epsilon) {
    return clamped.map(() => 0);
  }
  
  return clamped.map(v => v / sum);
}

/**
 * Expand a vec3 attribute (positions, normals, colors) using an index map
 * Used when duplicating vertices for flat shading or splitting large meshes
 */
export function expandVec3Attribute(
  src: ArrayLike<number>,
  indexMap: ArrayLike<number>
): Float32Array {
  const out = new Float32Array(indexMap.length * 3);
  for (let i = 0; i < indexMap.length; i++) {
    const si = indexMap[i] * 3;
    const oi = i * 3;
    out[oi] = src[si];
    out[oi + 1] = src[si + 1];
    out[oi + 2] = src[si + 2];
  }
  return out;
}
