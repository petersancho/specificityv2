/**
 * Semantic operation definitions for vector domain
 * 
 * This module defines semantic metadata for vector operations
 * used throughout Lingua nodes.
 */

import type { SemanticOpMeta } from '../semanticOp';

export const VECTOR_OPS: readonly SemanticOpMeta[] = [
  {
    id: 'vector.add',
    domain: 'vector',
    name: 'Vector Add',
    category: 'operator',
    tags: ['vector3', 'arithmetic', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Adds two vectors',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'vector.subtract',
    domain: 'vector',
    name: 'Vector Subtract',
    category: 'operator',
    tags: ['vector3', 'arithmetic', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Subtracts one vector from another',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'vector.multiply',
    domain: 'vector',
    name: 'Vector Multiply',
    category: 'operator',
    tags: ['vector3', 'arithmetic', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Multiplies a vector by a scalar',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'vector.divide',
    domain: 'vector',
    name: 'Vector Divide',
    category: 'operator',
    tags: ['vector3', 'arithmetic', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Divides a vector by a scalar',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'vector.dot',
    domain: 'vector',
    name: 'Dot Product',
    category: 'operator',
    tags: ['vector3', 'arithmetic', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Computes the dot product of two vectors',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'vector.cross',
    domain: 'vector',
    name: 'Cross Product',
    category: 'operator',
    tags: ['vector3', 'arithmetic', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Computes the cross product of two vectors',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'vector.normalize',
    domain: 'vector',
    name: 'Normalize',
    category: 'utility',
    tags: ['vector3', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Normalizes a vector to unit length',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'vector.length',
    domain: 'vector',
    name: 'Length',
    category: 'analysis',
    tags: ['vector3', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Computes the length of a vector',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'vector.distance',
    domain: 'vector',
    name: 'Distance',
    category: 'analysis',
    tags: ['vector3', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Computes the distance between two points',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'vector.lerp',
    domain: 'vector',
    name: 'Vector Lerp',
    category: 'utility',
    tags: ['vector3', 'arithmetic', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Linearly interpolates between two vectors',
    stable: true,
    since: '1.0.0'
  }
] as const;
