/**
 * Validates semantic linkage between nodes and geometry operations
 * 
 * This script:
 * - Validates operation registry (unique IDs, required metadata, dependencies)
 * - Validates node linkages (declared operations exist)
 * - Generates documentation (JSON, DOT graph)
 * - Exits with error code if validation fails
 */

import * as fs from 'fs';
import * as path from 'path';

// Import all semantic operations (auto-registers on import)
// This must be imported FIRST to register all operations
import '../client/src/semantic/registerAllOps';

// Import semantic infrastructure
import '../client/src/geometry/meshOps';
import '../client/src/geometry/meshTessellationOps';
import '../client/src/geometry/mathOps';
import '../client/src/geometry/curveOps';
import '../client/src/geometry/booleanOps';
import '../client/src/geometry/brepOps';
import '../client/src/geometry/tessellationOps';

import { operationRegistry } from '../client/src/semantic/operationRegistry';
import { nodeSemanticRegistry } from '../client/src/semantic/nodeSemantics';
import { SEMANTIC_OP_ID_SET } from '../client/src/semantic/semanticOpIds';
import { NODE_DEFINITIONS } from '../client/src/workflow/nodeRegistry';

const DOCS_DIR = path.join(__dirname, '../docs/semantic');

function main() {
  console.log('🔍 Validating semantic linkage...\n');

  // Ensure docs directory exists
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  // Validate operation registry
  console.log('📚 Validating operation registry...');
  const opValidation = operationRegistry.validate();
  
  const totalOps = operationRegistry.listMeta().length;
  console.log(`  ✓ ${totalOps} operations registered`);
  
  if (opValidation.warnings.length > 0) {
    console.log(`  ⚠️  ${opValidation.warnings.length} warnings:`);
    opValidation.warnings.forEach(w => console.log(`     - ${w}`));
  }
  
  if (opValidation.errors.length > 0) {
    console.log(`  ❌ ${opValidation.errors.length} errors:`);
    opValidation.errors.forEach(e => console.log(`     - ${e}`));
  }

  // Validate node linkages
  console.log('\n🔗 Validating node linkages...');
  const nodeValidation = nodeSemanticRegistry.validate();
  
  console.log(`  ✓ ${nodeSemanticRegistry.list().length} nodes registered`);
  
  if (nodeValidation.warnings.length > 0) {
    console.log(`  ⚠️  ${nodeValidation.warnings.length} warnings:`);
    nodeValidation.warnings.forEach(w => console.log(`     - ${w}`));
  }
  
  if (nodeValidation.errors.length > 0) {
    console.log(`  ❌ ${nodeValidation.errors.length} errors:`);
    nodeValidation.errors.forEach(e => console.log(`     - ${e}`));
  }

  // Validate nodes from NODE_DEFINITIONS
  console.log('\n📋 Validating NODE_DEFINITIONS nodes...');
  const nodeRegistryErrors: string[] = [];
  const nodeRegistryWarnings: string[] = [];
  let nodesWithSemanticOps = 0;
  let nodesWithoutSemanticOps = 0;

  for (const node of NODE_DEFINITIONS) {
    if (node.semanticOps) {
      nodesWithSemanticOps++;
      // Check for duplicates
      const seen = new Set<string>();
      for (const opId of node.semanticOps) {
        if (seen.has(opId)) {
          nodeRegistryErrors.push(`[${node.type}] Duplicate semantic op: ${opId}`);
        }
        seen.add(opId);

        // Check if operation exists
        if (!SEMANTIC_OP_ID_SET.has(opId)) {
          nodeRegistryErrors.push(`[${node.type}] References unknown semantic op: ${opId}`);
        }
      }
    } else {
      nodesWithoutSemanticOps++;
    }
  }

  console.log(`  ✓ ${NODE_DEFINITIONS.length} nodes in registry`);
  console.log(`  ✓ ${nodesWithSemanticOps} nodes with semanticOps`);
  console.log(`  ℹ️  ${nodesWithoutSemanticOps} nodes without semanticOps`);

  if (nodeRegistryWarnings.length > 0) {
    console.log(`  ⚠️  ${nodeRegistryWarnings.length} warnings:`);
    nodeRegistryWarnings.forEach(w => console.log(`     - ${w}`));
  }

  if (nodeRegistryErrors.length > 0) {
    console.log(`  ❌ ${nodeRegistryErrors.length} errors:`);
    nodeRegistryErrors.forEach(e => console.log(`     - ${e}`));
  }

  // Generate documentation
  console.log('\n📝 Generating documentation...');
  
  // Operations JSON
  const opsJSON = operationRegistry.toJSON();
  const opsPath = path.join(DOCS_DIR, 'operations.json');
  fs.writeFileSync(opsPath, JSON.stringify(opsJSON, null, 2));
  console.log(`  ✓ Written ${opsPath}`);

  // Operations by category
  const opsByCategory: Record<string, any[]> = {};
  for (const op of operationRegistry.list()) {
    const cat = op.meta.category;
    if (!opsByCategory[cat]) opsByCategory[cat] = [];
    opsByCategory[cat].push(op.meta);
  }
  const opsByCategoryPath = path.join(DOCS_DIR, 'operations-by-category.json');
  fs.writeFileSync(opsByCategoryPath, JSON.stringify(opsByCategory, null, 2));
  console.log(`  ✓ Written ${opsByCategoryPath}`);

  // Node linkages JSON
  const nodesJSON = nodeSemanticRegistry.toJSON();
  const nodesPath = path.join(DOCS_DIR, 'node-linkages.json');
  fs.writeFileSync(nodesPath, JSON.stringify(nodesJSON, null, 2));
  console.log(`  ✓ Written ${nodesPath}`);

  // Dependency graph DOT
  const dotGraph = operationRegistry.toDOT();
  const dotPath = path.join(DOCS_DIR, 'operation-dependencies.dot');
  fs.writeFileSync(dotPath, dotGraph);
  console.log(`  ✓ Written ${dotPath}`);

  // Generate markdown summary
  const mdLines: string[] = [];
  mdLines.push('# Semantic Linkage Documentation');
  mdLines.push('');
  mdLines.push('## Operation Registry');
  mdLines.push('');
  mdLines.push(`**Total Operations:** ${operationRegistry.list().length}`);
  mdLines.push('');
  mdLines.push('### Operations by Category');
  mdLines.push('');
  
  for (const [category, ops] of Object.entries(opsByCategory)) {
    mdLines.push(`#### ${category} (${ops.length})`);
    mdLines.push('');
    for (const op of ops) {
      mdLines.push(`- **${op.name}** (\`${op.id}\`)`);
      if (op.summary) mdLines.push(`  - ${op.summary}`);
      if (op.complexity) mdLines.push(`  - Complexity: ${op.complexity}`);
      if (op.tags) mdLines.push(`  - Tags: ${op.tags.join(', ')}`);
      mdLines.push('');
    }
  }

  mdLines.push('## Node Linkages');
  mdLines.push('');
  mdLines.push(`**Total Nodes:** ${nodeSemanticRegistry.list().length}`);
  mdLines.push('');

  const mdPath = path.join(DOCS_DIR, 'README.md');
  fs.writeFileSync(mdPath, mdLines.join('\n'));
  console.log(`  ✓ Written ${mdPath}`);

  // Summary
  console.log('\n✨ Summary:');
  console.log(`  Operations: ${operationRegistry.list().length}`);
  console.log(`  Nodes (semantic registry): ${nodeSemanticRegistry.list().length}`);
  console.log(`  Nodes (NODE_DEFINITIONS): ${NODE_DEFINITIONS.length}`);
  console.log(`  Nodes with semanticOps: ${nodesWithSemanticOps}`);
  console.log(`  Nodes without semanticOps: ${nodesWithoutSemanticOps}`);
  console.log(`  Warnings: ${opValidation.warnings.length + nodeValidation.warnings.length + nodeRegistryWarnings.length}`);
  console.log(`  Errors: ${opValidation.errors.length + nodeValidation.errors.length + nodeRegistryErrors.length}`);

  // Exit with error if validation failed
  const hasErrors = !opValidation.valid || !nodeValidation.valid || nodeRegistryErrors.length > 0;
  if (hasErrors) {
    console.log('\n❌ Validation failed!');
    process.exit(1);
  }

  console.log('\n✅ Validation passed!');
  process.exit(0);
}

main();
