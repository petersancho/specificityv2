# Lingua Ontological Map

This document summarizes the full ontology structure powering Lingua’s semantic system so planning can reference the actual code relationships.

## Registry Overview
- **Location:** `client/src/semantic/ontology/`
- **Core class:** `OntologyRegistry`
  - Stores `datatypes`, `units`, `operations`, `nodes`, `commands`, `goals`, `solvers`, plus `relations`
  - Actions:
    - Register entities (`registerDataType`, `registerOperation`, etc.)
    - Query entities (`getOperation`, `listNodes`, `getNodeOperations`, etc.)
    - Validate references (`validate`, `isValid`)
    - Export (`toJSON`, `toDOT`, `toAgentCatalog`, `stats`, `fromJSON`)
- **Seed data:** `seedOntology` registers core datatypes (vectors, geometry references, goal specs), units, solvers, and goals.
- **Migration helpers:** `metaToOperation` / `operationToMeta` bridge legacy `SemanticOpMeta` into LOC Operation V2, allowing operations defined in `client/src/semantic/ops/*` to auto-populate the registry.

## Entity Types & Domains
- **Domains:** `geometry`, `math`, `vector`, `logic`, `data`, `string`, `color`, `solver`, `workflow`, `command`
- **DataTypes:** Numeric scalars, vectors (Vec3), matrices, geometry IDs, solver results, goal specifications, etc. Defined in `types.ts` with `jsType`, shape, and optional unit dimensions.
- **Units:** SI-derived units (meters, kilograms, seconds), plus derived ones for stress, density, etc.
- **Operations:** 297+ semantic ops across domains. Each includes metadata: `id`, `name`, `category`, `tags`, `complexity`, `cost`, `pure/deterministic`, `safety` class, dependencies, and optional V2 extensions (inputs/outputs, examples, invariants, synonyms, canonical prompts).
- **Nodes:** 170+ Numerica node definitions from `workflow/nodeRegistry.ts`. Each references `semanticOps` if it performs computation, enabling ontology to link node → operations.
- **Commands:** 90+ Roslyn commands defined in `commands/registry.ts`, mapped to semantic ops in `commands/commandSemantics.ts`. Registry stores commands with `semanticOps` for validation and agent catalog.
- **Goals & Solvers:** Goal entities (anchor, load, chemistry goals) link to solver IDs; solver entities (physics, chemistry, topology, voxel, evolutionary) reference the goals they support.
- **Relations:** Additional links (e.g., node uses op, command uses op, solver consumes goal) plus arbitrary relations added via `addRelation` for ontology graph output.

## Semantic Chain Mapping
```
UI Control → Command → CommandSemantic (ops) → Node (workflow) → semanticOps → Operation → Solver/Backend
```
- **Commands** reference operations (e.g., `command.createLine`) which map to geometry kernel actions.
- **Workflow Nodes** with `semanticOps` tie Numerica computations to the same operations.
- **Ontology Registry** ensures each operation referenced in commands/nodes is registered, preventing drift.

## Key Files & Their Ontological Roles
| Area | Files | Ontology Role |
| ---- | ----- | ------------- |
| Semantic ops | `client/src/semantic/ops/*.ts` | Define operations (metadata + implementation) → registered via `registerAllSemanticOps`
| Operation registry | `client/src/semantic/operationRegistry.ts` | Legacy registry storing `SemanticOpFn` before migration to LOC
| Ontology core | `client/src/semantic/ontology/*.ts` | LOC entities, registry, migration, provenance, coverage
| Workflow nodes | `client/src/workflow/nodeRegistry.ts` | Node definitions w/ `semanticOps` linking to operations
| Commands | `client/src/commands/registry.ts`, `commandSemantics.ts` | Command metadata + semantic ops mapping
| Solvers | `client/src/workflow/nodes/solver/*.ts` | Solver nodes referencing ops (`solver.*`, `simulator.*`), linking to goal entities
| Validation scripts | `package.json` scripts (`validate:semantic`, `generate:semantic-ids`, `generate:agent-catalog`, `validate:semantic-integration`) | Keep ontology + semantics consistent
| Docs | `docs/SEMANTIC_SYSTEM.md`, `SEMANTIC_SCHEMA_SYSTEM.md` | Describe LOC, YAML schemas, agent catalog output

## Agent-Facing Outputs
- **`docs/semantic/agent-catalog.json`** – machine-readable catalog generated from registered operations (inputs/outputs, examples, safety).
- **`docs/semantic/command-operation-linkages.json`** – produced by `scripts/validateCommandSemantics.ts`; enumerates command → operations mapping.
- **YAML Schemas** (`client/src/semantic/schemas/*.schema.yml`) – parameter/validation definitions for solver operations, ensuring agents can validate before invocation.

## Validation Workflow
1. **Define/modify operations** in `semantic/ops/*` → run `npm run generate:semantic-ids` (updates `semanticOpIds.ts`).
2. **Register** operations via `registerAllSemanticOps` (auto-run) and migrate to LOC via `metaToOperation`.
3. **Update commands/nodes** (registry + semantics) to reference new ops.
4. **Run** `npm run validate:semantic` (ensures ops + node semantics align) and `npm run validate:commands` (includes `validateCommandSemantics`).
5. **Generate** agent catalog (`npm run generate:agent-catalog`) and run `npm run validate:semantic-integration` to ensure YAML schemas, ops, and catalog remain in sync.
6. **Analyze coverage** (`npm run analyze:coverage`, `npm run analyze:coverage2`) for operational completeness.

## Ontology Graph Snapshot
- **Domains**: `geometry` (largest), followed by `math`, `solver`, `command`, `workflow`
- **Relations**:
  - Node → Operation (dashed edges in DOT export)
  - Command → Operation
  - Goal → Solver, Solver → Goal
  - Custom relations as defined in `relations` array
- **Visualization**: `OntologyRegistry.toDOT()` outputs a Graphviz file grouping datatypes, operations, nodes, commands, goals, solvers by clusters with CMYK-inspired colors.

## Planning Considerations
- When adding features:
  - Decide which domain the new operation belongs to and define it in `semantic/ops/{domain}Ops.ts`.
  - Run the semantic ID generator and register the operation with LOC (ensures agent catalog can discover it).
  - If UI elements invoke it (command palette, Numerica node), update `commandSemantics` and/or `nodeRegistry` with `semanticOps` to maintain the chain.
  - Update YAML schema (if solver-level) and re-run semantic integration validation.

This ontological map should serve as the planning reference: any change travels through the registry, semantics, and validation scripts to keep Lingua’s agent-first architecture coherent.
