# Lingua Ontology

## The Foundation

Lingua is built on a **tripartite ontological architecture**:

1. **LINGUA** (Λίνγκουα) — Language & Semantics
2. **ROSLYN** (Ῥοσλύν) — Geometry & Manifestation  
3. **NUMERICA** (Νουμέρικα) — Computation & Numbers

These three domains are **equal sovereigns**, each with distinct responsibilities, yet deeply interconnected through semantic bridges.

---

## Core Ontological Entities

### The Atomic Types

**Vec3** — The Spatial Atom
```typescript
type Vec3 = { x: number; y: number; z: number }
```
All geometry ultimately decomposes to collections of Vec3. Context determines whether a Vec3 represents position, direction, or force.

**Geometry** — The Discriminated Union
```typescript
type Geometry = 
  | VertexGeometry
  | PolylineGeometry
  | SurfaceGeometry
  | MeshGeometry
  | NurbsCurveGeometry
  | NurbsSurfaceGeometry
  | BRepGeometry
  | LoftGeometry
  | ExtrudeGeometry
```

Each geometry type is **mutually exclusive** (discriminated by `type` field), enabling exhaustive pattern matching and compile-time guarantees.

---

## The Three Domains

### LINGUA — Language & Semantics

**Purpose**: Express computational intent through visual programming

**Core Entities**:
- **WorkflowNode**: Semantic computational unit
- **WorkflowEdge**: Data dependency relationship
- **GoalSpecification**: Semantic constraint on solver behavior
- **Port**: Typed interface for data flow

**Ontological Role**: LINGUA is the **universal substrate** through which humans and machines communicate computational intent. It is not merely a visual programming language—it is a **semantic layer** that bridges human creativity and machine execution.

**Key Insight**: In the age of AI, language becomes the primary interface. LINGUA embodies this by making computational graphs **readable**, **composable**, and **semantically rich**.

---

### ROSLYN — Geometry & Manifestation

**Purpose**: Represent and manipulate spatial forms

**Core Entities**:
- **Geometry**: Abstract spatial form
- **RenderMesh**: Discrete triangulated approximation
- **GPUMesh**: GPU-optimized rendering format
- **BRepData**: Topological boundary representation
- **VoxelGrid**: Discrete volumetric field

**Ontological Role**: ROSLYN is the **material manifestation** of computational intent. It transforms abstract mathematical descriptions into concrete spatial forms that can be visualized, analyzed, and fabricated.

**Key Insight**: Geometry exists in **multiple representations** simultaneously:
- **Parametric** (NURBS): Mathematical precision
- **Tessellated** (RenderMesh): Computational tractability
- **GPU** (GPUMesh): Visual manifestation

Each representation serves a distinct purpose, and transformations between them are **explicit morphisms**.

---

### NUMERICA — Computation & Numbers

**Purpose**: Execute computational transformations

**Core Entities**:
- **WorkflowValue**: Polymorphic data flowing through graph
- **SolverResult**: Computed solution to optimization problem
- **Field**: Spatial distribution of scalar/vector quantities
- **Animation**: Temporal sequence of geometric states

**Ontological Role**: NUMERICA is the **computational engine** that transforms inputs to outputs through pure functions. It is deterministic, composable, and traceable.

**Key Insight**: All computation in Lingua is **pure** (no side effects), **lazy** (evaluated on demand), and **memoized** (cached for efficiency). This enables time-travel debugging, undo/redo, and parallelization.

---

## Solver Ontology

### The Five Solvers

**1. Physics Solver (Ἐπιλύτης Φυσικῆς — Pythagoras)**
- **Domain**: Structural mechanics
- **Input**: Mesh + loads + anchors
- **Process**: Finite element analysis
- **Output**: Deformed mesh + stress field + displacements
- **Ontological Type**: **Equilibrium Solver** (finds static/dynamic equilibrium)

**2. Chemistry Solver (Ἐπιλύτης Χημείας — Apollonius)**
- **Domain**: Material distribution
- **Input**: Domain + materials + chemistry goals
- **Process**: Particle-based simulation
- **Output**: Material composition mesh + density field
- **Ontological Type**: **Distribution Solver** (optimizes spatial distribution)

**3. Topology Solver (Ἐπιλύτης Τοπολογίας — Euclid)**
- **Domain**: Optimal material layout
- **Input**: Domain + loads + volume constraint
- **Process**: SIMP method (density-based optimization)
- **Output**: Density field + extracted isosurface
- **Ontological Type**: **Optimization Solver** (minimizes objective under constraints)

**4. Voxel Solver (Ἐπιλύτης Φογκελ — Archimedes)**
- **Domain**: Volumetric optimization
- **Input**: Voxel grid + goals
- **Process**: Discrete density optimization
- **Output**: Optimized voxel grid + isosurface
- **Ontological Type**: **Optimization Solver** (discrete variant)

### Solver Protocol (Proposed)

All solvers should implement a common protocol:

```typescript
interface SolverProtocol {
  // Identity
  name: string
  nameGreek: string
  historicalFigure: string
  
  // Capabilities
  acceptsGoals: GoalType[]
  acceptsGeometry: GeometryType[]
  outputsGeometry: boolean
  outputsFields: FieldType[]
  outputsAnimation: boolean
  
  // Execution
  analysisType: AnalysisType
  iterative: boolean
  supportsGPU: boolean
  
  // Semantics
  ontologicalType: "equilibrium" | "distribution" | "optimization" | "search"
}
```

---

## Goal Ontology

### Goal as First-Class Entity

Goals are **not parameters**—they are **semantic constraints** that encode domain-specific knowledge.

**Structure**:
```typescript
interface GoalSpecification {
  goalType: GoalType
  weight: number
  target?: number
  constraint?: { min?: number, max?: number }
  geometry: { elements: number[], region?: { min, max } }
  parameters: Record<string, unknown>
}
```

### Goal Taxonomy

**Physics Goals**:
- `stiffness`: Material property (Young's modulus)
- `volume`: Mass constraint
- `load`: Applied forces
- `anchor`: Boundary conditions

**Chemistry Goals**:
- `chemStiffness`: Structural performance
- `chemMass`: Material fraction
- `chemBlend`: Smoothness
- `chemTransparency`: Optical properties
- `chemThermal`: Thermal behavior

### Semantic Goal Regions (Proposed)

Current goals reference geometry by **index** (fragile). Proposed semantic regions:

```typescript
type GoalRegion = 
  | { kind: "indices", elements: number[] }
  | { kind: "named", name: string }
  | { kind: "spatial", bounds: { min: Vec3, max: Vec3 } }
  | { kind: "semantic", selector: "edges" | "faces" | "vertices" }
  | { kind: "material", materialId: string }
```

---

## Material Ontology

### Current State

Materials are **external** to geometry:
```typescript
type MaterialAssignment = {
  layerId?: string
  geometryId?: string
  materialId: string
}
```

### Proposed Enhancement

Materials should be **integrated** into geometry:

```typescript
type MaterialAssignment = {
  target: "layer" | "geometry" | "face" | "region"
  targetId: string
  material: Material
  weight?: number  // For blending
  region?: { min: Vec3, max: Vec3 }  // For spatial assignment
  inheritance?: "override" | "blend" | "inherit"
}
```

**Benefits**:
- Hierarchical assignment (layer → geometry → face)
- Material blending (multiple materials per region)
- Spatial assignment (material varies by position)
- Inheritance rules (explicit override vs blend)

---

## Workflow Ontology

### Node Execution Model

**Lazy Evaluation with Memoization**:
1. **Pull-based**: Outputs computed on demand
2. **Recursive**: Upstream dependencies evaluated first
3. **Memoized**: Results cached per execution cycle
4. **Acyclic**: Graph structure prevents infinite recursion

**Pure Functions**:
- Nodes are **pure functions** (no side effects)
- Execution is **deterministic** (same inputs → same outputs)
- Graph is **composable** (subgraphs can be nested)

### Port Type System

Ports are **typed interfaces** that prevent invalid connections:

```typescript
type WorkflowPortType =
  | "number" | "boolean" | "string"  // Scalars (NUMERICA)
  | "vector"                          // Spatial data (NUMERICA → ROSLYN)
  | "geometry" | "mesh" | "brep"     // Geometric data (ROSLYN)
  | "goal"                            // Semantic constraint (LINGUA)
  | "solverResult"                    // Computed result (NUMERICA)
```

**Semantic Bridges**:
- `vector`: Bridges NUMERICA (numbers) and ROSLYN (space)
- `goal`: Bridges LINGUA (intent) and NUMERICA (computation)
- `geometry`: Bridges NUMERICA (computation) and ROSLYN (manifestation)

---

## Geometry Lifecycle

### The Four Stages

**1. Definition** — Mathematical Specification
- NURBS curves/surfaces
- B-Rep topology
- Parametric forms

**2. Discretization** — Conversion to Triangles
- Tessellation with tolerance
- Adaptive refinement
- Feature preservation

**3. Materialization** — GPU Buffer Allocation
- Float32Array for positions/normals
- Uint16Array for indices
- WebGL buffer objects

**4. Manifestation** — Rendered Appearance
- Shader execution
- Rasterization
- Screen pixels

### Explicit Tessellation (Proposed)

Current tessellation is **implicit** (happens on demand). Proposed explicit model:

```typescript
type TessellationSpec = {
  tolerance: number
  maxTriangles: number
  adaptiveLevel: number
  preserveFeatures: boolean
}

type GeometryWithTessellation = {
  parametric: ParametricForm
  tessellation: {
    spec: TessellationSpec
    mesh: RenderMesh
    valid: boolean
    timestamp: number
  }
}
```

**Benefits**:
- Explicit control over mesh quality
- Cache invalidation strategy
- Tolerance-based refinement
- Feature preservation

---

## Ontological Gaps & Future Work

### Gap 1: Weak LINGUA-ROSLYN Linkage

**Current**: One-way (workflow → geometry)  
**Needed**: Bidirectional (geometry ↔ workflow)

**Proposed**: Parametric Binding
```typescript
type ParametricBinding = {
  geometryId: string
  sourceNodeId: string
  updateStrategy: "automatic" | "manual" | "on-demand"
  invalidationTriggers: ("geometry" | "parameters" | "inputs")[]
}
```

### Gap 2: Incomplete Evolutionary Ontology

**Current**: Loose genome/phenotype/fitness structure  
**Needed**: Explicit specifications

**Proposed**:
```typescript
type GenomeSpec = {
  genes: GeneDefinition[]
  constraints: GeneConstraint[]
  crossoverStrategy: "uniform" | "single-point" | "multi-point"
  mutationRate: number
}

type PhenotypeSpec = {
  mapping: (genome: Record<string, number>) => Geometry
  constraints: PhenotypeConstraint[]
}

type FitnessSpec = {
  objectives: ObjectiveFunction[]
  weights: number[]
  constraints: FitnessConstraint[]
}
```

### Gap 3: Weak Workflow-Modeler Linkage

**Current**: Loosely coupled  
**Needed**: Live preview, bidirectional selection

**Proposed**: Workflow-Viewport Binding
```typescript
type WorkflowViewportBinding = {
  nodeId: string
  geometryIds: string[]
  autoPreview: boolean
  highlightOnHover: boolean
  selectOnClick: boolean
}
```

---

## Ontological Principles

### 1. Ownership Over Convenience

Every major system is **custom-built** and **fully understood**. No black boxes.

### 2. Specificity in Uncertainty

Precision matters even in probabilistic domains. Types are explicit, contracts are clear.

### 3. Language as Foundation

In the age of AI, language is the universal substrate. LINGUA embodies this through semantic richness.

### 4. Pure Functions

All computation is **pure** (no side effects), **lazy** (evaluated on demand), and **memoized** (cached for efficiency).

### 5. Discriminated Unions

Types are **mutually exclusive** through discriminated unions, enabling exhaustive pattern matching and compile-time guarantees.

### 6. Explicit Over Implicit

Transformations are **explicit morphisms**. Tessellation, coercion, and type conversion are never hidden.

### 7. Semantic Naming

Ancient Greek names signal **different computational domains** and honor **mathematical heritage**.

---

## Continuing Ontologization

### Phase 1: Strengthen Core Linkages (Current)
- ✅ All solvers output geometry correctly
- ✅ Philosophy infused in README
- ✅ Ontological analysis complete
- 🔄 Document ontology (this file)

### Phase 2: Implement Solver Protocol (Next)
- Define common SolverProtocol interface
- Implement protocol for all 5 solvers
- Add solver capability introspection
- Enable dynamic solver discovery

### Phase 3: Semantic Goal Regions
- Replace index-based goal regions with semantic regions
- Support named regions, spatial bounds, material-based selection
- Enable robust goal specification

### Phase 4: Bidirectional LINGUA-ROSLYN Binding
- Implement parametric binding
- Support automatic geometry updates
- Enable viewport → workflow selection
- Add live preview

### Phase 5: Enhanced Material Ontology
- Integrate materials into geometry
- Support hierarchical assignment
- Enable material blending
- Add spatial material variation

### Phase 6: Explicit Tessellation Model
- Make tessellation explicit
- Add tolerance-based refinement
- Implement cache invalidation
- Support feature preservation

### Phase 7: Evolutionary Ontology
- Define GenomeSpec, PhenotypeSpec, FitnessSpec
- Implement explicit genome-phenotype mapping
- Add constraint system
- Support multi-objective optimization

---

## Conclusion

Lingua's ontology is **strong** in its foundations:
- Type-safe discriminated unions
- Pure function architecture
- Explicit port typing
- Layered geometry representation
- Goal-based solver architecture

But there are **opportunities** for deeper integration:
- Bidirectional LINGUA-ROSLYN binding
- Semantic goal regions
- Enhanced material ontology
- Explicit tessellation model
- Evolutionary specifications

The path forward is clear: **strengthen the semantic bridges** between domains while maintaining the **purity** and **explicitness** that make Lingua powerful.

**Ontology is not static—it evolves.** This document captures the current state and charts the course for continuing ontologization.
