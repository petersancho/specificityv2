/**
 * Migration Bridge: SemanticOpMeta → LOC Operation
 *
 * Provides conversion between the legacy SemanticOpMeta format and
 * the new LOC Operation format, enabling gradual migration.
 */

import type {
  SemanticOpMeta,
  SemanticDomain,
  OpCategory,
  OpTag,
  CostHint,
  SideEffect,
} from '../semanticOp'

import type {
  Operation,
  Domain,
  SafetyClass,
  ArgSchema,
  OutputSchema,
} from './types'

// =============================================================================
// DOMAIN MAPPING
// =============================================================================

/** Map legacy domain to LOC domain */
function mapDomain(domain: SemanticDomain): Domain {
  return domain as Domain
}

/** Map legacy cost to LOC cost */
function mapCost(cost?: CostHint): 'low' | 'medium' | 'high' | undefined {
  return cost
}

/** Infer safety class from legacy metadata */
function inferSafetyClass(meta: SemanticOpMeta): SafetyClass {
  if (meta.sideEffects && meta.sideEffects.length > 0) {
    // Check for destructive side effects
    const destructive: SideEffect[] = ['filesystem']
    if (meta.sideEffects.some((e) => destructive.includes(e))) {
      return 'destructive'
    }
    // Check for external side effects
    const external: SideEffect[] = ['io', 'network']
    if (meta.sideEffects.some((e) => external.includes(e))) {
      return 'external'
    }
    // Has state mutations
    return 'stateful'
  }
  
  // Pure and deterministic = safe
  if (meta.pure && meta.deterministic) {
    return 'safe'
  }
  
  // Pure but non-deterministic (e.g., uses random) = idempotent
  if (meta.pure) {
    return 'idempotent'
  }
  
  // Default to stateful for non-pure operations
  return 'stateful'
}

// =============================================================================
// CONVERSION FUNCTIONS
// =============================================================================

/**
 * Convert SemanticOpMeta to LOC Operation
 *
 * This enables existing operations to be used with the new ontology system
 * without requiring immediate migration of all operation definitions.
 *
 * @param meta - Legacy SemanticOpMeta
 * @returns LOC Operation
 *
 * @example
 * ```ts
 * import { mathOps } from '../ops/mathOps'
 * import { metaToOperation } from './migration'
 *
 * // Convert legacy op to LOC Operation
 * const locOp = metaToOperation(mathOps.add.meta)
 * ontologyRegistry.registerOperation(locOp)
 * ```
 */
export function metaToOperation(meta: SemanticOpMeta): Operation {
  return {
    kind: 'operation',
    id: meta.id,
    name: meta.name,
    description: meta.summary,
    domain: mapDomain(meta.domain),
    category: meta.category,
    tags: meta.tags as string[],
    inputs: [], // Will be populated when migrating to v2
    outputs: [], // Will be populated when migrating to v2
    complexity: meta.complexity,
    cost: mapCost(meta.cost),
    pure: meta.pure,
    deterministic: meta.deterministic,
    sideEffects: meta.sideEffects,
    safety: inferSafetyClass(meta),
    dependencies: meta.deps,
    stability: meta.stable === false ? 'experimental' : 'stable',
    since: meta.since,
  }
}

/**
 * Convert LOC Operation back to SemanticOpMeta
 *
 * This enables new LOC operations to work with legacy code that
 * expects SemanticOpMeta format.
 *
 * @param op - LOC Operation
 * @returns Legacy SemanticOpMeta
 */
export function operationToMeta(op: Operation): SemanticOpMeta {
  return {
    id: op.id,
    domain: op.domain as SemanticDomain,
    name: op.name,
    category: op.category as OpCategory,
    tags: op.tags as OpTag[],
    summary: op.description,
    complexity: op.complexity as SemanticOpMeta['complexity'],
    cost: op.cost,
    pure: op.pure,
    deterministic: op.deterministic,
    sideEffects: op.sideEffects as SideEffect[],
    deps: op.dependencies,
    since: op.since,
    stable: op.stability !== 'experimental' && op.stability !== 'deprecated',
  }
}

// =============================================================================
// V2 METADATA EXTENSION
// =============================================================================

/**
 * Extended operation metadata for v2 operations
 *
 * Use this interface when defining new operations that need
 * the full LOC metadata (inputs, outputs, examples, etc.)
 */
export interface OperationV2Ext {
  /** Input argument schemas */
  inputs?: ArgSchema[]
  /** Output schemas */
  outputs?: OutputSchema[]
  /** Natural language synonyms for agent discovery */
  synonyms?: string[]
  /** Canonical prompt for agent invocation */
  canonicalPrompt?: string
  /** Examples for documentation and testing */
  examples?: {
    name: string
    description?: string
    inputs: Record<string, unknown>
    outputs?: Record<string, unknown>
  }[]
  /** Invariants (preconditions, postconditions) */
  invariants?: {
    type: 'precondition' | 'postcondition' | 'invariant'
    expression: string
    description?: string
  }[]
}

/**
 * Define a semantic operation with v2 metadata
 *
 * This is the recommended way to define new operations that will
 * work with both legacy and LOC systems.
 *
 * @param meta - Legacy SemanticOpMeta (for backward compatibility)
 * @param v2 - Extended v2 metadata
 * @param fn - The operation function
 * @returns Function with attached metadata
 *
 * @example
 * ```ts
 * export const add = defineSemanticOpV2(
 *   {
 *     id: 'math.add',
 *     domain: 'math',
 *     name: 'Add',
 *     category: 'operator',
 *     tags: ['arithmetic', 'pure', 'deterministic'],
 *     complexity: 'O(1)',
 *     cost: 'low',
 *     pure: true,
 *     deterministic: true,
 *     summary: 'Adds two numbers'
 *   },
 *   {
 *     inputs: [
 *       { name: 'a', type: 'number', label: 'First number', required: true },
 *       { name: 'b', type: 'number', label: 'Second number', required: true }
 *     ],
 *     outputs: [
 *       { name: 'result', type: 'number', label: 'Sum' }
 *     ],
 *     synonyms: ['sum', 'plus', 'addition'],
 *     canonicalPrompt: 'Add two numbers together',
 *     examples: [
 *       { name: 'basic', inputs: { a: 2, b: 3 }, outputs: { result: 5 } }
 *     ]
 *   },
 *   function add(a: number, b: number) {
 *     return a + b;
 *   }
 * );
 * ```
 */
export function defineSemanticOpV2<TFn extends (...args: unknown[]) => unknown>(
  meta: SemanticOpMeta,
  v2: OperationV2Ext,
  fn: TFn
): TFn & { meta: SemanticOpMeta; v2: OperationV2Ext; toLOC: () => Operation } {
  // Create extended function object
  const extFn = fn as TFn & { meta: SemanticOpMeta; v2: OperationV2Ext; toLOC: () => Operation }
  
  // Attach legacy metadata
  extFn.meta = meta
  
  // Attach v2 metadata
  extFn.v2 = v2
  
  // Attach conversion function
  extFn.toLOC = (): Operation => ({
    ...metaToOperation(meta),
    inputs: v2.inputs || [],
    outputs: v2.outputs || [],
    synonyms: v2.synonyms,
    canonicalPrompt: v2.canonicalPrompt,
    examples: v2.examples,
    invariants: v2.invariants,
  })
  
  return extFn
}

// =============================================================================
// BATCH MIGRATION UTILITIES
// =============================================================================

/**
 * Convert an object of semantic operations to LOC Operations
 *
 * Supports multiple formats:
 * - Arrays of SemanticOpMeta (e.g., MATH_OPS)
 * - Functions with .meta property
 * - Functions with .meta and .v2 properties
 *
 * @param ops - Object containing semantic operations
 * @returns Array of LOC Operations
 *
 * @example
 * ```ts
 * import * as mathOps from '../ops/mathOps'
 * import { migrateOpsModule } from './migration'
 *
 * const locOps = migrateOpsModule(mathOps)
 * locOps.forEach(op => ontologyRegistry.registerOperation(op))
 * ```
 */
export function migrateOpsModule(
  ops: Record<string, unknown>
): Operation[] {
  const operations: Operation[] = []
  
  for (const [key, value] of Object.entries(ops)) {
    // Check if it's an array of SemanticOpMeta (e.g., MATH_OPS, VECTOR_OPS)
    if (Array.isArray(value)) {
      for (const item of value) {
        if (
          typeof item === 'object' &&
          item !== null &&
          'id' in item &&
          'domain' in item &&
          'name' in item
        ) {
          operations.push(metaToOperation(item as SemanticOpMeta))
        }
      }
      continue
    }
    
    // Check if it's a semantic operation function
    if (
      typeof value === 'function' &&
      'meta' in value &&
      typeof (value as { meta: unknown }).meta === 'object' &&
      (value as { meta: { id: string } }).meta?.id
    ) {
      const meta = (value as { meta: SemanticOpMeta }).meta
      
      // Check if it has v2 metadata
      if ('v2' in value && 'toLOC' in value) {
        operations.push((value as { toLOC: () => Operation }).toLOC())
      } else {
        operations.push(metaToOperation(meta))
      }
    }
  }
  
  return operations
}

/**
 * Register all operations from a module into the ontology registry
 *
 * @param ops - Object containing semantic operations
 * @param registry - Ontology registry instance
 * @returns Number of operations registered
 *
 * @example
 * ```ts
 * import * as mathOps from '../ops/mathOps'
 * import { registerOpsModule } from './migration'
 * import { ontologyRegistry } from './registry'
 *
 * const count = registerOpsModule(mathOps, ontologyRegistry)
 * console.log(`Registered ${count} math operations`)
 * ```
 */
export function registerOpsModule(
  ops: Record<string, unknown>,
  registry: { registerOperation: (op: Operation) => void }
): number {
  const locOps = migrateOpsModule(ops)
  for (const op of locOps) {
    registry.registerOperation(op)
  }
  return locOps.length
}
