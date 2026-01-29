import type { RenderMesh, Vec3 } from "../../../types";
import type { GoalSpecification, SolverConfiguration, SolverInput, SolverResult, LoadGoal, StiffnessGoal, VolumeGoal, AnchorGoal } from "./types";

const DEFAULT_MEMORY_LIMIT_MB = 2048;

const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());

const length = (v: Vec3) => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);

const scale = (v: Vec3, factor: number): Vec3 => ({
  x: v.x * factor,
  y: v.y * factor,
  z: v.z * factor,
});

const add = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});

const estimateMeshMemoryMB = (mesh: RenderMesh) => {
  const byteCount =
    (mesh.positions.length + mesh.normals.length + mesh.uvs.length + mesh.indices.length) * 8;
  return byteCount / (1024 * 1024);
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

const applyDisplacements = (
  mesh: RenderMesh,
  displacements: Vec3[],
  chunkSize: number
): RenderMesh => {
  const positions = mesh.positions.slice();
  const vertexCount = Math.floor(positions.length / 3);
  const safeChunk = Math.max(1, Math.floor(chunkSize));
  for (let start = 0; start < vertexCount; start += safeChunk) {
    const end = Math.min(vertexCount, start + safeChunk);
    for (let i = start; i < end; i += 1) {
      const disp = displacements[i];
      if (!disp) continue;
      const idx = i * 3;
      positions[idx] += disp.x;
      positions[idx + 1] += disp.y;
      positions[idx + 2] += disp.z;
    }
  }
  return { ...mesh, positions };
};

const buildStressField = (mesh: RenderMesh, displacements: Vec3[]) => {
  const indices = mesh.indices;
  if (!indices || indices.length < 3) {
    return displacements.map((disp) => length(disp));
  }
  const field: number[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    const a = displacements[indices[i]] ?? { x: 0, y: 0, z: 0 };
    const b = displacements[indices[i + 1]] ?? { x: 0, y: 0, z: 0 };
    const c = displacements[indices[i + 2]] ?? { x: 0, y: 0, z: 0 };
    field.push((length(a) + length(b) + length(c)) / 3);
  }
  return field;
};

const buildAnimation = (
  mesh: RenderMesh,
  displacements: Vec3[],
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
    const frameDisplacements = displacements.map((disp) => scale(disp, factor));
    frames.push(applyDisplacements(mesh, frameDisplacements, chunkSize));
    timeStamps.push(t);
  }
  return { frames, timeStamps };
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
  return weighted / totalWeight;
};

const resolveDensity = (goals: GoalSpecification[]) => {
  const volumeGoal = goals.find(
    (goal): goal is VolumeGoal => goal.goalType === "volume"
  );
  return volumeGoal?.parameters.materialDensity ?? 7850;
};

const buildDisplacements = (
  mesh: RenderMesh,
  goals: GoalSpecification[],
  chunkSize: number
) => {
  const vertexCount = Math.floor(mesh.positions.length / 3);
  const displacements: Vec3[] = new Array(vertexCount)
    .fill(null)
    .map(() => ({ x: 0, y: 0, z: 0 }));

  const stiffness = resolveStiffness(goals);
  const density = resolveDensity(goals);
  const compliance = 1 / Math.max(1e6, stiffness);
  const densityScale = 1 / Math.max(1, density / 1000);

  const loadGoals = goals.filter((goal): goal is LoadGoal => goal.goalType === "load");
  loadGoals.forEach((goal) => {
    const points = goal.parameters.applicationPoints ?? [];
    if (points.length === 0) return;
    const perPoint = goal.parameters.distributed
      ? scale(goal.parameters.force, 1 / points.length)
      : goal.parameters.force;
    const scaled = scale(perPoint, compliance * densityScale);
    points.forEach((index) => {
      if (index < 0 || index >= vertexCount) return;
      displacements[index] = add(displacements[index], scaled);
    });
  });

  const anchorGoals = goals.filter((goal): goal is AnchorGoal => goal.goalType === "anchor");
  const anchored = new Set<number>();
  anchorGoals.forEach((goal) => {
    goal.geometry.elements.forEach((index) => {
      if (index < 0 || index >= vertexCount) return;
      anchored.add(index);
    });
  });

  anchored.forEach((index) => {
    displacements[index] = { x: 0, y: 0, z: 0 };
  });

  const safeChunk = Math.max(1, Math.floor(chunkSize));
  for (let start = 0; start < vertexCount; start += safeChunk) {
    const end = Math.min(vertexCount, start + safeChunk);
    for (let i = start; i < end; i += 1) {
      const disp = displacements[i];
      if (!disp) continue;
      if (!Number.isFinite(disp.x) || !Number.isFinite(disp.y) || !Number.isFinite(disp.z)) {
        displacements[i] = { x: 0, y: 0, z: 0 };
      }
    }
  }

  return displacements;
};

export const solvePhysicsFallback = (
  input: SolverInput,
  onProgress?: (progress: number, message: string) => void
): SolverResult => {
  const start = now();
  const { mesh, goals, config } = input;
  const warnings: string[] = [
    "C++ solver unavailable - using simplified fallback computation.",
  ];

  const memoryLimit = config.safetyLimits.memoryLimitMB ?? DEFAULT_MEMORY_LIMIT_MB;
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
  onProgress?.(0.1, "Preparing fallback solver");
  const displacements = buildDisplacements(mesh, goals, chunkSize);
  onProgress?.(0.6, "Applying displacements");
  const deformedMesh = applyDisplacements(mesh, displacements, chunkSize);
  const stressField = buildStressField(mesh, displacements);

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

  const maxDisp = displacements.reduce(
    (max, disp) => Math.max(max, length(disp)),
    0
  );

  if (maxDisp > config.safetyLimits.maxDeformation) {
    warnings.push(
      "Deformation exceeds specified limits - results may be unrealistic."
    );
  }

  const maxStress = stressField.reduce((max, value) => Math.max(max, value), 0);
  if (maxStress > config.safetyLimits.maxStress) {
    warnings.push("Stress exceeds specified limits - structure may be failing.");
  }

  onProgress?.(1, "Complete");
  const end = now();

  return {
    success: true,
    iterations: Math.min(config.maxIterations, 25),
    convergenceAchieved: true,
    finalObjectiveValue: 0,
    deformedMesh,
    animation,
    stressField,
    displacements,
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
