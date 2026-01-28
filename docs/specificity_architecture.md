# Specificity Architecture

## System Overview

Specificity is a custom-built parametric design environment that combines direct 3D modeling with visual programming through a dual-panel workspace architecture. The system is intentionally designed without reliance on third-party geometry libraries or node editor frameworks, providing complete control over the modeling kernel and computational graph execution.

The application presents two primary interaction surfaces that share a unified state model. Roslyn serves as the direct manipulation 3D modeling environment where users create and edit geometry through viewport interactions and command-driven workflows. Numerica provides the visual programming interface where users construct parametric definitions and computational graphs. Both panels operate on the same underlying geometry and project state, enabling bidirectional workflows where models can inform graph definitions and graphs can generate or modify geometry.

## Architecture Principles

The system architecture follows several core principles that guide implementation decisions. First, the geometry kernel is custom-built and maintains full ownership of all geometric representations, from primitive vertices through complex NURBS surfaces. This eliminates dependency on external CAD libraries and provides precise control over geometric operations, selection behavior, and history management.

Second, the state management layer uses Zustand to maintain a single source of truth that encompasses geometry data, scene organization, camera state, selection, workflow graphs, and command history. This centralized state enables time-travel debugging, undo/redo across all subsystems, and clean separation between UI and business logic.

Third, the rendering system uses a custom WebGL renderer with explicit control over buffers, shader programs, and GPU state. Three.js is used selectively for math helpers and primitive mesh generation, while rendering itself stays in the in-house pipeline. This approach enables precise control over visual quality, performance optimization, and integration with custom geometry evaluation routines.

Fourth, the node editor uses a bespoke HTML canvas renderer (`NumericalCanvas`) that provides complete control over graph layout, connection drawing, node rendering, and interaction behavior. The canvas-based approach enables high-performance rendering of large graphs, custom visual styling with immediate-mode rendering patterns, and precise control over hit testing and interaction feedback. This architecture moves away from DOM-based node editors toward a rendering model that matches the performance characteristics of professional node-based tools.

## Repository Structure

The repository uses a monorepo structure with clear separation between client and server concerns. The root level contains shared tooling configuration, environment templates, and documentation. The client directory houses the Vite-based React application that implements both modeling and node editor interfaces. The server directory provides a minimal Node.js backend for project persistence and potential future collaboration features.

Within the client source tree, the organization reflects functional subsystems rather than technical layers. The components directory contains UI implementations organized by feature area, with modeler components separated from workflow components. The store directory houses the Zustand state management layer. The commands directory implements the command registry and parsing logic. The geometry and math directories contain the custom geometry kernel and mathematical utilities. The types directory provides TypeScript definitions shared across the application.

## State Management Architecture

The Zustand store serves as the application's central nervous system and maintains several distinct but related domains of state. The geometry domain tracks all geometric entities in the model, including vertices, polylines, NURBS curves, NURBS surfaces, and extrusions. Each geometry record carries a unique identifier, type discriminator, vertex data, and optional metadata such as layer assignment and material references.

The scene graph domain organizes geometry into a hierarchical structure supporting grouping, nesting, and visibility management. Scene nodes reference geometry by identifier and carry transformation matrices, layer assignments, and visibility flags. This separation between geometry data and scene organization enables the same geometry to appear multiple times with different transforms or to exist in the model without being rendered.

The selection domain maintains both object-level and component-level selection state. Object selection tracks which geometry entities are selected by identifier. Component selection provides sub-object selection for vertices, edges, and faces, storing component indices relative to their parent geometry. The selection mode determines how pointer interactions interpret raycasts and how the gizmo visualizes and manipulates selected elements.

The camera domain preserves the viewport's perspective including position, look-at target, up vector, and interaction preferences such as orbit speed, pan speed, zoom behavior, and upright constraint. Changes to camera state are committed to the store at the end of interaction sessions, enabling undo/redo of viewport navigation.

The workflow domain stores the node graph as separate collections of nodes and edges. Nodes carry unique identifiers, type discriminators, position coordinates for layout, and parameter values. Edges reference source and target nodes by identifier and specify which output port connects to which input port. The workflow state also tracks execution results and caching state for lazy evaluation.

The command and interaction domain maintains transient state for active modeling sessions. This includes the currently active command identifier, placement plane definitions for commands that require construction plane specification, extrusion session data during extrude operations, and transform session data during gizmo manipulation. This state is intentionally not persisted and exists only during active interaction.

## Geometry Kernel Design

The geometry kernel provides the mathematical foundation for all modeling operations and is implemented entirely in TypeScript without external geometry libraries. The kernel is organized around a type-discriminated union of geometry records, where each record type encapsulates the minimal data needed to represent that geometric primitive.

Vertex geometry represents isolated points in 3D space and carries position coordinates plus optional metadata. Polyline geometry represents connected sequences of line segments through an ordered array of vertex positions. The polyline type supports both open and closed configurations and forms the foundation for planar shape creation.

NURBS curve geometry implements non-uniform rational B-spline curves through control points, knot vectors, degree specification, and optional rational weights. The kernel provides evaluation routines for computing positions and derivatives at arbitrary parameters, enabling operations like curve offsetting, subdivision, and arc-length parameterization.

NURBS surface geometry extends the curve mathematics to two-parameter surfaces through control point grids, separate U and V knot vectors, degree specifications for each direction, and optional weight grids for rational surfaces. Surface evaluation yields positions, partial derivatives, and normal vectors at any UV coordinate pair.

Extrusion geometry represents swept surfaces generated by moving a profile curve along a path. The geometry record stores references to the profile curve identifier and path curve identifier plus extrusion-specific parameters. The kernel evaluates extrusions on demand rather than converting them to explicit NURBS surfaces, preserving the parametric definition for future edits.

The kernel provides geometric operations as pure functions that accept geometry records and return new geometry records rather than mutating in place. Common operations include transformations that apply 4x4 matrices to geometry, booleans that compute intersections and unions of compatible types, offsetting that generates parallel curves or surfaces at specified distances, and subdivision that splits geometry at parameter values.

Selection testing is integrated into the kernel through raycasting and proximity queries. The kernel provides functions to test ray intersection with each geometry type, computing both intersection points and parameter values. For component selection, the kernel offers functions to identify edges and faces within tolerance of pointer positions or within selection volumes.

## 3D Viewport Architecture

The WebGLViewerCanvas component serves as the core of the Roslyn modeling environment and integrates custom WebGL rendering, interaction logic, geometry rendering, and gizmo manipulation into a cohesive viewport experience. The component maintains direct control over the WebGL rendering context, shader programs, and GPU resource management while delegating geometry and selection mutations to the Zustand store.

The rendering pipeline subscribes to geometry state from the store and maps each geometry record to appropriate WebGL buffer geometry and shader programs. The pipeline maintains direct control over vertex buffers, index buffers, and attribute configurations to optimize rendering performance. Vertices render as instanced sphere geometry with custom shaders for selection highlighting. Polylines render using line geometry with custom line shaders that support anti-aliasing and width control. NURBS curves and surfaces require tessellation before rendering, converting the parametric definitions into triangle meshes at appropriate resolution based on viewport zoom level and storing the results in efficiently packed vertex buffers. Extrusions similarly tessellate on demand, evaluating the swept surface into renderable triangles with proper normal and UV attribute generation.

The selection system uses a multi-phase approach that combines pointer raycasting, object intersection testing, and component identification. When the pointer moves over the viewport without active interaction, the component continuously raycasts from screen space into world space and tests intersection against all visible geometry. Hit testing is handled by custom math routines in the geometry layer, which combine ray/triangle tests with screen-space tolerances for component selection.

For component selection modes, the viewport identifies not just which geometry was hit but which specific vertex, edge, or face was nearest to the ray. Edges are identified by testing proximity to line segments between adjacent vertices. Faces are identified by testing which polygon in the tessellated mesh was intersected. The component selection state in the store then references these sub-elements by index relative to their parent geometry.

Box selection operates through a separate interaction mode triggered by left-drag gestures when no gizmo handle is active and no modifier keys are pressed. The viewport captures the starting screen position when the pointer goes down, tracks the current screen position during drag, and renders a translucent screen-space rectangle overlay. On pointer release, the viewport projects the rectangle into 3D space using the construction plane, tests which geometry elements fall within or cross the selection volume, and updates the selection state accordingly.

The gizmo integration follows a session-based pattern where the gizmo component emits start, drag, and end events as the user manipulates transform handles. WebGLViewerCanvas responds to these events by establishing a transform session that captures the original geometry state, computing incremental transformations as the pointer moves, applying those transformations to generate preview geometry, and committing the final transformation to the store on session completion. This pattern ensures that each transform operation is atomic for undo/redo purposes and that preview rendering does not corrupt the underlying geometry data.

## Command System Design

The command system provides a text-driven interface for invoking modeling operations and serves as the primary mechanism for users to create geometry, modify selections, and change viewport state. Commands are defined in a central registry that maps command identifiers to metadata including display labels, category assignments for organization, and parameter specifications that describe what inputs the command expects.

Command execution follows a request-response pattern where user input is parsed into structured command requests, validated against the command registry, and dispatched to handler functions that perform the actual operations. The parsing layer accepts both exact command identifiers and fuzzy aliases, enabling users to type abbreviated forms while maintaining unambiguous command resolution.

Many commands operate modally, meaning they change the viewport's interaction behavior until completed or cancelled. For example, the rectangle command changes pointer behavior to collect two corner points, renders preview geometry as the second point moves, and finalizes the rectangle geometry when the user confirms the second point. The active command state in the store tracks which command is currently controlling interaction and what data has been collected so far.

Commands that create geometry follow a consistent pattern of construction plane acquisition, point collection through snapping, preview rendering, and final geometry creation. Commands that modify geometry typically require selection first, validate that the selection matches the expected type, perform the geometric operation using kernel functions, and update the store with the modified geometry. Commands that change viewport or selection state directly mutate the appropriate store slices.

The command system integrates with the undo/redo history through the store's history management layer. Each command that modifies geometry or selection state records a history entry before execution, enabling the user to step backward through their modeling sequence. Commands that only change transient state like active tool or preview data do not generate history entries.

## Workflow System Architecture

The Numerica workflow system provides visual programming capabilities where users construct computational graphs that can generate geometry, analyze models, or drive parametric relationships. The workflow implementation uses a custom HTML5 canvas renderer that draws the entire node graph directly using immediate-mode rendering patterns.

The workflow data model represents graphs as separate collections of nodes and edges stored in the Zustand store. Each node carries a unique identifier generated at creation time, a type discriminator that determines what operation the node performs, a position object for graph layout, and a parameters object holding node-specific configuration values. Nodes expose input ports and output ports based on their type, where ports are identified by string keys and carry type information.

Edges represent connections between node ports and are stored as records containing source node identifier, source port key, target node identifier, and target port key. The edge model enforces type compatibility at connection time, preventing users from connecting output ports to incompatible input ports. The workflow system maintains edge uniqueness, allowing only one edge to connect to each input port while permitting multiple edges from a single output port.

Graph evaluation uses a pull-based lazy model where output values are computed on demand by recursively evaluating upstream dependencies. When a node's output is requested, the evaluator first checks if a cached result exists and is still valid. If no valid cache exists, the evaluator recursively requests values from all connected input ports, collects those values into a parameter object, invokes the node's compute function with the parameters, caches the result, and returns it to the downstream caller.

The cache invalidation strategy uses dirty flags that propagate downstream when node parameters change or when upstream dependencies are invalidated. This ensures that the graph only recomputes the minimal set of nodes needed to reflect parameter changes while avoiding redundant evaluation of stable subgraphs.

The NumericalCanvas implementation renders the node graph using immediate-mode drawing commands during each frame. The renderer iterates through all visible nodes, computes their screen positions based on current zoom and pan state, draws node backgrounds and borders using canvas fill and stroke operations, renders node labels and parameter values as text, draws connection curves as bezier paths between port positions, and handles mouse interaction through manual hit testing against node and port boundaries. This canvas-based approach provides superior performance for large graphs compared to DOM-based rendering and enables precise control over visual styling including custom fonts, anti-aliasing, and animation effects.

## Data Flow and Integration

The application's data flow follows clear patterns that maintain separation of concerns while enabling tight integration between subsystems. The Zustand store serves as the data hub, with all subsystems reading from store state and dispatching actions to mutate state. UI components subscribe to specific slices of state and re-render when those slices change, ensuring minimal re-render scope.

The modeling viewport reads geometry, selection, and camera state from the store, renders that state through WebGL buffer geometry and custom shaders, captures user interactions through pointer and keyboard events, and dispatches store actions to reflect interaction outcomes. The viewport never directly mutates geometry or selection but instead calls store actions that validate inputs, compute new state, and update the store atomically.

The workflow editor reads node and edge state from the store, renders the graph using canvas drawing operations, captures user interactions through canvas pointer events and manual hit testing, and dispatches store actions to update node positions, parameters, or graph topology. When workflow nodes reference geometry, they store geometry identifiers that resolve to actual geometry records through store lookups at evaluation time. The canvas-based rendering enables the workflow editor to handle thousands of nodes efficiently while maintaining responsive interaction and smooth animation.

The command system reads active command state and selection state from the store, interprets user text input into command requests, validates those requests against selection state and command requirements, executes command logic that may involve multiple store actions, and clears command state when operations complete. Commands can trigger geometry creation in the modeling kernel, selection changes, or workflow graph modifications.

The persistence layer serializes the complete store state to JSON for saving and deserializes saved JSON to restore state on load. The serialization process captures geometry records, scene graph nodes, workflow graphs, layer definitions, material assignments, and project metadata. Camera state and selection state are typically excluded from persistence as transient session state. The server provides endpoints for listing available projects, loading project JSON, and saving updated project JSON.

## AI Agent Development Guidance

When working with AI agents on this codebase, several architectural patterns should guide implementation decisions. First, maintain strict separation between state management and UI concerns. All application state lives in the Zustand store, and all mutations occur through store actions. UI components should be purely presentational when possible, reading from store subscriptions and calling store actions in response to events.

Second, preserve the geometry kernel's functional purity. Geometry operations should accept input geometry records and return new records rather than mutating in place. This functional approach enables history management, ensures that preview operations do not corrupt the model, and makes geometry operations testable in isolation.

Third, follow the session pattern for interactive operations. Complex interactions like transforms, extrusions, and command execution should capture initial state at session start, accumulate changes during interaction, and commit final state at session end. This pattern provides clear atomicity for undo/redo and enables preview rendering without state corruption.

Fourth, use type discriminators consistently for polymorphic data. Geometry records, scene nodes, workflow nodes, and commands all use a type field to discriminate between variants. TypeScript discriminated unions should be used to model these types, enabling exhaustive pattern matching and type-safe access to variant-specific fields.

Fifth, keep rendering logic separate from geometric computation. The viewport should map geometry records to renderable WebGL buffers but should not perform geometric operations directly. The workflow editor should render node graphs but should delegate evaluation to a separate graph evaluator. This separation enables testing of geometric and computational logic without UI dependencies.

When implementing new features, consider how they integrate with the existing subsystems. New geometry types need kernel operations, viewport rendering, selection support, and persistence serialization. New commands need registry entries, input validation, preview rendering if applicable, and store integration. New workflow node types need type definitions, compute functions, port specifications, and UI rendering. This systematic integration ensures features work consistently across the application.
