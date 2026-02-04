export type ViewStyleProfile = {
  clearColor: [number, number, number, number];
  mesh: [number, number, number];
  meshGhost: [number, number, number];
  neutral: [number, number, number];
  edgePrimary: [number, number, number];
  edgeSecondary: [number, number, number];
  edgeTertiary: [number, number, number];
  edgePrimaryOpacity: number;
  edgeSecondaryOpacity: number;
  edgeTertiaryOpacity: number;
  edgePrimaryWidth: number;
  edgeSecondaryWidth: number;
  edgeTertiaryWidth: number;
  solidRenderScale: number;
  renderQualityScale: number;
  maxRenderDpr: number;
  selection: [number, number, number];
  ambient: [number, number, number];
  ambientStrength: number;
  light: [number, number, number];
  lightPosition: [number, number, number];
  dashScale: number;
  gridMinor: [number, number, number];
  gridMajor: [number, number, number];
};

export const VIEW_STYLE: ViewStyleProfile = {
  clearColor: [0.972, 0.969, 0.962, 1],
  mesh: [0.18, 0.64, 0.66],
  meshGhost: [0.72, 0.79, 0.86],
  neutral: [0.76, 0.76, 0.75],
  edgePrimary: [0.17, 0.18, 0.19],
  edgeSecondary: [0.38, 0.39, 0.4],
  edgeTertiary: [0.56, 0.56, 0.57],
  edgePrimaryOpacity: 0.82,
  edgeSecondaryOpacity: 0.62,
  edgeTertiaryOpacity: 0.35,
  edgePrimaryWidth: 2.8,
  edgeSecondaryWidth: 2.2,
  edgeTertiaryWidth: 1.5,
  solidRenderScale: 1.8,
  renderQualityScale: 3,
  maxRenderDpr: 6,
  selection: [0.18, 0.16, 0.12],
  ambient: [0.9, 0.9, 0.88],
  ambientStrength: 0.68,
  light: [1, 1, 1],
  lightPosition: [8, 11, 7],
  dashScale: 0.08,
  gridMinor: [0.86, 0.86, 0.85],
  gridMajor: [0.79, 0.79, 0.78],
};

export const VIEW_STYLE_DARK: ViewStyleProfile = {
  clearColor: [0.102, 0.102, 0.102, 1], // #1a1a1a
  mesh: [0.25, 0.72, 0.74],
  meshGhost: [0.35, 0.4, 0.48],
  neutral: [0.35, 0.35, 0.38],
  edgePrimary: [0.9, 0.9, 0.88],
  edgeSecondary: [0.65, 0.65, 0.62],
  edgeTertiary: [0.45, 0.45, 0.42],
  edgePrimaryOpacity: 0.85,
  edgeSecondaryOpacity: 0.65,
  edgeTertiaryOpacity: 0.38,
  edgePrimaryWidth: 2.8,
  edgeSecondaryWidth: 2.2,
  edgeTertiaryWidth: 1.5,
  solidRenderScale: 1.8,
  renderQualityScale: 3,
  maxRenderDpr: 6,
  selection: [0.85, 0.82, 0.78],
  ambient: [0.45, 0.45, 0.48],
  ambientStrength: 0.55,
  light: [1, 1, 0.98],
  lightPosition: [8, 11, 7],
  dashScale: 0.08,
  gridMinor: [0.18, 0.18, 0.2],
  gridMajor: [0.25, 0.25, 0.28],
};

/** Get the appropriate view style based on dark mode state */
export const getViewStyle = (isDark: boolean): ViewStyleProfile =>
  isDark ? VIEW_STYLE_DARK : VIEW_STYLE;

export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export const mixColor = (
  a: [number, number, number],
  b: [number, number, number],
  t: number
) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
] as [number, number, number];

export const darkenColor = (color: [number, number, number], amount: number) =>
  mixColor(color, [0, 0, 0], clamp01(amount));

export const adjustForSelection = (
  color: [number, number, number],
  isSelected: boolean,
  hasSelection: boolean,
  style: ViewStyleProfile = VIEW_STYLE
) => {
  let next = color;
  if (hasSelection && !isSelected) {
    next = mixColor(next, style.neutral, 0.45);
    next = mixColor(next, style.meshGhost, 0.2);
  }
  if (isSelected) {
    next = mixColor(next, [1, 1, 1], 0.18);
  }
  return next;
};
