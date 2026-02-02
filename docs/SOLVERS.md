# Lingua Solvers

## Overview

Lingua's solver system provides computational engines for optimization, simulation, and pattern generation. Each solver has its own unique semantic identity, linking UI elements to backend computation through a machine-checkable semantic language.

---

## Solver Taxonomy

### Solvers with Simulators

These solvers run iterative simulations with temporal dynamics, convergence checking, and state evolution.

| Solver | Greek Name | Ontological Type | Simulator | Status |
|--------|------------|------------------|-----------|--------|
| **Physics** | Ἐπιλύτης Φυσικῆς (Pythagoras) | Equilibrium | ✅ Yes | ✅ Implemented |
| **Chemistry** | Ἐπιλύτης Χημείας (Apollonius) | Distribution | ✅ Yes | ✅ Implemented |
| **Biological** | Γαληνός (Galen) | Morphogenesis | ✅ Yes | ✅ Implemented |
| **Evolutionary** | (Future) | Optimization | ✅ Yes | ⏳ Planned |

### Solvers without Simulators

These solvers perform direct computation or optimization without temporal simulation.

| Solver | Greek Name | Ontological Type | Simulator | Status |
|--------|------------|------------------|-----------|--------|
| **Voxel** | Ἐπιλύτης Φογκελ (Archimedes) | Discrete Conversion | ❌ No | ✅ Implemented |
| **Topology Optimization** | (Future) | Structural Optimization | ❌ No | ⏳ Planned |

---

## Semantic Architecture

### Semantic Chain

Every solver operation flows through a complete semantic chain:

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

### Semantic Operations

#### Layer 1: Solver Operations

| Operation ID | Solver | Simulator | Deterministic | Pure |
|--------------|--------|-----------|---------------|------|
| `solver.physics` | Physics | Yes | Yes | No |
| `solver.chemistry` | Chemistry | Yes | No (seeded) | No |
| `solver.biological` | Biological | Yes | No (seeded) | No |
| `solver.voxel` | Voxel | No | Yes | Yes |
| `solver.evolutionary` | Evolutionary | Yes | No (seeded) | No |
| `solver.topologyOptimization` | Topology | No | Yes | No |

#### Layer 2: Simulator Operations

| Operation ID | Purpose | Used By |
|--------------|---------|---------|
| `simulator.initialize` | Initialize simulation state | All simulators |
| `simulator.step` | Execute single simulation step | All simulators |
| `simulator.converge` | Check convergence criteria | All simulators |
| `simulator.finalize` | Finalize simulation result | All simulators |

---

## Solver Details

### 1. Physics Solver

**Greek Name:** Ἐπιλύτης Φυσικῆς (Epilýtēs Physikês)  
**English Name:** Physics Solver  
**Named After:** Pythagoras (mathematician, philosopher)  
**Ontological Type:** Equilibrium Solver

**Purpose:** Computes physical equilibrium states for structural systems.

**Has Simulator:** ✅ Yes (structural equilibrium simulation)

**Semantic Operations:**
- `solver.physics` - Primary solver operation

**Goal Nodes:**
- AnchorGoal - Fix vertices in space
- LoadGoal - Apply forces to vertices
- StiffnessGoal - Control material stiffness
- VolumeGoal - Maintain volume constraints

**Mathematical Foundation:** Finite Element Method (FEM), force equilibrium

**Documentation:** [docs/solvers/PHYSICS_SOLVER.md](./solvers/PHYSICS_SOLVER.md)

---

### 2. Chemistry Solver

**Greek Name:** Ἐπιλύτης Χημείας (Epilýtēs Chēmeías)  
**English Name:** Chemistry Solver  
**Named After:** Apollonius (mathematician, astronomer)  
**Ontological Type:** Distribution Solver

**Purpose:** Optimizes material distribution within a domain using particle-based simulation.

**Has Simulator:** ✅ Yes (particle-based material distribution simulation)

**Semantic Operations:**
- `solver.chemistry` - Primary solver operation

**Goal Nodes:**
- BlendGoal - Control material blending
- MassGoal - Target mass distribution
- MaterialGoal - Assign materials to regions
- StiffnessGoal - Target stiffness distribution
- ThermalGoal - Target thermal properties
- TransparencyGoal - Target optical properties

**Mathematical Foundation:** Smoothed Particle Hydrodynamics (SPH), energy minimization

**Documentation:** [docs/solvers/CHEMISTRY_SOLVER.md](./solvers/CHEMISTRY_SOLVER.md)

---

### 3. Biological Solver

**Greek Name:** Γαληνός (Galēnós)  
**English Name:** Biological Solver  
**Named After:** Galen (physician, philosopher)  
**Ontological Type:** Morphogenesis Solver

**Purpose:** Generates organic, biological patterns through reaction-diffusion dynamics.

**Has Simulator:** ✅ Yes (reaction-diffusion simulation)

**Semantic Operations:**
- `solver.biological` - Primary solver operation

**Goal Nodes:** None (uses parameters directly)

**Mathematical Foundation:** Gray-Scott reaction-diffusion model

**Documentation:** [docs/solvers/BIOLOGICAL_SOLVER.md](./solvers/BIOLOGICAL_SOLVER.md)

---

### 4. Voxel Solver

**Greek Name:** Ἐπιλύτης Φογκελ (Epilýtēs Fogkel)  
**English Name:** Voxelizer  
**Named After:** Archimedes (mathematician, engineer)  
**Ontological Type:** Discrete Conversion

**Purpose:** Converts geometry into a voxel grid at a specified resolution.

**Has Simulator:** ❌ No (direct voxelization)

**Semantic Operations:**
- `solver.voxel` - Primary solver operation

**Goal Nodes:** None (direct conversion)

**Mathematical Foundation:** Rasterization, flood fill

**Documentation:** [docs/solvers/VOXEL_SOLVER.md](./solvers/VOXEL_SOLVER.md)

---

### 5. Evolutionary Solver (Future)

**Ontological Type:** Optimization Solver

**Purpose:** Optimizes geometry and parameters using genetic algorithms.

**Has Simulator:** ✅ Yes (genetic algorithm simulation)

**Semantic Operations:**
- `solver.evolutionary` - Primary solver operation

**Goal Nodes:** (To be defined)

**Mathematical Foundation:** Genetic algorithms, fitness functions, selection operators

**Documentation:** [docs/PHASE7_CLEANUP_AND_PHASE8_EVOLUTIONARY_SOLVER_PLAN.md](./PHASE7_CLEANUP_AND_PHASE8_EVOLUTIONARY_SOLVER_PLAN.md)

---

### 6. Topology Optimization Solver (Future)

**Ontological Type:** Structural Optimization

**Purpose:** Optimizes material layout for structural performance.

**Has Simulator:** ❌ No (SIMP optimization)

**Semantic Operations:**
- `solver.topologyOptimization` - Primary solver operation

**Goal Nodes:** (To be defined)

**Mathematical Foundation:** SIMP (Solid Isotropic Material with Penalization)

**Documentation:** (To be created)

---

## Goal Nodes

### Ontological Rule

**Goal nodes are declarative and must NOT have `semanticOps` arrays.**

Goal nodes specify intent (what the solver should optimize for) rather than computation (how to perform the optimization). They are semantic descriptors, not computational operations.

### Physics Goals

- **AnchorGoal** - Fix vertices in space (boundary conditions)
- **LoadGoal** - Apply forces to vertices (external loads)
- **StiffnessGoal** - Control material stiffness (material properties)
- **VolumeGoal** - Maintain volume constraints (geometric constraints)

### Chemistry Goals

- **BlendGoal** - Control material blending (mixing behavior)
- **MassGoal** - Target mass distribution (density optimization)
- **MaterialGoal** - Assign materials to regions (material assignment)
- **StiffnessGoal** - Target stiffness distribution (mechanical properties)
- **ThermalGoal** - Target thermal properties (heat transfer)
- **TransparencyGoal** - Target optical properties (light transmission)

---

## Validation Rules

### Rule 1: Solver Nodes Must Have semanticOps

All solver nodes (nodes with `category: 'solver'`) must have a `semanticOps` array with at least one operation.

```typescript
// ✅ CORRECT
semanticOps: ['solver.chemistry']

// ❌ INCORRECT
// Missing semanticOps
```

### Rule 2: Goal Nodes Must NOT Have semanticOps

Goal nodes (nodes with `category: 'goal'`) must NOT have `semanticOps` because they are declarative.

```typescript
// ✅ CORRECT
// No semanticOps field

// ❌ INCORRECT
semanticOps: ['goal.material']  // Goals don't compute
```

### Rule 3: Simulator Operations Are Internal

Simulator operations (`simulator.*`) are internal infrastructure and should NOT be directly referenced in node `semanticOps` arrays.

```typescript
// ✅ CORRECT
semanticOps: ['solver.chemistry']

// ❌ INCORRECT
semanticOps: ['simulator.step']  // Too low-level
```

---

## Philosophy

**Code is the philosophy. Language is code. Math is numbers. It's all one seamless, powerful engine that speaks to itself mechanically.**

The solver system embodies this philosophy:

1. **Language** - Solver names (Greek), goal descriptions, semantic operation IDs
2. **Code** - Solver implementations, simulation loops, convergence checks
3. **Math** - Physics equations, chemistry dynamics, biological patterns, evolutionary algorithms
4. **Mechanical** - The system validates itself automatically through semantic linkage

**Lingua can maintain and understand itself through its code:**

- **Rules** are encoded in validation scripts
- **Abilities** are encoded in semantic operations
- **Relationships** are encoded in solver taxonomy
- **Correctness** is enforced by CI pipeline

**The semantic system is the portal from UI to backend computation.**

Every user interaction with a solver:
1. **Has a name** - Solver node type
2. **Has metadata** - Semantic operation ID
3. **Is validated** - Machine-checkable correctness
4. **Is documented** - Automatically generated
5. **Is traceable** - From UI to backend to pixels

---

## Implementation Status

| Solver | Node | Semantic Ops | Goals | Test Rig | Docs | Status |
|--------|------|--------------|-------|----------|------|--------|
| Physics | ✅ | ✅ | ✅ (4) | ✅ | ✅ | Complete |
| Chemistry | ✅ | ✅ | ✅ (6) | ✅ | ✅ | Complete |
| Biological | ✅ | ✅ | ❌ (0) | ✅ | ✅ | Complete |
| Voxel | ✅ | ✅ | ❌ (0) | ✅ | ✅ | Complete |
| Evolutionary | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Planned |
| Topology Opt | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Planned |

---

## Future Enhancements

### Simulator Dashboard

Real-time visualization of solver simulation:
- Energy/fitness history plots
- Convergence metrics
- State inspection
- Parameter tuning UI

### Multi-Solver Workflows

Chaining solvers together:
- Physics → Chemistry (structural + material optimization)
- Voxel → Topology (voxelization + optimization)
- Biological → Chemistry (pattern + material)

### Advanced Goal System

More sophisticated goal specifications:
- Multi-objective optimization (Pareto fronts)
- Hierarchical goals (primary + secondary)
- Adaptive goals (change during simulation)
- Region-specific goals (spatial constraints)

---

## Summary

Lingua's solver system provides:

1. **Clear taxonomy** - Solvers with/without simulators
2. **Semantic layers** - Solver → simulator → solver-specific operations
3. **Validation rules** - Machine-checkable correctness
4. **Common interface** - Shared simulator lifecycle
5. **Ontological purity** - Goals are declarative, solvers are computational
6. **Complete semantic chain** - UI → Command → Node → Solver → Simulator → Kernel → Pixels

**This architecture enables Lingua to scale from 4 solvers to 10+ solvers while maintaining perfect semantic correctness and ontological alignment.**

---

**Status:** 4 solvers implemented, 2 planned  
**Validation:** 100% pass rate (0 errors, 0 warnings)  
**Coverage:** 100% semantic coverage for implemented solvers
