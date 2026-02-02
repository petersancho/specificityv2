# Lingua Solvers

## Overview

Lingua's solver system provides computational engines for optimization, simulation, and pattern generation. Each solver has its own unique semantic identity, linking UI elements to backend computation through a machine-checkable semantic language.

---

## Solver Taxonomy

### Solvers with Simulators

These solvers run iterative simulations with temporal dynamics, convergence checking, and state evolution. They have simulator dashboards with setup, simulator, and output pages.

| Solver | Greek Name | Ontological Type | Simulator Dashboard | Status |
|--------|------------|------------------|---------------------|--------|
| **Evolutionary** | Ἐπιλύτης Ἐξελικτικός (Darwin) | Evolutionary Optimization | ✅ Setup, Simulator, Output | ✅ Implemented |
| **Chemistry** | Ἐπιλύτης Χημείας (Apollonius) | Material Distribution | ✅ Setup, Simulator, Output | ✅ Implemented |
| **Physics** | Ἐπιλύτης Φυσικῆς (Pythagoras) | Stress Analysis | ⏳ Future | ✅ Implemented |

### Solvers without Simulators

These solvers perform direct computation or optimization without temporal simulation.

| Solver | Greek Name | Ontological Type | Simulator | Status |
|--------|------------|------------------|-----------|--------|
| **Voxel** | Ἐπιλύτης Φογκελ (Archimedes) | Voxelization | ❌ No | ✅ Implemented |
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
| `solver.evolutionary` | Evolutionary | Yes | No (seeded) | No |
| `solver.chemistry` | Chemistry | Yes | No (seeded) | No |
| `solver.physics` | Physics | Yes | Yes | No |
| `solver.voxel` | Voxel | No | Yes | Yes |
| `solver.topologyOptimization` | Topology Optimization | No | Yes | No |

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
**Ontological Type:** Stress Analysis & Visualization

**Purpose:** Analyzes geometry to generate colored gradient meshes showcasing stress points and other engineering physics properties. An all-in-one colored analysis tool with gradient rendering capabilities.

**Has Simulator:** ⏳ Future (analysis computation visualization)

**Semantic Operations:**
- `solver.physics` - Primary solver operation

**Goal Nodes:**
- AnchorGoal - Fix vertices in space
- LoadGoal - Apply forces to vertices
- StiffnessGoal - Control material stiffness
- VolumeGoal - Maintain volume constraints

**Analysis Types:**
- **Stress Analysis** - Colored gradient mesh showing stress points (current)
- **Planarity Analysis** - Future enhancement
- **Other Engineering Physics** - Future enhancements

**Mathematical Foundation:** Finite Element Method (FEM), force equilibrium, stress tensor analysis

**Documentation:** [docs/solvers/PHYSICS_SOLVER.md](./solvers/PHYSICS_SOLVER.md)

---

### 2. Chemistry Solver

**Greek Name:** Ἐπιλύτης Χημείας (Epilýtēs Chēmeías)  
**English Name:** Chemistry Solver  
**Named After:** Apollonius (mathematician, astronomer)  
**Ontological Type:** Material Distribution & Blending

**Purpose:** Blends geometry and particles of geometry using particle-based simulation to optimize material distribution within a domain.

**Has Simulator:** ✅ Yes (particle-based material distribution simulation with dashboard)

**Simulator Dashboard:**
- **Setup Page** - Configure materials, particles, blending parameters
- **Simulator Page** - Watch particle distribution evolve
- **Output Page** - View blended geometry with material distribution

**Semantic Operations:**
- `solver.chemistry` - Primary solver operation

**Goal Nodes:**
- BlendGoal - Control material blending
- MassGoal - Target mass distribution
- MaterialGoal - Assign materials to regions
- StiffnessGoal - Target stiffness distribution
- ThermalGoal - Target thermal properties
- TransparencyGoal - Target optical properties

**Mathematical Foundation:** Smoothed Particle Hydrodynamics (SPH), energy minimization, particle-geometry blending

**Documentation:** [docs/solvers/CHEMISTRY_SOLVER.md](./solvers/CHEMISTRY_SOLVER.md)

---

### 3. Evolutionary Solver

**Greek Name:** Ἐπιλύτης Ἐξελικτικός (Epilýtēs Exeliktikos)  
**English Name:** Evolutionary Solver  
**Node Type:** `evolutionarySolver`  
**Named After:** Charles Darwin (evolutionary theory)  
**Ontological Type:** Evolutionary Optimization

**Purpose:** Runs evolutionary/genetic algorithm through generations of populations to find optimized geometry configurations. Uses fitness functions to converge on optimal geometric variants.

**Has Simulator:** ✅ Yes (genetic algorithm simulation with dashboard)

**Simulator Dashboard:**
- **Setup Page** - Configure population, fitness function, geometry parameters, sliders, transformation ranges
- **Simulator Page** - Watch generations evolve, see fitness over time, view animation through possibilities
- **Output Page** - View optimized geometry variants for each generation

**Semantic Operations:**
- `solver.evolutionary` - Primary solver operation

**Goal Nodes:** (To be defined - fitness function goals)

**How It Works:**
1. Takes geometry and parameters as inputs (sliders, sizes, transformation ranges)
2. Generates population of geometric variants
3. Evaluates fitness function (e.g., area optimization, volume optimization)
4. Selects best variants (selection operators)
5. Creates new generation (crossover and mutation)
6. Simulates animation through possibilities
7. Converges to optimal variation
8. Outputs geometric variants

**Mathematical Foundation:** Genetic algorithms, fitness functions, selection operators (tournament, roulette, rank), crossover operators (single-point, two-point, uniform, arithmetic), mutation operators (gaussian, uniform, creep)

**Documentation:** [docs/solvers/EVOLUTIONARY_SOLVER.md](./solvers/EVOLUTIONARY_SOLVER.md)

---

### 4. Voxel Solver

**Greek Name:** Ἐπιλύτης Φογκελ (Epilýtēs Fogkel)  
**English Name:** Voxelizer  
**Named After:** Archimedes (mathematician, engineer)  
**Ontological Type:** Voxelization

**Purpose:** Voxelizes any geometry inputted, converting it into a voxel grid at a specified resolution.

**Has Simulator:** ❌ No (direct voxelization)

**Semantic Operations:**
- `solver.voxel` - Primary solver operation

**Goal Nodes:** None (direct conversion)

**Mathematical Foundation:** Rasterization, flood fill, spatial discretization

**Documentation:** [docs/solvers/VOXEL_SOLVER.md](./solvers/VOXEL_SOLVER.md)

**Status:** Almost complete

---

### 5. Topology Optimization Solver (Future)

**Ontological Type:** Structural Optimization

**Purpose:** Generates topologically optimized structures from input geometry through a multi-step process.

**Has Simulator:** ❌ No (direct computation)

**Semantic Operations:**
- `solver.topologyOptimization` - Primary solver operation

**Goal Nodes:** (To be defined)

**How It Works:**
1. Takes input geometry
2. Generates point cloud from input geometry
3. Creates curve network based on 3D proximity
4. Multipipes the curve network
5. Outputs topologically optimized structure

**Mathematical Foundation:** Point cloud generation, proximity-based curve network construction, multipipe geometry generation

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
3. **Math** - Physics equations, chemistry dynamics, evolutionary algorithms
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

| Solver | Node | Semantic Ops | Goals | Test Rig | Docs | Dashboard | Status |
|--------|------|--------------|-------|----------|------|-----------|--------|
| Evolutionary | ✅ | ✅ | ⏳ | ✅ | ✅ | ✅ | Complete |
| Chemistry | ✅ | ✅ | ✅ (6) | ✅ | ✅ | ✅ | Complete |
| Physics | ✅ | ✅ | ✅ (4) | ✅ | ✅ | ⏳ | Complete |
| Voxel | ✅ | ✅ | ❌ (0) | ✅ | ✅ | ❌ | Almost Complete |
| Topology Opt | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ❌ | Planned |

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
- Evolutionary → Chemistry (optimized geometry + material)

### Advanced Goal System

More sophisticated goal specifications:
- Multi-objective optimization (Pareto fronts)
- Hierarchical goals (primary + secondary)
- Adaptive goals (change during simulation)
- Region-specific goals (spatial constraints)

---

## Summary

Lingua's solver system provides:

1. **Clear taxonomy** - Solvers with/without simulators, with/without dashboards
2. **Semantic layers** - Solver → simulator → solver-specific operations
3. **Validation rules** - Machine-checkable correctness
4. **Common interface** - Shared simulator lifecycle
5. **Ontological purity** - Goals are declarative, solvers are computational
6. **Complete semantic chain** - UI → Command → Node → Solver → Simulator → Kernel → Pixels
7. **Simulator dashboards** - Setup, Simulator, Output pages for solvers that need them

**This architecture enables Lingua to scale from 5 solvers to 10+ solvers while maintaining perfect semantic correctness and ontological alignment.**

---

**Status:** 4 solvers implemented, 1 planned  
**Validation:** 100% pass rate (0 errors, 0 warnings)  
**Coverage:** 100% semantic coverage for implemented solvers

**Key Clarifications:**
- Evolutionary Solver implements genetic algorithm optimization (node type: `evolutionarySolver`)
- Physics Solver is an analysis/visualization tool (colored gradient mesh for stress points)
- Chemistry Solver blends geometry and particles with simulator dashboard
- Voxel Solver voxelizes any geometry (almost complete)
- Topology Optimization generates point cloud → curve network → multipipe structure
