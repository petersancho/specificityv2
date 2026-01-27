export class ShaderManager {
  private gl: WebGLRenderingContext;
  private programs: Map<string, WebGLProgram> = new Map();
  private shaders: Map<string, WebGLShader> = new Map();

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
  }

  compileShader(source: string, type: GLenum): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error(`Failed to create shader of type ${type}`);
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${info}`);
    }

    return shader;
  }

  linkProgram(
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader,
    name: string
  ): WebGLProgram {
    const gl = this.gl;
    const program = gl.createProgram();
    if (!program) {
      throw new Error("Failed to create shader program");
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program linking failed: ${info}`);
    }

    this.programs.set(name, program);
    return program;
  }

  createProgram(
    name: string,
    vertexSource: string,
    fragmentSource: string
  ): WebGLProgram {
    const vertexShader = this.compileShader(vertexSource, this.gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fragmentSource, this.gl.FRAGMENT_SHADER);

    this.shaders.set(`${name}_vertex`, vertexShader);
    this.shaders.set(`${name}_fragment`, fragmentShader);

    return this.linkProgram(vertexShader, fragmentShader, name);
  }

  getProgram(name: string): WebGLProgram | undefined {
    return this.programs.get(name);
  }

  useProgram(name: string): void {
    const program = this.programs.get(name);
    if (!program) {
      throw new Error(`Program ${name} not found`);
    }
    this.gl.useProgram(program);
  }

  setUniform(program: WebGLProgram, name: string, value: any): void {
    const gl = this.gl;
    if (value === undefined || value === null) return;
    const location = gl.getUniformLocation(program, name);
    if (!location) return;

    if (typeof value === "number") {
      gl.uniform1f(location, value);
      return;
    }
    if (typeof value === "boolean") {
      gl.uniform1i(location, value ? 1 : 0);
      return;
    }

    const isArray = Array.isArray(value);
    const isTypedArray = ArrayBuffer.isView(value) && !(value instanceof DataView);
    if (!isArray && !isTypedArray) return;

    const data = value as number[] | Float32Array;
    if (data.length === 2) {
      gl.uniform2fv(location, data);
    } else if (data.length === 3) {
      gl.uniform3fv(location, data);
    } else if (data.length === 4) {
      gl.uniform4fv(location, data);
    } else if (data.length === 9) {
      gl.uniformMatrix3fv(location, false, data);
    } else if (data.length === 16) {
      gl.uniformMatrix4fv(location, false, data);
    }
  }

  setUniforms(program: WebGLProgram, uniforms: Record<string, any>): void {
    for (const [name, value] of Object.entries(uniforms)) {
      this.setUniform(program, name, value);
    }
  }

  dispose(): void {
    const gl = this.gl;
    
    for (const program of this.programs.values()) {
      gl.deleteProgram(program);
    }
    this.programs.clear();

    for (const shader of this.shaders.values()) {
      gl.deleteShader(shader);
    }
    this.shaders.clear();
  }
}
