# Workflow Semantic Organization

## Overview

This document establishes the semantic and ontological organization principles for Lingua's workflow system. It ensures that types, input/output names, linkages, documentation, and naming conventions are consistent, modular, and maintainable across all nodes.

## Core Principle

**The UI should be locked to only present outputs or inputs to users that exist in the backend.**

This means:
- UI components read port definitions from `nodeRegistry.ts`
- UI renders handles strictly from `nodeDef.inputs` and `nodeDef.outputs`
- Parameters render separately and never create "ports"
- No hardcoded ports or parameters in UI components
- No ad-hoc types or string literals

## Semantic Layers

### 1. Type System

**Location:** `client/src/workflow/types.ts` and `client/src/workflow/nodeRegistry.ts`

**Port Types:**
- `number` - Scalar numeric values
- `string` - Text data
- `boolean` - True/false values
- `vector` - 3D vectors {x, y, z}
- `geometry` - Geometry IDs (references to 3D objects)
- `mesh` - Mesh data structures
- `renderMesh` - Renderable mesh with positions/normals/uvs/indices
- `voxelGrid` - Voxel grid data structures
- `goal` - Optimization goal specifications
- `fitnessSpec` - Fitness function specifications
- `genomeSpec` - Genome specifications
- `phenotypeSpec` - Phenotype specifications
- `any` - Wildcard type (use sparingly)

**Parameter Types:**
- `number` - Numeric input with min/max/step
- `string` - Text input
- `boolean` - Checkbox
- `select` - Dropdown with options
- `slider` - Slider with min/max/step
- `color` - Color picker
- `vector` - 3D vector input (x, y, z)

### 2. Naming Conventions

**Input Port Keys:**
- Use semantic names: `geometry`, `resolution`, `width`, `height`, `domain`, `goals`
- Use `lowerCamelCase`
- Should describe what the node receives
- Should match the conceptual input

**Output Port Keys:**
- Use semantic names: `voxelGrid`, `cellCount`, `fillRatio`, `geometry`, `mesh`
- Use `lowerCamelCase`
- Should describe what the node produces
- Should match the conceptual output

**Parameter Keys:**
- Use semantic names with optional prefix: `resolution`, `boxWidth`, `sphereRadius`, `gridResolution`
- Use `lowerCamelCase`
- Should describe what the user configures
- May include node-specific prefix to avoid collisions (e.g., `boxWidth` vs `sphereRadius`)

**Node Type IDs:**
- Use `lowerCamelCase`
- Should be descriptive and unique: `box`, `sphere`, `voxelSolver`, `slider`, `textNote`
- Should match the node's primary function

**Labels:**
- Use Title Case: "Geometry", "Resolution", "Voxel Grid"
- Should be human-readable
- Should be concise (1-3 words)

### 3. Input Port ↔ Parameter Linking

**Convention:** When an input port has a corresponding parameter, the input port MUST include:
- `parameterKey: "<parameter_key>"` - links to the parameter
- `defaultValue: <value>` - fallback when no edge and no parameter

**Example:**
```typescript
inputs: [
  { 
    key: "resolution", 
    label: "Resolution", 
    type: "number", 
    parameterKey: "resolution",
    defaultValue: 16,
    description: "Number of voxels along the longest axis (8-128).",
  },
],
parameters: [
  { 
    key: "resolution", 
    label: "Resolution", 
    type: "number", 
    defaultValue: 16, 
    min: 4, 
    max: 128, 
    step: 1,
    description: "Number of voxels along the longest axis.",
  },
],
```

**Fallback Chain:**
1. Incoming edge value (highest priority)
2. Parameter value (if `parameterKey` is set)
3. Default value (if `defaultValue` is set)
4. `undefined` (lowest priority)

### 4. Data Flow Semantics

**Input → Function → Output:**

Every node follows this pattern:
```
Input Ports → Compute Function → Output Ports
     ↓              ↓                  ↓
  Values      Processing           Results
```

**Example (VoxelSolver):**
```
geometry (input) ──┐
                   ├──> voxelize() ──> voxelGrid (output)
resolution (input) ┘                   cellCount (output)
                                       filledCount (output)
                                       fillRatio (output)
```

**Example (Box):**
```
width (input) ──┐
height (input) ─┼──> buildBox() ──> geometry (output)
depth (input) ──┘                    volume (output)
                                     width (output)
                                     height (output)
                                     depth (output)
```

### 5. Node Definition Schema

**Required Fields:**
- `type` - Unique node type ID (string)
- `label` - Human-readable name (string)
- `shortLabel` - Abbreviated name for compact display (string, 2-4 chars)
- `description` - Brief description of node function (string)
- `category` - Node category for organization (string)
- `iconId` - Icon identifier (string)
- `inputs` - Array of input port definitions
- `outputs` - Array of output port definitions
- `parameters` - Array of parameter definitions
- `compute` - Compute function that processes inputs and returns outputs

**Optional Fields:**
- `primaryOutputKey` - Key of the primary output port (string)
- `display` - Display metadata (Greek name, English name, romanization)

**Input Port Schema:**
```typescript
{
  key: string;              // Unique port key
  label: string;            // Human-readable label
  type: PortType;           // Port type from type registry
  parameterKey?: string;    // Links to parameter (optional)
  defaultValue?: unknown;   // Fallback value (optional)
  allowMultiple?: boolean;  // Allow multiple incoming edges (optional)
  required?: boolean;       // Port is required (optional)
  description?: string;     // Port description (optional)
}
```

**Output Port Schema:**
```typescript
{
  key: string;              // Unique port key
  label: string;            // Human-readable label
  type: PortType;           // Port type from type registry
  required?: boolean;       // Port is required (optional)
  description?: string;     // Port description (optional)
}
```

**Parameter Schema:**
```typescript
{
  key: string;              // Unique parameter key
  label: string;            // Human-readable label
  type: ParameterType;      // Parameter type from type registry
  defaultValue: unknown;    // Default value
  min?: number;             // Minimum value (for numbers)
  max?: number;             // Maximum value (for numbers)
  step?: number;            // Step size (for numbers)
  options?: Array<{         // Options (for select)
    value: string;
    label: string;
  }>;
  description?: string;     // Parameter description (optional)
}
```

### 6. Compute Function Signature

**Standard Signature:**
```typescript
compute: (args: WorkflowComputeArgs) => Record<string, WorkflowValue>
```

**WorkflowComputeArgs:**
```typescript
{
  inputs: Record<string, WorkflowValue>;      // Input port values
  parameters: Record<string, unknown>;        // Parameter values
  context: {
    nodeId: string;                           // Node ID
    geometryById: Map<string, Geometry>;      // Geometry lookup
    vertexById: Map<string, VertexGeometry>;  // Vertex lookup
  };
  updateGeometry?: (mesh: RenderMesh) => void; // Geometry update callback
}
```

**Return Value:**
```typescript
Record<string, WorkflowValue>  // Output port values keyed by port key
```

**Example:**
```typescript
compute: ({ inputs, parameters, updateGeometry }) => {
  // Read inputs with fallback to parameters
  const resolution = Math.max(4, Math.min(128, Math.round(
    inputs.resolution ?? parameters.resolution ?? 16
  )));
  
  const geometry = inputs.geometry as Geometry | undefined;
  
  // Process inputs
  const voxelGrid = voxelizeGeometry(geometry.mesh, resolution);
  
  // Update geometry if callback provided
  if (updateGeometry) {
    const voxelMesh = generateVoxelMesh(voxelGrid);
    updateGeometry(voxelMesh);
  }
  
  // Return outputs
  return {
    voxelGrid,
    cellCount: voxelGrid.dims.nx * voxelGrid.dims.ny * voxelGrid.dims.nz,
    filledCount: countFilledVoxels(voxelGrid),
    fillRatio: calculateFillRatio(voxelGrid),
  };
}
```

## Workflow Engine

**Location:** `client/src/workflow/workflowEngine.ts`

### Evaluation Process

1. **Build Node Metadata** - Parse node definitions and parameters
2. **Prune Edges** - Remove invalid edges (type mismatches, cycles)
3. **Build Edge Index** - Index edges by target node and port
4. **Evaluate Nodes** - Topological sort and evaluate in dependency order
5. **Collect Inputs** - Gather input values from edges or parameters
6. **Compute Outputs** - Call node compute function
7. **Cache Results** - Cache outputs for reuse

### Input Value Resolution

```typescript
const collectInputValue = (
  port: WorkflowPortSpec,
  meta: NodeMeta,
  edgesByTarget: Map<TargetKey, WorkflowEdge[]>,
  evaluateOutput: (nodeId: string, outputKey: string) => WorkflowValue,
  metaById: Map<string, NodeMeta>
) => {
  const targetKey = makeTargetKey(meta.node.id, port.key);
  const incomingEdges = edgesByTarget.get(targetKey) ?? [];

  // No incoming edges - check for parameter fallback
  if (incomingEdges.length === 0) {
    if (port.parameterKey) {
      const parameterValue = meta.parameters[port.parameterKey] as WorkflowValue;
      if (parameterValue != null) {
        const coerced = coerceValueToPortType(parameterValue, port.type);
        return port.allowMultiple ? flattenWorkflowValue(coerced) : coerced;
      }
    }
    if (port.defaultValue !== undefined) {
      const coerced = coerceValueToPortType(port.defaultValue as WorkflowValue, port.type);
      return port.allowMultiple ? flattenWorkflowValue(coerced) : coerced;
    }
    return undefined;
  }

  // Has incoming edges - use those values
  const resolvedValues = incomingEdges.map((edge) => {
    const sourceMeta = metaById.get(edge.source);
    const outputKey = edge.sourceHandle ?? sourceMeta.defaultOutputKey;
    const value = evaluateOutput(edge.source, outputKey);
    return coerceValueToPortType(value, port.type);
  });

  if (!port.allowMultiple) {
    return resolvedValues[resolvedValues.length - 1];
  }

  const flattened: Array<WorkflowPrimitive | null | undefined> = [];
  resolvedValues.forEach((value) => {
    flattened.push(...flattenWorkflowValue(value));
  });
  return flattened;
};
```

**Key Points:**
- Incoming edges take priority over parameters
- `parameterKey` links input port to parameter
- `defaultValue` provides final fallback
- Type coercion ensures type safety
- `allowMultiple` enables array inputs

## UI Implementation

### Port Rendering

**Input Ports:**
- Rendered on left side of node
- Circle outline (stroke only)
- Color based on port type (CMYK palette)
- Label displayed next to port
- Tooltip shows port description

**Output Ports:**
- Rendered on right side of node
- Filled circle
- Color based on port type (CMYK palette)
- Label displayed next to port
- Tooltip shows port description

**Port Colors (CMYK Palette):**
- 🟡 Yellow (#ffdd00) - Numeric/Scalar/Vector (`number`, `vector`)
- 🟣 Magenta (#ff0099) - Logic/Boolean/Goals (`boolean`, `goal`, `fitnessSpec`)
- 🔵 Cyan (#00d4ff) - Text/String/Specs (`string`, `genomeSpec`, `phenotypeSpec`)
- ⚫ Black (#000000) - Geometry/Structure (`geometry`, `mesh`, `voxelGrid`, `any`)

### Parameter Rendering

**Parameter Controls:**
- Rendered inside node body
- Type-specific controls (slider, input, checkbox, dropdown)
- Label displayed above control
- Value displayed in control
- Tooltip shows parameter description

**Parameter Types:**
- `number` - Number input with min/max/step
- `string` - Text input
- `boolean` - Checkbox
- `select` - Dropdown
- `slider` - Slider with min/max/step
- `color` - Color picker
- `vector` - Three number inputs (x, y, z)

### Edge Rendering

**Edge Appearance:**
- Bezier curve from source port to target port
- Color matches source port type
- Stroke width indicates data flow
- Hover highlights edge
- Click selects edge

**Edge Validation:**
- Source port type must be compatible with target port type
- No self-loops (source === target)
- Single edge per target port (unless `allowMultiple`)
- Visual feedback for invalid connections

## Best Practices

### 1. Always Link Input Ports to Parameters

**DO:**
```typescript
inputs: [
  { 
    key: "resolution", 
    type: "number", 
    parameterKey: "resolution",
    defaultValue: 16,
  },
],
parameters: [
  { 
    key: "resolution", 
    type: "number", 
    defaultValue: 16, 
    min: 4, 
    max: 128, 
    step: 1,
  },
],
```

**DON'T:**
```typescript
inputs: [
  { 
    key: "resolution", 
    type: "number", 
    // Missing parameterKey!
  },
],
parameters: [
  { 
    key: "resolution", 
    type: "number", 
    defaultValue: 16, 
  },
],
```

### 2. Use Semantic Port Names

**DO:**
```typescript
inputs: [
  { key: "geometry", label: "Geometry", type: "geometry" },
  { key: "resolution", label: "Resolution", type: "number" },
],
outputs: [
  { key: "voxelGrid", label: "Voxel Grid", type: "voxelGrid" },
  { key: "cellCount", label: "Cell Count", type: "number" },
],
```

**DON'T:**
```typescript
inputs: [
  { key: "input1", label: "Input 1", type: "geometry" },
  { key: "input2", label: "Input 2", type: "number" },
],
outputs: [
  { key: "output1", label: "Output 1", type: "voxelGrid" },
  { key: "output2", label: "Output 2", type: "number" },
],
```

### 3. Provide Descriptive Labels and Descriptions

**DO:**
```typescript
{
  key: "resolution",
  label: "Resolution",
  type: "number",
  description: "Number of voxels along the longest axis (8-128).",
}
```

**DON'T:**
```typescript
{
  key: "resolution",
  label: "Res",
  type: "number",
  // Missing description!
}
```

### 4. Use Type-Safe Port Types

**DO:**
```typescript
{
  key: "geometry",
  type: "geometry",  // From type registry
}
```

**DON'T:**
```typescript
{
  key: "geometry",
  type: "any",  // Too generic, loses type safety
}
```

### 5. Validate Inputs in Compute Function

**DO:**
```typescript
compute: ({ inputs, parameters }) => {
  const geometry = inputs.geometry as Geometry | undefined;
  
  if (!geometry || !geometry.mesh) {
    return {
      voxelGrid: null,
      cellCount: 0,
      filledCount: 0,
      fillRatio: 0,
    };
  }
  
  // Process geometry...
}
```

**DON'T:**
```typescript
compute: ({ inputs, parameters }) => {
  const geometry = inputs.geometry as Geometry;
  
  // Assumes geometry exists - will crash if undefined!
  const voxelGrid = voxelizeGeometry(geometry.mesh, resolution);
}
```

## Validation Checklist

### Node Definition
- [ ] `type` is unique and descriptive
- [ ] `label` is human-readable (Title Case)
- [ ] `shortLabel` is 2-4 characters
- [ ] `description` explains node function
- [ ] `category` is from category registry
- [ ] `iconId` is from icon registry

### Input Ports
- [ ] `key` is unique within node
- [ ] `label` is human-readable (Title Case)
- [ ] `type` is from type registry
- [ ] `parameterKey` links to parameter (if applicable)
- [ ] `defaultValue` provides fallback (if applicable)
- [ ] `description` explains port purpose

### Output Ports
- [ ] `key` is unique within node
- [ ] `label` is human-readable (Title Case)
- [ ] `type` is from type registry
- [ ] `description` explains port purpose

### Parameters
- [ ] `key` is unique within node
- [ ] `label` is human-readable (Title Case)
- [ ] `type` is from parameter type registry
- [ ] `defaultValue` is provided
- [ ] `min`, `max`, `step` are set (for numbers)
- [ ] `options` are provided (for select)
- [ ] `description` explains parameter purpose

### Compute Function
- [ ] Reads inputs with fallback to parameters
- [ ] Validates inputs before processing
- [ ] Returns all declared outputs
- [ ] Handles errors gracefully
- [ ] Updates geometry if `updateGeometry` provided
- [ ] Uses type-safe casts

## Related Documentation

- [Voxel Solver Input Port Fix](./voxel-solver-input-port-fix.md)
- [CMYK Color Conventions](./cmyk-color-conventions.md)
- [Voxel Solver Rewrite](./voxel-solver-rewrite.md)
- [CMYK Branding Update](./cmyk-branding-update.md)

## References

- Workflow Engine: `client/src/workflow/workflowEngine.ts`
- Node Registry: `client/src/workflow/nodeRegistry.ts`
- Type System: `client/src/workflow/types.ts`
- Color System: `client/src/workflow/colors.ts`
