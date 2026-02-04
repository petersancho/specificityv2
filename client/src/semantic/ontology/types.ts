/**
 * Lingua Ontology Core (LOC) - Type Definitions
 *
 * A minimal, code-first ontology for semantic operations, nodes, commands,
 * data types, units, goals, and their relations. Designed for:
 * - AI agent discovery and invocation
 * - Human-readable, machine-checkable documentation
 * - Provenance tracking and replay
 * - Compile-time and runtime validation
 *
 * Inspired by: Grasshopper's Explicit History, GenerativeComponents,
 * Kangaroo goal semantics, and lightweight ontology engineering.
 */

// =============================================================================
// CORE ENTITY TYPES
// =============================================================================

/**
 * Base entity with common metadata
 */
export interface OntologyEntity {
  /** Stable unique identifier (e.g., "math.add", "node.box", "goal.anchor") */
  id: string
  /** Human-readable name */
  name: string
  /** Brief description */
  description?: string
  /** Semantic version (semver) */
  version?: string
  /** Stability status */
  stability?: 'stable' | 'beta' | 'experimental' | 'deprecated'
  /** When introduced */
  since?: string
  /** Superseded by (for deprecated entities) */
  supersededBy?: string
}

/**
 * Semantic domain
 */
export type Domain =
  | 'geometry'
  | 'math'
  | 'vector'
  | 'logic'
  | 'data'
  | 'string'
  | 'color'
  | 'solver'
  | 'workflow'
  | 'command'

/**
 * Data type in the ontology
 */
export interface DataType extends OntologyEntity {
  kind: 'datatype'
  /** Parent type (for type hierarchy) */
  parent?: string
  /** Base JavaScript type */
  jsType: 'number' | 'string' | 'boolean' | 'object' | 'array' | 'function' | 'any'
  /** JSON Schema for validation */
  schema?: Record<string, unknown>
  /** Unit dimension (for numeric types) */
  dimension?: Dimension
  /** Collection shape */
  shape?: CollectionShape
}

/**
 * Physical dimension for unit analysis
 */
export interface Dimension {
  /** Length exponent (meters) */
  L?: number
  /** Mass exponent (kilograms) */
  M?: number
  /** Time exponent (seconds) */
  T?: number
  /** Angle exponent (radians) */
  A?: number
  /** Temperature exponent (kelvin) */
  K?: number
}

/**
 * Collection shape for data flow
 */
export type CollectionShape =
  | 'scalar'      // Single value
  | 'vector'      // Fixed-length tuple (e.g., Vec3)
  | 'list'        // Variable-length array
  | 'tree'        // Nested paths (like GH data trees)
  | 'grid'        // 2D array
  | 'field'       // Spatial field (continuous)

/**
 * Unit of measurement
 */
export interface Unit extends OntologyEntity {
  kind: 'unit'
  /** Symbol (e.g., "m", "kg", "rad") */
  symbol: string
  /** Dimension */
  dimension: Dimension
  /** Conversion factor to SI base unit */
  toSI?: number
  /** SI base unit ID */
  siUnit?: string
}

// =============================================================================
// OPERATION TYPES
// =============================================================================

/**
 * Argument schema for an operation
 */
export interface ArgSchema {
  /** Argument name */
  name: string
  /** Data type ID */
  type: string
  /** Human-readable label */
  label?: string
  /** Description */
  description?: string
  /** Default value */
  default?: unknown
  /** Unit ID (for numeric args) */
  unit?: string
  /** Collection shape */
  shape?: CollectionShape
  /** Whether required */
  required?: boolean
  /** Validation constraints */
  constraints?: ArgConstraint[]
}

/**
 * Validation constraint for arguments
 */
export interface ArgConstraint {
  type: 'min' | 'max' | 'range' | 'enum' | 'pattern' | 'custom'
  value: unknown
  message?: string
}

/**
 * Operation output schema
 */
export interface OutputSchema {
  /** Output name */
  name: string
  /** Data type ID */
  type: string
  /** Human-readable label */
  label?: string
  /** Description */
  description?: string
  /** Unit ID */
  unit?: string
  /** Collection shape */
  shape?: CollectionShape
}

/**
 * Operation invariant (pre/post condition)
 */
export interface Invariant {
  /** Invariant type */
  type: 'precondition' | 'postcondition' | 'invariant'
  /** Expression (human-readable or formal) */
  expression: string
  /** Description */
  description?: string
}

/**
 * Example for documentation and testing
 */
export interface Example {
  /** Example name */
  name: string
  /** Description */
  description?: string
  /** Input values */
  inputs: Record<string, unknown>
  /** Expected output values */
  outputs?: Record<string, unknown>
  /** Tags for categorization */
  tags?: string[]
}

/**
 * Safety classification for agent invocation
 */
export type SafetyClass =
  | 'safe'         // No side effects, safe to call anytime
  | 'idempotent'   // Can be called multiple times with same result
  | 'stateful'     // Modifies state, requires care
  | 'destructive'  // Cannot be undone (e.g., delete)
  | 'external'     // External I/O (network, filesystem)

/**
 * Semantic operation (v2 with full metadata)
 */
export interface Operation extends OntologyEntity {
  kind: 'operation'
  /** Domain */
  domain: Domain
  /** Category */
  category: string
  /** Semantic tags */
  tags: string[]
  /** Input arguments */
  inputs: ArgSchema[]
  /** Outputs */
  outputs: OutputSchema[]
  /** Invariants */
  invariants?: Invariant[]
  /** Examples */
  examples?: Example[]
  /** Computational complexity */
  complexity?: string
  /** Cost hint */
  cost?: 'low' | 'medium' | 'high'
  /** Pure function (no side effects) */
  pure?: boolean
  /** Deterministic (same input → same output) */
  deterministic?: boolean
  /** Side effects */
  sideEffects?: string[]
  /** Safety class for agents */
  safety?: SafetyClass
  /** Natural language synonyms for agent discovery */
  synonyms?: string[]
  /** Canonical prompt for agent invocation */
  canonicalPrompt?: string
  /** Dependencies on other operations */
  dependencies?: string[]
}

// =============================================================================
// NODE AND COMMAND TYPES
// =============================================================================

/**
 * Workflow node definition
 */
export interface Node extends OntologyEntity {
  kind: 'node'
  /** Node category */
  category: string
  /** Operations used by this node */
  semanticOps?: string[]
  /** Input ports */
  inputs?: ArgSchema[]
  /** Output ports */
  outputs?: OutputSchema[]
  /** Parameters (non-port inputs) */
  parameters?: ArgSchema[]
}

/**
 * Command definition
 */
export interface Command extends OntologyEntity {
  kind: 'command'
  /** Command category */
  category: string
  /** Operations used by this command */
  semanticOps?: string[]
  /** Keyboard shortcut */
  shortcut?: string
  /** Whether command is modal */
  modal?: boolean
  /** Safety class */
  safety?: SafetyClass
}

// =============================================================================
// SOLVER AND GOAL TYPES
// =============================================================================

/**
 * Goal type (for solvers like Kangaroo-style physics)
 */
export interface Goal extends OntologyEntity {
  kind: 'goal'
  /** Solver this goal works with */
  solver: string
  /** Goal category */
  category: 'constraint' | 'load' | 'anchor' | 'material' | 'optimization'
  /** Arity (number of particles/vertices affected) */
  arity?: 'unary' | 'binary' | 'n-ary'
  /** Conservation properties */
  conserves?: ('momentum' | 'energy' | 'mass' | 'volume')[]
  /** Convergence criteria */
  convergence?: {
    type: 'tolerance' | 'iterations' | 'energy'
    value?: number
  }
  /** Parameters */
  parameters?: ArgSchema[]
}

/**
 * Solver definition
 */
export interface Solver extends OntologyEntity {
  kind: 'solver'
  /** Solver type */
  type: 'physics' | 'chemistry' | 'evolutionary' | 'voxel' | 'topology'
  /** Compatible goal types */
  goals: string[]
  /** Has simulation dashboard */
  hasSimulator?: boolean
  /** Semantic operation ID */
  semanticOp?: string
}

// =============================================================================
// RELATIONS
// =============================================================================

/**
 * Relation between ontology entities
 */
export interface Relation {
  /** Relation type */
  type: RelationType
  /** Source entity ID */
  source: string
  /** Target entity ID */
  target: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Relation types in the ontology
 */
export type RelationType =
  | 'usesOp'           // Node/Command uses Operation
  | 'producesType'     // Operation produces DataType
  | 'acceptsType'      // Operation accepts DataType
  | 'hasUnit'          // DataType/Arg has Unit
  | 'dependsOn'        // Operation depends on Operation
  | 'partOf'           // Entity is part of Entity
  | 'goalOf'           // Goal is for Solver
  | 'supersedes'       // Entity supersedes Entity
  | 'converts'         // Operation converts between types
  | 'extends'          // Type extends Type

// =============================================================================
// ONTOLOGY CONTAINER
// =============================================================================

/**
 * Complete ontology container
 */
export interface LinguaOntology {
  /** Ontology metadata */
  meta: {
    name: string
    version: string
    description: string
    generatedAt?: string
  }
  /** Data types */
  datatypes: Record<string, DataType>
  /** Units */
  units: Record<string, Unit>
  /** Operations */
  operations: Record<string, Operation>
  /** Nodes */
  nodes: Record<string, Node>
  /** Commands */
  commands: Record<string, Command>
  /** Goals */
  goals: Record<string, Goal>
  /** Solvers */
  solvers: Record<string, Solver>
  /** Relations */
  relations: Relation[]
}

// =============================================================================
// PROVENANCE TYPES
// =============================================================================

/**
 * Trace entry for provenance tracking
 */
export interface TraceEntry {
  /** Unique trace ID */
  id: string
  /** Operation ID */
  opId: string
  /** Timestamp */
  timestamp: number
  /** Duration in ms */
  duration: number
  /** Input values (typed) */
  inputs: Record<string, unknown>
  /** Output values (typed) */
  outputs?: Record<string, unknown>
  /** Random seed (if applicable) */
  seed?: number
  /** Was deterministic */
  deterministic?: boolean
  /** Parent trace IDs (for dependency graph) */
  parents?: string[]
  /** Error if failed */
  error?: string
  /** Additional metadata (nodeId, runId, etc.) */
  metadata?: Record<string, unknown>
}

/**
 * Compute session trace
 */
export interface SessionTrace {
  /** Session ID */
  sessionId: string
  /** Start timestamp */
  startTime: number
  /** End timestamp */
  endTime?: number
  /** Trace entries */
  entries: TraceEntry[]
  /** Metadata */
  metadata?: Record<string, unknown>
}

// =============================================================================
// AGENT AFFORDANCE TYPES
// =============================================================================

/**
 * Agent capability for LLM function calling
 */
export interface AgentCapability {
  /** Operation ID */
  opId: string
  /** Natural language intent */
  intent: string
  /** Function signature for LLM */
  signature: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, {
        type: string
        description: string
        enum?: unknown[]
        default?: unknown
      }>
      required: string[]
    }
  }
  /** Examples for few-shot learning */
  examples: {
    prompt: string
    args: Record<string, unknown>
  }[]
  /** Typical failure modes */
  failures?: string[]
  /** Safety notes */
  safetyNotes?: string[]
  /** Related capabilities */
  related?: string[]
}

/**
 * Agent capabilities catalog
 */
export interface AgentCapabilitiesCatalog {
  /** Catalog metadata */
  meta: {
    version: string
    generatedAt: string
    operationCount: number
  }
  /** Capabilities by operation ID */
  capabilities: Record<string, AgentCapability>
  /** Search index by tag/intent */
  index: {
    byTag: Record<string, string[]>
    byIntent: Record<string, string[]>
  }
}
