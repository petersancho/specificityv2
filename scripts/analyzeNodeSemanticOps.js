#!/usr/bin/env node
/**
 * Analyze nodeRegistry.ts to find which semantic operations each node uses
 * 
 * This is a simpler JavaScript-based approach that doesn't require TypeScript compilation
 */

const fs = require("fs");
const path = require("path");

// Map function names to semantic op IDs
const FUNCTION_TO_OP_ID = {
  // mesh operations
  generateBoxMesh: "mesh.generateBox",
  generateSphereMesh: "mesh.generateSphere",
  generateCylinderMesh: "mesh.generateCylinder",
  generatePipeMesh: "mesh.generatePipe",
  generateExtrudeMesh: "mesh.generateExtrude",
  generateLoftMesh: "mesh.generateLoft",
  computeVertexNormals: "mesh.computeVertexNormals",
  computeMeshArea: "mesh.computeArea",
  
  // mesh tessellation operations
  toTessellationMesh: "meshTess.toTessellationMesh",
  toTessellationMeshData: "meshTess.toTessellationMeshData",
  getTessellationMetadata: "meshTess.getTessellationMetadata",
  tessellationMeshToRenderMesh: "meshTess.tessellationMeshToRenderMesh",
  subdivideLinear: "meshTess.subdivideLinear",
  subdivideCatmullClark: "meshTess.subdivideCatmullClark",
  subdivideLoop: "meshTess.subdivideLoop",
  subdivideAdaptive: "meshTess.subdivideAdaptive",
  dualMesh: "meshTess.dualMesh",
  insetFaces: "meshTess.insetFaces",
  extrudeFaces: "meshTess.extrudeFaces",
  meshRelax: "meshTess.meshRelax",
  selectFaces: "meshTess.selectFaces",
  triangulateMesh: "meshTess.triangulateMesh",
  generateGeodesicSphere: "meshTess.generateGeodesicSphere",
  generateHexagonalTiling: "meshTess.generateHexagonalTiling",
  generateVoronoiPattern: "meshTess.generateVoronoiPattern",
  offsetPattern: "meshTess.offsetPattern",
  generateMeshUVs: "meshTess.generateMeshUVs",
  repairMesh: "meshTess.repairMesh",
  decimateMesh: "meshTess.decimateMesh",
  quadDominantRemesh: "meshTess.quadDominantRemesh",
  meshBoolean: "meshTess.meshBoolean",
  
  // math operations
  computeBestFitPlane: "math.computeBestFitPlane",
  projectPointToPlane: "math.projectPointToPlane",
  unprojectPointFromPlane: "math.unprojectPointFromPlane",
  
  // curve operations
  resampleByArcLength: "curve.resampleByArcLength",
  
  // boolean operations
  offsetPolyline2D: "boolean.offsetPolyline2D",
  
  // brep operations
  brepFromMesh: "brep.brepFromMesh",
  tessellateBRepToMesh: "brep.tessellateBRepToMesh",
  
  // tessellation operations
  tessellateCurveAdaptive: "tess.tessellateCurveAdaptive",
  tessellateSurfaceAdaptive: "tess.tessellateSurfaceAdaptive",
};

/**
 * Extract function calls from text
 */
function extractFunctionCalls(text) {
  const calls = new Set();
  
  // Match function calls: functionName(
  const callPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  let match;
  
  while ((match = callPattern.exec(text)) !== null) {
    const functionName = match[1];
    if (FUNCTION_TO_OP_ID[functionName]) {
      calls.add(FUNCTION_TO_OP_ID[functionName]);
    }
  }
  
  return Array.from(calls).sort();
}

/**
 * Parse nodeRegistry.ts and extract semantic ops for each node
 */
function analyzeNodeRegistry(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  
  // Find the NODE_DEFINITIONS array
  const nodeDefsMatch = content.match(/export const NODE_DEFINITIONS[^=]*=\s*\[([\s\S]*)\];?\s*$/m);
  if (!nodeDefsMatch) {
    console.error("Could not find NODE_DEFINITIONS array");
    return [];
  }
  
  const results = [];
  
  // Split by node boundaries (look for },\n  {)
  // This is a simple heuristic that works for the current format
  const nodes = content.split(/\n  \{\n    type:/);
  
  for (let i = 1; i < nodes.length; i++) {
    const nodeText = nodes[i];
    
    // Extract node type
    const typeMatch = nodeText.match(/^\s*["']([^"']+)["']/);
    if (!typeMatch) continue;
    
    const nodeType = typeMatch[1];
    
    // Extract compute function
    const computeMatch = nodeText.match(/compute:\s*\([^)]*\)\s*=>\s*(\{[\s\S]*?\n    \})/);
    if (!computeMatch) {
      // Try arrow function with implicit return
      const implicitMatch = nodeText.match(/compute:\s*\([^)]*\)\s*=>\s*\([\s\S]*?\)/);
      if (implicitMatch) {
        const operations = extractFunctionCalls(implicitMatch[0]);
        if (operations.length > 0) {
          results.push({ nodeType, operations });
        }
      }
      continue;
    }
    
    const computeBody = computeMatch[0];
    const operations = extractFunctionCalls(computeBody);
    
    if (operations.length > 0) {
      results.push({ nodeType, operations });
    }
  }
  
  return results;
}

/**
 * Generate report
 */
function generateReport(results) {
  let report = "# Node Semantic Operations Analysis\n\n";
  report += `Total nodes analyzed: ${results.length}\n\n`;
  
  // Group by operation
  const opToNodes = new Map();
  for (const result of results) {
    for (const op of result.operations) {
      if (!opToNodes.has(op)) {
        opToNodes.set(op, []);
      }
      opToNodes.get(op).push(result.nodeType);
    }
  }
  
  report += "## Operations by Usage\n\n";
  const sortedOps = Array.from(opToNodes.entries()).sort((a, b) => b[1].length - a[1].length);
  for (const [op, nodes] of sortedOps) {
    report += `- **${op}**: ${nodes.length} nodes\n`;
    report += `  - ${nodes.join(", ")}\n`;
  }
  
  report += "\n## Nodes by Operation Count\n\n";
  const sortedNodes = results.sort((a, b) => b.operations.length - a.operations.length);
  for (const node of sortedNodes) {
    report += `- **${node.nodeType}**: ${node.operations.length} operations\n`;
    report += `  - ${node.operations.join(", ")}\n`;
  }
  
  return report;
}

/**
 * Main execution
 */
function main() {
  const nodeRegistryPath = path.join(process.cwd(), "client/src/workflow/nodeRegistry.ts");
  
  console.log("Analyzing nodeRegistry.ts...");
  const results = analyzeNodeRegistry(nodeRegistryPath);
  
  console.log(`Found ${results.length} nodes with semantic operations`);
  
  // Generate report
  const report = generateReport(results);
  const reportPath = path.join(process.cwd(), "docs/semantic/node-semantic-ops-analysis.md");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);
  console.log(`Report written to ${reportPath}`);
  
  // Generate JSON for programmatic access
  const json = JSON.stringify(
    results.reduce((acc, r) => {
      acc[r.nodeType] = r.operations;
      return acc;
    }, {}),
    null,
    2
  );
  const jsonPath = path.join(process.cwd(), "docs/semantic/node-semantic-ops.json");
  fs.writeFileSync(jsonPath, json);
  console.log(`JSON written to ${jsonPath}`);
  
  console.log("\n✅ Analysis complete!");
  console.log(`\nNext steps:`);
  console.log(`1. Review the report: ${reportPath}`);
  console.log(`2. Update nodeRegistry.ts to add semanticOps arrays`);
  console.log(`3. Run validation: npm run semantic:validate`);
}

main();
