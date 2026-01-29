import { useEffect, useRef, useState } from "react";
import { WebGLUIRenderer, type RGBA } from "../webgl/ui/WebGLUIRenderer";
import { WebGLTextRenderer } from "../webgl/ui/WebGLTextRenderer";
import { WebGLIconRenderer } from "../webgl/ui/WebGLIconRenderer";
import styles from "./WebGLAppTopBar.module.css";

type WebGLAppTopBarProps = {
  status?: string;
  className?: string;
  docsHref?: string;
  docsActive?: boolean;
};

type Rect = { x: number; y: number; width: number; height: number };

type ChipTone = "accent" | "neutral" | "tech";

type ChipSpec = {
  id: string;
  label: string;
  tone: ChipTone;
};

type LayoutChip = {
  spec: ChipSpec;
  rect: Rect;
  dot: { cx: number; cy: number; r: number };
  bar: Rect | null;
  fontSize: number;
};

type LayoutState = {
  width: number;
  height: number;
  scale: number;
  brandSymbolRect: Rect;
  brandFontSize: number;
  brandTextX: number;
  chipRadius: number;
  chipHeight: number;
  chips: LayoutChip[];
  statusChip: LayoutChip | null;
  statusText: string;
};

const rgb = (r: number, g: number, b: number, a = 1): RGBA => [
  r / 255,
  g / 255,
  b / 255,
  a,
];

const mix = (a: RGBA, b: RGBA, t: number): RGBA => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
  a[3] + (b[3] - a[3]) * t,
];

const PALETTE = {
  bgTop: rgb(250, 248, 244, 1),
  bgBottom: rgb(244, 242, 238, 1),
  border: rgb(18, 16, 12, 0.12),
  topAccent: rgb(18, 16, 12, 0.35),
  topAccentSoft: rgb(18, 16, 12, 0.18),
  dotStrong: rgb(18, 16, 12, 0.06),
  dotSoft: rgb(18, 16, 12, 0.02),
  glow: rgb(210, 139, 92, 0.06),
  brandText: rgb(18, 16, 12, 0.95),
  brandAccent: rgb(0, 194, 209, 0.92),
  brandAccentDeep: rgb(122, 92, 255, 0.92),
  brandAccentGlow: rgb(0, 194, 209, 0.18),
  brandShadow: rgb(0, 0, 0, 0.12),
  brandBadgeFill: rgb(250, 248, 244, 1),
  brandBadgeStroke: rgb(190, 186, 181, 1),
  brandBadgeGlow: rgb(255, 255, 255, 0.3),
  brandBadgeShadow: rgb(0, 0, 0, 0.14),
  chipShadow: rgb(0, 0, 0, 0.08),
  chipText: rgb(18, 16, 12, 0.92),
};

const CHIP_TONES: Record<
  ChipTone,
  { fill: RGBA; border: RGBA; dot: RGBA; bar: RGBA | null }
> = {
  accent: {
    fill: rgb(250, 245, 238, 0.98),
    border: rgb(210, 139, 92, 0.4),
    dot: rgb(210, 139, 92, 0.85),
    bar: rgb(210, 139, 92, 0.6),
  },
  neutral: {
    fill: rgb(248, 246, 242, 0.98),
    border: rgb(18, 16, 12, 0.14),
    dot: rgb(18, 16, 12, 0.5),
    bar: null,
  },
  tech: {
    fill: rgb(241, 246, 251, 0.98),
    border: rgb(59, 130, 246, 0.38),
    dot: rgb(59, 130, 246, 0.72),
    bar: rgb(59, 130, 246, 0.55),
  },
};

const BAR_HEIGHT = 96;
const BRAND_TEXT_BASE = "LING";
const BRAND_TEXT_ACCENT = "UA";
const CHIP_SPECS: ChipSpec[] = [];

const PADDING_X = 24;
const BRAND_SYMBOL_SIZE = 56;
const BRAND_FONT_SIZE = 44;
const BRAND_GAP = 12;
const BRAND_ACCENT_GAP = 5;
const BRAND_TRACKING = -0.6;
const BRAND_ACCENT_TRACKING = -0.4;
const BRAND_BADGE_PAD_X = 14;
const BRAND_BADGE_PAD_Y = 7;
const BRAND_BADGE_BAR_WIDTH = 4;
const BRAND_BADGE_BAR_GAP = 10;
const BRAND_BADGE_RADIUS = 6;
const BRAND_BADGE_STROKE = 1.1;
const BRAND_TO_CHIPS_GAP = 18;
const CHIP_HEIGHT = 34;
const CHIP_PAD_X = 12;
const CHIP_GAP = 8;
const CHIP_DOT_SIZE = 6;
const CHIP_DOT_GAP = 7;
const CHIP_BAR_WIDTH = 3;
const CHIP_RADIUS = 4;
const CHIP_FONT_SIZE = 11.5;
const STATUS_FONT_SIZE = 12.5;
const STATUS_PAD_X = 14;
const STATUS_GAP = 18;

const DOT_SPACING = 26;
const DOT_SIZE = 1.1;
const DOT_STRONG_EVERY = 4;

const GRADIENT_STEPS = 12;
const RENDER_SCALE = 1.35;
const MAX_DPR = 3;

const UI_FONT_FAMILY =
  '"Helvetica Neue", "Montreal Neue", "Space Grotesk", Helvetica, Arial, sans-serif';
const BRAND_FONT_FAMILY = '"Montreal Neue", "Helvetica Neue", Helvetica, Arial, sans-serif';
const BRAND_WEIGHT = 700;
const BRAND_ACCENT_WEIGHT = 800;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const createMeasureContext = () => {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  return canvas.getContext("2d");
};

const measureTextWidth = (
  text: string,
  fontSize: number,
  fontWeight: number,
  fontFamily = UI_FONT_FAMILY
) => {
  const ctx = createMeasureContext();
  if (!ctx) return text.length * fontSize * 0.6;
  ctx.font = `normal ${fontWeight} ${fontSize}px ${fontFamily}`;
  return ctx.measureText(text).width;
};

const measureTrackedWidth = (
  text: string,
  fontSize: number,
  fontWeight: number,
  tracking: number,
  fontFamily = UI_FONT_FAMILY
) => {
  if (!text) return 0;
  const base = measureTextWidth(text, fontSize, fontWeight, fontFamily);
  return base + tracking * (text.length - 1);
};

const BASE_BRAND_TEXT_WIDTH =
  measureTrackedWidth(
    BRAND_TEXT_BASE,
    BRAND_FONT_SIZE,
    BRAND_WEIGHT,
    BRAND_TRACKING,
    BRAND_FONT_FAMILY
  ) +
  measureTrackedWidth(
    BRAND_TEXT_ACCENT,
    BRAND_FONT_SIZE,
    BRAND_ACCENT_WEIGHT,
    BRAND_ACCENT_TRACKING,
    BRAND_FONT_FAMILY
  ) +
  BRAND_ACCENT_GAP;
const BASE_BRAND_BADGE_WIDTH =
  BASE_BRAND_TEXT_WIDTH +
  BRAND_SYMBOL_SIZE +
  BRAND_GAP +
  BRAND_BADGE_PAD_X * 2 +
  BRAND_BADGE_BAR_WIDTH +
  BRAND_BADGE_BAR_GAP;

const measureChipWidth = (label: string, fontSize: number, padX: number, dotSize: number) => {
  const textWidth = measureTextWidth(label, fontSize, 700, UI_FONT_FAMILY);
  const dotGap = CHIP_DOT_GAP * (dotSize / CHIP_DOT_SIZE);
  return textWidth + padX * 2 + dotSize + dotGap;
};

const measureStatusWidth = (statusText: string, fontSize: number, padX: number, dotSize: number) => {
  if (!statusText) return 0;
  const textWidth = measureTextWidth(statusText, fontSize, 700, UI_FONT_FAMILY);
  const dotGap = CHIP_DOT_GAP * (dotSize / CHIP_DOT_SIZE);
  return textWidth + padX * 2 + dotSize + dotGap;
};

const WebGLAppTopBar = ({
  status,
  className,
  docsHref,
  docsActive = false,
}: WebGLAppTopBarProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const uiRef = useRef<WebGLUIRenderer | null>(null);
  const textRef = useRef<WebGLTextRenderer | null>(null);
  const iconRef = useRef<WebGLIconRenderer | null>(null);
  const dprRef = useRef(1);
  const layoutRef = useRef<LayoutState>({
    width: 1,
    height: BAR_HEIGHT,
    scale: 1,
    brandSymbolRect: { x: PADDING_X, y: 0, width: BRAND_SYMBOL_SIZE, height: BRAND_SYMBOL_SIZE },
    brandFontSize: BRAND_FONT_SIZE,
    brandTextX: PADDING_X + BRAND_SYMBOL_SIZE + BRAND_GAP,
    chipRadius: CHIP_RADIUS,
    chipHeight: CHIP_HEIGHT,
    chips: [],
    statusChip: null,
    statusText: "Ready",
  });
  const [, setLayoutVersion] = useState(0);

  const updateLayout = (width: number) => {
    const statusText = "";

    const brandWidthBase = BASE_BRAND_BADGE_WIDTH;
    const chipsWidthBase = CHIP_SPECS.reduce((sum, spec, index) => {
      const chipWidth = measureChipWidth(spec.label, CHIP_FONT_SIZE, CHIP_PAD_X, CHIP_DOT_SIZE);
      const gap = index === CHIP_SPECS.length - 1 ? 0 : CHIP_GAP;
      return sum + chipWidth + gap;
    }, 0);

    const statusWidthBase = measureStatusWidth(statusText, STATUS_FONT_SIZE, STATUS_PAD_X, CHIP_DOT_SIZE);
    const available = width - PADDING_X * 2;
    const baseTotal = brandWidthBase + chipsWidthBase;
    const scale = clamp(available / baseTotal, 0.78, 1);

    const brandSymbolSize = BRAND_SYMBOL_SIZE * scale;
    const brandGap = BRAND_GAP * scale;
    const brandFontSize = BRAND_FONT_SIZE * scale;
    const brandAccentGap = BRAND_ACCENT_GAP * scale;
    const brandTracking = BRAND_TRACKING * scale;
    const brandAccentTracking = BRAND_ACCENT_TRACKING * scale;
    const brandBadgePadX = BRAND_BADGE_PAD_X * scale;
    const brandBadgeBarWidth = BRAND_BADGE_BAR_WIDTH * scale;
    const brandBadgeBarGap = BRAND_BADGE_BAR_GAP * scale;
    const brandBaseWidth = measureTrackedWidth(
      BRAND_TEXT_BASE,
      brandFontSize,
      BRAND_WEIGHT,
      brandTracking,
      BRAND_FONT_FAMILY
    );
    const brandAccentWidth = measureTrackedWidth(
      BRAND_TEXT_ACCENT,
      brandFontSize,
      BRAND_ACCENT_WEIGHT,
      brandAccentTracking,
      BRAND_FONT_FAMILY
    );
    const brandTextWidth = brandBaseWidth + brandAccentWidth + brandAccentGap;
    const brandBadgeWidth =
      brandBadgePadX * 2 +
      brandBadgeBarWidth +
      brandBadgeBarGap +
      brandSymbolSize +
      brandGap +
      brandTextWidth;

    const chipHeight = CHIP_HEIGHT * scale;
    const chipPadX = CHIP_PAD_X * scale;
    const chipDotSize = CHIP_DOT_SIZE * scale;
    const chipFontSize = CHIP_FONT_SIZE * scale;
    const chipGap = CHIP_GAP * scale;
    const chipRadius = Math.min(chipHeight * 0.5, CHIP_RADIUS * scale);
    const chipBarWidth = CHIP_BAR_WIDTH * scale;

    const statusFontSize = clamp(STATUS_FONT_SIZE * scale, 11.5, STATUS_FONT_SIZE);
    const statusPadX = STATUS_PAD_X * scale;
    const statusWidth = measureStatusWidth(statusText, statusFontSize, statusPadX, chipDotSize);

    const centerY = BAR_HEIGHT * 0.5;
    const brandTotalWidth = brandBadgeWidth;
    const brandStartX = clamp(
      (width - brandTotalWidth) * 0.5,
      PADDING_X,
      Math.max(PADDING_X, width - PADDING_X - brandTotalWidth)
    );
    const brandSymbolRect: Rect = {
      x: brandStartX + brandBadgePadX + brandBadgeBarWidth + brandBadgeBarGap,
      y: centerY - brandSymbolSize * 0.5,
      width: brandSymbolSize,
      height: brandSymbolSize,
    };

    const brandTextX = brandSymbolRect.x + brandSymbolRect.width + brandGap;
    const chipsStartX =
      brandTextX + brandTextWidth + brandBadgePadX + BRAND_TO_CHIPS_GAP * scale;

    const statusRect: Rect = {
      x: width - PADDING_X - statusWidth,
      y: centerY - chipHeight * 0.5,
      width: statusWidth,
      height: chipHeight,
    };

    const minChipEndX = statusRect.x - STATUS_GAP * scale;
    let activeSpecs = [...CHIP_SPECS];

    const buildChips = (specs: ChipSpec[]) => {
      let x = chipsStartX;
      const chips: LayoutChip[] = [];
      specs.forEach((spec, index) => {
        const chipWidth = measureChipWidth(spec.label, chipFontSize, chipPadX, chipDotSize);
        const rect: Rect = {
          x,
          y: centerY - chipHeight * 0.5,
          width: chipWidth,
          height: chipHeight,
        };
        const leftInset = 6 * scale;
        const bar = spec.tone !== "neutral"
          ? {
              x: rect.x + leftInset,
              y: rect.y + leftInset,
              width: chipBarWidth,
              height: rect.height - leftInset * 2,
            }
          : null;

        const dot = {
          cx: rect.x + chipPadX + chipDotSize * 0.5 + (bar ? chipBarWidth + 4 * scale : 0),
          cy: rect.y + rect.height * 0.5,
          r: chipDotSize * 0.5,
        };

        chips.push({ spec, rect, dot, bar, fontSize: chipFontSize });
        x += chipWidth + (index === specs.length - 1 ? 0 : chipGap);
      });
      return chips;
    };

    let chips = buildChips(activeSpecs);
    while (
      chips.length > 2 &&
      chips[chips.length - 1].rect.x + chips[chips.length - 1].rect.width > minChipEndX
    ) {
      activeSpecs = activeSpecs.slice(0, -1);
      chips = buildChips(activeSpecs);
    }

    const statusChip: LayoutChip | null =
      statusWidth > 0
        ? {
            spec: { id: "status", label: statusText, tone: "accent" },
            rect: statusRect,
            dot: {
              cx: statusRect.x + statusPadX + chipDotSize * 0.5 + chipBarWidth + 4 * scale,
              cy: statusRect.y + statusRect.height * 0.5,
              r: chipDotSize * 0.5,
            },
            bar: {
              x: statusRect.x + 6 * scale,
              y: statusRect.y + 6 * scale,
              width: chipBarWidth,
              height: statusRect.height - 12 * scale,
            },
            fontSize: statusFontSize,
          }
        : null;

    layoutRef.current = {
      width,
      height: BAR_HEIGHT,
      scale,
      brandSymbolRect,
      brandFontSize,
      brandTextX,
      chipRadius,
      chipHeight,
      chips,
      statusChip,
      statusText,
    };

    setLayoutVersion((version) => version + 1);
  };

  const drawGradientBackground = (
    ui: WebGLUIRenderer,
    widthCss: number,
    heightCss: number,
    dpr: number
  ) => {
    const stepHeightCss = heightCss / GRADIENT_STEPS;
    for (let i = 0; i < GRADIENT_STEPS; i += 1) {
      const t0 = i / (GRADIENT_STEPS - 1);
      const color = mix(PALETTE.bgTop, PALETTE.bgBottom, t0);
      ui.drawRect(
        0,
        i * stepHeightCss * dpr,
        widthCss * dpr,
        stepHeightCss * dpr + 1,
        color
      );
    }

    ui.drawRect(0, 0, widthCss * dpr, 1.5 * dpr, PALETTE.topAccent);
    ui.drawRect(0, 1.5 * dpr, widthCss * 0.32 * dpr, 1 * dpr, PALETTE.topAccentSoft);
  };

  const drawDotGrid = (
    ui: WebGLUIRenderer,
    widthCss: number,
    heightCss: number,
    dpr: number
  ) => {
    const cols = Math.ceil(widthCss / DOT_SPACING) + 1;
    const rows = Math.ceil(heightCss / DOT_SPACING) + 1;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const xCss = col * DOT_SPACING + (row % 2) * (DOT_SPACING * 0.5);
        const yCss = row * DOT_SPACING;
        const isStrong = row % DOT_STRONG_EVERY === 0 || col % DOT_STRONG_EVERY === 0;
        ui.drawRect(
          xCss * dpr,
          yCss * dpr,
          DOT_SIZE * dpr,
          DOT_SIZE * dpr,
          isStrong ? PALETTE.dotStrong : PALETTE.dotSoft
        );
      }
    }
  };

  const drawGlowRect = (ui: WebGLUIRenderer, rect: Rect, color: RGBA, dpr: number, scale: number) => {
    const glowPadX = 12 * scale;
    const glowPadY = 10 * scale;
    ui.drawRoundedRect(
      (rect.x - glowPadX) * dpr,
      (rect.y - glowPadY) * dpr,
      (rect.width + glowPadX * 2) * dpr,
      (rect.height + glowPadY * 2) * dpr,
      (14 * scale) * dpr,
      color
    );
  };

  const drawChipShapes = (chip: LayoutChip, ui: WebGLUIRenderer, dpr: number, radius: number) => {
    const tone = CHIP_TONES[chip.spec.tone];
    const shadowOffset = { x: 1.4, y: 2.4 };

    ui.drawRoundedRect(
      (chip.rect.x + shadowOffset.x) * dpr,
      (chip.rect.y + shadowOffset.y) * dpr,
      chip.rect.width * dpr,
      chip.rect.height * dpr,
      radius * dpr,
      PALETTE.chipShadow
    );

    ui.drawRoundedRect(
      chip.rect.x * dpr,
      chip.rect.y * dpr,
      chip.rect.width * dpr,
      chip.rect.height * dpr,
      radius * dpr,
      tone.fill
    );

    ui.drawRectStroke(
      chip.rect.x * dpr,
      chip.rect.y * dpr,
      chip.rect.width * dpr,
      chip.rect.height * dpr,
      1 * dpr,
      tone.border
    );

    if (chip.bar && tone.bar) {
      ui.drawRoundedRect(
        chip.bar.x * dpr,
        chip.bar.y * dpr,
        chip.bar.width * dpr,
        chip.bar.height * dpr,
        (chip.bar.width * 0.6) * dpr,
        tone.bar
      );
    }

    ui.drawFilledCircle(chip.dot.cx * dpr, chip.dot.cy * dpr, chip.dot.r * dpr, tone.dot);
  };

  const drawChipText = (
    chip: LayoutChip,
    textRenderer: WebGLTextRenderer,
    dpr: number,
    resolution: { width: number; height: number }
  ) => {
    textRenderer.setText(chip.spec.label, {
      fontSize: chip.fontSize * dpr,
      fontWeight: 700,
      fontFamily: UI_FONT_FAMILY,
      paddingX: 0,
      paddingY: 0,
      color: "#14120f",
    });
    const textSize = textRenderer.getSize();
    const textWidth = textSize.width / dpr;
    const textHeight = textSize.height / dpr;
    const textX = (chip.rect.x + chip.rect.width * 0.5 - textWidth * 0.5) * dpr;
    const textY = (chip.rect.y + chip.rect.height * 0.5 - textHeight * 0.5) * dpr;

    textRenderer.draw(textX, textY, resolution, PALETTE.chipText);
  };

  const drawTrackedText = (
    text: string,
    x: number,
    y: number,
    fontSize: number,
    fontWeight: number,
    fontFamily: string,
    tracking: number,
    color: RGBA,
    textRenderer: WebGLTextRenderer,
    dpr: number,
    resolution: { width: number; height: number }
  ) => {
    let cursor = x;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      textRenderer.setText(char, {
        fontSize: fontSize * dpr,
        fontWeight,
        fontFamily,
        paddingX: 0,
        paddingY: 0,
        color: "#14120f",
      });
      const size = textRenderer.getSize();
      textRenderer.draw(cursor * dpr, y * dpr, resolution, color);
      cursor += size.width / dpr;
      if (i < text.length - 1) {
        cursor += tracking;
      }
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    const ui = uiRef.current;
    const textRenderer = textRef.current;
    const iconRenderer = iconRef.current;
    if (!canvas || !gl || !ui || !textRenderer) return;

    const dpr = dprRef.current;
    const { scale, chips, statusChip, chipRadius, brandSymbolRect, brandFontSize, brandTextX } =
      layoutRef.current;
    const widthCss = layoutRef.current.width;
    const heightCss = layoutRef.current.height;
    const resolution = { width: canvas.width, height: canvas.height };

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Background pass.
    ui.begin(canvas.width, canvas.height);
    drawGradientBackground(ui, widthCss, heightCss, dpr);
    drawDotGrid(ui, widthCss, heightCss, dpr);

    ui.drawRect(0, (heightCss - 2) * dpr, widthCss * dpr, 2 * dpr, PALETTE.border);

    ui.drawRoundedRect(
      widthCss * 0.28 * dpr,
      heightCss * 0.18 * dpr,
      widthCss * 0.4 * dpr,
      heightCss * 0.58 * dpr,
      18 * dpr,
      rgb(18, 16, 12, 0.02)
    );
    ui.flush();

    // Measure brand text for the badge block.
    const brandAccentGap = BRAND_ACCENT_GAP * scale;
    const brandTracking = BRAND_TRACKING * scale;
    const brandAccentTracking = BRAND_ACCENT_TRACKING * scale;
    textRenderer.setText(BRAND_TEXT_BASE, {
      fontSize: brandFontSize * dpr,
      fontWeight: BRAND_WEIGHT,
      fontFamily: BRAND_FONT_FAMILY,
      paddingX: 0,
      paddingY: 0,
      color: "#14120f",
    });
    const brandBaseSize = textRenderer.getSize();
    textRenderer.setText(BRAND_TEXT_ACCENT, {
      fontSize: brandFontSize * dpr,
      fontWeight: BRAND_ACCENT_WEIGHT,
      fontFamily: BRAND_FONT_FAMILY,
      paddingX: 0,
      paddingY: 0,
      color: "#14120f",
    });
    const brandAccentSize = textRenderer.getSize();

    const brandBaseWidth =
      brandBaseSize.width / dpr + brandTracking * (BRAND_TEXT_BASE.length - 1);
    const brandAccentWidth =
      brandAccentSize.width / dpr +
      brandAccentTracking * (BRAND_TEXT_ACCENT.length - 1);
    const brandTextWidth = brandBaseWidth + brandAccentWidth + brandAccentGap;
    const brandTextHeight = Math.max(brandBaseSize.height, brandAccentSize.height) / dpr;
    const brandRight = brandTextX + brandTextWidth;
    const brandTextY = BAR_HEIGHT * 0.5 - brandTextHeight * 0.5;
    const brandAccentX = brandTextX + brandBaseWidth + brandAccentGap;
    const brandBadgePadX = BRAND_BADGE_PAD_X * scale;
    const brandBadgePadY = BRAND_BADGE_PAD_Y * scale;
    const brandBadgeBarWidth = BRAND_BADGE_BAR_WIDTH * scale;
    const brandBadgeBarGap = BRAND_BADGE_BAR_GAP * scale;
    const brandBadgeStroke = Math.max(1, BRAND_BADGE_STROKE * scale);
    const brandBadgeHeight =
      Math.max(brandSymbolRect.height, brandTextHeight) + brandBadgePadY * 2;
    const brandBadgeRadius = Math.min(
      BRAND_BADGE_RADIUS * scale,
      brandBadgeHeight * 0.5
    );
    const brandBadgeLeft =
      brandSymbolRect.x - (brandBadgePadX + brandBadgeBarWidth + brandBadgeBarGap);
    const brandBadgeRight = brandRight + brandBadgePadX;
    const brandBadgeRect: Rect = {
      x: brandBadgeLeft,
      y: BAR_HEIGHT * 0.5 - brandBadgeHeight * 0.5,
      width: brandBadgeRight - brandBadgeLeft,
      height: brandBadgeHeight,
    };

    // Accent + chip shapes pass.
    ui.begin(canvas.width, canvas.height);
    drawGlowRect(ui, brandBadgeRect, PALETTE.glow, dpr, scale);
    const badgeShadowOffsetX = 1.4 * scale;
    const badgeShadowOffsetY = 2.2 * scale;
    ui.drawRoundedRect(
      (brandBadgeRect.x + badgeShadowOffsetX) * dpr,
      (brandBadgeRect.y + badgeShadowOffsetY) * dpr,
      brandBadgeRect.width * dpr,
      brandBadgeRect.height * dpr,
      brandBadgeRadius * dpr,
      PALETTE.brandBadgeShadow
    );
    ui.drawRoundedRect(
      brandBadgeRect.x * dpr,
      brandBadgeRect.y * dpr,
      brandBadgeRect.width * dpr,
      brandBadgeRect.height * dpr,
      brandBadgeRadius * dpr,
      PALETTE.brandBadgeFill
    );
    ui.drawRoundedRect(
      (brandBadgeRect.x + brandBadgeStroke) * dpr,
      (brandBadgeRect.y + brandBadgeStroke) * dpr,
      brandBadgeRect.width * dpr,
      brandBadgeRect.height * 0.4 * dpr,
      Math.max(2, brandBadgeRadius - brandBadgeStroke) * dpr,
      PALETTE.brandBadgeGlow
    );
    ui.drawRectStroke(
      brandBadgeRect.x * dpr,
      brandBadgeRect.y * dpr,
      brandBadgeRect.width * dpr,
      brandBadgeRect.height * dpr,
      brandBadgeStroke * dpr,
      PALETTE.brandBadgeStroke
    );
    const barHeight = brandBadgeRect.height - brandBadgeStroke * 2;
    const barRadius = Math.min(3 * scale, barHeight * 0.5);
    ui.drawRoundedRect(
      (brandBadgeRect.x + brandBadgeStroke) * dpr,
      (brandBadgeRect.y + brandBadgeStroke) * dpr,
      brandBadgeBarWidth * dpr,
      barHeight * dpr,
      barRadius * dpr,
      PALETTE.brandAccent
    );
    const underlineHeight = Math.max(1.4, 1.6 * scale);
    const underlineY = brandTextY + brandTextHeight - underlineHeight - 4 * scale;
    ui.drawRoundedRect(
      brandAccentX * dpr,
      underlineY * dpr,
      brandAccentWidth * dpr,
      underlineHeight * dpr,
      underlineHeight * 0.6 * dpr,
      PALETTE.brandAccent
    );
    if (brandAccentWidth > underlineHeight * 2) {
      ui.drawRoundedRect(
        (brandAccentX + brandAccentWidth * 0.55) * dpr,
        underlineY * dpr,
        (brandAccentWidth * 0.45) * dpr,
        underlineHeight * dpr,
        underlineHeight * 0.6 * dpr,
        PALETTE.brandAccentDeep
      );
    }

    chips.forEach((chip) => drawChipShapes(chip, ui, dpr, chipRadius));

    if (statusChip) {
      const statusGlowRect: Rect = {
        x: statusChip.rect.x - 6 * scale,
        y: statusChip.rect.y - 6 * scale,
        width: statusChip.rect.width + 12 * scale,
        height: statusChip.rect.height + 12 * scale,
      };
      drawGlowRect(ui, statusGlowRect, rgb(210, 139, 92, 0.04), dpr, scale);
      drawChipShapes(statusChip, ui, dpr, chipRadius);
    }
    ui.flush();

    // Brand symbol pass.
    if (iconRenderer) {
      iconRenderer.begin(canvas.width, canvas.height);
      const symbolPad = 2 * scale;
      iconRenderer.drawIcon(
        {
          x: (brandSymbolRect.x - symbolPad) * dpr,
          y: (brandSymbolRect.y - symbolPad) * dpr,
          width: (brandSymbolRect.width + symbolPad * 2) * dpr,
          height: (brandSymbolRect.height + symbolPad * 2) * dpr,
        },
        "linguaSymbol",
        PALETTE.brandAccentGlow
      );
      iconRenderer.drawIcon(
        {
          x: brandSymbolRect.x * dpr,
          y: brandSymbolRect.y * dpr,
          width: brandSymbolRect.width * dpr,
          height: brandSymbolRect.height * dpr,
        },
        "linguaSymbol",
        PALETTE.brandText
      );
      iconRenderer.flush();
    }

    // Text pass: brand then chips.
    const shadowOffset = 1.2 * scale;
    drawTrackedText(
      BRAND_TEXT_BASE,
      brandTextX + shadowOffset,
      brandTextY + shadowOffset,
      brandFontSize,
      BRAND_WEIGHT,
      BRAND_FONT_FAMILY,
      BRAND_TRACKING * scale,
      PALETTE.brandShadow,
      textRenderer,
      dpr,
      resolution
    );
    drawTrackedText(
      BRAND_TEXT_BASE,
      brandTextX,
      brandTextY,
      brandFontSize,
      BRAND_WEIGHT,
      BRAND_FONT_FAMILY,
      BRAND_TRACKING * scale,
      PALETTE.brandText,
      textRenderer,
      dpr,
      resolution
    );

    drawTrackedText(
      BRAND_TEXT_ACCENT,
      brandAccentX + shadowOffset * 0.55,
      brandTextY + shadowOffset * 0.35,
      brandFontSize,
      BRAND_ACCENT_WEIGHT,
      BRAND_FONT_FAMILY,
      BRAND_ACCENT_TRACKING * scale,
      PALETTE.brandAccentGlow,
      textRenderer,
      dpr,
      resolution
    );
    drawTrackedText(
      BRAND_TEXT_ACCENT,
      brandAccentX,
      brandTextY,
      brandFontSize,
      BRAND_ACCENT_WEIGHT,
      BRAND_FONT_FAMILY,
      BRAND_ACCENT_TRACKING * scale,
      PALETTE.brandAccent,
      textRenderer,
      dpr,
      resolution
    );

    chips.forEach((chip) => drawChipText(chip, textRenderer, dpr, resolution));
    if (statusChip) {
      drawChipText(statusChip, textRenderer, dpr, resolution);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true, alpha: true });
    if (!gl) return;
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    glRef.current = gl;
    uiRef.current = new WebGLUIRenderer(gl);
    textRef.current = new WebGLTextRenderer(gl);
    iconRef.current = new WebGLIconRenderer(gl);
    draw();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const baseDpr = window.devicePixelRatio || 1;
      const dpr = Math.min(MAX_DPR, baseDpr * RENDER_SCALE);
      dprRef.current = dpr;
      updateLayout(rect.width);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(BAR_HEIGHT * dpr));
      draw();
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [status]);

  useEffect(() => {
    updateLayout(layoutRef.current.width);
    draw();
  }, [status]);

  const rootClassName = className ? `${styles.root} ${className}` : styles.root;

  return (
    <header ref={containerRef} className={rootClassName}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      {docsHref && (
        <a
          className={`${styles.docsLink} ${docsActive ? styles.docsLinkActive : ""}`}
          href={docsHref}
          aria-current={docsActive ? "page" : undefined}
        >
          Documentation
        </a>
      )}
    </header>
  );
};

export default WebGLAppTopBar;
