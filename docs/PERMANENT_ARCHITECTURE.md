# PERMANENT ARCHITECTURE

**Status:** Set in Stone  
**Purpose:** Define immutable architectural structures vs malleable user-configurable elements

---

## 🏛️ PERMANENT STRUCTURES (Unchangeable)

These are the foundational architectural elements that MUST NOT change. They define the ontological structure of Lingua.

### 1. GEOMETRY ACCESS PATTERN

**PERMANENT:**
```typescript
// All nodes MUST access geometry via context.geometryById
const geometryId = inputs.geometry as string | undefined;
const geometry = context.geometryById.get(geometryId);
```

**NEVER:**
```typescript
// NEVER treat inputs.geometry as a Geometry object
const geometry = inputs.geometry as Geometry; // ❌ WRONG
```

**Rationale:** Enables caching, optimization, and consistent geometry lifecycle management.

---

### 2. GEOMETRY OUTPUT PATTERN

**PERMANENT:**
```typescript
// All geometry-generating nodes MUST return meshData in outputs
return {
  meshData: mesh, // RenderMesh for rendering
  // ... other outputs
};
```

**Rationale:** Separates computation (node) from rendering (handler). Enables workflow evaluation before rendering.

---

### 3. NODE STRUCTURE SCHEMA

**PERMANENT:**
```typescript
export type NodeDefinition = {
  type: string;              // PERMANENT: lowerCamelCase, unique identifier
  label: string;             // PERMANENT: Title Case, human-readable
  category: string;          // PERMANENT: One of 24 categories
  color: string;             // PERMANENT: CMYK semantic color
  inputs: InputPort[];       // PERMANENT: Array of input ports
  outputs: OutputPort[];     // PERMANENT: Array of output ports
  parameters: Parameter[];   // PERMANENT: Array of parameters
  compute: ComputeFunction;  // PERMANENT: Pure function (inputs → outputs)
};
```

**Rationale:** Consistent structure enables tooling, validation, and documentation generation.

---

### 4. INPUT ↔ PARAMETER LINKING

**PERMANENT:**
```typescript
// Input ports that have corresponding parameters MUST include parameterKey
{
  key: "resolution",           // PERMANENT: Input port key
  label: "Resolution",         // PERMANENT: Human-readable label
  type: "number",              // PERMANENT: Type from TYPE_SEMANTICS
  parameterKey: "resolution",  // PERMANENT: Links to parameter
  defaultValue: 16,            // PERMANENT: Fallback value
}
```

**Rationale:** Enables workflow engine to resolve input values from edges OR parameters.

---

### 5. CMYK SEMANTIC COLOR SYSTEM

**PERMANENT:**

| Color | Hex | Meaning | Port Types | Categories |
|-------|-----|---------|------------|------------|
| 🟡 Yellow | `#ffdd00` | Numeric/Quantitative | `number`, `vector` | math, basics, arrays, ranges, signals |
| 🟣 Magenta | `#ff0099` | Logic/Goals | `boolean`, `goal`, `fitnessSpec` | logic, goal, optimization |
| 🔵 Cyan | `#00d4ff` | Text/Specifications | `string`, `genomeSpec`, `phenotypeSpec` | data, lists, interop, measurement, analysis |
| ⚫ Black | `#000000` | Geometry/Structure | `geometry`, `mesh`, `voxelGrid`, `brep` | primitives, curves, mesh, brep, voxel, solver |

**Rationale:** Visual consistency, semantic clarity, accessibility.

---

### 6. NAMING CONVENTIONS

**PERMANENT:**

| Element | Convention | Examples |
|---------|-----------|----------|
| Node Type | `lowerCamelCase` | `box`, `sphere`, `voxelSolver` |
| Port Key | `lowerCamelCase` | `geometry`, `resolution`, `meshData` |
| Parameter Key | `lowerCamelCase` | `resolution`, `boxWidth`, `sphereRadius` |
| Label | `Title Case` | "Geometry", "Resolution", "Mesh Data" |
| Function Name | `lowerCamelCase` | `voxelize`, `generateMesh`, `computeBounds` |
| Type Name | `PascalCase` | `Geometry`, `RenderMesh`, `VoxelGrid` |

**Rationale:** Consistency enables code generation, documentation, and developer onboarding.

---

### 7. WORKFLOW EVALUATION ORDER

**PERMANENT:**
```
1. evaluateWorkflow()
   ↓ Computes all node outputs
   
2. applyDependentGeometryNodesToGeometry()
   ↓ Handles Box, Sphere, etc. (creates base geometry)
   
3. evaluateWorkflow() (re-evaluation)
   ↓ Nodes can now access created geometry
   
4. applyChemistryNodesToGeometry()
   ↓ Handles ChemistrySolver (modifies geometry)
   
5. applyVoxelSolverNodesToGeometry()
   ↓ Handles VoxelSolver (generates voxel mesh)
   
6. applyOtherGeometryHandlers()
   ↓ Handles remaining geometry-generating nodes
```

**Rationale:** Ensures geometry is created before it's accessed. Enables multi-pass evaluation.

---

### 8. CONTEXT OBJECT STRUCTURE

**PERMANENT:**
```typescript
export type ComputeContext = {
  geometryById: Map<string, Geometry>;     // PERMANENT: Geometry registry
  nodeMetaById: Map<string, NodeMeta>;     // PERMANENT: Node metadata
  evaluateOutput: EvaluateOutputFn;        // PERMANENT: Evaluate other nodes
  // Future: materialById, textureById, etc.
};
```

**Rationale:** Provides nodes with access to global state without tight coupling.

---

### 9. TYPE SYSTEM SEMANTICS

**PERMANENT:**

| Type | Category | CMYK | Description | Validation |
|------|----------|------|-------------|------------|
| `number` | Numeric | Yellow | Scalar numeric value | `typeof v === "number" && Number.isFinite(v)` |
| `vector` | Numeric | Yellow | 3D vector (Vec3) | `v.x !== undefined && v.y !== undefined && v.z !== undefined` |
| `boolean` | Logic | Magenta | Boolean value | `typeof v === "boolean"` |
| `string` | Text | Cyan | Text string | `typeof v === "string"` |
| `geometry` | Geometry | Black | Geometry ID (string) | `typeof v === "string"` |
| `mesh` | Geometry | Black | Mesh data (RenderMesh) | `v.positions && v.indices` |
| `voxelGrid` | Geometry | Black | Voxel grid data | `v.resolution && v.bounds && v.densities` |

**Rationale:** Clear semantic meaning for all types. Enables validation and type coercion.

---

### 10. EPSILON CONSTANTS

**PERMANENT:**
```typescript
export const EPSILON = {
  GEOMETRIC: 1e-10,  // For geometric comparisons (point equality, colinearity)
  NUMERIC: 1e-14,    // For numeric precision (matrix operations, determinants)
  ANGULAR: 1e-8,     // For angle comparisons (radians)
  DISTANCE: 1e-6,    // For distance comparisons (meters, user-facing)
};
```

**Rationale:** Consistent numerical precision across all geometry operations.

---

### 11. COORDINATE SYSTEM

**PERMANENT:**
- **Handedness:** Right-handed coordinate system
- **Up Vector:** +Y is up
- **Forward Vector:** -Z is forward (camera looks down -Z)
- **Units:** Meters (user-facing), unitless (internal)

**Rationale:** Consistency with WebGPU, Three.js, and industry standards.

---

### 12. GEOMETRY HANDLER PATTERN

**PERMANENT:**
```typescript
// In useProjectStore.ts
if (node.type === "voxelSolver") {
  const meshData = outputs?.meshData as RenderMesh | undefined;
  
  if (!meshData || meshData.positions.length === 0) {
    return node; // Early return if no mesh
  }
  
  upsertMeshGeometry(
    geometryId,
    meshData,
    undefined,
    { geometryById, updates, itemsToAdd },
    node.id,
    { subtype: "voxels", renderOptions: { forceSolidPreview: true } }
  );
}
```

**Rationale:** Consistent pattern for all geometry-generating nodes. Separates computation from rendering.

---

### 13. SOLVER NODE PATTERN

**PERMANENT:**

All solver nodes MUST:
1. Have `category: "solver"`
2. Have `color: "#000000"` (black)
3. Accept `geometry` input (geometry ID)
4. Access geometry via `context.geometryById.get(geometryId)`
5. Return `meshData` output (RenderMesh)
6. Have a handler in `useProjectStore.ts`
7. Follow naming convention: `*Solver` (e.g., `voxelSolver`, `chemistrySolver`)

**Rationale:** Consistent pattern for all optimization/simulation solvers.

---

### 14. GOAL NODE PATTERN

**PERMANENT:**

All goal nodes MUST:
1. Have `category: "goal"`
2. Have `color: "#ff0099"` (magenta)
3. Return `goal` output (GoalSpecification)
4. Have `goalType` field in output
5. Follow naming convention: `*Goal` (e.g., `volumeGoal`, `stressGoal`)

**Rationale:** Consistent pattern for all optimization goals.

---

### 15. MATH LIBRARY STRUCTURE

**PERMANENT:**

```
/client/src/math/
  vector.ts       // Vec3 operations (add, sub, scale, dot, cross, normalize, etc.)
  matrix.ts       // Mat4 operations (multiply, translation, rotation, etc.)
  quaternion.ts   // Quaternion operations (multiply, slerp, fromAxisAngle, etc.)
  constants.ts    // EPSILON values, mathematical constants
  predicates.ts   // Geometric predicates (orient3D, inSphere, inCircle)
```

**Rationale:** Modular math library with clear separation of concerns.

---

### 16. GEOMETRY KERNEL STRUCTURE

**PERMANENT:**

```
/client/src/geometry/
  primitives/     // Box, sphere, cylinder, etc.
  curves/         // Bezier, NURBS curves
  surfaces/       // NURBS surfaces, lofting
  mesh/           // Mesh generation, tessellation
  brep/           // Boundary representation
  voxel/          // Voxelization, marching cubes
  boolean/        // Boolean operations (union, intersection, difference)
  analysis/       // Bounds, volume, area, etc.
  transform/      // Transformations (translate, rotate, scale)
```

**Rationale:** Modular geometry kernel with clear separation of concerns.

---

### 17. RENDERING PIPELINE

**PERMANENT:**

```
Geometry (NUMERICA) → RenderMesh → GPUMesh (ROSLYN) → WebGPU
```

**Conversion:**
- `RenderMesh` = CPU-side mesh (positions, normals, indices, uvs, colors)
- `GPUMesh` = GPU-side mesh (vertex buffer, index buffer, bind groups)

**Rationale:** Clear separation between computation (CPU) and rendering (GPU).

---

## 🌊 MALLEABLE ELEMENTS (User-Configurable)

These are the elements that users can configure, extend, or modify.

### 1. PARAMETER VALUES

**MALLEABLE:**
- All parameter values (resolution, width, height, etc.)
- Slider ranges (min, max, step)
- Default values

**Example:**
```typescript
parameters: [
  {
    key: "resolution",
    label: "Resolution",
    type: "number",
    defaultValue: 16,    // MALLEABLE: User can change
    min: 4,              // MALLEABLE: User can change
    max: 128,            // MALLEABLE: User can change
    step: 1,             // MALLEABLE: User can change
  },
],
```

---

### 2. NODE CONNECTIONS

**MALLEABLE:**
- Which nodes are connected
- Edge routing
- Workflow topology

**Rationale:** Users create workflows by connecting nodes.

---

### 3. NODE POSITIONS

**MALLEABLE:**
- Node positions in Numerica canvas
- Node layout
- Zoom level

**Rationale:** Users organize their workspace.

---

### 4. GEOMETRY VISIBILITY

**MALLEABLE:**
- Which geometry is visible in Roslyn
- Hidden geometry IDs
- Render options (wireframe, solid, etc.)

**Rationale:** Users control what they see.

---

### 5. CAMERA SETTINGS

**MALLEABLE:**
- Camera position
- Camera target
- Field of view
- Near/far planes

**Rationale:** Users control their view.

---

### 6. MATERIAL PROPERTIES

**MALLEABLE:**
- Material colors
- Material roughness
- Material metalness
- Material opacity

**Rationale:** Users control appearance.

---

### 7. SOLVER PARAMETERS

**MALLEABLE:**
- Solver iterations
- Convergence tolerance
- Optimization parameters

**Rationale:** Users control solver behavior.

---

### 8. CUSTOM NODES (Future)

**MALLEABLE:**
- User-defined nodes
- Custom compute functions
- Custom parameters

**Rationale:** Users extend Lingua with custom functionality.

---

## 🎯 SUMMARY

**PERMANENT = ARCHITECTURAL**
- Geometry access pattern
- Node structure schema
- CMYK color system
- Naming conventions
- Workflow evaluation order
- Type system semantics
- Math library structure
- Geometry kernel structure
- Rendering pipeline

**MALLEABLE = USER-CONFIGURABLE**
- Parameter values
- Node connections
- Node positions
- Geometry visibility
- Camera settings
- Material properties
- Solver parameters
- Custom nodes (future)

---

**This distinction enables:**
1. **Stability** - Core architecture doesn't change
2. **Flexibility** - Users can configure and extend
3. **Consistency** - All nodes follow same patterns
4. **Scalability** - New nodes follow established patterns
5. **Maintainability** - Clear separation of concerns

---

**The Lingua Philosophy:**
- **Narrow** - Focused on geometry and computation
- **Direct** - Clear, unambiguous patterns
- **Precise** - Mathematically sound, semantically consistent

---

**Last Updated:** 2026-01-31  
**Status:** Set in Stone ✅
