import type { Geometry, Vec3, WorkflowNodeData } from "../../types";
import { isFiniteNumber } from "../../workflow/nodes/solver/utils";

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

type NodeValidator = (data: WorkflowNodeData, geometry?: Geometry[]) => boolean;

const getOutputString = (data: WorkflowNodeData, key: string) => {
  const value = data.outputs?.[key];
  return typeof value === "string" ? value : undefined;
};

const getGeometryId = (data: WorkflowNodeData) =>
  getOutputString(data, "geometry") ?? data.geometryId;

const validators: Record<string, NodeValidator> = {
  geometryReference: (data, geometry) => {
    const geometryId = data.geometryId;
    if (!geometryId) return true;
    if (!geometry) return false;
    return !geometry.some((item) => item.id === geometryId);
  },
  point: (data) => {
    const position = data.outputs?.position as Vec3 | undefined;
    return !isValidVec3(position ?? data.point);
  },
  pointCloud: (data) => {
    const points = data.outputs?.points;
    return !Array.isArray(points) || points.length === 0;
  },
  line: (data) => {
    const points = data.outputs?.points;
    return !Array.isArray(points) || points.length < 2;
  },
  arc: (data) => {
    const points = data.outputs?.points;
    return !Array.isArray(points) || points.length < 3;
  },
  curve: (data) => {
    const points = data.outputs?.points;
    return !Array.isArray(points) || points.length < 2;
  },
  polyline: (data) => {
    const points = data.outputs?.points;
    return !Array.isArray(points) || points.length < 2;
  },
  surface: (data) => {
    const points = data.outputs?.points;
    return !Array.isArray(points) || points.length < 3;
  },
  rectangle: (data) => {
    const width = parseFiniteNumber(data.outputs?.width ?? data.parameters?.width) ?? 0;
    const height = parseFiniteNumber(data.outputs?.height ?? data.parameters?.height) ?? 0;
    return width <= 0 || height <= 0;
  },
  circle: (data) => {
    const radius = parseFiniteNumber(data.outputs?.radius ?? data.parameters?.radius) ?? 0;
    const segments = parseFiniteNumber(data.outputs?.segments ?? data.parameters?.segments) ?? 0;
    return radius <= 0 || segments < 8;
  },
  box: (data) => {
    const width =
      parseFiniteNumber(data.outputs?.width ?? data.parameters?.boxWidth) ??
      data.boxDimensions?.width ??
      0;
    const height =
      parseFiniteNumber(data.outputs?.height ?? data.parameters?.boxHeight) ??
      data.boxDimensions?.height ??
      0;
    const depth =
      parseFiniteNumber(data.outputs?.depth ?? data.parameters?.boxDepth) ??
      data.boxDimensions?.depth ??
      0;
    return width <= 0 || height <= 0 || depth <= 0;
  },
  sphere: (data) => {
    const radius =
      parseFiniteNumber(data.outputs?.radius ?? data.parameters?.sphereRadius) ??
      data.sphereRadius ??
      0;
    return radius <= 0;
  },
  meshConvert: (data) => {
    const parameters = data.parameters;
    if (!parameters) return false;
    return (
      isInvalidNumberParameter(parameters, "distance") ||
      isInvalidNumberParameter(parameters, "radius") ||
      isInvalidVectorParameters(parameters, "direction")
    );
  },
  stlExport: (data) => {
    const parameters = data.parameters;
    if (!parameters) return false;
    return isInvalidNumberParameter(parameters, "scale");
  },
  stlImport: (data) => {
    const parameters = data.parameters;
    if (!parameters) return false;
    return isInvalidNumberParameter(parameters, "scale");
  },
  move: (data) => {
    const geometryId = getGeometryId(data);
    if (!geometryId) return true;
    const parameters = data.parameters;
    return (
      isInvalidNumberParameter(parameters, "worldX") ||
      isInvalidNumberParameter(parameters, "worldY") ||
      isInvalidNumberParameter(parameters, "worldZ")
    );
  },
  rotate: (data) => {
    const geometryId = getGeometryId(data);
    if (!geometryId) return true;
    const parameters = data.parameters;
    return (
      isInvalidVectorParameters(parameters, "axis") ||
      isInvalidVectorParameters(parameters, "pivot") ||
      isInvalidNumberParameter(parameters, "angle")
    );
  },
  scale: (data) => {
    const geometryId = getGeometryId(data);
    if (!geometryId) return true;
    const parameters = data.parameters;
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
  },
  customMaterial: (data) => !getGeometryId(data),
  loft: (data) => !getGeometryId(data),
  extrude: (data) => {
    const geometryId = getGeometryId(data);
    if (!geometryId) return true;
    const parameters = data.parameters;
    if (!parameters) return false;
    return (
      isInvalidNumberParameter(parameters, "distance") ||
      isInvalidVectorParameters(parameters, "direction")
    );
  },
  offset: (data) => {
    const geometryId = getGeometryId(data);
    if (!geometryId) return true;
    const parameters = data.parameters;
    if (!parameters) return false;
    return (
      isInvalidNumberParameter(parameters, "distance") ||
      isInvalidNumberParameter(parameters, "samples")
    );
  },
  offsetSurface: (data) => {
    const geometryId = getGeometryId(data);
    if (!geometryId) return true;
    const parameters = data.parameters;
    if (!parameters) return false;
    return isInvalidNumberParameter(parameters, "distance");
  },
  fillet: (data) => {
    const geometryId = getGeometryId(data);
    if (!geometryId) return true;
    const parameters = data.parameters;
    if (!parameters) return false;
    return (
      isInvalidNumberParameter(parameters, "radius") ||
      isInvalidNumberParameter(parameters, "segments")
    );
  },
  filletEdges: (data) => {
    const geometryId = getGeometryId(data);
    if (!geometryId) return true;
    const parameters = data.parameters;
    if (!parameters) return false;
    return (
      isInvalidNumberParameter(parameters, "radius") ||
      isInvalidNumberParameter(parameters, "segments")
    );
  },
  thickenMesh: (data) => {
    const geometryId = getGeometryId(data);
    if (!geometryId) return true;
    const parameters = data.parameters;
    if (!parameters) return false;
    if (isInvalidNumberParameter(parameters, "thickness")) return true;
    const sides = String(parameters.sides ?? "both");
    return !["both", "outward", "inward"].includes(sides);
  },
  plasticwrap: (data) => {
    const geometryId = getGeometryId(data);
    const targetId = getOutputString(data, "target");
    if (!geometryId || !targetId) return true;
    const parameters = data.parameters;
    if (!parameters) return false;
    return (
      isInvalidNumberParameter(parameters, "distance") ||
      isInvalidNumberParameter(parameters, "smooth")
    );
  },
  solid: (data) => {
    const geometryId = getGeometryId(data);
    if (!geometryId) return true;
    const parameters = data.parameters;
    if (!parameters) return false;
    if (isInvalidNumberParameter(parameters, "tolerance")) return true;
    const capMode = String(parameters.capMode ?? "auto");
    return !["auto", "planar", "triangulate"].includes(capMode);
  },
  fieldTransformation: (data) => {
    const geometryId = getGeometryId(data);
    if (!geometryId) return true;
    const parameters = data.parameters;
    if (!parameters) return false;
    return (
      isInvalidNumberParameter(parameters, "strength") ||
      isInvalidNumberParameter(parameters, "falloff")
    );
  },
  boolean: (data) => {
    const geometryId = getGeometryId(data);
    if (!geometryId) return true;
    const op = String(data.parameters?.operation ?? "union");
    return !["union", "difference", "intersection"].includes(op);
  },
  measurement: (data) => {
    const parameters = data.parameters;
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
  },
  geometryArray: (data) => {
    const parameters = data.parameters;
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
  },
  voxelizeGeometry: (data) => {
    const parameters = data.parameters;
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
  },
  extractIsosurface: (data) => {
    const parameters = data.parameters;
    if (!parameters) return false;
    if (isInvalidNumberParameter(parameters, "isoValue")) {
      return true;
    }
    const isoValue = parseFiniteNumber(parameters.isoValue) ?? 0.5;
    if (isoValue < 0 || isoValue > 1) return true;
    return false;
  },
  topologyOptimize: (data) => {
    const parameters = data.parameters;
    const volumeFraction =
      data.topologySettings?.volumeFraction ??
      parseFiniteNumber(parameters?.volumeFraction) ??
      0.4;
    const penaltyExponent =
      data.topologySettings?.penaltyExponent ??
      parseFiniteNumber(parameters?.penaltyExponent) ??
      3;
    const filterRadius =
      data.topologySettings?.filterRadius ??
      parseFiniteNumber(parameters?.filterRadius) ??
      1.5;
    const maxIterations =
      data.topologySettings?.maxIterations ??
      parseFiniteNumber(parameters?.maxIterations) ??
      80;
    const convergenceTolerance =
      data.topologySettings?.convergenceTolerance ??
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
  },
  topologySolver: (data) => {
    const parameters = data.parameters;
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
  },
  listItem: (data) => isInvalidNumberParameter(data.parameters, "index"),
  listPartition: (data) => {
    const parameters = data.parameters;
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
  },
  listFlatten: (data) => {
    const parameters = data.parameters;
    if (!parameters) return false;
    if (isInvalidNumberParameter(parameters, "depth")) return true;
    const depth = parseFiniteNumber(parameters.depth) ?? 1;
    return depth <= 0;
  },
  range: (data) => {
    const parameters = data.parameters;
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
  },
  linspace: (data) => {
    const parameters = data.parameters;
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
  },
  remap: (data) => {
    const parameters = data.parameters;
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
  },
  random: (data) => {
    const parameters = data.parameters;
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
  },
  repeat: (data) => {
    const parameters = data.parameters;
    if (!parameters) return false;
    if (isInvalidNumberParameter(parameters, "count")) return true;
    const count = parseFiniteNumber(parameters.count) ?? 1;
    return count <= 0;
  },
  linearArray: (data) => {
    const parameters = data.parameters;
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
  },
  polarArray: (data) => {
    const parameters = data.parameters;
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
  },
  gridArray: (data) => {
    const parameters = data.parameters;
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
  },
  listSlice: (data) => {
    const parameters = data.parameters;
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
  },
  number: (data) => isInvalidNumberParameter(data.parameters, "value"),
  clamp: (data) => {
    const parameters = data.parameters;
    if (!parameters) return false;
    if (
      isInvalidNumberParameter(parameters, "value") ||
      isInvalidNumberParameter(parameters, "min") ||
      isInvalidNumberParameter(parameters, "max")
    ) {
      return true;
    }
    return false;
  },
  expression: (data) => {
    const expression = data.parameters?.expression;
    return typeof expression === "string" ? expression.trim().length === 0 : false;
  },
  conditional: (data) => {
    const mode = data.parameters?.mode;
    return typeof mode === "string" ? !CONDITIONAL_MODES.has(mode) : false;
  },
  vectorConstruct: (data) =>
    isInvalidNumberParameter(data.parameters, "x") ||
    isInvalidNumberParameter(data.parameters, "y") ||
    isInvalidNumberParameter(data.parameters, "z"),
  vectorFromPoints: (data) =>
    isInvalidVectorParameters(data.parameters, "start") ||
    isInvalidVectorParameters(data.parameters, "end"),
  vectorProject: (data) =>
    isInvalidVectorParameters(data.parameters, "vector") ||
    isInvalidVectorParameters(data.parameters, "onto"),
  vectorScale: (data) =>
    isInvalidVectorParameters(data.parameters, "vector") ||
    isInvalidNumberParameter(data.parameters, "scale"),
  vectorLerp: (data) =>
    isInvalidVectorParameters(data.parameters, "a") ||
    isInvalidVectorParameters(data.parameters, "b") ||
    isInvalidNumberParameter(data.parameters, "t"),
  movePoint: (data) =>
    isInvalidVectorParameters(data.parameters, "point") ||
    isInvalidVectorParameters(data.parameters, "direction") ||
    isInvalidNumberParameter(data.parameters, "distance"),
  movePointByVector: (data) =>
    isInvalidVectorParameters(data.parameters, "point") ||
    isInvalidVectorParameters(data.parameters, "offset"),
  moveVector: (data) =>
    isInvalidVectorParameters(data.parameters, "vector") ||
    isInvalidVectorParameters(data.parameters, "offset"),
  scaleVector: (data) =>
    isInvalidVectorParameters(data.parameters, "vector") ||
    isInvalidNumberParameter(data.parameters, "scale"),
  rotateVectorAxis: (data) =>
    isInvalidVectorParameters(data.parameters, "vector") ||
    isInvalidVectorParameters(data.parameters, "axis") ||
    isInvalidNumberParameter(data.parameters, "angleDeg"),
  mirrorVector: (data) =>
    isInvalidVectorParameters(data.parameters, "vector") ||
    isInvalidVectorParameters(data.parameters, "normal"),
  squareWave: (data) => {
    const parameters = data.parameters;
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
  },
};

[
  "add",
  "subtract",
  "multiply",
  "divide",
  "min",
  "max",
].forEach((nodeType) => {
  validators[nodeType] = (data) =>
    isInvalidNumberParameter(data.parameters, "a") ||
    isInvalidNumberParameter(data.parameters, "b");
});

["vectorDeconstruct", "vectorLength", "vectorNormalize"].forEach((nodeType) => {
  validators[nodeType] = (data) => isInvalidVectorParameters(data.parameters, "vector");
});

[
  "vectorAdd",
  "vectorSubtract",
  "vectorDot",
  "vectorCross",
  "vectorAngle",
  "distance",
].forEach((nodeType) => {
  validators[nodeType] = (data) =>
    isInvalidVectorParameters(data.parameters, "a") ||
    isInvalidVectorParameters(data.parameters, "b");
});

["sineWave", "cosineWave", "sawtoothWave", "triangleWave"].forEach((nodeType) => {
  validators[nodeType] = (data) => {
    const parameters = data.parameters;
    if (!parameters) return false;
    return (
      isInvalidNumberParameter(parameters, "t") ||
      isInvalidNumberParameter(parameters, "amplitude") ||
      isInvalidNumberParameter(parameters, "frequency") ||
      isInvalidNumberParameter(parameters, "phaseDeg") ||
      isInvalidNumberParameter(parameters, "offset")
    );
  };
});

export const isWorkflowNodeInvalid = (
  nodeType: string | undefined,
  data?: WorkflowNodeData,
  geometry?: Geometry[]
) => {
  if (!nodeType) return false;
  const safeData = data ?? { label: nodeType };
  if (safeData.evaluationError) return true;

  const validator = validators[nodeType];
  return validator ? validator(safeData, geometry) : false;
};
