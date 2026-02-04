import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

export type CubeLogoVariant = "cmyk" | "monochrome" | "custom";

type CubeLogoProps = {
  size?: number;
  variant?: CubeLogoVariant;
  colors?: {
    top: string;
    left: string;
    right: string;
  };
  className?: string;
  style?: CSSProperties;
};

const CMYK_COLORS = {
  top: "#ffdd00",
  left: "#ff0099",
  right: "#00d4ff",
};

const MONOCHROME_COLORS = {
  top: "#b0b0b0",
  left: "#808080",
  right: "#a0a0a0",
};

const resolveColors = (
  variant: CubeLogoVariant,
  customColors?: { top: string; left: string; right: string }
) => {
  if (variant === "custom" && customColors) return customColors;
  if (variant === "cmyk") return CMYK_COLORS;
  return MONOCHROME_COLORS;
};

const CubeLogo = ({
  size = 32,
  variant = "monochrome",
  colors,
  className,
  style,
}: CubeLogoProps) => {
  const resolvedColors = resolveColors(variant, colors);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    ctx.scale(dpr, dpr);

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

    const drawFace = (points: Array<{ x: number; y: number }>, fill: string, strokeWidth = 2) => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
    };

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.translate(0, 3);
    drawFace(left, "rgba(0, 0, 0, 0.12)", 0);
    drawFace(right, "rgba(0, 0, 0, 0.12)", 0);
    drawFace(top, "rgba(0, 0, 0, 0.12)", 0);
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
        ...style
      }}
      aria-hidden="true"
    />
  );
};

export default CubeLogo;
