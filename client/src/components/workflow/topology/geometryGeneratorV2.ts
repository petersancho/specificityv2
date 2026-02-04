import type { Vec3, RenderMesh } from "../../../types";

/**
 * Improved Geometry Generator for Topology Optimization
 * 
 * Creates smooth, organic structures with variable thickness
 * that resemble real topology-optimized results
 */

const DEBUG = false; // Set to true for verbose logging

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export interface DensityField {
  densities: Float64Array;
  nx: number;
  ny: number;
  nz: number;
  bounds: { min: Vec3; max: Vec3 };
}

export interface GeometryOutput {
  pointCloud: RenderMesh;
  curveNetwork: RenderMesh;
  multipipe: RenderMesh;
  pointCount: number;
  curveCount: number;
}

interface DensePoint extends Vec3 {
  density: number;
  index: number;
}

interface Curve {
  start: DensePoint;
  end: DensePoint;
  avgDensity: number;
}

/**
 * Generate improved geometry from density field
 */
export function generateGeometryFromDensities(
  field: DensityField,
  densityThreshold: number = 0.3,
  maxLinksPerPoint: number = 6,
  maxSpanLength: number = 1.5,
  baseRadius: number = 0.045,
  pipeSegments: number = 12,
  pointBudget: number = 6000
): GeometryOutput {
  const safeDensities = new Float64Array(field.densities.length);
  for (let i = 0; i < field.densities.length; i++) {
    const raw = field.densities[i];
    safeDensities[i] = Number.isFinite(raw) ? clamp01(raw) : 0;
  }
  const safeField: DensityField = {
    ...field,
    densities: safeDensities,
  };
  const multipipeSegments = Math.max(6, Math.round(pipeSegments));
  const curveSegments = Math.max(6, Math.round(multipipeSegments * 0.5));

  const spanX = Math.max(1e-6, safeField.bounds.max.x - safeField.bounds.min.x);
  const spanY = Math.max(1e-6, safeField.bounds.max.y - safeField.bounds.min.y);
  const spanZ = Math.max(1e-6, safeField.bounds.max.z - safeField.bounds.min.z);
  const cellSpan = Math.max(
    spanX / Math.max(1, safeField.nx),
    spanY / Math.max(1, safeField.ny),
    safeField.nz > 1 ? spanZ / Math.max(1, safeField.nz) : 0
  );
  const effectiveSpanLength = Math.max(maxSpanLength, cellSpan * 1.75);

  // Step 1: Extract points with density information
  let points = extractDensePoints(safeField, densityThreshold, pointBudget);
  if (points.length > pointBudget) {
    points = points
      .sort((a, b) => b.density - a.density)
      .slice(0, pointBudget);
  }
  
  // Step 2: Generate curve network with density info
  let curves = generateDenseCurveNetwork(points, maxLinksPerPoint, effectiveSpanLength);
  if (curves.length === 0 && points.length > 1) {
    const fallbackSpan = Math.max(
      effectiveSpanLength,
      Math.max(spanX, spanY, spanZ) * 0.5
    );
    curves = generateDenseCurveNetwork(points, Math.max(2, maxLinksPerPoint), fallbackSpan);
  }
  if (curves.length === 0 && points.length > 1) {
    curves = generateFallbackChain(points, Math.max(2, maxLinksPerPoint));
  }
  
  // Step 3: Create meshes with variable thickness
  const pointCloudMesh = createDensePointCloudMesh(points, baseRadius * 0.5);
  const curveNetworkMesh = createVariableThicknessCurves(curves, baseRadius * 0.4, curveSegments);
  const multipipeMesh = createVariableThicknessMultipipe(curves, baseRadius, multipipeSegments);
  
  return {
    pointCloud: pointCloudMesh,
    curveNetwork: curveNetworkMesh,
    multipipe: multipipeMesh,
    pointCount: points.length,
    curveCount: curves.length,
  };
}

/**
 * Extract points with density values
 */
function extractDensePoints(
  field: DensityField,
  threshold: number,
  pointBudget: number
): DensePoint[] {
  const { densities, nx, ny, nz, bounds } = field;
  const points: DensePoint[] = [];

  const dx = (bounds.max.x - bounds.min.x) / nx;
  const dy = (bounds.max.y - bounds.min.y) / ny;
  const dz = nz > 1 ? (bounds.max.z - bounds.min.z) / nz : 0;

  let maxDensity = 0;

  for (let iz = 0; iz < nz; iz++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const idx = iz * nx * ny + iy * nx + ix;
        const densityRaw = densities[idx];
        const density = Number.isFinite(densityRaw) ? clamp01(densityRaw) : 0;
        if (density > maxDensity) maxDensity = density;
        if (density > threshold) {
          const x = bounds.min.x + (ix + 0.5) * dx;
          const y = bounds.min.y + (iy + 0.5) * dy;
          const z = nz > 1 ? bounds.min.z + (iz + 0.5) * dz : bounds.min.z;
          points.push({ x, y, z, density, index: points.length });
        }
      }
    }
  }

  if (points.length > 0 || densities.length === 0) {
    return points;
  }

  const fallbackThreshold = maxDensity > 0 ? maxDensity * 0.85 : threshold * 0.5;
  if (fallbackThreshold !== threshold) {
    for (let iz = 0; iz < nz; iz++) {
      for (let iy = 0; iy < ny; iy++) {
        for (let ix = 0; ix < nx; ix++) {
          const idx = iz * nx * ny + iy * nx + ix;
          const densityRaw = densities[idx];
          const density = Number.isFinite(densityRaw) ? clamp01(densityRaw) : 0;
          if (density >= fallbackThreshold) {
            const x = bounds.min.x + (ix + 0.5) * dx;
            const y = bounds.min.y + (iy + 0.5) * dy;
            const z = nz > 1 ? bounds.min.z + (iz + 0.5) * dz : bounds.min.z;
            points.push({ x, y, z, density, index: points.length });
          }
        }
      }
    }
  }

  if (points.length > 0) {
    return points;
  }

  const fallbackCount = Math.min(
    Math.max(32, Math.round(densities.length * 0.002)),
    Math.max(1, pointBudget)
  );
  const candidates: { idx: number; density: number }[] = [];
  for (let idx = 0; idx < densities.length; idx++) {
    const densityRaw = densities[idx];
    const density = Number.isFinite(densityRaw) ? clamp01(densityRaw) : 0;
    candidates.push({ idx, density });
  }
  candidates.sort((a, b) => b.density - a.density);

  const maxToTake = Math.min(fallbackCount, candidates.length);
  for (let i = 0; i < maxToTake; i++) {
    const idx = candidates[i].idx;
    const density = candidates[i].density;
    const ix = idx % nx;
    const iy = Math.floor(idx / nx) % ny;
    const iz = Math.floor(idx / (nx * ny));
    const x = bounds.min.x + (ix + 0.5) * dx;
    const y = bounds.min.y + (iy + 0.5) * dy;
    const z = nz > 1 ? bounds.min.z + (iz + 0.5) * dz : bounds.min.z;
    points.push({ x, y, z, density, index: points.length });
  }

  return points;
}

/**
 * Generate curve network with density information
 */
function generateDenseCurveNetwork(
  points: DensePoint[],
  maxLinksPerPoint: number,
  maxSpanLength: number
): Curve[] {
  if (points.length === 0) return [];

  const maxSpanSquared = maxSpanLength * maxSpanLength;
  const curves: Curve[] = [];
  const linkCount = new Map<number, number>();

  for (const point of points) {
    linkCount.set(point.index, 0);
  }

  const cellSize = Math.max(1e-6, maxSpanLength);
  const cellMap = new Map<string, number[]>();

  const cellKey = (x: number, y: number, z: number) => `${x},${y},${z}`;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const cx = Math.floor(p.x / cellSize);
    const cy = Math.floor(p.y / cellSize);
    const cz = Math.floor(p.z / cellSize);
    const key = cellKey(cx, cy, cz);
    const bucket = cellMap.get(key);
    if (bucket) {
      bucket.push(i);
    } else {
      cellMap.set(key, [i]);
    }
  }

  const neighbors: { i: number; j: number; distSq: number; avgDensity: number }[] = [];

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const cx = Math.floor(p1.x / cellSize);
    const cy = Math.floor(p1.y / cellSize);
    const cz = Math.floor(p1.z / cellSize);

    for (let dz = -1; dz <= 1; dz++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const key = cellKey(cx + dx, cy + dy, cz + dz);
          const bucket = cellMap.get(key);
          if (!bucket) continue;
          for (const j of bucket) {
            if (j <= i) continue;
            const p2 = points[j];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dz = p2.z - p1.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            if (distSq < maxSpanSquared) {
              const avgDensity = (p1.density + p2.density) / 2;
              neighbors.push({ i, j, distSq, avgDensity });
            }
          }
        }
      }
    }
  }

  neighbors.sort((a, b) => {
    const densityDiff = b.avgDensity - a.avgDensity;
    if (Math.abs(densityDiff) > 0.01) return densityDiff;
    return a.distSq - b.distSq;
  });

  for (const { i, j, avgDensity } of neighbors) {
    const count1 = linkCount.get(i) || 0;
    const count2 = linkCount.get(j) || 0;
    if (count1 < maxLinksPerPoint && count2 < maxLinksPerPoint) {
      curves.push({
        start: points[i],
        end: points[j],
        avgDensity,
      });
      linkCount.set(i, count1 + 1);
      linkCount.set(j, count2 + 1);
    }
  }

  return curves;
}

/**
 * Fallback curve generator: connect points in density order to ensure connectivity.
 */
function generateFallbackChain(points: DensePoint[], maxLinksPerPoint: number): Curve[] {
  if (points.length < 2) return [];
  const sorted = [...points].sort((a, b) => b.density - a.density);
  const curves: Curve[] = [];
  const linkCount = new Map<number, number>();
  for (const point of sorted) {
    linkCount.set(point.index, 0);
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    const countStart = linkCount.get(start.index) ?? 0;
    const countEnd = linkCount.get(end.index) ?? 0;
    if (countStart >= maxLinksPerPoint || countEnd >= maxLinksPerPoint) continue;
    curves.push({
      start,
      end,
      avgDensity: (start.density + end.density) / 2,
    });
    linkCount.set(start.index, countStart + 1);
    linkCount.set(end.index, countEnd + 1);
  }
  return curves;
}

/**
 * Create point cloud mesh with density-based sizing
 */
function createDensePointCloudMesh(points: DensePoint[], baseSize: number): RenderMesh {
  if (points.length === 0) {
    return { positions: [], normals: [], uvs: [], indices: [] };
  }
  
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  
  for (const point of points) {
    const baseIdx = positions.length / 3;
    // Size scales with density
    const size = baseSize * (0.5 + point.density * 0.5);
    
    // Create a small cube at each point
    const vertices = [
      { x: point.x - size, y: point.y - size, z: point.z - size },
      { x: point.x + size, y: point.y - size, z: point.z - size },
      { x: point.x + size, y: point.y + size, z: point.z - size },
      { x: point.x - size, y: point.y + size, z: point.z - size },
      { x: point.x - size, y: point.y - size, z: point.z + size },
      { x: point.x + size, y: point.y - size, z: point.z + size },
      { x: point.x + size, y: point.y + size, z: point.z + size },
      { x: point.x - size, y: point.y + size, z: point.z + size },
    ];
    
    for (const v of vertices) {
      positions.push(v.x, v.y, v.z);
      normals.push(0, 1, 0);
      uvs.push(0, 0);
    }
    
    const faces = [
      [0, 1, 2], [0, 2, 3], // Front
      [4, 6, 5], [4, 7, 6], // Back
      [0, 4, 5], [0, 5, 1], // Bottom
      [2, 6, 7], [2, 7, 3], // Top
      [0, 3, 7], [0, 7, 4], // Left
      [1, 5, 6], [1, 6, 2], // Right
    ];
    
    for (const face of faces) {
      indices.push(baseIdx + face[0], baseIdx + face[1], baseIdx + face[2]);
    }
  }
  
  return { positions, normals, uvs, indices };
}

/**
 * Create curve network with variable thickness based on density
 */
function createVariableThicknessCurves(curves: Curve[], baseRadius: number, segments: number): RenderMesh {
  if (curves.length === 0) {
    return { positions: [], normals: [], uvs: [], indices: [] };
  }
  
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  
  for (const curve of curves) {
    const baseIdx = positions.length / 3;
    
    // Radius varies with average density
    const radius = baseRadius * (0.3 + curve.avgDensity * 0.7);
    
    createTubeBetweenPoints(
      curve.start,
      curve.end,
      radius,
      radius,
      segments,
      positions,
      normals,
      uvs,
      indices,
      baseIdx
    );
  }
  
  return { positions, normals, uvs, indices };
}

/**
 * Create multipipe with variable thickness and smooth transitions
 */
function createVariableThicknessMultipipe(curves: Curve[], baseRadius: number, segments: number): RenderMesh {
  if (curves.length === 0) {
    return { positions: [], normals: [], uvs: [], indices: [] };
  }
  
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  
  for (const curve of curves) {
    const baseIdx = positions.length / 3;
    
    // Radius varies significantly with density (0.5x to 2.5x base)
    const startDensity = Number.isFinite(curve.start.density) ? clamp01(curve.start.density) : 0;
    const endDensity = Number.isFinite(curve.end.density) ? clamp01(curve.end.density) : 0;
    const startRadius = baseRadius * (0.5 + startDensity * 2.0);
    const endRadius = baseRadius * (0.5 + endDensity * 2.0);
    
    createTubeBetweenPoints(
      curve.start,
      curve.end,
      startRadius,
      endRadius,
      segments,
      positions,
      normals,
      uvs,
      indices,
      baseIdx
    );
  }
  
  return { positions, normals, uvs, indices };
}

/**
 * Create a tube between two points with variable radius
 */
function createTubeBetweenPoints(
  start: Vec3,
  end: Vec3,
  startRadius: number,
  endRadius: number,
  segments: number,
  positions: number[],
  normals: number[],
  uvs: number[],
  indices: number[],
  baseIdx: number
): void {
  const dir = {
    x: end.x - start.x,
    y: end.y - start.y,
    z: end.z - start.z,
  };
  const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
  
  if (length < 0.001) return;
  
  dir.x /= length;
  dir.y /= length;
  dir.z /= length;
  
  // Find perpendicular vectors
  let perp1: Vec3;
  if (Math.abs(dir.y) < 0.9) {
    perp1 = { x: 0, y: 1, z: 0 };
  } else {
    perp1 = { x: 1, y: 0, z: 0 };
  }
  
  // Cross product: perp2 = dir × perp1
  const perp2 = {
    x: dir.y * perp1.z - dir.z * perp1.y,
    y: dir.z * perp1.x - dir.x * perp1.z,
    z: dir.x * perp1.y - dir.y * perp1.x,
  };
  const len2 = Math.sqrt(perp2.x * perp2.x + perp2.y * perp2.y + perp2.z * perp2.z);
  perp2.x /= len2;
  perp2.y /= len2;
  perp2.z /= len2;
  
  // Cross product: perp1 = perp2 × dir
  perp1 = {
    x: perp2.y * dir.z - perp2.z * dir.y,
    y: perp2.z * dir.x - perp2.x * dir.z,
    z: perp2.x * dir.y - perp2.y * dir.x,
  };
  
  // Create ring vertices at start and end with variable radius
  for (let ring = 0; ring < 2; ring++) {
    const center = ring === 0 ? start : end;
    const radius = ring === 0 ? startRadius : endRadius;
    
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      const x = center.x + radius * (cos * perp1.x + sin * perp2.x);
      const y = center.y + radius * (cos * perp1.y + sin * perp2.y);
      const z = center.z + radius * (cos * perp1.z + sin * perp2.z);
      
      positions.push(x, y, z);
      
      // Normal points outward from tube axis
      const nx = cos * perp1.x + sin * perp2.x;
      const ny = cos * perp1.y + sin * perp2.y;
      const nz = cos * perp1.z + sin * perp2.z;
      normals.push(nx, ny, nz);
      
      uvs.push(i / segments, ring);
    }
  }
  
  // Create faces connecting the two rings
  for (let i = 0; i < segments; i++) {
    const i1 = baseIdx + i;
    const i2 = baseIdx + ((i + 1) % segments);
    const i3 = baseIdx + segments + i;
    const i4 = baseIdx + segments + ((i + 1) % segments);
    
    indices.push(i1, i2, i3);
    indices.push(i2, i4, i3);
  }
}
