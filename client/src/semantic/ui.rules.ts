import tokens from "./ui.tokens.json";

export type BorderWidth = "1px" | "2px" | "3px";
export type TypographyRole =
  | "title"
  | "heading"
  | "body"
  | "detail"
  | "label"
  | "micro";

export interface TypographyScale {
  role: TypographyRole;
  size: number;
}

export interface UIRule {
  id: string;
  description: string;
}

const ALLOWED_BORDER_WIDTHS = new Set<BorderWidth>(["1px", "2px", "3px"]);

export const crispnessRules: UIRule[] = [
  {
    id: "border.integer",
    description: "Border widths must be 1px, 2px, or 3px. No fractional pixel borders are allowed.",
  },
  {
    id: "pixel.snap",
    description: "All 1px strokes must align to the pixel grid. Apply translateZ(0) or devicePixelRatio-aware transforms when rendering WebGL or canvas primitives.",
  },
  {
    id: "asset.svg",
    description: "Logos and icons smaller than 64px must render as SVG/vector to avoid raster fuzziness.",
  },
];

export const minimalismRules: UIRule[] = [
  {
    id: "signal.single",
    description: "Each control may use either a border OR the signature hard shadow as its dominant signal, never both competing at once.",
  },
  {
    id: "grid.subtle",
    description: "Decorative grids must remain low-contrast (opacity <= 12%) and only on background surfaces.",
  },
  {
    id: "panel.quiet",
    description: "Panels share the porcelain palette with 1–2px strokes and no gradients or glow effects.",
  },
];

export const interactionRules: UIRule[] = [
  {
    id: "hover.contrast",
    description: "Hover states use subtle contrast or tint adjustments—never glow or blur.",
  },
  {
    id: "press.mechanical",
    description: "Press states translate toward the signature shadow by 1–2px while the shadow offset shortens. Animation duration must live between 60–120ms using a snappy easing curve.",
  },
];

export const typographyRules: UIRule[] = [
  {
    id: "font.primary",
    description: "Titles, nodes, and hero labels use GFS Didot exclusively. Utility labels and UI chrome use Montreal Neue exclusively.",
  },
  {
    id: "font.scale",
    description: "All copy must clamp to the 12/13/14/16/20/24 scale for readability consistency.",
  },
];

export const typographyScale: TypographyScale[] = [
  { role: "title", size: 24 },
  { role: "heading", size: 20 },
  { role: "body", size: 16 },
  { role: "detail", size: 14 },
  { role: "label", size: 13 },
  { role: "micro", size: 12 },
];

export const uiRules = {
  crispness: crispnessRules,
  minimalism: minimalismRules,
  interactions: interactionRules,
  typography: typographyRules,
  scale: typographyScale,
  tokens,
};

export function isValidBorderWidth(value: string | number): boolean {
  const normalized = typeof value === "number" ? `${value}px` : value;
  return ALLOWED_BORDER_WIDTHS.has(normalized as BorderWidth);
}

export function nearestTypographySize(size: number): TypographyScale {
  return typographyScale.reduce((closest, current) => {
    const currentDelta = Math.abs(current.size - size);
    const closestDelta = Math.abs(closest.size - size);
    return currentDelta < closestDelta ? current : closest;
  });
}

export function describeRule(rule: UIRule): string {
  return `${rule.id}: ${rule.description}`;
}
