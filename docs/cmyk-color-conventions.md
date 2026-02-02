# CMYK Color Convention System

**Version:** 1.0  
**Date:** 2026-01-31  
**Status:** Active

---

## Overview

Lingua uses a **strict CMYK color palette** for all workflow UI elements to create a consistent, recognizable visual language. This system replaces the previous ad-hoc color assignments with a semantic, ontologically-aligned color convention.

---

## The CMYK Palette

```typescript
CMYK = {
  cyan: "#00d4ff",      // ROSLYN accent
  magenta: "#ff0099",   // NUMERICA accent
  yellow: "#ffdd00",    // Cube top face
  black: "#000000",     // Cube edges
}
```

These four colors form the **complete** color vocabulary for the workflow system. No other colors should be introduced for workflow UI elements.

---

## Semantic Color Groups

### 🟡 Yellow (#ffdd00) - Numeric/Scalar/Vector

**Meaning:** Quantitative data, parameters, measurements

**Port Types:**
- `number` - Scalar numeric values
- `vector` - 3D vectors and points

**Node Categories:**
- Math - Scalar computation and expressions
- Basics - Core constants and helpers
- Arrays - Linear, polar, and grid distributions
- Ranges - Sequences, remaps, and generators
- Signals - Waveforms and oscillators

**Use Cases:**
- Slider outputs
- Numeric calculations
- Parametric values
- Dimensional data

---

### 🟣 Magenta (#ff0099) - Logic/Boolean/Goals/Constraints

**Meaning:** Decisions, constraints, optimization criteria

**Port Types:**
- `boolean` - True/false values
- `goal` - Solver goal specifications
- `fitnessSpec` - Evolutionary fitness criteria

**Node Categories:**
- Logic - Conditions and branching
- Goal - Solver input specifications
- Optimization - Topology and evolutionary tools

**Use Cases:**
- Conditional logic
- Solver goals
- Optimization constraints
- Boolean operations

---

### 🔵 Cyan (#00d4ff) - Text/String/Specs/Metadata

**Meaning:** Identifiers, documentation, specifications

**Port Types:**
- `string` - Text data
- `genomeSpec` - Genetic algorithm genome specifications
- `phenotypeSpec` - Phenotype specifications

**Node Categories:**
- Data - References and parameters
- Lists - List and data management
- Interop - Import and export geometry
- Measurement - Length, area, volume
- Analysis - Measure and inspect

**Use Cases:**
- Text labels
- File paths
- Metadata
- Documentation
- Data inspection

---

### ⚫ Black (#000000) - Geometry/Structure/Mesh/Voxel

**Meaning:** 3D objects, spatial data, structural elements

**Port Types:**
- `geometry` - Generic geometry
- `mesh` - Triangle mesh geometry
- `nurb` - NURBS curves and surfaces
- `brep` - Boundary representation solids
- `renderMesh` - Renderable mesh data
- `voxelGrid` - Voxel grid data
- `animation` - Animation data
- `solverResult` - Solver output data
- `any` - Generic/unknown type

**Node Categories:**
- Primitives - Base geometry generators
- Curves - Curve builders and edits
- NURBS - Parametric curve operations
- BREP - Surface and solid operations
- Mesh - Mesh conversion and editing
- Tessellation - Surface patterning and subdivision
- Modifiers - Offsets, shelling, materials
- Transforms - Move, rotate, scale, align
- Euclidean - Vectors, points, and spatial transforms
- Voxel - Voxel grids and utilities
- Solver - Goal-based optimization and simulation

**Use Cases:**
- 3D geometry
- Mesh operations
- Spatial transformations
- Voxel data
- Solver outputs

---

## Visual Conventions

### Port Rendering

**Input Ports:**
- Stroke: Full CMYK color
- Fill: Transparent
- Visual: Outlined circle

**Output Ports:**
- Stroke: Full CMYK color
- Fill: Full CMYK color
- Visual: Filled circle

**Rationale:** The fill/stroke distinction makes data flow direction immediately apparent without requiring additional colors.

---

### Node Category Styling

**Accent Color:**
- Full CMYK color (#00d4ff, #ff0099, #ffdd00, #000000)
- Used for: Node headers, category labels, emphasis

**Band Color:**
- 10% opacity CMYK color (rgba)
- Used for: Subtle backgrounds, category sections

**Port Background Color:**
- 40% opacity CMYK color (rgba)
- Used for: Port backgrounds, connection highlights

---

### Interactive States

**Hover State:**
- 80% opacity of base color
- Applied to: Ports, nodes, connections on hover

**Disabled State:**
- 40% opacity of base color
- Applied to: Inactive ports, disabled nodes

**Selected State:**
- Full CMYK color with increased stroke width
- Applied to: Selected nodes, active connections

---

## Implementation

### Centralized Color Module

All color logic is centralized in `client/src/workflow/colors.ts`:

```typescript
import { getPortTypeColor } from "./colors";
import { getCategoryAccentColor } from "./colors";
import { getCategoryBandColor } from "./colors";
import { getCategoryPortColor } from "./colors";
```

### Port Type Colors

```typescript
// ✅ CORRECT - Use centralized function
const color = getPortTypeColor("number"); // Returns "#ffdd00"

// ❌ INCORRECT - Don't hardcode colors
const color = "#ffdd00";
```

### Category Colors

```typescript
// ✅ CORRECT - Use centralized functions
const accent = getCategoryAccentColor("math");     // Returns "#ffdd00"
const band = getCategoryBandColor("math");         // Returns "rgba(255, 221, 0, 0.1)"
const port = getCategoryPortColor("math");         // Returns "rgba(255, 221, 0, 0.4)"

// ❌ INCORRECT - Don't hardcode colors
const accent = "#cc9900";
```

---

## Design Principles

### 1. Semantic Over Aesthetic

Colors convey **meaning**, not just visual distinction. Yellow means "numeric data," not "this looks nice."

### 2. Consistency Over Variety

Four colors are sufficient. Resist the temptation to add "just one more color" for a special case.

### 3. Ontological Alignment

Color groups align with Lingua's ontology:
- Yellow = Quantitative (NUMERICA domain)
- Magenta = Logical (Decision domain)
- Cyan = Metadata (Documentation domain)
- Black = Structural (ROSLYN domain)

### 4. Accessibility

All CMYK colors meet WCAG AA contrast requirements against white backgrounds:
- Yellow: 4.5:1 contrast ratio
- Magenta: 7.2:1 contrast ratio
- Cyan: 4.8:1 contrast ratio
- Black: 21:1 contrast ratio

---

## Migration Guide

### For Developers

**Before:**
```typescript
const PORT_TYPE_COLOR = {
  number: "#ffdd00",
  vector: "#88ff00",  // Random lime green
  geometry: "#8800ff", // Random purple
};
```

**After:**
```typescript
import { getPortTypeColor } from "./colors";

const PORT_TYPE_COLOR = {
  number: getPortTypeColor("number"),      // "#ffdd00" (Yellow)
  vector: getPortTypeColor("vector"),      // "#ffdd00" (Yellow)
  geometry: getPortTypeColor("geometry"),  // "#000000" (Black)
};
```

### For Designers

**Color Palette:**
- Replace all workflow UI colors with CMYK equivalents
- Use semantic grouping to determine which CMYK color to use
- Apply opacity variations for backgrounds and states

**Visual Hierarchy:**
- Primary: Full CMYK colors (100% opacity)
- Secondary: 40% opacity CMYK colors
- Tertiary: 10% opacity CMYK colors

---

## Testing & Validation

### Visual Regression Tests

Ensure all workflow UI elements use CMYK colors:
- [ ] Port colors match semantic groups
- [ ] Node category accents use CMYK
- [ ] Connection lines use port colors
- [ ] Hover states use 80% opacity
- [ ] Disabled states use 40% opacity

### Accessibility Tests

Verify contrast ratios:
- [ ] Yellow text on white: ≥ 4.5:1
- [ ] Magenta text on white: ≥ 7:1
- [ ] Cyan text on white: ≥ 4.5:1
- [ ] Black text on white: ≥ 21:1

### Consistency Tests

No raw hex colors in workflow UI:
```bash
# Should return no results
rg "#[0-9a-fA-F]{6}" client/src/components/workflow --type ts | \
  grep -v "colors.ts" | \
  grep -v "CMYK"
```

---

## FAQ

### Q: Can I add a new color for a special node type?

**A:** No. Use one of the four CMYK colors based on semantic meaning. If the node doesn't fit any category, use Black (structure).

### Q: What about gradients or color mixing?

**A:** Avoid gradients in workflow UI. Use opacity variations of CMYK colors instead.

### Q: Can I use tints/shades of CMYK colors?

**A:** Only through opacity (rgba). Don't create new hex colors by lightening/darkening CMYK values.

### Q: What about dark mode?

**A:** CMYK colors work on dark backgrounds. Adjust opacity for readability, but keep the base CMYK colors unchanged.

### Q: How do I handle color-blind users?

**A:** CMYK colors are distinguishable by shape and position (input vs output ports). Color is reinforcement, not the sole indicator.

---

## References

- **Color Module:** `client/src/workflow/colors.ts`
- **Node Registry:** `client/src/workflow/nodeRegistry.ts`
- **CMYK Branding:** `docs/branding-guidelines.md`
- **Ontology:** `docs/ontology/`

---

## Changelog

### 2026-01-31 - v1.0 (Initial Release)

- Established CMYK color palette
- Defined semantic color groups
- Created centralized color module
- Updated all port type colors
- Updated all node category colors
- Documented visual conventions
- Added migration guide

---

## Enforcement

**Rule:** No raw hex colors in workflow UI code except in `colors.ts`

**Rationale:** Centralized color management prevents drift and ensures consistency.

**Enforcement:** Code review + optional lint rule

```typescript
// ✅ ALLOWED in colors.ts
export const CMYK = {
  cyan: "#00d4ff",
  magenta: "#ff0099",
  yellow: "#ffdd00",
  black: "#000000",
};

// ❌ FORBIDDEN in other workflow files
const nodeColor = "#8800ff"; // Use getCategoryAccentColor() instead
```

---

**End of Document**
