# Semantic Inventory

Generated: 2026-02-02T18:18:55.470Z

## Summary

- **Total Operations**: 197
- **Total Nodes**: 74
- **Total Dashboards**: 3
- **Orphan Operations**: 48
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

### command (59 operations)

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
| `command.meshToBrep` | Mesh to B-Rep | conversion | ✅ | (none) |
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

### data (9 operations)

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

### geometry (42 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `geometry.mesh` | Mesh | passthrough | ✅ | mesh |
| `geometry.brep` | B-Rep | passthrough | ✅ | (none) |
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

### logic (6 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `logic.and` | And | operator | ✅ | conditional |
| `logic.or` | Or | operator | ✅ | conditional |
| `logic.not` | Not | operator | ✅ | conditional |
| `logic.xor` | Xor | operator | ✅ | conditional |
| `logic.if` | If | control | ✅ | conditional |
| `logic.compare` | Compare | operator | ✅ | conditional |

### math (34 operations)

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
| `math.min` | Minimum | aggregation | ✅ | min |
| `math.max` | Maximum | aggregation | ✅ | max |
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

### solver (21 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `solver.physics` | Physics Solver | utility | ✅ | physicsSolver |
| `solver.chemistry` | Chemistry Solver | utility | ✅ | chemistrySolver, chemistrySolver |
| `solver.evolutionary` | Evolutionary Solver | utility | ✅ | evolutionarySolver |
| `solver.voxel` | Voxel Solver | conversion | ✅ | voxelSolver |
| `solver.topologyOptimization` | Topology Optimization Solver | utility | ⚠️ | topologyOptimizationSolver |
| `simulator.initialize` | Initialize Simulator | utility | ✅ | evolutionarySolver |
| `simulator.step` | Step Simulator | utility | ✅ | evolutionarySolver |
| `simulator.converge` | Check Convergence | query | ✅ | evolutionarySolver |
| `simulator.finalize` | Finalize Simulator | utility | ✅ | evolutionarySolver |
| `simulator.chemistry.initialize` | Initialize Chemistry Simulator | utility | ✅ | chemistrySolver |
| `simulator.chemistry.step` | Step Chemistry Simulator | utility | ✅ | chemistrySolver |
| `simulator.chemistry.converge` | Check Chemistry Convergence | query | ✅ | chemistrySolver |
| `simulator.chemistry.finalize` | Finalize Chemistry Simulator | utility | ✅ | chemistrySolver |
| `simulator.chemistry.blendMaterials` | Blend Materials | utility | ✅ | chemistrySolver |
| `simulator.chemistry.evaluateGoals` | Evaluate Chemistry Goals | query | ✅ | chemistrySolver |
| `simulator.physics.initialize` | Initialize Physics Simulator | utility | ✅ | physicsSolver |
| `simulator.physics.step` | Step Physics Simulator | utility | ✅ | physicsSolver |
| `simulator.physics.converge` | Check Physics Convergence | query | ✅ | physicsSolver |
| `simulator.physics.finalize` | Finalize Physics Simulator | utility | ✅ | physicsSolver |
| `simulator.physics.applyLoads` | Apply Loads | utility | ✅ | physicsSolver |
| `simulator.physics.computeStress` | Compute Stress Field | utility | ✅ | physicsSolver |

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

### vector (10 operations)

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
| `vector.distance` | Distance | analysis | ✅ | vectorLength |
| `vector.lerp` | Vector Lerp | utility | ✅ | vectorLerp |

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
| `meshToBrep` | Mesh to B-Rep | mesh | `brep.brepFromMesh` |
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
| `listCreate` | List Create | lists | `data.collect`, `data.filter`, `data.map`, `data.reduce`, `data.sort`, `data.unique` |
| `listLength` | List Length | lists | `data.length` |
| `listItem` | List Item | lists | `data.index` |
| `listFlatten` | List Flatten | lists | `data.flatten` |
| `remap` | Remap | ranges | `math.remap` |
| `random` | Random | ranges | `math.random` |
| `measurement` | Measurement | measurement | `mesh.computeArea` |
| `point` | Point Generator | primitives | `command.createPoint` |
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
| `box` | Box Builder | primitives | `command.createPrimitive` |
| `sphere` | Sphere | primitives | `command.createPrimitive` |
| `chemistrySolver` | Ἐπιλύτης Χημείας | solver | `solver.chemistry` |
| `number` | Number | math | `workflow.literal` |
| `add` | Add | math | `math.add` |
| `subtract` | Subtract | math | `math.subtract` |
| `multiply` | Multiply | math | `math.multiply` |
| `divide` | Divide | math | `math.divide` |
| `clamp` | Clamp | math | `math.clamp` |
| `min` | Min | math | `math.min` |
| `max` | Max | math | `math.max` |
| `scalarFunctions` | Scalar Functions | math | `math.abs`, `math.sqrt`, `math.exp`, `math.log`, `math.sin`, `math.cos`, `math.tan`, `math.floor`, `math.ceil`, `math.round`, `math.power`, `math.modulo`, `math.negate`, `math.asin`, `math.acos`, `math.atan`, `math.atan2`, `math.log10`, `math.lerp` |
| `conditional` | Conditional | logic | `logic.if`, `math.equal`, `math.notEqual`, `math.lessThan`, `math.lessThanOrEqual`, `math.greaterThan`, `math.greaterThanOrEqual`, `logic.and`, `logic.or`, `logic.not`, `logic.xor`, `logic.compare` |
| `vectorAdd` | Vector Add | euclidean | `vector.add` |
| `vectorSubtract` | Vector Subtract | euclidean | `vector.subtract` |
| `vectorScale` | Vector Scale | transforms | `vector.multiply`, `vector.divide` |
| `vectorLength` | Vector Length | euclidean | `vector.length`, `vector.distance` |
| `vectorNormalize` | Vector Normalize | euclidean | `vector.normalize` |
| `vectorDot` | Vector Dot | euclidean | `vector.dot` |
| `vectorCross` | Vector Cross | euclidean | `vector.cross` |
| `vectorLerp` | Vector Lerp | euclidean | `vector.lerp` |
| `move` | Move | transforms | `command.move` |
| `rotate` | Rotate | transforms | `command.rotate` |
| `scale` | Scale | transforms | `command.scale` |
| `physicsSolver` | Ἐπιλύτης Φυσικῆς | solver | `solver.physics`, `simulator.physics.initialize`, `simulator.physics.step`, `simulator.physics.converge`, `simulator.physics.finalize`, `simulator.physics.applyLoads`, `simulator.physics.computeStress` |
| `chemistrySolver` | Ἐπιλύτης Χημείας | solver | `solver.chemistry`, `simulator.chemistry.initialize`, `simulator.chemistry.step`, `simulator.chemistry.converge`, `simulator.chemistry.finalize`, `simulator.chemistry.blendMaterials`, `simulator.chemistry.evaluateGoals` |
| `evolutionarySolver` | Evolutionary Solver | solver | `solver.evolutionary`, `simulator.initialize`, `simulator.step`, `simulator.converge`, `simulator.finalize` |
| `voxelSolver` | Voxelizer | voxel | `solver.voxel` |
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
- `command.meshToBrep`
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
- `tess.tessellateCurveAdaptive`
- `tess.tessellateSurfaceAdaptive`

