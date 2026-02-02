# Semantic Operation System - Developer Guidelines

> **📖 Canonical Documentation:** See [`SEMANTIC_SYSTEM.md`](./SEMANTIC_SYSTEM.md) for complete system documentation.

## Overview

The Semantic Operation System is Lingua's foundation for machine-checkable correctness, automatic documentation generation, and log-scale capability growth. This document provides practical guidelines for developers working with semantic operations.

For architectural overview, philosophy, and complete reference, see [`SEMANTIC_SYSTEM.md`](./SEMANTIC_SYSTEM.md).

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Adding New Operations](#adding-new-operations)
3. [Adding semanticOps to Nodes](#adding-semanticops-to-nodes)
4. [Validation](#validation)
5. [CI Integration](#ci-integration)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Core Concepts

### What is a Semantic Operation?

A **semantic operation** is a function wrapped with metadata that describes:
- **What it does** (name, summary, description)
- **What domain it belongs to** (geometry, math, vector, logic, etc.)
- **How complex it is** (time/space complexity)
- **What it depends on** (other operations)
- **What properties it has** (pure, deterministic, side effects)

### Why Semantic Operations?

1. **Single Source of Truth** - All operation metadata lives in one place
2. **Machine-Checkable Correctness** - Validation ensures all references are valid
3. **Compile-Time Safety** - TypeScript catches invalid operation IDs
4. **Automatic Documentation** - Operations JSON and dependency graphs generated automatically
5. **Log-Scale Growth** - Clear patterns enable growing from 100 to 1,000+ operations

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Semantic Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Operation   │  │  Operation   │  │    Node      │      │
│  │  Registry    │  │  Metadata    │  │  Semantics   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
           ▲                    ▲                    ▲
           │                    │                    │
┌──────────┴────────┐  ┌────────┴────────┐  ┌───────┴────────┐
│  Geometry Ops     │  │   Math Ops      │  │  Node Registry │
│  (meshOps.ts)     │  │  (mathOps.ts)   │  │ (nodeRegistry) │
└───────────────────┘  └─────────────────┘  └────────────────┘
```

---

## Adding New Operations

### Step 1: Choose the Right Domain

Operations are organized by domain:

| Domain | Description | Examples |
|--------|-------------|----------|
| `geometry` | Geometry operations (mesh, NURBS, BRep) | `mesh.generateBox`, `meshTess.subdivide` |
| `math` | Mathematical operations | `math.add`, `math.sin`, `math.lerp` |
| `vector` | Vector operations | `vector.normalize`, `vector.cross` |
| `logic` | Logic operations | `logic.and`, `logic.if` |
| `data` | Data structure operations | `data.filter`, `data.map` |
| `string` | String operations | `string.concat`, `string.split` |
| `color` | Color operations | `color.hexToRgb`, `color.blend` |
| `solver` | Solver operations | `solver.physics`, `solver.chemistry` |
| `workflow` | Workflow operations | `workflow.literal`, `workflow.identity` |

### Step 2: Create or Update Operation File

Operations are defined in `client/src/semantic/ops/{domain}Ops.ts` or `client/src/geometry/{module}Ops.ts`.

**Example: Adding a new math operation**

```typescript
// client/src/semantic/ops/mathOps.ts

import { defineSemanticOp } from '../semanticOp';

export const clamp = defineSemanticOp({
  id: 'math.clamp',
  domain: 'math',
  name: 'Clamp',
  category: 'utility',
  tags: ['math', 'numeric'],
  summary: 'Clamps a value between min and max',
  complexity: 'O(1)',
  cost: 'low',
  pure: true,
  deterministic: true,
  sideEffects: []
});
```

**Example: Adding a new geometry operation**

```typescript
// client/src/geometry/meshOps.ts

import { defineOp } from '../semantic/geometryOp';

export const generateTorus = defineOp(
  {
    id: 'mesh.generateTorus',
    domain: 'geometry',
    name: 'Generate Torus',
    category: 'primitive',
    tags: ['mesh', '3d', 'primitive'],
    summary: 'Generates a torus mesh',
    complexity: 'O(n)',
    cost: 'medium',
    pure: true,
    deterministic: true,
    sideEffects: []
  },
  (majorRadius: number, minorRadius: number, segments: number): MeshData => {
    // Implementation here
    return { positions, indices, normals };
  }
);
```

### Step 3: Register the Operation

**For semantic operations (metadata-only):**

Add to `client/src/semantic/registerAllOps.ts`:

```typescript
import * as mathOps from './ops/mathOps';

// Register all operations
Object.values(mathOps).forEach(op => {
  if (op && typeof op === 'object' && 'id' in op) {
    operationRegistry.register(op.id, op);
  }
});
```

**For geometry operations (with implementation):**

Operations are auto-registered when the module is imported. Just import the module in `scripts/validateSemanticLinkage.ts`:

```typescript
import '../client/src/geometry/meshOps';
```

### Step 4: Update semanticOpIds.ts

Run the generator script to update the TypeScript types:

```bash
npm run generate:semantic-ids
```

Or manually add to `client/src/semantic/semanticOpIds.ts`:

```typescript
export const SEMANTIC_OP_IDS = [
  // ... existing IDs
  "math.clamp",
] as const;
```

### Step 5: Validate

Run validation to ensure everything is correct:

```bash
npm run validate:semantic
```

---

## Adding semanticOps to Nodes

### When to Add semanticOps

Add `semanticOps` to a node when it:
- Calls geometry operations (mesh generation, tessellation, etc.)
- Calls math operations (add, multiply, sin, etc.)
- Calls vector operations (normalize, cross, etc.)
- Calls any other semantic operation

### How to Add semanticOps

**Step 1: Identify operations used**

Look at the node's `compute` function and identify all semantic operations called:

```typescript
{
  type: "subdivideMesh",
  compute: ({ inputs, parameters }) => {
    const mesh = toTessellationMesh(inputMesh);           // meshTess.toTessellationMesh
    const subdivided = subdivideCatmullClark(mesh, 2);    // meshTess.subdivideCatmullClark
    const renderMesh = tessellationMeshToRenderMesh(subdivided); // meshTess.tessellationMeshToRenderMesh
    return { meshData: renderMesh };
  }
}
```

**Step 2: Add semanticOps array**

Add the `semanticOps` field with all operation IDs:

```typescript
{
  type: "subdivideMesh",
  semanticOps: [
    "meshTess.toTessellationMesh",
    "meshTess.subdivideCatmullClark",
    "meshTess.tessellationMeshToRenderMesh"
  ] as const,
  compute: ({ inputs, parameters }) => {
    // ... same implementation
  }
}
```

**Step 3: Validate**

Run validation to ensure all operation IDs are valid:

```bash
npm run validate:semantic
```

### Best Practices

1. **List operations in order of use** - Makes it easier to understand the flow
2. **Use `as const`** - Ensures readonly array and better type inference
3. **Don't include helper functions** - Only include semantic operations
4. **Keep it up to date** - Update when implementation changes

---

## Validation

### Running Validation

**Locally:**

```bash
npm run validate:semantic
```

**In CI:**

Validation runs automatically on:
- Push to `main`, `develop`, or feature branches
- Pull requests to `main` or `develop`

### What Gets Validated

1. **Operation Registry**
   - All operation IDs are unique
   - All required metadata is present
   - All dependencies exist
   - No circular dependencies

2. **Node Linkages**
   - All `semanticOps` reference valid operation IDs
   - No duplicate operation IDs within a node

3. **Documentation**
   - Operations JSON is generated
   - Dependency graph is generated
   - Markdown summary is generated

### Validation Output

**Success:**

```
✅ Validation passed!
  Operations: 119
  Nodes with semanticOps: 50
  Warnings: 0
  Errors: 0
```

**Failure:**

```
❌ Validation failed!
  ❌ 2 errors:
     - [subdivideMesh] References unknown semantic op: mesh.invalidOp
     - [boolean] Duplicate semantic op: mesh.generateBox
```

---

## CI Integration

### GitHub Actions Workflow

The semantic validation workflow runs on every push and pull request:

```yaml
name: Semantic Validation

on:
  push:
    branches: [ main, develop, feat/*, fix/* ]
  pull_request:
    branches: [ main, develop ]

jobs:
  validate:
    name: Validate Semantic Linkage
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run validate:semantic
```

### Pre-commit Hook (Optional)

To run validation before every commit, use the `precommit` script:

```bash
npm run precommit
```

Or set up a Git hook:

```bash
# .git/hooks/pre-commit
#!/bin/sh
npm run validate:semantic
```

---

## Best Practices

### Operation Design

1. **Stable IDs** - Operation IDs are immutable (versioned like APIs)
2. **Clear Names** - Use descriptive names that explain what the operation does
3. **Accurate Metadata** - Ensure complexity, cost, and flags are correct
4. **Minimal Dependencies** - Only declare true dependencies

### Node Design

1. **Complete Coverage** - Declare all semantic operations used
2. **Accurate Listing** - Keep `semanticOps` in sync with implementation
3. **Ordered Listing** - List operations in order of use
4. **No Duplication** - Don't list the same operation twice

### Documentation

1. **Auto-Generated** - Let the system generate documentation
2. **Keep Updated** - Run validation after changes
3. **Review Output** - Check generated docs for correctness

---

## Troubleshooting

### "References unknown semantic op"

**Problem:** Node references an operation ID that doesn't exist.

**Solution:**
1. Check spelling of operation ID
2. Ensure operation is registered in `operationRegistry`
3. Run `npm run generate:semantic-ids` to update types

### "Duplicate semantic op"

**Problem:** Node lists the same operation ID twice.

**Solution:**
1. Remove duplicate from `semanticOps` array
2. If operation is called multiple times, only list it once

### "Operation not found in registry"

**Problem:** Operation is defined but not registered.

**Solution:**
1. Ensure operation module is imported in `registerAllOps.ts`
2. For geometry operations, ensure module is imported in `validateSemanticLinkage.ts`

### "Circular dependency detected"

**Problem:** Operation A depends on B, which depends on A.

**Solution:**
1. Review operation dependencies
2. Refactor to remove circular dependency
3. Consider extracting shared logic to a third operation

### Validation passes but TypeScript errors

**Problem:** Validation passes but TypeScript shows errors.

**Solution:**
1. Run `npm run generate:semantic-ids` to update types
2. Restart TypeScript server in your IDE
3. Check that `semanticOpIds.ts` is up to date

---

## Examples

### Example 1: Simple Math Operation

```typescript
// client/src/semantic/ops/mathOps.ts

export const add = defineSemanticOp({
  id: 'math.add',
  domain: 'math',
  name: 'Add',
  category: 'operator',
  tags: ['math', 'arithmetic'],
  summary: 'Adds two numbers',
  complexity: 'O(1)',
  cost: 'low',
  pure: true,
  deterministic: true,
  sideEffects: []
});
```

### Example 2: Complex Geometry Operation

```typescript
// client/src/geometry/meshTessellationOps.ts

export const subdivideCatmullClark = defineOp(
  {
    id: 'meshTess.subdivideCatmullClark',
    domain: 'geometry',
    name: 'Subdivide (Catmull-Clark)',
    category: 'modifier',
    tags: ['mesh', 'tessellation', 'subdivision'],
    summary: 'Subdivides a mesh using Catmull-Clark algorithm',
    complexity: 'O(n)',
    cost: 'high',
    pure: true,
    deterministic: true,
    sideEffects: [],
    dependencies: ['meshTess.toTessellationMesh']
  },
  (mesh: TessellationMesh, iterations: number): TessellationMesh => {
    // Implementation
  }
);
```

### Example 3: Node with semanticOps

```typescript
// client/src/workflow/nodeRegistry.ts

{
  type: "subdivideMesh",
  label: "Subdivide Mesh",
  semanticOps: [
    "meshTess.toTessellationMesh",
    "meshTess.subdivideCatmullClark",
    "meshTess.getTessellationMetadata",
    "meshTess.tessellationMeshToRenderMesh",
    "meshTess.toTessellationMeshData"
  ] as const,
  compute: ({ inputs, parameters, context }) => {
    const inputMesh = inputs.mesh as MeshData;
    const iterations = parameters.iterations as number;
    
    const mesh = toTessellationMesh(inputMesh);
    const subdivided = subdivideCatmullClark(mesh, iterations);
    const metadata = getTessellationMetadata(subdivided);
    const renderMesh = tessellationMeshToRenderMesh(subdivided);
    const meshData = toTessellationMeshData(subdivided);
    
    return { meshData, metadata };
  }
}
```

---

## Resources

- **Operation Registry:** `client/src/semantic/operationRegistry.ts`
- **Semantic Operations:** `client/src/semantic/ops/`
- **Geometry Operations:** `client/src/geometry/`
- **Node Registry:** `client/src/workflow/nodeRegistry.ts`
- **Validation Script:** `scripts/validateSemanticLinkage.ts`
- **Generated Docs:** `docs/semantic/`

---

## Questions?

If you have questions or need help:
1. Check the generated documentation in `docs/semantic/`
2. Run validation to see detailed error messages
3. Review existing operations for examples
4. Ask the team!

---

**Remember:** The semantic operation system is the foundation for Lingua's log-scale growth. Every operation you add makes the system more powerful and more robust! 🎯
