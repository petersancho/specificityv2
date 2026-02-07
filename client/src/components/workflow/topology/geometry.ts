// ============================================================================
// TOPOLOGY OPTIMIZATION GEOMETRY MODULE
// Goal extraction + Density-to-mesh generation
// ============================================================================

import type { Vec3, RenderMesh } from "../../../types";
import type { GoalMarkers, AnchorMarker, LoadMarker, GoalRegionMetadata } from "./types";
import { applyTaubinSmoothing } from "./meshSmoothing";

// ============================================================================
// GOAL EXTRACTION
// ============================================================================

type GoalBase = {
  goalType: string;
  geometry: { elements: number[] };
  parameters?: Record<string, unknown>;
};

function getPositionKey(position: Vec3): string {
  return `${position.x.toFixed(6)},${position.y.toFixed(6)},${position.z.toFixed(6)}`;
}

function positionsFromElements(mesh: RenderMesh, elements: number[]): Vec3[] {
  const positions: Vec3[] = [];
  for (const vertexIdx of elements) {
    const i = vertexIdx * 3;
    if (i + 2 < mesh.positions.length) {
      positions.push({ x: mesh.positions[i], y: mesh.positions[i + 1], z: mesh.positions[i + 2] });
    }
  }
  return positions;
}

function centroid(points: Vec3[]): Vec3 {
  if (points.length === 0) return { x: 0, y: 0, z: 0 };
  let sx = 0, sy = 0, sz = 0;
  for (const p of points) { sx += p.x; sy += p.y; sz += p.z; }
  return { x: sx / points.length, y: sy / points.length, z: sz / points.length };
}

// ============================================================================
// PhD-LEVEL GEOMETRY ANALYSIS
// ============================================================================

/**
 * Compute area-weighted centroid using triangulation
 * More accurate than arithmetic centroid for FEA boundary conditions
 */
function weightedCentroid(mesh: RenderMesh, vertices: number[]): Vec3 {
  if (vertices.length === 0) return { x: 0, y: 0, z: 0 };
  if (vertices.length === 1) {
    const i = vertices[0] * 3;
    return { x: mesh.positions[i], y: mesh.positions[i + 1], z: mesh.positions[i + 2] };
  }
  if (vertices.length === 2) {
    const i0 = vertices[0] * 3, i1 = vertices[1] * 3;
    return {
      x: (mesh.positions[i0] + mesh.positions[i1]) / 2,
      y: (mesh.positions[i0 + 1] + mesh.positions[i1 + 1]) / 2,
      z: (mesh.positions[i0 + 2] + mesh.positions[i1 + 2]) / 2,
    };
  }

  // Triangulate from first vertex
  const positions = positionsFromElements(mesh, vertices);
  const p0 = positions[0];
  let totalArea = 0;
  let cx = 0, cy = 0, cz = 0;

  for (let i = 1; i < positions.length - 1; i++) {
    const p1 = positions[i];
    const p2 = positions[i + 1];
    
    // Triangle area via cross product
    const ux = p1.x - p0.x, uy = p1.y - p0.y, uz = p1.z - p0.z;
    const vx = p2.x - p0.x, vy = p2.y - p0.y, vz = p2.z - p0.z;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const area = 0.5 * Math.sqrt(nx * nx + ny * ny + nz * nz);
    
    if (area > 1e-12) {
      // Triangle centroid
      const tcx = (p0.x + p1.x + p2.x) / 3;
      const tcy = (p0.y + p1.y + p2.y) / 3;
      const tcz = (p0.z + p1.z + p2.z) / 3;
      
      cx += area * tcx;
      cy += area * tcy;
      cz += area * tcz;
      totalArea += area;
    }
  }

  if (totalArea < 1e-12) {
    // Degenerate geometry, fallback to arithmetic centroid
    return centroid(positions);
  }

  return { x: cx / totalArea, y: cy / totalArea, z: cz / totalArea };
}

/**
 * Compute average surface normal using Newell's method
 * Robust for non-planar regions
 */
function averageNormal(mesh: RenderMesh, vertices: number[]): Vec3 {
  if (vertices.length < 3) return { x: 0, y: 1, z: 0 };

  const positions = positionsFromElements(mesh, vertices);
  let nx = 0, ny = 0, nz = 0;

  // Newell's method: sum edge cross products
  for (let i = 0; i < positions.length; i++) {
    const curr = positions[i];
    const next = positions[(i + 1) % positions.length];
    
    nx += (curr.y - next.y) * (curr.z + next.z);
    ny += (curr.z - next.z) * (curr.x + next.x);
    nz += (curr.x - next.x) * (curr.y + next.y);
  }

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len < 1e-12) return { x: 0, y: 1, z: 0 };

  return { x: nx / len, y: ny / len, z: nz / len };
}

/**
 * Compute total surface area
 */
function totalArea(mesh: RenderMesh, vertices: number[]): number {
  if (vertices.length < 3) return 0;

  const positions = positionsFromElements(mesh, vertices);
  const p0 = positions[0];
  let area = 0;

  for (let i = 1; i < positions.length - 1; i++) {
    const p1 = positions[i];
    const p2 = positions[i + 1];
    
    const ux = p1.x - p0.x, uy = p1.y - p0.y, uz = p1.z - p0.z;
    const vx = p2.x - p0.x, vy = p2.y - p0.y, vz = p2.z - p0.z;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    area += 0.5 * Math.sqrt(nx * nx + ny * ny + nz * nz);
  }

  return area;
}

/**
 * Compute bounding box of positions
 */
function computePositionBounds(positions: Vec3[]): { min: Vec3; max: Vec3 } {
  if (positions.length === 0) {
    return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const p of positions) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.z < minZ) minZ = p.z;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
    if (p.z > maxZ) maxZ = p.z;
  }

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
}

/**
 * Validate goal region geometry
 */
function validateGoalRegion(mesh: RenderMesh, vertices: number[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (vertices.length === 0) {
    errors.push('No vertices in goal region');
    return { isValid: false, errors };
  }

  // Check vertex indices are in range
  const maxIndex = mesh.positions.length / 3;
  for (const v of vertices) {
    if (v < 0 || v >= maxIndex) {
      errors.push(`Vertex index ${v} out of range [0, ${maxIndex})`);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Check for degenerate geometry (all vertices at same point)
  const positions = positionsFromElements(mesh, vertices);
  if (positions.length > 1) {
    const p0 = positions[0];
    let allSame = true;
    for (let i = 1; i < positions.length; i++) {
      const p = positions[i];
      const dx = p.x - p0.x, dy = p.y - p0.y, dz = p.z - p0.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) > 1e-9) {
        allSame = false;
        break;
      }
    }
    if (allSame) {
      errors.push('All vertices are at the same position (degenerate geometry)');
      return { isValid: false, errors };
    }
  }

  return { isValid: true, errors: [] };
}

/**
 * Analyze goal region geometry (PhD-level)
 * Returns complete metadata for SIMP solver
 */
function analyzeGoalRegion(mesh: RenderMesh, vertices: number[]): GoalRegionMetadata {
  const validation = validateGoalRegion(mesh, vertices);
  
  if (!validation.isValid) {
    const positions = positionsFromElements(mesh, vertices);
    const fallbackCentroid = centroid(positions);
    return {
      vertices,
      positions,
      centroid: fallbackCentroid,
      weightedCentroid: fallbackCentroid,
      totalArea: 0,
      averageNormal: { x: 0, y: 1, z: 0 },
      bounds: computePositionBounds(positions),
      isValid: false,
      validationErrors: validation.errors,
    };
  }

  const positions = positionsFromElements(mesh, vertices);
  const arithmeticCentroid = centroid(positions);
  const areaWeightedCentroid = weightedCentroid(mesh, vertices);
  const area = totalArea(mesh, vertices);
  const normal = averageNormal(mesh, vertices);
  const bounds = computePositionBounds(positions);

  return {
    vertices,
    positions,
    centroid: arithmeticCentroid,
    weightedCentroid: areaWeightedCentroid,
    totalArea: area,
    averageNormal: normal,
    bounds,
    isValid: true,
    validationErrors: [],
  };
}

function extractForce(parameters?: Record<string, unknown>): Vec3 {
  if (!parameters) return { x: 0, y: -1.0, z: 0 };
  const force = parameters.force as Vec3 | undefined;
  if (force && typeof force.x === 'number') return { x: force.x ?? 0, y: force.y ?? 0, z: force.z ?? 0 };
  return {
    x: typeof parameters.forceX === 'number' ? parameters.forceX : typeof parameters.fx === 'number' ? parameters.fx : 0,
    y: typeof parameters.forceY === 'number' ? parameters.forceY : typeof parameters.fy === 'number' ? parameters.fy : -1.0,
    z: typeof parameters.forceZ === 'number' ? parameters.forceZ : typeof parameters.fz === 'number' ? parameters.fz : 0
  };
}

function computeBounds(mesh: RenderMesh): { min: Vec3; max: Vec3 } {
  if (mesh.positions.length === 0) return { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 0 } };
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = mesh.positions[i], y = mesh.positions[i + 1], z = mesh.positions[i + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } };
}

/** 
 * Extract goal markers from mesh and goal nodes
 * UPDATED: Now keeps vertex information for distributed BC mapping
 */
export function extractGoalMarkers(mesh: RenderMesh, goals: GoalBase[]): GoalMarkers {
  const anchors: AnchorMarker[] = [];
  const loads: LoadMarker[] = [];
  const bounds = computeBounds(mesh);
  const hasAnchorWithElements = goals.some(g => g.goalType === 'anchor' && (g.geometry?.elements?.length ?? 0) > 0);
  const hasLoadWithElements = goals.some(g => g.goalType === 'load' && (g.geometry?.elements?.length ?? 0) > 0);
  
  for (const goal of goals) {
    const vertices = goal.geometry?.elements ?? [];
    
    if (goal.goalType === 'anchor') {
      if (vertices.length > 0) {
        // Compute centroid for visualization only
        const metadata = analyzeGoalRegion(mesh, vertices);
        const position = metadata.weightedCentroid;
        
        // Keep vertex information for distributed BC mapping
        anchors.push({
          position,
          vertices,
          dofMask: [true, true, true], // Fix all DOFs
          metadata,
        });
        
        console.log(`[ANCHOR GOAL] Extracted anchor region: ${vertices.length} vertices, centroid: (${position.x.toFixed(3)}, ${position.y.toFixed(3)}, ${position.z.toFixed(3)})`);
      } else if (!hasAnchorWithElements) {
        // Fallback: single point at bounds min
        anchors.push({
          position: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
          vertices: [],
          dofMask: [true, true, true],
        });
      }
    } else if (goal.goalType === 'load') {
      const force = extractForce(goal.parameters);
      
      if (vertices.length > 0) {
        // Compute centroid for visualization only
        const metadata = analyzeGoalRegion(mesh, vertices);
        const position = metadata.weightedCentroid;
        
        // Keep vertex information for distributed BC mapping
        // Force is TOTAL resultant (will be distributed across grid nodes)
        loads.push({
          position,
          force,
          vertices,
          metadata,
        });
        
        console.log(`[LOAD GOAL] Extracted load region: ${vertices.length} vertices, centroid: (${position.x.toFixed(3)}, ${position.y.toFixed(3)}, ${position.z.toFixed(3)}), force: (${force.x.toFixed(3)}, ${force.y.toFixed(3)}, ${force.z.toFixed(3)})`);
      } else if (!hasLoadWithElements) {
        // Fallback: single point at bounds max
        loads.push({
          position: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z },
          force,
          vertices: [],
        });
      }
    }
  }
  
  // Fallback defaults if no goals specified
  if (anchors.length === 0 && goals.some(g => g.goalType === 'anchor')) {
    anchors.push({
      position: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
      vertices: [],
      dofMask: [true, true, true],
    });
  }
  if (loads.length === 0 && goals.some(g => g.goalType === 'load')) {
    loads.push({
      position: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z },
      force: { x: 0, y: -1.0, z: 0 },
      vertices: [],
    });
  }
  
  const anchorPositionSet = new Set<string>();
  for (const anchor of anchors) {
    anchorPositionSet.add(getPositionKey(anchor.position));
  }
  
  const loadPositionSet = new Set<string>();
  for (const load of loads) {
    loadPositionSet.add(getPositionKey(load.position));
  }
  
  const overlappingKeys = new Set<string>();
  for (const key of anchorPositionSet) {
    if (loadPositionSet.has(key)) {
      overlappingKeys.add(key);
    }
  }
  
  if (overlappingKeys.size > 0) {
    const filteredAnchors = anchors.filter(anchor => {
      return !overlappingKeys.has(getPositionKey(anchor.position));
    });
    console.warn(`[GOAL MARKERS] Removed ${anchors.length - filteredAnchors.length} anchor positions that overlap with load positions (corner/edge vertices)`);
    console.log(`[GOAL MARKERS] Total: ${filteredAnchors.length} anchors (after filtering), ${loads.length} loads`);
    return { anchors: filteredAnchors, loads };
  }
  
  console.log(`[GOAL MARKERS] Total: ${anchors.length} anchors, ${loads.length} loads`);
  
  return { anchors, loads };
}

// ============================================================================
// VOXEL-TO-MESH GENERATION
// ============================================================================

import { marchingCubes as chemistryMarchingCubes } from "../../../workflow/nodes/solver/chemistry/marchingCubes";
import type { VoxelField } from "../../../workflow/nodes/solver/chemistry/marchingCubes";

export interface VoxelScalarField {
  densities: Float32Array | Float64Array;
  nx: number; ny: number; nz: number;
  bounds: { min: Vec3; max: Vec3 };
}

export interface GeometryOutput {
  isosurface: RenderMesh;
  vertexCount: number;
}

/**
 * Resample non-cubic voxel grid to cubic grid for marching cubes.
 * 
 * Marching cubes assumes cubic voxels (equal spacing in x, y, z).
 * SIMP optimization can produce non-cubic grids (e.g., 100×100×20).
 * This function resamples to the maximum dimension to ensure cubic cells.
 * For 2D problems (nz=1), keeps Z dimension at 1 to avoid memory waste.
 */
function resampleToCubicGrid(field: VoxelScalarField): VoxelField {
  const { nx, ny, nz, bounds, densities } = field;
  
  const is2D = nz === 1;
  const resolution = is2D ? Math.max(nx, ny) : Math.max(nx, ny, nz);
  const resZ = is2D ? 1 : resolution;
  
  console.log('[GEOMETRY] Resampling to cubic grid:', {
    input: `${nx}×${ny}×${nz}`,
    output: `${resolution}×${resolution}×${resZ}`,
    is2D,
    bounds: {
      min: `(${bounds.min.x.toFixed(2)}, ${bounds.min.y.toFixed(2)}, ${bounds.min.z.toFixed(2)})`,
      max: `(${bounds.max.x.toFixed(2)}, ${bounds.max.y.toFixed(2)}, ${bounds.max.z.toFixed(2)})`,
    }
  });
  
  const cellSize: Vec3 = {
    x: (bounds.max.x - bounds.min.x) / resolution,
    y: (bounds.max.y - bounds.min.y) / resolution,
    z: is2D ? 0 : (bounds.max.z - bounds.min.z) / resolution,
  };
  
  const cubicDensities = new Float32Array(resolution * resolution * resZ);
  
  // Track min/max during resampling
  let resampledMin = Infinity, resampledMax = -Infinity;
  
  for (let z = 0; z < resZ; z++) {
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const srcX = Math.min(Math.floor((x / resolution) * nx), nx - 1);
        const srcY = Math.min(Math.floor((y / resolution) * ny), ny - 1);
        const srcZ = is2D ? 0 : Math.min(Math.floor((z / resolution) * nz), nz - 1);
        
        const srcIdx = srcX + srcY * nx + srcZ * nx * ny;
        const dstIdx = x + y * resolution + z * resolution * resolution;
        
        const val = densities[srcIdx];
        cubicDensities[dstIdx] = val;
        
        if (val < resampledMin) resampledMin = val;
        if (val > resampledMax) resampledMax = val;
      }
    }
  }
  
  console.log('[GEOMETRY] Resampled density range:', {
    min: resampledMin.toFixed(4),
    max: resampledMax.toFixed(4),
    totalVoxels: cubicDensities.length,
  });
  
  return {
    resolution,
    bounds,
    cellSize,
    data: [],
    densities: cubicDensities,
  };
}

export function generateGeometryFromVoxels(
  field: VoxelScalarField,
  isovalue: number = 0.2
): GeometryOutput {
  if (field.nx <= 0 || field.ny <= 0 || field.nz <= 0) {
    throw new Error(`Invalid field dimensions: ${field.nx}×${field.ny}×${field.nz}`);
  }
  
  // Check for detached/empty buffer
  if (!field.densities || field.densities.length === 0) {
    throw new Error(`Densities array is empty or detached (length=${field.densities?.length ?? 'undefined'})`);
  }
  
  const total = field.densities.length;
  
  // Clamp isovalue to valid range
  if (isovalue < 0 || isovalue > 1) {
    isovalue = Math.max(0, Math.min(1, isovalue));
  }
  
  // Auto-adjust isovalue if needed
  let countAboveIsovalue = 0;
  for (let i = 0; i < field.densities.length; i++) {
    if (field.densities[i] >= isovalue) countAboveIsovalue++;
  }
  const fractionAboveIsovalue = countAboveIsovalue / total;
  
  // If less than 5% or more than 95% of voxels would be solid, adjust the isovalue
  if (fractionAboveIsovalue < 0.05 || fractionAboveIsovalue > 0.95) {
    const sortedDensities = Array.from(field.densities).sort((a, b) => a - b);
    const targetIdx = Math.floor(sortedDensities.length * 0.6);
    isovalue = sortedDensities[targetIdx];
  }
  
  const voxelField = resampleToCubicGrid(field);
  
  const defaultColor: [number, number, number] = [0.92, 0.92, 0.94];
  let mesh = chemistryMarchingCubes(voxelField, isovalue, [defaultColor]);
  
  let isosurface: RenderMesh = {
    positions: mesh.positions,
    normals: mesh.normals,
    uvs: mesh.uvs,
    indices: mesh.indices,
    colors: mesh.colors,
  };
  
  if (isosurface.positions.length > 0) {
    isosurface = applyTaubinSmoothing(isosurface, {
      iterations: 2,
      lambda: 0.5,
      mu: -0.53,
    });
  }
  
  return {
    isosurface,
    vertexCount: isosurface.positions.length / 3,
  };
}



export function generateGeometryFromDensities(
  field: VoxelScalarField,
  densityThreshold: number = 0.2
): GeometryOutput {
  return generateGeometryFromVoxels(field, densityThreshold);
}
