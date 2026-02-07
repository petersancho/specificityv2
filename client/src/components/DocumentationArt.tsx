import { useCallback, useEffect, useMemo, useRef } from "react";
import { WebGLUIRenderer, type RGBA } from "../webgl/ui/WebGLUIRenderer";
import { WebGLTextRenderer } from "../webgl/ui/WebGLTextRenderer";
import {
  PORT_TYPE_COLOR,
  type NodeCategory,
  type WorkflowParameterSpec,
  type WorkflowPortSpec,
} from "./workflow/nodeCatalog";
import styles from "./DocumentationArt.module.css";

type DrawContext = {
  gl: WebGLRenderingContext;
  ui: WebGLUIRenderer;
  text: WebGLTextRenderer;
  width: number;
  height: number;
  dpr: number;
};

type DocumentationCanvasProps = {
  className?: string;
  draw: (context: DrawContext) => void;
  transparent?: boolean;
};

const MAX_DPR = 3;

const DocumentationCanvas = ({ className, draw, transparent }: DocumentationCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const uiRef = useRef<WebGLUIRenderer | null>(null);
  const textRef = useRef<WebGLTextRenderer | null>(null);

  const drawFrame = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const gl = glRef.current;
    const ui = uiRef.current;
    const text = textRef.current;
    if (!container || !canvas || !gl || !ui || !text) return;

    const rect = container.getBoundingClientRect();
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, transparent ? 0 : 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    draw({ gl, ui, text, width, height, dpr });
  }, [draw, transparent]);

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
    drawFrame();

    return () => {
      const currentGl = glRef.current;
      if (currentGl) {
        currentGl.getExtension("WEBGL_lose_context")?.loseContext();
      }
      glRef.current = null;
      uiRef.current = null;
      textRef.current = null;
    };
  }, []);

  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(drawFrame);
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawFrame]);

  const frameClassName = [
    styles.frame,
    transparent ? styles.frameTransparent : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={containerRef} className={frameClassName}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
    </div>
  );
};

const rgb = (r: number, g: number, b: number, a = 1): RGBA => [
  r / 255,
  g / 255,
  b / 255,
  a,
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const mix = (a: RGBA, b: RGBA, t: number): RGBA => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
  a[3] + (b[3] - a[3]) * t,
];

const withAlpha = (color: RGBA, alpha: number): RGBA => [
  color[0],
  color[1],
  color[2],
  alpha,
];

const parseHexColor = (value: string, alpha = 1): RGBA => {
  const normalized = value.replace("#", "");
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return rgb(r, g, b, alpha);
  }
  if (normalized.length === 6) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return rgb(r, g, b, alpha);
  }
  return rgb(255, 255, 255, alpha);
};

const WHITE = rgb(255, 255, 255, 1);
const INK = rgb(18, 16, 12, 0.92);
const SHADOW = rgb(0, 0, 0, 0.85);
const PORCELAIN = rgb(250, 248, 244, 1);
const PORCELAIN_SOFT = rgb(244, 241, 236, 1);
const CYAN = rgb(11, 138, 151, 1);
const PURPLE = rgb(81, 50, 194, 0.9);
const ORANGE = rgb(204, 91, 26, 0.95);

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const createRng = (seed: number) => {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const drawRect = (
  ui: WebGLUIRenderer,
  scale: number,
  x: number,
  y: number,
  width: number,
  height: number,
  color: RGBA
) => {
  ui.drawRect(x * scale, y * scale, width * scale, height * scale, color);
};

const drawRoundedRect = (
  ui: WebGLUIRenderer,
  scale: number,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: RGBA
) => {
  ui.drawRoundedRect(
    x * scale,
    y * scale,
    width * scale,
    height * scale,
    radius * scale,
    color
  );
};

const drawLine = (
  ui: WebGLUIRenderer,
  scale: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness: number,
  color: RGBA
) => {
  ui.drawLine(x1 * scale, y1 * scale, x2 * scale, y2 * scale, thickness * scale, color);
};

const drawCircle = (
  ui: WebGLUIRenderer,
  scale: number,
  cx: number,
  cy: number,
  radius: number,
  thickness: number,
  color: RGBA
) => {
  ui.drawCircle(cx * scale, cy * scale, radius * scale, thickness * scale, color);
};

const drawFilledCircle = (
  ui: WebGLUIRenderer,
  scale: number,
  cx: number,
  cy: number,
  radius: number,
  color: RGBA
) => {
  ui.drawFilledCircle(cx * scale, cy * scale, radius * scale, color);
};

const drawRoundedPanel = (
  ui: WebGLUIRenderer,
  scale: number,
  rect: { x: number; y: number; width: number; height: number },
  radius: number,
  fill: RGBA,
  border: RGBA,
  shadowOffset: number
) => {
  drawRoundedRect(
    ui,
    scale,
    rect.x + shadowOffset,
    rect.y + shadowOffset,
    rect.width,
    rect.height,
    radius,
    SHADOW
  );
  drawRoundedRect(ui, scale, rect.x, rect.y, rect.width, rect.height, radius, border);
  drawRoundedRect(
    ui,
    scale,
    rect.x + 1,
    rect.y + 1,
    rect.width - 2,
    rect.height - 2,
    Math.max(0, radius - 1),
    fill
  );
  drawRoundedRect(
    ui,
    scale,
    rect.x + 1,
    rect.y + 1,
    rect.width - 2,
    rect.height * 0.42,
    Math.max(0, radius - 1),
    withAlpha(WHITE, 0.35)
  );
};

const drawSoftBackdrop = (
  ui: WebGLUIRenderer,
  scale: number,
  width: number,
  height: number
) => {
  drawRect(ui, scale, 0, 0, width, height, PORCELAIN);
  drawFilledCircle(ui, scale, width * 0.2, height * 0.25, width * 0.22, withAlpha(ORANGE, 0.08));
  drawFilledCircle(ui, scale, width * 0.82, height * 0.2, width * 0.2, withAlpha(CYAN, 0.08));
  drawFilledCircle(ui, scale, width * 0.65, height * 0.75, width * 0.28, withAlpha(PURPLE, 0.06));
};

const drawPolyline = (
  ui: WebGLUIRenderer,
  scale: number,
  points: Array<{ x: number; y: number }>,
  thickness: number,
  color: RGBA
) => {
  for (let i = 0; i < points.length - 1; i += 1) {
    drawLine(
      ui,
      scale,
      points[i].x,
      points[i].y,
      points[i + 1].x,
      points[i + 1].y,
      thickness,
      color
    );
  }
};

const drawBezier = (
  ui: WebGLUIRenderer,
  scale: number,
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
  thickness: number,
  color: RGBA,
  segments = 18
) => {
  let prev = start;
  for (let i = 1; i <= segments; i += 1) {
    const t = i / segments;
    const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * control.x + t * t * end.x;
    const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * control.y + t * t * end.y;
    drawLine(ui, scale, prev.x, prev.y, x, y, thickness, color);
    prev = { x, y };
  }
};

const drawArrow = (
  ui: WebGLUIRenderer,
  scale: number,
  start: { x: number; y: number },
  end: { x: number; y: number },
  thickness: number,
  color: RGBA
) => {
  drawLine(ui, scale, start.x, start.y, end.x, end.y, thickness, color);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = 8 + thickness * 1.2;
  const left = {
    x: end.x - Math.cos(angle - Math.PI / 6) * headLength,
    y: end.y - Math.sin(angle - Math.PI / 6) * headLength,
  };
  const right = {
    x: end.x - Math.cos(angle + Math.PI / 6) * headLength,
    y: end.y - Math.sin(angle + Math.PI / 6) * headLength,
  };
  drawLine(ui, scale, end.x, end.y, left.x, left.y, thickness, color);
  drawLine(ui, scale, end.x, end.y, right.x, right.y, thickness, color);
};

const drawCardLabel = (
  text: WebGLTextRenderer,
  label: string,
  x: number,
  y: number,
  size: number,
  dpr: number,
  resolution: { width: number; height: number }
) => {
  text.setText(label, {
    fontSize: size * dpr,
    fontWeight: 700,
    fontFamily: '"GFS Didot", "Montreal Neue"',
    paddingX: 0,
    paddingY: 0,
    color: "#ffffff",
  });
  text.draw(x * dpr, y * dpr, resolution, INK);
};

const ROSLYN_VARIANTS_BY_ID: Record<string, string> = {
  point: "point",
  line: "line",
  polyline: "polyline",
  rectangle: "rectangle",
  circle: "circle",
  arc: "arc",
  curve: "curve",
  interpolate: "curve",
  loft: "loft",
  surface: "surface",
  extrude: "extrude",
  offset: "offset",
  boolean: "boolean",
  mirror: "mirror",
  array: "array",
  move: "move",
  rotate: "rotate",
  scale: "scale",
  gumball: "gumball",
  pivot: "pivot",
  copy: "copy",
  paste: "copy",
  duplicate: "copy",
  delete: "delete",
  undo: "undo",
  redo: "undo",
  focus: "frame",
  frameall: "frame",
  view: "view",
  camera: "view",
  orbit: "view",
  cancel: "edit",
  confirm: "edit",
};

const resolveRoslynVariant = (
  commandId: string,
  label: string,
  description: string,
  prompt: string,
  category?: string
) => {
  const key = commandId.toLowerCase();
  if (ROSLYN_VARIANTS_BY_ID[key]) return ROSLYN_VARIANTS_BY_ID[key];
  const text = `${label} ${description} ${prompt}`.toLowerCase();
  const match = (words: string[]) => words.some((word) => text.includes(word));
  if (match(["line", "segment"])) return "line";
  if (match(["polyline"])) return "polyline";
  if (match(["curve", "spline", "nurbs"])) return "curve";
  if (match(["arc"])) return "arc";
  if (match(["circle", "radius"])) return "circle";
  if (match(["rectangle", "box"])) return "rectangle";
  if (match(["loft"])) return "loft";
  if (match(["extrude"])) return "extrude";
  if (match(["mirror"])) return "mirror";
  if (match(["array", "grid"])) return "array";
  if (match(["rotate"])) return "rotate";
  if (match(["scale"])) return "scale";
  if (match(["move", "translate"])) return "move";
  if (match(["boolean"])) return "boolean";
  if (match(["offset"])) return "offset";
  if (match(["frame", "focus", "view"])) return "frame";
  if (category === "view") return "view";
  return "generic";
};

const resolveRoslynTriptych = (
  commandId: string,
  label: string,
  description: string,
  prompt: string,
  category?: string
) => {
  const operation = resolveRoslynVariant(commandId, label, description, prompt, category);
  const rng = createRng(hashString(`${commandId}-${label}-triptych`));
  const pick = (options: string[], fallback: string) => {
    if (options.length === 0) return fallback;
    const index = Math.floor(rng() * options.length);
    return options[index] ?? fallback;
  };

  const inputOptions: Record<string, string[]> = {
    point: ["point"],
    line: ["point"],
    polyline: ["point", "line"],
    curve: ["point", "polyline"],
    arc: ["point", "line"],
    circle: ["point", "line"],
    rectangle: ["point", "line"],
    surface: ["curve"],
    loft: ["curve"],
    extrude: ["curve", "rectangle"],
    boolean: ["surface", "extrude"],
    mirror: ["surface", "curve"],
    array: ["surface", "curve"],
    move: ["surface", "curve"],
    rotate: ["surface", "curve"],
    scale: ["surface", "curve"],
    offset: ["curve", "polyline"],
    gumball: ["surface"],
    pivot: ["point"],
    copy: ["surface", "curve"],
    delete: ["surface"],
    undo: ["surface"],
    frame: ["surface"],
    view: ["surface"],
    generic: ["surface", "curve"],
  };

  const outputOptions: Record<string, string[]> = {
    point: ["point"],
    line: ["line"],
    polyline: ["polyline"],
    curve: ["curve"],
    arc: ["arc"],
    circle: ["circle"],
    rectangle: ["rectangle"],
    surface: ["surface"],
    loft: ["surface"],
    extrude: ["surface"],
    boolean: ["surface"],
    mirror: ["surface"],
    array: ["surface"],
    move: ["surface"],
    rotate: ["surface"],
    scale: ["surface"],
    offset: ["curve"],
    gumball: ["surface"],
    pivot: ["point"],
    copy: ["surface"],
    delete: ["frame"],
    undo: ["surface"],
    frame: ["frame"],
    view: ["frame"],
    generic: ["surface"],
  };

  const inputVariant = pick(inputOptions[operation] ?? [], "point");
  const outputVariant = pick(outputOptions[operation] ?? [], operation);

  return [inputVariant, operation, outputVariant] as const;
};

type RoslynStroke = {
  accent: RGBA;
  secondary: RGBA;
  highlight: RGBA;
};

const drawRoslynGlyph = (
  ui: WebGLUIRenderer,
  scale: number,
  rect: { x: number; y: number; width: number; height: number },
  variant: string,
  progress: number,
  colors: RoslynStroke,
  rng: () => number
) => {
  const inset = rect.width * 0.12;
  const left = rect.x + inset;
  const right = rect.x + rect.width - inset;
  const top = rect.y + rect.height * 0.25;
  const bottom = rect.y + rect.height * 0.78;
  const centerX = rect.x + rect.width * 0.5;
  const centerY = rect.y + rect.height * 0.55;
  const stroke = Math.max(2, rect.width * 0.03);

  if (variant === "point") {
    const spread = rect.width * 0.18;
    drawLine(ui, scale, centerX - spread, centerY, centerX + spread, centerY, stroke * 0.8, colors.accent);
    drawLine(ui, scale, centerX, centerY - spread, centerX, centerY + spread, stroke * 0.8, colors.accent);
    drawFilledCircle(ui, scale, centerX + spread * 0.4, centerY + spread * 0.2, stroke * 0.9, colors.highlight);
    return;
  }

  if (variant === "line") {
    const x1 = left + rect.width * 0.1;
    const y1 = bottom - rect.height * 0.1;
    const x2 = right - rect.width * 0.05;
    const y2 = top + rect.height * 0.1;
    const t = progress;
    drawLine(ui, scale, x1, y1, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, stroke, colors.accent);
    drawFilledCircle(ui, scale, x1, y1, stroke * 0.9, colors.highlight);
    drawFilledCircle(ui, scale, x2, y2, stroke * 0.9, colors.secondary);
    return;
  }

  if (variant === "polyline") {
    const pivot = rect.width * (0.26 + rng() * 0.08);
    drawPolyline(
      ui,
      scale,
      [
        { x: left, y: bottom },
        { x: centerX - pivot * 0.4, y: centerY - rect.height * 0.2 },
        { x: centerX + pivot * 0.4, y: centerY + rect.height * 0.05 },
        { x: right, y: top + rect.height * 0.12 },
      ],
      stroke,
      colors.accent
    );
    return;
  }

  if (variant === "curve") {
    drawBezier(
      ui,
      scale,
      { x: left, y: bottom },
      { x: centerX, y: top },
      { x: right, y: bottom - rect.height * 0.1 },
      stroke,
      colors.accent
    );
    drawFilledCircle(ui, scale, left, bottom, stroke * 0.8, colors.secondary);
    drawFilledCircle(ui, scale, right, bottom - rect.height * 0.1, stroke * 0.8, colors.secondary);
    return;
  }

  if (variant === "arc") {
    const radius = rect.width * 0.25;
    drawCircle(ui, scale, centerX, centerY, radius, stroke, colors.accent);
    drawLine(ui, scale, centerX, centerY, centerX + radius, centerY - radius * 0.4, stroke * 0.8, colors.secondary);
    return;
  }

  if (variant === "circle") {
    const radius = rect.width * 0.26;
    const end = progress * Math.PI * 2;
    const segments = Math.max(8, Math.floor(16 * progress));
    let prev = { x: centerX + radius, y: centerY };
    for (let i = 1; i <= segments; i += 1) {
      const theta = (i / segments) * end;
      const next = { x: centerX + Math.cos(theta) * radius, y: centerY + Math.sin(theta) * radius };
      drawLine(ui, scale, prev.x, prev.y, next.x, next.y, stroke, colors.accent);
      prev = next;
    }
    drawFilledCircle(ui, scale, centerX, centerY, stroke * 0.8, colors.secondary);
    return;
  }

  if (variant === "rectangle") {
    const width = rect.width * 0.48;
    const height = rect.height * 0.34;
    const x = centerX - width / 2;
    const y = centerY - height / 2;
    const drawAmount = clamp(progress, 0.2, 1);
    drawRoundedRect(ui, scale, x, y, width * drawAmount, height, 10, colors.accent);
    return;
  }

  if (variant === "surface" || variant === "loft") {
    const span = rect.width * 0.6;
    drawBezier(
      ui,
      scale,
      { x: centerX - span * 0.45, y: centerY - rect.height * 0.18 },
      { x: centerX, y: centerY - rect.height * 0.35 },
      { x: centerX + span * 0.45, y: centerY - rect.height * 0.18 },
      stroke,
      colors.accent
    );
    drawBezier(
      ui,
      scale,
      { x: centerX - span * 0.5, y: centerY + rect.height * 0.2 },
      { x: centerX, y: centerY + rect.height * 0.38 },
      { x: centerX + span * 0.5, y: centerY + rect.height * 0.2 },
      stroke,
      colors.secondary
    );
    for (let i = -2; i <= 2; i += 1) {
      const x = centerX + (i * span) / 5;
      drawLine(ui, scale, x, centerY - rect.height * 0.1, x, centerY + rect.height * 0.18, 1.6, colors.highlight);
    }
    return;
  }

  if (variant === "extrude") {
    const width = rect.width * 0.34;
    const height = rect.height * 0.26;
    const x = centerX - width / 2;
    const y = centerY - height / 2;
    drawRoundedRect(ui, scale, x, y, width, height, 8, colors.accent);
    drawRoundedRect(ui, scale, x + width * 0.18, y - height * 0.35, width, height, 8, colors.secondary);
    drawLine(ui, scale, x, y, x + width * 0.18, y - height * 0.35, 2, colors.highlight);
    drawLine(ui, scale, x + width, y, x + width * 1.18, y - height * 0.35, 2, colors.highlight);
    drawLine(ui, scale, x, y + height, x + width * 0.18, y + height - height * 0.35, 2, colors.highlight);
    return;
  }

  if (variant === "boolean") {
    drawRoundedRect(ui, scale, centerX - rect.width * 0.25, centerY - rect.height * 0.1, rect.width * 0.32, rect.height * 0.22, 12, colors.accent);
    drawRoundedRect(ui, scale, centerX - rect.width * 0.05, centerY - rect.height * 0.2, rect.width * 0.32, rect.height * 0.22, 12, colors.secondary);
    drawRoundedRect(ui, scale, centerX - rect.width * 0.1, centerY - rect.height * 0.12, rect.width * 0.22, rect.height * 0.16, 10, colors.highlight);
    return;
  }

  if (variant === "mirror") {
    drawLine(ui, scale, centerX, top, centerX, bottom, 2.6, colors.secondary);
    drawRoundedRect(ui, scale, centerX - rect.width * 0.28, centerY - rect.height * 0.12, rect.width * 0.2, rect.height * 0.18, 8, colors.accent);
    drawRoundedRect(ui, scale, centerX + rect.width * 0.08, centerY - rect.height * 0.12, rect.width * 0.2, rect.height * 0.18, 8, colors.highlight);
    return;
  }

  if (variant === "array") {
    const baseX = centerX - rect.width * 0.28;
    const baseY = centerY - rect.height * 0.16;
    for (let i = 0; i < 5; i += 1) {
      drawRoundedRect(
        ui,
        scale,
        baseX + i * rect.width * 0.12,
        baseY + i * rect.height * 0.08,
        rect.width * 0.16,
        rect.height * 0.2,
        8,
        i % 2 === 0 ? colors.accent : colors.secondary
      );
    }
    return;
  }

  if (variant === "move") {
    drawRoundedRect(ui, scale, centerX - rect.width * 0.18, centerY - rect.height * 0.12, rect.width * 0.28, rect.height * 0.2, 10, colors.accent);
    drawArrow(ui, scale, { x: centerX - rect.width * 0.25, y: centerY + rect.height * 0.22 }, { x: centerX + rect.width * 0.3, y: centerY - rect.height * 0.2 }, 2.6, colors.highlight);
    return;
  }

  if (variant === "rotate") {
    drawCircle(ui, scale, centerX, centerY, rect.width * 0.22, 3, colors.accent);
    drawArrow(ui, scale, { x: centerX + rect.width * 0.22, y: centerY }, { x: centerX + rect.width * 0.1, y: centerY - rect.height * 0.18 }, 2.4, colors.secondary);
    return;
  }

  if (variant === "scale") {
    drawRoundedRect(ui, scale, centerX - rect.width * 0.2, centerY - rect.height * 0.18, rect.width * 0.3, rect.height * 0.26, 10, colors.accent);
    drawArrow(ui, scale, { x: centerX + rect.width * 0.14, y: centerY - rect.height * 0.02 }, { x: centerX + rect.width * 0.34, y: centerY - rect.height * 0.22 }, 2.4, colors.highlight);
    return;
  }

  if (variant === "offset") {
    drawPolyline(
      ui,
      scale,
      [
        { x: left, y: bottom - rect.height * 0.1 },
        { x: centerX - rect.width * 0.12, y: top + rect.height * 0.08 },
        { x: right - rect.width * 0.05, y: bottom - rect.height * 0.2 },
      ],
      stroke,
      colors.accent
    );
    drawPolyline(
      ui,
      scale,
      [
        { x: left + rect.width * 0.06, y: bottom - rect.height * 0.18 },
        { x: centerX - rect.width * 0.04, y: top + rect.height * 0.16 },
        { x: right, y: bottom - rect.height * 0.28 },
      ],
      stroke,
      colors.secondary
    );
    return;
  }

  if (variant === "gumball" || variant === "pivot") {
    drawLine(ui, scale, centerX - rect.width * 0.2, centerY, centerX + rect.width * 0.2, centerY, 2.6, colors.accent);
    drawLine(ui, scale, centerX, centerY - rect.height * 0.2, centerX, centerY + rect.height * 0.2, 2.6, colors.secondary);
    drawFilledCircle(ui, scale, centerX, centerY, stroke, colors.highlight);
    return;
  }

  if (variant === "copy") {
    drawRoundedRect(ui, scale, centerX - rect.width * 0.18, centerY - rect.height * 0.12, rect.width * 0.24, rect.height * 0.2, 8, colors.secondary);
    drawRoundedRect(ui, scale, centerX - rect.width * 0.05, centerY - rect.height * 0.02, rect.width * 0.24, rect.height * 0.2, 8, colors.accent);
    return;
  }

  if (variant === "delete") {
    drawRoundedRect(ui, scale, centerX - rect.width * 0.2, centerY - rect.height * 0.1, rect.width * 0.3, rect.height * 0.2, 10, colors.secondary);
    drawLine(ui, scale, centerX - rect.width * 0.22, centerY - rect.height * 0.2, centerX + rect.width * 0.22, centerY + rect.height * 0.2, 3, colors.accent);
    drawLine(ui, scale, centerX - rect.width * 0.22, centerY + rect.height * 0.2, centerX + rect.width * 0.22, centerY - rect.height * 0.2, 3, colors.accent);
    return;
  }

  if (variant === "undo") {
    drawBezier(
      ui,
      scale,
      { x: centerX + rect.width * 0.18, y: centerY + rect.height * 0.1 },
      { x: centerX, y: centerY - rect.height * 0.2 },
      { x: centerX - rect.width * 0.18, y: centerY + rect.height * 0.1 },
      3,
      colors.accent
    );
    drawArrow(ui, scale, { x: centerX - rect.width * 0.18, y: centerY + rect.height * 0.1 }, { x: centerX - rect.width * 0.3, y: centerY - rect.height * 0.05 }, 2.4, colors.secondary);
    return;
  }

  if (variant === "frame" || variant === "view") {
    const frameX = rect.x + rect.width * 0.22;
    const frameY = rect.y + rect.height * 0.28;
    const frameW = rect.width * 0.55;
    const frameH = rect.height * 0.42;
    drawRect(ui, scale, frameX, frameY, frameW, 2, colors.accent);
    drawRect(ui, scale, frameX, frameY + frameH - 2, frameW, 2, colors.accent);
    drawRect(ui, scale, frameX, frameY, 2, frameH, colors.accent);
    drawRect(ui, scale, frameX + frameW - 2, frameY, 2, frameH, colors.accent);
    drawLine(ui, scale, frameX, frameY, frameX + frameW, frameY + frameH, 2, colors.secondary);
    drawLine(ui, scale, frameX, frameY + frameH, frameX + frameW, frameY, 2, colors.secondary);
    return;
  }

  drawPolyline(
    ui,
    scale,
    [
      { x: left, y: centerY + rect.height * 0.12 },
      { x: centerX, y: centerY - rect.height * 0.18 },
      { x: right, y: centerY + rect.height * 0.12 },
    ],
    stroke,
    colors.accent
  );
};

const drawRoslynPanel = (
  context: DrawContext,
  variant: string,
  caption: string,
  accent: RGBA,
  seed: number,
  glyphLabel: string
) => {
  const { ui, text, width, height, dpr } = context;
  const scale = dpr;
  const rng = createRng(seed);

  const cardWidth = width * 0.7;
  const cardHeight = height * 0.58;
  const top = height * 0.22;
  const left = width * 0.15;
  const radius = Math.min(20, cardWidth * 0.12);
  const border = mix(INK, WHITE, 0.7);
  const fill = PORCELAIN_SOFT;
  const secondary = mix(accent, CYAN, 0.4);
  const highlight = mix(accent, WHITE, 0.3);

  ui.begin(width * dpr, height * dpr);
  drawSoftBackdrop(ui, scale, width, height);

  const gridCount = 6;
  const gridAlpha = 0.04 + (seed % 7) * 0.004;
  for (let i = 0; i < gridCount; i += 1) {
    const x = width * (0.12 + (i / gridCount) * 0.76);
    drawLine(ui, scale, x, height * 0.12, x, height * 0.88, 1, withAlpha(INK, gridAlpha));
  }

  const card = { x: left, y: top, width: cardWidth, height: cardHeight };
  drawRoundedPanel(ui, scale, card, radius, fill, border, 6);
  drawRoslynGlyph(
    ui,
    scale,
    card,
    variant,
    0.85,
    { accent, secondary, highlight },
    rng
  );

  ui.flush();

  const resolution = { width: width * dpr, height: height * dpr };
  drawCardLabel(text, caption, card.x, top + cardHeight + 12, 12, dpr, resolution);
};

type RoslynCommandArtProps = {
  commandId: string;
  label: string;
  description: string;
  prompt: string;
  accent?: string;
  category?: string;
  stage?: "input" | "operation" | "output";
};

export const RoslynCommandArt = ({
  commandId,
  label,
  description,
  prompt,
  accent = "#cc5b1a",
  category,
  stage = "operation",
}: RoslynCommandArtProps) => {
  const seed = useMemo(() => hashString(`${commandId}-${label}`), [commandId, label]);
  const triptych = useMemo(
    () => resolveRoslynTriptych(commandId, label, description, prompt, category),
    [commandId, label, description, prompt, category]
  );
  const accentColor = useMemo(() => parseHexColor(accent, 1), [accent]);
  const stageIndex = stage === "input" ? 0 : stage === "output" ? 2 : 1;
  const variant = triptych[stageIndex] ?? triptych[1];
  const caption = stage === "operation" ? label : stage === "input" ? "Input" : "Result";
  const draw = useCallback(
    (context: DrawContext) => {
      drawRoslynPanel(context, variant, caption, accentColor, seed, label);
    },
    [variant, caption, accentColor, seed, label]
  );

  return <DocumentationCanvas className={styles.roslynFrame} draw={draw} />;
};

type NumericaNodeArtProps = {
  label: string;
  category?: NodeCategory;
  inputs: WorkflowPortSpec[];
  outputs: WorkflowPortSpec[];
  parameters: WorkflowParameterSpec[];
  nodeType: string;
  stage?: "input" | "operation" | "output";
};

const drawParameterChip = (
  ui: WebGLUIRenderer,
  scale: number,
  rect: { x: number; y: number; width: number; height: number },
  color: RGBA
) => {
  drawRoundedRect(ui, scale, rect.x, rect.y, rect.width, rect.height, rect.height / 2, color);
};

const resolveParameterColor = (parameter: WorkflowParameterSpec) => {
  switch (parameter.type) {
    case "slider":
    case "number":
      return mix(ORANGE, WHITE, 0.35);
    case "boolean":
      return mix(CYAN, WHITE, 0.35);
    case "color":
      return mix(PURPLE, WHITE, 0.25);
    case "select":
      return mix(INK, WHITE, 0.7);
    default:
      return mix(PORCELAIN, INK, 0.1);
  }
};

const drawNode = (
  context: DrawContext,
  rect: { x: number; y: number; width: number; height: number },
  label: string,
  accent: RGBA,
  band: RGBA,
  portColors: RGBA[],
  parameters: WorkflowParameterSpec[]
) => {
  const { ui, text, dpr, width, height } = context;
  const scale = dpr;
  const radius = Math.min(16, rect.height * 0.15);
  const border = mix(INK, WHITE, 0.7);

  drawRoundedPanel(ui, scale, rect, radius, PORCELAIN, border, 6);
  drawRoundedRect(
    ui,
    scale,
    rect.x + 1,
    rect.y + 1,
    rect.width - 2,
    rect.height * 0.22,
    Math.max(6, radius - 2),
    band
  );

  const resolution = { width: width * dpr, height: height * dpr };
  text.setText(label, {
    fontSize: 12 * dpr,
    fontWeight: 700,
    fontFamily: '"GFS Didot", "Montreal Neue"',
    paddingX: 0,
    paddingY: 0,
    color: "#ffffff",
  });
  text.draw((rect.x + 14) * dpr, (rect.y + rect.height * 0.28) * dpr, resolution, INK);

  const portRadius = Math.max(3.2, rect.width * 0.02);
  const portCount = portColors.length;
  const portAreaTop = rect.y + rect.height * 0.5;
  const portAreaHeight = rect.height * 0.38;

  for (let i = 0; i < portCount; i += 1) {
    const y = portAreaTop + (i / Math.max(1, portCount - 1)) * portAreaHeight;
    const color = portColors[i];
    drawFilledCircle(ui, scale, rect.x + rect.width * 0.08, y, portRadius, color);
    drawFilledCircle(ui, scale, rect.x + rect.width * 0.92, y, portRadius, color);
    drawLine(ui, scale, rect.x + rect.width * 0.08, y, rect.x + rect.width * 0.22, y, 2, color);
    drawLine(ui, scale, rect.x + rect.width * 0.78, y, rect.x + rect.width * 0.92, y, 2, color);
  }

  const chips = parameters.slice(0, 3);
  chips.forEach((parameter, index) => {
    const chipWidth = rect.width * 0.26;
    const chipHeight = rect.height * 0.08;
    const chipX = rect.x + rect.width * 0.32 + (index % 2) * rect.width * 0.3;
    const chipY = rect.y + rect.height * (0.52 + index * 0.1);
    drawParameterChip(
      ui,
      scale,
      { x: chipX, y: chipY, width: chipWidth, height: chipHeight },
      resolveParameterColor(parameter)
    );
  });
};

const drawWire = (
  ui: WebGLUIRenderer,
  scale: number,
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: RGBA
) => {
  const midX = (start.x + end.x) / 2;
  drawBezier(ui, scale, start, { x: midX, y: start.y }, end, 2.4, color, 20);
};

export const NumericaNodeArt = ({
  label,
  category,
  inputs,
  outputs,
  parameters,
  nodeType,
  stage = "operation",
}: NumericaNodeArtProps) => {
  const accent = useMemo(
    () => parseHexColor(category?.accent ?? "#dc2626", 0.9),
    [category]
  );
  const band = useMemo(
    () => parseHexColor(category?.band ?? "#dedaf2", 1),
    [category]
  );

  const portColors = useMemo(() => {
    const ports = [...inputs, ...outputs];
    const limited = ports.slice(0, Math.max(2, Math.min(4, ports.length)));
    if (limited.length === 0) {
      return [mix(accent, WHITE, 0.35), mix(accent, WHITE, 0.2)];
    }
    return limited.map((port) => parseHexColor(PORT_TYPE_COLOR[port.type] ?? "#94a3b8", 1));
  }, [inputs, outputs, accent]);

  const seed = useMemo(() => hashString(nodeType), [nodeType]);

  const draw = useCallback(
    (context: DrawContext) => {
      const { ui, text, width, height, dpr } = context;
      const scale = dpr;
      const rng = createRng(seed);
      ui.begin(width * dpr, height * dpr);

      for (let i = 0; i < 4; i += 1) {
        const x = width * (0.1 + rng() * 0.8);
        const y = height * (0.1 + rng() * 0.8);
        const length = width * (0.1 + rng() * 0.2);
        const angle = rng() * Math.PI;
        const x2 = x + Math.cos(angle) * length;
        const y2 = y + Math.sin(angle) * length;
        drawLine(ui, scale, x, y, x2, y2, 1.2, withAlpha(accent, 0.12));
      }

      const padding = width * 0.12;
      const cardWidth = width - padding * 2;
      const cardHeight = height * 0.58;
      const top = height * 0.22;
      const radius = Math.min(20, cardWidth * 0.12);
      const border = mix(INK, WHITE, 0.7);
      const fill = PORCELAIN_SOFT;

      const card = {
        x: padding,
        y: top,
        width: cardWidth,
        height: cardHeight,
      };

      drawRoundedPanel(ui, scale, card, radius, fill, border, 6);

      const makeNodeRect = (cardRect: { x: number; y: number; width: number; height: number }) => {
        const offsetX = (rng() - 0.5) * cardRect.width * 0.06;
        const offsetY = (rng() - 0.5) * cardRect.height * 0.05;
        const widthScale = 0.7 + rng() * 0.08;
        const heightScale = 0.52 + rng() * 0.08;
        const nodeWidth = cardRect.width * widthScale;
        const nodeHeight = cardRect.height * heightScale;
        const x = clamp(
          cardRect.x + cardRect.width * 0.15 + offsetX,
          cardRect.x + 10,
          cardRect.x + cardRect.width - nodeWidth - 10
        );
        const y = clamp(
          cardRect.y + cardRect.height * 0.2 + offsetY,
          cardRect.y + 10,
          cardRect.y + cardRect.height - nodeHeight - 10
        );
        return { x, y, width: nodeWidth, height: nodeHeight };
      };

      const wireColor = mix(accent, WHITE, 0.25);
      const inputCount = Math.max(1, Math.min(inputs.length, 3));
      const outputCount = Math.max(1, Math.min(outputs.length, 3));

      const nodeRect = makeNodeRect(card);

      const inputColors = inputs.length
        ? inputs
            .slice(0, 4)
            .map((port) => parseHexColor(PORT_TYPE_COLOR[port.type] ?? "#94a3b8", 1))
        : [mix(accent, WHITE, 0.3)];
      const outputColors = outputs.length
        ? outputs
            .slice(0, 4)
            .map((port) => parseHexColor(PORT_TYPE_COLOR[port.type] ?? "#94a3b8", 1))
        : [mix(accent, WHITE, 0.3)];

      const caption = stage === "operation" ? label : stage === "input" ? "Input" : "Output";

      if (stage === "input") {
        drawNode(context, nodeRect, inputs[0]?.label ?? "Input", mix(accent, CYAN, 0.25), mix(band, WHITE, 0.1), inputColors, []);
        const start = { x: nodeRect.x + nodeRect.width, y: nodeRect.y + nodeRect.height * 0.55 };
        const end = { x: card.x + card.width * 0.9, y: nodeRect.y + nodeRect.height * 0.55 };
        drawArrow(ui, scale, start, end, 2.4, mix(accent, WHITE, 0.4));
      } else if (stage === "output") {
        drawNode(context, nodeRect, outputs[0]?.label ?? "Output", mix(accent, PURPLE, 0.2), mix(band, WHITE, 0.15), outputColors, []);
        const start = { x: card.x + card.width * 0.1, y: nodeRect.y + nodeRect.height * 0.55 };
        const end = { x: nodeRect.x, y: nodeRect.y + nodeRect.height * 0.55 };
        drawArrow(ui, scale, start, end, 2.4, mix(accent, WHITE, 0.4));
      } else {
        drawNode(context, nodeRect, label, accent, band, portColors, parameters);
        for (let i = 0; i < inputCount; i += 1) {
          const start = { x: card.x + card.width * 0.1, y: nodeRect.y + nodeRect.height * (0.35 + i * 0.2) };
          const end = { x: nodeRect.x, y: nodeRect.y + nodeRect.height * (0.35 + i * 0.2) };
          drawWire(ui, scale, start, end, inputColors[i % inputColors.length] ?? wireColor);
        }
        for (let i = 0; i < outputCount; i += 1) {
          const start = { x: nodeRect.x + nodeRect.width, y: nodeRect.y + nodeRect.height * (0.35 + i * 0.2) };
          const end = { x: card.x + card.width * 0.9, y: nodeRect.y + nodeRect.height * (0.35 + i * 0.2) };
          drawWire(ui, scale, start, end, outputColors[i % outputColors.length] ?? wireColor);
        }
      }

      ui.flush();

      const resolution = { width: width * dpr, height: height * dpr };
      drawCardLabel(text, caption, card.x, top + cardHeight + 12, 12, dpr, resolution);
    },
    [accent, band, portColors, inputs, outputs, parameters, label, seed, stage]
  );

  return (
    <DocumentationCanvas
      className={styles.numericaFrame}
      draw={draw}
    />
  );
};

export const RoslynWorkflowArt = () => {
  const draw = useCallback((context: DrawContext) => {
    drawRoslynPanel(context, "workflow", "Workflow", ORANGE, 42, "Workflow");
  }, []);
  return <DocumentationCanvas className={styles.workflowFrame} draw={draw} />;
};

export const NumericaWorkflowArt = () => {
  const draw = useCallback((context: DrawContext) => {
    const { ui, width, height, dpr } = context;
    const scale = dpr;
    ui.begin(width * dpr, height * dpr);
    drawRect(ui, scale, 0, 0, width, height, withAlpha(PORCELAIN, 0.2));

    const nodeWidth = width * 0.2;
    const nodeHeight = height * 0.32;
    const y = height * 0.34;
    const gap = width * 0.06;
    const startX = width * 0.08;

    const accent = PURPLE;
    const band = mix(PURPLE, WHITE, 0.8);
    const portColor = mix(PURPLE, WHITE, 0.5);

    const nodes = [0, 1, 2, 3].map((index) => ({
      x: startX + index * (nodeWidth + gap),
      y,
      width: nodeWidth,
      height: nodeHeight,
    }));

    nodes.forEach((node, index) => {
      const label =
        index === 0 ? "Input" : index === 1 ? "Logic" : index === 2 ? "Transform" : "Output";
      drawNode(context, node, label, accent, band, [portColor, portColor], []);
      if (index < nodes.length - 1) {
        drawWire(
          ui,
          scale,
          { x: node.x + node.width, y: node.y + node.height * 0.6 },
          { x: nodes[index + 1].x, y: nodes[index + 1].y + nodes[index + 1].height * 0.6 },
          mix(PURPLE, WHITE, 0.2)
        );
      }
    });

    ui.flush();
  }, []);

  return (
    <DocumentationCanvas
      className={styles.workflowFrame}
      draw={draw}
      transparent
    />
  );
};

export default DocumentationCanvas;
