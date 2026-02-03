import { NODE_DEFINITIONS } from "../../workflow/nodeRegistry";
import { PRIMITIVE_NODE_TYPE_IDS } from "../../data/primitiveCatalog";
import { generateReport, logValidation, resetValidationLog } from "./validation-log";

const CATEGORY = "primitives";

const PRIMITIVE_PARAM_KEYS = [
  "size",
  "radius",
  "height",
  "tube",
  "innerRadius",
  "topRadius",
  "capHeight",
  "detail",
  "exponent1",
  "exponent2",
  "radialSegments",
  "tubularSegments",
];

const createContext = () => ({
  nodeId: "validation",
  geometryById: new Map(),
  vertexById: new Map(),
});

const getNodeDefinition = (type: string) =>
  NODE_DEFINITIONS.find((node) => node.type === type) ?? null;

const nowTimestamp = () => new Date().toISOString();

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const approxEqual = (a: number, b: number, tolerance = 1e-6) =>
  Math.abs(a - b) <= tolerance;

function ensureVec3(
  value: unknown,
  message: string
): asserts value is { x: number; y: number; z: number } {
  const vec = value as { x?: unknown; y?: unknown; z?: unknown } | null;
  ensure(
    vec !== null &&
      typeof vec === "object" &&
      typeof vec.x === "number" &&
      typeof vec.y === "number" &&
      typeof vec.z === "number",
    message
  );
}

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

const primitiveInputValues = {
  size: 2,
  radius: 0.75,
  height: 1.5,
  tube: 0.3,
  innerRadius: 0.25,
  topRadius: 0.4,
  capHeight: 0.5,
  detail: 2,
  exponent1: 1.4,
  exponent2: 2.2,
  radialSegments: 18,
  tubularSegments: 24,
};

const validatePoint = () => {
  const node = getNodeDefinition("point");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "primitives", "Expected category primitives");

  const context = createContext();
  const result = node.compute({
    inputs: { x: 1, y: 2, z: 3 },
    parameters: { geometryId: "point-geom" },
    context,
  });

  ensure(result.geometry === "point-geom", "Expected geometry output to match geometryId");
  ensureVec3(result.position, "Expected position vector");
  ensure(result.x === 1 && result.y === 2 && result.z === 3, "Expected XYZ outputs to match inputs");
  ensure(result.position.x === 1 && result.position.y === 2 && result.position.z === 3, "Expected position to match XYZ");
};

const validatePointCloud = () => {
  const node = getNodeDefinition("pointCloud");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "primitives", "Expected category primitives");

  const context = createContext();
  const result = node.compute({
    inputs: { points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 2, z: 3 }] },
    parameters: { geometryIds: ["pc-1", "pc-2"], maxPoints: 10, pointsText: "" },
    context,
  });

  ensure(result.geometry === "pc-1", "Expected geometry to be first geometryId");
  ensure(Array.isArray(result.geometryList), "Expected geometryList array");
  ensure(result.geometryList.length === 2, "Expected geometryList length 2");
  ensure(Array.isArray(result.points), "Expected points array");
  ensure(result.points.length === 2, "Expected points length 2");
  ensure(result.count === 2, "Expected count 2");
};

const validatePrimitiveGeneric = () => {
  const node = getNodeDefinition("primitive");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "primitives", "Expected category primitives");

  const context = createContext();
  const result = node.compute({
    inputs: { kind: "cylinder", ...primitiveInputValues },
    parameters: { geometryId: "primitive-geom", representation: "mesh" },
    context,
  });

  ensure(result.geometry === "primitive-geom", "Expected geometry output to match geometryId");
  ensure(result.kind === "cylinder", "Expected kind output to match input");
  ensure(result.representation === "mesh", "Expected representation mesh");
  ensure(typeof result.params === "object" && result.params !== null, "Expected params object");
  const params = result.params as Record<string, unknown>;
  PRIMITIVE_PARAM_KEYS.forEach((key) => {
    ensure(typeof params[key] === "number", `Expected params.${key} to be number`);
  });
};

const validateBox = () => {
  const node = getNodeDefinition("box");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "primitives", "Expected category primitives");

  const context = createContext();
  const result = node.compute({
    inputs: {
      anchor: { x: 0, y: 0, z: 0 },
      width: 2,
      height: 3,
      depth: 4,
      centerMode: true,
    },
    parameters: { geometryId: "box-geom", representation: "mesh" },
    context,
  });

  ensure(result.geometry === "box-geom", "Expected geometry output to match geometryId");
  ensureVec3(result.anchor, "Expected anchor vector");
  ensure(result.width === 2 && result.height === 3 && result.depth === 4, "Expected dimensions to match inputs");
  ensure(result.centerMode === true, "Expected centerMode true");
  ensure(
    typeof result.volume === "number" && approxEqual(result.volume, 24),
    "Expected volume 24"
  );
  ensure(result.representation === "mesh", "Expected representation mesh");
};

const validateSphere = () => {
  const node = getNodeDefinition("sphere");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "primitives", "Expected category primitives");

  const context = createContext();
  const result = node.compute({
    inputs: { center: { x: 1, y: 2, z: 3 }, radius: 2 },
    parameters: { geometryId: "sphere-geom", representation: "mesh" },
    context,
  });

  const expectedVolume = (4 / 3) * Math.PI * Math.pow(2, 3);
  ensure(result.geometry === "sphere-geom", "Expected geometry output to match geometryId");
  ensureVec3(result.center, "Expected center vector");
  ensure(result.radius === 2, "Expected radius 2");
  ensure(
    typeof result.volume === "number" && approxEqual(result.volume, expectedVolume),
    "Expected volume to match radius"
  );
  ensure(result.representation === "mesh", "Expected representation mesh");
};

const validateCatalogPrimitive = (nodeType: string) => {
  const node = getNodeDefinition(nodeType);
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "primitives", "Expected category primitives");

  const context = createContext();
  const result = node.compute({
    inputs: { ...primitiveInputValues },
    parameters: { geometryId: `${nodeType}-geom`, representation: "mesh" },
    context,
  });

  ensure(result.geometry === `${nodeType}-geom`, "Expected geometry output to match geometryId");
  ensure(result.representation === "mesh", "Expected representation mesh");
  ensure(typeof result.params === "object" && result.params !== null, "Expected params object");
  const params = result.params as Record<string, unknown>;
  PRIMITIVE_PARAM_KEYS.forEach((key) => {
    ensure(typeof params[key] === "number", `Expected params.${key} to be number`);
  });
};

export const runPrimitivesValidation = () => {
  resetValidationLog();

  runNodeValidation("point", validatePoint);
  runNodeValidation("pointCloud", validatePointCloud);
  runNodeValidation("primitive", validatePrimitiveGeneric);
  runNodeValidation("box", validateBox);
  runNodeValidation("sphere", validateSphere);

  PRIMITIVE_NODE_TYPE_IDS.forEach((nodeType) => {
    runNodeValidation(nodeType, () => validateCatalogPrimitive(nodeType));
  });

  return generateReport();
};
