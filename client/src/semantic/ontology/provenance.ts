/**
 * Provenance Trace System
 *
 * Captures runtime execution traces for:
 * - Debugging and replay
 * - Agent learning from execution patterns
 * - Performance profiling
 * - Reproducibility verification
 */

import type { TraceEntry, SessionTrace } from './types'

// =============================================================================
// TRACE STORE
// =============================================================================

/**
 * In-memory trace store for the current session
 */
class ProvenanceStore {
  private currentSession: SessionTrace | null = null
  private sessions: Map<string, SessionTrace> = new Map()
  private maxEntries: number = 10000

  /** Start a new trace session */
  startSession(metadata?: Record<string, unknown>): string {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    this.currentSession = {
      sessionId,
      startTime: Date.now(),
      entries: [],
      metadata,
    }
    return sessionId
  }

  /** End the current session */
  endSession(): SessionTrace | null {
    if (!this.currentSession) return null
    this.currentSession.endTime = Date.now()
    const session = this.currentSession
    this.sessions.set(session.sessionId, session)
    this.currentSession = null
    return session
  }

  /** Get current session */
  getCurrentSession(): SessionTrace | null {
    return this.currentSession
  }

  /** Add a trace entry to the current session */
  addEntry(entry: Omit<TraceEntry, 'id'>): TraceEntry {
    if (!this.currentSession) {
      this.startSession()
    }

    const fullEntry: TraceEntry = {
      ...entry,
      id: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    }

    // Enforce max entries
    if (this.currentSession!.entries.length >= this.maxEntries) {
      this.currentSession!.entries.shift()
    }

    this.currentSession!.entries.push(fullEntry)
    return fullEntry
  }

  /** Get session by ID */
  getSession(sessionId: string): SessionTrace | undefined {
    return this.sessions.get(sessionId)
  }

  /** List all session IDs */
  listSessions(): string[] {
    return Array.from(this.sessions.keys())
  }

  /** Clear all sessions */
  clear(): void {
    this.currentSession = null
    this.sessions.clear()
  }

  /** Export all sessions to JSON */
  exportAll(): SessionTrace[] {
    return Array.from(this.sessions.values())
  }
}

/** Global provenance store instance */
export const provenanceStore = new ProvenanceStore()

// =============================================================================
// TRACE WRAPPER
// =============================================================================

/**
 * Options for tracing an operation
 */
export interface TraceOptions {
  /** Override operation ID */
  opId?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
  /** Parent trace IDs for dependency tracking */
  parents?: string[]
  /** Random seed if operation uses randomness */
  seed?: number
}

/**
 * Wrap a function to capture provenance traces
 *
 * @param opId - Operation ID
 * @param fn - Function to wrap
 * @returns Wrapped function that captures traces
 *
 * @example
 * ```ts
 * const tracedAdd = withTrace('math.add', (a: number, b: number) => a + b)
 * const result = tracedAdd(2, 3) // Captures trace entry
 * ```
 */
export function withTrace<TArgs extends unknown[], TResult>(
  opId: string,
  fn: (...args: TArgs) => TResult
): (...args: TArgs) => TResult {
  return (...args: TArgs): TResult => {
    const startTime = Date.now()
    let result: TResult | undefined
    let error: string | undefined

    try {
      result = fn(...args)
      return result
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      throw e
    } finally {
      const duration = Date.now() - startTime
      provenanceStore.addEntry({
        opId,
        timestamp: startTime,
        duration,
        inputs: argsToRecord(args),
        outputs: error ? undefined : { result },
        deterministic: true, // Default, can be overridden
        error,
      })
    }
  }
}

/**
 * Wrap an async function to capture provenance traces
 */
export function withTraceAsync<TArgs extends unknown[], TResult>(
  opId: string,
  fn: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const startTime = Date.now()
    let result: TResult | undefined
    let error: string | undefined

    try {
      result = await fn(...args)
      return result
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      throw e
    } finally {
      const duration = Date.now() - startTime
      provenanceStore.addEntry({
        opId,
        timestamp: startTime,
        duration,
        inputs: argsToRecord(args),
        outputs: error ? undefined : { result },
        deterministic: true,
        error,
      })
    }
  }
}

/**
 * Manually record a trace entry
 *
 * @example
 * ```ts
 * recordTrace('geometry.createBox', { width: 10, height: 5 }, { mesh: meshResult })
 * ```
 */
export function recordTrace(
  opId: string,
  inputs: Record<string, unknown>,
  outputs?: Record<string, unknown>,
  options?: TraceOptions
): TraceEntry {
  return provenanceStore.addEntry({
    opId: options?.opId || opId,
    timestamp: Date.now(),
    duration: 0, // Instant trace (manual recording)
    inputs,
    outputs,
    deterministic: true,
    parents: options?.parents,
    seed: options?.seed,
    metadata: options?.metadata,
  })
}

// =============================================================================
// TRACE ANALYSIS
// =============================================================================

/**
 * Analyze traces to find operation patterns
 */
export interface TraceAnalysis {
  /** Total number of traces */
  totalTraces: number
  /** Traces per operation */
  byOperation: Record<string, number>
  /** Average duration per operation (ms) */
  avgDuration: Record<string, number>
  /** Error rate per operation */
  errorRate: Record<string, number>
  /** Most common operation sequences */
  commonSequences: { sequence: string[]; count: number }[]
}

/**
 * Analyze a trace session
 */
export function analyzeSession(session: SessionTrace): TraceAnalysis {
  const byOperation: Record<string, number> = {}
  const totalDuration: Record<string, number> = {}
  const errorCount: Record<string, number> = {}

  for (const entry of session.entries) {
    byOperation[entry.opId] = (byOperation[entry.opId] || 0) + 1
    totalDuration[entry.opId] = (totalDuration[entry.opId] || 0) + (entry.duration || 0)
    if (entry.error) {
      errorCount[entry.opId] = (errorCount[entry.opId] || 0) + 1
    }
  }

  const avgDuration: Record<string, number> = {}
  const errorRate: Record<string, number> = {}
  for (const opId of Object.keys(byOperation)) {
    avgDuration[opId] = totalDuration[opId] / byOperation[opId]
    errorRate[opId] = (errorCount[opId] || 0) / byOperation[opId]
  }

  // Find common 3-operation sequences
  const sequences: Record<string, number> = {}
  for (let i = 0; i < session.entries.length - 2; i++) {
    const seq = [
      session.entries[i].opId,
      session.entries[i + 1].opId,
      session.entries[i + 2].opId,
    ]
    const key = seq.join(' → ')
    sequences[key] = (sequences[key] || 0) + 1
  }

  const commonSequences = Object.entries(sequences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => ({ sequence: key.split(' → '), count }))

  return {
    totalTraces: session.entries.length,
    byOperation,
    avgDuration,
    errorRate,
    commonSequences,
  }
}

// =============================================================================
// EXPORT FORMATS
// =============================================================================

/**
 * Export session to JSON Lines format (for streaming/large datasets)
 */
export function toJSONLines(session: SessionTrace): string {
  return session.entries.map((e) => JSON.stringify(e)).join('\n')
}

/**
 * Export session to DOT format for visualization
 */
export function toDependencyDOT(session: SessionTrace): string {
  const lines: string[] = ['digraph Provenance {', '  rankdir=TB;']

  // Add nodes
  for (const entry of session.entries) {
    const label = `${entry.opId}\\n${entry.duration || 0}ms`
    const color = entry.error ? 'red' : 'black'
    lines.push(`  "${entry.id}" [label="${label}" color="${color}"];`)
  }

  // Add edges from parents
  for (const entry of session.entries) {
    if (entry.parents) {
      for (const parentId of entry.parents) {
        lines.push(`  "${parentId}" -> "${entry.id}";`)
      }
    }
  }

  lines.push('}')
  return lines.join('\n')
}

// =============================================================================
// HELPERS
// =============================================================================

/** Convert function arguments to a record */
function argsToRecord(args: unknown[]): Record<string, unknown> {
  const record: Record<string, unknown> = {}
  for (let i = 0; i < args.length; i++) {
    record[`arg${i}`] = args[i]
  }
  return record
}
