import { UI_BASE_COLORS, UI_DOMAIN_COLORS, UI_FEEDBACK_COLORS } from "../../semantic/uiColorTokens";

export const STICKER2_PALETTE = {
  cyan: UI_DOMAIN_COLORS.data,
  magenta: UI_DOMAIN_COLORS.logic,
  yellow: UI_DOMAIN_COLORS.numeric,
  black: UI_BASE_COLORS.black,
  orange: UI_FEEDBACK_COLORS.warning,
  purple: UI_DOMAIN_COLORS.logic,
} as const;
