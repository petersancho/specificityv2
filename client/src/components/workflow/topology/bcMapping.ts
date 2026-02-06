// ============================================================================
// BOUNDARY CONDITION MAPPING - Distributed Loads and Supports
// ============================================================================
//
// CRITICAL FIX: Replaces point loads/anchors with distributed BCs
//
// PROBLEM (OLD):
// - Goal regions (anchor/load) were reduced to a single centroid point
// - Snapped to ONE grid node → point load/support
// - Created stress singularities → jagged geometry near BCs
//
// SOLUTION (NEW):
// - Goal regions map to MULTIPLE grid nodes within a radius
// - Loads distributed with weights (sum = total force)
// - Anchors applied to all nodes in region
// - Eliminates singularities → smooth, usable geometry
//
// REFERENCES:
// - Zienkiewicz & Taylor (2000) - Finite Element Method, Vol 1
// - Cook et al. (2001) - Concepts and Applications of FEA
// ============================================================================

import type { RenderMesh, Vec3 } from "../../../types";
import type { Bounds } from "./coordinateFrames";
import { worldToGrid, gridToNodeIndex } from "./coordinateFrames";

export interface DistributedNodes {
  nodeIds: number[];
  weights: number[]; // Normalized weights (sum = 1.0 for loads)
}

export interface BCDistributionConfig {
  radiusCells: number;     // Radius in grid cells (e.g., 2-4)
  minNodes: number;        // Minimum nodes to include (e.g., 8-12)
  maxNodes?: number;       // Maximum nodes (performance cap)
  mode: "radius" | "nearestK";
  nearestK?: number;       // If mode === "nearestK"
}

export const DefaultAnchorDistribution: BCDistributionConfig = {
  mode: "radius",
  radiusCells: 2,
  minNodes: 8,
  maxNodes: 50,
};

export const DefaultLoadDistribution: BCDistributionConfig = {
  mode: "radius",
  radiusCells: 2,
  minNodes: 8,
  maxNodes: 50,
};

/**
 * Extract world positions from vertex indices
 */
function positionsFromVertices(mesh: RenderMesh, vertices: number[]): Vec3[] {
  const positions: Vec3[] = [];
  for (const vertexIdx of vertices) {
    const i = vertexIdx * 3;
    if (i + 2 < mesh.positions.length) {
      positions.push({
        x: mesh.positions[i],
        y: mesh.positions[i + 1],
        z: mesh.positions[i + 2],
      });
    }
  }
  return positions;
}

/**
 * Compute centroid of positions (for reference point)
 */
function centroid(positions: Vec3[]): Vec3 {
  if (positions.length === 0) return { x: 0, y: 0, z: 0 };
  let sx = 0, sy = 0, sz = 0;
  for (const p of positions) {
    sx += p.x;
    sy += p.y;
    sz += p.z;
  }
  return { x: sx / positions.length, y: sy / positions.length, z: sz / positions.length };
}

/**
 * Distribute goal region vertices to multiple grid nodes
 * 
 * ALGORITHM:
 * 1. Convert goal vertices to world positions
 * 2. Compute centroid as reference point
 * 3. Find all grid nodes within radiusCells of any goal vertex
 * 4. Compute weights (uniform or inverse-distance)
 * 5. Normalize weights to sum = 1.0
 * 6. Enforce minNodes constraint (expand radius if needed)
 * 
 * @param mesh - Input mesh geometry
 * @param goalVertices - Vertex indices defining goal region
 * @param bounds - World-space bounds for grid mapping
 * @param nx, ny, nz - Grid resolution
 * @param cfg - Distribution configuration
 * @returns Distributed node IDs and weights
 */
export function distributeVerticesToGridNodes(
  mesh: RenderMesh,
  goalVertices: number[],
  bounds: Bounds,
  nx: number,
  ny: number,
  nz: number,
  cfg: BCDistributionConfig
): DistributedNodes {
  if (goalVertices.length === 0) {
    console.warn('[BC MAPPING] No vertices in goal region');
    return { nodeIds: [], weights: [] };
  }

  // Extract world positions
  const positions = positionsFromVertices(mesh, goalVertices);
  if (positions.length === 0) {
    console.warn('[BC MAPPING] No valid positions extracted from vertices');
    return { nodeIds: [], weights: [] };
  }

  // Compute reference centroid
  const center = centroid(positions);

  // Convert positions to grid coordinates (float)
  const gridPositions = positions.map(p => worldToGrid(p, bounds, nx, ny, nz));

  // Find candidate grid nodes within radius
  const candidateNodes = new Map<number, number>(); // nodeId → distance²

  if (cfg.mode === "radius") {
    const radiusSq = cfg.radiusCells * cfg.radiusCells;

    // For each goal vertex, include all grid nodes within radius
    for (const gridPos of gridPositions) {
      const gx = Math.round(gridPos.ix);
      const gy = Math.round(gridPos.iy);
      const gz = Math.round(gridPos.iz);

      // Search in cube around grid position
      const r = Math.ceil(cfg.radiusCells);
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dz = -r; dz <= r; dz++) {
            const nx_node = gx + dx;
            const ny_node = gy + dy;
            const nz_node = gz + dz;

            // Check bounds
            if (nx_node < 0 || nx_node > nx) continue;
            if (ny_node < 0 || ny_node > ny) continue;
            if (nz_node < 0 || nz_node > nz) continue;

            // Check radius
            const distSq = dx * dx + dy * dy + dz * dz;
            if (distSq > radiusSq) continue;

            // Compute node index
            const nodeIdx = gridToNodeIndex({ ix: nx_node, iy: ny_node, iz: nz_node }, nx, ny);

            // Track minimum distance to any goal vertex
            if (!candidateNodes.has(nodeIdx) || distSq < candidateNodes.get(nodeIdx)!) {
              candidateNodes.set(nodeIdx, distSq);
            }
          }
        }
      }
    }
  } else if (cfg.mode === "nearestK") {
    // Find K nearest grid nodes to centroid
    const centerGrid = worldToGrid(center, bounds, nx, ny, nz);
    const cx = Math.round(centerGrid.ix);
    const cy = Math.round(centerGrid.iy);
    const cz = Math.round(centerGrid.iz);

    const K = cfg.nearestK ?? 12;
    const searchRadius = Math.ceil(Math.cbrt(K) * 2); // Heuristic search radius

    const allNodes: Array<{ nodeIdx: number; distSq: number }> = [];

    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dz = -searchRadius; dz <= searchRadius; dz++) {
          const nx_node = cx + dx;
          const ny_node = cy + dy;
          const nz_node = cz + dz;

          if (nx_node < 0 || nx_node > nx) continue;
          if (ny_node < 0 || ny_node > ny) continue;
          if (nz_node < 0 || nz_node > nz) continue;

          const distSq = dx * dx + dy * dy + dz * dz;
          const nodeIdx = gridToNodeIndex({ ix: nx_node, iy: ny_node, iz: nz_node }, nx, ny);
          allNodes.push({ nodeIdx, distSq });
        }
      }
    }

    // Sort by distance and take K nearest
    allNodes.sort((a, b) => a.distSq - b.distSq);
    for (let i = 0; i < Math.min(K, allNodes.length); i++) {
      candidateNodes.set(allNodes[i].nodeIdx, allNodes[i].distSq);
    }
  }

  // Enforce minNodes constraint
  if (candidateNodes.size < cfg.minNodes) {
    console.warn(`[BC MAPPING] Only ${candidateNodes.size} nodes found (min: ${cfg.minNodes}). Expanding radius...`);
    
    // Expand radius incrementally until we have enough nodes
    let expandedRadius = cfg.radiusCells;
    while (candidateNodes.size < cfg.minNodes && expandedRadius < cfg.radiusCells * 3) {
      expandedRadius += 1;
      const radiusSq = expandedRadius * expandedRadius;

      for (const gridPos of gridPositions) {
        const gx = Math.round(gridPos.ix);
        const gy = Math.round(gridPos.iy);
        const gz = Math.round(gridPos.iz);

        const r = Math.ceil(expandedRadius);
        for (let dx = -r; dx <= r; dx++) {
          for (let dy = -r; dy <= r; dy++) {
            for (let dz = -r; dz <= r; dz++) {
              const nx_node = gx + dx;
              const ny_node = gy + dy;
              const nz_node = gz + dz;

              if (nx_node < 0 || nx_node > nx) continue;
              if (ny_node < 0 || ny_node > ny) continue;
              if (nz_node < 0 || nz_node > nz) continue;

              const distSq = dx * dx + dy * dy + dz * dz;
              if (distSq > radiusSq) continue;

              const nodeIdx = gridToNodeIndex({ ix: nx_node, iy: ny_node, iz: nz_node }, nx, ny);
              if (!candidateNodes.has(nodeIdx) || distSq < candidateNodes.get(nodeIdx)!) {
                candidateNodes.set(nodeIdx, distSq);
              }
            }
          }
        }
      }
    }

    console.log(`[BC MAPPING] Expanded radius to ${expandedRadius} cells → ${candidateNodes.size} nodes`);
  }

  // Enforce maxNodes constraint
  if (cfg.maxNodes && candidateNodes.size > cfg.maxNodes) {
    // Keep only the closest maxNodes nodes
    const sorted = Array.from(candidateNodes.entries()).sort((a, b) => a[1] - b[1]);
    candidateNodes.clear();
    for (let i = 0; i < cfg.maxNodes; i++) {
      candidateNodes.set(sorted[i][0], sorted[i][1]);
    }
    console.log(`[BC MAPPING] Capped to ${cfg.maxNodes} nodes (closest to goal region)`);
  }

  if (candidateNodes.size === 0) {
    console.error('[BC MAPPING] No grid nodes found for goal region!');
    return { nodeIds: [], weights: [] };
  }

  // Compute weights (inverse-distance squared, with epsilon for stability)
  const nodeIds: number[] = [];
  const weights: number[] = [];
  const epsilon = 0.1; // Prevent division by zero for nodes exactly on vertices

  for (const [nodeIdx, distSq] of candidateNodes.entries()) {
    nodeIds.push(nodeIdx);
    // Weight = 1 / (epsilon + distance²)
    // Closer nodes get higher weight
    weights.push(1.0 / (epsilon + distSq));
  }

  // Normalize weights to sum = 1.0
  const sumWeights = weights.reduce((sum, w) => sum + w, 0);
  if (sumWeights < 1e-12) {
    console.error('[BC MAPPING] Sum of weights is near zero!');
    // Fallback to uniform weights
    weights.fill(1.0 / weights.length);
  } else {
    for (let i = 0; i < weights.length; i++) {
      weights[i] /= sumWeights;
    }
  }

  console.log(`[BC MAPPING] Distributed ${goalVertices.length} vertices → ${nodeIds.length} grid nodes (radius: ${cfg.radiusCells} cells)`);

  return { nodeIds, weights };
}

/**
 * Validate distributed boundary conditions
 * 
 * Checks:
 * 1. Weights sum to 1.0 (within tolerance)
 * 2. All weights are non-negative
 * 3. Number of nodes meets minimum requirement
 * 
 * @param dist - Distributed nodes to validate
 * @param minNodes - Minimum required nodes
 * @returns Validation result with errors
 */
export function validateDistributedNodes(
  dist: DistributedNodes,
  minNodes: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (dist.nodeIds.length !== dist.weights.length) {
    errors.push(`Node count (${dist.nodeIds.length}) != weight count (${dist.weights.length})`);
  }

  if (dist.nodeIds.length < minNodes) {
    errors.push(`Only ${dist.nodeIds.length} nodes (min: ${minNodes})`);
  }

  const sumWeights = dist.weights.reduce((sum, w) => sum + w, 0);
  if (Math.abs(sumWeights - 1.0) > 1e-6) {
    errors.push(`Weights sum to ${sumWeights.toFixed(6)} (expected 1.0)`);
  }

  for (let i = 0; i < dist.weights.length; i++) {
    if (dist.weights[i] < 0) {
      errors.push(`Negative weight at index ${i}: ${dist.weights[i]}`);
    }
  }

  return { isValid: errors.length === 0, errors };
}
