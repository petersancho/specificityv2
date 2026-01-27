export type NodeType =
  | "geometryReference"
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
  | "movePoint"
  | "movePointByVector"
  | "rotateVectorAxis"
  | "listCreate"
  | "listLength"
  | "listItem"
  | "listIndexOf"
  | "listPartition"
  | "listFlatten"
  | "listSlice"
  | "listReverse";

export const SUPPORTED_WORKFLOW_NODE_TYPES: NodeType[] = [
  "geometryReference",
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
  "movePoint",
  "movePointByVector",
  "rotateVectorAxis",
  "listCreate",
  "listLength",
  "listItem",
  "listIndexOf",
  "listPartition",
  "listFlatten",
  "listSlice",
  "listReverse",
];

export const isSupportedNodeType = (type: string | undefined): type is NodeType =>
  Boolean(type && (SUPPORTED_WORKFLOW_NODE_TYPES as string[]).includes(type));
