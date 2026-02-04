import type { SemanticOpId } from "./semanticOpIds";
import type { StickerSemanticMeta, UISemanticDomain, UISemanticState, UISemanticToken, SpacingContext } from "./uiSemantics";
import { UI_BASE_COLORS, UI_DOMAIN_COLORS, UI_FEEDBACK_COLORS } from "./uiColorTokens";
import { UI_THEME_BASE_COLORS } from "./uiThemeTokens";
import { SHADOW_VALUES } from "./uiShadowTokens";
import { SPACING_VALUES } from "./uiSpacingTokens";

export class UISemanticRegistry {
  private static instance: UISemanticRegistry | null = null;

  static getInstance() {
    if (!UISemanticRegistry.instance) {
      UISemanticRegistry.instance = new UISemanticRegistry();
    }
    return UISemanticRegistry.instance;
  }

  private tokens: Map<string, UISemanticToken> = new Map();
  private stickers: Map<string, StickerSemanticMeta> = new Map();

  register(token: UISemanticToken): void {
    this.tokens.set(token.id, token);
  }

  registerSticker(meta: StickerSemanticMeta): void {
    this.stickers.set(meta.stickerId, meta);
  }

  validate(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [id, token] of this.tokens.entries()) {
      if (!token.id || !id) {
        errors.push(`UISemanticToken missing id: ${id}`);
      }
      if (!token.color) {
        errors.push(`UISemanticToken ${id} missing color`);
      }
      if (!token.shadow) {
        errors.push(`UISemanticToken ${id} missing shadow`);
      }
      if (!token.spacing) {
        errors.push(`UISemanticToken ${id} missing spacing`);
      }
    }

    for (const [id, meta] of this.stickers.entries()) {
      if (!meta.stickerId || !id) {
        errors.push(`Sticker meta missing stickerId: ${id}`);
      }
      if (!meta.semanticOps || meta.semanticOps.length === 0) {
        warnings.push(`Sticker ${id} has no semanticOps linked`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  getColorForOp(opId: SemanticOpId): string | undefined {
    for (const token of this.tokens.values()) {
      if (token.linkedOps && token.linkedOps.includes(opId)) {
        return token.color;
      }
    }
    const domain = this.getDomainForOp(opId);
    return UI_DOMAIN_COLORS[domain];
  }

  getShadowForState(state: UISemanticState): string {
    switch (state) {
      case "computing":
      case "active":
      case "success":
      case "warning":
      case "error":
        return SHADOW_VALUES.raised;
      case "idle":
      default:
        return SHADOW_VALUES.grounded;
    }
  }

  getSpacingForContext(context: SpacingContext): string {
    const token = typeof context === "string" ? context : context.token;
    return SPACING_VALUES[token] ?? SPACING_VALUES.normal;
  }

  toJSON(): object {
    return {
      tokens: Array.from(this.tokens.values()),
      stickers: Array.from(this.stickers.values()),
      colors: UI_DOMAIN_COLORS,
      feedback: UI_FEEDBACK_COLORS,
      shadows: SHADOW_VALUES,
      spacing: SPACING_VALUES,
    };
  }

  toCSS(): string {
    let css = ":root {\n";

    const light = UI_THEME_BASE_COLORS.light;
    css += `  --ui-black: ${light.black};\n`;
    css += `  --ui-white: ${light.white};\n`;
    css += `  --ui-porcelain: ${light.porcelain};\n`;
    css += `  --ui-ink: ${light.ink};\n`;

    for (const [domain, color] of Object.entries(UI_DOMAIN_COLORS)) {
      css += `  --semantic-${domain}: ${color};\n`;
    }

    for (const [state, color] of Object.entries(UI_FEEDBACK_COLORS)) {
      if (state === "idle" || state === "active") continue;
      css += `  --feedback-${state}: ${color};\n`;
    }

    for (const [token, value] of Object.entries(SHADOW_VALUES)) {
      css += `  --shadow-${token}: ${value};\n`;
    }

    css += "  --shadow-raised-hover: 0 6px 0 var(--ui-black);\n";
    css += "  --shadow-raised-pressed: 0 2px 0 var(--ui-black);\n";

    for (const [token, value] of Object.entries(SPACING_VALUES)) {
      css += `  --spacing-${token}: ${value};\n`;
    }

    css += "}\n";

    const dark = UI_THEME_BASE_COLORS.dark;
    css += ":root[data-theme=\"dark\"] {\n";
    css += "  color-scheme: dark;\n";
    css += `  --ui-black: ${dark.black};\n`;
    css += `  --ui-white: ${dark.white};\n`;
    css += `  --ui-porcelain: ${dark.porcelain};\n`;
    css += `  --ui-ink: ${dark.ink};\n`;
    css += "  --semantic-structure: var(--ui-black);\n";
    css += "  --semantic-neutral: var(--ui-black);\n";
    css += "}\n";
    return css;
  }

  private getDomainForOp(opId: SemanticOpId): UISemanticDomain {
    if (opId.startsWith("math.")) return "numeric";
    if (opId.startsWith("vector.")) return "numeric";
    if (opId.startsWith("logic.")) return "logic";
    if (opId.startsWith("data.")) return "data";
    if (opId.startsWith("string.")) return "data";
    if (opId.startsWith("color.")) return "data";
    if (opId.startsWith("solver.")) return "feedback";
    if (opId.startsWith("simulator.")) return "feedback";
    return "structure";
  }
}
