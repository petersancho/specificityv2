import { NODE_DEFINITIONS } from "../../workflow/nodeRegistry";
import { generateReport, logValidation, resetValidationLog } from "./validation-log";

const CATEGORY = "data";

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

const validateGeometryReference = () => {
  const node = getNodeDefinition("geometryReference");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "data", "Expected category data");
  ensure((node.inputs as any[]).length === 0, "Expected 0 inputs");
  ensure((node.outputs as any[]).length === 1, "Expected 1 output");
  ensure((node.outputs as any[])[0].key === "geometry", "Expected output key geometry");

  const context = createContext();
  const result = node.compute({
    inputs: {},
    parameters: { geometryId: "geom-1" },
    context,
  });

  ensure(result.geometry === "geom-1", "Expected geometry output to match geometryId");
};

const validateText = () => {
  const node = getNodeDefinition("text");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "data", "Expected category data");
  ensure((node.inputs as any[]).length === 0, "Expected 0 inputs");
  ensure((node.outputs as any[]).length === 0, "Expected 0 outputs");

  const context = createContext();
  const result = node.compute({
    inputs: {},
    parameters: { text: "Hello Lingua", size: 24 },
    context,
  });

  ensure(result && typeof result === "object", "Expected compute result to be an object");
};

const validateGroup = () => {
  const node = getNodeDefinition("group");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "data", "Expected category data");
  ensure((node.inputs as any[]).length === 0, "Expected 0 inputs");
  ensure((node.outputs as any[]).length === 0, "Expected 0 outputs");

  const context = createContext();
  const result = node.compute({
    inputs: {},
    parameters: { title: "Group", color: "#ffffff" },
    context,
  });

  ensure(result && typeof result === "object", "Expected compute result to be an object");
};

const validatePanel = () => {
  const node = getNodeDefinition("panel");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "data", "Expected category data");
  ensure((node.inputs as any[]).length === 1, "Expected 1 input");
  ensure((node.outputs as any[]).length === 1, "Expected 1 output");
  ensure((node.outputs as any[])[0].key === "data", "Expected output key data");

  const context = createContext();
  const resultDirect = node.compute({
    inputs: { data: [1, 2, 3] },
    parameters: { text: "Fallback" },
    context,
  });
  const dataArr = resultDirect.data as any[];
  ensure(Array.isArray(dataArr), "Expected data array from direct input");
  ensure(dataArr.length === 3, "Expected 3 entries in data array");

  const resultFallback = node.compute({
    inputs: {},
    parameters: { text: "Fallback" },
    context,
  });
  ensure(resultFallback.data === "Fallback", "Expected fallback text when no input data");
};

const validateTextNote = () => {
  const node = getNodeDefinition("textNote");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "data", "Expected category data");
  ensure((node.inputs as any[]).length === 1, "Expected 1 input");
  ensure((node.outputs as any[]).length === 1, "Expected 1 output");
  ensure((node.outputs as any[])[0].key === "data", "Expected output key data");

  const context = createContext();
  const resultDirect = node.compute({
    inputs: { data: "Payload" },
    parameters: { text: "Note" },
    context,
  });
  ensure(resultDirect.data === "Payload", "Expected data passthrough");

  const resultFallback = node.compute({
    inputs: {},
    parameters: { text: "Note" },
    context,
  });
  ensure(resultFallback.data === "Note", "Expected fallback text when no input data");
};

const validateColorPicker = () => {
  const node = getNodeDefinition("colorPicker");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "data", "Expected category data");
  ensure((node.inputs as any[]).length === 0, "Expected 0 inputs");
  ensure((node.outputs as any[]).length === 2, "Expected 2 outputs");

  const context = createContext();
  const result = node.compute({
    inputs: {},
    parameters: { color: "#ff0000" },
    context,
  });

  ensure(result.hex === "#FF0000", "Expected hex output #FF0000");
  const color = result.color as any;
  ensure(color && typeof color === "object", "Expected vector color output");
  ensure(
    Number.isFinite(color.x) &&
      Number.isFinite(color.y) &&
      Number.isFinite(color.z),
    "Expected finite RGB values"
  );
};

const validateAnnotations = () => {
  const node = getNodeDefinition("annotations");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "data", "Expected category data");
  ensure((node.inputs as any[]).length === 4, "Expected 4 inputs");
  ensure((node.outputs as any[]).length === 5, "Expected 5 outputs");
  ensure((node.outputs as any[])[0].key === "annotation", "Expected output key annotation");

  const context = createContext();
  const result = node.compute({
    inputs: { geometry: "geom-1" },
    parameters: {
      anchorX: 1,
      anchorY: 2,
      anchorZ: 3,
      text: "Annotation",
      size: 2,
    },
    context,
  });

  ensure(result.geometry === "geom-1", "Expected geometry passthrough");
  ensure(result.text === "Annotation", "Expected text output");
  ensure(result.size === 2, "Expected size output");
  const anchor = result.anchor as any;
  ensure(anchor?.x === 1 && anchor?.y === 2 && anchor?.z === 3, "Expected anchor vector");
  ensure(Boolean(result.annotation) && typeof result.annotation === "object", "Expected annotation object");
};

export const runDataValidation = () => {
  resetValidationLog();

  runNodeValidation("geometryReference", validateGeometryReference);
  runNodeValidation("text", validateText);
  runNodeValidation("group", validateGroup);
  runNodeValidation("panel", validatePanel);
  runNodeValidation("textNote", validateTextNote);
  runNodeValidation("colorPicker", validateColorPicker);
  runNodeValidation("annotations", validateAnnotations);

  return generateReport();
};
