# VOXEL SOLVER SPECIFICATION

**Version:** 1.0  
**Date:** 2026-01-31  
**Status:** Active

---

## 🎯 PURPOSE

The Voxel Solver converts any input geometry into a voxel grid representation. It is a **simple geometry voxelizer**, not a topology optimization solver.

**What it does:**
- Converts solid geometry → blocky voxel grid
- Outputs voxel mesh for visualization
- Provides statistics (cell count, fill ratio)

**What it does NOT do:**
- Topology optimization (use TopologySolver)
- Material distribution (use ChemistrySolver)
- Morphogenesis (use BiologicalSolver)

---

## 📐 NODE DEFINITION

### Inputs
- `geometry` (type: `geometry`) - Any geometry to voxelize
- `resolution` (type: `number`, parameterKey: `resolution`, default: 16) - Number of voxels along longest axis (4-128)

### Outputs
- `voxelGrid` (type: `voxelGrid`) - Voxel grid data structure
- `meshData` (type: `mesh`) - Voxel mesh for rendering (blocky cubes)
- `cellCount` (type: `number`) - Total voxel cells
- `filledCount` (type: `number`) - Filled voxel cells
- `fillRatio` (type: `number`) - Ratio of filled to total (0-1)

### Parameters
- `resolution` (type: `number`, default: 16, min: 4, max: 128, step: 1) - Voxel grid resolution

---

## 🔧 VOXELIZATION ALGORITHM

### 1. Compute Bounding Box
Find min/max of all vertices in input geometry.

### 2. Calculate Voxel Grid Dimensions
- Resolution is along longest axis
- Calculate voxel size: `voxelSize = longestAxisLength / resolution`
- Calculate grid dimensions: `nx`, `ny`, `nz`

### 3. Triangle-Box Intersection
- For each triangle in mesh, find overlapping voxels
- Test voxel center against triangle prism
- Mark overlapping voxels as filled

### 4. Flood Fill Interior
- Start from boundary, flood fill exterior
- Mark unvisited empty cells as interior (filled)

### 5. Generate Voxel Mesh
- For each filled voxel, generate cube
- Only render exterior faces (cull interior)
- Result: blocky voxel visualization

---

## 📊 DATA STRUCTURES

### VoxelGrid Type
```typescript
interface VoxelGrid {
  resolution: { x: number; y: number; z: number };  // Grid dimensions
  bounds: {
    min: { x: number; y: number; z: number };       // Bounding box min
    max: { x: number; y: number; z: number };       // Bounding box max
  };
  cellSize: { x: number; y: number; z: number };    // Voxel size
  densities: Float32Array;                          // Filled cells (1.0 = filled, 0.0 = empty)
}
```

### RenderMesh Type
```typescript
interface RenderMesh {
  positions: number[];  // Vertex positions [x, y, z, ...]
  normals: number[];    // Vertex normals [nx, ny, nz, ...]
  uvs: number[];        // Texture coordinates [u, v, ...]
  indices: number[];    // Triangle indices [i0, i1, i2, ...]
}
```

---

## 🔗 GEOMETRY LINKAGE

### Input Geometry Access
```typescript
const geometryId = inputs.geometry as string | undefined;
const geometry = context.geometryById.get(geometryId) as Geometry | undefined;

if (!geometry) {
  return { 
    voxelGrid: null, 
    meshData: EMPTY_MESH, 
    cellCount: 0, 
    filledCount: 0, 
    fillRatio: 0 
  };
}

const meshGeometry = geometry as MeshGeometry;
```

### Output Mesh Data
```typescript
const voxelMesh = generateVoxelMesh(voxelGrid);

return {
  voxelGrid,
  meshData: voxelMesh,  // ✅ Return mesh in outputs
  cellCount: nx * ny * nz,
  filledCount,
  fillRatio: filledCount / (nx * ny * nz)
};
```

### Geometry Handler
```typescript
// In useProjectStore.ts
if (node.type === "voxelSolver") {
  const meshData = outputs?.meshData as RenderMesh | undefined;
  
  if (!meshData || meshData.positions.length === 0) {
    return node;
  }
  
  upsertMeshGeometry(
    geometryId,
    meshData,
    undefined,
    { geometryById, updates, itemsToAdd },
    node.id,
    { subtype: "voxels", renderOptions: { forceSolidPreview: true } }
  );
}
```

---

## 🎨 TEST RIG

### Nodes
1. **Width Slider** (value: 2, min: 0.1, max: 10, step: 0.1)
2. **Height Slider** (value: 2, min: 0.1, max: 10, step: 0.1)
3. **Depth Slider** (value: 2, min: 0.1, max: 10, step: 0.1)
4. **Resolution Slider** (value: 16, min: 4, max: 64, step: 1)
5. **Box** (2×2×2, centerMode: true, **hidden**)
6. **Voxelizer** (resolution: 16, **visible**)
7. **TextNote** (displays fillRatio)

### Edges
```
[Width: 2] ──┐
[Height: 2] ──┼──> [Box: 2×2×2] ──> [Voxelizer] ──> [TextNote: 0.5]
[Depth: 2] ──┘         (hidden)          ↑
                                         │
[Resolution: 16] ────────────────────────┘
```

### Data Flow
- Sliders output `value` → Box inputs `width`, `height`, `depth`
- Box outputs `geometry` → Voxelizer input `geometry`
- Resolution slider outputs `value` → Voxelizer input `resolution`
- Voxelizer outputs `fillRatio` → TextNote input `data`

### Visual Result
- **Input:** Solid Box (2×2×2 units, smooth geometry)
- **Output:** Voxel Grid (blocky representation, only exterior faces)
- **Box:** Hidden in Roslyn
- **Voxels:** Visible in Roslyn

---

## 🐛 COMMON ISSUES

### Issue 1: No Voxels Visible in Roslyn

**Symptoms:**
- Voxel Solver node exists in Numerica
- No geometry appears in Roslyn viewport

**Causes:**
1. Missing `meshData` output port
2. Missing `parameterKey` on resolution input
3. Missing geometry handler in `useProjectStore.ts`
4. Box geometry not hidden

**Solutions:**
1. Add `meshData` output port (type: `mesh`)
2. Add `parameterKey: "resolution"` to resolution input
3. Add geometry handler for `voxelSolver` node type
4. Add Box geometry ID to `hiddenGeometryIds`

### Issue 2: Resolution Slider Not Working

**Symptoms:**
- Changing resolution slider doesn't update voxels
- Voxels always render at default resolution

**Cause:**
- Missing `parameterKey` on resolution input port

**Solution:**
```typescript
inputs: [
  { 
    key: "resolution", 
    label: "Resolution", 
    type: "number",
    parameterKey: "resolution",  // ✅ Add this
    defaultValue: 16              // ✅ Add this
  }
]
```

### Issue 3: Geometry Access Error

**Symptoms:**
- Console error: "Cannot read property 'positions' of undefined"
- Voxelizer fails to process geometry

**Cause:**
- Treating `inputs.geometry` as Geometry object instead of geometry ID

**Solution:**
```typescript
// ❌ WRONG
const geometry = inputs.geometry as Geometry;

// ✅ CORRECT
const geometryId = inputs.geometry as string | undefined;
const geometry = context.geometryById.get(geometryId) as Geometry | undefined;
```

---

## ✅ VALIDATION CHECKLIST

- [ ] Node type is `voxelSolver`
- [ ] Has `geometry` input port (type: `geometry`)
- [ ] Has `resolution` input port with `parameterKey: "resolution"`
- [ ] Has `meshData` output port (type: `mesh`)
- [ ] Has `voxelGrid` output port (type: `voxelGrid`)
- [ ] Has `cellCount`, `filledCount`, `fillRatio` output ports
- [ ] Accesses geometry via `context.geometryById.get()`
- [ ] Returns `meshData` in outputs
- [ ] Has geometry handler in `useProjectStore.ts`
- [ ] Test rig has Box node with `hiddenGeometryIds`
- [ ] Test rig has Resolution slider connected
- [ ] Voxels visible in Roslyn viewport

---

## 📚 REFERENCES

- **Ontology Master:** `docs/ONTOLOGY_MASTER.md`
- **Node Registry:** `client/src/workflow/nodeRegistry.ts`
- **Voxel Solver Implementation:** `client/src/workflow/nodes/solver/VoxelSolver.ts`
- **Geometry Handler:** `client/src/store/useProjectStore.ts` (lines 2042-2091)
- **Type Definitions:** `client/src/types.ts`

---

**This is the definitive specification for the Voxel Solver. All implementations MUST comply with this document.**
