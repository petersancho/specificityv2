import type { SemanticOpId } from "./semanticOpIds";
import { SEMANTIC_OP_IDS } from "./semanticOpIds";
import type { StickerSemanticMeta, UISemanticDomain } from "./uiSemantics";
import { UI_DOMAIN_COLORS } from "./uiColorTokens";

const SEMANTIC_OP_SET = new Set(SEMANTIC_OP_IDS as readonly string[]);

const ensureOp = (id: string): SemanticOpId | null =>
  SEMANTIC_OP_SET.has(id) ? (id as SemanticOpId) : null;

const firstValid = (...candidates: string[]): SemanticOpId | null => {
  for (const candidate of candidates) {
    const valid = ensureOp(candidate);
    if (valid) return valid;
  }
  return null;
};

const mapVectorIcon = (iconId: string): SemanticOpId | null => {
  const mapping: Record<string, string> = {
    vectorAdd: "vector.add",
    vectorSubtract: "vector.subtract",
    vectorMultiply: "vector.multiply",
    vectorDivide: "vector.divide",
    vectorConstruct: "vector.construct",
    vectorDeconstruct: "vector.deconstruct",
    vectorDot: "vector.dot",
    vectorCross: "vector.cross",
    vectorNormalize: "vector.normalize",
    vectorScale: "vector.scaleVector",
    vectorProject: "vector.project",
    vectorFromPoints: "vector.fromPoints",
    vectorLength: "vector.length",
    vectorAngle: "vector.angle",
    vectorLerp: "vector.lerp",
  };
  const op = mapping[iconId];
  return op ? ensureOp(op) : null;
};

const mapUnitIcon = (iconId: string): SemanticOpId | null => {
  const mapping: Record<string, string> = {
    unitX: "vector.constant.unitX",
    unitY: "vector.constant.unitY",
    unitZ: "vector.constant.unitZ",
    unitXYZ: "vector.constant.unitXYZ",
    origin: "vector.constant.origin",
  };
  const op = mapping[iconId];
  return op ? ensureOp(op) : null;
};

const mapListIcon = (iconId: string): SemanticOpId | null => {
  const mapping: Record<string, string> = {
    listCreate: "data.collect",
    listFlatten: "data.flatten",
    listIndexOf: "data.indexOf",
    listItem: "data.index",
    listLength: "data.length",
    listPartition: "data.partition",
    listReverse: "data.reverse",
    listSlice: "data.slice",
    listSum: "math.sum",
    listAverage: "math.average",
    listMedian: "math.median",
    listStdDev: "math.stdDev",
    listMax: "math.max",
    listMin: "math.min",
  };
  const op = mapping[iconId];
  return op ? ensureOp(op) : null;
};

const mapArrayIcon = (iconId: string): SemanticOpId | null => {
  const mapping: Record<string, string> = {
    arrayGrid: "geometry.array.grid",
    arrayLinear: "geometry.array.linear",
    arrayPolar: "geometry.array.polar",
  };
  const op = mapping[iconId];
  return op ? ensureOp(op) : null;
};

const mapMathIcon = (iconId: string): SemanticOpId | null => {
  const mapping: Record<string, string> = {
    add: "math.add",
    subtract: "math.subtract",
    multiply: "math.multiply",
    divide: "math.divide",
    max: "math.max",
    min: "math.min",
    clamp: "math.clamp",
    remap: "math.lerp",
    random: "math.random",
    range: "data.range",
    linspace: "data.linspace",
    cosineWave: "math.cos",
    sineWave: "math.sin",
    sawtoothWave: "math.atan",
    squareWave: "math.modulo",
    triangleWave: "math.abs",
    expression: "math.expression",
    interpolate: "math.lerp",
    distance: "vector.distance",
  };
  const op = mapping[iconId];
  return op ? ensureOp(op) : null;
};

const mapCommandIcon = (iconId: string): SemanticOpId | null => {
  const mapping: Record<string, string> = {
    box: "geometry.primitive.box",
    sphere: "geometry.primitive.sphere",
    arc: "command.createArc",
    circle: "command.createCircle",
    line: "command.createLine",
    rectangle: "command.createRectangle",
    polyline: "command.createPolyline",
    point: "command.createPoint",
    surface: "command.surface",
    loft: "command.loft",
    extrude: "command.extrude",
    offset: "command.offset",
    mirror: "command.mirror",
    rotate: "command.rotate",
    scale: "command.scale",
    move: "command.move",
    transform: "command.transform",
    boolean: "command.boolean",
    copy: "command.copy",
    download: "command.export.stl",
    save: "command.export.stl",
    load: "command.import.stl",
    capture: "command.screenshot",
    frameAll: "command.frameAll",
    focus: "command.focus",
    displayMode: "command.display",
    cplaneXY: "command.cplane",
    selectionFilter: "command.selectionFilter",
    gumball: "command.gumball",
    close: "command.cancel",
    info: "command.status",
    group: "data.collect",
    repeat: "data.repeat",
    prune: "data.filter",
  };
  const op = mapping[iconId];
  return op ? ensureOp(op) : null;
};

const mapSolverIcon = (iconId: string): SemanticOpId | null => {
  const mapping: Record<string, string> = {
    solver: "solver.physics",
    topologyOptimizationSolver: "solver.topologyOptimization",
    voxelSolver: "solver.voxel",
  };
  const op = mapping[iconId];
  return op ? ensureOp(op) : null;
};

const mapGoalIcon = (iconId: string): SemanticOpId | null => {
  if (iconId.endsWith("Goal")) {
    return ensureOp("solver.topologyOptimization");
  }
  return null;
};

const mapTessellationIcon = (iconId: string): SemanticOpId | null => {
  if (iconId.startsWith("tessellation:")) {
    return ensureOp("meshTess.tessellationMeshToRenderMesh");
  }
  return null;
};

const inferSemanticOps = (iconId: string): SemanticOpId[] => {
  const candidates = [
    mapVectorIcon(iconId),
    mapUnitIcon(iconId),
    mapListIcon(iconId),
    mapArrayIcon(iconId),
    mapMathIcon(iconId),
    mapSolverIcon(iconId),
    mapGoalIcon(iconId),
    mapCommandIcon(iconId),
    mapTessellationIcon(iconId),
    firstValid("command.view"),
  ].filter(Boolean) as SemanticOpId[];

  return candidates.length > 0 ? [candidates[0]] : [];
};

const inferDomainFromOp = (opId?: SemanticOpId): UISemanticDomain => {
  if (!opId) return "neutral";
  if (opId.startsWith("math.")) return "numeric";
  if (opId.startsWith("vector.")) return "numeric";
  if (opId.startsWith("logic.")) return "logic";
  if (opId.startsWith("data.")) return "data";
  if (opId.startsWith("string.")) return "data";
  if (opId.startsWith("color.")) return "data";
  if (opId.startsWith("solver.")) return "feedback";
  if (opId.startsWith("simulator.")) return "feedback";
  return "structure";
};

export const STICKER_REGISTRY: Record<string, StickerSemanticMeta> = {
  "icon-add": {
    stickerId: "icon-add",
    semanticOps: ["math.add" as SemanticOpId],
    domain: "numeric",
    accentColor: UI_DOMAIN_COLORS.numeric,
  },
  "icon-box": {
    stickerId: "icon-box",
    semanticOps: ["geometry.primitive" as SemanticOpId],
    domain: "structure",
    accentColor: UI_DOMAIN_COLORS.structure,
  },
};

export const resolveStickerMeta = (stickerId: string): StickerSemanticMeta => {
  const existing = STICKER_REGISTRY[stickerId];
  if (existing) return existing;
  const semanticOps = inferSemanticOps(stickerId);
  const domain = inferDomainFromOp(semanticOps[0]);
  return {
    stickerId,
    semanticOps,
    domain,
    accentColor: UI_DOMAIN_COLORS[domain],
  };
};
