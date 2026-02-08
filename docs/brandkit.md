# Lingua Brand Kit — Black · White · Red

**Purpose:** unify every Lingua touchpoint behind a disciplined monochrome palette with a single red accent.

**Philosophy:** Architecture, ink, and signal. The interface should feel like a drafting table illuminated by a red indicator light—serious, minimal, and deliberate.

**Last Updated:** February 7, 2026

---

## Table of Contents

1. [Core Tenets](#core-tenets)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Component Styling](#component-styling)
5. [Interaction & Motion](#interaction--motion)
6. [Implementation Checklist](#implementation-checklist)
7. [Deprecations](#deprecations)

---

## Core Tenets

1. **Black & White First** – every surface, border, and shadow uses pure black, pure white, or calibrated grays. Color only appears when it conveys intent.
2. **Red as Signal** – `#BF0D0D` is the only chromatic hue. Use it for highlights, focus states, active tabs, and critical annotations. Never tint it toward pink or orange.
3. **Equal Fonts** – *Neue Montreal* (sans) and *GFS Didot* (serif) are co-primary. Mix them deliberately within the same component to create hierarchy (e.g., Montreal for body/caps, Didot for emphasis or numerals).
4. **Mechanical Shadows** – all elevations use opaque black drop shadows (`0 4px 0 #000`). No blur, no gradients.
5. **Integer Layout** – align everything to whole pixels. Borders are 1px or 2px, never 1.5px.

---

## Color System

| Token | Hex | Usage |
| --- | --- | --- |
| `--brand-white` | `#FFFFFF` | Canvas backgrounds, large cards |
| `--brand-black` | `#000000` | Text, borders, sticker shadows |
| `--ink-900` | `#050505` | Primary text on light backgrounds |
| `--ink-700` | `#3F3F3F` | Secondary text, dividers |
| `--fog-100` | `#F8F8F8` | Panels, porcelain plates |
| `--fog-300` | `#E0E0E0` | Hairline borders |
| `--brand-red` | `#BF0D0D` | Interactive accent (10% maximum coverage) |
| `--brand-red-deep` | `#8C0808` | Active states on dark surfaces |
| `--brand-red-soft` | `rgba(191,13,13,0.18)` | Glows, orbits, diagram fields |

**Rules:**
- Red never gradients into other hues. Pair it with transparency or black.
- Monochrome gradients must stay within white↔black range (no warm/cool tints).
- Sticker icons keep internal color for recognition, but their frames are monochrome.

---

## Typography

| Role | Font Stack | Notes |
| --- | --- | --- |
| Body / UI | `"Neue Montreal", "GFS Didot", system-ui, sans-serif` | Use 500 weight for paragraphs, 600 for caps. |
| Titles / Numerals | `"GFS Didot", "Neue Montreal", serif` | Works in tandem with Montreal; avoid italic unless quoting. |
| Mono | `"JetBrains Mono", "IBM Plex Mono", monospace` | Code blocks, file paths. |

**Equal Usage Guidance**
- Pair Montreal (uppercase caps) with Didot (small-caps or numerals) inside the same card.
- Diagram nodes: Montreal for titles, Didot for descriptors.
- Buttons: Montreal for labels; Didot reserved for badges or hero numbers.

---

## Component Styling

### Diagram & Cards
- Background: layered monochrome gradients + subtle red glow (`var(--brand-red-soft)`).
- Nodes: pure black panels with 1px white border; active nodes add red highlight.
- Wires: color-mix of red + white (`color-mix(in srgb, var(--brand-red) 65%, #fff)`).
- Cards: gradient from `#000` to `#141414`, red light wash at 20°.
- File buttons: `#0B0B0B` fill, white text, red focus border.

### Code Viewer
- Background `#010101`, border `rgba(255,255,255,0.08)`.
- Context panel uses translucent white gradient for contrast.
- Scrollbars monochrome; highlight line uses `var(--brand-red-soft)`.

### Shadows
- Default: `0 4px 0 #000000`
- Hover: `0 6px 0 #000000`
- Pressed: `0 2px 0 #000000`

### Motion
- Micro-interactions 120ms cubic-bezier(0.4,0,0.2,1).
- Diagram hover: translateY(-3px).
- No easing overshoot; keep motion mechanical.

---

## Interaction & Motion

| State | Treatment |
| --- | --- |
| Hover | Lift 2–3px, increase shadow, raise border opacity |
| Press | Compress 2px, shadow shrinks |
| Focus | 1px white outline + 1px red inset (no glow) |
| Active Tab | Fill with `rgba(255,255,255,0.12)`, text white |

Scroll areas remain page-scrolling; interactive modules cannot capture scroll.

---

## Implementation Checklist

1. **CSS tokens** – ensure `global.css` exports `--brand-*` variables and Montreal font faces.
2. **Components** – cards, diagram, and viewer all use monochrome gradients plus red highlight.
3. **Data modules** – `liveCodebaseData.ts` uses red/gray accents only.
4. **Fonts** – all typography stacks reference both "Neue Montreal" and "GFS Didot".
5. **Shadows** – replace any blur shadow with discrete offsets.
6. **Validation** – run `pnpm run validate:all` after styling updates.

---

## Deprecations

- The CMYK brand kit is fully retired. Do **not** reintroduce cyan/magenta/yellow callouts in UI or docs.
- Sticker assets may keep internal CMYK hues for recognition, but their frames, shadows, and containers must obey this monochrome+red system.
- Any legacy reference to `CMYK_SWATCHES`, `--cmyk-*` CSS vars, or “Porcelain + CMYK” copy should be removed or aliased to the new tokens.

**Commitments:** Black and white carry the architecture; red is the only light on the console. Keep it surgical.
  { value: "yellow", hex: "#ffdd00" },
  { value: "purple", hex: "#8800ff" },
  { value: "orange", hex: "#ff6600" },
  { value: "lime", hex: "#88ff00" },
]
```

Stickers are assigned colors based on a hash of their `iconId` and `signature`, ensuring consistent but varied coloring across the node library.

### Sticker Design Rules

1. **Vibrant colors** — high saturation CMYK palette
2. **Subtle shadows** — 2-3px drop shadows, no blur
3. **Consistent sizing** — 64px in library, 28px in nodes
4. **Signature marks** — unique identifier patterns per sticker
5. **Smooth transitions** — 120ms ease for hover effects

---

## Logo Design

### The Cube Logo

The **isometric cube** is the core visual identity of Lingua. It represents:
- **3D space** — the foundation of geometric design
- **Three faces** — Roslyn (modeling), Numerica (computation), and their synthesis
- **Parametric form** — simple geometry with infinite variation through color

**Cube Structure:**
```
     Top Face
    /        \
 Left Face  Right Face
    \        /
     Bottom Edge
```

### Logo Variations

**Lingua Logo (Primary)**
- Top: Yellow `#ffdd00` — creativity, warmth
- Left: Magenta `#ff0099` — bold, vibrant
- Right: Cyan `#00d4ff` — technical, cool
- **Full CMYK spectrum** in one mark

**Roslyn Logo (3D Modeling)**
- Top: Cyan Bright `#00d4ff` — technical precision
- Left: Cyan Deep `#0099cc` — depth, structure
- Right: Cyan Soft `#66e5ff` — light, surface
- **Monochromatic cyan** — focused, technical

**Numerica Logo (Visual Programming)**
- Top: Electric Purple `#8800ff` — computational
- Left: Purple Deep `#6600cc` — logic, depth
- Right: Purple Soft `#b366ff` — parametric flow
- **Monochromatic purple** — systematic, algorithmic

### Logo Usage

**Sizes:**
- Small: 24px (panel headers)
- Medium: 32px (top bar, navigation)
- Large: 48px+ (splash screens, documentation)

**Placement:**
- Top bar (Lingua cube)
- Roslyn panel header (Roslyn cube)
- Numerica panel header (Numerica cube)
- Documentation pages (all variations)
- Loading screens (animated cube)

**With Text:**
- Logo + text: 8px gap
- Font: Montreal Neue, 700 weight
- Size: 0.5× cube size
- Color: Black `#000000`
- Letter-spacing: 0.02em

### Implementation

**Components:**
- `CubeLogo.tsx` — base cube with configurable colors
- `LinguaLogo.tsx` — CMYK cube (yellow/magenta/cyan)
- `RoslynLogo.tsx` — cyan cube (3D modeling)
- `NumericaLogo.tsx` — purple cube (computation)

**Usage:**
```tsx
import LinguaLogo from './LinguaLogo';
import RoslynLogo from './RoslynLogo';
import NumericaLogo from './NumericaLogo';

// Lingua brand
<LinguaLogo size={32} variant="cmyk" />
<LinguaLogo size={32} withText />

// Roslyn (3D)
<RoslynLogo size={24} />
<RoslynLogo size={24} withText />

// Numerica (nodes)
<NumericaLogo size={24} />
<NumericaLogo size={24} withText />
```

---

## Semantic Color Mapping

### Yellow (#ffdd00) - Numeric/Quantitative
**Port Types:** `number`, `vector`
**Categories:** math, basics, arrays, ranges, signals
**Examples:** Width/height parameters, resolution sliders, position vectors

### Magenta (#ff0099) - Logic/Goals
**Port Types:** `boolean`, `goal`, `fitnessSpec`
**Categories:** logic, goal, optimization
**Examples:** Enabled toggles, conditional branches, physics/chemistry goals

### Cyan (#00d4ff) - Text/Specifications
**Port Types:** `string`, `genomeSpec`, `phenotypeSpec`
**Categories:** data, lists, interop, measurement, analysis
**Examples:** Node labels, material names, file paths, metadata

### Black (#000000) - Geometry/Structure
**Port Types:** `geometry`, `mesh`, `nurb`, `brep`, `voxelGrid`, `any`
**Categories:** primitives, curves, nurbs, brep, mesh, voxel, solver, transforms
**Examples:** Box/sphere geometry, mesh data, voxel grids, NURBS curves

---

## CSS Variables

```css
:root {
  /* CMYK Colors */
  --cmyk-yellow: #ffdd00;
  --cmyk-magenta: #ff0099;
  --cmyk-cyan: #00d4ff;
  --cmyk-black: #000000;
  
  /* Neutrals */
  --sp-porcelain: #F5F2EE;
  --sp-uiGrey: #E9E6E2;
  --sp-divider: #C9C5C0;
  --sp-ink: #1F1F22;
  
  /* Brand Colors */
  --brand-accent: var(--cmyk-cyan);
  --brand-accent-deep: var(--cmyk-magenta);
  --brand-accent-glow: rgba(0, 212, 255, 0.18);
  
  /* Shadows */
  --shadow-node: 0 4px 0 #000000;
  --shadow-node-hover: 0 6px 0 #000000;
  --shadow-node-pressed: 0 2px 0 #000000;
}
```

---

## Usage Rules

**DO:**
- Use CMYK colors for all port types and node categories
- Use semantic color mapping (Yellow = numeric, Magenta = logic, etc.)
- Use centralized color functions from `client/src/workflow/colors.ts`
- Use opacity variations (10%, 40%, 80%) for backgrounds and states

**DON'T:**
- Hardcode hex colors in components
- Use arbitrary colors for ports or categories
- Add new colors outside the CMYK palette
- Use gradients in workflow UI

---

## FAQ

**Q: Can I add a new color for a special node type?**
A: No. Use one of the four CMYK colors based on semantic meaning.

**Q: What about gradients or color mixing?**
A: Avoid gradients. Use opacity variations of CMYK colors instead.

**Q: Can I use tints/shades of CMYK colors?**
A: Only through opacity (rgba). Don't create new hex colors.

---

## References

- **Color Module:** `client/src/workflow/colors.ts`
- **Node Registry:** `client/src/workflow/nodeRegistry.ts`
- **Logo Component:** `client/src/components/LinguaLogo.tsx`
- **Top Bar:** `client/src/components/WebGLAppTopBar.tsx`
- **Sticker Icons:** `client/src/components/StickerIcon.tsx`
- **Global Styles:** `client/src/styles/global.css`
