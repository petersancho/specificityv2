export type NodeType =
  | "geometryReference"
  | "geometryViewer"
  | "point"
  | "line"
  | "arc"
  | "curve"
  | "polyline"
  | "surface"
  | "box"
  | "sphere"
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
  | "sineWave"
  | "cosineWave"
  | "sawtoothWave"
  | "triangleWave"
  | "squareWave";

export const SUPPORTED_WORKFLOW_NODE_TYPES: NodeType[] = [
  "geometryReference",
  "geometryViewer",
  "point",
  "line",
  "arc",
  "curve",
  "polyline",
  "surface",
  "box",
  "sphere",
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
  "sineWave",
  "cosineWave",
  "sawtoothWave",
  "triangleWave",
  "squareWave",
];

export const isSupportedNodeType = (type: string | undefined): type is NodeType =>
  Boolean(type && (SUPPORTED_WORKFLOW_NODE_TYPES as string[]).includes(type));
