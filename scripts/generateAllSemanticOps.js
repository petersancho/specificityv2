/**
 * Script to generate semantic operation definitions for all domains
 * and update all nodes in nodeRegistry.ts with semanticOps arrays
 */

const fs = require('fs');
const path = require('path');

// Define all semantic operations for each domain
const VECTOR_OPS = [
  { id: 'vector.add', name: 'Vector Add', category: 'operator', tags: ['vector3', 'arithmetic', 'pure', 'deterministic'], summary: 'Adds two vectors' },
  { id: 'vector.subtract', name: 'Vector Subtract', category: 'operator', tags: ['vector3', 'arithmetic', 'pure', 'deterministic'], summary: 'Subtracts one vector from another' },
  { id: 'vector.multiply', name: 'Vector Multiply', category: 'operator', tags: ['vector3', 'arithmetic', 'pure', 'deterministic'], summary: 'Multiplies a vector by a scalar' },
  { id: 'vector.divide', name: 'Vector Divide', category: 'operator', tags: ['vector3', 'arithmetic', 'pure', 'deterministic'], summary: 'Divides a vector by a scalar' },
  { id: 'vector.dot', name: 'Dot Product', category: 'operator', tags: ['vector3', 'arithmetic', 'pure', 'deterministic'], summary: 'Computes the dot product of two vectors' },
  { id: 'vector.cross', name: 'Cross Product', category: 'operator', tags: ['vector3', 'arithmetic', 'pure', 'deterministic'], summary: 'Computes the cross product of two vectors' },
  { id: 'vector.normalize', name: 'Normalize', category: 'utility', tags: ['vector3', 'pure', 'deterministic'], summary: 'Normalizes a vector to unit length' },
  { id: 'vector.length', name: 'Length', category: 'analysis', tags: ['vector3', 'pure', 'deterministic'], summary: 'Computes the length of a vector' },
  { id: 'vector.distance', name: 'Distance', category: 'analysis', tags: ['vector3', 'pure', 'deterministic'], summary: 'Computes the distance between two points' },
  { id: 'vector.lerp', name: 'Vector Lerp', category: 'utility', tags: ['vector3', 'arithmetic', 'pure', 'deterministic'], summary: 'Linearly interpolates between two vectors' },
];

const LOGIC_OPS = [
  { id: 'logic.and', name: 'And', category: 'operator', tags: ['boolean', 'pure', 'deterministic'], summary: 'Logical AND operation' },
  { id: 'logic.or', name: 'Or', category: 'operator', tags: ['boolean', 'pure', 'deterministic'], summary: 'Logical OR operation' },
  { id: 'logic.not', name: 'Not', category: 'operator', tags: ['boolean', 'pure', 'deterministic'], summary: 'Logical NOT operation' },
  { id: 'logic.xor', name: 'Xor', category: 'operator', tags: ['boolean', 'pure', 'deterministic'], summary: 'Logical XOR operation' },
  { id: 'logic.if', name: 'If', category: 'control', tags: ['conditional', 'pure', 'deterministic'], summary: 'Conditional branching' },
  { id: 'logic.compare', name: 'Compare', category: 'operator', tags: ['comparison', 'pure', 'deterministic'], summary: 'Compares two values' },
];

const DATA_OPS = [
  { id: 'data.collect', name: 'Collect', category: 'aggregation', tags: ['array', 'collection', 'pure', 'deterministic'], summary: 'Collects values into an array' },
  { id: 'data.flatten', name: 'Flatten', category: 'utility', tags: ['array', 'pure', 'deterministic'], summary: 'Flattens nested arrays' },
  { id: 'data.filter', name: 'Filter', category: 'utility', tags: ['array', 'iteration', 'pure', 'deterministic'], summary: 'Filters array elements' },
  { id: 'data.map', name: 'Map', category: 'utility', tags: ['array', 'iteration', 'pure', 'deterministic'], summary: 'Maps array elements' },
  { id: 'data.reduce', name: 'Reduce', category: 'aggregation', tags: ['array', 'iteration', 'pure', 'deterministic'], summary: 'Reduces array to single value' },
  { id: 'data.sort', name: 'Sort', category: 'utility', tags: ['array', 'pure', 'deterministic'], summary: 'Sorts array elements' },
  { id: 'data.unique', name: 'Unique', category: 'utility', tags: ['array', 'pure', 'deterministic'], summary: 'Removes duplicate elements' },
  { id: 'data.length', name: 'Length', category: 'analysis', tags: ['array', 'pure', 'deterministic'], summary: 'Returns array length' },
  { id: 'data.index', name: 'Index', category: 'utility', tags: ['array', 'pure', 'deterministic'], summary: 'Gets element at index' },
];

const STRING_OPS = [
  { id: 'string.concat', name: 'Concatenate', category: 'operator', tags: ['text', 'pure', 'deterministic'], summary: 'Concatenates strings' },
  { id: 'string.split', name: 'Split', category: 'utility', tags: ['text', 'pure', 'deterministic'], summary: 'Splits string into array' },
  { id: 'string.replace', name: 'Replace', category: 'utility', tags: ['text', 'pure', 'deterministic'], summary: 'Replaces substring' },
  { id: 'string.substring', name: 'Substring', category: 'utility', tags: ['text', 'pure', 'deterministic'], summary: 'Extracts substring' },
  { id: 'string.length', name: 'Length', category: 'analysis', tags: ['text', 'pure', 'deterministic'], summary: 'Returns string length' },
  { id: 'string.toNumber', name: 'To Number', category: 'utility', tags: ['text', 'pure', 'deterministic'], summary: 'Converts string to number' },
  { id: 'string.format', name: 'Format', category: 'utility', tags: ['text', 'formatting', 'pure', 'deterministic'], summary: 'Formats string with values' },
];

const COLOR_OPS = [
  { id: 'color.hexToRgb', name: 'Hex to RGB', category: 'utility', tags: ['colorspace', 'pure', 'deterministic'], summary: 'Converts hex color to RGB' },
  { id: 'color.rgbToHex', name: 'RGB to Hex', category: 'utility', tags: ['colorspace', 'pure', 'deterministic'], summary: 'Converts RGB color to hex' },
  { id: 'color.rgbToHsl', name: 'RGB to HSL', category: 'utility', tags: ['colorspace', 'pure', 'deterministic'], summary: 'Converts RGB to HSL' },
  { id: 'color.hslToRgb', name: 'HSL to RGB', category: 'utility', tags: ['colorspace', 'pure', 'deterministic'], summary: 'Converts HSL to RGB' },
  { id: 'color.blend', name: 'Blend', category: 'operator', tags: ['blending', 'pure', 'deterministic'], summary: 'Blends two colors' },
  { id: 'color.clamp', name: 'Clamp', category: 'utility', tags: ['pure', 'deterministic'], summary: 'Clamps color values to valid range' },
];

const WORKFLOW_OPS = [
  { id: 'workflow.literal', name: 'Literal', category: 'primitive', tags: ['pure', 'deterministic'], summary: 'Returns a literal value' },
  { id: 'workflow.identity', name: 'Identity', category: 'utility', tags: ['pure', 'deterministic'], summary: 'Passes through input unchanged' },
  { id: 'workflow.constant', name: 'Constant', category: 'primitive', tags: ['pure', 'deterministic'], summary: 'Returns a constant value' },
];

const SOLVER_OPS = [
  { id: 'solver.physics', name: 'Physics Solver', category: 'utility', tags: ['3d'], summary: 'Solves physics simulation', cost: 'high', pure: false, deterministic: true },
  { id: 'solver.chemistry', name: 'Chemistry Solver', category: 'utility', tags: ['3d'], summary: 'Solves chemistry simulation', cost: 'high', pure: false, deterministic: false },
  { id: 'solver.evolutionary', name: 'Evolutionary Solver', category: 'utility', tags: ['3d'], summary: 'Solves evolutionary optimization', cost: 'high', pure: false, deterministic: false },
  { id: 'solver.voxel', name: 'Voxel Solver', category: 'utility', tags: ['3d'], summary: 'Converts geometry to voxels', cost: 'high', pure: true, deterministic: true },
  { id: 'solver.topologyOptimization', name: 'Topology Optimization Solver', category: 'utility', tags: ['3d'], summary: 'Optimizes structural topology', cost: 'high', pure: true, deterministic: true },
];

// Generate semantic op file for a domain
function generateOpFile(domain, ops) {
  const domainCapitalized = domain.charAt(0).toUpperCase() + domain.slice(1);
  const content = `/**
 * Semantic operation definitions for ${domain} domain
 * 
 * This module defines semantic metadata for ${domain} operations
 * used throughout Lingua nodes.
 */

import type { SemanticOpMeta } from '../semanticOp';

export const ${domain.toUpperCase()}_OPS: readonly SemanticOpMeta[] = [
${ops.map(op => `  {
    id: '${op.id}',
    domain: '${domain}',
    name: '${op.name}',
    category: '${op.category}',
    tags: [${op.tags.map(t => `'${t}'`).join(', ')}],
    complexity: 'O(1)',
    cost: '${op.cost || 'low'}',
    pure: ${op.pure !== false},
    deterministic: ${op.deterministic !== false},${op.sideEffects ? `\n    sideEffects: [${op.sideEffects.map(s => `'${s}'`).join(', ')}],` : ''}
    summary: '${op.summary}',
    stable: true,
    since: '1.0.0'
  }`).join(',\n')}
] as const;
`;
  
  const filePath = path.join(__dirname, '..', 'client', 'src', 'semantic', 'ops', `${domain}Ops.ts`);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ Generated ${domain}Ops.ts (${ops.length} operations)`);
}

// Generate all op files
console.log('\n📝 Generating semantic operation files...\n');
generateOpFile('vector', VECTOR_OPS);
generateOpFile('logic', LOGIC_OPS);
generateOpFile('data', DATA_OPS);
generateOpFile('string', STRING_OPS);
generateOpFile('color', COLOR_OPS);
generateOpFile('workflow', WORKFLOW_OPS);
generateOpFile('solver', SOLVER_OPS);

console.log('\n✅ All semantic operation files generated!\n');

// Generate index file for ops
const opsIndexContent = `/**
 * Semantic operation definitions for all domains
 */

export * from './mathOps';
export * from './vectorOps';
export * from './logicOps';
export * from './dataOps';
export * from './stringOps';
export * from './colorOps';
export * from './workflowOps';
export * from './solverOps';
`;

const opsIndexPath = path.join(__dirname, '..', 'client', 'src', 'semantic', 'ops', 'index.ts');
fs.writeFileSync(opsIndexPath, opsIndexContent, 'utf8');
console.log('✓ Generated ops/index.ts\n');

console.log('✅ Semantic operation generation complete!\n');
console.log('Next steps:');
console.log('1. Update semanticOpIds.ts to include new operation IDs');
console.log('2. Update nodeRegistry.ts to add semanticOps to all nodes');
console.log('3. Run validation: npx tsx scripts/validateSemanticLinkage.ts\n');
