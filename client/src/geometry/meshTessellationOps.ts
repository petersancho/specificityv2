/**
 * Semantically-defined mesh tessellation operations
 * 
 * This module wraps core mesh tessellation operations with semantic metadata
 * for the operation registry.
 */

import { defineOp, operationRegistry } from '../semantic';
import * as tessImpl from './meshTessellation';

export const subdivideLinear = defineOp(
  {
    id: 'meshTess.subdivideLinear',
    domain: 'geometry',
    name: 'Subdivide Linear',
    category: 'modifier',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Performs linear subdivision on a mesh',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.subdivideLinear
);
operationRegistry.register(subdivideLinear);

export const subdivideCatmullClark = defineOp(
  {
    id: 'meshTess.subdivideCatmullClark',
    domain: 'geometry',
    name: 'Subdivide Catmull-Clark',
    category: 'modifier',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Performs Catmull-Clark subdivision surface algorithm',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.subdivideCatmullClark
);
operationRegistry.register(subdivideCatmullClark);

export const subdivideLoop = defineOp(
  {
    id: 'meshTess.subdivideLoop',
    domain: 'geometry',
    name: 'Subdivide Loop',
    category: 'modifier',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Performs Loop subdivision for triangular meshes',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.subdivideLoop
);
operationRegistry.register(subdivideLoop);

export const subdivideAdaptive = defineOp(
  {
    id: 'meshTess.subdivideAdaptive',
    domain: 'geometry',
    name: 'Subdivide Adaptive',
    category: 'modifier',
    tags: ['mesh', '3d'],
    complexity: 'varies',
    summary: 'Performs adaptive subdivision based on curvature',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.subdivideAdaptive
);
operationRegistry.register(subdivideAdaptive);

export const dualMesh = defineOp(
  {
    id: 'meshTess.dualMesh',
    domain: 'geometry',
    name: 'Dual Mesh',
    category: 'modifier',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Creates the dual mesh (vertices ↔ faces)',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.dualMesh
);
operationRegistry.register(dualMesh);

export const insetFaces = defineOp(
  {
    id: 'meshTess.insetFaces',
    domain: 'geometry',
    name: 'Inset Faces',
    category: 'modifier',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Insets selected faces inward by a specified distance',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.insetFaces
);
operationRegistry.register(insetFaces);

export const extrudeFaces = defineOp(
  {
    id: 'meshTess.extrudeFaces',
    domain: 'geometry',
    name: 'Extrude Faces',
    category: 'modifier',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Extrudes selected faces outward by a specified distance',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.extrudeFaces
);
operationRegistry.register(extrudeFaces);

export const meshRelax = defineOp(
  {
    id: 'meshTess.meshRelax',
    domain: 'geometry',
    name: 'Mesh Relax',
    category: 'modifier',
    tags: ['mesh', '3d'],
    complexity: 'O(n * iterations)',
    summary: 'Smooths mesh by averaging vertex positions',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.meshRelax
);
operationRegistry.register(meshRelax);

export const selectFaces = defineOp(
  {
    id: 'meshTess.selectFaces',
    domain: 'geometry',
    name: 'Select Faces',
    category: 'utility',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Selects faces matching a predicate function',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.selectFaces
);
operationRegistry.register(selectFaces);

export const triangulateMesh = defineOp(
  {
    id: 'meshTess.triangulateMesh',
    domain: 'geometry',
    name: 'Triangulate Mesh',
    category: 'modifier',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Converts all mesh faces to triangles',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.triangulateMesh
);
operationRegistry.register(triangulateMesh);

export const generateGeodesicSphere = defineOp(
  {
    id: 'meshTess.generateGeodesicSphere',
    domain: 'geometry',
    name: 'Generate Geodesic Sphere',
    category: 'primitive',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Creates a geodesic sphere by subdividing an icosahedron',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.generateGeodesicSphere
);
operationRegistry.register(generateGeodesicSphere);

export const generateHexagonalTiling = defineOp(
  {
    id: 'meshTess.generateHexagonalTiling',
    domain: 'geometry',
    name: 'Generate Hexagonal Tiling',
    category: 'primitive',
    tags: ['mesh', '2d'],
    complexity: 'O(n)',
    summary: 'Creates a hexagonal tiling pattern',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.generateHexagonalTiling
);
operationRegistry.register(generateHexagonalTiling);

export const generateVoronoiPattern = defineOp(
  {
    id: 'meshTess.generateVoronoiPattern',
    domain: 'geometry',
    name: 'Generate Voronoi Pattern',
    category: 'primitive',
    tags: ['mesh', '2d'],
    complexity: 'O(n log n)',
    summary: 'Creates a Voronoi diagram pattern from random points',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.generateVoronoiPattern
);
operationRegistry.register(generateVoronoiPattern);

export const offsetPattern = defineOp(
  {
    id: 'meshTess.offsetPattern',
    domain: 'geometry',
    name: 'Offset Pattern',
    category: 'modifier',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Offsets mesh surface by a specified distance',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.offsetPattern
);
operationRegistry.register(offsetPattern);

export const generateMeshUVs = defineOp(
  {
    id: 'meshTess.generateMeshUVs',
    domain: 'geometry',
    name: 'Generate Mesh UVs',
    category: 'modifier',
    tags: ['mesh', '3d'],
    complexity: 'varies',
    summary: 'Generates UV texture coordinates for a mesh',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.generateMeshUVs
);
operationRegistry.register(generateMeshUVs);

export const repairMesh = defineOp(
  {
    id: 'meshTess.repairMesh',
    domain: 'geometry',
    name: 'Repair Mesh',
    category: 'modifier',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Fixes mesh issues like non-manifold edges and holes',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.repairMesh
);
operationRegistry.register(repairMesh);

export const decimateMesh = defineOp(
  {
    id: 'meshTess.decimateMesh',
    domain: 'geometry',
    name: 'Decimate Mesh',
    category: 'modifier',
    tags: ['mesh', '3d'],
    complexity: 'O(n log n)',
    summary: 'Reduces polygon count while preserving shape',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.decimateMesh
);
operationRegistry.register(decimateMesh);

export const quadDominantRemesh = defineOp(
  {
    id: 'meshTess.quadDominantRemesh',
    domain: 'geometry',
    name: 'Quad-Dominant Remesh',
    category: 'modifier',
    tags: ['mesh', '3d'],
    complexity: 'O(n)',
    summary: 'Remeshes to quad-dominant topology',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.quadDominantRemesh
);
operationRegistry.register(quadDominantRemesh);

export const meshBoolean = defineOp(
  {
    id: 'meshTess.meshBoolean',
    domain: 'geometry',
    name: 'Mesh Boolean',
    category: 'modifier',
    tags: ['mesh', '3d'],
    complexity: 'O(n^2)',
    summary: 'Performs boolean operations (union, difference, intersection) on meshes',
    stable: true,
    since: '1.0.0',
    deps: ['meshTess.triangulateMesh']
  },
  tessImpl.meshBoolean
);
operationRegistry.register(meshBoolean);

export const getTessellationMetadata = defineOp(
  {
    id: 'meshTess.getTessellationMetadata',
    domain: 'geometry',
    name: 'Get Tessellation Metadata',
    category: 'utility',
    tags: ['mesh'],
    complexity: 'O(1)',
    summary: 'Extracts tessellation data from geometry metadata',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.getTessellationMetadata
);
operationRegistry.register(getTessellationMetadata);

export const toTessellationMesh = defineOp(
  {
    id: 'meshTess.toTessellationMesh',
    domain: 'geometry',
    name: 'To Tessellation Mesh',
    category: 'tessellation',
    tags: ['mesh'],
    complexity: 'O(n)',
    summary: 'Converts RenderMesh to TessellationMesh format',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.toTessellationMesh
);
operationRegistry.register(toTessellationMesh);

export const toTessellationMeshData = defineOp(
  {
    id: 'meshTess.toTessellationMeshData',
    domain: 'geometry',
    name: 'To Tessellation Mesh Data',
    category: 'tessellation',
    tags: ['mesh'],
    complexity: 'O(1)',
    summary: 'Converts TessellationMesh to data format',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.toTessellationMeshData
);
operationRegistry.register(toTessellationMeshData);

export const tessellationMeshToRenderMesh = defineOp(
  {
    id: 'meshTess.tessellationMeshToRenderMesh',
    domain: 'geometry',
    name: 'Tessellation Mesh To Render Mesh',
    category: 'tessellation',
    tags: ['mesh'],
    complexity: 'O(n)',
    summary: 'Converts TessellationMesh to RenderMesh format',
    stable: true,
    since: '1.0.0'
  },
  tessImpl.tessellationMeshToRenderMesh
);
operationRegistry.register(tessellationMeshToRenderMesh);

// Re-export all other functions from meshTessellation.ts
export * from './meshTessellation';
