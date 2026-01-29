# BIOLOGICAL SOLVER 2
## Evolutionary Algorithm Node — Implementation Plan

**Interactive Genetic Algorithm for Generative Design**  
*Genome → Geometry → Performance-based evolution*

---

## THEORETICAL FOUNDATION

This solver implements Interactive Evolutionary Algorithms (IEAs) that allow designers to engage with evolutionary development directly, inspired by **Grasshopper Biomorpher** (John Harding & Cecilie Brandt-Olsen, UWE Bristol) and Richard Dawkins' Biomorphs from The Blind Watchmaker (1986).

**Core Principles:**
1. **Genome defines parameters** — numeric values that can vary (genes)
2. **Geometry is phenotype** — the visual/spatial manifestation of the genome
3. **Performance guides evolution** — metrics drive fitness evaluation
4. **Selection creates pressure** — best individuals breed, worst are eliminated
5. **Iteration produces generations** — repeated cycles improve population

**Key Distinction from Optimization:**
- Traditional solvers (Galapagos, Octopus) use **objective functions** to reach a single optimal solution
- Biological Solver 2 uses **evolutionary pressure** to explore a **population of solutions**
- Result: 10+ generations of variants, not a single answer

**Biomorpher Mental Model:**
Genome (parameters tweaked during evolution), Geometry (phenotype generated from parameters), and Performance (optional fitness metrics)

---

## I. SYSTEM OVERVIEW

### What Biological Solver 2 Is NOT:
- A brute-force enumerator
- A gradient-descent optimizer
- A single-solution finder
- A static parameter explorer

### What Biological Solver 2 IS:
- An evolutionary population manager
- A multi-generational variant generator
- A fitness-guided search engine
- A design exploration assistant

### Computational Paradigm:
Genomes (parameter sets) → Phenotypes (geometry instances) → Fitness evaluation → Selection → Reproduction (crossover + mutation) → Next generation

---

## II. NODE SPECIFICATION

### NODE IDENTITY
**Name:** Biological Solver 2 *(suffix .2 to distinguish from legacy version)*  
**Display Name:** Biological Solver 2  
**Category:** Solvers  
**Icon:** DNA helix or evolution tree symbol  
**Activation:** Double-right-click opens popup panel

---

### INPUT PORTS (Required Semantic Contracts)

#### 1. GENOME (Required)
**Type:** Genome Specification  
**Source:** GOAL_GENOME_COLLECTOR node  
**Semantic Contract:** Defines the parameter space to explore

**Genome Structure:**
```javascript
{
  genes: [
    {
      id: "slider_001",
      name: "Height",
      min: 0,
      max: 100,
      step: 1,
      currentValue: 50,
      type: "continuous" // or "discrete"
    },
    {
      id: "slider_002",
      name: "Width",
      min: 10,
      max: 50,
      step: 0.5,
      currentValue: 25,
      type: "continuous"
    }
    // ... more genes
  ],
  encode: (values) => genome,  // Values array → genome string
  decode: (genome) => values   // Genome string → values array
}
```

**Purpose:**
- Defines which parameters will mutate/crossover
- Establishes valid ranges (min/max/step)
- Provides encoding for genome hashing (cache lookups)

---

#### 2. GEOMETRY (Required)
**Type:** Geometry Build Function  
**Source:** GOAL_GEOMETRY_PHENOTYPE node  
**Semantic Contract:** Defines how to instantiate geometry from a genome

**Geometry Specification:**
```javascript
{
  build: (genomeValues) => {
    // Apply genome values to graph
    // Trigger recalculation
    // Return resulting geometry
    return {
      meshes: [...],
      curves: [...],
      points: [...],
      metadata: {...}
    };
  },
  dependencies: ["node_id_1", "node_id_2", ...],
  visualizationMode: "mesh" | "wireframe" | "points"
}
```

**Purpose:**
- Enables solver to evaluate each individual's phenotype
- Produces renderable geometry for gallery display
- Provides geometry for performance metric calculations

---

#### 3. PERFORMS (Optional but Strongly Supported)
**Type:** Fitness Specification  
**Source:** GOAL_PERFORMS_FITNESS node  
**Semantic Contract:** Defines objectives to optimize

**Fitness Specification:**
```javascript
{
  metrics: [
    {
      id: "metric_area",
      name: "Surface Area",
      mode: "minimize", // or "maximize"
      weight: 1.0,
      getValue: (geometry) => number
    },
    {
      id: "metric_volume",
      name: "Enclosed Volume",
      mode: "maximize",
      weight: 0.5,
      getValue: (geometry) => number
    }
    // ... up to 8 metrics (Biomorpher cap)
  ],
  evaluate: (geometry) => {
    return {
      totalFitness: number,
      breakdown: {
        metric_area: { value: 150, normalized: 0.8 },
        metric_volume: { value: 2000, normalized: 0.6 }
      }
    };
  }
}
```

**Purpose:**
- Provides objective function for automated evolution
- Displays performance overlays in design gallery
- Enables mixed-mode selection (interactive + performance)

---

### OUTPUT PORTS

#### 1. BEST (Best Individual)
**Type:** Solution Object  
**Data Schema:**
```javascript
{
  genome: [50, 25, 10, ...],      // Gene values
  genomeString: "50-25-10-...",   // Encoded ID
  fitness: 0.85,                   // Total fitness score
  fitnessBreakdown: {              // Per-metric scores
    metric_area: 0.8,
    metric_volume: 0.9
  },
  generation: 7,                   // Which generation produced this
  rank: 1,                         // Rank within generation (1 = best)
  geometryRef: "geom_best_gen7",  // Reference for geometry retrieval
  thumbnail: DataURL              // Base64 PNG for preview
}
```

**Purpose:**
- Provides single best solution found across all generations
- Can be fed to downstream nodes for further processing
- Updates as solver runs (live output)

---

#### 2. POPULATION BESTS (Top-K per Generation)
**Type:** Solution Array  
**Purpose:** Best N individuals from each generation (default top 3)

```javascript
[
  {
    generation: 0,
    individuals: [
      { genome: [...], fitness: 0.85, rank: 1, ... },
      { genome: [...], fitness: 0.82, rank: 2, ... },
      { genome: [...], fitness: 0.78, rank: 3, ... }
    ]
  },
  {
    generation: 1,
    individuals: [...]
  }
  // ... one entry per generation
]
```

---

#### 3. HISTORY (Complete Evolutionary Record)
**Type:** Generational Time Series  

```javascript
{
  generations: [
    {
      id: 0,
      population: [
        { genome: [...], fitness: 0.45, rank: 12, ... },
        // ... all individuals in generation
      ],
      statistics: {
        bestFitness: 0.85,
        meanFitness: 0.52,
        worstFitness: 0.18,
        diversityStdDev: 0.23,  // Genome diversity measure
        evaluationTime: 1250    // ms
      },
      convergenceMetrics: {
        improvementRate: 0.15,   // vs previous generation
        stagnationCount: 0       // Generations without improvement
      }
    }
    // ... one entry per generation
  ],
  config: {
    populationSize: 20,
    mutationRate: 0.1,
    crossoverRate: 0.7,
    elitism: 2,
    selectionMethod: "tournament"
  }
}
```

**Purpose:**
- Powers convergence chart visualization
- Enables post-run analysis
- Supports serialization (save/load evolutionary runs)

---

#### 4. GALLERY (Display References)
**Type:** Gallery Metadata  

```javascript
{
  allIndividuals: [
    {
      id: "ind_gen0_5",
      generation: 0,
      index: 5,
      genome: [...],
      fitness: 0.65,
      fitnessBreakdown: {...},
      thumbnail: DataURL,
      geometryRef: "geom_gen0_5",
      selected: false  // User selection state
    }
    // ... all individuals across all generations
  ],
  byGeneration: {
    0: [ind_gen0_0, ind_gen0_1, ...],
    1: [ind_gen1_0, ind_gen1_1, ...],
    // ... grouped by generation
  },
  bestOverall: "ind_gen7_2",
  userSelections: ["ind_gen3_1", "ind_gen5_8"]  // User-flagged designs
}
```

**Purpose:**
- Provides data for OUTPUTS page gallery grid
- Enables user selection and export
- Stores thumbnails for quick preview

---

## III. GOAL NODES SPECIFICATION

### GOAL NODE 1: GENOME COLLECTOR

**Node Identity:**
- **Name:** Genome Collector
- **Purpose:** Aggregates slider/parameter nodes into a genome specification
- **Icon:** Gene strand or DNA segment

**Input Ports:**
- **Sliders** (variadic): Accepts multiple slider node connections
- **Gene Pools** (optional, future): Discrete value sets

**Output Port:**
- **Genome Spec:** GenomeSpecification object for Biological Solver 2

**Behavior:**
```javascript
class GenomeCollectorNode {
  inputs = {
    sliders: SliderPortArray  // Variadic input
  };
  
  outputs = {
    genomeSpec: GenomeSpecPort
  };
  
  compute() {
    const genes = this.inputs.sliders.map((slider, idx) => ({
      id: slider.nodeId,
      name: slider.label || `Gene ${idx}`,
      min: slider.min,
      max: slider.max,
      step: slider.step || (slider.max - slider.min) / 100,
      currentValue: slider.value,
      type: "continuous"
    }));
    
    return {
      genes: genes,
      encode: (values) => values.join("-"),
      decode: (str) => str.split("-").map(Number)
    };
  }
  
  // Optional: Right-click → "Add Selected Sliders"
  addSelectedSliders() {
    const selected = canvas.getSelectedNodes()
      .filter(n => n.type === "Slider");
    selected.forEach(s => this.connectInput("sliders", s));
  }
}
```

**User Workflow:**
1. Add Genome Collector node to canvas
2. Select all sliders to be evolutionary parameters
3. Right-click Genome Collector → "Add Selected Sliders"
4. Connect Genome Collector output → Biological Solver 2.GENOME input

---

### GOAL NODE 2: GEOMETRY PHENOTYPE

**Node Identity:**
- **Name:** Geometry Phenotype
- **Purpose:** Captures geometry generation logic as a build function
- **Icon:** Wireframe mesh or parametric surface

**Input Port:**
- **Geometry** (variadic): Accepts geometry outputs from graph

**Output Port:**
- **Build Function:** GeometryBuildFunction for solver

**Behavior:**
```javascript
class GeometryPhenotypeNode {
  inputs = {
    geometry: GeometryPortArray  // Variadic
  };
  
  outputs = {
    buildFunction: BuildFunctionPort
  };
  
  compute() {
    // Capture the subgraph that produces this geometry
    const dependencies = this.inputs.geometry
      .flatMap(g => g.getDependencyChain());
    
    return {
      build: (genomeValues) => {
        // Apply genome to sliders
        // Recalculate graph
        // Extract geometry
        return this.evaluateWithGenome(genomeValues);
      },
      dependencies: dependencies,
      visualizationMode: "mesh" // default
    };
  }
  
  evaluateWithGenome(genomeValues) {
    // Implementation: temporarily override slider values,
    // trigger graph recalculation, capture resulting geometry
    const originalValues = this.captureSliderValues();
    this.applyGenomeToSliders(genomeValues);
    const geometry = this.collectGeometry();
    this.restoreSliderValues(originalValues);
    return geometry;
  }
}
```

**User Workflow:**
1. Build parametric geometry graph (mesh, surface, etc.)
2. Add Geometry Phenotype node
3. Connect final geometry outputs → Geometry Phenotype inputs
4. Connect Geometry Phenotype output → Biological Solver 2.GEOMETRY input

---

### GOAL NODE 3: PERFORMS FITNESS

**Node Identity:**
- **Name:** Performs Fitness
- **Purpose:** Collects performance metrics and defines optimization objectives
- **Icon:** Target or fitness graph

**Input Ports:**
- **Metrics** (variadic): Numeric outputs from analysis nodes (area, volume, cost, etc.)

**Configuration per Metric:**
- **Mode:** Minimize or Maximize (dropdown)
- **Weight:** 0.0–1.0 (default 1.0)
- **Display Name:** Custom label

**Output Port:**
- **Fitness Spec:** FitnessSpecification for solver

**Behavior:**
```javascript
class PerformsFitnessNode {
  inputs = {
    metrics: MetricPortArray  // Variadic
  };
  
  // Per-metric configuration
  metricConfigs = {};
  
  outputs = {
    fitnessSpec: FitnessSpecPort
  };
  
  compute() {
    const metrics = this.inputs.metrics.map((metric, idx) => {
      const config = this.metricConfigs[metric.id] || {
        mode: "maximize",
        weight: 1.0,
        name: metric.label || `Metric ${idx}`
      };
      
      return {
        id: metric.id,
        name: config.name,
        mode: config.mode,
        weight: config.weight,
        getValue: (geometry) => metric.compute(geometry)
      };
    });
    
    return {
      metrics: metrics,
      evaluate: (geometry) => {
        const results = metrics.map(m => {
          const value = m.getValue(geometry);
          const normalized = this.normalize(value, m);
          const weighted = normalized * m.weight;
          return { id: m.id, value, normalized, weighted };
        });
        
        const totalFitness = results.reduce(
          (sum, r) => sum + r.weighted, 0
        ) / results.reduce((sum, r) => sum + r.weight, 0);
        
        return {
          totalFitness: totalFitness,
          breakdown: results.reduce((obj, r) => {
            obj[r.id] = { value: r.value, normalized: r.normalized };
            return obj;
          }, {})
        };
      }
    };
  }
  
  normalize(value, metric) {
    // Normalize to 0–1 based on population statistics
    // Implementation depends on historical min/max tracking
    return value; // Placeholder
  }
}
```

**UI Extension (Right-click menu per metric):**
```
Right-click Metric Port:
  ☑ Maximize
  ☐ Minimize
  ─────────
  Weight: [1.0] (slider 0–1)
  Name: [Custom label]
```

**User Workflow:**
1. Build analysis graph (compute area, volume, structural metrics, etc.)
2. Add Performs Fitness node
3. Connect metric outputs → Performs Fitness inputs
4. Right-click each metric → set Maximize/Minimize + Weight
5. Connect Performs Fitness output → Biological Solver 2.PERFORMS input

---

## IV. EVOLUTIONARY ALGORITHM ENGINE

### Core Algorithm Structure

**Genetic Algorithm Loop:**
```
1. Initialize population (random or seeded)
2. Evaluate fitness for all individuals
3. Record statistics
4. Check termination criteria
5. Select parents (tournament, roulette, etc.)
6. Apply crossover to create offspring
7. Apply mutation to offspring
8. Form next generation (offspring + elites)
9. Go to step 2
```

### Population Initialization

**Method 1: Random**
```javascript
function initializeRandomPopulation(genomeSpec, size) {
  const population = [];
  for (let i = 0; i < size; i++) {
    const genome = genomeSpec.genes.map(gene => {
      const range = gene.max - gene.min;
      const value = gene.min + Math.random() * range;
      return roundToStep(value, gene.step);
    });
    population.push({
      genome: genome,
      genomeString: genomeSpec.encode(genome),
      fitness: null,  // Not yet evaluated
      evaluated: false
    });
  }
  return population;
}
```

**Method 2: Seeded from Current State**
```javascript
function initializeSeededPopulation(genomeSpec, size) {
  const population = [];
  
  // First individual = current slider values
  const seed = genomeSpec.genes.map(g => g.currentValue);
  population.push({
    genome: seed,
    genomeString: genomeSpec.encode(seed),
    fitness: null,
    evaluated: false
  });
  
  // Remaining individuals = perturbations of seed
  for (let i = 1; i < size; i++) {
    const perturbed = seed.map((val, idx) => {
      const gene = genomeSpec.genes[idx];
      const perturbation = (Math.random() - 0.5) * (gene.max - gene.min) * 0.2;
      const newVal = clamp(val + perturbation, gene.min, gene.max);
      return roundToStep(newVal, gene.step);
    });
    population.push({
      genome: perturbed,
      genomeString: genomeSpec.encode(perturbed),
      fitness: null,
      evaluated: false
    });
  }
  
  return population;
}
```

---

### Fitness Evaluation

**With Caching (Critical for Performance):**
```javascript
class FitnessCache {
  cache = new Map();  // genomeString → fitness result
  
  async evaluate(individual, buildFunc, fitnessSpec) {
    const { genomeString, genome } = individual;
    
    // Check cache
    if (this.cache.has(genomeString)) {
      return this.cache.get(genomeString);
    }
    
    // Build geometry
    const geometry = await buildFunc.build(genome);
    
    // Evaluate fitness
    const result = fitnessSpec ? 
      fitnessSpec.evaluate(geometry) :
      { totalFitness: 0, breakdown: {} };  // No fitness = interactive only
    
    // Cache result
    this.cache.set(genomeString, result);
    
    return result;
  }
  
  clear() {
    this.cache.clear();
  }
}
```

---

### Selection Strategies

**Tournament Selection (Default):**
```javascript
function tournamentSelection(population, tournamentSize = 3) {
  const tournament = [];
  for (let i = 0; i < tournamentSize; i++) {
    const idx = Math.floor(Math.random() * population.length);
    tournament.push(population[idx]);
  }
  
  // Return fittest individual from tournament
  return tournament.reduce((best, ind) => 
    ind.fitness > best.fitness ? ind : best
  );
}
```

**Roulette Selection (Fitness-proportional):**
```javascript
function rouletteSelection(population) {
  const totalFitness = population.reduce((sum, ind) => sum + ind.fitness, 0);
  const spin = Math.random() * totalFitness;
  
  let cumulative = 0;
  for (const ind of population) {
    cumulative += ind.fitness;
    if (cumulative >= spin) {
      return ind;
    }
  }
  
  return population[population.length - 1];  // Fallback
}
```

**Rank Selection:**
```javascript
function rankSelection(population) {
  const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
  const ranks = sorted.map((_, i) => sorted.length - i);
  const totalRank = ranks.reduce((sum, r) => sum + r, 0);
  
  const spin = Math.random() * totalRank;
  let cumulative = 0;
  for (let i = 0; i < ranks.length; i++) {
    cumulative += ranks[i];
    if (cumulative >= spin) {
      return sorted[i];
    }
  }
  
  return sorted[sorted.length - 1];
}
```

---

### Crossover Operators

**Uniform Crossover:**
```javascript
function uniformCrossover(parent1, parent2, rate = 0.5) {
  const offspring1 = [];
  const offspring2 = [];
  
  for (let i = 0; i < parent1.genome.length; i++) {
    if (Math.random() < rate) {
      offspring1.push(parent1.genome[i]);
      offspring2.push(parent2.genome[i]);
    } else {
      offspring1.push(parent2.genome[i]);
      offspring2.push(parent1.genome[i]);
    }
  }
  
  return [offspring1, offspring2];
}
```

**Single-Point Crossover:**
```javascript
function singlePointCrossover(parent1, parent2) {
  const point = Math.floor(Math.random() * parent1.genome.length);
  
  const offspring1 = [
    ...parent1.genome.slice(0, point),
    ...parent2.genome.slice(point)
  ];
  
  const offspring2 = [
    ...parent2.genome.slice(0, point),
    ...parent1.genome.slice(point)
  ];
  
  return [offspring1, offspring2];
}
```

---

### Mutation Operators

**Gaussian Mutation:**
```javascript
function gaussianMutation(genome, genomeSpec, rate, sigma = 0.1) {
  return genome.map((value, idx) => {
    if (Math.random() > rate) {
      return value;  // No mutation
    }
    
    const gene = genomeSpec.genes[idx];
    const range = gene.max - gene.min;
    const perturbation = gaussian(0, sigma * range);
    const mutated = clamp(value + perturbation, gene.min, gene.max);
    return roundToStep(mutated, gene.step);
  });
}

function gaussian(mean, stdDev) {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * stdDev;
}
```

**Uniform Mutation:**
```javascript
function uniformMutation(genome, genomeSpec, rate) {
  return genome.map((value, idx) => {
    if (Math.random() > rate) {
      return value;
    }
    
    const gene = genomeSpec.genes[idx];
    const newValue = gene.min + Math.random() * (gene.max - gene.min);
    return roundToStep(newValue, gene.step);
  });
}
```

---

### Elitism

**Preserve Best N Individuals:**
```javascript
function applyElitism(currentPopulation, nextPopulation, eliteCount) {
  const sorted = [...currentPopulation].sort((a, b) => b.fitness - a.fitness);
  const elites = sorted.slice(0, eliteCount);
  
  // Replace worst individuals in next population with elites
  const nextSorted = [...nextPopulation].sort((a, b) => a.fitness - b.fitness);
  for (let i = 0; i < eliteCount; i++) {
    nextSorted[i] = elites[i];
  }
  
  return nextSorted;
}
```

---

### Main Evolution Loop

```javascript
class BiologicalSolverEngine {
  constructor(config) {
    this.config = config;
    this.population = null;
    this.generation = 0;
    this.history = [];
    this.fitnessCache = new FitnessCache();
    this.running = false;
  }
  
  async initialize() {
    this.population = this.config.seedFromCurrent ?
      initializeSeededPopulation(this.config.genomeSpec, this.config.populationSize) :
      initializeRandomPopulation(this.config.genomeSpec, this.config.populationSize);
    
    await this.evaluatePopulation();
    this.recordGeneration();
  }
  
  async evaluatePopulation() {
    const evaluations = this.population.map(ind => 
      this.fitnessCache.evaluate(
        ind,
        this.config.buildFunc,
        this.config.fitnessSpec
      )
    );
    
    const results = await Promise.all(evaluations);
    
    this.population.forEach((ind, idx) => {
      ind.fitness = results[idx].totalFitness;
      ind.fitnessBreakdown = results[idx].breakdown;
      ind.evaluated = true;
    });
    
    // Rank population
    this.population.sort((a, b) => b.fitness - a.fitness);
    this.population.forEach((ind, idx) => {
      ind.rank = idx + 1;
    });
  }
  
  recordGeneration() {
    const stats = this.calculateStatistics();
    this.history.push({
      id: this.generation,
      population: this.population.map(ind => ({...ind})),  // Deep copy
      statistics: stats,
      convergenceMetrics: this.calculateConvergence()
    });
  }
  
  calculateStatistics() {
    const fitnesses = this.population.map(ind => ind.fitness);
    return {
      bestFitness: Math.max(...fitnesses),
      meanFitness: fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length,
      worstFitness: Math.min(...fitnesses),
      diversityStdDev: standardDeviation(this.population.map(ind => ind.genome)),
      evaluationTime: 0  // Set during evaluation
    };
  }
  
  calculateConvergence() {
    if (this.history.length < 2) {
      return { improvementRate: 0, stagnationCount: 0 };
    }
    
    const current = this.history[this.history.length - 1].statistics.bestFitness;
    const previous = this.history[this.history.length - 2].statistics.bestFitness;
    const improvementRate = (current - previous) / Math.abs(previous);
    
    // Count stagnation
    let stagnationCount = 0;
    for (let i = this.history.length - 1; i > 0; i--) {
      const diff = Math.abs(
        this.history[i].statistics.bestFitness -
        this.history[i - 1].statistics.bestFitness
      );
      if (diff < 0.001) {  // Threshold for "no improvement"
        stagnationCount++;
      } else {
        break;
      }
    }
    
    return { improvementRate, stagnationCount };
  }
  
  async evolveGeneration() {
    const nextPopulation = [];
    
    // Selection + Reproduction
    while (nextPopulation.length < this.config.populationSize - this.config.elitism) {
      const parent1 = this.selectParent();
      const parent2 = this.selectParent();
      
      // Crossover
      let [offspring1, offspring2] = this.config.crossoverRate > Math.random() ?
        this.applyCrossover(parent1, parent2) :
        [parent1.genome, parent2.genome];
      
      // Mutation
      offspring1 = this.applyMutation(offspring1);
      offspring2 = this.applyMutation(offspring2);
      
      nextPopulation.push({
        genome: offspring1,
        genomeString: this.config.genomeSpec.encode(offspring1),
        fitness: null,
        evaluated: false
      });
      
      if (nextPopulation.length < this.config.populationSize - this.config.elitism) {
        nextPopulation.push({
          genome: offspring2,
          genomeString: this.config.genomeSpec.encode(offspring2),
          fitness: null,
          evaluated: false
        });
      }
    }
    
    // Elitism
    if (this.config.elitism > 0) {
      const elites = this.population.slice(0, this.config.elitism);
      nextPopulation.push(...elites);
    }
    
    // Evaluate new population
    this.population = nextPopulation;
    await this.evaluatePopulation();
    
    // Record
    this.generation++;
    this.recordGeneration();
  }
  
  selectParent() {
    switch (this.config.selectionMethod) {
      case "tournament":
        return tournamentSelection(this.population, this.config.tournamentSize);
      case "roulette":
        return rouletteSelection(this.population);
      case "rank":
        return rankSelection(this.population);
      default:
        return tournamentSelection(this.population, 3);
    }
  }
  
  applyCrossover(parent1, parent2) {
    switch (this.config.crossoverType) {
      case "uniform":
        return uniformCrossover(parent1, parent2, 0.5);
      case "single-point":
        return singlePointCrossover(parent1, parent2);
      default:
        return uniformCrossover(parent1, parent2, 0.5);
    }
  }
  
  applyMutation(genome) {
    switch (this.config.mutationType) {
      case "gaussian":
        return gaussianMutation(genome, this.config.genomeSpec, this.config.mutationRate);
      case "uniform":
        return uniformMutation(genome, this.config.genomeSpec, this.config.mutationRate);
      default:
        return gaussianMutation(genome, this.config.genomeSpec, this.config.mutationRate);
    }
  }
  
  async run(generations) {
    this.running = true;
    for (let i = 0; i < generations && this.running; i++) {
      await this.evolveGeneration();
      // Yield to UI
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    this.running = false;
  }
  
  stop() {
    this.running = false;
  }
  
  reset() {
    this.population = null;
    this.generation = 0;
    this.history = [];
    this.fitnessCache.clear();
    this.running = false;
  }
}
```

---

## V. POPUP PANEL UI (3 PAGES)

### Activation
**Trigger:** Double-right-click Biological Solver 2 node  
**Behavior:** Opens modal popup overlay (non-blocking, resizable)

### Page Navigation
**Options:**
- **Tabs:** Setup | Simulation | Outputs (horizontal tabs at top)
- **Stepper:** 1. Setup → 2. Simulation → 3. Outputs (with prev/next buttons)

**Recommended:** Tabs for non-linear navigation

---

### PAGE 1: SETUP

**Layout:**
```
┌─────────────────────────────────────────┐
│ SETUP                                    │
├─────────────────────────────────────────┤
│                                          │
│ Population Parameters                    │
│ ┌───────────────────────────────────┐   │
│ │ Population Size:    [20]          │   │
│ │   (5 – 100)                       │   │
│ │                                   │   │
│ │ Generations:        [10]          │   │
│ │   (1 – 100)                       │   │
│ └───────────────────────────────────┘   │
│                                          │
│ Genetic Operators                        │
│ ┌───────────────────────────────────┐   │
│ │ Mutation Rate:      [0.10]        │   │
│ │   (0.00 – 1.00)                   │   │
│ │                                   │   │
│ │ Crossover Rate:     [0.70]        │   │
│ │   (0.00 – 1.00)                   │   │
│ │                                   │   │
│ │ Elitism:            [2]           │   │
│ │   (0 – 10)                        │   │
│ └───────────────────────────────────┘   │
│                                          │
│ Selection Strategy                       │
│ ┌───────────────────────────────────┐   │
│ │ Method:  ○ Tournament             │   │
│ │          ○ Roulette               │   │
│ │          ○ Rank                   │   │
│ │                                   │   │
│ │ Tournament Size:    [3]           │   │
│ │   (only if tournament selected)   │   │
│ └───────────────────────────────────┘   │
│                                          │
│ Initialization                           │
│ ┌───────────────────────────────────┐   │
│ │ ○ Random Population               │   │
│ │ ○ Seed from Current Sliders       │   │
│ │                                   │   │
│ │ Random Seed: [optional number]    │   │
│ └───────────────────────────────────┘   │
│                                          │
│              [Cancel]  [Initialize]      │
└─────────────────────────────────────────┘
```

**Fields:**
1. **Population Size:** 5–100 (default 20)
2. **Generations:** 1–100 (default 10)
3. **Mutation Rate:** 0.0–1.0 (default 0.1)
4. **Crossover Rate:** 0.0–1.0 (default 0.7)
5. **Elitism:** 0–10 (default 2)
6. **Selection Method:** Tournament | Roulette | Rank (default Tournament)
7. **Tournament Size:** 2–10 (default 3, only if Tournament selected)
8. **Initialization:** Random | Seeded (default Random)
9. **Random Seed:** Optional number for reproducibility

**Validation:**
- Population Size must be ≥ 5
- Generations must be ≥ 1
- Elitism must be < Population Size
- Tournament Size must be ≤ Population Size

**Actions:**
- **Cancel:** Close popup without initializing
- **Initialize:** Create initial population and go to SIMULATION page

---

### PAGE 2: SIMULATION

**Layout:**
```
┌─────────────────────────────────────────┐
│ SIMULATION                               │
├─────────────────────────────────────────┤
│                                          │
│ ┌──────────── Convergence Chart ─────┐  │
│ │                                     │  │
│ │   Fitness                           │  │
│ │   1.0 ┤                 ●──●──●     │  │
│ │       │             ●──●             │  │
│ │   0.8 ┤         ●──●                 │  │
│ │       │     ●──●                     │  │
│ │   0.6 ┤ ●──●                         │  │
│ │       │                              │  │
│ │   0.4 ┤     ──── Best                │  │
│ │       │     ---- Mean                │  │
│ │   0.2 ┤     ···· Worst               │  │
│ │       │                              │  │
│ │   0.0 └─────┬────┬────┬────┬────    │  │
│ │           Gen 0  2   4   6   8      │  │
│ └─────────────────────────────────────┘  │
│                                          │
│ Current Status                           │
│ ┌───────────────────────────────────┐   │
│ │ Generation: 7 / 10                │   │
│ │ Best Fitness: 0.856               │   │
│ │ Mean Fitness: 0.623               │   │
│ │ Diversity (σ): 0.142              │   │
│ │ Stagnation: 0 generations         │   │
│ └───────────────────────────────────┘   │
│                                          │
│ Run Controls                             │
│ ┌───────────────────────────────────┐   │
│ │ [▶ Run Next Generation]           │   │
│ │                                   │   │
│ │ Run N Generations: [5] [▶ Run]   │   │
│ │   (1 – 100)                       │   │
│ │                                   │   │
│ │ [⏸ Pause]  [⏹ Stop]  [↻ Reset]  │   │
│ └───────────────────────────────────┘   │
│                                          │
│ Progress                                 │
│ ┌───────────────────────────────────┐   │
│ │ Evaluating generation 8...        │   │
│ │ ████████████████░░░░░░  70%       │   │
│ └───────────────────────────────────┘   │
│                                          │
│        [← Setup]  [Outputs →]           │
└─────────────────────────────────────────┘
```

**Convergence Chart Requirements:**
- **X-axis:** Generation number (0 to current)
- **Y-axis:** Fitness (0 to 1, auto-scale if values exceed)
- **Lines:**
  - **Best Fitness** (solid line, primary color)
  - **Mean Fitness** (dashed line, secondary color)
  - **Worst Fitness** (dotted line, tertiary color)
- **Optional:** Diversity metric (std dev of genomes) as background shaded area
- **Interaction:** Hover shows exact values, click generation to jump to that population in OUTPUTS page

**Status Panel:**
- Current generation / total
- Best fitness (overall)
- Mean fitness (current generation)
- Diversity metric
- Stagnation count

**Run Controls:**
1. **Run Next Generation:** Evolve one generation, update chart
2. **Run N Generations:** Input field (1–100) + Run button to evolve multiple generations
3. **Pause:** Stop mid-run (if running N generations)
4. **Stop:** Halt evolution, keep current state
5. **Reset:** Clear all generations, return to Setup (confirm dialog)

**Progress Indicator:**
- Show during multi-generation runs
- Display current action ("Evaluating generation 8...")
- Progress bar (percentage complete)

**Implementation Notes:**
- Use Web Worker for evolution (don't block UI)
- Update chart incrementally (not all at once after N generations)
- Throttle chart redraws to 30 FPS max
- Cache fitness evaluations to speed up re-runs

---

### PAGE 3: OUTPUTS

**Layout:**
```
┌─────────────────────────────────────────┐
│ OUTPUTS                                  │
├─────────────────────────────────────────┤
│                                          │
│ Filter: [All Generations ▼] [Sort: Fitness ▼] │
│                                          │
│ Gallery Grid                             │
│ ┌─────┬─────┬─────┬─────┬─────┐         │
│ │ ☑   │ ☐   │ ☐   │ ☑   │ ☐   │         │
│ │[img]│[img]│[img]│[img]│[img]│         │
│ │Gen 0│Gen 0│Gen 0│Gen 1│Gen 1│         │
│ │Fit: │Fit: │Fit: │Fit: │Fit: │         │
│ │0.82 │0.75 │0.68 │0.89 │0.85 │         │
│ ├─────┼─────┼─────┼─────┼─────┤         │
│ │ ☐   │ ☐   │ ☑   │ ☐   │ ☐   │         │
│ │[img]│[img]│[img]│[img]│[img]│         │
│ │Gen 1│Gen 2│Gen 2│Gen 2│Gen 3│         │
│ │Fit: │Fit: │Fit: │Fit: │Fit: │         │
│ │0.78 │0.91 │0.88 │0.84 │0.93 │         │
│ └─────┴─────┴─────┴─────┴─────┘         │
│                                          │
│ Selection: 3 designs selected            │
│                                          │
│ Export Options                           │
│ ┌───────────────────────────────────┐   │
│ │ [Export Best Overall PNG]         │   │
│ │ [Export Generation Bests PNG]     │   │
│ │ [Export Selected Designs PNG]     │   │
│ │                                   │   │
│ │ Include Metadata: ☑ Gen ☑ Rank   │   │
│ │                   ☑ Fitness       │   │
│ │                   ☐ Sparkline     │   │
│ └───────────────────────────────────┘   │
│                                          │
│ Detail View (click design to expand)     │
│ ┌───────────────────────────────────┐   │
│ │ Generation 2, Rank 1              │   │
│ │ [larger image]                    │   │
│ │                                   │   │
│ │ Fitness: 0.91                     │   │
│ │   Area: 150.2 (0.85)              │   │
│ │   Volume: 2250 (0.92)             │   │
│ │                                   │   │
│ │ Genome: [50, 25.5, 10, 75, ...]  │   │
│ │                                   │   │
│ │ [Apply to Canvas] [Export Solo]  │   │
│ └───────────────────────────────────┘   │
│                                          │
│           [← Simulation]  [Close]        │
└─────────────────────────────────────────┘
```

**Gallery Grid:**
- Display all individuals from all generations as thumbnail cards
- Each card shows:
  - Checkbox for selection
  - Thumbnail image (geometry render)
  - Generation number
  - Rank within generation
  - Total fitness score
- **Interaction:**
  - Click card → expand to detail view
  - Checkbox → select for batch export
  - Hover → show larger preview + genome values

**Filtering:**
- **Generation Filter:** All | Generation 0 | Generation 1 | ... | Best Overall
- **Sort:** Fitness (high to low) | Generation | Rank

**Export Actions:**

1. **Export Best Overall PNG:**
   - Single PNG of the highest-fitness individual across all generations
   - Overlay text: "Best Overall | Gen {N} | Fitness: {0.XX}"
   - Optional sparkline: fitness history leading to this individual

2. **Export Generation Bests PNG:**
   - Grid PNG showing the best individual from each generation
   - Layout: N rows × 1 column (or auto-grid if many generations)
   - Per-cell overlay: "Gen {N} | Fitness: {0.XX}"

3. **Export Selected Designs PNG:**
   - Grid PNG of user-selected designs (via checkboxes)
   - Same overlay format as above

**PNG Rendering Pipeline:**
```javascript
async function exportPNG(individuals, layout, metadata) {
  // Layout: "single" | "grid" | "vertical"
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas size based on layout
  if (layout === "single") {
    canvas.width = 1024;
    canvas.height = 1024;
  } else if (layout === "grid") {
    const cols = Math.ceil(Math.sqrt(individuals.length));
    const rows = Math.ceil(individuals.length / cols);
    canvas.width = 256 * cols;
    canvas.height = 256 * rows;
  }
  
  // Render each individual
  for (let i = 0; i < individuals.length; i++) {
    const ind = individuals[i];
    
    // Get thumbnail or render fresh
    const thumbnail = await getOrRenderThumbnail(ind);
    
    // Calculate position in grid
    const { x, y, width, height } = calculateCellLayout(i, layout, individuals.length);
    
    // Draw thumbnail
    ctx.drawImage(thumbnail, x, y, width, height);
    
    // Draw metadata overlay
    if (metadata.generation) {
      ctx.fillText(`Gen ${ind.generation}`, x + 10, y + 20);
    }
    if (metadata.rank) {
      ctx.fillText(`Rank ${ind.rank}`, x + 10, y + 40);
    }
    if (metadata.fitness) {
      ctx.fillText(`Fitness: ${ind.fitness.toFixed(3)}`, x + 10, y + 60);
    }
    if (metadata.sparkline) {
      drawSparkline(ctx, ind.fitnessHistory, x + width - 100, y + 10, 90, 30);
    }
  }
  
  // Convert to blob and download
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biological_solver_export_${Date.now()}.png`;
    a.click();
  });
}
```

**Detail View:**
- Triggered by clicking a gallery card
- Shows:
  - Large render (512×512 or larger)
  - Generation, rank, fitness
  - Per-metric fitness breakdown
  - Full genome values (scrollable if many genes)
- Actions:
  - **Apply to Canvas:** Set slider values to this genome
  - **Export Solo:** Export just this individual as PNG

---

## VI. ASYNCHRONOUS EXECUTION (Web Worker)

### Worker Architecture

**Main Thread (UI):**
- Handles popup rendering
- Dispatches evolution commands to worker
- Receives progress updates
- Updates chart and gallery

**Worker Thread:**
- Runs evolutionary algorithm
- Evaluates fitness (builds geometry, computes metrics)
- Posts results back to main thread

**Communication Protocol:**
```javascript
// Main → Worker
worker.postMessage({
  command: "INITIALIZE",
  config: {
    genomeSpec: {...},
    buildFunc: {...},
    fitnessSpec: {...},
    populationSize: 20,
    // ... other config
  }
});

worker.postMessage({
  command: "EVOLVE",
  generations: 5
});

worker.postMessage({
  command: "STOP"
});

// Worker → Main
self.postMessage({
  type: "INITIALIZED",
  population: [...]
});

self.postMessage({
  type: "GENERATION_COMPLETE",
  generation: 3,
  population: [...],
  statistics: {...}
});

self.postMessage({
  type: "ALL_COMPLETE",
  finalPopulation: [...],
  history: [...]
});

self.postMessage({
  type: "ERROR",
  message: "Fitness evaluation failed"
});
```

---

## VII. IMPLEMENTATION ROADMAP

### Phase 1: Core Solver Engine (Week 1-2)
**Deliverables:**
- Genetic algorithm implementation (initialize, select, crossover, mutate, evaluate)
- Fitness caching system
- History tracking
- Web Worker scaffolding

**Acceptance Test:**
- Can initialize population of 20 individuals
- Can evolve 10 generations without crashing
- Fitness improves over generations (on simple test case)
- History correctly records all generations

---

### Phase 2: Goal Nodes (Week 2-3)
**Deliverables:**
- Genome Collector node
- Geometry Phenotype node
- Performs Fitness node
- Node registry integration

**Acceptance Test:**
- Can connect sliders to Genome Collector
- Genome Collector outputs valid GenomeSpec
- Geometry Phenotype captures build function
- Performs Fitness evaluates metrics correctly

---

### Phase 3: Popup UI - Setup & Simulation Pages (Week 3-4)
**Deliverables:**
- Double-right-click activation
- Setup page with all config fields
- Simulation page with run controls
- Convergence chart (live-updating)

**Acceptance Test:**
- Popup opens on double-right-click
- Can configure all parameters on Setup page
- Initialize button creates population and navigates to Simulation
- Run controls work (next gen, N gens, pause, stop, reset)
- Chart updates in real-time

---

### Phase 4: Popup UI - Outputs Page & Export (Week 4-5)
**Deliverables:**
- Gallery grid view
- Individual selection
- Detail view
- PNG export pipeline (all 3 variants)

**Acceptance Test:**
- Gallery displays all individuals with thumbnails
- Can filter and sort gallery
- Can select individuals
- Export functions produce valid PNG files
- Metadata overlays appear correctly

---

### Phase 5: Output Ports & Integration (Week 5-6)
**Deliverables:**
- Best output port
- Population Bests output port
- History output port
- Gallery output port
- Downstream node consumption (e.g., apply genome to canvas)

**Acceptance Test:**
- Best output updates live as solver runs
- Population Bests contains top K from each generation
- History output is serializable
- Gallery output provides thumbnails
- Can connect outputs to other nodes

---

### Phase 6: Polish & Performance (Week 6-7)
**Deliverables:**
- Thumbnail rendering optimization (throttle, lazy load)
- Geometry build caching improvements
- UI responsiveness tuning
- Error handling and validation
- Documentation

**Acceptance Test:**
- UI remains responsive during 100-generation run
- Thumbnails render without lag
- Large populations (100 individuals) perform acceptably
- Clear error messages on invalid configs

---

## VIII. ACCEPTANCE CRITERIA

### Functional Requirements:
✓ **Genome input** accepts slider collections via Genome Collector node  
✓ **Geometry input** accepts build function via Geometry Phenotype node  
✓ **Performs input** accepts fitness metrics via Performs Fitness node  
✓ **Evolutionary algorithm** runs correctly (initialize, select, crossover, mutate)  
✓ **Popup UI** opens on double-right-click  
✓ **Setup page** allows configuration of all parameters  
✓ **Simulation page** shows live convergence chart and run controls  
✓ **Outputs page** displays gallery, supports selection, enables export  
✓ **Best output** provides highest-fitness individual  
✓ **Population Bests output** provides top K per generation  
✓ **History output** provides complete generational record  
✓ **Gallery output** provides thumbnail references  

### Performance Requirements:
✓ Solver runs asynchronously (UI never freezes)  
✓ Fitness evaluations are cached (no redundant computation)  
✓ Thumbnail rendering is throttled (max 30 FPS)  
✓ 100-generation run completes in reasonable time (<5 min for simple geometry)  
✓ 100-individual population is supported  

### Quality Requirements:
✓ Convergence chart updates smoothly  
✓ Gallery grid is responsive and scrollable  
✓ PNG exports are high-quality (1024×1024 or better)  
✓ Metadata overlays are legible  
✓ Error messages are clear and actionable  
✓ Configuration validates inputs (no invalid states)  

---

## IX. MANUAL TEST PLAN

### Test Case 1: Simple Parametric Shape (Box Dimensions)
**Setup:**
- 3 sliders: Width (10–50), Height (10–50), Depth (10–50)
- Geometry: Parametric box node
- Fitness: Maximize volume, minimize surface area

**Procedure:**
1. Connect sliders to Genome Collector
2. Connect box geometry to Geometry Phenotype
3. Connect volume & area metrics to Performs Fitness
4. Configure Performs Fitness: Maximize volume (weight 1.0), Minimize area (weight 0.5)
5. Connect all to Biological Solver 2
6. Double-right-click solver → Setup page
7. Set population 20, generations 10, mutation 0.1, crossover 0.7, elitism 2
8. Initialize (random)
9. Run 10 generations
10. Observe convergence chart
11. Navigate to Outputs page
12. Export best overall PNG

**Expected Outcome:**
- Fitness increases over generations
- Chart shows convergence trend
- Best individual has high volume, low area
- PNG export succeeds with metadata overlay

---

### Test Case 2: Complex Geometry (Mesh Subdivision)
**Setup:**
- 5 sliders: Subdivision levels, smoothing factors, etc.
- Geometry: Subdivision surface mesh
- Fitness: Maximize smoothness, minimize face count

**Procedure:**
- (Same as Test Case 1 but with more complex geometry)
- Run 20 generations with population 30
- Test pause/resume controls
- Test filter gallery by generation
- Export generation bests PNG

**Expected Outcome:**
- Solver handles complex geometry evaluation
- Pause/resume works correctly
- Gallery filtering works
- Generation bests export shows progression

---

### Test Case 3: No Fitness (Interactive Only)
**Setup:**
- Same slider/geometry setup
- **Do not connect** Performs Fitness input

**Procedure:**
- Initialize and run solver
- Observe that fitness scores are 0 or null
- Outputs page still shows gallery
- Manual selection still works

**Expected Outcome:**
- Solver runs without fitness metrics
- Evolution is purely random (no selection pressure)
- Gallery displays all individuals
- Export still functions

---

### Test Case 4: Seeded Population
**Setup:**
- Set sliders to specific values (e.g., Width=30, Height=40, Depth=20)
- Initialize with "Seed from Current Sliders"

**Procedure:**
- Run solver
- Check first generation includes individual matching current slider values
- Check other individuals are perturbations of seed

**Expected Outcome:**
- Generation 0 contains seed individual
- Other individuals are nearby in parameter space

---

### Test Case 5: Large Population & Long Run
**Setup:**
- Population: 100
- Generations: 50
- Complex geometry

**Procedure:**
- Initialize
- Run all 50 generations
- Monitor UI responsiveness
- Check memory usage
- Verify chart and gallery remain functional

**Expected Outcome:**
- UI remains responsive throughout
- Memory usage stays bounded
- Chart renders correctly with 50 data points
- Gallery displays 5000 individuals (100 × 50) without lag

---

## X. REPO DISCOVERY GUIDE (for Codex)

### What Codex Should Search For:

**Node Registry & Type System:**
- Search: "node registry", "node types", "node definition", "registerNode"
- Look for: How nodes are defined, how ports are declared, how compute() works

**Existing Slider Node:**
- Search: "slider node", "number slider", "parameter slider"
- Look for: Slider implementation, value storage, min/max/step handling

**Graph Execution Engine:**
- Search: "graph execute", "node recalculation", "dependency resolution"
- Look for: How graphs are evaluated, how values propagate through ports

**Renderer & Snapshot:**
- Search: "WebGL renderer", "screenshot", "export PNG", "canvas snapshot"
- Look for: How geometry is rendered, how to capture frame as image

**Modal/Popup System:**
- Search: "modal", "popup", "dialog", "overlay"
- Look for: Existing popup infrastructure, how to open/close modals

**Charts Library:**
- Search: "chart", "graph", "plot", "visualization"
- Look for: If charts exist (D3, Chart.js, etc.), otherwise implement minimal line chart

**State Serialization:**
- Search: "serialize", "deserialize", "save state", "load state"
- Look for: How graph state is persisted, how to save/load solver history

**Worker/Async Infrastructure:**
- Search: "Web Worker", "async", "background task"
- Look for: Existing worker patterns, how to offload computation

---

## XI. CODEX IMPLEMENTATION TICKETS

### TICKET 1: Biological Solver Engine (Genome/Geometry/Performs) + Run History

**Summary:**
Implement the core evolutionary algorithm engine for Biological Solver 2, including population initialization, selection, crossover, mutation, fitness evaluation, and generational history tracking.

**Current Problem:**
The legacy Biological Solver node lacks a proper evolutionary algorithm and cannot produce multiple generations of variants.

**Requirements:**
- Implement genetic algorithm loop (initialize, select, crossover, mutate, evaluate)
- Support 3 selection methods (tournament, roulette, rank)
- Support 2 crossover types (uniform, single-point)
- Support 2 mutation types (gaussian, uniform)
- Implement elitism (preserve best N individuals)
- Implement fitness caching (genome string → fitness result)
- Track generational history (population, statistics, convergence metrics)
- Run asynchronously in Web Worker (non-blocking)
- Support 1–100 generations, 5–100 population size

**Files to Search/Edit:**
- Search: "node registry", "solver node", "evolutionary algorithm"
- Create: `BiologicalSolver2Engine.js` (solver engine)
- Create: `BiologicalSolver2Worker.js` (Web Worker)
- Edit: Node registry to add Biological Solver 2 node

**Step-by-Step Plan:**
1. Create `BiologicalSolver2Engine` class with methods:
   - `initialize()` — create initial population (random or seeded)
   - `evaluatePopulation()` — fitness evaluation with caching
   - `evolveGeneration()` — selection, crossover, mutation, elitism
   - `run(generations)` — main loop
2. Implement selection strategies:
   - `tournamentSelection()`
   - `rouletteSelection()`
   - `rankSelection()`
3. Implement genetic operators:
   - `uniformCrossover()`, `singlePointCrossover()`
   - `gaussianMutation()`, `uniformMutation()`
4. Implement `FitnessCache` class:
   - `evaluate(individual, buildFunc, fitnessSpec)`
   - Cache by genome string
5. Implement history tracking:
   - `recordGeneration()` — save population snapshot
   - `calculateStatistics()` — best/mean/worst fitness, diversity
   - `calculateConvergence()` — improvement rate, stagnation count
6. Create Web Worker:
   - Handle `INITIALIZE`, `EVOLVE`, `STOP` commands
   - Post `GENERATION_COMPLETE`, `ALL_COMPLETE` events
7. Register Biological Solver 2 node:
   - Input ports: Genome, Geometry, Performs
   - Output ports: Best, Population Bests, History, Gallery
   - Compute: Initialize engine, start worker

**Acceptance Criteria:**
- Can initialize population of 20 individuals
- Can evolve 10 generations
- Fitness improves over generations (on test case)
- History correctly records all generations
- Runs asynchronously (UI doesn't freeze)

**Manual Test:**
- Connect test genome (3 sliders) + geometry (box) + fitness (volume)
- Run 10 generations
- Verify convergence (fitness increases)
- Verify history output contains 10 generations

---

### TICKET 2: Popup Panel UI (3 Pages) + Convergence Chart + Run Controls

**Summary:**
Implement the 3-page popup UI (Setup, Simulation, Outputs) with convergence chart, run controls, and navigation.

**Current Problem:**
Biological Solver 2 has no UI for configuration or monitoring. Users cannot interact with the evolutionary process.

**Requirements:**
- Popup opens on double-right-click Biological Solver 2 node
- Page 1 (Setup): Configure population size, generations, mutation rate, crossover rate, elitism, selection method, initialization mode
- Page 2 (Simulation): Live convergence chart (best/mean/worst fitness), run controls (next gen, N gens, pause, stop, reset), status panel
- Page 3 (Outputs): Gallery grid, selection, detail view, export options
- Tab navigation (Setup | Simulation | Outputs)
- Chart updates in real-time as generations complete
- Run controls dispatch commands to Web Worker

**Files to Search/Edit:**
- Search: "modal", "popup", "dialog"
- Create: `BiologicalSolver2Popup.jsx` (popup component)
- Create: `BiologicalSolver2SetupPage.jsx` (page 1)
- Create: `BiologicalSolver2SimulationPage.jsx` (page 2)
- Create: `BiologicalSolver2OutputsPage.jsx` (page 3)
- Create: `ConvergenceChart.jsx` (chart component)
- Search: "chart library" (or implement minimal line chart)

**Step-by-Step Plan:**
1. Create popup container:
   - Modal overlay with resizable panel
   - Tab navigation (3 tabs)
   - Close button
2. Implement Setup page:
   - All config fields (population, generations, mutation, etc.)
   - Validation on fields
   - Cancel/Initialize buttons
   - On Initialize: create population, navigate to Simulation page
3. Implement Simulation page:
   - Convergence chart (line chart with 3 series)
   - Status panel (gen count, fitness stats, diversity, stagnation)
   - Run controls (next gen, N gens input + run, pause, stop, reset)
   - Progress bar during multi-gen runs
4. Implement Convergence Chart:
   - X-axis: generation number
   - Y-axis: fitness (0–1, auto-scale)
   - 3 lines: best, mean, worst
   - Hover tooltips
   - Update incrementally (not all at once)
5. Connect run controls to Web Worker:
   - Dispatch `EVOLVE` command on button clicks
   - Listen for `GENERATION_COMPLETE` events
   - Update chart and status panel on each event
6. Implement Outputs page (stub for now, full impl in Ticket 3):
   - Placeholder gallery grid
   - Placeholder export buttons

**Acceptance Criteria:**
- Popup opens on double-right-click
- Can configure all parameters on Setup page
- Initialize button creates population and navigates to Simulation
- Chart renders correctly and updates as generations complete
- Run controls work (next gen, N gens, pause, stop, reset)
- UI remains responsive during evolution

**Manual Test:**
- Double-right-click Biological Solver 2 node
- Setup page: Set population 20, generations 10
- Click Initialize
- Simulation page: Click "Run Next Generation" 5 times
- Verify chart shows 5 data points
- Click "Run N Generations" with N=5
- Verify chart completes to 10 generations
- Verify pause/stop buttons work mid-run

---

### TICKET 3: Outputs Page + PNG Export Pipeline + Gallery

**Summary:**
Implement the Outputs page with gallery grid, individual selection, detail view, and PNG export functionality (best overall, generation bests, selected designs).

**Current Problem:**
Users cannot browse evolutionary results or export designs as images.

**Requirements:**
- Gallery grid displays all individuals from all generations
- Each card shows: thumbnail, generation, rank, fitness, selection checkbox
- Filter by generation, sort by fitness or generation
- Click card → detail view (large render, genome values, fitness breakdown)
- Export 3 PNG variants: best overall, generation bests, selected designs
- PNG includes metadata overlays (gen, rank, fitness, optional sparkline)

**Files to Search/Edit:**
- Search: "renderer", "WebGL", "screenshot", "canvas snapshot"
- Edit: `BiologicalSolver2OutputsPage.jsx`
- Create: `GalleryGrid.jsx` (gallery component)
- Create: `IndividualCard.jsx` (card component)
- Create: `DetailView.jsx` (detail panel)
- Create: `PNGExporter.js` (export utility)

**Step-by-Step Plan:**
1. Implement Gallery Grid:
   - Fetch all individuals from solver history
   - Render grid of `IndividualCard` components
   - Each card: thumbnail (lazy-loaded), metadata, checkbox
   - Support filtering and sorting
2. Implement Individual Card:
   - Display thumbnail (render geometry to small canvas)
   - Show generation, rank, fitness
   - Checkbox for selection
   - Click → open detail view
3. Implement Thumbnail Rendering:
   - Use existing renderer (WebGL snapshot) if available
   - Otherwise: minimal offscreen canvas render
   - Cache thumbnails (don't re-render on every scroll)
   - Throttle rendering (max 30 FPS)
4. Implement Detail View:
   - Large render (512×512)
   - Full genome values (scrollable list)
   - Fitness breakdown (per-metric)
   - Actions: "Apply to Canvas", "Export Solo"
5. Implement PNG Export:
   - Function: `exportBestOverall()`
   - Function: `exportGenerationBests()`
   - Function: `exportSelectedDesigns()`
   - Each creates canvas, renders thumbnails, adds text overlays, exports as PNG
6. Implement metadata overlays:
   - Text rendering on canvas (generation, rank, fitness)
   - Optional sparkline (fitness history leading to individual)
7. Connect "Apply to Canvas":
   - Set slider values to selected genome
   - Trigger graph recalculation
   - Close popup (or stay open, configurable)

**Acceptance Criteria:**
- Gallery displays all individuals with thumbnails
- Thumbnails render without lag (lazy load + throttle)
- Can filter and sort gallery
- Can select individuals via checkboxes
- Detail view opens on card click
- Export functions produce valid PNG files
- Metadata overlays are legible

**Manual Test:**
- Run solver for 5 generations, population 10 (50 individuals total)
- Navigate to Outputs page
- Verify gallery shows 50 cards
- Click various cards → verify detail view
- Select 3 individuals → click "Export Selected Designs PNG"
- Verify PNG contains 3 thumbnails with metadata
- Click "Export Best Overall PNG"
- Verify PNG is single high-res image with overlay
- Click "Apply to Canvas" on a card
- Verify sliders update to match genome

---

### TICKET 4: Goal Nodes (Genome Collector, Geometry Phenotype, Performs Fitness)

**Summary:**
Implement the 3 Goal nodes that assemble inputs for Biological Solver 2: Genome Collector, Geometry Phenotype, Performs Fitness.

**Current Problem:**
Biological Solver 2 inputs (Genome, Geometry, Performs) have no source nodes. Users cannot connect sliders or metrics.

**Requirements:**
- **Genome Collector:** Variadic slider input, outputs GenomeSpec (genes list + encode/decode)
- **Geometry Phenotype:** Variadic geometry input, outputs BuildFunction (applies genome, rebuilds geometry)
- **Performs Fitness:** Variadic metric input, outputs FitnessSpec (metrics list + evaluate)
- All nodes must integrate with existing node registry
- Genome Collector: Support "Add Selected Sliders" right-click action
- Performs Fitness: Support per-metric configuration (maximize/minimize, weight, name)

**Files to Search/Edit:**
- Search: "node registry", "node types", "slider node"
- Create: `GenomeCollectorNode.js`
- Create: `GeometryPhenotypeNode.js`
- Create: `PerformsFitnessNode.js`
- Edit: Node registry to add 3 new nodes

**Step-by-Step Plan:**
1. Create `GenomeCollectorNode`:
   - Variadic input: `sliders` (accepts multiple slider connections)
   - Output: `genomeSpec` (GenomeSpecification object)
   - Compute: Collect slider metadata (min, max, step, currentValue)
   - Encode: `(values) => values.join("-")`
   - Decode: `(str) => str.split("-").map(Number)`
   - Right-click action: "Add Selected Sliders" (connect all selected sliders)
2. Create `GeometryPhenotypeNode`:
   - Variadic input: `geometry` (accepts geometry outputs)
   - Output: `buildFunction` (GeometryBuildFunction object)
   - Compute: Capture dependency chain, create build function
   - Build function: Override slider values, recalculate graph, extract geometry
3. Create `PerformsFitnessNode`:
   - Variadic input: `metrics` (accepts numeric outputs)
   - Per-metric config: mode (max/min), weight (0–1), name
   - Output: `fitnessSpec` (FitnessSpecification object)
   - Compute: Create metrics list, evaluation function
   - Evaluate: Compute each metric, normalize, weight, sum
   - Right-click per metric: Configure max/min, weight, name
4. Register all 3 nodes in node registry
5. Add icons for each node

**Acceptance Criteria:**
- Can connect sliders to Genome Collector
- Genome Collector outputs valid GenomeSpec
- Can connect geometry to Geometry Phenotype
- Geometry Phenotype outputs valid BuildFunction
- Can connect metrics to Performs Fitness
- Performs Fitness outputs valid FitnessSpec
- "Add Selected Sliders" right-click action works
- Per-metric configuration (max/min, weight) works

**Manual Test:**
- Create 3 sliders (Width, Height, Depth)
- Create Genome Collector node
- Select all sliders → right-click Genome Collector → "Add Selected Sliders"
- Verify sliders connect
- Verify GenomeSpec output has 3 genes
- Create box geometry (parametric)
- Create Geometry Phenotype node
- Connect box → Geometry Phenotype
- Verify BuildFunction output exists
- Create volume metric (compute volume of box)
- Create Performs Fitness node
- Connect volume → Performs Fitness
- Right-click volume metric → Set "Maximize", weight 1.0
- Verify FitnessSpec output has 1 metric

---

## XII. CRITICAL REMINDERS

### Naming Consistency:
- **Node Name:** Biological Solver 2 (with .2 suffix)
- Never abbreviate to "Bio Solver" or "Solver 2" — always full name

### Biomorpher Alignment:
- Genome (parameters), Geometry (phenotype), Performs (optional fitness)
- Interactive evolutionary algorithms allow designers to engage with the process directly
- Support both interactive (manual selection) and performance-driven (fitness-guided) evolution

### Asynchronous Execution:
- **CRITICAL:** Solver must run in Web Worker
- UI must never freeze during evolution
- Use `postMessage` for worker communication
- Throttle updates to 30 FPS

### Fitness Caching:
- **CRITICAL:** Cache evaluations by genome string
- Prevents redundant geometry rebuilds
- Essential for performance with large populations

### Thumbnail Rendering:
- Lazy-load thumbnails (don't render all at once)
- Throttle rendering to avoid UI lag
- Cache rendered thumbnails (don't re-render on scroll)

### Export Quality:
- PNG exports should be high-resolution (≥1024×1024 for singles)
- Metadata overlays must be legible
- Use existing renderer (WebGL snapshot) if available

---

## XIII. FINAL DEFINITION

**Biological Solver 2 is an interactive evolutionary algorithm for generative design.**

It enables:
- Multi-generational exploration of parametric spaces
- Population-based variant generation
- Fitness-guided or interactive selection
- Export of design catalogs (PNGs)
- Evolutionary history tracking and replay

**Design emerges through iteration and selection.**

---

## XIV. EXAMPLE WORKFLOW (USER PERSPECTIVE)

1. **Build Parametric Model:**
   - Create sliders: Width (10–50), Height (10–50), Depth (10–50)
   - Create geometry: Parametric box from sliders
   - Create metrics: Volume (maximize), Surface Area (minimize)

2. **Assemble Goal Nodes:**
   - Add Genome Collector → connect sliders
   - Add Geometry Phenotype → connect box
   - Add Performs Fitness → connect metrics (set max/min, weights)

3. **Add Biological Solver 2:**
   - Connect Genome Collector → Biological Solver 2.GENOME
   - Connect Geometry Phenotype → Biological Solver 2.GEOMETRY
   - Connect Performs Fitness → Biological Solver 2.PERFORMS

4. **Configure & Run:**
   - Double-right-click Biological Solver 2
   - Setup page: Population 20, Generations 10, Tournament selection
   - Initialize
   - Simulation page: Run 10 generations
   - Watch convergence chart (fitness increases)

5. **Explore Results:**
   - Outputs page: Browse gallery of 200 variants (20 × 10)
   - Filter to Generation 9 (best generation)
   - Select top 5 individuals
   - Export selected designs as PNG

6. **Apply Winner:**
   - Click best individual → Detail view
   - Click "Apply to Canvas"
   - Sliders update to winner's genome
   - Geometry rebuilds

---

## XV. REFERENCES

**Primary Source:**
Harding, J., & Brandt-Olsen, C. (2018). "Biomorpher: Interactive Evolutionary Algorithms for Grasshopper." *UWE Bristol / AA EmTech*.

**Key Concepts:**
- Interactive Evolutionary Algorithms allow designers to engage with evolutionary development
- Genome (parameters), Geometry (phenotype), Performs (performance metrics)
- Evolutionary history is stored alongside genome values for replay
- Selection methods: Tournament, roulette, rank
- Mixed-mode evolution: Interactive + performance-driven

**Related Work:**
- Dawkins, R. (1986). *The Blind Watchmaker*
- Holland, J. (1975). *Adaptation in Natural and Artificial Systems*
- Mitchell, M. (1998). *An Introduction to Genetic Algorithms*

---

## Integration and Validation Addendum

### Implementation Anchors

- `client/src/workflow/nodes/solver/` for solver execution logic.
- `client/src/workflow/nodeRegistry.ts` for node definitions and defaults.
- `client/src/components/workflow/nodeCatalog.ts` for node descriptions.
- `client/src/components/workflow/workflowValidation.ts` for wiring and input checks.

### Output Contract

- Emits geometry or growth graph outputs plus solver metrics.
- Provides iteration count, fitness score, and convergence status.
- Exposes seed/fitness metadata for downstream analysis nodes.

### Validation Checklist

- Genome length and mutation rates remain within configured bounds.
- Fitness improves or stabilizes within expected iteration ranges.
- Random seeds produce deterministic results when fixed.
- Termination conditions (max iterations, convergence threshold) are enforced.

### UI Test Cases

- Goal nodes connect only to biological solver inputs.
- Interactive evolution sliders update fitness without full graph recompute.
- Pausing/resuming solver preserves current state and metrics.

---

## END OF IMPLEMENTATION PLAN

**Document Version:** 1.0  
**Date:** 2026-01-29  
**Author:** Systems Design / Numerica Architecture Team  
**Review Status:** Ready for Development

---

*"As opposed to setting objective functions, Interactive Evolutionary Algorithms allow designers to engage with the process of evolutionary development itself, helping to explore the wide combinatorial space of parametric models without always knowing where you are headed."*  
— John Harding, Biomorpher
