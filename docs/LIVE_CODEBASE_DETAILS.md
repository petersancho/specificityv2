# Live Codebase Details

Companion to `LIVE_CODEBASE.md`. This page enumerates the real files that make up Lingua so we can navigate the repo directly (no prompts, no summaries).

## Client (`client/`)

### Entry + State
- `src/main.tsx` – Vite entry point wiring React + Zustand providers
- `src/App.tsx` – Dual-panel shell (Roslyn + Numerica) and workspace routing
- `src/store/useProjectStore.ts` – Single source of truth (geometry, workflow, solvers, UI state)
- `src/types.ts` – Core geometry/workflow types shared across client + server

### Roslyn Stack (`client/src/components` + `client/src/webgl` + `client/src/geometry`)
- `components/WebGLViewerCanvas.tsx` – Rendering loop, camera controls, selection, overlays
- `components/ModelerSection.tsx` – Roslyn UI wrapper (toolbars, command palette, minimap, capture)
- `webgl/WebGLRenderer.ts` – Shader orchestration, draw passes, depth/edge rendering
- `webgl/BufferManager.ts`, `webgl/ShaderManager.ts`, `webgl/ui/*` – GPU buffers, shader plumbing, WebGL UI chrome
- `geometry/renderAdapter.ts` – Converts Lingua geometry records into GPU buffers
- `geometry/*` – Geometry kernel (mesh ops, NURBS, tessellation, hit testing)

### Numerica Stack (`client/src/components/workflow`, `client/src/workflow`)
- `components/workflow/WorkflowSection.tsx` – Numerica chrome, palette, dashboards
- `components/workflow/NumericalCanvas.tsx` – Canvas renderer for nodes/edges/groups
- `workflow/nodeRegistry.ts` – Authoritative node definitions (inputs, outputs, params, semanticOps)
- `workflow/workflowEngine.ts` – Node evaluation engine (dependency resolution, caching)
- `workflow/nodes/solver/*` – Physics, Chemistry, Topology, Voxel solvers + goals + dashboards

### Semantic System (`client/src/semantic`)
- `semantic/ops/*.ts` – Operation metadata grouped by domain (geometry, math, solver, etc.)
- `semantic/ontology/registry.ts` – LOC ontology registry storing datatypes, ops, nodes, commands
- `semantic/registerAllOps.ts` – Bootstraps operation registry at startup
- `semantic/semanticUi.ts`, `semantic/operationRegistry.ts` – UI helpers + legacy registry

### Utilities & Data
- `utils/*` – Color helpers, contrast checker, random seeds, safe storage, etc.
- `data/chemistryMaterials.ts`, `data/primitiveCatalog.ts` – Material presets + primitive definitions

## Server (`server/`)
- `src/index.ts` – Express + Socket.IO server, workflow compute API, project persistence
- `src/workflow/compute.ts` (if present) – Pure workflow evaluation used by API routes
- `server/package.json` – Server-only scripts via pnpm workspace

## Scripts (`scripts/`)
- `scripts/validateSemanticLinkage.ts` – Ensures node/command semantic coverage
- `scripts/validateCommandSemantics.ts` – Generates command-operation docs + validates aliases
- `scripts/validate-contrast.ts`, `scripts/audit-palette-contrast.ts` – Contrast tooling for UI palette

## Documentation (`docs/`)
- `AGENTS.md` – Repo rules, validation commands, Definition of Done
- `LIVE_CODEBASE.md` – High-level map (linked here)
- `ROSLYN.md`, `NUMERICA.md`, `ROSLYN.med` – Subsystem narratives
- `code_character.md`, `ontological_map.md`, `memory_operating_guide.md` – Architecture + ontology references
- `IF_THEN_BECAUSE*.md`, `CONTRAST_GUIDELINES.md` – Process + accessibility checklists

## Validation Commands (root `package.json`)
- `pnpm run dev` – Launch dev env (`client` + `server` concurrently)
- `pnpm run build` – Build client + server
- `pnpm run validate:semantic`, `validate:commands`, `validate:all`, `validate:contrast`
- `pnpm run generate:semantic-ids`, `generate:agent-catalog`

Use this page to jump straight to files in the repo. For structure/relationship diagrams, see `LIVE_CODEBASE.md`.
