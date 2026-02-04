import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { UI_DOMAIN_COLORS } from "../semantic/uiColorTokens";

type CubeLogoProps = {
  size?: number;
  variant?: "mono" | "cmyk";
  colors?: {
    top: string;
    left: string;
    right: string;
  };
  className?: string;
  style?: CSSProperties;
};

type RGB = [number, number, number];

type CubeColors = {
  top: string;
  left: string;
  right: string;
  stroke: string;
  shadow: string;
};

const CMYK_COLORS = {
  top: UI_DOMAIN_COLORS.numeric,
  left: UI_DOMAIN_COLORS.logic,
  right: UI_DOMAIN_COLORS.data,
};

let parseCanvas: HTMLCanvasElement | null = null;
let parseCtx: CanvasRenderingContext2D | null = null;

const ensureParseContext = () => {
  if (parseCtx) return parseCtx;
  if (typeof document === "undefined") return null;
  parseCanvas = document.createElement("canvas");
  parseCanvas.width = 2;
  parseCanvas.height = 2;
  parseCtx = parseCanvas.getContext("2d", { willReadFrequently: true });
  return parseCtx;
};

const parseCssColor = (value: string | undefined, fallback: RGB): RGB => {
  if (!value) return fallback;
  const ctx = ensureParseContext();
  if (!ctx) return fallback;
  ctx.clearRect(0, 0, 2, 2);
  ctx.fillStyle = "#000";
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  return [data[0] / 255, data[1] / 255, data[2] / 255];
};

const rgbToCss = (rgb: RGB, alpha = 1) => {
  const r = Math.round(Math.max(0, Math.min(1, rgb[0])) * 255);
  const g = Math.round(Math.max(0, Math.min(1, rgb[1])) * 255);
  const b = Math.round(Math.max(0, Math.min(1, rgb[2])) * 255);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
};

const mixRgb = (a: RGB, b: RGB, t: number): RGB => {
  const amount = Math.max(0, Math.min(1, t));
  return [
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
  ];
};

const luma = (rgb: RGB) => rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;

const readCssVar = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

const resolveMonochromeColors = (): CubeColors => {
  const inkCss = readCssVar("--ui-ink", "#000000");
  const surfaceCss = readCssVar("--ui-white", "#ffffff");
  const ink = parseCssColor(inkCss, [0, 0, 0]);
  const surface = parseCssColor(surfaceCss, [1, 1, 1]);
  const inkIsLight = luma(ink) > luma(surface);
  const light = inkIsLight ? ink : surface;
  const dark = inkIsLight ? surface : ink;

  const top = mixRgb(light, dark, 0.3);
  const left = mixRgb(light, dark, 0.52);
  const right = mixRgb(light, dark, 0.72);

  return {
    top: rgbToCss(top),
    left: rgbToCss(left),
    right: rgbToCss(right),
    stroke: rgbToCss(ink),
    shadow: rgbToCss(dark, 0.16),
  };
};

const resolveColorSet = (variant: CubeLogoProps["variant"], colors?: CubeLogoProps["colors"]): CubeColors => {
  if (colors) {
    return {
      top: colors.top,
      left: colors.left,
      right: colors.right,
      stroke: readCssVar("--ui-ink", "#000000"),
      shadow: rgbToCss(parseCssColor(readCssVar("--ui-black", "#000000"), [0, 0, 0]), 0.12),
    };
  }

  if (variant === "cmyk") {
    const stroke = readCssVar("--ui-ink", "#000000");
    const shadow = rgbToCss(parseCssColor(readCssVar("--ui-black", "#000000"), [0, 0, 0]), 0.12);
    return {
      top: CMYK_COLORS.top,
      left: CMYK_COLORS.left,
      right: CMYK_COLORS.right,
      stroke,
      shadow,
    };
  }

  return resolveMonochromeColors();
};

const CubeLogo = ({
  size = 32,
  variant = "mono",
  colors,
  className,
  style,
}: CubeLogoProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [themeKey, setThemeKey] = useState(() =>
    typeof document === "undefined" ? "light" : document.documentElement.dataset.theme ?? "light"
  );

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const observer = new MutationObserver(() => {
      setThemeKey(document.documentElement.dataset.theme ?? "light");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const resolvedColors = useMemo(
    () => resolveColorSet(variant, colors),
    [variant, colors, themeKey]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const cx = size * 0.5;
    const cy = size * 0.52;
    const s = size * 0.28;

    const top = [
      { x: cx, y: cy - s },
      { x: cx + s, y: cy - s * 0.4 },
      { x: cx, y: cy + s * 0.2 },
      { x: cx - s, y: cy - s * 0.4 },
    ];

    const left = [
      { x: cx - s, y: cy - s * 0.4 },
      { x: cx, y: cy + s * 0.2 },
      { x: cx, y: cy + s * 1.1 },
      { x: cx - s, y: cy + s * 0.5 },
    ];

    const right = [
      { x: cx + s, y: cy - s * 0.4 },
      { x: cx, y: cy + s * 0.2 },
      { x: cx, y: cy + s * 1.1 },
      { x: cx + s, y: cy + s * 0.5 },
    ];

    const drawFace = (
      points: Array<{ x: number; y: number }>,
      fill: string,
      strokeWidth = 2
    ) => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (strokeWidth > 0) {
        ctx.strokeStyle = resolvedColors.stroke;
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
      }
    };

    ctx.save();
    ctx.translate(0, 3);
    drawFace(left, resolvedColors.shadow, 0);
    drawFace(right, resolvedColors.shadow, 0);
    drawFace(top, resolvedColors.shadow, 0);
    ctx.restore();

    drawFace(left, resolvedColors.left);
    drawFace(right, resolvedColors.right);
    drawFace(top, resolvedColors.top);
  }, [size, resolvedColors]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        imageRendering: "crisp-edges",
        ...style,
      }}
      aria-hidden="true"
    />
  );
};

export default CubeLogo;
