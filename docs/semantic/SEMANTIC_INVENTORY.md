# Semantic Inventory

Generated: 2026-02-04T20:15:51.866Z

## Summary

- **Total Operations**: 315
- **Total Nodes**: 172
- **Total Dashboards**: 3
- **Orphan Operations**: 61
- **Dangling References**: 0

## Operations by Domain

### color (6 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `color.hexToRgb` | Hex to RGB | utility | ✅ | colorPicker |
| `color.rgbToHex` | RGB to Hex | utility | ✅ | colorPicker |
| `color.rgbToHsl` | RGB to HSL | utility | ✅ | colorPicker |
| `color.hslToRgb` | HSL to RGB | utility | ✅ | colorPicker |
| `color.blend` | Blend | operator | ✅ | colorPicker |
| `color.clamp` | Clamp | utility | ✅ | colorPicker |

### command (61 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `command.createPoint` | Create Point | creation | ✅ | point |
| `command.createLine` | Create Line | creation | ✅ | line |
| `command.createPolyline` | Create Polyline | creation | ✅ | polyline |
| `command.createRectangle` | Create Rectangle | creation | ✅ | rectangle |
| `command.createCircle` | Create Circle | creation | ✅ | circle |
| `command.createArc` | Create Arc | creation | ✅ | arc |
| `command.createCurve` | Create Curve | creation | ✅ | curve |
| `command.createPrimitive` | Create Primitive | creation | ✅ | box, sphere |
| `command.createNurbsBox` | Create NURBS Box | creation | ✅ | (none) |
| `command.createNurbsSphere` | Create NURBS Sphere | creation | ✅ | (none) |
| `command.createNurbsCylinder` | Create NURBS Cylinder | creation | ✅ | (none) |
| `command.boolean` | Boolean | operation | ✅ | (none) |
| `command.loft` | Loft | operation | ✅ | (none) |
| `command.surface` | Surface | operation | ✅ | surface |
| `command.extrude` | Extrude | operation | ✅ | (none) |
| `command.meshMerge` | Mesh Merge | operation | ✅ | (none) |
| `command.meshFlip` | Mesh Flip | operation | ✅ | (none) |
| `command.meshThicken` | Mesh Thicken | operation | ✅ | (none) |
| `command.morph` | Morph | operation | ✅ | (none) |
| `command.meshConvert` | NURBS to Mesh | conversion | ✅ | meshConvert, nurbsToMesh |
| `command.brepToMesh` | B-Rep to Mesh | conversion | ✅ | brepToMesh |
| `command.meshToBrep` | Mesh to B-Rep | conversion | ✅ | meshToBrep |
| `command.nurbsRestore` | Mesh to NURBS | conversion | ✅ | (none) |
| `command.interpolate` | Interpolate | conversion | ✅ | (none) |
| `command.move` | Move | transform | ✅ | move |
| `command.rotate` | Rotate | transform | ✅ | rotate |
| `command.scale` | Scale | transform | ✅ | scale |
| `command.offset` | Offset | transform | ✅ | (none) |
| `command.mirror` | Mirror | transform | ✅ | (none) |
| `command.array` | Array | transform | ✅ | (none) |
| `command.transform` | Transform | transform | ✅ | (none) |
| `command.undo` | Undo | ui | ✅ | (none) |
| `command.redo` | Redo | ui | ✅ | (none) |
| `command.copy` | Copy | ui | ✅ | (none) |
| `command.paste` | Paste | ui | ✅ | (none) |
| `command.duplicate` | Duplicate | ui | ✅ | (none) |
| `command.delete` | Delete | ui | ✅ | (none) |
| `command.cancel` | Cancel | ui | ✅ | (none) |
| `command.confirm` | Confirm | ui | ✅ | (none) |
| `command.gumball` | Gumball | ui | ✅ | (none) |
| `command.focus` | Focus | ui | ✅ | (none) |
| `command.frameAll` | Frame All | ui | ✅ | (none) |
| `command.screenshot` | Screenshot | ui | ✅ | (none) |
| `command.view` | View | ui | ✅ | (none) |
| `command.camera` | Camera | ui | ✅ | (none) |
| `command.pivot` | Pivot | ui | ✅ | (none) |
| `command.orbit` | Orbit | ui | ✅ | (none) |
| `command.pan` | Pan | ui | ✅ | (none) |
| `command.zoom` | Zoom | ui | ✅ | (none) |
| `command.selectionFilter` | Selection Filter | ui | ✅ | (none) |
| `command.cycle` | Cycle Selection | ui | ✅ | (none) |
| `command.snapping` | Snapping | ui | ✅ | (none) |
| `command.grid` | Grid | ui | ✅ | (none) |
| `command.cplane` | C-Plane | ui | ✅ | (none) |
| `command.display` | Display | ui | ✅ | (none) |
| `command.isolate` | Isolate | ui | ✅ | (none) |
| `command.outliner` | Outliner | ui | ✅ | (none) |
| `command.tolerance` | Tolerance | ui | ✅ | (none) |
| `command.status` | Status | ui | ✅ | (none) |
| `command.import.stl` | Import STL | io | ✅ | stlImport |
| `command.export.stl` | Export STL | io | ✅ | stlExport |

### data (16 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `data.collect` | Collect | aggregation | ✅ | listCreate |
| `data.flatten` | Flatten | utility | ✅ | listFlatten |
| `data.filter` | Filter | utility | ✅ | listCreate |
| `data.map` | Map | utility | ✅ | listCreate |
| `data.reduce` | Reduce | aggregation | ✅ | listCreate |
| `data.sort` | Sort | utility | ✅ | listCreate |
| `data.unique` | Unique | utility | ✅ | listCreate |
| `data.length` | Length | analysis | ✅ | listLength |
| `data.index` | Index | utility | ✅ | listItem |
| `data.indexOf` | Index Of | utility | ✅ | listIndexOf |
| `data.partition` | Partition | utility | ✅ | listPartition |
| `data.slice` | Slice | utility | ✅ | listSlice |
| `data.reverse` | Reverse | utility | ✅ | listReverse |
| `data.range` | Range | creation | ✅ | range |
| `data.linspace` | Linspace | creation | ✅ | linspace |
| `data.repeat` | Repeat | creation | ✅ | repeat |

### geometry (104 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `geometry.mesh` | Mesh | operation | ✅ | mesh |
| `geometry.brep` | B-Rep | operation | ✅ | (none) |
| `geometry.pointCloud` | Point Cloud | creation | ✅ | pointCloud |
| `geometry.fillet` | Fillet | operation | ✅ | fillet |
| `geometry.filletEdges` | Fillet Edges | operation | ✅ | filletEdges |
| `geometry.offsetSurface` | Offset Surface | operation | ✅ | offsetSurface |
| `geometry.thickenMesh` | Thicken Mesh | operation | ✅ | thickenMesh |
| `geometry.plasticwrap` | Plastic Wrap | operation | ✅ | plasticwrap |
| `geometry.solid` | Solid | operation | ✅ | solid |
| `geometry.primitive` | Primitive | creation | ✅ | primitive |
| `geometry.primitive.box` | Box | primitive | ✅ | (none) |
| `geometry.primitive.sphere` | Sphere | primitive | ✅ | (none) |
| `geometry.primitive.cylinder` | Cylinder | primitive | ✅ | cylinder |
| `geometry.primitive.torus` | Torus | primitive | ✅ | torus |
| `geometry.primitive.pyramid` | Pyramid | primitive | ✅ | pyramid |
| `geometry.primitive.tetrahedron` | Tetrahedron | primitive | ✅ | tetrahedron |
| `geometry.primitive.octahedron` | Octahedron | primitive | ✅ | octahedron |
| `geometry.primitive.icosahedron` | Icosahedron | primitive | ✅ | icosahedron |
| `geometry.primitive.dodecahedron` | Dodecahedron | primitive | ✅ | dodecahedron |
| `geometry.primitive.hemisphere` | Hemisphere | primitive | ✅ | hemisphere |
| `geometry.primitive.capsule` | Capsule | primitive | ✅ | capsule |
| `geometry.primitive.disk` | Disk | primitive | ✅ | disk |
| `geometry.primitive.ring` | Ring | primitive | ✅ | ring |
| `geometry.primitive.triangularPrism` | Triangular Prism | primitive | ✅ | triangular-prism |
| `geometry.primitive.hexagonalPrism` | Hexagonal Prism | primitive | ✅ | hexagonal-prism |
| `geometry.primitive.pentagonalPrism` | Pentagonal Prism | primitive | ✅ | pentagonal-prism |
| `geometry.primitive.torusKnot` | Torus Knot | primitive | ✅ | torus-knot |
| `geometry.primitive.utahTeapot` | Utah Teapot | primitive | ✅ | utah-teapot |
| `geometry.primitive.frustum` | Frustum | primitive | ✅ | frustum |
| `geometry.primitive.mobiusStrip` | Mobius Strip | primitive | ✅ | mobius-strip |
| `geometry.primitive.ellipsoid` | Ellipsoid | primitive | ✅ | ellipsoid |
| `geometry.primitive.wedge` | Wedge | primitive | ✅ | wedge |
| `geometry.primitive.sphericalCap` | Spherical Cap | primitive | ✅ | spherical-cap |
| `geometry.primitive.bipyramid` | Bipyramid | primitive | ✅ | bipyramid |
| `geometry.primitive.rhombicDodecahedron` | Rhombic Dodecahedron | primitive | ✅ | rhombic-dodecahedron |
| `geometry.primitive.truncatedCube` | Truncated Cube | primitive | ✅ | truncated-cube |
| `geometry.primitive.truncatedOctahedron` | Truncated Octahedron | primitive | ✅ | truncated-octahedron |
| `geometry.primitive.truncatedIcosahedron` | Truncated Icosahedron | primitive | ✅ | truncated-icosahedron |
| `geometry.primitive.pipe` | Pipe | primitive | ✅ | pipe |
| `geometry.primitive.superellipsoid` | Superellipsoid | primitive | ✅ | superellipsoid |
| `geometry.primitive.hyperbolicParaboloid` | Hyperbolic Paraboloid | primitive | ✅ | hyperbolic-paraboloid |
| `geometry.primitive.geodesicDome` | Geodesic Dome | primitive | ✅ | geodesic-dome |
| `geometry.primitive.oneSheetHyperboloid` | One-Sheet Hyperboloid | primitive | ✅ | one-sheet-hyperboloid |
| `geometry.array.linear` | Linear Array | utility | ✅ | linearArray |
| `geometry.array.polar` | Polar Array | utility | ✅ | polarArray |
| `geometry.array.grid` | Grid Array | utility | ✅ | gridArray |
| `geometry.array.geometry` | Geometry Array | utility | ✅ | geometryArray |
| `geometry.analyze.info` | Geometry Info | analysis | ✅ | geometryInfo |
| `geometry.analyze.dimensions` | Dimensions | analysis | ✅ | dimensions |
| `geometry.analyze.volume` | Volume | analysis | ✅ | volume |
| `geometry.analyze.vertices` | Geometry Vertices | analysis | ✅ | geometryVertices |
| `geometry.analyze.extentVertices` | Geometry Extent Vertices | analysis | ✅ | geometryExtentVertices |
| `geometry.analyze.edges` | Geometry Edges | analysis | ✅ | geometryEdges |
| `geometry.analyze.faces` | Geometry Faces | analysis | ✅ | geometryFaces |
| `geometry.analyze.normals` | Geometry Normals | analysis | ✅ | geometryNormals |
| `geometry.analyze.controlPoints` | Geometry Control Points | analysis | ✅ | geometryControlPoints |
| `geometry.analyze.proximity3d` | 3D Proximity | analysis | ✅ | proximity3d |
| `geometry.analyze.proximity2d` | 2D Proximity | analysis | ✅ | proximity2d |
| `geometry.analyze.curveProximity` | Curve Proximity | analysis | ✅ | curveProximity |
| `geometry.field.transform` | Field Transformation | analysis | ✅ | fieldTransformation |
| `geometry.field.movePoint` | Move Point | analysis | ✅ | movePoint |
| `geometry.field.movePointByVector` | Move Point By Vector | analysis | ✅ | movePointByVector |
| `geometry.field.rotateVectorAxis` | Rotate Vector Axis | analysis | ✅ | rotateVectorAxis |
| `geometry.field.mirrorVector` | Mirror Vector | analysis | ✅ | mirrorVector |
| `boolean.offsetPolyline2D` | Offset Polyline 2D | modifier | ✅ | offset |
| `math.computeBestFitPlane` | Compute Best Fit Plane | analysis | ✅ | voronoiPattern, hexagonalTiling, offset |
| `math.projectPointToPlane` | Project Point To Plane | transform | ✅ | voronoiPattern, hexagonalTiling, offset |
| `math.unprojectPointFromPlane` | Unproject Point From Plane | transform | ✅ | offset |
| `curve.resampleByArcLength` | Resample By Arc Length | modifier | ✅ | offset |
| `mesh.generateBox` | Generate Box Mesh | primitive | ✅ | boolean |
| `mesh.generateSphere` | Generate Sphere Mesh | primitive | ✅ | pipeSweep, pipeMerge |
| `mesh.generateCylinder` | Generate Cylinder Mesh | primitive | ✅ | pipeSweep |
| `mesh.generateExtrude` | Generate Extrude Mesh | modifier | ✅ | extrude |
| `mesh.generateLoft` | Generate Loft Mesh | modifier | ✅ | loft |
| `mesh.generatePipe` | Generate Pipe Mesh | primitive | ✅ | pipeSweep |
| `mesh.computeVertexNormals` | Compute Vertex Normals | analysis | ✅ | boolean |
| `mesh.computeArea` | Compute Mesh Area | analysis | ✅ | measurement |
| `meshTess.subdivideLinear` | Subdivide Linear | modifier | ✅ | subdivideMesh |
| `meshTess.subdivideCatmullClark` | Subdivide Catmull-Clark | modifier | ✅ | subdivideMesh |
| `meshTess.subdivideLoop` | Subdivide Loop | modifier | ✅ | subdivideMesh |
| `meshTess.subdivideAdaptive` | Subdivide Adaptive | modifier | ✅ | subdivideMesh |
| `meshTess.dualMesh` | Dual Mesh | modifier | ✅ | dualMesh |
| `meshTess.insetFaces` | Inset Faces | modifier | ✅ | insetFaces |
| `meshTess.extrudeFaces` | Extrude Faces | modifier | ✅ | extrudeFaces |
| `meshTess.meshRelax` | Mesh Relax | modifier | ✅ | meshRelax |
| `meshTess.selectFaces` | Select Faces | utility | ✅ | selectFaces |
| `meshTess.triangulateMesh` | Triangulate Mesh | modifier | ✅ | triangulateMesh |
| `meshTess.generateGeodesicSphere` | Generate Geodesic Sphere | primitive | ✅ | geodesicSphere |
| `meshTess.generateHexagonalTiling` | Generate Hexagonal Tiling | primitive | ✅ | hexagonalTiling |
| `meshTess.generateVoronoiPattern` | Generate Voronoi Pattern | primitive | ✅ | voronoiPattern |
| `meshTess.offsetPattern` | Offset Pattern | modifier | ✅ | offsetPattern |
| `meshTess.generateMeshUVs` | Generate Mesh UVs | modifier | ✅ | meshUVs |
| `meshTess.repairMesh` | Repair Mesh | modifier | ✅ | meshRepair |
| `meshTess.decimateMesh` | Decimate Mesh | modifier | ✅ | meshDecimate |
| `meshTess.quadDominantRemesh` | Quad-Dominant Remesh | modifier | ✅ | quadRemesh |
| `meshTess.meshBoolean` | Mesh Boolean | modifier | ✅ | meshBoolean |
| `meshTess.getTessellationMetadata` | Get Tessellation Metadata | utility | ✅ | subdivideMesh, dualMesh, insetFaces, extrudeFaces, meshRelax, selectFaces, triangulateMesh, voronoiPattern, hexagonalTiling, offsetPattern, meshRepair, meshUVs, meshDecimate, quadRemesh |
| `meshTess.toTessellationMesh` | To Tessellation Mesh | tessellation | ✅ | subdivideMesh, dualMesh, insetFaces, extrudeFaces, meshRelax, selectFaces, meshBoolean, triangulateMesh, voronoiPattern, hexagonalTiling, offsetPattern, meshRepair, meshUVs, meshDecimate, quadRemesh |
| `meshTess.toTessellationMeshData` | To Tessellation Mesh Data | tessellation | ✅ | subdivideMesh, dualMesh, insetFaces, extrudeFaces, meshRelax, meshBoolean, triangulateMesh, geodesicSphere, voronoiPattern, hexagonalTiling, offsetPattern, meshRepair, meshUVs, meshDecimate, quadRemesh |
| `meshTess.tessellationMeshToRenderMesh` | Tessellation Mesh To Render Mesh | tessellation | ✅ | subdivideMesh, dualMesh, insetFaces, extrudeFaces, meshRelax, triangulateMesh, geodesicSphere, voronoiPattern, hexagonalTiling, offsetPattern, meshRepair, meshUVs, meshDecimate, quadRemesh |
| `brep.brepFromMesh` | B-Rep From Mesh | tessellation | ✅ | meshToBrep |
| `brep.tessellateBRepToMesh` | Tessellate B-Rep To Mesh | tessellation | ✅ | brepToMesh |
| `tess.tessellateCurveAdaptive` | Tessellate Curve Adaptive | tessellation | ✅ | (none) |
| `tess.tessellateSurfaceAdaptive` | Tessellate Surface Adaptive | tessellation | ✅ | (none) |

### logic (8 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `logic.and` | And | operator | ✅ | conditional |
| `logic.or` | Or | operator | ✅ | conditional |
| `logic.not` | Not | operator | ✅ | conditional |
| `logic.xor` | Xor | operator | ✅ | conditional |
| `logic.if` | If | control | ✅ | conditional |
| `logic.compare` | Compare | operator | ✅ | conditional |
| `logic.toggle` | Toggle | control | ✅ | toggleSwitch |
| `logic.conditionalToggle` | Conditional Toggle | control | ✅ | conditionalToggleButton |

### math (44 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `math.add` | Add | operator | ✅ | add |
| `math.subtract` | Subtract | operator | ✅ | subtract |
| `math.multiply` | Multiply | operator | ✅ | multiply |
| `math.divide` | Divide | operator | ✅ | divide |
| `math.modulo` | Modulo | operator | ✅ | scalarFunctions |
| `math.power` | Power | operator | ✅ | scalarFunctions |
| `math.floor` | Floor | operator | ✅ | scalarFunctions |
| `math.ceil` | Ceiling | operator | ✅ | scalarFunctions |
| `math.round` | Round | operator | ✅ | scalarFunctions |
| `math.abs` | Absolute Value | operator | ✅ | scalarFunctions |
| `math.negate` | Negate | operator | ✅ | scalarFunctions |
| `math.sqrt` | Square Root | operator | ✅ | scalarFunctions |
| `math.sin` | Sine | operator | ✅ | scalarFunctions |
| `math.cos` | Cosine | operator | ✅ | scalarFunctions |
| `math.tan` | Tangent | operator | ✅ | scalarFunctions |
| `math.asin` | Arcsine | operator | ✅ | scalarFunctions |
| `math.acos` | Arccosine | operator | ✅ | scalarFunctions |
| `math.atan` | Arctangent | operator | ✅ | scalarFunctions |
| `math.atan2` | Arctangent2 | operator | ✅ | scalarFunctions |
| `math.exp` | Exponential | operator | ✅ | scalarFunctions |
| `math.log` | Natural Logarithm | operator | ✅ | scalarFunctions |
| `math.log10` | Base-10 Logarithm | operator | ✅ | scalarFunctions |
| `math.min` | Minimum | aggregation | ✅ | listMin, min |
| `math.max` | Maximum | aggregation | ✅ | listMax, max |
| `math.clamp` | Clamp | utility | ✅ | clamp |
| `math.lerp` | Linear Interpolation | utility | ✅ | scalarFunctions |
| `math.remap` | Remap | utility | ✅ | remap |
| `math.equal` | Equal | operator | ✅ | conditional |
| `math.notEqual` | Not Equal | operator | ✅ | conditional |
| `math.lessThan` | Less Than | operator | ✅ | conditional |
| `math.lessThanOrEqual` | Less Than or Equal | operator | ✅ | conditional |
| `math.greaterThan` | Greater Than | operator | ✅ | conditional |
| `math.greaterThanOrEqual` | Greater Than or Equal | operator | ✅ | conditional |
| `math.random` | Random | utility | ✅ | random |
| `math.sum` | Sum | analysis | ✅ | listSum |
| `math.average` | Average | analysis | ✅ | listAverage |
| `math.median` | Median | analysis | ✅ | listMedian |
| `math.stdDev` | Standard Deviation | analysis | ✅ | listStdDev |
| `math.expression` | Expression | utility | ✅ | expression |
| `math.wave.sine` | Sine Wave | primitive | ✅ | sineWave |
| `math.wave.cosine` | Cosine Wave | primitive | ✅ | cosineWave |
| `math.wave.sawtooth` | Sawtooth Wave | primitive | ✅ | sawtoothWave |
| `math.wave.triangle` | Triangle Wave | primitive | ✅ | triangleWave |
| `math.wave.square` | Square Wave | primitive | ✅ | squareWave |

### solver (43 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `solver.physics` | Physics Solver | utility | ✅ | physicsSolver |
| `solver.chemistry` | Chemistry Solver | utility | ✅ | chemistrySolver |
| `solver.evolutionary` | Evolutionary Solver | utility | ✅ | evolutionarySolver |
| `solver.voxel` | Voxel Solver | conversion | ✅ | voxelSolver |
| `solver.topologyOptimization` | Topology Optimization Solver | utility | ⚠️ | topologyOptimizationSolver |
| `simulator.initialize` | Initialize Simulator | utility | ✅ | evolutionarySolver |
| `simulator.step` | Step Simulator | utility | ✅ | evolutionarySolver |
| `simulator.converge` | Check Convergence | analysis | ✅ | evolutionarySolver |
| `simulator.finalize` | Finalize Simulator | utility | ✅ | evolutionarySolver |
| `simulator.voxel.initialize` | Initialize Voxel Simulator | utility | ✅ | voxelSolver |
| `simulator.voxel.step` | Voxelize Geometry | conversion | ✅ | voxelSolver |
| `simulator.voxel.finalize` | Finalize Voxel Simulator | utility | ✅ | voxelSolver |
| `simulator.topology.initialize` | Initialize Topology Simulator | utility | ✅ | (none) |
| `simulator.topology.step` | Step Topology Simulator | utility | ✅ | (none) |
| `simulator.topology.converge` | Check Topology Convergence | analysis | ✅ | (none) |
| `simulator.topology.finalize` | Finalize Topology Simulator | utility | ✅ | (none) |
| `simulator.topology.preview` | Preview Topology Geometry | analysis | ✅ | (none) |
| `simulator.topology.sync` | Sync Topology Geometry | io | ✅ | (none) |
| `simulator.topology.pause` | Pause Topology Simulator | utility | ✅ | (none) |
| `simulator.topology.resume` | Resume Topology Simulator | utility | ✅ | (none) |
| `simulator.topology.reset` | Reset Topology Simulator | utility | ✅ | (none) |
| `simulator.topology.plasticwrap` | Plasticwrap Topology Geometry | utility | ✅ | (none) |
| `simulator.topology.stabilityGuard` | Topology Stability Guard | analysis | ✅ | (none) |
| `simulator.chemistry.initialize` | Initialize Chemistry Simulator | utility | ✅ | chemistrySolver |
| `simulator.chemistry.step` | Step Chemistry Simulator | utility | ✅ | chemistrySolver |
| `simulator.chemistry.converge` | Check Chemistry Convergence | analysis | ✅ | chemistrySolver |
| `simulator.chemistry.finalize` | Finalize Chemistry Simulator | utility | ✅ | chemistrySolver |
| `simulator.chemistry.blendMaterials` | Blend Materials | utility | ✅ | chemistrySolver |
| `simulator.chemistry.evaluateGoals` | Evaluate Chemistry Goals | analysis | ✅ | chemistrySolver |
| `simulator.chemistry.analyze` | Analyze Chemistry Simulation | analysis | ✅ | chemistrySolver |
| `simulator.chemistry.validate` | Validate Chemistry Simulation | analysis | ✅ | chemistrySolver |
| `simulator.chemistry.computeGradients` | Compute Chemistry Gradients | analysis | ✅ | chemistrySolver |
| `simulator.chemistry.computeStatistics` | Compute Chemistry Statistics | analysis | ✅ | chemistrySolver |
| `simulator.chemistry.checkConservation` | Check Chemistry Conservation | analysis | ✅ | chemistrySolver |
| `simulator.physics.initialize` | Initialize Physics Simulator | utility | ✅ | physicsSolver |
| `simulator.physics.step` | Step Physics Simulator | utility | ✅ | physicsSolver |
| `simulator.physics.converge` | Check Physics Convergence | analysis | ✅ | physicsSolver |
| `simulator.physics.finalize` | Finalize Physics Simulator | utility | ✅ | physicsSolver |
| `simulator.physics.applyLoads` | Apply Loads | utility | ✅ | physicsSolver |
| `simulator.physics.computeStress` | Compute Stress Field | utility | ✅ | physicsSolver |
| `solver.voxel.voxelize` | Voxelize Geometry | conversion | ✅ | voxelizeGeometry |
| `solver.voxel.extractIsosurface` | Extract Isosurface | conversion | ✅ | extractIsosurface |
| `solver.topologyOptimization.optimize` | Optimize Topology | analysis | ✅ | (none) |

### string (7 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `string.concat` | Concatenate | operator | ✅ | text |
| `string.split` | Split | utility | ✅ | text |
| `string.replace` | Replace | utility | ✅ | text |
| `string.substring` | Substring | utility | ✅ | text |
| `string.length` | Length | analysis | ✅ | text |
| `string.toNumber` | To Number | utility | ✅ | text |
| `string.format` | Format | utility | ✅ | text |

### vector (23 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `vector.add` | Vector Add | operator | ✅ | vectorAdd |
| `vector.subtract` | Vector Subtract | operator | ✅ | vectorSubtract |
| `vector.multiply` | Vector Multiply | operator | ✅ | vectorScale |
| `vector.divide` | Vector Divide | operator | ✅ | vectorScale |
| `vector.dot` | Dot Product | operator | ✅ | vectorDot |
| `vector.cross` | Cross Product | operator | ✅ | vectorCross |
| `vector.normalize` | Normalize | utility | ✅ | vectorNormalize |
| `vector.length` | Length | analysis | ✅ | vectorLength |
| `vector.distance` | Distance | analysis | ✅ | vectorLength, distance |
| `vector.lerp` | Vector Lerp | utility | ✅ | vectorLerp |
| `vector.construct` | Construct Vector | utility | ✅ | vectorConstruct |
| `vector.deconstruct` | Deconstruct Vector | utility | ✅ | vectorDeconstruct |
| `vector.angle` | Vector Angle | analysis | ✅ | vectorAngle |
| `vector.project` | Vector Project | utility | ✅ | vectorProject |
| `vector.attractor` | Point Attractor | analysis | ✅ | pointAttractor |
| `vector.constant.origin` | Origin | primitive | ✅ | origin |
| `vector.constant.unitX` | Unit X | primitive | ✅ | unitX |
| `vector.constant.unitY` | Unit Y | primitive | ✅ | unitY |
| `vector.constant.unitZ` | Unit Z | primitive | ✅ | unitZ |
| `vector.constant.unitXYZ` | Unit XYZ | primitive | ✅ | unitXYZ |
| `vector.moveVector` | Move Vector | utility | ✅ | moveVector |
| `vector.scaleVector` | Scale Vector | utility | ✅ | scaleVector |
| `vector.fromPoints` | Vector From Points | utility | ✅ | vectorFromPoints |

### workflow (3 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `workflow.literal` | Literal | primitive | ✅ | number |
| `workflow.identity` | Identity | utility | ✅ | geometryReference |
| `workflow.constant` | Constant | primitive | ✅ | geometryReference |

## Nodes with Semantic Operations

| Node Type | Label | Category | Semantic Operations |
|-----------|-------|----------|---------------------|
| `geometryReference` | Geometry Reference | data | `workflow.identity`, `workflow.constant` |
| `text` | Text | data | `string.concat`, `string.split`, `string.replace`, `string.substring`, `string.length`, `string.toNumber`, `string.format` |
| `mesh` | Mesh | mesh | `geometry.mesh` |
| `colorPicker` | Color Picker | data | `color.hexToRgb`, `color.rgbToHex`, `color.rgbToHsl`, `color.hslToRgb`, `color.blend`, `color.clamp` |
| `meshConvert` | Mesh Convert | mesh | `command.meshConvert` |
| `nurbsToMesh` | NURBS to Mesh | mesh | `command.meshConvert` |
| `brepToMesh` | B-Rep to Mesh | mesh | `brep.tessellateBRepToMesh`, `command.brepToMesh` |
| `meshToBrep` | Mesh to B-Rep | mesh | `brep.brepFromMesh`, `command.meshToBrep` |
| `subdivideMesh` | Subdivide Mesh | tessellation | `meshTess.getTessellationMetadata`, `meshTess.subdivideAdaptive`, `meshTess.subdivideCatmullClark`, `meshTess.subdivideLinear`, `meshTess.subdivideLoop`, `meshTess.tessellationMeshToRenderMesh`, `meshTess.toTessellationMesh`, `meshTess.toTessellationMeshData` |
| `dualMesh` | Dual Mesh | tessellation | `meshTess.dualMesh`, `meshTess.getTessellationMetadata`, `meshTess.tessellationMeshToRenderMesh`, `meshTess.toTessellationMesh`, `meshTess.toTessellationMeshData` |
| `insetFaces` | Inset Faces | tessellation | `meshTess.getTessellationMetadata`, `meshTess.insetFaces`, `meshTess.tessellationMeshToRenderMesh`, `meshTess.toTessellationMesh`, `meshTess.toTessellationMeshData` |
| `extrudeFaces` | Extrude Faces | tessellation | `meshTess.extrudeFaces`, `meshTess.getTessellationMetadata`, `meshTess.tessellationMeshToRenderMesh`, `meshTess.toTessellationMesh`, `meshTess.toTessellationMeshData` |
| `meshRelax` | Mesh Relax | tessellation | `meshTess.getTessellationMetadata`, `meshTess.meshRelax`, `meshTess.tessellationMeshToRenderMesh`, `meshTess.toTessellationMesh`, `meshTess.toTessellationMeshData` |
| `selectFaces` | Select Faces | tessellation | `meshTess.getTessellationMetadata`, `meshTess.selectFaces`, `meshTess.toTessellationMesh` |
| `meshBoolean` | Mesh Boolean | tessellation | `meshTess.meshBoolean`, `meshTess.toTessellationMesh`, `meshTess.toTessellationMeshData` |
| `triangulateMesh` | Triangulate Mesh | tessellation | `meshTess.getTessellationMetadata`, `meshTess.tessellationMeshToRenderMesh`, `meshTess.toTessellationMesh`, `meshTess.toTessellationMeshData`, `meshTess.triangulateMesh` |
| `geodesicSphere` | Geodesic Sphere | tessellation | `meshTess.generateGeodesicSphere`, `meshTess.tessellationMeshToRenderMesh`, `meshTess.toTessellationMeshData` |
| `voronoiPattern` | Voronoi Pattern | tessellation | `math.computeBestFitPlane`, `math.projectPointToPlane`, `meshTess.generateVoronoiPattern`, `meshTess.getTessellationMetadata`, `meshTess.tessellationMeshToRenderMesh`, `meshTess.toTessellationMesh`, `meshTess.toTessellationMeshData` |
| `hexagonalTiling` | Hexagonal Tiling | tessellation | `math.computeBestFitPlane`, `math.projectPointToPlane`, `meshTess.generateHexagonalTiling`, `meshTess.getTessellationMetadata`, `meshTess.tessellationMeshToRenderMesh`, `meshTess.toTessellationMesh`, `meshTess.toTessellationMeshData` |
| `offsetPattern` | Offset Pattern | tessellation | `meshTess.getTessellationMetadata`, `meshTess.offsetPattern`, `meshTess.tessellationMeshToRenderMesh`, `meshTess.toTessellationMesh`, `meshTess.toTessellationMeshData` |
| `meshRepair` | Mesh Repair | tessellation | `meshTess.getTessellationMetadata`, `meshTess.repairMesh`, `meshTess.tessellationMeshToRenderMesh`, `meshTess.toTessellationMesh`, `meshTess.toTessellationMeshData` |
| `meshUVs` | Generate UVs | tessellation | `meshTess.generateMeshUVs`, `meshTess.getTessellationMetadata`, `meshTess.tessellationMeshToRenderMesh`, `meshTess.toTessellationMesh`, `meshTess.toTessellationMeshData` |
| `meshDecimate` | Mesh Decimate | tessellation | `meshTess.decimateMesh`, `meshTess.getTessellationMetadata`, `meshTess.tessellationMeshToRenderMesh`, `meshTess.toTessellationMesh`, `meshTess.toTessellationMeshData` |
| `quadRemesh` | Quad Remesh | tessellation | `meshTess.getTessellationMetadata`, `meshTess.quadDominantRemesh`, `meshTess.tessellationMeshToRenderMesh`, `meshTess.toTessellationMesh`, `meshTess.toTessellationMeshData` |
| `stlImport` | STL Import | interop | `command.import.stl` |
| `stlExport` | STL Export | interop | `command.export.stl` |
| `origin` | Origin | basics | `vector.constant.origin` |
| `unitX` | Unit X | basics | `vector.constant.unitX` |
| `unitY` | Unit Y | basics | `vector.constant.unitY` |
| `unitZ` | Unit Z | basics | `vector.constant.unitZ` |
| `unitXYZ` | Unit XYZ | basics | `vector.constant.unitXYZ` |
| `moveVector` | Move Vector | basics | `vector.moveVector` |
| `scaleVector` | Scale Vector | basics | `vector.scaleVector` |
| `listCreate` | List Create | lists | `data.collect`, `data.filter`, `data.map`, `data.reduce`, `data.sort`, `data.unique` |
| `listLength` | List Length | lists | `data.length` |
| `listItem` | List Item | lists | `data.index` |
| `listIndexOf` | List Index Of | lists | `data.indexOf` |
| `listPartition` | List Partition | lists | `data.partition` |
| `listFlatten` | List Flatten | lists | `data.flatten` |
| `listSlice` | List Slice | lists | `data.slice` |
| `listReverse` | List Reverse | lists | `data.reverse` |
| `range` | Range | ranges | `data.range` |
| `linspace` | Linspace | ranges | `data.linspace` |
| `remap` | Remap | ranges | `math.remap` |
| `random` | Random | ranges | `math.random` |
| `repeat` | Repeat | ranges | `data.repeat` |
| `linearArray` | Linear Array | arrays | `geometry.array.linear` |
| `polarArray` | Polar Array | arrays | `geometry.array.polar` |
| `gridArray` | Grid Array | arrays | `geometry.array.grid` |
| `geometryArray` | Geometry Array | arrays | `geometry.array.geometry` |
| `listSum` | List Sum | analysis | `math.sum` |
| `listAverage` | List Average | analysis | `math.average` |
| `listMin` | List Min | analysis | `math.min` |
| `listMax` | List Max | analysis | `math.max` |
| `listMedian` | List Median | analysis | `math.median` |
| `listStdDev` | List Std Dev | analysis | `math.stdDev` |
| `geometryInfo` | Geometry Info | analysis | `geometry.analyze.info` |
| `measurement` | Measurement | measurement | `mesh.computeArea` |
| `volume` | Volume | measurement | `geometry.analyze.volume` |
| `dimensions` | Dimensions | measurement | `geometry.analyze.dimensions` |
| `geometryVertices` | Geometry Vertices | analysis | `geometry.analyze.vertices` |
| `geometryExtentVertices` | Geometry Extent Vertices | analysis | `geometry.analyze.extentVertices` |
| `geometryEdges` | Geometry Edges | analysis | `geometry.analyze.edges` |
| `geometryFaces` | Geometry Faces | analysis | `geometry.analyze.faces` |
| `geometryNormals` | Geometry Normals | analysis | `geometry.analyze.normals` |
| `geometryControlPoints` | Control Points | analysis | `geometry.analyze.controlPoints` |
| `proximity3d` | Proximity 3D | analysis | `geometry.analyze.proximity3d` |
| `proximity2d` | Proximity 2D | analysis | `geometry.analyze.proximity2d` |
| `curveProximity` | Curve Proximity | analysis | `geometry.analyze.curveProximity` |
| `sineWave` | Sine Wave | signals | `math.wave.sine` |
| `cosineWave` | Cosine Wave | signals | `math.wave.cosine` |
| `sawtoothWave` | Sawtooth Wave | signals | `math.wave.sawtooth` |
| `triangleWave` | Triangle Wave | signals | `math.wave.triangle` |
| `squareWave` | Square Wave | signals | `math.wave.square` |
| `point` | Point Generator | primitives | `command.createPoint` |
| `pointCloud` | Point Cloud | primitives | `geometry.pointCloud` |
| `line` | Line | curves | `command.createLine` |
| `rectangle` | Rectangle | curves | `command.createRectangle` |
| `circle` | Circle | nurbs | `command.createCircle` |
| `arc` | Arc | nurbs | `command.createArc` |
| `curve` | Curve | nurbs | `command.createCurve` |
| `polyline` | Polyline | curves | `command.createPolyline` |
| `surface` | Surface | brep | `command.surface` |
| `loft` | Loft | brep | `mesh.generateLoft` |
| `extrude` | Extrude | brep | `mesh.generateExtrude` |
| `pipeSweep` | Pipe | brep | `mesh.generateCylinder`, `mesh.generatePipe`, `mesh.generateSphere` |
| `pipeMerge` | Pipe Merge | mesh | `mesh.generateSphere` |
| `boolean` | Boolean | brep | `mesh.generateBox`, `mesh.computeVertexNormals` |
| `offset` | Offset | modifiers | `boolean.offsetPolyline2D`, `curve.resampleByArcLength`, `math.computeBestFitPlane`, `math.projectPointToPlane`, `math.unprojectPointFromPlane` |
| `fillet` | Fillet | modifiers | `geometry.fillet` |
| `filletEdges` | Fillet Edges | mesh | `geometry.filletEdges` |
| `offsetSurface` | Offset Surface | brep | `geometry.offsetSurface` |
| `thickenMesh` | Thicken Mesh | mesh | `geometry.thickenMesh` |
| `plasticwrap` | Plasticwrap | modifiers | `geometry.plasticwrap` |
| `solid` | Solid | mesh | `geometry.solid` |
| `primitive` | Primitive | primitives | `geometry.primitive` |
| `box` | Box Builder | primitives | `command.createPrimitive` |
| `sphere` | Sphere | primitives | `command.createPrimitive` |
| `cylinder` | Cylinder | primitives | `geometry.primitive.cylinder` |
| `torus` | Torus | primitives | `geometry.primitive.torus` |
| `pyramid` | Pyramid | primitives | `geometry.primitive.pyramid` |
| `tetrahedron` | Tetrahedron | primitives | `geometry.primitive.tetrahedron` |
| `octahedron` | Octahedron | primitives | `geometry.primitive.octahedron` |
| `icosahedron` | Icosahedron | primitives | `geometry.primitive.icosahedron` |
| `dodecahedron` | Dodecahedron | primitives | `geometry.primitive.dodecahedron` |
| `hemisphere` | Hemisphere | primitives | `geometry.primitive.hemisphere` |
| `capsule` | Capsule | primitives | `geometry.primitive.capsule` |
| `disk` | Disk | primitives | `geometry.primitive.disk` |
| `ring` | Ring / Annulus | primitives | `geometry.primitive.ring` |
| `triangular-prism` | Triangular Prism | primitives | `geometry.primitive.triangularPrism` |
| `hexagonal-prism` | Hexagonal Prism | primitives | `geometry.primitive.hexagonalPrism` |
| `pentagonal-prism` | Pentagonal Prism | primitives | `geometry.primitive.pentagonalPrism` |
| `torus-knot` | Torus Knot | primitives | `geometry.primitive.torusKnot` |
| `utah-teapot` | Utah Teapot | primitives | `geometry.primitive.utahTeapot` |
| `frustum` | Frustum | primitives | `geometry.primitive.frustum` |
| `mobius-strip` | Mobius Strip | primitives | `geometry.primitive.mobiusStrip` |
| `ellipsoid` | Ellipsoid | primitives | `geometry.primitive.ellipsoid` |
| `wedge` | Wedge | primitives | `geometry.primitive.wedge` |
| `spherical-cap` | Spherical Cap / Dome | primitives | `geometry.primitive.sphericalCap` |
| `bipyramid` | Bipyramid | primitives | `geometry.primitive.bipyramid` |
| `rhombic-dodecahedron` | Rhombic Dodecahedron | primitives | `geometry.primitive.rhombicDodecahedron` |
| `truncated-cube` | Truncated Cube | primitives | `geometry.primitive.truncatedCube` |
| `truncated-octahedron` | Truncated Octahedron | primitives | `geometry.primitive.truncatedOctahedron` |
| `truncated-icosahedron` | Truncated Icosahedron | primitives | `geometry.primitive.truncatedIcosahedron` |
| `pipe` | Pipe / Hollow Cylinder | primitives | `geometry.primitive.pipe` |
| `superellipsoid` | Superellipsoid | primitives | `geometry.primitive.superellipsoid` |
| `hyperbolic-paraboloid` | Hyperbolic Paraboloid | primitives | `geometry.primitive.hyperbolicParaboloid` |
| `geodesic-dome` | Geodesic Dome | primitives | `geometry.primitive.geodesicDome` |
| `one-sheet-hyperboloid` | One-Sheet Hyperboloid | primitives | `geometry.primitive.oneSheetHyperboloid` |
| `voxelizeGeometry` | Voxelize Geometry | voxel | `solver.voxel.voxelize` |
| `extractIsosurface` | Extract Isosurface | voxel | `solver.voxel.extractIsosurface` |
| `number` | Number | math | `workflow.literal` |
| `add` | Add | math | `math.add` |
| `subtract` | Subtract | math | `math.subtract` |
| `multiply` | Multiply | math | `math.multiply` |
| `divide` | Divide | math | `math.divide` |
| `clamp` | Clamp | math | `math.clamp` |
| `min` | Min | math | `math.min` |
| `max` | Max | math | `math.max` |
| `expression` | Expression | math | `math.expression` |
| `scalarFunctions` | Scalar Functions | math | `math.abs`, `math.sqrt`, `math.exp`, `math.log`, `math.sin`, `math.cos`, `math.tan`, `math.floor`, `math.ceil`, `math.round`, `math.power`, `math.modulo`, `math.negate`, `math.asin`, `math.acos`, `math.atan`, `math.atan2`, `math.log10`, `math.lerp` |
| `toggleSwitch` | Toggle Switch | logic | `logic.toggle` |
| `conditionalToggleButton` | Conditional Toggle Button | logic | `logic.conditionalToggle` |
| `conditional` | Conditional | logic | `logic.if`, `math.equal`, `math.notEqual`, `math.lessThan`, `math.lessThanOrEqual`, `math.greaterThan`, `math.greaterThanOrEqual`, `logic.and`, `logic.or`, `logic.not`, `logic.xor`, `logic.compare` |
| `vectorConstruct` | Vector Compose | euclidean | `vector.construct` |
| `vectorDeconstruct` | Vector Decompose | euclidean | `vector.deconstruct` |
| `vectorAdd` | Vector Add | euclidean | `vector.add` |
| `vectorSubtract` | Vector Subtract | euclidean | `vector.subtract` |
| `vectorScale` | Vector Scale | transforms | `vector.multiply`, `vector.divide` |
| `vectorLength` | Vector Length | euclidean | `vector.length`, `vector.distance` |
| `vectorNormalize` | Vector Normalize | euclidean | `vector.normalize` |
| `vectorDot` | Vector Dot | euclidean | `vector.dot` |
| `vectorCross` | Vector Cross | euclidean | `vector.cross` |
| `distance` | Distance | euclidean | `vector.distance` |
| `vectorFromPoints` | Vector From Points | euclidean | `vector.fromPoints` |
| `vectorAngle` | Vector Angle | euclidean | `vector.angle` |
| `vectorLerp` | Vector Lerp | euclidean | `vector.lerp` |
| `vectorProject` | Vector Project | euclidean | `vector.project` |
| `pointAttractor` | Point Attractor | euclidean | `vector.attractor` |
| `move` | Move | transforms | `command.move` |
| `rotate` | Rotate | transforms | `command.rotate` |
| `scale` | Scale | transforms | `command.scale` |
| `fieldTransformation` | Field Transformation | transforms | `geometry.field.transform` |
| `movePoint` | Move Point | euclidean | `geometry.field.movePoint` |
| `movePointByVector` | Move Point By Vector | euclidean | `geometry.field.movePointByVector` |
| `rotateVectorAxis` | Rotate Vector | euclidean | `geometry.field.rotateVectorAxis` |
| `mirrorVector` | Mirror Vector | euclidean | `geometry.field.mirrorVector` |
| `physicsSolver` | Ἐπιλύτης Φυσικῆς | solver | `solver.physics`, `simulator.physics.initialize`, `simulator.physics.step`, `simulator.physics.converge`, `simulator.physics.finalize`, `simulator.physics.applyLoads`, `simulator.physics.computeStress` |
| `chemistrySolver` | Ἐπιλύτης Χημείας | solver | `solver.chemistry`, `simulator.chemistry.initialize`, `simulator.chemistry.step`, `simulator.chemistry.converge`, `simulator.chemistry.finalize`, `simulator.chemistry.blendMaterials`, `simulator.chemistry.evaluateGoals`, `simulator.chemistry.analyze`, `simulator.chemistry.validate`, `simulator.chemistry.computeGradients`, `simulator.chemistry.computeStatistics`, `simulator.chemistry.checkConservation` |
| `evolutionarySolver` | Evolutionary Solver | solver | `solver.evolutionary`, `simulator.initialize`, `simulator.step`, `simulator.converge`, `simulator.finalize` |
| `voxelSolver` | Voxelizer | voxel | `solver.voxel`, `simulator.voxel.initialize`, `simulator.voxel.step`, `simulator.voxel.finalize` |
| `topologyOptimizationSolver` | Topology Optimization | solver | `solver.topologyOptimization` |

## Dashboards

### Evolutionary Simulator Dashboard

**Solver**: evolutionary

**Operations**:
- `solver.evolutionary`
- `simulator.initialize`
- `simulator.step`
- `simulator.converge`
- `simulator.finalize`

### Chemistry Simulator Dashboard

**Solver**: chemistry

**Operations**:
- `solver.chemistry`
- `simulator.chemistry.initialize`
- `simulator.chemistry.step`
- `simulator.chemistry.converge`
- `simulator.chemistry.finalize`
- `simulator.chemistry.blendMaterials`
- `simulator.chemistry.evaluateGoals`

### Physics Simulator Dashboard

**Solver**: physics

**Operations**:
- `solver.physics`
- `simulator.physics.initialize`
- `simulator.physics.step`
- `simulator.physics.converge`
- `simulator.physics.finalize`
- `simulator.physics.applyLoads`
- `simulator.physics.computeStress`

## Orphan Operations

These operations are defined but never used by any node:

- `simulator.topology.initialize`
- `simulator.topology.step`
- `simulator.topology.converge`
- `simulator.topology.finalize`
- `simulator.topology.preview`
- `simulator.topology.sync`
- `simulator.topology.pause`
- `simulator.topology.resume`
- `simulator.topology.reset`
- `simulator.topology.plasticwrap`
- `simulator.topology.stabilityGuard`
- `solver.topologyOptimization.optimize`
- `command.createNurbsBox`
- `command.createNurbsSphere`
- `command.createNurbsCylinder`
- `command.boolean`
- `command.loft`
- `command.extrude`
- `command.meshMerge`
- `command.meshFlip`
- `command.meshThicken`
- `command.morph`
- `command.nurbsRestore`
- `command.interpolate`
- `command.offset`
- `command.mirror`
- `command.array`
- `command.transform`
- `command.undo`
- `command.redo`
- `command.copy`
- `command.paste`
- `command.duplicate`
- `command.delete`
- `command.cancel`
- `command.confirm`
- `command.gumball`
- `command.focus`
- `command.frameAll`
- `command.screenshot`
- `command.view`
- `command.camera`
- `command.pivot`
- `command.orbit`
- `command.pan`
- `command.zoom`
- `command.selectionFilter`
- `command.cycle`
- `command.snapping`
- `command.grid`
- `command.cplane`
- `command.display`
- `command.isolate`
- `command.outliner`
- `command.tolerance`
- `command.status`
- `geometry.brep`
- `geometry.primitive.box`
- `geometry.primitive.sphere`
- `tess.tessellateCurveAdaptive`
- `tess.tessellateSurfaceAdaptive`

