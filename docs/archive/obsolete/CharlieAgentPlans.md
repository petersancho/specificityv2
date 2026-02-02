# Charlie Agent Planning Guide

**Purpose:** A repeatable workflow for Charlie to execute multi-file or multi-subsystem tasks in Lingua without breaking undo, rendering, or workflow evaluation.

**Last Updated:** See git history for latest changes

---

## When to Use This

Use this guide when:

- The task spans 3+ files
- You’re touching a high-risk subsystem (store, viewport, rendering, shaders, workflow engine)
- You’re adding a new geometry type / command / workflow node / solver
- You’re not sure which integration points must be updated

Skip this for:

- Small doc edits
- Isolated UI copy/label tweaks
- Self-contained fixes with clear precedent

This is a convenience summary. If it conflicts with `docs/ai_agent_guide.md`, `docs/lingua_conventions.md`, or the root `README.md`, follow the canonical docs and update this guide.

---

## Maintenance

Update this guide whenever:

- Build/test scripts change in the root or workspace `package.json` files
- The main entrypoints move (store, viewport, workflow registry/engine, server)
- CI introduces new required checks for PRs

When contributor workflow or agent process changes are made elsewhere (for example in `docs/ai_agent_guide.md`), update this planning guide to match.

Any PR that changes root/workspace `package.json` scripts or CI requirements in ways that materially affect how agents should plan or verify work should review and update this guide (and `docs/CharlieAgent.md`) as needed.

---

## The Workflow

### Phase 0: Confirm Scope and Success Criteria

1. Restate the goal in one sentence.
2. Write 2–5 concrete success criteria.
3. Identify which subsystems are involved:
   - Store (`useProjectStore.ts`)
   - Viewport (`WebGLViewerCanvas.tsx`)
   - Rendering (`webgl/*`, `renderAdapter.ts`)
   - Geometry kernel (`geometry/*`)
   - Commands (`commands/registry.ts`)
   - Workflow (`nodeRegistry.ts`, `workflowEngine.ts`, canvas)
   - Server (`server/src/index.ts`)

This list is illustrative, not exhaustive. When in doubt, cross-check `docs/lingua_architecture.md` for the current system surfaces.

If any of this is unclear, ask for clarification in the Linear issue before changing code.

### Phase 1: Research (Before Editing)

1. Find the closest existing implementation and mirror its patterns.
2. Read the relevant docs section(s) from `docs/README.md`.
3. Identify integration touchpoints (what needs to change beyond the “obvious” file).

### Phase 2: Plan the Minimal Diff

Write down:

- Files you expect to touch
- The order you’ll change them in
- Risk notes (undo/history, render buffers, workflow recompute)
- A verification plan (what commands you’ll run)

Keep the solution simple; avoid opportunistic refactors.

If the work is high-risk or cross-cutting, prefer splitting it into multiple smaller PRs (or at least multiple checkpoint commits) so it’s easier to review and roll back.

**Hard rule:** Don’t do drive-by refactors, large renames, or style-only changes outside the scope of the task unless the issue explicitly asks for it.

Allowed exception: it’s fine to include truly trivial, local fixes (for example an obvious typo or bug in the exact code you’re already modifying) as long as it’s mentioned in the PR/Linear summary.

**Not OK (drive-by refactor):** Renaming a widely-used hook or reorganizing an entire directory while fixing a small bug.

**OK:** Fixing an obvious off-by-one error or typo in the exact function you’re already modifying for the task.

When a maintainer or issue explicitly requests broader refactors or renames, that explicit instruction overrides this default rule.

Also treat docs naming/location changes as high-risk: adding new top-level docs, introducing naming exceptions (like new CamelCase filenames), or large documentation reorganizations should be handled via a dedicated docs-focused issue/PR. Follow the authoritative process in `docs/lingua_conventions.md` → Naming Conventions.

If you encounter a structural problem or refactor opportunity that’s clearly outside this task’s scope, do not address it in the same PR. Instead, record it in the Linear issue (or open a new one) with a short description, and reference it in your PR summary so maintainers can prioritize it separately.

(See also the scope and refactoring guidance in `docs/ai_agent_guide.md` and `docs/lingua_conventions.md`; those documents remain the source of truth.)

For agent-driven work, copy the Phase 0–2 outputs (goal, success criteria, files, risks, verification plan) into the Linear issue and/or PR description so human reviewers can validate the plan against the implementation.

### Phase 3: Implement in Checkpoints

When possible, use small, coherent commits:

- First commit: types / data model wiring (no UI)
- Second commit: integration (store actions, adapters, registries)
- Third commit: UI and affordances
- Last commit: docs updates / docgen

For very small or narrowly scoped changes, it’s fine to combine some of these steps.

If a change breaks the build mid-way, stop and fix it before continuing.

### Phase 4: Verify Locally

Follow the verification guidance in `docs/CharlieAgent.md` (Verification Defaults) and the root `README.md`. This planning guide intentionally avoids trying to stay in sync with exact command names; treat those docs as the source of truth.

Rule of thumb: if you touched client code, run the main client build/test checks; if you touched server code, run the main server build checks, following the root `README.md`.

Minimum verification bar: do not run fewer checks than the root `README.md` (and CI) require for the areas you touched. Only skip or reduce checks when the root `README.md` explicitly allows it, and always record the rationale in the PR description.

Notes:

- For doc changes, you can usually skip builds/tests.
- As of the **Last Updated** date, if you update registries that feed generated docs, re-run the doc generation steps from `docs/README.md` (Documentation Maintenance).

### Phase 5: Close Out

When you’re done:

1. Summarize what changed (1–2 paragraphs).
2. List the key files touched.
3. Record what verification ran (and what was skipped, with reasons).
4. Link the PR and the Linear issue.

### PR checklist (copy into PR description)

- Goal (1 sentence)
- Success criteria
- Files touched
- Risks / high-risk subsystems
- Verification (commands run + outcomes)

---

## High-Risk Reminders

### Store changes

- Single atomic `set()` per logical action.
- Call `recordModelerHistory()` before undoable mutations.
- Keep geometry-related collections reconciled.
- Call `recalculateWorkflow()` when geometry changes affect workflow inputs.

### Rendering/shaders

- Don’t change attribute layouts casually.
- If you add a new uniform/varying, update both vertex and fragment shader paths and the renderer bindings.
- Dispose/delete old GPU resources on replacement.

### Workflow nodes

- Ensure the node appears in the palette (if intended) and validates.
- Confirm compute paths are consistent with the store’s evaluation flow.
- If the server has parallel compute semantics, document or reconcile divergence.

---

## Comment Templates (Optional)

### “Starting work” (Linear)

```text
Starting work on this.

Files I expect to touch:
- ...

Plan:
- ...

Verification:
- ...
```

### “Done” (Linear)

```text
Done.

Changes:
- ...

Deviations from plan / additional risks:
- ...

Verification:
- ...

PR:
- <link>
```
