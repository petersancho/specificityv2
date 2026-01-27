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

export type RenderableGeometry = {
  id: string;
  buffer: GeometryBuffer;
  edgeBuffer?: GeometryBuffer;
  type: "vertex" | "polyline" | "surface" | "mesh";
  needsUpdate: boolean;
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
      const lineData = createLineBufferData(points);
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
    let edgeBuffer: GeometryBuffer | undefined = existing?.edgeBuffer;

    if (existing) {
      buffer = existing.buffer;
    } else {
      buffer = this.renderer.createGeometryBuffer(geometry.id);
    }

    if (geometry.mesh) {
      const flatMesh = createFlatShadedMesh(geometry.mesh);
      buffer.setData({
        positions: flatMesh.positions,
        normals: flatMesh.normals,
        indices: flatMesh.indices,
      });

      const edgeIndices = buildEdgeIndexBuffer(geometry.mesh);
      if (!edgeBuffer) {
        edgeBuffer = this.renderer.createGeometryBuffer(edgeBufferId);
      }
      edgeBuffer.setData({
        positions: new Float32Array(geometry.mesh.positions),
        indices: edgeIndices,
      });
    }

    this.renderables.set(geometry.id, {
      id: geometry.id,
      buffer,
      edgeBuffer,
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

export function convertVertexArrayToNURBSCurve(vertices: { x: number; y: number; z: number }[]): NURBSCurve {
  const degree = Math.min(3, vertices.length - 1);
  const n = vertices.length;
  const m = n + degree + 1;

  const knots: number[] = [];
  for (let i = 0; i <= degree; i++) {
    knots.push(0);
  }
  for (let i = 1; i < n - degree; i++) {
    knots.push(i / (n - degree));
  }
  for (let i = 0; i <= degree; i++) {
    knots.push(1);
  }

  return {
    controlPoints: vertices,
    knots,
    degree,
  };
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

const buildEdgeIndexBuffer = (mesh: RenderMesh): Uint16Array => {
  const baseIndices = toTriangleIndices(mesh);
  const edges = new Map<string, [number, number]>();

  const addEdge = (a: number, b: number) => {
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    const key = `${min}:${max}`;
    if (!edges.has(key)) {
      edges.set(key, [min, max]);
    }
  };

  for (let i = 0; i + 2 < baseIndices.length; i += 3) {
    const a = baseIndices[i];
    const b = baseIndices[i + 1];
    const c = baseIndices[i + 2];
    addEdge(a, b);
    addEdge(b, c);
    addEdge(c, a);
  }

  const edgeIndices: number[] = [];
  edges.forEach(([a, b]) => {
    edgeIndices.push(a, b);
  });

  return new Uint16Array(edgeIndices);
};
