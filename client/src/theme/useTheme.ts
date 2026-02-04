/**
 * React hook for theme subscription
 *
 * Provides reactive access to the current theme palette,
 * automatically updating when data-theme attribute changes.
 */

import { useEffect, useState, useCallback } from "react";
import {
  getTheme,
  getCanvasPalette,
  getViewportPalette,
  getTopBarPalette,
  getThemeMode,
  type ThemePalette,
  type CanvasPalette,
  type ViewportPalette,
  type TopBarPalette,
} from "./palette";

export type ThemeMode = "light" | "dark";

/**
 * Hook that returns the current theme mode and updates when it changes
 */
export const useThemeMode = (): ThemeMode => {
  const [mode, setMode] = useState<ThemeMode>(getThemeMode);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setMode(getThemeMode());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return mode;
};

/**
 * Hook that returns whether dark mode is active
 */
export const useIsDarkMode = (): boolean => {
  const mode = useThemeMode();
  return mode === "dark";
};

/**
 * Hook that returns the complete theme palette and updates when theme changes
 */
export const useTheme = (): ThemePalette => {
  const [theme, setTheme] = useState<ThemePalette>(getTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(getTheme());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
};

/**
 * Hook that returns the canvas palette and updates when theme changes
 */
export const useCanvasPalette = (): CanvasPalette => {
  const [palette, setPalette] = useState<CanvasPalette>(getCanvasPalette);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setPalette(getCanvasPalette());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return palette;
};

/**
 * Hook that returns the viewport palette and updates when theme changes
 */
export const useViewportPalette = (): ViewportPalette => {
  const [palette, setPalette] = useState<ViewportPalette>(getViewportPalette);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setPalette(getViewportPalette());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return palette;
};

/**
 * Hook that returns the top bar palette and updates when theme changes
 */
export const useTopBarPalette = (): TopBarPalette => {
  const [palette, setPalette] = useState<TopBarPalette>(getTopBarPalette);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setPalette(getTopBarPalette());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return palette;
};

/**
 * Hook that provides a toggle function for switching themes
 */
export const useThemeToggle = (): {
  mode: ThemeMode;
  isDark: boolean;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
} => {
  const mode = useThemeMode();

  const toggle = useCallback(() => {
    const next = mode === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    document.documentElement.dataset.theme = newMode;
  }, []);

  return {
    mode,
    isDark: mode === "dark",
    toggle,
    setMode,
  };
};
