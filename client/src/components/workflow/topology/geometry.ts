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
  if (!parameters) return { x: 0, y: -100, z: 0 };
  const force = parameters.force as Vec3 | undefined;
  if (force && typeof force.x === 'number') return { x: force.x ?? 0, y: force.y ?? 0, z: force.z ?? 0 };
  return {
    x: typeof parameters.forceX === 'number' ? parameters.forceX : typeof parameters.fx === 'number' ? parameters.fx : 0,
    y: typeof parameters.forceY === 'number' ? parameters.forceY : typeof parameters.fy === 'number' ? parameters.fy : -100,
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

/** Extract goal markers from mesh and goal nodes (PhD-level) */
export function extractGoalMarkers(mesh: RenderMesh, goals: GoalBase[]): GoalMarkers {
  const anchors: AnchorMarker[] = [];
  const loads: LoadMarker[] = [];
  const bounds = computeBounds(mesh);
  const hasAnchorWithElements = goals.some(g => g.goalType === 'anchor' && (g.geometry?.elements?.length ?? 0) > 0);
  const hasLoadWithElements = goals.some(g => g.goalType === 'load' && (g.geometry?.elements?.length ?? 0) > 0);
  
  for (const goal of goals) {
    const elements = goal.geometry?.elements ?? [];
    if (goal.goalType === 'anchor') {
      if (elements.length > 0) {
        const metadata = analyzeGoalRegion(mesh, elements);
        if (!metadata.isValid) {
          console.warn('[ANCHOR GOAL] Invalid geometry:', metadata.validationErrors);
          anchors.push({ position: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z } });
        } else {
          anchors.push({ 
            position: metadata.weightedCentroid,
            metadata 
          });
        }
      } else if (!hasAnchorWithElements) {
        anchors.push({ position: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z } });
      }
    } else if (goal.goalType === 'load') {
      const force = extractForce(goal.parameters);
      if (elements.length > 0) {
        const metadata = analyzeGoalRegion(mesh, elements);
        if (!metadata.isValid) {
          console.warn('[LOAD GOAL] Invalid geometry:', metadata.validationErrors);
          loads.push({ position: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z }, force, distributed: true });
        } else {
          loads.push({ 
            position: metadata.weightedCentroid,
            force,
            distributed: true,
            metadata 
          });
        }
      } else if (!hasLoadWithElements) {
        loads.push({ position: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z }, force, distributed: true });
      }
    }
  }
  
  if (anchors.length === 0 && goals.some(g => g.goalType === 'anchor')) {
    anchors.push({ position: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z } });
  }
  if (loads.length === 0 && goals.some(g => g.goalType === 'load')) {
    loads.push({ position: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z }, force: { x: 0, y: -100, z: 0 }, distributed: true });
  }
  
  return { anchors, loads };
}

// ============================================================================
// DENSITY-TO-MESH GENERATION
// ============================================================================

export interface DensityField {
  densities: Float32Array | Float64Array;
  nx: number; ny: number; nz: number;
  bounds: { min: Vec3; max: Vec3 };
}

export interface GeometryOutput {
  pointCloud: RenderMesh;
  curveNetwork: RenderMesh;
  multipipe: RenderMesh;
  pointCount: number;
  curveCount: number;
}

interface DensePoint extends Vec3 { density: number; index: number; }
interface Curve { start: DensePoint; end: DensePoint; avgDensity: number; }

function extractDensePoints(field: DensityField, threshold: number): DensePoint[] {
  const { densities, nx, ny, nz, bounds } = field;
  const points: DensePoint[] = [];
  const dx = (bounds.max.x - bounds.min.x) / nx;
  const dy = (bounds.max.y - bounds.min.y) / ny;
  const dz = nz > 1 ? (bounds.max.z - bounds.min.z) / nz : 0;
  
  for (let iz = 0; iz < nz; iz++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const density = densities[iz * nx * ny + iy * nx + ix];
        if (density > threshold) {
          points.push({
            x: bounds.min.x + (ix + 0.5) * dx,
            y: bounds.min.y + (iy + 0.5) * dy,
            z: nz > 1 ? bounds.min.z + (iz + 0.5) * dz : bounds.min.z,
            density, index: points.length
          });
        }
      }
    }
  }
  return points;
}

function generateCurveNetwork(points: DensePoint[], maxLinksPerPoint: number, maxSpanLength: number): Curve[] {
  if (points.length === 0) return [];
  const maxSpanSq = maxSpanLength * maxSpanLength;
  const curves: Curve[] = [];
  const linkCount = new Map<number, number>();
  for (const p of points) linkCount.set(p.index, 0);
  
  const neighbors: { i: number; j: number; distSq: number; avgDensity: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[j].x - points[i].x, dy = points[j].y - points[i].y, dz = points[j].z - points[i].z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < maxSpanSq) neighbors.push({ i, j, distSq, avgDensity: (points[i].density + points[j].density) / 2 });
    }
  }
  
  neighbors.sort((a, b) => Math.abs(b.avgDensity - a.avgDensity) > 0.01 ? b.avgDensity - a.avgDensity : a.distSq - b.distSq);
  
  for (const { i, j, avgDensity } of neighbors) {
    const c1 = linkCount.get(i) || 0, c2 = linkCount.get(j) || 0;
    if (c1 < maxLinksPerPoint && c2 < maxLinksPerPoint) {
      curves.push({ start: points[i], end: points[j], avgDensity });
      linkCount.set(i, c1 + 1);
      linkCount.set(j, c2 + 1);
    }
  }
  return curves;
}

function createPointCloudMesh(points: DensePoint[], baseSize: number): RenderMesh {
  if (points.length === 0) return { positions: [], normals: [], uvs: [], indices: [] };
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
  
  for (const p of points) {
    const baseIdx = positions.length / 3;
    const size = baseSize * (0.5 + p.density * 0.5);
    const verts = [
      [p.x - size, p.y - size, p.z - size], [p.x + size, p.y - size, p.z - size],
      [p.x + size, p.y + size, p.z - size], [p.x - size, p.y + size, p.z - size],
      [p.x - size, p.y - size, p.z + size], [p.x + size, p.y - size, p.z + size],
      [p.x + size, p.y + size, p.z + size], [p.x - size, p.y + size, p.z + size]
    ];
    for (const v of verts) { positions.push(...v); normals.push(0, 1, 0); uvs.push(0, 0); }
    const faces = [[0,1,2],[0,2,3],[4,6,5],[4,7,6],[0,4,5],[0,5,1],[2,6,7],[2,7,3],[0,3,7],[0,7,4],[1,5,6],[1,6,2]];
    for (const f of faces) indices.push(baseIdx + f[0], baseIdx + f[1], baseIdx + f[2]);
  }
  return { positions, normals, uvs, indices };
}

function createTube(start: Vec3, end: Vec3, r1: number, r2: number, segs: number, pos: number[], nrm: number[], uv: number[], idx: number[], base: number): void {
  const dir = { x: end.x - start.x, y: end.y - start.y, z: end.z - start.z };
  const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
  if (len < 0.001) return;
  dir.x /= len; dir.y /= len; dir.z /= len;
  
  let p1: Vec3 = Math.abs(dir.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const p2 = { x: dir.y * p1.z - dir.z * p1.y, y: dir.z * p1.x - dir.x * p1.z, z: dir.x * p1.y - dir.y * p1.x };
  const l2 = Math.sqrt(p2.x * p2.x + p2.y * p2.y + p2.z * p2.z);
  p2.x /= l2; p2.y /= l2; p2.z /= l2;
  p1 = { x: p2.y * dir.z - p2.z * dir.y, y: p2.z * dir.x - p2.x * dir.z, z: p2.x * dir.y - p2.y * dir.x };
  
  for (let ring = 0; ring < 2; ring++) {
    const center = ring === 0 ? start : end;
    const radius = ring === 0 ? r1 : r2;
    for (let i = 0; i < segs; i++) {
      const angle = (i / segs) * 2 * Math.PI;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      pos.push(center.x + radius * (cos * p1.x + sin * p2.x), center.y + radius * (cos * p1.y + sin * p2.y), center.z + radius * (cos * p1.z + sin * p2.z));
      nrm.push(cos * p1.x + sin * p2.x, cos * p1.y + sin * p2.y, cos * p1.z + sin * p2.z);
      uv.push(i / segs, ring);
    }
  }
  
  for (let i = 0; i < segs; i++) {
    const i1 = base + i, i2 = base + ((i + 1) % segs), i3 = base + segs + i, i4 = base + segs + ((i + 1) % segs);
    idx.push(i1, i2, i3, i2, i4, i3);
  }
}

function createMultipipeMesh(curves: Curve[], baseRadius: number, segments: number): RenderMesh {
  if (curves.length === 0) return { positions: [], normals: [], uvs: [], indices: [] };
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
  
  for (const curve of curves) {
    createTube(curve.start, curve.end, baseRadius * (0.5 + curve.start.density * 2), baseRadius * (0.5 + curve.end.density * 2), segments, positions, normals, uvs, indices, positions.length / 3);
  }
  return { positions, normals, uvs, indices };
}

/** Generate geometry from density field */
export function generateGeometryFromDensities(
  field: DensityField,
  densityThreshold: number = 0.3,
  maxLinksPerPoint: number = 6,
  maxSpanLength: number = 1.5,
  baseRadius: number = 0.045,
  pipeSegments: number = 12
): GeometryOutput {
  const segs = Math.max(4, Math.round(pipeSegments));  // Reduced min from 6 to 4 for lower quality
  const points = extractDensePoints(field, densityThreshold);
  const curves = generateCurveNetwork(points, maxLinksPerPoint, maxSpanLength);
  
  // Only generate multipipe mesh for performance (skip pointCloud and curveNetwork)
  const multipipe = createMultipipeMesh(curves, baseRadius, segs);
  
  return {
    pointCloud: multipipe,      // Reuse multipipe to avoid extra allocation
    curveNetwork: multipipe,    // Reuse multipipe to avoid extra allocation
    multipipe: multipipe,
    pointCount: points.length,
    curveCount: curves.length
  };
}
