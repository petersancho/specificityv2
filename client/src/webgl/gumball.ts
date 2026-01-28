import type { Basis } from "../geometry/transform";
import {
  generateBoxMesh,
  generateConeMesh,
  generateCylinderMesh,
  generateSphereMesh,
  generateTorusMesh,
} from "../geometry/mesh";
import type { RenderMesh, Vec3 } from "../types";
import type { GeometryBuffer } from "./BufferManager";
import type { Camera, WebGLRenderer } from "./WebGLRenderer";

export type GumballMode = "move" | "rotate" | "scale" | "gumball";

export type GumballHandleId =
  | "axis-x"
  | "axis-y"
  | "axis-z"
  | "plane-xy"
  | "plane-yz"
  | "plane-xz"
  | "rotate-x"
  | "rotate-y"
  | "rotate-z"
  | "scale-x"
  | "scale-y"
  | "scale-z"
  | "scale-uniform"
  | "pivot";

export const GUMBALL_METRICS = {
  axisLength: 1.05,
  axisRadius: 0.03,
  planeSize: 0.28,
  planeDepth: 0.018,
  planeOffset: 0.46,
  rotateRadius: 0.82,
  rotateTube: 0.045,
  scaleHandleOffset: 0.95,
  scaleHandleSize: 0.16,
  scaleCenterRadius: 0.12,
  uniformScaleOffset: 0.7,
  pivotScale: 0.5,
};

export type GumballBuffers = {
  axis: GeometryBuffer;
  plane: GeometryBuffer;
  ring: GeometryBuffer;
  scale: GeometryBuffer;
  scaleCenter: GeometryBuffer;
};

export type GumballRenderState = {
  position: Vec3;
  orientation: Basis;
  scale: number;
  mode: GumballMode;
  activeHandle?: GumballHandleId | null;
};

export type GumballRenderOptions = {
  lightPosition?: [number, number, number];
  lightColor?: [number, number, number];
  ambientColor?: [number, number, number];
  axisOpacity?: number;
  planeOpacity?: number;
};

const AXIS_COLORS: Record<"x" | "y" | "z", [number, number, number]> = {
  x: [0.95, 0.25, 0.25],
  y: [0.25, 0.85, 0.35],
  z: [0.2, 0.5, 0.95],
};

const PLANE_COLORS: Record<"xy" | "yz" | "xz", [number, number, number]> = {
  xy: [0.95, 0.85, 0.25],
  yz: [0.25, 0.9, 0.85],
  xz: [0.9, 0.35, 0.9],
};

const UNIFORM_SCALE_COLOR: [number, number, number] = [0.94, 0.94, 0.94];

const mixColor = (
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const lightenColor = (color: [number, number, number], amount: number) =>
  mixColor(color, [1, 1, 1], amount);

const mat4Multiply = (a: Float32Array, b: Float32Array) => {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col += 1) {
    const colOffset = col * 4;
    for (let row = 0; row < 4; row += 1) {
      out[colOffset + row] =
        a[row] * b[colOffset] +
        a[row + 4] * b[colOffset + 1] +
        a[row + 8] * b[colOffset + 2] +
        a[row + 12] * b[colOffset + 3];
    }
  }
  return out;
};

const mat4Translation = (x: number, y: number, z: number) =>
  new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1,
  ]);

const mat4Scale = (x: number, y: number, z: number) =>
  new Float32Array([
    x, 0, 0, 0,
    0, y, 0, 0,
    0, 0, z, 0,
    0, 0, 0, 1,
  ]);

const mat4RotationX = (angleRad: number) => {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return new Float32Array([
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1,
  ]);
};

const mat4RotationY = (angleRad: number) => {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return new Float32Array([
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1,
  ]);
};

const mat4RotationZ = (angleRad: number) => {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return new Float32Array([
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
};

const mat4FromBasis = (orientation: Basis, position: Vec3) =>
  new Float32Array([
    orientation.xAxis.x,
    orientation.yAxis.x,
    orientation.zAxis.x,
    0,
    orientation.xAxis.y,
    orientation.yAxis.y,
    orientation.zAxis.y,
    0,
    orientation.xAxis.z,
    orientation.yAxis.z,
    orientation.zAxis.z,
    0,
    position.x,
    position.y,
    position.z,
    1,
  ]);

const translateMesh = (mesh: RenderMesh, offset: Vec3): RenderMesh => {
  const positions = mesh.positions.slice();
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] += offset.x;
    positions[i + 1] += offset.y;
    positions[i + 2] += offset.z;
  }
  return { ...mesh, positions };
};

const mergeMeshes = (meshes: RenderMesh[]): RenderMesh => {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;
  meshes.forEach((mesh) => {
    positions.push(...mesh.positions);
    normals.push(...mesh.normals);
    mesh.indices.forEach((index) => indices.push(index + vertexOffset));
    vertexOffset += mesh.positions.length / 3;
  });
  return { positions, normals, uvs: [], indices };
};

const createArrowMesh = (
  length = GUMBALL_METRICS.axisLength,
  radius = GUMBALL_METRICS.axisRadius
) => {
  const shaftLength = length * 0.68;
  const headLength = length - shaftLength;
  const headRadius = radius * 1.8;
  const segments = 16;

  const shaft = translateMesh(
    generateCylinderMesh(radius, shaftLength, segments),
    { x: 0, y: shaftLength * 0.5, z: 0 }
  );
  const head = translateMesh(
    generateConeMesh(headRadius, headLength, segments),
    { x: 0, y: shaftLength + headLength * 0.5, z: 0 }
  );

  return mergeMeshes([shaft, head]);
};

export const createGumballBuffers = (renderer: WebGLRenderer): GumballBuffers => {
  const axisMesh = createArrowMesh();
  const axis = renderer.createGeometryBuffer("__gumball_axis");
  axis.setData({
    positions: new Float32Array(axisMesh.positions),
    normals: new Float32Array(axisMesh.normals),
    indices: new Uint16Array(axisMesh.indices),
  });

  const planeMesh = generateBoxMesh(
    {
      width: GUMBALL_METRICS.planeSize,
      height: GUMBALL_METRICS.planeSize,
      depth: GUMBALL_METRICS.planeDepth,
    },
    1
  );
  const plane = renderer.createGeometryBuffer("__gumball_plane");
  plane.setData({
    positions: new Float32Array(planeMesh.positions),
    normals: new Float32Array(planeMesh.normals),
    indices: new Uint16Array(planeMesh.indices),
  });

  const ringMesh = generateTorusMesh(
    GUMBALL_METRICS.rotateRadius,
    GUMBALL_METRICS.rotateTube,
    24,
    96
  );
  const ring = renderer.createGeometryBuffer("__gumball_ring");
  ring.setData({
    positions: new Float32Array(ringMesh.positions),
    normals: new Float32Array(ringMesh.normals),
    indices: new Uint16Array(ringMesh.indices),
  });

  const scaleMesh = generateBoxMesh(
    {
      width: GUMBALL_METRICS.scaleHandleSize,
      height: GUMBALL_METRICS.scaleHandleSize,
      depth: GUMBALL_METRICS.scaleHandleSize,
    },
    1
  );
  const scale = renderer.createGeometryBuffer("__gumball_scale");
  scale.setData({
    positions: new Float32Array(scaleMesh.positions),
    normals: new Float32Array(scaleMesh.normals),
    indices: new Uint16Array(scaleMesh.indices),
  });

  const scaleCenterMesh = generateSphereMesh(GUMBALL_METRICS.scaleCenterRadius, 18);
  const scaleCenter = renderer.createGeometryBuffer("__gumball_scale_center");
  scaleCenter.setData({
    positions: new Float32Array(scaleCenterMesh.positions),
    normals: new Float32Array(scaleCenterMesh.normals),
    indices: new Uint16Array(scaleCenterMesh.indices),
  });

  return { axis, plane, ring, scale, scaleCenter };
};

export const disposeGumballBuffers = (
  renderer: WebGLRenderer,
  buffers: GumballBuffers
) => {
  renderer.deleteGeometryBuffer(buffers.axis.id);
  renderer.deleteGeometryBuffer(buffers.plane.id);
  renderer.deleteGeometryBuffer(buffers.ring.id);
  renderer.deleteGeometryBuffer(buffers.scale.id);
  renderer.deleteGeometryBuffer(buffers.scaleCenter.id);
};

export const getGumballTransforms = (state: GumballRenderState) => {
  const base = mat4FromBasis(state.orientation, state.position);
  const scale = mat4Scale(state.scale, state.scale, state.scale);

  const xAxis = mat4Multiply(base, mat4Multiply(mat4RotationZ(-Math.PI / 2), scale));
  const yAxis = mat4Multiply(base, scale);
  const zAxis = mat4Multiply(base, mat4Multiply(mat4RotationX(Math.PI / 2), scale));

  const planeOffset = GUMBALL_METRICS.planeOffset * state.scale;
  const xy = mat4Multiply(
    base,
    mat4Multiply(mat4Translation(planeOffset, planeOffset, 0), scale)
  );
  const yz = mat4Multiply(
    base,
    mat4Multiply(
      mat4Translation(0, planeOffset, planeOffset),
      mat4Multiply(mat4RotationY(Math.PI / 2), scale)
    )
  );
  const xz = mat4Multiply(
    base,
    mat4Multiply(
      mat4Translation(planeOffset, 0, planeOffset),
      mat4Multiply(mat4RotationX(Math.PI / 2), scale)
    )
  );

  const rotateX = mat4Multiply(base, mat4Multiply(mat4RotationZ(-Math.PI / 2), scale));
  const rotateY = mat4Multiply(base, scale);
  const rotateZ = mat4Multiply(base, mat4Multiply(mat4RotationX(Math.PI / 2), scale));

  const scaleOffset = GUMBALL_METRICS.scaleHandleOffset * state.scale;
  const scaleTranslate = mat4Translation(0, scaleOffset, 0);
  const scaleHandle = mat4Multiply(scaleTranslate, scale);
  const scaleX = mat4Multiply(
    base,
    mat4Multiply(mat4RotationZ(-Math.PI / 2), scaleHandle)
  );
  const scaleY = mat4Multiply(base, scaleHandle);
  const scaleZ = mat4Multiply(
    base,
    mat4Multiply(mat4RotationX(Math.PI / 2), scaleHandle)
  );
  const uniformOffset = GUMBALL_METRICS.uniformScaleOffset * state.scale;
  const uniformAxis = Math.sqrt(1 / 3);
  const uniformTranslate = mat4Translation(
    uniformAxis * uniformOffset,
    uniformAxis * uniformOffset,
    uniformAxis * uniformOffset
  );
  const scaleUniform = mat4Multiply(base, mat4Multiply(uniformTranslate, scale));

  const pivotScale = state.scale * GUMBALL_METRICS.pivotScale;
  const pivot = mat4Multiply(base, mat4Scale(pivotScale, pivotScale, pivotScale));

  return {
    xAxis,
    yAxis,
    zAxis,
    xy,
    yz,
    xz,
    rotateX,
    rotateY,
    rotateZ,
    scaleX,
    scaleY,
    scaleZ,
    scaleUniform,
    pivot,
  };
};

export const renderGumball = (
  renderer: WebGLRenderer,
  camera: Camera,
  buffers: GumballBuffers,
  state: GumballRenderState,
  options: GumballRenderOptions = {}
) => {
  const transforms = getGumballTransforms(state);
  const activeHandle = state.activeHandle ?? null;
  const showMove = state.mode === "move" || state.mode === "gumball";
  const showRotate = state.mode === "rotate" || state.mode === "gumball";
  const showScale = state.mode === "scale" || state.mode === "gumball";
  const lightPosition = options.lightPosition ?? [12, 18, 10];
  const lightColor = options.lightColor ?? [0.74, 0.76, 0.74];
  const ambientColor = options.ambientColor ?? [0.62, 0.64, 0.62];
  const axisOpacity = options.axisOpacity ?? 1;
  const planeOpacity = options.planeOpacity ?? 0.65;
  const ringOpacity = Math.min(axisOpacity, 0.92);
  const scaleOpacity = Math.min(axisOpacity, 0.95);

  if (showMove) {
    renderer.renderGeometry(buffers.axis, camera, {
      modelMatrix: transforms.xAxis,
      materialColor:
        activeHandle === "axis-x" ? lightenColor(AXIS_COLORS.x, 0.2) : AXIS_COLORS.x,
      lightPosition,
      lightColor,
      ambientColor,
      opacity: axisOpacity,
    });
    renderer.renderGeometry(buffers.axis, camera, {
      modelMatrix: transforms.yAxis,
      materialColor:
        activeHandle === "axis-y" ? lightenColor(AXIS_COLORS.y, 0.2) : AXIS_COLORS.y,
      lightPosition,
      lightColor,
      ambientColor,
      opacity: axisOpacity,
    });
    renderer.renderGeometry(buffers.axis, camera, {
      modelMatrix: transforms.zAxis,
      materialColor:
        activeHandle === "axis-z" ? lightenColor(AXIS_COLORS.z, 0.2) : AXIS_COLORS.z,
      lightPosition,
      lightColor,
      ambientColor,
      opacity: axisOpacity,
    });

    renderer.renderGeometry(buffers.plane, camera, {
      modelMatrix: transforms.xy,
      materialColor:
        activeHandle === "plane-xy"
          ? lightenColor(PLANE_COLORS.xy, 0.2)
          : PLANE_COLORS.xy,
      lightPosition,
      lightColor,
      ambientColor,
      opacity: planeOpacity,
    });
    renderer.renderGeometry(buffers.plane, camera, {
      modelMatrix: transforms.yz,
      materialColor:
        activeHandle === "plane-yz"
          ? lightenColor(PLANE_COLORS.yz, 0.2)
          : PLANE_COLORS.yz,
      lightPosition,
      lightColor,
      ambientColor,
      opacity: planeOpacity,
    });
    renderer.renderGeometry(buffers.plane, camera, {
      modelMatrix: transforms.xz,
      materialColor:
        activeHandle === "plane-xz"
          ? lightenColor(PLANE_COLORS.xz, 0.2)
          : PLANE_COLORS.xz,
      lightPosition,
      lightColor,
      ambientColor,
      opacity: planeOpacity,
    });
  }

  if (showRotate) {
    renderer.renderGeometry(buffers.ring, camera, {
      modelMatrix: transforms.rotateX,
      materialColor:
        activeHandle === "rotate-x" ? lightenColor(AXIS_COLORS.x, 0.25) : AXIS_COLORS.x,
      lightPosition,
      lightColor,
      ambientColor,
      opacity: ringOpacity,
    });
    renderer.renderGeometry(buffers.ring, camera, {
      modelMatrix: transforms.rotateY,
      materialColor:
        activeHandle === "rotate-y" ? lightenColor(AXIS_COLORS.y, 0.25) : AXIS_COLORS.y,
      lightPosition,
      lightColor,
      ambientColor,
      opacity: ringOpacity,
    });
    renderer.renderGeometry(buffers.ring, camera, {
      modelMatrix: transforms.rotateZ,
      materialColor:
        activeHandle === "rotate-z" ? lightenColor(AXIS_COLORS.z, 0.25) : AXIS_COLORS.z,
      lightPosition,
      lightColor,
      ambientColor,
      opacity: ringOpacity,
    });
  }

  if (showScale) {
    renderer.renderGeometry(buffers.scale, camera, {
      modelMatrix: transforms.scaleX,
      materialColor:
        activeHandle === "scale-x" ? lightenColor(AXIS_COLORS.x, 0.25) : AXIS_COLORS.x,
      lightPosition,
      lightColor,
      ambientColor,
      opacity: scaleOpacity,
    });
    renderer.renderGeometry(buffers.scale, camera, {
      modelMatrix: transforms.scaleY,
      materialColor:
        activeHandle === "scale-y" ? lightenColor(AXIS_COLORS.y, 0.25) : AXIS_COLORS.y,
      lightPosition,
      lightColor,
      ambientColor,
      opacity: scaleOpacity,
    });
    renderer.renderGeometry(buffers.scale, camera, {
      modelMatrix: transforms.scaleZ,
      materialColor:
        activeHandle === "scale-z" ? lightenColor(AXIS_COLORS.z, 0.25) : AXIS_COLORS.z,
      lightPosition,
      lightColor,
      ambientColor,
      opacity: scaleOpacity,
    });
    renderer.renderGeometry(buffers.scale, camera, {
      modelMatrix: transforms.scaleUniform,
      materialColor:
        activeHandle === "scale-uniform"
          ? lightenColor(UNIFORM_SCALE_COLOR, 0.25)
          : UNIFORM_SCALE_COLOR,
      lightPosition,
      lightColor,
      ambientColor,
      opacity: scaleOpacity,
    });
  }

  renderer.renderGeometry(buffers.scaleCenter, camera, {
    modelMatrix: transforms.pivot,
    materialColor: activeHandle === "pivot" ? lightenColor([1, 1, 1], 0.2) : [0.98, 0.98, 0.96],
    lightPosition,
    lightColor,
    ambientColor,
    opacity: 0.95,
  });
};
