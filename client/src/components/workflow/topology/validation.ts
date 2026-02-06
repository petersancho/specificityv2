// ============================================================================
// TOPOLOGY OPTIMIZATION - INPUT VALIDATION & NORMALIZATION
// ============================================================================

import type { RenderMesh, Vec3 } from "../../../types";
import type { SimpParams, GoalMarkers } from "./types";
import type { ValidationIssue } from "./errors";
import { createIssue } from "./errors";
import {
  computeStrictBounds,
  boundsVolume,
  boundsSpan,
  detectDimensionality,
  worldToGrid,
  gridToNodeIndex,
  buildDofMapping,
  isWithinBounds,
  type Bounds
} from "./coordinateFrames";

export interface ValidationConfig {
  mode: 'strict' | 'permissive';
  tolerances: {
    geoEps: number;
    snapDist: number;
  };
  limits: {
    maxAspectRatio: number;
    minElements: number;
    minVolFrac: number;
    maxVolFrac: number;
  };
  policies: {
    missingLoad: 'error' | 'warn';
    missingSupport: 'error' | 'warn';
    loadOnFixedDof: 'error' | 'warn';
  };
}

export const DefaultValidationConfig: ValidationConfig = {
  mode: 'strict',
  tolerances: {
    geoEps: 1e-9,
    snapDist: 1e-6
  },
  limits: {
    maxAspectRatio: 1e4,
    minElements: 1,
    minVolFrac: 0.01,
    maxVolFrac: 0.99
  },
  policies: {
    missingLoad: 'error',
    missingSupport: 'error',
    loadOnFixedDof: 'error'
  }
};

export interface ValidatedProblem {
  mesh: RenderMesh;
  bounds: Bounds;
  markers: GoalMarkers;
  params: SimpParams;
  dimensionality: 1 | 2 | 3;
  fixedDofs: Set<number>;
  loadedDofs: Map<number, number>;
}

export function validateGeometry(
  mesh: RenderMesh,
  config: ValidationConfig
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  if (!mesh.positions || mesh.positions.length === 0) {
    issues.push(createIssue(
      'EMPTY_MESH',
      'error',
      'Mesh has no positions. Cannot perform topology optimization on empty geometry.'
    ));
    return issues;
  }
  
  const bounds = computeStrictBounds(mesh);
  if (!bounds) {
    issues.push(createIssue(
      'INVALID_PARAMETER',
      'error',
      'Mesh contains non-finite coordinates (NaN or Infinity).'
    ));
    return issues;
  }
  
  const volume = boundsVolume(bounds);
  if (volume < config.tolerances.geoEps) {
    const dim = detectDimensionality(bounds, config.tolerances.geoEps);
    issues.push(createIssue(
      'DEGENERATE_GEOMETRY',
      'error',
      `Geometry is degenerate (${dim}D in 3D space). Volume: ${volume.toExponential(2)}`,
      { bounds, volume, dimensionality: dim }
    ));
  }
  
  const span = boundsSpan(bounds);
  const maxSpan = Math.max(span.x, span.y, span.z);
  const minSpan = Math.min(
    span.x > config.tolerances.geoEps ? span.x : Infinity,
    span.y > config.tolerances.geoEps ? span.y : Infinity,
    span.z > config.tolerances.geoEps ? span.z : Infinity
  );
  
  if (minSpan !== Infinity && maxSpan / minSpan > config.limits.maxAspectRatio) {
    issues.push(createIssue(
      'RESOLUTION_MISMATCH',
      'warning',
      `Geometry has extreme aspect ratio: ${(maxSpan / minSpan).toFixed(1)}:1. Consider adjusting mesh resolution.`,
      { span, aspectRatio: maxSpan / minSpan }
    ));
  }
  
  return issues;
}

export function validateParameters(
  params: SimpParams,
  config: ValidationConfig
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  if (params.volFrac <= config.limits.minVolFrac || params.volFrac >= config.limits.maxVolFrac) {
    issues.push(createIssue(
      'INVALID_PARAMETER',
      'error',
      `Volume fraction must be in (${config.limits.minVolFrac}, ${config.limits.maxVolFrac}). Got: ${params.volFrac}`,
      { volFrac: params.volFrac }
    ));
  }
  
  if (params.nx < 1 || params.ny < 1 || params.nz < 1) {
    issues.push(createIssue(
      'INVALID_PARAMETER',
      'error',
      `Grid resolution must be positive. Got: nx=${params.nx}, ny=${params.ny}, nz=${params.nz}`
    ));
  }
  
  const numElems = params.nx * params.ny * params.nz;
  if (numElems < config.limits.minElements) {
    issues.push(createIssue(
      'INVALID_PARAMETER',
      'error',
      `Total elements (${numElems}) is below minimum (${config.limits.minElements})`
    ));
  }
  
  if (params.penal < 1 || params.penalStart < 1 || params.penalEnd < 1) {
    issues.push(createIssue(
      'INVALID_PARAMETER',
      'error',
      `Penalty exponent must be >= 1. Got: penal=${params.penal}, penalStart=${params.penalStart}, penalEnd=${params.penalEnd}`
    ));
  }
  
  if (params.E0 <= params.Emin) {
    issues.push(createIssue(
      'INVALID_PARAMETER',
      'error',
      `Solid stiffness (E0=${params.E0}) must be greater than void stiffness (Emin=${params.Emin})`
    ));
  }
  
  if (params.nu <= -1 || params.nu >= 0.5) {
    issues.push(createIssue(
      'INVALID_PARAMETER',
      'error',
      `Poisson's ratio must be in (-1, 0.5). Got: ${params.nu}`
    ));
  }
  
  if (params.rmin < 0) {
    issues.push(createIssue(
      'INVALID_PARAMETER',
      'error',
      `Filter radius must be non-negative. Got: ${params.rmin}`
    ));
  }
  
  if (params.move <= 0 || params.move > 1) {
    issues.push(createIssue(
      'INVALID_PARAMETER',
      'error',
      `Move limit must be in (0, 1]. Got: ${params.move}`
    ));
  }
  
  return issues;
}

export function validateBoundaryConditions(
  mesh: RenderMesh,
  bounds: Bounds,
  markers: GoalMarkers,
  params: SimpParams,
  config: ValidationConfig
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  if (markers.anchors.length === 0) {
    const severity = config.policies.missingSupport === 'error' ? 'error' : 'warning';
    issues.push(createIssue(
      'UNDER_CONSTRAINED',
      severity,
      'No anchor points specified. Structure may have rigid body modes.',
      { numAnchors: 0 }
    ));
  }
  
  if (markers.loads.length === 0) {
    const severity = config.policies.missingLoad === 'error' ? 'error' : 'warning';
    issues.push(createIssue(
      'ZERO_FORCES',
      severity,
      'No load points specified. Optimization requires external forces.',
      { numLoads: 0 }
    ));
  }
  
  for (const anchor of markers.anchors) {
    if (!isWithinBounds(anchor.position, bounds, config.tolerances.snapDist)) {
      issues.push(createIssue(
        'OUT_OF_BOUNDS',
        'warning',
        `Anchor at (${anchor.position.x.toFixed(3)}, ${anchor.position.y.toFixed(3)}, ${anchor.position.z.toFixed(3)}) is outside mesh bounds`,
        { position: anchor.position, bounds }
      ));
    }
  }
  
  for (const load of markers.loads) {
    if (!isWithinBounds(load.position, bounds, config.tolerances.snapDist)) {
      issues.push(createIssue(
        'OUT_OF_BOUNDS',
        'warning',
        `Load at (${load.position.x.toFixed(3)}, ${load.position.y.toFixed(3)}, ${load.position.z.toFixed(3)}) is outside mesh bounds`,
        { position: load.position, bounds }
      ));
    }
    
    const forceMag = Math.sqrt(load.force.x ** 2 + load.force.y ** 2 + load.force.z ** 2);
    if (forceMag < config.tolerances.geoEps) {
      issues.push(createIssue(
        'ZERO_FORCES',
        'warning',
        `Load has near-zero magnitude: ${forceMag.toExponential(2)}`,
        { position: load.position, force: load.force }
      ));
    }
  }
  
  const dofMapping = buildDofMapping(params.nx, params.ny, params.nz);
  const fixedDofs = new Set<number>();
  const loadedDofs = new Set<number>();
  const anchorNodes = new Map<number, Vec3>();
  const loadNodes = new Map<number, Vec3>();
  
  for (const anchor of markers.anchors) {
    const grid = worldToGrid(anchor.position, bounds, params.nx, params.ny, params.nz);
    const nodeIdx = gridToNodeIndex(grid, params.nx, params.ny);
    anchorNodes.set(nodeIdx, anchor.position);
    const dofs = dofMapping.nodeToDofs.get(nodeIdx);
    if (dofs) {
      dofs.forEach(dof => fixedDofs.add(dof));
    }
  }
  
  for (const load of markers.loads) {
    const grid = worldToGrid(load.position, bounds, params.nx, params.ny, params.nz);
    const nodeIdx = gridToNodeIndex(grid, params.nx, params.ny);
    loadNodes.set(nodeIdx, load.position);
    const dofs = dofMapping.nodeToDofs.get(nodeIdx);
    if (dofs) {
      dofs.forEach(dof => loadedDofs.add(dof));
    }
  }
  
  const conflicts: number[] = [];
  const conflictingNodes: number[] = [];
  for (const dof of fixedDofs) {
    if (loadedDofs.has(dof)) {
      conflicts.push(dof);
      const nodeIdx = dofMapping.dofToNode.get(dof);
      if (nodeIdx !== undefined && !conflictingNodes.includes(nodeIdx)) {
        conflictingNodes.push(nodeIdx);
      }
    }
  }
  
  if (conflicts.length > 0) {
    const severity = config.policies.loadOnFixedDof === 'error' ? 'error' : 'warning';
    const diagnostics: string[] = [];
    for (const nodeIdx of conflictingNodes.slice(0, 3)) {
      const anchorPos = anchorNodes.get(nodeIdx);
      const loadPos = loadNodes.get(nodeIdx);
      if (anchorPos && loadPos) {
        diagnostics.push(
          `Node ${nodeIdx}: anchor at (${anchorPos.x.toFixed(3)}, ${anchorPos.y.toFixed(3)}, ${anchorPos.z.toFixed(3)}), ` +
          `load at (${loadPos.x.toFixed(3)}, ${loadPos.y.toFixed(3)}, ${loadPos.z.toFixed(3)})`
        );
      } else if (anchorPos) {
        diagnostics.push(`Node ${nodeIdx}: anchor at (${anchorPos.x.toFixed(3)}, ${anchorPos.y.toFixed(3)}, ${anchorPos.z.toFixed(3)})`);
      } else if (loadPos) {
        diagnostics.push(`Node ${nodeIdx}: load at (${loadPos.x.toFixed(3)}, ${loadPos.y.toFixed(3)}, ${loadPos.z.toFixed(3)})`);
      }
    }
    const message = `${conflicts.length} DOF(s) are both fixed and loaded. This creates inconsistent boundary conditions.\n` +
      `Conflicting nodes: ${conflictingNodes.length}\n` +
      (diagnostics.length > 0 ? `Details:\n${diagnostics.join('\n')}` : '') +
      `\nSuggestion: Increase grid resolution (nx/ny/nz) or adjust goal regions to avoid overlap.`;
    issues.push(createIssue(
      'BC_CONFLICT',
      severity,
      message,
      { conflicts: conflicts.slice(0, 10), conflictingNodes, diagnostics }
    ));
  }
  
  const dimensionality = detectDimensionality(bounds, config.tolerances.geoEps);
  const requiredDofs = dimensionality === 3 ? 6 : 3;
  
  if (fixedDofs.size < requiredDofs) {
    issues.push(createIssue(
      'UNDER_CONSTRAINED',
      'warning',
      `Only ${fixedDofs.size} DOFs constrained. ${dimensionality}D problems typically need at least ${requiredDofs} to prevent rigid body motion.`,
      { fixedDofs: fixedDofs.size, required: requiredDofs, dimensionality }
    ));
  }
  
  return issues;
}

export function validateProblem(
  mesh: RenderMesh,
  markers: GoalMarkers,
  params: SimpParams,
  config: ValidationConfig = DefaultValidationConfig
): { issues: ValidationIssue[]; validated?: ValidatedProblem } {
  const issues: ValidationIssue[] = [];
  
  issues.push(...validateGeometry(mesh, config));
  if (issues.some(i => i.severity === 'error')) {
    return { issues };
  }
  
  const bounds = computeStrictBounds(mesh)!;
  
  issues.push(...validateParameters(params, config));
  if (issues.some(i => i.severity === 'error')) {
    return { issues };
  }
  
  issues.push(...validateBoundaryConditions(mesh, bounds, markers, params, config));
  
  if (config.mode === 'strict' && issues.some(i => i.severity === 'error')) {
    return { issues };
  }
  
  const dimensionality = detectDimensionality(bounds, config.tolerances.geoEps);
  const dofMapping = buildDofMapping(params.nx, params.ny, params.nz);
  
  const fixedDofs = new Set<number>();
  for (const anchor of markers.anchors) {
    const grid = worldToGrid(anchor.position, bounds, params.nx, params.ny, params.nz);
    const nodeIdx = gridToNodeIndex(grid, params.nx, params.ny);
    const dofs = dofMapping.nodeToDofs.get(nodeIdx);
    if (dofs) {
      dofs.forEach(dof => fixedDofs.add(dof));
    }
  }
  
  const loadedDofs = new Map<number, number>();
  const loadCountPerNode = new Map<number, number>();
  for (const load of markers.loads) {
    const grid = worldToGrid(load.position, bounds, params.nx, params.ny, params.nz);
    const nodeIdx = gridToNodeIndex(grid, params.nx, params.ny);
    const dofs = dofMapping.nodeToDofs.get(nodeIdx);
    if (dofs) {
      loadedDofs.set(dofs[0], (loadedDofs.get(dofs[0]) || 0) + load.force.x);
      loadedDofs.set(dofs[1], (loadedDofs.get(dofs[1]) || 0) + load.force.y);
      loadedDofs.set(dofs[2], (loadedDofs.get(dofs[2]) || 0) + load.force.z);
      loadCountPerNode.set(nodeIdx, (loadCountPerNode.get(nodeIdx) || 0) + 1);
    }
  }
  
  const multiLoadNodes = Array.from(loadCountPerNode.entries()).filter(([_, count]) => count > 1);
  if (multiLoadNodes.length > 0) {
    console.warn(`[VALIDATION] ${multiLoadNodes.length} grid nodes have multiple loads (forces accumulated):`, 
      multiLoadNodes.map(([nodeIdx, count]) => `node ${nodeIdx}: ${count} loads`).join(', '));
  }
  
  return {
    issues,
    validated: {
      mesh,
      bounds,
      markers,
      params,
      dimensionality,
      fixedDofs,
      loadedDofs
    }
  };
}
