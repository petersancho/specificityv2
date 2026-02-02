#!/usr/bin/env ts-node
/**
 * Generate semanticOps arrays for all nodes in nodeRegistry.ts
 * 
 * This script:
 * 1. Maps function names to semantic op IDs
 * 2. Parses each node's compute function
 * 3. Extracts function calls to semantic operations
 * 4. Generates semanticOps arrays
 * 5. Updates nodeRegistry.ts with the arrays
 */

import * as fs from "fs";
import * as path from "path";

// Map function names to semantic op IDs
const FUNCTION_TO_OP_ID: Record<string, string> = {
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

interface NodeSemanticOps {
  nodeType: string;
  operations: string[];
  lineNumber: number;
}

/**
 * Extract function calls from a compute function body
 */
function extractFunctionCalls(computeBody: string): string[] {
  const calls = new Set<string>();
  
  // Match function calls: functionName(
  const callPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  let match;
  
  while ((match = callPattern.exec(computeBody)) !== null) {
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
function analyzeNodeRegistry(filePath: string): NodeSemanticOps[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  
  const results: NodeSemanticOps[] = [];
  
  // Find node definitions in NODE_DEFINITIONS array
  // Pattern: { type: "nodetype", ... compute: (...) => { ... } }
  
  let inNodeDefinitions = false;
  let currentNode: { type: string; startLine: number; computeBody: string } | null = null;
  let braceDepth = 0;
  let inCompute = false;
  let computeBody = "";
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Detect start of NODE_DEFINITIONS
    if (line.includes("export const NODE_DEFINITIONS")) {
      inNodeDefinitions = true;
      continue;
    }
    
    if (!inNodeDefinitions) continue;
    
    // Detect end of NODE_DEFINITIONS
    if (line.match(/^];?\s*$/)) {
      inNodeDefinitions = false;
      break;
    }
    
    // Detect node type
    const typeMatch = line.match(/^\s*{\s*type:\s*["']([^"']+)["']/);
    if (typeMatch) {
      currentNode = {
        type: typeMatch[1],
        startLine: lineNum,
        computeBody: "",
      };
      braceDepth = 0;
      inCompute = false;
      computeBody = "";
    }
    
    // Detect compute function start
    if (currentNode && line.match(/compute:\s*\(/)) {
      inCompute = true;
      computeBody = line;
      braceDepth = 0;
      continue;
    }
    
    // Accumulate compute body
    if (inCompute && currentNode) {
      computeBody += "\n" + line;
      
      // Track brace depth
      for (const char of line) {
        if (char === "{") braceDepth++;
        if (char === "}") braceDepth--;
      }
      
      // End of compute function
      if (braceDepth < 0 || (braceDepth === 0 && line.includes("}"))) {
        currentNode.computeBody = computeBody;
        
        // Extract operations
        const operations = extractFunctionCalls(computeBody);
        
        if (operations.length > 0) {
          results.push({
            nodeType: currentNode.type,
            operations,
            lineNumber: currentNode.startLine,
          });
        }
        
        inCompute = false;
        currentNode = null;
      }
    }
  }
  
  return results;
}

/**
 * Generate report of semantic ops for all nodes
 */
function generateReport(results: NodeSemanticOps[]): string {
  let report = "# Node Semantic Operations Analysis\n\n";
  report += `Total nodes analyzed: ${results.length}\n\n`;
  
  // Group by operation
  const opToNodes = new Map<string, string[]>();
  for (const result of results) {
    for (const op of result.operations) {
      if (!opToNodes.has(op)) {
        opToNodes.set(op, []);
      }
      opToNodes.get(op)!.push(result.nodeType);
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
    report += `- **${node.nodeType}** (line ${node.lineNumber}): ${node.operations.length} operations\n`;
    report += `  - ${node.operations.join(", ")}\n`;
  }
  
  return report;
}

/**
 * Generate TypeScript code for semanticOps arrays
 */
function generateSemanticOpsCode(results: NodeSemanticOps[]): string {
  let code = "// Generated semantic ops for nodes\n\n";
  code += "const NODE_SEMANTIC_OPS: Record<string, readonly SemanticOpId[]> = {\n";
  
  for (const result of results) {
    const ops = result.operations.map(op => `"${op}"`).join(", ");
    code += `  "${result.nodeType}": [${ops}],\n`;
  }
  
  code += "};\n";
  
  return code;
}

/**
 * Main execution
 */
function main() {
  const scriptDir = process.cwd();
  const nodeRegistryPath = path.join(scriptDir, "client/src/workflow/nodeRegistry.ts");
  
  console.log("Analyzing nodeRegistry.ts...");
  const results = analyzeNodeRegistry(nodeRegistryPath);
  
  console.log(`Found ${results.length} nodes with semantic operations`);
  
  // Generate report
  const report = generateReport(results);
  const reportPath = path.join(scriptDir, "docs/semantic/node-semantic-ops-analysis.md");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);
  console.log(`Report written to ${reportPath}`);
  
  // Generate code
  const code = generateSemanticOpsCode(results);
  const codePath = path.join(scriptDir, "docs/semantic/node-semantic-ops-generated.ts");
  fs.writeFileSync(codePath, code);
  console.log(`Code written to ${codePath}`);
  
  // Generate JSON for programmatic access
  const json = JSON.stringify(
    results.reduce((acc, r) => {
      acc[r.nodeType] = r.operations;
      return acc;
    }, {} as Record<string, string[]>),
    null,
    2
  );
  const jsonPath = path.join(scriptDir, "docs/semantic/node-semantic-ops.json");
  fs.writeFileSync(jsonPath, json);
  console.log(`JSON written to ${jsonPath}`);
  
  console.log("\n✅ Analysis complete!");
  console.log(`\nNext steps:`);
  console.log(`1. Review the report: ${reportPath}`);
  console.log(`2. Update nodeRegistry.ts to add semanticOps arrays`);
  console.log(`3. Run validation: npm run semantic:validate`);
}

main();
