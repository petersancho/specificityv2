import { WebGLUIRenderer, type RGBA } from "../../webgl/ui/WebGLUIRenderer";
import { WebGLIconRenderer, type IconId } from "../../webgl/ui/WebGLIconRenderer";

export type WebGLButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "chip"
  | "icon"
  | "palette"
  | "outliner"
  | "command";

export type WebGLButtonSize = "xs" | "sm" | "md" | "lg";

export type WebGLButtonShape = "auto" | "rounded" | "pill" | "square";

export type WebGLButtonState = "idle" | "hover" | "pressed" | "active" | "disabled";

type SizeSettings = {
  minHeight: number;
  paddingX: number;
  paddingY: number;
  gap: number;
  fontSize: number;
  iconScale: number;
};

type ThemePalette = {
  themeKey: string;
  surface: RGBA;
  surfaceMuted: RGBA;
  border: RGBA;
  accent: RGBA;
  onAccent: RGBA;
  cream: RGBA;
  ink: RGBA;
};

type VariantPalette = {
  fill: RGBA;
  border: RGBA;
  shadow: RGBA;
  glow: RGBA;
  gloss: RGBA;
  text: RGBA;
  icon: RGBA;
};

type RenderOptions = {
  width: number;
  height: number;
  radius: number;
  variant: WebGLButtonVariant;
  state: WebGLButtonState;
  accentColor?: string;
  elevated?: boolean;
};

type IconRenderOptions = {
  iconId: IconId;
  size: number;
  tint: RGBA;
};

type ButtonVisuals = {
  backgroundUrl: string;
  textColor: string;
  iconTint: RGBA;
  radius: number;
  paddingX: number;
  paddingY: number;
  gap: number;
  minHeight: number;
  fontSize: number;
  iconSize: number;
  fallbackFill: string;
  fallbackBorder: string;
};

const SIZE_SETTINGS: Record<WebGLButtonSize, SizeSettings> = {
  xs: { minHeight: 30, paddingX: 10, paddingY: 5, gap: 6, fontSize: 11, iconScale: 0.48 },
  sm: { minHeight: 36, paddingX: 12, paddingY: 6, gap: 7, fontSize: 12, iconScale: 0.5 },
  md: { minHeight: 42, paddingX: 14, paddingY: 7, gap: 8, fontSize: 13, iconScale: 0.52 },
  lg: { minHeight: 48, paddingX: 16, paddingY: 8, gap: 9, fontSize: 14, iconScale: 0.54 },
};

const BUTTON_SUPERSAMPLE = 1.35;

const rgb = (r: number, g: number, b: number, a = 1): RGBA => [r / 255, g / 255, b / 255, a];

const WHITE = rgb(255, 255, 255, 1);
const BLACK = rgb(0, 0, 0, 1);
const NEUTRAL_FILL = rgb(242, 240, 236, 1);
const NEUTRAL_BORDER = rgb(205, 201, 196, 1);
const NEUTRAL_SHADOW = rgb(0, 0, 0, 0.45);

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const mix = (a: RGBA, b: RGBA, t: number): RGBA => {
  const amount = clamp01(t);
  return [
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
    a[3] + (b[3] - a[3]) * amount,
  ];
};

const withAlpha = (color: RGBA, alpha: number): RGBA => [color[0], color[1], color[2], alpha];

const lighten = (color: RGBA, amount: number) => mix(color, WHITE, amount);
const darken = (color: RGBA, amount: number) => mix(color, BLACK, amount);

const toCssColor = (color: RGBA) => {
  const r = Math.round(clamp01(color[0]) * 255);
  const g = Math.round(clamp01(color[1]) * 255);
  const b = Math.round(clamp01(color[2]) * 255);
  const a = clamp01(color[3]);
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
};

let parseCanvas: HTMLCanvasElement | null = null;
let parseCtx: CanvasRenderingContext2D | null = null;

const ensureParseContext = () => {
  if (parseCtx) return parseCtx;
  if (typeof document === "undefined") return null;
  parseCanvas = document.createElement("canvas");
  parseCanvas.width = 2;
  parseCanvas.height = 2;
  parseCtx = parseCanvas.getContext("2d", { willReadFrequently: true });
  return parseCtx;
};

const parseCssColor = (value: string | undefined, fallback: RGBA): RGBA => {
  if (!value) return fallback;
  const ctx = ensureParseContext();
  if (!ctx) return fallback;
  ctx.clearRect(0, 0, 2, 2);
  ctx.fillStyle = "#000";
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  return [data[0] / 255, data[1] / 255, data[2] / 255, data[3] / 255];
};

const readCssVar = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const root = window.getComputedStyle(document.documentElement);
  const value = root.getPropertyValue(name).trim();
  return value || fallback;
};

let cachedTheme: ThemePalette | null = null;

const getThemePalette = (): ThemePalette => {
  if (typeof document === "undefined") {
    return {
      themeKey: "ssr",
      surface: rgb(255, 255, 255, 1),
      surfaceMuted: rgb(245, 245, 245, 1),
      border: rgb(200, 200, 200, 1),
      accent: rgb(249, 115, 22, 1),
      onAccent: rgb(255, 255, 255, 1),
      cream: rgb(247, 243, 234, 1),
      ink: rgb(12, 12, 12, 1),
    };
  }

  const themeKey = document.documentElement.dataset.theme ?? "light";
  if (cachedTheme && cachedTheme.themeKey === themeKey) {
    return cachedTheme;
  }

  const surface = parseCssColor(readCssVar("--color-surface", "#ffffff"), rgb(255, 255, 255, 1));
  const surfaceMuted = parseCssColor(
    readCssVar("--color-surface-muted", "#f5f3ef"),
    rgb(245, 243, 239, 1)
  );
  const border = parseCssColor(readCssVar("--color-border", "#c9c4bb"), rgb(201, 196, 187, 1));
  const accent = parseCssColor(readCssVar("--color-accent", "#f97316"), rgb(249, 115, 22, 1));
  const onAccent = parseCssColor(
    readCssVar("--color-on-accent", "#ffffff"),
    rgb(255, 255, 255, 1)
  );
  const cream = parseCssColor(
    readCssVar("--sp-uiGrey", readCssVar("--roslyn-cream", "#f7f3ea")),
    rgb(233, 230, 226, 1)
  );
  const ink = parseCssColor(readCssVar("--sp-ink", readCssVar("--ink-1000", "#0d0d0d")), rgb(31, 31, 34, 1));

  cachedTheme = {
    themeKey,
    surface,
    surfaceMuted,
    border,
    accent,
    onAccent,
    cream,
    ink,
  };

  return cachedTheme;
};

type RendererHandles = {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  ui: WebGLUIRenderer;
  icons: WebGLIconRenderer;
};

let rendererHandles: RendererHandles | null = null;

const ensureRenderer = (width: number, height: number): RendererHandles | null => {
  if (typeof document === "undefined") return null;
  const canvas = rendererHandles?.canvas ?? document.createElement("canvas");
  if (!rendererHandles) {
    const gl = canvas.getContext("webgl", { antialias: true, alpha: true });
    if (!gl) return null;
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    rendererHandles = {
      canvas,
      gl,
      ui: new WebGLUIRenderer(gl),
      icons: new WebGLIconRenderer(gl),
    };
  }

  const nextWidth = Math.max(1, Math.floor(width));
  const nextHeight = Math.max(1, Math.floor(height));
  if (canvas.width !== nextWidth) canvas.width = nextWidth;
  if (canvas.height !== nextHeight) canvas.height = nextHeight;

  rendererHandles.gl.viewport(0, 0, canvas.width, canvas.height);
  return rendererHandles;
};

const backgroundCache = new Map<string, string>();
const iconCache = new Map<string, string>();

const getVariantBasePalette = (
  variant: WebGLButtonVariant,
  accentOverride?: string
): VariantPalette => {
  const theme = getThemePalette();
  const accent = accentOverride
    ? parseCssColor(accentOverride, theme.accent)
    : theme.ink;
  const cream = theme.cream;
  const ink = theme.ink;
  const border = theme.border;

  switch (variant) {
    case "primary":
      return {
        fill: cream,
        border: withAlpha(darken(border, 0.1), 0.9),
        shadow: withAlpha(darken(ink, 0.6), 0.36),
        glow: withAlpha(lighten(accent, 0.3), 0.32),
        gloss: withAlpha(WHITE, 0.24),
        text: ink,
        icon: accent,
      };
    case "ghost":
      return {
        fill: withAlpha(cream, 0.95),
        border: withAlpha(darken(border, 0.15), 0.7),
        shadow: withAlpha(darken(ink, 0.35), 0.28),
        glow: withAlpha(lighten(accent, 0.35), 0.24),
        gloss: withAlpha(WHITE, 0.16),
        text: ink,
        icon: accent,
      };
    case "chip":
      return {
        fill: cream,
        border: withAlpha(darken(border, 0.1), 0.86),
        shadow: withAlpha(darken(ink, 0.45), 0.26),
        glow: withAlpha(lighten(accent, 0.4), 0.2),
        gloss: withAlpha(WHITE, 0.2),
        text: ink,
        icon: accent,
      };
    case "icon":
      return {
        fill: NEUTRAL_FILL,
        border: NEUTRAL_BORDER,
        shadow: NEUTRAL_SHADOW,
        glow: withAlpha(BLACK, 0),
        gloss: withAlpha(WHITE, 0),
        text: ink,
        icon: accent,
      };
    case "palette": {
      return {
        fill: NEUTRAL_FILL,
        border: NEUTRAL_BORDER,
        shadow: NEUTRAL_SHADOW,
        glow: withAlpha(BLACK, 0),
        gloss: withAlpha(WHITE, 0),
        text: ink,
        icon: accent,
      };
    }
    case "outliner":
      return {
        fill: NEUTRAL_FILL,
        border: NEUTRAL_BORDER,
        shadow: NEUTRAL_SHADOW,
        glow: withAlpha(BLACK, 0),
        gloss: withAlpha(WHITE, 0),
        text: ink,
        icon: accent,
      };
    case "command":
      return {
        fill: NEUTRAL_FILL,
        border: NEUTRAL_BORDER,
        shadow: NEUTRAL_SHADOW,
        glow: withAlpha(BLACK, 0),
        gloss: withAlpha(WHITE, 0),
        text: ink,
        icon: accent,
      };
    case "secondary":
    default:
      return {
        fill: cream,
        border: withAlpha(darken(ink, 0.03), 0.92),
        shadow: withAlpha(darken(ink, 0.65), 0.34),
        glow: withAlpha(lighten(accent, 0.32), 0.24),
        gloss: withAlpha(WHITE, 0.22),
        text: ink,
        icon: accent,
      };
  }
};

const applyStateToPalette = (base: VariantPalette, state: WebGLButtonState): VariantPalette => {
  switch (state) {
    case "hover":
      return {
        fill: lighten(base.fill, 0.04),
        border: lighten(base.border, 0.03),
        shadow: withAlpha(base.shadow, base.shadow[3] * 0.85),
        glow: withAlpha(lighten(base.glow, 0.05), base.glow[3] * 1.1),
        gloss: withAlpha(lighten(base.gloss, 0.08), base.gloss[3] * 1.05),
        text: lighten(base.text, 0.02),
        icon: lighten(base.icon, 0.02),
      };
    case "pressed":
      return {
        fill: darken(base.fill, 0.06),
        border: darken(base.border, 0.05),
        shadow: withAlpha(base.shadow, base.shadow[3] * 0.6),
        glow: withAlpha(base.glow, base.glow[3] * 0.6),
        gloss: withAlpha(base.gloss, base.gloss[3] * 0.5),
        text: darken(base.text, 0.03),
        icon: darken(base.icon, 0.03),
      };
    case "active":
      return {
        fill: darken(base.fill, 0.1),
        border: darken(base.border, 0.08),
        shadow: withAlpha(base.shadow, base.shadow[3] * 0.7),
        glow: withAlpha(base.glow, base.glow[3] * 0.9),
        gloss: withAlpha(base.gloss, base.gloss[3] * 0.8),
        text: lighten(base.text, 0.04),
        icon: lighten(base.icon, 0.05),
      };
    case "disabled": {
      const desaturatedFill = mix(base.fill, rgb(160, 160, 160, 1), 0.35);
      const mutedBorder = mix(base.border, rgb(140, 140, 140, 1), 0.4);
      const mutedText = mix(base.text, rgb(120, 120, 120, 1), 0.55);
      return {
        fill: withAlpha(desaturatedFill, Math.max(0.4, base.fill[3] * 0.7)),
        border: withAlpha(mutedBorder, Math.max(0.3, base.border[3] * 0.65)),
        shadow: withAlpha(base.shadow, Math.max(0.1, base.shadow[3] * 0.45)),
        glow: withAlpha(base.glow, Math.max(0.06, base.glow[3] * 0.35)),
        gloss: withAlpha(base.gloss, Math.max(0.04, base.gloss[3] * 0.45)),
        text: withAlpha(mutedText, 0.68),
        icon: withAlpha(mutedText, 0.72),
      };
    }
    case "idle":
    default:
      return base;
  }
};

const drawGlossBands = (
  ui: WebGLUIRenderer,
  width: number,
  height: number,
  radius: number,
  gloss: RGBA,
  intensity = 1
) => {
  const bands = 5;
  const topHeight = height * 0.58;
  for (let i = 0; i < bands; i += 1) {
    const t = i / bands;
    const bandHeight = topHeight / bands;
    const y = height * 0.06 + bandHeight * i;
    const fade = (1 - t) * 0.22 * intensity;
    const alpha = clamp01(gloss[3] * fade);
    if (alpha <= 0.01) continue;
    ui.drawRoundedRect(0, y, width, bandHeight + height * 0.04, radius, [
      gloss[0],
      gloss[1],
      gloss[2],
      alpha,
    ]);
  }
};

const drawInnerGlow = (
  ui: WebGLUIRenderer,
  width: number,
  height: number,
  radius: number,
  glow: RGBA
) => {
  const inset = Math.max(1, Math.min(width, height) * 0.06);
  const glowHeight = Math.max(4, height * 0.32);
  const alpha = clamp01(glow[3] * 0.6);
  if (alpha <= 0.01) return;
  ui.drawRoundedRect(inset, inset, width - inset * 2, glowHeight, Math.max(2, radius - inset), [
    glow[0],
    glow[1],
    glow[2],
    alpha,
  ]);
};

const renderButtonBackground = (options: RenderOptions): string => {
  const { width, height, radius, variant, state, accentColor, elevated } = options;
  const theme = getThemePalette();
  const basePalette = getVariantBasePalette(variant, accentColor);
  const palette = applyStateToPalette(basePalette, state);

  const themeKey = theme.themeKey;
  const cacheKey = [
    "bg",
    themeKey,
    variant,
    state,
    accentColor ?? "",
    Math.round(width),
    Math.round(height),
    Math.round(radius * 10) / 10,
    elevated ? "1" : "0",
  ].join("|");

  const cached = backgroundCache.get(cacheKey);
  if (cached) return cached;

  const dpr =
    typeof window === "undefined"
      ? 1
      : Math.min(3, (window.devicePixelRatio || 1) * BUTTON_SUPERSAMPLE);
  const pixelWidth = Math.max(1, Math.round(width * dpr));
  const pixelHeight = Math.max(1, Math.round(height * dpr));
  const handles = ensureRenderer(pixelWidth, pixelHeight);
  if (!handles) return "";

  const { gl, ui, canvas } = handles;
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const stroke = Math.max(1, Math.round(1.6 * dpr));
  const isFlatVariant = ["icon", "palette", "outliner", "command"].includes(variant);
  const baseShadowOffset = elevated ? 4 : 3;
  const stateFactor =
    state === "pressed" || state === "active" ? 0.4 : state === "hover" ? 0.7 : 1;
  const shadowOffset = Math.max(1, Math.round(baseShadowOffset * stateFactor * dpr));
  const shadowBlurPad = isFlatVariant
    ? Math.max(1, Math.round(2 * dpr))
    : Math.max(2, Math.round(3 * dpr));

  const r = Math.max(2, radius * dpr);

  ui.begin(pixelWidth, pixelHeight);

  if (!isFlatVariant && palette.glow[3] > 0.01) {
    const glowPad = Math.max(3, Math.round(6 * dpr));
    ui.drawRoundedRect(
      glowPad * -0.5,
      glowPad * -0.5,
      pixelWidth + glowPad,
      pixelHeight + glowPad,
      r + glowPad,
      withAlpha(palette.glow, palette.glow[3] * 0.35)
    );
  }

  // Shadow.
  ui.drawRoundedRect(
    shadowBlurPad,
    shadowOffset + shadowBlurPad,
    pixelWidth - shadowBlurPad * 2,
    pixelHeight - shadowBlurPad * 2,
    r,
    withAlpha(palette.shadow, palette.shadow[3])
  );

  // Border shell.
  ui.drawRoundedRect(0, 0, pixelWidth, pixelHeight, r, palette.border);

  // Inner fill.
  const innerX = stroke;
  const innerY = stroke;
  const innerWidth = Math.max(1, pixelWidth - stroke * 2);
  const innerHeight = Math.max(1, pixelHeight - stroke * 2);
  const innerRadius = Math.max(1, r - stroke);

  ui.drawRoundedRect(innerX, innerY, innerWidth, innerHeight, innerRadius, palette.fill);

  if (!isFlatVariant) {
    drawInnerGlow(ui, pixelWidth, pixelHeight, innerRadius, palette.glow);
    drawGlossBands(
      ui,
      pixelWidth,
      pixelHeight,
      innerRadius,
      palette.gloss,
      state === "hover" ? 1.25 : 1
    );

    const sheenHeight = Math.max(3, Math.round(pixelHeight * 0.18));
    ui.drawRoundedRect(
      innerX,
      pixelHeight - sheenHeight - innerY,
      innerWidth,
      sheenHeight,
      innerRadius,
      withAlpha(darken(palette.fill, 0.12), 0.22)
    );
  }

  ui.flush();

  const url = canvas.toDataURL("image/png");
  backgroundCache.set(cacheKey, url);
  return url;
};

const sliderOverlayCache = new Map<string, string>();

type SliderOverlayOptions = {
  width: number;
  height: number;
  value: number;
  variant: WebGLButtonVariant;
  state: WebGLButtonState;
  accentColor?: string;
};

export const renderSliderOverlay = ({
  width,
  height,
  value,
  variant,
  state,
  accentColor,
}: SliderOverlayOptions): string => {
  const theme = getThemePalette();
  const basePalette = getVariantBasePalette(variant, accentColor);
  const palette = applyStateToPalette(basePalette, state);
  const accent = accentColor
    ? parseCssColor(accentColor, theme.accent)
    : theme.accent;

  const clamped = clamp01(value);
  const normalized = Math.round(clamped * 1000) / 1000;

  const cacheKey = [
    "slider",
    theme.themeKey,
    variant,
    state,
    accentColor ?? "",
    Math.round(width),
    Math.round(height),
    normalized,
  ].join("|");

  const cached = sliderOverlayCache.get(cacheKey);
  if (cached) return cached;

  const dpr =
    typeof window === "undefined"
      ? 1
      : Math.min(3, (window.devicePixelRatio || 1) * BUTTON_SUPERSAMPLE);
  const pixelWidth = Math.max(1, Math.round(width * dpr));
  const pixelHeight = Math.max(1, Math.round(height * dpr));
  const handles = ensureRenderer(pixelWidth, pixelHeight);
  if (!handles) return "";

  const { gl, ui, canvas } = handles;
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const trackInset = Math.max(12, Math.round(pixelHeight * 0.9));
  const trackWidth = Math.max(4, pixelWidth - trackInset * 2);
  const trackHeight = Math.max(3, Math.round(pixelHeight * 0.2));
  const trackY = Math.round(pixelHeight * 0.5 - trackHeight / 2);
  const trackRadius = Math.max(2, Math.round(trackHeight / 2));
  const trackX = Math.round((pixelWidth - trackWidth) / 2);
  const knobRadius = Math.max(5, Math.round(pixelHeight * 0.32));
  const knobX = Math.round(trackX + trackWidth * normalized);
  const knobY = Math.round(pixelHeight * 0.5);

  const trackBase = mix(palette.border, palette.fill, 0.5);
  const trackFill = mix(accent, palette.glow, 0.1);
  const knobFill = mix(accent, palette.fill, 0.2);
  const knobHighlight = withAlpha(lighten(accent, 0.2), 0.9);
  const knobStroke = withAlpha(darken(accent, 0.2), 0.85);

  ui.begin(pixelWidth, pixelHeight);
  ui.drawRoundedRect(trackX, trackY, trackWidth, trackHeight, trackRadius, trackBase);

  const fillWidth = Math.max(2, Math.round(trackWidth * normalized));
  if (fillWidth > 0) {
    ui.drawRoundedRect(trackX, trackY, fillWidth, trackHeight, trackRadius, trackFill);
  }

  ui.drawFilledCircle(knobX, knobY, knobRadius, knobFill);
  ui.drawCircle(knobX, knobY, knobRadius, Math.max(1, Math.round(dpr)), knobStroke);
  ui.drawFilledCircle(knobX - knobRadius * 0.2, knobY - knobRadius * 0.2, knobRadius * 0.35, knobHighlight);

  ui.flush();

  const url = canvas.toDataURL("image/png");
  sliderOverlayCache.set(cacheKey, url);
  return url;
};

const renderIconImage = ({ iconId, size, tint }: IconRenderOptions): string => {
  const theme = getThemePalette();
  const themeKey = theme.themeKey;
  const dpr =
    typeof window === "undefined"
      ? 1
      : Math.min(3, (window.devicePixelRatio || 1) * BUTTON_SUPERSAMPLE);
  const pixelSize = Math.max(16, Math.round(size * dpr));

  const cacheKey = [
    "icon",
    themeKey,
    iconId,
    pixelSize,
    Math.round(tint[0] * 255),
    Math.round(tint[1] * 255),
    Math.round(tint[2] * 255),
    Math.round(tint[3] * 255),
  ].join("|");

  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const handles = ensureRenderer(pixelSize, pixelSize);
  if (!handles) return "";

  const { gl, icons, canvas } = handles;
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  icons.begin(canvas.width, canvas.height);
  const inset = Math.round(canvas.width * 0.12);
  icons.drawIcon(
    {
      x: inset,
      y: inset,
      width: canvas.width - inset * 2,
      height: canvas.height - inset * 2,
    },
    iconId,
    tint
  );
  icons.flush();

  const url = canvas.toDataURL("image/png");
  iconCache.set(cacheKey, url);
  return url;
};

const computeRadius = (
  height: number,
  variant: WebGLButtonVariant,
  shape: WebGLButtonShape
): number => {
  if (shape === "pill") return Math.min(height / 2, 6);
  if (shape === "square") return Math.min(5, height * 0.14);
  if (shape === "rounded") return Math.min(6, height * 0.2);
  if (variant === "chip" || variant === "outliner") return Math.min(6, height * 0.2);
  if (variant === "icon" || variant === "palette") return Math.min(5, height * 0.18);
  return Math.min(6, height * 0.2);
};

export const resolveButtonVisuals = ({
  width,
  height,
  variant,
  state,
  size,
  shape,
  accentColor,
  iconTintOverride,
  iconOnly,
  elevated,
}: {
  width: number;
  height: number;
  variant: WebGLButtonVariant;
  state: WebGLButtonState;
  size: WebGLButtonSize;
  shape: WebGLButtonShape;
  accentColor?: string;
  iconTintOverride?: string;
  iconOnly?: boolean;
  elevated?: boolean;
}): ButtonVisuals => {
  const theme = getThemePalette();
  const sizeSettings = SIZE_SETTINGS[size];
  const minHeight = sizeSettings.minHeight;
  const resolvedHeight = Math.max(minHeight, height || minHeight);
  const effectiveHeight = iconOnly ? minHeight : resolvedHeight;
  const radius = computeRadius(effectiveHeight, variant, shape);

  const basePalette = getVariantBasePalette(variant, accentColor);
  const palette = applyStateToPalette(basePalette, state);
  const resolvedIconTint = iconTintOverride
    ? parseCssColor(iconTintOverride, palette.icon)
    : palette.icon;

  const paddingX = iconOnly ? effectiveHeight * 0.32 : sizeSettings.paddingX;
  const paddingY = iconOnly ? effectiveHeight * 0.2 : sizeSettings.paddingY;
  const gap = iconOnly ? 0 : sizeSettings.gap;
  const iconSizeBase = effectiveHeight * sizeSettings.iconScale;
  const iconSize = iconOnly ? effectiveHeight * 0.62 : Math.max(16, iconSizeBase);

  const backgroundUrl = renderButtonBackground({
    width: Math.max(1, width || effectiveHeight),
    height: effectiveHeight,
    radius,
    variant,
    state,
    accentColor,
    elevated,
  });

  return {
    backgroundUrl,
    textColor: toCssColor(palette.text),
    iconTint: resolvedIconTint,
    radius,
    paddingX,
    paddingY,
    gap,
    minHeight: effectiveHeight,
    fontSize: sizeSettings.fontSize,
    iconSize,
    fallbackFill: toCssColor(palette.fill),
    fallbackBorder: toCssColor(palette.border),
  };
};

export const resolveIconImageUrl = (
  iconId: IconId,
  size: number,
  tint: RGBA
): string => {
  return renderIconImage({ iconId, size, tint });
};

export const getDefaultMinHeight = (size: WebGLButtonSize) => SIZE_SETTINGS[size].minHeight;
