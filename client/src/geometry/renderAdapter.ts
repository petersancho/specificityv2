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
import { generateBoxMesh } from "./mesh";
import { tessellateCurveAdaptive, tessellateSurfaceAdaptive } from "./tessellation";

export type RenderableGeometry = {
  id: string;
  buffer: GeometryBuffer;
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

    if (existing) {
      buffer = existing.buffer;
    } else {
      buffer = this.renderer.createGeometryBuffer(geometry.id);
    }

    if (geometry.mesh) {
      buffer.setData({
        positions: new Float32Array(geometry.mesh.positions),
        normals: new Float32Array(geometry.mesh.normals),
        indices: new Uint16Array(geometry.mesh.indices),
      });
    }

    this.renderables.set(geometry.id, {
      id: geometry.id,
      buffer,
      type: "mesh",
      needsUpdate: false,
    });
  }

  removeGeometry(id: string): void {
    const renderable = this.renderables.get(id);
    if (renderable) {
      this.renderer.deleteGeometryBuffer(id);
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
    }
    this.renderables.clear();
  }

  private getVertexTemplate(): RenderMesh {
    if (!this.vertexTemplate) {
      this.vertexTemplate = generateBoxMesh({ width: 0.04, height: 0.04, depth: 0.04 });
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
