import type { RGBA } from "./WebGLUIRenderer";

type Resolution = { width: number; height: number };

type Rect = { x: number; y: number; width: number; height: number };

type IconUV = { u0: number; v0: number; u1: number; v1: number };

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
const ATLAS_ICON_SIZE = 128;

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
  "listCreate",
  "listLength",
  "listItem",
  "listIndexOf",
  "listPartition",
  "listFlatten",
  "listSlice",
  "listReverse",
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
  "specificitySymbol",
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
] as const;

type AtlasIconId = (typeof ICON_IDS)[number];

export type IconId = AtlasIconId | string;

const rgb = (r: number, g: number, b: number, a = 1): RGBA => [
  r / 255,
  g / 255,
  b / 255,
  a,
];

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
  ctx.lineWidth = 6;
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

const drawPointIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });

  const cx = x + size * 0.5;
  const cy = y + size * 0.5;

  ctx.lineWidth = 8;
  ctx.strokeStyle = "#d64045";
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.34, cy);
  ctx.lineTo(cx + size * 0.34, cy);
  ctx.moveTo(cx, cy - size * 0.34);
  ctx.lineTo(cx, cy + size * 0.34);
  ctx.stroke();

  const orb = ctx.createRadialGradient(cx - size * 0.04, cy - size * 0.06, size * 0.05, cx, cy, size * 0.22);
  orb.addColorStop(0, "#b9f5ff");
  orb.addColorStop(0.5, "#44c8f5");
  orb.addColorStop(1, "#117db8");
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.2, 0, Math.PI * 2);
  fillAndOutline(ctx, orb);
};

const drawLineIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });

  const start = { x: x + size * 0.18, y: y + size * 0.72 };
  const end = { x: x + size * 0.82, y: y + size * 0.28 };

  ctx.lineWidth = 12;
  const beam = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
  beam.addColorStop(0, "#ff9a3c");
  beam.addColorStop(1, "#ffdc73");
  ctx.strokeStyle = beam;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  const node = (px: number, py: number) => {
    const grad = ctx.createRadialGradient(px - 4, py - 4, 2, px, py, size * 0.11);
    grad.addColorStop(0, "#fff2b5");
    grad.addColorStop(1, "#ff8c42");
    ctx.beginPath();
    ctx.arc(px, py, size * 0.11, 0, Math.PI * 2);
    fillAndOutline(ctx, grad);
  };

  node(start.x, start.y);
  node(end.x, end.y);
};

const drawPolylineIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });

  const pts = [
    { x: x + size * 0.14, y: y + size * 0.7 },
    { x: x + size * 0.36, y: y + size * 0.36 },
    { x: x + size * 0.6, y: y + size * 0.56 },
    { x: x + size * 0.86, y: y + size * 0.24 },
  ];

  ctx.lineWidth = 11;
  ctx.strokeStyle = "#3ecf8e";
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();

  pts.forEach((pt, index) => {
    const grad = ctx.createRadialGradient(pt.x - 6, pt.y - 6, 2, pt.x, pt.y, size * 0.09);
    grad.addColorStop(0, index % 2 === 0 ? "#c7ffe3" : "#bff2ff");
    grad.addColorStop(1, index % 2 === 0 ? "#19a86b" : "#18a0fb");
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, size * 0.09, 0, Math.PI * 2);
    fillAndOutline(ctx, grad);
  });
};

const drawRectangleIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  const rx = x + size * 0.16;
  const ry = y + size * 0.24;
  const rw = size * 0.68;
  const rh = size * 0.52;

  roundedRectPath(ctx, rx, ry, rw, rh, size * 0.08);
  const fill = ctx.createLinearGradient(rx, ry, rx, ry + rh);
  fill.addColorStop(0, "#ffe29f");
  fill.addColorStop(1, "#ffb347");
  fillAndOutline(ctx, fill);

  ctx.lineWidth = 7;
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.strokeRect(rx + size * 0.05, ry + size * 0.05, rw - size * 0.1, rh - size * 0.1);
};

const drawCircleIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  const cx = x + size * 0.5;
  const cy = y + size * 0.5;
  const r = size * 0.33;

  const fill = ctx.createRadialGradient(cx - size * 0.08, cy - size * 0.1, size * 0.08, cx, cy, r);
  fill.addColorStop(0, "#d4ffe6");
  fill.addColorStop(0.55, "#67e8a5");
  fill.addColorStop(1, "#1f9d63");

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  fillAndOutline(ctx, fill);

  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(cx - size * 0.05, cy - size * 0.06, r * 0.55, 0, Math.PI * 2);
  ctx.stroke();
};

const drawArcIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
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

  ctx.lineWidth = 12;
  const beam = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
  beam.addColorStop(0, "#8bd9ff");
  beam.addColorStop(1, "#38bdf8");
  ctx.strokeStyle = beam;
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle, false);
  ctx.stroke();

  const node = (px: number, py: number, outer: string, inner: string, radius: number) => {
    const grad = ctx.createRadialGradient(px - 5, py - 5, 2, px, py, radius);
    grad.addColorStop(0, inner);
    grad.addColorStop(1, outer);
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    fillAndOutline(ctx, grad);
  };

  node(start.x, start.y, "#0ea5e9", "#e0f7ff", size * 0.1);
  node(end.x, end.y, "#0284c7", "#dbeafe", size * 0.1);
  node(mid.x, mid.y, "#06b6d4", "#ccfbf1", size * 0.085);
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
  drawSoftShadow(ctx, { x, y, size });
  drawCube(ctx, x, y, size, {
    top: "#ffe5b4",
    left: "#ffb15c",
    right: "#ff8c42",
  });
};

const drawSphereIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  const cx = x + size * 0.5;
  const cy = y + size * 0.52;
  const r = size * 0.33;

  const sphere = ctx.createRadialGradient(cx - size * 0.12, cy - size * 0.12, size * 0.07, cx, cy, r);
  sphere.addColorStop(0, "#f2f7ff");
  sphere.addColorStop(0.55, "#7cb5ff");
  sphere.addColorStop(1, "#315efb");

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  fillAndOutline(ctx, sphere);

  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.6, Math.PI * 0.15, Math.PI * 0.85);
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
  drawSoftShadow(ctx, { x, y, size });
  drawCube(ctx, x, y, size, {
    top: "#fef3c7",
    left: "#fbbf24",
    right: "#f59e0b",
  });
  drawSparkle(ctx, x + size * 0.78, y + size * 0.22, size * 0.08, "#fef08a");
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
  ctx.lineWidth = 12;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.stroke();

  const ex = cx + Math.cos(endAngle) * radius;
  const ey = cy + Math.sin(endAngle) * radius;
  const hx = ex - Math.cos(endAngle) * 18;
  const hy = ey - Math.sin(endAngle) * 18;

  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(
    hx + Math.cos(endAngle + headAngle) * 14,
    hy + Math.sin(endAngle + headAngle) * 14
  );
  ctx.lineTo(
    hx + Math.cos(endAngle - headAngle) * 14,
    hy + Math.sin(endAngle - headAngle) * 14
  );
  ctx.closePath();
  fillAndOutline(ctx, color, "rgba(0,0,0,0.55)");
};

const drawUndoIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  const cx = x + size * 0.54;
  const cy = y + size * 0.56;
  drawCurvedArrow(
    ctx,
    cx,
    cy,
    size * 0.28,
    Math.PI * 0.25,
    Math.PI * 1.35,
    "#38bdf8",
    Math.PI * 0.24
  );
};

const drawRedoIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  const cx = x + size * 0.46;
  const cy = y + size * 0.56;
  drawCurvedArrow(
    ctx,
    cx,
    cy,
    size * 0.28,
    Math.PI * 0.75,
    Math.PI * 1.9,
    "#22d3ee",
    Math.PI * 0.24
  );
};

const drawDeleteIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  const bodyX = x + size * 0.3;
  const bodyY = y + size * 0.34;
  const bodyW = size * 0.4;
  const bodyH = size * 0.44;

  roundedRectPath(ctx, bodyX, bodyY, bodyW, bodyH, size * 0.05);
  const bodyFill = ctx.createLinearGradient(bodyX, bodyY, bodyX, bodyY + bodyH);
  bodyFill.addColorStop(0, "#fecaca");
  bodyFill.addColorStop(1, "#ef4444");
  fillAndOutline(ctx, bodyFill);

  roundedRectPath(ctx, bodyX - size * 0.05, bodyY - size * 0.1, bodyW + size * 0.1, size * 0.1, size * 0.04);
  const lidFill = ctx.createLinearGradient(
    bodyX,
    bodyY - size * 0.1,
    bodyX,
    bodyY
  );
  lidFill.addColorStop(0, "#fee2e2");
  lidFill.addColorStop(1, "#f87171");
  fillAndOutline(ctx, lidFill);

  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.beginPath();
  ctx.moveTo(bodyX + size * 0.08, bodyY + size * 0.06);
  ctx.lineTo(bodyX + size * 0.08, bodyY + bodyH - size * 0.06);
  ctx.moveTo(bodyX + bodyW * 0.5, bodyY + size * 0.06);
  ctx.lineTo(bodyX + bodyW * 0.5, bodyY + bodyH - size * 0.06);
  ctx.moveTo(bodyX + bodyW - size * 0.08, bodyY + size * 0.06);
  ctx.lineTo(bodyX + bodyW - size * 0.08, bodyY + bodyH - size * 0.06);
  ctx.stroke();
};

const drawFocusIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  const cx = x + size * 0.5;
  const cy = y + size * 0.52;
  const r = size * 0.22;

  const ring = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
  ring.addColorStop(0, "#fef9c3");
  ring.addColorStop(1, "#f59e0b");

  ctx.lineWidth = 10;
  ctx.strokeStyle = "#f59e0b";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
  fillAndOutline(ctx, ring);

  ctx.lineWidth = 8;
  ctx.strokeStyle = "#0ea5e9";
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
};

const drawFrameAllIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });
  const inset = size * 0.18;
  const frame = {
    x: x + inset,
    y: y + inset,
    width: size - inset * 2,
    height: size - inset * 2,
  };

  roundedRectPath(ctx, frame.x, frame.y, frame.width, frame.height, size * 0.06);
  const fill = ctx.createLinearGradient(frame.x, frame.y, frame.x, frame.y + frame.height);
  fill.addColorStop(0, "#e0f2fe");
  fill.addColorStop(1, "#7dd3fc");
  fillAndOutline(ctx, fill);

  drawArrow(
    ctx,
    { x: frame.x + frame.width * 0.5, y: frame.y + frame.height * 0.15 },
    { x: frame.x + frame.width * 0.5, y: frame.y - size * 0.04 },
    "#0ea5e9"
  );
  drawArrow(
    ctx,
    { x: frame.x + frame.width * 0.85, y: frame.y + frame.height * 0.5 },
    { x: frame.x + frame.width + size * 0.04, y: frame.y + frame.height * 0.5 },
    "#0ea5e9"
  );
};

const drawCopyIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });

  const back = {
    x: x + size * 0.24,
    y: y + size * 0.2,
    width: size * 0.46,
    height: size * 0.56,
  };
  roundedRectPath(ctx, back.x, back.y, back.width, back.height, size * 0.06);
  fillAndOutline(ctx, "#bfdbfe");

  const front = {
    x: x + size * 0.32,
    y: y + size * 0.3,
    width: size * 0.46,
    height: size * 0.56,
  };
  roundedRectPath(ctx, front.x, front.y, front.width, front.height, size * 0.06);
  const fill = ctx.createLinearGradient(front.x, front.y, front.x, front.y + front.height);
  fill.addColorStop(0, "#f8fafc");
  fill.addColorStop(1, "#93c5fd");
  fillAndOutline(ctx, fill);
};

const drawPasteIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  const board = {
    x: x + size * 0.28,
    y: y + size * 0.24,
    width: size * 0.44,
    height: size * 0.56,
  };
  roundedRectPath(ctx, board.x, board.y, board.width, board.height, size * 0.08);
  const fill = ctx.createLinearGradient(board.x, board.y, board.x, board.y + board.height);
  fill.addColorStop(0, "#fef3c7");
  fill.addColorStop(1, "#fbbf24");
  fillAndOutline(ctx, fill);

  roundedRectPath(
    ctx,
    board.x + size * 0.06,
    board.y - size * 0.08,
    board.width - size * 0.12,
    size * 0.12,
    size * 0.05
  );
  fillAndOutline(ctx, "#f8fafc");
};

const drawDuplicateIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });
  drawCube(ctx, x + size * 0.02, y + size * 0.02, size * 0.82, {
    top: "#e9d5ff",
    left: "#c4b5fd",
    right: "#a78bfa",
  });
  drawCube(ctx, x + size * 0.18, y + size * 0.18, size * 0.82, {
    top: "#d9f99d",
    left: "#a3e635",
    right: "#84cc16",
  });
};

const drawGumballIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  const cx = x + size * 0.5;
  const cy = y + size * 0.56;
  const r = size * 0.18;

  const orb = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.5, r * 0.3, cx, cy, r);
  orb.addColorStop(0, "#f0f9ff");
  orb.addColorStop(1, "#0ea5e9");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  fillAndOutline(ctx, orb);

  drawArrow(ctx, { x: cx, y: cy }, { x: cx + size * 0.34, y: cy }, "#ef4444");
  drawArrow(ctx, { x: cx, y: cy }, { x: cx, y: cy - size * 0.36 }, "#22c55e");
  drawArrow(ctx, { x: cx, y: cy }, { x: cx - size * 0.24, y: cy + size * 0.28 }, "#3b82f6");
};

const drawSurfaceIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  const rx = x + size * 0.18;
  const ry = y + size * 0.24;
  const rw = size * 0.64;
  const rh = size * 0.5;

  roundedRectPath(ctx, rx, ry, rw, rh, size * 0.08);
  const fill = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
  fill.addColorStop(0, "#d9f99d");
  fill.addColorStop(1, "#22c55e");
  fillAndOutline(ctx, fill);

  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  for (let i = 1; i < 4; i += 1) {
    const tx = rx + (rw * i) / 4;
    ctx.beginPath();
    ctx.moveTo(tx, ry + size * 0.04);
    ctx.lineTo(tx, ry + rh - size * 0.04);
    ctx.stroke();
  }
  for (let i = 1; i < 3; i += 1) {
    const ty = ry + (rh * i) / 3;
    ctx.beginPath();
    ctx.moveTo(rx + size * 0.04, ty);
    ctx.lineTo(rx + rw - size * 0.04, ty);
    ctx.stroke();
  }
};

const drawLoftIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  const profiles = [
    { cx: x + size * 0.28, cy: y + size * 0.64, rx: size * 0.14, ry: size * 0.08 },
    { cx: x + size * 0.5, cy: y + size * 0.5, rx: size * 0.18, ry: size * 0.1 },
    { cx: x + size * 0.74, cy: y + size * 0.34, rx: size * 0.14, ry: size * 0.08 },
  ];

  ctx.beginPath();
  ctx.moveTo(profiles[0].cx, profiles[0].cy - profiles[0].ry);
  ctx.quadraticCurveTo(
    profiles[1].cx,
    profiles[1].cy - profiles[1].ry * 1.6,
    profiles[2].cx,
    profiles[2].cy - profiles[2].ry
  );
  ctx.lineTo(profiles[2].cx, profiles[2].cy + profiles[2].ry);
  ctx.quadraticCurveTo(
    profiles[1].cx,
    profiles[1].cy + profiles[1].ry * 1.6,
    profiles[0].cx,
    profiles[0].cy + profiles[0].ry
  );
  ctx.closePath();
  const fill = ctx.createLinearGradient(x, y + size * 0.2, x + size, y + size * 0.8);
  fill.addColorStop(0, "rgba(56,189,248,0.85)");
  fill.addColorStop(1, "rgba(14,116,144,0.85)");
  fillAndOutline(ctx, fill);

  ctx.lineWidth = 7;
  ctx.strokeStyle = "#f8fafc";
  profiles.forEach((profile) => {
    ctx.beginPath();
    ctx.ellipse(profile.cx, profile.cy, profile.rx, profile.ry, -0.2, 0, Math.PI * 2);
    ctx.stroke();
  });
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
  const head = 18;

  ctx.lineWidth = 12;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  const hx = to.x - ux * head;
  const hy = to.y - uy * head;
  const nx = -uy;
  const ny = ux;

  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(hx + nx * 10, hy + ny * 10);
  ctx.lineTo(hx - nx * 10, hy - ny * 10);
  ctx.closePath();
  fillAndOutline(ctx, color, "rgba(0,0,0,0.5)");
};

const drawMoveIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  const c = { x: x + size * 0.5, y: y + size * 0.56 };
  drawArrow(ctx, { x: c.x, y: c.y }, { x: x + size * 0.84, y: c.y }, "#ef4444");
  drawArrow(ctx, { x: c.x, y: c.y }, { x: c.x, y: y + size * 0.18 }, "#22c55e");
  drawArrow(ctx, { x: c.x, y: c.y }, { x: x + size * 0.26, y: y + size * 0.86 }, "#3b82f6");
};

const drawRotateIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  const cx = x + size * 0.52;
  const cy = y + size * 0.52;
  const r = size * 0.3;

  ctx.lineWidth = 12;
  ctx.strokeStyle = "#a855f7";
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.18, Math.PI * 1.55);
  ctx.stroke();

  const endAngle = Math.PI * 1.55;
  const ex = cx + Math.cos(endAngle) * r;
  const ey = cy + Math.sin(endAngle) * r;
  drawArrow(ctx, { x: ex - 1, y: ey - 1 }, { x: ex + size * 0.16, y: ey + size * 0.02 }, "#d946ef");
};

const drawScaleIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  const rx = x + size * 0.24;
  const ry = y + size * 0.26;
  const rw = size * 0.5;
  const rh = size * 0.5;

  roundedRectPath(ctx, rx, ry, rw, rh, size * 0.06);
  const fill = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
  fill.addColorStop(0, "#99f6e4");
  fill.addColorStop(1, "#14b8a6");
  fillAndOutline(ctx, fill);

  drawArrow(
    ctx,
    { x: rx + rw * 0.55, y: ry + rh * 0.45 },
    { x: x + size * 0.86, y: y + size * 0.14 },
    "#0ea5e9"
  );
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
  drawSoftShadow(ctx, { x, y, size });
  const origin = { x: x + size * 0.36, y: y + size * 0.7 };
  drawArrow(ctx, origin, { x: origin.x + size * 0.48, y: origin.y }, "#ef4444");
  drawArrow(ctx, origin, { x: origin.x, y: origin.y - size * 0.5 }, "#22c55e");

  const cubeX = x + size * 0.58;
  const cubeY = y + size * 0.28;
  drawCube(ctx, cubeX - size * 0.22, cubeY - size * 0.22, size * 0.44, {
    top: "#bfdbfe",
    left: "#60a5fa",
    right: "#3b82f6",
  });
};

const drawExtrudeIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawSoftShadow(ctx, { x, y, size });
  const baseX = x + size * 0.24;
  const baseY = y + size * 0.62;
  const baseW = size * 0.38;
  const baseH = size * 0.22;

  roundedRectPath(ctx, baseX, baseY, baseW, baseH, size * 0.05);
  const baseFill = ctx.createLinearGradient(baseX, baseY, baseX, baseY + baseH);
  baseFill.addColorStop(0, "#fca5a5");
  baseFill.addColorStop(1, "#ef4444");
  fillAndOutline(ctx, baseFill);

  const columnX = baseX + baseW * 0.15;
  const columnY = y + size * 0.22;
  const columnW = baseW * 0.7;
  const columnH = size * 0.36;
  roundedRectPath(ctx, columnX, columnY, columnW, columnH, size * 0.05);
  const colFill = ctx.createLinearGradient(columnX, columnY, columnX, columnY + columnH);
  colFill.addColorStop(0, "#fef3c7");
  colFill.addColorStop(1, "#f59e0b");
  fillAndOutline(ctx, colFill);

  drawArrow(
    ctx,
    { x: columnX + columnW * 0.5, y: columnY + columnH * 0.1 },
    { x: columnX + columnW * 0.5, y: y + size * 0.04 },
    "#22d3ee"
  );
};

const drawSpecificitySymbolIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawSoftShadow(ctx, { x, y, size });

  const cx = x + size * 0.5;
  const cy = y + size * 0.5;
  const diamondSize = size * 0.72;
  const diamondRadius = diamondSize * 0.18;

  const drawDiamond = (
    scale: number,
    fill: string | CanvasGradient,
    stroke: string | CanvasGradient,
    lineWidth: number
  ) => {
    const scaled = diamondSize * scale;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    roundedRectPath(
      ctx,
      -scaled / 2,
      -scaled / 2,
      scaled,
      scaled,
      diamondRadius * scale
    );
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  const outerFill = ctx.createLinearGradient(cx, cy - diamondSize, cx, cy + diamondSize);
  outerFill.addColorStop(0, "#fbfaf8");
  outerFill.addColorStop(1, "#f1ede5");
  drawDiamond(1, outerFill, "rgba(46,46,44,0.58)", size * 0.06);

  const innerStroke = ctx.createLinearGradient(
    cx - diamondSize,
    cy - diamondSize,
    cx + diamondSize,
    cy + diamondSize
  );
  innerStroke.addColorStop(0, "#d9d4cc");
  innerStroke.addColorStop(1, "#bdb7ae");
  drawDiamond(0.72, "rgba(0,0,0,0)", innerStroke, size * 0.035);

  const ribbonFill = ctx.createLinearGradient(
    cx - diamondSize,
    cy - diamondSize,
    cx + diamondSize,
    cy + diamondSize
  );
  ribbonFill.addColorStop(0, "#f8f4ec");
  ribbonFill.addColorStop(1, "#e6e2d9");

  const ribbonAngle = (-32 * Math.PI) / 180;
  const ribbonLength = diamondSize * 0.92;
  const ribbonThickness = diamondSize * 0.22;
  const ribbonRadius = ribbonThickness * 0.5;

  const drawRibbon = (offsetX: number, offsetY: number) => {
    ctx.save();
    ctx.translate(cx + offsetX, cy + offsetY);
    ctx.rotate(ribbonAngle);
    roundedRectPath(
      ctx,
      -ribbonLength / 2,
      -ribbonThickness / 2,
      ribbonLength,
      ribbonThickness,
      ribbonRadius
    );
    fillAndOutline(ctx, ribbonFill, "rgba(46, 46, 44, 0.68)");
    ctx.restore();
  };

  drawRibbon(-diamondSize * 0.12, -diamondSize * 0.14);
  drawRibbon(diamondSize * 0.12, diamondSize * 0.14);

  const coreGlow = ctx.createRadialGradient(
    cx,
    cy,
    diamondSize * 0.08,
    cx,
    cy,
    diamondSize * 0.7
  );
  coreGlow.addColorStop(0, "rgba(46,46,44,0.14)");
  coreGlow.addColorStop(1, "rgba(46,46,44,0)");
  ctx.fillStyle = coreGlow;
  ctx.fillRect(x, y, size, size);
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
  drawSoftShadow(ctx, { x, y, size });
  const bodyX = x + size * 0.14;
  const bodyY = y + size * 0.32;
  const bodyW = size * 0.72;
  const bodyH = size * 0.44;
  roundedRectPath(ctx, bodyX, bodyY, bodyW, bodyH, size * 0.1);
  const bodyFill = ctx.createLinearGradient(bodyX, bodyY, bodyX, bodyY + bodyH);
  bodyFill.addColorStop(0, "#e2e8f0");
  bodyFill.addColorStop(1, "#94a3b8");
  fillAndOutline(ctx, bodyFill);

  const lensX = x + size * 0.5;
  const lensY = y + size * 0.54;
  const lensR = size * 0.2;
  const lens = ctx.createRadialGradient(
    lensX - lensR * 0.25,
    lensY - lensR * 0.3,
    lensR * 0.2,
    lensX,
    lensY,
    lensR
  );
  lens.addColorStop(0, "#bae6fd");
  lens.addColorStop(1, "#0ea5e9");
  ctx.beginPath();
  ctx.arc(lensX, lensY, lensR, 0, Math.PI * 2);
  fillAndOutline(ctx, lens);

  const flashX = x + size * 0.28;
  const flashY = y + size * 0.28;
  const flashW = size * 0.18;
  const flashH = size * 0.1;
  roundedRectPath(ctx, flashX, flashY, flashW, flashH, size * 0.04);
  fillAndOutline(ctx, "#fef08a");
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

  const pad = size * 0.16;
  const outerSize = size - pad * 2;
  roundedRectPath(ctx, x + pad, y + pad, outerSize, outerSize, size * 0.16);
  const outerFill = ctx.createLinearGradient(x + pad, y + pad, x + pad, y + pad + outerSize);
  outerFill.addColorStop(0, "#e2e8f0");
  outerFill.addColorStop(1, "#94a3b8");
  fillAndOutline(ctx, outerFill);

  const innerPad = size * 0.3;
  const innerSize = size - innerPad * 2;
  roundedRectPath(ctx, x + innerPad, y + innerPad, innerSize, innerSize, size * 0.12);
  fillAndOutline(ctx, "#f8fafc", "rgba(15, 23, 42, 0.7)");

  ctx.strokeStyle = "#0ea5e9";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.2, y + size * 0.5);
  ctx.lineTo(x + size * 0.36, y + size * 0.5);
  ctx.moveTo(x + size * 0.64, y + size * 0.5);
  ctx.lineTo(x + size * 0.8, y + size * 0.5);
  ctx.stroke();
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
  drawSoftShadow(ctx, { x, y, size });
  const pad = size * 0.16;
  const w = size - pad * 2;
  const h = size - pad * 2;
  roundedRectPath(ctx, x + pad, y + pad, w, h, size * 0.14);
  const fill = ctx.createLinearGradient(x, y + pad, x, y + pad + h);
  fill.addColorStop(0, colors.top);
  fill.addColorStop(1, colors.bottom);
  fillAndOutline(ctx, fill);
};

const strokeMathSymbol = (
  ctx: CanvasRenderingContext2D,
  size: number,
  drawPath: () => void
) => {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.lineWidth = size * 0.16;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.52)";
  drawPath();
  ctx.stroke();

  ctx.lineWidth = size * 0.1;
  ctx.strokeStyle = "#f8fafc";
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
  drawMathBadge(ctx, x, y, size, { top: "#d8ccff", bottom: "#7c5ce6" });
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(30, 27, 75, 0.35)";
  ctx.shadowBlur = size * 0.06;
  ctx.font = `${Math.round(size * 0.54)}px "Proxima Nova", "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText("1", x + size * 0.5, y + size * 0.56);
  ctx.restore();
};

const drawAddIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawMathBadge(ctx, x, y, size, { top: "#a5f3fc", bottom: "#0ea5e9" });
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
  drawMathBadge(ctx, x, y, size, { top: "#fed7aa", bottom: "#f97316" });
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
  drawMathBadge(ctx, x, y, size, { top: "#fbcfe8", bottom: "#db2777" });
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
  const r = size * 0.055;
  ctx.save();
  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "rgba(15, 23, 42, 0.45)";
  ctx.lineWidth = size * 0.035;
  ctx.beginPath();
  ctx.arc(cx, y + size * offset, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

const drawDivideIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawMathBadge(ctx, x, y, size, { top: "#bfdbfe", bottom: "#2563eb" });
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
  drawMathBadge(ctx, x, y, size, { top: "#bbf7d0", bottom: "#22c55e" });
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
  drawMathBadge(ctx, x, y, size, { top: "#99f6e4", bottom: "#0d9488" });
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
  drawMathBadge(ctx, x, y, size, { top: "#fecaca", bottom: "#ef4444" });
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
  drawMathBadge(ctx, x, y, size, { top: "#e9d5ff", bottom: "#7c3aed" });
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(76, 29, 149, 0.4)";
  ctx.shadowBlur = size * 0.05;
  ctx.font = `${Math.round(size * 0.36)}px "Proxima Nova", "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText("fx", x + size * 0.5, y + size * 0.56);
  ctx.restore();
};

const drawConditionalIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawMathBadge(ctx, x, y, size, { top: "#fde68a", bottom: "#f59e0b" });
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
  drawNodeDot(ctx, origin.x, origin.y, size * 0.1, {
    inner: "#fef9c3",
    outer: "#f97316",
  });
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
  ctx.fillStyle = "#f8fafc";
  ctx.fill();
  ctx.strokeStyle = "rgba(15, 23, 42, 0.55)";
  ctx.lineWidth = size * 0.045;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();
};

const drawVectorArrow = (
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  size: number
) => {
  strokeMathSymbol(ctx, size, () => {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
  });
  drawArrowHead(ctx, start, end, size);
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
    drawNodeDot(ctx, point.x, point.y, size * 0.07, {
      inner: "#e0f2fe",
      outer: "#0ea5e9",
    })
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
    strokeMathSymbol(ctx, size * 0.9, () => {
      ctx.beginPath();
      ctx.moveTo(x + size * 0.52, y + size * 0.46);
      ctx.lineTo(target.x - size * 0.08, target.y);
    });
    drawNodeDot(ctx, target.x, target.y, size * 0.07, {
      inner: "#f0fdf4",
      outer: "#22c55e",
    });
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
  strokeMathSymbol(ctx, size, () => {
    ctx.beginPath();
    ctx.moveTo(x + size * 0.28, y + size * 0.7);
    ctx.lineTo(x + size * 0.64, y + size * 0.7);
  });
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
  strokeMathSymbol(ctx, size * 0.85, () => {
    ctx.beginPath();
    ctx.moveTo(x + size * 0.18, y + size * 0.26);
    ctx.lineTo(x + size * 0.34, y + size * 0.26);
    ctx.moveTo(x + size * 0.26, y + size * 0.18);
    ctx.lineTo(x + size * 0.26, y + size * 0.34);
  });
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
  strokeMathSymbol(ctx, size * 0.8, () => {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y + size * 0.06);
    ctx.lineTo(start.x, start.y - size * 0.06);
    ctx.moveTo(end.x, end.y + size * 0.06);
    ctx.lineTo(end.x, end.y - size * 0.06);
  });
};

const drawVectorNormalizeIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  drawVectorBadge(ctx, x, y, size, { top: "#e9d5ff", bottom: "#7c3aed" });
  const center = { x: x + size * 0.64, y: y + size * 0.5 };
  strokeMathSymbol(ctx, size * 0.85, () => {
    ctx.beginPath();
    ctx.arc(center.x, center.y, size * 0.18, 0, Math.PI * 2);
  });
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
  drawNodeDot(ctx, mid.x, mid.y, size * 0.1, {
    inner: "#fee2e2",
    outer: "#ef4444",
  });
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
  drawNodeDot(ctx, left.x, left.y, size * 0.08, {
    inner: "#e0e7ff",
    outer: "#6366f1",
  });
  drawNodeDot(ctx, right.x, right.y, size * 0.08, {
    inner: "#e0e7ff",
    outer: "#6366f1",
  });
  strokeMathSymbol(ctx, size, () => {
    ctx.beginPath();
    ctx.moveTo(left.x + size * 0.06, left.y - size * 0.06);
    ctx.lineTo(right.x - size * 0.06, right.y + size * 0.06);
    ctx.moveTo(left.x + size * 0.02, left.y + size * 0.12);
    ctx.lineTo(left.x + size * 0.02, left.y - size * 0.04);
    ctx.moveTo(right.x - size * 0.02, right.y + size * 0.04);
    ctx.lineTo(right.x - size * 0.02, right.y - size * 0.12);
  });
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
  drawNodeDot(ctx, start.x, start.y, size * 0.085, {
    inner: "#dbeafe",
    outer: "#2563eb",
  });
  drawNodeDot(ctx, end.x, end.y, size * 0.085, {
    inner: "#dbeafe",
    outer: "#2563eb",
  });
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
  drawNodeDot(ctx, origin.x, origin.y, size * 0.075, {
    inner: "#e0f2fe",
    outer: "#0ea5e9",
  });

  const radius = size * 0.26;
  const startAngle = -0.04 * Math.PI;
  const endAngle = -0.48 * Math.PI;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.07;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.55)";
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, radius, startAngle, endAngle, true);
  ctx.stroke();
  ctx.lineWidth = size * 0.045;
  ctx.strokeStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, radius, startAngle, endAngle, true);
  ctx.stroke();
  ctx.restore();
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

  strokeMathSymbol(ctx, size * 0.92, () => {
    ctx.beginPath();
    ctx.moveTo(left.x + size * 0.06, left.y - size * 0.06);
    ctx.lineTo(right.x - size * 0.06, right.y + size * 0.06);
  });

  drawNodeDot(ctx, left.x, left.y, size * 0.08, {
    inner: "#e0f2fe",
    outer: "#0ea5e9",
  });
  drawNodeDot(ctx, right.x, right.y, size * 0.08, {
    inner: "#e0f2fe",
    outer: "#0ea5e9",
  });
  drawNodeDot(ctx, mid.x, mid.y, size * 0.085, {
    inner: "#f0f9ff",
    outer: "#38bdf8",
  });
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
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.06;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.52)";
  ctx.beginPath();
  ctx.moveTo(vectorEnd.x, vectorEnd.y);
  ctx.lineTo(projection.x, projection.y);
  ctx.stroke();
  ctx.lineWidth = size * 0.038;
  ctx.strokeStyle = "#f8fafc";
  ctx.beginPath();
  ctx.moveTo(vectorEnd.x, vectorEnd.y);
  ctx.lineTo(projection.x, projection.y);
  ctx.stroke();
  ctx.restore();

  drawVectorArrow(ctx, { x: origin.x + size * 0.14, y: axisEnd.y }, projection, size);
  drawNodeDot(ctx, projection.x, projection.y, size * 0.075, {
    inner: "#ede9fe",
    outer: "#8b5cf6",
  });
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
  drawNodeDot(ctx, start.x, start.y, size * 0.085, {
    inner: "#dcfce7",
    outer: "#22c55e",
  });
  drawVectorArrow(ctx, start, end, size);
  drawNodeDot(ctx, end.x, end.y, size * 0.085, {
    inner: "#f0fdf4",
    outer: "#4ade80",
  });
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

  drawNodeDot(ctx, point.x, point.y, size * 0.085, {
    inner: "#ccfbf1",
    outer: "#14b8a6",
  });

  ctx.save();
  ctx.setLineDash([size * 0.05, size * 0.045]);
  drawVectorArrow(ctx, point, ghost, size * 0.92);
  ctx.restore();

  drawVectorArrow(ctx, point, offsetEnd, size);
  drawNodeDot(ctx, offsetEnd.x, offsetEnd.y, size * 0.08, {
    inner: "#ecfdf5",
    outer: "#34d399",
  });
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
  drawNodeDot(ctx, center.x, center.y, size * 0.07, {
    inner: "#ffedd5",
    outer: "#f97316",
  });

  const radius = size * 0.26;
  const arcStart = -0.18 * Math.PI;
  const arcEnd = 0.7 * Math.PI;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.07;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.52)";
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, arcStart, arcEnd);
  ctx.stroke();
  ctx.lineWidth = size * 0.045;
  ctx.strokeStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, arcStart, arcEnd);
  ctx.stroke();
  ctx.restore();

  const to = {
    x: center.x + Math.cos(arcEnd) * radius,
    y: center.y + Math.sin(arcEnd) * radius,
  };
  const from = {
    x: center.x + Math.cos(arcEnd - 0.2) * radius,
    y: center.y + Math.sin(arcEnd - 0.2) * radius,
  };
  drawArrowHead(ctx, from, to, size);
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
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (options?.dash) {
    ctx.setLineDash(options.dash);
  }
  ctx.lineWidth = outerWidth;
  ctx.strokeStyle = outerColor;
  drawPath();
  ctx.stroke();
  ctx.lineWidth = innerWidth;
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
  const padX = size * 0.25;
  const padY = size * 0.25;
  const rowHeight = size * 0.086;
  const gap = size * 0.052;
  const rowWidth = size - padX * 2;
  const rows: Array<{ x: number; y: number; width: number; height: number }> = [];

  for (let i = 0; i < 4; i += 1) {
    const rowY = y + padY + i * (rowHeight + gap);
    const row = { x: x + padX, y: rowY, width: rowWidth, height: rowHeight };
    rows.push(row);

    ctx.save();
    roundedRectPath(ctx, row.x, row.y, row.width, row.height, rowHeight * 0.45);
    ctx.fillStyle = i % 2 === 0 ? "rgba(248, 250, 252, 0.96)" : "rgba(241, 245, 249, 0.96)";
    ctx.fill();
    ctx.lineWidth = size * 0.02;
    ctx.strokeStyle = "rgba(15, 23, 42, 0.18)";
    ctx.stroke();
    ctx.restore();
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
  ctx.save();
  roundedRectPath(
    ctx,
    focusRow.x - size * 0.01,
    focusRow.y - size * 0.008,
    focusRow.width + size * 0.02,
    focusRow.height + size * 0.016,
    focusRow.height * 0.5
  );
  const highlight = ctx.createLinearGradient(
    focusRow.x,
    focusRow.y,
    focusRow.x,
    focusRow.y + focusRow.height
  );
  highlight.addColorStop(0, "#c7d2fe");
  highlight.addColorStop(1, "#6366f1");
  ctx.fillStyle = highlight;
  ctx.fill();
  ctx.lineWidth = size * 0.02;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.3)";
  ctx.stroke();
  ctx.restore();

  drawNodeDot(ctx, focusRow.x - size * 0.04, focusRow.y + focusRow.height * 0.5, size * 0.06, {
    inner: "#eef2ff",
    outer: "#4f46e5",
  });
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

const drawIconToTile = (
  ctx: CanvasRenderingContext2D,
  id: IconId,
  x: number,
  y: number,
  size: number
) => {
  ctx.save();
  ctx.clearRect(x, y, size, size);

  ctx.globalCompositeOperation = "source-over";
  const bg = ctx.createLinearGradient(x, y, x, y + size);
  bg.addColorStop(0, "rgba(255,255,255,0)");
  bg.addColorStop(1, "rgba(0,0,0,0.02)");
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, size, size);

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
    case "specificitySymbol":
      drawSpecificitySymbolIcon(ctx, x, y, size);
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
    default:
      drawPointIcon(ctx, x, y, size);
      break;
  }

  applyGloss(ctx, { x, y, size });
  ctx.restore();
};

export const renderIconDataUrl = (id: IconId, size = 96) => {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = true;
  drawIconToTile(ctx, id, 0, 0, size);
  return canvas.toDataURL("image/png");
};

const createAtlasSpec = (gl: WebGLRenderingContext): AtlasSpec => {
  const columns = 6;
  const rows = Math.ceil(ICON_IDS.length / columns);
  const width = columns * ATLAS_ICON_SIZE;
  const height = rows * ATLAS_ICON_SIZE;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create icon atlas context");
  }

  ctx.imageSmoothingEnabled = true;

  const uvById: Record<string, IconUV> = {};
  ICON_IDS.forEach((id, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = col * ATLAS_ICON_SIZE;
    const y = row * ATLAS_ICON_SIZE;
    drawIconToTile(ctx, id, x, y, ATLAS_ICON_SIZE);

    const u0 = x / width;
    const v0 = y / height;
    const u1 = (x + ATLAS_ICON_SIZE) / width;
    const v1 = (y + ATLAS_ICON_SIZE) / height;
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
