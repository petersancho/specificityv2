import { NODE_DEFINITIONS } from "../../workflow/nodeRegistry";
import { generateReport, logValidation, resetValidationLog } from "./validation-log";

const CATEGORY = "euclidean";

const createContext = () => ({
  nodeId: "validation",
  geometryById: new Map(),
  vertexById: new Map(),
});

const getNodeDefinition = (type: string): any => {
  const node = NODE_DEFINITIONS.find((entry) => entry.type === type);
  if (!node) {
    throw new Error(`Node definition not found: ${type}`);
  }
  return node;
};

const nowTimestamp = () => new Date().toISOString();

function ensure(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const approxEqual = (a: number, b: number, tolerance = 1e-6) =>
  Math.abs(a - b) <= tolerance;

const ensureVec3 = (value: unknown, message: string) => {
  const vec = value as { x?: number; y?: number; z?: number } | null;
  ensure(
    Boolean(vec) &&
      typeof vec?.x === "number" &&
      typeof vec?.y === "number" &&
      typeof vec?.z === "number",
    message
  );
};

const runNodeValidation = (nodeName: string, fn: () => void) => {
  try {
    fn();
    logValidation({
      category: CATEGORY,
      nodeName,
      status: "PASS",
      timestamp: nowTimestamp(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logValidation({
      category: CATEGORY,
      nodeName,
      status: "FAIL",
      error: message,
      timestamp: nowTimestamp(),
    });
  }
};

const validateVectorConstruct = () => {
  const node = getNodeDefinition("vectorConstruct");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { x: 1, y: 2, z: 3 },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  const vec = result.vector as { x: number; y: number; z: number };
  ensure(vec.x === 1 && vec.y === 2 && vec.z === 3, "Expected vector 1,2,3");
};

const validateVectorDeconstruct = () => {
  const node = getNodeDefinition("vectorDeconstruct");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { vector: { x: 7, y: 8, z: 9 } },
    parameters: {},
    context,
  });

  ensure(result.x === 7 && result.y === 8 && result.z === 9, "Expected x=7,y=8,z=9");
};

const validateVectorAdd = () => {
  const node = getNodeDefinition("vectorAdd");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { a: { x: 1, y: 2, z: 3 }, b: { x: 4, y: 5, z: 6 } },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  const vec = result.vector as { x: number; y: number; z: number };
  ensure(vec.x === 5 && vec.y === 7 && vec.z === 9, "Expected vector 5,7,9");
};

const validateVectorSubtract = () => {
  const node = getNodeDefinition("vectorSubtract");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { a: { x: 5, y: 5, z: 5 }, b: { x: 1, y: 2, z: 3 } },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  const vec = result.vector as { x: number; y: number; z: number };
  ensure(vec.x === 4 && vec.y === 3 && vec.z === 2, "Expected vector 4,3,2");
};

const validateVectorLength = () => {
  const node = getNodeDefinition("vectorLength");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { vector: { x: 3, y: 4, z: 12 } },
    parameters: {},
    context,
  });

  ensure(approxEqual(result.length as number, 13), "Expected vector length 13");
};

const validateVectorNormalize = () => {
  const node = getNodeDefinition("vectorNormalize");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { vector: { x: 3, y: 4, z: 0 } },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  const vec = result.vector as { x: number; y: number; z: number };
  ensure(approxEqual(vec.x, 0.6), "Expected normalized x=0.6");
  ensure(approxEqual(vec.y, 0.8), "Expected normalized y=0.8");
  ensure(approxEqual(vec.z, 0), "Expected normalized z=0");
};

const validateVectorDot = () => {
  const node = getNodeDefinition("vectorDot");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { a: { x: 1, y: 2, z: 3 }, b: { x: 4, y: 5, z: 6 } },
    parameters: {},
    context,
  });

  ensure(result.dot === 32, "Expected dot product 32");
};

const validateVectorCross = () => {
  const node = getNodeDefinition("vectorCross");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { a: { x: 1, y: 0, z: 0 }, b: { x: 0, y: 1, z: 0 } },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  const vec = result.vector as { x: number; y: number; z: number };
  ensure(vec.x === 0 && vec.y === 0 && vec.z === 1, "Expected cross product (0,0,1)");
};

const validateDistance = () => {
  const node = getNodeDefinition("distance");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { a: { x: 0, y: 0, z: 0 }, b: { x: 0, y: 3, z: 4 } },
    parameters: {},
    context,
  });

  ensure(approxEqual(result.distance as number, 5), "Expected distance 5");
};

const validateVectorFromPoints = () => {
  const node = getNodeDefinition("vectorFromPoints");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { start: { x: 1, y: 1, z: 1 }, end: { x: 4, y: 1, z: 1 } },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  const vec = result.vector as { x: number; y: number; z: number };
  ensure(vec.x === 3 && vec.y === 0 && vec.z === 0, "Expected vector (3,0,0)");
  ensure(approxEqual(result.length as number, 3), "Expected length 3");
};

const validateVectorAngle = () => {
  const node = getNodeDefinition("vectorAngle");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { a: { x: 1, y: 0, z: 0 }, b: { x: 0, y: 1, z: 0 } },
    parameters: {},
    context,
  });

  ensure(approxEqual(result.angleDeg as number, 90), "Expected angle 90 deg");
  ensure(approxEqual(result.angleRad as number, Math.PI / 2), "Expected angle PI/2 rad");
};

const validateVectorLerp = () => {
  const node = getNodeDefinition("vectorLerp");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { a: { x: 0, y: 0, z: 0 }, b: { x: 10, y: 0, z: 0 }, t: 0.25 },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  const vec = result.vector as { x: number; y: number; z: number };
  ensure(approxEqual(vec.x, 2.5), "Expected lerp x=2.5");
  ensure(approxEqual(vec.y, 0), "Expected lerp y=0");
  ensure(approxEqual(vec.z, 0), "Expected lerp z=0");
  ensure(approxEqual(result.t as number, 0.25), "Expected t=0.25");
};

const validateVectorProject = () => {
  const node = getNodeDefinition("vectorProject");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { vector: { x: 2, y: 0, z: 0 }, onto: { x: 1, y: 0, z: 0 } },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  const vec = result.vector as { x: number; y: number; z: number };
  ensure(vec.x === 2 && vec.y === 0 && vec.z === 0, "Expected projection (2,0,0)");
  ensure(approxEqual(result.scale as number, 2), "Expected scale 2");
};

const validatePointAttractor = () => {
  const node = getNodeDefinition("pointAttractor");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: {
      point: { x: 0, y: 0, z: 0 },
      attractor: { x: 0, y: 0, z: 5 },
      strength: 2,
      radius: 10,
    },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  const vec = result.vector as { x: number; y: number; z: number };
  ensure(approxEqual(result.distance as number, 5), "Expected distance 5");
  ensure(approxEqual(result.falloff as number, 0.5), "Expected falloff 0.5");
  ensure(approxEqual(result.strength as number, 2), "Expected strength 2");
  ensure(approxEqual(result.radius as number, 10), "Expected radius 10");
  ensure(approxEqual(vec.x, 0) && approxEqual(vec.y, 0) && approxEqual(vec.z, 1), "Expected vector (0,0,1)");
};

const validateMovePoint = () => {
  const node = getNodeDefinition("movePoint");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: {
      point: { x: 1, y: 1, z: 1 },
      direction: { x: 1, y: 0, z: 0 },
      distance: 2,
    },
    parameters: {},
    context,
  });

  ensureVec3(result.point, "Expected point output");
  ensureVec3(result.directionUnit, "Expected directionUnit output");
  const pt = result.point as { x: number; y: number; z: number };
  const dir = result.directionUnit as { x: number; y: number; z: number };
  ensure(approxEqual(pt.x, 3) && approxEqual(pt.y, 1) && approxEqual(pt.z, 1), "Expected moved point (3,1,1)");
  ensure(approxEqual(dir.x, 1) && approxEqual(dir.y, 0) && approxEqual(dir.z, 0), "Expected direction unit (1,0,0)");
  ensure(approxEqual(result.distance as number, 2), "Expected distance 2");
};

const validateMovePointByVector = () => {
  const node = getNodeDefinition("movePointByVector");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { point: { x: 1, y: 1, z: 1 }, offset: { x: 2, y: 3, z: 4 } },
    parameters: {},
    context,
  });

  ensureVec3(result.point, "Expected point output");
  const pt = result.point as { x: number; y: number; z: number };
  ensure(pt.x === 3 && pt.y === 4 && pt.z === 5, "Expected moved point (3,4,5)");
};

const validateRotateVectorAxis = () => {
  const node = getNodeDefinition("rotateVectorAxis");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { vector: { x: 1, y: 0, z: 0 }, axis: { x: 0, y: 0, z: 1 }, angleDeg: 90 },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  const vec = result.vector as { x: number; y: number; z: number };
  ensure(approxEqual(vec.x, 0) && approxEqual(vec.y, 1) && approxEqual(vec.z, 0), "Expected rotated vector (0,1,0)");
  ensure(approxEqual(result.angleDeg as number, 90), "Expected angle 90");
};

const validateMirrorVector = () => {
  const node = getNodeDefinition("mirrorVector");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { vector: { x: 1, y: 2, z: 3 }, normal: { x: 0, y: 1, z: 0 } },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  const vec = result.vector as { x: number; y: number; z: number };
  ensure(vec.x === 1 && vec.y === -2 && vec.z === 3, "Expected mirrored vector (1,-2,3)");
};

export const runVectorsValidation = () => {
  resetValidationLog();

  runNodeValidation("vectorConstruct", validateVectorConstruct);
  runNodeValidation("vectorDeconstruct", validateVectorDeconstruct);
  runNodeValidation("vectorAdd", validateVectorAdd);
  runNodeValidation("vectorSubtract", validateVectorSubtract);
  runNodeValidation("vectorLength", validateVectorLength);
  runNodeValidation("vectorNormalize", validateVectorNormalize);
  runNodeValidation("vectorDot", validateVectorDot);
  runNodeValidation("vectorCross", validateVectorCross);
  runNodeValidation("distance", validateDistance);
  runNodeValidation("vectorFromPoints", validateVectorFromPoints);
  runNodeValidation("vectorAngle", validateVectorAngle);
  runNodeValidation("vectorLerp", validateVectorLerp);
  runNodeValidation("vectorProject", validateVectorProject);
  runNodeValidation("pointAttractor", validatePointAttractor);
  runNodeValidation("movePoint", validateMovePoint);
  runNodeValidation("movePointByVector", validateMovePointByVector);
  runNodeValidation("rotateVectorAxis", validateRotateVectorAxis);
  runNodeValidation("mirrorVector", validateMirrorVector);

  return generateReport();
};
