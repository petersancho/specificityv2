// ============================================================================
// TOPOLOGY OPTIMIZATION GEOMETRY MODULE
// Goal extraction + Density-to-mesh generation
// ============================================================================

import type { Vec3, RenderMesh } from "../../../types";
import type { GoalMarkers, AnchorMarker, LoadMarker, GoalRegionMetadata } from "./types";

// ============================================================================
// GOAL EXTRACTION
// ============================================================================

type GoalBase = {
  goalType: string;
  geometry: { elements: number[] };
  parameters?: Record<string, unknown>;
};

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
    const key = `${anchor.position.x.toFixed(6)},${anchor.position.y.toFixed(6)},${anchor.position.z.toFixed(6)}`;
    anchorPositionSet.add(key);
  }
  
  const loadPositionSet = new Set<string>();
  for (const load of loads) {
    const key = `${load.position.x.toFixed(6)},${load.position.y.toFixed(6)},${load.position.z.toFixed(6)}`;
    loadPositionSet.add(key);
  }
  
  const overlappingKeys = new Set<string>();
  for (const key of anchorPositionSet) {
    if (loadPositionSet.has(key)) {
      overlappingKeys.add(key);
    }
  }
  
  if (overlappingKeys.size > 0) {
    const filteredAnchors = anchors.filter(anchor => {
      const key = `${anchor.position.x.toFixed(6)},${anchor.position.y.toFixed(6)},${anchor.position.z.toFixed(6)}`;
      return !overlappingKeys.has(key);
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
  
  // Compute min/max and distribution to help diagnose threshold issues
  let minDensity = Infinity, maxDensity = -Infinity;
  let countBelow01 = 0, countBelow02 = 0, countBelow05 = 0;
  let countAbove05 = 0, countAbove08 = 0, countAbove09 = 0;
  
  for (let i = 0; i < field.densities.length; i++) {
    const v = field.densities[i];
    if (v < minDensity) minDensity = v;
    if (v > maxDensity) maxDensity = v;
    if (v < 0.1) countBelow01++;
    if (v < 0.2) countBelow02++;
    if (v < 0.5) countBelow05++;
    if (v > 0.5) countAbove05++;
    if (v > 0.8) countAbove08++;
    if (v > 0.9) countAbove09++;
  }
  
  const total = field.densities.length;
  console.log(`[GEOMETRY] ⚠️⚠️⚠️ Density field analysis:`, {
    dimensions: `${field.nx}×${field.ny}×${field.nz}`,
    totalVoxels: total,
    expectedVoxels: field.nx * field.ny * field.nz,
    range: `[${minDensity.toFixed(3)}, ${maxDensity.toFixed(3)}]`,
    isovalue,
    distribution: {
      'below 0.1': `${countBelow01} (${(100 * countBelow01 / total).toFixed(1)}%)`,
      'below 0.2': `${countBelow02} (${(100 * countBelow02 / total).toFixed(1)}%)`,
      'below 0.5': `${countBelow05} (${(100 * countBelow05 / total).toFixed(1)}%)`,
      'above 0.5': `${countAbove05} (${(100 * countAbove05 / total).toFixed(1)}%)`,
      'above 0.8': `${countAbove08} (${(100 * countAbove08 / total).toFixed(1)}%)`,
      'above 0.9': `${countAbove09} (${(100 * countAbove09 / total).toFixed(1)}%)`,
    }
  });
  
  // ⚠️⚠️⚠️ CRITICAL: Check if density distribution suggests we need to use a different isovalue
  // If most voxels are above 0.5, the optimizer is working correctly and we should use 0.5 as isovalue
  // If most voxels are below 0.5, something might be wrong OR we need a lower isovalue
  const fractionAbove05 = countAbove05 / total;
  const fractionAbove02 = (total - countBelow02) / total;
  
  console.log(`[GEOMETRY] ⚠️⚠️⚠️ DENSITY ANALYSIS:`, {
    fractionAbove05: `${(100 * fractionAbove05).toFixed(1)}%`,
    fractionAbove02: `${(100 * fractionAbove02).toFixed(1)}%`,
    fractionAboveIsovalue: `${(100 * (total - countBelow02) / total).toFixed(1)}%`,
    recommendation: fractionAbove05 > 0.3 ? 'Use isovalue 0.5' : fractionAbove02 > 0.3 ? 'Use isovalue 0.2' : 'Density field may be inverted or empty',
  });
  
  // Sample some densities at different positions to understand spatial distribution
  const samplePositions = [
    { name: 'corner (0,0,0)', idx: 0 },
    { name: 'center', idx: Math.floor(field.nx/2) + Math.floor(field.ny/2) * field.nx + Math.floor(field.nz/2) * field.nx * field.ny },
    { name: 'corner (max)', idx: (field.nx-1) + (field.ny-1) * field.nx + (field.nz-1) * field.nx * field.ny },
    { name: 'edge x', idx: Math.floor(field.nx/2) },
    { name: 'edge y', idx: Math.floor(field.ny/2) * field.nx },
    { name: 'edge z', idx: Math.floor(field.nz/2) * field.nx * field.ny },
  ];
  
  console.log('[GEOMETRY] Sample densities at key positions:');
  for (const { name, idx } of samplePositions) {
    if (idx >= 0 && idx < total) {
      console.log(`  ${name}: ${field.densities[idx].toFixed(4)}`);
    }
  }
  
  // ⚠️⚠️⚠️ CRITICAL: Sample a 3x3x3 cube at the center to understand the spatial distribution
  const cx = Math.floor(field.nx / 2);
  const cy = Math.floor(field.ny / 2);
  const cz = Math.floor(field.nz / 2);
  console.log(`[GEOMETRY] ⚠️⚠️⚠️ 3x3x3 cube at center (${cx}, ${cy}, ${cz}):`);
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      let row = `  z=${cz+dz}, y=${cy+dy}: `;
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx, y = cy + dy, z = cz + dz;
        if (x >= 0 && x < field.nx && y >= 0 && y < field.ny && z >= 0 && z < field.nz) {
          const idx = x + y * field.nx + z * field.nx * field.ny;
          row += `${field.densities[idx].toFixed(3)} `;
        } else {
          row += 'OOB ';
        }
      }
      console.log(row);
    }
  }
  
  if (isovalue < 0 || isovalue > 1) {
    console.warn(`Isovalue ${isovalue} outside [0,1], clamping`);
    isovalue = Math.max(0, Math.min(1, isovalue));
  }
  
  // Warn if isovalue is outside the density range
  if (isovalue < minDensity) {
    console.warn(`[GEOMETRY] Isovalue ${isovalue} is below min density ${minDensity.toFixed(3)} - entire volume will be solid`);
  } else if (isovalue > maxDensity) {
    console.warn(`[GEOMETRY] Isovalue ${isovalue} is above max density ${maxDensity.toFixed(3)} - entire volume will be void`);
  }
  
  // ⚠️⚠️⚠️ AUTO-ADJUST ISOVALUE based on density distribution
  // If the current isovalue would result in less than 5% of voxels being solid,
  // automatically adjust to the median density to get a reasonable surface
  let adjustedIsovalue = isovalue;
  
  // Count how many voxels would be above the isovalue
  let countAboveIsovalue = 0;
  for (let i = 0; i < field.densities.length; i++) {
    if (field.densities[i] >= isovalue) countAboveIsovalue++;
  }
  const fractionAboveIsovalue = countAboveIsovalue / total;
  
  console.log(`[GEOMETRY] ⚠️⚠️⚠️ Isovalue check:`, {
    isovalue,
    countAboveIsovalue,
    fractionAboveIsovalue: `${(100 * fractionAboveIsovalue).toFixed(1)}%`,
    needsAdjustment: fractionAboveIsovalue < 0.05 || fractionAboveIsovalue > 0.95,
  });
  
  // If less than 5% or more than 95% of voxels would be solid, adjust the isovalue
  if (fractionAboveIsovalue < 0.05 || fractionAboveIsovalue > 0.95) {
    // Sort densities to find a better isovalue
    const sortedDensities = Array.from(field.densities).sort((a, b) => a - b);
    
    // Use the value at the 60th percentile (to get ~40% solid, matching typical volFrac)
    const targetPercentile = 0.6;
    const targetIdx = Math.floor(sortedDensities.length * targetPercentile);
    adjustedIsovalue = sortedDensities[targetIdx];
    
    console.log(`[GEOMETRY] ⚠️⚠️⚠️ AUTO-ADJUSTING ISOVALUE:`, {
      original: isovalue,
      adjusted: adjustedIsovalue.toFixed(4),
      reason: fractionAboveIsovalue < 0.05 ? 'Too few voxels above isovalue' : 'Too many voxels above isovalue',
      targetPercentile: `${(100 * targetPercentile).toFixed(0)}%`,
    });
    
    isovalue = adjustedIsovalue;
  }
  
  const voxelField = resampleToCubicGrid(field);
  
  const defaultColor: [number, number, number] = [0.92, 0.92, 0.94];
  let mesh = chemistryMarchingCubes(voxelField, isovalue, [defaultColor]);
  
  if (mesh.positions.length === 0) {
    console.warn(`[GEOMETRY] Marching cubes produced empty mesh (isovalue=${isovalue}, density range=[${minDensity.toFixed(3)}, ${maxDensity.toFixed(3)}])`);
  } else {
    console.log(`[GEOMETRY] Generated mesh with ${mesh.positions.length / 3} vertices, ${mesh.indices.length / 3} triangles`);
    // Increased smoothing: 12 iterations (was 3), lambda 0.7 (was 0.5) for smoother, more usable geometry
    mesh = laplacianSmoothMesh(mesh, 12, 0.7);
    console.log(`[GEOMETRY] Applied Laplacian smoothing (12 iterations, λ=0.7)`);
  }
  
  const isosurface: RenderMesh = {
    positions: mesh.positions,
    normals: mesh.normals,
    uvs: mesh.uvs,
    indices: mesh.indices,
    colors: mesh.colors,
  };
  
  return {
    isosurface,
    vertexCount: isosurface.positions.length / 3,
  };
}

function laplacianSmoothMesh(mesh: { positions: number[], normals: number[], uvs: number[], indices: number[], colors: number[] }, iterations: number = 3, lambda: number = 0.5): { positions: number[], normals: number[], uvs: number[], indices: number[], colors: number[] } {
  const numVerts = mesh.positions.length / 3;
  const adjacency: Set<number>[] = Array.from({ length: numVerts }, () => new Set());

  for (let i = 0; i < mesh.indices.length; i += 3) {
    const a = mesh.indices[i];
    const b = mesh.indices[i + 1];
    const c = mesh.indices[i + 2];
    adjacency[a].add(b); adjacency[a].add(c);
    adjacency[b].add(a); adjacency[b].add(c);
    adjacency[c].add(a); adjacency[c].add(b);
  }

  const smoothed = new Float32Array(mesh.positions);

  for (let iter = 0; iter < iterations; iter++) {
    const newPos = new Float32Array(smoothed);
    
    for (let i = 0; i < numVerts; i++) {
      const neighbors = Array.from(adjacency[i]);
      if (neighbors.length === 0) continue;

      const centroid = [0, 0, 0];
      for (const j of neighbors) {
        centroid[0] += smoothed[j * 3];
        centroid[1] += smoothed[j * 3 + 1];
        centroid[2] += smoothed[j * 3 + 2];
      }
      centroid[0] /= neighbors.length;
      centroid[1] /= neighbors.length;
      centroid[2] /= neighbors.length;

      newPos[i * 3] = smoothed[i * 3] + lambda * (centroid[0] - smoothed[i * 3]);
      newPos[i * 3 + 1] = smoothed[i * 3 + 1] + lambda * (centroid[1] - smoothed[i * 3 + 1]);
      newPos[i * 3 + 2] = smoothed[i * 3 + 2] + lambda * (centroid[2] - smoothed[i * 3 + 2]);
    }

    smoothed.set(newPos);
  }

  return {
    positions: Array.from(smoothed),
    normals: mesh.normals,
    uvs: mesh.uvs,
    indices: mesh.indices,
    colors: mesh.colors,
  };
}

export function generateGeometryFromDensities(
  field: VoxelScalarField,
  densityThreshold: number = 0.2
): GeometryOutput {
  return generateGeometryFromVoxels(field, densityThreshold);
}
