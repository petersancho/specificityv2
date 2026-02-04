/**
 * Comprehensive Semantic Integrity Validation
 * 
 * This script validates the entire semantic system:
 * - All semantic operation IDs are unique
 * - All dashboard references point to existing operations
 * - Identifies orphan operations (defined but never used)
 * - Identifies dangling references (used but not defined)
 * - Generates semantic inventory report
 */

import { operationRegistry } from '../client/src/semantic/operationRegistry';
import { NODE_DEFINITIONS } from '../client/src/workflow/nodeRegistry';
import * as fs from 'fs';
import * as path from 'path';

// Register all operations
import '../client/src/semantic/registerAllOps';

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalOperations: number;
    totalNodes: number;
    nodesWithSemantics: number;
    nodesWithoutSemantics: number;
    dashboards: number;
    orphanOperations: number;
    danglingReferences: number;
  };
}

interface SemanticInventory {
  operations: {
    id: string;
    domain: string;
    name: string;
    category: string;
    stable: boolean;
    usedBy: string[];
  }[];
  nodes: {
    type: string;
    label: string;
    category: string;
    semanticOps: string[];
  }[];
  dashboards: {
    name: string;
    solver: string;
    operations: string[];
  }[];
  orphanOperations: string[];
  danglingReferences: {
    nodeType: string;
    operation: string;
  }[];
}

function validateSemanticIntegrity(): ValidationResult {
  console.log('🔍 Validating semantic integrity...\n');
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Get all operations
  const operations = operationRegistry.listMeta();
  const operationIds = new Set(operations.map(op => op.id));
  
  console.log(`📚 Operations Registry:`);
  console.log(`  ✓ ${operations.length} operations registered\n`);
  
  // Check for duplicate operation IDs
  const idCounts = new Map<string, number>();
  operations.forEach(op => {
    idCounts.set(op.id, (idCounts.get(op.id) || 0) + 1);
  });
  
  const duplicates = Array.from(idCounts.entries()).filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    duplicates.forEach(([id, count]) => {
      errors.push(`Duplicate operation ID: ${id} (${count} times)`);
    });
  }
  
  // Get all nodes with semanticOps
  const nodesWithSemantics = NODE_DEFINITIONS.filter(node => 
    node.semanticOps && node.semanticOps.length > 0
  );
  
  const nodesWithoutSemantics = NODE_DEFINITIONS.filter(node => 
    !node.semanticOps || node.semanticOps.length === 0
  );
  
  console.log(`🔗 Node Linkages:`);
  console.log(`  ✓ ${NODE_DEFINITIONS.length} total nodes`);
  console.log(`  ✓ ${nodesWithSemantics.length} nodes with semanticOps`);
  console.log(`  ℹ️  ${nodesWithoutSemantics.length} nodes without semanticOps\n`);
  
  // Check for dangling references (nodes reference operations that don't exist)
  const danglingReferences: { nodeType: string; operation: string }[] = [];
  nodesWithSemantics.forEach(node => {
    node.semanticOps?.forEach(opId => {
      if (!operationIds.has(opId)) {
        danglingReferences.push({ nodeType: node.type, operation: opId });
        errors.push(`Node "${node.type}" references non-existent operation: ${opId}`);
      }
    });
  });
  
  // Find orphan operations (operations that are never used by any node)
  const usedOperations = new Set<string>();
  nodesWithSemantics.forEach(node => {
    node.semanticOps?.forEach(opId => usedOperations.add(opId));
  });
  
  const orphanOperations = operations
    .filter(op => !usedOperations.has(op.id))
    .filter(op => !op.tags?.includes('internal') && !op.internal) // Exclude internal operations
    .map(op => op.id);
  
  if (orphanOperations.length > 0) {
    console.log(`⚠️  Orphan Operations (defined but never used):`);
    orphanOperations.forEach(opId => {
      console.log(`  - ${opId}`);
      warnings.push(`Orphan operation: ${opId}`);
    });
    console.log();
  }
  
  // Check dashboard references
  const dashboards = getDashboardOperations();
  console.log(`📊 Dashboard Linkages:`);
  console.log(`  ✓ ${dashboards.length} dashboards found\n`);
  
  dashboards.forEach(dashboard => {
    dashboard.operations.forEach(opId => {
      if (!operationIds.has(opId)) {
        errors.push(`Dashboard "${dashboard.name}" references non-existent operation: ${opId}`);
      }
    });
  });
  
  // Generate semantic inventory
  const inventory = generateSemanticInventory(
    operations,
    nodesWithSemantics,
    dashboards,
    orphanOperations,
    danglingReferences
  );
  
  // Write inventory to file
  const inventoryPath = path.join(__dirname, '../docs/semantic/SEMANTIC_INVENTORY.md');
  fs.writeFileSync(inventoryPath, generateInventoryMarkdown(inventory));
  console.log(`✓ Written ${inventoryPath}\n`);
  
  // Summary
  console.log('✨ Summary:');
  console.log(`  Operations: ${operations.length}`);
  console.log(`  Nodes: ${NODE_DEFINITIONS.length}`);
  console.log(`  Nodes with semanticOps: ${nodesWithSemantics.length}`);
  console.log(`  Nodes without semanticOps: ${nodesWithoutSemantics.length}`);
  console.log(`  Dashboards: ${dashboards.length}`);
  console.log(`  Orphan Operations: ${orphanOperations.length}`);
  console.log(`  Dangling References: ${danglingReferences.length}`);
  console.log(`  Warnings: ${warnings.length}`);
  console.log(`  Errors: ${errors.length}\n`);
  
  if (errors.length > 0) {
    console.log('❌ Validation failed!\n');
    errors.forEach(error => console.log(`  ❌ ${error}`));
    console.log();
  } else {
    console.log('✅ Validation passed!\n');
  }
  
  return {
    success: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalOperations: operations.length,
      totalNodes: NODE_DEFINITIONS.length,
      nodesWithSemantics: nodesWithSemantics.length,
      nodesWithoutSemantics: nodesWithoutSemantics.length,
      dashboards: dashboards.length,
      orphanOperations: orphanOperations.length,
      danglingReferences: danglingReferences.length,
    },
  };
}

function getDashboardOperations(): { name: string; solver: string; operations: string[] }[] {
  // This would ideally scan dashboard files, but for now we'll return known dashboards
  return [
    {
      name: 'Evolutionary Simulator Dashboard',
      solver: 'evolutionary',
      operations: ['solver.evolutionary', 'simulator.initialize', 'simulator.step', 'simulator.converge', 'simulator.finalize'],
    },
    {
      name: 'Chemistry Simulator Dashboard',
      solver: 'chemistry',
      operations: [
        'solver.chemistry',
        'simulator.chemistry.initialize',
        'simulator.chemistry.step',
        'simulator.chemistry.converge',
        'simulator.chemistry.finalize',
        'simulator.chemistry.blendMaterials',
        'simulator.chemistry.evaluateGoals',
      ],
    },
    {
      name: 'Physics Simulator Dashboard',
      solver: 'physics',
      operations: [
        'solver.physics',
        'simulator.physics.initialize',
        'simulator.physics.step',
        'simulator.physics.converge',
        'simulator.physics.finalize',
        'simulator.physics.applyLoads',
        'simulator.physics.computeStress',
      ],
    },
  ];
}

function generateSemanticInventory(
  operations: any[],
  nodes: any[],
  dashboards: any[],
  orphanOperations: string[],
  danglingReferences: { nodeType: string; operation: string }[]
): SemanticInventory {
  // Build usage map
  const usageMap = new Map<string, string[]>();
  nodes.forEach(node => {
    node.semanticOps?.forEach((opId: string) => {
      if (!usageMap.has(opId)) {
        usageMap.set(opId, []);
      }
      usageMap.get(opId)!.push(node.type);
    });
  });
  
  return {
    operations: operations.map(op => ({
      id: op.id,
      domain: op.domain,
      name: op.name,
      category: op.category,
      stable: op.stable,
      usedBy: usageMap.get(op.id) || [],
    })),
    nodes: nodes.map(node => ({
      type: node.type,
      label: node.label,
      category: node.category,
      semanticOps: node.semanticOps || [],
    })),
    dashboards: dashboards.map(d => ({
      name: d.name,
      solver: d.solver,
      operations: d.operations,
    })),
    orphanOperations,
    danglingReferences,
  };
}

function generateInventoryMarkdown(inventory: SemanticInventory): string {
  let md = '# Semantic Inventory\n\n';
  md += 'Generated: ' + new Date().toISOString() + '\n\n';
  
  md += '## Summary\n\n';
  md += `- **Total Operations**: ${inventory.operations.length}\n`;
  md += `- **Total Nodes**: ${inventory.nodes.length}\n`;
  md += `- **Total Dashboards**: ${inventory.dashboards.length}\n`;
  md += `- **Orphan Operations**: ${inventory.orphanOperations.length}\n`;
  md += `- **Dangling References**: ${inventory.danglingReferences.length}\n\n`;
  
  md += '## Operations by Domain\n\n';
  const byDomain = new Map<string, any[]>();
  inventory.operations.forEach(op => {
    if (!byDomain.has(op.domain)) {
      byDomain.set(op.domain, []);
    }
    byDomain.get(op.domain)!.push(op);
  });
  
  Array.from(byDomain.entries()).sort().forEach(([domain, ops]) => {
    md += `### ${domain} (${ops.length} operations)\n\n`;
    md += '| ID | Name | Category | Stable | Used By |\n';
    md += '|----|------|----------|--------|----------|\n';
    ops.forEach(op => {
      const usedBy = op.usedBy.length > 0 ? op.usedBy.join(', ') : '(none)';
      md += `| \`${op.id}\` | ${op.name} | ${op.category} | ${op.stable ? '✅' : '⚠️'} | ${usedBy} |\n`;
    });
    md += '\n';
  });
  
  md += '## Nodes with Semantic Operations\n\n';
  md += '| Node Type | Label | Category | Semantic Operations |\n';
  md += '|-----------|-------|----------|---------------------|\n';
  inventory.nodes.forEach(node => {
    const ops = node.semanticOps.map(op => `\`${op}\``).join(', ');
    md += `| \`${node.type}\` | ${node.label} | ${node.category} | ${ops} |\n`;
  });
  md += '\n';
  
  md += '## Dashboards\n\n';
  inventory.dashboards.forEach(dashboard => {
    md += `### ${dashboard.name}\n\n`;
    md += `**Solver**: ${dashboard.solver}\n\n`;
    md += '**Operations**:\n';
    dashboard.operations.forEach(op => {
      md += `- \`${op}\`\n`;
    });
    md += '\n';
  });
  
  if (inventory.orphanOperations.length > 0) {
    md += '## Orphan Operations\n\n';
    md += 'These operations are defined but never used by any node:\n\n';
    inventory.orphanOperations.forEach(opId => {
      md += `- \`${opId}\`\n`;
    });
    md += '\n';
  }
  
  if (inventory.danglingReferences.length > 0) {
    md += '## Dangling References\n\n';
    md += 'These nodes reference operations that do not exist:\n\n';
    md += '| Node Type | Operation |\n';
    md += '|-----------|----------|\n';
    inventory.danglingReferences.forEach(ref => {
      md += `| \`${ref.nodeType}\` | \`${ref.operation}\` |\n`;
    });
    md += '\n';
  }
  
  return md;
}

// Run validation
const result = validateSemanticIntegrity();
process.exit(result.success ? 0 : 1);
