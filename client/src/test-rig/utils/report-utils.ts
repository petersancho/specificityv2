/**
 * Shared report utilities for solver test rigs
 */

export function safeFinite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export interface ScalarSummary {
  min: number;
  max: number;
  mean: number;
  rms: number;
  count: number;
}

export function summarizeScalarSeries(
  values: ArrayLike<number> | null | undefined
): ScalarSummary {
  if (!values || values.length === 0) {
    return { min: 0, max: 0, mean: 0, rms: 0, count: 0 };
  }

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    if (!Number.isFinite(val)) continue;
    
    if (val < min) min = val;
    if (val > max) max = val;
    sum += val;
    sumSq += val * val;
    count++;
  }

  if (count === 0) {
    return { min: 0, max: 0, mean: 0, rms: 0, count: 0 };
  }

  const mean = sum / count;
  const rms = Math.sqrt(sumSq / count);

  return {
    min: safeFinite(min),
    max: safeFinite(max),
    mean: safeFinite(mean),
    rms: safeFinite(rms),
    count,
  };
}
