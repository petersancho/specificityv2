import type { Geometry, RenderMesh, VertexGeometry, VoxelGrid, WorkflowNode } from "../types";
// Import semantic operations (wrapped with metadata)
import { offsetPolyline2D } from "../geometry/booleanOps";
import {
  computeBestFitPlane,
  projectPointToPlane,
  unprojectPointFromPlane,
} from "../geometry/mathOps";
import { resampleByArcLength } from "../geometry/curveOps";
import {
  computeMeshArea,
  computeVertexNormals,
  generateBoxMesh,
  generateCylinderMesh,
  generateExtrudeMesh,
  generateLoftMesh,
  generatePipeMesh,
  generateSphereMesh,
} from "../geometry/meshOps";
import {
  getTessellationMetadata,
  toTessellationMesh,
  toTessellationMeshData,
  tessellationMeshToRenderMesh,
  subdivideLinear,
  subdivideCatmullClark,
  subdivideLoop,
  subdivideAdaptive,
  dualMesh,
  insetFaces,
  extrudeFaces,
  meshRelax,
  selectFaces,
  triangulateMesh,
  generateGeodesicSphere,
  generateHexagonalTiling,
  generateVoronoiPattern,
  offsetPattern,
  generateMeshUVs,
  repairMesh,
  decimateMesh,
  quadDominantRemesh,
  meshBoolean,
} from "../geometry/meshTessellationOps";
import { brepFromMesh, tessellateBRepToMesh } from "../geometry/brepOps";
import { tessellateCurveAdaptive, tessellateSurfaceAdaptive } from "../geometry/tessellationOps";
import type { NodeType } from "./nodeTypes";
import { PRIMITIVE_NODE_CATALOG, PRIMITIVE_NODE_TYPE_IDS } from "../data/primitiveCatalog";
import { hexToRgb, normalizeHexColor, normalizeRgbInput, rgbToHex } from "../utils/color";
import { PhysicsSolverNode } from "./nodes/solver/PhysicsSolver";
import { ChemistrySolverNode } from "./nodes/solver/ChemistrySolver";
import { EvolutionarySolver } from "./nodes/solver/EvolutionarySolver";
import { VoxelSolverNode } from "./nodes/solver/VoxelSolver";
import { TopologyOptimizationSolverNode } from "./nodes/solver/TopologyOptimizationSolver";
import { AnchorGoalNode, LoadGoalNode, StiffnessGoalNode, VolumeGoalNode } from "./nodes/solver/goals/physics";
import {
  ChemistryBlendGoalNode,
  ChemistryMassGoalNode,
  ChemistryMaterialGoalNode,
  ChemistryStiffnessGoalNode,
  ChemistryThermalGoalNode,
  ChemistryTransparencyGoalNode,
} from "./nodes/solver/goals/chemistry";
import { validateChemistryGoals } from "./nodes/solver/validation";
import type { GoalSpecification } from "./nodes/solver/types";
import { isFiniteNumber, toNumber, toBoolean } from "./nodes/solver/utils";
import { warnOnce } from "../utils/warnOnce";
import { normalizeNonNegative, clamp01 } from "../geometry/validation";

import type {
  NodeCategory,
  NodeCategoryId,
  WorkflowComputeArgs,
  WorkflowComputeContext,
  WorkflowNodeDefinition,
  WorkflowParameterOption,
  WorkflowParameterSpec,
  WorkflowParameterType,
  WorkflowPortSpec,
  WorkflowPortType,
  WorkflowValue,
} from "./registry/types";

export type {
  NodeCategory,
  NodeCategoryId,
  WorkflowComputeContext,
  WorkflowNodeDefinition,
  WorkflowParameterOption,
  WorkflowParameterSpec,
  WorkflowParameterType,
  WorkflowPortSpec,
  WorkflowPortType,
  WorkflowValue,
} from "./registry/types";

type PortResolver = (parameters: Record<string, unknown>) => WorkflowPortSpec[];

type PortsDefinition = WorkflowPortSpec[] | PortResolver;

const EPSILON = 1e-10;
const EMPTY_MESH: RenderMesh = { positions: [], normals: [], uvs: [], indices: [] };

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

const resolveStepDecimals = (step: number) => {
  if (!Number.isFinite(step)) return 0;
  const normalized = Math.abs(step).toString();
  if (normalized.includes("e")) {
    const [base, expRaw] = normalized.split("e");
    const exp = Number(expRaw);
    const baseDecimals = base.split(".")[1]?.length ?? 0;
    if (Number.isFinite(exp)) {
      return Math.max(0, baseDecimals - exp);
    }
  }
  const decimals = normalized.split(".")[1];
  return decimals ? decimals.length : 0;
};

const snapNumberToStep = (value: number, step: number, min: number) => {
  if (!Number.isFinite(step) || step <= EPSILON) return value;
  const snapped = Math.round((value - min) / step) * step + min;
  const decimals = Math.min(6, resolveStepDecimals(step));
  if (decimals <= 0) return Math.round(snapped);
  const factor = Math.pow(10, decimals);
  return Math.round(snapped * factor) / factor;
};

const roundToPrecision = (value: number, precision: number) => {
  if (!Number.isFinite(precision)) return value;
  const clamped = Math.min(6, Math.max(0, Math.round(precision)));
  if (clamped <= 0) return Math.round(value);
  const factor = Math.pow(10, clamped);
  return Math.round(value * factor) / factor;
};

type Vec3Value = { x: number; y: number; z: number };

type ChemistryMaterialSpec = {
  name: string;
  density: number;
  stiffness: number;
  thermalConductivity: number;
  opticalTransmission: number;
  diffusivity: number;
  color: [number, number, number];
};

type ChemistryMaterialAssignment = {
  geometryId?: string;
  material: ChemistryMaterialSpec;
  weight?: number;
};

type ChemistrySeed = {
  position: Vec3Value;
  material: string;
  strength: number;
  radius: number;
};

type ChemistryParticle = {
  position: Vec3Value;
  radius: number;
  materials: Record<string, number>;
};

type ChemistryField = {
  resolution: { x: number; y: number; z: number };
  bounds: { min: Vec3Value; max: Vec3Value };
  cellSize: Vec3Value;
  materials: string[];
  channels: number[][];
  densities: number[];
  maxDensity: number;
};

type ChemistryHistoryEntry = {
  iteration: number;
  energies: Record<string, number>;
  totalEnergy: number;
};

type ChemistrySolverResult = {
  particles: ChemistryParticle[];
  field: ChemistryField | null;
  mesh: RenderMesh;
  history: ChemistryHistoryEntry[];
  bestState: { particles: ChemistryParticle[]; totalEnergy: number; iteration: number } | null;
  totalEnergy: number;
  iterations: number;
  status: string;
  warnings: string[];
  materials: ChemistryMaterialSpec[];
};

// Import expanded material database
import {
  CHEMISTRY_MATERIAL_DATABASE,
  type ChemistryMaterialSpec as ImportedChemistryMaterialSpec,
  getMaterialByName,
  blendMaterialColors,
  CATEGORY_INFO,
} from "../data/chemistryMaterials";

// Re-export for backward compatibility
export const CHEMISTRY_MATERIAL_LIBRARY: Record<string, ChemistryMaterialSpec> = Object.fromEntries(
  Object.entries(CHEMISTRY_MATERIAL_DATABASE).map(([key, spec]) => [
    key,
    {
      name: spec.name,
      density: spec.density,
      stiffness: spec.stiffness,
      thermalConductivity: spec.thermalConductivity,
      opticalTransmission: spec.opticalTransmission,
      diffusivity: spec.diffusivity,
      color: spec.color,
    },
  ])
);

// Re-export utility functions
export { getMaterialByName, blendMaterialColors, CATEGORY_INFO };

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

const resolveColorInput = (
  inputValue: WorkflowValue | undefined,
  parameters: Record<string, unknown>,
  parameterKey = "color"
) => {
  const inputVec = inputValue ? tryVec3Value(inputValue) : null;
  const inputRgb = inputVec ? normalizeRgbInput(inputVec) : null;
  if (inputRgb) {
    return {
      vec: { x: inputRgb[0], y: inputRgb[1], z: inputRgb[2] },
      hex: rgbToHex(inputRgb),
    };
  }
  const rawParam = typeof parameters[parameterKey] === "string" ? parameters[parameterKey] : null;
  const normalizedHex = normalizeHexColor(rawParam) ?? DEFAULT_MATERIAL_HEX;
  const rgb = hexToRgb(normalizedHex) ?? DEFAULT_MATERIAL_RGB;
  return {
    vec: { x: rgb[0], y: rgb[1], z: rgb[2] },
    hex: normalizedHex,
  };
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

const distanceVec3 = (a: Vec3Value, b: Vec3Value) => lengthVec3(subtractVec3(a, b));

const normalizeVec3 = (vector: Vec3Value): Vec3Value => {
  const length = lengthVec3(vector);
  if (length <= EPSILON) {
    throw new Error("Cannot normalize a zero-length vector.");
  }
  return scaleVec3(vector, 1 / length);
};

const normalizeVec3Safe = (vector: Vec3Value, fallback: Vec3Value): Vec3Value => {
  const length = lengthVec3(vector);
  if (length <= EPSILON) return fallback;
  return scaleVec3(vector, 1 / length);
};

const projectVectorOnPlane = (vector: Vec3Value, normal: Vec3Value) =>
  subtractVec3(vector, scaleVec3(normal, dotVec3(vector, normal)));

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
const DEFAULT_MATERIAL_HEX = "#2EA3A8";
const DEFAULT_MATERIAL_RGB = hexToRgb(DEFAULT_MATERIAL_HEX) ?? [0.18, 0.64, 0.66];

const toList = (value: WorkflowValue): WorkflowValue[] => {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
};

const translateMesh = (mesh: RenderMesh, offset: Vec3Value) => {
  if (!offset.x && !offset.y && !offset.z) return mesh;
  const positions = mesh.positions.slice();
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] += offset.x;
    positions[i + 1] += offset.y;
    positions[i + 2] += offset.z;
  }
  return { ...mesh, positions };
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

const toIndexList = (value: WorkflowValue): number[] =>
  toNumericList(value)
    .map((entry) => Math.round(entry))
    .filter((entry) => Number.isFinite(entry) && entry >= 0);

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

const resolveGeometryFileType = (geometry: Geometry) => {
  const metadata = geometry.metadata;
  if (metadata && typeof metadata === "object") {
    const record = metadata as Record<string, unknown>;
    const sourceFile = record.sourceFile;
    if (sourceFile && typeof sourceFile === "object") {
      const source = sourceFile as Record<string, unknown>;
      const extensionRaw = typeof source.extension === "string" ? source.extension : "";
      const nameRaw = typeof source.name === "string" ? source.name : "";
      const typeRaw = typeof source.type === "string" ? source.type : "";
      const nameExtension = nameRaw.includes(".")
        ? nameRaw.split(".").pop() ?? ""
        : "";
      const candidate =
        extensionRaw ||
        nameExtension ||
        (typeRaw.includes("/") ? typeRaw.split("/")[1] : "");
      const trimmed = candidate.trim().replace(/^\./, "").toLowerCase();
      if (trimmed.length > 0) return trimmed;
    }
    const fileType = record.fileType;
    if (typeof fileType === "string" && fileType.trim().length > 0) {
      return fileType.trim().toLowerCase();
    }
  }
  return geometry.type;
};

const meshFromTessellation = (tessellated: {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array | Uint16Array;
  uvs: Float32Array;
}): RenderMesh => ({
  positions: Array.from(tessellated.positions),
  normals: Array.from(tessellated.normals),
  indices: Array.from(tessellated.indices),
  uvs: Array.from(tessellated.uvs),
});

const resolveMeshFromGeometry = (geometry: Geometry): RenderMesh | null => {
  if (geometry.type === "nurbsSurface") {
    if (geometry.mesh?.positions?.length) return geometry.mesh;
    return meshFromTessellation(tessellateSurfaceAdaptive(geometry.nurbs));
  }
  if (geometry.type === "brep") {
    if (geometry.mesh?.positions?.length) return geometry.mesh;
    return tessellateBRepToMesh(geometry.brep);
  }
  if (geometry.type === "surface" && geometry.nurbs) {
    return meshFromTessellation(tessellateSurfaceAdaptive(geometry.nurbs));
  }
  if ("mesh" in geometry && geometry.mesh?.positions?.length) {
    return geometry.mesh;
  }
  return null;
};

const convertGeometryToMesh = (
  geometry: Geometry,
  inputs: Record<string, WorkflowValue>,
  parameters: Record<string, unknown>,
  context: WorkflowComputeContext
): RenderMesh => {
  const resolvedMesh = resolveMeshFromGeometry(geometry);
  if (resolvedMesh) return resolvedMesh;

  if (geometry.type === "polyline" || geometry.type === "nurbsCurve") {
    let points: Vec3Value[] = [];
    let closed = false;
    if (geometry.type === "polyline") {
      points = collectGeometryVertices(geometry, context, MAX_LIST_ITEMS);
      closed = geometry.closed;
      if (geometry.nurbs) {
        const tessellated = tessellateCurveAdaptive(geometry.nurbs);
        if (tessellated.points.length >= 2) {
          points = tessellated.points.slice(0, MAX_LIST_ITEMS);
        }
      }
    } else {
      const tessellated = tessellateCurveAdaptive(geometry.nurbs);
      points = tessellated.points.slice(0, MAX_LIST_ITEMS);
      closed = Boolean(geometry.closed);
      if (closed && points.length > 1) {
        const first = points[0];
        const last = points[points.length - 1];
        const isClosed =
          Math.abs(first.x - last.x) < 1e-6 &&
          Math.abs(first.y - last.y) < 1e-6 &&
          Math.abs(first.z - last.z) < 1e-6;
        if (!isClosed) {
          points = [...points, { ...first }];
        }
        points[points.length - 1] = { ...first };
      }
    }
    if (points.length < 2) {
      return EMPTY_MESH;
    }
    const distance = toNumber(
      inputs.distance,
      readNumberParameter(parameters, "distance", 0.1)
    );
    if (distance <= EPSILON) {
      return EMPTY_MESH;
    }
    const directionInput = resolveVectorInput(
      inputs,
      parameters,
      "direction",
      "direction",
      UNIT_Y_VEC3
    );
    const direction = normalizeVec3Safe(directionInput, UNIT_Y_VEC3);
    const capped = toBoolean(
      inputs.capped,
      readBooleanParameter(parameters, "capped", closed)
    );
    return generateExtrudeMesh([{ points, closed }], { direction, distance, capped });
  }

  if (geometry.type === "vertex") {
    const radius = toNumber(inputs.radius, readNumberParameter(parameters, "radius", 0.1));
    if (radius <= EPSILON) {
      return EMPTY_MESH;
    }
    const sphere = generateSphereMesh(radius, 24);
    return translateMesh(sphere, geometry.position);
  }

  return EMPTY_MESH;
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

  if (geometry.type === "nurbsCurve") {
    return geometry.nurbs.controlPoints.slice(0, maxItems);
  }

  if (geometry.type === "nurbsSurface") {
    const points: Vec3Value[] = [];
    geometry.nurbs.controlPoints.forEach((row) => {
      row.forEach((point) => {
        if (points.length >= maxItems) return;
        points.push(point);
      });
    });
    return points;
  }

  if (geometry.type === "brep") {
    if (geometry.mesh?.positions) {
      const positions: Vec3Value[] = [];
      const count = Math.floor(geometry.mesh.positions.length / 3);
      for (let i = 0; i < count && positions.length < maxItems; i += 1) {
        positions.push(vec3FromPositions(geometry.mesh.positions, i));
      }
      return positions;
    }
    return geometry.brep.vertices.slice(0, maxItems).map((vertex) => vertex.position);
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

const resolveGeometryList = (
  inputs: Record<string, WorkflowValue>,
  context: WorkflowComputeContext,
  key = "geometry"
) => {
  const value = inputs[key];
  const list = toList(value);
  const ids = list.filter((entry): entry is string => typeof entry === "string");
  return ids
    .map((id) => context.geometryById.get(id))
    .filter((geometry): geometry is Geometry => Boolean(geometry));
};

const computeBounds = (points: Vec3Value[]) => {
  if (points.length === 0) {
    return { min: ZERO_VEC3, max: ZERO_VEC3 };
  }
  const min = { ...points[0] };
  const max = { ...points[0] };
  points.forEach((point) => {
    min.x = Math.min(min.x, point.x);
    min.y = Math.min(min.y, point.y);
    min.z = Math.min(min.z, point.z);
    max.x = Math.max(max.x, point.x);
    max.y = Math.max(max.y, point.y);
    max.z = Math.max(max.z, point.z);
  });
  return { min, max };
};

const computeMeshVolume = (positions: number[], indices: number[]) => {
  let volume = 0;
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const ia = indices[i] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;
    const ax = positions[ia] ?? 0;
    const ay = positions[ia + 1] ?? 0;
    const az = positions[ia + 2] ?? 0;
    const bx = positions[ib] ?? 0;
    const by = positions[ib + 1] ?? 0;
    const bz = positions[ib + 2] ?? 0;
    const cx = positions[ic] ?? 0;
    const cy = positions[ic + 1] ?? 0;
    const cz = positions[ic + 2] ?? 0;
    const crossX = by * cz - bz * cy;
    const crossY = bz * cx - bx * cz;
    const crossZ = bx * cy - by * cx;
    volume += ax * crossX + ay * crossY + az * crossZ;
  }
  return Math.abs(volume) / 6;
};

const mergeMeshes = (meshA: RenderMesh, meshB: RenderMesh): RenderMesh => {
  const positions = [...meshA.positions, ...meshB.positions];
  const uvs = [...(meshA.uvs ?? []), ...(meshB.uvs ?? [])];
  const indexOffset = Math.floor(meshA.positions.length / 3);
  const indices = [
    ...(meshA.indices ?? []),
    ...(meshB.indices ?? []).map((index) => index + indexOffset),
  ];
  const normals =
    meshA.normals?.length && meshB.normals?.length
      ? [...meshA.normals, ...meshB.normals]
      : computeVertexNormals(positions, indices);
  return {
    positions,
    normals,
    uvs,
    indices,
  };
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

  if (geometry.type === "brep") {
    const positionsById = new Map(
      geometry.brep.vertices.map((vertex) => [vertex.id, vertex.position])
    );
    geometry.brep.edges.forEach((edge) => {
      if (edges.length >= maxItems) return;
      const start = positionsById.get(edge.vertices[0]);
      const end = positionsById.get(edge.vertices[1]);
      if (start && end) {
        edges.push([start, end]);
      }
    });
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
  if (geometry.type === "nurbsCurve") {
    return geometry.nurbs.controlPoints.slice(0, maxItems);
  }

  if (geometry.type === "nurbsSurface") {
    const points: Vec3Value[] = [];
    geometry.nurbs.controlPoints.forEach((row) => {
      row.forEach((point) => {
        if (points.length >= maxItems) return;
        points.push(point);
      });
    });
    return points;
  }

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
  if (geometry.type === "nurbsCurve") return geometry.nurbs.controlPoints.length;
  if (geometry.type === "nurbsSurface") {
    return geometry.nurbs.controlPoints.reduce((acc, row) => acc + row.length, 0);
  }
  if (geometry.type === "brep") {
    if (geometry.mesh?.positions) {
      return Math.floor(geometry.mesh.positions.length / 3);
    }
    return geometry.brep.vertices.length;
  }
  if ("mesh" in geometry && geometry.mesh?.positions) {
    return Math.floor(geometry.mesh.positions.length / 3);
  }
  return 0;
};

const countGeometryFaces = (geometry: Geometry) => {
  if (geometry.type === "brep") {
    if (geometry.mesh?.indices) {
      return Math.floor(geometry.mesh.indices.length / 3);
    }
    return geometry.brep.faces.length;
  }
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
  if (geometry.type === "brep") {
    return geometry.brep.edges.length;
  }
  return 0;
};

const countGeometryNormals = (geometry: Geometry) => {
  if (geometry.type === "brep" && geometry.mesh?.normals) {
    return Math.floor(geometry.mesh.normals.length / 3);
  }
  if (!("mesh" in geometry) || !geometry.mesh?.normals) return 0;
  return Math.floor(geometry.mesh.normals.length / 3);
};

const countGeometryControlPoints = (geometry: Geometry, context: WorkflowComputeContext) => {
  if (geometry.type === "nurbsCurve") {
    return geometry.nurbs.controlPoints.length;
  }
  if (geometry.type === "nurbsSurface") {
    return geometry.nurbs.controlPoints.reduce((acc, row) => acc + row.length, 0);
  }
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

const collectGeometryPositions = (
  geometry: Geometry,
  context: WorkflowComputeContext,
  maxItems = 10000
) => {
  if (geometry.type === "vertex") {
    return [geometry.position as Vec3Value];
  }

  if (geometry.type === "polyline") {
    const positions: Vec3Value[] = [];
    geometry.vertexIds.forEach((vertexId) => {
      if (positions.length >= maxItems) return;
      const vertex = context.vertexById.get(vertexId);
      if (vertex) positions.push(vertex.position as Vec3Value);
    });
    return positions;
  }

  if (geometry.type === "nurbsCurve") {
    return geometry.nurbs.controlPoints.slice(0, maxItems);
  }

  if (geometry.type === "nurbsSurface") {
    const positions: Vec3Value[] = [];
    geometry.nurbs.controlPoints.forEach((row) => {
      row.forEach((point) => {
        if (positions.length >= maxItems) return;
        positions.push(point);
      });
    });
    return positions;
  }

  if (geometry.type === "brep") {
    if (geometry.mesh?.positions) {
      const positions: Vec3Value[] = [];
      const count = Math.floor(geometry.mesh.positions.length / 3);
      for (let i = 0; i < count && positions.length < maxItems; i += 1) {
        positions.push(vec3FromPositions(geometry.mesh.positions, i));
      }
      return positions;
    }
    return geometry.brep.vertices.slice(0, maxItems).map((vertex) => vertex.position);
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

const resolveGeometryPositionByIndex = (
  geometry: Geometry,
  context: WorkflowComputeContext,
  index: number
): Vec3Value | null => {
  if (index < 0) return null;
  if (geometry.type === "vertex") {
    return index === 0 ? (geometry.position as Vec3Value) : null;
  }
  if (geometry.type === "polyline") {
    const vertexId = geometry.vertexIds[index];
    if (!vertexId) return null;
    const vertex = context.vertexById.get(vertexId);
    return vertex ? (vertex.position as Vec3Value) : null;
  }
  if (geometry.type === "brep") {
    if (geometry.mesh?.positions) {
      const count = Math.floor(geometry.mesh.positions.length / 3);
      if (index >= count) return null;
      return vec3FromPositions(geometry.mesh.positions, index);
    }
    const vertex = geometry.brep.vertices[index];
    return vertex ? (vertex.position as Vec3Value) : null;
  }
  if ("mesh" in geometry && geometry.mesh?.positions) {
    const count = Math.floor(geometry.mesh.positions.length / 3);
    if (index >= count) return null;
    return vec3FromPositions(geometry.mesh.positions, index);
  }
  return null;
};

const computeBoundsFromPositions = (positions: Vec3Value[]) => {
  if (positions.length === 0) {
    return {
      min: { x: -0.5, y: -0.5, z: -0.5 },
      max: { x: 0.5, y: 0.5, z: 0.5 },
    };
  }
  const min = { x: positions[0].x, y: positions[0].y, z: positions[0].z };
  const max = { x: positions[0].x, y: positions[0].y, z: positions[0].z };
  positions.forEach((point) => {
    min.x = Math.min(min.x, point.x);
    min.y = Math.min(min.y, point.y);
    min.z = Math.min(min.z, point.z);
    max.x = Math.max(max.x, point.x);
    max.y = Math.max(max.y, point.y);
    max.z = Math.max(max.z, point.z);
  });
  const expand = (value: number) => (Number.isFinite(value) ? value : 0);
  return { min: { x: expand(min.x), y: expand(min.y), z: expand(min.z) }, max: { x: expand(max.x), y: expand(max.y), z: expand(max.z) } };
};

const DEFAULT_VOXEL_BOUNDS = {
  min: { x: -0.5, y: -0.5, z: -0.5 },
  max: { x: 0.5, y: 0.5, z: 0.5 },
};

const coerceFiniteNumber = (value: unknown, fallback: number) =>
  isFiniteNumber(value) ? value : fallback;

const coerceVec3 = (
  value: Partial<Vec3Value> | undefined,
  fallback: Vec3Value
): Vec3Value => ({
  x: coerceFiniteNumber(value?.x, fallback.x),
  y: coerceFiniteNumber(value?.y, fallback.y),
  z: coerceFiniteNumber(value?.z, fallback.z),
});

const normalizeVoxelBounds = (bounds?: { min: Vec3Value; max: Vec3Value }) => {
  if (!bounds) return DEFAULT_VOXEL_BOUNDS;
  const min = coerceVec3(bounds.min, DEFAULT_VOXEL_BOUNDS.min);
  const max = coerceVec3(bounds.max, DEFAULT_VOXEL_BOUNDS.max);
  const normalizedMin = {
    x: Math.min(min.x, max.x),
    y: Math.min(min.y, max.y),
    z: Math.min(min.z, max.z),
  };
  const normalizedMax = {
    x: Math.max(min.x, max.x),
    y: Math.max(min.y, max.y),
    z: Math.max(min.z, max.z),
  };
  const center = {
    x: (normalizedMin.x + normalizedMax.x) * 0.5,
    y: (normalizedMin.y + normalizedMax.y) * 0.5,
    z: (normalizedMin.z + normalizedMax.z) * 0.5,
  };
  const size = {
    x: normalizedMax.x - normalizedMin.x,
    y: normalizedMax.y - normalizedMin.y,
    z: normalizedMax.z - normalizedMin.z,
  };
  const fixAxis = (axis: keyof Vec3Value) => {
    const span = size[axis];
    if (!Number.isFinite(span) || Math.abs(span) <= EPSILON) {
      normalizedMin[axis] = center[axis] - 0.5;
      normalizedMax[axis] = center[axis] + 0.5;
    }
  };
  fixAxis("x");
  fixAxis("y");
  fixAxis("z");
  return { min: normalizedMin, max: normalizedMax };
};

const resolveBoundsSize = (bounds: { min: Vec3Value; max: Vec3Value }) => ({
  x: bounds.max.x - bounds.min.x,
  y: bounds.max.y - bounds.min.y,
  z: bounds.max.z - bounds.min.z,
});

const resolveBoundsVolume = (bounds: { min: Vec3Value; max: Vec3Value }) => {
  const size = resolveBoundsSize(bounds);
  const volume = size.x * size.y * size.z;
  return Number.isFinite(volume) && volume > 0 ? volume : 1;
};

const positionToVoxelIndex = (
  position: Vec3Value,
  bounds: { min: Vec3Value; max: Vec3Value },
  resolution: number
) => {
  const size = resolveBoundsSize(bounds);
  const safeRes = Math.max(1, Math.floor(resolution));
  const toAxis = (value: number, min: number, span: number) => {
    if (!Number.isFinite(span) || Math.abs(span) <= EPSILON) return 0;
    const t = (value - min) / span;
    return clampInt(Math.floor(t * safeRes), 0, safeRes - 1, 0);
  };
  const x = toAxis(position.x, bounds.min.x, size.x);
  const y = toAxis(position.y, bounds.min.y, size.y);
  const z = toAxis(position.z, bounds.min.z, size.z);
  return x + y * safeRes + z * safeRes * safeRes;
};

const inferVoxelResolutionFromCount = (count: number) => {
  if (!Number.isFinite(count) || count <= 0) return null;
  const root = Math.round(Math.cbrt(count));
  if (root > 1 && root * root * root === count) return root;
  return null;
};

const isVoxelGrid = (value: WorkflowValue): value is VoxelGrid => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<VoxelGrid>;
  return Boolean(
    candidate.densities &&
      Array.isArray(candidate.densities) &&
      candidate.resolution &&
      typeof candidate.resolution.x === "number" &&
      typeof candidate.resolution.y === "number" &&
      typeof candidate.resolution.z === "number"
  );
};

const clampResolution = (value: number, fallback = 12) =>
  clampInt(Math.round(value), 4, 36, fallback);

const buildVoxelGridFromGeometry = (
  geometry: Geometry,
  context: WorkflowComputeContext,
  resolutionValue: number,
  paddingValue: number,
  mode: string,
  thicknessValue: number
): VoxelGrid => {
  const positions = collectGeometryPositions(geometry, context);
  const bounds = computeBoundsFromPositions(positions);
  const padding = Number.isFinite(paddingValue) ? Math.max(0, paddingValue) : 0;
  const paddedBounds = normalizeVoxelBounds({
    min: {
      x: bounds.min.x - padding,
      y: bounds.min.y - padding,
      z: bounds.min.z - padding,
    },
    max: {
      x: bounds.max.x + padding,
      y: bounds.max.y + padding,
      z: bounds.max.z + padding,
    },
  });
  const min = paddedBounds.min;
  const max = paddedBounds.max;
  const size = {
    x: max.x - min.x,
    y: max.y - min.y,
    z: max.z - min.z,
  };
  const resolution = clampResolution(resolutionValue, 12);
  const res = { x: resolution, y: resolution, z: resolution };
  const cellSize = {
    x: size.x / res.x,
    y: size.y / res.y,
    z: size.z / res.z,
  };
  const cellCount = res.x * res.y * res.z;
  const normalizedMode = mode === "surface" ? "surface" : "solid";
  const hasSamples = positions.length > 0;
  const baseDensity = normalizedMode === "solid" && hasSamples ? 1 : 0;
  const densities = new Array<number>(cellCount).fill(baseDensity);
  if (normalizedMode === "surface" && positions.length > 0) {
    const radius = clampInt(Math.round(thicknessValue), 0, 4, 1);
    const toIndex = (x: number, y: number, z: number) =>
      x + y * res.x + z * res.x * res.y;
    positions.forEach((point) => {
      const ix = clampInt(Math.floor((point.x - min.x) / cellSize.x), 0, res.x - 1, 0);
      const iy = clampInt(Math.floor((point.y - min.y) / cellSize.y), 0, res.y - 1, 0);
      const iz = clampInt(Math.floor((point.z - min.z) / cellSize.z), 0, res.z - 1, 0);
      for (let dz = -radius; dz <= radius; dz += 1) {
        const z = iz + dz;
        if (z < 0 || z >= res.z) continue;
        for (let dy = -radius; dy <= radius; dy += 1) {
          const y = iy + dy;
          if (y < 0 || y >= res.y) continue;
          for (let dx = -radius; dx <= radius; dx += 1) {
            const x = ix + dx;
            if (x < 0 || x >= res.x) continue;
            densities[toIndex(x, y, z)] = 1;
          }
        }
      }
    });
  }

  return {
    resolution: res,
    bounds: paddedBounds,
    cellSize,
    densities,
  };
};

const normalizeVoxelGrid = (grid: VoxelGrid, fallbackResolution = 12): VoxelGrid => {
  const resX = clampResolution(grid.resolution.x, fallbackResolution);
  const resY = clampResolution(grid.resolution.y, resX);
  const resZ = clampResolution(grid.resolution.z, resX);
  const resolution = { x: resX, y: resY, z: resZ };
  const bounds = normalizeVoxelBounds(grid.bounds);
  const size = {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z,
  };
  const computedCellSize = {
    x: size.x / resolution.x,
    y: size.y / resolution.y,
    z: size.z / resolution.z,
  };
  const rawCellSize = coerceVec3(grid.cellSize, computedCellSize);
  const cellSize = {
    x: rawCellSize.x > EPSILON ? rawCellSize.x : computedCellSize.x,
    y: rawCellSize.y > EPSILON ? rawCellSize.y : computedCellSize.y,
    z: rawCellSize.z > EPSILON ? rawCellSize.z : computedCellSize.z,
  };
  const cellCount = resolution.x * resolution.y * resolution.z;
  const densities = new Array<number>(cellCount);
  const source = Array.isArray(grid.densities) ? grid.densities : [];
  for (let i = 0; i < cellCount; i += 1) {
    const value = source[i];
    densities[i] = isFiniteNumber(value) ? clampNumber(value, 0, 1) : 0;
  }
  return {
    resolution,
    bounds,
    cellSize,
    densities,
  };
};

const buildVoxelGridFromDensities = (
  densities: number[],
  resolutionHint?: number,
  boundsHint?: { min: Vec3Value; max: Vec3Value }
) => {
  const inferred = inferVoxelResolutionFromCount(densities.length);
  const baseResolution = clampResolution(
    inferred ?? resolutionHint ?? 12,
    inferred ?? resolutionHint ?? 12
  );
  const bounds = normalizeVoxelBounds(boundsHint);
  const size = {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z,
  };
  const cellSize = {
    x: size.x / baseResolution,
    y: size.y / baseResolution,
    z: size.z / baseResolution,
  };
  return normalizeVoxelGrid(
    {
      resolution: { x: baseResolution, y: baseResolution, z: baseResolution },
      bounds,
      cellSize,
      densities,
    },
    baseResolution
  );
};

const coerceVoxelGrid = (
  value: WorkflowValue,
  resolutionHint?: number,
  boundsHint?: { min: Vec3Value; max: Vec3Value }
) => {
  if (isVoxelGrid(value)) {
    return normalizeVoxelGrid(value, resolutionHint ?? 12);
  }
  if (Array.isArray(value)) {
    return buildVoxelGridFromDensities(value as number[], resolutionHint, boundsHint);
  }
  if (value && typeof value === "object") {
    const candidate = value as Partial<VoxelGrid>;
    if (Array.isArray(candidate.densities)) {
      const hint =
        typeof candidate.resolution?.x === "number"
          ? candidate.resolution.x
          : resolutionHint;
      return buildVoxelGridFromDensities(
        candidate.densities as number[],
        hint,
        candidate.bounds ?? boundsHint
      );
    }
  }
  return null;
};

const appendBoxMesh = (
  mesh: RenderMesh,
  min: Vec3Value,
  size: Vec3Value
) => {
  const x0 = min.x;
  const y0 = min.y;
  const z0 = min.z;
  const x1 = min.x + size.x;
  const y1 = min.y + size.y;
  const z1 = min.z + size.z;
  const positions = [
    // +X
    x1, y0, z0, x1, y0, z1, x1, y1, z1, x1, y1, z0,
    // -X
    x0, y0, z1, x0, y0, z0, x0, y1, z0, x0, y1, z1,
    // +Y
    x0, y1, z0, x1, y1, z0, x1, y1, z1, x0, y1, z1,
    // -Y
    x0, y0, z1, x1, y0, z1, x1, y0, z0, x0, y0, z0,
    // +Z
    x0, y0, z1, x0, y1, z1, x1, y1, z1, x1, y0, z1,
    // -Z
    x1, y0, z0, x1, y1, z0, x0, y1, z0, x0, y0, z0,
  ];
  const normals = [
    // +X
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    // -X
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    // +Y
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    // -Y
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    // +Z
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    // -Z
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
  ];
  const uvs = [
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
  ];
  const baseIndex = mesh.positions.length / 3;
  mesh.positions.push(...positions);
  mesh.normals.push(...normals);
  mesh.uvs.push(...uvs);
  mesh.indices.push(
    baseIndex, baseIndex + 1, baseIndex + 2,
    baseIndex, baseIndex + 2, baseIndex + 3,
    baseIndex + 4, baseIndex + 5, baseIndex + 6,
    baseIndex + 4, baseIndex + 6, baseIndex + 7,
    baseIndex + 8, baseIndex + 9, baseIndex + 10,
    baseIndex + 8, baseIndex + 10, baseIndex + 11,
    baseIndex + 12, baseIndex + 13, baseIndex + 14,
    baseIndex + 12, baseIndex + 14, baseIndex + 15,
    baseIndex + 16, baseIndex + 17, baseIndex + 18,
    baseIndex + 16, baseIndex + 18, baseIndex + 19,
    baseIndex + 20, baseIndex + 21, baseIndex + 22,
    baseIndex + 20, baseIndex + 22, baseIndex + 23
  );
};

const FACE_UVS = [0, 0, 1, 0, 1, 1, 0, 1];
const MAX_VERTICES_U16 = 65535;
const VERTS_PER_FACE = 4;
const MAX_VOXEL_FACES = Math.floor(MAX_VERTICES_U16 / VERTS_PER_FACE);

type VoxelFace = "px" | "nx" | "py" | "ny" | "pz" | "nz";

const appendBoxFace = (
  mesh: RenderMesh,
  face: VoxelFace,
  min: Vec3Value,
  size: Vec3Value
) => {
  const x0 = min.x;
  const y0 = min.y;
  const z0 = min.z;
  const x1 = min.x + size.x;
  const y1 = min.y + size.y;
  const z1 = min.z + size.z;
  let positions: number[] = [];
  let normals: number[] = [];
  switch (face) {
    case "px":
      positions = [
        x1, y0, z0, x1, y0, z1, x1, y1, z1, x1, y1, z0,
      ];
      normals = [
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
      ];
      break;
    case "nx":
      positions = [
        x0, y0, z1, x0, y0, z0, x0, y1, z0, x0, y1, z1,
      ];
      normals = [
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
      ];
      break;
    case "py":
      positions = [
        x0, y1, z0, x1, y1, z0, x1, y1, z1, x0, y1, z1,
      ];
      normals = [
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
      ];
      break;
    case "ny":
      positions = [
        x0, y0, z1, x1, y0, z1, x1, y0, z0, x0, y0, z0,
      ];
      normals = [
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
      ];
      break;
    case "pz":
      positions = [
        x0, y0, z1, x0, y1, z1, x1, y1, z1, x1, y0, z1,
      ];
      normals = [
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
      ];
      break;
    case "nz":
      positions = [
        x1, y0, z0, x1, y1, z0, x0, y1, z0, x0, y0, z0,
      ];
      normals = [
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
      ];
      break;
    default:
      return;
  }
  const baseIndex = mesh.positions.length / 3;
  mesh.positions.push(...positions);
  mesh.normals.push(...normals);
  mesh.uvs.push(...FACE_UVS);
  mesh.indices.push(
    baseIndex, baseIndex + 1, baseIndex + 2,
    baseIndex, baseIndex + 2, baseIndex + 3
  );
};

const buildVoxelMesh = (grid: VoxelGrid, isoValue: number) => {
  const mesh: RenderMesh = {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
  };
  const { resolution, bounds, cellSize, densities } = grid;
  const resX = Math.max(1, Math.round(resolution.x));
  const resY = Math.max(1, Math.round(resolution.y));
  const resZ = Math.max(1, Math.round(resolution.z));
  const cellCount = resX * resY * resZ;
  if (cellCount <= 0) return mesh;
  if (isoValue <= 0) {
    appendBoxMesh(mesh, bounds.min, {
      x: bounds.max.x - bounds.min.x,
      y: bounds.max.y - bounds.min.y,
      z: bounds.max.z - bounds.min.z,
    });
    return mesh;
  }
  const toIndex = (x: number, y: number, z: number) =>
    x + y * resX + z * resX * resY;
  const occupancy = new Uint8Array(cellCount);
  let minX = resX;
  let minY = resY;
  let minZ = resZ;
  let maxX = -1;
  let maxY = -1;
  let maxZ = -1;
  let occupied = 0;
  for (let z = 0; z < resZ; z += 1) {
    for (let y = 0; y < resY; y += 1) {
      for (let x = 0; x < resX; x += 1) {
        const idx = toIndex(x, y, z);
        const density = densities[idx] ?? 0;
        if (density < isoValue) continue;
        occupancy[idx] = 1;
        occupied += 1;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (z < minZ) minZ = z;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        if (z > maxZ) maxZ = z;
      }
    }
  }
  if (occupied === 0) {
    return mesh;
  }

  let faceCount = 0;
  let capped = false;
  const tryAppendFace = (face: VoxelFace, min: Vec3Value) => {
    if (faceCount >= MAX_VOXEL_FACES) {
      capped = true;
      return;
    }
    appendBoxFace(mesh, face, min, cellSize);
    faceCount += 1;
  };

  const stepY = resX;
  const stepZ = resX * resY;
  for (let z = minZ; z <= maxZ; z += 1) {
    if (capped) break;
    const zOffset = z * stepZ;
    const zMin = bounds.min.z + z * cellSize.z;
    for (let y = minY; y <= maxY; y += 1) {
      if (capped) break;
      const rowOffset = zOffset + y * stepY;
      const yMin = bounds.min.y + y * cellSize.y;
      let idx = rowOffset + minX;
      for (let x = minX; x <= maxX; x += 1, idx += 1) {
        if (capped) break;
        if (!occupancy[idx]) continue;
        const min = {
          x: bounds.min.x + x * cellSize.x,
          y: yMin,
          z: zMin,
        };
        if (x === resX - 1 || occupancy[idx + 1] === 0) {
          tryAppendFace("px", min);
        }
        if (x === 0 || occupancy[idx - 1] === 0) {
          tryAppendFace("nx", min);
        }
        if (y === resY - 1 || occupancy[idx + stepY] === 0) {
          tryAppendFace("py", min);
        }
        if (y === 0 || occupancy[idx - stepY] === 0) {
          tryAppendFace("ny", min);
        }
        if (z === resZ - 1 || occupancy[idx + stepZ] === 0) {
          tryAppendFace("pz", min);
        }
        if (z === 0 || occupancy[idx - stepZ] === 0) {
          tryAppendFace("nz", min);
        }
      }
    }
  }
  
  // Add density gradient colors to mesh
  if (mesh.positions.length > 0) {
    const vertexCount = Math.floor(mesh.positions.length / 3);
    const colors = new Array<number>(mesh.positions.length).fill(0);
    
    // Find density range for normalization
    let minDensity = Number.POSITIVE_INFINITY;
    let maxDensity = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < densities.length; i += 1) {
      const d = densities[i];
      if (Number.isFinite(d)) {
        minDensity = Math.min(minDensity, d);
        maxDensity = Math.max(maxDensity, d);
      }
    }
    
    const densityRange = Math.max(1e-9, maxDensity - minDensity);
    
    // Map each vertex to density gradient color
    for (let i = 0; i < vertexCount; i += 1) {
      const px = mesh.positions[i * 3];
      const py = mesh.positions[i * 3 + 1];
      const pz = mesh.positions[i * 3 + 2];
      
      // Find voxel cell for this vertex
      const x = Math.max(0, Math.min(resX - 1, Math.floor((px - bounds.min.x) / cellSize.x)));
      const y = Math.max(0, Math.min(resY - 1, Math.floor((py - bounds.min.y) / cellSize.y)));
      const z = Math.max(0, Math.min(resZ - 1, Math.floor((pz - bounds.min.z) / cellSize.z)));
      const idx = toIndex(x, y, z);
      
      const density = densities[idx] ?? 0;
      const normalized = Number.isFinite(density) ? Math.max(0, Math.min(1, (density - minDensity) / densityRange)) : 0;
      
      // Density gradient: black (low) → white (high)
      // Using a subtle blue-gray to white gradient for better visibility
      const r = 0.08 + normalized * 0.87;  // 0.08 → 0.95
      const g = 0.08 + normalized * 0.88;  // 0.08 → 0.96
      const b = 0.12 + normalized * 0.85;  // 0.12 → 0.97
      
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    
    mesh.colors = colors;
  }
  
  return mesh;
};

const buildChemistryMesh = (
  field: ChemistryField,
  materials: ChemistryMaterialSpec[],
  isoValue: number
) => {
  const mesh = buildVoxelMesh(
    {
      resolution: field.resolution,
      bounds: field.bounds,
      cellSize: field.cellSize,
      densities: field.densities,
    },
    isoValue
  );
  if (!mesh.positions.length) return mesh;

  const materialColorByName = new Map<string, [number, number, number]>();
  materials.forEach((material) => {
    materialColorByName.set(material.name, material.color);
  });

  const resX = Math.max(1, Math.round(field.resolution.x));
  const resY = Math.max(1, Math.round(field.resolution.y));
  const resZ = Math.max(1, Math.round(field.resolution.z));
  const cellSize = field.cellSize;
  const bounds = field.bounds;
  const toIndex = (x: number, y: number, z: number) =>
    x + y * resX + z * resX * resY;
  const clampIndex = (value: number, max: number) =>
    Math.min(max, Math.max(0, value));

  const colors = new Array<number>(mesh.positions.length).fill(0.5);
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = clampIndex(
      Math.floor((mesh.positions[i] - bounds.min.x) / cellSize.x),
      resX - 1
    );
    const y = clampIndex(
      Math.floor((mesh.positions[i + 1] - bounds.min.y) / cellSize.y),
      resY - 1
    );
    const z = clampIndex(
      Math.floor((mesh.positions[i + 2] - bounds.min.z) / cellSize.z),
      resZ - 1
    );
    const idx = toIndex(x, y, z);
    
    // Collect concentrations and validate/normalize
    const concentrations: number[] = [];
    for (let m = 0; m < field.channels.length; m += 1) {
      concentrations.push(field.channels[m][idx] ?? 0);
    }
    const normalized = normalizeNonNegative(concentrations, EPSILON);
    
    let r = 0;
    let g = 0;
    let b = 0;
    let hasColor = false;
    
    for (let m = 0; m < field.channels.length; m += 1) {
      const conc = normalized[m];
      if (conc <= 0) continue;
      
      const name = field.materials[m];
      const color = materialColorByName.get(name);
      if (!color) {
        warnOnce(`unknown-material:${name}`, `[Chemistry] Unknown material '${name}', falling back to gray`);
      }
      const rgb = color ?? [0.5, 0.5, 0.5];
      
      r += conc * rgb[0];
      g += conc * rgb[1];
      b += conc * rgb[2];
      hasColor = true;
    }
    
    if (!hasColor) {
      r = 0.5;
      g = 0.5;
      b = 0.5;
    }
    
    colors[i] = clamp01(r);
    colors[i + 1] = clamp01(g);
    colors[i + 2] = clamp01(b);
  }

  return { ...mesh, colors };
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

type QuaternionValue = { x: number; y: number; z: number; w: number };

const rotateVec3ByQuaternion = (vector: Vec3Value, q: QuaternionValue): Vec3Value => {
  const tx = 2 * (q.y * vector.z - q.z * vector.y);
  const ty = 2 * (q.z * vector.x - q.x * vector.z);
  const tz = 2 * (q.x * vector.y - q.y * vector.x);
  return {
    x: vector.x + q.w * tx + (q.y * tz - q.z * ty),
    y: vector.y + q.w * ty + (q.z * tx - q.x * tz),
    z: vector.z + q.w * tz + (q.x * ty - q.y * tx),
  };
};

const quaternionFromTo = (from: Vec3Value, to: Vec3Value): QuaternionValue => {
  const fromUnit = normalizeVec3Safe(from, UNIT_Y_VEC3);
  const toUnit = normalizeVec3Safe(to, UNIT_Y_VEC3);
  const dot = dotVec3(fromUnit, toUnit);
  if (dot > 1 - 1e-6) {
    return { x: 0, y: 0, z: 0, w: 1 };
  }
  if (dot < -1 + 1e-6) {
    return { x: 1, y: 0, z: 0, w: 0 };
  }
  const axis = crossVec3(fromUnit, toUnit);
  const w = 1 + dot;
  const invLen = 1 / Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z + w * w);
  return {
    x: axis.x * invLen,
    y: axis.y * invLen,
    z: axis.z * invLen,
    w: w * invLen,
  };
};

const transformMeshWithQuaternion = (
  mesh: RenderMesh,
  rotation: QuaternionValue,
  offset: Vec3Value
) => {
  const positions: number[] = new Array(mesh.positions.length);
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const rotated = rotateVec3ByQuaternion(
      { x: mesh.positions[i], y: mesh.positions[i + 1], z: mesh.positions[i + 2] },
      rotation
    );
    positions[i] = rotated.x + offset.x;
    positions[i + 1] = rotated.y + offset.y;
    positions[i + 2] = rotated.z + offset.z;
  }
  const normals: number[] = mesh.normals?.length ? new Array(mesh.normals.length) : [];
  if (mesh.normals?.length) {
    for (let i = 0; i < mesh.normals.length; i += 3) {
      const rotated = rotateVec3ByQuaternion(
        { x: mesh.normals[i], y: mesh.normals[i + 1], z: mesh.normals[i + 2] },
        rotation
      );
      normals[i] = rotated.x;
      normals[i + 1] = rotated.y;
      normals[i + 2] = rotated.z;
    }
  }
  return {
    positions,
    normals: normals.length ? normals : computeVertexNormals(positions, mesh.indices),
    uvs: mesh.uvs ? mesh.uvs.slice() : [],
    indices: mesh.indices.slice(),
  };
};

const collectVec3List = (value: WorkflowValue): Vec3Value[] => {
  const points: Vec3Value[] = [];
  const walk = (entry: WorkflowValue) => {
    if (points.length >= MAX_LIST_ITEMS) return;
    if (Array.isArray(entry)) {
      entry.forEach((item) => walk(item as WorkflowValue));
      return;
    }
    const vec = tryVec3Value(entry);
    if (vec) points.push(vec);
  };
  walk(value);
  return points;
};

const parsePointsText = (input?: string): Vec3Value[] => {
  if (!input) return [];
  const numbers = input
    .split(/[\s,]+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (numbers.length < 2) return [];
  const groupSize = numbers.length % 3 === 0 ? 3 : 2;
  const points: Vec3Value[] = [];
  for (let i = 0; i + groupSize - 1 < numbers.length; i += groupSize) {
    if (groupSize === 3) {
      points.push({ x: numbers[i], y: numbers[i + 1], z: numbers[i + 2] });
    } else {
      points.push({ x: numbers[i], y: 0, z: numbers[i + 1] });
    }
  }
  return points;
};

const resolvePointInput = (
  value: WorkflowValue,
  context: WorkflowComputeContext
): Vec3Value | null => {
  if (value == null) return null;
  if (typeof value === "string") {
    const parsed = tryVec3Value(value);
    if (parsed) return parsed;
    const geometry = context.geometryById.get(value);
    if (!geometry) return null;
    const points = collectGeometryVertices(geometry, context, 1);
    return points[0] ?? null;
  }
  const vec = tryVec3Value(value);
  if (vec) return vec;
  return null;
};

const collectPointList = (
  value: WorkflowValue,
  context: WorkflowComputeContext
): Vec3Value[] => {
  const points: Vec3Value[] = [];
  const walk = (entry: WorkflowValue) => {
    if (points.length >= MAX_LIST_ITEMS || entry == null) return;
    if (Array.isArray(entry)) {
      entry.forEach((item) => walk(item as WorkflowValue));
      return;
    }
    if (typeof entry === "string") {
      const parsed = tryVec3Value(entry);
      if (parsed) {
        points.push(parsed);
        return;
      }
      const geometry = context.geometryById.get(entry);
      if (geometry) {
        const geometryPoints = collectGeometryVertices(
          geometry,
          context,
          MAX_LIST_ITEMS - points.length
        );
        points.push(...geometryPoints);
      }
      return;
    }
    const vec = tryVec3Value(entry);
    if (vec) points.push(vec);
  };
  walk(value);
  return points;
};

const collectVec3Paths = (value: WorkflowValue): Vec3Value[][] => {
  const paths: Vec3Value[][] = [];
  const walk = (entry: WorkflowValue) => {
    if (!Array.isArray(entry)) return;
    const vectors: Vec3Value[] = [];
    let allVectors = true;
    entry.forEach((item) => {
      const vec = tryVec3Value(item as WorkflowValue);
      if (!vec) {
        allVectors = false;
      } else {
        vectors.push(vec);
      }
    });
    if (allVectors && vectors.length >= 2) {
      paths.push(vectors);
      return;
    }
    entry.forEach((item) => walk(item as WorkflowValue));
  };
  walk(value);
  return paths;
};

const collectSegmentList = (value: WorkflowValue): Array<[Vec3Value, Vec3Value]> => {
  const segments: Array<[Vec3Value, Vec3Value]> = [];
  const walk = (entry: WorkflowValue) => {
    if (!Array.isArray(entry) || segments.length >= MAX_LIST_ITEMS) return;
    if (entry.length === 2) {
      const a = tryVec3Value(entry[0] as WorkflowValue);
      const b = tryVec3Value(entry[1] as WorkflowValue);
      if (a && b) {
        segments.push([a, b]);
        return;
      }
    }
    entry.forEach((item) => walk(item as WorkflowValue));
  };
  walk(value);
  return segments;
};

const distance2D = (a: Vec3Value, b: Vec3Value, plane: "xy" | "xz" | "yz") => {
  if (plane === "xy") {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  if (plane === "yz") {
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dy * dy + dz * dz);
  }
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
};

const midpointVec3 = (a: Vec3Value, b: Vec3Value): Vec3Value => ({
  x: (a.x + b.x) * 0.5,
  y: (a.y + b.y) * 0.5,
  z: (a.z + b.z) * 0.5,
});

const closestPointOnSegmentVec3 = (
  point: Vec3Value,
  a: Vec3Value,
  b: Vec3Value
): Vec3Value => {
  const ab = subtractVec3(b, a);
  const abLenSq = Math.max(dotVec3(ab, ab), EPSILON);
  const t = dotVec3(subtractVec3(point, a), ab) / abLenSq;
  const clamped = Math.min(1, Math.max(0, t));
  return addVec3(a, scaleVec3(ab, clamped));
};

const rotateVec3AroundAxis = (vector: Vec3Value, axis: Vec3Value, angleRadians: number) => {
  const unitAxis = normalizeVec3(axis);
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  const term1 = scaleVec3(vector, cos);
  const term2 = scaleVec3(crossVec3(unitAxis, vector), sin);
  const term3 = scaleVec3(unitAxis, dotVec3(unitAxis, vector) * (1 - cos));
  return addVec3(addVec3(term1, term2), term3);
};

const buildPlaneBasis = (normal: Vec3Value, reference: Vec3Value) => {
  const unitNormal = normalizeVec3Safe(normal, UNIT_Z_VEC3);
  const ref = normalizeVec3Safe(reference, UNIT_X_VEC3);
  const projected = projectVectorOnPlane(ref, unitNormal);
  const projectedLen = lengthVec3(projected);
  let xAxis =
    projectedLen > EPSILON
      ? scaleVec3(projected, 1 / projectedLen)
      : ZERO_VEC3;
  if (lengthVec3(xAxis) <= EPSILON) {
    const fallback = Math.abs(unitNormal.y) < 0.9 ? UNIT_Y_VEC3 : UNIT_X_VEC3;
    xAxis = normalizeVec3Safe(crossVec3(fallback, unitNormal), UNIT_X_VEC3);
  }
  const yAxis = crossVec3(unitNormal, xAxis);
  return { xAxis, yAxis, zAxis: unitNormal };
};

const runTopologyDensitySolver = (args: {
  seedKey: string;
  resolution: number;
  volumeFraction: number;
  penaltyExponent: number;
  filterRadius: number;
  iterations: number;
  initialDensities?: number[];
}) => {
  const seed = hashStringToSeed(args.seedKey);
  const random = createSeededRandom(seed);
  const resolution = clampInt(args.resolution, 4, 36, 10);
  const resX = resolution;
  const resY = resolution;
  const resZ = resolution;
  const cellCount = resX * resY * resZ;
  const rawVolumeFraction = Number.isFinite(args.volumeFraction) ? args.volumeFraction : 0.4;
  const volumeFraction = clampNumber(rawVolumeFraction, 0.05, 0.95);
  const rawPenaltyExponent = Number.isFinite(args.penaltyExponent) ? args.penaltyExponent : 3;
  const penaltyExponent = clampNumber(rawPenaltyExponent, 1, 6);
  const iterations = clampInt(args.iterations, 1, 120, 40);
  const rawFilterRadius = Number.isFinite(args.filterRadius) ? args.filterRadius : 2;
  const neighborSpan = clampInt(Math.round(rawFilterRadius), 0, 6, 2);

  const baseDensities =
    Array.isArray(args.initialDensities) && args.initialDensities.length === cellCount
      ? args.initialDensities
      : null;
  const densities = baseDensities
    ? baseDensities.map((value) =>
        isFiniteNumber(value) ? clampNumber(value, 0, 1) : volumeFraction
      )
    : Array.from({ length: cellCount }, () =>
        clampNumber(volumeFraction + (random() - 0.5) * 0.35, 0, 1)
      );

  const next = new Array<number>(cellCount).fill(volumeFraction);
  let objective = 1;
  let constraint = 0;

  const toIndex = (x: number, y: number, z: number) =>
    x + y * resX + z * resX * resY;

  const useNeighborhood = neighborSpan > 0;
  const VOLUME_CORRECTION_GAIN = 0.75;
  for (let iter = 0; iter < iterations; iter += 1) {
    let mean = 0;
    for (let z = 0; z < resZ; z += 1) {
      for (let y = 0; y < resY; y += 1) {
        for (let x = 0; x < resX; x += 1) {
          const idx = toIndex(x, y, z);
          const current = densities[idx];
          let filtered = current;
          if (useNeighborhood) {
            let sum = 0;
            let count = 0;
            for (let dz = -neighborSpan; dz <= neighborSpan; dz += 1) {
              const nz = z + dz;
              if (nz < 0 || nz >= resZ) continue;
              for (let dy = -neighborSpan; dy <= neighborSpan; dy += 1) {
                const ny = y + dy;
                if (ny < 0 || ny >= resY) continue;
                for (let dx = -neighborSpan; dx <= neighborSpan; dx += 1) {
                  const nx = x + dx;
                  if (nx < 0 || nx >= resX) continue;
                  sum += densities[toIndex(nx, ny, nz)];
                  count += 1;
                }
              }
            }
            filtered = count > 0 ? sum / count : current;
          }
          const penalized = Math.pow(filtered, penaltyExponent);
          next[idx] = clampNumber(lerpNumber(current, penalized, 0.42), 0, 1);
          mean += next[idx];
        }
      }
    }

    mean /= cellCount;
    constraint = mean - volumeFraction;

    const correction = constraint * VOLUME_CORRECTION_GAIN;
    let compliance = 0;
    let correctedMean = 0;
    for (let i = 0; i < cellCount; i += 1) {
      densities[i] = clampNumber(next[i] - correction, 0, 1);
      correctedMean += densities[i];
      const voidness = 1 - densities[i];
      compliance += voidness * voidness;
    }

    correctedMean /= cellCount;
    const secondaryConstraint = correctedMean - volumeFraction;
    if (Math.abs(secondaryConstraint) > 1e-6) {
      for (let i = 0; i < cellCount; i += 1) {
        densities[i] = clampNumber(densities[i] - secondaryConstraint, 0, 1);
      }
    }
    constraint = secondaryConstraint;
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

const normalizeChemistryMaterialName = (value: string) => value.trim().toLowerCase();

const resolveChemistryMaterialSpec = (name: string): ChemistryMaterialSpec => {
  const normalized = normalizeChemistryMaterialName(name);
  const base =
    CHEMISTRY_MATERIAL_LIBRARY[normalized] ?? CHEMISTRY_MATERIAL_LIBRARY.steel;
  return { ...base, name: base.name ?? name };
};

const coerceChemistryColor = (
  value: unknown,
  fallback: [number, number, number]
): [number, number, number] => {
  const normalizeChannel = (channel: number) => {
    const normalized = channel > 1 ? channel / 255 : channel;
    return clampNumber(normalized, 0, 1);
  };
  if (Array.isArray(value) && value.length >= 3) {
    const r = toNumber(value[0], fallback[0]);
    const g = toNumber(value[1], fallback[1]);
    const b = toNumber(value[2], fallback[2]);
    return [normalizeChannel(r), normalizeChannel(g), normalizeChannel(b)];
  }
  if (value && typeof value === "object") {
    const candidate = value as Partial<Vec3Value>;
    if (
      isFiniteNumber(candidate.x) &&
      isFiniteNumber(candidate.y) &&
      isFiniteNumber(candidate.z)
    ) {
      return [
        normalizeChannel(candidate.x),
        normalizeChannel(candidate.y),
        normalizeChannel(candidate.z),
      ];
    }
  }
  return fallback;
};

const coerceChemistryMaterialSpec = (
  value: unknown,
  fallbackName: string
): ChemistryMaterialSpec => {
  if (typeof value === "string") {
    return resolveChemistryMaterialSpec(value);
  }
  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    const name =
      typeof candidate.name === "string" && candidate.name.trim().length > 0
        ? candidate.name
        : fallbackName;
    const base = resolveChemistryMaterialSpec(name);
    const density = isFiniteNumber(candidate.density)
      ? candidate.density
      : base.density;
    const stiffness = isFiniteNumber(candidate.stiffness)
      ? candidate.stiffness
      : base.stiffness;
    const thermalConductivity = isFiniteNumber(candidate.thermalConductivity)
      ? candidate.thermalConductivity
      : base.thermalConductivity;
    const opticalTransmission = isFiniteNumber(candidate.opticalTransmission)
      ? clampNumber(candidate.opticalTransmission, 0, 1)
      : base.opticalTransmission;
    const diffusivity = isFiniteNumber(candidate.diffusivity)
      ? clampNumber(candidate.diffusivity, 0, 4)
      : base.diffusivity;
    const color = coerceChemistryColor(candidate.color, base.color);
    return {
      name,
      density,
      stiffness,
      thermalConductivity,
      opticalTransmission,
      diffusivity,
      color,
    };
  }
  return resolveChemistryMaterialSpec(fallbackName);
};

const parseMaterialOrder = (value: unknown) => {
  if (typeof value !== "string") return ["Steel", "Ceramic", "Glass"];
  const entries = value
    .split(/[,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return entries.length > 0 ? entries : ["Steel", "Ceramic", "Glass"];
};

const flattenWorkflowValues = (value: WorkflowValue, target: WorkflowValue[]) => {
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((entry) => flattenWorkflowValues(entry as WorkflowValue, target));
    return;
  }
  target.push(value);
};

const parseChemistryAssignmentsFromText = (text: string) => {
  const assignments: Array<{ geometryId: string; material: string }> = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) return;
    if (trimmed.includes(":")) {
      const [materialPart, ...rest] = trimmed.split(":");
      const material = materialPart.trim();
      const ids = rest
        .join(":")
        .split(/[\s,]+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      ids.forEach((geometryId) => assignments.push({ geometryId, material }));
      return;
    }
    const separator = trimmed.includes("->")
      ? "->"
      : trimmed.includes("=")
        ? "="
        : trimmed.includes(",")
          ? ","
          : null;
    if (!separator) return;
    const [left, ...right] = trimmed.split(separator);
    const geometryId = left.trim();
    const material = right.join(separator).trim();
    if (geometryId && material) {
      assignments.push({ geometryId, material });
    }
  });
  return assignments;
};

const resolveChemistryMaterialAssignments = (
  input: WorkflowValue,
  parameters: Record<string, unknown>,
  context: WorkflowComputeContext,
  domainGeometryId?: string | null
) => {
  const warnings: string[] = [];
  const materialOrder = parseMaterialOrder(parameters.materialOrder);
  const defaultMaterialName = materialOrder[0] ?? "Steel";
  const inputAssignments: ChemistryMaterialAssignment[] = [];
  const textAssignments: ChemistryMaterialAssignment[] = [];
  const materialsByName = new Map<string, ChemistryMaterialSpec>();

  const addMaterial = (materialInput: unknown) => {
    const material = coerceChemistryMaterialSpec(materialInput, defaultMaterialName);
    if (!materialsByName.has(material.name)) {
      materialsByName.set(material.name, material);
    }
    return material;
  };

  const pushAssignment = (
    target: ChemistryMaterialAssignment[],
    geometryId: string | undefined,
    materialInput: unknown,
    weight?: number
  ) => {
    const material = addMaterial(materialInput);
    target.push({ geometryId, material, weight });
  };

  const entries: WorkflowValue[] = [];
  flattenWorkflowValues(input, entries);
  entries.forEach((entry, index) => {
    if (entry == null) return;
    if (typeof entry === "string") {
      if (context.geometryById.has(entry)) {
        const materialName =
          materialOrder[index % materialOrder.length] ?? defaultMaterialName;
        pushAssignment(inputAssignments, entry, materialName);
      } else {
        pushAssignment(inputAssignments, domainGeometryId ?? undefined, entry);
      }
      return;
    }
    if (typeof entry === "object") {
      const candidate = entry as Record<string, unknown>;
      const geometryId =
        typeof candidate.geometryId === "string"
          ? candidate.geometryId
          : typeof candidate.geometry === "string"
            ? candidate.geometry
            : typeof candidate.geometryID === "string"
              ? candidate.geometryID
              : undefined;
      const materialInput =
        candidate.material ??
        candidate.materialName ??
        candidate.name ??
        defaultMaterialName;
      const weight = toFiniteNumber(
        (candidate.weight ?? candidate.influence ?? candidate.strength) as WorkflowValue
      );
      pushAssignment(
        inputAssignments,
        geometryId ?? (domainGeometryId ?? undefined),
        materialInput,
        weight ?? undefined
      );
    }
  });

  const materialsText =
    typeof parameters.materialsText === "string" ? parameters.materialsText : "";
  if (materialsText.trim().length > 0) {
    try {
      const parsed = JSON.parse(materialsText) as WorkflowValue;
      const parsedEntries: WorkflowValue[] = [];
      flattenWorkflowValues(parsed, parsedEntries);
      parsedEntries.forEach((entry, index) => {
        if (entry == null) return;
        if (typeof entry === "string") {
          if (context.geometryById.has(entry)) {
            const materialName =
              materialOrder[index % materialOrder.length] ?? defaultMaterialName;
            pushAssignment(textAssignments, entry, materialName);
          } else {
            pushAssignment(textAssignments, domainGeometryId ?? undefined, entry);
          }
          return;
        }
        if (typeof entry === "object") {
          const candidate = entry as Record<string, unknown>;
          const geometryId =
            typeof candidate.geometryId === "string"
              ? candidate.geometryId
              : typeof candidate.geometry === "string"
                ? candidate.geometry
                : undefined;
          const materialInput =
            candidate.material ??
            candidate.materialName ??
            candidate.name ??
            defaultMaterialName;
          const weight = toFiniteNumber(
            (candidate.weight ?? candidate.influence ?? candidate.strength) as WorkflowValue
          );
          if (geometryId) {
            pushAssignment(textAssignments, geometryId, materialInput, weight ?? undefined);
          } else {
            pushAssignment(
              textAssignments,
              domainGeometryId ?? undefined,
              materialInput,
              weight ?? undefined
            );
          }
        }
      });
    } catch {
      const parsedAssignments = parseChemistryAssignmentsFromText(materialsText);
      parsedAssignments.forEach(({ geometryId, material }) => {
        pushAssignment(textAssignments, geometryId, material);
      });
    }
  }

  // Merge precedence: assignments derived from `materialsText` override any upstream
  // `materials` assignments for the same geometry/domain.
  const DOMAIN_ASSIGNMENT_KEY = "__chemistry_domain__";
  const normalizeAssignmentKey = (geometryId: string | undefined) =>
    geometryId ?? domainGeometryId ?? DOMAIN_ASSIGNMENT_KEY;

  let assignments: ChemistryMaterialAssignment[] = [...inputAssignments];
  if (textAssignments.length > 0) {
    const overridden = new Set(
      textAssignments.map((assignment) => normalizeAssignmentKey(assignment.geometryId))
    );
    assignments = [
      ...textAssignments,
      ...inputAssignments.filter(
        (assignment) => !overridden.has(normalizeAssignmentKey(assignment.geometryId))
      ),
    ];
  }

  if (assignments.length === 0) {
    pushAssignment(assignments, domainGeometryId ?? undefined, defaultMaterialName);
    warnings.push("No materials specified; using default material assignment.");
  }

  const materials = Array.from(materialsByName.values());
  if (materials.length === 0) {
    const fallback = resolveChemistryMaterialSpec(defaultMaterialName);
    materials.push(fallback);
  }

  return {
    assignments,
    materials,
    materialNames: materials.map((material) => material.name),
    warnings,
  };
};

const resolveChemistrySeeds = (
  input: WorkflowValue,
  parameters: Record<string, unknown>,
  context: WorkflowComputeContext,
  defaultMaterial: string
) => {
  const seeds: ChemistrySeed[] = [];
  const defaultStrength = clampNumber(
    toNumber(parameters.seedStrength, 0.85),
    0,
    1
  );
  const defaultRadius = clampNumber(
    toNumber(parameters.seedRadius, 0.25),
    0,
    1000
  );
  const defaultMaterialName =
    typeof parameters.seedMaterial === "string" && parameters.seedMaterial.trim().length > 0
      ? parameters.seedMaterial.trim()
      : defaultMaterial;

  const pushSeed = (
    position: Vec3Value,
    material: string,
    strength: number,
    radius: number
  ) => {
    seeds.push({
      position,
      material,
      strength: clampNumber(strength, 0, 1),
      radius: clampNumber(radius, 0, 1000),
    });
  };

  const handleEntry = (entry: WorkflowValue) => {
    if (entry == null) return;
    if (Array.isArray(entry)) {
      entry.forEach((nested) => handleEntry(nested as WorkflowValue));
      return;
    }
    if (typeof entry === "string") {
      const parsed = tryVec3Value(entry);
      if (parsed) {
        pushSeed(parsed, defaultMaterialName, defaultStrength, defaultRadius);
        return;
      }
      const geometry = context.geometryById.get(entry);
      if (geometry) {
        const positions = collectGeometryPositions(geometry, context, 128);
        positions.forEach((position) => {
          pushSeed(position, defaultMaterialName, defaultStrength, defaultRadius);
        });
      }
      return;
    }
    if (typeof entry === "object") {
      const candidate = entry as Record<string, unknown>;
      const position = tryVec3Value(candidate.position as WorkflowValue) ?? tryVec3Value(entry);
      if (position) {
        const material =
          typeof candidate.material === "string" ? candidate.material : defaultMaterialName;
        const strength = toNumber(candidate.strength, defaultStrength);
        const radius = toNumber(
          candidate.radius ?? candidate.influenceRadius,
          defaultRadius
        );
        pushSeed(position, material, strength, radius);
      }
    }
  };

  handleEntry(input);

  const seedsText = typeof parameters.seedsText === "string" ? parameters.seedsText : "";
  if (seedsText.trim().length > 0) {
    const points = parsePointsText(seedsText);
    points.forEach((position) => {
      pushSeed(position, defaultMaterialName, defaultStrength, defaultRadius);
    });
  }

  return seeds;
};

const createMaterialMap = (materialNames: string[]) => {
  const map: Record<string, number> = {};
  materialNames.forEach((name) => {
    map[name] = 0;
  });
  return map;
};

const normalizeMaterialMap = (map: Record<string, number>, materialNames: string[]) => {
  let sum = 0;
  materialNames.forEach((name) => {
    const value = map[name] ?? 0;
    sum += value;
  });
  if (!Number.isFinite(sum) || sum <= EPSILON) {
    const uniform = materialNames.length > 0 ? 1 / materialNames.length : 0;
    materialNames.forEach((name) => {
      map[name] = uniform;
    });
    return;
  }
  materialNames.forEach((name) => {
    map[name] = clampNumber((map[name] ?? 0) / sum, 0, 1);
  });
};

const cloneChemistryParticles = (particles: ChemistryParticle[]) =>
  particles.map((particle) => ({
    position: { ...particle.position },
    radius: particle.radius,
    materials: { ...particle.materials },
  }));

const buildChemistryField = (
  particles: ChemistryParticle[],
  materialNames: string[],
  bounds: { min: Vec3Value; max: Vec3Value },
  resolutionValue: number
): ChemistryField => {
  const resolution = clampInt(Math.round(resolutionValue), 8, 96, 32);
  const res = { x: resolution, y: resolution, z: resolution };
  const size = {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z,
  };
  const cellSize = {
    x: size.x / res.x,
    y: size.y / res.y,
    z: size.z / res.z,
  };
  const cellCount = res.x * res.y * res.z;
  const channels = materialNames.map(() => new Array<number>(cellCount).fill(0));
  const densities = new Array<number>(cellCount).fill(0);
  const toIndex = (x: number, y: number, z: number) =>
    x + y * res.x + z * res.x * res.y;

  particles.forEach((particle) => {
    const px = (particle.position.x - bounds.min.x) / cellSize.x;
    const py = (particle.position.y - bounds.min.y) / cellSize.y;
    const pz = (particle.position.z - bounds.min.z) / cellSize.z;
    
    const ix = Math.floor(px);
    const iy = Math.floor(py);
    const iz = Math.floor(pz);
    
    const splatRadius = 2;
    for (let dz = -splatRadius; dz <= splatRadius; dz++) {
      const z = iz + dz;
      if (z < 0 || z >= res.z) continue;
      for (let dy = -splatRadius; dy <= splatRadius; dy++) {
        const y = iy + dy;
        if (y < 0 || y >= res.y) continue;
        for (let dx = -splatRadius; dx <= splatRadius; dx++) {
          const x = ix + dx;
          if (x < 0 || x >= res.x) continue;
          
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq > splatRadius * splatRadius) continue;
          
          const weight = Math.max(0, 1 - Math.sqrt(distSq) / (splatRadius + 1));
          const idx = toIndex(x, y, z);
          
          let sum = 0;
          materialNames.forEach((name, materialIndex) => {
            const value = (particle.materials[name] ?? 0) * weight;
            channels[materialIndex][idx] += value;
            sum += value;
          });
          densities[idx] += sum;
        }
      }
    }
  });

  let maxDensity = 0;
  densities.forEach((value) => {
    if (value > maxDensity) maxDensity = value;
  });
  if (maxDensity > EPSILON) {
    for (let i = 0; i < densities.length; i += 1) {
      densities[i] = clampNumber(densities[i] / maxDensity, 0, 1);
    }
  }

  return {
    resolution: res,
    bounds,
    cellSize,
    materials: materialNames.slice(),
    channels,
    densities,
    maxDensity,
  };
};

const runChemistrySolver = (args: {
  seedKey: string;
  domainGeometryId?: string | null;
  domainGeometry?: Geometry | null;
  goals: GoalSpecification[];
  assignments: ChemistryMaterialAssignment[];
  materials: ChemistryMaterialSpec[];
  materialNames: string[];
  seeds: ChemistrySeed[];
  particleCount: number;
  iterations: number;
  fieldResolution: number;
  isoValue: number;
  convergenceTolerance: number;
  blendStrength: number;
  historyLimit: number;
  context: WorkflowComputeContext;
}): ChemistrySolverResult => {
  const warnings: string[] = [];
  const random = createSeededRandom(hashStringToSeed(args.seedKey));
  const materialNames = args.materialNames.length > 0 ? args.materialNames : ["Steel"];
  const materialSpecs = args.materials.length > 0 ? args.materials : [resolveChemistryMaterialSpec("Steel")];

  const materialByName = new Map<string, ChemistryMaterialSpec>();
  materialSpecs.forEach((material) => {
    materialByName.set(material.name, material);
  });
  materialNames.forEach((name) => {
    if (!materialByName.has(name)) {
      materialByName.set(name, resolveChemistryMaterialSpec(name));
    }
  });

  const domainGeometry = args.domainGeometry ?? null;
  const domainPositions = domainGeometry
    ? collectGeometryPositions(domainGeometry, args.context, 20000)
    : [];
  const domainBounds = normalizeVoxelBounds(
    computeBoundsFromPositions(domainPositions)
  );
  const domainCenter = {
    x: (domainBounds.min.x + domainBounds.max.x) * 0.5,
    y: (domainBounds.min.y + domainBounds.max.y) * 0.5,
    z: (domainBounds.min.z + domainBounds.max.z) * 0.5,
  };
  const domainSize = {
    x: domainBounds.max.x - domainBounds.min.x,
    y: domainBounds.max.y - domainBounds.min.y,
    z: domainBounds.max.z - domainBounds.min.z,
  };
  const maxDimension = Math.max(domainSize.x, domainSize.y, domainSize.z, 1);
  const particleRadius = clampNumber(
    maxDimension / Math.cbrt(Math.max(1, args.particleCount)) * 0.35,
    maxDimension * 0.005,
    maxDimension * 0.2
  );

  const assignments = args.assignments.length > 0 ? args.assignments : [{
    geometryId: args.domainGeometryId ?? undefined,
    material: resolveChemistryMaterialSpec(materialNames[0] ?? "Steel"),
  }];

  const weights = assignments.map((assignment) =>
    clampNumber(
      isFiniteNumber(assignment.weight) ? assignment.weight : 1,
      0,
      10
    )
  );
  const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
  const counts = assignments.map((assignment, index) =>
    Math.max(
      1,
      Math.floor((args.particleCount * weights[index]) / totalWeight)
    )
  );
  let allocated = counts.reduce((sum, value) => sum + value, 0);
  let cursor = 0;
  while (allocated < args.particleCount) {
    counts[cursor % counts.length] += 1;
    allocated += 1;
    cursor += 1;
  }
  cursor = 0;
  while (allocated > args.particleCount && counts.some((count) => count > 1)) {
    const index = cursor % counts.length;
    if (counts[index] > 1) {
      counts[index] -= 1;
      allocated -= 1;
    }
    cursor += 1;
  }

  const randomPointInBounds = () => ({
    x: domainBounds.min.x + random() * (domainBounds.max.x - domainBounds.min.x),
    y: domainBounds.min.y + random() * (domainBounds.max.y - domainBounds.min.y),
    z: domainBounds.min.z + random() * (domainBounds.max.z - domainBounds.min.z),
  });

  const jitterPosition = (position: Vec3Value) => {
    const jitter = particleRadius * 0.4;
    return {
      x: clampNumber(position.x + (random() - 0.5) * jitter, domainBounds.min.x, domainBounds.max.x),
      y: clampNumber(position.y + (random() - 0.5) * jitter, domainBounds.min.y, domainBounds.max.y),
      z: clampNumber(position.z + (random() - 0.5) * jitter, domainBounds.min.z, domainBounds.max.z),
    };
  };

  const particles: ChemistryParticle[] = [];
  assignments.forEach((assignment, index) => {
    const count = counts[index];
    const geometry = assignment.geometryId
      ? args.context.geometryById.get(assignment.geometryId) ?? null
      : null;
    const basePositions = geometry
      ? collectGeometryPositions(geometry, args.context, Math.max(32, count))
      : [];
    const materialMap = createMaterialMap(materialNames);
    materialMap[assignment.material.name] = 1;
    for (let i = 0; i < count; i += 1) {
      const base = basePositions.length > 0
        ? basePositions[i % basePositions.length]
        : randomPointInBounds();
      particles.push({
        position: jitterPosition(base),
        radius: particleRadius,
        materials: { ...materialMap },
      });
    }
  });

  if (particles.length === 0) {
    warnings.push("No particles were initialized; using fallback particles.");
    const fallbackMaterial = materialNames[0] ?? "Steel";
    for (let i = 0; i < Math.max(1, args.particleCount); i += 1) {
      const materials = createMaterialMap(materialNames);
      materials[fallbackMaterial] = 1;
      particles.push({
        position: randomPointInBounds(),
        radius: particleRadius,
        materials,
      });
    }
  }

  const seeds = args.seeds;
  if (seeds.length > 0) {
    seeds.forEach((seed) => {
      const materialName = materialByName.has(seed.material)
        ? seed.material
        : materialNames[0] ?? seed.material;
      particles.forEach((particle) => {
        const distance = distanceVec3(particle.position, seed.position);
        if (distance <= seed.radius) {
          particle.materials[materialName] = Math.max(
            particle.materials[materialName] ?? 0,
            seed.strength
          );
          normalizeMaterialMap(particle.materials, materialNames);
        }
      });
    });
  }

  const maxStiffness = Math.max(
    ...materialSpecs.map((material) => material.stiffness),
    1
  );
  const maxDensity = Math.max(
    ...materialSpecs.map((material) => material.density),
    1
  );
  const maxThermal = Math.max(
    ...materialSpecs.map((material) => material.thermalConductivity),
    1
  );
  const maxOptical = Math.max(
    ...materialSpecs.map((material) => material.opticalTransmission),
    1
  );

  const goalRegions = args.goals.map((goal) => {
    const params = goal.parameters ?? {};
    const regionIds = Array.isArray(params.regionGeometryIds)
      ? params.regionGeometryIds.filter((id) => typeof id === "string")
      : [];
    const regions = regionIds
      .map((id) => {
        const geometry = args.context.geometryById.get(id);
        if (!geometry) return null;
        const positions = collectGeometryPositions(geometry, args.context, 10000);
        return normalizeVoxelBounds(computeBoundsFromPositions(positions));
      })
      .filter(Boolean) as Array<{ min: Vec3Value; max: Vec3Value }>;
    const loadVector =
      goal.goalType === "chemStiffness" && params.loadVector && isVec3Value(params.loadVector)
        ? normalizeVec3Safe(params.loadVector, UNIT_Y_VEC3)
        : UNIT_Y_VEC3;
    const smoothness = clampNumber(toNumber(params.smoothness, 0.7), 0, 1);
    const diffusivity = clampNumber(toNumber(params.diffusivity, 1), 0, 4);
    const mode = String(params.mode ?? "conduct").toLowerCase() === "insulate" ? "insulate" : "conduct";
    return { goal, regions, loadVector, smoothness, diffusivity, mode };
  });

  const isInsideRegions = (position: Vec3Value, regions: Array<{ min: Vec3Value; max: Vec3Value }>) => {
    if (regions.length === 0) return true;
    return regions.some((region) =>
      position.x >= region.min.x &&
      position.x <= region.max.x &&
      position.y >= region.min.y &&
      position.y <= region.max.y &&
      position.z >= region.min.z &&
      position.z <= region.max.z
    );
  };

  const history: ChemistryHistoryEntry[] = [];
  const historyStride = Math.max(1, Math.floor(args.iterations / Math.max(1, args.historyLimit)));
  let bestState: ChemistrySolverResult["bestState"] = null;
  let bestEnergy = Number.POSITIVE_INFINITY;
  let previousEnergy = Number.POSITIVE_INFINITY;
  let iterationsUsed = 0;

  for (let iter = 0; iter < args.iterations; iter += 1) {
    const step = 0.18;
    particles.forEach((particle) => {
      const deltas = createMaterialMap(materialNames);
      goalRegions.forEach((info) => {
        const weight = clampNumber(toNumber(info.goal.weight, 0), 0, 1);
        if (weight <= EPSILON) return;
        if (!isInsideRegions(particle.position, info.regions)) return;
        const params = info.goal.parameters ?? {};
        switch (info.goal.goalType) {
          case "chemStiffness": {
            const relative = subtractVec3(particle.position, domainCenter);
            const align =
              lengthVec3(relative) > EPSILON
                ? (dotVec3(normalizeVec3(relative), info.loadVector) + 1) * 0.5
                : 0.5;
            const penalty = clampNumber(toNumber(params.structuralPenalty, 1), 0, 10);
            materialNames.forEach((name) => {
              const spec = materialByName.get(name);
              if (!spec) return;
              const stiffness = spec.stiffness / maxStiffness;
              deltas[name] += weight * penalty * align * stiffness;
            });
            break;
          }
          case "chemMass": {
            const target = clampNumber(toNumber(params.targetMassFraction, 0.6), 0, 1);
            const densityPenalty = clampNumber(toNumber(params.densityPenalty, 1), 0, 5);
            const scale = (1 - target) * densityPenalty;
            materialNames.forEach((name) => {
              const spec = materialByName.get(name);
              if (!spec) return;
              const density = spec.density / maxDensity;
              deltas[name] -= weight * scale * density;
            });
            break;
          }
          case "chemTransparency": {
            const opticalWeight = clampNumber(toNumber(params.opticalWeight, 1), 0, 5);
            materialNames.forEach((name) => {
              const spec = materialByName.get(name);
              if (!spec) return;
              const optical = spec.opticalTransmission / maxOptical;
              deltas[name] += weight * opticalWeight * optical;
            });
            break;
          }
          case "chemThermal": {
            const thermalWeight = clampNumber(toNumber(params.thermalWeight, 1), 0, 5);
            materialNames.forEach((name) => {
              const spec = materialByName.get(name);
              if (!spec) return;
              const thermal = spec.thermalConductivity / maxThermal;
              const bias = info.mode === "insulate" ? 1 - thermal : thermal;
              deltas[name] += weight * thermalWeight * bias;
            });
            break;
          }
          default:
            break;
        }
      });
      materialNames.forEach((name) => {
        const nextValue = clampNumber(
          (particle.materials[name] ?? 0) + deltas[name] * step,
          0,
          1
        );
        particle.materials[name] = nextValue;
      });
      normalizeMaterialMap(particle.materials, materialNames);
    });

    const blendGoals = goalRegions.filter((info) => info.goal.goalType === "chemBlend");
    let blendWeight = 0;
    let blendDiffusivity = 0;
    blendGoals.forEach((info) => {
      blendWeight += clampNumber(toNumber(info.goal.weight, 0), 0, 1) * info.smoothness;
      blendDiffusivity += info.diffusivity;
    });
    blendWeight = clampNumber(blendWeight * args.blendStrength, 0, 1);
    const avgDiffusivity =
      blendGoals.length > 0 ? blendDiffusivity / blendGoals.length : 1;

    let blendEnergy = 0;
    if (blendWeight > EPSILON && particles.length > 1) {
      particles.forEach((particle, index) => {
        const neighborIndex = Math.floor(random() * particles.length);
        const neighbor =
          particles[neighborIndex === index ? (neighborIndex + 1) % particles.length : neighborIndex];
        let diffSum = 0;
        materialNames.forEach((name) => {
          const current = particle.materials[name] ?? 0;
          const target = neighbor.materials[name] ?? 0;
          diffSum += Math.abs(current - target);
          const diffusivity = clampNumber(
            (materialByName.get(name)?.diffusivity ?? avgDiffusivity),
            0,
            4
          );
          particle.materials[name] = lerpNumber(
            current,
            target,
            blendWeight * diffusivity
          );
        });
        normalizeMaterialMap(particle.materials, materialNames);
        blendEnergy += diffSum / materialNames.length;
      });
      blendEnergy /= particles.length;
    }

    const blendGoalWeight = clampNumber(
      blendGoals.reduce(
        (sum, info) => sum + clampNumber(toNumber(info.goal.weight, 0), 0, 1),
        0
      ),
      0,
      1
    );
    const blendEnergyContribution = blendEnergy * blendGoalWeight;
    const energyByKey = {
      stiffness: 0,
      mass: 0,
      blend: blendEnergyContribution,
      transparency: 0,
      thermal: 0,
    };
    let totalEnergy = blendEnergyContribution;

    particles.forEach((particle) => {
      const stiffnessValue = materialNames.reduce((sum, name) => {
        const spec = materialByName.get(name);
        if (!spec) return sum;
        return sum + (particle.materials[name] ?? 0) * (spec.stiffness / maxStiffness);
      }, 0);
      const densityValue = materialNames.reduce((sum, name) => {
        const spec = materialByName.get(name);
        if (!spec) return sum;
        return sum + (particle.materials[name] ?? 0) * (spec.density / maxDensity);
      }, 0);
      const opticalValue = materialNames.reduce((sum, name) => {
        const spec = materialByName.get(name);
        if (!spec) return sum;
        return sum + (particle.materials[name] ?? 0) * (spec.opticalTransmission / maxOptical);
      }, 0);
      const thermalValue = materialNames.reduce((sum, name) => {
        const spec = materialByName.get(name);
        if (!spec) return sum;
        return sum + (particle.materials[name] ?? 0) * (spec.thermalConductivity / maxThermal);
      }, 0);

      goalRegions.forEach((info) => {
        const weight = clampNumber(toNumber(info.goal.weight, 0), 0, 1);
        if (weight <= EPSILON) return;
        if (!isInsideRegions(particle.position, info.regions)) return;
        const params = info.goal.parameters ?? {};
        switch (info.goal.goalType) {
          case "chemStiffness": {
            const energy = 1 - clampNumber(stiffnessValue, 0, 1);
            energyByKey.stiffness += energy * weight;
            totalEnergy += energy * weight;
            break;
          }
          case "chemMass": {
            const target = clampNumber(toNumber(params.targetMassFraction, 0.6), 0, 1);
            const energy = Math.abs(clampNumber(densityValue, 0, 1) - target);
            energyByKey.mass += energy * weight;
            totalEnergy += energy * weight;
            break;
          }
          case "chemTransparency": {
            const energy = 1 - clampNumber(opticalValue, 0, 1);
            energyByKey.transparency += energy * weight;
            totalEnergy += energy * weight;
            break;
          }
          case "chemThermal": {
            const mode = info.mode;
            const energy =
              mode === "insulate"
                ? clampNumber(thermalValue, 0, 1)
                : 1 - clampNumber(thermalValue, 0, 1);
            energyByKey.thermal += energy * weight;
            totalEnergy += energy * weight;
            break;
          }
          default:
            break;
        }
      });
    });

    if (iter % historyStride === 0 || iter === args.iterations - 1) {
      history.push({
        iteration: iter,
        energies: energyByKey,
        totalEnergy,
      });
    }

    if (totalEnergy < bestEnergy) {
      bestEnergy = totalEnergy;
      bestState = { particles: cloneChemistryParticles(particles), totalEnergy, iteration: iter };
    }

    iterationsUsed = iter + 1;
    if (
      iter > 4 &&
      Number.isFinite(previousEnergy) &&
      Math.abs(previousEnergy - totalEnergy) < args.convergenceTolerance
    ) {
      break;
    }
    previousEnergy = totalEnergy;
  }

  const field = buildChemistryField(
    particles,
    materialNames,
    domainBounds,
    args.fieldResolution
  );
  const colorMaterials = materialNames.map(
    (name) => materialByName.get(name) ?? resolveChemistryMaterialSpec(name)
  );
  const mesh = buildChemistryMesh(field, colorMaterials, clampNumber(args.isoValue, 0, 1));

  return {
    particles,
    field,
    mesh,
    history,
    bestState,
    totalEnergy: history.length > 0 ? history[history.length - 1].totalEnergy : 0,
    iterations: iterationsUsed,
    status: "complete",
    warnings,
    materials: materialSpecs,
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

import { getCategoryAccentColor, getCategoryBandColor, getCategoryPortColor } from "./colors";

export const NODE_CATEGORIES: NodeCategory[] = [
  {
    id: "data",
    label: "Data",
    description: "References and parameters",
    accent: getCategoryAccentColor("data"),
    band: getCategoryBandColor("data"),
    port: getCategoryPortColor("data"),
  },
  {
    id: "basics",
    label: "Basics",
    description: "Core constants and helpers",
    accent: getCategoryAccentColor("basics"),
    band: getCategoryBandColor("basics"),
    port: getCategoryPortColor("basics"),
  },
  {
    id: "lists",
    label: "Lists",
    description: "List and data management",
    accent: getCategoryAccentColor("lists"),
    band: getCategoryBandColor("lists"),
    port: getCategoryPortColor("lists"),
  },
  {
    id: "primitives",
    label: "Primitives",
    description: "Base geometry generators",
    accent: getCategoryAccentColor("primitives"),
    band: getCategoryBandColor("primitives"),
    port: getCategoryPortColor("primitives"),
  },
  {
    id: "curves",
    label: "Curves",
    description: "Curve builders and edits",
    accent: getCategoryAccentColor("curves"),
    band: getCategoryBandColor("curves"),
    port: getCategoryPortColor("curves"),
  },
  {
    id: "nurbs",
    label: "NURBS",
    description: "Parametric curve operations",
    accent: getCategoryAccentColor("nurbs"),
    band: getCategoryBandColor("nurbs"),
    port: getCategoryPortColor("nurbs"),
  },
  {
    id: "brep",
    label: "BREP",
    description: "Surface and solid operations",
    accent: getCategoryAccentColor("brep"),
    band: getCategoryBandColor("brep"),
    port: getCategoryPortColor("brep"),
  },
  {
    id: "mesh",
    label: "Mesh",
    description: "Mesh conversion and editing",
    accent: getCategoryAccentColor("mesh"),
    band: getCategoryBandColor("mesh"),
    port: getCategoryPortColor("mesh"),
  },
  {
    id: "tessellation",
    label: "Tessellation",
    description: "Surface patterning and subdivision",
    accent: getCategoryAccentColor("tessellation"),
    band: getCategoryBandColor("tessellation"),
    port: getCategoryPortColor("tessellation"),
  },
  {
    id: "modifiers",
    label: "Modifiers",
    description: "Offsets, shelling, materials",
    accent: getCategoryAccentColor("modifiers"),
    band: getCategoryBandColor("modifiers"),
    port: getCategoryPortColor("modifiers"),
  },
  {
    id: "transforms",
    label: "Transforms",
    description: "Move, rotate, scale, align",
    accent: getCategoryAccentColor("transforms"),
    band: getCategoryBandColor("transforms"),
    port: getCategoryPortColor("transforms"),
  },
  {
    id: "arrays",
    label: "Arrays",
    description: "Linear, polar, and grid distributions",
    accent: getCategoryAccentColor("arrays"),
    band: getCategoryBandColor("arrays"),
    port: getCategoryPortColor("arrays"),
  },
  {
    id: "euclidean",
    label: "Euclidean",
    description: "Vectors, points, and spatial transforms",
    accent: getCategoryAccentColor("euclidean"),
    band: getCategoryBandColor("euclidean"),
    port: getCategoryPortColor("euclidean"),
  },
  {
    id: "ranges",
    label: "Ranges",
    description: "Sequences, remaps, and generators",
    accent: getCategoryAccentColor("ranges"),
    band: getCategoryBandColor("ranges"),
    port: getCategoryPortColor("ranges"),
  },
  {
    id: "signals",
    label: "Signals",
    description: "Waveforms and oscillators",
    accent: getCategoryAccentColor("signals"),
    band: getCategoryBandColor("signals"),
    port: getCategoryPortColor("signals"),
  },
  {
    id: "analysis",
    label: "Analysis",
    description: "Measure and inspect",
    accent: getCategoryAccentColor("analysis"),
    band: getCategoryBandColor("analysis"),
    port: getCategoryPortColor("analysis"),
  },
  {
    id: "interop",
    label: "Interchange",
    description: "Import and export geometry",
    accent: getCategoryAccentColor("interop"),
    band: getCategoryBandColor("interop"),
    port: getCategoryPortColor("interop"),
  },
  {
    id: "measurement",
    label: "Measurement",
    description: "Length, area, volume",
    accent: getCategoryAccentColor("measurement"),
    band: getCategoryBandColor("measurement"),
    port: getCategoryPortColor("measurement"),
  },
  {
    id: "voxel",
    label: "Voxel",
    description: "Voxel grids and utilities",
    accent: getCategoryAccentColor("voxel"),
    band: getCategoryBandColor("voxel"),
    port: getCategoryPortColor("voxel"),
  },
  {
    id: "solver",
    label: "Solver",
    description: "Goal-based optimization and simulation",
    accent: getCategoryAccentColor("solver"),
    band: getCategoryBandColor("solver"),
    port: getCategoryPortColor("solver"),
  },
  {
    id: "goal",
    label: "Goal",
    description: "Solver input specifications",
    accent: getCategoryAccentColor("goal"),
    band: getCategoryBandColor("goal"),
    port: getCategoryPortColor("goal"),
  },
  {
    id: "optimization",
    label: "Optimization",
    description: "Topology and evolutionary tools",
    accent: getCategoryAccentColor("optimization"),
    band: getCategoryBandColor("optimization"),
    port: getCategoryPortColor("optimization"),
  },
  {
    id: "math",
    label: "Math",
    description: "Scalar computation and expressions",
    accent: getCategoryAccentColor("math"),
    band: getCategoryBandColor("math"),
    port: getCategoryPortColor("math"),
  },
  {
    id: "logic",
    label: "Logic",
    description: "Conditions and branching",
    accent: getCategoryAccentColor("logic"),
    band: getCategoryBandColor("logic"),
    port: getCategoryPortColor("logic"),
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

const primitiveKindOptions: WorkflowParameterOption[] = [
  { value: "box", label: "Box" },
  { value: "sphere", label: "Sphere" },
  { value: "cylinder", label: "Cylinder" },
  { value: "torus", label: "Torus" },
  { value: "pyramid", label: "Pyramid" },
  { value: "tetrahedron", label: "Tetrahedron" },
  { value: "octahedron", label: "Octahedron" },
  { value: "icosahedron", label: "Icosahedron" },
  { value: "dodecahedron", label: "Dodecahedron" },
  { value: "hemisphere", label: "Hemisphere" },
  { value: "capsule", label: "Capsule" },
  { value: "disk", label: "Disk" },
  { value: "ring", label: "Ring / Annulus" },
  { value: "triangularPrism", label: "Triangular Prism" },
  { value: "pentagonalPrism", label: "Pentagonal Prism" },
  { value: "hexagonalPrism", label: "Hexagonal Prism" },
  { value: "torusKnot", label: "Torus Knot" },
  { value: "utahTeapot", label: "Utah Teapot" },
  { value: "frustum", label: "Frustum" },
  { value: "mobiusStrip", label: "Mobius Strip" },
  { value: "ellipsoid", label: "Ellipsoid" },
  { value: "wedge", label: "Wedge" },
  { value: "sphericalCap", label: "Spherical Cap / Dome" },
  { value: "bipyramid", label: "Bipyramid" },
  { value: "rhombicDodecahedron", label: "Rhombic Dodecahedron" },
  { value: "truncatedCube", label: "Truncated Cube" },
  { value: "truncatedOctahedron", label: "Truncated Octahedron" },
  { value: "truncatedIcosahedron", label: "Truncated Icosahedron" },
  { value: "pipe", label: "Pipe / Hollow Cylinder" },
  { value: "superellipsoid", label: "Superellipsoid" },
  { value: "hyperbolicParaboloid", label: "Hyperbolic Paraboloid" },
  { value: "geodesicDome", label: "Geodesic Dome" },
  { value: "oneSheetHyperboloid", label: "One-Sheet Hyperboloid" },
];

const PRIMITIVE_PARAMETER_SPECS: WorkflowParameterSpec[] = [
  { key: "size", label: "Size", type: "number", defaultValue: 1, min: 0.01, step: 0.1 },
  { key: "radius", label: "Radius", type: "number", defaultValue: 0.5, min: 0.01, step: 0.1 },
  { key: "height", label: "Height", type: "number", defaultValue: 1, min: 0.01, step: 0.1 },
  { key: "tube", label: "Tube", type: "number", defaultValue: 0.2, min: 0.01, step: 0.05 },
  {
    key: "innerRadius",
    label: "Inner Radius",
    type: "number",
    defaultValue: 0.25,
    min: 0.01,
    step: 0.05,
  },
  {
    key: "topRadius",
    label: "Top Radius",
    type: "number",
    defaultValue: 0.2,
    min: 0.01,
    step: 0.05,
  },
  {
    key: "capHeight",
    label: "Cap Height",
    type: "number",
    defaultValue: 0.4,
    min: 0.01,
    step: 0.05,
  },
  { key: "detail", label: "Detail", type: "number", defaultValue: 1, min: 0, max: 6, step: 1 },
  {
    key: "exponent1",
    label: "Exponent 1",
    type: "number",
    defaultValue: 2,
    min: 0.2,
    step: 0.1,
  },
  {
    key: "exponent2",
    label: "Exponent 2",
    type: "number",
    defaultValue: 2,
    min: 0.2,
    step: 0.1,
  },
  {
    key: "radialSegments",
    label: "Radial Segments",
    type: "number",
    defaultValue: 24,
    min: 6,
    max: 128,
    step: 1,
  },
  {
    key: "tubularSegments",
    label: "Tubular Segments",
    type: "number",
    defaultValue: 36,
    min: 6,
    max: 128,
    step: 1,
  },
];

const PRIMITIVE_REPRESENTATION_SPEC: WorkflowParameterSpec = {
  key: "representation",
  label: "Representation",
  type: "select",
  defaultValue: "mesh",
  options: [
    { value: "mesh", label: "Mesh" },
    { value: "brep", label: "B-Rep" },
  ],
};

const PRIMITIVE_PARAMETER_DEFAULTS = PRIMITIVE_PARAMETER_SPECS.reduce<Record<string, number>>(
  (acc, spec) => {
    acc[spec.key] = Number(spec.defaultValue);
    return acc;
  },
  {}
);

const PRIMITIVE_PARAMETER_PORTS: WorkflowPortSpec[] = PRIMITIVE_PARAMETER_SPECS.map((spec) => ({
  key: spec.key,
  label: spec.label,
  type: "number",
  parameterKey: spec.key,
  defaultValue: spec.defaultValue,
}));

const resolvePrimitiveInputParameters = (
  inputs: Record<string, WorkflowValue>,
  parameters: Record<string, unknown>
) => ({
  size: toNumber(inputs.size, readNumberParameter(parameters, "size", PRIMITIVE_PARAMETER_DEFAULTS.size ?? 1)),
  radius: toNumber(
    inputs.radius,
    readNumberParameter(parameters, "radius", PRIMITIVE_PARAMETER_DEFAULTS.radius ?? 0.5)
  ),
  height: toNumber(
    inputs.height,
    readNumberParameter(parameters, "height", PRIMITIVE_PARAMETER_DEFAULTS.height ?? 1)
  ),
  tube: toNumber(
    inputs.tube,
    readNumberParameter(parameters, "tube", PRIMITIVE_PARAMETER_DEFAULTS.tube ?? 0.2)
  ),
  innerRadius: toNumber(
    inputs.innerRadius,
    readNumberParameter(parameters, "innerRadius", PRIMITIVE_PARAMETER_DEFAULTS.innerRadius ?? 0.25)
  ),
  topRadius: toNumber(
    inputs.topRadius,
    readNumberParameter(parameters, "topRadius", PRIMITIVE_PARAMETER_DEFAULTS.topRadius ?? 0.2)
  ),
  capHeight: toNumber(
    inputs.capHeight,
    readNumberParameter(parameters, "capHeight", PRIMITIVE_PARAMETER_DEFAULTS.capHeight ?? 0.4)
  ),
  detail: toNumber(
    inputs.detail,
    readNumberParameter(parameters, "detail", PRIMITIVE_PARAMETER_DEFAULTS.detail ?? 1)
  ),
  exponent1: toNumber(
    inputs.exponent1,
    readNumberParameter(parameters, "exponent1", PRIMITIVE_PARAMETER_DEFAULTS.exponent1 ?? 2)
  ),
  exponent2: toNumber(
    inputs.exponent2,
    readNumberParameter(parameters, "exponent2", PRIMITIVE_PARAMETER_DEFAULTS.exponent2 ?? 2)
  ),
  radialSegments: toNumber(
    inputs.radialSegments,
    readNumberParameter(parameters, "radialSegments", PRIMITIVE_PARAMETER_DEFAULTS.radialSegments ?? 24)
  ),
  tubularSegments: toNumber(
    inputs.tubularSegments,
    readNumberParameter(parameters, "tubularSegments", PRIMITIVE_PARAMETER_DEFAULTS.tubularSegments ?? 36)
  ),
});

const toPrimitiveShortLabel = (label: string) => {
  const collapsed = label.replace(/[^A-Za-z0-9]/g, "");
  const source = collapsed.length > 0 ? collapsed : label;
  return source.slice(0, 3).toUpperCase();
};

const PRIMITIVE_NODE_DEFINITIONS: WorkflowNodeDefinition[] = PRIMITIVE_NODE_CATALOG.map(
  (entry) => ({
    type: entry.id as NodeType,
    label: entry.label,
    shortLabel: toPrimitiveShortLabel(entry.label),
    description: `Create a ${entry.label} primitive.`,
    category: "primitives",
    iconId: `primitive:${entry.id}`,
    inputs: PRIMITIVE_PARAMETER_PORTS,
    outputs: [
      { key: "geometry", label: entry.label, type: "geometry", required: true },
      { key: "representation", label: "Representation", type: "string" },
      { key: "params", label: "Params", type: "any" },
    ],
    parameters: [PRIMITIVE_REPRESENTATION_SPEC, ...PRIMITIVE_PARAMETER_SPECS],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters }) => ({
      geometry: typeof parameters.geometryId === "string" ? parameters.geometryId : null,
      representation: String(parameters.representation ?? "mesh"),
      params: resolvePrimitiveInputParameters(inputs, parameters),
    }),
  })
);

const baseWaveInputPorts = (): WorkflowPortSpec[] => [
  {
    key: "t",
    label: "T",
    type: "number",
    defaultValue: 0,
  },
  {
    key: "amplitude",
    label: "Amplitude",
    type: "number",
    defaultValue: 1,
  },
  {
    key: "frequency",
    label: "Frequency",
    type: "number",
    defaultValue: 1,
  },
  {
    key: "phaseDeg",
    label: "Phase",
    type: "number",
    defaultValue: 0,
  },
  {
    key: "offset",
    label: "Offset",
    type: "number",
    defaultValue: 0,
  },
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
    type: "text",
    label: "Text",
    shortLabel: "TEXT",
    description: "Floating canvas text with a handwritten style.",
    category: "data",
    iconId: "script",
    inputs: [],
    outputs: [],
    parameters: [
      { key: "text", label: "Text", type: "string", defaultValue: "Text" },
      { key: "size", label: "Size", type: "number", defaultValue: 24, min: 8, max: 96, step: 1 },
    ],
    compute: () => ({}),
  },
  {
    type: "group",
    label: "Group",
    shortLabel: "GROUP",
    description: "Organize nodes visually inside a shared container.",
    category: "data",
    iconId: "group",
    inputs: [],
    outputs: [],
    parameters: [
      { key: "title", label: "Title", type: "string", defaultValue: "Group" },
      { key: "color", label: "Color", type: "color", defaultValue: "#f5f2ee" },
    ],
    compute: () => ({}),
  },
  {
    type: "panel",
    label: "Panel",
    shortLabel: "PANEL",
    description: "Read-only viewer for upstream outputs or fallback text.",
    category: "data",
    iconId: "script",
    inputs: [
      {
        key: "data",
        label: "Data",
        type: "any",
        required: false,
        allowMultiple: true,
      },
    ],
    outputs: [{ key: "data", label: "Data", type: "any" }],
    parameters: [
      { key: "text", label: "Text", type: "textarea", defaultValue: "" },
      {
        key: "maxLines",
        label: "Max Lines",
        type: "number",
        defaultValue: 200,
        min: 1,
        max: 200,
        step: 1,
      },
      { key: "showIndex", label: "Show Index", type: "boolean", defaultValue: true },
      { key: "indexStart", label: "Index Start", type: "number", defaultValue: 0, step: 1 },
      { key: "indent", label: "Indent", type: "number", defaultValue: 2, min: 0, max: 8, step: 1 },
    ],
    primaryOutputKey: "data",
    compute: ({ inputs, parameters }) => {
      const fallback = typeof parameters.text === "string" ? parameters.text : "";
      let data = inputs.data;
      if (Array.isArray(data)) {
        const filtered = data.filter((item) => item != null);
        data = filtered.length > 0 ? filtered : null;
      }
      if (data == null && fallback.length > 0) {
        data = fallback;
      }
      return { data };
    },
  },
  {
    type: "textNote",
    label: "Text Note",
    shortLabel: "NOTE",
    description: "Display + pass through data with a freeform note.",
    category: "data",
    iconId: "script",
    inputs: [
      {
        key: "data",
        label: "Data",
        type: "any",
        required: false,
        allowMultiple: true,
      },
    ],
    outputs: [{ key: "data", label: "Data", type: "any" }],
    parameters: [
      { key: "text", label: "Text", type: "textarea", defaultValue: "Edit me!" },
      {
        key: "maxLines",
        label: "Max Lines",
        type: "number",
        defaultValue: 10,
        min: 1,
        max: 200,
        step: 1,
      },
      { key: "showIndex", label: "Show Index", type: "boolean", defaultValue: false },
      { key: "indexStart", label: "Index Start", type: "number", defaultValue: 0, step: 1 },
      { key: "indent", label: "Indent", type: "number", defaultValue: 2, min: 0, max: 8, step: 1 },
    ],
    primaryOutputKey: "data",
    compute: ({ inputs, parameters }) => {
      const fallback = typeof parameters.text === "string" ? parameters.text : "";
      const data = inputs.data ?? (fallback.length > 0 ? fallback : null);
      return { data };
    },
  },
  {
    type: "slider",
    label: "Slider",
    shortLabel: "SLD",
    description: "A draggable slider that outputs a numeric value.",
    category: "math",
    iconId: "numberConstant",
    inputs: [],
    outputs: [{ key: "value", label: "Value", type: "number", required: true }],
    parameters: [
      {
        key: "value",
        label: "Value",
        type: "number",
        defaultValue: 50,
        step: 1,
      },
      { key: "min", label: "Min", type: "number", defaultValue: 0 },
      { key: "max", label: "Max", type: "number", defaultValue: 100 },
      { key: "step", label: "Step", type: "number", defaultValue: 1, min: 0.001 },
      {
        key: "snapMode",
        label: "Snap",
        type: "select",
        defaultValue: "step",
        options: [
          { value: "off", label: "Off" },
          { value: "step", label: "Step" },
        ],
      },
    ],
    primaryOutputKey: "value",
    compute: ({ parameters }) => {
      const min = readNumberParameter(parameters, "min", 0);
      const max = readNumberParameter(parameters, "max", 100);
      const rawValue = readNumberParameter(parameters, "value", min);
      const stepRaw = readNumberParameter(parameters, "step", 1);
      const snapModeRaw = parameters.snapMode;
      const hasSnapMode = snapModeRaw === "off" || snapModeRaw === "step";
      const snapMode = hasSnapMode
        ? (snapModeRaw as "off" | "step")
        : readBooleanParameter(parameters, "snap", true)
          ? "step"
          : "off";
      const precisionRaw = hasSnapMode
        ? null
        : readNumberParameter(parameters, "precision", Number.NaN);
      const precision =
        precisionRaw == null || !Number.isFinite(precisionRaw)
          ? null
          : Math.min(6, Math.max(0, Math.round(precisionRaw)));
      const lo = Math.min(min, max);
      const hi = Math.max(min, max);
      const step = stepRaw > EPSILON ? Math.abs(stepRaw) : 1;
      const snapped = snapMode === "step" ? snapNumberToStep(rawValue, step, lo) : rawValue;
      const rounded = precision != null ? roundToPrecision(snapped, precision) : snapped;
      const value = clampNumber(rounded, lo, hi);
      return { value };
    },
  },
  {
    type: "mesh",
    label: "Mesh",
    shortLabel: "MESH",
    description: "Pass-through node for mesh geometry.",
    category: "mesh",
    iconId: "mesh",
    inputs: [
      {
        key: "mesh",
        label: "Mesh",
        type: "mesh",
        required: true,
      },
    ],
    outputs: [
      {
        key: "mesh",
        label: "Mesh",
        type: "mesh",
        required: true,
      },
    ],
    parameters: [],
    primaryOutputKey: "mesh",
    compute: ({ inputs, parameters }) => {
      const inputMesh = typeof inputs.mesh === "string" ? inputs.mesh : null;
      const paramMesh = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      return {
        mesh: inputMesh ?? paramMesh,
      };
    },
  },
  {
    type: "colorPicker",
    label: "Color Picker",
    shortLabel: "COLOR",
    description: "Pick a color swatch and output RGB + hex.",
    category: "data",
    iconId: "displayMode",
    inputs: [],
    outputs: [
      { key: "color", label: "Color", type: "vector", required: true },
      { key: "hex", label: "Hex", type: "string" },
    ],
    parameters: [
      { key: "color", label: "Color", type: "color", defaultValue: DEFAULT_MATERIAL_HEX },
    ],
    primaryOutputKey: "color",
    compute: ({ parameters }) => {
      const { vec, hex } = resolveColorInput(undefined, parameters);
      return { color: vec, hex };
    },
  },
  {
    type: "customMaterial",
    label: "Custom Material",
    shortLabel: "MAT",
    description: "Apply a custom render color to geometry.",
    category: "modifiers",
    iconId: "sphere",
    inputs: [
      {
        key: "geometry",
        label: "Geometry",
        type: "geometry",
        required: true,
        parameterKey: "geometryId",
      },
      {
        key: "color",
        label: "Color",
        type: "vector",
        required: false,
        parameterKey: "color",
      },
    ],
    outputs: [
      { key: "geometry", label: "Geometry", type: "geometry" },
      { key: "color", label: "Color", type: "vector" },
      { key: "hex", label: "Hex", type: "string" },
    ],
    parameters: [
      { key: "color", label: "Color", type: "color", defaultValue: DEFAULT_MATERIAL_HEX },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters }) => {
      const geometry = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const { vec, hex } = resolveColorInput(inputs.color, parameters);
      return { geometry, color: vec, hex };
    },
  },
  {
    type: "annotations",
    label: "Annotations",
    shortLabel: "NOTE",
    description: "Attach annotation text to a point or geometry.",
    category: "data",
    iconId: "group",
    inputs: [
      { key: "geometry", label: "Geometry", type: "geometry", required: false },
      { key: "anchor", label: "Anchor", type: "vector", required: false },
      {
        key: "text",
        label: "Text",
        type: "string",
        parameterKey: "text",
        defaultValue: "Annotation",
      },
      {
        key: "size",
        label: "Size",
        type: "number",
        parameterKey: "size",
        defaultValue: 1,
      },
    ],
    outputs: [
      { key: "annotation", label: "Annotation", type: "any" },
      { key: "geometry", label: "Geometry", type: "geometry" },
      { key: "anchor", label: "Anchor", type: "vector" },
      { key: "text", label: "Text", type: "string" },
      { key: "size", label: "Size", type: "number" },
    ],
    parameters: [
      ...vectorParameterSpecs("anchor", "Anchor", ZERO_VEC3),
      { key: "text", label: "Text", type: "string", defaultValue: "Annotation" },
      { key: "size", label: "Size", type: "number", defaultValue: 1, step: 0.1 },
    ],
    primaryOutputKey: "annotation",
    compute: ({ inputs, parameters }) => {
      const geometry = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const anchor = resolveVectorInput(inputs, parameters, "anchor", "anchor", ZERO_VEC3);
      const text = String(inputs.text ?? parameters.text ?? "Annotation");
      const size = toNumber(inputs.size, readNumberParameter(parameters, "size", 1));
      const annotation = { geometry, anchor, text, size };
      return { annotation, geometry, anchor, text, size };
    },
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
      {
        key: "filter",
        label: "Filter",
        type: "any",
        description: "Preview filter settings from a Filter node.",
      },
    ],
    outputs: [
      { key: "geometry", label: "Geometry", type: "geometry" },
      { key: "fileType", label: "File Type", type: "string" },
    ],
    parameters: [],
    primaryOutputKey: "geometry",
    compute: ({ inputs, context }) => {
      const geometryId = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      const fileType = geometry ? resolveGeometryFileType(geometry) : "";
      return { geometry: geometryId, fileType };
    },
  },
  {
    type: "customViewer",
    label: "Custom Viewer",
    shortLabel: "VIEW",
    description: "Expose geometry for Roslyn preview.",
    category: "analysis",
    iconId: "displayMode",
    inputs: [
      {
        key: "geometry",
        label: "Geometry",
        type: "geometry",
        required: false,
      },
    ],
    outputs: [{ key: "geometry", label: "Geometry", type: "geometry" }],
    parameters: [],
    primaryOutputKey: "geometry",
    compute: ({ inputs }) => {
      const geometryId = typeof inputs.geometry === "string" ? inputs.geometry : null;
      return { geometry: geometryId };
    },
  },
  {
    type: "previewFilter",
    label: "Filter",
    shortLabel: "FILTER",
    description: "Roslyn preview filters for Custom Preview nodes.",
    category: "analysis",
    iconId: "displayMode",
    inputs: [],
    outputs: [
      {
        key: "filter",
        label: "Filter",
        type: "any",
        description: "Preview filter settings payload.",
      },
    ],
    parameters: [
      {
        key: "displayMode",
        label: "Display Mode",
        type: "select",
        defaultValue: "shaded",
        options: [
          { label: "Shaded", value: "shaded" },
          { label: "Wireframe", value: "wireframe" },
          { label: "Shaded + Edges", value: "shaded_edges" },
          { label: "Ghosted", value: "ghosted" },
          { label: "Silhouette", value: "silhouette" },
        ],
      },
      {
        key: "viewSolidity",
        label: "Solidity",
        type: "slider",
        defaultValue: 0.7,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        key: "sheen",
        label: "Sheen",
        type: "slider",
        defaultValue: 0.08,
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        key: "backfaceCulling",
        label: "Backface Culling",
        type: "boolean",
        defaultValue: true,
      },
      {
        key: "showNormals",
        label: "Show Normals",
        type: "boolean",
        defaultValue: false,
      },
    ],
    primaryOutputKey: "filter",
    compute: ({ parameters }) => {
      const displayModeRaw =
        typeof parameters.displayMode === "string" ? parameters.displayMode : "shaded";
      const displayModes = new Set([
        "shaded",
        "wireframe",
        "shaded_edges",
        "ghosted",
        "silhouette",
      ]);
      const displayMode = displayModes.has(displayModeRaw) ? displayModeRaw : "shaded";
      
      const viewSolidity = clampNumber(
        readNumberParameter(parameters, "viewSolidity", 0.7),
        0,
        1
      );
      
      const sheen = clampNumber(readNumberParameter(parameters, "sheen", 0.08), 0, 1);
      const backfaceCulling = toBoolean(parameters.backfaceCulling as WorkflowValue, true);
      const showNormals = toBoolean(parameters.showNormals as WorkflowValue, false);

      return {
        filter: {
          displayMode,
          viewSolidity,
          viewSettings: {
            backfaceCulling,
            showNormals,
            sheen,
          },
        },
      };
    },
  },
  {
    type: "customPreview",
    label: "Custom Preview",
    shortLabel: "PREVIEW",
    description: "Preview geometry with a custom filter payload.",
    category: "analysis",
    iconId: "displayMode",
    inputs: [
      {
        key: "geometry",
        label: "Geometry",
        type: "geometry",
        required: false,
      },
      {
        key: "filter",
        label: "Filter",
        type: "any",
        description: "Preview filter settings from a Filter node.",
      },
    ],
    outputs: [{ key: "geometry", label: "Geometry", type: "geometry" }],
    parameters: [],
    primaryOutputKey: "geometry",
    compute: ({ inputs }) => {
      const geometryId = typeof inputs.geometry === "string" ? inputs.geometry : null;
      return { geometry: geometryId };
    },
  },
  {
    type: "metadataPanel",
    label: "Metadata Panel",
    shortLabel: "META",
    description: "Inspect geometry metadata and attributes.",
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
    outputs: [
      { key: "metadata", label: "Metadata", type: "any" },
      { key: "id", label: "Id", type: "string" },
      { key: "type", label: "Type", type: "string" },
      { key: "layer", label: "Layer", type: "string" },
      { key: "area", label: "Area", type: "number" },
      { key: "volume", label: "Volume", type: "number" },
      { key: "mass", label: "Mass", type: "number" },
      { key: "centroid", label: "Centroid", type: "vector" },
      { key: "inertia", label: "Inertia", type: "any" },
      { key: "thickness", label: "Thickness", type: "number" },
    ],
    parameters: [],
    primaryOutputKey: "metadata",
    compute: ({ inputs, context }) => {
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return {
          metadata: null,
          id: "",
          type: "",
          layer: "",
          area: 0,
          volume: 0,
          mass: 0,
          centroid: ZERO_VEC3,
          inertia: null,
          thickness: 0,
        };
      }
      const metadata = {
        id: geometry.id,
        type: geometry.type,
        layerId: geometry.layerId,
        area_m2: geometry.area_m2 ?? null,
        volume_m3: geometry.volume_m3 ?? null,
        centroid: geometry.centroid ?? null,
        mass_kg: geometry.mass_kg ?? null,
        inertiaTensor_kg_m2: geometry.inertiaTensor_kg_m2 ?? null,
        thickness_m: geometry.thickness_m ?? null,
        metadata: geometry.metadata ?? null,
      };
      return {
        metadata,
        id: geometry.id,
        type: geometry.type,
        layer: geometry.layerId,
        area: geometry.area_m2 ?? 0,
        volume: geometry.volume_m3 ?? 0,
        mass: geometry.mass_kg ?? 0,
        centroid: geometry.centroid ?? ZERO_VEC3,
        inertia: geometry.inertiaTensor_kg_m2 ?? null,
        thickness: geometry.thickness_m ?? 0,
      };
    },
  },
  {
    type: "meshConvert",
    label: "Mesh Convert",
    shortLabel: "MSH",
    description: "Convert geometry into a mesh for export.",
    category: "mesh",
    iconId: "surface",
    inputs: [
      { key: "geometry", label: "Geometry", type: "geometry", required: true },
      {
        key: "distance",
        label: "Thickness",
        type: "number",
        parameterKey: "distance",
        defaultValue: 0.1,
      },
      { key: "direction", label: "Direction", type: "vector", required: false },
      {
        key: "capped",
        label: "Capped",
        type: "boolean",
        parameterKey: "capped",
        defaultValue: true,
      },
      {
        key: "radius",
        label: "Vertex Radius",
        type: "number",
        parameterKey: "radius",
        defaultValue: 0.1,
      },
    ],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry", required: true },
      { key: "mesh", label: "Mesh Data", type: "any" },
      { key: "sourceType", label: "Source Type", type: "string" },
    ],
    parameters: [
      {
        key: "distance",
        label: "Thickness",
        type: "number",
        defaultValue: 0.1,
        min: 0,
        step: 0.05,
      },
      ...vectorParameterSpecs("direction", "Direction", UNIT_Y_VEC3),
      { key: "capped", label: "Capped", type: "boolean", defaultValue: true },
      {
        key: "radius",
        label: "Vertex Radius",
        type: "number",
        defaultValue: 0.1,
        min: 0,
        step: 0.05,
      },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return { geometry: geometryId, mesh: EMPTY_MESH, sourceType: "" };
      }
      const mesh = convertGeometryToMesh(geometry, inputs, parameters, context);
      return { geometry: geometryId, mesh, sourceType: geometry.type };
    },
  },
  {
    type: "nurbsToMesh",
    label: "NURBS to Mesh",
    shortLabel: "N2M",
    description: "Convert NURBS curves or surfaces into a mesh.",
    category: "mesh",
    iconId: "surface",
    inputs: [
      { key: "geometry", label: "NURBS", type: "geometry", required: true },
      {
        key: "distance",
        label: "Thickness",
        type: "number",
        parameterKey: "distance",
        defaultValue: 0.1,
      },
      { key: "direction", label: "Direction", type: "vector", required: false },
      {
        key: "capped",
        label: "Capped",
        type: "boolean",
        parameterKey: "capped",
        defaultValue: true,
      },
      {
        key: "radius",
        label: "Vertex Radius",
        type: "number",
        parameterKey: "radius",
        defaultValue: 0.1,
      },
    ],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry", required: true },
      { key: "mesh", label: "Mesh Data", type: "any" },
      { key: "sourceType", label: "Source Type", type: "string" },
    ],
    parameters: [
      {
        key: "distance",
        label: "Thickness",
        type: "number",
        defaultValue: 0.1,
        min: 0,
        step: 0.05,
      },
      ...vectorParameterSpecs("direction", "Direction", UNIT_Y_VEC3),
      { key: "capped", label: "Capped", type: "boolean", defaultValue: true },
      {
        key: "radius",
        label: "Vertex Radius",
        type: "number",
        defaultValue: 0.1,
        min: 0,
        step: 0.05,
      },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return { geometry: geometryId, mesh: EMPTY_MESH, sourceType: "" };
      }
      if (geometry.type !== "nurbsCurve" && geometry.type !== "nurbsSurface") {
        return { geometry: geometryId, mesh: EMPTY_MESH, sourceType: geometry.type };
      }
      const mesh = convertGeometryToMesh(geometry, inputs, parameters, context);
      return { geometry: geometryId, mesh, sourceType: geometry.type };
    },
  },
  {
    type: "brepToMesh",
    label: "B-Rep to Mesh",
    shortLabel: "B2M",
    description: "Tessellate a B-Rep into a renderable mesh.",
    category: "mesh",
    iconId: "surface",
    inputs: [
      { key: "geometry", label: "B-Rep", type: "geometry", required: true },
    ],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry", required: true },
      { key: "mesh", label: "Mesh Data", type: "any" },
      { key: "sourceType", label: "Source Type", type: "string" },
    ],
    parameters: [],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return { geometry: geometryId, mesh: EMPTY_MESH, sourceType: "" };
      }
      if (geometry.type !== "brep") {
        return { geometry: geometryId, mesh: EMPTY_MESH, sourceType: geometry.type };
      }
      const mesh = resolveMeshFromGeometry(geometry) ?? EMPTY_MESH;
      return { geometry: geometryId, mesh, sourceType: geometry.type };
    },
  },
  {
    type: "meshToBrep",
    label: "Mesh to B-Rep",
    shortLabel: "M2B",
    description: "Convert a mesh into a triangle-based B-Rep.",
    category: "mesh",
    iconId: "surface",
    inputs: [
      { key: "geometry", label: "Mesh", type: "geometry", required: true },
    ],
    outputs: [
      { key: "geometry", label: "B-Rep", type: "geometry", required: true },
      { key: "brep", label: "B-Rep Data", type: "any" },
      { key: "mesh", label: "Mesh", type: "any" },
      { key: "sourceType", label: "Source Type", type: "string" },
    ],
    parameters: [],
    primaryOutputKey: "geometry",
    semanticOps: ["brep.brepFromMesh"] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return { geometry: geometryId, brep: null, mesh: EMPTY_MESH, sourceType: "" };
      }
      if (geometry.type === "brep") {
        return {
          geometry: geometryId,
          brep: geometry.brep,
          mesh: resolveMeshFromGeometry(geometry) ?? EMPTY_MESH,
          sourceType: geometry.type,
        };
      }
      const mesh = resolveMeshFromGeometry(geometry);
      if (!mesh) {
        return { geometry: geometryId, brep: null, mesh: EMPTY_MESH, sourceType: geometry.type };
      }
      const brep = brepFromMesh(mesh);
      return { geometry: geometryId, brep, mesh, sourceType: geometry.type };
    },
  },
  {
    type: "subdivideMesh",
    label: "Subdivide Mesh",
    shortLabel: "SUBD",
    description: "Subdivide a mesh using linear, Catmull-Clark, Loop, or adaptive schemes.",
    category: "tessellation",
    iconId: "tessellation:subdivideMesh",
    inputs: [
      { key: "geometry", label: "Mesh", type: "geometry", required: true },
      {
        key: "iterations",
        label: "Iterations",
        type: "number",
        parameterKey: "iterations",
        defaultValue: 1,
      },
      {
        key: "scheme",
        label: "Scheme",
        type: "string",
        parameterKey: "scheme",
        defaultValue: "catmull-clark",
      },
      {
        key: "preserveBoundary",
        label: "Preserve Boundary",
        type: "boolean",
        parameterKey: "preserveBoundary",
        defaultValue: true,
      },
      {
        key: "maxEdgeLength",
        label: "Max Edge",
        type: "number",
        parameterKey: "maxEdgeLength",
        defaultValue: 0.5,
      },
      {
        key: "curvatureAngle",
        label: "Curvature Angle",
        type: "number",
        parameterKey: "curvatureAngle",
        defaultValue: 15,
      },
    ],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry" },
      { key: "mesh", label: "Mesh Data", type: "any" },
      { key: "tessellation", label: "Tessellation", type: "any" },
      { key: "iterations", label: "Iterations", type: "number" },
      { key: "scheme", label: "Scheme", type: "string" },
    ],
    parameters: [
      { key: "iterations", label: "Iterations", type: "number", defaultValue: 1, min: 1, max: 6, step: 1 },
      {
        key: "scheme",
        label: "Scheme",
        type: "select",
        defaultValue: "catmull-clark",
        options: [
          { value: "linear", label: "Linear" },
          { value: "catmull-clark", label: "Catmull-Clark" },
          { value: "loop", label: "Loop (Tri)" },
          { value: "adaptive", label: "Adaptive" },
        ],
      },
      { key: "preserveBoundary", label: "Preserve Boundary", type: "boolean", defaultValue: true },
      { key: "maxEdgeLength", label: "Max Edge Length", type: "number", defaultValue: 0.5, min: 0, step: 0.05 },
      { key: "curvatureAngle", label: "Curvature Angle (deg)", type: "number", defaultValue: 15, min: 0, max: 90, step: 1 },
    ],
    primaryOutputKey: "geometry",
    semanticOps: [
      "meshTess.getTessellationMetadata",
      "meshTess.subdivideAdaptive",
      "meshTess.subdivideCatmullClark",
      "meshTess.subdivideLinear",
      "meshTess.subdivideLoop",
      "meshTess.tessellationMeshToRenderMesh",
      "meshTess.toTessellationMesh",
      "meshTess.toTessellationMeshData",
    ] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      const iterations = clampInt(
        Math.round(toNumber(inputs.iterations, readNumberParameter(parameters, "iterations", 1))),
        1,
        6,
        1
      );
      const scheme = String(inputs.scheme ?? parameters.scheme ?? "catmull-clark");
      const preserveBoundary = toBoolean(
        inputs.preserveBoundary,
        readBooleanParameter(parameters, "preserveBoundary", true)
      );
      const maxEdgeLength = Math.max(
        0,
        toNumber(inputs.maxEdgeLength, readNumberParameter(parameters, "maxEdgeLength", 0.5))
      );
      const curvatureAngle = toNumber(
        inputs.curvatureAngle,
        readNumberParameter(parameters, "curvatureAngle", 15)
      );
      if (!geometry) {
        return {
          geometry: geometryId,
          mesh: EMPTY_MESH,
          tessellation: null,
          iterations,
          scheme,
        };
      }
      const mesh = resolveMeshFromGeometry(geometry);
      if (!mesh) {
        return {
          geometry: geometryId,
          mesh: EMPTY_MESH,
          tessellation: null,
          iterations,
          scheme,
        };
      }
      const tessellation = toTessellationMesh(mesh, getTessellationMetadata(geometry.metadata));
      let result = tessellation;
      for (let i = 0; i < iterations; i += 1) {
        switch (scheme) {
          case "linear":
            result = subdivideLinear(result);
            break;
          case "loop":
            result = subdivideLoop(result);
            break;
          case "adaptive":
            result = subdivideAdaptive(result, {
              maxEdgeLength,
              curvatureTolerance: (curvatureAngle * Math.PI) / 180,
            });
            break;
          case "catmull-clark":
          default:
            result = subdivideCatmullClark(result, { preserveBoundary });
            break;
        }
      }
      const renderMesh = tessellationMeshToRenderMesh(result);
      return {
        geometry: geometryId,
        mesh: renderMesh,
        tessellation: toTessellationMeshData(result),
        iterations,
        scheme,
      };
    },
  },
  {
    type: "dualMesh",
    label: "Dual Mesh",
    shortLabel: "DUAL",
    description: "Flip faces and vertices to create a dual mesh.",
    category: "tessellation",
    iconId: "tessellation:dualMesh",
    inputs: [
      { key: "geometry", label: "Mesh", type: "geometry", required: true },
    ],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry" },
      { key: "mesh", label: "Mesh Data", type: "any" },
      { key: "tessellation", label: "Tessellation", type: "any" },
    ],
    parameters: [],
    primaryOutputKey: "geometry",
    semanticOps: [
      "meshTess.dualMesh",
      "meshTess.getTessellationMetadata",
      "meshTess.tessellationMeshToRenderMesh",
      "meshTess.toTessellationMesh",
      "meshTess.toTessellationMeshData",
    ] as const,
    compute: ({ inputs, context }) => {
      const geometryId = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const mesh = resolveMeshFromGeometry(geometry);
      if (!mesh) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const tessellation = toTessellationMesh(mesh, getTessellationMetadata(geometry.metadata));
      const result = dualMesh(tessellation);
      return {
        geometry: geometryId,
        mesh: tessellationMeshToRenderMesh(result),
        tessellation: toTessellationMeshData(result),
      };
    },
  },
  {
    type: "insetFaces",
    label: "Inset Faces",
    shortLabel: "INSET",
    description: "Inset mesh faces to create panels and borders.",
    category: "tessellation",
    iconId: "tessellation:insetFaces",
    inputs: [
      { key: "geometry", label: "Mesh", type: "geometry", required: true },
      {
        key: "amount",
        label: "Amount",
        type: "number",
        parameterKey: "amount",
        defaultValue: 0.1,
      },
      {
        key: "mode",
        label: "Mode",
        type: "string",
        parameterKey: "mode",
        defaultValue: "uniform",
      },
      { key: "faces", label: "Faces", type: "any", required: false },
    ],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry" },
      { key: "mesh", label: "Mesh Data", type: "any" },
      { key: "innerFaces", label: "Inner Faces", type: "any" },
      { key: "borderFaces", label: "Border Faces", type: "any" },
      { key: "tessellation", label: "Tessellation", type: "any" },
    ],
    parameters: [
      { key: "amount", label: "Amount", type: "number", defaultValue: 0.1, min: 0, max: 0.95, step: 0.01 },
      {
        key: "mode",
        label: "Mode",
        type: "select",
        defaultValue: "uniform",
        options: [
          { value: "uniform", label: "Uniform" },
          { value: "per-face", label: "Per Face" },
        ],
      },
    ],
    primaryOutputKey: "geometry",
    semanticOps: [
      "meshTess.getTessellationMetadata",
      "meshTess.insetFaces",
      "meshTess.tessellationMeshToRenderMesh",
      "meshTess.toTessellationMesh",
      "meshTess.toTessellationMeshData",
    ] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      const mode = String(inputs.mode ?? parameters.mode ?? "uniform");
      if (!geometry) {
        return {
          geometry: geometryId,
          mesh: EMPTY_MESH,
          innerFaces: [],
          borderFaces: [],
          tessellation: null,
        };
      }
      const mesh = resolveMeshFromGeometry(geometry);
      if (!mesh) {
        return {
          geometry: geometryId,
          mesh: EMPTY_MESH,
          innerFaces: [],
          borderFaces: [],
          tessellation: null,
        };
      }
      const tessellation = toTessellationMesh(mesh, getTessellationMetadata(geometry.metadata));
      const amountList = toNumericList(inputs.amount);
      const amountValue =
        mode === "per-face" && amountList.length > 0
          ? amountList
          : toNumber(inputs.amount, readNumberParameter(parameters, "amount", 0.1));
      const faceIndices = toIndexList(inputs.faces);
      const result = insetFaces(tessellation, amountValue, {
        faceIndices: faceIndices.length > 0 ? faceIndices : undefined,
      });
      return {
        geometry: geometryId,
        mesh: tessellationMeshToRenderMesh(result.mesh),
        innerFaces: result.innerFaces,
        borderFaces: result.borderFaces,
        tessellation: toTessellationMeshData(result.mesh),
      };
    },
  },
  {
    type: "extrudeFaces",
    label: "Extrude Faces",
    shortLabel: "XTRD",
    description: "Extrude selected faces along normals or a fixed axis.",
    category: "tessellation",
    iconId: "tessellation:extrudeFaces",
    inputs: [
      { key: "geometry", label: "Mesh", type: "geometry", required: true },
      {
        key: "distance",
        label: "Distance",
        type: "number",
        parameterKey: "distance",
        defaultValue: 0.1,
      },
      {
        key: "mode",
        label: "Mode",
        type: "string",
        parameterKey: "mode",
        defaultValue: "normal",
      },
      { key: "direction", label: "Direction", type: "vector", required: false },
      { key: "faces", label: "Faces", type: "any", required: false },
    ],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry" },
      { key: "mesh", label: "Mesh Data", type: "any" },
      { key: "tessellation", label: "Tessellation", type: "any" },
    ],
    parameters: [
      { key: "distance", label: "Distance", type: "number", defaultValue: 0.1, step: 0.05 },
      {
        key: "mode",
        label: "Mode",
        type: "select",
        defaultValue: "normal",
        options: [
          { value: "normal", label: "Normal" },
          { value: "fixed-axis", label: "Fixed Axis" },
        ],
      },
      ...vectorParameterSpecs("direction", "Direction", UNIT_Y_VEC3),
    ],
    primaryOutputKey: "geometry",
    semanticOps: [
      "meshTess.extrudeFaces",
      "meshTess.getTessellationMetadata",
      "meshTess.tessellationMeshToRenderMesh",
      "meshTess.toTessellationMesh",
      "meshTess.toTessellationMeshData",
    ] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      const mode = String(inputs.mode ?? parameters.mode ?? "normal");
      if (!geometry) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const mesh = resolveMeshFromGeometry(geometry);
      if (!mesh) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const tessellation = toTessellationMesh(mesh, getTessellationMetadata(geometry.metadata));
      const distanceList = toNumericList(inputs.distance);
      const distanceValue =
        distanceList.length > 1
          ? distanceList
          : toNumber(inputs.distance, readNumberParameter(parameters, "distance", 0.1));
      const faceIndices = toIndexList(inputs.faces);
      const direction = resolveVectorInput(
        inputs,
        parameters,
        "direction",
        "direction",
        UNIT_Y_VEC3
      );
      const result = extrudeFaces(
        tessellation,
        faceIndices.length > 0 ? faceIndices : null,
        distanceValue,
        { mode: mode === "fixed-axis" ? "fixed-axis" : "normal", direction }
      );
      return {
        geometry: geometryId,
        mesh: tessellationMeshToRenderMesh(result),
        tessellation: toTessellationMeshData(result),
      };
    },
  },
  {
    type: "meshRelax",
    label: "Mesh Relax",
    shortLabel: "RELX",
    description: "Smooth a mesh with Laplacian relaxation.",
    category: "tessellation",
    iconId: "tessellation:meshRelax",
    inputs: [
      { key: "geometry", label: "Mesh", type: "geometry", required: true },
      {
        key: "iterations",
        label: "Iterations",
        type: "number",
        parameterKey: "iterations",
        defaultValue: 2,
      },
      {
        key: "strength",
        label: "Strength",
        type: "number",
        parameterKey: "strength",
        defaultValue: 0.5,
      },
      {
        key: "preserveBoundary",
        label: "Preserve Boundary",
        type: "boolean",
        parameterKey: "preserveBoundary",
        defaultValue: true,
      },
    ],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry" },
      { key: "mesh", label: "Mesh Data", type: "any" },
      { key: "tessellation", label: "Tessellation", type: "any" },
    ],
    parameters: [
      { key: "iterations", label: "Iterations", type: "number", defaultValue: 2, min: 1, max: 20, step: 1 },
      { key: "strength", label: "Strength", type: "number", defaultValue: 0.5, min: 0, max: 1, step: 0.05 },
      { key: "preserveBoundary", label: "Preserve Boundary", type: "boolean", defaultValue: true },
    ],
    primaryOutputKey: "geometry",
    semanticOps: [
      "meshTess.getTessellationMetadata",
      "meshTess.meshRelax",
      "meshTess.tessellationMeshToRenderMesh",
      "meshTess.toTessellationMesh",
      "meshTess.toTessellationMeshData",
    ] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      const iterations = clampInt(
        Math.round(toNumber(inputs.iterations, readNumberParameter(parameters, "iterations", 2))),
        1,
        20,
        2
      );
      const strength = clampNumber(
        toNumber(inputs.strength, readNumberParameter(parameters, "strength", 0.5)),
        0,
        1
      );
      const preserveBoundary = toBoolean(
        inputs.preserveBoundary,
        readBooleanParameter(parameters, "preserveBoundary", true)
      );
      if (!geometry) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const mesh = resolveMeshFromGeometry(geometry);
      if (!mesh) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const tessellation = toTessellationMesh(mesh, getTessellationMetadata(geometry.metadata));
      const result = meshRelax(tessellation, iterations, strength, preserveBoundary);
      return {
        geometry: geometryId,
        mesh: tessellationMeshToRenderMesh(result),
        tessellation: toTessellationMeshData(result),
      };
    },
  },
  {
    type: "selectFaces",
    label: "Select Faces",
    shortLabel: "SEL",
    description: "Select mesh faces by area, normal direction, or index pattern.",
    category: "tessellation",
    iconId: "tessellation:selectFaces",
    inputs: [
      { key: "geometry", label: "Mesh", type: "geometry", required: true },
      {
        key: "criteria",
        label: "Criteria",
        type: "string",
        parameterKey: "criteria",
        defaultValue: "area",
      },
      {
        key: "threshold",
        label: "Threshold",
        type: "number",
        parameterKey: "threshold",
        defaultValue: 0.1,
      },
      { key: "direction", label: "Direction", type: "vector", required: false },
      { key: "step", label: "Step", type: "number", parameterKey: "step", defaultValue: 2 },
      { key: "offset", label: "Offset", type: "number", parameterKey: "offset", defaultValue: 0 },
    ],
    outputs: [
      { key: "faceIndices", label: "Faces", type: "any" },
      { key: "count", label: "Count", type: "number" },
    ],
    parameters: [
      {
        key: "criteria",
        label: "Criteria",
        type: "select",
        defaultValue: "area",
        options: [
          { value: "area", label: "Area" },
          { value: "normal-direction", label: "Normal Direction" },
          { value: "index-pattern", label: "Index Pattern" },
        ],
      },
      { key: "threshold", label: "Threshold", type: "number", defaultValue: 0.1, step: 0.05 },
      ...vectorParameterSpecs("direction", "Direction", UNIT_Y_VEC3),
      { key: "step", label: "Step", type: "number", defaultValue: 2, min: 1, step: 1 },
      { key: "offset", label: "Offset", type: "number", defaultValue: 0, min: 0, step: 1 },
    ],
    primaryOutputKey: "faceIndices",
    semanticOps: [
      "meshTess.getTessellationMetadata",
      "meshTess.selectFaces",
      "meshTess.toTessellationMesh",
    ] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      const criteria = String(inputs.criteria ?? parameters.criteria ?? "area") as
        | "area"
        | "normal-direction"
        | "index-pattern";
      const threshold = toNumber(
        inputs.threshold,
        readNumberParameter(parameters, "threshold", 0.1)
      );
      const direction = resolveVectorInput(
        inputs,
        parameters,
        "direction",
        "direction",
        UNIT_Y_VEC3
      );
      if (!geometry) {
        return { faceIndices: [], count: 0 };
      }
      const mesh = resolveMeshFromGeometry(geometry);
      if (!mesh) {
        return { faceIndices: [], count: 0 };
      }
      const tessellation = toTessellationMesh(mesh, getTessellationMetadata(geometry.metadata));
      const faces = selectFaces(tessellation, criteria, {
        threshold: criteria === "normal-direction" ? clampNumber(threshold, -1, 1) : threshold,
        direction,
        step: toNumber(inputs.step, readNumberParameter(parameters, "step", 2)),
        offset: toNumber(inputs.offset, readNumberParameter(parameters, "offset", 0)),
      });
      return { faceIndices: faces, count: faces.length };
    },
  },
  {
    type: "meshBoolean",
    label: "Mesh Boolean",
    shortLabel: "MBOOL",
    description: "Combine two meshes with union, difference, or intersection.",
    category: "tessellation",
    iconId: "tessellation:meshBoolean",
    inputs: [
      { key: "geometryA", label: "A", type: "geometry", required: true },
      { key: "geometryB", label: "B", type: "geometry", required: true },
      {
        key: "operation",
        label: "Operation",
        type: "string",
        parameterKey: "operation",
        defaultValue: "union",
      },
    ],
    outputs: [
      { key: "geometry", label: "Result", type: "geometry" },
      { key: "mesh", label: "Mesh Data", type: "any" },
      { key: "tessellation", label: "Tessellation", type: "any" },
      { key: "operation", label: "Operation", type: "string" },
    ],
    parameters: [
      {
        key: "operation",
        label: "Operation",
        type: "select",
        defaultValue: "union",
        options: [
          { value: "union", label: "Union" },
          { value: "difference", label: "Difference" },
          { value: "intersection", label: "Intersection" },
        ],
      },
    ],
    primaryOutputKey: "geometry",
    semanticOps: [
      "meshTess.meshBoolean",
      "meshTess.toTessellationMesh",
      "meshTess.toTessellationMeshData",
    ] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const geometryAId = typeof inputs.geometryA === "string" ? inputs.geometryA : null;
      const geometryBId = typeof inputs.geometryB === "string" ? inputs.geometryB : null;
      const geometryA = geometryAId ? context.geometryById.get(geometryAId) : null;
      const geometryB = geometryBId ? context.geometryById.get(geometryBId) : null;
      const operation = String(inputs.operation ?? parameters.operation ?? "union") as
        | "union"
        | "difference"
        | "intersection";
      const outputGeometryId = geometryId ?? geometryAId;
      const meshA = geometryA ? resolveMeshFromGeometry(geometryA) : null;
      const meshB = geometryB ? resolveMeshFromGeometry(geometryB) : null;
      if (!outputGeometryId || !meshA || !meshB) {
        return { geometry: outputGeometryId, mesh: EMPTY_MESH, operation, tessellation: null };
      }
      const resultMesh = meshBoolean(meshA, meshB, operation);
      const tessellation = toTessellationMesh(resultMesh, null);
      return {
        geometry: outputGeometryId,
        mesh: resultMesh,
        tessellation: toTessellationMeshData(tessellation),
        operation,
      };
    },
  },
  {
    type: "triangulateMesh",
    label: "Triangulate Mesh",
    shortLabel: "TRI",
    description: "Convert all faces to triangles.",
    category: "tessellation",
    iconId: "tessellation:triangulateMesh",
    inputs: [{ key: "geometry", label: "Mesh", type: "geometry", required: true }],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry" },
      { key: "mesh", label: "Mesh Data", type: "any" },
      { key: "tessellation", label: "Tessellation", type: "any" },
    ],
    parameters: [],
    primaryOutputKey: "geometry",
    semanticOps: [
      "meshTess.getTessellationMetadata",
      "meshTess.tessellationMeshToRenderMesh",
      "meshTess.toTessellationMesh",
      "meshTess.toTessellationMeshData",
      "meshTess.triangulateMesh",
    ] as const,
    compute: ({ inputs, context }) => {
      const geometryId = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const mesh = resolveMeshFromGeometry(geometry);
      if (!mesh) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const tessellation = toTessellationMesh(mesh, getTessellationMetadata(geometry.metadata));
      const result = triangulateMesh(tessellation);
      return {
        geometry: geometryId,
        mesh: tessellationMeshToRenderMesh(result),
        tessellation: toTessellationMeshData(result),
      };
    },
  },
  {
    type: "geodesicSphere",
    label: "Geodesic Sphere",
    shortLabel: "GEO",
    description: "Generate a geodesic sphere mesh.",
    category: "tessellation",
    iconId: "tessellation:geodesicSphere",
    inputs: [
      { key: "radius", label: "Radius", type: "number", parameterKey: "radius", defaultValue: 1 },
      { key: "frequency", label: "Frequency", type: "number", parameterKey: "frequency", defaultValue: 2 },
      {
        key: "method",
        label: "Base",
        type: "string",
        parameterKey: "method",
        defaultValue: "icosahedron",
      },
    ],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry" },
      { key: "mesh", label: "Mesh Data", type: "any" },
      { key: "tessellation", label: "Tessellation", type: "any" },
    ],
    parameters: [
      { key: "radius", label: "Radius", type: "number", defaultValue: 1, min: 0.01, step: 0.1 },
      { key: "frequency", label: "Frequency", type: "number", defaultValue: 2, min: 1, max: 12, step: 1 },
      {
        key: "method",
        label: "Base",
        type: "select",
        defaultValue: "icosahedron",
        options: [
          { value: "icosahedron", label: "Icosahedron" },
          { value: "octahedron", label: "Octahedron" },
        ],
      },
    ],
    primaryOutputKey: "geometry",
    semanticOps: [
      "meshTess.generateGeodesicSphere",
      "meshTess.tessellationMeshToRenderMesh",
      "meshTess.toTessellationMeshData",
    ] as const,
    compute: ({ inputs, parameters }) => {
      const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const radius = toNumber(inputs.radius, readNumberParameter(parameters, "radius", 1));
      const frequency = toNumber(inputs.frequency, readNumberParameter(parameters, "frequency", 2));
      const method = String(inputs.method ?? parameters.method ?? "icosahedron") as
        | "icosahedron"
        | "octahedron";
      const result = generateGeodesicSphere(Math.max(0.01, radius), frequency, method);
      return {
        geometry: geometryId,
        mesh: tessellationMeshToRenderMesh(result),
        tessellation: toTessellationMeshData(result),
      };
    },
  },
  {
    type: "voronoiPattern",
    label: "Voronoi Pattern",
    shortLabel: "VOR",
    description: "Generate a Voronoi pattern from a boundary surface.",
    category: "tessellation",
    iconId: "tessellation:voronoiPattern",
    inputs: [
      { key: "geometry", label: "Boundary", type: "geometry", required: true },
      { key: "numCells", label: "Cells", type: "number", parameterKey: "numCells", defaultValue: 30 },
      { key: "relaxIterations", label: "Relax", type: "number", parameterKey: "relaxIterations", defaultValue: 2 },
      { key: "seeds", label: "Seeds", type: "any", required: false },
    ],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry" },
      { key: "mesh", label: "Mesh Data", type: "any" },
      { key: "tessellation", label: "Tessellation", type: "any" },
    ],
    parameters: [
      { key: "numCells", label: "Cells", type: "number", defaultValue: 30, min: 1, max: 200, step: 1 },
      { key: "relaxIterations", label: "Relax Iterations", type: "number", defaultValue: 2, min: 0, max: 10, step: 1 },
    ],
    primaryOutputKey: "geometry",
    semanticOps: [
      "math.computeBestFitPlane",
      "math.projectPointToPlane",
      "meshTess.generateVoronoiPattern",
      "meshTess.getTessellationMetadata",
      "meshTess.tessellationMeshToRenderMesh",
      "meshTess.toTessellationMesh",
      "meshTess.toTessellationMeshData",
    ] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const mesh = resolveMeshFromGeometry(geometry);
      if (!mesh) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const tessellation = toTessellationMesh(mesh, getTessellationMetadata(geometry.metadata));
      if (tessellation.vertices.length === 0) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const plane = computeBestFitPlane(tessellation.vertices);
      let minU = Number.POSITIVE_INFINITY;
      let maxU = Number.NEGATIVE_INFINITY;
      let minV = Number.POSITIVE_INFINITY;
      let maxV = Number.NEGATIVE_INFINITY;
      tessellation.vertices.forEach((vertex) => {
        const projected = projectPointToPlane(vertex, plane);
        minU = Math.min(minU, projected.u);
        maxU = Math.max(maxU, projected.u);
        minV = Math.min(minV, projected.v);
        maxV = Math.max(maxV, projected.v);
      });
      const bounds = { min: { x: minU, y: minV }, max: { x: maxU, y: maxV } } as const;
      const seedPoints = collectVec3List(inputs.seeds).map((point) => {
        const projected = projectPointToPlane(point, plane);
        return { x: projected.u, y: projected.v };
      });
      const numCells = clampInt(
        Math.round(toNumber(inputs.numCells, readNumberParameter(parameters, "numCells", 30))),
        1,
        200,
        30
      );
      const relaxIterations = clampInt(
        Math.round(
          toNumber(inputs.relaxIterations, readNumberParameter(parameters, "relaxIterations", 2))
        ),
        0,
        10,
        2
      );
      const random = createSeededRandom(hashStringToSeed(`${context.nodeId}:${geometryId ?? "voronoi"}`));
      const seeds = seedPoints.length > 0 ? seedPoints : Array.from({ length: numCells }, () => ({
        x: bounds.min.x + random() * (bounds.max.x - bounds.min.x || 1),
        y: bounds.min.y + random() * (bounds.max.y - bounds.min.y || 1),
      }));
      const result = generateVoronoiPattern(
        plane.origin,
        plane.xAxis,
        plane.yAxis,
        bounds,
        seeds,
        relaxIterations
      );
      return {
        geometry: geometryId,
        mesh: tessellationMeshToRenderMesh(result),
        tessellation: toTessellationMeshData(result),
      };
    },
  },
  {
    type: "hexagonalTiling",
    label: "Hexagonal Tiling",
    shortLabel: "HEX",
    description: "Generate a hexagonal tiling over a surface plane.",
    category: "tessellation",
    iconId: "tessellation:hexagonalTiling",
    inputs: [
      { key: "geometry", label: "Surface", type: "geometry", required: true },
      { key: "cellSize", label: "Cell Size", type: "number", parameterKey: "cellSize", defaultValue: 0.5 },
      { key: "orientation", label: "Orientation", type: "number", parameterKey: "orientation", defaultValue: 0 },
    ],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry" },
      { key: "mesh", label: "Mesh Data", type: "any" },
      { key: "tessellation", label: "Tessellation", type: "any" },
    ],
    parameters: [
      { key: "cellSize", label: "Cell Size", type: "number", defaultValue: 0.5, min: 0.05, step: 0.05 },
      { key: "orientation", label: "Orientation", type: "number", defaultValue: 0, step: 5 },
    ],
    primaryOutputKey: "geometry",
    semanticOps: [
      "math.computeBestFitPlane",
      "math.projectPointToPlane",
      "meshTess.generateHexagonalTiling",
      "meshTess.getTessellationMetadata",
      "meshTess.tessellationMeshToRenderMesh",
      "meshTess.toTessellationMesh",
      "meshTess.toTessellationMeshData",
    ] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const mesh = resolveMeshFromGeometry(geometry);
      if (!mesh) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const tessellation = toTessellationMesh(mesh, getTessellationMetadata(geometry.metadata));
      if (tessellation.vertices.length === 0) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const plane = computeBestFitPlane(tessellation.vertices);
      let minU = Number.POSITIVE_INFINITY;
      let maxU = Number.NEGATIVE_INFINITY;
      let minV = Number.POSITIVE_INFINITY;
      let maxV = Number.NEGATIVE_INFINITY;
      tessellation.vertices.forEach((vertex) => {
        const projected = projectPointToPlane(vertex, plane);
        minU = Math.min(minU, projected.u);
        maxU = Math.max(maxU, projected.u);
        minV = Math.min(minV, projected.v);
        maxV = Math.max(maxV, projected.v);
      });
      const bounds = { min: { x: minU, y: minV }, max: { x: maxU, y: maxV } } as const;
      const cellSize = toNumber(inputs.cellSize, readNumberParameter(parameters, "cellSize", 0.5));
      const orientation = toNumber(inputs.orientation, readNumberParameter(parameters, "orientation", 0));
      const result = generateHexagonalTiling(
        plane.origin,
        plane.xAxis,
        plane.yAxis,
        bounds,
        cellSize,
        orientation
      );
      return {
        geometry: geometryId,
        mesh: tessellationMeshToRenderMesh(result),
        tessellation: toTessellationMeshData(result),
      };
    },
  },
  {
    type: "offsetPattern",
    label: "Offset Pattern",
    shortLabel: "OFST",
    description: "Inset and extrude faces to create panelized patterns.",
    category: "tessellation",
    iconId: "tessellation:offsetPattern",
    inputs: [
      { key: "geometry", label: "Mesh", type: "geometry", required: true },
      { key: "insetAmount", label: "Inset", type: "number", parameterKey: "insetAmount", defaultValue: 0.1 },
      { key: "extrudeDepth", label: "Extrude", type: "number", parameterKey: "extrudeDepth", defaultValue: 0.1 },
      { key: "borderWidth", label: "Border", type: "number", parameterKey: "borderWidth", defaultValue: 0 },
    ],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry" },
      { key: "mesh", label: "Mesh Data", type: "any" },
      { key: "tessellation", label: "Tessellation", type: "any" },
    ],
    parameters: [
      { key: "insetAmount", label: "Inset Amount", type: "number", defaultValue: 0.1, min: 0, max: 0.95, step: 0.01 },
      { key: "extrudeDepth", label: "Extrude Depth", type: "number", defaultValue: 0.1, step: 0.05 },
      { key: "borderWidth", label: "Border Width", type: "number", defaultValue: 0, min: 0, max: 0.95, step: 0.01 },
    ],
    primaryOutputKey: "geometry",
    semanticOps: [
      "meshTess.getTessellationMetadata",
      "meshTess.offsetPattern",
      "meshTess.tessellationMeshToRenderMesh",
      "meshTess.toTessellationMesh",
      "meshTess.toTessellationMeshData",
    ] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const mesh = resolveMeshFromGeometry(geometry);
      if (!mesh) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const tessellation = toTessellationMesh(mesh, getTessellationMetadata(geometry.metadata));
      const insetAmount = toNumber(
        inputs.insetAmount,
        readNumberParameter(parameters, "insetAmount", 0.1)
      );
      const extrudeDepth = toNumber(
        inputs.extrudeDepth,
        readNumberParameter(parameters, "extrudeDepth", 0.1)
      );
      const borderWidth = toNumber(
        inputs.borderWidth,
        readNumberParameter(parameters, "borderWidth", 0)
      );
      const result = offsetPattern(tessellation, insetAmount, extrudeDepth, borderWidth);
      return {
        geometry: geometryId,
        mesh: tessellationMeshToRenderMesh(result),
        tessellation: toTessellationMeshData(result),
      };
    },
  },
  {
    type: "meshRepair",
    label: "Mesh Repair",
    shortLabel: "REPR",
    description: "Repair holes and weld close vertices.",
    category: "tessellation",
    iconId: "tessellation:meshRepair",
    inputs: [
      { key: "geometry", label: "Mesh", type: "geometry", required: true },
      { key: "fillHoles", label: "Fill Holes", type: "boolean", parameterKey: "fillHoles", defaultValue: true },
      { key: "weldTolerance", label: "Weld Tol", type: "number", parameterKey: "weldTolerance", defaultValue: 0.001 },
    ],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry" },
      { key: "mesh", label: "Mesh Data", type: "any" },
      { key: "tessellation", label: "Tessellation", type: "any" },
    ],
    parameters: [
      { key: "fillHoles", label: "Fill Holes", type: "boolean", defaultValue: true },
      { key: "weldTolerance", label: "Weld Tolerance", type: "number", defaultValue: 0.001, min: 0, step: 0.0005 },
    ],
    primaryOutputKey: "geometry",
    semanticOps: [
      "meshTess.getTessellationMetadata",
      "meshTess.repairMesh",
      "meshTess.tessellationMeshToRenderMesh",
      "meshTess.toTessellationMesh",
      "meshTess.toTessellationMeshData",
    ] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const mesh = resolveMeshFromGeometry(geometry);
      if (!mesh) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const tessellation = toTessellationMesh(mesh, getTessellationMetadata(geometry.metadata));
      const fillHoles = toBoolean(inputs.fillHoles, readBooleanParameter(parameters, "fillHoles", true));
      const weldTolerance = Math.max(
        0,
        toNumber(inputs.weldTolerance, readNumberParameter(parameters, "weldTolerance", 0.001))
      );
      const result = repairMesh(tessellation, { fillHoles, weldTolerance });
      return {
        geometry: geometryId,
        mesh: tessellationMeshToRenderMesh(result),
        tessellation: toTessellationMeshData(result),
      };
    },
  },
  {
    type: "meshUVs",
    label: "Generate UVs",
    shortLabel: "UV",
    description: "Generate UV coordinates for a mesh.",
    category: "tessellation",
    iconId: "tessellation:meshUVs",
    inputs: [
      { key: "geometry", label: "Mesh", type: "geometry", required: true },
      { key: "mode", label: "Mode", type: "string", parameterKey: "mode", defaultValue: "planar" },
      { key: "axis", label: "Axis", type: "vector", required: false },
    ],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry" },
      { key: "mesh", label: "Mesh Data", type: "any" },
      { key: "tessellation", label: "Tessellation", type: "any" },
    ],
    parameters: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        defaultValue: "planar",
        options: [
          { value: "planar", label: "Planar" },
          { value: "cylindrical", label: "Cylindrical" },
          { value: "spherical", label: "Spherical" },
        ],
      },
      ...vectorParameterSpecs("axis", "Axis", UNIT_Y_VEC3),
    ],
    primaryOutputKey: "geometry",
    semanticOps: [
      "meshTess.generateMeshUVs",
      "meshTess.getTessellationMetadata",
      "meshTess.tessellationMeshToRenderMesh",
      "meshTess.toTessellationMesh",
      "meshTess.toTessellationMeshData",
    ] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const mesh = resolveMeshFromGeometry(geometry);
      if (!mesh) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const tessellation = toTessellationMesh(mesh, getTessellationMetadata(geometry.metadata));
      const mode = String(inputs.mode ?? parameters.mode ?? "planar") as
        | "planar"
        | "cylindrical"
        | "spherical";
      const axis = resolveVectorInput(inputs, parameters, "axis", "axis", UNIT_Y_VEC3);
      const result = generateMeshUVs(tessellation, mode, axis);
      return {
        geometry: geometryId,
        mesh: tessellationMeshToRenderMesh(result),
        tessellation: toTessellationMeshData(result),
      };
    },
  },
  {
    type: "meshDecimate",
    label: "Mesh Decimate",
    shortLabel: "DEC",
    description: "Reduce mesh density via vertex clustering.",
    category: "tessellation",
    iconId: "tessellation:meshDecimate",
    inputs: [
      { key: "geometry", label: "Mesh", type: "geometry", required: true },
      {
        key: "targetFaceCount",
        label: "Target Faces",
        type: "number",
        parameterKey: "targetFaceCount",
        defaultValue: 1000,
      },
      { key: "cellSize", label: "Cell Size", type: "number", parameterKey: "cellSize", defaultValue: 0 },
    ],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry" },
      { key: "mesh", label: "Mesh Data", type: "any" },
      { key: "tessellation", label: "Tessellation", type: "any" },
    ],
    parameters: [
      { key: "targetFaceCount", label: "Target Faces", type: "number", defaultValue: 1000, min: 10, step: 10 },
      { key: "cellSize", label: "Cell Size", type: "number", defaultValue: 0, min: 0, step: 0.05 },
    ],
    primaryOutputKey: "geometry",
    semanticOps: [
      "meshTess.decimateMesh",
      "meshTess.getTessellationMetadata",
      "meshTess.tessellationMeshToRenderMesh",
      "meshTess.toTessellationMesh",
      "meshTess.toTessellationMeshData",
    ] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const mesh = resolveMeshFromGeometry(geometry);
      if (!mesh) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const tessellation = toTessellationMesh(mesh, getTessellationMetadata(geometry.metadata));
      const targetFaceCount = Math.max(
        10,
        Math.round(toNumber(inputs.targetFaceCount, readNumberParameter(parameters, "targetFaceCount", 1000)))
      );
      const cellSize = Math.max(
        0,
        toNumber(inputs.cellSize, readNumberParameter(parameters, "cellSize", 0))
      );
      const result = decimateMesh(tessellation, { targetFaceCount, cellSize });
      return {
        geometry: geometryId,
        mesh: tessellationMeshToRenderMesh(result),
        tessellation: toTessellationMeshData(result),
      };
    },
  },
  {
    type: "quadRemesh",
    label: "Quad Remesh",
    shortLabel: "QUAD",
    description: "Merge adjacent triangles into quad-dominant faces.",
    category: "tessellation",
    iconId: "tessellation:quadRemesh",
    inputs: [
      { key: "geometry", label: "Mesh", type: "geometry", required: true },
      { key: "maxAngle", label: "Max Angle", type: "number", parameterKey: "maxAngle", defaultValue: 15 },
    ],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry" },
      { key: "mesh", label: "Mesh Data", type: "any" },
      { key: "tessellation", label: "Tessellation", type: "any" },
    ],
    parameters: [
      { key: "maxAngle", label: "Max Angle (deg)", type: "number", defaultValue: 15, min: 0, max: 90, step: 1 },
    ],
    primaryOutputKey: "geometry",
    semanticOps: [
      "meshTess.getTessellationMetadata",
      "meshTess.quadDominantRemesh",
      "meshTess.tessellationMeshToRenderMesh",
      "meshTess.toTessellationMesh",
      "meshTess.toTessellationMeshData",
    ] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const mesh = resolveMeshFromGeometry(geometry);
      if (!mesh) {
        return { geometry: geometryId, mesh: EMPTY_MESH, tessellation: null };
      }
      const tessellation = toTessellationMesh(mesh, getTessellationMetadata(geometry.metadata));
      const maxAngle = toNumber(inputs.maxAngle, readNumberParameter(parameters, "maxAngle", 15));
      const result = quadDominantRemesh(tessellation, maxAngle);
      return {
        geometry: geometryId,
        mesh: tessellationMeshToRenderMesh(result),
        tessellation: toTessellationMeshData(result),
      };
    },
  },
  {
    type: "stlImport",
    label: "STL Import",
    shortLabel: "STL",
    description: "Import STL geometry into the scene.",
    category: "interop",
    iconId: "load",
    inputs: [],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry" },
      { key: "fileName", label: "File", type: "string" },
      { key: "status", label: "Status", type: "string" },
    ],
    parameters: [
      {
        key: "file",
        label: "STL File",
        type: "file",
        defaultValue: null,
        accept: ".stl",
      },
      { key: "importNow", label: "Import", type: "boolean", defaultValue: false },
      { key: "scale", label: "Scale", type: "number", defaultValue: 1, min: 0, step: 0.001 },
    ],
    primaryOutputKey: "geometry",
    compute: ({ parameters }) => {
      const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const file = parameters.file as { name?: string } | null | undefined;
      const importNow = readBooleanParameter(parameters, "importNow", false);
      const status = !file ? "No file" : importNow ? "Queued" : "Ready";
      return {
        geometry: geometryId,
        fileName: file?.name ?? "",
        status,
      };
    },
  },
  {
    type: "stlExport",
    label: "STL Export",
    shortLabel: "STL",
    description: "Export geometry to an STL file.",
    category: "interop",
    iconId: "download",
    inputs: [
      {
        key: "geometry",
        label: "Geometry",
        type: "geometry",
        required: true,
        allowMultiple: true,
      },
    ],
    outputs: [
      { key: "geometryList", label: "Geometry List", type: "any" },
      { key: "count", label: "Count", type: "number" },
      { key: "status", label: "Status", type: "string" },
    ],
    parameters: [
      { key: "exportNow", label: "Export", type: "boolean", defaultValue: false },
      {
        key: "fileName",
        label: "File Name",
        type: "string",
        defaultValue: "lingua-export",
      },
      { key: "scale", label: "Scale", type: "number", defaultValue: 1, min: 0, step: 0.001 },
    ],
    compute: ({ inputs, parameters, context }) => {
      const geometries = resolveGeometryList(inputs, context);
      const exportNow = readBooleanParameter(parameters, "exportNow", false);
      const status =
        geometries.length === 0 ? "No geometry" : exportNow ? "Queued" : "Ready";
      return {
        geometryList: geometries.map((geometry) => geometry.id),
        count: geometries.length,
        status,
      };
    },
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
    semanticOps: ['math.remap'],
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
    semanticOps: ['math.random'],
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
    type: "linearArray",
    label: "Linear Array",
    shortLabel: "LARR",
    description: "Duplicate points along a direction at a fixed spacing.",
    category: "arrays",
    iconId: "arrayLinear",
    inputs: [
      { key: "base", label: "Base", type: "vector", required: true },
      { key: "direction", label: "Direction", type: "vector", required: true },
      {
        key: "spacing",
        label: "Spacing",
        type: "number",
        parameterKey: "spacing",
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
      { key: "points", label: "Points", type: "any" },
      { key: "count", label: "Count", type: "number" },
      { key: "step", label: "Step", type: "vector" },
      { key: "spacing", label: "Spacing", type: "number" },
    ],
    parameters: [
      ...vectorParameterSpecs("base", "Base", ZERO_VEC3),
      ...vectorParameterSpecs("direction", "Direction", UNIT_X_VEC3),
      { key: "spacing", label: "Spacing", type: "number", defaultValue: 1, step: 0.1 },
      {
        key: "count",
        label: "Count",
        type: "number",
        defaultValue: 5,
        min: 1,
        max: MAX_LIST_ITEMS,
        step: 1,
      },
      {
        key: "centered",
        label: "Centered",
        type: "boolean",
        defaultValue: false,
      },
    ],
    primaryOutputKey: "points",
    compute: ({ inputs, parameters }) => {
      const base = resolveVectorInput(inputs, parameters, "base", "base", ZERO_VEC3);
      const directionInput = resolveVectorInput(
        inputs,
        parameters,
        "direction",
        "direction",
        UNIT_X_VEC3
      );
      const direction = normalizeVec3Safe(directionInput, UNIT_X_VEC3);
      const spacing = toNumber(
        inputs.spacing,
        readNumberParameter(parameters, "spacing", 1)
      );
      const count = clampInt(
        toNumber(inputs.count, readNumberParameter(parameters, "count", 5)),
        1,
        MAX_LIST_ITEMS,
        5
      );
      const centered = readBooleanParameter(parameters, "centered", false);
      const step = scaleVec3(direction, spacing);
      const offset = centered ? scaleVec3(step, (count - 1) * 0.5) : ZERO_VEC3;
      const start = centered ? subtractVec3(base, offset) : base;
      const points: Vec3Value[] = [];
      for (let i = 0; i < count && points.length < MAX_LIST_ITEMS; i += 1) {
        points.push(addVec3(start, scaleVec3(step, i)));
      }
      return {
        points,
        count: points.length,
        step,
        spacing,
      };
    },
  },
  {
    type: "polarArray",
    label: "Polar Array",
    shortLabel: "PARR",
    description: "Distribute points around an axis with a sweep angle.",
    category: "arrays",
    iconId: "arrayPolar",
    inputs: [
      { key: "center", label: "Center", type: "vector", required: true },
      { key: "axis", label: "Axis", type: "vector", required: true },
      { key: "reference", label: "Reference", type: "vector", required: false },
      {
        key: "radius",
        label: "Radius",
        type: "number",
        parameterKey: "radius",
        defaultValue: 5,
      },
      {
        key: "count",
        label: "Count",
        type: "number",
        parameterKey: "count",
        defaultValue: 8,
      },
      {
        key: "startAngle",
        label: "Start",
        type: "number",
        parameterKey: "startAngle",
        defaultValue: 0,
      },
      {
        key: "sweep",
        label: "Sweep",
        type: "number",
        parameterKey: "sweep",
        defaultValue: 360,
      },
    ],
    outputs: [
      { key: "points", label: "Points", type: "any" },
      { key: "angles", label: "Angles", type: "any" },
      { key: "count", label: "Count", type: "number" },
      { key: "stepAngle", label: "Step", type: "number" },
      { key: "radius", label: "Radius", type: "number" },
      { key: "axis", label: "Axis", type: "vector" },
    ],
    parameters: [
      ...vectorParameterSpecs("center", "Center", ZERO_VEC3),
      ...vectorParameterSpecs("axis", "Axis", UNIT_Z_VEC3),
      ...vectorParameterSpecs("reference", "Reference", UNIT_X_VEC3),
      { key: "radius", label: "Radius", type: "number", defaultValue: 5, step: 0.5, min: 0 },
      {
        key: "count",
        label: "Count",
        type: "number",
        defaultValue: 8,
        min: 1,
        max: MAX_LIST_ITEMS,
        step: 1,
      },
      {
        key: "startAngle",
        label: "Start Angle",
        type: "number",
        defaultValue: 0,
        step: 5,
      },
      {
        key: "sweep",
        label: "Sweep",
        type: "number",
        defaultValue: 360,
        step: 5,
      },
      {
        key: "includeEnd",
        label: "Include End",
        type: "boolean",
        defaultValue: false,
      },
    ],
    primaryOutputKey: "points",
    compute: ({ inputs, parameters }) => {
      const center = resolveVectorInput(inputs, parameters, "center", "center", ZERO_VEC3);
      const axisInput = resolveVectorInput(inputs, parameters, "axis", "axis", UNIT_Z_VEC3);
      const referenceInput = resolveVectorInput(
        inputs,
        parameters,
        "reference",
        "reference",
        UNIT_X_VEC3
      );
      const { xAxis, yAxis, zAxis } = buildPlaneBasis(axisInput, referenceInput);
      const radius = toNumber(
        inputs.radius,
        readNumberParameter(parameters, "radius", 5)
      );
      const count = clampInt(
        toNumber(inputs.count, readNumberParameter(parameters, "count", 8)),
        1,
        MAX_LIST_ITEMS,
        8
      );
      const startAngle = toNumber(
        inputs.startAngle,
        readNumberParameter(parameters, "startAngle", 0)
      );
      const sweep = toNumber(inputs.sweep, readNumberParameter(parameters, "sweep", 360));
      const includeEnd = readBooleanParameter(parameters, "includeEnd", false);
      const stepAngle =
        count <= 1 ? 0 : sweep / (includeEnd ? Math.max(1, count - 1) : count);
      const points: Vec3Value[] = [];
      const angles: number[] = [];
      for (let i = 0; i < count && points.length < MAX_LIST_ITEMS; i += 1) {
        const angleDeg = startAngle + stepAngle * i;
        const angleRad = (angleDeg * Math.PI) / 180;
        const offset = addVec3(
          scaleVec3(xAxis, Math.cos(angleRad) * radius),
          scaleVec3(yAxis, Math.sin(angleRad) * radius)
        );
        points.push(addVec3(center, offset));
        angles.push(angleDeg);
      }
      return {
        points,
        angles,
        count: points.length,
        stepAngle,
        radius,
        axis: zAxis,
      };
    },
  },
  {
    type: "gridArray",
    label: "Grid Array",
    shortLabel: "GRID",
    description: "Create a rectangular grid of points from two axes.",
    category: "arrays",
    iconId: "arrayGrid",
    inputs: [
      { key: "origin", label: "Origin", type: "vector", required: true },
      { key: "xAxis", label: "X Axis", type: "vector", required: true },
      { key: "yAxis", label: "Y Axis", type: "vector", required: true },
      {
        key: "xSpacing",
        label: "X Spacing",
        type: "number",
        parameterKey: "xSpacing",
        defaultValue: 1,
      },
      {
        key: "ySpacing",
        label: "Y Spacing",
        type: "number",
        parameterKey: "ySpacing",
        defaultValue: 1,
      },
      {
        key: "xCount",
        label: "X Count",
        type: "number",
        parameterKey: "xCount",
        defaultValue: 4,
      },
      {
        key: "yCount",
        label: "Y Count",
        type: "number",
        parameterKey: "yCount",
        defaultValue: 4,
      },
    ],
    outputs: [
      { key: "points", label: "Points", type: "any" },
      { key: "grid", label: "Grid", type: "any" },
      { key: "count", label: "Count", type: "number" },
      { key: "xCount", label: "X Count", type: "number" },
      { key: "yCount", label: "Y Count", type: "number" },
      { key: "xStep", label: "X Step", type: "vector" },
      { key: "yStep", label: "Y Step", type: "vector" },
    ],
    parameters: [
      ...vectorParameterSpecs("origin", "Origin", ZERO_VEC3),
      ...vectorParameterSpecs("xAxis", "X Axis", UNIT_X_VEC3),
      ...vectorParameterSpecs("yAxis", "Y Axis", UNIT_Y_VEC3),
      { key: "xSpacing", label: "X Spacing", type: "number", defaultValue: 1, step: 0.1 },
      { key: "ySpacing", label: "Y Spacing", type: "number", defaultValue: 1, step: 0.1 },
      {
        key: "xCount",
        label: "X Count",
        type: "number",
        defaultValue: 4,
        min: 1,
        max: MAX_LIST_ITEMS,
        step: 1,
      },
      {
        key: "yCount",
        label: "Y Count",
        type: "number",
        defaultValue: 4,
        min: 1,
        max: MAX_LIST_ITEMS,
        step: 1,
      },
      {
        key: "centered",
        label: "Centered",
        type: "boolean",
        defaultValue: false,
      },
    ],
    primaryOutputKey: "points",
    compute: ({ inputs, parameters }) => {
      const origin = resolveVectorInput(inputs, parameters, "origin", "origin", ZERO_VEC3);
      const xAxisInput = resolveVectorInput(inputs, parameters, "xAxis", "xAxis", UNIT_X_VEC3);
      const yAxisInput = resolveVectorInput(inputs, parameters, "yAxis", "yAxis", UNIT_Y_VEC3);
      const xAxis = normalizeVec3Safe(xAxisInput, UNIT_X_VEC3);
      let yAxis = normalizeVec3Safe(yAxisInput, UNIT_Y_VEC3);
      if (lengthVec3(crossVec3(xAxis, yAxis)) <= EPSILON) {
        const fallback = Math.abs(xAxis.y) < 0.9 ? UNIT_Y_VEC3 : UNIT_Z_VEC3;
        yAxis = normalizeVec3Safe(crossVec3(xAxis, fallback), UNIT_Y_VEC3);
      }
      const xSpacing = toNumber(
        inputs.xSpacing,
        readNumberParameter(parameters, "xSpacing", 1)
      );
      const ySpacing = toNumber(
        inputs.ySpacing,
        readNumberParameter(parameters, "ySpacing", 1)
      );
      let xCount = clampInt(
        toNumber(inputs.xCount, readNumberParameter(parameters, "xCount", 4)),
        1,
        MAX_LIST_ITEMS,
        4
      );
      let yCount = clampInt(
        toNumber(inputs.yCount, readNumberParameter(parameters, "yCount", 4)),
        1,
        MAX_LIST_ITEMS,
        4
      );
      if (xCount * yCount > MAX_LIST_ITEMS) {
        if (xCount >= MAX_LIST_ITEMS) {
          xCount = MAX_LIST_ITEMS;
          yCount = 1;
        } else {
          yCount = Math.max(1, Math.floor(MAX_LIST_ITEMS / xCount));
        }
      }
      const centered = readBooleanParameter(parameters, "centered", false);
      const xStep = scaleVec3(xAxis, xSpacing);
      const yStep = scaleVec3(yAxis, ySpacing);
      const centerOffset = centered
        ? addVec3(scaleVec3(xStep, (xCount - 1) * 0.5), scaleVec3(yStep, (yCount - 1) * 0.5))
        : ZERO_VEC3;
      const start = centered ? subtractVec3(origin, centerOffset) : origin;
      const points: Vec3Value[] = [];
      const grid: Vec3Value[][] = [];
      for (let y = 0; y < yCount; y += 1) {
        const row: Vec3Value[] = [];
        for (let x = 0; x < xCount; x += 1) {
          const point = addVec3(
            addVec3(start, scaleVec3(xStep, x)),
            scaleVec3(yStep, y)
          );
          row.push(point);
          points.push(point);
        }
        grid.push(row);
      }
      return {
        points,
        grid,
        count: points.length,
        xCount,
        yCount,
        xStep,
        yStep,
      };
    },
  },
  {
    type: "geometryArray",
    label: "Geometry Array",
    shortLabel: "ARR",
    description: "Duplicate geometry in linear, grid, or polar patterns.",
    category: "arrays",
    iconId: "arrayGrid",
    inputs: [
      { key: "geometry", label: "Geometry", type: "geometry", required: true },
      {
        key: "mode",
        label: "Mode",
        type: "string",
        parameterKey: "mode",
        defaultValue: "linear",
      },
    ],
    outputs: [
      { key: "geometry", label: "Source", type: "geometry" },
      { key: "geometryList", label: "Geometry List", type: "any" },
      { key: "count", label: "Count", type: "number" },
    ],
    parameters: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        defaultValue: "linear",
        options: [
          { value: "linear", label: "Linear" },
          { value: "grid", label: "Grid" },
          { value: "polar", label: "Polar" },
        ],
      },
      ...vectorParameterSpecs("direction", "Direction", UNIT_X_VEC3),
      { key: "spacing", label: "Spacing", type: "number", defaultValue: 1, min: 0, step: 0.1 },
      { key: "count", label: "Count", type: "number", defaultValue: 4, min: 1, max: 64, step: 1 },
      ...vectorParameterSpecs("xAxis", "X Axis", UNIT_X_VEC3),
      ...vectorParameterSpecs("yAxis", "Y Axis", UNIT_Y_VEC3),
      { key: "xSpacing", label: "X Spacing", type: "number", defaultValue: 1, min: 0, step: 0.1 },
      { key: "ySpacing", label: "Y Spacing", type: "number", defaultValue: 1, min: 0, step: 0.1 },
      { key: "xCount", label: "X Count", type: "number", defaultValue: 3, min: 1, max: 32, step: 1 },
      { key: "yCount", label: "Y Count", type: "number", defaultValue: 3, min: 1, max: 32, step: 1 },
      ...vectorParameterSpecs("center", "Center", ZERO_VEC3),
      ...vectorParameterSpecs("axis", "Axis", UNIT_Y_VEC3),
      { key: "startAngle", label: "Start Angle", type: "number", defaultValue: 0, step: 5 },
      { key: "sweep", label: "Sweep", type: "number", defaultValue: 360, step: 5 },
      { key: "includeEnd", label: "Include End", type: "boolean", defaultValue: false },
    ],
    primaryOutputKey: "geometryList",
    compute: ({ inputs, parameters }) => {
      const geometry = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const geometryList = Array.isArray(parameters.geometryIds)
        ? parameters.geometryIds
        : [];
      return {
        geometry,
        geometryList,
        count: geometryList.length,
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
    type: "measurement",
    label: "Measurement",
    shortLabel: "MEAS",
    description: "Measure length, area, volume, or bounds.",
    category: "measurement",
    iconId: "ruler",
    inputs: [{ key: "geometry", label: "Geometry", type: "geometry", required: true }],
    outputs: [
      { key: "value", label: "Value", type: "number" },
      { key: "length", label: "Length", type: "number" },
      { key: "area", label: "Area", type: "number" },
      { key: "volume", label: "Volume", type: "number" },
      { key: "boundsMin", label: "Bounds Min", type: "vector" },
      { key: "boundsMax", label: "Bounds Max", type: "vector" },
    ],
    parameters: [
      {
        key: "property",
        label: "Property",
        type: "select",
        defaultValue: "length",
        options: [
          { value: "length", label: "Length" },
          { value: "area", label: "Area" },
          { value: "volume", label: "Volume" },
          { value: "boundsX", label: "Bounds X" },
          { value: "boundsY", label: "Bounds Y" },
          { value: "boundsZ", label: "Bounds Z" },
        ],
      },
    ],
    primaryOutputKey: "value",
    semanticOps: ["mesh.computeArea"] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return {
          value: 0,
          length: 0,
          area: 0,
          volume: 0,
          boundsMin: ZERO_VEC3,
          boundsMax: ZERO_VEC3,
        };
      }
      const vertices = collectGeometryVertices(geometry, context, Number.POSITIVE_INFINITY);
      const bounds = computeBounds(vertices);
      let length = 0;
      if (geometry.type === "polyline" && vertices.length >= 2) {
        for (let i = 1; i < vertices.length; i += 1) {
          length += distanceVec3(vertices[i - 1], vertices[i]);
        }
        if (geometry.closed && vertices.length > 2) {
          length += distanceVec3(vertices[vertices.length - 1], vertices[0]);
        }
      }
      const hasArea = typeof geometry.area_m2 === "number" && Number.isFinite(geometry.area_m2);
      const hasVolume =
        typeof geometry.volume_m3 === "number" && Number.isFinite(geometry.volume_m3);
      let area = hasArea ? (geometry.area_m2 as number) : 0;
      let volume = hasVolume ? (geometry.volume_m3 as number) : 0;
      if ("mesh" in geometry && geometry.mesh?.positions && geometry.mesh?.indices) {
        if (!hasArea) {
          area = computeMeshArea(geometry.mesh.positions, geometry.mesh.indices);
        }
        if (!hasVolume) {
          volume = computeMeshVolume(geometry.mesh.positions, geometry.mesh.indices);
        }
      }
      const property = String(parameters.property ?? "length");
      let value = length;
      if (property === "area") value = area;
      if (property === "volume") value = volume;
      if (property === "boundsX") value = bounds.max.x - bounds.min.x;
      if (property === "boundsY") value = bounds.max.y - bounds.min.y;
      if (property === "boundsZ") value = bounds.max.z - bounds.min.z;
      return {
        value,
        length,
        area,
        volume,
        boundsMin: bounds.min,
        boundsMax: bounds.max,
      };
    },
  },
  {
    type: "dimensions",
    label: "Dimensions",
    shortLabel: "DIM",
    description: "Measure bounding box dimensions for geometry.",
    category: "measurement",
    iconId: "ruler",
    inputs: [{ key: "geometry", label: "Geometry", type: "geometry", required: true }],
    outputs: [
      { key: "size", label: "Size", type: "vector" },
      { key: "width", label: "Width", type: "number" },
      { key: "height", label: "Height", type: "number" },
      { key: "depth", label: "Depth", type: "number" },
      { key: "diagonal", label: "Diagonal", type: "number" },
      { key: "boundsMin", label: "Bounds Min", type: "vector" },
      { key: "boundsMax", label: "Bounds Max", type: "vector" },
    ],
    parameters: [],
    primaryOutputKey: "size",
    compute: ({ inputs, context }) => {
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return {
          size: ZERO_VEC3,
          width: 0,
          height: 0,
          depth: 0,
          diagonal: 0,
          boundsMin: ZERO_VEC3,
          boundsMax: ZERO_VEC3,
        };
      }
      const vertices = collectGeometryVertices(geometry, context, MAX_LIST_ITEMS);
      const bounds = computeBounds(vertices);
      const width = bounds.max.x - bounds.min.x;
      const height = bounds.max.y - bounds.min.y;
      const depth = bounds.max.z - bounds.min.z;
      const diagonal = Math.hypot(width, height, depth);
      return {
        size: { x: width, y: height, z: depth },
        width,
        height,
        depth,
        diagonal,
        boundsMin: bounds.min,
        boundsMax: bounds.max,
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
    type: "proximity3d",
    label: "Proximity 3D",
    shortLabel: "PROX3",
    description: "Find nearby points in 3D and output connection pairs.",
    category: "analysis",
    iconId: "distance",
    inputs: [
      { key: "points", label: "Points", type: "any", required: true },
      {
        key: "radius",
        label: "Radius",
        type: "number",
        parameterKey: "radius",
        defaultValue: 1,
      },
      {
        key: "maxNeighbors",
        label: "Max Neighbors",
        type: "number",
        parameterKey: "maxNeighbors",
        defaultValue: 4,
      },
      {
        key: "uniquePairs",
        label: "Unique Pairs",
        type: "boolean",
        parameterKey: "uniquePairs",
        defaultValue: true,
      },
    ],
    outputs: [
      { key: "segments", label: "Segments", type: "any" },
      { key: "pairs", label: "Pairs", type: "any" },
      { key: "distances", label: "Distances", type: "any" },
      { key: "count", label: "Count", type: "number" },
    ],
    parameters: [
      { key: "radius", label: "Radius", type: "number", defaultValue: 1, min: 0, step: 0.1 },
      { key: "maxNeighbors", label: "Max Neighbors", type: "number", defaultValue: 4, min: 1, max: 32, step: 1 },
      { key: "uniquePairs", label: "Unique Pairs", type: "boolean", defaultValue: true },
    ],
    primaryOutputKey: "segments",
    compute: ({ inputs, parameters }) => {
      const points = collectVec3List(inputs.points);
      if (points.length < 2) {
        return { segments: [], pairs: [], distances: [], count: 0 };
      }
      const radius = toNumber(inputs.radius, readNumberParameter(parameters, "radius", 1));
      const maxNeighbors = clampInt(
        toNumber(inputs.maxNeighbors, readNumberParameter(parameters, "maxNeighbors", 4)),
        1,
        32,
        4
      );
      const uniquePairs = toBoolean(
        inputs.uniquePairs,
        readBooleanParameter(parameters, "uniquePairs", true)
      );
      const maxDistance = Number.isFinite(radius) && radius > 0 ? radius : Number.POSITIVE_INFINITY;
      const maxDistanceSq =
        maxDistance === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : maxDistance * maxDistance;
      const pairs: Array<[number, number]> = [];
      const segments: Array<[Vec3Value, Vec3Value]> = [];
      const distances: number[] = [];
      const pairSet = new Set<string>();
      for (let i = 0; i < points.length && pairs.length < MAX_LIST_ITEMS; i += 1) {
        const neighbors: Array<{ index: number; distSq: number }> = [];
        for (let j = 0; j < points.length; j += 1) {
          if (i === j) continue;
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const dz = points[i].z - points[j].z;
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq <= maxDistanceSq) {
            neighbors.push({ index: j, distSq });
          }
        }
        neighbors.sort((a, b) => a.distSq - b.distSq);
        for (let k = 0; k < neighbors.length && k < maxNeighbors && pairs.length < MAX_LIST_ITEMS; k += 1) {
          const neighbor = neighbors[k];
          const a = i;
          const b = neighbor.index;
          const key = uniquePairs ? `${Math.min(a, b)}-${Math.max(a, b)}` : `${a}-${b}`;
          if (uniquePairs && pairSet.has(key)) continue;
          pairSet.add(key);
          pairs.push([a, b]);
          segments.push([points[a], points[b]]);
          distances.push(Math.sqrt(neighbor.distSq));
        }
      }
      return {
        segments,
        pairs,
        distances,
        count: pairs.length,
      };
    },
  },
  {
    type: "proximity2d",
    label: "Proximity 2D",
    shortLabel: "PROX2",
    description: "Find nearby points in 2D (projected) and output connection pairs.",
    category: "analysis",
    iconId: "distance",
    inputs: [
      { key: "points", label: "Points", type: "any", required: true },
      {
        key: "radius",
        label: "Radius",
        type: "number",
        parameterKey: "radius",
        defaultValue: 1,
      },
      {
        key: "maxNeighbors",
        label: "Max Neighbors",
        type: "number",
        parameterKey: "maxNeighbors",
        defaultValue: 4,
      },
      {
        key: "plane",
        label: "Plane",
        type: "string",
        parameterKey: "plane",
        defaultValue: "xz",
      },
      {
        key: "uniquePairs",
        label: "Unique Pairs",
        type: "boolean",
        parameterKey: "uniquePairs",
        defaultValue: true,
      },
    ],
    outputs: [
      { key: "segments", label: "Segments", type: "any" },
      { key: "pairs", label: "Pairs", type: "any" },
      { key: "distances", label: "Distances", type: "any" },
      { key: "count", label: "Count", type: "number" },
    ],
    parameters: [
      { key: "radius", label: "Radius", type: "number", defaultValue: 1, min: 0, step: 0.1 },
      { key: "maxNeighbors", label: "Max Neighbors", type: "number", defaultValue: 4, min: 1, max: 32, step: 1 },
      {
        key: "plane",
        label: "Plane",
        type: "select",
        defaultValue: "xz",
        options: [
          { value: "xz", label: "XZ" },
          { value: "xy", label: "XY" },
          { value: "yz", label: "YZ" },
        ],
      },
      { key: "uniquePairs", label: "Unique Pairs", type: "boolean", defaultValue: true },
    ],
    primaryOutputKey: "segments",
    compute: ({ inputs, parameters }) => {
      const points = collectVec3List(inputs.points);
      if (points.length < 2) {
        return { segments: [], pairs: [], distances: [], count: 0 };
      }
      const radius = toNumber(inputs.radius, readNumberParameter(parameters, "radius", 1));
      const maxNeighbors = clampInt(
        toNumber(inputs.maxNeighbors, readNumberParameter(parameters, "maxNeighbors", 4)),
        1,
        32,
        4
      );
      const plane = String(inputs.plane ?? parameters.plane ?? "xz") as "xy" | "xz" | "yz";
      const uniquePairs = toBoolean(
        inputs.uniquePairs,
        readBooleanParameter(parameters, "uniquePairs", true)
      );
      const maxDistance = Number.isFinite(radius) && radius > 0 ? radius : Number.POSITIVE_INFINITY;
      const pairs: Array<[number, number]> = [];
      const segments: Array<[Vec3Value, Vec3Value]> = [];
      const distances: number[] = [];
      const pairSet = new Set<string>();
      for (let i = 0; i < points.length && pairs.length < MAX_LIST_ITEMS; i += 1) {
        const neighbors: Array<{ index: number; dist: number }> = [];
        for (let j = 0; j < points.length; j += 1) {
          if (i === j) continue;
          const dist = distance2D(points[i], points[j], plane);
          if (dist <= maxDistance) {
            neighbors.push({ index: j, dist });
          }
        }
        neighbors.sort((a, b) => a.dist - b.dist);
        for (let k = 0; k < neighbors.length && k < maxNeighbors && pairs.length < MAX_LIST_ITEMS; k += 1) {
          const neighbor = neighbors[k];
          const a = i;
          const b = neighbor.index;
          const key = uniquePairs ? `${Math.min(a, b)}-${Math.max(a, b)}` : `${a}-${b}`;
          if (uniquePairs && pairSet.has(key)) continue;
          pairSet.add(key);
          pairs.push([a, b]);
          segments.push([points[a], points[b]]);
          distances.push(neighbor.dist);
        }
      }
      return {
        segments,
        pairs,
        distances,
        count: pairs.length,
      };
    },
  },
  {
    type: "curveProximity",
    label: "Curve Proximity",
    shortLabel: "CPROX",
    description: "Find closest points on a curve for a list of points.",
    category: "analysis",
    iconId: "distance",
    inputs: [
      { key: "curve", label: "Curve", type: "geometry", required: true },
      { key: "points", label: "Points", type: "any", required: true },
      {
        key: "maxDistance",
        label: "Max Distance",
        type: "number",
        parameterKey: "maxDistance",
        defaultValue: 0,
      },
    ],
    outputs: [
      { key: "closestPoints", label: "Closest Points", type: "any" },
      { key: "distances", label: "Distances", type: "any" },
      { key: "segmentIndex", label: "Segment Index", type: "any" },
      { key: "count", label: "Count", type: "number" },
    ],
    parameters: [
      { key: "maxDistance", label: "Max Distance", type: "number", defaultValue: 0, min: 0, step: 0.1 },
    ],
    primaryOutputKey: "closestPoints",
    compute: ({ inputs, parameters, context }) => {
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      const points = collectVec3List(inputs.points);
      if (!geometry || points.length === 0) {
        return { closestPoints: [], distances: [], segmentIndex: [], count: 0 };
      }
      const curvePoints = collectGeometryVertices(geometry, context, MAX_LIST_ITEMS);
      if (curvePoints.length < 2) {
        return { closestPoints: [], distances: [], segmentIndex: [], count: 0 };
      }
      const closed = geometry.type === "polyline" ? geometry.closed : false;
      const maxDistance = toNumber(inputs.maxDistance, readNumberParameter(parameters, "maxDistance", 0));
      const limit = maxDistance > 0 ? maxDistance : Number.POSITIVE_INFINITY;
      const closestPoints: WorkflowValue[] = [];
      const distances: WorkflowValue[] = [];
      const segmentIndex: WorkflowValue[] = [];
      let matchCount = 0;
      points.forEach((point) => {
        let bestDistance = Number.POSITIVE_INFINITY;
        let bestPoint: Vec3Value | null = null;
        let bestIndex = -1;
        for (let i = 0; i + 1 < curvePoints.length; i += 1) {
          const a = curvePoints[i];
          const b = curvePoints[i + 1];
          const candidate = closestPointOnSegmentVec3(point, a, b);
          const distance = distanceVec3(point, candidate);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestPoint = candidate;
            bestIndex = i;
          }
        }
        if (closed && curvePoints.length > 2) {
          const a = curvePoints[curvePoints.length - 1];
          const b = curvePoints[0];
          const candidate = closestPointOnSegmentVec3(point, a, b);
          const distance = distanceVec3(point, candidate);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestPoint = candidate;
            bestIndex = curvePoints.length - 1;
          }
        }
        if (bestPoint && bestDistance <= limit) {
          closestPoints.push(bestPoint);
          distances.push(bestDistance);
          segmentIndex.push(bestIndex);
          matchCount += 1;
        } else {
          closestPoints.push(null);
          distances.push(null);
          segmentIndex.push(null);
        }
      });
      return {
        closestPoints,
        distances,
        segmentIndex,
        count: matchCount,
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
    parameters: [],
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
    parameters: [],
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
    parameters: [],
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
    parameters: [],
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
        defaultValue: 0.5,
      },
    ],
    outputs: [
      { key: "value", label: "Value", type: "number" },
      { key: "t", label: "T", type: "number" },
    ],
    parameters: [],
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
    semanticOps: [],
    shortLabel: "PT",
    description: "Create a point from coordinates.",
    category: "primitives",
    iconId: "pointGenerator",
    inputs: [
      { key: "x", label: "X", type: "number", parameterKey: "x", defaultValue: 0 },
      { key: "y", label: "Y", type: "number", parameterKey: "y", defaultValue: 0 },
      { key: "z", label: "Z", type: "number", parameterKey: "z", defaultValue: 0 },
    ],
    outputs: [
      {
        key: "geometry",
        label: "Point",
        type: "geometry",
        required: true,
      },
      { key: "position", label: "Position", type: "vector" },
      { key: "x", label: "X", type: "number" },
      { key: "y", label: "Y", type: "number" },
      { key: "z", label: "Z", type: "number" },
    ],
    parameters: [
      { key: "x", label: "X", type: "number", defaultValue: 0, step: 0.1 },
      { key: "y", label: "Y", type: "number", defaultValue: 0, step: 0.1 },
      { key: "z", label: "Z", type: "number", defaultValue: 0, step: 0.1 },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters }) => {
      const x = toNumber(inputs.x, readNumberParameter(parameters, "x", 0));
      const y = toNumber(inputs.y, readNumberParameter(parameters, "y", 0));
      const z = toNumber(inputs.z, readNumberParameter(parameters, "z", 0));
      return {
        geometry: typeof parameters.geometryId === "string" ? parameters.geometryId : null,
        position: { x, y, z },
        x,
        y,
        z,
      };
    },
  },
  {
    type: "pointCloud",
    label: "Point Cloud",
    shortLabel: "PCLD",
    description: "Create a point cloud from a list of points or geometry.",
    category: "primitives",
    iconId: "geometryVertices",
    inputs: [
      {
        key: "points",
        label: "Points",
        type: "any",
        required: false,
        allowMultiple: true,
        description: "Accepts Vec3 objects, [x,y,z] arrays, flat XYZ lists, or geometry ids.",
      },
    ],
    outputs: [
      { key: "geometry", label: "Geometry", type: "geometry" },
      { key: "geometryList", label: "Geometry List", type: "any" },
      { key: "points", label: "Points", type: "any" },
      { key: "count", label: "Count", type: "number" },
    ],
    parameters: [
      {
        key: "pointsText",
        label: "Points",
        type: "textarea",
        defaultValue: "",
      },
      {
        key: "maxPoints",
        label: "Max Points",
        type: "number",
        defaultValue: 256,
        min: 1,
        max: MAX_LIST_ITEMS,
        step: 1,
      },
    ],
    primaryOutputKey: "geometryList",
    compute: ({ inputs, parameters, context }) => {
      const maxPoints = clampInt(
        readNumberParameter(parameters, "maxPoints", 256),
        1,
        MAX_LIST_ITEMS,
        256
      );
      let resolved = collectPointList(inputs.points, context);
      const fallbackText =
        typeof parameters.pointsText === "string" ? parameters.pointsText : "";
      let fallbackPoints =
        resolved.length === 0 ? parsePointsText(fallbackText) : resolved;
      if (fallbackPoints.length === 0) {
        const numericList = toNumericList(inputs.points);
        if (numericList.length > 0) {
          if (numericList.length % 3 === 0) {
            for (let i = 0; i + 2 < numericList.length; i += 3) {
              fallbackPoints.push({
                x: numericList[i],
                y: numericList[i + 1],
                z: numericList[i + 2],
              });
            }
          } else if (numericList.length % 2 === 0) {
            for (let i = 0; i + 1 < numericList.length; i += 2) {
              fallbackPoints.push({
                x: numericList[i],
                y: numericList[i + 1],
                z: 0,
              });
            }
          } else {
            fallbackPoints = numericList.map((value) => ({ x: value, y: 0, z: 0 }));
          }
        }
      }
      const points = fallbackPoints.slice(0, maxPoints);
      const geometryList = Array.isArray(parameters.geometryIds)
        ? parameters.geometryIds
        : [];
      const geometry = geometryList[0] ?? null;
      return {
        geometry,
        geometryList,
        points,
        count: points.length,
      };
    },
  },
  {
    type: "line",
    label: "Line",
    semanticOps: [],
    shortLabel: "LN",
    description: "Create a straight line between two points.",
    category: "curves",
    iconId: "line",
    inputs: [
      { key: "start", label: "Start", type: "any" },
      { key: "end", label: "End", type: "any" },
    ],
    outputs: [
      {
        key: "geometry",
        label: "Line",
        type: "geometry",
        required: true,
      },
      { key: "points", label: "Points", type: "any" },
      { key: "start", label: "Start", type: "vector" },
      { key: "end", label: "End", type: "vector" },
      { key: "length", label: "Length", type: "number" },
    ],
    parameters: [
      {
        key: "pointsText",
        label: "Points",
        type: "textarea",
        defaultValue: "0 0 0  1 0 0",
      },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters, context }) => {
      const geometry = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const fallback = parsePointsText(String(parameters.pointsText ?? ""));
      const start = resolvePointInput(inputs.start, context) ?? fallback[0];
      const end = resolvePointInput(inputs.end, context) ?? fallback[1];
      if (!start || !end) {
        throw new Error("Line requires start and end points.");
      }
      return {
        geometry,
        points: [start, end],
        start,
        end,
        length: distanceVec3(start, end),
      };
    },
  },
  {
    type: "rectangle",
    label: "Rectangle",
    semanticOps: [],
    shortLabel: "RECT",
    description: "Create a rectangle on the construction plane.",
    category: "curves",
    iconId: "rectangle",
    inputs: [
      { key: "center", label: "Center", type: "vector" },
      { key: "width", label: "Width", type: "number", parameterKey: "width", defaultValue: 1 },
      { key: "height", label: "Height", type: "number", parameterKey: "height", defaultValue: 1 },
    ],
    outputs: [
      {
        key: "geometry",
        label: "Rectangle",
        type: "geometry",
        required: true,
      },
      { key: "center", label: "Center", type: "vector" },
      { key: "width", label: "Width", type: "number" },
      { key: "height", label: "Height", type: "number" },
    ],
    parameters: [
      ...vectorParameterSpecs("center", "Center", ZERO_VEC3),
      { key: "width", label: "Width", type: "number", defaultValue: 1, min: 0.01, step: 0.1 },
      { key: "height", label: "Height", type: "number", defaultValue: 1, min: 0.01, step: 0.1 },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters }) => {
      const geometry = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const center = resolveVectorInput(inputs, parameters, "center", "center", ZERO_VEC3);
      const width = toNumber(inputs.width, readNumberParameter(parameters, "width", 1));
      const height = toNumber(inputs.height, readNumberParameter(parameters, "height", 1));
      if (width <= 0 || height <= 0) {
        throw new Error("Rectangle width and height must be positive.");
      }
      return {
        geometry,
        center,
        width,
        height,
      };
    },
  },
  {
    type: "circle",
    label: "Circle",
    semanticOps: [],
    shortLabel: "CIRC",
    description: "Create a circular curve on the construction plane.",
    category: "nurbs",
    iconId: "circle",
    inputs: [
      { key: "center", label: "Center", type: "vector" },
      { key: "radius", label: "Radius", type: "number", parameterKey: "radius", defaultValue: 1 },
      { key: "segments", label: "Segments", type: "number", parameterKey: "segments", defaultValue: 48 },
      { key: "normal", label: "Normal", type: "vector" },
    ],
    outputs: [
      {
        key: "geometry",
        label: "Circle",
        type: "geometry",
        required: true,
      },
      { key: "center", label: "Center", type: "vector" },
      { key: "radius", label: "Radius", type: "number" },
      { key: "segments", label: "Segments", type: "number" },
      { key: "normal", label: "Normal", type: "vector" },
    ],
    parameters: [
      ...vectorParameterSpecs("center", "Center", ZERO_VEC3),
      { key: "radius", label: "Radius", type: "number", defaultValue: 1, min: 0.01, step: 0.1 },
      { key: "segments", label: "Segments", type: "number", defaultValue: 48, min: 12, max: 128, step: 2 },
      ...vectorParameterSpecs("normal", "Normal", UNIT_Y_VEC3),
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters }) => {
      const geometry = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const center = resolveVectorInput(inputs, parameters, "center", "center", ZERO_VEC3);
      const normal = resolveVectorInput(inputs, parameters, "normal", "normal", UNIT_Y_VEC3);
      const radius = toNumber(inputs.radius, readNumberParameter(parameters, "radius", 1));
      const segments = Math.round(
        toNumber(inputs.segments, readNumberParameter(parameters, "segments", 48))
      );
      if (radius <= 0) {
        throw new Error("Circle radius must be positive.");
      }
      return {
        geometry,
        center,
        radius,
        segments,
        normal,
      };
    },
  },
  {
    type: "arc",
    label: "Arc",
    shortLabel: "ARC",
    description: "Create a circular arc through three points.",
    category: "nurbs",
    iconId: "arc",
    inputs: [
      { key: "start", label: "Start", type: "any" },
      { key: "end", label: "End", type: "any" },
      { key: "through", label: "Through", type: "any" },
    ],
    outputs: [
      {
        key: "geometry",
        label: "Arc",
        type: "geometry",
        required: true,
      },
      { key: "start", label: "Start", type: "vector" },
      { key: "end", label: "End", type: "vector" },
      { key: "through", label: "Through", type: "vector" },
      { key: "points", label: "Points", type: "any" },
    ],
    parameters: [
      {
        key: "pointsText",
        label: "Points",
        type: "textarea",
        defaultValue: "0 0 0  1 0 0  0.5 0 0.6",
      },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters, context }) => {
      const geometry = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const fallback = parsePointsText(String(parameters.pointsText ?? ""));
      const start = resolvePointInput(inputs.start, context) ?? fallback[0];
      const end = resolvePointInput(inputs.end, context) ?? fallback[1];
      const through = resolvePointInput(inputs.through, context) ?? fallback[2];
      if (!start || !end || !through) {
        throw new Error("Arc requires start, end, and through points.");
      }
      return {
        geometry,
        start,
        end,
        through,
        points: [start, through, end],
      };
    },
  },
  {
    type: "curve",
    label: "Curve",
    semanticOps: [],
    shortLabel: "CRV",
    description: "Create a smooth curve through points.",
    category: "nurbs",
    iconId: "interpolate",
    inputs: [
      { key: "points", label: "Points", type: "any", allowMultiple: true },
    ],
    outputs: [
      {
        key: "geometry",
        label: "Curve",
        type: "geometry",
        required: true,
      },
      { key: "points", label: "Points", type: "any" },
      { key: "degree", label: "Degree", type: "number" },
      { key: "resolution", label: "Resolution", type: "number" },
      { key: "closed", label: "Closed", type: "boolean" },
    ],
    parameters: [
      {
        key: "pointsText",
        label: "Points",
        type: "textarea",
        defaultValue: "0 0 0  1 0 0  1 0 1  0 0 1",
      },
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
    compute: ({ inputs, parameters, context }) => {
      const geometry = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const fallback = parsePointsText(String(parameters.pointsText ?? ""));
      const inputPoints = collectPointList(inputs.points, context);
      const points = inputPoints.length >= 2 ? inputPoints : fallback;
      if (points.length < 2) {
        throw new Error("Curve requires at least two points.");
      }
      const degreeRaw = readNumberParameter(parameters, "degree", 3);
      const degree = Math.min(3, Math.max(1, Math.round(degreeRaw))) as 1 | 2 | 3;
      const resolution = Math.max(
        16,
        Math.round(readNumberParameter(parameters, "resolution", 64))
      );
      const closed = readBooleanParameter(parameters, "closed", false);
      return {
        geometry,
        points,
        degree,
        resolution,
        closed,
      };
    },
  },
  {
    type: "polyline",
    label: "Polyline",
    shortLabel: "PL",
    description: "Connect points into a polyline.",
    category: "curves",
    iconId: "polyline",
    inputs: [
      { key: "points", label: "Points", type: "any", allowMultiple: true },
      {
        key: "closed",
        label: "Closed",
        type: "boolean",
        parameterKey: "closed",
        defaultValue: false,
      },
    ],
    outputs: [
      {
        key: "geometry",
        label: "Polyline",
        type: "geometry",
        required: true,
      },
      { key: "points", label: "Points", type: "any" },
      { key: "closed", label: "Closed", type: "boolean" },
    ],
    parameters: [
      {
        key: "pointsText",
        label: "Points",
        type: "textarea",
        defaultValue: "0 0 0  1 0 0  1 0 1",
      },
      { key: "closed", label: "Closed", type: "boolean", defaultValue: false },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters, context }) => {
      const geometry = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const fallback = parsePointsText(String(parameters.pointsText ?? ""));
      const inputPoints = collectPointList(inputs.points, context);
      const points = inputPoints.length >= 2 ? inputPoints : fallback;
      if (points.length < 2) {
        throw new Error("Polyline requires at least two points.");
      }
      const closed = toBoolean(inputs.closed, readBooleanParameter(parameters, "closed", false));
      return {
        geometry,
        points,
        closed,
      };
    },
  },
  {
    type: "surface",
    label: "Surface",
    semanticOps: [],
    shortLabel: "SRF",
    description: "Generate a surface from boundary curves.",
    category: "brep",
    iconId: "surface",
    inputs: [
      { key: "points", label: "Boundary", type: "any", allowMultiple: true },
    ],
    outputs: [
      {
        key: "geometry",
        label: "Surface",
        type: "geometry",
        required: true,
      },
      { key: "points", label: "Points", type: "any" },
    ],
    parameters: [
      {
        key: "pointsText",
        label: "Points",
        type: "textarea",
        defaultValue: "0 0 0  1 0 0  1 0 1  0 0 1",
      },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters, context }) => {
      const geometry = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const fallback = parsePointsText(String(parameters.pointsText ?? ""));
      const inputPoints = collectPointList(inputs.points, context);
      let points = inputPoints.length >= 3 ? inputPoints : fallback;
      if (points.length < 3 && geometry) {
        const existing = context.geometryById.get(geometry);
        if (existing?.type === "surface" && existing.loops.length > 0) {
          const loop = existing.loops[0] ?? [];
          const loopPoints: Vec3Value[] = [];
          loop.forEach((vertexId) => {
            const vertex = context.vertexById.get(vertexId);
            if (vertex) {
              loopPoints.push(vertex.position);
            }
          });
          if (loopPoints.length >= 3) {
            points = loopPoints;
          }
        } else if (existing) {
          const geometryPoints = collectGeometryVertices(existing, context, MAX_LIST_ITEMS);
          if (geometryPoints.length >= 3) {
            points = geometryPoints;
          }
        }
      }
      return {
        geometry,
        points: points.length >= 3 ? points : [],
      };
    },
  },
  {
    type: "loft",
    label: "Loft",
    shortLabel: "LOFT",
    description: "Create a surface through a series of section curves.",
    category: "brep",
    iconId: "loft",
    inputs: [
      {
        key: "sections",
        label: "Sections",
        type: "geometry",
        required: true,
        allowMultiple: true,
      },
    ],
    outputs: [
      { key: "geometry", label: "Loft", type: "geometry", required: true },
      { key: "mesh", label: "Mesh", type: "any" },
      { key: "sectionCount", label: "Sections", type: "number" },
    ],
    parameters: [
      { key: "degree", label: "Degree", type: "number", defaultValue: 3, min: 1, max: 3, step: 1 },
      { key: "closed", label: "Closed", type: "boolean", defaultValue: false },
      { key: "sectionClosed", label: "Section Closed", type: "boolean", defaultValue: false },
      { key: "samples", label: "Samples", type: "number", defaultValue: 24, min: 8, max: 128, step: 1 },
    ],
    primaryOutputKey: "geometry",
    semanticOps: ["mesh.generateLoft"] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const sectionGeometries = resolveGeometryList(inputs, context, "sections");
      const sectionIds = sectionGeometries.map((geometry) => geometry.id);
      const sectionPoints = sectionGeometries
        .map((geometry) => collectGeometryVertices(geometry, context, MAX_LIST_ITEMS))
        .filter((points) => points.length >= 2);
      if (sectionPoints.length < 2) {
        return {
          geometry: geometryId,
          mesh: EMPTY_MESH,
          sectionCount: 0,
          sectionIds,
        };
      }
      const degreeRaw = readNumberParameter(parameters, "degree", 3);
      const degree = Math.min(3, Math.max(1, Math.round(degreeRaw))) as 1 | 2 | 3;
      const closed = readBooleanParameter(parameters, "closed", false);
      const sectionClosed = readBooleanParameter(parameters, "sectionClosed", false);
      const samples = Math.max(8, Math.round(readNumberParameter(parameters, "samples", 24)));
      const mesh = generateLoftMesh(sectionPoints, {
        degree,
        sectionClosed,
        closed,
        samples,
      });
      return {
        geometry: geometryId,
        mesh,
        sectionCount: sectionPoints.length,
        sectionIds,
        degree,
        closed,
        sectionClosed,
        samples,
      };
    },
  },
  {
    type: "extrude",
    label: "Extrude",
    shortLabel: "EXT",
    description: "Extrude a profile curve along a direction.",
    category: "brep",
    iconId: "extrude",
    inputs: [
      { key: "geometry", label: "Profile", type: "geometry", required: true },
      {
        key: "distance",
        label: "Distance",
        type: "number",
        parameterKey: "distance",
        defaultValue: 1,
      },
      { key: "direction", label: "Direction", type: "vector", required: false },
      {
        key: "capped",
        label: "Capped",
        type: "boolean",
        parameterKey: "capped",
        defaultValue: true,
      },
    ],
    outputs: [
      { key: "geometry", label: "Extrude", type: "geometry", required: true },
      { key: "mesh", label: "Mesh", type: "any" },
      { key: "distance", label: "Distance", type: "number" },
      { key: "direction", label: "Direction", type: "vector" },
    ],
    parameters: [
      { key: "distance", label: "Distance", type: "number", defaultValue: 1, min: 0, step: 0.1 },
      ...vectorParameterSpecs("direction", "Direction", UNIT_Y_VEC3),
      { key: "capped", label: "Capped", type: "boolean", defaultValue: true },
    ],
    primaryOutputKey: "geometry",
    semanticOps: ["mesh.generateExtrude"] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      const profileIds = geometry ? [geometry.id] : [];
      if (!geometry) {
        return {
          geometry: geometryId,
          mesh: EMPTY_MESH,
          distance: 0,
          direction: ZERO_VEC3,
          profileIds,
        };
      }
      const profilePoints = collectGeometryVertices(geometry, context, MAX_LIST_ITEMS);
      if (profilePoints.length < 2) {
        return {
          geometry: geometryId,
          mesh: EMPTY_MESH,
          distance: 0,
          direction: ZERO_VEC3,
          profileIds,
        };
      }
      const distance = toNumber(inputs.distance, readNumberParameter(parameters, "distance", 1));
      const directionInput =
        tryVec3Value(inputs.direction) ??
        readVec3Parameters(parameters, "direction", UNIT_Y_VEC3);
      const direction = normalizeVec3Safe(directionInput, UNIT_Y_VEC3);
      const capped = toBoolean(inputs.capped, readBooleanParameter(parameters, "capped", true));
      const closed = geometry.type === "polyline" ? geometry.closed : true;
      const mesh = generateExtrudeMesh(
        [{ points: profilePoints, closed }],
        { direction, distance, capped }
      );
      return {
        geometry: geometryId,
        mesh,
        distance,
        direction,
        capped,
        profileIds,
      };
    },
  },
  {
    type: "pipeSweep",
    label: "Pipe",
    shortLabel: "PIPE",
    description: "Generate pipe meshes from segments, paths, or curve geometry.",
    category: "brep",
    iconId: "extrude",
    inputs: [
      { key: "segments", label: "Segments", type: "any", required: false },
      { key: "path", label: "Path", type: "any", required: false },
      { key: "geometry", label: "Geometry", type: "geometry", required: false, allowMultiple: true },
      {
        key: "radius",
        label: "Radius",
        type: "number",
        parameterKey: "radius",
        defaultValue: 0.1,
      },
      {
        key: "innerRadius",
        label: "Inner Radius",
        type: "number",
        parameterKey: "innerRadius",
        defaultValue: 0,
      },
      {
        key: "radialSegments",
        label: "Radial Segments",
        type: "number",
        parameterKey: "radialSegments",
        defaultValue: 16,
      },
      {
        key: "closed",
        label: "Closed Path",
        type: "boolean",
        parameterKey: "closed",
        defaultValue: false,
      },
      {
        key: "jointRadius",
        label: "Joint Radius",
        type: "number",
        parameterKey: "jointRadius",
        defaultValue: 0,
      },
    ],
    outputs: [
      { key: "geometry", label: "Pipe", type: "geometry", required: true },
      { key: "mesh", label: "Mesh", type: "any" },
      { key: "segmentCount", label: "Segments", type: "number" },
      { key: "jointCount", label: "Joints", type: "number" },
      { key: "joints", label: "Joint Points", type: "any" },
    ],
    parameters: [
      { key: "radius", label: "Radius", type: "number", defaultValue: 0.1, min: 0, step: 0.05 },
      { key: "innerRadius", label: "Inner Radius", type: "number", defaultValue: 0, min: 0, step: 0.05 },
      { key: "radialSegments", label: "Radial Segments", type: "number", defaultValue: 16, min: 6, max: 64, step: 2 },
      { key: "closed", label: "Closed Path", type: "boolean", defaultValue: false },
      { key: "jointRadius", label: "Joint Radius", type: "number", defaultValue: 0, min: 0, step: 0.05 },
    ],
    primaryOutputKey: "geometry",
    semanticOps: [
      "mesh.generateCylinder",
      "mesh.generatePipe",
      "mesh.generateSphere",
    ] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const radius = Math.max(
        1e-4,
        toNumber(inputs.radius, readNumberParameter(parameters, "radius", 0.1))
      );
      const innerRadiusInput = toNumber(
        inputs.innerRadius,
        readNumberParameter(parameters, "innerRadius", 0)
      );
      const innerRadius = Math.max(0, Math.min(innerRadiusInput, radius * 0.95));
      const radialSegments = clampInt(
        toNumber(inputs.radialSegments, readNumberParameter(parameters, "radialSegments", 16)),
        6,
        64,
        16
      );
      const closePath = toBoolean(
        inputs.closed,
        readBooleanParameter(parameters, "closed", false)
      );
      const jointRadius = Math.max(
        0,
        toNumber(inputs.jointRadius, readNumberParameter(parameters, "jointRadius", 0))
      );

      const segments: Array<[Vec3Value, Vec3Value]> = [];
      const addSegmentsFromPath = (path: Vec3Value[], closed: boolean) => {
        for (let i = 0; i + 1 < path.length && segments.length < MAX_LIST_ITEMS; i += 1) {
          segments.push([path[i], path[i + 1]]);
        }
        if (closed && path.length > 2 && segments.length < MAX_LIST_ITEMS) {
          segments.push([path[path.length - 1], path[0]]);
        }
      };

      const inputSegments = collectSegmentList(inputs.segments);
      segments.push(...inputSegments.slice(0, MAX_LIST_ITEMS - segments.length));

      const paths = collectVec3Paths(inputs.path);
      paths.forEach((path) => {
        if (segments.length >= MAX_LIST_ITEMS) return;
        addSegmentsFromPath(path, closePath);
      });

      const geometryList = resolveGeometryList(inputs, context, "geometry");
      const sourceGeometryIds = geometryList.map((geometry) => geometry.id);
      geometryList.forEach((geometry) => {
        if (segments.length >= MAX_LIST_ITEMS) return;
        const points = collectGeometryVertices(geometry, context, MAX_LIST_ITEMS);
        if (points.length < 2) return;
        const closed = geometry.type === "polyline" ? geometry.closed : false;
        addSegmentsFromPath(points, closed);
      });

      if (segments.length === 0) {
        return {
          geometry: geometryId,
          mesh: EMPTY_MESH,
          segmentCount: 0,
          jointCount: 0,
          joints: [],
          sourceGeometryIds,
        };
      }

      const joints: Vec3Value[] = [];
      const jointSet = new Set<string>();
      const addJoint = (point: Vec3Value) => {
        if (joints.length >= MAX_LIST_ITEMS) return;
        const key = `${Math.round(point.x * 10000)}:${Math.round(point.y * 10000)}:${Math.round(point.z * 10000)}`;
        if (jointSet.has(key)) return;
        jointSet.add(key);
        joints.push(point);
      };

      let merged: RenderMesh | null = null;
      let segmentCount = 0;
      segments.forEach(([start, end]) => {
        if (segmentCount >= MAX_LIST_ITEMS) return;
        const length = distanceVec3(start, end);
        if (!Number.isFinite(length) || length <= EPSILON) return;
        const direction = normalizeVec3Safe(subtractVec3(end, start), UNIT_Y_VEC3);
        const baseMesh =
          innerRadius > 1e-4
            ? generatePipeMesh(radius, innerRadius, length, radialSegments)
            : generateCylinderMesh(radius, length, radialSegments);
        const rotation = quaternionFromTo(UNIT_Y_VEC3, direction);
        const transformed = transformMeshWithQuaternion(
          baseMesh,
          rotation,
          midpointVec3(start, end)
        );
        merged = merged ? mergeMeshes(merged, transformed) : transformed;
        addJoint(start);
        addJoint(end);
        segmentCount += 1;
      });

      if (jointRadius > 1e-4 && joints.length > 0) {
        const jointSphere = generateSphereMesh(jointRadius, radialSegments);
        joints.forEach((joint) => {
          const sphereMesh = translateMesh(jointSphere, joint);
          merged = merged ? mergeMeshes(merged, sphereMesh) : sphereMesh;
        });
      }

      return {
        geometry: geometryId,
        mesh: merged ?? EMPTY_MESH,
        segmentCount,
        jointCount: joints.length,
        joints,
        sourceGeometryIds,
      };
    },
  },
  {
    type: "pipeMerge",
    label: "Pipe Merge",
    shortLabel: "PMRG",
    description: "Merge multiple pipe meshes, with optional joint spheres.",
    category: "mesh",
    iconId: "boolean",
    inputs: [
      { key: "geometry", label: "Pipes", type: "geometry", required: true, allowMultiple: true },
      { key: "joints", label: "Joints", type: "any", required: false },
      {
        key: "jointRadius",
        label: "Joint Radius",
        type: "number",
        parameterKey: "jointRadius",
        defaultValue: 0,
      },
      {
        key: "radialSegments",
        label: "Radial Segments",
        type: "number",
        parameterKey: "radialSegments",
        defaultValue: 16,
      },
    ],
    outputs: [
      { key: "geometry", label: "Merged", type: "geometry", required: true },
      { key: "mesh", label: "Mesh", type: "any" },
      { key: "pipeCount", label: "Pipe Count", type: "number" },
      { key: "jointCount", label: "Joint Count", type: "number" },
    ],
    parameters: [
      { key: "jointRadius", label: "Joint Radius", type: "number", defaultValue: 0, min: 0, step: 0.05 },
      { key: "radialSegments", label: "Radial Segments", type: "number", defaultValue: 16, min: 6, max: 64, step: 2 },
    ],
    primaryOutputKey: "geometry",
    semanticOps: ["mesh.generateSphere"] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const geometryList = resolveGeometryList(inputs, context, "geometry");
      const sourceGeometryIds = geometryList.map((geometry) => geometry.id);
      const jointRadius = Math.max(
        0,
        toNumber(inputs.jointRadius, readNumberParameter(parameters, "jointRadius", 0))
      );
      const radialSegments = clampInt(
        toNumber(inputs.radialSegments, readNumberParameter(parameters, "radialSegments", 16)),
        6,
        64,
        16
      );
      const jointsRaw = collectVec3List(inputs.joints);
      const joints: Vec3Value[] = [];
      const jointSet = new Set<string>();
      jointsRaw.forEach((joint) => {
        const key = `${Math.round(joint.x * 10000)}:${Math.round(joint.y * 10000)}:${Math.round(joint.z * 10000)}`;
        if (jointSet.has(key)) return;
        jointSet.add(key);
        joints.push(joint);
      });
      let merged: RenderMesh | null = null;
      geometryList.forEach((geometry) => {
        if (!("mesh" in geometry)) return;
        const mesh = geometry.mesh;
        if (!mesh?.positions?.length) return;
        merged = merged ? mergeMeshes(merged, mesh) : mesh;
      });
      if (jointRadius > 1e-4 && joints.length > 0) {
        const jointSphere = generateSphereMesh(jointRadius, radialSegments);
        joints.forEach((joint) => {
          const sphereMesh = translateMesh(jointSphere, joint);
          merged = merged ? mergeMeshes(merged, sphereMesh) : sphereMesh;
        });
      }
      return {
        geometry: geometryId,
        mesh: merged ?? EMPTY_MESH,
        pipeCount: geometryList.length,
        jointCount: joints.length,
        sourceGeometryIds,
      };
    },
  },
  {
    type: "boolean",
    label: "Boolean",
    shortLabel: "BOOL",
    description: "Combine two solids with union, difference, or intersection.",
    category: "brep",
    iconId: "boolean",
    semanticOps: ["mesh.generateBox", "mesh.computeVertexNormals"],
    inputs: [
      { key: "geometryA", label: "A", type: "geometry", required: true },
      { key: "geometryB", label: "B", type: "geometry", required: true },
      {
        key: "operation",
        label: "Operation",
        type: "string",
        parameterKey: "operation",
        defaultValue: "union",
      },
    ],
    outputs: [
      { key: "geometry", label: "Result", type: "geometry", required: true },
      { key: "mesh", label: "Mesh", type: "any" },
      { key: "operation", label: "Operation", type: "string" },
    ],
    parameters: [
      {
        key: "operation",
        label: "Operation",
        type: "select",
        defaultValue: "union",
        options: [
          { value: "union", label: "Union" },
          { value: "difference", label: "Difference" },
          { value: "intersection", label: "Intersection" },
        ],
      },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const geometryAId = typeof inputs.geometryA === "string" ? inputs.geometryA : null;
      const geometryBId = typeof inputs.geometryB === "string" ? inputs.geometryB : null;
      const geometryA = geometryAId ? context.geometryById.get(geometryAId) : null;
      const geometryB = geometryBId ? context.geometryById.get(geometryBId) : null;
      const operation = String(inputs.operation ?? parameters.operation ?? "union");

      const meshA = geometryA && "mesh" in geometryA ? geometryA.mesh : null;
      const meshB = geometryB && "mesh" in geometryB ? geometryB.mesh : null;
      if (!meshA || !meshB) {
        return {
          geometry: geometryId,
          mesh: { positions: [], normals: [], uvs: [], indices: [] },
          operation,
        };
      }

      if (operation === "intersection") {
        const pointsA = collectGeometryVertices(geometryA, context, Number.POSITIVE_INFINITY);
        const pointsB = collectGeometryVertices(geometryB, context, Number.POSITIVE_INFINITY);
        const boundsA = computeBounds(pointsA);
        const boundsB = computeBounds(pointsB);
        const min = {
          x: Math.max(boundsA.min.x, boundsB.min.x),
          y: Math.max(boundsA.min.y, boundsB.min.y),
          z: Math.max(boundsA.min.z, boundsB.min.z),
        };
        const max = {
          x: Math.min(boundsA.max.x, boundsB.max.x),
          y: Math.min(boundsA.max.y, boundsB.max.y),
          z: Math.min(boundsA.max.z, boundsB.max.z),
        };
        if (min.x >= max.x || min.y >= max.y || min.z >= max.z) {
          return {
            geometry: geometryId,
            mesh: { positions: [], normals: [], uvs: [], indices: [] },
            operation,
          };
        }
        const size = { width: max.x - min.x, height: max.y - min.y, depth: max.z - min.z };
        const mesh = generateBoxMesh(size);
        const centerOffset = {
          x: min.x + size.width / 2,
          y: min.y + size.height / 2,
          z: min.z + size.depth / 2,
        };
        const positions = mesh.positions.slice();
        for (let i = 0; i < positions.length; i += 3) {
          positions[i] += centerOffset.x;
          positions[i + 1] += centerOffset.y;
          positions[i + 2] += centerOffset.z;
        }
        return {
          geometry: geometryId,
          mesh: { ...mesh, positions, normals: computeVertexNormals(positions, mesh.indices) },
          operation,
        };
      }

      if (operation === "difference") {
        return {
          geometry: geometryId,
          mesh: meshA,
          operation,
        };
      }

      const mesh = mergeMeshes(meshA, meshB);
      return {
        geometry: geometryId,
        mesh,
        operation,
      };
    },
  },
  {
    type: "offset",
    label: "Offset",
    shortLabel: "OFF",
    description: "Offset a curve by a given distance.",
    category: "modifiers",
    iconId: "offset",
    inputs: [
      { key: "geometry", label: "Geometry", type: "geometry", required: true },
      {
        key: "distance",
        label: "Distance",
        type: "number",
        parameterKey: "distance",
        defaultValue: 1,
      },
    ],
    outputs: [
      { key: "geometry", label: "Offset", type: "geometry", required: true },
      { key: "points", label: "Points", type: "any" },
      { key: "distance", label: "Distance", type: "number" },
    ],
    parameters: [
      { key: "distance", label: "Distance", type: "number", defaultValue: 1, step: 0.1 },
      { key: "samples", label: "Samples", type: "number", defaultValue: 32, min: 8, max: 128, step: 1 },
    ],
    primaryOutputKey: "geometry",
    semanticOps: [
      "boolean.offsetPolyline2D",
      "curve.resampleByArcLength",
      "math.computeBestFitPlane",
      "math.projectPointToPlane",
      "math.unprojectPointFromPlane",
    ] as const,
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      if (!geometry) {
        return {
          geometry: geometryId,
          points: [],
          distance: 0,
        };
      }
      const basePoints = collectGeometryVertices(geometry, context, MAX_LIST_ITEMS);
      if (basePoints.length < 2) {
        return {
          geometry: geometryId,
          points: [],
          distance: 0,
        };
      }
      const distance = toNumber(inputs.distance, readNumberParameter(parameters, "distance", 1));
      const samples = Math.max(8, Math.round(readNumberParameter(parameters, "samples", 32)));
      const closed = geometry.type === "polyline" ? geometry.closed : false;
      const plane = computeBestFitPlane(basePoints);
      const resampled = basePoints.length === samples ? basePoints : resampleByArcLength(basePoints, samples, closed);
      const projected = resampled.map((point) => projectPointToPlane(point, plane));
      const offset2d = offsetPolyline2D(
        projected.map((entry) => ({ x: entry.u, y: entry.v, z: 0 })),
        distance,
        closed
      );
      const points = offset2d.map((point) =>
        unprojectPointFromPlane({ u: point.x, v: point.y }, plane)
      );
      return {
        geometry: geometryId,
        points,
        distance,
      };
    },
  },
  {
    type: "fillet",
    label: "Fillet",
    shortLabel: "FIL",
    description: "Round corners on curves or edges.",
    category: "modifiers",
    iconId: "arc",
    inputs: [
      { key: "geometry", label: "Geometry", type: "geometry", required: true },
      {
        key: "radius",
        label: "Radius",
        type: "number",
        parameterKey: "radius",
        defaultValue: 0.5,
      },
      {
        key: "segments",
        label: "Segments",
        type: "number",
        parameterKey: "segments",
        defaultValue: 6,
      },
    ],
    outputs: [
      { key: "geometry", label: "Geometry", type: "geometry" },
      { key: "radius", label: "Radius", type: "number" },
      { key: "segments", label: "Segments", type: "number" },
    ],
    parameters: [
      { key: "radius", label: "Radius", type: "number", defaultValue: 0.5, step: 0.1 },
      { key: "segments", label: "Segments", type: "number", defaultValue: 6, min: 1, max: 32, step: 1 },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters }) => {
      const geometry = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const radius = toNumber(inputs.radius, readNumberParameter(parameters, "radius", 0.5));
      const segments = Math.max(
        1,
        Math.round(toNumber(inputs.segments, readNumberParameter(parameters, "segments", 6)))
      );
      return { geometry, radius, segments };
    },
  },
  {
    type: "filletEdges",
    label: "Fillet Edges",
    shortLabel: "EDGE",
    description: "Round selected mesh edges by a given radius.",
    category: "mesh",
    iconId: "arc",
    inputs: [
      { key: "geometry", label: "Geometry", type: "geometry", required: true },
      { key: "edges", label: "Edges", type: "any" },
      {
        key: "radius",
        label: "Radius",
        type: "number",
        parameterKey: "radius",
        defaultValue: 0.5,
      },
      {
        key: "segments",
        label: "Segments",
        type: "number",
        parameterKey: "segments",
        defaultValue: 6,
      },
    ],
    outputs: [
      { key: "geometry", label: "Geometry", type: "geometry" },
      { key: "edges", label: "Edges", type: "any" },
      { key: "edgeCount", label: "Edge Count", type: "number" },
      { key: "radius", label: "Radius", type: "number" },
      { key: "segments", label: "Segments", type: "number" },
    ],
    parameters: [
      { key: "radius", label: "Radius", type: "number", defaultValue: 0.5, step: 0.1 },
      { key: "segments", label: "Segments", type: "number", defaultValue: 6, min: 1, max: 32, step: 1 },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters }) => {
      const geometry = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const edges = toList(inputs.edges);
      const radius = toNumber(inputs.radius, readNumberParameter(parameters, "radius", 0.5));
      const segments = Math.max(
        1,
        Math.round(toNumber(inputs.segments, readNumberParameter(parameters, "segments", 6)))
      );
      return { geometry, edges, edgeCount: edges.length, radius, segments };
    },
  },
  {
    type: "offsetSurface",
    label: "Offset Surface",
    shortLabel: "OSRF",
    description: "Offset a surface along its normals by a distance.",
    category: "brep",
    iconId: "surface",
    inputs: [
      { key: "geometry", label: "Surface", type: "geometry", required: true },
      {
        key: "distance",
        label: "Distance",
        type: "number",
        parameterKey: "distance",
        defaultValue: 0.5,
      },
    ],
    outputs: [
      { key: "geometry", label: "Surface", type: "geometry" },
      { key: "distance", label: "Distance", type: "number" },
    ],
    parameters: [
      { key: "distance", label: "Distance", type: "number", defaultValue: 0.5, step: 0.1 },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters }) => {
      const geometry = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const distance = toNumber(inputs.distance, readNumberParameter(parameters, "distance", 0.5));
      return { geometry, distance };
    },
  },
  {
    type: "thickenMesh",
    label: "Thicken Mesh",
    shortLabel: "THK",
    description: "Add thickness to a mesh by offsetting inward/outward.",
    category: "mesh",
    iconId: "offset",
    inputs: [
      { key: "geometry", label: "Mesh", type: "geometry", required: true },
      {
        key: "thickness",
        label: "Thickness",
        type: "number",
        parameterKey: "thickness",
        defaultValue: 1,
      },
      {
        key: "sides",
        label: "Sides",
        type: "string",
        parameterKey: "sides",
        defaultValue: "both",
      },
    ],
    outputs: [
      { key: "geometry", label: "Mesh", type: "geometry" },
      { key: "thickness", label: "Thickness", type: "number" },
      { key: "sides", label: "Sides", type: "string" },
    ],
    parameters: [
      { key: "thickness", label: "Thickness", type: "number", defaultValue: 1, step: 0.1 },
      {
        key: "sides",
        label: "Sides",
        type: "select",
        defaultValue: "both",
        options: [
          { value: "both", label: "Both" },
          { value: "outward", label: "Outward" },
          { value: "inward", label: "Inward" },
        ],
      },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters }) => {
      const geometry = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const thickness = toNumber(
        inputs.thickness,
        readNumberParameter(parameters, "thickness", 1)
      );
      const sides = String(inputs.sides ?? parameters.sides ?? "both");
      return { geometry, thickness, sides };
    },
  },
  {
    type: "plasticwrap",
    label: "Plasticwrap",
    shortLabel: "WRAP",
    description: "Shrinkwrap geometry onto a target with a projection distance.",
    category: "modifiers",
    iconId: "surface",
    inputs: [
      { key: "geometry", label: "Geometry", type: "geometry", required: true },
      { key: "target", label: "Target", type: "geometry", required: true },
      {
        key: "distance",
        label: "Distance",
        type: "number",
        parameterKey: "distance",
        defaultValue: 0.25,
      },
      {
        key: "smooth",
        label: "Smooth",
        type: "number",
        parameterKey: "smooth",
        defaultValue: 0.5,
      },
    ],
    outputs: [
      { key: "geometry", label: "Geometry", type: "geometry" },
      { key: "target", label: "Target", type: "geometry" },
      { key: "distance", label: "Distance", type: "number" },
      { key: "smooth", label: "Smooth", type: "number" },
    ],
    parameters: [
      { key: "distance", label: "Distance", type: "number", defaultValue: 0.25, step: 0.05 },
      { key: "smooth", label: "Smooth", type: "number", defaultValue: 0.5, min: 0, max: 1, step: 0.05 },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters }) => {
      const geometry = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const target = typeof inputs.target === "string" ? inputs.target : null;
      const distance = toNumber(
        inputs.distance,
        readNumberParameter(parameters, "distance", 0.25)
      );
      const smooth = clampNumber(
        toNumber(inputs.smooth, readNumberParameter(parameters, "smooth", 0.5)),
        0,
        1
      );
      return { geometry, target, distance, smooth };
    },
  },
  {
    type: "solid",
    label: "Solid",
    shortLabel: "CAP",
    description: "Cap a surface or open mesh into a closed solid.",
    category: "mesh",
    iconId: "extrude",
    inputs: [
      { key: "geometry", label: "Geometry", type: "geometry", required: true },
      {
        key: "capMode",
        label: "Cap Mode",
        type: "string",
        parameterKey: "capMode",
        defaultValue: "auto",
      },
      {
        key: "tolerance",
        label: "Tolerance",
        type: "number",
        parameterKey: "tolerance",
        defaultValue: 0.01,
      },
    ],
    outputs: [
      { key: "geometry", label: "Geometry", type: "geometry" },
      { key: "capMode", label: "Cap Mode", type: "string" },
      { key: "tolerance", label: "Tolerance", type: "number" },
    ],
    parameters: [
      {
        key: "capMode",
        label: "Cap Mode",
        type: "select",
        defaultValue: "auto",
        options: [
          { value: "auto", label: "Auto" },
          { value: "planar", label: "Planar" },
          { value: "triangulate", label: "Triangulate" },
        ],
      },
      { key: "tolerance", label: "Tolerance", type: "number", defaultValue: 0.01, step: 0.001 },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters }) => {
      const geometry = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const capMode = String(inputs.capMode ?? parameters.capMode ?? "auto");
      const tolerance = toNumber(
        inputs.tolerance,
        readNumberParameter(parameters, "tolerance", 0.01)
      );
      return { geometry, capMode, tolerance };
    },
  },
  {
    type: "primitive",
    label: "Primitive",
    shortLabel: "PRIM",
    description: "Create a parametric primitive shape.",
    category: "primitives",
    iconId: "primitive:generic",
    inputs: [
      {
        key: "kind",
        label: "Kind",
        type: "string",
        parameterKey: "kind",
        defaultValue: "box",
      },
      ...PRIMITIVE_PARAMETER_PORTS,
    ],
    outputs: [
      { key: "geometry", label: "Geometry", type: "geometry", required: true },
      { key: "kind", label: "Kind", type: "string" },
      { key: "representation", label: "Representation", type: "string" },
      { key: "params", label: "Params", type: "any" },
    ],
    parameters: [
      {
        key: "kind",
        label: "Kind",
        type: "select",
        defaultValue: "box",
        options: primitiveKindOptions,
      },
      PRIMITIVE_REPRESENTATION_SPEC,
      ...PRIMITIVE_PARAMETER_SPECS,
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters }) => {
      const geometry = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const kind = String(inputs.kind ?? parameters.kind ?? "box");
      const representation = String(parameters.representation ?? "mesh");
      return {
        geometry,
        kind,
        representation,
        params: resolvePrimitiveInputParameters(inputs, parameters),
      };
    },
  },
  {
    type: "box",
    label: "Box Builder",
    semanticOps: [],
    shortLabel: "BOX",
    description: "Create a box primitive.",
    category: "primitives",
    iconId: "boxBuilder",
    inputs: [
      { key: "anchor", label: "Corner", type: "any" },
      { key: "width", label: "Width", type: "number", parameterKey: "boxWidth", defaultValue: 1 },
      { key: "height", label: "Height", type: "number", parameterKey: "boxHeight", defaultValue: 1 },
      { key: "depth", label: "Depth", type: "number", parameterKey: "boxDepth", defaultValue: 1 },
      {
        key: "centerMode",
        label: "Center Mode",
        type: "boolean",
        parameterKey: "centerMode",
        defaultValue: false,
      },
    ],
    outputs: [
      { key: "geometry", label: "Box", type: "geometry", required: true },
      { key: "volume", label: "Volume", type: "number" },
      { key: "anchor", label: "Corner", type: "vector" },
      { key: "width", label: "Width", type: "number" },
      { key: "height", label: "Height", type: "number" },
      { key: "depth", label: "Depth", type: "number" },
      { key: "centerMode", label: "Center Mode", type: "boolean" },
      { key: "representation", label: "Representation", type: "string" },
    ],
    parameters: [
      ...vectorParameterSpecs("boxOrigin", "Corner", ZERO_VEC3),
      PRIMITIVE_REPRESENTATION_SPEC,
      { key: "boxWidth", label: "Width", type: "number", defaultValue: 1, min: 0.01, step: 0.1 },
      { key: "boxHeight", label: "Height", type: "number", defaultValue: 1, min: 0.01, step: 0.1 },
      { key: "boxDepth", label: "Depth", type: "number", defaultValue: 1, min: 0.01, step: 0.1 },
      { key: "centerMode", label: "Center Mode", type: "boolean", defaultValue: false },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const anchor =
        resolvePointInput(inputs.anchor, context) ??
        readVec3Parameters(parameters, "boxOrigin", ZERO_VEC3);
      const width = toNumber(inputs.width, readNumberParameter(parameters, "boxWidth", 1));
      const height = toNumber(inputs.height, readNumberParameter(parameters, "boxHeight", 1));
      const depth = toNumber(inputs.depth, readNumberParameter(parameters, "boxDepth", 1));
      const centerMode = toBoolean(
        inputs.centerMode,
        readBooleanParameter(parameters, "centerMode", false)
      );
      if (width <= 0 || height <= 0 || depth <= 0) {
        throw new Error("Box dimensions must be positive.");
      }
      return {
        geometry: geometryId,
        volume: width * height * depth,
        anchor,
        width,
        height,
        depth,
        centerMode,
        representation: String(parameters.representation ?? "mesh"),
      };
    },
  },
  {
    type: "sphere",
    label: "Sphere",
    semanticOps: [],
    shortLabel: "SPH",
    description: "Create a sphere primitive.",
    category: "primitives",
    iconId: "sphere",
    inputs: [
      { key: "center", label: "Center", type: "any" },
      { key: "radius", label: "Radius", type: "number", parameterKey: "sphereRadius", defaultValue: 0.5 },
    ],
    outputs: [
      { key: "geometry", label: "Sphere", type: "geometry", required: true },
      { key: "volume", label: "Volume", type: "number" },
      { key: "center", label: "Center", type: "vector" },
      { key: "radius", label: "Radius", type: "number" },
      { key: "representation", label: "Representation", type: "string" },
    ],
    parameters: [
      ...vectorParameterSpecs("sphereCenter", "Center", ZERO_VEC3),
      PRIMITIVE_REPRESENTATION_SPEC,
      { key: "sphereRadius", label: "Radius", type: "number", defaultValue: 0.5, min: 0.01, step: 0.1 },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters, context }) => {
      const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const center =
        resolvePointInput(inputs.center, context) ??
        readVec3Parameters(parameters, "sphereCenter", ZERO_VEC3);
      const radius = toNumber(inputs.radius, readNumberParameter(parameters, "sphereRadius", 0.5));
      if (radius <= 0) {
        throw new Error("Sphere radius must be positive.");
      }
      return {
        geometry: geometryId,
        volume: (4 / 3) * Math.PI * Math.pow(radius, 3),
        center,
        radius,
        representation: String(parameters.representation ?? "mesh"),
      };
    },
  },
  ...PRIMITIVE_NODE_DEFINITIONS,
  {
    type: "voxelizeGeometry",
    label: "Voxelize Geometry",
    shortLabel: "VOX",
    description: "Convert geometry into a voxel grid domain.",
    category: "voxel",
    iconId: "box",
    inputs: [
      {
        key: "geometry",
        label: "Geometry",
        type: "geometry",
        required: true,
        description: "Geometry to voxelize into a cubic grid.",
      },
    ],
    outputs: [
      {
        key: "voxelGrid",
        label: "Grid",
        type: "any",
        description: "Voxel grid with bounds, cell size, and densities.",
      },
      {
        key: "densityField",
        label: "Density",
        type: "any",
        description: "Flattened density array in X-fast order.",
      },
      {
        key: "resolution",
        label: "Resolution",
        type: "number",
        description: "Grid resolution per axis.",
      },
      {
        key: "cellSize",
        label: "Cell",
        type: "vector",
        description: "Size of a single voxel cell.",
      },
      {
        key: "boundsMin",
        label: "Bounds Min",
        type: "vector",
        description: "Minimum corner of the voxel bounds.",
      },
      {
        key: "boundsMax",
        label: "Bounds Max",
        type: "vector",
        description: "Maximum corner of the voxel bounds.",
      },
    ],
    parameters: [
      {
        key: "resolution",
        label: "Resolution",
        type: "number",
        defaultValue: 12,
        min: 4,
        max: 36,
        step: 1,
        description: "Number of voxels per axis. Higher values capture more detail.",
      },
      {
        key: "padding",
        label: "Padding",
        type: "number",
        defaultValue: 0.2,
        min: 0,
        max: 10,
        step: 0.1,
        description: "Extra space added around the geometry bounds.",
      },
      {
        key: "mode",
        label: "Mode",
        type: "select",
        defaultValue: "solid",
        options: [
          { value: "solid", label: "Solid" },
          { value: "surface", label: "Surface" },
        ],
        description: "Solid fills the bounds; Surface marks cells near samples.",
      },
      {
        key: "thickness",
        label: "Surface Thickness",
        type: "number",
        defaultValue: 1,
        min: 0,
        max: 4,
        step: 1,
        description: "Voxel layers painted around surface samples.",
      },
    ],
    primaryOutputKey: "voxelGrid",
    compute: ({ inputs, parameters, context }) => {
      const geometry = resolveGeometryInput(inputs, context, { allowMissing: true });
      const resolution = readNumberParameter(parameters, "resolution", 12);
      if (!geometry) {
        return {
          voxelGrid: null,
          densityField: [],
          resolution: clampResolution(resolution, 12),
          cellSize: ZERO_VEC3,
          boundsMin: ZERO_VEC3,
          boundsMax: ZERO_VEC3,
        };
      }
      const padding = readNumberParameter(parameters, "padding", 0.2);
      const mode = String(parameters.mode ?? "solid").toLowerCase();
      const thickness = readNumberParameter(parameters, "thickness", 1);
      const grid = buildVoxelGridFromGeometry(
        geometry,
        context,
        resolution,
        padding,
        mode,
        thickness
      );
      return {
        voxelGrid: grid,
        densityField: grid.densities,
        resolution: grid.resolution.x,
        cellSize: grid.cellSize,
        boundsMin: grid.bounds.min,
        boundsMax: grid.bounds.max,
      };
    },
  },
  {
    type: "extractIsosurface",
    label: "Extract Isosurface",
    shortLabel: "ISO",
    description: "Create a mesh from a voxel density field.",
    category: "voxel",
    iconId: "surface",
    inputs: [
      {
        key: "voxelGrid",
        label: "Voxel Grid",
        type: "any",
        required: true,
        description: "Voxel grid or density array to extract from.",
      },
    ],
    outputs: [
      {
        key: "geometry",
        label: "Geometry",
        type: "geometry",
        required: true,
        description: "Geometry id that receives the extracted mesh.",
      },
      {
        key: "mesh",
        label: "Mesh",
        type: "any",
        description: "Generated render mesh for the isosurface.",
      },
      {
        key: "cellCount",
        label: "Cells",
        type: "number",
        description: "Total voxels evaluated in the grid.",
      },
    ],
    parameters: [
      {
        key: "isoValue",
        label: "Iso Value",
        type: "number",
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.05,
        description: "Density threshold for extracting occupied cells.",
      },
      {
        key: "resolution",
        label: "Resolution",
        type: "number",
        defaultValue: 12,
        min: 4,
        max: 36,
        step: 1,
        description: "Resolution used when the input is a raw density list.",
      },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters }) => {
      const isoValue = clampNumber(
        readNumberParameter(parameters, "isoValue", 0.5),
        0,
        1
      );
      const geometryId =
        typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const resolutionHint = readNumberParameter(parameters, "resolution", 12);
      const grid = coerceVoxelGrid(inputs.voxelGrid, resolutionHint);
      if (!grid) {
        return {
          geometry: geometryId,
          mesh: { positions: [], normals: [], uvs: [], indices: [] },
          cellCount: 0,
        };
      }
      const mesh = buildVoxelMesh(grid, isoValue);
      return {
        geometry: geometryId,
        mesh,
        cellCount: grid.densities.length,
      };
    },
  },
  {
    type: "topologyOptimize",
    label: "Topology Optimize",
    shortLabel: "TOPO",
    description: "Authoritative topology optimization settings and progress metadata.",
    category: "voxel",
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
      {
        key: "domain",
        label: "Domain",
        type: "geometry",
        description: "Domain geometry id forwarded from input.",
      },
      {
        key: "volumeFraction",
        label: "VF",
        type: "number",
        description: "Target solid volume fraction (0-1).",
      },
      {
        key: "penaltyExponent",
        label: "Penalty",
        type: "number",
        description: "SIMP penalty exponent for stiffness.",
      },
      {
        key: "filterRadius",
        label: "Radius",
        type: "number",
        description: "Neighborhood radius for density filtering.",
      },
      {
        key: "maxIterations",
        label: "Max Iter",
        type: "number",
        description: "Maximum solver iterations.",
      },
      {
        key: "convergenceTolerance",
        label: "Tolerance",
        type: "number",
        description: "Convergence tolerance for stopping criteria.",
      },
      {
        key: "iteration",
        label: "Iter",
        type: "number",
        description: "Current iteration index from progress tracking.",
      },
      {
        key: "objective",
        label: "Objective",
        type: "number",
        description: "Objective value (lower is better).",
      },
      {
        key: "constraint",
        label: "Constraint",
        type: "number",
        description: "Volume constraint residual.",
      },
      {
        key: "status",
        label: "Status",
        type: "string",
        description: "Status string (waiting-for-domain, missing-domain, complete).",
      },
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
        description: "Target solid volume fraction (0-1).",
      },
      {
        key: "penaltyExponent",
        label: "Penalty Exponent",
        type: "number",
        defaultValue: 3,
        min: 1,
        max: 6,
        step: 0.1,
        description: "SIMP penalty exponent for stiffness.",
      },
      {
        key: "filterRadius",
        label: "Filter Radius",
        type: "number",
        defaultValue: 1.5,
        min: 0,
        max: 8,
        step: 0.1,
        description: "Neighborhood radius for density smoothing.",
      },
      {
        key: "maxIterations",
        label: "Max Iterations",
        type: "number",
        defaultValue: 80,
        min: 1,
        max: 400,
        step: 1,
        description: "Maximum number of optimization steps.",
      },
      {
        key: "convergenceTolerance",
        label: "Convergence Tolerance",
        type: "number",
        defaultValue: 0.001,
        min: 1e-6,
        max: 0.1,
        step: 0.0005,
        description: "Stop when changes fall below this value.",
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
    category: "voxel",
    iconId: "topologySolver",
    inputs: [
      {
        key: "domain",
        label: "Domain",
        type: "geometry",
        description: "Geometry domain used to fit bounds when no grid is supplied.",
      },
      {
        key: "goals",
        label: "Goals",
        type: "goal",
        allowMultiple: true,
        description: "Structural goals (volume, stiffness, load, anchor) for the optimizer.",
      },
      {
        key: "voxelGrid",
        label: "Voxel Grid",
        type: "any",
        description:
          "Optional voxel grid domain. Bounds are reused; resolution snaps to cubic max.",
      },
    ],
    outputs: [
      {
        key: "densityField",
        label: "Density",
        type: "any",
        description: "Solved density field in X-fast order.",
      },
      {
        key: "voxelGrid",
        label: "Voxel Grid",
        type: "any",
        description: "Voxel grid with updated densities.",
      },
      {
        key: "bestScore",
        label: "Best",
        type: "number",
        description: "Best score (1 - objective).",
      },
      {
        key: "objective",
        label: "Objective",
        type: "number",
        description: "Objective value (lower is better).",
      },
      {
        key: "constraint",
        label: "Constraint",
        type: "number",
        description: "Volume constraint residual.",
      },
      {
        key: "iterations",
        label: "Iterations",
        type: "number",
        description: "Iterations executed.",
      },
      {
        key: "resolution",
        label: "Resolution",
        type: "number",
        description: "Resolution used for the solve.",
      },
      {
        key: "status",
        label: "Status",
        type: "string",
        description: "Solver status string.",
      },
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
        description: "Target solid volume fraction (0-1).",
      },
      {
        key: "penaltyExponent",
        label: "Penalty Exponent",
        type: "number",
        defaultValue: 3,
        min: 1,
        max: 6,
        step: 0.1,
        description: "SIMP penalty exponent for stiffness.",
      },
      {
        key: "filterRadius",
        label: "Filter Radius",
        type: "number",
        defaultValue: 2,
        min: 0,
        max: 8,
        step: 0.1,
        description: "Neighborhood radius in voxels (0 disables filtering).",
      },
      {
        key: "iterations",
        label: "Iterations",
        type: "number",
        defaultValue: 40,
        min: 1,
        max: 120,
        step: 1,
        description: "Solver iterations to run.",
      },
      {
        key: "resolution",
        label: "Resolution",
        type: "number",
        defaultValue: 12,
        min: 4,
        max: 36,
        step: 1,
        description: "Grid resolution when no voxel grid input is provided.",
      },
    ],
    primaryOutputKey: "densityField",
    compute: ({ inputs, parameters, context }) => {
      const domainId = typeof inputs.domain === "string" ? inputs.domain : null;
      const domainGeometry = domainId ? context.geometryById.get(domainId) ?? null : null;
      const domainBounds = domainGeometry
        ? normalizeVoxelBounds(
            computeBoundsFromPositions(
              collectGeometryPositions(domainGeometry, context)
            )
          )
        : null;
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
      const resolutionHint = toNumber(
        inputs.resolution,
        readNumberParameter(parameters, "resolution", 12)
      );

      const rawGoals = Array.isArray(inputs.goals)
        ? inputs.goals
        : inputs.goals
          ? [inputs.goals]
          : [];
      const isGoalSpecification = (goal: unknown): goal is GoalSpecification => {
        if (!goal || typeof goal !== "object") return false;
        if (!("goalType" in goal)) return false;
        const geometry = (goal as { geometry?: unknown }).geometry;
        return (
          Boolean(geometry) &&
          typeof geometry === "object" &&
          Array.isArray((geometry as { elements?: unknown }).elements)
        );
      };
      const goals = rawGoals.filter(isGoalSpecification);

      const inputGrid = coerceVoxelGrid(
        inputs.voxelGrid,
        resolutionHint,
        domainBounds ?? undefined
      );
      const gridResolution = inputGrid
        ? Math.max(
            inputGrid.resolution.x,
            inputGrid.resolution.y,
            inputGrid.resolution.z
          )
        : null;
      const resolution = clampResolution(gridResolution ?? resolutionHint, gridResolution ?? 12);

      if (!domainId && !inputGrid) {
        return {
          densityField: [],
          voxelGrid: null,
          bestScore: 0,
          objective: 1,
          constraint: 0,
          iterations: 0,
          resolution,
          status: "waiting-for-domain",
        };
      }
      if (domainId && !domainGeometry && !inputGrid) {
        return {
          densityField: [],
          voxelGrid: null,
          bestScore: 0,
          objective: 1,
          constraint: 0,
          iterations: 0,
          resolution,
          status: "missing-domain",
        };
      }

      const buildGoalSeedDensities = (args: {
        bounds: { min: Vec3Value; max: Vec3Value };
        resolution: number;
        volumeFraction: number;
        filterRadius: number;
        goals: GoalSpecification[];
        domainGeometry: Geometry;
        context: WorkflowComputeContext;
      }) => {
        const anchorGoals = args.goals.filter((goal) => goal.goalType === "anchor");
        const loadGoals = args.goals.filter((goal) => goal.goalType === "load");

        const collectGoalPositions = (goalList: GoalSpecification[]) => {
          const positions: Vec3Value[] = [];
          goalList.forEach((goal) => {
            goal.geometry.elements.forEach((index) => {
              const position = resolveGeometryPositionByIndex(
                args.domainGeometry,
                args.context,
                index
              );
              if (position) positions.push(position);
            });
          });
          return positions;
        };

        const anchors = collectGoalPositions(anchorGoals);
        const loads = collectGoalPositions(loadGoals);
        if (anchors.length === 0 && loads.length === 0) return null;

        const meanPosition = (positions: Vec3Value[]): Vec3Value | null => {
          if (positions.length === 0) return null;
          let total: Vec3Value = { x: 0, y: 0, z: 0 };
          positions.forEach((position) => {
            total = addVec3(total, position);
          });
          return scaleVec3(total, 1 / positions.length);
        };

        const anchorCenter = meanPosition(anchors);
        const loadCenter = meanPosition(loads);
        const size = resolveBoundsSize(args.bounds);
        const diagonal = Math.max(
          EPSILON,
          Math.sqrt(size.x * size.x + size.y * size.y + size.z * size.z)
        );

        const res = clampInt(Math.round(args.resolution), 4, 36, 12);
        const cellCount = res * res * res;
        const densities = new Array<number>(cellCount).fill(args.volumeFraction);

        const toIndex = (x: number, y: number, z: number) => x + y * res + z * res * res;
        const resolveCellCenter = (x: number, y: number, z: number): Vec3Value => ({
          x: args.bounds.min.x + (x + 0.5) * (size.x / res),
          y: args.bounds.min.y + (y + 0.5) * (size.y / res),
          z: args.bounds.min.z + (z + 0.5) * (size.z / res),
        });

        const influenceRadius =
          diagonal * 0.12 +
          (args.filterRadius > 0
            ? (diagonal / res) * clampNumber(args.filterRadius, 0, 8)
            : 0);
        const sigma = Math.max(diagonal * 0.08, influenceRadius);
        const sigma2 = sigma * sigma;
        const gaussian = (distance: number) => Math.exp(-(distance * distance) / (2 * sigma2));

        const axisStart = anchorCenter ?? loadCenter;
        const axisEnd = loadCenter ?? anchorCenter;
        const axisVector =
          axisStart && axisEnd ? subtractVec3(axisEnd, axisStart) : null;
        const axisLength2 = axisVector ? dotVec3(axisVector, axisVector) : 0;

        const TUBE_WEIGHT = 0.55;
        const ANCHOR_WEIGHT = 0.25;
        const LOAD_WEIGHT = 0.2;
        const BIAS_BASELINE = 0.2;
        const BIAS_GAIN = 0.75;

        for (let z = 0; z < res; z += 1) {
          for (let y = 0; y < res; y += 1) {
            for (let x = 0; x < res; x += 1) {
              const idx = toIndex(x, y, z);
              const p = resolveCellCenter(x, y, z);

              let anchorField = 0;
              if (anchorCenter) {
                anchorField = gaussian(distanceVec3(p, anchorCenter));
              }

              let loadField = 0;
              if (loadCenter) {
                loadField = gaussian(distanceVec3(p, loadCenter));
              }

              let tubeField = 0;
              if (axisStart && axisEnd && axisVector && axisLength2 > EPSILON) {
                const ap = subtractVec3(p, axisStart);
                const t = clampNumber(dotVec3(ap, axisVector) / axisLength2, 0, 1);
                const closest = addVec3(axisStart, scaleVec3(axisVector, t));
                tubeField = gaussian(distanceVec3(p, closest));
              }

              const bias = clampNumber(
                TUBE_WEIGHT * tubeField +
                  ANCHOR_WEIGHT * anchorField +
                  LOAD_WEIGHT * loadField,
                0,
                1
              );
              const boosted = args.volumeFraction + (bias - BIAS_BASELINE) * BIAS_GAIN;
              densities[idx] = clampNumber(boosted, 0, 1);
            }
          }
        }

        let mean = 0;
        for (let i = 0; i < cellCount; i += 1) {
          mean += densities[i];
        }
        mean /= cellCount;
        const correction = mean - args.volumeFraction;
        for (let i = 0; i < cellCount; i += 1) {
          densities[i] = clampNumber(densities[i] - correction, 0, 1);
        }

        return densities;
      };

      const baseBounds = inputGrid?.bounds ?? domainBounds ?? DEFAULT_VOXEL_BOUNDS;
      const normalizedBounds = normalizeVoxelBounds(baseBounds);
      const seedDensities =
        domainGeometry && goals.length > 0
          ? buildGoalSeedDensities({
              bounds: normalizedBounds,
              resolution,
              volumeFraction,
              filterRadius,
              goals,
              domainGeometry,
              context,
            })
          : null;
      const SEED_BLEND_FACTOR = 0.35;
      const initialDensities = (() => {
        const gridDensities = inputGrid?.densities;
        if (seedDensities && gridDensities && gridDensities.length === seedDensities.length) {
          return gridDensities.map((value, index) =>
            clampNumber(lerpNumber(value, seedDensities[index], SEED_BLEND_FACTOR), 0, 1)
          );
        }
        return gridDensities ?? seedDensities ?? undefined;
      })();

      const result = runTopologyDensitySolver({
        seedKey: `${context.nodeId}:${domainId ?? "voxel"}`,
        resolution,
        volumeFraction,
        penaltyExponent,
        filterRadius,
        iterations,
        initialDensities,
      });
      const size = {
        x: normalizedBounds.max.x - normalizedBounds.min.x,
        y: normalizedBounds.max.y - normalizedBounds.min.y,
        z: normalizedBounds.max.z - normalizedBounds.min.z,
      };
      const outputGrid = normalizeVoxelGrid(
        {
          resolution: {
            x: result.resolution,
            y: result.resolution,
            z: result.resolution,
          },
          bounds: normalizedBounds,
          cellSize: {
            x: size.x / result.resolution,
            y: size.y / result.resolution,
            z: size.z / result.resolution,
          },
          densities: result.densityField,
        },
        result.resolution
      );

      return {
        densityField: outputGrid.densities,
        voxelGrid: outputGrid,
        bestScore: result.bestScore,
        objective: result.objective,
        constraint: result.constraint,
        iterations: result.iterations,
        resolution: outputGrid.resolution.x,
        status: "complete",
      };
    },
  },
  {
    type: "chemistrySolver",
    label: "Ἐπιλύτης Χημείας",
    semanticOps: ['solver.chemistry'],
    shortLabel: "Chem",
    description: "Material transmutation solver for functionally graded blends.",
    category: "solver",
    iconId: "solver",
    display: {
      nameGreek: "Ἐπιλύτης Χημείας",
      nameEnglish: "Chemistry Solver",
      romanization: "Epilýtēs Chēmeías",
      description: "Material transmutation solver for functionally graded blends.",
    },
    inputs: [
      {
        key: "domain",
        label: "Domain",
        type: "geometry",
        required: true,
        description: "Spatial domain for material distribution.",
      },
      {
        key: "enabled",
        label: "Enabled",
        type: "boolean",
        parameterKey: "enabled",
        defaultValue: true,
        description: "Toggle solver execution on or off.",
      },
      {
        key: "particleCount",
        label: "Particle Count",
        type: "number",
        parameterKey: "particleCount",
        defaultValue: 2000,
        description: "Base particle count; effective count = particleCount × particleDensity.",
      },
      {
        key: "particleDensity",
        label: "Particle Density",
        type: "number",
        parameterKey: "particleDensity",
        defaultValue: 1,
        description: "Multiplier on particle count (0.1–1); trades accuracy for speed.",
      },
      {
        key: "iterations",
        label: "Iterations",
        type: "number",
        parameterKey: "iterations",
        defaultValue: 60,
        description: "Number of solver iterations (runtime scales ~ particleCount × iterations).",
      },
      {
        key: "fieldResolution",
        label: "Field Resolution",
        type: "number",
        parameterKey: "fieldResolution",
        defaultValue: 32,
        description: "Voxel field resolution (8–96; runtime/memory scales ~ resolution³).",
      },
      {
        key: "isoValue",
        label: "Iso Value",
        type: "number",
        parameterKey: "isoValue",
        defaultValue: 0.35,
        description: "Iso threshold (0–1) for extracting the preview surface.",
      },
      {
        key: "convergenceTolerance",
        label: "Convergence Tolerance",
        type: "number",
        parameterKey: "convergenceTolerance",
        defaultValue: 1e-3,
        description: "Stops early once energy stabilizes (1e-5–5e-2; lower is more accurate but slower).",
      },
      {
        key: "blendStrength",
        label: "Blend Strength",
        type: "number",
        parameterKey: "blendStrength",
        defaultValue: 0.6,
        description: "Global scaling applied to blend goals (0–2).",
      },
      {
        key: "materials",
        label: "Materials",
        type: "any",
        allowMultiple: true,
        description: "Material assignment list or geometry ids.",
      },
      {
        key: "materialsText",
        label: "Materials Text",
        type: "string",
        description: "Optional JSON or line-based material assignments.",
      },
      {
        key: "seeds",
        label: "Seeds",
        type: "any",
        allowMultiple: true,
        description: "Optional seed points or geometry ids to bias nucleation.",
      },
      {
        key: "goals",
        label: "Goals",
        type: "goal",
        allowMultiple: true,
        description: "Chemistry goal specifications.",
      },
    ],
    outputs: [
      {
        key: "geometry",
        label: "Geometry",
        type: "geometry",
        description: "Preview geometry id.",
      },
      {
        key: "mesh",
        label: "Preview Mesh",
        type: "any",
        description: "Preview mesh generated from the material field.",
      },
      {
        key: "materialParticles",
        label: "Particles",
        type: "any",
        description: "Particle cloud with material concentrations.",
      },
      {
        key: "materialField",
        label: "Field",
        type: "any",
        description: "Voxel field with per-material channels.",
      },
      {
        key: "history",
        label: "History",
        type: "any",
        description: "Energy history per iteration.",
      },
      {
        key: "bestState",
        label: "Best State",
        type: "any",
        description: "Snapshot of the lowest-energy particle state.",
      },
      {
        key: "materials",
        label: "Materials",
        type: "any",
        description: "Resolved material library used for this solve.",
      },
      {
        key: "totalEnergy",
        label: "Energy",
        type: "number",
        description: "Total energy value from the latest iteration.",
      },
      {
        key: "status",
        label: "Status",
        type: "string",
        description: "Solver status string.",
      },
      {
        key: "diagnostics",
        label: "Diagnostics",
        type: "any",
        description: "Solver diagnostics and warnings.",
      },
    ],
    parameters: [
      {
        key: "enabled",
        label: "Enabled",
        type: "boolean",
        defaultValue: true,
      },
      {
        key: "particleCount",
        label: "Particle Count",
        type: "number",
        defaultValue: 2000,
        min: 100,
        max: 20000,
        step: 50,
      },
      {
        key: "particleDensity",
        label: "Particle Density",
        type: "number",
        defaultValue: 1,
        min: 0.1,
        max: 1,
        step: 0.05,
      },
      {
        key: "iterations",
        label: "Iterations",
        type: "number",
        defaultValue: 60,
        min: 1,
        max: 500,
        step: 1,
      },
      {
        key: "fieldResolution",
        label: "Field Resolution",
        type: "number",
        defaultValue: 32,
        min: 8,
        max: 96,
        step: 1,
      },
      {
        key: "isoValue",
        label: "Iso Value",
        type: "number",
        defaultValue: 0.35,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        key: "convergenceTolerance",
        label: "Convergence Tolerance",
        type: "number",
        defaultValue: 1e-3,
        min: 1e-5,
        max: 0.05,
        step: 1e-4,
      },
      {
        key: "blendStrength",
        label: "Blend Strength",
        type: "number",
        defaultValue: 0.6,
        min: 0,
        max: 2,
        step: 0.05,
      },
      {
        key: "historyLimit",
        label: "History Limit",
        type: "number",
        defaultValue: 200,
        min: 10,
        max: 1000,
        step: 10,
      },
      {
        key: "seed",
        label: "Seed",
        type: "number",
        defaultValue: 1,
        step: 1,
      },
      {
        key: "materialOrder",
        label: "Material Order",
        type: "string",
        defaultValue: "Steel, Ceramic, Glass",
      },
      {
        key: "materialsText",
        label: "Materials",
        type: "textarea",
        defaultValue: "",
        description: "Optional JSON or line-based material assignments.",
      },
      {
        key: "seedMaterial",
        label: "Seed Material",
        type: "string",
        defaultValue: "Steel",
      },
      {
        key: "seedStrength",
        label: "Seed Strength",
        type: "number",
        defaultValue: 0.85,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        key: "seedRadius",
        label: "Seed Radius",
        type: "number",
        defaultValue: 0.25,
        min: 0,
        max: 10,
        step: 0.05,
      },
      {
        key: "seedsText",
        label: "Seeds",
        type: "textarea",
        defaultValue: "",
      },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters, context }) => {
      const geometryId =
        typeof parameters.geometryId === "string" ? parameters.geometryId : null;
      const enabled = toBoolean(
        inputs.enabled,
        readBooleanParameter(parameters, "enabled", true)
      );
      if (!enabled) {
        return {
          geometry: geometryId,
          mesh: EMPTY_MESH,
          materialParticles: [],
          materialField: null,
          history: [],
          bestState: null,
          materials: [],
          totalEnergy: 0,
          status: "disabled",
          diagnostics: {
            warnings: ["Chemistry Solver is disabled."],
          },
        };
      }
      const domainId = typeof inputs.domain === "string" ? inputs.domain : null;
      const domainGeometry = domainId ? context.geometryById.get(domainId) ?? null : null;
      if (!domainGeometry) {
        const status = domainId ? "missing-domain" : "waiting-for-domain";
        return {
          geometry: geometryId,
          mesh: EMPTY_MESH,
          materialParticles: [],
          materialField: null,
          history: [],
          bestState: null,
          materials: [],
          totalEnergy: 0,
          status,
          diagnostics: {
            warnings: ["Domain geometry is required for Chemistry Solver."],
          },
        };
      }

      const rawGoals = Array.isArray(inputs.goals)
        ? inputs.goals
        : inputs.goals
          ? [inputs.goals]
          : [];
      const goals = rawGoals.filter(
        (goal): goal is GoalSpecification =>
          Boolean(goal) && typeof goal === "object" && "goalType" in (goal as object)
      );
      const validation = validateChemistryGoals(goals);
      if (!validation.valid) {
        throw new Error(`Goal validation failed: ${validation.errors.join(", ")}`);
      }
      const normalizedGoals = validation.normalizedGoals ?? goals;

      const baseParticleCount = clampInt(
        Math.round(
          toNumber(inputs.particleCount, readNumberParameter(parameters, "particleCount", 2000))
        ),
        100,
        20000,
        2000
      );
      const particleDensity = clampNumber(
        toNumber(
          inputs.particleDensity,
          readNumberParameter(parameters, "particleDensity", 1)
        ),
        0.1,
        1
      );
      const particleCount = clampInt(
        Math.round(baseParticleCount * particleDensity),
        100,
        20000,
        baseParticleCount
      );
      const iterations = clampInt(
        Math.round(
          toNumber(inputs.iterations, readNumberParameter(parameters, "iterations", 60))
        ),
        1,
        500,
        60
      );
      const fieldResolution = clampInt(
        Math.round(
          toNumber(
            inputs.fieldResolution,
            readNumberParameter(parameters, "fieldResolution", 32)
          )
        ),
        8,
        96,
        32
      );
      const isoValue = clampNumber(
        toNumber(inputs.isoValue, readNumberParameter(parameters, "isoValue", 0.35)),
        0,
        1
      );
      const convergenceTolerance = clampNumber(
        toNumber(
          inputs.convergenceTolerance,
          readNumberParameter(parameters, "convergenceTolerance", 1e-3)
        ),
        1e-5,
        0.05
      );
      const blendStrength = clampNumber(
        toNumber(inputs.blendStrength, readNumberParameter(parameters, "blendStrength", 0.6)),
        0,
        2
      );
      const historyLimit = clampInt(
        Math.round(
          toNumber(inputs.historyLimit, readNumberParameter(parameters, "historyLimit", 200))
        ),
        10,
        1000,
        200
      );
      const seedValue = toNumber(inputs.seed, readNumberParameter(parameters, "seed", 1));

      const materialAssignments = resolveChemistryMaterialAssignments(
        inputs.materials,
        typeof inputs.materialsText === "string"
          ? { ...parameters, materialsText: inputs.materialsText }
          : parameters,
        context,
        domainId
      );
      const seeds = resolveChemistrySeeds(
        inputs.seeds,
        parameters,
        context,
        materialAssignments.materialNames[0] ?? "Steel"
      );

      const result = runChemistrySolver({
        seedKey: `${context.nodeId}:${domainId}:${seedValue}`,
        domainGeometryId: domainId,
        domainGeometry,
        goals: normalizedGoals,
        assignments: materialAssignments.assignments,
        materials: materialAssignments.materials,
        materialNames: materialAssignments.materialNames,
        seeds,
        particleCount,
        iterations,
        fieldResolution,
        isoValue,
        convergenceTolerance,
        blendStrength,
        historyLimit,
        context,
      });

      if (materialAssignments.warnings.length > 0) {
        result.warnings.push(...materialAssignments.warnings);
      }
      if (validation.warnings.length > 0) {
        result.warnings.push(...validation.warnings);
      }

      return {
        geometry: geometryId,
        mesh: result.mesh,
        materialParticles: result.particles,
        materialField: result.field,
        history: result.history,
        bestState: result.bestState,
        materials: result.materials,
        totalEnergy: result.totalEnergy,
        status: result.status,
        diagnostics: {
          iterations: result.iterations,
          warnings: result.warnings,
        },
      };
    },
  },
  {
    type: "number",
    label: "Number",
    semanticOps: ['workflow.literal'],
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
    semanticOps: ['math.add'],
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
    semanticOps: ['math.subtract'],
    shortLabel: "SUB",
    description: "Computes the difference A - B for numeric values.",
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
    semanticOps: ['math.multiply'],
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
    semanticOps: ['math.divide'],
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
        return { result: 0 };
      }
      return { result: a / b };
    },
  },
  {
    type: "clamp",
    label: "Clamp",
    semanticOps: ['math.clamp'],
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
      const lo = Math.min(min, max);
      const hi = Math.max(min, max);
      return { result: clampNumber(value, lo, hi) };
    },
  },
  {
    type: "min",
    label: "Min",
    semanticOps: ['math.min'],
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
    semanticOps: ['math.max'],
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
      const keys = variables.length === 0 ? ["value"] : variables;
      const listLengths = keys
        .map((key) => (Array.isArray(inputs[key]) ? inputs[key]?.length ?? 0 : 0))
        .filter((length) => length > 0);
      const listLength = listLengths.length > 0 ? Math.max(...listLengths) : 0;

      if (listLength > 0) {
        const results: number[] = [];
        for (let i = 0; i < listLength; i += 1) {
          const variableValues: Record<string, number> = {};
          keys.forEach((key) => {
            const raw = Array.isArray(inputs[key])
              ? (inputs[key] as WorkflowValue[])[i] ??
                (inputs[key] as WorkflowValue[])[(inputs[key] as WorkflowValue[]).length - 1]
              : inputs[key];
            variableValues[key] = toNumber(raw, 0);
          });
          try {
            results.push(evaluateExpression(expression, variableValues));
          } catch {
            results.push(0);
          }
        }
        return { result: results };
      }

      const variableValues: Record<string, number> = {};
      if (variables.length === 0) {
        variableValues.value = toNumber(inputs.value, 0);
      } else {
        variables.forEach((variable) => {
          variableValues[variable] = toNumber(inputs[variable], 0);
        });
      }
      try {
        const result = evaluateExpression(expression, variableValues);
        return { result };
      } catch {
        return { result: 0 };
      }
    },
  },
  {
    type: "scalarFunctions",
    label: "Scalar Functions",
    shortLabel: "FUNC",
    description: "Apply common scalar functions to a value.",
    category: "math",
    iconId: "expression",
    inputs: [
      {
        key: "value",
        label: "Value",
        type: "number",
        parameterKey: "value",
        defaultValue: 0,
      },
      {
        key: "exponent",
        label: "Exponent",
        type: "number",
        parameterKey: "exponent",
        defaultValue: 2,
      },
    ],
    outputs: [{ key: "result", label: "Result", type: "number" }],
    parameters: [
      {
        key: "function",
        label: "Function",
        type: "select",
        defaultValue: "abs",
        options: [
          { value: "abs", label: "Abs" },
          { value: "sqrt", label: "Sqrt" },
          { value: "exp", label: "Exp" },
          { value: "log", label: "Log" },
          { value: "sin", label: "Sin" },
          { value: "cos", label: "Cos" },
          { value: "tan", label: "Tan" },
          { value: "floor", label: "Floor" },
          { value: "ceil", label: "Ceil" },
          { value: "round", label: "Round" },
          { value: "pow", label: "Power" },
        ],
      },
    ],
    primaryOutputKey: "result",
    compute: ({ inputs, parameters }) => {
      const value = toNumber(inputs.value, readNumberParameter(parameters, "value", 0));
      const exponent = toNumber(
        inputs.exponent,
        readNumberParameter(parameters, "exponent", 2)
      );
      const fn = String(parameters.function ?? "abs");
      let result = value;
      switch (fn) {
        case "sqrt":
          result = value < 0 ? 0 : Math.sqrt(value);
          break;
        case "exp":
          result = Math.exp(value);
          break;
        case "log":
          result = value <= 0 ? 0 : Math.log(value);
          break;
        case "sin":
          result = Math.sin(value);
          break;
        case "cos":
          result = Math.cos(value);
          break;
        case "tan":
          result = Math.tan(value);
          break;
        case "floor":
          result = Math.floor(value);
          break;
        case "ceil":
          result = Math.ceil(value);
          break;
        case "round":
          result = Math.round(value);
          break;
        case "pow":
          result = Math.pow(value, exponent);
          break;
        case "abs":
        default:
          result = Math.abs(value);
          break;
      }
      if (!Number.isFinite(result)) {
        result = 0;
      }
      return { result };
    },
  },
  {
    type: "toggleSwitch",
    label: "Toggle Switch",
    shortLabel: "SW",
    description: "Manual on/off switch for boolean control signals.",
    category: "logic",
    iconId: "conditional",
    inputs: [],
    outputs: [{ key: "value", label: "Value", type: "boolean" }],
    parameters: [
      {
        key: "value",
        label: "On",
        type: "boolean",
        defaultValue: true,
      },
    ],
    primaryOutputKey: "value",
    compute: ({ parameters }) => ({
      value: readBooleanParameter(parameters, "value", true),
    }),
  },
  {
    type: "conditionalToggleButton",
    label: "Conditional Toggle Button",
    shortLabel: "BTN",
    description: "Toggle button switch for conditional enable/disable control.",
    category: "logic",
    iconId: "conditional",
    inputs: [],
    outputs: [{ key: "enabled", label: "Enabled", type: "boolean" }],
    parameters: [
      {
        key: "enabled",
        label: "Enabled",
        type: "boolean",
        defaultValue: true,
      },
    ],
    primaryOutputKey: "enabled",
    compute: ({ parameters }) => ({
      enabled: readBooleanParameter(parameters, "enabled", true),
    }),
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
    semanticOps: ['vector.add'],
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
    semanticOps: ['vector.subtract'],
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
    semanticOps: ['vector.length'],
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
    semanticOps: ['vector.normalize'],
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
    semanticOps: ['vector.dot'],
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
    semanticOps: ['vector.cross'],
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
    semanticOps: ['vector.lerp'],
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
    type: "pointAttractor",
    label: "Point Attractor",
    shortLabel: "ATTR",
    description: "Generate attraction vectors toward a target point.",
    category: "euclidean",
    iconId: "point",
    inputs: [
      { key: "point", label: "Point", type: "vector", required: true },
      { key: "attractor", label: "Attractor", type: "vector", required: true },
      {
        key: "strength",
        label: "Strength",
        type: "number",
        parameterKey: "strength",
        defaultValue: 1,
      },
      {
        key: "radius",
        label: "Radius",
        type: "number",
        parameterKey: "radius",
        defaultValue: 10,
      },
    ],
    outputs: [
      { key: "vector", label: "Vector", type: "vector" },
      { key: "distance", label: "Distance", type: "number" },
      { key: "falloff", label: "Falloff", type: "number" },
      { key: "strength", label: "Strength", type: "number" },
      { key: "radius", label: "Radius", type: "number" },
    ],
    parameters: [
      ...vectorParameterSpecs("point", "Point", ZERO_VEC3),
      ...vectorParameterSpecs("attractor", "Attractor", ZERO_VEC3),
      { key: "strength", label: "Strength", type: "number", defaultValue: 1, step: 0.1 },
      { key: "radius", label: "Radius", type: "number", defaultValue: 10, min: 0, step: 0.1 },
    ],
    primaryOutputKey: "vector",
    compute: ({ inputs, parameters }) => {
      const point = resolveVectorInput(inputs, parameters, "point", "point", ZERO_VEC3);
      const attractor = resolveVectorInput(inputs, parameters, "attractor", "attractor", ZERO_VEC3);
      const strength = toNumber(inputs.strength, readNumberParameter(parameters, "strength", 1));
      const radius = Math.max(
        0,
        toNumber(inputs.radius, readNumberParameter(parameters, "radius", 10))
      );
      const delta = subtractVec3(attractor, point);
      const distance = lengthVec3(delta);
      let falloff = 1;
      if (radius > EPSILON) {
        falloff = clampNumber(1 - distance / radius, 0, 1);
      }
      const direction = normalizeVec3Safe(delta, ZERO_VEC3);
      const vector = scaleVec3(direction, strength * falloff);
      return { vector, distance, falloff, strength, radius };
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
    type: "rotate",
    label: "Rotate",
    shortLabel: "ROT",
    description: "Rotate geometry around an axis.",
    category: "transforms",
    iconId: "rotate",
    inputs: [
      { key: "geometry", label: "Geometry", type: "geometry", required: true, parameterKey: "geometryId" },
      { key: "axis", label: "Axis", type: "vector", required: true },
      { key: "pivot", label: "Pivot", type: "vector", required: false },
      { key: "angle", label: "Angle", type: "number", parameterKey: "angle", defaultValue: 0 },
    ],
    outputs: [
      { key: "geometry", label: "Geometry", type: "geometry" },
      { key: "axis", label: "Axis", type: "vector" },
      { key: "pivot", label: "Pivot", type: "vector" },
      { key: "angle", label: "Angle", type: "number" },
    ],
    parameters: [
      ...vectorParameterSpecs("axis", "Axis", UNIT_Y_VEC3),
      ...vectorParameterSpecs("pivot", "Pivot", ZERO_VEC3),
      { key: "angle", label: "Angle", type: "number", defaultValue: 0, step: 5 },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters }) => {
      const geometry = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const axis = resolveVectorInput(inputs, parameters, "axis", "axis", UNIT_Y_VEC3);
      const pivot = resolveVectorInput(inputs, parameters, "pivot", "pivot", ZERO_VEC3);
      const angle = toNumber(inputs.angle, readNumberParameter(parameters, "angle", 0));
      return {
        geometry,
        axis,
        pivot,
        angle,
      };
    },
  },
  {
    type: "scale",
    label: "Scale",
    shortLabel: "SCL",
    description: "Scale geometry around a pivot point.",
    category: "transforms",
    iconId: "scale",
    inputs: [
      { key: "geometry", label: "Geometry", type: "geometry", required: true, parameterKey: "geometryId" },
      { key: "scale", label: "Scale", type: "vector", required: true },
      { key: "pivot", label: "Pivot", type: "vector", required: false },
    ],
    outputs: [
      { key: "geometry", label: "Geometry", type: "geometry" },
      { key: "scale", label: "Scale", type: "vector" },
      { key: "pivot", label: "Pivot", type: "vector" },
    ],
    parameters: [
      ...vectorParameterSpecs("scale", "Scale", UNIT_XYZ_VEC3),
      ...vectorParameterSpecs("pivot", "Pivot", ZERO_VEC3),
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters }) => {
      const geometry = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const scale = resolveVectorInput(inputs, parameters, "scale", "scale", UNIT_XYZ_VEC3);
      const pivot = resolveVectorInput(inputs, parameters, "pivot", "pivot", ZERO_VEC3);
      return {
        geometry,
        scale,
        pivot,
      };
    },
  },
  {
    type: "fieldTransformation",
    label: "Field Transformation",
    shortLabel: "FIELD",
    description: "Transform geometry using a scalar or vector field.",
    category: "transforms",
    iconId: "transform",
    inputs: [
      { key: "geometry", label: "Geometry", type: "geometry", required: true },
      { key: "field", label: "Field", type: "any" },
      {
        key: "strength",
        label: "Strength",
        type: "number",
        parameterKey: "strength",
        defaultValue: 1,
      },
      {
        key: "falloff",
        label: "Falloff",
        type: "number",
        parameterKey: "falloff",
        defaultValue: 1,
      },
    ],
    outputs: [
      { key: "geometry", label: "Geometry", type: "geometry" },
      { key: "field", label: "Field", type: "any" },
      { key: "strength", label: "Strength", type: "number" },
      { key: "falloff", label: "Falloff", type: "number" },
    ],
    parameters: [
      { key: "strength", label: "Strength", type: "number", defaultValue: 1, step: 0.1 },
      { key: "falloff", label: "Falloff", type: "number", defaultValue: 1, min: 0, step: 0.1 },
    ],
    primaryOutputKey: "geometry",
    compute: ({ inputs, parameters }) => {
      const geometry = typeof inputs.geometry === "string" ? inputs.geometry : null;
      const strength = toNumber(inputs.strength, readNumberParameter(parameters, "strength", 1));
      const falloff = toNumber(inputs.falloff, readNumberParameter(parameters, "falloff", 1));
      return {
        geometry,
        field: inputs.field ?? null,
        strength,
        falloff,
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

NODE_DEFINITIONS.push(PhysicsSolverNode, ChemistrySolverNode, EvolutionarySolver, VoxelSolverNode, TopologyOptimizationSolverNode);
NODE_DEFINITIONS.push(
  StiffnessGoalNode,
  VolumeGoalNode,
  LoadGoalNode,
  AnchorGoalNode,
  ChemistryMaterialGoalNode,
  ChemistryStiffnessGoalNode,
  ChemistryMassGoalNode,
  ChemistryBlendGoalNode,
  ChemistryTransparencyGoalNode,
  ChemistryThermalGoalNode
);

export const NODE_DEFINITION_BY_TYPE = new Map<NodeType, WorkflowNodeDefinition>(
  NODE_DEFINITIONS.map((definition) => [definition.type, definition])
);

export const NODE_CATEGORY_BY_ID = new Map<NodeCategoryId, NodeCategory>(
  NODE_CATEGORIES.map((category) => [category.id, category])
);

import { getPortTypeColor } from "./colors";

export const PORT_TYPE_COLOR: Record<WorkflowPortType, string> = {
  number: getPortTypeColor("number"),
  boolean: getPortTypeColor("boolean"),
  string: getPortTypeColor("string"),
  vector: getPortTypeColor("vector"),
  geometry: getPortTypeColor("geometry"),
  mesh: getPortTypeColor("mesh"),
  nurb: getPortTypeColor("nurb"),
  brep: getPortTypeColor("brep"),
  renderMesh: getPortTypeColor("renderMesh"),
  voxelGrid: getPortTypeColor("voxelGrid"),
  goal: getPortTypeColor("goal"),
  genomeSpec: getPortTypeColor("genomeSpec"),
  phenotypeSpec: getPortTypeColor("phenotypeSpec"),
  fitnessSpec: getPortTypeColor("fitnessSpec"),
  solverResult: getPortTypeColor("solverResult"),
  animation: getPortTypeColor("animation"),
  any: getPortTypeColor("any"),
};

const GEOMETRY_TYPES: WorkflowPortType[] = ["geometry", "mesh", "nurb", "brep"];
const DATA_TYPES: WorkflowPortType[] = ["renderMesh", "voxelGrid"];

export const isPortTypeCompatible = (source: WorkflowPortType, target: WorkflowPortType) => {
  if (source === target) return true;
  const exclusive = source === "goal" ||
    target === "goal" ||
    source === "genomeSpec" ||
    target === "genomeSpec" ||
    source === "phenotypeSpec" ||
    target === "phenotypeSpec" ||
    source === "fitnessSpec" ||
    target === "fitnessSpec";
  if (exclusive) return false;
  if (source === "any" || target === "any") return true;
  if ((source === "number" && target === "boolean") || (source === "boolean" && target === "number")) {
    return true;
  }
  if (GEOMETRY_TYPES.includes(source) && GEOMETRY_TYPES.includes(target)) {
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

const PRIMITIVE_NODE_TYPE_SET = new Set(PRIMITIVE_NODE_TYPE_IDS);

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
    if (node.data?.point) {
      parameters.x = node.data.point.x;
      parameters.y = node.data.point.y;
      parameters.z = node.data.point.z;
    }
  }
  if (type === "line") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
    if (node.data?.pointsText) parameters.pointsText = node.data.pointsText;
  }
  if (type === "arc") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
    if (node.data?.pointsText) parameters.pointsText = node.data.pointsText;
  }
  if (type === "curve") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
    if (node.data?.pointsText) parameters.pointsText = node.data.pointsText;
    if (typeof node.data?.closed === "boolean") parameters.closed = node.data.closed;
  }
  if (type === "polyline") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
    if (node.data?.pointsText) parameters.pointsText = node.data.pointsText;
    if (typeof node.data?.closed === "boolean") parameters.closed = node.data.closed;
  }
  if (type === "surface") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
    if (node.data?.pointsText) parameters.pointsText = node.data.pointsText;
  }
  if (type === "rectangle") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "circle") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "loft") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "extrude") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "meshConvert") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "meshBoolean") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "geodesicSphere") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "stlImport") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "boolean") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "pipeSweep") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "pipeMerge") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "offset") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "geometryArray") {
    if (node.data?.geometryIds) parameters.geometryIds = node.data.geometryIds;
  }
  if (type === "pointCloud") {
    if (node.data?.geometryIds) parameters.geometryIds = node.data.geometryIds;
  }
  if (type === "rotate") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "scale") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "primitive") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type && PRIMITIVE_NODE_TYPE_SET.has(type)) {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "box") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
    if (node.data?.boxDimensions) {
      parameters.boxWidth = node.data.boxDimensions.width;
      parameters.boxHeight = node.data.boxDimensions.height;
      parameters.boxDepth = node.data.boxDimensions.depth;
    }
    if (node.data?.boxOrigin) {
      parameters.boxOriginX = node.data.boxOrigin.x;
      parameters.boxOriginY = node.data.boxOrigin.y;
      parameters.boxOriginZ = node.data.boxOrigin.z;
    }
  }
  if (type === "sphere") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
    if (typeof node.data?.sphereRadius === "number") {
      parameters.sphereRadius = node.data.sphereRadius;
    }
    if (node.data?.sphereOrigin) {
      parameters.sphereCenterX = node.data.sphereOrigin.x;
      parameters.sphereCenterY = node.data.sphereOrigin.y;
      parameters.sphereCenterZ = node.data.sphereOrigin.z;
    }
  }
  if (type === "extractIsosurface") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "physicsSolver") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "chemistrySolver") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "voxelSolver") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "mesh") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "move") {
    if (node.data?.geometryId) parameters.geometryId = node.data.geometryId;
  }
  if (type === "customMaterial") {
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
