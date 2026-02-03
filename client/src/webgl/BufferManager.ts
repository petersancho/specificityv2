export type BufferData = {
  positions?: Float32Array;
  prevPositions?: Float32Array;
  normals?: Float32Array;
  uvs?: Float32Array;
  indices?: Uint16Array;
  colors?: Float32Array;
  nextPositions?: Float32Array;
  sides?: Float32Array;
  edgeKinds?: Float32Array;
  edgeWeights?: Float32Array;
  corners?: Float32Array;
  faceNormal1?: Float32Array;
  faceNormal2?: Float32Array;
  hasFace2?: Float32Array;
};

export class BufferManager {
  private gl: WebGLRenderingContext;
  private buffers: Map<string, WebGLBuffer> = new Map();

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
  }

  createBuffer(name: string, target: GLenum, data: ArrayBufferView | ArrayBuffer): WebGLBuffer {
    const gl = this.gl;
    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error(`Failed to create buffer: ${name}`);
    }

    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    gl.bindBuffer(target, null);

    this.buffers.set(name, buffer);
    return buffer;
  }

  updateBuffer(name: string, target: GLenum, data: ArrayBufferView | ArrayBuffer): void {
    const buffer = this.buffers.get(name);
    if (!buffer) {
      this.createBuffer(name, target, data);
      return;
    }

    const gl = this.gl;
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    gl.bindBuffer(target, null);
  }

  getBuffer(name: string): WebGLBuffer | undefined {
    return this.buffers.get(name);
  }

  deleteBuffer(name: string): void {
    const buffer = this.buffers.get(name);
    if (buffer) {
      this.gl.deleteBuffer(buffer);
      this.buffers.delete(name);
    }
  }

  dispose(): void {
    for (const buffer of this.buffers.values()) {
      this.gl.deleteBuffer(buffer);
    }
    this.buffers.clear();
  }
}

function sanitizeTriangleIndices(
  indices: ArrayLike<number>,
  vertexCount: number
): { sanitized: Uint16Array; droppedTriangles: number; maxIndex: number } {
  let maxIndex = -1;
  for (let i = 0; i < indices.length; i += 1) {
    const v = indices[i] as number;
    if (v > maxIndex) maxIndex = v;
  }

  if (maxIndex >= 0 && maxIndex < vertexCount && indices.length % 3 === 0) {
    return {
      sanitized: indices instanceof Uint16Array ? indices : new Uint16Array(indices as any),
      droppedTriangles: 0,
      maxIndex,
    };
  }

  const out: number[] = [];
  let dropped = 0;
  const triCount = Math.floor(indices.length / 3);
  for (let t = 0; t < triCount; t += 1) {
    const base = t * 3;
    const a = indices[base] as number;
    const b = indices[base + 1] as number;
    const c = indices[base + 2] as number;

    if (a < vertexCount && b < vertexCount && c < vertexCount) {
      out.push(a, b, c);
    } else {
      dropped += 1;
    }
  }

  const sanitized = new Uint16Array(out);
  let sanitizedMax = -1;
  for (let i = 0; i < sanitized.length; i += 1) {
    const v = sanitized[i];
    if (v > sanitizedMax) sanitizedMax = v;
  }

  return {
    sanitized,
    droppedTriangles: dropped,
    maxIndex: sanitizedMax,
  };
}

export class GeometryBuffer {
  public positionBuffer?: WebGLBuffer;
  public prevPositionBuffer?: WebGLBuffer;
  public normalBuffer?: WebGLBuffer;
  public indexBuffer?: WebGLBuffer;
  public colorBuffer?: WebGLBuffer;
  public nextPositionBuffer?: WebGLBuffer;
  public sideBuffer?: WebGLBuffer;
  public edgeKindBuffer?: WebGLBuffer;
  public edgeWeightBuffer?: WebGLBuffer;
  public cornerBuffer?: WebGLBuffer;
  public faceNormal1Buffer?: WebGLBuffer;
  public faceNormal2Buffer?: WebGLBuffer;
  public hasFace2Buffer?: WebGLBuffer;
  public vertexCount: number = 0;
  public indexCount: number = 0;
  private prevPositionCount: number = 0;
  private normalCount: number = 0;
  private colorCount: number = 0;
  private nextPositionCount: number = 0;
  private sideCount: number = 0;
  private edgeKindCount: number = 0;
  private edgeWeightCount: number = 0;
  private cornerCount: number = 0;
  private faceNormal1Count: number = 0;
  private faceNormal2Count: number = 0;
  private hasFace2Count: number = 0;
  private indexMax: number = -1;
  private warnedInvalidIndex: boolean = false;
  private warnedIndexOverflow: boolean = false;

  constructor(
    private gl: WebGLRenderingContext,
    private bufferManager: BufferManager,
    public id: string
  ) {}

  setData(data: BufferData): void {
    const gl = this.gl;

    if (data.positions) {
      if (this.positionBuffer) {
        this.bufferManager.updateBuffer(`${this.id}_position`, gl.ARRAY_BUFFER, data.positions);
      } else {
        this.positionBuffer = this.bufferManager.createBuffer(
          `${this.id}_position`,
          gl.ARRAY_BUFFER,
          data.positions
        );
      }
      this.vertexCount = Math.floor(data.positions.length / 3);
      if (this.indexBuffer && this.indexMax >= this.vertexCount && !this.warnedIndexOverflow) {
        console.warn(
          `[${this.id}] Index buffer exceeds vertex count (maxIndex=${this.indexMax}, vertexCount=${this.vertexCount}). Skipping indexed draws until geometry is updated.`
        );
        this.warnedIndexOverflow = true;
      }
    }

    if (data.prevPositions) {
      this.prevPositionCount = Math.floor(data.prevPositions.length / 3);
      if (this.prevPositionBuffer) {
        this.bufferManager.updateBuffer(
          `${this.id}_prev_position`,
          gl.ARRAY_BUFFER,
          data.prevPositions
        );
      } else {
        this.prevPositionBuffer = this.bufferManager.createBuffer(
          `${this.id}_prev_position`,
          gl.ARRAY_BUFFER,
          data.prevPositions
        );
      }
    }

    if (data.normals) {
      this.normalCount = Math.floor(data.normals.length / 3);
      if (this.normalBuffer) {
        this.bufferManager.updateBuffer(`${this.id}_normal`, gl.ARRAY_BUFFER, data.normals);
      } else {
        this.normalBuffer = this.bufferManager.createBuffer(
          `${this.id}_normal`,
          gl.ARRAY_BUFFER,
          data.normals
        );
      }
    }

    if (data.indices) {
      if (this.vertexCount <= 0) {
        this.indexCount = 0;
        this.indexMax = -1;
        if (this.indexBuffer) {
          this.bufferManager.updateBuffer(`${this.id}_index`, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array());
        }
        if (!this.warnedInvalidIndex) {
          console.warn(
            `[${this.id}] Indices provided but vertexCount is 0; skipping indexed draw until positions are set.`
          );
          this.warnedInvalidIndex = true;
        }
      } else {
        const { sanitized, droppedTriangles, maxIndex } = sanitizeTriangleIndices(
          data.indices,
          this.vertexCount
        );
        this.indexMax = maxIndex;
        this.warnedIndexOverflow = false;

        if (maxIndex >= this.vertexCount || droppedTriangles > 0) {
          console.warn(
            `[${this.id}] Invalid indices detected (maxIndex=${maxIndex}, vertexCount=${this.vertexCount}). Dropped ${droppedTriangles} triangles.`
          );
        }

        if (this.indexBuffer) {
          this.bufferManager.updateBuffer(`${this.id}_index`, gl.ELEMENT_ARRAY_BUFFER, sanitized);
        } else {
          this.indexBuffer = this.bufferManager.createBuffer(
            `${this.id}_index`,
            gl.ELEMENT_ARRAY_BUFFER,
            sanitized
          );
        }
        this.indexCount = sanitized.length;
      }
    }

    if (data.colors) {
      this.colorCount = Math.floor(data.colors.length / 3);
      if (this.colorBuffer) {
        this.bufferManager.updateBuffer(`${this.id}_color`, gl.ARRAY_BUFFER, data.colors);
      } else {
        this.colorBuffer = this.bufferManager.createBuffer(
          `${this.id}_color`,
          gl.ARRAY_BUFFER,
          data.colors
        );
      }
    }

    if (data.nextPositions) {
      this.nextPositionCount = Math.floor(data.nextPositions.length / 3);
      if (this.nextPositionBuffer) {
        this.bufferManager.updateBuffer(
          `${this.id}_next_position`,
          gl.ARRAY_BUFFER,
          data.nextPositions
        );
      } else {
        this.nextPositionBuffer = this.bufferManager.createBuffer(
          `${this.id}_next_position`,
          gl.ARRAY_BUFFER,
          data.nextPositions
        );
      }
    }

    if (data.sides) {
      this.sideCount = data.sides.length;
      if (this.sideBuffer) {
        this.bufferManager.updateBuffer(`${this.id}_side`, gl.ARRAY_BUFFER, data.sides);
      } else {
        this.sideBuffer = this.bufferManager.createBuffer(
          `${this.id}_side`,
          gl.ARRAY_BUFFER,
          data.sides
        );
      }
    }

    if (data.edgeKinds) {
      this.edgeKindCount = data.edgeKinds.length;
      if (this.edgeKindBuffer) {
        this.bufferManager.updateBuffer(
          `${this.id}_edge_kind`,
          gl.ARRAY_BUFFER,
          data.edgeKinds
        );
      } else {
        this.edgeKindBuffer = this.bufferManager.createBuffer(
          `${this.id}_edge_kind`,
          gl.ARRAY_BUFFER,
          data.edgeKinds
        );
      }
    }

    if (data.edgeWeights) {
      this.edgeWeightCount = data.edgeWeights.length;
      if (this.edgeWeightBuffer) {
        this.bufferManager.updateBuffer(
          `${this.id}_edge_weight`,
          gl.ARRAY_BUFFER,
          data.edgeWeights
        );
      } else {
        this.edgeWeightBuffer = this.bufferManager.createBuffer(
          `${this.id}_edge_weight`,
          gl.ARRAY_BUFFER,
          data.edgeWeights
        );
      }
    }

    if (data.corners) {
      this.cornerCount = Math.floor(data.corners.length / 2);
      if (this.cornerBuffer) {
        this.bufferManager.updateBuffer(
          `${this.id}_corner`,
          gl.ARRAY_BUFFER,
          data.corners
        );
      } else {
        this.cornerBuffer = this.bufferManager.createBuffer(
          `${this.id}_corner`,
          gl.ARRAY_BUFFER,
          data.corners
        );
      }
    }

    if (data.faceNormal1) {
      this.faceNormal1Count = Math.floor(data.faceNormal1.length / 3);
      if (this.faceNormal1Buffer) {
        this.bufferManager.updateBuffer(
          `${this.id}_face_normal1`,
          gl.ARRAY_BUFFER,
          data.faceNormal1
        );
      } else {
        this.faceNormal1Buffer = this.bufferManager.createBuffer(
          `${this.id}_face_normal1`,
          gl.ARRAY_BUFFER,
          data.faceNormal1
        );
      }
    }

    if (data.faceNormal2) {
      this.faceNormal2Count = Math.floor(data.faceNormal2.length / 3);
      if (this.faceNormal2Buffer) {
        this.bufferManager.updateBuffer(
          `${this.id}_face_normal2`,
          gl.ARRAY_BUFFER,
          data.faceNormal2
        );
      } else {
        this.faceNormal2Buffer = this.bufferManager.createBuffer(
          `${this.id}_face_normal2`,
          gl.ARRAY_BUFFER,
          data.faceNormal2
        );
      }
    }

    if (data.hasFace2) {
      this.hasFace2Count = data.hasFace2.length;
      if (this.hasFace2Buffer) {
        this.bufferManager.updateBuffer(
          `${this.id}_has_face2`,
          gl.ARRAY_BUFFER,
          data.hasFace2
        );
      } else {
        this.hasFace2Buffer = this.bufferManager.createBuffer(
          `${this.id}_has_face2`,
          gl.ARRAY_BUFFER,
          data.hasFace2
        );
      }
    }
  }

  bind(program: WebGLProgram): void {
    const gl = this.gl;

    const bindAttribute = (
      buffer: WebGLBuffer | undefined,
      count: number,
      size: number,
      name: string,
      fallback: [number, number, number, number] = [0, 0, 0, 1]
    ) => {
      const location = gl.getAttribLocation(program, name);
      if (location === -1) return;
      if (buffer && this.vertexCount > 0 && count >= this.vertexCount) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
      } else {
        gl.disableVertexAttribArray(location);
        gl.vertexAttrib4f(location, fallback[0], fallback[1], fallback[2], fallback[3]);
      }
    };

    bindAttribute(this.positionBuffer, this.vertexCount, 3, "position", [0, 0, 0, 1]);
    bindAttribute(this.normalBuffer, this.normalCount, 3, "normal", [0, 0, 1, 0]);
    bindAttribute(this.colorBuffer, this.colorCount, 3, "color", [1, 1, 1, 1]);
    bindAttribute(this.prevPositionBuffer, this.prevPositionCount, 3, "prevPosition", [0, 0, 0, 1]);
    bindAttribute(this.nextPositionBuffer, this.nextPositionCount, 3, "nextPosition", [0, 0, 0, 1]);
    bindAttribute(this.sideBuffer, this.sideCount, 1, "side", [0, 0, 0, 1]);
    bindAttribute(this.edgeKindBuffer, this.edgeKindCount, 1, "edgeKind", [0, 0, 0, 1]);
    bindAttribute(this.edgeWeightBuffer, this.edgeWeightCount, 1, "edgeWeight", [0, 0, 0, 1]);
    bindAttribute(this.cornerBuffer, this.cornerCount, 2, "corner", [0, 0, 0, 1]);
    bindAttribute(this.faceNormal1Buffer, this.faceNormal1Count, 3, "faceNormal1", [0, 0, 1, 0]);
    bindAttribute(this.faceNormal2Buffer, this.faceNormal2Count, 3, "faceNormal2", [0, 0, 1, 0]);
    bindAttribute(this.hasFace2Buffer, this.hasFace2Count, 1, "hasFace2", [0, 0, 0, 1]);

    if (this.indexBuffer) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    }
  }

  draw(mode: GLenum = WebGLRenderingContext.TRIANGLES): void {
    const gl = this.gl;
    if (!this.positionBuffer || this.vertexCount <= 0) {
      return;
    }
    if (
      this.indexBuffer &&
      this.indexCount > 0 &&
      this.indexMax >= 0 &&
      this.indexMax < this.vertexCount
    ) {
      gl.drawElements(mode, this.indexCount, gl.UNSIGNED_SHORT, 0);
    } else if (this.vertexCount > 0 && (!this.indexBuffer || this.indexMax < 0)) {
      gl.drawArrays(mode, 0, this.vertexCount);
    }
  }

  dispose(): void {
    if (this.positionBuffer) {
      this.bufferManager.deleteBuffer(`${this.id}_position`);
    }
    if (this.prevPositionBuffer) {
      this.bufferManager.deleteBuffer(`${this.id}_prev_position`);
    }
    if (this.normalBuffer) {
      this.bufferManager.deleteBuffer(`${this.id}_normal`);
    }
    if (this.indexBuffer) {
      this.bufferManager.deleteBuffer(`${this.id}_index`);
    }
    if (this.colorBuffer) {
      this.bufferManager.deleteBuffer(`${this.id}_color`);
    }
    if (this.nextPositionBuffer) {
      this.bufferManager.deleteBuffer(`${this.id}_next_position`);
    }
    if (this.sideBuffer) {
      this.bufferManager.deleteBuffer(`${this.id}_side`);
    }
    if (this.edgeKindBuffer) {
      this.bufferManager.deleteBuffer(`${this.id}_edge_kind`);
    }
    if (this.edgeWeightBuffer) {
      this.bufferManager.deleteBuffer(`${this.id}_edge_weight`);
    }
    if (this.cornerBuffer) {
      this.bufferManager.deleteBuffer(`${this.id}_corner`);
    }
  }
}
