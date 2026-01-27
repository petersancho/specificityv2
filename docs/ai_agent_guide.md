# AI Agent Development Guide

## Understanding This Codebase

When you are asked to work on Specificity, you are working on a custom-built parametric design system that avoids third-party CAD libraries and owns its rendering stack. Roslyn renders geometry through a custom WebGL pipeline (`client/src/webgl`) and the `WebGLViewerCanvas` component, while Numerica renders the workflow graph with a 2D HTML canvas (`client/src/components/workflow/NumericalCanvas.tsx`). Three.js is still used for math utilities and primitive mesh generation, but persisted geometry stays in plain TypeScript records.

The system consists of two major interaction surfaces that share unified state. Roslyn is the direct manipulation 3D modeling environment where users create and edit geometry through viewport interactions and command-driven workflows. Numerica is the visual programming interface where users construct parametric definitions and computational graphs. Both panels operate on the same Zustand store, enabling bidirectional workflows where models inform graphs and graphs generate geometry.

Before implementing any feature, you must understand which subsystems it touches and how those subsystems integrate. A new geometry type affects `client/src/types.ts`, store actions in `useProjectStore`, mesh/tessellation helpers in `client/src/geometry`, and buffer creation in `client/src/geometry/renderAdapter.ts` (plus legacy selection logic in `ViewerCanvas.tsx` if you touch picking). A new workflow node type affects the `NodeType` union, `WorkflowSection` palette entries, validation in `workflowValidation.ts`, and output computation in `computeWorkflowOutputs`. Understanding these integration points prevents incomplete implementations that work in isolation but fail when composed with existing features.

## Working with the Geometry Kernel

The geometry kernel is the mathematical foundation of the modeling system and implements all geometric operations as pure functions that accept geometry records and return new geometry records without mutation. When implementing new geometry types or operations, you must maintain this functional purity to ensure history management works correctly and preview operations do not corrupt the model.

Geometry records live in `client/src/types.ts` as a discriminated union (`Geometry`) with variants for vertices, polylines, surfaces, lofts, extrusions, and mesh primitives. Surface/loft/extrude/mesh entries store `RenderMesh` data (positions, normals, uvs, indices), while polylines reference vertex IDs. When adding a new geometry type, update the union, add store actions in `useProjectStore`, implement mesh generation/tessellation in `client/src/geometry`, and extend `GeometryRenderAdapter` so it produces the right GPU buffers.

Geometric computations use Three.js helpers in `geometry/mesh.ts` and `geometry/curves.ts`, but state is stored as plain arrays/objects. Convert to/from Three.js types only at the boundary to keep the data model decoupled from rendering libraries.

Tolerance management is centralized in helpers like `geometry/tessellation.ts` and in snap settings. Prefer existing tolerances and configuration hooks instead of hard-coded magic numbers.

## Working with the State Store

The Zustand store is the single source of truth for all application state and follows specific patterns that must be preserved when adding new state or actions. State is organized into domain slices like geometry, selection, camera, and workflow, with each slice containing related data. When adding new state, place it in the appropriate existing slice or create a new slice if the data represents a distinct domain.

Store actions follow a consistent pattern of validation, computation, and atomic update. Actions accept parameters, validate those parameters against current state, compute new state values, and call the set function once with all changes. Actions must not call set multiple times for a single logical operation, as this causes unnecessary re-renders and breaks the atomicity of the operation for undo purposes. When adding actions that touch geometry or workflow state, follow the existing pattern of calling `recordModelerHistory` and `recalculateWorkflow` so undo and workflow outputs stay consistent.

History management integrates with actions through `recordModelerHistory` calls that capture state snapshots before mutations. When implementing actions that modify geometry, selection, or other undoable state, you must call `recordModelerHistory` before performing the mutation. Actions that represent transient changes like cursor position or preview data should not record history. Understanding which actions are undoable and which are transient is critical for maintaining a coherent undo stack.

Selectors are used to derive values from store state without duplicating computation across components. When components need to access the same derived value, extract a selector function that can be shared. Selectors should be pure functions that do not trigger side effects and that return stable references when the underlying data has not changed. Use shallow equality checks or memoization when appropriate to prevent unnecessary re-renders.

## Working with the 3D Viewport

`WebGLViewerCanvas` (`client/src/components/WebGLViewerCanvas.tsx`) is the current viewport used by the modeler. It creates a raw `<canvas>`, instantiates `WebGLRenderer` (`client/src/webgl/WebGLRenderer.ts`) and `GeometryRenderAdapter` (`client/src/geometry/renderAdapter.ts`), and drives a requestAnimationFrame loop. Shaders live in `client/src/webgl/shaders`, and buffer lifecycle is managed by `BufferManager` and `GeometryBuffer`.

The render adapter maps geometry records to GPU buffers: mesh geometry uses `RenderMesh` attributes, and polylines use `createLineBufferData` for screen-space line rendering. When adding new renderables, extend the adapter to emit the correct attributes and ensure the renderer sets the right uniforms (line width, resolution, selection highlight, opacity).

Interaction logic is mid-migration. `WebGLViewerCanvas` currently handles camera orbit/pan/zoom and rendering, while the legacy `ViewerCanvas.tsx` (react-three-fiber) still contains selection, gizmo, and box-selection behavior. If you change interaction or picking logic, decide whether to port it into the WebGL canvas or keep it consistent in the legacy component.

## Working with Commands

The command system provides text-driven invocation of modeling operations through a registry of command definitions (`client/src/commands/registry.ts`). Commands may operate immediately on selected geometry or may enter modal interaction modes that capture pointer input. When implementing new commands, register the command with appropriate metadata, implement validation logic to verify selection requirements, and handle both immediate and modal execution patterns. Command UI and state live in `ModelerSection.tsx` and are passed into the viewport component.

Modal commands change viewport interaction behavior until the command completes or is cancelled. For example, the rectangle command captures two corner points through pointer clicks, renders preview geometry as the second point moves, and creates final geometry when the user confirms. Modal interaction logic currently lives in the legacy `ViewerCanvas.tsx`; if you move it into `WebGLViewerCanvas`, preserve the same session patterns and store update flow.

Commands that create geometry typically require construction plane specification to determine the plane in which new geometry is created. The command system supports automatic C-plane determination from selected geometry or explicit plane specification through point collection. When implementing geometry creation commands, follow the established pattern of plane acquisition, point snapping, preview rendering, and final creation.

Commands integrate with the undo system through the same history mechanism as direct manipulations. Command execution that modifies geometry should record history before performing mutations. Commands that only change viewport state or selection typically do not need history recording. The recordHistory call should capture state immediately before the command's mutations begin.

## Working with the Workflow System

The workflow editor is rendered in `NumericalCanvas.tsx` using the 2D canvas API. It owns pan/zoom, grid rendering, hit testing, and connection previews. The workflow data model lives in the Zustand store (`workflow.nodes`/`workflow.edges`).

Workflow nodes use the `WorkflowNodeData` shape in `client/src/types.ts`, with allowed node types defined by the `NodeType` union in `useProjectStore.ts`. When adding new node types, update the `NodeType` union, add palette entries in `WorkflowSection.tsx`, implement validation in `workflowValidation.ts`, and extend node-specific UI in `WorkflowNodes.tsx` if it is used for parameter controls.

Graph evaluation is currently a lightweight pass in `computeWorkflowOutputs` (inside `useProjectStore`) that writes output values onto node data. The server has a richer compute pass in `server/src/index.ts` for LCA metrics; if you extend workflow semantics, keep both in sync or document the divergence.

The canvas implementation requires explicit hit testing for mouse interactions. When implementing interactive features like node dragging or connection creation, maintain the existing drag-session pattern in `NumericalCanvas.tsx` so interactions stay consistent.

## Common Implementation Patterns

When implementing features that span multiple subsystems, follow established integration patterns. For example, adding a new geometry type requires changes to `client/src/types.ts`, store actions in `useProjectStore`, mesh/tessellation helpers, and the render adapter/shader pipeline (plus selection logic if it still lives in `ViewerCanvas.tsx`). Work through these integration points systematically to ensure the feature works end-to-end.

Start implementations with the data model before building UI. Define TypeScript types for new entities, add them to the store state, implement store actions for CRUD operations, and verify the data model through simple tests or console experiments. Only after the data model is solid should you implement UI that displays and manipulates that data.

Use TypeScript's type system to guide implementation. The discriminated union pattern ensures that switch statements are exhaustive and that variant-specific fields are accessed safely. If TypeScript reports an error about unhandled cases or invalid property access, the type system is catching a genuine bug that would cause runtime errors. Fix the underlying issue rather than using type assertions to silence the error.

When debugging issues, use the React DevTools to inspect component state and the Zustand DevTools to inspect store state. Many bugs arise from state being out of sync with expectations or from components not subscribing to the correct state slice. Verify what state actually exists before assuming the problem is in the rendering logic.

Performance issues typically arise from excessive re-renders, large geometry tessellation, or inefficient raycasting. Profile before optimizing and focus optimization efforts on measured bottlenecks. Avoid premature optimization that complicates code without measurable benefit. The architecture is designed to support optimization when needed through techniques like memoization, viewport culling, and level-of-detail rendering.

## Testing and Validation

When implementing new features, verify them through both manual interaction and programmatic tests where appropriate. Geometry operations are particularly amenable to testing by asserting properties of output given known input. For example, verify that transformations preserve distances, that curve evaluation yields points on the curve, or that Boolean operations produce topologically valid results.

Integration testing is more valuable than unit testing for UI components. Tests that simulate user workflows and verify resulting state provide confidence that features work correctly in context. Focus testing effort on critical paths like geometry creation, transformation, selection, and undo rather than achieving high coverage of trivial code.

When making changes, verify that existing features still work. The undo system, selection behavior, and command execution are interconnected in ways that may not be immediately obvious. Changes to the store or viewport can break workflows that appear unrelated. Test representative user scenarios after making changes to catch regressions.

## Working Effectively with This Documentation

These documentation files provide the architectural foundation and coding conventions that should guide all development work. When starting a new feature, read the relevant sections of the architecture document to understand how the subsystems involved are designed to work together. Use the conventions document to ensure your implementation follows established patterns for naming, organization, and structure.

When you encounter patterns or design decisions that seem inconsistent with this documentation, first verify your understanding by reading the actual code. The documentation describes the intended architecture, but the implementation may have evolved. If you find genuine inconsistencies, note them for correction rather than assuming the documentation is definitive.

This guide and the related documentation files are living documents that should evolve as the architecture matures. When you implement new patterns or make architectural decisions, consider whether those patterns should be documented for future reference. The documentation serves future developers and AI agents who need to understand the system without extensive exploration.

Remember that the goal is not to follow rules rigidly but to build a coherent system where components integrate cleanly and patterns are consistent. Use this documentation as guidance for making good decisions, but apply judgment when specific situations call for deviations from established patterns. Document those deviations when they represent intentional architectural choices rather than expedient shortcuts.
