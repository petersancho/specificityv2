import { NODE_DEFINITIONS } from '../client/src/workflow/nodeRegistry';

const nodesWithSemanticOps: string[] = [];
const nodesWithoutSemanticOps: string[] = [];

NODE_DEFINITIONS.forEach(node => {
  if (node.semanticOps && node.semanticOps.length > 0) {
    nodesWithSemanticOps.push(node.type);
  } else {
    nodesWithoutSemanticOps.push(node.type);
  }
});

console.log(`Nodes WITH semanticOps: ${nodesWithSemanticOps.length}`);
console.log(`Nodes WITHOUT semanticOps: ${nodesWithoutSemanticOps.length}`);
console.log('\nNodes WITHOUT semanticOps:');
nodesWithoutSemanticOps.forEach(node => console.log(`  - ${node}`));
