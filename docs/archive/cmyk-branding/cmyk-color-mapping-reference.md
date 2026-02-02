# CMYK Color Mapping Reference

**Quick reference guide for Lingua's CMYK color convention system**

---

## Port Type Colors

| Port Type | Color | Hex | Semantic Group |
|-----------|-------|-----|----------------|
| `number` | 🟡 Yellow | `#ffdd00` | Numeric |
| `vector` | 🟡 Yellow | `#ffdd00` | Numeric |
| `boolean` | 🟣 Magenta | `#ff0099` | Logic |
| `goal` | 🟣 Magenta | `#ff0099` | Logic |
| `fitnessSpec` | 🟣 Magenta | `#ff0099` | Logic |
| `string` | 🔵 Cyan | `#00d4ff` | Text |
| `genomeSpec` | 🔵 Cyan | `#00d4ff` | Text |
| `phenotypeSpec` | 🔵 Cyan | `#00d4ff` | Text |
| `geometry` | ⚫ Black | `#000000` | Structure |
| `mesh` | ⚫ Black | `#000000` | Structure |
| `nurb` | ⚫ Black | `#000000` | Structure |
| `brep` | ⚫ Black | `#000000` | Structure |
| `renderMesh` | ⚫ Black | `#000000` | Structure |
| `voxelGrid` | ⚫ Black | `#000000` | Structure |
| `animation` | ⚫ Black | `#000000` | Structure |
| `solverResult` | ⚫ Black | `#000000` | Structure |
| `any` | ⚫ Black | `#000000` | Structure |

---

## Node Category Colors

| Category | Color | Hex | Semantic Group |
|----------|-------|-----|----------------|
| **Math** | 🟡 Yellow | `#ffdd00` | Numeric |
| **Basics** | 🟡 Yellow | `#ffdd00` | Numeric |
| **Arrays** | 🟡 Yellow | `#ffdd00` | Numeric |
| **Ranges** | 🟡 Yellow | `#ffdd00` | Numeric |
| **Signals** | 🟡 Yellow | `#ffdd00` | Numeric |
| **Logic** | 🟣 Magenta | `#ff0099` | Logic |
| **Goal** | 🟣 Magenta | `#ff0099` | Logic |
| **Optimization** | 🟣 Magenta | `#ff0099` | Logic |
| **Data** | 🔵 Cyan | `#00d4ff` | Data |
| **Lists** | 🔵 Cyan | `#00d4ff` | Data |
| **Interop** | 🔵 Cyan | `#00d4ff` | Data |
| **Measurement** | 🔵 Cyan | `#00d4ff` | Data |
| **Analysis** | 🔵 Cyan | `#00d4ff` | Data |
| **Primitives** | ⚫ Black | `#000000` | Structure |
| **Curves** | ⚫ Black | `#000000` | Structure |
| **NURBS** | ⚫ Black | `#000000` | Structure |
| **BREP** | ⚫ Black | `#000000` | Structure |
| **Mesh** | ⚫ Black | `#000000` | Structure |
| **Tessellation** | ⚫ Black | `#000000` | Structure |
| **Modifiers** | ⚫ Black | `#000000` | Structure |
| **Transforms** | ⚫ Black | `#000000` | Structure |
| **Euclidean** | ⚫ Black | `#000000` | Structure |
| **Voxel** | ⚫ Black | `#000000` | Structure |
| **Solver** | ⚫ Black | `#000000` | Structure |

---

## Semantic Groups

### 🟡 Yellow - Numeric/Scalar/Vector
**Meaning:** Quantitative data, parameters, measurements  
**Examples:** Numbers, vectors, sliders, ranges, signals

### 🟣 Magenta - Logic/Boolean/Goals/Constraints
**Meaning:** Decisions, constraints, optimization criteria  
**Examples:** Booleans, conditionals, solver goals, fitness functions

### 🔵 Cyan - Text/String/Specs/Metadata
**Meaning:** Identifiers, documentation, specifications  
**Examples:** Strings, labels, genome specs, data inspection

### ⚫ Black - Geometry/Structure/Mesh/Voxel
**Meaning:** 3D objects, spatial data, structural elements  
**Examples:** Meshes, curves, surfaces, voxels, solver outputs

---

## Visual Conventions

### Port Rendering

```
Input Port:   ○  (stroke only)
Output Port:  ●  (filled)
```

### Opacity Levels

| State | Opacity | Usage |
|-------|---------|-------|
| **Full** | 100% | Active ports, primary UI |
| **Hover** | 80% | Interactive hover states |
| **Port Background** | 40% | Port backgrounds, highlights |
| **Band** | 10% | Subtle backgrounds, sections |

### Color Functions

```typescript
import {
  getPortTypeColor,           // Get port color by type
  getCategoryAccentColor,     // Get category accent (100%)
  getCategoryBandColor,       // Get category band (10%)
  getCategoryPortColor,       // Get category port (40%)
  getHoverColor,              // Get hover state (80%)
  getDisabledColor,           // Get disabled state (40%)
} from "./colors";
```

---

## Quick Examples

### Port Color Lookup

```typescript
getPortTypeColor("number")    // "#ffdd00" (Yellow)
getPortTypeColor("boolean")   // "#ff0099" (Magenta)
getPortTypeColor("string")    // "#00d4ff" (Cyan)
getPortTypeColor("geometry")  // "#000000" (Black)
```

### Category Color Lookup

```typescript
getCategoryAccentColor("math")        // "#ffdd00" (Yellow)
getCategoryBandColor("math")          // "rgba(255, 221, 0, 0.1)"
getCategoryPortColor("math")          // "rgba(255, 221, 0, 0.4)"
```

### State Colors

```typescript
const baseColor = "#ffdd00";
getHoverColor(baseColor)      // "rgba(255, 221, 0, 0.8)"
getDisabledColor(baseColor)   // "rgba(255, 221, 0, 0.4)"
```

---

## Color Distribution

| Color | Port Types | Categories | Total |
|-------|------------|------------|-------|
| 🟡 Yellow | 2 | 5 | 7 |
| 🟣 Magenta | 3 | 3 | 6 |
| 🔵 Cyan | 3 | 5 | 8 |
| ⚫ Black | 9 | 11 | 20 |

**Total:** 17 port types, 24 categories, all using 4 CMYK colors

---

## Ontological Alignment

| CMYK Color | Lingua Domain | Semantic Meaning |
|------------|---------------|------------------|
| 🟡 Yellow | NUMERICA | Quantitative computation |
| 🟣 Magenta | Decision | Logical constraints |
| 🔵 Cyan | Documentation | Metadata & specs |
| ⚫ Black | ROSLYN | Geometric structure |

---

## Migration Checklist

- [x] Created `client/src/workflow/colors.ts`
- [x] Updated `PORT_TYPE_COLOR` in `nodeRegistry.ts`
- [x] Updated `NODE_CATEGORIES` in `nodeRegistry.ts`
- [x] Documented color conventions
- [x] Established semantic groupings
- [x] Defined visual conventions
- [ ] Update port rendering components
- [ ] Update edge rendering components
- [ ] Update node header rendering
- [ ] Add visual regression tests
- [ ] Add accessibility tests

---

**See also:**
- [CMYK Color Conventions](./cmyk-color-conventions.md) - Full documentation
- [Branding Guidelines](./branding-guidelines.md) - Overall brand identity
- [Ontology](./ontology/) - Lingua's semantic structure

---

**Last Updated:** 2026-01-31
