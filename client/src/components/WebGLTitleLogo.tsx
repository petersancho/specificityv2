import { useEffect, useRef } from "react";
import { WebGLUIRenderer, type RGBA } from "../webgl/ui/WebGLUIRenderer";
import { WebGLTextRenderer } from "../webgl/ui/WebGLTextRenderer";
import styles from "./WebGLTitleLogo.module.css";

type LogoTone = "roslyn" | "numerica" | "neutral";

type WebGLTitleLogoProps = {
  title: string;
  tone?: LogoTone;
  className?: string;
};

type TitleParts = {
  base: string;
  accent: string;
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

const PALETTE_LIGHT = {
  fill: rgb(246, 243, 238, 1),
  stroke: rgb(198, 193, 187, 1),
  text: rgb(24, 24, 28, 0.96),
  textShadow: rgb(0, 0, 0, 0.35),
  glow: rgb(255, 255, 255, 0.5),
  shadow: rgb(0, 0, 0, 1),
};

const PALETTE_DARK = {
  fill: rgb(38, 38, 38, 1),
  stroke: rgb(70, 70, 70, 1),
  text: rgb(240, 240, 240, 0.96),
  textShadow: rgb(0, 0, 0, 0.5),
  glow: rgb(60, 60, 60, 0.5),
  shadow: rgb(0, 0, 0, 1),
};

const TONE_ACCENTS: Record<LogoTone, RGBA> = {
  roslyn: rgb(0, 212, 255, 1),
  numerica: rgb(255, 0, 153, 1),
  neutral: rgb(204, 91, 26, 1),
};

const TITLE_PARTS: Record<string, TitleParts> = {
  roslyn: { base: "ROS", accent: "LYN" },
  numerica: { base: "NUME", accent: "RICA" },
};

const FONT_FAMILY =
  '"Helvetica Neue", "Montreal Neue", "Space Grotesk", Helvetica, Arial, sans-serif';
const BASE_WEIGHT = 700;
const ACCENT_WEIGHT = 800;

const FONT_SIZE = 14;
const PADDING_X = 12;
const PADDING_Y = 6;
const ACCENT_GAP = 3;
const ACCENT_BAR = 3;
const ACCENT_BAR_GAP = 7;
const RADIUS = 6;
const STROKE = 1.4;
const SHADOW_OFFSET = 2;
const UNDERLINE_HEIGHT = 2;
const UNDERLINE_INSET = 4;

const resolveTitleParts = (title: string): TitleParts => {
  const normalized = title.trim().toLowerCase();
  const parts = TITLE_PARTS[normalized];
  if (parts) return parts;
  return { base: title.toUpperCase(), accent: "" };
};

const WebGLTitleLogo = ({ title, tone = "neutral", className }: WebGLTitleLogoProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const uiRef = useRef<WebGLUIRenderer | null>(null);
  const textRef = useRef<WebGLTextRenderer | null>(null);
  const paletteRef = useRef(PALETTE_LIGHT);

  const draw = () => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    const ui = uiRef.current;
    const textRenderer = textRef.current;
    if (!canvas || !gl || !ui || !textRenderer) return;

    const dpr = window.devicePixelRatio || 1;
    const parts = resolveTitleParts(title);
    const accent = TONE_ACCENTS[tone] ?? TONE_ACCENTS.neutral;

    textRenderer.setText(parts.base, {
      fontSize: FONT_SIZE * dpr,
      fontWeight: BASE_WEIGHT,
      fontFamily: FONT_FAMILY,
      paddingX: 0,
      paddingY: 0,
      color: "#ffffff",
    });
    const baseSize = textRenderer.getSize();
    let accentSize = { width: 0, height: 0 };
    if (parts.accent) {
      textRenderer.setText(parts.accent, {
        fontSize: FONT_SIZE * dpr,
        fontWeight: ACCENT_WEIGHT,
        fontFamily: FONT_FAMILY,
        paddingX: 0,
        paddingY: 0,
        color: "#ffffff",
      });
      accentSize = textRenderer.getSize();
    }

    const baseWidth = baseSize.width / dpr;
    const accentWidth = accentSize.width / dpr;
    const textWidth =
      baseWidth + (parts.accent ? ACCENT_GAP + accentWidth : 0);
    const textHeight = Math.max(baseSize.height, accentSize.height) / dpr;

    const widthCss = textWidth + PADDING_X * 2 + ACCENT_BAR + ACCENT_BAR_GAP;
    const heightCss = textHeight + PADDING_Y * 2;

    canvas.width = Math.max(1, Math.floor(widthCss * dpr));
    canvas.height = Math.max(1, Math.floor(heightCss * dpr));
    canvas.style.width = `${widthCss}px`;
    canvas.style.height = `${heightCss}px`;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const rect = { x: 0, y: 0, width: widthCss, height: heightCss };
    const radius = Math.min(RADIUS, rect.height / 2);

    ui.begin(canvas.width, canvas.height);
    const palette = paletteRef.current;
    ui.drawRoundedRect(
      (rect.x + SHADOW_OFFSET) * dpr,
      (rect.y + SHADOW_OFFSET) * dpr,
      rect.width * dpr,
      rect.height * dpr,
      radius * dpr,
      palette.shadow
    );
    ui.drawRoundedRect(
      rect.x * dpr,
      rect.y * dpr,
      rect.width * dpr,
      rect.height * dpr,
      radius * dpr,
      palette.fill
    );
    ui.drawRoundedRect(
      (rect.x + STROKE) * dpr,
      (rect.y + STROKE) * dpr,
      rect.width * dpr,
      rect.height * 0.52 * dpr,
      Math.max(2, (radius - STROKE)) * dpr,
      mix(palette.glow, palette.fill, 0.35)
    );
    ui.drawRectStroke(
      rect.x * dpr,
      rect.y * dpr,
      rect.width * dpr,
      rect.height * dpr,
      STROKE * dpr,
      palette.stroke
    );

    const barHeight = rect.height - STROKE * 2;
    const barRadius = Math.min(4, barHeight * 0.5);
    ui.drawRoundedRect(
      (rect.x + STROKE) * dpr,
      (rect.y + STROKE) * dpr,
      ACCENT_BAR * dpr,
      barHeight * dpr,
      barRadius * dpr,
      accent
    );

    if (parts.accent) {
      const underlineWidth = accentWidth;
      const underlineY = rect.y + rect.height - UNDERLINE_HEIGHT - UNDERLINE_INSET;
      const underlineX =
        rect.x + PADDING_X + ACCENT_BAR + ACCENT_BAR_GAP + baseWidth + ACCENT_GAP;
      ui.drawRoundedRect(
        underlineX * dpr,
        underlineY * dpr,
        underlineWidth * dpr,
        UNDERLINE_HEIGHT * dpr,
        UNDERLINE_HEIGHT * 0.6 * dpr,
        accent
      );
    }
    ui.flush();

    const resolution = { width: canvas.width, height: canvas.height };
    const textX = rect.x + PADDING_X + ACCENT_BAR + ACCENT_BAR_GAP;
    const textY = rect.y + rect.height * 0.5 - textHeight * 0.5;
    const shadowOffset = 1.6;

    textRenderer.setText(parts.base, {
      fontSize: FONT_SIZE * dpr,
      fontWeight: BASE_WEIGHT,
      fontFamily: FONT_FAMILY,
      paddingX: 0,
      paddingY: 0,
      color: "#ffffff",
    });
    textRenderer.draw(
      (textX + shadowOffset) * dpr,
      (textY + shadowOffset) * dpr,
      resolution,
      palette.textShadow
    );
    textRenderer.draw(textX * dpr, textY * dpr, resolution, palette.text);

    if (parts.accent) {
      const accentX = textX + baseWidth + ACCENT_GAP;
      textRenderer.setText(parts.accent, {
        fontSize: FONT_SIZE * dpr,
        fontWeight: ACCENT_WEIGHT,
        fontFamily: FONT_FAMILY,
        paddingX: 0,
        paddingY: 0,
        color: "#ffffff",
      });
      textRenderer.draw(
        (accentX + shadowOffset * 0.6) * dpr,
        (textY + shadowOffset * 0.6) * dpr,
        resolution,
        mix(accent, palette.textShadow, 0.35)
      );
      textRenderer.draw(accentX * dpr, textY * dpr, resolution, accent);
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

    // Theme detection
    const updatePalette = () => {
      const isDark = document.documentElement.dataset.theme === "dark";
      paletteRef.current = isDark ? PALETTE_DARK : PALETTE_LIGHT;
      draw();
    };
    updatePalette();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "data-theme") {
          updatePalette();
          break;
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    draw();
  }, [title, tone]);

  const rootClassName = className ? `${styles.root} ${className}` : styles.root;

  return (
    <div className={rootClassName}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
    </div>
  );
};

export default WebGLTitleLogo;
