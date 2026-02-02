/**
 * Semantically-defined math operations
 * 
 * This module wraps core math operations with semantic metadata
 * for the operation registry.
 */

import { defineOp, operationRegistry } from '../semantic';
import * as mathImpl from './math';

export const computeBestFitPlane = defineOp(
  {
    id: 'math.computeBestFitPlane',
    domain: 'geometry',
    name: 'Compute Best Fit Plane',
    category: 'analysis',
    tags: ['math', '3d'],
    complexity: 'O(n)',
    summary: 'Computes the best-fit plane from a set of 3D points using PCA',
    stable: true,
    since: '1.0.0'
  },
  mathImpl.computeBestFitPlane
);
operationRegistry.register(computeBestFitPlane);

export const projectPointToPlane = defineOp(
  {
    id: 'math.projectPointToPlane',
    domain: 'geometry',
    name: 'Project Point To Plane',
    category: 'transform',
    tags: ['math', '3d'],
    complexity: 'O(1)',
    summary: 'Projects a 3D point onto a plane, returning 2D coordinates',
    stable: true,
    since: '1.0.0'
  },
  mathImpl.projectPointToPlane
);
operationRegistry.register(projectPointToPlane);

export const unprojectPointFromPlane = defineOp(
  {
    id: 'math.unprojectPointFromPlane',
    domain: 'geometry',
    name: 'Unproject Point From Plane',
    category: 'transform',
    tags: ['math', '3d'],
    complexity: 'O(1)',
    summary: 'Converts 2D plane coordinates back to 3D world space',
    stable: true,
    since: '1.0.0'
  },
  mathImpl.unprojectPointFromPlane
);
operationRegistry.register(unprojectPointFromPlane);

// Re-export all other functions from math.ts
export * from './math';
