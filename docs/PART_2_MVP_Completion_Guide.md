# ROSLYN/NUMERICA MVP COMPLETION GUIDE
## Final Polish & Interaction Integrity Specification

**Purpose:** This guide follows the Stabilization Doctrine and focuses on completing the MVP by ensuring all user interactions work flawlessly, the UI is polished, and the system is ready for real-world use.

**Audience:** Codex Agent (after completing the Stabilization Doctrine implementation)

**Scope:** This document covers the final 20% of work that transforms a stable system into a production-ready product: interaction polish, UI completeness, documentation, and deployment preparation.

---

## EXECUTIVE SUMMARY

After implementing the Stabilization Doctrine, the system will be robust and reliable. This guide addresses the remaining gaps between "stable" and "ready for users":

1. **Interaction Completeness:** Ensure every click, drag, keyboard shortcut, and hover interaction works as intended
2. **UI Polish:** Smooth animations, proper feedback, consistent styling, accessible design
3. **Feature Completeness:** Verify all advertised features actually work end-to-end
4. **Performance Tuning:** Optimize the critical path for real-world performance
5. **User Onboarding:** First-run experience, tutorials, help documentation
6. **Deployment Readiness:** Build optimization, error reporting, analytics

The MVP is considered complete when a non-technical user can successfully create, evaluate, and export a parametric design without encountering bugs, confusion, or frustration.

---

## TABLE OF CONTENTS

### PART I: INTERACTION INTEGRITY
1. Interaction Taxonomy (All User Actions)
2. Interaction Testing Protocol
3. Interaction Failure Remediation

### PART II: UI POLISH & CONSISTENCY
4. Visual Design System
5. Animation & Feedback Standards
6. Accessibility Requirements

### PART III: FEATURE COMPLETENESS
7. Feature Verification Checklist
8. End-to-End Workflow Testing
9. Cross-Browser Compatibility

### PART IV: PERFORMANCE OPTIMIZATION
10. Critical Path Analysis
11. Render Pipeline Optimization
12. Memory Management

### PART V: USER EXPERIENCE
13. First-Run Experience
14. In-App Help & Tutorials
15. Error Messages & Recovery Guidance

### PART VI: DEPLOYMENT PREPARATION
16. Build Optimization
17. Error Reporting Integration
18. Analytics & Telemetry

---

# PART I: INTERACTION INTEGRITY

## 1. INTERACTION TAXONOMY

This section catalogs every user interaction that must work correctly. The codex agent should test each interaction thoroughly and fix any issues.

---

### 1.1 MOUSE INTERACTIONS

**Category: Canvas Navigation**

1. **Pan Canvas**
   - Trigger: Middle mouse drag OR space + left mouse drag
   - Expected: Canvas translates smoothly in 2D
   - Edge cases: Dragging near canvas edge, rapid direction changes
   - Failure modes: Jittery movement, canvas jumps, infinite pan

2. **Zoom Canvas**
   - Trigger: Mouse wheel scroll
   - Expected: Canvas zooms toward mouse cursor position
   - Edge cases: Zoom at min/max limits, zoom on node vs empty space
   - Failure modes: Wrong zoom center, zoom inverted, excessive zoom

3. **Fit View**
   - Trigger: Home key OR double-click empty canvas
   - Expected: Canvas frames all nodes with padding
   - Edge cases: Empty graph, single node, very large graph
   - Failure modes: Wrong framing, infinite loop, ignores some nodes

**Category: Node Manipulation**

4. **Select Node (Single)**
   - Trigger: Left click on node
   - Expected: Node highlighted, selection state updated, properties panel shows node
   - Edge cases: Click on collapsed node, locked node, node in error state
   - Failure modes: Wrong node selected, multi-select instead of single, no visual feedback

5. **Select Nodes (Multiple)**
   - Trigger: Shift + left click OR drag selection box
   - Expected: All nodes in selection, primary selection indicated
   - Edge cases: Overlapping nodes, partially visible nodes, locked nodes
   - Failure modes: Missed nodes, ghost selections, selection box invisible

6. **Deselect All**
   - Trigger: Click empty canvas OR Escape key
   - Expected: All selections cleared, properties panel empty or default
   - Edge cases: Mid-drag, during parameter edit, with popup open
   - Failure modes: Selections persist, UI state desync

7. **Drag Node**
   - Trigger: Click + drag on node body
   - Expected: Node follows cursor, snaps to grid (if enabled), other nodes don't move
   - Edge cases: Drag locked node, drag while zoomed, drag outside canvas
   - Failure modes: Node jumps, wrong node moves, position goes to NaN

8. **Drag Multiple Nodes**
   - Trigger: Click + drag on any selected node
   - Expected: All selected nodes move together, relative positions preserved
   - Edge cases: Some nodes locked, nodes at canvas boundary
   - Failure modes: Nodes separate, selection breaks, positions desync

9. **Resize Node**
   - Trigger: Drag corner handle
   - Expected: Node resizes, maintains min/max constraints, ports adjust
   - Edge cases: Resize below minimum, aspect ratio lock
   - Failure modes: Inverted size, negative dimensions, ports misaligned

**Category: Edge Creation**

10. **Connect Ports**
    - Trigger: Click output port, drag to input port, release
    - Expected: Ghost edge follows cursor, turns green on valid drop, creates edge
    - Edge cases: Hover over incompatible port, release on empty space, create cycle
    - Failure modes: Edge connects wrong ports, ghost edge persists, no validation

11. **Disconnect Port**
    - Trigger: Right click edge, select "Disconnect" OR drag edge endpoint away
    - Expected: Edge deleted, target port clears value (uses default if available)
    - Edge cases: Edge to locked node, edge in middle of evaluation
    - Failure modes: Edge persists visually, graph state desync, downstream not invalidated

**Category: Context Menus**

12. **Right Click Node**
    - Trigger: Right click on node
    - Expected: Context menu appears with node-specific actions
    - Actions must include: Delete, Duplicate, Lock, Collapse, Change Color
    - Edge cases: Right click while dragging, on locked node, on solver node
    - Failure modes: Menu doesn't appear, wrong menu, actions don't execute

13. **Right Click Canvas**
    - Trigger: Right click on empty canvas
    - Expected: Context menu with canvas actions
    - Actions must include: Add Node (submenu), Paste, Select All, Deselect All
    - Edge cases: Right click after failed action, with clipboard empty
    - Failure modes: Menu position wrong, submenu doesn't open, paste fails

14. **Right Click Port**
    - Trigger: Right click on port
    - Expected: Port-specific menu
    - Actions must include: Reset to Default, Set Value (if input), Disconnect
    - Edge cases: Right click on connected vs disconnected port, on required port
    - Failure modes: Actions disabled incorrectly, value edit doesn't save

15. **Double-Right Click Node (Solver)**
    - Trigger: Right click twice rapidly on Biological Solver 2 or Chemistry Solver
    - Expected: Solver popup panel opens
    - Edge cases: Double click on non-solver node, during solver run
    - Failure modes: Popup doesn't open, multiple popups, canvas interaction broken

**Category: Parameter Editing**

16. **Edit Slider Value**
    - Trigger: Click slider, drag handle OR click value, type number
    - Expected: Value updates, constrained to min/max/step, downstream nodes invalidate
    - Edge cases: Edit while evaluating, invalid input (text), out-of-range value
    - Failure modes: Value doesn't apply, slider jumps, evaluation doesn't trigger

17. **Edit Text Field**
    - Trigger: Click field, type, press Enter or Tab
    - Expected: Value saves on Enter/Tab or blur, Escape cancels
    - Edge cases: Empty input, special characters, very long strings
    - Failure modes: Value doesn't save, editing breaks, cursor invisible

18. **Edit Dropdown**
    - Trigger: Click dropdown, select option
    - Expected: Value changes, dropdown closes, downstream invalidates
    - Edge cases: Dropdown at screen edge, long option lists
    - Failure modes: Selection doesn't apply, dropdown stays open, options truncated

**Category: Selection Box**

19. **Box Select Nodes**
    - Trigger: Click empty canvas, drag selection rectangle
    - Expected: Nodes within rectangle highlight progressively, finalize on release
    - Edge cases: Box select while zoomed, select overlapping nodes, select across screen edge
    - Failure modes: No visual box, wrong nodes selected, box doesn't clear

---

### 1.2 KEYBOARD INTERACTIONS

**Category: Editing Commands**

1. **Undo**
   - Trigger: Ctrl+Z (Cmd+Z on Mac)
   - Expected: Last command reversed, undo stack updated, UI syncs
   - Edge cases: Undo at stack bottom, undo during evaluation, undo after crash
   - Failure modes: Wrong action undone, graph corrupts, UI desync

2. **Redo**
   - Trigger: Ctrl+Y or Ctrl+Shift+Z (Cmd+Shift+Z on Mac)
   - Expected: Last undone command re-applied, redo stack updated
   - Edge cases: Redo at stack top, redo after new action (should clear stack)
   - Failure modes: Wrong action redone, redo stack doesn't clear

3. **Delete**
   - Trigger: Delete or Backspace key
   - Expected: Selected nodes/edges deleted, edges cascade, undo stack updated
   - Edge cases: Delete locked nodes, delete while editing text
   - Failure modes: Locked nodes deleted, edges not cascaded, undo broken

4. **Copy**
   - Trigger: Ctrl+C (Cmd+C on Mac)
   - Expected: Selected nodes copied to clipboard with relative positions
   - Edge cases: Copy with no selection, copy locked nodes, copy with edges
   - Failure modes: Clipboard empty, positions wrong, edges not included

5. **Paste**
   - Trigger: Ctrl+V (Cmd+V on Mac)
   - Expected: Clipboard nodes added at cursor or offset from originals, new UUIDs assigned
   - Edge cases: Paste with empty clipboard, paste incompatible graph version
   - Failure modes: Paste fails silently, nodes overlap originals, UUIDs collide

6. **Duplicate**
   - Trigger: Ctrl+D (Cmd+D on Mac)
   - Expected: Selected nodes duplicated with offset, edges within selection preserved
   - Edge cases: Duplicate with no selection, duplicate at canvas edge
   - Failure modes: No offset (overlap), edges not duplicated, selection breaks

7. **Select All**
   - Trigger: Ctrl+A (Cmd+A on Mac)
   - Expected: All nodes selected
   - Edge cases: Select all with locked nodes, select all during edit
   - Failure modes: Locked nodes selected, current edit loses focus

8. **Deselect All**
   - Trigger: Escape key
   - Expected: All selections cleared
   - Edge cases: Deselect during drag, during popup interaction
   - Failure modes: Selections persist, popup closes unintentionally

**Category: Navigation**

9. **Fit View**
   - Trigger: Home key
   - Expected: Canvas frames all nodes
   - (Same as mouse double-click)

10. **Reset Zoom**
    - Trigger: Ctrl+0 (Cmd+0 on Mac)
    - Expected: Canvas zoom returns to 100% (1:1 scale)
    - Edge cases: Reset while panning, with nodes off-screen
    - Failure modes: Zoom doesn't reset, canvas position wrong

**Category: Evaluation**

11. **Evaluate Graph**
    - Trigger: Ctrl+Enter (Cmd+Enter on Mac) OR F5
    - Expected: Full graph evaluation, progress shown, errors isolated
    - Edge cases: Evaluate during existing evaluation, with invalid graph
    - Failure modes: Multiple evaluations, UI freeze, silent failure

12. **Cancel Evaluation**
    - Trigger: Escape during evaluation
    - Expected: Evaluation stops, partial results preserved, graph returns to VALID state
    - Edge cases: Cancel heavy solver, cancel at end of evaluation
    - Failure modes: Evaluation continues, graph corrupts, UI stuck

**Category: Help**

13. **Show Help**
    - Trigger: F1 OR Ctrl+/
    - Expected: Help panel or modal opens with keyboard shortcuts
    - Edge cases: Help while popup open, help during drag
    - Failure modes: Help doesn't open, keyboard shortcuts don't match

14. **Search Nodes**
    - Trigger: Ctrl+K (Cmd+K on Mac)
    - Expected: Node search/command palette opens
    - Edge cases: Search while editing, with no nodes registered
    - Failure modes: Search doesn't open, results incomplete

---

### 1.3 HOVER INTERACTIONS

**Category: Tooltips**

1. **Hover Node**
   - Expected: Tooltip shows node name, type, optional description after 500ms delay
   - Edge cases: Hover during drag, on collapsed node, on error node
   - Failure modes: Tooltip doesn't show, wrong content, tooltip persists

2. **Hover Port**
   - Expected: Tooltip shows port name, type, current value, connection status after 300ms
   - Edge cases: Hover during edge creation, on required port with no value
   - Failure modes: Tooltip shows wrong type, value not updated

3. **Hover Edge**
   - Expected: Edge highlights, tooltip shows source → target, data type
   - Edge cases: Hover on curved edge, on edge with validation error
   - Failure modes: No highlight, wrong edge highlighted, tooltip position wrong

**Category: Visual Feedback**

4. **Hover Node (Highlight)**
   - Expected: Node outline glows or thickens
   - Edge cases: Hover while selected, hover locked node
   - Failure modes: No highlight, highlight persists after unhover

5. **Hover Port (Connection Preview)**
   - Expected: Compatible ports on other nodes highlight
   - Trigger: Hover over port while dragging edge from another port
   - Edge cases: No compatible ports, many compatible ports
   - Failure modes: Wrong ports highlight, performance degrades

---

### 1.4 DRAG-AND-DROP INTERACTIONS

**Category: Node Addition**

1. **Drag Node from Palette**
   - Trigger: Drag node from side panel/palette onto canvas
   - Expected: Ghost node follows cursor, adds on drop, positions at cursor
   - Edge cases: Drop on existing node, drop outside canvas
   - Failure modes: Node doesn't add, position wrong, ghost persists

2. **Drop File onto Canvas**
   - Trigger: Drag .json graph file from OS onto canvas
   - Expected: File loads, confirmation dialog if current graph unsaved
   - Edge cases: Drop invalid file, drop while editing
   - Failure modes: File doesn't load, graph overwrites without confirmation

---

### 1.5 TOUCH INTERACTIONS (IF APPLICABLE)

If the system supports touch devices (tablets):

1. **Two-Finger Pan**
   - Expected: Canvas pans
   
2. **Pinch Zoom**
   - Expected: Canvas zooms toward gesture center

3. **Tap Node**
   - Expected: Selects node

4. **Long Press**
   - Expected: Opens context menu

---

## 2. INTERACTION TESTING PROTOCOL

### 2.1 MANUAL TEST SCRIPT

The codex agent should execute this test script and verify all interactions work correctly.

```
=== INTERACTION TEST SCRIPT ===

Setup: Empty graph

TEST 1: Basic Node Creation & Selection
1. Right click canvas → Add Node → Math → Number
   ✓ Node appears at click position
   ✓ Node is auto-selected
2. Press Escape
   ✓ Selection clears
3. Click node
   ✓ Node re-selects
   ✓ Properties panel shows node parameters

TEST 2: Multi-Node Manipulation
1. Right click canvas → Add Node → Math → Add
2. Right click canvas → Add Node → Math → Multiply
3. Shift+Click both Math nodes
   ✓ Both nodes selected
4. Drag any selected node
   ✓ Both nodes move together
   ✓ Relative positions preserved
5. Ctrl+D (duplicate)
   ✓ Two new nodes appear offset from originals
   ✓ New nodes are selected

TEST 3: Edge Creation
1. Click Number node output port, drag to Add node input A
   ✓ Ghost edge follows cursor
   ✓ Edge turns green when over compatible port
   ✓ Edge created on drop
2. Try to create edge from Add output to Number input
   ✓ Edge creation rejected (would create cycle)
   ✓ User sees error message

TEST 4: Evaluation
1. Set Number node value to 5
2. Connect Number to Add inputs A and B
3. Press Ctrl+Enter to evaluate
   ✓ Evaluation runs
   ✓ Add node output shows 10
4. Change Number value to 10
   ✓ Add node marked as STALE
5. Evaluate again
   ✓ Add node output shows 20

TEST 5: Undo/Redo
1. Note graph state (4 nodes, 2 edges)
2. Delete Add node
   ✓ Node and edges deleted
3. Ctrl+Z (undo)
   ✓ Node and edges restored exactly
4. Ctrl+Y (redo)
   ✓ Node and edges deleted again

TEST 6: Canvas Navigation
1. Create 10 nodes spread across canvas
2. Zoom in using mouse wheel
   ✓ Canvas zooms toward cursor
3. Pan using middle mouse drag
   ✓ Canvas pans smoothly
4. Press Home key
   ✓ All nodes fit in view with padding

TEST 7: Solver Popup
1. Add Biological Solver 2 node
2. Double-right-click the solver node
   ✓ Popup opens with Setup page
3. Configure parameters (population: 20, generations: 10)
4. Click Initialize
   ✓ Popup switches to Simulation page
   ✓ Initial population created
5. Close popup with X button
   ✓ Popup closes
   ✓ Canvas interactions still work

TEST 8: Context Menus
1. Right click node
   ✓ Menu appears with Delete, Duplicate, Lock, etc.
2. Click Lock
   ✓ Node locks (indicated visually)
3. Try to drag locked node
   ✓ Drag rejected
4. Right click canvas
   ✓ Canvas menu appears
5. Click Add Node → Geometry → Box
   ✓ Box node added

TEST 9: Parameter Editing
1. Add Slider node
2. Click slider value, type "50", press Enter
   ✓ Value updates to 50
3. Drag slider handle to 75
   ✓ Value updates to 75
   ✓ Handle position matches value
4. Type "200" (above max 100)
   ✓ Value clamps to 100
   ✓ Error shown or value auto-corrected

TEST 10: Error Handling
1. Create Math.Divide node
2. Set denominator to 0
3. Evaluate
   ✓ Node enters ERROR state
   ✓ Error message shown on node
   ✓ Graph doesn't crash
   ✓ Other nodes unaffected

=== END TEST SCRIPT ===
```

### 2.2 AUTOMATED INTERACTION TESTS

While manual testing is essential, automated tests should cover common interaction patterns:

```typescript
describe("Interaction Integration Tests", () => {
  it("should handle node creation and selection", async () => {
    const canvas = new Canvas();
    
    // Simulate right click
    const menuPos = { x: 100, y: 100 };
    const menu = canvas.openContextMenu(menuPos);
    
    // Select "Add Node → Math → Number"
    menu.selectOption(["Add Node", "Math", "Number"]);
    
    // Verify node created
    assert.equal(canvas.graph.nodes.size, 1);
    const node = Array.from(canvas.graph.nodes.values())[0];
    assert.equal(node.id.typeID.name, "Number");
    assert.deepEqual(node.position, menuPos);
    
    // Verify node selected
    assert.isTrue(canvas.selection.nodes.has(node.id));
  });
  
  it("should handle edge creation with validation", async () => {
    const canvas = new Canvas();
    const A = canvas.addNodeDirect("Math.Number", { x: 0, y: 0 });
    const B = canvas.addNodeDirect("Math.Add", { x: 200, y: 0 });
    
    // Start edge creation
    const outputPort = A.outputPorts.get("output");
    canvas.startEdgeCreation(outputPort);
    
    // Move cursor to input port
    const inputPort = B.inputPorts.get("inputA");
    canvas.updateEdgeGhost(inputPort.position);
    
    // Verify ghost edge is valid (green)
    assert.isTrue(canvas.edgeGhost.isValid);
    
    // Drop edge
    canvas.completeEdgeCreation(inputPort);
    
    // Verify edge created
    assert.equal(canvas.graph.edges.size, 1);
  });
  
  it("should prevent cycle creation", async () => {
    const canvas = new Canvas();
    const A = canvas.addNodeDirect("Math.Add", { x: 0, y: 0 });
    const B = canvas.addNodeDirect("Math.Multiply", { x: 200, y: 0 });
    
    // Create edge A → B
    canvas.createEdgeDirect(A.outputs[0], B.inputs[0]);
    
    // Try to create edge B → A (would create cycle)
    assert.throws(() => {
      canvas.createEdgeDirect(B.outputs[0], A.inputs[0]);
    }, /cycle/);
    
    // Verify only one edge exists
    assert.equal(canvas.graph.edges.size, 1);
  });
});
```

---

## 3. INTERACTION FAILURE REMEDIATION

### 3.1 COMMON INTERACTION BUGS & FIXES

**Bug: Node Drag Jumps to Wrong Position**

Symptom: When dragging a node, it suddenly jumps to a different position.

Root Cause: Mouse offset not calculated correctly (using global instead of local coordinates).

Fix:
```typescript
class NodeDragHandler {
  private dragOffset: { x: number; y: number } | null = null;
  
  onMouseDown(event: MouseEvent, node: NodeInstance): void {
    // Calculate offset from mouse to node top-left
    const nodePos = node.position;
    const mousePos = this.canvas.screenToWorld(event.clientX, event.clientY);
    
    this.dragOffset = {
      x: mousePos.x - nodePos.x,
      y: mousePos.y - nodePos.y
    };
  }
  
  onMouseMove(event: MouseEvent): void {
    if (!this.dragOffset) return;
    
    const mousePos = this.canvas.screenToWorld(event.clientX, event.clientY);
    
    // Apply offset to maintain grab point
    const newPos = {
      x: mousePos.x - this.dragOffset.x,
      y: mousePos.y - this.dragOffset.y
    };
    
    this.moveNodeTo(newPos);
  }
}
```

---

**Bug: Ghost Edge Persists After Failed Connection**

Symptom: After attempting to create an invalid edge, the ghost edge remains visible.

Root Cause: Edge creation handler doesn't clean up on validation failure.

Fix:
```typescript
class EdgeCreationHandler {
  completeEdgeCreation(targetPort: Port): void {
    try {
      // Validate
      const validation = validateEdgeCreation(this.sourcePort, targetPort, this.graph);
      
      if (!validation.valid) {
        this.showError(validation.errors[0]);
        return; // Early return WITHOUT cleanup
      }
      
      // Create edge
      this.graph.addEdge(this.sourcePort, targetPort);
      
    } finally {
      // ALWAYS clean up ghost edge
      this.clearGhostEdge();
      this.sourcePort = null;
    }
  }
}
```

---

**Bug: Context Menu Appears at Wrong Position**

Symptom: Right-click menu appears far from cursor, especially when zoomed or panned.

Root Cause: Menu position uses screen coordinates instead of accounting for canvas transform.

Fix:
```typescript
class ContextMenuManager {
  showMenu(event: MouseEvent, options: MenuOption[]): void {
    const menu = document.createElement("div");
    menu.className = "context-menu";
    
    // Position menu at cursor in SCREEN coordinates (not world)
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    
    // Adjust if menu would go off-screen
    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    
    if (rect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - rect.width}px`;
    }
    
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - rect.height}px`;
    }
  }
}
```

---

**Bug: Undo/Redo Breaks After Certain Actions**

Symptom: Undo works for most actions but breaks after specific operations (e.g., solver run).

Root Cause: Some operations mutate state without going through command system.

Fix:
```typescript
// BAD: Direct mutation
function runSolver(solver: SolverState): void {
  solver.iteration = 0;
  solver.status = "running";
  // ... solver logic
}

// GOOD: Use command
class RunSolverCommand implements Command {
  beforeState: SolverSnapshot;
  afterState: SolverSnapshot;
  
  execute(): void {
    this.beforeState = captureSolverState(this.solver);
    
    // Run solver
    runSolverInternal(this.solver);
    
    this.afterState = captureSolverState(this.solver);
  }
  
  undo(): void {
    restoreSolverState(this.solver, this.beforeState);
  }
  
  redo(): void {
    restoreSolverState(this.solver, this.afterState);
  }
}
```

---

**Bug: Slider Jumps When Clicking**

Symptom: Clicking a slider handle causes the value to jump to a different position.

Root Cause: Click event triggers both "set value at click position" and "start drag" handlers.

Fix:
```typescript
class SliderWidget {
  onMouseDown(event: MouseEvent): void {
    const clickX = event.offsetX;
    const sliderWidth = this.element.offsetWidth;
    const handleWidth = this.handle.offsetWidth;
    
    // Check if click is on handle
    const handleLeft = (this.value - this.min) / (this.max - this.min) * sliderWidth;
    const clickOnHandle = 
      clickX >= handleLeft - handleWidth / 2 &&
      clickX <= handleLeft + handleWidth / 2;
    
    if (clickOnHandle) {
      // Start drag (don't update value)
      this.startDrag(event);
    } else {
      // Click on track: set value to click position
      const newValue = this.min + (clickX / sliderWidth) * (this.max - this.min);
      this.setValue(newValue);
    }
  }
}
```

---

### 3.2 INTERACTION TESTING CHECKLIST

Before marking interactions as complete, verify:

**Mouse Interactions:**
- [ ] All mouse buttons work correctly (left, middle, right)
- [ ] Drag operations start on mouse down, update on move, end on mouse up
- [ ] Mouse cursor updates correctly (pointer, grab, crosshair, etc.)
- [ ] Hover states apply and remove correctly
- [ ] Double-click timing is appropriate (not too sensitive)

**Keyboard Interactions:**
- [ ] All documented shortcuts work
- [ ] Shortcuts don't conflict with browser defaults
- [ ] Text input fields capture keys correctly (don't trigger shortcuts)
- [ ] Modifier keys work correctly (Ctrl, Shift, Alt)
- [ ] Mac vs Windows shortcuts handled (Cmd vs Ctrl)

**Touch Interactions (if applicable):**
- [ ] Touch events don't trigger mouse events (prevent double-handling)
- [ ] Gestures work smoothly (pinch zoom, two-finger pan)
- [ ] Tap targets are large enough (min 44x44px)

**Canvas Interactions:**
- [ ] Pan and zoom work correctly together
- [ ] Zoom center matches cursor/gesture position
- [ ] Canvas bounds prevent infinite panning
- [ ] Grid snapping works if enabled

**Node Interactions:**
- [ ] Nodes can be created, moved, resized, deleted
- [ ] Locked nodes reject mutations
- [ ] Error nodes show clear indicators
- [ ] Solver nodes open popups correctly

**Edge Interactions:**
- [ ] Edges can be created and deleted
- [ ] Invalid connections prevented with feedback
- [ ] Edge routing updates when nodes move
- [ ] Ghost edges clean up properly

**Menu Interactions:**
- [ ] Context menus appear at correct positions
- [ ] Submenus open correctly
- [ ] Menus close on outside click or Escape
- [ ] Menu actions execute correctly

---

# PART II: UI POLISH & CONSISTENCY

## 4. VISUAL DESIGN SYSTEM

### 4.1 COLOR PALETTE

Define a consistent color system for the entire application.

```typescript
const DESIGN_TOKENS = {
  colors: {
    // Primary colors
    primary: "#3B82F6",      // Blue
    primaryHover: "#2563EB",
    primaryActive: "#1D4ED8",
    
    // Secondary colors
    secondary: "#64748B",
    secondaryHover: "#475569",
    
    // Status colors
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
    
    // Neutrals
    background: "#FFFFFF",
    backgroundSecondary: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceHover: "#F1F5F9",
    
    border: "#E2E8F0",
    borderStrong: "#CBD5E1",
    
    text: "#0F172A",
    textSecondary: "#64748B",
    textDisabled: "#CBD5E1",
    
    // Canvas
    canvasBackground: "#F8FAFC",
    canvasGrid: "#E2E8F0",
    
    // Nodes
    nodeBackground: "#FFFFFF",
    nodeBorder: "#E2E8F0",
    nodeSelected: "#3B82F6",
    nodeHover: "#F1F5F9",
    nodeError: "#FEE2E2",
    nodeLocked: "#F1F5F9",
    
    // Edges
    edgeDefault: "#94A3B8",
    edgeSelected: "#3B82F6",
    edgeInvalid: "#EF4444",
    edgeGhost: "#3B82F6",
    
    // Ports
    portDefault: "#94A3B8",
    portConnected: "#3B82F6",
    portCompatible: "#10B981",
    portIncompatible: "#EF4444"
  },
  
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)"
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    "2xl": 48
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999
  },
  
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      "2xl": 24
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  }
};
```

### 4.2 COMPONENT STYLING STANDARDS

**Buttons:**
```css
.button {
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 150ms ease;
}

.button-primary {
  background: #3B82F6;
  color: white;
  border: none;
}

.button-primary:hover {
  background: #2563EB;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.25);
}

.button-primary:active {
  background: #1D4ED8;
  transform: translateY(0);
}

.button-secondary {
  background: white;
  color: #64748B;
  border: 1px solid #E2E8F0;
}

.button-secondary:hover {
  border-color: #CBD5E1;
  background: #F8FAFC;
}
```

**Input Fields:**
```css
.input {
  padding: 8px 12px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 150ms ease;
}

.input:hover {
  border-color: #CBD5E1;
}

.input:focus {
  outline: none;
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input:disabled {
  background: #F8FAFC;
  color: #CBD5E1;
  cursor: not-allowed;
}

.input.error {
  border-color: #EF4444;
}

.input.error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
```

**Tooltips:**
```css
.tooltip {
  position: absolute;
  background: #1E293B;
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  pointer-events: none;
  z-index: 10000;
  
  /* Arrow */
  &::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: #1E293B transparent transparent transparent;
  }
}
```

---

## 5. ANIMATION & FEEDBACK STANDARDS

### 5.1 ANIMATION PRINCIPLES

All animations should follow these principles:

1. **Purpose**: Every animation should have a clear purpose (indicate state change, guide attention, provide feedback)
2. **Duration**: Keep animations short (150-300ms for most transitions)
3. **Easing**: Use natural easing curves (ease-out for entrances, ease-in for exits)
4. **Performance**: Animate only transform and opacity (avoid layout changes)
5. **Accessibility**: Respect `prefers-reduced-motion` media query

### 5.2 STANDARD ANIMATIONS

**Node Selection:**
```css
.node {
  transition: box-shadow 150ms ease, transform 150ms ease;
}

.node:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.node.selected {
  box-shadow: 0 0 0 2px #3B82F6, 0 4px 12px rgba(59, 130, 246, 0.25);
}
```

**Edge Creation Ghost:**
```css
.edge-ghost {
  stroke-dasharray: 5, 5;
  animation: dash 1s linear infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: -10;
  }
}
```

**Modal/Popup Entrance:**
```css
.modal-overlay {
  background: rgba(0, 0, 0, 0);
  transition: background 200ms ease;
}

.modal-overlay.visible {
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
  transition: opacity 200ms ease, transform 200ms ease;
}

.modal-content.visible {
  opacity: 1;
  transform: scale(1) translateY(0);
}
```

**Loading Spinner:**
```css
.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #E2E8F0;
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: spin 800ms linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

**Success Checkmark:**
```css
.success-icon {
  stroke-dasharray: 50;
  stroke-dashoffset: 50;
  animation: draw 400ms ease forwards;
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}
```

### 5.3 FEEDBACK PATTERNS

**Button Click Feedback:**
```typescript
class Button {
  onClick(event: MouseEvent): void {
    // Add active state
    this.element.classList.add("active");
    
    // Execute action
    this.action();
    
    // Remove active state after animation
    setTimeout(() => {
      this.element.classList.remove("active");
    }, 150);
  }
}
```

**Form Submission Feedback:**
```typescript
async function submitForm(data: FormData): Promise<void> {
  const submitButton = document.querySelector(".submit-button");
  
  // Show loading state
  submitButton.disabled = true;
  submitButton.innerHTML = '<span class="spinner"></span> Submitting...';
  
  try {
    await api.submit(data);
    
    // Show success
    submitButton.innerHTML = '<span class="success-icon">✓</span> Saved!';
    submitButton.classList.add("success");
    
    setTimeout(() => {
      submitButton.innerHTML = 'Submit';
      submitButton.classList.remove("success");
      submitButton.disabled = false;
    }, 2000);
    
  } catch (error) {
    // Show error
    submitButton.innerHTML = 'Submit';
    submitButton.classList.add("error");
    submitButton.disabled = false;
    
    showErrorMessage(error.message);
  }
}
```

**Evaluation Progress Feedback:**
```typescript
class EvaluationProgressBar {
  update(current: number, total: number): void {
    const percent = (current / total) * 100;
    
    // Update progress bar
    this.bar.style.width = `${percent}%`;
    
    // Update text
    this.text.textContent = `Evaluating ${current} / ${total} nodes`;
    
    // Pulse effect on completion
    if (current === total) {
      this.bar.classList.add("complete");
      setTimeout(() => {
        this.hide();
      }, 1000);
    }
  }
}
```

---

## 6. ACCESSIBILITY REQUIREMENTS

### 6.1 KEYBOARD NAVIGATION

**All interactive elements must be keyboard accessible:**

```typescript
class AccessibleCanvas {
  setupKeyboardNav(): void {
    // Tab through nodes
    this.canvas.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        this.focusNextNode(e.shiftKey);
      }
    });
    
    // Enter to activate focused node
    if (e.key === "Enter" && this.focusedNode) {
      this.selectNode(this.focusedNode);
    }
    
    // Arrow keys to move focused node
    if (this.focusedNode && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      this.moveNode(this.focusedNode, e.key);
    }
  }
}
```

**Focus indicators must be visible:**

```css
.node:focus {
  outline: 2px solid #3B82F6;
  outline-offset: 4px;
}

.button:focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
}
```

### 6.2 ARIA LABELS

**All UI elements must have proper labels:**

```html
<button aria-label="Delete selected nodes" class="delete-button">
  <svg><!-- trash icon --></svg>
</button>

<div role="slider" 
     aria-label="Width" 
     aria-valuemin="0" 
     aria-valuemax="100" 
     aria-valuenow="50">
</div>

<div role="alert" aria-live="polite" class="error-message">
  Node evaluation failed: Division by zero
</div>
```

### 6.3 SCREEN READER SUPPORT

**Announce important state changes:**

```typescript
class Announcer {
  announce(message: string, priority: "polite" | "assertive" = "polite"): void {
    const announcement = document.createElement("div");
    announcement.setAttribute("role", "alert");
    announcement.setAttribute("aria-live", priority);
    announcement.classList.add("sr-only");
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}

// Usage
announcer.announce("Node added to graph");
announcer.announce("Evaluation complete: 10 nodes evaluated");
announcer.announce("Error: Cannot create cycle", "assertive");
```

### 6.4 REDUCED MOTION

**Respect user preferences:**

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 6.5 COLOR CONTRAST

**All text must meet WCAG AA standards (4.5:1 contrast ratio):**

- Text on white background: Minimum #595959
- Small text on colored backgrounds: Verify with contrast checker
- Icons and UI elements: Minimum 3:1 contrast ratio

---

# PART III: FEATURE COMPLETENESS

## 7. FEATURE VERIFICATION CHECKLIST

This checklist ensures every advertised feature actually works end-to-end.

### 7.1 CORE FEATURES

**Graph Authoring:**
- [ ] Create nodes from palette or context menu
- [ ] Delete nodes (individual and multi-select)
- [ ] Move nodes (drag or arrow keys)
- [ ] Resize nodes (if applicable)
- [ ] Connect edges between compatible ports
- [ ] Disconnect edges
- [ ] Undo/redo all graph operations
- [ ] Copy/paste nodes (within graph)
- [ ] Duplicate selected nodes
- [ ] Group/ungroup nodes (if applicable)
- [ ] Lock/unlock nodes
- [ ] Collapse/expand nodes (if applicable)

**Evaluation:**
- [ ] Evaluate full graph (Ctrl+Enter)
- [ ] Incremental evaluation (only dirty nodes)
- [ ] Evaluation order respects dependencies (topological sort)
- [ ] Errors isolated to failing nodes
- [ ] Evaluation progress shown
- [ ] Cancel evaluation mid-run (Escape)
- [ ] Cache reuses unchanged results

**Canvas Navigation:**
- [ ] Pan canvas (middle mouse or space+drag)
- [ ] Zoom canvas (mouse wheel)
- [ ] Fit view (Home key or double-click)
- [ ] Reset zoom (Ctrl+0)
- [ ] Grid snapping (if enabled)
- [ ] Minimap (if applicable)

**Selection:**
- [ ] Single-select nodes (click)
- [ ] Multi-select nodes (Shift+click or box select)
- [ ] Deselect all (Escape or click canvas)
- [ ] Select all (Ctrl+A)
- [ ] Selection box visual feedback

**File Operations:**
- [ ] Save graph to file (.json)
- [ ] Load graph from file
- [ ] Autosave (every minute)
- [ ] Export geometry (if applicable)
- [ ] Import/export as various formats

---

### 7.2 NODE-SPECIFIC FEATURES

**Slider Node:**
- [ ] Drag slider handle to change value
- [ ] Click slider track to jump to value
- [ ] Type value directly into text field
- [ ] Value respects min/max/step constraints
- [ ] Default value applied on creation
- [ ] Value persists on save/load

**Biological Solver 2:**
- [ ] Connects to Genome Collector, Geometry Phenotype, Performs Fitness
- [ ] Double-right-click opens popup
- [ ] Setup page configures all parameters
- [ ] Initialize creates population
- [ ] Simulation page shows convergence chart
- [ ] Run controls work (next gen, N gens, pause, stop)
- [ ] Outputs page shows gallery
- [ ] Export PNGs works (best, gen bests, selected)
- [ ] Solver runs in Web Worker (non-blocking)
- [ ] Cancel works at any iteration
- [ ] Results output to ports

**Chemistry Solver (Ἐπιλύτης Χημείας):**
- [ ] Connects to DOMAIN, MATERIALS, SEEDS, ΤΕΛΟΙ, BUDGET
- [ ] Material assignment via right-click port
- [ ] Solver runs particles/field simulation
- [ ] Outputs material particles, field, geometry preview
- [ ] Ontologize (bake) works
- [ ] Convergence tracked in history output
- [ ] Solver respects budget constraints
- [ ] Iteration-based (not "evolution")

**Geometry Nodes (Box, Sphere, etc.):**
- [ ] Parameters control geometry shape
- [ ] Geometry outputs to render pipeline
- [ ] Geometry validates (no NaN vertices)
- [ ] Large geometry warns or simplifies
- [ ] Geometry serializes correctly

---

### 7.3 ADVANCED FEATURES

**Node Search/Command Palette:**
- [ ] Opens with Ctrl+K
- [ ] Searches all registered nodes
- [ ] Fuzzy matching works
- [ ] Selecting result adds node at cursor
- [ ] Closes on Escape or outside click

**Context Menus:**
- [ ] Right-click node shows node menu
- [ ] Right-click canvas shows canvas menu
- [ ] Right-click port shows port menu
- [ ] Submenus work correctly
- [ ] Menu actions execute properly
- [ ] Menus close after selection

**Solver Popups:**
- [ ] Biological Solver 2 popup (3 pages)
- [ ] Chemistry Solver popup (if applicable)
- [ ] Popups are modal (block canvas interaction)
- [ ] Popups are resizable/draggable (if desired)
- [ ] Close button works
- [ ] Popup state persists during session

**Debug Tools:**
- [ ] Toggle hit-test overlay (Ctrl+Shift+H)
- [ ] Toggle bounds overlay (Ctrl+Shift+B)
- [ ] Toggle handle overlay (Ctrl+Shift+G)
- [ ] Performance stats overlay (if applicable)
- [ ] Evaluation trace viewer

---

## 8. END-TO-END WORKFLOW TESTING

### 8.1 COMPLETE USER JOURNEYS

**Journey 1: Create Simple Parametric Box**

1. User opens application
2. Adds 3 Slider nodes (width, height, depth)
3. Adds Box geometry node
4. Connects sliders to box inputs
5. Adjusts sliders
6. Evaluates graph
7. Sees box render in 3D view
8. Exports geometry as .obj file
9. Saves graph as .json

**Expected:** Every step works without errors, final .obj file valid.

---

**Journey 2: Run Biological Evolution**

1. User creates 3 sliders (gene parameters)
2. Adds Genome Collector, connects sliders
3. Creates parametric geometry
4. Adds Geometry Phenotype, connects geometry
5. Adds metric nodes (area, volume)
6. Adds Performs Fitness, connects metrics, sets max/min
7. Adds Biological Solver 2, connects all inputs
8. Double-right-clicks solver to open popup
9. Configures: 20 population, 10 generations, tournament selection
10. Initializes solver
11. Runs 10 generations
12. Views convergence chart
13. Browses gallery on Outputs page
14. Exports best individual PNG
15. Applies winner genome to canvas
16. Sees geometry update

**Expected:** Solver completes without crashes, PNG export works, geometry updates correctly.

---

**Journey 3: Chemistry Solver Workflow**

1. User creates Domain geometry (box)
2. Creates material geometries (steel beam, ceramic facade, glass window)
3. Adds Chemistry Solver
4. Right-clicks MATERIALS port, assigns materials to geometries
5. Adds Goal nodes (Stiffness, Blending, Transparency)
6. Connects goals to solver
7. Sets budget (10k particles, 64³ field)
8. Runs solver for 100 iterations
9. Views particle distribution
10. Ontologizes (bakes) to high resolution
11. Exports graded mesh to Roslyn

**Expected:** Material assignment works, solver runs, geometry extraction produces valid mesh.

---

### 8.2 ERROR HANDLING WORKFLOWS

**Journey 4: Recover from Evaluation Error**

1. User creates Math.Divide node
2. Sets denominator to 0
3. Evaluates graph
4. Node enters ERROR state with message: "Division by zero"
5. User hovers node, sees full error details
6. User changes denominator to 2
7. Re-evaluates
8. Node clears error, evaluates successfully

**Expected:** Error clearly displayed, downstream nodes not evaluated, graph doesn't crash, recovery works.

---

**Journey 5: Recover from Crash**

1. User works on complex graph for 30 minutes
2. Browser tab crashes (simulated)
3. User reopens application
4. Sees "Recover from crash?" dialog
5. Clicks "Recover"
6. Graph restores to last autosave (1 minute ago)
7. User continues working
8. Manually saves graph

**Expected:** Autosave restores graph, minimal work lost, no data corruption.

---

## 9. CROSS-BROWSER COMPATIBILITY

### 9.1 SUPPORTED BROWSERS

The application must work correctly on:

- **Chrome/Edge:** Version 100+
- **Firefox:** Version 100+
- **Safari:** Version 15+

### 9.2 BROWSER-SPECIFIC ISSUES TO TEST

**Keyboard Shortcuts:**
- [ ] Cmd vs Ctrl modifier on Mac
- [ ] Keyboard event handling differs (keyCode vs key)

**Canvas Rendering:**
- [ ] WebGL context creation
- [ ] Shader compatibility
- [ ] Performance differences

**File Operations:**
- [ ] File download/upload APIs
- [ ] Drag-and-drop from OS

**Context Menus:**
- [ ] Right-click event handling
- [ ] Menu positioning on different zoom levels

**Clipboard:**
- [ ] Copy/paste between graphs
- [ ] Clipboard API availability

---

# PART IV: PERFORMANCE OPTIMIZATION

## 10. CRITICAL PATH ANALYSIS

### 10.1 IDENTIFY BOTTLENECKS

Use browser profiling tools to find performance bottlenecks:

```typescript
class PerformanceProfiler {
  profile(label: string, fn: () => void): void {
    performance.mark(`${label}-start`);
    fn();
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    
    const measure = performance.getEntriesByName(label)[0];
    if (measure.duration > 16) { // 60 FPS = 16ms frame budget
      logger.warn(`Slow operation: ${label} took ${measure.duration.toFixed(2)}ms`);
    }
  }
}

// Usage
profiler.profile("Graph Evaluation", () => {
  evaluateGraph(graph);
});

profiler.profile("Render Frame", () => {
  renderer.render(scene, camera);
});
```

### 10.2 OPTIMIZE HOT PATHS

**Graph Topological Sort:**

Before:
```typescript
function topologicalSort(graph: Graph): NodeInstanceID[] {
  // Naive implementation: O(V + E) but with high constant factor
  const visited = new Set();
  const stack = [];
  
  for (const node of graph.nodes.values()) {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  }
  
  return stack.reverse();
}
```

After (with memoization):
```typescript
class TopologicalSortCache {
  private cache: NodeInstanceID[] | null = null;
  private graphVersion: number = -1;
  
  get(graph: Graph): NodeInstanceID[] {
    // Return cached result if graph unchanged
    if (this.cache && this.graphVersion === graph.id.version) {
      return this.cache;
    }
    
    // Recompute
    this.cache = topologicalSortImpl(graph);
    this.graphVersion = graph.id.version;
    
    return this.cache;
  }
  
  invalidate(): void {
    this.cache = null;
  }
}
```

**Render Loop:**

Before:
```typescript
function renderFrame(): void {
  // Rebuild entire scene every frame
  scene.clear();
  for (const node of graph.nodes.values()) {
    scene.add(createNodeMesh(node));
  }
  for (const edge of graph.edges.values()) {
    scene.add(createEdgeCurve(edge));
  }
  
  renderer.render(scene, camera);
  requestAnimationFrame(renderFrame);
}
```

After (incremental updates):
```typescript
function renderFrame(): void {
  // Only update changed elements
  for (const node of dirtyNodes) {
    updateNodeMesh(node);
  }
  for (const edge of dirtyEdges) {
    updateEdgeCurve(edge);
  }
  
  dirtyNodes.clear();
  dirtyEdges.clear();
  
  renderer.render(scene, camera);
  requestAnimationFrame(renderFrame);
}
```

---

## 11. RENDER PIPELINE OPTIMIZATION

### 11.1 BATCH RENDERING

Group nodes by material for batch rendering:

```typescript
class BatchRenderer {
  private batches: Map<Material, Batch> = new Map();
  
  addNode(node: NodeInstance, geometry: Geometry): void {
    const material = this.getMaterial(node);
    
    if (!this.batches.has(material)) {
      this.batches.set(material, new Batch(material));
    }
    
    const batch = this.batches.get(material);
    batch.add(geometry, node.transform);
  }
  
  render(): void {
    for (const batch of this.batches.values()) {
      batch.draw();
    }
  }
}
```

### 11.2 LEVEL-OF-DETAIL (LOD)

Simplify geometry based on camera distance:

```typescript
class LODManager {
  private lodLevels = [
    { distance: 0, maxVertices: 100000 },
    { distance: 100, maxVertices: 10000 },
    { distance: 500, maxVertices: 1000 },
    { distance: 1000, maxVertices: 100 }
  ];
  
  getGeometry(mesh: Mesh, cameraDistance: number): Geometry {
    for (const level of this.lodLevels) {
      if (cameraDistance <= level.distance) {
        if (mesh.vertexCount <= level.maxVertices) {
          return mesh.geometry; // Original is fine
        } else {
          return this.simplify(mesh, level.maxVertices);
        }
      }
    }
    
    // Very far: use bbox
    return this.createBoundingBox(mesh);
  }
}
```

### 11.3 FRUSTUM CULLING

Don't render objects outside camera view:

```typescript
class FrustumCuller {
  cull(primitives: RenderPrimitive[], camera: Camera): RenderPrimitive[] {
    const frustum = camera.frustum;
    
    return primitives.filter(primitive => {
      if (!primitive.visibility.frustumCulled) return true; // Always visible
      
      const bounds = computeBounds(primitive);
      return frustum.intersects(bounds);
    });
  }
}
```

---

## 12. MEMORY MANAGEMENT

### 12.1 RESOURCE CLEANUP

Ensure WebGL resources are freed:

```typescript
class GeometryManager {
  private buffers: Map<string, WebGLBuffer> = new Map();
  
  createBuffer(id: string, data: Float32Array): WebGLBuffer {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    
    this.buffers.set(id, buffer);
    return buffer;
  }
  
  deleteBuffer(id: string): void {
    const buffer = this.buffers.get(id);
    if (buffer) {
      gl.deleteBuffer(buffer);
      this.buffers.delete(id);
    }
  }
  
  dispose(): void {
    for (const buffer of this.buffers.values()) {
      gl.deleteBuffer(buffer);
    }
    this.buffers.clear();
  }
}

// Usage: Clean up on node deletion
function deleteNode(nodeID: NodeInstanceID): void {
  const node = graph.nodes.get(nodeID);
  
  // Clean up geometry
  geometryManager.deleteBuffer(`node_${nodeID}`);
  
  // Clean up node
  graph.nodes.delete(nodeID);
}
```

### 12.2 MEMORY LEAK DETECTION

Monitor memory usage:

```typescript
class MemoryMonitor {
  checkLeaks(): void {
    if (performance.memory) {
      const mb = performance.memory.usedJSHeapSize / 1048576;
      
      logger.info("Memory usage", { mb: mb.toFixed(2) });
      
      if (mb > 1500) {
        logger.warn("High memory usage detected");
        ui.showWarning("Memory usage high. Consider simplifying graph.");
      }
    }
  }
  
  start(): void {
    setInterval(() => this.checkLeaks(), 10000); // Every 10s
  }
}
```

---

# PART V: USER EXPERIENCE

## 13. FIRST-RUN EXPERIENCE

### 13.1 WELCOME MODAL

Show a welcome modal on first visit:

```typescript
class OnboardingManager {
  showWelcome(): void {
    if (localStorage.getItem("hasVisited")) return;
    
    const modal = createModal({
      title: "Welcome to Roslyn/Numerica",
      content: `
        <p>Roslyn/Numerica is a node-based computational design environment.</p>
        <p>Get started by:</p>
        <ol>
          <li>Right-clicking the canvas to add nodes</li>
          <li>Connecting nodes to build parametric models</li>
          <li>Pressing Ctrl+Enter to evaluate your graph</li>
        </ol>
        <p>Press F1 anytime for help.</p>
      `,
      actions: [
        { label: "Take Tour", action: () => this.startTour() },
        { label: "Skip", action: () => this.close() }
      ]
    });
    
    modal.show();
    localStorage.setItem("hasVisited", "true");
  }
}
```

### 13.2 INTERACTIVE TUTORIAL

Guide users through basic workflow:

```typescript
class Tutorial {
  private steps = [
    {
      target: "canvas",
      message: "Right-click here to add your first node",
      action: () => this.waitForNode()
    },
    {
      target: "node-palette",
      message: "Choose 'Math > Number' from the menu",
      action: () => this.waitForNodeType("Math.Number")
    },
    {
      target: "node",
      message: "Great! Now right-click again and add 'Math > Add'",
      action: () => this.waitForNodeType("Math.Add")
    },
    {
      target: "port",
      message: "Click and drag from the Number output to the Add input",
      action: () => this.waitForEdge()
    },
    {
      target: "eval-button",
      message: "Press Ctrl+Enter to evaluate the graph",
      action: () => this.waitForEvaluation()
    }
  ];
  
  start(): void {
    this.currentStep = 0;
    this.showStep(this.steps[0]);
  }
  
  showStep(step: TutorialStep): void {
    const highlight = document.createElement("div");
    highlight.className = "tutorial-highlight";
    
    const tooltip = document.createElement("div");
    tooltip.className = "tutorial-tooltip";
    tooltip.textContent = step.message;
    
    // Position highlight and tooltip
    const target = document.querySelector(step.target);
    // ... positioning logic
    
    // Wait for user action
    step.action(() => {
      this.nextStep();
    });
  }
}
```

---

## 14. IN-APP HELP & TUTORIALS

### 14.1 HELP PANEL

Provide contextual help:

```typescript
class HelpPanel {
  show(topic: string): void {
    const content = HELP_CONTENT[topic] || HELP_CONTENT.default;
    
    const panel = document.createElement("div");
    panel.className = "help-panel";
    panel.innerHTML = `
      <div class="help-header">
        <h2>${content.title}</h2>
        <button class="close-button">×</button>
      </div>
      <div class="help-body">
        ${content.html}
      </div>
      <div class="help-footer">
        <a href="/docs" target="_blank">Full Documentation</a>
      </div>
    `;
    
    document.body.appendChild(panel);
  }
}

const HELP_CONTENT = {
  "keyboard-shortcuts": {
    title: "Keyboard Shortcuts",
    html: `
      <table>
        <tr><td>Ctrl+Z</td><td>Undo</td></tr>
        <tr><td>Ctrl+Y</td><td>Redo</td></tr>
        <tr><td>Ctrl+C</td><td>Copy</td></tr>
        <tr><td>Ctrl+V</td><td>Paste</td></tr>
        <tr><td>Delete</td><td>Delete selected</td></tr>
        <tr><td>Ctrl+Enter</td><td>Evaluate graph</td></tr>
        <tr><td>F1</td><td>Show help</td></tr>
      </table>
    `
  },
  
  "nodes": {
    title: "Working with Nodes",
    html: `
      <p>Nodes are the building blocks of your computational graph.</p>
      <h3>Adding Nodes</h3>
      <p>Right-click the canvas and select from the menu, or press Ctrl+K to search.</p>
      <h3>Connecting Nodes</h3>
      <p>Click and drag from an output port to an input port.</p>
      <h3>Editing Parameters</h3>
      <p>Click on node parameters to edit values.</p>
    `
  }
};
```

### 14.2 TOOLTIPS & HINTS

Show helpful tooltips:

```typescript
class TooltipManager {
  show(element: HTMLElement, content: string, delay: number = 500): void {
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.textContent = content;
    
    // Position tooltip
    const rect = element.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + 8}px`;
    tooltip.style.left = `${rect.left}px`;
    
    // Delay before showing
    const timeout = setTimeout(() => {
      document.body.appendChild(tooltip);
    }, delay);
    
    // Remove on mouse leave
    element.addEventListener("mouseleave", () => {
      clearTimeout(timeout);
      if (tooltip.parentNode) {
        document.body.removeChild(tooltip);
      }
    }, { once: true });
  }
}
```

---

## 15. ERROR MESSAGES & RECOVERY GUIDANCE

### 15.1 CLEAR ERROR MESSAGES

Error messages must be:
1. **Specific**: Say exactly what went wrong
2. **Actionable**: Tell user how to fix it
3. **Non-technical**: Avoid jargon when possible

**Bad Error Messages:**
- "Error: undefined is not an object"
- "NullPointerException at line 247"
- "Invalid state"

**Good Error Messages:**
- "Cannot connect Number to Mesh: type mismatch. Try adding a conversion node."
- "Division by zero in Math.Divide node. Set denominator to a non-zero value."
- "Graph contains a cycle: Box → Subdivide → Box. Remove one connection to break the cycle."

### 15.2 ERROR MESSAGE TEMPLATES

```typescript
const ERROR_MESSAGES = {
  TYPE_MISMATCH: (sourceType: string, targetType: string) =>
    `Cannot connect ${sourceType} to ${targetType}. ` +
    `These port types are incompatible. Try adding a conversion node.`,
  
  CYCLE_DETECTED: (cycle: string[]) =>
    `Graph contains a cycle: ${cycle.join(" → ")}. ` +
    `Remove one connection in this chain to break the cycle.`,
  
  MISSING_REQUIRED_INPUT: (portName: string) =>
    `Required input "${portName}" has no value. ` +
    `Connect a node or set a value to continue.`,
  
  EVALUATION_TIMEOUT: (nodeType: string, duration: number) =>
    `Node ${nodeType} timed out after ${duration / 1000}s. ` +
    `This node may be taking too long to compute. ` +
    `Try simplifying the parameters or disabling the node.`,
  
  SOLVER_BUDGET_EXCEEDED: (actual: number, limit: number) =>
    `Solver particle count (${actual.toLocaleString()}) exceeds budget (${limit.toLocaleString()}). ` +
    `Reduce particle count or increase budget in solver settings.`
};
```

### 15.3 ERROR RECOVERY SUGGESTIONS

Provide specific recovery steps:

```typescript
class ErrorRecoveryGuide {
  suggest(error: Error): RecoverySuggestion[] {
    if (error instanceof CycleError) {
      return [
        {
          action: "Highlight Cycle",
          execute: () => this.highlightCycle(error.cycle)
        },
        {
          action: "Auto-Fix (Remove Last Edge)",
          execute: () => this.removeLastEdge(error.cycle)
        }
      ];
    }
    
    if (error instanceof TypeMismatchError) {
      return [
        {
          action: "Find Compatible Nodes",
          execute: () => this.showCompatibleNodes(error.targetType)
        },
        {
          action: "Remove Connection",
          execute: () => this.removeEdge(error.edgeID)
        }
      ];
    }
    
    return [
      {
        action: "View Error Details",
        execute: () => this.showErrorDetails(error)
      },
      {
        action: "Report Bug",
        execute: () => this.openBugReport(error)
      }
    ];
  }
}
```

---

# PART VI: DEPLOYMENT PREPARATION

## 16. BUILD OPTIMIZATION

### 16.1 CODE SPLITTING

Split code into chunks for faster initial load:

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          priority: -10
        },
        nodes: {
          test: /[\\/]src[\\/]nodes[\\/]/,
          name: "nodes",
          priority: -20
        },
        solvers: {
          test: /[\\/]src[\\/]solvers[\\/]/,
          name: "solvers",
          priority: -20
        }
      }
    }
  }
};
```

### 16.2 ASSET OPTIMIZATION

Optimize images, fonts, and other assets:

```javascript
// Image optimization
const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");

module.exports = {
  plugins: [
    new ImageMinimizerPlugin({
      minimizerOptions: {
        plugins: [
          ["gifsicle", { interlaced: true }],
          ["jpegtran", { progressive: true }],
          ["optipng", { optimizationLevel: 5 }],
          ["svgo", {
            plugins: [
              { removeViewBox: false },
              { cleanupIDs: false }
            ]
          }]
        ]
      }
    })
  ]
};
```

### 16.3 MINIFICATION

Minify JavaScript and CSS:

```javascript
const TerserPlugin = require("terser-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true, // Remove console.logs in production
          }
        }
      }),
      new CssMinimizerPlugin()
    ]
  }
};
```

---

## 17. ERROR REPORTING INTEGRATION

### 17.1 SENTRY INTEGRATION

Automatically capture and report errors:

```typescript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
  
  beforeSend(event, hint) {
    // Add extra context
    event.contexts = event.contexts || {};
    event.contexts.graph = {
      nodeCount: graph.nodes.size,
      edgeCount: graph.edges.size,
      version: graph.id.version
    };
    
    // Sanitize sensitive data
    if (event.request) {
      delete event.request.cookies;
    }
    
    return event;
  }
});

// Capture errors automatically
window.addEventListener("error", (event) => {
  Sentry.captureException(event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  Sentry.captureException(event.reason);
});
```

### 17.2 USER FEEDBACK ON ERRORS

Allow users to provide context when errors occur:

```typescript
class ErrorReporter {
  report(error: Error): void {
    const dialog = createDialog({
      title: "Error Occurred",
      content: `
        <p>An unexpected error occurred:</p>
        <pre>${error.message}</pre>
        <p>Would you like to send a report to help us fix this?</p>
        <textarea id="user-feedback" 
                  placeholder="What were you doing when this happened? (optional)">
        </textarea>
      `,
      actions: [
        {
          label: "Send Report",
          action: () => {
            const feedback = document.getElementById("user-feedback").value;
            
            Sentry.captureException(error, {
              tags: { user_submitted: true },
              contexts: {
                feedback: { comment: feedback }
              }
            });
            
            ui.showSuccess("Report sent. Thank you!");
          }
        },
        {
          label: "Cancel",
          action: () => dialog.close()
        }
      ]
    });
    
    dialog.show();
  }
}
```

---

## 18. ANALYTICS & TELEMETRY

### 18.1 USAGE ANALYTICS

Track how users interact with the application:

```typescript
class Analytics {
  track(event: string, properties?: Record<string, any>): void {
    // Privacy-first: only track aggregate usage, no PII
    
    const payload = {
      event,
      properties: {
        ...properties,
        timestamp: Date.now(),
        sessionID: this.sessionID,
        appVersion: APP_VERSION
      }
    };
    
    // Send to analytics service (e.g., Plausible, Mixpanel)
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }
}

// Track key events
analytics.track("node_added", { nodeType: "Math.Add" });
analytics.track("graph_evaluated", { nodeCount: graph.nodes.size });
analytics.track("solver_run", { solverType: "biological", generations: 10 });
analytics.track("file_exported", { format: "obj" });
```

### 18.2 PERFORMANCE TELEMETRY

Collect performance metrics:

```typescript
class PerformanceTelemetry {
  reportMetrics(): void {
    const metrics = {
      // Page load
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      
      // Evaluation
      avgEvaluationTime: this.getAvgEvaluationTime(),
      
      // Rendering
      avgFPS: this.getAvgFPS(),
      
      // Memory
      memoryUsage: performance.memory?.usedJSHeapSize,
      
      // Graph stats
      nodeCount: graph.nodes.size,
      edgeCount: graph.edges.size
    };
    
    analytics.track("performance_metrics", metrics);
  }
  
  start(): void {
    // Report metrics every 5 minutes
    setInterval(() => this.reportMetrics(), 300000);
  }
}
```

---

## FINAL CHECKLIST: MVP COMPLETION

Before marking the MVP as complete, verify:

### Core Functionality:
- [ ] All node types work correctly
- [ ] All commands execute and undo properly
- [ ] Graph evaluation is reliable
- [ ] Solver nodes run without crashing
- [ ] File save/load works
- [ ] Autosave recovers from crashes

### Interactions:
- [ ] All mouse interactions tested
- [ ] All keyboard shortcuts work
- [ ] All context menus functional
- [ ] All hover states correct
- [ ] Drag-and-drop works

### UI Polish:
- [ ] Consistent styling across components
- [ ] Smooth animations
- [ ] Proper loading indicators
- [ ] Clear error messages
- [ ] Accessible (keyboard nav, ARIA labels)

### Performance:
- [ ] FPS > 30 for typical graphs
- [ ] Evaluation time acceptable
- [ ] Memory usage reasonable
- [ ] No memory leaks

### User Experience:
- [ ] First-run onboarding works
- [ ] Help documentation available
- [ ] Error recovery clear
- [ ] Workflows feel smooth

### Deployment:
- [ ] Build optimized for production
- [ ] Error reporting configured
- [ ] Analytics tracking key events
- [ ] Cross-browser tested

---

## CONCLUSION

This guide completes the path from a stable system (after the Stabilization Doctrine) to a production-ready MVP. The codex agent should work through each section systematically, testing every interaction, polishing every UI element, and verifying every feature works end-to-end.

**Success Criteria:**
A non-technical user can open the application, follow the tutorial, create a parametric design, run a solver, and export results without encountering bugs or confusion.

**Next Steps After MVP:**
1. User testing with real designers
2. Performance optimization based on telemetry
3. Feature additions based on user feedback
4. Documentation expansion
5. Community building

The MVP is complete when the system feels solid, responsive, and ready for users to create real work.
