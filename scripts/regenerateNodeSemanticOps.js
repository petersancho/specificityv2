#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const nodeRegistryPath = path.join(__dirname, '../client/src/workflow/nodeRegistry.ts');
const content = fs.readFileSync(nodeRegistryPath, 'utf8');

// Extract all nodes with semanticOps
// Split into node definitions (split on opening brace followed by type field)
const nodeDefinitions = content.split(/(?=\{\s*type:\s*["'])/);

const nodeSemanticOps = {};

for (const nodeDef of nodeDefinitions) {
  // Extract node type
  const typeMatch = nodeDef.match(/\{\s*type:\s*["']([^"']+)["']/);
  if (!typeMatch) continue;
  
  const nodeType = typeMatch[1];
  
  // Check if this node has semanticOps
  if (!nodeDef.includes('semanticOps:')) continue;
  
  // Extract semanticOps array (handle multi-line and 'as const')
  const semanticOpsMatch = nodeDef.match(/semanticOps:\s*\[([\s\S]*?)\](?:\s+as\s+const)?[,\s]/);
  if (!semanticOpsMatch) continue;
  
  const opsString = semanticOpsMatch[1];
  
  // Parse the operations
  const ops = [];
  if (opsString.trim()) {
    const opMatches = opsString.matchAll(/["']([^"']+)["']/g);
    for (const opMatch of opMatches) {
      ops.push(opMatch[1]);
    }
  }
  
  nodeSemanticOps[nodeType] = ops;
}

// Write to file
const outputPath = path.join(__dirname, '../docs/semantic/node-semantic-ops.json');
fs.writeFileSync(outputPath, JSON.stringify(nodeSemanticOps, null, 2));

console.log(`✅ Regenerated node-semantic-ops.json`);
console.log(`   Nodes with semanticOps: ${Object.keys(nodeSemanticOps).length}`);
console.log(`   Nodes with non-empty semanticOps: ${Object.values(nodeSemanticOps).filter(ops => ops.length > 0).length}`);
console.log(`   Nodes with empty semanticOps: ${Object.values(nodeSemanticOps).filter(ops => ops.length === 0).length}`);
