/**
 * Lingua Ontology Registry
 *
 * Single source of truth for all semantic entities. Provides:
 * - Registration and retrieval of entities
 * - Validation of relations and references
 * - Export to JSON/DOT for visualization
 * - Query by tags, domain, safety class
 */

import type {
  OntologyEntity,
  LinguaOntology,
  DataType,
  Unit,
  Operation,
  Node,
  Command,
  Goal,
  Solver,
  Relation,
  RelationType,
  Domain,
  SafetyClass,
  AgentCapability,
  AgentCapabilitiesCatalog,
} from './types'

// =============================================================================
// VALIDATION ERRORS
// =============================================================================

export class OntologyError extends Error {
  constructor(
    message: string,
    public entityId?: string,
    public entityKind?: string
  ) {
    super(message)
    this.name = 'OntologyError'
  }
}

export class DuplicateEntityError extends OntologyError {
  constructor(kind: string, id: string) {
    super(`Duplicate ${kind} with id "${id}"`, id, kind)
    this.name = 'DuplicateEntityError'
  }
}

export class MissingReferenceError extends OntologyError {
  constructor(fromKind: string, fromId: string, refKind: string, refId: string) {
    super(
      `${fromKind} "${fromId}" references missing ${refKind} "${refId}"`,
      fromId,
      fromKind
    )
    this.name = 'MissingReferenceError'
  }
}

// =============================================================================
// REGISTRY CLASS
// =============================================================================

export class OntologyRegistry {
  private datatypes = new Map<string, DataType>()
  private units = new Map<string, Unit>()
  private operations = new Map<string, Operation>()
  private nodes = new Map<string, Node>()
  private commands = new Map<string, Command>()
  private goals = new Map<string, Goal>()
  private solvers = new Map<string, Solver>()
  private relations: Relation[] = []

  constructor(
    private meta: LinguaOntology['meta'] = {
      name: 'Lingua Ontology Core',
      version: '2.0.0',
      description: 'Semantic ontology for Lingua parametric design environment',
    }
  ) {}

  // ---------------------------------------------------------------------------
  // REGISTRATION
  // ---------------------------------------------------------------------------

  registerDataType(dt: DataType): this {
    if (this.datatypes.has(dt.id)) {
      throw new DuplicateEntityError('datatype', dt.id)
    }
    this.datatypes.set(dt.id, dt)
    return this
  }

  registerUnit(unit: Unit): this {
    if (this.units.has(unit.id)) {
      throw new DuplicateEntityError('unit', unit.id)
    }
    this.units.set(unit.id, unit)
    return this
  }

  registerOperation(op: Operation): this {
    if (this.operations.has(op.id)) {
      throw new DuplicateEntityError('operation', op.id)
    }
    this.operations.set(op.id, op)
    return this
  }

  registerNode(node: Node): this {
    if (this.nodes.has(node.id)) {
      throw new DuplicateEntityError('node', node.id)
    }
    this.nodes.set(node.id, node)
    return this
  }

  registerCommand(cmd: Command): this {
    if (this.commands.has(cmd.id)) {
      throw new DuplicateEntityError('command', cmd.id)
    }
    this.commands.set(cmd.id, cmd)
    return this
  }

  registerGoal(goal: Goal): this {
    if (this.goals.has(goal.id)) {
      throw new DuplicateEntityError('goal', goal.id)
    }
    this.goals.set(goal.id, goal)
    return this
  }

  registerSolver(solver: Solver): this {
    if (this.solvers.has(solver.id)) {
      throw new DuplicateEntityError('solver', solver.id)
    }
    this.solvers.set(solver.id, solver)
    return this
  }

  addRelation(rel: Relation): this {
    this.relations.push(rel)
    return this
  }

  // ---------------------------------------------------------------------------
  // RETRIEVAL
  // ---------------------------------------------------------------------------

  getDataType(id: string): DataType | undefined {
    return this.datatypes.get(id)
  }

  getUnit(id: string): Unit | undefined {
    return this.units.get(id)
  }

  getOperation(id: string): Operation | undefined {
    return this.operations.get(id)
  }

  getNode(id: string): Node | undefined {
    return this.nodes.get(id)
  }

  getCommand(id: string): Command | undefined {
    return this.commands.get(id)
  }

  getGoal(id: string): Goal | undefined {
    return this.goals.get(id)
  }

  getSolver(id: string): Solver | undefined {
    return this.solvers.get(id)
  }

  getEntity(id: string): OntologyEntity | undefined {
    return (
      this.datatypes.get(id) ||
      this.units.get(id) ||
      this.operations.get(id) ||
      this.nodes.get(id) ||
      this.commands.get(id) ||
      this.goals.get(id) ||
      this.solvers.get(id)
    )
  }

  // ---------------------------------------------------------------------------
  // QUERIES
  // ---------------------------------------------------------------------------

  listOperations(): Operation[] {
    return Array.from(this.operations.values())
  }

  listNodes(): Node[] {
    return Array.from(this.nodes.values())
  }

  listCommands(): Command[] {
    return Array.from(this.commands.values())
  }

  listGoals(): Goal[] {
    return Array.from(this.goals.values())
  }

  listSolvers(): Solver[] {
    return Array.from(this.solvers.values())
  }

  listDataTypes(): DataType[] {
    return Array.from(this.datatypes.values())
  }

  listUnits(): Unit[] {
    return Array.from(this.units.values())
  }

  /** Get operations by domain */
  getOperationsByDomain(domain: Domain): Operation[] {
    return this.listOperations().filter((op) => op.domain === domain)
  }

  /** Get operations by tag */
  getOperationsByTag(tag: string): Operation[] {
    return this.listOperations().filter((op) => op.tags.includes(tag))
  }

  /** Get operations by safety class */
  getOperationsBySafety(safety: SafetyClass): Operation[] {
    return this.listOperations().filter((op) => op.safety === safety)
  }

  /** Get pure operations (safe for agent auto-invocation) */
  getPureOperations(): Operation[] {
    return this.listOperations().filter((op) => op.pure === true)
  }

  /** Get relations by type */
  getRelationsByType(type: RelationType): Relation[] {
    return this.relations.filter((r) => r.type === type)
  }

  /** Get all relations involving an entity */
  getRelationsFor(entityId: string): Relation[] {
    return this.relations.filter(
      (r) => r.source === entityId || r.target === entityId
    )
  }

  /** Get operations used by a node */
  getNodeOperations(nodeId: string): Operation[] {
    const node = this.nodes.get(nodeId)
    if (!node || !node.semanticOps) return []
    return node.semanticOps
      .map((opId) => this.operations.get(opId))
      .filter((op): op is Operation => op !== undefined)
  }

  /** Get operations used by a command */
  getCommandOperations(cmdId: string): Operation[] {
    const cmd = this.commands.get(cmdId)
    if (!cmd || !cmd.semanticOps) return []
    return cmd.semanticOps
      .map((opId) => this.operations.get(opId))
      .filter((op): op is Operation => op !== undefined)
  }

  // ---------------------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------------------

  /** Validate all references and return errors */
  validate(): OntologyError[] {
    const errors: OntologyError[] = []

    // Validate operation references
    for (const op of this.operations.values()) {
      // Check input type references
      for (const input of op.inputs) {
        if (input.type && !this.datatypes.has(input.type)) {
          errors.push(
            new MissingReferenceError('operation', op.id, 'datatype', input.type)
          )
        }
        if (input.unit && !this.units.has(input.unit)) {
          errors.push(
            new MissingReferenceError('operation', op.id, 'unit', input.unit)
          )
        }
      }
      // Check output type references
      for (const output of op.outputs) {
        if (output.type && !this.datatypes.has(output.type)) {
          errors.push(
            new MissingReferenceError('operation', op.id, 'datatype', output.type)
          )
        }
      }
      // Check dependencies
      if (op.dependencies) {
        for (const depId of op.dependencies) {
          if (!this.operations.has(depId)) {
            errors.push(
              new MissingReferenceError('operation', op.id, 'operation', depId)
            )
          }
        }
      }
    }

    // Validate node semantic ops
    for (const node of this.nodes.values()) {
      if (node.semanticOps) {
        for (const opId of node.semanticOps) {
          if (!this.operations.has(opId)) {
            errors.push(
              new MissingReferenceError('node', node.id, 'operation', opId)
            )
          }
        }
      }
    }

    // Validate command semantic ops
    for (const cmd of this.commands.values()) {
      if (cmd.semanticOps) {
        for (const opId of cmd.semanticOps) {
          if (!this.operations.has(opId)) {
            errors.push(
              new MissingReferenceError('command', cmd.id, 'operation', opId)
            )
          }
        }
      }
    }

    // Validate goal solver references
    for (const goal of this.goals.values()) {
      if (!this.solvers.has(goal.solver)) {
        errors.push(
          new MissingReferenceError('goal', goal.id, 'solver', goal.solver)
        )
      }
    }

    // Validate solver goal references
    for (const solver of this.solvers.values()) {
      for (const goalId of solver.goals) {
        if (!this.goals.has(goalId)) {
          errors.push(
            new MissingReferenceError('solver', solver.id, 'goal', goalId)
          )
        }
      }
    }

    // Validate relations
    for (const rel of this.relations) {
      if (!this.getEntity(rel.source)) {
        errors.push(
          new OntologyError(
            `Relation source "${rel.source}" not found`,
            rel.source
          )
        )
      }
      if (!this.getEntity(rel.target)) {
        errors.push(
          new OntologyError(
            `Relation target "${rel.target}" not found`,
            rel.target
          )
        )
      }
    }

    return errors
  }

  /** Check if ontology is valid (no reference errors) */
  isValid(): boolean {
    return this.validate().length === 0
  }

  // ---------------------------------------------------------------------------
  // EXPORT
  // ---------------------------------------------------------------------------

  /** Export to LinguaOntology JSON */
  toJSON(): LinguaOntology {
    return {
      meta: {
        ...this.meta,
        generatedAt: new Date().toISOString(),
      },
      datatypes: Object.fromEntries(this.datatypes),
      units: Object.fromEntries(this.units),
      operations: Object.fromEntries(this.operations),
      nodes: Object.fromEntries(this.nodes),
      commands: Object.fromEntries(this.commands),
      goals: Object.fromEntries(this.goals),
      solvers: Object.fromEntries(this.solvers),
      relations: this.relations,
    }
  }

  /** Export to DOT format for visualization */
  toDOT(): string {
    const lines: string[] = ['digraph LinguaOntology {', '  rankdir=LR;']

    // Style subgraphs by kind
    const kindColors: Record<string, string> = {
      datatype: '#E3F2FD',
      unit: '#F3E5F5',
      operation: '#E8F5E9',
      node: '#FFF3E0',
      command: '#FFEBEE',
      goal: '#E0F7FA',
      solver: '#FCE4EC',
    }

    // Add datatypes
    lines.push('  subgraph cluster_datatypes {')
    lines.push('    label="Data Types";')
    lines.push(`    style=filled; fillcolor="${kindColors.datatype}";`)
    for (const dt of this.datatypes.values()) {
      lines.push(`    "${dt.id}" [label="${dt.name}"];`)
    }
    lines.push('  }')

    // Add operations
    lines.push('  subgraph cluster_operations {')
    lines.push('    label="Operations";')
    lines.push(`    style=filled; fillcolor="${kindColors.operation}";`)
    for (const op of this.operations.values()) {
      lines.push(`    "${op.id}" [label="${op.name}"];`)
    }
    lines.push('  }')

    // Add nodes
    lines.push('  subgraph cluster_nodes {')
    lines.push('    label="Nodes";')
    lines.push(`    style=filled; fillcolor="${kindColors.node}";`)
    for (const node of this.nodes.values()) {
      lines.push(`    "${node.id}" [label="${node.name}"];`)
    }
    lines.push('  }')

    // Add commands
    lines.push('  subgraph cluster_commands {')
    lines.push('    label="Commands";')
    lines.push(`    style=filled; fillcolor="${kindColors.command}";`)
    for (const cmd of this.commands.values()) {
      lines.push(`    "${cmd.id}" [label="${cmd.name}"];`)
    }
    lines.push('  }')

    // Add relations
    for (const rel of this.relations) {
      lines.push(`  "${rel.source}" -> "${rel.target}" [label="${rel.type}"];`)
    }

    // Add implicit node->op relations
    for (const node of this.nodes.values()) {
      if (node.semanticOps) {
        for (const opId of node.semanticOps) {
          lines.push(`  "${node.id}" -> "${opId}" [label="usesOp" style=dashed];`)
        }
      }
    }

    lines.push('}')
    return lines.join('\n')
  }

  // ---------------------------------------------------------------------------
  // AGENT CATALOG GENERATION
  // ---------------------------------------------------------------------------

  /** Generate agent capabilities catalog from operations */
  toAgentCatalog(): AgentCapabilitiesCatalog {
    const capabilities: Record<string, AgentCapability> = {}
    const byTag: Record<string, string[]> = {}
    const byIntent: Record<string, string[]> = {}

    for (const op of this.operations.values()) {
      // Build function signature for LLM
      const properties: Record<string, {
        type: string
        description: string
        enum?: unknown[]
        default?: unknown
      }> = {}
      const required: string[] = []

      for (const input of op.inputs) {
        properties[input.name] = {
          type: this.jsTypeToJsonSchema(input.type),
          description: input.description || input.label || input.name,
        }
        if (input.default !== undefined) {
          properties[input.name].default = input.default
        }
        if (input.required !== false) {
          required.push(input.name)
        }
      }

      const capability: AgentCapability = {
        opId: op.id,
        intent: op.canonicalPrompt || op.description || op.name,
        signature: {
          name: op.id.replace(/\./g, '_'),
          description: op.description || op.name,
          parameters: {
            type: 'object',
            properties,
            required,
          },
        },
        examples: op.examples?.map((ex) => ({
          prompt: ex.description || ex.name,
          args: ex.inputs,
        })) || [],
        safetyNotes: op.safety ? [`Safety class: ${op.safety}`] : undefined,
        related: op.dependencies,
      }

      capabilities[op.id] = capability

      // Build tag index
      for (const tag of op.tags) {
        if (!byTag[tag]) byTag[tag] = []
        byTag[tag].push(op.id)
      }

      // Build synonym/intent index
      if (op.synonyms) {
        for (const syn of op.synonyms) {
          const key = syn.toLowerCase()
          if (!byIntent[key]) byIntent[key] = []
          byIntent[key].push(op.id)
        }
      }
    }

    return {
      meta: {
        version: this.meta.version,
        generatedAt: new Date().toISOString(),
        operationCount: this.operations.size,
      },
      capabilities,
      index: { byTag, byIntent },
    }
  }

  /** Convert LOC datatype ID to JSON Schema type */
  private jsTypeToJsonSchema(typeId: string): string {
    const dt = this.datatypes.get(typeId)
    if (!dt) return 'any'
    switch (dt.jsType) {
      case 'number':
        return 'number'
      case 'string':
        return 'string'
      case 'boolean':
        return 'boolean'
      case 'array':
        return 'array'
      case 'object':
        return 'object'
      default:
        return 'any'
    }
  }

  // ---------------------------------------------------------------------------
  // IMPORT
  // ---------------------------------------------------------------------------

  /** Load from LinguaOntology JSON */
  static fromJSON(json: LinguaOntology): OntologyRegistry {
    const registry = new OntologyRegistry(json.meta)

    for (const dt of Object.values(json.datatypes)) {
      registry.registerDataType(dt)
    }
    for (const unit of Object.values(json.units)) {
      registry.registerUnit(unit)
    }
    for (const op of Object.values(json.operations)) {
      registry.registerOperation(op)
    }
    for (const node of Object.values(json.nodes)) {
      registry.registerNode(node)
    }
    for (const cmd of Object.values(json.commands)) {
      registry.registerCommand(cmd)
    }
    for (const goal of Object.values(json.goals)) {
      registry.registerGoal(goal)
    }
    for (const solver of Object.values(json.solvers)) {
      registry.registerSolver(solver)
    }
    for (const rel of json.relations) {
      registry.addRelation(rel)
    }

    return registry
  }

  // ---------------------------------------------------------------------------
  // STATISTICS
  // ---------------------------------------------------------------------------

  /** Get ontology statistics */
  stats(): {
    datatypes: number
    units: number
    operations: number
    nodes: number
    commands: number
    goals: number
    solvers: number
    relations: number
    operationsByDomain: Record<Domain, number>
    operationsBySafety: Record<SafetyClass, number>
    pureOps: number
    deterministicOps: number
  } {
    const operationsByDomain = {} as Record<Domain, number>
    const operationsBySafety = {} as Record<SafetyClass, number>
    let pureOps = 0
    let deterministicOps = 0

    for (const op of this.operations.values()) {
      operationsByDomain[op.domain] = (operationsByDomain[op.domain] || 0) + 1
      if (op.safety) {
        operationsBySafety[op.safety] = (operationsBySafety[op.safety] || 0) + 1
      }
      if (op.pure) pureOps++
      if (op.deterministic) deterministicOps++
    }

    return {
      datatypes: this.datatypes.size,
      units: this.units.size,
      operations: this.operations.size,
      nodes: this.nodes.size,
      commands: this.commands.size,
      goals: this.goals.size,
      solvers: this.solvers.size,
      relations: this.relations.length,
      operationsByDomain,
      operationsBySafety,
      pureOps,
      deterministicOps,
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Global ontology registry instance */
export const ontologyRegistry = new OntologyRegistry()
