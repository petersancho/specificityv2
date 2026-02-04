# Solver Semantic Architecture

## Purpose

This document defines the ontological architecture for Lingua's solver system, establishing semantic layers that link UI elements to backend computation through a machine-checkable semantic language.

---

## Core Principle

**Lingua must remain ontologically semantic.**

Every solver, simulator, goal, and operation must be semantically linked from UI → command → node → semantic operation → backend computation → rendered result.

---

## Solver Taxonomy

### 1. Solvers with Simulators

These solvers run iterative simulations with temporal dynamics, convergence checking, and state evolution.

| Solver | Simulator | Ontological Type | Domain |
|--------|-----------|------------------|--------|
| **Physics** | ✅ Yes | Equilibrium | Structural mechanics, force balance |
| **Chemistry** | ✅ Yes | Distribution | Material distribution, particle dynamics |
| **Evolutionary** | ✅ Yes | Optimization | Genetic algorithms, fitness evolution |
| **Topology Optimization** | ✅ Yes | Structural Optimization | SIMP density evolution, compliance minimization |

**Characteristics:**
- Iterative simulation loop
- Temporal dynamics (time steps)
- Convergence checking
- State history tracking
- Energy/fitness minimization
- Particle/voxel/population state

### 2. Solvers without Simulators

These solvers perform direct computation or optimization without temporal simulation.

| Solver | Simulator | Ontological Type | Domain |
|--------|-----------|------------------|--------|
| **Voxel** | ❌ No | Discrete Conversion | Geometry → voxel field conversion |

**Characteristics:**
- Direct computation
- No temporal dynamics
- No convergence loop
- Single-pass or optimization-based
- Deterministic output

---

## Semantic Operation Layers

### Layer 1: Solver Operations

**Domain:** `solver`

These operations represent the high-level solver computation.

| Operation ID | Solver | Simulator | Deterministic | Pure |
|--------------|--------|-----------|---------------|------|
| `solver.physics` | Physics | Yes | Yes | No |
| `solver.chemistry` | Chemistry | Yes | No (seeded) | No |
| `solver.evolutionary` | Evolutionary | Yes | No (seeded) | No |
| `solver.voxel` | Voxel | No | Yes | Yes |
| `solver.topologyOptimization` | Topology | Yes | Yes | No |

**Metadata:**
- `domain`: 'solver'
- `category`: 'utility'
- `tags`: ['3d', 'simulation', 'optimization']
- `complexity`: 'O(n*iterations)' for simulators, 'O(n)' for direct
- `cost`: 'high'
- `sideEffects`: ['geometry', 'state']

### Layer 2: Simulator Operations

**Domain:** `simulator`

These operations represent the simulation loop infrastructure (for solvers with simulators).

| Operation ID | Purpose | Used By |
|--------------|---------|---------|
| `simulator.initialize` | Initialize simulation state | All simulators |
| `simulator.step` | Execute single simulation step | All simulators |
| `simulator.converge` | Check convergence criteria | All simulators |
| `simulator.finalize` | Finalize simulation result | All simulators |

**Metadata:**
- `domain`: 'simulator'
- `category`: 'utility'
- `tags`: ['simulation', 'temporal', 'iterative']
- `complexity`: 'O(n)' per step
- `cost`: 'medium'
- `pure`: false
- `deterministic`: varies by solver
- `sideEffects`: ['state']

### Layer 3: Solver-Specific Operations

**Domain:** `solver.{solverName}`

These operations represent solver-specific computations.

#### Physics Solver

| Operation ID | Purpose |
|--------------|---------|
| `solver.physics.computeForces` | Compute structural forces |
| `solver.physics.applyConstraints` | Apply boundary conditions |
| `solver.physics.solveEquilibrium` | Solve force equilibrium |
| `simulator.physics.initialize` | Initialize physics simulation state |
| `simulator.physics.step` | Execute single physics simulation step |
| `simulator.physics.converge` | Check physics convergence criteria |
| `simulator.physics.finalize` | Finalize physics simulation result |
| `simulator.physics.applyLoads` | Apply loads to physics simulation |
| `simulator.physics.computeStress` | Compute stress distribution on geometry |

#### Chemistry Solver

| Operation ID | Purpose |
|--------------|---------|
| `solver.chemistry.initializeParticles` | Initialize particle system |
| `solver.chemistry.computeDensity` | Compute SPH density |
| `solver.chemistry.diffuseMaterials` | Diffuse material concentrations |
| `solver.chemistry.applyGoalForces` | Apply optimization goals |
| `solver.chemistry.generateVoxelField` | Generate voxel field from particles |
| `solver.chemistry.extractIsosurface` | Extract mesh from voxel field |
| `simulator.chemistry.initialize` | Initialize chemistry simulation state |
| `simulator.chemistry.step` | Execute single chemistry simulation step |
| `simulator.chemistry.converge` | Check chemistry convergence criteria |
| `simulator.chemistry.finalize` | Finalize chemistry simulation result |
| `simulator.chemistry.blendMaterials` | Blend materials based on particle concentrations |
| `simulator.chemistry.evaluateGoals` | Evaluate chemistry optimization goals |

#### Evolutionary Solver

| Operation ID | Purpose |
|--------------|---------|
| `solver.evolutionary.initializePopulation` | Initialize genome population |
| `solver.evolutionary.evaluateFitness` | Evaluate fitness function |
| `solver.evolutionary.selectParents` | Select parents for reproduction |
| `solver.evolutionary.crossover` | Perform genetic crossover |
| `solver.evolutionary.mutate` | Perform genetic mutation |
| `solver.evolutionary.checkConvergence` | Check fitness convergence |

#### Voxel Solver

| Operation ID | Purpose |
|--------------|---------|
| `solver.voxel.rasterize` | Rasterize geometry to voxels |
| `solver.voxel.generateField` | Generate voxel field |

#### Topology Optimization Solver

| Operation ID | Purpose |
|--------------|---------|
| `solver.topologyOptimization` | Primary topology solver semantic anchor |
| `solver.topologyOptimization.optimize` | Optimize material layout (SIMP) |
| `simulator.topology.initialize` | Initialize SIMP density field |
| `simulator.topology.step` | Execute optimization iteration |
| `simulator.topology.converge` | Check convergence criteria |
| `simulator.topology.preview` | Build preview geometry during simulation |
| `simulator.topology.sync` | Sync preview to Roslyn |
| `simulator.topology.finalize` | Extract final geometry |
| `simulator.topology.plasticwrap` | Refine output surface |
| `simulator.topology.pause` / `simulator.topology.resume` / `simulator.topology.reset` | Control lifecycle |
| `simulator.topology.stabilityGuard` | Adaptive stability control |

---

## Node Semantic Linkage

### Solver Nodes

All solver nodes must have `semanticOps` arrays linking to their primary solver operation.

```typescript
// Example: ChemistrySolver
export const ChemistrySolverNode: WorkflowNodeDefinition = {
  type: 'chemistrySolver',
  label: 'Chemistry Solver',
  category: 'solver',
  semanticOps: ['solver.chemistry'],
  // ... rest of definition
};
```

### Goal Nodes

Goal nodes are declarative and should NOT have `semanticOps` (they specify intent, not computation).

```typescript
// Example: ChemistryMaterialGoal
export const ChemistryMaterialGoal: WorkflowNodeDefinition = {
  type: 'chemistryMaterialGoal',
  label: 'Material Goal',
  category: 'goal',
  // NO semanticOps - declarative intent
  // ... rest of definition
};
```

---

## Simulator Architecture

### Common Simulator Interface

All simulators share a common interface:

```typescript
interface SimulatorState<T> {
  iteration: number;
  converged: boolean;
  energy: number;
  state: T;
  history: Array<{ iteration: number; energy: number }>;
}

interface SimulatorConfig {
  maxIterations: number;
  convergenceTolerance: number;
  timeStep: number;
}

interface SimulatorResult<T> {
  success: boolean;
  iterations: number;
  convergenceAchieved: boolean;
  finalEnergy: number;
  state: T;
  history: Array<{ iteration: number; energy: number }>;
  mesh: RenderMesh;
  warnings: string[];
  errors: string[];
}
```

### Simulator Lifecycle

1. **Initialize** - Create initial state
2. **Loop** - Iterate until convergence or max iterations
   - Step simulation
   - Compute energy/fitness
   - Check convergence
   - Update history
3. **Finalize** - Generate output mesh and metadata

---

## Semantic Validation Rules

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

Simulator operations (`simulator.*`) are internal infrastructure and should NOT be directly referenced in node `semanticOps` arrays. They are used internally by solver implementations.

```typescript
// ✅ CORRECT
semanticOps: ['solver.chemistry']

// ❌ INCORRECT
semanticOps: ['simulator.step']  // Too low-level
```

### Rule 4: Solver-Specific Operations Are Optional

Solver-specific operations (`solver.{name}.*`) can be added to `semanticOps` arrays for fine-grained semantic linkage, but the primary solver operation is required.

```typescript
// ✅ CORRECT - Primary only
semanticOps: ['solver.chemistry']

// ✅ CORRECT - Primary + specific
semanticOps: [
  'solver.chemistry',
  'solver.chemistry.diffuseMaterials',
  'solver.chemistry.generateVoxelField'
]
```

---

## Implementation Checklist

### Phase 8A: Expand Solver Semantic Operations ✅

- [x] Add `solver.biological` (already exists)
- [ ] Add `solver.evolutionary`
- [ ] Add `solver.topologyOptimization`
- [ ] Add simulator operations (`simulator.*`)
- [ ] Add chemistry-specific operations (`solver.chemistry.*`)
- [ ] Add biological-specific operations (`solver.biological.*`)
- [ ] Add evolutionary-specific operations (`solver.evolutionary.*`)
- [ ] Add physics-specific operations (`solver.physics.*`)
- [ ] Add voxel-specific operations (`solver.voxel.*`)

### Phase 8B: Update Solver Nodes with semanticOps

- [ ] PhysicsSolver → `semanticOps: ['solver.physics']`
- [ ] ChemistrySolver → `semanticOps: ['solver.chemistry']`
- [ ] BiologicalSolver → `semanticOps: ['solver.biological']`
- [ ] VoxelSolver → `semanticOps: ['solver.voxel']`

### Phase 8C: Validate Goal Nodes

- [ ] Ensure all goal nodes do NOT have `semanticOps`
- [ ] Document why goals are declarative

### Phase 8D: Update Validation Scripts

- [ ] Add solver-specific validation rules
- [ ] Add goal node validation rules
- [ ] Add simulator operation validation rules

---

## Philosophy

**Code is the philosophy. Language is code. Math is numbers. It's all one seamless, powerful engine that speaks to itself mechanically.**

The solver semantic architecture embodies this philosophy:

1. **Language** - Solver names, goal descriptions, semantic operation IDs
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

## Future Enhancements

### Evolutionary Solver (Phase 8E)

- Genome representation
- Fitness function evaluation
- Selection operators (tournament, roulette, rank)
- Crossover operators (single-point, two-point, uniform, arithmetic)
- Mutation operators (gaussian, uniform, creep, swap)
- Convergence checking (fitness stabilization, diversity loss)
- Multi-objective optimization (Pareto front)

### Topology Optimization Solver (SIMP) - Implemented

- SIMP density evolution with semantic simulator lifecycle
- Sensitivity analysis + density filtering
- Volume constraint + compliance minimization
- Preview sync and geometry extraction tracked as semantic operations

### Simulator Dashboard (Phase 8G)

- Real-time simulation visualization
- Energy/fitness history plots
- Convergence metrics
- State inspection
- Parameter tuning UI

---

## Summary

The solver semantic architecture establishes:

1. **Clear taxonomy** - Solvers with/without simulators
2. **Semantic layers** - Solver → simulator → solver-specific operations
3. **Validation rules** - Machine-checkable correctness
4. **Common interface** - Shared simulator lifecycle
5. **Ontological purity** - Goals are declarative, solvers are computational

**This architecture enables Lingua to scale from 4 solvers to 10+ solvers while maintaining perfect semantic correctness and ontological alignment.**

---

**Status:** Architecture defined, ready for implementation  
**Next Phase:** Phase 8A - Expand solver semantic operations
