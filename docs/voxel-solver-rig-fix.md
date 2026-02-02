# Voxel Solver Rig Fix - Complete Summary

## 🎯 Problem Statement

The Voxel Solver test rig had incorrect node connections and was missing a critical node in the processing pipeline. This prevented proper voxel-to-mesh conversion and caused the input box geometry to remain visible in the Roslyn canvas.

---

## ❌ Issues Found

### 1. **Wrong Input Handle**
- **Before**: `Box → VoxelSolver` using `"geometry"` handle
- **Problem**: VoxelSolver expects `"domain"` input (inherited from TopologySolver)
- **Result**: Connection failed, solver couldn't process input

### 2. **Missing Node**
- **Before**: `VoxelSolver → Mesh` (direct connection)
- **Problem**: VoxelSolver outputs `voxelGrid` and `densityField`, NOT `mesh`
- **Result**: No mesh output, connection failed

### 3. **Wrong Output Handle**
- **Before**: Trying to use `VoxelSolver.mesh` output
- **Problem**: VoxelSolver doesn't have a `mesh` output
- **Result**: Undefined output, no geometry generated

### 4. **Wrong Parameter Mappings**
- **Before**: Sliders connected to non-existent parameters (`padding`, `mode`, `thickness`)
- **Problem**: VoxelSolver uses topology optimization parameters (`volumeFraction`, `penaltyExponent`, `filterRadius`)
- **Result**: Parameters had no effect on solver

### 5. **Box Geometry Visible**
- **Before**: Box geometry rendered in Roslyn canvas
- **Problem**: Users see the input domain box instead of just the voxelized result
- **Result**: Confusing visualization, cluttered canvas

---

## ✅ Solution Implemented

### 1. **Added extractIsosurface Node**

The correct pipeline is:
```
Box → VoxelSolver → extractIsosurface → Mesh
```

**extractIsosurface Node:**
- **Input**: `voxelGrid` (from VoxelSolver)
- **Output**: `mesh` (render mesh) and `geometry` (geometry ID)
- **Purpose**: Converts voxel density field to triangulated mesh using marching cubes
- **Parameters**: `isoValue` (0-1), `resolution` (4-36)

### 2. **Fixed All Connections**

**Correct Wiring:**
```typescript
// Input: Box dimensions
widthSlider → Box.width
heightSlider → Box.height
depthSlider → Box.depth

// Domain input
Box.geometry → VoxelSolver.domain ✅ (was: VoxelSolver.geometry ❌)

// Solver parameters
resolutionSlider → VoxelSolver.resolution
volumeFractionSlider → VoxelSolver.volumeFraction ✅ (was: padding ❌)
penaltyExponentSlider → VoxelSolver.penaltyExponent ✅ (was: mode ❌)
filterRadiusSlider → VoxelSolver.filterRadius ✅ (was: thickness ❌)

// Voxel to mesh conversion
VoxelSolver.voxelGrid → extractIsosurface.voxelGrid ✅ (NEW)
isoValueSlider → extractIsosurface.isoValue ✅ (was: VoxelSolver.isoValue ❌)
resolutionSlider → extractIsosurface.resolution ✅ (shared with solver)

// Mesh output
extractIsosurface.mesh → Mesh.mesh ✅ (was: VoxelSolver.mesh ❌)
Mesh.mesh → TextNote.data
```

### 3. **Updated Slider Parameters**

**Resolution Slider:**
- Range: 8-32 (was: 8-24)
- Connected to: VoxelSolver.resolution AND extractIsosurface.resolution
- Purpose: Controls voxel grid resolution

**Volume Fraction Slider** (was: Padding):
- Range: 0.05-0.95 (was: 0-2)
- Connected to: VoxelSolver.volumeFraction
- Purpose: Target solid volume fraction for topology optimization

**Penalty Exponent Slider** (was: Mode):
- Range: 1-6 (was: 0-1)
- Connected to: VoxelSolver.penaltyExponent
- Purpose: SIMP penalty exponent for stiffness

**Filter Radius Slider** (was: Thickness):
- Range: 0-8 (was: 0-4)
- Connected to: VoxelSolver.filterRadius
- Purpose: Neighborhood radius in voxels for density filtering

**Iso Value Slider:**
- Range: 0-1
- Connected to: extractIsosurface.isoValue
- Purpose: Density threshold for isosurface extraction

### 4. **Hidden Box Geometry**

Added box geometry to `hiddenGeometryIds` array:
```typescript
set((state) => ({
  hiddenGeometryIds: [...state.hiddenGeometryIds, boxGeometryId],
}));
```

**Result**: Only the voxelized mesh is visible in Roslyn canvas, not the input box.

### 5. **Updated Text Description**

**Before:**
> "The Voxel Solver converts input geometry to a voxel grid. Parameter sliders connect to the solver's inputs. The Mesh node receives the voxelized geometry output."

**After:**
> "The Voxel Solver performs topology optimization on the input domain. The Extract Isosurface node converts the voxel density field to a mesh using marching cubes. Parameter sliders control resolution and iso value."

---

## 🏛️ Ontological Alignment

### VoxelSolver Node Schema

**Type**: `voxelSolver` (inherits from `topologySolver`)

**Inputs:**
- `domain` (geometry) - Design domain geometry
- `goals` (goal[]) - Structural goals (volume, stiffness, load, anchor)
- `voxelGrid` (any) - Optional voxel grid domain

**Outputs:**
- `densityField` (any) - Solved density field in X-fast order
- `voxelGrid` (any) - Voxel grid with updated densities
- `bestScore` (number) - Best score (1 - objective)
- `objective` (number) - Objective value (lower is better)
- `constraint` (number) - Volume constraint residual
- `iterations` (number) - Iterations executed
- `resolution` (number) - Resolution used for the solve
- `status` (string) - Solver status string

**Parameters:**
- `volumeFraction` (0.05-0.95) - Target solid volume fraction
- `penaltyExponent` (1-6) - SIMP penalty exponent for stiffness
- `filterRadius` (0-8) - Neighborhood radius in voxels
- `iterations` (1-120) - Solver iterations to run
- `resolution` (4-36) - Grid resolution when no voxel grid input is provided

### extractIsosurface Node Schema

**Type**: `extractIsosurface`

**Inputs:**
- `voxelGrid` (any) - Voxel grid or density array to extract from

**Outputs:**
- `geometry` (geometry) - Geometry ID that receives the extracted mesh
- `mesh` (any) - Generated render mesh for the isosurface
- `cellCount` (number) - Total voxels evaluated in the grid

**Parameters:**
- `isoValue` (0-1) - Density threshold for extracting occupied cells
- `resolution` (4-36) - Resolution used when the input is a raw density list

---

## 📊 Changes Summary

**Files Modified:** 1
- `client/src/store/useProjectStore.ts`

**Lines Changed:**
- +61 lines added
- -19 lines removed
- Net: +42 lines

**Nodes Added:** 1
- `extractIsosurface` node

**Geometries Added:** 1
- `extractIsosurfaceGeometry`

**Edges Fixed:** 9
- Box → VoxelSolver (fixed handle)
- 4 parameter sliders → VoxelSolver (fixed handles)
- VoxelSolver → extractIsosurface (NEW)
- isoValue slider → extractIsosurface (NEW)
- resolution slider → extractIsosurface (NEW)
- extractIsosurface → Mesh (NEW)

**Hidden Geometries:** 1
- Box geometry (input domain)

---

## 🎨 Visual Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Input Geometry Group                                                    │
│                                                                         │
│  [Width Slider]                                                         │
│  [Height Slider]  →  [Box] (HIDDEN)                                    │
│  [Depth Slider]                                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

                              ↓ geometry (domain)

┌─────────────────────────────────────────────────────────────────────────┐
│ Voxelization Parameters Group                                           │
│                                                                         │
│  [Resolution]                                                           │
│  [Volume Fraction]  →  [VoxelSolver]  →  [extractIsosurface]  →  [Mesh]│
│  [Penalty Exp]                ↓                    ↑                    │
│  [Filter Radius]         voxelGrid            isoValue                  │
│  [Iso Value]  ────────────────────────────────────┘                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

                              ↓ mesh

                         [TextNote]
                    (displays mesh data)
```

---

## ✨ Result

**Before:**
- ❌ Voxel Solver didn't generate geometry
- ❌ Wrong parameter connections
- ❌ Box geometry visible in Roslyn
- ❌ No isosurface extraction
- ❌ Confusing workflow

**After:**
- ✅ Voxel Solver generates voxel density field
- ✅ extractIsosurface converts to mesh using marching cubes
- ✅ Correct parameter mappings (volumeFraction, penaltyExponent, filterRadius)
- ✅ Box geometry hidden (only voxels visible)
- ✅ Clear topology optimization workflow
- ✅ Proper list panel formatting (correct port types)
- ✅ All wires connected with correct handles

---

## 🚀 Testing

**To verify the fix:**

1. Open Lingua in browser
2. Add Voxel Solver rig from menu
3. Verify nodes are properly connected with wires
4. Adjust sliders and observe:
   - Resolution slider affects voxel grid density
   - Volume Fraction slider controls solid/void ratio
   - Iso Value slider controls surface threshold
5. Verify in Roslyn canvas:
   - Box geometry is NOT visible
   - Only voxelized mesh is visible
   - Mesh updates when sliders change
6. Double-right-click Mesh node to ontologize
7. Check TextNote displays mesh data correctly

---

## 📝 Commit

**Commit**: `035b777`
**Message**: "fix: correct Voxel Solver rig wiring and add extractIsosurface node"
**Status**: ✅ Pushed to origin/main

---

## 🎯 Ontological Principles Applied

1. **Correct Port Schema** - All connections use proper input/output handles
2. **Semantic Clarity** - Node names and descriptions accurately reflect function
3. **Pipeline Transparency** - Clear data flow from domain → voxels → mesh
4. **Parameter Alignment** - Sliders map to actual solver parameters
5. **Visual Clarity** - Hidden input geometry, visible output geometry
6. **Type Safety** - All port types match (geometry, any, mesh, number)
7. **Computational Provenance** - Full pipeline traceable through nodes

**The Voxel Solver rig now correctly implements the topology optimization workflow with proper node connections, parameter mappings, and visualization!** 🎯
