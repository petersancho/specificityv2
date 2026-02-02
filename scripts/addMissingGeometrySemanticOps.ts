/**
 * Script to add semanticOps to geometry nodes that are missing them
 * Part 1 of Phase 8M: Complete Solver-Geometry Semantic Integration
 */

import * as fs from 'fs';
import * as path from 'path';

const NODE_REGISTRY_PATH = path.join(__dirname, '../client/src/workflow/nodeRegistry.ts');

// Mapping of node types to their semantic operations
const GEOMETRY_NODE_SEMANTIC_OPS: Record<string, string[]> = {
  // Curves
  arc: ['command.createArc'],
  polyline: ['command.createPolyline'],
  
  // Pass-through nodes
  mesh: ['geometry.mesh'],
  brep: ['geometry.brep'],
};

function addSemanticOpsToNode(content: string, nodeType: string, semanticOps: string[]): string {
  // Find the node definition
  const nodePattern = new RegExp(
    `(\\{\\s*type:\\s*"${nodeType}"[^}]*?)(\\s*compute:)`,
    's'
  );
  
  const match = content.match(nodePattern);
  if (!match) {
    console.log(`⚠️  Could not find node type: ${nodeType}`);
    return content;
  }
  
  // Check if semanticOps already exists
  if (match[1].includes('semanticOps:')) {
    console.log(`✅ Node ${nodeType} already has semanticOps`);
    return content;
  }
  
  // Add semanticOps before compute
  const semanticOpsStr = `    semanticOps: [${semanticOps.map(op => `"${op}"`).join(', ')}],\n`;
  const replacement = match[1] + semanticOpsStr + match[2];
  
  return content.replace(nodePattern, replacement);
}

function main() {
  console.log('🚀 Adding semanticOps to geometry nodes...\n');
  
  let content = fs.readFileSync(NODE_REGISTRY_PATH, 'utf-8');
  let modified = false;
  
  for (const [nodeType, semanticOps] of Object.entries(GEOMETRY_NODE_SEMANTIC_OPS)) {
    const originalContent = content;
    content = addSemanticOpsToNode(content, nodeType, semanticOps);
    
    if (content !== originalContent) {
      console.log(`✅ Added semanticOps to ${nodeType}: [${semanticOps.join(', ')}]`);
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(NODE_REGISTRY_PATH, content, 'utf-8');
    console.log('\n✅ Successfully updated nodeRegistry.ts');
  } else {
    console.log('\n✅ No changes needed - all nodes already have semanticOps');
  }
}

main();
