# LINGUA ONTOLOGY MASTER SPECIFICATION

**Version:** 2.0  
**Date:** 2026-01-31  
**Status:** Active

---

## 🎯 CORE ONTOLOGICAL PRINCIPLE

**The most important ontological rule in Lingua is the linkage between geometry and UI/rendering.**

All geometry must flow through a consistent, traceable path:
```
Input (geometry ID) → Context Lookup → Geometry Object → Processing → Output (geometry ID) → Rendering
```

---

## 📐 GEOMETRY LINKAGE RULES

### Rule 1: Geometry Access Pattern

**ALL nodes that consume geometry MUST use this pattern:**

```typescript
// ✅ CORRECT
const geometryId = inputs.geometry as string | undefined;
const geometry = context.geometryById.get(geometryId) as Geometry | undefined;

// ❌ WRONG
const geometry = inputs.geometry as Geometry; // Never treat input as direct object
```

**Why:** Geometry is stored in a centralized registry. Nodes receive geometry IDs (strings), not geometry objects. This ensures:
- Single source of truth
- Efficient memory usage
- Proper update propagation
- Traceable data flow

### Rule 2: Geometry Output Pattern

**ALL nodes that generate geometry MUST return geometry data in outputs:**

```typescript
// ✅ CORRECT
compute: ({ inputs, parameters, context }) => {
  const mesh = generateMesh(...);
  return {
    meshData: mesh,  // Return mesh in outputs
    // ... other outputs
  };
}

// ❌ WRONG
compute: ({ inputs, parameters, context, updateGeometry }) => {
  const mesh = generateMesh(...);
  updateGeometry(mesh);  // updateGeometry doesn't exist
  return {};
}
```

**Why:** The workflow engine evaluates nodes and collects outputs. A separate geometry handler phase then reads outputs and updates the geometry registry. This separation ensures:
- Clear data flow
- Predictable evaluation order
- Easier debugging
- Consistent behavior

### Rule 3: Geometry Handler Pattern

**ALL geometry-generating nodes MUST have a handler in `useProjectStore.ts`:**

```typescript
// In applyDependentGeometryNodesToGeometry() or similar function
if (node.type === "myGeometryNode") {
  const meshData = outputs?.meshData as RenderMesh | undefined;
  
  if (!meshData || meshData.positions.length === 0) {
    return node; // Early return if no geometry
  }
  
  upsertMeshGeometry(
    geometryId,
    meshData,
    undefined,
    { geometryById, updates, itemsToAdd },
    node.id,
    { subtype: "custom", renderOptions: { /* ... */ } }
  );
}
```

**Why:** Geometry handlers run after workflow evaluation and are responsible for:
- Reading geometry data from node outputs
- Updating the geometry registry
- Triggering UI updates
- Managing geometry lifecycle

---

## 🔗 INPUT/OUTPUT LINKAGE RULES

### Rule 4: Input Port ↔ Parameter Linking

**ALL input ports that have corresponding parameters MUST include `parameterKey`:**

```typescript
// ✅ CORRECT
inputs: [
  { 
    key: "resolution", 
    label: "Resolution", 
    type: "number",
    parameterKey: "resolution",  // Links to parameter
    defaultValue: 16              // Fallback value
  }
],
parameters: [
  { 
    key: "resolution", 
    label: "Resolution", 
    type: "number", 
    defaultValue: 16, 
    min: 4, 
    max: 128 
  }
]
```

**Fallback Chain:**
1. Incoming edge value (highest priority)
2. Parameter value (if `parameterKey` is set)
3. Default value (if `defaultValue` is set)
4. `undefined` (lowest priority)

**Why:** This pattern allows nodes to work both:
- With edges connected (parametric workflow)
- Without edges (standalone with UI controls)

### Rule 5: Port Type Consistency

**ALL ports MUST use semantic types from the CMYK color system:**

| Color | Type | Semantic Meaning | Examples |
|-------|------|------------------|----------|
| 🟡 Yellow | `number`, `vector` | Numeric/Scalar/Vector | width, height, resolution, position |
| 🟣 Magenta | `boolean`, `goal`, `fitnessSpec` | Logic/Boolean/Goals | enabled, condition, optimization goal |
| 🔵 Cyan | `string`, `genomeSpec`, `phenotypeSpec` | Text/String/Specs | name, label, material spec |
| ⚫ Black | `geometry`, `mesh`, `voxelGrid`, `any` | Geometry/Structure | mesh data, voxel grid, BREP |

**Why:** Consistent type semantics enable:
- Visual recognition (color-coded ports)
- Type safety
- Clear data flow understanding
- Ontological alignment

---

## 🏗️ NODE STRUCTURE RULES

### Rule 6: Standard Node Definition

**ALL nodes MUST follow this structure:**

```typescript
{
  type: "nodeName",                    // Unique ID (lowerCamelCase)
  label: "Node Name",                  // Display name (Title Case)
  shortLabel: "Short",                 // Abbreviated label
  description: "What this node does.", // Clear, concise description
  category: "categoryId",              // Category for organization
  iconId: "icon-name",                 // Icon identifier
  
  inputs: [
    {
      key: "inputName",                // Input port ID (lowerCamelCase)
      label: "Input Name",             // Display label (Title Case)
      type: "portType",                // Port type (see Rule 5)
      parameterKey: "paramName",       // Optional: link to parameter
      defaultValue: null,              // Optional: fallback value
      description: "Input description" // Optional: tooltip text
    }
  ],
  
  outputs: [
    {
      key: "outputName",               // Output port ID (lowerCamelCase)
      label: "Output Name",            // Display label (Title Case)
      type: "portType",                // Port type (see Rule 5)
      description: "Output description"// Optional: tooltip text
    }
  ],
  
  parameters: [
    {
      key: "paramName",                // Parameter ID (lowerCamelCase)
      label: "Param Name",             // Display label (Title Case)
      type: "number",                  // Parameter type
      defaultValue: 1,                 // Default value
      min: 0,                          // Optional: minimum value
      max: 10,                         // Optional: maximum value
      step: 0.1                        // Optional: increment step
    }
  ],
  
  primaryOutputKey: "outputName",      // Main output port
  
  compute: ({ inputs, parameters, context }) => {
    // 1. Access geometry via context.geometryById (Rule 1)
    // 2. Process inputs and parameters
    // 3. Generate outputs
    // 4. Return outputs object (Rule 2)
    
    return {
      outputName: result
    };
  }
}
```

### Rule 7: Naming Conventions

| Element | Convention | Examples |
|---------|-----------|----------|
| Node Type ID | `lowerCamelCase`, unique | `box`, `sphere`, `voxelSolver` |
| Input Port Key | `lowerCamelCase`, semantic | `geometry`, `resolution`, `width` |
| Output Port Key | `lowerCamelCase`, semantic | `meshData`, `voxelGrid`, `fillRatio` |
| Parameter Key | `lowerCamelCase`, semantic | `resolution`, `boxWidth`, `sphereRadius` |
| Labels | Title Case, human-readable | "Geometry", "Resolution", "Voxel Grid" |
| Category ID | `lowercase`, no spaces | `primitives`, `solver`, `mesh` |

**Why:** Consistent naming enables:
- Code readability
- Predictable API
- Easier refactoring
- Clear semantics

---

## 🎨 UI/BACKEND ALIGNMENT RULES

### Rule 8: UI Locked to Backend

**The UI MUST ONLY present ports and parameters that exist in the backend node definition.**

**Implementation:**
- UI reads port definitions from `nodeRegistry.ts`
- UI renders input handles from `nodeDef.inputs`
- UI renders output handles from `nodeDef.outputs`
- UI renders parameter controls from `nodeDef.parameters`
- NO hardcoded ports or parameters in UI components

**Why:** This ensures:
- UI/backend consistency
- No phantom ports
- Predictable behavior
- Single source of truth

### Rule 9: CMYK Visual Conventions

**ALL ports MUST use CMYK colors for visual consistency:**

```typescript
import { getPortColor, getCategoryColor } from "./colors";

// Port colors
const portColor = getPortColor(port.type);  // Returns CMYK color

// Category colors
const categoryColor = getCategoryColor(node.category);  // Returns CMYK color
```

**Color Mapping:**
- Yellow (#ffdd00) - Numeric/Scalar/Vector
- Magenta (#ff0099) - Logic/Boolean/Goals
- Cyan (#00d4ff) - Text/String/Specs
- Black (#000000) - Geometry/Structure

**Why:** Visual consistency enables:
- Quick port type recognition
- Reduced cognitive load
- Professional appearance
- Ontological alignment

---

## 🔄 WORKFLOW EVALUATION RULES

### Rule 10: Evaluation Order

**Workflow evaluation follows this order:**

1. **Workflow Evaluation** - Evaluate all nodes, collect outputs
2. **Geometry Handlers** - Process geometry-generating nodes
3. **Re-evaluation** - Re-evaluate nodes that depend on new geometry
4. **Solver Handlers** - Process solver nodes (may run after geometry is populated)

**Example:**
```
1. evaluateWorkflow()
   ├─ Box node computes (no geometry yet)
   └─ VoxelSolver computes (can't find Box geometry yet)

2. applyDependentGeometryNodesToGeometry()
   └─ Box handler creates mesh geometry ✅

3. evaluateWorkflow() (re-evaluation)
   └─ VoxelSolver computes (now has Box geometry) ✅

4. applyVoxelSolverNodesToGeometry()
   └─ VoxelSolver handler creates voxel mesh ✅
```

**Why:** This order ensures:
- Geometry is available when needed
- Solvers can access input geometry
- Proper dependency resolution
- Predictable behavior

### Rule 11: Context Object

**ALL compute functions receive a context object with:**

```typescript
interface WorkflowComputeContext {
  geometryById: Map<string, Geometry>;      // Geometry registry
  vertexById: Map<string, Vec3>;            // Vertex registry
  nodeById: Map<string, WorkflowNode>;      // Node registry
  // ... other registries
}
```

**Usage:**
```typescript
compute: ({ inputs, parameters, context }) => {
  const geometryId = inputs.geometry as string;
  const geometry = context.geometryById.get(geometryId);
  // ... process geometry
}
```

**Why:** Context provides:
- Access to all registries
- Centralized data access
- Type-safe lookups
- Consistent API

---

## 🧪 SOLVER-SPECIFIC RULES

### Rule 12: Solver Node Pattern

**ALL solver nodes MUST:**

1. Accept geometry input via `geometry` or `domain` port
2. Access geometry via `context.geometryById` (Rule 1)
3. Return `meshData` output for rendering (Rule 2)
4. Have a geometry handler in `useProjectStore.ts` (Rule 3)
5. Validate inputs and provide meaningful errors

**Example:**
```typescript
{
  type: "mySolver",
  inputs: [
    { key: "geometry", label: "Geometry", type: "geometry" },
    { key: "resolution", label: "Resolution", type: "number", parameterKey: "resolution", defaultValue: 16 }
  ],
  outputs: [
    { key: "meshData", label: "Mesh Data", type: "mesh" },
    { key: "stats", label: "Stats", type: "any" }
  ],
  compute: ({ inputs, parameters, context }) => {
    const geometryId = inputs.geometry as string | undefined;
    const geometry = context.geometryById.get(geometryId);
    
    if (!geometry) {
      return { meshData: EMPTY_MESH, stats: null };
    }
    
    const result = solveProblem(geometry, inputs.resolution);
    
    return {
      meshData: result.mesh,
      stats: result.stats
    };
  }
}
```

### Rule 13: Goal Node Pattern

**ALL goal nodes MUST:**

1. Accept inputs that define the goal (vertices, values, etc.)
2. Return a `GoalSpecification` object
3. Include `goalType`, `weight`, `geometry`, and `parameters` fields
4. Be validated by solver validation functions

**Example:**
```typescript
{
  type: "myGoal",
  inputs: [
    { key: "vertices", label: "Vertices", type: "any", allowMultiple: true },
    { key: "weight", label: "Weight", type: "number", parameterKey: "weight", defaultValue: 1.0 }
  ],
  outputs: [
    { key: "goal", label: "Goal", type: "goal" }
  ],
  compute: ({ inputs, parameters }) => {
    const goal: GoalSpecification = {
      goalType: "myGoal",
      weight: inputs.weight ?? parameters.weight ?? 1.0,
      geometry: {
        elements: toIndexList(inputs.vertices)
      },
      parameters: {
        // ... goal-specific parameters
      }
    };
    
    return { goal };
  }
}
```

---

## 📚 DOCUMENTATION RULES

### Rule 14: Node Documentation

**ALL nodes MUST have:**

1. Clear, concise `description` field
2. Accurate `label` and `shortLabel`
3. Descriptive input/output port labels
4. Meaningful parameter labels and ranges

**Example:**
```typescript
{
  type: "voxelSolver",
  label: "Voxel Solver",
  shortLabel: "Voxel",
  description: "Converts geometry into a voxel grid representation.",
  // ...
}
```

### Rule 15: Code Documentation

**ALL complex functions MUST have:**

1. JSDoc comments explaining purpose
2. Parameter descriptions
3. Return value descriptions
4. Example usage (if non-obvious)

**Example:**
```typescript
/**
 * Voxelizes a mesh geometry into a 3D grid.
 * 
 * @param mesh - The mesh geometry to voxelize
 * @param resolution - Number of voxels along the longest axis
 * @returns VoxelGrid with filled cells marked
 */
function voxelizeGeometry(mesh: MeshGeometry, resolution: number): VoxelGrid {
  // ...
}
```

---

## 🎯 ONTOLOGICAL ALIGNMENT

### Rule 16: Semantic Consistency

**ALL nodes MUST align with Lingua's ontological structure:**

| Domain | Semantic Layer | Node Categories | Port Types |
|--------|----------------|-----------------|------------|
| **ROSLYN** | Geometric/Spatial | primitives, curves, mesh, brep, voxel | geometry, mesh, voxelGrid |
| **NUMERICA** | Computational/Logical | math, logic, ranges, signals | number, boolean, vector |
| **Parameters** | Numeric/Quantitative | basics, data, lists, arrays | number, string, any |
| **Solvers** | Optimization/Analysis | solver, goal, optimization | goal, fitnessSpec |

**Why:** Ontological alignment ensures:
- Conceptual clarity
- Consistent mental model
- Predictable behavior
- Philosophical coherence

### Rule 17: Lingua Philosophy

**Lingua is:**
- **Narrow:** Focused on parametric geometry and optimization
- **Direct:** Clear data flow, no hidden magic
- **Precise:** Type-safe, predictable, deterministic

**Lingua is NOT:**
- A general-purpose programming language
- A visual scripting tool for arbitrary logic
- A game engine or animation tool

**All features MUST align with this philosophy.**

---

## ✅ VALIDATION CHECKLIST

Use this checklist when creating or refactoring nodes:

- [ ] Node follows standard structure (Rule 6)
- [ ] Geometry accessed via `context.geometryById` (Rule 1)
- [ ] Geometry returned in outputs (Rule 2)
- [ ] Geometry handler exists in `useProjectStore.ts` (Rule 3)
- [ ] Input ports have `parameterKey` where needed (Rule 4)
- [ ] Port types use CMYK semantic colors (Rule 5)
- [ ] Naming follows conventions (Rule 7)
- [ ] UI locked to backend definition (Rule 8)
- [ ] Documentation is clear and accurate (Rule 14)
- [ ] Code is commented where complex (Rule 15)
- [ ] Node aligns with Lingua philosophy (Rule 17)

---

## 🚀 NEXT STEPS

1. **Audit all nodes** against this specification
2. **Refactor non-compliant nodes** to follow rules
3. **Delete redundant documentation** and consolidate
4. **Create node development guide** with examples
5. **Add automated validation** for ontological compliance

---

**This is the master ontological specification for Lingua. All code, documentation, and features MUST comply with these rules.**
