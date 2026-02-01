# Numerica Data Types & Port System

> **Knowledge Base Document**  
> Last Updated: 2026-01-31  
> Purpose: Define modular, reusable data types for Numerica's node-based workflow system

---

## Overview

Numerica uses a **typed port system** where nodes communicate via typed inputs and outputs. This document establishes the canonical data types, their structures, and how they flow through the system.

---

## Port Type Hierarchy

```
any
├── geometry (generic)
│   ├── mesh (triangulated surfaces, voxels)
│   ├── nurb (NURBS surfaces/curves)
│   └── brep (boundary representations)
├── number
├── string
├── boolean
├── vector (Vec3)
├── array
└── object (structured data)
```

### Type Compatibility Rules

- All geometry types (`geometry`, `mesh`, `nurb`, `brep`) are **mutually compatible**
- `any` type accepts **all types**
- Specific types only accept their own type or compatible subtypes

---

## Core Data Types

### 1. Geometry ID (string)

**Port Type:** `geometry`, `mesh`, `nurb`, `brep`

The primary way geometry flows through the system. Nodes output geometry IDs (strings), and downstream nodes resolve these IDs to actual Geometry objects.

```typescript
type GeometryId = string; // e.g., "mesh-1769964727176-1"
```

**Usage Pattern:**
```
[Geometry Node] → geometryId (string) → [Downstream Node]
                                              ↓
                              resolves via geometryById.get(id)
                                              ↓
                                      Geometry object
```

**Example Output:**
```
Geometry: voxels
  id: mesh-1769964727176-1
  layerId: layer-default
  vertexCount: 6144
  faceCount: 3072
  area_m2: 34.56
  volume_m3: 13.824
  centroid: (0, 0, 0)
  sourceNodeId: node-voxelSolver...
  metadata: {label, renderSettings}
```

---

### 2. RenderMesh (object)

**Port Type:** `any` or custom `renderMesh`

Raw mesh data for rendering. Contains vertex positions, face indices, and optional normals/colors.

```typescript
interface RenderMesh {
  positions: number[];  // Flat array: [x0, y0, z0, x1, y1, z1, ...]
  indices: number[];    // Triangle indices: [i0, i1, i2, i3, i4, i5, ...]
  normals?: number[];   // Vertex normals (optional)
  colors?: number[];    // Vertex colors (optional)
}
```

**Key Properties:**
- `vertexCount = positions.length / 3`
- `faceCount = indices.length / 3`
- Positions are in world coordinates

**Example Output:**
```
Object (4 keys):
  positions: Array (18432 items):
    0: -1.2
    1: -1.2
    2: -1.05
    ... (18382 more)
  indices: Array (...)
  normals: Array (...)
```

**Use Cases:**
- Direct WebGL rendering
- Mesh analysis (area, volume)
- Export to STL/OBJ
- Downstream mesh operations

---

### 3. VoxelGrid (object)

**Port Type:** `any` or custom `voxelGrid`

3D grid of density values representing voxelized geometry.

```typescript
interface VoxelGrid {
  resolution: Vec3;     // Grid dimensions: {x: 16, y: 16, z: 16}
  bounds: {
    min: Vec3;          // Bounding box minimum
    max: Vec3;          // Bounding box maximum
  };
  cellSize: Vec3;       // Size of each voxel
  densities: number[];  // Flat array of density values (0-1)
}
```

**Key Properties:**
- `totalVoxels = resolution.x * resolution.y * resolution.z`
- `densities.length === totalVoxels`
- Density 0 = empty, 1 = solid

**Example Output:**
```
Object (4 keys):
  resolution: Vec3 (16, 16, 16)
  bounds: Object (2 keys):
    min: Vec3 (-1.2, -1.2, -1.2)
    max: Vec3 (1.2, 1.2, 1.2)
  cellSize: Vec3 (0.15, 0.15, 0.15)
  densities: Array (4096 items):
    0: 1
    1: 1
    2: 1
    ... (4046 more)
```

**Use Cases:**
- Isosurface extraction (marching cubes)
- Volume analysis
- Topology optimization
- Physics simulations
- Boolean operations

---

### 4. Vec3 (object or array)

**Port Type:** `vector`

3D vector for positions, directions, scales.

```typescript
// Object form (preferred)
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// Array form (also supported)
type Vec3Array = [number, number, number];
```

**Display Format:**
```
Vec3 (1.5, -2.0, 3.25)
```

---

### 5. Number

**Port Type:** `number`

Scalar numeric value.

```typescript
type NumberValue = number;
```

**Display Format:**
```
= 42
= 3.14159
```

---

### 6. String

**Port Type:** `string`

Text value. Also used for geometry IDs.

```typescript
type StringValue = string;
```

---

### 7. Boolean

**Port Type:** `boolean`

True/false value.

```typescript
type BooleanValue = boolean;
```

**Display Format:**
```
true
false
```

---

### 8. Array

**Port Type:** `array` or `any`

Collection of values.

```typescript
type ArrayValue = unknown[];
```

**Display Format:**
```
Array (100 items):
  0: value
  1: value
  ... (98 more)
```

---

## Geometry Subtypes

### MeshGeometry

```typescript
interface MeshGeometry {
  type: "mesh";
  subtype?: "voxels" | "regular";  // Classification
  id: string;
  layerId: string;
  mesh: RenderMesh;
  area_m2?: number;
  volume_m3?: number;
  centroid?: Vec3;
  mass_kg?: number;
  thickness_m?: number;
  sourceNodeId?: string;
  metadata?: Record<string, unknown>;
  primitive?: MeshPrimitiveInfo;
}
```

### Geometry Classification

| Subtype | Description | Source |
|---------|-------------|--------|
| `regular` | Standard triangulated mesh | Box, Sphere, Import |
| `voxels` | Voxelized mesh | VoxelSolver |

---

## Port Type Colors

| Type | Color | Hex | Description |
|------|-------|-----|-------------|
| `geometry` | Purple | `#8800ff` | Generic geometry ID |
| `mesh` | Purple-Pink | `#cc44ff` | Mesh geometry ID |
| `nurb` | Purple | `#9944ff` | NURBS geometry ID |
| `brep` | Blue-Purple | `#6644ff` | B-Rep geometry ID |
| `renderMesh` | Pink | `#ff88cc` | Raw mesh data object |
| `voxelGrid` | Light Blue | `#88ccff` | Voxel grid data object |
| `number` | Yellow | `#ffdd00` | Numeric value |
| `string` | Cyan | `#00d4ff` | Text value |
| `boolean` | Magenta | `#ff0099` | True/false value |
| `vector` | Green | `#88ff00` | Vec3 value |
| `any` | Gray | `#999999` | Accepts any type |

---

## Data Flow Patterns

### Pattern 1: Geometry Creation

```
[Primitive Node]
    ↓ compute() returns { geometry: geometryId }
[Handler in applySeedGeometryNodesToGeometry]
    ↓ creates Geometry object, stores in geometry array
    ↓ stores geometryId in node.data.geometryId
[resolveNodeParameters]
    ↓ mirrors node.data.geometryId → parameters.geometryId
[Next compute() cycle]
    ↓ reads parameters.geometryId, outputs it
[Downstream Node]
    ↓ receives geometryId via edge
    ↓ resolves to Geometry object
```

### Pattern 2: Geometry Pass-Through

```
[Upstream Node] → geometryId → [Pass-Through Node] → geometryId → [Downstream Node]
                                      ↓
                              Handler links to geometry
                              (touches ID to prevent GC)
```

### Pattern 3: Data Extraction

```
[Geometry Node] → geometryId → [Inspector Node]
                                      ↓
                              resolves geometryId
                              extracts metadata
                              displays formatted output
```

---

## Inspector Display Formats

### Geometry Summary (Node Detail)

```
0:1 mesh      // Port 0, 1 geometry, type mesh
0:1 voxels    // Port 0, 1 geometry, type voxels
0:3 mesh      // Port 0, 3 geometries, type mesh
```

### Full Geometry Inspection

```
Geometry: voxels
  id: mesh-1769964727176-1
  layerId: layer-default
  vertexCount: 6144
  faceCount: 3072
  area_m2: 34.56
  volume_m3: 13.824
  centroid: (0, 0, 0)
  sourceNodeId: node-voxelSolver...
  metadata: {label, renderSettings}
```

### Object Inspection

```
Object (4 keys):
  key1: value1
  key2: value2
  ...
```

### Array Inspection

```
Array (100 items):
  0: value
  1: value
  ... (98 more)
```

---

## Creating New Output Types

When adding a new output type to a node:

### 1. Define the Type Structure

```typescript
interface MyNewType {
  // Define properties
}
```

### 2. Choose Port Type

- Use existing type if compatible (`any`, `object`, `array`)
- Or add new port type to `WorkflowPortType` in `nodeRegistry.ts`

### 3. Update Node Definition

```typescript
outputs: [
  {
    key: "myOutput",
    label: "My Output",
    type: "any",  // or custom type
    description: "Description of output",
  },
]
```

### 4. Return from Compute

```typescript
compute: ({ inputs, parameters, context }) => {
  const result: MyNewType = { /* ... */ };
  return {
    myOutput: result,
  };
}
```

### 5. Update Inspector (if needed)

Add formatting logic to `dataInspect.ts` if the type needs special display.

---

## Voxel Solver Outputs (Reference)

The Voxel Solver demonstrates all three major output patterns:

| Output | Port Type | Data Type | Purpose |
|--------|-----------|-----------|---------|
| `mesh` | `mesh` | Geometry ID (string) | Links to voxelized geometry for downstream nodes |
| `meshData` | `renderMesh` | RenderMesh (object) | Raw mesh data for analysis/export |
| `voxelGrid` | `voxelGrid` | VoxelGrid (object) | Grid data for further processing |
| `resolution` | `number` | number | Actual resolution used |

### Inspector Display for Each Output:

**Mesh Output (Geometry ID):**
```
Geometry: voxels
  id: mesh-1769964727176-1
  layerId: layer-default
  vertexCount: 6144
  faceCount: 3072
  area_m2: 34.56
  volume_m3: 13.824
  centroid: (0, 0, 0)
  sourceNodeId: node-voxelSolver...
```

**Mesh Data Output (RenderMesh):**
```
RenderMesh:
  vertexCount: 6144
  faceCount: 3072
  hasNormals: true
  hasUVs: true
```

**Grid Output (VoxelGrid):**
```
VoxelGrid:
  resolution: (16, 16, 16)
  totalVoxels: 4096
  filledVoxels: 2048
  fillRatio: 50%
  bounds:
    min: (-1.2, -1.2, -1.2)
    max: (1.2, 1.2, 1.2)
  cellSize: (0.15, 0.15, 0.15)
```

---

## Best Practices

### 1. Use Geometry IDs for Geometry Flow
- Don't pass raw mesh data through geometry ports
- Use geometry IDs and let the system resolve them

### 2. Provide Multiple Output Formats
- Geometry ID for downstream geometry nodes
- Raw data for analysis/export nodes
- Metadata for inspector nodes

### 3. Type Your Ports Precisely
- Use `mesh` instead of `geometry` when you know it's a mesh
- Use `any` for flexible data outputs
- Use specific types for type safety

### 4. Document Output Structures
- Add descriptions to output definitions
- Update this knowledge base when adding new types

### 5. Handle Missing Data Gracefully
- Return `null` for missing outputs
- Check for `undefined` in downstream nodes
- Provide sensible defaults

---

## Related Documents

- `numerica_conventions.md` - Script authoring conventions
- `nodeRegistry.ts` - Port type definitions
- `dataInspect.ts` - Inspector formatting
- `types.ts` - TypeScript type definitions

---

## Changelog

### 2026-01-31
- Initial document creation
- Defined core data types: Geometry ID, RenderMesh, VoxelGrid, Vec3
- Established port type hierarchy and colors
- Documented data flow patterns
- Added Voxel Solver as reference implementation
