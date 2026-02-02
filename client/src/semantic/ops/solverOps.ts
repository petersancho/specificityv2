/**
 * Semantic operation definitions for solver domain
 * 
 * This module defines semantic metadata for solver operations
 * used throughout Lingua nodes.
 */

import type { SemanticOpMeta } from '../semanticOp';

export const SOLVER_OPS: readonly SemanticOpMeta[] = [
  {
    id: 'solver.physics',
    domain: 'solver',
    name: 'Physics Solver',
    category: 'utility',
    tags: ['3d'],
    complexity: 'O(1)',
    cost: 'high',
    pure: false,
    deterministic: true,
    summary: 'Solves physics simulation',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'solver.chemistry',
    domain: 'solver',
    name: 'Chemistry Solver',
    category: 'utility',
    tags: ['3d'],
    complexity: 'O(1)',
    cost: 'high',
    pure: false,
    deterministic: false,
    summary: 'Solves chemistry simulation',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'solver.biological',
    domain: 'solver',
    name: 'Biological Solver',
    category: 'utility',
    tags: ['3d'],
    complexity: 'O(1)',
    cost: 'high',
    pure: false,
    deterministic: false,
    summary: 'Solves biological simulation',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'solver.voxel',
    domain: 'solver',
    name: 'Voxel Solver',
    category: 'utility',
    tags: ['3d'],
    complexity: 'O(1)',
    cost: 'high',
    pure: true,
    deterministic: true,
    summary: 'Converts geometry to voxels',
    stable: true,
    since: '1.0.0'
  }
] as const;
