import { ShaderManager } from "./ShaderManager";
import { BufferManager, GeometryBuffer } from "./BufferManager";
import { geometryVertexShader } from "./shaders/geometry.vert";
import { geometryFragmentShader } from "./shaders/geometry.frag";
import { lineVertexShader } from "./shaders/line.vert";
import { lineFragmentShader } from "./shaders/line.frag";
import { atmosphereVertexShader } from "./shaders/atmosphere.vert";
import { atmosphereFragmentShader } from "./shaders/atmosphere.frag";
import { edgeVertexShader } from "./shaders/edge.vert";
import { edgeFragmentShader } from "./shaders/edge.frag";
import { edgeLineVertexShader } from "./shaders/edgeLine.vert";
import { edgeLineFragmentShader } from "./shaders/edgeLine.frag";
import { edgeJoinVertexShader } from "./shaders/edgeJoin.vert";
import { edgeJoinFragmentShader } from "./shaders/edgeJoin.frag";
import { pointVertexShader } from "./shaders/point.vert";
import { pointFragmentShader } from "./shaders/point.frag";

export type Camera = {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  fov: number;
  aspect: number;
  near: number;
  far: number;
};

type DepthFuncMode = "lequal" | "greater" | "always";

export class WebGLRenderer {
  private gl: WebGLRenderingContext;
  private shaderManager: ShaderManager;
  private bufferManager: BufferManager;
  private geometryBuffers: Map<string, GeometryBuffer> = new Map();
  private width: number;
  private height: number;
  private blendingEnabled = false;
  private depthMaskEnabled = true;
  private cullingEnabled = true;
  private colorMask: [boolean, boolean, boolean, boolean] = [true, true, true, true];
  private depthFunc: GLenum;
  private clearColor: [number, number, number, number];

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", { antialias: true, alpha: true });
    if (!gl) {
      throw new Error("WebGL not supported");
    }
    this.gl = gl;
    this.width = canvas.width;
    this.height = canvas.height;
    this.depthFunc = gl.LEQUAL;
    this.clearColor = [0.96, 0.97, 0.96, 1];

    this.shaderManager = new ShaderManager(gl);
    this.bufferManager = new BufferManager(gl);

    this.initializeShaders();
    this.initializeGL();
  }

  private initializeShaders(): void {
    this.shaderManager.createProgram("geometry", geometryVertexShader, geometryFragmentShader);
    this.shaderManager.createProgram("line", lineVertexShader, lineFragmentShader);
    this.shaderManager.createProgram("atmosphere", atmosphereVertexShader, atmosphereFragmentShader);
    this.shaderManager.createProgram("edge", edgeVertexShader, edgeFragmentShader);
    this.shaderManager.createProgram("edgeLine", edgeLineVertexShader, edgeLineFragmentShader);
    this.shaderManager.createProgram("edgeJoin", edgeJoinVertexShader, edgeJoinFragmentShader);
    this.shaderManager.createProgram("point", pointVertexShader, pointFragmentShader);
  }

  private initializeGL(): void {
    const gl = this.gl;
    gl.getExtension("OES_standard_derivatives");
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(this.depthFunc);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    this.cullingEnabled = true;
    gl.disable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.colorMask(true, true, true, true);
    gl.clearColor(
      this.clearColor[0],
      this.clearColor[1],
      this.clearColor[2],
      this.clearColor[3]
    );
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  setBackfaceCulling(enabled: boolean): void {
    if (this.cullingEnabled === enabled) return;
    this.cullingEnabled = enabled;
    if (enabled) {
      this.gl.enable(this.gl.CULL_FACE);
      this.gl.cullFace(this.gl.BACK);
    } else {
      this.gl.disable(this.gl.CULL_FACE);
    }
  }

  setClearColor(color: [number, number, number, number]): void {
    const [r, g, b, a] = color;
    if (
      this.clearColor[0] === r &&
      this.clearColor[1] === g &&
      this.clearColor[2] === b &&
      this.clearColor[3] === a
    ) {
      return;
    }
    this.clearColor = color;
    this.gl.clearColor(r, g, b, a);
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

    const opacity = uniforms.opacity ?? 1.0;
    const isTransparent = opacity < 0.999;
    this.setBlending(isTransparent);
    this.setDepthMask(!isTransparent);
    this.setColorMask(true, true, true, true);

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
      cameraPosition: uniforms.cameraPosition || camera.position,
      selectionHighlight: uniforms.selectionHighlight || [0, 0, 0],
      isSelected: uniforms.isSelected || 0,
      sheenIntensity: uniforms.sheenIntensity ?? 0.08,
      ambientStrength: uniforms.ambientStrength ?? 0.68,
      useVertexColor: buffer.colorBuffer ? 1 : 0,
      opacity,
    });

    buffer.bind(program);
    buffer.draw(this.gl.TRIANGLES);
  }

  renderGeometryDepth(
    buffer: GeometryBuffer,
    camera: Camera,
    uniforms: Record<string, any>
  ): void {
    const program = this.shaderManager.getProgram("geometry");
    if (!program) return;

    const previousBlending = this.blendingEnabled;
    const previousDepthMask = this.depthMaskEnabled;
    const previousDepthFunc = this.depthFunc;
    const [prevR, prevG, prevB, prevA] = this.colorMask;

    this.setDepthFunc(this.gl.LEQUAL);
    this.setBlending(false);
    this.setDepthMask(true);
    this.setColorMask(false, false, false, false);

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
      cameraPosition: uniforms.cameraPosition || camera.position,
      selectionHighlight: uniforms.selectionHighlight || [0, 0, 0],
      isSelected: uniforms.isSelected || 0,
      sheenIntensity: uniforms.sheenIntensity ?? 0.08,
      ambientStrength: uniforms.ambientStrength ?? 0.68,
      useVertexColor: buffer.colorBuffer ? 1 : 0,
      opacity: uniforms.opacity ?? 1.0,
    });

    buffer.bind(program);
    buffer.draw(this.gl.TRIANGLES);

    this.setColorMask(prevR, prevG, prevB, prevA);
    this.setDepthFunc(previousDepthFunc);
    this.setDepthMask(previousDepthMask);
    this.setBlending(previousBlending);
  }

  renderLine(
    buffer: GeometryBuffer,
    camera: Camera,
    uniforms: Record<string, any>,
    options?: {
      drawMode?: "strip" | "triangles";
      depthFunc?: DepthFuncMode;
      depthMask?: boolean;
      blend?: boolean;
    }
  ): void {
    const program = this.shaderManager.getProgram("line");
    if (!program) return;

    const previousBlending = this.blendingEnabled;
    const previousDepthMask = this.depthMaskEnabled;
    const previousDepthFunc = this.depthFunc;

    const nextDepthFunc = this.mapDepthFunc(options?.depthFunc);
    const nextBlend = options?.blend ?? true;
    const nextDepthMask = options?.depthMask ?? true;

    this.setDepthFunc(nextDepthFunc);
    this.setBlending(nextBlend);
    this.setDepthMask(nextDepthMask);

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
      lineOpacity: uniforms.lineOpacity ?? 1.0,
      depthBias: uniforms.depthBias ?? 0,
      selectionHighlight: uniforms.selectionHighlight ?? [0, 0, 0],
      isSelected: uniforms.isSelected ?? 0,
      linePixelSnap: uniforms.linePixelSnap ?? 0,
    });

    buffer.bind(program);
    const mode =
      options?.drawMode === "triangles"
        ? this.gl.TRIANGLES
        : this.gl.TRIANGLE_STRIP;
    buffer.draw(mode);

    this.setDepthFunc(previousDepthFunc);
    this.setDepthMask(previousDepthMask);
    this.setBlending(previousBlending);
  }

  renderPoints(
    buffer: GeometryBuffer,
    camera: Camera,
    uniforms: Record<string, any>,
    options?: { depthFunc?: DepthFuncMode; depthMask?: boolean; blend?: boolean }
  ): void {
    const program = this.shaderManager.getProgram("point");
    if (!program) return;

    const previousBlending = this.blendingEnabled;
    const previousDepthMask = this.depthMaskEnabled;
    const previousDepthFunc = this.depthFunc;

    const nextDepthFunc = this.mapDepthFunc(options?.depthFunc);
    const nextBlend = options?.blend ?? true;
    const nextDepthMask = options?.depthMask ?? false;

    this.setDepthFunc(nextDepthFunc);
    this.setBlending(nextBlend);
    this.setDepthMask(nextDepthMask);

    this.gl.useProgram(program);

    const viewMatrix = this.computeViewMatrix(camera);
    const projectionMatrix = this.computeProjectionMatrix(camera);
    const modelMatrix = uniforms.modelMatrix || this.identityMatrix();

    this.shaderManager.setUniforms(program, {
      modelMatrix,
      viewMatrix,
      projectionMatrix,
      pointRadius: uniforms.pointRadius ?? 6.0,
      outlineWidth: uniforms.outlineWidth ?? 1.0,
      fillColor: uniforms.fillColor ?? [1, 1, 0],
      outlineColor: uniforms.outlineColor ?? [0, 0, 0],
      depthBias: uniforms.depthBias ?? 0,
      opacity: uniforms.opacity ?? 1.0,
    });

    buffer.bind(program);
    buffer.draw(this.gl.POINTS);

    this.setDepthFunc(previousDepthFunc);
    this.setDepthMask(previousDepthMask);
    this.setBlending(previousBlending);
  }

  renderEdgeLines(
    buffer: GeometryBuffer,
    camera: Camera,
    uniforms: Record<string, any>,
    options?: {
      depthFunc?: DepthFuncMode;
      depthMask?: boolean;
      blend?: boolean;
    }
  ): void {
    const program = this.shaderManager.getProgram("edgeLine");
    if (!program) return;

    const previousBlending = this.blendingEnabled;
    const previousDepthMask = this.depthMaskEnabled;
    const previousDepthFunc = this.depthFunc;

    const nextDepthFunc = this.mapDepthFunc(options?.depthFunc);
    const nextBlend = options?.blend ?? true;
    const nextDepthMask = options?.depthMask ?? false;

    this.setDepthFunc(nextDepthFunc);
    this.setBlending(nextBlend);
    this.setDepthMask(nextDepthMask);

    this.gl.useProgram(program);

    const viewMatrix = this.computeViewMatrix(camera);
    const projectionMatrix = this.computeProjectionMatrix(camera);
    const modelMatrix = uniforms.modelMatrix || this.identityMatrix();

    this.shaderManager.setUniforms(program, {
      modelMatrix,
      viewMatrix,
      projectionMatrix,
      resolution: uniforms.resolution ?? [this.width, this.height],
      depthBias: uniforms.depthBias ?? 0,
      edgeWidths: uniforms.edgeWidths ?? [1.25, 1.75, 2.25],
      edgeOpacities: uniforms.edgeOpacities ?? [0.4, 0.65, 0.85],
      edgeColorInternal: uniforms.edgeColorInternal ?? [0.25, 0.25, 0.25],
      edgeColorCrease: uniforms.edgeColorCrease ?? [0.18, 0.18, 0.18],
      edgeColorSilhouette: uniforms.edgeColorSilhouette ?? [0.1, 0.1, 0.1],
      edgeAAStrength: uniforms.edgeAAStrength ?? 1.0,
      edgePixelSnap: uniforms.edgePixelSnap ?? 0.0,
    });

    buffer.bind(program);
    buffer.draw(this.gl.TRIANGLES);

    this.setDepthFunc(previousDepthFunc);
    this.setDepthMask(previousDepthMask);
    this.setBlending(previousBlending);
  }

  renderEdgeJoins(
    buffer: GeometryBuffer,
    camera: Camera,
    uniforms: Record<string, any>,
    options?: { depthFunc?: DepthFuncMode; depthMask?: boolean; blend?: boolean }
  ): void {
    const program = this.shaderManager.getProgram("edgeJoin");
    if (!program) return;

    const previousBlending = this.blendingEnabled;
    const previousDepthMask = this.depthMaskEnabled;
    const previousDepthFunc = this.depthFunc;

    const nextDepthFunc = this.mapDepthFunc(options?.depthFunc);
    const nextBlend = options?.blend ?? true;
    const nextDepthMask = options?.depthMask ?? false;

    this.setDepthFunc(nextDepthFunc);
    this.setBlending(nextBlend);
    this.setDepthMask(nextDepthMask);

    this.gl.useProgram(program);

    const viewMatrix = this.computeViewMatrix(camera);
    const projectionMatrix = this.computeProjectionMatrix(camera);
    const modelMatrix = uniforms.modelMatrix || this.identityMatrix();

    this.shaderManager.setUniforms(program, {
      modelMatrix,
      viewMatrix,
      projectionMatrix,
      resolution: uniforms.resolution ?? [this.width, this.height],
      edgeWidths: uniforms.edgeWidths ?? [1.25, 1.75, 2.25],
      edgeOpacities: uniforms.edgeOpacities ?? [0.4, 0.65, 0.85],
      edgeColorInternal: uniforms.edgeColorInternal ?? [0.25, 0.25, 0.25],
      edgeColorCrease: uniforms.edgeColorCrease ?? [0.18, 0.18, 0.18],
      edgeColorSilhouette: uniforms.edgeColorSilhouette ?? [0.1, 0.1, 0.1],
      edgeAAStrength: uniforms.edgeAAStrength ?? 1.0,
      depthBias: uniforms.depthBias ?? 0,
      edgePixelSnap: uniforms.edgePixelSnap ?? 0,
    });

    buffer.bind(program);
    buffer.draw(this.gl.TRIANGLES);

    this.setDepthFunc(previousDepthFunc);
    this.setDepthMask(previousDepthMask);
    this.setBlending(previousBlending);
  }

  renderEdges(
    buffer: GeometryBuffer,
    camera: Camera,
    uniforms: Record<string, any>,
    options?: { depthFunc?: DepthFuncMode }
  ): void {
    const program = this.shaderManager.getProgram("edge");
    if (!program) return;

    const previousBlending = this.blendingEnabled;
    const previousDepthMask = this.depthMaskEnabled;
    const previousDepthFunc = this.depthFunc;

    const nextDepthFunc = this.mapDepthFunc(options?.depthFunc);
    this.setDepthFunc(nextDepthFunc);
    this.setBlending(true);
    this.setDepthMask(false);

    this.gl.useProgram(program);

    const viewMatrix = this.computeViewMatrix(camera);
    const projectionMatrix = this.computeProjectionMatrix(camera);
    const modelMatrix = uniforms.modelMatrix || this.identityMatrix();

    const lineWidth = uniforms.lineWidth ?? 1;
    if (typeof lineWidth === "number" && Number.isFinite(lineWidth)) {
      this.gl.lineWidth(lineWidth);
    }

    this.shaderManager.setUniforms(program, {
      modelMatrix,
      viewMatrix,
      projectionMatrix,
      edgeColor: uniforms.edgeColor ?? [0.05, 0.05, 0.05],
      opacity: uniforms.opacity ?? 1.0,
      depthBias: uniforms.depthBias ?? 0,
      dashEnabled: uniforms.dashEnabled ?? 0,
      dashScale: uniforms.dashScale ?? 0.04,
    });

    buffer.bind(program);
    buffer.draw(this.gl.LINES);

    this.setDepthFunc(previousDepthFunc);
    this.setDepthMask(previousDepthMask);
    this.setBlending(previousBlending);
  }

  renderAtmosphere(
    buffer: GeometryBuffer,
    camera: Camera,
    uniforms: Record<string, any>
  ): void {
    const program = this.shaderManager.getProgram("atmosphere");
    if (!program) return;

    const previousBlending = this.blendingEnabled;
    const previousDepthMask = this.depthMaskEnabled;
    const previousCulling = this.cullingEnabled;

    this.setBlending(false);
    this.setDepthMask(false);
    this.setBackfaceCulling(false);

    this.gl.useProgram(program);

    const viewMatrix = this.computeViewMatrix(camera);
    const projectionMatrix = this.computeProjectionMatrix(camera);
    const modelMatrix = uniforms.modelMatrix || this.identityMatrix();

    this.shaderManager.setUniforms(program, {
      modelMatrix,
      viewMatrix,
      projectionMatrix,
      topColor: uniforms.topColor ?? [0.07, 0.07, 0.07],
      bottomColor: uniforms.bottomColor ?? [0.02, 0.02, 0.02],
      offset: uniforms.offset ?? 600,
      exponent: uniforms.exponent ?? 0.9,
    });

    buffer.bind(program);
    buffer.draw(this.gl.TRIANGLES);

    this.setBackfaceCulling(previousCulling);
    this.setDepthMask(previousDepthMask);
    this.setBlending(previousBlending);
  }

  private setBlending(enabled: boolean): void {
    if (this.blendingEnabled === enabled) return;
    this.blendingEnabled = enabled;
    if (enabled) {
      this.gl.enable(this.gl.BLEND);
    } else {
      this.gl.disable(this.gl.BLEND);
    }
  }

  private setDepthMask(enabled: boolean): void {
    if (this.depthMaskEnabled === enabled) return;
    this.depthMaskEnabled = enabled;
    this.gl.depthMask(enabled);
  }

  private setColorMask(r: boolean, g: boolean, b: boolean, a: boolean): void {
    if (
      this.colorMask[0] === r &&
      this.colorMask[1] === g &&
      this.colorMask[2] === b &&
      this.colorMask[3] === a
    ) {
      return;
    }
    this.colorMask = [r, g, b, a];
    this.gl.colorMask(r, g, b, a);
  }

  private setDepthFunc(depthFunc: GLenum): void {
    if (this.depthFunc === depthFunc) return;
    this.depthFunc = depthFunc;
    this.gl.depthFunc(depthFunc);
  }

  private mapDepthFunc(mode?: DepthFuncMode): GLenum {
    const gl = this.gl;
    if (mode === "greater") return gl.GREATER;
    if (mode === "always") return gl.ALWAYS;
    return gl.LEQUAL;
  }

  private computeViewMatrix(camera: Camera): Float32Array {
    const EPS = 1e-6;
    const [ex, ey, ez] = camera.position;
    const [cx, cy, cz] = camera.target;
    const [ux, uy, uz] = camera.up;

    // View direction (camera backward / +Z in view space).
    let zx = ex - cx;
    let zy = ey - cy;
    let zz = ez - cz;
    let zlen = Math.sqrt(zx * zx + zy * zy + zz * zz);
    if (zlen < EPS) {
      zx = 0;
      zy = 0;
      zz = 1;
      zlen = 1;
    }
    const znx = zx / zlen;
    const zny = zy / zlen;
    const znz = zz / zlen;

    // Right vector from up x forward; fall back if up is parallel to view.
    let xx = uy * znz - uz * zny;
    let xy = uz * znx - ux * znz;
    let xz = ux * zny - uy * znx;
    let xlen = Math.sqrt(xx * xx + xy * xy + xz * xz);
    if (xlen < EPS) {
      const fallbackUp =
        Math.abs(zny) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const [fux, fuy, fuz] = fallbackUp;
      xx = fuy * znz - fuz * zny;
      xy = fuz * znx - fux * znz;
      xz = fux * zny - fuy * znx;
      xlen = Math.sqrt(xx * xx + xy * xy + xz * xz) || 1;
    }
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
    const EPS = 1e-6;
    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, value));
    const safeAspect = camera.aspect > EPS ? camera.aspect : 1;
    const safeNear = Math.max(camera.near, EPS);
    const safeFar = Math.max(camera.far, safeNear + 1);
    const safeFov = clamp(camera.fov, 0.05, Math.PI - 0.05);

    const f = 1.0 / Math.tan(safeFov / 2);
    const rangeInv = 1.0 / (safeNear - safeFar);

    return new Float32Array([
      f / safeAspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (safeNear + safeFar) * rangeInv, -1,
      0, 0, safeNear * safeFar * rangeInv * 2, 0,
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
