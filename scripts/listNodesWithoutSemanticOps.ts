import { NODE_DEFINITIONS } from '../client/src/workflow/nodeRegistry';

const nodesWithoutSemanticOps = NODE_DEFINITIONS.filter(
  node => !node.semanticOps || node.semanticOps.length === 0
);

console.log(`\nNodes without semanticOps (${nodesWithoutSemanticOps.length}):\n`);

const byCategory = new Map<string, typeof nodesWithoutSemanticOps>();
nodesWithoutSemanticOps.forEach(node => {
  const category = node.category;
  if (!byCategory.has(category)) {
    byCategory.set(category, []);
  }
  byCategory.get(category)!.push(node);
});

Array.from(byCategory.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .forEach(([category, nodes]) => {
    console.log(`\n${category.toUpperCase()} (${nodes.length}):`);
    nodes.forEach(node => {
      console.log(`  - ${node.type.padEnd(30)} ${node.label}`);
    });
  });

console.log(`\n\nTotal: ${nodesWithoutSemanticOps.length} nodes without semanticOps`);
