/**
 * Semantic operation definitions for workflow domain
 * 
 * This module defines semantic metadata for workflow operations
 * used throughout Lingua nodes.
 */

import type { SemanticOpMeta } from '../semanticOp';

export const WORKFLOW_OPS: readonly SemanticOpMeta[] = [
  {
    id: 'workflow.literal',
    domain: 'workflow',
    name: 'Literal',
    category: 'primitive',
    tags: ['pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Returns a literal value',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'workflow.identity',
    domain: 'workflow',
    name: 'Identity',
    category: 'utility',
    tags: ['pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Passes through input unchanged',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'workflow.constant',
    domain: 'workflow',
    name: 'Constant',
    category: 'primitive',
    tags: ['pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Returns a constant value',
    stable: true,
    since: '1.0.0'
  }
] as const;
