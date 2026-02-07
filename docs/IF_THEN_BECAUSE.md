# Lingua IF–THEN–BECAUSE Guide

This guide sits alongside `AGENTS.md` to explain how the Lingua codebase behaves through conditional patterns. Use it when deciding how to act within the repo.

## Architecture & State
- **IF** you mutate geometry or workflow state, **THEN** perform the change via `useProjectStore` actions, **BECAUSE** the Zustand store is the single source of truth and records undo history (Roslyn + Numerica share it).
- **IF** you introduce a new geometry type, **THEN** update `types.ts`, geometry kernel ops, render adapter, hit testing, and persistence hooks, **BECAUSE** Roslyn needs consistent representations across modeling, rendering, and storage.
- **IF** you need global metadata (version, ontology, semantics), **THEN** update the LOC registry in `client/src/semantic/ontology/`, **BECAUSE** agents, docs, and validation scripts read from there.

## Semantic System
- **IF** you add or modify a semantic operation, **THEN** define it in `client/src/semantic/ops/{domain}Ops.ts`, run `pnpm run generate:semantic-ids`, and `pnpm run validate:semantic`, **BECAUSE** the ontology and agent catalog rely on unique IDs and validation to stay coherent.
- **IF** a UI element (command, node, solver) performs computation, **THEN** attach its `semanticOps` array, **BECAUSE** the semantic chain UI → Command/Node → Operation must be verifiable end-to-end.
- **IF** you change YAML schemas for simulators, **THEN** run `pnpm run validate:semantic-integration` and regenerate the agent catalog, **BECAUSE** schemas, ontology entries, and agent outputs must stay synchronized.

## Commands & Workflow Nodes
- **IF** you create a new Roslyn command, **THEN** register it in `client/src/commands/registry.ts` and map semantic ops in `commandSemantics.ts`, **BECAUSE** command palette parsing, ontology validation, and docs depend on that mapping.
- **IF** you create a new Numerica node, **THEN** add it to `workflow/nodeRegistry.ts` with inputs/outputs/parameters and `semanticOps`, **BECAUSE** `NumericalCanvas` renders nodes from that registry and validation ensures coverage.
- **IF** nodes or commands share functionality, **THEN** consolidate helpers in shared modules (e.g., nodeCatalog, solver utilities), **BECAUSE** consistent behavior prevents drift between UI and ontology descriptions.

## Rendering & UI
- **IF** you modify Roslyn’s viewport, **THEN** work within `WebGLViewerCanvas.tsx` and `client/src/webgl/` shaders, **BECAUSE** all rendering passes (geometry, edges, gumball, UI) flow through that stack.
- **IF** you adjust Numerica visuals, **THEN** update `NumericalCanvas.tsx` and theme utilities (`workflow/colors.ts`, `theme/*`), **BECAUSE** the canvas draws nodes manually and relies on those helpers for consistency.
- **IF** you add new UI elements, **THEN** ensure contrast + typography align with `docs/brandkit.md` and run contrast validation scripts, **BECAUSE** accessibility and aesthetics are enforced at the repo level.

## Solvers & Simulation
- **IF** you introduce or modify solver logic, **THEN** update the corresponding solver node (Physics, Chemistry, Topology, Voxel, Evolutionary), goal definitions, validation modules, worker clients, and dashboards, **BECAUSE** solver rigs require Box Builder → Goals → Solver alignment and metadata attachments.
- **IF** solver outputs create geometry, **THEN** attach solver metadata using `createSolverMetadata/attachSolverMetadata`, **BECAUSE** Roslyn needs provenance for deformed meshes.

## Processes & Validation
- **IF** you claim a task is finished, **THEN** run `pnpm run build`, `pnpm run validate:all`, ensure `git status` is clean, and push to remote, **BECAUSE** Definition-of-Done forbids declaring completion without build + validation + push.
- **IF** any validation fails, **THEN** fix the root cause immediately before moving on, **BECAUSE** CI and agents depend on deterministic script outputs.
- **IF** you need test data or docs, **THEN** update the canonical docs in `docs/` (architecture, solvers, semantic system) instead of creating unofficial notes, **BECAUSE** documentation is treated as part of the ontology.

Keep this IF–THEN–BECAUSE reference close when making changes to ensure every action aligns with Lingua’s semantic, architectural, and UX expectations.
