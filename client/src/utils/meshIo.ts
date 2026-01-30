import type { RenderMesh } from "../types";
import { computeVertexNormals } from "../geometry/mesh";

const DEFAULT_STL_NAME = "lingua";

const ensureIndices = (mesh: RenderMesh) => {
  if (mesh.indices.length > 0) return mesh.indices;
  const count = Math.floor(mesh.positions.length / 3);
  const indices = new Array(count);
  for (let i = 0; i < count; i += 1) {
    indices[i] = i;
  }
  return indices;
};

const normalize = (x: number, y: number, z: number) => {
  const length = Math.sqrt(x * x + y * y + z * z) || 1;
  return { x: x / length, y: y / length, z: z / length };
};

const scalePositions = (positions: number[], scale: number) => {
  if (scale === 1) return positions.slice();
  const next = positions.slice();
  for (let i = 0; i < next.length; i += 3) {
    next[i] *= scale;
    next[i + 1] *= scale;
    next[i + 2] *= scale;
  }
  return next;
};

export const scaleRenderMesh = (mesh: RenderMesh, scale: number): RenderMesh => {
  if (!Number.isFinite(scale) || scale === 1) return mesh;
  return {
    ...mesh,
    positions: scalePositions(mesh.positions, scale),
  };
};

export const mergeRenderMeshes = (meshes: RenderMesh[]): RenderMesh => {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const includeColors = meshes.every(
    (mesh) => Boolean(mesh.colors) && mesh.colors.length === (mesh.positions?.length ?? 0)
  );
  const colors: number[] = [];
  let vertexOffset = 0;

  meshes.forEach((mesh) => {
    const meshPositions = mesh.positions ?? [];
    const meshNormals = mesh.normals ?? [];
    const meshUvs = mesh.uvs ?? [];
    const meshIndices = mesh.indices ?? [];

    positions.push(...meshPositions);
    if (meshNormals.length === meshPositions.length) {
      normals.push(...meshNormals);
    } else if (meshPositions.length > 0) {
      normals.push(...new Array(meshPositions.length).fill(0));
    }
    if (meshUvs.length === (meshPositions.length / 3) * 2) {
      uvs.push(...meshUvs);
    } else if (meshPositions.length > 0) {
      uvs.push(...new Array((meshPositions.length / 3) * 2).fill(0));
    }
    if (includeColors) {
      colors.push(...(mesh.colors ?? new Array(meshPositions.length).fill(0)));
    }

    const vertexCount = Math.floor(meshPositions.length / 3);
    const localIndices =
      meshIndices.length > 0
        ? meshIndices
        : Array.from({ length: vertexCount }, (_, index) => index);
    localIndices.forEach((index) => indices.push(index + vertexOffset));
    vertexOffset += vertexCount;
  });

  const resolvedIndices = indices.length > 0 ? indices : ensureIndices({ positions, normals, uvs, indices });
  const resolvedNormals =
    normals.length === positions.length
      ? normals
      : computeVertexNormals(positions, resolvedIndices);

  return {
    positions,
    normals: resolvedNormals,
    uvs,
    indices: resolvedIndices,
    colors: includeColors ? colors : undefined,
  };
};

export const exportMeshToStlAscii = (
  mesh: RenderMesh,
  options?: { name?: string; scale?: number }
) => {
  const name = options?.name ?? DEFAULT_STL_NAME;
  const scale = Number.isFinite(options?.scale) ? (options?.scale as number) : 1;
  const positions = scalePositions(mesh.positions, scale);
  const indices = ensureIndices(mesh);
  let output = `solid ${name}\n`;

  for (let i = 0; i + 2 < indices.length; i += 3) {
    const ia = indices[i] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;
    const ax = positions[ia] ?? 0;
    const ay = positions[ia + 1] ?? 0;
    const az = positions[ia + 2] ?? 0;
    const bx = positions[ib] ?? 0;
    const by = positions[ib + 1] ?? 0;
    const bz = positions[ib + 2] ?? 0;
    const cx = positions[ic] ?? 0;
    const cy = positions[ic + 1] ?? 0;
    const cz = positions[ic + 2] ?? 0;
    const abx = bx - ax;
    const aby = by - ay;
    const abz = bz - az;
    const acx = cx - ax;
    const acy = cy - ay;
    const acz = cz - az;
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    const normal = normalize(nx, ny, nz);

    output += `  facet normal ${normal.x} ${normal.y} ${normal.z}\n`;
    output += "    outer loop\n";
    output += `      vertex ${ax} ${ay} ${az}\n`;
    output += `      vertex ${bx} ${by} ${bz}\n`;
    output += `      vertex ${cx} ${cy} ${cz}\n`;
    output += "    endloop\n";
    output += "  endfacet\n";
  }

  output += `endsolid ${name}\n`;
  return output;
};

const isBinaryStl = (buffer: ArrayBuffer) => {
  if (buffer.byteLength < 84) return false;
  const view = new DataView(buffer);
  const faceCount = view.getUint32(80, true);
  const expectedSize = 84 + faceCount * 50;
  return expectedSize === buffer.byteLength;
};

const parseBinaryStl = (buffer: ArrayBuffer): RenderMesh => {
  const view = new DataView(buffer);
  const faceCount = view.getUint32(80, true);
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let offset = 84;
  let vertexIndex = 0;

  for (let i = 0; i < faceCount; i += 1) {
    const nx = view.getFloat32(offset, true);
    const ny = view.getFloat32(offset + 4, true);
    const nz = view.getFloat32(offset + 8, true);
    offset += 12;
    for (let v = 0; v < 3; v += 1) {
      const x = view.getFloat32(offset, true);
      const y = view.getFloat32(offset + 4, true);
      const z = view.getFloat32(offset + 8, true);
      positions.push(x, y, z);
      normals.push(nx, ny, nz);
      indices.push(vertexIndex);
      vertexIndex += 1;
      offset += 12;
    }
    offset += 2;
  }

  const resolvedNormals =
    normals.length === positions.length
      ? normals
      : computeVertexNormals(positions, indices);
  return { positions, normals: resolvedNormals, uvs: [], indices };
};

const parseAsciiStl = (buffer: ArrayBuffer): RenderMesh => {
  const text = new TextDecoder().decode(buffer);
  const vertexPattern = /vertex\s+([\-0-9.eE+]+)\s+([\-0-9.eE+]+)\s+([\-0-9.eE+]+)/g;
  const positions: number[] = [];
  const indices: number[] = [];
  let match: RegExpExecArray | null = null;
  let vertexIndex = 0;

  while ((match = vertexPattern.exec(text))) {
    positions.push(Number(match[1]), Number(match[2]), Number(match[3]));
    indices.push(vertexIndex);
    vertexIndex += 1;
  }

  const normals =
    positions.length > 0 ? computeVertexNormals(positions, indices) : [];
  return { positions, normals, uvs: [], indices };
};

export const parseStl = (buffer: ArrayBuffer): RenderMesh =>
  isBinaryStl(buffer) ? parseBinaryStl(buffer) : parseAsciiStl(buffer);
