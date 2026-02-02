# Semantic Inventory

Generated: 2026-02-02T17:02:11.548Z

## Summary

- **Total Operations**: 195
- **Total Nodes**: 47
- **Total Dashboards**: 3
- **Orphan Operations**: 132
- **Dangling References**: 0

## Operations by Domain

### color (6 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `color.hexToRgb` | Hex to RGB | utility | ✅ | (none) |
| `color.rgbToHex` | RGB to Hex | utility | ✅ | (none) |
| `color.rgbToHsl` | RGB to HSL | utility | ✅ | (none) |
| `color.hslToRgb` | HSL to RGB | utility | ✅ | (none) |
| `color.blend` | Blend | operator | ✅ | (none) |
| `color.clamp` | Clamp | utility | ✅ | (none) |

### command (59 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `command.createPoint` | Create Point | creation | ✅ | (none) |
| `command.createLine` | Create Line | creation | ✅ | (none) |
| `command.createPolyline` | Create Polyline | creation | ✅ | (none) |
| `command.createRectangle` | Create Rectangle | creation | ✅ | (none) |
| `command.createCircle` | Create Circle | creation | ✅ | (none) |
| `command.createArc` | Create Arc | creation | ✅ | (none) |
| `command.createCurve` | Create Curve | creation | ✅ | (none) |
| `command.createPrimitive` | Create Primitive | creation | ✅ | (none) |
| `command.createNurbsBox` | Create NURBS Box | creation | ✅ | (none) |
| `command.createNurbsSphere` | Create NURBS Sphere | creation | ✅ | (none) |
| `command.createNurbsCylinder` | Create NURBS Cylinder | creation | ✅ | (none) |
| `command.boolean` | Boolean | operation | ✅ | (none) |
| `command.loft` | Loft | operation | ✅ | (none) |
| `command.surface` | Surface | operation | ✅ | (none) |
| `command.extrude` | Extrude | operation | ✅ | (none) |
| `command.meshMerge` | Mesh Merge | operation | ✅ | (none) |
| `command.meshFlip` | Mesh Flip | operation | ✅ | (none) |
| `command.meshThicken` | Mesh Thicken | operation | ✅ | (none) |
| `command.morph` | Morph | operation | ✅ | (none) |
| `command.meshConvert` | NURBS to Mesh | conversion | ✅ | (none) |
| `command.brepToMesh` | B-Rep to Mesh | conversion | ✅ | (none) |
| `command.meshToBrep` | Mesh to B-Rep | conversion | ✅ | (none) |
| `command.nurbsRestore` | Mesh to NURBS | conversion | ✅ | (none) |
| `command.interpolate` | Interpolate | conversion | ✅ | (none) |
| `command.move` | Move | transform | ✅ | (none) |
| `command.rotate` | Rotate | transform | ✅ | (none) |
| `command.scale` | Scale | transform | ✅ | (none) |
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
| `data.collect` | Collect | aggregation | ✅ | (none) |
| `data.flatten` | Flatten | utility | ✅ | (none) |
| `data.filter` | Filter | utility | ✅ | (none) |
| `data.map` | Map | utility | ✅ | (none) |
| `data.reduce` | Reduce | aggregation | ✅ | (none) |
| `data.sort` | Sort | utility | ✅ | (none) |
| `data.unique` | Unique | utility | ✅ | (none) |
| `data.length` | Length | analysis | ✅ | (none) |
| `data.index` | Index | utility | ✅ | (none) |

### geometry (40 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
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
| `brep.tessellateBRepToMesh` | Tessellate B-Rep To Mesh | tessellation | ✅ | (none) |
| `tess.tessellateCurveAdaptive` | Tessellate Curve Adaptive | tessellation | ✅ | (none) |
| `tess.tessellateSurfaceAdaptive` | Tessellate Surface Adaptive | tessellation | ✅ | (none) |

### logic (6 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `logic.and` | And | operator | ✅ | (none) |
| `logic.or` | Or | operator | ✅ | (none) |
| `logic.not` | Not | operator | ✅ | (none) |
| `logic.xor` | Xor | operator | ✅ | (none) |
| `logic.if` | If | control | ✅ | (none) |
| `logic.compare` | Compare | operator | ✅ | (none) |

### math (34 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `math.add` | Add | operator | ✅ | add |
| `math.subtract` | Subtract | operator | ✅ | subtract |
| `math.multiply` | Multiply | operator | ✅ | multiply |
| `math.divide` | Divide | operator | ✅ | divide |
| `math.modulo` | Modulo | operator | ✅ | (none) |
| `math.power` | Power | operator | ✅ | (none) |
| `math.floor` | Floor | operator | ✅ | (none) |
| `math.ceil` | Ceiling | operator | ✅ | (none) |
| `math.round` | Round | operator | ✅ | (none) |
| `math.abs` | Absolute Value | operator | ✅ | (none) |
| `math.negate` | Negate | operator | ✅ | (none) |
| `math.sqrt` | Square Root | operator | ✅ | (none) |
| `math.sin` | Sine | operator | ✅ | (none) |
| `math.cos` | Cosine | operator | ✅ | (none) |
| `math.tan` | Tangent | operator | ✅ | (none) |
| `math.asin` | Arcsine | operator | ✅ | (none) |
| `math.acos` | Arccosine | operator | ✅ | (none) |
| `math.atan` | Arctangent | operator | ✅ | (none) |
| `math.atan2` | Arctangent2 | operator | ✅ | (none) |
| `math.exp` | Exponential | operator | ✅ | (none) |
| `math.log` | Natural Logarithm | operator | ✅ | (none) |
| `math.log10` | Base-10 Logarithm | operator | ✅ | (none) |
| `math.min` | Minimum | aggregation | ✅ | min |
| `math.max` | Maximum | aggregation | ✅ | max |
| `math.clamp` | Clamp | utility | ✅ | clamp |
| `math.lerp` | Linear Interpolation | utility | ✅ | (none) |
| `math.remap` | Remap | utility | ✅ | remap |
| `math.equal` | Equal | operator | ✅ | (none) |
| `math.notEqual` | Not Equal | operator | ✅ | (none) |
| `math.lessThan` | Less Than | operator | ✅ | (none) |
| `math.lessThanOrEqual` | Less Than or Equal | operator | ✅ | (none) |
| `math.greaterThan` | Greater Than | operator | ✅ | (none) |
| `math.greaterThanOrEqual` | Greater Than or Equal | operator | ✅ | (none) |
| `math.random` | Random | utility | ✅ | random |

### solver (21 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `solver.physics` | Physics Solver | utility | ✅ | physicsSolver |
| `solver.chemistry` | Chemistry Solver | utility | ✅ | chemistrySolver, chemistrySolver |
| `solver.evolutionary` | Evolutionary Solver | utility | ✅ | evolutionarySolver |
| `solver.voxel` | Voxel Solver | conversion | ✅ | voxelSolver |
| `solver.topologyOptimization` | Topology Optimization Solver | utility | ⚠️ | topologyOptimizationSolver |
| `simulator.initialize` | Initialize Simulator | utility | ✅ | (none) |
| `simulator.step` | Step Simulator | utility | ✅ | (none) |
| `simulator.converge` | Check Convergence | query | ✅ | (none) |
| `simulator.finalize` | Finalize Simulator | utility | ✅ | (none) |
| `simulator.chemistry.initialize` | Initialize Chemistry Simulator | utility | ✅ | (none) |
| `simulator.chemistry.step` | Step Chemistry Simulator | utility | ✅ | (none) |
| `simulator.chemistry.converge` | Check Chemistry Convergence | query | ✅ | (none) |
| `simulator.chemistry.finalize` | Finalize Chemistry Simulator | utility | ✅ | (none) |
| `simulator.chemistry.blendMaterials` | Blend Materials | utility | ✅ | (none) |
| `simulator.chemistry.evaluateGoals` | Evaluate Chemistry Goals | query | ✅ | (none) |
| `simulator.physics.initialize` | Initialize Physics Simulator | utility | ✅ | (none) |
| `simulator.physics.step` | Step Physics Simulator | utility | ✅ | (none) |
| `simulator.physics.converge` | Check Physics Convergence | query | ✅ | (none) |
| `simulator.physics.finalize` | Finalize Physics Simulator | utility | ✅ | (none) |
| `simulator.physics.applyLoads` | Apply Loads | utility | ✅ | (none) |
| `simulator.physics.computeStress` | Compute Stress Field | utility | ✅ | (none) |

### string (7 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `string.concat` | Concatenate | operator | ✅ | (none) |
| `string.split` | Split | utility | ✅ | (none) |
| `string.replace` | Replace | utility | ✅ | (none) |
| `string.substring` | Substring | utility | ✅ | (none) |
| `string.length` | Length | analysis | ✅ | (none) |
| `string.toNumber` | To Number | utility | ✅ | (none) |
| `string.format` | Format | utility | ✅ | (none) |

### vector (10 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `vector.add` | Vector Add | operator | ✅ | vectorAdd |
| `vector.subtract` | Vector Subtract | operator | ✅ | vectorSubtract |
| `vector.multiply` | Vector Multiply | operator | ✅ | (none) |
| `vector.divide` | Vector Divide | operator | ✅ | (none) |
| `vector.dot` | Dot Product | operator | ✅ | vectorDot |
| `vector.cross` | Cross Product | operator | ✅ | vectorCross |
| `vector.normalize` | Normalize | utility | ✅ | vectorNormalize |
| `vector.length` | Length | analysis | ✅ | vectorLength |
| `vector.distance` | Distance | analysis | ✅ | (none) |
| `vector.lerp` | Vector Lerp | utility | ✅ | vectorLerp |

### workflow (3 operations)

| ID | Name | Category | Stable | Used By |
|----|------|----------|--------|----------|
| `workflow.literal` | Literal | primitive | ✅ | number |
| `workflow.identity` | Identity | utility | ✅ | (none) |
| `workflow.constant` | Constant | primitive | ✅ | (none) |

## Nodes with Semantic Operations

| Node Type | Label | Category | Semantic Operations |
|-----------|-------|----------|---------------------|
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
| `remap` | Remap | ranges | `math.remap` |
| `random` | Random | ranges | `math.random` |
| `measurement` | Measurement | measurement | `mesh.computeArea` |
| `loft` | Loft | brep | `mesh.generateLoft` |
| `extrude` | Extrude | brep | `mesh.generateExtrude` |
| `pipeSweep` | Pipe | brep | `mesh.generateCylinder`, `mesh.generatePipe`, `mesh.generateSphere` |
| `pipeMerge` | Pipe Merge | mesh | `mesh.generateSphere` |
| `boolean` | Boolean | brep | `mesh.generateBox`, `mesh.computeVertexNormals` |
| `offset` | Offset | modifiers | `boolean.offsetPolyline2D`, `curve.resampleByArcLength`, `math.computeBestFitPlane`, `math.projectPointToPlane`, `math.unprojectPointFromPlane` |
| `chemistrySolver` | Ἐπιλύτης Χημείας | solver | `solver.chemistry` |
| `number` | Number | math | `workflow.literal` |
| `add` | Add | math | `math.add` |
| `subtract` | Subtract | math | `math.subtract` |
| `multiply` | Multiply | math | `math.multiply` |
| `divide` | Divide | math | `math.divide` |
| `clamp` | Clamp | math | `math.clamp` |
| `min` | Min | math | `math.min` |
| `max` | Max | math | `math.max` |
| `vectorAdd` | Vector Add | euclidean | `vector.add` |
| `vectorSubtract` | Vector Subtract | euclidean | `vector.subtract` |
| `vectorLength` | Vector Length | euclidean | `vector.length` |
| `vectorNormalize` | Vector Normalize | euclidean | `vector.normalize` |
| `vectorDot` | Vector Dot | euclidean | `vector.dot` |
| `vectorCross` | Vector Cross | euclidean | `vector.cross` |
| `vectorLerp` | Vector Lerp | euclidean | `vector.lerp` |
| `physicsSolver` | Ἐπιλύτης Φυσικῆς | solver | `solver.physics` |
| `chemistrySolver` | Ἐπιλύτης Χημείας | solver | `solver.chemistry` |
| `evolutionarySolver` | Evolutionary Solver | solver | `solver.evolutionary` |
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

- `math.modulo`
- `math.power`
- `math.floor`
- `math.ceil`
- `math.round`
- `math.abs`
- `math.negate`
- `math.sqrt`
- `math.sin`
- `math.cos`
- `math.tan`
- `math.asin`
- `math.acos`
- `math.atan`
- `math.atan2`
- `math.exp`
- `math.log`
- `math.log10`
- `math.lerp`
- `math.equal`
- `math.notEqual`
- `math.lessThan`
- `math.lessThanOrEqual`
- `math.greaterThan`
- `math.greaterThanOrEqual`
- `vector.multiply`
- `vector.divide`
- `vector.distance`
- `logic.and`
- `logic.or`
- `logic.not`
- `logic.xor`
- `logic.if`
- `logic.compare`
- `data.collect`
- `data.flatten`
- `data.filter`
- `data.map`
- `data.reduce`
- `data.sort`
- `data.unique`
- `data.length`
- `data.index`
- `string.concat`
- `string.split`
- `string.replace`
- `string.substring`
- `string.length`
- `string.toNumber`
- `string.format`
- `color.hexToRgb`
- `color.rgbToHex`
- `color.rgbToHsl`
- `color.hslToRgb`
- `color.blend`
- `color.clamp`
- `workflow.identity`
- `workflow.constant`
- `simulator.chemistry.initialize`
- `simulator.chemistry.step`
- `simulator.chemistry.converge`
- `simulator.chemistry.finalize`
- `simulator.chemistry.blendMaterials`
- `simulator.chemistry.evaluateGoals`
- `simulator.physics.initialize`
- `simulator.physics.step`
- `simulator.physics.converge`
- `simulator.physics.finalize`
- `simulator.physics.applyLoads`
- `simulator.physics.computeStress`
- `command.createPoint`
- `command.createLine`
- `command.createPolyline`
- `command.createRectangle`
- `command.createCircle`
- `command.createArc`
- `command.createCurve`
- `command.createPrimitive`
- `command.createNurbsBox`
- `command.createNurbsSphere`
- `command.createNurbsCylinder`
- `command.boolean`
- `command.loft`
- `command.surface`
- `command.extrude`
- `command.meshMerge`
- `command.meshFlip`
- `command.meshThicken`
- `command.morph`
- `command.meshConvert`
- `command.brepToMesh`
- `command.meshToBrep`
- `command.nurbsRestore`
- `command.interpolate`
- `command.move`
- `command.rotate`
- `command.scale`
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
- `brep.tessellateBRepToMesh`
- `tess.tessellateCurveAdaptive`
- `tess.tessellateSurfaceAdaptive`

