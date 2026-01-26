import {
  BoxGeometry,
  CylinderGeometry,
  ShapeUtils,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
} from "three";
import type { PlaneDefinition, RenderMesh, Vec3 } from "../types";
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
} from "./math";
import { interpolatePolyline, resampleByArcLength } from "./curves";

const signedArea2D = (points: Vector2[]) => {
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
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
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
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    normals[i] = nx / len;
    normals[i + 1] = ny / len;
    normals[i + 2] = nz / len;
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
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    area += 0.5 * Math.sqrt(nx * nx + ny * ny + nz * nz);
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
  return bufferGeometryToRenderMesh(geometry);
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
      return new Vector2(projected.u, projected.v);
    })
  );
  const [outer, ...holes] = loops2D;
  const outerArea = signedArea2D(outer);
  const orientedOuter = outerArea < 0 ? [...outer].reverse() : outer;
  const orientedHoles = holes.map((hole) => {
    const area = signedArea2D(hole);
    return area > 0 ? [...hole].reverse() : hole;
  });
  const triangles = ShapeUtils.triangulateShape(orientedOuter, orientedHoles);
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
  triangles.forEach(([a, b, c]) => {
    indices.push(a, b, c);
  });
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
      if (distance(first, last) < 1e-6) {
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
        return new Vector2(projected.u, projected.v);
      });
      const triangles = ShapeUtils.triangulateShape(contour, []);
      triangles.forEach(([a, b, c]) => {
        indices.push(baseIndex + c, baseIndex + b, baseIndex + a);
      });
      triangles.forEach(([a, b, c]) => {
        indices.push(
          baseIndex + ringCount + a,
          baseIndex + ringCount + b,
          baseIndex + ringCount + c
        );
      });
    }
  });
  const normals = computeVertexNormals(positions, indices);
  return { positions, normals, uvs, indices };
};
