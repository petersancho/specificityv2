---
title: DOCS-NAV
purpose: "Fast navigation cheat sheet for AI agents"
updated: 2026-02-08
---

## How to Use
1. **Set goal** → Pick a topic below (Roslyn, Numerica, Semantics, Theme, Docs).
2. **Jump via repo path** → Follow the file links and open the entry points.
3. **Fan out** → Each section lists the supporting directories, validation scripts, and reference docs.
4. **Report back** → When you finish, cite files using `@path#L-L` as usual.

## Quick Index
| Domain | Purpose | Primary Files/Dirs |
| --- | --- | --- |
| **Roslyn (3D modeler)** | WebGL viewport + commands | `client/src/components/WebGLViewerCanvas.tsx`, `client/src/ModelerSection.tsx`, `client/src/webgl/`, `client/src/commands/` |
| **Numerica (workflow)** | Node canvas + solvers | `client/src/components/workflow/WorkflowSection.tsx`, `client/src/components/workflow/NumericalCanvas.tsx`, `client/src/workflow/` |
| **Semantic System** | Ontology + ops + schemas | `client/src/semantic/ontology/`, `client/src/semantic/ops/`, `client/src/semantic/schemas/`, `docs/semantic/` |
| **Theme & Tokens** | Typography, palette, UI tokens | `client/src/semantic/ui.tokens.json`, `client/src/theme/`, `client/src/styles/` |
| **Docs & Guides** | Behavioral + architecture | `docs/AGENTS.md`, `docs/architecture.md`, `docs/SEMANTIC_SYSTEM.md`, `docs/NUMERICA.md`, `docs/ROSLYN.md` |
| **Server & Scripts** | Workflow compute + validation | `server/src/`, root `package.json`, `scripts/`, `docs/LIVE_CODEBASE.md` |

## Roslyn (3D Modeling Stack)
- **Entry points**: `client/src/components/WebGLViewerCanvas.tsx`, `client/src/ModelerSection.tsx`, `client/src/App.tsx`.
- **Renderer**: `client/src/webgl/WebGLRenderer.ts`, `client/src/webgl/ui/WebGLUIRenderer.ts`, `client/src/webgl/BufferManager.ts`.
- **Geometry pipeline**: `client/src/geometry/` (render adapter, kernels).
- **Commands**: `client/src/commands/registry.ts`, semantics in `client/src/commands/commandSemantics.ts`.
- **Validation**: run `npm run validate:commands` plus `npm run validate:all` before publishing.
- **Docs**: `docs/ROSLYN.md`, `docs/rendering.md`, `docs/geometry_kernel.md`.

## Numerica (Workflow + Solvers)
- **Entry shell**: `client/src/components/workflow/WorkflowSection.tsx` (palette, dashboards, inspector).
- **Canvas engine**: `client/src/components/workflow/NumericalCanvas.tsx`, `client/src/workflow/workflowEngine.ts`.
- **Nodes**: `client/src/workflow/nodeRegistry.ts`, definitions under `client/src/workflow/nodes/` (subfolders per domain).
- **Solvers**: `client/src/workflow/nodes/solver/` (Physics, Chemistry, Topology, Voxel). Dashboards live under `client/src/components/workflow/{solver}/`.
- **State**: `client/src/store/useProjectStore.ts` (shared with Roslyn).
- **Docs**: `docs/NUMERICA.md`, `docs/SOLVERS.md`, `docs/numerica_spec.md`.
- **Validation**: `npm run validate:semantic`, `npm run validate:semantic-integration`, `npm run validate:all`.

## Semantic System & Ontology
- **Ontology**: `client/src/semantic/ontology/` (`registry.ts`, `types.ts`, `provenance.ts`).
- **Operations**: `client/src/semantic/ops/*.ts` (domains: geometry, math, solver, etc.).
- **Schemas**: `client/src/semantic/schemas/*.schema.yml` used to generate catalogs.
- **Generation scripts**: `npm run generate:semantic-ids`, `npm run generate:agent-catalog`.
- **Docs**: `docs/SEMANTIC_SYSTEM.md`, `docs/SEMANTIC_SCHEMA_SYSTEM.md`, `docs/ontological_map.md`, `docs/semantic/` folder.
- **Usage chain**: UI → command/node → `semanticOps` → operation registry → backend.

## Theme, Tokens, and UI Lint Hooks
- **Tokens**: `client/src/semantic/ui.tokens.json` (fonts, palette, elevations).
- **Application helpers**: `client/src/theme/apply.ts`, `client/src/theme/lint.ts` (enforces `data-typography-role`, `data-signal`).
- **Global styles**: `client/src/styles/global.css`, `client/src/styles/brandkit.css`.
- **Component themes**: `client/src/components/ui/`, `client/src/components/webgl/ui/`.
- **Docs**: `docs/brandkit.md`, `docs/ui_spec.md`, `docs/CONTRAST_GUIDELINES.md`.

## Server, Tooling, and Validation
- **Server**: `server/src/index.ts` (Express + Socket.IO) for workflow compute.
- **Scripts**: root `package.json` and `scripts/` directory for helper CLIs.
- **Validation**:
  - `npm run validate:all` (required before commits)
  - `npm run build` (Definition-of-Done)
  - Specific: `validate:commands`, `validate:semantic`, `validate:semantic-integration`, `validate:contrast`
- **Docs**: `docs/LIVE_CODEBASE.md`, `docs/LIVE_CODEBASE_DETAILS.md`, `docs/AGENTS.md`.

## Documentation Meta
- **Authoritative rules**: `docs/AGENTS.md` (DoD, policies), `docs/memory_operating_guide.md`.
- **Architecture deep dives**: `docs/architecture.md`, `docs/philosophy.md`.
- **Agent guides**: `docs/AI_AGENT_INTEGRATION.md`, `docs/semantic/agent-catalog.json`.
- **Use this file** when you need a pointer to the right folder; cite the downstream file once you read it.
