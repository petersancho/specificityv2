# ἘΠΙΛΥΤΗΣ ΧΗΜΕΙΑΣ (EPILÝTĒS CHĒMEÍAS)
## Chemistry Solver — Implementation Plan

**Solver of Chemistry / Transmutation**  
*A material reasoning system for functionally graded composite geometry*

---

## THEORETICAL FOUNDATION

This solver implements the epistemological framework established by **Kostas Grigoriadis** (UCL / AA) in his research on functionally graded materials (FGM):

**Core Principles:**
1. **Material is continuous**, not discrete
2. **Geometry emerges** from material behavior
3. **Design intent** is expressed through competing energetic goals
4. **Sub-materials blend** continuously without mechanical connections
5. **Simulation precedes form** — material computation generates topology

**Key Citations:**
- "Computational Blends: The Epistemology of Designing with Functionally Graded Materials" (RIBA President's Award 2018)
- Uses CFD-like particle simulations to emulate material fusion based on physical properties
- Applies to architectural details: steel-to-ceramic-to-glass gradients in curtain wall mullions
- Materially-oriented design where gradients emerge through simulation rather than explicit assignment

---

## I. SYSTEM OVERVIEW

### Ontological Position
**Ἐπιλύτης Χημείας** is NOT:
- A geometry optimizer
- A topology solver
- A shape generator
- A mesh deformer

**Ἐπιλύτης Χημείας** IS:
- A material distribution engine
- A state-based transmutation system
- A goal-driven resolution mechanism
- A continuous gradation calculator

### Computational Paradigm
Materials exist as **particles with weighted composition**.  
Geometry is **extracted** from converged material states.  
Goals create **energetic tendencies**, not explicit constraints.

---

## II. NODE SPECIFICATION

### NODE IDENTITY
**Name:** Ἐπιλύτης Χημείας (Epilýtēs Chēmeías)  
**Display Name:** Chemistry Solver  
**Category:** Solvers  
**Icon:** Greek letter Χ (Chi) with particle field overlay

### INPUT PORTS

#### 1. DOMAIN (Required)
**Type:** Geometry  
**Semantic Contract:** Spatial boundary for material existence  
**Accepted Forms:**
- Closed meshes (watertight solids)
- Implicit volumes (SDF-based)
- Parametric bounds (boxes, spheres, cylinders)

**Purpose:** Defines WHERE material can exist, not WHAT geometry to create  
**Behavior:** Particles remain inside; field extraction bounded by domain

---

#### 2. MATERIALS (Required)
**Type:** Material Assignment List  
**UI Pattern:** Right-click port → "Assign Materials to Geometry"  

**Material Species:** (Initial set — expandable)
- **Ceramic** (Alumina, Zirconia)
- **Metal** (Steel, Aluminum)
- **Glass** (Silica, Borosilicate)

**Per-Material Properties:**
```javascript
{
  name: "Steel",
  density: 7850,           // kg/m³
  stiffness: 200e9,        // Pa (Young's modulus)
  thermalConductivity: 50, // W/(m·K)
  opticalTransmission: 0,  // 0 = opaque, 1 = transparent
  diffusivity: 0.3,        // Blending coefficient
  color: [0.7, 0.7, 0.75]  // Visualization color
}
```

**Assignment Mechanism:**
User right-clicks MATERIALS port → selects geometries from scene → assigns material species:
- "Steel Beam" → Steel
- "Ceramic Facade" → Ceramic  
- "Glass Window" → Glass

Each geometry becomes a **seed region** with initial material concentration.

---

#### 3. SEEDS (Optional but Recommended)
**Type:** Geometry (points, curves, surfaces, volumes)  
**Purpose:** Initial nucleation sites to bias material emergence  
**Behavior:**
- **Points:** High-concentration nuclei
- **Curves:** Linear material paths
- **Surfaces:** Interface biasing
- **Volumes:** Bulk material regions

**Interaction with MATERIALS:**
- If MATERIALS assigns "Steel → Beam geometry" and SEEDS includes "Beam edges", steel nucleates along edges first
- Seeds break symmetry and encode fabrication logic

---

#### 4. ΤΕΛΟΙ (Goals) — Core System
**Type:** Goal Node Collection  
**Purpose:** Define competing energetic objectives  

**Available Goal Nodes:**

##### **Τέλος Σκληρότητος** (Télos Sklērótētos)
*Goal of Stiffness / Structural Resistance*

**Function:**
Drives material distribution toward load-bearing configurations.

**Parameters:**
- **Load Vectors** (directional forces)
- **Stiffness Weight** (per-material)
- **Structural Penalty** (for excessive deflection)

**Evaluation:**
```
E_stiffness = ∫ compliance · weight dV
```
Lower energy = better stiffness.

**Effect on State:**
- Attracts high-stiffness materials (steel) to stress concentrations
- Repels low-stiffness materials (glass) from critical regions

---

##### **Τέλος Ἐλαχίστου Ὄγκου** (Télos Elachístou Ónkou)
*Goal of Minimum Mass / Volume*

**Function:**
Minimizes total material usage while satisfying other goals.

**Parameters:**
- **Target Mass Fraction** (0–1)
- **Density Penalties** (per-material)

**Evaluation:**
```
E_mass = ∫ ρ(x) dV
```
Lower energy = less material.

**Effect on State:**
- Erodes low-density materials first
- Creates porous/lattice structures
- Balances with stiffness goal (cannot remove load-bearing material)

---

##### **Τέλος Κράσεως** (Télos Kráseōs)
*Goal of Blending / Gradation / Mixture Continuity*

**Function:**
Enforces smooth material gradients; prevents sharp boundaries.

**Parameters:**
- **Gradient Smoothness** (0 = sharp, 1 = ultra-smooth)
- **Affinity Matrix** (material-to-material blending preferences)

**Evaluation:**
```
E_blend = ∫ |∇m(x)|² dV
```
Lower energy = smoother gradients.

**Effect on State:**
- Diffuses material concentrations
- Creates transition zones (steel → ceramic → glass)
- **Critical for Grigoriadis's theory** — enables continuous fusion

---

##### **Τέλος Διαφανείας** (Télos Diaphaneías)
*Goal of Transparency / Optical Transmission*

**Function:**
Maximizes light transmission through specified regions.

**Parameters:**
- **Target Transmission Regions** (surfaces or volumes)
- **Optical Coefficient** (per-material)

**Evaluation:**
```
E_optics = -∫ τ(x) · light_path(x) dV
```
Lower energy (negative) = more transparency.

**Effect on State:**
- Attracts glass to optical paths
- Repels opaque materials (metal, ceramic) from view corridors
- Balances with stiffness (glass is weak)

---

##### **Τέλος Ῥοῆς Θερμότητος** (Télos Rhoês Thermótētos)
*Goal of Heat Flow / Thermal Conduction*

**Function:**
Optimizes thermal conductivity paths (heating OR insulation).

**Parameters:**
- **Thermal Source/Sink Regions**
- **Conduction Mode** (maximize or minimize heat transfer)
- **Thermal Conductivity** (per-material)

**Evaluation:**
```
E_thermal = ∫ k(x) · |∇T(x)|² dV
```
Energy depends on mode (conduct vs insulate).

**Effect on State:**
- **Conduction mode:** Attracts metals (high k) to heat paths
- **Insulation mode:** Attracts ceramics (low k) to barriers

---

#### 5. BUDGET (Computational Governance)
**Type:** Configuration Object  

**Parameters:**
- **Particle Count:**
  - Interactive: 10,000–20,000
  - Bake: 50,000–100,000
- **Field Resolution:**
  - Interactive: 64³ voxels
  - Bake: 128³ voxels
- **Iterations:**
  - Interactive: Continuous (30 FPS target)
  - Bake: Fixed count (1000–10,000)
- **Convergence Threshold:** Energy change < ε
- **Extraction Cadence:** Every N iterations (default 10)

---

### OUTPUT PORTS

#### 1. MATERIAL PARTICLES
**Type:** Point Cloud with Attributes  
**Data Schema:**
```javascript
{
  position: [x, y, z],
  radius: r,
  materials: {
    "Steel": 0.6,
    "Ceramic": 0.3,
    "Glass": 0.1
  }
}
```
**Purpose:** True internal state; can be visualized as colored particles

---

#### 2. MATERIAL FIELD (Lazy-Evaluated)
**Type:** Voxel Grid  
**Channels:** One per material (0–1 concentration)  
**Purpose:** Volumetric representation for field-based operations

---

#### 3. GEOMETRY PREVIEW
**Type:** Mesh  
**Extraction Methods:**
- **Isosurface:** Single-material threshold (Marching Cubes)
- **Graded Mesh:** Vertex colors encode material concentrations
- **Multi-Material Lattice:** Strut-based representation

**Material Attributes on Vertices/Faces:**
```javascript
{
  vertex: {
    Steel: 0.6,
    Ceramic: 0.3,
    Glass: 0.1
  }
}
```
**This geometry is NEVER edited directly — it is regenerated each iteration.**

---

#### 4. HISTORY (Telemetry)
**Type:** Time Series Data  
**Channels:**
- Energy per Τέλος (stiffness, mass, blend, optics, thermal)
- Total energy
- Convergence rate (dE/dt)
- Particle stats (min/max material concentrations)

**Purpose:** Debug, visualize convergence, assess goal balance

---

#### 5. BEST STATE
**Type:** Frozen Particle State  
**Purpose:** Snapshot of lowest-energy configuration encountered  
**Behavior:** Updates only when total energy decreases

---

## III. COMPUTATIONAL ARCHITECTURE

### Layer 1: Input Assembly

**Geometry Preprocessing:**
1. Convert DOMAIN to implicit SDF representation
2. Sample MATERIALS geometries → extract centroids + volumes
3. Convert SEEDS to particle nucleation positions
4. Validate goal node connections

**Material Initialization:**
```javascript
// For each assigned material geometry:
const particleCount = Math.floor(volume / targetDensity);
const particles = sampleGeometry(geometry, particleCount);
particles.forEach(p => {
  p.materials[materialName] = 1.0; // Pure concentration
});
```

---

### Layer 2: State Representation

**Particle System:**
```javascript
class Particle {
  position: vec3;
  radius: float;
  materials: Map<string, float>; // Material → concentration
  velocity: vec3;                // For iteration dynamics
}
```

**Field Extraction (On-Demand):**
```javascript
// Voxelize particles into grid
for (let voxel of grid) {
  const influences = particles.filter(p => 
    distance(p.position, voxel.center) < p.radius * 2
  );
  voxel.materials = blendInfluences(influences);
}
```

---

### Layer 3: Iteration Mechanism

**NOT "Evolution" — Use "Iteration"**

**Single Iteration Step:**
```javascript
function iterate(state, goals, domain) {
  // 1. Enforce spatial constraints
  confineParticlesToDomain(state.particles, domain);
  
  // 2. Evaluate all goal energies
  const energies = goals.map(g => g.evaluate(state));
  
  // 3. Compute material redistribution forces
  const forces = goals.map(g => g.proposeForces(state));
  
  // 4. Apply blending (Τέλος Κράσεως)
  diffuseMaterialConcentrations(state.particles);
  
  // 5. Move particles based on combined forces
  applyForces(state.particles, forces);
  
  // 6. Normalize material concentrations
  state.particles.forEach(p => normalizeMaterials(p));
  
  // 7. Record metrics
  state.history.push({
    iteration: state.iteration,
    energies: energies,
    totalEnergy: sum(energies)
  });
  
  // 8. Check convergence
  if (converged(state.history)) {
    state.status = "CONVERGED";
  }
  
  state.iteration++;
}
```

**Iteration Logic per Goal:**

**Stiffness (Τέλος Σκληρότητος):**
```javascript
// Attract high-stiffness materials to high-stress regions
const stressField = computeFEMApprox(particles);
particles.forEach(p => {
  const localStress = stressField.sample(p.position);
  p.materials.Steel += localStress * dt * goalWeight;
  p.materials.Glass -= localStress * dt * goalWeight;
});
```

**Minimum Mass (Τέλος Ἐλαχίστου Ὄγκου):**
```javascript
// Erode low-density regions
particles.forEach(p => {
  const localDensity = averageDensity(p.materials);
  if (localDensity < threshold && !criticalRegion(p)) {
    p.materials *= 0.99; // Gradual erosion
  }
});
```

**Blending (Τέλος Κράσεως):**
```javascript
// Diffuse material concentrations between neighbors
particles.forEach(p => {
  const neighbors = findNeighbors(p, radius * 2);
  neighbors.forEach(n => {
    const blend = diffusivity * dt;
    p.materials = lerp(p.materials, n.materials, blend);
  });
});
```

**Transparency (Τέλος Διαφανείας):**
```javascript
// Attract glass to optical paths
const lightPaths = raytrace(targetRegions);
particles.forEach(p => {
  if (intersectsLightPath(p, lightPaths)) {
    p.materials.Glass += opticalWeight * dt;
    p.materials.Metal -= opticalWeight * dt;
  }
});
```

**Thermal (Τέλος Ῥοῆς Θερμότητος):**
```javascript
// Conduct or insulate based on mode
const thermalField = solveHeatEquation(sources, sinks);
particles.forEach(p => {
  const localGradient = thermalField.gradient(p.position);
  if (conductMode) {
    p.materials.Metal += magnitude(localGradient) * dt;
  } else {
    p.materials.Ceramic += magnitude(localGradient) * dt;
  }
});
```

---

### Layer 4: Geometry Extraction

**Extraction is LAZY and ON-DEMAND.**

**Method 1: Density Isosurface**
```javascript
// Convert particles → field → mesh
const field = voxelizeParticles(particles, resolution);
const densityChannel = field.sumAllMaterials();
const mesh = marchingCubes(densityChannel, isovalue);
// Attribute materials to mesh vertices
mesh.vertices.forEach(v => {
  v.materials = field.sample(v.position);
});
```

**Method 2: Multi-Material Isosurfaces**
```javascript
// Extract separate surfaces per material
materials.forEach(mat => {
  const channel = field.channels[mat];
  const mesh = marchingCubes(channel, threshold);
  mesh.material = mat;
});
```

**Method 3: Graded Lattice**
```javascript
// Create strut-based representation
const lattice = voronoiLattice(particles);
lattice.struts.forEach(s => {
  s.radius = interpolate(s.p1.radius, s.p2.radius);
  s.materials = blend(s.p1.materials, s.p2.materials);
});
```

---

## IV. GOAL NODE IMPLEMENTATION SPECS

Each Τέλος node outputs a **GoalTerm object**:

```typescript
interface GoalTerm {
  identity: {
    name: string;        // "Τέλος Σκληρότητος"
    id: string;          // "goal_stiffness_001"
  };
  weight: number;        // 0–1 influence
  evaluate: (state: SolverState) => number;  // Returns energy
  propose: (state: SolverState) => ForceField; // Optional guidance
}
```

**Example: Τέλος Σκληρότητος Node**
```javascript
class TélosSklērótētosNode extends GoalNode {
  inputs = {
    loadVectors: GeometryPort,
    stiffnessWeight: NumberPort,
    structuralPenalty: NumberPort
  };
  
  outputs = {
    goalTerm: GoalTermPort
  };
  
  compute() {
    return {
      identity: {
        name: "Τέλος Σκληρότητος",
        id: this.id
      },
      weight: this.inputs.stiffnessWeight.value,
      
      evaluate: (state) => {
        // Simplified FEM-like compliance calculation
        const compliance = computeCompliance(
          state.particles,
          this.inputs.loadVectors.value
        );
        return compliance * this.inputs.structuralPenalty.value;
      },
      
      propose: (state) => {
        // Heuristic: high stress → high stiffness material
        const stressField = estimateStress(
          state.particles,
          this.inputs.loadVectors.value
        );
        return {
          field: stressField,
          materialGradient: {
            Steel: 1.0,   // Attract steel to high stress
            Glass: -1.0   // Repel glass from high stress
          }
        };
      }
    };
  }
}
```

---

## V. SOLVER ENGINE PSEUDOCODE

```javascript
class EpilýtēsChēmeíasSolver {
  constructor(inputs) {
    this.domain = inputs.domain;
    this.materials = inputs.materials;
    this.seeds = inputs.seeds;
    this.goals = inputs.goals;
    this.budget = inputs.budget;
    
    this.state = this.initializeState();
    this.worker = null; // Web Worker for async computation
  }
  
  initializeState() {
    const particles = this.generateInitialParticles();
    return {
      particles: particles,
      iteration: 0,
      history: [],
      bestState: null,
      bestEnergy: Infinity,
      status: "INITIALIZING"
    };
  }
  
  generateInitialParticles() {
    const particles = [];
    
    // For each material assignment
    this.materials.forEach(assignment => {
      const { geometry, material } = assignment;
      const volume = computeVolume(geometry);
      const count = Math.floor(volume / this.budget.particleDensity);
      
      const samples = poissonDiskSample(geometry, count);
      samples.forEach(pos => {
        particles.push({
          position: pos,
          radius: this.budget.particleRadius,
          materials: { [material.name]: 1.0 },
          velocity: [0, 0, 0]
        });
      });
    });
    
    // Apply seeds as biasing
    if (this.seeds) {
      this.seeds.forEach(seed => {
        const nearby = particles.filter(p => 
          distance(p.position, seed.position) < seed.influenceRadius
        );
        nearby.forEach(p => {
          p.materials[seed.material] = Math.max(
            p.materials[seed.material] || 0,
            seed.strength
          );
        });
      });
    }
    
    return particles;
  }
  
  startInteractive() {
    this.state.status = "RUNNING_INTERACTIVE";
    this.worker = new Worker("solver_worker.js");
    
    this.worker.postMessage({
      command: "START_INTERACTIVE",
      state: this.state,
      goals: this.goals,
      domain: this.domain,
      budget: this.budget
    });
    
    this.worker.onmessage = (e) => {
      if (e.data.type === "ITERATION_COMPLETE") {
        this.state = e.data.state;
        this.updateOutputs();
      }
    };
  }
  
  ontologize() { // "Bake" renamed to "Ontologize"
    this.state.status = "ONTOLOGIZING";
    
    return new Promise((resolve) => {
      this.worker.postMessage({
        command: "ONTOLOGIZE",
        state: this.state,
        goals: this.goals,
        domain: this.domain,
        budget: {
          ...this.budget,
          maxIterations: 10000,
          particleCount: 100000,
          fieldResolution: 128
        }
      });
      
      this.worker.onmessage = (e) => {
        if (e.data.type === "ONTOLOGIZE_COMPLETE") {
          this.state = e.data.state;
          resolve(this.state);
        }
      };
    });
  }
  
  updateOutputs() {
    // Output 1: Particle cloud
    this.outputs.materialParticles.set(this.state.particles);
    
    // Output 2: Field (lazy)
    if (this.outputs.materialField.isConnected()) {
      const field = this.voxelizeParticles();
      this.outputs.materialField.set(field);
    }
    
    // Output 3: Geometry preview
    if (this.state.iteration % this.budget.extractionCadence === 0) {
      const mesh = this.extractGeometry();
      this.outputs.geometryPreview.set(mesh);
    }
    
    // Output 4: History
    this.outputs.history.set(this.state.history);
    
    // Output 5: Best state
    if (this.state.totalEnergy < this.state.bestEnergy) {
      this.state.bestState = cloneState(this.state);
      this.state.bestEnergy = this.state.totalEnergy;
    }
    this.outputs.bestState.set(this.state.bestState);
  }
  
  voxelizeParticles() {
    const res = this.budget.fieldResolution;
    const grid = new Float32Array(res * res * res * this.materials.length);
    
    this.state.particles.forEach(p => {
      const voxel = worldToVoxel(p.position, res);
      const idx = voxelIndex(voxel, res);
      
      Object.entries(p.materials).forEach(([mat, conc]) => {
        const matIdx = this.materials.indexOf(mat);
        grid[idx * this.materials.length + matIdx] += conc * kernelWeight(p);
      });
    });
    
    return grid;
  }
  
  extractGeometry() {
    const field = this.voxelizeParticles();
    
    // Method: Graded mesh with vertex materials
    const densityChannel = this.sumMaterialChannels(field);
    const mesh = marchingCubes(densityChannel, 0.5);
    
    // Attribute materials to vertices
    mesh.vertices.forEach(v => {
      const voxel = worldToVoxel(v.position, this.budget.fieldResolution);
      v.materials = this.sampleFieldAtVoxel(field, voxel);
    });
    
    return mesh;
  }
}
```

---

## VI. MANUAL VERIFICATION & ACCEPTANCE CRITERIA

### Test Case 1: Steel Beam with Glass Window
**Setup:**
- Domain: Box (1m × 1m × 1m)
- Materials:
  - Steel → Beam geometry (0.8m × 0.1m × 0.1m)
  - Glass → Window geometry (0.2m × 0.2m × 0.01m)
- Goals:
  - Τέλος Σκληρότητος (weight 0.7, vertical load)
  - Τέλος Κράσεως (weight 0.5)
  - Τέλος Διαφανείας (weight 0.3, window region)

**Expected Outcome:**
- Steel concentrates along load path (beam axis)
- Glass remains in window region
- Smooth gradient at beam-window interface (not sharp boundary)
- Geometry extraction shows graded topology

**Acceptance:**
✓ Particle visualization shows material clustering  
✓ History shows decreasing total energy  
✓ Extracted mesh has vertex material attributes  
✓ No particles outside domain

---

### Test Case 2: Thermal Barrier (Ceramic Facade)
**Setup:**
- Domain: Wall panel (1m × 2m × 0.1m)
- Materials:
  - Metal → Interior layer
  - Ceramic → Exterior layer
- Goals:
  - Τέλος Ῥοῆς Θερμότητος (weight 0.8, insulation mode)
  - Τέλος Κράσεως (weight 0.4)

**Expected Outcome:**
- Metal on interior side (thermal mass)
- Ceramic on exterior side (insulation)
- Gradient in between (0.05m transition zone)

**Acceptance:**
✓ Temperature simulation shows reduced heat transfer  
✓ Material field shows smooth gradient  
✓ No pure ceramic on interior / no pure metal on exterior

---

### Test Case 3: Multi-Goal Conflict Resolution
**Setup:**
- Domain: Curtain wall mullion (Grigoriadis case study)
- Materials:
  - Steel → Frame
  - Ceramic (Alumina) → Transition
  - Glass → Glazing
- Goals:
  - Τέλος Σκληρότητος (weight 0.6, wind load)
  - Τέλος Διαφανείας (weight 0.4, view corridor)
  - Τέλος Ἐλαχίστου Ὄγκου (weight 0.3)
  - Τέλος Κράσεως (weight 0.5)

**Expected Outcome:**
- Steel at frame perimeter (stiffness)
- Glass in center (transparency)
- Ceramic gradient between (compromise)
- Reduced mass in non-critical regions

**Acceptance:**
✓ Energy balance: stiffness vs transparency tradeoff visible in history  
✓ No abrupt material boundaries  
✓ Extracted geometry is fabrication-feasible (gradual transitions)  
✓ Matches Grigoriadis's research outputs (steel → alumina → glass gradient)

---

## VII. UI INTEGRATION (SECONDARY — OPTIONAL)

### Solver Popup Interface

**Tabs:**
1. **Setup**
   - Material assignments (right-click port UI)
   - Goal weights (sliders)
   - Budget settings (interactive vs ontologize)

2. **Iteration View**
   - Real-time particle visualization (WebGL)
   - Energy plot (history graph)
   - Material concentration legend

3. **Export**
   - Save state (JSON)
   - Export geometry (OBJ with vertex colors)
   - Export history (CSV)
   - Screenshot (PNG)

**Interaction:**
- Pause/Resume button
- Reset to initial state
- "Ontologize" button (bake to high resolution)

---

## VIII. ROSLYN INTEGRATION ("ONTOLOGIZE")

**"Ontologize" = Bake to Final Geometry**

**Process:**
1. User clicks "Ontologize" on solver node
2. Solver runs high-resolution iteration (100k particles, 128³ field)
3. Convergence detected (energy plateau)
4. Geometry extracted with material attributes
5. **Output connects to Roslyn node** for C# code generation

**Roslyn Output Format:**
```csharp
// Generated C# geometry with graded materials
public class GradedMullion : IGradedGeometry {
  public Mesh Geometry { get; set; }
  public Dictionary<int, MaterialBlend> VertexMaterials { get; set; }
  
  public class MaterialBlend {
    public float Steel { get; set; }
    public float Ceramic { get; set; }
    public float Glass { get; set; }
  }
}
```

---

## IX. COMPUTATIONAL GOVERNANCE

### Absolute Constraints
1. **Asynchronous Execution:** Solver runs in Web Worker (non-blocking)
2. **Memory Bounds:** Max 500MB particle data
3. **Iteration Throttling:** Interactive mode ≤ 30 FPS
4. **Cancellation:** User can stop at any iteration
5. **No Unbounded Growth:** Particle count fixed after initialization

### Default Budgets
| Mode          | Particles | Field Res | Iterations | Extraction |
|---------------|-----------|-----------|------------|------------|
| Interactive   | 10k       | 64³       | ∞          | Every 10   |
| Ontologize    | 100k      | 128³      | 10,000     | Final only |

---

## X. IMPLEMENTATION ROADMAP

### Phase 1: Core Engine (Week 1-2)
**Deliverables:**
- Particle system initialization
- Domain constraint enforcement
- Basic iteration loop (no goals yet)
- Particle → field conversion
- Simple isosurface extraction

**Acceptance Test:**
- Particles stay inside domain
- Field voxelization produces valid grid
- Mesh extraction generates closed surface

---

### Phase 2: Goal Nodes (Week 3-4)
**Deliverables:**
- Τέλος Σκληρότητος (stiffness)
- Τέλος Κράσεως (blending — **critical**)
- Τέλος Ἐλαχίστου Ὄγκου (minimum mass)

**Acceptance Test:**
- Stiffness goal attracts steel to load path
- Blending goal smooths material gradients
- Mass goal erodes non-critical regions
- Combined goals produce reasonable tradeoff

---

### Phase 3: Advanced Goals (Week 5)
**Deliverables:**
- Τέλος Διαφανείας (transparency)
- Τέλος Ῥοῆς Θερμότητος (thermal)

**Acceptance Test:**
- Transparency goal attracts glass to view corridors
- Thermal goal creates insulation or conduction paths

---

### Phase 4: Geometry Extraction (Week 6)
**Deliverables:**
- Graded mesh with vertex materials
- Multi-material isosurfaces
- Lattice extraction (optional)

**Acceptance Test:**
- Extracted geometry has material attributes
- Geometry updates during iteration
- Ontologize produces high-quality final mesh

---

### Phase 5: UI & Roslyn Integration (Week 7-8)
**Deliverables:**
- Solver popup interface
- Material assignment UI (right-click port)
- History visualization
- Roslyn output format

**Acceptance Test:**
- User can assign materials to geometry
- History graph shows convergence
- Ontologized geometry exports to Roslyn

---

## XI. CRITICAL REMINDERS

### Theoretical Alignment (Grigoriadis)
1. **Material behavior precedes form** — never optimize geometry directly
2. **Simulation creates gradients** — avoid explicit material assignment
3. **Goals compete** — energy balances multiple objectives
4. **Continuous fusion** — no sharp boundaries unless structurally necessary
5. **Fabrication-aware** — gradients must be physically realizable

### Naming Consistency
- **Solver:** Ἐπιλύτης Χημείας (never abbreviated)
- **Goals:** Always prefix "Τέλος" (Télos)
- **Process:** "Iteration" (never "evolution")
- **Bake:** "Ontologize" (never "bake")

### Computational Integrity
- **No magic:** All material redistribution must be energetically justified
- **No cheating:** Cannot directly paint materials onto geometry
- **No shortcuts:** Geometry extraction happens AFTER iteration converges
- **No violations:** Particles cannot escape domain

---

## XII. FINAL DEFINITION

**Ἐπιλύτης Χημείας is a transmutation engine.**

It does not:
- Generate shapes
- Optimize topology
- Model geometry

It does:
- Simulate material blending based on physical properties
- Resolve competing energetic goals
- Produce functionally graded composites as emergent phenomena

**Design emerges because energy resolves.**

---

## XIII. EXAMPLE WORKFLOW (USER PERSPECTIVE)

1. **Create Domain:**
   - Add Box node → Ἐπιλύτης Χημείας.DOMAIN

2. **Assign Materials:**
   - Create geometries: Beam (steel), Facade (ceramic), Window (glass)
   - Right-click MATERIALS port → Select geometries → Assign materials

3. **Add Goals:**
   - Τέλος Σκληρότητος → set load vectors → weight 0.7
   - Τέλος Κράσεως → weight 0.5 (always recommended)
   - Τέλος Διαφανείας → select window region → weight 0.3

4. **Configure Budget:**
   - Interactive mode: 10k particles, 64³ field
   - Click "Start"

5. **Observe Iteration:**
   - Watch particles redistribute
   - View energy plot (decreasing = converging)
   - Preview extracted geometry

6. **Ontologize:**
   - When satisfied, click "Ontologize"
   - Solver bakes high-resolution state (100k particles)
   - Final geometry output → Roslyn node

7. **Export:**
   - Roslyn generates C# code for fabrication
   - OBJ file with vertex material attributes
   - PNG render of graded result

---

## XIV. REFERENCES

**Primary Source:**
Grigoriadis, K. (2019). "Computational blends: the epistemology of designing with functionally graded materials." *The Journal of Architecture*, 24(2), 158-182.

**Key Concepts:**
- Functionally graded materials (FGM) fuse sub-materials continuously without mechanical connections
- CFD simulations emulate material fusion based on physical properties
- Particle systems simulate material behavior (diffusivity, affinity)
- Design workflow: material selection → simulation setup → gradient emergence → fabrication

**Architectural Context:**
- AA / EmTech lineage (material-driven computation)
- Unitized curtain wall mullions (steel-alumina-glass)
- 3D-printed multi-material composites
- Post-discrete tectonic systems

---

## Integration and Validation Addendum

### Proposed Integration Points

- Add a solver node entry in `client/src/workflow/nodeRegistry.ts` (category: Solver).
- Implement solver execution in `client/src/workflow/nodes/solver` or a dedicated worker module if runtime is heavy.
- Surface extraction and gradient visualization should plug into `client/src/webgl` with per-vertex material weights.

### Output Contract

- Material field (particles or voxel grid) with per-material weights that sum to 1.0.
- Derived isosurface meshes tagged with dominant material and blend metadata.
- Solver metrics: iteration count, energy terms, and convergence residuals.

### Validation Checklist

- Energy terms move toward convergence for each enabled goal.
- Material weights remain normalized and clamped to [0, 1].
- Domain constraints enforce particle containment and boundary conditions.

---

## END OF IMPLEMENTATION PLAN

**Document Version:** 1.0  
**Date:** 2026-01-29  
**Author:** Systems Design / Numerica Architecture Team  
**Review Status:** Ready for Development

---

*"In the new landscape of part-less FGM constructs, materially-oriented design and the generative emergence of material gradients take precedence over current, form-biased approaches."*  
— Kostas Grigoriadis
