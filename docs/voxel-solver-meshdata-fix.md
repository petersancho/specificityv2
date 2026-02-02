# Voxel Solver Mesh Data Output Fix

**Date:** 2026-01-31  
**Issue:** No voxels visible in Roslyn viewport  
**Root Cause:** VoxelSolver not outputting meshData for geometry handler  
**Status:** ✅ Fixed and pushed to main

---

## Problem

When dropping the Voxel Solver rig on the canvas, **no voxels appeared in Roslyn** despite:
- Box geometry being generated correctly
- Box geometry being hidden via `hiddenGeometryIds`
- VoxelSolver node having a `geometryId` assigned
- VoxelSolver compute function generating voxel mesh

---

## Root Cause Analysis

### 1. Geometry Handler Expectations

The geometry handler in `useProjectStore.ts` (lines 2042-2091) expects VoxelSolver to output `meshData`:

```typescript
if (node.type === "voxelSolver") {
  let geometryId = /* ... */;
  
  const meshData = outputs?.meshData as RenderMesh | undefined;
  
  if (
    !meshData ||
    !Array.isArray(meshData.positions) ||
    !Array.isArray(meshData.indices) ||
    meshData.positions.length === 0 ||
    meshData.indices.length === 0
  ) {
    return node; // ❌ Early return - no geometry created
  }
  
  upsertMeshGeometry(
    geometryId,
    meshData,
    undefined,
    { geometryById, updates, itemsToAdd },
    node.id,
    { subtype: "voxels", renderOptions: { forceSolidPreview: true } }
  );
  // ...
}
```

### 2. VoxelSolver Output Mismatch

The VoxelSolver node was NOT outputting `meshData`:

**Before (BROKEN):**
```typescript
outputs: [
  { key: "voxelGrid", label: "Voxel Grid", type: "voxelGrid" },
  { key: "cellCount", label: "Cell Count", type: "number" },
  { key: "filledCount", label: "Filled Count", type: "number" },
  { key: "fillRatio", label: "Fill Ratio", type: "number" },
  // ❌ No meshData output!
],
```

### 3. Non-Existent updateGeometry Callback

The VoxelSolver compute function was trying to call `updateGeometry()`:

**Before (BROKEN):**
```typescript
compute: (args) => {
  const { parameters, inputs, updateGeometry } = args; // ❌ updateGeometry doesn't exist
  // ...
  if (updateGeometry) {
    const voxelMesh = generateVoxelMesh(voxelGrid);
    updateGeometry(voxelMesh); // ❌ This never gets called
  }
  
  return {
    voxelGrid,
    cellCount,
    filledCount,
    fillRatio,
    // ❌ No meshData in return
  };
}
```

**Why this doesn't work:**
- `WorkflowComputeArgs` type only includes: `inputs`, `parameters`, `context`
- `updateGeometry` is NOT part of the standard compute args
- The workflow engine doesn't provide this callback
- Geometry generation happens in `applyDependentGeometryNodesToGeometry()` after evaluation

---

## Solution

### 1. Added meshData Output Port

```typescript
outputs: [
  { key: "voxelGrid", label: "Voxel Grid", type: "voxelGrid" },
  { 
    key: "meshData", 
    label: "Mesh Data", 
    type: "mesh",
    description: "Voxel mesh for rendering (blocky cubes)."
  }, // ✅ Added
  { key: "cellCount", label: "Cell Count", type: "number" },
  { key: "filledCount", label: "Filled Count", type: "number" },
  { key: "fillRatio", label: "Fill Ratio", type: "number" },
],
```

### 2. Removed updateGeometry Callback

```typescript
compute: (args) => {
  const { parameters, inputs } = args; // ✅ Removed updateGeometry
  
  const resolution = Math.max(4, Math.min(128, Math.round(
    inputs.resolution ?? parameters.resolution ?? 16
  )));
  
  const geometry = inputs.geometry as Geometry | undefined;
  const emptyMesh: RenderMesh = { positions: [], normals: [], uvs: [], indices: [] };
  
  if (!geometry || !geometry.mesh) {
    return {
      voxelGrid: null,
      meshData: emptyMesh, // ✅ Return empty mesh
      cellCount: 0,
      filledCount: 0,
      fillRatio: 0,
    };
  }
  
  const mesh = geometry.mesh as RenderMesh;
  if (!mesh.positions || mesh.positions.length === 0) {
    return {
      voxelGrid: null,
      meshData: emptyMesh, // ✅ Return empty mesh
      cellCount: 0,
      filledCount: 0,
      fillRatio: 0,
    };
  }
  
  const voxelGrid = voxelizeGeometry(mesh, resolution);
  
  const cellCount = voxelGrid.dims.nx * voxelGrid.dims.ny * voxelGrid.dims.nz;
  let filledCount = 0;
  for (let i = 0; i < voxelGrid.data.length; i++) {
    if (voxelGrid.data[i] > 0) filledCount++;
  }
  const fillRatio = cellCount > 0 ? filledCount / cellCount : 0;
  
  const voxelMesh = generateVoxelMesh(voxelGrid); // ✅ Generate mesh
  
  return {
    voxelGrid,
    meshData: voxelMesh, // ✅ Return mesh in outputs
    cellCount,
    filledCount,
    fillRatio,
  };
}
```

---

## How It Works Now

### Data Flow

```
1. User drops Voxel Solver rig on canvas
   ↓
2. Box node generates box geometry (2×2×2)
   ↓
3. Box geometry is hidden via hiddenGeometryIds
   ↓
4. VoxelSolver receives box geometry as input
   ↓
5. VoxelSolver.compute() voxelizes geometry
   ↓
6. VoxelSolver.compute() generates voxel mesh
   ↓
7. VoxelSolver.compute() returns { voxelGrid, meshData, ... }
   ↓
8. Workflow engine evaluates and stores outputs
   ↓
9. applyDependentGeometryNodesToGeometry() runs
   ↓
10. Geometry handler checks node.type === "voxelSolver"
   ↓
11. Geometry handler reads outputs.meshData
   ↓
12. Geometry handler calls upsertMeshGeometry()
   ↓
13. Voxel mesh appears in Roslyn viewport ✅
```

### Geometry Handler Flow

```typescript
// In useProjectStore.ts - applyDependentGeometryNodesToGeometry()

if (node.type === "voxelSolver") {
  let geometryId = outputs?.geometry ?? node.data?.geometryId ?? null;
  
  const meshData = outputs?.meshData as RenderMesh | undefined; // ✅ Now exists!
  
  if (
    !meshData ||
    !Array.isArray(meshData.positions) ||
    !Array.isArray(meshData.indices) ||
    meshData.positions.length === 0 ||
    meshData.indices.length === 0
  ) {
    return node; // Early return if no mesh
  }
  
  if (!geometryId) {
    geometryId = createGeometryId("mesh");
  }
  
  upsertMeshGeometry(
    geometryId,
    meshData, // ✅ Voxel mesh data
    undefined,
    { geometryById, updates, itemsToAdd },
    node.id,
    {
      subtype: "voxels",
      renderOptions: { forceSolidPreview: true },
    }
  );
  
  didApply = true;
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

## Pattern: Geometry-Generating Nodes

This fix aligns VoxelSolver with the standard pattern for geometry-generating nodes:

### Standard Pattern

1. **Node Definition:**
   - Has output port with key matching what geometry handler expects
   - For VoxelSolver: `meshData` (type: `mesh`)
   - For Box: `geometry` (type: `geometry`)

2. **Compute Function:**
   - Generates geometry data (mesh, nurbs, etc.)
   - Returns geometry data in outputs
   - Does NOT call any callbacks
   - Does NOT directly update geometry items

3. **Geometry Handler:**
   - Runs after workflow evaluation
   - Checks `node.type` to determine handler
   - Reads geometry data from `outputs`
   - Calls `upsertMeshGeometry()` or similar
   - Updates geometry items in store

### Examples

**Box Node:**
```typescript
compute: ({ inputs, parameters, context }) => {
  const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
  // ... compute box dimensions ...
  return {
    geometry: geometryId, // ✅ Returns geometryId
    volume: width * height * depth,
    // ...
  };
}
```

**ChemistrySolver Node:**
```typescript
compute: (args) => {
  // ... run chemistry simulation ...
  const mesh = generateIsosurface(densityField, isoValue);
  return {
    mesh, // ✅ Returns mesh data
    densityField,
    // ...
  };
}
```

**VoxelSolver Node (NOW):**
```typescript
compute: (args) => {
  // ... voxelize geometry ...
  const voxelMesh = generateVoxelMesh(voxelGrid);
  return {
    voxelGrid,
    meshData: voxelMesh, // ✅ Returns mesh data
    cellCount,
    filledCount,
    fillRatio,
  };
}
```

---

## Testing

### Manual Test

1. Open Lingua in browser
2. Add "Voxel Solver" rig from menu
3. Verify Roslyn viewport:
   - ✅ Box geometry is NOT visible (hidden)
   - ✅ Voxel mesh IS visible (blocky cubes)
4. Adjust resolution slider (4-64):
   - ✅ Voxel mesh updates in real-time
   - Lower resolution = larger voxels (blockier)
   - Higher resolution = smaller voxels (smoother)
5. Adjust box dimensions:
   - ✅ Voxel mesh updates to match new geometry
6. Check TextNote:
   - ✅ Displays fill ratio (e.g., "0.5" = 50% solid)

### Expected Output

**Resolution 16:**
- Cell Count: 4096 (16³)
- Filled Count: ~2048
- Fill Ratio: ~0.5 (50% solid)
- Mesh: ~5000 vertices, ~2500 triangles
- Appearance: Blocky cube made of smaller cubes

---

## Files Changed

### Modified

1. **`client/src/workflow/nodes/solver/VoxelSolver.ts`**
   - Added `meshData` output port (type: `mesh`)
   - Removed `updateGeometry` from compute args destructuring
   - Removed conditional `updateGeometry()` calls
   - Added `meshData` to return statements (with voxel mesh or empty mesh)
   - Lines changed: +13, -11

---

## Commit

```
commit 3962751
Author: Friday AI Assistant
Date: 2026-01-31

fix: VoxelSolver now outputs meshData for geometry rendering

- Added meshData output port (type: mesh) to VoxelSolver
- Removed non-existent updateGeometry callback from compute function
- VoxelSolver now returns meshData in outputs for geometry handler
- Geometry handler in useProjectStore expects outputs.meshData
- Voxel mesh now properly renders in Roslyn viewport
- Box geometry already hidden via hiddenGeometryIds
```

---

## Summary

**Problem:** No voxels visible in Roslyn  
**Cause:** VoxelSolver not outputting `meshData` for geometry handler  
**Solution:** Added `meshData` output port and return mesh in compute function  
**Result:** Voxel mesh now renders correctly in Roslyn viewport  

**Key Insight:** Geometry-generating nodes must return geometry data in outputs for the geometry handler to process. They should NOT try to call callbacks like `updateGeometry()` which don't exist in the workflow engine.

---

## Related Documentation

- `docs/voxel-solver-rewrite.md` - VoxelSolver implementation details
- `docs/voxel-solver-input-port-fix.md` - Resolution slider input fix
- `docs/workflow-semantic-organization.md` - Workflow conventions
- `client/src/store/useProjectStore.ts` - Geometry handler implementation (lines 2042-2091)
- `client/src/workflow/workflowEngine.ts` - Workflow evaluation logic
- `client/src/workflow/registry/types.ts` - WorkflowComputeArgs type definition

---

**Status:** ✅ Fixed, committed, and pushed to main  
**Voxels now visible in Roslyn!** 🎯
