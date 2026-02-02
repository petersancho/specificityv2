# CMYK BRANDING SYSTEM

**Version:** 1.0  
**Date:** 2026-01-31  
**Status:** Active

---

## 🎨 OVERVIEW

Lingua uses a **CMYK-based color palette** for all workflow UI, node designs, and branding. This system establishes visual conventions that align with Lingua's ontological structure.

---

## 🎯 CORE COLORS

### Primary Palette

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| **Yellow** | `#ffdd00` | `rgb(255, 221, 0)` | Numeric/Scalar/Vector ports and categories |
| **Magenta** | `#ff0099` | `rgb(255, 0, 153)` | Logic/Boolean/Goal ports and categories |
| **Cyan** | `#00d4ff` | `rgb(0, 212, 255)` | Text/String/Spec ports and categories |
| **Black** | `#000000` | `rgb(0, 0, 0)` | Geometry/Structure ports and categories |

### Secondary Colors

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| **Dark Gray** | `#1f1f22` | `rgb(31, 31, 34)` | Base text color |
| **White** | `#ffffff` | `rgb(255, 255, 255)` | Background, highlights |

---

## 🏛️ SEMANTIC MAPPING

### Yellow - Numeric/Quantitative
**Meaning:** Numbers, scalars, vectors, measurements

**Port Types:**
- `number` - Scalar values
- `vector` - 3D vectors (Vec3)

**Node Categories:**
- `math` - Mathematical operations
- `basics` - Basic constants and helpers
- `arrays` - Array distributions
- `ranges` - Sequences and remaps
- `signals` - Waveforms and oscillators

**Examples:**
- Width, height, depth parameters
- Resolution sliders
- Position vectors
- Rotation angles

---

### Magenta - Logic/Goals
**Meaning:** Boolean logic, conditions, optimization goals

**Port Types:**
- `boolean` - True/false values
- `goal` - Optimization goal specifications
- `fitnessSpec` - Fitness function specifications

**Node Categories:**
- `logic` - Conditional logic
- `goal` - Solver goal specifications
- `optimization` - Optimization algorithms

**Examples:**
- Enabled/disabled toggles
- Conditional branches
- Physics goals (anchor, load, stiffness)
- Chemistry goals (mass, blend, thermal)

---

### Cyan - Text/Specifications
**Meaning:** Text, strings, specifications, metadata

**Port Types:**
- `string` - Text values
- `genomeSpec` - Genetic algorithm specifications
- `phenotypeSpec` - Phenotype specifications

**Node Categories:**
- `data` - Data management
- `lists` - List operations
- `interop` - Import/export
- `measurement` - Measurement tools
- `analysis` - Analysis and inspection

**Examples:**
- Node labels
- Material names
- File paths
- Metadata text

---

### Black - Geometry/Structure
**Meaning:** Geometric data, meshes, structures

**Port Types:**
- `geometry` - Generic geometry
- `mesh` - Mesh data
- `nurb` - NURBS curves/surfaces
- `brep` - Boundary representation
- `voxelGrid` - Voxel grid data
- `any` - Generic data (fallback)

**Node Categories:**
- `primitives` - Base geometry generators
- `curves` - Curve operations
- `nurbs` - NURBS operations
- `brep` - B-Rep operations
- `mesh` - Mesh operations
- `voxel` - Voxel operations
- `solver` - Solver nodes

**Examples:**
- Box, sphere, cylinder geometry
- Mesh data
- Voxel grids
- NURBS curves

---

## 🎨 LOGO DESIGN

### CMYK Cube Logo

**Structure:**
- Isometric cube with three visible faces
- Each face represents a CMYK color
- Black edges define structure

**Faces:**
- **Top Face:** Yellow (#ffdd00)
- **Left Face:** Magenta (#ff0099)
- **Right Face:** Cyan (#00d4ff)
- **Edges:** Black (#000000)

**Rendering:**
- **2D Canvas:** Isometric projection with drop shadow
- **WebGL:** 3D perspective with edge rendering
- **High-DPI:** Up to 3x device pixel ratio support

---

## 🏷️ BRAND LOGOS

### LINGUA Logo
```
[CMYK Cube] LINGUA
                ^^
                Cyan accent, bold
```

**Text Styling:**
- Base text: "LING" in dark gray (#1f1f22)
- Accent text: "UA" in cyan (#00d4ff), bold (fontWeight: 800)

### ROSLYN Logo
```
[CMYK Cube] ROSLYN
                ^^^
                Cyan accent, bold
```

**Text Styling:**
- Base text: "ROS" in dark gray (#1f1f22)
- Accent text: "LYN" in cyan (#00d4ff), bold (fontWeight: 800)

### NUMERICA Logo
```
[CMYK Cube] NUMERICA
                ^^^^
                Magenta accent, bold
```

**Text Styling:**
- Base text: "NUME" in dark gray (#1f1f22)
- Accent text: "RICA" in magenta (#ff0099), bold (fontWeight: 800)

---

## 🎨 COLOR FUNCTIONS

### Port Colors

**Location:** `client/src/workflow/colors.ts`

```typescript
export function getPortColor(portType: WorkflowPortType): string {
  switch (portType) {
    // Yellow - Numeric
    case "number":
    case "vector":
      return "#ffdd00";
    
    // Magenta - Logic/Goals
    case "boolean":
    case "goal":
    case "fitnessSpec":
      return "#ff0099";
    
    // Cyan - Text/Specs
    case "string":
    case "genomeSpec":
    case "phenotypeSpec":
      return "#00d4ff";
    
    // Black - Geometry
    case "geometry":
    case "mesh":
    case "nurb":
    case "brep":
    case "voxelGrid":
    case "any":
    default:
      return "#000000";
  }
}
```

### Category Colors

```typescript
export function getCategoryColor(categoryId: NodeCategoryId): string {
  switch (categoryId) {
    // Yellow - Numeric
    case "math":
    case "basics":
    case "arrays":
    case "ranges":
    case "signals":
      return "#ffdd00";
    
    // Magenta - Logic/Goals
    case "logic":
    case "goal":
    case "optimization":
      return "#ff0099";
    
    // Cyan - Text/Specs
    case "data":
    case "lists":
    case "interop":
    case "measurement":
    case "analysis":
      return "#00d4ff";
    
    // Black - Geometry
    case "primitives":
    case "curves":
    case "nurbs":
    case "brep":
    case "mesh":
    case "voxel":
    case "solver":
    case "transforms":
    case "modifiers":
    case "tessellation":
    case "euclidean":
    default:
      return "#000000";
  }
}
```

---

## 🎨 VISUAL CONVENTIONS

### Port Rendering

**Default State:**
```css
background-color: <port-color>;
opacity: 1.0;
border: 2px solid #000;
```

**Hover State:**
```css
background-color: <port-color>;
opacity: 0.8;
border: 2px solid #fff;
```

**Connected State:**
```css
background-color: <port-color>;
opacity: 1.0;
border: 2px solid #fff;
box-shadow: 0 0 8px <port-color>;
```

### Category Badges

**Default State:**
```css
background-color: <category-color>;
color: #000;
opacity: 0.9;
```

**Hover State:**
```css
background-color: <category-color>;
color: #000;
opacity: 1.0;
```

---

## 🎨 STICKER ICONS

**Location:** `client/src/components/StickerIcon.tsx`

**CMYK Swatches:**
```typescript
const CMYK_SWATCHES = [
  "#ffdd00", // Yellow
  "#ff0099", // Magenta
  "#00d4ff", // Cyan
  "#000000", // Black
];
```

**Tint Generation:**
- Generates consistent CMYK tints for icons
- Uses hash-based selection for deterministic colors
- Applies tint to icon SVG paths

---

## 🎨 TOP BAR BRANDING

**Location:** `client/src/components/WebGLAppTopBar.tsx`

**Colors:**
```typescript
const brandAccent = "rgb(0, 212, 255, 0.92)";        // Cyan
const brandAccentDeep = "rgb(255, 0, 153, 0.92)";    // Magenta
const brandAccentGlow = "rgb(0, 212, 255, 0.18)";    // Cyan glow
```

**Logo Sizing:**
- Bar height: 44px (compact)
- Cube size: 24px
- Font size: 18px
- Padding: 16px

---

## 🎨 CSS VARIABLES

**Location:** `client/src/styles/global.css`

```css
:root {
  /* CMYK Colors */
  --cmyk-yellow: #ffdd00;
  --cmyk-magenta: #ff0099;
  --cmyk-cyan: #00d4ff;
  --cmyk-black: #000000;
  
  /* Brand Colors */
  --brand-accent: var(--cmyk-cyan);
  --brand-accent-deep: var(--cmyk-magenta);
  --brand-accent-glow: rgba(0, 212, 255, 0.18);
  
  /* UI Colors */
  --text-primary: #1f1f22;
  --text-secondary: #666;
  --background: #ffffff;
  --border: #ddd;
}
```

---

## 🎯 ONTOLOGICAL ALIGNMENT

The CMYK branding aligns with Lingua's ontology:

| CMYK Color | Lingua Domain | Semantic Layer | Visual Representation |
|------------|---------------|----------------|----------------------|
| **Cyan** | ROSLYN | Geometric/Spatial | Cube right face, ROSLYN accent, LINGUA accent |
| **Magenta** | NUMERICA | Computational/Logical | Cube left face, NUMERICA accent |
| **Yellow** | Parameters | Numeric/Quantitative | Cube top face, number ports |
| **Black** | Structure | Foundational/Geometric | Cube edges, geometry ports |

---

## ✅ USAGE GUIDELINES

### DO:
- ✅ Use CMYK colors for all port types
- ✅ Use CMYK colors for all node categories
- ✅ Use semantic color mapping (Yellow = numeric, etc.)
- ✅ Use consistent opacity and state styling
- ✅ Use CMYK cube logo for branding

### DON'T:
- ❌ Use arbitrary colors for ports or categories
- ❌ Mix old teal (#0b8a97) or purple (#5132c2) colors
- ❌ Use non-CMYK colors for workflow UI
- ❌ Hardcode colors in components (use color functions)
- ❌ Deviate from semantic color mapping

---

## 📚 REFERENCES

- **Color Module:** `client/src/workflow/colors.ts`
- **Node Registry:** `client/src/workflow/nodeRegistry.ts`
- **Logo Component:** `client/src/components/LinguaLogo.tsx`
- **Top Bar:** `client/src/components/WebGLAppTopBar.tsx`
- **Sticker Icons:** `client/src/components/StickerIcon.tsx`
- **Global Styles:** `client/src/styles/global.css`

---

**This is the definitive specification for CMYK branding in Lingua. All visual design MUST comply with this system.**
