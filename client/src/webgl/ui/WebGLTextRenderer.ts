export type TextStyle = {
  fontSize: number;
  fontWeight?: number | string;
  fontStyle?: string;
  fontFamily: string;
  color: string;
  paddingX?: number;
  paddingY?: number;
};

type ShaderHandles = {
  program: WebGLProgram;
  positionLoc: number;
  uvLoc: number;
  resolutionLoc: WebGLUniformLocation | null;
  colorLoc: WebGLUniformLocation | null;
  textureLoc: WebGLUniformLocation | null;
};

const DEFAULT_STYLE: TextStyle = {
  fontSize: 13,
  fontWeight: 400,
  fontStyle: "normal",
  fontFamily: "'Space Grotesk', 'SF Pro Text', sans-serif",
  color: "#ffffff",
  paddingX: 8,
  paddingY: 6,
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

export class WebGLTextRenderer {
  private gl: WebGLRenderingContext;
  private handles: ShaderHandles;
  private buffer: WebGLBuffer;
  private texture: WebGLTexture;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 1;
  private height = 1;
  private text = "";

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    const program = createProgram(
      gl,
      `
        attribute vec2 a_position;
        attribute vec2 a_uv;
        uniform vec2 u_resolution;
        varying vec2 v_uv;
        void main() {
          vec2 zeroToOne = a_position / u_resolution;
          vec2 clip = zeroToOne * 2.0 - 1.0;
          gl_Position = vec4(clip * vec2(1.0, -1.0), 0.0, 1.0);
          v_uv = a_uv;
        }
      `,
      `
        precision mediump float;
        uniform sampler2D u_texture;
        uniform vec4 u_color;
        varying vec2 v_uv;
        void main() {
          vec4 tex = texture2D(u_texture, v_uv);
          gl_FragColor = vec4(u_color.rgb, u_color.a * tex.a);
        }
      `
    );

    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error("Unable to create text buffer");
    }

    const texture = gl.createTexture();
    if (!texture) {
      throw new Error("Unable to create text texture");
    }

    this.buffer = buffer;
    this.texture = texture;
    this.handles = {
      program,
      positionLoc: gl.getAttribLocation(program, "a_position"),
      uvLoc: gl.getAttribLocation(program, "a_uv"),
      resolutionLoc: gl.getUniformLocation(program, "u_resolution"),
      colorLoc: gl.getUniformLocation(program, "u_color"),
      textureLoc: gl.getUniformLocation(program, "u_texture"),
    };

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to create 2D context for text");
    }
    this.canvas = canvas;
    this.ctx = ctx;

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  setText(text: string, style: Partial<TextStyle> = {}): void {
    if (text === this.text && Object.keys(style).length === 0) return;
    this.text = text;

    const resolved: TextStyle = { ...DEFAULT_STYLE, ...style };
    const paddingX = resolved.paddingX ?? 0;
    const paddingY = resolved.paddingY ?? 0;
    const fontWeight = resolved.fontWeight ?? 400;
    const fontStyle = resolved.fontStyle ?? "normal";
    const fontSpec = `${fontStyle} ${fontWeight} ${resolved.fontSize}px ${resolved.fontFamily}`;

    this.ctx.font = fontSpec;
    const metrics = this.ctx.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    const textHeight = Math.ceil(resolved.fontSize * 1.3);

    this.width = textWidth + paddingX * 2;
    this.height = textHeight + paddingY * 2;

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.font = fontSpec;
    this.ctx.fillStyle = resolved.color;
    this.ctx.textBaseline = "top";
    this.ctx.fillText(text, paddingX, paddingY);

    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.canvas
    );
  }

  draw(
    x: number,
    y: number,
    resolution: { width: number; height: number },
    color: [number, number, number, number] = [1, 1, 1, 1]
  ): void {
    if (!this.text) return;
    const gl = this.gl;

    const x2 = x + this.width;
    const y2 = y + this.height;

    const data = new Float32Array([
      x, y, 0, 0,
      x, y2, 0, 1,
      x2, y2, 1, 1,
      x, y, 0, 0,
      x2, y2, 1, 1,
      x2, y, 1, 0,
    ]);

    gl.useProgram(this.handles.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

    if (this.handles.resolutionLoc) {
      gl.uniform2f(this.handles.resolutionLoc, resolution.width, resolution.height);
    }
    if (this.handles.colorLoc) {
      gl.uniform4f(this.handles.colorLoc, color[0], color[1], color[2], color[3]);
    }
    if (this.handles.textureLoc) {
      gl.uniform1i(this.handles.textureLoc, 0);
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
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

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}
