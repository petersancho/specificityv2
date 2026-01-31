# Numerica Node Development Guide

**Purpose:** Complete guide for creating, modifying, and testing Numerica workflow nodes. Use this when adding new nodes or enhancing existing ones.

**Last Updated:** 2026-01-31

---

## Overview

Numerica nodes are the building blocks of the visual programming system. Each node:
- Receives inputs from connected upstream nodes
- Has configurable parameters
- Computes outputs that flow downstream
- Integrates with the geometry kernel for geometric operations

---

## Quick Start: Adding a New Node

### 1. Add Node Type

In `client/src/workflow/nodeTypes.ts`:

```typescript
export const SUPPORTED_WORKFLOW_NODE_TYPES = [
  // ... existing types
  "myNewNode",
] as const;
```

### 2. Register Node Definition

In `client/src/workflow/nodeRegistry.ts`, add to `NODE_DEFINITIONS`:

```typescript
{
  type: "myNewNode",
  label: "My New Node",
  shortLabel: "MyNew",
  description: "Brief description of what this node does.",
  category: "modifiers",  // See categories below
  iconId: "transform",    // See IconId type
  
  inputs: [
    { key: "geometry", label: "Geometry", type: "geometry", required: true },
    { key: "amount", label: "Amount", type: "number", parameterKey: "amount" },
  ],
  
  outputs: [
    { key: "geometry", label: "Geometry", type: "geometry" },
    { key: "value", label: "Value", type: "number" },
  ],
  
  parameters: [
    { key: "amount", label: "Amount", type: "slider", defaultValue: 1, min: 0, max: 10, step: 0.1 },
  ],
  
  compute: (args) => {
    const { inputs, parameters, context } = args;
    // Implementation here
    return { geometry: "output-id", value: 42 };
  },
},
```

### 3. Add to Palette (if needed)

In `client/src/components/workflow/WorkflowSection.tsx`, add to the appropriate category.

### 4. Run Tests

```bash
npm test -w client
```

---

## Node Definition Structure

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | `NodeType` | Unique identifier matching `nodeTypes.ts` |
| `label` | `string` | Display name in palette and node header |
| `shortLabel` | `string` | Abbreviated name for compact display |
| `description` | `string` | Tooltip/help text |
| `category` | `NodeCategoryId` | Grouping in palette |
| `iconId` | `IconId` | Visual icon identifier |
| `inputs` | `WorkflowPortSpec[]` | Input port definitions |
| `outputs` | `WorkflowPortSpec[]` | Output port definitions |
| `parameters` | `WorkflowParameterSpec[]` | Node configuration |
| `compute` | `Function` | Evaluation logic |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `display` | `object` | Additional display metadata (Greek names, etc.) |
| `primaryOutputKey` | `string` | Default output for single-connection scenarios |

---

## Node Categories

| Category ID | Label | Use For |
|-------------|-------|---------|
| `data` | Data | References, annotations, panels |
| `basics` | Basics | Vectors, origins, unit vectors |
| `lists` | Lists | List manipulation operations |
| `primitives` | Primitives | Geometry creation (box, sphere, etc.) |
| `curves` | Curves | Line, polyline, rectangle |
| `nurbs` | NURBS | Arc, circle, smooth curves |
| `mesh` | Mesh | Mesh-specific operations |
| `tessellation` | Tessellation | Subdivision, remeshing |
| `modifiers` | Modifiers | Boolean, fillet, offset |
| `transforms` | Transforms | Move, rotate, scale |
| `arrays` | Arrays | Linear, grid, polar arrays |
| `euclidean` | Euclidean | Vector math, distances |
| `ranges` | Ranges | Linspace, range, remap |
| `signals` | Signals | Wave generators |
| `analysis` | Analysis | Geometry inspection |
| `measurement` | Measurement | Dimensions, lengths |
| `voxel` | Voxel | Voxel operations |
| `solver` | Solver | Physics, biological solvers |
| `goal` | Goal | Solver objectives |
| `math` | Math | Arithmetic operations |
| `logic` | Logic | Conditional, boolean ops |
| `interop` | Interchange | Import/export |

---

## Port Types

### Input/Output Types

| Type | Description | Example Value |
|------|-------------|---------------|
| `number` | Numeric value | `42`, `3.14` |
| `boolean` | True/false | `true`, `false` |
| `string` | Text | `"hello"` |
| `vector` | 3D vector | `{ x: 1, y: 2, z: 3 }` |
| `geometry` | Geometry ID | `"mesh-123-456"` |
| `goal` | Solver goal spec | Goal object |
| `any` | Accepts any type | Various |

### Port Specification

```typescript
type WorkflowPortSpec = {
  key: string;          // Unique identifier
  label: string;        // Display name
  type: WorkflowPortType;
  required?: boolean;   // Default: false
  allowMultiple?: boolean;  // Accept multiple connections
  description?: string; // Tooltip
  parameterKey?: string;  // Link to parameter for fallback value
  defaultValue?: unknown; // Default when unconnected
};
```

---

## Parameter Types

### Available Types

| Type | UI Control | Use For |
|------|------------|---------|
| `number` | Text input | Numeric values |
| `slider` | Slider | Bounded numeric values |
| `boolean` | Checkbox | On/off toggles |
| `string` | Text input | Text values |
| `textarea` | Multi-line input | Long text |
| `select` | Dropdown | Choice from options |
| `color` | Color picker | Color values |
| `file` | File picker | File inputs |

### Parameter Specification

```typescript
type WorkflowParameterSpec = {
  key: string;
  label: string;
  type: WorkflowParameterType;
  defaultValue: unknown;
  min?: number;         // For slider/number
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];  // For select
  accept?: string;      // For file (MIME types)
  description?: string;
  enabled?: (parameters: Record<string, unknown>) => boolean;  // Conditional visibility
};
```

### Slider Example

```typescript
{
  key: "intensity",
  label: "Intensity",
  type: "slider",
  defaultValue: 0.5,
  min: 0,
  max: 1,
  step: 0.01,
}
```

### Select Example

```typescript
{
  key: "mode",
  label: "Mode",
  type: "select",
  defaultValue: "union",
  options: [
    { value: "union", label: "Union" },
    { value: "difference", label: "Difference" },
    { value: "intersection", label: "Intersection" },
  ],
}
```

---

## Compute Function

### Signature

```typescript
compute: (args: WorkflowComputeArgs) => Record<string, WorkflowValue>
```

### Arguments

```typescript
type WorkflowComputeArgs = {
  inputs: Record<string, WorkflowValue>;    // Connected input values
  parameters: Record<string, unknown>;       // Node parameter values
  context: {
    nodeId: string;                          // Current node's ID
    geometryById: Map<string, Geometry>;     // All geometry in scene
    vertexById: Map<string, VertexGeometry>; // All vertices
  };
};
```

### Return Value

Return an object with keys matching your output port keys:

```typescript
return {
  geometry: "mesh-123",  // Matches output key "geometry"
  area: 42.5,            // Matches output key "area"
};
```

Return `null` to indicate computation failure (inputs invalid/missing).

---

## Common Patterns

### Reading Inputs Safely

```typescript
compute: (args) => {
  const { inputs, parameters, context } = args;
  
  // Number with fallback
  const amount = toNumber(inputs.amount, parameters.amount as number ?? 1);
  
  // Boolean with fallback
  const enabled = toBoolean(inputs.enabled, parameters.enabled as boolean ?? true);
  
  // Geometry lookup
  const geomId = inputs.geometry as string;
  const geometry = context.geometryById.get(geomId);
  if (!geometry) return null;  // Required input missing
  
  // Vector input
  const vec = inputs.direction as { x: number; y: number; z: number } | undefined;
  const direction = vec ?? { x: 0, y: 1, z: 0 };
  
  // ...
}
```

### Helper Functions

These are defined in `nodeRegistry.ts`:

```typescript
// Convert to number with fallback
const toNumber = (value: WorkflowValue, fallback: number): number

// Convert to boolean with fallback
const toBoolean = (value: WorkflowValue, fallback: boolean): boolean

// Read parameter as number
const readNumberParameter = (parameters: Record<string, unknown>, key: string, fallback: number): number

// Read parameter as boolean
const readBooleanParameter = (parameters: Record<string, unknown>, key: string, fallback: boolean): boolean

// Clamp number to range
const clampNumber = (value: number, min: number, max: number): number
```

### Working with Geometry

```typescript
compute: (args) => {
  const { inputs, context } = args;
  
  // Get input geometry
  const geomId = inputs.geometry as string;
  const geometry = context.geometryById.get(geomId);
  if (!geometry) return null;
  
  // Get mesh from geometry
  let mesh: RenderMesh;
  if (geometry.type === "mesh") {
    mesh = geometry.mesh;
  } else if ("mesh" in geometry && geometry.mesh) {
    mesh = geometry.mesh as RenderMesh;
  } else {
    return null;  // Can't process this geometry type
  }
  
  // Process mesh...
  const newMesh = transformMesh(mesh, ...);
  
  // Return geometry ID (store handles actual creation)
  return { geometry: geomId };
}
```

### Creating New Geometry

```typescript
compute: (args) => {
  const { parameters, context } = args;
  
  // Generate mesh using geometry kernel
  const mesh = generateBoxMesh({
    width: readNumberParameter(parameters, "width", 1),
    height: readNumberParameter(parameters, "height", 1),
    depth: readNumberParameter(parameters, "depth", 1),
  }, 1);
  
  // Use provided geometry ID or generate one
  const geometryId = parameters.geometryId as string ?? `box-${context.nodeId}`;
  
  // Compute additional outputs
  const volume = computeMeshVolume(mesh.positions, mesh.indices);
  const area = computeMeshArea(mesh.positions, mesh.indices);
  
  return {
    geometry: geometryId,
    mesh,
    volume,
    area,
  };
}
```

### List Outputs

```typescript
compute: (args) => {
  const { inputs } = args;
  const points = inputs.points as { x: number; y: number; z: number }[];
  
  // Process and return list
  const distances = points.map((p, i) => {
    if (i === 0) return 0;
    return distance(points[i - 1], p);
  });
  
  return {
    distances,  // Array output
    total: distances.reduce((sum, d) => sum + d, 0),
  };
}
```

---

## Testing Nodes

### Unit Tests

Create tests in `client/src/__tests__/` or `client/src/test-rig/validation/`:

```typescript
import { describe, expect, it } from "vitest";
import { NODE_DEFINITIONS } from "../workflow/nodeRegistry";

describe("myNewNode", () => {
  it("computes correct output", () => {
    const node = NODE_DEFINITIONS.find(n => n.type === "myNewNode");
    expect(node).toBeDefined();
    
    const result = node!.compute({
      inputs: { amount: 5 },
      parameters: { multiplier: 2 },
      context: {
        nodeId: "test",
        geometryById: new Map(),
        vertexById: new Map(),
      },
    });
    
    expect(result.value).toBe(10);
  });
});
```

### Validation Pattern

For comprehensive node validation, use the test-rig pattern:

```typescript
// In client/src/test-rig/validation/mynode_validation.ts
import { NODE_DEFINITIONS } from "../../workflow/nodeRegistry";
import { logValidation, generateReport, resetValidationLog } from "./validation-log";

export const runMyNodeValidation = () => {
  resetValidationLog();
  
  const node = NODE_DEFINITIONS.find(n => n.type === "myNewNode");
  
  try {
    // Test with valid inputs
    const result = node.compute({
      inputs: { /* ... */ },
      parameters: { /* ... */ },
      context: createContext(),
    });
    
    ensure(result !== null, "Should return result");
    ensure(typeof result.value === "number", "Should have numeric value");
    
    logValidation({
      category: "myCategory",
      nodeName: "myNewNode",
      status: "PASS",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logValidation({
      category: "myCategory",
      nodeName: "myNewNode",
      status: "FAIL",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
  
  return generateReport();
};
```

### Running Tests

```bash
# Run all tests
npm test -w client

# Run specific test file
npm test -w client -- geometryPrimitives

# Run with watch mode
npm test -w client -- --watch
```

---

## Best Practices

### Do

- **Return early** for missing required inputs
- **Use helper functions** for type conversion
- **Validate inputs** before processing
- **Keep compute pure** - no side effects
- **Cache expensive computations** when possible
- **Provide meaningful output keys** that match the data

### Don't

- **Don't mutate inputs** - always create new data
- **Don't access store directly** - use context
- **Don't throw exceptions** - return null for failures
- **Don't block** - avoid long synchronous operations
- **Don't hardcode** geometry IDs - use context.nodeId for uniqueness

### Performance Tips

1. **Early exit** - Check required inputs first
2. **Lazy evaluation** - Only compute outputs that are connected
3. **Memoization** - Cache results for unchanged inputs
4. **Typed arrays** - Use Float32Array for large numeric arrays
5. **Batch operations** - Process arrays in single loops

---

## Geometry Kernel Integration

### Common Imports

```typescript
import {
  generateBoxMesh,
  generateSphereMesh,
  computeMeshArea,
  computeVertexNormals,
} from "../geometry/mesh";

import {
  createNurbsCurveFromPoints,
  interpolateNurbsCurve,
} from "../geometry/nurbs";

import {
  createBRepBox,
  tessellateBRepToMesh,
} from "../geometry/brep";

import {
  tessellateCurveAdaptive,
  tessellateSurfaceAdaptive,
} from "../geometry/tessellation";

import {
  add,
  sub,
  scale,
  normalize,
  cross,
  dot,
  distance,
} from "../geometry/math";
```

### See Also

- `geometry_kernel_reference.md` - Complete geometry API reference
- `geometry_types.md` - Mesh vs NURBS vs B-Rep concepts

---

## Node Examples

### Simple Math Node

```typescript
{
  type: "multiply",
  label: "Multiply",
  shortLabel: "Mul",
  description: "Multiply two numeric values.",
  category: "math",
  iconId: "calculator",
  
  inputs: [
    { key: "a", label: "A", type: "number", parameterKey: "a" },
    { key: "b", label: "B", type: "number", parameterKey: "b" },
  ],
  
  outputs: [
    { key: "result", label: "Result", type: "number" },
  ],
  
  parameters: [
    { key: "a", label: "A", type: "number", defaultValue: 1 },
    { key: "b", label: "B", type: "number", defaultValue: 1 },
  ],
  
  compute: (args) => {
    const { inputs, parameters } = args;
    const a = toNumber(inputs.a, parameters.a as number ?? 1);
    const b = toNumber(inputs.b, parameters.b as number ?? 1);
    return { result: a * b };
  },
}
```

### Geometry Processing Node

```typescript
{
  type: "scaleGeometry",
  label: "Scale Geometry",
  shortLabel: "Scale",
  description: "Scale geometry uniformly or per-axis.",
  category: "transforms",
  iconId: "resize",
  
  inputs: [
    { key: "geometry", label: "Geometry", type: "geometry", required: true },
    { key: "factor", label: "Factor", type: "number", parameterKey: "factor" },
  ],
  
  outputs: [
    { key: "geometry", label: "Geometry", type: "geometry" },
  ],
  
  parameters: [
    { key: "factor", label: "Scale Factor", type: "slider", defaultValue: 1, min: 0.01, max: 10, step: 0.01 },
    { key: "uniform", label: "Uniform", type: "boolean", defaultValue: true },
  ],
  
  compute: (args) => {
    const { inputs, parameters, context } = args;
    
    const geomId = inputs.geometry as string;
    const geometry = context.geometryById.get(geomId);
    if (!geometry) return null;
    
    const factor = toNumber(inputs.factor, parameters.factor as number ?? 1);
    
    // Scale operation would go here...
    
    return { geometry: geomId };
  },
}
```

### Vector Operation Node

```typescript
{
  type: "vectorAdd",
  label: "Vector Add",
  shortLabel: "V+",
  description: "Add two vectors component-wise.",
  category: "euclidean",
  iconId: "plus",
  
  inputs: [
    { key: "a", label: "A", type: "vector", required: true },
    { key: "b", label: "B", type: "vector", required: true },
  ],
  
  outputs: [
    { key: "result", label: "Result", type: "vector" },
    { key: "x", label: "X", type: "number" },
    { key: "y", label: "Y", type: "number" },
    { key: "z", label: "Z", type: "number" },
  ],
  
  parameters: [],
  
  compute: (args) => {
    const { inputs } = args;
    
    const a = inputs.a as { x: number; y: number; z: number } | undefined;
    const b = inputs.b as { x: number; y: number; z: number } | undefined;
    
    if (!a || !b) return null;
    
    const result = add(a, b);
    
    return {
      result,
      x: result.x,
      y: result.y,
      z: result.z,
    };
  },
}
```

---

## Troubleshooting

### Node Not Appearing in Palette

1. Check `nodeTypes.ts` includes the type
2. Check `nodeRegistry.ts` has the definition
3. Check category is valid
4. Restart dev server

### Compute Returns Null Unexpectedly

1. Add console.log to trace inputs
2. Check required inputs are connected
3. Verify geometry IDs exist in context
4. Check type conversions

### Type Errors

1. Ensure NodeType includes your type string
2. Check port types match expected data
3. Verify parameter types are correct

### Performance Issues

1. Profile with `performance.now()`
2. Check for unnecessary re-computation
3. Look for N² algorithms
4. Consider Web Worker for heavy computation

---

## Regenerating Documentation

After adding/modifying nodes, regenerate the reference docs:

```bash
node tools/docgen.cjs
node tools/generateNodeDocs.cjs
```

This updates:
- `docs/numerica_nodes_reference.md`
- `docs/numerica_node_library.md`
- `docs/numerica_command_reference.md`
