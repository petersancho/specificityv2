/**
 * Semantically-defined boolean operations
 * 
 * This module wraps core boolean operations with semantic metadata
 * for the operation registry.
 */

import { defineOp, operationRegistry } from '../semantic';
import * as boolImpl from './booleans';

export const offsetPolyline2D = defineOp(
  {
    id: 'boolean.offsetPolyline2D',
    name: 'Offset Polyline 2D',
    category: 'modifier',
    tags: ['polyline', '2d'],
    complexity: 'O(n)',
    summary: 'Offsets a 2D polyline by a specified distance',
    stable: true,
    since: '1.0.0'
  },
  boolImpl.offsetPolyline2D
);
operationRegistry.register(offsetPolyline2D);

// Re-export all other functions from booleans.ts
export * from './booleans';
