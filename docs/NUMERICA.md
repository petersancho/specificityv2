# Numerica Guide

This file accompanies `AGENTS.md` to explain how Numerica (Lingua’s workflow panel) works from architecture through UX.

## Overview
- **Purpose:** Visually author parametric graphs that connect Roslyn geometry, data processing, and simulators.
- **Panels:** Numerica lives in the right-hand panel of the Lingua workspace; it shares the same Zustand store as Roslyn so selections, geometry, and solver outputs stay synchronized.

## Core Components
1. **WorkflowSection (`client/src/components/workflow/WorkflowSection.tsx`)**
   - Hosts the node palette, dashboards, semantic explorer, and embeds the canvas.
   - Handles palette search, solver rig helpers, capture tooling, fullscreen toggles.

2. **NumericalCanvas (`client/src/components/workflow/NumericalCanvas.tsx`)**
   - Renders all nodes, edges, groups, sliders, annotations via a WebGL + 2D canvas hybrid.
   - Manages pan/zoom, selection boxes, inline editors, context menus, and hover tooltips.

3. **Node Registry (`client/src/workflow/nodeRegistry.ts`)**
   - Defines every node: label, category, inputs/outputs, parameters, `semanticOps`, compute function.
   - Categories (data, geometry, solver, math, logic, voxel, etc.) map to palette sections.

4. **Node Catalog / Palette**
   - `nodeCatalog.ts` re-exports definitions and includes implementation notes + tooltips.
   - Palette groups categories (Geometry, Transform, Arrays, Data, Solver, Voxel, Math/Logic) with CMYK accents per `workflow/colors.ts`.

## Semantic Integration
- Every computational node includes a `semanticOps` array referencing LOC operations (`geometry.*`, `math.*`, `solver.*`, etc.).
- Validation: `pnpm run validate:semantic` ensures nodes reference valid ops; coverage scripts confirm node/operation completeness.
- Solver nodes (Physics, Chemistry, Topology, Voxel, Evolutionary) tie into ontology via `solver.*` and `simulator.*` ops while dashboards expose parameters.

## Workflow Execution
1. **Node Evaluation:** `workflowEngine.ts` prunes edges, resolves parameters, and calls each node’s `compute` function with inputs, parameters, and geometry context.
2. **Geometry Hand-off:** Nodes referencing Roslyn geometry use IDs stored in the shared store; outputs can create new geometry that feeds back into Roslyn via adapters.
3. **Solver Rigs:** Recommended topology is Box Builder → Goal nodes → Solver node. Goals are declarative; solver nodes manage parameters via dashboards.

## User Interaction Patterns
- **Nodes:** Drag/drop from palette, connect ports (type-checked), group regions, add text/panel annotations for documentation.
- **Sliders:** Provide live param tweaks with snap/precision controls; numeric sliders render on the node body.
- **Panels/Text Notes:** Inspect data inline; `panel` nodes display structured outputs using `inspectValue`.
- **Capture:** WorkflowSection supports canvas screenshotting with transparent/white backgrounds, mirroring Roslyn capture options.

## Key Files to Edit When Extending Numerica
| Task | Files |
|------|-------|
| New node | `client/src/workflow/nodeRegistry.ts`, optional helpers under `client/src/workflow/nodes/` |
| Palette docs/tooltips | `client/src/components/workflow/nodeCatalog.ts` |
| Canvas rendering | `client/src/components/workflow/NumericalCanvas.tsx`, `workflow/colors.ts`, `theme/*` |
| Solver dashboards | `client/src/components/workflow/{solver}/` (e.g., `physics/PhysicsSimulatorDashboard.tsx`) |
| Evaluation logic | `client/src/workflow/workflowEngine.ts` |

## Processes
- After adding/adjusting nodes or solvers, run: `pnpm run validate:semantic`, `pnpm run analyze:coverage`, `pnpm run generate:semantic-ids`, `pnpm run generate:agent-catalog` (if ops change).
- Maintain docs: update `docs/numerica_spec.md`, `docs/SOLVERS.md`, or consolidated guides when behavior changes.

Use this guide to orient yourself when modifying Numerica. Every change should keep the semantic chain intact, honor the palette categories, and preserve the user experience specified in the brand/UI docs.
