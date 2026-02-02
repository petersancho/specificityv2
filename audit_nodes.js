#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the nodeRegistry.ts file
const filePath = path.join(__dirname, 'client/src/workflow/nodeRegistry.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Extract NODE_DEFINITIONS array
const match = content.match(/export const NODE_DEFINITIONS: WorkflowNodeDefinition\[\] = \[([\s\S]*?)\n\];/);
if (!match) {
  console.error('Could not find NODE_DEFINITIONS');
  process.exit(1);
}

// Parse nodes (simplified - extract key fields)
const nodesText = match[1];
const nodes = [];

// Split by node definitions (each starts with "type:")
const nodeBlocks = nodesText.split(/(?=\n\s+\{\s*\n\s+type:)/);

for (const block of nodeBlocks) {
  if (!block.trim()) continue;
  
  // Extract type
  const typeMatch = block.match(/type:\s*"([^"]+)"/);
  if (!typeMatch) continue;
  
  const type = typeMatch[1];
  
  // Extract label
  const labelMatch = block.match(/label:\s*"([^"]+)"/);
  const label = labelMatch ? labelMatch[1] : '';
  
  // Extract description
  const descMatch = block.match(/description:\s*"([^"]+)"/);
  const description = descMatch ? descMatch[1] : '';
  
  // Extract category
  const categoryMatch = block.match(/category:\s*"([^"]+)"/);
  const category = categoryMatch ? categoryMatch[1] : '';
  
  nodes.push({ type, label, description, category });
}

// Group by category
const byCategory = {};
for (const node of nodes) {
  const cat = node.category || 'uncategorized';
  if (!byCategory[cat]) byCategory[cat] = [];
  byCategory[cat].push(node);
}

// Output results
console.log('='.repeat(80));
console.log('NODE AUDIT REPORT');
console.log('='.repeat(80));
console.log();
console.log(`Total Nodes: ${nodes.length}`);
console.log(`Categories: ${Object.keys(byCategory).length}`);
console.log();

for (const [category, catNodes] of Object.entries(byCategory).sort()) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`CATEGORY: ${category.toUpperCase()} (${catNodes.length} nodes)`);
  console.log('='.repeat(80));
  
  for (const node of catNodes) {
    console.log();
    console.log(`Type: ${node.type}`);
    console.log(`Label: ${node.label}`);
    console.log(`Description: ${node.description}`);
    console.log('-'.repeat(80));
  }
}

// Save to JSON for further analysis
const outputPath = path.join(__dirname, 'node_audit.json');
fs.writeFileSync(outputPath, JSON.stringify({ nodes, byCategory }, null, 2));
console.log(`\n\nFull audit saved to: ${outputPath}`);
