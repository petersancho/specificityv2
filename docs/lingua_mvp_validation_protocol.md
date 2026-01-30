# Lingua MVP Validation Protocol
## Surgical Node & Command Verification for Production Readiness

---

## Your Role

You are a **surgical validator**, not a refactorer. Your job is to **verify, test, and document** - not to redesign or modularize. Lingua is a custom-built system where every node has unique logic that was deliberately designed. Your task is to ensure everything works as intended, flows correctly, and is ready to ship.

**What you WILL do:**
- Verify each node's compute function executes without errors
- Check type contracts (inputs → outputs) are satisfied
- Test data flow through the workflow graph
- Document any broken connections or type mismatches
- Fix small, obvious bugs (typos, missing null checks, broken imports)
- Validate command execution paths

**What you will NOT do:**
- Refactor working code into "cleaner" patterns
- Make nodes more modular or DRY
- Change the architecture or introduce new abstractions
- Batch process multiple categories at once
- Touch the geometry kernel, WebGL renderer, or state management unless explicitly broken

---

## The Validation Method: Category-by-Category Surgical Inspection

### Workflow: One Category at a Time

You will work through node categories sequentially, completing each before moving to the next. This prevents cascading breakage.

**For each category:**

1. **ENUMERATE** - List all nodes in category
2. **INSPECT** - Read each node definition (type, inputs, outputs, compute)
3. **VERIFY** - Test the compute function with canonical inputs
4. **DOCUMENT** - Record results (✓ Pass / ✗ Fail / ⚠ Warning)
5. **FIX** - Only fix what's clearly broken (no refactoring)
6. **VALIDATE** - Re-test after fixes
7. **REPORT** - Move to next category only when current is 100% passing

---

## Category Validation Order

Process in this exact sequence:

### Phase 1: Foundation (Days 1-2)
1. **Data** - Simplest nodes (text, slider, color, geometryReference)
2. **Math** - Pure functions (add, subtract, multiply, divide, clamp, expression)
3. **Vectors** - Vector operations (construct, deconstruct, add, dot, cross, normalize)

**Goal:** Establish that basic data flow works. These nodes feed everything else.

### Phase 2: Geometry Primitives (Days 3-4)
4. **Primitives** - All 35+ primitives (box, sphere, cylinder, tetrahedron, torus-knot, etc.)

**Process per primitive:**
```typescript
// For each primitive node (e.g., "box"):
1. Find definition in client/src/workflow/nodes/primitives/
2. Check inputs (width, height, depth) have defaults
3. Run compute with canonical values: compute({ width: 2, height: 2, depth: 2 })
4. Verify output is MeshGeometry with valid RenderMesh
5. Check mesh has positions.length > 0 and indices.length > 0
6. Verify normals.length === positions.length
```

**Validation Test:**
```typescript
const result = boxNode.compute({ width: 2, height: 2, depth: 2 });
assert(result.geometry.type === 'mesh');
assert(result.geometry.mesh.positions.length > 0);
assert(result.geometry.mesh.normals.length === result.geometry.mesh.positions.length);
```

### Phase 3: Curves & Surfaces (Days 5-6)
5. **Curves** - point, line, arc, circle, polyline, curve
6. **Surfaces** - surface, loft, extrude

**Key checks:**
- Curve nodes output PolylineGeometry or NurbsCurveGeometry
- NURBS data (controlPoints, knots, degree, weights) is valid
- Loft/extrude nodes accept curve arrays and produce SurfaceGeometry
- Tessellation produces valid RenderMesh for rendering

### Phase 4: Transformations (Day 7)
7. **Transforms** - move, rotate, scale, mirror, fieldTransformation
8. **Arrays** - linearArray, polarArray, gridArray

**Critical validation:**
- Transform nodes accept geometry input, return transformed geometry
- Original geometry NOT mutated (verify new id generated)
- Array nodes produce geometry[] output
- Transformation matrices computed correctly

### Phase 5: Advanced Operations (Days 8-9)
9. **Mesh Operations** - subdivideMesh, dualMesh, insetFaces, extrudeFaces, meshBoolean
10. **Tessellation** - geodesicSphere, voronoiPattern, hexagonalTiling

**Complex validation:**
```typescript
// For subdivision:
const inputMesh = createCubeMesh();
const result = subdivideMeshNode.compute({ 
  mesh: inputMesh, 
  iterations: 2, 
  scheme: 'catmull-clark' 
});
assert(result.mesh.positions.length > inputMesh.positions.length); // More verts
assert(isMeshManifold(result.mesh)); // Still valid topology
```

### Phase 6: Analysis & Lists (Day 10)
11. **Lists** - listCreate, listLength, listItem, listSlice, listSum, listAverage
12. **Analysis** - geometryInfo, measurement, dimensions

**Data flow validation:**
- List nodes handle arrays correctly
- Type preservation (number[] → number[] through operations)
- geometryInfo extracts correct properties (area, volume, centroid)

### Phase 7: Solvers & Goals (Days 11-12)
13. **Solvers** - physicsSolver, biologicalSolver, chemistrySolver, topologySolver
14. **Goals** - stiffnessGoal, volumeGoal, loadGoal, anchorGoal, etc.

**Solver-specific validation:**
- Goal nodes output GoalSpecification with correct goalType
- Solvers accept goal[] input
- Solver compute returns SolverResult with expected outputs
- No infinite loops or crashes with reasonable inputs

---

## Node Validation Template

For each node, create a validation entry:

```typescript
// FILE: client/src/test-rig/validation/[CATEGORY]_validation.ts

import { [NodeName]Node } from '../../workflow/nodes/[category]/[NodeName]';

export function validate_[NodeName]() {
  const node = [NodeName]Node;
  
  // 1. DEFINITION CHECK
  console.log(`Validating: ${node.label}`);
  assert(node.type === '[expected-type]');
  assert(node.category === '[expected-category]');
  assert(node.inputs.length === [expected-count]);
  assert(node.outputs.length === [expected-count]);
  
  // 2. CANONICAL INPUT TEST
  const inputs = {
    // Provide typical valid inputs
    param1: [canonical-value],
    param2: [canonical-value]
  };
  
  // 3. EXECUTE
  let result;
  try {
    result = node.compute({ inputs, parameters: {} });
  } catch (error) {
    console.error(`❌ FAIL: ${node.label} - ${error.message}`);
    return { status: 'FAIL', error: error.message };
  }
  
  // 4. OUTPUT VALIDATION
  assert(result !== null);
  assert('[expected-output-port]' in result);
  
  // Type-specific checks
  if (result.geometry) {
    assert(result.geometry.type === '[expected-geometry-type]');
    if (result.geometry.type === 'mesh') {
      assert(result.geometry.mesh.positions.length > 0);
    }
  }
  
  console.log(`✓ PASS: ${node.label}`);
  return { status: 'PASS' };
}
```

---

## Command Validation Protocol

After nodes are validated, verify commands:

### Command Categories to Check

**Geometry Creation Commands** (point, line, circle, box, sphere, etc.)
```typescript
// For each command:
1. Find definition in client/src/commands/geometryCommands.ts
2. Check parse() function handles input correctly
3. Verify execute() creates proper geometry
4. Test interactive placement if applicable
```

**Operation Commands** (move, rotate, extrude, boolean, etc.)
```typescript
// For each command:
1. Verify selection requirement (needs geometry selected)
2. Test with mock selected geometry
3. Check output geometry is valid
4. Ensure original geometry handled correctly (deleted/replaced/duplicated)
```

**View Commands** (focus, frameall, zoom, pan, orbit)
```typescript
// Test camera state changes
1. Execute command
2. Verify camera position/target/up updated
3. Check viewport renders correctly
```

---

## Validation Logging System

Create a validation log that accumulates results:

```typescript
// FILE: client/src/test-rig/validation/validation-log.ts

type ValidationResult = {
  category: string;
  nodeName: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  error?: string;
  timestamp: string;
};

const validationLog: ValidationResult[] = [];

export function logValidation(result: ValidationResult) {
  validationLog.push(result);
  
  // Console output with emoji
  const icon = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${result.category}] ${result.nodeName}`);
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
}

export function generateReport() {
  const total = validationLog.length;
  const passed = validationLog.filter(r => r.status === 'PASS').length;
  const failed = validationLog.filter(r => r.status === 'FAIL').length;
  const warned = validationLog.filter(r => r.status === 'WARN').length;
  
  console.log('\n=== VALIDATION REPORT ===');
  console.log(`Total Nodes: ${total}`);
  console.log(`✓ Passed: ${passed} (${(passed/total*100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  
  if (failed > 0) {
    console.log('\nFailed Nodes:');
    validationLog
      .filter(r => r.status === 'FAIL')
      .forEach(r => console.log(`  - ${r.category}/${r.nodeName}: ${r.error}`));
  }
  
  return { total, passed, failed, warned };
}
```

---

## Common Issues & Surgical Fixes

### Issue 1: Type Mismatch
**Symptom:** Node expects `geometry` but receives `geometry[]`

**Fix:**
```typescript
// BEFORE (broken)
compute({ inputs }) {
  const geom = inputs.geometry; // Expects single, gets array
  return processGeometry(geom); // Crash
}

// AFTER (fixed)
compute({ inputs }) {
  const geom = Array.isArray(inputs.geometry) 
    ? inputs.geometry[0] 
    : inputs.geometry;
  return processGeometry(geom);
}
```

### Issue 2: Missing Null Check
**Symptom:** Node crashes when optional input is undefined

**Fix:**
```typescript
// BEFORE
compute({ inputs }) {
  const scale = inputs.scale.x; // Crash if scale undefined
}

// AFTER
compute({ inputs }) {
  const scale = inputs.scale?.x ?? 1.0; // Safe with default
}
```

### Issue 3: Incorrect Output Port Name
**Symptom:** Downstream nodes can't find output

**Fix:**
```typescript
// BEFORE
outputs: [{ name: 'result', type: 'geometry' }],
compute() {
  return { geometry: mesh }; // Wrong port name!
}

// AFTER
compute() {
  return { result: mesh }; // Matches port name
}
```

### Issue 4: Mutation Instead of New Geometry
**Symptom:** Undo/redo broken, weird side effects

**Fix:**
```typescript
// BEFORE (mutates)
compute({ inputs }) {
  const geom = inputs.geometry;
  geom.position.x += 5; // MUTATION!
  return { geometry: geom };
}

// AFTER (pure)
compute({ inputs }) {
  const geom = inputs.geometry;
  return { 
    geometry: {
      ...geom,
      id: generateId(), // New ID
      position: { ...geom.position, x: geom.position.x + 5 }
    }
  };
}
```

---

## Daily Workflow

### Morning (1-2 hours)
1. Pick next category from validation order
2. Read all node definitions in that category
3. Create validation test file for category
4. Run validation tests

### Afternoon (2-3 hours)
5. Fix any failures found (surgical fixes only)
6. Re-run validation tests
7. Update validation log
8. Commit when category is 100% passing

### End of Day
9. Generate validation report
10. Document any concerns/warnings for tomorrow
11. Plan next category

---

## Success Criteria

### Per Category
- [ ] All nodes execute without throwing errors
- [ ] All nodes produce expected output types
- [ ] Type contracts satisfied (inputs → compute → outputs)
- [ ] No mutations of input geometry
- [ ] Validation log shows 100% PASS for category

### Overall MVP Readiness
- [ ] All 14 categories validated
- [ ] 95%+ nodes passing
- [ ] All critical paths tested (primitives → transforms → operations)
- [ ] No crashes on canonical inputs
- [ ] Command system functional
- [ ] Workflow evaluation works end-to-end

---

## Testing Workflow Graphs

After individual nodes validated, test actual workflow graphs:

### Test Graph 1: Box → Move → Subdivide
```typescript
const graph = {
  nodes: [
    { id: 'n1', type: 'box', params: { width: 2, height: 2, depth: 2 } },
    { id: 'n2', type: 'move', params: { distance: 5, direction: 'x' } },
    { id: 'n3', type: 'subdivideMesh', params: { iterations: 2 } }
  ],
  edges: [
    { from: 'n1.geometry', to: 'n2.geometry' },
    { from: 'n2.geometry', to: 'n3.mesh' }
  ]
};

// Evaluate and verify final output
const result = evaluateWorkflow(graph);
assert(result.nodes.n3.outputs.mesh !== null);
```

### Test Graph 2: Circle → Extrude → Boolean Union
```typescript
// Similar pattern - build graph, evaluate, check outputs
```

### Test Graph 3: Solver with Goals
```typescript
const graph = {
  nodes: [
    { id: 'domain', type: 'box', params: { ... } },
    { id: 'stiffness', type: 'stiffnessGoal', params: { ... } },
    { id: 'volume', type: 'volumeGoal', params: { ... } },
    { id: 'solver', type: 'physicsSolver', params: { ... } }
  ],
  edges: [
    { from: 'domain.geometry', to: 'solver.domain' },
    { from: 'stiffness.goal', to: 'solver.goals' },
    { from: 'volume.goal', to: 'solver.goals' }
  ]
};
```

---

## When to Ask for Help

**Ask the human if:**
- A node's intended behavior is unclear
- A type signature seems wrong but you're not sure
- Multiple nodes seem to duplicate functionality (might be intentional)
- A fix would require changing more than 10 lines of code
- You're unsure if something is a bug or a feature

**Do NOT ask about:**
- Code style or organization (it's fine as-is)
- "Better" ways to structure things (not your job)
- Modularization opportunities (specifically not wanted)
- Adding type safety where it's loose (might be intentional)

---

## Emergency Stop Conditions

**STOP IMMEDIATELY if:**
- You break more than 2 nodes in a category
- Validation pass rate drops below 80%
- You introduce a circular dependency
- The app won't start/compile
- You touch Zustand store structure

Fix what you broke, restore from git if needed, then notify the human.

---

## Final Checklist for MVP Ship

After all categories validated:

### Functional
- [ ] All node categories 95%+ passing
- [ ] All geometry primitives render correctly
- [ ] Transform operations work on all geometry types
- [ ] Workflow graph evaluation handles cycles gracefully
- [ ] Command system executes without errors
- [ ] Undo/redo works for operations
- [ ] Selection system works (object/vertex/edge/face modes)

### Performance
- [ ] No infinite loops in node compute functions
- [ ] Lazy evaluation cache works (dirty flag propagation)
- [ ] Large meshes (10k+ vertices) render at 30+ fps
- [ ] Workflow graphs with 50+ nodes evaluate in < 1 second

### Robustness
- [ ] Null/undefined inputs handled gracefully
- [ ] Type mismatches logged but don't crash app
- [ ] Malformed geometry detected and reported
- [ ] Browser console shows no errors on normal operations

### Documentation
- [ ] Validation log complete for all categories
- [ ] Known issues documented
- [ ] Any warnings explained
- [ ] Validation report generated

---

## Begin Validation

Start with:

```bash
# Create validation directory
mkdir -p client/src/test-rig/validation

# Create first validation file
touch client/src/test-rig/validation/data_validation.ts

# Start with Data category
code client/src/test-rig/validation/data_validation.ts
```

Your first validation should be the `text` node (simplest):

```typescript
import { TextNode } from '../../workflow/nodes/data/TextNode';

export function validate_text() {
  const node = TextNode;
  
  const inputs = {};
  const parameters = { value: "Hello Lingua" };
  
  const result = node.compute({ inputs, parameters });
  
  assert(result.text === "Hello Lingua");
  
  return { status: 'PASS' };
}
```

---

## Remember

- **One category at a time** - Don't move forward until current is 100%
- **Surgical fixes only** - Touch the minimum code necessary
- **Document everything** - Validation log is your trail
- **Test after every fix** - Re-run validation immediately
- **Respect the design** - This is verification, not redesign
- **Ship when ready** - 95% pass rate is good enough for MVP

You're not rebuilding Lingua. You're making sure it works as designed. Be thorough, be careful, and ship it.
