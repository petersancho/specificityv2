import { applyThemeToWebGL } from "./apply";
import tokens from "../semantic/ui.tokens.json";
import { describeRule, uiRules } from "../semantic/ui.rules";

const FRACTIONAL_BORDER_REGEX = /border-(?:top|right|bottom|left|width):\s*([0-9.]+)px/gi;
const BLUR_SHADOW_REGEX = /box-shadow:[^;]*\b(?:\d+px\s+){3}(\d+(?:\.\d+)?)px/gi;
const NON_SVG_ICON_REGEX = /<img[^>]*class="(?:[^" ]*icon[^" ]*)"[^>]*>/gi;

export type UILintIssue = {
  ruleId: string;
  message: string;
  node?: Element;
};

const warn = (issue: UILintIssue) => {
  if (process.env.NODE_ENV === "production") return;
  // eslint-disable-next-line no-console
  console.warn(`[UI Lint] ${issue.ruleId}: ${issue.message}`, issue.node);
};

const lintBorders = () => {
  if (typeof document === "undefined") return;
  const stylesheets = Array.from(document.styleSheets).filter((sheet) => {
    try {
      return sheet.cssRules != null;
    } catch {
      return false;
    }
  });

  stylesheets.forEach((sheet) => {
    Array.from(sheet.cssRules ?? []).forEach((rule) => {
      const cssText = (rule as CSSStyleRule).cssText ?? "";
      let match: RegExpExecArray | null;
      while ((match = FRACTIONAL_BORDER_REGEX.exec(cssText))) {
        const value = parseFloat(match[1]);
        if (!Number.isInteger(value)) {
          warn({
            ruleId: "border.integer",
            message: `Fractional border width detected (${value}px) in rule: ${cssText.slice(0, 80)}…`,
          });
        }
      }
    });
  });
};

const lintShadows = () => {
  if (typeof document === "undefined") return;
  Array.from(document.querySelectorAll("[style]"))
    .filter((node) => (node as HTMLElement).style.boxShadow)
    .forEach((node) => {
      const shadow = (node as HTMLElement).style.boxShadow;
      let match: RegExpExecArray | null;
      while ((match = BLUR_SHADOW_REGEX.exec(shadow))) {
        const blur = parseFloat(match[1]);
        if (blur > 0) {
          warn({
            ruleId: "shadow.blur",
            message: `Blurred box-shadow found (${shadow}). Signature shadow must have 0 blur.`,
            node,
          });
        }
      }
    });
};

const lintIcons = () => {
  if (typeof document === "undefined") return;
  Array.from(document.querySelectorAll("img"))
    .filter((img) => img.width < 64 || img.height < 64)
    .forEach((img) => {
      const isSvg = img.src.endsWith(".svg") || img.getAttribute("data-svg") === "true";
      if (!isSvg) {
        warn({
          ruleId: "asset.svg",
          message: `Small icon detected without SVG source (${img.src}).`,
          node: img,
        });
      }
    });
};

const lintCanvasDpr = () => {
  if (typeof document === "undefined") return;
  const config = applyThemeToWebGL(tokens);
  Array.from(document.querySelectorAll("canvas[data-lint]"))
    .map((canvas) => canvas as HTMLCanvasElement)
    .forEach((canvas) => {
      const expected = Math.min(window.devicePixelRatio || 1, config.dprCap);
      const ratio = canvas.width / canvas.clientWidth;
      if (Math.abs(ratio - expected) > 0.05) {
        warn({
          ruleId: "canvas.dpr",
          message: `Canvas buffer ratio ${ratio.toFixed(2)} does not match expected ${expected.toFixed(2)}.`,
          node: canvas,
        });
      }
    });
};

export function lintUI() {
  lintBorders();
  lintShadows();
  lintIcons();
  lintCanvasDpr();
  if (process.env.NODE_ENV !== "production") {
    uiRules.crispness.forEach((rule) => {
      // eslint-disable-next-line no-console
      console.info("[UI Rule]", describeRule(rule));
    });
  }
}
