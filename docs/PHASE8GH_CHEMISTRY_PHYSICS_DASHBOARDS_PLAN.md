# Phase 8G+8H: Chemistry & Physics Solver Simulator Dashboards

## Critical Requirements

1. **Don't mix them up** - Each solver has distinct identity
2. **Don't make them similar** - Unique UI, controls, visualizations
3. **Each is unique, specific, and complex** - Reflect solver complexity
4. **Make semantics for both** - Distinct semantic operations

---

## Chemistry Solver Dashboard (Apollonius - Material Distribution)

### Unique Identity

- **Purpose:** Particle-based material blending and distribution
- **Domain:** Materials science, functionally graded materials
- **Method:** SPH (Smoothed Particle Hydrodynamics) simulation
- **Output:** Voxel field → mesh with material properties

### Color Scheme (CMYK Brandkit)

- **Primary:** Cyan (#00d4ff) - fluidity, particles, chemistry
- **Secondary:** Yellow (#ffdd00) - energy, reactions
- **Accent:** Magenta (#ff0099) - highlights

### Three-Tab Interface

#### Setup Tab
- Material Library (grid of material cards)
  - Name, density, stiffness, thermal conductivity
  - Optical transmission, diffusivity, color
- Material Selection (drag to blend)
- Seed Placement
  - Position (x, y, z)
  - Radius
  - Material
  - Strength (0-1)
- Goal Configuration
  - Stiffness goals
  - Mass goals
  - Transparency goals
  - Thermal goals
  - Blend goals
- Domain Geometry Display
- Particle Parameters
  - Particle count
  - Blend strength
  - Field resolution
  - Iso value

#### Simulator Tab
- Particle Visualization (3D view)
  - Colored particles by material
  - Real-time particle positions
- Material Distribution Chart
  - Concentration over time
  - Per-material curves
- Energy Convergence Graph
  - Energy vs iteration
  - Convergence threshold line
- Voxel Field Preview
  - Slice visualization
  - Material density heatmap
- Control Panel
  - Start, Pause, Resume, Stop, Reset
- Real-time Stats
  - Current iteration
  - Energy
  - Convergence status
  - Particle count
  - Compute time
- Material Legend
  - Each material with color swatch

#### Output Tab
- Final Mesh Preview
  - Colored by material composition
- Material Distribution Analysis
  - Histogram by material
  - Spatial distribution
- Voxel Field Slices
  - XY plane
  - XZ plane
  - YZ plane
- Gradient Quality Metrics
  - Smoothness score
  - Transition zone width
  - Coagulation detection
  - Over-dilution detection
- Export Options
  - Mesh (STL, OBJ)
  - Voxel field (VTK)
  - Material data (JSON)
- Iteration History
  - Energy evolution
  - Best state

---

## Physics Solver Dashboard (Pythagoras - Stress Analysis)

### Unique Identity

- **Purpose:** Structural stress analysis and visualization
- **Domain:** Engineering, structural mechanics
- **Method:** Finite element analysis (FEA)
- **Output:** Colored gradient mesh showing stress distribution

### Color Scheme (CMYK Brandkit)

- **Primary:** Magenta (#ff0099) - force, stress, intensity
- **Secondary:** Cyan (#00d4ff) - structure, stability
- **Accent:** Yellow (#ffdd00) - critical points

### Three-Tab Interface

#### Setup Tab
- Analysis Type Selection
  - Static (equilibrium)
  - Dynamic (time-dependent)
  - Modal (vibration modes)
- Material Properties
  - Young's modulus (Pa)
  - Poisson's ratio
  - Density (kg/m³)
- Load Application
  - Point forces (position, direction, magnitude)
  - Distributed loads (pressure, surface traction)
  - Body forces (gravity, acceleration)
- Constraint Definition
  - Fixed (all DOF constrained)
  - Pinned (translation constrained)
  - Roller (normal constrained)
- Mesh Quality Display
  - Element count
  - Node count
  - Aspect ratio
- Solver Parameters
  - Max iterations
  - Convergence tolerance
  - Time step (dynamic)
  - Animation frames

#### Simulator Tab
- Stress Visualization
  - Colored gradient mesh (blue → green → yellow → red)
  - Von Mises stress
  - Principal stresses
- Deformation Animation
  - Real-time deformation (if dynamic/modal)
  - Displacement magnitude
- Stress Distribution Graph
  - Histogram of stress values
  - Max stress location
- Displacement Vectors
  - Arrow visualization
  - Magnitude coloring
- Control Panel
  - Start, Pause, Resume, Stop, Reset
- Real-time Stats
  - Current iteration
  - Max stress (Pa)
  - Max displacement (m)
  - Convergence status
  - Compute time
- Stress Legend
  - Gradient scale (0 → max stress)
  - Critical stress threshold
- Critical Points Highlight
  - Stress concentrations
  - Failure zones

#### Output Tab
- Final Deformed Geometry
  - Overlay with original
  - Deformation scale factor
- Stress Field Analysis
  - Von Mises stress
  - Principal stress 1, 2, 3
  - Shear stress
- Displacement Field Analysis
  - X, Y, Z components
  - Magnitude
- Modal Shapes (if modal)
  - Mode 1, 2, 3, ...
  - Natural frequencies
- Animation Frames (if dynamic)
  - Frame-by-frame export
  - Time history
- Export Options
  - Deformed mesh (STL, OBJ)
  - Stress data (CSV, VTK)
  - Animation (MP4, GIF)
- Safety Factor Analysis
  - Yield strength comparison
  - Factor of safety map

---

## Semantic Operations

### Chemistry Solver Operations

| Operation | Description |
|-----------|-------------|
| `solver.chemistry` | Main chemistry solver operation |
| `simulator.chemistry.initialize` | Initialize particle system |
| `simulator.chemistry.step` | Run one simulation step |
| `simulator.chemistry.converge` | Check convergence |
| `simulator.chemistry.finalize` | Finalize results |
| `simulator.chemistry.blendMaterials` | Blend materials at particle level |
| `simulator.chemistry.evaluateGoals` | Evaluate goal satisfaction |

### Physics Solver Operations

| Operation | Description |
|-----------|-------------|
| `solver.physics` | Main physics solver operation |
| `simulator.physics.initialize` | Initialize FEA system |
| `simulator.physics.step` | Run one solver iteration |
| `simulator.physics.converge` | Check convergence |
| `simulator.physics.finalize` | Finalize results |
| `simulator.physics.applyLoads` | Apply forces and constraints |
| `simulator.physics.computeStress` | Compute stress field |

---

## Implementation Steps

### Step 1: Create Semantic Operations

1. Update `client/src/workflow/semanticOps/simulatorOps.ts`
2. Add chemistry-specific operations
3. Add physics-specific operations
4. Update operation count and validation

### Step 2: Create Chemistry Dashboard

1. Create `client/src/components/workflow/chemistry/ChemistrySimulatorDashboard.tsx`
2. Create `client/src/components/workflow/chemistry/ChemistrySimulatorDashboard.module.css`
3. Implement three-tab interface
4. Use Cyan/Yellow/Magenta color scheme
5. Add material library, seed placement, goal configuration
6. Add particle visualization, energy graph, voxel preview
7. Add mesh preview, distribution analysis, export

### Step 3: Create Physics Dashboard

1. Create `client/src/components/workflow/physics/PhysicsSimulatorDashboard.tsx`
2. Create `client/src/components/workflow/physics/PhysicsSimulatorDashboard.module.css`
3. Implement three-tab interface
4. Use Magenta/Cyan/Yellow color scheme
5. Add analysis type, material properties, load/constraint definition
6. Add stress visualization, deformation animation, displacement vectors
7. Add stress/displacement analysis, modal shapes, export

### Step 4: Update Solver Nodes

1. Update `client/src/workflow/nodes/solver/ChemistrySolver.ts`
   - Add `customUI.dashboardButton`
2. Update `client/src/workflow/nodes/solver/PhysicsSolver.ts`
   - Add `customUI.dashboardButton`

### Step 5: Update Documentation

1. Update `docs/SOLVERS.md`
2. Update `docs/solvers/CHEMISTRY_SOLVER.md`
3. Update `docs/solvers/PHYSICS_SOLVER.md`
4. Update `SKILL.md`

### Step 6: Validate and Test

1. Run `npm run validate:all`
2. Test chemistry dashboard
3. Test physics dashboard
4. Verify semantic operations
5. Verify no mix-ups between solvers

---

## Key Differences Summary

| Aspect | Chemistry Solver | Physics Solver |
|--------|------------------|----------------|
| **Purpose** | Material blending | Stress analysis |
| **Method** | Particle simulation (SPH) | Finite element analysis (FEA) |
| **Input** | Domain, materials, seeds, goals | Mesh, loads, constraints, goals |
| **Process** | Particle diffusion, material mixing | Structural deformation, stress computation |
| **Output** | Voxel field → mesh with materials | Colored gradient mesh with stress |
| **Visualization** | Particles, material concentration | Stress gradient, displacement vectors |
| **Primary Color** | Cyan (fluidity) | Magenta (force) |
| **Domain** | Materials science | Structural engineering |
| **Named After** | Apollonius | Pythagoras |

---

## Success Criteria

- ✅ Two distinct dashboards with unique identities
- ✅ No visual or functional similarity
- ✅ Each reflects its solver's complexity
- ✅ Semantic operations for both solvers
- ✅ CMYK brandkit integration
- ✅ Three-tab interface for both
- ✅ Real-time simulation controls
- ✅ Professional, polished design
- ✅ Love, Philosophy, Intent embodied
- ✅ All validation passing

---

**Estimated Time:** 8-10 hours

**Status:** Planning Complete, Ready for Implementation
