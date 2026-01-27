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

type LayoutState = {
  width: number;
  height: number;
  leftKeys: KeyLayout[];
  centerChips: ChipLayout[];
  rightChips: ChipLayout[];
};

type WebGLStatusFooterProps = {
  shortcuts: Shortcut[];
  centerChips: string[];
  rightChips: string[];
  className?: string;
};

const rgb = (r: number, g: number, b: number, a = 1): RGBA => [
  r / 255,
  g / 255,
  b / 255,
  a,
];

const PALETTE = {
  background: rgb(247, 243, 234, 0.98),
  border: rgb(18, 16, 12, 0.18),
  dotStrong: rgb(18, 16, 12, 0.12),
  dotSoft: rgb(18, 16, 12, 0.05),
  shadow: rgb(0, 0, 0, 0.16),
  chipFill: rgb(252, 250, 246, 0.98),
  chipBorder: rgb(18, 16, 12, 0.22),
  chipText: rgb(18, 16, 12, 0.98),
  keyLabel: rgb(18, 16, 12, 0.6),
};

const FOOTER_HEIGHT = 54;
const PADDING_X = 18;
const ITEM_GAP = 8;
const GROUP_GAP = 16;
const CHIP_HEIGHT = 32;
const KEY_HEIGHT = 36;
const CHIP_PAD_X = 14;
const KEY_PAD_X = 12;
const DOT_SPACING = 26;
const DOT_SIZE = 1.4;
const DOT_STRONG_EVERY = 4;

const KEY_FONT_SIZE = 11;
const LABEL_FONT_SIZE = 9;
const CHIP_FONT_SIZE = 11;

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
  ctx.font = `normal ${weight} ${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  return ctx.measureText(text).width;
};

const measureChipWidth = (text: string) =>
  measureTextWidth(text, CHIP_FONT_SIZE, 700) + CHIP_PAD_X * 2;

const measureKeyWidth = (key: string, label: string) => {
  const keyWidth = measureTextWidth(key, KEY_FONT_SIZE, 700);
  const labelWidth = measureTextWidth(label, LABEL_FONT_SIZE, 600);
  return Math.max(keyWidth, labelWidth) + KEY_PAD_X * 2;
};

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

const WebGLStatusFooter = ({ shortcuts, centerChips, rightChips, className }: WebGLStatusFooterProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const uiRef = useRef<WebGLUIRenderer | null>(null);
  const textRef = useRef<WebGLTextRenderer | null>(null);
  const dprRef = useRef(1);
  const layoutRef = useRef<LayoutState>({
    width: 1,
    height: FOOTER_HEIGHT,
    leftKeys: [],
    centerChips: [],
    rightChips: [],
  });
  const [, setLayoutVersion] = useState(0);

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
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
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

    const shadowOffsetX = 2 * dpr;
    const shadowOffsetY = 4 * dpr;
    ui.drawRect(
      (rect.x + shadowOffsetX) * dpr,
      (rect.y + shadowOffsetY) * dpr,
      rect.width * dpr,
      rect.height * dpr,
      PALETTE.shadow
    );
    ui.drawRect(rect.x * dpr, rect.y * dpr, rect.width * dpr, rect.height * dpr, PALETTE.chipFill);
    ui.drawRect(rect.x * dpr, rect.y * dpr, rect.width * dpr, 1.5 * dpr, PALETTE.border);
    ui.drawRect(
      rect.x * dpr,
      (rect.y + rect.height - 1.5) * dpr,
      rect.width * dpr,
      1.5 * dpr,
      PALETTE.chipBorder
    );
  };

  const updateLayout = (width: number) => {
    const centerY = FOOTER_HEIGHT * 0.5;
    const leftWidths = shortcutLayouts.map((item) => item.width);
    const centerWidths = centerChipLayouts.map((item) => item.width);
    const rightWidths = rightChipLayouts.map((item) => item.width);

    const leftWidth = getRowWidth(leftWidths);
    const centerWidth = getRowWidth(centerWidths);
    const rightWidth = getRowWidth(rightWidths);

    const leftStart = PADDING_X;
    const leftEnd = leftStart + leftWidth;
    const rightStart = width - PADDING_X - rightWidth;

    const centeredStart = (width - centerWidth) * 0.5;
    const minCenterStart = leftEnd + GROUP_GAP;
    const maxCenterStart = rightStart - GROUP_GAP - centerWidth;
    const centerStart = clamp(centeredStart, minCenterStart, maxCenterStart);

    const leftKeys = buildKeyLayouts(shortcuts, leftStart, centerY);
    const centerChipsLayout = buildRowLayouts(centerChipLayouts, centerStart, centerY, CHIP_HEIGHT);
    const rightChipsLayout = buildRowLayouts(rightChipLayouts, rightStart, centerY, CHIP_HEIGHT);

    layoutRef.current = {
      width,
      height: FOOTER_HEIGHT,
      leftKeys,
      centerChips: centerChipsLayout,
      rightChips: rightChipsLayout,
    };

    setLayoutVersion((version) => version + 1);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    const ui = uiRef.current;
    if (!canvas || !gl || !ui) return;

    const dpr = dprRef.current;
    const { leftKeys, centerChips: centerLayout, rightChips: rightLayout } = layoutRef.current;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    ui.begin(canvas.width, canvas.height);
    ui.drawRect(0, 0, canvas.width, canvas.height, PALETTE.background);

    const dotSpacing = DOT_SPACING * dpr;
    const dotSize = DOT_SIZE * dpr;
    const cols = Math.ceil(canvas.width / dotSpacing) + 1;
    const rows = Math.ceil(canvas.height / dotSpacing) + 1;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = col * dotSpacing + (row % 2) * (dotSpacing * 0.5);
        const y = row * dotSpacing;
        const isStrong = row % DOT_STRONG_EVERY === 0 || col % DOT_STRONG_EVERY === 0;
        ui.drawRect(x, y, dotSize, dotSize, isStrong ? PALETTE.dotStrong : PALETTE.dotSoft);
      }
    }

    ui.drawRect(0, 0, canvas.width, 2 * dpr, PALETTE.border);

    [...centerLayout, ...rightLayout].forEach((chip) => drawChip(chip.rect));
    leftKeys.forEach((key) => drawChip(key.rect));

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
      drawCenteredText(keyLayout.key, keyLayout.rect, KEY_FONT_SIZE, 700, PALETTE.chipText, -6);
      drawCenteredText(keyLayout.label, keyLayout.rect, LABEL_FONT_SIZE, 600, PALETTE.keyLabel, 8);
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
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      updateLayout(rect.width);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(FOOTER_HEIGHT * dpr));
      draw();
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [centerChipLayouts, rightChipLayouts, shortcutLayouts]);

  useEffect(() => {
    draw();
  }, [centerChipLayouts, rightChipLayouts, shortcutLayouts]);

  const rootClassName = className ? `${styles.root} ${className}` : styles.root;

  return (
    <div ref={containerRef} className={rootClassName} style={{ height: FOOTER_HEIGHT }}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
    </div>
  );
};

export default WebGLStatusFooter;
