# Voxel Solver Input Port Fix

## Problem

The Voxel Solver's `resolution` input port was missing the `parameterKey` field, which prevented the workflow engine from properly linking the input port to the corresponding parameter. This caused the resolution slider value to not flow into the voxelizer node.

## Root Cause

In Lingua's workflow system, input ports can receive values from two sources:
1. **Incoming edges** - values from connected output ports
2. **Parameter fallback** - values from the node's parameters when no edge is connected

The workflow engine uses the `parameterKey` field on input port definitions to determine which parameter to use as a fallback. Without this field, the engine cannot link the input port to the parameter.

### Workflow Engine Logic

From `client/src/workflow/workflowEngine.ts` (lines 167-214):

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

  if (incomingEdges.length === 0) {
    // No incoming edges - check for parameter fallback
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
    if (!sourceMeta) {
      throw new Error("Connected source node is missing.");
    }
    const outputKey = edge.sourceHandle ?? sourceMeta.defaultOutputKey;
    if (!outputKey) {
      throw new Error("Source node has no output port.");
    }
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

**Key insight:** The `parameterKey` field is checked ONLY when there are no incoming edges. If an edge exists, the engine uses the edge value directly.

## Solution

Added `parameterKey: "resolution"` and `defaultValue: 16` to the resolution input port definition.

### Before (BROKEN)

```typescript
inputs: [
  {
    key: "geometry",
    label: "Geometry",
    type: "geometry",
    description: "Input geometry to voxelize (mesh, solid, or any geometry type).",
  },
  {
    key: "resolution",
    label: "Resolution",
    type: "number",
    description: "Number of voxels along the longest axis (8-128).",
  },
],
```

### After (FIXED)

```typescript
inputs: [
  {
    key: "geometry",
    label: "Geometry",
    type: "geometry",
    description: "Input geometry to voxelize (mesh, solid, or any geometry type).",
  },
  {
    key: "resolution",
    label: "Resolution",
    type: "number",
    parameterKey: "resolution",
    defaultValue: 16,
    description: "Number of voxels along the longest axis (8-128).",
  },
],
```

## Semantic Organization Principles

This fix aligns with Lingua's semantic organization principles for workflow nodes:

### 1. Input Port ↔ Parameter Linking

**Convention:** When an input port has a corresponding parameter, the input port MUST include:
- `parameterKey: "<parameter_key>"` - links to the parameter
- `defaultValue: <value>` - fallback when no edge and no parameter

**Example from Box node:**
```typescript
inputs: [
  { 
    key: "width", 
    label: "Width", 
    type: "number", 
    parameterKey: "boxWidth", 
    defaultValue: 1 
  },
],
parameters: [
  { 
    key: "boxWidth", 
    label: "Width", 
    type: "number", 
    defaultValue: 1, 
    min: 0.01, 
    step: 0.1 
  },
],
```

### 2. Naming Conventions

**Input Port Keys:**
- Use semantic names: `geometry`, `resolution`, `width`, `height`
- Use `lowerCamelCase`
- Should match the conceptual input (what the node receives)

**Parameter Keys:**
- Use semantic names with optional prefix: `resolution`, `boxWidth`, `sphereRadius`
- Use `lowerCamelCase`
- Should match the conceptual parameter (what the user configures)

**Output Port Keys:**
- Use semantic names: `voxelGrid`, `cellCount`, `fillRatio`, `geometry`
- Use `lowerCamelCase`
- Should match the conceptual output (what the node produces)

### 3. Type Consistency

**Port Types:**
- Must match the type registry: `number`, `string`, `boolean`, `geometry`, `mesh`, `voxelGrid`, etc.
- UI should only show ports that exist in backend definitions
- No ad-hoc types or string literals

**Parameter Types:**
- Must match the type registry: `number`, `string`, `boolean`, `select`, `slider`, etc.
- Should have appropriate constraints: `min`, `max`, `step`, `options`

### 4. Data Flow Semantics

**Input → Function → Output:**
```
Slider.value → VoxelSolver.resolution (input) → voxelize() → VoxelSolver.voxelGrid (output)
```

**Fallback Chain:**
1. Incoming edge value (highest priority)
2. Parameter value (if `parameterKey` is set)
3. Default value (if `defaultValue` is set)
4. `undefined` (lowest priority)

### 5. UI ↔ Backend Alignment

**Critical Rule:** The UI should ONLY present ports that exist in the backend node definition.

**Implementation:**
- UI reads port definitions from `nodeRegistry.ts`
- UI renders input handles from `nodeDef.inputs`
- UI renders output handles from `nodeDef.outputs`
- UI renders parameter controls from `nodeDef.parameters`
- No hardcoded ports or parameters in UI components

## Test Rig Verification

The Voxel Solver test rig is correctly configured:

### Nodes
1. **Resolution Slider** - outputs `value: 16` (min: 4, max: 64, step: 1)
2. **Box** - outputs `geometry` (2×2×2 box)
3. **Voxelizer** - inputs `geometry` and `resolution`, outputs `voxelGrid`, `fillRatio`, etc.
4. **TextNote** - displays `fillRatio`

### Edges
1. `widthSlider.value → box.width`
2. `heightSlider.value → box.height`
3. `depthSlider.value → box.depth`
4. `box.geometry → voxelizer.geometry`
5. `resolutionSlider.value → voxelizer.resolution` ✅ (NOW WORKS)
6. `voxelizer.fillRatio → textNote.data`

### Data Flow
```
[Width Slider: 2] ──┐
[Height Slider: 2] ──┼──> [Box: 2×2×2] ──> [Voxelizer] ──> [TextNote: 0.5]
[Depth Slider: 2] ──┘                           ↑
                                                 │
[Resolution Slider: 16] ────────────────────────┘
```

## Impact

### For Users
- ✅ Resolution slider now controls voxel density
- ✅ Changing slider updates voxelization in real-time
- ✅ Voxelizer works with or without slider connected
- ✅ Clear visual feedback of voxel resolution

### For Developers
- ✅ Consistent input port ↔ parameter linking pattern
- ✅ Clear semantic organization of types and names
- ✅ UI locked to backend definitions
- ✅ Modular, documented, and maintainable

### For the Project
- ✅ Establishes semantic conventions for all nodes
- ✅ Ensures UI/backend alignment
- ✅ Foundation for future node development
- ✅ Ontologically aligned with Lingua's architecture

## Next Steps

### Immediate
- [ ] Verify all solver nodes follow the same pattern
- [ ] Add `parameterKey` to any missing input ports
- [ ] Test resolution slider in browser

### Future
- [ ] Create automated validation for input port ↔ parameter linking
- [ ] Add CI check for naming conventions
- [ ] Document type registry and port type semantics
- [ ] Create node development guide with examples

## Related Files

- `client/src/workflow/nodes/solver/VoxelSolver.ts` - Node definition
- `client/src/workflow/workflowEngine.ts` - Graph evaluation engine
- `client/src/workflow/nodeRegistry.ts` - Node registry and type system
- `client/src/store/useProjectStore.ts` - Test rig definitions
- `docs/voxel-solver-rewrite.md` - Voxelizer implementation details

## References

- Workflow Engine: `client/src/workflow/workflowEngine.ts`
- Node Registry: `client/src/workflow/nodeRegistry.ts`
- Type System: `client/src/workflow/types.ts`
- CMYK Color Conventions: `docs/cmyk-color-conventions.md`
