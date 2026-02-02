# TypeScript Refactor Plan - Complete Error Resolution

## Current Status
- **Total Errors:** 436
- **Goal:** 0 errors, complete semantic ontological perfection
- **Approach:** Systematic refactoring in phases, no shortcuts

---

## Phase 1: Fix Simple Import and Type Issues (10 minutes)

### Tasks:
1. **Import MeshGeometry in useProjectStore.ts**
   - Lines 1701, 1747 reference MeshGeometry but it's not imported
   - Add: `import type { MeshGeometry } from '../types';`

2. **Fix remaining solverOps.ts sideEffects**
   - Lines 21, 36, 52, 82, 375 still have 'geometry' in sideEffects
   - Already partially fixed, verify all instances removed

3. **Fix test-rig chemistry-solver-example.ts**
   - Line 60: GoalSpecification[] not assignable to WorkflowValue
   - Cast to `as WorkflowValue` or adjust type definition

---

## Phase 2: Fix WorkflowNodeData Missing Labels (20 minutes)

### Affected Lines:
- 8231, 8243: Text nodes missing label
- 8277: Box geometry node missing label
- 8291, 8299, 8307: Slider nodes missing label
- 8316: Voxelize node missing label
- 8330: Slider node missing label
- 8339: Panel node missing label

### Strategy:
- Add `label: string` property to all WorkflowNodeData objects
- Use descriptive labels based on node type:
  - Text nodes: "Text"
  - Slider nodes: "Slider" or parameter name
  - Geometry nodes: Geometry type name
  - Panel nodes: "Panel"

---

## Phase 3: Fix GeometryType String Literals (30 minutes)

### Problem:
Multiple places use `geometryType: string` instead of the proper union type:
```typescript
type GeometryType = "polyline" | "surface" | "loft" | "extrude" | "mesh" | "nurbsCurve" | "nurbsSurface" | "vertex" | "brep";
```

### Affected Areas:
- Line 7657: physicsSolver node
- Line 8139: topologyOptimize node  
- Line 8964: chemistrySolver node
- Lines 11829, 11839, 11952: Various geometry nodes

### Strategy:
1. Find all `geometryType: string` assignments
2. Replace with specific literals or `as GeometryType` cast
3. Ensure runtime values are valid

---

## Phase 4: Fix Property Access on Union Types (30 minutes)

### Problem:
Accessing properties that don't exist on all union members without type narrowing.

### Affected Properties:
- `centroid` (line 1282)
- `inertiaTensor_kg_m2` (lines 1292, 1294, 1295)
- `plane` (lines 3374, 3393)
- `mesh` (line 5088)
- `volume_m3`, `mass_kg` (lines 5700, 5701, 5702)

### Strategy:
1. Use type guards: `if ('property' in geometry && geometry.property)`
2. Use optional chaining: `geometry.property?.`
3. Cast to specific type when context guarantees it: `(geometry as MeshGeometry).mesh`
4. Replace remaining 'as any' with proper types

---

## Phase 5: Fix WorkflowNode Array Type Mismatches (40 minutes)

### Problem:
State update functions return objects that don't match WorkflowNode type exactly.

### Affected Lines:
- 7657, 8139, 9206: State update return types
- 8964, 8995, 8996: Node array assignments
- 11829, 11839, 11952: Node array operations

### Root Causes:
1. **Status strings:** Using generic 'string' instead of '"running" | "idle" | "complete"'
2. **GeometryType strings:** Using generic 'string' instead of union
3. **Missing properties:** Some nodes missing required WorkflowNodeData properties
4. **Type inference:** TypeScript can't infer correct discriminated union member

### Strategy:
1. Add explicit type annotations to state update functions
2. Use type assertions for complex objects: `as WorkflowNode`
3. Ensure all required properties are present
4. Fix status and geometryType to use proper literals

---

## Phase 6: Fix Miscellaneous Type Issues (20 minutes)

### Tasks:
1. **Line 2220:** PrimitiveMeshConfig conversion
   - Issue: 'kind' property is string, not number
   - Fix: Adjust conversion or type definition

2. **Line 11604:** Parameter 'groupNodeId' implicitly any
   - Add explicit type annotation

3. **Any remaining errors** from previous fixes

---

## Phase 7: Validate and Test (20 minutes)

### Validation Steps:
1. Run `npm run build` - should complete with 0 errors
2. Run `npm run validate:semantic` - should pass
3. Run `npm run validate:commands` - should pass
4. Run `npm run validate:integrity` - should pass
5. Start dev server - should start without errors
6. Check browser console - should have no errors

---

## Execution Order

1. **Phase 1** - Quick wins, reduces error count significantly
2. **Phase 2** - Straightforward additions, reduces ~8 errors
3. **Phase 3** - Medium complexity, reduces ~50+ errors
4. **Phase 4** - Medium complexity, reduces ~20 errors
5. **Phase 5** - Most complex, reduces ~350+ errors
6. **Phase 6** - Cleanup remaining issues
7. **Phase 7** - Verification

**Total Estimated Time:** 2.5 hours

---

## Success Criteria

✅ TypeScript build completes with 0 errors  
✅ All semantic validations pass  
✅ Dev server starts successfully  
✅ No console errors in browser  
✅ Site is ready for Peter to test  

---

## Notes

- **No shortcuts:** Every error will be properly fixed
- **Type safety:** Prefer proper types over 'as any'
- **Maintainability:** Code should be clear and type-safe
- **Semantic perfection:** Types reflect the actual semantic structure

This is the path to perfection. Let's execute it.
