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
import {
  distributeVerticesToGridNodes,
  validateDistributedNodes,
  DefaultAnchorDistribution,
  DefaultLoadDistribution,
  type BCDistributionConfig
} from "./bcMapping";

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
  bc: {
    anchorDistribution: BCDistributionConfig;
    loadDistribution: BCDistributionConfig;
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
  },
  bc: {
    anchorDistribution: DefaultAnchorDistribution,
    loadDistribution: DefaultLoadDistribution,
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
  
  // UPDATED: Use distributed boundary conditions instead of point BCs
  for (const anchor of markers.anchors) {
    // Distribute anchor region to multiple grid nodes
    const dist = anchor.distributed ?? distributeVerticesToGridNodes(
      mesh,
      anchor.vertices,
      bounds,
      params.nx,
      params.ny,
      params.nz,
      config.bc.anchorDistribution
    );
    
    // Validate distribution
    const validation = validateDistributedNodes(dist, config.bc.anchorDistribution.minNodes);
    if (!validation.isValid) {
      issues.push(createIssue(
        'BC_DISTRIBUTION_FAILED',
        'warning',
        `Anchor distribution validation failed: ${validation.errors.join(', ')}`,
        { errors: validation.errors }
      ));
    }
    
    // Apply constraints to all distributed nodes
    const dofMask = anchor.dofMask ?? [true, true, true];
    for (const nodeIdx of dist.nodeIds) {
      anchorNodes.set(nodeIdx, anchor.position);
      const dofs = dofMapping.nodeToDofs.get(nodeIdx);
      if (dofs) {
        if (dofMask[0]) fixedDofs.add(dofs[0]);
        if (dofMask[1]) fixedDofs.add(dofs[1]);
        if (dofMask[2]) fixedDofs.add(dofs[2]);
      }
    }
  }
  
  // UPDATED: Distribute loads across multiple grid nodes
  // CRITICAL: Exclude nodes that are already anchored (anchors take precedence)
  const anchorNodeSet = new Set(anchorNodes.keys());
  
  for (const load of markers.loads) {
    // Distribute load region to multiple grid nodes
    const dist = load.distributed ?? distributeVerticesToGridNodes(
      mesh,
      load.vertices,
      bounds,
      params.nx,
      params.ny,
      params.nz,
      config.bc.loadDistribution
    );
    
    // Validate distribution
    const validation = validateDistributedNodes(dist, config.bc.loadDistribution.minNodes);
    if (!validation.isValid) {
      issues.push(createIssue(
        'BC_DISTRIBUTION_FAILED',
        'warning',
        `Load distribution validation failed: ${validation.errors.join(', ')}`,
        { errors: validation.errors }
      ));
    }
    
    // Mark all loaded nodes (for conflict detection)
    // CRITICAL: Skip nodes that are already anchored
    let skippedNodes = 0;
    for (let i = 0; i < dist.nodeIds.length; i++) {
      const nodeIdx = dist.nodeIds[i];
      
      // Skip if node is already anchored (anchors take precedence)
      if (anchorNodeSet.has(nodeIdx)) {
        skippedNodes++;
        continue;
      }
      
      loadNodes.set(nodeIdx, load.position);
      const dofs = dofMapping.nodeToDofs.get(nodeIdx);
      if (dofs) {
        dofs.forEach(dof => loadedDofs.add(dof));
      }
    }
    
    if (skippedNodes > 0) {
      console.log(`[BC MAPPING] Skipped ${skippedNodes} load nodes that overlap with anchors (anchors take precedence)`);
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
  
  // UPDATED: Use distributed boundary conditions
  const fixedDofs = new Set<number>();
  const anchorNodeSet = new Set<number>();
  let totalAnchorNodes = 0;
  
  for (const anchor of markers.anchors) {
    // Distribute anchor region to multiple grid nodes
    const dist = anchor.distributed ?? distributeVerticesToGridNodes(
      mesh,
      anchor.vertices,
      bounds,
      params.nx,
      params.ny,
      params.nz,
      config.bc.anchorDistribution
    );
    
    // Apply constraints to all distributed nodes
    const dofMask = anchor.dofMask ?? [true, true, true];
    for (const nodeIdx of dist.nodeIds) {
      anchorNodeSet.add(nodeIdx);
      const dofs = dofMapping.nodeToDofs.get(nodeIdx);
      if (dofs) {
        if (dofMask[0]) fixedDofs.add(dofs[0]);
        if (dofMask[1]) fixedDofs.add(dofs[1]);
        if (dofMask[2]) fixedDofs.add(dofs[2]);
      }
    }
    totalAnchorNodes += dist.nodeIds.length;
  }
  
  console.log(`[VALIDATION] Distributed ${markers.anchors.length} anchor(s) → ${totalAnchorNodes} grid nodes → ${fixedDofs.size} fixed DOFs`);
  
  // UPDATED: Distribute loads across multiple grid nodes with weights
  // CRITICAL: Skip nodes that are already anchored (anchors take precedence)
  const loadedDofs = new Map<number, number>();
  let totalLoadNodes = 0;
  let totalSkippedNodes = 0;
  
  for (const load of markers.loads) {
    // Distribute load region to multiple grid nodes
    const dist = load.distributed ?? distributeVerticesToGridNodes(
      mesh,
      load.vertices,
      bounds,
      params.nx,
      params.ny,
      params.nz,
      config.bc.loadDistribution
    );
    
    // Distribute total force across nodes using weights
    // sum(weights) = 1.0, so sum(f_i) = F_total
    // CRITICAL: Skip nodes that are already anchored
    let activeWeight = 0;
    const activeNodes: Array<{ nodeIdx: number; weight: number }> = [];
    
    for (let i = 0; i < dist.nodeIds.length; i++) {
      const nodeIdx = dist.nodeIds[i];
      
      // Skip if node is already anchored (anchors take precedence)
      if (anchorNodeSet.has(nodeIdx)) {
        totalSkippedNodes++;
        continue;
      }
      
      const weight = dist.weights[i];
      activeNodes.push({ nodeIdx, weight });
      activeWeight += weight;
    }
    
    // Renormalize weights for active nodes only
    if (activeWeight > 1e-12) {
      for (const { nodeIdx, weight } of activeNodes) {
        const normalizedWeight = weight / activeWeight;
        const dofs = dofMapping.nodeToDofs.get(nodeIdx);
        if (dofs) {
          loadedDofs.set(dofs[0], (loadedDofs.get(dofs[0]) || 0) + normalizedWeight * load.force.x);
          loadedDofs.set(dofs[1], (loadedDofs.get(dofs[1]) || 0) + normalizedWeight * load.force.y);
          loadedDofs.set(dofs[2], (loadedDofs.get(dofs[2]) || 0) + normalizedWeight * load.force.z);
        }
      }
      totalLoadNodes += activeNodes.length;
    } else {
      console.warn(`[VALIDATION] Load region has no active nodes (all overlap with anchors)`);
    }
  }
  
  if (totalSkippedNodes > 0) {
    console.log(`[VALIDATION] Skipped ${totalSkippedNodes} load nodes that overlap with anchors (anchors take precedence)`);
  }
  
  // Verify total force is preserved
  let totalFx = 0, totalFy = 0, totalFz = 0;
  for (const [dof, force] of loadedDofs.entries()) {
    const axis = dof % 3;
    if (axis === 0) totalFx += force;
    else if (axis === 1) totalFy += force;
    else totalFz += force;
  }
  
  const expectedFx = markers.loads.reduce((sum, l) => sum + l.force.x, 0);
  const expectedFy = markers.loads.reduce((sum, l) => sum + l.force.y, 0);
  const expectedFz = markers.loads.reduce((sum, l) => sum + l.force.z, 0);
  
  console.log(`[VALIDATION] Distributed ${markers.loads.length} load(s) → ${totalLoadNodes} grid nodes`);
  console.log(`[VALIDATION] Total force: (${totalFx.toFixed(4)}, ${totalFy.toFixed(4)}, ${totalFz.toFixed(4)}) expected: (${expectedFx.toFixed(4)}, ${expectedFy.toFixed(4)}, ${expectedFz.toFixed(4)})`);
  
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
