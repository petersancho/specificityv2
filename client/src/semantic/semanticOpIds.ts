/**
 * Semantic Operation IDs
 * 
 * This file defines the complete set of semantic operation IDs
 * as a typed union for compile-time safety.
 * 
 * DO NOT EDIT MANUALLY - Generated from operation registry
 */

export const SEMANTIC_OP_IDS = [
  // Boolean operations
  "boolean.offsetPolyline2D",
  
  // BRep operations
  "brep.brepFromMesh",
  "brep.tessellateBRepToMesh",
  
  // Curve operations
  "curve.resampleByArcLength",
  
  // Math operations
  "math.computeBestFitPlane",
  "math.projectPointToPlane",
  "math.unprojectPointFromPlane",
  
  // Mesh operations
  "mesh.computeArea",
  "mesh.computeVertexNormals",
  "mesh.generateBox",
  "mesh.generateCylinder",
  "mesh.generateExtrude",
  "mesh.generateLoft",
  "mesh.generatePipe",
  "mesh.generateSphere",
  
  // Mesh tessellation operations
  "meshTess.decimateMesh",
  "meshTess.dualMesh",
  "meshTess.extrudeFaces",
  "meshTess.generateGeodesicSphere",
  "meshTess.generateHexagonalTiling",
  "meshTess.generateMeshUVs",
  "meshTess.generateVoronoiPattern",
  "meshTess.getTessellationMetadata",
  "meshTess.insetFaces",
  "meshTess.meshBoolean",
  "meshTess.meshRelax",
  "meshTess.offsetPattern",
  "meshTess.quadDominantRemesh",
  "meshTess.repairMesh",
  "meshTess.selectFaces",
  "meshTess.subdivideAdaptive",
  "meshTess.subdivideCatmullClark",
  "meshTess.subdivideLinear",
  "meshTess.subdivideLoop",
  "meshTess.tessellationMeshToRenderMesh",
  "meshTess.toTessellationMesh",
  "meshTess.toTessellationMeshData",
  "meshTess.triangulateMesh",
  
  // Tessellation operations
  "tess.tessellateCurveAdaptive",
  "tess.tessellateSurfaceAdaptive",
] as const;

export type SemanticOpId = typeof SEMANTIC_OP_IDS[number];

export const SEMANTIC_OP_ID_SET = new Set<string>(SEMANTIC_OP_IDS);

/**
 * Check if a string is a valid semantic operation ID
 */
export function isSemanticOpId(id: string): id is SemanticOpId {
  return SEMANTIC_OP_ID_SET.has(id);
}
