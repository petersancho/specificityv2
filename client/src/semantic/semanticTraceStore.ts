import { useState, useEffect } from 'react';

export type SemanticOpEvent = {
  nodeId: string;
  runId: string;
  opId: string;
  phase: "start" | "end";
  t: number;
  ok?: boolean;
  error?: string;
};

type SemanticTraceState = {
  events: SemanticOpEvent[];
};

const state: SemanticTraceState = {
  events: [],
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

export function pushSemanticEvent(event: SemanticOpEvent) {
  state.events.push(event);
  notifyListeners();
}

export function clearSemanticRun(runId: string) {
  state.events = state.events.filter(e => e.runId !== runId);
  notifyListeners();
}

export function getSemanticEvents(): SemanticOpEvent[] {
  return state.events;
}

export function useSemanticTraceStore() {
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  
  return {
    events: state.events,
    push: pushSemanticEvent,
    clearRun: clearSemanticRun,
  };
}
