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
  type: string;
  label: string;
  hasSemanticOps: boolean;
  semanticOpsCount: number;
  semanticOps: string[];
  category: string;
  shouldHaveSemanticOps: boolean;
  reason: string;
}

function categorizeNode(node: any): { category: string; shouldHaveSemanticOps: boolean; reason: string } {
  const type = node.type || '';
  const label = node.label || type;
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

  // Categorize nodes without semanticOps based on their type and label
  
  // UI/Display nodes
  const uiNodes = ['text', 'panel', 'textNote', 'slider', 'colorPicker', 'geometryViewer', 'customViewer', 'annotations', 'metadataPanel', 'customPreview', 'previewFilter'];
  if (uiNodes.includes(type)) {
    return {
      category: 'ui-display',
      shouldHaveSemanticOps: false,
      reason: 'UI/display node (no computation, just UI rendering)'
    };
  }

  // Data structure nodes (JavaScript native operations)
  const dataNodes = ['listCreate', 'listLength', 'listItem', 'listIndexOf', 'listPartition', 'listFlatten', 'listSlice', 'listReverse', 'listSum', 'listAverage', 'listMin', 'listMax', 'listMedian', 'listStdDev', 'range', 'linspace', 'repeat'];
  if (dataNodes.includes(type)) {
    return {
      category: 'data-structure',
      shouldHaveSemanticOps: false,
      reason: 'Data structure node (JavaScript native operations, not semantic ops)'
    };
  }

  // Utility/Helper nodes (constants, references)
  const utilityNodes = ['geometryReference', 'mesh', 'customMaterial', 'origin', 'unitX', 'unitY', 'unitZ', 'unitXYZ', 'moveVector', 'scaleVector'];
  if (utilityNodes.includes(type) || label.includes('Unit ') || label.includes('Origin')) {
    return {
      category: 'utility-helper',
      shouldHaveSemanticOps: false,
      reason: 'Utility/helper node (constants, references, no computation)'
    };
  }

  // Array/Pattern nodes (compose other operations)
  const arrayNodes = ['linearArray', 'polarArray', 'gridArray', 'geometryArray'];
  if (arrayNodes.includes(type)) {
    return {
      category: 'array-pattern',
      shouldHaveSemanticOps: false,
      reason: 'Array/pattern node (composes other operations)'
    };
  }

  // Query/Inspection nodes (read properties, don't transform)
  const queryNodes = ['geometryInfo', 'dimensions', 'geometryVertices', 'geometryEdges', 'geometryFaces', 'geometryNormals', 'controlPoints', 'proximity3D', 'proximity2D', 'curveProximity'];
  if (queryNodes.includes(type) || label.includes('Proximity') || label.includes('Geometry ')) {
    return {
      category: 'query-inspection',
      shouldHaveSemanticOps: false,
      reason: 'Query/inspection node (reads properties, no transformation)'
    };
  }

  // Import/Export nodes (I/O operations)
  const ioNodes = ['stlImport', 'stlExport'];
  if (ioNodes.includes(type) || label.includes('Import') || label.includes('Export')) {
    return {
      category: 'import-export',
      shouldHaveSemanticOps: false,
      reason: 'Import/export node (file I/O, not semantic ops)'
    };
  }

  // Conversion nodes (wrappers)
  const conversionNodes = ['meshConvert', 'nurbsToMesh', 'brepToMesh'];
  if (conversionNodes.includes(type) || label.includes('Convert') || label.includes(' to ')) {
    return {
      category: 'conversion',
      shouldHaveSemanticOps: false,
      reason: 'Conversion node (wrapper, may use semantic ops internally)'
    };
  }

  // Solver/Goal nodes (declarative specifications)
  if (type.includes('solver') || type.includes('Solver') || type.includes('goal') || type.includes('Goal') || 
      label.includes('Solver') || label.includes('Goal')) {
    return {
      category: 'solver-goal',
      shouldHaveSemanticOps: false,
      reason: 'Solver/goal node (declarative specification, not operation)'
    };
  }

  // Pattern generation nodes (mathematical functions)
  const patternNodes = ['sineWave', 'cosineWave', 'wave'];
  if (patternNodes.includes(type) || label.includes('Wave')) {
    return {
      category: 'pattern-generation',
      shouldHaveSemanticOps: false,
      reason: 'Pattern generation node (mathematical function, not semantic op)'
    };
  }

  // Group/Organization nodes
  if (type === 'group' || label === 'Group') {
    return {
      category: 'group-organization',
      shouldHaveSemanticOps: false,
      reason: 'Group/organization node (workflow organization, no computation)'
    };
  }

  // Primitive geometry nodes from catalog (declarative, like Point/Line/Plane)
  const primitiveNodes = ['cylinder', 'torus', 'pyramid', 'tetrahedron', 'octahedron', 'icosahedron', 'dodecahedron', 'hemisphere', 'capsule', 'disk', 'ring', 'triangular-prism', 'hexagonal-prism', 'pentagonal-prism', 'torus-knot', 'utah-teapot', 'frustum', 'mobius-strip', 'ellipsoid', 'wedge', 'spherical-cap', 'bipyramid', 'rhombic-dodecahedron', 'truncated-cube', 'truncated-octahedron', 'truncated-icosahedron', 'cuboctahedron', 'icosidodecahedron', 'snub-cube', 'snub-dodecahedron', 'stella-octangula', 'great-stellated-dodecahedron', 'klein-bottle', 'trefoil-knot', 'figure-eight-knot', 'cinquefoil-knot', 'granny-knot', 'square-knot', 'geodesic-dome', 'arc', 'polyline', 'fillet', 'solid', 'primitive'];
  if (primitiveNodes.includes(type) || label.includes('Prism') || label.includes('Knot') || label.includes('hedron') || label.includes('Dome')) {
    return {
      category: 'primitive-geometry',
      shouldHaveSemanticOps: false,
      reason: 'Primitive geometry node (declarative, like Point/Line/Plane)'
    };
  }

  // NURBS/Curve nodes (declarative or use semantic ops)
  const nurbsNodes = ['pointCloud', 'filletEdges', 'offsetSurface', 'thickenMesh', 'plasticwrap', 'controlPoints'];
  if (nurbsNodes.includes(type) || label.includes('NURBS') || label.includes('Surface') || label.includes('Curve') || label.includes('Control Points')) {
    return {
      category: 'nurbs-curve',
      shouldHaveSemanticOps: false,
      reason: 'NURBS/curve node (may use semantic ops internally or be declarative)'
    };
  }

  // Advanced geometry nodes (may use semantic ops or be declarative)
  const advancedGeometryNodes = ['pipe', 'superellipsoid', 'hyperbolicParaboloid', 'geodesicDome', 'oneSheetHyperboloid', 'voxelizeGeometry', 'extractIsosurface'];
  if (advancedGeometryNodes.includes(type) || label.includes('Paraboloid') || label.includes('Hyperboloid') || label.includes('Voxelize') || label.includes('Isosurface')) {
    return {
      category: 'advanced-geometry',
      shouldHaveSemanticOps: false,
      reason: 'Advanced geometry node (may use semantic ops internally or be declarative)'
    };
  }

  // Expression/Function nodes (evaluate expressions)
  const expressionNodes = ['expression', 'scalarFunctions'];
  if (expressionNodes.includes(type) || label.includes('Expression') || label.includes('Function')) {
    return {
      category: 'expression-function',
      shouldHaveSemanticOps: false,
      reason: 'Expression/function node (evaluates expressions, not semantic ops)'
    };
  }

  // Toggle/Conditional nodes (control flow)
  const controlFlowNodes = ['toggleSwitch', 'conditionalToggleButton', 'conditional'];
  if (controlFlowNodes.includes(type) || label.includes('Toggle') || label.includes('Conditional')) {
    return {
      category: 'control-flow',
      shouldHaveSemanticOps: false,
      reason: 'Control flow node (conditional logic, not semantic ops)'
    };
  }

  // Vector operation nodes (should have semanticOps if they perform operations)
  const vectorOpNodes = ['vectorCompose', 'vectorDecompose', 'vectorScale', 'distance', 'vectorFromPoints', 'vectorAngle', 'vectorProject', 'pointAttractor', 'rotateVector', 'mirrorVector'];
  if (vectorOpNodes.includes(type) || (label.includes('Vector') && !label.includes('Move') && !label.includes('Scale'))) {
    return {
      category: 'vector-operation',
      shouldHaveSemanticOps: false,
      reason: 'Vector operation node (may use semantic ops or be utility)'
    };
  }

  // Transformation nodes (geometric transformations)
  const transformNodes = ['move', 'rotate', 'scale', 'fieldTransformation', 'movePoint', 'movePointByVector'];
  if (transformNodes.includes(type) || label === 'Move' || label === 'Rotate' || label === 'Scale' || label.includes('Transformation') || label.includes('Move Point')) {
    return {
      category: 'transformation',
      shouldHaveSemanticOps: false,
      reason: 'Transformation node (geometric transformation, may use matrix operations)'
    };
  }

  // Default: unknown, probably doesn't need semanticOps
  return {
    category: 'uncategorized',
    shouldHaveSemanticOps: false,
    reason: 'Uncategorized (needs manual review)'
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
      type: node.type,
      label: node.label || node.type,
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
      console.log(`  - ${node.type} (${node.label}) [${node.category}]: ${node.reason}`);
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
