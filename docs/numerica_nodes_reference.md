# Numerica Node Reference

Updated: 2026-01-30

This document is generated from the node registry to keep behavior and documentation aligned.
Each node lists its display name, type id, and short description.

## Update Protocol

- Update `client/src/workflow/nodeRegistry.ts` first, then refresh this file.
- If no generator is available, edit this file in the same change as the registry.
- Keep the `Updated:` stamp current to show when the list was last synchronized.

## Testing

- Use `command_node_test_matrix.md` to validate each node’s interaction and outputs.

## Data
- Annotations (`annotations`): Attach annotation text to a point or geometry.
- Color Picker (`colorPicker`): Pick a color swatch and output RGB + hex.
- Geometry Reference (`geometryReference`): Reference existing geometry into the graph.
- Group (`group`): Organize nodes visually inside a shared container.
- Panel (`panel`): Read-only viewer for upstream outputs or fallback text.
- Text Note (`textNote`): Display + pass through data with a freeform note.

## Basics
- Move Vector (`moveVector`): Move a vector by an offset vector.
- Origin (`origin`): Emit the world origin vector (0, 0, 0).
- Scale Vector (`scaleVector`): Scale a vector by a scalar multiplier.
- Unit X (`unitX`): Emit the unit X axis vector.
- Unit XYZ (`unitXYZ`): Emit a unit vector with all components equal to one.
- Unit Y (`unitY`): Emit the unit Y axis vector.
- Unit Z (`unitZ`): Emit the unit Z axis vector.

## Lists
- List Create (`listCreate`): Collect values into a list for downstream data operations.
- List Flatten (`listFlatten`): Flatten nested lists by a specified depth.
- List Index Of (`listIndexOf`): Find the index of an item in a list using deep comparison.
- List Item (`listItem`): Pick a single item by index with clamp or wrap behavior.
- List Length (`listLength`): Return the number of items in a list.
- List Partition (`listPartition`): Split a list into partitions of fixed size and step.
- List Reverse (`listReverse`): Reverse the order of items in a list.
- List Slice (`listSlice`): Extract a slice of a list with start, end, and step.

## Primitives
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

## Curves
- Line (`line`): Create a straight line between two points.
- Polyline (`polyline`): Connect points into a polyline.
- Rectangle (`rectangle`): Create a rectangle on the construction plane.

## NURBS
- Arc (`arc`): Create a circular arc through three points.
- Circle (`circle`): Create a circular curve on the construction plane.
- Curve (`curve`): Create a smooth curve through points.

## Surfaces
- Extrude (`extrude`): Extrude a profile curve along a direction.
- Loft (`loft`): Create a surface through a series of section curves.
- Offset Surface (`offsetSurface`): Offset a surface along its normals by a distance.
- Pipe (`pipeSweep`): Generate pipe meshes from segments, paths, or curve geometry.
- Surface (`surface`): Generate a surface from boundary curves.

## Mesh
- Fillet Edges (`filletEdges`): Round selected mesh edges by a given radius.
- Mesh Convert (`meshConvert`): Convert geometry into a mesh for export.
- Pipe Merge (`pipeMerge`): Merge multiple pipe meshes, with optional joint spheres.
- Solid (`solid`): Cap a surface or open mesh into a closed solid.
- Thicken Mesh (`thickenMesh`): Add thickness to a mesh by offsetting inward/outward.

## Modifiers
- Boolean (`boolean`): Combine two solids with union, difference, or intersection.
- Custom Material (`customMaterial`): Apply a custom render color to geometry.
- Fillet (`fillet`): Round corners on curves or edges.
- Offset (`offset`): Offset a curve by a given distance.
- Plasticwrap (`plasticwrap`): Shrinkwrap geometry onto a target with a projection distance.

## Transforms
- Field Transformation (`fieldTransformation`): Transform geometry using a scalar or vector field.
- Move (`move`): Translate geometry by world-space XYZ offsets.
- Rotate (`rotate`): Rotate geometry around an axis.
- Scale (`scale`): Scale geometry around a pivot point.
- Vector Scale (`vectorScale`): Scale a vector by a scalar multiplier.

## Arrays
- Geometry Array (`geometryArray`): Duplicate geometry in linear, grid, or polar patterns.
- Grid Array (`gridArray`): Create a rectangular grid of points from two axes.
- Linear Array (`linearArray`): Duplicate points along a direction at a fixed spacing.
- Polar Array (`polarArray`): Distribute points around an axis with a sweep angle.

## Euclidean
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

## Ranges
- Linspace (`linspace`): Generate evenly spaced values between Start and End.
- Random (`random`): Emit a deterministic random number from a seed.
- Range (`range`): Generate a numeric sequence from Start to End using Step.
- Remap (`remap`): Remap a value from one range to another.
- Repeat (`repeat`): Repeat a value a specified number of times.

## Signals
- Cosine Wave (`cosineWave`): Generate a cosine wave signal.
- Sawtooth Wave (`sawtoothWave`): Generate a sawtooth wave signal in the -1 to 1 range.
- Sine Wave (`sineWave`): Generate a sine wave signal.
- Square Wave (`squareWave`): Generate a square wave signal with adjustable duty cycle.
- Triangle Wave (`triangleWave`): Generate a triangle wave signal in the -1 to 1 range.

## Analysis
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

## Interchange
- STL Export (`stlExport`): Export geometry to an STL file.
- STL Import (`stlImport`): Import STL geometry into the scene.

## Measurement
- Dimensions (`dimensions`): Measure bounding box dimensions for geometry.
- Measurement (`measurement`): Measure length, area, volume, or bounds.

## Voxel
- Extract Isosurface (`extractIsosurface`): Create a mesh from a voxel density field.
- Topology Optimize (`topologyOptimize`): Authoritative topology optimization settings and progress metadata.
- Topology Solver (`topologySolver`): Fast density solver prototype for a geometry domain.
- Voxelize Geometry (`voxelizeGeometry`): Convert geometry into a voxel grid domain.

## Solver
- Chemistry Solver (`chemistrySolver`): Material transmutation solver for functionally graded blends.
- Physics Solver (`physicsSolver`): Computes physical equilibrium states for structural systems.
- Voxel Solver (`voxelSolver`): Voxel solver (topology density) prototype.

## Goal
- Anchor (`anchorGoal`): Defines fixed boundary conditions and supports.
- Chemistry Blend (`chemistryBlendGoal`): Controls material blending smoothness.
- Chemistry Mass (`chemistryMassGoal`): Constrains total material mass.
- Chemistry Material (`chemistryMaterialGoal`): Assigns materials to seed regions.
- Chemistry Stiffness (`chemistryStiffnessGoal`): Defines stiffness objectives for chemistry solver.
- Load (`loadGoal`): Defines external forces applied to the structure.
- Stiffness (`stiffnessGoal`): Defines stiffness objectives for structural elements.
- Volume (`volumeGoal`): Constrains or targets material volume in the solver.

## Math
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

## Logic
- Conditional (`conditional`): Select between two values using a condition.
