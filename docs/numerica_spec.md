# Numerica Specification

**Last Updated:** 2026-01-31

Numerica is the visual programming subsystem within Lingua, providing a canvas-based node editor for computational workflows. This document consolidates all Numerica documentation.

---

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Data Types & Port System](#data-types--port-system)
3. [Node Architecture](#node-architecture)
4. [Canvas Rendering](#canvas-rendering)
5. [Interaction & Shortcuts](#interaction--shortcuts)
6. [Conventions & Best Practices](#conventions--best-practices)
7. [Import/Export (Interchange)](#importexport-interchange)
8. [Troubleshooting](#troubleshooting)

---

## Core Concepts

### Graph Anatomy

A Numerica graph consists of:
- **Nodes**: Computations (create geometry, analyze, transform, solve)
- **Ports**: Typed inputs and outputs
- **Edges**: Connections between ports
- **Parameters**: Per-node settings not connected by edges

### Port Types

| Type | Meaning | Example Nodes |
|------|---------|---------------|
| `number` | Scalar numeric value | Number, Slider, Math nodes |
| `vector` | 3D vector (x,y,z) | Vector Construct, Move Vector |
| `geometry` | Reference to Roslyn geometry | Geometry Reference, Loft |
| `goal` | Solver goal specification | Stiffness Goal, Growth Goal |
| `solverResult` | Solver output payload | Physics Solver |
| `any` | Generic value | Panel, Metadata Panel |

### Inputs vs Parameters

- **Inputs**: Values coming from upstream nodes
- **Parameters**: Values stored inside the node
- Many ports are **parameter-backed**: if no edge is connected, the node reads the parameter value instead

### Evaluation Order

Numerica evaluates lazily:
1. A node output is requested (by a downstream node or preview)
2. If cached and clean → return cached output
3. If dirty → evaluate upstream dependencies, then compute

Dirty state propagates when inputs or parameters change.

### Geometry Ownership

Some nodes generate new geometry in Roslyn (geometry-owning nodes). These nodes output geometry IDs that reference stored geometry records. Downstream nodes operate on IDs rather than raw meshes.

---

## Data Types & Port System

### Type Hierarchy

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

### Core Data Structures

**Geometry ID (string)**
```typescript
type GeometryId = string; // e.g., "mesh-1769964727176-1"
```

**RenderMesh (object)**
```typescript
interface RenderMesh {
  positions: number[];  // Flat array: [x0, y0, z0, x1, y1, z1, ...]
  indices: number[];    // Triangle indices
  normals?: number[];   // Vertex normals (optional)
  colors?: number[];    // Vertex colors (optional)
}
```

**VoxelGrid (object)**
```typescript
interface VoxelGrid {
  resolution: Vec3;     // Grid dimensions: {x: 16, y: 16, z: 16}
  bounds: { min: Vec3; max: Vec3; };
  cellSize: Vec3;
  densities: number[];  // Flat array of density values (0-1)
}
```

**Vec3 (object)**
```typescript
interface Vec3 { x: number; y: number; z: number; }
```

---

## Node Architecture

### Node Structure

```typescript
{
  type: "myNode",
  inputs: [
    { key: "input1", label: "Input 1", type: "geometry" },
  ],
  outputs: [
    { key: "mesh", label: "Mesh", type: "mesh" },
  ],
  parameters: [
    { key: "resolution", label: "Resolution", type: "number", defaultValue: 16 },
  ],
  compute: ({ inputs, parameters }) => {
    return { mesh: parameters.geometryId };
  },
}
```

### Data Flow Pattern (The Mirroring System)

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
```

### Node Patterns

**Generator Node**: Creates geometry from parameters (Box, Sphere)
**Pass-Through Node**: Receives and passes geometry unchanged (Mesh)
**Processor Node**: Receives, processes, outputs new geometry (VoxelSolver)

---

## Canvas Rendering

### Architecture

The canvas renders using immediate-mode patterns where the entire visible portion redraws each frame. Layers render in order:
1. **Background**: Workspace surface and grid
2. **Connections**: Bezier curves between nodes
3. **Nodes**: Backgrounds, borders, titles, ports
4. **Overlays**: Selection, drag previews, tooltips

### Coordinate System

- **World space**: Where nodes are positioned
- **Screen space**: Where pixels appear
- View transform: `screenPosition = worldPosition * scale + translation`

### Hit Testing

- **Node**: Bounding rectangle containment
- **Port**: Distance from port center (with enlarged hit radius for tolerance)
- **Connection**: Sample bezier curve at multiple points

---

## Interaction & Shortcuts

### Navigation
- **Pan**: Right-drag or Space + drag
- **Zoom**: Mouse wheel / pinch
- **Frame selection**: F
- **Frame all**: Shift + F

### Selection
- **Select node/edge**: Left click
- **Multi-select**: Ctrl/Cmd + click
- **Select all**: Ctrl/Cmd + A
- **Box select**: Click-drag on empty canvas

### Editing
- **Delete selection**: Delete / Backspace
- **Grid snap toggle**: G
- **Free drag (ignore grid)**: Alt (while dragging)

### Overlays & Help
- **Toggle shortcut overlay**: ?
- **Context menu**: Right-click

### Node Placement
- Use search bar to add nodes (Enter to place top result)
- Drag nodes from the palette onto the canvas

---

## Conventions & Best Practices

### Layout & Flow

**Left-to-Right Data Flow:**
- Input nodes on the left
- Processing nodes in the middle
- Output nodes on the right

**Vertical Organization:**
- Related nodes at similar vertical positions
- Parallel operations stacked vertically
- Sequential operations arranged horizontally

**Spacing:**
- Horizontal gaps: 100-120px between stages
- Vertical gaps: 80-100px between parallel nodes

### Naming Conventions

**Node Labels:**
- Descriptive and concise (e.g., "Box Input", "Voxel Resolution")
- Use title case
- Avoid redundant prefixes ("Node 1", "Slider 2")

**Parameter Names:**
- Use camelCase for keys
- Match industry-standard terminology

### Data Flow Semantics

**Immutability:**
- Nodes do not mutate input data
- Each node produces new output data

**Evaluation:**
- Nodes evaluated in topological order
- Cycles not allowed
- Missing inputs use defaults or produce null

---

## Import/Export (Interchange)

### Supported Formats

- **Mesh** (triangles): Best for export and downstream DCC tools
- **NURBS** (curves/surfaces): Best for CAD workflows
- **B-Rep** (solids): Best for manufacturing-grade solids

### Import Nodes

- **STL Import** (`stlImport`): Input file → Output geometry (mesh-only)

### Export Nodes

- **STL Export** (`stlExport`): Input geometry → Output file blob

### Conversion Nodes

- `meshConvert`, `meshtobrep`, `breptomesh`, `nurbsrestore`

### Common Pitfalls

- Exporting NURBS without conversion → fails or produces empty mesh
- Low tessellation quality → faceted exports
- B-Rep conversions can lose topology semantics

---

## Troubleshooting

### Top Issues

1. **No outputs on a node** → Check required inputs are connected
2. **Geometry viewer is blank** → Ensure geometry output is wired to viewer
3. **Solver throws goal validation error** → Goal nodes from wrong family connected
4. **Solver never converges** → Reduce resolution or lower iterations
5. **Voxel output is empty** → Domain bounds too small or resolution too low
6. **Expression node has no inputs** → Expression has no variables
7. **List nodes return unexpected nesting** → Flatten or partition explicitly
8. **Mesh conversion looks faceted** → Increase tessellation parameters
9. **Boolean fails** → Input meshes non-manifold or self-intersecting
10. **STL Export produces empty file** → No geometry connected

### Physics Solver Issues

- **Fails immediately** → Missing Anchor goal (required for boundary conditions)
- **Load goal ignored** → Missing Volume goal (required with Load goals)
- **Stress field all zeros** → No load applied or all nodes anchored

### Physics Solver Goal Requirements

| Goal Combination | Valid? | Notes |
|------------------|--------|-------|
| Anchor only | ✅ | Minimal setup, computes static state |
| Anchor + Load | ❌ | Missing Volume goal |
| Anchor + Load + Volume | ✅ | Complete structural setup |
| Anchor + Stiffness | ✅ | Material properties defined |

### Diagnostic Checklist

- Verify node inputs and output port types
- Check console for runtime errors
- Confirm geometry IDs are valid
- For solvers: ensure at least one goal of each required type

---

## References

- **Node Registry**: `client/src/workflow/nodeRegistry.ts`
- **Canvas Implementation**: `client/src/components/workflow/NumericalCanvas.tsx`
- **Compute Outputs**: `client/src/workflow/computeWorkflowOutputs.ts`
- **Colors**: `client/src/workflow/colors.ts`
