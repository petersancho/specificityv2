/**
 * Script to add semanticOps arrays to all nodes in nodeRegistry.ts
 * 
 * This script analyzes each node's compute function and determines which
 * semantic operations it uses, then adds the appropriate semanticOps array.
 */

const fs = require('fs');
const path = require('path');

// Mapping of node types to their semantic operations
const NODE_SEMANTIC_OPS = {
  // Math nodes
  'add': ['math.add'],
  'subtract': ['math.subtract'],
  'multiply': ['math.multiply'],
  'divide': ['math.divide'],
  'modulo': ['math.modulo'],
  'power': ['math.power'],
  'floor': ['math.floor'],
  'ceil': ['math.ceil'],
  'round': ['math.round'],
  'abs': ['math.abs'],
  'negate': ['math.negate'],
  'sqrt': ['math.sqrt'],
  'sin': ['math.sin'],
  'cos': ['math.cos'],
  'tan': ['math.tan'],
  'asin': ['math.asin'],
  'acos': ['math.acos'],
  'atan': ['math.atan'],
  'atan2': ['math.atan2'],
  'exp': ['math.exp'],
  'log': ['math.log'],
  'log10': ['math.log10'],
  'min': ['math.min'],
  'max': ['math.max'],
  'clamp': ['math.clamp'],
  'lerp': ['math.lerp'],
  'remap': ['math.remap'],
  'random': ['math.random'],
  
  // Vector nodes
  'vectorAdd': ['vector.add'],
  'vectorSubtract': ['vector.subtract'],
  'vectorMultiply': ['vector.multiply'],
  'vectorDivide': ['vector.divide'],
  'vectorDot': ['vector.dot'],
  'vectorCross': ['vector.cross'],
  'vectorNormalize': ['vector.normalize'],
  'vectorLength': ['vector.length'],
  'vectorDistance': ['vector.distance'],
  'vectorLerp': ['vector.lerp'],
  
  // Logic nodes
  'and': ['logic.and'],
  'or': ['logic.or'],
  'not': ['logic.not'],
  'xor': ['logic.xor'],
  'if': ['logic.if'],
  'compare': ['logic.compare'],
  'equal': ['math.equal'],
  'notEqual': ['math.notEqual'],
  'lessThan': ['math.lessThan'],
  'lessThanOrEqual': ['math.lessThanOrEqual'],
  'greaterThan': ['math.greaterThan'],
  'greaterThanOrEqual': ['math.greaterThanOrEqual'],
  
  // Data nodes
  'collect': ['data.collect'],
  'flatten': ['data.flatten'],
  'filter': ['data.filter'],
  'map': ['data.map'],
  'reduce': ['data.reduce'],
  'sort': ['data.sort'],
  'unique': ['data.unique'],
  'length': ['data.length'],
  'index': ['data.index'],
  
  // String nodes
  'concat': ['string.concat'],
  'split': ['string.split'],
  'replace': ['string.replace'],
  'substring': ['string.substring'],
  'stringLength': ['string.length'],
  'toNumber': ['string.toNumber'],
  'format': ['string.format'],
  
  // Color nodes
  'hexToRgb': ['color.hexToRgb'],
  'rgbToHex': ['color.rgbToHex'],
  'rgbToHsl': ['color.rgbToHsl'],
  'hslToRgb': ['color.hslToRgb'],
  'colorBlend': ['color.blend'],
  'colorClamp': ['color.clamp'],
  
  // Workflow nodes (primitives)
  'number': ['workflow.literal'],
  'string': ['workflow.literal'],
  'boolean': ['workflow.literal'],
  'vector': ['workflow.literal'],
  'color': ['workflow.literal'],
  
  // Solver nodes
  'physicsSolver': ['solver.physics'],
  'chemistrySolver': ['solver.chemistry'],
  'biologicalSolver': ['solver.biological'],
  'voxelSolver': ['solver.voxel'],
  
  // Goal nodes (no operations - they're data structures)
  'anchorGoal': [],
  'loadGoal': [],
  'stiffnessGoal': [],
  'volumeGoal': [],
  'chemistryBlendGoal': [],
  'chemistryMassGoal': [],
  'chemistryMaterialGoal': [],
  'chemistryStiffnessGoal': [],
  'chemistryThermalGoal': [],
  'chemistryTransparencyGoal': [],
  
  // Primitive nodes (from catalog)
  'box': [],
  'sphere': [],
  'cylinder': [],
  'cone': [],
  'torus': [],
  'plane': [],
  'circle': [],
  'rectangle': [],
  'polygon': [],
  'line': [],
  'point': [],
  'curve': [],
  'surface': [],
  'material': [],
  'texture': [],
  'light': [],
  'camera': [],
  
  // Geometry nodes (already have semanticOps from previous work)
  // These are handled separately
};

console.log('\n📝 Adding semanticOps to all nodes...\n');

// Read nodeRegistry.ts
const registryPath = path.join(__dirname, '..', 'client', 'src', 'workflow', 'nodeRegistry.ts');
let content = fs.readFileSync(registryPath, 'utf8');

// Count how many nodes we update
let updatedCount = 0;
let skippedCount = 0;
let alreadyHasCount = 0;

// For each node type in our mapping
for (const [nodeType, ops] of Object.entries(NODE_SEMANTIC_OPS)) {
  // Check if this node already has semanticOps
  const nodeDefRegex = new RegExp(`\\{[^}]*type:\\s*["']${nodeType}["'][^}]*semanticOps:`, 's');
  if (nodeDefRegex.test(content)) {
    alreadyHasCount++;
    continue;
  }
  
  // Find the node definition
  const nodeStartRegex = new RegExp(`(\\{\\s*type:\\s*["']${nodeType}["'],\\s*label:\\s*["'][^"']+["'],)`, 's');
  const match = content.match(nodeStartRegex);
  
  if (match) {
    // Add semanticOps after label
    const opsArray = ops.length > 0 ? `['${ops.join("', '")}']` : '[]';
    const replacement = `${match[1]}\n    semanticOps: ${opsArray},`;
    content = content.replace(nodeStartRegex, replacement);
    updatedCount++;
    console.log(`✓ Added semanticOps to ${nodeType} (${ops.length} operations)`);
  } else {
    skippedCount++;
  }
}

// Write back to file
fs.writeFileSync(registryPath, content, 'utf8');

console.log(`\n✅ Semantic ops addition complete!\n`);
console.log(`Statistics:`);
console.log(`  Updated: ${updatedCount} nodes`);
console.log(`  Already had semanticOps: ${alreadyHasCount} nodes`);
console.log(`  Skipped (not found): ${skippedCount} nodes`);
console.log(`\nNext step: Run validation with npx tsx scripts/validateSemanticLinkage.ts\n`);
