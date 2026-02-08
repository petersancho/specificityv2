// ============================================================================
// TOPOLOGY OPTIMIZATION - SEMANTIC COORDINATE FRAMES
// ============================================================================

import type { Vec3, RenderMesh } from "../../../types";
import type { Bounds3D } from "../../../geometry/bounds";
import { distance } from "../../../math/vector";

export type Bounds = Bounds3D;

export type CoordinateFrame = 'world' | 'mesh' | 'grid';

export interface FramedPosition {
  position: Vec3;
  frame: CoordinateFrame;
}

export interface GridCoordinates {
  ix: number;
  iy: number;
  iz: number;
}

export interface DofMapping {
  dofToNode: Map<number, number>;
  dofToComponent: Map<number, number>;
  nodeToDofs: Map<number, number[]>;
}

export function computeStrictBounds(mesh: RenderMesh): Bounds | null {
  if (!mesh.positions || mesh.positions.length === 0) return null;
  
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = mesh.positions[i];
    const y = mesh.positions[i + 1];
    const z = mesh.positions[i + 2];
    
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      return null;
    }
    
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

export function boundsVolume(bounds: Bounds): number {
  return (bounds.max.x - bounds.min.x) *
         (bounds.max.y - bounds.min.y) *
         (bounds.max.z - bounds.min.z);
}

export function boundsSpan(bounds: Bounds): Vec3 {
  return {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z
  };
}

export function detectDimensionality(bounds: Bounds, eps: number = 1e-9): 1 | 2 | 3 {
  const span = boundsSpan(bounds);
  const dims = [span.x, span.y, span.z].filter(s => s > eps).length;
  return dims as 1 | 2 | 3;
}

export function worldToGrid(
  worldPos: Vec3,
  bounds: Bounds,
  nx: number,
  ny: number,
  nz: number
): GridCoordinates {
  const span = boundsSpan(bounds);
  const ix = Math.round((worldPos.x - bounds.min.x) / span.x * nx);
  const iy = Math.round((worldPos.y - bounds.min.y) / span.y * ny);
  const iz = nz > 1 ? Math.round((worldPos.z - bounds.min.z) / span.z * nz) : 0;
  
  return {
    ix: Math.max(0, Math.min(nx, ix)),
    iy: Math.max(0, Math.min(ny, iy)),
    iz: Math.max(0, Math.min(nz, iz))
  };
}

export function gridToWorld(
  grid: GridCoordinates,
  bounds: Bounds,
  nx: number,
  ny: number,
  nz: number
): Vec3 {
  const span = boundsSpan(bounds);
  return {
    x: bounds.min.x + (grid.ix / nx) * span.x,
    y: bounds.min.y + (grid.iy / ny) * span.y,
    z: bounds.min.z + (grid.iz / nz) * span.z
  };
}

export function gridToNodeIndex(
  grid: GridCoordinates,
  nx: number,
  ny: number
): number {
  return grid.iz * (nx + 1) * (ny + 1) + grid.iy * (nx + 1) + grid.ix;
}

export function nodeIndexToGrid(
  nodeIdx: number,
  nx: number,
  ny: number
): GridCoordinates {
  const nxy = (nx + 1) * (ny + 1);
  const iz = Math.floor(nodeIdx / nxy);
  const rem = nodeIdx % nxy;
  const iy = Math.floor(rem / (nx + 1));
  const ix = rem % (nx + 1);
  return { ix, iy, iz };
}

export function buildDofMapping(nx: number, ny: number, nz: number): DofMapping {
  const numNodes = (nx + 1) * (ny + 1) * (nz + 1);
  const dofToNode = new Map<number, number>();
  const dofToComponent = new Map<number, number>();
  const nodeToDofs = new Map<number, number[]>();
  
  for (let node = 0; node < numNodes; node++) {
    const dofs = [node * 3, node * 3 + 1, node * 3 + 2];
    nodeToDofs.set(node, dofs);
    
    for (let comp = 0; comp < 3; comp++) {
      const dof = node * 3 + comp;
      dofToNode.set(dof, node);
      dofToComponent.set(dof, comp);
    }
  }
  
  return { dofToNode, dofToComponent, nodeToDofs };
}

export function isWithinBounds(pos: Vec3, bounds: Bounds, tolerance: number = 0): boolean {
  return pos.x >= bounds.min.x - tolerance &&
         pos.x <= bounds.max.x + tolerance &&
         pos.y >= bounds.min.y - tolerance &&
         pos.y <= bounds.max.y + tolerance &&
         pos.z >= bounds.min.z - tolerance &&
         pos.z <= bounds.max.z + tolerance;
}
