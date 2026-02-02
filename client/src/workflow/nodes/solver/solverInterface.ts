import type { RenderMesh, Vec3 } from "../../../types";
import type {
  GoalSpecification,
  SolverConfiguration,
  SolverInput,
  SolverResult,
  LoadGoal,
  StiffnessGoal,
  VolumeGoal,
  AnchorGoal,
} from "./types";

const DEFAULT_MEMORY_LIMIT_MB = 2048;

const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());

const vecLength = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z);

const resolveMemoryLimitMB = (config: SolverConfiguration) => {
  const explicit = config.safetyLimits.memoryLimitMB;
  if (Number.isFinite(explicit) && (explicit as number) > 0) {
    return Math.max(256, explicit as number);
  }
  const deviceMemory =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
      : undefined;
  if (Number.isFinite(deviceMemory) && (deviceMemory as number) > 0) {
    const deviceMB = (deviceMemory as number) * 1024;
    const autoLimit = Math.min(deviceMB * 0.6, 16384);
    return Math.max(DEFAULT_MEMORY_LIMIT_MB, autoLimit);
  }
  return DEFAULT_MEMORY_LIMIT_MB;
};

const estimateMeshMemoryMB = (mesh: RenderMesh) => {
  const baseBytes =
    (mesh.positions.length +
      mesh.normals.length +
      mesh.uvs.length +
      mesh.indices.length +
      (mesh.colors?.length ?? 0)) *
    8;
  const vertexCount = Math.floor(mesh.positions.length / 3);
  const triangleCount = Math.floor(mesh.indices.length / 3);
  const edgeCountEstimate = Math.max(1, Math.floor(triangleCount * 1.5));
  const vecArraysBytes = vertexCount * 3 * 8 * 3;
  const scalarArraysBytes = vertexCount * 8 * 2 + triangleCount * 8;
  const edgeBytes = edgeCountEstimate * 32;
  return (baseBytes + vecArraysBytes + scalarArraysBytes + edgeBytes) / (1024 * 1024);
};

type PackedEdgeData = {
  a: Int32Array;
  b: Int32Array;
  restLength: Float64Array;
  invRestLength: Float64Array;
  stiffness: Float64Array;
  count: number;
};

type TriangleAreaData = {
  areas: Float64Array;
  totalArea: number;
};

const buildTriangleAreas = (mesh: RenderMesh): TriangleAreaData => {
  const indices = mesh.indices;
  if (!indices || indices.length < 3) {
    return { areas: new Float64Array(0), totalArea: 0 };
  }
  const positions = mesh.positions;
  const vertexCount = Math.floor(positions.length / 3);
  const triangleCount = Math.floor(indices.length / 3);
  const areas = new Float64Array(triangleCount);
  let totalArea = 0;
  for (let t = 0; t < triangleCount; t += 1) {
    const idx = t * 3;
    const a = indices[idx];
    const b = indices[idx + 1];
    const c = indices[idx + 2];
    if (a < 0 || b < 0 || c < 0 || a >= vertexCount || b >= vertexCount || c >= vertexCount) {
      areas[t] = 0;
      continue;
    }
    const a3 = a * 3;
    const b3 = b * 3;
    const c3 = c * 3;
    const ax = positions[a3];
    const ay = positions[a3 + 1];
    const az = positions[a3 + 2];
    const abx = positions[b3] - ax;
    const aby = positions[b3 + 1] - ay;
    const abz = positions[b3 + 2] - az;
    const acx = positions[c3] - ax;
    const acy = positions[c3 + 1] - ay;
    const acz = positions[c3 + 2] - az;
    const crossX = aby * acz - abz * acy;
    const crossY = abz * acx - abx * acz;
    const crossZ = abx * acy - aby * acx;
    const area = 0.5 * vecLength(crossX, crossY, crossZ);
    areas[t] = area;
    totalArea += area;
  }
  return { areas, totalArea };
};

const buildEdgeData = (
  mesh: RenderMesh,
  youngsModulus: number,
  areas: Float64Array
): PackedEdgeData => {
  const indices = mesh.indices;
  if (!indices || indices.length < 3) {
    return {
      a: new Int32Array(0),
      b: new Int32Array(0),
      restLength: new Float64Array(0),
      invRestLength: new Float64Array(0),
      stiffness: new Float64Array(0),
      count: 0,
    };
  }
  const positions = mesh.positions;
  const vertexCount = Math.floor(positions.length / 3);
  const maxSafeIndex = Math.floor(Math.sqrt(Number.MAX_SAFE_INTEGER));
  const useNumericKey = vertexCount > 0 && vertexCount <= maxSafeIndex;
  const areaByEdge: Map<number | string, number> = useNumericKey ? new Map<number, number>() : new Map<string, number>();
  const triangles = Math.floor(indices.length / 3);
  for (let t = 0; t < triangles; t += 1) {
    const idx = t * 3;
    const a = indices[idx];
    const b = indices[idx + 1];
    const c = indices[idx + 2];
    if (a < 0 || b < 0 || c < 0 || a >= vertexCount || b >= vertexCount || c >= vertexCount) {
      continue;
    }
    const triArea = areas[t] ?? 0;
    const share = triArea / 3;
    const edges: Array<[number, number]> = [
      [a, b],
      [b, c],
      [c, a],
    ];
    for (let e = 0; e < edges.length; e += 1) {
      const [i, j] = edges[e];
      if (i === j) continue;
      if (useNumericKey) {
        const key = i < j ? i * vertexCount + j : j * vertexCount + i;
        const next = (areaByEdge.get(key) ?? 0) + share;
        areaByEdge.set(key, next);
      } else {
        const key = i < j ? `${i}:${j}` : `${j}:${i}`;
        const next = (areaByEdge.get(key) ?? 0) + share;
        areaByEdge.set(key, next);
      }
    }
  }

  const size = areaByEdge.size;
  const aArr = new Int32Array(size);
  const bArr = new Int32Array(size);
  const restLengthArr = new Float64Array(size);
  const invRestLengthArr = new Float64Array(size);
  const stiffnessArr = new Float64Array(size);
  let count = 0;
  areaByEdge.forEach((area, key) => {
    const a = useNumericKey
      ? Math.floor((key as number) / vertexCount)
      : Number((key as string).split(":")[0]);
    const b = useNumericKey
      ? (key as number) % vertexCount
      : Number((key as string).split(":")[1]);
    if (a < 0 || b < 0 || a >= vertexCount || b >= vertexCount) return;
    const a3 = a * 3;
    const b3 = b * 3;
    const dx = positions[b3] - positions[a3];
    const dy = positions[b3 + 1] - positions[a3 + 1];
    const dz = positions[b3 + 2] - positions[a3 + 2];
    const restLength = vecLength(dx, dy, dz);
    if (!Number.isFinite(restLength) || restLength <= 1e-9) return;
    const stiffness = (youngsModulus * Math.max(area, 1e-6)) / restLength;
    aArr[count] = a;
    bArr[count] = b;
    restLengthArr[count] = restLength;
    invRestLengthArr[count] = 1 / restLength;
    stiffnessArr[count] = stiffness;
    count += 1;
  });

  return {
    a: count === size ? aArr : aArr.subarray(0, count),
    b: count === size ? bArr : bArr.subarray(0, count),
    restLength: count === size ? restLengthArr : restLengthArr.subarray(0, count),
    invRestLength: count === size ? invRestLengthArr : invRestLengthArr.subarray(0, count),
    stiffness: count === size ? stiffnessArr : stiffnessArr.subarray(0, count),
    count,
  };
};

const buildEmptyResult = (errors: string[]): SolverResult => ({
  success: false,
  iterations: 0,
  convergenceAchieved: false,
  finalObjectiveValue: 0,
  warnings: [],
  errors,
  performanceMetrics: { computeTime: 0, memoryUsed: 0 },
});

const buildVertexMasses = (
  mesh: RenderMesh,
  density: number,
  thickness: number,
  areas: Float64Array
): Float64Array => {
  const indices = mesh.indices;
  const vertexCount = Math.floor(mesh.positions.length / 3);
  const masses = new Float64Array(vertexCount);
  if (!indices || indices.length < 3) {
    masses.fill(1);
    return masses;
  }
  for (let i = 0; i < indices.length; i += 3) {
    const triIndex = i / 3;
    const area = areas[triIndex] ?? 0;
    const mass = density * area * thickness;
    const share = mass / 3;
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];
    if (a >= 0 && a < vertexCount) masses[a] += share;
    if (b >= 0 && b < vertexCount) masses[b] += share;
    if (c >= 0 && c < vertexCount) masses[c] += share;
  }
  for (let i = 0; i < masses.length; i += 1) {
    const m = masses[i];
    if (!Number.isFinite(m) || m <= 0) masses[i] = 1;
  }
  return masses;
};

const createPackedVec3 = (count: number) => new Float64Array(count * 3);

const resetPackedVec3 = (array: Float64Array) => array.fill(0);

const toVec3Array = (packed: Float64Array, count: number): Vec3[] => {
  const vecs: Vec3[] = new Array(count);
  for (let i = 0; i < count; i += 1) {
    const base = i * 3;
    vecs[i] = { x: packed[base], y: packed[base + 1], z: packed[base + 2] };
  }
  return vecs;
};

const buildExternalForces = (
  goals: GoalSpecification[],
  vertexCount: number,
  time: number,
  reuse?: Float64Array
): Float64Array => {
  const forces = reuse ?? createPackedVec3(vertexCount);
  resetPackedVec3(forces);
  const loadGoals = goals.filter((goal): goal is LoadGoal => goal.goalType === "load");
  loadGoals.forEach((goal) => {
    const points = goal.parameters.applicationPoints ?? goal.geometry.elements ?? [];
    if (!points.length) return;
    const force = goal.parameters.force as Vec3 | undefined;
    const fx = typeof force?.x === "number" ? force.x : 0;
    const fy = typeof force?.y === "number" ? force.y : 0;
    const fz = typeof force?.z === "number" ? force.z : 0;
    const distributed = Boolean(goal.parameters.distributed);
    const perPointScale = distributed ? 1 / points.length : 1;
    let timeScale = 1;
    if (goal.parameters.loadType === "dynamic" && goal.parameters.timeProfile?.length) {
      const idx = Math.min(
        goal.parameters.timeProfile.length - 1,
        Math.max(0, Math.round(time * (goal.parameters.timeProfile.length - 1)))
      );
      timeScale = goal.parameters.timeProfile[idx] ?? 1;
    }
    if (goal.parameters.loadType === "cyclic") {
      const frequency = goal.parameters.frequency ?? 1;
      timeScale = Math.sin(2 * Math.PI * frequency * time);
    }
    const scaledX = fx * perPointScale * timeScale;
    const scaledY = fy * perPointScale * timeScale;
    const scaledZ = fz * perPointScale * timeScale;
    points.forEach((index) => {
      if (index < 0 || index >= vertexCount) return;
      const base = index * 3;
      forces[base] += scaledX;
      forces[base + 1] += scaledY;
      forces[base + 2] += scaledZ;
    });
  });
  return forces;
};

type AnchorConstraint = {
  fixed: { x: boolean; y: boolean; z: boolean };
  springStiffness: number;
};

const resolveStiffness = (goals: GoalSpecification[]) => {
  const stiffnessGoals = goals.filter(
    (goal): goal is StiffnessGoal => goal.goalType === "stiffness"
  );
  if (stiffnessGoals.length === 0) return 1e9;
  const totalWeight = stiffnessGoals.reduce((sum, goal) => sum + goal.weight, 0) || 1;
  const weighted = stiffnessGoals.reduce(
    (sum, goal) => sum + goal.parameters.youngModulus * goal.weight,
    0
  );
  return Math.max(1e6, weighted / totalWeight);
};

const resolveDensity = (goals: GoalSpecification[]) => {
  const volumeGoal = goals.find((goal): goal is VolumeGoal => goal.goalType === "volume");
  return Math.max(1, volumeGoal?.parameters.materialDensity ?? 7850);
};

const resolveAnchorConstraints = (
  goals: GoalSpecification[],
  vertexCount: number
): Map<number, AnchorConstraint> => {
  const anchorGoals = goals.filter((goal): goal is AnchorGoal => goal.goalType === "anchor");
  const constraints = new Map<number, AnchorConstraint>();
  anchorGoals.forEach((goal) => {
    const fixed = goal.parameters.fixedDOF ?? { x: true, y: true, z: true };
    const spring = Math.max(0, goal.parameters.springStiffness ?? 0);
    goal.geometry.elements.forEach((index) => {
      if (index < 0 || index >= vertexCount) return;
      constraints.set(index, {
        fixed: {
          x: Boolean(fixed.x),
          y: Boolean(fixed.y),
          z: Boolean(fixed.z),
        },
        springStiffness: spring,
      });
    });
  });
  return constraints;
};

const resolveThickness = (goals: GoalSpecification[], totalArea: number) => {
  const volumeGoal = goals.find((goal): goal is VolumeGoal => goal.goalType === "volume");
  const targetVolume = volumeGoal?.parameters.targetVolume;
  if (!Number.isFinite(targetVolume) || targetVolume === undefined || targetVolume <= 0) {
    return 1;
  }
  if (totalArea <= 1e-9) return 1;
  return Math.max(1e-3, targetVolume / totalArea);
};

const applyConstraints = (displacements: Float64Array, constraints: Map<number, AnchorConstraint>) => {
  constraints.forEach((constraint, index) => {
    const base = index * 3;
    if (base + 2 >= displacements.length) return;
    if (constraint.fixed.x) displacements[base] = 0;
    if (constraint.fixed.y) displacements[base + 1] = 0;
    if (constraint.fixed.z) displacements[base + 2] = 0;
  });
};

const applyDisplacements = (
  mesh: RenderMesh,
  displacements: Float64Array,
  chunkSize: number,
  scaleFactor = 1
): RenderMesh => {
  const positions = mesh.positions.slice();
  const vertexCount = Math.floor(positions.length / 3);
  const safeChunk = Math.max(1, Math.floor(chunkSize));
  for (let start = 0; start < vertexCount; start += safeChunk) {
    const end = Math.min(vertexCount, start + safeChunk);
    for (let i = start; i < end; i += 1) {
      const idx = i * 3;
      positions[idx] += displacements[idx] * scaleFactor;
      positions[idx + 1] += displacements[idx + 1] * scaleFactor;
      positions[idx + 2] += displacements[idx + 2] * scaleFactor;
    }
  }
  return { ...mesh, positions };
};

const buildStressField = (mesh: RenderMesh, displacements: Float64Array, youngsModulus: number) => {
  const indices = mesh.indices;
  const positions = mesh.positions;
  const vertexCount = Math.floor(positions.length / 3);
  if (!indices || indices.length < 3) {
    const field = new Array(vertexCount);
    for (let i = 0; i < vertexCount; i += 1) {
      const base = i * 3;
      field[i] = vecLength(
        displacements[base],
        displacements[base + 1],
        displacements[base + 2]
      );
    }
    return field;
  }
  const field: number[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    const idxA = indices[i];
    const idxB = indices[i + 1];
    const idxC = indices[i + 2];
    if (
      idxA < 0 ||
      idxB < 0 ||
      idxC < 0 ||
      idxA >= vertexCount ||
      idxB >= vertexCount ||
      idxC >= vertexCount
    ) {
      field.push(0);
      continue;
    }
    const a3 = idxA * 3;
    const b3 = idxB * 3;
    const c3 = idxC * 3;
    const ax = positions[a3];
    const ay = positions[a3 + 1];
    const az = positions[a3 + 2];
    const bx = positions[b3];
    const by = positions[b3 + 1];
    const bz = positions[b3 + 2];
    const cx = positions[c3];
    const cy = positions[c3 + 1];
    const cz = positions[c3 + 2];

    const uaX = displacements[a3];
    const uaY = displacements[a3 + 1];
    const uaZ = displacements[a3 + 2];
    const ubX = displacements[b3];
    const ubY = displacements[b3 + 1];
    const ubZ = displacements[b3 + 2];
    const ucX = displacements[c3];
    const ucY = displacements[c3 + 1];
    const ucZ = displacements[c3 + 2];

    const ab0x = bx - ax;
    const ab0y = by - ay;
    const ab0z = bz - az;
    const bc0x = cx - bx;
    const bc0y = cy - by;
    const bc0z = cz - bz;
    const ca0x = ax - cx;
    const ca0y = ay - cy;
    const ca0z = az - cz;

    const abx = (bx + ubX) - (ax + uaX);
    const aby = (by + ubY) - (ay + uaY);
    const abz = (bz + ubZ) - (az + uaZ);
    const bcx = (cx + ucX) - (bx + ubX);
    const bcy = (cy + ucY) - (by + ubY);
    const bcz = (cz + ucZ) - (bz + ubZ);
    const cax = (ax + uaX) - (cx + ucX);
    const cay = (ay + uaY) - (cy + ucY);
    const caz = (az + uaZ) - (cz + ucZ);

    const ab0 = Math.max(1e-9, vecLength(ab0x, ab0y, ab0z));
    const bc0 = Math.max(1e-9, vecLength(bc0x, bc0y, bc0z));
    const ca0 = Math.max(1e-9, vecLength(ca0x, ca0y, ca0z));

    const strainAb = (vecLength(abx, aby, abz) - ab0) / ab0;
    const strainBc = (vecLength(bcx, bcy, bcz) - bc0) / bc0;
    const strainCa = (vecLength(cax, cay, caz) - ca0) / ca0;

    const meanStrain = (Math.abs(strainAb) + Math.abs(strainBc) + Math.abs(strainCa)) / 3;
    const stress = youngsModulus * meanStrain;
    field.push(stress);
  }
  return field;
};

const buildAnimation = (
  mesh: RenderMesh,
  displacements: Float64Array,
  frameCount: number,
  mode: "dynamic" | "modal",
  chunkSize: number
) => {
  const frames: RenderMesh[] = [];
  const timeStamps: number[] = [];
  const clampedCount = Math.max(1, Math.floor(frameCount));
  for (let i = 0; i < clampedCount; i += 1) {
    const t = clampedCount === 1 ? 1 : i / (clampedCount - 1);
    const factor = mode === "modal" ? Math.sin(t * Math.PI * 2) : t;
    frames.push(applyDisplacements(mesh, displacements, chunkSize, factor));
    timeStamps.push(t);
  }
  return { frames, timeStamps };
};

const solveStaticDisplacements = (
  positions: number[],
  goals: GoalSpecification[],
  config: SolverConfiguration,
  edges: PackedEdgeData,
  constraints: Map<number, AnchorConstraint>
) => {
  const vertexCount = Math.floor(positions.length / 3);
  const displacements = createPackedVec3(vertexCount);
  const maxIterations = Math.max(10, Math.floor(config.maxIterations));
  const relaxation = 0.1;
  const convergence = config.convergenceTolerance;
  const stiffnessByVertex = new Float64Array(vertexCount);
  for (let i = 0; i < edges.count; i += 1) {
    stiffnessByVertex[edges.a[i]] += edges.stiffness[i];
    stiffnessByVertex[edges.b[i]] += edges.stiffness[i];
  }
  constraints.forEach((constraint, index) => {
    stiffnessByVertex[index] += constraint.springStiffness;
  });

  const forces = createPackedVec3(vertexCount);
  let converged = false;
  let iterations = 0;
  for (; iterations < maxIterations; iterations += 1) {
    buildExternalForces(goals, vertexCount, 1, forces);
    let maxResidual = 0;
    for (let e = 0; e < edges.count; e += 1) {
      const a = edges.a[e];
      const b = edges.b[e];
      const a3 = a * 3;
      const b3 = b * 3;
      const ax = positions[a3] + displacements[a3];
      const ay = positions[a3 + 1] + displacements[a3 + 1];
      const az = positions[a3 + 2] + displacements[a3 + 2];
      const bx = positions[b3] + displacements[b3];
      const by = positions[b3 + 1] + displacements[b3 + 1];
      const bz = positions[b3 + 2] + displacements[b3 + 2];
      const dx = bx - ax;
      const dy = by - ay;
      const dz = bz - az;
      const currentLength = Math.max(1e-9, vecLength(dx, dy, dz));
      const stretch = (currentLength - edges.restLength[e]) * edges.invRestLength[e];
      const forceMag = edges.stiffness[e] * stretch;
      const invLength = 1 / currentLength;
      const fx = dx * invLength * forceMag;
      const fy = dy * invLength * forceMag;
      const fz = dz * invLength * forceMag;
      forces[a3] += fx;
      forces[a3 + 1] += fy;
      forces[a3 + 2] += fz;
      forces[b3] -= fx;
      forces[b3 + 1] -= fy;
      forces[b3 + 2] -= fz;
    }
    constraints.forEach((constraint, index) => {
      const base = index * 3;
      if (constraint.springStiffness > 0) {
        forces[base] += -displacements[base] * constraint.springStiffness;
        forces[base + 1] += -displacements[base + 1] * constraint.springStiffness;
        forces[base + 2] += -displacements[base + 2] * constraint.springStiffness;
      }
      if (constraint.fixed.x) forces[base] = 0;
      if (constraint.fixed.y) forces[base + 1] = 0;
      if (constraint.fixed.z) forces[base + 2] = 0;
    });

    for (let i = 0; i < vertexCount; i += 1) {
      const base = i * 3;
      const denom = Math.max(1e-9, stiffnessByVertex[i]);
      const ax = forces[base] / denom;
      const ay = forces[base + 1] / denom;
      const az = forces[base + 2] / denom;
      displacements[base] += ax * relaxation;
      displacements[base + 1] += ay * relaxation;
      displacements[base + 2] += az * relaxation;
      const residual = vecLength(forces[base], forces[base + 1], forces[base + 2]);
      if (residual > maxResidual) maxResidual = residual;
    }

    applyConstraints(displacements, constraints);
    if (maxResidual < convergence) {
      converged = true;
      break;
    }
  }

  return { displacements, converged, iterations };
};

const solveDynamicDisplacements = (
  positions: number[],
  goals: GoalSpecification[],
  config: SolverConfiguration,
  edges: PackedEdgeData,
  masses: Float64Array,
  constraints: Map<number, AnchorConstraint>
) => {
  const vertexCount = Math.floor(positions.length / 3);
  const displacements = createPackedVec3(vertexCount);
  const velocities = createPackedVec3(vertexCount);
  const timeStep = Math.max(1e-4, config.timeStep ?? 0.01);
  const steps = Math.max(1, Math.floor(config.animationFrames ?? 60));
  const damping = 0.98;
  const forces = createPackedVec3(vertexCount);
  for (let step = 0; step < steps; step += 1) {
    const time = steps === 1 ? 1 : step / (steps - 1);
    buildExternalForces(goals, vertexCount, time, forces);
    for (let e = 0; e < edges.count; e += 1) {
      const a = edges.a[e];
      const b = edges.b[e];
      const a3 = a * 3;
      const b3 = b * 3;
      const ax = positions[a3] + displacements[a3];
      const ay = positions[a3 + 1] + displacements[a3 + 1];
      const az = positions[a3 + 2] + displacements[a3 + 2];
      const bx = positions[b3] + displacements[b3];
      const by = positions[b3 + 1] + displacements[b3 + 1];
      const bz = positions[b3 + 2] + displacements[b3 + 2];
      const dx = bx - ax;
      const dy = by - ay;
      const dz = bz - az;
      const currentLength = Math.max(1e-9, vecLength(dx, dy, dz));
      const stretch = (currentLength - edges.restLength[e]) * edges.invRestLength[e];
      const forceMag = edges.stiffness[e] * stretch;
      const invLength = 1 / currentLength;
      const fx = dx * invLength * forceMag;
      const fy = dy * invLength * forceMag;
      const fz = dz * invLength * forceMag;
      forces[a3] += fx;
      forces[a3 + 1] += fy;
      forces[a3 + 2] += fz;
      forces[b3] -= fx;
      forces[b3 + 1] -= fy;
      forces[b3 + 2] -= fz;
    }
    constraints.forEach((constraint, index) => {
      const base = index * 3;
      if (constraint.springStiffness > 0) {
        forces[base] += -displacements[base] * constraint.springStiffness;
        forces[base + 1] += -displacements[base + 1] * constraint.springStiffness;
        forces[base + 2] += -displacements[base + 2] * constraint.springStiffness;
      }
      if (constraint.fixed.x) {
        forces[base] = 0;
        velocities[base] = 0;
        displacements[base] = 0;
      }
      if (constraint.fixed.y) {
        forces[base + 1] = 0;
        velocities[base + 1] = 0;
        displacements[base + 1] = 0;
      }
      if (constraint.fixed.z) {
        forces[base + 2] = 0;
        velocities[base + 2] = 0;
        displacements[base + 2] = 0;
      }
    });

    for (let i = 0; i < vertexCount; i += 1) {
      const base = i * 3;
      const invMass = 1 / Math.max(1e-9, masses[i]);
      const ax = forces[base] * invMass;
      const ay = forces[base + 1] * invMass;
      const az = forces[base + 2] * invMass;
      velocities[base] = (velocities[base] + ax * timeStep) * damping;
      velocities[base + 1] = (velocities[base + 1] + ay * timeStep) * damping;
      velocities[base + 2] = (velocities[base + 2] + az * timeStep) * damping;
      displacements[base] += velocities[base] * timeStep;
      displacements[base + 1] += velocities[base + 1] * timeStep;
      displacements[base + 2] += velocities[base + 2] * timeStep;
    }
  }

  applyConstraints(displacements, constraints);
  return { displacements, steps };
};

const solveModalDisplacements = (
  positions: number[],
  goals: GoalSpecification[],
  config: SolverConfiguration,
  edges: PackedEdgeData,
  masses: Float64Array,
  constraints: Map<number, AnchorConstraint>
) => {
  const { displacements } = solveStaticDisplacements(
    positions,
    goals,
    { ...config, maxIterations: Math.min(200, config.maxIterations) },
    edges,
    constraints
  );
  let totalMass = 0;
  for (let i = 0; i < masses.length; i += 1) totalMass += masses[i];
  let stiffnessSum = 0;
  for (let i = 0; i < edges.count; i += 1) stiffnessSum += edges.stiffness[i];
  const omega = Math.sqrt(Math.max(1e-6, stiffnessSum / Math.max(1e-6, totalMass)));
  return { displacements, omega };
};

export const solvePhysicsFallback = (
  input: SolverInput,
  onProgress?: (progress: number, message: string) => void
): SolverResult => {
  const start = now();
  const { mesh, goals, config } = input;
  const warnings: string[] = ["C++ solver unavailable - using simplified fallback computation."];

  const memoryLimit = resolveMemoryLimitMB(config);
  const estimatedMB = estimateMeshMemoryMB(mesh);
  if (estimatedMB > memoryLimit) {
    return {
      ...buildEmptyResult([
        `Insufficient memory for mesh size. Estimated ${estimatedMB.toFixed(1)}MB, limit ${memoryLimit}MB.`,
      ]),
      warnings,
      performanceMetrics: {
        computeTime: 0,
        memoryUsed: estimatedMB * 1024 * 1024,
      },
    };
  }

  const chunkSize = Math.max(1, Math.floor(config.chunkSize));
  const positions = mesh.positions;
  const vertexCount = Math.floor(positions.length / 3);
  const stiffness = resolveStiffness(goals);
  const density = resolveDensity(goals);
  const { areas, totalArea } = buildTriangleAreas(mesh);
  const thickness = resolveThickness(goals, totalArea);
  const edges = buildEdgeData(mesh, stiffness, areas);
  const masses = buildVertexMasses(mesh, density, thickness, areas);
  const constraints = resolveAnchorConstraints(goals, vertexCount);

  onProgress?.(0.1, "Preparing fallback solver");

  let displacements = createPackedVec3(vertexCount);
  let iterations = 0;
  let convergenceAchieved = false;
  if (config.analysisType === "dynamic") {
    const dynamic = solveDynamicDisplacements(
      positions,
      goals,
      config,
      edges,
      masses,
      constraints
    );
    displacements = dynamic.displacements;
    iterations = dynamic.steps;
    convergenceAchieved = true;
  } else if (config.analysisType === "modal") {
    const modal = solveModalDisplacements(
      positions,
      goals,
      config,
      edges,
      masses,
      constraints
    );
    displacements = modal.displacements;
    iterations = Math.min(config.maxIterations, 200);
    convergenceAchieved = true;
  } else {
    const solved = solveStaticDisplacements(positions, goals, config, edges, constraints);
    displacements = solved.displacements;
    iterations = solved.iterations;
    convergenceAchieved = solved.converged;
  }

  onProgress?.(0.6, "Applying displacements");
  const deformedMesh = applyDisplacements(mesh, displacements, chunkSize);
  const stressField = buildStressField(mesh, displacements, stiffness);

  const animationFrames = config.animationFrames ?? 0;
  const animation =
    config.analysisType === "static"
      ? undefined
      : buildAnimation(
          mesh,
          displacements,
          animationFrames || 60,
          config.analysisType === "modal" ? "modal" : "dynamic",
          chunkSize
        );

  let maxDisp = 0;
  for (let i = 0; i < vertexCount; i += 1) {
    const base = i * 3;
    const length = vecLength(
      displacements[base],
      displacements[base + 1],
      displacements[base + 2]
    );
    if (length > maxDisp) maxDisp = length;
  }

  if (maxDisp > config.safetyLimits.maxDeformation) {
    warnings.push("Deformation exceeds specified limits - results may be unrealistic.");
  }

  let maxStress = 0;
  for (let i = 0; i < stressField.length; i += 1) {
    if (stressField[i] > maxStress) maxStress = stressField[i];
  }
  if (maxStress > config.safetyLimits.maxStress) {
    warnings.push("Stress exceeds specified limits - structure may be failing.");
  }

  onProgress?.(1, "Complete");
  const end = now();

  let totalStrainEnergy = 0;
  for (let i = 0; i < edges.count; i += 1) {
    const a = edges.a[i];
    const b = edges.b[i];
    const a3 = a * 3;
    const b3 = b * 3;
    const ax = positions[a3] + displacements[a3];
    const ay = positions[a3 + 1] + displacements[a3 + 1];
    const az = positions[a3 + 2] + displacements[a3 + 2];
    const bx = positions[b3] + displacements[b3];
    const by = positions[b3 + 1] + displacements[b3 + 1];
    const bz = positions[b3 + 2] + displacements[b3 + 2];
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const currentLength = Math.max(1e-9, vecLength(dx, dy, dz));
    const stretch = currentLength - edges.restLength[i];
    totalStrainEnergy += 0.5 * edges.stiffness[i] * stretch * stretch;
  }

  const compliance = totalStrainEnergy;

  return {
    success: true,
    iterations,
    convergenceAchieved,
    finalObjectiveValue: compliance,
    deformedMesh,
    animation,
    stressField,
    displacements: toVec3Array(displacements, vertexCount),
    warnings,
    errors: [],
    performanceMetrics: {
      computeTime: end - start,
      memoryUsed: estimatedMB * 1024 * 1024,
    },
  };
};

export const solvePhysicsChunkedSync = (
  input: SolverInput,
  chunkSize: number,
  onProgress?: (progress: number, message: string) => void
): SolverResult => {
  const config = { ...input.config, chunkSize };
  return solvePhysicsFallback({ ...input, config }, onProgress);
};

export const solvePhysicsChunked = async (
  input: SolverInput,
  chunkSize: number,
  onProgress?: (progress: number, message: string) => void
): Promise<SolverResult> => {
  return solvePhysicsChunkedSync(input, chunkSize, onProgress);
};

export const initializeSolver = async () => {
  return;
};

export const cancelSolver = () => {
  return;
};
