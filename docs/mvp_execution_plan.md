# Lingua MVP Execution Plan (Testing-First)

**Status:** Draft

This plan operationalizes the Stabilization Doctrine and MVP Completion Guide with a
**testing-first** focus. The team will **not add new commands, nodes, or features** unless
necessary for basic functionality or to unblock user workflows. All improvements are
validated through explicit test coverage or documented manual verification.

## Goals

1. Validate the current feature set end-to-end without expanding scope.
2. Identify and resolve failures through test-driven fixes.
3. Reduce future complexity by documenting constraints, guardrails, and technical
   debt decisions as part of MVP verification.

## Guiding Constraints (Non-Negotiable)

- **No new commands, nodes, or features** unless required for core functionality.
- **Testing is the gate**: no fix merges without test coverage or manual test evidence.
- **Future complexity awareness**: any code change must list long-term maintenance
  considerations and alternatives.

## MVP Definition (Outcome-Based)

A first-time user can:

1. Create a graph using existing nodes.
2. Evaluate the graph without crashes.
3. Run at least one solver workflow.
4. Save and reload the graph reliably.
5. Export or otherwise serialize output.

## Workstreams

### 1) Baseline Inventory & Risk Map

**Deliverables**
- Enumerate current nodes/commands with references to existing docs.
- Identify critical-path flows (graph creation, evaluation, solver run, save/load).
- Tag areas likely to scale in complexity (graph evaluation, WebGL rendering,
  solver runtime).

**Sources**
- `docs/commands_nodes_reference.md`
- `docs/command_node_test_matrix.md`
- `docs/subsystems_guide.md`

### 2) Interaction Integrity (Manual + Targeted Automation)

**Goal:** Validate user interactions in the MVP guide, favoring existing behavior.

**Manual Script Source**
- `docs/PART_2_MVP_Completion_Guide.md` → Interaction Test Script

**Automation Targets (Minimal)**
- Node creation and selection
- Edge creation with type validation
- Cycle prevention and error surfacing

**Acceptance Criteria**
- All interaction scripts run without UI desync or graph corruption.

### 3) Graph Evaluation Reliability

**Goal:** Ensure evaluation is predictable and stable.

**Checks**
- Evaluation correctness for basic math nodes.
- Dirty/clean states update reliably.
- Errors are localized and actionable.

**Acceptance Criteria**
- No unhandled exceptions during evaluation.
- Errors are visible and do not cascade to unrelated nodes.

### 4) Solver Workflows

**Goal:** Validate solver nodes complete a minimal run and recover cleanly.

**Checks**
- Solver initialization and cancel behavior.
- Solver output stability (no UI freeze, no leaked state).
- Solver UI popup lifecycle.

**Acceptance Criteria**
- Solver runs can complete and be re-run without a reload.

### 5) Persistence & Interchange

**Goal:** Save/load behaviors are deterministic.

**Checks**
- Save project (manual or automated).
- Reload project and verify graph fidelity.
- Import/export files if available.

**Acceptance Criteria**
- Saved graphs load without drift or missing edges.

### 6) Performance Baseline

**Goal:** Identify regressions before optimization.

**Checks**
- Measure evaluation time for small/medium graphs.
- Record WebGL FPS baseline with representative geometry.

**Acceptance Criteria**
- MVP-ready performance is documented with reproducible steps.

## Testing Plan (Execution Order)

1. **Static checks**: linting and typecheck (where available).
2. **Manual interaction script**: complete sections 1–10 of the MVP guide.
3. **Solver smoke test**: at least one solver workflow.
4. **Persistence smoke test**: save/load loop.
5. **Performance baseline**: record FPS and evaluation timing.

## Documentation & Evidence Requirements

- Every fix must include:
  - A linked test case or manual verification step.
  - A short note on long-term complexity implications.
- Every test run must log:
  - Date, environment, and versions.
  - Results (pass/fail) with observed issues.

## Current Testing Kickoff (Initial Pass)

**Automated**
- Run lint across client and server to establish a baseline.

**Manual (Next Step)**
- Execute the Interaction Test Script from the MVP guide in a local dev session,
  logging outcomes in a shared results log.

## Open Risks & Complexity Guardrails

1. **Graph evaluation scaling**: prioritize memoization and invalidation strategies
   rather than new node types.
2. **WebGL rendering**: focus on incremental updates to avoid full scene rebuilds.
3. **Solver lifecycle**: ensure cancellation and teardown are robust before adding
   solver features.
4. **State synchronization**: keep Zustand store as the single source of truth.

## Update Cadence

- Weekly testing summary: results, regressions, and resolved issues.
- Monthly complexity audit: identify code paths growing in scope and stabilize
  before expanding features.
