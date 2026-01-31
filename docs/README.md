# Lingua Documentation

This folder contains architecture docs, specs, implementation guides, and
reference documentation. Start with the overview and architecture documents,
then branch into the subsystem or reference docs you need.

The in-app documentation is accessible from the top bar via the Documentation link.
Click it again while in the docs view to return to the Roslyn + Numerica workspace.

---

## Start Here

- Overview: `lingua_readme.md`
- Architecture: `lingua_architecture.md`
- Conventions: `lingua_conventions.md`
- AI agent quick reference: `agents.md` (start here for fast context)
- AI agent detailed guide: `ai_agent_guide.md`
- Warp agent guide: `warpagent.md` (onboarding for Warp agent)
- Large refactor template: `warpplans.md`

---

## Geometry Kernel

**Primary references for geometry development:**

- **Geometry Kernel Reference: `geometry_kernel_reference.md`** — Complete API reference for mesh, NURBS, B-Rep operations
- Geometry paradigms (mesh, NURBS, B-Rep): `geometry_types.md`
- Geometry mathematics spec: `geometry_mathematics_spec.md`
- Geometry math implementation guide: `geometry_math_v2_implementation.md`
- Tessellation patterns guide: `tessellation_patterns_guide.md`
- NURBS workflow spec: `nurbs_workflow_spec.md`
- Voxel optimization spec: `voxel_optimization_spec.md`

---

## Numerica (Workflow Nodes)

**Primary references for node development:**

- **Node Development Guide: `numerica_node_development.md`** — How to add/modify nodes
- Nodes reference (generated): `numerica_nodes_reference.md`
- Node library (full template): `numerica_node_library.md`
- Command reference (generated): `numerica_command_reference.md`
- Command + node test matrix: `command_node_test_matrix.md`

**Concepts & Usage:**

- Manual: `numerica_manual.md`
- Core concepts: `numerica_core_concepts.md`
- Technical spec: `numerica_technical_spec.md`
- Glossary: `numerica_glossary.md`
- Troubleshooting: `numerica_troubleshooting.md`
- Interaction commands: `numerica_interaction_commands.md`
- Interchange: `numerica_interchange.md`
- Rendering: `numerica_rendering.md`
- Workflow implementation map: `numerica-roslyn-semantics/IMPLEMENTATION_MAP.md`

---

## Subsystems & Architecture

- Subsystems deep dive: `subsystems_guide.md`
- Commands + nodes reference: `commands_nodes_reference.md`
- Ontology treatise prompt: `lingua_ontology_comprehensive_prompt_v2.md`

---

## Solvers & Optimization

- Solver architecture guide: `solver_architecture_guide.md`
- Numerica solver guide: `numerica_solvers_guide.md`
- Biological solver implementation: `biological_solver_implementation.md`
- Chemistry solver implementation: `epilytes_chemias_implementation.md`
- Chemistry solver workflow guide: `chemistry_solver_workflow.md`

---

## UI, Rendering & Design

- **Brand Kit: `brandkit.md`** — CMYK + Porcelain visual design system
- Panel UI spec: `panel_ui_specification.md`
- Icon palette: `icon_palette.md`
- Rendering style guide: `webgl_rendering_style.md`
- Shader inventory (legacy audit): `SHADER_INVENTORY.md`

---

## MVP & Stabilization

- Stabilization doctrine: `PART_1_Stabilization_Doctrine.md`
- MVP completion guide: `PART_2_MVP_Completion_Guide.md`
- MVP testing plan: `mvp_testing_plan.md`
- Slider node implementation ticket: `SLIDER_NODE_IMPLEMENTATION_TICKET.md`

---

## Archive (Historical)

These are point-in-time project logs and may reference legacy naming (e.g.
`ViewerCanvas`) or early planning terminology. Current implementation uses
`WebGLViewerCanvas` for the viewport and `NumericalCanvas` for the workflow editor.

Archive index (full list, Phases 1–4 and beyond): `archive/README.md`

Key phase logs:
- `archive/PHASE1_AUDIT.md` – Phase 1 Audit
- `archive/PHASE2_COMPLETE.md` – Phase 2 Complete
- `archive/PHASE3_PROGRESS.md` – Phase 3 Progress
- `archive/PHASE4_COMPLETE.md` – Phase 4 Complete

Legacy baseline (WebGL-only, superseded): `basic_implementation_guide.md`

---

## Documentation Maintenance

**Regenerating docs:**
```bash
node tools/docgen.cjs
node tools/generateNodeDocs.cjs
```

**Guidelines:**
- Generated references (`numerica_nodes_reference.md`, `numerica_command_reference.md`, `numerica_node_library.md`) should be refreshed from their registries rather than hand-edited.
- Generated JSON outputs live in `docs/generated/` and should not be hand-edited.
- Use or update `Updated:` stamps inside generated docs when they are regenerated.
- When architectural changes land, update at minimum: `lingua_readme.md`, `lingua_architecture.md`, `subsystems_guide.md`, `geometry_kernel_reference.md`.
- Keep this map aligned with changes in `docs/` and add new docs here when introduced.
