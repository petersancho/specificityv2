export const VIEW_STYLE = {
  clearColor: [0.972, 0.969, 0.962, 1] as [number, number, number, number],
  mesh: [0.18, 0.64, 0.66] as [number, number, number],
  meshGhost: [0.72, 0.79, 0.86] as [number, number, number],
  neutral: [0.76, 0.76, 0.75] as [number, number, number],
  edgePrimary: [0.17, 0.18, 0.19] as [number, number, number],
  edgeSecondary: [0.38, 0.39, 0.4] as [number, number, number],
  edgeTertiary: [0.56, 0.56, 0.57] as [number, number, number],
  edgePrimaryOpacity: 0.82,
  edgeSecondaryOpacity: 0.62,
  edgeTertiaryOpacity: 0.35,
  edgePrimaryWidth: 2.8,
  edgeSecondaryWidth: 2.2,
  edgeTertiaryWidth: 1.5,
  solidRenderScale: 1.8,
  renderQualityScale: 3,
  maxRenderDpr: 6,
  selection: [0.18, 0.16, 0.12] as [number, number, number],
  ambient: [0.9, 0.9, 0.88] as [number, number, number],
  ambientStrength: 0.68,
  light: [1, 1, 1] as [number, number, number],
  lightPosition: [8, 11, 7] as [number, number, number],
  dashScale: 0.08,
  gridMinor: [0.86, 0.86, 0.85] as [number, number, number],
  gridMajor: [0.79, 0.79, 0.78] as [number, number, number],
};

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
  hasSelection: boolean
) => {
  let next = color;
  if (hasSelection && !isSelected) {
    next = mixColor(next, VIEW_STYLE.neutral, 0.45);
    next = mixColor(next, VIEW_STYLE.meshGhost, 0.2);
  }
  if (isSelected) {
    next = mixColor(next, [1, 1, 1], 0.18);
  }
  return next;
};
