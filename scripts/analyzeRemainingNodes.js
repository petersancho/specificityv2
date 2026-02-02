/**
 * Analyze the remaining 143 nodes without semanticOps to determine:
 * 1. Which ones use semantic operations (and need semanticOps added)
 * 2. Which ones don't use semantic operations (and don't need semanticOps)
 */

const fs = require('fs');
const path = require('path');

// Read the nodeRegistry.ts file
const nodeRegistryPath = path.join(__dirname, '../client/src/workflow/nodeRegistry.ts');
const content = fs.readFileSync(nodeRegistryPath, 'utf-8');

// All 119 semantic operation function names
const allSemanticOps = {
  // Geometry operations (40)
  'generateBoxMesh': 'mesh.generateBox',
  'generateSphereMesh': 'mesh.generateSphere',
  'generateCylinderMesh': 'mesh.generateCylinder',
  'generatePipeMesh': 'mesh.generatePipe',
  'generateExtrudeMesh': 'mesh.generateExtrude',
  'generateLoftMesh': 'mesh.generateLoft',
  'computeVertexNormals': 'mesh.computeVertexNormals',
  'computeMeshArea': 'mesh.computeArea',
  'subdivideCatmullClark': 'meshTess.subdivideCatmullClark',
  'subdivideLoop': 'meshTess.subdivideLoop',
  'subdivideMidpoint': 'meshTess.subdivideMidpoint',
  'subdivideDooSabin': 'meshTess.subdivideDooSabin',
  'toTessellationMesh': 'meshTess.toTessellationMesh',
  'toTessellationMeshData': 'meshTess.toTessellationMeshData',
  'getTessellationMetadata': 'meshTess.getTessellationMetadata',
  'tessellationMeshToRenderMesh': 'meshTess.tessellationMeshToRenderMesh',
  'extractTopology': 'meshTess.extractTopology',
  'buildTopology': 'meshTess.buildTopology',
  'extractBoundaryEdges': 'meshTess.extractBoundaryEdges',
  'extractManifoldEdges': 'meshTess.extractManifoldEdges',
  'extractNonManifoldEdges': 'meshTess.extractNonManifoldEdges',
  'computeDualMesh': 'meshTess.computeDualMesh',
  'insetFaces': 'meshTess.insetFaces',
  'extrudeFaces': 'meshTess.extrudeFaces',
  'applyVoronoiPattern': 'meshTess.applyVoronoiPattern',
  'applyHexagonalTiling': 'meshTess.applyHexagonalTiling',
  'applyOffsetPattern': 'meshTess.applyOffsetPattern',
  'decimateMesh': 'meshTess.decimateMesh',
  'remeshToQuads': 'meshTess.remeshToQuads',
  'relaxMesh': 'meshTess.relaxMesh',
  'triangulateMesh': 'meshTess.triangulateMesh',
  'repairMesh': 'meshTess.repairMesh',
  'computeUVs': 'meshTess.computeUVs',
  'computeBestFitPlane': 'math.computeBestFitPlane',
  'projectPointToPlane': 'math.projectPointToPlane',
  'unprojectPointFromPlane': 'math.unprojectPointFromPlane',
  'resampleByArcLength': 'curve.resampleByArcLength',
  'offsetPolyline2D': 'boolean.offsetPolyline2D',
  'brepFromMesh': 'brep.brepFromMesh',
  'tessellateBRepToMesh': 'brep.tessellateBRepToMesh',
  'tessellateCurveAdaptive': 'tess.tessellateCurveAdaptive',
  'tessellateSurfaceAdaptive': 'tess.tessellateSurfaceAdaptive',
};

// Extract node definitions - look for nodes with and without semanticOps
const lines = content.split('\n');
const nodes = [];
let currentNode = null;
let inComputeFunction = false;
let braceDepth = 0;
let computeBody = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Match node type definition
  const typeMatch = line.match(/^\s*{\s*type:\s*["']([^"']+)["']/);
  if (typeMatch) {
    if (currentNode) {
      nodes.push(currentNode);
    }
    currentNode = {
      type: typeMatch[1],
      hasSemanticOps: false,
      operations: new Set(),
      computeBody: '',
    };
  }
  
  // Check for semanticOps
  if (currentNode && line.match(/semanticOps:\s*\[/)) {
    currentNode.hasSemanticOps = true;
  }
  
  // Track compute function
  if (currentNode && line.match(/compute:\s*\(/)) {
    inComputeFunction = true;
    computeBody = '';
  }
  
  if (inComputeFunction) {
    computeBody += line + '\n';
    
    // Count braces to find end of compute function
    for (const char of line) {
      if (char === '{') braceDepth++;
      if (char === '}') braceDepth--;
    }
    
    if (braceDepth === 0 && line.includes('}')) {
      currentNode.computeBody = computeBody;
      inComputeFunction = false;
      computeBody = '';
    }
  }
}

if (currentNode) {
  nodes.push(currentNode);
}

// Analyze each node for semantic operation usage
for (const node of nodes) {
  for (const [funcName, opId] of Object.entries(allSemanticOps)) {
    const regex = new RegExp(`\\b${funcName}\\s*[(<]`, 'g');
    if (regex.test(node.computeBody)) {
      node.operations.add(opId);
    }
  }
  node.operations = Array.from(node.operations).sort();
  node.operationCount = node.operations.length;
}

// Sort nodes by operation count (descending)
nodes.sort((a, b) => b.operationCount - a.operationCount);

// Categorize nodes
const nodesWithSemanticOps = nodes.filter(n => n.hasSemanticOps);
const nodesWithoutSemanticOps = nodes.filter(n => !n.hasSemanticOps);
const nodesNeedingSemanticOps = nodesWithoutSemanticOps.filter(n => n.operationCount > 0);
const nodesNotNeedingSemanticOps = nodesWithoutSemanticOps.filter(n => n.operationCount === 0);

// Generate report
console.log('# Remaining Nodes Analysis\n');
console.log(`**Total nodes:** ${nodes.length}`);
console.log(`**Nodes with semanticOps:** ${nodesWithSemanticOps.length}`);
console.log(`**Nodes without semanticOps:** ${nodesWithoutSemanticOps.length}`);
console.log(`  - **Need semanticOps:** ${nodesNeedingSemanticOps.length} (use operations)`);
console.log(`  - **Don't need semanticOps:** ${nodesNotNeedingSemanticOps.length} (no operations)\n`);

if (nodesNeedingSemanticOps.length > 0) {
  console.log('## ⚠️ Nodes Needing semanticOps\n');
  console.log('These nodes use semantic operations but don\'t have semanticOps arrays:\n');
  
  for (const node of nodesNeedingSemanticOps) {
    console.log(`### ${node.type} (${node.operationCount} operations)\n`);
    console.log('```typescript');
    console.log(`semanticOps: [`);
    for (const op of node.operations) {
      console.log(`  "${op}",`);
    }
    console.log(`],`);
    console.log('```\n');
  }
}

if (nodesNotNeedingSemanticOps.length > 0) {
  console.log('## ✅ Nodes Not Needing semanticOps\n');
  console.log('These nodes don\'t use semantic operations (primitives, data flow, etc.):\n');
  
  // Group by category
  const categories = {
    primitives: [],
    dataFlow: [],
    solvers: [],
    goals: [],
    other: [],
  };
  
  for (const node of nodesNotNeedingSemanticOps) {
    const type = node.type;
    if (type.includes('number') || type.includes('string') || type.includes('boolean') || 
        type.includes('vector') || type.includes('color') || type === 'slider') {
      categories.primitives.push(type);
    } else if (type.includes('Goal') || type.includes('goal')) {
      categories.goals.push(type);
    } else if (type.includes('Solver') || type.includes('solver')) {
      categories.solvers.push(type);
    } else if (type === 'merge' || type === 'split' || type === 'switch' || type === 'group') {
      categories.dataFlow.push(type);
    } else {
      categories.other.push(type);
    }
  }
  
  for (const [category, nodeTypes] of Object.entries(categories)) {
    if (nodeTypes.length > 0) {
      console.log(`### ${category} (${nodeTypes.length} nodes)\n`);
      for (const type of nodeTypes) {
        console.log(`- ${type}`);
      }
      console.log('');
    }
  }
}

// Write JSON output
const output = {
  summary: {
    totalNodes: nodes.length,
    nodesWithSemanticOps: nodesWithSemanticOps.length,
    nodesWithoutSemanticOps: nodesWithoutSemanticOps.length,
    nodesNeedingSemanticOps: nodesNeedingSemanticOps.length,
    nodesNotNeedingSemanticOps: nodesNotNeedingSemanticOps.length,
  },
  nodesNeedingSemanticOps: nodesNeedingSemanticOps.map(n => ({
    type: n.type,
    operations: n.operations,
    operationCount: n.operationCount,
  })),
  nodesNotNeedingSemanticOps: nodesNotNeedingSemanticOps.map(n => n.type),
};

const outputPath = path.join(__dirname, '../docs/semantic/remaining-nodes-analysis.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\n✅ Written ${outputPath}`);
