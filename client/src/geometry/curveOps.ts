/**
 * Semantically-defined curve operations
 * 
 * This module wraps core curve operations with semantic metadata
 * for the operation registry.
 */

import { defineOp, operationRegistry } from '../semantic';
import * as curveImpl from './curves';

export const resampleByArcLength = defineOp(
  {
    id: 'curve.resampleByArcLength',
    name: 'Resample By Arc Length',
    category: 'modifier',
    tags: ['curve', 'polyline', '3d'],
    complexity: 'O(n)',
    summary: 'Resamples a polyline to have evenly-spaced points by arc length',
    stable: true,
    since: '1.0.0'
  },
  curveImpl.resampleByArcLength
);
operationRegistry.register(resampleByArcLength);

// Re-export all other functions from curves.ts
export * from './curves';
