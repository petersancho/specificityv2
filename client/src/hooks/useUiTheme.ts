import { useEffect, useMemo, useState } from "react";
import { safeLocalStorageGet, safeLocalStorageRemove, safeLocalStorageSet } from "../utils/safeStorage";
import {
  UI_THEME_STORAGE_KEY,
  applyThemeToDocument,
  resolveSystemTheme,
  type UIThemeMode,
} from "../semantic/uiThemeTokens";

const readStoredTheme = (): UIThemeMode | null => {
  const stored = safeLocalStorageGet(UI_THEME_STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : null;
};

export const useUiTheme = () => {
  const initialTheme = useMemo(() => readStoredTheme() ?? resolveSystemTheme(), []);
  const [theme, setTheme] = useState<UIThemeMode>(initialTheme);
  const [hasPreference, setHasPreference] = useState(() => Boolean(readStoredTheme()));

  useEffect(() => {
    applyThemeToDocument(theme);
    if (hasPreference) {
      safeLocalStorageSet(UI_THEME_STORAGE_KEY, theme);
    } else {
      safeLocalStorageRemove(UI_THEME_STORAGE_KEY);
    }
  }, [hasPreference, theme]);

  useEffect(() => {
    if (typeof window === "undefined" || hasPreference) return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setTheme(media.matches ? "dark" : "light");
    handleChange();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, [hasPreference]);

  const toggleTheme = () => {
    setHasPreference(true);
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const clearPreference = () => {
    setHasPreference(false);
    setTheme(resolveSystemTheme());
  };

  return { theme, toggleTheme, clearPreference, hasPreference };
};
