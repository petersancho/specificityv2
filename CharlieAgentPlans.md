# Charlie Agent Plans (how to work in this repo)

This file is a practical playbook for planning and executing changes in `specificityv2`.
It is optimized for tasks that may span multiple subsystems (store, geometry, workflow, rendering).

## Canonical sources (keep this file from drifting)

This playbook focuses on *process*.
When concrete details (commands, file maps, architecture) differ, prefer updating the canonical docs and then realigning this file.

Canonical docs to trust first:

- `README.md` (dev/build commands)
- `docs/agents.md` (file map)
- `docs/ai_agent_guide.md`, `docs/lingua_architecture.md`, `docs/subsystems_guide.md`

## Defaults

- Prefer the smallest working change.
- Mirror existing patterns in the nearest/most-recent code.
- If a change touches data models, follow the ripple effects through: store → rendering → picking → docs/tests.

## Phase 0: Triage

1. Identify the primary subsystem:
   - UI/React (`client/src/components/*`)
   - Store (`client/src/store/useProjectStore.ts`)
   - Geometry kernel (`client/src/geometry/*`)
   - Rendering (`client/src/webgl/*`, `client/src/geometry/renderAdapter.ts`)
   - Workflow / Numerica (`client/src/workflow/*`, `client/src/components/workflow/*`)
   - Server (`server/src/index.ts` and related modules)
   - Docs (`docs/*`, `tools/*`)
2. List the *likely* impacted files before editing.
3. Decide scope (single-file vs. multi-file). For multi-file work, write a quick plan section in the PR body.

## Phase 1: Research (fast but real)

Use searches to find the most relevant patterns:

```bash
rg -n "<symbol or string>" client/src
rg -n "recordModelerHistory\(" client/src/store/useProjectStore.ts
rg -n "NODE_DEFINITIONS" client/src/workflow/nodeRegistry.ts
```

If `rg` (ripgrep) is not available, use your IDE’s project-wide search or fall back to `grep -R "<symbol or string>" client/src`.

If it’s unclear where something belongs:

1. Find the type in `client/src/types.ts`.
2. Find the store action that creates/updates it.
3. Find the renderer adapter path for it.
4. Find any picking/hit testing.

Also, look for existing tests/validation that define expected behavior:

```bash
rg -n "<symbol or string>" client/src/__tests__ client/src/test-rig
```

## Phase 2: Plan by change type

### A) Docs-only changes

Touch only `*.md` (or `tools/` if regenerating docs). Avoid code churn.

Verification baseline:

```bash
npm run test -w client
```

For purely narrative markdown edits (no `tools/` changes, no regenerated docs), tests are optional.
If you touch `tools/` or regenerate docs, run tests at minimum.

### B) UI-only changes (React)

Common files:

- `client/src/components/*`
- `client/src/styles/*`

Watch-outs:

- Prefer deriving view state from the store instead of duplicating state.
- Keep expensive work out of render paths (use memoization/selectors).

Verification baseline:

```bash
npm run build -w client
npm run test -w client
```

### C) Store changes (`useProjectStore.ts`)

Watch-outs:

- Keep actions atomic (avoid multiple `set()` calls for one logical change).
- Record history before undoable mutations.
- If workflow outputs depend on the change, make sure recalculation is triggered consistently.

Plan checklist:

1. Identify existing action(s) with the closest semantics.
2. Confirm what state slices are impacted (geometry, selection, workflow, view settings, history).
3. Confirm expected undo/redo behavior.

Verification baseline:

```bash
npm run test -w client
npm run build
```

### D) Geometry kernel changes (`client/src/geometry/*`)

Plan checklist:

1. Confirm input/output types (usually from `client/src/types.ts`).
2. Keep functions pure; avoid mutating inputs.
3. If output feeds rendering, validate `RenderMesh` invariants (array lengths, indices, finite values).

Verification baseline:

```bash
npm run test -w client
```

### E) Workflow node changes (`nodeRegistry.ts` and evaluation)

Plan checklist:

1. Update node definition(s) in `client/src/workflow/nodeRegistry.ts`.
2. Make sure ports + defaults are correct.
3. If evaluation changes, confirm graph ordering/caching expectations in `workflowEngine.ts`.
4. Consider regenerating the docs (`node tools/docgen.cjs`) if the registry changed.

Verification baseline:

```bash
node tools/docgen.cjs
npm run test -w client
```

### F) WebGL / shader / buffer changes

Plan checklist:

1. Identify the geometry → GPU mapping in `client/src/geometry/renderAdapter.ts`.
2. Identify shader(s) in `client/src/webgl/shaders/*` and their attribute/uniform contracts.
3. Confirm any new buffers are created/disposed correctly.

Verification baseline:

```bash
npm run build -w client
```

### G) Server changes

Plan checklist:

1. Confirm API surface (`/api/*`) and Socket.IO events used by the client.
2. Preserve save file format compatibility unless explicitly changing it.

Verification baseline:

```bash
npm run build -w server
```

## Phase 3: Implementation habits

- Keep diffs small and scoped.
- Prefer a couple of focused commits over one mega-commit.
- When refactoring, keep behavior identical unless the task explicitly requests a behavior change.

## Phase 4: Verification (repo-specific)

Unless a task is explicitly docs-only, treat these as the default safety bar:

- `npm run test -w client`
- `npm run build` (or `npm run build -w client` if you are sure the server is unaffected)

Commands that cover most regressions:

```bash
# See `package.json` for the exact behavior of build scripts.
npm run build

# Vitest (includes test-rig validation suites)
npm run test -w client
```

Note: as of early 2026, `npm run lint` is a placeholder (it does not run a linter). Check `package.json` for the current state.

If you need lint-style feedback, rely on TypeScript (`npm run build` / `npm run build -w client`) and the Vitest suites (`npm run test -w client`).
If your editor has TypeScript/ESLint integration, keep it enabled as an extra guard.

If `npm run build` fails, treat a green `npm run test -w client` run as the practical baseline, and capture the build error summary in the PR (or file an issue) so the failure doesn’t get silently normalized.
