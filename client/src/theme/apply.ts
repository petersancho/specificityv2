import tokens from "../semantic/ui.tokens.json";

export type UITokens = typeof tokens;

export type WebGLThemeConfig = {
  background: string;
  gridMinor: string;
  gridMajor: string;
  accent: string;
  dprCap: number;
};

export type NodeGraphThemeConfig = {
  categoryColors: Record<string, string>;
  stroke: string;
  radius: string;
};

declare global {
  interface Window {
    __NUMERICA_THEME__?: {
      dom?: UITokens;
      webgl?: WebGLThemeConfig;
      nodeGraph?: NodeGraphThemeConfig;
    };
  }
}

const ensureThemeRegistry = () => {
  if (typeof window === "undefined") return;
  if (!window.__NUMERICA_THEME__) {
    window.__NUMERICA_THEME__ = {};
  }
};

export function applyThemeToDOM(source: UITokens = tokens) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const set = (name: string, value: string | number) => {
    root.style.setProperty(name, String(value));
  };

  // Fonts
  set("--font-primary", source.fonts.primary);
  set("--font-secondary", source.fonts.secondary);
  set("--font-display", source.fonts.primary);
  set("--font-ui", source.fonts.secondary);

  // Palette
  set("--ui-white", source.palette.white);
  set("--ui-black", source.palette.black);
  set("--ui-porcelain", source.palette.porcelain);
  set("--ui-paper", source.palette.paper);
  set("--ui-grey-50", source.palette.grey50);
  set("--ui-grey-100", source.palette.grey100);
  set("--ui-grey-200", source.palette.grey200);
  set("--ui-grey-400", source.palette.grey400);
  set("--ui-grey-600", source.palette.grey600);
  set("--ui-grey-800", source.palette.grey800);
  set("--ui-accent-critical", source.palette.accentRed);
  set("--ui-shadow-hard", source.shadow.signature);

  // Stroke + radius
  set("--ui-stroke-thin", source.strokes.thin);
  set("--ui-stroke-regular", source.strokes.regular);
  set("--ui-stroke-bold", source.strokes.bold);
  set("--ui-radius-tight", source.radius.tight);
  set("--ui-radius-pill", source.radius.pill);

  // Spacing
  set("--ui-spacing-xs", source.spacing.xs);
  set("--ui-spacing-sm", source.spacing.sm);
  set("--ui-spacing-md", source.spacing.md);
  set("--ui-spacing-lg", source.spacing.lg);
  set("--ui-spacing-xl", source.spacing.xl);

  // DPR cap
  set("--ui-dpr-cap", String(source.dpr.max));

  ensureThemeRegistry();
  if (typeof window !== "undefined") {
    window.__NUMERICA_THEME__ = {
      ...(window.__NUMERICA_THEME__ ?? {}),
      dom: source,
    };
  }
}

export function applyThemeToWebGL(source: UITokens = tokens): WebGLThemeConfig {
  const config: WebGLThemeConfig = {
    background: source.palette.porcelain,
    gridMinor: source.palette.grey200,
    gridMajor: source.palette.grey400,
    accent: source.palette.accentRed,
    dprCap: source.dpr.max,
  };

  ensureThemeRegistry();
  if (typeof window !== "undefined") {
    window.__NUMERICA_THEME__ = {
      ...(window.__NUMERICA_THEME__ ?? {}),
      webgl: config,
    };
  }

  return config;
}

export function applyThemeToNodeGraph(source: UITokens = tokens): NodeGraphThemeConfig {
  const config: NodeGraphThemeConfig = {
    categoryColors: { ...source.palette.categories },
    stroke: source.strokes.thin,
    radius: source.radius.tight,
  };

  ensureThemeRegistry();
  if (typeof window !== "undefined") {
    window.__NUMERICA_THEME__ = {
      ...(window.__NUMERICA_THEME__ ?? {}),
      nodeGraph: config,
    };
  }

  return config;
}

export function applyNumericaTheme(source: UITokens = tokens) {
  applyThemeToDOM(source);
  applyThemeToWebGL(source);
  applyThemeToNodeGraph(source);
}
