import type { RenderMesh } from "../../../types";
import type { GoalSpecification, SolverConfiguration, SolverInput, SolverResult } from "./types";
import { solvePhysicsChunkedSync } from "./solverInterface";
import { useProjectStore } from "../../../store/useProjectStore";

export type PhysicsWorkerStatus = "idle" | "running" | "complete" | "error";

export type PhysicsWorkerSolveResponse = {
  result: SolverResult;
  status: PhysicsWorkerStatus;
  computeMode: "worker" | "cpu-fallback";
  gpuAvailable: boolean;
};

type WorkerMessage =
  | { type: "result"; requestId: number; payload: SolverResult }
  | { type: "error"; requestId: number; error: string };

type PhysicsWorkerState = {
  worker: Worker | null;
  requestId: number;
  inFlightRequestId: number | null;
  inFlightSignature: string | null;
  lastSignature: string | null;
  lastResult: SolverResult | null;
  status: PhysicsWorkerStatus;
  lastError: string | null;
};

const statesByNode = new Map<string, PhysicsWorkerState>();

const createPendingResult = (warning: string): SolverResult => ({
  success: false,
  iterations: 0,
  convergenceAchieved: false,
  finalObjectiveValue: 0,
  warnings: [warning],
  errors: [],
  performanceMetrics: { computeTime: 0, memoryUsed: 0 },
});

const getState = (nodeId: string): PhysicsWorkerState => {
  const existing = statesByNode.get(nodeId);
  if (existing) return existing;
  const created: PhysicsWorkerState = {
    worker: null,
    requestId: 0,
    inFlightRequestId: null,
    inFlightSignature: null,
    lastSignature: null,
    lastResult: null,
    status: "idle",
    lastError: null,
  };
  statesByNode.set(nodeId, created);
  return created;
};

const hasGpuSupport = () =>
  typeof navigator !== "undefined" && Boolean((navigator as Navigator & { gpu?: unknown }).gpu);

const canUseWorker = () => typeof Worker !== "undefined";

const hashArraySample = (values: ArrayLike<number> | null | undefined, samples = 12) => {
  if (!values || values.length === 0) return "0";
  const len = values.length;
  const step = Math.max(1, Math.floor(len / samples));
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < len; i += step) {
    const value = Number(values[i] ?? 0);
    if (!Number.isFinite(value)) continue;
    sum += value;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const first = Number(values[0] ?? 0);
  const mid = Number(values[Math.floor(len / 2)] ?? 0);
  const last = Number(values[len - 1] ?? 0);
  const safe = (value: number) => (Number.isFinite(value) ? value.toFixed(3) : "0");
  return `${len}|${safe(sum)}|${safe(min)}|${safe(max)}|${safe(first)}|${safe(mid)}|${safe(last)}`;
};

const hashParamValue = (value: unknown): string => {
  if (typeof value === "number") return Number.isFinite(value) ? value.toFixed(6) : "nan";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return `arr:${hashArraySample(value)}`;
  if (value && typeof value === "object") {
    const candidate = value as { x?: unknown; y?: unknown; z?: unknown };
    if (typeof candidate.x === "number" && typeof candidate.y === "number" && typeof candidate.z === "number") {
      return `vec:${hashParamValue(candidate.x)}|${hashParamValue(candidate.y)}|${hashParamValue(candidate.z)}`;
    }
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const entries = keys.map((key) => `${key}:${hashParamValue((value as Record<string, unknown>)[key])}`);
    return `{${entries.join(",")}}`;
  }
  return "";
};

const buildSolveSignature = (
  mesh: RenderMesh,
  goals: GoalSpecification[],
  config: SolverConfiguration
) => {
  const meshKey = [
    hashArraySample(mesh.positions),
    hashArraySample(mesh.indices),
    mesh.normals.length,
    mesh.uvs.length,
  ].join("|");
  const goalsKey = goals
    .map((goal) => {
      const elements = goal.geometry?.elements ?? [];
      const params = goal.parameters ?? {};
      return [
        goal.goalType,
        goal.weight,
        goal.target ?? "",
        hashArraySample(elements),
        hashParamValue(goal.constraint ?? {}),
        hashParamValue(params),
      ].join(":");
    })
    .join(";");
  const configKey = [
    config.maxIterations,
    config.convergenceTolerance,
    config.analysisType,
    config.timeStep ?? "",
    config.animationFrames ?? "",
    config.chunkSize,
    config.safetyLimits.maxDeformation,
    config.safetyLimits.maxStress,
    config.safetyLimits.memoryLimitMB ?? "",
  ].join("|");
  return `${meshKey}::${goalsKey}::${configKey}`;
};

const setupWorker = (nodeId: string, state: PhysicsWorkerState) => {
  const worker = new Worker(new URL("./physicsWorker.ts", import.meta.url), {
    type: "module",
  });
  worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const message = event.data;
    if (!message || typeof message.requestId !== "number") return;
    if (message.requestId !== state.inFlightRequestId) return;
    state.inFlightRequestId = null;
    const completedSignature = state.inFlightSignature;
    state.inFlightSignature = null;
    if (message.type === "result") {
      state.lastResult = message.payload;
      state.lastSignature = completedSignature ?? state.lastSignature;
      state.status = "complete";
      state.lastError = null;
    } else if (message.type === "error") {
      state.status = "error";
      state.lastError = message.error;
    }
    useProjectStore.getState().recalculateWorkflow();
  };
  worker.onerror = (event) => {
    state.inFlightRequestId = null;
    state.inFlightSignature = null;
    state.status = "error";
    state.lastError = event?.message ?? "Physics worker failed.";
    useProjectStore.getState().recalculateWorkflow();
  };
  state.worker = worker;
};

export const solvePhysicsWithWorker = (args: {
  nodeId: string;
  mesh: RenderMesh;
  goals: GoalSpecification[];
  config: SolverConfiguration;
}): PhysicsWorkerSolveResponse => {
  const { nodeId, mesh, goals, config } = args;
  const gpuAvailable = hasGpuSupport();
  if (!canUseWorker()) {
    const result = solvePhysicsChunkedSync({ mesh, goals, config }, config.chunkSize);
    return { result, status: "complete", computeMode: "cpu-fallback", gpuAvailable };
  }

  const state = getState(nodeId);
  const signature = buildSolveSignature(mesh, goals, config);

  if (state.lastSignature === signature && state.lastResult) {
    return { result: state.lastResult, status: state.status, computeMode: "worker", gpuAvailable };
  }

  if (state.inFlightSignature === signature) {
    const pending =
      state.lastResult ??
      createPendingResult(
        gpuAvailable
          ? "Physics solver running on worker thread (GPU available)."
          : "Physics solver running on worker thread."
      );
    return { result: pending, status: "running", computeMode: "worker", gpuAvailable };
  }

  if (state.inFlightSignature && state.inFlightSignature !== signature) {
    state.worker?.terminate();
    state.worker = null;
    state.inFlightSignature = null;
    state.inFlightRequestId = null;
  }

  if (!state.worker) {
    setupWorker(nodeId, state);
  }

  state.requestId += 1;
  state.inFlightRequestId = state.requestId;
  state.inFlightSignature = signature;
  state.status = "running";
  state.lastError = null;
  const payload: SolverInput = { mesh, goals, config };
  state.worker?.postMessage({ type: "solve", requestId: state.requestId, payload });

  const pending =
    state.lastResult ??
    createPendingResult(
      gpuAvailable
        ? "Physics solver running on worker thread (GPU available)."
        : "Physics solver running on worker thread."
    );
  return { result: pending, status: "running", computeMode: "worker", gpuAvailable };
};

export const runPhysicsWorkerSolve = async (
  input: SolverInput
): Promise<{ result: SolverResult; computeMode: "worker" | "cpu-fallback"; gpuAvailable: boolean }> => {
  const gpuAvailable = hasGpuSupport();
  if (!canUseWorker()) {
    return {
      result: solvePhysicsChunkedSync(input, input.config.chunkSize),
      computeMode: "cpu-fallback",
      gpuAvailable,
    };
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./physicsWorker.ts", import.meta.url), {
      type: "module",
    });
    const requestId = 1;
    const finalize = () => {
      worker.terminate();
    };
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (!message || message.requestId !== requestId) return;
      if (message.type === "result") {
        resolve({ result: message.payload, computeMode: "worker", gpuAvailable });
      } else {
        reject(new Error(message.error));
      }
      finalize();
    };
    worker.onerror = (event) => {
      finalize();
      reject(new Error(event?.message ?? "Physics worker failed."));
    };
    worker.postMessage({ type: "solve", requestId, payload: input });
  });
};
