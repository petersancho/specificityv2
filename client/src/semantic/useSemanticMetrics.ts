import { useMemo } from "react";
import { useSemanticTraceStore } from "./semanticTraceStore";

export type SemanticOpMetrics = {
  count: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  errors: number;
  successRate: number;
};

export type SemanticMetricsResult = {
  totals: Record<string, SemanticOpMetrics>;
  events: any[];
  totalOperations: number;
  totalDuration: number;
  totalErrors: number;
};

export function useSemanticMetrics(params: { nodeId: string; runId: string }): SemanticMetricsResult {
  const { events } = useSemanticTraceStore();

  return useMemo(() => {
    const filtered = events.filter(e => e.nodeId === params.nodeId && e.runId === params.runId);

    const stacks: Record<string, number[]> = {};
    const durations: Record<string, number[]> = {};
    const totals: Record<string, SemanticOpMetrics> = {};

    for (const e of filtered) {
      if (!totals[e.opId]) {
        totals[e.opId] = {
          count: 0,
          totalMs: 0,
          avgMs: 0,
          minMs: Infinity,
          maxMs: 0,
          errors: 0,
          successRate: 100,
        };
      }

      stacks[e.opId] ??= [];
      durations[e.opId] ??= [];

      if (e.phase === "start") {
        stacks[e.opId].push(e.t);
      }
      
      if (e.phase === "end") {
        const start = stacks[e.opId].pop();
        totals[e.opId].count += 1;
        
        if (e.ok === false) {
          totals[e.opId].errors += 1;
        }
        
        if (start != null) {
          const duration = e.t - start;
          durations[e.opId].push(duration);
          totals[e.opId].totalMs += duration;
          totals[e.opId].minMs = Math.min(totals[e.opId].minMs, duration);
          totals[e.opId].maxMs = Math.max(totals[e.opId].maxMs, duration);
        }
      }
    }

    for (const opId in totals) {
      const metrics = totals[opId];
      if (metrics.count > 0) {
        metrics.avgMs = metrics.totalMs / metrics.count;
        metrics.successRate = ((metrics.count - metrics.errors) / metrics.count) * 100;
      }
      if (metrics.minMs === Infinity) {
        metrics.minMs = 0;
      }
    }

    const totalOperations = Object.values(totals).reduce((sum, m) => sum + m.count, 0);
    const totalDuration = Object.values(totals).reduce((sum, m) => sum + m.totalMs, 0);
    const totalErrors = Object.values(totals).reduce((sum, m) => sum + m.errors, 0);

    return { 
      totals, 
      events: filtered,
      totalOperations,
      totalDuration,
      totalErrors,
    };
  }, [events, params.nodeId, params.runId]);
}
