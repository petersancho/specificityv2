import type { Geometry, MeshGeometry, RenderMesh, Vec3, VertexGeometry } from "../../types";
import { generateBoxMesh, generateSphereMesh } from "../../geometry/mesh";

export type TestContext = {
  nodeId: string;
  geometryById: Map<string, Geometry>;
  vertexById: Map<string, VertexGeometry>;
};

export const createTestContext = (nodeId: string, geometry: Geometry[] = []): TestContext => {
  const geometryById = new Map<string, Geometry>();
  geometry.forEach((item) => geometryById.set(item.id, item));
  return { nodeId, geometryById, vertexById: new Map() };
};

export const createBoxGeometry = (
  id: string,
  size: { width: number; height: number; depth: number } = { width: 2, height: 1, depth: 2 },
  segments = 1
): MeshGeometry => ({
  id,
  type: "mesh",
  mesh: generateBoxMesh(size, segments),
  layerId: "layer-test",
});

export const createSphereGeometry = (
  id: string,
  radius = 1,
  segments = 16
): MeshGeometry => ({
  id,
  type: "mesh",
  mesh: generateSphereMesh(radius, segments),
  layerId: "layer-test",
});

export const meshBounds = (mesh: RenderMesh) => {
  const min: Vec3 = { x: Infinity, y: Infinity, z: Infinity };
  const max: Vec3 = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = mesh.positions[i];
    const y = mesh.positions[i + 1];
    const z = mesh.positions[i + 2];
    if (x < min.x) min.x = x;
    if (y < min.y) min.y = y;
    if (z < min.z) min.z = z;
    if (x > max.x) max.x = x;
    if (y > max.y) max.y = y;
    if (z > max.z) max.z = z;
  }
  return { min, max };
};

const axisIndex = (axis: "x" | "y" | "z") => (axis === "x" ? 0 : axis === "y" ? 1 : 2);

export const findVertexIndicesAtExtent = (
  mesh: RenderMesh,
  axis: "x" | "y" | "z",
  mode: "min" | "max"
) => {
  const bounds = meshBounds(mesh);
  const target = mode === "min" ? bounds.min[axis] : bounds.max[axis];
  const size = bounds.max[axis] - bounds.min[axis];
  const epsilon = Math.max(1e-6, Math.abs(size) * 0.01);
  const indices: number[] = [];
  const axisOffset = axisIndex(axis);
  const count = Math.floor(mesh.positions.length / 3);
  for (let i = 0; i < count; i += 1) {
    const value = mesh.positions[i * 3 + axisOffset];
    if (Math.abs(value - target) <= epsilon) indices.push(i);
  }
  return indices;
};

export const wrapMeshGeometry = (id: string, mesh: RenderMesh): MeshGeometry => ({
  id,
  type: "mesh",
  mesh: {
    positions: [...mesh.positions],
    normals: [...mesh.normals],
    uvs: [...mesh.uvs],
    indices: [...mesh.indices],
    colors: mesh.colors ? [...mesh.colors] : undefined,
  },
  layerId: "layer-test",
});
