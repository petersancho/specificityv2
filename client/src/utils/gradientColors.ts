import type { RenderMesh } from "../types";

/**
 * Gradient Color System for Solver Visualizations
 * 
 * Provides beautiful gradient coloring for all solver outputs:
 * - Physics: Stress field visualization (blue → cyan → yellow → orange → red)
 * - Chemistry: Material concentration blending (custom per-material colors)
 * - Voxel: Density field visualization (black → white or custom gradient)
 * - Biological: Fitness visualization (green → yellow → red)
 */

type RGB = [number, number, number];

type GradientStop = {
  t: number;
  color: RGB;
};

// ============================================================================
// GRADIENT DEFINITIONS
// ============================================================================

/**
 * Stress gradient: Blue (low stress) → Red (high stress)
 * Used for physics solver stress field visualization
 */
export const STRESS_GRADIENT: GradientStop[] = [
  { t: 0, color: [0.12, 0.22, 0.66] },      // Deep blue
  { t: 0.25, color: [0.0, 0.62, 0.86] },    // Cyan
  { t: 0.55, color: [0.98, 0.86, 0.35] },   // Yellow
  { t: 0.78, color: [0.98, 0.55, 0.2] },    // Orange
  { t: 1, color: [0.86, 0.12, 0.16] },      // Red
];

/**
 * Density gradient: Black (void) → White (solid)
 * Used for voxel solver topology optimization
 */
export const DENSITY_GRADIENT: GradientStop[] = [
  { t: 0, color: [0.08, 0.08, 0.12] },      // Near black
  { t: 0.3, color: [0.25, 0.28, 0.35] },    // Dark gray
  { t: 0.6, color: [0.55, 0.58, 0.65] },    // Medium gray
  { t: 0.85, color: [0.82, 0.85, 0.88] },   // Light gray
  { t: 1, color: [0.95, 0.96, 0.97] },      // Near white
];

/**
 * Fitness gradient: Green (good) → Yellow (medium) → Red (poor)
 * Used for biological solver fitness visualization
 */
export const FITNESS_GRADIENT: GradientStop[] = [
  { t: 0, color: [0.86, 0.12, 0.16] },      // Red (poor fitness)
  { t: 0.35, color: [0.98, 0.55, 0.2] },    // Orange
  { t: 0.65, color: [0.98, 0.86, 0.35] },   // Yellow
  { t: 0.85, color: [0.55, 0.85, 0.35] },   // Yellow-green
  { t: 1, color: [0.15, 0.68, 0.38] },      // Green (good fitness)
];

/**
 * Viridis-inspired gradient: Purple → Blue → Green → Yellow
 * Alternative scientific visualization gradient
 */
export const VIRIDIS_GRADIENT: GradientStop[] = [
  { t: 0, color: [0.267, 0.005, 0.329] },   // Purple
  { t: 0.25, color: [0.282, 0.361, 0.553] }, // Blue
  { t: 0.5, color: [0.153, 0.569, 0.557] },  // Teal
  { t: 0.75, color: [0.478, 0.757, 0.424] }, // Green
  { t: 1, color: [0.993, 0.906, 0.144] },    // Yellow
];

/**
 * Plasma-inspired gradient: Blue → Purple → Orange → Yellow
 * Alternative scientific visualization gradient
 */
export const PLASMA_GRADIENT: GradientStop[] = [
  { t: 0, color: [0.050, 0.030, 0.529] },   // Deep blue
  { t: 0.25, color: [0.529, 0.016, 0.612] }, // Purple
  { t: 0.5, color: [0.859, 0.216, 0.424] },  // Magenta
  { t: 0.75, color: [0.988, 0.553, 0.235] }, // Orange
  { t: 1, color: [0.941, 0.976, 0.129] },    // Yellow
];

// ============================================================================
// GRADIENT SAMPLING
// ============================================================================

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const mix = (a: RGB, b: RGB, t: number): RGB => {
  const clamped = clamp01(t);
  return [
    lerp(a[0], b[0], clamped),
    lerp(a[1], b[1], clamped),
    lerp(a[2], b[2], clamped),
  ];
};

/**
 * Sample a gradient at normalized position t ∈ [0, 1]
 */
export const sampleGradient = (gradient: GradientStop[], t: number): RGB => {
  const clamped = clamp01(t);
  
  for (let i = 0; i < gradient.length - 1; i += 1) {
    const current = gradient[i];
    const next = gradient[i + 1];
    
    if (clamped >= current.t && clamped <= next.t) {
      const span = Math.max(1e-6, next.t - current.t);
      const local = (clamped - current.t) / span;
      return mix(current.color, next.color, local);
    }
  }
  
  return gradient[gradient.length - 1].color;
};

// ============================================================================
// VERTEX STRESS COMPUTATION (Physics Solver)
// ============================================================================

const buildVertexStress = (mesh: RenderMesh, stressField: number[]) => {
  const vertexCount = Math.floor(mesh.positions.length / 3);
  if (vertexCount === 0 || stressField.length === 0) return null;

  const values = new Array<number>(vertexCount).fill(0);
  const counts = new Array<number>(vertexCount).fill(0);

  // Per-vertex stress field
  if (stressField.length === vertexCount) {
    for (let i = 0; i < vertexCount; i += 1) {
      const value = stressField[i];
      if (!Number.isFinite(value)) continue;
      values[i] = value;
      counts[i] = 1;
    }
    return { values, counts };
  }

  // Per-face stress field (average to vertices)
  if (mesh.indices.length >= 3) {
    const faceCount = Math.floor(mesh.indices.length / 3);
    if (stressField.length === faceCount) {
      for (let face = 0; face < faceCount; face += 1) {
        const value = stressField[face];
        if (!Number.isFinite(value)) continue;
        const base = face * 3;
        const ia = mesh.indices[base];
        const ib = mesh.indices[base + 1];
        const ic = mesh.indices[base + 2];
        if (ia != null && ia >= 0 && ia < vertexCount) {
          values[ia] += value;
          counts[ia] += 1;
        }
        if (ib != null && ib >= 0 && ib < vertexCount) {
          values[ib] += value;
          counts[ib] += 1;
        }
        if (ic != null && ic >= 0 && ic < vertexCount) {
          values[ic] += value;
          counts[ic] += 1;
        }
      }
      return { values, counts };
    }
  }

  return null;
};

/**
 * Build stress vertex colors for physics solver
 * Maps stress field to blue → cyan → yellow → orange → red gradient
 */
export const buildStressVertexColors = (
  mesh: RenderMesh,
  stressField: number[]
): number[] | null => {
  const resolved = buildVertexStress(mesh, stressField);
  if (!resolved) return null;

  const { values, counts } = resolved;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  // Average and find range
  for (let i = 0; i < values.length; i += 1) {
    if (counts[i] === 0) continue;
    const value = values[i] / Math.max(1, counts[i]);
    if (!Number.isFinite(value)) continue;
    min = Math.min(min, value);
    max = Math.max(max, value);
    values[i] = value;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  const range = Math.max(1e-9, max - min);
  const colors = new Array<number>(values.length * 3).fill(0);

  // Map to gradient
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    const normalized = counts[i] === 0 ? 0 : clamp01((value - min) / range);
    const [r, g, b] = sampleGradient(STRESS_GRADIENT, normalized);
    const offset = i * 3;
    colors[offset] = r;
    colors[offset + 1] = g;
    colors[offset + 2] = b;
  }

  return colors;
};

// ============================================================================
// DENSITY VERTEX COLORS (Voxel Solver)
// ============================================================================

/**
 * Build density vertex colors for voxel solver
 * Maps density field to black → white gradient (or custom gradient)
 */
export const buildDensityVertexColors = (
  mesh: RenderMesh,
  densityField: number[],
  gradient: GradientStop[] = DENSITY_GRADIENT
): number[] | null => {
  const vertexCount = Math.floor(mesh.positions.length / 3);
  if (vertexCount === 0 || densityField.length === 0) return null;

  // Density field should be per-vertex
  if (densityField.length !== vertexCount) {
    console.warn(`Density field length (${densityField.length}) doesn't match vertex count (${vertexCount})`);
    return null;
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  // Find range
  for (let i = 0; i < vertexCount; i += 1) {
    const value = densityField[i];
    if (!Number.isFinite(value)) continue;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  const range = Math.max(1e-9, max - min);
  const colors = new Array<number>(vertexCount * 3).fill(0);

  // Map to gradient
  for (let i = 0; i < vertexCount; i += 1) {
    const value = densityField[i];
    const normalized = Number.isFinite(value) ? clamp01((value - min) / range) : 0;
    const [r, g, b] = sampleGradient(gradient, normalized);
    const offset = i * 3;
    colors[offset] = r;
    colors[offset + 1] = g;
    colors[offset + 2] = b;
  }

  return colors;
};

// ============================================================================
// MATERIAL CONCENTRATION COLORS (Chemistry Solver)
// ============================================================================

/**
 * Build material concentration vertex colors for chemistry solver
 * Blends material colors based on concentration at each vertex
 */
export const buildMaterialConcentrationColors = (
  mesh: RenderMesh,
  concentrations: Record<string, number[]>,
  materialColors: Record<string, RGB>
): number[] | null => {
  const vertexCount = Math.floor(mesh.positions.length / 3);
  if (vertexCount === 0) return null;

  const materialNames = Object.keys(concentrations);
  if (materialNames.length === 0) return null;

  // Validate all concentration arrays have correct length
  for (const name of materialNames) {
    const field = concentrations[name];
    if (!field || field.length !== vertexCount) {
      console.warn(`Material ${name} concentration field length mismatch`);
      return null;
    }
  }

  const colors = new Array<number>(vertexCount * 3).fill(0);

  // Blend material colors at each vertex
  for (let i = 0; i < vertexCount; i += 1) {
    let r = 0, g = 0, b = 0;
    let totalWeight = 0;

    for (const name of materialNames) {
      const concentration = concentrations[name][i];
      if (!Number.isFinite(concentration) || concentration <= 0) continue;

      const color = materialColors[name];
      if (!color) continue;

      r += color[0] * concentration;
      g += color[1] * concentration;
      b += color[2] * concentration;
      totalWeight += concentration;
    }

    // Normalize
    if (totalWeight > 1e-9) {
      r /= totalWeight;
      g /= totalWeight;
      b /= totalWeight;
    }

    const offset = i * 3;
    colors[offset] = clamp01(r);
    colors[offset + 1] = clamp01(g);
    colors[offset + 2] = clamp01(b);
  }

  return colors;
};

// ============================================================================
// FITNESS VERTEX COLORS (Biological Solver)
// ============================================================================

/**
 * Build fitness vertex colors for biological solver
 * Maps fitness values to green → yellow → red gradient
 */
export const buildFitnessVertexColors = (
  mesh: RenderMesh,
  fitnessField: number[],
  gradient: GradientStop[] = FITNESS_GRADIENT
): number[] | null => {
  const vertexCount = Math.floor(mesh.positions.length / 3);
  if (vertexCount === 0 || fitnessField.length === 0) return null;

  // Fitness field should be per-vertex
  if (fitnessField.length !== vertexCount) {
    console.warn(`Fitness field length (${fitnessField.length}) doesn't match vertex count (${vertexCount})`);
    return null;
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  // Find range
  for (let i = 0; i < vertexCount; i += 1) {
    const value = fitnessField[i];
    if (!Number.isFinite(value)) continue;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  const range = Math.max(1e-9, max - min);
  const colors = new Array<number>(vertexCount * 3).fill(0);

  // Map to gradient
  for (let i = 0; i < vertexCount; i += 1) {
    const value = fitnessField[i];
    const normalized = Number.isFinite(value) ? clamp01((value - min) / range) : 0;
    const [r, g, b] = sampleGradient(gradient, normalized);
    const offset = i * 3;
    colors[offset] = r;
    colors[offset + 1] = g;
    colors[offset + 2] = b;
  }

  return colors;
};

// ============================================================================
// SCALAR FIELD COLORS (Generic)
// ============================================================================

/**
 * Build vertex colors from any scalar field with custom gradient
 * Generic function for any per-vertex scalar visualization
 */
export const buildScalarFieldColors = (
  mesh: RenderMesh,
  scalarField: number[],
  gradient: GradientStop[] = VIRIDIS_GRADIENT
): number[] | null => {
  const vertexCount = Math.floor(mesh.positions.length / 3);
  if (vertexCount === 0 || scalarField.length === 0) return null;

  if (scalarField.length !== vertexCount) {
    console.warn(`Scalar field length (${scalarField.length}) doesn't match vertex count (${vertexCount})`);
    return null;
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < vertexCount; i += 1) {
    const value = scalarField[i];
    if (!Number.isFinite(value)) continue;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  const range = Math.max(1e-9, max - min);
  const colors = new Array<number>(vertexCount * 3).fill(0);

  for (let i = 0; i < vertexCount; i += 1) {
    const value = scalarField[i];
    const normalized = Number.isFinite(value) ? clamp01((value - min) / range) : 0;
    const [r, g, b] = sampleGradient(gradient, normalized);
    const offset = i * 3;
    colors[offset] = r;
    colors[offset + 1] = g;
    colors[offset + 2] = b;
  }

  return colors;
};
