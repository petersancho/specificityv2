import type { Geometry, Vec3, WorkflowNodeData } from "../../types";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isValidVec3 = (point?: Vec3) =>
  Boolean(point) &&
  isFiniteNumber(point?.x) &&
  isFiniteNumber(point?.y) &&
  isFiniteNumber(point?.z);

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
    case "point": {
      const position = safeData.outputs?.position as Vec3 | undefined;
      return !isValidVec3(position ?? safeData.point);
    }
    case "pointCloud": {
      const points = safeData.outputs?.points;
      return !Array.isArray(points) || points.length === 0;
    }
    case "line": {
      const points = safeData.outputs?.points;
      return !Array.isArray(points) || points.length < 2;
    }
    case "arc": {
      const points = safeData.outputs?.points;
      return !Array.isArray(points) || points.length < 3;
    }
    case "curve": {
      const points = safeData.outputs?.points;
      return !Array.isArray(points) || points.length < 2;
    }
    case "polyline": {
      const points = safeData.outputs?.points;
      return !Array.isArray(points) || points.length < 2;
    }
    case "surface": {
      const points = safeData.outputs?.points;
      return !Array.isArray(points) || points.length < 3;
    }
    case "rectangle": {
      const width = parseFiniteNumber(safeData.outputs?.width ?? safeData.parameters?.width) ?? 0;
      const height = parseFiniteNumber(safeData.outputs?.height ?? safeData.parameters?.height) ?? 0;
      return width <= 0 || height <= 0;
    }
    case "circle": {
      const radius = parseFiniteNumber(safeData.outputs?.radius ?? safeData.parameters?.radius) ?? 0;
      const segments = parseFiniteNumber(safeData.outputs?.segments ?? safeData.parameters?.segments) ?? 0;
      return radius <= 0 || segments < 8;
    }
    case "box": {
      const width = parseFiniteNumber(safeData.outputs?.width ?? safeData.parameters?.boxWidth) ?? safeData.boxDimensions?.width ?? 0;
      const height = parseFiniteNumber(safeData.outputs?.height ?? safeData.parameters?.boxHeight) ?? safeData.boxDimensions?.height ?? 0;
      const depth = parseFiniteNumber(safeData.outputs?.depth ?? safeData.parameters?.boxDepth) ?? safeData.boxDimensions?.depth ?? 0;
      return width <= 0 || height <= 0 || depth <= 0;
    }
    case "sphere": {
      const radius =
        parseFiniteNumber(safeData.outputs?.radius ?? safeData.parameters?.sphereRadius) ??
        safeData.sphereRadius ??
        0;
      return radius <= 0;
    }
    case "meshConvert": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      return (
        isInvalidNumberParameter(parameters, "distance") ||
        isInvalidNumberParameter(parameters, "radius") ||
        isInvalidVectorParameters(parameters, "direction")
      );
    }
    case "stlExport": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      return isInvalidNumberParameter(parameters, "scale");
    }
    case "stlImport": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      return isInvalidNumberParameter(parameters, "scale");
    }
    case "move": {
      const geometryId =
        typeof safeData.outputs?.geometry === "string"
          ? safeData.outputs.geometry
          : safeData.geometryId;
      if (!geometryId) return true;
      const parameters = safeData.parameters;
      return (
        isInvalidNumberParameter(parameters, "worldX") ||
        isInvalidNumberParameter(parameters, "worldY") ||
        isInvalidNumberParameter(parameters, "worldZ")
      );
    }
    case "rotate": {
      const geometryId =
        typeof safeData.outputs?.geometry === "string"
          ? safeData.outputs.geometry
          : safeData.geometryId;
      if (!geometryId) return true;
      const parameters = safeData.parameters;
      return (
        isInvalidVectorParameters(parameters, "axis") ||
        isInvalidVectorParameters(parameters, "pivot") ||
        isInvalidNumberParameter(parameters, "angle")
      );
    }
    case "scale": {
      const geometryId =
        typeof safeData.outputs?.geometry === "string"
          ? safeData.outputs.geometry
          : safeData.geometryId;
      if (!geometryId) return true;
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (
        isInvalidVectorParameters(parameters, "scale") ||
        isInvalidVectorParameters(parameters, "pivot")
      ) {
        return true;
      }
      const sx = parseFiniteNumber(parameters.scaleX) ?? 1;
      const sy = parseFiniteNumber(parameters.scaleY) ?? 1;
      const sz = parseFiniteNumber(parameters.scaleZ) ?? 1;
      return sx === 0 || sy === 0 || sz === 0;
    }
    case "customMaterial": {
      const geometryId =
        typeof safeData.outputs?.geometry === "string"
          ? safeData.outputs.geometry
          : safeData.geometryId;
      return !geometryId;
    }
    case "loft": {
      const geometryId =
        typeof safeData.outputs?.geometry === "string"
          ? safeData.outputs.geometry
          : safeData.geometryId;
      if (!geometryId) return true;
      return false;
    }
    case "extrude": {
      const geometryId =
        typeof safeData.outputs?.geometry === "string"
          ? safeData.outputs.geometry
          : safeData.geometryId;
      if (!geometryId) return true;
      const parameters = safeData.parameters;
      if (!parameters) return false;
      return isInvalidNumberParameter(parameters, "distance") ||
        isInvalidVectorParameters(parameters, "direction");
    }
    case "offset": {
      const geometryId =
        typeof safeData.outputs?.geometry === "string"
          ? safeData.outputs.geometry
          : safeData.geometryId;
      if (!geometryId) return true;
      const parameters = safeData.parameters;
      if (!parameters) return false;
      return (
        isInvalidNumberParameter(parameters, "distance") ||
        isInvalidNumberParameter(parameters, "samples")
      );
    }
    case "offsetSurface": {
      const geometryId =
        typeof safeData.outputs?.geometry === "string"
          ? safeData.outputs.geometry
          : safeData.geometryId;
      if (!geometryId) return true;
      const parameters = safeData.parameters;
      if (!parameters) return false;
      return isInvalidNumberParameter(parameters, "distance");
    }
    case "fillet": {
      const geometryId =
        typeof safeData.outputs?.geometry === "string"
          ? safeData.outputs.geometry
          : safeData.geometryId;
      if (!geometryId) return true;
      const parameters = safeData.parameters;
      if (!parameters) return false;
      return (
        isInvalidNumberParameter(parameters, "radius") ||
        isInvalidNumberParameter(parameters, "segments")
      );
    }
    case "filletEdges": {
      const geometryId =
        typeof safeData.outputs?.geometry === "string"
          ? safeData.outputs.geometry
          : safeData.geometryId;
      if (!geometryId) return true;
      const parameters = safeData.parameters;
      if (!parameters) return false;
      return (
        isInvalidNumberParameter(parameters, "radius") ||
        isInvalidNumberParameter(parameters, "segments")
      );
    }
    case "thickenMesh": {
      const geometryId =
        typeof safeData.outputs?.geometry === "string"
          ? safeData.outputs.geometry
          : safeData.geometryId;
      if (!geometryId) return true;
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (isInvalidNumberParameter(parameters, "thickness")) return true;
      const sides = String(parameters.sides ?? "both");
      return !["both", "outward", "inward"].includes(sides);
    }
    case "plasticwrap": {
      const geometryId =
        typeof safeData.outputs?.geometry === "string"
          ? safeData.outputs.geometry
          : safeData.geometryId;
      const targetId =
        typeof safeData.outputs?.target === "string"
          ? safeData.outputs.target
          : null;
      if (!geometryId || !targetId) return true;
      const parameters = safeData.parameters;
      if (!parameters) return false;
      return (
        isInvalidNumberParameter(parameters, "distance") ||
        isInvalidNumberParameter(parameters, "smooth")
      );
    }
    case "solid": {
      const geometryId =
        typeof safeData.outputs?.geometry === "string"
          ? safeData.outputs.geometry
          : safeData.geometryId;
      if (!geometryId) return true;
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (isInvalidNumberParameter(parameters, "tolerance")) return true;
      const capMode = String(parameters.capMode ?? "auto");
      return !["auto", "planar", "triangulate"].includes(capMode);
    }
    case "fieldTransformation": {
      const geometryId =
        typeof safeData.outputs?.geometry === "string"
          ? safeData.outputs.geometry
          : safeData.geometryId;
      if (!geometryId) return true;
      const parameters = safeData.parameters;
      if (!parameters) return false;
      return (
        isInvalidNumberParameter(parameters, "strength") ||
        isInvalidNumberParameter(parameters, "falloff")
      );
    }
    case "boolean": {
      const geometryId =
        typeof safeData.outputs?.geometry === "string"
          ? safeData.outputs.geometry
          : safeData.geometryId;
      if (!geometryId) return true;
      const op = String(safeData.parameters?.operation ?? "union");
      return !["union", "difference", "intersection"].includes(op);
    }
    case "measurement": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      const property = String(parameters.property ?? "length");
      return ![
        "length",
        "area",
        "volume",
        "boundsX",
        "boundsY",
        "boundsZ",
      ].includes(property);
    }
    case "geometryArray": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (
        isInvalidNumberParameter(parameters, "spacing") ||
        isInvalidNumberParameter(parameters, "count") ||
        isInvalidNumberParameter(parameters, "xSpacing") ||
        isInvalidNumberParameter(parameters, "ySpacing") ||
        isInvalidNumberParameter(parameters, "xCount") ||
        isInvalidNumberParameter(parameters, "yCount")
      ) {
        return true;
      }
      const count = parseFiniteNumber(parameters.count) ?? 1;
      const xCount = parseFiniteNumber(parameters.xCount) ?? 1;
      const yCount = parseFiniteNumber(parameters.yCount) ?? 1;
      return count < 1 || xCount < 1 || yCount < 1;
    }
    case "voxelizeGeometry": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (
        isInvalidNumberParameter(parameters, "resolution") ||
        isInvalidNumberParameter(parameters, "padding") ||
        isInvalidNumberParameter(parameters, "thickness")
      ) {
        return true;
      }
      const resolution = parseFiniteNumber(parameters.resolution) ?? 12;
      if (resolution <= 0) return true;
      return false;
    }
    case "extractIsosurface": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (isInvalidNumberParameter(parameters, "isoValue")) {
        return true;
      }
      const isoValue = parseFiniteNumber(parameters.isoValue) ?? 0.5;
      if (isoValue < 0 || isoValue > 1) return true;
      return false;
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
    case "biologicalEvolutionSolver":
      return false;
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
    case "range": {
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
      return step === 0;
    }
    case "linspace": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (
        isInvalidNumberParameter(parameters, "start") ||
        isInvalidNumberParameter(parameters, "end") ||
        isInvalidNumberParameter(parameters, "count")
      ) {
        return true;
      }
      const count = parseFiniteNumber(parameters.count) ?? 2;
      return count <= 0;
    }
    case "remap": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (
        isInvalidNumberParameter(parameters, "value") ||
        isInvalidNumberParameter(parameters, "sourceMin") ||
        isInvalidNumberParameter(parameters, "sourceMax") ||
        isInvalidNumberParameter(parameters, "targetMin") ||
        isInvalidNumberParameter(parameters, "targetMax")
      ) {
        return true;
      }
      const sourceMin = parseFiniteNumber(parameters.sourceMin) ?? 0;
      const sourceMax = parseFiniteNumber(parameters.sourceMax) ?? 1;
      return sourceMin === sourceMax;
    }
    case "random": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (
        isInvalidNumberParameter(parameters, "seed") ||
        isInvalidNumberParameter(parameters, "min") ||
        isInvalidNumberParameter(parameters, "max")
      ) {
        return true;
      }
      const min = parseFiniteNumber(parameters.min) ?? 0;
      const max = parseFiniteNumber(parameters.max) ?? 1;
      return min > max;
    }
    case "repeat": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (isInvalidNumberParameter(parameters, "count")) return true;
      const count = parseFiniteNumber(parameters.count) ?? 1;
      return count <= 0;
    }
    case "linearArray": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (
        isInvalidVectorParameters(parameters, "base") ||
        isInvalidVectorParameters(parameters, "direction") ||
        isInvalidNumberParameter(parameters, "count") ||
        isInvalidNumberParameter(parameters, "spacing")
      ) {
        return true;
      }
      const count = parseFiniteNumber(parameters.count) ?? 1;
      return count <= 0;
    }
    case "polarArray": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (
        isInvalidVectorParameters(parameters, "center") ||
        isInvalidVectorParameters(parameters, "axis") ||
        isInvalidVectorParameters(parameters, "reference") ||
        isInvalidNumberParameter(parameters, "count") ||
        isInvalidNumberParameter(parameters, "radius") ||
        isInvalidNumberParameter(parameters, "startAngle") ||
        isInvalidNumberParameter(parameters, "sweep")
      ) {
        return true;
      }
      const count = parseFiniteNumber(parameters.count) ?? 1;
      const radius = parseFiniteNumber(parameters.radius) ?? 0;
      return count <= 0 || radius < 0;
    }
    case "gridArray": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (
        isInvalidVectorParameters(parameters, "origin") ||
        isInvalidVectorParameters(parameters, "xAxis") ||
        isInvalidVectorParameters(parameters, "yAxis") ||
        isInvalidNumberParameter(parameters, "xCount") ||
        isInvalidNumberParameter(parameters, "yCount") ||
        isInvalidNumberParameter(parameters, "xSpacing") ||
        isInvalidNumberParameter(parameters, "ySpacing")
      ) {
        return true;
      }
      const xCount = parseFiniteNumber(parameters.xCount) ?? 1;
      const yCount = parseFiniteNumber(parameters.yCount) ?? 1;
      return xCount <= 0 || yCount <= 0;
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
      return false;
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
    case "moveVector":
      return (
        isInvalidVectorParameters(safeData.parameters, "vector") ||
        isInvalidVectorParameters(safeData.parameters, "offset")
      );
    case "scaleVector":
      return (
        isInvalidVectorParameters(safeData.parameters, "vector") ||
        isInvalidNumberParameter(safeData.parameters, "scale")
      );
    case "rotateVectorAxis":
      return (
        isInvalidVectorParameters(safeData.parameters, "vector") ||
        isInvalidVectorParameters(safeData.parameters, "axis") ||
        isInvalidNumberParameter(safeData.parameters, "angleDeg")
      );
    case "mirrorVector":
      return (
        isInvalidVectorParameters(safeData.parameters, "vector") ||
        isInvalidVectorParameters(safeData.parameters, "normal")
      );
    case "sineWave":
    case "cosineWave":
    case "sawtoothWave":
    case "triangleWave": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      return (
        isInvalidNumberParameter(parameters, "t") ||
        isInvalidNumberParameter(parameters, "amplitude") ||
        isInvalidNumberParameter(parameters, "frequency") ||
        isInvalidNumberParameter(parameters, "phaseDeg") ||
        isInvalidNumberParameter(parameters, "offset")
      );
    }
    case "squareWave": {
      const parameters = safeData.parameters;
      if (!parameters) return false;
      if (
        isInvalidNumberParameter(parameters, "t") ||
        isInvalidNumberParameter(parameters, "amplitude") ||
        isInvalidNumberParameter(parameters, "frequency") ||
        isInvalidNumberParameter(parameters, "phaseDeg") ||
        isInvalidNumberParameter(parameters, "offset") ||
        isInvalidNumberParameter(parameters, "duty")
      ) {
        return true;
      }
      const duty = parseFiniteNumber(parameters.duty) ?? 0.5;
      return duty < 0 || duty > 1;
    }
    default:
      return false;
  }
};
