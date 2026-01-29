export type BufferData = {
  positions?: Float32Array;
  prevPositions?: Float32Array;
  normals?: Float32Array;
  indices?: Uint16Array;
  colors?: Float32Array;
  nextPositions?: Float32Array;
  sides?: Float32Array;
  edgeKinds?: Float32Array;
  edgeWeights?: Float32Array;
  corners?: Float32Array;
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
  public vertexCount: number = 0;
  public indexCount: number = 0;

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
      this.vertexCount = data.positions.length / 3;
    }

    if (data.prevPositions) {
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
      if (this.indexBuffer) {
        this.bufferManager.updateBuffer(`${this.id}_index`, gl.ELEMENT_ARRAY_BUFFER, data.indices);
      } else {
        this.indexBuffer = this.bufferManager.createBuffer(
          `${this.id}_index`,
          gl.ELEMENT_ARRAY_BUFFER,
          data.indices
        );
      }
      this.indexCount = data.indices.length;
    }

    if (data.colors) {
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
  }

  bind(program: WebGLProgram): void {
    const gl = this.gl;

    if (this.positionBuffer) {
      const positionLoc = gl.getAttribLocation(program, "position");
      if (positionLoc !== -1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
      }
    }

    if (this.normalBuffer) {
      const normalLoc = gl.getAttribLocation(program, "normal");
      if (normalLoc !== -1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.enableVertexAttribArray(normalLoc);
        gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
      }
    }

    if (this.colorBuffer) {
      const colorLoc = gl.getAttribLocation(program, "color");
      if (colorLoc !== -1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.enableVertexAttribArray(colorLoc);
        gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
      }
    }

    if (this.prevPositionBuffer) {
      const prevPositionLoc = gl.getAttribLocation(program, "prevPosition");
      if (prevPositionLoc !== -1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.prevPositionBuffer);
        gl.enableVertexAttribArray(prevPositionLoc);
        gl.vertexAttribPointer(prevPositionLoc, 3, gl.FLOAT, false, 0, 0);
      }
    }

    if (this.nextPositionBuffer) {
      const nextPositionLoc = gl.getAttribLocation(program, "nextPosition");
      if (nextPositionLoc !== -1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.nextPositionBuffer);
        gl.enableVertexAttribArray(nextPositionLoc);
        gl.vertexAttribPointer(nextPositionLoc, 3, gl.FLOAT, false, 0, 0);
      }
    }

    if (this.sideBuffer) {
      const sideLoc = gl.getAttribLocation(program, "side");
      if (sideLoc !== -1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sideBuffer);
        gl.enableVertexAttribArray(sideLoc);
        gl.vertexAttribPointer(sideLoc, 1, gl.FLOAT, false, 0, 0);
      }
    }

    if (this.edgeKindBuffer) {
      const edgeKindLoc = gl.getAttribLocation(program, "edgeKind");
      if (edgeKindLoc !== -1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeKindBuffer);
        gl.enableVertexAttribArray(edgeKindLoc);
        gl.vertexAttribPointer(edgeKindLoc, 1, gl.FLOAT, false, 0, 0);
      }
    }

    if (this.edgeWeightBuffer) {
      const edgeWeightLoc = gl.getAttribLocation(program, "edgeWeight");
      if (edgeWeightLoc !== -1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeWeightBuffer);
        gl.enableVertexAttribArray(edgeWeightLoc);
        gl.vertexAttribPointer(edgeWeightLoc, 1, gl.FLOAT, false, 0, 0);
      }
    }

    if (this.cornerBuffer) {
      const cornerLoc = gl.getAttribLocation(program, "corner");
      if (cornerLoc !== -1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerBuffer);
        gl.enableVertexAttribArray(cornerLoc);
        gl.vertexAttribPointer(cornerLoc, 2, gl.FLOAT, false, 0, 0);
      }
    }

    if (this.indexBuffer) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    }
  }

  draw(mode: GLenum = WebGLRenderingContext.TRIANGLES): void {
    const gl = this.gl;
    if (this.indexBuffer && this.indexCount > 0) {
      gl.drawElements(mode, this.indexCount, gl.UNSIGNED_SHORT, 0);
    } else if (this.vertexCount > 0) {
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
