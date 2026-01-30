import type { RenderMesh } from "../types";

type RGB = [number, number, number];

type GradientStop = {
  t: number;
  color: RGB;
};

const STRESS_GRADIENT: GradientStop[] = [
  { t: 0, color: [0.12, 0.22, 0.66] },
  { t: 0.25, color: [0.0, 0.62, 0.86] },
  { t: 0.55, color: [0.98, 0.86, 0.35] },
  { t: 0.78, color: [0.98, 0.55, 0.2] },
  { t: 1, color: [0.86, 0.12, 0.16] },
];

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

const sampleGradient = (t: number): RGB => {
  const clamped = clamp01(t);
  for (let i = 0; i < STRESS_GRADIENT.length - 1; i += 1) {
    const current = STRESS_GRADIENT[i];
    const next = STRESS_GRADIENT[i + 1];
    if (clamped >= current.t && clamped <= next.t) {
      const span = Math.max(1e-6, next.t - current.t);
      const local = (clamped - current.t) / span;
      return mix(current.color, next.color, local);
    }
  }
  return STRESS_GRADIENT[STRESS_GRADIENT.length - 1].color;
};

const buildVertexStress = (mesh: RenderMesh, stressField: number[]) => {
  const vertexCount = Math.floor(mesh.positions.length / 3);
  if (vertexCount === 0 || stressField.length === 0) return null;

  const values = new Array<number>(vertexCount).fill(0);
  const counts = new Array<number>(vertexCount).fill(0);

  if (stressField.length === vertexCount) {
    for (let i = 0; i < vertexCount; i += 1) {
      const value = stressField[i];
      if (!Number.isFinite(value)) continue;
      values[i] = value;
      counts[i] = 1;
    }
    return { values, counts };
  }

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
        if (ia != null) {
          values[ia] += value;
          counts[ia] += 1;
        }
        if (ib != null) {
          values[ib] += value;
          counts[ib] += 1;
        }
        if (ic != null) {
          values[ic] += value;
          counts[ic] += 1;
        }
      }
      return { values, counts };
    }
  }

  return null;
};

export const buildStressVertexColors = (
  mesh: RenderMesh,
  stressField: number[]
): number[] | null => {
  const resolved = buildVertexStress(mesh, stressField);
  if (!resolved) return null;

  const { values, counts } = resolved;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

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

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    const normalized = counts[i] === 0 ? 0 : clamp01((value - min) / range);
    const [r, g, b] = sampleGradient(normalized);
    const offset = i * 3;
    colors[offset] = r;
    colors[offset + 1] = g;
    colors[offset + 2] = b;
  }

  return colors;
};
