# Lingua Operating Memory Guide

This guide condenses all prior sweeps into a single reference so prompts remain unambiguous.

## Core Principles
1. **Own every layer**: Geometry kernel, WebGL renderer, workflow canvas, ontology—no third-party abstractions govern core logic.
2. **Semantic chain is law**: UI → Command → CommandSemantics → Workflow Node → semanticOps → Operation → Solver. Every new feature must attach to an existing or new semantic op and pass validation (`pnpm run validate:semantic`, `validate:commands`, `validate:semantic-integration`).
3. **Single source of truth**: Zustand store (`client/src/store/useProjectStore.ts`) manages all Roslyn + Numerica state. Mutations are atomic, pure geometry functions return new records, and history is recorded via `recordModelerHistory` before modifications.

## Architecture Snapshot
- **Roslyn (3D modeling)**: `WebGLViewerCanvas.tsx` + `ModelerSection.tsx` + `webgl/` renderer. Gumball, selection, minimap, capture tools run through WebGL UI renderers.
- **Numerica (workflow)**: `NumericalCanvas.tsx` renders 170+ nodes defined in `workflow/nodeRegistry.ts`. Nodes group by categories (data, geometry, solver, math, logic) with semanticOps linking to ontology.
- **Solvers**: Physics, Chemistry, Topology, Voxel, Evolutionary nodes live under `workflow/nodes/solver/*`, each with goals, validation, dashboards, worker clients, and semantic ops (e.g., `solver.physics`, `simulator.topology.*`).
- **Ontology**: LOC v2 in `semantic/ontology/`. Operations defined in `semantic/ops/*` migrate via `metaToOperation`. Agent catalog + YAML schemas keep operations discoverable and validated.

## Processes (always run)
1. `pnpm install` → `pnpm dev` for local work.
2. Before claiming completion: `pnpm run build`, `pnpm run validate:all`, `pnpm run generate:semantic-ids`, `pnpm run generate:agent-catalog` if ops changed, `pnpm run validate:semantic-integration` for solver schemas.
3. Commands/nodes must be registered + mapped in ontology. Update `commandSemantics.ts` and `nodeRegistry.ts` with `semanticOps` arrays.
4. Commit/push after validation; never claim work without `git status` clean and `git log origin/main..HEAD` empty.

## Key File Map
- Store: `client/src/store/useProjectStore.ts`
- Types: `client/src/types.ts`
- Renderer: `client/src/webgl/WebGLRenderer.ts`
- Workflow nodes: `client/src/workflow/nodeRegistry.ts`
- Commands: `client/src/commands/registry.ts`
- Semantic ops: `client/src/semantic/ops/`
- Ontology: `client/src/semantic/ontology/`
- Docs: `docs/architecture.md`, `brandkit.md`, `geometry_kernel.md`, `SEMANTIC_SYSTEM.md`, `SOLVERS.md`

## UX & Rendering Character
- Monochrome base with CMYK category accents. Roslyn UI uses WebGL-rendered controls; Numerica nodes remain grayscale with accent tooltips for clarity.
- Contrast validations enforced via docs/CONTRAST_GUIDELINES.md and scripts.
- Dashboards (simulators) consistently follow Setup / Simulator / Output pattern.

## Planning Checklist
When adding/modifying features:
1. **Decide scope**: Command, node, solver, geometry op, or documentation?
2. **Define semantics**: Ensure operations exist (or add new ones) with metadata + semantic IDs.
3. **Wire UI**: Commands and nodes must reference `semanticOps` and pass validation; update docs/tooltips accordingly.
4. **Run processes**: Build, validate, regenerate IDs/catalogs, update ontology files.
5. **Document**: If needed, update `docs/` (architecture, solver, semantic) to reflect changes.

Keep this guide handy to avoid confusion—every action, from code to documentation, ties back to the semantic ontology, validated scripts, and the Roslyn/Numerica dual-state architecture.
