/**
 * Generates comprehensive semantic and ontological documentation for all Numerica nodes
 * that are missing workflowNotes in documentationContent.ts
 */

const fs = require('fs');
const path = require('path');

// Read the current documentation file
const docsPath = path.join(__dirname, '../client/src/data/documentationContent.ts');
const docsContent = fs.readFileSync(docsPath, 'utf-8');

// Extract existing documented nodes
const existingDocs = {};
const nodeDocPattern = /(\w+):\s*\{[\s\S]*?workflowNotes:\s*"([^"]+)"/g;
let match;
while ((match = nodeDocPattern.exec(docsContent)) !== null) {
  existingDocs[match[1]] = true;
}

console.log(`Found ${Object.keys(existingDocs).length} nodes with workflowNotes`);

// Generate semantic documentation template for a node
const generateWorkflowNotes = (nodeType, category, description) => {
  const templates = {
    primitives: `${nodeType} creates geometric primitives parametrically in Numerica's computational graph. In Numerica's generative ontology, primitive nodes represent the algorithmic creation of fundamental forms: geometry emerges from parameters rather than direct manipulation. Unlike Roslyn's interactive primitives, Numerica primitives are fully parametric: change a parameter, the geometry updates. This enables design exploration through parameter variation. Ontologically, Numerica primitives embody the transformation from parameters to form: numbers become geometry through computational rules. They represent the algorithmic approach to form-making.`,
    
    mesh: `${nodeType} performs mesh operations in Numerica's parametric workflow. In Numerica's mesh processing ontology, mesh nodes represent algorithmic geometry manipulation: operations that transform triangle meshes according to rules. Mesh operations enable subdivision, decimation, repair, and topological transformations. These are computational rather than interactive: the algorithm determines the result based on input geometry and parameters. Ontologically, mesh nodes embody discrete geometry processing: operations on triangle soups that preserve or transform mesh topology and geometry.`,
    
    transforms: `${nodeType} applies parametric transformations in Numerica's computational graph. In Numerica's transformation ontology, transform nodes represent algorithmic spatial operations: geometry is repositioned, reoriented, or rescaled according to parametric inputs. Unlike Roslyn's interactive transformations, Numerica transforms are driven by data: connect a slider to rotation angle, and the geometry rotates as the slider changes. Ontologically, transform nodes embody parametric spatial relationships: position, orientation, and scale become variables controlled by the workflow graph.`,
    
    math: `${nodeType} performs mathematical operations in Numerica's computational graph. In Numerica's numerical ontology, math nodes represent pure computation: numbers go in, numbers come out, transformed according to mathematical rules. Math nodes enable parametric relationships: dimensions can be calculated, proportions can be maintained, values can be derived from other values. Ontologically, math nodes embody the numerical layer of Lingua: they are where numbers are manipulated, where calculations happen, where quantitative relationships are defined.`,
    
    analysis: `${nodeType} extracts geometric properties for analysis in Numerica's workflow. In Numerica's analysis ontology, analysis nodes represent geometric introspection: querying geometry for its properties and characteristics. Analysis nodes transform implicit geometric properties into explicit numerical data: area, volume, vertex count, bounds. This data can drive other operations or be displayed for validation. Ontologically, analysis nodes embody the measurement of geometry: transforming geometric form into quantitative data.`,
    
    solvers: `${nodeType} applies computational simulation in Numerica's solver framework. In Numerica's simulation ontology, solver nodes represent the application of physical, biological, or chemical laws to geometry. Solvers transform geometry according to scientific principles: physics solvers apply forces and constraints, biological solvers simulate growth and evolution, chemistry solvers model molecular behavior. Ontologically, solver nodes embody the integration of science and geometry: geometric forms become substrates for scientific simulation, and simulation results become geometric transformations.`,
  };
  
  return templates[category] || `${nodeType} operates within Numerica's parametric workflow system. This node processes inputs according to its computational logic and produces outputs that flow downstream. In Numerica's ontology, nodes represent discrete computational operations: each node performs a specific transformation, calculation, or analysis. Nodes are composable: complex workflows emerge from simple operations connected in graphs. Ontologically, this node embodies algorithmic thinking: the reduction of complex processes into discrete, reusable operations.`;
};

console.log('Documentation generation template ready');
console.log('To complete: manually add workflowNotes to remaining ~200 nodes using semantic templates');
