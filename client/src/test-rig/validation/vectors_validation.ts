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
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { x: 1, y: 2, z: 3 },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  ensure(result.vector.x === 1 && result.vector.y === 2 && result.vector.z === 3, "Expected vector 1,2,3");
};

const validateVectorDeconstruct = () => {
  const node = getNodeDefinition("vectorDeconstruct");
  ensure(node !== null, "Node definition not found");
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
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { a: { x: 1, y: 2, z: 3 }, b: { x: 4, y: 5, z: 6 } },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  ensure(result.vector.x === 5 && result.vector.y === 7 && result.vector.z === 9, "Expected vector 5,7,9");
};

const validateVectorSubtract = () => {
  const node = getNodeDefinition("vectorSubtract");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { a: { x: 5, y: 5, z: 5 }, b: { x: 1, y: 2, z: 3 } },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  ensure(result.vector.x === 4 && result.vector.y === 3 && result.vector.z === 2, "Expected vector 4,3,2");
};

const validateVectorLength = () => {
  const node = getNodeDefinition("vectorLength");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { vector: { x: 3, y: 4, z: 12 } },
    parameters: {},
    context,
  });

  ensure(approxEqual(result.length, 13), "Expected vector length 13");
};

const validateVectorNormalize = () => {
  const node = getNodeDefinition("vectorNormalize");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { vector: { x: 3, y: 4, z: 0 } },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  ensure(approxEqual(result.vector.x, 0.6), "Expected normalized x=0.6");
  ensure(approxEqual(result.vector.y, 0.8), "Expected normalized y=0.8");
  ensure(approxEqual(result.vector.z, 0), "Expected normalized z=0");
};

const validateVectorDot = () => {
  const node = getNodeDefinition("vectorDot");
  ensure(node !== null, "Node definition not found");
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
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { a: { x: 1, y: 0, z: 0 }, b: { x: 0, y: 1, z: 0 } },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  ensure(result.vector.x === 0 && result.vector.y === 0 && result.vector.z === 1, "Expected cross product (0,0,1)");
};

const validateDistance = () => {
  const node = getNodeDefinition("distance");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { a: { x: 0, y: 0, z: 0 }, b: { x: 0, y: 3, z: 4 } },
    parameters: {},
    context,
  });

  ensure(approxEqual(result.distance, 5), "Expected distance 5");
};

const validateVectorFromPoints = () => {
  const node = getNodeDefinition("vectorFromPoints");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { start: { x: 1, y: 1, z: 1 }, end: { x: 4, y: 1, z: 1 } },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  ensure(result.vector.x === 3 && result.vector.y === 0 && result.vector.z === 0, "Expected vector (3,0,0)");
  ensure(approxEqual(result.length, 3), "Expected length 3");
};

const validateVectorAngle = () => {
  const node = getNodeDefinition("vectorAngle");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { a: { x: 1, y: 0, z: 0 }, b: { x: 0, y: 1, z: 0 } },
    parameters: {},
    context,
  });

  ensure(approxEqual(result.angleDeg, 90), "Expected angle 90 deg");
  ensure(approxEqual(result.angleRad, Math.PI / 2), "Expected angle PI/2 rad");
};

const validateVectorLerp = () => {
  const node = getNodeDefinition("vectorLerp");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { a: { x: 0, y: 0, z: 0 }, b: { x: 10, y: 0, z: 0 }, t: 0.25 },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  ensure(approxEqual(result.vector.x, 2.5), "Expected lerp x=2.5");
  ensure(approxEqual(result.vector.y, 0), "Expected lerp y=0");
  ensure(approxEqual(result.vector.z, 0), "Expected lerp z=0");
  ensure(approxEqual(result.t, 0.25), "Expected t=0.25");
};

const validateVectorProject = () => {
  const node = getNodeDefinition("vectorProject");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { vector: { x: 2, y: 0, z: 0 }, onto: { x: 1, y: 0, z: 0 } },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  ensure(result.vector.x === 2 && result.vector.y === 0 && result.vector.z === 0, "Expected projection (2,0,0)");
  ensure(approxEqual(result.scale, 2), "Expected scale 2");
};

const validatePointAttractor = () => {
  const node = getNodeDefinition("pointAttractor");
  ensure(node !== null, "Node definition not found");
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
  ensure(approxEqual(result.distance, 5), "Expected distance 5");
  ensure(approxEqual(result.falloff, 0.5), "Expected falloff 0.5");
  ensure(approxEqual(result.strength, 2), "Expected strength 2");
  ensure(approxEqual(result.radius, 10), "Expected radius 10");
  ensure(approxEqual(result.vector.x, 0) && approxEqual(result.vector.y, 0) && approxEqual(result.vector.z, 1), "Expected vector (0,0,1)");
};

const validateMovePoint = () => {
  const node = getNodeDefinition("movePoint");
  ensure(node !== null, "Node definition not found");
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
  ensure(approxEqual(result.point.x, 3) && approxEqual(result.point.y, 1) && approxEqual(result.point.z, 1), "Expected moved point (3,1,1)");
  ensure(approxEqual(result.directionUnit.x, 1) && approxEqual(result.directionUnit.y, 0) && approxEqual(result.directionUnit.z, 0), "Expected direction unit (1,0,0)");
  ensure(approxEqual(result.distance, 2), "Expected distance 2");
};

const validateMovePointByVector = () => {
  const node = getNodeDefinition("movePointByVector");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { point: { x: 1, y: 1, z: 1 }, offset: { x: 2, y: 3, z: 4 } },
    parameters: {},
    context,
  });

  ensureVec3(result.point, "Expected point output");
  ensure(result.point.x === 3 && result.point.y === 4 && result.point.z === 5, "Expected moved point (3,4,5)");
};

const validateRotateVectorAxis = () => {
  const node = getNodeDefinition("rotateVectorAxis");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { vector: { x: 1, y: 0, z: 0 }, axis: { x: 0, y: 0, z: 1 }, angleDeg: 90 },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  ensure(approxEqual(result.vector.x, 0) && approxEqual(result.vector.y, 1) && approxEqual(result.vector.z, 0), "Expected rotated vector (0,1,0)");
  ensure(approxEqual(result.angleDeg, 90), "Expected angle 90");
};

const validateMirrorVector = () => {
  const node = getNodeDefinition("mirrorVector");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "euclidean", "Expected category euclidean");

  const context = createContext();
  const result = node.compute({
    inputs: { vector: { x: 1, y: 2, z: 3 }, normal: { x: 0, y: 1, z: 0 } },
    parameters: {},
    context,
  });

  ensureVec3(result.vector, "Expected vector output");
  ensure(result.vector.x === 1 && result.vector.y === -2 && result.vector.z === 3, "Expected mirrored vector (1,-2,3)");
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
