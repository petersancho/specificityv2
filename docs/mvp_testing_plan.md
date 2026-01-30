# Lingua MVP Testing Plan

**Purpose:** Deliver the MVP by validating and hardening the existing feature set. The plan explicitly **avoids adding new commands, nodes, or features** unless required to make current functionality work or to unblock critical user workflows.

**Guiding principle:** Testing drives scope. We prioritize reliability, correctness, and UX clarity of what already exists. Any new implementation must be directly tied to fixing a test failure or closing a blocking gap for MVP use.

---

## 1) Scope & Constraints

### 1.1 Scope
- **In scope:**
  - Roslyn + Numerica core workflows already implemented (graph editing, evaluation, solver interactions, basic modeling/rendering).
  - UI/UX stabilization, performance fixes, and bug remediation tied to existing features.
  - Test harness improvements **only** when required to validate MVP behavior.
- **Out of scope (unless required for functionality):**
  - New nodes, commands, interaction modes, or features that extend capability beyond the current MVP definition.

### 1.2 Constraints
- **Feature freeze:** No new commands/nodes/features unless fixing broken flows or critical defects.
- **Testing-first:** Every change must correspond to a failing test or a clearly documented MVP gap.
- **Future complexity awareness:** Any fix should avoid accidental coupling and keep the system modular for Lingua’s long-term evolution.

---

## 2) MVP Definition (Working Target)

The MVP is considered complete when a non-technical user can:
1. Launch the app, understand the UI, and create a simple parametric graph.
2. Connect nodes, evaluate the graph, see results update, and correct errors.
3. Use at least one solver node successfully and return to normal interaction.
4. Save, reload, and continue editing without data loss.
5. Export or persist meaningful results (as currently supported).

This plan focuses on validating these flows end-to-end with **existing** capabilities.

---

## 3) Test Strategy Overview

### 3.1 Testing layers
1. **Smoke tests:** Start app, open workspace, verify UI loads, and check core panels render.
2. **Interaction tests:** Mouse/keyboard interactions, selection, dragging, context menus, editing.
3. **Graph evaluation tests:** Node evaluation, dependency updates, error propagation.
4. **Solver tests:** Solver UI, run lifecycle, cancel, return to canvas.
5. **Persistence tests:** Save/load, autosave recovery, undo/redo integrity.
6. **Performance tests:** FPS baseline, evaluation time, memory usage trends.
7. **Regression tests:** Re-run smoke + interaction after fixes.

### 3.2 Definition of done for testing
- Each workflow has a **documented pass/fail** record.
- **Blocking bugs** are fixed or explicitly deferred with rationale.
- All changes map back to a test failure or MVP gap.

---

## 4) Test Phases (Execution Plan)

### Phase 0 — Baseline Audit (1–2 days)
- Inventory current capabilities and map to MVP workflows.
- Identify gaps that block end-to-end use.
- Produce a prioritized defect list.

**Output:** Baseline report + top 10 blockers.

### Phase 1 — Interaction & Editing Stabilization (2–4 days)
- Use the interaction taxonomy from the MVP guide.
- Validate selection, dragging, context menus, and parameter edits.
- Fix interaction breakages only.

**Output:** Interaction matrix with pass/fail and linked fixes.

### Phase 2 — Evaluation & Graph Integrity (2–4 days)
- Validate evaluation lifecycle, stale state, and error propagation.
- Confirm cycle prevention and undo/redo correctness.

**Output:** Evaluation test report + resolved blockers.

### Phase 3 — Solver Workflows (1–3 days)
- Test solver node popup lifecycle and run/cancel behavior.
- Ensure solver outputs propagate and UI returns to normal.

**Output:** Solver test report + resolved blockers.

### Phase 4 — Persistence & Recovery (1–3 days)
- Save/load, autosave, crash recovery (if supported).
- Verify re-opened graphs remain valid and evaluatable.

**Output:** Persistence test report + resolved blockers.

### Phase 5 — Performance & UX Polish (2–5 days)
- Baseline FPS and evaluation times on representative graphs.
- Fix regressions affecting usability.

**Output:** Performance baseline + fixes tied to metrics.

### Phase 6 — Regression Sweep & MVP Signoff (1–2 days)
- Re-run all core scripts.
- Verify no new regressions.

**Output:** MVP signoff checklist.

---

## 5) Detailed Test Tracks

### 5.1 Interaction Test Track
- Source: **Interaction Taxonomy** in the MVP Completion Guide.
- Runs on empty, medium, and heavy graph scenarios.
- Captures failure states and UI inconsistencies.

### 5.2 Graph Evaluation Track
- Validate evaluation of basic math graphs.
- Ensure stale state transitions and re-evaluation work.
- Check error states are specific, user-actionable, and not silent.

### 5.3 Solver Track
- Verify solver setup, run, and cancellation flows.
- Confirm solver output is visible and used downstream.

### 5.4 Persistence Track
- Validate save/load of graphs.
- Confirm undo/redo across save boundaries (if supported).

### 5.5 Performance Track
- Capture FPS and memory usage for:
  - 10 nodes / 10 edges.
  - 100 nodes / 150 edges.
  - 250 nodes / 400 edges.
- Record render hitches and evaluation spikes.

---

## 6) Evidence & Tracking

### 6.1 Test Record Template
```
Test ID:
Date:
Environment:
Scenario:
Steps:
Expected:
Actual:
Result: Pass/Fail
Notes:
Linked Fix (PR/Commit):
```

### 6.2 Defect Triage Rules
- **P0:** Blocks MVP workflow entirely → Fix immediately.
- **P1:** Major UX break or data loss risk → Fix in current phase.
- **P2:** Visual/edge-case issues → Fix if within phase bandwidth.
- **P3:** Cosmetic issues → Defer until after MVP signoff.

---

## 7) Change Policy (Feature Freeze)

We only implement new behavior when:
- A test reveals a missing interaction that prevents core flow completion.
- A bug fix requires a **minimal** addition to stabilize an existing feature.

Any new code must explicitly document the test case it resolves.

---

## 8) Initial Test Run (Start Now)

We begin by running automated checks and preparing the manual testing log.

### 8.1 Automated baseline
- Run lint checks to verify build integrity and surface obvious issues.

### 8.2 Manual baseline setup
- Prepare the interaction test script from the MVP Completion Guide.
- Record baseline pass/fail for each interaction.

---

## 9) Risk & Complexity Notes (Lingua Future)

- Fixes should keep data flow, evaluation, and rendering **loosely coupled**.
- Avoid hard-coding node/command types; prefer existing registries.
- Maintain undo/redo consistency in any change touching graph state.

---

## 10) Deliverables

- **MVP testing plan** (this document).
- **Baseline test reports** for each phase.
- **Defect backlog** with prioritization.
- **MVP signoff checklist**.

---

## 11) Appendix: Key References

- MVP Completion Guide: `docs/PART_2_MVP_Completion_Guide.md`
- Stabilization Doctrine: `docs/PART_1_Stabilization_Doctrine.md`
- Subsystems guide: `docs/subsystems_guide.md`
- Commands/nodes reference: `docs/commands_nodes_reference.md`
