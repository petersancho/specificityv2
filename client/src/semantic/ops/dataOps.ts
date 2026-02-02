/**
 * Semantic operation definitions for data domain
 * 
 * This module defines semantic metadata for data operations
 * used throughout Lingua nodes.
 */

import type { SemanticOpMeta } from '../semanticOp';

export const DATA_OPS: readonly SemanticOpMeta[] = [
  {
    id: 'data.collect',
    domain: 'data',
    name: 'Collect',
    category: 'aggregation',
    tags: ['array', 'collection', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Collects values into an array',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'data.flatten',
    domain: 'data',
    name: 'Flatten',
    category: 'utility',
    tags: ['array', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Flattens nested arrays',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'data.filter',
    domain: 'data',
    name: 'Filter',
    category: 'utility',
    tags: ['array', 'iteration', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Filters array elements',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'data.map',
    domain: 'data',
    name: 'Map',
    category: 'utility',
    tags: ['array', 'iteration', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Maps array elements',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'data.reduce',
    domain: 'data',
    name: 'Reduce',
    category: 'aggregation',
    tags: ['array', 'iteration', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Reduces array to single value',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'data.sort',
    domain: 'data',
    name: 'Sort',
    category: 'utility',
    tags: ['array', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Sorts array elements',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'data.unique',
    domain: 'data',
    name: 'Unique',
    category: 'utility',
    tags: ['array', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Removes duplicate elements',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'data.length',
    domain: 'data',
    name: 'Length',
    category: 'analysis',
    tags: ['array', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Returns array length',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'data.index',
    domain: 'data',
    name: 'Index',
    category: 'utility',
    tags: ['array', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Gets element at index',
    stable: true,
    since: '1.0.0'
  }
] as const;
