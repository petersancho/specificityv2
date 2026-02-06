import { runSimp } from "./simp";
import type { SimpParams, SolverFrame, GoalMarkers } from "./types";
import type { RenderMesh } from "../../../types";

type WorkerOptions = {
  frameStride?: number;
  frameIntervalMs?: number;
};

type StartMessage = {
  type: "start";
  mesh: RenderMesh;
  markers: GoalMarkers;
  params: SimpParams;
  options?: WorkerOptions;
};

type ControlMessage = { type: "pause" | "resume" | "stop" };
type TuneMessage = { type: "tune"; params: Partial<SimpParams> };

type IncomingMessage = StartMessage | ControlMessage | TuneMessage;

type OutgoingMessage =
  | { type: "frame"; frame: SolverFrame }
  | { type: "done" }
  | { type: "error"; error: string };

let running = false;
let paused = false;
let stopRequested = false;
let resumeResolver: (() => void) | null = null;
let activeParams: SimpParams | null = null;

const waitForResume = () =>
  new Promise<void>((resolve) => {
    resumeResolver = resolve;
  });

type WorkerPort = {
  postMessage: (message: OutgoingMessage, transfer?: Transferable[]) => void;
};

const workerPort = self as unknown as WorkerPort;

const post = (message: OutgoingMessage, transfer?: Transferable[]) => {
  if (transfer && transfer.length > 0) {
    workerPort.postMessage(message, transfer);
  } else {
    workerPort.postMessage(message);
  }
};

const postFrame = (frame: SolverFrame) => {
  // CRITICAL: Copy densities before transferring to avoid detaching the solver's working array.
  // The solver reuses rhoPhysical across iterations, so transferring its buffer would break subsequent iterations.
  const densitiesCopy = new Float32Array(frame.densities);
  
  const safeFrame: SolverFrame = {
    ...frame,
    densities: densitiesCopy,
  };
  
  post({ type: "frame", frame: safeFrame }, [densitiesCopy.buffer]);
};

const run = async (mesh: RenderMesh, markers: GoalMarkers, params: SimpParams, options?: WorkerOptions) => {
  running = true;
  stopRequested = false;
  paused = false;
  activeParams = params;
  
  const frameStride = options?.frameStride ?? 1;
  const frameIntervalMs = options?.frameIntervalMs ?? 0;
  let lastFrameTime = 0;
  
  const shouldSendFrame = (iter: number): boolean => {
    if (frameStride > 1 && (iter % frameStride) !== 0) return false;
    if (frameIntervalMs > 0) {
      const now = performance.now();
      if (now - lastFrameTime < frameIntervalMs) return false;
      lastFrameTime = now;
    }
    return true;
  };
  
  try {
    for await (const frame of runSimp(mesh, markers, params)) {
      if (stopRequested) break;
      while (paused && !stopRequested) {
        await waitForResume();
      }
      if (stopRequested) break;
      
      // Only send frame if throttling allows it, or if converged
      if (shouldSendFrame(frame.iter) || frame.converged) {
        postFrame(frame);
      }
      
      if (frame.converged) break;
    }
    if (!stopRequested) {
      post({ type: "done" });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[SIMP WORKER] Error:', message);
    post({ type: "error", error: message });
  } finally {
    running = false;
    activeParams = null;
  }
};

self.onmessage = (event: MessageEvent<IncomingMessage>) => {
  const message = event.data;
  if (!message) return;

  if (message.type === "start") {
    if (running) {
      stopRequested = true;
      paused = false;
      if (resumeResolver) {
        resumeResolver();
        resumeResolver = null;
      }
    }
    run(message.mesh, message.markers, message.params, message.options);
    return;
  }

  if (message.type === "pause") {
    paused = true;
    return;
  }

  if (message.type === "resume") {
    paused = false;
    if (resumeResolver) {
      resumeResolver();
      resumeResolver = null;
    }
    return;
  }

  if (message.type === "stop") {
    stopRequested = true;
    paused = false;
    if (resumeResolver) {
      resumeResolver();
      resumeResolver = null;
    }
    return;
  }

  if (message.type === "tune") {
    if (activeParams && message.params) {
      Object.assign(activeParams, message.params);
    }
  }
};
