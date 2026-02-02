/**
 * Mathematical constants for Lingua geometry kernel
 * 
 * These epsilon values are PERMANENT and should be used consistently
 * across all geometry operations for numerical stability.
 */

export const EPSILON = {
  /**
   * For geometric comparisons (point equality, colinearity, coplanarity)
   * Used when comparing positions, checking if vectors are parallel, etc.
   */
  GEOMETRIC: 1e-10,

  /**
   * For numeric precision (matrix operations, determinants, eigenvalues)
   * Used in linear algebra operations requiring high precision
   */
  NUMERIC: 1e-14,

  /**
   * For angle comparisons (radians)
   * Used when comparing angles, checking perpendicularity, etc.
   */
  ANGULAR: 1e-8,

  /**
   * For distance comparisons (meters, user-facing)
   * Used for user-visible distance checks, proximity tests, etc.
   */
  DISTANCE: 1e-6,
} as const;

/**
 * Mathematical constants
 */
export const PI = Math.PI;
export const TWO_PI = 2 * Math.PI;
export const HALF_PI = Math.PI / 2;
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

/**
 * Check if a value is effectively zero
 */
export const isZero = (value: number, epsilon = EPSILON.NUMERIC): boolean => {
  return Math.abs(value) < epsilon;
};

/**
 * Check if two values are effectively equal
 */
export const isEqual = (a: number, b: number, epsilon = EPSILON.NUMERIC): boolean => {
  return Math.abs(a - b) < epsilon;
};

/**
 * Clamp a value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Linear interpolation between a and b
 */
export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

/**
 * Smooth step interpolation (cubic Hermite)
 */
export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Smoother step interpolation (quintic Hermite)
 */
export const smootherstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
