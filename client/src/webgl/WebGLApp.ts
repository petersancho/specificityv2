import { WebGLUIRenderer, type RGBA } from "./ui/WebGLUIRenderer";
import { WebGLTextRenderer } from "./ui/WebGLTextRenderer";
import { WebGLIconRenderer, type IconId } from "./ui/WebGLIconRenderer";

type Rect = { x: number; y: number; width: number; height: number };

type UIButton = {
  id: string;
  rect: Rect;
  icon: IconId;
  tooltip: string;
  panel: "left" | "right";
};

type UIPanels = {
  left: Rect;
  right: Rect;
  workspace: Rect;
};

type PointerState = {
  x: number;
  y: number;
};

const rgb = (r: number, g: number, b: number, a = 1): RGBA => [
  r / 255,
  g / 255,
  b / 255,
  a,
];

const PALETTE = {
  background: rgb(246, 242, 235, 1),
  panel: rgb(245, 241, 234, 1),
  workspace: rgb(251, 250, 248, 1),
  border: rgb(46, 46, 44, 1),
  accent: rgb(210, 139, 92, 1),
  shadow: rgb(0, 0, 0, 1),
  icon: rgb(32, 32, 30, 1),
  button: rgb(251, 250, 248, 1),
  buttonHover: rgb(255, 255, 255, 1),
  buttonActive: rgb(239, 233, 224, 1),
  tooltipBg: rgb(20, 20, 20, 0.94),
};

const ICON_INSET = 8;

const LEFT_TOOLS: Array<{ id: string; icon: IconId; tooltip: string }> = [
  { id: "point", icon: "point", tooltip: "Point" },
  { id: "line", icon: "line", tooltip: "Line" },
  { id: "polyline", icon: "polyline", tooltip: "Polyline" },
  { id: "rectangle", icon: "rectangle", tooltip: "Rectangle" },
  { id: "circle", icon: "circle", tooltip: "Circle" },
  { id: "box", icon: "box", tooltip: "Box" },
  { id: "sphere", icon: "sphere", tooltip: "Sphere" },
  { id: "move", icon: "move", tooltip: "Move" },
  { id: "rotate", icon: "rotate", tooltip: "Rotate" },
  { id: "scale", icon: "scale", tooltip: "Scale" },
];

const RIGHT_TOOLS: Array<{ id: string; icon: IconId; tooltip: string }> = [
  { id: "geometry-reference", icon: "geometryReference", tooltip: "Geometry Reference" },
  { id: "point-generator", icon: "pointGenerator", tooltip: "Point Generator" },
  { id: "line-builder", icon: "lineBuilder", tooltip: "Line Builder" },
  { id: "circle-generator", icon: "circleGenerator", tooltip: "Circle Generator" },
  { id: "box-builder", icon: "boxBuilder", tooltip: "Box Builder" },
  { id: "transform-node", icon: "transform", tooltip: "Transform" },
  { id: "extrude-node", icon: "extrude", tooltip: "Extrude" },
];

export class WebGLApp {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private ui: WebGLUIRenderer;
  private text: WebGLTextRenderer;
  private iconRenderer: WebGLIconRenderer;
  private dpr = 1;
  private size = { width: 1, height: 1 };
  private panels: UIPanels = {
    left: { x: 0, y: 0, width: 0, height: 0 },
    right: { x: 0, y: 0, width: 0, height: 0 },
    workspace: { x: 0, y: 0, width: 0, height: 0 },
  };
  private buttons: UIButton[] = [];
  private hoveredId: string | null = null;
  private activeId: string | null = "point";
  private focusedIndex = 0;
  private pointer: PointerState = { x: 0, y: 0 };
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", { antialias: true, alpha: false });
    if (!gl) {
      throw new Error("WebGL not supported");
    }
    this.gl = gl;
    this.ui = new WebGLUIRenderer(gl);
    this.text = new WebGLTextRenderer(gl);
    this.iconRenderer = new WebGLIconRenderer(gl);

    this.configureCanvas();
    this.configureGL();
    this.handleResize();
    this.attachEvents();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this.tick);
  }

  private configureCanvas(): void {
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    this.canvas.style.cursor = "default";
    this.canvas.tabIndex = 0;
  }

  private configureGL(): void {
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private attachEvents(): void {
    window.addEventListener("resize", this.handleResize);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    window.addEventListener("keydown", this.handleKeyDown);
  }

  private tick = () => {
    if (!this.running) return;
    this.render();
    requestAnimationFrame(this.tick);
  };

  private handleResize = () => {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.dpr = dpr;
    this.size = { width: rect.width, height: rect.height };
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.updateLayout();
  };

  private handlePointerMove = (event: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.pointer = { x, y };
    const hit = this.hitTest(x, y);
    this.hoveredId = hit?.id ?? null;
    this.canvas.style.cursor = hit ? "pointer" : "default";
  };

  private handlePointerDown = () => {
    this.canvas.focus();
  };

  private handlePointerUp = () => {
    if (!this.hoveredId) return;
    this.activeId = this.hoveredId;
    const index = this.buttons.findIndex((button) => button.id === this.hoveredId);
    if (index !== -1) {
      this.focusedIndex = index;
    }
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const direction = event.shiftKey ? -1 : 1;
      const next = (this.focusedIndex + direction + this.buttons.length) % this.buttons.length;
      this.focusedIndex = next;
      this.hoveredId = this.buttons[next]?.id ?? null;
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      const focused = this.buttons[this.focusedIndex];
      if (focused) {
        this.activeId = focused.id;
      }
    }
  };

  private updateLayout(): void {
    const padding = 24;
    const panelWidth = Math.max(240, Math.min(320, this.size.width * 0.22));
    const panelHeight = Math.max(320, this.size.height - padding * 2);
    const panelGap = 24;

    this.panels.left = {
      x: padding,
      y: padding,
      width: panelWidth,
      height: panelHeight,
    };
    this.panels.right = {
      x: this.size.width - padding - panelWidth,
      y: padding,
      width: panelWidth,
      height: panelHeight,
    };
    this.panels.workspace = {
      x: this.panels.left.x + panelWidth + panelGap,
      y: padding,
      width:
        this.size.width - panelWidth * 2 - panelGap * 2 - padding * 2,
      height: panelHeight,
    };

    this.buttons = [
      ...this.layoutPanelButtons(this.panels.left, LEFT_TOOLS, "left"),
      ...this.layoutPanelButtons(this.panels.right, RIGHT_TOOLS, "right"),
    ];
  }

  private layoutPanelButtons(
    panel: Rect,
    items: Array<{ id: string; icon: IconId; tooltip: string }>,
    side: "left" | "right"
  ): UIButton[] {
    const buttons: UIButton[] = [];
    const padding = 20;
    const topOffset = 58;
    const buttonSize = 56;
    const gap = 14;
    const columns = 2;

    const startX = panel.x + padding;
    const startY = panel.y + topOffset;

    items.forEach((item, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + col * (buttonSize + gap);
      const y = startY + row * (buttonSize + gap);
      buttons.push({
        id: item.id,
        rect: { x, y, width: buttonSize, height: buttonSize },
        icon: item.icon,
        tooltip: item.tooltip,
        panel: side,
      });
    });

    return buttons;
  }

  private render(): void {
    const gl = this.gl;
    gl.clearColor(
      PALETTE.background[0],
      PALETTE.background[1],
      PALETTE.background[2],
      PALETTE.background[3]
    );
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.ui.begin(this.canvas.width, this.canvas.height);

    this.drawWorkspace();
    this.drawPanel(this.panels.left, "Roslyn", "left");
    this.drawPanel(this.panels.right, "Numerica", "right");
    this.buttons.forEach((button, index) => {
      this.drawButton(button, index === this.focusedIndex);
    });

    this.ui.flush();

    this.iconRenderer.begin(this.canvas.width, this.canvas.height);
    this.buttons.forEach((button) => this.drawButtonIcon(button));
    this.iconRenderer.flush();

    this.drawTooltip();
  }

  private drawWorkspace(): void {
    const { workspace } = this.panels;
    this.drawShadowRect(workspace, 8);
    this.drawRect(workspace, PALETTE.workspace);
    this.drawRectStroke(workspace, 2, PALETTE.border);
  }

  private drawPanel(panel: Rect, label: string, side: "left" | "right"): void {
    this.drawShadowRect(panel, 8);
    this.drawRect(panel, PALETTE.panel);
    this.drawRectStroke(panel, 2, PALETTE.border);

    const labelText = side === "left" ? "ROS" : "NUM";
    const textColor = rgb(32, 32, 30, 1);
    this.drawText(labelText, panel.x + 18, panel.y + 18, 14, textColor);
    this.drawText(label.toUpperCase(), panel.x + 18, panel.y + 36, 11, textColor);
  }

  private drawButton(button: UIButton, isFocused: boolean): void {
    const isHovered = this.hoveredId === button.id;
    const isActive = this.activeId === button.id;

    const fill = isActive
      ? PALETTE.buttonActive
      : isHovered
        ? PALETTE.buttonHover
        : PALETTE.button;

    this.drawShadowRect(button.rect, 4);
    this.drawRect(button.rect, fill);
    this.drawRectStroke(button.rect, 2, PALETTE.border);

    if (isFocused) {
      this.drawRectStroke(
        {
          x: button.rect.x + 2,
          y: button.rect.y + 2,
          width: button.rect.width - 4,
          height: button.rect.height - 4,
        },
        2,
        PALETTE.accent
      );
    }
  }

  private drawButtonIcon(button: UIButton): void {
    const isHovered = this.hoveredId === button.id;
    const isActive = this.activeId === button.id;
    const inset = ICON_INSET;

    const rect = {
      x: (button.rect.x + inset) * this.dpr,
      y: (button.rect.y + inset) * this.dpr,
      width: (button.rect.width - inset * 2) * this.dpr,
      height: (button.rect.height - inset * 2) * this.dpr,
    };

    const tint = isActive || isHovered ? rgb(255, 255, 255, 1) : rgb(235, 235, 235, 0.98);
    this.iconRenderer.drawIcon(rect, button.icon, tint);
  }

  private drawTooltip(): void {
    const hovered = this.buttons.find((button) => button.id === this.hoveredId);
    const fallback = this.buttons[this.focusedIndex];
    const target = hovered ?? fallback;
    if (!target) return;

    const text = hovered ? target.tooltip : target.tooltip;
    const paddingX = 10;
    const paddingY = 6;
    const fontSize = 12;

    this.text.setText(text, {
      fontSize: fontSize * this.dpr,
      paddingX: paddingX * this.dpr,
      paddingY: paddingY * this.dpr,
      color: "#ffffff",
    });

    const textSize = this.text.getSize();
    const tooltipX = this.pointer.x + 16;
    const tooltipY = this.pointer.y + 16;

    const rect = {
      x: tooltipX,
      y: tooltipY,
      width: textSize.width / this.dpr,
      height: textSize.height / this.dpr,
    };

    this.ui.begin(this.canvas.width, this.canvas.height);
    this.drawShadowRect(rect, 4, rgb(0, 0, 0, 0.9));
    this.drawRect(rect, PALETTE.tooltipBg);
    this.drawRectStroke(rect, 1, rgb(0, 0, 0, 0.9));
    this.ui.flush();

    this.text.draw(
      rect.x * this.dpr,
      rect.y * this.dpr,
      { width: this.canvas.width, height: this.canvas.height },
      [1, 1, 1, 1]
    );
  }

  private hitTest(x: number, y: number): UIButton | null {
    return (
      this.buttons.find(
        (button) =>
          x >= button.rect.x &&
          x <= button.rect.x + button.rect.width &&
          y >= button.rect.y &&
          y <= button.rect.y + button.rect.height
      ) ?? null
    );
  }

  private drawShadowRect(rect: Rect, offset: number, color: RGBA = PALETTE.shadow): void {
    this.drawRect(
      {
        x: rect.x + offset,
        y: rect.y + offset,
        width: rect.width,
        height: rect.height,
      },
      color
    );
  }

  private drawRect(rect: Rect, color: RGBA): void {
    this.ui.drawRect(
      rect.x * this.dpr,
      rect.y * this.dpr,
      rect.width * this.dpr,
      rect.height * this.dpr,
      color
    );
  }

  private drawRectStroke(rect: Rect, thickness: number, color: RGBA): void {
    this.ui.drawRectStroke(
      rect.x * this.dpr,
      rect.y * this.dpr,
      rect.width * this.dpr,
      rect.height * this.dpr,
      thickness * this.dpr,
      color
    );
  }

  private drawText(text: string, x: number, y: number, size: number, color: RGBA): void {
    this.text.setText(text, {
      fontSize: size * this.dpr,
      paddingX: 2 * this.dpr,
      paddingY: 2 * this.dpr,
      color: "#ffffff",
    });
    this.text.draw(
      x * this.dpr,
      y * this.dpr,
      { width: this.canvas.width, height: this.canvas.height },
      color
    );
  }
}
