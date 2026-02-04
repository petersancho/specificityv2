# Lingua Documentation

Consolidated documentation for the Lingua parametric design environment.

---

## Documentation Index

### Core
- **`AGENTS.md`** — AI agent quick reference (build commands, code style, key files)
- **`architecture.md`** — System architecture and design principles
- **`philosophy.md`** — Design philosophy and ontology

### Subsystems
- **`semantic_system.md`** — Semantic operation system (operations, nodes, commands)
- **`geometry_kernel.md`** — Geometry kernel API reference
- **`numerica_spec.md`** — Numerica workflow system (nodes, data types, canvas)
- **`rendering.md`** — WebGL rendering and shaders
- **`ui_spec.md`** — Panel UI specification

### Design
- **`brandkit.md`** — CMYK + Porcelain visual design system

### Solvers
- **`SOLVERS.md`** — Solver overview and architecture
- **`solvers/`** — Detailed solver specifications:
  - `CHEMISTRY_SOLVER.md`
  - `EVOLUTIONARY_SOLVER.md`
  - `PHYSICS_SOLVER.md`
  - `TOPOLOGY_OPTIMIZATION_SOLVER.md`
  - `VOXEL_SOLVER.md`

### Generated
- **`semantic/`** — Auto-generated semantic metadata (JSON)

---

## Quick Start

1. **AI Agents**: Start with `AGENTS.md` for build commands and key conventions
2. **Architecture**: Read `architecture.md` for system overview
3. **Subsystems**: Dive into specific areas as needed

---

## Documentation Maintenance

**Regenerating semantic docs:**
```bash
pnpm run generate:semantic-ids
pnpm run validate:semantic
```

**Guidelines:**
- Generated JSON in `semantic/` should not be hand-edited
- Keep docs consolidated — avoid creating new files for content that fits existing docs
- Update `AGENTS.md` when build/test commands change
