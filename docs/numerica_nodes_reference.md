# Numerica Node Reference

Updated: 2026-01-28

This document is generated from the node registry to keep behavior and documentation aligned.
Each node lists its display name, type id, and short description.

## Data
- Geometry Reference (`geometryReference`): Reference existing geometry into the graph.
- Panel (`panel`): Display incoming data as a multiline list.
- Slider (`slider`): Emit a numeric value from a slider.

## Basics
- Origin (`origin`): Emit the world origin vector (0, 0, 0).
- Unit X (`unitX`): Emit the unit X axis vector.
- Unit Y (`unitY`): Emit the unit Y axis vector.
- Unit Z (`unitZ`): Emit the unit Z axis vector.
- Unit XYZ (`unitXYZ`): Emit a unit vector with all components equal to one.
- Move Vector (`moveVector`): Move a vector by an offset vector.
- Scale Vector (`scaleVector`): Scale a vector by a scalar multiplier.

## Lists
- List Create (`listCreate`): Collect values into a list for downstream data operations.
- List Length (`listLength`): Return the number of items in a list.
- List Item (`listItem`): Pick a single item by index with clamp or wrap behavior.
- List Index Of (`listIndexOf`): Find the index of an item in a list using deep comparison.
- List Partition (`listPartition`): Split a list into partitions of fixed size and step.
- List Flatten (`listFlatten`): Flatten nested lists by a specified depth.
- List Slice (`listSlice`): Extract a slice of a list with start, end, and step.
- List Reverse (`listReverse`): Reverse the order of items in a list.

## Primitives
- Point Generator (`point`): Create a point from coordinates.
- Point Cloud (`pointCloud`): Create a point cloud from a list of points or geometry.
- Box Builder (`box`): Create a box primitive.
- Sphere (`sphere`): Create a sphere primitive.

## Curves
- Line (`line`): Create a straight line between two points.
- Arc (`arc`): Create a circular arc through three points.
- Curve (`curve`): Create a smooth curve through points.
- Polyline (`polyline`): Connect points into a polyline.

## Surfaces
- Surface (`surface`): Generate a surface from boundary curves.

## Transforms
- Vector Scale (`vectorScale`): Scale a vector by a scalar multiplier.
- Move (`move`): Translate geometry by world-space XYZ offsets.

## Euclidean
- Vector Compose (`vectorConstruct`): Compose a vector from X, Y, and Z scalar inputs.
- Vector Decompose (`vectorDeconstruct`): Break a vector into its scalar components.
- Vector Add (`vectorAdd`): Add two vectors component-wise.
- Vector Subtract (`vectorSubtract`): Subtract vector B from vector A.
- Vector Length (`vectorLength`): Measure the magnitude of a vector.
- Vector Normalize (`vectorNormalize`): Convert a vector to unit length.
- Vector Dot (`vectorDot`): Compute the dot product between two vectors.
- Vector Cross (`vectorCross`): Compute the cross product between two vectors.
- Distance (`distance`): Measure the distance between two points or vectors.
- Vector From Points (`vectorFromPoints`): Create a direction vector that points from A to B.
- Vector Angle (`vectorAngle`): Measure the angle between two vectors.
- Vector Lerp (`vectorLerp`): Linearly interpolate between two vectors using parameter T.
- Vector Project (`vectorProject`): Project a vector onto another vector.
- Move Point (`movePoint`): Move a point along a direction vector by a distance.
- Move Point By Vector (`movePointByVector`): Move a point directly by an offset vector.
- Rotate Vector (`rotateVectorAxis`): Rotate a vector around an axis by an angle in degrees.
- Mirror Vector (`mirrorVector`): Reflect a vector across a plane defined by a normal.

## Ranges
- Range (`range`): Generate a numeric sequence from Start to End using Step.
- Linspace (`linspace`): Generate evenly spaced values between Start and End.
- Remap (`remap`): Remap a value from one range to another.
- Random (`random`): Emit a deterministic random number from a seed.
- Repeat (`repeat`): Repeat a value a specified number of times.

## Signals
- Sine Wave (`sineWave`): Generate a sine wave signal.
- Cosine Wave (`cosineWave`): Generate a cosine wave signal.
- Sawtooth Wave (`sawtoothWave`): Generate a sawtooth wave signal in the -1 to 1 range.
- Triangle Wave (`triangleWave`): Generate a triangle wave signal in the -1 to 1 range.
- Square Wave (`squareWave`): Generate a square wave signal with adjustable duty cycle.

## Analysis
- List Sum (`listSum`): Sum numeric values from a list.
- List Average (`listAverage`): Average numeric values from a list.
- List Min (`listMin`): Find the minimum numeric value in a list.
- List Max (`listMax`): Find the maximum numeric value in a list.
- List Median (`listMedian`): Find the median numeric value in a list.
- List Std Dev (`listStdDev`): Compute the population standard deviation of a list.
- Geometry Info (`geometryInfo`): Summarize geometry type and core element counts.
- Geometry Vertices (`geometryVertices`): Extract vertex positions from geometry as a list.
- Geometry Edges (`geometryEdges`): Extract edge segments as vector pairs.
- Geometry Faces (`geometryFaces`): Extract face centroids from mesh geometry.
- Geometry Normals (`geometryNormals`): Extract normals from mesh geometry.
- Control Points (`geometryControlPoints`): Extract control points or defining points from geometry.

## Optimization
- Topology Optimize (`topologyOptimize`): Authoritative topology optimization settings and progress metadata.
- Topology Solver (`topologySolver`): Fast density solver prototype for a geometry domain.
- Biological Solver (`biologicalSolver`): Evolutionary search over vector genomes with a fast fitness proxy.

## Math
- Number (`number`): Emit a constant numeric value.
- Add (`add`): Add two numeric values.
- Subtract (`subtract`): Subtract B from A.
- Multiply (`multiply`): Multiply two numeric values.
- Divide (`divide`): Divide A by B with stability checks.
- Clamp (`clamp`): Clamp a value between a minimum and maximum.
- Min (`min`): Return the smaller of two values.
- Max (`max`): Return the larger of two values.
- Expression (`expression`): Evaluate a mathematical expression.

## Logic
- Conditional (`conditional`): Select between two values using a condition.
