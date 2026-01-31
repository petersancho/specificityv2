# Large Refactor & Codebase Sweep Template

**Purpose:** Structured workflow for implementing large refactors, codebase-wide updates, or multi-subsystem changes.

**Last Updated:** After comprehensive codebase sweep with real implementation details

---

## When to Use This Template

Use this workflow for:
- **Large refactors** - changing core abstractions, data models, or APIs
- **Codebase sweeps** - updating patterns across many files
- **Multi-subsystem changes** - features touching geometry, rendering, workflow, and UI
- **Breaking changes** - modifications requiring coordinated updates
- **Performance overhauls** - systematic optimization across layers
- **New geometry types** - adding to the discriminated union
- **New solver implementations** - physics/biology/chemistry solvers
- **Rendering pipeline changes** - shaders, buffers, adapters

---

## Phase 0: Planning & Scoping

### 1. Define the Goal
**What:** Clear statement of what you're changing and why.
**Why:** Business/technical justification.
**Success criteria:** How you'll know it's done.

**Example:**
- What: Add stress visualization to mesh geometry
- Why: Users need to see structural analysis results
- Success: Meshes display color-coded stress values, legend shows scale

### 2. Identify Affected Subsystems

**Checklist:**
- [ ] **Geometry kernel** (`client/src/geometry/`, `types.ts`)
  - Adding new geometry type?
  - Modifying existing geometry operations?
  - Changing RenderMesh structure?
  
- [ ] **State store** (`useProjectStore.ts` - 10,717 lines!)
  - New state slices?
  - New actions?
  - Modified action signatures?
  
- [ ] **WebGL rendering** (`webgl/`, render adapter, shaders)
  - New shaders?
  - Modified uniforms?
  - Buffer structure changes?
  
- [ ] **Viewport** (`WebGLViewerCanvas.tsx` - 8,900 lines!)
  - Interaction changes?
  - Hit testing modifications?
  - Gizmo updates?
  
- [ ] **Commands** (`commands/registry.ts`)
  - New commands?
  - Modified command flow?
  
- [ ] **Workflow system** (`workflow/`, `NumericalCanvas.tsx` - 5,882 lines!)
  - New node types?
  - Modified evaluation?
  - Canvas rendering changes?
  
- [ ] **Solvers** (`workflow/nodes/solver/`)
  - New solver type?
  - Modified solver interface?
  - Worker changes?
  
- [ ] **UI components** (section components, panels)
  - New UI elements?
  - Modified layouts?
  
- [ ] **Documentation** (`docs/`)
  - Reference docs?
  - Architecture docs?
  - Agent guides?

### 3. Map Dependencies

**Upstream dependencies:** What must change first?
```
Example: Stress visualization
1. Add stress data to MeshGeometry type (types.ts)
2. Add stress computation function (geometry/physical.ts)
3. Add store action to compute stress (useProjectStore.ts)
4. Add stress attribute to RenderMesh (types.ts)
5. Update render adapter to handle stress (renderAdapter.ts)
6. Add stress shader (webgl/shaders/stress.*.ts)
7. Add UI controls (ModelerSection.tsx)
```

**Downstream dependencies:** What breaks if you change X?
```
Example: Changing RenderMesh structure
- GeometryRenderAdapter.updateMeshGeometry() breaks
- BufferManager.setData() may need updates
- All shader attribute bindings need review
- Hit testing may need mesh structure
- Tessellation functions return RenderMesh
- Export/import (meshIo.ts) breaks
```

**Integration points:** Where do subsystems connect?
```
Store ←→ Components (via useProjectStore hook)
Store ←→ Geometry Kernel (via actions calling pure functions)
Geometry Records ←→ GPU Buffers (via GeometryRenderAdapter)
Viewport ←→ Store (via actions for mutations)
Workflow Nodes ←→ Store (via context.geometryById)
```

### 4. Risk Assessment

**High-risk areas:**
- **Core types** (`types.ts` Geometry union) - breaks everything
- **Store actions** (signature changes) - breaks all consumers
- **Render pipeline** (shader changes) - visual regressions
- **History/undo** (state shape changes) - data loss risk
- **Worker interfaces** (solver protocol) - breaks async communication

**Mitigation strategies:**
- Incremental rollout (feature flags if needed)
- Parallel implementations (old + new, switch gradually)
- Comprehensive testing at each checkpoint
- Frequent commits to safe rollback points

### 5. Create Checkpoint Plan

**Checkpoint criteria:**
- Code compiles without errors
- Core features still work (even if incomplete)
- You can demonstrate progress
- You can commit/push safely
- You can pause and resume later

**Example checkpoints for stress visualization:**
1. Types updated, code compiles
2. Store action implemented, can compute stress
3. Render adapter handles stress data
4. Shader renders stress colors
5. UI controls added
6. Documentation complete

---

## Phase 1: Type System Updates

### Step 1: Update Core Types (`client/src/types.ts`)

**Current Geometry union (line ~311):**
```typescript
export type Geometry =
  | VertexGeometry
  | PolylineGeometry
  | SurfaceGeometry
  | LoftGeometry
  | ExtrudeGeometry
  | MeshGeometry
  | NurbsCurveGeometry
  | NurbsSurfaceGeometry
  | BRepGeometry;
```

**Actions:**
- [ ] Update discriminated unions
- [ ] Add new type variants
- [ ] Update existing type fields
- [ ] Add migration helpers if needed
- [ ] Document breaking changes

**Example: Adding stress data to MeshGeometry:**
```typescript
export type MeshGeometry = {
  id: string;
  type: "mesh";
  mesh: RenderMesh;
  layerId: string;
  primitive?: MeshPrimitiveInfo;
  area_m2?: number;
  volume_m3?: number;
  centroid?: Vec3;
  mass_kg?: number;
  inertiaTensor_kg_m2?: InertiaTensor;
  thickness_m?: number;
  sourceNodeId?: string;
  metadata?: Record<string, unknown>;
  stressData?: StressAnalysisResult;  // NEW FIELD
};

export type StressAnalysisResult = {
  elementStresses: number[];  // Per-element von Mises stress
  vertexStresses: number[];   // Per-vertex interpolated stress
  maxStress: number;
  minStress: number;
  timestamp: number;
};
```

**Validation:**
- [ ] TypeScript compiles
- [ ] No type errors in IDE
- [ ] Discriminated unions exhaustive
- [ ] All geometry types still valid

### Step 2: Update Store Types (`client/src/store/useProjectStore.ts`)

**Store structure (line ~210):**
```typescript
type ProjectStore = {
  // ... existing state
  
  // Add new state if needed
  stressVisualizationEnabled?: boolean;
  stressColorScale?: "viridis" | "plasma" | "inferno";
  
  // Add new actions
  computeStressAnalysis: (geometryId: string, options?: StressOptions) => void;
  updateStressVisualization: (enabled: boolean) => void;
};
```

**Actions:**
- [ ] Update state slice types
- [ ] Update action signatures
- [ ] Add new state fields with defaults
- [ ] Update selectors if needed

**Validation:**
- [ ] Store compiles
- [ ] No type mismatches
- [ ] Selectors return correct types
- [ ] Default values provided

---

## Phase 2: Data Model & Store Actions

### Step 1: Update Store State

**Location:** `client/src/store/useProjectStore.ts` (around line 500+ for defaults)

**Pattern:**
```typescript
const defaultStressSettings = {
  enabled: false,
  colorScale: "viridis" as const,
  showLegend: true,
  autoScale: true,
};
```

**Actions:**
- [ ] Add/modify state slices
- [ ] Initialize new fields with defaults
- [ ] Preserve backward compatibility if needed
- [ ] Update state shape documentation

### Step 2: Implement Store Actions

**Location:** `client/src/store/useProjectStore.ts` (around line 1500+ for actions)

**The Golden Pattern (CRITICAL):**
```typescript
computeStressAnalysis: (geometryId, options = {}) => {
  const { recordHistory = true } = options;
  
  // 1. VALIDATE INPUTS
  const geometry = get().geometry.find(g => g.id === geometryId);
  if (!geometry || geometry.type !== "mesh") {
    console.warn("Invalid geometry for stress analysis");
    return;
  }
  
  // 2. RECORD HISTORY (if undoable)
  if (recordHistory) {
    get().recordModelerHistory();
  }
  
  // 3. COMPUTE NEW STATE
  const stressData = computeMeshStress(
    geometry.mesh,
    options.loads ?? [],
    options.constraints ?? []
  );
  
  // 4. SINGLE ATOMIC UPDATE (CRITICAL!)
  set((state) => ({
    ...state,
    geometry: state.geometry.map(g =>
      g.id === geometryId && g.type === "mesh"
        ? { ...g, stressData }
        : g
    ),
  }));
  
  // 5. TRIGGER SIDE EFFECTS
  get().recalculateWorkflow();
  
  // 6. RETURN RESULT
  return stressData;
},
```

**Real example from codebase (addGeometryMesh, line ~1200):**
```typescript
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

**Actions:**
- [ ] Update existing actions for new types
- [ ] Add new actions as needed
- [ ] Maintain atomicity (single `set()` call)
- [ ] Preserve history recording
- [ ] Call `reconcileGeometryCollections` if geometry changed
- [ ] Update action documentation

**Validation:**
- [ ] Actions compile
- [ ] No runtime errors
- [ ] Undo/redo still works
- [ ] State updates atomic
- [ ] Side effects trigger correctly

---

## Phase 3: Geometry Kernel Updates

### Step 1: Update Geometry Operations

**Location:** `client/src/geometry/*.ts`

**Example: Add stress computation (`client/src/geometry/physical.ts`):**
```typescript
export const computeMeshStress = (
  mesh: RenderMesh,
  loads: Load[],
  constraints: Constraint[]
): StressAnalysisResult => {
  // 1. Build stiffness matrix
  const K = buildStiffnessMatrix(mesh);
  
  // 2. Apply boundary conditions
  applyConstraints(K, constraints);
  
  // 3. Solve for displacements
  const u = solveLinearSystem(K, loads);
  
  // 4. Compute element stresses
  const elementStresses = computeElementStresses(mesh, u);
  
  // 5. Interpolate to vertices
  const vertexStresses = interpolateToVertices(mesh, elementStresses);
  
  return {
    elementStresses,
    vertexStresses,
    maxStress: Math.max(...vertexStresses),
    minStress: Math.min(...vertexStresses),
    timestamp: Date.now(),
  };
};
```

**Pattern from codebase (`geometry/mesh.ts`, line ~81):**
```typescript
export const computeVertexNormals = (positions: number[], indices: number[]) => {
  const normals = new Array(positions.length).fill(0);
  
  // Accumulate face normals
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;
    
    // Get triangle vertices
    const ax = positions[ia], ay = positions[ia + 1], az = positions[ia + 2];
    const bx = positions[ib], by = positions[ib + 1], bz = positions[ib + 2];
    const cx = positions[ic], cy = positions[ic + 1], cz = positions[ic + 2];
    
    // Compute face normal via cross product
    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    
    // Accumulate to vertices
    normals[ia] += nx; normals[ia + 1] += ny; normals[ia + 2] += nz;
    normals[ib] += nx; normals[ib + 1] += ny; normals[ib + 2] += nz;
    normals[ic] += nx; normals[ic + 1] += ny; normals[ic + 2] += nz;
  }
  
  // Normalize
  for (let i = 0; i < normals.length; i += 3) {
    const nx = normals[i], ny = normals[i + 1], nz = normals[i + 2];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    normals[i] = nx / len;
    normals[i + 1] = ny / len;
    normals[i + 2] = nz / len;
  }
  
  return normals;
};
```

**Actions:**
- [ ] Update pure functions for new types
- [ ] Maintain functional purity (no mutations)
- [ ] Add new geometric operations
- [ ] Update tessellation logic if needed
- [ ] Update transformation logic if needed

**Validation:**
- [ ] Functions are pure (no side effects)
- [ ] Return new records, don't mutate inputs
- [ ] Handle all geometry variants
- [ ] Tolerances consistent
- [ ] Performance acceptable

### Step 2: Update Hit Testing

**Location:** `client/src/geometry/hitTest.ts` (852 lines)

**Pattern from codebase (line ~142):**
```typescript
const distancePointToSegment3d = (point: Vec3, a: Vec3, b: Vec3) => {
  const ab = sub(b, a);
  const ap = sub(point, a);
  const denom = dot(ab, ab);
  if (denom <= 1e-12) {
    return length(ap);
  }
  const t = clamp(dot(ap, ab) / denom, 0, 1);
  const closest = add(a, scale(ab, t));
  return length(sub(point, closest));
};
```

**Actions:**
- [ ] Update raycasting for new types
- [ ] Update component selection logic
- [ ] Maintain tolerance consistency
- [ ] Handle edge cases
- [ ] Test with various geometries

**Validation:**
- [ ] Selection works in viewport
- [ ] Hit testing accurate
- [ ] Performance acceptable
- [ ] Edge cases handled

---

## Phase 4: Rendering Pipeline Updates

### Step 1: Update Render Adapter

**Location:** `client/src/geometry/renderAdapter.ts` (1,219 lines)

**Pattern from codebase (line ~66):**
```typescript
updateGeometry(geometry: Geometry): void {
  const existing = this.renderables.get(geometry.id);
  
  if (geometry.type === "vertex") {
    this.updateVertexGeometry(geometry, existing);
  } else if (geometry.type === "polyline") {
    this.updatePolylineGeometry(geometry as PolylineGeometry, existing);
  } else if (geometry.type === "nurbsCurve") {
    this.updateNurbsCurveGeometry(geometry as NurbsCurveGeometry, existing);
  } else if (geometry.type === "nurbsSurface" || geometry.type === "brep") {
    this.updateMeshGeometry(geometry, existing);
  } else if ("mesh" in geometry) {
    this.updateMeshGeometry(geometry, existing);
  }
}
```

**Example: Add stress visualization:**
```typescript
private updateMeshGeometry(geometry: MeshGeometry, existing?: RenderableGeometry): void {
  let buffer: GeometryBuffer;
  
  if (existing) {
    buffer = existing.buffer;
  } else {
    buffer = this.renderer.createGeometryBuffer(geometry.id);
  }
  
  const mesh = geometry.mesh;
  
  // Add stress colors if available
  let colors: Float32Array | undefined;
  if (geometry.stressData) {
    colors = new Float32Array(
      buildStressVertexColors(
        geometry.stressData.vertexStresses,
        geometry.stressData.minStress,
        geometry.stressData.maxStress
      )
    );
  }
  
  buffer.setData({
    positions: new Float32Array(mesh.positions),
    normals: new Float32Array(mesh.normals),
    uvs: new Float32Array(mesh.uvs),
    indices: new Uint16Array(mesh.indices),
    colors,  // Optional stress colors
  });
  
  this.renderables.set(geometry.id, {
    id: geometry.id,
    buffer,
    type: "mesh",
    needsUpdate: false,
  });
}
```

**Actions:**
- [ ] Handle new geometry types
- [ ] Generate correct GPU buffers
- [ ] Update attribute layouts
- [ ] Maintain buffer lifecycle
- [ ] Dispose old buffers properly

**Validation:**
- [ ] Buffers created correctly
- [ ] Attributes match shader expectations
- [ ] No memory leaks
- [ ] Performance acceptable

### Step 2: Update Shaders (if needed)

**Location:** `client/src/webgl/shaders/*.ts`

**Existing shaders:**
- `geometry.vert.ts` / `geometry.frag.ts` - main geometry rendering
- `line.vert.ts` / `line.frag.ts` - line rendering with anti-aliasing
- `edge.*.ts` - edge rendering
- `point.*.ts` - point rendering
- `atmosphere.*.ts` - background

**Example: Add stress visualization shader:**
```typescript
// stress.vert.ts
export const stressVertexShader = `
  attribute vec3 a_position;
  attribute vec3 a_normal;
  attribute vec3 a_color;  // Stress color from vertex attribute
  
  uniform mat4 u_modelMatrix;
  uniform mat4 u_viewMatrix;
  uniform mat4 u_projectionMatrix;
  uniform mat3 u_normalMatrix;
  
  varying vec3 v_normal;
  varying vec3 v_color;
  
  void main() {
    v_normal = u_normalMatrix * a_normal;
    v_color = a_color;
    gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position, 1.0);
  }
`;

// stress.frag.ts
export const stressFragmentShader = `
  precision mediump float;
  
  varying vec3 v_normal;
  varying vec3 v_color;
  
  uniform vec3 u_lightDirection;
  uniform float u_ambient;
  
  void main() {
    vec3 normal = normalize(v_normal);
    float diffuse = max(dot(normal, u_lightDirection), 0.0);
    float lighting = u_ambient + (1.0 - u_ambient) * diffuse;
    
    gl_FragColor = vec4(v_color * lighting, 1.0);
  }
`;
```

**Actions:**
- [ ] Update vertex shaders
- [ ] Update fragment shaders
- [ ] Add new uniforms if needed
- [ ] Update shader manager registration

**Validation:**
- [ ] Shaders compile
- [ ] Rendering correct
- [ ] No visual regressions
- [ ] Performance acceptable

### Step 3: Update WebGL Renderer

**Location:** `client/src/webgl/WebGLRenderer.ts` (698 lines)

**Pattern from codebase (line ~144):**
```typescript
renderGeometry(
  buffer: GeometryBuffer,
  camera: Camera,
  uniforms: Record<string, any>
): void {
  const program = this.shaderManager.getProgram("geometry");
  if (!program) return;
  
  this.shaderManager.useProgram(program);
  
  // Set uniforms
  this.shaderManager.setUniform(program, "u_modelMatrix", uniforms.modelMatrix);
  this.shaderManager.setUniform(program, "u_viewMatrix", uniforms.viewMatrix);
  this.shaderManager.setUniform(program, "u_projectionMatrix", uniforms.projectionMatrix);
  this.shaderManager.setUniform(program, "u_color", uniforms.color);
  
  // Bind buffers and draw
  buffer.bind(program);
  buffer.draw();
}
```

**Actions:**
- [ ] Update draw calls
- [ ] Update uniform management
- [ ] Update buffer binding
- [ ] Maintain render order
- [ ] Add new render methods if needed

**Validation:**
- [ ] Viewport renders correctly
- [ ] No WebGL errors
- [ ] Frame rate acceptable
- [ ] Selection highlighting works

---

## Phase 5: Viewport & Interaction Updates

### Step 1: Update Viewport Component

**Location:** `client/src/components/WebGLViewerCanvas.tsx` (8,900 lines!)

**Key sections:**
- Line ~100: Constants (ORBIT_SPEED, PAN_SPEED, etc.)
- Line ~1000+: Pointer event handlers
- Line ~2000+: Modal command handling
- Line ~3000+: Gizmo integration
- Line ~4000+: Rendering loop

**Example: Add stress visualization toggle:**
```typescript
// In pointer handler
const handlePointerDown = useCallback((event: PointerEvent) => {
  // ... existing code
  
  // Add stress visualization on Ctrl+S
  if (event.ctrlKey && event.key === 's') {
    const enabled = !stressVisualizationEnabled;
    updateStressVisualization(enabled);
    
    if (enabled && selectedGeometryIds.length > 0) {
      selectedGeometryIds.forEach(id => {
        computeStressAnalysis(id);
      });
    }
  }
}, [stressVisualizationEnabled, selectedGeometryIds]);
```

**Actions:**
- [ ] Update interaction handlers
- [ ] Update session patterns
- [ ] Update preview rendering
- [ ] Maintain gizmo integration
- [ ] Add keyboard shortcuts if needed

**Validation:**
- [ ] Interactions work correctly
- [ ] Preview rendering correct
- [ ] Gizmo responds properly
- [ ] No interaction lag
- [ ] Keyboard shortcuts work

### Step 2: Update Command System (if needed)

**Location:** `client/src/commands/registry.ts` (561 lines)

**Pattern from codebase (line ~45):**
```typescript
export const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    id: "point",
    label: "Point",
    category: "geometry",
    prompt: "Point: click to place a point. Esc cancels.",
  },
  {
    id: "line",
    label: "Line",
    category: "geometry",
    prompt: "Line: click start, click end to place a segment. Double-click to finish. Esc cancels.",
  },
  // ... more commands
];
```

**Actions:**
- [ ] Update command definitions
- [ ] Update command handlers
- [ ] Update validation logic
- [ ] Update modal interactions
- [ ] Update command prompts

**Validation:**
- [ ] Commands execute correctly
- [ ] Validation works
- [ ] Modal commands complete properly
- [ ] History recording correct
- [ ] Prompts clear and helpful

---

## Phase 6: Workflow System Updates

### Step 1: Update Node Registry

**Location:** `client/src/workflow/nodeRegistry.ts` (12,622 lines!)

**Pattern from codebase (line ~1):**
```typescript
export type WorkflowNodeDefinition = {
  type: NodeType;
  label: string;
  shortLabel: string;
  description: string;
  category: NodeCategoryId;
  iconId: IconId;
  inputs: WorkflowPortSpec[];
  outputs: WorkflowPortSpec[];
  parameters: WorkflowParameterSpec[];
  compute: (args: WorkflowComputeArgs) => Promise<Record<string, WorkflowValue> | null>;
};
```

**Example: Add stress analysis node:**
```typescript
{
  type: "stressAnalysis",
  label: "Stress Analysis",
  shortLabel: "Stress",
  description: "Computes structural stress analysis on mesh geometry.",
  category: "analysis",
  iconId: "analysis",
  
  inputs: [
    {
      key: "mesh",
      label: "Mesh",
      type: "geometry",
      required: true,
      description: "Input mesh geometry",
    },
    {
      key: "loads",
      label: "Loads",
      type: "goal",
      allowMultiple: true,
      description: "Load specifications",
    },
    {
      key: "constraints",
      label: "Constraints",
      type: "goal",
      allowMultiple: true,
      description: "Constraint specifications",
    },
  ],
  
  outputs: [
    {
      key: "geometry",
      label: "Geometry",
      type: "geometry",
      description: "Mesh with stress data",
    },
    {
      key: "maxStress",
      label: "Max Stress",
      type: "number",
      description: "Maximum stress value",
    },
    {
      key: "stressField",
      label: "Stress Field",
      type: "any",
      description: "Full stress analysis result",
    },
  ],
  
  parameters: [
    {
      key: "youngsModulus",
      label: "Young's Modulus (Pa)",
      type: "number",
      defaultValue: 200e9,
      min: 1e6,
      max: 1e12,
    },
    {
      key: "poissonsRatio",
      label: "Poisson's Ratio",
      type: "slider",
      defaultValue: 0.3,
      min: 0,
      max: 0.5,
      step: 0.01,
    },
  ],
  
  compute: async (args: WorkflowComputeArgs) => {
    const { inputs, parameters, context } = args;
    
    // Get input mesh
    const meshId = inputs.mesh as string;
    const geometry = context.geometryById.get(meshId);
    if (!geometry || geometry.type !== "mesh") return null;
    
    // Extract parameters
    const E = toNumber(parameters.youngsModulus, 200e9);
    const nu = toNumber(parameters.poissonsRatio, 0.3);
    
    // Compute stress
    const stressData = computeMeshStress(
      geometry.mesh,
      inputs.loads as GoalSpecification[],
      inputs.constraints as GoalSpecification[],
      { youngsModulus: E, poissonsRatio: nu }
    );
    
    // Update geometry with stress data
    const updatedGeometry: MeshGeometry = {
      ...geometry,
      stressData,
    };
    
    // Store updated geometry
    context.updateGeometry(geometry.id, { stressData });
    
    return {
      geometry: geometry.id,
      maxStress: stressData.maxStress,
      stressField: stressData,
    };
  },
},
```

**Actions:**
- [ ] Update node type definitions
- [ ] Update compute functions
- [ ] Update port definitions
- [ ] Update node metadata
- [ ] Add to NODE_DEFINITIONS array

**Validation:**
- [ ] Nodes register correctly
- [ ] Compute functions work
- [ ] Port types correct
- [ ] Metadata accurate
- [ ] Async operations handled

### Step 2: Update Workflow Engine

**Location:** `client/src/workflow/workflowEngine.ts`

**Actions:**
- [ ] Update evaluation logic if needed
- [ ] Update cache invalidation
- [ ] Update dependency resolution
- [ ] Maintain lazy evaluation
- [ ] Handle async compute functions

**Validation:**
- [ ] Evaluation correct
- [ ] Caching works
- [ ] No circular dependencies
- [ ] Performance acceptable
- [ ] Errors handled gracefully

### Step 3: Update Canvas Renderer

**Location:** `client/src/components/workflow/NumericalCanvas.tsx` (5,882 lines!)

**Key sections:**
- Line ~40: Type definitions (ViewTransform, HitTarget, etc.)
- Line ~150: Canvas palette
- Line ~500+: Hit testing
- Line ~1000+: Rendering loop
- Line ~2000+: Interaction handlers

**Actions:**
- [ ] Update node rendering if needed
- [ ] Update connection rendering
- [ ] Update hit testing
- [ ] Update interaction handling
- [ ] Maintain 60fps performance

**Validation:**
- [ ] Canvas renders correctly
- [ ] Hit testing accurate
- [ ] Interactions smooth
- [ ] No rendering lag
- [ ] Zoom/pan works

### Step 4: Update Validation

**Location:** `client/src/components/workflow/workflowValidation.ts`

**Actions:**
- [ ] Update validation rules
- [ ] Update error messages
- [ ] Update type checking
- [ ] Update connection validation
- [ ] Add new validation for new nodes

**Validation:**
- [ ] Validation catches errors
- [ ] Error messages helpful
- [ ] Type checking correct
- [ ] No false positives
- [ ] Performance acceptable

---

## Phase 7: UI Component Updates

### Step 1: Update Section Components

**Locations:**
- `client/src/components/ModelerSection.tsx` - Roslyn panel
- `client/src/components/workflow/WorkflowSection.tsx` - Numerica panel

**Actions:**
- [ ] Update UI for new features
- [ ] Update palette entries
- [ ] Update control panels
- [ ] Update status displays
- [ ] Add tooltips/help text

**Validation:**
- [ ] UI renders correctly
- [ ] Controls work properly
- [ ] Layout responsive
- [ ] No visual glitches
- [ ] Tooltips helpful

### Step 2: Update Specialized Components

**Actions:**
- [ ] Update geometry viewers
- [ ] Update parameter controls
- [ ] Update solver UIs
- [ ] Update documentation panels
- [ ] Update settings panels

**Validation:**
- [ ] Components render correctly
- [ ] State updates propagate
- [ ] No prop drilling issues
- [ ] Performance acceptable
- [ ] Accessibility maintained

---

## Phase 8: Documentation Updates

### Step 1: Update Core Documentation

**Files to update:**
- `docs/lingua_architecture.md` - system design
- `docs/subsystems_guide.md` - subsystem details
- `docs/lingua_conventions.md` - coding patterns
- `docs/ai_agent_guide.md` - detailed agent guide
- `docs/agents.md` - quick reference (this file!)

**Actions:**
- [ ] Update architecture docs
- [ ] Update subsystems guide
- [ ] Update conventions
- [ ] Update agent guides
- [ ] Add examples

**Validation:**
- [ ] Docs accurate
- [ ] Examples work
- [ ] Links valid
- [ ] Formatting correct

### Step 2: Update Reference Documentation

**Files:**
- `docs/commands_nodes_reference.md`
- `docs/numerica_nodes_reference.md`
- `docs/command_node_test_matrix.md`

**Actions:**
- [ ] Regenerate command reference
- [ ] Regenerate node reference
- [ ] Update test matrices
- [ ] Update glossaries
- [ ] Add new entries

**Validation:**
- [ ] References complete
- [ ] Metadata accurate
- [ ] Examples current
- [ ] Cross-links work

### Step 3: Update Inline Documentation

**Actions:**
- [ ] Update JSDoc comments
- [ ] Update type documentation
- [ ] Update function descriptions
- [ ] Update usage examples
- [ ] Remove stale comments

**Validation:**
- [ ] Comments accurate
- [ ] Types documented
- [ ] Examples work
- [ ] No stale comments

---

## Phase 9: Testing & Validation

### Integration Testing Checklist

**Geometry Operations:**
- [ ] Create all primitive types
- [ ] Transform geometry (translate/rotate/scale)
- [ ] Select geometry (object/vertex/edge/face)
- [ ] Delete geometry
- [ ] Undo/redo geometry changes

**Rendering:**
- [ ] All geometry types render
- [ ] Selection highlighting works
- [ ] Gizmo appears and works
- [ ] Camera controls smooth
- [ ] No visual glitches
- [ ] Frame rate stable (60fps)

**Workflow:**
- [ ] Create nodes
- [ ] Connect nodes
- [ ] Evaluate graph
- [ ] Modify parameters
- [ ] Delete nodes/edges
- [ ] Undo workflow changes

**Commands:**
- [ ] All commands execute
- [ ] Modal commands work
- [ ] Command prompts clear
- [ ] Esc cancels correctly
- [ ] History recorded

**Solvers:**
- [ ] Solver setup works
- [ ] Solver runs successfully
- [ ] Results display correctly
- [ ] Cancel works
- [ ] Restart works

**Persistence:**
- [ ] Save project
- [ ] Load project
- [ ] State preserved
- [ ] No corruption
- [ ] Undo/redo across save

**Performance:**
- [ ] No memory leaks
- [ ] Frame rate stable
- [ ] Large scenes performant
- [ ] Worker threads responsive

### Manual Test Scenarios

**1. Basic Modeling Workflow**
```
1. Create box primitive
2. Select box
3. Translate with gizmo
4. Rotate with gizmo
5. Scale with gizmo
6. Undo all operations
7. Redo all operations
8. Delete box
9. Undo delete
```

**2. Workflow Graph Workflow**
```
1. Add geometry reference node
2. Add transform node
3. Connect nodes
4. Modify transform parameters
5. See geometry update in viewport
6. Add another node
7. Delete edge
8. Reconnect differently
9. Undo changes
```

**3. Solver Workflow**
```
1. Create mesh
2. Add physics solver node
3. Add anchor goal
4. Add load goal
5. Connect mesh to solver
6. Run solver
7. View deformed result
8. Adjust parameters
9. Re-run solver
10. Cancel mid-run
```

**4. Selection Workflow**
```
1. Create multiple objects
2. Select one (click)
3. Multi-select (Shift+click)
4. Box select (drag)
5. Switch to vertex mode
6. Select vertices
7. Switch to edge mode
8. Select edges
9. Switch to face mode
10. Select faces
```

### Regression Testing

**Run existing test suites:**
```bash
npm run test
npm run type-check
npm run lint
```

**Check for:**
- [ ] No new console errors
- [ ] No new console warnings
- [ ] No visual regressions
- [ ] Performance metrics stable
- [ ] Edge cases handled

---

## Phase 10: Cleanup & Polish

### Code Cleanup

- [ ] Remove dead code
- [ ] Remove debug logging
- [ ] Remove commented code
- [ ] Remove unused imports
- [ ] Format code consistently (Prettier)
- [ ] Fix linter warnings

### Performance Optimization

**Profile hot paths:**
```typescript
const start = performance.now();
performExpensiveOperation();
const end = performance.now();
console.log(`Operation took ${end - start}ms`);
```

**Optimize bottlenecks:**
- [ ] Reduce re-renders (useMemo, useCallback)
- [ ] Optimize GPU usage (batch state changes)
- [ ] Cache expensive computations
- [ ] Use spatial indexing for hit testing
- [ ] Throttle canvas redraws to 60fps

### Final Validation

- [ ] TypeScript strict mode passes
- [ ] No linter warnings
- [ ] No console errors
- [ ] All tests pass
- [ ] Documentation complete
- [ ] Examples work
- [ ] Performance acceptable
- [ ] Memory usage stable

---

## Checkpoint Strategy

### Checkpoint Criteria

A good checkpoint is when:
- Code compiles without errors
- Core features work (even if incomplete)
- You can demonstrate progress
- You can commit/push safely
- You can pause and resume later

### Recommended Checkpoints

1. **Types updated** - all type definitions complete, code compiles
2. **Store updated** - state and actions working, tests pass
3. **Geometry kernel updated** - operations working, pure functions tested
4. **Rendering working** - viewport displays correctly, no WebGL errors
5. **Interactions working** - user can interact, selection works
6. **Workflow working** - graphs evaluate correctly, nodes compute
7. **UI polished** - all components updated, controls work
8. **Docs complete** - documentation current, examples work
9. **Tests passing** - validation complete, no regressions
10. **Ready to ship** - all cleanup done, performance good

### Between Checkpoints

- Commit frequently to local branches
- Write descriptive commit messages
- Keep notes on what's left
- Document blockers/issues
- Update this plan as needed
- Test incrementally

---

## Rollback Strategy

### If Things Break

1. **Identify the break** - what stopped working?
2. **Check recent changes** - what did you just modify?
3. **Revert if needed** - `git reset` to last good checkpoint
4. **Fix incrementally** - smaller changes, test more
5. **Update plan** - adjust approach based on learning

### Safe Rollback Points

- After each checkpoint
- Before major subsystem changes
- Before breaking changes
- Before risky refactors
- Before large commits

### Git Commands

```bash
# See recent commits
git log --oneline -10

# Revert to specific commit (soft - keeps changes)
git reset --soft <commit-hash>

# Revert to specific commit (hard - discards changes)
git reset --hard <commit-hash>

# Create checkpoint branch
git checkout -b checkpoint-phase-3

# Stash current work
git stash save "WIP: phase 4 in progress"

# Restore stashed work
git stash pop
```

---

## Communication & Documentation

### Progress Updates

Document:
- What's complete
- What's in progress
- What's blocked
- What's next
- Estimated time remaining

### Decision Log

Record:
- Major design decisions
- Trade-offs made
- Alternatives considered
- Rationale for choices
- Impact on other systems

### Issue Tracking

Track:
- Known bugs
- Edge cases
- Performance issues
- Technical debt
- Future improvements
- Breaking changes

---

## Post-Completion Checklist

### Before Marking Complete

- [ ] All phases complete
- [ ] All validation passing
- [ ] Documentation updated
- [ ] Tests passing
- [ ] Performance acceptable
- [ ] No known critical bugs
- [ ] Code reviewed (if applicable)
- [ ] Ready for production
- [ ] Changelog updated
- [ ] Migration guide written (if breaking)

### Handoff Documentation

- [ ] Summary of changes
- [ ] Migration guide (if breaking)
- [ ] Known limitations
- [ ] Future work identified
- [ ] Contact for questions
- [ ] Deployment notes

---

## Real Example: Adding Mesh Stress Analysis

### Phase 0: Planning

**Goal:** Add stress visualization to mesh geometry
**Subsystems affected:**
- Types (add StressAnalysisResult)
- Store (add computeStressAnalysis action)
- Geometry kernel (add computeMeshStress function)
- Rendering (add stress colors to buffers)
- Shaders (add stress visualization shader)
- Viewport (add stress toggle)
- Workflow (add stress analysis node)
- UI (add stress controls)

**Risk:** Performance with large meshes, shader complexity

### Phase 1: Types

```typescript
// types.ts
export type StressAnalysisResult = {
  elementStresses: number[];
  vertexStresses: number[];
  maxStress: number;
  minStress: number;
  timestamp: number;
};

export type MeshGeometry = {
  // ... existing fields
  stressData?: StressAnalysisResult;
};
```

### Phase 2: Store

```typescript
// useProjectStore.ts
computeStressAnalysis: (geometryId, options = {}) => {
  const geometry = get().geometry.find(g => g.id === geometryId);
  if (!geometry || geometry.type !== "mesh") return;
  
  get().recordModelerHistory();
  
  const stressData = computeMeshStress(
    geometry.mesh,
    options.loads ?? [],
    options.constraints ?? []
  );
  
  set(state => ({
    geometry: state.geometry.map(g =>
      g.id === geometryId ? { ...g, stressData } : g
    ),
  }));
  
  get().recalculateWorkflow();
  return stressData;
},
```

### Phase 3: Geometry

```typescript
// geometry/physical.ts
export const computeMeshStress = (
  mesh: RenderMesh,
  loads: Load[],
  constraints: Constraint[]
): StressAnalysisResult => {
  // FEA implementation
  const K = buildStiffnessMatrix(mesh);
  applyConstraints(K, constraints);
  const u = solveLinearSystem(K, loads);
  const elementStresses = computeElementStresses(mesh, u);
  const vertexStresses = interpolateToVertices(mesh, elementStresses);
  
  return {
    elementStresses,
    vertexStresses,
    maxStress: Math.max(...vertexStresses),
    minStress: Math.min(...vertexStresses),
    timestamp: Date.now(),
  };
};
```

### Phase 4: Rendering

```typescript
// renderAdapter.ts
private updateMeshGeometry(geometry: MeshGeometry, existing?: RenderableGeometry): void {
  // ... existing code
  
  let colors: Float32Array | undefined;
  if (geometry.stressData) {
    colors = new Float32Array(
      buildStressVertexColors(
        geometry.stressData.vertexStresses,
        geometry.stressData.minStress,
        geometry.stressData.maxStress
      )
    );
  }
  
  buffer.setData({
    positions: new Float32Array(mesh.positions),
    normals: new Float32Array(mesh.normals),
    uvs: new Float32Array(mesh.uvs),
    indices: new Uint16Array(mesh.indices),
    colors,
  });
}
```

### Phase 5: Viewport

```typescript
// WebGLViewerCanvas.tsx
const handleKeyDown = useCallback((event: KeyboardEvent) => {
  if (event.ctrlKey && event.key === 's') {
    const enabled = !stressVisualizationEnabled;
    updateStressVisualization(enabled);
    
    if (enabled && selectedGeometryIds.length > 0) {
      selectedGeometryIds.forEach(id => {
        computeStressAnalysis(id);
      });
    }
  }
}, [stressVisualizationEnabled, selectedGeometryIds]);
```

### Phase 6: Workflow

```typescript
// nodeRegistry.ts
{
  type: "stressAnalysis",
  label: "Stress Analysis",
  // ... full node definition
  compute: async (args) => {
    const meshId = args.inputs.mesh as string;
    const geometry = args.context.geometryById.get(meshId);
    const stressData = computeMeshStress(geometry.mesh, ...);
    return { geometry: meshId, maxStress: stressData.maxStress };
  },
}
```

### Phase 7: UI

```typescript
// ModelerSection.tsx
<button onClick={() => computeStressAnalysis(selectedGeometryIds[0])}>
  Analyze Stress
</button>
```

### Phase 8: Docs

Update:
- `subsystems_guide.md` - add stress analysis section
- `commands_nodes_reference.md` - add stress node
- `agents.md` - add stress example

### Phase 9: Testing

- [ ] Stress computation accurate
- [ ] Rendering performance good
- [ ] Workflow integration works
- [ ] UI controls responsive
- [ ] Undo/redo works

### Phase 10: Polish

- [ ] Optimize stress computation
- [ ] Improve color scale
- [ ] Add tooltips
- [ ] Add legend
- [ ] Add help text

---

## Tips for Success

1. **Start small** - prove concept before going wide
2. **Test frequently** - catch issues early
3. **Commit often** - create safe rollback points
4. **Document decisions** - future you will thank you
5. **Ask for help** - consult docs or examples when stuck
6. **Stay organized** - use this template, update as you go
7. **Be patient** - large refactors take time
8. **Celebrate progress** - acknowledge each checkpoint
9. **Profile before optimizing** - measure, don't guess
10. **Keep it functional** - pure functions, immutable data

---

## Template Usage

1. **Copy this template** for your specific refactor
2. **Fill in Phase 0** completely before starting
3. **Work through phases** sequentially
4. **Check off items** as you complete them
5. **Update the plan** as you learn
6. **Document issues** and decisions
7. **Celebrate when done!**

---

## Key Codebase Stats (For Reference)

- **Store**: 10,717 lines (`useProjectStore.ts`)
- **Viewport**: 8,900 lines (`WebGLViewerCanvas.tsx`)
- **Canvas**: 5,882 lines (`NumericalCanvas.tsx`)
- **Node Registry**: 12,622 lines (`nodeRegistry.ts`)
- **Render Adapter**: 1,219 lines (`renderAdapter.ts`)
- **Mesh Operations**: 1,150 lines (`mesh.ts`)
- **Hit Testing**: 852 lines (`hitTest.ts`)
- **WebGL Renderer**: 698 lines (`WebGLRenderer.ts`)
- **Types**: 566 lines (`types.ts`)
- **Commands**: 561 lines (`registry.ts`)
- **Physics Solver**: 281 lines (`PhysicsSolver.ts`)

**Total codebase: ~50,000+ lines of TypeScript**

---

**Remember:** Large refactors are marathons, not sprints. Take breaks, stay organized, and trust the process. Use checkpoints liberally, test frequently, and document as you go. You've got this! 🚀
