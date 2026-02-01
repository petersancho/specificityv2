# Numerica Node Terminology Reference

> **Critical Reference Document**  
> Last Updated: 2026-01-31  
> Purpose: Define the canonical terminology for working with Numerica nodes

---

## Overview

This document establishes the **authoritative terminology** for Numerica's node-based workflow system. Use these exact terms when discussing, implementing, or debugging nodes.

---

## Node Anatomy

### Core Properties

#### `type` (string)
The unique identifier for the node type.

**Examples:** `"box"`, `"sphere"`, `"voxelSolver"`, `"mesh"`, `"move"`, `"rotate"`

**Usage:**
```typescript
if (node.type === "voxelSolver") {
  // Handle voxel solver node
}
```

---

#### `inputs` (array)
Array of input port definitions that specify what data the node can receive.

**Structure:**
```typescript
inputs: [
  {
    key: "geometry",           // Unique identifier for this input
    label: "Geometry",         // Display name in UI
    type: "geometry",          // Port type (what data it accepts)
    description: "Input geometry to voxelize.",
  },
]
```

**Key Terms:**
- `key`: Internal identifier used in compute function (`inputs.geometry`)
- `label`: User-facing name shown in UI
- `type`: Port type that determines compatibility
- `description`: Tooltip text for users

---

#### `outputs` (array)
Array of output port definitions that specify what data the node produces.

**Structure:**
```typescript
outputs: [
  {
    key: "mesh",               // Unique identifier for this output
    label: "Mesh",             // Display name in UI
    type: "mesh",              // Port type (what data it produces)
    description: "Voxelized mesh geometry ID.",
  },
]
```

**Critical:** The `key` must match what the `compute` function returns:
```typescript
compute: () => {
  return {
    mesh: geometryId,  // ← Must match output key "mesh"
  };
}
```

---

#### `parameters` (array)
Array of control definitions (sliders, toggles, etc.) that configure the node.

**Structure:**
```typescript
parameters: [
  {
    key: "resolution",
    label: "Resolution",
    type: "number",
    defaultValue: 16,
    min: 4,
    max: 64,
    step: 1,
  },
]
```

**Key Terms:**
- `key`: Internal identifier used in compute function (`parameters.resolution`)
- `label`: User-facing name shown in UI
- `type`: Control type (number, boolean, string, etc.)
- `defaultValue`: Initial value when node is created

---

#### `compute` (function)
The function that evaluates when the node updates. Receives inputs and parameters, returns outputs.

**Signature:**
```typescript
compute: ({ inputs, parameters }) => {
  // Read inputs from upstream nodes
  const inputGeometry = inputs.geometry;
  
  // Read parameters from controls
  const resolution = parameters.resolution;
  
  // Read mirrored geometry ID from node.data
  const geometryId = parameters.geometryId;
  
  // Perform computation
  // ...
  
  // Return outputs (must match output keys)
  return {
    mesh: geometryId,
    meshData: renderMesh,
    resolution: actualResolution,
  };
}
```

**Critical:** The compute function is **pure** - it should not have side effects. It only reads inputs/parameters and returns outputs.

---

### Node Data

#### `node.data` (object)
Persistent storage for node-specific data. This is where backend handlers store information.

**Common Fields:**
```typescript
node.data = {
  geometryId: "mesh-1769964727176-1",  // Geometry ID created by handler
  geometryType: "mesh",                 // Type of geometry
  isLinked: true,                       // Whether node is linked to geometry
  // ... other node-specific data
}
```

**Critical:** `node.data` is the **source of truth** for persistent node state. The handler writes to it, and `resolveNodeParameters` reads from it.

---

#### `node.data.geometryId` (string)
The geometry ID that this node is linked to. Set by the handler after creating/updating geometry.

**Usage Pattern:**
1. Handler creates Geometry object
2. Handler stores `geometryId` in `node.data.geometryId`
3. `resolveNodeParameters` mirrors it to `parameters.geometryId`
4. Compute function reads `parameters.geometryId` and returns it on output port

**Example:**
```typescript
// Handler (in geometry pipeline)
const geometryId = upsertMeshGeometry(...);
return {
  ...node,
  data: {
    ...node.data,
    geometryId,
    geometryType: "mesh",
    isLinked: true,
  },
};

// resolveNodeParameters
if (type === "voxelSolver") {
  if (node.data?.geometryId) {
    parameters.geometryId = node.data.geometryId;
  }
}

// Compute function
compute: ({ parameters }) => {
  return {
    mesh: parameters.geometryId,  // Output the geometry ID
  };
}
```

---

#### `node.data.geometryType` (string)
The type of geometry this node produces. Used for validation and display.

**Values:** `"mesh"`, `"nurb"`, `"brep"`

---

#### `node.data.isLinked` (boolean)
Flag indicating whether the node is successfully linked to a Geometry object.

**Usage:**
```typescript
if (node.data?.isLinked) {
  // Node has valid geometry
}
```

---

## Data Flow Pattern (The Mirroring System)

This is the **most critical concept** in Numerica's architecture.

### The Pattern

```
1. Handler creates Geometry object
   ↓
2. Handler stores geometryId in node.data.geometryId
   ↓
3. resolveNodeParameters() mirrors node.data.geometryId → parameters.geometryId
   ↓
4. Compute function reads parameters.geometryId
   ↓
5. Compute function returns geometryId on output port
   ↓
6. Downstream nodes receive geometryId via edges
   ↓
7. Downstream handlers resolve geometryId to Geometry object
```

### Why This Pattern?

- **Separation of concerns:** Handlers manage backend state, compute functions are pure
- **Reactivity:** When `node.data` changes, parameters update, compute re-runs
- **Type safety:** Geometry IDs flow through typed ports
- **Debuggability:** Each step is explicit and traceable

### Example: Box Node

```typescript
// 1. Handler creates geometry
if (node.type === "box") {
  const geometryId = upsertMeshGeometry(
    `box-${node.id}`,
    boxMesh,
    { sourceNodeId: node.id }
  );
  
  // 2. Store in node.data
  return {
    ...node,
    data: {
      ...node.data,
      geometryId,
      geometryType: "mesh",
      isLinked: true,
    },
  };
}

// 3. Mirror to parameters
if (type === "box") {
  if (node.data?.geometryId) {
    parameters.geometryId = node.data.geometryId;
  }
}

// 4-5. Compute reads and returns
compute: ({ parameters }) => {
  return {
    geometry: parameters.geometryId,  // Output geometry ID
  };
}

// 6. Downstream node receives via edge
// Edge connects box.geometry → voxelSolver.geometry
// voxelSolver's compute receives: inputs.geometry = "mesh-box-123"
```

---

## Backend Processing

### `handler` (function)
A function in the geometry pipeline that creates or updates Geometry objects based on node state.

**Location:** `client/src/store/useProjectStore.ts` in `applyNodesToGeometry()`

**Pattern:**
```typescript
if (node.type === "myNode") {
  // Read outputs from compute function
  const outputData = outputs?.myOutput;
  
  // Validate data
  if (!outputData) return node;
  
  // Create/update Geometry object
  const geometryId = upsertMeshGeometry(...);
  
  // Mark geometry as touched (don't garbage collect)
  touchedGeometryIds.add(geometryId);
  
  // Return updated node with geometryId
  return {
    ...node,
    data: {
      ...node.data,
      geometryId,
      geometryType: "mesh",
      isLinked: true,
    },
  };
}
```

**Critical:** Handlers run **after** compute functions. They read the outputs and create backend state.

---

### `geometry pipeline`
The series of handlers that process nodes in order to create/update Geometry objects.

**Order:**
1. `applySeedGeometryNodesToGeometry()` - Box, sphere, mesh nodes
2. `applyVoxelSolverNodesToGeometry()` - Voxel solver nodes
3. `applyTransformNodesToGeometry()` - Move, rotate, scale nodes
4. `applyBooleanNodesToGeometry()` - Union, subtract, intersect nodes

**Why Order Matters:** Downstream nodes need upstream geometry to exist first.

---

### `geometryById` (Map)
A Map of all Geometry objects in the scene, keyed by geometry ID.

**Structure:**
```typescript
geometryById: Map<string, Geometry>

// Example entry
geometryById.get("mesh-1769964727176-1") = {
  id: "mesh-1769964727176-1",
  type: "mesh",
  subtype: "voxels",
  mesh: {
    positions: Float32Array,
    indices: Uint32Array,
    normals: Float32Array,
  },
  metadata: {
    vertexCount: 6144,
    faceCount: 3072,
    area: 24.5,
    volume: 8.0,
    centroid: [0, 0, 0],
  },
  sourceNodeId: "node-123",
}
```

**Usage:**
```typescript
const geometry = geometryById.get(geometryId);
if (geometry && geometry.type === "mesh") {
  // Use the geometry
}
```

---

### `touchedGeometryIds` (Set)
A Set of geometry IDs that are currently in use. Geometry not in this set gets garbage collected.

**Usage:**
```typescript
// In handler
touchedGeometryIds.add(geometryId);  // Keep this geometry alive
```

**Critical:** Always touch geometry IDs in handlers, or they'll be deleted!

---

### `upsertMeshGeometry()` (function)
Creates or updates a MeshGeometry object in the backend.

**Signature:**
```typescript
function upsertMeshGeometry(
  id: string,
  mesh: RenderMesh,
  metadata?: {
    sourceNodeId?: string;
    subtype?: "voxels" | "regular";
    // ... other metadata
  }
): string
```

**Returns:** The geometry ID (same as input `id`)

**Usage:**
```typescript
const geometryId = upsertMeshGeometry(
  `voxel-${node.id}`,
  renderMesh,
  {
    sourceNodeId: node.id,
    subtype: "voxels",
  }
);
```

---

### `resolveNodeParameters()` (function)
Mirrors `node.data` fields into `parameters` so the compute function can access them.

**Location:** `client/src/workflow/nodeRegistry.ts`

**Pattern:**
```typescript
// For each node type that needs mirroring
if (type === "myNode") {
  if (node.data?.geometryId) {
    parameters.geometryId = node.data.geometryId;
  }
}
```

**Critical:** This is the bridge between backend state (`node.data`) and compute functions (`parameters`).

---

## Type System

### `port type` (string)
The type of data that flows through a port. Determines compatibility.

**Geometry Types:**
- `geometry` - Generic geometry (compatible with all geometry types)
- `mesh` - Mesh geometry (triangulated surfaces, voxels)
- `nurb` - NURBS geometry (curves and surfaces)
- `brep` - B-Rep geometry (boundary representations)

**Data Types:**
- `renderMesh` - Raw mesh data object (positions, indices, normals)
- `voxelGrid` - Voxel grid data object (resolution, bounds, densities)
- `number` - Numeric value
- `vector` - 3D vector (Vec3)
- `boolean` - True/false value
- `string` - Text value
- `any` - Accepts any type

**Port Colors:**
```typescript
const PORT_COLORS = {
  geometry: "#44ff88",
  mesh: "#cc44ff",
  nurb: "#9944ff",
  brep: "#6644ff",
  renderMesh: "#ff88cc",
  voxelGrid: "#88ccff",
  number: "#4488ff",
  vector: "#ff8844",
  boolean: "#ff4488",
  string: "#88ff44",
  any: "#888888",
};
```

---

### `geometry type` (string)
The backend classification of a Geometry object.

**Values:** `"mesh"`, `"nurb"`, `"brep"`

**Usage:**
```typescript
if (geometry.type === "mesh") {
  // Access mesh-specific properties
  const positions = geometry.mesh.positions;
}
```

---

### `subtype` (string)
A subclassification of geometry for more specific handling.

**Mesh Subtypes:**
- `"voxels"` - Voxelized mesh (from voxel solver)
- `"regular"` - Regular mesh (from box, sphere, etc.)

**Usage:**
```typescript
if (geometry.type === "mesh" && geometry.subtype === "voxels") {
  // Handle voxel mesh specifically
}
```

---

### Type Compatibility

**Rule:** All geometry types are compatible with each other.

```typescript
function isPortTypeCompatible(sourceType: string, targetType: string): boolean {
  if (sourceType === targetType) return true;
  if (targetType === "any") return true;
  
  // All geometry types are compatible
  const GEOMETRY_TYPES = ["geometry", "mesh", "nurb", "brep"];
  if (GEOMETRY_TYPES.includes(sourceType) && GEOMETRY_TYPES.includes(targetType)) {
    return true;
  }
  
  return false;
}
```

**Examples:**
- `box (geometry)` → `voxelSolver (geometry)` ✓
- `voxelSolver (mesh)` → `mesh node (mesh)` ✓
- `mesh node (mesh)` → `move (geometry)` ✓
- `box (geometry)` → `textNote (any)` ✓

---

## Inspector System

### Inspector Nodes
Nodes that accept `any` type and display data for debugging.

**Types:**
- `Panel` - Displays data in a scrollable panel on the canvas
- `TextNote` - Displays data in a text note on the canvas

**Usage:**
```typescript
// Connect any output to an inspector node
voxelSolver.mesh → panel.data
voxelSolver.meshData → panel.data
voxelSolver.voxelGrid → panel.data
```

---

### Type Guards
Functions that detect the type of data for proper formatting.

**Examples:**
```typescript
function isGeometryId(value: unknown): boolean {
  return typeof value === "string" && value.startsWith("mesh-");
}

function isRenderMesh(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "positions" in value &&
    "indices" in value
  );
}

function isVoxelGrid(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "resolution" in value &&
    "densities" in value
  );
}
```

---

### Formatters
Functions that convert data to display strings.

**Examples:**
```typescript
function formatRenderMesh(mesh: RenderMesh): string {
  return `RenderMesh:
  vertexCount: ${mesh.positions.length / 3}
  faceCount: ${mesh.indices.length / 3}
  hasNormals: ${!!mesh.normals}
  hasUVs: ${!!mesh.uvs}`;
}

function formatVoxelGrid(grid: VoxelGrid): string {
  const filled = grid.densities.filter(d => d > 0).length;
  return `VoxelGrid:
  resolution: (${grid.resolution.join(", ")})
  totalVoxels: ${grid.densities.length}
  filledVoxels: ${filled}
  fillRatio: ${((filled / grid.densities.length) * 100).toFixed(1)}%`;
}
```

---

### Geometry Summary
A compact label showing what geometry a node produces.

**Format:** `"0:1 mesh"` or `"0:2 voxels"`

**Meaning:**
- `0:` - Geometry array index (always 0 for single geometry)
- `1` - Geometry ID number
- `mesh` or `voxels` - Geometry type/subtype

**Usage:**
```typescript
function formatGeometrySummary(geometryArray: Geometry[]): string {
  return geometryArray
    .map((g, i) => {
      const label = g.subtype === "voxels" ? "voxels" : g.type;
      const idNum = g.id.split("-").pop();
      return `${i}:${idNum} ${label}`;
    })
    .join(", ");
}
```

**Display:** Shown in node detail area below the node title.

---

## Complete Data Flow Checklist

When implementing a new node that produces geometry, follow this checklist:

### 1. Define Node Structure
```typescript
{
  type: "myNode",
  inputs: [
    { key: "input1", label: "Input 1", type: "geometry" },
  ],
  outputs: [
    { key: "mesh", label: "Mesh", type: "mesh" },
    { key: "data", label: "Data", type: "renderMesh" },
  ],
  parameters: [
    { key: "param1", label: "Param 1", type: "number", defaultValue: 10 },
  ],
  compute: ({ inputs, parameters }) => {
    // Return outputs
    return {
      mesh: parameters.geometryId,
      data: someData,
    };
  },
}
```

### 2. Add to resolveNodeParameters
```typescript
if (type === "myNode") {
  if (node.data?.geometryId) {
    parameters.geometryId = node.data.geometryId;
  }
}
```

### 3. Create Handler
```typescript
if (node.type === "myNode") {
  const outputData = outputs?.data;
  if (!outputData) return node;
  
  const geometryId = upsertMeshGeometry(
    `mynode-${node.id}`,
    outputData,
    { sourceNodeId: node.id }
  );
  
  touchedGeometryIds.add(geometryId);
  
  return {
    ...node,
    data: {
      ...node.data,
      geometryId,
      geometryType: "mesh",
      isLinked: true,
    },
  };
}
```

### 4. Add Inspector Support (Optional)
```typescript
// In dataInspect.ts
function isMyData(value: unknown): boolean {
  return typeof value === "object" && "myField" in value;
}

function formatMyData(data: MyData): string {
  return `MyData:\n  field: ${data.myField}`;
}
```

### 5. Test Data Flow
1. Create node
2. Check `node.data.geometryId` is set
3. Check `parameters.geometryId` is mirrored
4. Check compute returns geometry ID on output
5. Connect to downstream node
6. Check downstream node receives geometry ID
7. Connect to Panel node
8. Check Panel displays geometry data

---

## Common Patterns

### Pass-Through Node
A node that receives geometry and passes it through unchanged.

```typescript
{
  type: "mesh",
  inputs: [
    { key: "mesh", label: "Mesh", type: "mesh" },
  ],
  outputs: [
    { key: "mesh", label: "Mesh", type: "mesh" },
  ],
  compute: ({ inputs, parameters }) => {
    return {
      mesh: inputs.mesh ?? parameters.geometryId,
    };
  },
}

// Handler
if (node.type === "mesh") {
  const inputGeometryId = typeof outputs?.mesh === "string" ? outputs.mesh : null;
  if (!inputGeometryId) return node;
  
  const inputGeometry = geometryById.get(inputGeometryId);
  if (!inputGeometry || inputGeometry.type !== "mesh") return node;
  
  touchedGeometryIds.add(inputGeometryId);
  
  return {
    ...node,
    data: {
      ...node.data,
      geometryId: inputGeometryId,
      geometryType: "mesh",
      isLinked: true,
    },
  };
}
```

---

### Generator Node
A node that creates geometry from parameters.

```typescript
{
  type: "box",
  outputs: [
    { key: "geometry", label: "Geometry", type: "geometry" },
  ],
  parameters: [
    { key: "width", label: "Width", type: "number", defaultValue: 2 },
    { key: "height", label: "Height", type: "number", defaultValue: 2 },
    { key: "depth", label: "Depth", type: "number", defaultValue: 2 },
  ],
  compute: ({ parameters }) => {
    return {
      geometry: parameters.geometryId,
    };
  },
}

// Handler
if (node.type === "box") {
  const width = node.data?.width ?? 2;
  const height = node.data?.height ?? 2;
  const depth = node.data?.depth ?? 2;
  
  const boxMesh = createBoxMesh(width, height, depth);
  const geometryId = upsertMeshGeometry(
    `box-${node.id}`,
    boxMesh,
    { sourceNodeId: node.id }
  );
  
  touchedGeometryIds.add(geometryId);
  
  return {
    ...node,
    data: {
      ...node.data,
      geometryId,
      geometryType: "mesh",
      isLinked: true,
    },
  };
}
```

---

### Processor Node
A node that receives geometry, processes it, and outputs new geometry.

```typescript
{
  type: "voxelSolver",
  inputs: [
    { key: "geometry", label: "Geometry", type: "geometry" },
  ],
  outputs: [
    { key: "mesh", label: "Mesh", type: "mesh" },
    { key: "meshData", label: "Mesh Data", type: "renderMesh" },
  ],
  parameters: [
    { key: "resolution", label: "Resolution", type: "number", defaultValue: 16 },
  ],
  compute: ({ inputs, parameters }) => {
    const inputGeometry = inputs.geometry;
    const resolution = parameters.resolution;
    
    // Process geometry (voxelize)
    const result = voxelize(inputGeometry, resolution);
    
    return {
      mesh: parameters.geometryId,
      meshData: result.mesh,
    };
  },
}

// Handler
if (node.type === "voxelSolver") {
  const meshData = outputs?.meshData;
  if (!meshData) return node;
  
  const geometryId = upsertMeshGeometry(
    `voxel-${node.id}`,
    meshData,
    {
      sourceNodeId: node.id,
      subtype: "voxels",
    }
  );
  
  touchedGeometryIds.add(geometryId);
  
  return {
    ...node,
    data: {
      ...node.data,
      geometryId,
      geometryType: "mesh",
      isLinked: true,
    },
  };
}
```

---

## Critical Terms Summary

When working with nodes, always use these exact terms:

**Node Structure:**
- `type` - Node type identifier
- `inputs` - Input port definitions
- `outputs` - Output port definitions
- `parameters` - Control definitions
- `compute` - Evaluation function

**Node Data:**
- `node.data` - Persistent node storage
- `node.data.geometryId` - Geometry ID stored by handler
- `node.data.geometryType` - Type of geometry
- `node.data.isLinked` - Whether node is linked to geometry

**Data Flow:**
- `handler` - Backend function that creates Geometry objects
- `resolveNodeParameters` - Mirrors node.data to parameters
- `parameters.geometryId` - Mirrored geometry ID for compute
- `inputs.X` - Values from upstream nodes
- `outputs.X` - Values returned by compute

**Backend:**
- `geometryById` - Map of all Geometry objects
- `touchedGeometryIds` - Set of IDs to keep alive
- `upsertMeshGeometry` - Create/update MeshGeometry
- `geometry pipeline` - Series of handlers

**Type System:**
- `port type` - Type of data flowing through ports
- `geometry type` - Backend classification (mesh/nurb/brep)
- `subtype` - Geometry subclassification (voxels/regular)

**Inspector:**
- `type guard` - Function that detects data type
- `formatter` - Function that converts data to display string
- `geometry summary` - Compact label (e.g., "0:1 mesh")

---

## Related Documentation

- [Numerica Data Types](./numerica_data_types.md) - Comprehensive data type reference
- [Numerica Conventions](./numerica_conventions.md) - General conventions and best practices

---

**Use this document as the authoritative reference when implementing, debugging, or discussing Numerica nodes.**
