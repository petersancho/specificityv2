import type { WorkflowNodeDefinition } from "../../nodeRegistry";
import type { Geometry, RenderMesh, VoxelGrid } from "../../types";

/**
 * Voxelizer Node - Converts geometry into a voxel grid
 * 
 * This solver takes any geometry and converts it into a uniform voxel grid
 * representation. The output is an occupancy grid where each cell is either
 * filled (1) or empty (0) based on whether the geometry occupies that space.
 * 
 * What users do with the voxel grid after is up to them - this solver only
 * performs the voxelization step.
 */
export const VoxelSolverNode: WorkflowNodeDefinition = {
  type: "voxelSolver",
  label: "Voxelizer",
  shortLabel: "VOX",
  description: "Converts geometry into a voxel grid at a specified resolution.",
  category: "voxel",
  iconId: "voxelSolver",
  inputs: [
    {
      key: "geometry",
      label: "Geometry",
      type: "geometry",
      description: "Input geometry to voxelize (mesh, solid, or any geometry type).",
    },
    {
      key: "resolution",
      label: "Resolution",
      type: "number",
      parameterKey: "resolution",
      defaultValue: 16,
      description: "Number of voxels along the longest axis (8-128).",
    },
  ],
  outputs: [
    {
      key: "voxelGrid",
      label: "Voxel Grid",
      type: "voxelGrid",
      description: "Voxelized representation of the input geometry.",
    },
    {
      key: "meshData",
      label: "Mesh Data",
      type: "mesh",
      description: "Voxel mesh for rendering (blocky cubes).",
    },
    {
      key: "cellCount",
      label: "Cell Count",
      type: "number",
      description: "Total number of voxel cells in the grid.",
    },
    {
      key: "filledCount",
      label: "Filled Count",
      type: "number",
      description: "Number of filled (occupied) voxel cells.",
    },
    {
      key: "fillRatio",
      label: "Fill Ratio",
      type: "number",
      description: "Ratio of filled cells to total cells (0-1).",
    },
  ],
  parameters: [
    {
      key: "resolution",
      label: "Resolution",
      type: "number",
      defaultValue: 16,
      min: 4,
      max: 128,
      step: 1,
      description: "Number of voxels along the longest axis.",
    },
  ],
  display: {
    nameGreek: "Ἐπιλύτης Φογκελ",
    nameEnglish: "Voxelizer",
    romanization: "Epilýtēs Fogkel",
    description: "Converts geometry into a uniform voxel grid.",
  },
  compute: (args) => {
    const { parameters, inputs } = args;
    
    const resolution = Math.max(4, Math.min(128, Math.round(
      inputs.resolution ?? parameters.resolution ?? 16
    )));
    
    const geometry = inputs.geometry as Geometry | undefined;
    
    const emptyMesh: RenderMesh = { positions: [], normals: [], uvs: [], indices: [] };
    
    if (!geometry || !geometry.mesh) {
      return {
        voxelGrid: null,
        meshData: emptyMesh,
        cellCount: 0,
        filledCount: 0,
        fillRatio: 0,
      };
    }
    
    const mesh = geometry.mesh as RenderMesh;
    if (!mesh.positions || mesh.positions.length === 0) {
      return {
        voxelGrid: null,
        meshData: emptyMesh,
        cellCount: 0,
        filledCount: 0,
        fillRatio: 0,
      };
    }
    
    const voxelGrid = voxelizeGeometry(mesh, resolution);
    
    const cellCount = voxelGrid.dims.nx * voxelGrid.dims.ny * voxelGrid.dims.nz;
    let filledCount = 0;
    for (let i = 0; i < voxelGrid.data.length; i++) {
      if (voxelGrid.data[i] > 0) filledCount++;
    }
    const fillRatio = cellCount > 0 ? filledCount / cellCount : 0;
    
    const voxelMesh = generateVoxelMesh(voxelGrid);
    
    return {
      voxelGrid,
      meshData: voxelMesh,
      cellCount,
      filledCount,
      fillRatio,
    };
  },
};

function voxelizeGeometry(mesh: RenderMesh, resolution: number): VoxelGrid {
  const positions = mesh.positions;
  const indices = mesh.indices;
  
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }
  
  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const sizeZ = maxZ - minZ;
  const maxSize = Math.max(sizeX, sizeY, sizeZ, 0.001);
  
  const voxelSize = maxSize / resolution;
  const nx = Math.max(1, Math.ceil(sizeX / voxelSize));
  const ny = Math.max(1, Math.ceil(sizeY / voxelSize));
  const nz = Math.max(1, Math.ceil(sizeZ / voxelSize));
  
  const data = new Uint8Array(nx * ny * nz);
  
  const triangleCount = indices.length / 3;
  for (let t = 0; t < triangleCount; t++) {
    const i0 = indices[t * 3] * 3;
    const i1 = indices[t * 3 + 1] * 3;
    const i2 = indices[t * 3 + 2] * 3;
    
    const v0x = positions[i0], v0y = positions[i0 + 1], v0z = positions[i0 + 2];
    const v1x = positions[i1], v1y = positions[i1 + 1], v1z = positions[i1 + 2];
    const v2x = positions[i2], v2y = positions[i2 + 1], v2z = positions[i2 + 2];
    
    const triMinX = Math.min(v0x, v1x, v2x);
    const triMinY = Math.min(v0y, v1y, v2y);
    const triMinZ = Math.min(v0z, v1z, v2z);
    const triMaxX = Math.max(v0x, v1x, v2x);
    const triMaxY = Math.max(v0y, v1y, v2y);
    const triMaxZ = Math.max(v0z, v1z, v2z);
    
    const voxMinX = Math.max(0, Math.floor((triMinX - minX) / voxelSize));
    const voxMinY = Math.max(0, Math.floor((triMinY - minY) / voxelSize));
    const voxMinZ = Math.max(0, Math.floor((triMinZ - minZ) / voxelSize));
    const voxMaxX = Math.min(nx - 1, Math.floor((triMaxX - minX) / voxelSize));
    const voxMaxY = Math.min(ny - 1, Math.floor((triMaxY - minY) / voxelSize));
    const voxMaxZ = Math.min(nz - 1, Math.floor((triMaxZ - minZ) / voxelSize));
    
    for (let vz = voxMinZ; vz <= voxMaxZ; vz++) {
      for (let vy = voxMinY; vy <= voxMaxY; vy++) {
        for (let vx = voxMinX; vx <= voxMaxX; vx++) {
          const cx = minX + (vx + 0.5) * voxelSize;
          const cy = minY + (vy + 0.5) * voxelSize;
          const cz = minZ + (vz + 0.5) * voxelSize;
          
          if (pointInTrianglePrism(cx, cy, cz, voxelSize,
            v0x, v0y, v0z, v1x, v1y, v1z, v2x, v2y, v2z)) {
            const idx = vx + vy * nx + vz * nx * ny;
            data[idx] = 1;
          }
        }
      }
    }
  }
  
  floodFillInterior(data, nx, ny, nz);
  
  return {
    dims: { nx, ny, nz },
    origin: { x: minX, y: minY, z: minZ },
    voxelSize,
    data,
  };
}

function pointInTrianglePrism(
  cx: number, cy: number, cz: number, voxelSize: number,
  v0x: number, v0y: number, v0z: number,
  v1x: number, v1y: number, v1z: number,
  v2x: number, v2y: number, v2z: number
): boolean {
  const halfSize = voxelSize * 0.5;
  
  const boxMinX = cx - halfSize, boxMaxX = cx + halfSize;
  const boxMinY = cy - halfSize, boxMaxY = cy + halfSize;
  const boxMinZ = cz - halfSize, boxMaxZ = cz + halfSize;
  
  const triMinX = Math.min(v0x, v1x, v2x);
  const triMinY = Math.min(v0y, v1y, v2y);
  const triMinZ = Math.min(v0z, v1z, v2z);
  const triMaxX = Math.max(v0x, v1x, v2x);
  const triMaxY = Math.max(v0y, v1y, v2y);
  const triMaxZ = Math.max(v0z, v1z, v2z);
  
  if (boxMaxX < triMinX || boxMinX > triMaxX) return false;
  if (boxMaxY < triMinY || boxMinY > triMaxY) return false;
  if (boxMaxZ < triMinZ || boxMinZ > triMaxZ) return false;
  
  return true;
}

function floodFillInterior(data: Uint8Array, nx: number, ny: number, nz: number): void {
  const visited = new Uint8Array(nx * ny * nz);
  const queue: number[] = [];
  
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        if (x === 0 || x === nx - 1 || y === 0 || y === ny - 1 || z === 0 || z === nz - 1) {
          const idx = x + y * nx + z * nx * ny;
          if (data[idx] === 0 && visited[idx] === 0) {
            queue.push(idx);
            visited[idx] = 1;
          }
        }
      }
    }
  }
  
  const dx = [1, -1, 0, 0, 0, 0];
  const dy = [0, 0, 1, -1, 0, 0];
  const dz = [0, 0, 0, 0, 1, -1];
  
  while (queue.length > 0) {
    const idx = queue.pop()!;
    const z = Math.floor(idx / (nx * ny));
    const y = Math.floor((idx % (nx * ny)) / nx);
    const x = idx % nx;
    
    for (let d = 0; d < 6; d++) {
      const nx2 = x + dx[d];
      const ny2 = y + dy[d];
      const nz2 = z + dz[d];
      
      if (nx2 >= 0 && nx2 < nx && ny2 >= 0 && ny2 < ny && nz2 >= 0 && nz2 < nz) {
        const nidx = nx2 + ny2 * nx + nz2 * nx * ny;
        if (data[nidx] === 0 && visited[nidx] === 0) {
          visited[nidx] = 1;
          queue.push(nidx);
        }
      }
    }
  }
  
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 0 && visited[i] === 0) {
      data[i] = 1;
    }
  }
}

function generateVoxelMesh(voxelGrid: VoxelGrid): RenderMesh {
  const { dims, origin, voxelSize, data } = voxelGrid;
  const { nx, ny, nz } = dims;
  
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  
  const cubeVertices = [
    [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
    [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
  ];
  
  const cubeFaces = [
    [0, 1, 2, 3, 0, 0, -1],
    [4, 5, 6, 7, 0, 0, 1],
    [0, 1, 5, 4, 0, -1, 0],
    [2, 3, 7, 6, 0, 1, 0],
    [0, 3, 7, 4, -1, 0, 0],
    [1, 2, 6, 5, 1, 0, 0],
  ];
  
  for (let vz = 0; vz < nz; vz++) {
    for (let vy = 0; vy < ny; vy++) {
      for (let vx = 0; vx < nx; vx++) {
        const idx = vx + vy * nx + vz * nx * ny;
        if (data[idx] === 0) continue;
        
        const cx = origin.x + (vx + 0.5) * voxelSize;
        const cy = origin.y + (vy + 0.5) * voxelSize;
        const cz = origin.z + (vz + 0.5) * voxelSize;
        
        for (const face of cubeFaces) {
          const [v0, v1, v2, v3, nx_face, ny_face, nz_face] = face;
          
          const dx = nx_face as number;
          const dy = ny_face as number;
          const dz = nz_face as number;
          
          const neighborX = vx + dx;
          const neighborY = vy + dy;
          const neighborZ = vz + dz;
          
          if (neighborX >= 0 && neighborX < nx &&
              neighborY >= 0 && neighborY < ny &&
              neighborZ >= 0 && neighborZ < nz) {
            const neighborIdx = neighborX + neighborY * nx + neighborZ * nx * ny;
            if (data[neighborIdx] > 0) continue;
          }
          
          const baseIdx = positions.length / 3;
          
          for (const vi of [v0, v1, v2, v3]) {
            const [vx_local, vy_local, vz_local] = cubeVertices[vi as number];
            const px = cx + (vx_local - 0.5) * voxelSize;
            const py = cy + (vy_local - 0.5) * voxelSize;
            const pz = cz + (vz_local - 0.5) * voxelSize;
            positions.push(px, py, pz);
            normals.push(dx, dy, dz);
            uvs.push(0, 0);
          }
          
          indices.push(
            baseIdx, baseIdx + 1, baseIdx + 2,
            baseIdx, baseIdx + 2, baseIdx + 3
          );
        }
      }
    }
  }
  
  return { positions, normals, uvs, indices };
}
