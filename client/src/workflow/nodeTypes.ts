export type NodeType =
  | "geometryReference"
  | "geometryViewer"
  | "meshConvert"
  | "stlExport"
  | "stlImport"
  | "point"
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
  | "biologicalSolver"
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
  | "squareWave";

export const SUPPORTED_WORKFLOW_NODE_TYPES: NodeType[] = [
  "geometryReference",
  "geometryViewer",
  "meshConvert",
  "stlExport",
  "stlImport",
  "point",
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
  "biologicalSolver",
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
];

export const isSupportedNodeType = (type: string | undefined): type is NodeType =>
  Boolean(type && (SUPPORTED_WORKFLOW_NODE_TYPES as string[]).includes(type));
