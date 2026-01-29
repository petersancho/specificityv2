# Numerica: WebGL Canvas Node Graph Editor Technical Specification

## Executive Overview

Numerica represents the computational graph subsystem within Lingua, providing visual programming capabilities through a custom WebGL canvas-based node editor. The system diverges from traditional DOM-based node editors by rendering the entire graph interface directly to an HTML5 canvas element using immediate-mode rendering patterns. This architectural decision delivers superior performance for large graphs containing hundreds or thousands of nodes, eliminates DOM layout overhead, and provides precise control over rendering quality, animation timing, and interaction feedback.

The canvas-based approach necessitates implementing graph layout, connection routing, node rendering, and hit testing from foundational principles rather than relying on browser layout engines or existing node editor frameworks. The implementation maintains a clear separation between the graph data model stored in the Zustand state management layer and the presentation layer that renders the graph to the canvas. This separation ensures that the computational graph evaluation system operates independently of the rendering implementation, enabling future architectural evolution such as headless graph execution or alternative rendering backends.

The WebGL canvas editor integrates deeply with the geometry modeling system through geometry reference data types that flow through node connections. Nodes can generate geometry primitives, transform existing geometry, perform Boolean operations, extract measurements, and create parametric relationships between geometric elements. The evaluation system uses pull-based lazy computation with aggressive caching to ensure that large computational graphs execute efficiently even when parameter changes affect only small subsets of the graph.

## Canvas Rendering Architecture

The Numerica canvas rendering system centers on a single HTML5 canvas element that occupies the workflow panel viewport. The canvas element receives pointer events for interaction and provides a 2D rendering context through which all graph visualization occurs. The rendering architecture follows immediate-mode patterns where the entire visible portion of the graph is redrawn during each frame rather than maintaining persistent visual elements that update incrementally.

The render loop executes at variable frame rates depending on interaction state and animation requirements. During active interaction such as node dragging, connection creation, or viewport panning, the render loop targets sixty frames per second to provide smooth visual feedback. During idle periods when the graph remains static and no animations are active, the render loop drops to lower frame rates or pauses entirely to conserve CPU resources and battery power. The render loop monitors input events and viewport state changes to determine when frame rate increases are necessary.

Frame rendering proceeds through a series of layered drawing operations that execute in a specific order to achieve proper visual composition. The background layer draws first, establishing the workspace surface and grid pattern that provides spatial reference. The connection layer draws second, rendering bezier curves that represent edges between nodes. The node layer draws third, rendering node backgrounds, borders, titles, parameters, and port indicators. The overlay layer draws last, rendering selection highlights, drag previews, connection creation feedback, context menus, and tooltip overlays.

Each layer maintains its own rendering state and does not interfere with subsequent layers. The rendering system saves and restores the canvas context state between layers to ensure that transform matrices, clip regions, and styling properties remain isolated. This isolation prevents rendering artifacts where settings from one layer inadvertently affect another layer's appearance.

The canvas viewport implements a coordinate system that maps world space positions where nodes are located to screen space positions where pixels appear on the canvas element. This mapping involves a view transform consisting of a translation vector representing the pan offset and a uniform scale factor representing the zoom level. All rendering operations apply the view transform before drawing, ensuring that nodes and connections appear at correct screen positions regardless of current pan and zoom state.

### Background Layer Rendering

The background layer establishes the visual foundation for the node graph workspace. The rendering begins by filling the entire canvas with a base color that provides neutral contrast against node elements. The base color uses a carefully selected value that remains visible under various lighting conditions while avoiding excessive brightness that would cause eye strain during extended editing sessions.

The grid pattern renders on top of the base color to provide spatial reference and alignment guides for node positioning. The grid consists of horizontal and vertical lines spaced at regular intervals in world space coordinates. The grid spacing adapts to the current zoom level through a scale-dependent algorithm that adjusts line density to maintain appropriate visual density. At low zoom levels where the view encompasses large areas of the workspace, the grid uses wide spacing to avoid visual clutter. At high zoom levels where the view focuses on small regions, the grid uses tighter spacing to provide finer positioning reference.

The grid rendering uses a two-tier approach with primary and secondary grid lines. Primary grid lines render with higher opacity and wider spacing, providing major divisions of the workspace. Secondary grid lines render with lower opacity and tighter spacing, subdividing the primary grid cells. The secondary grid only appears at zoom levels where the spacing exceeds a minimum screen space threshold, ensuring that grid lines remain distinguishable rather than blending into a solid tone.

Grid line rendering uses the canvas stroke operation with line width set to one device pixel regardless of zoom level. This constant screen-space width ensures that grid lines remain crisp and visible without becoming excessively thick at high zoom levels. The line color uses an alpha channel value that provides subtle visibility without overpowering node content.

### Connection Layer Rendering

The connection layer renders edges between nodes as smooth curves that flow naturally from source output ports to target input ports. Each connection renders as a cubic bezier curve with control points computed to create aesthetically pleasing routing that avoids abrupt direction changes and provides clear visual indication of data flow direction.

The bezier curve computation begins by identifying the screen-space positions of the source and target ports after applying the view transform. The source port position serves as the curve start point while the target port position serves as the curve end point. The control points are positioned relative to these endpoints based on port orientations and the horizontal offset between ports.

For connections flowing from left to right where the source port lies to the left of the target port, the control points are offset horizontally from their corresponding endpoints by a distance proportional to the horizontal separation. This proportional offset creates gentle curves for short connections and more pronounced curves for long connections. The vertical positions of the control points match their corresponding endpoints, resulting in curves that flow primarily horizontally.

For connections flowing from right to left where the source port lies to the right of the target port, the control point positioning switches to create curves that initially flow outward from the ports before curving back toward the target. This routing avoids visual ambiguity and clearly indicates the flow direction even when connections loop backward through the graph.

The bezier curve renders using the canvas bezierCurveTo operation that draws smooth curves through the specified control points. The stroke style is set based on the connection's data type, with different colors indicating number connections, vector connections, geometry reference connections, and boolean connections. The stroke width uses a constant screen-space value that remains visible across zoom levels without becoming excessively thick.

Connection highlighting for selection or hover states renders using a two-pass approach. The first pass draws the connection with increased line width and a highlight color that creates a visible outline. The second pass draws the connection again at normal width with the standard color, creating a highlighted appearance where the outline remains visible around the edges. This two-pass technique provides clear visual feedback without requiring separate geometry or complex compositing operations.

Active connections that are currently evaluating or transferring data can render with animated effects to visualize computation progress. The animation implementation uses a dashed line pattern where the dash offset animates over time, creating the appearance of flow along the connection path. The animation frame updates the dash offset based on elapsed time and triggers a redraw to display the updated dash position.

### Node Layer Rendering

The node layer renders the rectangular cards that represent computational nodes within the graph. Each node renders as a rounded rectangle with distinct visual sections for the title bar, parameter area, and port indicators. The rendering implementation provides consistent visual appearance across node types while enabling customization for type-specific visualization requirements.

Node background rendering begins by constructing a rounded rectangle path using the canvas roundRect operation or by manually constructing a path with arc corners if the roundRect operation is not available in the current browser environment. The rectangle dimensions are computed from the node's content requirements, with width determined by the longest text label or parameter control and height determined by the sum of title bar height, parameter section height, and port spacing requirements.

The background fills using a solid color or subtle gradient that provides visual depth without overwhelming the interface. Selected nodes use a slightly different background color or gradient direction to indicate selection state. The fill color selection considers accessibility requirements to ensure sufficient contrast between background and text elements.

The node border strokes around the background using a consistent line width and color that provides clear visual separation between adjacent nodes. Selected nodes may render with increased border width or a highlight color to emphasize selection state. The border rendering occurs after background filling to ensure the stroke appears on top of the fill.

The title bar renders at the top of the node with a background color distinct from the main node body. The title text draws using the canvas fillText operation with font properties configured for appropriate size and weight. The text color provides high contrast against the title bar background to ensure readability. The title text may be truncated with an ellipsis if it exceeds the available width, with the full title appearing in a tooltip on hover.

The parameter section renders below the title bar and contains interactive controls for node configuration. Each parameter occupies a horizontal strip with a label on the left and a value representation or control on the right. Numeric parameters show their current value as formatted text. Boolean parameters render as checkboxes with visual indication of checked state. Enumeration parameters render as dropdown controls showing the selected option. More complex parameters may render custom visualizations appropriate to their data type.

Port indicators render as small circles at the left and right edges of the node for input and output ports respectively. The circle fill color is determined by the port's data type, using a consistent color scheme where number ports use one color, vector ports use another, geometry reference ports use a third color, and boolean ports use a fourth color. This color coding provides immediate visual indication of compatible connection types.

Port labels render adjacent to the port circles, positioned to avoid overlapping with connection curves. Input port labels render to the right of the port circles, while output port labels render to the left. The label text uses a smaller font size than the title text while maintaining sufficient size for readability. The label color provides adequate contrast against the node background.

Port hit areas extend beyond the visible circle radius to provide tolerance for pointer interaction. The hit areas render as invisible larger circles that capture pointer events even when the pointer is not precisely over the visible port indicator. This tolerance ensures that users can reliably click ports to initiate connection creation without requiring pixel-perfect precision.

### Overlay Layer Rendering

The overlay layer renders transient visual elements that appear during user interaction and provide feedback about operation state. These elements float above the node graph content and do not permanently occupy space in the graph.

Selection indicators for multiple selected nodes render as rectangular outlines that encompass each selected node. The outline uses a highlight color with increased opacity and renders with a dashed line pattern to distinguish selection outlines from node borders. When dragging selected nodes, the selection indicators move with the nodes to maintain clear indication of which elements are being manipulated.

Drag preview rendering shows the future position of nodes during drag operations. The preview renders as semi-transparent copies of the dragged nodes at the current pointer position offset by the initial grab offset. This preview provides clear feedback about where nodes will be positioned when the drag completes. The preview may render with reduced detail compared to the actual nodes to improve performance during dragging.

Connection creation feedback renders when the user drags from a port to create a new connection. A dynamic bezier curve renders from the source port to the current pointer position, updating in real time as the pointer moves. The curve uses the standard connection rendering style but may render with reduced opacity to indicate its provisional state. When the pointer hovers over a compatible target port, the curve endpoint snaps to that port position and the target port highlights to indicate readiness for connection.

Context menus render as rectangular panels containing menu items that respond to pointer clicks. The menu background uses a solid fill color that ensures menu items remain readable over graph content. Menu items render as text labels with hover highlighting that indicates which item will activate on click. The menu positioning algorithm places the menu near the pointer position while ensuring the menu remains fully visible within the canvas bounds.

Tooltip overlays render small rectangular panels containing descriptive text about graph elements under the pointer. Tooltips appear after a short delay when the pointer remains stationary over a node, port, or connection. The tooltip background uses semi-transparent fill to maintain visibility of underlying content while providing sufficient opacity for text readability. The tooltip text uses a compact font size appropriate for supplementary information.

## Graph Data Model

The node graph data model maintains a complete representation of the computational graph structure and state within the Zustand store. The model uses separate collections for nodes and edges, with additional structures for tracking evaluation state, selection, and interaction sessions.

### Node Representation

Nodes are stored as a map structure keyed by unique node identifiers. Each node identifier is a string generated at node creation time using a UUID or incrementing counter approach that ensures uniqueness across the entire project. The map structure enables constant-time node lookup by identifier, which occurs frequently during graph evaluation and rendering operations.

Each node record contains several required fields that appear in all node types regardless of their computational purpose. The identifier field holds the unique string that serves as the node's primary key in the node map. The type field contains a string discriminator that determines which node type this record represents, enabling the discriminated union pattern for type-safe node handling. The position field contains an object with x and y numeric properties that specify the node's location in world space coordinates. The parameters field contains an object whose structure is determined by the node type and holds configuration values for node operation.

Node types extend the base node structure with type-specific field requirements. A Point Generator node includes parameters for x, y, and z coordinate values. A Transform node includes parameters for translation vector, rotation axis and angle, and scale factors. An Expression node includes a parameter for the mathematical expression string. The type system ensures that access to type-specific parameters only occurs after verifying the node type through the discriminator field.

Port definitions for each node are not stored in the node record itself but are instead derived from the node type definition in the node type registry. The registry maintains a mapping from node type identifiers to metadata structures that include port specifications. Each port specification includes a unique key identifying the port within the node, a display label for rendering, a data type indicating what values the port accepts or emits, and flags indicating whether the port is required or optional.

The separation between node records and port definitions ensures that port specifications remain consistent across all instances of a node type. Changes to port definitions only require updating the registry rather than migrating existing node records. The port derivation occurs during rendering and evaluation by looking up the node type in the registry and retrieving its port specifications.

### Edge Representation

Edges are stored as an array of edge records rather than a map structure since edges are typically iterated rather than accessed by identifier. Each edge record contains fields that establish the connection between source and target ports. The sourceNodeId field contains the identifier of the node providing the data. The sourcePortKey field contains the port key within that source node. The targetNodeId field contains the identifier of the node receiving the data. The targetPortKey field contains the port key within that target node.

This four-field structure completely specifies the connection topology. The edge representation does not include position information since edge positions are computed at render time from the current positions of the connected nodes. The edge representation does not include cached data values since evaluation occurs through the separate evaluation system that maintains its own cache structures.

Edge validation enforces several constraints that maintain graph consistency. Each edge must reference valid source and target nodes that exist in the node map. Each edge must reference valid ports that exist in the port specifications for the corresponding node types. The source port must be an output port while the target port must be an input port. The source port data type must be compatible with the target port data type, either through exact type matching or through implicit conversion rules.

The edge model enforces input port uniqueness, permitting only one edge to connect to each input port. This constraint prevents ambiguity about which value should be used when evaluating a node with multiple connections to the same input. Output ports do not have uniqueness constraints and may have multiple edges emanating from them, enabling the distribution of a single computed value to multiple downstream nodes.

Edge creation and deletion operations update the edge array atomically to ensure consistency. Creating an edge first validates the connection against all constraints, then appends the new edge record to the array if validation succeeds. Deleting an edge removes the matching edge record from the array. Replacing an edge to an input port that already has a connection first removes the existing edge before adding the new edge.

### Evaluation State Management

The evaluation system maintains state separate from the node and edge collections to track which nodes have been evaluated, what values they produced, and which cached values remain valid. This evaluation state exists in memory during application runtime but is not persisted to storage since it can be recomputed from the graph structure and parameters.

The evaluation cache stores a map from node identifiers to cached result objects. Each cached result object contains the computed output values keyed by port identifier plus a dirty flag indicating whether the cache entry remains valid. When a node evaluates successfully, its result object is stored in the cache with the dirty flag set to false. When a node's parameters change or when an upstream dependency invalidates, the node's cache entry dirty flag is set to true.

Cache invalidation propagates downstream through the graph topology. When a node's cache becomes dirty, the evaluation system traverses all edges emanating from that node's output ports and marks the target nodes' cache entries as dirty. This recursive invalidation continues until all affected downstream nodes have been marked dirty. The invalidation algorithm uses a breadth-first traversal to ensure that each node is visited only once even when multiple paths lead to the same node.

The evaluation order is not predetermined but instead emerges from the lazy evaluation strategy. When a value is requested from a node's output port, the evaluation system checks whether a valid cached result exists. If the cache is valid, the cached value is returned immediately. If the cache is dirty or missing, the evaluation system recursively evaluates all upstream dependencies before evaluating the current node. This recursive evaluation ensures that input values are available before the node's compute function executes.

Cycle detection prevents infinite recursion during evaluation. The evaluation system maintains a call stack tracking which nodes are currently evaluating. When a node evaluation requests a value from an upstream node, the system checks whether that upstream node already appears in the call stack. If a cycle is detected, the evaluation terminates with an error indicating the cyclic dependency chain. This defensive check prevents stack overflow and provides clear error messages identifying the problematic nodes.

## Interaction and Hit Testing

The canvas-based rendering approach necessitates implementing interaction handling and hit testing manually rather than relying on DOM event propagation. When the user moves the pointer over the canvas, presses mouse buttons, or performs touch gestures, the canvas element receives these events at the canvas coordinate level. The interaction system must transform these canvas coordinates into world coordinates and test which graph elements occupy those positions.

### Coordinate Transformation

Coordinate transformation converts between screen space where pointer events occur and world space where nodes are positioned. The canvas element provides pointer events in client coordinates relative to the canvas element's position in the page. The interaction system first transforms these client coordinates to canvas coordinates by subtracting the canvas element's bounding rectangle offset.

The canvas coordinates then transform to world coordinates by applying the inverse view transform. The view transform consists of a translation and scale, with the forward transform mapping world positions to screen positions through the formula screenPosition equals worldPosition times scale plus translation. The inverse transform reverses this mapping through the formula worldPosition equals screenPosition minus translation divided by scale.

The world coordinate resulting from this transformation represents the position in the graph workspace that corresponds to the pointer location. This world position is used for all hit testing operations to determine which graph elements occupy that location.

### Node Hit Testing

Node hit testing determines whether the pointer position falls within any node's bounding rectangle. The hit testing algorithm iterates through all nodes in the graph, transforms each node's position and dimensions into a world-space bounding rectangle, and tests whether the pointer's world position falls within that rectangle.

The bounding rectangle test uses a simple containment check where the pointer x coordinate must fall between the rectangle's left and right edges and the pointer y coordinate must fall between the rectangle's top and bottom edges. For rounded rectangle nodes, the hit testing may perform additional checks at the corners to accurately handle the rounded regions, though many implementations use the full bounding rectangle for simplicity.

When multiple nodes overlap at the pointer position, the hit testing returns the topmost node based on rendering order. Since nodes are rendered in a specific order with selected nodes rendering last to appear on top, the hit testing iterates through nodes in reverse rendering order so that the first hit corresponds to the topmost visual element.

Node hit testing provides the foundation for node selection, node dragging, and context menu display. When a pointer down event occurs over a node, that node becomes the interaction target for subsequent drag operations. When a pointer up event occurs over a node without significant dragging, that node becomes selected.

### Port Hit Testing

Port hit testing determines whether the pointer position falls within a port's hit area. Since ports render as small circles, the hit testing uses distance calculations rather than rectangle containment. For each port on each visible node, the hit testing computes the distance from the pointer's world position to the port's center position. If this distance is less than the port's hit radius, the port is considered hit.

The hit radius extends beyond the port's visible radius to provide tolerance for pointer interaction. The enlarged hit area ensures that users can click ports reliably without requiring pixel-perfect precision. The hit radius value is tuned to balance ease of selection against preventing adjacent ports from having overlapping hit areas that would create ambiguity.

Port hit testing takes priority over node hit testing when both tests would succeed. This priority ensures that clicking near a port activates the port rather than starting a node drag operation. The interaction system performs port hit testing before node hit testing and only proceeds to node testing if no ports are hit.

Port hit testing serves connection creation workflows. When a pointer down event occurs over a port, a connection creation session begins with that port as the source. As the pointer drags, a preview connection renders from the source port to the pointer position. When the pointer releases over a compatible target port, a new edge is created connecting the source to the target.

### Connection Hit Testing

Connection hit testing determines whether the pointer position falls near a connection's bezier curve path. This testing is more complex than node or port testing since bezier curves are not represented as simple geometric primitives. The hit testing algorithm samples the connection's curve at multiple parameter values, computing world positions along the curve and testing whether any sampled position is within tolerance of the pointer position.

The sampling density must be sufficient to ensure that the hit testing does not miss curve portions between samples. The implementation uses a sample count based on the curve's screen-space length, ensuring adequate samples for long curves while avoiding excessive computation for short curves. For very long curves, the sampling may use an adaptive approach that places more samples in regions where the curve changes direction rapidly.

The distance tolerance for connection hit testing is larger than for ports to account for the difficulty of clicking thin curves precisely. The tolerance uses a constant screen-space value converted to world space at the pointer position, ensuring consistent hit testing difficulty across zoom levels.

Connection hit testing enables connection selection and deletion workflows. When a pointer click occurs over a connection, that connection becomes selected and can be deleted through keyboard commands or context menu actions. The connection selection also enables visual feedback where selected connections render with highlighting.

### Interaction State Management

The interaction system maintains state tracking the current interaction mode and session data for active operations. This state exists separately from the graph data model and persists only during interaction sessions, not across save and load operations.

The interaction mode indicates what type of operation is currently active. Modes include idle where no interaction is occurring, node drag where one or more nodes are being repositioned, connection create where a new connection is being drawn, pan where the viewport is being dragged, and marquee select where a selection rectangle is being drawn.

Node drag sessions store the identifiers of nodes being dragged, the initial world position where the drag started, the initial positions of all dragged nodes, and the current drag offset. As pointer move events occur, the drag offset updates based on the pointer's current world position, and the dragged nodes' positions are set to their initial positions plus the drag offset.

Connection creation sessions store the source node identifier and source port key where the connection originated, plus the current pointer position for rendering the preview curve. As pointer move events occur, the preview curve endpoint updates to track the pointer. When the pointer moves over a compatible target port, the target port highlights and the curve endpoint snaps to the target position.

Pan sessions store the initial pointer position and the initial view translation. As pointer move events occur, the view translation updates to pan the viewport based on the pointer displacement. The pan operation moves the entire graph rather than individual nodes.

Marquee selection sessions store the start and end corners of the selection rectangle in world coordinates. As pointer move events occur, the end corner updates to the current pointer position. The selection rectangle renders as a semi-transparent overlay. When the pointer releases, all nodes whose bounding rectangles intersect the selection rectangle become selected.

## Graph Layout and View Control

The graph layout system provides algorithms for automatically positioning nodes based on their connectivity and for manually adjusting the viewport to focus on specific graph regions. The layout and view control features enable users to manage graph organization as graphs grow to include many nodes.

### Manual Layout

The default layout mode permits users to position nodes through direct manipulation by dragging. When a node drag operation completes, the dragged nodes' positions are stored in their node records and persist across sessions. This manual layout provides complete control over visual organization and enables users to arrange graphs according to their mental models of the computation flow.

Grid snapping during manual layout assists with alignment by constraining node positions to multiples of a grid spacing value. When grid snapping is enabled, the drag operation computes the nearest grid intersection to the node's free position and sets the node position to that snapped location. The grid spacing adapts to zoom level to provide appropriate positioning granularity.

Manual layout works well for small graphs where users can maintain mental models of the full structure, but becomes challenging for large graphs where global organization emerges from accumulated local decisions. For these cases, automatic layout algorithms provide structured organization.

### Automatic Layout

Automatic layout algorithms compute node positions based on graph topology and layout objectives. The implementation provides several layout strategies that users can apply to all or part of the graph.

The hierarchical layout algorithm positions nodes in layers based on their topological depth within the graph. Nodes with no incoming edges appear in the first layer. Nodes whose inputs come only from the first layer appear in the second layer. This layering continues until all nodes are assigned to layers. Within each layer, nodes are positioned to minimize edge crossings and balance horizontal distribution. The algorithm produces left-to-right layouts where data flows from input nodes on the left through intermediate computations to output nodes on the right.

The force-directed layout algorithm treats nodes as physical particles with repulsive forces between all nodes and attractive forces along edges. The simulation iteratively updates node positions based on the net force at each node, allowing the system to settle into a configuration where forces balance. This approach produces organic layouts where connected nodes cluster together while maintaining spacing between unconnected nodes.

The tree layout algorithm applies to subgraphs that form tree structures without cycles or convergent paths. The algorithm positions the root node at the top with child nodes arranged in rows below. The positioning algorithm recursively computes subtree extents to balance horizontal distribution while maintaining parent-child alignment.

Automatic layout algorithms preserve user adjustments where possible by treating manually positioned nodes as fixed points that anchor the layout. Nodes without manual positions are arranged around the fixed nodes while respecting connectivity constraints.

### View Transform Control

The view transform determines what portion of the graph workspace is visible within the canvas viewport and at what magnification level. Users control the view transform through zoom and pan operations that adjust the scale factor and translation offset.

Zoom operations adjust the scale factor while maintaining the pointer position as the zoom center. The zoom algorithm computes the world position under the pointer before the zoom, applies the scale change, then adjusts the translation to ensure the world position remains under the pointer after the zoom. This pointer-centric zooming provides intuitive navigation where users zoom toward whatever they point at.

The zoom factor has minimum and maximum limits to prevent zooming too far out where nodes become invisibly small and zooming too far in where individual nodes fill the entire viewport. The limits use reasonable bounds that accommodate typical graph sizes while preventing pathological zoom levels.

Pan operations adjust the translation offset to shift the visible region of the graph workspace. Pan occurs through middle mouse drag, through keyboard arrow keys, or through touch gestures on devices supporting touch input. The pan logic constrains the translation to prevent the graph from being panned completely out of view, maintaining at least partial visibility of graph content.

The fit-to-view operation computes a view transform that encompasses all nodes in the graph or in the current selection. The algorithm determines the bounding rectangle containing all target nodes, computes the scale factor needed to fit that rectangle within the viewport with appropriate margins, and computes the translation needed to center the rectangle. The resulting view transform is applied immediately or animated smoothly over a short duration.

View transform state is maintained in the panel's local state rather than in the global store since view preference is session-specific and does not need to persist across application restarts. Each Numerica panel instance maintains its own independent view transform, enabling users to have multiple views of the same graph at different zoom levels or focused on different regions.

## Node Type System and Registry

The node type system provides the extensibility mechanism that enables adding new computational capabilities to the graph without modifying the core evaluation engine or rendering system. Node types are defined through a registry that maps type identifiers to metadata structures describing each type's behavior.

### Node Type Definition

Each node type definition contains several required components that the evaluation and rendering systems use to process nodes of that type. The type identifier is a unique string that serves as the discriminator in node records and as the key in the registry lookup table. The display metadata includes a human-readable label used in node creation menus and in the node title bar, plus an optional description providing additional context about the node's purpose.

The port specification describes the inputs and outputs that nodes of this type expose. Each port specification includes a unique key identifying the port within the node, a display label for rendering near the port indicator, a data type indicating what values flow through the port, and optional flags indicating whether the port is required or whether it accepts multiple connections.

The port data type uses a simple type system that includes primitive types such as number, boolean, and string, plus structured types such as vector for three-component floating-point vectors and geometry reference for identifiers pointing to geometry records in the main store. The type system supports type compatibility checking during edge creation to prevent connecting incompatible ports.

The parameter schema describes the configuration controls that appear in the node's parameter section. Each parameter definition includes a key identifying the parameter in the node's parameters object, a display label, a data type, and a control type indicating whether the parameter renders as a text input, numeric spinner, checkbox, dropdown, or custom control. The parameter definitions include default values that are used when creating new node instances.

The compute function is a pure function that evaluates the node given input values and parameters. The function signature accepts an inputs object containing values keyed by input port identifiers and a parameters object containing the node's current parameter values. The function returns an outputs object containing computed values keyed by output port identifiers. The compute function must not perform side effects, mutate global state, or access the store directly to ensure evaluation is deterministic and cacheable.

### Type Registry Implementation

The type registry maintains a map from type identifiers to node type definitions. The registry initialization occurs at application startup by importing all node type definition modules and registering each definition. The registration process validates that each definition includes all required components and that port keys and parameter keys are unique within each type.

The registry exposes lookup functions that retrieve type definitions by identifier. These lookups occur during evaluation when determining what compute function to invoke and during rendering when determining what ports to display. The lookup functions return the full type definition or null if the type identifier is not found, enabling defensive coding that handles missing type definitions gracefully.

The registry also exposes query functions that filter and search type definitions based on criteria such as category tags or text matching against labels and descriptions. These queries support node creation menus that organize available types into categories and provide search functionality for finding specific node types.

Node type categories group related types for organizational purposes in creation menus. Categories might include Geometry Primitives for nodes that generate basic geometric shapes, Transforms for nodes that modify geometry position and orientation, Analysis for nodes that extract measurements and properties, and Math for nodes that perform numerical computations. The category assignment is metadata in the type definition and does not affect evaluation or rendering behavior.

### Dynamic Port Generation

Some node types support dynamic port generation where the number and configuration of ports changes based on parameters or external factors. The Expression node serves as an example where input ports are generated dynamically based on variable names detected in the expression string.

Dynamic port generation is implemented through the port specification being a function rather than a static object. The function accepts the node's current parameters and returns a port specification object computed based on those parameters. When parameters change, the port specification function executes again to compute updated port specifications.

The evaluation and rendering systems invoke the port specification function whenever they need to determine what ports exist on a node. This just-in-time port computation ensures that port specifications always reflect current parameters. The systems must handle cases where port specifications change during a session, such as when connections to dynamically removed ports must be deleted.

## Graph Evaluation Engine

The graph evaluation engine computes node output values by recursively evaluating dependencies and invoking compute functions. The engine uses a pull-based lazy evaluation strategy where computation occurs only when output values are requested and only for nodes whose cached values are invalid.

### Evaluation Request Handling

Evaluation requests originate from external consumers that need specific node output values. Common consumers include the geometry rendering system requesting geometry references from workflow nodes and UI components displaying node output values for debugging purposes. The request specifies a node identifier and an output port key identifying which value is needed.

The evaluation engine first checks whether a valid cached result exists for the requested node and port. The cache lookup uses the node identifier to find the cached result object, then verifies that the dirty flag is false. If a valid cache exists, the cached value for the specified port is returned immediately without any computation.

If no valid cache exists, the evaluation engine proceeds to compute the node's outputs. The computation process first identifies all input ports for the node type by looking up the type definition and retrieving its port specification. For each input port, the engine identifies which edge connects to that port by searching the edge array for edges whose target matches the current node and port.

For each connected input port, the engine recursively evaluates the upstream node that provides the value by invoking the evaluation request handler for that upstream node and its corresponding output port. This recursion continues until reaching nodes with no input dependencies such as constant generator nodes or parameter nodes. The recursive evaluation builds up the call stack with the deepest upstream nodes evaluating first.

As upstream evaluations complete and return values, the engine collects these values into an inputs object keyed by input port identifiers. For input ports without connections, the engine uses default values defined in the node type's parameter schema. Once all input values are available, the engine retrieves the current parameter values from the node record and invokes the node's compute function with the inputs and parameters.

The compute function returns an outputs object containing computed values for each output port. The engine creates a cached result object containing these outputs, sets the dirty flag to false, stores the cache entry using the node identifier as key, and returns the requested port value to the caller. This caching ensures that subsequent requests for the same output value return immediately without recomputation.

### Error Handling

Error handling throughout the evaluation process must gracefully handle malformed graphs, invalid inputs, and computational failures without crashing the application. The evaluation engine wraps compute function invocations in try-catch blocks that capture exceptions and convert them into error result objects.

When a compute function throws an exception, the evaluation engine creates an error result object that contains the error message and stack trace. This error result is cached similarly to successful results but includes an error flag indicating evaluation failure. Subsequent requests for outputs from this node return the cached error rather than attempting re-evaluation, preventing repeated execution of failing computations.

Error propagation follows dependency chains where downstream nodes that depend on errored upstream nodes also produce errors. When an input value is an error result, the evaluation engine does not invoke the compute function but instead immediately returns an error indicating the upstream failure. This propagation ensures that errors are visible at all affected nodes rather than being hidden behind cascading failures.

The error visualization in the rendered graph indicates which nodes have evaluation errors through visual styling such as red borders or error icons in the title bar. Hovering over error nodes displays tooltip messages with the error details. This visual feedback helps users identify and resolve evaluation issues.

### Cycle Detection

Cycle detection prevents infinite recursion during evaluation of graphs containing circular dependencies. The evaluation engine maintains an evaluation stack that tracks which nodes are currently being evaluated in the current call chain. When beginning evaluation of a node, the engine checks whether that node's identifier already appears in the evaluation stack. If the identifier is found, a cycle exists and the evaluation terminates with a cycle error.

The cycle error includes information about the nodes involved in the cycle by capturing the portion of the evaluation stack from the first occurrence of the repeated node through the current position. This information is presented to the user through error visualization, highlighting the nodes that participate in the cycle and the edges that close the circular dependency.

Cycle detection only identifies cycles that actually execute during evaluation. Cycles that exist in the graph topology but are not traversed during evaluation of a specific output do not trigger cycle errors. This approach permits graphs with conditional branches where only one branch executes, even if the inactive branch contains cycles.

### Performance Optimization

The evaluation engine employs several optimization strategies to ensure efficient computation even for large complex graphs. The aggressive caching strategy is the primary optimization, ensuring that nodes with valid cached results execute in constant time regardless of their upstream dependency complexity.

The cache invalidation algorithm uses breadth-first traversal and visited node tracking to ensure that each node is invalidated at most once even when multiple upstream nodes change. This prevents redundant invalidation work and ensures that invalidation time scales linearly with the number of affected nodes rather than exponentially with the number of paths.

The evaluation algorithm uses iterative deepening for recursion depth limiting to prevent stack overflow in extremely deep graphs. When evaluation recursion exceeds a threshold depth, the engine switches from recursive evaluation to an iterative approach using an explicit stack data structure. This switch prevents crashes while maintaining the conceptual benefits of the recursive algorithm for typical graphs.

Parallel evaluation is not currently implemented but is architecturally feasible given the pure functional compute functions and explicit dependency tracking. Future implementations could evaluate independent branches of the graph concurrently using worker threads, with the main thread coordinating the evaluation and collecting results. The cache synchronization would require careful attention to ensure thread safety.

## Integration with Geometry System

The node graph integrates deeply with the geometry modeling system through geometry reference data types that flow through node connections. This integration enables procedural geometry generation where geometric shapes and transformations are defined through computational graphs rather than interactive commands.

### Geometry Reference Data Type

The geometry reference data type represents a pointer to a geometry record stored in the main geometry collection of the Zustand store. The reference value is a string containing the unique identifier of the geometry record. Nodes that generate geometry create new records in the geometry store and return the identifiers through their output ports. Nodes that consume geometry accept identifiers through input ports and retrieve the corresponding records from the store.

This reference-based approach maintains a clean separation between the graph data model and the geometry data model. The graph stores only identifiers while the geometry records remain in the geometry collection where they can be rendered, selected, and manipulated independently of the graph. Deleting a geometry record from the store does not affect graph structure, though downstream nodes that reference the deleted geometry will encounter missing record errors during evaluation.

The geometry reference type includes validation logic that verifies the referenced geometry exists when nodes evaluate. If a node receives a geometry reference that does not resolve to a valid record, the node's compute function should produce an error result rather than proceeding with invalid data. This validation prevents cascading failures where downstream nodes attempt to access fields on null or undefined geometry records.

### Geometry Generation Nodes

Geometry generation nodes create new geometry records during evaluation and return references to those records through output ports. The Point Generator node creates vertex geometry at specified coordinates. The Circle Generator node creates NURBS curve geometry representing a circle. The Box Builder node creates mesh geometry representing a six-faced box. Each of these nodes follows the same pattern of constructing a geometry record, generating a unique identifier, storing the record in the geometry collection, and returning the identifier.

The geometry record creation occurs during the node's compute function execution. The compute function first gathers parameters from input ports and node parameters, then constructs the appropriate geometry record structure for the type being created. The record includes all required fields such as type discriminator, positional data like vertices or control points, and optional metadata like layer assignment.

After constructing the geometry record, the compute function generates a unique identifier using the same identifier generation mechanism as interactive geometry creation commands. The function then dispatches a store action that adds the geometry record to the geometry collection using the generated identifier. Finally, the function returns the identifier through the appropriate output port.

Subsequent evaluations of the same node with unchanged inputs would create duplicate geometry records unless the node implements deduplication logic. One deduplication approach stores the most recently generated geometry identifier in the node's cached result and reuses that identifier when inputs remain unchanged. Another approach computes a hash of the geometry properties and searches for existing geometry with matching hashes before creating new records.

### Geometry Transform Nodes

Geometry transform nodes accept geometry references as inputs, retrieve the corresponding geometry records, apply transformations or modifications, create new transformed geometry records, and return references to the results. The Transform node accepts a geometry reference and transformation parameters, applies the transformation to create a new geometry record, stores the transformed record, and returns its identifier.

The transform logic within the compute function retrieves the input geometry record from the store, extracts its positional data such as vertex positions or control points, applies the transformation matrix to those positions, and constructs a new geometry record with the transformed positions. The original geometry record remains unmodified in the store, with the transform creating a new independent record.

This copy-on-transform approach ensures that graph evaluation does not mutate existing geometry and that the same input geometry can flow through multiple transform nodes producing different results. The approach does result in proliferation of geometry records as graphs evaluate, with each transform creating new records rather than updating existing ones. Garbage collection logic should identify and remove geometry records that are no longer referenced by the graph or by the scene.

### Geometry Analysis Nodes

Geometry analysis nodes extract measurements and properties from geometry records without creating new geometry. The Measurement node accepts a geometry reference and a property selector, retrieves the geometry record, computes the requested property such as length or area or volume, and returns the numeric result through an output port.

The analysis logic within the compute function determines what computation to perform based on the geometry type and the requested property. For curve geometry requesting length, the function evaluates the curve at multiple parameters to compute arc length. For surface geometry requesting area, the function tessellates the surface and sums triangle areas. For mesh geometry requesting volume, the function uses divergence theorem integration over the mesh surface.

These analysis operations read from the geometry store but do not modify it and do not create new geometry records. The analysis results flow through the graph as numeric values that can drive other computations such as controlling transform parameters or determining conditional branch selection.

### Scene Integration

Geometry created through node evaluation can integrate into the main scene for rendering and interaction. The integration occurs through scene node creation that references the geometry identifiers produced by workflow nodes. When a workflow node generates geometry, a corresponding scene node can be created that includes the geometry identifier, transformation matrix, layer assignment, and visibility flags.

The integration mechanism needs clarification of whether scene nodes are created automatically for all generated geometry or whether explicit scene integration nodes are required to promote workflow geometry into the rendered scene. Automatic integration would make all workflow geometry immediately visible but might clutter the scene with intermediate computation results. Explicit integration would require users to specifically indicate which workflow outputs should appear in the scene but provides more control over what renders.

The scene integration also determines how workflow geometry responds to interactive commands and direct manipulation. Geometry created through the workflow remains parametrically defined through the graph and should update automatically when upstream parameters change. Direct manipulation through transform gizmos or commands might create conflicts with the parametric definition. One resolution approach is to make workflow geometry read-only for direct manipulation, requiring users to adjust parameters rather than dragging geometry. Another approach is to layer direct transformations on top of the parametric definition, applying them after graph evaluation.

## Canvas Implementation Details

The WebGL canvas rendering implementation requires careful attention to performance optimization, browser compatibility, and interaction handling to achieve professional-grade visual quality and responsiveness. The implementation addresses several technical challenges specific to canvas-based user interfaces.

### Canvas Resolution and Device Pixel Ratio

Modern displays include high-DPI screens with device pixel ratios greater than one where CSS pixels map to multiple device pixels. Canvas elements must account for this ratio to render crisp graphics without blurriness. The implementation sets the canvas element's width and height attributes to match the display resolution by multiplying the CSS size by the device pixel ratio.

The canvas context scale transformation is set to the device pixel ratio to ensure that drawing commands specified in CSS pixels map correctly to device pixels. This scaling occurs once during canvas initialization and remains constant throughout rendering. All subsequent drawing operations use CSS pixel units rather than device pixel units.

The view transform accounts for this scaling by incorporating the device pixel ratio into coordinate transformations. When converting pointer positions from screen space to world space, the inverse view transform includes division by the device pixel ratio to ensure accurate hit testing.

### Rendering Performance

The rendering performance depends on minimizing the computational cost of drawing operations and avoiding unnecessary redraws. The implementation uses several strategies to optimize performance.

The dirty region tracking identifies which portions of the canvas require redrawing rather than clearing and redrawing the entire canvas during every frame. When only a small portion of the graph changes such as during node dragging, only the affected region needs redrawing. The implementation computes the bounding rectangle of changed elements, expands it slightly to account for anti-aliasing, and clips rendering to that region.

The render loop uses requestAnimationFrame to synchronize rendering with browser refresh cycles, ensuring smooth animation without tearing. The loop monitors the time since the last frame to detect when frame rates drop below targets and may reduce render quality or skip optional visual effects to maintain responsiveness.

The text rendering uses pre-measured text metrics to avoid measuring text dimensions during every frame. The implementation measures text strings when they are first encountered and caches the measurements for reuse. This caching eliminates repeated text measurement calls which are relatively expensive operations.

The bezier curve rendering uses pre-computed path segments for connections with stable endpoints. When connection endpoints do not move, the bezier path can be computed once and reused across multiple frames. The path caching stores canvas path objects keyed by connection identifiers and reuses them when rendering.

### Browser Compatibility

The canvas implementation must handle variations in browser support for canvas features and work around browser-specific bugs or performance characteristics. The implementation detects feature availability before using newer canvas operations that may not exist in all browsers.

The roundRect operation for drawing rounded rectangles was added relatively recently to the canvas specification. The implementation checks whether the operation exists on the canvas context and falls back to manually constructing rounded rectangle paths using arc operations if the native operation is unavailable.

The font rendering quality varies across browsers with some browsers using subpixel anti-aliasing while others use grayscale anti-aliasing. The implementation cannot control these browser-level rendering decisions but can choose font sizes and weights that render well across different anti-aliasing approaches.

The pointer event support varies across devices with some supporting mouse input, some supporting touch input, and some supporting both. The implementation uses pointer events when available for unified handling of mouse and touch, with fallbacks to separate mouse and touch event handlers when pointer events are not supported.

### Memory Management

The canvas rendering allocates memory for various data structures that must be managed to avoid memory leaks as graphs grow and as users interact with the editor over extended sessions. The implementation employs several memory management strategies.

The render loop closure captures references to data structures that must be explicitly released when the editor component unmounts. The component cleanup logic removes event listeners, cancels animation frames, and clears cached data to allow garbage collection of the canvas and associated objects.

The path object caching limits the number of cached paths to prevent unbounded growth as graphs evolve. The cache uses a least-recently-used eviction policy that removes the oldest cached paths when the cache size exceeds a threshold. This bounded cache provides performance benefits for stable graphs while avoiding memory exhaustion for graphs that change frequently.

The image data caching for node icon rendering similarly uses bounded caches with LRU eviction. Node type icons are loaded as images and decoded into canvas image data for rendering. The decoded image data is cached to avoid repeated decoding but the cache size is limited to prevent holding excessive memory for rarely used node types.

## Future Architecture Considerations

The current canvas-based implementation provides a solid foundation for the Numerica node editor but several architectural considerations should guide future development as the system evolves.

### WebGL Acceleration

The current implementation uses the 2D canvas rendering context which provides a rich immediate-mode drawing API but does not leverage GPU acceleration for rendering. Large graphs with hundreds or thousands of nodes may benefit from WebGL acceleration where node rendering occurs through GPU-accelerated texture mapping and instanced drawing.

A WebGL implementation would represent nodes as textured quads with node content rendered to textures during layout passes. The connection rendering would use GPU line drawing or would render connections as thin textured quads. The hit testing would use GPU picking techniques such as color-coded render passes or compute shader intersection tests.

The transition to WebGL acceleration should maintain the same graph data model and evaluation engine while replacing only the rendering implementation. The abstraction layer between the graph model and rendering system should cleanly separate these concerns to enable renderer swapping without affecting evaluation logic.

### Layout Algorithm Extensions

The current layout algorithms provide basic automatic positioning but sophisticated graphs may benefit from domain-specific layout that considers data flow patterns, node grouping, and user annotations. Future layout algorithms could incorporate machine learning to predict optimal layouts based on graph structure and user preferences.

Hierarchical layout could be extended to handle graphs with multiple disconnected components by arranging components into a grid or tree structure at the top level. The layout could also handle feedback edges that create cycles by routing them around the main forward flow rather than allowing them to cross multiple layers.

Force-directed layout could incorporate additional forces that account for node types, preferred orientations, or alignment constraints. The simulation could use variable time steps that accelerate convergence for stable regions while maintaining accuracy in unstable regions. The layout could preserve manual adjustments by treating user-positioned nodes as fixed anchors with infinite mass.

### Collaboration and Real-Time Editing

The graph data model and evaluation system could support collaborative editing where multiple users work on the same graph simultaneously. The collaboration implementation would synchronize node and edge changes across users through operational transformation or conflict-free replicated data types.

The canvas rendering would visualize which nodes are currently being edited by other users through cursor indicators, selection highlighting, or avatar overlays. The evaluation system would need to handle concurrent modifications carefully to ensure that users see consistent results despite asynchronous updates.

The collaboration architecture should maintain the same single-source-of-truth principle where the authoritative graph state exists in a shared store that all users synchronize with. The local evaluation caches would remain user-specific since different users may request different output values.

### Undo and History

The current architecture should extend to support undo and redo for graph editing operations through the same history management system used for geometry modifications. Graph changes such as node creation, node deletion, edge creation, edge deletion, node movement, and parameter changes should record history entries that enable reverting to previous graph states.

The history implementation should use a command pattern where each graph modification operation is represented as a command object containing the information needed to execute and reverse the operation. The undo operation executes the reverse commands in reverse order while the redo operation re-executes the forward commands.

The evaluation cache invalidation should integrate with the undo system so that undoing a parameter change causes affected nodes to re-evaluate with their previous parameter values. The cache entries associated with undone states may be preserved temporarily to accelerate redo operations that restore those states.

## Implementation Anchors

- `client/src/components/workflow/NumericalCanvas.tsx`: render loop, hit testing, pan/zoom.
- `client/src/components/workflow/workflowValidation.ts`: connection validation and cycle checks.
- `client/src/workflow/nodeRegistry.ts`: node definitions, ports, and defaults.
- `client/src/store/useProjectStore.ts`: workflow state, evaluation, caching, and invalidation.

## Performance Targets

- 60 fps during active interaction (drag, pan, connect), idle rendering can pause.
- Smooth interaction at 1k+ nodes with minimal frame drops.
- Hit testing and drawing remain linear in visible nodes/edges with view culling.

## Validation Checklist

- Edge connections enforce type compatibility and single-input constraints.
- Dirty flags propagate to all downstream nodes on parameter changes.
- Cycle detection blocks evaluation and reports clear errors.
- Selection, drag, and connection creation remain stable at high zoom levels.
