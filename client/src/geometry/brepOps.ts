/**
 * Semantically-defined B-Rep operations
 * 
 * This module wraps core B-Rep operations with semantic metadata
 * for the operation registry.
 */

import { defineOp, operationRegistry } from '../semantic';
import * as brepImpl from './brep';

export const brepFromMesh = defineOp(
  {
    id: 'brep.brepFromMesh',
    name: 'B-Rep From Mesh',
    category: 'tessellation',
    tags: ['brep', 'mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Converts a triangle mesh to B-Rep representation',
    stable: true,
    since: '1.0.0'
  },
  brepImpl.brepFromMesh
);
operationRegistry.register(brepFromMesh);

export const tessellateBRepToMesh = defineOp(
  {
    id: 'brep.tessellateBRepToMesh',
    name: 'Tessellate B-Rep To Mesh',
    category: 'tessellation',
    tags: ['brep', 'mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Tessellates a B-Rep to a triangle mesh',
    stable: true,
    since: '1.0.0'
  },
  brepImpl.tessellateBRepToMesh
);
operationRegistry.register(tessellateBRepToMesh);

// Re-export all other functions from brep.ts
export * from './brep';
