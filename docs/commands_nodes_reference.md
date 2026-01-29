# Lingua Command and Node Reference Guide

## Introduction to the Command System

The Lingua modeling environment provides two complementary interaction paradigms for creating and manipulating geometry. The Roslyn panel offers direct manipulation through geometry commands that create primitives, curves, and surfaces, plus perform commands that execute transformations and modifications on selected geometry. The Numerica panel provides equivalent functionality through computational nodes that can be wired into parametric graphs for procedural modeling workflows.

Every geometry creation and modification operation in Roslyn has a corresponding node type in Numerica, ensuring that users can choose between direct interactive modeling and parametric procedural approaches based on their workflow requirements. The command system integrates with command bar input prompts that appear when commands require coordinate input, enabling precise numeric entry while maintaining the fluidity of interactive modeling. All geometry created through either commands or nodes renders through the WebGL pipeline using custom shaders that provide consistent visual quality and selection highlighting.

In this reference, "command prompt" refers to the Roslyn command bar input area and any associated parameter controls that appear for an active command.

The transform gumball serves as the primary direct manipulation tool for geometry modification, providing intuitive visual handles for translation, rotation, and scaling operations. The gumball appears automatically when geometry is selected and adapts its appearance based on the current selection mode and active manipulation. Understanding how to leverage the gumball effectively accelerates modeling workflows by reducing the need for explicit transform commands while maintaining precision through snap behavior and numeric input during manipulation.

## Geometry Creation Commands

### Point Command

The Point command creates isolated vertex geometry at specified locations in 3D space. When invoked, the command enters point placement mode where the viewport captures pointer clicks on the construction plane to define point positions. Each click creates a new vertex at the intersection of the pointer ray with the construction plane, with snapping active to enable precise alignment with grid intersections, existing geometry vertices, or computed snap points like midpoints and intersections.

The command accepts numeric coordinate input through the command prompt that appears at the bottom of the Roslyn panel. The prompt displays three input fields labeled X, Y, and Z that accept floating-point values. As the user types coordinates, the preview rendering updates to show a semi-transparent vertex at the specified position. Pressing Enter commits the point at the typed coordinates, while pressing Escape cancels the command and returns to normal selection mode.

Multiple points can be created in a single command invocation by continuing to click after the first point is created. The command remains active until the user explicitly exits by pressing Escape or by switching to a different command. Each created point becomes a separate geometry record in the store with its own unique identifier, enabling independent selection and manipulation.

The WebGL rendering pipeline displays points as small sphere instances using a custom vertex shader that positions sphere geometry at each vertex location. The sphere radius remains constant in screen space as the camera zooms, ensuring points remain visible and selectable at all zoom levels. Selected points render with the highlight shader that adds an additive glow color to indicate selection state.

**Command Aliases:** point, pt, p

**Required Input:** One or more 3D coordinates via pointer clicks or numeric entry

**Prompt Format:** X: [value] Y: [value] Z: [value]

### Line Command

The Line command creates polyline geometry consisting of two vertices connected by a single straight edge. The command requires two point inputs that define the line's endpoints. When invoked, the command prompts for the first point through the standard command coordinate prompt. After the first point is established, the viewport renders a preview line from the first point to the current pointer position, updating in real time as the pointer moves.

The preview line renders using the WebGL line shader with reduced opacity to distinguish it from committed geometry. The shader implements screen-space anti-aliasing to ensure smooth line appearance regardless of line orientation or zoom level. When the user confirms the second point by clicking or typing coordinates, the command creates a polyline geometry record with two vertices and one edge, then commits this record to the store.

The line command supports continuous creation mode where confirming the second point automatically begins a new line using the second point as the first point of the next segment. This chaining behavior enables rapid creation of connected line segments without repeatedly invoking the command. Pressing Escape breaks the chain and exits the command, while double-clicking commits the current line and exits without chaining.

Snapping operates on both endpoints, allowing lines to snap to grid intersections, existing vertices, midpoints, and perpendicular projections onto existing edges. The snap indicators render as small colored markers at snap locations, with different colors indicating different snap types. Grid snaps use one color, vertex snaps use another, and geometric snaps like perpendicular or tangent use a third color.

**Command Aliases:** line, ln, l

**Required Input:** Two 3D coordinates defining start and end points

**Prompt Format:** Start - X: [value] Y: [value] Z: [value], then End - X: [value] Y: [value] Z: [value]

### Polyline Command

The Polyline command creates connected sequences of line segments by collecting an arbitrary number of point inputs. The command begins by prompting for the first point, then enters a collection mode where each subsequent click or coordinate entry adds another vertex to the polyline. The preview rendering shows all committed vertices plus a dynamic line segment from the last committed vertex to the current pointer position.

The polyline geometry can be closed into a loop by clicking on the first vertex or by pressing the C key while the command is active. Closing the polyline sets the closed flag in the geometry record and renders a final edge connecting the last vertex back to the first vertex. Closed polylines serve as profiles for extrusion operations and as boundary definitions for surface creation commands.

The command prompt displays the current vertex count and provides a toggle checkbox for the closed state. Users can type coordinates for precise vertex placement or rely on pointer interaction for freeform sketching. The Tab key cycles through recent snap suggestions when multiple snap candidates exist at similar distances from the pointer.

Polyline geometry renders through the WebGL pipeline using the line shader with vertex buffer updates occurring as new vertices are added during command execution. The rendering system maintains an efficient update strategy that appends new vertex data to existing buffers rather than recreating the entire buffer for each vertex addition. This incremental update approach ensures smooth interactive performance even when creating polylines with hundreds of vertices.

**Command Aliases:** polyline, pline, pl

**Required Input:** Three or more 3D coordinates defining connected vertices

**Prompt Format:** Vertex [n] - X: [value] Y: [value] Z: [value], with Closed: [checkbox]

### Rectangle Command

The Rectangle command creates a closed rectangular polyline aligned with the construction plane. The command requires two corner points that define opposite corners of the rectangle. When invoked, the command prompts for the first corner using the standard coordinate input. After the first corner is established, the viewport renders a preview rectangle that updates as the pointer moves, with edges aligned to the construction plane's U and V axes.

The rectangle preview renders using semi-transparent fills to show the enclosed area plus edge lines that highlight the rectangle boundary. The WebGL rendering uses a simple fragment shader that applies transparency to the fill color while maintaining full opacity for the edge strokes. This dual rendering approach helps users understand the rectangle's extent and orientation before committing.

The rectangle creation supports dimension constraints through the command prompt. After establishing the first corner, the prompt displays Width and Height input fields that accept numeric values. Typing a width value constrains the rectangle's horizontal dimension while the pointer continues to control vertical dimension. Once both width and height are specified, the rectangle dimensions become fixed and the pointer only controls the rectangle's orientation and whether it extends in positive or negative directions from the first corner.

The committed rectangle geometry is stored as a closed polyline with four vertices corresponding to the rectangle corners. The vertex order follows a consistent winding pattern that proceeds counterclockwise when viewed from the construction plane's normal direction. This consistent winding enables downstream operations like extrusion to reliably determine inside and outside faces.

**Command Aliases:** rectangle, rect, rec

**Required Input:** Two corner points or one corner plus width and height dimensions

**Prompt Format:** First Corner - X: [value] Y: [value] Z: [value], then Width: [value] Height: [value]

### Circle Command

The Circle command creates a NURBS curve geometry representing a perfect circle on the construction plane. The command requires a center point and a radius specification. When invoked, the command first prompts for the center location through pointer click or coordinate entry. After the center is established, the viewport renders a preview circle that scales with pointer distance from the center.

The circle preview uses the WebGL line shader to render a tessellated approximation of the circle curve. The tessellation uses enough segments to appear smooth at the current zoom level, with automatic detail adjustment as the camera zooms in or out. The tessellation system monitors viewport changes and regenerates the preview geometry when screen-space curvature error exceeds the threshold.

The command prompt provides a Radius input field for numeric entry of the circle size. The radius value updates in real time as the user moves the pointer, displaying the current distance from the center point. Users can type a specific radius value to create circles of exact dimensions, or can rely on visual feedback for approximate sizing. The prompt also includes a Diameter field that shows twice the radius value and accepts input as an alternative to radius specification.

The committed circle geometry is stored as a rational NURBS curve with control points and weights configured to represent a mathematically exact circular arc. The NURBS representation uses nine control points with specific weight values that ensure the curve evaluates to perfect circular positions at all parameter values. This exact representation enables precise Boolean operations, offsetting, and intersection calculations that would be compromised by polygonal approximations.

**Command Aliases:** circle, circ, c

**Required Input:** Center point and radius value

**Prompt Format:** Center - X: [value] Y: [value] Z: [value], then Radius: [value] or Diameter: [value]

### Arc Command

The Arc command creates NURBS curve geometry representing a circular arc segment defined by three points. The command collects a start point, an end point, and a point on the arc that controls its bulge and direction. The three-point definition provides intuitive control over arc shape while ensuring the arc passes through specified locations for precise geometric construction.

After the start point is established, the preview shows a straight line from start to current pointer position. After the end point is confirmed, the preview transitions to showing an arc that passes through start and end points while bending toward the current pointer position. The arc radius and center position update continuously to maintain the three-point constraint.

The WebGL rendering tessellates the preview arc using adaptive sampling based on the arc's radius and sweep angle. Small-radius arcs with large sweep angles require more tessellation segments than large-radius arcs with small sweeps. The tessellation system computes segment count based on screen-space deviation to ensure smooth appearance without excessive vertex counts.

The command prompt displays the computed arc radius, sweep angle in degrees, and arc length in model units. These derived parameters update as the third point moves, providing feedback about the arc's geometric properties. Users can switch to numeric input mode where the prompt accepts radius and angle specifications instead of requiring a third point, enabling precise arc creation from known parameters.

**Command Aliases:** arc, a

**Required Input:** Start point, end point, and point on arc, or start point, end point, radius, and angle

**Prompt Format:** Start - X: [value] Y: [value] Z: [value], End - X: [value] Y: [value] Z: [value], Point On Arc - X: [value] Y: [value] Z: [value]

### Curve Command

The Curve command creates NURBS curve geometry through an arbitrary collection of control points. Unlike the polyline command which creates linear segments connecting vertices, the curve command generates smooth curves that interpolate or approximate the specified points depending on the chosen curve type. The command supports both interpolated curves that pass through all points and approximated curves that treat points as control points.

The command begins by prompting for the first point, then enters collection mode where subsequent clicks add more points to the curve definition. The preview rendering shows the curve shape updating in real time as points are added. For interpolated curves, the preview passes through all collected points. For approximated curves, the preview shows a smooth curve influenced by the control points but not necessarily passing through them.

The command prompt includes a Degree dropdown that controls the polynomial degree of the resulting NURBS curve. Degree three provides smooth cubic curves appropriate for most modeling tasks. Higher degrees enable more complex curve shapes with fewer control points, while degree one creates polylines. The prompt also includes an Interpolate checkbox that toggles between interpolation and approximation modes.

The curve geometry is stored as a NURBS curve record with control points, knot vector, degree specification, and optional weights for rational curves. The knot vector is computed automatically based on the chosen curve type and degree, using uniform knots for approximated curves and chord-length parameterization for interpolated curves. This automatic knot vector computation relieves users from managing low-level NURBS mathematics while ensuring valid curve definitions.

The WebGL rendering tessellates NURBS curves by evaluating positions at parameter samples distributed uniformly across the curve's parameter domain. The tessellation resolution adapts to viewport zoom and curve complexity, using finer sampling for curves with high curvature or when zoomed in closely. The tessellation result is cached and only regenerated when the curve geometry changes or when zoom crosses tessellation thresholds.

**Command Aliases:** curve, crv, cv

**Required Input:** Three or more 3D coordinates defining control or interpolation points

**Prompt Format:** Point [n] - X: [value] Y: [value] Z: [value], Degree: [dropdown], Interpolate: [checkbox]

### Box Command

The Box command creates a six-faced solid by defining two opposite corners of a rectangular volume. The command follows a two-step process where the first step establishes a rectangular base on the construction plane, and the second step defines the height perpendicular to that plane. The resulting geometry consists of a mesh with eight vertices, twelve edges, and six quadrilateral faces.

When invoked, the command prompts for the first corner point that anchors one corner of the base rectangle. The preview shows a rectangular outline updating as the pointer moves. After the second corner is confirmed, the base rectangle becomes fixed and the preview transitions to showing a three-dimensional box extruding from the base toward the pointer position. The box height adjusts in real time as the pointer moves perpendicular to the construction plane.

The command prompt displays dimension fields for Length, Width, and Height that correspond to the box's extents along the construction plane's U and V axes and its normal direction. Users can type specific dimension values to create boxes of exact proportions, or can rely on visual feedback for approximate sizing. The prompt includes a Center toggle that changes the creation mode from corner-to-corner to center-outward, where the first point defines the box center rather than a corner.

The box geometry is stored as a mesh record containing vertex positions, face definitions referencing vertex indices, and normal vectors for lighting calculations. The mesh uses indexed triangle representation where each face is decomposed into two triangles sharing a diagonal edge. This triangulation is consistent across all faces to ensure proper backface culling and lighting behavior during WebGL rendering.

The WebGL rendering pipeline displays the box using the standard mesh shader with Phong lighting that computes diffuse and specular reflections based on face normals and light positions. The shader supports selection highlighting through additive color blending and renders preview geometry with transparency during command execution. When faces are selected, the shader uses per-face highlighting rather than per-vertex to clearly indicate which faces are selected.

**Command Aliases:** box, bx

**Required Input:** Two corner points defining base rectangle, plus height value or third point defining box top

**Prompt Format:** First Corner - X: [value] Y: [value] Z: [value], Opposite Corner - X: [value] Y: [value] Z: [value], Height: [value]

### Sphere Command

The Sphere command creates a NURBS surface geometry representing a perfect sphere centered at a specified point with a given radius. The command prompts first for the center location, then for the radius specification through pointer distance or numeric input. The sphere surface is constructed as a rational NURBS surface with control points and weights arranged to produce exact spherical evaluation at all UV parameter values.

The preview rendering shows a tessellated mesh approximation of the sphere that updates as the radius changes. The tessellation uses a latitude-longitude parameterization with adaptive resolution based on the sphere radius and viewport zoom level. Small spheres or distant views use coarser tessellation to conserve vertex processing, while large spheres or close views use finer tessellation to maintain smooth appearance.

The command prompt provides Radius and Diameter input fields for numeric size specification. The prompt also includes UV Resolution fields that control the tessellation density for the final committed geometry. Higher resolution values produce smoother appearance at the cost of increased vertex count and rendering overhead. The default resolution provides good balance between quality and performance for typical modeling tasks.

The sphere NURBS surface uses a specific control point layout with nine control points in the U direction and seven in the V direction, with rational weights configured to ensure exact spherical evaluation. This standard NURBS sphere representation enables precise Boolean operations, intersection calculations, and surface analysis that would be compromised by tessellated mesh approximations. The parametric nature also supports texture mapping with predictable UV coordinates that wrap around the sphere without distortion.

**Command Aliases:** sphere, sph

**Required Input:** Center point and radius value

**Prompt Format:** Center - X: [value] Y: [value] Z: [value], Radius: [value] or Diameter: [value]

### Cylinder Command

The Cylinder command creates a NURBS surface geometry representing a cylindrical surface defined by a base circle and a height. The command requires a center point for the base circle, a radius specification, and a height value that determines how far the cylinder extends perpendicular to the construction plane. The resulting surface is a ruled surface generated by sweeping the circular profile along a straight path.

The command flow begins with center point placement, transitions to radius definition with a circular preview, and concludes with height specification showing a three-dimensional cylindrical preview. Each step provides command prompts for numeric input while maintaining interactive visual feedback. The preview uses semi-transparent rendering to show both the cylindrical surface and the circular profiles at top and bottom.

The committed cylinder geometry is stored as an extrusion record that references a circular NURBS curve as the profile and a linear path representing the height vector. This extrusion representation maintains the parametric definition rather than converting to an explicit NURBS surface, preserving the ability to edit the profile curve or path independently. The WebGL rendering evaluates the extrusion on demand, generating tessellated mesh geometry for display while keeping the parametric definition intact in the store.

The tessellation system for cylinders uses a special case optimization that recognizes cylindrical extrusions and generates efficient triangle strips aligned with the cylinder's ruling lines. This specialized tessellation produces fewer triangles than general extrusion tessellation while ensuring smooth appearance and proper normal vector generation for lighting calculations.

**Command Aliases:** cylinder, cyl

**Required Input:** Base center point, radius value, and height value

**Prompt Format:** Base Center - X: [value] Y: [value] Z: [value], Radius: [value], Height: [value]

### Extrude Command

The Extrude command creates surface geometry by sweeping a profile curve along a path, or by projecting a planar profile a specified distance perpendicular to its plane. The command operates on selected curve geometry, requiring at least one curve to be selected before invocation. When invoked with a single selected curve, the command enters linear extrusion mode where the curve projects perpendicular to its plane. When invoked with two selected curves, the command uses the first as profile and the second as path.

For linear extrusion, the command prompt displays a Distance field that accepts the extrusion length. The preview renders a semi-transparent surface showing how the profile sweeps along the extrusion direction. The extrusion direction is determined by the construction plane normal at the profile curve's location, ensuring predictable extrusion behavior aligned with the modeling plane.

For path-based extrusion, the preview shows the profile sweeping along the path curve with orientation controlled by a framing algorithm that minimizes twisting. The command prompt includes a Twist field that adds rotational variation along the path, specified in degrees per unit length. The prompt also includes a Scale field that controls how the profile size varies along the path, with values less than one creating tapered extrusions.

The extrusion geometry is stored as an extrusion record containing references to the profile curve identifier and optionally the path curve identifier, plus extrusion parameters like distance, twist, and scale. The WebGL rendering evaluates extrusions by sampling both profile and path at corresponding parameters, constructing transformation matrices that position and orient the profile at each path location, and generating triangle mesh geometry that approximates the swept surface.

**Command Aliases:** extrude, ext, ex

**Required Input:** Selected curve geometry, plus extrusion distance or path curve

**Prompt Format:** Distance: [value], or with path: Twist: [value] degrees/unit, Scale: [value]

## Transform and Modification Commands

### Move Command

The Move command translates selected geometry by a specified displacement vector. The command operates on the current selection, requiring at least one geometry element to be selected before invocation. When invoked, the command prompts for a base point that establishes the reference location for the movement, then prompts for a target point that defines where the base point should move to. The displacement vector is computed as the difference between target and base points.

The preview rendering shows the selected geometry at its new position with semi-transparent rendering to distinguish preview from committed geometry. The original geometry remains visible at its current position until the move is confirmed, providing clear visual feedback about the transformation being applied. The WebGL rendering maintains separate vertex buffers for original and preview geometry to enable efficient updates as the target point changes during interactive movement.

The command prompt displays the computed displacement vector in X, Y, and Z components. Users can type specific displacement values directly rather than clicking base and target points, enabling precise movements by known distances. The prompt includes a Copy checkbox that changes the move operation to copy-and-move, leaving the original geometry in place while creating a new copy at the target position.

The move operation updates geometry records by applying the displacement vector to all vertex positions, control points, or other positional data within each selected geometry element. For simple geometry like vertices and polylines, this update modifies position arrays directly. For NURBS curves and surfaces, the update modifies control point positions. For extrusions and other compound geometry, the update may modify transformation matrices or profile curves depending on the extrusion definition.

**Command Aliases:** move, mv, m

**Required Input:** Base point and target point, or displacement vector components

**Prompt Format:** Base Point - X: [value] Y: [value] Z: [value], Target Point - X: [value] Y: [value] Z: [value], Copy: [checkbox]

### Rotate Command

The Rotate command applies rotational transformation to selected geometry around a specified axis. The command requires an axis definition consisting of a point on the axis and the axis direction vector, plus an angle specification in degrees. When invoked, the command first prompts for the axis origin point, then prompts for a point that defines the axis direction by its displacement from the origin. Finally, the command prompts for the rotation angle.

The preview rendering shows selected geometry rotated to the current angle with the rotation axis visualized as a line through the scene. The geometry updates continuously as the angle changes, with the WebGL rendering applying rotation matrices to vertex positions during each frame. The rotation computation uses quaternion mathematics internally to avoid gimbal lock and ensure smooth interpolation, though the user interface presents rotation angles in familiar degree measurements.

The command prompt displays the rotation angle with increment controls that allow adjusting the angle by fixed amounts like fifteen or forty-five degrees. The prompt includes a Reference option that changes angle specification from absolute to relative, where the angle is measured from a reference direction defined by an additional point input. This reference-based rotation enables aligning geometry to match existing orientations.

The rotation operation constructs a transformation matrix from the axis and angle, then applies this matrix to geometry positions. For vertices and polylines, the operation transforms position arrays directly. For NURBS curves and surfaces, the operation transforms control points. The rotation preserves geometric properties like distances between points and angles between edges, ensuring that rotated geometry maintains its shape while changing its orientation.

**Command Aliases:** rotate, rot, ro

**Required Input:** Axis origin point, axis direction point, and rotation angle in degrees

**Prompt Format:** Axis Origin - X: [value] Y: [value] Z: [value], Axis Direction - X: [value] Y: [value] Z: [value], Angle: [value] degrees

### Scale Command

The Scale command applies uniform or non-uniform scaling to selected geometry relative to a specified origin point. The command prompts first for the scale origin that defines the center of the scaling operation, then prompts for scale factors. Uniform scaling uses a single scale factor applied equally in all directions, while non-uniform scaling accepts separate factors for X, Y, and Z directions.

The preview rendering shows selected geometry at its scaled size with visual feedback showing both the original and transformed positions. The WebGL rendering computes scaled positions by multiplying displacement vectors from the scale origin by the scale factors, ensuring that the origin point remains fixed while other points move radially outward for scale factors greater than one or inward for factors less than one.

The command prompt provides a Uniform Scale field for single-factor scaling and separate X Scale, Y Scale, and Z Scale fields for non-uniform scaling. The prompt toggles between uniform and non-uniform modes based on which fields receive input. When uniform scaling is active, the separate fields are disabled to prevent confusion. When non-uniform scaling is active, the uniform field is disabled and the three separate fields become active.

The scaling operation constructs a transformation matrix from the scale origin and scale factors, then applies this matrix to geometry positions. The matrix includes both the scaling transformation and the translations needed to ensure scaling occurs relative to the specified origin rather than the world origin. For NURBS geometry, scaling affects control points while preserving the knot vector and degree, maintaining the parametric structure of the curves and surfaces.

**Command Aliases:** scale, sc

**Required Input:** Scale origin point and scale factor or factors for X, Y, and Z

**Prompt Format:** Scale Origin - X: [value] Y: [value] Z: [value], Uniform Scale: [value] or X Scale: [value] Y Scale: [value] Z Scale: [value]

### Mirror Command

The Mirror command creates mirrored copies of selected geometry across a specified plane. The command requires plane definition through a point on the plane and the plane normal vector. When invoked, the command prompts for the plane origin point, then prompts for a point that defines the normal direction by its displacement from the origin. The mirror plane is visualized as a semi-transparent rectangle extending from the origin in directions perpendicular to the normal.

The preview rendering shows the mirrored geometry on the opposite side of the mirror plane, with the original geometry remaining visible. The WebGL rendering computes mirrored positions by reflecting points across the plane using the standard reflection formula that involves projecting points onto the plane then continuing an equal distance on the opposite side.

The command prompt displays the plane origin and normal vector components. The prompt includes shortcuts for common mirror planes like XY, YZ, and ZX planes aligned with the world coordinate system. Selecting one of these shortcuts automatically sets the plane origin to the world origin and the normal to the appropriate axis direction, simplifying the workflow for symmetrical modeling tasks.

The mirror operation constructs a reflection matrix from the plane definition, applies this matrix to generate mirrored geometry, and creates new geometry records for the mirrored copies. The original geometry remains unchanged, with the mirrored copies receiving new unique identifiers. For closed curves and surfaces, the mirror operation reverses winding order to maintain proper inside-outside orientation after reflection.

**Command Aliases:** mirror, mir

**Required Input:** Plane origin point and plane normal direction point

**Prompt Format:** Plane Origin - X: [value] Y: [value] Z: [value], Plane Normal - X: [value] Y: [value] Z: [value], Plane Presets: [XY/YZ/ZX buttons]

### Array Command

The Array command creates multiple copies of selected geometry arranged in linear, rectangular, or polar patterns. The command supports three array types selectable through the command prompt. Linear arrays distribute copies along a direction vector with specified spacing and count. Rectangular arrays distribute copies in a grid pattern with independent spacing and counts for two perpendicular directions. Polar arrays distribute copies around a circular arc with specified angle increment and count.

For linear arrays, the command prompts for a direction vector and spacing distance. The preview shows copies positioned at integer multiples of the spacing vector. The command prompt displays Count and Spacing fields plus direction vector components. The spacing can be specified as distance along the direction vector or as the total extent divided by count, with the prompt toggling between these modes.

For rectangular arrays, the command prompts for two direction vectors defining the array axes and spacing values for each direction. The preview shows a grid of copies. The command prompt displays X Count, X Spacing, Y Count, and Y Spacing fields. The directions default to the construction plane U and V axes but can be customized through vector input.

For polar arrays, the command prompts for a center point, rotation axis direction, and angle increment. The preview shows copies distributed around the arc. The command prompt displays Center, Axis, Count, and Angle fields. The total rotation angle is computed as count times angle increment, with the prompt showing both the increment and total angle for reference.

**Command Aliases:** array, arr

**Required Input:** Array type selection, plus type-specific parameters for direction, spacing, count, or rotation

**Prompt Format:** Type: [Linear/Rectangular/Polar dropdown], then type-specific fields

### Offset Command

The Offset command creates parallel copies of curves or surfaces at a specified distance from the original geometry. For planar curves, the offset direction is determined by the curve's plane normal and whether the offset is inward or outward. For 3D curves, the offset requires a direction vector specification. For surfaces, the offset occurs along surface normal directions.

When invoked with selected curve geometry, the command prompts for an offset distance. The preview shows the offset curve updating as the distance changes. For closed curves, the offset can occur inward or outward, with the direction determined by the sign of the distance value. Positive distances offset outward while negative distances offset inward. The command prompt includes directional buttons that flip the offset direction by negating the distance value.

The offset operation uses geometric algorithms that compute parallel curves or surfaces while handling corner treatment for polylines and trim boundaries for surfaces. For polylines, sharp corners can result in offset segments that extend beyond adjacent segments, requiring fillet or chamfer operations to close gaps. The command prompt includes a Corner Treatment dropdown with options for Sharp, Filleted, and Chamfered corners.

The WebGL rendering displays offset curves and surfaces alongside original geometry, with preview rendering showing the offset result in semi-transparent form during command execution. For NURBS curves, the offset operation generates new NURBS curves with modified control points computed to approximate the offset shape within tolerance. The tolerance value controls how closely the offset curve matches the ideal parallel curve, with tighter tolerances requiring more control points.

**Command Aliases:** offset, off

**Required Input:** Offset distance and optional direction specification

**Prompt Format:** Distance: [value], Corner Treatment: [Sharp/Filleted/Chamfered dropdown], Tolerance: [value]

### Trim Command

The Trim command removes portions of curves or surfaces based on intersection with other geometry. The command requires two selections - cutting objects that define trim boundaries and objects to be trimmed. When invoked, the command first prompts to select cutting objects, then prompts to select objects to trim. The intersections between cutting and trimmed objects define the trim boundaries.

After selections are made, the command displays the trimmed objects with portions to be removed highlighted. Clicking on a portion toggles whether it will be kept or removed, enabling interactive selection of which pieces to retain. The command prompt shows the number of trim regions detected and provides Keep and Remove buttons that apply to the currently highlighted region.

For curve trimming, the operation splits curves at intersection points and removes curve segments based on user selection. For surface trimming, the operation creates trim curves in the surface parameter space and marks regions of the surface as inactive, rendering them invisible without actually deleting the underlying parametric surface. This trim curve approach preserves the original surface definition while controlling which portions display.

The WebGL rendering handles trimmed surfaces by testing fragment positions against trim curve boundaries during fragment shader execution. Fragments that fall outside the active region are discarded, creating the appearance of trimmed surfaces while maintaining the complete underlying surface for future editing. The trim curves themselves render as thin overlay lines that indicate trim boundaries.

**Command Aliases:** trim, tr

**Required Input:** Selection of cutting objects and objects to trim, plus interactive selection of regions to keep or remove

**Prompt Format:** Select cutting objects, then select objects to trim, then click regions to toggle keep/remove

### Split Command

The Split command divides curves or surfaces into separate pieces at specified locations without removing any geometry. For curves, split locations can be parameter values or intersection points with other geometry. For surfaces, split locations are typically curves on the surface or isoparametric lines at constant U or V values.

When invoked with selected curve geometry, the command prompts for split points through pointer clicks on the curve or through parameter value entry in the command prompt. Each split point is marked with a visual indicator on the preview curve. After all split points are specified, confirming the command divides the curve into separate curve segments at each split location, creating new geometry records for each segment.

For surface splitting, the command requires definition of split curves either through selecting existing curves that lie on the surface or through specification of isoparametric values. The preview shows the surface with split curves highlighted and indicates which surface regions will become separate objects after splitting. The command prompt displays the split curve count and provides options for splitting along U or V isoparametric directions.

The split operation creates new geometry records for each resulting piece while preserving geometric continuity at split locations. Split curves share endpoint vertices to ensure no gaps appear at split boundaries. Split surfaces share edge curves to maintain surface continuity. The WebGL rendering treats split pieces as independent geometry that can be selected, transformed, and manipulated separately.

**Command Aliases:** split, spl

**Required Input:** Split locations as points on curves or curves on surfaces

**Prompt Format:** Click split locations or enter parameter values, Isoparametric: [U/V dropdown] Value: [value]

### Join Command

The Join command combines multiple curves or surfaces into single compound geometry when the pieces share common boundaries. For curves, joining requires that curve endpoints coincide within tolerance. For surfaces, joining requires that surface edges align within tolerance. The command analyzes selected geometry to identify connectivity and proposes joining compatible pieces.

When invoked with selected geometry, the command analyzes the selection to detect which pieces can join. The command prompt displays the number of joinable groups detected and shows a list of groups with vertex or edge coincidence information. Users can accept all proposed joins, selectively join specific groups, or adjust the tolerance value to detect additional join candidates.

The join operation creates new geometry records that reference the joined pieces while maintaining their individual definitions. For curve joining, the result is a polyline or multi-segment curve that traverses the connected pieces in sequence. For surface joining, the result is a polysurface that maintains the individual surface patches while treating them as a single object for selection and transformation.

The WebGL rendering displays joined geometry as unified objects with consistent material and selection behavior. Highlighting one part of a joined object highlights the entire object. Transform operations applied to joined geometry affect all constituent pieces simultaneously. The internal structure of joined objects remains accessible for operations that need to manipulate individual pieces like splitting or trimming specific patches.

**Command Aliases:** join, jn

**Required Input:** Selection of two or more compatible geometry elements with coincident boundaries

**Prompt Format:** Detected groups: [count], Tolerance: [value], Join All: [button] or Join Selected: [button]

## Numerica Node Types

### Point Generator Node

The Point Generator node creates vertex geometry at specified coordinates within the Numerica computational graph. The node exposes three numeric input ports labeled X, Y, and Z that accept floating-point values defining the point position. The output port labeled Point emits a geometry reference identifier that downstream nodes can use to access the created vertex.

When the node evaluates, it constructs a vertex geometry record with position derived from the input port values, generates a unique identifier for the vertex, stores the record in the geometry store, and returns the identifier through the output port. This evaluation occurs lazily when downstream nodes request the Point output value, ensuring that point creation only happens when actually needed by the graph.

The node's parameter panel includes input fields for X, Y, and Z coordinates that serve as default values when the corresponding input ports are not connected. When an input port receives a connection, the connected value overrides the parameter default. This dual input mechanism enables both static point creation through parameters and dynamic point creation through upstream node connections.

Multiple Point Generator nodes can be wired together through Array or List nodes to create collections of points that feed into curve creation nodes or other operations requiring multiple point inputs. The Point Generator serves as the foundational geometry node that introduces new geometric entities into the workflow graph.

**Input Ports:** X (number), Y (number), Z (number)

**Output Ports:** Point (geometry reference)

**Parameters:** X coordinate (default 0), Y coordinate (default 0), Z coordinate (default 0)

### Line Builder Node

The Line Builder node creates polyline geometry connecting two input points. The node exposes two geometry reference input ports labeled Start and End that accept point geometry references from upstream nodes. The output port labeled Line emits a polyline geometry reference with two vertices at the positions of the input points.

Node evaluation retrieves the point geometry records referenced by the input ports, extracts their position coordinates, constructs a polyline geometry record with two vertices at those positions, stores the polyline in the geometry store, and returns its identifier through the output port. The evaluation handles cases where input references are invalid by emitting an error state rather than creating malformed geometry.

The node's canvas rendering shows the node title, input port labels on the left edge with small circles indicating port locations, and the output port label on the right edge. When connections exist, bezier curves draw from upstream output ports to this node's input ports. The port circles use color coding where geometry reference ports use one color and numeric ports use a different color, providing visual distinction between data types.

The Line Builder node combines with Point Generator nodes to enable procedural line creation where line endpoints are computed by upstream nodes rather than interactively placed. This enables parametric workflows where line positions update automatically when upstream parameters change.

**Input Ports:** Start (geometry reference), End (geometry reference)

**Output Ports:** Line (geometry reference)

**Parameters:** None

### Circle Generator Node

The Circle Generator node creates NURBS circle curve geometry from center point, radius, and plane definition inputs. The node exposes input ports for Center (geometry reference to a point), Radius (number), and Normal (vector defining the circle plane orientation). The output port labeled Circle emits a NURBS curve geometry reference representing the circular arc.

Node evaluation retrieves the center point position, uses the radius value to scale the circle, constructs control points and weights for a rational NURBS circle representation, applies transformation to orient the circle perpendicular to the normal vector, stores the NURBS curve record, and returns its identifier. The normal vector defaults to the Z axis when not connected, creating circles in the XY plane.

The parameter panel includes a Radius field for static radius specification and Normal vector component fields for X, Y, and Z direction. When Radius or Normal input ports are connected, those connections override the parameter values. This enables both static circles and parametrically controlled circles that respond to upstream computations.

The Circle Generator enables procedural circular geometry creation for workflows like creating arrays of circles with varying radii, generating circles tangent to other curves, or constructing circular profiles for extrusion operations. Combined with Array nodes, multiple circles can be generated in patterns that would be tedious to create through interactive commands.

**Input Ports:** Center (geometry reference), Radius (number), Normal (vector)

**Output Ports:** Circle (geometry reference)

**Parameters:** Radius (default 1.0), Normal X (default 0), Normal Y (default 0), Normal Z (default 1)

### Box Builder Node

The Box Builder node creates box mesh geometry from dimension parameters and placement inputs. The node exposes input ports for Corner (geometry reference to base corner point), Length (number), Width (number), and Height (number). The output port labeled Box emits a mesh geometry reference representing the six-faced box.

Node evaluation retrieves the corner point position, constructs eight vertices offset from the corner by the dimension values, defines twelve edges connecting the vertices in the standard box topology, defines six quadrilateral faces from the edges, computes normal vectors for each face, stores the mesh record, and returns its identifier through the output port.

The parameter panel provides dimension input fields and a Center Mode checkbox that changes interpretation of the Corner input from a corner location to a center location. When center mode is active, the node computes vertex positions by offsetting half the dimension values in each direction from the center point rather than using the corner as the origin.

The Box Builder enables parametric solid creation where box dimensions are driven by mathematical expressions or measurements from other geometry. Connecting dimension inputs to computation nodes creates boxes that resize automatically based on design parameters or constraints.

**Input Ports:** Corner (geometry reference), Length (number), Width (number), Height (number)

**Output Ports:** Box (geometry reference)

**Parameters:** Length (default 1.0), Width (default 1.0), Height (default 1.0), Center Mode (default false)

### Transform Node

The Transform node applies translation, rotation, and scaling transformations to input geometry. The node exposes a Geometry input port accepting geometry references, plus Transform input port accepting transformation matrix values. The output port labeled Transformed emits the geometry reference for the transformed result.

Node evaluation retrieves the input geometry record, applies the transformation matrix to the geometry's positional data (vertices, control points, or other position-defining elements), creates a new geometry record with the transformed positions, stores the new record, and returns its identifier. The original input geometry remains unchanged in the store, with the transform creating a new independent copy.

The parameter panel includes separate input groups for Translation (X, Y, Z offset values), Rotation (axis definition and angle), and Scale (uniform or non-uniform factors). The node computes a composite transformation matrix from these parameters and applies it to the geometry. When the Transform input port is connected, the connected matrix overrides the parameter-based transformation.

The Transform node serves as the computational equivalent of the Move, Rotate, and Scale commands, enabling transformations within the node graph. Combined with expression nodes that compute transformation parameters, the Transform node creates parametric positioning where geometry location and orientation derive from design logic rather than interactive placement.

**Input Ports:** Geometry (geometry reference), Transform (matrix)

**Output Ports:** Transformed (geometry reference)

**Parameters:** Translation X/Y/Z (defaults 0), Rotation Axis X/Y/Z (defaults 0,0,1), Rotation Angle (default 0), Scale X/Y/Z (defaults 1)

### Extrude Node

The Extrude node creates surface geometry by extruding a profile curve along a path or perpendicular to its plane. The node exposes Profile input accepting curve geometry, Path input optionally accepting curve geometry for path-based extrusion, and Distance input accepting a number for linear extrusion distance. The output port labeled Surface emits the extrusion geometry reference.

Node evaluation determines the extrusion mode based on whether the Path input is connected. For linear extrusion, the node retrieves the profile curve, constructs an extrusion record with the distance parameter and perpendicular direction, stores the extrusion record, and returns its identifier. For path-based extrusion, the node retrieves both profile and path curves, constructs an extrusion record referencing both curves, and stores the result.

The parameter panel includes Distance, Twist, and Scale fields for linear extrusion parameters. The twist value specifies rotation in degrees per unit length along the extrusion direction. The scale value controls how the profile size changes from start to end of the extrusion, with values less than one creating tapered shapes.

The Extrude node enables parametric surface creation where profile shapes and extrusion parameters derive from upstream computations. Connecting the Profile input to curve generation nodes creates extrusions that update automatically when the profile curve changes shape or position.

**Input Ports:** Profile (geometry reference to curve), Path (geometry reference to curve, optional), Distance (number)

**Output Ports:** Surface (geometry reference)

**Parameters:** Distance (default 1.0), Twist (default 0 degrees/unit), Scale (default 1.0)

### Array Node

The Array node creates multiple copies of input geometry arranged in patterns. The node exposes Geometry input accepting the geometry to array, plus mode-specific inputs for Linear, Rectangular, or Polar array types. The output port labeled Array emits a collection of geometry references for all array copies.

For linear arrays, the node uses Direction vector input, Spacing number input, and Count number input to compute positions for each copy. Node evaluation generates transformation matrices at integer multiples of the spacing vector, applies each transformation to the input geometry, creates geometry records for all copies, and returns a collection of identifiers.

For rectangular arrays, the node uses U Direction and V Direction vector inputs, U Spacing and V Spacing number inputs, and U Count and V Count number inputs. Evaluation generates a grid of transformation matrices combining offsets in both directions, creates geometry for each grid position, and returns the collection of identifiers.

For polar arrays, the node uses Center point input, Axis vector input, Angle number input, and Count number input. Evaluation generates rotation matrices at angle increments around the specified axis, applies rotations to create copies, and returns the collection.

**Input Ports:** Geometry (geometry reference), plus mode-specific inputs

**Output Ports:** Array (geometry reference collection)

**Parameters:** Mode (Linear/Rectangular/Polar dropdown), plus mode-specific numeric and vector parameters

### Boolean Node

The Boolean node performs union, intersection, or difference operations on solid geometry. The node exposes Geometry A and Geometry B inputs accepting mesh or surface geometry references, plus Operation input selecting which Boolean operation to perform. The output port labeled Result emits the geometry reference for the Boolean result.

Node evaluation retrieves the input geometry records, converts them to mesh representations if necessary through tessellation, computes the Boolean operation using mesh intersection algorithms, constructs result mesh geometry with vertices and faces from the Boolean computation, stores the result mesh, and returns its identifier.

The parameter panel includes an Operation dropdown with Union, Intersection, and Difference options. Union combines both geometries into a single volume. Intersection retains only the overlapping volume. Difference subtracts Geometry B from Geometry A, creating holes or cutouts.

Boolean operations require robust geometric algorithms that handle edge cases like coplanar faces, coincident vertices, and degenerate intersections. The node implementation uses tolerance-based comparisons and mesh repair operations to ensure valid results even when input geometry has minor imperfections.

**Input Ports:** Geometry A (geometry reference), Geometry B (geometry reference), Operation (enumeration)

**Output Ports:** Result (geometry reference)

**Parameters:** Operation (Union/Intersection/Difference dropdown), Tolerance (default 0.001)

### Topology Optimization Node

The Topology Optimization node configures a density-based voxel optimization run for a given design domain. The node captures optimization settings such as volume fraction, penalization exponent, and filter radius while exposing live progress metadata (iteration, objective, constraint, status). The actual solver integration is staged: the node currently stores settings and progress values in its node data and outputs them for downstream inspection until the voxel solver pipeline is wired in.

When voxelization and solver services are available, the node will accept a voxel grid or geometry domain reference on its input port and emit the optimized voxel density field on its output port. For now, it serves as the authoritative settings container that can be referenced by other nodes and UI overlays.

**Input Ports:** Domain (geometry reference or voxel grid placeholder)

**Output Ports:** Optimization Settings + Progress (stored in `outputs` map)

**Parameters:** Volume Fraction (default 0.4), Penalty Exponent (default 3), Filter Radius (default 1.5), Max Iterations (default 80), Convergence Tolerance (default 0.001)

### Offset Node

The Offset node creates parallel copies of curves or surfaces at specified distances. The node exposes Geometry input accepting curve or surface references, Distance input accepting the offset amount, and optional Direction input for 3D curve offsets. The output port labeled Offset emits the offset geometry reference.

Node evaluation retrieves the input geometry, determines the offset direction based on geometry type and direction input, computes parallel curve or surface using geometric algorithms, constructs the offset geometry record, stores it, and returns its identifier. For curves, the offset computation handles corner treatment based on parameter settings. For surfaces, the offset occurs along normal directions.

The parameter panel includes Distance field, Corner Treatment dropdown for polyline offsets, and Tolerance field controlling offset accuracy. The corner treatment options include Sharp corners that extend offset segments to intersection, Filleted corners that insert circular arcs, and Chamfered corners that insert straight line segments.

The Offset node enables parametric offset workflows where offset distances derive from design parameters or measurements. Connecting Distance input to computation nodes creates offsets that update automatically when the distance value changes.

**Input Ports:** Geometry (geometry reference), Distance (number), Direction (vector, optional)

**Output Ports:** Offset (geometry reference)

**Parameters:** Distance (default 1.0), Corner Treatment (Sharp/Filleted/Chamfered), Tolerance (default 0.01)

### Measurement Node

The Measurement node computes geometric properties of input geometry like length, area, volume, or bounding box dimensions. The node exposes Geometry input accepting any geometry reference and Property input selecting which measurement to compute. The output port labeled Value emits the computed numeric value.

Node evaluation retrieves the input geometry, dispatches to property-specific computation routines based on the Property selection, computes the requested measurement using appropriate geometric algorithms, and returns the numeric result. For curves, available properties include length, arc length parameterization, and endpoints. For surfaces, properties include area, perimeter, and bounding box. For meshes, properties include volume, surface area, and centroid.

The parameter panel includes a Property dropdown listing available measurements. The list of properties adapts based on the input geometry type, showing only measurements applicable to that geometry. Connecting different geometry types to the input causes the property dropdown to update its options.

The Measurement node enables data-driven design where dimensions and quantities extracted from geometry drive subsequent operations. Connecting measurement outputs to other node parameters creates relationships where one geometry's properties control another geometry's creation or transformation.

**Input Ports:** Geometry (geometry reference), Property (enumeration)

**Output Ports:** Value (number)

**Parameters:** Property (dropdown with type-specific options)

### Expression Node

The Expression node evaluates mathematical expressions to compute numeric outputs. The node exposes a dynamic number of input ports based on the expression syntax, plus a single numeric output port labeled Result. The expression can reference input port values by name and can use standard mathematical operators and functions.

Node evaluation parses the expression string to identify variable references, retrieves values from the corresponding input ports, substitutes the values into the expression, evaluates the mathematical expression using a safe expression evaluator, and returns the computed result through the output port.

The parameter panel includes an Expression text field where users type mathematical expressions using syntax like "a + b * 2" or "sqrt(x^2 + y^2)". As the expression is typed, the node analyzes the syntax to identify variable names and automatically creates input ports for each unique variable. Deleting variable references from the expression removes the corresponding input ports.

The Expression node enables computational workflows where numeric values derive from formulas rather than static parameters. Connecting expression outputs to geometry node inputs creates parametric relationships where geometric properties follow mathematical rules.

**Input Ports:** Dynamic ports based on expression variables

**Output Ports:** Result (number)

**Parameters:** Expression (text field with mathematical syntax)

### Conditional Node

The Conditional node implements if-then-else logic that selects between two input values based on a boolean condition. The node exposes Condition input accepting boolean values, True Value and False Value inputs accepting any data type, and an output port labeled Result that emits either the true or false value based on the condition.

Node evaluation retrieves the condition value, selects either the True Value or False Value input based on whether the condition is true or false, and returns the selected value through the output port. The node supports any data type for the value inputs including numbers, vectors, and geometry references, enabling conditional selection of different geometric elements or numeric parameters.

The parameter panel includes a dropdown for selecting common condition types like Greater Than, Less Than, Equal To, and Not Equal To. When these condition types are selected, the node exposes additional input ports for the comparison values. The node also supports direct boolean input through the Condition port for complex conditions computed by upstream logic nodes.

The Conditional node enables branching workflows where different geometric operations execute based on design conditions or measurements. Connecting measurement node outputs to condition inputs creates conditional geometry that adapts based on properties of other geometry in the model.

**Input Ports:** Condition (boolean), True Value (any type), False Value (any type)

**Output Ports:** Result (same type as value inputs)

**Parameters:** Condition Type (dropdown with comparison operators)

## Mastering the Transform Gumball

The transform gumball serves as the primary direct manipulation tool for interactive geometry transformation in the Roslyn viewport. Understanding the gumball's structure and interaction modes enables efficient modeling workflows that combine visual manipulation with numeric precision. The gumball appears automatically when geometry is selected and provides unified access to translation, rotation, and scaling operations through a single interactive widget.

### Gumball Structure and Components

The gumball consists of multiple handle types arranged around the selection's pivot point. The axis arrows extend outward along the X, Y, and Z coordinate axes, colored red, green, and blue respectively to provide immediate visual identification. Each arrow enables translation along its corresponding axis. The arrow shafts are the primary interaction zones, with hit areas tuned to enable easy grabbing even at shallow viewing angles.

The axis caps at the arrow tips provide additional translation handles with larger hit areas than the shafts. Recent tuning has optimized cap sizes to balance ease of selection against visual clutter, ensuring the caps are large enough to grab reliably without obscuring geometry or overlapping adjacent handles. The caps use additive rendering that makes them glow slightly when under the pointer, providing clear feedback about which handle will activate when clicked.

The planar handles appear as squares positioned between pairs of axes, colored to match the plane they represent. The XY plane handle uses yellow coloring, the YZ plane uses cyan, and the ZX plane uses magenta. Each planar handle enables simultaneous translation along two axes while constraining movement to remain in the corresponding plane. The planar handles have been sized to provide sufficient hit area without extending so far that they interfere with axis handle interaction.

The rotation rings encircle the gumball perpendicular to each axis, providing rotation controls around the corresponding axis. The rings are rendered as torus geometry with carefully tuned major and minor radii that make them easy to grab while maintaining visual clarity. Each ring highlights when the pointer hovers over it, transitioning to a brighter color that indicates readiness for interaction.

The scale handles appear as small cubes positioned along each axis beyond the arrow caps. These handles enable uniform or non-uniform scaling depending on which handle is grabbed. The individual axis scale handles constrain scaling to a single direction, while the center sphere handle enables uniform scaling in all directions simultaneously.

The extrude handle appears for selected face components, positioned at the face center and oriented perpendicular to the face normal. This specialized handle enables direct face extrusion through pointer dragging, providing immediate access to one of the most common modeling operations without requiring command invocation.

### Translation Workflow

Translation operations begin by grabbing an axis arrow or planar handle. When the pointer moves over a handle, the handle highlights to indicate readiness. Clicking and dragging the handle initiates a transform session that captures the initial geometry state and begins accumulating displacement as the pointer moves.

During dragging, the viewport renders a semi-transparent preview of the geometry at its transformed position while maintaining visibility of the original position. This dual rendering provides clear feedback about the transformation being applied. The WebGL rendering uses separate vertex buffers for original and preview geometry, enabling efficient updates without rebuilding the entire scene.

The command prompt activates during translation, displaying numeric fields for the displacement in X, Y, and Z components. As the pointer drags, these fields update in real time to show the current displacement vector. Users can type values directly into these fields to specify exact displacements, with the preview geometry snapping to match the typed values.

Snapping operates during translation to align the transformed geometry with grid intersections, existing geometry vertices, or geometric features like midpoints and intersections. The snap indicators appear as small colored markers at snap locations, with the preview geometry jumping to snap positions when the pointer approaches them within snap tolerance. The Tab key cycles through multiple snap candidates when several exist at similar distances.

The translation session completes when the pointer is released, at which point the final transformation is committed to the store through actions that update geometry records atomically. The undo system records the pre-transformation state before this update, enabling the transformation to be reverted. Pressing Escape during dragging cancels the translation and restores the original geometry without recording history.

### Rotation Workflow

Rotation operations begin by grabbing one of the rotation rings. The ring highlights as the pointer approaches, transitioning to a brighter color. Clicking the ring initiates a rotation session that captures the initial geometry orientation and establishes the rotation axis aligned with the ring's perpendicular direction.

As the pointer drags around the ring, the rotation angle increases or decreases based on the angular displacement from the click position. The viewport renders a preview of the rotated geometry with the rotation axis visualized as a thin line extending through the scene. The WebGL rendering applies rotation matrices to preview geometry during each frame, providing smooth interactive feedback.

The command prompt displays the current rotation angle in degrees, updating in real time as the pointer moves. Users can type a specific angle value to achieve precise rotation by known amounts. The prompt includes increment buttons that adjust the angle by fixed amounts like fifteen or forty-five degrees, enabling quick alignment to common angular relationships.

Snapping operates during rotation to align the transformed geometry with notable angles. The snap system detects when the current angle approaches multiples of fifteen or forty-five degrees and snaps the rotation to those values within a tolerance threshold. Holding Shift temporarily disables angle snapping to allow free rotation at arbitrary angles.

The rotation session completes when the pointer is released, committing the final rotation through store actions. The session can be cancelled by pressing Escape, which restores the original orientation. Multiple rotation operations can be applied sequentially by grabbing different rotation rings, with each operation building on the previous result.

### Scaling Workflow

Scaling operations begin by grabbing one of the scale handles. The individual axis scale cubes enable non-uniform scaling along their corresponding axes. The center sphere handle enables uniform scaling in all directions simultaneously. The handle highlights as the pointer approaches to indicate readiness for interaction.

Clicking and dragging a scale handle initiates a scaling session that captures the initial geometry size and establishes the scale origin at the gumball pivot point. As the pointer moves away from the origin, the scale factor increases. As the pointer moves toward the origin, the scale factor decreases. The viewport renders a preview of the scaled geometry with visual feedback showing both original and transformed sizes.

The command prompt displays the current scale factor as a numeric value, with separate fields for X, Y, and Z factors when using non-uniform scaling. For uniform scaling, a single Scale field displays the common factor applied in all directions. Users can type specific scale factors to achieve precise sizing.

The scaling operation maintains the gumball pivot point as the fixed reference location, ensuring that the pivot remains stationary while other points move radially. This behavior differs from scaling about the world origin and provides more intuitive control over where scaling occurs. The preview rendering clearly shows which point remains fixed and how other points displace.

The scaling session completes when the pointer is released, committing the final scale transformation. Pressing Escape cancels the scaling and restores the original size. Scale factors less than one create smaller geometry, while factors greater than one create larger geometry. Negative scale factors create mirrored geometry in addition to scaling.

### Extrusion Workflow with Face Selection

When face components are selected, the gumball displays an extrude handle positioned at the face center and oriented along the face normal. This handle provides direct access to face extrusion without requiring explicit command invocation. The handle appears as a small arrow extending perpendicular to the face surface.

Clicking and dragging the extrude handle initiates an extrusion session specific to the selected face. As the pointer moves along the extrusion direction, the face displaces perpendicular to its original plane while remaining connected to adjacent faces through newly created side faces. The preview rendering shows the extruded geometry with semi-transparent materials.

The command prompt displays the extrusion distance as a numeric value that updates during dragging. Users can type a specific distance to achieve precise extrusion depths. Positive distances extrude outward from the original surface, while negative distances extrude inward, creating indentations or pockets.

The extrusion operation creates new geometry that extends the selected face while maintaining connection to the surrounding geometry. For mesh faces, the operation inserts new vertices at the extruded positions and creates new faces connecting the original and extruded boundaries. For NURBS surfaces, the operation may create edge curves and construct new surface patches that extend from the original surface.

Multiple faces can be selected simultaneously, with each face receiving its own extrude handle. Dragging any handle extrudes all selected faces by the same distance along their respective normals. This uniform extrusion enables creating complex features like multiple protrusions or indentations in a single operation.

### Pivot Point Management

The gumball pivot point determines the center of rotation and scaling operations and serves as the reference location for various transformations. By default, the pivot positions at the centroid of the selected geometry, computing the average position of all vertices or control points in the selection. This automatic positioning works well for symmetric geometry but may not align optimally for asymmetric selections.

The pivot can be repositioned by holding the Alt key and clicking a new location in the viewport. The gumball relocates to the clicked position, with subsequent transformations occurring relative to this new pivot. Common pivot locations include geometry vertices for rotation around specific points, face centers for scaling relative to faces, or grid intersections for alignment with the construction plane.

The command prompt includes a Pivot section with coordinate fields showing the current pivot position. Users can type specific coordinates to position the pivot numerically. The prompt also includes preset buttons for common pivot locations like Centroid (the default), Origin (the world coordinate system origin), and BoundingCenter (the center of the selection's bounding box).

The pivot point persists across multiple transform operations until the selection changes or the pivot is explicitly repositioned. This persistence enables performing several transformations relative to the same reference point without re-establishing the pivot each time. The pivot visualization includes a small sphere at its location plus coordinate axis indicators showing the pivot's local coordinate frame.

### Coordinate System Modes

The gumball supports multiple coordinate system modes that determine the orientation of its axis handles. The World mode aligns the gumball axes with the world coordinate system's X, Y, and Z directions regardless of selection orientation. This mode provides consistent directional behavior but may not align naturally with the selected geometry's orientation.

The Local mode aligns the gumball axes with the selected geometry's natural orientation. For planar curves, the local axes align with the curve's plane. For surfaces, the axes align with the surface's U and V directions at the selection point. This mode provides intuitive manipulation relative to the geometry's intrinsic structure but changes orientation as different geometry is selected.

The View mode aligns one gumball axis with the camera's view direction while the other two axes lie in the view plane. This mode simplifies translation parallel to the screen or perpendicular to the screen, enabling intuitive "pull toward camera" or "push away from camera" manipulations.

The coordinate system mode is selected through a button in the Roslyn panel header or through the C keyboard shortcut that cycles between World, Local, and View modes. The current mode is indicated by a badge on the gumball visualization and by the axis color scheme. The mode setting affects all subsequent transform operations until changed.

### Precision and Snapping Integration

The gumball integrates with the viewport's snapping system to enable precise transformations aligned with grid, geometry, or geometric relationships. During translation, the snap system tests the transformed geometry position against snap candidates and highlights snap locations with colored markers. When the transformed position approaches a snap location within tolerance, the transformation snaps to that location.

Grid snapping aligns transformations with the construction plane grid at intervals determined by the grid spacing setting. Vertex snapping aligns with existing geometry vertices, enabling precise positioning relative to other model elements. Geometric snapping aligns with computed locations like edge midpoints, face centers, or intersection points between geometry and the construction plane.

The snapping tolerance is configurable through the settings panel and determines how close a transformation must approach a snap location before snapping occurs. Tighter tolerances require more precise pointer positioning, while looser tolerances make snapping easier to trigger but may snap to unintended locations. The default tolerance balances precision and ease of use for typical modeling tasks.

Snapping can be temporarily disabled by holding the Ctrl key during transformation, allowing free movement without snap interference. This temporary override enables fine adjustments near snap locations without fighting the snap behavior. Releasing Ctrl re-enables snapping for subsequent positioning.

### Numeric Input During Transformation

The command prompt remains active throughout gumball transformations, providing numeric fields that display current transformation parameters and accept typed input for precise control. As transformations occur through pointer dragging, the prompt fields update in real time to show displacement vectors, rotation angles, or scale factors.

Users can click in any prompt field and type a new value while a transformation is in progress. Typing a value updates the transformation to match the typed parameter, with the preview geometry snapping to the specified state. This hybrid interaction model combines visual manipulation for approximate positioning with numeric input for exact specification.

The prompt supports mathematical expressions in numeric fields, enabling transformations specified as calculations rather than literal values. Typing "10 * 2" in a translation field creates a twenty-unit displacement. Typing "45 + 15" in a rotation field creates a sixty-degree rotation. The expression evaluator supports standard operators and functions.

The Tab key advances focus between prompt fields, enabling efficient keyboard entry of multiple parameters without mouse interaction. Shift+Tab moves focus backward through fields. Pressing Enter commits the current transformation and closes the session. Pressing Escape cancels the transformation and restores the original geometry state.

### Multi-Object and Component Transformations

When multiple objects are selected simultaneously, the gumball transforms all selected objects uniformly by the same displacement, rotation, or scale. The gumball pivot is positioned at the collective centroid of all selected objects, with transformations occurring relative to this shared pivot. This behavior enables moving groups of objects while maintaining their relative positions.

For component selections where specific vertices, edges, or faces are selected across one or more objects, the gumball transforms only the selected components. Unselected components within the same objects remain stationary. The WebGL rendering shows both stationary and transformed components during preview, clearly indicating which portions of the geometry will move.

Face extrusion operates per-face when multiple faces are selected, with each face extruding along its individual normal direction. This enables creating multiple protrusions from a surface in a single operation. Edge extrusion similarly operates per-edge, though edge extrusion may require additional interaction to specify the extrusion direction since edges do not have unique normals.

Component transformations may create non-manifold geometry or self-intersections depending on the specific transformation applied. The preview rendering shows the resulting geometry shape before commitment, allowing users to verify that the transformation produces the intended result. Transformations that produce invalid topology can be cancelled rather than committed to avoid introducing problematic geometry.

### Performance Optimization for Large Selections

The gumball and preview rendering system is optimized to maintain interactive performance even when transforming selections containing thousands of vertices or complex NURBS geometry. The preview geometry uses lower tessellation resolution than final committed geometry, trading some visual quality for responsive interaction during dragging.

For very large selections, the preview rendering may skip certain geometry types or use simplified representations to maintain frame rates. The status indicator in the Roslyn panel shows when preview simplification is active and reports the current frame rate. After transformation commitment, the full-quality geometry renders using the standard tessellation resolution.

The transform session maintains cached transformation matrices and applies them incrementally rather than recomputing transformations from scratch during each frame. This cached approach reduces CPU overhead and enables smooth preview updates. The matrices update only when transformation parameters change, not on every frame.

The WebGL rendering pipeline uses instanced rendering for repeated geometry like vertices, reducing draw call overhead when transforming many points simultaneously. Shader uniforms carry transformation matrices that apply to entire instance batches, enabling the GPU to process thousands of vertices in parallel during preview rendering.

## Integration and Workflow Patterns

The command system and node graph provide complementary approaches to geometry creation and modification that users can combine based on their workflow preferences. Interactive commands in Roslyn enable direct visual modeling with immediate feedback, while nodes in Numerica enable parametric workflows where geometry updates automatically when parameters change.

Common workflow patterns include using commands for initial geometry creation followed by node-based parameterization to add flexibility. A user might sketch a profile curve interactively through the Polyline command, then connect that curve to an Extrude node where the extrusion distance is driven by an Expression node. This hybrid approach combines the intuition of direct manipulation with the power of parametric relationships.

The transform gumball serves both interactive and parametric workflows by providing immediate visual manipulation of geometry regardless of how it was created. Geometry created through nodes can be selected and transformed through the gumball, with the transformations stored as separate geometry records that layer on top of the node-generated base geometry. This layering enables parametric geometry to be positioned and oriented interactively.

Understanding when to use commands versus nodes versus gumball manipulation accelerates modeling productivity. Commands excel at one-time geometry creation with known parameters. Nodes excel at geometry that must update based on changing design parameters. The gumball excels at iterative positioning and shaping where visual feedback guides the transformation. Skilled users fluidly transition between these approaches as modeling tasks evolve.
