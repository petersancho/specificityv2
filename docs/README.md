# Lingua Documentation

This folder contains architecture docs, specs, implementation guides, and
historical phase notes. Start with the overview and architecture documents, then
branch into the subsystem or reference docs you need.

The in-app documentation is accessible from the top bar via the Documentation link.
Click it again while in the docs view to return to the Roslyn + Numerica workspace.

## Start Here

- Overview: `lingua_readme.md`
- Architecture: `lingua_architecture.md`
- Conventions: `lingua_conventions.md`
- AI agent quick reference: `agents.md` (start here for fast context)
- AI agent detailed guide: `ai_agent_guide.md`
- Large refactor template: `plans.md`
- Ontology treatise prompt: `lingua_ontology_comprehensive_prompt_v2.md`

## Core References

- Subsystems deep dive: `subsystems_guide.md`
- Commands + nodes reference: `commands_nodes_reference.md`
- Numerica nodes reference (generated): `numerica_nodes_reference.md`
- Command + node test matrix: `command_node_test_matrix.md`
- Numerica manual: `numerica_manual.md`
- Numerica core concepts: `numerica_core_concepts.md`
- Numerica node library (full template): `numerica_node_library.md`
- Numerica command reference (generated): `numerica_command_reference.md`
- Numerica interaction commands: `numerica_interaction_commands.md`
- Numerica interchange: `numerica_interchange.md`
- Numerica rendering: `numerica_rendering.md`
- Numerica troubleshooting: `numerica_troubleshooting.md`
- Numerica glossary: `numerica_glossary.md`
- Numerica spec: `numerica_technical_spec.md`
- Numerica workflow implementation map: `Semantics and Ontology - Numerica - Roslyn/IMPLEMENTATION_MAP.md`

## Solvers + Optimization

- Solver architecture guide: `solver_architecture_guide.md`
- Numerica solver guide: `numerica_solvers_guide.md`
- Biological solver implementation: `biological_solver_implementation.md`
- Chemistry solver implementation: `epilytes_chemias_implementation.md`
- Chemistry solver workflow guide: `chemistry_solver_workflow.md`

## UI + Interaction

- **Brand Kit: `brandkit.md`** - **CMYK + Porcelain visual design system**
- Panel UI spec: `panel_ui_specification.md`
- Icon palette: `icon_palette.md`
- Slider node implementation ticket: `SLIDER_NODE_IMPLEMENTATION_TICKET.md`

## Rendering + Geometry

- Rendering style guide: `webgl_rendering_style.md`
- Geometry paradigms (mesh, NURBS, B-Rep): `geometry_types.md`
- Geometry mathematics spec: `geometry_mathematics_spec.md`
- Geometry math implementation guide: `geometry_math_v2_implementation.md`
- WebGL-only baseline (legacy): `basic_implementation_guide.md`
- NURBS workflow spec: `nurbs_workflow_spec.md`
- Tessellation patterns guide: `tessellation_patterns_guide.md`
- Voxel optimization spec: `voxel_optimization_spec.md`
- Shader inventory (legacy audit): `SHADER_INVENTORY.md`

## Historical / Phase Notes

These are point-in-time project logs and may reference legacy naming (e.g.
`ViewerCanvas`) or early planning terminology (e.g. ETO.forms). Current
implementation uses `WebGLViewerCanvas` for the viewport and `NumericalCanvas`
for the workflow editor.

- Phase 1 audit: `PHASE1_AUDIT.md`
- Phase 2 complete: `PHASE2_COMPLETE.md`
- Phase 3 progress: `PHASE3_PROGRESS.md`
- Phase 4 complete: `PHASE4_COMPLETE.md`

## Stabilization + MVP Roadmap

- Stabilization doctrine: `PART_1_Stabilization_Doctrine.md`
- MVP completion guide: `PART_2_MVP_Completion_Guide.md`
- MVP testing plan: `mvp_testing_plan.md`

## Documentation Maintenance

- Keep this map aligned with changes in `docs/` and add new docs here when introduced.
- Generated references (`commands_nodes_reference.md`, `numerica_nodes_reference.md`) should be refreshed from their registries rather than hand-edited.
- Generated manuals: `numerica_node_library.md` and `numerica_command_reference.md` are produced by `tools/docgen.cjs`.
- Generated JSON outputs live in `docs/generated/` and should not be hand‑edited.
- Use or update `Updated:` stamps inside generated docs when they are regenerated.
- When architectural changes land, update at minimum: `lingua_readme.md`, `lingua_architecture.md`, and `subsystems_guide.md`.
- Batch updates in ~20-doc increments to keep reviews focused and cross-links consistent.
