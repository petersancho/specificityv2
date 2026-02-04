import { UI_BASE_COLORS } from "./uiColorTokens";

export type UIThemeMode = "light" | "dark";

export const UI_THEME_STORAGE_KEY = "lingua.ui.theme";

export const UI_THEME_BASE_COLORS: Record<UIThemeMode, typeof UI_BASE_COLORS> = {
  light: UI_BASE_COLORS,
  dark: {
    black: UI_BASE_COLORS.white,
    white: UI_BASE_COLORS.black,
    porcelain: UI_BASE_COLORS.ink,
    ink: UI_BASE_COLORS.porcelain,
  },
};

export const resolveSystemTheme = (): UIThemeMode => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const resolveThemeFromDataset = (): UIThemeMode => {
  if (typeof document === "undefined") return "light";
  const value = document.documentElement.dataset.theme;
  return value === "dark" ? "dark" : "light";
};

export const applyThemeToDocument = (theme: UIThemeMode) => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
};
