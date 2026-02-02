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
  
  console.log(`  ✓ ${operationRegistry.list().length} operations registered`);
  
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
  console.log(`  Nodes: ${nodeSemanticRegistry.list().length}`);
  console.log(`  Warnings: ${opValidation.warnings.length + nodeValidation.warnings.length}`);
  console.log(`  Errors: ${opValidation.errors.length + nodeValidation.errors.length}`);

  // Exit with error if validation failed
  if (!opValidation.valid || !nodeValidation.valid) {
    console.log('\n❌ Validation failed!');
    process.exit(1);
  }

  console.log('\n✅ Validation passed!');
  process.exit(0);
}

main();
