/**
 * Wire semantic operations to primitive geometry nodes
 */

import * as fs from 'fs';
import * as path from 'path';

const nodeRegistryPath = path.join(__dirname, '../client/src/workflow/nodeRegistry.ts');
let content = fs.readFileSync(nodeRegistryPath, 'utf8');

// Mapping of node types (kebab-case) to operation IDs (camelCase)
const primitiveMapping: Record<string, string> = {
  'cylinder': 'cylinder',
  'torus': 'torus',
  'pyramid': 'pyramid',
  'tetrahedron': 'tetrahedron',
  'octahedron': 'octahedron',
  'icosahedron': 'icosahedron',
  'dodecahedron': 'dodecahedron',
  'hemisphere': 'hemisphere',
  'capsule': 'capsule',
  'disk': 'disk',
  'ring': 'ring',
  'triangular-prism': 'triangularPrism',
  'hexagonal-prism': 'hexagonalPrism',
  'pentagonal-prism': 'pentagonalPrism',
  'torus-knot': 'torusKnot',
  'utah-teapot': 'utahTeapot',
  'frustum': 'frustum',
  'mobius-strip': 'mobiusStrip',
  'ellipsoid': 'ellipsoid',
  'wedge': 'wedge',
  'spherical-cap': 'sphericalCap',
  'bipyramid': 'bipyramid',
  'rhombic-dodecahedron': 'rhombicDodecahedron',
  'truncated-cube': 'truncatedCube',
  'truncated-octahedron': 'truncatedOctahedron',
  'truncated-icosahedron': 'truncatedIcosahedron',
  'pipe': 'pipe',
  'superellipsoid': 'superellipsoid',
  'hyperbolic-paraboloid': 'hyperbolicParaboloid',
  'geodesic-dome': 'geodesicDome',
  'one-sheet-hyperboloid': 'oneSheetHyperboloid',
};

let updatedCount = 0;

Object.entries(primitiveMapping).forEach(([nodeType, opName]) => {
  const opId = `geometry.primitive.${opName}`;
  
  // Find the node definition
  const nodeRegex = new RegExp(
    `(\\{\\s*type:\\s*["']${nodeType}["'][^}]*category:\\s*["']primitives["'][^}]*)(\\})`,
    'gs'
  );
  
  const match = nodeRegex.exec(content);
  if (match) {
    const nodeBlock = match[1];
    
    // Check if it already has semanticOps
    if (!nodeBlock.includes('semanticOps:')) {
      // Add semanticOps before the closing brace
      const replacement = `${nodeBlock},\n    semanticOps: ["${opId}"]$2`;
      content = content.replace(nodeRegex, replacement);
      updatedCount++;
      console.log(`✓ Added semanticOps to ${nodeType} → ${opId}`);
    } else {
      console.log(`⊘ ${nodeType} already has semanticOps`);
    }
  } else {
    console.log(`✗ Could not find node: ${nodeType}`);
  }
});

// Write the updated content
fs.writeFileSync(nodeRegistryPath, content, 'utf8');

console.log(`\n✅ Updated ${updatedCount} primitive nodes with semanticOps`);
