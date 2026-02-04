# AI Agent Integration Guide

## Overview

Lingua's semantic system provides **ontological validation** that enables AI agents to efficiently search, understand, and improve the codebase. This document explains how AI agents can leverage the semantic integration system.

---

## Architecture

```
YAML Schemas → Agent Catalog → AI Agent Discovery
     ↓              ↓                    ↓
Operations.json ← Validation → Agent Capabilities
     ↓              ↓                    ↓
  Codebase ← Semantic Links → Ontological Navigation
```

---

## Key Files for AI Agents

### 1. **Agent Catalog** (`docs/semantic/agent-catalog.json`)

**Purpose:** Machine-readable catalog of operations with validation schemas

**Structure:**
```json
{
  "version": "1.0.0",
  "generated": "2026-02-04T20:20:34.661Z",
  "description": "AI Agent-readable catalog...",
  "operations": {
    "solver.topologyOptimization": {
      "operationId": "solver.topologyOptimization",
      "name": "Topology Optimization Solver",
      "domain": "solver",
      "category": "optimization",
      "description": "Semantic validation schema for SIMP...",
      "schemaVersion": "2.0.0",
      "schemaPath": "client/src/semantic/schemas/topology-optimization.schema.yml",
      
      "parameters": [
        {
          "name": "volFrac",
          "type": "number",
          "unit": "dimensionless",
          "default": 0.5,
          "description": "Target volume fraction (0 = empty, 1 = solid)",
          "constraints": [
            "volFrac ∈ [0.01, 0.99]",
            "volFrac ∈ [0.1, 0.8]"
          ]
        }
      ],
      
      "inputs": [
        {
          "name": "mesh",
          "type": "Mesh3D",
          "description": "Input geometry mesh",
          "required": true,
          "validations": [
            "Mesh must have non-zero volume",
            "All coordinates must be finite"
          ]
        }
      ],
      
      "outputs": [
        {
          "name": "densityField",
          "type": "ScalarField3D",
          "description": "Optimized density distribution",
          "postconditions": [
            "Densities in [0, 1]",
            "Volume constraint satisfied"
          ]
        }
      ],
      
      "invariants": [
        {
          "type": "precondition",
          "name": "equilibrium_solvable",
          "expression": "rank(K) = n - |fixed_dofs|",
          "description": "Stiffness matrix must be full rank after BC enforcement"
        },
        {
          "type": "postcondition",
          "name": "positive_compliance",
          "expression": "C = U^T K U > 0",
          "description": "Compliance must be positive (structural energy)"
        }
      ],
      
      "capabilities": {
        "canValidateInputs": true,
        "canValidateOutputs": true,
        "hasInvariants": true,
        "hasMathematicalModel": true,
        "isVersioned": true
      }
    }
  }
}
```

**How AI Agents Use It:**
- **Discover operations** by iterating through `operations` object
- **Understand parameters** by reading constraints and descriptions
- **Validate inputs** before calling operations
- **Check postconditions** after operations complete
- **Navigate to schemas** via `schemaPath` for detailed validation

---

### 2. **YAML Schemas** (`client/src/semantic/schemas/*.schema.yml`)

**Purpose:** Human-readable, machine-checkable validation specifications

**Example:** `topology-optimization.schema.yml`

```yaml
meta:
  schemaVersion: "2.0.0"
  linguaVersion: "2.0.0"
  description: "Semantic validation schema for SIMP topology optimization"
  
operation:
  id: "solver.topologyOptimization"
  name: "Topology Optimization Solver"
  domain: "solver"
  category: "optimization"
  tags: ["3d", "optimization", "structural", "FEA"]

parameters:
  - name: "volFrac"
    type: "number"
    unit: "dimensionless"
    default: 0.5
    description: "Target volume fraction (0 = empty, 1 = solid)"
    constraints:
      - type: "range"
        value: [0.01, 0.99]
        message: "Volume fraction must be in (0.01, 0.99)"
      - type: "range"
        value: [0.1, 0.8]
        message: "Recommended range for good results"
        severity: "warning"

invariants:
  - type: "precondition"
    name: "equilibrium_solvable"
    expression: "rank(K) = n - |fixed_dofs|"
    description: "Stiffness matrix must be full rank after BC enforcement"
    
  - type: "postcondition"
    name: "positive_compliance"
    expression: "C = U^T K U > 0"
    description: "Compliance must be positive (structural energy)"

validationRules:
  - name: "validate_fea"
    severity: "error"
    checks:
      - "stiffness matrix is symmetric"
      - "stiffness matrix is positive definite (after BC)"
      - "displacement solution is finite"
      - "compliance is positive"

examples:
  - name: "cantilever_beam"
    description: "Classic cantilever beam optimization"
    input:
      mesh:
        type: "box"
        dimensions: [10, 5, 1]
      markers:
        anchors: [{ face: "left" }]
        loads: [{ point: [10, 2.5, 0.5], force: [0, -100, 0] }]
      parameters:
        volFrac: 0.5
    expectedOutput:
      densityField:
        grayLevel: "<0.05"
        volumeFraction: "0.49-0.51"
      geometry:
        type: "beam-like structure"
```

**How AI Agents Use It:**
- **Read constraints** to understand valid parameter ranges
- **Check invariants** to verify mathematical correctness
- **Run examples** to test implementations
- **Suggest fixes** based on validation rules
- **Understand intent** through descriptions and tags

---

### 3. **Operations Registry** (`docs/semantic/operations.json`)

**Purpose:** Complete registry of all semantic operations

**Structure:**
```json
{
  "solver.topologyOptimization": {
    "id": "solver.topologyOptimization",
    "domain": "solver",
    "name": "Topology Optimization Solver",
    "category": "utility",
    "tags": ["3d", "optimization", "structural"],
    "complexity": "varies",
    "cost": "high",
    "pure": false,
    "deterministic": true,
    "sideEffects": ["state"],
    "summary": "Optimizes material layout for structural performance",
    "stable": false,
    "since": "2.0.0"
  }
}
```

**How AI Agents Use It:**
- **Discover all operations** in the system
- **Understand complexity** and cost
- **Check purity** and determinism
- **Identify side effects**
- **Track stability** and versioning

---

### 4. **Agent Capabilities** (`docs/semantic/agent_capabilities.json`)

**Purpose:** AI agent function signatures and safety notes

**Structure:**
```json
{
  "capabilities": {
    "solver.topologyOptimization": {
      "opId": "solver.topologyOptimization",
      "intent": "SIMP topology optimization solver with mathematical validation",
      "signature": {
        "name": "solver_topologyOptimization",
        "description": "Optimizes material layout for structural performance using SIMP method",
        "parameters": {
          "type": "object",
          "properties": {
            "E0": { "type": "number", "description": "Young's modulus of solid material (Pa)" },
            "volFrac": { "type": "number", "description": "Target volume fraction (0-1)" }
          },
          "required": ["mesh", "markers"]
        }
      },
      "examples": [
        {
          "description": "Cantilever beam optimization",
          "input": {
            "mesh": "10×5×1 box",
            "markers": { "anchors": "left face", "loads": "right center" },
            "volFrac": 0.5
          },
          "output": "Optimized beam structure"
        }
      ],
      "safetyNotes": [
        "Safety class: stateful",
        "Validates inputs using YAML schema",
        "Enforces mathematical invariants (FEA correctness, volume constraint, etc.)",
        "Schema version: 2.0.0"
      ],
      "schemaValidation": {
        "hasSchema": true,
        "schemaVersion": "2.0.0",
        "schemaPath": "client/src/semantic/schemas/topology-optimization.schema.yml",
        "invariants": 8,
        "validationRules": 6
      }
    }
  }
}
```

**How AI Agents Use It:**
- **Call operations** using function signatures
- **Understand safety** through safety notes
- **Check schema availability** via `schemaValidation`
- **Run examples** to test functionality

---

## AI Agent Workflows

### 1. **Discovering Operations**

```typescript
// Load agent catalog
const catalog = JSON.parse(fs.readFileSync('docs/semantic/agent-catalog.json'));

// Find operations by domain
const solverOps = Object.values(catalog.operations)
  .filter(op => op.domain === 'solver');

// Find operations with schemas
const opsWithSchemas = Object.values(catalog.operations)
  .filter(op => op.capabilities.hasSchema);

// Find operations with mathematical models
const opsWithMath = Object.values(catalog.operations)
  .filter(op => op.capabilities.hasMathematicalModel);
```

### 2. **Validating Parameters**

```typescript
// Load operation from catalog
const op = catalog.operations['solver.topologyOptimization'];

// Check parameter constraints
function validateParameter(paramName: string, value: any): boolean {
  const param = op.parameters.find(p => p.name === paramName);
  if (!param) return false;
  
  for (const constraint of param.constraints) {
    if (constraint.includes('∈')) {
      // Parse range constraint: "volFrac ∈ [0.01, 0.99]"
      const match = constraint.match(/\[([0-9.]+), ([0-9.]+)\]/);
      if (match) {
        const [_, min, max] = match;
        if (value < parseFloat(min) || value > parseFloat(max)) {
          return false;
        }
      }
    }
  }
  
  return true;
}

// Validate before calling
if (!validateParameter('volFrac', 0.5)) {
  throw new Error('Invalid volFrac parameter');
}
```

### 3. **Checking Invariants**

```typescript
// Load operation invariants
const invariants = op.invariants;

// Check preconditions before execution
const preconditions = invariants.filter(inv => inv.type === 'precondition');
for (const pre of preconditions) {
  console.log(`Checking precondition: ${pre.name}`);
  console.log(`  Expression: ${pre.expression}`);
  console.log(`  Description: ${pre.description}`);
  // Implement check based on expression
}

// Check postconditions after execution
const postconditions = invariants.filter(inv => inv.type === 'postcondition');
for (const post of postconditions) {
  console.log(`Checking postcondition: ${post.name}`);
  console.log(`  Expression: ${post.expression}`);
  console.log(`  Description: ${post.description}`);
  // Implement check based on expression
}
```

### 4. **Navigating the Codebase**

```typescript
// Load operation from catalog
const op = catalog.operations['solver.topologyOptimization'];

// Navigate to schema file
const schemaPath = op.schemaPath;
const schema = YAML.parse(fs.readFileSync(schemaPath));

// Find implementation
const nodeRegistry = require('client/src/workflow/nodeRegistry.ts');
const node = nodeRegistry.nodes.find(n => 
  n.semanticOps?.includes(op.operationId)
);

// Find related operations
const relatedOps = schema.semanticLinks?.operations || [];
```

### 5. **Suggesting Fixes**

```typescript
// Load validation rules
const rules = schema.validationRules;

// Check for common issues
for (const rule of rules) {
  if (rule.severity === 'error') {
    console.log(`\n❌ ${rule.name}:`);
    for (const check of rule.checks) {
      console.log(`  - ${check}`);
    }
    
    // Suggest fixes based on rule
    if (rule.name === 'validate_fea') {
      console.log(`\n💡 Suggested fixes:`);
      console.log(`  - Ensure stiffness matrix is symmetric`);
      console.log(`  - Check boundary conditions are properly enforced`);
      console.log(`  - Verify displacement solution is finite`);
    }
  }
}
```

---

## Benefits for AI Agents

### 1. **Efficient Search**

- **Catalog-based discovery:** Find operations by domain, category, tags
- **Schema-based filtering:** Filter by capabilities (hasInvariants, hasMathematicalModel)
- **Semantic links:** Navigate related operations, nodes, datatypes

### 2. **Deep Understanding**

- **Mathematical models:** Understand invariants and postconditions
- **Validation rules:** Know what makes operations correct
- **Examples:** Learn from concrete use cases
- **Constraints:** Understand valid parameter ranges

### 3. **Better Solutions**

- **Validate before execution:** Catch errors early
- **Check postconditions:** Verify correctness
- **Suggest fixes:** Based on validation rules
- **Upgrade safely:** Use migration paths for versioning

### 4. **Ontological Navigation**

- **Operation → Schema:** Detailed validation
- **Operation → Node:** Implementation
- **Operation → Related Ops:** Dependencies
- **Schema → Examples:** Test cases

---

## Validation Commands

```bash
# Validate YAML schema
npm run validate:topology

# Generate agent catalog from schemas
npm run generate:agent-catalog

# Validate semantic integration
npm run validate:semantic-integration

# Run all validations
npm run validate:all
```

---

## Adding New Operations with Schemas

### 1. Create YAML Schema

```bash
# Create new schema file
touch client/src/semantic/schemas/my-operation.schema.yml
```

### 2. Define Schema

```yaml
meta:
  schemaVersion: "1.0.0"
  linguaVersion: "2.0.0"
  description: "My operation description"

operation:
  id: "domain.myOperation"
  name: "My Operation"
  domain: "domain"
  category: "category"
  tags: ["tag1", "tag2"]

parameters:
  - name: "param1"
    type: "number"
    default: 1.0
    description: "Parameter description"
    constraints:
      - type: "range"
        value: [0, 10]
        message: "Must be in [0, 10]"

inputs:
  - name: "input1"
    type: "InputType"
    description: "Input description"
    required: true
    validation:
      - "Input must be non-empty"

outputs:
  - name: "output1"
    type: "OutputType"
    description: "Output description"
    postconditions:
      - "Output must satisfy condition"

invariants:
  - type: "postcondition"
    name: "my_invariant"
    expression: "mathematical_expression"
    description: "Why this matters"
```

### 3. Generate Catalog

```bash
npm run generate:agent-catalog
```

### 4. Validate Integration

```bash
npm run validate:semantic-integration
```

### 5. Update Agent Capabilities

Add entry to `docs/semantic/agent_capabilities.json`:

```json
{
  "domain.myOperation": {
    "opId": "domain.myOperation",
    "intent": "Operation intent",
    "signature": { /* ... */ },
    "schemaValidation": {
      "hasSchema": true,
      "schemaVersion": "1.0.0",
      "schemaPath": "client/src/semantic/schemas/my-operation.schema.yml"
    }
  }
}
```

---

## Best Practices

### For Schema Authors

1. ✅ **Be specific** - Clear constraints and descriptions
2. ✅ **Add examples** - Concrete test cases
3. ✅ **Define invariants** - Mathematical correctness
4. ✅ **Version properly** - Semantic versioning
5. ✅ **Document migrations** - Upgrade paths

### For AI Agents

1. ✅ **Check catalog first** - Discover operations efficiently
2. ✅ **Validate early** - Check parameters before execution
3. ✅ **Verify postconditions** - Ensure correctness
4. ✅ **Follow semantic links** - Navigate ontologically
5. ✅ **Suggest fixes** - Based on validation rules

---

## Future Extensions

### Planned Features

1. **Runtime validation** - Validate parameters at runtime
2. **Auto-generated UI** - Create sliders from schemas
3. **Documentation generation** - Generate docs from schemas
4. **Test generation** - Create tests from examples
5. **Type generation** - Generate TypeScript types from schemas

### Extensibility

The system is designed to be **openly upgradeable**:

- Add new constraint types
- Define new invariant types
- Extend validation rules
- Add new metadata fields
- Create custom validators

---

## Conclusion

Lingua's semantic integration system provides **ontological validation** that enables AI agents to:

- ✅ **Discover operations** through machine-readable catalogs
- ✅ **Validate parameters** using YAML schemas
- ✅ **Understand constraints** via mathematical invariants
- ✅ **Navigate codebase** ontologically through semantic links
- ✅ **Suggest fixes** based on validation rules
- ✅ **Verify correctness** through invariant checking

This is the **beauty of the Lingua semantic system** - AI agents have access to ontological validation, enabling them to efficiently search, understand, and improve the entire codebase.
