import { computeVertexNormals } from "../../../geometry/mesh";
import {
  meshRelax,
  toTessellationMesh,
  tessellationMeshToRenderMesh,
} from "../../../geometry/meshTessellationOps";
import type { RenderMesh } from "../../../types";

type PlasticwrapSmoothingOptions = {
  distance: number;
  smooth: number;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const resolveMeshIndices = (mesh: RenderMesh) => {
  if (mesh.indices.length > 0) return mesh.indices;
  return Array.from({ length: mesh.positions.length / 3 }, (_, i) => i);
};

export const applyPlasticwrapSmoothing = (
  mesh: RenderMesh,
  { distance, smooth }: PlasticwrapSmoothingOptions
): RenderMesh => {
  if (mesh.positions.length === 0) return mesh;

  const smoothClamped = clampNumber(smooth, 0, 1);
  const strength = 1 - smoothClamped;
  if (strength <= 0) return mesh;

  const relaxIterations = Math.max(1, Math.round(2 + smoothClamped * 6));
  const relaxStrength = clampNumber(0.2 + smoothClamped * 0.6, 0.2, 0.9);

  const tessellation = toTessellationMesh(mesh);
  const relaxed = meshRelax(tessellation, relaxIterations, relaxStrength, true);
  const relaxedMesh = tessellationMeshToRenderMesh(relaxed);
  if (relaxedMesh.positions.length !== mesh.positions.length) return mesh;

  const maxDistance = distance > 0 ? distance : Number.POSITIVE_INFINITY;
  const nextPositions = mesh.positions.slice();
  for (let i = 0; i + 2 < nextPositions.length; i += 3) {
    const bx = mesh.positions[i];
    const by = mesh.positions[i + 1];
    const bz = mesh.positions[i + 2];
    let dx = relaxedMesh.positions[i] - bx;
    let dy = relaxedMesh.positions[i + 1] - by;
    let dz = relaxedMesh.positions[i + 2] - bz;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance > 0 && len > maxDistance && len > 1e-12) {
      const scale = maxDistance / len;
      dx *= scale;
      dy *= scale;
      dz *= scale;
    }
    nextPositions[i] = bx + dx * strength;
    nextPositions[i + 1] = by + dy * strength;
    nextPositions[i + 2] = bz + dz * strength;
  }

  const indices = resolveMeshIndices(mesh);
  const normals = computeVertexNormals(nextPositions, indices);

  return {
    ...mesh,
    positions: nextPositions,
    normals,
    indices: mesh.indices.length > 0 ? mesh.indices : indices,
  };
};
