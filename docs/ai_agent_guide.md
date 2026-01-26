# AI Agent Development Guide

## Understanding This Codebase

When you are asked to work on Specificity, you are working on a custom-built parametric design system that intentionally avoids third-party geometry libraries and uses direct WebGL rendering with canvas-based UI. The entire geometry kernel is custom code, and the node editor uses ETO.forms, a canvas-based rendering system that draws graphs using immediate-mode rendering patterns. This means you cannot rely on external library documentation for core functionality, and you should instead understand the internal architecture deeply before making changes.

The system consists of two major interaction surfaces that share unified state. Roslyn is the direct manipulation 3D modeling environment where users create and edit geometry through viewport interactions and command-driven workflows. Numerica is the visual programming interface where users construct parametric definitions and computational graphs. Both panels operate on the same Zustand store, enabling bidirectional workflows where models inform graphs and graphs generate geometry.

Before implementing any feature, you must understand which subsystems it touches and how those subsystems integrate. A new geometry type affects the kernel, the viewport renderer, the selection system, the persistence layer, and potentially the command system. A new workflow node type affects the node type registry, the evaluator, the node renderer, and the parameter UI. Understanding these integration points prevents incomplete implementations that work in isolation but fail when composed with existing features.

## Working with the Geometry Kernel

The geometry kernel is the mathematical foundation of the modeling system and implements all geometric operations as pure functions that accept geometry records and return new geometry records without mutation. When implementing new geometry types or operations, you must maintain this functional purity to ensure history management works correctly and preview operations do not corrupt the model.

Geometry records use a discriminated union pattern with a type field that determines the variant. Each geometry type has required fields that appear in all variants, such as identifier and type, plus variant-specific fields like position for vertices or controlPoints for NURBS curves. When adding a new geometry type, you must extend the GeometryRecord discriminated union, implement rendering for that type in ViewerCanvas, add selection support, implement persistence serialization, and provide geometric operations like transformation and intersection.

Geometric computations use Three.js classes for mathematical operations but store results as plain arrays or objects in geometry records. This separation prevents coupling the data model to Three.js and enables future migration to different rendering systems. When implementing geometric operations, convert between plain arrays and Three.js Vector3 or Matrix4 at the function boundary, perform the computation using Three.js math utilities, and convert back to plain arrays for storage.

Tolerance management is critical for geometric operations. The kernel uses consistent epsilon values for proximity testing, intersection computation, and degeneracy checks. When implementing new operations, use the established tolerance constants rather than hard-coding values. Document any tolerance assumptions and ensure operations handle near-degenerate cases gracefully rather than failing catastrophically.

## Working with the State Store

The Zustand store is the single source of truth for all application state and follows specific patterns that must be preserved when adding new state or actions. State is organized into domain slices like geometry, selection, camera, and workflow, with each slice containing related data. When adding new state, place it in the appropriate existing slice or create a new slice if the data represents a distinct domain.

Store actions follow a consistent pattern of validation, computation, and atomic update. Actions accept parameters, validate those parameters against current state, compute new state values, and call the set function once with all changes. Actions must not call set multiple times for a single logical operation, as this causes unnecessary re-renders and breaks the atomicity of the operation for undo purposes.

History management integrates with actions through recordHistory calls that capture state snapshots before mutations. When implementing actions that modify geometry, selection, or other undoable state, you must call recordHistory before performing the mutation. Actions that represent transient changes like cursor position or preview data should not record history. Understanding which actions are undoable and which are transient is critical for maintaining a coherent undo stack.

Selectors are used to derive values from store state without duplicating computation across components. When components need to access the same derived value, extract a selector function that can be shared. Selectors should be pure functions that do not trigger side effects and that return stable references when the underlying data has not changed. Use shallow equality checks or memoization when appropriate to prevent unnecessary re-renders.

## Working with the 3D Viewport

ViewerCanvas is the heavyweight component that integrates WebGL rendering through Three.js, custom interaction logic, geometry rendering, and gizmo manipulation. The component maintains direct control over the WebGL rendering context, vertex buffers, shader programs, and rendering state. When modifying viewport behavior, understand the boundary between local interaction state and persisted model state, and maintain explicit control over GPU resource management.

The rendering pipeline maps geometry records from the store to WebGL buffer geometry. Each geometry type has dedicated rendering logic that creates appropriate buffer representations with explicit vertex attributes. When adding support for new geometry types, implement rendering logic that creates buffer geometry with proper position, normal, and UV attributes, uses appropriate shader programs based on selection state and rendering mode, and tessellates parametric geometry at resolution suitable for the current zoom level. Shader programs are written in GLSL and managed explicitly, with uniform updates batched to minimize CPU-GPU synchronization overhead.

Selection operates through raycasting and WebGL-based picking. The viewport continuously raycasts from pointer position into world space and tests intersection against rendered geometry using Three.js raycasting utilities. Selection logic must understand both object-level selection and component-level selection for vertices, edges, and faces. When extending selection to new geometry types, implement component identification logic that determines which sub-element is nearest to the ray, considering the tessellated mesh representation rather than the parametric definition.

The gizmo system follows a session pattern where interactions begin with onStart, continue through multiple onDrag calls, and conclude with onEnd. ViewerCanvas maintains session state that captures original geometry, accumulates transformations during drag, renders preview geometry using semi-transparent shaders, and commits final transformations on session end. The gizmo itself is rendered using custom shader programs that provide consistent visual appearance regardless of camera distance or orientation. When adding new transform modes, follow this session pattern and ensure preview rendering uses appropriate shader configurations.

Box selection uses a different interaction mode triggered by left-drag when no gizmo is active. The viewport captures screen-space rectangle coordinates, projects them into 3D space using the construction plane, tests geometry for containment or crossing, and updates selection on release. Extending box selection to new geometry types requires implementing containment testing for those types.

## Working with Commands

The command system provides text-driven invocation of modeling operations through a registry of command definitions. Commands may operate immediately on selected geometry or may enter modal interaction modes that capture pointer input. When implementing new commands, register the command with appropriate metadata, implement validation logic to verify selection requirements, and handle both immediate and modal execution patterns.

Modal commands change viewport interaction behavior until the command completes or is cancelled. For example, the rectangle command captures two corner points through pointer clicks, renders preview geometry as the second point moves, and creates final geometry when the user confirms. When implementing modal commands, track command state in the activeCommandId field, collect input through pointer event handlers, render preview geometry without mutating the store, and commit final geometry through store actions on completion.

Commands that create geometry typically require construction plane specification to determine the plane in which new geometry is created. The command system supports automatic C-plane determination from selected geometry or explicit plane specification through point collection. When implementing geometry creation commands, follow the established pattern of plane acquisition, point snapping, preview rendering, and final creation.

Commands integrate with the undo system through the same history mechanism as direct manipulations. Command execution that modifies geometry should record history before performing mutations. Commands that only change viewport state or selection typically do not need history recording. The recordHistory call should capture state immediately before the command's mutations begin.

## Working with the Workflow System

The workflow system uses ETO.forms, a canvas-based rendering system that draws the entire node graph using immediate-mode rendering patterns. When working on workflow features, implement them with an understanding that the graph is redrawn every frame using canvas drawing commands rather than persisting as DOM elements. The core workflow data model of nodes and edges stored in the Zustand store remains the architectural foundation, while the ETO.forms canvas handles presentation and interaction.

Workflow nodes use a discriminated union pattern similar to geometry records, with a type field determining the node variant and variant-specific parameters. When adding new node types, define the type in the node registry, implement the compute function that evaluates the node given input values, specify input and output port definitions, and implement the canvas rendering function that draws the node's visual representation using canvas API calls. The rendering function receives a canvas context, node bounds, and current state, and issues drawing commands to render backgrounds, borders, labels, ports, and parameter values.

Graph evaluation uses a pull-based lazy model where values are computed on demand by recursively evaluating dependencies. The evaluator maintains a cache of computed values and dirty flags that propagate when parameters change. When implementing node compute functions, assume that input values are already evaluated and available, perform the necessary computation, and return the output value. Do not trigger side effects from compute functions or mutate global state, as this would break the caching and invalidation mechanisms.

The ETO.forms canvas implementation requires explicit hit testing for mouse interactions. When implementing interactive features like node dragging or connection creation, you must manually test whether the pointer position falls within node bounds, port hit areas, or connection curves. The hit testing system provides utility functions for testing points against rectangles, circles, and bezier curves. Use these utilities to maintain consistent interaction behavior across the node editor. Connection creation uses a drag session pattern where pointer down on a port begins the session, pointer move renders a preview connection curve, and pointer release on a compatible port creates the final edge or cancels if released over empty space.

## Common Implementation Patterns

When implementing features that span multiple subsystems, follow established integration patterns. For example, adding a new geometry type requires changes to the geometry kernel, viewport renderer, selection system, persistence layer, and potentially the command system. Work through these integration points systematically to ensure the feature works end-to-end.

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
