/**
 * Semantic operation definitions for string domain
 * 
 * This module defines semantic metadata for string operations
 * used throughout Lingua nodes.
 */

import type { SemanticOpMeta } from '../semanticOp';

export const STRING_OPS: readonly SemanticOpMeta[] = [
  {
    id: 'string.concat',
    domain: 'string',
    name: 'Concatenate',
    category: 'operator',
    tags: ['text', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Concatenates strings',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'string.split',
    domain: 'string',
    name: 'Split',
    category: 'utility',
    tags: ['text', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Splits string into array',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'string.replace',
    domain: 'string',
    name: 'Replace',
    category: 'utility',
    tags: ['text', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Replaces substring',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'string.substring',
    domain: 'string',
    name: 'Substring',
    category: 'utility',
    tags: ['text', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Extracts substring',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'string.length',
    domain: 'string',
    name: 'Length',
    category: 'analysis',
    tags: ['text', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Returns string length',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'string.toNumber',
    domain: 'string',
    name: 'To Number',
    category: 'utility',
    tags: ['text', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Converts string to number',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'string.format',
    domain: 'string',
    name: 'Format',
    category: 'utility',
    tags: ['text', 'formatting', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Formats string with values',
    stable: true,
    since: '1.0.0'
  }
] as const;
