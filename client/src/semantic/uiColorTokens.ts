import type { UISemanticDomain, UISemanticState } from "./uiSemantics";

export const UI_BASE_COLORS = {
  black: "#000000",
  white: "#ffffff",
  porcelain: "#ffffff",
  ink: "#000000",
} as const;

export const UI_DOMAIN_COLORS: Record<UISemanticDomain, string> = {
  numeric: "#ffdd00",
  logic: "#ff0099",
  data: "#00d4ff",
  structure: "#000000",
  feedback: "#ffdd00",
  neutral: "#000000",
};

export const UI_FEEDBACK_COLORS: Record<UISemanticState, string> = {
  idle: UI_BASE_COLORS.black,
  active: UI_BASE_COLORS.black,
  computing: "#ffdd00",
  success: "#4ade80",
  warning: "#fbbf24",
  error: "#ff4444",
};

export const SEMANTIC_COLOR_VARS: Record<UISemanticDomain, string> = {
  numeric: "--semantic-numeric",
  logic: "--semantic-logic",
  data: "--semantic-data",
  structure: "--semantic-structure",
  feedback: "--feedback-computing",
  neutral: "--ui-black",
};

export const FEEDBACK_COLOR_VARS: Record<UISemanticState, string> = {
  idle: "--ui-black",
  active: "--ui-black",
  computing: "--feedback-computing",
  success: "--feedback-success",
  warning: "--feedback-warning",
  error: "--feedback-error",
};

export const getDomainColor = (domain: UISemanticDomain) => UI_DOMAIN_COLORS[domain];

export const getStateColor = (state: UISemanticState) => UI_FEEDBACK_COLORS[state];

const readCssVar = (name: string) => {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

export const resolveSemanticColorValue = (domain: UISemanticDomain) => {
  const varName = SEMANTIC_COLOR_VARS[domain];
  const value = readCssVar(varName);
  return value || UI_DOMAIN_COLORS[domain];
};

export const resolveFeedbackColorValue = (state: UISemanticState) => {
  const varName = FEEDBACK_COLOR_VARS[state];
  const value = readCssVar(varName);
  return value || UI_FEEDBACK_COLORS[state];
};

type RGBTuple = [number, number, number];
export type RgbaTuple = [number, number, number, number];

export const hexToRgbValues = (hex: string): RGBTuple => {
  const normalized = hex.replace("#", "");
  if (normalized.length === 3) {
    const [r, g, b] = normalized.split("");
    return [
      parseInt(r + r, 16),
      parseInt(g + g, 16),
      parseInt(b + b, 16),
    ];
  }
  if (normalized.length >= 6) {
    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16),
    ];
  }
  return [0, 0, 0];
};

export const rgbaFromHex = (hex: string, alpha = 1): RgbaTuple => {
  const [r, g, b] = hexToRgbValues(hex);
  return [r / 255, g / 255, b / 255, Math.min(1, Math.max(0, alpha))];
};

export const rgbaCss = (hex: string, alpha = 1) => {
  const [r, g, b] = hexToRgbValues(hex);
  const clamped = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
};

export const mixHex = (hexA: string, hexB: string, t: number) => {
  const [r1, g1, b1] = hexToRgbValues(hexA);
  const [r2, g2, b2] = hexToRgbValues(hexB);
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  const mix = (a: number, b: number, amount: number) => Math.round(a + (b - a) * clamp(amount));
  const r = mix(r1, r2, t);
  const g = mix(g1, g2, t);
  const b = mix(b1, b2, t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b
    .toString(16)
    .padStart(2, "0")}`;
};
