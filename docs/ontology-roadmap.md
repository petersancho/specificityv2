# Ontology Roadmap

## Vision

Transform Lingua from a **parametric design tool** into a **semantic computational platform** where language, geometry, and numbers are deeply integrated through explicit ontological relationships.

---

## Guiding Principles

1. **Semantic Richness**: Every entity has clear meaning and relationships
2. **Explicit Morphisms**: All transformations are visible and traceable
3. **Bidirectional Flow**: Information flows both ways (not just workflow → geometry)
4. **Type Safety**: Compile-time guarantees through discriminated unions
5. **Pure Functions**: No hidden state, no side effects
6. **Ownership**: Custom-built, fully understood, no black boxes

---

## Phase 1: Foundation (COMPLETE ✅)

### Objectives
- Establish core solver infrastructure
- Ensure all solvers output geometry correctly
- Document philosophical foundations
- Perform comprehensive ontological analysis

### Completed
- ✅ All 5 solvers implemented (Physics, Chemistry, Topology, Voxel, Biological)
- ✅ Solvers output unique geometry individually
- ✅ Philosophy infused in README
- ✅ Ontological analysis complete
- ✅ Ontology documentation created

### Artifacts
- `docs/ontology.md` — Comprehensive ontological documentation
- `docs/ontology-roadmap.md` — This roadmap
- Updated README with philosophy and solver infrastructure

---

## Phase 2: Solver Protocol (NEXT)

### Objectives
- Define common interface for all solvers
- Enable solver introspection and discovery
- Clarify ontological distinctions between solver types
- Support dynamic solver registration

### Tasks

**2.1 Define SolverProtocol Interface**
```typescript
interface SolverProtocol {
  // Identity
  name: string
  nameGreek: string
  historicalFigure: string
  description: string
  
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
  
  // Introspection
  getCapabilities(): SolverCapabilities
  validateInputs(inputs: SolverInputs): ValidationResult
}
```

**2.2 Implement Protocol for All Solvers**
- PhysicsSolver implements SolverProtocol
- ChemistrySolver implements SolverProtocol
- TopologySolver implements SolverProtocol
- VoxelSolver implements SolverProtocol
- BiologicalSolver implements SolverProtocol

**2.3 Add Solver Registry**
```typescript
class SolverRegistry {
  private solvers: Map<string, SolverProtocol>
  
  register(solver: SolverProtocol): void
  getSolver(name: string): SolverProtocol | null
  listSolvers(): SolverProtocol[]
  findSolversByCapability(capability: string): SolverProtocol[]
}
```

**2.4 Enable Dynamic Discovery**
- UI can query available solvers
- Workflow can validate solver compatibility
- Documentation can auto-generate from protocol

### Success Criteria
- ✅ All solvers implement SolverProtocol
- ✅ Solver registry operational
- ✅ UI can discover and display solver capabilities
- ✅ Validation prevents invalid solver configurations

### Estimated Effort
- 2-3 days

---

## Phase 3: Semantic Goal Regions

### Objectives
- Replace fragile index-based goal regions
- Enable semantic, named, and spatial goal specification
- Support robust goal updates when geometry changes
- Improve goal authoring UX

### Tasks

**3.1 Define GoalRegion Types**
```typescript
type GoalRegion = 
  | { kind: "indices", elements: number[] }
  | { kind: "named", name: string }
  | { kind: "spatial", bounds: { min: Vec3, max: Vec3 } }
  | { kind: "semantic", selector: "edges" | "faces" | "vertices" | "boundary" }
  | { kind: "material", materialId: string }
  | { kind: "layer", layerId: string }
```

**3.2 Implement Region Resolvers**
```typescript
interface RegionResolver {
  resolve(region: GoalRegion, geometry: Geometry): number[]
}

class NamedRegionResolver implements RegionResolver
class SpatialRegionResolver implements RegionResolver
class SemanticRegionResolver implements RegionResolver
class MaterialRegionResolver implements RegionResolver
```

**3.3 Update Goal System**
- Modify GoalSpecification to use GoalRegion
- Update all goal nodes to support new regions
- Implement region visualization in viewport
- Add region authoring tools

**3.4 Migration Strategy**
- Support both old (indices) and new (semantic) formats
- Provide migration utility for existing workflows
- Deprecate index-based regions gradually

### Success Criteria
- ✅ Goals can be specified semantically
- ✅ Goals survive geometry modifications
- ✅ Region visualization in viewport
- ✅ Improved goal authoring UX

### Estimated Effort
- 3-4 days

---

## Phase 4: Bidirectional LINGUA-ROSLYN Binding

### Objectives
- Enable geometry changes to update workflow
- Support live preview of workflow changes
- Implement bidirectional selection (viewport ↔ workflow)
- Create parametric binding system

### Tasks

**4.1 Define Parametric Binding**
```typescript
type ParametricBinding = {
  geometryId: string
  sourceNodeId: string
  updateStrategy: "automatic" | "manual" | "on-demand"
  invalidationTriggers: ("geometry" | "parameters" | "inputs")[]
  lastUpdate: number
}

class BindingManager {
  createBinding(geometryId: string, nodeId: string): ParametricBinding
  updateBinding(binding: ParametricBinding): void
  invalidateBinding(binding: ParametricBinding): void
  refreshBinding(binding: ParametricBinding): void
}
```

**4.2 Implement Geometry Change Detection**
- Track geometry modifications in viewport
- Detect when bound geometry changes
- Trigger workflow updates based on strategy

**4.3 Add Live Preview**
- Preview workflow changes in viewport without committing
- Show ghost geometry for pending changes
- Support preview cancellation

**4.4 Bidirectional Selection**
- Select node in workflow → highlight geometry in viewport
- Select geometry in viewport → highlight node in workflow
- Support multi-selection

### Success Criteria
- ✅ Geometry edits update workflow parameters
- ✅ Workflow changes preview in viewport
- ✅ Bidirectional selection works
- ✅ Parametric binding is robust

### Estimated Effort
- 5-7 days

---

## Phase 5: Enhanced Material Ontology

### Objectives
- Integrate materials into geometry
- Support hierarchical material assignment
- Enable material blending and spatial variation
- Implement material inheritance rules

### Tasks

**5.1 Define Enhanced Material Assignment**
```typescript
type MaterialAssignment = {
  target: "layer" | "geometry" | "face" | "region"
  targetId: string
  material: Material
  weight?: number
  region?: { min: Vec3, max: Vec3 }
  inheritance?: "override" | "blend" | "inherit"
}

type MaterialStack = {
  assignments: MaterialAssignment[]
  resolve(position: Vec3): Material
}
```

**5.2 Implement Material Hierarchy**
- Layer materials apply to all geometry in layer
- Geometry materials override layer materials
- Face materials override geometry materials
- Region materials apply spatially

**5.3 Add Material Blending**
- Support multiple materials per region
- Implement blending strategies (weighted average, max, min)
- Visualize material distribution

**5.4 Spatial Material Variation**
- Materials can vary by position
- Support gradient materials
- Enable procedural material assignment

### Success Criteria
- ✅ Hierarchical material assignment works
- ✅ Material blending supported
- ✅ Spatial variation enabled
- ✅ Material visualization improved

### Estimated Effort
- 4-5 days

---

## Phase 6: Explicit Tessellation Model

### Objectives
- Make tessellation explicit and controllable
- Implement tolerance-based refinement
- Add cache invalidation strategy
- Support feature preservation

### Tasks

**6.1 Define Tessellation Specification**
```typescript
type TessellationSpec = {
  tolerance: number
  maxTriangles: number
  adaptiveLevel: number
  preserveFeatures: boolean
  preserveSharpEdges: boolean
  minEdgeLength?: number
  maxEdgeLength?: number
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

**6.2 Implement Tessellation Manager**
```typescript
class TessellationManager {
  tessellate(geometry: Geometry, spec: TessellationSpec): RenderMesh
  invalidate(geometryId: string): void
  refresh(geometryId: string): void
  getCachedMesh(geometryId: string): RenderMesh | null
}
```

**6.3 Add Adaptive Refinement**
- Refine mesh based on curvature
- Preserve sharp features
- Respect triangle count limits

**6.4 Cache Management**
- Cache tessellated meshes
- Invalidate on geometry change
- Implement LRU eviction

### Success Criteria
- ✅ Tessellation is explicit and controllable
- ✅ Adaptive refinement works
- ✅ Cache management efficient
- ✅ Feature preservation robust

### Estimated Effort
- 4-5 days

---

## Phase 7: Evolutionary Ontology

### Objectives
- Define explicit genome, phenotype, and fitness specifications
- Implement genome-phenotype mapping
- Add constraint system for evolution
- Support multi-objective optimization

### Tasks

**7.1 Define Evolutionary Specifications**
```typescript
type GenomeSpec = {
  genes: GeneDefinition[]
  constraints: GeneConstraint[]
  crossoverStrategy: "uniform" | "single-point" | "multi-point"
  mutationRate: number
  mutationStrategy: "gaussian" | "uniform" | "adaptive"
}

type GeneDefinition = {
  name: string
  type: "continuous" | "discrete" | "categorical"
  range: { min: number, max: number }
  initialValue?: number
}

type PhenotypeSpec = {
  mapping: (genome: Record<string, number>) => Geometry
  constraints: PhenotypeConstraint[]
  evaluationCost: number
}

type FitnessSpec = {
  objectives: ObjectiveFunction[]
  weights: number[]
  constraints: FitnessConstraint[]
  aggregation: "weighted-sum" | "pareto" | "lexicographic"
}
```

**7.2 Implement Genome-Phenotype Mapping**
- Define mapping functions
- Support parametric geometry generation
- Handle mapping failures gracefully

**7.3 Add Constraint System**
- Gene constraints (bounds, dependencies)
- Phenotype constraints (validity, manufacturability)
- Fitness constraints (feasibility)

**7.4 Multi-Objective Optimization**
- Pareto frontier computation
- Weighted sum aggregation
- Lexicographic ordering

### Success Criteria
- ✅ Evolutionary specifications explicit
- ✅ Genome-phenotype mapping robust
- ✅ Constraint system operational
- ✅ Multi-objective optimization supported

### Estimated Effort
- 5-7 days

---

## Phase 8: Unified Constraint System

### Objectives
- Create unified constraint ontology across all solvers
- Enable cross-solver constraints
- Support constraint composition
- Implement constraint visualization

### Tasks

**8.1 Define Unified Constraint Types**
```typescript
type Constraint = 
  | { kind: "equality", target: number, tolerance: number }
  | { kind: "inequality", min?: number, max?: number }
  | { kind: "region", bounds: { min: Vec3, max: Vec3 } }
  | { kind: "semantic", selector: string }
  | { kind: "temporal", timeProfile: number[] }
  | { kind: "relational", relation: "less-than" | "greater-than" | "equal", targets: string[] }
```

**8.2 Implement Constraint Solver**
```typescript
class ConstraintSolver {
  addConstraint(constraint: Constraint): void
  removeConstraint(constraintId: string): void
  solve(): ConstraintSolution
  validate(solution: any): ValidationResult
}
```

**8.3 Cross-Solver Constraints**
- Physics solver respects chemistry material distribution
- Topology solver respects biological growth patterns
- Enable constraint sharing between solvers

**8.4 Constraint Visualization**
- Visualize constraint regions in viewport
- Show constraint satisfaction status
- Highlight violated constraints

### Success Criteria
- ✅ Unified constraint system operational
- ✅ Cross-solver constraints work
- ✅ Constraint composition supported
- ✅ Visualization helpful

### Estimated Effort
- 6-8 days

---

## Phase 9: Semantic Layers

### Objectives
- Transform layers from organizational to semantic containers
- Enable layer-based constraints and properties
- Support semantic queries
- Implement layer inheritance

### Tasks

**9.1 Define Semantic Layer**
```typescript
type Layer = {
  id: string
  name: string
  geometryIds: string[]
  semanticType?: "structure" | "material" | "analysis" | "result" | "reference"
  properties?: Record<string, unknown>
  constraints?: Constraint[]
  material?: Material
  visible?: boolean
  locked?: boolean
  parentId?: string | null
}
```

**9.2 Implement Semantic Queries**
```typescript
class LayerQuery {
  findBySemanticType(type: string): Layer[]
  findByProperty(key: string, value: any): Layer[]
  findByConstraint(constraint: Constraint): Layer[]
}
```

**9.3 Layer Inheritance**
- Child layers inherit parent properties
- Override mechanism for properties
- Constraint propagation

**9.4 Layer-Based Operations**
- Apply operations to all geometry in layer
- Layer-level material assignment
- Layer-level visibility/locking

### Success Criteria
- ✅ Layers are semantic containers
- ✅ Semantic queries work
- ✅ Inheritance operational
- ✅ Layer-based operations efficient

### Estimated Effort
- 3-4 days

---

## Phase 10: Explicit Computation Ontology

### Objectives
- Formalize computation types and categories
- Enable computational introspection
- Support computational optimization
- Implement computational tracing

### Tasks

**10.1 Define Computation Types**
```typescript
type ComputationType = 
  | "pure-function"
  | "solver"
  | "generator"
  | "transformer"
  | "analyzer"
  | "visualizer"

type ComputationCategory = {
  type: ComputationType
  complexity: "O(1)" | "O(n)" | "O(n²)" | "O(n³)" | "O(2ⁿ)"
  deterministic: boolean
  cacheable: boolean
  parallelizable: boolean
}
```

**10.2 Implement Computational Introspection**
```typescript
class ComputationIntrospector {
  getCategory(nodeType: NodeType): ComputationCategory
  estimateCost(nodeType: NodeType, inputs: any): number
  canParallelize(nodeType: NodeType): boolean
}
```

**10.3 Computational Optimization**
- Identify parallelizable subgraphs
- Optimize execution order
- Cache expensive computations

**10.4 Computational Tracing**
- Trace execution path
- Measure computation time
- Identify bottlenecks

### Success Criteria
- ✅ Computation types formalized
- ✅ Introspection operational
- ✅ Optimization improves performance
- ✅ Tracing provides insights

### Estimated Effort
- 4-5 days

---

## Long-Term Vision

### Year 1: Semantic Foundation
- Complete Phases 1-7
- Establish strong ontological linkages
- Document all semantic relationships
- Build robust type system

### Year 2: Semantic Intelligence
- AI-assisted workflow generation
- Semantic search across projects
- Intelligent constraint suggestion
- Automated optimization

### Year 3: Semantic Ecosystem
- Plugin system with semantic contracts
- Solver marketplace
- Shared ontology across tools
- Community-driven ontology evolution

---

## Success Metrics

### Technical Metrics
- **Type Safety**: 100% of entities have explicit types
- **Semantic Coverage**: All relationships documented
- **Bidirectional Flow**: Geometry ↔ Workflow updates work
- **Constraint Satisfaction**: Cross-solver constraints operational

### User Experience Metrics
- **Discoverability**: Users can find capabilities through introspection
- **Robustness**: Workflows survive geometry modifications
- **Clarity**: Semantic names and relationships are intuitive
- **Power**: Advanced users can leverage deep ontological features

### Philosophical Metrics
- **Ownership**: No black boxes, everything understood
- **Specificity**: Precision maintained in all domains
- **Language**: Semantic richness enables AI collaboration
- **Continuity**: Ancient wisdom integrated with modern tools

---

## Conclusion

This roadmap transforms Lingua from a **tool** into a **platform**—a semantic computational environment where language, geometry, and numbers are deeply integrated through explicit ontological relationships.

Each phase builds on the previous, strengthening the semantic bridges between domains while maintaining the purity, explicitness, and type safety that make Lingua powerful.

**Ontology is not a destination—it's a journey.** This roadmap charts the course for continuing ontologization, ensuring Lingua evolves into a system that is not just powerful, but **semantically rich**, **philosophically grounded**, and **intellectually continuous** with the mathematical traditions it honors.
