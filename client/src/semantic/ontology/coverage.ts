/**
 * Coverage 2.0 - Multi-Dimensional Semantic Coverage Analysis
 *
 * Extends traditional coverage to measure:
 * - Operation coverage (% with v2 metadata)
 * - Schema coverage (% with input/output schemas)
 * - Example coverage (% with examples)
 * - Safety coverage (% with safety classifications)
 * - Agent readiness (% agent-invokable)
 * - Ontology integrity (% valid references)
 */

import { ontologyRegistry } from './registry'
import { migrateOpsModule } from './migration'
import type { Operation, SafetyClass } from './types'

// Import all operation modules for analysis
import * as mathOps from '../ops/mathOps'
import * as vectorOps from '../ops/vectorOps'
import * as logicOps from '../ops/logicOps'
import * as dataOps from '../ops/dataOps'
import * as stringOps from '../ops/stringOps'
import * as colorOps from '../ops/colorOps'
import * as geometryOps from '../ops/geometryOps'
import * as solverOps from '../ops/solverOps'
import * as workflowOps from '../ops/workflowOps'
import * as commandOps from '../ops/commandOps'

// =============================================================================
// COVERAGE METRICS
// =============================================================================

export interface CoverageMetrics {
  /** Overall coverage score (0-100) */
  overall: number

  /** Dimension scores */
  dimensions: {
    /** % operations migrated to LOC */
    operationCoverage: DimensionScore
    /** % operations with input/output schemas */
    schemaCoverage: DimensionScore
    /** % operations with examples */
    exampleCoverage: DimensionScore
    /** % operations with safety classifications */
    safetyCoverage: DimensionScore
    /** % operations with agent metadata (synonyms, prompts) */
    agentReadiness: DimensionScore
    /** % valid ontology references */
    ontologyIntegrity: DimensionScore
    /** % pure/deterministic operations */
    purityCoverage: DimensionScore
  }

  /** Operations by domain */
  byDomain: Record<string, DomainMetrics>

  /** Operations by safety class */
  bySafety: Record<SafetyClass, number>

  /** Operations missing v2 metadata */
  missingV2: string[]

  /** Operations missing schemas */
  missingSchemas: string[]

  /** Operations missing examples */
  missingExamples: string[]

  /** Ontology validation errors */
  validationErrors: string[]

  /** Timestamp */
  timestamp: string
}

export interface DimensionScore {
  /** Score (0-100) */
  score: number
  /** Count of items meeting criteria */
  covered: number
  /** Total items */
  total: number
}

export interface DomainMetrics {
  /** Domain name */
  domain: string
  /** Total operations */
  total: number
  /** With v2 metadata */
  withV2: number
  /** With schemas */
  withSchemas: number
  /** With examples */
  withExamples: number
  /** Pure operations */
  pure: number
  /** Deterministic operations */
  deterministic: number
}

// =============================================================================
// ANALYSIS
// =============================================================================

/**
 * Analyze semantic coverage across all dimensions
 */
export function analyzeCoverage(): CoverageMetrics {
  // Register all operations if not already done
  registerAllOps()

  const operations = ontologyRegistry.listOperations()
  const validationErrors = ontologyRegistry.validate().map((e) => e.message)

  // Dimension analysis
  let withSchemas = 0
  let withExamples = 0
  let withSafety = 0
  let withAgentMeta = 0
  let pureOps = 0
  let deterministicOps = 0

  const bySafety: Record<SafetyClass, number> = {
    safe: 0,
    idempotent: 0,
    stateful: 0,
    destructive: 0,
    external: 0,
  }

  const byDomain: Record<string, DomainMetrics> = {}

  const missingSchemas: string[] = []
  const missingExamples: string[] = []

  for (const op of operations) {
    // Schema coverage
    const hasInputs = op.inputs && op.inputs.length > 0
    const hasOutputs = op.outputs && op.outputs.length > 0
    if (hasInputs || hasOutputs) {
      withSchemas++
    } else {
      missingSchemas.push(op.id)
    }

    // Example coverage
    if (op.examples && op.examples.length > 0) {
      withExamples++
    } else {
      missingExamples.push(op.id)
    }

    // Safety coverage
    if (op.safety) {
      withSafety++
      bySafety[op.safety]++
    }

    // Agent readiness
    if (op.synonyms || op.canonicalPrompt) {
      withAgentMeta++
    }

    // Purity
    if (op.pure) pureOps++
    if (op.deterministic) deterministicOps++

    // Domain metrics
    if (!byDomain[op.domain]) {
      byDomain[op.domain] = {
        domain: op.domain,
        total: 0,
        withV2: 0,
        withSchemas: 0,
        withExamples: 0,
        pure: 0,
        deterministic: 0,
      }
    }
    const dm = byDomain[op.domain]
    dm.total++
    if (hasInputs || hasOutputs) dm.withSchemas++
    if (op.examples && op.examples.length > 0) dm.withExamples++
    if (op.pure) dm.pure++
    if (op.deterministic) dm.deterministic++
    // All migrated ops count as having v2 (since they're in the registry)
    dm.withV2++
  }

  const total = operations.length

  // Calculate dimension scores
  const operationCoverage: DimensionScore = {
    score: 100, // All ops are in registry
    covered: total,
    total,
  }

  const schemaCoverage: DimensionScore = {
    score: total > 0 ? (withSchemas / total) * 100 : 0,
    covered: withSchemas,
    total,
  }

  const exampleCoverage: DimensionScore = {
    score: total > 0 ? (withExamples / total) * 100 : 0,
    covered: withExamples,
    total,
  }

  const safetyCoverage: DimensionScore = {
    score: total > 0 ? (withSafety / total) * 100 : 0,
    covered: withSafety,
    total,
  }

  const agentReadiness: DimensionScore = {
    score: total > 0 ? (withAgentMeta / total) * 100 : 0,
    covered: withAgentMeta,
    total,
  }

  const ontologyIntegrity: DimensionScore = {
    score: validationErrors.length === 0 ? 100 : Math.max(0, 100 - validationErrors.length * 5),
    covered: total - validationErrors.length,
    total,
  }

  const purityCoverage: DimensionScore = {
    score: total > 0 ? (pureOps / total) * 100 : 0,
    covered: pureOps,
    total,
  }

  // Overall score (weighted average)
  const weights = {
    operationCoverage: 1.0,
    schemaCoverage: 0.8,
    exampleCoverage: 0.5,
    safetyCoverage: 1.0,
    agentReadiness: 0.3,
    ontologyIntegrity: 1.5,
    purityCoverage: 0.5,
  }

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
  const weightedSum =
    operationCoverage.score * weights.operationCoverage +
    schemaCoverage.score * weights.schemaCoverage +
    exampleCoverage.score * weights.exampleCoverage +
    safetyCoverage.score * weights.safetyCoverage +
    agentReadiness.score * weights.agentReadiness +
    ontologyIntegrity.score * weights.ontologyIntegrity +
    purityCoverage.score * weights.purityCoverage

  const overall = weightedSum / totalWeight

  return {
    overall,
    dimensions: {
      operationCoverage,
      schemaCoverage,
      exampleCoverage,
      safetyCoverage,
      agentReadiness,
      ontologyIntegrity,
      purityCoverage,
    },
    byDomain,
    bySafety,
    missingV2: [], // All ops are migrated
    missingSchemas,
    missingExamples,
    validationErrors,
    timestamp: new Date().toISOString(),
  }
}

// =============================================================================
// REPORTING
// =============================================================================

/**
 * Format coverage metrics as console output
 */
export function formatCoverageReport(metrics: CoverageMetrics): string {
  const lines: string[] = []

  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('                  SEMANTIC COVERAGE 2.0 REPORT                  ')
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('')
  lines.push(`Overall Score: ${metrics.overall.toFixed(1)}%`)
  lines.push('')
  lines.push('Dimension Scores:')
  lines.push('─────────────────────────────────────────────────────────────────')

  const dims = metrics.dimensions
  lines.push(formatDimension('Operation Coverage', dims.operationCoverage))
  lines.push(formatDimension('Schema Coverage', dims.schemaCoverage))
  lines.push(formatDimension('Example Coverage', dims.exampleCoverage))
  lines.push(formatDimension('Safety Coverage', dims.safetyCoverage))
  lines.push(formatDimension('Agent Readiness', dims.agentReadiness))
  lines.push(formatDimension('Ontology Integrity', dims.ontologyIntegrity))
  lines.push(formatDimension('Purity Coverage', dims.purityCoverage))

  lines.push('')
  lines.push('Coverage by Domain:')
  lines.push('─────────────────────────────────────────────────────────────────')

  for (const [domain, dm] of Object.entries(metrics.byDomain)) {
    const schemaRate = dm.total > 0 ? ((dm.withSchemas / dm.total) * 100).toFixed(0) : '0'
    const pureRate = dm.total > 0 ? ((dm.pure / dm.total) * 100).toFixed(0) : '0'
    lines.push(`  ${domain.padEnd(12)} │ ${dm.total.toString().padStart(3)} ops │ ${schemaRate.padStart(3)}% schemas │ ${pureRate.padStart(3)}% pure`)
  }

  lines.push('')
  lines.push('Safety Distribution:')
  lines.push('─────────────────────────────────────────────────────────────────')
  for (const [safety, count] of Object.entries(metrics.bySafety)) {
    if (count > 0) {
      lines.push(`  ${safety.padEnd(12)} │ ${count.toString().padStart(3)} ops`)
    }
  }

  if (metrics.validationErrors.length > 0) {
    lines.push('')
    lines.push('Validation Errors:')
    lines.push('─────────────────────────────────────────────────────────────────')
    for (const err of metrics.validationErrors.slice(0, 10)) {
      lines.push(`  ⚠ ${err}`)
    }
    if (metrics.validationErrors.length > 10) {
      lines.push(`  ... and ${metrics.validationErrors.length - 10} more`)
    }
  }

  lines.push('')
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push(`Generated: ${metrics.timestamp}`)

  return lines.join('\n')
}

function formatDimension(name: string, score: DimensionScore): string {
  const bar = progressBar(score.score, 20)
  return `  ${name.padEnd(22)} │ ${bar} │ ${score.score.toFixed(0).padStart(3)}% (${score.covered}/${score.total})`
}

function progressBar(percent: number, width: number): string {
  const filled = Math.round((percent / 100) * width)
  const empty = width - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

// =============================================================================
// CI GATE
// =============================================================================

export interface CoverageGate {
  /** Minimum overall score */
  minOverall: number
  /** Minimum safety coverage */
  minSafety: number
  /** Minimum ontology integrity */
  minIntegrity: number
  /** Maximum allowed validation errors */
  maxErrors: number
}

export const DEFAULT_GATES: CoverageGate = {
  minOverall: 60,
  minSafety: 80,
  minIntegrity: 95,
  maxErrors: 10,
}

/**
 * Check if coverage meets CI gates
 */
export function checkGates(
  metrics: CoverageMetrics,
  gates: CoverageGate = DEFAULT_GATES
): { passed: boolean; failures: string[] } {
  const failures: string[] = []

  if (metrics.overall < gates.minOverall) {
    failures.push(`Overall score ${metrics.overall.toFixed(1)}% < ${gates.minOverall}% required`)
  }

  if (metrics.dimensions.safetyCoverage.score < gates.minSafety) {
    failures.push(
      `Safety coverage ${metrics.dimensions.safetyCoverage.score.toFixed(1)}% < ${gates.minSafety}% required`
    )
  }

  if (metrics.dimensions.ontologyIntegrity.score < gates.minIntegrity) {
    failures.push(
      `Ontology integrity ${metrics.dimensions.ontologyIntegrity.score.toFixed(1)}% < ${gates.minIntegrity}% required`
    )
  }

  if (metrics.validationErrors.length > gates.maxErrors) {
    failures.push(
      `Validation errors ${metrics.validationErrors.length} > ${gates.maxErrors} allowed`
    )
  }

  return {
    passed: failures.length === 0,
    failures,
  }
}

// =============================================================================
// HELPERS
// =============================================================================

let opsRegistered = false

function registerAllOps(): void {
  if (opsRegistered) return
  opsRegistered = true

  const modules = [
    mathOps,
    vectorOps,
    logicOps,
    dataOps,
    stringOps,
    colorOps,
    geometryOps,
    solverOps,
    workflowOps,
    commandOps,
  ]

  for (const mod of modules) {
    const migrated = migrateOpsModule(mod as Record<string, unknown>)
    for (const op of migrated) {
      try {
        ontologyRegistry.registerOperation(op)
      } catch {
        // Skip duplicates
      }
    }
  }
}
