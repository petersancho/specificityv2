import type { WorkflowNodeDefinition } from "../../nodeRegistry";
import type { Geometry, RenderMesh, VoxelGrid, Vec3, MeshGeometry } from "../../../types";

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
  semanticOps: [
    'solver.voxel',
    'simulator.voxel.initialize',
    'simulator.voxel.step',
    'simulator.voxel.finalize',
  ],
  iconId: "solver",
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
      description: "Number of voxels along the longest axis (4-128).",
    },
  ],
  outputs: [
    {
      key: "status",
      label: "Status",
      type: "string",
      description: "Solver status (complete/empty).",
    },
    {
      key: "voxelGrid",
      label: "Voxel Grid",
      type: "voxelGrid",
      description: "Voxelized representation of the input geometry.",
    },
    {
      key: "densityField",
      label: "Density Field",
      type: "any",
      description: "Flattened density field array.",
    },
    {
      key: "resolution",
      label: "Resolution",
      type: "number",
      description: "Cubic voxel grid resolution.",
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
    {
      key: "objective",
      label: "Objective",
      type: "number",
      description: "Voxel field objective value.",
    },
    {
      key: "constraint",
      label: "Constraint",
      type: "number",
      description: "Voxel field constraint value.",
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
    {
      key: "volumeFraction",
      label: "Volume Fraction",
      type: "number",
      defaultValue: 0.35,
      min: 0,
      max: 1,
      step: 0.01,
      description: "Target mean density for the voxel field.",
    },
  ],
  display: {
    nameGreek: "Ἐπιλύτης Φογκελ",
    nameEnglish: "Voxelizer",
    romanization: "Epilýtēs Fogkel",
    description: "Converts geometry into a uniform voxel grid.",
  },
  customUI: {
    dashboardButton: {
      label: "Open Voxel Simulator",
      component: "VoxelSimulatorDashboard",
    },
  },
  compute: (args) => {
    const { parameters, inputs, context } = args;
    
    const resolution = Math.max(4, Math.min(128, Math.round(
      Number(inputs.resolution ?? parameters.resolution ?? 16)
    )));
    
    const emptyResult = {
      status: "empty",
      voxelGrid: null,
      densityField: [],
      resolution,
      meshData: { positions: [], normals: [], uvs: [], indices: [] } as RenderMesh,
      cellCount: 0,
      filledCount: 0,
      fillRatio: 0,
      objective: 0,
      constraint: 0,
    };
    
    // inputs.geometry is a geometry ID (string), not the actual geometry object
    // We need to look it up from context.geometryById
    const geometryId =
      (inputs.geometry as string | undefined) ??
      (inputs.domain as string | undefined);
    if (!geometryId) {
      return emptyResult;
    }
    
    const geometry = context.geometryById.get(geometryId) as Geometry | undefined;
    if (!geometry) {
      return emptyResult;
    }
    
    // Check if geometry has mesh data (MeshGeometry type)
    const meshGeometry = geometry as MeshGeometry;
    if (!meshGeometry.mesh || meshGeometry.type !== "mesh") {
      return emptyResult;
    }
    
    const mesh = meshGeometry.mesh;
    if (!mesh.positions || mesh.positions.length === 0) {
      return emptyResult;
    }
    
    // Voxelize the geometry
    const voxelResult = voxelizeGeometry(mesh, resolution);

    const targetVolumeFraction = Math.max(
      0,
      Math.min(
        1,
        Number((inputs as Record<string, unknown>).volumeFraction ?? parameters.volumeFraction ?? NaN)
      )
    );
    if (Number.isFinite(targetVolumeFraction)) {
      applyTargetVolumeFraction(voxelResult.grid.densities, voxelResult.cellCount, targetVolumeFraction);
    }

    let filledCount = 0;
    let densitySum = 0;
    for (let i = 0; i < voxelResult.grid.densities.length; i += 1) {
      const value = voxelResult.grid.densities[i];
      if (value > 0) filledCount += 1;
      densitySum += value;
    }
    const fillRatio = voxelResult.cellCount > 0 ? densitySum / voxelResult.cellCount : 0;
    
    // Generate voxel mesh for rendering
    const voxelMesh = generateVoxelMesh(voxelResult);
    
    const objective = 1 - fillRatio;
    const constraint = fillRatio;

    return {
      status: "complete",
      voxelGrid: voxelResult.grid,
      densityField: voxelResult.grid.densities,
      resolution: voxelResult.grid.resolution.x,
      meshData: voxelMesh,
      cellCount: voxelResult.cellCount,
      filledCount,
      fillRatio,
      objective,
      constraint,
    };
  },
};

interface InternalVoxelData {
  grid: VoxelGrid;
  cellCount: number;
  filledCount: number;
  fillRatio: number;
  nx: number;
  ny: number;
  nz: number;
}

function voxelizeGeometry(mesh: RenderMesh, resolution: number): InternalVoxelData {
  const positions = mesh.positions;
  const indices = mesh.indices ?? [];
  
  // Compute bounding box
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
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const halfSize = maxSize / 2;
  minX = centerX - halfSize;
  minY = centerY - halfSize;
  minZ = centerZ - halfSize;
  maxX = centerX + halfSize;
  maxY = centerY + halfSize;
  maxZ = centerZ + halfSize;
  
  // Calculate voxel dimensions
  const voxelSize = maxSize / resolution;
  const nx = Math.max(1, Math.round(resolution));
  const ny = nx;
  const nz = nx;
  
  // Create density array (0 = empty, 1 = filled)
  const densities = new Array(nx * ny * nz).fill(0);
  
  // Voxelize triangles
  const triangleCount = Math.floor(indices.length / 3);
  if (triangleCount > 0) {
    for (let t = 0; t < triangleCount; t++) {
      const i0 = indices[t * 3] * 3;
      const i1 = indices[t * 3 + 1] * 3;
      const i2 = indices[t * 3 + 2] * 3;
      
      const v0x = positions[i0], v0y = positions[i0 + 1], v0z = positions[i0 + 2];
      const v1x = positions[i1], v1y = positions[i1 + 1], v1z = positions[i1 + 2];
      const v2x = positions[i2], v2y = positions[i2 + 1], v2z = positions[i2 + 2];
      
      // Triangle bounding box in voxel space
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
      
      // Mark voxels that overlap with triangle
      for (let vz = voxMinZ; vz <= voxMaxZ; vz++) {
        for (let vy = voxMinY; vy <= voxMaxY; vy++) {
          for (let vx = voxMinX; vx <= voxMaxX; vx++) {
            const idx = vx + vy * nx + vz * nx * ny;
            densities[idx] = 1;
          }
        }
      }
    }
    
    // Flood fill interior
    floodFillInterior(densities, nx, ny, nz);
  }
  
  // Count filled voxels
  const cellCount = nx * ny * nz;
  let filledCount = 0;
  for (let i = 0; i < densities.length; i++) {
    if (densities[i] > 0) filledCount++;
  }
  const fillRatio = cellCount > 0 ? filledCount / cellCount : 0;
  
  // Create VoxelGrid using the correct type structure
  const grid: VoxelGrid = {
    resolution: { x: nx, y: ny, z: nz },
    bounds: {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
    },
    cellSize: { x: voxelSize, y: voxelSize, z: voxelSize },
    densities,
  };
  
  return { grid, cellCount, filledCount, fillRatio, nx, ny, nz };
}

function floodFillInterior(densities: number[], nx: number, ny: number, nz: number): void {
  const visited = new Uint8Array(nx * ny * nz);
  const queue: number[] = [];
  
  // Start from boundary cells
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        if (x === 0 || x === nx - 1 || y === 0 || y === ny - 1 || z === 0 || z === nz - 1) {
          const idx = x + y * nx + z * nx * ny;
          if (densities[idx] === 0 && visited[idx] === 0) {
            queue.push(idx);
            visited[idx] = 1;
          }
        }
      }
    }
  }
  
  // Flood fill exterior
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
        if (densities[nidx] === 0 && visited[nidx] === 0) {
          visited[nidx] = 1;
          queue.push(nidx);
        }
      }
    }
  }
  
  // Mark unvisited empty cells as interior (filled)
  for (let i = 0; i < densities.length; i++) {
    if (densities[i] === 0 && visited[i] === 0) {
      densities[i] = 1;
    }
  }
}

function generateVoxelMesh(voxelData: InternalVoxelData): RenderMesh {
  const { grid, nx, ny, nz } = voxelData;
  const { densities, bounds, cellSize } = grid;
  const origin = bounds.min;
  const voxelSize = cellSize.x;
  
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  
  // Cube vertices (unit cube)
  const cubeVertices = [
    [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
    [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
  ];
  
  // Cube faces: [v0, v1, v2, v3, nx, ny, nz]
  const cubeFaces = [
    [0, 1, 2, 3, 0, 0, -1],  // -Z face
    [4, 5, 6, 7, 0, 0, 1],   // +Z face
    [0, 1, 5, 4, 0, -1, 0],  // -Y face
    [2, 3, 7, 6, 0, 1, 0],   // +Y face
    [0, 3, 7, 4, -1, 0, 0],  // -X face
    [1, 2, 6, 5, 1, 0, 0],   // +X face
  ];
  
  for (let vz = 0; vz < nz; vz++) {
    for (let vy = 0; vy < ny; vy++) {
      for (let vx = 0; vx < nx; vx++) {
        const idx = vx + vy * nx + vz * nx * ny;
        if (densities[idx] === 0) continue;
        
        // Voxel center
        const cx = origin.x + (vx + 0.5) * voxelSize;
        const cy = origin.y + (vy + 0.5) * voxelSize;
        const cz = origin.z + (vz + 0.5) * voxelSize;
        
        // Add faces (only exterior faces)
        for (const face of cubeFaces) {
          const [v0, v1, v2, v3, fnx, fny, fnz] = face;
          
          // Check if neighbor exists
          const neighborX = vx + (fnx as number);
          const neighborY = vy + (fny as number);
          const neighborZ = vz + (fnz as number);
          
          if (neighborX >= 0 && neighborX < nx &&
              neighborY >= 0 && neighborY < ny &&
              neighborZ >= 0 && neighborZ < nz) {
            const neighborIdx = neighborX + neighborY * nx + neighborZ * nx * ny;
            if (densities[neighborIdx] > 0) continue; // Skip interior faces
          }
          
          const baseIdx = positions.length / 3;
          
          // Add 4 vertices for this face
          for (const vi of [v0, v1, v2, v3]) {
            const [vxLocal, vyLocal, vzLocal] = cubeVertices[vi as number];
            const px = cx + (vxLocal - 0.5) * voxelSize;
            const py = cy + (vyLocal - 0.5) * voxelSize;
            const pz = cz + (vzLocal - 0.5) * voxelSize;
            positions.push(px, py, pz);
            normals.push(fnx as number, fny as number, fnz as number);
            uvs.push(0, 0);
          }
          
          // Add 2 triangles for this face
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

const applyTargetVolumeFraction = (
  densities: number[],
  cellCount: number,
  target: number
) => {
  if (!Number.isFinite(target) || cellCount <= 0) return;
  let filledCount = 0;
  for (let i = 0; i < densities.length; i += 1) {
    if (densities[i] > 0) filledCount += 1;
  }
  const currentMean = filledCount / cellCount;
  if (currentMean <= 0) return;
  if (Math.abs(currentMean - target) < 1e-9) return;

  if (target < currentMean) {
    const scale = target / currentMean;
    for (let i = 0; i < densities.length; i += 1) {
      densities[i] = Math.max(0, Math.min(1, densities[i] * scale));
    }
    return;
  }

  const emptyCount = cellCount - filledCount;
  if (emptyCount <= 0) return;
  const needed = target * cellCount - filledCount;
  const fillValue = Math.max(0, Math.min(1, needed / emptyCount));
  for (let i = 0; i < densities.length; i += 1) {
    if (densities[i] <= 0) densities[i] = fillValue;
  }
};
