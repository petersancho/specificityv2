# Numerica Solvers & Optimization Guide

Updated: 2026-01-29

This guide explains Numerica’s solver architecture, goal nodes, and step‑by‑step workflows for the **Biological**, **Chemistry**, and **Voxel** systems. It is designed to teach new users how to build solver graphs that actually converge.

---

## 1) Solver Pattern (Mental Model)

Solvers are **iterative** nodes. They don’t compute a direct answer; they search for one.

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

## 2) Biological Solver (Branching Growth)

Node: **Ἐπιλύτης Βιολογίας** (`biologicalSolver`)

**Purpose**: Evolutionary search over vector genomes with a fast fitness proxy. Useful for pattern growth, branching structures, and exploratory form finding.

### Core Concepts

- **Genome**: vector of parameters (slider‑like genes).
- **Phenotype**: geometry produced by a genome.
- **Fitness**: numeric score used to rank genomes.

### Key Goal Nodes

- **Genome Collector** (`genomeCollector`) — collects slider values into a genome.
- **Geometry Phenotype** (`geometryPhenotype`) — defines geometry outputs to treat as phenotype.
- **Performs Fitness** (`performsFitness`) — combines metric values into a fitness spec.
- **Growth / Nutrient / Morphogenesis / Homeostasis Goals** (`growthGoal`, `nutrientGoal`, `morphogenesisGoal`, `homeostasisGoal`).

### Step‑by‑Step: Minimal Evolution Graph

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

### Example Workflow: “Maximize Height, Minimize Material”

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

## 3) Chemistry Solver (Material Transmutation)

Node: **Ἐπιλύτης Χημείας** (`chemistrySolver`)

**Purpose**: Material blending + graded composites over a domain using goals such as stiffness, mass, transparency, and thermal flow.

### Inputs (key ports)

- **Domain** (geometry, required): the spatial region for material distribution.
- **Materials** (any, multi): material assignments or geometry IDs.
- **Materials Text** (string): optional JSON / line‑based assignments.
- **Seeds** (geometry): nucleation points/curves/surfaces.
- **Goals** (goal, multi): chemistry goals.

### Chemistry Goal Nodes

- **Material Goal** (`chemistryMaterialGoal`) — defines initial material assignments.
- **Stiffness Goal** (`chemistryStiffnessGoal`) — pushes stiff materials into load zones.
- **Mass Goal** (`chemistryMassGoal`) — minimize density/mass in target regions.
- **Blend Goal** (`chemistryBlendGoal`) — enforce smooth gradients.
- **Transparency Goal** (`chemistryTransparencyGoal`) — maximize transmission.
- **Thermal Goal** (`chemistryThermalGoal`) — balance heat flow.

### Step‑by‑Step: Basic Blend

```
Geometry Reference (domain) → Chemistry Solver
Material Goal → Chemistry Solver
Blend Goal → Chemistry Solver
```

- Assign initial materials using `Material Goal` (per geometry or list).
- Use `Blend Goal` with a medium smoothness factor.
- Preview geometry via a Geometry Viewer node.

### Example Workflow: Glass‑to‑Ceramic Gradient

```
Domain → Chemistry Solver
Glass assignment → Material Goal → Chemistry Solver
Ceramic assignment → Material Goal → Chemistry Solver
Blend Goal (high smoothness) → Chemistry Solver
Transparency Goal → Chemistry Solver
```

### Compute Budget Modes

Use smaller particle counts / lower resolution for interactive exploration.
Switch to higher resolution for final “bake” outputs.

### Common Pitfalls

- Missing materials: solver runs with empty material list.
- Goals with incompatible weights: result dominated by a single goal.
- Seeds outside the domain: no effect.

---

## 4) Voxel System

Voxel nodes turn geometry into discrete grids for analysis or optimization.

### Core Nodes

- **Voxelize Geometry** (`voxelizeGeometry`)
- **Extract Isosurface** (`extractIsosurface`)
- **Topology Solver** (`topologySolver`) / **Voxel Solver** (`voxelSolver`)
- **Topology Optimize** (`topologyOptimize`)

### Mesh ↔ Voxel Workflow

```
Geometry Reference → Voxelize Geometry → Topology Solver → Extract Isosurface → Mesh Output
```

### Typical Pitfalls

- Resolution too high → memory/CPU spikes.
- Low resolution → aliasing and blocky surfaces.
- Bounds mismatch → geometry appears cropped.

---

## 5) Solver Diagnostics & Convergence

Most solvers output:

- **Status**: `complete`, `error`, or `running`.
- **Iterations**: number of steps performed.
- **Best Score / Objective / Constraint**: optimization metrics.

If a solver fails:

1. Check goal wiring.
2. Check domain or geometry validity.
3. Reduce resolution and re‑run.

---

## 6) ASCII Diagrams (Quick Reference)

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

