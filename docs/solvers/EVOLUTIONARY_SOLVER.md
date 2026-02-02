# Evolutionary Solver (Ἐπιλύτης Ἐξελικτικός)

## Identity

**Greek Name:** Ἐπιλύτης Ἐξελικτικός (Epilýtēs Exeliktikos)  
**English Name:** Evolutionary Solver  
**Romanization:** Epilytes Exeliktikos  
**Named After:** Charles Darwin (naturalist, evolutionary theory, 1809-1882)  
**Ontological Type:** Evolutionary Optimization  
**Has Simulator:** ✅ Yes (genetic algorithm simulation with dashboard)

---

## Purpose

The Evolutionary Solver runs genetic algorithm-based optimization through generations of populations to find optimized geometry configurations. It uses fitness functions to converge on optimal geometric variants by simulating natural selection, crossover, and mutation.

---

## Semantic Operations

### Primary Operation

- **`solver.evolutionary`** - Main solver operation

### Simulator Operations (Internal)

- `simulator.initialize` - Initialize population with random genomes
- `simulator.step` - Execute one generation (selection, crossover, mutation)
- `simulator.converge` - Check fitness convergence
- `simulator.finalize` - Extract best individual

---

## Simulator Dashboard

The Evolutionary Solver has a three-page simulator dashboard:

### Setup Page
- Configure population size, generations, mutation rate, crossover rate
- Define parameter ranges (sliders, sizes, transformation ranges)
- Select fitness function (minimize area, maximize volume, etc.)
- Choose selection, crossover, and mutation methods

### Simulator Page
- Watch generations evolve in real-time
- View fitness graph (best and average fitness over generations)
- See animation through geometric possibilities
- Monitor convergence status
- Pause/resume/stop controls

### Output Page
- View optimized geometry variants for each generation
- Export best individual
- Export all individuals
- View Pareto front (if multi-objective)

---

## Goal Nodes

The Evolutionary Solver uses fitness functions directly. Future goal nodes may include:

- **GeometryGoal** - Optimize geometric properties (area, volume, surface area)
- **PerformanceGoal** - Optimize performance metrics (stress, weight)
- **ConstraintGoal** - Enforce constraints (min/max dimensions)
- **MultiObjectiveGoal** - Pareto optimization with multiple objectives

---

## Mathematical Foundation

### Genetic Algorithm

The Evolutionary Solver implements a standard genetic algorithm:

**Algorithm:**
```
1. Initialize population with random genomes
2. Evaluate fitness for each individual
3. While not converged:
   a. Select parents (tournament, roulette, or rank selection)
   b. Create offspring (crossover)
   c. Mutate offspring
   d. Evaluate fitness
   e. Replace population (with elitism)
4. Return best individual
```

### Selection Operators

| Method | Description |
|--------|-------------|
| **Tournament** | Select best from random subset (tournament size = 3) |
| **Roulette** | Probability proportional to fitness (lower = better) |
| **Rank** | Probability proportional to rank (best = highest rank) |

### Crossover Operators

| Method | Description |
|--------|-------------|
| **Single-Point** | Split at random point, swap tails |
| **Two-Point** | Split at two points, swap middle |
| **Uniform** | Each gene from random parent (50/50) |
| **Arithmetic** | Weighted average of parents (α * p1 + (1-α) * p2) |

### Mutation Operators

| Method | Description |
|--------|-------------|
| **Gaussian** | Add Gaussian noise (σ = 10% of range) |
| **Uniform** | Replace with random value in range |
| **Creep** | Add small delta (±5% of range) |

### Fitness Functions

| Function | Description |
|----------|-------------|
| **minimize-area** | Minimize sum of squared parameters |
| **maximize-volume** | Maximize product of parameters |
| **minimize-surface-area** | Minimize sum of absolute parameters |

---

## Implementation Details

### Genome Representation

```typescript
interface EvolutionaryGenome {
  parameters: Record<string, number>;  // Parameter values to optimize
  fitness?: number;                     // Evaluated fitness value
}
```

### Population Structure

```typescript
interface EvolutionaryPopulation {
  individuals: EvolutionaryGenome[];   // All individuals in generation
  generation: number;                   // Current generation number
  bestFitness: number;                  // Best fitness in generation
  averageFitness: number;               // Average fitness in generation
  bestIndividual: EvolutionaryGenome;   // Best individual in generation
}
```

### Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| populationSize | number | 50 | 10-200 | Individuals per generation |
| generations | number | 100 | 10-1000 | Maximum generations |
| mutationRate | number | 0.1 | 0-1 | Probability of mutation |
| crossoverRate | number | 0.8 | 0-1 | Probability of crossover |
| elitismCount | number | 2 | 0-10 | Best individuals to preserve |
| selectionMethod | string | "tournament" | tournament/roulette/rank | Parent selection |
| crossoverMethod | string | "single-point" | single-point/two-point/uniform/arithmetic | Crossover operator |
| mutationMethod | string | "gaussian" | gaussian/uniform/creep | Mutation operator |
| fitnessFunction | string | "minimize-area" | minimize-area/maximize-volume/minimize-surface-area | Optimization objective |
| convergenceTolerance | number | 1e-6 | 1e-10 to 1e-2 | Convergence threshold |
| seed | number | 42 | 0-999999 | Random seed |

---

## Computation Pipeline

```
Input Geometry
     ↓
Define Parameter Ranges
     ↓
Initialize Population (random genomes)
     ↓
┌─────────────────────────────────────┐
│ For each generation:                │
│   1. Evaluate fitness               │
│   2. Select parents                 │
│   3. Crossover                      │
│   4. Mutate                         │
│   5. Check convergence              │
└─────────────────────────────────────┘
     ↓
Best Individual (optimized parameters)
     ↓
Generate Optimized Geometry
     ↓
Output Geometry with Metadata
```

---

## Semantic Chain

```
User Interaction (UI)
       ↓
   Command (Roslyn)
       ↓
   EvolutionarySolver Node
       ↓
   solver.evolutionary (semantic)
       ↓
   simulator.initialize → simulator.step → simulator.converge → simulator.finalize
       ↓
   Genetic Algorithm (kernel)
       ↓
   Optimized Geometry (output)
       ↓
   Rendered Result (pixels)
```

---

## Test Rig Examples

### Example 1: Parameter Optimization

**Objective:** Minimize surface area while maintaining volume

**Setup:**
- Input: Box geometry
- Parameters: width [0.1, 10], height [0.1, 10], depth [0.1, 10]
- Fitness: minimize-surface-area
- Population: 50, Generations: 100

**Expected Result:** Cube-like geometry (equal dimensions minimize surface area for given volume)

### Example 2: Geometry Optimization

**Objective:** Maximize structural strength

**Setup:**
- Input: Beam geometry
- Parameters: cross-section dimensions, material distribution
- Fitness: custom (stress analysis)
- Population: 100, Generations: 200

**Expected Result:** I-beam or similar optimized cross-section

### Example 3: Multi-Objective Optimization

**Objective:** Pareto front of weight vs. strength

**Setup:**
- Input: Truss geometry
- Parameters: member sizes, topology
- Fitness: multi-objective (weight, strength)
- Population: 200, Generations: 500

**Expected Result:** Pareto front of optimal trade-offs

---

## Performance Benchmarks

| Population | Generations | Parameters | Time (approx) |
|------------|-------------|------------|---------------|
| 50 | 100 | 3 | ~100ms |
| 100 | 200 | 5 | ~500ms |
| 200 | 500 | 10 | ~2s |
| 500 | 1000 | 20 | ~10s |

---

## Historical Context

The Evolutionary Solver is named after **Charles Darwin** (1809-1882), the English naturalist who developed the theory of evolution by natural selection. His work "On the Origin of Species" (1859) established the scientific foundation for understanding how populations evolve over generations through selection, variation, and inheritance.

The genetic algorithm, invented by John Holland in the 1960s, applies Darwin's principles to optimization problems:
- **Selection** → Survival of the fittest
- **Crossover** → Sexual reproduction
- **Mutation** → Random variation
- **Fitness** → Adaptation to environment

---

## Future Enhancements

1. **Custom Fitness Functions** - User-defined fitness expressions
2. **Multi-Objective Optimization** - Pareto front visualization
3. **Adaptive Parameters** - Self-tuning mutation/crossover rates
4. **Island Model** - Parallel populations with migration
5. **Constraint Handling** - Penalty functions, repair operators
6. **Real Geometry Evaluation** - Actual geometric property measurement

---

**Status:** ✅ Complete  
**Semantic Operation:** `solver.evolutionary`  
**Node Type:** `evolutionarySolver`  
**Validation:** ✅ Passing
