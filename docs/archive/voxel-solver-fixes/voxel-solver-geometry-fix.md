# Voxel Solver Geometry Fix

**Date:** 2026-02-02  
**Commit:** 308bacb  
**Issue:** Voxel Solver rig not generating visible geometry in Roslyn

---

## Problem

When dropping the Voxel Solver rig on the canvas, no voxels appeared in Roslyn despite the solver computing correctly (test rig showed 5136 vertices, 2568 triangles generated).

---

## Root Cause

**Incorrect geometry ownership assignment:**

1. **voxelSolver node** had a `geometryId` but shouldn't - it outputs `voxelGrid` data, not renderable geometry
2. **mesh node** had a `geometryId` but was just a redundant pass-through
3. Four geometries were created but only one should be visible: `extractIsosurfaceGeometry`

**The render pipeline was looking for geometry on the wrong nodes.**

---

## Solution

### Changes Made

1. **Removed `geometryId` from voxelSolver node**
   - VoxelSolver outputs: `densityField`, `voxelGrid`, `objective`, `constraint`, `iterations`, `resolution`, `status`
   - None of these are renderable geometry

2. **Removed mesh node from rig**
   - Was a redundant pass-through
   - Simplified pipeline

3. **Only extractIsosurface node owns geometry**
   - ExtractIsosurface outputs: `geometry`, `mesh`, `cellCount`
   - This is the node that performs marching cubes and generates renderable mesh

4. **Simplified geometry registration**
   - Before: `[boxGeometry, voxelGeometry, extractIsosurfaceGeometry, meshGeometry]`
   - After: `[boxGeometry, extractIsosurfaceGeometry]`
   - Box is hidden, extractIsosurface is visible

---

## Pipeline

### Before (Broken)
```
Box → VoxelSolver → ExtractIsosurface → Mesh → TextNote
      (had geometryId)                  (had geometryId)
```

### After (Working)
```
Box (hidden) → VoxelSolver → ExtractIsosurface → TextNote
               (no geometryId)  (has geometryId)
```

---

## Node Responsibilities

| Node | Inputs | Outputs | Owns Geometry? |
|------|--------|---------|----------------|
| **Box** | width, height, depth | geometry | ✅ Yes (hidden) |
| **VoxelSolver** | domain, goals, parameters | voxelGrid, densityField, metrics | ❌ No |
| **ExtractIsosurface** | voxelGrid, isoValue, resolution | geometry, mesh, cellCount | ✅ Yes (visible) |
| **TextNote** | data | - | ❌ No |

---

## Geometry Ownership Rules

**Only nodes that output renderable geometry should have a `geometryId`:**

- ✅ **extractIsosurface** - performs marching cubes, outputs mesh
- ✅ **box, sphere, primitive** - generate mesh geometry
- ✅ **meshBoolean, meshConvert** - transform/generate mesh
- ❌ **voxelSolver, topologySolver** - output data fields, not geometry
- ❌ **slider, textNote, group** - UI/data nodes, not geometry

---

## Verification

**Test the fix:**

1. Open Lingua in browser
2. Add "Voxel Solver" rig from menu
3. Verify nodes are connected with wires
4. Check Roslyn canvas:
   - ✅ Box is NOT visible (hidden)
   - ✅ Voxelized mesh IS visible
   - ✅ Mesh updates when sliders change

**Expected output:**
- Isosurface mesh with ~5000 vertices visible in Roslyn
- Topology optimization completes successfully
- Sliders control resolution, volume fraction, penalty exponent, filter radius, iso value

---

## Code Statistics

**Files Modified:** 1
- `client/src/store/useProjectStore.ts` (-62 lines, +13 lines)

**Nodes Removed:** 1
- Mesh node (redundant pass-through)

**Geometries Removed:** 2
- voxelGeometry (voxelSolver doesn't output geometry)
- meshGeometry (mesh node removed)

**Edges Updated:** 2
- Removed: ExtractIsosurface → Mesh → TextNote
- Added: ExtractIsosurface → TextNote

---

## Ontological Alignment

**Data Flow Principle:**
- Nodes output typed data (voxelGrid, mesh, geometry, number, string)
- Only nodes that generate renderable geometry own geometryIds
- Intermediate data (voxelGrid, densityField) flows through edges without creating geometry items

**Separation of Concerns:**
- **VoxelSolver:** Topology optimization (data processing)
- **ExtractIsosurface:** Marching cubes (geometry generation)
- **TextNote:** Data display (UI)

**Single Responsibility:**
- Each node has one clear purpose
- No redundant pass-through nodes
- Clear ownership of geometry

---

## Related Documentation

- [Voxel Solver Rig Fix](./voxel-solver-rig-fix.md) - Previous wiring fix
- [Voxel Solver Implementation](./voxel-solver-implementation.md) - Test rig validation
- [Ontological Refactor Summary](./ontological-refactor-summary.md) - Roslyn-Numerica bridge

---

## Lessons Learned

1. **Geometry ownership must match node output schema**
   - If a node doesn't output geometry in its schema, don't assign geometryId

2. **Avoid redundant pass-through nodes**
   - If a node doesn't transform data, it's probably not needed

3. **Test with actual UI, not just test rigs**
   - Test rigs can pass while UI fails due to geometry registration issues

4. **Follow existing patterns**
   - Check how other solvers (Physics, Chemistry) handle geometry
   - VoxelSolver should follow TopologySolver pattern (no geometry output)

---

## Future Improvements

1. **Add guardrail helper**
   ```ts
   const NODE_TYPES_WITH_GEOMETRY_OUTPUT = new Set([
     "extractIsosurface",
     "box", "sphere", "primitive",
     "meshBoolean", "meshConvert",
     // ...
   ]);
   
   function nodeTypeSupportsGeometry(type: string) {
     return NODE_TYPES_WITH_GEOMETRY_OUTPUT.has(type);
   }
   ```

2. **Validate geometry ownership in rig creation**
   - Assert that only geometry-producing nodes get geometryIds
   - Prevent regression

3. **Update node typings**
   - Make `geometryId` optional in node data schema
   - Only require it for geometry-producing nodes

---

## Summary

**The Voxel Solver now correctly generates visible geometry in Roslyn!**

- ✅ VoxelSolver outputs voxelGrid data (not geometry)
- ✅ ExtractIsosurface generates visible mesh geometry
- ✅ Box geometry is hidden
- ✅ Simplified pipeline with no redundant nodes
- ✅ Only 2 geometries registered (box + isosurface)
- ✅ Clear separation of concerns
- ✅ Ontologically aligned with other solvers

**Result:** Dropping the Voxel Solver rig on the canvas now shows voxelized mesh in Roslyn immediately after evaluation completes.
