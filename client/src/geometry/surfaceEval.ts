import type { NURBSSurface, Vec3 } from "../types";
import { evaluateSurfaceDerivatives, evaluateSurfacePoint } from "./nurbs";
import { cross, normalize } from "./math";
import { tessellateSurfaceAdaptive, type TessellationOptions } from "./tessellation";

export const evaluateAt = (surface: NURBSSurface, u: number, v: number): Vec3 =>
  evaluateSurfacePoint(surface, u, v);

export const evaluateNormal = (
  surface: NURBSSurface,
  u: number,
  v: number
): Vec3 => {
  const { du, dv } = evaluateSurfaceDerivatives(surface, u, v, 1);
  return normalize(cross(du, dv));
};

export const tessellate = (
  surface: NURBSSurface,
  options: TessellationOptions = {}
) => tessellateSurfaceAdaptive(surface, options);
