import type { Vec3 } from "../types";

export type NURBSCurve = {
  controlPoints: Vec3[];
  knots: number[];
  degree: number;
  weights?: number[];
};

export type NURBSSurface = {
  controlPoints: Vec3[][];
  knotsU: number[];
  knotsV: number[];
  degreeU: number;
  degreeV: number;
  weights?: number[][];
};

export function validateKnotVector(knots: number[], degree: number, numControlPoints: number): boolean {
  const expectedLength = numControlPoints + degree + 1;
  if (knots.length !== expectedLength) {
    return false;
  }

  for (let i = 1; i < knots.length; i++) {
    if (knots[i] < knots[i - 1]) {
      return false;
    }
  }

  return true;
}

export function findKnotSpan(knots: number[], degree: number, u: number, numControlPoints: number): number {
  const n = numControlPoints - 1;

  if (u >= knots[n + 1]) {
    return n;
  }

  if (u <= knots[degree]) {
    return degree;
  }

  let low = degree;
  let high = n + 1;
  let mid = Math.floor((low + high) / 2);

  while (u < knots[mid] || u >= knots[mid + 1]) {
    if (u < knots[mid]) {
      high = mid;
    } else {
      low = mid;
    }
    mid = Math.floor((low + high) / 2);
  }

  return mid;
}

export function basisFunction(i: number, p: number, u: number, knots: number[]): number {
  const N: number[][] = [];
  for (let j = 0; j <= p; j++) {
    N[j] = [];
  }

  N[0][i] = 1.0;

  for (let k = 1; k <= p; k++) {
    for (let j = i - k; j <= i; j++) {
      if (j < 0 || j >= knots.length - 1) {
        N[k][j] = 0;
        continue;
      }

      let left = 0.0;
      if (j >= 0 && N[k - 1][j] !== undefined) {
        const denomLeft = knots[j + k] - knots[j];
        if (Math.abs(denomLeft) > 1e-10) {
          left = ((u - knots[j]) / denomLeft) * N[k - 1][j];
        }
      }

      let right = 0.0;
      if (j + 1 < knots.length && N[k - 1][j + 1] !== undefined) {
        const denomRight = knots[j + k + 1] - knots[j + 1];
        if (Math.abs(denomRight) > 1e-10) {
          right = ((knots[j + k + 1] - u) / denomRight) * N[k - 1][j + 1];
        }
      }

      N[k][j] = left + right;
    }
  }

  return N[p][i] || 0;
}

export function basisFunctions(span: number, u: number, p: number, knots: number[]): number[] {
  const N: number[] = new Array(p + 1);
  const left: number[] = new Array(p + 1);
  const right: number[] = new Array(p + 1);

  N[0] = 1.0;

  for (let j = 1; j <= p; j++) {
    left[j] = u - knots[span + 1 - j];
    right[j] = knots[span + j] - u;
    let saved = 0.0;

    for (let r = 0; r < j; r++) {
      const temp = N[r] / (right[r + 1] + left[j - r]);
      N[r] = saved + right[r + 1] * temp;
      saved = left[j - r] * temp;
    }

    N[j] = saved;
  }

  return N;
}

export function evaluateCurvePoint(curve: NURBSCurve, u: number): Vec3 {
  const { controlPoints, knots, degree, weights } = curve;
  const n = controlPoints.length - 1;

  if (!validateKnotVector(knots, degree, controlPoints.length)) {
    throw new Error("Invalid knot vector");
  }

  const span = findKnotSpan(knots, degree, u, controlPoints.length);
  const N = basisFunctions(span, u, degree, knots);

  let point: Vec3 = { x: 0, y: 0, z: 0 };
  let w = 0;

  for (let i = 0; i <= degree; i++) {
    const cpIndex = span - degree + i;
    if (cpIndex < 0 || cpIndex >= controlPoints.length) continue;

    const cp = controlPoints[cpIndex];
    const weight = weights ? weights[cpIndex] : 1.0;
    const basis = N[i] * weight;

    point.x += cp.x * basis;
    point.y += cp.y * basis;
    point.z += cp.z * basis;
    w += basis;
  }

  if (Math.abs(w) > 1e-10) {
    point.x /= w;
    point.y /= w;
    point.z /= w;
  }

  return point;
}

export function evaluateCurveDerivative(curve: NURBSCurve, u: number, order: number = 1): Vec3[] {
  const { controlPoints, knots, degree } = curve;
  const span = findKnotSpan(knots, degree, u, controlPoints.length);

  const derivatives: Vec3[] = [];
  for (let i = 0; i <= order; i++) {
    derivatives[i] = { x: 0, y: 0, z: 0 };
  }

  const ndu: number[][] = [];
  for (let i = 0; i <= degree; i++) {
    ndu[i] = new Array(degree + 1).fill(0);
  }
  ndu[0][0] = 1.0;

  const left: number[] = new Array(degree + 1);
  const right: number[] = new Array(degree + 1);

  for (let j = 1; j <= degree; j++) {
    left[j] = u - knots[span + 1 - j];
    right[j] = knots[span + j] - u;
    let saved = 0.0;

    for (let r = 0; r < j; r++) {
      ndu[j][r] = right[r + 1] + left[j - r];
      const temp = ndu[r][j - 1] / ndu[j][r];
      ndu[r][j] = saved + right[r + 1] * temp;
      saved = left[j - r] * temp;
    }

    ndu[j][j] = saved;
  }

  for (let j = 0; j <= degree; j++) {
    const cpIndex = span - degree + j;
    if (cpIndex >= 0 && cpIndex < controlPoints.length) {
      const cp = controlPoints[cpIndex];
      derivatives[0].x += ndu[j][degree] * cp.x;
      derivatives[0].y += ndu[j][degree] * cp.y;
      derivatives[0].z += ndu[j][degree] * cp.z;
    }
  }

  return derivatives;
}

export function evaluateSurfacePoint(surface: NURBSSurface, u: number, v: number): Vec3 {
  const { controlPoints, knotsU, knotsV, degreeU, degreeV, weights } = surface;

  const spanU = findKnotSpan(knotsU, degreeU, u, controlPoints.length);
  const spanV = findKnotSpan(knotsV, degreeV, v, controlPoints[0].length);

  const Nu = basisFunctions(spanU, u, degreeU, knotsU);
  const Nv = basisFunctions(spanV, v, degreeV, knotsV);

  let point: Vec3 = { x: 0, y: 0, z: 0 };
  let w = 0;

  for (let i = 0; i <= degreeU; i++) {
    const uIndex = spanU - degreeU + i;
    if (uIndex < 0 || uIndex >= controlPoints.length) continue;

    for (let j = 0; j <= degreeV; j++) {
      const vIndex = spanV - degreeV + j;
      if (vIndex < 0 || vIndex >= controlPoints[uIndex].length) continue;

      const cp = controlPoints[uIndex][vIndex];
      const weight = weights ? weights[uIndex][vIndex] : 1.0;
      const basis = Nu[i] * Nv[j] * weight;

      point.x += cp.x * basis;
      point.y += cp.y * basis;
      point.z += cp.z * basis;
      w += basis;
    }
  }

  if (Math.abs(w) > 1e-10) {
    point.x /= w;
    point.y /= w;
    point.z /= w;
  }

  return point;
}

export function computeCurveTangent(curve: NURBSCurve, u: number): Vec3 {
  const derivatives = evaluateCurveDerivative(curve, u, 1);
  const tangent = derivatives[0];
  const length = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y + tangent.z * tangent.z);

  if (length > 1e-10) {
    return {
      x: tangent.x / length,
      y: tangent.y / length,
      z: tangent.z / length,
    };
  }

  return { x: 0, y: 0, z: 1 };
}

export function computeCurveCurvature(curve: NURBSCurve, u: number): number {
  const derivatives = evaluateCurveDerivative(curve, u, 2);
  const d1 = derivatives[0];
  const d2 = derivatives[1] || { x: 0, y: 0, z: 0 };

  const crossX = d1.y * d2.z - d1.z * d2.y;
  const crossY = d1.z * d2.x - d1.x * d2.z;
  const crossZ = d1.x * d2.y - d1.y * d2.x;
  const crossMag = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);

  const d1Mag = Math.sqrt(d1.x * d1.x + d1.y * d1.y + d1.z * d1.z);

  if (d1Mag < 1e-10) return 0;

  return crossMag / Math.pow(d1Mag, 3);
}
