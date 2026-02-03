import { runSimp } from "./simp";
import type { SimpParams, SolverFrame, GoalMarkers } from "./types";
import type { RenderMesh } from "../../../types";

type StartMessage = {
  type: "start";
  mesh: RenderMesh;
  markers: GoalMarkers;
  params: SimpParams;
};

type ControlMessage = { type: "pause" | "resume" | "stop" };

type IncomingMessage = StartMessage | ControlMessage;

type OutgoingMessage =
  | { type: "frame"; frame: SolverFrame }
  | { type: "done" }
  | { type: "error"; error: string };

let running = false;
let paused = false;
let stopRequested = false;
let resumeResolver: (() => void) | null = null;

const waitForResume = () =>
  new Promise<void>((resolve) => {
    resumeResolver = resolve;
  });

const post = (message: OutgoingMessage) => {
  self.postMessage(message);
};

const run = async (mesh: RenderMesh, markers: GoalMarkers, params: SimpParams) => {
  running = true;
  stopRequested = false;
  paused = false;
  try {
    for await (const frame of runSimp(mesh, markers, params)) {
      if (stopRequested) break;
      while (paused && !stopRequested) {
        await waitForResume();
      }
      if (stopRequested) break;
      post({ type: "frame", frame });
      if (frame.converged) break;
    }
    if (!stopRequested) {
      post({ type: "done" });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    post({ type: "error", error: message });
  } finally {
    running = false;
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
    run(message.mesh, message.markers, message.params);
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
  }
};
