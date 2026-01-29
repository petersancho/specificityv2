# WebGL Buttons, Icons, and Nodes — CMYK Palette

## Core Rules
- Icons are single‑glyph and monochrome (one fill color).
- Button/node bodies are neutral; category color lives on the icon (optional accent bar/chip).
- Minimum readable size: 16px (design at 24px, downscale).

## Neutrals (Global)
- Porcelain (primary surface): #F5F2EE
- Light Grey UI (WebGL button background): #E9E6E2
- Mid Grey (borders/dividers): #C9C5C0
- Ink (text/icons when neutral): #1F1F22

## CMYK‑ish Accents
- Cyan (Primitives): #00C2D1
- Magenta/Pink (Curves): #FF4FB6
- Yellow (Math): #FFC533
- Purple (Mesh): #7A5CFF
- Orange (Surface — later): #FF8A3D

## Roslyn Command Groups (Starter Set)
| Group     | Icon Color | Optional Accent |
|-----------|------------|-----------------|
| Primitive | #00C2D1    | Left 3px bar     |
| Curve     | #FF4FB6    | Left 3px bar     |
| Mesh      | #7A5CFF    | Left 3px bar     |

## Node Categories (Numerica)
| Category  | Body        | Header Strip | Icon Color |
|-----------|-------------|--------------|------------|
| Math      | #F5F2EE     | #E9E6E2      | #FFC533    |
| Primitive | #F5F2EE     | #E9E6E2      | #00C2D1    |
| Curve     | #F5F2EE     | #E9E6E2      | #FF4FB6    |
| Mesh      | #F5F2EE     | #E9E6E2      | #7A5CFF    |

## Token Table
- --sp-porcelain: #F5F2EE
- --sp-uiGrey: #E9E6E2
- --sp-divider: #C9C5C0
- --sp-ink: #1F1F22
- --sp-cyan: #00C2D1
- --sp-pink: #FF4FB6
- --sp-yellow: #FFC533
- --sp-purple: #7A5CFF
- --sp-orange: #FF8A3D

## Usage Guidelines

- Keep icons monochrome; use category color for the glyph only.
- Use neutral surfaces for button bodies; avoid filling entire buttons with accent colors.
- Disabled state: reduce icon alpha to ~0.4 and remove accent bars.
- Hover state: lighten icon color by ~10% without shifting hue.

## Implementation Notes

- Mirror these tokens in both CSS variables and WebGL uniform tables.
- Prefer sRGB hex values in UI code; convert to linear space in shaders if needed.
