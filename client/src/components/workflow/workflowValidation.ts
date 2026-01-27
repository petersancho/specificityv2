import type { Geometry, Vec3, WorkflowNodeData } from "../../types";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isValidVec3 = (point?: Vec3) =>
  Boolean(point) &&
  isFiniteNumber(point?.x) &&
  isFiniteNumber(point?.y) &&
  isFiniteNumber(point?.z);

const parsePointsText = (input?: string): Vec3[] => {
  if (!input) return [];
  const numbers = input
    .split(/[\s,]+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (numbers.length < 2) return [];
  const groupSize = numbers.length % 3 === 0 ? 3 : 2;
  const points: Vec3[] = [];
  for (let i = 0; i + groupSize - 1 < numbers.length; i += groupSize) {
    if (groupSize === 3) {
      points.push({ x: numbers[i], y: numbers[i + 1], z: numbers[i + 2] });
    } else {
      points.push({ x: numbers[i], y: 0, z: numbers[i + 1] });
    }
  }
  return points;
};

const hasParameter = (parameters: Record<string, unknown> | undefined, key: string) =>
  Boolean(parameters && Object.prototype.hasOwnProperty.call(parameters, key));

const parseFiniteNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const isInvalidNumberParameter = (
  parameters: Record<string, unknown> | undefined,
  key: string
) => {
  if (!hasParameter(parameters, key)) return false;
  return parseFiniteNumber(parameters?.[key]) == null;
};

const isInvalidVectorParameters = (
  parameters: Record<string, unknown> | undefined,
  prefix: string
) =>
  isInvalidNumberParameter(parameters, `${prefix}X`) ||
  isInvalidNumberParameter(parameters, `${prefix}Y`) ||
  isInvalidNumberParameter(parameters, `${prefix}Z`);

const CONDITIONAL_MODES = new Set([
  "boolean",
  "greaterThan",
  "lessThan",
  "equal",
  "notEqual",
]);

export const isWorkflowNodeInvalid = (
  nodeType: string | undefined,
  data?: WorkflowNodeData,
  geometry?: Geometry[]
) => {
  if (!nodeType) return false;
  const safeData = data ?? { label: nodeType };
  if (safeData.evaluationError) return true;

  switch (nodeType) {
    case "geometryReference": {
      const geometryId = safeData.geometryId;
      if (!geometryId) return true;
      if (!geometry) return false;
      return !geometry.some((item) => item.id === geometryId);
    }
    case "point":
      return !isValidVec3(safeData.point);
    case "line":
      return parsePointsText(safeData.pointsText).length < 2;
    case "arc":
      return parsePointsText(safeData.pointsText).length < 3;
    case "curve":
      return parsePointsText(safeData.pointsText).length < 2;
    case "polyline":
      return parsePointsText(safeData.pointsText).length < 2;
    case "surface":
      return parsePointsText(safeData.pointsText).length < 3;
    case "box": {
      const dims = safeData.boxDimensions;
      if (!dims) return true;
      return (
        !isFiniteNumber(dims.width) ||
        dims.width <= 0 ||
        !isFiniteNumber(dims.height) ||
        dims.height <= 0 ||
        !isFiniteNumber(dims.depth) ||
        dims.depth <= 0
      );
    }
    case "sphere": {
      const radius = safeData.sphereRadius;
      return !isFiniteNumber(radius) || radius <= 0;
    }
    case "topologyOptimize": {
      const parameters = safeData.parameters;
      const volumeFraction =
        safeData.topologySettings?.volumeFraction ??
        parseFiniteNumber(parameters?.volumeFraction) ??
        0.4;
      const penaltyExponent =
        safeData.topologySettings?.penaltyExponent ??
        parseFiniteNumber(parameters?.penaltyExponent) ??
        3;
      const filterRadius =
        safeData.topologySettings?.filterRadius ??
        parseFiniteNumber(parameters?.filterRadius) ??
        1.5;
      const maxIterations =
        safeData.topologySettings?.maxIterations ??
        parseFiniteNumber(parameters?.maxIterations) ??
        80;
      const convergenceTolerance =
        safeData.topologySettings?.convergenceTolerance ??
        parseFiniteNumber(parameters?.convergenceTolerance) ??
        0.001;

      if (!Number.isFinite(volumeFraction) || volumeFraction <= 0 || volumeFraction > 1) {
        return true;
      }
      if (!Number.isFinite(penaltyExponent) || penaltyExponent <= 0) {
        return true;
      }
      if (!Number.isFinite(filterRadius) || filterRadius < 0) {
        return true;
      }
      if (!Number.isFinite(maxIterations) || maxIterations <= 0) {
        return true;
      }
      if (!Number.isFinite(convergenceTolerance) || convergenceTolerance <= 0) {
        return true;
      }
      return false;
    }
    case "topologySolver": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (
        isInvalidNumberParameter(parameters, "volumeFraction") ||
        isInvalidNumberParameter(parameters, "penaltyExponent") ||
        isInvalidNumberParameter(parameters, "filterRadius") ||
        isInvalidNumberParameter(parameters, "iterations") ||
        isInvalidNumberParameter(parameters, "resolution")
      ) {
        return true;
      }
      const volumeFraction = parseFiniteNumber(parameters.volumeFraction) ?? 0.4;
      const penaltyExponent = parseFiniteNumber(parameters.penaltyExponent) ?? 3;
      const filterRadius = parseFiniteNumber(parameters.filterRadius) ?? 2;
      const iterations = parseFiniteNumber(parameters.iterations) ?? 40;
      const resolution = parseFiniteNumber(parameters.resolution) ?? 12;
      if (volumeFraction <= 0 || volumeFraction > 1) return true;
      if (penaltyExponent <= 0) return true;
      if (filterRadius < 0) return true;
      if (iterations <= 0) return true;
      if (resolution <= 0) return true;
      return false;
    }
    case "biologicalSolver": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (
        isInvalidNumberParameter(parameters, "fitnessBias") ||
        isInvalidNumberParameter(parameters, "populationSize") ||
        isInvalidNumberParameter(parameters, "generations") ||
        isInvalidNumberParameter(parameters, "mutationRate") ||
        isInvalidNumberParameter(parameters, "seed")
      ) {
        return true;
      }
      const populationSize = parseFiniteNumber(parameters.populationSize) ?? 32;
      const generations = parseFiniteNumber(parameters.generations) ?? 24;
      const mutationRate = parseFiniteNumber(parameters.mutationRate) ?? 0.18;
      if (populationSize <= 0) return true;
      if (generations <= 0) return true;
      if (mutationRate <= 0 || mutationRate > 1) return true;
      return false;
    }
    case "listItem":
      return isInvalidNumberParameter(safeData.parameters, "index");
    case "listPartition": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (
        isInvalidNumberParameter(parameters, "size") ||
        isInvalidNumberParameter(parameters, "step")
      ) {
        return true;
      }
      const size = parseFiniteNumber(parameters.size) ?? 3;
      const step = parseFiniteNumber(parameters.step) ?? size;
      return size <= 0 || step <= 0;
    }
    case "listFlatten": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (isInvalidNumberParameter(parameters, "depth")) return true;
      const depth = parseFiniteNumber(parameters.depth) ?? 1;
      return depth <= 0;
    }
    case "listSlice": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (
        isInvalidNumberParameter(parameters, "start") ||
        isInvalidNumberParameter(parameters, "end") ||
        isInvalidNumberParameter(parameters, "step")
      ) {
        return true;
      }
      const step = parseFiniteNumber(parameters.step) ?? 1;
      return step <= 0;
    }
    case "number":
      return isInvalidNumberParameter(safeData.parameters, "value");
    case "add":
    case "subtract":
    case "multiply":
    case "divide":
    case "min":
    case "max":
      return (
        isInvalidNumberParameter(safeData.parameters, "a") ||
        isInvalidNumberParameter(safeData.parameters, "b")
      );
    case "clamp": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (
        isInvalidNumberParameter(parameters, "value") ||
        isInvalidNumberParameter(parameters, "min") ||
        isInvalidNumberParameter(parameters, "max")
      ) {
        return true;
      }
      const min = hasParameter(parameters, "min")
        ? parseFiniteNumber(parameters.min)
        : null;
      const max = hasParameter(parameters, "max")
        ? parseFiniteNumber(parameters.max)
        : null;
      return min != null && max != null ? min > max : false;
    }
    case "expression": {
      const expression = safeData.parameters?.expression;
      return typeof expression === "string" ? expression.trim().length === 0 : false;
    }
    case "conditional": {
      const mode = safeData.parameters?.mode;
      return typeof mode === "string" ? !CONDITIONAL_MODES.has(mode) : false;
    }
    case "vectorConstruct":
      return (
        isInvalidNumberParameter(safeData.parameters, "x") ||
        isInvalidNumberParameter(safeData.parameters, "y") ||
        isInvalidNumberParameter(safeData.parameters, "z")
      );
    case "vectorFromPoints":
      return (
        isInvalidVectorParameters(safeData.parameters, "start") ||
        isInvalidVectorParameters(safeData.parameters, "end")
      );
    case "vectorDeconstruct":
    case "vectorLength":
    case "vectorNormalize":
      return isInvalidVectorParameters(safeData.parameters, "vector");
    case "vectorProject":
      return (
        isInvalidVectorParameters(safeData.parameters, "vector") ||
        isInvalidVectorParameters(safeData.parameters, "onto")
      );
    case "vectorScale":
      return (
        isInvalidVectorParameters(safeData.parameters, "vector") ||
        isInvalidNumberParameter(safeData.parameters, "scale")
      );
    case "vectorLerp":
      return (
        isInvalidVectorParameters(safeData.parameters, "a") ||
        isInvalidVectorParameters(safeData.parameters, "b") ||
        isInvalidNumberParameter(safeData.parameters, "t")
      );
    case "vectorAdd":
    case "vectorSubtract":
    case "vectorDot":
    case "vectorCross":
    case "vectorAngle":
    case "distance":
      return (
        isInvalidVectorParameters(safeData.parameters, "a") ||
        isInvalidVectorParameters(safeData.parameters, "b")
      );
    case "movePoint":
      return (
        isInvalidVectorParameters(safeData.parameters, "point") ||
        isInvalidVectorParameters(safeData.parameters, "direction") ||
        isInvalidNumberParameter(safeData.parameters, "distance")
      );
    case "movePointByVector":
      return (
        isInvalidVectorParameters(safeData.parameters, "point") ||
        isInvalidVectorParameters(safeData.parameters, "offset")
      );
    case "rotateVectorAxis":
      return (
        isInvalidVectorParameters(safeData.parameters, "vector") ||
        isInvalidVectorParameters(safeData.parameters, "axis") ||
        isInvalidNumberParameter(safeData.parameters, "angleDeg")
      );
    default:
      return false;
  }
};
