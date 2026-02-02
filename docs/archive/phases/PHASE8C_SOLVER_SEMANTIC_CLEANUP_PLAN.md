# Phase 8C: Solver Semantic Cleanup & Architecture Establishment

## Mission

**Clean up solver semantics to ensure each solver has its own unique semantic identity, establish simulator semantic layer, and make Lingua "feel itself" through semantic self-reference.**

---

## Core Principles

**Love, Philosophy, Intent**

- **Love**: The universe (words, numbers, math, code, geometry) all love each other, they attract heavily
- **Philosophy**: Allows scientific languages to speak and exist in the human realm through Lingua
- **Intent**: Work with semantic and ontological intent to make Lingua reason with itself

**Code is the philosophy. Language is code. Math is numbers. It's all one seamless, powerful engine that speaks to itself mechanically.**

---

## Current State Analysis

### Solvers Identified

1. **Physics Solver** (Ἐπιλύτης Φυσικῆς - Pythagoras)
   - Type: Equilibrium solver
   - Has simulator: Yes (structural equilibrium)
   - Semantic op: `solver.physics`
   - Status: ✅ Implemented, has semanticOps

2. **Chemistry Solver** (Ἐπιλύτης Χημείας - Apollonius)
   - Type: Distribution solver
   - Has simulator: Yes (particle-based material distribution)
   - Semantic op: `solver.chemistry`
   - Status: ✅ Implemented, has semanticOps

3. **Biological Solver** (Γαληνός - Galen)
   - Type: Morphogenesis solver
   - Has simulator: Yes (reaction-diffusion)
   - Semantic op: `solver.biological`
   - Status: ✅ Implemented, has semanticOps

4. **Voxel Solver** (Ἐπιλύτης Φογκελ - Archimedes)
   - Type: Discrete conversion
   - Has simulator: No (direct voxelization)
   - Semantic op: `solver.voxel`
   - Status: ✅ Implemented, has semanticOps

5. **Evolutionary Solver** (Future)
   - Type: Optimization solver
   - Has simulator: Yes (genetic algorithm)
   - Semantic op: `solver.evolutionary`
   - Status: ⏳ Planned

6. **Topology Optimization Solver** (Future)
   - Type: Structural optimization
   - Has simulator: No (SIMP optimization)
   - Semantic op: `solver.topologyOptimization`
   - Status: ⏳ Planned

### Issues Identified

1. **Documentation Sprawl**: 20+ solver documentation files with potential mix-ups and inconsistencies
2. **Simulator Semantic Layer**: Not fully established in code
3. **Goal Nodes**: Need semantic validation (should NOT have semanticOps)
4. **Naming Inconsistencies**: Greek names, English names, romanization may be inconsistent
5. **macOS Metadata Files**: 10+ `._*` files need to be removed
6. **Semantic Chain**: Not fully documented from UI → Command → Node → Solver → Simulator → Kernel

---

## Plan

### Step 1: Clean Up Files (1 hour)

**Remove macOS metadata files:**
- `client/src/workflow/nodes/solver/goals/physics/._*.ts`
- `client/src/workflow/nodes/solver/goals/chemistry/._*.ts`
- Any other `._*` files in solver directories

**Consolidate documentation:**
- Merge 20+ solver docs into canonical docs (one per solver)
- Remove outdated/duplicate info
- Archive historical docs

### Step 2: Establish Simulator Semantic Layer (2 hours)

**Create simulator-specific semantic operations:**

For each solver with simulator:
- Physics: `simulator.physics.*`
- Chemistry: `simulator.chemistry.*`
- Biological: `simulator.biological.*`
- Evolutionary: `simulator.evolutionary.*` (future)

**Operations to add:**
- `simulator.{solver}.initialize` - Initialize simulation state
- `simulator.{solver}.step` - Execute single simulation step
- `simulator.{solver}.converge` - Check convergence criteria
- `simulator.{solver}.finalize` - Finalize simulation result

**Update solverOps.ts** with simulator operations

### Step 3: Validate Goal Nodes (1 hour)

**Ensure all goal nodes do NOT have semanticOps:**
- Physics goals: AnchorGoal, LoadGoal, StiffnessGoal, VolumeGoal
- Chemistry goals: BlendGoal, MassGoal, MaterialGoal, StiffnessGoal, ThermalGoal, TransparencyGoal

**Add validation rule** to ensure goals never have semanticOps

### Step 4: Consolidate Documentation (2 hours)

**Create canonical solver documentation:**
- `docs/solvers/PHYSICS_SOLVER.md`
- `docs/solvers/CHEMISTRY_SOLVER.md`
- `docs/solvers/BIOLOGICAL_SOLVER.md`
- `docs/solvers/VOXEL_SOLVER.md`

**Each doc should include:**
- Ontological type
- Greek name, English name, romanization
- Has simulator: Yes/No
- Semantic operations (solver + simulator)
- Goal nodes (if applicable)
- Mathematical foundation
- Implementation details
- Test rig examples

**Archive old docs:**
- Move to `docs/archive/solvers/`

### Step 5: Update Semantic Chain Documentation (1 hour)

**Document complete semantic chain:**

```
User Interaction (UI)
       ↓
   Command (Roslyn)
       ↓
   Node (Workflow)
       ↓
   Solver Operation (semantic)
       ↓
   Simulator Operations (semantic, if applicable)
       ↓
   Kernel Computation (backend)
       ↓
   Rendered Result (pixels)
```

**Create `docs/SEMANTIC_CHAIN.md`** with complete documentation

### Step 6: Validate & Test (1 hour)

**Run all validation scripts:**
- `npm run validate:all`
- `npm run analyze:coverage`

**Test solver functionality:**
- Run test rigs for each solver
- Verify semantic correctness
- Ensure no mix-ups between solvers

### Step 7: Generate Comprehensive Documentation (1 hour)

**Update generated documentation:**
- `npm run generate:docs`
- Verify all solver nodes documented
- Verify all goal nodes documented
- Verify semantic operations documented

---

## Implementation Checklist

### Phase 8C-1: File Cleanup ✅

- [ ] Remove all `._*` macOS metadata files
- [ ] Archive old solver documentation
- [ ] Create `docs/solvers/` directory

### Phase 8C-2: Simulator Semantic Layer

- [ ] Add simulator-specific operations to `solverOps.ts`
- [ ] Update `semanticOpIds.ts`
- [ ] Document simulator operations in `SOLVER_SEMANTIC_ARCHITECTURE.md`

### Phase 8C-3: Goal Node Validation

- [ ] Verify all goal nodes do NOT have `semanticOps`
- [ ] Add validation rule for goal nodes
- [ ] Update validation scripts

### Phase 8C-4: Documentation Consolidation

- [ ] Create `docs/solvers/PHYSICS_SOLVER.md`
- [ ] Create `docs/solvers/CHEMISTRY_SOLVER.md`
- [ ] Create `docs/solvers/BIOLOGICAL_SOLVER.md`
- [ ] Create `docs/solvers/VOXEL_SOLVER.md`
- [ ] Archive old docs to `docs/archive/solvers/`

### Phase 8C-5: Semantic Chain Documentation

- [ ] Create `docs/SEMANTIC_CHAIN.md`
- [ ] Document complete UI → Kernel chain
- [ ] Add examples for each solver

### Phase 8C-6: Validation & Testing

- [ ] Run `npm run validate:all`
- [ ] Run `npm run analyze:coverage`
- [ ] Test all solver test rigs
- [ ] Verify semantic correctness

### Phase 8C-7: Generate Documentation

- [ ] Run `npm run generate:docs`
- [ ] Verify all documentation generated
- [ ] Update README.md with solver info

---

## Success Criteria

**Phase 8C is complete when:**

1. ✅ All macOS metadata files removed
2. ✅ Simulator semantic layer established
3. ✅ All goal nodes validated (no semanticOps)
4. ✅ Documentation consolidated (one canonical doc per solver)
5. ✅ Semantic chain fully documented
6. ✅ All validation passing (0 errors, 0 warnings)
7. ✅ All solver test rigs passing
8. ✅ Lingua can "feel itself" through semantic self-reference

---

## Philosophy

**Lingua is coming to life through its code.**

The solver semantic cleanup embodies this philosophy:

- **Language** - Solver names, goal descriptions, semantic operation IDs
- **Code** - Solver implementations, simulation loops, convergence checks
- **Math** - Physics equations, chemistry dynamics, biological patterns
- **Mechanical** - The system validates itself automatically through semantic linkage

**Lingua can maintain and understand itself through its code:**

- **Rules** are encoded in validation scripts
- **Abilities** are encoded in semantic operations
- **Relationships** are encoded in solver taxonomy
- **Correctness** is enforced by CI pipeline

**The semantic system is the portal from UI to backend computation.**

---

## Estimated Time

**Total: 9 hours**

- Step 1: File Cleanup - 1 hour
- Step 2: Simulator Semantic Layer - 2 hours
- Step 3: Goal Node Validation - 1 hour
- Step 4: Documentation Consolidation - 2 hours
- Step 5: Semantic Chain Documentation - 1 hour
- Step 6: Validation & Testing - 1 hour
- Step 7: Generate Documentation - 1 hour

---

**Status:** Plan complete, ready for implementation  
**Next:** Begin Step 1 - File Cleanup
