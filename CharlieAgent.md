# Charlie Agent Guide (specificityv2 / Lingua)

This repo is a parametric design environment with two synchronized interaction surfaces:

- **Roslyn**: direct 3D modeling (custom WebGL renderer)
- **Numerica**: visual programming canvas (2D canvas workflow editor)

Both panels share one Zustand store, so geometry, selection, history/undo, and workflow outputs stay in sync.

## Canonical sources (keep this file from drifting)

This file is meant to be a quick orientation, not a second “source of truth”.
If anything here disagrees with other docs, prefer updating the canonical docs and then realigning this guide.

Canonical docs to trust first:

- `README.md` (dev commands, ports, high-level entry points)
- `docs/README.md` (documentation map)
- `docs/agents.md` and `docs/ai_agent_guide.md` (agent-oriented file map + invariants)
- `docs/lingua_architecture.md` and `docs/subsystems_guide.md` (architecture + subsystem boundaries)

> Maintenance
>
> - Last broadly reviewed: 2026-01 (may be stale)
> - If `useProjectStore.ts`, `types.ts`, or the main Roslyn/Numerica entry components are moved/renamed, update this guide (or drop the stale paths).

## Start here

If you only have 5 minutes:

1. `README.md` (dev commands + entry points)
2. `docs/agents.md` (fast file map)
3. `docs/ai_agent_guide.md` (integration points + invariants)
4. `docs/lingua_architecture.md` and `docs/subsystems_guide.md` (deep context)

## Repo map

Paths below are current as of early 2026; for a maintained file map, prefer `docs/agents.md`.

- `client/`: Vite + React + TypeScript application
  - `client/src/store/` (primary store is currently `useProjectStore.ts`)
  - `client/src/types.ts`: core discriminated unions (`Geometry`, `WorkflowNode`, etc.)
  - `client/src/components/WebGLViewerCanvas.tsx`: WebGL viewport, interaction loop, picking integration
  - `client/src/components/workflow/NumericalCanvas.tsx`: workflow canvas renderer + hit testing (Numerica surface)
  - `client/src/webgl/`: custom renderer, shaders, buffers
  - `client/src/geometry/`: geometry kernel (mesh, NURBS, B-Rep, tessellation, transforms)
  - `client/src/workflow/`: node registry + evaluation engine
- `server/`: Node backend (Express + Socket.IO) for persistence + datasets + lightweight workflow compute
  - `server/src/index.ts`: all server routes + socket events
- `docs/`: architecture and generated references
- `tools/`: docs generation (`docgen.cjs`, `generateNodeDocs.cjs`)

## Core invariants (don’t break these)

### 1) The store is the source of truth

All app state mutations should happen via store actions in `client/src/store/useProjectStore.ts`.
Avoid “side state” inside components that can drift from store state.
Local component state is appropriate for presentational concerns (open/closed toggles, transient text inputs), but anything that affects geometry, selection, workflow graphs, or history should live in the store.

When adding new cross-cutting state, extend `useProjectStore` rather than creating additional global stores or React contexts for data that needs to stay in sync between Roslyn and Numerica.

### 2) Geometry is stored as plain records (not Three.js objects)

Three.js is used for math utilities and some generation helpers, but persisted geometry in the store should stay serializable.
Convert to/from Three.js types at boundaries only.

Common anti-patterns (avoid these in store state):

- Storing `THREE.Vector3`, `THREE.Mesh`, or other class instances directly (persist plain `{ x, y, z }`-style data instead)
- Embedding functions/closures in geometry records (breaks serialization)
- Storing long-lived WebGL resources (buffers/textures) in the store (keep them renderer-local)

If in doubt, ask: “Could this be `JSON.stringify`’d and rehydrated on another machine?” If not, it likely belongs at the rendering boundary.

### 3) History/undo depends on atomic actions

The store’s history system assumes actions record snapshots before mutations and apply one coherent state update per operation.
When in doubt, find an existing action that looks similar and mirror its structure.

### 4) Rendering is a mapping step, not the data model

`client/src/geometry/renderAdapter.ts` converts `Geometry` records to GPU buffers.
If the data model changes, review:

- render adapter buffer layout
- shader attributes/uniform expectations
- hit testing / picking (`client/src/geometry/hitTest.ts`)

## Where to implement common changes

### Add a new geometry type

1. Add/update types in `client/src/types.ts`
2. Add store actions in `client/src/store/useProjectStore.ts`
3. Add kernel operations in `client/src/geometry/*`
4. Extend rendering in `client/src/geometry/renderAdapter.ts`
5. Update picking if needed in `client/src/geometry/hitTest.ts`
6. Add/update tests for the new type (start by mirroring existing suites in `client/src/__tests__` and `client/src/test-rig`)

### Add or modify a workflow node (Numerica)

1. Update node definition in `client/src/workflow/nodeRegistry.ts`
2. Ensure ports are correct (via registry helpers)
3. Update evaluation if needed in `client/src/workflow/workflowEngine.ts`
4. Update node palette/UI in `client/src/components/workflow/WorkflowSection.tsx`
5. (Optional) regenerate docs via `node tools/docgen.cjs`
6. Add/update tests or validation rigs that cover the new node behavior

### Add or modify a command (Roslyn)

1. Update registry in `client/src/commands/registry.ts`
2. Update command semantics/descriptions in `client/src/data/commandDescriptions.ts`
3. Ensure any modal interaction logic is consistent with viewport patterns in `WebGLViewerCanvas.tsx`
4. Add/update tests where feasible (or validate via an existing test rig)

## Local dev & verification

From repo root:

```bash
npm install
npm run dev
```

Core checks:

```bash
# Client unit/rig tests
npm run test -w client

# Build client + server (includes TS builds)
npm run build
```

Docs generation:

```bash
node tools/docgen.cjs
node tools/generateNodeDocs.cjs
```

## Notes on the server

The server is intentionally small:

- serves datasets (`/api/materials`, `/api/ecc`)
- persists project saves in `server/saves/`
- broadcasts `project:update` over Socket.IO
- exposes `/api/workflow/compute` for a small LCA-style compute pass (distinct from the client’s full workflow engine)

API stability: treat these endpoints/events as internal but relatively stable; avoid breaking changes without coordinating corresponding client updates and updating docs.
