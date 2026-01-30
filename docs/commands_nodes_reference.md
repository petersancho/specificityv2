# Lingua Command and Node Reference

Updated: 2026-01-30

This reference is generated from the command and node registries to keep documentation aligned with the UI.
Source files:
- `client/src/commands/registry.ts`
- `client/src/data/commandDescriptions.ts`
- `client/src/workflow/nodeRegistry.ts`
- `client/src/data/primitiveCatalog.ts`

## Update Protocol

- Treat the registries as the source of truth; update them first.
- Regenerate this file when commands or nodes change (or update it alongside the registries if a generator is not available).
- Keep the `Updated:` stamp accurate to avoid drift between UI and documentation.

## Testing

- Use `command_node_test_matrix.md` to validate each command end-to-end.

## Roslyn Command Index

### Primitive
- Bipyramid (`bipyramid`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Bipyramid. Esc cancels.
- Box (`box`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Box. Esc cancels.
- Capsule (`capsule`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Capsule. Esc cancels.
- Cylinder (`cylinder`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Cylinder. Esc cancels.
- Disk (`disk`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Disk. Esc cancels.
- Dodecahedron (`dodecahedron`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Dodecahedron. Esc cancels.
- Ellipsoid (`ellipsoid`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Ellipsoid. Esc cancels.
- Frustum (`frustum`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Frustum. Esc cancels.
- Geodesic Dome (`geodesic-dome`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Geodesic Dome. Esc cancels.
- Hemisphere (`hemisphere`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Hemisphere. Esc cancels.
- Hexagonal Prism (`hexagonal-prism`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Hexagonal Prism. Esc cancels.
- Hyperbolic Paraboloid (`hyperbolic-paraboloid`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Hyperbolic Paraboloid. Esc cancels.
- Icosahedron (`icosahedron`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Icosahedron. Esc cancels.
- Mobius Strip (`mobius-strip`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Mobius Strip. Esc cancels.
- Octahedron (`octahedron`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Octahedron. Esc cancels.
- One-Sheet Hyperboloid (`one-sheet-hyperboloid`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the One-Sheet Hyperboloid. Esc cancels.
- Pentagonal Prism (`pentagonal-prism`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Pentagonal Prism. Esc cancels.
- Pipe / Hollow Cylinder (`pipe`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Pipe / Hollow Cylinder. Esc cancels.
- Point (`point`): Click to place a point on the active C-Plane. Use snaps for precision; Esc cancels.
- Pyramid (`pyramid`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Pyramid. Esc cancels.
- Rhombic Dodecahedron (`rhombic-dodecahedron`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Rhombic Dodecahedron. Esc cancels.
- Ring / Annulus (`ring`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Ring / Annulus. Esc cancels.
- Sphere (`sphere`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Sphere. Esc cancels.
- Spherical Cap / Dome (`spherical-cap`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Spherical Cap / Dome. Esc cancels.
- Superellipsoid (`superellipsoid`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Superellipsoid. Esc cancels.
- Tetrahedron (`tetrahedron`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Tetrahedron. Esc cancels.
- Torus (`torus`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Torus. Esc cancels.
- Torus Knot (`torus-knot`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Torus Knot. Esc cancels.
- Triangular Prism (`triangular-prism`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Triangular Prism. Esc cancels.
- Truncated Cube (`truncated-cube`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Truncated Cube. Esc cancels.
- Truncated Icosahedron (`truncated-icosahedron`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Truncated Icosahedron. Esc cancels.
- Truncated Octahedron (`truncated-octahedron`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Truncated Octahedron. Esc cancels.
- Utah Teapot (`utah-teapot`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Utah Teapot. Esc cancels.
- Wedge (`wedge`): Click to place the base on the C-Plane, drag or type a size, then click to confirm the Wedge. Esc cancels.

### Curve
- Line (`line`): Click start and end points, then keep clicking to chain segments. Double-click or Enter to finish; Esc cancels.
- Polyline (`polyline`): Click to add vertices; right-click, Enter, or double-click to finish. Esc cancels.
- Rectangle (`rectangle`): Click the first corner, then the opposite corner. Type width,height for an exact size.

### NURBS
- Arc (`arc`): Click start, click end, then click a bulge point to set curvature. Enter to finish.
- Circle (`circle`): Click the center, then the radius. Type a value to set exact size.
- Curve (`curve`): Click control points to shape the curve. Right-click or double-click to finish.
- Interpolate (`interpolate`): Convert polylines into smooth NURBS by interpolating through vertices. Select curves, then Run.

### Mesh
- Boolean (`boolean`): select solids, then click Run to combine. Esc cancels.
- Extrude (`extrude`): Extrude a profile or surface along the C-Plane normal. Drag to set distance or type a value.
- Loft (`loft`): Loft between two or more curves; order matters. Select profiles in sequence, then Run.
- Mesh Flip (`meshflip`): Flip mesh normals and triangle winding to fix inside-out faces.
- Mesh Merge (`meshmerge`): Combine selected meshes into a single mesh object.
- Mesh Thicken (`meshthicken`): Offset mesh along normals and cap edges to add thickness.
- Mesh to NURBS (`nurbsrestore`): Attempt to rebuild NURBS curves or surfaces from converted meshes. Best for recent conversions.
- NURBS to Mesh (`meshconvert`): Triangulate NURBS curves or surfaces into editable meshes for rendering and mesh edits.
- Surface (`surface`): Create a planar surface from a closed curve or polyline. Select the boundary, then Run.

### Transform
- Array (`array`): Duplicate selection along a vector with spacing and count controls.
- Mirror (`mirror`): Mirror selected geometry across a line or plane you define.
- Morph (`morph`): select geometry, then click-drag to sculpt. Esc cancels.
- Move (`move`): Drag gumball axes or type XYZ to translate the selection precisely.
- Offset (`offset`): Offset selected curves by a distance; positive/negative controls direction.
- Rotate (`rotate`): Drag a rotation ring or type an angle. Uses the current pivot.
- Scale (`scale`): Drag scale handles or type factors. Hold Shift for uniform scale around the pivot.
- Transform (`transform`): select geometry, drag gumball handles or enter values.

### Gumball
- Gumball (`gumball`): Use handles to move, rotate, or scale. Click again to confirm, Esc cancels.

### Pivot
- Pivot (`pivot`): click a pivot mode, then click a point to place it.

### C-Plane
- C-Plane (`cplane`): click world XY/XZ/YZ or click 3 points to define a plane.

### Selection
- Cycle Selection (`cycle`): click to cycle overlapping picks (Tab also works).
- Grid (`grid`): click to change spacing/units or toggle adaptive grid.
- Selection Filter (`selectionfilter`): click Object/Vertex/Edge/Face to change picks.
- Snapping (`snapping`): click to toggle grid/vertex/endpoint/midpoint/intersection.
- Tolerance (`tolerance`): click to set absolute and angle tolerance.

### Camera
- Camera (`camera`): click to toggle camera options (zoom to cursor, invert zoom, upright).
- Orbit (`orbit`): click-drag (right mouse) to orbit the view.
- Pan (`pan`): click-drag (middle mouse or Shift+right) to pan.
- Zoom (`zoom`): scroll to zoom in/out. Click to toggle zoom mode.

### View
- Display (`display`): click to switch wireframe/shaded/edges/ghosted/silhouette.
- Focus (`focus`): Frame the current selection for a tight view.
- Frame All (`frameall`): Frame all visible geometry.
- Isolate (`isolate`): click to hide/lock selection; click again to show all.
- Status (`status`): click to toggle command help/status bar.
- View (`view`): click to switch to top/front/right/perspective.

### Workflow
- Outliner (`outliner`): click to manage groups, layers, and visibility.

### Edit
- Cancel (`cancel`): click or press Esc to cancel the active command.
- Confirm (`confirm`): click or press Enter to commit the active command.
- Copy (`copy`): click or press Cmd/Ctrl+C to copy selection.
- Delete (`delete`): click or press Delete/Backspace to remove selection.
- Duplicate (`duplicate`): click or press Cmd/Ctrl+D. Alt-drag also duplicates.
- Paste (`paste`): click or press Cmd/Ctrl+V. Choose placement: in place, cursor, origin.
- Redo (`redo`): click or press Cmd+Shift+Z or Ctrl+Y.
- Undo (`undo`): click or press Cmd/Ctrl+Z to undo the last action.

## Numerica Node Reference

Full node inventory generated from the workflow registry.

### Data
- Annotations (`annotations`): Attach annotation text to a point or geometry.
- Color Picker (`colorPicker`): Pick a color swatch and output RGB + hex.
- Geometry Reference (`geometryReference`): Reference existing geometry into the graph.
- Group (`group`): Organize nodes visually inside a shared container.
- Panel (`panel`): Read-only viewer for upstream outputs or fallback text.
- Text Note (`textNote`): Display + pass through data with a freeform note.

### Basics
- Move Vector (`moveVector`): Move a vector by an offset vector.
- Origin (`origin`): Emit the world origin vector (0, 0, 0).
- Scale Vector (`scaleVector`): Scale a vector by a scalar multiplier.
- Unit X (`unitX`): Emit the unit X axis vector.
- Unit XYZ (`unitXYZ`): Emit a unit vector with all components equal to one.
- Unit Y (`unitY`): Emit the unit Y axis vector.
- Unit Z (`unitZ`): Emit the unit Z axis vector.

### Lists
- List Create (`listCreate`): Collect values into a list for downstream data operations.
- List Flatten (`listFlatten`): Flatten nested lists by a specified depth.
- List Index Of (`listIndexOf`): Find the index of an item in a list using deep comparison.
- List Item (`listItem`): Pick a single item by index with clamp or wrap behavior.
- List Length (`listLength`): Return the number of items in a list.
- List Partition (`listPartition`): Split a list into partitions of fixed size and step.
- List Reverse (`listReverse`): Reverse the order of items in a list.
- List Slice (`listSlice`): Extract a slice of a list with start, end, and step.

### Primitives
- Bipyramid (`bipyramid`): Create a Bipyramid primitive.
- Box Builder (`box`): Create a box primitive.
- Capsule (`capsule`): Create a Capsule primitive.
- Cylinder (`cylinder`): Create a Cylinder primitive.
- Disk (`disk`): Create a Disk primitive.
- Dodecahedron (`dodecahedron`): Create a Dodecahedron primitive.
- Ellipsoid (`ellipsoid`): Create a Ellipsoid primitive.
- Frustum (`frustum`): Create a Frustum primitive.
- Geodesic Dome (`geodesic-dome`): Create a Geodesic Dome primitive.
- Hemisphere (`hemisphere`): Create a Hemisphere primitive.
- Hexagonal Prism (`hexagonal-prism`): Create a Hexagonal Prism primitive.
- Hyperbolic Paraboloid (`hyperbolic-paraboloid`): Create a Hyperbolic Paraboloid primitive.
- Icosahedron (`icosahedron`): Create a Icosahedron primitive.
- Mobius Strip (`mobius-strip`): Create a Mobius Strip primitive.
- Octahedron (`octahedron`): Create a Octahedron primitive.
- One-Sheet Hyperboloid (`one-sheet-hyperboloid`): Create a One-Sheet Hyperboloid primitive.
- Pentagonal Prism (`pentagonal-prism`): Create a Pentagonal Prism primitive.
- Pipe / Hollow Cylinder (`pipe`): Create a Pipe / Hollow Cylinder primitive.
- Point Cloud (`pointCloud`): Create a point cloud from a list of points or geometry.
- Point Generator (`point`): Create a point from coordinates.
- Primitive (`primitive`): Create a parametric primitive shape.
- Pyramid (`pyramid`): Create a Pyramid primitive.
- Rhombic Dodecahedron (`rhombic-dodecahedron`): Create a Rhombic Dodecahedron primitive.
- Ring / Annulus (`ring`): Create a Ring / Annulus primitive.
- Sphere (`sphere`): Create a sphere primitive.
- Spherical Cap / Dome (`spherical-cap`): Create a Spherical Cap / Dome primitive.
- Superellipsoid (`superellipsoid`): Create a Superellipsoid primitive.
- Tetrahedron (`tetrahedron`): Create a Tetrahedron primitive.
- Torus (`torus`): Create a Torus primitive.
- Torus Knot (`torus-knot`): Create a Torus Knot primitive.
- Triangular Prism (`triangular-prism`): Create a Triangular Prism primitive.
- Truncated Cube (`truncated-cube`): Create a Truncated Cube primitive.
- Truncated Icosahedron (`truncated-icosahedron`): Create a Truncated Icosahedron primitive.
- Truncated Octahedron (`truncated-octahedron`): Create a Truncated Octahedron primitive.
- Utah Teapot (`utah-teapot`): Create a Utah Teapot primitive.
- Wedge (`wedge`): Create a Wedge primitive.

### Curves
- Line (`line`): Create a straight line between two points.
- Polyline (`polyline`): Connect points into a polyline.
- Rectangle (`rectangle`): Create a rectangle on the construction plane.

### NURBS
- Arc (`arc`): Create a circular arc through three points.
- Circle (`circle`): Create a circular curve on the construction plane.
- Curve (`curve`): Create a smooth curve through points.

### Surfaces
- Extrude (`extrude`): Extrude a profile curve along a direction.
- Loft (`loft`): Create a surface through a series of section curves.
- Offset Surface (`offsetSurface`): Offset a surface along its normals by a distance.
- Pipe (`pipeSweep`): Generate pipe meshes from segments, paths, or curve geometry.
- Surface (`surface`): Generate a surface from boundary curves.

### Mesh
- Fillet Edges (`filletEdges`): Round selected mesh edges by a given radius.
- Mesh Convert (`meshConvert`): Convert geometry into a mesh for export.
- Pipe Merge (`pipeMerge`): Merge multiple pipe meshes, with optional joint spheres.
- Solid (`solid`): Cap a surface or open mesh into a closed solid.
- Thicken Mesh (`thickenMesh`): Add thickness to a mesh by offsetting inward/outward.

### Modifiers
- Boolean (`boolean`): Combine two solids with union, difference, or intersection.
- Custom Material (`customMaterial`): Apply a custom render color to geometry.
- Fillet (`fillet`): Round corners on curves or edges.
- Offset (`offset`): Offset a curve by a given distance.
- Plasticwrap (`plasticwrap`): Shrinkwrap geometry onto a target with a projection distance.

### Transforms
- Field Transformation (`fieldTransformation`): Transform geometry using a scalar or vector field.
- Move (`move`): Translate geometry by world-space XYZ offsets.
- Rotate (`rotate`): Rotate geometry around an axis.
- Scale (`scale`): Scale geometry around a pivot point.
- Vector Scale (`vectorScale`): Scale a vector by a scalar multiplier.

### Arrays
- Geometry Array (`geometryArray`): Duplicate geometry in linear, grid, or polar patterns.
- Grid Array (`gridArray`): Create a rectangular grid of points from two axes.
- Linear Array (`linearArray`): Duplicate points along a direction at a fixed spacing.
- Polar Array (`polarArray`): Distribute points around an axis with a sweep angle.

### Euclidean
- Distance (`distance`): Measure the distance between two points or vectors.
- Mirror Vector (`mirrorVector`): Reflect a vector across a plane defined by a normal.
- Move Point (`movePoint`): Move a point along a direction vector by a distance.
- Move Point By Vector (`movePointByVector`): Move a point directly by an offset vector.
- Point Attractor (`pointAttractor`): Generate attraction vectors toward a target point.
- Rotate Vector (`rotateVectorAxis`): Rotate a vector around an axis by an angle in degrees.
- Vector Add (`vectorAdd`): Add two vectors component-wise.
- Vector Angle (`vectorAngle`): Measure the angle between two vectors.
- Vector Compose (`vectorConstruct`): Compose a vector from X, Y, and Z scalar inputs.
- Vector Cross (`vectorCross`): Compute the cross product between two vectors.
- Vector Decompose (`vectorDeconstruct`): Break a vector into its scalar components.
- Vector Dot (`vectorDot`): Compute the dot product between two vectors.
- Vector From Points (`vectorFromPoints`): Create a direction vector that points from A to B.
- Vector Length (`vectorLength`): Measure the magnitude of a vector.
- Vector Lerp (`vectorLerp`): Linearly interpolate between two vectors using parameter T.
- Vector Normalize (`vectorNormalize`): Convert a vector to unit length.
- Vector Project (`vectorProject`): Project a vector onto another vector.
- Vector Subtract (`vectorSubtract`): Subtract vector B from vector A.

### Ranges
- Linspace (`linspace`): Generate evenly spaced values between Start and End.
- Random (`random`): Emit a deterministic random number from a seed.
- Range (`range`): Generate a numeric sequence from Start to End using Step.
- Remap (`remap`): Remap a value from one range to another.
- Repeat (`repeat`): Repeat a value a specified number of times.

### Signals
- Cosine Wave (`cosineWave`): Generate a cosine wave signal.
- Sawtooth Wave (`sawtoothWave`): Generate a sawtooth wave signal in the -1 to 1 range.
- Sine Wave (`sineWave`): Generate a sine wave signal.
- Square Wave (`squareWave`): Generate a square wave signal with adjustable duty cycle.
- Triangle Wave (`triangleWave`): Generate a triangle wave signal in the -1 to 1 range.

### Analysis
- Control Points (`geometryControlPoints`): Extract control points or defining points from geometry.
- Curve Proximity (`curveProximity`): Find closest points on a curve for a list of points.
- Geometry Edges (`geometryEdges`): Extract edge segments as vector pairs.
- Geometry Faces (`geometryFaces`): Extract face centroids from mesh geometry.
- Geometry Info (`geometryInfo`): Summarize geometry type and core element counts.
- Geometry Normals (`geometryNormals`): Extract normals from mesh geometry.
- Geometry Vertices (`geometryVertices`): Extract vertex positions from geometry as a list.
- Geometry Viewer (`geometryViewer`): Preview geometry in a mini viewport.
- List Average (`listAverage`): Average numeric values from a list.
- List Max (`listMax`): Find the maximum numeric value in a list.
- List Median (`listMedian`): Find the median numeric value in a list.
- List Min (`listMin`): Find the minimum numeric value in a list.
- List Std Dev (`listStdDev`): Compute the population standard deviation of a list.
- List Sum (`listSum`): Sum numeric values from a list.
- Metadata Panel (`metadataPanel`): Inspect geometry metadata and attributes.
- Proximity 2D (`proximity2d`): Find nearby points in 2D (projected) and output connection pairs.
- Proximity 3D (`proximity3d`): Find nearby points in 3D and output connection pairs.

### Interchange
- STL Export (`stlExport`): Export geometry to an STL file.
- STL Import (`stlImport`): Import STL geometry into the scene.

### Measurement
- Dimensions (`dimensions`): Measure bounding box dimensions for geometry.
- Measurement (`measurement`): Measure length, area, volume, or bounds.

### Voxel
- Extract Isosurface (`extractIsosurface`): Create a mesh from a voxel density field.
- Topology Optimize (`topologyOptimize`): Authoritative topology optimization settings and progress metadata.
- Topology Solver (`topologySolver`): Fast density solver prototype for a geometry domain.
- Voxelize Geometry (`voxelizeGeometry`): Convert geometry into a voxel grid domain.

### Solver
- Branching Growth (`biologicalSolver`): Goal-weighted evolutionary search over vector genomes with a fast fitness proxy.
- Physics Solver (`physicsSolver`): Computes physical equilibrium states for structural systems.
- Voxel Solver (`voxelSolver`): Voxel solver (topology density) prototype.

### Goal
- Anchor (`anchorGoal`): Defines fixed boundary conditions and supports.
- Growth (`growthGoal`): Promotes biomass accumulation and growth intensity.
- Homeostasis (`homeostasisGoal`): Maintains stability and penalizes excessive stress.
- Load (`loadGoal`): Defines external forces applied to the structure.
- Morphogenesis (`morphogenesisGoal`): Shapes branching density and pattern formation.
- Nutrient (`nutrientGoal`): Defines nutrient availability and uptake behavior.
- Stiffness (`stiffnessGoal`): Defines stiffness objectives for structural elements.
- Volume (`volumeGoal`): Constrains or targets material volume in the solver.

### Math
- Add (`add`): Add two numeric values.
- Clamp (`clamp`): Clamp a value between a minimum and maximum.
- Divide (`divide`): Divide A by B with stability checks.
- Expression (`expression`): Evaluate a mathematical expression.
- Max (`max`): Return the larger of two values.
- Min (`min`): Return the smaller of two values.
- Multiply (`multiply`): Multiply two numeric values.
- Number (`number`): Emit a constant numeric value.
- Scalar Functions (`scalarFunctions`): Apply common scalar functions to a value.
- Slider (`slider`): A draggable slider that outputs a numeric value.
- Subtract (`subtract`): Subtract B from A.

### Logic
- Conditional (`conditional`): Select between two values using a condition.
