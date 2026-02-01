# AI Agent Quick Reference

**Purpose:** Fast onboarding for AI agents working on Lingua. Read this first, then dive into specific docs as needed.

**Last Updated:** 2026-01-31 (Added testing, linting, and build system sections)

---

## Project Identity

**Lingua** = parametric design system with dual panels:
- **Roslyn** (3D modeling) - custom WebGL viewport with custom shaders
- **Numerica** (visual programming) - HTML5 canvas node editor (immediate-mode rendering)

**Core philosophy:** Own the stack. No external CAD libs, custom geometry kernel, custom renderers.

**Tech stack:**
- Frontend: React 18 + TypeScript + Vite
- State: Zustand (single store, ~10k LOC in `useProjectStore.ts`)
- Rendering: Custom WebGL (raw context, custom shaders in GLSL)
- Math: Three.js for utilities only (Vector3, Matrix4, BufferGeometry)
- Canvas: 2D context for workflow graph (immediate-mode, 60fps)
- Workers: Web Workers for physics/biology/chemistry solvers

---

## Essential File Map

### Entry Points
- `client/src/App.tsx` - workspace shell (26k chars)
- `client/src/store/useProjectStore.ts` - **SINGLE SOURCE OF TRUTH** (10,717 lines!)
- `client/src/types.ts` - **ALL geometry types** (566 lines of discriminated unions)

### Roslyn (3D Modeling)
- `client/src/components/ModelerSection.tsx` - UI + command bar
- `client/src/components/WebGLViewerCanvas.tsx` - viewport component (8,900 lines!)
- `client/src/webgl/WebGLRenderer.ts` - custom renderer (698 lines)
- `client/src/webgl/ShaderManager.ts` - shader compilation/linking
- `client/src/webgl/BufferManager.ts` - GPU buffer lifecycle
- `client/src/geometry/renderAdapter.ts` - geometry → GPU buffers (1,219 lines)
- `client/src/geometry/hitTest.ts` - raycasting & picking (852 lines)
- `client/src/commands/registry.ts` - command definitions (561 lines)

### Numerica (Workflow Editor)
- `client/src/components/workflow/WorkflowSection.tsx` - UI + palette
- `client/src/components/workflow/NumericalCanvas.tsx` - **canvas renderer** (5,882 lines!)
- `client/src/workflow/nodeRegistry.ts` - node definitions (12,622 lines!)
- `client/src/workflow/workflowEngine.ts` - graph evaluation
- `client/src/components/workflow/workflowValidation.ts` - validation logic
- `client/src/workflow/nodeTypes.ts` - NodeType union
- **`docs/brandkit.md`** - **VISUAL DESIGN SYSTEM** (CMYK + Porcelain aesthetic)

### Geometry Kernel (Pure Functions)
- `client/src/geometry/mesh.ts` - mesh operations (1,150 lines)
- `client/src/geometry/curves.ts` - curve math
- `client/src/geometry/nurbs.ts` - NURBS implementation
- `client/src/geometry/transform.ts` - transformations
- `client/src/geometry/math.ts` - vector/plane math
- `client/src/geometry/tessellation.ts` - adaptive tessellation
- `client/src/geometry/meshTessellation.ts` - subdivision, decimation
- `client/src/geometry/brep.ts` - B-Rep operations
- `client/src/geometry/physical.ts` - volume, centroid, inertia

### Shaders (GLSL)
- `client/src/webgl/shaders/geometry.vert.ts` - geometry vertex shader
- `client/src/webgl/shaders/geometry.frag.ts` - geometry fragment shader
- `client/src/webgl/shaders/line.vert.ts` - line rendering
- `client/src/webgl/shaders/line.frag.ts` - anti-aliased lines
- `client/src/webgl/shaders/edge.*.ts` - edge rendering
- `client/src/webgl/shaders/point.*.ts` - point rendering
- `client/src/webgl/shaders/atmosphere.*.ts` - background

### Solvers (Web Workers)
- `client/src/workflow/nodes/solver/PhysicsSolver.ts` - physics node def (281 lines)
- `client/src/workflow/nodes/solver/physicsWorker.ts` - physics computation
- `client/src/workflow/nodes/solver/physicsWorkerClient.ts` - worker interface
- `client/src/workflow/nodes/solver/BiologicalEvolutionSolver.ts` - bio solver
- `client/src/workflow/nodes/solver/biological/biologicalWorker.ts` - bio computation
- `client/src/workflow/nodes/solver/chemistry/chemistryWorker.ts` - chemistry
- `client/src/workflow/nodes/solver/solverInterface.ts` - solver protocol
- `client/src/workflow/nodes/solver/validation.ts` - goal validation
- `client/src/workflow/nodes/solver/goals/` - goal node definitions

### Test Infrastructure
- `client/src/__tests__/` - unit tests (geometry, workflow conversions)
- `client/src/test-rig/` - comprehensive test infrastructure:
  - `validation/` - solver validation tests (physics, chemistry, biology, topology)
  - `solvers/` - solver test rigs and fixtures
  - `benchmarks/` - performance benchmarks

---

## Quick Architecture Overview

### State Flow (CRITICAL)
```
User Action → Store Action → State Update → Component Re-render → WebGL/Canvas Update
```

**NEVER bypass the store.** All mutations go through store actions.

### Geometry Model (Discriminated Union)
```typescript
// From types.ts
export type Geometry =
  | VertexGeometry      // { type: "vertex", position: Vec3, ... }
  | PolylineGeometry    // { type: "polyline", vertexIds: string[], ... }
  | SurfaceGeometry     // { type: "surface", mesh: RenderMesh, ... }
  | LoftGeometry        // { type: "loft", mesh: RenderMesh, sectionIds: string[], ... }
  | ExtrudeGeometry     // { type: "extrude", mesh: RenderMesh, profileIds: string[], ... }
  | MeshGeometry        // { type: "mesh", mesh: RenderMesh, primitive?: MeshPrimitiveInfo, ... }
  | NurbsCurveGeometry  // { type: "nurbsCurve", nurbs: NURBSCurve, ... }
  | NurbsSurfaceGeometry // { type: "nurbsSurface", nurbs: NURBSSurface, mesh?: RenderMesh, ... }
  | BRepGeometry        // { type: "brep", brep: BRepData, mesh?: RenderMesh, ... }
```

**All geometry stored as plain TypeScript records.** No Three.js objects in state!

### RenderMesh Structure
```typescript
export type RenderMesh = {
  positions: number[];  // Flat array [x,y,z, x,y,z, ...]
  normals: number[];    // Flat array [nx,ny,nz, nx,ny,nz, ...]
  uvs: number[];        // Flat array [u,v, u,v, ...]
  indices: number[];    // Triangle indices [i0,i1,i2, i0,i1,i2, ...]
  colors?: number[];    // Optional vertex colors [r,g,b, r,g,b, ...]
};
```

### Rendering Pipeline
1. **Store** holds geometry records (plain objects)
2. **GeometryRenderAdapter** converts records → GPU buffers
   - Vertices: sphere instancing
   - Polylines: line buffer with anti-aliasing
   - NURBS curves: tessellate → line buffer
   - NURBS surfaces: tessellate → triangle mesh
   - Meshes: direct buffer upload
3. **WebGLRenderer** draws buffers with custom shaders
4. **Shaders** in `client/src/webgl/shaders/` (GLSL strings)

### Workflow Evaluation (Lazy Pull-Based)
```typescript
// From workflowEngine.ts
const evaluateWorkflow = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  context: EvaluationContext
) => {
  // 1. Build dependency graph
  // 2. Topological sort
  // 3. Evaluate nodes in order
  // 4. Cache results
  // 5. Propagate dirty flags downstream
};
```

**Dirty flags propagate downstream on param changes.**

---

## Development Environment

**Build & Run:**
```bash
npm run dev             # Start both client + server
npm run dev:client      # Client only (Vite dev server)
npm run dev:server      # Server only (with hot reload)
npm run build           # Production build (includes TypeScript checking)
```

**Testing:**
```bash
npm run test            # Run all tests (Vitest)
npx vitest              # Interactive watch mode
```
- Tests: `client/src/__tests__/` (unit) and `client/src/test-rig/` (integration)
- Framework: Vitest with custom assertion helpers for solvers

**Linting:**
- No linting currently configured
- TypeScript strict mode enforced during build (`npm run build`)

---

## Store Architecture (CRITICAL)

### Store Structure
```typescript
// From useProjectStore.ts (simplified)
type ProjectStore = {
  // Geometry
  geometry: Geometry[];                    // All geometry records
  layers: Layer[];                         // Layer organization
  sceneNodes: SceneNode[];                 // Scene graph
  
  // Selection
  selectedGeometryIds: string[];           // Object selection
  selectionMode: SelectionMode;            // "object" | "vertex" | "edge" | "face"
  componentSelection: ComponentSelection[]; // Sub-object selection
  
  // Camera & View
  camera: CameraState;                     // position, target, up, fov
  cPlane: CPlane;                          // Construction plane
  displayMode: DisplayMode;                // "shaded" | "wireframe" | etc.
  viewSettings: ViewSettings;              // backfaceCulling, showEdges, etc.
  
  // Transform
  transformOrientation: TransformOrientation; // "world" | "local" | "view" | "cplane"
  gumballAlignment: GumballAlignment;      // "boundingBox" | "cplane"
  pivot: PivotState;                       // Pivot mode and position
  
  // History
  modelerHistoryPast: ModelerSnapshot[];   // Undo stack
  modelerHistoryFuture: ModelerSnapshot[]; // Redo stack
  
  // Workflow
  workflow: WorkflowState;                 // { nodes, edges }
  workflowHistory: WorkflowState[];        // Workflow undo stack (max 40)
  
  // Actions (hundreds of them!)
  addGeometryPoint: (position?: Vec3) => string;
  addGeometryPolyline: (...) => string | null;
  addGeometryMesh: (...) => string;
  updateGeometry: (id: string, data: Partial<Geometry>, options?) => void;
  deleteGeometry: (ids: string[] | string, options?) => void;
  selectGeometry: (id: string | null, isMultiSelect?: boolean) => void;
  recordModelerHistory: (snapshot?: ModelerSnapshot) => void;
  undoModeler: () => void;
  redoModeler: () => void;
  // ... 100+ more actions
};
```

### ID Generation Pattern
```typescript
// From useProjectStore.ts
let geometrySequence = 0;
let sceneSequence = 0;

const createGeometryId = (prefix: string) =>
  `${prefix}-${Date.now()}-${geometrySequence++}`;

const createSceneNodeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${sceneSequence++}`;
```

**Always use these helpers for consistent IDs.**

---

## Common Implementation Patterns

### Adding a New Geometry Type (COMPLETE CHECKLIST)

#### 1. Update Types (`client/src/types.ts`)
```typescript
// Add new geometry type
export type MyNewGeometry = {
  id: string;
  type: "myNew";  // Discriminator
  myData: SomeData;
  layerId: string;
  area_m2?: number;
  thickness_m?: number;
  sourceNodeId?: string;
  metadata?: Record<string, unknown>;
};

// Add to union
export type Geometry =
  | VertexGeometry
  | PolylineGeometry
  // ... existing types
  | MyNewGeometry;  // ADD HERE
```

#### 2. Add Store Actions (`client/src/store/useProjectStore.ts`)
```typescript
// Add to store type
type ProjectStore = {
  // ... existing
  addGeometryMyNew: (data: MyNewData, options?: MyNewInsertOptions) => string;
};

// Implement action (around line 1500+)
addGeometryMyNew: (data, options = {}) => {
  const { recordHistory = true, selectIds, layerId } = options;
  
  // 1. Record history if undoable
  if (recordHistory) {
    get().recordModelerHistory();
  }
  
  // 2. Generate ID
  const id = options.geometryId ?? createGeometryId("mynew");
  
  // 3. Create geometry record
  const geometry: MyNewGeometry = {
    id,
    type: "myNew",
    myData: data,
    layerId: withDefaultLayerId(layerId, get()),
    area_m2: computeArea(data),
    thickness_m: 0.1,
  };
  
  // 4. Single atomic update
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
  
  // 5. Trigger side effects
  get().recalculateWorkflow();
  
  return id;
},
```

#### 3. Implement Tessellation (`client/src/geometry/`)
```typescript
// In appropriate geometry file (e.g., myNewGeometry.ts)
export const tessellateMyNew = (data: MyNewData): RenderMesh => {
  // Convert parametric/implicit geometry to triangle mesh
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  
  // ... tessellation logic
  
  return { positions, normals, uvs, indices };
};
```

#### 4. Extend Render Adapter (`client/src/geometry/renderAdapter.ts`)
```typescript
// In GeometryRenderAdapter class
updateGeometry(geometry: Geometry): void {
  const existing = this.renderables.get(geometry.id);
  
  if (geometry.type === "vertex") {
    this.updateVertexGeometry(geometry, existing);
  } else if (geometry.type === "polyline") {
    this.updatePolylineGeometry(geometry as PolylineGeometry, existing);
  } else if (geometry.type === "myNew") {  // ADD THIS
    this.updateMyNewGeometry(geometry as MyNewGeometry, existing);
  } else if ("mesh" in geometry) {
    this.updateMeshGeometry(geometry, existing);
  }
}

private updateMyNewGeometry(geometry: MyNewGeometry, existing?: RenderableGeometry): void {
  let buffer: GeometryBuffer;
  
  if (existing) {
    buffer = existing.buffer;
  } else {
    buffer = this.renderer.createGeometryBuffer(geometry.id);
  }
  
  // Tessellate and upload to GPU
  const mesh = tessellateMyNew(geometry.myData);
  buffer.setData({
    positions: new Float32Array(mesh.positions),
    normals: new Float32Array(mesh.normals),
    uvs: new Float32Array(mesh.uvs),
    indices: new Uint16Array(mesh.indices),
  });
  
  this.renderables.set(geometry.id, {
    id: geometry.id,
    buffer,
    type: "mesh",
    needsUpdate: false,
  });
}
```

#### 5. Add Hit Testing (`client/src/geometry/hitTest.ts`)
```typescript
// In hitTestObject function (around line 200+)
export const hitTestObject = (args: ObjectHitTestArgs): HitTestResult | null => {
  // ... existing code
  
  for (const item of args.geometry) {
    if (item.type === "myNew") {
      // Implement hit testing for your type
      const mesh = tessellateMyNew((item as MyNewGeometry).myData);
      const hit = rayTriangleMeshIntersection(args.context.ray, mesh);
      if (hit) {
        return {
          kind: "object",
          geometryId: item.id,
          depth: hit.depth,
          point: hit.point,
        };
      }
    }
  }
  
  return null;
};
```

#### 6. Update Documentation
- Add to `docs/commands_nodes_reference.md`
- Update `docs/subsystems_guide.md` (Geometry Kernel section)
- Regenerate reference docs if needed

---

### Adding a New Command (COMPLETE PATTERN)

#### 1. Register Command (`client/src/commands/registry.ts`)
```typescript
export const COMMAND_DEFINITIONS: CommandDefinition[] = [
  // ... existing commands
  {
    id: "mycommand",
    label: "My Command",
    category: "geometry",  // or "performs"
    prompt: "My Command: click to do something. Esc cancels.",
  },
];
```

#### 2. Add Command Handler (in `ModelerSection.tsx` or viewport)
```typescript
// Modal command pattern (multi-step interaction)
const handleMyCommand = useCallback(() => {
  // Set up command state
  setActiveCommand("mycommand");
  setCommandPrompt("My Command: click first point...");
  
  // Command will be handled in viewport's pointer events
}, []);

// In WebGLViewerCanvas.tsx pointer handler:
if (activeCommand === "mycommand") {
  if (commandStep === 0) {
    // First click
    const point = snapToGrid(worldPoint);
    setCommandData({ startPoint: point });
    setCommandStep(1);
    setCommandPrompt("My Command: click second point...");
  } else if (commandStep === 1) {
    // Second click - execute command
    const { startPoint } = commandData;
    const endPoint = snapToGrid(worldPoint);
    
    // Record history BEFORE mutation
    recordModelerHistory();
    
    // Execute command via store action
    const id = addGeometryMyNew({
      start: startPoint,
      end: endPoint,
    });
    
    // Clean up
    setActiveCommand(null);
    setCommandStep(0);
    setSelectedGeometryIds([id]);
  }
}
```

#### 3. Immediate Command Pattern (no interaction)
```typescript
// For commands that operate on selection
const handleMyPerformCommand = useCallback(() => {
  const selected = geometry.filter(g => selectedGeometryIds.includes(g.id));
  
  if (selected.length === 0) {
    setCommandPrompt("My Command: select geometry first");
    return;
  }
  
  // Record history
  recordModelerHistory();
  
  // Perform operation
  selected.forEach(item => {
    const result = performMyOperation(item);
    updateGeometry(item.id, result);
  });
  
  setCommandPrompt("My Command: complete");
}, [geometry, selectedGeometryIds]);
```

---

### Adding a New Workflow Node (COMPLETE PATTERN)

#### 1. Update NodeType Union (`client/src/workflow/nodeTypes.ts`)
```typescript
export const SUPPORTED_WORKFLOW_NODE_TYPES = [
  // ... existing types
  "myNewNode",
] as const;

export type NodeType = typeof SUPPORTED_WORKFLOW_NODE_TYPES[number];
```

#### 2. Register Node (`client/src/workflow/nodeRegistry.ts`)
```typescript
// Add to NODE_DEFINITIONS array (around line 500+)
export const NODE_DEFINITIONS: WorkflowNodeDefinition[] = [
  // ... existing nodes
  {
    type: "myNewNode",
    label: "My New Node",
    shortLabel: "MyNew",
    description: "Does something cool with geometry.",
    category: "modifiers",  // or appropriate category
    iconId: "transform",    // from IconId type
    
    inputs: [
      {
        key: "input1",
        label: "Input 1",
        type: "geometry",
        required: true,
        description: "Input geometry",
      },
      {
        key: "param1",
        label: "Parameter 1",
        type: "number",
        parameterKey: "param1",
        defaultValue: 1.0,
      },
    ],
    
    outputs: [
      {
        key: "output1",
        label: "Output 1",
        type: "geometry",
        description: "Result geometry",
      },
    ],
    
    parameters: [
      {
        key: "param1",
        label: "Parameter 1",
        type: "slider",
        defaultValue: 1.0,
        min: 0,
        max: 10,
        step: 0.1,
      },
    ],
    
    compute: async (args: WorkflowComputeArgs) => {
      const { inputs, parameters, context } = args;
      
      // Get input geometry
      const inputGeomId = inputs.input1 as string;
      const inputGeom = context.geometryById.get(inputGeomId);
      if (!inputGeom) return null;
      
      // Get parameter
      const param1 = toNumber(parameters.param1, 1.0);
      
      // Perform computation
      const result = performMyNodeOperation(inputGeom, param1);
      
      // Return outputs
      return {
        output1: result.geometryId,
      };
    },
  },
];
```

#### 3. Add Palette Entry (`client/src/components/workflow/WorkflowSection.tsx`)
```typescript
// In node palette rendering (around line 300+)
const nodesByCategory = {
  // ... existing categories
  modifiers: [
    // ... existing nodes
    "myNewNode",
  ],
};
```

#### 4. Add Validation (`client/src/components/workflow/workflowValidation.ts`)
```typescript
// Add validation rules if needed
export const isWorkflowNodeInvalid = (
  node: WorkflowNode,
  edges: WorkflowEdge[],
  nodes: WorkflowNode[]
): string | null => {
  if (node.type === "myNewNode") {
    // Check required inputs
    const hasInput1 = edges.some(e => 
      e.target === node.id && e.targetHandle === "input1"
    );
    if (!hasInput1) {
      return "Missing required input: Input 1";
    }
  }
  
  return null;
};
```

---

## Store Action Pattern (CRITICAL)

### The Golden Pattern
```typescript
const actionName = (params: ParamsType, options: OptionsType = {}) => {
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
  
  // 4. SINGLE ATOMIC UPDATE (CRITICAL!)
  set((state) => ({
    ...state,
    someSlice: newData,
    // Update multiple slices in ONE set() call
    relatedSlice: updateRelated(newData, state),
  }));
  
  // 5. TRIGGER SIDE EFFECTS
  get().recalculateWorkflow();  // If geometry changed
  
  // 6. RETURN RESULT
  return newData.id;
};
```

### Real Example from Store
```typescript
// From useProjectStore.ts (line ~1200)
addGeometryMesh: (mesh, options = {}) => {
  const {
    recordHistory = true,
    selectIds,
    layerId,
    area_m2,
    thickness_m,
    sourceNodeId,
    geometryId,
    metadata,
    primitive,
    origin,
  } = options;
  
  if (recordHistory) {
    get().recordModelerHistory();
  }
  
  const id = geometryId ?? createGeometryId("mesh");
  const computedArea = area_m2 ?? computeMeshArea(mesh.positions, mesh.indices);
  const { volume_m3, centroid } = computeMeshVolumeAndCentroid(mesh.positions, mesh.indices);
  
  const geometry: MeshGeometry = {
    id,
    type: "mesh",
    mesh,
    layerId: withDefaultLayerId(layerId, get()),
    primitive,
    area_m2: computedArea,
    volume_m3,
    centroid,
    thickness_m: thickness_m ?? 0.1,
    sourceNodeId,
    metadata,
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

---

## Critical Gotchas (EXPANDED)

### ❌ NEVER DO THIS

#### 1. Multi-set Mutations
```typescript
// WRONG - breaks atomicity and undo
set({ geometry: newGeo });
set({ selection: newSel });  // Second set() loses first update context!

// RIGHT - single atomic update
set({ 
  geometry: newGeo, 
  selection: newSel 
});
```

#### 2. Mutate Geometry in Render Code
```typescript
// WRONG - breaks undo/history
geometry.position[0] = x;
mesh.positions[0] = newX;

// RIGHT - create new objects
const updated = { ...geometry, position: { x, y, z } };
const updatedMesh = {
  ...mesh,
  positions: [...mesh.positions],
};
updatedMesh.positions[0] = newX;
```

#### 3. Store Three.js Objects in State
```typescript
// WRONG - breaks serialization, can't undo
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

#### 4. Skip History for Undoable Actions
```typescript
// WRONG - user can't undo
const deleteGeometry = (id) => {
  set(state => ({ 
    geometry: state.geometry.filter(g => g.id !== id) 
  }));
};

// RIGHT - record before mutation
const deleteGeometry = (id, options = {}) => {
  const { recordHistory = true } = options;
  if (recordHistory) {
    get().recordModelerHistory();
  }
  set(state => ({ 
    geometry: state.geometry.filter(g => g.id !== id) 
  }));
};
```

#### 5. Forget to Update Registries
```typescript
// WRONG - node/command won't be discovered
// (just adding implementation without registration)

// RIGHT - always update registries
// 1. Add to COMMAND_DEFINITIONS in commands/registry.ts
// 2. Add to NODE_DEFINITIONS in workflow/nodeRegistry.ts
// 3. Add to SUPPORTED_WORKFLOW_NODE_TYPES in workflow/nodeTypes.ts
// 4. Regenerate reference docs
```

#### 6. Hard-code Tolerances
```typescript
// WRONG - inconsistent behavior
if (distance < 0.001) { ... }

// RIGHT - use centralized values
import { SNAP_TOLERANCE } from "../config/constants";
if (distance < SNAP_TOLERANCE) { ... }
```

#### 7. Forget reconcileGeometryCollections
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

#### 8. Dispose GPU Resources Incorrectly
```typescript
// WRONG - memory leak
buffer.setData(newData);
// ... create new buffer without disposing old one

// RIGHT - dispose before replacing
if (existingBuffer) {
  renderer.deleteGeometryBuffer(existingBuffer.id);
}
const newBuffer = renderer.createGeometryBuffer(id);
```

#### 9. Forget to Call recalculateWorkflow
```typescript
// WRONG - workflow outputs stale
addGeometryMesh(mesh);
// Workflow nodes referencing this geometry won't update!

// RIGHT - trigger recalculation
addGeometryMesh(mesh);
get().recalculateWorkflow();
```

#### 10. Use Relative Imports for Store
```typescript
// WRONG - circular dependency risk
import { useProjectStore } from "./useProjectStore";

// RIGHT - absolute import
import { useProjectStore } from "../store/useProjectStore";
```

### ⚠️ Common Pitfalls (EXPANDED)

#### Canvas Rendering is Immediate-Mode
```typescript
// Every frame, redraw EVERYTHING
const render = () => {
  ctx.clearRect(0, 0, width, height);
  
  // Draw grid
  drawGrid(ctx, transform);
  
  // Draw all edges
  edges.forEach(edge => drawEdge(ctx, edge, transform));
  
  // Draw all nodes
  nodes.forEach(node => drawNode(ctx, node, transform));
  
  // Draw overlays
  drawSelectionBox(ctx, selection, transform);
  
  requestAnimationFrame(render);
};
```

**No DOM elements, no retained scene graph!**

#### Hit Testing is Manual
```typescript
// Must manually test pointer against geometry
const hitTest = (pointer: Vec2, transform: ViewTransform): HitTarget => {
  // Test nodes
  for (const node of nodes) {
    const bounds = getNodeBounds(node, transform);
    if (pointInRect(pointer, bounds)) {
      // Test ports
      const ports = getNodePorts(node);
      for (const port of ports) {
        const portBounds = getPortBounds(port, bounds);
        if (pointInRect(pointer, portBounds)) {
          return { type: "port", nodeId: node.id, portKey: port.key };
        }
      }
      return { type: "node", nodeId: node.id };
    }
  }
  
  // Test edges
  for (const edge of edges) {
    if (pointNearEdge(pointer, edge, transform, threshold)) {
      return { type: "edge", edgeId: edge.id };
    }
  }
  
  return { type: "none" };
};
```

#### NURBS Need Tessellation
```typescript
// Can't render parametric curves directly
// Must convert to polylines first

// From renderAdapter.ts
const curve = resolvePolylineCurve(geometry, points);
const renderPoints = curve
  ? (() => {
      const tessellated = tessellateCurveAdaptive(curve);
      return tessellated.points;
    })()
  : points;

const lineData = createLineBufferData(renderPoints);
buffer.setData(lineData);
```

#### Selection Has Modes
```typescript
// Different modes affect hit testing and gizmo behavior
type SelectionMode = "object" | "vertex" | "edge" | "face";

// In hit testing:
if (selectionMode === "vertex") {
  // Test against vertices only
  return hitTestVertices(geometry, ray);
} else if (selectionMode === "edge") {
  // Test against edges only
  return hitTestEdges(geometry, ray);
} else if (selectionMode === "face") {
  // Test against faces only
  return hitTestFaces(geometry, ray);
} else {
  // Test against whole objects
  return hitTestObjects(geometry, ray);
}
```

#### Workflow Nodes are Lazy
```typescript
// Only compute when outputs requested
const evaluateNode = (nodeId: string, outputKey: string): WorkflowValue => {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return null;
  
  // Check cache first
  if (node.data.outputs?.[outputKey] !== undefined && !node.data.dirty) {
    return node.data.outputs[outputKey];
  }
  
  // Recursively evaluate inputs
  const inputs: Record<string, WorkflowValue> = {};
  const inputEdges = edges.filter(e => e.target === nodeId);
  for (const edge of inputEdges) {
    const sourceValue = evaluateNode(edge.source, edge.sourceHandle || "output");
    inputs[edge.targetHandle || "input"] = sourceValue;
  }
  
  // Compute outputs
  const definition = getNodeDefinition(node.type);
  const outputs = await definition.compute({ inputs, parameters: node.data, context });
  
  // Cache and return
  node.data.outputs = outputs;
  node.data.dirty = false;
  return outputs[outputKey];
};
```

---

## Quick Reference: Where Things Live (EXPANDED)

### When you need to...

**Add geometry type**
→ `types.ts` (line ~311, Geometry union)
→ `useProjectStore.ts` (add action ~line 1500+)
→ `geometry/` (tessellation function)
→ `renderAdapter.ts` (updateGeometry method ~line 66)
→ `hitTest.ts` (hitTestObject function ~line 200+)

**Change rendering**
→ `webgl/WebGLRenderer.ts` (render methods ~line 144+)
→ `webgl/shaders/*.ts` (GLSL shader code)
→ `renderAdapter.ts` (buffer generation)
→ `BufferManager.ts` (GPU resource management)

**Modify selection**
→ `useProjectStore.ts` (selection slice ~line 215-217)
→ `hitTest.ts` (hit testing logic)
→ `WebGLViewerCanvas.tsx` (interaction handlers ~line 1000+)

**Add command**
→ `commands/registry.ts` (COMMAND_DEFINITIONS ~line 45)
→ `ModelerSection.tsx` (command handler)
→ `WebGLViewerCanvas.tsx` (modal interaction ~line 2000+)

**Add workflow node**
→ `workflow/nodeTypes.ts` (SUPPORTED_WORKFLOW_NODE_TYPES ~line 1)
→ `workflow/nodeRegistry.ts` (NODE_DEFINITIONS ~line 500+)
→ `workflow/WorkflowSection.tsx` (palette entry ~line 300+)
→ `workflow/workflowValidation.ts` (validation rules)

**Change UI layout**
→ `App.tsx` (workspace shell ~line 100+)
→ `ModelerSection.tsx` (Roslyn panel)
→ `WorkflowSection.tsx` (Numerica panel)

**Add solver**
→ `workflow/nodes/solver/` (create MySolver.ts)
→ `workflow/nodes/solver/myWorker.ts` (Web Worker)
→ `workflow/nodes/solver/myWorkerClient.ts` (client interface)
→ `workflow/nodes/solver/goals/` (goal nodes)
→ `workflow/nodeRegistry.ts` (register node)

**Debug state**
→ React DevTools (component tree)
→ Zustand DevTools (store state)
→ Console: `useProjectStore.getState()` (inspect full state)

**Check conventions**
→ `docs/lingua_conventions.md` (naming, patterns)

**Understand architecture**
→ `docs/lingua_architecture.md` (system design)

---

## Specific Code Patterns (FROM CODEBASE)

### Geometry ID Pattern
```typescript
// From useProjectStore.ts
let geometrySequence = 0;
const createGeometryId = (prefix: string) =>
  `${prefix}-${Date.now()}-${geometrySequence++}`;

// Usage:
const id = createGeometryId("mesh");  // "mesh-1706654321000-42"
```

### Reconcile Collections Pattern
```typescript
// ALWAYS call after geometry changes
const reconciled = reconcileGeometryCollections(
  nextGeometry,
  state.layers,
  state.sceneNodes,
  state.assignments,
  state.hiddenGeometryIds,
  state.lockedGeometryIds,
  state.selectedGeometryIds
);

// Returns updated layers, sceneNodes, assignments, etc.
```

### Buffer Upload Pattern
```typescript
// From renderAdapter.ts
buffer.setData({
  positions: new Float32Array(mesh.positions),
  normals: new Float32Array(mesh.normals),
  uvs: new Float32Array(mesh.uvs),
  indices: new Uint16Array(mesh.indices),
});
```

### Shader Uniform Pattern
```typescript
// From WebGLRenderer.ts
this.shaderManager.setUniform(program, "u_modelMatrix", modelMatrix);
this.shaderManager.setUniform(program, "u_viewMatrix", viewMatrix);
this.shaderManager.setUniform(program, "u_projectionMatrix", projectionMatrix);
this.shaderManager.setUniform(program, "u_color", [r, g, b, a]);
```

### Ray Casting Pattern
```typescript
// From hitTest.ts
const rayTriangleMeshIntersection = (
  ray: Ray,
  mesh: RenderMesh
): { depth: number; point: Vec3; indices: [number, number, number] } | null => {
  let closestHit: any = null;
  let closestDepth = Infinity;
  
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const i0 = mesh.indices[i] * 3;
    const i1 = mesh.indices[i + 1] * 3;
    const i2 = mesh.indices[i + 2] * 3;
    
    const v0 = { x: mesh.positions[i0], y: mesh.positions[i0+1], z: mesh.positions[i0+2] };
    const v1 = { x: mesh.positions[i1], y: mesh.positions[i1+1], z: mesh.positions[i1+2] };
    const v2 = { x: mesh.positions[i2], y: mesh.positions[i2+1], z: mesh.positions[i2+2] };
    
    const hit = rayTriangleIntersection(ray, v0, v1, v2);
    if (hit && hit.depth < closestDepth) {
      closestDepth = hit.depth;
      closestHit = { ...hit, indices: [i0/3, i1/3, i2/3] };
    }
  }
  
  return closestHit;
};
```

### Workflow Compute Pattern
```typescript
// From nodeRegistry.ts
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

### Tessellation Pattern
```typescript
// From tessellation.ts
export const tessellateCurveAdaptive = (
  curve: NURBSCurve,
  tolerance: number = 0.01
): { points: Vec3[]; parameters: number[] } => {
  const points: Vec3[] = [];
  const parameters: number[] = [];
  
  const subdivide = (t0: number, t1: number, p0: Vec3, p1: Vec3) => {
    const tMid = (t0 + t1) / 2;
    const pMid = evaluateCurve(curve, tMid);
    const pLinear = lerp(p0, p1, 0.5);
    const error = distance(pMid, pLinear);
    
    if (error > tolerance && (t1 - t0) > 1e-6) {
      subdivide(t0, tMid, p0, pMid);
      subdivide(tMid, t1, pMid, p1);
    } else {
      points.push(p1);
      parameters.push(t1);
    }
  };
  
  const p0 = evaluateCurve(curve, 0);
  const p1 = evaluateCurve(curve, 1);
  points.push(p0);
  parameters.push(0);
  subdivide(0, 1, p0, p1);
  
  return { points, parameters };
};
```

---

## Testing & Validation Checklist (EXPANDED)

### Before Committing Changes

**TypeScript**
- [ ] `npm run build` passes (includes type checking)
- [ ] No `@ts-ignore` or `@ts-expect-error` added
- [ ] All discriminated unions exhaustive
- [ ] No `any` types (use `unknown` if needed)

**Tests**
- [ ] `npm run test` passes
- [ ] New features have corresponding tests
- [ ] Test rigs updated for solver changes
- [ ] Validation tests pass for affected solvers

**Undo/Redo**
- [ ] Geometry changes call `recordModelerHistory()`
- [ ] History recorded BEFORE mutation
- [ ] Undo restores exact previous state
- [ ] Redo works after undo
- [ ] History stack doesn't grow unbounded

**Selection**
- [ ] Object selection works
- [ ] Vertex selection works
- [ ] Edge selection works
- [ ] Face selection works
- [ ] Multi-select works (Shift+click)
- [ ] Box select works
- [ ] Selection highlights visible

**Canvas Rendering**
- [ ] No flicker during pan/zoom
- [ ] Nodes render at all zoom levels
- [ ] Edges render smoothly
- [ ] Hit testing accurate
- [ ] Frame rate stable (60fps)
- [ ] No memory leaks (check DevTools)

**WebGL Viewport**
- [ ] Geometry renders correctly
- [ ] Selection highlighting works
- [ ] Gizmo appears for selection
- [ ] Camera controls smooth
- [ ] No WebGL errors in console
- [ ] Shaders compile successfully

**Store State**
- [ ] State remains serializable (no functions/classes)
- [ ] No circular references
- [ ] IDs unique and consistent
- [ ] Collections reconciled after changes

**History Stack**
- [ ] Doesn't grow unbounded
- [ ] Workflow history capped at 40 (MAX_WORKFLOW_HISTORY)
- [ ] Modeler history reasonable size

**Registries**
- [ ] Commands registered in `commands/registry.ts`
- [ ] Nodes registered in `workflow/nodeRegistry.ts`
- [ ] Node types in `workflow/nodeTypes.ts`
- [ ] Icons exist for new nodes

**Documentation**
- [ ] Reference docs updated
- [ ] Examples work
- [ ] No broken links
- [ ] Code comments accurate

**Console**
- [ ] No errors
- [ ] No warnings (except expected)
- [ ] No unhandled promise rejections

---

## Performance Considerations (EXPANDED)

### Watch Out For

**Excessive Re-renders**
```typescript
// BAD - creates new object every render
const config = { width: 100, height: 100 };

// GOOD - memoize stable values
const config = useMemo(() => ({ width: 100, height: 100 }), []);

// BAD - new function every render
onClick={() => handleClick(id)}

// GOOD - stable callback
const handleClickMemo = useCallback(() => handleClick(id), [id]);
```

**Large Tessellations**
```typescript
// Adaptive LOD based on viewport zoom
const tessellationDetail = Math.max(
  MIN_DETAIL,
  Math.min(MAX_DETAIL, viewportZoom * BASE_DETAIL)
);

// Viewport culling
const visibleGeometry = geometry.filter(g => 
  isInViewFrustum(g, camera)
);
```

**Inefficient Raycasting**
```typescript
// BAD - test every triangle
for (const geom of allGeometry) {
  testRayIntersection(ray, geom);
}

// GOOD - spatial indexing (BVH, octree)
const candidates = spatialIndex.query(ray);
for (const geom of candidates) {
  testRayIntersection(ray, geom);
}
```

**Canvas Redraw Spam**
```typescript
// BAD - redraw on every mouse move
onMouseMove={() => {
  updateHover(pointer);
  render();  // 1000+ fps!
}};

// GOOD - throttle to 60fps
let frameRequested = false;
onMouseMove(() => {
  updateHover(pointer);
  if (!frameRequested) {
    frameRequested = true;
    requestAnimationFrame(() => {
      render();
      frameRequested = false;
    });
  }
});
```

**Memory Leaks**
```typescript
// BAD - forgot to dispose
const buffer = renderer.createGeometryBuffer(id);
// ... later, create new buffer without disposing old one

// GOOD - always dispose
if (existingBuffer) {
  renderer.deleteGeometryBuffer(existingBuffer.id);
}
const buffer = renderer.createGeometryBuffer(id);

// BAD - event listener leak
useEffect(() => {
  window.addEventListener('resize', handleResize);
  // Missing cleanup!
}, []);

// GOOD - cleanup in effect
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [handleResize]);
```

### Optimization Patterns

**Memoize Expensive Computations**
```typescript
const tessellatedMesh = useMemo(() => {
  return tessellateSurfaceAdaptive(nurbsSurface, tolerance);
}, [nurbsSurface, tolerance]);
```

**Use Stable References**
```typescript
// BAD - new array every render
const items = geometry.filter(g => g.type === "mesh");

// GOOD - memoize filtered array
const meshItems = useMemo(
  () => geometry.filter(g => g.type === "mesh"),
  [geometry]
);
```

**Batch GPU State Changes**
```typescript
// BAD - many state changes
for (const buffer of buffers) {
  renderer.setBlending(true);
  renderer.setDepthTest(false);
  renderer.renderBuffer(buffer);
}

// GOOD - batch state changes
renderer.setBlending(true);
renderer.setDepthTest(false);
for (const buffer of buffers) {
  renderer.renderBuffer(buffer);
}
```

**Cache Tessellation Results**
```typescript
// In renderAdapter.ts
private tessellationCache = new Map<string, RenderMesh>();

updateNurbsSurface(geometry: NurbsSurfaceGeometry) {
  const cacheKey = `${geometry.id}-${geometry.nurbs.hash}`;
  let mesh = this.tessellationCache.get(cacheKey);
  
  if (!mesh) {
    mesh = tessellateSurfaceAdaptive(geometry.nurbs);
    this.tessellationCache.set(cacheKey, mesh);
  }
  
  buffer.setData(mesh);
}
```

**Profile Before Optimizing**
```typescript
// Use Performance API
const start = performance.now();
performExpensiveOperation();
const end = performance.now();
console.log(`Operation took ${end - start}ms`);

// Use React DevTools Profiler
// Use Chrome DevTools Performance tab
```

---

## Common Workflows (EXPANDED)

### Debugging a Rendering Issue

1. **Check store state**
   ```typescript
   // In console
   const state = useProjectStore.getState();
   console.log("Geometry:", state.geometry);
   console.log("Selected:", state.selectedGeometryIds);
   ```

2. **Verify geometry records correct**
   ```typescript
   const geom = state.geometry.find(g => g.id === "problematic-id");
   console.log("Type:", geom.type);
   console.log("Mesh:", geom.mesh);
   console.log("Positions:", geom.mesh?.positions.length);
   ```

3. **Check render adapter buffer generation**
   ```typescript
   // In renderAdapter.ts, add logging
   updateGeometry(geometry: Geometry) {
     console.log("Updating geometry:", geometry.id, geometry.type);
     // ... rest of method
   }
   ```

4. **Inspect shader uniforms**
   ```typescript
   // In WebGLRenderer.ts
   renderGeometry(buffer, camera, uniforms) {
     console.log("Uniforms:", uniforms);
     // ... rest of method
   }
   ```

5. **Look for WebGL errors**
   ```typescript
   const error = gl.getError();
   if (error !== gl.NO_ERROR) {
     console.error("WebGL error:", error);
   }
   ```

### Debugging a Selection Issue

1. **Check selection mode**
   ```typescript
   const mode = useProjectStore.getState().selectionMode;
   console.log("Selection mode:", mode);  // "object" | "vertex" | "edge" | "face"
   ```

2. **Verify hit testing logic**
   ```typescript
   // In hitTest.ts, add logging
   export const hitTestObject = (args) => {
     console.log("Hit testing", args.geometry.length, "objects");
     // ... rest of function
   };
   ```

3. **Check raycasting math**
   ```typescript
   // In WebGLViewerCanvas.tsx
   const ray = computeRayFromPointer(pointer, camera);
   console.log("Ray:", ray.origin, ray.dir);
   ```

4. **Inspect selection state**
   ```typescript
   const state = useProjectStore.getState();
   console.log("Selected IDs:", state.selectedGeometryIds);
   console.log("Component selection:", state.componentSelection);
   ```

5. **Verify gizmo responds**
   ```typescript
   // Check if gizmo renders
   const hasSelection = state.selectedGeometryIds.length > 0;
   console.log("Should show gizmo:", hasSelection);
   ```

### Debugging a Workflow Issue

1. **Check node types registered**
   ```typescript
   import { NODE_DEFINITIONS } from "./workflow/nodeRegistry";
   console.log("Registered nodes:", NODE_DEFINITIONS.map(n => n.type));
   ```

2. **Verify edge connections valid**
   ```typescript
   const { nodes, edges } = useProjectStore.getState().workflow;
   edges.forEach(edge => {
     const source = nodes.find(n => n.id === edge.source);
     const target = nodes.find(n => n.id === edge.target);
     if (!source || !target) {
       console.error("Invalid edge:", edge);
     }
   });
   ```

3. **Inspect evaluation order**
   ```typescript
   // In workflowEngine.ts, add logging
   export const evaluateWorkflow = (nodes, edges, context) => {
     const sorted = topologicalSort(nodes, edges);
     console.log("Evaluation order:", sorted.map(n => n.type));
     // ... rest of function
   };
   ```

4. **Check cache invalidation**
   ```typescript
   nodes.forEach(node => {
     console.log(node.id, "dirty:", node.data.dirty);
     console.log(node.id, "outputs:", node.data.outputs);
   });
   ```

5. **Look for circular dependencies**
   ```typescript
   const hasCycle = detectCycle(nodes, edges);
   if (hasCycle) {
     console.error("Circular dependency detected!");
   }
   ```

### Adding a Complex Feature

1. **Read relevant architecture docs**
   - `lingua_architecture.md` for system design
   - `subsystems_guide.md` for subsystem details
   - `lingua_conventions.md` for patterns

2. **Identify all affected subsystems**
   - Geometry kernel?
   - Rendering pipeline?
   - Store actions?
   - Workflow nodes?
   - UI components?

3. **Update types first**
   ```typescript
   // In types.ts
   export type MyNewFeature = {
     // Define data model
   };
   ```

4. **Implement data model + store actions**
   ```typescript
   // In useProjectStore.ts
   addMyFeature: (data) => {
     get().recordModelerHistory();
     // ... implementation
   };
   ```

5. **Add rendering/UI last**
   ```typescript
   // In renderAdapter.ts or components
   // Implement visual representation
   ```

6. **Test integration end-to-end**
   - Create feature via UI
   - Verify state updates
   - Check rendering
   - Test undo/redo
   - Verify workflow integration

7. **Update documentation**
   - Add to relevant .md files
   - Update reference docs
   - Add examples

---

## When to Read Full Docs

- **New to codebase** → `lingua_readme.md`, then `lingua_architecture.md`
- **Adding geometry features** → `subsystems_guide.md` (Geometry Kernel)
- **Working on viewport** → `subsystems_guide.md` (Viewport) + `webgl_rendering_style.md`
- **Working on workflow** → `numerica_technical_spec.md` + `subsystems_guide.md` (Workflow)
- **Adding solvers** → `solver_architecture_guide.md`
- **Large refactor** → Use `plans.md` template

---

## Emergency Contacts (Docs)

**Something broke?**
1. `lingua_conventions.md` - patterns you might have violated
2. `ai_agent_guide.md` - detailed subsystem integration
3. `subsystems_guide.md` - how components interact
4. Look at similar existing implementations

**Need specific area?**
- Geometry math → `geometry_mathematics_spec.md`
- NURBS → `nurbs_workflow_spec.md`
- Solvers → `solver_architecture_guide.md`, `numerica_solvers_guide.md`
- Biological → `biological_solver_implementation.md`
- Chemistry → `epilytes_chemias_implementation.md`

---

## Final Notes

- **Living codebase** - patterns evolve, docs lag slightly
- **Code is authoritative** - when in doubt, read implementation
- **Document new patterns** - update this file and relevant docs
- **Test integrations** - features must work end-to-end
- **Use type system** - TypeScript catches bugs
- **Keep it functional** - geometry ops pure, store is single source of truth

**For large refactors: see `plans.md` for structured workflow.**

---

## Quick Stats

- **Store**: 10,717 lines (useProjectStore.ts)
- **Viewport**: 8,900 lines (WebGLViewerCanvas.tsx)
- **Canvas**: 5,882 lines (NumericalCanvas.tsx)
- **Node Registry**: 12,622 lines (nodeRegistry.ts)
- **Render Adapter**: 1,219 lines (renderAdapter.ts)
- **Mesh Operations**: 1,150 lines (mesh.ts)
- **Hit Testing**: 852 lines (hitTest.ts)
- **WebGL Renderer**: 698 lines (WebGLRenderer.ts)
- **Types**: 566 lines (types.ts)
- **Commands**: 561 lines (registry.ts)
- **Physics Solver**: 281 lines (PhysicsSolver.ts)

**Total codebase: ~50,000+ lines of TypeScript**
