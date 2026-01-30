import { NODE_DEFINITIONS } from "../../workflow/nodeRegistry";
import { generateReport, logValidation, resetValidationLog } from "./validation-log";

const CATEGORY = "curves";

const createContext = () => ({
  nodeId: "validation",
  geometryById: new Map(),
  vertexById: new Map(),
});

const getNodeDefinition = (type: string) =>
  NODE_DEFINITIONS.find((node) => node.type === type) ?? null;

const nowTimestamp = () => new Date().toISOString();

const ensure = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

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

const validateLine = () => {
  const node = getNodeDefinition("line");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "curves", "Expected category curves");

  const context = createContext();
  const result = node.compute({
    inputs: { start: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 3, z: 4 } },
    parameters: { geometryId: "line-geom" },
    context,
  });

  ensure(result.geometry === "line-geom", "Expected geometry output to match geometryId");
  ensure(Array.isArray(result.points), "Expected points array");
  ensure(result.points.length === 2, "Expected 2 points");
  ensureVec3(result.start, "Expected start vector");
  ensureVec3(result.end, "Expected end vector");
  ensure(approxEqual(result.length, 5), "Expected length 5");
};

const validateRectangle = () => {
  const node = getNodeDefinition("rectangle");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "curves", "Expected category curves");

  const context = createContext();
  const result = node.compute({
    inputs: { center: { x: 1, y: 2, z: 0 }, width: 4, height: 2 },
    parameters: { geometryId: "rect-geom" },
    context,
  });

  ensure(result.geometry === "rect-geom", "Expected geometry output to match geometryId");
  ensureVec3(result.center, "Expected center vector");
  ensure(result.width === 4 && result.height === 2, "Expected width 4 and height 2");
};

const validatePolyline = () => {
  const node = getNodeDefinition("polyline");
  ensure(node !== null, "Node definition not found");
  ensure(node.category === "curves", "Expected category curves");

  const context = createContext();
  const result = node.compute({
    inputs: {
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 1, y: 1, z: 0 },
      ],
      closed: true,
    },
    parameters: { geometryId: "poly-geom" },
    context,
  });

  ensure(result.geometry === "poly-geom", "Expected geometry output to match geometryId");
  ensure(Array.isArray(result.points), "Expected points array");
  ensure(result.points.length === 3, "Expected 3 points");
  ensure(result.closed === true, "Expected closed true");
};

export const runCurvesValidation = () => {
  resetValidationLog();

  runNodeValidation("line", validateLine);
  runNodeValidation("rectangle", validateRectangle);
  runNodeValidation("polyline", validatePolyline);

  return generateReport();
};
