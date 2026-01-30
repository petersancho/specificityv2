# Biological Solver Architectural Project: Pavilion Canopy Optimization

## Project Intent

**Design Brief:** A parametric pavilion canopy structure for an outdoor performance space. The canopy must:

- Provide adequate overhead coverage (maximize usable shaded area)
- Minimize material usage for sustainable construction
- Achieve structural depth variation for visual interest and rainwater drainage
- Maintain overall dimensional constraints suitable for the site

The evolutionary solver will explore the parametric space to find canopy configurations that balance coverage performance against material efficiency—producing designs that are both functional and resource-conscious.

---

## 1. The Genome: Slider Parameters

The genome consists of **5 slider-based genes** that define the canopy's parametric variation:

| Gene (Slider)      | Min  | Max  | Step | Description                                      |
|--------------------|------|------|------|--------------------------------------------------|
| `canopyWidth`      | 6.0  | 14.0 | 0.5  | Overall width of the canopy (meters)             |
| `canopyDepth`      | 4.0  | 10.0 | 0.5  | Overall depth of the canopy (meters)             |
| `peakHeight`       | 2.5  | 5.0  | 0.1  | Height at the highest point (meters)             |
| `edgeDrop`         | 0.3  | 1.5  | 0.1  | Vertical drop from peak to edges (meters)        |
| `subdivisions`     | 2    | 6    | 1    | Panel subdivision count (discrete, affects mass) |

These sliders feed into the **Genome Collector** node, which aggregates them into a genome specification for the solver.

---

## 2. The Phenotype: Geometry Generation

The **Geometry Phenotype** node captures the geometry produced by the parametric graph:

**Geometry Pipeline:**
```
Sliders → Rectangle (canopyWidth × canopyDepth)
       → Subdivide Surface (subdivisions × subdivisions)
       → Move Vertices (center vertex up by peakHeight, edges down by edgeDrop)
       → Mesh Surface → Geometry Phenotype
```

The phenotype produces a warped rectangular mesh canopy that:
- Has variable footprint dimensions (width × depth)
- Features a raised center peak for visual prominence and drainage
- Has lowered edges creating a saddle-like or umbrella profile
- Contains more or fewer panels based on subdivision count

Each genome vector evaluated by the solver produces a unique canopy phenotype through this geometry chain.

---

## 3. Fitness: Metric Nodes

The **Performs Fitness** node aggregates two key metrics:

### Metric 1: Covered Area (Maximize)
- **Source Node:** `Measurement` node set to "Area" property
- **Input:** The canopy surface geometry
- **Mode:** Maximize
- **Weight:** 1.0
- **Rationale:** Larger covered area provides more shade and usable space

### Metric 2: Material Volume (Minimize)
- **Source Node:** `Measurement` node set to "Volume" property (approximates material mass)
- **Input:** Extruded canopy panels (thickness × area gives volume proxy)
- **Mode:** Minimize
- **Weight:** 0.7
- **Rationale:** Less material reduces cost, weight, and environmental impact

**Fitness Function:**
```
fitness = (normalizedArea × 1.0) - (normalizedVolume × 0.7)
```

The solver will find canopy designs with maximum area but minimum material—favoring thin, wide canopies over thick, small ones.

---

## 4. Optional Biology Goals

**Connected Goals:**

| Goal Node           | Purpose                                    | Weight |
|---------------------|-------------------------------------------|--------|
| `morphogenesisGoal` | Shape the canopy panel distribution pattern| 0.6    |
| `homeostasisGoal`   | Prevent extreme parameter combinations     | 0.4    |

### Morphogenesis Goal
- **Branching Factor:** 0.5 (moderate pattern variation)
- **Pattern Scale:** 1.0 (standard distribution)
- **Anisotropy:** 0.2 (slight directional bias toward depth for drainage)
- **Why:** Encourages the solver to explore varied panel arrangements while maintaining organic coherence

### Homeostasis Goal
- **Stability Target:** 0.7 (favor stable configurations)
- **Damping:** 0.5 (moderate resistance to radical changes)
- **Stress Limit:** 1.5 (allow some structural variation)
- **Why:** Penalizes extreme genomes that produce impractical designs (e.g., very tall and narrow, or excessively subdivided)

**Not Connected:**
- `growthGoal`: Not needed—canopy is a static structure, not growing biomass
- `nutrientGoal`: Not relevant—no nutrient flow simulation required

---

## 5. Solver Settings

| Parameter        | Value | Rationale                                         |
|------------------|-------|---------------------------------------------------|
| Population Size  | 32    | Sufficient diversity without excessive computation|
| Generations      | 24    | Allows convergence while remaining interactive    |
| Mutation Rate    | 0.18  | Moderate exploration/exploitation balance         |
| Seed             | 42    | Reproducible results for documentation            |

These defaults provide a balance between exploration (finding novel solutions) and convergence (refining good solutions).

---

## 6. Outputs: Reading Results

After the solver completes, read these output ports:

| Output Port   | Type   | Interpretation                                          |
|---------------|--------|--------------------------------------------------------|
| `bestScore`   | number | Highest fitness achieved (area/material ratio)         |
| `bestGenome`  | vector | Gene values for the optimal canopy                     |
| `evaluations` | number | Total fitness evaluations performed                    |
| `status`      | string | Solver state: `"complete"`, `"running"`, or `"error"` |

**Applying the Best Genome:**
The `bestGenome` vector contains the optimal slider values in order:
```
[canopyWidth, canopyDepth, peakHeight, edgeDrop, subdivisions]
```
Apply these values back to the original sliders to regenerate the winning design.

---

## 7. Wiring List

```
Slider(canopyWidth) ─┐
Slider(canopyDepth) ─┼─→ Genome Collector ─────────→ Biological Solver
Slider(peakHeight) ──┤
Slider(edgeDrop) ────┤
Slider(subdivisions)─┘

Measurement(area) ───┬─→ Performs Fitness ─────────→ Biological Solver
Measurement(volume) ─┘

Mesh Surface ────────→ Geometry Phenotype ─────────→ Biological Solver

morphogenesisGoal ───┬─→ Biological Solver (goals input)
homeostasisGoal ─────┘
```

**Connection Summary:**
- **Slider(s) → Genome Collector → Biological Solver**
- **Metric(s) → Performs Fitness → Biological Solver**
- **Geometry Phenotype → Biological Solver**
- **Optional biology goals → Biological Solver**

---

## 8. Expected Results

After 24 generations with population 32:

- **Best Score:** ~0.72–0.85 (normalized fitness)
- **Evaluations:** ~768 (32 × 24)
- **Status:** `"complete"`
- **Best Genome Example:** `[12.5, 8.0, 3.2, 0.8, 3]`
  - Wide canopy (12.5m) with moderate depth (8.0m)
  - Moderate peak height (3.2m) with gentle edge drop (0.8m)
  - Medium subdivision (3×3 panels) balancing aesthetics and material

The evolved canopy achieves a large footprint while keeping material volume low through the optimized curvature profile.

---

## Summary

This architectural project demonstrates the Biological Solver's capability to explore parametric design spaces for real-world applications. By defining:

1. **Genome** (slider parameters for canopy dimensions)
2. **Phenotype** (parametric mesh geometry)
3. **Fitness** (area vs. material metrics)
4. **Biology goals** (morphogenesis for pattern, homeostasis for stability)
5. **Solver settings** (population, generations, mutation, seed)

...the designer obtains an evolved optimal canopy design without manually testing hundreds of parameter combinations. The solver's evolutionary pressure naturally discovers efficient solutions.
