/**
 * Semantic operation definitions for color domain
 * 
 * This module defines semantic metadata for color operations
 * used throughout Lingua nodes.
 */

import type { SemanticOpMeta } from '../semanticOp';

export const COLOR_OPS: readonly SemanticOpMeta[] = [
  {
    id: 'color.hexToRgb',
    domain: 'color',
    name: 'Hex to RGB',
    category: 'utility',
    tags: ['colorspace', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Converts hex color to RGB',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'color.rgbToHex',
    domain: 'color',
    name: 'RGB to Hex',
    category: 'utility',
    tags: ['colorspace', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Converts RGB color to hex',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'color.rgbToHsl',
    domain: 'color',
    name: 'RGB to HSL',
    category: 'utility',
    tags: ['colorspace', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Converts RGB to HSL',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'color.hslToRgb',
    domain: 'color',
    name: 'HSL to RGB',
    category: 'utility',
    tags: ['colorspace', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Converts HSL to RGB',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'color.blend',
    domain: 'color',
    name: 'Blend',
    category: 'operator',
    tags: ['blending', 'pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Blends two colors',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'color.clamp',
    domain: 'color',
    name: 'Clamp',
    category: 'utility',
    tags: ['pure', 'deterministic'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    summary: 'Clamps color values to valid range',
    stable: true,
    since: '1.0.0'
  }
] as const;
