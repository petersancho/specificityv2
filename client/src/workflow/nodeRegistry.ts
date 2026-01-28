import type { IconId } from "../webgl/ui/WebGLIconRenderer";
import type { Geometry, VertexGeometry, WorkflowNode } from "../types";
import type { NodeType } from "./nodeTypes";

export type WorkflowPortType =
  | "number"
  | "boolean"
  | "string"
  | "vector"
  | "geometry"
  | "any";

export type WorkflowPortSpec = {
  key: string;
  label: string;
  type: WorkflowPortType;
  required?: boolean;
  allowMultiple?: boolean;
  description?: string;
  parameterKey?: string;
  defaultValue?: unknown;
};

export type WorkflowParameterType = "number" | "boolean" | "string" | "select";

export type WorkflowParameterOption = {
  value: string;
  label: string;
};

export type WorkflowParameterSpec = {
  key: string;
  label: string;
  type: WorkflowParameterType;
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: WorkflowParameterOption[];
  description?: string;
};

export type NodeCategoryId =
  | "data"
  | "basics"
  | "lists"
  | "primitives"
  | "curves"
  | "surfaces"
  | "transforms"
  | "euclidean"
  | "ranges"
  | "signals"
  | "analysis"
  | "optimization"
  | "math"
  | "logic";

export type NodeCategory = {
  id: NodeCategoryId;
  label: string;
  description: string;
  accent: string;
  band: string;
  port: string;
};

type PortResolver = (parameters: Record<string, unknown>) => WorkflowPortSpec[];

type PortsDefinition = WorkflowPortSpec[] | PortResolver;

type WorkflowPrimitive = number | string | boolean | { x: number; y: number; z: number };

export type WorkflowValue = WorkflowPrimitive | WorkflowValue[] | null | undefined;

type WorkflowComputeContext = {
  nodeId: string;
  geometryById: Map<string, Geometry>;
  vertexById: Map<string, VertexGeometry>;
};

type WorkflowComputeArgs = {
  inputs: Record<string, WorkflowValue>;
  parameters: Record<string, unknown>;
  context: WorkflowComputeContext;
};

export type WorkflowNodeDefinition = {
  type: NodeType;
  label: string;
  shortLabel: string;
  description: string;
  category: NodeCategoryId;
  iconId: IconId;
  inputs: PortsDefinition;
  outputs: PortsDefinition;
  parameters: WorkflowParameterSpec[];
  primaryOutputKey?: string;
  compute: (args: WorkflowComputeArgs) => Record<string, WorkflowValue>;
};

const EPSILON = 1e-10;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const toNumber = (value: WorkflowValue, fallback: number) => {
  if (isFiniteNumber(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const toBoolean = (value: WorkflowValue, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (isFiniteNumber(value)) return Math.abs(value) > EPSILON;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    if (normalized.length > 0) {
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) return Math.abs(parsed) > EPSILON;
    }
  }
  return fallback;
};

const readNumberParameter = (
  parameters: Record<string, unknown>,
  key: string,
  fallback: number
) => {
  const value = parameters[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return fallback;
};

const readBooleanParameter = (
  parameters: Record<string, unknown>,
  key: string,
  fallback: boolean
) => {
  const value = parameters[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Math.abs(value) > EPSILON;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type Vec3Value = { x: number; y: number; z: number };

const isVec3Value = (value: WorkflowValue): value is Vec3Value => {
  if (!value || typeof value !== "object") return false;
  const vec = value as Partial<Vec3Value>;
  return (
    isFiniteNumber(vec.x) &&
    isFiniteNumber(vec.y) &&
    isFiniteNumber(vec.z)
  );
};

const parseVec3String = (value: string): Vec3Value | null => {
  const numbers = value
    .split(/[\s,]+/)
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry));
  if (numbers.length < 3) return null;
  return {
    x: numbers[0],
    y: numbers[1],
    z: numbers[2],
  };
};

const parseNumericEntry = (entry: WorkflowValue): number | null => {
  if (typeof entry === "number" && Number.isFinite(entry)) return entry;
  if (typeof entry === "boolean") return entry ? 1 : 0;
  if (typeof entry === "string" && entry.trim().length > 0) {
    const parsed = Number(entry);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const collectNumericEntries = (
  value: WorkflowValue,
  target: number[],
  limit = 3
) => {
  if (target.length >= limit || value == null) return;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectNumericEntries(entry as WorkflowValue, target, limit));
    return;
  }
  const parsed = parseNumericEntry(value);
  if (parsed != null) {
    target.push(parsed);
  }
};

const tryVec3Value = (value: WorkflowValue): Vec3Value | null => {
  if (isVec3Value(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = parseVec3String(value);
    if (parsed) return parsed;
  }
  const numeric: number[] = [];
  collectNumericEntries(value, numeric, 3);
  if (numeric.length >= 3) {
    return { x: numeric[0], y: numeric[1], z: numeric[2] };
  }
  return null;
};

const readVec3Parameters = (
  parameters: Record<string, unknown>,
  prefix: string,
  fallback: Vec3Value
): Vec3Value => ({
  x: readNumberParameter(parameters, `${prefix}X`, fallback.x),
  y: readNumberParameter(parameters, `${prefix}Y`, fallback.y),
  z: readNumberParameter(parameters, `${prefix}Z`, fallback.z),
});

const addVec3 = (a: Vec3Value, b: Vec3Value): Vec3Value => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});

const subtractVec3 = (a: Vec3Value, b: Vec3Value): Vec3Value => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});

const scaleVec3 = (vector: Vec3Value, scalar: number): Vec3Value => ({
  x: vector.x * scalar,
  y: vector.y * scalar,
  z: vector.z * scalar,
});

const dotVec3 = (a: Vec3Value, b: Vec3Value) => a.x * b.x + a.y * b.y + a.z * b.z;

const crossVec3 = (a: Vec3Value, b: Vec3Value): Vec3Value => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

const lengthVec3 = (vector: Vec3Value) => Math.sqrt(dotVec3(vector, vector));

const normalizeVec3 = (vector: Vec3Value): Vec3Value => {
  const length = lengthVec3(vector);
  if (length <= EPSILON) {
    throw new Error("Cannot normalize a zero-length vector.");
  }
  return scaleVec3(vector, 1 / length);
};

const vectorParameterSpecs = (
  prefix: string,
  labelPrefix: string,
  defaults: Vec3Value
): WorkflowParameterSpec[] => [
  {
    key: `${prefix}X`,
    label: `${labelPrefix} X`,
    type: "number",
    defaultValue: defaults.x,
    step: 0.1,
  },
  {
    key: `${prefix}Y`,
    label: `${labelPrefix} Y`,
    type: "number",
    defaultValue: defaults.y,
    step: 0.1,
  },
  {
    key: `${prefix}Z`,
    label: `${labelPrefix} Z`,
    type: "number",
    defaultValue: defaults.z,
    step: 0.1,
  },
];

const resolveVectorInput = (
  inputs: Record<string, WorkflowValue>,
  parameters: Record<string, unknown>,
  inputKey: string,
  prefix: string,
  fallback: Vec3Value
) => {
  const parameterVector = readVec3Parameters(parameters, prefix, fallback);
  const inputValue = inputs[inputKey];
  if (inputValue == null) {
    return parameterVector;
  }
  const parsed = tryVec3Value(inputValue);
  if (!parsed) {
    throw new Error("Vector input must provide X, Y, and Z components.");
  }
  return parsed;
};

const ZERO_VEC3: Vec3Value = { x: 0, y: 0, z: 0 };
const UNIT_X_VEC3: Vec3Value = { x: 1, y: 0, z: 0 };
const UNIT_Y_VEC3: Vec3Value = { x: 0, y: 1, z: 0 };
const UNIT_Z_VEC3: Vec3Value = { x: 0, y: 0, z: 1 };
const UNIT_XYZ_VEC3: Vec3Value = { x: 1, y: 1, z: 1 };

const toList = (value: WorkflowValue): WorkflowValue[] => {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
};

const toFiniteNumber = (value: WorkflowValue): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const toNumericList = (value: WorkflowValue): number[] => {
  const list = toList(value);
  const numbers: number[] = [];
  list.forEach((entry) => {
    const numeric = toFiniteNumber(entry as WorkflowValue);
    if (numeric != null) {
      numbers.push(numeric);
    }
  });
  return numbers;
};

const resolveGeometryInput = (
  inputs: Record<string, WorkflowValue>,
  context: WorkflowComputeContext,
  options?: { allowMissing?: boolean }
) => {
  const geometryId = typeof inputs.geometry === "string" ? inputs.geometry : null;
  if (!geometryId) {
    if (options?.allowMissing) {
      return null;
    }
    throw new Error("Geometry input is required.");
  }
  const geometry = context.geometryById.get(geometryId);
  if (!geometry) {
    throw new Error("Referenced geometry could not be found.");
  }
  return geometry;
};

const vec3FromPositions = (positions: number[], index: number): Vec3Value => {
  const i = index * 3;
  return {
    x: positions[i] ?? 0,
    y: positions[i + 1] ?? 0,
    z: positions[i + 2] ?? 0,
  };
};

const collectMeshEdges = (indices: number[], maxEdges: number) => {
  const edges: Array<[number, number]> = [];
  const seen = new Set<string>();
  for (let i = 0; i + 2 < indices.length && edges.length < maxEdges; i += 3) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];
    const pairs: Array<[number, number]> = [
      [a, b],
      [b, c],
      [c, a],
    ];
    pairs.forEach(([u, v]) => {
      if (edges.length >= maxEdges) return;
      const min = Math.min(u, v);
      const max = Math.max(u, v);
      const key = `${min}-${max}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push([min, max]);
    });
  }
  return edges;
};

const collectGeometryVertices = (
  geometry: Geometry,
  context: WorkflowComputeContext,
  maxItems: number
) => {
  if (geometry.type === "vertex") {
    return [geometry.position];
  }

  if (geometry.type === "polyline") {
    const positions: Vec3Value[] = [];
    geometry.vertexIds.forEach((vertexId) => {
      if (positions.length >= maxItems) return;
      const vertex = context.vertexById.get(vertexId);
      if (vertex) {
        positions.push(vertex.position);
      }
    });
    return positions;
  }

  if ("mesh" in geometry && geometry.mesh?.positions) {
    const positions: Vec3Value[] = [];
    const count = Math.floor(geometry.mesh.positions.length / 3);
    for (let i = 0; i < count && positions.length < maxItems; i += 1) {
      positions.push(vec3FromPositions(geometry.mesh.positions, i));
    }
    return positions;
  }

  return [];
};

const collectGeometryEdges = (
  geometry: Geometry,
  context: WorkflowComputeContext,
  maxItems: number
) => {
  const edges: Array<[Vec3Value, Vec3Value]> = [];
  if (geometry.type === "polyline") {
    const vertexIds = geometry.vertexIds;
    for (let i = 0; i + 1 < vertexIds.length && edges.length < maxItems; i += 1) {
      const start = context.vertexById.get(vertexIds[i]);
      const end = context.vertexById.get(vertexIds[i + 1]);
      if (start && end) {
        edges.push([start.position, end.position]);
      }
    }
    if (geometry.closed && vertexIds.length > 2 && edges.length < maxItems) {
      const start = context.vertexById.get(vertexIds[vertexIds.length - 1]);
      const end = context.vertexById.get(vertexIds[0]);
      if (start && end) {
        edges.push([start.position, end.position]);
      }
    }
    return edges;
  }

  if ("mesh" in geometry && geometry.mesh?.indices && geometry.mesh?.positions) {
    const edgeIndices = collectMeshEdges(geometry.mesh.indices, maxItems);
    edgeIndices.forEach(([a, b]) => {
      if (edges.length >= maxItems) return;
      edges.push([
        vec3FromPositions(geometry.mesh.positions, a),
        vec3FromPositions(geometry.mesh.positions, b),
      ]);
    });
    return edges;
  }

  return edges;
};

const collectGeometryFaceCentroids = (geometry: Geometry, maxItems: number) => {
  if (!("mesh" in geometry) || !geometry.mesh?.indices || !geometry.mesh?.positions) {
    return [];
  }
  const centroids: Vec3Value[] = [];
  const indices = geometry.mesh.indices;
  const positions = geometry.mesh.positions;
  for (let i = 0; i + 2 < indices.length && centroids.length < maxItems; i += 3) {
    const a = vec3FromPositions(positions, indices[i]);
    const b = vec3FromPositions(positions, indices[i + 1]);
    const c = vec3FromPositions(positions, indices[i + 2]);
    centroids.push({
      x: (a.x + b.x + c.x) / 3,
      y: (a.y + b.y + c.y) / 3,
      z: (a.z + b.z + c.z) / 3,
    });
  }
  return centroids;
};

const collectGeometryNormals = (geometry: Geometry, maxItems: number) => {
  if (!("mesh" in geometry) || !geometry.mesh?.normals) return [];
  const normals: Vec3Value[] = [];
  const count = Math.floor(geometry.mesh.normals.length / 3);
  for (let i = 0; i < count && normals.length < maxItems; i += 1) {
    normals.push(vec3FromPositions(geometry.mesh.normals, i));
  }
  return normals;
};

const collectGeometryControlPoints = (
  geometry: Geometry,
  context: WorkflowComputeContext,
  maxItems: number
) => {
  if (geometry.type === "surface" && geometry.nurbs?.controlPoints) {
    const points: Vec3Value[] = [];
    geometry.nurbs.controlPoints.forEach((row) => {
      row.forEach((point) => {
        if (points.length >= maxItems) return;
        points.push(point);
      });
    });
    return points;
  }

  if (geometry.type === "loft") {
    const points: Vec3Value[] = [];
    geometry.sectionIds.forEach((sectionId) => {
      if (points.length >= maxItems) return;
      const section = context.geometryById.get(sectionId);
      if (section) {
        points.push(...collectGeometryVertices(section, context, maxItems - points.length));
      }
    });
    return points;
  }

  if (geometry.type === "extrude") {
    const points: Vec3Value[] = [];
    geometry.profileIds.forEach((profileId) => {
      if (points.length >= maxItems) return;
      const profile = context.geometryById.get(profileId);
      if (profile) {
        points.push(...collectGeometryVertices(profile, context, maxItems - points.length));
      }
    });
    return points;
  }

  return collectGeometryVertices(geometry, context, maxItems);
};

const countGeometryVertices = (geometry: Geometry, context: WorkflowComputeContext) => {
  if (geometry.type === "vertex") return 1;
  if (geometry.type === "polyline") return geometry.vertexIds.length;
  if ("mesh" in geometry && geometry.mesh?.positions) {
    return Math.floor(geometry.mesh.positions.length / 3);
  }
  return 0;
};

const countGeometryFaces = (geometry: Geometry) => {
  if (!("mesh" in geometry) || !geometry.mesh?.indices) return 0;
  return Math.floor(geometry.mesh.indices.length / 3);
};

const countGeometryEdges = (geometry: Geometry, context: WorkflowComputeContext) => {
  if (geometry.type === "polyline") {
    const base = Math.max(0, geometry.vertexIds.length - 1);
    return geometry.closed && geometry.vertexIds.length > 2 ? base + 1 : base;
  }
  if ("mesh" in geometry && geometry.mesh?.indices) {
    const edges = collectMeshEdges(geometry.mesh.indices, Number.POSITIVE_INFINITY);
    return edges.length;
  }
  return 0;
};

const countGeometryNormals = (geometry: Geometry) => {
  if (!("mesh" in geometry) || !geometry.mesh?.normals) return 0;
  return Math.floor(geometry.mesh.normals.length / 3);
};

const countGeometryControlPoints = (geometry: Geometry, context: WorkflowComputeContext) => {
  if (geometry.type === "surface" && geometry.nurbs?.controlPoints) {
    return geometry.nurbs.controlPoints.reduce((acc, row) => acc + row.length, 0);
  }
  if (geometry.type === "loft") {
    return geometry.sectionIds.reduce((acc, id) => {
      const section = context.geometryById.get(id);
      return acc + (section ? countGeometryVertices(section, context) : 0);
    }, 0);
  }
  if (geometry.type === "extrude") {
    return geometry.profileIds.reduce((acc, id) => {
      const profile = context.geometryById.get(id);
      return acc + (profile ? countGeometryVertices(profile, context) : 0);
    }, 0);
  }
  return countGeometryVertices(geometry, context);
};

const stripWrappingChars = (token: string) =>
  token.trim().replace(/^[\[(]+|[\])]+$/g, "");

const parseListToken = (token: string): WorkflowValue => {
  const stripped = stripWrappingChars(token);
  if (stripped.length === 0) return null;

  const lower = stripped.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;

  const numeric = Number(stripped);
  if (Number.isFinite(numeric)) return numeric;

  const vector = parseVec3String(stripped);
  if (vector) return vector;

  return stripped;
};

const parseListText = (text: string | undefined): WorkflowValue[] => {
  if (!text || text.trim().length === 0) return [];
  const tokens = text
    .split(/[\n,;]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  return tokens.map((token) => parseListToken(token));
};

const flattenListValue = (
  value: WorkflowValue,
  depth: number,
  target: WorkflowValue[]
) => {
  if (!Array.isArray(value) || depth <= 0) {
    target.push(value);
    return;
  }
  value.forEach((entry) => flattenListValue(entry as WorkflowValue, depth - 1, target));
};

const flattenList = (value: WorkflowValue, depth: number) => {
  const resolvedDepth = Number.isFinite(depth) ? Math.max(0, Math.floor(depth)) : 0;
  const target: WorkflowValue[] = [];
  if (resolvedDepth === 0) {
    target.push(...toList(value));
    return target;
  }
  flattenListValue(value, resolvedDepth, target);
  return target;
};

const vec3Equals = (a: Vec3Value, b: Vec3Value) =>
  Math.abs(a.x - b.x) <= EPSILON &&
  Math.abs(a.y - b.y) <= EPSILON &&
  Math.abs(a.z - b.z) <= EPSILON;

const deepEqualWorkflowValue = (a: WorkflowValue, b: WorkflowValue): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;

  const aVec = isVec3Value(a) ? a : null;
  const bVec = isVec3Value(b) ? b : null;
  if (aVec && bVec) {
    return vec3Equals(aVec, bVec);
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqualWorkflowValue(a[i] as WorkflowValue, b[i] as WorkflowValue)) {
        return false;
      }
    }
    return true;
  }

  return false;
};

const hashStringToSeed = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clampInt = (value: number, min: number, max: number, fallback: number) => {
  const numeric = Number.isFinite(value) ? value : fallback;
  const rounded = Math.floor(numeric);
  return Math.min(max, Math.max(min, rounded));
};

const MAX_LIST_ITEMS = 2048;

const lerpNumber = (a: number, b: number, t: number) => a + (b - a) * t;

const rotateVec3AroundAxis = (vector: Vec3Value, axis: Vec3Value, angleRadians: number) => {
  const unitAxis = normalizeVec3(axis);
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  const term1 = scaleVec3(vector, cos);
  const term2 = scaleVec3(crossVec3(unitAxis, vector), sin);
  const term3 = scaleVec3(unitAxis, dotVec3(unitAxis, vector) * (1 - cos));
  return addVec3(addVec3(term1, term2), term3);
};

const evaluateGenomeFitness = (genome: Vec3Value, bias: number) => {
  const periodic =
    Math.sin(genome.x + bias) +
    Math.cos(genome.y - bias * 0.5) +
    Math.sin(genome.z * 0.7 + bias * 0.25);
  const penalty = 0.04 * (genome.x * genome.x + genome.y * genome.y + genome.z * genome.z);
  return periodic - penalty;
};

const mutateGenome = (genome: Vec3Value, mutationRate: number, random: () => number) => {
  const mutateAxis = (value: number) => {
    if (random() > mutationRate) return value;
    const delta = (random() - 0.5) * 1.6;
    return clampNumber(value + delta, -10, 10);
  };
  return {
    x: mutateAxis(genome.x),
    y: mutateAxis(genome.y),
    z: mutateAxis(genome.z),
  };
};

const runTopologyDensitySolver = (args: {
  seedKey: string;
  resolution: number;
  volumeFraction: number;
  penaltyExponent: number;
  filterRadius: number;
  iterations: number;
}) => {
  const seed = hashStringToSeed(args.seedKey);
  const random = createSeededRandom(seed);
  const resolution = clampInt(args.resolution, 4, 18, 10);
  const cellCount = resolution * resolution;
  const rawVolumeFraction = Number.isFinite(args.volumeFraction) ? args.volumeFraction : 0.4;
  const volumeFraction = clampNumber(rawVolumeFraction, 0.05, 0.95);
  const rawPenaltyExponent = Number.isFinite(args.penaltyExponent) ? args.penaltyExponent : 3;
  const penaltyExponent = clampNumber(rawPenaltyExponent, 1, 6);
  const iterations = clampInt(args.iterations, 1, 120, 40);
  const rawFilterRadius = Number.isFinite(args.filterRadius) ? args.filterRadius : 2;
  const neighborSpan = clampInt(Math.round(rawFilterRadius), 1, 6, 2);

  const densities = Array.from({ length: cellCount }, () =>
    clampNumber(volumeFraction + (random() - 0.5) * 0.35, 0, 1)
  );

  const next = new Array<number>(cellCount).fill(volumeFraction);
  let objective = 1;
  let constraint = 0;

  const readWrapped = (index: number) => densities[(index + cellCount) % cellCount];

  for (let iter = 0; iter < iterations; iter += 1) {
    let mean = 0;
    for (let i = 0; i < cellCount; i += 1) {
      let sum = 0;
      let count = 0;
      for (let offset = -neighborSpan; offset <= neighborSpan; offset += 1) {
        sum += readWrapped(i + offset);
        count += 1;
      }
      const filtered = sum / count;
      const penalized = Math.pow(filtered, penaltyExponent);
      next[i] = clampNumber(lerpNumber(densities[i], penalized, 0.42), 0, 1);
      mean += next[i];
    }

    mean /= cellCount;
    constraint = mean - volumeFraction;

    const correction = constraint * 0.35;
    let compliance = 0;
    for (let i = 0; i < cellCount; i += 1) {
      densities[i] = clampNumber(next[i] - correction, 0, 1);
      const voidness = 1 - densities[i];
      compliance += voidness * voidness;
    }
    objective = compliance / cellCount;
  }

  return {
    resolution,
    iterations,
    objective,
    constraint,
    densityField: densities,
    bestScore: clampNumber(1 - objective, 0, 1),
  };
};

const runBiologicalSolver = (args: {
  seedKey: string;
  populationSize: number;
  generations: number;
  mutationRate: number;
  fitnessBias: number;
}) => {
  const seed = hashStringToSeed(args.seedKey);
  const random = createSeededRandom(seed);

  const populationSize = clampInt(args.populationSize, 8, 96, 32);
  const generations = clampInt(args.generations, 1, 80, 24);
  const mutationRate = clampNumber(args.mutationRate, 0.01, 0.95);
  const fitnessBias = Number.isFinite(args.fitnessBias) ? args.fitnessBias : 0;

  const createRandomGenome = (): Vec3Value => ({
    x: (random() - 0.5) * 8,
    y: (random() - 0.5) * 8,
    z: (random() - 0.5) * 8,
  });

  const population = Array.from({ length: populationSize }, () => createRandomGenome());

  let bestGenome = { ...population[0] };
  let bestScore = evaluateGenomeFitness(bestGenome, fitnessBias);
  let evaluations = 0;

  for (let gen = 0; gen < generations; gen += 1) {
    const scored = population.map((genome) => {
      const score = evaluateGenomeFitness(genome, fitnessBias);
      evaluations += 1;
      if (score > bestScore) {
        bestScore = score;
        bestGenome = { ...genome };
      }
      return { genome, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const elites = scored.slice(0, Math.max(2, Math.floor(populationSize * 0.18)));

    for (let i = 0; i < populationSize; i += 1) {
      const parentA = elites[i % elites.length].genome;
      const parentB = elites[(i + 1) % elites.length].genome;
      const blend = random();
      const child = {
        x: lerpNumber(parentA.x, parentB.x, blend),
        y: lerpNumber(parentA.y, parentB.y, 1 - blend),
        z: lerpNumber(parentA.z, parentB.z, random()),
      };
      population[i] = mutateGenome(child, mutationRate, random);
    }
  }

  return {
    populationSize,
    generations,
    mutationRate,
    evaluations,
    bestGenome,
    bestScore,
  };
};

const RESERVED_CONSTANTS = new Map<string, number>([
  ["pi", Math.PI],
  ["e", Math.E],
]);

const EXPRESSION_FUNCTIONS = {
  abs: Math.abs,
  ceil: Math.ceil,
  clamp: clampNumber,
  cos: Math.cos,
  exp: Math.exp,
  floor: Math.floor,
  log: Math.log,
  max: Math.max,
  min: Math.min,
  pow: Math.pow,
  round: Math.round,
  sign: Math.sign,
  sin: Math.sin,
  sqrt: Math.sqrt,
  tan: Math.tan,
} as const;

const EXPRESSION_FUNCTION_NAMES = new Set(Object.keys(EXPRESSION_FUNCTIONS));
const EXPRESSION_CONSTANT_NAMES = new Set(RESERVED_CONSTANTS.keys());

const DISALLOWED_EXPRESSION_TOKENS = ["__", "constructor", "prototype", "window", "globalThis"];
const ALLOWED_EXPRESSION_PATTERN = /^[0-9+\-*/%^().,<>!=\sA-Za-z_]*$/;

export const parseExpressionVariables = (expression: string) => {
  const tokens = expression.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  const variables: string[] = [];
  const seen = new Set<string>();
  tokens.forEach((token) => {
    const lower = token.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    if (EXPRESSION_FUNCTION_NAMES.has(lower)) return;
    if (EXPRESSION_CONSTANT_NAMES.has(lower)) return;
    variables.push(lower);
  });
  return variables;
};

const sanitizeExpression = (expression: string) => {
  const trimmed = expression.trim();
  if (!trimmed) {
    throw new Error("Expression is empty.");
  }
  const normalized = trimmed.toLowerCase();
  if (!ALLOWED_EXPRESSION_PATTERN.test(normalized)) {
    throw new Error("Expression contains unsupported characters.");
  }
  if (DISALLOWED_EXPRESSION_TOKENS.some((token) => normalized.includes(token))) {
    throw new Error("Expression contains a blocked token.");
  }
  return normalized.replace(/\^/g, "**");
};

const evaluateExpression = (
  expression: string,
  variableValues: Record<string, number>
) => {
  const sanitized = sanitizeExpression(expression);
  const scopeEntries: Array<[string, unknown]> = [];
  Object.entries(EXPRESSION_FUNCTIONS).forEach(([key, fn]) => {
    scopeEntries.push([key, fn]);
  });
  RESERVED_CONSTANTS.forEach((value, key) => {
    scopeEntries.push([key, value]);
  });
  Object.entries(variableValues).forEach(([key, value]) => {
    scopeEntries.push([key, value]);
  });

  const argNames = scopeEntries.map(([key]) => key);
  const argValues = scopeEntries.map(([, value]) => value);

  // The expression is restricted to a small, validated grammar. We still
  // run in strict mode and only provide scoped arguments to avoid globals.
  const evaluator = new Function(
    ...argNames,
    `"use strict"; return (${sanitized});`
  ) as (...args: unknown[]) => unknown;

  const result = evaluator(...argValues);
  if (typeof result === "boolean") return result ? 1 : 0;
  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error("Expression did not produce a finite number.");
  }
  return result;
};

export const NODE_CATEGORIES: NodeCategory[] = [
  {
    id: "data",
    label: "Data",
    description: "References and parameters",
    accent: "#1f1f22",
    band: "#e9e6e2",
    port: "#c9c5c0",
  },
  {
    id: "basics",
    label: "Basics",
    description: "Core constants and helpers",
    accent: "#1f1f22",
    band: "#e9e6e2",
    port: "#c9c5c0",
  },
  {
    id: "lists",
    label: "Lists",
    description: "List and data management",
    accent: "#1f1f22",
    band: "#e9e6e2",
    port: "#c9c5c0",
  },
  {
    id: "primitives",
    label: "Primitives",
    description: "Base geometry generators",
    accent: "#00c2d1",
    band: "#e9e6e2",
    port: "#c9c5c0",
  },
  {
    id: "curves",
    label: "Curves",
    description: "Curve builders and edits",
    accent: "#ff4fb6",
    band: "#e9e6e2",
    port: "#c9c5c0",
  },
  {
    id: "surfaces",
    label: "Surfaces",
    description: "Surface and solid operations",
    accent: "#7a5cff",
    band: "#e9e6e2",
    port: "#c9c5c0",
  },
  {
    id: "transforms",
    label: "Transforms",
    description: "Move, rotate, scale, align",
    accent: "#1f1f22",
    band: "#e9e6e2",
    port: "#c9c5c0",
  },
  {
    id: "euclidean",
    label: "Euclidean",
    description: "Vectors, points, and spatial transforms",
    accent: "#1f1f22",
    band: "#e9e6e2",
    port: "#c9c5c0",
  },
  {
    id: "ranges",
    label: "Ranges",
    description: "Sequences, remaps, and generators",
    accent: "#1f1f22",
    band: "#e9e6e2",
    port: "#c9c5c0",
  },
  {
    id: "signals",
    label: "Signals",
    description: "Waveforms and oscillators",
    accent: "#1f1f22",
    band: "#e9e6e2",
    port: "#c9c5c0",
  },
  {
    id: "analysis",
    label: "Analysis",
    description: "Measure and inspect",
    accent: "#1f1f22",
    band: "#e9e6e2",
    port: "#c9c5c0",
  },
  {
    id: "optimization",
    label: "Optimization",
    description: "Topology and evolutionary tools",
    accent: "#1f1f22",
    band: "#e9e6e2",
    port: "#c9c5c0",
  },
  {
    id: "math",
    label: "Math",
    description: "Scalar computation and expressions",
    accent: "#ffc533",
    band: "#e9e6e2",
    port: "#c9c5c0",
  },
  {
    id: "logic",
    label: "Logic",
    description: "Conditions and branching",
    accent: "#1f1f22",
    band: "#e9e6e2",
    port: "#c9c5c0",
  },
];

const numberPorts = (labels: { a: string; b: string }) => {
  const inputs: WorkflowPortSpec[] = [
    {
      key: "a",
      label: labels.a,
      type: "number",
      required: true,
      parameterKey: "a",
      defaultValue: 0,
    },
    {
      key: "b",
      label: labels.b,
      type: "number",
      required: true,
      parameterKey: "b",
      defaultValue: 0,
    },
  ];
  const outputs: WorkflowPortSpec[] = [
    { key: "result", label: "Result", type: "number" },
  ];
  return { inputs, outputs };
};

const expressionInputPorts: PortResolver = (parameters) => {
  const expression = String(parameters.expression ?? "a + b");
  const variables = parseExpressionVariables(expression);
  if (variables.length === 0) {
    return [
      {
        key: "value",
        label: "Value",
        type: "number",
        parameterKey: "value",
        defaultValue: 0,
      },
    ];
  }
  return variables.map<WorkflowPortSpec>((variable) => ({
    key: variable,
    label: variable,
    type: "number",
    parameterKey: variable,
    defaultValue: 0,
  }));
};

const conditionalModeOptions: WorkflowParameterOption[] = [
  { value: "boolean", label: "Boolean" },
  { value: "greaterThan", label: "Greater Than" },
  { value: "lessThan", label: "Less Than" },
  { value: "equal", label: "Equal" },
  { value: "notEqual", label: "Not Equal" },
];

const baseWaveInputPorts = (): WorkflowPortSpec[] => [
  {
    key: "t",
    label: "T",
    type: "number",
    parameterKey: "t",
    defaultValue: 0,
  },
  {
    key: "amplitude",
    label: "Amplitude",
    type: "number",
    parameterKey: "amplitude",
    defaultValue: 1,
  },
  {
    key: "frequency",
    label: "Frequency",
    type: "number",
    parameterKey: "frequency",
    defaultValue: 1,
  },
  {
    key: "phaseDeg",
    label: "Phase",
    type: "number",
    parameterKey: "phaseDeg",
    defaultValue: 0,
  },
  {
    key: "offset",
    label: "Offset",
    type: "number",
    parameterKey: "offset",
    defaultValue: 0,
  },
];

const baseWaveParameterSpecs = (): WorkflowParameterSpec[] => [
  { key: "t", label: "T", type: "number", defaultValue: 0, step: 0.1 },
  { key: "amplitude", label: "Amplitude", type: "number", defaultValue: 1, step: 0.1 },
  { key: "frequency", label: "Frequency", type: "number", defaultValue: 1, step: 0.1 },
  { key: "phaseDeg", label: "Phase (deg)", type: "number", defaultValue: 0, step: 1 },
  { key: "offset", label: "Offset", type: "number", defaultValue: 0, step: 0.1 },
];

const resolveWaveInputs = (
  inputs: Record<string, WorkflowValue>,
  parameters: Record<string, unknown>
) => {
  const t = toNumber(inputs.t, readNumberParameter(parameters, "t", 0));
  const amplitude = toNumber(
    inputs.amplitude,
    readNumberParameter(parameters, "amplitude", 1)
  );
  const frequency = toNumber(
    inputs.frequency,
    readNumberParameter(parameters, "frequency", 1)
  );
  const phaseDeg = toNumber(
    inputs.phaseDeg,
    readNumberParameter(parameters, "phaseDeg", 0)
  );
  const offset = toNumber(inputs.offset, readNumberParameter(parameters, "offset", 0));
  const cycle = t * frequency + phaseDeg / 360;
  const angle = cycle * Math.PI * 2;
  return {
    t,
    amplitude,
    frequency,
    phaseDeg,
    offset,
    cycle,
    angle,
  };
};

export const NODE_DEFINITIONS: WorkflowNodeDefinition[] = [
  {
    type: "geometryReference",
    label: "Geometry Reference",
    shortLabel: "REF",
    description: "Reference existing geometry into the graph.",
    category: "data",
    iconId: "geometryReference",
    inputs: [],
    outputs: [
      {
        key: "geometry",
        label: "Geometry",
        type: "geometry",
        required: true,
      },
    ],
    parameters: [],
    primaryOutputKey: "geometry",
    compute: ({ parameters }) => ({
      geometry: typeof parameters.geometryId === "string" ? parameters.geometryId : null,
    }),
  },
  {
    type: "geometryViewer",
    label: "Geometry Viewer",
    shortLabel: "VIEW",
    description: "Preview geometry in a mini viewport.",
    category: "analysis",
    iconId: "geometryInfo",
    inputs: [
      {
        key: "geometry",
        label: "Geometry",
        type: "geometry",
        required: false,
      },
    ],
    outputs: [],
    parameters: [],
    compute: () => ({}),
  },
  {
    type: "origin",
    label: "Origin",
    shortLabel: "ORG",
    description: "Emit the world origin vector (0, 0, 0).",
    category: "basics",
    iconId: "origin",
    inputs: [],
    outputs: [{ key: "vector", label: "Origin", type: "vector" }],
    parameters: [],
    primaryOutputKey: "vector",
    compute: () => ({ vector: ZERO_VEC3 }),
  },
  {
    type: "unitX",
    label: "Unit X",
    shortLabel: "X",
    description: "Emit the unit X axis vector.",
    category: "basics",
    iconId: "unitX",
    inputs: [],
    outputs: [{ key: "vector", label: "X", type: "vector" }],
    parameters: [],
    primaryOutputKey: "vector",
    compute: () => ({ vector: UNIT_X_VEC3 }),
  },
  {
    type: "unitY",
    label: "Unit Y",
    shortLabel: "Y",
    description: "Emit the unit Y axis vector.",
    category: "basics",
    iconId: "unitY",
    inputs: [],
    outputs: [{ key: "vector", label: "Y", type: "vector" }],
    parameters: [],
    primaryOutputKey: "vector",
    compute: () => ({ vector: UNIT_Y_VEC3 }),
  },
  {
    type: "unitZ",
    label: "Unit Z",
    shortLabel: "Z",
    description: "Emit the unit Z axis vector.",
    category: "basics",
    iconId: "unitZ",
    inputs: [],
    outputs: [{ key: "vector", label: "Z", type: "vector" }],
    parameters: [],
    primaryOutputKey: "vector",
    compute: () => ({ vector: UNIT_Z_VEC3 }),
  },
  {
    type: "unitXYZ",
    label: "Unit XYZ",
    shortLabel: "XYZ",
    description: "Emit a unit vector with all components equal to one.",
    category: "basics",
    iconId: "unitXYZ",
    inputs: [],
    outputs: [{ key: "vector", label: "XYZ", type: "vector" }],
    parameters: [],
    primaryOutputKey: "vector",
    compute: () => ({ vector: UNIT_XYZ_VEC3 }),
  },
  {
    type: "moveVector",
    label: "Move Vector",
    shortLabel: "MOVE",
    description: "Move a vector by an offset vector.",
    category: "basics",
    iconId: "movePoint",
    inputs: [
      { key: "vector", label: "Vector", type: "vector", required: true },
      { key: "offset", label: "Offset", type: "vector", required: true },
    ],
    outputs: [
      { key: "vector", label: "Vector", type: "vector" },
      { key: "offset", label: "Offset", type: "vector" },
    ],
    parameters: [
      ...vectorParameterSpecs("vector", "Vector", ZERO_VEC3),
      ...vectorParameterSpecs("offset", "Offset", UNIT_X_VEC3),
    ],
    primaryOutputKey: "vector",
    compute: ({ inputs, parameters }) => {
      const vector = resolveVectorInput(inputs, parameters, "vector", "vector", ZERO_VEC3);
      const offset = resolveVectorInput(inputs, parameters, "offset", "offset", UNIT_X_VEC3);
      return {
        vector: addVec3(vector, offset),
        offset,
      };
    },
  },
  {
    type: "scaleVector",
    label: "Scale Vector",
    shortLabel: "SCL",
    description: "Scale a vector by a scalar multiplier.",
    category: "basics",
    iconId: "vectorScale",
    inputs: [
      { key: "vector", label: "Vector", type: "vector", required: true },
      {
        key: "scale",
        label: "Scale",
        type: "number",
        parameterKey: "scale",
        defaultValue: 1,
      },
    ],
    outputs: [
      { key: "vector", label: "Vector", type: "vector" },
      { key: "scale", label: "Scale", type: "number" },
    ],
    parameters: [
      ...vectorParameterSpecs("vector", "Vector", UNIT_X_VEC3),
      {
        key: "scale",
        label: "Scale",
        type: "number",
        defaultValue: 1,
        step: 0.1,
      },
    ],
    primaryOutputKey: "vector",
    compute: ({ inputs, parameters }) => {
      const vector = resolveVectorInput(inputs, parameters, "vector", "vector", UNIT_X_VEC3);
      const scale = toNumber(inputs.scale, readNumberParameter(parameters, "scale", 1));
      return {
        vector: scaleVec3(vector, scale),
        scale,
      };
    },
  },
  {
    type: "listCreate",
    label: "List Create",
    shortLabel: "LIST",
    description: "Collect values into a list for downstream data operations.",
    category: "lists",
    iconId: "listCreate",
    inputs: [
      {
        key: "items",
        label: "Items",
        type: "any",
        allowMultiple: true,
        description: "Connect values to gather into the list.",
      },
    ],
    outputs: [
      {
        key: "list",
        label: "List",
        type: "any",
      },
      {
        key: "count",
        label: "Count",
        type: "number",
      },
    ],
    parameters: [
      {
        key: "itemsText",
        label: "Items",
        type: "string",
        defaultValue: "0, 1, 2",
        description: "Comma or newline separated values.",
      },
    ],
    primaryOutputKey: "list",
    compute: ({ inputs, parameters }) => {
      const connectedItems = toList(inputs.items);
      const hasConnectedItems = connectedItems.length > 0;
      const parsedItems = parseListText(
        typeof parameters.itemsText === "string" ? parameters.itemsText : ""
      );
      const list = hasConnectedItems ? connectedItems : parsedItems;
      return {
        list,
        count: list.length,
      };
    },
  },
  {
    type: "listLength",
    label: "List Length",
    shortLabel: "LEN",
    description: "Return the number of items in a list.",
    category: "lists",
    iconId: "listLength",
    inputs: [
      {
        key: "list",
        label: "List",
        type: "any",
        required: true,
      },
    ],
    outputs: [
      {
        key: "length",
        label: "Length",
        type: "number",
      },
    ],
    parameters: [],
    primaryOutputKey: "length",
    compute: ({ inputs }) => ({
      length: toList(inputs.list).length,
    }),
  },
  {
    type: "listItem",
    label: "List Item",
    shortLabel: "ITEM",
    description: "Pick a single item by index with clamp or wrap behavior.",
    category: "lists",
    iconId: "listItem",
    inputs: [
      {
        key: "list",
        label: "List",
        type: "any",
        required: true,
      },
      {
        key: "index",
        label: "Index",
        type: "number",
        parameterKey: "index",
        defaultValue: 0,
      },
    ],
    outputs: [
      { key: "item", label: "Item", type: "any" },
      { key: "index", label: "Index", type: "number" },
      { key: "length", label: "Length", type: "number" },
    ],
    parameters: [
      {
        key: "index",
        label: "Index",
        type: "number",
        defaultValue: 0,
        step: 1,
      },
      {
        key: "wrap",
        label: "Wrap",
        type: "boolean",
        defaultValue: false,
        description: "Wrap the index rather than clamping it.",
      },
    ],
    primaryOutputKey: "item",
    compute: ({ inputs, parameters }) => {
      const list = toList(inputs.list);
      const length = list.length;
      if (length === 0) {
        return { item: null, index: -1, length: 0 };
      }
      const rawIndex = toNumber(inputs.index, readNumberParameter(parameters, "index", 0));
      const wrap = readBooleanParameter(parameters, "wrap", false);
      let index = Math.floor(rawIndex);
      if (wrap) {
        index = ((index % length) + length) % length;
      } else {
        index = clampInt(index, 0, length - 1, 0);
      }
      return {
        item: list[index] ?? null,
        index,
        length,
      };
    },
  },
  {
    type: "listIndexOf",
    label: "List Index Of",
    shortLabel: "FIND",
    description: "Find the index of an item in a list using deep comparison.",
    category: "lists",
    iconId: "listIndexOf",
    inputs: [
      { key: "list", label: "List", type: "any", required: true },
      {
        key: "item",
        label: "Item",
        type: "any",
        parameterKey: "itemText",
        defaultValue: "0",
      },
    ],
    outputs: [
      { key: "index", label: "Index", type: "number" },
      { key: "found", label: "Found", type: "boolean" },
      { key: "item", label: "Item", type: "any" },
    ],
    parameters: [
      {
        key: "itemText",
        label: "Item",
        type: "string",
        defaultValue: "0",
        description: "Used when no Item input is connected.",
      },
    ],
    primaryOutputKey: "index",
    compute: ({ inputs, parameters }) => {
      const list = toList(inputs.list);
      const parameterItem = parseListToken(
        typeof parameters.itemText === "string" ? parameters.itemText : ""
      );
      const target = inputs.item ?? parameterItem;
      const index = list.findIndex((entry) => deepEqualWorkflowValue(entry, target));
      return {
        index,
        found: index >= 0,
        item: target,
      };
    },
  },
  {
    type: "listPartition",
    label: "List Partition",
    shortLabel: "PART",
    description: "Split a list into partitions of fixed size and step.",
    category: "lists",
    iconId: "listPartition",
    inputs: [
      { key: "list", label: "List", type: "any", required: true },
      {
        key: "size",
        label: "Size",
        type: "number",
        parameterKey: "size",
        defaultValue: 3,
      },
      {
        key: "step",
        label: "Step",
        type: "number",
        parameterKey: "step",
        defaultValue: 3,
      },
    ],
    outputs: [
      { key: "partitions", label: "Partitions", type: "any" },
      { key: "count", label: "Count", type: "number" },
      { key: "size", label: "Size", type: "number" },
    ],
    parameters: [
      { key: "size", label: "Size", type: "number", defaultValue: 3, step: 1, min: 1 },
      { key: "step", label: "Step", type: "number", defaultValue: 3, step: 1, min: 1 },
      {
        key: "keepRemainder",
        label: "Keep Remainder",
        type: "boolean",
        defaultValue: true,
      },
    ],
    primaryOutputKey: "partitions",
    compute: ({ inputs, parameters }) => {
      const list = toList(inputs.list);
      if (list.length === 0) {
        return { partitions: [], count: 0, size: 0 };
      }
      const rawSize = toNumber(inputs.size, readNumberParameter(parameters, "size", 3));
      const rawStep = toNumber(inputs.step, readNumberParameter(parameters, "step", rawSize));
      const size = clampInt(rawSize, 1, 256, 3);
      const step = clampInt(rawStep, 1, 256, size);
      const keepRemainder = readBooleanParameter(parameters, "keepRemainder", true);

      const partitions: WorkflowValue[] = [];
      for (let i = 0; i < list.length; i += step) {
        const chunk = list.slice(i, i + size);
        if (chunk.length === size || keepRemainder) {
          partitions.push(chunk);
        }
      }

      return {
        partitions,
        count: partitions.length,
        size,
      };
    },
  },
  {
    type: "listFlatten",
    label: "List Flatten",
    shortLabel: "FLAT",
    description: "Flatten nested lists by a specified depth.",
    category: "lists",
    iconId: "listFlatten",
    inputs: [
      { key: "list", label: "List", type: "any", required: true },
      {
        key: "depth",
        label: "Depth",
        type: "number",
        parameterKey: "depth",
        defaultValue: 2,
      },
    ],
    outputs: [
      { key: "list", label: "List", type: "any" },
      { key: "length", label: "Length", type: "number" },
      { key: "depth", label: "Depth", type: "number" },
    ],
    parameters: [
      {
        key: "depth",
        label: "Depth",
        type: "number",
        defaultValue: 2,
        step: 1,
        min: 1,
      },
    ],
    primaryOutputKey: "list",
    compute: ({ inputs, parameters }) => {
      const rawDepth = toNumber(inputs.depth, readNumberParameter(parameters, "depth", 2));
      const depth = clampInt(rawDepth, 1, 16, 2);
      const list = flattenList(inputs.list, depth);
      return {
        list,
        length: list.length,
        depth,
      };
    },
  },
  {
    type: "listSlice",
    label: "List Slice",
    shortLabel: "SLICE",
    description: "Extract a slice of a list with start, end, and step.",
    category: "lists",
    iconId: "listSlice",
    inputs: [
      { key: "list", label: "List", type: "any", required: true },
      {
        key: "start",
        label: "Start",
        type: "number",
        parameterKey: "start",
        defaultValue: 0,
      },
      {
        key: "end",
        label: "End",
        type: "number",
        parameterKey: "end",
        defaultValue: -1,
      },
      {
        key: "step",
        label: "Step",
        type: "number",
        parameterKey: "step",
        defaultValue: 1,
      },
    ],
    outputs: [
      { key: "list", label: "List", type: "any" },
      { key: "length", label: "Length", type: "number" },
      { key: "start", label: "Start", type: "number" },
      { key: "end", label: "End", type: "number" },
      { key: "step", label: "Step", type: "number" },
    ],
    parameters: [
      { key: "start", label: "Start", type: "number", defaultValue: 0, step: 1 },
      { key: "end", label: "End", type: "number", defaultValue: -1, step: 1 },
      { key: "step", label: "Step", type: "number", defaultValue: 1, step: 1, min: 1 },
    ],
    primaryOutputKey: "list",
    compute: ({ inputs, parameters }) => {
      const list = toList(inputs.list);
      if (list.length === 0) {
        return { list: [], length: 0, start: 0, end: 0, step: 1 };
      }

      const resolveIndex = (value: number, fallback: number) => {
        const numeric = Number.isFinite(value) ? Math.floor(value) : fallback;
        if (numeric < 0) {
          return Math.max(0, list.length + numeric);
        }
        return Math.min(list.length, Math.max(0, numeric));
      };

      const rawStart = toNumber(inputs.start, readNumberParameter(parameters, "start", 0));
      const rawEnd = toNumber(inputs.end, readNumberParameter(parameters, "end", -1));
      const rawStep = toNumber(inputs.step, readNumberParameter(parameters, "step", 1));

      const start = resolveIndex(rawStart, 0);
      const end = rawEnd < 0 ? list.length : resolveIndex(rawEnd, list.length);
      const step = clampInt(rawStep, 1, 1024, 1);

      const sliced: WorkflowValue[] = [];
      for (let i = start; i < end; i += step) {
        sliced.push(list[i]);
      }

      return {
        list: sliced,
        length: sliced.length,
        start,
        end,
        step,
      };
    },
  },
  {
    type: "listReverse",
    label: "List Reverse",
    shortLabel: "REV",
    description: "Reverse the order of items in a list.",
    category: "lists",
    iconId: "listReverse",
    inputs: [
      { key: "list", label: "List", type: "any", required: true },
    ],
    outputs: [
      { key: "list", label: "List", type: "any" },
      { key: "length", label: "Length", type: "number" },
    ],
    parameters: [],
    primaryOutputKey: "list",
    compute: ({ inputs }) => {
      const list = [...toList(inputs.list)].reverse();
      return {
        list,
        length: list.length,
      };
    },
  },
  {
    type: "range",
    label: "Range",
    shortLabel: "RNG",
    description: "Generate a numeric sequence from Start to End using Step.",
    category: "ranges",
    iconId: "range",
    inputs: [
      {
        key: "start",
        label: "Start",
        type: "number",
        parameterKey: "start",
        defaultValue: 0,
      },
      {
        key: "end",
        label: "End",
        type: "number",
        parameterKey: "end",
        defaultValue: 10,
      },
      {
        key: "step",
        label: "Step",
        type: "number",
        parameterKey: "step",
        defaultValue: 1,
      },
    ],
    outputs: [
      { key: "list", label: "List", type: "any" },
      { key: "count", label: "Count", type: "number" },
      { key: "step", label: "Step", type: "number" },
    ],
    parameters: [
      { key: "start", label: "Start", type: "number", defaultValue: 0, step: 1 },
      { key: "end", label: "End", type: "number", defaultValue: 10, step: 1 },
      { key: "step", label: "Step", type: "number", defaultValue: 1, step: 0.5 },
    ],
    primaryOutputKey: "list",
    compute: ({ inputs, parameters }) => {
      const start = toNumber(inputs.start, readNumberParameter(parameters, "start", 0));
      const end = toNumber(inputs.end, readNumberParameter(parameters, "end", 10));
      const step = toNumber(inputs.step, readNumberParameter(parameters, "step", 1));
      if (Math.abs(step) <= EPSILON) {
        throw new Error("Range step cannot be zero.");
      }

      const list: WorkflowValue[] = [];
      const forward = step > 0;
      let value = start;
      while (
        list.length < MAX_LIST_ITEMS &&
        (forward ? value <= end + EPSILON : value >= end - EPSILON)
      ) {
        list.push(value);
        value += step;
      }

      return {
        list,
        count: list.length,
        step,
      };
    },
  },
  {
    type: "linspace",
    label: "Linspace",
    shortLabel: "LIN",
    description: "Generate evenly spaced values between Start and End.",
    category: "ranges",
    iconId: "linspace",
    inputs: [
      {
        key: "start",
        label: "Start",
        type: "number",
        parameterKey: "start",
        defaultValue: 0,
      },
      {
        key: "end",
        label: "End",
        type: "number",
        parameterKey: "end",
        defaultValue: 1,
      },
      {
        key: "count",
        label: "Count",
        type: "number",
        parameterKey: "count",
        defaultValue: 5,
      },
    ],
    outputs: [
      { key: "list", label: "List", type: "any" },
      { key: "count", label: "Count", type: "number" },
      { key: "step", label: "Step", type: "number" },
    ],
    parameters: [
      { key: "start", label: "Start", type: "number", defaultValue: 0, step: 0.5 },
      { key: "end", label: "End", type: "number", defaultValue: 1, step: 0.5 },
      { key: "count", label: "Count", type: "number", defaultValue: 5, step: 1, min: 1 },
    ],
    primaryOutputKey: "list",
    compute: ({ inputs, parameters }) => {
      const start = toNumber(inputs.start, readNumberParameter(parameters, "start", 0));
      const end = toNumber(inputs.end, readNumberParameter(parameters, "end", 1));
      const count = clampInt(
        toNumber(inputs.count, readNumberParameter(parameters, "count", 5)),
        1,
        MAX_LIST_ITEMS,
        5
      );
      if (count <= 1) {
        return { list: [start], count: 1, step: 0 };
      }
      const step = (end - start) / (count - 1);
      const list: WorkflowValue[] = [];
      for (let i = 0; i < count; i += 1) {
        list.push(start + step * i);
      }
      return {
        list,
        count,
        step,
      };
    },
  },
  {
    type: "remap",
    label: "Remap",
    shortLabel: "MAP",
    description: "Remap a value from one range to another.",
    category: "ranges",
    iconId: "remap",
    inputs: [
      {
        key: "value",
        label: "Value",
        type: "number",
        parameterKey: "value",
        defaultValue: 0,
      },
      {
        key: "sourceMin",
        label: "From Min",
        type: "number",
        parameterKey: "sourceMin",
        defaultValue: 0,
      },
      {
        key: "sourceMax",
        label: "From Max",
        type: "number",
        parameterKey: "sourceMax",
        defaultValue: 1,
      },
      {
        key: "targetMin",
        label: "To Min",
        type: "number",
        parameterKey: "targetMin",
        defaultValue: 0,
      },
      {
        key: "targetMax",
        label: "To Max",
        type: "number",
        parameterKey: "targetMax",
        defaultValue: 10,
      },
    ],
    outputs: [
      { key: "value", label: "Value", type: "number" },
      { key: "t", label: "T", type: "number" },
    ],
    parameters: [
      { key: "value", label: "Value", type: "number", defaultValue: 0, step: 0.1 },
      { key: "sourceMin", label: "From Min", type: "number", defaultValue: 0, step: 0.1 },
      { key: "sourceMax", label: "From Max", type: "number", defaultValue: 1, step: 0.1 },
      { key: "targetMin", label: "To Min", type: "number", defaultValue: 0, step: 0.1 },
      { key: "targetMax", label: "To Max", type: "number", defaultValue: 10, step: 0.1 },
      {
        key: "clamp",
        label: "Clamp",
        type: "boolean",
        defaultValue: true,
      },
    ],
    primaryOutputKey: "value",
    compute: ({ inputs, parameters }) => {
      const value = toNumber(inputs.value, readNumberParameter(parameters, "value", 0));
      const sourceMin = toNumber(
        inputs.sourceMin,
        readNumberParameter(parameters, "sourceMin", 0)
      );
      const sourceMax = toNumber(
        inputs.sourceMax,
        readNumberParameter(parameters, "sourceMax", 1)
      );
      const targetMin = toNumber(
        inputs.targetMin,
        readNumberParameter(parameters, "targetMin", 0)
      );
      const targetMax = toNumber(
        inputs.targetMax,
        readNumberParameter(parameters, "targetMax", 10)
      );
      if (Math.abs(sourceMax - sourceMin) <= EPSILON) {
        throw new Error("Remap source range cannot be zero.");
      }
      let t = (value - sourceMin) / (sourceMax - sourceMin);
      const clamp = readBooleanParameter(parameters, "clamp", true);
      if (clamp) {
        t = clampNumber(t, 0, 1);
      }
      const mapped = targetMin + (targetMax - targetMin) * t;
      return {
        value: mapped,
        t,
      };
    },
  },
  {
    type: "random",
    label: "Random",
    shortLabel: "RAND",
    description: "Emit a deterministic random number from a seed.",
    category: "ranges",
    iconId: "random",
    inputs: [
      {
        key: "seed",
        label: "Seed",
        type: "number",
        parameterKey: "seed",
        defaultValue: 1,
      },
      {
        key: "min",
        label: "Min",
        type: "number",
        parameterKey: "min",
        defaultValue: 0,
      },
      {
        key: "max",
        label: "Max",
        type: "number",
        parameterKey: "max",
        defaultValue: 1,
      },
    ],
    outputs: [
      { key: "value", label: "Value", type: "number" },
      { key: "raw", label: "Raw", type: "number" },
    ],
    parameters: [
      { key: "seed", label: "Seed", type: "number", defaultValue: 1, step: 1 },
      { key: "min", label: "Min", type: "number", defaultValue: 0, step: 0.1 },
      { key: "max", label: "Max", type: "number", defaultValue: 1, step: 0.1 },
    ],
    primaryOutputKey: "value",
    compute: ({ inputs, parameters, context }) => {
      const seedValue = toNumber(inputs.seed, readNumberParameter(parameters, "seed", 1));
      const min = toNumber(inputs.min, readNumberParameter(parameters, "min", 0));
      const max = toNumber(inputs.max, readNumberParameter(parameters, "max", 1));
      const seedKey = `${context.nodeId}:${seedValue}`;
      const random = createSeededRandom(hashStringToSeed(seedKey));
      const raw = random();
      const value = min + raw * (max - min);
      return {
        value,
        raw,
      };
    },
  },
  {
    type: "repeat",
    label: "Repeat",
    shortLabel: "REP",
    description: "Repeat a value a specified number of times.",
    category: "ranges",
    iconId: "repeat",
    inputs: [
      {
        key: "value",
        label: "Value",
        type: "any",
        parameterKey: "valueText",
        defaultValue: 0,
      },
      {
        key: "count",
        label: "Count",
        type: "number",
        parameterKey: "count",
        defaultValue: 5,
      },
    ],
    outputs: [
      { key: "list", label: "List", type: "any" },
      { key: "count", label: "Count", type: "number" },
    ],
    parameters: [
      {
        key: "valueText",
        label: "Value",
        type: "string",
        defaultValue: "0",
      },
      {
        key: "count",
        label: "Count",
        type: "number",
        defaultValue: 5,
        min: 1,
        max: MAX_LIST_ITEMS,
        step: 1,
      },
    ],
    primaryOutputKey: "list",
    compute: ({ inputs, parameters }) => {
      const count = clampInt(
        toNumber(inputs.count, readNumberParameter(parameters, "count", 5)),
        1,
        MAX_LIST_ITEMS,
        5
      );
      const fallback = parseListToken(
        typeof parameters.valueText === "string" ? parameters.valueText : ""
      );
      const value = inputs.value ?? fallback;
      const list = Array.from({ length: count }, () => value);
      return {
        list,
        count,
      };
    },
  },
  {
    type: "listSum",
    label: "List Sum",
    shortLabel: "SUM",
    description: "Sum numeric values from a list.",
    category: "analysis",
    iconId: "listSum",
    inputs: [{ key: "list", label: "List", type: "any", required: true }],
    outputs: [
      { key: "sum", label: "Sum", type: "number" },
      { key: "count", label: "Count", type: "number" },
    ],
    parameters: [],
    primaryOutputKey: "sum",
    compute: ({ inputs }) => {
      const values = toNumericList(inputs.list);
      const sum = values.reduce((acc, value) => acc + value, 0);
      return { sum, count: values.length };
    },
  },
  {
    type: "listAverage",
    label: "List Average",
    shortLabel: "AVG",
    description: "Average numeric values from a list.",
    category: "analysis",
    iconId: "listAverage",
    inputs: [{ key: "list", label: "List", type: "any", required: true }],
    outputs: [
      { key: "average", label: "Average", type: "number" },
      { key: "sum", label: "Sum", type: "number" },
      { key: "count", label: "Count", type: "number" },
    ],
    parameters: [],
    primaryOutputKey: "average",
    compute: ({ inputs }) => {
      const values = toNumericList(inputs.list);
      const sum = values.reduce((acc, value) => acc + value, 0);
      const count = values.length;
      return {
        average: count > 0 ? sum / count : 0,
        sum,
        count,
      };
    },
  },
  {
    type: "listMin",
    label: "List Min",
    shortLabel: "MIN",
    description: "Find the minimum numeric value in a list.",
    category: "analysis",
    iconId: "listMin",
    inputs: [{ key: "list", label: "List", type: "any", required: true }],
    outputs: [
      { key: "min", label: "Min", type: "number" },
      { key: "count", label: "Count", type: "number" },
    ],
    parameters: [],
    primaryOutputKey: "min",
    compute: ({ inputs }) => {
      const values = toNumericList(inputs.list);
      if (values.length === 0) {
        return { min: 0, count: 0 };
      }
      return { min: Math.min(...values), count: values.length };
    },
  },
  {
    type: "listMax",
    label: "List Max",
    shortLabel: "MAX",
    description: "Find the maximum numeric value in a list.",
    category: "analysis",
    iconId: "listMax",
    inputs: [{ key: "list", label: "List", type: "any", required: true }],
    outputs: [
      { key: "max", label: "Max", type: "number" },
      { key: "count", label: "Count", type: "number" },
    ],
    parameters: [],
    primaryOutputKey: "max",
    compute: ({ inputs }) => {
      const values = toNumericList(inputs.list);
      if (values.length === 0) {
        return { max: 0, count: 0 };
      }
      return { max: Math.max(...values), count: values.length };
    },
  },
  {
    type: "listMedian",
    label: "List Median",
    shortLabel: "MED",
    description: "Find the median numeric value in a list.",
    category: "analysis",
    iconId: "listMedian",
    inputs: [{ key: "list", label: "List", type: "any", required: true }],
    outputs: [
      { key: "median", label: "Median", type: "number" },
      { key: "count", label: "Count", type: "number" },
    ],
    parameters: [],
    primaryOutputKey: "median",
    compute: ({ inputs }) => {
      const values = toNumericList(inputs.list);
      const count = values.length;
      if (count === 0) {
        return { median: 0, count: 0 };
      }
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(count / 2);
      const median =
        count % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      return { median, count };
    },
  },
  {
    type: "listStdDev",
    label: "List Std Dev",
    shortLabel: "STD",
    description: "Compute the population standard deviation of a list.",
    category: "analysis",
    iconId: "listStdDev",
    inputs: [{ key: "list", label: "List", type: "any", required: true }],
    outputs: [
      { key: "stdDev", label: "Std Dev", type: "number" },
      { key: "variance", label: "Variance", type: "number" },
      { key: "count", label: "Count", type: "number" },
    ],
    parameters: [],
    primaryOutputKey: "stdDev",
    compute: ({ inputs }) => {
      const values = toNumericList(inputs.list);
      const count = values.length;
      if (count === 0) {
        return { stdDev: 0, variance: 0, count: 0 };
      }
      const mean = values.reduce((acc, value) => acc + value, 0) / count;
      const variance =
        values.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / count;
      return {
        stdDev: Math.sqrt(variance),
        variance,
        count,
      };
    },
  },
  {
    type: "geometryInfo",
    label: "Geometry Info",
    shortLabel: "INFO",
    description: "Summarize geometry type and core element counts.",
    category: "analysis",
    iconId: "geometryInfo",
    inputs: [{ key: "geometry", label: "Geometry", type: "geometry", required: true }],
    outputs: [
      { key: "type", label: "Type", type: "string" },
      { key: "vertexCount", label: "Vertices", type: "number" },
      { key: "edgeCount", label: "Edges", type: "number" },
      { key: "faceCount", label: "Faces", type: "number" },
      { key: "controlPointCount", label: "Control Pts", type: "number" },
      { key: "normalCount", label: "Normals", type: "number" },
    ],
    parameters: [],
    primaryOutputKey: "vertexCount",
    compute: ({ inputs, context }) => {
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return {
          type: "None",
          vertexCount: 0,
          edgeCount: 0,
          faceCount: 0,
          controlPointCount: 0,
          normalCount: 0,
        };
      }
      const vertexCount = countGeometryVertices(geometry, context);
      const edgeCount = countGeometryEdges(geometry, context);
      const faceCount = countGeometryFaces(geometry);
      const normalCount = countGeometryNormals(geometry);
      const controlPointCount = countGeometryControlPoints(geometry, context);
      return {
        type: geometry.type,
        vertexCount,
        edgeCount,
        faceCount,
        controlPointCount,
        normalCount,
      };
    },
  },
  {
    type: "geometryVertices",
    label: "Geometry Vertices",
    shortLabel: "VERT",
    description: "Extract vertex positions from geometry as a list.",
    category: "analysis",
    iconId: "geometryVertices",
    inputs: [{ key: "geometry", label: "Geometry", type: "geometry", required: true }],
    outputs: [
      { key: "vertices", label: "Vertices", type: "any" },
      { key: "count", label: "Count", type: "number" },
    ],
    parameters: [],
    primaryOutputKey: "vertices",
    compute: ({ inputs, context }) => {
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return {
          vertices: [],
          count: 0,
        };
      }
      const vertices = collectGeometryVertices(geometry, context, MAX_LIST_ITEMS);
      return {
        vertices,
        count: vertices.length,
      };
    },
  },
  {
    type: "geometryEdges",
    label: "Geometry Edges",
    shortLabel: "EDGE",
    description: "Extract edge segments as vector pairs.",
    category: "analysis",
    iconId: "geometryEdges",
    inputs: [{ key: "geometry", label: "Geometry", type: "geometry", required: true }],
    outputs: [
      { key: "edges", label: "Edges", type: "any" },
      { key: "count", label: "Count", type: "number" },
    ],
    parameters: [],
    primaryOutputKey: "edges",
    compute: ({ inputs, context }) => {
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return {
          edges: [],
          count: 0,
        };
      }
      const edges = collectGeometryEdges(geometry, context, MAX_LIST_ITEMS);
      return {
        edges,
        count: edges.length,
      };
    },
  },
  {
    type: "geometryFaces",
    label: "Geometry Faces",
    shortLabel: "FACE",
    description: "Extract face centroids from mesh geometry.",
    category: "analysis",
    iconId: "geometryFaces",
    inputs: [{ key: "geometry", label: "Geometry", type: "geometry", required: true }],
    outputs: [
      { key: "faces", label: "Faces", type: "any" },
      { key: "count", label: "Count", type: "number" },
    ],
    parameters: [],
    primaryOutputKey: "faces",
    compute: ({ inputs, context }) => {
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return {
          faces: [],
          count: 0,
        };
      }
      const faces = collectGeometryFaceCentroids(geometry, MAX_LIST_ITEMS);
      return {
        faces,
        count: faces.length,
      };
    },
  },
  {
    type: "geometryNormals",
    label: "Geometry Normals",
    shortLabel: "NORM",
    description: "Extract normals from mesh geometry.",
    category: "analysis",
    iconId: "geometryNormals",
    inputs: [{ key: "geometry", label: "Geometry", type: "geometry", required: true }],
    outputs: [
      { key: "normals", label: "Normals", type: "any" },
      { key: "count", label: "Count", type: "number" },
    ],
    parameters: [],
    primaryOutputKey: "normals",
    compute: ({ inputs, context }) => {
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return {
          normals: [],
          count: 0,
        };
      }
      const normals = collectGeometryNormals(geometry, MAX_LIST_ITEMS);
      return {
        normals,
        count: normals.length,
      };
    },
  },
  {
    type: "geometryControlPoints",
    label: "Control Points",
    shortLabel: "CTRL",
    description: "Extract control points or defining points from geometry.",
    category: "analysis",
    iconId: "geometryControlPoints",
    inputs: [{ key: "geometry", label: "Geometry", type: "geometry", required: true }],
    outputs: [
      { key: "points", label: "Points", type: "any" },
      { key: "count", label: "Count", type: "number" },
    ],
    parameters: [],
    primaryOutputKey: "points",
    compute: ({ inputs, context }) => {
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return {
          points: [],
          count: 0,
        };
      }
      const points = collectGeometryControlPoints(geometry, context, MAX_LIST_ITEMS);
      return {
        points,
        count: points.length,
      };
    },
  },
  {
    type: "sineWave",
    label: "Sine Wave",
    shortLabel: "SIN",
    description: "Generate a sine wave signal.",
    category: "signals",
    iconId: "sineWave",
    inputs: baseWaveInputPorts(),
    outputs: [
      { key: "value", label: "Value", type: "number" },
      { key: "t", label: "T", type: "number" },
    ],
    parameters: baseWaveParameterSpecs(),
    primaryOutputKey: "value",
    compute: ({ inputs, parameters }) => {
      const { t, amplitude, offset, angle } = resolveWaveInputs(inputs, parameters);
      return {
        value: offset + amplitude * Math.sin(angle),
        t,
      };
    },
  },
  {
    type: "cosineWave",
    label: "Cosine Wave",
    shortLabel: "COS",
    description: "Generate a cosine wave signal.",
    category: "signals",
    iconId: "cosineWave",
    inputs: baseWaveInputPorts(),
    outputs: [
      { key: "value", label: "Value", type: "number" },
      { key: "t", label: "T", type: "number" },
    ],
    parameters: baseWaveParameterSpecs(),
    primaryOutputKey: "value",
    compute: ({ inputs, parameters }) => {
      const { t, amplitude, offset, angle } = resolveWaveInputs(inputs, parameters);
      return {
        value: offset + amplitude * Math.cos(angle),
        t,
      };
    },
  },
  {
    type: "sawtoothWave",
    label: "Sawtooth Wave",
    shortLabel: "SAW",
    description: "Generate a sawtooth wave signal in the -1 to 1 range.",
    category: "signals",
    iconId: "sawtoothWave",
    inputs: baseWaveInputPorts(),
    outputs: [
      { key: "value", label: "Value", type: "number" },
      { key: "t", label: "T", type: "number" },
    ],
    parameters: baseWaveParameterSpecs(),
    primaryOutputKey: "value",
    compute: ({ inputs, parameters }) => {
      const { t, amplitude, offset, cycle } = resolveWaveInputs(inputs, parameters);
      const frac = cycle - Math.floor(cycle);
      const raw = frac * 2 - 1;
      return {
        value: offset + amplitude * raw,
        t,
      };
    },
  },
  {
    type: "triangleWave",
    label: "Triangle Wave",
    shortLabel: "TRI",
    description: "Generate a triangle wave signal in the -1 to 1 range.",
    category: "signals",
    iconId: "triangleWave",
    inputs: baseWaveInputPorts(),
    outputs: [
      { key: "value", label: "Value", type: "number" },
      { key: "t", label: "T", type: "number" },
    ],
    parameters: baseWaveParameterSpecs(),
    primaryOutputKey: "value",
    compute: ({ inputs, parameters }) => {
      const { t, amplitude, offset, cycle } = resolveWaveInputs(inputs, parameters);
      const frac = cycle - Math.floor(cycle);
      const raw = 1 - 4 * Math.abs(frac - 0.5);
      return {
        value: offset + amplitude * raw,
        t,
      };
    },
  },
  {
    type: "squareWave",
    label: "Square Wave",
    shortLabel: "SQR",
    description: "Generate a square wave signal with adjustable duty cycle.",
    category: "signals",
    iconId: "squareWave",
    inputs: [
      ...baseWaveInputPorts(),
      {
        key: "duty",
        label: "Duty",
        type: "number",
        parameterKey: "duty",
        defaultValue: 0.5,
      },
    ],
    outputs: [
      { key: "value", label: "Value", type: "number" },
      { key: "t", label: "T", type: "number" },
    ],
    parameters: [
      ...baseWaveParameterSpecs(),
      { key: "duty", label: "Duty", type: "number", defaultValue: 0.5, step: 0.05, min: 0, max: 1 },
    ],
    primaryOutputKey: "value",
    compute: ({ inputs, parameters }) => {
      const { t, amplitude, offset, cycle } = resolveWaveInputs(inputs, parameters);
      const duty = clampNumber(
        toNumber(inputs.duty, readNumberParameter(parameters, "duty", 0.5)),
        0,
        1
      );
      const frac = cycle - Math.floor(cycle);
      const raw = frac <= duty ? 1 : -1;
      return {
        value: offset + amplitude * raw,
        t,
      };
    },
  },
  {
    type: "point",
    label: "Point Generator",
    shortLabel: "PT",
    description: "Create a point from coordinates.",
    category: "primitives",
    iconId: "pointGenerator",
    inputs: [],
    outputs: [
      {
        key: "geometry",
        label: "Point",
        type: "geometry",
        required: true,
      },
    ],
    parameters: [],
    primaryOutputKey: "geometry",
    compute: ({ parameters }) => ({
      geometry: typeof parameters.geometryId === "string" ? parameters.geometryId : null,
    }),
  },
  {
    type: "line",
    label: "Line",
    shortLabel: "LN",
    description: "Create a straight line between two points.",
    category: "curves",
    iconId: "polyline",
    inputs: [],
    outputs: [
      {
        key: "geometry",
        label: "Line",
        type: "geometry",
        required: true,
      },
    ],
    parameters: [],
    primaryOutputKey: "geometry",
    compute: ({ parameters }) => ({
      geometry: typeof parameters.geometryId === "string" ? parameters.geometryId : null,
    }),
  },
  {
    type: "arc",
    label: "Arc",
    shortLabel: "ARC",
    description: "Create a circular arc through three points.",
    category: "curves",
    iconId: "arc",
    inputs: [],
    outputs: [
      {
        key: "geometry",
        label: "Arc",
        type: "geometry",
        required: true,
      },
    ],
    parameters: [],
    primaryOutputKey: "geometry",
    compute: ({ parameters }) => ({
      geometry: typeof parameters.geometryId === "string" ? parameters.geometryId : null,
    }),
  },
  {
    type: "curve",
    label: "Curve",
    shortLabel: "CRV",
    description: "Create a smooth curve through points.",
    category: "curves",
    iconId: "interpolate",
    inputs: [],
    outputs: [
      {
        key: "geometry",
        label: "Curve",
        type: "geometry",
        required: true,
      },
    ],
    parameters: [
      {
        key: "degree",
        label: "Degree",
        type: "number",
        defaultValue: 3,
        min: 1,
        max: 3,
        step: 1,
        description: "Curve degree (1=linear, 3=cubic).",
      },
      {
        key: "resolution",
        label: "Resolution",
        type: "number",
        defaultValue: 64,
        min: 16,
        max: 256,
        step: 4,
        description: "Number of sampled points for display.",
      },
      {
        key: "closed",
        label: "Closed",
        type: "boolean",
        defaultValue: false,
        description: "Close the curve into a loop.",
      },
    ],
    primaryOutputKey: "geometry",
    compute: ({ parameters }) => ({
      geometry: typeof parameters.geometryId === "string" ? parameters.geometryId : null,
    }),
  },
  {
    type: "polyline",
    label: "Polyline",
    shortLabel: "PL",
    description: "Connect points into a polyline.",
    category: "curves",
    iconId: "polyline",
    inputs: [],
    outputs: [
      {
        key: "geometry",
        label: "Polyline",
        type: "geometry",
        required: true,
      },
    ],
    parameters: [],
    primaryOutputKey: "geometry",
    compute: ({ parameters }) => ({
      geometry: typeof parameters.geometryId === "string" ? parameters.geometryId : null,
    }),
  },
  {
    type: "surface",
    label: "Surface",
    shortLabel: "SRF",
    description: "Generate a surface from boundary curves.",
    category: "surfaces",
    iconId: "surface",
    inputs: [],
    outputs: [
      {
        key: "geometry",
        label: "Surface",
        type: "geometry",
        required: true,
      },
    ],
    parameters: [],
    primaryOutputKey: "geometry",
    compute: ({ parameters }) => ({
      geometry: typeof parameters.geometryId === "string" ? parameters.geometryId : null,
    }),
  },
  {
    type: "box",
    label: "Box Builder",
    shortLabel: "BOX",
    description: "Create a box primitive.",
    category: "primitives",
    iconId: "boxBuilder",
    inputs: [],
    outputs: [
      { key: "geometry", label: "Box", type: "geometry", required: true },
      { key: "volume", label: "Volume", type: "number" },
    ],
    parameters: [],
    primaryOutputKey: "volume",
    compute: ({ parameters }) => {
      const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const width = readNumberParameter(parameters, "boxWidth", 0);
      const height = readNumberParameter(parameters, "boxHeight", 0);
      const depth = readNumberParameter(parameters, "boxDepth", 0);
      return {
        geometry: geometryId,
        volume: width * height * depth,
      };
    },
  },
  {
    type: "sphere",
    label: "Sphere",
    shortLabel: "SPH",
    description: "Create a sphere primitive.",
    category: "primitives",
    iconId: "sphere",
    inputs: [],
    outputs: [
      { key: "geometry", label: "Sphere", type: "geometry", required: true },
      { key: "volume", label: "Volume", type: "number" },
    ],
    parameters: [],
    primaryOutputKey: "volume",
    compute: ({ parameters }) => {
      const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const radius = readNumberParameter(parameters, "sphereRadius", 0);
      return {
        geometry: geometryId,
        volume: (4 / 3) * Math.PI * Math.pow(radius, 3),
      };
    },
  },
  {
    type: "topologyOptimize",
    label: "Topology Optimize",
    shortLabel: "TOPO",
    description: "Authoritative topology optimization settings and progress metadata.",
    category: "optimization",
    iconId: "topologyOptimize",
    inputs: [
      {
        key: "domain",
        label: "Domain",
        type: "geometry",
        description: "Optional design domain reference.",
      },
    ],
    outputs: [
      { key: "domain", label: "Domain", type: "geometry" },
      { key: "volumeFraction", label: "VF", type: "number" },
      { key: "penaltyExponent", label: "Penalty", type: "number" },
      { key: "filterRadius", label: "Radius", type: "number" },
      { key: "maxIterations", label: "Max Iter", type: "number" },
      { key: "convergenceTolerance", label: "Tolerance", type: "number" },
      { key: "iteration", label: "Iter", type: "number" },
      { key: "objective", label: "Objective", type: "number" },
      { key: "constraint", label: "Constraint", type: "number" },
      { key: "status", label: "Status", type: "string" },
    ],
    parameters: [
      {
        key: "volumeFraction",
        label: "Volume Fraction",
        type: "number",
        defaultValue: 0.4,
        min: 0.05,
        max: 0.95,
        step: 0.01,
      },
      {
        key: "penaltyExponent",
        label: "Penalty Exponent",
        type: "number",
        defaultValue: 3,
        min: 1,
        max: 6,
        step: 0.1,
      },
      {
        key: "filterRadius",
        label: "Filter Radius",
        type: "number",
        defaultValue: 1.5,
        min: 0,
        max: 8,
        step: 0.1,
      },
      {
        key: "maxIterations",
        label: "Max Iterations",
        type: "number",
        defaultValue: 80,
        min: 1,
        max: 400,
        step: 1,
      },
      {
        key: "convergenceTolerance",
        label: "Convergence Tolerance",
        type: "number",
        defaultValue: 0.001,
        min: 1e-6,
        max: 0.1,
        step: 0.0005,
      },
    ],
    primaryOutputKey: "volumeFraction",
    compute: ({ inputs, parameters }) => {
      const domain = typeof inputs.domain === "string" ? inputs.domain : null;
      return {
        domain,
        volumeFraction: readNumberParameter(parameters, "volumeFraction", 0.4),
        penaltyExponent: readNumberParameter(parameters, "penaltyExponent", 3),
        filterRadius: readNumberParameter(parameters, "filterRadius", 1.5),
        maxIterations: readNumberParameter(parameters, "maxIterations", 80),
        convergenceTolerance: readNumberParameter(parameters, "convergenceTolerance", 0.001),
        iteration: readNumberParameter(parameters, "iteration", 0),
        objective: readNumberParameter(parameters, "objective", 0),
        constraint: readNumberParameter(parameters, "constraint", 0),
        status: String(parameters.status ?? "idle"),
      };
    },
  },
  {
    type: "topologySolver",
    label: "Topology Solver",
    shortLabel: "SOLVE",
    description: "Fast density solver prototype for a geometry domain.",
    category: "optimization",
    iconId: "topologySolver",
    inputs: [
      { key: "domain", label: "Domain", type: "geometry", required: true },
      {
        key: "volumeFraction",
        label: "VF",
        type: "number",
        parameterKey: "volumeFraction",
        defaultValue: 0.4,
      },
      {
        key: "penaltyExponent",
        label: "Penalty",
        type: "number",
        parameterKey: "penaltyExponent",
        defaultValue: 3,
      },
      {
        key: "filterRadius",
        label: "Radius",
        type: "number",
        parameterKey: "filterRadius",
        defaultValue: 2,
      },
      {
        key: "iterations",
        label: "Iterations",
        type: "number",
        parameterKey: "iterations",
        defaultValue: 40,
      },
      {
        key: "resolution",
        label: "Resolution",
        type: "number",
        parameterKey: "resolution",
        defaultValue: 12,
      },
    ],
    outputs: [
      { key: "densityField", label: "Density", type: "any" },
      { key: "bestScore", label: "Best", type: "number" },
      { key: "objective", label: "Objective", type: "number" },
      { key: "constraint", label: "Constraint", type: "number" },
      { key: "iterations", label: "Iterations", type: "number" },
      { key: "resolution", label: "Resolution", type: "number" },
      { key: "status", label: "Status", type: "string" },
    ],
    parameters: [
      {
        key: "volumeFraction",
        label: "Volume Fraction",
        type: "number",
        defaultValue: 0.4,
        min: 0.05,
        max: 0.95,
        step: 0.01,
      },
      {
        key: "penaltyExponent",
        label: "Penalty Exponent",
        type: "number",
        defaultValue: 3,
        min: 1,
        max: 6,
        step: 0.1,
      },
      {
        key: "filterRadius",
        label: "Filter Radius",
        type: "number",
        defaultValue: 2,
        min: 0,
        max: 8,
        step: 0.1,
      },
      {
        key: "iterations",
        label: "Iterations",
        type: "number",
        defaultValue: 40,
        min: 1,
        max: 120,
        step: 1,
      },
      {
        key: "resolution",
        label: "Resolution",
        type: "number",
        defaultValue: 12,
        min: 4,
        max: 18,
        step: 1,
      },
    ],
    primaryOutputKey: "densityField",
    compute: ({ inputs, parameters, context }) => {
      const domainId = typeof inputs.domain === "string" ? inputs.domain : null;
      const volumeFraction = toNumber(
        inputs.volumeFraction,
        readNumberParameter(parameters, "volumeFraction", 0.4)
      );
      const penaltyExponent = toNumber(
        inputs.penaltyExponent,
        readNumberParameter(parameters, "penaltyExponent", 3)
      );
      const filterRadius = toNumber(
        inputs.filterRadius,
        readNumberParameter(parameters, "filterRadius", 2)
      );
      const iterations = toNumber(
        inputs.iterations,
        readNumberParameter(parameters, "iterations", 40)
      );
      const resolution = toNumber(
        inputs.resolution,
        readNumberParameter(parameters, "resolution", 12)
      );

      if (!domainId) {
        return {
          densityField: [],
          bestScore: 0,
          objective: 1,
          constraint: 0,
          iterations: 0,
          resolution: clampInt(resolution, 4, 18, 12),
          status: "waiting-for-domain",
        };
      }

      const result = runTopologyDensitySolver({
        seedKey: `${context.nodeId}:${domainId}`,
        resolution,
        volumeFraction,
        penaltyExponent,
        filterRadius,
        iterations,
      });

      return {
        densityField: result.densityField,
        bestScore: result.bestScore,
        objective: result.objective,
        constraint: result.constraint,
        iterations: result.iterations,
        resolution: result.resolution,
        status: "complete",
      };
    },
  },
  {
    type: "biologicalSolver",
    label: "Biological Solver",
    shortLabel: "EVO",
    description: "Evolutionary search over vector genomes with a fast fitness proxy.",
    category: "optimization",
    iconId: "biologicalSolver",
    inputs: [
      {
        key: "domain",
        label: "Domain",
        type: "geometry",
        description: "Optional geometry reference that seeds the search.",
      },
      {
        key: "fitnessBias",
        label: "Fitness Bias",
        type: "number",
        parameterKey: "fitnessBias",
        defaultValue: 0,
      },
      {
        key: "populationSize",
        label: "Population",
        type: "number",
        parameterKey: "populationSize",
        defaultValue: 32,
      },
      {
        key: "generations",
        label: "Generations",
        type: "number",
        parameterKey: "generations",
        defaultValue: 24,
      },
      {
        key: "mutationRate",
        label: "Mutation",
        type: "number",
        parameterKey: "mutationRate",
        defaultValue: 0.18,
      },
      {
        key: "seed",
        label: "Seed",
        type: "number",
        parameterKey: "seed",
        defaultValue: 1,
      },
    ],
    outputs: [
      { key: "bestScore", label: "Best", type: "number" },
      { key: "bestGenome", label: "Genome", type: "vector" },
      { key: "evaluations", label: "Eval", type: "number" },
      { key: "populationSize", label: "Population", type: "number" },
      { key: "generations", label: "Generations", type: "number" },
      { key: "mutationRate", label: "Mutation", type: "number" },
      { key: "status", label: "Status", type: "string" },
    ],
    parameters: [
      {
        key: "fitnessBias",
        label: "Fitness Bias",
        type: "number",
        defaultValue: 0,
        step: 0.1,
      },
      {
        key: "populationSize",
        label: "Population",
        type: "number",
        defaultValue: 32,
        min: 8,
        max: 96,
        step: 1,
      },
      {
        key: "generations",
        label: "Generations",
        type: "number",
        defaultValue: 24,
        min: 1,
        max: 80,
        step: 1,
      },
      {
        key: "mutationRate",
        label: "Mutation Rate",
        type: "number",
        defaultValue: 0.18,
        min: 0.01,
        max: 0.95,
        step: 0.01,
      },
      {
        key: "seed",
        label: "Seed",
        type: "number",
        defaultValue: 1,
        step: 1,
      },
    ],
    primaryOutputKey: "bestScore",
    compute: ({ inputs, parameters, context }) => {
      const domainId = typeof inputs.domain === "string" ? inputs.domain : "domain";
      const fitnessBias = toNumber(
        inputs.fitnessBias,
        readNumberParameter(parameters, "fitnessBias", 0)
      );
      const populationSize = toNumber(
        inputs.populationSize,
        readNumberParameter(parameters, "populationSize", 32)
      );
      const generations = toNumber(
        inputs.generations,
        readNumberParameter(parameters, "generations", 24)
      );
      const mutationRate = toNumber(
        inputs.mutationRate,
        readNumberParameter(parameters, "mutationRate", 0.18)
      );
      const seedValue = toNumber(inputs.seed, readNumberParameter(parameters, "seed", 1));

      const result = runBiologicalSolver({
        seedKey: `${context.nodeId}:${domainId}:${seedValue}:${fitnessBias.toFixed(3)}`,
        populationSize,
        generations,
        mutationRate,
        fitnessBias,
      });

      return {
        bestScore: result.bestScore,
        bestGenome: result.bestGenome,
        evaluations: result.evaluations,
        populationSize: result.populationSize,
        generations: result.generations,
        mutationRate: result.mutationRate,
        status: "complete",
      };
    },
  },
  {
    type: "number",
    label: "Number",
    shortLabel: "NUM",
    description: "Emit a constant numeric value.",
    category: "math",
    iconId: "numberConstant",
    inputs: [],
    outputs: [{ key: "value", label: "Value", type: "number" }],
    parameters: [
      {
        key: "value",
        label: "Value",
        type: "number",
        defaultValue: 1,
        step: 0.1,
      },
    ],
    primaryOutputKey: "value",
    compute: ({ parameters }) => ({
      value: readNumberParameter(parameters, "value", 1),
    }),
  },
  {
    type: "add",
    label: "Add",
    shortLabel: "ADD",
    description: "Add two numeric values.",
    category: "math",
    iconId: "add",
    inputs: numberPorts({ a: "A", b: "B" }).inputs,
    outputs: numberPorts({ a: "A", b: "B" }).outputs,
    parameters: [],
    primaryOutputKey: "result",
    compute: ({ inputs }) => {
      const a = toNumber(inputs.a, 0);
      const b = toNumber(inputs.b, 0);
      return { result: a + b };
    },
  },
  {
    type: "subtract",
    label: "Subtract",
    shortLabel: "SUB",
    description: "Subtract B from A.",
    category: "math",
    iconId: "subtract",
    inputs: numberPorts({ a: "A", b: "B" }).inputs,
    outputs: numberPorts({ a: "A", b: "B" }).outputs,
    parameters: [],
    primaryOutputKey: "result",
    compute: ({ inputs }) => {
      const a = toNumber(inputs.a, 0);
      const b = toNumber(inputs.b, 0);
      return { result: a - b };
    },
  },
  {
    type: "multiply",
    label: "Multiply",
    shortLabel: "MUL",
    description: "Multiply two numeric values.",
    category: "math",
    iconId: "multiply",
    inputs: numberPorts({ a: "A", b: "B" }).inputs,
    outputs: numberPorts({ a: "A", b: "B" }).outputs,
    parameters: [],
    primaryOutputKey: "result",
    compute: ({ inputs }) => {
      const a = toNumber(inputs.a, 1);
      const b = toNumber(inputs.b, 1);
      return { result: a * b };
    },
  },
  {
    type: "divide",
    label: "Divide",
    shortLabel: "DIV",
    description: "Divide A by B with stability checks.",
    category: "math",
    iconId: "divide",
    inputs: numberPorts({ a: "A", b: "B" }).inputs,
    outputs: numberPorts({ a: "A", b: "B" }).outputs,
    parameters: [],
    primaryOutputKey: "result",
    compute: ({ inputs }) => {
      const a = toNumber(inputs.a, 0);
      const b = toNumber(inputs.b, 1);
      if (Math.abs(b) < EPSILON) {
        throw new Error("Cannot divide by zero.");
      }
      return { result: a / b };
    },
  },
  {
    type: "clamp",
    label: "Clamp",
    shortLabel: "CLP",
    description: "Clamp a value between a minimum and maximum.",
    category: "math",
    iconId: "clamp",
    inputs: [
      {
        key: "value",
        label: "Value",
        type: "number",
        parameterKey: "value",
        defaultValue: 0,
      },
      {
        key: "min",
        label: "Min",
        type: "number",
        parameterKey: "min",
        defaultValue: 0,
      },
      {
        key: "max",
        label: "Max",
        type: "number",
        parameterKey: "max",
        defaultValue: 1,
      },
    ],
    outputs: [{ key: "result", label: "Result", type: "number" }],
    parameters: [],
    primaryOutputKey: "result",
    compute: ({ inputs }) => {
      const value = toNumber(inputs.value, 0);
      const min = toNumber(inputs.min, 0);
      const max = toNumber(inputs.max, 1);
      if (min > max) {
        throw new Error("Clamp min must be less than or equal to max.");
      }
      return { result: clampNumber(value, min, max) };
    },
  },
  {
    type: "min",
    label: "Min",
    shortLabel: "MIN",
    description: "Return the smaller of two values.",
    category: "math",
    iconId: "min",
    inputs: numberPorts({ a: "A", b: "B" }).inputs,
    outputs: numberPorts({ a: "A", b: "B" }).outputs,
    parameters: [],
    primaryOutputKey: "result",
    compute: ({ inputs }) => {
      const a = toNumber(inputs.a, 0);
      const b = toNumber(inputs.b, 0);
      return { result: Math.min(a, b) };
    },
  },
  {
    type: "max",
    label: "Max",
    shortLabel: "MAX",
    description: "Return the larger of two values.",
    category: "math",
    iconId: "max",
    inputs: numberPorts({ a: "A", b: "B" }).inputs,
    outputs: numberPorts({ a: "A", b: "B" }).outputs,
    parameters: [],
    primaryOutputKey: "result",
    compute: ({ inputs }) => {
      const a = toNumber(inputs.a, 0);
      const b = toNumber(inputs.b, 0);
      return { result: Math.max(a, b) };
    },
  },
  {
    type: "expression",
    label: "Expression",
    shortLabel: "EXPR",
    description: "Evaluate a mathematical expression.",
    category: "math",
    iconId: "expression",
    inputs: expressionInputPorts,
    outputs: [{ key: "result", label: "Result", type: "number" }],
    parameters: [
      {
        key: "expression",
        label: "Expression",
        type: "string",
        defaultValue: "a + b",
      },
    ],
    primaryOutputKey: "result",
    compute: ({ inputs, parameters }) => {
      const expression = String(parameters.expression ?? "a + b");
      const variables = parseExpressionVariables(expression);
      const variableValues: Record<string, number> = {};
      if (variables.length === 0) {
        variableValues.value = toNumber(inputs.value, 0);
      } else {
        variables.forEach((variable) => {
          variableValues[variable] = toNumber(inputs[variable], 0);
        });
      }
      const result = evaluateExpression(expression, variableValues);
      return { result };
    },
  },
  {
    type: "conditional",
    label: "Conditional",
    shortLabel: "IF",
    description: "Select between two values using a condition.",
    category: "logic",
    iconId: "conditional",
    inputs: [
      {
        key: "condition",
        label: "Condition",
        type: "boolean",
        parameterKey: "condition",
        defaultValue: true,
      },
      {
        key: "left",
        label: "A",
        type: "number",
        parameterKey: "left",
        defaultValue: 1,
      },
      {
        key: "right",
        label: "B",
        type: "number",
        parameterKey: "right",
        defaultValue: 0,
      },
      {
        key: "trueValue",
        label: "True",
        type: "any",
        parameterKey: "trueValue",
        defaultValue: 1,
      },
      {
        key: "falseValue",
        label: "False",
        type: "any",
        parameterKey: "falseValue",
        defaultValue: 0,
      },
    ],
    outputs: [{ key: "result", label: "Result", type: "any" }],
    parameters: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        defaultValue: "boolean",
        options: conditionalModeOptions,
      },
    ],
    primaryOutputKey: "result",
    compute: ({ inputs, parameters }) => {
      const mode = String(parameters.mode ?? "boolean");
      let condition = toBoolean(inputs.condition, true);
      if (mode !== "boolean") {
        const left = toNumber(inputs.left, 0);
        const right = toNumber(inputs.right, 0);
        switch (mode) {
          case "greaterThan":
            condition = left > right;
            break;
          case "lessThan":
            condition = left < right;
            break;
          case "equal":
            condition = Math.abs(left - right) <= EPSILON;
            break;
          case "notEqual":
            condition = Math.abs(left - right) > EPSILON;
            break;
          default:
            condition = toBoolean(inputs.condition, true);
            break;
        }
      }
      return {
        result: condition ? inputs.trueValue : inputs.falseValue,
      };
    },
  },
  {
    type: "vectorConstruct",
    label: "Vector Compose",
    shortLabel: "VEC",
    description: "Compose a vector from X, Y, and Z scalar inputs.",
    category: "euclidean",
    iconId: "vectorConstruct",
    inputs: [
      {
        key: "x",
        label: "X",
        type: "number",
        parameterKey: "x",
        defaultValue: 0,
      },
      {
        key: "y",
        label: "Y",
        type: "number",
        parameterKey: "y",
        defaultValue: 0,
      },
      {
        key: "z",
        label: "Z",
        type: "number",
        parameterKey: "z",
        defaultValue: 0,
      },
    ],
    outputs: [{ key: "vector", label: "Vector", type: "vector" }],
    parameters: [
      { key: "x", label: "X", type: "number", defaultValue: 0, step: 0.1 },
      { key: "y", label: "Y", type: "number", defaultValue: 0, step: 0.1 },
      { key: "z", label: "Z", type: "number", defaultValue: 0, step: 0.1 },
    ],
    primaryOutputKey: "vector",
    compute: ({ inputs }) => ({
      vector: {
        x: toNumber(inputs.x, 0),
        y: toNumber(inputs.y, 0),
        z: toNumber(inputs.z, 0),
      },
    }),
  },
  {
    type: "vectorDeconstruct",
    label: "Vector Decompose",
    shortLabel: "XYZ",
    description: "Break a vector into its scalar components.",
    category: "euclidean",
    iconId: "vectorDeconstruct",
    inputs: [
      {
        key: "vector",
        label: "Vector",
        type: "vector",
        required: true,
      },
    ],
    outputs: [
      { key: "x", label: "X", type: "number" },
      { key: "y", label: "Y", type: "number" },
      { key: "z", label: "Z", type: "number" },
    ],
    parameters: vectorParameterSpecs("vector", "Vector", ZERO_VEC3),
    compute: ({ inputs, parameters }) => {
      const vector = resolveVectorInput(inputs, parameters, "vector", "vector", ZERO_VEC3);
      return {
        x: vector.x,
        y: vector.y,
        z: vector.z,
      };
    },
  },
  {
    type: "vectorAdd",
    label: "Vector Add",
    shortLabel: "V+",
    description: "Add two vectors component-wise.",
    category: "euclidean",
    iconId: "vectorAdd",
    inputs: [
      { key: "a", label: "A", type: "vector", required: true },
      { key: "b", label: "B", type: "vector", required: true },
    ],
    outputs: [{ key: "vector", label: "Vector", type: "vector" }],
    parameters: [
      ...vectorParameterSpecs("a", "A", ZERO_VEC3),
      ...vectorParameterSpecs("b", "B", UNIT_X_VEC3),
    ],
    primaryOutputKey: "vector",
    compute: ({ inputs, parameters }) => {
      const a = resolveVectorInput(inputs, parameters, "a", "a", ZERO_VEC3);
      const b = resolveVectorInput(inputs, parameters, "b", "b", UNIT_X_VEC3);
      return {
        vector: addVec3(a, b),
      };
    },
  },
  {
    type: "vectorSubtract",
    label: "Vector Subtract",
    shortLabel: "V-",
    description: "Subtract vector B from vector A.",
    category: "euclidean",
    iconId: "vectorSubtract",
    inputs: [
      { key: "a", label: "A", type: "vector", required: true },
      { key: "b", label: "B", type: "vector", required: true },
    ],
    outputs: [{ key: "vector", label: "Vector", type: "vector" }],
    parameters: [
      ...vectorParameterSpecs("a", "A", UNIT_X_VEC3),
      ...vectorParameterSpecs("b", "B", ZERO_VEC3),
    ],
    primaryOutputKey: "vector",
    compute: ({ inputs, parameters }) => {
      const a = resolveVectorInput(inputs, parameters, "a", "a", UNIT_X_VEC3);
      const b = resolveVectorInput(inputs, parameters, "b", "b", ZERO_VEC3);
      return {
        vector: subtractVec3(a, b),
      };
    },
  },
  {
    type: "vectorScale",
    label: "Vector Scale",
    shortLabel: "VS",
    description: "Scale a vector by a scalar multiplier.",
    category: "transforms",
    iconId: "vectorScale",
    inputs: [
      { key: "vector", label: "Vector", type: "vector", required: true },
      {
        key: "scale",
        label: "Scale",
        type: "number",
        parameterKey: "scale",
        defaultValue: 1,
      },
    ],
    outputs: [{ key: "vector", label: "Vector", type: "vector" }],
    parameters: [
      ...vectorParameterSpecs("vector", "Vector", UNIT_X_VEC3),
      {
        key: "scale",
        label: "Scale",
        type: "number",
        defaultValue: 1,
        step: 0.1,
      },
    ],
    primaryOutputKey: "vector",
    compute: ({ inputs, parameters }) => {
      const vector = resolveVectorInput(inputs, parameters, "vector", "vector", UNIT_X_VEC3);
      const scale = toNumber(inputs.scale, readNumberParameter(parameters, "scale", 1));
      return {
        vector: scaleVec3(vector, scale),
      };
    },
  },
  {
    type: "vectorLength",
    label: "Vector Length",
    shortLabel: "|V|",
    description: "Measure the magnitude of a vector.",
    category: "euclidean",
    iconId: "vectorLength",
    inputs: [{ key: "vector", label: "Vector", type: "vector", required: true }],
    outputs: [{ key: "length", label: "Length", type: "number" }],
    parameters: vectorParameterSpecs("vector", "Vector", UNIT_X_VEC3),
    primaryOutputKey: "length",
    compute: ({ inputs, parameters }) => {
      const vector = resolveVectorInput(inputs, parameters, "vector", "vector", UNIT_X_VEC3);
      return {
        length: lengthVec3(vector),
      };
    },
  },
  {
    type: "vectorNormalize",
    label: "Vector Normalize",
    shortLabel: "V^",
    description: "Convert a vector to unit length.",
    category: "euclidean",
    iconId: "vectorNormalize",
    inputs: [{ key: "vector", label: "Vector", type: "vector", required: true }],
    outputs: [{ key: "vector", label: "Unit", type: "vector" }],
    parameters: vectorParameterSpecs("vector", "Vector", UNIT_X_VEC3),
    primaryOutputKey: "vector",
    compute: ({ inputs, parameters }) => {
      const vector = resolveVectorInput(inputs, parameters, "vector", "vector", UNIT_X_VEC3);
      return {
        vector: normalizeVec3(vector),
      };
    },
  },
  {
    type: "vectorDot",
    label: "Vector Dot",
    shortLabel: "DOT",
    description: "Compute the dot product between two vectors.",
    category: "euclidean",
    iconId: "vectorDot",
    inputs: [
      { key: "a", label: "A", type: "vector", required: true },
      { key: "b", label: "B", type: "vector", required: true },
    ],
    outputs: [{ key: "dot", label: "Dot", type: "number" }],
    parameters: [
      ...vectorParameterSpecs("a", "A", UNIT_X_VEC3),
      ...vectorParameterSpecs("b", "B", UNIT_X_VEC3),
    ],
    primaryOutputKey: "dot",
    compute: ({ inputs, parameters }) => {
      const a = resolveVectorInput(inputs, parameters, "a", "a", UNIT_X_VEC3);
      const b = resolveVectorInput(inputs, parameters, "b", "b", UNIT_X_VEC3);
      return {
        dot: dotVec3(a, b),
      };
    },
  },
  {
    type: "vectorCross",
    label: "Vector Cross",
    shortLabel: "CRS",
    description: "Compute the cross product between two vectors.",
    category: "euclidean",
    iconId: "vectorCross",
    inputs: [
      { key: "a", label: "A", type: "vector", required: true },
      { key: "b", label: "B", type: "vector", required: true },
    ],
    outputs: [{ key: "vector", label: "Vector", type: "vector" }],
    parameters: [
      ...vectorParameterSpecs("a", "A", UNIT_X_VEC3),
      ...vectorParameterSpecs("b", "B", UNIT_Y_VEC3),
    ],
    primaryOutputKey: "vector",
    compute: ({ inputs, parameters }) => {
      const a = resolveVectorInput(inputs, parameters, "a", "a", UNIT_X_VEC3);
      const b = resolveVectorInput(inputs, parameters, "b", "b", UNIT_Y_VEC3);
      return {
        vector: crossVec3(a, b),
      };
    },
  },
  {
    type: "distance",
    label: "Distance",
    shortLabel: "DIST",
    description: "Measure the distance between two points or vectors.",
    category: "euclidean",
    iconId: "distance",
    inputs: [
      { key: "a", label: "A", type: "vector", required: true },
      { key: "b", label: "B", type: "vector", required: true },
    ],
    outputs: [{ key: "distance", label: "Distance", type: "number" }],
    parameters: [
      ...vectorParameterSpecs("a", "A", ZERO_VEC3),
      ...vectorParameterSpecs("b", "B", UNIT_X_VEC3),
    ],
    primaryOutputKey: "distance",
    compute: ({ inputs, parameters }) => {
      const a = resolveVectorInput(inputs, parameters, "a", "a", ZERO_VEC3);
      const b = resolveVectorInput(inputs, parameters, "b", "b", UNIT_X_VEC3);
      return {
        distance: lengthVec3(subtractVec3(a, b)),
      };
    },
  },
  {
    type: "vectorFromPoints",
    label: "Vector From Points",
    shortLabel: "A->B",
    description: "Create a direction vector that points from A to B.",
    category: "euclidean",
    iconId: "vectorFromPoints",
    inputs: [
      { key: "start", label: "A", type: "vector", required: true },
      { key: "end", label: "B", type: "vector", required: true },
    ],
    outputs: [
      { key: "vector", label: "Vector", type: "vector" },
      { key: "length", label: "Length", type: "number" },
    ],
    parameters: [
      ...vectorParameterSpecs("start", "Start", ZERO_VEC3),
      ...vectorParameterSpecs("end", "End", UNIT_X_VEC3),
    ],
    primaryOutputKey: "vector",
    compute: ({ inputs, parameters }) => {
      const start = resolveVectorInput(inputs, parameters, "start", "start", ZERO_VEC3);
      const end = resolveVectorInput(inputs, parameters, "end", "end", UNIT_X_VEC3);
      const vector = subtractVec3(end, start);
      return {
        vector,
        length: lengthVec3(vector),
      };
    },
  },
  {
    type: "vectorAngle",
    label: "Vector Angle",
    shortLabel: "ANG",
    description: "Measure the angle between two vectors.",
    category: "euclidean",
    iconId: "vectorAngle",
    inputs: [
      { key: "a", label: "A", type: "vector", required: true },
      { key: "b", label: "B", type: "vector", required: true },
    ],
    outputs: [
      { key: "angleDeg", label: "Deg", type: "number" },
      { key: "angleRad", label: "Rad", type: "number" },
    ],
    parameters: [
      ...vectorParameterSpecs("a", "A", UNIT_X_VEC3),
      ...vectorParameterSpecs("b", "B", UNIT_Y_VEC3),
    ],
    primaryOutputKey: "angleDeg",
    compute: ({ inputs, parameters }) => {
      const a = resolveVectorInput(inputs, parameters, "a", "a", UNIT_X_VEC3);
      const b = resolveVectorInput(inputs, parameters, "b", "b", UNIT_Y_VEC3);
      const lenA = lengthVec3(a);
      const lenB = lengthVec3(b);
      if (lenA <= EPSILON || lenB <= EPSILON) {
        return { angleDeg: 0, angleRad: 0 };
      }
      const normalizedDot = clampNumber(dotVec3(a, b) / (lenA * lenB), -1, 1);
      const angleRad = Math.acos(normalizedDot);
      const angleDeg = (angleRad * 180) / Math.PI;
      return { angleDeg, angleRad };
    },
  },
  {
    type: "vectorLerp",
    label: "Vector Lerp",
    shortLabel: "LERP",
    description: "Linearly interpolate between two vectors using parameter T.",
    category: "euclidean",
    iconId: "vectorLerp",
    inputs: [
      { key: "a", label: "A", type: "vector", required: true },
      { key: "b", label: "B", type: "vector", required: true },
      {
        key: "t",
        label: "T",
        type: "number",
        parameterKey: "t",
        defaultValue: 0.5,
      },
    ],
    outputs: [
      { key: "vector", label: "Vector", type: "vector" },
      { key: "t", label: "T", type: "number" },
    ],
    parameters: [
      ...vectorParameterSpecs("a", "A", ZERO_VEC3),
      ...vectorParameterSpecs("b", "B", UNIT_X_VEC3),
      {
        key: "t",
        label: "T",
        type: "number",
        defaultValue: 0.5,
        step: 0.05,
      },
    ],
    primaryOutputKey: "vector",
    compute: ({ inputs, parameters }) => {
      const a = resolveVectorInput(inputs, parameters, "a", "a", ZERO_VEC3);
      const b = resolveVectorInput(inputs, parameters, "b", "b", UNIT_X_VEC3);
      const t = toNumber(inputs.t, readNumberParameter(parameters, "t", 0.5));
      const vector = addVec3(a, scaleVec3(subtractVec3(b, a), t));
      return { vector, t };
    },
  },
  {
    type: "vectorProject",
    label: "Vector Project",
    shortLabel: "PROJ",
    description: "Project a vector onto another vector.",
    category: "euclidean",
    iconId: "vectorProject",
    inputs: [
      { key: "vector", label: "Vector", type: "vector", required: true },
      { key: "onto", label: "Onto", type: "vector", required: true },
    ],
    outputs: [
      { key: "vector", label: "Projection", type: "vector" },
      { key: "scale", label: "Scale", type: "number" },
    ],
    parameters: [
      ...vectorParameterSpecs("vector", "Vector", UNIT_X_VEC3),
      ...vectorParameterSpecs("onto", "Onto", UNIT_Y_VEC3),
    ],
    primaryOutputKey: "vector",
    compute: ({ inputs, parameters }) => {
      const vector = resolveVectorInput(inputs, parameters, "vector", "vector", UNIT_X_VEC3);
      const onto = resolveVectorInput(inputs, parameters, "onto", "onto", UNIT_Y_VEC3);
      const denom = dotVec3(onto, onto);
      if (denom <= EPSILON) {
        return { vector: ZERO_VEC3, scale: 0 };
      }
      const scale = dotVec3(vector, onto) / denom;
      return {
        vector: scaleVec3(onto, scale),
        scale,
      };
    },
  },
  {
    type: "move",
    label: "Move",
    shortLabel: "MOVE",
    description: "Translate geometry by world-space XYZ offsets.",
    category: "transforms",
    iconId: "move",
    inputs: [
      {
        key: "geometry",
        label: "Geometry",
        type: "geometry",
        required: true,
        parameterKey: "geometryId",
      },
      {
        key: "worldX",
        label: "World X",
        type: "number",
        parameterKey: "worldX",
        defaultValue: 0,
      },
      {
        key: "worldY",
        label: "World Y",
        type: "number",
        parameterKey: "worldY",
        defaultValue: 0,
      },
      {
        key: "worldZ",
        label: "World Z",
        type: "number",
        parameterKey: "worldZ",
        defaultValue: 0,
      },
    ],
    outputs: [
      { key: "geometry", label: "Geometry", type: "geometry" },
      { key: "offset", label: "Offset", type: "vector" },
      { key: "worldX", label: "World X", type: "number" },
      { key: "worldY", label: "World Y", type: "number" },
      { key: "worldZ", label: "World Z", type: "number" },
    ],
    parameters: [
      { key: "worldX", label: "World X", type: "number", defaultValue: 0, step: 0.1 },
      { key: "worldY", label: "World Y", type: "number", defaultValue: 0, step: 0.1 },
      { key: "worldZ", label: "World Z", type: "number", defaultValue: 0, step: 0.1 },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters }) => {
      const geometry = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const worldX = toNumber(inputs.worldX, readNumberParameter(parameters, "worldX", 0));
      const worldY = toNumber(inputs.worldY, readNumberParameter(parameters, "worldY", 0));
      const worldZ = toNumber(inputs.worldZ, readNumberParameter(parameters, "worldZ", 0));
      return {
        geometry,
        offset: { x: worldX, y: worldY, z: worldZ },
        worldX,
        worldY,
        worldZ,
      };
    },
  },
  {
    type: "movePoint",
    label: "Move Point",
    shortLabel: "MOVE",
    description: "Move a point along a direction vector by a distance.",
    category: "euclidean",
    iconId: "movePoint",
    inputs: [
      { key: "point", label: "Point", type: "vector", required: true },
      { key: "direction", label: "Direction", type: "vector", required: true },
      {
        key: "distance",
        label: "Distance",
        type: "number",
        parameterKey: "distance",
        defaultValue: 1,
      },
    ],
    outputs: [
      { key: "point", label: "Point", type: "vector" },
      { key: "directionUnit", label: "Direction", type: "vector" },
      { key: "distance", label: "Distance", type: "number" },
    ],
    parameters: [
      ...vectorParameterSpecs("point", "Point", ZERO_VEC3),
      ...vectorParameterSpecs("direction", "Direction", UNIT_X_VEC3),
      {
        key: "distance",
        label: "Distance",
        type: "number",
        defaultValue: 1,
        step: 0.1,
      },
    ],
    primaryOutputKey: "point",
    compute: ({ inputs, parameters }) => {
      const point = resolveVectorInput(inputs, parameters, "point", "point", ZERO_VEC3);
      const direction = resolveVectorInput(
        inputs,
        parameters,
        "direction",
        "direction",
        UNIT_X_VEC3
      );
      const distance = toNumber(
        inputs.distance,
        readNumberParameter(parameters, "distance", 1)
      );
      const dirLength = lengthVec3(direction);
      if (dirLength <= EPSILON) {
        return {
          point,
          directionUnit: UNIT_X_VEC3,
          distance: 0,
        };
      }
      const directionUnit = scaleVec3(direction, 1 / dirLength);
      const moved = addVec3(point, scaleVec3(directionUnit, distance));
      return {
        point: moved,
        directionUnit,
        distance,
      };
    },
  },
  {
    type: "movePointByVector",
    label: "Move Point By Vector",
    shortLabel: "OFFSET",
    description: "Move a point directly by an offset vector.",
    category: "euclidean",
    iconId: "movePointByVector",
    inputs: [
      { key: "point", label: "Point", type: "vector", required: true },
      { key: "offset", label: "Offset", type: "vector", required: true },
    ],
    outputs: [
      { key: "point", label: "Point", type: "vector" },
      { key: "offset", label: "Offset", type: "vector" },
    ],
    parameters: [
      ...vectorParameterSpecs("point", "Point", ZERO_VEC3),
      ...vectorParameterSpecs("offset", "Offset", UNIT_X_VEC3),
    ],
    primaryOutputKey: "point",
    compute: ({ inputs, parameters }) => {
      const point = resolveVectorInput(inputs, parameters, "point", "point", ZERO_VEC3);
      const offset = resolveVectorInput(inputs, parameters, "offset", "offset", UNIT_X_VEC3);
      return {
        point: addVec3(point, offset),
        offset,
      };
    },
  },
  {
    type: "rotateVectorAxis",
    label: "Rotate Vector",
    shortLabel: "ROT",
    description: "Rotate a vector around an axis by an angle in degrees.",
    category: "euclidean",
    iconId: "rotateVectorAxis",
    inputs: [
      { key: "vector", label: "Vector", type: "vector", required: true },
      { key: "axis", label: "Axis", type: "vector", required: true },
      {
        key: "angleDeg",
        label: "Angle",
        type: "number",
        parameterKey: "angleDeg",
        defaultValue: 45,
      },
    ],
    outputs: [
      { key: "vector", label: "Vector", type: "vector" },
      { key: "angleDeg", label: "Angle", type: "number" },
    ],
    parameters: [
      ...vectorParameterSpecs("vector", "Vector", UNIT_X_VEC3),
      ...vectorParameterSpecs("axis", "Axis", UNIT_Y_VEC3),
      {
        key: "angleDeg",
        label: "Angle Degrees",
        type: "number",
        defaultValue: 45,
        step: 1,
      },
    ],
    primaryOutputKey: "vector",
    compute: ({ inputs, parameters }) => {
      const vector = resolveVectorInput(inputs, parameters, "vector", "vector", UNIT_X_VEC3);
      const axis = resolveVectorInput(inputs, parameters, "axis", "axis", UNIT_Y_VEC3);
      const angleDeg = toNumber(inputs.angleDeg, readNumberParameter(parameters, "angleDeg", 45));
      const axisLength = lengthVec3(axis);
      if (axisLength <= EPSILON) {
        return { vector, angleDeg: 0 };
      }
      const angleRad = (angleDeg * Math.PI) / 180;
      const rotated = rotateVec3AroundAxis(vector, axis, angleRad);
      return { vector: rotated, angleDeg };
    },
  },
  {
    type: "mirrorVector",
    label: "Mirror Vector",
    shortLabel: "MIR",
    description: "Reflect a vector across a plane defined by a normal.",
    category: "euclidean",
    iconId: "mirrorVector",
    inputs: [
      { key: "vector", label: "Vector", type: "vector", required: true },
      { key: "normal", label: "Normal", type: "vector", required: true },
    ],
    outputs: [
      { key: "vector", label: "Vector", type: "vector" },
      { key: "normal", label: "Normal", type: "vector" },
    ],
    parameters: [
      ...vectorParameterSpecs("vector", "Vector", UNIT_X_VEC3),
      ...vectorParameterSpecs("normal", "Normal", UNIT_Y_VEC3),
    ],
    primaryOutputKey: "vector",
    compute: ({ inputs, parameters }) => {
      const vector = resolveVectorInput(inputs, parameters, "vector", "vector", UNIT_X_VEC3);
      const normal = resolveVectorInput(inputs, parameters, "normal", "normal", UNIT_Y_VEC3);
      const normalLength = lengthVec3(normal);
      if (normalLength <= EPSILON) {
        return { vector, normal };
      }
      const unitNormal = scaleVec3(normal, 1 / normalLength);
      const projection = 2 * dotVec3(vector, unitNormal);
      const reflected = subtractVec3(vector, scaleVec3(unitNormal, projection));
      return { vector: reflected, normal };
    },
  },
];

export const NODE_DEFINITION_BY_TYPE = new Map<NodeType, WorkflowNodeDefinition>(
  NODE_DEFINITIONS.map((definition) => [definition.type, definition])
);

export const NODE_CATEGORY_BY_ID = new Map<NodeCategoryId, NodeCategory>(
  NODE_CATEGORIES.map((category) => [category.id, category])
);

export const PORT_TYPE_COLOR: Record<WorkflowPortType, string> = {
  any: "#c9c5c0",
  boolean: "#c9c5c0",
  geometry: "#c9c5c0",
  number: "#c9c5c0",
  string: "#c9c5c0",
  vector: "#c9c5c0",
};

export const isPortTypeCompatible = (source: WorkflowPortType, target: WorkflowPortType) => {
  if (source === target) return true;
  if (source === "any" || target === "any") return true;
  if ((source === "number" && target === "boolean") || (source === "boolean" && target === "number")) {
    return true;
  }
  return false;
};

export const coerceValueToPortType = (value: WorkflowValue, portType: WorkflowPortType) => {
  if (value == null) return value;
  if (portType === "any") return value;
  if (portType === "number") return toNumber(value, 0);
  if (portType === "boolean") return toBoolean(value, false);
  if (portType === "string") return String(value);
  return value;
};

type ResolvedPorts = { inputs: WorkflowPortSpec[]; outputs: WorkflowPortSpec[] };

const resolvePortsDefinition = (ports: PortsDefinition, parameters: Record<string, unknown>) =>
  typeof ports === "function" ? ports(parameters) : ports;

export const resolveNodePorts = (
  node: Pick<WorkflowNode, "type" | "data">,
  parametersOverride?: Record<string, unknown>
): ResolvedPorts => {
  const definition = node.type ? NODE_DEFINITION_BY_TYPE.get(node.type as NodeType) : undefined;
  if (!definition) return { inputs: [], outputs: [] };
  const parameters = parametersOverride ?? resolveNodeParameters(node);
  return {
    inputs: resolvePortsDefinition(definition.inputs, parameters),
    outputs: resolvePortsDefinition(definition.outputs, parameters),
  };
};

export const getNodeDefinition = (type?: string) =>
  type ? NODE_DEFINITION_BY_TYPE.get(type as NodeType) : undefined;

const collectDefaultParametersFromPorts = (
  ports: WorkflowPortSpec[],
  target: Record<string, unknown>
) => {
  ports.forEach((port) => {
    if (!port.parameterKey) return;
    if (target[port.parameterKey] != null) return;
    if (port.defaultValue !== undefined) {
      target[port.parameterKey] = port.defaultValue;
    }
  });
};

export const getDefaultParameters = (
  type: NodeType,
  override?: Record<string, unknown>
) => {
  const definition = NODE_DEFINITION_BY_TYPE.get(type);
  if (!definition) return {} as Record<string, unknown>;
  const parameters: Record<string, unknown> = {};
  definition.parameters.forEach((parameter) => {
    parameters[parameter.key] = parameter.defaultValue;
  });
  if (override) {
    Object.entries(override).forEach(([key, value]) => {
      parameters[key] = value;
    });
  }
  const resolvedPorts = resolveNodePorts({ type, data: { label: definition.label } }, parameters);
  collectDefaultParametersFromPorts(resolvedPorts.inputs, parameters);
  return parameters;
};

const mergeParameters = (
  base: Record<string, unknown>,
  patch: Record<string, unknown> | undefined
) => ({
  ...base,
  ...(patch ?? {}),
});

export const resolveNodeParameters = (node: Pick<WorkflowNode, "type" | "data">) => {
  const type = node.type as NodeType | undefined;
  if (!type) return node.data?.parameters ?? {};
  const defaults = getDefaultParameters(type, node.data?.parameters);
  const parameters = mergeParameters(defaults, node.data?.parameters);

  // Geometry nodes store their parameters in dedicated fields today. We mirror
  // those values into the parameter map so the evaluator can stay pure.
  if (type === "geometryReference") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "point") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "line") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "arc") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "curve") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "polyline") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "surface") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "box") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
    if (node.data?.boxDimensions) {
      parameters.boxWidth = node.data.boxDimensions.width;
      parameters.boxHeight = node.data.boxDimensions.height;
      parameters.boxDepth = node.data.boxDimensions.depth;
    }
  }
  if (type === "sphere") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
    if (typeof node.data?.sphereRadius === "number") {
      parameters.sphereRadius = node.data.sphereRadius;
    }
  }
  if (type === "move") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "topologyOptimize") {
    const settings = node.data?.topologySettings;
    const progress = node.data?.topologyProgress;
    if (settings) {
      parameters.volumeFraction = settings.volumeFraction;
      parameters.penaltyExponent = settings.penaltyExponent;
      parameters.filterRadius = settings.filterRadius;
      parameters.maxIterations = settings.maxIterations;
      parameters.convergenceTolerance = settings.convergenceTolerance;
    }
    if (progress) {
      parameters.status = progress.status;
      parameters.iteration = progress.iteration;
      parameters.objective = progress.objective;
      parameters.constraint = progress.constraint;
    }
  }

  return parameters;
};

export const resolvePortByKey = (ports: WorkflowPortSpec[], key?: string | null) =>
  key ? ports.find((port) => port.key === key) : undefined;

type GeometryMaps = {
  geometryById: Map<string, Geometry>;
  vertexById: Map<string, VertexGeometry>;
};

export const buildGeometryMaps = (geometry: Geometry[]): GeometryMaps => {
  const geometryById = new Map<string, Geometry>();
  const vertexById = new Map<string, VertexGeometry>();
  geometry.forEach((item) => {
    geometryById.set(item.id, item);
    if (item.type === "vertex") {
      vertexById.set(item.id, item);
    }
  });
  return { geometryById, vertexById };
};

export const computeNodeOutputs = (
  definition: WorkflowNodeDefinition,
  args: WorkflowComputeArgs
) => definition.compute(args);
