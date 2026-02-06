import type {
  Geometry,
  NurbsCurveGeometry,
  NurbsSurfaceGeometry,
  BRepGeometry,
  PolylineGeometry,
  SurfaceGeometry,
  VertexGeometry,
  RenderMesh,
} from "../types";
import { toGPUMesh } from "../types";
import type { GeometryBuffer } from "../webgl/BufferManager";
import type { WebGLRenderer } from "../webgl/WebGLRenderer";
import type { NURBSCurve, NURBSSurface } from "./nurbs";
import { tessellateCurveAdaptive, tessellateSurfaceAdaptive } from "./tessellation";
import { createNurbsCurveFromPoints } from "./nurbs";
import { tessellateBRepToMesh } from "./brep";
import { assertPositionsValid, validateColorsLength, clamp01 } from "./validation";
import { EPSILON } from "../math/constants";

export type RenderableGeometry = {
  id: string;
  buffer: GeometryBuffer;
  edgeBuffer?: GeometryBuffer;
  edgeJoinBuffer?: GeometryBuffer;
  edgeLineBuffers?: GeometryBuffer[];
  type: "vertex" | "polyline" | "surface" | "mesh";
  needsUpdate: boolean;
  renderOptions?: import("../types").GeometryRenderOptions;
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
    } else if (geometry.type === "nurbsCurve") {
      this.updateNurbsCurveGeometry(geometry as NurbsCurveGeometry, existing);
    } else if (geometry.type === "nurbsSurface" || geometry.type === "brep") {
      this.updateMeshGeometry(geometry, existing);
    } else if ("mesh" in geometry) {
      this.updateMeshGeometry(geometry, existing);
    }
  }

  private updateVertexGeometry(geometry: VertexGeometry, existing?: RenderableGeometry): void {
    let buffer: GeometryBuffer;

    if (existing) {
      buffer = existing.buffer;
    } else {
      buffer = this.renderer.createGeometryBuffer(geometry.id);
    }

    if (existing?.edgeBuffer) {
      this.renderer.deleteGeometryBuffer(existing.edgeBuffer.id);
    }

    buffer.setData({
      positions: new Float32Array([
        geometry.position.x,
        geometry.position.y,
        geometry.position.z,
      ]),
      indices: new Uint16Array(),
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
                Math.abs(first.x - last.x) < EPSILON.DISTANCE &&
                Math.abs(first.y - last.y) < EPSILON.DISTANCE &&
                Math.abs(first.z - last.z) < EPSILON.DISTANCE;
              const closedPoints = isClosed ? sampled : [...sampled, { ...first }];
              closedPoints[closedPoints.length - 1] = { ...first };
              return closedPoints;
            }
            return sampled;
          })()
        : geometry.closed
          ? [...points, points[0]]
          : points;

      const lineData = createLineBufferData(renderPoints);
      buffer.setData({
        positions: lineData.positions,
        prevPositions: lineData.prevPositions,
        nextPositions: lineData.nextPositions,
        sides: lineData.sides,
      });
    } else {
      buffer.setData({
        positions: new Float32Array(),
        prevPositions: new Float32Array(),
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

  private updateNurbsCurveGeometry(
    geometry: NurbsCurveGeometry,
    existing?: RenderableGeometry
  ): void {
    let buffer: GeometryBuffer;

    if (existing) {
      buffer = existing.buffer;
    } else {
      buffer = this.renderer.createGeometryBuffer(geometry.id);
    }

    const curve = geometry.nurbs;
    const tessellated = tessellateCurveAdaptive(curve);
    let points = tessellated.points;
    if (geometry.closed && points.length > 0) {
      const first = points[0];
      const last = points[points.length - 1];
      const isClosed =
        Math.abs(first.x - last.x) < EPSILON.DISTANCE &&
        Math.abs(first.y - last.y) < EPSILON.DISTANCE &&
        Math.abs(first.z - last.z) < EPSILON.DISTANCE;
      if (!isClosed) {
        points = [...points, { ...first }];
      }
      if (points.length > 0) {
        points[points.length - 1] = { ...first };
      }
    }

    if (points.length >= 2) {
      const lineData = createLineBufferData(points);
      buffer.setData({
        positions: lineData.positions,
        prevPositions: lineData.prevPositions,
        nextPositions: lineData.nextPositions,
        sides: lineData.sides,
      });
    } else {
      buffer.setData({
        positions: new Float32Array(),
        prevPositions: new Float32Array(),
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

  // NUMERICA: Returns computational mesh representation (number[] for serialization)
  private resolveMeshSource(geometry: Geometry): RenderMesh | null {
    if (geometry.type === "nurbsSurface") {
      const nurbsSurface = geometry as NurbsSurfaceGeometry;
      if (nurbsSurface.mesh?.positions?.length) return nurbsSurface.mesh;
      const tessellated = tessellateSurfaceAdaptive(nurbsSurface.nurbs);
      return {
        positions: Array.from(tessellated.positions),
        normals: Array.from(tessellated.normals),
        indices: Array.from(tessellated.indices),
        uvs: Array.from(tessellated.uvs),
      };
    }

    if (geometry.type === "brep") {
      const brep = geometry as BRepGeometry;
      if (brep.mesh?.positions?.length) return brep.mesh;
      return tessellateBRepToMesh(brep.brep);
    }

    if ("mesh" in geometry && geometry.mesh) {
      console.log('[RENDER ADAPTER] Resolved mesh source:', {
        id: geometry.id,
        type: geometry.type,
        hasMesh: !!geometry.mesh,
        vertices: geometry.mesh.positions.length / 3,
        triangles: geometry.mesh.indices.length / 3,
      });
      if (geometry.type === "surface" && geometry.nurbs) {
        const tessellated = tessellateSurfaceAdaptive(geometry.nurbs);
        return {
          positions: Array.from(tessellated.positions),
          normals: Array.from(tessellated.normals),
          indices: Array.from(tessellated.indices),
          uvs: Array.from(tessellated.uvs),
        };
      }
      return geometry.mesh;
    }

    console.warn('[RENDER ADAPTER] Could not resolve mesh source for geometry:', {
      id: geometry.id,
      type: geometry.type,
      hasMeshProperty: "mesh" in geometry,
    });
    return null;
  }

  private updateMeshGeometry(geometry: Geometry, existing?: RenderableGeometry): void {
    let buffer: GeometryBuffer;
    const edgeBufferId = `${geometry.id}__edges`;
    const edgeLineBufferBaseId = `${geometry.id}__edge_lines`;
    const edgeJoinBufferId = `${geometry.id}__edge_joins`;
    let edgeBuffer: GeometryBuffer | undefined = existing?.edgeBuffer;
    let edgeLineBuffers: GeometryBuffer[] = existing?.edgeLineBuffers ?? [];
    let edgeJoinBuffer: GeometryBuffer | undefined = existing?.edgeJoinBuffer;

    if (existing) {
      buffer = existing.buffer;
    } else {
      buffer = this.renderer.createGeometryBuffer(geometry.id);
    }

    const meshSource = this.resolveMeshSource(geometry);
    if (meshSource) {
      console.log('[RENDER ADAPTER] Rendering mesh geometry:', {
        id: geometry.id,
        type: geometry.type,
        vertices: meshSource.positions.length / 3,
        triangles: meshSource.indices.length / 3,
        hasColors: !!meshSource.colors,
        hasNormals: !!meshSource.normals,
      });
      const flatMesh = createFlatShadedMesh(meshSource);
      buffer.setData({
        positions: flatMesh.positions,
        normals: flatMesh.normals,
        indices: flatMesh.indices,
        colors: flatMesh.colors,
      });

      const edgeSegments = buildEdgeSegments(meshSource);
      const edgeIndices = buildEdgeIndexBuffer(edgeSegments);
      if (!edgeBuffer) {
        edgeBuffer = this.renderer.createGeometryBuffer(edgeBufferId);
      }
      // NUMERICA → ROSLYN: Convert mesh positions for edge rendering
      const gpuMesh = toGPUMesh(meshSource);
      edgeBuffer.setData({
        positions: gpuMesh.positions,
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
            prevPositions: chunk.prevPositions,
            nextPositions: chunk.nextPositions,
            sides: chunk.sides,
            edgeKinds: chunk.edgeKinds,
            faceNormal1: chunk.faceNormal1,
            faceNormal2: chunk.faceNormal2,
            hasFace2: chunk.hasFace2,
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

      const edgeJoinData = buildEdgeJoinBuffer(meshSource, edgeSegments);
      if (!edgeJoinBuffer) {
        edgeJoinBuffer = this.renderer.createGeometryBuffer(edgeJoinBufferId);
      }
      edgeJoinBuffer.setData({
        positions: edgeJoinData.positions,
        prevPositions: edgeJoinData.prevPositions,
        nextPositions: edgeJoinData.nextPositions,
        corners: edgeJoinData.corners,
        edgeKinds: edgeJoinData.edgeKinds,
        indices: edgeJoinData.indices,
      });
    }

    const renderOptions =
      geometry.type === "mesh" ? geometry.renderOptions : undefined;

    this.renderables.set(geometry.id, {
      id: geometry.id,
      buffer,
      edgeBuffer,
      edgeJoinBuffer,
      edgeLineBuffers,
      type: "mesh",
      needsUpdate: false,
      renderOptions,
    });
  }

  removeGeometry(id: string): void {
    const renderable = this.renderables.get(id);
    if (renderable) {
      this.renderer.deleteGeometryBuffer(id);
      if (renderable.edgeBuffer) {
        this.renderer.deleteGeometryBuffer(renderable.edgeBuffer.id);
      }
      if (renderable.edgeJoinBuffer) {
        this.renderer.deleteGeometryBuffer(renderable.edgeJoinBuffer.id);
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
      if (renderable.edgeJoinBuffer) {
        this.renderer.deleteGeometryBuffer(renderable.edgeJoinBuffer.id);
      }
      if (renderable.edgeLineBuffers) {
        renderable.edgeLineBuffers.forEach((buffer) => {
          this.renderer.deleteGeometryBuffer(buffer.id);
        });
      }
    }
    this.renderables.clear();
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
  prevPositions: Float32Array;
  nextPositions: Float32Array;
  sides: Float32Array;
} {
  const isClosed =
    points.length > 2 &&
    points[0].x === points[points.length - 1].x &&
    points[0].y === points[points.length - 1].y &&
    points[0].z === points[points.length - 1].z;
  const path = isClosed ? points.slice(0, -1) : points;
  const count = path.length;
  const positions: number[] = [];
  const prevPositions: number[] = [];
  const nextPositions: number[] = [];
  const sides: number[] = [];

  if (count < 2) {
    return {
      positions: new Float32Array(),
      prevPositions: new Float32Array(),
      nextPositions: new Float32Array(),
      sides: new Float32Array(),
    };
  }

  for (let i = 0; i < count; i += 1) {
    const prev = path[i === 0 ? (isClosed ? count - 1 : 0) : i - 1];
    const curr = path[i];
    const next = path[i === count - 1 ? (isClosed ? 0 : count - 1) : i + 1];

    positions.push(curr.x, curr.y, curr.z);
    positions.push(curr.x, curr.y, curr.z);

    prevPositions.push(prev.x, prev.y, prev.z);
    prevPositions.push(prev.x, prev.y, prev.z);

    nextPositions.push(next.x, next.y, next.z);
    nextPositions.push(next.x, next.y, next.z);

    sides.push(-1, 1);
  }

  return {
    positions: new Float32Array(positions),
    prevPositions: new Float32Array(prevPositions),
    nextPositions: new Float32Array(nextPositions),
    sides: new Float32Array(sides),
  };
}

const toTriangleIndices = (mesh: RenderMesh): number[] => {
  const vertexCount = Math.floor(mesh.positions.length / 3);
  if (vertexCount === 0) {
    return [];
  }
  if (mesh.indices.length >= 3) {
    const filtered: number[] = [];
    for (let i = 0; i + 2 < mesh.indices.length; i += 3) {
      const a = mesh.indices[i];
      const b = mesh.indices[i + 1];
      const c = mesh.indices[i + 2];
      if (a < vertexCount && b < vertexCount && c < vertexCount) {
        filtered.push(a, b, c);
      }
    }
    return filtered;
  }
  const indices: number[] = [];
  for (let i = 0; i + 2 < vertexCount; i += 3) {
    indices.push(i, i + 1, i + 2);
  }
  return indices;
};

const createFlatShadedMesh = (
  mesh: RenderMesh
): {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
  colors?: Float32Array;
} => {
  // Validate positions array is properly aligned
  assertPositionsValid(mesh.positions, "createFlatShadedMesh");
  
  const baseIndices = toTriangleIndices(mesh);
  const positionsOut: number[] = [];
  const normalsOut: number[] = [];
  const indicesOut: number[] = [];
  const hasColors = validateColorsLength(mesh.positions, mesh.colors, "createFlatShadedMesh");
  const colorsOut: number[] = [];
  const sourceColors = mesh.colors ?? [];

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
    if (hasColors) {
      colorsOut.push(
        clamp01(sourceColors[ia] ?? 0),
        clamp01(sourceColors[ia + 1] ?? 0),
        clamp01(sourceColors[ia + 2] ?? 0),
        clamp01(sourceColors[ib] ?? 0),
        clamp01(sourceColors[ib + 1] ?? 0),
        clamp01(sourceColors[ib + 2] ?? 0),
        clamp01(sourceColors[ic] ?? 0),
        clamp01(sourceColors[ic + 1] ?? 0),
        clamp01(sourceColors[ic + 2] ?? 0)
      );
    }
    pushNormal(nx, ny, nz);
    indicesOut.push(cursor, cursor + 1, cursor + 2);
    cursor += 3;
  }

  if (cursor > 65535) {
    // Mesh too large for flat shading, use original mesh (NUMERICA → ROSLYN conversion)
    const gpuMesh = toGPUMesh(mesh);
    return {
      positions: gpuMesh.positions,
      normals: gpuMesh.normals,
      indices: gpuMesh.indices,
      colors: hasColors ? new Float32Array(sourceColors) : undefined,
    };
  }

  return {
    positions: new Float32Array(positionsOut),
    normals: new Float32Array(normalsOut),
    indices: new Uint16Array(indicesOut),
    colors: hasColors ? new Float32Array(colorsOut) : undefined,
  };
};

// Edge Classification by Dihedral Angle:
//
// INTERNAL (0):    Smooth edges (< 150°) - tessellation artifacts, hidden
// CREASE (1):      Sharp edges (≥ 150°) - geometric features, visible when front-facing
// SILHOUETTE (2):  Boundary edges - adjacent to only one face, visible when front-facing
//
// CREASE_ANGLE = 170° for minimal cartoon aesthetic:
// - Box corners (90°): CREASE
// - Most tessellation edges (<170°): INTERNAL (hidden)
const EDGE_KIND_INTERNAL = 0;
const EDGE_KIND_CREASE = 1;
const EDGE_KIND_SILHOUETTE = 2;
const CREASE_ANGLE_DEG = 170;
const CREASE_ANGLE = (CREASE_ANGLE_DEG * Math.PI) / 180;

type EdgeSegment = {
  a: number;
  b: number;
  kind: number;
  nx1: number;
  ny1: number;
  nz1: number;
  nx2: number;
  ny2: number;
  nz2: number;
  hasFace2: boolean;
};

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
    if (len < EPSILON.DISTANCE) continue;
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
    const hasFace2 = edge.count >= 2;
    
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
    
    segments.push({
      a: edge.a,
      b: edge.b,
      kind,
      nx1: edge.nx1,
      ny1: edge.ny1,
      nz1: edge.nz1,
      nx2: hasFace2 ? edge.nx2 : edge.nx1,
      ny2: hasFace2 ? edge.ny2 : edge.ny1,
      nz2: hasFace2 ? edge.nz2 : edge.nz1,
      hasFace2,
    });
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

const buildEdgeJoinBuffer = (
  mesh: RenderMesh,
  edgeSegments: EdgeSegment[]
): {
  positions: Float32Array;
  prevPositions: Float32Array;
  nextPositions: Float32Array;
  corners: Float32Array;
  edgeKinds: Float32Array;
  indices: Uint16Array;
} => {
  if (edgeSegments.length === 0) {
    return {
      positions: new Float32Array(),
      prevPositions: new Float32Array(),
      nextPositions: new Float32Array(),
      corners: new Float32Array(),
      edgeKinds: new Float32Array(),
      indices: new Uint16Array(),
    };
  }

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

  const edgesByVertex = new Map<string, Array<{ vertex: number; neighbor: number; kind: number }>>();
  const pushEntry = (vertex: number, neighbor: number, kind: number) => {
    const key = `${groupForVertex[vertex]}:${kind}`;
    const list = edgesByVertex.get(key) ?? [];
    list.push({ vertex, neighbor, kind });
    edgesByVertex.set(key, list);
  };
  edgeSegments.forEach((edge) => {
    pushEntry(edge.a, edge.b, edge.kind);
    pushEntry(edge.b, edge.a, edge.kind);
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

  const joinRecords: Array<{
    vertex: number;
    prevNeighbor: number;
    nextNeighbor: number;
    kind: number;
  }> = [];

  edgesByVertex.forEach((entries) => {
    if (entries.length < 2) return;
    const normal = getVertexNormal(entries);
    const basis = buildBasis(normal);
    const withAngles = entries.map((entry) => {
      const vOffset = entry.neighbor * 3;
      const cx = positions[entry.vertex * 3];
      const cy = positions[entry.vertex * 3 + 1];
      const cz = positions[entry.vertex * 3 + 2];
      const vx = positions[vOffset] - cx;
      const vy = positions[vOffset + 1] - cy;
      const vz = positions[vOffset + 2] - cz;
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
      return { ...entry, angle, dir: { x: px, y: py, z: pz } };
    });

    withAngles.sort((a, b) => a.angle - b.angle);
    const count = withAngles.length;
    for (let i = 0; i < count; i += 1) {
      const current = withAngles[i];
      const next = withAngles[(i + 1) % count];
      const dot =
        current.dir.x * next.dir.x +
        current.dir.y * next.dir.y +
        current.dir.z * next.dir.z;
      if (dot > 0.999) continue;
      joinRecords.push({
        vertex: current.vertex,
        prevNeighbor: current.neighbor,
        nextNeighbor: next.neighbor,
        kind: current.kind,
      });
    }
  });

  if (joinRecords.length === 0) {
    return {
      positions: new Float32Array(),
      prevPositions: new Float32Array(),
      nextPositions: new Float32Array(),
      corners: new Float32Array(),
      edgeKinds: new Float32Array(),
      indices: new Uint16Array(),
    };
  }

  const quadCount = joinRecords.length;
  const positionsOut = new Float32Array(quadCount * 12);
  const prevPositionsOut = new Float32Array(quadCount * 12);
  const nextPositionsOut = new Float32Array(quadCount * 12);
  const cornersOut = new Float32Array(quadCount * 8);
  const edgeKindsOut = new Float32Array(quadCount * 4);
  const indicesOut = new Uint16Array(quadCount * 6);

  const cornerCoords = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];

  joinRecords.forEach((join, index) => {
    const vertexOffset = index * 12;
    const cornerOffset = index * 8;
    const kindOffset = index * 4;
    const indexOffset = index * 6;
    const base = index * 4;

    const center = join.vertex * 3;
    const prev = join.prevNeighbor * 3;
    const next = join.nextNeighbor * 3;

    for (let i = 0; i < 4; i += 1) {
      const vOffset = vertexOffset + i * 3;
      positionsOut[vOffset] = positions[center];
      positionsOut[vOffset + 1] = positions[center + 1];
      positionsOut[vOffset + 2] = positions[center + 2];

      prevPositionsOut[vOffset] = positions[prev];
      prevPositionsOut[vOffset + 1] = positions[prev + 1];
      prevPositionsOut[vOffset + 2] = positions[prev + 2];

      nextPositionsOut[vOffset] = positions[next];
      nextPositionsOut[vOffset + 1] = positions[next + 1];
      nextPositionsOut[vOffset + 2] = positions[next + 2];

      const cOffset = cornerOffset + i * 2;
      cornersOut[cOffset] = cornerCoords[i][0];
      cornersOut[cOffset + 1] = cornerCoords[i][1];

      edgeKindsOut[kindOffset + i] = join.kind;
    }

    indicesOut[indexOffset] = base;
    indicesOut[indexOffset + 1] = base + 1;
    indicesOut[indexOffset + 2] = base + 2;
    indicesOut[indexOffset + 3] = base + 1;
    indicesOut[indexOffset + 4] = base + 3;
    indicesOut[indexOffset + 5] = base + 2;
  });

  return {
    positions: positionsOut,
    prevPositions: prevPositionsOut,
    nextPositions: nextPositionsOut,
    corners: cornersOut,
    edgeKinds: edgeKindsOut,
    indices: indicesOut,
  };
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
  faceNormal1: Float32Array;
  faceNormal2: Float32Array;
  hasFace2: Float32Array;
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
    faceNormal1: Float32Array;
    faceNormal2: Float32Array;
    hasFace2: Float32Array;
    indices: Uint16Array;
  }> = [];

  for (let start = 0; start < segments; start += maxSegments) {
    const chunkSegments = Math.min(maxSegments, segments - start);
    const positionsOut = new Float32Array(chunkSegments * 12);
    const prevPositionsOut = new Float32Array(chunkSegments * 12);
    const nextPositionsOut = new Float32Array(chunkSegments * 12);
    const sides = new Float32Array(chunkSegments * 4);
    const edgeKinds = new Float32Array(chunkSegments * 4);
    const faceNormal1Out = new Float32Array(chunkSegments * 12);
    const faceNormal2Out = new Float32Array(chunkSegments * 12);
    const hasFace2Out = new Float32Array(chunkSegments * 4);
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

      faceNormal1Out[vertexOffset] = edge.nx1;
      faceNormal1Out[vertexOffset + 1] = edge.ny1;
      faceNormal1Out[vertexOffset + 2] = edge.nz1;
      faceNormal1Out[vertexOffset + 3] = edge.nx1;
      faceNormal1Out[vertexOffset + 4] = edge.ny1;
      faceNormal1Out[vertexOffset + 5] = edge.nz1;
      faceNormal1Out[vertexOffset + 6] = edge.nx1;
      faceNormal1Out[vertexOffset + 7] = edge.ny1;
      faceNormal1Out[vertexOffset + 8] = edge.nz1;
      faceNormal1Out[vertexOffset + 9] = edge.nx1;
      faceNormal1Out[vertexOffset + 10] = edge.ny1;
      faceNormal1Out[vertexOffset + 11] = edge.nz1;

      faceNormal2Out[vertexOffset] = edge.nx2;
      faceNormal2Out[vertexOffset + 1] = edge.ny2;
      faceNormal2Out[vertexOffset + 2] = edge.nz2;
      faceNormal2Out[vertexOffset + 3] = edge.nx2;
      faceNormal2Out[vertexOffset + 4] = edge.ny2;
      faceNormal2Out[vertexOffset + 5] = edge.nz2;
      faceNormal2Out[vertexOffset + 6] = edge.nx2;
      faceNormal2Out[vertexOffset + 7] = edge.ny2;
      faceNormal2Out[vertexOffset + 8] = edge.nz2;
      faceNormal2Out[vertexOffset + 9] = edge.nx2;
      faceNormal2Out[vertexOffset + 10] = edge.ny2;
      faceNormal2Out[vertexOffset + 11] = edge.nz2;

      const hasFace2Val = edge.hasFace2 ? 1.0 : 0.0;
      hasFace2Out[sideOffset] = hasFace2Val;
      hasFace2Out[sideOffset + 1] = hasFace2Val;
      hasFace2Out[sideOffset + 2] = hasFace2Val;
      hasFace2Out[sideOffset + 3] = hasFace2Val;

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
      faceNormal1: faceNormal1Out,
      faceNormal2: faceNormal2Out,
      hasFace2: hasFace2Out,
      indices: indicesOut,
    });
  }

  return chunks;
};
