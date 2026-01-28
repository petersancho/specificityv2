import type {
  Geometry,
  PolylineGeometry,
  SurfaceGeometry,
  VertexGeometry,
  RenderMesh,
} from "../types";
import type { GeometryBuffer } from "../webgl/BufferManager";
import type { WebGLRenderer } from "../webgl/WebGLRenderer";
import type { NURBSCurve, NURBSSurface } from "./nurbs";
import { generateSphereMesh } from "./mesh";
import { tessellateCurveAdaptive, tessellateSurfaceAdaptive } from "./tessellation";
import { createNurbsCurveFromPoints } from "./nurbs";

export type RenderableGeometry = {
  id: string;
  buffer: GeometryBuffer;
  edgeBuffer?: GeometryBuffer;
  edgeLineBuffers?: GeometryBuffer[];
  type: "vertex" | "polyline" | "surface" | "mesh";
  needsUpdate: boolean;
};

const resolvePolylineCurve = (
  geometry: PolylineGeometry,
  points: { x: number; y: number; z: number }[]
): NURBSCurve | null => {
  if (points.length < 2) return null;
  if (geometry.degree <= 1 || points.length < geometry.degree + 1) return null;

  if (geometry.nurbs) {
    const knots = geometry.nurbs.knots;
    const degree = geometry.nurbs.degree;
    const weights =
      geometry.nurbs.weights && geometry.nurbs.weights.length === points.length
        ? geometry.nurbs.weights
        : undefined;
    const expectedLength = points.length + degree + 1;
    if (knots.length === expectedLength) {
      return {
        controlPoints: points,
        knots,
        degree,
        weights,
      };
    }
  }

  return createNurbsCurveFromPoints(points, geometry.degree, geometry.closed);
};

export class GeometryRenderAdapter {
  private renderables: Map<string, RenderableGeometry> = new Map();
  private renderer: WebGLRenderer;
  private getGeometryById?: (id: string) => Geometry | undefined;
  private vertexTemplate: RenderMesh | null = null;

  constructor(renderer: WebGLRenderer, getGeometryById?: (id: string) => Geometry | undefined) {
    this.renderer = renderer;
    this.getGeometryById = getGeometryById;
  }

  updateGeometry(geometry: Geometry): void {
    const existing = this.renderables.get(geometry.id);

    if (geometry.type === "vertex") {
      this.updateVertexGeometry(geometry, existing);
    } else if (geometry.type === "polyline") {
      this.updatePolylineGeometry(geometry as PolylineGeometry, existing);
    } else if ("mesh" in geometry) {
      this.updateMeshGeometry(geometry as SurfaceGeometry, existing);
    }
  }

  private updateVertexGeometry(geometry: VertexGeometry, existing?: RenderableGeometry): void {
    let buffer: GeometryBuffer;

    if (existing) {
      buffer = existing.buffer;
    } else {
      buffer = this.renderer.createGeometryBuffer(geometry.id);
    }

    const template = this.getVertexTemplate();
    const positions = new Float32Array(template.positions.length);
    for (let i = 0; i < template.positions.length; i += 3) {
      positions[i] = template.positions[i] + geometry.position.x;
      positions[i + 1] = template.positions[i + 1] + geometry.position.y;
      positions[i + 2] = template.positions[i + 2] + geometry.position.z;
    }

    buffer.setData({
      positions,
      normals: new Float32Array(template.normals),
      indices: new Uint16Array(template.indices),
    });

    this.renderables.set(geometry.id, {
      id: geometry.id,
      buffer,
      type: "vertex",
      needsUpdate: false,
    });
  }

  private updatePolylineGeometry(geometry: PolylineGeometry, existing?: RenderableGeometry): void {
    let buffer: GeometryBuffer;

    if (existing) {
      buffer = existing.buffer;
    } else {
      buffer = this.renderer.createGeometryBuffer(geometry.id);
    }

    const points = geometry.vertexIds
      .map((vertexId) => this.getGeometryById?.(vertexId))
      .filter((item): item is VertexGeometry => item?.type === "vertex")
      .map((vertex) => vertex.position);

    if (points.length >= 2) {
      const curve = resolvePolylineCurve(geometry, points);
      const renderPoints = curve
        ? (() => {
            const tessellated = tessellateCurveAdaptive(curve);
            const sampled = tessellated.points;
            if (geometry.closed && sampled.length > 1) {
              const first = sampled[0];
              const last = sampled[sampled.length - 1];
              const isClosed =
                Math.abs(first.x - last.x) < 1e-6 &&
                Math.abs(first.y - last.y) < 1e-6 &&
                Math.abs(first.z - last.z) < 1e-6;
              return isClosed ? sampled : [...sampled, { ...first }];
            }
            return sampled;
          })()
        : geometry.closed
          ? [...points, points[0]]
          : points;

      const lineData = createLineBufferData(renderPoints);
      buffer.setData({
        positions: lineData.positions,
        nextPositions: lineData.nextPositions,
        sides: lineData.sides,
      });
    } else {
      buffer.setData({
        positions: new Float32Array(),
        nextPositions: new Float32Array(),
        sides: new Float32Array(),
      });
    }

    this.renderables.set(geometry.id, {
      id: geometry.id,
      buffer,
      type: "polyline",
      needsUpdate: false,
    });
  }

  private updateMeshGeometry(geometry: SurfaceGeometry, existing?: RenderableGeometry): void {
    let buffer: GeometryBuffer;
    const edgeBufferId = `${geometry.id}__edges`;
    const edgeLineBufferBaseId = `${geometry.id}__edge_lines`;
    let edgeBuffer: GeometryBuffer | undefined = existing?.edgeBuffer;
    let edgeLineBuffers: GeometryBuffer[] = existing?.edgeLineBuffers ?? [];

    if (existing) {
      buffer = existing.buffer;
    } else {
      buffer = this.renderer.createGeometryBuffer(geometry.id);
    }

    if (geometry.mesh) {
      const meshSource = geometry.nurbs
        ? (() => {
            const tessellated = tessellateSurfaceAdaptive(geometry.nurbs);
            return {
              positions: Array.from(tessellated.positions),
              normals: Array.from(tessellated.normals),
              indices: Array.from(tessellated.indices),
              uvs: Array.from(tessellated.uvs),
            } satisfies RenderMesh;
          })()
        : geometry.mesh;

      const flatMesh = createFlatShadedMesh(meshSource);
      buffer.setData({
        positions: flatMesh.positions,
        normals: flatMesh.normals,
        indices: flatMesh.indices,
      });

      const edgeSegments = buildEdgeSegments(meshSource);
      const edgeIndices = buildEdgeIndexBuffer(edgeSegments);
      if (!edgeBuffer) {
        edgeBuffer = this.renderer.createGeometryBuffer(edgeBufferId);
      }
      edgeBuffer.setData({
        positions: new Float32Array(meshSource.positions),
        indices: edgeIndices,
      });

      const edgeLineChunks = buildEdgeLineBufferChunks(meshSource, edgeSegments);
      if (edgeLineChunks.length > 0) {
        const nextBuffers: GeometryBuffer[] = [];
        edgeLineChunks.forEach((chunk, index) => {
          const bufferId = `${edgeLineBufferBaseId}_${index}`;
          let buffer = edgeLineBuffers[index];
          if (!buffer) {
            buffer = this.renderer.createGeometryBuffer(bufferId);
          }
          buffer.setData({
            positions: chunk.positions,
            nextPositions: chunk.nextPositions,
            sides: chunk.sides,
            edgeKinds: chunk.edgeKinds,
            indices: chunk.indices,
          });
          nextBuffers.push(buffer);
        });

        for (let i = edgeLineChunks.length; i < edgeLineBuffers.length; i += 1) {
          this.renderer.deleteGeometryBuffer(edgeLineBuffers[i].id);
        }
        edgeLineBuffers = nextBuffers;
      } else {
        edgeLineBuffers.forEach((buffer) => this.renderer.deleteGeometryBuffer(buffer.id));
        edgeLineBuffers = [];
      }
    }

    this.renderables.set(geometry.id, {
      id: geometry.id,
      buffer,
      edgeBuffer,
      edgeLineBuffers,
      type: "mesh",
      needsUpdate: false,
    });
  }

  removeGeometry(id: string): void {
    const renderable = this.renderables.get(id);
    if (renderable) {
      this.renderer.deleteGeometryBuffer(id);
      if (renderable.edgeBuffer) {
        this.renderer.deleteGeometryBuffer(renderable.edgeBuffer.id);
      }
      if (renderable.edgeLineBuffers) {
        renderable.edgeLineBuffers.forEach((buffer) => {
          this.renderer.deleteGeometryBuffer(buffer.id);
        });
      }
      this.renderables.delete(id);
    }
  }

  getRenderable(id: string): RenderableGeometry | undefined {
    return this.renderables.get(id);
  }

  getAllRenderables(): RenderableGeometry[] {
    return Array.from(this.renderables.values());
  }

  markForUpdate(id: string): void {
    const renderable = this.renderables.get(id);
    if (renderable) {
      renderable.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const renderable of this.renderables.values()) {
      this.renderer.deleteGeometryBuffer(renderable.id);
      if (renderable.edgeBuffer) {
        this.renderer.deleteGeometryBuffer(renderable.edgeBuffer.id);
      }
      if (renderable.edgeLineBuffers) {
        renderable.edgeLineBuffers.forEach((buffer) => {
          this.renderer.deleteGeometryBuffer(buffer.id);
        });
      }
    }
    this.renderables.clear();
  }

  private getVertexTemplate(): RenderMesh {
    if (!this.vertexTemplate) {
      this.vertexTemplate = generateSphereMesh(0.02, 12);
    }
    return this.vertexTemplate;
  }
}

export function convertVertexArrayToNURBSCurve(
  vertices: { x: number; y: number; z: number }[],
  degree = Math.min(3, vertices.length - 1)
): NURBSCurve {
  return createNurbsCurveFromPoints(vertices, degree, false);
}

export function createLineBufferData(
  points: { x: number; y: number; z: number }[]
): {
  positions: Float32Array;
  nextPositions: Float32Array;
  sides: Float32Array;
} {
  const positions: number[] = [];
  const nextPositions: number[] = [];
  const sides: number[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];

    positions.push(curr.x, curr.y, curr.z);
    nextPositions.push(next.x, next.y, next.z);
    sides.push(-1);

    positions.push(curr.x, curr.y, curr.z);
    nextPositions.push(next.x, next.y, next.z);
    sides.push(1);
  }

  return {
    positions: new Float32Array(positions),
    nextPositions: new Float32Array(nextPositions),
    sides: new Float32Array(sides),
  };
}

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

const createFlatShadedMesh = (
  mesh: RenderMesh
): { positions: Float32Array; normals: Float32Array; indices: Uint16Array } => {
  const baseIndices = toTriangleIndices(mesh);
  const positionsOut: number[] = [];
  const normalsOut: number[] = [];
  const indicesOut: number[] = [];

  let cursor = 0;

  const pushNormal = (nx: number, ny: number, nz: number) => {
    normalsOut.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  };

  for (let i = 0; i + 2 < baseIndices.length; i += 3) {
    const ia = baseIndices[i] * 3;
    const ib = baseIndices[i + 1] * 3;
    const ic = baseIndices[i + 2] * 3;

    const ax = mesh.positions[ia];
    const ay = mesh.positions[ia + 1];
    const az = mesh.positions[ia + 2];
    const bx = mesh.positions[ib];
    const by = mesh.positions[ib + 1];
    const bz = mesh.positions[ib + 2];
    const cx = mesh.positions[ic];
    const cy = mesh.positions[ic + 1];
    const cz = mesh.positions[ic + 2];

    const abx = bx - ax;
    const aby = by - ay;
    const abz = bz - az;
    const acx = cx - ax;
    const acy = cy - ay;
    const acz = cz - az;

    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;
    const length = Math.hypot(nx, ny, nz) || 1;
    nx /= length;
    ny /= length;
    nz /= length;

    positionsOut.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    pushNormal(nx, ny, nz);
    indicesOut.push(cursor, cursor + 1, cursor + 2);
    cursor += 3;
  }

  if (cursor > 65535) {
    return {
      positions: new Float32Array(mesh.positions),
      normals: new Float32Array(mesh.normals),
      indices: new Uint16Array(mesh.indices),
    };
  }

  return {
    positions: new Float32Array(positionsOut),
    normals: new Float32Array(normalsOut),
    indices: new Uint16Array(indicesOut),
  };
};

const EDGE_KIND_INTERNAL = 0;
const EDGE_KIND_CREASE = 1;
const EDGE_KIND_SILHOUETTE = 2;
const CREASE_ANGLE = Math.PI / 6;

type EdgeSegment = { a: number; b: number; kind: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

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

const buildEdgeIndexBuffer = (segments: EdgeSegment[]): Uint16Array => {
  const edgeIndices: number[] = [];
  segments.forEach(({ a, b }) => {
    edgeIndices.push(a, b);
  });
  return new Uint16Array(edgeIndices);
};

const buildEdgeLineBufferChunks = (
  mesh: RenderMesh,
  edgeSegments: EdgeSegment[]
): Array<{
  positions: Float32Array;
  nextPositions: Float32Array;
  sides: Float32Array;
  edgeKinds: Float32Array;
  indices: Uint16Array;
}> => {
  const segments = edgeSegments.length;
  if (segments === 0) return [];

  const maxSegments = Math.floor(65535 / 4);
  const chunks: Array<{
    positions: Float32Array;
    nextPositions: Float32Array;
    sides: Float32Array;
    edgeKinds: Float32Array;
    indices: Uint16Array;
  }> = [];

  for (let start = 0; start < segments; start += maxSegments) {
    const chunkSegments = Math.min(maxSegments, segments - start);
    const positions = new Float32Array(chunkSegments * 12);
    const nextPositions = new Float32Array(chunkSegments * 12);
    const sides = new Float32Array(chunkSegments * 4);
    const edgeKinds = new Float32Array(chunkSegments * 4);
    const indices = new Uint16Array(chunkSegments * 6);

    for (let i = 0; i < chunkSegments; i += 1) {
      const edge = edgeSegments[start + i];
      const a = edge.a;
      const b = edge.b;
      const ai = a * 3;
      const bi = b * 3;
      const ax = mesh.positions[ai];
      const ay = mesh.positions[ai + 1];
      const az = mesh.positions[ai + 2];
      const bx = mesh.positions[bi];
      const by = mesh.positions[bi + 1];
      const bz = mesh.positions[bi + 2];

      const vertexOffset = i * 12;
      positions[vertexOffset] = ax;
      positions[vertexOffset + 1] = ay;
      positions[vertexOffset + 2] = az;
      positions[vertexOffset + 3] = ax;
      positions[vertexOffset + 4] = ay;
      positions[vertexOffset + 5] = az;
      positions[vertexOffset + 6] = bx;
      positions[vertexOffset + 7] = by;
      positions[vertexOffset + 8] = bz;
      positions[vertexOffset + 9] = bx;
      positions[vertexOffset + 10] = by;
      positions[vertexOffset + 11] = bz;

      nextPositions[vertexOffset] = bx;
      nextPositions[vertexOffset + 1] = by;
      nextPositions[vertexOffset + 2] = bz;
      nextPositions[vertexOffset + 3] = bx;
      nextPositions[vertexOffset + 4] = by;
      nextPositions[vertexOffset + 5] = bz;
      nextPositions[vertexOffset + 6] = ax;
      nextPositions[vertexOffset + 7] = ay;
      nextPositions[vertexOffset + 8] = az;
      nextPositions[vertexOffset + 9] = ax;
      nextPositions[vertexOffset + 10] = ay;
      nextPositions[vertexOffset + 11] = az;

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
      indices[indexOffset] = v;
      indices[indexOffset + 1] = v + 1;
      indices[indexOffset + 2] = v + 2;
      indices[indexOffset + 3] = v + 1;
      indices[indexOffset + 4] = v + 3;
      indices[indexOffset + 5] = v + 2;
    }

    chunks.push({
      positions,
      nextPositions,
      sides,
      edgeKinds,
      indices,
    });
  }

  return chunks;
};
