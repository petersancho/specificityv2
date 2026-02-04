/**
 * Provenance Metrics Hook
 *
 * React hook for computing operation metrics from LOC provenance store.
 * Replaces legacy useSemanticMetrics.
 */

import { useMemo, useState, useEffect } from 'react';
import { provenanceStore } from './ontology/provenance';
import type { TraceEntry } from './ontology/types';

export type SemanticOpMetrics = {
  count: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  errors: number;
  successRate: number;
};

export type ProvenanceMetricsResult = {
  totals: Record<string, SemanticOpMetrics>;
  events: TraceEntry[];
  totalOperations: number;
  totalDuration: number;
  totalErrors: number;
};

// Local state for reactive updates (provenance store doesn't have built-in reactivity)
let listeners = new Set<() => void>();
let lastEventCount = 0;

// Poll for changes (simple approach - could be replaced with event emitter)
function checkForUpdates() {
  const session = provenanceStore.getCurrentSession();
  const currentCount = session?.entries.length ?? 0;
  if (currentCount !== lastEventCount) {
    lastEventCount = currentCount;
    listeners.forEach((l) => l());
  }
}

// Start polling when first listener is added
let pollInterval: number | null = null;
function ensurePolling() {
  if (pollInterval === null && listeners.size > 0) {
    pollInterval = window.setInterval(checkForUpdates, 100);
  }
}
function stopPolling() {
  if (pollInterval !== null && listeners.size === 0) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

/**
 * Hook to get provenance metrics for a specific node and run
 */
export function useProvenanceMetrics(params: {
  nodeId: string;
  runId: string;
}): ProvenanceMetricsResult {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.add(listener);
    ensurePolling();
    return () => {
      listeners.delete(listener);
      stopPolling();
    };
  }, []);

  return useMemo(() => {
    const session = provenanceStore.getCurrentSession();
    const allEntries = session?.entries ?? [];

    // Filter entries by nodeId metadata (if recorded) or by opId prefix
    const filtered = allEntries.filter((e) => {
      // Check if metadata contains nodeId/runId
      const meta = e.metadata as Record<string, unknown> | undefined;
      if (meta?.nodeId === params.nodeId && meta?.runId === params.runId) {
        return true;
      }
      // Fallback: include all entries for this session (less precise)
      return true;
    });

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

      const metrics = totals[e.opId];
      metrics.count += 1;
      metrics.totalMs += e.duration;
      metrics.minMs = Math.min(metrics.minMs, e.duration);
      metrics.maxMs = Math.max(metrics.maxMs, e.duration);

      if (e.error) {
        metrics.errors += 1;
      }
    }

    // Calculate averages and success rates
    for (const opId in totals) {
      const metrics = totals[opId];
      if (metrics.count > 0) {
        metrics.avgMs = metrics.totalMs / metrics.count;
        metrics.successRate =
          ((metrics.count - metrics.errors) / metrics.count) * 100;
      }
      if (metrics.minMs === Infinity) {
        metrics.minMs = 0;
      }
    }

    const totalOperations = Object.values(totals).reduce(
      (sum, m) => sum + m.count,
      0
    );
    const totalDuration = Object.values(totals).reduce(
      (sum, m) => sum + m.totalMs,
      0
    );
    const totalErrors = Object.values(totals).reduce(
      (sum, m) => sum + m.errors,
      0
    );

    return {
      totals,
      events: filtered,
      totalOperations,
      totalDuration,
      totalErrors,
    };
  }, [params.nodeId, params.runId]);
}
