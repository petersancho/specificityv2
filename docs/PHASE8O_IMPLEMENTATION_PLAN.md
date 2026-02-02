# Phase 8O Implementation Plan

## Part 1: Semantic Sweep (Complete Semantic Integration)

### Step 1: Mark UI Commands as Expected Orphans
Update `client/src/semantic/semanticRegistry.ts` to add `kind` field to operations.

### Step 2: Update Validator
Modify `scripts/validateSemanticIntegrity.ts` to ignore `uiCommand` and `internal` operations.

### Step 3: Verify Command→Node Mappings
Ensure validator recognizes that:
- `command.loft` maps to loft node
- `command.extrude` maps to extrude node
- `command.boolean` maps to meshBoolean node
- `command.meshToBrep` maps to meshToBrep node
- `command.offset` maps to offset node

## Part 2: UI Brandkit Implementation (Make Everything Crispy)

### Priority 1: Solver Dashboards (Most Hardcoded Colors)

**Files to update:**
1. `VoxelSimulatorDashboard.module.css` (65 hardcoded colors)
2. `PhysicsSimulatorDashboard.module.css` (60 hardcoded colors)
3. `TopologyOptimizationSimulatorDashboard.module.css` (42 hardcoded colors)
4. `ChemistrySimulatorDashboard.module.css` (40 hardcoded colors)
5. `EvolutionarySimulatorDashboard.module.css` (30 hardcoded colors)

**Strategy:**
- Replace all hardcoded colors with brandkit tokens
- Ensure all drop shadows are `0 4px 0 #000000`
- Ensure all borders are `2px solid #000000`
- Keep solver-specific color schemes (Voxel: Lime, Topology: Purple, etc.)

### Priority 2: Core UI Components

**Files to update:**
1. `ModelerSection.module.css` (50 hardcoded colors)
2. `WorkflowSection.module.css` (41 hardcoded colors)
3. `SubCategoryDropdown.module.css` (18 hardcoded colors)
4. `WebGLButton.module.css` (11 hardcoded colors)
5. `WebGLControl.module.css` (7 hardcoded colors)
6. `IconButton.module.css` (7 hardcoded colors)

**Strategy:**
- Replace all hardcoded colors with brandkit tokens
- Ensure consistent sticker aesthetic
- Use CMYK accent colors for interactive elements

### Priority 3: Documentation & Other Pages

**Files to update:**
1. `DocumentationNewUsersPage.module.css` (4 hardcoded colors)
2. `SavedScriptsDropdown.module.css` (3 hardcoded colors)
3. `ChemistryMaterialPopup.module.css` (20 hardcoded colors)

## Implementation Order

1. **Part 1: Semantic Sweep** (1-2 hours)
   - Update semantic registry with `kind` field
   - Update validator to ignore UI commands
   - Verify command→node mappings
   - Run validation and confirm orphan count reduced

2. **Part 2A: Solver Dashboards** (2-3 hours)
   - Update all 5 solver dashboards
   - Replace hardcoded colors with brandkit tokens
   - Ensure solid black drop shadows
   - Test each dashboard visually

3. **Part 2B: Core UI Components** (1-2 hours)
   - Update ModelerSection, WorkflowSection
   - Update SubCategoryDropdown
   - Update WebGLButton, WebGLControl, IconButton
   - Test components visually

4. **Part 2C: Documentation & Other** (30 minutes)
   - Update DocumentationNewUsersPage
   - Update SavedScriptsDropdown
   - Update ChemistryMaterialPopup

5. **Final Validation** (30 minutes)
   - Run semantic validation
   - Run visual regression tests
   - Commit and push all changes

## Expected Results

### Semantic Sweep
- Orphan operations: 48 → ~10 (only internal operations)
- Validation errors: 0 → 0 (maintained)
- Semantic coverage: 74 → ~80 nodes

### UI Brandkit
- Hardcoded colors: 398 → 0 (all replaced with tokens)
- Consistent CMYK color scheme throughout
- Solid black drop shadows everywhere
- Crispy, sticker aesthetic throughout

## Success Criteria

- ✅ Validation passes with 0 errors
- ✅ Orphan operations < 15
- ✅ No hardcoded hex colors outside brandkit.css
- ✅ All drop shadows are solid black
- ✅ Consistent CMYK color scheme
- ✅ Crispy, sticker aesthetic throughout
