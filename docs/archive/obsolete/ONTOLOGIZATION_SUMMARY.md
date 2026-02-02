# LINGUA ONTOLOGIZATION SUMMARY

**Date:** 2026-01-31  
**Status:** In Progress  
**Goal:** Ontologize the entire codebase with semantic modeling and Numerica-based linkage rules

---

## 🎯 MISSION

**Ensure linkage of geometry and UI/Rendering is the most important ontological rule.**

All geometry must flow through a consistent, traceable path. All nodes must work in similar ways. Delete things we don't need. Slim down. Be bold.

---

## ✅ PHASE 1: DOCUMENTATION CLEANUP (COMPLETE)

### Actions Taken

**1. Created Master Ontology Document**
- **File:** `docs/ONTOLOGY_MASTER.md` (17 rules, 400+ lines)
- **Content:** Complete ontological specification with all rules
- **Key Rules:**
  - Rule 1: Geometry Access Pattern (`context.geometryById`)
  - Rule 2: Geometry Output Pattern (return `meshData` in outputs)
  - Rule 3: Geometry Handler Pattern (handlers in `useProjectStore.ts`)
  - Rule 4: Input Port ↔ Parameter Linking (`parameterKey`)
  - Rule 5: Port Type Consistency (CMYK semantic colors)
  - Rule 6: Standard Node Definition structure
  - Rule 7: Naming Conventions
  - Rule 8: UI Locked to Backend
  - Rule 9: CMYK Visual Conventions
  - Rule 10: Evaluation Order
  - Rule 11: Context Object
  - Rule 12: Solver Node Pattern
  - Rule 13: Goal Node Pattern
  - Rule 14: Node Documentation
  - Rule 15: Code Documentation
  - Rule 16: Semantic Consistency
  - Rule 17: Lingua Philosophy

**2. Consolidated Voxel Solver Documentation**
- **File:** `docs/VOXEL_SOLVER.md` (comprehensive specification)
- **Archived:** 6 redundant voxel solver fix docs → `docs/archive/voxel-solver-fixes/`
  - `voxel-solver-geometry-fix.md`
  - `voxel-solver-input-port-fix.md`
  - `voxel-solver-meshdata-fix.md`
  - `voxel-solver-rig-fix.md`
  - `voxel-solver-semantic-fix-summary.md`
  - `voxel-solver-rewrite.md`
- **Kept:** `voxel-solver-geometry-access-fix.md` (most recent and comprehensive)

**3. Consolidated CMYK Branding Documentation**
- **File:** `docs/CMYK_BRANDING.md` (complete branding specification)
- **Archived:** 4 redundant CMYK docs → `docs/archive/cmyk-branding/`
  - `cmyk-branding-update.md`
  - `cmyk-color-mapping-reference.md`
  - `cmyk-migration-summary.md`
  - `topbar-shrink-summary.md`
- **Kept:** `cmyk-branding-complete-summary.md` and `cmyk-color-conventions.md`

### Documentation Structure (After Cleanup)

```
docs/
├── ONTOLOGY_MASTER.md          ✅ NEW - Master ontological specification
├── VOXEL_SOLVER.md              ✅ NEW - Consolidated voxel solver spec
├── CMYK_BRANDING.md             ✅ NEW - Consolidated branding spec
├── voxel-solver-geometry-access-fix.md  ✅ KEPT - Most recent fix
├── cmyk-branding-complete-summary.md    ✅ KEPT - Complete summary
├── cmyk-color-conventions.md            ✅ KEPT - Color conventions
├── archive/
│   ├── voxel-solver-fixes/      ✅ NEW - Archived 6 redundant docs
│   └── cmyk-branding/           ✅ NEW - Archived 4 redundant docs
└── [other docs remain unchanged]
```

### Files Deleted
- None (all archived for reference)

### Files Created
- `docs/ONTOLOGY_MASTER.md` (400+ lines)
- `docs/VOXEL_SOLVER.md` (300+ lines)
- `docs/CMYK_BRANDING.md` (400+ lines)

### Total Documentation Reduction
- **Before:** 68 files, many redundant
- **After:** 65 active files, 10 archived
- **Net:** Cleaner, more organized, single source of truth for each topic

---

## 🔍 PHASE 2: CODEBASE ANALYSIS (COMPLETE)

### Workflow Nodes Structure

**Total Nodes:** ~163
- **Solver Nodes:** 4 (PhysicsSolver, ChemistrySolver, BiologicalSolver, VoxelSolver)
- **Goal Nodes:** 10 (4 physics, 6 chemistry)
- **Other Nodes:** 149 (defined inline in nodeRegistry.ts)

**Node Categories:** 24
- analysis (20), tessellation (16), euclidean (18), math (11), data (7), mesh (9), primitives (6), lists (8), basics (7), transforms (5), arrays (4), ranges (5), signals (5), curves (3), nurbs (3), brep (6), modifiers (4), interop (2), measurement (2), voxel (4), solver (1), goal (imported), optimization (imported), logic (3)

### Key Findings

**✅ Correct Patterns:**
- All solver nodes use `context.geometryById.get(geometryId)` ✅
- All nodes have consistent port structure (inputs, outputs, parameters) ✅
- Helper functions exist: `resolveGeometryInput()`, `resolveGeometryList()` ✅
- CMYK color system established and documented ✅
- VoxelSolver has complete implementation (including `generateVoxelMesh()`) ✅

**❌ Issues Identified:**
1. **ChemistrySolver:** Incomplete material/seed extraction (TODO comments lines 656-667)
2. **MaterialGoal:** Misclassified as goal (doesn't produce GoalSpecification)
3. **Goal Type Mismatch:** ChemistrySolver uses `goal.type` instead of `goal.goalType` (line 408)
4. **Massive nodeRegistry.ts:** 12,477 lines in single file
5. **Missing Type:** `"chemMaterial"` not in GoalType union

---

## 🚧 PHASE 3: CRITICAL FIXES (IN PROGRESS)

### Priority 1: Fix ChemistrySolver Material/Seed Extraction

**Status:** TODO

**Location:** `client/src/workflow/nodes/solver/ChemistrySolver.ts` lines 656-667

**Current Code:**
```typescript
// Process materials
const materialNames: string[] = [];
const materialSpecs: ChemistryMaterialSpec[] = [];
// TODO: Extract from inputs.materials

// Process seeds
const seeds: ChemistrySeed[] = [];
// TODO: Extract from inputs.seeds

// Process assignments
const assignments: ChemistryMaterialAssignment[] = [];
// TODO: Extract from inputs.materials or materialsText
```

**Required Fix:**
- Implement material extraction from `inputs.materials`
- Implement seed extraction from `inputs.seeds`
- Implement assignment extraction from `inputs.materials` or `materialsText`
- Reference MaterialGoal node's `normalizeAssignmentEntries()` function for pattern

### Priority 2: Fix Goal Type Field Reference

**Status:** TODO

**Location:** `client/src/workflow/nodes/solver/ChemistrySolver.ts` line 408

**Current Code:**
```typescript
const simGoals = args.goals.map((goal) => ({
  type: goal.type as "stiffness" | "mass" | "transparency" | "thermal" | "blend",
  // ...
}));
```

**Required Fix:**
```typescript
const simGoals = args.goals.map((goal) => ({
  type: goal.goalType as "stiffness" | "mass" | "transparency" | "thermal" | "blend",
  // ...
}));
```

### Priority 3: Clarify MaterialGoal Role

**Status:** TODO

**Location:** `client/src/workflow/nodes/solver/goals/chemistry/MaterialGoal.ts`

**Current Behavior:**
- Labeled as "goal" but doesn't produce `GoalSpecification` output
- Produces `materialsText`, `distribution`, `dashboardText`, `status` outputs
- Acts as monitoring/dashboard node rather than goal specification node

**Options:**
1. **Rename to MaterialDashboard** and recategorize as "utility"
2. **Implement proper goal specification output** for material constraints

**Recommendation:** Option 1 (rename to MaterialDashboard)

### Priority 4: Add Missing Goal Type

**Status:** TODO

**Location:** `client/src/workflow/nodes/solver/types.ts` line 12

**Current Code:**
```typescript
export type GoalType =
  | "stiffness"
  | "volume"
  | "load"
  | "anchor"
  | "chemStiffness"
  | "chemMass"
  | "chemBlend"
  | "chemTransparency"
  | "chemThermal";
  // Missing: "chemMaterial"
```

**Required Fix:**
```typescript
export type GoalType =
  | "stiffness"
  | "volume"
  | "load"
  | "anchor"
  | "chemStiffness"
  | "chemMass"
  | "chemBlend"
  | "chemTransparency"
  | "chemThermal"
  | "chemMaterial";  // ✅ Add this
```

---

## 🚧 PHASE 4: REFACTOR nodeRegistry.ts (PLANNED)

### Current State
- **File:** `client/src/workflow/nodeRegistry.ts`
- **Size:** 12,477 lines
- **Structure:** Single monolithic file with all node definitions

### Proposed Structure

```
client/src/workflow/
├── nodeRegistry.ts              (exports and maps, ~500 lines)
├── nodeHelpers.ts               (utility functions, ~500 lines)
├── nodeParameters.ts            (parameter specs, ~200 lines)
└── nodeDefinitions/
    ├── index.ts                 (exports all definitions)
    ├── primitives.ts            (~800 lines)
    ├── curves.ts                (~400 lines)
    ├── mesh.ts                  (~800 lines)
    ├── tessellation.ts          (~1200 lines)
    ├── transforms.ts            (~400 lines)
    ├── math.ts                  (~600 lines)
    ├── logic.ts                 (~300 lines)
    ├── data.ts                  (~400 lines)
    ├── lists.ts                 (~400 lines)
    ├── analysis.ts              (~1200 lines)
    ├── euclidean.ts             (~800 lines)
    ├── nurbs.ts                 (~400 lines)
    ├── brep.ts                  (~600 lines)
    ├── voxel.ts                 (~400 lines)
    ├── modifiers.ts             (~400 lines)
    ├── interop.ts               (~200 lines)
    ├── basics.ts                (~400 lines)
    ├── arrays.ts                (~300 lines)
    ├── ranges.ts                (~400 lines)
    └── signals.ts               (~400 lines)
```

### Benefits
- **Maintainability:** Easier to find and edit nodes
- **Performance:** Faster IDE loading and navigation
- **Organization:** Clear separation by category
- **Collaboration:** Reduced merge conflicts
- **Testing:** Easier to test individual categories

### Migration Plan
1. Create `nodeDefinitions/` directory
2. Extract helper functions to `nodeHelpers.ts`
3. Extract parameter specs to `nodeParameters.ts`
4. Split node definitions by category into separate files
5. Update imports in `nodeRegistry.ts`
6. Test all nodes still work
7. Delete old monolithic sections

---

## 🚧 PHASE 5: STANDARDIZE ALL NODES (PLANNED)

### Audit Checklist

For each node, verify:
- [ ] Uses `context.geometryById` for geometry access (Rule 1)
- [ ] Returns geometry in outputs (Rule 2)
- [ ] Has geometry handler if generates geometry (Rule 3)
- [ ] Input ports have `parameterKey` where needed (Rule 4)
- [ ] Port types use CMYK semantic colors (Rule 5)
- [ ] Follows standard node structure (Rule 6)
- [ ] Naming follows conventions (Rule 7)
- [ ] Documentation is clear and accurate (Rule 14)

### Nodes to Audit
- All 149 inline node definitions in nodeRegistry.ts
- All 4 solver nodes
- All 10 goal nodes

### Expected Issues
- Missing `parameterKey` on some input ports
- Inconsistent geometry access patterns
- Missing geometry handlers
- Outdated descriptions

---

## 🚧 PHASE 6: UPDATE GEOMETRY HANDLERS (PLANNED)

### Current Handlers

**Location:** `client/src/store/useProjectStore.ts`

**Existing Handlers:**
- Box, Sphere, Cylinder, Torus, Cone, Plane (primitives)
- VoxelSolver (voxels)
- ChemistrySolver (chemistry mesh)
- PhysicsSolver (physics mesh)
- BiologicalSolver (biological mesh)

### Audit Plan
1. List all geometry-generating nodes
2. Verify each has a handler
3. Ensure consistent handler pattern
4. Add missing handlers
5. Test all handlers work correctly

---

## 🚧 PHASE 7: CREATE COMPREHENSIVE DOCUMENTATION (PLANNED)

### Documents to Create

**1. Node Development Guide**
- How to create a new node
- Standard patterns and examples
- Common pitfalls and solutions
- Testing checklist

**2. Geometry Linkage Specification**
- Detailed explanation of geometry flow
- Context object structure
- Geometry registry architecture
- Handler implementation guide

**3. Testing Guide**
- How to test nodes
- Test rig patterns
- Integration testing
- Visual testing in Roslyn

**4. Migration Guide**
- How to update old nodes to new patterns
- Breaking changes and fixes
- Deprecation notices

---

## 📊 PROGRESS SUMMARY

### Completed
- ✅ Phase 1: Documentation Cleanup (100%)
- ✅ Phase 2: Codebase Analysis (100%)

### In Progress
- 🚧 Phase 3: Critical Fixes (0%)

### Planned
- ⏳ Phase 4: Refactor nodeRegistry.ts (0%)
- ⏳ Phase 5: Standardize All Nodes (0%)
- ⏳ Phase 6: Update Geometry Handlers (0%)
- ⏳ Phase 7: Create Comprehensive Documentation (0%)

---

## 🎯 NEXT STEPS

### Immediate (Phase 3)
1. Fix ChemistrySolver material/seed extraction
2. Fix goal type field reference (goal.type → goal.goalType)
3. Clarify MaterialGoal role (rename to MaterialDashboard)
4. Add missing "chemMaterial" to GoalType union

### Short-term (Phase 4)
1. Create nodeDefinitions/ directory structure
2. Extract helper functions to nodeHelpers.ts
3. Split nodeRegistry.ts by category
4. Test all nodes still work

### Long-term (Phases 5-7)
1. Audit all nodes against ontology rules
2. Standardize geometry access patterns
3. Update geometry handlers
4. Create comprehensive documentation

---

## 📚 REFERENCES

- **Master Ontology:** `docs/ONTOLOGY_MASTER.md`
- **Voxel Solver Spec:** `docs/VOXEL_SOLVER.md`
- **CMYK Branding Spec:** `docs/CMYK_BRANDING.md`
- **Node Registry:** `client/src/workflow/nodeRegistry.ts`
- **Solver Nodes:** `client/src/workflow/nodes/solver/`
- **Geometry Handlers:** `client/src/store/useProjectStore.ts`

---

**This ontologization effort will ensure Lingua has a consistent, maintainable, and semantically aligned codebase that follows clear ontological principles.**
