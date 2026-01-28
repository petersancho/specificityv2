import type { Vec3 } from "../types";
import type { NURBSCurve, NURBSSurface } from "./nurbs";
import {
  computeCurveCurvature,
  computeSurfaceCurvature,
  evaluateCurvePoint,
  evaluateSurfaceDerivatives,
  evaluateSurfacePoint,
} from "./nurbs";
import { cross, normalize } from "./math";

export type TessellatedCurve = {
  points: Vec3[];
  parameters: number[];
};

export type TessellatedSurface = {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
  uvs: Float32Array;
};

export type TessellationOptions = {
  maxSegmentLength?: number;
  maxAngle?: number;
  minSamples?: number;
  maxSamples?: number;
  curvatureTolerance?: number;
};

const DEFAULT_OPTIONS: Required<TessellationOptions> = {
  maxSegmentLength: 1.0,
  maxAngle: 0.1,
  minSamples: 8,
  maxSamples: 1024,
  curvatureTolerance: 0.01,
};

export function tessellateCurveAdaptive(
  curve: NURBSCurve,
  options: TessellationOptions = {}
): TessellatedCurve {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { knots, degree } = curve;

  const uMin = knots[degree];
  const uMax = knots[knots.length - degree - 1];

  const points: Vec3[] = [];
  const parameters: number[] = [];

  function subdivide(u0: number, u1: number, p0: Vec3, p1: Vec3, depth: number): void {
    if (depth > 20 || parameters.length >= opts.maxSamples) {
      return;
    }

    const uMid = (u0 + u1) * 0.5;
    const pMid = evaluateCurvePoint(curve, uMid);

    const d0x = pMid.x - p0.x;
    const d0y = pMid.y - p0.y;
    const d0z = pMid.z - p0.z;
    const dist0 = Math.sqrt(d0x * d0x + d0y * d0y + d0z * d0z);

    const d1x = p1.x - pMid.x;
    const d1y = p1.y - pMid.y;
    const d1z = p1.z - pMid.z;
    const dist1 = Math.sqrt(d1x * d1x + d1y * d1y + d1z * d1z);

    const chordX = p1.x - p0.x;
    const chordY = p1.y - p0.y;
    const chordZ = p1.z - p0.z;
    const chordLength = Math.sqrt(chordX * chordX + chordY * chordY + chordZ * chordZ);

    const deviation = dist0 + dist1 - chordLength;

    const curvature0 = computeCurveCurvature(curve, u0);
    const curvature1 = computeCurveCurvature(curve, u1);
    const maxCurvature = Math.max(curvature0, curvature1);

    const needsSubdivision =
      deviation > opts.curvatureTolerance ||
      chordLength > opts.maxSegmentLength ||
      maxCurvature > opts.curvatureTolerance;

    if (needsSubdivision) {
      subdivide(u0, uMid, p0, pMid, depth + 1);
      points.push(pMid);
      parameters.push(uMid);
      subdivide(uMid, u1, pMid, p1, depth + 1);
    }
  }

  const initialSamples = Math.max(opts.minSamples, 8);
  const step = (uMax - uMin) / (initialSamples - 1);

  for (let i = 0; i < initialSamples; i++) {
    const u = uMin + i * step;
    const p = evaluateCurvePoint(curve, u);
    points.push(p);
    parameters.push(u);
  }

  const refinedPoints: Vec3[] = [points[0]];
  const refinedParams: number[] = [parameters[0]];

  for (let i = 0; i < points.length - 1; i++) {
    subdivide(
      parameters[i],
      parameters[i + 1],
      points[i],
      points[i + 1],
      0
    );
    refinedPoints.push(points[i + 1]);
    refinedParams.push(parameters[i + 1]);
  }

  return {
    points: refinedPoints,
    parameters: refinedParams,
  };
}

export function tessellateCurveUniform(
  curve: NURBSCurve,
  numSamples: number = 64
): TessellatedCurve {
  const { knots, degree } = curve;
  const uMin = knots[degree];
  const uMax = knots[knots.length - degree - 1];

  const points: Vec3[] = [];
  const parameters: number[] = [];

  for (let i = 0; i < numSamples; i++) {
    const u = uMin + (i / (numSamples - 1)) * (uMax - uMin);
    const p = evaluateCurvePoint(curve, u);
    points.push(p);
    parameters.push(u);
  }

  return { points, parameters };
}

export function tessellateSurfaceAdaptive(
  surface: NURBSSurface,
  options: TessellationOptions = {}
): TessellatedSurface {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { knotsU, knotsV, degreeU, degreeV } = surface;

  const uMin = knotsU[degreeU];
  const uMax = knotsU[knotsU.length - degreeU - 1];
  const vMin = knotsV[degreeV];
  const vMax = knotsV[knotsV.length - degreeV - 1];

  const uMid = (uMin + uMax) * 0.5;
  const vMid = (vMin + vMax) * 0.5;

  const lengthU = computePolylineLength([
    evaluateSurfacePoint(surface, uMin, vMid),
    evaluateSurfacePoint(surface, uMax, vMid),
  ]);
  const lengthV = computePolylineLength([
    evaluateSurfacePoint(surface, uMid, vMin),
    evaluateSurfacePoint(surface, uMid, vMax),
  ]);

  const curvatureSamplesU = [uMin, uMid, uMax];
  const curvatureSamplesV = [vMin, vMid, vMax];
  let maxCurvature = 0;

  for (const u of curvatureSamplesU) {
    for (const v of curvatureSamplesV) {
      const derivatives = evaluateSurfaceDerivatives(surface, u, v, 2);
      if (!derivatives.duu || !derivatives.duv || !derivatives.dvv) continue;
      const curvature = computeSurfaceCurvature(
        derivatives.du,
        derivatives.dv,
        derivatives.duu,
        derivatives.duv,
        derivatives.dvv
      );
      const localMax = Math.max(Math.abs(curvature.k1), Math.abs(curvature.k2));
      if (localMax > maxCurvature) {
        maxCurvature = localMax;
      }
    }
  }

  const curvatureBound = maxCurvature > 1e-8 ? maxCurvature : 0;
  const curvatureSegment =
    curvatureBound > 0
      ? Math.sqrt((8 * opts.curvatureTolerance) / curvatureBound)
      : opts.maxSegmentLength;
  const targetSegment = Math.min(opts.maxSegmentLength, curvatureSegment);

  const divisionsU = Math.max(
    opts.minSamples,
    Math.min(opts.maxSamples, Math.ceil(lengthU / Math.max(targetSegment, 1e-6)))
  );
  const divisionsV = Math.max(
    opts.minSamples,
    Math.min(opts.maxSamples, Math.ceil(lengthV / Math.max(targetSegment, 1e-6)))
  );

  const uStep = (uMax - uMin) / divisionsU;
  const vStep = (vMax - vMin) / divisionsV;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= divisionsU; i++) {
    const u = uMin + i * uStep;
    for (let j = 0; j <= divisionsV; j++) {
      const v = vMin + j * vStep;
      const p = evaluateSurfacePoint(surface, u, v);
      positions.push(p.x, p.y, p.z);

      const { du, dv } = evaluateSurfaceDerivatives(surface, u, v, 1);
      const normal = normalize(cross(du, dv));

      normals.push(normal.x, normal.y, normal.z);
      uvs.push(i / divisionsU, j / divisionsV);
    }
  }

  for (let i = 0; i < divisionsU; i++) {
    for (let j = 0; j < divisionsV; j++) {
      const idx0 = i * (divisionsV + 1) + j;
      const idx1 = idx0 + 1;
      const idx2 = (i + 1) * (divisionsV + 1) + j;
      const idx3 = idx2 + 1;

      indices.push(idx0, idx2, idx1);
      indices.push(idx1, idx2, idx3);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
    uvs: new Float32Array(uvs),
  };
}

export function tessellateSurfaceUniform(
  surface: NURBSSurface,
  divisionsU: number = 32,
  divisionsV: number = 32
): TessellatedSurface {
  const { knotsU, knotsV, degreeU, degreeV } = surface;

  const uMin = knotsU[degreeU];
  const uMax = knotsU[knotsU.length - degreeU - 1];
  const vMin = knotsV[degreeV];
  const vMax = knotsV[knotsV.length - degreeV - 1];

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= divisionsU; i++) {
    const u = uMin + (i / divisionsU) * (uMax - uMin);
    for (let j = 0; j <= divisionsV; j++) {
      const v = vMin + (j / divisionsV) * (vMax - vMin);
      const { point, du, dv } = evaluateSurfaceDerivatives(surface, u, v);
      positions.push(point.x, point.y, point.z);
      const normal = normalize(cross(du, dv));
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(i / divisionsU, j / divisionsV);
    }
  }

  for (let i = 0; i < divisionsU; i++) {
    for (let j = 0; j < divisionsV; j++) {
      const idx0 = i * (divisionsV + 1) + j;
      const idx1 = idx0 + 1;
      const idx2 = (i + 1) * (divisionsV + 1) + j;
      const idx3 = idx2 + 1;

      indices.push(idx0, idx2, idx1);
      indices.push(idx1, idx2, idx3);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
    uvs: new Float32Array(uvs),
  };
}

export function computePolylineLength(points: Vec3[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const dz = points[i].z - points[i - 1].z;
    length += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  return length;
}
