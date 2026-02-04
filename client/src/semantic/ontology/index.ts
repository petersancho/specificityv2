/**
 * Lingua Ontology Core (LOC)
 *
 * Agent-first, ontology-backed semantic architecture for Lingua.
 *
 * @example
 * ```ts
 * import { ontologyRegistry, Operation, DataType } from './ontology'
 *
 * // Query operations
 * const mathOps = ontologyRegistry.getOperationsByDomain('math')
 * const safeOps = ontologyRegistry.getPureOperations()
 *
 * // Generate agent catalog
 * const catalog = ontologyRegistry.toAgentCatalog()
 *
 * // Validate ontology integrity
 * const errors = ontologyRegistry.validate()
 * ```
 */

// Types
export type {
  OntologyEntity,
  Domain,
  DataType,
  Dimension,
  CollectionShape,
  Unit,
  ArgSchema,
  ArgConstraint,
  OutputSchema,
  Invariant,
  Example,
  SafetyClass,
  Operation,
  Node,
  Command,
  Goal,
  Solver,
  Relation,
  RelationType,
  LinguaOntology,
  TraceEntry,
  SessionTrace,
  AgentCapability,
  AgentCapabilitiesCatalog,
} from './types'

// Registry
export {
  OntologyRegistry,
  OntologyError,
  DuplicateEntityError,
  MissingReferenceError,
  ontologyRegistry,
} from './registry'

// Seed data (auto-seeds on import)
export {
  coreDataTypes,
  coreUnits,
  coreSolvers,
  coreGoals,
  seedOntology,
} from './seed'

// Migration utilities
export {
  metaToOperation,
  operationToMeta,
  defineSemanticOpV2,
  migrateOpsModule,
  registerOpsModule,
} from './migration'

export type { OperationV2Ext } from './migration'

// Provenance tracing
export {
  provenanceStore,
  withTrace,
  withTraceAsync,
  recordTrace,
  analyzeSession,
  toJSONLines,
  toDependencyDOT,
} from './provenance'

export type { TraceOptions, TraceAnalysis } from './provenance'

// Coverage analysis
export {
  analyzeCoverage,
  formatCoverageReport,
  checkGates,
  DEFAULT_GATES,
} from './coverage'

export type { CoverageMetrics, DimensionScore, DomainMetrics, CoverageGate } from './coverage'
