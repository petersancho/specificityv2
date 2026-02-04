export type SpacingToken =
  | "tight"
  | "compact"
  | "normal"
  | "relaxed"
  | "section"
  | "domain";

export const SPACING_VALUES: Record<SpacingToken, string> = {
  tight: "4px",
  compact: "8px",
  normal: "12px",
  relaxed: "16px",
  section: "24px",
  domain: "32px",
};
