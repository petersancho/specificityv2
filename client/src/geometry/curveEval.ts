import type { NURBSCurve, Vec3 } from "../types";
import { evaluateCurveDerivative, evaluateCurvePoint } from "./nurbs";
import { tessellateCurveAdaptive, type TessellationOptions } from "./tessellation";

export const evaluateAt = (curve: NURBSCurve, u: number): Vec3 =>
  evaluateCurvePoint(curve, u);

export const evaluateTangent = (curve: NURBSCurve, u: number): Vec3 => {
  const derivatives = evaluateCurveDerivative(curve, u, 1);
  return derivatives[0] ?? { x: 0, y: 0, z: 0 };
};

export const tessellate = (
  curve: NURBSCurve,
  options: TessellationOptions = {}
): Vec3[] => tessellateCurveAdaptive(curve, options).points;

export const tessellateWithParameters = (
  curve: NURBSCurve,
  options: TessellationOptions = {}
) => tessellateCurveAdaptive(curve, options);
