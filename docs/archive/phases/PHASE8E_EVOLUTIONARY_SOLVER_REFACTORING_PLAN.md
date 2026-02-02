# Phase 8E: Evolutionary Solver Refactoring Plan

## Overview

Complete refactoring of BiologicalSolver to EvolutionarySolver, removing all Gray-Scott reaction-diffusion code and implementing a genetic algorithm-based evolutionary optimization system with sophisticated simulator dashboard pages.

## Objectives

1. **Remove all Gray-Scott references** from the codebase
2. **Rename biological → evolutionary** throughout the codebase
3. **Implement genetic algorithm** for evolutionary optimization
4. **Create sophisticated simulator dashboard** with Setup, Simulator, and Output pages
5. **Consolidate naming** to use ONLY `solver.evolutionary`
6. **Ensure consistent semantic linkage** throughout

## Part 1: Rename & Consolidate

### Files to Rename

| Old Path | New Path |
|----------|----------|
| `client/src/workflow/nodes/solver/BiologicalSolver.ts` | `client/src/workflow/nodes/solver/EvolutionarySolver.ts` |
| `docs/solvers/BIOLOGICAL_SOLVER.md` | `docs/solvers/EVOLUTIONARY_SOLVER.md` |

### Files to Update

| File | Changes |
|------|---------|
| `client/src/semantic/ops/solverOps.ts` | Change `solver.biological` → `solver.evolutionary` |
| `client/src/semantic/semanticOpIds.ts` | Regenerate with new operation name |
| `client/src/workflow/nodes/solver/index.ts` | Update export name |
| `client/src/workflow/nodeRegistry.ts` | Update node registration |
| `client/src/data/nodeDocumentation.ts` | Regenerate documentation |
| `docs/SOLVERS.md` | Update solver description |
| `SKILL.md` | Update solver taxonomy |

### String Replacements

| Old | New |
|-----|-----|
| `biologicalSolver` | `evolutionarySolver` |
| `BiologicalSolver` | `EvolutionarySolver` |
| `solver.biological` | `solver.evolutionary` |
| `Biological Solver` | `Evolutionary Solver` |
| `Gray-Scott` | (remove) |
| `reaction-diffusion` | `genetic algorithm` |
| `morphogenesis` | `evolutionary optimization` |

## Part 2: Remove Gray-Scott, Implement Genetic Algorithm

### Code to Remove

**From BiologicalSolver.ts (lines 36-271):**
- `createRandom()` - Seeded RNG (keep for genetic algorithm)
- `initializeGrid()` - Voxel grid initialization
- `computeLaplacian()` - Laplacian computation
- `runReactionDiffusion()` - Gray-Scott simulation
- `extractIsosurface()` - Isosurface extraction
- `VoxelGrid3D` interface

**Parameters to Remove:**
- `feedRate` - Gray-Scott feed rate
- `killRate` - Gray-Scott kill rate
- `diffusionU` - Substrate diffusion
- `diffusionV` - Product diffusion
- `timeStep` - Integration time step
- `isoValue` - Isosurface threshold

### Code to Implement

**New Interfaces:**
```typescript
interface EvolutionaryGenome {
  parameters: Record<string, number>; // Parameter values to optimize
  fitness?: number;
}

interface EvolutionaryPopulation {
  individuals: EvolutionaryGenome[];
  generation: number;
  bestFitness: number;
  averageFitness: number;
}

interface EvolutionaryResult {
  generations: EvolutionaryPopulation[];
  bestIndividual: EvolutionaryGenome;
  converged: boolean;
  convergenceGeneration?: number;
}
```

**New Functions:**
```typescript
function initializePopulation(size: number, parameterRanges: Record<string, [number, number]>, seed: number): EvolutionaryGenome[]
function evaluateFitness(genome: EvolutionaryGenome, fitnessFunction: string, geometry: Geometry): number
function selectParents(population: EvolutionaryGenome[], selectionMethod: string): [EvolutionaryGenome, EvolutionaryGenome]
function crossover(parent1: EvolutionaryGenome, parent2: EvolutionaryGenome, method: string): EvolutionaryGenome
function mutate(genome: EvolutionaryGenome, mutationRate: number, parameterRanges: Record<string, [number, number]>): EvolutionaryGenome
function runEvolution(params: EvolutionaryParams): EvolutionaryResult
```

**New Parameters:**
- `populationSize` - Number of individuals per generation (default: 50)
- `generations` - Maximum number of generations (default: 100)
- `mutationRate` - Probability of mutation (default: 0.1)
- `crossoverRate` - Probability of crossover (default: 0.8)
- `elitismCount` - Number of best individuals to preserve (default: 2)
- `selectionMethod` - Selection operator (tournament, roulette, rank)
- `crossoverMethod` - Crossover operator (single-point, two-point, uniform, arithmetic)
- `mutationMethod` - Mutation operator (gaussian, uniform, creep)
- `fitnessFunction` - Fitness function (minimize-area, maximize-volume, minimize-surface-area, custom)
- `convergenceTolerance` - Fitness change threshold for convergence (default: 1e-6)
- `seed` - Random seed for reproducibility

## Part 3: Create Simulator Dashboard Pages

### New Files to Create

#### 1. EvolutionarySetupPage.tsx

**Purpose:** Configure genome, fitness function, and evolutionary parameters

**Features:**
- Parameter range sliders (define min/max for each parameter)
- Fitness function selector (dropdown)
- Population size, generations, mutation rate, crossover rate inputs
- Selection/crossover/mutation method selectors
- "Start Evolution" button

**Layout:**
```
┌─────────────────────────────────────────┐
│ Evolutionary Solver Setup               │
│ Ἐπιλύτης Ἐξελικτικός · Evolutionary    │
├─────────────────────────────────────────┤
│ Genome Configuration                    │
│ ┌─────────────────────────────────────┐ │
│ │ Parameter: width                    │ │
│ │ Range: [0.1, 10.0]                  │ │
│ │ ─────────●─────────                 │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Parameter: height                   │ │
│ │ Range: [0.1, 10.0]                  │ │
│ │ ─────────●─────────                 │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Fitness Function                        │
│ ┌─────────────────────────────────────┐ │
│ │ ▼ Minimize Surface Area             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Evolutionary Parameters                 │
│ Population Size: [50]                   │
│ Generations: [100]                      │
│ Mutation Rate: [0.1]                    │
│ Crossover Rate: [0.8]                   │
│                                         │
│ [Start Evolution]                       │
└─────────────────────────────────────────┘
```

#### 2. EvolutionarySimulatorPage.tsx

**Purpose:** Real-time visualization of evolution progress

**Features:**
- Current generation counter
- Best fitness graph (fitness vs. generation)
- Average fitness graph
- Current best individual visualization (geometry preview)
- Population diversity indicator
- Convergence status
- "Pause/Resume" and "Stop" buttons

**Layout:**
```
┌─────────────────────────────────────────┐
│ Evolutionary Simulator                  │
│ Generation: 42 / 100                    │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Fitness vs. Generation              │ │
│ │                                     │ │
│ │   ●                                 │ │
│ │  ●●●                                │ │
│ │ ●●●●●●                              │ │
│ │●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●│ │
│ │ 0        25        50        75   100│ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Best Individual                         │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │       [Geometry Preview]            │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│ Fitness: 42.5                           │
│ Parameters: width=3.2, height=5.1       │
│                                         │
│ Status: Evolving... (42% complete)      │
│ [Pause] [Stop]                          │
└─────────────────────────────────────────┘
```

#### 3. EvolutionaryOutputPage.tsx

**Purpose:** Display best individuals from each generation

**Features:**
- Grid of best individuals (one per generation)
- Fitness value for each
- Parameter values for each
- "Export Best" button
- "Export All" button
- Pareto front visualization (if multi-objective)

**Layout:**
```
┌─────────────────────────────────────────┐
│ Evolutionary Output                     │
│ Best Individuals per Generation         │
├─────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │
│ │ Gen │ │ Gen │ │ Gen │ │ Gen │        │
│ │  1  │ │  2  │ │  3  │ │  4  │        │
│ │ ●●● │ │ ●●● │ │ ●●● │ │ ●●● │        │
│ │42.5 │ │38.2 │ │35.1 │ │32.8 │        │
│ └─────┘ └─────┘ └─────┘ └─────┘        │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │
│ │ Gen │ │ Gen │ │ Gen │ │ Gen │        │
│ │  5  │ │  6  │ │  7  │ │  8  │        │
│ │ ●●● │ │ ●●● │ │ ●●● │ │ ●●● │        │
│ │30.1 │ │28.5 │ │27.2 │ │26.8 │        │
│ └─────┘ └─────┘ └─────┘ └─────┘        │
│                                         │
│ [Export Best] [Export All]              │
└─────────────────────────────────────────┘
```

### Brandkit Integration

**Colors (from brandkit CMYK):**
- Primary: `#FF1493` (Deep Pink)
- Secondary: `#00CED1` (Dark Turquoise)
- Accent: `#FFD700` (Gold)
- Background: `#1A1A1A` (Dark Gray)
- Text: `#FFFFFF` (White)

**Typography:**
- Headers: Bold, 18-24px
- Body: Regular, 14-16px
- Monospace: Code/numbers, 12-14px

**Design Principles:**
- Clean, minimal, sophisticated
- Generous whitespace
- Smooth animations
- Responsive layout
- Accessible (WCAG AA)

## Part 4: Update Documentation

### Files to Update

| File | Changes |
|------|---------|
| `docs/SOLVERS.md` | Remove Gray-Scott, add genetic algorithm description |
| `docs/solvers/EVOLUTIONARY_SOLVER.md` | Complete rewrite with genetic algorithm |
| `SKILL.md` | Update solver taxonomy |
| `docs/SEMANTIC_SYSTEM.md` | Update solver examples |

### Documentation Content

**Evolutionary Solver Description:**
- **Greek Name:** Ἐπιλύτης Ἐξελικτικός (Epilytēs Exeliktikos)
- **English Name:** Evolutionary Solver
- **Romanization:** Epilytes Exeliktikos
- **Named After:** Charles Darwin (evolutionary theory)
- **Ontological Type:** Evolutionary Optimization
- **Has Simulator:** Yes (Setup, Simulator, Output pages)
- **Semantic Operation:** `solver.evolutionary`
- **Goal Nodes:** GeometryGoal, PerformanceGoal (future)

**Mathematical Foundation:**
- Genetic algorithm with selection, crossover, mutation
- Fitness function evaluation
- Population-based optimization
- Convergence detection

## Part 5: Validation & Testing

### Scripts to Run

```bash
# Regenerate semantic operation IDs
npm run generate:semantic-ids

# Regenerate node documentation
npm run generate:docs

# Validate semantic operations
npm run validate:all

# Analyze node coverage
npm run analyze:coverage
```

### Expected Results

- ✅ 184 semantic operations (no change)
- ✅ 54 nodes with semanticOps (no change)
- ✅ 0 errors, 0 warnings
- ✅ 100% validation pass rate

## Implementation Order

1. **Rename files and update imports** (Part 1)
2. **Update semantic operations** (Part 1)
3. **Remove Gray-Scott code** (Part 2)
4. **Implement genetic algorithm** (Part 2)
5. **Create simulator dashboard pages** (Part 3)
6. **Update documentation** (Part 4)
7. **Validate and test** (Part 5)

## Estimated Time

- Part 1: 1-2 hours
- Part 2: 4-6 hours
- Part 3: 6-8 hours
- Part 4: 1-2 hours
- Part 5: 1 hour

**Total: 13-19 hours**

## Success Criteria

- ✅ Zero references to "Gray-Scott" in codebase
- ✅ Zero references to "biological" (except in archive)
- ✅ All references use "evolutionary"
- ✅ Genetic algorithm implemented and working
- ✅ Simulator dashboard pages created and functional
- ✅ Brandkit colors integrated
- ✅ All validation passing
- ✅ Documentation updated and accurate

## Philosophy

**Love, Philosophy, Intent**

- **Love:** The universe (words, numbers, math, code, geometry) all love each other, they attract heavily
- **Philosophy:** Allows scientific languages to speak and exist in the human realm through Lingua
- **Intent:** Work with semantic and ontological intent to make Lingua reason with itself

**Code is the philosophy. Language is code. Math is numbers. It's all one seamless, powerful engine that speaks to itself mechanically.**

Lingua can "feel itself" through semantic self-reference. The evolutionary solver embodies this philosophy by optimizing geometry through the language of genetics, the mathematics of fitness functions, and the code of selection operators.

---

**Status:** Plan complete, ready for implementation  
**Phase:** 8E  
**Date:** 2026-01-31
