# Numerica Brand Kit

**Purpose:** Visual design system for Numerica nodes — vibrant CMYK + Porcelain aesthetic with pixel-perfect execution.

**Philosophy:** Pixels, Stickers, and Color. Sharp, bold, and unapologetically vibrant.

**Last Updated:** January 30, 2026

---

## Table of Contents

1. [Core Principles](#core-principles) — Pixels, Stickers, Color
2. [Color Palette](#color-palette) — CMYK + Porcelain colors
3. [Shadow System](#shadow-system) — Black opaque drop shadows
4. [Node Design](#node-design-specifications) — Dimensions and structure
5. [Category Colors](#category-colors-cmyk-inspired) — 24 node categories
6. [Port Colors](#port-colors-by-type) — Type-based coloring
7. [Sticker Icons](#sticker-icons) — Icon colors and shadows
8. [Implementation](#implementation-checklist) — How to apply

---

## Quick Reference

**Core Colors:**
- Canvas: `#f8f6f2` (porcelain)
- Node Fill: `#ffffff` (pure white)
- Border: `#000000` (black, 2px)
- Shadow: `0 4px 0 #000000` (no blur)

**CMYK Accents:**
- Cyan: `#00d4ff`
- Magenta: `#ff0099`
- Yellow: `#ffdd00`
- Purple: `#8800ff`
- Orange: `#ff6600`
- Lime: `#88ff00`

**Interactions:**
- Hover: lift -1px, shadow +1px
- Press: push +1px, shadow -2px
- Transition: 120ms ease

---

## Core Principles

### 1. Pixels
- **Pixel-perfect alignment** — all dimensions are whole integers
- **Crisp edges** — no anti-aliasing on structural elements
- **Grid-aligned** — nodes snap to pixel grid for maximum sharpness
- **Integer coordinates** — x, y positions rounded to whole numbers

### 2. Stickers
- **Tactile feel** — nodes feel like physical stickers on a canvas
- **Black opaque shadows** — solid `#000000` offset shadows, no blur
- **Layered depth** — clear z-order with shadow offset creating depth
- **Sticker aesthetic** — rounded corners, solid fills, bold outlines

### 3. Color
- **CMYK vibrance** — cyan, magenta, yellow, key (black) as primary palette
- **Porcelain base** — warm off-white background for contrast
- **High saturation** — bold, unapologetic color choices
- **Category identity** — each node category has distinct CMYK-inspired color

---

## Color Palette

### Primary Colors (CMYK Inspired)

**Cyan Family**
- Cyan Bright: `#00d4ff` — primary cyan, electric and sharp
- Cyan Deep: `#0099cc` — darker cyan for accents
- Cyan Soft: `#ccf5ff` — light cyan for bands

**Magenta Family**
- Magenta Bright: `#ff0099` — primary magenta, bold and vibrant
- Magenta Deep: `#cc0077` — darker magenta for accents
- Magenta Soft: `#ffccee` — light magenta for bands

**Yellow Family**
- Yellow Bright: `#ffdd00` — primary yellow, warm and energetic
- Yellow Deep: `#cc9900` — darker yellow for accents
- Yellow Soft: `#fff5cc` — light yellow for bands

**Key (Black) Family**
- Key Black: `#000000` — pure black for shadows and text
- Key Charcoal: `#1a1a1a` — near-black for strong accents
- Key Graphite: `#333333` — dark gray for secondary text

### Porcelain Base

**Porcelain White**
- Canvas: `#f8f6f2` — warm off-white, main canvas background
- Surface: `#ffffff` — pure white for node fills
- Cream: `#faf8f5` — slightly warmer white for hover states

**Porcelain Grays**
- Light Gray: `#e8e6e2` — subtle borders and dividers
- Mid Gray: `#c9c5c0` — stronger borders
- Dark Gray: `#6a6661` — muted text

### Accent Colors (CMYK Blends)

**Cyan-Magenta Blend**
- Electric Purple: `#8800ff` — solver nodes
- Violet: `#b366ff` — goal nodes

**Magenta-Yellow Blend**
- Hot Orange: `#ff6600` — optimization nodes
- Coral: `#ff9966` — warm accents

**Yellow-Cyan Blend**
- Lime Green: `#88ff00` — analysis nodes
- Spring Green: `#ccff99` — fresh accents

**Cyan-Key Blend**
- Deep Blue: `#0066cc` — data nodes
- Sky Blue: `#66b3ff` — cool accents

---

## Shadow System

### Black Opaque Drop Shadow

**Specification:**
- Color: `#000000` (pure black, 100% opacity)
- Offset: `0px 4px 0px #000000` (vertical offset only)
- No blur, no spread — crisp hard edge
- Creates sticker-on-canvas effect

**Implementation:**
```css
/* Node shadow */
box-shadow: 0 4px 0 #000000;

/* Hover state - lift the sticker */
box-shadow: 0 6px 0 #000000;
transform: translateY(-2px);

/* Pressed state - push the sticker */
box-shadow: 0 2px 0 #000000;
transform: translateY(2px);
```

**Canvas Implementation:**
```javascript
// Draw shadow first (behind node)
ctx.fillStyle = '#000000';
ctx.fillRect(x, y + 4, width, height); // 4px offset

// Then draw node on top
ctx.fillStyle = nodeFill;
ctx.fillRect(x, y, width, height);
```

---

## Node Design Specifications

### Dimensions (Pixel-Perfect)

**Standard Node**
- Width: `180px` (fixed)
- Min Height: `98px`
- Border Radius: `4px`
- Border Width: `2px`
- Shadow Offset: `4px` vertical

**Node Band (Category Header)**
- Height: `16px`
- Accent Line: `2px` at bottom

**Ports**
- Radius: `5px`
- Spacing: `16px` vertical
- Offset from edge: `0px` (flush with node edge)

**Text**
- Category Label: `9px`, `600 weight`, uppercase, `0.12em` letter-spacing
- Node Label: `13px`, `600 weight`
- Detail Text: `11px`, `500 weight`
- Port Labels: `9px`, `600 weight`

### Node Structure

```
┌─────────────────────────────────┐
│ CATEGORY BAND (16px)            │ ← Colored band with category
├─────────────────────────────────┤
│                                  │
│        [ICON 28×28]              │ ← Centered icon
│                                  │
│     Node Label (13px)            │ ← Bold label
│                                  │
│  ○ Input    Output ○             │ ← Ports with labels
│                                  │
│  Detail text (11px)              │ ← Description or value
│                                  │
└─────────────────────────────────┘
     └─ 4px black shadow ─┘
```

---

## Category Colors (CMYK-Inspired)

### Data & UI
- **Data**: Cyan Deep `#0099cc` / Band: Cyan Soft `#d4f0ff` / Port: `#66ccff`
- **Basics**: Yellow Deep `#cc9900` / Band: Yellow Soft `#fff5cc` / Port: `#ffdd66`

### Geometry Creation
- **Primitives**: Cyan Bright `#00d4ff` / Band: `#ccf5ff` / Port: `#66e5ff`
- **Curves**: Magenta Bright `#ff0099` / Band: `#ffccee` / Port: `#ff66bb`
- **NURBS**: Cyan-Magenta `#6600cc` / Band: `#e6ccff` / Port: `#9966ff`
- **BREP**: Hot Orange `#ff6600` / Band: `#ffeacc` / Port: `#ffaa66`

### Mesh Operations
- **Mesh**: Electric Purple `#8800ff` / Band: `#e6ccff` / Port: `#b366ff`
- **Tessellation**: Cyan Deep `#0066cc` / Band: `#cce5ff` / Port: `#66aaff`

### Transforms & Arrays
- **Transforms**: Magenta Deep `#cc0077` / Band: `#ffd9ee` / Port: `#ff66aa`
- **Arrays**: Yellow Bright `#ffdd00` / Band: `#fff9cc` / Port: `#ffee66`
- **Modifiers**: Coral `#ff9966` / Band: `#fff0e6` / Port: `#ffbb88`

### Math & Logic
- **Math**: Yellow Deep `#cc9900` / Band: `#fff0cc` / Port: `#ffcc66`
- **Logic**: Deep Blue `#0066cc` / Band: `#cce5ff` / Port: `#66aaff`
- **Euclidean**: Cyan-Magenta `#6600ff` / Band: `#e6ccff` / Port: `#9966ff`

### Analysis & Measurement
- **Analysis**: Lime Green `#88ff00` / Band: `#f0ffcc` / Port: `#bbff66`
- **Measurement**: Cyan Bright `#00cccc` / Band: `#ccffff` / Port: `#66eeee`

### Solvers (Special Treatment)
- **Solver**: Electric Purple `#8800ff` / Gradient: `#9933ff` → `#7700dd` / Text: White
- **Goal**: Violet `#b366ff` / Gradient: `#cc99ff` → `#aa66ff` / Text: Dark

### Optimization & Voxel
- **Optimization**: Magenta-Yellow `#ff0066` / Band: `#ffcce6` / Port: `#ff66aa`
- **Voxel**: Lime Green `#66cc00` / Band: `#e6ffcc` / Port: `#99dd66`

### Interop
- **Interchange**: Deep Blue `#0055aa` / Band: `#cce0ff` / Port: `#6699cc`

---

## Port Colors by Type

**Type-Based Coloring:**
- `number`: Yellow Bright `#ffdd00`
- `boolean`: Magenta Bright `#ff0099`
- `string`: Cyan Bright `#00d4ff`
- `vector`: Lime Green `#88ff00`
- `geometry`: Electric Purple `#8800ff`
- `goal`: Violet `#b366ff`
- `any`: Mid Gray `#999999`

---

## Pixel-Perfect Guidelines

### Alignment Rules
1. **All coordinates are integers** — round x, y to whole pixels
2. **All dimensions are integers** — width, height are whole numbers
3. **Border widths are integers** — 1px, 2px, 3px (no 1.5px)
4. **Shadow offsets are integers** — 4px, 6px, 8px (no 3.5px)

### Rendering Order (Canvas)
1. Draw grid (background)
2. Draw edges (connections)
3. Draw node shadows (4px offset)
4. Draw node bodies (fills + strokes)
5. Draw node bands (category headers)
6. Draw icons (centered)
7. Draw text (labels, details)
8. Draw ports (circles on top)

### Hover & Interaction States

**Hover:**
- Shadow: `0 6px 0 #000000` (lift 2px)
- Transform: `translateY(-2px)`
- Fill: Slightly lighter (5% lighter)

**Pressed:**
- Shadow: `0 2px 0 #000000` (compress)
- Transform: `translateY(2px)`

**Selected:**
- Border: Thicker (3px instead of 2px)
- Border Color: Accent color at full saturation

---

## Typography

### Font Stack
- **Sans-serif**: `"Montreal Neue", "Space Grotesk", system-ui, sans-serif`
- **Serif**: `"Noto Serif", "GFS Didot", Georgia, serif` (solver/goal nodes)
- **Mono**: `"JetBrains Mono", "IBM Plex Mono", monospace` (data panels)
- **Handwriting**: `"Caveat", "Kalam", "Patrick Hand", cursive` (text nodes)

### Text Rendering
- **Anti-aliasing**: Enabled for text (smooth)
- **Subpixel rendering**: Enabled
- **Letter-spacing**: `0.02em` for labels, `0.12em` for category headers
- **Line-height**: `1.2` for labels, `1.4` for body text

---

## Grid System

**Canvas Grid:**
- Minor Grid: `24px` intervals, `rgba(0, 0, 0, 0.06)`
- Major Grid: `120px` intervals (5× minor), `rgba(0, 0, 0, 0.12)`
- Snap: Nodes snap to minor grid (24px)

---

## Animation & Motion

**Timing:**
- Fast: `120ms` — hover, port highlight
- Normal: `200ms` — node drag, selection
- Slow: `360ms` — panel expand, group resize

**Easing:**
- Standard: `cubic-bezier(0.2, 0.8, 0.2, 1)` — smooth acceleration/deceleration
- Bounce: `cubic-bezier(0.68, -0.55, 0.265, 1.55)` — playful overshoot (use sparingly)

---

## Implementation Checklist

### Canvas Rendering (NumericalCanvas.tsx)
- [ ] Update `NODE_SHADOW_OFFSET` to `4` (currently `3`)
- [ ] Set shadow color to `#000000` (pure black, no transparency)
- [ ] Update category colors in `NODE_CATEGORIES` array
- [ ] Update port type colors in `PORT_TYPE_COLOR`
- [ ] Ensure all node coordinates are rounded to integers
- [ ] Update hover/pressed shadow offsets

### CSS Variables (global.css)
- [ ] Update `--shadow-node` to `0 4px 0 #000000`
- [ ] Update `--shadow-node-hover` to `0 6px 0 #000000`
- [ ] Update `--shadow-node-pressed` to `0 2px 0 #000000`
- [ ] Add CMYK color variables
- [ ] Update porcelain base colors

### Visual Verification
- [ ] Nodes have crisp black shadows (no blur)
- [ ] All colors are vibrant and saturated
- [ ] Pixel alignment is perfect (no blurry edges)
- [ ] Category bands are clearly visible
- [ ] Ports pop with bright colors
- [ ] Text is sharp and readable

---

## Design Philosophy

**"Pixels, Stickers, and Color"**

This isn't a subtle, muted design system. Numerica nodes are **bold**, **vibrant**, and **unapologetically colorful**. They're digital stickers on a porcelain canvas — tactile, playful, and precise. Every pixel matters. Every color choice is intentional. The black shadows aren't soft gradients — they're hard-edged drops that make nodes feel like physical objects you can pick up and move.

CMYK isn't just a color model — it's a mindset. Cyan, Magenta, Yellow, and Key (black) are the building blocks of printed color, and here they're the building blocks of visual identity. Each category gets its own CMYK-inspired hue, creating a rainbow of computational tools that's both systematic and joyful.

Porcelain provides the perfect backdrop — warm, clean, and neutral enough to let the vibrant nodes sing. It's not stark white (too clinical) or gray (too dull). It's the color of fine china, of craftsmanship, of something worth protecting.

**Be sharp. Be bold. Be pixel-perfect.**

---

## Sticker Icons

### CMYK Sticker Palette

All sticker icons use vibrant CMYK colors with subtle drop shadows:

**Goal Node Stickers:**
- Goal: Electric Purple `#8800ff`
- Stiffness: Cyan Bright `#00d4ff`
- Volume: Magenta Bright `#ff0099`
- Load: Yellow Bright `#ffdd00`
- Anchor: Lime Green `#66cc00`

**Sticker Variations:**
- **Library variant**: 3px drop shadow `rgba(0, 0, 0, 0.4)` - bolder for node palette
- **Site variant**: 2px drop shadow `rgba(0, 0, 0, 0.25)` - subtler for in-canvas use

**CMYK Swatch Rotation:**
```typescript
CMYK_SWATCHES = [
  { value: "cyan", hex: "#00d4ff" },
  { value: "magenta", hex: "#ff0099" },
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
