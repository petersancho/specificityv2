# Charlie Agent Onboarding Guide

**Purpose:** Fast onboarding for Charlie (Charlie Labs) when working on Lingua. Start here for high-level orientation, then jump into the deeper docs as needed.

**Last Updated:** See git history for latest changes

**Maintenance:** Any PR that changes core agent workflows, undo/history rules, or verification requirements must update this date and review this guide and `docs/CharlieAgentPlans.md` for drift against `docs/lingua_architecture.md`, `docs/lingua_conventions.md`, and `docs/ai_agent_guide.md`.

Introduced for Linear https://linear.app/specificity/issue/SPE-7 ("@charlie this is your first task.").

Canonical AI-agent docs: `docs/agents.md` (quick reference) and `docs/ai_agent_guide.md` (detailed). If anything here conflicts, follow the canonical docs and update this guide.

Note: This file and `docs/CharlieAgentPlans.md` intentionally use CamelCase names as a documented exception to the normal docs naming conventions (see `docs/lingua_conventions.md` → Naming Conventions).

---

## What You’re Working On

**Lingua** is a custom parametric design environment with a dual-panel workspace:

- **Roslyn**: direct 3D modeling in a custom WebGL viewport (internal Lingua subsystem, unrelated to the .NET Roslyn compiler platform)
- **Numerica**: visual programming on a canvas-based node graph

Both panels share one Zustand store so geometry, selection, camera state, commands, and workflow data stay in sync.

**Key principle:** the project owns its stack (custom geometry kernel, custom WebGL renderer, custom node editor). Three.js is used mainly for math utilities and some primitive generation.

---

## Scope

Charlie is allowed to work on any subsystem, but some areas are high-risk and require extra care:

- **Zustand store**: atomic updates, history/undo integration
- **Viewport + interactions**: long, stateful session logic
- **Rendering + shaders**: GPU resource lifecycle, attribute layouts
- **Geometry kernel**: functional purity (no mutation)
- **Workflow registry**: large registry file; ensure new nodes are wired end-to-end

For changes that touch these high-risk areas, follow `docs/CharlieAgentPlans.md` before implementing changes.

---

## Maintenance

If a PR changes any of these, update this guide in the same PR:

- Main entrypoints (store, viewport, workflow registry/engine, server)
- Undo/history invariants (for example when `recordModelerHistory()` is required)
- Workflow recomputation expectations after geometry changes

This guide is not the canonical architecture reference. If anything here conflicts with `docs/lingua_architecture.md`, `docs/lingua_conventions.md`, or `docs/ai_agent_guide.md`, follow the canonical docs and update this guide (and `docs/CharlieAgentPlans.md`) accordingly.

---

## Quick Start (Local)

From repo root:

```bash
npm install

# server + client
npm run dev

# client tests
npm test -w client

# build (typecheck + bundle)
npm run build
```

Default ports:

- Client: `http://localhost:5173`
- Server: `http://localhost:3001`

---

## Where to Read Next

Use these as the “map” for deeper work:

- Docs index: `docs/README.md`
- System architecture: `docs/lingua_architecture.md`
- Conventions: `docs/lingua_conventions.md`
- Detailed agent guide: `docs/ai_agent_guide.md`
- Geometry kernel reference: `docs/geometry_kernel_reference.md`
- Solver architecture: `docs/solver_architecture_guide.md`

---

## Non-Negotiable Rules

These are a non-exhaustive subset of the canonical guidance in `docs/lingua_conventions.md` and `docs/ai_agent_guide.md`. This section intentionally repeats a subset of state/undo/workflow rules to keep them visible during agent work. In case of any ambiguity or conflict, the canonical docs are the source of truth. Treat any discrepancy as a bug in this document and fix it. If you update rules here, update the primary docs too.

Any PR that changes undo/history behavior or workflow recomputation expectations should update this list in the same PR.

When editing store actions that call `recordModelerHistory()` or `recalculateWorkflow()`, explicitly review this section for needed updates.

The specific helper names change over time; always treat `docs/lingua_conventions.md` (State Management Patterns) as canonical. When refactoring undo/history or workflow recomputation behavior, update this section in the same PR.

For canonical details, see `docs/lingua_conventions.md` → State Management Patterns.

When updating the canonical guidance in `docs/lingua_conventions.md` or `docs/ai_agent_guide.md`, re-verify this section and keep it aligned.

See also:

- `docs/lingua_conventions.md` → State Management Patterns
- `docs/lingua_conventions.md` → Geometry Kernel Conventions

### Rule 1: The Store is the Single Source of Truth (for Shared Project State)

All shared project state changes must flow through `client/src/store/useProjectStore.ts` actions. Keep purely local UI state in component-level hooks.

```
User Action → Store Action → State Update → Component Re-render → WebGL/Canvas Update
```

### Rule 2: Keep Store Mutations Atomic

Avoid multiple `set()` calls per logical operation; prefer a single atomic update per action (see `docs/lingua_conventions.md` → State Management Patterns).

### Rule 3: Record History Before Undoable Mutations

Anything user-visible and persistent (geometry changes, layer edits, workflow-affecting parameter changes) should call `recordModelerHistory()` before mutating state. Transient view-only changes (camera orbit, hover state) typically should not record history; follow existing patterns in `useProjectStore`.

### Rule 4: Don’t Put Three.js Objects in State

Persist only plain data (arrays / records). Convert to/from Three.js types at boundaries.

### Rule 5: Geometry Ops Must Be Pure

No in-place mutation of geometry inputs; return new geometry records.

### Rule 6: Keep Related Collections in Sync

When geometry changes, keep layers / scene nodes / selection collections consistent (see
`reconcileGeometryCollections(...)` usage in store actions).

### Rule 7: Dispose GPU Resources

When replacing buffers/resources, ensure old ones are deleted/disposed.

### Rule 8: Trigger Workflow Recalculation When Geometry Changes

When geometry updates affect data consumed by workflow nodes, ensure `recalculateWorkflow()` is called. Use existing store actions that already call `recalculateWorkflow()` as patterns; avoid redundant recomputation for purely visual/internal changes.

---

## Essential File Map (entrypoints only)

This is a rough snapshot for onboarding. For a maintained, detailed map, see `docs/lingua_architecture.md`.

| File | What it is |
|------|------------|
| `client/src/App.tsx` | Workspace shell |
| `client/src/store/useProjectStore.ts` | Single source of truth |
| `client/src/components/WebGLViewerCanvas.tsx` | Viewport + interaction sessions |
| `client/src/workflow/nodeRegistry.ts` | Node library |
| `server/src/index.ts` | Express + persistence + workflow compute (server-side) |

---

## Common Change Patterns

### Store action shape (recommended)

**Caution:** This is a default pattern, not a universal rule. Always mirror the closest existing store action that matches your use case, especially for high-frequency or performance-sensitive paths.

Do not apply this full pattern inside per-frame or high-frequency interactions (drag/hover/mouse-move) or long-running async flows.

**Important:** This is a reference pattern for low-frequency store actions only. For any new action, first find the closest existing action in `useProjectStore.ts` and mirror that behavior; only fall back to this pattern if no clear precedent exists.

```ts
someAction: (params, options = {}) => {
  const { recordHistory = true } = options;

  // 1) validate
  if (!isValid(params, get())) return;

  // 2) history
  if (recordHistory) get().recordModelerHistory();

  // 3) compute + single atomic update
  set((state) => {
    const nextState = computeNextState(state, params);
    return nextState;
  });

  // 4) follow-ups (only if this affects workflow inputs and isn't already handled by a higher-level action)
  if (affectsWorkflow(params)) {
    get().recalculateWorkflow();
  }
}
```

Only call `recalculateWorkflow()` for actions that change data consumed by the workflow engine; follow existing store actions as a guide.

This shape is a recommended default for new store actions that follow the typical pattern (validate → optional history → atomic state update → optional workflow recompute). Some actions may deviate for good reasons (async flows, batched updates, interaction sessions); when adding a new action, mirror the closest existing action that matches your use case.

For high-frequency interactions (like drag/transform sessions) or performance-sensitive flows, prefer mirroring the patterns used by existing similar actions in `useProjectStore` rather than forcing this exact shape.

### Adding a workflow node (end-to-end)

Adding a node is never “just” `nodeRegistry.ts`. Typical touchpoints:

1. `client/src/workflow/nodeRegistry.ts` (definition + compute)
2. Any node UI surface used for parameters (often `WorkflowSection.tsx` / workflow node rendering)
3. Validation (look for existing patterns under workflow validation)
4. Docs regeneration if the node appears in generated references (`tools/generateNodeDocs.cjs`)

---

## Verification Defaults

For the authoritative list of scripts and required checks, see the root `README.md` and the `package.json` scripts (and whatever CI enforces).

This doc intentionally avoids duplicating an exhaustive command list. As a baseline after code changes, run the build/tests relevant to the packages you touched, and default to whatever the root `README.md` recommends.
