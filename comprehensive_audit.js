#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the nodeRegistry.ts file
const filePath = path.join(__dirname, 'client/src/workflow/nodeRegistry.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Also read solver node files
const solverFiles = [
  'client/src/workflow/nodes/solver/PhysicsSolver.ts',
  'client/src/workflow/nodes/solver/ChemistrySolver.ts',
  'client/src/workflow/nodes/solver/BiologicalSolver.ts',
  'client/src/workflow/nodes/solver/VoxelSolver.ts',
];

const issues = [];

function checkNode(node) {
  const problems = [];
  
  // Check for generic descriptions
  if (node.description.includes('...') || node.description.length < 20) {
    problems.push(`Short/incomplete description: "${node.description}"`);
  }
  
  // Check for placeholder text
  if (node.description.includes('TODO') || node.description.includes('TBD')) {
    problems.push(`Placeholder text in description`);
  }
  
  // Check for vague terms
  const vagueTerms = ['data', 'value', 'thing', 'stuff', 'item'];
  for (const term of vagueTerms) {
    if (node.label.toLowerCase().includes(term) && !node.description.includes('specific')) {
      problems.push(`Potentially vague label: "${node.label}"`);
    }
  }
  
  return problems;
}

// Extract NODE_DEFINITIONS array
const match = content.match(/export const NODE_DEFINITIONS: WorkflowNodeDefinition\[\] = \[([\s\S]*?)\n\];/);
if (!match) {
  console.error('Could not find NODE_DEFINITIONS');
  process.exit(1);
}

const nodesText = match[1];
const nodes = [];

// Split by node definitions
const nodeBlocks = nodesText.split(/(?=\n\s+\{\s*\n\s+type:)/);

for (const block of nodeBlocks) {
  if (!block.trim()) continue;
  
  const typeMatch = block.match(/type:\s*"([^"]+)"/);
  if (!typeMatch) continue;
  
  const type = typeMatch[1];
  const labelMatch = block.match(/label:\s*"([^"]+)"/);
  const label = labelMatch ? labelMatch[1] : '';
  const descMatch = block.match(/description:\s*"([^"]+)"/);
  const description = descMatch ? descMatch[1] : '';
  const categoryMatch = block.match(/category:\s*"([^"]+)"/);
  const category = categoryMatch ? categoryMatch[1] : '';
  
  const node = { type, label, description, category };
  nodes.push(node);
  
  const problems = checkNode(node);
  if (problems.length > 0) {
    issues.push({ node, problems });
  }
}

// Check solver nodes
for (const solverFile of solverFiles) {
  const solverPath = path.join(__dirname, solverFile);
  if (fs.existsSync(solverPath)) {
    const solverContent = fs.readFileSync(solverPath, 'utf8');
    
    // Extract description
    const descMatch = solverContent.match(/description:\s*"([^"]+)"/);
    const typeMatch = solverContent.match(/type:\s*"([^"]+)"/);
    const labelMatch = solverContent.match(/label:\s*"([^"]+)"/);
    
    if (descMatch && typeMatch && labelMatch) {
      const node = {
        type: typeMatch[1],
        label: labelMatch[1],
        description: descMatch[1],
        category: 'solver',
        file: solverFile
      };
      nodes.push(node);
      
      const problems = checkNode(node);
      if (problems.length > 0) {
        issues.push({ node, problems });
      }
    }
  }
}

console.log('='.repeat(80));
console.log('COMPREHENSIVE NODE AUDIT');
console.log('='.repeat(80));
console.log();
console.log(`Total Nodes Audited: ${nodes.length}`);
console.log(`Nodes with Issues: ${issues.length}`);
console.log();

if (issues.length > 0) {
  console.log('='.repeat(80));
  console.log('ISSUES FOUND');
  console.log('='.repeat(80));
  
  for (const { node, problems } of issues) {
    console.log();
    console.log(`Node: ${node.type} (${node.category})`);
    console.log(`Label: ${node.label}`);
    console.log(`Description: ${node.description}`);
    console.log('Problems:');
    for (const problem of problems) {
      console.log(`  - ${problem}`);
    }
    console.log('-'.repeat(80));
  }
}

// Save full audit
const outputPath = path.join(__dirname, 'comprehensive_audit.json');
fs.writeFileSync(outputPath, JSON.stringify({ nodes, issues }, null, 2));
console.log(`\n\nFull audit saved to: ${outputPath}`);
