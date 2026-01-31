import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

type CubeLogoProps = {
  size?: number;
  colors?: {
    top: string;
    left: string;
    right: string;
  };
  className?: string;
  style?: CSSProperties;
};

const CubeLogo = ({ 
  size = 32, 
  colors = {
    top: "#00d4ff",
    left: "#8800ff", 
    right: "#ff0099"
  },
  className,
  style
}: CubeLogoProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    const cx = size * 0.5;
    const cy = size * 0.52;
    const s = size * 0.28;

    // Top face
    const top = [
      { x: cx, y: cy - s },
      { x: cx + s, y: cy - s * 0.4 },
      { x: cx, y: cy + s * 0.2 },
      { x: cx - s, y: cy - s * 0.4 },
    ];

    // Left face
    const left = [
      { x: cx - s, y: cy - s * 0.4 },
      { x: cx, y: cy + s * 0.2 },
      { x: cx, y: cy + s * 1.1 },
      { x: cx - s, y: cy + s * 0.5 },
    ];

    // Right face
    const right = [
      { x: cx + s, y: cy - s * 0.4 },
      { x: cx, y: cy + s * 0.2 },
      { x: cx, y: cy + s * 1.1 },
      { x: cx + s, y: cy + s * 0.5 },
    ];

    const drawFace = (points: Array<{ x: number; y: number }>, fill: string) => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    // Draw shadow
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.translate(0, 2);
    drawFace(left, "rgba(0, 0, 0, 0.15)");
    drawFace(right, "rgba(0, 0, 0, 0.15)");
    drawFace(top, "rgba(0, 0, 0, 0.15)");
    ctx.restore();

    // Draw cube
    drawFace(left, colors.left);
    drawFace(right, colors.right);
    drawFace(top, colors.top);
  }, [size, colors]);

  return (
    <canvas 
      ref={canvasRef} 
      className={className}
      style={style}
      aria-hidden="true"
    />
  );
};

export default CubeLogo;
