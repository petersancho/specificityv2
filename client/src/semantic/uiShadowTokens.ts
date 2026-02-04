export type ShadowToken = "none" | "grounded" | "raised" | "floating" | "modal";

export const SHADOW_VALUES: Record<ShadowToken, string> = {
  none: "none",
  grounded: "0 2px 0 var(--ui-black)",
  raised: "0 4px 0 var(--ui-black)",
  floating: "0 8px 0 var(--ui-black)",
  modal: "0 12px 0 var(--ui-black)",
};

export const SHADOW_STATE_VALUES = {
  idle: "var(--shadow-raised)",
  hover: "var(--shadow-raised-hover)",
  pressed: "var(--shadow-grounded)",
  disabled: "none",
};
