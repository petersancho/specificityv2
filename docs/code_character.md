# Lingua Codebase Character

Lingua presents a deliberate blend of custom geometry kernels, raw WebGL tooling, and an ontology-first semantic stack. Below is a distilled description of the codebase "character" based on the full sweep.

## Architectural Tempo
- **Dual-panel covenant**: Roslyn (direct 3D modeling) and Numerica (workflow canvas) share a single Zustand store, enforcing atomic mutations and consistent undo history.
- **Semantic backbone**: Every UI control, command, node, and solver maps to semantic operations. The ontology registry (LOC v2) guarantees operations, nodes, commands, data types, and goals remain machine-checkable.
- **Process rigor**: Definition-of-Done requires code, build, tests, semantic validation, and pushed commits. Scripts (`npm run validate:*`, `generate:semantic-ids`, `generate:agent-catalog`) are non-negotiable gates.

## Implementation Style
- **Own the stack**: Custom WebGL renderer, gumball gizmo, solver dashboards, geometry kernels—no third-party CAD abstractions. Buffer management, shader orchestration, and UI chrome are handwritten.
- **Data purity**: Geometry ops are pure and immutable; solvers emit metadata-tagged geometry back into Roslyn; workflow nodes compute via declarative definitions in `nodeRegistry`.
- **Agents in mind**: Metadata includes Greek labels, semantic IDs, provenance hooks, and agent catalogs so automated tools can discover and invoke capabilities safely.

## Rendering & UI Character
- **Monochrome canvas, CMYK accents**: Nodes are grayscale with category tints reserved for palette/tooltips, keeping focus on geometry. Roslyn’s UI is rendered via WebGL canvases (top bar, buttons, overlays) with custom typography and icons.
- **Dashboard ritual**: Simulators offer Setup / Simulator / Output tabs, slider-driven parameters, and scientifically styled outputs (stress gradients, solver diagnostics).
- **High-contrast discipline**: Contrast guidelines and validation scripts ensure WCAG compliance while maintaining Lingua’s sober, typographic aesthetic.

## Numerica Workflows & Nodes
- **Node encyclopedia**: `nodeRegistry` codifies 170+ nodes with semanticOps, categories, parameter specs, and compute functions. Numerica palette groups nodes by domain (geometry, data, solver, math/logic) mirroring ontology categories.
- **Visual documentation**: Nodes like Panel, Text Note, and Group emphasize storytelling; implementation notes and tooltips originate from `nodeCatalog`.
- **Solver rigs**: Strict Box Builder → Extents → Goals → Solver pipelines ensure goal semantics remain declarative; dashboards surface solver control rather than spaghetti wiring.

## Solvers & Simulation
- **Physics (Pythagoras)**: Matrix-free FEA, GPU-aware worker clients, goal validation, solver metadata back to Roslyn.
- **Topology (Euclid)**: 1300-line SIMP engine with adaptive continuation, density filters, compliance tracking, rollback safeguards.
- **Chemistry / Voxel / Evolutionary**: Similar rigs with specialized dashboards, YAML schema validation, and semantic hooks (`simulator.*` ops).

## Command System
- **Command palette as ontology portal**: `COMMAND_DEFINITIONS` + alias map to semantic ops. Validation scripts enforce 100% coverage; docs export agent-friendly JSON detailing each command’s intent.
- **UX synergy**: The Roslyn command bar echoes Numerica’s semantic explorer—search, documentation, tooltips, and semantic breadcrumbs are consistent.

## Documentation & Process
- **Living treatises**: `architecture.md`, `brandkit.md`, `geometry_kernel.md`, `SEMANTIC_SYSTEM.md`, and solver-specific docs mirror the code. Every page cites the same semantic chain and CMYK design language.
- **Checks and balances**: Before shipping, run build/test/semantic validation, regenerate IDs/catalogs, and ensure ontology integrity—processes are encoded in `AGENTS.md` and scripts.

The Lingua codebase is intentionally opinionated: own every pixel, ground every action in semantics, keep workflows declarative, and never let automation drift from ontology. This character unites Roslyn’s sculptural immediacy with Numerica’s programmable clarity.
