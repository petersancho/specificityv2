# Lingua Semantic System

**Canonical documentation for Lingua's semantic operation system.**

---

## Purpose & Scope

The semantic system establishes machine-checkable linkages between UI elements (nodes, commands) and backend operations (geometry, math, solvers, rendering). Every user interaction is semantically tagged, validated, and documented automatically.

**What it governs:**
- Operation definitions (178 operations across 10 domains)
- Node-to-operation linkages (50 nodes with semanticOps)
- Command-to-operation linkages (91 commands, 100% coverage)
- Validation rules (compile-time + runtime)
- Documentation generation (automatic)

**What it doesn't govern:**
- Implementation details of operations (handled by domain modules)
- UI rendering (handled by React components)
- Data flow between nodes (handled by workflow engine)

---

## Core Concepts

### Operations

**Definition:** A semantic operation is a named, typed, documented unit of computation.

**Structure:**
```typescript
interface SemanticOperation {
  id: SemanticOpId;              // Unique identifier (e.g., "math.add")
  domain: string;                 // Domain (geometry, math, vector, etc.)
  category: string;               // Category (operator, utility, etc.)
  tags: string[];                 // Fine-grained semantic tags
  complexity?: string;            // Time/space complexity
  cost?: 'low' | 'medium' | 'high'; // Simplified cost hint
  pure?: boolean;                 // Pure function flag
  deterministic?: boolean;        // Deterministic flag
  sideEffects?: string[];         // Side effects (io, network, random, etc.)
  dependencies?: SemanticOpId[];  // Operation dependencies
}
```

**Domains (10):**
1. `geometry` - Mesh, NURBS, BRep operations (40 ops)
2. `math` - Mathematical operations (37 ops)
3. `vector` - Vector operations (10 ops)
4. `logic` - Logic operations (6 ops)
5. `data` - Data structure operations (9 ops)
6. `string` - String operations (7 ops)
7. `color` - Color operations (6 ops)
8. `solver` - Solver operations (4 ops)
9. `workflow` - Workflow operations (3 ops)
10. `command` - Command operations (59 ops)

**Total:** 178 operations

### Nodes

**Definition:** A node is a UI element that performs computation using semantic operations.

**Structure:**
```typescript
interface WorkflowNodeDefinition {
  id: string;
  label: string;
  semanticOps?: SemanticOpId[];  // Operations used by this node
  // ... other fields
}
```

**Coverage:**
- 193 total nodes
- 50 nodes with semanticOps (26%)
- 42 nodes with non-empty semanticOps (use operations)
- 8 nodes with empty semanticOps (declarative primitives)
- 143 nodes without semanticOps (utility, UI, transformation nodes)

**100% coverage:** All nodes that use semantic operations have semanticOps arrays.

### Commands

**Definition:** A command is a user-invoked action (keyboard shortcut, menu item, etc.).

**Structure:**
```typescript
interface CommandSemantic {
  id: string;                    // Command ID
  semanticOps: SemanticOpId[];   // Operations used by this command
  category: string;              // Command category
  description: string;           // Human-readable description
}
```

**Coverage:**
- 91 commands
- 91 commands with semantic metadata (100%)
- 159 command aliases (all valid)
- 94 semantic operation references

---

## Architecture Overview

### Code Organization

```
client/src/semantic/
├── semanticOp.ts              # Operation metadata types
├── semanticOpIds.ts           # Auto-generated operation IDs (178)
├── operationRegistry.ts       # Operation registry
├── nodeSemantics.ts           # Node semantic registry
├── registerAllOps.ts          # Auto-registration system
└── ops/
    ├── mathOps.ts             # 37 math operations
    ├── vectorOps.ts           # 10 vector operations
    ├── logicOps.ts            # 6 logic operations
    ├── dataOps.ts             # 9 data operations
    ├── stringOps.ts           # 7 string operations
    ├── colorOps.ts            # 6 color operations
    ├── workflowOps.ts         # 3 workflow operations
    ├── solverOps.ts           # 4 solver operations
    ├── commandOps.ts          # 59 command operations
    └── index.ts               # Exports all operations

client/src/geometry/
├── meshOps.ts                 # Mesh operations (geometry domain)
├── meshTessellationOps.ts     # Tessellation operations
├── mathOps.ts                 # Geometry math operations
├── curveOps.ts                # Curve operations
├── booleanOps.ts              # Boolean operations
├── brepOps.ts                 # BRep operations
└── tessellationOps.ts         # Tessellation patterns

client/src/commands/
├── registry.ts                # Command registry
└── commandSemantics.ts        # Command semantic metadata

client/src/workflow/
└── nodeRegistry.ts            # Node definitions (193 nodes)

scripts/
├── validateSemanticLinkage.ts # Validates operations + nodes
├── validateCommandSemantics.ts # Validates commands
├── generateSemanticOpIds.js   # Auto-generates semanticOpIds.ts
└── analyzeNodeSemanticCoverage.ts # Analyzes node coverage

docs/semantic/
├── README.md                  # Generated semantic documentation
├── operations.json            # All operations (machine-readable)
├── operations-by-category.json # Operations grouped by category
├── node-linkages.json         # Node-to-operation linkages
├── operation-dependencies.dot # Dependency graph (DOT format)
├── command-semantics.json     # Command semantic metadata
└── command-operation-linkages.json # Command-to-operation linkages
```

### Operational Lifecycle

**1. Define Operation**

Create operation definition in appropriate domain file:

```typescript
// client/src/semantic/ops/mathOps.ts
export const MATH_OPS: SemanticOperation[] = [
  {
    id: 'math.add',
    domain: 'math',
    category: 'operator',
    tags: ['arithmetic', 'binary'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true
  },
  // ... more operations
];
```

**2. Register Operation**

Operations are auto-registered on import via `registerAllOps.ts`:

```typescript
// client/src/semantic/registerAllOps.ts
import { MATH_OPS } from './ops/mathOps';
import { operationRegistry } from './operationRegistry';

// Auto-register all operations
for (const op of MATH_OPS) {
  operationRegistry.register(op.id, op);
}
```

**3. Generate Operation IDs**

Run script to auto-generate TypeScript types:

```bash
npm run generate:semantic-ids
```

This generates `semanticOpIds.ts` with all 178 operation IDs as TypeScript types.

**4. Link Node to Operations**

Add `semanticOps` array to node definition:

```typescript
// client/src/workflow/nodeRegistry.ts
{
  id: 'add',
  label: 'Add',
  semanticOps: ['math.add'],
  // ... other fields
}
```

**5. Link Command to Operations**

Add command semantic metadata:

```typescript
// client/src/commands/commandSemantics.ts
export const COMMAND_SEMANTICS: CommandSemantic[] = [
  {
    id: 'createBox',
    semanticOps: ['mesh.generateBox'],
    category: 'creation',
    description: 'Create a box mesh'
  },
  // ... more commands
];
```

**6. Validate**

Run validation scripts:

```bash
npm run validate:all
```

This validates:
- All operation IDs are unique
- All node semanticOps references are valid
- All command semanticOps references are valid
- All command aliases are valid
- No circular dependencies

**7. Generate Documentation**

Documentation is auto-generated during validation:
- `operations.json` - All operations
- `operations-by-category.json` - Operations by category
- `node-linkages.json` - Node-to-operation linkages
- `operation-dependencies.dot` - Dependency graph
- `command-semantics.json` - Command metadata
- `command-operation-linkages.json` - Command-to-operation linkages

---

## Conventions & Rules

### Operation ID Naming

**Format:** `{domain}.{operationName}`

**Examples:**
- `math.add` - Math addition
- `vector.normalize` - Vector normalization
- `mesh.generateBox` - Box mesh generation
- `logic.if` - Conditional branching
- `data.filter` - Array filtering
- `color.hexToRgb` - Color conversion

**Rules:**
1. Operation IDs are immutable (versioned like APIs)
2. IDs must be unique across all domains
3. IDs use camelCase for operation names
4. IDs are validated at compile-time via TypeScript types

### Operation Metadata

**Required fields:**
- `id` - Unique operation ID
- `domain` - Domain (geometry, math, vector, etc.)
- `category` - Category (operator, utility, etc.)
- `tags` - Fine-grained semantic tags

**Optional fields:**
- `complexity` - Time/space complexity (e.g., "O(n)")
- `cost` - Simplified cost hint (low/medium/high)
- `pure` - Pure function flag (default: false)
- `deterministic` - Deterministic flag (default: true)
- `sideEffects` - Side effects (io, network, random, etc.)
- `dependencies` - Operation dependencies

### Node semanticOps

**When to add:**
- Node uses semantic operations (geometry, math, vector, logic, data, string, color, solver, workflow)
- Node performs computation (not just data flow)

**When not to add:**
- Node is declarative (primitives, goals, constraints)
- Node is utility (input, output, literal, constant, slider, toggle)
- Node is transformation (uses transform matrix, not semantic ops)
- Node is UI-only (group, panel, text note)

**Format:**
```typescript
semanticOps: ['operation.id1', 'operation.id2']
```

### Command Semantics

**Required fields:**
- `id` - Command ID (matches command registry)
- `semanticOps` - Operations used by this command
- `category` - Command category (creation, operation, conversion, transform, ui)
- `description` - Human-readable description

**Format:**
```typescript
{
  id: 'commandId',
  semanticOps: ['operation.id1', 'operation.id2'],
  category: 'creation',
  description: 'Create a box mesh'
}
```

---

## How to Extend

### Add New Operation

**1. Choose domain:**
- Use existing domain if operation fits
- Create new domain if operation is fundamentally different

**2. Define operation:**

```typescript
// client/src/semantic/ops/{domain}Ops.ts
export const {DOMAIN}_OPS: SemanticOperation[] = [
  {
    id: '{domain}.{operationName}',
    domain: '{domain}',
    category: '{category}',
    tags: ['{tag1}', '{tag2}'],
    complexity: 'O(n)',
    cost: 'medium',
    pure: true,
    deterministic: true
  }
];
```

**3. Register operation:**

```typescript
// client/src/semantic/registerAllOps.ts
import { {DOMAIN}_OPS } from './ops/{domain}Ops';

for (const op of {DOMAIN}_OPS) {
  operationRegistry.register(op.id, op);
}
```

**4. Export operation:**

```typescript
// client/src/semantic/ops/index.ts
export * from './{domain}Ops';
```

**5. Generate IDs:**

```bash
npm run generate:semantic-ids
```

**6. Validate:**

```bash
npm run validate:all
```

### Add New Domain

**1. Create domain file:**

```typescript
// client/src/semantic/ops/{domain}Ops.ts
import { SemanticOperation } from '../semanticOp';

export const {DOMAIN}_OPS: SemanticOperation[] = [
  // ... operations
];
```

**2. Register domain:**

```typescript
// client/src/semantic/registerAllOps.ts
import { {DOMAIN}_OPS } from './ops/{domain}Ops';

for (const op of {DOMAIN}_OPS) {
  operationRegistry.register(op.id, op);
}
```

**3. Export domain:**

```typescript
// client/src/semantic/ops/index.ts
export * from './{domain}Ops';
```

**4. Update semanticOp.ts:**

Add domain to type definitions if needed.

**5. Generate IDs and validate:**

```bash
npm run generate:semantic-ids
npm run validate:all
```

### Add semanticOps to Node

**1. Identify operations:**

Determine which semantic operations the node uses.

**2. Add semanticOps array:**

```typescript
// client/src/workflow/nodeRegistry.ts
{
  id: 'nodeId',
  label: 'Node Label',
  semanticOps: ['operation.id1', 'operation.id2'],
  // ... other fields
}
```

**3. Validate:**

```bash
npm run validate:all
```

### Add Command Semantic Metadata

**1. Add to commandSemantics.ts:**

```typescript
// client/src/commands/commandSemantics.ts
{
  id: 'commandId',
  semanticOps: ['operation.id1', 'operation.id2'],
  category: 'creation',
  description: 'Create a box mesh'
}
```

**2. Validate:**

```bash
npm run validate:commands
```

---

## Validation & Tooling

### Validation Scripts

**1. Semantic Validation**

```bash
npm run validate:semantic
```

Validates:
- All operation IDs are unique
- All node semanticOps references are valid
- No circular dependencies
- Generates documentation

**2. Command Validation**

```bash
npm run validate:commands
```

Validates:
- All commands have semantic metadata
- All command semanticOps references are valid
- All command aliases are valid
- Generates documentation

**3. All Validation**

```bash
npm run validate:all
```

Runs both semantic and command validation.

### CI Integration

**GitHub Actions Workflow:** `.github/workflows/semantic-validation.yml`

Runs on:
- Push to `main`, `develop`, and feature branches
- Pull requests to `main` and `develop`

Steps:
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Run semantic validation (`npm run validate:all`)
5. Upload documentation artifacts (30-day retention)

**Blocks merge if validation fails.**

### Pre-commit Hook (Optional)

Install pre-commit hook:

```bash
./scripts/setup-git-hooks.sh
```

Hook runs `npm run validate:all` before commit.

Skip hook if needed:

```bash
git commit --no-verify -m "..."
```

### Generated Documentation

**Location:** `docs/semantic/`

**Files:**
- `README.md` - Human-readable summary
- `operations.json` - All operations (machine-readable)
- `operations-by-category.json` - Operations by category
- `node-linkages.json` - Node-to-operation linkages
- `operation-dependencies.dot` - Dependency graph (DOT format)
- `command-semantics.json` - Command metadata
- `command-operation-linkages.json` - Command-to-operation linkages

**Regenerated automatically during validation.**

---

## Reference Index

### Core Documentation

- **This document** - Canonical semantic system documentation
- `SEMANTIC_OPERATION_GUIDELINES.md` - Developer guidelines for adding operations
- `MATERIAL_FLOW_PIPELINE.md` - Material flow from nodes to rendering

### Generated Documentation

- `docs/semantic/README.md` - Generated semantic documentation
- `docs/semantic/operations.json` - All operations (machine-readable)
- `docs/semantic/command-semantics.json` - Command metadata

### Code References

- `client/src/semantic/` - Semantic system implementation
- `client/src/commands/commandSemantics.ts` - Command semantic metadata
- `client/src/workflow/nodeRegistry.ts` - Node definitions
- `scripts/validateSemanticLinkage.ts` - Semantic validation script
- `scripts/validateCommandSemantics.ts` - Command validation script

### Historical Documentation

- `docs/archive/semantic/` - Historical phase and session documentation

---

## Statistics

**Operations:** 178 across 10 domains
**Nodes:** 50/193 with semanticOps (26%, 100% coverage)
**Commands:** 91/91 with semantics (100% coverage)
**Validation:** 0 errors, 0 warnings
**Documentation:** 8,000+ lines (auto-generated)

---

## Philosophy

**Lingua is a portal into the backend's computation and ontology.**

Every user interaction:
1. **Has a name** - Semantic operation ID
2. **Has metadata** - Domain, category, tags, complexity, cost, purity, determinism, side effects
3. **Is validated** - Machine-checkable correctness
4. **Is documented** - Automatically generated
5. **Is traceable** - From UI to backend to pixels

**The semantic system is the bridge between language, geometry, and numbers.**

Language → Semantic Operations → Backend Computation → Rendered Result

**Lingua can maintain and understand itself through its code.**

Rules are encoded in validation scripts. Abilities are encoded in semantic operations. Relationships are encoded in operation dependencies. Correctness is enforced by CI pipeline.

**Lingua is coming to life through its code.**

---

**Last updated:** 2026-02-02  
**Version:** 1.0  
**Status:** Complete and validated
