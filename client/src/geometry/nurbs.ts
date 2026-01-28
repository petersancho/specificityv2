import type { NURBSCurve, NURBSSurface, Vec3 } from "../types";

export type { NURBSCurve, NURBSSurface };

export type CurveParameterization = "uniform" | "chord" | "centripetal";

export function createNurbsCurveFromPoints(
  points: Vec3[],
  degree: number,
  closed = false
): NURBSCurve {
  if (points.length === 0) {
    return { controlPoints: [], knots: [], degree: 1 };
  }

  const basePoints = closed
    ? (() => {
        const first = points[0];
        const last = points[points.length - 1];
        const isClosed =
          Math.abs(first.x - last.x) < 1e-6 &&
          Math.abs(first.y - last.y) < 1e-6 &&
          Math.abs(first.z - last.z) < 1e-6;
        return isClosed ? points : [...points, { ...first }];
      })()
    : points;

  const maxDegree = Math.max(1, Math.min(3, basePoints.length - 1));
  const resolvedDegree = Math.min(Math.max(1, degree), maxDegree);
  const n = basePoints.length;
  const knotCount = n + resolvedDegree + 1;
  const knots: number[] = [];

  for (let i = 0; i <= resolvedDegree; i += 1) {
    knots.push(0);
  }
  const interiorCount = knotCount - 2 * (resolvedDegree + 1);
  for (let i = 1; i <= interiorCount; i += 1) {
    knots.push(i / (interiorCount + 1));
  }
  for (let i = 0; i <= resolvedDegree; i += 1) {
    knots.push(1);
  }

  return {
    controlPoints: basePoints,
    knots,
    degree: resolvedDegree,
  };
}

const buildCurveParameters = (
  points: Vec3[],
  method: CurveParameterization
): number[] => {
  const count = points.length;
  if (count === 0) return [];
  if (count === 1) return [0];

  if (method === "uniform") {
    return points.map((_, index) => index / (count - 1));
  }

  const alpha = method === "centripetal" ? 0.5 : 1.0;
  const params: number[] = [0];
  let total = 0;
  for (let i = 1; i < count; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const dz = points[i].z - points[i - 1].z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const step = Math.pow(Math.max(dist, 1e-8), alpha);
    total += step;
    params.push(total);
  }

  if (total <= 1e-8) {
    return points.map((_, index) => index / (count - 1));
  }

  return params.map((value) => value / total);
};

const buildAveragedKnotVector = (parameters: number[], degree: number): number[] => {
  const n = parameters.length - 1;
  const m = n + degree + 1;
  const knots = new Array(m + 1).fill(0);

  for (let i = 0; i <= degree; i += 1) {
    knots[i] = 0;
    knots[m - i] = 1;
  }

  for (let j = 1; j <= n - degree; j += 1) {
    let sum = 0;
    for (let i = j; i <= j + degree - 1; i += 1) {
      sum += parameters[i];
    }
    knots[j + degree] = sum / degree;
  }

  return knots;
};

const solveLinearSystemMultiple = (
  matrix: number[][],
  rhs: number[][]
): number[][] | null => {
  const size = matrix.length;
  if (size === 0) return [];
  const rhsCount = rhs[0]?.length ?? 0;
  const augmented = matrix.map((row, rowIndex) => [
    ...row,
    ...(rhs[rowIndex] ?? new Array(rhsCount).fill(0)),
  ]);

  const totalCols = size + rhsCount;

  for (let col = 0; col < size; col += 1) {
    let pivot = col;
    let max = Math.abs(augmented[col][col]);
    for (let row = col + 1; row < size; row += 1) {
      const value = Math.abs(augmented[row][col]);
      if (value > max) {
        max = value;
        pivot = row;
      }
    }

    if (max < 1e-12) return null;

    if (pivot !== col) {
      const temp = augmented[col];
      augmented[col] = augmented[pivot];
      augmented[pivot] = temp;
    }

    const pivotValue = augmented[col][col];
    for (let j = col; j < totalCols; j += 1) {
      augmented[col][j] /= pivotValue;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === col) continue;
      const factor = augmented[row][col];
      if (Math.abs(factor) < 1e-12) continue;
      for (let j = col; j < totalCols; j += 1) {
        augmented[row][j] -= factor * augmented[col][j];
      }
    }
  }

  return augmented.map((row) => row.slice(size));
};

export function interpolateNurbsCurve(
  points: Vec3[],
  degree: number,
  options?: { parameterization?: CurveParameterization }
): NURBSCurve {
  if (points.length === 0) {
    return { controlPoints: [], knots: [], degree: 1 };
  }

  const maxDegree = Math.max(1, Math.min(3, points.length - 1));
  const resolvedDegree = Math.min(Math.max(1, degree), maxDegree);

  if (points.length <= resolvedDegree) {
    return createNurbsCurveFromPoints(points, resolvedDegree, false);
  }

  const parameters = buildCurveParameters(
    points,
    options?.parameterization ?? "chord"
  );
  const knots = buildAveragedKnotVector(parameters, resolvedDegree);
  const n = points.length - 1;

  const matrix: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 0; i <= n; i += 1) {
    const u = parameters[i];
    const span = findKnotSpan(knots, resolvedDegree, u, n + 1);
    const basis = basisFunctions(span, u, resolvedDegree, knots);
    for (let j = 0; j <= resolvedDegree; j += 1) {
      const column = span - resolvedDegree + j;
      if (column >= 0 && column <= n) {
        matrix[i][column] = basis[j];
      }
    }
  }

  const rhs = points.map((point) => [point.x, point.y, point.z]);
  const solution = solveLinearSystemMultiple(matrix, rhs);
  if (!solution) {
    return createNurbsCurveFromPoints(points, resolvedDegree, false);
  }

  const controlPoints = solution.map(([x, y, z]) => ({ x, y, z }));
  return { controlPoints, knots, degree: resolvedDegree };
}

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

type Vec4 = { x: number; y: number; z: number; w: number };

const binomialCoefficient = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 1; i <= k; i += 1) {
    result *= (n - (k - i));
    result /= i;
  }
  return result;
};

export function dersBasisFunctions(
  span: number,
  u: number,
  degree: number,
  order: number,
  knots: number[]
): number[][] {
  const du = Math.min(order, degree);
  const ndu: number[][] = [];
  for (let i = 0; i <= degree; i += 1) {
    ndu[i] = new Array(degree + 1).fill(0);
  }

  const left: number[] = new Array(degree + 1).fill(0);
  const right: number[] = new Array(degree + 1).fill(0);

  ndu[0][0] = 1.0;

  for (let j = 1; j <= degree; j += 1) {
    left[j] = u - knots[span + 1 - j];
    right[j] = knots[span + j] - u;
    let saved = 0.0;

    for (let r = 0; r < j; r += 1) {
      ndu[j][r] = right[r + 1] + left[j - r];
      const temp = ndu[r][j - 1] / ndu[j][r];
      ndu[r][j] = saved + right[r + 1] * temp;
      saved = left[j - r] * temp;
    }

    ndu[j][j] = saved;
  }

  const ders: number[][] = [];
  for (let k = 0; k <= du; k += 1) {
    ders[k] = new Array(degree + 1).fill(0);
  }

  for (let j = 0; j <= degree; j += 1) {
    ders[0][j] = ndu[j][degree];
  }

  const a: number[][] = [
    new Array(degree + 1).fill(0),
    new Array(degree + 1).fill(0),
  ];

  for (let r = 0; r <= degree; r += 1) {
    let s1 = 0;
    let s2 = 1;
    a[0][0] = 1.0;

    for (let k = 1; k <= du; k += 1) {
      let d = 0.0;
      const rk = r - k;
      const pk = degree - k;

      if (r >= k) {
        a[s2][0] = a[s1][0] / ndu[pk + 1][rk];
        d = a[s2][0] * ndu[rk][pk];
      }

      const j1 = rk >= -1 ? 1 : -rk;
      const j2 = r - 1 <= pk ? k - 1 : degree - r;

      for (let j = j1; j <= j2; j += 1) {
        a[s2][j] = (a[s1][j] - a[s1][j - 1]) / ndu[pk + 1][rk + j];
        d += a[s2][j] * ndu[rk + j][pk];
      }

      if (r <= pk) {
        a[s2][k] = -a[s1][k - 1] / ndu[pk + 1][r];
        d += a[s2][k] * ndu[r][pk];
      }

      ders[k][r] = d;

      const temp = s1;
      s1 = s2;
      s2 = temp;
    }
  }

  let factor = 1;
  for (let k = 1; k <= du; k += 1) {
    factor *= degree - k + 1;
    for (let j = 0; j <= degree; j += 1) {
      ders[k][j] *= factor;
    }
  }

  return ders;
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

export function evaluateCurveDerivative(
  curve: NURBSCurve,
  u: number,
  order: number = 1
): Vec3[] {
  const { controlPoints, knots, degree, weights } = curve;
  if (controlPoints.length === 0) return [];
  if (!validateKnotVector(knots, degree, controlPoints.length)) {
    throw new Error("Invalid knot vector");
  }

  const n = controlPoints.length - 1;
  const uClamped = Math.max(knots[degree], Math.min(u, knots[n + 1]));
  const span = findKnotSpan(knots, degree, uClamped, controlPoints.length);
  const du = Math.min(order, degree);
  const ders = dersBasisFunctions(span, uClamped, degree, du, knots);

  if (!weights) {
    const derivatives: Vec3[] = [];
    for (let k = 1; k <= du; k += 1) {
      let dx = 0;
      let dy = 0;
      let dz = 0;
      for (let j = 0; j <= degree; j += 1) {
        const cpIndex = span - degree + j;
        if (cpIndex < 0 || cpIndex >= controlPoints.length) continue;
        const cp = controlPoints[cpIndex];
        const basis = ders[k][j];
        dx += cp.x * basis;
        dy += cp.y * basis;
        dz += cp.z * basis;
      }
      derivatives.push({ x: dx, y: dy, z: dz });
    }
    return derivatives;
  }

  const cw: Vec4[] = [];
  for (let k = 0; k <= du; k += 1) {
    cw[k] = { x: 0, y: 0, z: 0, w: 0 };
    for (let j = 0; j <= degree; j += 1) {
      const cpIndex = span - degree + j;
      if (cpIndex < 0 || cpIndex >= controlPoints.length) continue;
      const cp = controlPoints[cpIndex];
      const weight = weights[cpIndex] ?? 1.0;
      const basis = ders[k][j];
      cw[k].x += cp.x * weight * basis;
      cw[k].y += cp.y * weight * basis;
      cw[k].z += cp.z * weight * basis;
      cw[k].w += weight * basis;
    }
  }

  const derivatives: Vec3[] = [];
  const point = cw[0];
  const w0 = Math.abs(point.w) > 1e-10 ? point.w : 1.0;
  const cartesian: Vec3[] = new Array(du + 1).fill(0).map(() => ({
    x: 0,
    y: 0,
    z: 0,
  }));

  cartesian[0] = { x: point.x / w0, y: point.y / w0, z: point.z / w0 };

  for (let k = 1; k <= du; k += 1) {
    let vx = cw[k].x;
    let vy = cw[k].y;
    let vz = cw[k].z;
    for (let i = 1; i <= k; i += 1) {
      const binom = binomialCoefficient(k, i);
      const wDer = cw[i].w;
      vx -= binom * wDer * cartesian[k - i].x;
      vy -= binom * wDer * cartesian[k - i].y;
      vz -= binom * wDer * cartesian[k - i].z;
    }
    cartesian[k] = { x: vx / w0, y: vy / w0, z: vz / w0 };
  }

  for (let k = 1; k <= du; k += 1) {
    derivatives.push(cartesian[k]);
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

export function evaluateSurfaceDerivatives(
  surface: NURBSSurface,
  u: number,
  v: number,
  order: 1 | 2 = 1
): { point: Vec3; du: Vec3; dv: Vec3; duu?: Vec3; duv?: Vec3; dvv?: Vec3 } {
  const { controlPoints, knotsU, knotsV, degreeU, degreeV, weights } = surface;

  const uClamped = Math.max(
    knotsU[degreeU],
    Math.min(u, knotsU[knotsU.length - degreeU - 1])
  );
  const vClamped = Math.max(
    knotsV[degreeV],
    Math.min(v, knotsV[knotsV.length - degreeV - 1])
  );

  const spanU = findKnotSpan(knotsU, degreeU, uClamped, controlPoints.length);
  const spanV = findKnotSpan(knotsV, degreeV, vClamped, controlPoints[0].length);

  const duOrder = Math.min(order, degreeU);
  const dvOrder = Math.min(order, degreeV);

  const Nu = dersBasisFunctions(spanU, uClamped, degreeU, duOrder, knotsU);
  const Nv = dersBasisFunctions(spanV, vClamped, degreeV, dvOrder, knotsV);

  const Sw: Vec4[][] = Array.from({ length: duOrder + 1 }, () =>
    Array.from({ length: dvOrder + 1 }, () => ({ x: 0, y: 0, z: 0, w: 0 }))
  );

  for (let i = 0; i <= degreeU; i += 1) {
    const uIndex = spanU - degreeU + i;
    if (uIndex < 0 || uIndex >= controlPoints.length) continue;
    for (let j = 0; j <= degreeV; j += 1) {
      const vIndex = spanV - degreeV + j;
      if (vIndex < 0 || vIndex >= controlPoints[uIndex].length) continue;
      const cp = controlPoints[uIndex][vIndex];
      const weight = weights ? weights[uIndex][vIndex] ?? 1.0 : 1.0;

      for (let ku = 0; ku <= duOrder; ku += 1) {
        const NuVal = Nu[ku][i];
        if (NuVal === 0) continue;
        for (let kv = 0; kv <= dvOrder; kv += 1) {
          const basis = NuVal * Nv[kv][j];
          if (basis === 0) continue;
          const entry = Sw[ku][kv];
          entry.x += cp.x * weight * basis;
          entry.y += cp.y * weight * basis;
          entry.z += cp.z * weight * basis;
          entry.w += weight * basis;
        }
      }
    }
  }

  const w0 = Math.abs(Sw[0][0].w) > 1e-10 ? Sw[0][0].w : 1.0;
  const point = {
    x: Sw[0][0].x / w0,
    y: Sw[0][0].y / w0,
    z: Sw[0][0].z / w0,
  };

  const du = {
    x: (Sw[1]?.[0]?.x ?? 0) - (Sw[1]?.[0]?.w ?? 0) * point.x,
    y: (Sw[1]?.[0]?.y ?? 0) - (Sw[1]?.[0]?.w ?? 0) * point.y,
    z: (Sw[1]?.[0]?.z ?? 0) - (Sw[1]?.[0]?.w ?? 0) * point.z,
  };
  du.x /= w0;
  du.y /= w0;
  du.z /= w0;

  const dv = {
    x: (Sw[0]?.[1]?.x ?? 0) - (Sw[0]?.[1]?.w ?? 0) * point.x,
    y: (Sw[0]?.[1]?.y ?? 0) - (Sw[0]?.[1]?.w ?? 0) * point.y,
    z: (Sw[0]?.[1]?.z ?? 0) - (Sw[0]?.[1]?.w ?? 0) * point.z,
  };
  dv.x /= w0;
  dv.y /= w0;
  dv.z /= w0;

  if (order < 2) {
    return { point, du, dv };
  }

  const wU = Sw[1][0].w;
  const wV = Sw[0][1].w;
  const wUU = Sw[2]?.[0]?.w ?? 0;
  const wUV = Sw[1]?.[1]?.w ?? 0;
  const wVV = Sw[0]?.[2]?.w ?? 0;

  const duu = {
    x: (Sw[2]?.[0]?.x ?? 0) - 2 * wU * du.x - wUU * point.x,
    y: (Sw[2]?.[0]?.y ?? 0) - 2 * wU * du.y - wUU * point.y,
    z: (Sw[2]?.[0]?.z ?? 0) - 2 * wU * du.z - wUU * point.z,
  };
  duu.x /= w0;
  duu.y /= w0;
  duu.z /= w0;

  const duv = {
    x: (Sw[1]?.[1]?.x ?? 0) - wU * dv.x - wV * du.x - wUV * point.x,
    y: (Sw[1]?.[1]?.y ?? 0) - wU * dv.y - wV * du.y - wUV * point.y,
    z: (Sw[1]?.[1]?.z ?? 0) - wU * dv.z - wV * du.z - wUV * point.z,
  };
  duv.x /= w0;
  duv.y /= w0;
  duv.z /= w0;

  const dvv = {
    x: (Sw[0]?.[2]?.x ?? 0) - 2 * wV * dv.x - wVV * point.x,
    y: (Sw[0]?.[2]?.y ?? 0) - 2 * wV * dv.y - wVV * point.y,
    z: (Sw[0]?.[2]?.z ?? 0) - 2 * wV * dv.z - wVV * point.z,
  };
  dvv.x /= w0;
  dvv.y /= w0;
  dvv.z /= w0;

  return { point, du, dv, duu, duv, dvv };
}

export function computeSurfaceCurvature(
  du: Vec3,
  dv: Vec3,
  duu: Vec3,
  duv: Vec3,
  dvv: Vec3
): { mean: number; gaussian: number; k1: number; k2: number } {
  const E = du.x * du.x + du.y * du.y + du.z * du.z;
  const F = du.x * dv.x + du.y * dv.y + du.z * dv.z;
  const G = dv.x * dv.x + dv.y * dv.y + dv.z * dv.z;

  const nx = du.y * dv.z - du.z * dv.y;
  const ny = du.z * dv.x - du.x * dv.z;
  const nz = du.x * dv.y - du.y * dv.x;
  const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (nLen < 1e-10) {
    return { mean: 0, gaussian: 0, k1: 0, k2: 0 };
  }
  const invN = 1 / nLen;
  const n = { x: nx * invN, y: ny * invN, z: nz * invN };

  const L = duu.x * n.x + duu.y * n.y + duu.z * n.z;
  const M = duv.x * n.x + duv.y * n.y + duv.z * n.z;
  const N = dvv.x * n.x + dvv.y * n.y + dvv.z * n.z;

  const denom = E * G - F * F;
  if (Math.abs(denom) < 1e-12) {
    return { mean: 0, gaussian: 0, k1: 0, k2: 0 };
  }

  const gaussian = (L * N - M * M) / denom;
  const mean = (E * N - 2 * F * M + G * L) / (2 * denom);
  const disc = Math.max(0, mean * mean - gaussian);
  const root = Math.sqrt(disc);
  return {
    mean,
    gaussian,
    k1: mean + root,
    k2: mean - root,
  };
}

type Ray = { origin: Vec3; direction: Vec3 };

const solveLinear3x3 = (
  a00: number,
  a01: number,
  a02: number,
  a10: number,
  a11: number,
  a12: number,
  a20: number,
  a21: number,
  a22: number,
  b0: number,
  b1: number,
  b2: number
): { x: number; y: number; z: number } | null => {
  const det =
    a00 * (a11 * a22 - a12 * a21) -
    a01 * (a10 * a22 - a12 * a20) +
    a02 * (a10 * a21 - a11 * a20);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;

  const invDet = 1 / det;

  const x =
    (b0 * (a11 * a22 - a12 * a21) -
      a01 * (b1 * a22 - a12 * b2) +
      a02 * (b1 * a21 - a11 * b2)) *
    invDet;
  const y =
    (a00 * (b1 * a22 - a12 * b2) -
      b0 * (a10 * a22 - a12 * a20) +
      a02 * (a10 * b2 - b1 * a20)) *
    invDet;
  const z =
    (a00 * (a11 * b2 - b1 * a21) -
      a01 * (a10 * b2 - b1 * a20) +
      b0 * (a10 * a21 - a11 * a20)) *
    invDet;

  return { x, y, z };
};

export type SurfaceRayIntersection = {
  point: Vec3;
  u: number;
  v: number;
  t: number;
  converged: boolean;
  iterations: number;
};

export type CurveRayIntersection = {
  point: Vec3;
  u: number;
  t: number;
  converged: boolean;
  iterations: number;
};

export function refineRaySurfaceIntersection(
  surface: NURBSSurface,
  ray: Ray,
  initial: { u: number; v: number },
  options?: { maxIterations?: number; tolerance?: number }
): SurfaceRayIntersection {
  const maxIterations = Math.max(1, options?.maxIterations ?? 8);
  const tolerance = Math.max(1e-8, options?.tolerance ?? 1e-5);

  const uMin = surface.knotsU[surface.degreeU];
  const uMax = surface.knotsU[surface.knotsU.length - surface.degreeU - 1];
  const vMin = surface.knotsV[surface.degreeV];
  const vMax = surface.knotsV[surface.knotsV.length - surface.degreeV - 1];

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  let u = clamp(initial.u, uMin, uMax);
  let v = clamp(initial.v, vMin, vMax);

  let current = evaluateSurfacePoint(surface, u, v);
  let t = Math.max(
    0,
    (current.x - ray.origin.x) * ray.direction.x +
      (current.y - ray.origin.y) * ray.direction.y +
      (current.z - ray.origin.z) * ray.direction.z
  );

  let converged = false;
  let iterations = 0;

  for (let iter = 0; iter < maxIterations; iter += 1) {
    iterations = iter + 1;
    const derivatives = evaluateSurfaceDerivatives(surface, u, v, 1);
    current = derivatives.point;

    const rx = ray.origin.x + ray.direction.x * t;
    const ry = ray.origin.y + ray.direction.y * t;
    const rz = ray.origin.z + ray.direction.z * t;
    const fx = current.x - rx;
    const fy = current.y - ry;
    const fz = current.z - rz;

    const error = Math.sqrt(fx * fx + fy * fy + fz * fz);
    if (error < tolerance) {
      converged = true;
      break;
    }

    const du = derivatives.du;
    const dv = derivatives.dv;

    const solution = solveLinear3x3(
      du.x,
      dv.x,
      -ray.direction.x,
      du.y,
      dv.y,
      -ray.direction.y,
      du.z,
      dv.z,
      -ray.direction.z,
      -fx,
      -fy,
      -fz
    );

    if (!solution) break;

    u = clamp(u + solution.x, uMin, uMax);
    v = clamp(v + solution.y, vMin, vMax);
    t = Math.max(0, t + solution.z);

    if (
      Math.abs(solution.x) < tolerance &&
      Math.abs(solution.y) < tolerance &&
      Math.abs(solution.z) < tolerance
    ) {
      converged = true;
      break;
    }
  }

  current = evaluateSurfacePoint(surface, u, v);
  return { point: current, u, v, t, converged, iterations };
}

export function refineRayCurveIntersection(
  curve: NURBSCurve,
  ray: Ray,
  initialU: number,
  options?: { maxIterations?: number; tolerance?: number }
): CurveRayIntersection {
  if (curve.controlPoints.length === 0) {
    return {
      point: { x: 0, y: 0, z: 0 },
      u: initialU,
      t: 0,
      converged: false,
      iterations: 0,
    };
  }

  const maxIterations = Math.max(1, options?.maxIterations ?? 8);
  const tolerance = Math.max(1e-8, options?.tolerance ?? 1e-5);

  const uMin = curve.knots[curve.degree];
  const uMax = curve.knots[curve.knots.length - curve.degree - 1];
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  let u = clamp(initialU, uMin, uMax);
  let t = 0;
  let converged = false;
  let iterations = 0;
  let point = evaluateCurvePoint(curve, u);

  for (let iter = 0; iter < maxIterations; iter += 1) {
    iterations = iter + 1;
    point = evaluateCurvePoint(curve, u);
    const d1d2 = evaluateCurveDerivative(curve, u, 2);
    const d1 = d1d2[0] ?? { x: 0, y: 0, z: 0 };
    const d2 = d1d2[1] ?? { x: 0, y: 0, z: 0 };

    const rx = ray.origin.x + ray.direction.x * t;
    const ry = ray.origin.y + ray.direction.y * t;
    const rz = ray.origin.z + ray.direction.z * t;

    const fx = point.x - rx;
    const fy = point.y - ry;
    const fz = point.z - rz;

    const error = Math.sqrt(fx * fx + fy * fy + fz * fz);
    if (error < tolerance) {
      converged = true;
      break;
    }

    const f1 = fx * d1.x + fy * d1.y + fz * d1.z;
    const f2 = fx * ray.direction.x + fy * ray.direction.y + fz * ray.direction.z;

    const a = d1.x * d1.x + d1.y * d1.y + d1.z * d1.z + fx * d2.x + fy * d2.y + fz * d2.z;
    const b = -(ray.direction.x * d1.x + ray.direction.y * d1.y + ray.direction.z * d1.z);
    const c = d1.x * ray.direction.x + d1.y * ray.direction.y + d1.z * ray.direction.z;
    const d = -(ray.direction.x * ray.direction.x +
      ray.direction.y * ray.direction.y +
      ray.direction.z * ray.direction.z);

    const det = a * d - b * c;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-12) break;

    const du = (b * f2 - d * f1) / det;
    const dt = (c * f1 - a * f2) / det;

    u = clamp(u + du, uMin, uMax);
    t = Math.max(0, t + dt);

    if (Math.abs(du) < tolerance && Math.abs(dt) < tolerance) {
      converged = true;
      break;
    }
  }

  point = evaluateCurvePoint(curve, u);
  return { point, u, t, converged, iterations };
}

export function computeCurveTangent(curve: NURBSCurve, u: number): Vec3 {
  const derivatives = evaluateCurveDerivative(curve, u, 1);
  const tangent = derivatives[0] ?? { x: 0, y: 0, z: 0 };
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
