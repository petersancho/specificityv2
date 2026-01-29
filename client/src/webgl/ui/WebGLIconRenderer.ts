import type { RGBA } from "./WebGLUIRenderer";

type Resolution = { width: number; height: number };

type Rect = { x: number; y: number; width: number; height: number };

type IconUV = { u0: number; v0: number; u1: number; v1: number };

type IconRenderStyle = "tile" | "glyph";

type IconRenderOptions = {
  style?: IconRenderStyle;
  tint?: RGBA;
  monochrome?: boolean;
};

type AtlasSpec = {
  texture: WebGLTexture;
  width: number;
  height: number;
  uvById: Record<string, IconUV>;
};

type ShaderHandles = {
  program: WebGLProgram;
  positionLoc: number;
  uvLoc: number;
  tintLoc: number;
  resolutionLoc: WebGLUniformLocation | null;
  textureLoc: WebGLUniformLocation | null;
};

const VERTEX_STRIDE = 8;
const ATLAS_ICON_SIZE = 224;

const ICON_IDS = [
  "point",
  "line",
  "arc",
  "polyline",
  "rectangle",
  "circle",
  "primitive",
  "box",
  "sphere",
  "numberConstant",
  "add",
  "subtract",
  "multiply",
  "divide",
  "clamp",
  "min",
  "max",
  "expression",
  "conditional",
  "origin",
  "unitX",
  "unitY",
  "unitZ",
  "unitXYZ",
  "vectorConstruct",
  "vectorDeconstruct",
  "vectorAdd",
  "vectorSubtract",
  "vectorScale",
  "vectorLength",
  "vectorNormalize",
  "vectorDot",
  "vectorCross",
  "distance",
  "vectorFromPoints",
  "vectorAngle",
  "vectorLerp",
  "vectorProject",
  "movePoint",
  "movePointByVector",
  "rotateVectorAxis",
  "mirrorVector",
  "listCreate",
  "listLength",
  "listItem",
  "listIndexOf",
  "listPartition",
  "listFlatten",
  "listSlice",
  "listReverse",
  "listSum",
  "listAverage",
  "listMin",
  "listMax",
  "listMedian",
  "listStdDev",
  "geometryInfo",
  "geometryVertices",
  "geometryEdges",
  "geometryFaces",
  "geometryNormals",
  "geometryControlPoints",
  "range",
  "linspace",
  "remap",
  "random",
  "repeat",
  "arrayLinear",
  "arrayPolar",
  "arrayGrid",
  "sineWave",
  "cosineWave",
  "sawtoothWave",
  "triangleWave",
  "squareWave",
  "topologyOptimize",
  "topologySolver",
  "biologicalSolver",
  "move",
  "rotate",
  "scale",
  "undo",
  "redo",
  "delete",
  "focus",
  "frameAll",
  "copy",
  "paste",
  "duplicate",
  "gumball",
  "geometryReference",
  "pointGenerator",
  "lineBuilder",
  "circleGenerator",
  "boxBuilder",
  "transform",
  "surface",
  "loft",
  "extrude",
  "boolean",
  "offset",
  "linguaSymbol",
  "selectionFilter",
  "displayMode",
  "referenceActive",
  "referenceAll",
  "group",
  "ungroup",
  "advanced",
  "transformOrientation",
  "pivotMode",
  "cplaneXY",
  "cplaneXZ",
  "cplaneYZ",
  "cplaneAlign",
  "capture",
  "save",
  "load",
  "download",
  "run",
  "close",
  "themeLight",
  "themeDark",
  "brandRoslyn",
  "brandNumerica",
  "prune",
  "show",
  "hide",
  "lock",
  "unlock",
  "script",
  "interpolate",
  "chevronDown",
  "ruler",
  "zoomCursor",
  "invertZoom",
  "upright",
] as const;

type AtlasIconId = (typeof ICON_IDS)[number];

export type IconId = AtlasIconId | string;

const rgb = (r: number, g: number, b: number, a = 1): RGBA => [
  r / 255,
  g / 255,
  b / 255,
  a,
];

const DEFAULT_ICON_STYLE: IconRenderStyle = "glyph";
const DEFAULT_GLYPH_TINT: RGBA = rgb(54, 62, 78, 0.95);
let activeIconStyle: IconRenderStyle = DEFAULT_ICON_STYLE;

const isGlyphStyle = () => activeIconStyle === "glyph";

const clampStrokeWidth = (width: number, min = 1) => {
  const rounded = Math.round(width);
  return Math.max(min, rounded);
};

const createShader = (
  gl: WebGLRenderingContext,
  type: GLenum,
  source: string
): WebGLShader => {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Unable to create shader");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation failed: ${info}`);
  }
  return shader;
};

const createProgram = (
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram => {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) {
    throw new Error("Unable to create WebGL program");
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link failed: ${info}`);
  }
  return program;
};

const applyGloss = (
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; size: number }
) => {
  if (isGlyphStyle()) return;
  const { x, y, size } = bounds;
  const gloss = ctx.createLinearGradient(x, y, x, y + size * 0.7);
  gloss.addColorStop(0, "rgba(255,255,255,0.38)");
  gloss.addColorStop(0.6, "rgba(255,255,255,0.02)");
  gloss.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gloss;
  ctx.fillRect(x, y, size, size);
};

const drawSoftShadow = (
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; size: number }
) => {
  if (isGlyphStyle()) return;
  const { x, y, size } = bounds;
  const shadow = ctx.createRadialGradient(
    x + size * 0.52,
    y + size * 0.58,
    size * 0.18,
    x + size * 0.52,
    y + size * 0.58,
    size * 0.7
  );
  shadow.addColorStop(0, "rgba(0,0,0,0.18)");
  shadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shadow;
  ctx.fillRect(x, y, size, size);
};

const roundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const strokeOutline = (
  ctx: CanvasRenderingContext2D,
  color = "rgba(18, 16, 12, 0.85)"
) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = clampStrokeWidth(6, 2);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
};

const fillAndOutline = (
  ctx: CanvasRenderingContext2D,
  fill: string | CanvasGradient,
  outline = "rgba(18, 16, 12, 0.85)"
) => {
  ctx.fillStyle = fill;
  ctx.fill();
  strokeOutline(ctx, outline);
};

const glyphColor = (alpha = 1) => `rgba(0,0,0,${alpha})`;

const setGlyphStroke = (
  ctx: CanvasRenderingContext2D,
  size: number,
  weight = 0.1,
  alpha = 1
) => {
  ctx.lineWidth = clampStrokeWidth(size * weight, 2);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.miterLimit = 2.4;
  ctx.strokeStyle = glyphColor(alpha);
};

const setGlyphFill = (ctx: CanvasRenderingContext2D, alpha = 1) => {
  ctx.fillStyle = glyphColor(alpha);
};

const drawGlyphDot = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha = 1
) => {
  setGlyphFill(ctx, alpha);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.lineWidth = clampStrokeWidth(radius * 0.45, 1);
  ctx.strokeStyle = glyphColor(alpha * 0.55);
  ctx.stroke();
  ctx.restore();
};

const drawGlyphArrow = (
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  size: number,
  alpha = 1
) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.max(6, size * 0.12);
  const wing = head * 0.6;

  setGlyphStroke(ctx, size, 0.1, alpha);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  const hx = to.x - ux * head;
  const hy = to.y - uy * head;
  const nx = -uy;
  const ny = ux;

  setGlyphFill(ctx, alpha);
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(hx + nx * wing, hy + ny * wing);
  ctx.lineTo(hx - nx * wing, hy - ny * wing);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.lineWidth = clampStrokeWidth(size * 0.03, 1);
  ctx.strokeStyle = glyphColor(alpha * 0.55);
  ctx.stroke();
  ctx.restore();
};

const drawGlyphArrowHead = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
  alpha = 1
) => {
  const head = Math.max(6, size * 0.12);
  const wing = head * 0.6;
  const hx = x - Math.cos(angle) * head;
  const hy = y - Math.sin(angle) * head;
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);

  setGlyphFill(ctx, alpha);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(hx + nx * wing, hy + ny * wing);
  ctx.lineTo(hx - nx * wing, hy - ny * wing);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.lineWidth = clampStrokeWidth(size * 0.03, 1);
  ctx.strokeStyle = glyphColor(alpha * 0.55);
  ctx.stroke();
  ctx.restore();
};

const drawGlyphArcArrow = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  size: number,
  alpha = 1
) => {
  setGlyphStroke(ctx, size, 0.095, alpha);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.stroke();

  const ex = cx + Math.cos(endAngle) * radius;
  const ey = cy + Math.sin(endAngle) * radius;
  const tangent = endAngle + Math.PI * 0.5;
  drawGlyphArrowHead(ctx, ex, ey, tangent, size, alpha);
};

const drawIsoCubeOutline = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number
) => {
  const s = size * 0.22;
  const dx = size * 0.14;
  const dy = size * 0.1;

  const a = { x: cx - s, y: cy - s };
  const b = { x: cx + s, y: cy - s };
  const c = { x: cx + s, y: cy + s };
  const d = { x: cx - s, y: cy + s };

  const a2 = { x: a.x - dx, y: a.y - dy };
  const b2 = { x: b.x - dx, y: b.y - dy };
  const c2 = { x: c.x - dx, y: c.y - dy };
  const d2 = { x: d.x - dx, y: d.y - dy };

  setGlyphStroke(ctx, size, 0.085, 0.95);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(a2.x, a2.y);
  ctx.lineTo(b2.x, b2.y);
  ctx.lineTo(b.x, b.y);
  ctx.moveTo(b2.x, b2.y);
  ctx.lineTo(c2.x, c2.y);
  ctx.lineTo(c.x, c.y);
  ctx.moveTo(a2.x, a2.y);
  ctx.lineTo(d2.x, d2.y);
  ctx.lineTo(c2.x, c2.y);
  ctx.stroke();
};

const drawPointIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const cx = x + size * 0.5;
  const cy = y + size * 0.52;
  const len = size * 0.3;
  const ring = size * 0.18;

  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    ctx.beginPath();
    ctx.moveTo(cx - len, cy);
    ctx.lineTo(cx + len, cy);
    ctx.moveTo(cx, cy - len);
    ctx.lineTo(cx, cy + len);
  });

  strokeDualPath(ctx, size * 0.07, size * 0.042, () => {
    ctx.beginPath();
    ctx.arc(cx, cy, ring, 0, Math.PI * 2);
  });

  setGlyphStroke(ctx, size, 0.05, 0.5);
  const tick = size * 0.12;
  ctx.beginPath();
  ctx.moveTo(cx - tick, cy - tick);
  ctx.lineTo(cx - tick * 0.55, cy - tick);
  ctx.moveTo(cx + tick, cy + tick);
  ctx.lineTo(cx + tick * 0.55, cy + tick);
  ctx.moveTo(cx - tick, cy + tick);
  ctx.lineTo(cx - tick * 0.55, cy + tick);
  ctx.moveTo(cx + tick, cy - tick);
  ctx.lineTo(cx + tick * 0.55, cy - tick);
  ctx.stroke();

  drawGlyphDot(ctx, cx, cy, size * 0.1, 1);
};

const drawLineIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const start = { x: x + size * 0.18, y: y + size * 0.74 };
  const end = { x: x + size * 0.82, y: y + size * 0.26 };

  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
  });

  drawGlyphDot(ctx, start.x, start.y, size * 0.09, 1);
  drawGlyphDot(ctx, end.x, end.y, size * 0.09, 1);

  const midX = (start.x + end.x) * 0.5;
  const midY = (start.y + end.y) * 0.5;
  const nx = (end.y - start.y) * 0.12;
  const ny = (start.x - end.x) * 0.12;
  setGlyphStroke(ctx, size, 0.05, 0.55);
  ctx.beginPath();
  ctx.moveTo(midX - nx, midY - ny);
  ctx.lineTo(midX + nx, midY + ny);
  ctx.stroke();
};

const drawPolylineIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const pts = [
    { x: x + size * 0.16, y: y + size * 0.72 },
    { x: x + size * 0.4, y: y + size * 0.4 },
    { x: x + size * 0.64, y: y + size * 0.58 },
    { x: x + size * 0.86, y: y + size * 0.26 },
  ];

  strokeDualPath(ctx, size * 0.07, size * 0.042, () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
  });

  ctx.save();
  ctx.setLineDash([size * 0.06, size * 0.05]);
  setGlyphStroke(ctx, size, 0.05, 0.45);
  ctx.beginPath();
  ctx.moveTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.stroke();
  ctx.restore();

  pts.forEach((pt, index) => {
    drawGlyphDot(ctx, pt.x, pt.y, size * (index === 0 || index === 3 ? 0.08 : 0.07), 1);
  });
};

const drawRectangleIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const rx = x + size * 0.16;
  const ry = y + size * 0.24;
  const rw = size * 0.68;
  const rh = size * 0.52;

  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    roundedRectPath(ctx, rx, ry, rw, rh, size * 0.08);
  });

  const diagStart = { x: rx + rw * 0.2, y: ry + rh * 0.8 };
  const diagEnd = { x: rx + rw * 0.8, y: ry + rh * 0.2 };
  strokeDualPath(ctx, size * 0.055, size * 0.032, () => {
    ctx.beginPath();
    ctx.moveTo(diagStart.x, diagStart.y);
    ctx.lineTo(diagEnd.x, diagEnd.y);
  }, { outerColor: "rgba(0,0,0,0.35)", innerColor: "rgba(255,255,255,0.7)" });

  drawGlyphDot(ctx, rx, ry, size * 0.06, 0.95);
  drawGlyphDot(ctx, rx + rw, ry, size * 0.06, 0.95);
  drawGlyphDot(ctx, rx + rw, ry + rh, size * 0.06, 0.95);
  drawGlyphDot(ctx, rx, ry + rh, size * 0.06, 0.95);
};

const drawCircleIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const cx = x + size * 0.5;
  const cy = y + size * 0.5;
  const r = size * 0.33;

  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  });

  strokeDualPath(ctx, size * 0.055, size * 0.032, () => {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.64, Math.PI * 0.1, Math.PI * 0.9);
  }, { outerColor: "rgba(0,0,0,0.35)", innerColor: "rgba(255,255,255,0.7)" });

  const radiusLineEnd = { x: cx + r * 0.85, y: cy - r * 0.25 };
  setGlyphStroke(ctx, size, 0.055, 0.65);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(radiusLineEnd.x, radiusLineEnd.y);
  ctx.stroke();

  drawGlyphDot(ctx, cx, cy, size * 0.055, 0.9);
  drawGlyphDot(ctx, radiusLineEnd.x, radiusLineEnd.y, size * 0.055, 0.95);
};

const drawArcIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const cx = x + size * 0.52;
  const cy = y + size * 0.58;
  const r = size * 0.34;
  const startAngle = Math.PI * 1.05;
  const endAngle = Math.PI * 1.95;

  const start = {
    x: cx + Math.cos(startAngle) * r,
    y: cy + Math.sin(startAngle) * r,
  };
  const end = {
    x: cx + Math.cos(endAngle) * r,
    y: cy + Math.sin(endAngle) * r,
  };
  const midAngle = (startAngle + endAngle) * 0.5;
  const mid = {
    x: cx + Math.cos(midAngle) * r,
    y: cy + Math.sin(midAngle) * r,
  };

  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle, false);
  });

  const chordStart = { x: start.x + (mid.x - start.x) * 0.2, y: start.y + (mid.y - start.y) * 0.2 };
  const chordEnd = { x: end.x + (mid.x - end.x) * 0.2, y: end.y + (mid.y - end.y) * 0.2 };
  setGlyphStroke(ctx, size, 0.045, 0.5);
  ctx.beginPath();
  ctx.moveTo(chordStart.x, chordStart.y);
  ctx.lineTo(chordEnd.x, chordEnd.y);
  ctx.stroke();

  drawGlyphDot(ctx, start.x, start.y, size * 0.075, 0.98);
  drawGlyphDot(ctx, end.x, end.y, size * 0.075, 0.98);
  drawGlyphDot(ctx, mid.x, mid.y, size * 0.06, 0.75);
};

const drawCube = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  palette: { top: string; left: string; right: string }
) => {
  const cx = x + size * 0.5;
  const cy = y + size * 0.52;
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

  const drawFace = (points: Array<{ x: number; y: number }>, fill: string) => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    fillAndOutline(ctx, fill);
  };

  drawFace(left, palette.left);
  drawFace(right, palette.right);
  drawFace(top, palette.top);
};

const drawBoxIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const cx = x + size * 0.52;
  const cy = y + size * 0.56;
  drawIsoCubeOutline(ctx, cx, cy, size);

  const edgeLen = size * 0.22;
  setGlyphStroke(ctx, size, 0.055, 0.6);
  ctx.beginPath();
  ctx.moveTo(cx - edgeLen * 0.8, cy + edgeLen * 0.9);
  ctx.lineTo(cx + edgeLen * 0.1, cy + edgeLen * 0.9);
  ctx.moveTo(cx + edgeLen * 0.9, cy - edgeLen * 0.35);
  ctx.lineTo(cx + edgeLen * 0.9, cy + edgeLen * 0.45);
  ctx.stroke();
};

const drawSphereIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const cx = x + size * 0.5;
  const cy = y + size * 0.52;
  const r = size * 0.33;

  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  });

  setGlyphStroke(ctx, size, 0.05, 0.55);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(0.62, 1);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.restore();
  ctx.stroke();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.62);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.restore();
  ctx.stroke();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(0.85, 0.42);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.restore();
  ctx.stroke();
};

const drawSparkle = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - size, cy);
  ctx.lineTo(cx + size, cy);
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx, cy + size);
  ctx.stroke();
  ctx.restore();
};

const drawPrimitiveIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const cx = x + size * 0.5;
  const cy = y + size * 0.55;
  drawIsoCubeOutline(ctx, cx - size * 0.08, cy + size * 0.02, size * 0.9);

  const sparkle = { x: x + size * 0.76, y: y + size * 0.26 };
  setGlyphStroke(ctx, size, 0.05, 0.65);
  ctx.beginPath();
  ctx.moveTo(sparkle.x - size * 0.06, sparkle.y);
  ctx.lineTo(sparkle.x + size * 0.06, sparkle.y);
  ctx.moveTo(sparkle.x, sparkle.y - size * 0.06);
  ctx.lineTo(sparkle.x, sparkle.y + size * 0.06);
  ctx.stroke();
  drawGlyphDot(ctx, sparkle.x, sparkle.y, size * 0.065, 0.95);
};

const drawCurvedArrow = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  color: string,
  headAngle: number
) => {
  ctx.lineWidth = clampStrokeWidth(radius * 0.32, 2);
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.stroke();

  const ex = cx + Math.cos(endAngle) * radius;
  const ey = cy + Math.sin(endAngle) * radius;
  const head = Math.max(10, radius * 0.55);
  const wing = head * 0.55;
  const hx = ex - Math.cos(endAngle) * head;
  const hy = ey - Math.sin(endAngle) * head;

  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(
    hx + Math.cos(endAngle + headAngle) * wing,
    hy + Math.sin(endAngle + headAngle) * wing
  );
  ctx.lineTo(
    hx + Math.cos(endAngle - headAngle) * wing,
    hy + Math.sin(endAngle - headAngle) * wing
  );
  ctx.closePath();
  fillAndOutline(ctx, color, "rgba(0,0,0,0.55)");
};

const drawUndoIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const cx = x + size * 0.54;
  const cy = y + size * 0.56;
  const r = size * 0.3;
  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.2, Math.PI * 1.25);
  });
  drawGlyphArcArrow(ctx, cx, cy, r, Math.PI * 0.22, Math.PI * 1.32, size, 0.95);
};

const drawRedoIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const cx = x + size * 0.46;
  const cy = y + size * 0.56;
  const r = size * 0.3;
  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.7, Math.PI * 1.9);
  });
  drawGlyphArcArrow(ctx, cx, cy, r, Math.PI * 0.75, Math.PI * 1.92, size, 0.95);
};

const drawDeleteIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const bodyX = x + size * 0.3;
  const bodyY = y + size * 0.34;
  const bodyW = size * 0.4;
  const bodyH = size * 0.44;

  strokeDualPath(ctx, size * 0.08, size * 0.045, () => {
    roundedRectPath(ctx, bodyX, bodyY, bodyW, bodyH, size * 0.05);
  });

  roundedRectPath(
    ctx,
    bodyX - size * 0.06,
    bodyY - size * 0.1,
    bodyW + size * 0.12,
    size * 0.1,
    size * 0.04
  );
  setGlyphStroke(ctx, size, 0.06, 0.75);
  ctx.stroke();

  setGlyphStroke(ctx, size, 0.055, 0.6);
  ctx.beginPath();
  ctx.moveTo(bodyX + size * 0.08, bodyY + size * 0.06);
  ctx.lineTo(bodyX + size * 0.08, bodyY + bodyH - size * 0.06);
  ctx.moveTo(bodyX + bodyW * 0.5, bodyY + size * 0.06);
  ctx.lineTo(bodyX + bodyW * 0.5, bodyY + bodyH - size * 0.06);
  ctx.moveTo(bodyX + bodyW - size * 0.08, bodyY + size * 0.06);
  ctx.lineTo(bodyX + bodyW - size * 0.08, bodyY + bodyH - size * 0.06);
  ctx.stroke();

  setGlyphStroke(ctx, size, 0.06, 0.85);
  ctx.beginPath();
  ctx.moveTo(bodyX + bodyW * 0.35, bodyY - size * 0.13);
  ctx.lineTo(bodyX + bodyW * 0.65, bodyY - size * 0.13);
  ctx.stroke();

  const crossPad = size * 0.06;
  setGlyphStroke(ctx, size, 0.045, 0.6);
  ctx.beginPath();
  ctx.moveTo(bodyX + crossPad, bodyY + crossPad);
  ctx.lineTo(bodyX + bodyW - crossPad, bodyY + bodyH - crossPad);
  ctx.moveTo(bodyX + bodyW - crossPad, bodyY + crossPad);
  ctx.lineTo(bodyX + crossPad, bodyY + bodyH - crossPad);
  ctx.stroke();
};

const drawFocusIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const cx = x + size * 0.5;
  const cy = y + size * 0.52;
  const r = size * 0.22;

  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  });

  setGlyphStroke(ctx, size, 0.055, 0.7);
  ctx.beginPath();
  ctx.moveTo(cx - r * 1.6, cy);
  ctx.lineTo(cx - r * 0.9, cy);
  ctx.moveTo(cx + r * 0.9, cy);
  ctx.lineTo(cx + r * 1.6, cy);
  ctx.moveTo(cx, cy - r * 1.6);
  ctx.lineTo(cx, cy - r * 0.9);
  ctx.moveTo(cx, cy + r * 0.9);
  ctx.lineTo(cx, cy + r * 1.6);
  ctx.stroke();

  drawGlyphDot(ctx, cx, cy, size * 0.065, 0.95);
};

const drawFrameAllIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  const inset = size * 0.18;
  const frame = {
    x: x + inset,
    y: y + inset,
    width: size - inset * 2,
    height: size - inset * 2,
  };

  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    roundedRectPath(ctx, frame.x, frame.y, frame.width, frame.height, size * 0.06);
  });

  const corner = size * 0.12;
  setGlyphStroke(ctx, size, 0.055, 0.65);
  ctx.beginPath();
  ctx.moveTo(frame.x, frame.y + corner);
  ctx.lineTo(frame.x, frame.y);
  ctx.lineTo(frame.x + corner, frame.y);
  ctx.moveTo(frame.x + frame.width - corner, frame.y);
  ctx.lineTo(frame.x + frame.width, frame.y);
  ctx.lineTo(frame.x + frame.width, frame.y + corner);
  ctx.moveTo(frame.x, frame.y + frame.height - corner);
  ctx.lineTo(frame.x, frame.y + frame.height);
  ctx.lineTo(frame.x + corner, frame.y + frame.height);
  ctx.moveTo(frame.x + frame.width - corner, frame.y + frame.height);
  ctx.lineTo(frame.x + frame.width, frame.y + frame.height);
  ctx.lineTo(frame.x + frame.width, frame.y + frame.height - corner);
  ctx.stroke();

  drawGlyphArrow(
    ctx,
    { x: frame.x + frame.width * 0.5, y: frame.y + frame.height * 0.65 },
    { x: frame.x + frame.width * 0.5, y: frame.y - size * 0.06 },
    size,
    0.9
  );
  drawGlyphArrow(
    ctx,
    { x: frame.x + frame.width * 0.35, y: frame.y + frame.height * 0.5 },
    { x: frame.x + frame.width + size * 0.06, y: frame.y + frame.height * 0.5 },
    size,
    0.9
  );
};

const drawCopyIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const back = {
    x: x + size * 0.24,
    y: y + size * 0.2,
    width: size * 0.46,
    height: size * 0.56,
  };
  strokeDualPath(ctx, size * 0.065, size * 0.038, () => {
    roundedRectPath(ctx, back.x, back.y, back.width, back.height, size * 0.06);
  }, { outerColor: "rgba(0,0,0,0.35)", innerColor: "rgba(255,255,255,0.6)" });

  const front = {
    x: x + size * 0.32,
    y: y + size * 0.3,
    width: size * 0.46,
    height: size * 0.56,
  };
  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    roundedRectPath(ctx, front.x, front.y, front.width, front.height, size * 0.06);
  });

  const plusX = front.x + front.width * 0.8;
  const plusY = front.y + front.height * 0.2;
  setGlyphStroke(ctx, size, 0.05, 0.6);
  ctx.beginPath();
  ctx.moveTo(plusX - size * 0.04, plusY);
  ctx.lineTo(plusX + size * 0.04, plusY);
  ctx.moveTo(plusX, plusY - size * 0.04);
  ctx.lineTo(plusX, plusY + size * 0.04);
  ctx.stroke();
};

const drawPasteIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const board = {
    x: x + size * 0.28,
    y: y + size * 0.24,
    width: size * 0.44,
    height: size * 0.56,
  };
  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    roundedRectPath(ctx, board.x, board.y, board.width, board.height, size * 0.08);
  });

  roundedRectPath(
    ctx,
    board.x + size * 0.06,
    board.y - size * 0.08,
    board.width - size * 0.12,
    size * 0.12,
    size * 0.05
  );
  setGlyphStroke(ctx, size, 0.06, 0.75);
  ctx.stroke();

  setGlyphStroke(ctx, size, 0.045, 0.5);
  const lineX = board.x + size * 0.08;
  const lineW = board.width - size * 0.16;
  for (let i = 0; i < 3; i += 1) {
    const ly = board.y + size * (0.18 + i * 0.16);
    ctx.beginPath();
    ctx.moveTo(lineX, ly);
    ctx.lineTo(lineX + lineW, ly);
    ctx.stroke();
  }
};

const drawDuplicateIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawIsoCubeOutline(ctx, x + size * 0.46, y + size * 0.5, size * 0.85);
  drawIsoCubeOutline(ctx, x + size * 0.6, y + size * 0.64, size * 0.85);

  drawGlyphArrow(
    ctx,
    { x: x + size * 0.32, y: y + size * 0.28 },
    { x: x + size * 0.62, y: y + size * 0.18 },
    size,
    0.8
  );
};

const drawGumballIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const cx = x + size * 0.5;
  const cy = y + size * 0.54;
  const r = size * 0.26;

  strokeDualPath(ctx, size * 0.07, size * 0.042, () => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  });

  strokeDualPath(ctx, size * 0.06, size * 0.035, () => {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.68, Math.PI * 0.1, Math.PI * 1.6);
  }, { outerColor: "rgba(0,0,0,0.35)", innerColor: "rgba(255,255,255,0.7)" });

  drawGlyphArrow(
    ctx,
    { x: cx, y: cy },
    { x: cx + size * 0.32, y: cy },
    size,
    0.9
  );
  drawGlyphArrow(
    ctx,
    { x: cx, y: cy },
    { x: cx, y: cy - size * 0.34 },
    size,
    0.9
  );
  drawGlyphArrow(
    ctx,
    { x: cx, y: cy },
    { x: cx - size * 0.24, y: cy + size * 0.28 },
    size,
    0.9
  );
  drawGlyphDot(ctx, cx, cy, size * 0.085, 1);
};

const drawSurfaceIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const rx = x + size * 0.18;
  const ry = y + size * 0.24;
  const rw = size * 0.64;
  const rh = size * 0.5;

  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    roundedRectPath(ctx, rx, ry, rw, rh, size * 0.08);
  });

  setGlyphStroke(ctx, size, 0.055, 0.6);
  for (let i = 1; i < 3; i += 1) {
    const t = i / 3;
    const y0 = ry + rh * t;
    ctx.beginPath();
    ctx.moveTo(rx + size * 0.05, y0);
    ctx.quadraticCurveTo(
      rx + rw * 0.5,
      y0 - rh * 0.12,
      rx + rw - size * 0.05,
      y0
    );
    ctx.stroke();
  }
  for (let i = 1; i < 4; i += 1) {
    const t = i / 4;
    const x0 = rx + rw * t;
    ctx.beginPath();
    ctx.moveTo(x0, ry + size * 0.05);
    ctx.quadraticCurveTo(x0 + rw * 0.06, ry + rh * 0.5, x0, ry + rh - size * 0.05);
    ctx.stroke();
  }

  ctx.save();
  ctx.setLineDash([size * 0.06, size * 0.05]);
  setGlyphStroke(ctx, size, 0.045, 0.45);
  ctx.beginPath();
  ctx.moveTo(rx + rw * 0.15, ry + rh * 0.2);
  ctx.lineTo(rx + rw * 0.85, ry + rh * 0.8);
  ctx.stroke();
  ctx.restore();
};

const drawLoftIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const top = { x: x + size * 0.26, y: y + size * 0.3 };
  const bottom = { x: x + size * 0.28, y: y + size * 0.7 };
  const width = size * 0.48;

  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.18, top.x + width, top.y);
  });

  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    ctx.beginPath();
    ctx.moveTo(bottom.x, bottom.y);
    ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.82, bottom.x + width, bottom.y);
  });

  setGlyphStroke(ctx, size, 0.05, 0.6);
  for (let i = 0; i < 4; i += 1) {
    const t = (i + 1) / 5;
    const x0 = bottom.x + width * t;
    ctx.beginPath();
    ctx.moveTo(x0, bottom.y);
    ctx.lineTo(x0 + size * 0.03, top.y);
    ctx.stroke();
  }

  drawGlyphDot(ctx, top.x + width * 0.15, top.y, size * 0.05, 0.8);
  drawGlyphDot(ctx, top.x + width * 0.85, top.y, size * 0.05, 0.8);
};

const drawArrow = (
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string
) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.max(8, len * 0.18);

  ctx.lineWidth = clampStrokeWidth(len * 0.1, 2);
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  const hx = to.x - ux * head;
  const hy = to.y - uy * head;
  const nx = -uy;
  const ny = ux;

  const wing = head * 0.55;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(hx + nx * wing, hy + ny * wing);
  ctx.lineTo(hx - nx * wing, hy - ny * wing);
  ctx.closePath();
  fillAndOutline(ctx, color, "rgba(0,0,0,0.5)");
};

const drawMoveIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const c = { x: x + size * 0.5, y: y + size * 0.56 };
  drawGlyphArrow(ctx, { x: c.x, y: c.y }, { x: x + size * 0.84, y: c.y }, size, 0.92);
  drawGlyphArrow(ctx, { x: c.x, y: c.y }, { x: c.x, y: y + size * 0.2 }, size, 0.92);
  drawGlyphArrow(ctx, { x: c.x, y: c.y }, { x: x + size * 0.24, y: y + size * 0.86 }, size, 0.92);

  strokeDualPath(ctx, size * 0.05, size * 0.03, () => {
    roundedRectPath(
      ctx,
      c.x - size * 0.16,
      c.y + size * 0.04,
      size * 0.18,
      size * 0.14,
      size * 0.04
    );
  }, { outerColor: "rgba(0,0,0,0.35)", innerColor: "rgba(255,255,255,0.6)" });

  drawGlyphDot(ctx, c.x, c.y, size * 0.08, 1);
};

const drawRotateIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const cx = x + size * 0.52;
  const cy = y + size * 0.52;
  const r = size * 0.3;

  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.18, Math.PI * 1.55);
  });

  strokeDualPath(ctx, size * 0.055, size * 0.032, () => {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.72, Math.PI * 0.32, Math.PI * 1.35);
  }, { outerColor: "rgba(0,0,0,0.35)", innerColor: "rgba(255,255,255,0.7)" });

  const endAngle = Math.PI * 1.55;
  const ex = cx + Math.cos(endAngle) * r;
  const ey = cy + Math.sin(endAngle) * r;
  drawGlyphArrow(
    ctx,
    { x: ex - size * 0.04, y: ey - size * 0.04 },
    { x: ex + size * 0.16, y: ey + size * 0.02 },
    size,
    0.92
  );

  setGlyphStroke(ctx, size, 0.05, 0.55);
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.15);
  ctx.lineTo(cx, cy - r * 0.85);
  ctx.stroke();
};

const drawScaleIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const rx = x + size * 0.24;
  const ry = y + size * 0.26;
  const rw = size * 0.5;
  const rh = size * 0.5;

  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    roundedRectPath(ctx, rx, ry, rw, rh, size * 0.06);
  });

  drawGlyphArrow(
    ctx,
    { x: rx + rw * 0.5, y: ry + rh * 0.5 },
    { x: x + size * 0.86, y: y + size * 0.14 },
    size,
    0.92
  );
  drawGlyphArrow(
    ctx,
    { x: rx + rw * 0.5, y: ry + rh * 0.5 },
    { x: x + size * 0.18, y: y + size * 0.86 },
    size,
    0.85
  );

  drawGlyphDot(ctx, rx + rw, ry, size * 0.055, 0.9);
  drawGlyphDot(ctx, rx, ry + rh, size * 0.055, 0.9);
};

const drawGeometryReferenceIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });
  const cx = x + size * 0.45;
  const cy = y + size * 0.54;
  const r = size * 0.2;

  const ring = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ring.addColorStop(0, "#60a5fa");
  ring.addColorStop(1, "#1d4ed8");

  ctx.lineWidth = 13;
  ctx.strokeStyle = "#1d4ed8";
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.18, Math.PI * 1.95);
  ctx.stroke();

  ctx.lineWidth = 13;
  ctx.strokeStyle = "#60a5fa";
  ctx.beginPath();
  ctx.arc(cx + size * 0.2, cy - size * 0.18, r, Math.PI * 1.18, Math.PI * 2.95);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
  fillAndOutline(ctx, ring);
};

const drawPointGeneratorIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });
  const dots = [
    { x: x + size * 0.24, y: y + size * 0.32 },
    { x: x + size * 0.34, y: y + size * 0.62 },
    { x: x + size * 0.18, y: y + size * 0.7 },
  ];
  dots.forEach((dot, i) => {
    const grad = ctx.createRadialGradient(dot.x - 4, dot.y - 4, 2, dot.x, dot.y, size * 0.09);
    grad.addColorStop(0, "#fef9c3");
    grad.addColorStop(1, i === 0 ? "#f59e0b" : "#fb7185");
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, size * 0.09, 0, Math.PI * 2);
    fillAndOutline(ctx, grad);
  });

  drawArrow(
    ctx,
    { x: x + size * 0.36, y: y + size * 0.58 },
    { x: x + size * 0.82, y: y + size * 0.24 },
    "#22d3ee"
  );
};

const drawLineBuilderIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });
  const a = { x: x + size * 0.2, y: y + size * 0.7 };
  const b = { x: x + size * 0.78, y: y + size * 0.32 };

  const beam = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  beam.addColorStop(0, "#f97316");
  beam.addColorStop(1, "#fde047");
  ctx.lineWidth = 12;
  ctx.strokeStyle = beam;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();

  drawArrow(
    ctx,
    { x: x + size * 0.42, y: y + size * 0.54 },
    { x: x + size * 0.88, y: y + size * 0.2 },
    "#38bdf8"
  );
};

const drawCircleGeneratorIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });
  const cx = x + size * 0.38;
  const cy = y + size * 0.6;
  const r = size * 0.18;

  ctx.lineWidth = 12;
  ctx.strokeStyle = "#34d399";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  drawArrow(
    ctx,
    { x: cx + r * 0.8, y: cy - r * 0.6 },
    { x: x + size * 0.86, y: y + size * 0.24 },
    "#22d3ee"
  );
};

const drawBoxBuilderIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  drawCube(ctx, x, y, size, {
    top: "#fde68a",
    left: "#fb923c",
    right: "#f97316",
  });

  const px = x + size * 0.8;
  const py = y + size * 0.22;
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#22d3ee";
  ctx.beginPath();
  ctx.moveTo(px - 16, py);
  ctx.lineTo(px + 16, py);
  ctx.moveTo(px, py - 16);
  ctx.lineTo(px, py + 16);
  ctx.stroke();
};

const drawTransformIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const origin = { x: x + size * 0.36, y: y + size * 0.7 };
  drawGlyphArrow(ctx, origin, { x: origin.x + size * 0.48, y: origin.y }, size, 0.9);
  drawGlyphArrow(ctx, origin, { x: origin.x, y: origin.y - size * 0.52 }, size, 0.9);
  drawIsoCubeOutline(ctx, x + size * 0.62, y + size * 0.32, size * 0.6);
};

const drawExtrudeIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const frontX = x + size * 0.24;
  const frontY = y + size * 0.58;
  const frontW = size * 0.38;
  const frontH = size * 0.22;
  const dx = size * 0.16;
  const dy = size * 0.12;

  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    roundedRectPath(ctx, frontX, frontY, frontW, frontH, size * 0.05);
  });

  strokeDualPath(ctx, size * 0.065, size * 0.04, () => {
    roundedRectPath(ctx, frontX + dx, frontY - dy, frontW, frontH, size * 0.05);
  }, { outerColor: "rgba(0,0,0,0.35)", innerColor: "rgba(255,255,255,0.7)" });

  setGlyphStroke(ctx, size, 0.055, 0.6);
  ctx.beginPath();
  ctx.moveTo(frontX, frontY);
  ctx.lineTo(frontX + dx, frontY - dy);
  ctx.moveTo(frontX + frontW, frontY);
  ctx.lineTo(frontX + frontW + dx, frontY - dy);
  ctx.moveTo(frontX + frontW, frontY + frontH);
  ctx.lineTo(frontX + frontW + dx, frontY + frontH - dy);
  ctx.stroke();

  drawGlyphArrow(
    ctx,
    { x: frontX + frontW + dx * 0.5, y: frontY - dy * 0.2 },
    { x: frontX + frontW + dx * 0.5, y: y + size * 0.12 },
    size,
    0.92
  );

  drawGlyphDot(
    ctx,
    frontX + frontW + dx * 0.5,
    y + size * 0.14,
    size * 0.055,
    0.9
  );
};

const drawBooleanIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const cy = y + size * 0.52;
  const r = size * 0.22;
  const cxLeft = x + size * 0.42;
  const cxRight = x + size * 0.62;
  setGlyphStroke(ctx, size, 0.09, 0.92);
  ctx.beginPath();
  ctx.arc(cxLeft, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cxRight, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  drawGlyphDot(ctx, (cxLeft + cxRight) * 0.5, cy, size * 0.06, 0.85);
};

const drawOffsetIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const baseX = x + size * 0.22;
  const baseY = y + size * 0.58;
  const w = size * 0.42;
  const h = size * 0.22;
  const offset = size * 0.12;

  setGlyphStroke(ctx, size, 0.09, 0.92);
  roundedRectPath(ctx, baseX, baseY, w, h, size * 0.05);
  ctx.stroke();
  roundedRectPath(ctx, baseX + offset, baseY - offset, w, h, size * 0.05);
  ctx.stroke();

  drawGlyphArrow(
    ctx,
    { x: baseX + w * 0.18, y: baseY + h * 0.5 },
    { x: baseX + offset + w * 0.18, y: baseY - offset + h * 0.5 },
    size,
    0.9
  );
};

const drawLinguaSymbolIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });

  const centerX = x + size * 0.5;
  const topY = y + size * 0.16;
  const midY = y + size * 0.34;
  const frontY = y + size * 0.52;
  const leftX = x + size * 0.2;
  const rightX = x + size * 0.8;
  const depth = size * 0.28;

  const top = { x: centerX, y: topY };
  const right = { x: rightX, y: midY };
  const front = { x: centerX, y: frontY };
  const left = { x: leftX, y: midY };
  const rightDown = { x: rightX, y: midY + depth };
  const frontDown = { x: centerX, y: frontY + depth };
  const leftDown = { x: leftX, y: midY + depth };

  ctx.save();
  ctx.fillStyle = "#f7f4f0";
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(front.x, front.y);
  ctx.lineTo(left.x, left.y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#e8e2dc";
  ctx.beginPath();
  ctx.moveTo(left.x, left.y);
  ctx.lineTo(front.x, front.y);
  ctx.lineTo(frontDown.x, frontDown.y);
  ctx.lineTo(leftDown.x, leftDown.y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ddd5ce";
  ctx.beginPath();
  ctx.moveTo(right.x, right.y);
  ctx.lineTo(front.x, front.y);
  ctx.lineTo(frontDown.x, frontDown.y);
  ctx.lineTo(rightDown.x, rightDown.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(18, 16, 12, 0.7)";
  ctx.lineWidth = clampStrokeWidth(size * 0.04, 1.5);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(front.x, front.y);
  ctx.lineTo(left.x, left.y);
  ctx.closePath();
  ctx.moveTo(left.x, left.y);
  ctx.lineTo(leftDown.x, leftDown.y);
  ctx.moveTo(front.x, front.y);
  ctx.lineTo(frontDown.x, frontDown.y);
  ctx.moveTo(right.x, right.y);
  ctx.lineTo(rightDown.x, rightDown.y);
  ctx.moveTo(leftDown.x, leftDown.y);
  ctx.lineTo(frontDown.x, frontDown.y);
  ctx.lineTo(rightDown.x, rightDown.y);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(18, 16, 12, 0.95)";
  ctx.lineWidth = clampStrokeWidth(size * 0.065, 2);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(rightDown.x, rightDown.y);
  ctx.lineTo(frontDown.x, frontDown.y);
  ctx.lineTo(leftDown.x, leftDown.y);
  ctx.lineTo(left.x, left.y);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
};

const drawSelectionFilterIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });

  const topY = y + size * 0.24;
  const midY = y + size * 0.52;
  const botY = y + size * 0.82;
  const left = x + size * 0.16;
  const right = x + size * 0.84;
  const neckLeft = x + size * 0.44;
  const neckRight = x + size * 0.56;

  ctx.beginPath();
  ctx.moveTo(left, topY);
  ctx.lineTo(right, topY);
  ctx.lineTo(x + size * 0.64, midY);
  ctx.lineTo(neckRight, botY);
  ctx.lineTo(neckLeft, botY);
  ctx.lineTo(x + size * 0.36, midY);
  ctx.closePath();

  const fill = ctx.createLinearGradient(x, topY, x, botY);
  fill.addColorStop(0, "#67e8f9");
  fill.addColorStop(0.55, "#22d3ee");
  fill.addColorStop(1, "#0ea5e9");
  fillAndOutline(ctx, fill);

  const badgeX = x + size * 0.72;
  const badgeY = y + size * 0.18;
  const badgeR = size * 0.11;
  const badge = ctx.createRadialGradient(
    badgeX - badgeR * 0.3,
    badgeY - badgeR * 0.4,
    badgeR * 0.2,
    badgeX,
    badgeY,
    badgeR
  );
  badge.addColorStop(0, "#fef9c3");
  badge.addColorStop(1, "#f59e0b");
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
  fillAndOutline(ctx, badge);
};

const drawDisplayModeIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });

  const layers = [
    { x: x + size * 0.14, y: y + size * 0.2, w: size * 0.56, h: size * 0.56, fill: "#e2e8f0" },
    {
      x: x + size * 0.28,
      y: y + size * 0.34,
      w: size * 0.56,
      h: size * 0.56,
      fill: "rgba(125, 211, 252, 0.88)",
    },
    { x: x + size * 0.42, y: y + size * 0.48, w: size * 0.44, h: size * 0.44, fill: "#86efac" },
  ] as const;

  layers.forEach((layer, index) => {
    roundedRectPath(ctx, layer.x, layer.y, layer.w, layer.h, size * 0.08);
    fillAndOutline(ctx, layer.fill);

    if (index === 0) {
      ctx.save();
      roundedRectPath(ctx, layer.x, layer.y, layer.w, layer.h, size * 0.08);
      ctx.clip();
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(15, 23, 42, 0.28)";
      for (let i = 1; i <= 3; i += 1) {
        const gx = layer.x + (layer.w / 4) * i;
        const gy = layer.y + (layer.h / 4) * i;
        ctx.beginPath();
        ctx.moveTo(gx, layer.y + 6);
        ctx.lineTo(gx, layer.y + layer.h - 6);
        ctx.moveTo(layer.x + 6, gy);
        ctx.lineTo(layer.x + layer.w - 6, gy);
        ctx.stroke();
      }
      ctx.restore();
    }
  });
};

const drawNodeDot = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  colors: { inner: string; outer: string }
) => {
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.2, cx, cy, r);
  grad.addColorStop(0, colors.inner);
  grad.addColorStop(1, colors.outer);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  fillAndOutline(ctx, grad);
};

const drawReferenceActiveIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });

  const cardX = x + size * 0.12;
  const cardY = y + size * 0.36;
  const cardW = size * 0.36;
  const cardH = size * 0.34;
  roundedRectPath(ctx, cardX, cardY, cardW, cardH, size * 0.07);
  const cardFill = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardFill.addColorStop(0, "#fef3c7");
  cardFill.addColorStop(1, "#fdba74");
  fillAndOutline(ctx, cardFill);

  const from = { x: cardX + cardW * 0.9, y: cardY + cardH * 0.5 };
  const to = { x: x + size * 0.82, y: y + size * 0.34 };
  drawArrow(ctx, from, to, "#22d3ee");

  drawNodeDot(ctx, x + size * 0.82, y + size * 0.32, size * 0.12, {
    inner: "#ecfeff",
    outer: "#06b6d4",
  });
};

const drawReferenceAllIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });

  const sources = [
    { x: x + size * 0.22, y: y + size * 0.34 },
    { x: x + size * 0.2, y: y + size * 0.68 },
  ];
  const target = { x: x + size * 0.82, y: y + size * 0.48 };

  sources.forEach((src, index) => {
    drawNodeDot(ctx, src.x, src.y, size * 0.11, {
      inner: index === 0 ? "#f0f9ff" : "#ecfdf5",
      outer: index === 0 ? "#38bdf8" : "#22c55e",
    });
    drawArrow(ctx, src, target, index === 0 ? "#38bdf8" : "#22c55e");
  });

  drawNodeDot(ctx, target.x, target.y, size * 0.13, {
    inner: "#fef9c3",
    outer: "#f59e0b",
  });

  const plusX = target.x + size * 0.02;
  const plusY = target.y - size * 0.22;
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#f97316";
  ctx.beginPath();
  ctx.moveTo(plusX - 12, plusY);
  ctx.lineTo(plusX + 12, plusY);
  ctx.moveTo(plusX, plusY - 12);
  ctx.lineTo(plusX, plusY + 12);
  ctx.stroke();
};

const drawGroupIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });

  const squares = [
    { x: x + size * 0.18, y: y + size * 0.22, fill: "#a7f3d0" },
    { x: x + size * 0.36, y: y + size * 0.36, fill: "#6ee7b7" },
    { x: x + size * 0.54, y: y + size * 0.5, fill: "#34d399" },
  ] as const;

  squares.forEach((sq) => {
    const w = size * 0.34;
    const h = size * 0.34;
    roundedRectPath(ctx, sq.x, sq.y, w, h, size * 0.08);
    const grad = ctx.createLinearGradient(sq.x, sq.y, sq.x, sq.y + h);
    grad.addColorStop(0, "#ecfdf5");
    grad.addColorStop(1, sq.fill);
    fillAndOutline(ctx, grad);
  });

  const linkFrom = { x: x + size * 0.3, y: y + size * 0.64 };
  const linkTo = { x: x + size * 0.78, y: y + size * 0.32 };
  drawArrow(ctx, linkFrom, linkTo, "#0ea5e9");
};

const drawUngroupIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });

  const leftX = x + size * 0.16;
  const rightX = x + size * 0.56;
  const squareY = y + size * 0.34;
  const w = size * 0.3;
  const h = size * 0.3;

  roundedRectPath(ctx, leftX, squareY, w, h, size * 0.08);
  fillAndOutline(ctx, "#93c5fd");

  roundedRectPath(ctx, rightX, squareY, w, h, size * 0.08);
  fillAndOutline(ctx, "#fca5a5");

  drawArrow(
    ctx,
    { x: leftX + w * 0.5, y: squareY + h * 0.5 },
    { x: x + size * 0.04, y: y + size * 0.18 },
    "#3b82f6"
  );
  drawArrow(
    ctx,
    { x: rightX + w * 0.5, y: squareY + h * 0.5 },
    { x: x + size * 0.96, y: y + size * 0.18 },
    "#ef4444"
  );
};

const drawAdvancedIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });

  const cx = x + size * 0.5;
  const cy = y + size * 0.54;
  const r = size * 0.22;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 8);
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8;
    const outer = r * 1.55;
    const inner = r * 1.15;
    const outerX = Math.cos(angle) * outer;
    const outerY = Math.sin(angle) * outer;
    const innerX = Math.cos(angle + Math.PI / 16) * inner;
    const innerY = Math.sin(angle + Math.PI / 16) * inner;
    if (i === 0) {
      ctx.moveTo(outerX, outerY);
    } else {
      ctx.lineTo(outerX, outerY);
    }
    ctx.lineTo(innerX, innerY);
  }
  ctx.closePath();
  const gearFill = ctx.createLinearGradient(-r, -r, r, r);
  gearFill.addColorStop(0, "#fef9c3");
  gearFill.addColorStop(1, "#f59e0b");
  fillAndOutline(ctx, gearFill);

  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  fillAndOutline(ctx, "#fde68a");
  ctx.restore();

  const sparkX = x + size * 0.82;
  const sparkY = y + size * 0.22;
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#a855f7";
  ctx.beginPath();
  ctx.moveTo(sparkX - 10, sparkY);
  ctx.lineTo(sparkX + 10, sparkY);
  ctx.moveTo(sparkX, sparkY - 10);
  ctx.lineTo(sparkX, sparkY + 10);
  ctx.stroke();
};

const drawTransformOrientationIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });
  const origin = { x: x + size * 0.34, y: y + size * 0.7 };
  drawArrow(ctx, origin, { x: origin.x + size * 0.5, y: origin.y - size * 0.04 }, "#ef4444");
  drawArrow(ctx, origin, { x: origin.x - size * 0.04, y: origin.y - size * 0.52 }, "#22c55e");
  drawArrow(ctx, origin, { x: origin.x + size * 0.18, y: origin.y + size * 0.16 }, "#3b82f6");

  drawNodeDot(ctx, origin.x, origin.y, size * 0.12, {
    inner: "#f8fafc",
    outer: "#0f172a",
  });
};

const drawPivotModeIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });
  const cx = x + size * 0.5;
  const cy = y + size * 0.52;
  const r = size * 0.34;

  ctx.lineWidth = 12;
  ctx.strokeStyle = "#38bdf8";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 10;
  ctx.strokeStyle = "#0ea5e9";
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();

  drawNodeDot(ctx, cx, cy, size * 0.13, {
    inner: "#ecfeff",
    outer: "#06b6d4",
  });
};

const drawGridPlane = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  colors: { top: string; bottom: string },
  axes: { x: string; y: string }
) => {
  drawSoftShadow(ctx, { x, y, size });

  const cx = x + size * 0.5;
  const cy = y + size * 0.56;
  const planeW = size * 0.7;
  const planeH = size * 0.46;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.translate(-cx, -cy);

  const planeX = cx - planeW / 2;
  const planeY = cy - planeH / 2;

  roundedRectPath(ctx, planeX, planeY, planeW, planeH, size * 0.08);
  const fill = ctx.createLinearGradient(planeX, planeY, planeX, planeY + planeH);
  fill.addColorStop(0, colors.top);
  fill.addColorStop(1, colors.bottom);
  fillAndOutline(ctx, fill);

  ctx.save();
  roundedRectPath(ctx, planeX, planeY, planeW, planeH, size * 0.08);
  ctx.clip();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.22)";
  for (let i = 1; i < 6; i += 1) {
    const gx = planeX + (planeW / 6) * i;
    const gy = planeY + (planeH / 6) * i;
    ctx.beginPath();
    ctx.moveTo(gx, planeY + 4);
    ctx.lineTo(gx, planeY + planeH - 4);
    ctx.moveTo(planeX + 4, gy);
    ctx.lineTo(planeX + planeW - 4, gy);
    ctx.stroke();
  }
  ctx.restore();

  ctx.lineWidth = 12;
  ctx.strokeStyle = axes.x;
  ctx.beginPath();
  ctx.moveTo(cx - planeW * 0.32, cy + planeH * 0.18);
  ctx.lineTo(cx + planeW * 0.36, cy + planeH * 0.18);
  ctx.stroke();

  ctx.strokeStyle = axes.y;
  ctx.beginPath();
  ctx.moveTo(cx - planeW * 0.18, cy + planeH * 0.32);
  ctx.lineTo(cx - planeW * 0.18, cy - planeH * 0.36);
  ctx.stroke();

  ctx.restore();
};

const drawCPlaneXYIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawGridPlane(
    ctx,
    x,
    y,
    size,
    -0.08,
    { top: "#e0f2fe", bottom: "#bae6fd" },
    { x: "#ef4444", y: "#22c55e" }
  );
};

const drawCPlaneXZIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawGridPlane(
    ctx,
    x,
    y,
    size,
    -0.34,
    { top: "#ede9fe", bottom: "#c4b5fd" },
    { x: "#ef4444", y: "#3b82f6" }
  );
};

const drawCPlaneYZIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawGridPlane(
    ctx,
    x,
    y,
    size,
    0.34,
    { top: "#ecfdf5", bottom: "#bbf7d0" },
    { x: "#22c55e", y: "#3b82f6" }
  );
};

const drawCPlaneAlignIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawGridPlane(
    ctx,
    x,
    y,
    size,
    -0.18,
    { top: "#fef9c3", bottom: "#fde68a" },
    { x: "#0ea5e9", y: "#0ea5e9" }
  );

  const p1 = { x: x + size * 0.28, y: y + size * 0.64 };
  const p2 = { x: x + size * 0.62, y: y + size * 0.36 };
  drawNodeDot(ctx, p1.x, p1.y, size * 0.09, {
    inner: "#f8fafc",
    outer: "#0ea5e9",
  });
  drawNodeDot(ctx, p2.x, p2.y, size * 0.09, {
    inner: "#f8fafc",
    outer: "#0ea5e9",
  });
  drawArrow(ctx, p1, p2, "#0ea5e9");
};

const drawCaptureIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const bodyX = x + size * 0.14;
  const bodyY = y + size * 0.32;
  const bodyW = size * 0.72;
  const bodyH = size * 0.44;
  strokeDualPath(ctx, size * 0.08, size * 0.048, () => {
    roundedRectPath(ctx, bodyX, bodyY, bodyW, bodyH, size * 0.1);
  });

  const lensX = x + size * 0.5;
  const lensY = y + size * 0.54;
  const lensR = size * 0.2;
  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    ctx.beginPath();
    ctx.arc(lensX, lensY, lensR, 0, Math.PI * 2);
  });
  strokeDualPath(ctx, size * 0.055, size * 0.032, () => {
    ctx.beginPath();
    ctx.arc(lensX, lensY, lensR * 0.6, 0, Math.PI * 2);
  }, { outerColor: "rgba(0,0,0,0.35)", innerColor: "rgba(255,255,255,0.7)" });

  const flashX = x + size * 0.28;
  const flashY = y + size * 0.28;
  const flashW = size * 0.18;
  const flashH = size * 0.1;
  strokeDualPath(ctx, size * 0.06, size * 0.035, () => {
    roundedRectPath(ctx, flashX, flashY, flashW, flashH, size * 0.04);
  }, { outerColor: "rgba(0,0,0,0.35)", innerColor: "rgba(255,255,255,0.65)" });

  setGlyphStroke(ctx, size, 0.045, 0.55);
  ctx.beginPath();
  ctx.moveTo(bodyX + bodyW * 0.2, bodyY + bodyH * 0.2);
  ctx.lineTo(bodyX + bodyW * 0.8, bodyY + bodyH * 0.2);
  ctx.stroke();
};

const drawSaveIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });

  const pad = size * 0.16;
  const bodyW = size - pad * 2;
  const bodyH = size - pad * 2;
  const bodyX = x + pad;
  const bodyY = y + pad;
  roundedRectPath(ctx, bodyX, bodyY, bodyW, bodyH, size * 0.14);
  const bodyFill = ctx.createLinearGradient(bodyX, bodyY, bodyX, bodyY + bodyH);
  bodyFill.addColorStop(0, "#dbeafe");
  bodyFill.addColorStop(1, "#60a5fa");
  fillAndOutline(ctx, bodyFill);

  const labelH = bodyH * 0.26;
  const labelY = bodyY + bodyH * 0.12;
  roundedRectPath(ctx, bodyX + bodyW * 0.12, labelY, bodyW * 0.76, labelH, size * 0.06);
  fillAndOutline(ctx, "#eff6ff", "rgba(15, 23, 42, 0.65)");

  const hubX = bodyX + bodyW * 0.5;
  const hubY = bodyY + bodyH * 0.68;
  const hubR = bodyW * 0.18;
  const hub = ctx.createRadialGradient(
    hubX - hubR * 0.3,
    hubY - hubR * 0.35,
    hubR * 0.2,
    hubX,
    hubY,
    hubR
  );
  hub.addColorStop(0, "#f8fafc");
  hub.addColorStop(1, "#1d4ed8");
  ctx.beginPath();
  ctx.arc(hubX, hubY, hubR, 0, Math.PI * 2);
  fillAndOutline(ctx, hub);
};

const drawLoadIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });

  const bodyX = x + size * 0.12;
  const bodyY = y + size * 0.34;
  const bodyW = size * 0.76;
  const bodyH = size * 0.44;
  roundedRectPath(ctx, bodyX, bodyY, bodyW, bodyH, size * 0.12);
  const bodyFill = ctx.createLinearGradient(bodyX, bodyY, bodyX, bodyY + bodyH);
  bodyFill.addColorStop(0, "#fef9c3");
  bodyFill.addColorStop(1, "#fbbf24");
  fillAndOutline(ctx, bodyFill);

  const tabX = bodyX + size * 0.04;
  const tabY = y + size * 0.2;
  const tabW = size * 0.36;
  const tabH = size * 0.2;
  roundedRectPath(ctx, tabX, tabY, tabW, tabH, size * 0.08);
  fillAndOutline(ctx, "#fde68a");

  const arrowTop = y + size * 0.14;
  const arrowMid = y + size * 0.44;
  const arrowX = x + size * 0.5;
  ctx.strokeStyle = "#0ea5e9";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(arrowX, arrowTop);
  ctx.lineTo(arrowX, arrowMid);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(arrowX - size * 0.12, arrowMid - size * 0.06);
  ctx.lineTo(arrowX, arrowMid + size * 0.08);
  ctx.lineTo(arrowX + size * 0.12, arrowMid - size * 0.06);
  ctx.stroke();
};

const drawDownloadIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });

  const trayX = x + size * 0.2;
  const trayY = y + size * 0.68;
  const trayW = size * 0.6;
  const trayH = size * 0.16;
  roundedRectPath(ctx, trayX, trayY, trayW, trayH, size * 0.08);
  fillAndOutline(ctx, "#cbd5f5");

  const shaftX = x + size * 0.5;
  const shaftTop = y + size * 0.18;
  const shaftBottom = y + size * 0.62;
  ctx.strokeStyle = "#4f46e5";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(shaftX, shaftTop);
  ctx.lineTo(shaftX, shaftBottom);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(shaftX - size * 0.16, shaftBottom - size * 0.12);
  ctx.lineTo(shaftX, shaftBottom + size * 0.02);
  ctx.lineTo(shaftX + size * 0.16, shaftBottom - size * 0.12);
  ctx.stroke();
};

const drawChevronDownIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });
  const midX = x + size * 0.5;
  const topY = y + size * 0.36;
  const bottomY = y + size * 0.66;
  strokeDualPath(ctx, size * 0.09, size * 0.055, () => {
    ctx.beginPath();
    ctx.moveTo(midX - size * 0.24, topY);
    ctx.lineTo(midX, bottomY);
    ctx.lineTo(midX + size * 0.24, topY);
  });
};

const drawRulerIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  const bodyX = x + size * 0.2;
  const bodyY = y + size * 0.34;
  const bodyW = size * 0.6;
  const bodyH = size * 0.32;
  roundedRectPath(ctx, bodyX, bodyY, bodyW, bodyH, size * 0.08);
  const fill = ctx.createLinearGradient(bodyX, bodyY, bodyX, bodyY + bodyH);
  fill.addColorStop(0, "#fde68a");
  fill.addColorStop(1, "#f59e0b");
  fillAndOutline(ctx, fill, "rgba(120, 53, 15, 0.75)");

  const ticks = 6;
  ctx.save();
  ctx.lineWidth = size * 0.035;
  ctx.strokeStyle = "rgba(120, 53, 15, 0.7)";
  for (let i = 0; i <= ticks; i += 1) {
    const tx = bodyX + (bodyW / ticks) * i;
    const tickH = i % 2 === 0 ? bodyH * 0.55 : bodyH * 0.38;
    ctx.beginPath();
    ctx.moveTo(tx, bodyY + bodyH * 0.15);
    ctx.lineTo(tx, bodyY + bodyH * 0.15 + tickH);
    ctx.stroke();
  }
  ctx.restore();
};

const drawZoomCursorIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });
  const cx = x + size * 0.46;
  const cy = y + size * 0.46;
  const r = size * 0.22;
  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  });

  strokeDualPath(ctx, size * 0.055, size * 0.032, () => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.6);
    ctx.lineTo(cx, cy + r * 0.6);
    ctx.moveTo(cx - r * 0.6, cy);
    ctx.lineTo(cx + r * 0.6, cy);
  });

  const handleFrom = { x: cx + r * 0.7, y: cy + r * 0.7 };
  const handleTo = { x: x + size * 0.78, y: y + size * 0.78 };
  strokeDualPath(ctx, size * 0.08, size * 0.05, () => {
    ctx.beginPath();
    ctx.moveTo(handleFrom.x, handleFrom.y);
    ctx.lineTo(handleTo.x, handleTo.y);
  });
  drawNodeDot(ctx, cx, cy, size * 0.06, {
    inner: "#f8fafc",
    outer: "#38bdf8",
  });
};

const drawInvertZoomIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });
  const cx = x + size * 0.46;
  const cy = y + size * 0.46;
  const r = size * 0.22;
  strokeDualPath(ctx, size * 0.075, size * 0.045, () => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  });

  const top = { x: cx, y: cy - r * 0.65 };
  const bottom = { x: cx, y: cy + r * 0.65 };
  strokeDualPath(ctx, size * 0.06, size * 0.036, () => {
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bottom.x, bottom.y);
  });
  drawArrowHead(ctx, { x: cx, y: cy - r * 0.2 }, top, size);
  drawArrowHead(ctx, { x: cx, y: cy + r * 0.2 }, bottom, size);

  const handleFrom = { x: cx + r * 0.7, y: cy + r * 0.7 };
  const handleTo = { x: x + size * 0.78, y: y + size * 0.78 };
  strokeDualPath(ctx, size * 0.08, size * 0.05, () => {
    ctx.beginPath();
    ctx.moveTo(handleFrom.x, handleFrom.y);
    ctx.lineTo(handleTo.x, handleTo.y);
  });
};

const drawUprightIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  const midX = x + size * 0.5;
  const topY = y + size * 0.18;
  const bottomY = y + size * 0.78;
  strokeDualPath(ctx, size * 0.08, size * 0.05, () => {
    ctx.beginPath();
    ctx.moveTo(midX, topY);
    ctx.lineTo(midX, bottomY);
  });
  drawArrowHead(ctx, { x: midX, y: topY + size * 0.12 }, { x: midX, y: topY }, size);

  strokeDualPath(ctx, size * 0.06, size * 0.035, () => {
    ctx.beginPath();
    ctx.moveTo(midX - size * 0.24, bottomY);
    ctx.lineTo(midX + size * 0.24, bottomY);
  });
  drawNodeDot(ctx, midX, bottomY - size * 0.12, size * 0.06, {
    inner: "#f8fafc",
    outer: "#60a5fa",
  });
};

const drawRunIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });

  const cx = x + size * 0.5;
  const cy = y + size * 0.5;
  const r = size * 0.34;
  const ring = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.2, cx, cy, r);
  ring.addColorStop(0, "#dcfce7");
  ring.addColorStop(1, "#22c55e");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  fillAndOutline(ctx, ring);

  ctx.beginPath();
  ctx.moveTo(cx - size * 0.1, cy - size * 0.14);
  ctx.lineTo(cx + size * 0.18, cy);
  ctx.lineTo(cx - size * 0.1, cy + size * 0.14);
  fillAndOutline(ctx, "#ecfdf5", "rgba(22, 101, 52, 0.9)");
};

const drawCloseIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });

  const cx = x + size * 0.5;
  const cy = y + size * 0.5;
  const r = size * 0.34;
  const ring = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.2, cx, cy, r);
  ring.addColorStop(0, "#fee2e2");
  ring.addColorStop(1, "#ef4444");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  fillAndOutline(ctx, ring);

  ctx.strokeStyle = "#7f1d1d";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.14, cy - size * 0.14);
  ctx.lineTo(cx + size * 0.14, cy + size * 0.14);
  ctx.moveTo(cx + size * 0.14, cy - size * 0.14);
  ctx.lineTo(cx - size * 0.14, cy + size * 0.14);
  ctx.stroke();
};

const drawThemeLightIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });

  const cx = x + size * 0.5;
  const cy = y + size * 0.5;
  const r = size * 0.2;
  const sun = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.2, cx, cy, r);
  sun.addColorStop(0, "#fef9c3");
  sun.addColorStop(1, "#f59e0b");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  fillAndOutline(ctx, sun, "rgba(146, 64, 14, 0.8)");

  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  const ray = size * 0.32;
  const rays = 8;
  for (let i = 0; i < rays; i += 1) {
    const theta = (i / rays) * Math.PI * 2;
    const inner = r + size * 0.06;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(theta) * inner, cy + Math.sin(theta) * inner);
    ctx.lineTo(cx + Math.cos(theta) * ray, cy + Math.sin(theta) * ray);
    ctx.stroke();
  }
};

const drawThemeDarkIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });

  const cx = x + size * 0.52;
  const cy = y + size * 0.5;
  const r = size * 0.28;
  const moon = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.35, r * 0.2, cx, cy, r);
  moon.addColorStop(0, "#e0e7ff");
  moon.addColorStop(1, "#6366f1");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  fillAndOutline(ctx, moon, "rgba(30, 27, 75, 0.9)");

  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(cx + size * 0.12, cy - size * 0.06, r * 0.88, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  const star = (sx: number, sy: number, sr: number) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy - sr);
    ctx.lineTo(sx + sr * 0.32, sy - sr * 0.32);
    ctx.lineTo(sx + sr, sy);
    ctx.lineTo(sx + sr * 0.32, sy + sr * 0.32);
    ctx.lineTo(sx, sy + sr);
    ctx.lineTo(sx - sr * 0.32, sy + sr * 0.32);
    ctx.lineTo(sx - sr, sy);
    ctx.lineTo(sx - sr * 0.32, sy - sr * 0.32);
    ctx.closePath();
    fillAndOutline(ctx, "#fef9c3", "rgba(120, 53, 15, 0.7)");
  };

  star(x + size * 0.24, y + size * 0.28, size * 0.07);
  star(x + size * 0.76, y + size * 0.22, size * 0.05);
};

const drawBrandRoslynIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });

  const pad = size * 0.14;
  const outerSize = size - pad * 2;
  strokeDualPath(ctx, size * 0.085, size * 0.05, () => {
    roundedRectPath(ctx, x + pad, y + pad, outerSize, outerSize, size * 0.18);
  });

  const cx = x + size * 0.5;
  const cy = y + size * 0.52;
  const ring = size * 0.22;
  strokeDualPath(ctx, size * 0.07, size * 0.04, () => {
    ctx.beginPath();
    ctx.arc(cx, cy, ring, 0, Math.PI * 2);
  });

  const diamond = ring * 1.2;
  strokeDualPath(ctx, size * 0.06, size * 0.035, () => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - diamond);
    ctx.lineTo(cx + diamond, cy);
    ctx.lineTo(cx, cy + diamond);
    ctx.lineTo(cx - diamond, cy);
    ctx.closePath();
  }, { outerColor: "rgba(0,0,0,0.4)", innerColor: "rgba(255,255,255,0.7)" });

  setGlyphStroke(ctx, size, 0.05, 0.6);
  const tick = size * 0.16;
  ctx.beginPath();
  ctx.moveTo(cx, cy - ring - tick);
  ctx.lineTo(cx, cy - ring + size * 0.02);
  ctx.moveTo(cx + ring - size * 0.02, cy);
  ctx.lineTo(cx + ring + tick, cy);
  ctx.moveTo(cx, cy + ring - size * 0.02);
  ctx.lineTo(cx, cy + ring + tick);
  ctx.moveTo(cx - ring + size * 0.02, cy);
  ctx.lineTo(cx - ring - tick, cy);
  ctx.stroke();

  drawGlyphDot(ctx, cx, cy, size * 0.075, 1);
};

const drawBrandNumericaIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });

  const nodes = [
    { x: x + size * 0.28, y: y + size * 0.3, color: "#38bdf8" },
    { x: x + size * 0.72, y: y + size * 0.3, color: "#22c55e" },
    { x: x + size * 0.5, y: y + size * 0.7, color: "#f97316" },
  ] as const;

  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(nodes[0].x, nodes[0].y);
  ctx.lineTo(nodes[2].x, nodes[2].y);
  ctx.lineTo(nodes[1].x, nodes[1].y);
  ctx.stroke();

  nodes.forEach((node) => {
    drawNodeDot(ctx, node.x, node.y, size * 0.12, {
      inner: "#f8fafc",
      outer: node.color,
    });
  });
};

const drawPruneIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });

  ctx.strokeStyle = "#166534";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.28, y + size * 0.78);
  ctx.lineTo(x + size * 0.44, y + size * 0.54);
  ctx.lineTo(x + size * 0.36, y + size * 0.28);
  ctx.stroke();

  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(x + size * 0.44, y + size * 0.54);
  ctx.lineTo(x + size * 0.68, y + size * 0.38);
  ctx.stroke();

  const scissorX = x + size * 0.68;
  const scissorY = y + size * 0.36;
  drawNodeDot(ctx, scissorX, scissorY, size * 0.12, {
    inner: "#fef2f2",
    outer: "#ef4444",
  });
  ctx.strokeStyle = "#991b1b";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(scissorX - size * 0.16, scissorY - size * 0.02);
  ctx.lineTo(scissorX + size * 0.02, scissorY - size * 0.18);
  ctx.moveTo(scissorX - size * 0.16, scissorY + size * 0.02);
  ctx.lineTo(scissorX + size * 0.02, scissorY + size * 0.18);
  ctx.stroke();
};

const drawEyeShape = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number
) => {
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy);
  ctx.quadraticCurveTo(cx - rx * 0.4, cy - ry, cx, cy - ry);
  ctx.quadraticCurveTo(cx + rx * 0.4, cy - ry, cx + rx, cy);
  ctx.quadraticCurveTo(cx + rx * 0.4, cy + ry, cx, cy + ry);
  ctx.quadraticCurveTo(cx - rx * 0.4, cy + ry, cx - rx, cy);
  ctx.closePath();
};

const drawShowIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });

  const cx = x + size * 0.5;
  const cy = y + size * 0.52;
  const rx = size * 0.34;
  const ry = size * 0.22;

  drawEyeShape(ctx, cx, cy, rx, ry);
  const fill = ctx.createLinearGradient(x, y + size * 0.28, x, y + size * 0.76);
  fill.addColorStop(0, "#e0f2fe");
  fill.addColorStop(1, "#7dd3fc");
  fillAndOutline(ctx, fill);

  const iris = ctx.createRadialGradient(
    cx - size * 0.06,
    cy - size * 0.08,
    size * 0.04,
    cx,
    cy,
    size * 0.16
  );
  iris.addColorStop(0, "#f8fafc");
  iris.addColorStop(1, "#0ea5e9");
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.16, 0, Math.PI * 2);
  fillAndOutline(ctx, iris);
};

const drawHideIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawShowIcon(ctx, x, y, size);
  ctx.strokeStyle = "#b91c1c";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.22, y + size * 0.78);
  ctx.lineTo(x + size * 0.78, y + size * 0.22);
  ctx.stroke();
};

const drawLockBody = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  open: boolean
) => {
  const bodyX = x + size * 0.22;
  const bodyY = y + size * 0.44;
  const bodyW = size * 0.56;
  const bodyH = size * 0.42;
  roundedRectPath(ctx, bodyX, bodyY, bodyW, bodyH, size * 0.12);
  const fill = ctx.createLinearGradient(bodyX, bodyY, bodyX, bodyY + bodyH);
  fill.addColorStop(0, "#fef9c3");
  fill.addColorStop(1, "#f59e0b");
  fillAndOutline(ctx, fill, "rgba(120, 53, 15, 0.86)");

  const shackleR = size * 0.24;
  const shackleCx = x + size * 0.5;
  const shackleCy = y + size * 0.44;
  ctx.strokeStyle = open ? "#0ea5e9" : "#1d4ed8";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(shackleCx, shackleCy, shackleR, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();
  if (open) {
    ctx.beginPath();
    ctx.moveTo(shackleCx + shackleR * 0.8, shackleCy - shackleR * 0.2);
    ctx.lineTo(shackleCx + shackleR * 1.05, shackleCy - shackleR * 0.55);
    ctx.stroke();
  }

  const keyX = x + size * 0.5;
  const keyY = y + size * 0.64;
  drawNodeDot(ctx, keyX, keyY, size * 0.09, {
    inner: "#fefce8",
    outer: "#92400e",
  });
};

const drawLockIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  drawLockBody(ctx, x, y, size, false);
};

const drawUnlockIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  drawLockBody(ctx, x, y, size, true);
};

const drawScriptIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });

  const docX = x + size * 0.2;
  const docY = y + size * 0.14;
  const docW = size * 0.6;
  const docH = size * 0.72;
  roundedRectPath(ctx, docX, docY, docW, docH, size * 0.12);
  const docFill = ctx.createLinearGradient(docX, docY, docX, docY + docH);
  docFill.addColorStop(0, "#f8fafc");
  docFill.addColorStop(1, "#e2e8f0");
  fillAndOutline(ctx, docFill);

  const foldSize = size * 0.18;
  ctx.beginPath();
  ctx.moveTo(docX + docW - foldSize, docY);
  ctx.lineTo(docX + docW, docY);
  ctx.lineTo(docX + docW, docY + foldSize);
  ctx.closePath();
  fillAndOutline(ctx, "#cbd5f5", "rgba(30, 41, 59, 0.6)");

  ctx.strokeStyle = "#0ea5e9";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  const lineX = docX + docW * 0.18;
  const lineW = docW * 0.64;
  const lines = 4;
  for (let i = 0; i < lines; i += 1) {
    const yPos = docY + docH * (0.24 + i * 0.16);
    ctx.beginPath();
    ctx.moveTo(lineX, yPos);
    ctx.lineTo(lineX + lineW, yPos);
    ctx.stroke();
  }
};

const drawInterpolateIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });

  const points = [
    { x: x + size * 0.18, y: y + size * 0.7 },
    { x: x + size * 0.38, y: y + size * 0.34 },
    { x: x + size * 0.64, y: y + size * 0.62 },
    { x: x + size * 0.84, y: y + size * 0.28 },
  ] as const;

  ctx.strokeStyle = "#0ea5e9";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  ctx.bezierCurveTo(
    x + size * 0.26,
    y + size * 0.12,
    x + size * 0.62,
    y + size * 0.92,
    points[3].x,
    points[3].y
  );
  ctx.stroke();

  points.forEach((pt, index) => {
    drawNodeDot(ctx, pt.x, pt.y, size * (index === 0 || index === points.length - 1 ? 0.1 : 0.09), {
      inner: "#f8fafc",
      outer: index % 2 === 0 ? "#38bdf8" : "#22c55e",
    });
  });
};

const drawMathBadge = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colors: { top: string; bottom: string }
) => {
  void colors;
  const pad = size * 0.18;
  const w = size - pad * 2;
  const h = size - pad * 2;
  roundedRectPath(ctx, x + pad, y + pad, w, h, size * 0.12);
  setGlyphStroke(ctx, size, 0.07, 0.35);
  ctx.stroke();
};

const strokeMathSymbol = (
  ctx: CanvasRenderingContext2D,
  size: number,
  drawPath: () => void
) => {
  ctx.save();
  setGlyphStroke(ctx, size, 0.1, 0.92);
  drawPath();
  ctx.stroke();
  ctx.restore();
};

const drawNumberConstantIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  ctx.save();
  setGlyphFill(ctx, 0.95);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.round(size * 0.52)}px "Proxima Nova", "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText("1", x + size * 0.5, y + size * 0.55);
  ctx.restore();
};

const drawAddIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const cx = x + size * 0.5;
  const cy = y + size * 0.54;
  const r = size * 0.26;
  strokeMathSymbol(ctx, size, () => {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
  });
};

const drawSubtractIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const cx = x + size * 0.5;
  const cy = y + size * 0.54;
  const r = size * 0.3;
  strokeMathSymbol(ctx, size, () => {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
  });
};

const drawMultiplyIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const cx = x + size * 0.5;
  const cy = y + size * 0.54;
  const r = size * 0.28;
  strokeMathSymbol(ctx, size, () => {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r);
    ctx.lineTo(cx + r, cy + r);
    ctx.moveTo(cx + r, cy - r);
    ctx.lineTo(cx - r, cy + r);
  });
};

const drawDivideDots = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  offset: number
) => {
  const cx = x + size * 0.5;
  drawGlyphDot(ctx, cx, y + size * offset, size * 0.055, 0.95);
};

const drawDivideIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const cx = x + size * 0.5;
  const cy = y + size * 0.54;
  const r = size * 0.28;
  strokeMathSymbol(ctx, size, () => {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
  });
  drawDivideDots(ctx, x, y, size, 0.36);
  drawDivideDots(ctx, x, y, size, 0.72);
};

const drawClampIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const left = x + size * 0.28;
  const right = x + size * 0.72;
  const top = y + size * 0.34;
  const bottom = y + size * 0.76;
  const mid = y + size * 0.55;
  strokeMathSymbol(ctx, size, () => {
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom);
    ctx.moveTo(left, top);
    ctx.lineTo(left + size * 0.1, top);
    ctx.moveTo(left, bottom);
    ctx.lineTo(left + size * 0.1, bottom);
    ctx.moveTo(right, top);
    ctx.lineTo(right, bottom);
    ctx.moveTo(right, top);
    ctx.lineTo(right - size * 0.1, top);
    ctx.moveTo(right, bottom);
    ctx.lineTo(right - size * 0.1, bottom);
    ctx.moveTo(left + size * 0.12, mid);
    ctx.lineTo(right - size * 0.12, mid);
  });
};

const drawMinIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const left = { x: x + size * 0.24, y: y + size * 0.38 };
  const center = { x: x + size * 0.5, y: y + size * 0.72 };
  const right = { x: x + size * 0.76, y: y + size * 0.38 };
  strokeMathSymbol(ctx, size, () => {
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(center.x, center.y);
    ctx.lineTo(right.x, right.y);
  });
};

const drawMaxIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const left = { x: x + size * 0.24, y: y + size * 0.72 };
  const center = { x: x + size * 0.5, y: y + size * 0.34 };
  const right = { x: x + size * 0.76, y: y + size * 0.72 };
  strokeMathSymbol(ctx, size, () => {
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(center.x, center.y);
    ctx.lineTo(right.x, right.y);
  });
};

const drawExpressionIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  ctx.save();
  setGlyphFill(ctx, 0.95);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.round(size * 0.34)}px "Proxima Nova", "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText("f(x)", x + size * 0.5, y + size * 0.56);
  ctx.restore();
};

const drawConditionalIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const origin = { x: x + size * 0.5, y: y + size * 0.36 };
  const left = { x: x + size * 0.28, y: y + size * 0.74 };
  const right = { x: x + size * 0.72, y: y + size * 0.74 };
  strokeMathSymbol(ctx, size, () => {
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(origin.x, y + size * 0.56);
    ctx.lineTo(left.x, left.y);
    ctx.moveTo(origin.x, y + size * 0.56);
    ctx.lineTo(right.x, right.y);
  });
  drawGlyphDot(ctx, origin.x, origin.y, size * 0.08, 0.95);
};

const drawVectorBadge = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colors: { top: string; bottom: string }
) => {
  drawMathBadge(ctx, x, y, size, colors);
};

const drawArrowHead = (
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  size: number
) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= 1e-5) return;
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;
  const headLength = size * 0.16;
  const headWidth = size * 0.1;
  const baseX = to.x - ux * headLength;
  const baseY = to.y - uy * headLength;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(baseX + px * headWidth, baseY + py * headWidth);
  ctx.lineTo(baseX - px * headWidth, baseY - py * headWidth);
  ctx.closePath();
  setGlyphFill(ctx, 0.95);
  ctx.fill();
  ctx.restore();
};

const drawVectorArrow = (
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  size: number
) => {
  drawGlyphArrow(ctx, start, end, size, 0.9);
};

const drawOriginIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawVectorBadge(ctx, x, y, size, { top: "#e2e8f0", bottom: "#64748b" });
  const center = { x: x + size * 0.5, y: y + size * 0.56 };
  setGlyphStroke(ctx, size, 0.095, 0.9);
  ctx.beginPath();
  ctx.moveTo(center.x - size * 0.18, center.y);
  ctx.lineTo(center.x + size * 0.18, center.y);
  ctx.moveTo(center.x, center.y - size * 0.18);
  ctx.lineTo(center.x, center.y + size * 0.18);
  ctx.stroke();
  drawGlyphDot(ctx, center.x, center.y, size * 0.085, 0.95);
};

const drawUnitXIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawVectorBadge(ctx, x, y, size, { top: "#fecaca", bottom: "#ef4444" });
  const center = { x: x + size * 0.32, y: y + size * 0.56 };
  const end = { x: x + size * 0.78, y: y + size * 0.56 };
  drawGlyphDot(ctx, center.x, center.y, size * 0.08, 0.95);
  drawVectorArrow(ctx, center, end, size * 0.95);
};

const drawUnitYIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawVectorBadge(ctx, x, y, size, { top: "#bbf7d0", bottom: "#22c55e" });
  const center = { x: x + size * 0.5, y: y + size * 0.76 };
  const end = { x: x + size * 0.5, y: y + size * 0.3 };
  drawGlyphDot(ctx, center.x, center.y, size * 0.08, 0.95);
  drawVectorArrow(ctx, center, end, size * 0.95);
};

const drawUnitZIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawVectorBadge(ctx, x, y, size, { top: "#bfdbfe", bottom: "#2563eb" });
  const center = { x: x + size * 0.32, y: y + size * 0.7 };
  const end = { x: x + size * 0.78, y: y + size * 0.32 };
  drawGlyphDot(ctx, center.x, center.y, size * 0.08, 0.95);
  drawVectorArrow(ctx, center, end, size * 0.95);
};

const drawUnitXYZIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawVectorBadge(ctx, x, y, size, { top: "#ddd6fe", bottom: "#7c3aed" });
  const center = { x: x + size * 0.44, y: y + size * 0.62 };
  drawGlyphDot(ctx, center.x, center.y, size * 0.08, 0.95);
  drawVectorArrow(ctx, center, { x: x + size * 0.78, y: y + size * 0.58 }, size * 0.85);
  drawVectorArrow(ctx, center, { x: x + size * 0.5, y: y + size * 0.28 }, size * 0.85);
  drawVectorArrow(ctx, center, { x: x + size * 0.72, y: y + size * 0.34 }, size * 0.85);
};

const drawMirrorVectorIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawVectorBadge(ctx, x, y, size, { top: "#ccfbf1", bottom: "#14b8a6" });
  const mirrorStart = { x: x + size * 0.28, y: y + size * 0.78 };
  const mirrorEnd = { x: x + size * 0.78, y: y + size * 0.28 };
  setGlyphStroke(ctx, size, 0.08, 0.65);
  ctx.beginPath();
  ctx.moveTo(mirrorStart.x, mirrorStart.y);
  ctx.lineTo(mirrorEnd.x, mirrorEnd.y);
  ctx.stroke();

  const hitPoint = { x: x + size * 0.52, y: y + size * 0.52 };
  drawVectorArrow(
    ctx,
    { x: x + size * 0.24, y: y + size * 0.34 },
    hitPoint,
    size * 0.9
  );
  drawVectorArrow(
    ctx,
    hitPoint,
    { x: x + size * 0.78, y: y + size * 0.72 },
    size * 0.9
  );
  drawGlyphDot(ctx, hitPoint.x, hitPoint.y, size * 0.07, 0.95);
};

const drawVectorConstructIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawVectorBadge(ctx, x, y, size, { top: "#a5f3fc", bottom: "#0284c7" });
  const p1 = { x: x + size * 0.28, y: y + size * 0.7 };
  const p2 = { x: x + size * 0.28, y: y + size * 0.48 };
  const p3 = { x: x + size * 0.28, y: y + size * 0.26 };
  [p1, p2, p3].forEach((point) =>
    drawGlyphDot(ctx, point.x, point.y, size * 0.06, 0.9)
  );
  drawVectorArrow(
    ctx,
    { x: x + size * 0.38, y: y + size * 0.52 },
    { x: x + size * 0.78, y: y + size * 0.42 },
    size
  );
};

const drawVectorDeconstructIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawVectorBadge(ctx, x, y, size, { top: "#bbf7d0", bottom: "#16a34a" });
  const source = { x: x + size * 0.26, y: y + size * 0.46 };
  drawVectorArrow(ctx, source, { x: x + size * 0.52, y: y + size * 0.46 }, size);
  const outputs = [
    { x: x + size * 0.76, y: y + size * 0.28 },
    { x: x + size * 0.76, y: y + size * 0.48 },
    { x: x + size * 0.76, y: y + size * 0.68 },
  ];
  outputs.forEach((target) => {
    setGlyphStroke(ctx, size, 0.075, 0.7);
    ctx.beginPath();
    ctx.moveTo(x + size * 0.52, y + size * 0.46);
    ctx.lineTo(target.x - size * 0.08, target.y);
    ctx.stroke();
    drawGlyphDot(ctx, target.x, target.y, size * 0.06, 0.9);
  });
};

const drawVectorAddIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawVectorBadge(ctx, x, y, size, { top: "#bae6fd", bottom: "#2563eb" });
  drawVectorArrow(
    ctx,
    { x: x + size * 0.22, y: y + size * 0.3 },
    { x: x + size * 0.52, y: y + size * 0.46 },
    size
  );
  drawVectorArrow(
    ctx,
    { x: x + size * 0.22, y: y + size * 0.68 },
    { x: x + size * 0.52, y: y + size * 0.52 },
    size
  );
  drawVectorArrow(
    ctx,
    { x: x + size * 0.48, y: y + size * 0.5 },
    { x: x + size * 0.82, y: y + size * 0.5 },
    size
  );
};

const drawVectorSubtractIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawVectorBadge(ctx, x, y, size, { top: "#fbcfe8", bottom: "#be185d" });
  drawVectorArrow(
    ctx,
    { x: x + size * 0.22, y: y + size * 0.3 },
    { x: x + size * 0.78, y: y + size * 0.3 },
    size
  );
  setGlyphStroke(ctx, size, 0.095, 0.9);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.28, y + size * 0.7);
  ctx.lineTo(x + size * 0.64, y + size * 0.7);
  ctx.stroke();
  drawVectorArrow(
    ctx,
    { x: x + size * 0.46, y: y + size * 0.5 },
    { x: x + size * 0.82, y: y + size * 0.5 },
    size
  );
};

const drawVectorScaleIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawVectorBadge(ctx, x, y, size, { top: "#fde68a", bottom: "#d97706" });
  const center = { x: x + size * 0.36, y: y + size * 0.6 };
  drawVectorArrow(ctx, center, { x: x + size * 0.76, y: y + size * 0.36 }, size);
  setGlyphStroke(ctx, size, 0.085, 0.9);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.18, y + size * 0.26);
  ctx.lineTo(x + size * 0.34, y + size * 0.26);
  ctx.moveTo(x + size * 0.26, y + size * 0.18);
  ctx.lineTo(x + size * 0.26, y + size * 0.34);
  ctx.stroke();
};

const drawVectorLengthIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawVectorBadge(ctx, x, y, size, { top: "#d9f99d", bottom: "#65a30d" });
  const start = { x: x + size * 0.22, y: y + size * 0.68 };
  const end = { x: x + size * 0.78, y: y + size * 0.36 };
  drawVectorArrow(ctx, start, end, size);
  setGlyphStroke(ctx, size, 0.075, 0.7);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y + size * 0.06);
  ctx.lineTo(start.x, start.y - size * 0.06);
  ctx.moveTo(end.x, end.y + size * 0.06);
  ctx.lineTo(end.x, end.y - size * 0.06);
  ctx.stroke();
};

const drawVectorNormalizeIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawVectorBadge(ctx, x, y, size, { top: "#e9d5ff", bottom: "#7c3aed" });
  const center = { x: x + size * 0.64, y: y + size * 0.5 };
  setGlyphStroke(ctx, size, 0.085, 0.9);
  ctx.beginPath();
  ctx.arc(center.x, center.y, size * 0.18, 0, Math.PI * 2);
  ctx.stroke();
  drawVectorArrow(
    ctx,
    { x: x + size * 0.26, y: y + size * 0.68 },
    { x: center.x + size * 0.14, y: center.y - size * 0.04 },
    size
  );
};

const drawVectorDotIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawVectorBadge(ctx, x, y, size, { top: "#fecaca", bottom: "#dc2626" });
  const mid = { x: x + size * 0.5, y: y + size * 0.5 };
  drawVectorArrow(
    ctx,
    { x: x + size * 0.2, y: y + size * 0.3 },
    { x: mid.x - size * 0.06, y: mid.y - size * 0.06 },
    size
  );
  drawVectorArrow(
    ctx,
    { x: x + size * 0.2, y: y + size * 0.7 },
    { x: mid.x - size * 0.06, y: mid.y + size * 0.06 },
    size
  );
  drawGlyphDot(ctx, mid.x, mid.y, size * 0.09, 0.95);
  drawVectorArrow(
    ctx,
    { x: mid.x + size * 0.02, y: mid.y },
    { x: x + size * 0.82, y: y + size * 0.5 },
    size
  );
};

const drawVectorCrossIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawVectorBadge(ctx, x, y, size, { top: "#99f6e4", bottom: "#0d9488" });
  drawVectorArrow(
    ctx,
    { x: x + size * 0.22, y: y + size * 0.7 },
    { x: x + size * 0.54, y: y + size * 0.38 },
    size
  );
  drawVectorArrow(
    ctx,
    { x: x + size * 0.22, y: y + size * 0.3 },
    { x: x + size * 0.54, y: y + size * 0.62 },
    size
  );
  drawVectorArrow(
    ctx,
    { x: x + size * 0.58, y: y + size * 0.52 },
    { x: x + size * 0.82, y: y + size * 0.26 },
    size
  );
};

const drawDistanceIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawVectorBadge(ctx, x, y, size, { top: "#c7d2fe", bottom: "#4f46e5" });
  const left = { x: x + size * 0.26, y: y + size * 0.62 };
  const right = { x: x + size * 0.76, y: y + size * 0.36 };
  drawGlyphDot(ctx, left.x, left.y, size * 0.075, 0.95);
  drawGlyphDot(ctx, right.x, right.y, size * 0.075, 0.95);
  setGlyphStroke(ctx, size, 0.085, 0.9);
  ctx.beginPath();
  ctx.moveTo(left.x + size * 0.06, left.y - size * 0.06);
  ctx.lineTo(right.x - size * 0.06, right.y + size * 0.06);
  ctx.stroke();
  setGlyphStroke(ctx, size, 0.07, 0.7);
  ctx.beginPath();
  ctx.moveTo(left.x + size * 0.02, left.y + size * 0.12);
  ctx.lineTo(left.x + size * 0.02, left.y - size * 0.04);
  ctx.moveTo(right.x - size * 0.02, right.y + size * 0.04);
  ctx.lineTo(right.x - size * 0.02, right.y - size * 0.12);
  ctx.stroke();
};

const drawVectorFromPointsIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawVectorBadge(ctx, x, y, size, { top: "#bfdbfe", bottom: "#1d4ed8" });
  const start = { x: x + size * 0.26, y: y + size * 0.7 };
  const end = { x: x + size * 0.78, y: y + size * 0.34 };
  drawGlyphDot(ctx, start.x, start.y, size * 0.08, 0.95);
  drawGlyphDot(ctx, end.x, end.y, size * 0.08, 0.95);
  drawVectorArrow(ctx, start, end, size);
};

const drawVectorAngleIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawVectorBadge(ctx, x, y, size, { top: "#dbeafe", bottom: "#2563eb" });
  const origin = { x: x + size * 0.3, y: y + size * 0.68 };
  const endA = { x: x + size * 0.78, y: y + size * 0.66 };
  const endB = { x: x + size * 0.74, y: y + size * 0.24 };

  drawVectorArrow(ctx, origin, endA, size);
  drawVectorArrow(ctx, origin, endB, size);
  drawGlyphDot(ctx, origin.x, origin.y, size * 0.07, 0.95);

  const radius = size * 0.26;
  const startAngle = -0.04 * Math.PI;
  const endAngle = -0.48 * Math.PI;
  setGlyphStroke(ctx, size, 0.07, 0.7);
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, radius, startAngle, endAngle, true);
  ctx.stroke();
  drawGlyphArrowHead(
    ctx,
    origin.x + Math.cos(endAngle) * radius,
    origin.y + Math.sin(endAngle) * radius,
    endAngle - Math.PI * 0.5,
    size,
    0.85
  );
};

const drawVectorLerpIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawVectorBadge(ctx, x, y, size, { top: "#bae6fd", bottom: "#0284c7" });
  const left = { x: x + size * 0.24, y: y + size * 0.68 };
  const right = { x: x + size * 0.8, y: y + size * 0.34 };
  const t = 0.58;
  const mid = {
    x: left.x + (right.x - left.x) * t,
    y: left.y + (right.y - left.y) * t,
  };

  setGlyphStroke(ctx, size, 0.085, 0.9);
  ctx.beginPath();
  ctx.moveTo(left.x + size * 0.06, left.y - size * 0.06);
  ctx.lineTo(right.x - size * 0.06, right.y + size * 0.06);
  ctx.stroke();

  drawGlyphDot(ctx, left.x, left.y, size * 0.075, 0.95);
  drawGlyphDot(ctx, right.x, right.y, size * 0.075, 0.95);
  drawGlyphDot(ctx, mid.x, mid.y, size * 0.08, 0.95);
};

const drawVectorProjectIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawVectorBadge(ctx, x, y, size, { top: "#c4b5fd", bottom: "#6d28d9" });
  const origin = { x: x + size * 0.26, y: y + size * 0.72 };
  const axisEnd = { x: x + size * 0.82, y: y + size * 0.72 };
  const vectorEnd = { x: x + size * 0.68, y: y + size * 0.24 };
  const projection = { x: vectorEnd.x, y: axisEnd.y };

  drawVectorArrow(ctx, origin, axisEnd, size);
  drawVectorArrow(ctx, origin, vectorEnd, size);

  ctx.save();
  ctx.setLineDash([size * 0.06, size * 0.05]);
  setGlyphStroke(ctx, size, 0.07, 0.6);
  ctx.beginPath();
  ctx.moveTo(vectorEnd.x, vectorEnd.y);
  ctx.lineTo(projection.x, projection.y);
  ctx.stroke();
  ctx.restore();

  drawVectorArrow(ctx, { x: origin.x + size * 0.14, y: axisEnd.y }, projection, size);
  drawGlyphDot(ctx, projection.x, projection.y, size * 0.07, 0.95);
};

const drawMovePointIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawVectorBadge(ctx, x, y, size, { top: "#bbf7d0", bottom: "#16a34a" });
  const start = { x: x + size * 0.26, y: y + size * 0.64 };
  const end = { x: x + size * 0.8, y: y + size * 0.38 };
  drawGlyphDot(ctx, start.x, start.y, size * 0.08, 0.95);
  drawVectorArrow(ctx, start, end, size);
  drawGlyphDot(ctx, end.x, end.y, size * 0.08, 0.95);
};

const drawMovePointByVectorIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawVectorBadge(ctx, x, y, size, { top: "#a7f3d0", bottom: "#0d9488" });
  const point = { x: x + size * 0.28, y: y + size * 0.66 };
  const offsetEnd = { x: x + size * 0.76, y: y + size * 0.32 };
  const ghost = { x: x + size * 0.52, y: y + size * 0.5 };

  drawGlyphDot(ctx, point.x, point.y, size * 0.08, 0.95);

  ctx.save();
  ctx.setLineDash([size * 0.05, size * 0.045]);
  drawGlyphArrow(ctx, point, ghost, size * 0.92, 0.6);
  ctx.restore();

  drawVectorArrow(ctx, point, offsetEnd, size);
  drawGlyphDot(ctx, offsetEnd.x, offsetEnd.y, size * 0.075, 0.95);
};

const drawRotateVectorAxisIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawVectorBadge(ctx, x, y, size, { top: "#fed7aa", bottom: "#ea580c" });
  const center = { x: x + size * 0.5, y: y + size * 0.52 };
  const vectorEnd = { x: x + size * 0.78, y: y + size * 0.36 };
  drawVectorArrow(ctx, center, vectorEnd, size * 0.96);
  drawGlyphDot(ctx, center.x, center.y, size * 0.07, 0.95);

  const radius = size * 0.26;
  const arcStart = -0.18 * Math.PI;
  const arcEnd = 0.7 * Math.PI;
  drawGlyphArcArrow(ctx, center.x, center.y, radius, arcStart, arcEnd, size, 0.75);
};

const strokeDualPath = (
  ctx: CanvasRenderingContext2D,
  outerWidth: number,
  innerWidth: number,
  drawPath: () => void,
  options?: { outerColor?: string; innerColor?: string; dash?: number[] }
) => {
  const outerColor = options?.outerColor ?? "rgba(15, 23, 42, 0.52)";
  const innerColor = options?.innerColor ?? "#f8fafc";
  const resolvedOuter = clampStrokeWidth(outerWidth, 1);
  let resolvedInner = clampStrokeWidth(innerWidth, 1);
  if (resolvedInner >= resolvedOuter) {
    resolvedInner = Math.max(1, resolvedOuter - 1);
  }
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (options?.dash) {
    ctx.setLineDash(options.dash);
  }
  ctx.lineWidth = resolvedOuter;
  ctx.strokeStyle = outerColor;
  drawPath();
  ctx.stroke();
  ctx.lineWidth = resolvedInner;
  ctx.strokeStyle = innerColor;
  drawPath();
  ctx.stroke();
  ctx.restore();
};

const drawListBadge = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colors: { top: string; bottom: string } = { top: "#e0e7ff", bottom: "#4f46e5" }
) => {
  drawMathBadge(ctx, x, y, size, colors);
};

const drawListRows = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const padX = size * 0.28;
  const padY = size * 0.28;
  const rowHeight = size * 0.08;
  const gap = size * 0.075;
  const rowWidth = size - padX * 2;
  const rows: Array<{ x: number; y: number; width: number; height: number }> = [];

  for (let i = 0; i < 4; i += 1) {
    const rowY = y + padY + i * (rowHeight + gap);
    const row = { x: x + padX, y: rowY, width: rowWidth, height: rowHeight };
    rows.push(row);
    setGlyphStroke(ctx, size, 0.055, 0.55);
    ctx.beginPath();
    ctx.moveTo(row.x, row.y + row.height * 0.5);
    ctx.lineTo(row.x + row.width, row.y + row.height * 0.5);
    ctx.stroke();
    drawGlyphDot(ctx, row.x - size * 0.06, row.y + row.height * 0.5, size * 0.045, 0.8);
  }

  return { rows, gap };
};

const drawListCreateIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawListBadge(ctx, x, y, size);
  drawListRows(ctx, x, y, size);
  const cx = x + size * 0.76;
  const cy = y + size * 0.28;
  const r = size * 0.085;
  strokeMathSymbol(ctx, size * 0.55, () => {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
  });
};

const drawListLengthIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawListBadge(ctx, x, y, size);
  const { rows } = drawListRows(ctx, x, y, size);
  const rulerX = x + size * 0.8;
  const top = rows[0].y - size * 0.035;
  const bottom = rows[rows.length - 1].y + rows[rows.length - 1].height + size * 0.035;
  const tick = size * 0.05;
  strokeDualPath(
    ctx,
    size * 0.065,
    size * 0.042,
    () => {
      ctx.beginPath();
      ctx.moveTo(rulerX, top);
      ctx.lineTo(rulerX, bottom);
      const marks = 4;
      for (let i = 1; i < marks; i += 1) {
        const t = i / marks;
        const yMark = top + (bottom - top) * t;
        ctx.moveTo(rulerX - tick * (i % 2 === 0 ? 0.7 : 1), yMark);
        ctx.lineTo(rulerX + tick * 0.35, yMark);
      }
    }
  );
};

const drawListItemIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawListBadge(ctx, x, y, size);
  const { rows } = drawListRows(ctx, x, y, size);
  const focusRow = rows[1];
  roundedRectPath(
    ctx,
    focusRow.x - size * 0.02,
    focusRow.y - size * 0.02,
    focusRow.width + size * 0.04,
    focusRow.height + size * 0.04,
    focusRow.height * 0.6
  );
  setGlyphStroke(ctx, size, 0.06, 0.8);
  ctx.stroke();
  drawGlyphDot(
    ctx,
    focusRow.x - size * 0.06,
    focusRow.y + focusRow.height * 0.5,
    size * 0.06,
    0.95
  );
};

const drawListIndexOfIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawListBadge(ctx, x, y, size);
  drawListRows(ctx, x, y, size);
  const center = { x: x + size * 0.72, y: y + size * 0.32 };
  const radius = size * 0.12;
  strokeDualPath(ctx, size * 0.065, size * 0.042, () => {
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.moveTo(center.x + radius * 0.55, center.y + radius * 0.55);
    ctx.lineTo(center.x + radius * 1.25, center.y + radius * 1.25);
  });
};

const drawListPartitionIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawListBadge(ctx, x, y, size);
  const { rows, gap } = drawListRows(ctx, x, y, size);
  const pad = size * 0.02;
  const groupHeight =
    rows[1].y + rows[1].height - rows[0].y + gap * 0.4 + pad * 2;

  const drawGroup = (rowIndex: number) => {
    const row = rows[rowIndex];
    strokeDualPath(
      ctx,
      size * 0.055,
      size * 0.035,
      () => {
        ctx.beginPath();
        roundedRectPath(
          ctx,
          row.x - pad,
          row.y - pad,
          row.width + pad * 2,
          groupHeight,
          size * 0.06
        );
      },
      {
        dash: [size * 0.055, size * 0.045],
        outerColor: "rgba(30, 64, 175, 0.55)",
        innerColor: "#eef2ff",
      }
    );
  };

  drawGroup(0);
  drawGroup(2);
};

const drawListFlattenIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawListBadge(ctx, x, y, size);
  const { rows } = drawListRows(ctx, x, y, size);
  const indentWidth = size * 0.09;
  const indentX = rows[0].x - indentWidth - size * 0.015;

  [rows[0], rows[1]].forEach((row, index) => {
    ctx.save();
    roundedRectPath(
      ctx,
      indentX + index * size * 0.015,
      row.y + row.height * 0.1,
      indentWidth,
      row.height * 0.8,
      row.height * 0.35
    );
    ctx.fillStyle = index === 0 ? "#c7d2fe" : "#a5b4fc";
    ctx.fill();
    ctx.lineWidth = size * 0.018;
    ctx.strokeStyle = "rgba(15, 23, 42, 0.25)";
    ctx.stroke();
    ctx.restore();
  });

  const arrowStart = { x: indentX + indentWidth * 0.6, y: rows[1].y + rows[1].height * 0.5 };
  const arrowEnd = { x: rows[3].x + rows[3].width, y: rows[2].y + rows[2].height * 0.5 };
  drawVectorArrow(ctx, arrowStart, arrowEnd, size * 0.9);
};

const drawListSliceIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawListBadge(ctx, x, y, size);
  drawListRows(ctx, x, y, size);
  const cutStart = { x: x + size * 0.22, y: y + size * 0.34 };
  const cutEnd = { x: x + size * 0.82, y: y + size * 0.78 };
  strokeDualPath(ctx, size * 0.07, size * 0.045, () => {
    ctx.beginPath();
    ctx.moveTo(cutStart.x, cutStart.y);
    ctx.lineTo(cutEnd.x, cutEnd.y);
  });

  const scissorCenter = { x: x + size * 0.52, y: y + size * 0.54 };
  const handleOffset = size * 0.06;
  drawNodeDot(ctx, scissorCenter.x - handleOffset, scissorCenter.y - handleOffset, size * 0.045, {
    inner: "#eef2ff",
    outer: "#4f46e5",
  });
  drawNodeDot(ctx, scissorCenter.x + handleOffset, scissorCenter.y + handleOffset, size * 0.045, {
    inner: "#eef2ff",
    outer: "#4f46e5",
  });
  strokeDualPath(ctx, size * 0.06, size * 0.038, () => {
    ctx.beginPath();
    ctx.moveTo(scissorCenter.x - handleOffset * 0.2, scissorCenter.y - handleOffset * 0.2);
    ctx.lineTo(scissorCenter.x + handleOffset * 1.4, scissorCenter.y - handleOffset * 1.1);
    ctx.moveTo(scissorCenter.x + handleOffset * 0.2, scissorCenter.y + handleOffset * 0.2);
    ctx.lineTo(scissorCenter.x - handleOffset * 1.4, scissorCenter.y + handleOffset * 1.1);
  });
};

const drawListReverseIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawListBadge(ctx, x, y, size);
  const { rows } = drawListRows(ctx, x, y, size);
  const topArrowStart = { x: rows[0].x + rows[0].width, y: rows[0].y - size * 0.02 };
  const topArrowEnd = { x: rows[0].x, y: rows[0].y - size * 0.02 };
  const bottomArrowStart = {
    x: rows[rows.length - 1].x,
    y: rows[rows.length - 1].y + rows[rows.length - 1].height + size * 0.02,
  };
  const bottomArrowEnd = {
    x: rows[rows.length - 1].x + rows[rows.length - 1].width,
    y: bottomArrowStart.y,
  };
  drawVectorArrow(ctx, topArrowStart, topArrowEnd, size * 0.9);
  drawVectorArrow(ctx, bottomArrowStart, bottomArrowEnd, size * 0.9);
};

const drawListSumIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawListBadge(ctx, x, y, size);
  drawListRows(ctx, x, y, size);
  const left = x + size * 0.3;
  const right = x + size * 0.7;
  const top = y + size * 0.26;
  const mid = y + size * 0.5;
  const bottom = y + size * 0.74;
  strokeMathSymbol(ctx, size * 0.6, () => {
    ctx.beginPath();
    ctx.moveTo(right, top);
    ctx.lineTo(left, top);
    ctx.lineTo(right, mid);
    ctx.lineTo(left, bottom);
    ctx.lineTo(right, bottom);
  });
};

const drawListAverageIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawListBadge(ctx, x, y, size);
  drawListRows(ctx, x, y, size);
  const lineY = y + size * 0.28;
  strokeDualPath(ctx, size * 0.06, size * 0.04, () => {
    ctx.beginPath();
    ctx.moveTo(x + size * 0.28, lineY);
    ctx.lineTo(x + size * 0.72, lineY);
  });
  drawNodeDot(ctx, x + size * 0.5, y + size * 0.56, size * 0.08, {
    inner: "#eef2ff",
    outer: "#4f46e5",
  });
};

const drawListMinIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawListBadge(ctx, x, y, size);
  drawListRows(ctx, x, y, size);
  drawVectorArrow(
    ctx,
    { x: x + size * 0.72, y: y + size * 0.32 },
    { x: x + size * 0.72, y: y + size * 0.74 },
    size * 0.85
  );
};

const drawListMaxIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawListBadge(ctx, x, y, size);
  drawListRows(ctx, x, y, size);
  drawVectorArrow(
    ctx,
    { x: x + size * 0.72, y: y + size * 0.74 },
    { x: x + size * 0.72, y: y + size * 0.32 },
    size * 0.85
  );
};

const drawListMedianIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawListBadge(ctx, x, y, size);
  const { rows } = drawListRows(ctx, x, y, size);
  const focusRow = rows[1];
  roundedRectPath(
    ctx,
    focusRow.x - size * 0.02,
    focusRow.y - size * 0.02,
    focusRow.width + size * 0.04,
    focusRow.height + size * 0.04,
    focusRow.height * 0.6
  );
  setGlyphStroke(ctx, size, 0.06, 0.8);
  ctx.stroke();
};

const drawListStdDevIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawListBadge(ctx, x, y, size);
  drawListRows(ctx, x, y, size);
  const startX = x + size * 0.2;
  const endX = x + size * 0.8;
  const midY = y + size * 0.34;
  const amplitude = size * 0.07;
  const steps = 16;
  strokeDualPath(ctx, size * 0.05, size * 0.032, () => {
    ctx.beginPath();
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const waveX = startX + (endX - startX) * t;
      const waveY = midY + Math.sin(t * Math.PI * 2) * amplitude;
      if (i === 0) ctx.moveTo(waveX, waveY);
      else ctx.lineTo(waveX, waveY);
    }
  });
};

const drawAnalysisBadge = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "#e2e8f0", bottom: "#94a3b8" });
};

const drawGeometryInfoIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawAnalysisBadge(ctx, x, y, size);
  const left = x + size * 0.28;
  const right = x + size * 0.72;
  const top = y + size * 0.3;
  const bottom = y + size * 0.72;
  setGlyphStroke(ctx, size, 0.075, 0.85);
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(right, top);
  ctx.lineTo(right, bottom);
  ctx.lineTo(left, bottom);
  ctx.closePath();
  ctx.stroke();
  setGlyphStroke(ctx, size, 0.06, 0.65);
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left + size * 0.12, top + size * 0.12);
  ctx.lineTo(right + size * 0.12, top + size * 0.12);
  ctx.lineTo(right, top);
  ctx.stroke();
  drawGlyphDot(ctx, right + size * 0.08, top + size * 0.1, size * 0.055, 0.9);
};

const drawGeometryVerticesIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawAnalysisBadge(ctx, x, y, size);
  const points = [
    { x: x + size * 0.3, y: y + size * 0.68 },
    { x: x + size * 0.46, y: y + size * 0.42 },
    { x: x + size * 0.7, y: y + size * 0.64 },
  ];
  setGlyphStroke(ctx, size, 0.07, 0.8);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  ctx.lineTo(points[1].x, points[1].y);
  ctx.lineTo(points[2].x, points[2].y);
  ctx.stroke();
  points.forEach((pt) => {
    drawGlyphDot(ctx, pt.x, pt.y, size * 0.065, 0.95);
  });
};

const drawGeometryEdgesIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawAnalysisBadge(ctx, x, y, size);
  const start = { x: x + size * 0.26, y: y + size * 0.36 };
  const mid = { x: x + size * 0.52, y: y + size * 0.56 };
  const end = { x: x + size * 0.76, y: y + size * 0.4 };
  drawVectorArrow(ctx, start, mid, size * 0.8);
  drawVectorArrow(ctx, mid, end, size * 0.8);
};

const drawGeometryFacesIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawAnalysisBadge(ctx, x, y, size);
  const tri = [
    { x: x + size * 0.3, y: y + size * 0.7 },
    { x: x + size * 0.52, y: y + size * 0.32 },
    { x: x + size * 0.74, y: y + size * 0.68 },
  ];
  setGlyphStroke(ctx, size, 0.08, 0.85);
  ctx.beginPath();
  ctx.moveTo(tri[0].x, tri[0].y);
  ctx.lineTo(tri[1].x, tri[1].y);
  ctx.lineTo(tri[2].x, tri[2].y);
  ctx.closePath();
  ctx.stroke();
};

const drawGeometryNormalsIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawAnalysisBadge(ctx, x, y, size);
  const center = { x: x + size * 0.5, y: y + size * 0.6 };
  roundedRectPath(ctx, x + size * 0.32, y + size * 0.46, size * 0.36, size * 0.22, size * 0.04);
  setGlyphStroke(ctx, size, 0.07, 0.7);
  ctx.stroke();
  drawVectorArrow(
    ctx,
    center,
    { x: center.x, y: y + size * 0.26 },
    size * 0.9
  );
};

const drawGeometryControlPointsIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawAnalysisBadge(ctx, x, y, size);
  const cols = 3;
  const rows = 3;
  const pad = size * 0.26;
  const spanX = size - pad * 2;
  const spanY = size - pad * 2;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const dotX = x + pad + (spanX / (cols - 1)) * col;
      const dotY = y + pad + (spanY / (rows - 1)) * row;
      drawGlyphDot(ctx, dotX, dotY, size * 0.05, 0.85);
    }
  }
};

const drawRangeIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const start = { x: x + size * 0.24, y: y + size * 0.58 };
  const end = { x: x + size * 0.8, y: y + size * 0.58 };
  setGlyphStroke(ctx, size, 0.075, 0.8);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  const ticks = 4;
  for (let i = 0; i <= ticks; i += 1) {
    const t = i / ticks;
    const tickX = start.x + (end.x - start.x) * t;
    ctx.moveTo(tickX, start.y - size * 0.06);
    ctx.lineTo(tickX, start.y + size * 0.06);
  }
  ctx.stroke();
  drawGlyphDot(ctx, start.x, start.y, size * 0.055, 0.95);
  drawGlyphArrowHead(ctx, end.x, end.y, 0, size, 0.85);
};

const drawLinspaceIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const startX = x + size * 0.22;
  const endX = x + size * 0.78;
  const midY = y + size * 0.56;
  setGlyphStroke(ctx, size, 0.075, 0.8);
  ctx.beginPath();
  ctx.moveTo(startX, midY);
  ctx.lineTo(endX, midY);
  ctx.stroke();
  for (let i = 0; i < 5; i += 1) {
    const t = i / 4;
    const dotX = startX + (endX - startX) * t;
    drawGlyphDot(ctx, dotX, midY, size * 0.055, 0.9);
  }
};

const drawRemapIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const leftX = x + size * 0.3;
  const rightX = x + size * 0.7;
  setGlyphStroke(ctx, size, 0.07, 0.7);
  ctx.beginPath();
  ctx.moveTo(leftX, y + size * 0.3);
  ctx.lineTo(leftX, y + size * 0.76);
  ctx.moveTo(rightX, y + size * 0.24);
  ctx.lineTo(rightX, y + size * 0.7);
  ctx.stroke();
  drawVectorArrow(
    ctx,
    { x: leftX + size * 0.04, y: y + size * 0.58 },
    { x: rightX - size * 0.04, y: y + size * 0.44 },
    size * 0.9
  );
};

const drawRandomIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const dots = [
    { x: 0.34, y: 0.34 },
    { x: 0.5, y: 0.5 },
    { x: 0.66, y: 0.66 },
    { x: 0.66, y: 0.34 },
    { x: 0.34, y: 0.66 },
  ];
  dots.forEach((dot, index) => {
    drawGlyphDot(ctx, x + size * dot.x, y + size * dot.y, size * 0.055, index % 2 === 0 ? 0.9 : 0.7);
  });
};

const drawRepeatIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const boxSize = size * 0.18;
  const box1 = { x: x + size * 0.28, y: y + size * 0.38 };
  const box2 = { x: x + size * 0.56, y: y + size * 0.58 };
  [box1, box2].forEach((box, index) => {
    roundedRectPath(ctx, box.x, box.y, boxSize, boxSize, size * 0.03);
    setGlyphStroke(ctx, size, index === 0 ? 0.07 : 0.06, index === 0 ? 0.9 : 0.6);
    ctx.stroke();
  });
  drawVectorArrow(
    ctx,
    { x: box2.x + boxSize * 0.5, y: box2.y + boxSize * 0.1 },
    { x: box1.x + boxSize * 0.5, y: box1.y - size * 0.08 },
    size * 0.85
  );
};

const drawArrayLinearIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const start = { x: x + size * 0.24, y: y + size * 0.72 };
  const end = { x: x + size * 0.78, y: y + size * 0.3 };
  setGlyphStroke(ctx, size, 0.08, 0.8);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  for (let i = 0; i < 3; i += 1) {
    const t = i / 2;
    const px = start.x + (end.x - start.x) * t;
    const py = start.y + (end.y - start.y) * t;
    drawGlyphDot(ctx, px, py, size * 0.055, 0.95);
  }
};

const drawArrayPolarIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const cx = x + size * 0.5;
  const cy = y + size * 0.54;
  const r = size * 0.28;
  setGlyphStroke(ctx, size, 0.075, 0.8);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
  angles.forEach((angle) => {
    drawGlyphDot(ctx, cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, size * 0.055, 0.95);
  });
};

const drawArrayGridIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const left = x + size * 0.28;
  const top = y + size * 0.34;
  const span = size * 0.44;
  const step = span / 2;
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      drawGlyphDot(
        ctx,
        left + col * step,
        top + row * step,
        size * 0.045,
        0.9
      );
    }
  }
};

const drawWaveLine = (
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  size: number
) => {
  setGlyphStroke(ctx, size, 0.075, 0.85);
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
};

const drawSineWaveIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const startX = x + size * 0.18;
  const endX = x + size * 0.82;
  const midY = y + size * 0.56;
  const amplitude = size * 0.18;
  const points: Array<{ x: number; y: number }> = [];
  const steps = 18;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    points.push({
      x: startX + (endX - startX) * t,
      y: midY + Math.sin(t * Math.PI * 2) * amplitude,
    });
  }
  drawWaveLine(ctx, points, size);
};

const drawCosineWaveIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const startX = x + size * 0.18;
  const endX = x + size * 0.82;
  const midY = y + size * 0.56;
  const amplitude = size * 0.18;
  const points: Array<{ x: number; y: number }> = [];
  const steps = 18;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    points.push({
      x: startX + (endX - startX) * t,
      y: midY + Math.cos(t * Math.PI * 2) * amplitude,
    });
  }
  drawWaveLine(ctx, points, size);
};

const drawSawtoothWaveIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const left = x + size * 0.2;
  const right = x + size * 0.8;
  const top = y + size * 0.34;
  const bottom = y + size * 0.78;
  drawWaveLine(
    ctx,
    [
      { x: left, y: bottom },
      { x: right, y: top },
      { x: right, y: bottom },
    ],
    size
  );
};

const drawTriangleWaveIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const left = x + size * 0.2;
  const right = x + size * 0.8;
  const top = y + size * 0.32;
  const bottom = y + size * 0.78;
  const midX = (left + right) / 2;
  drawWaveLine(
    ctx,
    [
      { x: left, y: bottom },
      { x: midX, y: top },
      { x: right, y: bottom },
    ],
    size
  );
};

const drawSquareWaveIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "", bottom: "" });
  const left = x + size * 0.2;
  const right = x + size * 0.8;
  const high = y + size * 0.34;
  const low = y + size * 0.78;
  const midX = x + size * 0.5;
  drawWaveLine(
    ctx,
    [
      { x: left, y: low },
      { x: left, y: high },
      { x: midX, y: high },
      { x: midX, y: low },
      { x: right, y: low },
    ],
    size
  );
};

const drawSolverBadge = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colors: { top: string; bottom: string }
) => {
  drawMathBadge(ctx, x, y, size, colors);
};

const drawVoxelGrid = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  options?: { rows?: number; cols?: number; light?: string; dark?: string }
) => {
  const rows = options?.rows ?? 3;
  const cols = options?.cols ?? 3;
  const light = options?.light ?? "#fef3c7";
  const dark = options?.dark ?? "#fbbf24";
  const pad = size * 0.27;
  const gridSize = size - pad * 2;
  const cellW = gridSize / cols;
  const cellH = gridSize / rows;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cellX = x + pad + col * cellW;
      const cellY = y + pad + row * cellH;
      const fill = (row + col) % 2 === 0 ? light : dark;
      ctx.save();
      roundedRectPath(ctx, cellX, cellY, cellW * 0.92, cellH * 0.92, cellW * 0.2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = size * 0.016;
      ctx.strokeStyle = "rgba(15, 23, 42, 0.22)";
      ctx.stroke();
      ctx.restore();
    }
  }
};

const drawTopologyOptimizeIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSolverBadge(ctx, x, y, size, { top: "#fef9c3", bottom: "#eab308" });
  drawVoxelGrid(ctx, x, y, size, {
    light: "#fef3c7",
    dark: "#f59e0b",
  });

  const sliderLeft = x + size * 0.3;
  const sliderRight = x + size * 0.8;
  const sliderY1 = y + size * 0.72;
  const sliderY2 = y + size * 0.8;
  const knob1 = sliderLeft + (sliderRight - sliderLeft) * 0.35;
  const knob2 = sliderLeft + (sliderRight - sliderLeft) * 0.68;

  const drawSlider = (yPos: number) =>
    strokeDualPath(ctx, size * 0.055, size * 0.034, () => {
      ctx.beginPath();
      ctx.moveTo(sliderLeft, yPos);
      ctx.lineTo(sliderRight, yPos);
    });

  drawSlider(sliderY1);
  drawSlider(sliderY2);

  drawNodeDot(ctx, knob1, sliderY1, size * 0.05, {
    inner: "#fefce8",
    outer: "#ca8a04",
  });
  drawNodeDot(ctx, knob2, sliderY2, size * 0.05, {
    inner: "#fefce8",
    outer: "#ca8a04",
  });
};

const drawTopologySolverIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSolverBadge(ctx, x, y, size, { top: "#fde68a", bottom: "#d97706" });
  drawVoxelGrid(ctx, x, y, size, {
    light: "#fed7aa",
    dark: "#fb923c",
  });

  const tri = [
    { x: x + size * 0.48, y: y + size * 0.32 },
    { x: x + size * 0.48, y: y + size * 0.74 },
    { x: x + size * 0.8, y: y + size * 0.53 },
  ];
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(tri[0].x, tri[0].y);
  ctx.lineTo(tri[1].x, tri[1].y);
  ctx.lineTo(tri[2].x, tri[2].y);
  ctx.closePath();
  ctx.fillStyle = "#fff7ed";
  ctx.fill();
  ctx.lineWidth = size * 0.05;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.6)";
  ctx.stroke();
  ctx.restore();
};

const drawBiologicalSolverIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSolverBadge(ctx, x, y, size, { top: "#dcfce7", bottom: "#22c55e" });

  const midX = x + size * 0.5;
  const top = y + size * 0.22;
  const bottom = y + size * 0.82;
  const amplitude = size * 0.12;
  const steps = 18;
  const range = bottom - top;

  const drawHelix = (phase: number) =>
    strokeDualPath(
      ctx,
      size * 0.06,
      size * 0.038,
      () => {
        ctx.beginPath();
        for (let i = 0; i < steps; i += 1) {
          const t = i / (steps - 1);
          const yPos = top + range * t;
          const xPos = midX + Math.sin(t * Math.PI * 2 + phase) * amplitude;
          if (i === 0) {
            ctx.moveTo(xPos, yPos);
          } else {
            ctx.lineTo(xPos, yPos);
          }
        }
      },
      {
        outerColor: "rgba(20, 83, 45, 0.55)",
        innerColor: "#ecfdf5",
      }
    );

  drawHelix(0);
  drawHelix(Math.PI);

  for (let i = 0; i <= 5; i += 1) {
    const t = i / 5;
    const yPos = top + range * t;
    const xLeft = midX + Math.sin(t * Math.PI * 2) * amplitude;
    const xRight = midX + Math.sin(t * Math.PI * 2 + Math.PI) * amplitude;
    strokeDualPath(
      ctx,
      size * 0.04,
      size * 0.026,
      () => {
        ctx.beginPath();
        ctx.moveTo(xLeft, yPos);
        ctx.lineTo(xRight, yPos);
      },
      {
        outerColor: "rgba(20, 83, 45, 0.55)",
        innerColor: "#f0fdf4",
      }
    );
  }
};

const applyMonochromeTint = (
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; size: number },
  tint: RGBA
) => {
  const { x, y, size } = bounds;
  const image = ctx.getImageData(x, y, size, size);
  const data = image.data;
  const tintR = tint[0];
  const tintG = tint[1];
  const tintB = tint[2];
  const tintA = tint[3];
  const alphaBoost = 1.07;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;
    data[i] = Math.round(tintR * 255);
    data[i + 1] = Math.round(tintG * 255);
    data[i + 2] = Math.round(tintB * 255);
    data[i + 3] = Math.min(255, Math.round(alpha * tintA * alphaBoost));
  }

  ctx.putImageData(image, x, y);
};

const drawIconToTile = (
  ctx: CanvasRenderingContext2D,
  id: IconId,
  x: number,
  y: number,
  size: number,
  options: IconRenderOptions = {}
) => {
  ctx.save();
  ctx.clearRect(x, y, size, size);

  ctx.globalCompositeOperation = "source-over";
  const style = options.style ?? DEFAULT_ICON_STYLE;
  const previousStyle = activeIconStyle;
  activeIconStyle = style;

  if (style === "tile") {
    const bg = ctx.createLinearGradient(x, y, x, y + size);
    bg.addColorStop(0, "rgba(255,255,255,0)");
    bg.addColorStop(1, "rgba(0,0,0,0.02)");
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, size, size);
  }

  switch (id) {
    case "point":
      drawPointIcon(ctx, x, y, size);
      break;
    case "line":
      drawLineIcon(ctx, x, y, size);
      break;
    case "arc":
      drawArcIcon(ctx, x, y, size);
      break;
    case "polyline":
      drawPolylineIcon(ctx, x, y, size);
      break;
    case "rectangle":
      drawRectangleIcon(ctx, x, y, size);
      break;
    case "circle":
      drawCircleIcon(ctx, x, y, size);
      break;
    case "primitive":
      drawPrimitiveIcon(ctx, x, y, size);
      break;
    case "box":
      drawBoxIcon(ctx, x, y, size);
      break;
    case "sphere":
      drawSphereIcon(ctx, x, y, size);
      break;
    case "numberConstant":
      drawNumberConstantIcon(ctx, x, y, size);
      break;
    case "add":
      drawAddIcon(ctx, x, y, size);
      break;
    case "subtract":
      drawSubtractIcon(ctx, x, y, size);
      break;
    case "multiply":
      drawMultiplyIcon(ctx, x, y, size);
      break;
    case "divide":
      drawDivideIcon(ctx, x, y, size);
      break;
    case "clamp":
      drawClampIcon(ctx, x, y, size);
      break;
    case "min":
      drawMinIcon(ctx, x, y, size);
      break;
    case "max":
      drawMaxIcon(ctx, x, y, size);
      break;
    case "expression":
      drawExpressionIcon(ctx, x, y, size);
      break;
    case "conditional":
      drawConditionalIcon(ctx, x, y, size);
      break;
    case "origin":
      drawOriginIcon(ctx, x, y, size);
      break;
    case "unitX":
      drawUnitXIcon(ctx, x, y, size);
      break;
    case "unitY":
      drawUnitYIcon(ctx, x, y, size);
      break;
    case "unitZ":
      drawUnitZIcon(ctx, x, y, size);
      break;
    case "unitXYZ":
      drawUnitXYZIcon(ctx, x, y, size);
      break;
    case "vectorConstruct":
      drawVectorConstructIcon(ctx, x, y, size);
      break;
    case "vectorDeconstruct":
      drawVectorDeconstructIcon(ctx, x, y, size);
      break;
    case "vectorAdd":
      drawVectorAddIcon(ctx, x, y, size);
      break;
    case "vectorSubtract":
      drawVectorSubtractIcon(ctx, x, y, size);
      break;
    case "vectorScale":
      drawVectorScaleIcon(ctx, x, y, size);
      break;
    case "vectorLength":
      drawVectorLengthIcon(ctx, x, y, size);
      break;
    case "vectorNormalize":
      drawVectorNormalizeIcon(ctx, x, y, size);
      break;
    case "vectorDot":
      drawVectorDotIcon(ctx, x, y, size);
      break;
    case "vectorCross":
      drawVectorCrossIcon(ctx, x, y, size);
      break;
    case "distance":
      drawDistanceIcon(ctx, x, y, size);
      break;
    case "vectorFromPoints":
      drawVectorFromPointsIcon(ctx, x, y, size);
      break;
    case "vectorAngle":
      drawVectorAngleIcon(ctx, x, y, size);
      break;
    case "vectorLerp":
      drawVectorLerpIcon(ctx, x, y, size);
      break;
    case "vectorProject":
      drawVectorProjectIcon(ctx, x, y, size);
      break;
    case "movePoint":
      drawMovePointIcon(ctx, x, y, size);
      break;
    case "movePointByVector":
      drawMovePointByVectorIcon(ctx, x, y, size);
      break;
    case "rotateVectorAxis":
      drawRotateVectorAxisIcon(ctx, x, y, size);
      break;
    case "mirrorVector":
      drawMirrorVectorIcon(ctx, x, y, size);
      break;
    case "listCreate":
      drawListCreateIcon(ctx, x, y, size);
      break;
    case "listLength":
      drawListLengthIcon(ctx, x, y, size);
      break;
    case "listItem":
      drawListItemIcon(ctx, x, y, size);
      break;
    case "listIndexOf":
      drawListIndexOfIcon(ctx, x, y, size);
      break;
    case "listPartition":
      drawListPartitionIcon(ctx, x, y, size);
      break;
    case "listFlatten":
      drawListFlattenIcon(ctx, x, y, size);
      break;
    case "listSlice":
      drawListSliceIcon(ctx, x, y, size);
      break;
    case "listReverse":
      drawListReverseIcon(ctx, x, y, size);
      break;
    case "listSum":
      drawListSumIcon(ctx, x, y, size);
      break;
    case "listAverage":
      drawListAverageIcon(ctx, x, y, size);
      break;
    case "listMin":
      drawListMinIcon(ctx, x, y, size);
      break;
    case "listMax":
      drawListMaxIcon(ctx, x, y, size);
      break;
    case "listMedian":
      drawListMedianIcon(ctx, x, y, size);
      break;
    case "listStdDev":
      drawListStdDevIcon(ctx, x, y, size);
      break;
    case "geometryInfo":
      drawGeometryInfoIcon(ctx, x, y, size);
      break;
    case "geometryVertices":
      drawGeometryVerticesIcon(ctx, x, y, size);
      break;
    case "geometryEdges":
      drawGeometryEdgesIcon(ctx, x, y, size);
      break;
    case "geometryFaces":
      drawGeometryFacesIcon(ctx, x, y, size);
      break;
    case "geometryNormals":
      drawGeometryNormalsIcon(ctx, x, y, size);
      break;
    case "geometryControlPoints":
      drawGeometryControlPointsIcon(ctx, x, y, size);
      break;
    case "range":
      drawRangeIcon(ctx, x, y, size);
      break;
    case "linspace":
      drawLinspaceIcon(ctx, x, y, size);
      break;
    case "remap":
      drawRemapIcon(ctx, x, y, size);
      break;
    case "random":
      drawRandomIcon(ctx, x, y, size);
      break;
    case "repeat":
      drawRepeatIcon(ctx, x, y, size);
      break;
    case "arrayLinear":
      drawArrayLinearIcon(ctx, x, y, size);
      break;
    case "arrayPolar":
      drawArrayPolarIcon(ctx, x, y, size);
      break;
    case "arrayGrid":
      drawArrayGridIcon(ctx, x, y, size);
      break;
    case "sineWave":
      drawSineWaveIcon(ctx, x, y, size);
      break;
    case "cosineWave":
      drawCosineWaveIcon(ctx, x, y, size);
      break;
    case "sawtoothWave":
      drawSawtoothWaveIcon(ctx, x, y, size);
      break;
    case "triangleWave":
      drawTriangleWaveIcon(ctx, x, y, size);
      break;
    case "squareWave":
      drawSquareWaveIcon(ctx, x, y, size);
      break;
    case "move":
      drawMoveIcon(ctx, x, y, size);
      break;
    case "rotate":
      drawRotateIcon(ctx, x, y, size);
      break;
    case "scale":
      drawScaleIcon(ctx, x, y, size);
      break;
    case "undo":
      drawUndoIcon(ctx, x, y, size);
      break;
    case "redo":
      drawRedoIcon(ctx, x, y, size);
      break;
    case "delete":
      drawDeleteIcon(ctx, x, y, size);
      break;
    case "focus":
      drawFocusIcon(ctx, x, y, size);
      break;
    case "frameAll":
      drawFrameAllIcon(ctx, x, y, size);
      break;
    case "copy":
      drawCopyIcon(ctx, x, y, size);
      break;
    case "paste":
      drawPasteIcon(ctx, x, y, size);
      break;
    case "duplicate":
      drawDuplicateIcon(ctx, x, y, size);
      break;
    case "gumball":
      drawGumballIcon(ctx, x, y, size);
      break;
    case "geometryReference":
      drawGeometryReferenceIcon(ctx, x, y, size);
      break;
    case "pointGenerator":
      drawPointGeneratorIcon(ctx, x, y, size);
      break;
    case "lineBuilder":
      drawLineBuilderIcon(ctx, x, y, size);
      break;
    case "circleGenerator":
      drawCircleGeneratorIcon(ctx, x, y, size);
      break;
    case "boxBuilder":
      drawBoxBuilderIcon(ctx, x, y, size);
      break;
    case "topologyOptimize":
      drawTopologyOptimizeIcon(ctx, x, y, size);
      break;
    case "topologySolver":
      drawTopologySolverIcon(ctx, x, y, size);
      break;
    case "biologicalSolver":
      drawBiologicalSolverIcon(ctx, x, y, size);
      break;
    case "transform":
      drawTransformIcon(ctx, x, y, size);
      break;
    case "surface":
      drawSurfaceIcon(ctx, x, y, size);
      break;
    case "loft":
      drawLoftIcon(ctx, x, y, size);
      break;
    case "extrude":
      drawExtrudeIcon(ctx, x, y, size);
      break;
    case "boolean":
      drawBooleanIcon(ctx, x, y, size);
      break;
    case "offset":
      drawOffsetIcon(ctx, x, y, size);
      break;
    case "linguaSymbol":
      drawLinguaSymbolIcon(ctx, x, y, size);
      break;
    case "selectionFilter":
      drawSelectionFilterIcon(ctx, x, y, size);
      break;
    case "displayMode":
      drawDisplayModeIcon(ctx, x, y, size);
      break;
    case "referenceActive":
      drawReferenceActiveIcon(ctx, x, y, size);
      break;
    case "referenceAll":
      drawReferenceAllIcon(ctx, x, y, size);
      break;
    case "group":
      drawGroupIcon(ctx, x, y, size);
      break;
    case "ungroup":
      drawUngroupIcon(ctx, x, y, size);
      break;
    case "advanced":
      drawAdvancedIcon(ctx, x, y, size);
      break;
    case "transformOrientation":
      drawTransformOrientationIcon(ctx, x, y, size);
      break;
    case "pivotMode":
      drawPivotModeIcon(ctx, x, y, size);
      break;
    case "cplaneXY":
      drawCPlaneXYIcon(ctx, x, y, size);
      break;
    case "cplaneXZ":
      drawCPlaneXZIcon(ctx, x, y, size);
      break;
    case "cplaneYZ":
      drawCPlaneYZIcon(ctx, x, y, size);
      break;
    case "cplaneAlign":
      drawCPlaneAlignIcon(ctx, x, y, size);
      break;
    case "capture":
      drawCaptureIcon(ctx, x, y, size);
      break;
    case "save":
      drawSaveIcon(ctx, x, y, size);
      break;
    case "load":
      drawLoadIcon(ctx, x, y, size);
      break;
    case "download":
      drawDownloadIcon(ctx, x, y, size);
      break;
    case "run":
      drawRunIcon(ctx, x, y, size);
      break;
    case "close":
      drawCloseIcon(ctx, x, y, size);
      break;
    case "themeLight":
      drawThemeLightIcon(ctx, x, y, size);
      break;
    case "themeDark":
      drawThemeDarkIcon(ctx, x, y, size);
      break;
    case "brandRoslyn":
      drawBrandRoslynIcon(ctx, x, y, size);
      break;
    case "brandNumerica":
      drawBrandNumericaIcon(ctx, x, y, size);
      break;
    case "prune":
      drawPruneIcon(ctx, x, y, size);
      break;
    case "show":
      drawShowIcon(ctx, x, y, size);
      break;
    case "hide":
      drawHideIcon(ctx, x, y, size);
      break;
    case "lock":
      drawLockIcon(ctx, x, y, size);
      break;
    case "unlock":
      drawUnlockIcon(ctx, x, y, size);
      break;
    case "script":
      drawScriptIcon(ctx, x, y, size);
      break;
    case "interpolate":
      drawInterpolateIcon(ctx, x, y, size);
      break;
    case "chevronDown":
      drawChevronDownIcon(ctx, x, y, size);
      break;
    case "ruler":
      drawRulerIcon(ctx, x, y, size);
      break;
    case "zoomCursor":
      drawZoomCursorIcon(ctx, x, y, size);
      break;
    case "invertZoom":
      drawInvertZoomIcon(ctx, x, y, size);
      break;
    case "upright":
      drawUprightIcon(ctx, x, y, size);
      break;
    default:
      drawPointIcon(ctx, x, y, size);
      break;
  }

  applyGloss(ctx, { x, y, size });
  ctx.restore();
  activeIconStyle = previousStyle;

  const tint = options.tint ?? (style === "glyph" ? DEFAULT_GLYPH_TINT : undefined);
  const monochrome = options.monochrome ?? style === "glyph";
  if (monochrome && tint) {
    applyMonochromeTint(ctx, { x, y, size }, tint);
  }
};

export const renderIconDataUrl = (
  id: IconId,
  size = 96,
  options: IconRenderOptions = {}
) => {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) {
    ctx.imageSmoothingQuality = "high";
  }
  drawIconToTile(ctx, id, 0, 0, size, options);
  return canvas.toDataURL("image/png");
};

const createAtlasSpec = (gl: WebGLRenderingContext): AtlasSpec => {
  const columns = 8;
  const rows = Math.ceil(ICON_IDS.length / columns);
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
  const maxIconByWidth = Math.floor(maxTextureSize / columns);
  const maxIconByHeight = Math.floor(maxTextureSize / rows);
  const atlasIconSize = Math.max(
    96,
    Math.min(ATLAS_ICON_SIZE, maxIconByWidth, maxIconByHeight)
  );
  const width = columns * atlasIconSize;
  const height = rows * atlasIconSize;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Unable to create icon atlas context");
  }

  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) {
    ctx.imageSmoothingQuality = "high";
  }

  const uvById: Record<string, IconUV> = {};
  ICON_IDS.forEach((id, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = col * atlasIconSize;
    const y = row * atlasIconSize;
    drawIconToTile(ctx, id, x, y, atlasIconSize, {
      style: "glyph",
      tint: rgb(255, 255, 255, 1),
      monochrome: true,
    });

    const u0 = x / width;
    const v0 = y / height;
    const u1 = (x + atlasIconSize) / width;
    const v1 = (y + atlasIconSize) / height;
    uvById[id] = { u0, v0, u1, v1 };
  });

  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Unable to create icon texture");
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);

  return { texture, width, height, uvById };
};

export class WebGLIconRenderer {
  private gl: WebGLRenderingContext;
  private buffer: WebGLBuffer;
  private handles: ShaderHandles;
  private atlas: AtlasSpec;
  private data: number[] = [];
  private resolution: Resolution = { width: 1, height: 1 };

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;

    const program = createProgram(
      gl,
      `
        attribute vec2 a_position;
        attribute vec2 a_uv;
        attribute vec4 a_tint;
        uniform vec2 u_resolution;
        varying vec2 v_uv;
        varying vec4 v_tint;
        void main() {
          vec2 zeroToOne = a_position / u_resolution;
          vec2 clip = zeroToOne * 2.0 - 1.0;
          gl_Position = vec4(clip * vec2(1.0, -1.0), 0.0, 1.0);
          v_uv = a_uv;
          v_tint = a_tint;
        }
      `,
      `
        precision mediump float;
        uniform sampler2D u_texture;
        varying vec2 v_uv;
        varying vec4 v_tint;
        void main() {
          vec4 tex = texture2D(u_texture, v_uv);
          gl_FragColor = tex * v_tint;
        }
      `
    );

    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error("Unable to create icon buffer");
    }

    this.buffer = buffer;
    this.handles = {
      program,
      positionLoc: gl.getAttribLocation(program, "a_position"),
      uvLoc: gl.getAttribLocation(program, "a_uv"),
      tintLoc: gl.getAttribLocation(program, "a_tint"),
      resolutionLoc: gl.getUniformLocation(program, "u_resolution"),
      textureLoc: gl.getUniformLocation(program, "u_texture"),
    };
    this.atlas = createAtlasSpec(gl);
  }

  begin(width: number, height: number): void {
    this.resolution = { width, height };
    this.data.length = 0;
  }

  drawIcon(rect: Rect, iconId: IconId, tint: RGBA = rgb(255, 255, 255, 1)): void {
    const uv = this.atlas.uvById[iconId];
    if (!uv) return;

    const x1 = rect.x;
    const y1 = rect.y;
    const x2 = rect.x + rect.width;
    const y2 = rect.y + rect.height;

    this.pushQuad(
      { x: x1, y: y1, u: uv.u0, v: uv.v0 },
      { x: x1, y: y2, u: uv.u0, v: uv.v1 },
      { x: x2, y: y2, u: uv.u1, v: uv.v1 },
      { x: x2, y: y1, u: uv.u1, v: uv.v0 },
      tint
    );
  }

  flush(): void {
    if (this.data.length === 0) return;
    const gl = this.gl;
    gl.useProgram(this.handles.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.data), gl.DYNAMIC_DRAW);

    if (this.handles.resolutionLoc) {
      gl.uniform2f(this.handles.resolutionLoc, this.resolution.width, this.resolution.height);
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlas.texture);
    if (this.handles.textureLoc) {
      gl.uniform1i(this.handles.textureLoc, 0);
    }

    const stride = VERTEX_STRIDE * Float32Array.BYTES_PER_ELEMENT;
    gl.enableVertexAttribArray(this.handles.positionLoc);
    gl.vertexAttribPointer(this.handles.positionLoc, 2, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(this.handles.uvLoc);
    gl.vertexAttribPointer(
      this.handles.uvLoc,
      2,
      gl.FLOAT,
      false,
      stride,
      2 * Float32Array.BYTES_PER_ELEMENT
    );

    gl.enableVertexAttribArray(this.handles.tintLoc);
    gl.vertexAttribPointer(
      this.handles.tintLoc,
      4,
      gl.FLOAT,
      false,
      stride,
      4 * Float32Array.BYTES_PER_ELEMENT
    );

    gl.drawArrays(gl.TRIANGLES, 0, this.data.length / VERTEX_STRIDE);
  }

  private pushQuad(
    p1: { x: number; y: number; u: number; v: number },
    p2: { x: number; y: number; u: number; v: number },
    p3: { x: number; y: number; u: number; v: number },
    p4: { x: number; y: number; u: number; v: number },
    tint: RGBA
  ): void {
    this.pushVertex(p1, tint);
    this.pushVertex(p2, tint);
    this.pushVertex(p3, tint);
    this.pushVertex(p1, tint);
    this.pushVertex(p3, tint);
    this.pushVertex(p4, tint);
  }

  private pushVertex(
    point: { x: number; y: number; u: number; v: number },
    tint: RGBA
  ): void {
    this.data.push(point.x, point.y, point.u, point.v, tint[0], tint[1], tint[2], tint[3]);
  }
}
