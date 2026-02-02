/**
 * Script to add ALL missing semanticOps to nodes
 * 
 * This script systematically adds semanticOps to all 120 nodes that are missing them,
 * excluding only intentional UI/config nodes.
 */

import * as fs from 'fs';
import * as path from 'path';

const NODE_REGISTRY_PATH = path.join(__dirname, '../client/src/workflow/nodeRegistry.ts');

/**
 * Comprehensive mapping of node types to their semantic operations
 */
const NODE_SEMANTICS: Record<string, string[]> = {
  // === PRIMITIVE SHAPES (40+) ===
  cylinder: ['geometry.primitive.cylinder'],
  torus: ['geometry.primitive.torus'],
  pyramid: ['geometry.primitive.pyramid'],
  tetrahedron: ['geometry.primitive.tetrahedron'],
  octahedron: ['geometry.primitive.octahedron'],
  icosahedron: ['geometry.primitive.icosahedron'],
  dodecahedron: ['geometry.primitive.dodecahedron'],
  hemisphere: ['geometry.primitive.hemisphere'],
  capsule: ['geometry.primitive.capsule'],
  disk: ['geometry.primitive.disk'],
  ring: ['geometry.primitive.ring'],
  'triangular-prism': ['geometry.primitive.triangularPrism'],
  'hexagonal-prism': ['geometry.primitive.hexagonalPrism'],
  'pentagonal-prism': ['geometry.primitive.pentagonalPrism'],
  'torus-knot': ['geometry.primitive.torusKnot'],
  'utah-teapot': ['geometry.primitive.utahTeapot'],
  frustum: ['geometry.primitive.frustum'],
  'mobius-strip': ['geometry.primitive.mobiusStrip'],
  ellipsoid: ['geometry.primitive.ellipsoid'],
  wedge: ['geometry.primitive.wedge'],
  'spherical-cap': ['geometry.primitive.sphericalCap'],
  bipyramid: ['geometry.primitive.bipyramid'],
  'rhombic-dodecahedron': ['geometry.primitive.rhombicDodecahedron'],
  'truncated-cube': ['geometry.primitive.truncatedCube'],
  'truncated-octahedron': ['geometry.primitive.truncatedOctahedron'],
  'truncated-icosahedron': ['geometry.primitive.truncatedIcosahedron'],
  pipe: ['geometry.primitive.pipe'],
  superellipsoid: ['geometry.primitive.superellipsoid'],
  'hyperbolic-paraboloid': ['geometry.primitive.hyperbolicParaboloid'],
  'geodesic-dome': ['geometry.primitive.geodesicDome'],
  'one-sheet-hyperboloid': ['geometry.primitive.oneSheetHyperboloid'],
  
  // === VECTOR OPERATIONS (9) ===
  vectorConstruct: ['vector.construct'],
  vectorDeconstruct: ['vector.deconstruct'],
  vectorAngle: ['vector.angle'],
  vectorProject: ['vector.project'],
  pointAttractor: ['vector.attractor'],
  distance: ['vector.distance'],
  vectorFromPoints: ['vector.fromPoints'],
  
  // === LIST OPERATIONS (7) ===
  listIndexOf: ['data.indexOf'],
  listPartition: ['data.partition'],
  listSlice: ['data.slice'],
  listReverse: ['data.reverse'],
  range: ['data.range'],
  linspace: ['data.linspace'],
  repeat: ['data.repeat'],
  
  // === ARRAY OPERATIONS (4) ===
  linearArray: ['geometry.array.linear'],
  polarArray: ['geometry.array.polar'],
  gridArray: ['geometry.array.grid'],
  geometryArray: ['geometry.array.geometry'],
  
  // === LIST STATISTICS (7) ===
  listSum: ['math.sum'],
  listAverage: ['math.average'],
  listMin: ['math.min'],
  listMax: ['math.max'],
  listMedian: ['math.median'],
  listStdDev: ['math.stdDev'],
  
  // === GEOMETRY ANALYSIS (11) ===
  geometryInfo: ['geometry.analyze.info'],
  dimensions: ['geometry.analyze.dimensions'],
  geometryVertices: ['geometry.analyze.vertices'],
  geometryEdges: ['geometry.analyze.edges'],
  geometryFaces: ['geometry.analyze.faces'],
  geometryNormals: ['geometry.analyze.normals'],
  geometryControlPoints: ['geometry.analyze.controlPoints'],
  proximity3d: ['geometry.analyze.proximity3d'],
  proximity2d: ['geometry.analyze.proximity2d'],
  curveProximity: ['geometry.analyze.curveProximity'],
  
  // === WAVE FUNCTIONS (5) ===
  sineWave: ['math.wave.sine'],
  cosineWave: ['math.wave.cosine'],
  sawtoothWave: ['math.wave.sawtooth'],
  triangleWave: ['math.wave.triangle'],
  squareWave: ['math.wave.square'],
  
  // === IMPORT/EXPORT (2) ===
  stlImport: ['command.import.stl'],
  stlExport: ['command.export.stl'],
  
  // === SOLVER OPERATIONS (4) ===
  voxelizeGeometry: ['solver.voxel.voxelize'],
  extractIsosurface: ['solver.voxel.extractIsosurface'],
  topologyOptimize: ['solver.topologyOptimization.optimize'],
  topologySolver: ['solver.topologyOptimization'],
  
  // === GEOMETRY OPERATIONS ===
  pointCloud: ['geometry.pointCloud'],
  fillet: ['geometry.fillet'],
  filletEdges: ['geometry.filletEdges'],
  offsetSurface: ['geometry.offsetSurface'],
  thickenMesh: ['geometry.thickenMesh'],
  plasticwrap: ['geometry.plasticwrap'],
  solid: ['geometry.solid'],
  primitive: ['geometry.primitive'],
  
  // === EXPRESSION/LOGIC ===
  expression: ['math.expression'],
  toggleSwitch: ['logic.toggle'],
  conditionalToggleButton: ['logic.conditionalToggle'],
  
  // === FIELD OPERATIONS ===
  fieldTransformation: ['geometry.field.transform'],
  movePoint: ['geometry.field.movePoint'],
  movePointByVector: ['geometry.field.movePointByVector'],
  rotateVectorAxis: ['geometry.field.rotateVectorAxis'],
  mirrorVector: ['geometry.field.mirrorVector'],
  
  // === VECTOR CONSTANTS ===
  origin: ['vector.constant.origin'],
  unitX: ['vector.constant.unitX'],
  unitY: ['vector.constant.unitY'],
  unitZ: ['vector.constant.unitZ'],
  unitXYZ: ['vector.constant.unitXYZ'],
  moveVector: ['vector.moveVector'],
  scaleVector: ['vector.scaleVector'],
};

/**
 * Nodes that intentionally don't have semanticOps (UI/config nodes)
 */
const INTENTIONAL_NO_SEMANTICS = new Set([
  'group',
  'panel',
  'textNote',
  'slider',
  'customMaterial',
  'annotations',
  'geometryViewer',
  'customViewer',
  'previewFilter',
  'customPreview',
  'metadataPanel',
  'stiffnessGoal',
  'volumeGoal',
  'loadGoal',
  'anchorGoal',
  'chemistryMaterialGoal',
  'chemistryStiffnessGoal',
  'chemistryMassGoal',
  'chemistryBlendGoal',
  'chemistryTransparencyGoal',
  'chemistryThermalGoal',
]);

function addSemanticOpsToNodes() {
  console.log('🔧 Adding missing semanticOps to nodes...\n');
  
  const content = fs.readFileSync(NODE_REGISTRY_PATH, 'utf8');
  const lines = content.split('\n');
  const newLines: string[] = [];
  
  let addedCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;
  const processedNodes = new Set<string>();
  
  let currentNodeType: string | null = null;
  let foundCategory = false;
  let hasSemanticOps = false;
  let categoryLineIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    newLines.push(line);
    
    // Check if this is a node type declaration (at 4-space indent level)
    const typeMatch = line.match(/^\s{4}type:\s*["']([^"']+)["'],?\s*$/);
    if (typeMatch) {
      // Save any pending node
      if (currentNodeType && foundCategory && !hasSemanticOps && NODE_SEMANTICS[currentNodeType]) {
        // Insert semanticOps after the category line
        const semanticOps = NODE_SEMANTICS[currentNodeType];
        const semanticOpsLine = `    semanticOps: [${semanticOps.map(op => `"${op}"`).join(', ')}],`;
        newLines.splice(categoryLineIndex + 1, 0, semanticOpsLine);
        console.log(`  ✅ Added semanticOps to ${currentNodeType}: [${semanticOps.join(', ')}]`);
        addedCount++;
        processedNodes.add(currentNodeType);
      }
      
      // Start tracking new node
      currentNodeType = typeMatch[1];
      foundCategory = false;
      hasSemanticOps = false;
      categoryLineIndex = -1;
    }
    
    // Check if this is a category line (at 4-space indent level)
    if (currentNodeType && line.match(/^\s{4}category:\s*["'][^"']*["'],?\s*$/)) {
      foundCategory = true;
      categoryLineIndex = newLines.length - 1;
    }
    
    // Check if this node already has semanticOps (at 4-space indent level)
    if (currentNodeType && line.match(/^\s{4}semanticOps:\s*\[/)) {
      hasSemanticOps = true;
      if (!processedNodes.has(currentNodeType)) {
        console.log(`  ⏭️  Skipping ${currentNodeType} (already has semanticOps)`);
        skippedCount++;
        processedNodes.add(currentNodeType);
      }
    }
  }
  
  // Handle the last node
  if (currentNodeType && foundCategory && !hasSemanticOps && NODE_SEMANTICS[currentNodeType]) {
    const semanticOps = NODE_SEMANTICS[currentNodeType];
    const semanticOpsLine = `    semanticOps: [${semanticOps.map(op => `"${op}"`).join(', ')}],`;
    newLines.splice(categoryLineIndex + 1, 0, semanticOpsLine);
    console.log(`  ✅ Added semanticOps to ${currentNodeType}: [${semanticOps.join(', ')}]`);
    addedCount++;
    processedNodes.add(currentNodeType);
  }
  
  // Check for nodes that weren't found
  for (const nodeType of Object.keys(NODE_SEMANTICS)) {
    if (!processedNodes.has(nodeType)) {
      console.log(`  ⚠️  Could not find node definition for ${nodeType}`);
      notFoundCount++;
    }
  }
  
  fs.writeFileSync(NODE_REGISTRY_PATH, newLines.join('\n'), 'utf8');
  
  console.log(`\n✨ Summary:`);
  console.log(`  Added semanticOps to ${addedCount} nodes`);
  console.log(`  Skipped ${skippedCount} nodes (already have semanticOps)`);
  console.log(`  Not found: ${notFoundCount} nodes`);
  console.log(`  Intentionally excluded ${INTENTIONAL_NO_SEMANTICS.size} UI/config nodes`);
}

addSemanticOpsToNodes();
