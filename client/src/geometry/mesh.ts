import {
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  RingGeometry,
  SphereGeometry,
  TetrahedronGeometry,
  TorusGeometry,
  TorusKnotGeometry,
  Vector3,
  type BufferGeometry,
} from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import { TeapotGeometry } from "three/examples/jsm/geometries/TeapotGeometry.js";
import { triangulatePolygon } from "./triangulate";
import type { PlaneDefinition, PrimitiveKind, RenderMesh, Vec3 } from "../types";
import {
  add,
  computeBestFitPlane,
  computeNormalNewell,
  distance,
  dot,
  normalize,
  projectPointToPlane,
  scale,
  unprojectPointFromPlane,
  EPSILON,
  length3,
  cross3,
} from "./math";
import { interpolatePolyline, resampleByArcLength } from "./curves";

const signedArea2D = (points: { x: number; y: number }[]) => {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
};

const rotateArray = <T>(items: T[], offset: number) => {
  if (items.length === 0) return items;
  const normalized = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(normalized), ...items.slice(0, normalized)];
};

const alignClosedSection = (reference: Vec3[], target: Vec3[]) => {
  const count = reference.length;
  let bestOffset = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let offset = 0; offset < count; offset += 1) {
    let score = 0;
    for (let i = 0; i < count; i += 1) {
      score += distance(reference[i], target[(i + offset) % count]);
    }
    if (score < bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }
  return rotateArray(target, bestOffset);
};

const alignSectionDirection = (reference: Vec3[], target: Vec3[]) => {
  const forwardScore = target.reduce(
    (sum, point, idx) => sum + distance(point, reference[idx]),
    0
  );
  const reversed = [...target].reverse();
  const reverseScore = reversed.reduce(
    (sum, point, idx) => sum + distance(point, reference[idx]),
    0
  );
  return reverseScore < forwardScore ? reversed : target;
};

export const computeVertexNormals = (positions: number[], indices: number[]) => {
  const normals = new Array(positions.length).fill(0);
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;
    const ax = positions[ia];
    const ay = positions[ia + 1];
    const az = positions[ia + 2];
    const bx = positions[ib];
    const by = positions[ib + 1];
    const bz = positions[ib + 2];
    const cx = positions[ic];
    const cy = positions[ic + 1];
    const cz = positions[ic + 2];
    const abx = bx - ax;
    const aby = by - ay;
    const abz = bz - az;
    const acx = cx - ax;
    const acy = cy - ay;
    const acz = cz - az;
    const [nx, ny, nz] = cross3(abx, aby, abz, acx, acy, acz);
    normals[ia] += nx;
    normals[ia + 1] += ny;
    normals[ia + 2] += nz;
    normals[ib] += nx;
    normals[ib + 1] += ny;
    normals[ib + 2] += nz;
    normals[ic] += nx;
    normals[ic + 1] += ny;
    normals[ic + 2] += nz;
  }
  for (let i = 0; i < normals.length; i += 3) {
    const nx = normals[i];
    const ny = normals[i + 1];
    const nz = normals[i + 2];
    const len = length3(nx, ny, nz);
    const inv = len > EPSILON.NUMERIC ? 1 / len : 0;
    normals[i] = nx * inv;
    normals[i + 1] = ny * inv;
    normals[i + 2] = nz * inv;
  }
  return normals;
};

export const computeMeshArea = (positions: number[], indices: number[]) => {
  let area = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;
    const ax = positions[ia];
    const ay = positions[ia + 1];
    const az = positions[ia + 2];
    const bx = positions[ib];
    const by = positions[ib + 1];
    const bz = positions[ib + 2];
    const cx = positions[ic];
    const cy = positions[ic + 1];
    const cz = positions[ic + 2];
    const abx = bx - ax;
    const aby = by - ay;
    const abz = bz - az;
    const acx = cx - ax;
    const acy = cy - ay;
    const acz = cz - az;
    const [nx, ny, nz] = cross3(abx, aby, abz, acx, acy, acz);
    area += 0.5 * length3(nx, ny, nz);
  }
  return area;
};

const bufferGeometryToRenderMesh = (geometry: BufferGeometry): RenderMesh => {
  const positionAttr = geometry.getAttribute("position");
  if (!positionAttr) {
    return { positions: [], normals: [], uvs: [], indices: [] };
  }
  if (!geometry.getAttribute("normal")) {
    geometry.computeVertexNormals();
  }
  const normalAttr = geometry.getAttribute("normal");
  const uvAttr = geometry.getAttribute("uv");
  const indexAttr = geometry.index;
  const positions = Array.from(positionAttr.array as ArrayLike<number>);
  const normals = normalAttr
    ? Array.from(normalAttr.array as ArrayLike<number>)
    : new Array(positions.length).fill(0);
  const uvs = uvAttr ? Array.from(uvAttr.array as ArrayLike<number>) : [];
  const indices = indexAttr
    ? Array.from(indexAttr.array as ArrayLike<number>)
    : Array.from({ length: positions.length / 3 }, (_, i) => i);
  return { positions, normals, uvs, indices };
};

export const transformMesh = (
  mesh: RenderMesh,
  origin: Vec3,
  basis: { xAxis: Vec3; yAxis: Vec3; normal: Vec3 }
): RenderMesh => {
  const positions: number[] = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = mesh.positions[i];
    const y = mesh.positions[i + 1];
    const z = mesh.positions[i + 2];
    positions.push(
      origin.x + basis.xAxis.x * x + basis.yAxis.x * y + basis.normal.x * z,
      origin.y + basis.xAxis.y * x + basis.yAxis.y * y + basis.normal.y * z,
      origin.z + basis.xAxis.z * x + basis.yAxis.z * y + basis.normal.z * z
    );
  }
  const normals: number[] = [];
  for (let i = 0; i < mesh.normals.length; i += 3) {
    const x = mesh.normals[i];
    const y = mesh.normals[i + 1];
    const z = mesh.normals[i + 2];
    const nx = basis.xAxis.x * x + basis.yAxis.x * y + basis.normal.x * z;
    const ny = basis.xAxis.y * x + basis.yAxis.y * y + basis.normal.y * z;
    const nz = basis.xAxis.z * x + basis.yAxis.z * y + basis.normal.z * z;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    normals.push(nx / len, ny / len, nz / len);
  }
  return {
    positions,
    normals,
    uvs: mesh.uvs,
    indices: mesh.indices,
  };
};

export const generateBoxMesh = (
  size: { width: number; height: number; depth: number },
  segments = 1
) => {
  const geometry = new BoxGeometry(
    size.width,
    size.height,
    size.depth,
    segments,
    segments,
    segments
  );
  return bufferGeometryToRenderMesh(geometry);
};

export const generateSphereMesh = (
  radius: number,
  segments = 24
) => {
  const heightSegments = Math.max(8, Math.round(segments / 2));
  const geometry = new SphereGeometry(radius, segments, heightSegments);
  return bufferGeometryToRenderMesh(geometry);
};

export const generateCylinderMesh = (
  radius: number,
  height: number,
  radialSegments = 24
) => {
  const geometry = new CylinderGeometry(
    radius,
    radius,
    height,
    radialSegments,
    1,
    false
  );
  return bufferGeometryToRenderMesh(geometry);
};

export const generateConeMesh = (
  radius: number,
  height: number,
  radialSegments = 24
) => {
  const geometry = new CylinderGeometry(
    0,
    radius,
    height,
    radialSegments,
    1,
    false
  );
  return bufferGeometryToRenderMesh(geometry);
};

export const generateTorusMesh = (
  radius: number,
  tube: number,
  radialSegments = 16,
  tubularSegments = 36
) => {
  const geometry = new TorusGeometry(
    radius,
    tube,
    radialSegments,
    tubularSegments
  );
  geometry.rotateX(-Math.PI / 2);
  return bufferGeometryToRenderMesh(geometry);
};

const cloneMesh = (mesh: RenderMesh): RenderMesh => ({
  positions: mesh.positions.slice(),
  normals: mesh.normals.slice(),
  uvs: mesh.uvs.slice(),
  indices: mesh.indices.slice(),
  colors: mesh.colors ? mesh.colors.slice() : undefined,
});

const translateMesh = (mesh: RenderMesh, offset: Vec3): RenderMesh => {
  const next = cloneMesh(mesh);
  for (let i = 0; i < next.positions.length; i += 3) {
    next.positions[i] += offset.x;
    next.positions[i + 1] += offset.y;
    next.positions[i + 2] += offset.z;
  }
  return next;
};

const centerMesh = (mesh: RenderMesh): RenderMesh => {
  if (mesh.positions.length === 0) return mesh;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = mesh.positions[i];
    const y = mesh.positions[i + 1];
    const z = mesh.positions[i + 2];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }
  const center = {
    x: (minX + maxX) * 0.5,
    y: (minY + maxY) * 0.5,
    z: (minZ + maxZ) * 0.5,
  };
  return translateMesh(mesh, { x: -center.x, y: -center.y, z: -center.z });
};

const flipMesh = (mesh: RenderMesh): RenderMesh => {
  const indices: number[] = [];
  for (let i = 0; i < mesh.indices.length; i += 3) {
    indices.push(mesh.indices[i], mesh.indices[i + 2], mesh.indices[i + 1]);
  }
  const normals = mesh.normals.map((value) => -value);
  return { ...mesh, normals, indices };
};

const mergeMeshes = (meshes: RenderMesh[]): RenderMesh => {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const includeColors = meshes.every(
    (mesh) => Boolean(mesh.colors) && mesh.colors.length === mesh.positions.length
  );
  const colors: number[] = [];
  let offset = 0;
  meshes.forEach((mesh) => {
    positions.push(...mesh.positions);
    normals.push(...mesh.normals);
    uvs.push(...mesh.uvs);
    if (includeColors) {
      colors.push(...(mesh.colors ?? new Array(mesh.positions.length).fill(0)));
    }
    indices.push(...mesh.indices.map((index) => index + offset));
    offset += mesh.positions.length / 3;
  });
  return {
    positions,
    normals,
    uvs,
    indices,
    colors: includeColors ? colors : undefined,
  };
};

const generateParametricMesh = (
  uSegments: number,
  vSegments: number,
  fn: (u: number, v: number) => Vec3
): RenderMesh => {
  const uCount = Math.max(3, Math.round(uSegments));
  const vCount = Math.max(3, Math.round(vSegments));
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= uCount; i += 1) {
    const u = i / uCount;
    for (let j = 0; j <= vCount; j += 1) {
      const v = j / vCount;
      const point = fn(u, v);
      positions.push(point.x, point.y, point.z);
      uvs.push(u, v);
    }
  }
  const stride = vCount + 1;
  for (let i = 0; i < uCount; i += 1) {
    for (let j = 0; j < vCount; j += 1) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }
  const normals = computeVertexNormals(positions, indices);
  return { positions, normals, uvs, indices };
};

const signedPow = (value: number, exponent: number) =>
  Math.sign(value) * Math.pow(Math.abs(value), exponent);

const scalePointsToRadius = (points: Vec3[], radius: number) => {
  let maxLength = 0;
  points.forEach((point) => {
    maxLength = Math.max(
      maxLength,
      Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z)
    );
  });
  const scaleFactor = maxLength > 0 ? radius / maxLength : 1;
  return points.map((point) => ({
    x: point.x * scaleFactor,
    y: point.y * scaleFactor,
    z: point.z * scaleFactor,
  }));
};

const dedupePoints = (points: Vec3[], precision = EPSILON.DISTANCE) => {
  const map = new Map<string, Vec3>();
  points.forEach((point) => {
    const key = `${Math.round(point.x / precision)}:${Math.round(point.y / precision)}:${Math.round(point.z / precision)}`;
    if (!map.has(key)) {
      map.set(key, point);
    }
  });
  return Array.from(map.values());
};

const buildEdgePairs = (vertices: Vec3[]) => {
  let minDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i];
    for (let j = i + 1; j < vertices.length; j += 1) {
      const b = vertices[j];
      const d = distance(a, b);
      if (d > EPSILON.DISTANCE) {
        minDistance = Math.min(minDistance, d);
      }
    }
  }
  if (!Number.isFinite(minDistance)) return [] as Array<[number, number]>;
  const threshold = minDistance * 1.01;
  const edges: Array<[number, number]> = [];
  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i];
    for (let j = i + 1; j < vertices.length; j += 1) {
      const b = vertices[j];
      const d = distance(a, b);
      if (d <= threshold) {
        edges.push([i, j]);
      }
    }
  }
  return edges;
};

const generateConvexMesh = (points: Vec3[]): RenderMesh => {
  const geometry = new ConvexGeometry(points.map((point) => new Vector3(point.x, point.y, point.z)));
  return bufferGeometryToRenderMesh(geometry);
};

const generateTruncatedMesh = (
  baseVertices: Vec3[],
  radius: number,
  truncation = 1 / 3
) => {
  const edges = buildEdgePairs(baseVertices);
  const points: Vec3[] = [];
  edges.forEach(([i, j]) => {
    const a = baseVertices[i];
    const b = baseVertices[j];
    points.push({
      x: a.x + (b.x - a.x) * truncation,
      y: a.y + (b.y - a.y) * truncation,
      z: a.z + (b.z - a.z) * truncation,
    });
    points.push({
      x: b.x + (a.x - b.x) * truncation,
      y: b.y + (a.y - b.y) * truncation,
      z: b.z + (a.z - b.z) * truncation,
    });
  });
  const unique = dedupePoints(points);
  const scaled = scalePointsToRadius(unique, radius);
  return generateConvexMesh(scaled);
};

const filterMeshTriangles = (
  mesh: RenderMesh,
  predicate: (point: Vec3) => boolean
): RenderMesh => {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const ia = mesh.indices[i] * 3;
    const ib = mesh.indices[i + 1] * 3;
    const ic = mesh.indices[i + 2] * 3;
    const a = { x: mesh.positions[ia], y: mesh.positions[ia + 1], z: mesh.positions[ia + 2] };
    const b = { x: mesh.positions[ib], y: mesh.positions[ib + 1], z: mesh.positions[ib + 2] };
    const c = { x: mesh.positions[ic], y: mesh.positions[ic + 1], z: mesh.positions[ic + 2] };
    if (!predicate(a) || !predicate(b) || !predicate(c)) continue;
    const baseIndex = positions.length / 3;
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
  }
  const normals = computeVertexNormals(positions, indices);
  return { positions, normals, uvs: [], indices };
};

export type PrimitiveMeshConfig = {
  kind: PrimitiveKind;
  size: number;
  radius: number;
  height: number;
  tube: number;
  radialSegments: number;
  tubularSegments: number;
  innerRadius: number;
  topRadius: number;
  capHeight: number;
  detail: number;
  exponent1: number;
  exponent2: number;
};

export const DEFAULT_PRIMITIVE_CONFIG: PrimitiveMeshConfig = {
  kind: "box",
  size: 1,
  radius: 0.5,
  height: 1,
  tube: 0.2,
  radialSegments: 64,
  tubularSegments: 128,
  innerRadius: 0.25,
  topRadius: 0.2,
  capHeight: 0.4,
  detail: 2,
  exponent1: 2,
  exponent2: 2,
};

export const generateTetrahedronMesh = (radius: number, detail = 0) => {
  const geometry = new TetrahedronGeometry(radius, detail);
  return bufferGeometryToRenderMesh(geometry);
};

export const generateOctahedronMesh = (radius: number, detail = 0) => {
  const geometry = new OctahedronGeometry(radius, detail);
  return bufferGeometryToRenderMesh(geometry);
};

export const generateIcosahedronMesh = (radius: number, detail = 0) => {
  const geometry = new IcosahedronGeometry(radius, detail);
  return bufferGeometryToRenderMesh(geometry);
};

export const generateDodecahedronMesh = (radius: number, detail = 0) => {
  const geometry = new DodecahedronGeometry(radius, detail);
  return bufferGeometryToRenderMesh(geometry);
};

export const generateHemisphereMesh = (radius: number, segments = 24) => {
  const heightSegments = Math.max(6, Math.round(segments / 2));
  const geometry = new SphereGeometry(radius, segments, heightSegments, 0, Math.PI * 2, 0, Math.PI / 2);
  return centerMesh(bufferGeometryToRenderMesh(geometry));
};

export const generateSphericalCapMesh = (radius: number, capHeight: number, segments = 24) => {
  const clampedHeight = Math.max(0.01, Math.min(capHeight, radius * 1.99));
  const thetaLength = Math.acos(1 - clampedHeight / radius);
  const heightSegments = Math.max(6, Math.round(segments / 2));
  const geometry = new SphereGeometry(radius, segments, heightSegments, 0, Math.PI * 2, 0, thetaLength);
  return centerMesh(bufferGeometryToRenderMesh(geometry));
};

export const generateCapsuleMesh = (
  radius: number,
  height: number,
  radialSegments = 16,
  capSegments = 8
) => {
  const length = Math.max(0.01, height - radius * 2);
  const geometry = new CapsuleGeometry(radius, length, capSegments, radialSegments);
  return bufferGeometryToRenderMesh(geometry);
};

export const generateDiskMesh = (radius: number, segments = 32) => {
  const geometry = new CircleGeometry(radius, segments);
  geometry.rotateX(-Math.PI / 2);
  return bufferGeometryToRenderMesh(geometry);
};

export const generateRingMesh = (innerRadius: number, outerRadius: number, segments = 48) => {
  const geometry = new RingGeometry(innerRadius, outerRadius, segments);
  geometry.rotateX(-Math.PI / 2);
  return bufferGeometryToRenderMesh(geometry);
};

export const generatePrismMesh = (
  radius: number,
  height: number,
  sides: number,
  radialSegments = sides
) => {
  const geometry = new CylinderGeometry(radius, radius, height, radialSegments, 1, false);
  return bufferGeometryToRenderMesh(geometry);
};

export const generatePyramidMesh = (
  size: number,
  height: number,
  sides = 4
) => {
  const radius = size / Math.sqrt(2);
  const geometry = new CylinderGeometry(0, radius, height, sides, 1, false);
  return bufferGeometryToRenderMesh(geometry);
};

export const generateFrustumMesh = (
  bottomRadius: number,
  topRadius: number,
  height: number,
  radialSegments = 24
) => {
  const geometry = new CylinderGeometry(topRadius, bottomRadius, height, radialSegments, 1, false);
  return bufferGeometryToRenderMesh(geometry);
};

export const generateTorusKnotMesh = (
  radius: number,
  tube: number,
  tubularSegments = 128,
  radialSegments = 16,
  p = 2,
  q = 3
) => {
  const geometry = new TorusKnotGeometry(
    radius,
    tube,
    tubularSegments,
    radialSegments,
    p,
    q
  );
  geometry.rotateX(-Math.PI / 2);
  return bufferGeometryToRenderMesh(geometry);
};

export const generateEllipsoidMesh = (
  radiusX: number,
  radiusY: number,
  radiusZ: number,
  segments = 24
) => {
  const heightSegments = Math.max(8, Math.round(segments / 2));
  const geometry = new SphereGeometry(1, segments, heightSegments);
  const mesh = bufferGeometryToRenderMesh(geometry);
  const positions = mesh.positions.slice();
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] *= radiusX;
    positions[i + 1] *= radiusY;
    positions[i + 2] *= radiusZ;
  }
  const normals = computeVertexNormals(positions, mesh.indices);
  return { positions, normals, uvs: mesh.uvs, indices: mesh.indices };
};

export const generateMobiusStripMesh = (
  radius: number,
  width: number,
  radialSegments = 80,
  tubularSegments = 12
) =>
  generateParametricMesh(radialSegments, tubularSegments, (u, v) => {
    const angle = u * Math.PI * 2;
    const offset = (v - 0.5) * width;
    const half = angle * 0.5;
    const cosHalf = Math.cos(half);
    const sinHalf = Math.sin(half);
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const radial = radius + offset * cosHalf;
    return {
      x: radial * cosAngle,
      y: offset * sinHalf,
      z: radial * sinAngle,
    };
  });

export const generateSuperellipsoidMesh = (
  radiusX: number,
  radiusY: number,
  radiusZ: number,
  exponent1 = 2,
  exponent2 = 2,
  uSegments = 48,
  vSegments = 24
) =>
  generateParametricMesh(uSegments, vSegments, (u, v) => {
    const uAngle = -Math.PI / 2 + u * Math.PI;
    const vAngle = -Math.PI + v * Math.PI * 2;
    const cu = Math.cos(uAngle);
    const su = Math.sin(uAngle);
    const cv = Math.cos(vAngle);
    const sv = Math.sin(vAngle);
    const cuExp = signedPow(cu, exponent1);
    return {
      x: radiusX * cuExp * signedPow(cv, exponent2),
      y: radiusY * signedPow(su, exponent1),
      z: radiusZ * cuExp * signedPow(sv, exponent2),
    };
  });

export const generateHyperbolicParaboloidMesh = (
  size: number,
  height: number,
  uSegments = 48,
  vSegments = 48
) =>
  generateParametricMesh(uSegments, vSegments, (u, v) => {
    const uu = u * 2 - 1;
    const vv = v * 2 - 1;
    return {
      x: uu * size * 0.5,
      y: (uu * uu - vv * vv) * height,
      z: vv * size * 0.5,
    };
  });

export const generateOneSheetHyperboloidMesh = (
  radius: number,
  height: number,
  uSegments = 64,
  vSegments = 32
) => {
  const vMax = 1.2;
  const denom = Math.sinh(vMax) || 1;
  return generateParametricMesh(uSegments, vSegments, (u, v) => {
    const angle = u * Math.PI * 2;
    const vParam = (v * 2 - 1) * vMax;
    const cosh = Math.cosh(vParam);
    const sinh = Math.sinh(vParam);
    return {
      x: radius * cosh * Math.cos(angle),
      y: (height * 0.5) * (sinh / denom),
      z: radius * cosh * Math.sin(angle),
    };
  });
};

export const generateGeodesicDomeMesh = (radius: number, detail = 1) => {
  const geometry = new IcosahedronGeometry(radius, detail);
  const mesh = bufferGeometryToRenderMesh(geometry);
  const clipped = filterMeshTriangles(mesh, (point) => point.y >= 0);
  return centerMesh(clipped);
};

export const generateRhombicDodecahedronMesh = (radius: number) => {
  const points: Vec3[] = [
    { x: 1, y: 1, z: 1 },
    { x: 1, y: 1, z: -1 },
    { x: 1, y: -1, z: 1 },
    { x: 1, y: -1, z: -1 },
    { x: -1, y: 1, z: 1 },
    { x: -1, y: 1, z: -1 },
    { x: -1, y: -1, z: 1 },
    { x: -1, y: -1, z: -1 },
    { x: 2, y: 0, z: 0 },
    { x: -2, y: 0, z: 0 },
    { x: 0, y: 2, z: 0 },
    { x: 0, y: -2, z: 0 },
    { x: 0, y: 0, z: 2 },
    { x: 0, y: 0, z: -2 },
  ];
  return generateConvexMesh(scalePointsToRadius(points, radius));
};

export const generateTruncatedCubeMesh = (radius: number) => {
  const base: Vec3[] = [
    { x: 1, y: 1, z: 1 },
    { x: 1, y: 1, z: -1 },
    { x: 1, y: -1, z: 1 },
    { x: 1, y: -1, z: -1 },
    { x: -1, y: 1, z: 1 },
    { x: -1, y: 1, z: -1 },
    { x: -1, y: -1, z: 1 },
    { x: -1, y: -1, z: -1 },
  ];
  return generateTruncatedMesh(base, radius);
};

export const generateTruncatedOctahedronMesh = (radius: number) => {
  const base: Vec3[] = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
  ];
  return generateTruncatedMesh(base, radius);
};

export const generateTruncatedIcosahedronMesh = (radius: number) => {
  const phi = (1 + Math.sqrt(5)) / 2;
  const base: Vec3[] = [
    { x: 0, y: 1, z: phi },
    { x: 0, y: -1, z: phi },
    { x: 0, y: 1, z: -phi },
    { x: 0, y: -1, z: -phi },
    { x: 1, y: phi, z: 0 },
    { x: -1, y: phi, z: 0 },
    { x: 1, y: -phi, z: 0 },
    { x: -1, y: -phi, z: 0 },
    { x: phi, y: 0, z: 1 },
    { x: -phi, y: 0, z: 1 },
    { x: phi, y: 0, z: -1 },
    { x: -phi, y: 0, z: -1 },
  ];
  return generateTruncatedMesh(base, radius);
};

export const generatePipeMesh = (
  outerRadius: number,
  innerRadius: number,
  height: number,
  radialSegments = 24
) => {
  const outer = new CylinderGeometry(outerRadius, outerRadius, height, radialSegments, 1, true);
  const inner = new CylinderGeometry(innerRadius, innerRadius, height, radialSegments, 1, true);
  const outerMesh = bufferGeometryToRenderMesh(outer);
  const innerMesh = flipMesh(bufferGeometryToRenderMesh(inner));
  return mergeMeshes([outerMesh, innerMesh]);
};

export const generateWedgeMesh = (width: number, depth: number, height: number) => {
  const halfW = width * 0.5;
  const halfD = depth * 0.5;
  const positions: number[] = [
    -halfW, 0, -halfD,
    halfW, 0, -halfD,
    halfW, 0, halfD,
    -halfW, 0, halfD,
    -halfW, height, halfD,
    halfW, height, halfD,
  ];
  const indices = [
    0, 1, 2, 0, 2, 3,
    3, 2, 5, 3, 5, 4,
    0, 1, 5, 0, 5, 4,
    0, 3, 4,
    1, 2, 5,
  ];
  const normals = computeVertexNormals(positions, indices);
  return centerMesh({ positions, normals, uvs: [], indices });
};

export const generateUtahTeapotMesh = (size: number, segments = 10) => {
  const geometry = new TeapotGeometry(size, segments);
  return bufferGeometryToRenderMesh(geometry);
};

export const generatePrimitiveMesh = (
  config: Partial<PrimitiveMeshConfig> & { kind: PrimitiveKind }
): RenderMesh => {
  const resolved = { ...DEFAULT_PRIMITIVE_CONFIG, ...config };
  const radialSegments = Math.max(3, Math.round(resolved.radialSegments));
  const tubularSegments = Math.max(3, Math.round(resolved.tubularSegments));
  const detail = Math.max(0, Math.round(resolved.detail));
  const size = Math.max(1e-3, resolved.size);
  const radius = Math.max(1e-3, resolved.radius);
  const height = Math.max(1e-3, resolved.height);
  const tube = Math.max(1e-3, resolved.tube);
  const innerRadius = Math.max(1e-3, resolved.innerRadius);
  const topRadius = Math.max(1e-3, resolved.topRadius);
  const capHeight = Math.max(1e-3, resolved.capHeight);
  const exponent1 = Math.max(0.1, resolved.exponent1);
  const exponent2 = Math.max(0.1, resolved.exponent2);

  switch (resolved.kind) {
    case "sphere":
      return generateSphereMesh(radius, radialSegments);
    case "cylinder":
      return generateCylinderMesh(radius, height, radialSegments);
    case "torus":
      return generateTorusMesh(radius, tube, radialSegments, tubularSegments);
    case "pyramid":
      return generatePyramidMesh(size, height, 4);
    case "tetrahedron":
      return generateTetrahedronMesh(radius, detail);
    case "octahedron":
      return generateOctahedronMesh(radius, detail);
    case "icosahedron":
      return generateIcosahedronMesh(radius, detail);
    case "dodecahedron":
      return generateDodecahedronMesh(radius, detail);
    case "hemisphere":
      return generateHemisphereMesh(radius, radialSegments);
    case "capsule":
      return generateCapsuleMesh(radius, height, radialSegments);
    case "disk":
      return generateDiskMesh(radius, radialSegments);
    case "ring":
      return generateRingMesh(Math.min(innerRadius, radius * 0.95), radius, radialSegments);
    case "triangularPrism":
      return generatePrismMesh(radius, height, 3, 3);
    case "pentagonalPrism":
      return generatePrismMesh(radius, height, 5, 5);
    case "hexagonalPrism":
      return generatePrismMesh(radius, height, 6, 6);
    case "torusKnot":
      return generateTorusKnotMesh(radius, tube, tubularSegments * 2, radialSegments, 2, 3);
    case "utahTeapot":
      return generateUtahTeapotMesh(size, Math.max(6, Math.round(radialSegments / 2)));
    case "frustum":
      return generateFrustumMesh(radius, topRadius, height, radialSegments);
    case "mobiusStrip":
      return generateMobiusStripMesh(radius, tube * 2, tubularSegments * 2, radialSegments / 2);
    case "ellipsoid":
      return generateEllipsoidMesh(radius, height * 0.5, size * 0.5, radialSegments);
    case "wedge":
      return generateWedgeMesh(size, radius * 2, height);
    case "sphericalCap":
      return generateSphericalCapMesh(radius, capHeight, radialSegments);
    case "bipyramid":
      return generateOctahedronMesh(radius, detail);
    case "rhombicDodecahedron":
      return generateRhombicDodecahedronMesh(radius);
    case "truncatedCube":
      return generateTruncatedCubeMesh(radius);
    case "truncatedOctahedron":
      return generateTruncatedOctahedronMesh(radius);
    case "truncatedIcosahedron":
      return generateTruncatedIcosahedronMesh(radius);
    case "pipe":
      return generatePipeMesh(radius, Math.min(innerRadius, radius * 0.9), height, radialSegments);
    case "superellipsoid":
      return generateSuperellipsoidMesh(radius, height * 0.5, size * 0.5, exponent1, exponent2, radialSegments * 2, tubularSegments);
    case "hyperbolicParaboloid":
      return generateHyperbolicParaboloidMesh(size, height, radialSegments * 2, radialSegments * 2);
    case "geodesicDome":
      return generateGeodesicDomeMesh(radius, detail);
    case "oneSheetHyperboloid":
      return generateOneSheetHyperboloidMesh(radius, height, radialSegments * 2, tubularSegments);
    case "box":
    default:
      return generateBoxMesh({ width: size, height: size, depth: size }, Math.max(1, Math.round(radialSegments / 12)));
  }
};

export const generateLoftMesh = (
  sections: Vec3[][],
  options: {
    degree: 1 | 2 | 3;
    sectionClosed: boolean;
    closed: boolean;
    samples?: number;
  }
): RenderMesh => {
  const sectionCount = sections.length;
  if (sectionCount < 2) {
    return { positions: [], normals: [], uvs: [], indices: [] };
  }
  const maxSectionPoints = Math.max(...sections.map((section) => section.length));
  const samples = Math.max(options.samples ?? maxSectionPoints, 8);
  const processed = sections.map((section) => {
    const interpolated = interpolatePolyline(
      section,
      options.degree,
      options.sectionClosed,
      samples * 4
    );
    return resampleByArcLength(interpolated, samples, options.sectionClosed);
  });
  const aligned: Vec3[][] = [processed[0]];
  for (let i = 1; i < processed.length; i += 1) {
    const prev = aligned[i - 1];
    let current = processed[i];
    current = alignSectionDirection(prev, current);
    if (options.sectionClosed) {
      current = alignClosedSection(prev, current);
    }
    aligned.push(current);
  }
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const ringSize = aligned[0].length;
  if (ringSize < 2) {
    return { positions: [], normals: [], uvs: [], indices: [] };
  }
  const ringSegmentCount = options.sectionClosed ? ringSize : ringSize - 1;
  for (let sectionIndex = 0; sectionIndex < aligned.length; sectionIndex += 1) {
    const vDenominator = options.closed ? aligned.length : aligned.length - 1;
    const v =
      vDenominator > 0 ? sectionIndex / vDenominator : sectionIndex / 1;
    aligned[sectionIndex].forEach((point, pointIndex) => {
      positions.push(point.x, point.y, point.z);
      const uDenominator = options.sectionClosed ? ringSize : ringSize - 1;
      const u = uDenominator > 0 ? pointIndex / uDenominator : 0;
      uvs.push(u, v);
    });
  }
  const sectionSegments = options.closed ? aligned.length : aligned.length - 1;
  for (let sectionIndex = 0; sectionIndex < sectionSegments; sectionIndex += 1) {
    const nextSection = (sectionIndex + 1) % aligned.length;
    for (let i = 0; i < ringSegmentCount; i += 1) {
      const a = sectionIndex * ringSize + i;
      const b = sectionIndex * ringSize + ((i + 1) % ringSize);
      const c = nextSection * ringSize + i;
      const d = nextSection * ringSize + ((i + 1) % ringSize);
      indices.push(a, c, b, b, c, d);
    }
  }
  const normals = computeVertexNormals(positions, indices);
  return { positions, normals, uvs, indices };
};

export const generateSurfaceMesh = (
  loops: Vec3[][],
  plane?: PlaneDefinition
) => {
  if (loops.length === 0) {
    return { mesh: { positions: [], normals: [], uvs: [], indices: [] }, plane };
  }
  if (loops[0].length < 3) {
    return { mesh: { positions: [], normals: [], uvs: [], indices: [] }, plane };
  }
  const computedPlane = plane ?? computeBestFitPlane(loops.flat());
  const loops2D = loops.map((loop) =>
    loop.map((point) => {
      const projected = projectPointToPlane(point, computedPlane);
      return { x: projected.u, y: projected.v };
    })
  );
  const [outer, ...holes] = loops2D;
  const outerArea = signedArea2D(outer);
  const orientedOuter = outerArea < 0 ? [...outer].reverse() : outer;
  const orientedHoles = holes.map((hole) => {
    const area = signedArea2D(hole);
    return area > 0 ? [...hole].reverse() : hole;
  });
  const triangleIndices = triangulatePolygon(orientedOuter, orientedHoles);
  const combined = [
    ...orientedOuter,
    ...orientedHoles.flatMap((hole) => hole),
  ];
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let minU = Number.POSITIVE_INFINITY;
  let maxU = Number.NEGATIVE_INFINITY;
  let minV = Number.POSITIVE_INFINITY;
  let maxV = Number.NEGATIVE_INFINITY;
  combined.forEach((point) => {
    minU = Math.min(minU, point.x);
    maxU = Math.max(maxU, point.x);
    minV = Math.min(minV, point.y);
    maxV = Math.max(maxV, point.y);
  });
  const rangeU = maxU - minU || 1;
  const rangeV = maxV - minV || 1;
  combined.forEach((point) => {
    const world = unprojectPointFromPlane(
      { u: point.x, v: point.y },
      computedPlane
    );
    positions.push(world.x, world.y, world.z);
    uvs.push((point.x - minU) / rangeU, (point.y - minV) / rangeV);
  });
  indices.push(...triangleIndices);
  const normals = computeVertexNormals(positions, indices);
  return { mesh: { positions, normals, uvs, indices }, plane: computedPlane };
};

export const generateExtrudeMesh = (
  profiles: { points: Vec3[]; closed: boolean }[],
  options: { direction: Vec3; distance: number; capped: boolean }
): RenderMesh => {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const direction = normalize(options.direction);
  const offset = scale(direction, options.distance);
  profiles.forEach((profile) => {
    let basePoints = [...profile.points];
    if (profile.closed && basePoints.length > 1) {
      const first = basePoints[0];
      const last = basePoints[basePoints.length - 1];
      if (distance(first, last) < EPSILON.DISTANCE) {
        basePoints = basePoints.slice(0, -1);
      }
    }
    if (basePoints.length < 2) return;
    const profileNormal = computeNormalNewell(basePoints);
    if (dot(profileNormal, direction) < 0) {
      basePoints = [...basePoints].reverse();
    }
    const ringCount = basePoints.length;
    const baseIndex = positions.length / 3;
    const lengthAlong = [0];
    for (let i = 1; i < basePoints.length; i += 1) {
      lengthAlong[i] =
        lengthAlong[i - 1] + distance(basePoints[i - 1], basePoints[i]);
    }
    const totalLength = lengthAlong[lengthAlong.length - 1] || 1;
    basePoints.forEach((point, idx) => {
      positions.push(point.x, point.y, point.z);
      uvs.push(lengthAlong[idx] / totalLength, 0);
    });
    basePoints.forEach((point, idx) => {
      const top = add(point, offset);
      positions.push(top.x, top.y, top.z);
      uvs.push(lengthAlong[idx] / totalLength, 1);
    });
    const segmentCount = profile.closed ? ringCount : ringCount - 1;
    for (let i = 0; i < segmentCount; i += 1) {
      const a = baseIndex + i;
      const b = baseIndex + ((i + 1) % ringCount);
      const c = baseIndex + ringCount + i;
      const d = baseIndex + ringCount + ((i + 1) % ringCount);
      indices.push(a, c, b, b, c, d);
    }
    if (options.capped && profile.closed) {
      const plane = computeBestFitPlane(basePoints);
      const contour = basePoints.map((point) => {
        const projected = projectPointToPlane(point, plane);
        return { x: projected.u, y: projected.v };
      });
      const triangleIndices = triangulatePolygon(contour, []);
      for (let i = 0; i < triangleIndices.length; i += 3) {
        const a = triangleIndices[i];
        const b = triangleIndices[i + 1];
        const c = triangleIndices[i + 2];
        indices.push(baseIndex + c, baseIndex + b, baseIndex + a);
      }
      for (let i = 0; i < triangleIndices.length; i += 3) {
        const a = triangleIndices[i];
        const b = triangleIndices[i + 1];
        const c = triangleIndices[i + 2];
        indices.push(
          baseIndex + ringCount + a,
          baseIndex + ringCount + b,
          baseIndex + ringCount + c
        );
      }
    }
  });
  const normals = computeVertexNormals(positions, indices);
  return { positions, normals, uvs, indices };
};
