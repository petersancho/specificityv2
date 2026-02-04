import type { RenderMesh } from "../../../types";
import type { DensityField } from "./geometryGeneratorV2";
import {
  buildNodeFieldFromElements,
  applyHeavisideProjection,
  resampleNodeField,
  scheduleBeta,
  filterNodeField,
} from "./fieldProcessing";
import { marchingCubes } from "./marchingCubes";
import { applyTaubinSmoothing, type TaubinSmoothingOptions } from "./meshSmoothing";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export type IsosurfaceOptions = {
  filterRadius?: number;
  iter?: number;
  rampIters?: number;
  betaStart?: number;
  betaEnd?: number;
  eta?: number;
  refineFactor?: number;
  smoothing?: TaubinSmoothingOptions;
};

export const generateIsosurfaceMeshFromDensities = (
  field: DensityField,
  isoValue: number,
  options: IsosurfaceOptions = {}
): RenderMesh => {
  const safeIso = clamp01(isoValue);
  const nodeField = buildNodeFieldFromElements(
    field.densities,
    field.nx,
    field.ny,
    field.nz,
    field.bounds
  );

  const filtered = options.filterRadius
    ? filterNodeField(nodeField, options.filterRadius)
    : nodeField;

  const rampIters = Math.max(1, options.rampIters ?? 1);
  const iter = options.iter ?? rampIters;
  const beta = scheduleBeta(
    iter,
    rampIters,
    options.betaStart ?? 2,
    options.betaEnd ?? 16
  );
  const eta = options.eta ?? 0.5;

  const projected = applyHeavisideProjection(filtered, beta, eta);
  const refined = resampleNodeField(projected, options.refineFactor ?? 1);

  const mesh = marchingCubes(refined, safeIso);

  if (options.smoothing && options.smoothing.iterations > 0) {
    return applyTaubinSmoothing(mesh, options.smoothing);
  }

  return mesh;
};
