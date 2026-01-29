import { hexToRgb, type RGB } from "./color";

export type RenderPaletteId = "color" | "cmyk" | "pms" | "hsl";

export type RenderPaletteValues = [number, number];

export const CMYK_SWATCHES = [
  { value: "cyan", label: "Cyan", hex: "#00B7EB" },
  { value: "pink", label: "Pink", hex: "#FF4FA3" },
  { value: "yellow", label: "Yellow", hex: "#F6D21A" },
] as const;

export const PMS_SWATCHES = [
  { value: "186c", label: "PMS 186 C", hex: "#C8102E" },
  { value: "299c", label: "PMS 299 C", hex: "#00A3E0" },
  { value: "1375c", label: "PMS 1375 C", hex: "#FF9E1B" },
  { value: "347c", label: "PMS 347 C", hex: "#009A44" },
  { value: "2597c", label: "PMS 2597 C", hex: "#5F259F" },
  { value: "123c", label: "PMS 123 C", hex: "#FFC72C" },
] as const;

const WHITE: RGB = [1, 1, 1];
const BLACK: RGB = [0, 0, 0];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const mixRgb = (a: RGB, b: RGB, t: number): RGB => {
  const clamped = clamp01(t);
  return [
    a[0] + (b[0] - a[0]) * clamped,
    a[1] + (b[1] - a[1]) * clamped,
    a[2] + (b[2] - a[2]) * clamped,
  ];
};

const applyTintShade = (color: RGB, tint: number, shade: number): RGB => {
  const tinted = mixRgb(color, WHITE, clamp01(tint));
  return mixRgb(tinted, BLACK, clamp01(shade));
};

const normalizeHue = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  const wrapped = value % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
};

export const hslToRgb = (hue: number, saturation: number, lightness: number): RGB => {
  const h = normalizeHue(hue);
  const s = clamp01(saturation);
  const l = clamp01(lightness);

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return [clamp01(r + m), clamp01(g + m), clamp01(b + m)];
};

export const normalizePaletteValues = (value: unknown): RenderPaletteValues | null => {
  if (!Array.isArray(value) || value.length < 2) return null;
  const [first, second] = value;
  if (typeof first !== "number" || typeof second !== "number") return null;
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
  return [first, second];
};

const resolveCmykBase = (swatch?: string | null): RGB | null => {
  const match =
    (swatch
      ? CMYK_SWATCHES.find((item) => item.value === swatch)
      : null) ?? CMYK_SWATCHES[0];
  return hexToRgb(match.hex);
};

const resolvePmsBase = (position: number): RGB | null => {
  const total = PMS_SWATCHES.length;
  if (total === 0) return null;
  const clamped = clamp01(position);
  const scaled = clamped * (total - 1);
  const lowIndex = Math.floor(scaled);
  const highIndex = Math.min(total - 1, Math.ceil(scaled));
  const blend = scaled - lowIndex;
  const low = hexToRgb(PMS_SWATCHES[lowIndex]?.hex);
  const high = hexToRgb(PMS_SWATCHES[highIndex]?.hex);
  if (!low || !high) return low ?? high;
  return mixRgb(low, high, blend);
};

export const resolvePaletteColor = ({
  palette,
  values,
  swatch,
  baseColor,
}: {
  palette: RenderPaletteId;
  values: RenderPaletteValues;
  swatch?: string | null;
  baseColor?: RGB | null;
}): RGB | null => {
  const [first, second] = values;

  switch (palette) {
    case "color":
      return baseColor ?? null;
    case "cmyk": {
      const base = resolveCmykBase(swatch);
      if (!base) return null;
      const inkLoad = clamp01(first);
      const key = clamp01(second);
      return applyTintShade(base, 1 - inkLoad, key * 0.85);
    }
    case "pms": {
      const base = resolvePmsBase(first);
      if (!base) return null;
      const shade = clamp01(second);
      return applyTintShade(base, (1 - shade) * 0.35, shade * 0.45);
    }
    case "hsl": {
      const hue = Number.isFinite(first) ? first : 0;
      const lightness = clamp01(second);
      return hslToRgb(hue, 0.72, lightness);
    }
    default:
      return baseColor ?? null;
  }
};

export const resolvePaletteShading = (
  palette: RenderPaletteId,
  values: RenderPaletteValues
) => {
  const [first, second] = values;

  switch (palette) {
    case "color":
      return {
        ambientStrength: lerp(0.45, 0.9, clamp01(first)),
        sheenIntensity: lerp(0, 0.18, clamp01(second)),
      };
    case "cmyk":
      return {
        ambientStrength: lerp(0.4, 0.95, clamp01(first)),
        sheenIntensity: lerp(0, 0.14, clamp01(second)),
      };
    case "pms":
      return {
        ambientStrength: lerp(0.42, 0.9, clamp01(first)),
        sheenIntensity: lerp(0.02, 0.16, clamp01(second)),
      };
    case "hsl": {
      const lightness = clamp01(second);
      return {
        ambientStrength: lerp(0.35, 0.95, lightness),
        sheenIntensity: lerp(0, 0.12, lightness),
      };
    }
    default:
      return {};
  }
};
