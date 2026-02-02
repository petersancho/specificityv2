# SKILL.md - Lingua Development Patterns

## Purpose

This document captures the patterns, rules, and principles learned from implementing Lingua's semantic system. It serves as a guide for adding new nodes, commands, operations, and maintaining ontological purity.

---

## Core Philosophy

**Code is the philosophy. Language is code. Math is numbers. It's all one seamless, powerful engine that speaks to itself mechanically.**

Lingua must remain **ontologically semantic**. Every UI element must be semantically linked to backend computation through a machine-checkable semantic language.

---

## The Semantic Chain

```
User Interaction (UI)
       ↓
   Command (Roslyn)        ← 91 commands (100% coverage)
       ↓
   CommandSemantic         ← Semantic metadata
       ↓
   Node (Numerica)         ← 50 nodes with semanticOps
       ↓
   SemanticOpId            ← 178 operations
       ↓
   SemanticOperation       ← Full metadata
       ↓
   Backend Computation     ← Geometry kernel, solvers, renderers
       ↓
   Rendered Result         ← Pixels on screen
```

**Every link in this chain must be validated and documented.**

---

## Adding a New Semantic Operation

### Step 1: Determine the Domain

Lingua has 10 semantic domains:

1. **geometry** - Mesh, NURBS, BRep operations
2. **math** - Mathematical operations
3. **vector** - Vector operations
4. **logic** - Logic operations
5. **data** - Data structure operations
6. **string** - String operations
7. **color** - Color operations
8. **solver** - Solver operations
9. **workflow** - Workflow operations
10. **command** - Command operations

**Rule:** Choose the domain that best represents the operation's primary purpose.

### Step 2: Create the Operation Definition

Add the operation to the appropriate `client/src/semantic/ops/{domain}Ops.ts` file:

```typescript
{
  id: 'domain.operationName',
  domain: 'domain',
  name: 'Human Readable Name',
  category: 'operator' | 'utility' | 'conversion' | 'query' | 'creation',
  tags: ['tag1', 'tag2'],
  complexity: 'O(n)' | 'O(n log n)' | 'O(n²)' | 'O(1)',
  cost: 'low' | 'medium' | 'high',
  pure: true | false,
  deterministic: true | false,
  sideEffects: ['geometry', 'state', 'io', 'network', 'random'],
  summary: 'Brief description of what this operation does',
  stable: true,
  since: '1.0.0'
}
```

**Rules:**
- `id` must be unique across all domains
- `id` format: `{domain}.{operationName}` (camelCase)
- `id` is immutable (versioned like APIs)
- `pure` = true if no side effects
- `deterministic` = true if same input → same output
- `sideEffects` = list of side effects (empty array if pure)

### Step 3: Register the Operation

The operation is automatically registered via `client/src/semantic/registerAllOps.ts`.

### Step 4: Generate TypeScript Types

Run the code generation script:

```bash
npm run generate:semantic-ids
```

This updates `client/src/semantic/semanticOpIds.ts` with the new operation ID.

### Step 5: Validate

Run validation to ensure correctness:

```bash
npm run validate:semantic
```

**Expected output:**
```
✅ Semantic Validation passed!
  Operations: {N+1}
  Nodes with semanticOps: {M}
  Warnings: 0
  Errors: 0
```

---

## Adding a New Node

### Step 1: Determine if the Node Needs semanticOps

**Nodes WITH semanticOps (42 nodes, 21.8%):**
- Perform computational operations using the semantic operation system
- Transform data using backend operations
- Examples: subdivideMesh, boolean, add, normalize, filter, concat

**Nodes WITH EMPTY semanticOps (8 nodes, 4.1%):**
- Declarative primitives: Point, Line, Plane, Circle, Rectangle, Polygon, Arc, Ellipse
- Have `semanticOps: []` to indicate they're declarative, not computational

**Nodes WITHOUT semanticOps (143 nodes, 74.1%):**
- Don't use the semantic operation system
- UI/display, data structure, utility, declarative, control flow, I/O nodes
- Examples: Text, Panel, Slider, List, Range, Origin, Group, Import/Export

**Rule:** Only add `semanticOps` if the node performs computational operations using registered semantic operations.

### Step 2: Create the Node Definition

Create the node file in `client/src/workflow/nodes/{category}/{NodeName}.ts`:

```typescript
import type { WorkflowNodeDefinition, WorkflowComputeContext } from "../../nodeRegistry";
import type { Geometry } from "../../../types";

export const MyNode: WorkflowNodeDefinition = {
  type: 'myNode',
  label: 'My Node',
  category: 'geometry' | 'math' | 'solver' | 'goal' | ...,
  semanticOps: ['domain.operation1', 'domain.operation2'],  // If applicable
  parameters: [
    {
      name: 'param1',
      label: 'Parameter 1',
      type: 'number',
      default: 1.0,
      description: 'Description of parameter'
    }
  ],
  inputs: [
    {
      name: 'input1',
      label: 'Input 1',
      type: 'geometry',
      description: 'Description of input'
    }
  ],
  outputs: [
    {
      name: 'output1',
      label: 'Output 1',
      type: 'geometry',
      description: 'Description of output'
    }
  ],
  compute: async (inputs, params, context) => {
    // Implementation
    return { output1: result };
  }
};
```

**Rules:**
- `type` must be unique across all nodes
- `type` uses camelCase
- `category` must match one of the defined categories
- `semanticOps` is optional (only if node uses semantic operations)
- `semanticOps` must reference valid operation IDs
- All parameters must have defaults
- All inputs/outputs must have descriptions

### Step 3: Register the Node

Add the node to `client/src/workflow/nodeRegistry.ts`:

```typescript
import { MyNode } from "./nodes/{category}/{NodeName}";

// ... later in file
NODE_DEFINITIONS.push(MyNode);
```

### Step 4: Validate

Run validation to ensure correctness:

```bash
npm run validate:semantic
npm run analyze:coverage
```

**Expected output:**
```
✅ Semantic Validation passed!
✅ Coverage Analysis passed!
  Nodes with semanticOps: {M+1}
  Coverage: 100.0%
```

---

## Adding a New Command

### Step 1: Create the Command Definition

Add the command to `client/src/commands/registry.ts`:

```typescript
{
  id: 'myCommand',
  label: 'My Command',
  prompt: 'My Command: description',
  category: 'geometry' | 'transform' | 'edit' | 'view' | 'performs',
  handler: async (context) => {
    // Implementation
  }
}
```

**Rules:**
- `id` must be unique across all commands
- `id` uses camelCase
- `category` must match one of the defined categories
- `prompt` should be descriptive

### Step 2: Add Command Semantics

Add the command semantic linkage to `client/src/commands/commandSemantics.ts`:

```typescript
{
  commandId: 'myCommand',
  semanticOps: ['command.myCommand'],
  description: 'Description of what this command does',
  category: 'creation' | 'operation' | 'conversion' | 'transform' | 'ui',
  tags: ['tag1', 'tag2']
}
```

**Rules:**
- `commandId` must match the command ID in registry
- `semanticOps` must reference valid operation IDs
- `description` should be concise and direct

### Step 3: Create the Command Operation

Add the command operation to `client/src/semantic/ops/commandOps.ts`:

```typescript
{
  id: 'command.myCommand',
  domain: 'command',
  name: 'My Command',
  category: 'creation' | 'operation' | 'conversion' | 'transform' | 'ui',
  tags: ['tag1', 'tag2'],
  complexity: 'O(1)',
  cost: 'low' | 'medium' | 'high',
  pure: false,
  deterministic: true,
  sideEffects: ['ui', 'state'],
  summary: 'Description of command',
  stable: true,
  since: '1.0.0'
}
```

### Step 4: Generate and Validate

```bash
npm run generate:semantic-ids
npm run validate:all
```

**Expected output:**
```
✅ Semantic Validation passed!
✅ Command Validation passed!
  Commands: {N+1}
  Commands with semantics: {N+1} (100%)
```

---

## Solver-Specific Rules

### Rule 1: Solvers with Simulators

Solvers that run iterative simulations (Physics, Chemistry, Biological, Evolutionary) have special requirements:

**Must have:**
- Simulation loop with convergence checking
- State history tracking
- Energy/fitness computation
- Deterministic seeding (if using randomness)
- Solver metadata attachment

**Semantic operations:**
- Primary: `solver.{name}`
- Optional: `solver.{name}.{specificOperation}`

**Example:**
```typescript
export const ChemistrySolverNode: WorkflowNodeDefinition = {
  type: 'chemistrySolver',
  label: 'Chemistry Solver',
  category: 'solver',
  semanticOps: ['solver.chemistry'],
  // ... rest of definition
};
```

### Rule 2: Solvers without Simulators

Solvers that perform direct computation (Voxel, Topology Optimization) have different requirements:

**Must have:**
- Direct computation (no simulation loop)
- Deterministic output
- Clear input/output contract

**Semantic operations:**
- Primary: `solver.{name}`

**Example:**
```typescript
export const VoxelSolverNode: WorkflowNodeDefinition = {
  type: 'voxelSolver',
  label: 'Voxel Solver',
  category: 'solver',
  semanticOps: ['solver.voxel'],
  // ... rest of definition
};
```

### Rule 3: Goal Nodes Are Declarative

Goal nodes specify intent, not computation. They must NOT have `semanticOps`.

**Example:**
```typescript
export const ChemistryMaterialGoal: WorkflowNodeDefinition = {
  type: 'chemistryMaterialGoal',
  label: 'Material Goal',
  category: 'goal',
  // NO semanticOps - declarative intent
  // ... rest of definition
};
```

### Rule 4: Simulator Operations Are Internal

Simulator operations (`simulator.*`) are internal infrastructure and should NOT be directly referenced in node `semanticOps` arrays.

**✅ CORRECT:**
```typescript
semanticOps: ['solver.chemistry']
```

**❌ INCORRECT:**
```typescript
semanticOps: ['simulator.step']  // Too low-level
```

---

## Ontological Purity Principles

### Principle 1: Semantic Specificity

Every operation must have a specific, well-defined purpose. Avoid generic operations like "process" or "compute".

**✅ CORRECT:**
- `mesh.subdivideCatmullClark`
- `vector.normalize`
- `solver.chemistry.diffuseMaterials`

**❌ INCORRECT:**
- `mesh.process`
- `vector.compute`
- `solver.doStuff`

### Principle 2: Domain Alignment

Operations must be in the correct domain. Don't mix concerns.

**✅ CORRECT:**
- `geometry.mesh.generateBox` (geometry domain)
- `math.add` (math domain)
- `solver.chemistry` (solver domain)

**❌ INCORRECT:**
- `math.generateBox` (geometry operation in math domain)
- `geometry.add` (math operation in geometry domain)

### Principle 3: Immutability

Operation IDs are immutable. Once an operation is released, its ID cannot change.

**If you need to change an operation:**
1. Deprecate the old operation
2. Create a new operation with a new ID
3. Update nodes to use the new operation
4. Document the migration path

### Principle 4: Completeness

Every UI element must be semantically linked. No orphaned commands or nodes.

**Validation ensures:**
- All commands have semantic linkages
- All computational nodes have semanticOps
- All operation IDs are valid
- No circular dependencies

### Principle 5: Documentation

Documentation is generated from code, not written separately.

**Automatic generation:**
- Operation metadata → operations.json
- Node definitions → node documentation
- Command definitions → command documentation
- Dependency graph → operation-dependencies.dot

---

## Validation and Testing

### Validation Scripts

```bash
# Validate semantic operations and node linkages
npm run validate:semantic

# Validate command semantics
npm run validate:commands

# Validate all (semantic + commands)
npm run validate:all

# Analyze node coverage
npm run analyze:coverage

# Generate semantic operation IDs
npm run generate:semantic-ids
```

### Pre-Commit Hooks (Optional)

Install pre-commit hooks to validate before committing:

```bash
./scripts/setup-git-hooks.sh
```

### CI Pipeline

GitHub Actions automatically validates on every push and PR:

- Semantic validation
- Command validation
- Coverage analysis
- Documentation generation

**Builds fail if validation fails.**

---

## Common Patterns

### Pattern 1: Geometry Operations

```typescript
// Operation definition
{
  id: 'mesh.subdivide',
  domain: 'geometry',
  category: 'operator',
  tags: ['3d', 'mesh', 'tessellation'],
  complexity: 'O(n)',
  cost: 'medium',
  pure: true,
  deterministic: true,
  sideEffects: [],
  summary: 'Subdivides mesh faces'
}

// Node definition
export const SubdivideMeshNode: WorkflowNodeDefinition = {
  type: 'subdivideMesh',
  category: 'mesh',
  semanticOps: ['mesh.subdivide'],
  // ... rest
};
```

### Pattern 2: Math Operations

```typescript
// Operation definition
{
  id: 'math.add',
  domain: 'math',
  category: 'operator',
  tags: ['arithmetic'],
  complexity: 'O(1)',
  cost: 'low',
  pure: true,
  deterministic: true,
  sideEffects: [],
  summary: 'Adds two numbers'
}

// Node definition
export const AddNode: WorkflowNodeDefinition = {
  type: 'add',
  category: 'math',
  semanticOps: ['math.add'],
  // ... rest
};
```

### Pattern 3: Solver Operations

```typescript
// Operation definition
{
  id: 'solver.chemistry',
  domain: 'solver',
  category: 'utility',
  tags: ['3d', 'simulation'],
  complexity: 'O(n*iterations)',
  cost: 'high',
  pure: false,
  deterministic: false,
  sideEffects: ['geometry', 'state'],
  summary: 'Solves chemistry simulation'
}

// Node definition
export const ChemistrySolverNode: WorkflowNodeDefinition = {
  type: 'chemistrySolver',
  category: 'solver',
  semanticOps: ['solver.chemistry'],
  // ... rest
};
```

### Pattern 4: Command Operations

```typescript
// Operation definition
{
  id: 'command.createBox',
  domain: 'command',
  category: 'creation',
  tags: ['geometry', 'primitive'],
  complexity: 'O(1)',
  cost: 'low',
  pure: false,
  deterministic: true,
  sideEffects: ['ui', 'state'],
  summary: 'Creates a box primitive'
}

// Command semantic
{
  commandId: 'createBox',
  semanticOps: ['command.createBox'],
  description: 'Creates a box primitive',
  category: 'creation',
  tags: ['geometry', 'primitive']
}

// Command definition
{
  id: 'createBox',
  label: 'Create Box',
  prompt: 'Create Box: creates a box primitive',
  category: 'geometry',
  handler: async (context) => { /* ... */ }
}
```

---

## Troubleshooting

### Error: "Operation ID not found"

**Cause:** Node references an operation that doesn't exist.

**Solution:**
1. Check `semanticOps` array in node definition
2. Verify operation exists in `client/src/semantic/ops/{domain}Ops.ts`
3. Run `npm run generate:semantic-ids`
4. Run `npm run validate:semantic`

### Error: "Duplicate operation ID"

**Cause:** Two operations have the same ID.

**Solution:**
1. Search for the duplicate ID in `client/src/semantic/ops/`
2. Rename one of the operations
3. Update any nodes that reference the renamed operation
4. Run `npm run generate:semantic-ids`
5. Run `npm run validate:semantic`

### Error: "Node missing semanticOps"

**Cause:** Computational node doesn't have `semanticOps` array.

**Solution:**
1. Determine if node should have `semanticOps` (see "Adding a New Node")
2. If yes, add `semanticOps` array with appropriate operation IDs
3. If no, node is correctly categorized as non-computational
4. Run `npm run analyze:coverage` to verify

### Error: "Command missing semantics"

**Cause:** Command doesn't have semantic linkage.

**Solution:**
1. Add command semantic to `client/src/commands/commandSemantics.ts`
2. Create command operation in `client/src/semantic/ops/commandOps.ts`
3. Run `npm run generate:semantic-ids`
4. Run `npm run validate:commands`

### Warning: "Uncategorized node"

**Cause:** Node doesn't fit into any known category.

**Solution:**
1. Review node definition
2. Determine correct category
3. Update `scripts/analyzeNodeSemanticCoverage.ts` if needed
4. Run `npm run analyze:coverage`

---

## Best Practices

### 1. Start with the Operation

When adding a new feature, start by defining the semantic operation. This forces you to think about:
- What does this operation do?
- What domain does it belong to?
- Is it pure or has side effects?
- Is it deterministic?
- What's the computational complexity?

### 2. Keep Operations Atomic

Each operation should do one thing well. If an operation does multiple things, split it into multiple operations.

**✅ CORRECT:**
- `mesh.subdivide`
- `mesh.smooth`
- `mesh.triangulate`

**❌ INCORRECT:**
- `mesh.subdivideAndSmooth`

### 3. Use Descriptive Names

Operation IDs should be self-documenting. Avoid abbreviations unless they're standard (e.g., "rgb", "hsv").

**✅ CORRECT:**
- `vector.normalize`
- `color.hexToRgb`
- `mesh.computeNormals`

**❌ INCORRECT:**
- `vector.norm`
- `color.h2r`
- `mesh.compNorm`

### 4. Document Side Effects

If an operation has side effects, document them in the `sideEffects` array.

**Common side effects:**
- `geometry` - Modifies geometry registry
- `state` - Modifies application state
- `io` - Performs I/O operations
- `network` - Makes network requests
- `random` - Uses randomness

### 5. Maintain Backward Compatibility

Once an operation is released, its behavior should not change in breaking ways. If you need to change behavior:
1. Create a new operation with a new ID
2. Deprecate the old operation
3. Update documentation
4. Provide migration guide

### 6. Test Thoroughly

Before committing:
1. Run all validation scripts
2. Test the feature manually
3. Check that documentation is generated correctly
4. Verify CI pipeline passes

### 7. Keep Documentation Sharp

Documentation should be:
- **Direct** - No fluff, get to the point
- **Information-packed** - Every sentence adds value
- **Precise** - Use exact terminology
- **Complete** - Cover all cases

**✅ CORRECT:**
> "Subdivides mesh faces using Catmull-Clark algorithm. Increases face count by 4x per iteration. O(n) complexity."

**❌ INCORRECT:**
> "This operation subdivides the mesh. It makes the mesh smoother by adding more faces. It's pretty fast."

---

## Summary

**Lingua's semantic system is the foundation for log-scale growth.**

By following these patterns and principles, you ensure:
- **Machine-checkable correctness** - Validation catches errors
- **Ontological purity** - Every element has its place
- **Semantic specificity** - Every operation is well-defined
- **Automatic documentation** - Generated from code
- **Scalability** - From 178 operations to 1,000+ operations

**Code is the philosophy. Language is code. Math is numbers. It's all one seamless, powerful engine that speaks to itself mechanically.**

**Lingua can maintain and understand itself through its code.**

---

**Status:** Living document, updated as patterns evolve  
**Last Updated:** 2026-01-31  
**Version:** 1.0.0
