/**
 * Theme Module - Public Exports
 *
 * Import from "@/theme" or "../../theme" to access theme utilities
 */

// Palette definitions and types
export {
  // CMYK colors for sticker icons only
  CMYK,

  // Type definitions
  type RGB,
  type RGBA,
  type CanvasPalette,
  type ViewportPalette,
  type TopBarPalette,
  type ThemePalette,

  // Light theme palettes
  CANVAS_LIGHT,
  VIEWPORT_LIGHT,
  TOPBAR_LIGHT,
  THEME_LIGHT,

  // Dark theme palettes
  CANVAS_DARK,
  VIEWPORT_DARK,
  TOPBAR_DARK,
  THEME_DARK,

  // Theme getters (non-reactive, for use outside React)
  getThemeMode,
  getTheme,
  getCanvasPalette,
  getViewportPalette,
  getTopBarPalette,
  isDarkMode,

  // Utility functions
  hexToRgb,
  hexToRgba,

  // Monochrome node styling helpers
  getNodeBandColor,
  getNodeBandAccent,
  getWireColor,
  getPortFillColor,
} from "./palette";

// React hooks for reactive theme access
export {
  type ThemeMode,
  useThemeMode,
  useIsDarkMode,
  useTheme,
  useCanvasPalette,
  useViewportPalette,
  useTopBarPalette,
  useThemeToggle,
} from "./useTheme";
