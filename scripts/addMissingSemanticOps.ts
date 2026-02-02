/**
 * Script to add missing semanticOps to nodes
 * 
 * This script systematically adds semanticOps to nodes that are missing them,
 * focusing on high-value geometry nodes first (transforms, booleans, operations),
 * then utility nodes (math, logic, data, string, color, workflow).
 */

import * as fs from 'fs';
import * as path from 'path';

const NODE_REGISTRY_PATH = path.join(__dirname, '../client/src/workflow/nodeRegistry.ts');

/**
 * Mapping of node types to their semantic operations
 */
const NODE_SEMANTICS: Record<string, string[]> = {
  // === TRANSFORM NODES ===
  move: ['command.move'],
  rotate: ['command.rotate'],
  scale: ['command.scale'],
  mirror: ['command.mirror'],
  array: ['command.array'],
  transform: ['command.transform'],
  
  // === BOOLEAN OPERATIONS ===
  boolean: ['command.boolean'],
  
  // === CURVE/SURFACE OPERATIONS ===
  loft: ['command.loft'],
  extrude: ['command.extrude'],
  offset: ['command.offset'],
  
  // === MESH OPERATIONS ===
  meshMerge: ['command.meshMerge'],
  meshFlip: ['command.meshFlip'],
  meshThicken: ['command.meshThicken'],
  morph: ['command.morph'],
  meshToBrep: ['command.meshToBrep'],
  brepToMesh: ['command.brepToMesh'],
  
  // === NURBS PRIMITIVES ===
  nurbsBox: ['command.createNurbsBox'],
  nurbsSphere: ['command.createNurbsSphere'],
  nurbsCylinder: ['command.createNurbsCylinder'],
  
  // === CONVERSION OPERATIONS ===
  nurbsRestore: ['command.nurbsRestore'],
  interpolate: ['command.interpolate'],
  
  // === MATH OPERATIONS ===
  modulo: ['math.modulo'],
  negate: ['math.negate'],
  asin: ['math.asin'],
  acos: ['math.acos'],
  atan: ['math.atan'],
  atan2: ['math.atan2'],
  log10: ['math.log10'],
  lerp: ['math.lerp'],
  equal: ['math.equal'],
  notEqual: ['math.notEqual'],
  lessThan: ['math.lessThan'],
  lessThanOrEqual: ['math.lessThanOrEqual'],
  greaterThan: ['math.greaterThan'],
  greaterThanOrEqual: ['math.greaterThanOrEqual'],
  
  // === VECTOR OPERATIONS ===
  vectorMultiply: ['vector.multiply'],
  vectorDivide: ['vector.divide'],
  vectorDistance: ['vector.distance'],
  
  // === LOGIC OPERATIONS ===
  and: ['logic.and'],
  or: ['logic.or'],
  not: ['logic.not'],
  xor: ['logic.xor'],
  compare: ['logic.compare'],
  
  // === DATA OPERATIONS ===
  filter: ['data.filter'],
  map: ['data.map'],
  reduce: ['data.reduce'],
  sort: ['data.sort'],
  unique: ['data.unique'],
  
  // === STRING OPERATIONS ===
  stringConcat: ['string.concat'],
  stringSplit: ['string.split'],
  stringReplace: ['string.replace'],
  stringSubstring: ['string.substring'],
  stringLength: ['string.length'],
  stringToNumber: ['string.toNumber'],
  stringFormat: ['string.format'],
  
  // === COLOR OPERATIONS ===
  hexToRgb: ['color.hexToRgb'],
  rgbToHex: ['color.rgbToHex'],
  rgbToHsl: ['color.rgbToHsl'],
  hslToRgb: ['color.hslToRgb'],
  colorBlend: ['color.blend'],
  colorClamp: ['color.clamp'],
  
  // === WORKFLOW OPERATIONS ===
  identity: ['workflow.identity'],
  constant: ['workflow.constant'],
};

/**
 * Add semanticOps to a node definition
 */
function addSemanticOpsToNode(content: string, nodeType: string, ops: string[]): string {
  // Find the node definition
  const nodePattern = new RegExp(
    `(\\{\\s*type:\\s*"${nodeType}"[^}]*?)(\\s*compute:)`,
    's'
  );
  
  const match = content.match(nodePattern);
  if (!match) {
    console.log(`⚠️  Could not find node: ${nodeType}`);
    return content;
  }
  
  // Check if semanticOps already exists
  if (match[1].includes('semanticOps:')) {
    console.log(`⏭️  Node ${nodeType} already has semanticOps`);
    return content;
  }
  
  // Add semanticOps before compute
  const opsString = `    semanticOps: [${ops.map(op => `"${op}"`).join(', ')}],\n`;
  const replacement = `${match[1]}${opsString}${match[2]}`;
  
  return content.replace(nodePattern, replacement);
}

/**
 * Main function
 */
function main() {
  console.log('🔧 Adding missing semanticOps to nodes...\n');
  
  // Read node registry
  let content = fs.readFileSync(NODE_REGISTRY_PATH, 'utf-8');
  
  let addedCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;
  
  // Add semanticOps to each node
  for (const [nodeType, ops] of Object.entries(NODE_SEMANTICS)) {
    const originalContent = content;
    content = addSemanticOpsToNode(content, nodeType, ops);
    
    if (content !== originalContent) {
      console.log(`✅ Added semanticOps to ${nodeType}: [${ops.join(', ')}]`);
      addedCount++;
    } else if (content.includes(`type: "${nodeType}"`)) {
      skippedCount++;
    } else {
      notFoundCount++;
    }
  }
  
  // Write back to file
  if (addedCount > 0) {
    fs.writeFileSync(NODE_REGISTRY_PATH, content, 'utf-8');
    console.log(`\n✅ Added semanticOps to ${addedCount} nodes`);
  }
  
  console.log(`⏭️  Skipped ${skippedCount} nodes (already have semanticOps)`);
  console.log(`⚠️  Could not find ${notFoundCount} nodes`);
  
  console.log('\n✅ Done!');
}

main();
