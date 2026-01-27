import { useEffect, useRef, useState } from "react";
import { WebGLUIRenderer, type RGBA } from "../webgl/ui/WebGLUIRenderer";
import { WebGLTextRenderer } from "../webgl/ui/WebGLTextRenderer";
import { WebGLIconRenderer, type IconId } from "../webgl/ui/WebGLIconRenderer";

export type { IconId };

export type WebGLTopBarAction = {
  id: string;
  label: string;
  tooltip: string;
  onClick: () => void;
  shortLabel?: string;
  icon?: IconId;
  isActive?: boolean;
  isDisabled?: boolean;
  groupBreakBefore?: boolean;
};

type Rect = { x: number; y: number; width: number; height: number };

type LayoutButton = { id: string; rect: Rect; action: WebGLTopBarAction };

type LayoutState = {
  buttons: LayoutButton[];
  separators: Rect[];
  labelOffset: number;
  height: number;
  totalWidth: number;
  visibleWidth: number;
};

type WebGLPanelTopBarProps = {
  actions: WebGLTopBarAction[];
  label?: string;
  className?: string;
};

const rgb = (r: number, g: number, b: number, a = 1): RGBA => [
  r / 255,
  g / 255,
  b / 255,
  a,
];

const PALETTE = {
  button: rgb(249, 246, 241, 1),
  buttonHover: rgb(255, 255, 255, 1),
  buttonActive: rgb(236, 232, 225, 1),
  border: rgb(0, 0, 0, 1),
  shadow: rgb(0, 0, 0, 0.4),
  icon: rgb(12, 12, 12, 1),
  tooltipBg: rgb(15, 15, 15, 0.95),
};

const BUTTON_SIZE = 40;
const BUTTON_GAP = 6;
const PADDING_X = 10;
const PADDING_Y = 8;
const LABEL_HEIGHT = 10;
const LABEL_GAP = 4;
const SHADOW_OFFSET = 3;
const ICON_INSET = 5.5;
const SEPARATOR_GAP = 10;
const SEPARATOR_WIDTH = 2;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const ACTION_ICON_MAP: Record<string, IconId> = {
  point: "point",
  line: "line",
  polyline: "polyline",
  rectangle: "rectangle",
  circle: "circle",
  primitive: "primitive",
  box: "box",
  sphere: "sphere",
  move: "move",
  rotate: "rotate",
  scale: "scale",
  undo: "undo",
  redo: "redo",
  delete: "delete",
  focus: "focus",
  frameall: "frameAll",
  copy: "copy",
  paste: "paste",
  duplicate: "duplicate",
  gumball: "gumball",
  "geometry-reference": "geometryReference",
  "point-generator": "pointGenerator",
  "line-builder": "lineBuilder",
  "circle-generator": "circleGenerator",
  "box-builder": "boxBuilder",
  "transform-node": "transform",
  surface: "surface",
  loft: "loft",
  extrude: "extrude",
  "extrude-node": "extrude",
  "selection-filter": "selectionFilter",
  "display-mode": "displayMode",
  "reference-active": "referenceActive",
  "reference-all": "referenceAll",
  group: "group",
  ungroup: "ungroup",
  "advanced-toggle": "advanced",
  "transform-orientation": "transformOrientation",
  "pivot-mode": "pivotMode",
  "cplane-xy": "cplaneXY",
  "cplane-xz": "cplaneXZ",
  "cplane-yz": "cplaneYZ",
  "cplane-align": "cplaneAlign",
  capture: "capture",
};

const getShortLabel = (action: WebGLTopBarAction) =>
  action.shortLabel ?? action.label.slice(0, 3).toUpperCase();

const resolveIconId = (action: WebGLTopBarAction): IconId | null =>
  action.icon ?? ACTION_ICON_MAP[action.id] ?? null;

const WebGLPanelTopBar = ({ actions, label, className }: WebGLPanelTopBarProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const uiRef = useRef<WebGLUIRenderer | null>(null);
  const textRef = useRef<WebGLTextRenderer | null>(null);
  const iconRef = useRef<WebGLIconRenderer | null>(null);
  const dprRef = useRef(1);
  const hoveredIdRef = useRef<string | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const layoutRef = useRef<LayoutState>({
    buttons: [],
    separators: [],
    labelOffset: 0,
    height: 0,
    totalWidth: 0,
    visibleWidth: 0,
  });
  const [barHeight, setBarHeight] = useState(70);
  const [scrollX, setScrollX] = useState(0);
  const scrollRef = useRef(0);

  const drawRect = (rect: Rect, color: RGBA) => {
    const ui = uiRef.current;
    if (!ui) return;
    const dpr = dprRef.current;
    ui.drawRect(rect.x * dpr, rect.y * dpr, rect.width * dpr, rect.height * dpr, color);
  };

  const drawLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    color: RGBA
  ) => {
    const ui = uiRef.current;
    if (!ui) return;
    const dpr = dprRef.current;
    ui.drawLine(x1 * dpr, y1 * dpr, x2 * dpr, y2 * dpr, thickness * dpr, color);
  };

  const drawCircle = (
    cx: number,
    cy: number,
    radius: number,
    thickness: number,
    color: RGBA
  ) => {
    const ui = uiRef.current;
    if (!ui) return;
    const dpr = dprRef.current;
    ui.drawCircle(cx * dpr, cy * dpr, radius * dpr, thickness * dpr, color);
  };

  const drawArc = (
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    thickness: number,
    color: RGBA
  ) => {
    const segments = 18;
    for (let i = 0; i < segments; i += 1) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const a0 = startAngle + (endAngle - startAngle) * t0;
      const a1 = startAngle + (endAngle - startAngle) * t1;
      const x0 = cx + Math.cos(a0) * radius;
      const y0 = cy + Math.sin(a0) * radius;
      const x1 = cx + Math.cos(a1) * radius;
      const y1 = cy + Math.sin(a1) * radius;
      drawLine(x0, y0, x1, y1, thickness, color);
    }
  };

  const drawRectStroke = (rect: Rect, thickness: number, color: RGBA) => {
    const ui = uiRef.current;
    if (!ui) return;
    const dpr = dprRef.current;
    ui.drawRectStroke(
      rect.x * dpr,
      rect.y * dpr,
      rect.width * dpr,
      rect.height * dpr,
      thickness * dpr,
      color
    );
  };

  const drawShadowRect = (rect: Rect, offset: number, color: RGBA) => {
    drawRect(
      {
        x: rect.x + offset,
        y: rect.y + offset,
        width: rect.width,
        height: rect.height,
      },
      color
    );
  };

  const drawText = (text: string, x: number, y: number, size: number, color: RGBA) => {
    const textRenderer = textRef.current;
    const canvas = canvasRef.current;
    if (!textRenderer || !canvas) return;
    const dpr = dprRef.current;
    textRenderer.setText(text, {
      fontSize: size * dpr,
      paddingX: 2 * dpr,
      paddingY: 2 * dpr,
      color: "#ffffff",
    });
    textRenderer.draw(
      x * dpr,
      y * dpr,
      { width: canvas.width, height: canvas.height },
      color
    );
  };

  const drawIcon = (icon: IconId, cx: number, cy: number, size: number, color: RGBA) => {
    switch (icon) {
      case "point":
      case "pointGenerator":
        drawCircle(cx, cy, size * 0.18, 2, color);
        drawLine(cx - size * 0.32, cy, cx + size * 0.32, cy, 2, color);
        drawLine(cx, cy - size * 0.32, cx, cy + size * 0.32, 2, color);
        break;
      case "line":
      case "lineBuilder":
        drawLine(cx - size * 0.4, cy + size * 0.2, cx + size * 0.4, cy - size * 0.2, 2, color);
        drawCircle(cx - size * 0.4, cy + size * 0.2, size * 0.08, 2, color);
        drawCircle(cx + size * 0.4, cy - size * 0.2, size * 0.08, 2, color);
        break;
      case "arc": {
        const arcCx = cx + size * 0.02;
        const arcCy = cy + size * 0.08;
        const radius = size * 0.34;
        const startAngle = Math.PI * 1.05;
        const endAngle = Math.PI * 1.95;
        drawArc(arcCx, arcCy, radius, startAngle, endAngle, 2, color);
        const startX = arcCx + Math.cos(startAngle) * radius;
        const startY = arcCy + Math.sin(startAngle) * radius;
        const endX = arcCx + Math.cos(endAngle) * radius;
        const endY = arcCy + Math.sin(endAngle) * radius;
        const midAngle = (startAngle + endAngle) * 0.5;
        const midX = arcCx + Math.cos(midAngle) * radius;
        const midY = arcCy + Math.sin(midAngle) * radius;
        drawCircle(startX, startY, size * 0.075, 2, color);
        drawCircle(endX, endY, size * 0.075, 2, color);
        drawCircle(midX, midY, size * 0.065, 2, color);
        break;
      }
      case "polyline":
        drawLine(cx - size * 0.4, cy + size * 0.2, cx - size * 0.05, cy - size * 0.2, 2, color);
        drawLine(cx - size * 0.05, cy - size * 0.2, cx + size * 0.4, cy + size * 0.15, 2, color);
        drawCircle(cx - size * 0.4, cy + size * 0.2, size * 0.07, 2, color);
        drawCircle(cx - size * 0.05, cy - size * 0.2, size * 0.07, 2, color);
        drawCircle(cx + size * 0.4, cy + size * 0.15, size * 0.07, 2, color);
        break;
      case "rectangle":
        drawRectStroke(
          { x: cx - size * 0.32, y: cy - size * 0.22, width: size * 0.64, height: size * 0.44 },
          2,
          color
        );
        break;
      case "circle":
      case "circleGenerator":
        drawCircle(cx, cy, size * 0.32, 2, color);
        break;
      case "box":
      case "boxBuilder":
        drawRectStroke(
          { x: cx - size * 0.3, y: cy - size * 0.25, width: size * 0.6, height: size * 0.5 },
          2,
          color
        );
        drawLine(cx - size * 0.3, cy - size * 0.05, cx + size * 0.3, cy - size * 0.05, 2, color);
        break;
      case "sphere":
        drawCircle(cx, cy, size * 0.32, 2, color);
        drawLine(cx - size * 0.32, cy, cx + size * 0.32, cy, 2, color);
        break;
      case "move":
        drawLine(cx - size * 0.35, cy, cx + size * 0.35, cy, 2, color);
        drawLine(cx, cy - size * 0.35, cx, cy + size * 0.35, 2, color);
        break;
      case "rotate":
        drawCircle(cx, cy, size * 0.3, 2, color);
        drawLine(cx + size * 0.3, cy, cx + size * 0.45, cy - size * 0.15, 2, color);
        break;
      case "scale":
        drawRectStroke(
          { x: cx - size * 0.25, y: cy - size * 0.25, width: size * 0.5, height: size * 0.5 },
          2,
          color
        );
        drawLine(cx + size * 0.2, cy - size * 0.2, cx + size * 0.35, cy - size * 0.35, 2, color);
        break;
      case "geometryReference":
        drawCircle(cx, cy, size * 0.3, 2, color);
        drawLine(cx - size * 0.3, cy, cx + size * 0.3, cy, 2, color);
        drawLine(cx, cy - size * 0.3, cx, cy + size * 0.3, 2, color);
        break;
      case "transform":
        drawLine(cx - size * 0.3, cy, cx + size * 0.3, cy, 2, color);
        drawLine(cx, cy - size * 0.3, cx, cy + size * 0.3, 2, color);
        drawCircle(cx, cy, size * 0.22, 2, color);
        break;
      case "extrude":
        drawRectStroke(
          { x: cx - size * 0.2, y: cy - size * 0.2, width: size * 0.4, height: size * 0.4 },
          2,
          color
        );
        drawLine(cx, cy - size * 0.35, cx, cy - size * 0.2, 2, color);
        drawLine(cx - size * 0.1, cy - size * 0.32, cx, cy - size * 0.42, 2, color);
        drawLine(cx + size * 0.1, cy - size * 0.32, cx, cy - size * 0.42, 2, color);
        break;
      default:
        drawCircle(cx, cy, size * 0.3, 2, color);
        break;
    }
  };

  const drawCenteredLabel = (text: string, rect: Rect, size: number, color: RGBA) => {
    const textRenderer = textRef.current;
    const canvas = canvasRef.current;
    if (!textRenderer || !canvas) return;
    const dpr = dprRef.current;
    textRenderer.setText(text, {
      fontSize: size * dpr,
      paddingX: 0,
      paddingY: 0,
      color: "#ffffff",
    });
    const textSize = textRenderer.getSize();
    const textWidth = textSize.width / dpr;
    const textHeight = textSize.height / dpr;
    const x = rect.x + rect.width / 2 - textWidth / 2;
    const y = rect.y + rect.height / 2 - textHeight / 2;
    textRenderer.draw(
      x * dpr,
      y * dpr,
      { width: canvas.width, height: canvas.height },
      color
    );
  };

  const layoutButtons = (width: number) => {
    const safeWidth = Math.max(1, width);
    const labelOffset = label ? LABEL_HEIGHT + LABEL_GAP : 0;
    const height = PADDING_Y * 2 + labelOffset + BUTTON_SIZE;
    const y = PADDING_Y + labelOffset;
    const separators: Rect[] = [];
    let x = PADDING_X;

    const buttons = actions.map((action) => {
      if (action.groupBreakBefore && x > PADDING_X) {
        const separatorRect = {
          x: x + SEPARATOR_GAP * 0.5,
          y: y + 5,
          width: SEPARATOR_WIDTH,
          height: BUTTON_SIZE - 10,
        };
        separators.push(separatorRect);
        x += SEPARATOR_GAP + SEPARATOR_WIDTH;
      }
      const rect = { x, y, width: BUTTON_SIZE, height: BUTTON_SIZE };
      x += BUTTON_SIZE + BUTTON_GAP;
      return { id: action.id, rect, action };
    });

    const totalWidth = Math.max(safeWidth, x - BUTTON_GAP + PADDING_X);
    layoutRef.current = {
      buttons,
      separators,
      labelOffset,
      height,
      totalWidth,
      visibleWidth: safeWidth,
    };

    const maxScroll = Math.max(0, totalWidth - safeWidth);
    const nextScroll = clamp(scrollRef.current, 0, maxScroll);
    if (nextScroll !== scrollRef.current) {
      scrollRef.current = nextScroll;
      setScrollX(nextScroll);
    }

    setBarHeight(height);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    const ui = uiRef.current;
    const textRenderer = textRef.current;
    const iconRenderer = iconRef.current;
    if (!canvas || !gl || !ui || !textRenderer) return;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const fallbackButtons: LayoutButton[] = [];
    const scrollOffset = scrollRef.current;

    ui.begin(canvas.width, canvas.height);
    layoutRef.current.separators.forEach((separator) => {
      const rect = {
        x: separator.x - scrollOffset,
        y: separator.y,
        width: separator.width,
        height: separator.height,
      };
      drawRect(rect, rgb(0, 0, 0, 0.38));
    });
    layoutRef.current.buttons.forEach((button) => {
      const { action } = button;
      const rect = {
        x: button.rect.x - scrollOffset,
        y: button.rect.y,
        width: button.rect.width,
        height: button.rect.height,
      };
      const isDisabled = Boolean(action.isDisabled);
      const isHovered = hoveredIdRef.current === button.id && !isDisabled;
      const fill = action.isActive
        ? PALETTE.buttonActive
        : isHovered
          ? PALETTE.buttonHover
          : PALETTE.button;
      const disabledFill = rgb(236, 232, 225, 0.45);
      const finalFill = isDisabled ? disabledFill : fill;

      drawShadowRect(rect, SHADOW_OFFSET, PALETTE.shadow);
      drawRect(rect, finalFill);
      drawRectStroke(rect, 2, PALETTE.border);
    });
    ui.flush();

    const dpr = dprRef.current;

    if (iconRenderer) {
      iconRenderer.begin(canvas.width, canvas.height);
      layoutRef.current.buttons.forEach((button) => {
        const iconId = resolveIconId(button.action);
        if (!iconId) {
          fallbackButtons.push(button);
          return;
        }
        const renderRect = {
          x: button.rect.x - scrollOffset,
          y: button.rect.y,
          width: button.rect.width,
          height: button.rect.height,
        };

        const iconRect = {
          x: (renderRect.x + ICON_INSET) * dpr,
          y: (renderRect.y + ICON_INSET) * dpr,
          width: (renderRect.width - ICON_INSET * 2) * dpr,
          height: (renderRect.height - ICON_INSET * 2) * dpr,
        };

        const tint = button.action.isDisabled
          ? rgb(190, 190, 190, 0.7)
          : hoveredIdRef.current === button.id || button.action.isActive
            ? rgb(255, 255, 255, 1)
            : rgb(235, 235, 235, 0.98);

        iconRenderer.drawIcon(iconRect, iconId, tint);
      });
      iconRenderer.flush();
    } else {
      fallbackButtons.push(...layoutRef.current.buttons);
    }

    fallbackButtons.forEach((button) => {
      const labelColor = button.action.isDisabled ? rgb(12, 12, 12, 0.45) : PALETTE.icon;
      const rect = {
        x: button.rect.x - scrollOffset,
        y: button.rect.y,
        width: button.rect.width,
        height: button.rect.height,
      };
      drawCenteredLabel(getShortLabel(button.action), rect, 11, labelColor);
    });

    if (label) {
      drawText(label, PADDING_X, PADDING_Y, 10, PALETTE.icon);
    }

    const hovered = layoutRef.current.buttons.find(
      (button) => button.id === hoveredIdRef.current
    );
    if (!hovered) return;

    const tooltipText = hovered.action.tooltip;
    const paddingX = 10;
    const paddingY = 6;
    const fontSize = 12;

    textRenderer.setText(tooltipText, {
      fontSize: fontSize * dpr,
      paddingX: paddingX * dpr,
      paddingY: paddingY * dpr,
      color: "#ffffff",
    });
    const textSize = textRenderer.getSize();
    const tooltipX = pointerRef.current.x + 14;
    const tooltipY = pointerRef.current.y + 16;
    const rect = {
      x: tooltipX,
      y: tooltipY,
      width: textSize.width / dpr,
      height: textSize.height / dpr,
    };

    ui.begin(canvas.width, canvas.height);
    drawShadowRect(rect, 4, rgb(0, 0, 0, 0.9));
    drawRect(rect, PALETTE.tooltipBg);
    drawRectStroke(rect, 1, rgb(0, 0, 0, 0.9));
    ui.flush();

    textRenderer.draw(
      rect.x * dpr,
      rect.y * dpr,
      { width: canvas.width, height: canvas.height },
      [1, 1, 1, 1]
    );
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
    iconRef.current = new WebGLIconRenderer(gl);
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
      layoutButtons(rect.width);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(layoutRef.current.height * dpr));
      draw();
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [actions, label]);

  useEffect(() => {
    draw();
  }, [actions, label]);

  useEffect(() => {
    scrollRef.current = scrollX;
    draw();
  }, [scrollX]);

  const hitTest = (x: number, y: number) => {
    const layoutX = x + scrollRef.current;
    return (
      layoutRef.current.buttons.find(
        (button) =>
          layoutX >= button.rect.x &&
          layoutX <= button.rect.x + button.rect.width &&
          y >= button.rect.y &&
          y <= button.rect.y + button.rect.height
      ) ?? null
    );
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    pointerRef.current = { x, y };
    const hit = hitTest(x, y);
    hoveredIdRef.current = hit?.id ?? null;
    canvas.style.cursor = hit && !hit.action.isDisabled ? "pointer" : "default";
    draw();
  };

  const handlePointerLeave = () => {
    hoveredIdRef.current = null;
    draw();
  };

  const handlePointerUp = () => {
    const hit = layoutRef.current.buttons.find(
      (button) => button.id === hoveredIdRef.current
    );
    if (!hit || hit.action.isDisabled) return;
    hit.action.onClick();
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    const maxScroll = Math.max(0, layoutRef.current.totalWidth - layoutRef.current.visibleWidth);
    if (maxScroll <= 0) return;
    event.preventDefault();
    const dominantDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const nextScroll = clamp(scrollRef.current + dominantDelta, 0, maxScroll);
    if (nextScroll === scrollRef.current) return;
    scrollRef.current = nextScroll;
    setScrollX(nextScroll);
  };

  return (
    <div ref={containerRef} className={className} style={{ width: "100%", height: barHeight }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />
    </div>
  );
};

export default WebGLPanelTopBar;
