# Specificity

Specificity is a custom-built parametric design environment that combines direct
3D modeling with visual programming through a dual-panel workspace:

- **Roslyn**: a WebGL-based 3D modeling panel.
- **Numerica**: a canvas-based node graph panel.

Both panels share a single Zustand store, so geometry, selection, and workflows
stay in sync across direct and parametric tools.

## Project Philosophy

Specificity prioritizes ownership of core systems over third-party convenience.
The geometry kernel is authored in TypeScript without external CAD libraries.
The viewport uses a custom WebGL renderer with explicit control over buffers and
shaders. The workflow editor is a bespoke HTML canvas implementation optimized
for large graphs. Three.js is used selectively for math helpers and primitive
mesh generation, while all persisted geometry remains plain TypeScript records.

## Architecture Overview

- **Geometry kernel**: discriminated union types in `client/src/types.ts` with
  functional operations in `client/src/geometry`.
- **Rendering**: `WebGLViewerCanvas` + `WebGLRenderer` manage GPU resources,
  buffers, and shader programs in `client/src/webgl`.
- **Workflow**: `NumericalCanvas` renders the node graph in immediate-mode via
  the 2D canvas API, with lazy evaluation and caching in the store.
- **Commands**: a registry-driven command system aligned with workflow nodes.
- **State**: a single Zustand store coordinates geometry, selection, workflow,
  and undo/redo across panels.

## Codebase Tour

Key entry points for orientation:

- `client/src/App.tsx` - workspace shell and panel layout
- `client/src/components/ModelerSection.tsx` - Roslyn panel UI and command bar
- `client/src/components/WebGLViewerCanvas.tsx` - WebGL viewport
- `client/src/components/workflow/WorkflowSection.tsx` - Numerica panel UI
- `client/src/components/workflow/NumericalCanvas.tsx` - workflow canvas
- `client/src/store/useProjectStore.ts` - centralized state + actions

## Documentation Map

Start with `docs/README.md` for the full map. Core references:

- Architecture: `specificity_architecture.md`
- Conventions: `specificity_conventions.md`
- Subsystems: `subsystems_guide.md`
- Commands and nodes: `commands_nodes_reference.md`
- Workflow spec: `numerica_technical_spec.md`
- Rendering style: `webgl_rendering_style.md`

## Current Focus

The project currently centers on refining the custom WebGL pipeline, the
geometry kernel, and the canvas-based workflow editor. The documentation is
intended to stay aligned with implementation; when patterns change, update the
relevant docs rather than treating them as static specs.
