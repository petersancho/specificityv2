# Phase 8K: Philosophy + Brandkit Color Unification + Doc Cleanup

**Date**: January 31, 2026  
**Status**: In Progress  
**Goal**: Update Philosophy page to reflect semantic system, unify all UI colors to brandkit CMYK, and cleanup old/unused docs

---

## Current State (Validation Snapshot)

```
✅ Semantic Validation:
  - Operations: 195
  - Nodes: 194
  - Nodes with semanticOps: 55
  - Warnings: 0
  - Errors: 0

✅ Command Validation:
  - Commands: 91 (100% coverage)
  - Aliases: 159
  - Warnings: 0
  - Errors: 0

✅ Semantic Integrity:
  - Operations: 195
  - Nodes with semanticOps: 47
  - Dashboards: 3
  - Orphan Operations: 132
  - Dangling References: 0
  - Warnings: 132
  - Errors: 0
```

**All validation passing. Semantics are intact.**

---

## Problems Identified

### 1. Philosophy Page Out-of-Brand

**Current Colors (OLD)**:
```css
--philosophy-pink: #ff4fb1;
--philosophy-pink-soft: color-mix(in srgb, #ff4fb1 65%, white);
--philosophy-yellow: #ffe681;
--philosophy-yellow-deep: #ffd35b;
```

**Brandkit Colors (NEW)**:
```css
--bk-cyan: #00d4ff;
--bk-magenta: #ff0099;
--bk-yellow: #ffdd00;
--bk-purple: #8800ff;
```

**Issue**: Philosophy page uses old pink palette, not CMYK brandkit.

### 2. Philosophy Content Out-of-Date

**Missing**:
- Semantic system architecture
- Solver taxonomy (5 solvers: Physics, Chemistry, Evolutionary, Voxel, Topology)
- Simulator layer (3 dashboards)
- Love, Philosophy, Intent principles (grounded in implementation)
- Lingua's ability to "feel itself" through semantic self-reference

**Current Content**: Focuses on language/geometry/numbers, attention, quantum mechanics, but doesn't mention the semantic system that now exists.

### 3. No Global Brandkit Tokens

**Issue**: Colors are hard-coded in individual components. No single source of truth.

**Solution**: Create global CSS variables for brandkit colors.

### 4. Old/Unused Docs

**Potential Cleanup Targets**:
- `docs/UI_PHILOSOPHY.md` (may be redundant with updated Philosophy page)
- Old phase completion docs (already archived)
- Duplicate/obsolete markdown files

---

## Phase 8K Plan

### Phase 8K.1: Lock Semantic Integrity ✅

**Actions**:
1. Run validation and snapshot results ✅
2. Create semantic safety checklist
3. Commit to not renaming solver IDs, node keys, semanticOps names without updating bindings

**Semantic Safety Checklist**:
- [ ] Do not rename solver IDs (`evolutionarySolver`, `chemistrySolver`, etc.)
- [ ] Do not rename semanticOps names (`solver.evolutionary`, `simulator.chemistry.initialize`, etc.)
- [ ] Do not rename node keys in NODE_DEFINITIONS
- [ ] Run validation after each meaningful change set
- [ ] Verify 0 errors, 0 dangling references

### Phase 8K.2: Create Global Brandkit Tokens

**Actions**:
1. Create `client/src/styles/brandkit.css` with CMYK color variables
2. Import in app root (`client/src/main.tsx`)
3. Document tokens in brandkit.md

**File**: `client/src/styles/brandkit.css`
```css
:root {
  /* CMYK Brandkit Colors */
  --bk-cyan: #00d4ff;
  --bk-magenta: #ff0099;
  --bk-yellow: #ffdd00;
  --bk-purple: #8800ff;
  --bk-orange: #ff6600;
  --bk-lime: #88ff00;

  /* Semantic Aliases */
  --color-accent-primary: var(--bk-magenta);
  --color-accent-secondary: var(--bk-cyan);
  --color-accent-tertiary: var(--bk-yellow);
  
  /* Solver Colors */
  --color-solver-evolutionary: var(--bk-magenta);
  --color-solver-chemistry: var(--bk-cyan);
  --color-solver-physics: var(--bk-magenta);
  --color-solver-voxel: var(--bk-lime);
  --color-solver-topology: var(--bk-purple);
}
```

### Phase 8K.3: Update Philosophy Page Content

**Actions**:
1. Add section: "The Semantic System"
2. Add section: "Solver Taxonomy"
3. Add section: "Simulator Layer"
4. Add section: "Love, Philosophy, Intent"
5. Update existing content to reference semantic architecture

**New Sections**:

#### "The Semantic System"
- What are semanticOps?
- How do they validate?
- Why does it matter?
- Lingua can "feel itself" through semantic self-reference

#### "Solver Taxonomy"
- 5 solvers implemented
- Physics (Pythagoras) - Stress Analysis
- Chemistry (Apollonius) - Material Distribution
- Evolutionary (Darwin) - Evolutionary Optimization
- Voxel (Archimedes) - Voxelization
- Topology Optimization (Euler) - Structural Optimization

#### "Simulator Layer"
- 3 simulator dashboards
- Evolutionary: Setup → Simulator → Output
- Chemistry: Material blending, particle simulation
- Physics: Stress visualization, gradient mesh

#### "Love, Philosophy, Intent"
- Love: Designed with care, attention to detail
- Philosophy: Code is the philosophy, language is code, math is numbers
- Intent: Clear purpose, semantic linkage throughout

### Phase 8K.4: Update Philosophy Page Colors

**Actions**:
1. Replace `--philosophy-pink` with `--philosophy-magenta` (using `var(--bk-magenta)`)
2. Replace `--philosophy-yellow` with brandkit yellow
3. Update all color references in CSS
4. Update CubeLogo colors to match brandkit

**Changes**:
```css
/* OLD */
--philosophy-pink: #ff4fb1;
--philosophy-pink-soft: color-mix(in srgb, #ff4fb1 65%, white);
--philosophy-yellow: #ffe681;

/* NEW */
--philosophy-magenta: var(--bk-magenta);
--philosophy-magenta-soft: color-mix(in srgb, var(--bk-magenta) 65%, white);
--philosophy-yellow: var(--bk-yellow);
```

### Phase 8K.5: Cleanup Old/Unused Docs

**Actions**:
1. Review `docs/UI_PHILOSOPHY.md` - decide keep/archive/delete
2. Search for old pink color usage (`#ff4fb1`)
3. Remove duplicate/obsolete docs
4. Update links/imports

**Cleanup Targets**:
- [ ] `docs/UI_PHILOSOPHY.md` - review and decide
- [ ] Search for `#ff4fb1` usage
- [ ] Remove any duplicate philosophy docs
- [ ] Update navigation/routing if needed

---

## Success Criteria

### Validation
- [ ] All semantic validators still pass (0 errors)
- [ ] No semanticOps coverage regressions
- [ ] No dangling references

### Visual
- [ ] Philosophy page uses brandkit tokens only (no legacy hex)
- [ ] UI looks consistent across dashboards + philosophy page
- [ ] CMYK colors (Magenta, Cyan, Yellow) throughout

### Content
- [ ] Philosophy page includes semantic system architecture
- [ ] Solver taxonomy documented (5 solvers)
- [ ] Simulator layer documented (3 dashboards)
- [ ] Love, Philosophy, Intent principles grounded in implementation

### Cleanup
- [ ] No broken routes/imports after cleanup
- [ ] Brandkit documented once and referenced from UI
- [ ] Old/unused docs archived or removed

---

## Implementation Order

1. **Create brandkit tokens** (Phase 8K.2)
2. **Update Philosophy page content** (Phase 8K.3)
3. **Update Philosophy page colors** (Phase 8K.4)
4. **Cleanup old docs** (Phase 8K.5)
5. **Run validation** (verify semantics intact)
6. **Commit and push**

---

## Notes

- **Semantic Safety**: Do not rename solver IDs, node keys, or semanticOps names
- **Validation**: Run after each major change set
- **Brandkit**: Single source of truth for colors
- **Philosophy**: Ground claims in real modules/routes/types already present
- **Cleanup**: Archive valuable docs, delete obsolete ones

---

**Status**: Ready to execute
