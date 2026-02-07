# Lingua IF–THEN–BECAUSE–WHY Guide

This companion file expands the prior IF–THEN–BECAUSE guide with “WHY” context so every rule has a rationale tied to Lingua’s philosophy.

## Semantic System
- **IF** you add a semantic operation, **THEN** declare it in `semantic/ops/{domain}Ops.ts` and regenerate semantic IDs, **BECAUSE** LOC requires unique IDs. **WHY?** Agents and validation scripts load operations by ID; missing or duplicate IDs break command/node tracing and agent catalogs.
- **IF** UI elements perform computation, **THEN** attach `semanticOps`, **BECAUSE** the semantic chain must be auditable. **WHY?** Without the linkage, automated reasoning (ontology validation, agent actions, coverage reports) cannot prove the UI maps to backend logic.

## Architecture & State
- **IF** mutations touch geometry/workflow state, **THEN** route them through `useProjectStore` actions, **BECAUSE** the store is the canonical state machine. **WHY?** Direct mutations bypass undo history, break Roslyn↔Numerica sync, and violate the “single atomic set” rule that prevents render loops.
- **IF** you’re adding geometry types, **THEN** update types/kernel/render/hit-testing/persistence, **BECAUSE** Roslyn expects every geometry to be constructible, renderable, selectable, and serializable. **WHY?** Partial implementations create geometry that renders but can’t be selected, or vice versa, leading to corrupt projects.

## Commands & Workflow Nodes
- **IF** you add commands, **THEN** register them in `commands/registry.ts` & `commandSemantics.ts`, **BECAUSE** the palette parser + ontology need consistent IDs. **WHY?** Otherwise user input (alias, command name) would not map onto actual ops, and semantic validation would fail.
- **IF** you add nodes, **THEN** define them in `workflow/nodeRegistry.ts` and map semantics, **BECAUSE** Numerica uses that registry to render UI and validate data flow. **WHY?** Missing entries cause nodes to fail to render, lack semantic metadata, and break coverage analysis.

## Solvers
- **IF** you modify solver logic, **THEN** update goal nodes, validation, worker clients, dashboards, **BECAUSE** solver rigs require coherent Box Builder → Goals → Solver pipelines. **WHY?** Goals define boundary conditions/loads; dashboards expose parameters; worker clients provide async execution. Omitting one step yields unusable simulators.
- **IF** solver outputs produce new geometry, **THEN** attach solver metadata, **BECAUSE** provenance (solver name, iterations, convergence, goals) must persist in Roslyn. **WHY?** Designers and agents must trace results back to solver settings for verification and repeatability.

## Rendering & UI
- **IF** you adjust Roslyn’s viewport or UI chrome, **THEN** update `WebGLViewerCanvas.tsx` and `client/src/webgl/`, **BECAUSE** both geometry and UI overlays share the same GL context. **WHY?** Patching React layers alone won’t update the WebGL UI; consistency requires editing the GL renderers.
- **IF** you modify Numerica’s look/feel, **THEN** tweak `NumericalCanvas` + theme files and rerun contrast checks, **BECAUSE** nodes are drawn manually. **WHY?** The canvas lacks standard HTML styling; any change must be painted explicitly, and accessibility guidelines must still pass.

## Processes
- **IF** you think work is finished, **THEN** run build + validate + push, **BECAUSE** Definition-of-Done mandates clean builds/tests/validations before claiming completion. **WHY?** This prevents “claimed but not implemented” issues and keeps CI trustworthy.
- **IF** validation fails, **THEN** fix it before moving on, **BECAUSE** partial fixes break downstream steps. **WHY?** Later changes compound errors, making debugging harder; immediate fixes keep the semantic chain intact.

## Documentation & Planning
- **IF** you need to document architecture/semantics/UX, **THEN** update the canonical docs (`architecture.md`, `SEMANTIC_SYSTEM.md`, `brandkit.md`, consolidated guides), **BECAUSE** documentation is treated as authoritative, not optional. **WHY?** Agents and humans rely on these docs to navigate; stale copies cause misinformed planning.
- **IF** ambiguity remains, **THEN** consult the ontology registry or consolidated guides, **BECAUSE** they describe each relationship explicitly. **WHY?** Ontology-driven development requires precise mappings; guessing leads to semantic drift.

This IF–THEN–BECAUSE–WHY guide ensures every action includes the rationale behind Lingua’s strict processes, making it harder to get confused when co-working in the repo.
