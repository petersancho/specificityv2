# Biological Solver Implementation Plan

## Overview

The **Biological Solver** (Γαληνός - Galen) is the 5th solver in Lingua's computational trinity, implementing **reaction-diffusion morphogenesis** based on the Gray-Scott model. This solver generates organic, biological patterns through chemical reaction and diffusion dynamics.

---

## Ontological Position

### LINGUA-ROSLYN-NUMERICA Trinity

**LINGUA (Language):**
- Node type: `biologicalSolver`
- Category: `solver`
- Goals: Pattern formation parameters (feed rate, kill rate, diffusion rates)
- Semantic intent: "Generate biological patterns through reaction-diffusion"

**NUMERICA (Computation):**
- Algorithm: Gray-Scott reaction-diffusion system
- State: Two chemical concentrations (U, V) on 3D voxel grid
- Iteration: Explicit Euler integration with Laplacian diffusion
- Convergence: Pattern stability (variance threshold)

**ROSLYN (Geometry):**
- Input: Domain bounds or mesh
- Output: Voxel field + isosurface mesh with gradient coloring
- Visualization: Concentration gradients (blue → red)

---

## Mathematical Foundation

### Gray-Scott Equations

```
∂u/∂t = Du∇²u - uv² + F(1-u)
∂v/∂t = Dv∇²v + uv² - (F+k)v
```

Where:
- `u`: Concentration of chemical U (substrate)
- `v`: Concentration of chemical V (product)
- `Du`, `Dv`: Diffusion rates
- `F`: Feed rate (replenishment of U)
- `k`: Kill rate (removal of V)
- `∇²`: Laplacian operator (diffusion)

### Pattern Regimes

Different (F, k) parameters produce different patterns:
- **Spots**: F=0.035, k=0.065
- **Stripes**: F=0.035, k=0.060
- **Waves**: F=0.014, k=0.054
- **Coral**: F=0.062, k=0.061

---

## Implementation Architecture

### Node Definition

```typescript
export const BiologicalSolver: WorkflowNodeDefinition = {
  type: "biologicalSolver",
  category: "solver",
  label: "Biological Solver",
  shortLabel: "Biological",
  description: "Reaction-diffusion morphogenesis solver (Gray-Scott model)",
  iconId: "solver",
  
  inputs: [
    { name: "domain", type: "geometry", required: true },
    { name: "goals", type: "goals", required: false },
  ],
  
  outputs: [
    { name: "geometry", type: "geometry" },
    { name: "field", type: "field" },
    { name: "metadata", type: "metadata" },
  ],
  
  parameters: [
    { name: "gridResolution", type: "number", default: 64 },
    { name: "feedRate", type: "number", default: 0.035 },
    { name: "killRate", type: "number", default: 0.065 },
    { name: "diffusionU", type: "number", default: 0.16 },
    { name: "diffusionV", type: "number", default: 0.08 },
    { name: "timeStep", type: "number", default: 1.0 },
    { name: "maxIterations", type: "number", default: 10000 },
    { name: "convergenceTolerance", type: "number", default: 1e-6 },
    { name: "isoValue", type: "number", default: 0.5 },
    { name: "seed", type: "number", default: 42 },
  ],
  
  compute: async (inputs, params, context) => {
    // Implementation
  }
};
```

### Computation Pipeline

1. **Initialize Grid**
   - Create 3D voxel grid from domain bounds
   - Initialize U=1.0 everywhere (substrate)
   - Initialize V=0.0 everywhere (product)
   - Add random perturbations (seeded) to V in center region

2. **Iterate Reaction-Diffusion**
   ```
   FOR iteration = 0 TO maxIterations:
     1. Compute Laplacian(U) and Laplacian(V) using 6-neighbor stencil
     2. Apply Gray-Scott equations:
        dU = Du*Laplacian(U) - U*V² + F*(1-U)
        dV = Dv*Laplacian(V) + U*V² - (F+k)*V
     3. Update: U += dt*dU, V += dt*dV
     4. Clamp to [0, 1]
     5. Compute variance of V field
     6. Check convergence: |variance[i] - variance[i-1]| < tolerance
     IF converged: BREAK
   ```

3. **Generate Geometry**
   - Create voxel field from V concentration
   - Extract isosurface at isoValue using Marching Cubes
   - Compute vertex colors from V gradient (blue → red)
   - Attach solver metadata

4. **Return Results**
   - Geometry with mesh + metadata
   - Voxel field
   - Convergence info

---

## Ontological Alignment

### Comparison with Other Solvers

| Aspect | Physics | Chemistry | Topology | Voxel | **Biological** |
|--------|---------|-----------|----------|-------|----------------|
| **Domain** | Mesh vertices | Particles | Voxel grid | Voxel grid | **Voxel grid** |
| **State** | Displacements | Materials | Density | Density | **Concentrations** |
| **Process** | FEM equilibrium | SPH energy min | SIMP optimization | Density opt | **Reaction-diffusion** |
| **Convergence** | Residual | Energy delta | Objective | Objective | **Variance stability** |
| **Output** | Deformed mesh | Particle mesh | Isosurface | Isosurface | **Isosurface** |
| **Type** | Equilibrium | Distribution | Optimization | Optimization | **Morphogenesis** |

### Shared Ontological Principles

- ✅ Pure function (deterministic with seed)
- ✅ Iterative convergence
- ✅ Solver metadata attachment (ROSLYN-NUMERICA bridge)
- ✅ Gradient visualization
- ✅ Performance optimization (typed arrays, batching)

---

## Goals System

### Biological Goals (Future)

1. **Pattern Goal**: Target specific pattern type (spots, stripes, waves)
2. **Scale Goal**: Control pattern wavelength/frequency
3. **Density Goal**: Target concentration levels
4. **Symmetry Goal**: Enforce symmetry constraints
5. **Region Goal**: Constrain patterns to specific regions

**For MVP**: Use parameters directly (no goals yet)

---

## Performance Optimizations

1. **Typed Arrays**: Use Float32Array for U, V fields
2. **Double Buffering**: Swap read/write buffers each iteration
3. **Batched Operations**: Vectorized Laplacian computation
4. **Early Termination**: Stop when variance stabilizes
5. **Spatial Hashing**: (Future) for non-uniform grids

---

## Test Strategy

### Test Rig

Create `biological-solver-example.ts`:
```typescript
export const runBiologicalSolverExample = () => {
  // 1. Create domain (cube)
  // 2. Set parameters (spots pattern)
  // 3. Run solver
  // 4. Validate output (non-empty mesh, converged)
  // 5. Log report
};
```

### Validation

- ✅ Mesh is non-empty
- ✅ Vertex count > 0
- ✅ Convergence achieved
- ✅ Iterations > 0
- ✅ Variance decreases over time
- ✅ U, V concentrations in [0, 1]
- ✅ Deterministic (same seed → same output)

---

## Documentation Updates

### README.md

Add to solver list:
```markdown
### Biological Solver (Galen)
- Reaction-diffusion morphogenesis (Gray-Scott model)
- Generates organic, biological patterns
- Concentration gradient visualization (blue → red)
- Hero geometry: coral-like structures
- *Explores emergent pattern formation through chemical dynamics*
```

### ontology.md

Add to "The Five Solvers":
```markdown
**5. Biological Solver (Ἐπιλύτης Βιολογικός — Galen)**
- **Domain**: Pattern formation
- **Input**: Domain bounds + reaction-diffusion parameters
- **Process**: Gray-Scott reaction-diffusion system
- **Output**: Concentration field + isosurface mesh
- **Ontological Type**: **Morphogenesis Solver** (emergent pattern formation)
```

---

## Implementation Checklist

### Phase 1: Core Solver
- [ ] Create `BiologicalSolver.ts` node definition
- [ ] Implement Gray-Scott equations
- [ ] Implement 3D Laplacian operator
- [ ] Implement grid initialization with seeded random
- [ ] Implement iteration loop with convergence check
- [ ] Implement voxel field generation
- [ ] Implement isosurface extraction
- [ ] Attach solver metadata

### Phase 2: Integration
- [ ] Register in node registry
- [ ] Add to solver exports
- [ ] Update type definitions
- [ ] Add icon (if needed)

### Phase 3: Testing
- [ ] Create test rig
- [ ] Create fixtures
- [ ] Create report builder
- [ ] Validate determinism
- [ ] Validate convergence

### Phase 4: Documentation
- [ ] Update README.md
- [ ] Update ontology.md
- [ ] Update ontology-roadmap.md
- [ ] Update ontology-sweep-summary.md

---

## Success Criteria

**The Biological Solver is complete when:**
1. ✅ Produces non-empty mesh for valid inputs
2. ✅ Converges reliably for standard parameters
3. ✅ Generates recognizable patterns (spots, stripes, waves)
4. ✅ Deterministic (same seed → same output)
5. ✅ Full solver metadata attached
6. ✅ Test rig passes all validations
7. ✅ Documentation updated
8. ✅ Committed and pushed to GitHub

---

## Historical Context

**Galen (Γαληνός)** (129-216 AD) was a Greek physician and philosopher whose theories dominated Western medicine for over a millennium. He emphasized systematic observation and experimentation, laying foundations for biological science.

The Biological Solver honors Galen by exploring **emergent biological patterns** through computational chemistry—a modern continuation of his systematic approach to understanding living systems.

---

## Next Steps

1. Implement core solver (BiologicalSolver.ts)
2. Create test rig
3. Validate and debug
4. Update documentation
5. Commit and push to GitHub

**The Biological Solver will complete Lingua's five-solver architecture, bringing the total to:**
1. Physics (Pythagoras)
2. Chemistry (Apollonius)
3. Topology (Euclid)
4. Voxel (Archimedes)
5. **Biological (Galen)** ✨
