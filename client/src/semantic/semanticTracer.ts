import { pushSemanticEvent } from "./semanticTraceStore";

export function semanticOpStart(params: { nodeId: string; runId: string; opId: string }) {
  pushSemanticEvent({
    ...params,
    phase: "start",
    t: performance.now(),
  });
}

export function semanticOpEnd(params: { nodeId: string; runId: string; opId: string; ok: boolean; error?: string }) {
  pushSemanticEvent({
    ...params,
    phase: "end",
    t: performance.now(),
  });
}

export async function withSemanticOp<T>(
  params: { nodeId: string; runId: string; opId: string },
  fn: () => Promise<T>
): Promise<T> {
  semanticOpStart(params);
  try {
    const res = await fn();
    semanticOpEnd({ ...params, ok: true });
    return res;
  } catch (e: any) {
    semanticOpEnd({ ...params, ok: false, error: String(e?.message ?? e) });
    throw e;
  }
}

export function withSemanticOpSync<T>(
  params: { nodeId: string; runId: string; opId: string },
  fn: () => T
): T {
  semanticOpStart(params);
  try {
    const res = fn();
    semanticOpEnd({ ...params, ok: true });
    return res;
  } catch (e: any) {
    semanticOpEnd({ ...params, ok: false, error: String(e?.message ?? e) });
    throw e;
  }
}
