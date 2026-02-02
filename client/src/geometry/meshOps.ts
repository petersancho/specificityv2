/**
 * Semantically-defined mesh operations
 * 
 * This module wraps core mesh operations with semantic metadata
 * for the operation registry.
 */

import { defineOp, operationRegistry } from '../semantic';
import * as meshImpl from './mesh';

// Re-export the implementation functions with semantic metadata

export const generateBoxMesh = defineOp(
  {
    id: 'mesh.generateBox',
    domain: 'geometry',
    name: 'Generate Box Mesh',
    category: 'primitive',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Creates a box mesh with specified dimensions and optional segmentation',
    stable: true,
    since: '1.0.0'
  },
  meshImpl.generateBoxMesh
);
operationRegistry.register(generateBoxMesh);

export const generateSphereMesh = defineOp(
  {
    id: 'mesh.generateSphere',
    domain: 'geometry',
    name: 'Generate Sphere Mesh',
    category: 'primitive',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Creates a sphere mesh with specified radius and segments',
    stable: true,
    since: '1.0.0'
  },
  meshImpl.generateSphereMesh
);
operationRegistry.register(generateSphereMesh);

export const generateCylinderMesh = defineOp(
  {
    id: 'mesh.generateCylinder',
    domain: 'geometry',
    name: 'Generate Cylinder Mesh',
    category: 'primitive',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Creates a cylinder mesh with specified radius, height, and radial segments',
    stable: true,
    since: '1.0.0'
  },
  meshImpl.generateCylinderMesh
);
operationRegistry.register(generateCylinderMesh);

export const generateExtrudeMesh = defineOp(
  {
    id: 'mesh.generateExtrude',
    domain: 'geometry',
    name: 'Generate Extrude Mesh',
    category: 'modifier',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Extrudes 2D profiles along a direction to create 3D geometry',
    stable: true,
    since: '1.0.0'
  },
  meshImpl.generateExtrudeMesh
);
operationRegistry.register(generateExtrudeMesh);

export const generateLoftMesh = defineOp(
  {
    id: 'mesh.generateLoft',
    domain: 'geometry',
    name: 'Generate Loft Mesh',
    category: 'modifier',
    tags: ['mesh', '3d', 'surface'],
    complexity: 'O(n^2)',
    summary: 'Creates a lofted surface between multiple cross-section curves',
    stable: true,
    since: '1.0.0'
  },
  meshImpl.generateLoftMesh
);
operationRegistry.register(generateLoftMesh);

export const generatePipeMesh = defineOp(
  {
    id: 'mesh.generatePipe',
    domain: 'geometry',
    name: 'Generate Pipe Mesh',
    category: 'primitive',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Creates a hollow pipe mesh with specified inner/outer radius and height',
    stable: true,
    since: '1.0.0'
  },
  meshImpl.generatePipeMesh
);
operationRegistry.register(generatePipeMesh);

export const computeVertexNormals = defineOp(
  {
    id: 'mesh.computeVertexNormals',
    domain: 'geometry',
    name: 'Compute Vertex Normals',
    category: 'analysis',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Computes smooth vertex normals from mesh positions and indices',
    stable: true,
    since: '1.0.0'
  },
  meshImpl.computeVertexNormals
);
operationRegistry.register(computeVertexNormals);

export const computeMeshArea = defineOp(
  {
    id: 'mesh.computeArea',
    domain: 'geometry',
    name: 'Compute Mesh Area',
    category: 'analysis',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Calculates the total surface area of a mesh',
    stable: true,
    since: '1.0.0'
  },
  meshImpl.computeMeshArea
);
operationRegistry.register(computeMeshArea);

// Re-export all other functions from mesh.ts without metadata (for now)
export * from './mesh';
