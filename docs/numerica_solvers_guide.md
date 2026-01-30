# Numerica Solvers & Optimization Guide

Updated: 2026-01-30

This guide explains Numerica's solver architecture, goal nodes, and step-by-step workflows for the **Physics**, **Biological**, **Chemistry**, and **Voxel** systems. It is designed to teach new users how to build solver graphs that actually converge.

---

## 1) Solver Pattern (Mental Model)

Solvers are **iterative** nodes. They don't compute a direct answer; they search for one.

A solver graph always looks like:

```
Goal Node(s) → Solver → Geometry / Result / Diagnostics
```

- **Solver node**: controls iteration limits, convergence criteria, and runtime settings.
- **Goal nodes**: define constraints, objectives, or fitness measures.
- **Outputs**: geometry, scalar metrics, and detailed diagnostics.

### Goal node wiring rules

- Goals must match their solver family (physics goals → physics solver).
- Solver inputs allow **multiple goal connections**.
- Use weights to express priority among goals.

---

## 2) Physics Solver (Structural Equilibrium)

Node: **Ἐπιλύτης Φυσικῆς** (`physicsSolver`)

**Purpose**: Computes physical equilibrium states for structural systems using finite element analysis (Kd = F). Useful for structural optimization, load analysis, and deformation visualization.

### Core Concepts

- **Base Mesh**: The structural geometry to analyze.
- **Goals**: Constraints (anchors, loads) and objectives (stiffness, volume).
- **Equilibrium**: The solver finds displacement field that satisfies Kd = F.

### Key Goal Nodes

| Node | Type | Purpose |
|------|------|---------|
| **Anchor Goal** (`anchorGoal`) Ἄγκυρα | Required | Defines fixed boundary conditions (supports). |
| **Load Goal** (`loadGoal`) Βάρος | Optional | Applies external forces to the structure. |
| **Volume Goal** (`volumeGoal`) Ὄγκος | Conditional | Constrains material volume. Required when using Load Goal. |
| **Stiffness Goal** (`stiffnessGoal`) Σκληρότης | Optional | Defines material stiffness properties (E, ν). |

### Solver Parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `analysisType` | static | static/dynamic/modal | Analysis mode. |
| `maxIterations` | 1000 | 10-10000 | Maximum solver iterations. |
| `convergenceTolerance` | 1e-6 | 1e-12 to 1e-2 | Convergence threshold. |
| `maxDeformation` | 10 | 0.1-100 | Safety limit for displacement. |
| `maxStress` | 1e9 | 1e6-1e12 | Safety limit for stress (Pa). |
| `useGPU` | true | - | Enable GPU acceleration. |
| `chunkSize` | 1000 | 100-10000 | Chunk size for parallel processing. |
| `timeStep` | 0.01 | 0.001-1 | Time step for dynamic analysis. |
| `animationFrames` | 60 | 10-300 | Frames for dynamic/modal output. |

### Solver Outputs

| Output | Type | Description |
|--------|------|-------------|
| `geometry` | geometry | Deformed geometry ID. |
| `mesh` | any | Deformed mesh data. |
| `result` | solverResult | Full solver result payload. |
| `stressField` | any | Per-element stress values. |
| `displacements` | any | Per-vertex displacement vectors. |
| `diagnostics` | any | Convergence, timing, warnings. |
| `animation` | animation | Animation frames (dynamic/modal only). |

### Step-by-Step: Static Analysis

1) **Reference geometry**:
```
Geometry Reference (mesh) → Physics Solver [baseMesh]
```

2) **Add Anchor Goal** (required):
```
Anchor Goal → Physics Solver [goals]
```
Set `anchorType` to `fixed`, `pinned`, or `roller`. Provide vertex indices to anchor.

3) **Add Load Goal** (optional):
```
Load Goal → Physics Solver [goals]
```
Set force vector and application points.

4) **Add Volume Goal** (required with Load):
```
Volume Goal → Physics Solver [goals]
```
Set material density (e.g., 7850 kg/m³ for steel).

5) **Add Stiffness Goal** (optional):
```
Stiffness Goal → Physics Solver [goals]
```
Set Young's Modulus (e.g., 200e9 Pa for steel) and Poisson ratio (e.g., 0.3).

6) **Preview result**:
```
Physics Solver → Geometry Viewer
```

### Example Workflow: Cantilevered Canopy

```
Geometry Reference (canopy mesh)
       ↓
    baseMesh
       ↓
┌─────────────────────────────────────┐
│         Physics Solver              │
│  Ἐπιλύτης Φυσικῆς                  │
│                                     │
│  analysisType: static               │
│  maxIterations: 1000                │
│  convergenceTolerance: 1e-6         │
└─────────────────────────────────────┘
       ↑ goals
       │
  ┌────┴────┬────────────┬───────────┐
  │         │            │           │
Anchor   Load        Volume     Stiffness
 Goal    Goal         Goal        Goal
  │         │            │           │
 wall   gravity     7850 kg/m³   E=200 GPa
supports -5000N Z    (steel)      ν=0.3
```

### Validation Rules

- **At least one Anchor goal is required** — solver fails without boundary conditions.
- **Volume goal required with Load goal** — ensures physical material exists.
- **Weights range 0-1** — higher weight = higher priority.

### Common Pitfalls

- Missing Anchor goal → "Goal validation failed" error.
- Load without Volume → physically meaningless result.
- Anchor vertices outside mesh → no effect.
- `maxDeformation` too low → solver may not converge to realistic result.

### Test Rig

Right-click in Numerica → "Add Physics Solver Rig" creates a complete cantilevered canopy setup with all goals pre-wired.

---

## 3) Biological Solver (Branching Growth)

Node: **Ἐπιλύτης Βιολογίας** (`biologicalSolver`)

**Purpose**: Evolutionary search over vector genomes with a fast fitness proxy. Useful for pattern growth, branching structures, and exploratory form finding.

### Core Concepts

- **Genome**: vector of parameters (slider-like genes).
- **Phenotype**: geometry produced by a genome.
- **Fitness**: numeric score used to rank genomes.

### Key Goal Nodes

- **Genome Collector** (`genomeCollector`) — collects slider values into a genome.
- **Geometry Phenotype** (`geometryPhenotype`) — defines geometry outputs to treat as phenotype.
- **Performs Fitness** (`performsFitness`) — combines metric values into a fitness spec.
- **Growth / Nutrient / Morphogenesis / Homeostasis Goals** (`growthGoal`, `nutrientGoal`, `morphogenesisGoal`, `homeostasisGoal`).

### Step-by-Step: Minimal Evolution Graph

1) Add sliders and a `Genome Collector`:

```
Slider → Genome Collector
```

2) Add metric nodes and a `Performs Fitness`:

```
Metric → Performs Fitness
```

3) Add `Biological Solver` and wire goals:

```
Genome Collector → Biological Solver
Performs Fitness → Biological Solver
```

4) Set solver parameters:
- Population Size
- Generations
- Mutation Rate
- Seed (for repeatable runs)

5) Run and read outputs:
- `bestScore`, `bestGenome`, `evaluations`, `status`

### Example Workflow: "Maximize Height, Minimize Material"

```
Slider(height) → Genome Collector → Biological Solver
Dimensions(height) → Performs Fitness → Biological Solver
List Sum(materialUsage) → Performs Fitness → Biological Solver
```

- Set `Performs Fitness` default mode = *maximize*.
- For material usage, invert the metric or set mode to *minimize*.

### Common Pitfalls

- Genome has no sliders → solver runs with empty genome.
- Fitness metrics are all zero → no meaningful selection pressure.
- Mutation rate too high → solver never converges.

---

## 4) Chemistry Solver (Material Transmutation)

Node: **Ἐπιλύτης Χημείας** (`chemistrySolver`)

**Purpose**: Functionally graded composite material distribution using particle-based simulation and goal-driven optimization. Creates continuous material gradients (e.g., steel-to-ceramic-to-glass transitions).

### Core Concepts

- **Materials as particles**: Not geometry, but compositional states that blend continuously.
- **Seeds**: Nucleation points where specific materials originate.
- **Diffusion**: Materials spread and mix based on physical properties.
- **Goals as energy**: Competing objectives drive material distribution toward optimal configurations.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| **Domain** | geometry | Watertight boundary for material existence. |
| **Materials** | any (multi) | Material species assignments (Steel, Glass, Ceramic). |
| **Materials Text** | string | JSON material definitions (optional). |
| **Seeds** | geometry | Nucleation sites (points, curves, surfaces). |
| **Goals** | goal (multi) | Chemistry goals defining optimization objectives. |

### Material Properties (per species)

```
{
  name: "Steel",
  density: 7850,           // kg/m³
  stiffness: 200e9,        // Pa (Young's modulus)
  thermalConductivity: 50, // W/(m·K)
  opticalTransmission: 0,  // 0=opaque, 1=transparent
  diffusivity: 0.3         // Blending coefficient
}
```

### Chemistry Goal Nodes

| Node | Greek | Purpose |
|------|-------|---------|
| **Stiffness Goal** | Τέλος Σκληρότητος | Drive stiff materials to load paths. |
| **Mass Goal** | Τέλος Ἐλαχίστου Ὄγκου | Minimize material density/volume. |
| **Blend Goal** | Τέλος Ὁμαλότητος | Enforce smooth material gradients. |
| **Transparency Goal** | Τέλος Διαφανείας | Maximize optical transmission. |
| **Thermal Goal** | Τέλος Θερμότητος | Balance heat flow through gradients. |

### Solver Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `particleCount` | 10000 | Resolution (higher = finer gradients). |
| `iterations` | 100 | Diffusion steps per solve. |
| `diffusionRate` | 0.1 | Global blending speed. |
| `convergenceTolerance` | 1e-4 | Energy change threshold. |

### Step-by-Step: Curtain Wall Mullion Gradient

1) **Define domain** (closed mesh of mullion shape):
```
Geometry Reference (mullion) → Chemistry Solver [domain]
```

2) **Assign materials** via Material Goal:
```
Material Goal (Steel at core) → Chemistry Solver [goals]
Material Goal (Ceramic at middle) → Chemistry Solver [goals]
Material Goal (Glass at exterior) → Chemistry Solver [goals]
```

3) **Add optimization goals**:
```
Stiffness Goal (weight 0.4) → Chemistry Solver [goals]
Blend Goal (smoothness 0.8) → Chemistry Solver [goals]
Transparency Goal (weight 0.3, exterior region) → Chemistry Solver [goals]
```

4) **Preview result**:
```
Chemistry Solver → Geometry Viewer
```

### Example: Steel-to-Ceramic-to-Glass Gradient

```
Domain (mullion mesh)
       ↓
Chemistry Solver ← Steel Material (core seeds)
       ↓          ← Ceramic Material (intermediate)
       ↓          ← Glass Material (exterior seeds)
       ↓          ← Stiffness Goal
       ↓          ← Blend Goal
       ↓          ← Transparency Goal
Geometry Viewer (gradient visualization)
```

### Compute Budget Modes

- **Interactive** (particleCount < 5000): Real-time feedback, coarse gradients.
- **Draft** (particleCount ~20000): Visible gradient quality, ~5-10s solve.
- **Final** (particleCount > 50000): Publication-quality gradients, minutes to solve.

### Common Pitfalls

- Missing materials → solver runs with no compositional data.
- Goals with incompatible weights → result dominated by single objective.
- Seeds outside the domain → no material nucleation.
- Domain not watertight → particles escape, unpredictable results.
- Diffusivity too high → materials blend to uniform gray.

---

## 5) Voxel System

Voxel nodes turn geometry into discrete grids for analysis or optimization.

### Core Nodes

- **Voxelize Geometry** (`voxelizeGeometry`)
- **Extract Isosurface** (`extractIsosurface`)
- **Topology Solver** (`topologySolver`) / **Voxel Solver** (`voxelSolver`)
- **Topology Optimize** (`topologyOptimize`)

### Mesh to Voxel Workflow

```
Geometry Reference → Voxelize Geometry → Topology Solver → Extract Isosurface → Mesh Output
```

### Typical Pitfalls

- Resolution too high → memory/CPU spikes.
- Low resolution → aliasing and blocky surfaces.
- Bounds mismatch → geometry appears cropped.

---

## 6) Solver Diagnostics & Convergence

Most solvers output:

- **Status**: `complete`, `error`, or `running`.
- **Iterations**: number of steps performed.
- **Best Score / Objective / Constraint**: optimization metrics.

If a solver fails:

1. Check goal wiring.
2. Check domain or geometry validity.
3. Reduce resolution and re-run.

---

## 7) ASCII Diagrams (Quick Reference)

### Physics Solver

```
Geometry Reference (mesh)
       ↓
Physics Solver ← Anchor Goal (required)
       ↓       ← Load Goal
       ↓       ← Volume Goal
       ↓       ← Stiffness Goal
Geometry Viewer
```

### Biological Evolution

```
Slider(s)
   ↓
Genome Collector → Biological Solver → bestScore / bestGenome
   ↑
Performs Fitness ← Metric Nodes
```

### Chemistry Solver

```
Domain → Chemistry Solver → Geometry
Materials → Material Goal → Chemistry Solver
Blend / Mass / Stiffness / Thermal Goals → Chemistry Solver
```

### Voxel Flow

```
Geometry → Voxelize → Voxel Solver → Extract Isosurface → Mesh
```
