/**
 * Semantic operation definitions for logic domain
 * 
 * This module defines semantic metadata for logic operations
 * used throughout Lingua nodes.
 */

import type { SemanticOpMeta } from '../semanticOp';

export const LOGIC_OPS: readonly SemanticOpMeta[] = [
  {
    id: 'logic.and',
    domain: 'logic',
    name: 'And',
    category: 'operator',
    tags: ['boolean', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Logical AND operation',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'logic.or',
    domain: 'logic',
    name: 'Or',
    category: 'operator',
    tags: ['boolean', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Logical OR operation',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'logic.not',
    domain: 'logic',
    name: 'Not',
    category: 'operator',
    tags: ['boolean', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Logical NOT operation',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'logic.xor',
    domain: 'logic',
    name: 'Xor',
    category: 'operator',
    tags: ['boolean', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Logical XOR operation',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'logic.if',
    domain: 'logic',
    name: 'If',
    category: 'control',
    tags: ['conditional', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Conditional branching',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'logic.compare',
    domain: 'logic',
    name: 'Compare',
    category: 'operator',
    tags: ['comparison', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Compares two values',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'logic.toggle',
    domain: 'logic',
    name: 'Toggle',
    category: 'control',
    tags: ['boolean', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Toggles between two values based on a boolean',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'logic.conditionalToggle',
    domain: 'logic',
    name: 'Conditional Toggle',
    category: 'control',
    tags: ['boolean', 'conditional', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Toggles between values based on a condition',
    stable: true,
    since: '1.0.0'
  }
] as const;
