import type { Basis } from "../geometry/transform";
import {
  generateBoxMesh,
  generateConeMesh,
  generateCylinderMesh,
  generateSphereMesh,
  generateTorusMesh,
} from "../geometry/mesh";
import type { RenderMesh, Vec3 } from "../types";
import type { GeometryBuffer } from "./BufferManager";
import type { Camera, WebGLRenderer } from "./WebGLRenderer";

export type GumballMode = "move" | "rotate" | "scale" | "gumball";

export type GumballHandleId =
  | "axis-x"
  | "axis-y"
  | "axis-z"
  | "plane-xy"
  | "plane-yz"
  | "plane-xz"
  | "rotate-x"
  | "rotate-y"
  | "rotate-z"
  | "scale-x"
  | "scale-y"
  | "scale-z"
  | "scale-uniform"
  | "pivot";

export const GUMBALL_METRICS = {
  axisLength: 1.25,
  axisRadius: 0.04,
  planeSize: 0.28,
  planeDepth: 0.018,
  planeOffset: 0.46,
  rotateRadius: 0.82,
  rotateTube: 0.045,
  rotateOffset: 0.25,
  scaleHandleOffset: 1.55,
  extrudeHandleOffset: 1.44,
  scaleHandleSize: 0.2,
  scaleCenterRadius: 0.12,
  uniformScaleOffset: 0.7,
  pivotScale: 0.5,
};

export type GumballBuffers = {
  axis: GeometryBuffer;
  plane: GeometryBuffer;
  ring: GeometryBuffer;
  scale: GeometryBuffer;
  scaleCenter: GeometryBuffer;
  scaleConnector: GeometryBuffer;
  extrudeConnector: GeometryBuffer;
  axisEdgeLines: GeometryBuffer[];
  planeEdgeLines: GeometryBuffer[];
  ringEdgeLines: GeometryBuffer[];
  scaleEdgeLines: GeometryBuffer[];
  scaleCenterEdgeLines: GeometryBuffer[];
};

export type GumballPickMeshes = {
  axis: RenderMesh;
  plane: RenderMesh;
  ring: RenderMesh;
  scale: RenderMesh;
  scaleCenter: RenderMesh;
};

export type GumballRenderState = {
  position: Vec3;
  orientation: Basis;
  scale: number;
  mode: GumballMode;
  activeHandle?: GumballHandleId | null;
};

export type GumballRenderOptions = {
  lightPosition?: [number, number, number];
  lightColor?: [number, number, number];
  ambientColor?: [number, number, number];
  axisOpacity?: number;
  planeOpacity?: number;
  showRotate?: boolean;
  showMove?: boolean;
  sheenIntensity?: number;
  ambientStrength?: number;
  highlightColor?: [number, number, number];
  solidColor?: [number, number, number];
  solidMode?: boolean;
};

const AXIS_COLORS: Record<"x" | "y" | "z", [number, number, number]> = {
  x: [0.22, 0.95, 0.92], // cyan
  y: [1.0, 0.42, 0.78], // pink
  z: [0.99, 0.86, 0.28], // yellow
};

const PLANE_COLORS: Record<"xy" | "yz" | "xz", [number, number, number]> = {
  xy: [0.3, 0.98, 0.95], // cyan
  yz: [1.0, 0.55, 0.83], // pink
  xz: [1.0, 0.9, 0.4], // yellow
};

const UNIFORM_SCALE_COLOR: [number, number, number] = [1.0, 0.92, 0.45];

export const GUMBALL_AXIS_COLORS = AXIS_COLORS;
export const GUMBALL_PLANE_COLORS = PLANE_COLORS;
export const GUMBALL_UNIFORM_SCALE_COLOR = UNIFORM_SCALE_COLOR;

const mixColor = (
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const lightenColor = (color: [number, number, number], amount: number) =>
  mixColor(color, [1, 1, 1], amount);

const EDGE_KIND_INTERNAL = 0;
const EDGE_KIND_CREASE = 1;
const EDGE_KIND_SILHOUETTE = 2;
const CREASE_ANGLE = Math.PI / 6;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type EdgeSegment = { a: number; b: number; kind: number };

const toTriangleIndices = (mesh: RenderMesh): number[] => {
  if (mesh.indices.length >= 3) {
    return mesh.indices;
  }
  const vertexCount = Math.floor(mesh.positions.length / 3);
  const indices: number[] = [];
  for (let i = 0; i + 2 < vertexCount; i += 3) {
    indices.push(i, i + 1, i + 2);
  }
  return indices;
};

const buildEdgeSegments = (mesh: RenderMesh): EdgeSegment[] => {
  const baseIndices = toTriangleIndices(mesh);
  const edges = new Map<
    string,
    {
      a: number;
      b: number;
      count: number;
      nx1: number;
      ny1: number;
      nz1: number;
      nx2: number;
      ny2: number;
      nz2: number;
    }
  >();

  const addEdge = (a: number, b: number, nx: number, ny: number, nz: number) => {
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    const key = `${min}:${max}`;
    const existing = edges.get(key);
    if (!existing) {
      edges.set(key, {
        a: min,
        b: max,
        count: 1,
        nx1: nx,
        ny1: ny,
        nz1: nz,
        nx2: 0,
        ny2: 0,
        nz2: 0,
      });
      return;
    }
    if (existing.count === 1) {
      existing.nx2 = nx;
      existing.ny2 = ny;
      existing.nz2 = nz;
    }
    existing.count += 1;
  };

  for (let i = 0; i + 2 < baseIndices.length; i += 3) {
    const a = baseIndices[i];
    const b = baseIndices[i + 1];
    const c = baseIndices[i + 2];
    const ai = a * 3;
    const bi = b * 3;
    const ci = c * 3;
    const ax = mesh.positions[ai];
    const ay = mesh.positions[ai + 1];
    const az = mesh.positions[ai + 2];
    const bx = mesh.positions[bi];
    const by = mesh.positions[bi + 1];
    const bz = mesh.positions[bi + 2];
    const cx = mesh.positions[ci];
    const cy = mesh.positions[ci + 1];
    const cz = mesh.positions[ci + 2];

    const abx = bx - ax;
    const aby = by - ay;
    const abz = bz - az;
    const acx = cx - ax;
    const acy = cy - ay;
    const acz = cz - az;

    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-6) continue;
    nx /= len;
    ny /= len;
    nz /= len;

    addEdge(a, b, nx, ny, nz);
    addEdge(b, c, nx, ny, nz);
    addEdge(c, a, nx, ny, nz);
  }

  const segments: EdgeSegment[] = [];
  edges.forEach((edge) => {
    let kind = EDGE_KIND_INTERNAL;
    if (edge.count === 1) {
      kind = EDGE_KIND_SILHOUETTE;
    } else if (edge.count >= 3) {
      kind = EDGE_KIND_CREASE;
    } else {
      const dot = clamp(
        edge.nx1 * edge.nx2 + edge.ny1 * edge.ny2 + edge.nz1 * edge.nz2,
        -1,
        1
      );
      const angle = Math.acos(dot);
      if (angle >= CREASE_ANGLE) {
        kind = EDGE_KIND_CREASE;
      }
    }
    segments.push({ a: edge.a, b: edge.b, kind });
  });

  return segments;
};

const buildEdgeLineBufferChunks = (
  mesh: RenderMesh,
  edgeSegments: EdgeSegment[]
): Array<{
  positions: Float32Array;
  prevPositions: Float32Array;
  nextPositions: Float32Array;
  sides: Float32Array;
  edgeKinds: Float32Array;
  indices: Uint16Array;
}> => {
  if (edgeSegments.length === 0) return [];

  const positions = mesh.positions;
  const normals = mesh.normals ?? [];
  const vertexCount = Math.floor(positions.length / 3);
  const groupForVertex = new Array<number>(vertexCount);
  const groupLookup = new Map<string, number>();
  let groupCursor = 0;
  for (let i = 0; i < vertexCount; i += 1) {
    const offset = i * 3;
    const key = `${Math.round(positions[offset] * 1e5)}:${Math.round(
      positions[offset + 1] * 1e5
    )}:${Math.round(positions[offset + 2] * 1e5)}`;
    let groupId = groupLookup.get(key);
    if (groupId == null) {
      groupId = groupCursor;
      groupLookup.set(key, groupCursor);
      groupCursor += 1;
    }
    groupForVertex[i] = groupId;
  }
  const joinForA = new Array(edgeSegments.length).fill(-1);
  const joinForB = new Array(edgeSegments.length).fill(-1);
  const edgesByVertex = new Map<string, Array<{ edgeIndex: number; vertex: number; neighbor: number }>>();

  const pushEntry = (vertex: number, neighbor: number, edgeIndex: number, kind: number) => {
    const key = `${groupForVertex[vertex]}:${kind}`;
    const list = edgesByVertex.get(key) ?? [];
    list.push({ edgeIndex, vertex, neighbor });
    edgesByVertex.set(key, list);
  };

  edgeSegments.forEach((edge, index) => {
    pushEntry(edge.a, edge.b, index, edge.kind);
    pushEntry(edge.b, edge.a, index, edge.kind);
  });

  const getVertexNormal = (entries: Array<{ vertex: number; neighbor: number }>) => {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    entries.forEach((entry) => {
      const offset = entry.vertex * 3;
      nx += normals[offset] ?? 0;
      ny += normals[offset + 1] ?? 0;
      nz += normals[offset + 2] ?? 0;
    });
    let len = Math.hypot(nx, ny, nz);
    if (len < 1e-4 && entries.length >= 2) {
      const vertex = entries[0].vertex;
      const a = entries[0].neighbor * 3;
      const b = entries[1].neighbor * 3;
      const vx = positions[a] - positions[vertex * 3];
      const vy = positions[a + 1] - positions[vertex * 3 + 1];
      const vz = positions[a + 2] - positions[vertex * 3 + 2];
      const wx = positions[b] - positions[vertex * 3];
      const wy = positions[b + 1] - positions[vertex * 3 + 1];
      const wz = positions[b + 2] - positions[vertex * 3 + 2];
      nx = vy * wz - vz * wy;
      ny = vz * wx - vx * wz;
      nz = vx * wy - vy * wx;
      len = Math.hypot(nx, ny, nz);
    }
    if (len < 1e-4) {
      nx = 0;
      ny = 1;
      nz = 0;
      len = 1;
    }
    return { x: nx / len, y: ny / len, z: nz / len };
  };

  const buildBasis = (normal: { x: number; y: number; z: number }) => {
    let rx = 0;
    let ry = 1;
    let rz = 0;
    if (Math.abs(normal.y) > 0.9) {
      rx = 1;
      ry = 0;
      rz = 0;
    }
    let ux = normal.y * rz - normal.z * ry;
    let uy = normal.z * rx - normal.x * rz;
    let uz = normal.x * ry - normal.y * rx;
    let len = Math.hypot(ux, uy, uz);
    if (len < 1e-4) {
      rx = 0;
      ry = 0;
      rz = 1;
      ux = normal.y * rz - normal.z * ry;
      uy = normal.z * rx - normal.x * rz;
      uz = normal.x * ry - normal.y * rx;
      len = Math.hypot(ux, uy, uz);
    }
    ux /= len;
    uy /= len;
    uz /= len;
    const vx = normal.y * uz - normal.z * uy;
    const vy = normal.z * ux - normal.x * uz;
    const vz = normal.x * uy - normal.y * ux;
    return { ux, uy, uz, vx, vy, vz };
  };

  edgesByVertex.forEach((entries) => {
    if (entries.length < 2) return;
    const vertex = entries[0].vertex;
    const normal = getVertexNormal(entries);
    const basis = buildBasis(normal);
    const withAngles = entries.map((entry) => {
      const vOffset = entry.neighbor * 3;
      const vx = positions[vOffset] - positions[vertex * 3];
      const vy = positions[vOffset + 1] - positions[vertex * 3 + 1];
      const vz = positions[vOffset + 2] - positions[vertex * 3 + 2];
      const dot = vx * normal.x + vy * normal.y + vz * normal.z;
      let px = vx - normal.x * dot;
      let py = vy - normal.y * dot;
      let pz = vz - normal.z * dot;
      let plen = Math.hypot(px, py, pz);
      if (plen < 1e-4) {
        px = basis.ux;
        py = basis.uy;
        pz = basis.uz;
        plen = 1;
      } else {
        px /= plen;
        py /= plen;
        pz /= plen;
      }
      const angle = Math.atan2(
        px * basis.vx + py * basis.vy + pz * basis.vz,
        px * basis.ux + py * basis.uy + pz * basis.uz
      );
      return { ...entry, angle };
    });

    withAngles.sort((a, b) => a.angle - b.angle);
    const count = withAngles.length;
    for (let i = 0; i < count; i += 1) {
      const current = withAngles[i];
      const next = withAngles[(i + 1) % count];
      const edge = edgeSegments[current.edgeIndex];
      if (current.vertex === edge.a) {
        joinForA[current.edgeIndex] = next.neighbor;
      } else {
        joinForB[current.edgeIndex] = next.neighbor;
      }
    }
  });

  const segments = edgeSegments.length;
  const maxSegments = Math.floor(65535 / 4);
  const chunks: Array<{
    positions: Float32Array;
    prevPositions: Float32Array;
    nextPositions: Float32Array;
    sides: Float32Array;
    edgeKinds: Float32Array;
    indices: Uint16Array;
  }> = [];

  for (let start = 0; start < segments; start += maxSegments) {
    const chunkSegments = Math.min(maxSegments, segments - start);
    const positionsOut = new Float32Array(chunkSegments * 12);
    const prevPositionsOut = new Float32Array(chunkSegments * 12);
    const nextPositionsOut = new Float32Array(chunkSegments * 12);
    const sides = new Float32Array(chunkSegments * 4);
    const edgeKinds = new Float32Array(chunkSegments * 4);
    const indicesOut = new Uint16Array(chunkSegments * 6);

    for (let i = 0; i < chunkSegments; i += 1) {
      const edgeIndex = start + i;
      const edge = edgeSegments[edgeIndex];
      const a = edge.a;
      const b = edge.b;
      const ai = a * 3;
      const bi = b * 3;
      const ax = positions[ai];
      const ay = positions[ai + 1];
      const az = positions[ai + 2];
      const bx = positions[bi];
      const by = positions[bi + 1];
      const bz = positions[bi + 2];

      const joinA = joinForA[edgeIndex];
      const joinB = joinForB[edgeIndex];
      const joinAi = joinA >= 0 ? joinA * 3 : ai;
      const joinBi = joinB >= 0 ? joinB * 3 : bi;

      const vertexOffset = i * 12;
      positionsOut[vertexOffset] = ax;
      positionsOut[vertexOffset + 1] = ay;
      positionsOut[vertexOffset + 2] = az;
      positionsOut[vertexOffset + 3] = ax;
      positionsOut[vertexOffset + 4] = ay;
      positionsOut[vertexOffset + 5] = az;
      positionsOut[vertexOffset + 6] = bx;
      positionsOut[vertexOffset + 7] = by;
      positionsOut[vertexOffset + 8] = bz;
      positionsOut[vertexOffset + 9] = bx;
      positionsOut[vertexOffset + 10] = by;
      positionsOut[vertexOffset + 11] = bz;

      prevPositionsOut[vertexOffset] = positions[joinAi];
      prevPositionsOut[vertexOffset + 1] = positions[joinAi + 1];
      prevPositionsOut[vertexOffset + 2] = positions[joinAi + 2];
      prevPositionsOut[vertexOffset + 3] = positions[joinAi];
      prevPositionsOut[vertexOffset + 4] = positions[joinAi + 1];
      prevPositionsOut[vertexOffset + 5] = positions[joinAi + 2];
      prevPositionsOut[vertexOffset + 6] = ax;
      prevPositionsOut[vertexOffset + 7] = ay;
      prevPositionsOut[vertexOffset + 8] = az;
      prevPositionsOut[vertexOffset + 9] = ax;
      prevPositionsOut[vertexOffset + 10] = ay;
      prevPositionsOut[vertexOffset + 11] = az;

      nextPositionsOut[vertexOffset] = bx;
      nextPositionsOut[vertexOffset + 1] = by;
      nextPositionsOut[vertexOffset + 2] = bz;
      nextPositionsOut[vertexOffset + 3] = bx;
      nextPositionsOut[vertexOffset + 4] = by;
      nextPositionsOut[vertexOffset + 5] = bz;
      nextPositionsOut[vertexOffset + 6] = positions[joinBi];
      nextPositionsOut[vertexOffset + 7] = positions[joinBi + 1];
      nextPositionsOut[vertexOffset + 8] = positions[joinBi + 2];
      nextPositionsOut[vertexOffset + 9] = positions[joinBi];
      nextPositionsOut[vertexOffset + 10] = positions[joinBi + 1];
      nextPositionsOut[vertexOffset + 11] = positions[joinBi + 2];

      const sideOffset = i * 4;
      sides[sideOffset] = -1;
      sides[sideOffset + 1] = 1;
      sides[sideOffset + 2] = -1;
      sides[sideOffset + 3] = 1;

      edgeKinds[sideOffset] = edge.kind;
      edgeKinds[sideOffset + 1] = edge.kind;
      edgeKinds[sideOffset + 2] = edge.kind;
      edgeKinds[sideOffset + 3] = edge.kind;

      const indexOffset = i * 6;
      const v = i * 4;
      indicesOut[indexOffset] = v;
      indicesOut[indexOffset + 1] = v + 1;
      indicesOut[indexOffset + 2] = v + 2;
      indicesOut[indexOffset + 3] = v + 1;
      indicesOut[indexOffset + 4] = v + 3;
      indicesOut[indexOffset + 5] = v + 2;
    }

    chunks.push({
      positions: positionsOut,
      prevPositions: prevPositionsOut,
      nextPositions: nextPositionsOut,
      sides,
      edgeKinds,
      indices: indicesOut,
    });
  }

  return chunks;
};

const createEdgeLineBuffers = (
  renderer: WebGLRenderer,
  baseId: string,
  mesh: RenderMesh
) => {
  const edgeSegments = buildEdgeSegments(mesh);
  const edgeLineChunks = buildEdgeLineBufferChunks(mesh, edgeSegments);
  if (edgeLineChunks.length === 0) return [];
  return edgeLineChunks.map((chunk, index) => {
    const buffer = renderer.createGeometryBuffer(`${baseId}_${index}`);
    buffer.setData({
      positions: chunk.positions,
      prevPositions: chunk.prevPositions,
      nextPositions: chunk.nextPositions,
      sides: chunk.sides,
      edgeKinds: chunk.edgeKinds,
      indices: chunk.indices,
    });
    return buffer;
  });
};

const createConnectorLineBuffer = (
  renderer: WebGLRenderer,
  id: string,
  start: number,
  end: number
) => {
  const buffer = renderer.createGeometryBuffer(id);
  buffer.setData({
    positions: new Float32Array([0, start, 0, 0, end, 0]),
  });
  return buffer;
};


const mat4Multiply = (a: Float32Array, b: Float32Array) => {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col += 1) {
    const colOffset = col * 4;
    for (let row = 0; row < 4; row += 1) {
      out[colOffset + row] =
        a[row] * b[colOffset] +
        a[row + 4] * b[colOffset + 1] +
        a[row + 8] * b[colOffset + 2] +
        a[row + 12] * b[colOffset + 3];
    }
  }
  return out;
};

const mat4Translation = (x: number, y: number, z: number) =>
  new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1,
  ]);

const mat4Scale = (x: number, y: number, z: number) =>
  new Float32Array([
    x, 0, 0, 0,
    0, y, 0, 0,
    0, 0, z, 0,
    0, 0, 0, 1,
  ]);

const mat4RotationX = (angleRad: number) => {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return new Float32Array([
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1,
  ]);
};

const mat4RotationY = (angleRad: number) => {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return new Float32Array([
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1,
  ]);
};

const mat4RotationZ = (angleRad: number) => {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return new Float32Array([
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
};

const mat4FromBasis = (orientation: Basis, position: Vec3) =>
  new Float32Array([
    orientation.xAxis.x,
    orientation.yAxis.x,
    orientation.zAxis.x,
    0,
    orientation.xAxis.y,
    orientation.yAxis.y,
    orientation.zAxis.y,
    0,
    orientation.xAxis.z,
    orientation.yAxis.z,
    orientation.zAxis.z,
    0,
    position.x,
    position.y,
    position.z,
    1,
  ]);

const translateMesh = (mesh: RenderMesh, offset: Vec3): RenderMesh => {
  const positions = mesh.positions.slice();
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] += offset.x;
    positions[i + 1] += offset.y;
    positions[i + 2] += offset.z;
  }
  return { ...mesh, positions };
};

const mergeMeshes = (meshes: RenderMesh[]): RenderMesh => {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;
  meshes.forEach((mesh) => {
    positions.push(...mesh.positions);
    normals.push(...mesh.normals);
    mesh.indices.forEach((index) => indices.push(index + vertexOffset));
    vertexOffset += mesh.positions.length / 3;
  });
  return { positions, normals, uvs: [], indices };
};

const createArrowMesh = (
  length = GUMBALL_METRICS.axisLength,
  radius = GUMBALL_METRICS.axisRadius
) => {
  const shaftLength = length * 0.72;
  const headLength = length - shaftLength;
  const headRadius = radius * 1.55;
  const segments = 16;

  const shaft = translateMesh(
    generateCylinderMesh(radius, shaftLength, segments),
    { x: 0, y: shaftLength * 0.5, z: 0 }
  );
  const head = translateMesh(
    generateConeMesh(headRadius, headLength, segments),
    { x: 0, y: shaftLength + headLength * 0.5, z: 0 }
  );

  return mergeMeshes([shaft, head]);
};

export const createGumballPickMeshes = (): GumballPickMeshes => {
  const axis = createArrowMesh();
  const plane = generateBoxMesh(
    {
      width: GUMBALL_METRICS.planeSize,
      height: GUMBALL_METRICS.planeSize,
      depth: GUMBALL_METRICS.planeDepth,
    },
    1
  );
  const ring = generateTorusMesh(
    GUMBALL_METRICS.rotateRadius,
    GUMBALL_METRICS.rotateTube,
    24,
    96
  );
  const scale = generateBoxMesh(
    {
      width: GUMBALL_METRICS.scaleHandleSize,
      height: GUMBALL_METRICS.scaleHandleSize,
      depth: GUMBALL_METRICS.scaleHandleSize,
    },
    1
  );
  const scaleCenter = generateSphereMesh(GUMBALL_METRICS.scaleCenterRadius, 18);
  return { axis, plane, ring, scale, scaleCenter };
};

export const createGumballBuffers = (renderer: WebGLRenderer): GumballBuffers => {
  const axisMesh = createArrowMesh();
  const axis = renderer.createGeometryBuffer("__gumball_axis");
  axis.setData({
    positions: new Float32Array(axisMesh.positions),
    normals: new Float32Array(axisMesh.normals),
    indices: new Uint16Array(axisMesh.indices),
  });
  const axisEdgeLines = createEdgeLineBuffers(renderer, "__gumball_axis_edges", axisMesh);

  const planeMesh = generateBoxMesh(
    {
      width: GUMBALL_METRICS.planeSize,
      height: GUMBALL_METRICS.planeSize,
      depth: GUMBALL_METRICS.planeDepth,
    },
    1
  );
  const plane = renderer.createGeometryBuffer("__gumball_plane");
  plane.setData({
    positions: new Float32Array(planeMesh.positions),
    normals: new Float32Array(planeMesh.normals),
    indices: new Uint16Array(planeMesh.indices),
  });
  const planeEdgeLines = createEdgeLineBuffers(renderer, "__gumball_plane_edges", planeMesh);

  const ringMesh = generateTorusMesh(
    GUMBALL_METRICS.rotateRadius,
    GUMBALL_METRICS.rotateTube,
    24,
    96
  );
  const ring = renderer.createGeometryBuffer("__gumball_ring");
  ring.setData({
    positions: new Float32Array(ringMesh.positions),
    normals: new Float32Array(ringMesh.normals),
    indices: new Uint16Array(ringMesh.indices),
  });
  const ringEdgeLines = createEdgeLineBuffers(renderer, "__gumball_ring_edges", ringMesh);

  const scaleMesh = generateBoxMesh(
    {
      width: GUMBALL_METRICS.scaleHandleSize,
      height: GUMBALL_METRICS.scaleHandleSize,
      depth: GUMBALL_METRICS.scaleHandleSize,
    },
    1
  );
  const scale = renderer.createGeometryBuffer("__gumball_scale");
  scale.setData({
    positions: new Float32Array(scaleMesh.positions),
    normals: new Float32Array(scaleMesh.normals),
    indices: new Uint16Array(scaleMesh.indices),
  });
  const scaleEdgeLines = createEdgeLineBuffers(renderer, "__gumball_scale_edges", scaleMesh);

  const scaleCenterMesh = generateSphereMesh(GUMBALL_METRICS.scaleCenterRadius, 18);
  const scaleCenter = renderer.createGeometryBuffer("__gumball_scale_center");
  scaleCenter.setData({
    positions: new Float32Array(scaleCenterMesh.positions),
    normals: new Float32Array(scaleCenterMesh.normals),
    indices: new Uint16Array(scaleCenterMesh.indices),
  });
  const scaleCenterEdgeLines = createEdgeLineBuffers(
    renderer,
    "__gumball_scale_center_edges",
    scaleCenterMesh
  );
  const scaleConnector = createConnectorLineBuffer(
    renderer,
    "__gumball_scale_connector",
    GUMBALL_METRICS.axisLength,
    GUMBALL_METRICS.scaleHandleOffset
  );
  const extrudeConnector = createConnectorLineBuffer(
    renderer,
    "__gumball_extrude_connector",
    GUMBALL_METRICS.axisLength,
    GUMBALL_METRICS.extrudeHandleOffset
  );

  return {
    axis,
    plane,
    ring,
    scale,
    scaleCenter,
    scaleConnector,
    extrudeConnector,
    axisEdgeLines,
    planeEdgeLines,
    ringEdgeLines,
    scaleEdgeLines,
    scaleCenterEdgeLines,
  };
};

export const disposeGumballBuffers = (
  renderer: WebGLRenderer,
  buffers: GumballBuffers
) => {
  renderer.deleteGeometryBuffer(buffers.axis.id);
  renderer.deleteGeometryBuffer(buffers.plane.id);
  renderer.deleteGeometryBuffer(buffers.ring.id);
  renderer.deleteGeometryBuffer(buffers.scale.id);
  renderer.deleteGeometryBuffer(buffers.scaleCenter.id);
  renderer.deleteGeometryBuffer(buffers.scaleConnector.id);
  renderer.deleteGeometryBuffer(buffers.extrudeConnector.id);
  buffers.axisEdgeLines.forEach((buffer) => renderer.deleteGeometryBuffer(buffer.id));
  buffers.planeEdgeLines.forEach((buffer) => renderer.deleteGeometryBuffer(buffer.id));
  buffers.ringEdgeLines.forEach((buffer) => renderer.deleteGeometryBuffer(buffer.id));
  buffers.scaleEdgeLines.forEach((buffer) => renderer.deleteGeometryBuffer(buffer.id));
  buffers.scaleCenterEdgeLines.forEach((buffer) => renderer.deleteGeometryBuffer(buffer.id));
};

export const getGumballTransforms = (state: GumballRenderState) => {
  const base = mat4FromBasis(state.orientation, state.position);
  const scale = mat4Scale(state.scale, state.scale, state.scale);

  const xAxis = mat4Multiply(base, mat4Multiply(mat4RotationZ(-Math.PI / 2), scale));
  const yAxis = mat4Multiply(base, scale);
  const zAxis = mat4Multiply(base, mat4Multiply(mat4RotationX(Math.PI / 2), scale));

  const planeOffset = GUMBALL_METRICS.planeOffset * state.scale;
  const xy = mat4Multiply(
    base,
    mat4Multiply(mat4Translation(planeOffset, planeOffset, 0), scale)
  );
  const yz = mat4Multiply(
    base,
    mat4Multiply(
      mat4Translation(0, planeOffset, planeOffset),
      mat4Multiply(mat4RotationY(Math.PI / 2), scale)
    )
  );
  const xz = mat4Multiply(
    base,
    mat4Multiply(
      mat4Translation(planeOffset, 0, planeOffset),
      mat4Multiply(mat4RotationX(Math.PI / 2), scale)
    )
  );

  const rotateX = mat4Multiply(
    base,
    mat4Multiply(mat4RotationZ(-Math.PI / 2), scale)
  );
  const rotateY = mat4Multiply(base, scale);
  const rotateZ = mat4Multiply(
    base,
    mat4Multiply(mat4RotationX(Math.PI / 2), scale)
  );

  const scaleOffset = GUMBALL_METRICS.scaleHandleOffset * state.scale;
  const scaleTranslate = mat4Translation(0, scaleOffset, 0);
  const scaleHandle = mat4Multiply(scaleTranslate, scale);
  const scaleX = mat4Multiply(
    base,
    mat4Multiply(mat4RotationZ(-Math.PI / 2), scaleHandle)
  );
  const scaleY = mat4Multiply(base, scaleHandle);
  const scaleZ = mat4Multiply(
    base,
    mat4Multiply(mat4RotationX(Math.PI / 2), scaleHandle)
  );
  const uniformOffset = GUMBALL_METRICS.uniformScaleOffset * state.scale;
  const uniformAxis = Math.sqrt(1 / 3);
  const uniformTranslate = mat4Translation(
    uniformAxis * uniformOffset,
    uniformAxis * uniformOffset,
    uniformAxis * uniformOffset
  );
  const scaleUniform = mat4Multiply(base, mat4Multiply(uniformTranslate, scale));

  const pivotScale = state.scale * GUMBALL_METRICS.pivotScale;
  const pivot = mat4Multiply(base, mat4Scale(pivotScale, pivotScale, pivotScale));

  return {
    xAxis,
    yAxis,
    zAxis,
    xy,
    yz,
    xz,
    rotateX,
    rotateY,
    rotateZ,
    scaleX,
    scaleY,
    scaleZ,
    scaleUniform,
    pivot,
  };
};

export const renderGumball = (
  renderer: WebGLRenderer,
  camera: Camera,
  buffers: GumballBuffers,
  state: GumballRenderState,
  options: GumballRenderOptions = {}
) => {
  const transforms = getGumballTransforms(state);
  const activeHandle = state.activeHandle ?? null;
  const showMove =
    (options.showMove ?? true) && (state.mode === "move" || state.mode === "gumball");
  const showRotate = (state.mode === "rotate" || state.mode === "gumball") &&
    (options.showRotate ?? true);
  const showScale = state.mode === "scale" || state.mode === "gumball";
  const lightPosition = options.lightPosition ?? [12, 18, 10];
  const lightColor = options.lightColor ?? [0.74, 0.76, 0.74];
  const ambientColor = options.ambientColor ?? [0.62, 0.64, 0.62];
  const ambientStrength = options.ambientStrength ?? 0.68;
  const sheenIntensity = options.sheenIntensity ?? 0.08;
  const axisOpacity = options.axisOpacity ?? 1;
  const planeOpacity = options.planeOpacity ?? 0.65;
  const solidMode = options.solidMode ?? false;
  const ringOpacity = solidMode ? axisOpacity : Math.min(axisOpacity, 0.92);
  const scaleOpacity = solidMode ? axisOpacity : Math.min(axisOpacity, 0.95);
  const lighting = { lightPosition, lightColor, ambientColor, ambientStrength, sheenIntensity };
  const highlightColor = options.highlightColor;
  const solidColor = options.solidColor;

  const resolveHandleColor = (
    base: [number, number, number],
    handleId: GumballHandleId
  ) => {
    if (activeHandle === handleId) {
      return highlightColor ?? lightenColor(base, 0.2);
    }
    return base;
  };

  const axisColors = {
    x: solidColor ?? AXIS_COLORS.x,
    y: solidColor ?? AXIS_COLORS.y,
    z: solidColor ?? AXIS_COLORS.z,
  };
  const planeColors = {
    xy: solidColor ?? PLANE_COLORS.xy,
    yz: solidColor ?? PLANE_COLORS.yz,
    xz: solidColor ?? PLANE_COLORS.xz,
  };
  const uniformScaleColor = solidColor ?? UNIFORM_SCALE_COLOR;

  const renderMoveHandles = () => {
    renderer.renderGeometry(buffers.axis, camera, {
      modelMatrix: transforms.xAxis,
      materialColor: resolveHandleColor(axisColors.x, "axis-x"),
      ...lighting,
      opacity: axisOpacity,
    });
    renderer.renderGeometry(buffers.axis, camera, {
      modelMatrix: transforms.yAxis,
      materialColor: resolveHandleColor(axisColors.y, "axis-y"),
      ...lighting,
      opacity: axisOpacity,
    });
    renderer.renderGeometry(buffers.axis, camera, {
      modelMatrix: transforms.zAxis,
      materialColor: resolveHandleColor(axisColors.z, "axis-z"),
      ...lighting,
      opacity: axisOpacity,
    });

    renderer.renderGeometry(buffers.plane, camera, {
      modelMatrix: transforms.xy,
      materialColor: resolveHandleColor(planeColors.xy, "plane-xy"),
      ...lighting,
      opacity: planeOpacity,
    });
    renderer.renderGeometry(buffers.plane, camera, {
      modelMatrix: transforms.yz,
      materialColor: resolveHandleColor(planeColors.yz, "plane-yz"),
      ...lighting,
      opacity: planeOpacity,
    });
    renderer.renderGeometry(buffers.plane, camera, {
      modelMatrix: transforms.xz,
      materialColor: resolveHandleColor(planeColors.xz, "plane-xz"),
      ...lighting,
      opacity: planeOpacity,
    });
  };

  const renderScaleHandles = () => {
    renderer.renderGeometry(buffers.scale, camera, {
      modelMatrix: transforms.scaleX,
      materialColor: resolveHandleColor(axisColors.x, "scale-x"),
      ...lighting,
      opacity: scaleOpacity,
    });
    renderer.renderGeometry(buffers.scale, camera, {
      modelMatrix: transforms.scaleY,
      materialColor: resolveHandleColor(axisColors.y, "scale-y"),
      ...lighting,
      opacity: scaleOpacity,
    });
    renderer.renderGeometry(buffers.scale, camera, {
      modelMatrix: transforms.scaleZ,
      materialColor: resolveHandleColor(axisColors.z, "scale-z"),
      ...lighting,
      opacity: scaleOpacity,
    });
    renderer.renderGeometry(buffers.scale, camera, {
      modelMatrix: transforms.scaleUniform,
      materialColor: resolveHandleColor(uniformScaleColor, "scale-uniform"),
      ...lighting,
      opacity: scaleOpacity,
    });
  };

  if (showScale && state.mode === "gumball") {
    renderScaleHandles();
  }

  if (showMove) {
    renderMoveHandles();
  }

  if (showRotate) {
    renderer.renderGeometry(buffers.ring, camera, {
      modelMatrix: transforms.rotateX,
      materialColor: resolveHandleColor(axisColors.x, "rotate-x"),
      ...lighting,
      opacity: ringOpacity,
    });
    renderer.renderGeometry(buffers.ring, camera, {
      modelMatrix: transforms.rotateY,
      materialColor: resolveHandleColor(axisColors.y, "rotate-y"),
      ...lighting,
      opacity: ringOpacity,
    });
    renderer.renderGeometry(buffers.ring, camera, {
      modelMatrix: transforms.rotateZ,
      materialColor: resolveHandleColor(axisColors.z, "rotate-z"),
      ...lighting,
      opacity: ringOpacity,
    });
  }

  if (showScale && state.mode !== "gumball") {
    renderScaleHandles();
  }

  renderer.renderGeometry(buffers.scaleCenter, camera, {
    modelMatrix: transforms.pivot,
    materialColor: resolveHandleColor([0.98, 0.98, 0.96], "pivot"),
    ...lighting,
    opacity: 0.95,
  });
};
