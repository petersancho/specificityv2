import { useEffect, useMemo, useRef, useState } from "react";
import { WebGLUIRenderer, type RGBA } from "../webgl/ui/WebGLUIRenderer";
import { WebGLTextRenderer } from "../webgl/ui/WebGLTextRenderer";
import styles from "./WebGLStatusFooter.module.css";

type Shortcut = {
  key: string;
  label: string;
};

type Rect = { x: number; y: number; width: number; height: number };

type ChipLayout = { rect: Rect; text: string };

type KeyLayout = { rect: Rect; key: string; label: string };

type LogoTone = "roslyn" | "numerica" | "neutral";

type TitleParts = {
  base: string;
  accent: string;
};

type ToggleLayout = {
  rect: Rect;
  boxRect: Rect;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
};

type LayoutState = {
  width: number;
  height: number;
  titleRect: Rect | null;
  titleParts: TitleParts | null;
  leftKeys: KeyLayout[];
  centerChips: ChipLayout[];
  rightChips: ChipLayout[];
  toggles: ToggleLayout[];
};

type WebGLStatusFooterProps = {
  shortcuts: Shortcut[];
  centerChips: string[];
  rightChips: string[];
  toggle?: {
    label: string;
    checked: boolean;
    onChange: (next: boolean) => void;
  };
  toggles?: Array<{
    label: string;
    checked: boolean;
    onChange: (next: boolean) => void;
  }>;
  title?: string;
  titleTone?: LogoTone;
  className?: string;
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

const UI_FONT_FAMILY = '"Montreal Neue", "Space Grotesk", sans-serif';

const PALETTE = {
  bgTop: rgb(250, 248, 244, 1),
  bgBottom: rgb(244, 242, 238, 1),
  border: rgb(18, 16, 12, 0.12),
  topAccent: rgb(18, 16, 12, 0.32),
  topAccentSoft: rgb(18, 16, 12, 0.18),
  dotStrong: rgb(18, 16, 12, 0.06),
  dotSoft: rgb(18, 16, 12, 0.02),
  chipFill: rgb(250, 248, 244, 0.98),
  chipHighlight: rgb(255, 255, 255, 0.55),
  chipBorder: rgb(18, 16, 12, 0.2),
  chipShadow: rgb(0, 0, 0, 0.08),
  chipText: rgb(18, 16, 12, 0.92),
  keyLabel: rgb(18, 16, 12, 0.6),
  toggleFill: rgb(248, 246, 242, 1),
  toggleHighlight: rgb(255, 255, 255, 0.6),
  toggleBorder: rgb(18, 16, 12, 0.22),
  toggleActive: rgb(18, 16, 12, 0.92),
  toggleText: rgb(18, 16, 12, 0.9),
};

const TITLE_PALETTE = {
  fill: rgb(246, 243, 238, 1),
  stroke: rgb(198, 193, 187, 1),
  text: rgb(24, 24, 28, 0.95),
  shadow: rgb(0, 0, 0, 0.22),
  glow: rgb(255, 255, 255, 0.35),
};

const TITLE_ACCENTS: Record<LogoTone, RGBA> = {
  roslyn: rgb(11, 138, 151, 1),
  numerica: rgb(81, 50, 194, 1),
  neutral: rgb(204, 91, 26, 1),
};

const FOOTER_HEIGHT = 64;
const PADDING_X = 20;
const ITEM_GAP = 10;
const GROUP_GAP = 18;
const CHIP_HEIGHT = 34;
const KEY_HEIGHT = 38;
const CHIP_PAD_X = 16;
const KEY_PAD_X = 13;
const CHIP_RADIUS = 5;
const CHIP_STROKE = 1.1;
const DOT_SPACING = 26;
const DOT_SIZE = 1.1;
const DOT_STRONG_EVERY = 4;
const GRADIENT_STEPS = 12;
const RENDER_SCALE = 1.35;
const MAX_DPR = 3;

const TITLE_FONT_SIZE = 12;
const TITLE_PAD_X = 10;
const TITLE_PAD_Y = 5;
const TITLE_BAR_WIDTH = 3;
const TITLE_BAR_GAP = 6;
const TITLE_GAP = 3;
const TITLE_RADIUS = 5;
const TITLE_STROKE = 1.2;
const TITLE_SHADOW_OFFSET = 1.4;
const TITLE_UNDERLINE_HEIGHT = 1.8;
const TITLE_UNDERLINE_INSET = 3;

const KEY_FONT_SIZE = 12;
const LABEL_FONT_SIZE = 9.5;
const CHIP_FONT_SIZE = 11.5;
const TOGGLE_FONT_SIZE = 10.5;
const TOGGLE_HEIGHT = 26;
const TOGGLE_BOX_SIZE = 15;
const TOGGLE_LABEL_GAP = 7;
const TOGGLE_ITEM_GAP = 14;
const KEY_TEXT_OFFSET = -KEY_HEIGHT * 0.18;
const KEY_LABEL_OFFSET = KEY_HEIGHT * 0.22;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const createMeasureContext = () => {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  return canvas.getContext("2d");
};

const measureTextWidth = (text: string, fontSize: number, weight: number) => {
  const ctx = createMeasureContext();
  if (!ctx) return text.length * fontSize * 0.6;
  ctx.font = `normal ${weight} ${fontSize}px ${UI_FONT_FAMILY}`;
  return ctx.measureText(text).width;
};

const resolveTitleParts = (title: string): TitleParts => {
  const normalized = title.trim().toLowerCase();
  if (normalized === "roslyn") return { base: "ROS", accent: "LYN" };
  if (normalized === "numerica") return { base: "NUME", accent: "RICA" };
  return { base: title.toUpperCase(), accent: "" };
};

const measureTitleBadge = (title: string) => {
  const parts = resolveTitleParts(title);
  const baseWidth = measureTextWidth(parts.base, TITLE_FONT_SIZE, 700);
  const accentWidth = parts.accent
    ? measureTextWidth(parts.accent, TITLE_FONT_SIZE, 800)
    : 0;
  const textWidth = baseWidth + (parts.accent ? TITLE_GAP + accentWidth : 0);
  const textHeight = TITLE_FONT_SIZE * 1.35;
  const width = textWidth + TITLE_PAD_X * 2 + TITLE_BAR_WIDTH + TITLE_BAR_GAP;
  const height = textHeight + TITLE_PAD_Y * 2;
  return { width, height, parts, baseWidth, accentWidth, textHeight };
};

const measureChipWidth = (text: string) =>
  measureTextWidth(text, CHIP_FONT_SIZE, 700) + CHIP_PAD_X * 2;

const measureKeyWidth = (key: string, label: string) => {
  const keyWidth = measureTextWidth(key, KEY_FONT_SIZE, 700);
  const labelWidth = measureTextWidth(label, LABEL_FONT_SIZE, 600);
  return Math.max(keyWidth, labelWidth) + KEY_PAD_X * 2;
};

const measureToggleWidth = (label: string) =>
  TOGGLE_BOX_SIZE + TOGGLE_LABEL_GAP + measureTextWidth(label, TOGGLE_FONT_SIZE, 700);

const buildRowLayouts = (
  items: { width: number; text: string }[],
  startX: number,
  centerY: number,
  height: number
) => {
  let x = startX;
  return items.map((item) => {
    const rect = {
      x,
      y: centerY - height * 0.5,
      width: item.width,
      height,
    } satisfies Rect;
    x += item.width + ITEM_GAP;
    return { rect, text: item.text };
  });
};

const buildKeyLayouts = (
  shortcuts: Shortcut[],
  startX: number,
  centerY: number
): KeyLayout[] => {
  let x = startX;
  return shortcuts.map((shortcut) => {
    const width = measureKeyWidth(shortcut.key, shortcut.label);
    const rect = {
      x,
      y: centerY - KEY_HEIGHT * 0.5,
      width,
      height: KEY_HEIGHT,
    } satisfies Rect;
    x += width + ITEM_GAP;
    return { rect, key: shortcut.key, label: shortcut.label };
  });
};

const getRowWidth = (widths: number[]) =>
  widths.reduce((sum, width) => sum + width, 0) + Math.max(0, widths.length - 1) * ITEM_GAP;

const WebGLStatusFooter = ({
  shortcuts,
  centerChips,
  rightChips,
  toggle,
  toggles,
  title,
  titleTone = "neutral",
  className,
}: WebGLStatusFooterProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerWidthRef = useRef(1);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const uiRef = useRef<WebGLUIRenderer | null>(null);
  const textRef = useRef<WebGLTextRenderer | null>(null);
  const dprRef = useRef(1);
  const layoutRef = useRef<LayoutState>({
    width: 1,
    height: FOOTER_HEIGHT,
    titleRect: null,
    titleParts: null,
    leftKeys: [],
    centerChips: [],
    rightChips: [],
    toggles: [],
  });

  const resolvedToggles = useMemo(() => {
    if (toggles && toggles.length > 0) return toggles;
    if (toggle) return [toggle];
    return [];
  }, [toggle, toggles]);

  const shortcutLayouts = useMemo(
    () => shortcuts.map((shortcut) => ({ ...shortcut, width: measureKeyWidth(shortcut.key, shortcut.label) })),
    [shortcuts]
  );

  const centerChipLayouts = useMemo(
    () => centerChips.map((text) => ({ text, width: measureChipWidth(text) })),
    [centerChips]
  );

  const rightChipLayouts = useMemo(
    () => rightChips.map((text) => ({ text, width: measureChipWidth(text) })),
    [rightChips]
  );

  const prepareText = (text: string, fontSize: number, fontWeight: number) => {
    const textRenderer = textRef.current;
    if (!textRenderer) return { width: 0, height: 0 };
    const dpr = dprRef.current;
    textRenderer.setText(text, {
      fontSize: fontSize * dpr,
      fontWeight,
      fontFamily: UI_FONT_FAMILY,
      paddingX: 0,
      paddingY: 0,
      color: "#14120f",
    });
    return textRenderer.getSize();
  };

  const drawPreparedText = (x: number, y: number, color: RGBA) => {
    const textRenderer = textRef.current;
    const canvas = canvasRef.current;
    if (!textRenderer || !canvas) return;
    textRenderer.draw(x, y, { width: canvas.width, height: canvas.height }, color);
  };

  const drawChip = (rect: Rect) => {
    const ui = uiRef.current;
    if (!ui) return;
    const dpr = dprRef.current;
    const radius = Math.min(CHIP_RADIUS, rect.height * 0.5);
    const shadowOffset = { x: 1.2, y: 2.2 };

    ui.drawRoundedRect(
      (rect.x + shadowOffset.x) * dpr,
      (rect.y + shadowOffset.y) * dpr,
      rect.width * dpr,
      rect.height * dpr,
      radius * dpr,
      PALETTE.chipShadow
    );
    ui.drawRoundedRect(
      rect.x * dpr,
      rect.y * dpr,
      rect.width * dpr,
      rect.height * dpr,
      radius * dpr,
      PALETTE.chipFill
    );

    const highlightInset = CHIP_STROKE;
    ui.drawRoundedRect(
      (rect.x + highlightInset) * dpr,
      (rect.y + highlightInset) * dpr,
      (rect.width - highlightInset * 2) * dpr,
      rect.height * 0.48 * dpr,
      Math.max(2, radius - highlightInset) * dpr,
      mix(PALETTE.chipHighlight, PALETTE.chipFill, 0.35)
    );

    ui.drawRectStroke(
      rect.x * dpr,
      rect.y * dpr,
      rect.width * dpr,
      rect.height * dpr,
      CHIP_STROKE * dpr,
      PALETTE.chipBorder
    );
  };

  const drawTitleBadge = (rect: Rect, parts: TitleParts) => {
    const ui = uiRef.current;
    const textRenderer = textRef.current;
    const canvas = canvasRef.current;
    if (!ui || !textRenderer || !canvas) return;
    const dpr = dprRef.current;
    const accent = TITLE_ACCENTS[titleTone] ?? TITLE_ACCENTS.neutral;

    ui.drawRoundedRect(
      (rect.x + TITLE_SHADOW_OFFSET) * dpr,
      (rect.y + TITLE_SHADOW_OFFSET) * dpr,
      rect.width * dpr,
      rect.height * dpr,
      TITLE_RADIUS * dpr,
      TITLE_PALETTE.shadow
    );
    ui.drawRoundedRect(
      rect.x * dpr,
      rect.y * dpr,
      rect.width * dpr,
      rect.height * dpr,
      TITLE_RADIUS * dpr,
      TITLE_PALETTE.fill
    );
    ui.drawRoundedRect(
      (rect.x + TITLE_STROKE) * dpr,
      (rect.y + TITLE_STROKE) * dpr,
      (rect.width - TITLE_STROKE * 2) * dpr,
      rect.height * 0.52 * dpr,
      Math.max(2, TITLE_RADIUS - TITLE_STROKE) * dpr,
      mix(TITLE_PALETTE.glow, TITLE_PALETTE.fill, 0.4)
    );
    ui.drawRectStroke(
      rect.x * dpr,
      rect.y * dpr,
      rect.width * dpr,
      rect.height * dpr,
      TITLE_STROKE * dpr,
      TITLE_PALETTE.stroke
    );
    ui.drawRoundedRect(
      (rect.x + TITLE_STROKE) * dpr,
      (rect.y + TITLE_STROKE) * dpr,
      TITLE_BAR_WIDTH * dpr,
      (rect.height - TITLE_STROKE * 2) * dpr,
      Math.min(4.5, (rect.height - TITLE_STROKE * 2) * 0.5) * dpr,
      accent
    );

    const baseSize = prepareText(parts.base, TITLE_FONT_SIZE, 700);
    const baseWidth = baseSize.width / dpr;
    const baseHeight = baseSize.height / dpr;
    const accentSize = parts.accent
      ? prepareText(parts.accent, TITLE_FONT_SIZE, 800)
      : { width: 0, height: 0 };
    const accentWidth = accentSize.width / dpr;
    const accentHeight = accentSize.height / dpr;

    const textHeight = Math.max(baseHeight, accentHeight);
    const textX = rect.x + TITLE_PAD_X + TITLE_BAR_WIDTH + TITLE_BAR_GAP;
    const textY = rect.y + rect.height * 0.5 - textHeight * 0.5;
    const shadowOffset = 1.2;

    prepareText(parts.base, TITLE_FONT_SIZE, 700);
    drawPreparedText((textX + shadowOffset) * dpr, (textY + shadowOffset) * dpr, TITLE_PALETTE.shadow);
    drawPreparedText(textX * dpr, textY * dpr, TITLE_PALETTE.text);

    if (parts.accent) {
      const accentX = textX + baseWidth + TITLE_GAP;
      prepareText(parts.accent, TITLE_FONT_SIZE, 800);
      drawPreparedText(
        (accentX + shadowOffset * 0.6) * dpr,
        (textY + shadowOffset * 0.6) * dpr,
        TITLE_PALETTE.shadow
      );
      drawPreparedText(accentX * dpr, textY * dpr, accent);

      const underlineY =
        rect.y + rect.height - TITLE_UNDERLINE_HEIGHT - TITLE_UNDERLINE_INSET;
      ui.drawRoundedRect(
        accentX * dpr,
        underlineY * dpr,
        accentWidth * dpr,
        TITLE_UNDERLINE_HEIGHT * dpr,
        TITLE_UNDERLINE_HEIGHT * 0.6 * dpr,
        accent
      );
    }
  };

  const updateLayout = (width: number) => {
    const centerY = FOOTER_HEIGHT * 0.5;
    const titleMetrics = title ? measureTitleBadge(title) : null;
    const titleRect = titleMetrics
      ? {
          x: PADDING_X,
          y: centerY - titleMetrics.height * 0.5,
          width: titleMetrics.width,
          height: titleMetrics.height,
        }
      : null;
    const leftWidths = shortcutLayouts.map((item) => item.width);
    const centerWidths = centerChipLayouts.map((item) => item.width);
    const rightWidths = rightChipLayouts.map((item) => item.width);
    const toggleWidths = resolvedToggles.map((item) => measureToggleWidth(item.label));

    const leftWidth = getRowWidth(leftWidths);
    const centerWidth = getRowWidth(centerWidths);
    const rightWidth = getRowWidth(rightWidths);
    const togglesWidth =
      toggleWidths.reduce((sum, item) => sum + item, 0) +
      Math.max(0, toggleWidths.length - 1) * TOGGLE_ITEM_GAP;

    const leftStart = titleRect ? titleRect.x + titleRect.width + GROUP_GAP : PADDING_X;
    const leftEnd = leftStart + leftWidth;
    const rightInset = togglesWidth > 0 ? togglesWidth + GROUP_GAP : 0;
    const rightStart = width - PADDING_X - rightWidth - rightInset;
    const toggleStart = width - PADDING_X - togglesWidth;

    const centeredStart = (width - centerWidth) * 0.5;
    const minCenterStart = leftEnd + GROUP_GAP;
    const maxCenterStart = rightStart - GROUP_GAP - centerWidth;
    const centerStart = clamp(centeredStart, minCenterStart, maxCenterStart);

    const leftKeys = buildKeyLayouts(shortcuts, leftStart, centerY);
    const centerChipsLayout = buildRowLayouts(centerChipLayouts, centerStart, centerY, CHIP_HEIGHT);
    const rightChipsLayout = buildRowLayouts(rightChipLayouts, rightStart, centerY, CHIP_HEIGHT);
    const toggleLayouts: ToggleLayout[] = [];
    let toggleX = toggleStart;
    resolvedToggles.forEach((item) => {
      const width = measureToggleWidth(item.label);
      const rect = {
        x: toggleX,
        y: centerY - TOGGLE_HEIGHT * 0.5,
        width,
        height: TOGGLE_HEIGHT,
      } satisfies Rect;
      const boxRect = {
        x: rect.x,
        y: rect.y + (rect.height - TOGGLE_BOX_SIZE) * 0.5,
        width: TOGGLE_BOX_SIZE,
        height: TOGGLE_BOX_SIZE,
      } satisfies Rect;
      toggleLayouts.push({
        rect,
        boxRect,
        label: item.label,
        checked: item.checked,
        onChange: item.onChange,
      });
      toggleX += width + TOGGLE_ITEM_GAP;
    });

    layoutRef.current = {
      width,
      height: FOOTER_HEIGHT,
      titleRect,
      titleParts: titleMetrics?.parts ?? null,
      leftKeys,
      centerChips: centerChipsLayout,
      rightChips: rightChipsLayout,
      toggles: toggleLayouts,
    };
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
    ui.drawRect(0, 1.5 * dpr, widthCss * 0.38 * dpr, 1 * dpr, PALETTE.topAccentSoft);
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

  const draw = () => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    const ui = uiRef.current;
    if (!canvas || !gl || !ui) return;

    const dpr = dprRef.current;
    const widthCss = canvas.width / dpr;
    const heightCss = canvas.height / dpr;
    const {
      leftKeys,
      centerChips: centerLayout,
      rightChips: rightLayout,
      titleRect,
      titleParts,
      toggles: toggleLayout,
    } = layoutRef.current;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    ui.begin(canvas.width, canvas.height);
    drawGradientBackground(ui, widthCss, heightCss, dpr);
    drawDotGrid(ui, widthCss, heightCss, dpr);
    ui.drawRect(0, 0, canvas.width, 1 * dpr, PALETTE.border);

    if (titleRect && titleParts) {
      drawTitleBadge(titleRect, titleParts);
    }

    [...centerLayout, ...rightLayout].forEach((chip) => drawChip(chip.rect));
    leftKeys.forEach((key) => drawChip(key.rect));

    toggleLayout.forEach((toggleItem) => {
      const box = toggleItem.boxRect;
      const toggleRadius = Math.min(3.5, box.height * 0.4);
      ui.drawRoundedRect(
        box.x * dpr,
        box.y * dpr,
        box.width * dpr,
        box.height * dpr,
        toggleRadius * dpr,
        PALETTE.toggleFill
      );
      ui.drawRoundedRect(
        (box.x + 1) * dpr,
        (box.y + 1) * dpr,
        (box.width - 2) * dpr,
        box.height * 0.5 * dpr,
        Math.max(2, toggleRadius - 1) * dpr,
        mix(PALETTE.toggleHighlight, PALETTE.toggleFill, 0.4)
      );
      ui.drawRectStroke(
        box.x * dpr,
        box.y * dpr,
        box.width * dpr,
        box.height * dpr,
        1 * dpr,
        PALETTE.toggleBorder
      );
      if (toggleItem.checked) {
        const x1 = (box.x + 3) * dpr;
        const y1 = (box.y + box.height * 0.55) * dpr;
        const x2 = (box.x + box.width * 0.45) * dpr;
        const y2 = (box.y + box.height - 3) * dpr;
        const x3 = (box.x + box.width - 2.5) * dpr;
        const y3 = (box.y + 3) * dpr;
        ui.drawLine(x1, y1, x2, y2, 2.2 * dpr, PALETTE.toggleActive);
        ui.drawLine(x2, y2, x3, y3, 2.2 * dpr, PALETTE.toggleActive);
      }
    });

    ui.flush();

    const drawCenteredText = (
      text: string,
      rect: Rect,
      fontSize: number,
      fontWeight: number,
      color: RGBA,
      offsetY = 0
    ) => {
      const size = prepareText(text, fontSize, fontWeight);
      const textWidth = size.width / dpr;
      const textHeight = size.height / dpr;
      const x = (rect.x + rect.width * 0.5 - textWidth * 0.5) * dpr;
      const y = (rect.y + rect.height * 0.5 - textHeight * 0.5 + offsetY) * dpr;
      drawPreparedText(x, y, color);
    };

    centerLayout.forEach((chip) => {
      drawCenteredText(chip.text, chip.rect, CHIP_FONT_SIZE, 700, PALETTE.chipText);
    });

    rightLayout.forEach((chip) => {
      drawCenteredText(chip.text, chip.rect, CHIP_FONT_SIZE, 700, PALETTE.chipText);
    });

    leftKeys.forEach((keyLayout) => {
      drawCenteredText(
        keyLayout.key,
        keyLayout.rect,
        KEY_FONT_SIZE,
        700,
        PALETTE.chipText,
        KEY_TEXT_OFFSET
      );
      drawCenteredText(
        keyLayout.label,
        keyLayout.rect,
        LABEL_FONT_SIZE,
        600,
        PALETTE.keyLabel,
        KEY_LABEL_OFFSET
      );
    });

    toggleLayout.forEach((toggleItem) => {
      const textX = (toggleItem.boxRect.x + toggleItem.boxRect.width + TOGGLE_LABEL_GAP) * dpr;
      const size = prepareText(toggleItem.label, TOGGLE_FONT_SIZE, 700);
      const textHeight = size.height / dpr;
      const textY =
        (toggleItem.rect.y + toggleItem.rect.height * 0.5 - textHeight * 0.5) * dpr;
      drawPreparedText(textX, textY, PALETTE.toggleText);
    });
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
    draw();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerDown = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const toggleItems = layoutRef.current.toggles;
      for (const item of toggleItems) {
        const hit =
          x >= item.rect.x &&
          x <= item.rect.x + item.rect.width &&
          y >= item.rect.y &&
          y <= item.rect.y + item.rect.height;
        if (hit) {
          item.onChange(!item.checked);
          break;
        }
      }
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    return () => canvas.removeEventListener("pointerdown", handlePointerDown);
  }, [resolvedToggles]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const baseDpr = window.devicePixelRatio || 1;
      const dpr = Math.min(MAX_DPR, baseDpr * RENDER_SCALE);
      dprRef.current = dpr;
      containerWidthRef.current = rect.width;
      updateLayout(rect.width);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(FOOTER_HEIGHT * dpr));
      draw();
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [centerChipLayouts, rightChipLayouts, shortcutLayouts, title, resolvedToggles]);

  useEffect(() => {
    draw();
  }, [centerChipLayouts, rightChipLayouts, shortcutLayouts, title, titleTone, resolvedToggles]);

  const rootClassName = className ? `${styles.root} ${className}` : styles.root;

  return (
    <div ref={containerRef} className={rootClassName} style={{ height: FOOTER_HEIGHT }}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
    </div>
  );
};

export default WebGLStatusFooter;
