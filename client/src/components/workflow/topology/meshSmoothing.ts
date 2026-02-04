import type { RenderMesh } from "../../../types";
import { computeVertexNormals } from "../../../geometry/mesh";

export type TaubinSmoothingOptions = {
  iterations: number;
  lambda: number;
  mu: number;
};

const clampIterations = (value: number) =>
  Math.max(0, Math.min(200, Math.round(value)));

const resolveIndices = (mesh: RenderMesh): number[] => {
  if (mesh.indices.length > 0) return mesh.indices;
  const count = Math.floor(mesh.positions.length / 3);
  return Array.from({ length: count }, (_, i) => i);
};

const buildAdjacency = (indices: number[], vertexCount: number) => {
  const neighbors = Array.from({ length: vertexCount }, () => new Set<number>());
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];
    if (a === undefined || b === undefined || c === undefined) continue;
    neighbors[a].add(b);
    neighbors[a].add(c);
    neighbors[b].add(a);
    neighbors[b].add(c);
    neighbors[c].add(a);
    neighbors[c].add(b);
  }
  return neighbors.map((set) => Array.from(set));
};

const applyLaplacianStep = (
  positions: number[],
  adjacency: number[][],
  weight: number
) => {
  const next = positions.slice();
  for (let i = 0; i < adjacency.length; i++) {
    const neighbors = adjacency[i];
    if (neighbors.length === 0) continue;
    const base = i * 3;
    const px = positions[base];
    const py = positions[base + 1];
    const pz = positions[base + 2];
    let ax = 0;
    let ay = 0;
    let az = 0;
    for (let j = 0; j < neighbors.length; j++) {
      const n = neighbors[j] * 3;
      ax += positions[n];
      ay += positions[n + 1];
      az += positions[n + 2];
    }
    const inv = 1 / neighbors.length;
    const mx = ax * inv;
    const my = ay * inv;
    const mz = az * inv;
    next[base] = px + weight * (mx - px);
    next[base + 1] = py + weight * (my - py);
    next[base + 2] = pz + weight * (mz - pz);
  }
  return next;
};

export const applyTaubinSmoothing = (
  mesh: RenderMesh,
  options: TaubinSmoothingOptions
): RenderMesh => {
  if (mesh.positions.length === 0) return mesh;

  const iterations = clampIterations(options.iterations);
  if (iterations === 0) return mesh;

  const indices = resolveIndices(mesh);
  const vertexCount = Math.floor(mesh.positions.length / 3);
  if (vertexCount === 0 || indices.length === 0) return mesh;

  const adjacency = buildAdjacency(indices, vertexCount);
  let positions = mesh.positions.slice();

  for (let iter = 0; iter < iterations; iter++) {
    positions = applyLaplacianStep(positions, adjacency, options.lambda);
    positions = applyLaplacianStep(positions, adjacency, options.mu);
  }

  const normals = computeVertexNormals(positions, indices);

  return {
    ...mesh,
    positions,
    normals,
    indices: mesh.indices.length > 0 ? mesh.indices : indices,
  };
};
