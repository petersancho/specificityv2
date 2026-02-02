/**
 * Wire Semantic Operations to Nodes
 * 
 * This script systematically adds semanticOps to nodes that are missing them.
 * It maps node types to their corresponding semantic operations based on naming conventions.
 */

import * as fs from 'fs';
import * as path from 'path';

// Mapping of node types to semantic operations
const NODE_TO_SEMANTIC_OP_MAP: Record<string, string[]> = {
  // Math operations
  'modulo': ['math.modulo'],
  'power': ['math.power'],
  'floor': ['math.floor'],
  'ceil': ['math.ceil'],
  'round': ['math.round'],
  'abs': ['math.abs'],
  'negate': ['math.negate'],
  'sqrt': ['math.sqrt'],
  'sin': ['math.sin'],
  'cos': ['math.cos'],
  'tan': ['math.tan'],
  'asin': ['math.asin'],
  'acos': ['math.acos'],
  'atan': ['math.atan'],
  'atan2': ['math.atan2'],
  'exp': ['math.exp'],
  'log': ['math.log'],
  'log10': ['math.log10'],
  'lerp': ['math.lerp'],
  'equal': ['math.equal'],
  'notEqual': ['math.notEqual'],
  'lessThan': ['math.lessThan'],
  'lessThanOrEqual': ['math.lessThanOrEqual'],
  'greaterThan': ['math.greaterThan'],
  'greaterThanOrEqual': ['math.greaterThanOrEqual'],
  
  // Logic operations
  'and': ['logic.and'],
  'or': ['logic.or'],
  'not': ['logic.not'],
  'xor': ['logic.xor'],
  'if': ['logic.if'],
  'compare': ['logic.compare'],
  
  // Data operations
  'listCreate': ['data.collect'],
  'listFlatten': ['data.flatten'],
  'listFilter': ['data.filter'],
  'listMap': ['data.map'],
  'listReduce': ['data.reduce'],
  'listSort': ['data.sort'],
  'listUnique': ['data.unique'],
  'listLength': ['data.length'],
  'listItem': ['data.index'],
  
  // String operations
  'stringConcat': ['string.concat'],
  'stringSplit': ['string.split'],
  'stringReplace': ['string.replace'],
  'stringSubstring': ['string.substring'],
  'stringLength': ['string.length'],
  'stringToNumber': ['string.toNumber'],
  'stringFormat': ['string.format'],
  
  // Color operations
  'hexToRgb': ['color.hexToRgb'],
  'rgbToHex': ['color.rgbToHex'],
  'rgbToHsl': ['color.rgbToHsl'],
  'hslToRgb': ['color.hslToRgb'],
  'colorBlend': ['color.blend'],
  'colorClamp': ['color.clamp'],
  
  // Vector operations
  'vectorMultiply': ['vector.multiply'],
  'vectorDivide': ['vector.divide'],
  'vectorDistance': ['vector.distance'],
  
  // Workflow operations
  'identity': ['workflow.identity'],
  'constant': ['workflow.constant'],
  
  // Mesh operations
  'meshConvert': ['command.meshConvert'],
  'nurbsToMesh': ['command.meshConvert'],
  'brepToMesh': ['brep.tessellateBRepToMesh', 'command.brepToMesh'],
  'meshToBrep': ['brep.brepFromMesh', 'command.meshToBrep'],
  'subdivideMesh': ['meshTess.subdivideLinear'],
  'dualMesh': ['meshTess.dualMesh'],
  'insetFaces': ['meshTess.insetFaces'],
  'extrudeFaces': ['meshTess.extrudeFaces'],
  'meshRelax': ['meshTess.meshRelax'],
  'selectFaces': ['meshTess.selectFaces'],
  'meshBoolean': ['meshTess.meshBoolean'],
  'triangulateMesh': ['meshTess.triangulateMesh'],
  'geodesicSphere': ['meshTess.generateGeodesicSphere'],
  'voronoiPattern': ['meshTess.generateVoronoiPattern'],
  'hexagonalTiling': ['meshTess.generateHexagonalTiling'],
  'offsetPattern': ['meshTess.offsetPattern'],
  'meshRepair': ['meshTess.repairMesh'],
  'meshUVs': ['meshTess.generateMeshUVs'],
  'meshDecimate': ['meshTess.decimateMesh'],
  'quadRemesh': ['meshTess.quadDominantRemesh'],
};

function main() {
  const nodeRegistryPath = path.join(process.cwd(), 'client/src/workflow/nodeRegistry.ts');
  let content = fs.readFileSync(nodeRegistryPath, 'utf8');
  
  let changesCount = 0;
  
  // For each node type in the map, find the node definition and add semanticOps if missing
  for (const [nodeType, semanticOps] of Object.entries(NODE_TO_SEMANTIC_OP_MAP)) {
    // Pattern to match node definition without semanticOps
    const pattern = new RegExp(
      `(\\{\\s*type:\\s*["']${nodeType}["'][^}]*?)(\\n\\s*label:)`,
      'g'
    );
    
    // Check if this node already has semanticOps
    const hasSemanticOpsPattern = new RegExp(
      `type:\\s*["']${nodeType}["'][^}]*?semanticOps:`,
      's'
    );
    
    if (!hasSemanticOpsPattern.test(content)) {
      // Add semanticOps after type
      const semanticOpsStr = `\n    semanticOps: ${JSON.stringify(semanticOps)},`;
      content = content.replace(pattern, `$1${semanticOpsStr}$2`);
      changesCount++;
      console.log(`✓ Added semanticOps to ${nodeType}: ${semanticOps.join(', ')}`);
    }
  }
  
  if (changesCount > 0) {
    fs.writeFileSync(nodeRegistryPath, content, 'utf8');
    console.log(`\n✅ Added semanticOps to ${changesCount} nodes`);
  } else {
    console.log('\n✅ No changes needed - all nodes already have semanticOps');
  }
}

main();
