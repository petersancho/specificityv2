# CMYK Branding Update

## Overview

This document describes the comprehensive branding update to use the new CMYK tri-colored cube logo throughout the Lingua application.

## Visual Changes

### Before
- **Logo**: Black hexagon silhouette
- **LINGUA Text**: "LING" (black) + "UA" (teal #0b8a97)
- **ROSLYN Accent**: Teal (#0b8a97)
- **NUMERICA Accent**: Purple (#5132c2)
- **Inconsistent cube colors**

### After
- **Logo**: Tri-colored CMYK cube (Yellow top, Magenta left, Cyan right)
- **LINGUA Text**: "LING" (dark gray) + "UA" (cyan #00d4ff, bold)
- **ROSLYN Accent**: Cyan (#00d4ff)
- **NUMERICA Accent**: Magenta (#ff0099)
- **Consistent CMYK theme throughout**

## CMYK Color Palette

```css
--cmyk-cyan: #00d4ff;
--cmyk-magenta: #ff0099;
--cmyk-yellow: #ffdd00;
--cmyk-black: #000000;

--roslyn-accent: #00d4ff;
--numerica-accent: #ff0099;
```

## Updated Components

### 1. LinguaLogo.tsx
**Changes:**
- Added `LINGUA_ACCENT` constant (#00d4ff - Cyan)
- Updated text rendering to use accent styling: "LING" + colored "UA"
- Changed base text color from black (#000000) to dark gray (#1f1f22)
- Made "UA" bold (fontWeight: 800) to match ROSLYN/NUMERICA pattern

**Visual Result:**
```
[CMYK Cube] LING UA
                 ^^
                 Cyan, bold
```

### 2. WebGLAppTopBar.tsx
**Changes:**
- Updated `brandAccent` from teal `rgb(11, 138, 151, 0.92)` to cyan `rgb(0, 212, 255, 0.92)`
- Updated `brandAccentDeep` from purple `rgb(81, 50, 194, 0.92)` to magenta `rgb(255, 0, 153, 0.92)`
- Updated `brandAccentGlow` from teal `rgb(11, 138, 151, 0.18)` to cyan `rgb(0, 212, 255, 0.18)`

**Visual Result:**
- Top bar brand badge now uses cyan accent bar
- "UA" text in brand name uses cyan color
- Glow effects use cyan instead of teal

### 3. CubeLogo.tsx
**Status:** ✅ Already using CMYK colors as defaults
- Top face: Yellow (#ffdd00)
- Left face: Magenta (#ff0099)
- Right face: Cyan (#00d4ff)
- Edges: Black (#000000)

### 4. RoslynLogo.tsx
**Status:** ✅ Already using CMYK colors
- Cube: CMYK tri-color
- Text: "ROS" (dark gray) + "LYN" (cyan #00d4ff)

### 5. NumericaLogo.tsx
**Status:** ✅ Already using CMYK colors
- Cube: CMYK tri-color
- Text: "NUME" (dark gray) + "RICA" (magenta #ff0099)

### 6. WebGLTitleLogo.tsx
**Status:** ✅ Already using CMYK colors
- Roslyn tone: Cyan `rgb(0, 212, 255, 1)`
- Numerica tone: Magenta `rgb(255, 0, 153, 1)`

### 7. StickerIcon.tsx
**Status:** ✅ Already using CMYK palette
- Uses `CMYK_SWATCHES` from `renderPalette.ts`
- Generates consistent CMYK tints for icons

## Branding Consistency

### Logo Variants

**LINGUA Logo:**
- Cube: Yellow (top), Magenta (left), Cyan (right)
- Text: "LING" (dark) + "UA" (cyan, bold)
- Represents: The full Lingua platform

**ROSLYN Logo:**
- Cube: Same CMYK tri-color
- Text: "ROS" (dark) + "LYN" (cyan, bold)
- Represents: Geometric/spatial domain

**NUMERICA Logo:**
- Cube: Same CMYK tri-color
- Text: "NUME" (dark) + "RICA" (magenta, bold)
- Represents: Computational/numeric domain

### Color Semantics

| Color | Hex | RGB | Meaning | Usage |
|-------|-----|-----|---------|-------|
| **Cyan** | #00d4ff | rgb(0, 212, 255) | Technical, spatial, geometric | ROSLYN accent, LINGUA accent, text/string ports |
| **Magenta** | #ff0099 | rgb(255, 0, 153) | Computational, logical, constraints | NUMERICA accent, boolean/goal ports |
| **Yellow** | #ffdd00 | rgb(255, 221, 0) | Creative, parametric, numeric | Cube top face, number/vector ports |
| **Black** | #000000 | rgb(0, 0, 0) | Structural, foundational, geometric | Cube edges, geometry ports |

## Typography

**Font Stack:**
```css
"Montreal Neue", "Space Grotesk", "Helvetica Neue", Helvetica, Arial, sans-serif
```

**Font Weights:**
- Base text: 700 (bold)
- Accent text: 800 (extra bold)

**Letter Spacing:**
- Base: 0.02em
- Accent: Varies by context

## Visual Hierarchy

### Logo Text Pattern
All three logos follow the same pattern:
1. **Base portion** (dark gray #1f1f22, weight 700)
2. **Accent portion** (brand color, weight 800)

**Examples:**
- LINGUA: "LING" + "UA" (cyan)
- ROSLYN: "ROS" + "LYN" (cyan)
- NUMERICA: "NUME" + "RICA" (magenta)

### Cube Rendering
- **2D Canvas** (CubeLogo.tsx): Isometric projection, drop shadow
- **WebGL** (WebGLCubeLogo.tsx): 3D perspective, edge rendering
- **Consistent colors**: Yellow, Magenta, Cyan, Black edges

## Implementation Details

### Color Conversion
RGB values are normalized to 0-1 range for WebGL:
```typescript
const rgb = (r: number, g: number, b: number, a = 1): RGBA => [
  r / 255,
  g / 255,
  b / 255,
  a,
];
```

### CMYK Constants
```typescript
// Cyan
rgb(0, 212, 255, 1)    // Full opacity
rgb(0, 212, 255, 0.92) // Brand accent
rgb(0, 212, 255, 0.18) // Glow effect

// Magenta
rgb(255, 0, 153, 1)    // Full opacity
rgb(255, 0, 153, 0.92) // Brand accent

// Yellow
rgb(255, 221, 0, 1)    // Full opacity

// Black
rgb(0, 0, 0, 1)        // Full opacity
```

## Files Modified

1. **client/src/components/LinguaLogo.tsx**
   - Added LINGUA_ACCENT constant
   - Updated text rendering with accent styling
   - Changed base text color to dark gray

2. **client/src/components/WebGLAppTopBar.tsx**
   - Updated brandAccent to cyan
   - Updated brandAccentDeep to magenta
   - Updated brandAccentGlow to cyan

## Migration Notes

### Old Colors Removed
- ❌ Teal: #0b8a97 / rgb(11, 138, 151)
- ❌ Purple: #5132c2 / rgb(81, 50, 194)

### New Colors Added
- ✅ Cyan: #00d4ff / rgb(0, 212, 255)
- ✅ Magenta: #ff0099 / rgb(255, 0, 153)
- ✅ Yellow: #ffdd00 / rgb(255, 221, 0)

### Backward Compatibility
- All logo components support both "cmyk" and "gradient" variants
- Default variant is "cmyk"
- Gradient variant uses lime/purple/orange for special cases

## Testing Checklist

- [x] Main header logo displays CMYK cube
- [x] LINGUA text shows "LING" + cyan "UA"
- [x] ROSLYN logo uses cyan accent
- [x] NUMERICA logo uses magenta accent
- [x] WebGL top bar uses cyan accent
- [x] Sticker icons use CMYK tints
- [x] Node ports use CMYK colors
- [x] No teal or purple colors remain

## Visual Examples

### Logo Progression
```
Old:  [Black Hexagon] LINGUA (teal UA)
New:  [CMYK Cube] LINGUA (cyan UA, bold)
```

### Accent Colors
```
Old:  ROSLYN (teal)    NUMERICA (purple)
New:  ROSLYN (cyan)    NUMERICA (magenta)
```

### Cube Faces
```
    Yellow
   /      \
Magenta  Cyan
```

## Ontological Alignment

The CMYK branding aligns with Lingua's ontology:

| CMYK Color | Lingua Domain | Semantic Layer |
|------------|---------------|----------------|
| **Cyan** | ROSLYN | Geometric/Spatial |
| **Magenta** | NUMERICA | Computational/Logical |
| **Yellow** | Parameters | Numeric/Quantitative |
| **Black** | Structure | Foundational/Geometric |

## Future Enhancements

### Potential Additions
- [ ] Animated cube rotation on hover
- [ ] Gradient transitions between CMYK colors
- [ ] Dark mode CMYK palette variants
- [ ] Accessibility contrast testing
- [ ] Print-ready CMYK color profiles

### Maintenance
- Keep CMYK constants in sync across all components
- Update documentation when adding new logo variants
- Test color consistency across different displays
- Ensure WCAG AA contrast requirements are met

## References

- **Color Module**: `client/src/workflow/colors.ts`
- **Render Palette**: `client/src/utils/renderPalette.ts`
- **Global CSS**: `client/src/styles/global.css`
- **Logo Components**: `client/src/components/`
- **WebGL Renderers**: `client/src/webgl/ui/`

## Summary

The CMYK branding update provides:
1. ✅ Consistent visual identity across all logos
2. ✅ Semantic color meanings aligned with Lingua's ontology
3. ✅ Modern, vibrant tri-colored cube logo
4. ✅ Clear distinction between ROSLYN (cyan) and NUMERICA (magenta)
5. ✅ Professional, cohesive brand presentation
6. ✅ Improved visual hierarchy with bold accent text
7. ✅ Foundation for future branding enhancements

**The new CMYK branding is now live across the entire Lingua application!** 🎯
