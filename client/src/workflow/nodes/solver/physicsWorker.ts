import type { SolverInput, SolverResult } from "./types";
import { solvePhysicsFallback } from "./solverInterface";

type SolveMessage = {
  type: "solve";
  requestId: number;
  payload: SolverInput;
};

type WorkerMessage = SolveMessage;

type ResultMessage = {
  type: "result";
  requestId: number;
  payload: SolverResult;
};

type ErrorMessage = {
  type: "error";
  requestId: number;
  error: string;
};

type WorkerResponse = ResultMessage | ErrorMessage;

declare const self: Worker;
const ctx = self as unknown as Worker;

ctx.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (!message || message.type !== "solve") return;
  const { requestId, payload } = message;
  try {
    const result = solvePhysicsFallback(payload);
    ctx.postMessage({ type: "result", requestId, payload: result } satisfies WorkerResponse);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    ctx.postMessage({ type: "error", requestId, error: errorMessage } satisfies WorkerResponse);
  }
};
