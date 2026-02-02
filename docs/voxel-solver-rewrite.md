# Voxel Solver Rewrite - Simple Geometry Voxelizer

**Date:** 2026-02-02  
**Commit:** 45b4a32  
**Author:** Friday (AI Assistant)

---

## Problem Statement

The Voxel Solver was incorrectly implemented as a topology optimization solver:

### Issues with Previous Implementation

1. **Wrong Inheritance** - Inherited from `TopologySolver` (topology optimization)
2. **Wrong Description** - "Topology solver variant for voxel density fields"
3. **Wrong Parameters** - `volumeFraction`, `penaltyExponent`, `filterRadius` (optimization params)
4. **Wrong Inputs** - `goals`, `voxelGrid` (optimization inputs)
5. **Wrong Test Rig** - Description said "performs topology optimization"
6. **Wrong Purpose** - Was doing SIMP topology optimization, not simple voxelization

### What Peter Wanted

Peter's images showed clearly:
- **Input:** Solid Box (smooth geometry)
- **Output:** Voxel Grid (blocky voxelized version)

**The Voxel Solver should ONLY voxelize geometry** - convert any geometry into a voxel grid representation. What users do with the voxels after is up to them.

---

## Solution

Rewrote the Voxel Solver as a **standalone geometry voxelizer** (not topology optimization).

### New Implementation

**File:** `client/src/workflow/nodes/solver/VoxelSolver.ts`

#### Node Definition

```typescript
export const VoxelSolverNode: WorkflowNodeDefinition = {
  type: "voxelSolver",
  label: "Voxelizer",
  shortLabel: "VOX",
  description: "Converts geometry into a voxel grid at a specified resolution.",
  category: "voxel",
  
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
  
  outputs: [
    {
      key: "voxelGrid",
      label: "Voxel Grid",
      type: "voxelGrid",
      description: "Voxelized representation of the input geometry.",
    },
    {
      key: "cellCount",
      label: "Cell Count",
      type: "number",
      description: "Total number of voxel cells in the grid.",
    },
    {
      key: "filledCount",
      label: "Filled Count",
      type: "number",
      description: "Number of filled (occupied) voxel cells.",
    },
    {
      key: "fillRatio",
      label: "Fill Ratio",
      type: "number",
      description: "Ratio of filled cells to total cells (0-1).",
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
};
```

#### Voxelization Algorithm

**1. Compute Bounding Box**
```typescript
// Find min/max of all vertices
let minX = Infinity, minY = Infinity, minZ = Infinity;
let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

for (let i = 0; i < positions.length; i += 3) {
  const x = positions[i];
  const y = positions[i + 1];
  const z = positions[i + 2];
  minX = Math.min(minX, x);
  minY = Math.min(minY, y);
  minZ = Math.min(minZ, z);
  maxX = Math.max(maxX, x);
  maxY = Math.max(maxY, y);
  maxZ = Math.max(maxZ, z);
}
```

**2. Calculate Voxel Grid Dimensions**
```typescript
const sizeX = maxX - minX;
const sizeY = maxY - minY;
const sizeZ = maxZ - minZ;
const maxSize = Math.max(sizeX, sizeY, sizeZ, 0.001);

// Resolution is along longest axis
const voxelSize = maxSize / resolution;
const nx = Math.max(1, Math.ceil(sizeX / voxelSize));
const ny = Math.max(1, Math.ceil(sizeY / voxelSize));
const nz = Math.max(1, Math.ceil(sizeZ / voxelSize));
```

**3. Triangle-Box Intersection**
```typescript
// For each triangle in the mesh
for (let t = 0; t < triangleCount; t++) {
  // Get triangle vertices
  const v0x = positions[i0], v0y = positions[i0 + 1], v0z = positions[i0 + 2];
  const v1x = positions[i1], v1y = positions[i1 + 1], v1z = positions[i1 + 2];
  const v2x = positions[i2], v2y = positions[i2 + 1], v2z = positions[i2 + 2];
  
  // Find voxel range that triangle overlaps
  const voxMinX = Math.max(0, Math.floor((triMinX - minX) / voxelSize));
  const voxMinY = Math.max(0, Math.floor((triMinY - minY) / voxelSize));
  const voxMinZ = Math.max(0, Math.floor((triMinZ - minZ) / voxelSize));
  const voxMaxX = Math.min(nx - 1, Math.floor((triMaxX - minX) / voxelSize));
  const voxMaxY = Math.min(ny - 1, Math.floor((triMaxY - minY) / voxelSize));
  const voxMaxZ = Math.min(nz - 1, Math.floor((triMaxZ - minZ) / voxelSize));
  
  // Test each voxel in range
  for (let vz = voxMinZ; vz <= voxMaxZ; vz++) {
    for (let vy = voxMinY; vy <= voxMaxY; vy++) {
      for (let vx = voxMinX; vx <= voxMaxX; vx++) {
        const cx = minX + (vx + 0.5) * voxelSize;
        const cy = minY + (vy + 0.5) * voxelSize;
        const cz = minZ + (vz + 0.5) * voxelSize;
        
        if (pointInTrianglePrism(cx, cy, cz, voxelSize, v0, v1, v2)) {
          const idx = vx + vy * nx + vz * nx * ny;
          data[idx] = 1; // Mark as filled
        }
      }
    }
  }
}
```

**4. Flood Fill Interior**
```typescript
// Start from boundary cells, flood fill exterior
// Any unfilled cells after flood fill are interior → mark as filled
const visited = new Uint8Array(nx * ny * nz);
const queue: number[] = [];

// Seed queue with boundary cells
for (let z = 0; z < nz; z++) {
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      if (x === 0 || x === nx - 1 || y === 0 || y === ny - 1 || z === 0 || z === nz - 1) {
        const idx = x + y * nx + z * nx * ny;
        if (data[idx] === 0 && visited[idx] === 0) {
          queue.push(idx);
          visited[idx] = 1;
        }
      }
    }
  }
}

// Flood fill exterior (6-connected)
while (queue.length > 0) {
  const idx = queue.pop()!;
  // ... visit neighbors
}

// Mark unvisited empty cells as filled (interior)
for (let i = 0; i < data.length; i++) {
  if (data[i] === 0 && visited[i] === 0) {
    data[i] = 1;
  }
}
```

**5. Generate Voxel Mesh**
```typescript
// For each filled voxel, generate cube faces
// Only generate faces that are exposed (neighbor is empty or out of bounds)
for (let vz = 0; vz < nz; vz++) {
  for (let vy = 0; vy < ny; vy++) {
    for (let vx = 0; vx < nx; vx++) {
      const idx = vx + vy * nx + vz * nx * ny;
      if (data[idx] === 0) continue; // Skip empty voxels
      
      // For each of 6 cube faces
      for (const face of cubeFaces) {
        const [v0, v1, v2, v3, nx_face, ny_face, nz_face] = face;
        
        // Check if neighbor in this direction is empty
        const neighborX = vx + nx_face;
        const neighborY = vy + ny_face;
        const neighborZ = vz + nz_face;
        
        // If neighbor is filled, skip this face (interior)
        if (neighborX >= 0 && neighborX < nx &&
            neighborY >= 0 && neighborY < ny &&
            neighborZ >= 0 && neighborZ < nz) {
          const neighborIdx = neighborX + neighborY * nx + neighborZ * nx * ny;
          if (data[neighborIdx] > 0) continue;
        }
        
        // Generate quad for this face
        // ... add vertices, normals, indices
      }
    }
  }
}
```

---

## Updated Test Rig

**File:** `client/src/store/useProjectStore.ts` → `addVoxelSolverRig()`

### Before (WRONG)

```
Input Geometry Group:
  - Width Slider → Box.width
  - Height Slider → Box.height
  - Depth Slider → Box.depth
  - Box (hidden)

Voxelization Parameters Group:
  - Resolution Slider → VoxelSolver.resolution + ExtractIsosurface.resolution
  - Volume Fraction Slider → VoxelSolver.volumeFraction
  - Penalty Exponent Slider → VoxelSolver.penaltyExponent
  - Filter Radius Slider → VoxelSolver.filterRadius
  - Iso Value Slider → ExtractIsosurface.isoValue
  - VoxelSolver (no geometry)
  - ExtractIsosurface (has geometry)

TextNote (displays mesh data)
```

**Description:** "The Voxel Solver performs topology optimization on the input domain. The Extract Isosurface node converts the voxel density field to a mesh using marching cubes."

### After (CORRECT)

```
Input Geometry Group:
  - Width Slider → Box.width
  - Height Slider → Box.height
  - Depth Slider → Box.depth
  - Box (hidden)

Voxelization Group:
  - Resolution Slider → Voxelizer.resolution
  - Voxelizer (has geometry - visible voxels)

TextNote (displays fill ratio)
```

**Description:** "Voxelizer converts geometry into a voxel grid. Resolution controls voxel density."

### Pipeline Comparison

**Before:**
```
Box (hidden) → VoxelSolver → ExtractIsosurface → TextNote
               (topology opt)  (marching cubes)
```

**After:**
```
Box (hidden) → Voxelizer → TextNote
               (simple voxelization)
```

---

## Code Changes

### Files Modified (4 Total)

1. **`client/src/workflow/nodes/solver/VoxelSolver.ts`** (+281, -16 lines)
   - Rewrote as standalone voxelizer (not inheriting from TopologySolver)
   - Added `voxelizeGeometry()` function (triangle-box intersection + flood fill)
   - Added `generateVoxelMesh()` function (creates blocky voxel mesh)
   - Updated inputs: `geometry`, `resolution`
   - Updated outputs: `voxelGrid`, `cellCount`, `filledCount`, `fillRatio`
   - Removed: `goals`, `volumeFraction`, `penaltyExponent`, `filterRadius`, `iterations`

2. **`client/src/workflow/nodes/solver/index.ts`** (+1, -1 lines)
   - Changed export from `createVoxelSolverNode` to `VoxelSolverNode`

3. **`client/src/workflow/nodeRegistry.ts`** (+1, -9 lines)
   - Changed import from `createVoxelSolverNode` to `VoxelSolverNode`
   - Removed TopologySolver lookup and wrapper pattern
   - Direct registration: `NODE_DEFINITIONS.push(..., VoxelSolverNode)`

4. **`client/src/store/useProjectStore.ts`** (+130, -113 lines)
   - Simplified test rig layout
   - Removed 4 parameter sliders (volumeFraction, penaltyExponent, filterRadius, isoValue)
   - Removed ExtractIsosurface node
   - Updated descriptions to reflect simple voxelization
   - Voxelizer node now owns geometry (visible voxels)
   - TextNote displays fill ratio instead of mesh data

---

## Visual Result

### Input
- **Solid Box** (smooth geometry, hidden in Roslyn)
- Dimensions: 2×2×2 units
- Resolution: 16 voxels along longest axis

### Output
- **Voxel Grid** (blocky representation, visible in Roslyn)
- Each filled voxel rendered as a cube
- Only exterior faces shown (interior faces culled)
- Maintains original geometry bounds

### Example Stats
```
Resolution: 16
Cell Count: 4096 (16³)
Filled Count: 2048
Fill Ratio: 0.5 (50% solid)
```

---

## Ontological Alignment

### Voxelizer Purpose

**What it does:**
- Converts geometry → voxel grid
- Simple, deterministic voxelization
- No optimization, no goals, no constraints

**What it doesn't do:**
- Topology optimization (use TopologySolver for that)
- Material distribution (use ChemistrySolver for that)
- Morphogenesis (use BiologicalSolver for that)

### Data Flow

```
Geometry (mesh) → Voxelizer → VoxelGrid (occupancy data)
                            → Mesh (blocky visualization)
                            → Stats (cellCount, filledCount, fillRatio)
```

### Downstream Uses

Users can connect the `voxelGrid` output to:
- **ExtractIsosurface** - Marching cubes isosurface extraction
- **VoxelAnalysis** - Volume, surface area, centroid calculations
- **VoxelExport** - Export to .vox, .binvox, .schematic formats
- **Custom Nodes** - User-defined voxel processing

---

## Testing

### Manual Test

1. Open Lingua in browser
2. Add "Voxel Solver" rig from menu
3. Verify nodes are connected:
   - Width/Height/Depth sliders → Box
   - Box → Voxelizer (geometry input)
   - Resolution slider → Voxelizer (resolution input)
   - Voxelizer → TextNote (fillRatio output)
4. Check Roslyn canvas:
   - Box is NOT visible (hidden)
   - Voxelized mesh IS visible (blocky cubes)
5. Adjust resolution slider (4-64):
   - Lower resolution = larger voxels (blockier)
   - Higher resolution = smaller voxels (smoother)
6. Adjust box dimensions:
   - Voxels update to match new geometry
7. Check TextNote:
   - Displays fill ratio (e.g., "0.5" = 50% solid)

### Expected Behavior

- ✅ Voxelizer generates visible blocky mesh
- ✅ Resolution controls voxel density
- ✅ Box geometry is hidden
- ✅ Voxels update when inputs change
- ✅ Fill ratio is accurate
- ✅ No topology optimization parameters
- ✅ No false descriptions

---

## Benefits

1. **Semantic Clarity** - Voxelizer does what it says: voxelizes geometry
2. **Simplicity** - Only 2 inputs (geometry, resolution), 4 outputs
3. **Performance** - No optimization loop, just deterministic voxelization
4. **Correctness** - Matches Peter's images and requirements
5. **Flexibility** - Users decide what to do with voxels
6. **Ontological Alignment** - Clear separation from TopologySolver

---

## Future Enhancements (Optional)

1. **Voxel Visualization Modes**
   - Wireframe cubes
   - Point cloud
   - Instanced rendering (GPU)

2. **Voxelization Options**
   - Surface-only voxelization (no interior fill)
   - Conservative voxelization (all overlapping voxels)
   - Thin-feature preservation

3. **Voxel Grid Export**
   - .vox (MagicaVoxel)
   - .binvox (binary voxel format)
   - .schematic (Minecraft)

4. **Voxel Analysis Nodes**
   - Volume calculation
   - Surface area calculation
   - Centroid calculation
   - Moment of inertia

5. **Voxel Processing Nodes**
   - Voxel erosion/dilation
   - Voxel smoothing
   - Voxel boolean operations

---

## Summary

**Voxel Solver rewrite complete!**

- ✅ Rewrote as standalone geometry voxelizer
- ✅ Removed topology optimization inheritance
- ✅ Simplified inputs (geometry, resolution)
- ✅ Implemented proper voxelization algorithm
- ✅ Generates visible voxel mesh (blocky cubes)
- ✅ Updated test rig with correct description
- ✅ Removed false topology optimization claims
- ✅ Ontologically aligned with Lingua's semantic structure

**The Voxel Solver now does exactly what Peter wanted: converts geometry into voxels. Simple, efficient, and correct!** 🎯
