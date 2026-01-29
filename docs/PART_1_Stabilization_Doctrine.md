# ROSLYN/NUMERICA STABILIZATION DOCTRINE
## A Comprehensive System Hardening Specification

**Purpose:** To transform Roslyn/Numerica from a feature-complete prototype into a battle-tested, production-grade computational design environment that gracefully handles stress, failure, and chaos while preserving user intent and data integrity.

**Guiding Principles:**
1. **Prevention over Detection:** Design systems that make failure states unrepresentable
2. **Detection over Correction:** When failure is possible, detect it immediately at the boundary
3. **Localization over Propagation:** Contain failures to the smallest semantic unit
4. **Explanation over Silence:** Every failure must produce actionable user feedback
5. **Recovery over Loss:** System state must always be recoverable to a known-good configuration

**Metaphor:** This doctrine treats Roslyn/Numerica as a living computational organism requiring immune defenses, nervous system monitoring, skeletal structure, metabolic constraints, and regenerative capacity.

---

## EXECUTIVE SUMMARY

This document specifies a systematic hardening process for Roslyn/Numerica before intensive user testing. The stabilization architecture is organized into three layers:

**Layer 1: Prevention (Immune System)** - Validation barriers that reject invalid operations before they execute
**Layer 2: Detection (Nervous System)** - Instrumentation that captures every failure with full context for debugging
**Layer 3: Recovery (Healing System)** - Mechanisms that restore system integrity after failures occur

Implementation follows a four-phase roadmap spanning approximately 6-8 weeks, with measurable success criteria at each phase. The doctrine prioritizes crash prevention, data preservation, and user comprehension over silent error handling.

---

## TABLE OF CONTENTS

### PART I: ONTOLOGICAL FOUNDATIONS
1. System Ontology (Entity Definitions)
2. Semantic Contracts (Relational Rules)
3. Core Invariants (Universal Laws)

### PART II: FAILURE SCIENCE
4. Failure Taxonomy (Classification of Breakage)
5. Critical Failure Scenarios

### PART III: DEFENSIVE SYSTEMS
6. Instrumentation Layer (The Nervous System)
7. Validation Layer (The Immune System)
8. Recovery Layer (The Healing System)

### PART IV: OPERATIONAL DISCIPLINE
9. Testing Rituals (Daily & Per-Commit)
10. Performance Budgets (Metabolic Constraints)
11. Migration & Versioning Strategy

### PART V: IMPLEMENTATION ROADMAP
12. Stabilization Phases (Week-by-Week)
13. Success Metrics & Completion Criteria

---

# PART I: ONTOLOGICAL FOUNDATIONS

## 1. SYSTEM ONTOLOGY

This section defines every entity that exists within Roslyn/Numerica, establishing identity schemes, lifecycle models, and foundational invariants. The codex agent must understand these entities completely before implementing defensive systems.

---

### 1.1 GRAPH

**Definition:** A directed acyclic graph representing computational dependencies between nodes. The graph is the fundamental container of all design intent.

**Identity:**
```typescript
interface GraphID {
  uuid: string;              // v4 UUID
  version: number;           // Incremented on structural changes
  createdAt: timestamp;      // ISO 8601
  lastModifiedAt: timestamp;
}
```

**Lifecycle States:**
```
PRISTINE → AUTHORING → VALIDATING → VALID → EVALUATING → EVALUATED
                    ↓                    ↓
                 INVALID              CORRUPTED (should never reach)
```

**Core Invariants:**
- G-INV-001: Graph must be acyclic at all times
- G-INV-002: No input port may have multiple incoming edges
- G-INV-003: All edges must connect existing nodes
- G-INV-004: Graph cannot be mutated during evaluation
- G-INV-005: Version must increment on structural changes

**Critical Implementation Note:** The graph must implement a freeze mechanism during evaluation to prevent concurrent mutations. Any attempt to modify a frozen graph must throw a clear error with context about which command attempted the modification.

---

### 1.2 NODE INSTANCE

**Definition:** A concrete instantiation of a NodeType, with specific parameter values and evaluation state.

**Identity:**
```typescript
interface NodeInstanceID {
  uuid: string;
  typeID: NodeTypeID;
  instanceIndex: number;  // For human-readable labels like "Box_3"
}
```

**Lifecycle States:**
```
CREATED → MOUNTED → IDLE → QUEUED → EVALUATING → EVALUATED
                                          ↓
                                       ERROR
                                          ↓
                                    (recoverable to IDLE)
```

**Core Invariants:**
- N-INV-001: Node must reference a registered NodeType
- N-INV-002: Node cannot be mutated during evaluation
- N-INV-003: Error state must include captured error object
- N-INV-004: Position must be finite numbers
- N-INV-005: Output values only valid when EVALUATED

**Critical Implementation Note:** Nodes must capture a snapshot of input values before evaluation begins. This snapshot is immutable during evaluation and used for cache invalidation.

---

### 1.3 PORT

**Definition:** Typed connection point on a node for data flow.

**Type System:**
```typescript
enum PortType {
  NUMBER, STRING, BOOLEAN,
  MESH, CURVE, SURFACE, POINT_CLOUD,
  ARRAY, OBJECT,
  GENOME_SPEC, FITNESS_SPEC, BUILD_FUNCTION,
  MATERIAL_PARTICLES, VOXEL_GRID,
  ANY
}
```

**Core Invariants:**
- P-INV-001: Input ports maximum one connection
- P-INV-002: Port type immutable after creation
- P-INV-003: Required ports must have value or connection or default
- P-INV-004: Constraints must be consistent (min ≤ max)
- P-INV-005: Validators must be pure functions

**Critical Implementation Note:** Type compatibility checking must occur at edge creation time, not evaluation time. The system should never allow an incompatible edge to be created.

---

### 1.4 EDGE

**Definition:** Directed connection between output and input ports.

**Core Invariants:**
- E-INV-001: Source must be output port
- E-INV-002: Target must be input port
- E-INV-003: Must not create cycles
- E-INV-004: Ports must have compatible types
- E-INV-005: Target port must not have another edge

**Critical Implementation Note:** Edge creation must perform cycle detection BEFORE adding the edge to the graph. If a cycle would be created, the operation must fail atomically with zero side effects.

---

### 1.5 COMMAND

**Definition:** An atomic, undoable operation that mutates graph state.

**Required Properties:**
```typescript
interface Command {
  beforeState: GraphSnapshot;
  afterState: GraphSnapshot;
  execute(): void;
  undo(): void;
  redo(): void;
  canExecute(): boolean;
}
```

**Core Invariants:**
- C-INV-001: Must capture before/after state
- C-INV-002: Undo must restore exact previous state
- C-INV-003: Redo equals execute on current state
- C-INV-004: Failed commands not added to undo stack
- C-INV-005: Commands must be serializable

**Critical Implementation Note:** The command pattern is the ONLY way to mutate graph state. Direct mutations bypass undo/redo and must be prevented by freezing the graph object.

---

### 1.6 SOLVER STATE

**Definition:** Runtime state of solver nodes (Biological, Chemistry, Voxel).

**Core Invariants:**
- S-INV-001: Must run in Web Worker (non-blocking)
- S-INV-002: Must enforce budget before iteration
- S-INV-003: Must be cancellable at any iteration
- S-INV-004: Failures must not crash main thread
- S-INV-005: Must report progress regularly

**Critical Implementation Note:** Solvers communicate with the main thread via postMessage only. They must never share memory with the graph state. All solver data must be serializable.

---

## 2. SEMANTIC CONTRACTS

These contracts define relationships between entities as conditional rules: "If A, then B must hold."

---

### CONTRACT 2.1: PORT TYPE COMPATIBILITY

**Rule:** Before creating edge from port A (output) to port B (input):

```typescript
function canConnect(sourcePort: Port, targetPort: Port): boolean {
  // Exact type match
  if (sourcePort.type === targetPort.type) return true;
  
  // ANY wildcard accepts anything
  if (targetPort.type === PortType.ANY) return true;
  
  // Check coercion matrix
  if (COERCION_MATRIX.has([sourcePort.type, targetPort.type])) return true;
  
  return false;
}
```

**Postcondition:** If canConnect returns false, edge creation must fail with user-facing error message specifying why types are incompatible.

---

### CONTRACT 2.2: EVALUATION ORDER

**Rule:** Nodes must evaluate in topological order (dependencies before dependents).

```typescript
function getEvaluationOrder(graph: Graph): NodeInstanceID[] {
  const sorted = topologicalSort(graph);
  if (sorted === null) {
    throw new GraphCycleError("Cannot evaluate graph with cycles");
  }
  return sorted;
}
```

**Postcondition:** If topological sort fails, evaluation must not proceed. The system must identify and highlight the cycle for the user.

---

### CONTRACT 2.3: ERROR ISOLATION

**Rule:** When node N fails during evaluation:

1. Set node N to ERROR state with captured error
2. Mark all downstream nodes as STALE (do not evaluate)
3. Log error with full context (node ID, inputs, stack trace)
4. Show user notification
5. Do NOT crash the graph or other nodes

**Postcondition:** The graph remains in a valid state. User can inspect error, fix issue, and re-evaluate.

---

### CONTRACT 2.4: STATE MUTATION ATOMICITY

**Rule:** All state mutations must occur through commands.

```typescript
class MoveNodeCommand implements Command {
  execute() {
    this.beforeState = captureSnapshot(this.node);
    this.node.position = this.newPosition;
    this.afterState = captureSnapshot(this.node);
    this.graph.version++;
  }
  
  undo() {
    restoreSnapshot(this.node, this.beforeState);
    this.graph.version++;
  }
}
```

**Postcondition:** Every mutation is reversible and recorded in undo stack. Direct property assignment on graph/nodes must be prevented.

---

## 3. CORE INVARIANTS

These are concrete, testable assertions that must hold at all times. Each invariant includes a test function that the codex agent must implement.

---

### GRAPH INVARIANTS

**G-INV-001: Acyclicity**
```typescript
function testAcyclicity(graph: Graph): boolean {
  return topologicalSort(graph) !== null;
}
```

**G-INV-002: Edge Target Uniqueness**
```typescript
function testEdgeTargetUniqueness(graph: Graph): boolean {
  const targetPorts = new Set<PortID>();
  for (const edge of graph.edges.values()) {
    if (targetPorts.has(edge.targetPort)) return false;
    targetPorts.add(edge.targetPort);
  }
  return true;
}
```

**G-INV-003: Node Count Limit**
```typescript
function testNodeCountLimit(graph: Graph): boolean {
  return graph.nodes.size <= CONFIG.MAX_NODES; // Default: 10,000
}
```

**G-INV-004: Undo Stack Validity**
```typescript
function testUndoStackValidity(graph: Graph): boolean {
  for (const cmd of graph.undoStack) {
    if (!cmd.beforeState || !cmd.afterState) return false;
  }
  return true;
}
```

**G-INV-005: Selection Consistency**
```typescript
function testSelectionConsistency(graph: Graph): boolean {
  for (const nodeID of graph.selection.nodes) {
    if (!graph.nodes.has(nodeID)) return false;
  }
  return true;
}
```

---

### NODE INVARIANTS

**N-INV-001: Type Reference Validity**
```typescript
function testTypeReference(node: NodeInstance): boolean {
  return nodeRegistry.has(node.id.typeID);
}
```

**N-INV-002: Port Count Match**
```typescript
function testPortCountMatch(node: NodeInstance): boolean {
  const typeDef = nodeRegistry.get(node.id.typeID);
  return node.inputPorts.size === typeDef.inputs.length;
}
```

**N-INV-003: Error State Consistency**
```typescript
function testErrorState(node: NodeInstance): boolean {
  if (node.state === NodeInstanceState.ERROR) {
    return node.error !== null;
  } else {
    return node.error === null;
  }
}
```

**N-INV-004: Position Finiteness**
```typescript
function testPositionFinite(node: NodeInstance): boolean {
  return isFinite(node.position.x) && isFinite(node.position.y);
}
```

---

### PORT INVARIANTS

**P-INV-001: Input Connection Limit**
```typescript
function testInputConnectionLimit(port: Port): boolean {
  if (port.direction === "input") {
    return port.connections.length <= 1;
  }
  return true;
}
```

**P-INV-002: Required Port Values**
```typescript
function testRequiredPortValue(port: Port, node: NodeInstance): boolean {
  if (!port.required) return true;
  const hasConnection = port.connection !== null;
  const hasValue = node.inputValues.has(port.id);
  const hasDefault = port.defaultValue !== undefined;
  return hasConnection || hasValue || hasDefault;
}
```

---

### EDGE INVARIANTS

**E-INV-001: Source is Output**
```typescript
function testSourceIsOutput(edge: Edge): boolean {
  const sourcePort = getPort(edge.sourcePort);
  return sourcePort.direction === "output";
}
```

**E-INV-002: No Cycles**
```typescript
function testNoCycles(edge: Edge, graph: Graph): boolean {
  const tempGraph = cloneGraph(graph);
  tempGraph.edges.add(edge);
  return topologicalSort(tempGraph) !== null;
}
```

---

### COMMAND INVARIANTS

**C-INV-001: Undo Exactness**
```typescript
function testUndoExactness(command: Command, graph: Graph): boolean {
  const stateBefore = cloneGraph(graph);
  command.execute();
  command.undo();
  return graphsEqual(stateBefore, graph);
}
```

---

### SOLVER INVARIANTS

**S-INV-001: Budget Enforcement**
```typescript
function testSolverBudget(solver: SolverState): boolean {
  if (solver.type === "chemistry") {
    return solver.particles.count <= solver.budget.maxParticles;
  }
  return true;
}
```

**S-INV-002: Worker Isolation**
```typescript
function testWorkerIsolation(solver: SolverState): boolean {
  return solver.worker instanceof Worker;
}
```

---

# PART II: FAILURE SCIENCE

## 4. FAILURE TAXONOMY

This section classifies failure modes by symptom, root cause, detection, and mitigation.

---

### FAILURE CLASS 4.1: TYPE ERRORS

**Symptoms:**
- Edge connection rejected
- Node evaluation fails with type error
- Render fails with unexpected data shape

**Root Causes:**
- Incompatible port types connected
- Type coercion missing
- Serialization changes types

**Detection:**
```typescript
function detectTypeError(edge: Edge): Error | null {
  const sourcePort = getPort(edge.sourcePort);
  const targetPort = getPort(edge.targetPort);
  
  if (!canConnect(sourcePort, targetPort)) {
    return new TypeError(
      `Cannot connect ${sourcePort.type} to ${targetPort.type}`
    );
  }
  return null;
}
```

**Mitigation:**
- Validate types at edge creation (prevent invalid connections)
- Show type annotations on ports
- Provide explicit conversion nodes

---

### FAILURE CLASS 4.2: GRAPH TOPOLOGY ERRORS

**Symptoms:**
- Infinite evaluation loop
- Topological sort fails
- Edges point to deleted nodes

**Root Causes:**
- Cycle introduced
- Node deleted without edge cleanup
- Undo/redo corruption

**Detection:**
```typescript
function detectCycle(graph: Graph): NodeInstanceID[] | null {
  const visited = new Set();
  const recStack = new Set();
  
  function dfs(nodeID) {
    visited.add(nodeID);
    recStack.add(nodeID);
    
    for (const neighbor of getDownstream(nodeID)) {
      if (!visited.has(neighbor)) {
        const cycle = dfs(neighbor);
        if (cycle) return cycle;
      } else if (recStack.has(neighbor)) {
        return [nodeID, neighbor]; // Cycle found
      }
    }
    
    recStack.delete(nodeID);
    return null;
  }
  
  for (const nodeID of graph.nodes.keys()) {
    if (!visited.has(nodeID)) {
      const cycle = dfs(nodeID);
      if (cycle) return cycle;
    }
  }
  
  return null;
}
```

**Mitigation:**
- Prevent cycle-creating edges
- Auto-delete edges when nodes deleted
- Validate graph structure on load

---

### FAILURE CLASS 4.3: EVALUATION ERRORS

**Symptoms:**
- Node enters ERROR state
- Evaluation timeout
- Memory spike

**Root Causes:**
- Division by zero
- Null reference
- Infinite loop in compute
- Out of memory

**Detection:**
```typescript
async function evaluateNodeSafely(node: NodeInstance): Promise<void> {
  try {
    // Validate inputs
    const validation = validateInputs(node);
    if (!validation.valid) {
      throw new Error(`Invalid inputs: ${validation.errors.join(", ")}`);
    }
    
    // Evaluate with timeout
    const result = await Promise.race([
      node.type.compute(node.inputValues),
      timeout(30000, "Evaluation timeout")
    ]);
    
    node.outputValues = result;
    node.state = NodeInstanceState.EVALUATED;
    
  } catch (error) {
    node.state = NodeInstanceState.ERROR;
    node.error = error;
    logger.error("Node evaluation failed", {
      nodeID: node.id,
      inputs: serializeInputs(node.inputValues),
      error: error.message,
      stack: error.stack
    });
  }
}
```

**Mitigation:**
- Validate inputs before evaluation
- Wrap compute in try/catch
- Set timeout on async operations
- Show clear error on node

---

### FAILURE CLASS 4.4: RENDER ERRORS

**Symptoms:**
- Black screen
- WebGL errors
- Geometry distortion
- Browser crash

**Root Causes:**
- Invalid geometry (NaN vertices)
- Shader compilation failure
- GPU out of memory
- WebGL context loss

**Detection:**
```typescript
function validateGeometry(geometry: Geometry): ValidationResult {
  const errors = [];
  
  // Check for NaN/Infinity
  for (let i = 0; i < geometry.vertices.length; i++) {
    if (!isFinite(geometry.vertices[i])) {
      errors.push(`Invalid vertex at ${i}: ${geometry.vertices[i]}`);
    }
  }
  
  // Check bounds
  const bounds = computeBounds(geometry);
  if (bounds.size > CONFIG.MAX_SCENE_SIZE) {
    errors.push(`Geometry too large: ${bounds.size}`);
  }
  
  // Check indices
  if (geometry.indices) {
    const maxIdx = geometry.vertices.length / 3 - 1;
    for (const idx of geometry.indices) {
      if (idx > maxIdx) {
        errors.push(`Index out of range: ${idx} > ${maxIdx}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}
```

**Mitigation:**
- Validate geometry before rendering
- Clamp to safe bounds
- Fallback to wireframe if invalid
- Auto-recover from context loss

---

### FAILURE CLASS 4.5: STATE SYNC ERRORS

**Symptoms:**
- UI shows wrong node position
- Undo doesn't restore state
- Deleted node still visible

**Root Causes:**
- State mutation bypasses commands
- UI doesn't react to state changes
- Undo stack corrupted
- Race condition

**Detection:**
```typescript
function validateStateSync(graph: Graph, ui: UIState): ValidationResult {
  const errors = [];
  
  // Check node positions
  for (const [nodeID, node] of graph.nodes) {
    const uiNode = ui.nodes.get(nodeID);
    if (!uiNode) {
      errors.push(`UI missing node: ${nodeID}`);
    } else if (node.position.x !== uiNode.x || node.position.y !== uiNode.y) {
      errors.push(`Position mismatch: ${nodeID}`);
    }
  }
  
  // Check for ghost nodes
  for (const nodeID of ui.nodes.keys()) {
    if (!graph.nodes.has(nodeID)) {
      errors.push(`UI ghost node: ${nodeID}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}
```

**Mitigation:**
- Enforce command-only mutations
- Implement reactive UI updates
- Validate state consistency on frame
- Provide "Sync UI" command

---

## 5. CRITICAL FAILURE SCENARIOS

These are concrete scenarios the codex agent must test during implementation.

---

### SCENARIO 5.1: Cycle Creation Attempt

**Setup:**
```
A → B → C
```

**Action:** User tries to create edge C → A

**Expected Behavior:**
1. Edge creation attempt is intercepted
2. Cycle detection runs
3. Cycle is detected: [A, B, C, A]
4. Edge creation fails
5. User sees error: "Cannot create edge: would create cycle A → B → C → A"
6. Ghost edge (if shown during drag) turns red
7. No edge is added to graph
8. Graph state unchanged

**Test:**
```typescript
function testCyclePrevention() {
  const graph = new Graph();
  const A = graph.addNode("Math.Add");
  const B = graph.addNode("Math.Multiply");
  const C = graph.addNode("Math.Subtract");
  
  graph.addEdge(A.output, B.inputA);
  graph.addEdge(B.output, C.inputA);
  
  // Should fail
  try {
    graph.addEdge(C.output, A.inputB);
    assert.fail("Should have thrown cycle error");
  } catch (error) {
    assert.include(error.message, "cycle");
  }
  
  // Graph unchanged
  assert.equal(graph.edges.size, 2);
}
```

---

### SCENARIO 5.2: Node Deletion with Edges

**Setup:**
```
A → B → C
```

**Action:** User deletes node B

**Expected Behavior:**
1. Delete command captures before state
2. Edges A→B and B→C are identified
3. Both edges deleted
4. Node B deleted
5. Command added to undo stack
6. Graph revalidates
7. Evaluation marks C as STALE (lost input)

**Test:**
```typescript
function testNodeDeletionCascade() {
  const graph = new Graph();
  const A = graph.addNode("Math.Add");
  const B = graph.addNode("Math.Multiply");
  const C = graph.addNode("Math.Subtract");
  
  const edgeAB = graph.addEdge(A.output, B.inputA);
  const edgeBC = graph.addEdge(B.output, C.inputA);
  
  const deleteCmd = new DeleteNodeCommand(B.id);
  deleteCmd.execute();
  
  assert.equal(graph.nodes.size, 2);
  assert.equal(graph.edges.size, 0);
  assert.isFalse(graph.nodes.has(B.id));
  
  // Undo restores everything
  deleteCmd.undo();
  assert.equal(graph.nodes.size, 3);
  assert.equal(graph.edges.size, 2);
}
```

---

### SCENARIO 5.3: Solver Timeout

**Setup:**
- Biological Solver 2 configured for 100 generations
- Population size 100
- Heavy fitness function (expensive geometry)

**Action:** User clicks "Run All Generations"

**Expected Behavior:**
1. Solver starts in worker
2. Progress updates every second
3. After 30 seconds (default timeout), no response
4. Main thread detects timeout
5. Worker is terminated
6. Solver state set to ERROR
7. User sees: "Solver timeout after 30s. Consider reducing population size or generations."
8. Partial results (if any) are preserved
9. Graph remains functional

**Test:**
```typescript
function testSolverTimeout() {
  const solver = new BiologicalSolver2();
  solver.initialize({
    populationSize: 100,
    generations: 100,
    timeout: 5000 // 5s for test
  });
  
  const promise = solver.run();
  
  // Should reject with timeout
  return promise.then(
    () => assert.fail("Should have timed out"),
    (error) => {
      assert.include(error.message, "timeout");
      assert.equal(solver.status, "failed");
    }
  );
}
```

---

### SCENARIO 5.4: WebGL Context Loss

**Setup:**
- Graph with 50 geometry nodes rendered
- User switches browser tabs for 5 minutes
- GPU driver resets WebGL context

**Action:** User returns to tab

**Expected Behavior:**
1. Canvas detects context loss event
2. All WebGL resources invalidated
3. Context restore attempted
4. If successful:
   - Shaders recompiled
   - Buffers recreated
   - Scene re-rendered
   - User sees brief "Restoring..." message
5. If failed:
   - User sees: "WebGL context lost. Please refresh page."
   - Graph state preserved (can be saved)

**Test:**
```typescript
function testWebGLContextRecovery() {
  const canvas = document.getElementById("canvas");
  const gl = canvas.getContext("webgl2");
  
  // Simulate context loss
  const lossExt = gl.getExtension("WEBGL_lose_context");
  
  let contextRestored = false;
  canvas.addEventListener("webglcontextrestored", () => {
    contextRestored = true;
  });
  
  lossExt.loseContext();
  
  // Wait for restore
  return new Promise((resolve) => {
    setTimeout(() => {
      lossExt.restoreContext();
      setTimeout(() => {
        assert.isTrue(contextRestored);
        resolve();
      }, 100);
    }, 100);
  });
}
```

---

# PART III: DEFENSIVE SYSTEMS

## 6. INSTRUMENTATION LAYER (THE NERVOUS SYSTEM)

The instrumentation layer makes every action, evaluation, and failure observable and replayable.

---

### 6.1 EVENT LOGGING SCHEMA

All events must be logged in structured JSON format:

```typescript
interface LogEvent {
  timestamp: string;        // ISO 8601
  level: "debug" | "info" | "warn" | "error" | "fatal";
  category: string;         // "graph" | "node" | "render" | "solver" | "command"
  event: string;            // "edge_created" | "node_evaluated" | "error_caught"
  data: Record<string, any>;
  context: {
    graphID: string;
    graphVersion: number;
    sessionID: string;
    userAgent: string;
  };
}
```

**Example Events:**
```json
{
  "timestamp": "2026-01-29T10:30:45.123Z",
  "level": "info",
  "category": "command",
  "event": "add_node",
  "data": {
    "nodeType": "Geometry.Box",
    "nodeID": "node_abc123",
    "position": { "x": 100, "y": 200 }
  },
  "context": {
    "graphID": "graph_xyz789",
    "graphVersion": 42,
    "sessionID": "session_def456"
  }
}
```

```json
{
  "timestamp": "2026-01-29T10:30:47.456Z",
  "level": "error",
  "category": "node",
  "event": "evaluation_failed",
  "data": {
    "nodeID": "node_abc123",
    "nodeType": "Geometry.Box",
    "error": "TypeError: Cannot read property 'width' of undefined",
    "stack": "at BoxNode.compute...",
    "inputs": {
      "width": null,
      "height": 10,
      "depth": 10
    }
  },
  "context": {
    "graphID": "graph_xyz789",
    "graphVersion": 42
  }
}
```

---

### 6.2 REPLAY CAPABILITY

The system must record all interactions and evaluations for replay.

**Replay Data Structure:**
```typescript
interface ReplaySession {
  sessionID: string;
  startTime: timestamp;
  endTime: timestamp;
  
  initialState: GraphSnapshot;
  
  events: Array<{
    timestamp: timestamp;
    type: "command" | "interaction" | "evaluation";
    data: any;
  }>;
  
  finalState: GraphSnapshot;
}
```

**Replay Engine:**
```typescript
class ReplayEngine {
  async replay(session: ReplaySession, speed: number = 1.0): Promise<void> {
    // Restore initial state
    loadGraphSnapshot(session.initialState);
    
    // Replay events in chronological order
    for (const event of session.events) {
      await this.sleep((event.timestamp - lastTimestamp) / speed);
      
      if (event.type === "command") {
        const command = deserializeCommand(event.data);
        command.execute();
      } else if (event.type === "interaction") {
        simulateInteraction(event.data);
      } else if (event.type === "evaluation") {
        evaluateGraph();
      }
      
      lastTimestamp = event.timestamp;
    }
  }
}
```

**Use Cases:**
- Debug failures by replaying user session
- Create automated tests from user sessions
- Performance profiling of real usage patterns

---

### 6.3 DEBUG OVERLAYS

Visual overlays for debugging hit-testing, bounds, and handles.

**Debug Modes:**

1. **Hit-Test Overlay:** Shows raycasting zones and clickable areas
   - Green boxes: Correct hit zones
   - Red boxes: Missed hit zones
   - Yellow crosshair: Mouse position
   - Tooltip: Hit entity ID

2. **Bounding Box Overlay:** Shows computed bounds for all nodes
   - Blue boxes: Node bounds
   - Orange boxes: Geometry bounds
   - Numbers: Dimensions in pixels

3. **Handle Overlay:** Shows all interactive handles
   - Transform gizmos
   - Control points
   - Port connection targets

**Implementation:**
```typescript
class DebugOverlay {
  private enabled: boolean = false;
  private mode: "hitTest" | "bounds" | "handles" | null = null;
  
  toggle(mode: string): void {
    if (this.mode === mode) {
      this.enabled = false;
      this.mode = null;
    } else {
      this.enabled = true;
      this.mode = mode as any;
    }
    this.render();
  }
  
  render(): void {
    if (!this.enabled) return;
    
    const overlay = document.getElementById("debug-overlay");
    const ctx = overlay.getContext("2d");
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    
    if (this.mode === "hitTest") {
      this.renderHitTestZones(ctx);
    } else if (this.mode === "bounds") {
      this.renderBounds(ctx);
    } else if (this.mode === "handles") {
      this.renderHandles(ctx);
    }
  }
}
```

**Keyboard Shortcuts:**
- `Ctrl+Shift+H`: Toggle hit-test overlay
- `Ctrl+Shift+B`: Toggle bounds overlay
- `Ctrl+Shift+G`: Toggle handle overlay

---

### 6.4 EVALUATION TRACING

Per-node tracing of evaluation timing and data snapshots.

**Trace Data:**
```typescript
interface EvaluationTrace {
  nodeID: NodeInstanceID;
  startTime: timestamp;
  endTime: timestamp;
  duration: number;
  
  inputSnapshot: Record<PortID, any>;
  outputSnapshot: Record<PortID, any>;
  
  cacheHit: boolean;
  
  error?: {
    message: string;
    stack: string;
  };
}
```

**Trace Collector:**
```typescript
class EvaluationTracer {
  private traces: EvaluationTrace[] = [];
  
  async traceNodeEvaluation(node: NodeInstance): Promise<void> {
    const trace: EvaluationTrace = {
      nodeID: node.id,
      startTime: performance.now(),
      inputSnapshot: cloneDeep(node.inputValues)
    };
    
    try {
      await evaluateNode(node);
      trace.outputSnapshot = cloneDeep(node.outputValues);
      trace.cacheHit = node.evaluationMetrics.lastCacheHit;
    } catch (error) {
      trace.error = {
        message: error.message,
        stack: error.stack
      };
    } finally {
      trace.endTime = performance.now();
      trace.duration = trace.endTime - trace.startTime;
      this.traces.push(trace);
    }
  }
  
  getSlowNodes(thresholdMs: number): EvaluationTrace[] {
    return this.traces.filter(t => t.duration > thresholdMs);
  }
  
  exportTraces(): string {
    return JSON.stringify(this.traces, null, 2);
  }
}
```

**UI Display:**
Show evaluation timeline with node durations:
```
[BoxNode]     ▓░░ 2.3ms
[SubdNode]    ▓▓▓▓▓▓▓▓▓ 15.7ms
[BoolNode]    ▓ 0.5ms (cached)
[SolverNode]  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 234.1ms
```

---

### 6.5 RENDER PIPELINE TRACING

Track draw calls, geometry counts, and GPU metrics.

**Render Stats:**
```typescript
interface RenderStats {
  frameTime: number;
  fps: number;
  
  drawCalls: number;
  triangles: number;
  vertices: number;
  
  geometryNodes: number;
  totalMeshes: number;
  
  gpuMemoryUsage: number;
  
  frustumCulled: number;
  batched: number;
}
```

**Stats Collector:**
```typescript
class RenderStatsCollector {
  private stats: RenderStats = this.createEmpty();
  
  startFrame(): void {
    this.stats = this.createEmpty();
    this.stats.frameStart = performance.now();
  }
  
  recordDrawCall(primitive: RenderPrimitive): void {
    this.stats.drawCalls++;
    this.stats.triangles += primitive.geometry.indices.length / 3;
    this.stats.vertices += primitive.geometry.vertices.length / 3;
  }
  
  endFrame(): void {
    this.stats.frameTime = performance.now() - this.stats.frameStart;
    this.stats.fps = 1000 / this.stats.frameTime;
    
    this.displayStats();
  }
  
  displayStats(): void {
    const overlay = document.getElementById("stats-overlay");
    overlay.innerHTML = `
      FPS: ${this.stats.fps.toFixed(1)}
      Draw Calls: ${this.stats.drawCalls}
      Triangles: ${this.stats.triangles.toLocaleString()}
      GPU Memory: ${(this.stats.gpuMemoryUsage / 1e6).toFixed(1)}MB
    `;
  }
}
```

---

## 7. VALIDATION LAYER (THE IMMUNE SYSTEM)

The validation layer prevents invalid operations from executing.

---

### 7.1 STATIC VALIDATION (AUTHORING-TIME)

Validation that occurs when user attempts an action (before execution).

**Edge Creation Validation:**
```typescript
function validateEdgeCreation(
  sourcePort: Port,
  targetPort: Port,
  graph: Graph
): ValidationResult {
  const errors: string[] = [];
  
  // Type compatibility
  if (!canConnect(sourcePort, targetPort)) {
    errors.push(
      `Type mismatch: Cannot connect ${sourcePort.type} to ${targetPort.type}`
    );
  }
  
  // Target already connected
  const existingEdge = findEdgeToPort(graph, targetPort);
  if (existingEdge) {
    errors.push(
      `Target port already has connection from ${existingEdge.sourceNode}`
    );
  }
  
  // Cycle detection
  const wouldCreateCycle = detectsCycle(
    { sourceNode: sourcePort.nodeID, targetNode: targetPort.nodeID },
    graph
  );
  if (wouldCreateCycle) {
    errors.push(
      `Would create cycle: ${wouldCreateCycle.join(" → ")}`
    );
  }
  
  // Same graph
  if (sourcePort.graphID !== targetPort.graphID) {
    errors.push("Ports must be in same graph");
  }
  
  return {
    valid: errors.length === 0,
    errors,
    suggestions: errors.length > 0 ? suggestFixes(sourcePort, targetPort) : []
  };
}
```

**Parameter Edit Validation:**
```typescript
function validateParameterEdit(
  port: Port,
  newValue: any
): ValidationResult {
  const errors: string[] = [];
  
  // Type check
  if (typeof newValue !== getExpectedType(port.type)) {
    errors.push(`Expected ${port.type}, got ${typeof newValue}`);
  }
  
  // Constraint check
  if (port.constraints.min !== undefined && newValue < port.constraints.min) {
    errors.push(`Value ${newValue} below minimum ${port.constraints.min}`);
  }
  
  if (port.constraints.max !== undefined && newValue > port.constraints.max) {
    errors.push(`Value ${newValue} above maximum ${port.constraints.max}`);
  }
  
  // Custom validator
  if (port.constraints.validator && !port.constraints.validator(newValue)) {
    errors.push(`Value ${newValue} failed custom validation`);
  }
  
  return { valid: errors.length === 0, errors };
}
```

---

### 7.2 RUNTIME ASSERTIONS (DEV MODE)

Assertions that check invariants during execution (only in development builds).

```typescript
function assert(condition: boolean, message: string): void {
  if (!CONFIG.DEV_MODE) return;
  
  if (!condition) {
    const error = new AssertionError(message);
    logger.fatal("Assertion failed", {
      message,
      stack: error.stack
    });
    throw error;
  }
}

// Usage in code
function evaluateGraph(graph: Graph): void {
  assert(graph.state !== GraphState.EVALUATING, "Graph already evaluating");
  assert(!hasC ycles(graph), "Graph has cycles");
  
  graph.state = GraphState.EVALUATING;
  Object.freeze(graph); // Prevent mutations
  
  try {
    const order = topologicalSort(graph);
    assert(order !== null, "Topological sort failed");
    
    for (const nodeID of order) {
      const node = graph.nodes.get(nodeID);
      assert(node !== undefined, `Node ${nodeID} not found`);
      
      await evaluateNode(node);
    }
  } finally {
    Object.unfreeze(graph);
    graph.state = GraphState.EVALUATED;
  }
}
```

---

### 7.3 SCHEMA VALIDATION

Validate NodeType definitions when registering nodes.

```typescript
interface NodeTypeSchema {
  id: { category: string; name: string; version: string };
  displayName: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  compute: Function;
  defaultValues?: Record<string, any>;
  constraints?: PortConstraint[];
}

function validateNodeTypeSchema(schema: any): ValidationResult {
  const errors: string[] = [];
  
  // Required fields
  if (!schema.id) errors.push("Missing id");
  if (!schema.displayName) errors.push("Missing displayName");
  if (!schema.inputs) errors.push("Missing inputs");
  if (!schema.outputs) errors.push("Missing outputs");
  if (!schema.compute) errors.push("Missing compute function");
  
  // ID format
  if (schema.id && !isValidVersionString(schema.id.version)) {
    errors.push(`Invalid version: ${schema.id.version} (must be semver)`);
  }
  
  // Port definitions
  if (schema.inputs) {
    for (const port of schema.inputs) {
      if (!port.name) errors.push("Input port missing name");
      if (!port.type) errors.push("Input port missing type");
    }
  }
  
  // Compute function signature
  if (schema.compute && schema.compute.length !== 1) {
    errors.push("Compute function must accept exactly one argument (inputs)");
  }
  
  return { valid: errors.length === 0, errors };
}
```

---

### 7.4 CONSTRAINT ENFORCEMENT

Enforce limits at runtime.

```typescript
class ConstraintEnforcer {
  enforceGraphConstraints(graph: Graph): void {
    // Node count limit
    if (graph.nodes.size > CONFIG.MAX_NODES) {
      throw new ConstraintError(
        `Graph exceeds maximum node count: ${graph.nodes.size} > ${CONFIG.MAX_NODES}`
      );
    }
    
    // Edge count limit
    if (graph.edges.size > CONFIG.MAX_EDGES) {
      throw new ConstraintError(
        `Graph exceeds maximum edge count: ${graph.edges.size} > ${CONFIG.MAX_EDGES}`
      );
    }
  }
  
  enforceGeometryConstraints(geometry: Geometry): void {
    // Vertex count limit
    const vertexCount = geometry.vertices.length / 3;
    if (vertexCount > CONFIG.MAX_VERTICES) {
      throw new ConstraintError(
        `Geometry exceeds vertex limit: ${vertexCount} > ${CONFIG.MAX_VERTICES}`
      );
    }
    
    // Memory usage limit
    const memoryUsage = estimateMemoryUsage(geometry);
    if (memoryUsage > CONFIG.MAX_GEOMETRY_MEMORY) {
      throw new ConstraintError(
        `Geometry exceeds memory limit: ${(memoryUsage / 1e6).toFixed(1)}MB > ${(CONFIG.MAX_GEOMETRY_MEMORY / 1e6).toFixed(1)}MB`
      );
    }
  }
  
  enforceSolverBudgets(solver: SolverState): void {
    if (solver.type === "chemistry") {
      const particleCount = solver.particles.positions.length / 3;
      if (particleCount > solver.budget.maxParticles) {
        throw new ConstraintError(
          `Solver exceeds particle budget: ${particleCount} > ${solver.budget.maxParticles}`
        );
      }
    }
    
    if (solver.type === "voxel") {
      const [x, y, z] = solver.grid.resolution;
      const voxelCount = x * y * z;
      if (voxelCount > solver.budget.maxVoxels) {
        throw new ConstraintError(
          `Solver exceeds voxel budget: ${voxelCount} > ${solver.budget.maxVoxels}`
        );
      }
    }
  }
}
```

---

## 8. RECOVERY LAYER (THE HEALING SYSTEM)

The recovery layer restores system integrity after failures.

---

### 8.1 UNDO/REDO MODEL

Robust undo/redo with graph snapshots.

**Snapshot Format:**
```typescript
interface GraphSnapshot {
  version: number;
  timestamp: timestamp;
  
  nodes: Map<NodeInstanceID, NodeInstanceSnapshot>;
  edges: Map<EdgeID, EdgeSnapshot>;
  selection: SelectionStateSnapshot;
  
  // Compressed format
  compressed: boolean;
  data?: Uint8Array;
}
```

**Undo Stack Management:**
```typescript
class UndoManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxStackSize = 100;
  
  executeCommand(command: Command): void {
    // Validate
    if (!command.canExecute()) {
      throw new Error("Command cannot execute");
    }
    
    // Capture before state
    command.beforeState = captureSnapshot(this.graph);
    
    // Execute
    try {
      command.execute();
    } catch (error) {
      logger.error("Command execution failed", { command, error });
      throw error;
    }
    
    // Capture after state
    command.afterState = captureSnapshot(this.graph);
    
    // Add to undo stack
    this.undoStack.push(command);
    
    // Clear redo stack
    this.redoStack = [];
    
    // Trim if needed
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
  }
  
  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    
    const command = this.undoStack.pop();
    command.undo();
    this.redoStack.push(command);
    
    return true;
  }
  
  redo(): boolean {
    if (this.redoStack.length === 0) return false;
    
    const command = this.redoStack.pop();
    command.redo();
    this.undoStack.push(command);
    
    return true;
  }
}
```

---

### 8.2 CRASH-SAFE AUTOSAVE

Automatic snapshots to localStorage with corruption recovery.

```typescript
class AutosaveManager {
  private autosaveInterval = 60000; // 1 minute
  private maxAutosaves = 10;
  
  start(): void {
    setInterval(() => {
      this.autosave();
    }, this.autosaveInterval);
    
    // Save on beforeunload
    window.addEventListener("beforeunload", () => {
      this.autosave();
    });
  }
  
  autosave(): void {
    try {
      const snapshot = captureSnapshot(this.graph);
      const json = JSON.stringify(snapshot);
      
      // Save to localStorage with timestamp
      const key = `autosave_${Date.now()}`;
      localStorage.setItem(key, json);
      
      // Trim old autosaves
      this.trimOldAutosaves();
      
      logger.info("Autosaved", { key, size: json.length });
    } catch (error) {
      logger.error("Autosave failed", { error });
    }
  }
  
  trimOldAutosaves(): void {
    const keys = Object.keys(localStorage)
      .filter(k => k.startsWith("autosave_"))
      .sort()
      .reverse();
    
    // Keep only latest N
    for (let i = this.maxAutosaves; i < keys.length; i++) {
      localStorage.removeItem(keys[i]);
    }
  }
  
  restoreLatest(): GraphSnapshot | null {
    const keys = Object.keys(localStorage)
      .filter(k => k.startsWith("autosave_"))
      .sort()
      .reverse();
    
    for (const key of keys) {
      try {
        const json = localStorage.getItem(key);
        const snapshot = JSON.parse(json);
        
        // Validate
        if (validateSnapshot(snapshot)) {
          logger.info("Restored autosave", { key });
          return snapshot;
        } else {
          logger.warn("Invalid autosave, trying next", { key });
          localStorage.removeItem(key); // Remove corrupted
        }
      } catch (error) {
        logger.warn("Failed to parse autosave", { key, error });
        localStorage.removeItem(key);
      }
    }
    
    return null;
  }
}
```

---

### 8.3 SAFE-MODE EVALUATION

Disable heavy nodes and run in degraded mode after crashes.

```typescript
class SafeModeManager {
  private safeModeEnabled = false;
  private disabledNodes: Set<NodeInstanceID> = new Set();
  
  enable(): void {
    this.safeModeEnabled = true;
    
    // Disable heavy nodes
    for (const node of this.graph.nodes.values()) {
      if (node.type.flags.isHeavy || node.type.flags.isSolver) {
        this.disabledNodes.add(node.id);
        node.metadata.locked = true;
      }
    }
    
    logger.info("Safe mode enabled", {
      disabledCount: this.disabledNodes.size
    });
    
    ui.showWarning(
      "Safe mode enabled. Heavy nodes disabled. " +
      "Fix errors and disable safe mode to restore full functionality."
    );
  }
  
  disable(): void {
    this.safeModeEnabled = false;
    
    // Re-enable nodes
    for (const nodeID of this.disabledNodes) {
      const node = this.graph.nodes.get(nodeID);
      if (node) {
        node.metadata.locked = false;
      }
    }
    
    this.disabledNodes.clear();
    logger.info("Safe mode disabled");
  }
  
  evaluateGraph(): void {
    if (this.safeModeEnabled) {
      // Evaluate only non-heavy nodes
      const lightNodes = Array.from(this.graph.nodes.values())
        .filter(n => !this.disabledNodes.has(n.id));
      
      for (const node of lightNodes) {
        try {
          evaluateNode(node);
        } catch (error) {
          logger.warn("Node failed in safe mode", { nodeID: node.id, error });
          // Continue (don't crash)
        }
      }
    } else {
      evaluateGraphNormal();
    }
  }
}
```

---

### 8.4 NODE ISOLATION

Isolate failing nodes without crashing the graph.

```typescript
class NodeIsolator {
  isolateNode(node: NodeInstance, error: Error): void {
    // Set error state
    node.state = NodeInstanceState.ERROR;
    node.error = error;
    node.metadata.locked = true;
    
    // Mark downstream as STALE
    const downstream = getDownstreamNodes(this.graph, node);
    for (const downNode of downstream) {
      downNode.state = NodeInstanceState.STALE;
    }
    
    // Show visual indicator
    ui.highlightNode(node, "error");
    ui.showErrorOverlay(node, error.message);
    
    logger.error("Node isolated due to error", {
      nodeID: node.id,
      error: error.message,
      stack: error.stack,
      downstreamAffected: downstream.length
    });
  }
  
  recoverNode(node: NodeInstance): void {
    // Clear error
    node.error = null;
    node.metadata.locked = false;
    node.state = NodeInstanceState.IDLE;
    
    // Re-evaluate
    try {
      evaluateNode(node);
      ui.clearErrorOverlay(node);
      logger.info("Node recovered", { nodeID: node.id });
    } catch (error) {
      this.isolateNode(node, error);
    }
  }
}
```

---

# PART IV: OPERATIONAL DISCIPLINE

## 9. TESTING RITUALS

### 9.1 DAILY SMOKE TESTS

Quick tests to run every day during development.

```typescript
describe("Daily Smoke Tests", () => {
  it("should create and delete nodes", () => {
    const graph = new Graph();
    const node = graph.addNode("Math.Add");
    assert.equal(graph.nodes.size, 1);
    
    graph.deleteNode(node.id);
    assert.equal(graph.nodes.size, 0);
  });
  
  it("should create and delete edges", () => {
    const graph = new Graph();
    const A = graph.addNode("Math.Add");
    const B = graph.addNode("Math.Multiply");
    
    const edge = graph.addEdge(A.output, B.inputA);
    assert.equal(graph.edges.size, 1);
    
    graph.deleteEdge(edge.id);
    assert.equal(graph.edges.size, 0);
  });
  
  it("should evaluate simple graph", () => {
    const graph = new Graph();
    const numNode = graph.addNode("Math.Number", { value: 5 });
    const addNode = graph.addNode("Math.Add");
    
    graph.addEdge(numNode.output, addNode.inputA);
    graph.addEdge(numNode.output, addNode.inputB);
    
    graph.evaluate();
    
    assert.equal(addNode.outputValues.get("output"), 10);
  });
  
  it("should undo/redo commands", () => {
    const graph = new Graph();
    const node = graph.addNode("Math.Add");
    
    graph.undo();
    assert.equal(graph.nodes.size, 0);
    
    graph.redo();
    assert.equal(graph.nodes.size, 1);
  });
  
  it("should prevent cycles", () => {
    const graph = new Graph();
    const A = graph.addNode("Math.Add");
    const B = graph.addNode("Math.Multiply");
    
    graph.addEdge(A.output, B.inputA);
    
    assert.throws(() => {
      graph.addEdge(B.output, A.inputB);
    }, /cycle/);
  });
});
```

Run: `npm run test:smoke` (should complete in <10 seconds)

---

### 9.2 PER-COMMIT TESTS

Tests that must pass before every commit.

```typescript
describe("Per-Commit Tests", () => {
  describe("Invariants", () => {
    it("should maintain graph acyclicity", () => {
      const graph = createTestGraph();
      assert.isTrue(testAcyclicity(graph));
    });
    
    it("should maintain edge uniqueness", () => {
      const graph = createTestGraph();
      assert.isTrue(testEdgeTargetUniqueness(graph));
    });
    
    // Test all invariants...
  });
  
  describe("Type System", () => {
    it("should reject incompatible connections", () => {
      const graph = new Graph();
      const numberNode = graph.addNode("Math.Number");
      const meshNode = graph.addNode("Geometry.Box");
      
      assert.throws(() => {
        graph.addEdge(numberNode.output, meshNode.geometryInput);
      }, /type/);
    });
  });
  
  describe("Error Handling", () => {
    it("should isolate failing nodes", () => {
      const graph = new Graph();
      const divNode = graph.addNode("Math.Divide");
      divNode.setInput("denominator", 0);
      
      graph.evaluate();
      
      assert.equal(divNode.state, NodeInstanceState.ERROR);
      assert.isNotNull(divNode.error);
    });
  });
});
```

Run: `npm run test:commit` (should complete in <30 seconds)

---

### 9.3 PROPERTY-BASED TESTS

Generative tests that create random graphs and verify invariants hold.

```typescript
describe("Property-Based Tests", () => {
  it("should maintain invariants on random graph mutations", () => {
    fc.assert(
      fc.property(
        fc.array(graphMutationGenerator(), { minLength: 10, maxLength: 100 }),
        (mutations) => {
          const graph = new Graph();
          
          for (const mutation of mutations) {
            try {
              applyMutation(graph, mutation);
            } catch (error) {
              // Mutations may fail, that's OK
              continue;
            }
            
            // Invariants must hold
            assert.isTrue(testAcyclicity(graph), "Acyclicity violated");
            assert.isTrue(testEdgeTargetUniqueness(graph), "Edge uniqueness violated");
            assert.isTrue(testSelectionConsistency(graph), "Selection inconsistent");
          }
        }
      )
    );
  });
  
  it("should roundtrip serialization", () => {
    fc.assert(
      fc.property(
        randomGraphGenerator(),
        (graph) => {
          const json = serializeGraph(graph);
          const restored = deserializeGraph(json);
          assert.isTrue(graphsEqual(graph, restored));
        }
      )
    );
  });
});
```

Run: `npm run test:property` (may take several minutes)

---

## 10. PERFORMANCE BUDGETS

### 10.1 COMPUTATIONAL BUDGETS

```typescript
const PERFORMANCE_BUDGETS = {
  // Graph limits
  MAX_NODES: 10_000,
  MAX_EDGES: 50_000,
  
  // Geometry limits
  MAX_VERTICES: 10_000_000,
  MAX_FACES: 5_000_000,
  MAX_GEOMETRY_MEMORY: 500 * 1024 * 1024, // 500MB
  
  // Evaluation limits
  MAX_EVALUATION_TIME: 30_000, // 30s
  MAX_NODE_EVALUATION_TIME: 5_000, // 5s per node
  
  // Render limits
  TARGET_FPS: 30,
  MAX_DRAW_CALLS: 1000,
  MAX_SCENE_SIZE: 100_000, // units
  
  // Solver limits
  MAX_PARTICLES: 100_000,
  MAX_VOXELS: 128 * 128 * 128,
  MAX_SOLVER_ITERATIONS: 10_000,
  MAX_SOLVER_TIME: 300_000, // 5 minutes
  
  // Memory limits
  MAX_TOTAL_MEMORY: 2 * 1024 * 1024 * 1024, // 2GB
  WARNING_MEMORY: 1.5 * 1024 * 1024 * 1024, // 1.5GB
};
```

### 10.2 BUDGET ENFORCEMENT

```typescript
class BudgetEnforcer {
  checkGraphBudgets(graph: Graph): BudgetViolation[] {
    const violations: BudgetViolation[] = [];
    
    if (graph.nodes.size > PERFORMANCE_BUDGETS.MAX_NODES) {
      violations.push({
        type: "node_count",
        actual: graph.nodes.size,
        limit: PERFORMANCE_BUDGETS.MAX_NODES,
        severity: "error"
      });
    }
    
    const totalVertices = graph.geometryState.statistics.totalVertices;
    if (totalVertices > PERFORMANCE_BUDGETS.MAX_VERTICES) {
      violations.push({
        type: "vertex_count",
        actual: totalVertices,
        limit: PERFORMANCE_BUDGETS.MAX_VERTICES,
        severity: "error"
      });
    }
    
    const memoryUsage = estimateMemoryUsage(graph);
    if (memoryUsage > PERFORMANCE_BUDGETS.WARNING_MEMORY) {
      violations.push({
        type: "memory_usage",
        actual: memoryUsage,
        limit: PERFORMANCE_BUDGETS.WARNING_MEMORY,
        severity: memoryUsage > PERFORMANCE_BUDGETS.MAX_TOTAL_MEMORY ? "error" : "warning"
      });
    }
    
    return violations;
  }
  
  enforceRenderBudgets(renderStats: RenderStats): void {
    if (renderStats.fps < PERFORMANCE_BUDGETS.TARGET_FPS * 0.8) {
      logger.warn("Low FPS", { fps: renderStats.fps });
      ui.showPerformanceWarning("Frame rate low. Consider simplifying geometry.");
    }
    
    if (renderStats.drawCalls > PERFORMANCE_BUDGETS.MAX_DRAW_CALLS) {
      logger.warn("Too many draw calls", { drawCalls: renderStats.drawCalls });
      // Enable aggressive batching
      renderer.setAggressiveBatching(true);
    }
  }
}
```

---

## 11. MIGRATION & VERSIONING

### 11.1 GRAPH VERSION MIGRATIONS

Handle backwards compatibility when NodeType definitions change.

```typescript
interface Migration {
  fromVersion: string;
  toVersion: string;
  migrate: (oldGraph: any) => GraphSnapshot;
}

const MIGRATIONS: Migration[] = [
  {
    fromVersion: "1.0.0",
    toVersion: "1.1.0",
    migrate: (oldGraph) => {
      // Example: Rename "Math.Plus" to "Math.Add"
      for (const node of oldGraph.nodes) {
        if (node.typeID.name === "Plus") {
          node.typeID.name = "Add";
        }
      }
      return oldGraph;
    }
  },
  {
    fromVersion: "1.1.0",
    toVersion: "2.0.0",
    migrate: (oldGraph) => {
      // Example: Add new required port with default value
      for (const node of oldGraph.nodes) {
        if (node.typeID.name === "Box") {
          node.inputValues.set("centerOrigin", true);
        }
      }
      return oldGraph;
    }
  }
];

class MigrationManager {
  migrateGraph(graph: any, targetVersion: string): GraphSnapshot {
    let currentVersion = graph.version;
    let migrated = graph;
    
    while (currentVersion !== targetVersion) {
      const migration = MIGRATIONS.find(m => m.fromVersion === currentVersion);
      if (!migration) {
        throw new Error(`No migration path from ${currentVersion} to ${targetVersion}`);
      }
      
      migrated = migration.migrate(migrated);
      currentVersion = migration.toVersion;
      
      logger.info("Applied migration", { from: migration.fromVersion, to: migration.toVersion });
    }
    
    return migrated;
  }
}
```

---

# PART V: IMPLEMENTATION ROADMAP

## 12. STABILIZATION PHASES

### PHASE 1: FOUNDATION (Week 1-2)

**Goals:**
- Implement core invariants
- Add invariant tests to test suite
- Set up logging infrastructure
- Implement command pattern enforcement

**Deliverables:**
1. Invariant test suite (all invariants testable)
2. Logger with structured JSON output
3. Command base class with snapshot support
4. Graph freeze mechanism during evaluation

**Acceptance Criteria:**
- All invariant tests pass
- No direct graph mutations (only through commands)
- Logs capture all events
- Undo/redo works for all commands

---

### PHASE 2: VALIDATION (Week 3-4)

**Goals:**
- Implement validation layer
- Add type checking at all boundaries
- Implement constraint enforcement
- Add parameter validation

**Deliverables:**
1. Edge creation validation
2. Type compatibility checker
3. Constraint enforcer
4. Schema validator for NodeTypes

**Acceptance Criteria:**
- Invalid edges cannot be created
- Type mismatches caught at authoring time
- Constraints enforced on all inputs
- Clear error messages for all validation failures

---

### PHASE 3: INSTRUMENTATION (Week 5-6)

**Goals:**
- Implement tracing and profiling
- Add debug overlays
- Implement replay capability
- Add performance monitoring

**Deliverables:**
1. Evaluation tracer
2. Render stats collector
3. Debug overlay system
4. Replay engine

**Acceptance Criteria:**
- Can trace every node evaluation
- Can replay user sessions
- Debug overlays show hit-testing and bounds
- Performance stats visible in UI

---

### PHASE 4: RECOVERY (Week 7-8)

**Goals:**
- Implement autosave
- Add safe mode
- Implement node isolation
- Add crash recovery

**Deliverables:**
1. Autosave manager
2. Safe mode manager
3. Node isolator
4. Crash recovery UI

**Acceptance Criteria:**
- Autosaves every minute
- Can restore from autosave after crash
- Safe mode disables heavy nodes
- Failing nodes isolated without crashing graph

---

## 13. SUCCESS METRICS

### 13.1 STABILITY METRICS

**Goal:** Zero unhandled exceptions during testing.

**Measurement:**
- Track exception count per day
- Track mean time between failures (MTBF)
- Track user-reported crash rate

**Success Criteria:**
- MTBF > 24 hours of continuous use
- Zero data loss events
- 100% of crashes result in autosave recovery

---

### 13.2 PERFORMANCE METRICS

**Goal:** Maintain responsiveness under load.

**Measurement:**
- Track FPS during heavy operations
- Track evaluation time for large graphs
- Track memory usage over time

**Success Criteria:**
- FPS > 30 for graphs with <1000 nodes
- Evaluation time < 5 seconds for graphs with <500 nodes
- Memory usage < 1GB for typical graphs

---

### 13.3 USER EXPERIENCE METRICS

**Goal:** Clear error messages and smooth recovery.

**Measurement:**
- Track error message comprehension (user testing)
- Track recovery success rate
- Track undo/redo usage

**Success Criteria:**
- 90% of errors include actionable suggestions
- 100% recovery from non-corrupted states
- Undo/redo works for all user actions

---

## CONCLUSION

This stabilization doctrine provides a comprehensive framework for hardening Roslyn/Numerica before intensive testing. Implementation should proceed in phases, with each phase building on the previous one's foundation.

The codex agent should begin with Phase 1 (Foundation) and work systematically through each phase, ensuring all acceptance criteria are met before proceeding.

**Next Steps for Codex Agent:**
1. Read and understand all ontological definitions
2. Implement invariant test suite
3. Set up logging infrastructure
4. Implement command pattern
5. Proceed through stabilization phases

**Questions for Clarification:**
- Are there existing patterns in the codebase that should be preserved?
- What is the current test framework (Jest, Mocha, etc.)?
- Are there specific user workflows that should be prioritized for testing?
- What is the current error handling approach?

This document should be treated as a living specification that evolves as implementation proceeds and new failure modes are discovered.
