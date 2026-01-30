import type { Geometry, RenderMesh, Vec3 } from "../types";
import {
  add,
  cross,
  distance,
  dot,
  lerp,
  normalize,
  scale,
  sub,
} from "./math";
import { computeBestFitPlane, projectPointToPlane } from "./math";
import { computeVertexNormals, generateBoxMesh } from "./mesh";
import { tessellateSurfaceAdaptive } from "./tessellation";
import { tessellateBRepToMesh } from "./brep";

export type Vec2 = { x: number; y: number };

export type TessellationMesh = {
  vertices: Vec3[];
  faces: number[][];
  uvs?: Vec2[];
};

export type TessellationMeshData = {
  positions: number[];
  faces: number[][];
  uvs?: number[];
};

export type TessellationInsetResult = {
  mesh: TessellationMesh;
  innerFaces: number[];
  borderFaces: number[];
};

export const TESSELLATION_METADATA_KEY = "tessellation";

const EPSILON = 1e-8;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const vec3FromPositions = (positions: number[], index: number): Vec3 => {
  const i = index * 3;
  return {
    x: positions[i] ?? 0,
    y: positions[i + 1] ?? 0,
    z: positions[i + 2] ?? 0,
  };
};

const vec2FromUvs = (uvs: number[], index: number): Vec2 => {
  const i = index * 2;
  return {
    x: uvs[i] ?? 0,
    y: uvs[i + 1] ?? 0,
  };
};

const positionsFromVec3 = (vertices: Vec3[]): number[] => {
  const positions: number[] = [];
  vertices.forEach((vertex) => positions.push(vertex.x, vertex.y, vertex.z));
  return positions;
};

const uvsFromVec2 = (uvs: Vec2[]): number[] => {
  const output: number[] = [];
  uvs.forEach((uv) => output.push(uv.x, uv.y));
  return output;
};

const averageVec3 = (points: Vec3[]): Vec3 => {
  if (points.length === 0) return { x: 0, y: 0, z: 0 };
  const sum = points.reduce((acc, point) => add(acc, point), {
    x: 0,
    y: 0,
    z: 0,
  });
  return scale(sum, 1 / points.length);
};

const averageVec2 = (points: Vec2[]): Vec2 => {
  if (points.length === 0) return { x: 0, y: 0 };
  const sum = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 }
  );
  return { x: sum.x / points.length, y: sum.y / points.length };
};

const lerpVec2 = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

const normalizeVec2 = (vector: Vec2): Vec2 => {
  const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
};

const edgeKey = (a: number, b: number) =>
  a < b ? `${a}-${b}` : `${b}-${a}`;

const resolveTriangleIndices = (mesh: RenderMesh) => {
  if (mesh.indices.length > 0) return mesh.indices;
  return Array.from({ length: mesh.positions.length / 3 }, (_, i) => i);
};

const facesFromTriangleIndices = (indices: number[]) => {
  const faces: number[][] = [];
  for (let i = 0; i + 2 < indices.length; i += 3) {
    faces.push([indices[i], indices[i + 1], indices[i + 2]]);
  }
  return faces;
};

export const getTessellationMetadata = (
  metadata?: Record<string, unknown>
): TessellationMeshData | null => {
  if (!metadata) return null;
  const raw = metadata[TESSELLATION_METADATA_KEY];
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<TessellationMeshData>;
  if (!Array.isArray(data.positions) || !Array.isArray(data.faces)) return null;
  return {
    positions: data.positions,
    faces: data.faces,
    uvs: Array.isArray(data.uvs) ? data.uvs : undefined,
  };
};

export const withTessellationMetadata = (
  metadata: Record<string, unknown> | undefined,
  tessellation: TessellationMeshData
) => ({
  ...(metadata ?? {}),
  [TESSELLATION_METADATA_KEY]: tessellation,
});

export const toTessellationMesh = (
  mesh: RenderMesh,
  tessellation?: TessellationMeshData | null
): TessellationMesh => {
  if (tessellation) {
    const vertexCount = Math.floor(tessellation.positions.length / 3);
    const vertices = Array.from({ length: vertexCount }, (_, index) =>
      vec3FromPositions(tessellation.positions, index)
    );
    const uvCount = tessellation.uvs ? Math.floor(tessellation.uvs.length / 2) : 0;
    const uvs = tessellation.uvs
      ? Array.from({ length: uvCount }, (_, index) =>
          vec2FromUvs(tessellation.uvs as number[], index)
        )
      : undefined;
    return { vertices, faces: tessellation.faces, uvs };
  }
  const vertexCount = Math.floor(mesh.positions.length / 3);
  const vertices = Array.from({ length: vertexCount }, (_, index) =>
    vec3FromPositions(mesh.positions, index)
  );
  const indices = resolveTriangleIndices(mesh);
  const faces = facesFromTriangleIndices(indices);
  const uvs =
    mesh.uvs.length === vertexCount * 2
      ? Array.from({ length: vertexCount }, (_, index) =>
          vec2FromUvs(mesh.uvs, index)
        )
      : undefined;
  return { vertices, faces, uvs };
};

export const toTessellationMeshData = (mesh: TessellationMesh): TessellationMeshData => ({
  positions: positionsFromVec3(mesh.vertices),
  faces: mesh.faces.map((face) => face.slice()),
  uvs: mesh.uvs ? uvsFromVec2(mesh.uvs) : undefined,
});

export const tessellationMeshToRenderMesh = (mesh: TessellationMesh): RenderMesh => {
  const positions = positionsFromVec3(mesh.vertices);
  const indices = triangulateFaces(mesh);
  const normals = positions.length > 0 ? computeVertexNormals(positions, indices) : [];
  const uvs = mesh.uvs ? uvsFromVec2(mesh.uvs) : [];
  return { positions, normals, uvs, indices };
};

export const resolveMeshFromGeometry = (geometry: Geometry): RenderMesh | null => {
  if (geometry.type === "nurbsSurface") {
    if (geometry.mesh?.positions?.length) return geometry.mesh;
    const tessellated = tessellateSurfaceAdaptive(geometry.nurbs);
    return {
      positions: Array.from(tessellated.positions),
      normals: Array.from(tessellated.normals),
      uvs: Array.from(tessellated.uvs),
      indices: Array.from(tessellated.indices),
    };
  }
  if (geometry.type === "brep") {
    if (geometry.mesh?.positions?.length) return geometry.mesh;
    return tessellateBRepToMesh(geometry.brep);
  }
  if (geometry.type === "surface" && geometry.mesh?.positions?.length) {
    return geometry.mesh;
  }
  if ("mesh" in geometry && geometry.mesh?.positions?.length) {
    return geometry.mesh;
  }
  return null;
};

const computeFaceCenter = (vertices: Vec3[], face: number[]): Vec3 =>
  averageVec3(face.map((index) => vertices[index]));

const computeFaceNormal = (vertices: Vec3[], face: number[]): Vec3 => {
  if (face.length < 3) return { x: 0, y: 1, z: 0 };
  const points = face.map((index) => vertices[index]);
  return normalize(
    points.reduce((acc, point, idx) => {
      const next = points[(idx + 1) % points.length];
      return {
        x: acc.x + (point.y - next.y) * (point.z + next.z),
        y: acc.y + (point.z - next.z) * (point.x + next.x),
        z: acc.z + (point.x - next.x) * (point.y + next.y),
      };
    }, { x: 0, y: 0, z: 0 })
  );
};

const computeFaceArea = (vertices: Vec3[], face: number[]): number => {
  if (face.length < 3) return 0;
  const points = face.map((index) => vertices[index]);
  const normal = computeFaceNormal(vertices, face);
  const axis = dominantAxis(normal);
  const projected = points.map((point) => projectTo2D(point, axis));
  const indices = face.map((_, idx) => idx);
  const triangles = triangulatePolygon2D(projected, indices);
  let area = 0;
  triangles.forEach(([i0, i1, i2]) => {
    const a = points[i0];
    const b = points[i1];
    const c = points[i2];
    const ab = sub(b, a);
    const ac = sub(c, a);
    const crossProd = cross(ab, ac);
    area += 0.5 * Math.sqrt(dot(crossProd, crossProd));
  });
  return area;
};

const dominantAxis = (normal: Vec3) => {
  const absX = Math.abs(normal.x);
  const absY = Math.abs(normal.y);
  const absZ = Math.abs(normal.z);
  if (absX >= absY && absX >= absZ) return "x";
  if (absY >= absX && absY >= absZ) return "y";
  return "z";
};

const projectTo2D = (point: Vec3, axis: "x" | "y" | "z"): Vec2 => {
  if (axis === "x") return { x: point.y, y: point.z };
  if (axis === "y") return { x: point.x, y: point.z };
  return { x: point.x, y: point.y };
};

const polygonArea2D = (points: Vec2[]) => {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const next = points[(i + 1) % points.length];
    area += points[i].x * next.y - next.x * points[i].y;
  }
  return area * 0.5;
};

const pointInTriangle2D = (point: Vec2, a: Vec2, b: Vec2, c: Vec2) => {
  const area = (p1: Vec2, p2: Vec2, p3: Vec2) =>
    (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const area1 = area(point, a, b);
  const area2 = area(point, b, c);
  const area3 = area(point, c, a);
  const hasNeg = area1 < -EPSILON || area2 < -EPSILON || area3 < -EPSILON;
  const hasPos = area1 > EPSILON || area2 > EPSILON || area3 > EPSILON;
  return !(hasNeg && hasPos);
};

const isConvex2D = (prev: Vec2, current: Vec2, next: Vec2, isCCW: boolean) => {
  const crossZ = (current.x - prev.x) * (next.y - current.y) -
    (current.y - prev.y) * (next.x - current.x);
  return isCCW ? crossZ >= -EPSILON : crossZ <= EPSILON;
};

const triangulatePolygon2D = (points: Vec2[], indices: number[]) => {
  if (indices.length < 3) return [] as number[][];
  if (indices.length === 3) return [indices.slice()];
  const polygon = indices.slice();
  const triangles: number[][] = [];
  const isCCW = polygonArea2D(polygon.map((idx) => points[idx])) >= 0;
  let guard = 0;
  while (polygon.length > 3 && guard < polygon.length * polygon.length) {
    let earFound = false;
    for (let i = 0; i < polygon.length; i += 1) {
      const prevIndex = polygon[(i - 1 + polygon.length) % polygon.length];
      const currIndex = polygon[i];
      const nextIndex = polygon[(i + 1) % polygon.length];
      const prev = points[prevIndex];
      const curr = points[currIndex];
      const next = points[nextIndex];
      if (!isConvex2D(prev, curr, next, isCCW)) {
        continue;
      }
      let hasPointInside = false;
      for (let j = 0; j < polygon.length; j += 1) {
        const checkIndex = polygon[j];
        if (checkIndex === prevIndex || checkIndex === currIndex || checkIndex === nextIndex) {
          continue;
        }
        if (pointInTriangle2D(points[checkIndex], prev, curr, next)) {
          hasPointInside = true;
          break;
        }
      }
      if (hasPointInside) {
        continue;
      }
      triangles.push([prevIndex, currIndex, nextIndex]);
      polygon.splice(i, 1);
      earFound = true;
      break;
    }
    if (!earFound) {
      break;
    }
    guard += 1;
  }
  if (polygon.length === 3) {
    triangles.push([polygon[0], polygon[1], polygon[2]]);
  }
  if (triangles.length === 0) {
    const root = indices[0];
    for (let i = 1; i + 1 < indices.length; i += 1) {
      triangles.push([root, indices[i], indices[i + 1]]);
    }
  }
  return triangles;
};

const triangulateFaces = (mesh: TessellationMesh): number[] => {
  const indices: number[] = [];
  mesh.faces.forEach((face) => {
    if (face.length < 3) return;
    if (face.length === 3) {
      indices.push(face[0], face[1], face[2]);
      return;
    }
    const normal = computeFaceNormal(mesh.vertices, face);
    const axis = dominantAxis(normal);
    const projected = face.map((index) => projectTo2D(mesh.vertices[index], axis));
    const localIndices = face.map((_, idx) => idx);
    const triangles = triangulatePolygon2D(projected, localIndices);
    triangles.forEach((tri) => {
      indices.push(face[tri[0]], face[tri[1]], face[tri[2]]);
    });
  });
  return indices;
};

const buildTopology = (mesh: TessellationMesh) => {
  const vertexFaces: number[][] = Array.from(
    { length: mesh.vertices.length },
    () => []
  );
  const vertexNeighbors: Set<number>[] = Array.from(
    { length: mesh.vertices.length },
    () => new Set<number>()
  );
  const edgeMap = new Map<string, { a: number; b: number; faces: number[] }>();

  mesh.faces.forEach((face, faceIndex) => {
    face.forEach((vertexIndex) => {
      vertexFaces[vertexIndex]?.push(faceIndex);
    });
    for (let i = 0; i < face.length; i += 1) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      vertexNeighbors[a]?.add(b);
      vertexNeighbors[b]?.add(a);
      const key = edgeKey(a, b);
      const entry = edgeMap.get(key);
      if (entry) {
        entry.faces.push(faceIndex);
      } else {
        edgeMap.set(key, { a: Math.min(a, b), b: Math.max(a, b), faces: [faceIndex] });
      }
    }
  });

  const boundaryEdges = new Set<string>();
  const boundaryVertices = new Set<number>();
  edgeMap.forEach((edge, key) => {
    if (edge.faces.length === 1) {
      boundaryEdges.add(key);
      boundaryVertices.add(edge.a);
      boundaryVertices.add(edge.b);
    }
  });

  return { vertexFaces, vertexNeighbors, edgeMap, boundaryEdges, boundaryVertices };
};

export const subdivideLinear = (mesh: TessellationMesh): TessellationMesh => {
  if (mesh.faces.length === 0) return mesh;
  const newVertices = mesh.vertices.slice();
  const newUvs = mesh.uvs ? mesh.uvs.slice() : undefined;
  const edgePoints = new Map<string, number>();
  const facePoints: number[] = [];

  mesh.faces.forEach((face) => {
    const center = computeFaceCenter(mesh.vertices, face);
    const index = newVertices.length;
    newVertices.push(center);
    if (newUvs) {
      const centerUv = averageVec2(face.map((idx) => newUvs[idx] ?? { x: 0, y: 0 }));
      newUvs.push(centerUv);
    }
    facePoints.push(index);
  });

  mesh.faces.forEach((face) => {
    for (let i = 0; i < face.length; i += 1) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const key = edgeKey(a, b);
      if (edgePoints.has(key)) continue;
      const midpoint = lerp(mesh.vertices[a], mesh.vertices[b], 0.5);
      const index = newVertices.length;
      newVertices.push(midpoint);
      if (newUvs) {
        const uvA = newUvs[a] ?? { x: 0, y: 0 };
        const uvB = newUvs[b] ?? { x: 0, y: 0 };
        newUvs.push({ x: (uvA.x + uvB.x) * 0.5, y: (uvA.y + uvB.y) * 0.5 });
      }
      edgePoints.set(key, index);
    }
  });

  const newFaces: number[][] = [];
  mesh.faces.forEach((face, faceIndex) => {
    const facePointIndex = facePoints[faceIndex];
    for (let i = 0; i < face.length; i += 1) {
      const prev = face[(i - 1 + face.length) % face.length];
      const current = face[i];
      const next = face[(i + 1) % face.length];
      const edgePrev = edgePoints.get(edgeKey(prev, current));
      const edgeNext = edgePoints.get(edgeKey(current, next));
      if (edgePrev == null || edgeNext == null) continue;
      newFaces.push([current, edgeNext, facePointIndex, edgePrev]);
    }
  });

  return { vertices: newVertices, faces: newFaces, uvs: newUvs };
};

export const subdivideCatmullClark = (
  mesh: TessellationMesh,
  options?: { preserveBoundary?: boolean }
): TessellationMesh => {
  if (mesh.faces.length === 0) return mesh;
  const preserveBoundary = options?.preserveBoundary ?? false;
  const { vertexFaces, edgeMap, boundaryEdges, boundaryVertices } = buildTopology(mesh);

  const facePoints = mesh.faces.map((face) => computeFaceCenter(mesh.vertices, face));
  const faceUvs = mesh.uvs
    ? mesh.faces.map((face) => averageVec2(face.map((idx) => mesh.uvs![idx] ?? { x: 0, y: 0 })))
    : null;

  const edgePointIndices = new Map<string, number>();
  const edgePoints: Vec3[] = [];
  const edgeUvs: Vec2[] = [];

  edgeMap.forEach((edge, key) => {
    const v1 = mesh.vertices[edge.a];
    const v2 = mesh.vertices[edge.b];
    let point = lerp(v1, v2, 0.5);
    let uvPoint: Vec2 | null = null;
    if (mesh.uvs) {
      const uv1 = mesh.uvs[edge.a] ?? { x: 0, y: 0 };
      const uv2 = mesh.uvs[edge.b] ?? { x: 0, y: 0 };
      uvPoint = { x: (uv1.x + uv2.x) * 0.5, y: (uv1.y + uv2.y) * 0.5 };
    }
    if (edge.faces.length === 2 && (!preserveBoundary || !boundaryEdges.has(key))) {
      const f1 = facePoints[edge.faces[0]];
      const f2 = facePoints[edge.faces[1]];
      point = scale(add(add(v1, v2), add(f1, f2)), 0.25);
      if (mesh.uvs && faceUvs) {
        const uvF1 = faceUvs[edge.faces[0]];
        const uvF2 = faceUvs[edge.faces[1]];
        const uv1 = mesh.uvs[edge.a] ?? { x: 0, y: 0 };
        const uv2 = mesh.uvs[edge.b] ?? { x: 0, y: 0 };
        uvPoint = {
          x: (uv1.x + uv2.x + uvF1.x + uvF2.x) * 0.25,
          y: (uv1.y + uv2.y + uvF1.y + uvF2.y) * 0.25,
        };
      }
    }
    edgePointIndices.set(key, mesh.vertices.length + edgePoints.length);
    edgePoints.push(point);
    if (uvPoint) edgeUvs.push(uvPoint);
  });

  const newVertices: Vec3[] = [];
  const newUvs: Vec2[] = [];
  mesh.vertices.forEach((vertex, vertexIndex) => {
    if (preserveBoundary && boundaryVertices.has(vertexIndex)) {
      const boundaryNeighbors: number[] = [];
      edgeMap.forEach((edge, key) => {
        if (!boundaryEdges.has(key)) return;
        if (edge.a === vertexIndex) boundaryNeighbors.push(edge.b);
        if (edge.b === vertexIndex) boundaryNeighbors.push(edge.a);
      });
      if (boundaryNeighbors.length >= 2) {
        const neighborA = mesh.vertices[boundaryNeighbors[0]];
        const neighborB = mesh.vertices[boundaryNeighbors[1]];
        const nextPoint = add(scale(vertex, 0.75), scale(add(neighborA, neighborB), 0.125));
        newVertices.push(nextPoint);
        if (mesh.uvs) {
          const uvA = mesh.uvs[boundaryNeighbors[0]] ?? { x: 0, y: 0 };
          const uvB = mesh.uvs[boundaryNeighbors[1]] ?? { x: 0, y: 0 };
          const uv = mesh.uvs[vertexIndex] ?? { x: 0, y: 0 };
          newUvs.push({
            x: uv.x * 0.75 + (uvA.x + uvB.x) * 0.125,
            y: uv.y * 0.75 + (uvA.y + uvB.y) * 0.125,
          });
        }
        return;
      }
    }
    const faces = vertexFaces[vertexIndex] ?? [];
    if (faces.length === 0) {
      newVertices.push(vertex);
      if (mesh.uvs) newUvs.push(mesh.uvs[vertexIndex] ?? { x: 0, y: 0 });
      return;
    }
    const facePointAvg = averageVec3(faces.map((faceIndex) => facePoints[faceIndex]));
    const edgeMidpoints: Vec3[] = [];
    const edgeUvMidpoints: Vec2[] = [];
    edgeMap.forEach((edge) => {
      if (edge.a === vertexIndex || edge.b === vertexIndex) {
        edgeMidpoints.push(lerp(mesh.vertices[edge.a], mesh.vertices[edge.b], 0.5));
        if (mesh.uvs) {
          const uvA = mesh.uvs[edge.a] ?? { x: 0, y: 0 };
          const uvB = mesh.uvs[edge.b] ?? { x: 0, y: 0 };
          edgeUvMidpoints.push({ x: (uvA.x + uvB.x) * 0.5, y: (uvA.y + uvB.y) * 0.5 });
        }
      }
    });
    const edgeAvg = averageVec3(edgeMidpoints);
    const n = faces.length;
    const nextPoint = scale(
      add(add(facePointAvg, scale(edgeAvg, 2)), scale(vertex, n - 3)),
      1 / n
    );
    newVertices.push(nextPoint);
    if (mesh.uvs && faceUvs) {
      const faceUvAvg = averageVec2(faces.map((faceIndex) => faceUvs[faceIndex]));
      const edgeUvAvg = averageVec2(edgeUvMidpoints);
      const uv = mesh.uvs[vertexIndex] ?? { x: 0, y: 0 };
      newUvs.push({
        x: (faceUvAvg.x + 2 * edgeUvAvg.x + (n - 3) * uv.x) / n,
        y: (faceUvAvg.y + 2 * edgeUvAvg.y + (n - 3) * uv.y) / n,
      });
    }
  });

  newVertices.push(...edgePoints);
  if (mesh.uvs && edgeUvs.length > 0) {
    newUvs.push(...edgeUvs);
  }
  const facePointIndices: number[] = [];
  facePoints.forEach((point, faceIndex) => {
    facePointIndices[faceIndex] = newVertices.length;
    newVertices.push(point);
    if (mesh.uvs && faceUvs) {
      newUvs.push(faceUvs[faceIndex]);
    }
  });

  const newFaces: number[][] = [];
  mesh.faces.forEach((face, faceIndex) => {
    const facePointIndex = facePointIndices[faceIndex];
    for (let i = 0; i < face.length; i += 1) {
      const prev = face[(i - 1 + face.length) % face.length];
      const current = face[i];
      const next = face[(i + 1) % face.length];
      const edgePrev = edgePointIndices.get(edgeKey(prev, current));
      const edgeNext = edgePointIndices.get(edgeKey(current, next));
      if (edgePrev == null || edgeNext == null) continue;
      newFaces.push([
        current,
        edgeNext,
        facePointIndex,
        edgePrev,
      ]);
    }
  });

  return {
    vertices: newVertices,
    faces: newFaces,
    uvs: mesh.uvs ? newUvs : undefined,
  };
};

export const subdivideLoop = (mesh: TessellationMesh): TessellationMesh => {
  if (mesh.faces.length === 0) return mesh;
  const triangleFaces = triangulateFaces(mesh)
    .reduce((faces, _, idx, arr) => {
      if (idx % 3 === 0) {
        faces.push([arr[idx], arr[idx + 1], arr[idx + 2]]);
      }
      return faces;
    }, [] as number[][]);

  const edgeMap = new Map<
    string,
    { a: number; b: number; opposites: number[]; faces: number[] }
  >();
  const vertexNeighbors: Set<number>[] = Array.from(
    { length: mesh.vertices.length },
    () => new Set<number>()
  );

  triangleFaces.forEach((face, faceIndex) => {
    const [a, b, c] = face;
    const edges: Array<[number, number, number]> = [
      [a, b, c],
      [b, c, a],
      [c, a, b],
    ];
    edges.forEach(([v1, v2, opposite]) => {
      const key = edgeKey(v1, v2);
      const entry = edgeMap.get(key);
      if (entry) {
        entry.opposites.push(opposite);
        entry.faces.push(faceIndex);
      } else {
        edgeMap.set(key, { a: Math.min(v1, v2), b: Math.max(v1, v2), opposites: [opposite], faces: [faceIndex] });
      }
      vertexNeighbors[v1]?.add(v2);
      vertexNeighbors[v2]?.add(v1);
    });
  });

  const boundaryVertices = new Set<number>();
  const boundaryNeighbors: Map<number, number[]> = new Map();
  edgeMap.forEach((edge, key) => {
    if (edge.opposites.length === 1) {
      boundaryVertices.add(edge.a);
      boundaryVertices.add(edge.b);
      boundaryNeighbors.set(edge.a, [...(boundaryNeighbors.get(edge.a) ?? []), edge.b]);
      boundaryNeighbors.set(edge.b, [...(boundaryNeighbors.get(edge.b) ?? []), edge.a]);
    }
  });

  const newVertices: Vec3[] = [];
  const newUvs: Vec2[] = [];
  mesh.vertices.forEach((vertex, index) => {
    if (boundaryVertices.has(index)) {
      const neighbors = boundaryNeighbors.get(index) ?? [];
      if (neighbors.length >= 2) {
        const neighborA = mesh.vertices[neighbors[0]];
        const neighborB = mesh.vertices[neighbors[1]];
        newVertices.push(add(scale(vertex, 0.75), scale(add(neighborA, neighborB), 0.125)));
        if (mesh.uvs) {
          const uv = mesh.uvs[index] ?? { x: 0, y: 0 };
          const uvA = mesh.uvs[neighbors[0]] ?? { x: 0, y: 0 };
          const uvB = mesh.uvs[neighbors[1]] ?? { x: 0, y: 0 };
          newUvs.push({
            x: uv.x * 0.75 + (uvA.x + uvB.x) * 0.125,
            y: uv.y * 0.75 + (uvA.y + uvB.y) * 0.125,
          });
        }
        return;
      }
    }
    const neighbors = Array.from(vertexNeighbors[index] ?? []);
    const n = neighbors.length;
    if (n === 0) {
      newVertices.push(vertex);
      if (mesh.uvs) newUvs.push(mesh.uvs[index] ?? { x: 0, y: 0 });
      return;
    }
    const beta = n === 3 ? 3 / 16 : 3 / (8 * n);
    const sum = neighbors.reduce((acc, neighbor) => add(acc, mesh.vertices[neighbor]), {
      x: 0,
      y: 0,
      z: 0,
    });
    const nextPoint = add(scale(vertex, 1 - n * beta), scale(sum, beta));
    newVertices.push(nextPoint);
    if (mesh.uvs) {
      const uvSum = neighbors.reduce(
        (acc, neighbor) => {
          const uv = mesh.uvs![neighbor] ?? { x: 0, y: 0 };
          return { x: acc.x + uv.x, y: acc.y + uv.y };
        },
        { x: 0, y: 0 }
      );
      const uv = mesh.uvs[index] ?? { x: 0, y: 0 };
      newUvs.push({
        x: uv.x * (1 - n * beta) + uvSum.x * beta,
        y: uv.y * (1 - n * beta) + uvSum.y * beta,
      });
    }
  });

  const edgePointIndex = new Map<string, number>();
  const edgeUvs: Vec2[] = [];
  edgeMap.forEach((edge, key) => {
    const v1 = mesh.vertices[edge.a];
    const v2 = mesh.vertices[edge.b];
    let point = lerp(v1, v2, 0.5);
    if (edge.opposites.length === 2) {
      const v3 = mesh.vertices[edge.opposites[0]];
      const v4 = mesh.vertices[edge.opposites[1]];
      point = add(
        scale(add(v1, v2), 3 / 8),
        scale(add(v3, v4), 1 / 8)
      );
    }
    const index = newVertices.length + edgePointIndex.size;
    edgePointIndex.set(key, index);
    if (mesh.uvs) {
      const uvA = mesh.uvs[edge.a] ?? { x: 0, y: 0 };
      const uvB = mesh.uvs[edge.b] ?? { x: 0, y: 0 };
      let uv = { x: (uvA.x + uvB.x) * 0.5, y: (uvA.y + uvB.y) * 0.5 };
      if (edge.opposites.length === 2) {
        const uvC = mesh.uvs[edge.opposites[0]] ?? { x: 0, y: 0 };
        const uvD = mesh.uvs[edge.opposites[1]] ?? { x: 0, y: 0 };
        uv = {
          x: (uvA.x + uvB.x) * (3 / 8) + (uvC.x + uvD.x) * (1 / 8),
          y: (uvA.y + uvB.y) * (3 / 8) + (uvC.y + uvD.y) * (1 / 8),
        };
      }
      edgeUvs.push(uv);
    }
  });

  const edgePoints: Vec3[] = [];
  edgeMap.forEach((edge, key) => {
    const index = edgePointIndex.get(key);
    if (index == null) return;
    const v1 = mesh.vertices[edge.a];
    const v2 = mesh.vertices[edge.b];
    let point = lerp(v1, v2, 0.5);
    if (edge.opposites.length === 2) {
      const v3 = mesh.vertices[edge.opposites[0]];
      const v4 = mesh.vertices[edge.opposites[1]];
      point = add(
        scale(add(v1, v2), 3 / 8),
        scale(add(v3, v4), 1 / 8)
      );
    }
    edgePoints.push(point);
  });

  newVertices.push(...edgePoints);
  if (mesh.uvs) {
    newUvs.push(...edgeUvs);
  }

  const newFaces: number[][] = [];
  triangleFaces.forEach((face) => {
    const [a, b, c] = face;
    const ab = edgePointIndex.get(edgeKey(a, b));
    const bc = edgePointIndex.get(edgeKey(b, c));
    const ca = edgePointIndex.get(edgeKey(c, a));
    if (ab == null || bc == null || ca == null) return;
    newFaces.push([a, ab, ca]);
    newFaces.push([b, bc, ab]);
    newFaces.push([c, ca, bc]);
    newFaces.push([ab, bc, ca]);
  });

  return { vertices: newVertices, faces: newFaces, uvs: mesh.uvs ? newUvs : undefined };
};

export const subdivideAdaptive = (
  mesh: TessellationMesh,
  options: { maxEdgeLength?: number; curvatureTolerance?: number; faceIndices?: number[] }
): TessellationMesh => {
  if (mesh.faces.length === 0) return mesh;
  const triangleFaces = triangulateFaces(mesh)
    .reduce((faces, _, idx, arr) => {
      if (idx % 3 === 0) {
        faces.push([arr[idx], arr[idx + 1], arr[idx + 2]]);
      }
      return faces;
    }, [] as number[][]);

  const maxEdgeLength = options.maxEdgeLength ?? Infinity;
  const curvatureTolerance = options.curvatureTolerance ?? Infinity;
  const selectedFaces = new Set(options.faceIndices ?? []);
  const faceNormals = triangleFaces.map((face) => computeFaceNormal(mesh.vertices, face));

  const edgeInfo = new Map<string, { a: number; b: number; faces: number[] }>();
  triangleFaces.forEach((face, faceIndex) => {
    for (let i = 0; i < 3; i += 1) {
      const a = face[i];
      const b = face[(i + 1) % 3];
      const key = edgeKey(a, b);
      const entry = edgeInfo.get(key);
      if (entry) {
        entry.faces.push(faceIndex);
      } else {
        edgeInfo.set(key, { a: Math.min(a, b), b: Math.max(a, b), faces: [faceIndex] });
      }
    }
  });

  const edgeSplit = new Map<string, boolean>();
  edgeInfo.forEach((edge, key) => {
    const v1 = mesh.vertices[edge.a];
    const v2 = mesh.vertices[edge.b];
    const length = distance(v1, v2);
    let split = length > maxEdgeLength;
    if (!split && edge.faces.length === 2 && Number.isFinite(curvatureTolerance)) {
      const n1 = faceNormals[edge.faces[0]];
      const n2 = faceNormals[edge.faces[1]];
      const angle = Math.acos(clamp(dot(n1, n2), -1, 1));
      if (angle > curvatureTolerance) {
        split = true;
      }
    }
    if (!split && selectedFaces.size > 0) {
      split = edge.faces.some((faceIndex) => selectedFaces.has(faceIndex));
    }
    edgeSplit.set(key, split);
  });

  const newVertices = mesh.vertices.slice();
  const newUvs = mesh.uvs ? mesh.uvs.slice() : undefined;
  const midpointIndex = new Map<string, number>();

  edgeInfo.forEach((edge, key) => {
    if (!edgeSplit.get(key)) return;
    const midpoint = lerp(mesh.vertices[edge.a], mesh.vertices[edge.b], 0.5);
    const index = newVertices.length;
    newVertices.push(midpoint);
    if (newUvs) {
      const uvA = newUvs[edge.a] ?? { x: 0, y: 0 };
      const uvB = newUvs[edge.b] ?? { x: 0, y: 0 };
      newUvs.push({ x: (uvA.x + uvB.x) * 0.5, y: (uvA.y + uvB.y) * 0.5 });
    }
    midpointIndex.set(key, index);
  });

  const newFaces: number[][] = [];
  triangleFaces.forEach((face) => {
    const [a, b, c] = face;
    const edges: Array<[number, number]> = [
      [a, b],
      [b, c],
      [c, a],
    ];
    const polygon: number[] = [];
    edges.forEach(([u, v]) => {
      polygon.push(u);
      const key = edgeKey(u, v);
      const mid = midpointIndex.get(key);
      if (mid != null) {
        polygon.push(mid);
      }
    });
    if (polygon.length < 3) return;
    const root = polygon[0];
    for (let i = 1; i + 1 < polygon.length; i += 1) {
      newFaces.push([root, polygon[i], polygon[i + 1]]);
    }
  });

  return { vertices: newVertices, faces: newFaces, uvs: newUvs };
};

export const dualMesh = (mesh: TessellationMesh): TessellationMesh => {
  if (mesh.faces.length === 0) return mesh;
  const faceCenters = mesh.faces.map((face) => computeFaceCenter(mesh.vertices, face));
  const faceUvs = mesh.uvs
    ? mesh.faces.map((face) => averageVec2(face.map((idx) => mesh.uvs![idx] ?? { x: 0, y: 0 })))
    : undefined;
  const { vertexFaces } = buildTopology(mesh);

  const newFaces: number[][] = [];
  const newUvs: Vec2[] = [];
  vertexFaces.forEach((faces, vertexIndex) => {
    if (faces.length < 3) return;
    const vertex = mesh.vertices[vertexIndex];
    const normal = normalize(
      faces
        .map((faceIndex) => computeFaceNormal(mesh.vertices, mesh.faces[faceIndex]))
        .reduce((acc, n) => add(acc, n), { x: 0, y: 0, z: 0 })
    );
    const axis = Math.abs(normal.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    const tangent = normalize(cross(axis, normal));
    const bitangent = cross(normal, tangent);
    const sorted = faces
      .map((faceIndex) => {
        const center = faceCenters[faceIndex];
        const vec = sub(center, vertex);
        const angle = Math.atan2(dot(vec, bitangent), dot(vec, tangent));
        return { faceIndex, angle };
      })
      .sort((a, b) => a.angle - b.angle);
    const faceIndices = sorted.map((entry) => entry.faceIndex);
    newFaces.push(faceIndices);
    if (faceUvs) {
      newUvs[vertexIndex] = averageVec2(faceIndices.map((idx) => faceUvs[idx]));
    }
  });

  return { vertices: faceCenters, faces: newFaces, uvs: faceUvs ? newUvs : undefined };
};

export const insetFaces = (
  mesh: TessellationMesh,
  amount: number | number[],
  options?: { faceIndices?: number[] }
): TessellationInsetResult => {
  const faceIndices = options?.faceIndices ? new Set(options.faceIndices) : null;
  const newVertices = mesh.vertices.slice();
  const newUvs = mesh.uvs ? mesh.uvs.slice() : undefined;
  const newFaces: number[][] = [];
  const innerFaces: number[] = [];
  const borderFaces: number[] = [];

  mesh.faces.forEach((face, faceIndex) => {
    if (face.length < 3) return;
    if (faceIndices && !faceIndices.has(faceIndex)) {
      newFaces.push(face.slice());
      return;
    }
    const center = computeFaceCenter(mesh.vertices, face);
    const centerUv = newUvs ? averageVec2(face.map((idx) => newUvs[idx] ?? { x: 0, y: 0 })) : null;
    const insetAmount = Array.isArray(amount)
      ? amount[faceIndex] ?? amount[0] ?? 0
      : amount;
    const insetIndices = face.map((vertexIndex) => {
      const vertex = mesh.vertices[vertexIndex];
      const inset = lerp(vertex, center, insetAmount);
      const index = newVertices.length;
      newVertices.push(inset);
      if (newUvs) {
        const uv = newUvs[vertexIndex] ?? { x: 0, y: 0 };
        const target = centerUv ?? uv;
        newUvs.push(lerpVec2(uv, target, insetAmount));
      }
      return index;
    });

    innerFaces.push(newFaces.length);
    newFaces.push(insetIndices);

    for (let i = 0; i < face.length; i += 1) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const insetA = insetIndices[i];
      const insetB = insetIndices[(i + 1) % insetIndices.length];
      borderFaces.push(newFaces.length);
      newFaces.push([a, b, insetB, insetA]);
    }
  });

  return { mesh: { vertices: newVertices, faces: newFaces, uvs: newUvs }, innerFaces, borderFaces };
};

export const extrudeFaces = (
  mesh: TessellationMesh,
  faceIndices: number[] | null,
  distance: number | number[],
  options?: { direction?: Vec3; mode?: "normal" | "fixed-axis" }
): TessellationMesh => {
  const faceSet = faceIndices ? new Set(faceIndices) : null;
  const newVertices = mesh.vertices.slice();
  const newUvs = mesh.uvs ? mesh.uvs.slice() : undefined;
  const newFaces: number[][] = [];

  mesh.faces.forEach((face, faceIndex) => {
    if (face.length < 3) return;
    const shouldExtrude = !faceSet || faceSet.has(faceIndex);
    if (!shouldExtrude) {
      newFaces.push(face.slice());
      return;
    }
    const baseDistance = Array.isArray(distance)
      ? distance[faceIndex] ?? distance[0] ?? 0
      : distance;
    if (Math.abs(baseDistance) < EPSILON) {
      newFaces.push(face.slice());
      return;
    }
    const normal = options?.mode === "fixed-axis" && options.direction
      ? normalize(options.direction)
      : computeFaceNormal(mesh.vertices, face);
    const offset = scale(normal, baseDistance);
    const extrudedIndices = face.map((vertexIndex) => {
      const vertex = mesh.vertices[vertexIndex];
      const extruded = add(vertex, offset);
      const index = newVertices.length;
      newVertices.push(extruded);
      if (newUvs) {
        const uv = newUvs[vertexIndex] ?? { x: 0, y: 0 };
        newUvs.push({ x: uv.x, y: uv.y });
      }
      return index;
    });
    newFaces.push(face.slice());
    newFaces.push(extrudedIndices);
    for (let i = 0; i < face.length; i += 1) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const a2 = extrudedIndices[i];
      const b2 = extrudedIndices[(i + 1) % extrudedIndices.length];
      newFaces.push([a, b, b2, a2]);
    }
  });

  return { vertices: newVertices, faces: newFaces, uvs: newUvs };
};

export const meshRelax = (
  mesh: TessellationMesh,
  iterations: number,
  strength: number,
  preserveBoundary: boolean
): TessellationMesh => {
  if (mesh.faces.length === 0 || iterations <= 0 || strength <= 0) return mesh;
  const { vertexNeighbors, boundaryVertices } = buildTopology(mesh);
  let vertices = mesh.vertices.slice();
  for (let iter = 0; iter < iterations; iter += 1) {
    const next = vertices.map((vertex, index) => {
      if (preserveBoundary && boundaryVertices.has(index)) return vertex;
      const neighbors = Array.from(vertexNeighbors[index] ?? []);
      if (neighbors.length === 0) return vertex;
      const avg = averageVec3(neighbors.map((neighbor) => vertices[neighbor]));
      return lerp(vertex, avg, strength);
    });
    vertices = next;
  }
  return { vertices, faces: mesh.faces.slice(), uvs: mesh.uvs };
};

export const selectFaces = (
  mesh: TessellationMesh,
  criteria: "area" | "normal-direction" | "index-pattern",
  options: { threshold: number; direction?: Vec3; step?: number; offset?: number }
) => {
  const selected: number[] = [];
  const threshold = options.threshold;
  if (criteria === "index-pattern") {
    const step = Math.max(1, Math.round(options.step ?? threshold ?? 1));
    const offset = Math.max(0, Math.round(options.offset ?? 0));
    mesh.faces.forEach((_, index) => {
      if ((index + offset) % step === 0) selected.push(index);
    });
    return selected;
  }
  if (criteria === "normal-direction") {
    const direction = normalize(options.direction ?? { x: 0, y: 1, z: 0 });
    mesh.faces.forEach((face, index) => {
      const normal = computeFaceNormal(mesh.vertices, face);
      const alignment = dot(normal, direction);
      if (alignment >= threshold) selected.push(index);
    });
    return selected;
  }
  mesh.faces.forEach((face, index) => {
    const area = computeFaceArea(mesh.vertices, face);
    if (area >= threshold) selected.push(index);
  });
  return selected;
};

export const offsetPattern = (
  mesh: TessellationMesh,
  insetAmount: number,
  extrudeDepth: number,
  borderWidth: number
): TessellationMesh => {
  const frameAmount = borderWidth > 0 ? borderWidth : insetAmount;
  const frame = insetFaces(mesh, frameAmount);
  if (borderWidth > 0 && insetAmount > 0) {
    const panel = insetFaces(frame.mesh, insetAmount, { faceIndices: frame.innerFaces });
    return extrudeFaces(panel.mesh, panel.innerFaces, extrudeDepth, { mode: "normal" });
  }
  return extrudeFaces(frame.mesh, frame.innerFaces, extrudeDepth, { mode: "normal" });
};

export const generateGeodesicSphere = (
  radius: number,
  frequency: number,
  method: "icosahedron" | "octahedron"
): TessellationMesh => {
  const base = method === "octahedron" ? buildOctahedron() : buildIcosahedron();
  const freq = Math.max(1, Math.round(frequency));
  const vertices: Vec3[] = [];
  const faces: number[][] = [];
  const vertexMap = new Map<string, number>();
  const addVertex = (point: Vec3) => {
    const normalized = normalize(point);
    const scaled = scale(normalized, radius);
    const key = `${Math.round(scaled.x * 1e6)}:${Math.round(scaled.y * 1e6)}:${Math.round(scaled.z * 1e6)}`;
    const existing = vertexMap.get(key);
    if (existing != null) return existing;
    const index = vertices.length;
    vertices.push(scaled);
    vertexMap.set(key, index);
    return index;
  };

  base.faces.forEach((face) => {
    const v0 = base.vertices[face[0]];
    const v1 = base.vertices[face[1]];
    const v2 = base.vertices[face[2]];
    const grid: number[][] = [];
    for (let i = 0; i <= freq; i += 1) {
      grid[i] = [];
      for (let j = 0; j <= freq - i; j += 1) {
        const k = freq - i - j;
        const point = scale(add(add(scale(v0, i), scale(v1, j)), scale(v2, k)), 1 / freq);
        grid[i][j] = addVertex(point);
      }
    }
    for (let i = 0; i < freq; i += 1) {
      for (let j = 0; j < freq - i; j += 1) {
        const a = grid[i][j];
        const b = grid[i + 1][j];
        const c = grid[i][j + 1];
        faces.push([a, b, c]);
        if (j + 1 <= freq - i - 1) {
          const d = grid[i + 1][j + 1];
          faces.push([b, d, c]);
        }
      }
    }
  });

  return { vertices, faces };
};

const buildIcosahedron = () => {
  const phi = (1 + Math.sqrt(5)) / 2;
  const vertices: Vec3[] = [
    { x: -1, y: phi, z: 0 },
    { x: 1, y: phi, z: 0 },
    { x: -1, y: -phi, z: 0 },
    { x: 1, y: -phi, z: 0 },
    { x: 0, y: -1, z: phi },
    { x: 0, y: 1, z: phi },
    { x: 0, y: -1, z: -phi },
    { x: 0, y: 1, z: -phi },
    { x: phi, y: 0, z: -1 },
    { x: phi, y: 0, z: 1 },
    { x: -phi, y: 0, z: -1 },
    { x: -phi, y: 0, z: 1 },
  ].map((v) => normalize(v));

  const faces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];

  return { vertices, faces };
};

const buildOctahedron = () => {
  const vertices: Vec3[] = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
  ].map((v) => normalize(v));
  const faces = [
    [0, 2, 4],
    [2, 1, 4],
    [1, 3, 4],
    [3, 0, 4],
    [2, 0, 5],
    [1, 2, 5],
    [3, 1, 5],
    [0, 3, 5],
  ];
  return { vertices, faces };
};

export const generateHexagonalTiling = (
  origin: Vec3,
  xAxis: Vec3,
  yAxis: Vec3,
  bounds: { min: Vec2; max: Vec2 },
  cellSize: number,
  rotationDeg: number
): TessellationMesh => {
  const vertices: Vec3[] = [];
  const faces: number[][] = [];
  if (cellSize <= 0) return { vertices, faces };
  const rotation = (rotationDeg * Math.PI) / 180;

  const hexRadius = cellSize;
  const hexWidth = hexRadius * 2;
  const hexHeight = Math.sqrt(3) * hexRadius;
  const horiz = hexWidth * 0.75;
  const vert = hexHeight;

  const minX = bounds.min.x - hexWidth;
  const maxX = bounds.max.x + hexWidth;
  const minY = bounds.min.y - hexHeight;
  const maxY = bounds.max.y + hexHeight;

  let row = 0;
  for (let y = minY; y <= maxY; y += vert) {
    const offset = row % 2 === 0 ? 0 : horiz * 0.5;
    for (let x = minX + offset; x <= maxX; x += horiz) {
      const center = { x, y };
      const faceIndices: number[] = [];
      for (let i = 0; i < 6; i += 1) {
        const angle = rotation + (Math.PI / 3) * i;
        const local = {
          x: center.x + hexRadius * Math.cos(angle),
          y: center.y + hexRadius * Math.sin(angle),
        };
        const position = add(
          origin,
          add(scale(xAxis, local.x), scale(yAxis, local.y))
        );
        faceIndices.push(vertices.length);
        vertices.push(position);
      }
      faces.push(faceIndices);
    }
    row += 1;
  }

  return { vertices, faces };
};

type VoronoiCell = { seed: Vec2; polygon: Vec2[] };

const clipPolygon = (polygon: Vec2[], point: Vec2, normal: Vec2) => {
  const output: Vec2[] = [];
  if (polygon.length === 0) return output;
  const isInside = (p: Vec2) => (p.x - point.x) * normal.x + (p.y - point.y) * normal.y <= EPSILON;
  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    const currentInside = isInside(current);
    const nextInside = isInside(next);
    if (currentInside && nextInside) {
      output.push(next);
    } else if (currentInside && !nextInside) {
      const intersection = intersectSegmentPlane(current, next, point, normal);
      if (intersection) output.push(intersection);
    } else if (!currentInside && nextInside) {
      const intersection = intersectSegmentPlane(current, next, point, normal);
      if (intersection) output.push(intersection);
      output.push(next);
    }
  }
  return output;
};

const intersectSegmentPlane = (a: Vec2, b: Vec2, point: Vec2, normal: Vec2) => {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const denom = ab.x * normal.x + ab.y * normal.y;
  if (Math.abs(denom) < EPSILON) return null;
  const t = ((point.x - a.x) * normal.x + (point.y - a.y) * normal.y) / denom;
  if (t < -EPSILON || t > 1 + EPSILON) return null;
  return { x: a.x + ab.x * t, y: a.y + ab.y * t };
};

export const generateVoronoiPattern = (
  origin: Vec3,
  xAxis: Vec3,
  yAxis: Vec3,
  bounds: { min: Vec2; max: Vec2 },
  seeds: Vec2[],
  relaxIterations: number
): TessellationMesh => {
  if (seeds.length === 0) return { vertices: [], faces: [] };
  let workingSeeds = seeds.slice();
  const boundingPolygon: Vec2[] = [
    { x: bounds.min.x, y: bounds.min.y },
    { x: bounds.max.x, y: bounds.min.y },
    { x: bounds.max.x, y: bounds.max.y },
    { x: bounds.min.x, y: bounds.max.y },
  ];

  const computeCells = (inputSeeds: Vec2[]) =>
    inputSeeds.map((seed) => {
      let polygon = boundingPolygon.slice();
      inputSeeds.forEach((other) => {
        if (other === seed) return;
        const midpoint = { x: (seed.x + other.x) * 0.5, y: (seed.y + other.y) * 0.5 };
        const normal = normalizeVec2({ x: other.x - seed.x, y: other.y - seed.y });
        polygon = clipPolygon(polygon, midpoint, normal);
      });
      return { seed, polygon } satisfies VoronoiCell;
    });

  for (let i = 0; i < relaxIterations; i += 1) {
    const cells = computeCells(workingSeeds);
    workingSeeds = cells.map((cell) =>
      cell.polygon.length > 0
        ? averageVec2(cell.polygon)
        : cell.seed
    );
  }

  const cells = computeCells(workingSeeds);
  const vertices: Vec3[] = [];
  const faces: number[][] = [];
  cells.forEach((cell) => {
    if (cell.polygon.length < 3) return;
    const faceIndices: number[] = [];
    cell.polygon.forEach((point) => {
      const position = add(
        origin,
        add(scale(xAxis, point.x), scale(yAxis, point.y))
      );
      faceIndices.push(vertices.length);
      vertices.push(position);
    });
    faces.push(faceIndices);
  });

  return { vertices, faces };
};

export const computeMeshBounds = (vertices: Vec3[]) => {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  vertices.forEach((vertex) => {
    minX = Math.min(minX, vertex.x);
    minY = Math.min(minY, vertex.y);
    minZ = Math.min(minZ, vertex.z);
    maxX = Math.max(maxX, vertex.x);
    maxY = Math.max(maxY, vertex.y);
    maxZ = Math.max(maxZ, vertex.z);
  });
  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
};

export const generateMeshUVs = (
  mesh: TessellationMesh,
  mode: "planar" | "cylindrical" | "spherical",
  axis?: Vec3
): TessellationMesh => {
  if (mesh.vertices.length === 0) return mesh;
  if (mode === "planar") {
    const plane = computeBestFitPlane(mesh.vertices);
    const projected = mesh.vertices.map((vertex) => projectPointToPlane(vertex, plane));
    let minU = Number.POSITIVE_INFINITY;
    let maxU = Number.NEGATIVE_INFINITY;
    let minV = Number.POSITIVE_INFINITY;
    let maxV = Number.NEGATIVE_INFINITY;
    projected.forEach((point) => {
      minU = Math.min(minU, point.u);
      maxU = Math.max(maxU, point.u);
      minV = Math.min(minV, point.v);
      maxV = Math.max(maxV, point.v);
    });
    const rangeU = maxU - minU || 1;
    const rangeV = maxV - minV || 1;
    const uvs = projected.map((point) => ({
      x: (point.u - minU) / rangeU,
      y: (point.v - minV) / rangeV,
    }));
    return { ...mesh, uvs };
  }
  if (mode === "cylindrical") {
    const direction = normalize(axis ?? { x: 0, y: 1, z: 0 });
    const reference = Math.abs(direction.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 0, z: 1 };
    const tangent = normalize(cross(reference, direction));
    const bitangent = cross(direction, tangent);
    let minH = Number.POSITIVE_INFINITY;
    let maxH = Number.NEGATIVE_INFINITY;
    const heights = mesh.vertices.map((vertex) => {
      const h = dot(vertex, direction);
      minH = Math.min(minH, h);
      maxH = Math.max(maxH, h);
      return h;
    });
    const rangeH = maxH - minH || 1;
    const uvs = mesh.vertices.map((vertex, index) => {
      const radial = sub(vertex, scale(direction, heights[index]));
      const angle = Math.atan2(dot(radial, bitangent), dot(radial, tangent));
      const u = (angle / (2 * Math.PI) + 1) % 1;
      const v = (heights[index] - minH) / rangeH;
      return { x: u, y: v };
    });
    return { ...mesh, uvs };
  }
  const bounds = computeMeshBounds(mesh.vertices);
  const center = scale(add(bounds.min, bounds.max), 0.5);
  const uvs = mesh.vertices.map((vertex) => {
    const vec = sub(vertex, center);
    const radius = Math.sqrt(dot(vec, vec)) || 1;
    const u = (Math.atan2(vec.z, vec.x) / (2 * Math.PI) + 1) % 1;
    const v = Math.acos(clamp(vec.y / radius, -1, 1)) / Math.PI;
    return { x: u, y: v };
  });
  return { ...mesh, uvs };
};

export const weldVertices = (
  mesh: TessellationMesh,
  tolerance: number
): TessellationMesh => {
  if (tolerance <= 0) return mesh;
  const map = new Map<string, number>();
  const vertices: Vec3[] = [];
  const uvs: Vec2[] = [];
  const remap: number[] = [];
  mesh.vertices.forEach((vertex, index) => {
    const key = `${Math.round(vertex.x / tolerance)}:${Math.round(vertex.y / tolerance)}:${Math.round(vertex.z / tolerance)}`;
    const existing = map.get(key);
    if (existing != null) {
      remap[index] = existing;
      return;
    }
    const nextIndex = vertices.length;
    vertices.push(vertex);
    if (mesh.uvs) {
      uvs.push(mesh.uvs[index] ?? { x: 0, y: 0 });
    }
    map.set(key, nextIndex);
    remap[index] = nextIndex;
  });
  const faces = mesh.faces
    .map((face) => face.map((idx) => remap[idx]))
    .filter((face) => new Set(face).size >= 3);
  return { vertices, faces, uvs: mesh.uvs ? uvs : undefined };
};

export const repairMesh = (
  mesh: TessellationMesh,
  options: { fillHoles: boolean; weldTolerance: number }
): TessellationMesh => {
  let repaired = mesh;
  if (options.weldTolerance > 0) {
    repaired = weldVertices(repaired, options.weldTolerance);
  }
  repaired = {
    ...repaired,
    faces: repaired.faces.filter((face) => new Set(face).size >= 3),
  };
  if (!options.fillHoles) return repaired;
  const { edgeMap } = buildTopology(repaired);
  const boundaryEdges = Array.from(edgeMap.entries())
    .filter(([, edge]) => edge.faces.length === 1)
    .map(([key, edge]) => ({ key, edge }));
  if (boundaryEdges.length === 0) return repaired;

  const edgesByVertex = new Map<number, { a: number; b: number; key: string }[]>();
  boundaryEdges.forEach(({ key, edge }) => {
    if (!edgesByVertex.has(edge.a)) edgesByVertex.set(edge.a, []);
    if (!edgesByVertex.has(edge.b)) edgesByVertex.set(edge.b, []);
    edgesByVertex.get(edge.a)!.push({ a: edge.a, b: edge.b, key });
    edgesByVertex.get(edge.b)!.push({ a: edge.a, b: edge.b, key });
  });

  const usedEdges = new Set<string>();
  const newFaces: number[][] = repaired.faces.slice();
  boundaryEdges.forEach(({ key, edge }) => {
    if (usedEdges.has(key)) return;
    const loop: number[] = [edge.a, edge.b];
    usedEdges.add(key);
    let current = edge.b;
    let prev = edge.a;
    while (current !== edge.a) {
      const candidates = edgesByVertex.get(current) ?? [];
      const nextEdge = candidates.find((entry) => {
        if (usedEdges.has(entry.key)) return false;
        return entry.a === current || entry.b === current;
      });
      if (!nextEdge) break;
      usedEdges.add(nextEdge.key);
      const next = nextEdge.a === current ? nextEdge.b : nextEdge.a;
      if (next === prev) break;
      loop.push(next);
      prev = current;
      current = next;
    }
    if (loop.length >= 3) {
      newFaces.push(loop);
    }
  });

  return { ...repaired, faces: newFaces };
};

export const decimateMesh = (
  mesh: TessellationMesh,
  options: { targetFaceCount: number; cellSize?: number }
): TessellationMesh => {
  if (mesh.faces.length === 0) return mesh;
  const target = Math.max(1, Math.round(options.targetFaceCount));
  if (mesh.faces.length <= target) return mesh;
  const bounds = computeMeshBounds(mesh.vertices);
  const size = {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z,
  };
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const cellSize = options.cellSize && options.cellSize > 0
    ? options.cellSize
    : maxDim / Math.cbrt(target);

  const cellMap = new Map<string, { index: number; sum: Vec3; count: number }>();
  const remap: number[] = [];
  mesh.vertices.forEach((vertex, index) => {
    const key = `${Math.floor((vertex.x - bounds.min.x) / cellSize)}:${Math.floor((vertex.y - bounds.min.y) / cellSize)}:${Math.floor((vertex.z - bounds.min.z) / cellSize)}`;
    let entry = cellMap.get(key);
    if (!entry) {
      entry = { index: cellMap.size, sum: { x: 0, y: 0, z: 0 }, count: 0 };
      cellMap.set(key, entry);
    }
    entry.sum = add(entry.sum, vertex);
    entry.count += 1;
    remap[index] = entry.index;
  });
  const vertices: Vec3[] = [];
  cellMap.forEach((entry) => {
    vertices[entry.index] = scale(entry.sum, 1 / entry.count);
  });
  const faces = mesh.faces
    .map((face) => face.map((idx) => remap[idx]))
    .filter((face) => new Set(face).size >= 3);
  return { vertices, faces };
};

export const quadDominantRemesh = (
  mesh: TessellationMesh,
  maxAngleDeg: number
): TessellationMesh => {
  const triangles = triangulateFaces(mesh)
    .reduce((faces, _, idx, arr) => {
      if (idx % 3 === 0) faces.push([arr[idx], arr[idx + 1], arr[idx + 2]]);
      return faces;
    }, [] as number[][]);

  const edgeMap = new Map<string, { faces: number[] }>();
  triangles.forEach((face, faceIndex) => {
    for (let i = 0; i < 3; i += 1) {
      const a = face[i];
      const b = face[(i + 1) % 3];
      const key = edgeKey(a, b);
      const entry = edgeMap.get(key);
      if (entry) {
        entry.faces.push(faceIndex);
      } else {
        edgeMap.set(key, { faces: [faceIndex] });
      }
    }
  });

  const normals = triangles.map((face) => computeFaceNormal(mesh.vertices, face));
  const maxAngle = (maxAngleDeg * Math.PI) / 180;
  const usedFaces = new Set<number>();
  const newFaces: number[][] = [];

  edgeMap.forEach((entry) => {
    if (entry.faces.length !== 2) return;
    const [f1, f2] = entry.faces;
    if (usedFaces.has(f1) || usedFaces.has(f2)) return;
    const angle = Math.acos(clamp(dot(normals[f1], normals[f2]), -1, 1));
    if (angle > maxAngle) return;
    const faceA = triangles[f1];
    const faceB = triangles[f2];
    const shared = faceA.filter((v) => faceB.includes(v));
    if (shared.length !== 2) return;
    const otherA = faceA.find((v) => !shared.includes(v));
    const otherB = faceB.find((v) => !shared.includes(v));
    if (otherA == null || otherB == null) return;
    const [s1, s2] = shared;
    const quad = [otherA, s1, otherB, s2];
    if (new Set(quad).size < 4) return;
    newFaces.push(quad);
    usedFaces.add(f1);
    usedFaces.add(f2);
  });

  triangles.forEach((face, index) => {
    if (usedFaces.has(index)) return;
    newFaces.push(face);
  });

  return { vertices: mesh.vertices.slice(), faces: newFaces };
};

export const triangulateMesh = (mesh: TessellationMesh): TessellationMesh => {
  const indices = triangulateFaces(mesh);
  const faces = facesFromTriangleIndices(indices);
  return { vertices: mesh.vertices.slice(), faces, uvs: mesh.uvs };
};

export const mergeRenderMeshes = (meshA: RenderMesh, meshB: RenderMesh): RenderMesh => {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const includeColors =
    Boolean(meshA.colors) &&
    meshA.colors.length === meshA.positions.length &&
    Boolean(meshB.colors) &&
    meshB.colors.length === meshB.positions.length;
  const colors: number[] = [];
  let offset = 0;
  [meshA, meshB].forEach((mesh) => {
    positions.push(...mesh.positions);
    normals.push(...(mesh.normals ?? new Array(mesh.positions.length).fill(0)));
    uvs.push(...(mesh.uvs ?? new Array((mesh.positions.length / 3) * 2).fill(0)));
    if (includeColors) {
      colors.push(...(mesh.colors ?? new Array(mesh.positions.length).fill(0)));
    }
    const meshIndices = mesh.indices.length > 0
      ? mesh.indices
      : Array.from({ length: mesh.positions.length / 3 }, (_, i) => i);
    meshIndices.forEach((index) => indices.push(index + offset));
    offset += mesh.positions.length / 3;
  });
  const resolvedNormals =
    normals.length === positions.length
      ? normals
      : computeVertexNormals(positions, indices);
  return {
    positions,
    normals: resolvedNormals,
    uvs,
    indices,
    colors: includeColors ? colors : undefined,
  };
};

export const meshBoolean = (
  meshA: RenderMesh,
  meshB: RenderMesh,
  operation: "union" | "difference" | "intersection"
): RenderMesh => {
  if (operation === "difference") {
    return meshA;
  }
  if (operation === "intersection") {
    const vertexCountA = Math.floor(meshA.positions.length / 3);
    const vertexCountB = Math.floor(meshB.positions.length / 3);
    const verticesA = Array.from({ length: vertexCountA }, (_, index) =>
      vec3FromPositions(meshA.positions, index)
    );
    const verticesB = Array.from({ length: vertexCountB }, (_, index) =>
      vec3FromPositions(meshB.positions, index)
    );
    const boundsA = computeMeshBounds(verticesA);
    const boundsB = computeMeshBounds(verticesB);
    const min = {
      x: Math.max(boundsA.min.x, boundsB.min.x),
      y: Math.max(boundsA.min.y, boundsB.min.y),
      z: Math.max(boundsA.min.z, boundsB.min.z),
    };
    const max = {
      x: Math.min(boundsA.max.x, boundsB.max.x),
      y: Math.min(boundsA.max.y, boundsB.max.y),
      z: Math.min(boundsA.max.z, boundsB.max.z),
    };
    if (min.x >= max.x || min.y >= max.y || min.z >= max.z) {
      return { positions: [], normals: [], uvs: [], indices: [] };
    }
    const size = { width: max.x - min.x, height: max.y - min.y, depth: max.z - min.z };
    const box = generateBoxMesh(size, 1);
    const positions = box.positions.slice();
    const offset = {
      x: min.x + size.width * 0.5,
      y: min.y + size.height * 0.5,
      z: min.z + size.depth * 0.5,
    };
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += offset.x;
      positions[i + 1] += offset.y;
      positions[i + 2] += offset.z;
    }
    return { ...box, positions, normals: computeVertexNormals(positions, box.indices) };
  }
  return mergeRenderMeshes(meshA, meshB);
};

export const meshFromGeometry = (
  geometry: Geometry
): { mesh: TessellationMesh; metadata: TessellationMeshData | null } | null => {
  const mesh = resolveMeshFromGeometry(geometry);
  if (!mesh) return null;
  const metadata = getTessellationMetadata(geometry.metadata);
  return { mesh: toTessellationMesh(mesh, metadata), metadata };
};
