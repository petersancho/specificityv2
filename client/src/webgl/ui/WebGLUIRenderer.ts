export type RGBA = [number, number, number, number];

type Resolution = { width: number; height: number };

type Vec2 = { x: number; y: number };

type ShaderHandles = {
  program: WebGLProgram;
  positionLoc: number;
  colorLoc: number;
  resolutionLoc: WebGLUniformLocation | null;
};

const VERTEX_STRIDE = 6;

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

export class WebGLUIRenderer {
  private gl: WebGLRenderingContext;
  private buffer: WebGLBuffer;
  private handles: ShaderHandles;
  private data: number[] = [];
  private resolution: Resolution = { width: 1, height: 1 };

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    const program = createProgram(
      gl,
      `
        attribute vec2 a_position;
        attribute vec4 a_color;
        uniform vec2 u_resolution;
        varying vec4 v_color;
        void main() {
          vec2 zeroToOne = a_position / u_resolution;
          vec2 clip = zeroToOne * 2.0 - 1.0;
          gl_Position = vec4(clip * vec2(1.0, -1.0), 0.0, 1.0);
          v_color = a_color;
        }
      `,
      `
        precision mediump float;
        varying vec4 v_color;
        void main() {
          gl_FragColor = v_color;
        }
      `
    );

    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error("Unable to create UI buffer");
    }

    this.buffer = buffer;
    this.handles = {
      program,
      positionLoc: gl.getAttribLocation(program, "a_position"),
      colorLoc: gl.getAttribLocation(program, "a_color"),
      resolutionLoc: gl.getUniformLocation(program, "u_resolution"),
    };
  }

  begin(width: number, height: number): void {
    this.resolution = { width, height };
    this.data.length = 0;
  }

  drawRect(x: number, y: number, width: number, height: number, color: RGBA): void {
    const x2 = x + width;
    const y2 = y + height;
    this.pushRect({ x, y }, { x: x2, y: y2 }, color);
  }

  drawRectStroke(
    x: number,
    y: number,
    width: number,
    height: number,
    thickness: number,
    color: RGBA
  ): void {
    this.drawRect(x, y, width, thickness, color);
    this.drawRect(x, y + height - thickness, width, thickness, color);
    this.drawRect(x, y, thickness, height, color);
    this.drawRect(x + width - thickness, y, thickness, height, color);
  }

  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    color: RGBA
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * (thickness / 2);
    const ny = (dx / len) * (thickness / 2);

    const p1 = { x: x1 + nx, y: y1 + ny };
    const p2 = { x: x1 - nx, y: y1 - ny };
    const p3 = { x: x2 - nx, y: y2 - ny };
    const p4 = { x: x2 + nx, y: y2 + ny };

    this.pushQuad(p1, p2, p3, p4, color);
  }

  drawCircle(
    cx: number,
    cy: number,
    radius: number,
    thickness: number,
    color: RGBA,
    segments = 24
  ): void {
    let prevX = cx + radius;
    let prevY = cy;
    for (let i = 1; i <= segments; i += 1) {
      const theta = (i / segments) * Math.PI * 2;
      const nextX = cx + Math.cos(theta) * radius;
      const nextY = cy + Math.sin(theta) * radius;
      this.drawLine(prevX, prevY, nextX, nextY, thickness, color);
      prevX = nextX;
      prevY = nextY;
    }
  }

  drawFilledCircle(
    cx: number,
    cy: number,
    radius: number,
    color: RGBA,
    segments = 28
  ): void {
    const step = (Math.PI * 2) / segments;
    for (let i = 0; i < segments; i += 1) {
      const theta1 = i * step;
      const theta2 = (i + 1) * step;
      const x1 = cx + Math.cos(theta1) * radius;
      const y1 = cy + Math.sin(theta1) * radius;
      const x2 = cx + Math.cos(theta2) * radius;
      const y2 = cy + Math.sin(theta2) * radius;
      this.pushTriangle(
        { x: cx, y: cy },
        { x: x1, y: y1 },
        { x: x2, y: y2 },
        color
      );
    }
  }

  drawRoundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    color: RGBA
  ): void {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    if (r === 0) {
      this.drawRect(x, y, width, height, color);
      return;
    }

    // Center band.
    this.drawRect(x + r, y, width - r * 2, height, color);
    // Side bands.
    this.drawRect(x, y + r, r, height - r * 2, color);
    this.drawRect(x + width - r, y + r, r, height - r * 2, color);
    // Corners.
    this.drawFilledCircle(x + r, y + r, r, color);
    this.drawFilledCircle(x + width - r, y + r, r, color);
    this.drawFilledCircle(x + r, y + height - r, r, color);
    this.drawFilledCircle(x + width - r, y + height - r, r, color);
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

    const stride = VERTEX_STRIDE * Float32Array.BYTES_PER_ELEMENT;
    gl.enableVertexAttribArray(this.handles.positionLoc);
    gl.vertexAttribPointer(this.handles.positionLoc, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(this.handles.colorLoc);
    gl.vertexAttribPointer(
      this.handles.colorLoc,
      4,
      gl.FLOAT,
      false,
      stride,
      2 * Float32Array.BYTES_PER_ELEMENT
    );

    gl.drawArrays(gl.TRIANGLES, 0, this.data.length / VERTEX_STRIDE);
  }

  private pushRect(p1: Vec2, p2: Vec2, color: RGBA): void {
    const p3 = { x: p1.x, y: p2.y };
    const p4 = { x: p2.x, y: p1.y };
    this.pushQuad(p1, p3, p2, p4, color);
  }

  private pushQuad(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2, color: RGBA): void {
    this.pushVertex(p1.x, p1.y, color);
    this.pushVertex(p2.x, p2.y, color);
    this.pushVertex(p3.x, p3.y, color);
    this.pushVertex(p1.x, p1.y, color);
    this.pushVertex(p3.x, p3.y, color);
    this.pushVertex(p4.x, p4.y, color);
  }

  private pushTriangle(p1: Vec2, p2: Vec2, p3: Vec2, color: RGBA): void {
    this.pushVertex(p1.x, p1.y, color);
    this.pushVertex(p2.x, p2.y, color);
    this.pushVertex(p3.x, p3.y, color);
  }

  private pushVertex(x: number, y: number, color: RGBA): void {
    this.data.push(x, y, color[0], color[1], color[2], color[3]);
  }
}
