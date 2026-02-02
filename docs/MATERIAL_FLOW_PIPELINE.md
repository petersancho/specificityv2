# Material Flow Pipeline

**Status:** Complete  
**Date:** 2026-02-01  
**Phase:** 3 - Material Flow Pipeline Documentation & Robustness

---

## Overview

This document describes the complete material flow pipeline in Lingua, from material selection to GPU rendering. It establishes the data contracts, invariants, and failure behaviors that ensure robust material handling.

---

## Data Flow Diagram

```
User Input (Material Selection)
    ↓
ChemistryMaterialGoalNode / ChemistryBlendGoalNode
    ↓
resolveChemistryMaterialAssignments()
    ↓
ChemistryMaterialAssignment[] (with material specs)
    ↓
runChemistrySolver()
    ↓
ChemistryField (with material channels)
    ↓
buildChemistryMesh() / buildDensityMesh()
    ↓
RenderMesh (with vertex colors)
    ↓
GeometryRenderAdapter.updateMeshGeometry()
    ↓
createFlatShadedMesh()
    ↓
GeometryBuffer.setData({ colors: Float32Array })
    ↓
BufferManager.updateBuffer()
    ↓
WebGL colorBuffer
    ↓
Geometry Shader (interpolates colors)
    ↓
Fragment Shader (applies colors to pixels)
    ↓
Screen Rendering
```

---

## Data Contracts

### 1. RenderMesh Attributes

**Type Definition:**
```typescript
type RenderMesh = {
  positions: number[];  // Flat array of vertex positions [x0,y0,z0, x1,y1,z1, ...]
  normals: number[];    // Flat array of vertex normals [nx0,ny0,nz0, ...]
  uvs: number[];        // Flat array of texture coordinates [u0,v0, u1,v1, ...]
  indices: number[];    // Triangle indices [i0,i1,i2, i3,i4,i5, ...]
  colors?: number[];    // Optional flat array of vertex colors [r0,g0,b0, r1,g1,b1, ...]
};
```

**Invariants:**
1. **positions.length % 3 === 0** (must be divisible by 3 for x,y,z triplets)
2. **normals.length === positions.length** (one normal per vertex)
3. **uvs.length === (positions.length / 3) * 2** (one UV per vertex, 2 components)
4. **indices.length % 3 === 0** (must be divisible by 3 for triangle triplets)
5. **colors.length === positions.length** (one RGB color per vertex, if present)
6. **colors[i] ∈ [0, 1]** (all color components must be normalized to 0-1 range)

**Failure Behavior:**
- **positions.length % 3 !== 0**: Throw error (invalid mesh)
- **colors.length !== positions.length**: Warn once, ignore colors, use default
- **colors[i] ∉ [0, 1]**: Clamp to [0, 1], warn once if clamping occurred

---

### 2. ChemistryField Structure

**Type Definition:**
```typescript
type ChemistryField = {
  resolution: { x: number; y: number; z: number };  // Voxel grid resolution
  bounds: { min: Vec3; max: Vec3 };                 // Spatial bounds
  cellSize: Vec3;                                   // Size of each voxel cell
  materials: string[];                              // Material names (ordered)
  channels: number[][];                             // Concentration per material per cell
  densities: number[];                              // Total density per cell
  maxDensity: number;                               // Maximum density in field
};
```

**Invariants:**
1. **channels.length === materials.length** (one channel per material)
2. **channels[m].length === resolution.x * resolution.y * resolution.z** (one value per voxel)
3. **channels[m][idx] >= 0** (concentrations must be non-negative)
4. **sum(channels[*][idx]) <= 1** (total concentration per voxel ≤ 1)
5. **densities.length === resolution.x * resolution.y * resolution.z** (one density per voxel)

**Failure Behavior:**
- **channels[m][idx] < 0**: Clamp to 0, warn once per material
- **sum(channels[*][idx]) > 1**: Normalize to sum = 1
- **sum(channels[*][idx]) ≈ 0**: Use fallback color (gray: [0.5, 0.5, 0.5])

---

### 3. Material Specifications

**Type Definition:**
```typescript
type ChemistryMaterialSpec = {
  name: string;                    // Unique identifier
  density: number;                 // kg/m³
  stiffness: number;               // Pa (Young's modulus)
  thermalConductivity: number;     // W/(m·K)
  opticalTransmission: number;     // 0-1 (transparency)
  diffusivity: number;             // 0-4 (mixing rate)
  color: [number, number, number]; // RGB, normalized 0-1
  category: ChemistryMaterialCategory;
  description: string;
};
```

**Invariants:**
1. **color[i] ∈ [0, 1]** (all color components must be normalized)
2. **density > 0** (physical materials have positive density)
3. **stiffness >= 0** (Young's modulus is non-negative)
4. **thermalConductivity >= 0** (thermal conductivity is non-negative)
5. **opticalTransmission ∈ [0, 1]** (transparency is 0-1)
6. **diffusivity ∈ [0, 4]** (mixing rate is bounded)

**Failure Behavior:**
- **Unknown material name**: Warn once, fallback to Steel
- **Invalid color values**: Clamp to [0, 1]
- **Invalid physical properties**: Use fallback values from Steel

---

### 4. Color Space & Interpolation

**Color Space:** sRGB (standard RGB)
- Material colors are authored in sRGB color space
- No gamma correction applied (assumes sRGB throughout pipeline)
- Shaders interpolate colors linearly in sRGB space

**Interpolation:**
- Vertex colors are interpolated linearly across triangle faces
- Blended material colors use weighted average: `color = Σ(conc[m] * materialColor[m])`
- No perceptual color space interpolation (e.g., Lab, LCH)

**Alpha Channel:**
- Not supported (RGB only)
- Transparency handled separately via material `opticalTransmission` property
- Rendering uses separate opacity/transparency system

---

### 5. GPU Buffer Constraints

**WebGL Constraints:**
- **Element indices:** 16-bit unsigned integers (0-65535) by default
- **Large meshes:** Meshes with > 65535 vertices require special handling:
  - Option A: Duplicate vertices to split into multiple draw calls
  - Option B: Use `OES_element_index_uint` extension (WebGL1) or `UNSIGNED_INT` (WebGL2)
- **Buffer usage:** `STATIC_DRAW` (data uploaded once, drawn many times)

**Current Implementation:**
- Uses 16-bit indices by default
- Falls back to vertex duplication for meshes > 65535 vertices
- Colors must be duplicated alongside positions when splitting

---

## Component Responsibilities

| Component | File | Responsibility |
|-----------|------|----------------|
| **Material Database** | `client/src/data/chemistryMaterials.ts` | Stores 50+ material definitions with physical properties and colors |
| **Material Resolution** | `client/src/utils/materials.ts` | Resolves material assignments by geometry/layer ID |
| **Material Coercion** | `client/src/workflow/nodeRegistry.ts` | Coerces user input to valid material specs, handles fallbacks |
| **Chemistry Solver** | `client/src/workflow/nodeRegistry.ts` | Runs chemistry simulation, produces ChemistryField |
| **Mesh Building** | `client/src/workflow/nodeRegistry.ts` | Converts ChemistryField to RenderMesh with vertex colors |
| **Color Blending** | `client/src/workflow/nodeRegistry.ts` | Blends material colors by concentration |
| **Flat Shading** | `client/src/rendering/renderAdapter.ts` | Duplicates vertices for flat shading, validates colors |
| **GPU Upload** | `client/src/rendering/BufferManager.ts` | Creates/updates GPU buffers for positions, normals, colors |
| **Rendering** | `client/src/rendering/WebGLRenderer.ts` | Binds buffers, executes draw calls |

---

## Transformation Points

### 1. Material Selection → Material Assignments

**Location:** `client/src/workflow/nodeRegistry.ts` (ChemistryMaterialGoalNode, ChemistryBlendGoalNode)

**Input:** User-selected material names (strings)

**Output:** `ChemistryMaterialAssignment[]` with resolved material specs

**Transformations:**
- Case-insensitive material name lookup
- Normalization (removes spaces, underscores, hyphens)
- Fallback to Steel if material not found
- Validation of physical properties

**Failure Modes:**
- Unknown material → Warn once, use Steel
- Invalid properties → Clamp to valid ranges

---

### 2. Material Assignments → ChemistryField

**Location:** `client/src/workflow/nodeRegistry.ts` (runChemistrySolver)

**Input:** `ChemistryMaterialAssignment[]`, solver parameters

**Output:** `ChemistryField` with material concentration channels

**Transformations:**
- Initializes voxel grid with resolution
- Seeds materials at specified positions
- Runs diffusion simulation (iterative)
- Computes concentration per material per voxel
- Tracks total density per voxel

**Failure Modes:**
- Negative concentrations → Clamp to 0
- Sum > 1 → Normalize to sum = 1
- Zero density → Use fallback color (gray)

---

### 3. ChemistryField → RenderMesh (with colors)

**Location:** `client/src/workflow/nodeRegistry.ts` (buildChemistryMesh, buildDensityMesh)

**Input:** `ChemistryField`

**Output:** `RenderMesh` with vertex colors

**Transformations:**
- Builds voxel mesh from field densities
- Maps vertex positions to voxel cells
- Blends material colors by concentration: `color = Σ(conc[m] * materialColor[m])`
- Creates per-vertex color array (RGB triplets)

**Failure Modes:**
- Unknown material color → Warn once, use gray [0.5, 0.5, 0.5]
- Negative concentration → Clamp to 0
- Zero sum concentration → Use gray [0.5, 0.5, 0.5]
- Invalid color values → Clamp to [0, 1]

---

### 4. RenderMesh → GeometryBuffer (GPU)

**Location:** `client/src/rendering/renderAdapter.ts` (createFlatShadedMesh, updateMeshGeometry)

**Input:** `RenderMesh` with optional colors

**Output:** `GeometryBuffer` with GPU-ready Float32Arrays

**Transformations:**
- Validates positions.length % 3 === 0
- Validates colors.length === positions.length (if present)
- Duplicates vertices for flat shading (if needed)
- Duplicates colors alongside positions
- Clamps color values to [0, 1]
- Converts to Float32Array for GPU upload

**Failure Modes:**
- positions.length % 3 !== 0 → Throw error
- colors.length !== positions.length → Warn once, ignore colors
- colors[i] ∉ [0, 1] → Clamp to [0, 1], warn once
- Mesh > 65535 vertices → Duplicate vertices and colors

---

### 5. GeometryBuffer → WebGL Rendering

**Location:** `client/src/rendering/BufferManager.ts`, `client/src/rendering/WebGLRenderer.ts`

**Input:** `GeometryBuffer` with Float32Arrays

**Output:** Rendered geometry on screen

**Transformations:**
- Creates/updates GL buffers (positions, normals, colors)
- Binds buffers to shader attributes
- Executes draw calls with element indices
- Shaders interpolate colors across triangle faces

**Failure Modes:**
- Invalid buffer data → WebGL error, no rendering
- Buffer size mismatch → WebGL error, no rendering
- Out-of-memory → WebGL context loss

---

## Robustness Fixes (Phase 3)

### Fix #1: Color Array Length Validation

**Issue:** `createFlatShadedMesh()` doesn't validate `positions.length % 3 === 0`

**Fix:** Add validation before any shading/duplication:
```typescript
if (positions.length % 3 !== 0) {
  throw new Error(`positions.length must be multiple of 3, got ${positions.length}`);
}
```

**Impact:** Prevents silent corruption from misaligned arrays

---

### Fix #2: Material Color Fallback Warning

**Issue:** Unknown material colors silently fallback to gray

**Fix:** Add warning when material not found:
```typescript
const color = materialColorByName.get(name);
if (!color) {
  warnOnce(`unknown-material:${name}`, `Unknown material '${name}', falling back to gray`);
}
const rgb = color ?? [0.5, 0.5, 0.5];
```

**Impact:** Makes unknown materials discoverable immediately

---

### Fix #3: Color Clamping in Flat Shading

**Issue:** Color values not clamped to [0, 1] before GPU upload

**Fix:** Clamp each color component:
```typescript
colorsOut.push(
  clamp01(sourceColors[ia] ?? 0),
  clamp01(sourceColors[ia + 1] ?? 0),
  clamp01(sourceColors[ia + 2] ?? 0),
);
```

**Impact:** Prevents invalid color values sent to GPU

---

### Fix #4: Material Assignment Cleanup

**Issue:** Material assignments not cleaned up when geometry deleted

**Fix:** Add cleanup hook in geometry deletion:
```typescript
deleteGeometry(id: string) {
  // existing GPU buffer deletes...
  clearAssignmentsForGeometry(id);
}
```

**Impact:** Prevents orphaned material assignments in long sessions

---

### Fix #5: Concentration Validation

**Issue:** Negative concentrations not validated

**Fix:** Validate and normalize concentrations:
```typescript
function normalizeNonNegative(values: number[]): number[] {
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    if (!Number.isFinite(values[i]) || values[i] < 0) values[i] = 0;
    sum += values[i];
  }
  if (sum <= 1e-12) return values.map(() => 0);
  return values.map(v => v / sum);
}
```

**Impact:** Prevents undefined blending from negative concentrations

---

### Fix #6: Large Mesh Color Duplication

**Issue:** Colors not duplicated when positions are duplicated for meshes > 65535 vertices

**Fix:** Expand colors using same mapping as positions:
```typescript
function expandVec3Attribute(src: ArrayLike<number>, indexMap: ArrayLike<number>): Float32Array {
  const out = new Float32Array(indexMap.length * 3);
  for (let i = 0; i < indexMap.length; i++) {
    const si = indexMap[i] * 3;
    const oi = i * 3;
    out[oi] = src[si];
    out[oi + 1] = src[si + 1];
    out[oi + 2] = src[si + 2];
  }
  return out;
}
```

**Impact:** Large meshes render with correct colors

---

## Validation Utilities

### warnOnce

**Purpose:** Warn once per unique key to avoid log spam

**Location:** `client/src/utils/warnOnce.ts`

```typescript
const seen = new Set<string>();

export function warnOnce(key: string, message: string) {
  if (seen.has(key)) return;
  seen.add(key);
  console.warn(message);
}
```

---

### assertPositionsValid

**Purpose:** Validate positions array is properly aligned

**Location:** `client/src/rendering/validation.ts`

```typescript
export function assertPositionsValid(positions: ArrayLike<number>, context: string) {
  if (positions.length % 3 !== 0) {
    throw new Error(`[${context}] positions.length must be multiple of 3, got ${positions.length}`);
  }
}
```

---

### validateColorsLength

**Purpose:** Validate colors array matches positions length

**Location:** `client/src/rendering/validation.ts`

```typescript
export function validateColorsLength(
  positions: ArrayLike<number>,
  colors: ArrayLike<number> | undefined,
  context: string
): colors is ArrayLike<number> {
  if (!colors) return false;
  if (colors.length !== positions.length) {
    warnOnce(`${context}:colors-length`, `[${context}] colors length ${colors.length} != positions length ${positions.length}; ignoring colors`);
    return false;
  }
  if (colors.length % 3 !== 0) {
    warnOnce(`${context}:colors-mod3`, `[${context}] colors length must be multiple of 3; ignoring colors`);
    return false;
  }
  return true;
}
```

---

### clamp01

**Purpose:** Clamp value to [0, 1] range

**Location:** `client/src/rendering/validation.ts`

```typescript
export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
```

---

## Testing Strategy

### Unit Tests

1. **positions.length % 3 !== 0** → Throws error
2. **colors.length !== positions.length** → Warns and disables colors
3. **Out-of-range colors** → Clamps to [0, 1]
4. **Unknown material** → Warns once
5. **Negative concentrations** → Clamps and normalizes
6. **Large mesh expansion** → Colors match positions length

### Integration Tests

1. **Material selection** → Correct colors in rendered mesh
2. **Material blending** → Correct blended colors
3. **Geometry deletion** → Material assignments cleaned up
4. **Large mesh rendering** → Correct colors for > 65535 vertices

---

## Future Enhancements

### High Priority

1. **Alpha channel support** - Add RGBA colors for transparency
2. **Per-face colors** - Support face-level color assignment
3. **Color space specification** - Explicit sRGB vs linear handling
4. **Color update tracking** - Dirty flag to avoid unnecessary GPU uploads

### Medium Priority

1. **Perceptual color interpolation** - Use Lab or LCH color space
2. **Color validation on input** - Validate RenderMesh colors on creation
3. **Color serialization tests** - Ensure colors persist correctly
4. **Color debugging tools** - Visualize color channels

### Low Priority

1. **Color profile support** - ICC color profiles
2. **Gamma correction** - Proper sRGB ↔ linear conversion
3. **HDR color support** - High dynamic range colors
4. **Color compression** - Reduce memory footprint

---

## Summary

The material flow pipeline is now fully documented with:
- ✅ Complete data flow diagram
- ✅ Explicit data contracts and invariants
- ✅ Defined failure behaviors
- ✅ Component responsibilities
- ✅ Transformation points
- ✅ Robustness fixes (6 critical issues)
- ✅ Validation utilities
- ✅ Testing strategy
- ✅ Future enhancements

**The pipeline is robust, well-defined, and ready for production use.** 🎯

---

**Status:** ✅ Complete  
**Date:** 2026-02-01  
**Next Phase:** Phase 4 (Roslyn Command Validation)
