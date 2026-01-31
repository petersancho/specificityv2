# Warp Agent Onboarding Guide

**Purpose:** Fast onboarding for Warp (warp.dev) agents working on Lingua. Read this first, then dive into specific docs as needed.

**Last Updated:** Synthesized from agents.md and plans.md

---

## Purpose of This Document

This guide gives you the essential knowledge to be productive in the Lingua codebase. It covers:
- Core rules you must follow
- File locations for common tasks
- Patterns for safe code changes
- Workflows for extending the system

### Warp's Scope

Warp is authorized to work on **all subsystems** in Lingua:

- Documentation and docs generation
- UI components (CSS, labels, tooltips, layouts)
- Zustand store (actions, state slices)
- Rendering pipeline (WebGL, buffers, render adapter)
- Shaders (GLSL vertex/fragment)
- Geometry kernel (mesh, curves, NURBS, B-Rep, tessellation)
- Workflow engine and node registry
- Commands and viewport interactions
- Solvers (physics, biology, chemistry)

**Higher-risk areas require extra care:**
- Store: atomic updates, history recording
- Shaders: vert/frag must match, preserve attribute layouts
- Geometry: keep functions pure, no mutations
- Rendering: dispose GPU resources properly

### When to Read Other Docs

| Situation | Read This |
|-----------|-----------|
| First time in codebase | This file, then `lingua_architecture.md` |
| Adding geometry features | `subsystems_guide.md` (Geometry Kernel section) |
| Working on viewport/WebGL | `webgl_rendering_style.md` |
| Working on workflow nodes | `numerica_technical_spec.md` |
| Adding solvers | `solver_architecture_guide.md` |
| Large refactor (5+ files) | `warpplans.md` (planning workflow) |
| Visual design questions | `brandkit.md` (CMYK + Porcelain aesthetic) |
| Debugging issues | `ai_agent_guide.md` (detailed subsystem integration) |

---

## Project Identity

**Lingua** = parametric design system with two synchronized panels:
- **Roslyn** (3D modeling) - Custom WebGL viewport with custom shaders
- **Numerica** (visual programming) - HTML5 canvas node editor (immediate-mode rendering)

**Core philosophy:** Own the stack. No external CAD libraries, custom geometry kernel, custom renderers.

**Tech stack:**
- Frontend: React 18 + TypeScript + Vite
- State: Zustand (single store, ~10k LOC in `useProjectStore.ts`)
- Rendering: Custom WebGL (raw context, custom shaders in GLSL)
- Math: Three.js for utilities only (Vector3, Matrix4, BufferGeometry)
- Canvas: 2D context for workflow graph (immediate-mode, 60fps)
- Workers: Web Workers for physics/biology/chemistry solvers

---

## Core Rules (CRITICAL)

These rules are non-negotiable. Violating them causes bugs, breaks undo, or corrupts state.

### Rule 1: Store is Single Source of Truth

All application state lives in `useProjectStore.ts`. Never bypass it.

```
User Action -> Store Action -> State Update -> Component Re-render -> WebGL/Canvas Update
```

### Rule 2: Single Atomic Updates

Never chain multiple `set()` calls. Combine into one:

```typescript
// WRONG - breaks atomicity, can cause partial updates
set({ geometry: newGeo });
set({ selection: newSel });

// RIGHT - single atomic update
set({
  geometry: newGeo,
  selection: newSel,
});
```

### Rule 3: Record History BEFORE Mutations

For undo to work, capture state before changing it:

```typescript
// WRONG - user cannot undo
const deleteGeometry = (id) => {
  set(state => ({
    geometry: state.geometry.filter(g => g.id !== id)
  }));
};

// RIGHT - record before mutation
const deleteGeometry = (id, options = {}) => {
  if (options.recordHistory !== false) {
    get().recordModelerHistory();
  }
  set(state => ({
    geometry: state.geometry.filter(g => g.id !== id)
  }));
};
```

### Rule 4: No Three.js Objects in State

Store only serializable data. Convert at render boundaries:

```typescript
// WRONG - breaks serialization, undo, persistence
{
  mesh: new THREE.Mesh(),
  vector: new THREE.Vector3()
}

// RIGHT - plain data only
{
  positions: Float32Array,
  indices: Uint32Array,
  position: { x: number, y: number, z: number }
}
```

### Rule 5: Pure Geometry Functions

Geometry operations must be pure (no side effects, no mutations):

```typescript
// WRONG - mutates input
const translate = (geometry, offset) => {
  geometry.position.x += offset.x;
  return geometry;
};

// RIGHT - returns new object
const translate = (geometry, offset) => ({
  ...geometry,
  position: {
    x: geometry.position.x + offset.x,
    y: geometry.position.y + offset.y,
    z: geometry.position.z + offset.z,
  },
});
```

### Rule 6: Reconcile Collections After Geometry Changes

When geometry array changes, layers/sceneNodes must stay in sync:

```typescript
// WRONG - layers/sceneNodes out of sync
set(state => ({
  geometry: [...state.geometry, newGeom],
}));

// RIGHT - reconcile all related collections
set(state => {
  const nextGeometry = [...state.geometry, newGeom];
  const reconciled = reconcileGeometryCollections(
    nextGeometry,
    state.layers,
    state.sceneNodes,
    state.assignments,
    state.hiddenGeometryIds,
    state.lockedGeometryIds,
    state.selectedGeometryIds
  );
  return {
    geometry: nextGeometry,
    ...reconciled,
  };
});
```

### Rule 7: Dispose GPU Resources

Always dispose old buffers before creating new ones:

```typescript
// WRONG - memory leak
buffer.setData(newData);
// ... later, create new buffer without disposing

// RIGHT - dispose before replacing
if (existingBuffer) {
  renderer.deleteGeometryBuffer(existingBuffer.id);
}
const newBuffer = renderer.createGeometryBuffer(id);
```

### Rule 8: Trigger Workflow Recalculation

After geometry changes, workflow nodes need fresh data:

```typescript
// WRONG - workflow outputs stale
addGeometryMesh(mesh);

// RIGHT - trigger recalculation
addGeometryMesh(mesh);
get().recalculateWorkflow();
```

---

## Essential File Map

### Entry Points
| File | Purpose | Size |
|------|---------|------|
| `client/src/App.tsx` | Workspace shell | ~26k chars |
| `client/src/store/useProjectStore.ts` | **SINGLE SOURCE OF TRUTH** | ~10,717 lines |
| `client/src/types.ts` | **ALL geometry types** | ~566 lines |

### Roslyn (3D Modeling)
| File | Purpose |
|------|---------|
| `client/src/components/ModelerSection.tsx` | UI + command bar |
| `client/src/components/WebGLViewerCanvas.tsx` | Viewport component (~8,900 lines) |
| `client/src/webgl/WebGLRenderer.ts` | Custom renderer (~698 lines) |
| `client/src/webgl/ShaderManager.ts` | Shader compilation/linking |
| `client/src/webgl/BufferManager.ts` | GPU buffer lifecycle |
| `client/src/geometry/renderAdapter.ts` | Geometry to GPU buffers (~1,219 lines) |
| `client/src/geometry/hitTest.ts` | Raycasting and picking (~852 lines) |
| `client/src/commands/registry.ts` | Command definitions (~561 lines) |

### Numerica (Workflow Editor)
| File | Purpose |
|------|---------|
| `client/src/components/workflow/WorkflowSection.tsx` | UI + palette |
| `client/src/components/workflow/NumericalCanvas.tsx` | Canvas renderer (~5,882 lines) |
| `client/src/workflow/nodeRegistry.ts` | Node definitions (~12,622 lines) |
| `client/src/workflow/workflowEngine.ts` | Graph evaluation |
| `client/src/components/workflow/workflowValidation.ts` | Validation logic |
| `client/src/workflow/nodeTypes.ts` | NodeType union |

### Geometry Kernel (Pure Functions)
| File | Purpose |
|------|---------|
| `client/src/geometry/mesh.ts` | Mesh operations (~1,150 lines) |
| `client/src/geometry/curves.ts` | Curve math |
| `client/src/geometry/nurbs.ts` | NURBS implementation |
| `client/src/geometry/transform.ts` | Transformations |
| `client/src/geometry/math.ts` | Vector/plane math |
| `client/src/geometry/tessellation.ts` | Adaptive tessellation |
| `client/src/geometry/brep.ts` | B-Rep operations |
| `client/src/geometry/physical.ts` | Volume, centroid, inertia |

### Shaders (GLSL)
| File | Purpose |
|------|---------|
| `client/src/webgl/shaders/geometry.vert.ts` | Geometry vertex shader |
| `client/src/webgl/shaders/geometry.frag.ts` | Geometry fragment shader |
| `client/src/webgl/shaders/line.vert.ts` | Line rendering |
| `client/src/webgl/shaders/line.frag.ts` | Anti-aliased lines |
| `client/src/webgl/shaders/edge.*.ts` | Edge rendering |
| `client/src/webgl/shaders/point.*.ts` | Point rendering |
| `client/src/webgl/shaders/atmosphere.*.ts` | Background |

### Solvers (Web Workers)
| File | Purpose |
|------|---------|
| `client/src/workflow/nodes/solver/PhysicsSolver.ts` | Physics node definition |
| `client/src/workflow/nodes/solver/physicsWorker.ts` | Physics computation |
| `client/src/workflow/nodes/solver/BiologicalEvolutionSolver.ts` | Bio solver |
| `client/src/workflow/nodes/solver/chemistry/chemistryWorker.ts` | Chemistry |

---

## Golden Patterns

### Store Action Pattern

Every store action follows this structure:

```typescript
actionName: (params, options = {}) => {
  const { recordHistory = true, selectIds } = options;

  // 1. VALIDATE INPUTS
  if (!isValid(params)) {
    console.warn("Invalid params");
    return;
  }

  // 2. RECORD HISTORY (if undoable)
  if (recordHistory) {
    get().recordModelerHistory();
  }

  // 3. COMPUTE NEW STATE
  const newData = computeNewState(params, get());

  // 4. SINGLE ATOMIC UPDATE
  set((state) => ({
    ...state,
    someSlice: newData,
    relatedSlice: updateRelated(newData, state),
  }));

  // 5. TRIGGER SIDE EFFECTS
  get().recalculateWorkflow();

  // 6. RETURN RESULT
  return newData.id;
},
```

### Geometry Addition Pattern

When adding geometry to the store:

```typescript
addGeometryMesh: (mesh, options = {}) => {
  const {
    recordHistory = true,
    selectIds,
    layerId,
    geometryId,
  } = options;

  if (recordHistory) {
    get().recordModelerHistory();
  }

  const id = geometryId ?? createGeometryId("mesh");

  const geometry: MeshGeometry = {
    id,
    type: "mesh",
    mesh,
    layerId: withDefaultLayerId(layerId, get()),
    // ... other fields
  };

  set((state) => {
    const nextGeometry = [...state.geometry, geometry];
    const reconciled = reconcileGeometryCollections(
      nextGeometry,
      state.layers,
      state.sceneNodes,
      state.assignments,
      state.hiddenGeometryIds,
      state.lockedGeometryIds,
      selectIds ?? state.selectedGeometryIds
    );

    return {
      geometry: nextGeometry,
      ...reconciled,
      selectedGeometryIds: selectIds ?? reconciled.selectedGeometryIds,
    };
  });

  get().recalculateWorkflow();

  return id;
},
```

### Geometry ID Pattern

Always use the helper for consistent IDs:

```typescript
let geometrySequence = 0;
const createGeometryId = (prefix: string) =>
  `${prefix}-${Date.now()}-${geometrySequence++}`;

// Usage:
const id = createGeometryId("mesh");  // "mesh-1706654321000-42"
```

### Buffer Upload Pattern

When sending geometry to the GPU:

```typescript
buffer.setData({
  positions: new Float32Array(mesh.positions),
  normals: new Float32Array(mesh.normals),
  uvs: new Float32Array(mesh.uvs),
  indices: new Uint16Array(mesh.indices),
});
```

### Workflow Node Compute Pattern

```typescript
compute: async (args: WorkflowComputeArgs) => {
  const { inputs, parameters, context } = args;

  // Extract inputs
  const geometryId = inputs.geometry as string;
  const geometry = context.geometryById.get(geometryId);
  if (!geometry) return null;

  // Extract parameters
  const param1 = toNumber(parameters.param1, 1.0);
  const param2 = toBoolean(parameters.param2, false);

  // Perform computation
  const result = performOperation(geometry, param1, param2);

  // Return outputs
  return {
    outputGeometry: result.id,
    outputValue: result.value,
  };
},
```

---

## Rendering Pipeline Overview

### Data Flow

```
Store (Geometry Records)
    |
    v
GeometryRenderAdapter
    |  - Vertices -> sphere instancing
    |  - Polylines -> line buffer
    |  - NURBS curves -> tessellate -> line buffer
    |  - NURBS surfaces -> tessellate -> triangle mesh
    |  - Meshes -> direct buffer upload
    v
WebGLRenderer
    |  - Sets uniforms
    |  - Binds buffers
    |  - Issues draw calls
    v
Shaders (GLSL)
    |  - geometry.vert/frag for solid geometry
    |  - line.vert/frag for lines
    |  - edge.vert/frag for edges
    |  - point.vert/frag for points
    v
Screen
```

### Where to Tweak Shaders Safely

**Safe modifications:**
- Lighting calculations in fragment shaders
- Color adjustments in fragment shaders
- New uniform bindings (add to both shader and renderer)
- New varying variables (must match vert/frag)

**Dangerous modifications:**
- Changing attribute layouts (must update BufferManager)
- Removing existing uniforms (breaks renderer)
- Changing vertex position calculations (breaks hit testing)

**Adding a new shader:**
1. Create `client/src/webgl/shaders/myshader.vert.ts`
2. Create `client/src/webgl/shaders/myshader.frag.ts`
3. Register in ShaderManager
4. Add render method in WebGLRenderer
5. Call from renderAdapter when appropriate

### RenderMesh Structure

All mesh geometry uses this format:

```typescript
export type RenderMesh = {
  positions: number[];  // Flat array [x,y,z, x,y,z, ...]
  normals: number[];    // Flat array [nx,ny,nz, nx,ny,nz, ...]
  uvs: number[];        // Flat array [u,v, u,v, ...]
  indices: number[];    // Triangle indices [i0,i1,i2, i0,i1,i2, ...]
  colors?: number[];    // Optional vertex colors [r,g,b, r,g,b, ...]
};
```

---

## Common Workflows

### Adding a New Command

**1. Register in `commands/registry.ts`:**
```typescript
export const COMMAND_DEFINITIONS: CommandDefinition[] = [
  // ... existing
  {
    id: "mycommand",
    label: "My Command",
    category: "geometry",
    prompt: "My Command: click to do something. Esc cancels.",
  },
];
```

**2. Add handler in `ModelerSection.tsx` or viewport:**
```typescript
const handleMyCommand = useCallback(() => {
  setActiveCommand("mycommand");
  setCommandPrompt("My Command: click first point...");
}, []);
```

**3. Handle in `WebGLViewerCanvas.tsx` pointer events:**
```typescript
if (activeCommand === "mycommand") {
  if (commandStep === 0) {
    // First click
    setCommandData({ startPoint: point });
    setCommandStep(1);
  } else if (commandStep === 1) {
    // Execute
    recordModelerHistory();
    addGeometryMyNew({ start: commandData.startPoint, end: point });
    setActiveCommand(null);
  }
}
```

### Adding a New Workflow Node

**1. Update `workflow/nodeTypes.ts`:**
```typescript
export const SUPPORTED_WORKFLOW_NODE_TYPES = [
  // ... existing
  "myNewNode",
] as const;
```

**2. Register in `workflow/nodeRegistry.ts`:**
```typescript
{
  type: "myNewNode",
  label: "My New Node",
  shortLabel: "MyNew",
  description: "Does something cool.",
  category: "modifiers",
  iconId: "transform",

  inputs: [
    { key: "input1", label: "Input", type: "geometry", required: true },
  ],

  outputs: [
    { key: "output1", label: "Output", type: "geometry" },
  ],

  parameters: [
    { key: "param1", label: "Parameter", type: "slider", defaultValue: 1.0 },
  ],

  compute: async (args) => {
    const geometry = args.context.geometryById.get(args.inputs.input1);
    if (!geometry) return null;
    // ... compute
    return { output1: resultId };
  },
},
```

**3. Add to palette in `WorkflowSection.tsx`:**
```typescript
const nodesByCategory = {
  modifiers: [
    // ... existing
    "myNewNode",
  ],
};
```

### Adding a New Geometry Type

**1. Update `types.ts`:**
```typescript
export type MyNewGeometry = {
  id: string;
  type: "myNew";
  myData: SomeData;
  layerId: string;
  // standard optional fields...
};

export type Geometry =
  | VertexGeometry
  | PolylineGeometry
  // ... existing
  | MyNewGeometry;
```

**2. Add store action in `useProjectStore.ts`:**
```typescript
addGeometryMyNew: (data, options = {}) => {
  if (options.recordHistory !== false) {
    get().recordModelerHistory();
  }
  const id = createGeometryId("mynew");
  const geometry: MyNewGeometry = { id, type: "myNew", ... };
  set((state) => {
    const nextGeometry = [...state.geometry, geometry];
    return { geometry: nextGeometry, ...reconciled };
  });
  get().recalculateWorkflow();
  return id;
},
```

**3. Add tessellation in `geometry/`:**
```typescript
export const tessellateMyNew = (data: MyNewData): RenderMesh => {
  // Convert to triangle mesh
  return { positions, normals, uvs, indices };
};
```

**4. Extend `renderAdapter.ts`:**
```typescript
if (geometry.type === "myNew") {
  this.updateMyNewGeometry(geometry);
}
```

**5. Add hit testing in `hitTest.ts`:**
```typescript
if (item.type === "myNew") {
  const mesh = tessellateMyNew(item.myData);
  const hit = rayTriangleMeshIntersection(ray, mesh);
  // ...
}
```

### Debugging a Rendering Issue

**Step 1: Check store state**
```typescript
// In browser console
const state = useProjectStore.getState();
console.log("Geometry:", state.geometry);
console.log("Selected:", state.selectedGeometryIds);
```

**Step 2: Verify geometry record**
```typescript
const geom = state.geometry.find(g => g.id === "problematic-id");
console.log("Type:", geom.type);
console.log("Mesh:", geom.mesh);
console.log("Positions count:", geom.mesh?.positions.length / 3);
```

**Step 3: Check render adapter**
```typescript
// Add logging in renderAdapter.ts
updateGeometry(geometry: Geometry) {
  console.log("Updating:", geometry.id, geometry.type);
}
```

**Step 4: Check WebGL errors**
```typescript
const error = gl.getError();
if (error !== gl.NO_ERROR) {
  console.error("WebGL error:", error);
}
```

**Step 5: Inspect shader uniforms**
```typescript
// In WebGLRenderer.ts
console.log("Uniforms:", uniforms);
```

### Debugging a Selection Issue

1. Check selection mode: `get().selectionMode`
2. Add logging to `hitTest.ts`
3. Verify ray computation in viewport
4. Check `selectedGeometryIds` and `componentSelection`

### Debugging a Workflow Issue

1. Check node registration: `NODE_DEFINITIONS.map(n => n.type)`
2. Verify edge connections are valid
3. Add logging to `workflowEngine.ts` evaluation
4. Check dirty flags on nodes

---

## Testing Checklist

### Before Committing

**TypeScript:**
- [ ] Code compiles without errors
- [ ] No `@ts-ignore` or `@ts-expect-error` added
- [ ] Discriminated unions remain exhaustive
- [ ] No `any` types (use `unknown` if needed)

**Undo/Redo:**
- [ ] Geometry changes call `recordModelerHistory()`
- [ ] History recorded BEFORE mutation
- [ ] Undo restores exact previous state
- [ ] Redo works after undo

**Selection:**
- [ ] Object selection works
- [ ] Sub-object selection works (vertex/edge/face)
- [ ] Multi-select works (Shift+click)
- [ ] Selection highlights visible

**Rendering:**
- [ ] Geometry renders correctly
- [ ] No flicker during interaction
- [ ] Selection highlighting works
- [ ] No WebGL errors in console

**Store State:**
- [ ] State remains serializable
- [ ] No circular references
- [ ] IDs unique and consistent

### Recommended Commands

```bash
# Install dependencies
npm install

# Start dev environment
npm run dev

# Run client tests
npm test -w client

# Type check (via build)
npm run build -w client

# Start just the server
npm run dev:server

# Start just the client
npm run dev:client
```

### Manual Test Scenarios

**Basic Modeling:**
1. Create box primitive
2. Select, translate, rotate, scale
3. Undo all operations
4. Redo all operations
5. Delete, undo delete

**Workflow Graph:**
1. Add geometry reference node
2. Add transform node
3. Connect nodes
4. Modify parameters
5. Verify geometry updates

**Selection:**
1. Click select single object
2. Shift+click multi-select
3. Box select
4. Switch selection modes

---

## Do / Don't List

### DO

- Use store actions for all state mutations
- Record history before undoable operations
- Use single `set()` calls for atomic updates
- Call `reconcileGeometryCollections` after geometry changes
- Call `recalculateWorkflow` after geometry mutations
- Dispose GPU resources before replacing
- Keep geometry functions pure
- Use `createGeometryId()` for new geometry IDs
- Test undo/redo after implementing changes
- Check for WebGL errors in console

### DON'T

- Bypass the store with direct state mutation
- Chain multiple `set()` calls
- Store Three.js objects in state
- Mutate geometry records in place
- Skip history recording for undoable actions
- Forget to update registries when adding commands/nodes
- Hard-code tolerance values (use centralized constants)
- Make sweeping refactors without following `plans.md`
- Add `any` types without strong justification
- Create memory leaks by not disposing buffers

### Avoid Sweeping Refactors

Large refactors (5+ files) should follow the structured workflow in `plans.md`:
1. Define goal and success criteria
2. Map affected subsystems
3. Create checkpoint plan
4. Work phase by phase
5. Test at each checkpoint
6. Document decisions

---

## Quick Glossary

| Term | Definition |
|------|------------|
| **Roslyn** | The 3D modeling panel (custom WebGL viewport) |
| **Numerica** | The visual programming panel (HTML5 canvas node editor) |
| **RenderMesh** | Flat array format for GPU-ready geometry: positions, normals, uvs, indices |
| **Discriminated Union** | TypeScript pattern where `type` field determines variant |
| **Store** | The Zustand state container (`useProjectStore.ts`) |
| **Store Action** | A function on the store that mutates state |
| **reconcileGeometryCollections** | Helper that syncs layers/sceneNodes after geometry changes |
| **recordModelerHistory** | Captures state snapshot for undo |
| **recalculateWorkflow** | Triggers re-evaluation of workflow graph |
| **GeometryRenderAdapter** | Converts geometry records to GPU buffers |
| **CPlane** | Construction plane (reference for drawing/snapping) |
| **Gizmo** | Interactive transform handle (translate/rotate/scale) |
| **Modal Command** | Multi-step command with staged user input |
| **Immediate-Mode Rendering** | Redraw everything each frame (used in Numerica canvas) |
| **Tessellation** | Converting parametric geometry to triangles |
| **Hit Testing** | Determining what geometry is under the mouse cursor |
| **B-Rep** | Boundary Representation (solid modeling format) |
| **NURBS** | Non-Uniform Rational B-Splines (curve/surface math) |

---

## Warp's First Task Checklist

When starting work on Lingua, complete these items:

1. **Verify dev environment works**
   ```bash
   npm install
   npm run dev
   ```
   Open `http://localhost:5173` and confirm both panels render.

2. **Explore store state in browser console**
   ```typescript
   useProjectStore.getState()
   ```
   Understand the shape: geometry, layers, selection, workflow.

3. **Create geometry via UI**
   Use the command bar to create a point, line, or box.
   Observe how store state changes.

4. **Trace a store action**
   Find `addGeometryPoint` in `useProjectStore.ts`.
   Follow the pattern: validate, record history, set state, recalculate.

5. **Create a workflow node via UI**
   Drag a node from the palette.
   Connect it to another node.
   Observe graph evaluation.

6. **Run tests**
   ```bash
   npm test -w client
   ```
   Confirm existing tests pass.

7. **Read the architecture doc**
   Skim `docs/lingua_architecture.md` for system-level understanding.

8. **Make a small change**
   Try modifying a tooltip, label, or default value.
   Verify undo works.
   Commit with meaningful message.

---

## File Reference by Task

### When you need to...

**Add geometry type:**
- `types.ts` (Geometry union)
- `useProjectStore.ts` (add action)
- `geometry/` (tessellation)
- `renderAdapter.ts` (GPU buffers)
- `hitTest.ts` (picking)

**Change rendering:**
- `webgl/WebGLRenderer.ts`
- `webgl/shaders/*.ts`
- `renderAdapter.ts`

**Modify selection:**
- `useProjectStore.ts` (selection slice)
- `hitTest.ts`
- `WebGLViewerCanvas.tsx`

**Add command:**
- `commands/registry.ts`
- `ModelerSection.tsx`
- `WebGLViewerCanvas.tsx`

**Add workflow node:**
- `workflow/nodeTypes.ts`
- `workflow/nodeRegistry.ts`
- `WorkflowSection.tsx`

**Change UI layout:**
- `App.tsx`
- `ModelerSection.tsx`
- `WorkflowSection.tsx`

**Add solver:**
- `workflow/nodes/solver/`
- Create MySolver.ts + worker
- Register in nodeRegistry

**Debug state:**
- Console: `useProjectStore.getState()`
- React DevTools
- Zustand DevTools

---

## Quick Stats

| File | Lines |
|------|-------|
| useProjectStore.ts | ~10,717 |
| WebGLViewerCanvas.tsx | ~8,900 |
| nodeRegistry.ts | ~12,622 |
| NumericalCanvas.tsx | ~5,882 |
| renderAdapter.ts | ~1,219 |
| mesh.ts | ~1,150 |
| hitTest.ts | ~852 |
| WebGLRenderer.ts | ~698 |
| types.ts | ~566 |
| registry.ts | ~561 |

**Total codebase: ~50,000+ lines of TypeScript**

---

## Pull Request Process

### Code Reviewer
Always add **@CharlieHelps** as a code reviewer on pull requests. Charlie is our code review agent and will assist with reviewing changes.

### Commit Messages
Include the co-author line at the end of every commit message:
```
Co-Authored-By: Warp <agent@warp.dev>
```

### PR Descriptions
Include:
- Clear summary of changes
- Affected subsystems
- Testing performed
- Any breaking changes

---

## Final Notes

- **Code is authoritative** - when docs conflict with code, trust the code
- **Patterns evolve** - docs may lag slightly behind implementation
- **Test integrations** - features must work end-to-end
- **Keep it functional** - geometry ops pure, store is truth
- **Document new patterns** - update this file when you establish new conventions

For large refactors, always use the structured workflow in `plans.md`.

---

**You now have enough context to be productive. Start with item 1 of Warp's First Task Checklist, then tackle your assigned work.**
