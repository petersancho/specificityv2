# Lingua Semantic Schemas

This directory contains YAML-based semantic validation schemas for Lingua's computational operations. These schemas ensure **mathematical assurity** through rigorous validation of inputs, parameters, and outputs.

## Overview

Semantic schemas provide:

1. **Mathematical Correctness** - Define invariants, preconditions, and postconditions
2. **Parameter Validation** - Specify valid ranges and constraints for all parameters
3. **Type Safety** - Define input/output types with JSON Schema validation
4. **Versioning** - Support semantic versioning and migration paths
5. **Documentation** - Human-readable, machine-checkable specifications
6. **Extensibility** - Easy to add new constraints and validations

## Schema Structure

Each schema follows this structure:

```yaml
meta:
  schemaVersion: "2.0.0"
  linguaVersion: "2.0.0"
  description: "Brief description"

operation:
  id: "domain.operationName"
  name: "Human Readable Name"
  domain: "solver|geometry|math|..."
  
dimensions:
  # Physical dimensions (length, force, stress, etc.)

inputs:
  # Input schemas with validation

parameters:
  # Parameter schemas with constraints

outputs:
  # Output schemas with postconditions

invariants:
  # Mathematical invariants (pre/post conditions)

validationRules:
  # Validation rule sets

examples:
  # Example use cases

migrations:
  # Version migration paths

semanticLinks:
  # Links to operations, nodes, datatypes
```

## Creating a New Schema

### 1. Create Schema File

Create a new YAML file in this directory:

```bash
touch my-operation.schema.yml
```

### 2. Define Meta Information

```yaml
meta:
  schemaVersion: "1.0.0"
  linguaVersion: "2.0.0"
  generatedAt: "2026-02-04T00:00:00Z"
  description: "Brief description of what this validates"
  maintainers:
    - "Your Name"
```

### 3. Define Operation

```yaml
operation:
  id: "domain.operationName"
  name: "Human Readable Name"
  domain: "solver"  # or geometry, math, etc.
  category: "optimization"
  tags: ["3d", "simulation"]
  summary: "One-line summary"
  description: |
    Detailed description with mathematical formulation
  complexity: "O(n)"
  cost: "high"
  pure: false
  deterministic: true
  sideEffects: ["state"]
```

### 4. Define Parameters

```yaml
parameters:
  - name: "myParameter"
    type: "number"
    unit: "meter"
    dimension: "length"
    default: 1.0
    description: "What this parameter controls"
    
    constraints:
      - type: "range"
        value: [0.1, 10.0]
        message: "Must be between 0.1 and 10"
      
      - type: "custom"
        expression: "myParameter > 0"
        message: "Must be positive"
        severity: "error"  # or "warning", "info"
```

### 5. Define Inputs

```yaml
inputs:
  - name: "geometry"
    type: "Mesh3D"
    shape: "object"
    required: true
    description: "Input geometry"
    
    schema:
      type: "object"
      required: ["positions"]
      properties:
        positions:
          type: "array"
          items: { type: "number" }
    
    constraints:
      - type: "custom"
        name: "non_empty"
        expression: "geometry.positions.length > 0"
        message: "Geometry must not be empty"
```

### 6. Define Outputs

```yaml
outputs:
  - name: "result"
    type: "Geometry3D"
    shape: "object"
    description: "Output geometry"
    
    schema:
      type: "object"
      properties:
        positions: { type: "array" }
    
    postconditions:
      - expression: "result.positions.length > 0"
        message: "Result must not be empty"
      
      - expression: "all(result.positions, p => isFinite(p))"
        message: "All coordinates must be finite"
```

### 7. Define Invariants

```yaml
invariants:
  - type: "precondition"
    name: "valid_input"
    expression: "input.volume > 0"
    description: "Input must have positive volume"
  
  - type: "postcondition"
    name: "valid_output"
    expression: "output.volume > 0"
    description: "Output must have positive volume"
  
  - type: "invariant"
    name: "conservation"
    expression: "output.volume <= input.volume"
    description: "Volume cannot increase"
```

### 8. Define Validation Rules

```yaml
validationRules:
  - name: "validate_geometry"
    severity: "error"
    checks:
      - "geometry is non-empty"
      - "all coordinates are finite"
      - "volume > 0"
  
  - name: "validate_parameters"
    severity: "warning"
    checks:
      - "parameters are in typical ranges"
```

### 9. Add Examples

```yaml
examples:
  - name: "basic_example"
    description: "Simple use case"
    inputs:
      geometry:
        positions: [[0,0,0], [1,0,0], [1,1,0], [0,1,0]]
    parameters:
      myParameter: 2.0
    expectedOutputs:
      result:
        volume: "> 0"
```

### 10. Create Validation Script

Create a TypeScript validation script in `scripts/`:

```typescript
import * as yaml from 'yaml';
import * as fs from 'fs';

function loadSchema() {
  const content = fs.readFileSync('path/to/schema.yml', 'utf-8');
  return yaml.parse(content);
}

function validateMyOperation(schema) {
  // Implement validation logic
}

function main() {
  const schema = loadSchema();
  const result = validateMyOperation(schema);
  
  if (result.success) {
    console.log('✅ Validation passed');
    process.exit(0);
  } else {
    console.log('❌ Validation failed');
    process.exit(1);
  }
}

main();
```

### 11. Register in package.json

Add validation script to `package.json`:

```json
{
  "scripts": {
    "validate:my-operation": "tsx scripts/validateMyOperation.ts",
    "validate:all": "... && npm run validate:my-operation"
  }
}
```

## Constraint Types

### Range Constraint

```yaml
constraints:
  - type: "range"
    value: [min, max]
    message: "Must be between min and max"
    severity: "error"  # optional
```

### Min/Max Constraint

```yaml
constraints:
  - type: "min"
    value: 0
    message: "Must be non-negative"
  
  - type: "max"
    value: 100
    message: "Must be at most 100"
```

### Enum Constraint

```yaml
constraints:
  - type: "enum"
    value: ["option1", "option2", "option3"]
    message: "Must be one of the allowed values"
```

### Custom Constraint

```yaml
constraints:
  - type: "custom"
    name: "descriptive_name"
    expression: "mathematical_expression"
    message: "Human-readable error message"
    severity: "error"  # or "warning", "info"
```

## Severity Levels

- **error** - Validation fails, operation cannot proceed
- **warning** - Validation passes with warning, operation can proceed
- **info** - Informational message, no impact on validation

## Physical Dimensions

Define physical dimensions for unit analysis:

```yaml
dimensions:
  length:
    symbol: "L"
    siUnit: "meter"
    description: "Spatial dimension"
  
  force:
    symbol: "F"
    siUnit: "newton"
    description: "Force dimension"
    composition:
      M: 1  # Mass
      L: 1  # Length
      T: -2 # Time
```

## Versioning and Migration

### Version Bumping

Follow semantic versioning:

- **Major** (2.0.0): Breaking changes
- **Minor** (1.1.0): New features, backward compatible
- **Patch** (1.0.1): Bug fixes

### Migration Paths

Define how to migrate from old versions:

```yaml
migrations:
  - fromVersion: "1.0.0"
    toVersion: "2.0.0"
    changes:
      - "Added new parameter X"
      - "Removed deprecated parameter Y"
      - "Changed default for Z"
    
    transformations:
      parameters:
        newParam: "defaultValue"
        oldParam: "null"  # Remove
        changedParam: "newDefault"
```

## Semantic Links

Link schemas to operations, nodes, and datatypes:

```yaml
semanticLinks:
  operations:
    - "simulator.myOp.initialize"
    - "simulator.myOp.step"
    - "simulator.myOp.finalize"
  
  nodes:
    - "MyOperationNode"
  
  datatypes:
    - "Mesh3D"
    - "ScalarField3D"
  
  relatedSchemas:
    - "other-operation.schema.yml"
```

## Best Practices

### 1. Be Specific

❌ Bad:
```yaml
constraints:
  - type: "custom"
    expression: "x > 0"
    message: "Invalid value"
```

✅ Good:
```yaml
constraints:
  - type: "custom"
    name: "positive_volume_fraction"
    expression: "volFrac > 0 && volFrac < 1"
    message: "Volume fraction must be in (0, 1) for meaningful optimization"
```

### 2. Use Appropriate Severity

- Use **error** for mathematical impossibilities
- Use **warning** for unusual but valid values
- Use **info** for best practices

### 3. Document Mathematical Formulation

Include the mathematical formulation in the operation description:

```yaml
operation:
  description: |
    Solves the optimization problem:
    
    minimize:   f(x)
    subject to: g(x) ≤ 0
                h(x) = 0
    
    where x ∈ ℝⁿ is the design variable vector.
```

### 4. Provide Examples

Include at least one example for each major use case:

```yaml
examples:
  - name: "simple_case"
    description: "Minimal working example"
    # ...
  
  - name: "complex_case"
    description: "Real-world scenario"
    # ...
```

### 5. Define Clear Invariants

Invariants should be:
- **Checkable** - Can be verified programmatically
- **Meaningful** - Represent real mathematical/physical constraints
- **Documented** - Clear description of what they ensure

## Integration with Lingua Semantic System

Schemas integrate with the existing semantic operation system:

1. **Operation Registry** - Schemas reference operations by ID
2. **Node Registry** - Schemas link to nodes that use the operation
3. **Type System** - Schemas define input/output types
4. **Validation Pipeline** - Schemas are validated on every commit

## Running Validation

### Validate Single Schema

```bash
npm run validate:topology
```

### Validate All Schemas

```bash
npm run validate:all
```

### CI Integration

Validation runs automatically on:
- Pre-commit hook
- CI pipeline (GitHub Actions)
- Before deployment

## Future Extensions

The schema system is designed to be extensible:

1. **Runtime Validation** - Validate parameters at runtime
2. **Auto-generated UI** - Generate parameter sliders from schemas
3. **Documentation Generation** - Auto-generate API docs
4. **Test Generation** - Auto-generate unit tests from examples
5. **Type Generation** - Generate TypeScript types from schemas

## Example: Topology Optimization Schema

See `topology-optimization.schema.yml` for a complete example that includes:

- 16 parameters with constraints
- 2 inputs with validation
- 3 outputs with postconditions
- 8 mathematical invariants
- 6 validation rule sets
- 2 examples
- Migration path from v1.0.0 to v2.0.0

## Questions?

For questions or suggestions, contact the Lingua Core Team or open an issue.

---

**The beauty of the Lingua semantic system is that it's openly upgradeable!** 🚀

Add new constraints, tighten tolerances, define new invariants - the schema evolves with your understanding of the problem domain.
