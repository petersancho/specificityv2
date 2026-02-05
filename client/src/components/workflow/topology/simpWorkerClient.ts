import type { RenderMesh } from "../../../types";
import type { SimpParams, SolverFrame, GoalMarkers } from "./types";

type WorkerIncomingMessage =
  | { type: "start"; mesh: RenderMesh; markers: GoalMarkers; params: SimpParams; options?: WorkerOptions }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "stop" };

type WorkerOutgoingMessage =
  | { type: "frame"; frame: SolverFrame }
  | { type: "done" }
  | { type: "error"; error: string };

export type SimpWorkerStatus = "idle" | "running" | "paused" | "converged" | "error";

export type FrameCallback = (frame: SolverFrame) => void;
export type DoneCallback = () => void;
export type ErrorCallback = (error: string) => void;

export interface WorkerOptions {
  frameStride?: number;      // Send frame every N iterations (default: 1)
  frameIntervalMs?: number;  // Minimum ms between frames (default: 0)
}

export class SimpWorkerClient {
  private worker: Worker | null = null;
  private status: SimpWorkerStatus = "idle";
  private onFrameCallback: FrameCallback | null = null;
  private onDoneCallback: DoneCallback | null = null;
  private onErrorCallback: ErrorCallback | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof Worker === "undefined") {
      console.error("[SIMP WORKER] Web Workers not supported");
      return;
    }

    try {
      this.worker = new Worker(
        new URL("./simpWorker.ts", import.meta.url),
        { type: "module" }
      );

      this.worker.onmessage = (event: MessageEvent<WorkerOutgoingMessage>) => {
        const message = event.data;

        if (message.type === "frame") {
          this.onFrameCallback?.(message.frame);
        } else if (message.type === "done") {
          this.status = "converged";
          this.onDoneCallback?.();
        } else if (message.type === "error") {
          this.status = "error";
          this.onErrorCallback?.(message.error);
        }
      };

      this.worker.onerror = (error) => {
        console.error("[SIMP WORKER] Worker error:", error);
        this.status = "error";
        this.onErrorCallback?.(error.message || "Unknown worker error");
      };
    } catch (error) {
      console.error("[SIMP WORKER] Failed to create worker:", error);
    }
  }

  start(
    mesh: RenderMesh,
    markers: GoalMarkers,
    params: SimpParams,
    callbacks: {
      onFrame: FrameCallback;
      onDone: DoneCallback;
      onError: ErrorCallback;
    },
    options?: WorkerOptions
  ) {
    if (!this.worker) {
      callbacks.onError("Worker not initialized");
      return;
    }

    this.onFrameCallback = callbacks.onFrame;
    this.onDoneCallback = callbacks.onDone;
    this.onErrorCallback = callbacks.onError;
    this.status = "running";

    const message: WorkerIncomingMessage = {
      type: "start",
      mesh,
      markers,
      params,
      options,
    };

    this.worker.postMessage(message);
  }

  pause() {
    if (!this.worker || this.status !== "running") return;
    this.status = "paused";
    this.worker.postMessage({ type: "pause" });
  }

  resume() {
    if (!this.worker || this.status !== "paused") return;
    this.status = "running";
    this.worker.postMessage({ type: "resume" });
  }

  stop() {
    if (!this.worker) return;
    this.worker.postMessage({ type: "stop" });
    this.status = "idle";
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.status = "idle";
    this.onFrameCallback = null;
    this.onDoneCallback = null;
    this.onErrorCallback = null;
  }

  getStatus(): SimpWorkerStatus {
    return this.status;
  }
}
