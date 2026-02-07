/**
 * Unified Theme Palette for Lingua
 *
 * Single source of truth for all colors across the application.
 * Supports light and dark modes with monochrome design philosophy:
 * - Nodes, wires, and UI elements are greyscale
 * - Only sticker icons retain their CMYK colors
 */

/** Monochrome + Red Accent Palette */
export const BRAND_PALETTE = {
  black: "#000000",
  white: "#ffffff",
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
  accent: "#dc2626",
  accentDeep: "#b91c1c",
  accentSoft: "rgba(220, 38, 38, 0.18)",
  accentGlow: "rgba(220, 38, 38, 0.22)",
} as const;

/** Legacy CMYK - deprecated, kept for backward compatibility only */
/** @deprecated Use BRAND_PALETTE instead */
export const CMYK = {
  cyan: BRAND_PALETTE.gray[600],
  magenta: BRAND_PALETTE.gray[800],
  yellow: BRAND_PALETTE.gray[700],
  black: BRAND_PALETTE.black,
} as const;

/** RGB tuple for WebGL operations */
export type RGB = [number, number, number];
export type RGBA = [number, number, number, number];

/** Convert hex to normalized RGB (0-1 range) */
export const hexToRgb = (hex: string): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ];
};

/** Convert hex to normalized RGBA (0-1 range) */
export const hexToRgba = (hex: string, alpha = 1): RGBA => {
  const [r, g, b] = hexToRgb(hex);
  return [r, g, b, alpha];
};

/**
 * Canvas palette for 2D workflow canvas (Numerica)
 */
export type CanvasPalette = {
  // Canvas background
  canvasBg: string;
  gridMinor: string;
  gridMajor: string;

  // Edges/wires
  edge: string;
  edgeSoft: string;
  edgeHover: string;
  edgePreview: string;

  // Node styling
  nodeFill: string;
  nodeFillHover: string;
  nodeStroke: string;
  nodeStrokeHover: string;
  nodeShadow: string;
  nodeBand: string;
  nodeBandAccent: string;

  // Node error/warning states
  nodeErrorBorder: string;
  nodeErrorFill: string;
  nodeWarningBorder: string;
  nodeWarningFill: string;

  // Text
  text: string;
  textMuted: string;

  // Ports
  portFill: string;
  portFillHover: string;
  portStroke: string;
  portLabel: string;
  categoryLabel: string;

  // Theme indicator
  isDark: boolean;
};

/**
 * 3D viewport palette (Roslyn)
 */
export type ViewportPalette = {
  clearColor: RGBA;
  gridMinor: RGB;
  gridMajor: RGB;
  mesh: RGB;
  meshGhost: RGB;
  neutral: RGB;
  edgePrimary: RGB;
  edgeSecondary: RGB;
  ambient: RGB;
  light: RGB;
  selection: RGB;
};

/**
 * Top bar palette
 */
export type TopBarPalette = {
  bgTop: RGBA;
  bgBottom: RGBA;
  border: RGBA;
  brandText: RGBA;
  chipText: RGBA;
  chipShadow: RGBA;
  dotStrong: RGBA;
  dotSoft: RGBA;
};

/**
 * Complete theme palette
 */
export type ThemePalette = {
  canvas: CanvasPalette;
  viewport: ViewportPalette;
  topBar: TopBarPalette;
  isDark: boolean;
};

// =============================================================================
// LIGHT THEME
// =============================================================================

export const CANVAS_LIGHT: CanvasPalette = {
  canvasBg: "#f5f5f5",
  gridMinor: "rgba(0, 0, 0, 0.06)",
  gridMajor: "rgba(0, 0, 0, 0.12)",

  edge: "#888888",
  edgeSoft: "rgba(0, 0, 0, 0.15)",
  edgeHover: "#dc2626",
  edgePreview: "rgba(80, 80, 80, 0.55)",

  nodeFill: "#e8e8e8",
  nodeFillHover: "#dedede",
  nodeStroke: "#000000",
  nodeStrokeHover: "#dc2626",
  nodeShadow: "#000000",
  nodeBand: "#d0d0d0",
  nodeBandAccent: "#000000",

  nodeErrorBorder: "#dc2626",
  nodeErrorFill: "rgba(220, 38, 38, 0.08)",
  nodeWarningBorder: "#dc2626",
  nodeWarningFill: "rgba(220, 38, 38, 0.05)",

  text: "#000000",
  textMuted: "#555555",

  portFill: "#888888",
  portFillHover: "#666666",
  portStroke: "#000000",
  portLabel: "#000000",
  categoryLabel: "#000000",

  isDark: false,
};

export const VIEWPORT_LIGHT: ViewportPalette = {
  clearColor: [0.972, 0.969, 0.962, 1],
  gridMinor: [0.86, 0.86, 0.85],
  gridMajor: [0.79, 0.79, 0.78],
  mesh: [0.18, 0.64, 0.66],
  meshGhost: [0.72, 0.79, 0.86],
  neutral: [0.76, 0.76, 0.75],
  edgePrimary: [0.17, 0.18, 0.19],
  edgeSecondary: [0.38, 0.39, 0.4],
  ambient: [0.9, 0.9, 0.88],
  light: [1, 1, 1],
  selection: [0.18, 0.16, 0.12],
};

const rgb = (r: number, g: number, b: number, a = 1): RGBA => [
  r / 255,
  g / 255,
  b / 255,
  a,
];

export const TOPBAR_LIGHT: TopBarPalette = {
  bgTop: rgb(250, 248, 244, 1),
  bgBottom: rgb(244, 242, 238, 1),
  border: rgb(18, 16, 12, 0.12),
  brandText: rgb(18, 16, 12, 0.95),
  chipText: rgb(18, 16, 12, 0.92),
  chipShadow: rgb(0, 0, 0, 0.08),
  dotStrong: rgb(18, 16, 12, 0.06),
  dotSoft: rgb(18, 16, 12, 0.02),
};

export const THEME_LIGHT: ThemePalette = {
  canvas: CANVAS_LIGHT,
  viewport: VIEWPORT_LIGHT,
  topBar: TOPBAR_LIGHT,
  isDark: false,
};

// =============================================================================
// DARK THEME
// =============================================================================

export const CANVAS_DARK: CanvasPalette = {
  canvasBg: "#1a1a1a",
  gridMinor: "rgba(255, 255, 255, 0.06)",
  gridMajor: "rgba(255, 255, 255, 0.12)",

  edge: "#666666",
  edgeSoft: "rgba(255, 255, 255, 0.12)",
  edgeHover: "#dc2626",
  edgePreview: "rgba(180, 180, 180, 0.55)",

  nodeFill: "#2a2a2a",
  nodeFillHover: "#353535",
  nodeStroke: "#555555",
  nodeStrokeHover: "#dc2626",
  nodeShadow: "rgba(0, 0, 0, 0.5)",
  nodeBand: "#3a3a3a",
  nodeBandAccent: "#666666",

  nodeErrorBorder: "#dc2626",
  nodeErrorFill: "rgba(220, 38, 38, 0.15)",
  nodeWarningBorder: "#dc2626",
  nodeWarningFill: "rgba(220, 38, 38, 0.08)",

  text: "#f0f0f0",
  textMuted: "#999999",

  portFill: "#666666",
  portFillHover: "#888888",
  portStroke: "#666666",
  portLabel: "#f0f0f0",
  categoryLabel: "#cccccc",

  isDark: true,
};

export const VIEWPORT_DARK: ViewportPalette = {
  clearColor: [0.1, 0.1, 0.1, 1],
  gridMinor: [0.2, 0.2, 0.2],
  gridMajor: [0.28, 0.28, 0.28],
  mesh: [0.18, 0.64, 0.66],
  meshGhost: [0.35, 0.38, 0.42],
  neutral: [0.4, 0.4, 0.4],
  edgePrimary: [0.85, 0.85, 0.85],
  edgeSecondary: [0.6, 0.6, 0.6],
  ambient: [0.25, 0.25, 0.25],
  light: [1, 1, 1],
  selection: [0.9, 0.9, 0.9],
};

export const TOPBAR_DARK: TopBarPalette = {
  bgTop: rgb(32, 32, 32, 1),
  bgBottom: rgb(26, 26, 26, 1),
  border: rgb(255, 255, 255, 0.1),
  brandText: rgb(240, 240, 240, 0.95),
  chipText: rgb(240, 240, 240, 0.92),
  chipShadow: rgb(0, 0, 0, 0.3),
  dotStrong: rgb(255, 255, 255, 0.08),
  dotSoft: rgb(255, 255, 255, 0.03),
};

export const THEME_DARK: ThemePalette = {
  canvas: CANVAS_DARK,
  viewport: VIEWPORT_DARK,
  topBar: TOPBAR_DARK,
  isDark: true,
};

// =============================================================================
// THEME UTILITIES
// =============================================================================

/** Get current theme mode from document */
export const getThemeMode = (): "light" | "dark" => {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
};

/** Get current theme palette */
export const getTheme = (): ThemePalette => {
  return getThemeMode() === "dark" ? THEME_DARK : THEME_LIGHT;
};

/** Get canvas palette for current theme */
export const getCanvasPalette = (): CanvasPalette => {
  return getThemeMode() === "dark" ? CANVAS_DARK : CANVAS_LIGHT;
};

/** Get viewport palette for current theme */
export const getViewportPalette = (): ViewportPalette => {
  return getThemeMode() === "dark" ? VIEWPORT_DARK : VIEWPORT_LIGHT;
};

/** Get top bar palette for current theme */
export const getTopBarPalette = (): TopBarPalette => {
  return getThemeMode() === "dark" ? TOPBAR_DARK : TOPBAR_LIGHT;
};

/** Check if dark mode is active */
export const isDarkMode = (): boolean => {
  return getThemeMode() === "dark";
};

// =============================================================================
// MONOCHROME NODE STYLING
// =============================================================================

/** Uniform grey for all node bands (no category colors) */
export const getNodeBandColor = (isDark: boolean): string => {
  return isDark ? "#3a3a3a" : "#d0d0d0";
};

/** Uniform grey for all node band accents */
export const getNodeBandAccent = (isDark: boolean): string => {
  return isDark ? "#666666" : "#000000";
};

/** Grey wire color */
export const getWireColor = (isDark: boolean): string => {
  return isDark ? "#666666" : "#888888";
};

/** Port fill color (monochrome) */
export const getPortFillColor = (isDark: boolean): string => {
  return isDark ? "#666666" : "#888888";
};
