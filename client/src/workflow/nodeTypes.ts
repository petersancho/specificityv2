export type NodeType =
  | "geometryReference"
  | "text"
  | "group"
  | "panel"
  | "textNote"
  | "slider"
  | "colorPicker"
  | "customMaterial"
  | "geometryViewer"
  | "customViewer"
  | "customPreview"
  | "previewFilter"
  | "meshConvert"
  | "nurbsToMesh"
  | "brepToMesh"
  | "meshToBrep"
  | "mesh"
  | "subdivideMesh"
  | "dualMesh"
  | "insetFaces"
  | "extrudeFaces"
  | "meshRelax"
  | "selectFaces"
  | "meshBoolean"
  | "triangulateMesh"
  | "geodesicSphere"
  | "voronoiPattern"
  | "hexagonalTiling"
  | "offsetPattern"
  | "meshRepair"
  | "meshUVs"
  | "meshDecimate"
  | "quadRemesh"
  | "stlExport"
  | "stlImport"
  | "point"
  | "pointCloud"
  | "line"
  | "rectangle"
  | "circle"
  | "arc"
  | "curve"
  | "polyline"
  | "surface"
  | "loft"
  | "extrude"
  | "primitive"
  | "cylinder"
  | "torus"
  | "pyramid"
  | "tetrahedron"
  | "octahedron"
  | "icosahedron"
  | "dodecahedron"
  | "hemisphere"
  | "capsule"
  | "disk"
  | "ring"
  | "triangular-prism"
  | "pentagonal-prism"
  | "hexagonal-prism"
  | "torus-knot"
  | "utah-teapot"
  | "frustum"
  | "mobius-strip"
  | "ellipsoid"
  | "wedge"
  | "spherical-cap"
  | "bipyramid"
  | "rhombic-dodecahedron"
  | "truncated-cube"
  | "truncated-octahedron"
  | "truncated-icosahedron"
  | "pipe"
  | "superellipsoid"
  | "hyperbolic-paraboloid"
  | "geodesic-dome"
  | "one-sheet-hyperboloid"
  | "box"
  | "sphere"
  | "boolean"
  | "offset"
  | "fillet"
  | "filletEdges"
  | "offsetSurface"
  | "thickenMesh"
  | "plasticwrap"
  | "solid"
  | "measurement"
  | "dimensions"
  | "geometryArray"
  | "rotate"
  | "scale"
  | "fieldTransformation"
  | "voxelizeGeometry"
  | "extractIsosurface"
  | "topologyOptimize"
  | "topologySolver"
  | "topologyOptimizationSolver"
  | "physicsSolver"
  | "voxelSolver"
  | "chemistrySolver"
  | "evolutionarySolver"
  | "stiffnessGoal"
  | "volumeGoal"
  | "loadGoal"
  | "anchorGoal"
  | "chemistryStiffnessGoal"
  | "chemistryMassGoal"
  | "chemistryBlendGoal"
  | "chemistryTransparencyGoal"
  | "chemistryThermalGoal"
  | "chemistryMaterialGoal"
  | "origin"
  | "unitX"
  | "unitY"
  | "unitZ"
  | "unitXYZ"
  | "moveVector"
  | "scaleVector"
  | "number"
  | "add"
  | "subtract"
  | "multiply"
  | "divide"
  | "clamp"
  | "min"
  | "max"
  | "expression"
  | "scalarFunctions"
  | "toggleSwitch"
  | "conditionalToggleButton"
  | "conditional"
  | "vectorConstruct"
  | "vectorDeconstruct"
  | "vectorAdd"
  | "vectorSubtract"
  | "vectorScale"
  | "vectorLength"
  | "vectorNormalize"
  | "vectorDot"
  | "vectorCross"
  | "distance"
  | "vectorFromPoints"
  | "vectorAngle"
  | "vectorLerp"
  | "vectorProject"
  | "pointAttractor"
  | "move"
  | "movePoint"
  | "movePointByVector"
  | "rotateVectorAxis"
  | "mirrorVector"
  | "proximity2d"
  | "proximity3d"
  | "curveProximity"
  | "listCreate"
  | "listLength"
  | "listItem"
  | "listIndexOf"
  | "listPartition"
  | "listFlatten"
  | "listSlice"
  | "listReverse"
  | "listSum"
  | "listAverage"
  | "listMin"
  | "listMax"
  | "listMedian"
  | "listStdDev"
  | "geometryInfo"
  | "metadataPanel"
  | "annotations"
  | "geometryVertices"
  | "geometryEdges"
  | "geometryFaces"
  | "geometryNormals"
  | "geometryControlPoints"
  | "range"
  | "linspace"
  | "remap"
  | "random"
  | "repeat"
  | "linearArray"
  | "polarArray"
  | "gridArray"
  | "sineWave"
  | "cosineWave"
  | "sawtoothWave"
  | "triangleWave"
  | "squareWave"
  | "pipeSweep"
  | "pipeMerge";

export const SUPPORTED_WORKFLOW_NODE_TYPES: NodeType[] = [
  "geometryReference",
  "text",
  "group",
  "panel",
  "textNote",
  "slider",
  "colorPicker",
  "customMaterial",
  "geometryViewer",
  "customViewer",
  "customPreview",
  "previewFilter",
  "mesh",
  "meshConvert",
  "nurbsToMesh",
  "brepToMesh",
  "meshToBrep",
  "subdivideMesh",
  "dualMesh",
  "insetFaces",
  "extrudeFaces",
  "meshRelax",
  "selectFaces",
  "meshBoolean",
  "triangulateMesh",
  "geodesicSphere",
  "voronoiPattern",
  "hexagonalTiling",
  "offsetPattern",
  "meshRepair",
  "meshUVs",
  "meshDecimate",
  "quadRemesh",
  "stlExport",
  "stlImport",
  "point",
  "pointCloud",
  "line",
  "rectangle",
  "circle",
  "arc",
  "curve",
  "polyline",
  "surface",
  "loft",
  "extrude",
  "primitive",
  "cylinder",
  "torus",
  "pyramid",
  "tetrahedron",
  "octahedron",
  "icosahedron",
  "dodecahedron",
  "hemisphere",
  "capsule",
  "disk",
  "ring",
  "triangular-prism",
  "pentagonal-prism",
  "hexagonal-prism",
  "torus-knot",
  "utah-teapot",
  "frustum",
  "mobius-strip",
  "ellipsoid",
  "wedge",
  "spherical-cap",
  "bipyramid",
  "rhombic-dodecahedron",
  "truncated-cube",
  "truncated-octahedron",
  "truncated-icosahedron",
  "pipe",
  "superellipsoid",
  "hyperbolic-paraboloid",
  "geodesic-dome",
  "one-sheet-hyperboloid",
  "box",
  "sphere",
  "boolean",
  "offset",
  "fillet",
  "filletEdges",
  "offsetSurface",
  "thickenMesh",
  "plasticwrap",
  "solid",
  "measurement",
  "dimensions",
  "geometryArray",
  "rotate",
  "scale",
  "fieldTransformation",
  "voxelizeGeometry",
  "extractIsosurface",
  "topologyOptimize",
  "topologySolver",
  "physicsSolver",
  "voxelSolver",
  "chemistrySolver",
  "stiffnessGoal",
  "volumeGoal",
  "loadGoal",
  "anchorGoal",
  "chemistryStiffnessGoal",
  "chemistryMassGoal",
  "chemistryBlendGoal",
  "chemistryTransparencyGoal",
  "chemistryThermalGoal",
  "chemistryMaterialGoal",
  "origin",
  "unitX",
  "unitY",
  "unitZ",
  "unitXYZ",
  "moveVector",
  "scaleVector",
  "number",
  "add",
  "subtract",
  "multiply",
  "divide",
  "clamp",
  "min",
  "max",
  "expression",
  "scalarFunctions",
  "toggleSwitch",
  "conditionalToggleButton",
  "conditional",
  "vectorConstruct",
  "vectorDeconstruct",
  "vectorAdd",
  "vectorSubtract",
  "vectorScale",
  "vectorLength",
  "vectorNormalize",
  "vectorDot",
  "vectorCross",
  "distance",
  "vectorFromPoints",
  "vectorAngle",
  "vectorLerp",
  "vectorProject",
  "pointAttractor",
  "move",
  "movePoint",
  "movePointByVector",
  "rotateVectorAxis",
  "mirrorVector",
  "proximity2d",
  "proximity3d",
  "curveProximity",
  "listCreate",
  "listLength",
  "listItem",
  "listIndexOf",
  "listPartition",
  "listFlatten",
  "listSlice",
  "listReverse",
  "listSum",
  "listAverage",
  "listMin",
  "listMax",
  "listMedian",
  "listStdDev",
  "geometryInfo",
  "metadataPanel",
  "annotations",
  "geometryVertices",
  "geometryEdges",
  "geometryFaces",
  "geometryNormals",
  "geometryControlPoints",
  "range",
  "linspace",
  "remap",
  "random",
  "repeat",
  "linearArray",
  "polarArray",
  "gridArray",
  "sineWave",
  "cosineWave",
  "sawtoothWave",
  "triangleWave",
  "squareWave",
  "pipeSweep",
  "pipeMerge",
];

export const isSupportedNodeType = (type: string | undefined): type is NodeType =>
  Boolean(type && (SUPPORTED_WORKFLOW_NODE_TYPES as string[]).includes(type));
