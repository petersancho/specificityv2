import type { DisplayMode } from "../types";

export const SOLIDITY_PRESETS: Record<DisplayMode, number> = {
  shaded: 1,
  shaded_edges: 1,
  ghosted: 0.35,
  wireframe: 0,
  silhouette: 1,
};

export const SOLIDITY_WIREFRAME_THRESHOLD = 0.08;
export const SOLIDITY_GHOSTED_THRESHOLD = 0.6;

export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const resolveDisplayModeFromSolidity = (value: number): DisplayMode => {
  const solidity = clamp01(value);
  if (solidity <= SOLIDITY_WIREFRAME_THRESHOLD) return "wireframe";
  if (solidity <= SOLIDITY_GHOSTED_THRESHOLD) return "ghosted";
  return "shaded";
};

export const resolveSolidityFromDisplayMode = (mode: DisplayMode): number =>
  SOLIDITY_PRESETS[mode] ?? 1;
