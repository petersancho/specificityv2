import { useEffect, useRef } from "react";
import { UI_BASE_COLORS, UI_DOMAIN_COLORS } from "../semantic/uiColorTokens";

type WebGLCubeLogoProps = {
  size?: number;
  colors?: {
    top: string;
    left: string;
    right: string;
  };
  className?: string;
  showText?: boolean;
  text?: string;
  textColor?: string;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [0, 0, 0];
};

export function WebGLCubeLogo({
  size = 32,
  colors = {
    top: UI_DOMAIN_COLORS.numeric,
    left: UI_DOMAIN_COLORS.logic,
    right: UI_DOMAIN_COLORS.data,
  },
  className,
  showText = false,
  text = "",
  textColor = UI_BASE_COLORS.ink,
}: WebGLCubeLogoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const displaySize = size;
    const renderSize = displaySize * dpr;

    canvas.width = renderSize;
    canvas.height = renderSize;
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;

    const gl = canvas.getContext("webgl", {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    });

    if (!gl) {
      console.warn("WebGL not supported, falling back to 2D canvas");
      render2DFallback(canvas, displaySize, colors);
      return;
    }

    renderWebGLCube(gl, renderSize, colors);
  }, [size, colors]);

  return (
    <div className={className} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          imageRendering: "crisp-edges",
        }}
      />
      {showText && text && (
        <span
          style={{
            fontFamily: "GFS Didot, Montreal Neue",
            fontSize: `${size * 0.5}px`,
            fontWeight: 600,
            color: textColor,
            letterSpacing: "-0.01em",
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
}

function renderWebGLCube(
  gl: WebGLRenderingContext,
  size: number,
  colors: { top: string; left: string; right: string }
) {
  const vertexShaderSource = `
    attribute vec3 aPosition;
    attribute vec3 aColor;
    varying vec3 vColor;
    uniform mat4 uProjection;
    uniform mat4 uView;
    
    void main() {
      vColor = aColor;
      gl_Position = uProjection * uView * vec4(aPosition, 1.0);
    }
  `;

  const fragmentShaderSource = `
    precision mediump float;
    varying vec3 vColor;
    
    void main() {
      gl_FragColor = vec4(vColor, 1.0);
    }
  `;

  const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.compileShader(vertexShader);

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(fragmentShader);

  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.useProgram(program);

  const topColor = hexToRgb(colors.top);
  const leftColor = hexToRgb(colors.left);
  const rightColor = hexToRgb(colors.right);
  const edgeColor: [number, number, number] = hexToRgb(UI_BASE_COLORS.black);

  const s = 0.5;
  const h = s * 0.866;

  const vertices = new Float32Array([
    0, h, 0, ...topColor,
    -s, 0, 0, ...topColor,
    0, 0, s, ...topColor,
    
    0, h, 0, ...topColor,
    0, 0, s, ...topColor,
    s, 0, 0, ...topColor,
    
    -s, 0, 0, ...leftColor,
    -s, -h, 0, ...leftColor,
    0, -h, s, ...leftColor,
    
    -s, 0, 0, ...leftColor,
    0, -h, s, ...leftColor,
    0, 0, s, ...leftColor,
    
    s, 0, 0, ...rightColor,
    0, 0, s, ...rightColor,
    0, -h, s, ...rightColor,
    
    s, 0, 0, ...rightColor,
    0, -h, s, ...rightColor,
    s, -h, 0, ...rightColor,
    
    0, h, 0, ...edgeColor,
    -s, 0, 0, ...edgeColor,
    
    0, h, 0, ...edgeColor,
    s, 0, 0, ...edgeColor,
    
    -s, 0, 0, ...edgeColor,
    0, 0, s, ...edgeColor,
    
    0, 0, s, ...edgeColor,
    s, 0, 0, ...edgeColor,
    
    -s, 0, 0, ...edgeColor,
    -s, -h, 0, ...edgeColor,
    
    s, 0, 0, ...edgeColor,
    s, -h, 0, ...edgeColor,
    
    0, 0, s, ...edgeColor,
    0, -h, s, ...edgeColor,
    
    -s, -h, 0, ...edgeColor,
    0, -h, s, ...edgeColor,
    
    0, -h, s, ...edgeColor,
    s, -h, 0, ...edgeColor,
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, "aPosition");
  const aColor = gl.getAttribLocation(program, "aColor");

  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 24, 0);

  gl.enableVertexAttribArray(aColor);
  gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 24, 12);

  const uProjection = gl.getUniformLocation(program, "uProjection");
  const uView = gl.getUniformLocation(program, "uView");

  const aspect = 1;
  const fov = Math.PI / 6;
  const near = 0.1;
  const far = 100;
  const f = 1 / Math.tan(fov / 2);

  const projection = new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ]);

  const view = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, -3.5, 1,
  ]);

  gl.uniformMatrix4fv(uProjection, false, projection);
  gl.uniformMatrix4fv(uView, false, view);

  gl.viewport(0, 0, size, size);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.drawArrays(gl.TRIANGLES, 0, 18);
  
  gl.lineWidth(2);
  gl.drawArrays(gl.LINES, 18, 18);
}

function render2DFallback(
  canvas: HTMLCanvasElement,
  size: number,
  colors: { top: string; left: string; right: string }
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = size;
  canvas.height = size;

  const scale = size / 32;
  const cx = size / 2;
  const cy = size / 2;

  const w = 12 * scale;
  const h = w * 0.866;

  ctx.save();
  ctx.translate(cx, cy - h * 0.2);

  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(-w, 0);
  ctx.lineTo(0, h * 0.2);
  ctx.lineTo(w, 0);
  ctx.closePath();
  ctx.fillStyle = colors.top;
  ctx.fill();
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.lineTo(-w, h);
  ctx.lineTo(0, h * 1.2);
  ctx.lineTo(0, h * 0.2);
  ctx.closePath();
  ctx.fillStyle = colors.left;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(0, h * 0.2);
  ctx.lineTo(0, h * 1.2);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = colors.right;
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}
