/**
 * Semantically-defined tessellation operations
 * 
 * This module wraps core tessellation operations with semantic metadata
 * for the operation registry.
 */

import { defineOp, operationRegistry } from '../semantic';
import * as tessImpl from './tessellation';

export const tessellateCurveAdaptive = defineOp(
  {
    id: 'tess.tessellateCurveAdaptive',
    name: 'Tessellate Curve Adaptive',
    category: 'tessellation',
    tags: ['nurbs', 'curve', '3d'],
    complexity: 'varies',
    summary: 'Adaptively tessellates a NURBS curve based on curvature',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.tessellateCurveAdaptive
);
operationRegistry.register(tessellateCurveAdaptive);

export const tessellateSurfaceAdaptive = defineOp(
  {
    id: 'tess.tessellateSurfaceAdaptive',
    name: 'Tessellate Surface Adaptive',
    category: 'tessellation',
    tags: ['nurbs', 'surface', '3d'],
    complexity: 'varies',
    summary: 'Adaptively tessellates a NURBS surface based on curvature',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.tessellateSurfaceAdaptive
);
operationRegistry.register(tessellateSurfaceAdaptive);

// Re-export all other functions from tessellation.ts
export * from './tessellation';
