# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies (from repo root)
npm install

# Start full dev environment (server + client)
npm run dev

# Start server or client separately
npm run dev:server
npm run dev:client

# Build everything
npm run build

# Run tests (client uses vitest)
npm run test -w client
```

Local ports: Client at `localhost:5173`, Server at `localhost:3001`.

## Validation Commands (Required Before Commits)

The semantic operation system is critical to this codebase. Always validate before committing:

```bash
# Run all validation (semantic + commands + integrity)
npm run validate:all

# Individual validations
npm run validate:semantic    # Validates semantic operations and node linkages
npm run validate:commands    # Validates command semantics
npm run validate:integrity   # Validates semantic integrity

# Generate semantic operation IDs after adding new operations
npm run generate:semantic-ids

# Analyze node semantic coverage
npm run analyze:coverage

# LOC Coverage 2.0 (multi-dimensional coverage metrics)
npm run analyze:coverage2

# Generate agent capabilities catalog
npm run generate:agent-catalog
```

CI runs `npm run validate:all` on every push and PR. Builds fail if validation fails.

## Architecture Overview

**Lingua** is a parametric design environment with two integrated panels:
- **Roslyn**: Direct 3D modeling via custom WebGL renderer (`client/src/webgl/`)
- **Numerica**: Visual programming canvas using 2D HTML canvas (`client/src/components/workflow/NumericalCanvas.tsx`)

Both panels share a single **Zustand store** (`client/src/store/useProjectStore.ts`).

### Key Principles
- **Custom geometry kernel** in TypeScript—no external CAD libraries
- **Raw WebGL rendering** with custom GLSL shaders; Three.js used only for math/primitive generation
- **Semantic operation system** ensures machine-checkable correctness for all UI→backend linkages

## Semantic Operation System

Every UI element must be semantically linked to backend computation. The chain:

```
UI → Command → CommandSemantic → Node → SemanticOpId → SemanticOperation → Backend
```

### LOC (Lingua Ontology Core)

LOC is the v2 semantic ontology system providing:
- **Unified ontology registry**: `client/src/semantic/ontology/registry.ts`
- **Provenance tracing**: `client/src/semantic/ontology/provenance.ts`
- **Coverage 2.0 metrics**: `client/src/semantic/ontology/coverage.ts`
- **Core types**: `client/src/semantic/ontology/types.ts`
- **Seed data**: `client/src/semantic/ontology/seed.ts`

Key exports from `client/src/semantic/index.ts`:
- `ontologyRegistry` - Global ontology registry singleton
- `provenanceStore` - Runtime execution tracing
- `withTrace()` / `withTraceAsync()` - Function wrappers for tracing
- `analyzeCoverage()` - Multi-dimensional coverage analysis

### Adding New Operations
1. Add to `client/src/semantic/ops/{domain}Ops.ts` (domains: geometry, math, vector, logic, data, string, color, solver, workflow, command)
2. Run `npm run generate:semantic-ids`
3. Run `npm run validate:semantic`

### Adding New Nodes
1. Create node in `client/src/workflow/nodes/{category}/{NodeName}.ts`
2. Add `semanticOps` array only if the node performs computational operations
3. Register in `client/src/workflow/nodeRegistry.ts`
4. Run `npm run validate:semantic && npm run analyze:coverage`

### Adding New Commands
1. Add command to `client/src/commands/registry.ts`
2. Add semantic linkage to `client/src/commands/commandSemantics.ts`
3. Create command operation in `client/src/semantic/ops/commandOps.ts`
4. Run `npm run generate:semantic-ids && npm run validate:all`

## Key Entry Points

| Purpose | Location |
|---------|----------|
| Main App | `client/src/App.tsx` |
| Zustand Store | `client/src/store/useProjectStore.ts` |
| Geometry Types | `client/src/types.ts` |
| WebGL Viewport | `client/src/components/WebGLViewerCanvas.tsx` |
| WebGL Renderer | `client/src/webgl/WebGLRenderer.ts` |
| Render Adapter | `client/src/geometry/renderAdapter.ts` |
| Workflow Canvas | `client/src/components/workflow/NumericalCanvas.tsx` |
| Command Registry | `client/src/commands/registry.ts` |
| Node Registry | `client/src/workflow/nodeRegistry.ts` |
| Semantic Ops | `client/src/semantic/ops/` |
| LOC Ontology | `client/src/semantic/ontology/` |
| Operation Registry | `client/src/semantic/operationRegistry.ts` |

## State Management Patterns

- All state lives in the Zustand store; mutations occur through store actions only
- Store actions must be atomic—call `set` once per logical operation
- Call `recordModelerHistory` before geometry mutations for undo support
- Use selectors for derived values; keep them pure

## Geometry Kernel Rules

- Geometry functions are **pure**—accept records, return new records, no mutation
- Store positions/vectors as plain arrays/objects, not Three.js types
- Convert to/from Three.js only at rendering boundaries
- Geometry operations that may fail return result objects, not exceptions

## Solver System

Five solvers with automatic mesh generation:
- **Physics (Pythagoras)**: FEA stress analysis
- **Chemistry (Apollonius)**: Material blending/reactions
- **Topological Optimization (Euclid)**: Weight reduction via SIMP method
- **Voxel (Archimedes)**: Volumetric discretization
- **Biological (Galen)**: Reaction-diffusion morphogenesis

Solver nodes use `semanticOps: ['solver.{name}']`. Goal nodes are declarative and must NOT have `semanticOps`.

### Topology Optimization Solver

**Status:** ✅ Production-ready with full semantic integration

**Key Features:**
- Matrix-free FEA with proper Jacobian transformation
- Preconditioned Conjugate Gradient (PCG) solver
- Heaviside projection with staged continuation (β: 1 → 256)
- Workspace pooling and warm-start PCG for performance
- Multi-criterion convergence (compliance + density + gray level)
- YAML validation schema with 8 mathematical invariants
- AI agent discoverable via `docs/semantic/agent-catalog.json`

**Files:**
- Core: `client/src/components/workflow/topology/simp.ts`
- Validation: `client/src/components/workflow/topology/validation.ts`
- Schema: `client/src/semantic/schemas/topology-optimization.schema.yml`
- Node: `client/src/workflow/nodes/solver/TopologyOptimizationSolver.ts`

**Validation:**
```bash
npm run validate:topology              # Validate YAML schema
npm run validate:semantic-integration  # Validate cross-references
```

### Numerica Simulator Ontology

**Solver Rigs:**
- Box Builder → Extent Selectors → Goal Nodes → Solver
- NO parameter slider nodes in rig
- All parameters editable from SETUP page

**Goal Nodes:**
- Anchor Goal: 1 input (`vertices` - WHERE to anchor)
- Load Goal: 3 inputs (`applicationPoints`, `forceMagnitude`, `direction`)
- Goal nodes extract geometry and pass to solver

**Solver Node:**
- 2 inputs: `geometry`, `goals`
- All parameters in SETUP page (not connected from workflow)

**Simulator Dashboard:**
- SETUP page: All parameter sliders
- SIMULATOR page: Visualization and controls
- OUTPUT page: Results and exports

## Documentation

Key docs in `docs/`:
- `ai_agent_guide.md` – Detailed agent development guide
- `lingua_architecture.md` – Technical architecture
- `lingua_conventions.md` – Code style and patterns
- `SEMANTIC_OPERATION_GUIDELINES.md` – Semantic system guidelines
- `SKILL.md` (root) – Development patterns and rules

## Semantic Integration System

**AI Agent Discovery:**
- Machine-readable catalog: `docs/semantic/agent-catalog.json`
- YAML schemas: `client/src/semantic/schemas/*.schema.yml`
- Agent capabilities: `docs/semantic/agent_capabilities.json`

**How AI Agents Use This:**
1. **Discovery** - Load catalog, filter by domain/category/tags
2. **Validation** - Parse constraints, validate parameters before execution
3. **Invariant Checking** - Verify preconditions/postconditions
4. **Navigation** - Follow semantic links: Operation → Schema → Node → Implementation
5. **Fix Suggestions** - Use validation rules to suggest fixes

**Benefits:**
- ✅ Efficient search through catalog-based discovery
- ✅ Deep understanding through mathematical invariants
- ✅ Better solutions through validation and postcondition checking
- ✅ Ontological navigation through semantic links

## Change Impact Checklist

- **New geometry type**: Update `types.ts`, kernel ops, render adapter, hit testing, selection UI, persistence
- **New command**: Update registry, validation, command semantics, command ops, undo/redo hooks
- **New workflow node**: Update node registry, validation, compute function, add `semanticOps` if computational
- **New render mode**: Update shaders, renderer, UI labels, docs
- **New solver/simulator**: Create YAML schema, add to agent catalog, define semantic ops, create goal nodes, implement solver rig
