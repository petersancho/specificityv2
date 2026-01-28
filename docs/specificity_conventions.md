# Specificity Code Conventions

## File Organization Principles

The codebase follows consistent organization patterns that group related functionality while maintaining clear boundaries between subsystems. Files are organized by feature domain rather than technical role, meaning geometry-related code lives together in the geometry directory regardless of whether it contains types, utilities, or business logic.

Component files follow a consistent internal structure. Imports appear first, organized into external dependencies, internal absolute imports, relative imports, and type imports. Type definitions and interfaces specific to the component appear next, followed by constant definitions, then helper functions, and finally the component implementation itself. This ordering ensures that dependencies flow downward through the file and that type information appears before usage.

Utility functions are extracted to dedicated files when they serve multiple components or when they encapsulate complex logic that benefits from isolation. Simple utility functions that serve a single component remain colocated with that component. The math and geometry directories contain utilities that implement mathematical operations and geometric algorithms respectively, while the utils directory contains general-purpose helpers for DOM manipulation, formatting, and data transformation.

## Naming Conventions

Naming follows patterns that make purpose and scope immediately clear. Component files use PascalCase matching the exported component name, such as WebGLViewerCanvas.tsx or ModelerSection.tsx. Utility files and non-component modules use camelCase, such as registry.ts or vectorUtils.ts. Type definition files use camelCase with a descriptive suffix, such as types.ts or geometryTypes.ts.

Variables and functions use camelCase for local scope and for module exports. Constants use SCREAMING_SNAKE_CASE when they represent truly immutable configuration values, such as AXIS_HIT_RADIUS_MULTIPLIER or DEFAULT_GRID_SPACING. Constants that are merely initialized once but conceptually variable use camelCase, such as commandRegistry or defaultCameraState.

Type names use PascalCase for interfaces, type aliases, and discriminated union variants. Generic type parameters use single uppercase letters when the parameter represents a simple substitution, such as T or K, but use descriptive PascalCase names when the parameter has semantic meaning, such as GeometryType or NodeParameters.

React hooks follow the use-prefix convention and are named to indicate what they manage or compute, such as useProjectStore for the store hook, useGeometryRenderer for rendering logic, or useTransformSession for transform interaction state. Custom hooks that select specific slices from the store use descriptive names like useCameraState or useSelectedGeometry rather than generic names like useState or useData.

Store action functions use imperative verb phrases that describe the mutation they perform, such as addGeometry, updateSelection, setActiveCommand, or recordHistory. Action functions that perform complex operations use compound names that capture the full operation, such as addGeometryExtrude or applyTransformToSelection. Query functions that read from store state without mutation use descriptive noun phrases, such as getGeometryById or selectedComponents.

## TypeScript Type Patterns

The codebase uses discriminated unions extensively to model polymorphic data where a single field determines the variant and enables type narrowing. Geometry records use a type field with string literal types like "vertex", "polyline", "nurbsCurve", or "nurbsSurface". TypeScript's discriminated union support allows exhaustive pattern matching through switch statements, ensuring that all variants are handled and that variant-specific fields are accessed safely.

Type definitions for discriminated unions establish a base interface containing common fields and the discriminator, then extend that base for each variant with variant-specific fields. For example, geometry records share identifier, type, and optional metadata fields, while vertex geometry adds position, polyline geometry adds vertices, and NURBS geometry adds control points and knot vectors.

Interfaces are preferred over type aliases for object shapes that may be extended or implemented by classes. Type aliases are used for union types, discriminated unions, function signatures, and utility types. The codebase avoids deep type nesting and instead defines intermediate types with descriptive names that clarify the domain model.

Optional fields use the question mark syntax rather than union with undefined, making the optionality explicit in the type signature. Nullable fields that may be explicitly set to null use union types with null. This distinction makes it clear whether a field may be absent or whether null is a meaningful value.

Generic types are used sparingly and only when the type parameter genuinely varies across usage sites. The codebase avoids generic types that always receive the same type argument, instead using concrete types directly. When generic types are used, they include appropriate constraints to ensure type safety, such as extends keyof or extends GeometryRecord.

## State Management Patterns

The Zustand store is structured as a flat object with nested domain slices rather than normalized relational tables. The geometry slice contains a map from geometry identifiers to geometry records. The sceneNodes slice contains an array of scene node objects. The selection slice contains arrays of identifiers and component indices. This structure balances normalization for efficiency with denormalization for query convenience.

Store actions follow a consistent pattern of accepting parameters, validating those parameters against current state, computing new state values, and calling the Zustand set function with the update. Actions do not directly mutate state objects but instead create new objects with updated values. The set function receives an updater function that accepts the current state and returns the new state.

Complex actions that need to update multiple state slices do so in a single set call rather than multiple sequential calls, ensuring that subscribers see a single atomic update. The updater function may read from current state to compute new values but returns an object containing all changed slices.

History management integrates with store actions through a recordHistory function that captures a snapshot of relevant state before mutations occur. Actions that should be undoable call recordHistory before performing their mutation. Actions that represent transient state changes or that are invoked during undo/redo operations skip history recording to avoid polluting the history stack.

The store exposes selectors for common queries to avoid duplicating selection logic across components. Selectors are defined as functions that accept the full state and return a derived value. Components use these selectors through the useProjectStore hook, either by passing the selector directly or by creating a selector inline. Selectors should be pure functions that do not trigger side effects.

## WebGL and Rendering Patterns

The application uses a custom WebGL renderer to maintain direct control over the rendering pipeline and GPU resource management. Rendering code maintains explicit control over vertex buffers, shader programs, and rendering state to ensure optimal performance and visual quality. Custom shaders are written in GLSL and loaded as string resources, with shader compilation and linking handled explicitly during initialization. Three.js is used selectively for math helpers and primitive mesh generation.

Vertex buffer management follows a pattern of creating buffer geometry objects, populating them with typed arrays for position, normal, and UV attributes, and maintaining references to these buffers for efficient updates. When geometry changes, the rendering system updates buffer contents rather than recreating buffers when possible, reducing GPU memory allocation overhead. Index buffers are used for triangle meshes to reduce vertex duplication and improve cache performance.

Shader programs are organized by geometry type and rendering mode. Selection highlighting uses a dedicated shader that blends highlight colors with base materials. Preview geometry during interactions uses semi-transparent shaders with depth testing configured for proper occlusion. The custom shader architecture enables effects like screen-space outlines, anti-aliased line rendering, and distance-based level-of-detail switching that would be difficult to achieve with standard material systems.

Material systems manage shader uniforms for lighting parameters, camera matrices, and geometry-specific data. The rendering pipeline maintains a material cache that reuses shader programs across multiple geometry instances, reducing state changes and draw call overhead. Uniform updates are batched when possible to minimize CPU-GPU synchronization points.

Component props are defined through TypeScript interfaces that appear immediately before the component implementation. Prop interfaces use descriptive names that combine the component name with Props, such as WebGLViewerCanvasProps or GizmoProps. Required props appear first in the interface, followed by optional props. Callback props use on-prefix naming like onClick or onDragStart.

Components that subscribe to Zustand store state do so directly within the component body using the useProjectStore hook with selectors. Components avoid passing store state down through props when child components can subscribe directly. This pattern reduces prop drilling and ensures components only re-render when their specific state slice changes.

Local component state uses the useState hook for simple values and useReducer for complex state machines. Local state is preferred over store state when the state is truly component-local and does not need to persist beyond component unmount or affect other parts of the application. Examples include animation state, hover indicators, and local form inputs before submission.

Effects are used sparingly and primarily for synchronizing with external systems like DOM APIs, WebGL resources, or browser events. Effects that add event listeners clean up those listeners in the cleanup function. Effects avoid unnecessary dependencies by using functional updates for state setters and by extracting stable references for callback functions.

Refs are used to hold mutable values that do not trigger re-renders, such as WebGL handles, timeout handles, or previous props for comparison. Refs are also used for accessing DOM elements when imperative operations are necessary, such as focusing inputs or measuring dimensions. The pattern of using refs for session data during interactions is preferred over storing that data in state.

## Numerica Canvas Editor Patterns

The Numerica node editor uses canvas-based immediate-mode rendering where the entire graph is redrawn each frame based on current state. This rendering model differs fundamentally from retained-mode DOM approaches and requires careful management of rendering state and interaction handling. The canvas rendering loop runs at 60 frames per second when the graph is animating and drops to lower frame rates or pauses entirely when the graph is static to conserve resources.

The rendering pipeline organizes drawing operations into layers that execute in a specific order. The background layer draws the grid pattern and workspace background. The connection layer draws bezier curves representing edges between nodes. The node layer draws node backgrounds, borders, labels, and parameter controls. The overlay layer draws selection indicators, drag previews, and interaction feedback. This layered approach ensures proper visual ordering without requiring explicit z-index management.

Node rendering uses a template pattern where each node type provides a rendering function that receives a canvas context, node position, node size, and current state. The rendering function issues canvas drawing commands to render the node's visual representation, including background fills, border strokes, text labels, port indicators, and parameter value displays. The rendering system provides utility functions for common operations like drawing rounded rectangles, rendering text with automatic wrapping, and positioning port indicators at consistent locations.

Hit testing for mouse interaction uses manual geometric calculations rather than relying on DOM event targets. When the user clicks or moves the mouse over the canvas, the interaction system computes which node or port is under the pointer by testing the pointer position against node bounding rectangles and port hit areas. This manual hit testing provides precise control over interaction zones and enables features like tolerance-based edge selection where users can click near an edge curve rather than exactly on it.

Connection rendering uses cubic bezier curves that route smoothly between source and target ports. The curve control points are computed based on port orientations to create natural-looking connections that flow outward from ports before curving toward their targets. The rendering system supports custom connection styling including color, width, and dash patterns that can indicate connection state such as type compatibility or active data flow during evaluation.

The canvas editor maintains a view transform that maps world coordinates to screen coordinates, supporting zoom and pan operations similar to the modeling viewport. The view transform is stored as a translation vector and a scale factor, with all rendering operations applying this transform before drawing. Zooming centers on the pointer position for intuitive navigation, and panning drags the entire graph smoothly without lag or stutter.

## Geometry Kernel Conventions

Geometry functions are pure functions that accept geometry records and parameters and return new geometry records without mutating inputs. This functional approach ensures that operations can be undone by restoring previous state and that preview operations do not corrupt the model. Functions that need to modify geometry create shallow copies of the input record with updated fields.

Geometric computations use Three.js Vector3, Matrix4, and related classes for mathematical operations but do not expose Three.js types in the geometry record definitions. Geometry records store positions and vectors as plain arrays or objects to avoid coupling the data model to Three.js. Conversion between plain arrays and Three.js types occurs at the boundary between geometry functions and rendering code.

Geometry identifiers are generated using a simple counter or UUID rather than deriving them from content. This ensures that identifier generation is fast and that geometrically identical objects have distinct identities. Identifiers are stored as strings to support future distributed systems where UUIDs may be necessary.

Geometry operations that may fail, such as Boolean operations or intersections, return result objects that indicate success or failure rather than throwing exceptions. The result object pattern makes error handling explicit and allows calling code to decide how to respond to failure. Common failure modes include degenerate inputs, tolerance issues, and topological invalidity.

The kernel avoids premature optimization and instead focuses on correctness and clarity. Performance-critical operations can be optimized later with profiling guidance. The initial implementation prioritizes readable code with clear mathematical intent over micro-optimizations that obscure the algorithm.

## Testing Conventions

The codebase prioritizes testable design over high test coverage. Functions are written to be pure and deterministic when possible, enabling straightforward unit testing without complex mocking. Geometry operations are particularly amenable to testing by asserting properties of output geometry given known input geometry.

Tests for geometry operations verify mathematical correctness through property-based assertions rather than exact floating-point comparisons. For example, testing that a transformation preserves distances between points or that a curve evaluation yields positions on the curve within tolerance. This approach acknowledges floating-point imprecision while ensuring geometric validity.

Integration tests focus on user workflows rather than implementation details. These tests simulate user interactions like selecting geometry, executing commands, and manipulating the gizmo, then verify that the resulting state matches expectations. Integration tests use the actual store and component implementations rather than mocks to ensure realistic behavior.

Components are tested primarily through integration tests that render them in a test harness and simulate user interactions. Isolated unit tests are used for complex helper functions and algorithms but not for simple presentational components. The testing strategy emphasizes confidence in correctness over achieving specific coverage metrics.

## Documentation Conventions

Code documentation focuses on explaining why rather than what. The code itself should be clear enough that what it does is obvious, while comments explain the reasoning behind non-obvious design decisions, algorithmic choices, or workarounds for external constraints.

Complex algorithms include a prose description of the approach before the implementation, explaining the mathematical foundation or the overall strategy. This documentation helps future maintainers understand the intent when modifying the code or debugging issues.

Public APIs, including store actions and exported utility functions, include JSDoc comments that describe parameters, return values, and any preconditions or side effects. These comments serve both as documentation for developers and as input for TypeScript's language service to provide better autocomplete.

TODO comments are used sparingly and include context about why the work is deferred and what conditions would trigger completing it. TODOs should not be used for wish-list features but only for identified technical debt or incomplete implementations that affect correctness.

Architecture decisions are documented in this conventions file and in the architecture document rather than scattered through code comments. When code implements a specific architectural pattern, a brief comment may reference the relevant section of the architecture documentation rather than duplicating the explanation.
