import type { Vec3, RenderMesh } from "../../../types";
import type { GoalMarkers, AnchorMarker, LoadMarker } from "./types";

// ============================================================================
// GOAL EXTRACTION MODULE
// ============================================================================

type GoalBase = {
  goalType: string;
  geometry: { elements: number[] };
  parameters?: Record<string, unknown>;
};

const MAX_MARKERS = 12;

/**
 * Extract Vec3 positions from mesh vertex indices
 */
function positionsFromElements(mesh: RenderMesh, elements: number[]): Vec3[] {
  const positions: Vec3[] = [];
  
  for (const vertexIdx of elements) {
    const i = vertexIdx * 3;
    if (i + 2 < mesh.positions.length) {
      positions.push({
        x: mesh.positions[i],
        y: mesh.positions[i + 1],
        z: mesh.positions[i + 2]
      });
    }
  }
  
  return positions;
}

/**
 * Compute centroid of a set of points
 */
function centroid(points: Vec3[]): Vec3 {
  if (points.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  
  let sx = 0, sy = 0, sz = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
    sz += p.z;
  }
  
  return {
    x: sx / points.length,
    y: sy / points.length,
    z: sz / points.length
  };
}

const pointKey = (p: Vec3) =>
  `${p.x.toFixed(6)}|${p.y.toFixed(6)}|${p.z.toFixed(6)}`;

function dedupePoints(points: Vec3[]): Vec3[] {
  const map = new Map<string, Vec3>();
  for (const p of points) {
    map.set(pointKey(p), p);
  }
  return Array.from(map.values());
}

function samplePoints(points: Vec3[], maxCount: number): Vec3[] {
  if (points.length <= maxCount) return points;
  const step = Math.max(1, Math.ceil(points.length / maxCount));
  const sampled: Vec3[] = [];
  for (let i = 0; i < points.length && sampled.length < maxCount; i += step) {
    sampled.push(points[i]);
  }
  return sampled;
}

function collectExtremes(points: Vec3[]): Vec3[] {
  if (points.length === 0) return [];
  let minX = points[0];
  let maxX = points[0];
  let minY = points[0];
  let maxY = points[0];
  let minZ = points[0];
  let maxZ = points[0];
  for (const p of points) {
    if (p.x < minX.x) minX = p;
    if (p.x > maxX.x) maxX = p;
    if (p.y < minY.y) minY = p;
    if (p.y > maxY.y) maxY = p;
    if (p.z < minZ.z) minZ = p;
    if (p.z > maxZ.z) maxZ = p;
  }
  return dedupePoints([minX, maxX, minY, maxY, minZ, maxZ]);
}

function buildMarkerPositions(points: Vec3[]): Vec3[] {
  const unique = dedupePoints(points);
  if (unique.length <= 1) return unique;
  const extremes = collectExtremes(unique);
  const center = centroid(unique);
  const combined = dedupePoints([...extremes, center, ...unique]);
  return samplePoints(combined, MAX_MARKERS);
}

/**
 * Extract force vector from goal parameters
 */
function extractForce(parameters?: Record<string, unknown>): Vec3 {
  if (!parameters) {
    return { x: 0, y: -100, z: 0 }; // Default downward force
  }
  
  // Try to extract force as Vec3
  const force = parameters.force as Vec3 | undefined;
  if (force && typeof force.x === 'number') {
    return {
      x: force.x ?? 0,
      y: force.y ?? 0,
      z: force.z ?? 0
    };
  }
  
  // Try individual components
  const fx = typeof parameters.forceX === 'number' ? parameters.forceX : 
             typeof parameters.fx === 'number' ? parameters.fx : 0;
  const fy = typeof parameters.forceY === 'number' ? parameters.forceY :
             typeof parameters.fy === 'number' ? parameters.fy : -100;
  const fz = typeof parameters.forceZ === 'number' ? parameters.forceZ :
             typeof parameters.fz === 'number' ? parameters.fz : 0;
  
  return { x: fx, y: fy, z: fz };
}

/**
 * Compute mesh bounds
 */
function computeBounds(mesh: RenderMesh): { min: Vec3; max: Vec3 } {
  if (mesh.positions.length === 0) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 1, y: 1, z: 0 }
    };
  }
  
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = mesh.positions[i];
    const y = mesh.positions[i + 1];
    const z = mesh.positions[i + 2];
    
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  
  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ }
  };
}

/**
 * Extract goal markers from mesh and goal nodes
 * 
 * This is the GEOMETRY SETUP MODULE's goal extraction component.
 * It converts goal node selections into concrete positions and forces
 * using the Lingua ontology (Vec3, RenderMesh).
 * 
 * If goals don't have vertex selections, uses default positions based on mesh bounds.
 */
export function extractGoalMarkers(
  mesh: RenderMesh,
  goals: GoalBase[]
): GoalMarkers {
  const anchors: AnchorMarker[] = [];
  const loads: LoadMarker[] = [];
  
  // Compute mesh bounds for default positions
  const bounds = computeBounds(mesh);
  const hasAnchorWithElements = goals.some(g => g.goalType === 'anchor' && (g.geometry?.elements?.length ?? 0) > 0);
  const hasLoadWithElements = goals.some(g => g.goalType === 'load' && (g.geometry?.elements?.length ?? 0) > 0);
  
  for (const goal of goals) {
    const elements = goal.geometry?.elements ?? [];
    
    if (goal.goalType === 'anchor') {
      if (elements.length > 0) {
        // Use specified vertices
        const pts = positionsFromElements(mesh, elements);
        const markerPositions = buildMarkerPositions(pts);
        if (markerPositions.length > 0) {
          markerPositions.forEach((position) => anchors.push({ position }));
        }
      } else if (!hasAnchorWithElements) {
        // Use default position: bottom-left corner
        anchors.push({
          position: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z }
        });
      }
    } else if (goal.goalType === 'load') {
      const force = extractForce(goal.parameters);
      
      if (elements.length > 0) {
        // Use specified vertices
        const pts = positionsFromElements(mesh, elements);
        const markerPositions = buildMarkerPositions(pts);
        if (markerPositions.length > 0) {
          const count = markerPositions.length;
          const scale = 1 / count;
          const perForce = { x: force.x * scale, y: force.y * scale, z: force.z * scale };
          markerPositions.forEach((position) => loads.push({ position, force: perForce }));
        }
      } else if (!hasLoadWithElements) {
        // Use default position: top-right corner
        loads.push({
          position: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z },
          force
        });
      }
    }
  }
  
  // If no goals at all, provide sensible defaults
  if (anchors.length === 0 && goals.some(g => g.goalType === 'anchor')) {
    anchors.push({
      position: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z }
    });
  }
  
  if (loads.length === 0 && goals.some(g => g.goalType === 'load')) {
    loads.push({
      position: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z },
      force: { x: 0, y: -100, z: 0 }
    });
  }
  
  return { anchors, loads };
}
