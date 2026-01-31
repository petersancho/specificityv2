# Numerica Workflow — Implementation Map (Aligned to Codebase)

This map replaces the prototype TS/TSX files that lived in this folder. It points to the
actual runtime implementation in `client/src` and names the closest equivalents to the
concepts in the philosophy/spec docs.

## Core Runtime

- **Workflow execution engine**
  - `client/src/workflow/workflowEngine.ts`
  - Evaluates nodes, resolves ports, handles cycles, and writes outputs back to node data.

- **Node registry + compute logic**
  - `client/src/workflow/nodeRegistry.ts`
  - All node definitions, parameters, port specs, compute implementations, and helpers.

- **Node type catalog**
  - `client/src/workflow/nodeTypes.ts`
  - Supported node type list and type guards.

## UI Surface (Numerical Canvas)

- **Canvas renderer + interaction model**
  - `client/src/components/workflow/NumericalCanvas.tsx`
  - Node layout, ports, edges, selection, context menus, and geometry viewer embedding.

- **Node palette + parameters panel**
  - `client/src/components/workflow/WorkflowSection.tsx`
  - Palette categories, node search, parameter editing, workflow tools.

- **Panel (multiline list) rendering**
  - `client/src/components/workflow/panelFormat.ts`
  - `client/src/components/workflow/NumericalCanvas.tsx`

- **Workflow validation rules**
  - `client/src/components/workflow/workflowValidation.ts`

## Geometry Integration (Roslyn)

- **Workflow → geometry synchronization**
  - `client/src/store/useProjectStore.ts`
  - Applies node outputs to geometry (points, curves, surfaces, arrays, etc.).

- **Geometry preview (node-level viewer)**
  - `client/src/components/workflow/WorkflowGeometryViewer.tsx`
  - Renders geometry (including geometry lists) in node mini-viewport.

- **Render adapter + WebGL pipeline**
  - `client/src/geometry/renderAdapter.ts`
  - `client/src/webgl/*`

## Concept Mapping (Specs → Real Nodes)

- **Parameter slider** → `slider`
  - Definition: `client/src/workflow/nodeRegistry.ts`
  - UI: `client/src/components/workflow/WorkflowSection.tsx`

- **Expression evaluator** → `expression`
  - Definition: `client/src/workflow/nodeRegistry.ts`

- **Range / sequence generators** → `range`, `linspace`, `repeat`
  - Definition: `client/src/workflow/nodeRegistry.ts`

- **List transforms / stats** → `list*` nodes (sum, average, min, max, etc.)
  - Definition: `client/src/workflow/nodeRegistry.ts`

- **Geometry extraction (vertices, edges, faces, normals)**
  - `geometryVertices`, `geometryEdges`, `geometryFaces`, `geometryNormals`
  - Definition: `client/src/workflow/nodeRegistry.ts`

- **Point cloud constructor** → `pointCloud`
  - Definition: `client/src/workflow/nodeRegistry.ts`
  - Geometry application: `client/src/store/useProjectStore.ts`

- **Geometry preview** → `geometryViewer`
  - Definition: `client/src/workflow/nodeRegistry.ts`
  - Viewer: `client/src/components/workflow/WorkflowGeometryViewer.tsx`

## Styling + Visual Language

- **Canvas + node chrome**
  - `client/src/components/workflow/WorkflowSection.module.css`
  - `client/src/components/workflow/NumericalCanvas.tsx`

- **Iconography**
  - `client/src/webgl/ui/WebGLIconRenderer.ts`

## Removed Prototypes

The following prototype files were removed from this docs folder because their
implementations now live in the runtime codebase:

- `CatalystNodes.tsx`
- `CoreNodes.tsx`
- `EnhancedRegistry.ts`
- `ExemplarWorkflows.ts`
- `MultilineListOutput.tsx`
- `nodeRegistry.ts`
- `workflowEngine.ts`
- `workflow-types.ts`
- `CoreNodes-Branded.css`
- `MultilineListOutput-Branded.css`

If you want a runnable example set, create it under:
- `client/src/workflow/examples/*`

