import { NODE_DEFINITIONS } from "../../workflow/nodeRegistry";
import { generateReport, logValidation, resetValidationLog } from "./validation-log";

const CATEGORY = "math";

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

const validateSlider = () => {
  const node = getNodeDefinition("slider");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "math", "Expected category math");
  ensure((node.inputs as any[]).length === 0, "Expected 0 inputs");
  ensure((node.outputs as any[]).length === 1, "Expected 1 output");
  ensure((node.outputs as any[])[0].key === "value", "Expected output key value");

  const context = createContext();
  const result = node.compute({
    inputs: {},
    parameters: {
      value: 7,
      min: 0,
      max: 10,
      step: 1,
      snapMode: "step",
    },
    context,
  });

  ensure(result.value === 7, "Expected slider output to equal 7");
};

const validateNumber = () => {
  const node = getNodeDefinition("number");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "math", "Expected category math");
  ensure((node.inputs as any[]).length === 0, "Expected 0 inputs");
  ensure((node.outputs as any[]).length === 1, "Expected 1 output");
  ensure((node.outputs as any[])[0].key === "value", "Expected output key value");

  const context = createContext();
  const result = node.compute({
    inputs: {},
    parameters: { value: 3.5 },
    context,
  });

  ensure(result.value === 3.5, "Expected number output to equal 3.5");
};

const validateAdd = () => {
  const node = getNodeDefinition("add");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "math", "Expected category math");
  ensure((node.outputs as any[])[0].key === "result", "Expected output key result");

  const context = createContext();
  const result = node.compute({
    inputs: { a: 2, b: 3 },
    parameters: {},
    context,
  });

  ensure(result.result === 5, "Expected 2 + 3 = 5");
};

const validateSubtract = () => {
  const node = getNodeDefinition("subtract");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "math", "Expected category math");
  ensure((node.outputs as any[])[0].key === "result", "Expected output key result");

  const context = createContext();
  const result = node.compute({
    inputs: { a: 5, b: 3 },
    parameters: {},
    context,
  });

  ensure(result.result === 2, "Expected 5 - 3 = 2");
};

const validateMultiply = () => {
  const node = getNodeDefinition("multiply");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "math", "Expected category math");
  ensure((node.outputs as any[])[0].key === "result", "Expected output key result");

  const context = createContext();
  const result = node.compute({
    inputs: { a: 2, b: 4 },
    parameters: {},
    context,
  });

  ensure(result.result === 8, "Expected 2 * 4 = 8");
};

const validateDivide = () => {
  const node = getNodeDefinition("divide");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "math", "Expected category math");
  ensure((node.outputs as any[])[0].key === "result", "Expected output key result");

  const context = createContext();
  const result = node.compute({
    inputs: { a: 10, b: 2 },
    parameters: {},
    context,
  });

  ensure(result.result === 5, "Expected 10 / 2 = 5");
};

const validateClamp = () => {
  const node = getNodeDefinition("clamp");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "math", "Expected category math");
  ensure((node.outputs as any[])[0].key === "result", "Expected output key result");

  const context = createContext();
  const result = node.compute({
    inputs: { value: 10, min: 0, max: 4 },
    parameters: {},
    context,
  });

  ensure(result.result === 4, "Expected clamp result to equal 4");
};

const validateMin = () => {
  const node = getNodeDefinition("min");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "math", "Expected category math");
  ensure((node.outputs as any[])[0].key === "result", "Expected output key result");

  const context = createContext();
  const result = node.compute({
    inputs: { a: 2, b: 5 },
    parameters: {},
    context,
  });

  ensure(result.result === 2, "Expected min(2, 5) = 2");
};

const validateMax = () => {
  const node = getNodeDefinition("max");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "math", "Expected category math");
  ensure((node.outputs as any[])[0].key === "result", "Expected output key result");

  const context = createContext();
  const result = node.compute({
    inputs: { a: 2, b: 5 },
    parameters: {},
    context,
  });

  ensure(result.result === 5, "Expected max(2, 5) = 5");
};

const validateExpression = () => {
  const node = getNodeDefinition("expression");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "math", "Expected category math");
  ensure((node.outputs as any[])[0].key === "result", "Expected output key result");

  const context = createContext();
  const result = node.compute({
    inputs: { a: 3, b: 4 },
    parameters: { expression: "a + b * 2" },
    context,
  });

  ensure(result.result === 11, "Expected expression result to equal 11");
};

const validateScalarFunctions = () => {
  const node = getNodeDefinition("scalarFunctions");
  if (!node) throw new Error("Node definition not found");
  ensure(node.category === "math", "Expected category math");
  ensure((node.outputs as any[])[0].key === "result", "Expected output key result");

  const context = createContext();
  const result = node.compute({
    inputs: { value: 2, exponent: 3 },
    parameters: { function: "pow" },
    context,
  });

  ensure(result.result === 8, "Expected pow result to equal 8");
};

export const runMathValidation = () => {
  resetValidationLog();

  runNodeValidation("slider", validateSlider);
  runNodeValidation("number", validateNumber);
  runNodeValidation("add", validateAdd);
  runNodeValidation("subtract", validateSubtract);
  runNodeValidation("multiply", validateMultiply);
  runNodeValidation("divide", validateDivide);
  runNodeValidation("clamp", validateClamp);
  runNodeValidation("min", validateMin);
  runNodeValidation("max", validateMax);
  runNodeValidation("expression", validateExpression);
  runNodeValidation("scalarFunctions", validateScalarFunctions);

  return generateReport();
};
