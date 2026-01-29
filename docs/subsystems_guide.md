# Subsystems Deep Dive

## Geometry Kernel Implementation

The geometry kernel implements all mathematical operations needed for modeling without relying on external CAD libraries. The kernel represents geometry through a discriminated union of record types, where each record contains the minimal data needed to represent that geometric primitive plus metadata for scene integration.

### Vertex Geometry

Vertex geometry represents isolated points in 3D space and serves as the simplest geometric primitive. The vertex record contains a unique identifier, the type discriminator set to "vertex", and a position array containing three floating-point coordinates. Vertices may also carry optional metadata including layer assignment and display properties.

Vertex operations include transformation by matrix multiplication, proximity testing for selection, and snapping to grid or other geometric features. The transformation operation accepts a vertex record and a 4x4 transformation matrix, multiplies the position by the matrix to obtain a new position, and returns a new vertex record with the transformed position and the same identifier. This functional approach preserves the original vertex for undo purposes while creating the transformed result.

### Polyline Geometry

Polyline geometry represents connected sequences of line segments through an ordered array of vertex positions. The polyline record contains an identifier, the type discriminator "polyline", a vertices array holding position arrays for each vertex, and a closed boolean indicating whether the polyline forms a closed loop. Polylines serve as the foundation for planar shape creation and for defining profiles used in extrusion operations.

Polyline operations include transformation that applies matrices to all vertices, offsetting that generates parallel polylines at specified distances, subdivision that inserts vertices at parameter values, and Boolean operations that compute intersections and unions of coplanar polylines. The offset operation requires determining the offset direction for each segment and handling the corner joints where segments meet, using either miter joints for small angles or rounded or beveled corners for large angles.

Edge identification for component selection maps edge indices to pairs of consecutive vertices in the polyline. Edge zero connects vertex zero to vertex one, edge one connects vertex one to vertex two, and so forth. For closed polylines, the final edge connects the last vertex back to the first vertex. This indexing scheme enables consistent edge selection across all polyline geometry.

### NURBS Curve Geometry

NURBS curve geometry implements non-uniform rational B-spline curves through control points, knot vectors, degree specifications, and optional rational weights. The curve record contains an identifier, the type discriminator "nurbsCurve", a control points array holding position arrays for each control point, a knots array defining the parameter space structure, a degree integer specifying the polynomial degree, and an optional weights array for rational curves.

The knot vector determines how parameter values map to positions along the curve. A non-uniform knot vector allows the parameter space to be compressed or expanded in different regions of the curve, enabling features like sharp corners or exact representation of conic sections. The knot vector must satisfy specific constraints including being non-decreasing, having length equal to the number of control points plus degree plus one, and having sufficient multiplicity at endpoints for interpolation.

Curve evaluation uses the Cox-de Boor recursion to compute basis functions at a given parameter value, then combines those basis functions with control points to yield the curve position. The evaluation routine also computes first and second derivatives by evaluating derivative basis functions, enabling tangent and curvature computation for offsetting and analysis operations.

Curve operations include transformation that applies matrices to control points, insertion of knots to add control points without changing curve shape, degree elevation to increase polynomial degree, splitting at parameter values to produce two curve segments, and intersection with planes or other curves. These operations maintain the mathematical properties required for valid NURBS representations.

### NURBS Surface Geometry

NURBS surface geometry extends curve mathematics to two-parameter surfaces through control point grids, separate U and V knot vectors, degree specifications for each parametric direction, and optional weight grids for rational surfaces. The surface record contains an identifier, the type discriminator "nurbsSurface", a control points two-dimensional array, separate knots_u and knots_v arrays, degree_u and degree_v integers, and an optional weights grid.

Surface evaluation follows similar mathematics to curve evaluation but applies basis functions in both parametric directions. The evaluation computes basis functions for the U parameter using the U knot vector and degree, computes basis functions for the V parameter using the V knot vector and degree, and combines these basis functions in a tensor product with the control point grid to yield surface positions. Partial derivatives with respect to U and V enable normal vector computation and curvature analysis.

Surface operations include transformation, isoparametric curve extraction at constant U or V values, trimming that restricts the surface domain using boundary curves, offsetting that generates parallel surfaces, and Boolean operations for constructive modeling. The trimming operation requires storing trim curves in the surface's parameter space and testing whether evaluation parameters fall inside or outside the trimmed region.

### Extrusion Geometry

Extrusion geometry represents swept surfaces generated by moving a profile curve along a path curve. The extrusion record contains an identifier, the type discriminator "extrusion", a profile curve identifier referencing the curve to sweep, a path curve identifier referencing the sweep trajectory, and optional parameters controlling twist, scale, and orientation during the sweep.

Extrusions are evaluated on demand rather than converted to explicit NURBS surfaces during creation. This lazy evaluation preserves the parametric definition so that edits to the profile or path automatically update the extruded surface. The evaluation routine samples both curves at corresponding parameters, constructs transformation matrices that position and orient the profile along the path, and generates surface positions by transforming profile vertices.

The extrusion representation enables modeling operations like sweeping a circle along a path to create tubes, sweeping arbitrary profiles along straight or curved paths, and adjusting profile scale or twist as functions of path parameter. More complex swept surfaces that require precise control over orientation or scaling can use explicit NURBS surface representations generated from extrusion evaluation.

## State Management Implementation

The Zustand store implements a flat state structure with domain slices for geometry, scene organization, selection, camera, workflow, and interaction state. The store provides both state access through selectors and mutation through actions, maintaining a clear boundary between reading and writing state.

### Geometry State

The geometry slice maintains a map from geometry identifiers to geometry records. The map structure enables constant-time lookup by identifier while avoiding array scanning for update and delete operations. The geometry map stores heterogeneous geometry types using the discriminated union pattern, where each record's type field determines its variant.

Adding geometry requires generating a unique identifier, constructing the appropriate geometry record with that identifier, and inserting the record into the geometry map. The add action validates that the identifier is unique and that the geometry record is well-formed before performing the insertion. Remove operations delete entries from the map after verifying that no scene nodes or workflow nodes reference the geometry being removed.

Update operations replace existing geometry records with modified versions while preserving identifiers. The update action accepts an identifier and a new geometry record, verifies that a record with that identifier exists, and replaces the map entry. This functional update pattern ensures that components subscribing to specific geometry records receive new references when geometry changes, triggering appropriate re-renders.

### Selection State

The selection slice maintains both object-level and component-level selection through separate data structures. Object selection stores an array of geometry identifiers representing currently selected geometry. Component selection stores an array of component references, where each reference includes a geometry identifier, component type like "vertex" or "edge", and component indices identifying which specific vertices or edges are selected.

Selection modes determine how pointer interactions affect selection state. Object mode treats entire geometry entities as selection units, vertex mode enables selection of individual vertices, edge mode enables selection of edges between vertices, and face mode enables selection of polygonal faces. The mode affects both how raycasts interpret intersections and how the gizmo visualizes and manipulates the selection.

Selection actions include add that appends to current selection, remove that filters out specific entities, set that replaces selection entirely, and clear that empties selection. These actions operate on both object and component selection independently, enabling workflows where users select objects then switch to component mode to select specific features on those objects.

### Camera State

The camera slice stores the viewport's perspective including position, target, and up vector as three-dimensional vectors. Additional camera properties include orbit speed, pan speed, zoom speed, zoom-to-cursor preference, and upright constraint. The camera state determines the view matrix used for rendering and the inverse view matrix used for raycasting.

Camera updates occur primarily at the end of interaction sessions when the user completes an orbit, pan, or zoom gesture. The camera slice provides actions for setting position, target, and up vector atomically to ensure the camera remains in a valid configuration. Invalid configurations like position equal to target or degenerate up vectors are rejected with error messages.

The camera supports projection between screen space and world space through raycasting functions that construct rays from screen coordinates using the inverse view-projection matrix. These rays are used for pointer intersection testing, snap point identification, and construction plane definition.

### Workflow State

The workflow slice maintains separate collections of nodes and edges representing the computational graph. Nodes are stored as a map from node identifiers to node records, similar to geometry storage. Edges are stored as an array since edges are typically iterated rather than accessed by identifier.

Node records contain identifiers, type discriminators, position coordinates for graph layout, and parameter objects holding node-specific configuration. The node type determines what computation the node performs, what input and output ports it exposes, and what UI controls appear for parameter editing. Adding nodes generates unique identifiers, initializes default parameters based on node type, and places nodes at specified positions in the graph.

Edge records contain source node identifier, source port key, target node identifier, and target port key. The edge model enforces that only one edge connects to each input port while allowing multiple edges from a single output port. This constraint prevents ambiguity about which value should be used for an input when multiple connections exist. Edge validation verifies that referenced nodes exist and that port types are compatible before creating the connection.

## Viewport Implementation

The WebGLViewerCanvas component integrates the custom WebGL renderer, interaction logic, and geometry visualization into the Roslyn modeling environment. The component maintains explicit control over the WebGL rendering context, vertex buffers, index buffers, shader programs, and rendering state. The architecture separates geometry data management in the Zustand store from GPU resource management in the viewport, ensuring clean boundaries between business logic and rendering implementation.

### Rendering Pipeline

The rendering pipeline subscribes to geometry state from the store and maintains a mapping from geometry identifiers to WebGL buffer geometry and shader program references. When geometry is added, updated, or removed in the store, the rendering pipeline creates, updates, or disposes corresponding GPU resources. This reactive rendering ensures the viewport always reflects current geometry state while efficiently managing GPU memory.

Each geometry type has dedicated rendering logic that constructs appropriate WebGL buffer representations. Vertices render as small sphere meshes using a shared template to keep buffer generation consistent. Polylines render using line geometry with custom vertex and fragment shaders that provide anti-aliased rendering and proper depth testing. The line shader supports variable width and can render selection highlighting through additive color blending.

NURBS curves require tessellation before rendering, evaluating the curve at parameter samples to approximate its shape within screen-space tolerance. The tessellation routine computes an adaptive sample density based on viewport zoom level and curve curvature, using finer samples in regions of high curvature and coarser samples in nearly linear regions. The resulting position samples populate a vertex buffer that renders using the line shader. The tessellation result is cached and only recomputed when the curve geometry changes or when zoom level crosses tessellation thresholds.

NURBS surfaces similarly require tessellation, evaluating the surface at a grid of UV parameters to generate triangle mesh positions and normals. The tessellation uses a quadtree subdivision approach that adaptively refines the mesh based on surface curvature and screen-space error metrics. Each surface patch subdivides recursively until the screen-space deviation between the true surface and the triangle approximation falls below a pixel threshold. The resulting triangle mesh populates vertex and index buffers that render using a standard Phong shading model with selection highlight overlay.

Materials applied to geometry use custom shader programs rather than Three.js's standard materials. The base shader implements Phong lighting with diffuse, specular, and ambient terms, accepting uniform parameters for light positions and colors. The selection shader extends the base shader with an additive highlight color that blends with the base material color based on selection state. Preview geometry during command execution uses a semi-transparent shader variant with reduced opacity and modified depth testing to ensure preview geometry renders behind committed geometry.

### Selection System

The selection system operates through continuous raycasting from pointer position into world space combined with custom hit testing for precise component identification. The viewport subscribes to pointer move events and computes a ray from screen space through the camera's view frustum using the inverse view-projection matrix. This ray is tested against rendered geometry using the hit-testing routines in `client/src/geometry/hitTest.ts`, which combine ray/triangle tests with screen-space tolerances.

Object intersection returns an array of intersection results sorted by distance from the camera, where each result includes the intersected object, intersection point in world space, and distance along the ray. The selection logic filters these results to find the nearest selectable object, considering visibility flags and layer settings that may hide geometry from selection. The filtering ensures that hidden or locked geometry does not interfere with selection of visible objects.

Component selection requires additional logic beyond object intersection to identify specific vertices, edges, or faces. For vertex selection, the routine computes distances from the intersection point to each vertex position in the geometry and identifies the nearest vertex within a screen-space tolerance threshold. The tolerance is computed by projecting a fixed pixel radius into world space at the intersection point, ensuring that vertex selection difficulty remains constant across zoom levels. The vertex with minimum distance below the tolerance threshold becomes the selected component.

For edge selection, the routine tests proximity to line segments between adjacent vertices in the geometry. Each edge is represented as a line segment in world space, and the selection logic computes the closest point on each edge segment to the intersection point. The edge with minimum distance below tolerance becomes the selected component. Edge indices reference the vertex pair that defines the edge, using the polyline's vertex ordering to ensure consistent indexing.

For face selection, the intersection result already identifies which triangle was hit in the tessellated mesh. The selection logic maps this triangle back to the corresponding face in the original geometry, handling cases where a single parametric face tessellates into multiple triangles. Face indices reference the polygonal face definition in the geometry record, enabling operations like face extrusion or deletion to work with the parametric representation rather than the tessellated mesh.

Selection cycling enables users to select objects behind the foreground object by pressing Tab after an initial selection. The viewport maintains a pick stack containing all objects intersected by the current ray sorted by distance. Each Tab press advances through this stack, cycling selection to successively deeper objects. Moving the pointer resets the pick stack to reflect the new ray. The cycling logic wraps around to the nearest object after reaching the furthest object, enabling continuous cycling in both directions.

### Transform Sessions

Transform sessions follow a consistent pattern where the session begins when the user starts dragging a gizmo handle, continues through multiple drag events as the pointer moves, and concludes when the user releases the pointer. The session pattern provides preview rendering during drag and atomic commit at completion.

Session start captures the current selection's geometry records and the initial pointer position in world space. This snapshot preserves the original state for computing relative transformations and for undo purposes if the operation is cancelled. The session also establishes the transform mode such as translate, rotate, or scale based on which gizmo handle was activated.

During drag events, the viewport computes the current pointer position in world space, calculates the delta from the initial position, constructs a transformation matrix representing the cumulative transform, applies that matrix to the original geometry to generate preview geometry, and renders the preview without mutating store state. This preview loop provides immediate visual feedback while keeping the model state clean.

Session completion applies the final transformation to the original geometry through store actions that update geometry records atomically. The undo system records the pre-transform state before this update, enabling the user to revert the transformation. Cancelling the session through the Escape key discards the preview and restores the original geometry without recording history.

### Box Selection

Box selection enables selecting multiple objects or components by dragging a marquee rectangle across the viewport. The selection begins when the user presses the left mouse button with no gizmo handle active and no modifier keys held. The viewport captures the initial screen position and enters box selection mode.

During drag, the viewport renders a semi-transparent rectangle from the start position to the current pointer position using a screen-space overlay in the panel. This overlay provides immediate visual feedback showing the selection region. The rectangle boundary is drawn using CSS borders and background color with reduced opacity.

On release, the viewport projects the screen-space rectangle into 3D space by constructing rays from the four corners and intersecting those rays with the construction plane. These four intersection points define a 3D quadrilateral representing the selection region. The viewport then tests which geometry elements fall within or cross this quadrilateral.

The containment versus crossing behavior depends on drag direction. If the user drags from left to right, the selection uses containment mode where only elements entirely within the rectangle are selected. If the user drags from right to left, the selection uses crossing mode where elements that intersect or are contained by the rectangle are selected. This directional behavior matches professional CAD tools and enables precise control over what gets selected.

## Command System Implementation

The command system provides text-driven invocation of modeling operations through a central registry that maps command identifiers to metadata and execution logic. Commands serve as the primary mechanism for geometry creation and manipulation beyond direct viewport interaction.

### Command Registry

The command registry is a data structure that maps command identifiers to command definition objects. Each definition includes a unique identifier string, a human-readable label for display, a category for organization in command palettes, a description explaining the command's purpose, and parameter specifications describing what inputs the command expects.

Command definitions also include aliases that enable abbreviated input. For example, the "createRectangle" command might have aliases including "rect", "rectangle", and "r". The registry maintains a reverse mapping from aliases to canonical identifiers to support fuzzy command resolution.

The registry exports functions for querying commands by category, searching commands by text match against labels and descriptions, and resolving command identifiers from user input that may include aliases or partial matches. These functions enable the command palette UI to filter and display relevant commands as the user types.

### Command Parsing

Command parsing converts user text input into structured command requests. The parser accepts a string from the command input field, tokenizes the string into command identifier and argument tokens, resolves the identifier through the registry to handle aliases and partial matches, and constructs a command request object containing the resolved identifier and parsed arguments.

The parser supports both exact matches where user input equals a command identifier or alias exactly, and fuzzy matches where user input is a prefix of a unique command identifier or alias. Ambiguous inputs that match multiple commands are rejected with an error message listing the possible matches.

Some commands accept arguments passed as additional tokens after the command identifier. The parser extracts these tokens and associates them with the command request. The command execution logic then interprets arguments based on the specific command's requirements. For example, a create primitive command might accept a size argument to determine the primitive's dimensions.

### Command Execution

Command execution dispatches command requests to appropriate handler functions based on the command identifier. Handlers validate that current application state satisfies the command's requirements, such as having geometry selected for commands that modify selection, configure the viewport for modal interaction if the command requires pointer input, and either perform immediate action or enter command mode to collect input.

Immediate commands perform their operation directly and complete in a single invocation. For example, a delete command verifies that geometry is selected, removes the selected geometry through store actions, records history for undo, and completes. The command does not change viewport interaction mode and does not require additional user input.

Modal commands change viewport interaction behavior until the command completes or is cancelled. For example, the rectangle command enters a mode where the first pointer click establishes the first corner, subsequent pointer movement renders a preview rectangle from the first corner to the current pointer position, and the second click establishes the second corner and creates the final rectangle geometry. Modal commands maintain state in the store's active command slice that tracks what stage of input collection is current and what data has been collected so far.

## Workflow System Implementation

The workflow system implements visual programming through computational graphs where nodes represent operations and edges represent data flow between operations. The system provides graph editing, evaluation with caching, and integration with geometry modeling.

### Node Type System

Node types are defined through a registry similar to the command registry. Each node type has an identifier, display metadata, port specifications defining inputs and outputs, parameter schema defining configuration options, and a compute function that evaluates the node given input values.

Input port specifications include a port key used in edge definitions, a display label, a type describing what values the port accepts, and whether the port is required or optional. Output port specifications similarly include key, label, and type. The type system supports basic types like number, string, and boolean plus geometry types that reference geometry records in the store.

The parameter schema defines what configuration controls appear in the node's UI and what values those controls produce. Parameters might include numeric inputs with ranges, text inputs with validation, dropdowns with preset options, or checkboxes for boolean flags. The parameter values are stored in the node record and passed to the compute function during evaluation.

The compute function is a pure function that accepts an object containing input values keyed by port identifier and the node's parameter values, performs the necessary computation, and returns an object containing output values keyed by port identifier. Compute functions should not trigger side effects, mutate global state, or access the store directly to ensure evaluation is deterministic and cacheable.

### Graph Evaluation

Graph evaluation uses a pull-based lazy model where output values are computed on demand by recursively evaluating dependencies. When a downstream node or an external consumer requests a node's output, the evaluator checks whether a cached result exists for that output and whether the cache is still valid. If a valid cache exists, the cached value is returned immediately without recomputation.

If no valid cache exists, the evaluator identifies all input ports connected to the requested node, recursively evaluates the upstream nodes that provide those input values, collects the input values into an input object, invokes the node's compute function with the inputs and parameters, caches the result, and returns it to the caller.

Cache invalidation uses dirty flags that mark cached values as stale when conditions change. Setting a node's parameters marks that node's cached outputs as dirty. Invalidating a node's outputs propagates downstream to mark all dependent nodes' outputs as dirty as well. This cascading invalidation ensures that the graph recomputes exactly the nodes affected by parameter changes.

The evaluator handles cyclic dependencies by detecting when a node appears in its own upstream dependency chain and reporting an error. Cycles would cause infinite recursion during evaluation and represent invalid graph topology. The graph editing UI should prevent cycle creation, but the evaluator includes cycle detection as a defensive measure.

### Custom Node Editor Architecture

The ReactFlow replacement now uses a single HTML5 canvas (`NumericalCanvas.tsx`) that renders the entire graph in immediate-mode. A `requestAnimationFrame` loop clears the canvas, applies the current pan/zoom transform, and draws the background grid, connections, nodes, and overlays in a fixed order. Nodes render as rounded rectangles with text labels, ports render as circles along the left/right edges, and edges render as cubic bezier curves with dashed previews during edge creation.

All interaction is handled through manual hit testing in canvas space. Pointer events test ports first, then nodes, then the background to decide between edge creation, node dragging, or panning. Drag sessions capture starting positions, update live preview positions in memory, and commit final node positions to the Zustand store on release to preserve undo/redo semantics. Edge creation validates port targets before committing connections to the workflow graph.

Because the workflow editor is fully canvas-driven, there are no DOM node elements or SVG overlays. Visuals and hit testing are implemented within the draw loop, ensuring consistent performance for large graphs while preserving the existing data model and evaluation behavior.

## Subsystem Integration Checklist

- Geometry changes: update kernel ops, render adapter, hit testing, and persistence.
- Workflow changes: update node registry, validation, compute functions, and canvas UI.
- Command changes: update registry, input parsing, undo/redo integration, and help text.
- Rendering changes: update shaders, display mode definitions, and style docs.

## Known Coupling Points

- Render adapter depends on geometry types and tessellation helpers.
- Hit testing depends on both kernel math and render-time tessellation density.
- Workflow evaluation depends on node registry and store invalidation rules.
- Command modal behavior depends on viewport interaction session patterns.
