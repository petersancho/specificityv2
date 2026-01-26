import { ShaderManager } from "./ShaderManager";
import { BufferManager, GeometryBuffer } from "./BufferManager";
import { geometryVertexShader } from "./shaders/geometry.vert";
import { geometryFragmentShader } from "./shaders/geometry.frag";
import { lineVertexShader } from "./shaders/line.vert";
import { lineFragmentShader } from "./shaders/line.frag";
import { atmosphereVertexShader } from "./shaders/atmosphere.vert";
import { atmosphereFragmentShader } from "./shaders/atmosphere.frag";

export type Camera = {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  fov: number;
  aspect: number;
  near: number;
  far: number;
};

export class WebGLRenderer {
  private gl: WebGLRenderingContext;
  private shaderManager: ShaderManager;
  private bufferManager: BufferManager;
  private geometryBuffers: Map<string, GeometryBuffer> = new Map();
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl");
    if (!gl) {
      throw new Error("WebGL not supported");
    }
    this.gl = gl;
    this.width = canvas.width;
    this.height = canvas.height;

    this.shaderManager = new ShaderManager(gl);
    this.bufferManager = new BufferManager(gl);

    this.initializeShaders();
    this.initializeGL();
  }

  private initializeShaders(): void {
    this.shaderManager.createProgram("geometry", geometryVertexShader, geometryFragmentShader);
    this.shaderManager.createProgram("line", lineVertexShader, lineFragmentShader);
    this.shaderManager.createProgram("atmosphere", atmosphereVertexShader, atmosphereFragmentShader);
  }

  private initializeGL(): void {
    const gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.clearColor(0.039, 0.039, 0.039, 1.0);
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  setBackfaceCulling(enabled: boolean): void {
    if (enabled) {
      this.gl.enable(this.gl.CULL_FACE);
      this.gl.cullFace(this.gl.BACK);
    } else {
      this.gl.disable(this.gl.CULL_FACE);
    }
  }

  clear(): void {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  createGeometryBuffer(id: string): GeometryBuffer {
    const buffer = new GeometryBuffer(this.gl, this.bufferManager, id);
    this.geometryBuffers.set(id, buffer);
    return buffer;
  }

  getGeometryBuffer(id: string): GeometryBuffer | undefined {
    return this.geometryBuffers.get(id);
  }

  deleteGeometryBuffer(id: string): void {
    const buffer = this.geometryBuffers.get(id);
    if (buffer) {
      buffer.dispose();
      this.geometryBuffers.delete(id);
    }
  }

  renderGeometry(
    buffer: GeometryBuffer,
    camera: Camera,
    uniforms: Record<string, any>
  ): void {
    const program = this.shaderManager.getProgram("geometry");
    if (!program) return;

    this.gl.useProgram(program);

    const viewMatrix = this.computeViewMatrix(camera);
    const projectionMatrix = this.computeProjectionMatrix(camera);
    const modelMatrix = uniforms.modelMatrix || this.identityMatrix();
    const normalMatrix = this.computeNormalMatrix(modelMatrix);

    this.shaderManager.setUniforms(program, {
      modelMatrix,
      viewMatrix,
      projectionMatrix,
      normalMatrix,
      lightPosition: uniforms.lightPosition || [10, 10, 10],
      lightColor: uniforms.lightColor || [1, 1, 1],
      ambientColor: uniforms.ambientColor || [0.2, 0.2, 0.2],
      materialColor: uniforms.materialColor || [0.5, 0.5, 0.5],
      selectionHighlight: uniforms.selectionHighlight || [0, 0, 0],
      isSelected: uniforms.isSelected || 0,
      opacity: uniforms.opacity || 1.0,
    });

    buffer.bind(program);
    buffer.draw(this.gl.TRIANGLES);
  }

  renderLine(
    buffer: GeometryBuffer,
    camera: Camera,
    uniforms: Record<string, any>
  ): void {
    const program = this.shaderManager.getProgram("line");
    if (!program) return;

    this.gl.useProgram(program);

    const viewMatrix = this.computeViewMatrix(camera);
    const projectionMatrix = this.computeProjectionMatrix(camera);
    const modelMatrix = uniforms.modelMatrix || this.identityMatrix();

    this.shaderManager.setUniforms(program, {
      modelMatrix,
      viewMatrix,
      projectionMatrix,
      lineWidth: uniforms.lineWidth ?? 2.0,
      resolution: uniforms.resolution ?? [this.width, this.height],
      lineColor: uniforms.lineColor ?? [0.2, 0.2, 0.2],
      selectionHighlight: uniforms.selectionHighlight ?? [0, 0, 0],
      isSelected: uniforms.isSelected ?? 0,
    });

    buffer.bind(program);
    buffer.draw(this.gl.TRIANGLE_STRIP);
  }

  private computeViewMatrix(camera: Camera): Float32Array {
    const [ex, ey, ez] = camera.position;
    const [cx, cy, cz] = camera.target;
    const [ux, uy, uz] = camera.up;

    const zx = ex - cx;
    const zy = ey - cy;
    const zz = ez - cz;
    const zlen = Math.sqrt(zx * zx + zy * zy + zz * zz);
    const znx = zx / zlen;
    const zny = zy / zlen;
    const znz = zz / zlen;

    const xx = uy * znz - uz * zny;
    const xy = uz * znx - ux * znz;
    const xz = ux * zny - uy * znx;
    const xlen = Math.sqrt(xx * xx + xy * xy + xz * xz);
    const xnx = xx / xlen;
    const xny = xy / xlen;
    const xnz = xz / xlen;

    const yx = zny * xnz - znz * xny;
    const yy = znz * xnx - znx * xnz;
    const yz = znx * xny - zny * xnx;

    return new Float32Array([
      xnx, yx, znx, 0,
      xny, yy, zny, 0,
      xnz, yz, znz, 0,
      -(xnx * ex + xny * ey + xnz * ez),
      -(yx * ex + yy * ey + yz * ez),
      -(znx * ex + zny * ey + znz * ez),
      1,
    ]);
  }

  private computeProjectionMatrix(camera: Camera): Float32Array {
    const f = 1.0 / Math.tan(camera.fov / 2);
    const rangeInv = 1.0 / (camera.near - camera.far);

    return new Float32Array([
      f / camera.aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (camera.near + camera.far) * rangeInv, -1,
      0, 0, camera.near * camera.far * rangeInv * 2, 0,
    ]);
  }

  private computeNormalMatrix(modelMatrix: Float32Array): Float32Array {
    const m = modelMatrix;
    const a00 = m[0], a01 = m[1], a02 = m[2];
    const a10 = m[4], a11 = m[5], a12 = m[6];
    const a20 = m[8], a21 = m[9], a22 = m[10];

    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;

    const det = a00 * b01 + a01 * b11 + a02 * b21;
    if (!det) return new Float32Array(9);

    const detInv = 1.0 / det;

    return new Float32Array([
      b01 * detInv,
      (-a22 * a01 + a02 * a21) * detInv,
      (a12 * a01 - a02 * a11) * detInv,
      b11 * detInv,
      (a22 * a00 - a02 * a20) * detInv,
      (-a12 * a00 + a02 * a10) * detInv,
      b21 * detInv,
      (-a21 * a00 + a01 * a20) * detInv,
      (a11 * a00 - a01 * a10) * detInv,
    ]);
  }

  private identityMatrix(): Float32Array {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);
  }

  dispose(): void {
    for (const buffer of this.geometryBuffers.values()) {
      buffer.dispose();
    }
    this.geometryBuffers.clear();
    this.bufferManager.dispose();
    this.shaderManager.dispose();
  }
}
