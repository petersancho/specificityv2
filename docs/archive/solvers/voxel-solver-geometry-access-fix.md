# Voxel Solver Geometry Access Fix

## Problem

The Voxel Solver was not generating visible voxels in Roslyn because it couldn't access the input geometry (Box) during workflow evaluation.

### Root Cause

The workflow recalculation flow has multiple phases:

1. **First `evaluateWorkflow`** - VoxelSolver compute runs, but Box geometry doesn't exist yet
2. **`applyDependentGeometryNodesToGeometry`** - Box geometry is created and populated with mesh data
3. **Second `evaluateWorkflow`** - VoxelSolver compute runs again, but the handler reads outputs from the first evaluation

The VoxelSolver handler was in `applyDependentGeometryNodesToGeometry`, which runs BEFORE the Box geometry is created. So it was reading empty `meshData` from the first evaluation.

### Workflow Evaluation Order

```
1. evaluateWorkflow(state.geometry)
   ├─ Box compute: returns geometryId (no mesh yet)
   └─ VoxelSolver compute: can't find Box geometry → returns empty meshData

2. applySeedGeometryNodesToGeometry
   └─ Creates seed geometries

3. evaluateWorkflow(seedApplied.geometry)
   ├─ Box compute: returns geometryId
   └─ VoxelSolver compute: still can't find Box mesh

4. applyDependentGeometryNodesToGeometry
   ├─ Box handler: creates actual mesh geometry ✅
   └─ VoxelSolver handler: reads empty meshData from step 3 ❌

5. evaluateWorkflow(dependentApplied.geometry)
   ├─ Box compute: returns geometryId
   └─ VoxelSolver compute: NOW has access to Box mesh ✅
       (but handler already ran in step 4)
```

## Solution

### 1. Fixed Type Imports

**Before:**
```typescript
import type { Geometry, RenderMesh, VoxelGrid } from "../../types";
```

**After:**
```typescript
import type { Geometry, RenderMesh, VoxelGrid, Vec3, MeshGeometry } from "../../../types";
```

The VoxelSolver is at `client/src/workflow/nodes/solver/VoxelSolver.ts`, so it needs to go up 3 levels to reach `client/src/types.ts`.

### 2. Updated Geometry Access Pattern

**Before:**
```typescript
const geometry = inputs.geometry as Geometry | undefined;
if (!geometry || !geometry.mesh) {
  return emptyResult;
}
```

**After:**
```typescript
// inputs.geometry is a geometry ID (string), not the actual geometry object
// We need to look it up from context.geometryById
const geometryId = inputs.geometry as string | undefined;
if (!geometryId) {
  return emptyResult;
}

const geometry = context.geometryById.get(geometryId) as Geometry | undefined;
if (!geometry) {
  return emptyResult;
}

// Check if geometry has mesh data (MeshGeometry type)
const meshGeometry = geometry as MeshGeometry;
if (!meshGeometry.mesh || meshGeometry.type !== "mesh") {
  return emptyResult;
}
```

### 3. Fixed VoxelGrid Type Structure

The `VoxelGrid` type in `types.ts` uses:
- `resolution: { x, y, z }` (not `dims: { nx, ny, nz }`)
- `bounds: { min, max }` (not `origin` and separate bounds)
- `cellSize: { x, y, z }` (not `voxelSize`)
- `densities: number[]` (not `data: Uint8Array`)

**Before:**
```typescript
return {
  dims: { nx, ny, nz },
  origin: { x: minX, y: minY, z: minZ },
  voxelSize,
  data,
};
```

**After:**
```typescript
const grid: VoxelGrid = {
  resolution: { x: nx, y: ny, z: nz },
  bounds: {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  },
  cellSize: { x: voxelSize, y: voxelSize, z: voxelSize },
  densities,
};
```

### 4. Moved VoxelSolver Handler to Later Phase

Created a new `applyVoxelSolverNodesToGeometry` function that runs AFTER `evaluatedAfterCreate`, ensuring the VoxelSolver has access to the populated Box geometry.

**New Function:**
```typescript
const applyVoxelSolverNodesToGeometry = (
  nodes: WorkflowNode[],
  geometry: Geometry[]
) => {
  const geometryById = new Map<string, Geometry>(
    geometry.map((item) => [item.id, item])
  );
  const updates = new Map<string, Partial<Geometry>>();
  const itemsToAdd: Geometry[] = [];
  let didApply = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "voxelSolver") return node;
    const outputs = node.data?.outputs;
    let geometryId = /* ... */;
    const meshData = outputs?.meshData as RenderMesh | undefined;

    if (!meshData || meshData.positions.length === 0) {
      return node;
    }

    // Update existing geometry or create new
    if (existing && existing.type === "mesh") {
      updates.set(geometryId, {
        mesh: meshData,
        subtype: "voxels",
        renderOptions: { forceSolidPreview: true },
      });
    } else {
      itemsToAdd.push({
        id: geometryId,
        type: "mesh",
        mesh: meshData,
        subtype: "voxels",
        renderOptions: { forceSolidPreview: true },
      });
    }

    didApply = true;
    return { ...node, data: { ...node.data, geometryId, geometryType: "mesh", isLinked: true } };
  });

  // Apply updates and add new items
  const nextGeometry = [
    ...geometry.map((item) => {
      const update = updates.get(item.id);
      return update ? ({ ...item, ...update } as Geometry) : item;
    }),
    ...itemsToAdd,
  ];

  return { nodes: nextNodes, geometry: nextGeometry, didApply };
};
```

**Added to Recalculation Flow:**
```typescript
const chemistryApplied = applyChemistrySolverNodesToGeometry(
  solverApplied.nodes,
  solverApplied.geometry
);
const voxelApplied = applyVoxelSolverNodesToGeometry(  // ✅ NEW
  chemistryApplied.nodes,
  chemistryApplied.geometry
);
const importApplied = applyImportNodesToGeometry(
  voxelApplied.nodes,  // ✅ Updated
  voxelApplied.geometry  // ✅ Updated
);
```

## Updated Workflow Evaluation Order

```
1. evaluateWorkflow(state.geometry)
   ├─ Box compute: returns geometryId
   └─ VoxelSolver compute: can't find Box mesh → returns empty meshData

2. applySeedGeometryNodesToGeometry
   └─ Creates seed geometries

3. evaluateWorkflow(seedApplied.geometry)
   ├─ Box compute: returns geometryId
   └─ VoxelSolver compute: still can't find Box mesh

4. applyDependentGeometryNodesToGeometry
   └─ Box handler: creates actual mesh geometry ✅

5. evaluateWorkflow(dependentApplied.geometry)
   ├─ Box compute: returns geometryId
   └─ VoxelSolver compute: NOW has access to Box mesh ✅
       Returns valid meshData

6. applyPhysicsSolverNodesToGeometry
7. applyChemistrySolverNodesToGeometry
8. applyVoxelSolverNodesToGeometry  ✅ NEW
   └─ VoxelSolver handler: reads valid meshData from step 5 ✅
       Creates voxel mesh geometry
```

## Result

- ✅ VoxelSolver now properly accesses Box geometry via `context.geometryById`
- ✅ VoxelSolver uses correct VoxelGrid type structure
- ✅ VoxelSolver handler runs after Box geometry is populated
- ✅ Voxel mesh now appears in Roslyn viewport
- ✅ Box geometry is hidden (only voxels visible)
- ✅ Resolution slider controls voxel density
- ✅ Voxels update in real-time when parameters change

## Testing

1. Open Lingua in browser
2. Add "Voxel Solver" rig from menu
3. Verify Roslyn canvas shows blocky voxel mesh (not smooth box)
4. Adjust resolution slider (4-64) - voxels should update
5. Adjust box dimensions - voxels should update to match
6. Check TextNote displays fill ratio (e.g., "0.5" = 50% solid)

## Files Changed

- `client/src/workflow/nodes/solver/VoxelSolver.ts` - Fixed imports, geometry access, and VoxelGrid structure
- `client/src/store/useProjectStore.ts` - Moved handler to new phase, added to recalculation flow
