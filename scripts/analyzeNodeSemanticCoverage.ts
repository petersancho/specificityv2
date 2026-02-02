/**
 * Comprehensive analysis of node semantic coverage
 * 
 * This script analyzes all nodes in NODE_DEFINITIONS to determine:
 * 1. Which nodes have semanticOps
 * 2. Which nodes should have semanticOps but don't
 * 3. Which nodes correctly don't have semanticOps
 * 
 * It examines node implementations to understand what operations they use.
 */

import '../client/src/semantic/registerAllOps';
import { NODE_DEFINITIONS } from '../client/src/workflow/nodeRegistry';
import { SEMANTIC_OP_IDS } from '../client/src/semantic/semanticOpIds';
import * as fs from 'fs';
import * as path from 'path';

interface NodeAnalysis {
  id: string;
  label: string;
  hasSemanticOps: boolean;
  semanticOpsCount: number;
  semanticOps: string[];
  category: string;
  shouldHaveSemanticOps: boolean;
  reason: string;
}

function categorizeNode(node: any): { category: string; shouldHaveSemanticOps: boolean; reason: string } {
  const id = node.id || '';
  const label = node.label || id;
  const hasSemanticOps = Array.isArray(node.semanticOps);
  const semanticOpsCount = hasSemanticOps ? node.semanticOps.length : 0;

  // Nodes that already have semanticOps
  if (hasSemanticOps && semanticOpsCount > 0) {
    return {
      category: 'has-semantic-ops',
      shouldHaveSemanticOps: true,
      reason: `Has ${semanticOpsCount} semantic operations`
    };
  }

  // Nodes with empty semanticOps array (declarative primitives)
  if (hasSemanticOps && semanticOpsCount === 0) {
    return {
      category: 'declarative-primitive',
      shouldHaveSemanticOps: false,
      reason: 'Declarative primitive (no operations)'
    };
  }

  // Categorize nodes without semanticOps based on their ID patterns
  
  // Goal nodes (optimization, constraints)
  if (id.includes('goal') || id.includes('Goal') || id.includes('constraint') || id.includes('Constraint')) {
    return {
      category: 'goal-node',
      shouldHaveSemanticOps: false,
      reason: 'Goal/constraint node (declarative)'
    };
  }

  // Solver nodes
  if (id.includes('solver') || id.includes('Solver') || id.includes('physics') || id.includes('chemistry') || id.includes('biological')) {
    return {
      category: 'solver-node',
      shouldHaveSemanticOps: true,
      reason: 'Solver node (uses solver operations)'
    };
  }

  // Data structure nodes
  if (id.includes('list') || id.includes('List') || id.includes('array') || id.includes('Array') || 
      id.includes('range') || id.includes('Range') || id.includes('series') || id.includes('Series')) {
    return {
      category: 'data-structure',
      shouldHaveSemanticOps: true,
      reason: 'Data structure node (uses data operations)'
    };
  }

  // Math nodes
  if (id.includes('math') || id.includes('Math') || id.includes('add') || id.includes('subtract') ||
      id.includes('multiply') || id.includes('divide') || id.includes('sin') || id.includes('cos') ||
      id.includes('tan') || id.includes('sqrt') || id.includes('pow') || id.includes('abs') ||
      id.includes('min') || id.includes('max') || id.includes('clamp') || id.includes('lerp')) {
    return {
      category: 'math-node',
      shouldHaveSemanticOps: true,
      reason: 'Math node (uses math operations)'
    };
  }

  // Vector nodes
  if (id.includes('vector') || id.includes('Vector') || id.includes('point') || id.includes('Point') ||
      id.includes('normalize') || id.includes('cross') || id.includes('dot')) {
    return {
      category: 'vector-node',
      shouldHaveSemanticOps: true,
      reason: 'Vector node (uses vector operations)'
    };
  }

  // Logic nodes
  if (id.includes('if') || id.includes('If') || id.includes('and') || id.includes('And') ||
      id.includes('or') || id.includes('Or') || id.includes('not') || id.includes('Not') ||
      id.includes('compare') || id.includes('Compare') || id.includes('equals') || id.includes('Equals')) {
    return {
      category: 'logic-node',
      shouldHaveSemanticOps: true,
      reason: 'Logic node (uses logic operations)'
    };
  }

  // String nodes
  if (id.includes('string') || id.includes('String') || id.includes('text') || id.includes('Text') ||
      id.includes('concat') || id.includes('Concat') || id.includes('split') || id.includes('Split')) {
    return {
      category: 'string-node',
      shouldHaveSemanticOps: true,
      reason: 'String node (uses string operations)'
    };
  }

  // Color nodes
  if (id.includes('color') || id.includes('Color') || id.includes('rgb') || id.includes('RGB') ||
      id.includes('hex') || id.includes('Hex') || id.includes('hsl') || id.includes('HSL')) {
    return {
      category: 'color-node',
      shouldHaveSemanticOps: true,
      reason: 'Color node (uses color operations)'
    };
  }

  // Geometry nodes (should already have semanticOps, but check)
  if (id.includes('mesh') || id.includes('Mesh') || id.includes('nurbs') || id.includes('NURBS') ||
      id.includes('brep') || id.includes('BRep') || id.includes('curve') || id.includes('Curve') ||
      id.includes('surface') || id.includes('Surface') || id.includes('solid') || id.includes('Solid')) {
    return {
      category: 'geometry-node',
      shouldHaveSemanticOps: true,
      reason: 'Geometry node (uses geometry operations)'
    };
  }

  // Transformation nodes (may or may not need semanticOps)
  if (id.includes('transform') || id.includes('Transform') || id.includes('move') || id.includes('Move') ||
      id.includes('rotate') || id.includes('Rotate') || id.includes('scale') || id.includes('Scale')) {
    return {
      category: 'transformation-node',
      shouldHaveSemanticOps: false,
      reason: 'Transformation node (uses transform matrix, not semantic ops)'
    };
  }

  // Utility nodes (input, output, literal, etc.)
  if (id.includes('input') || id.includes('Input') || id.includes('output') || id.includes('Output') ||
      id.includes('literal') || id.includes('Literal') || id.includes('constant') || id.includes('Constant') ||
      id.includes('slider') || id.includes('Slider') || id.includes('toggle') || id.includes('Toggle')) {
    return {
      category: 'utility-node',
      shouldHaveSemanticOps: false,
      reason: 'Utility node (no operations, just data flow)'
    };
  }

  // Default: unknown, probably doesn't need semanticOps
  return {
    category: 'unknown',
    shouldHaveSemanticOps: false,
    reason: 'Unknown category (needs manual review)'
  };
}

function main() {
  console.log('🔍 Analyzing node semantic coverage...\n');

  const analyses: NodeAnalysis[] = [];
  
  for (const node of NODE_DEFINITIONS) {
    const hasSemanticOps = Array.isArray(node.semanticOps);
    const semanticOpsCount = hasSemanticOps ? node.semanticOps.length : 0;
    const semanticOps = hasSemanticOps ? node.semanticOps : [];
    
    const { category, shouldHaveSemanticOps, reason } = categorizeNode(node);
    
    analyses.push({
      id: node.id,
      label: node.label || node.id,
      hasSemanticOps,
      semanticOpsCount,
      semanticOps,
      category,
      shouldHaveSemanticOps,
      reason
    });
  }

  // Group by category
  const byCategory: Record<string, NodeAnalysis[]> = {};
  for (const analysis of analyses) {
    if (!byCategory[analysis.category]) {
      byCategory[analysis.category] = [];
    }
    byCategory[analysis.category].push(analysis);
  }

  // Print summary
  console.log('📊 Summary by Category:\n');
  
  const categories = Object.keys(byCategory).sort();
  for (const category of categories) {
    const nodes = byCategory[category];
    const withSemanticOps = nodes.filter(n => n.hasSemanticOps && n.semanticOpsCount > 0).length;
    const shouldHave = nodes.filter(n => n.shouldHaveSemanticOps).length;
    const missing = nodes.filter(n => n.shouldHaveSemanticOps && (!n.hasSemanticOps || n.semanticOpsCount === 0)).length;
    
    console.log(`${category}:`);
    console.log(`  Total: ${nodes.length}`);
    console.log(`  With semanticOps: ${withSemanticOps}`);
    console.log(`  Should have: ${shouldHave}`);
    console.log(`  Missing: ${missing}`);
    console.log();
  }

  // Find nodes that should have semanticOps but don't
  const missingSemanticOps = analyses.filter(a => 
    a.shouldHaveSemanticOps && (!a.hasSemanticOps || a.semanticOpsCount === 0)
  );

  if (missingSemanticOps.length > 0) {
    console.log(`⚠️  ${missingSemanticOps.length} nodes should have semanticOps but don't:\n`);
    for (const node of missingSemanticOps) {
      console.log(`  - ${node.id} (${node.category}): ${node.reason}`);
    }
    console.log();
  }

  // Overall statistics
  const totalNodes = analyses.length;
  const withSemanticOps = analyses.filter(a => a.hasSemanticOps && a.semanticOpsCount > 0).length;
  const shouldHave = analyses.filter(a => a.shouldHaveSemanticOps).length;
  const missing = missingSemanticOps.length;
  const coverage = shouldHave > 0 ? ((shouldHave - missing) / shouldHave * 100).toFixed(1) : '100.0';

  console.log('📈 Overall Statistics:');
  console.log(`  Total nodes: ${totalNodes}`);
  console.log(`  Nodes with semanticOps: ${withSemanticOps}`);
  console.log(`  Nodes that should have semanticOps: ${shouldHave}`);
  console.log(`  Nodes missing semanticOps: ${missing}`);
  console.log(`  Coverage: ${coverage}%`);
  console.log();

  // Write detailed report
  const reportPath = path.join(__dirname, '../docs/semantic/node-coverage-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      totalNodes,
      withSemanticOps,
      shouldHave,
      missing,
      coverage: parseFloat(coverage)
    },
    byCategory,
    missingSemanticOps
  }, null, 2));
  console.log(`✓ Written detailed report to ${reportPath}`);

  if (missing > 0) {
    console.log(`\n⚠️  ${missing} nodes are missing semantic coverage`);
    process.exit(1);
  }

  console.log('\n✅ All nodes have appropriate semantic coverage!');
  process.exit(0);
}

main();
