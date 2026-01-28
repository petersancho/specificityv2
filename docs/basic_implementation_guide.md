# Basic Implementation Guide - WebGL Only

## Setup: Pure WebGL Context

First, initialize WebGL without any libraries. This goes in `client/src/components/ViewerCanvas.tsx`.

```typescript
// ViewerCanvas.tsx
import { useEffect, useRef } from 'react'

export const ViewerCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGLRenderingContext | null>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Get WebGL context
    const gl = canvas.getContext('webgl2')
    if (!gl) {
      console.error('WebGL2 not supported')
      return
    }
    
    glRef.current = gl
    
    // Set canvas size to match display
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)
    
    // Basic setup
    gl.clearColor(0.1, 0.1, 0.1, 1.0)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    
    return () => window.removeEventListener('resize', resize)
  }, [])
  
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}
```

## Basic Shader Programs

Create simple shaders for rendering geometry. File: `client/src/webgl/shaders.ts`

```typescript
// Basic vertex shader
export const basicVertexShader = `#version 300 es
in vec3 position;
in vec3 normal;

uniform mat4 uModelViewProjection;
uniform mat4 uNormalMatrix;

out vec3 vNormal;
out vec3 vPosition;

void main() {
  vPosition = position;
  vNormal = (uNormalMatrix * vec4(normal, 0.0)).xyz;
  gl_Position = uModelViewProjection * vec4(position, 1.0);
}
`

// Basic fragment shader
export const basicFragmentShader = `#version 300 es
precision highp float;

in vec3 vNormal;
in vec3 vPosition;

uniform vec3 uColor;
uniform float uAlpha;
uniform vec3 uLightDir;

out vec4 fragColor;

void main() {
  vec3 normal = normalize(vNormal);
  float diffuse = max(dot(normal, uLightDir), 0.0);
  vec3 ambient = vec3(0.3);
  vec3 color = uColor * (ambient + diffuse * 0.7);
  fragColor = vec4(color, uAlpha);
}
`

// Compile and link shader program
export const createShaderProgram = (
  gl: WebGL2RenderingContext,
  vertSource: string,
  fragSource: string
): WebGLProgram | null => {
  const vertShader = gl.createShader(gl.VERTEX_SHADER)!
  gl.shaderSource(vertShader, vertSource)
  gl.compileShader(vertShader)
  
  if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
    console.error('Vertex shader error:', gl.getShaderInfoLog(vertShader))
    return null
  }
  
  const fragShader = gl.createShader(gl.FRAGMENT_SHADER)!
  gl.shaderSource(fragShader, fragSource)
  gl.compileShader(fragShader)
  
  if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
    console.error('Fragment shader error:', gl.getShaderInfoLog(fragShader))
    return null
  }
  
  const program = gl.createProgram()!
  gl.attachShader(program, vertShader)
  gl.attachShader(program, fragShader)
  gl.linkProgram(program)
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program))
    return null
  }
  
  return program
}
```

## Simple Geometry: Box (for objects and gumball)

File: `client/src/webgl/geometry.ts`

```typescript
export interface GeometryBuffers {
  position: WebGLBuffer
  normal: WebGLBuffer
  index: WebGLBuffer
  count: number
}

// Create a simple box
export const createBox = (
  gl: WebGL2RenderingContext,
  width: number = 1,
  height: number = 1,
  depth: number = 1
): GeometryBuffers => {
  const w = width / 2
  const h = height / 2
  const d = depth / 2
  
  // Vertex positions (8 corners, 6 faces × 4 vertices = 24 vertices)
  const positions = new Float32Array([
    // Front face
    -w, -h,  d,  w, -h,  d,  w,  h,  d, -w,  h,  d,
    // Back face
    -w, -h, -d, -w,  h, -d,  w,  h, -d,  w, -h, -d,
    // Top face
    -w,  h, -d, -w,  h,  d,  w,  h,  d,  w,  h, -d,
    // Bottom face
    -w, -h, -d,  w, -h, -d,  w, -h,  d, -w, -h,  d,
    // Right face
     w, -h, -d,  w,  h, -d,  w,  h,  d,  w, -h,  d,
    // Left face
    -w, -h, -d, -w, -h,  d, -w,  h,  d, -w,  h, -d
  ])
  
  // Normals (one per vertex)
  const normals = new Float32Array([
    // Front
    0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
    // Back
    0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
    // Top
    0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
    // Bottom
    0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
    // Right
    1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
    // Left
    -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0
  ])
  
  // Indices (2 triangles per face)
  const indices = new Uint16Array([
    0, 1, 2,  0, 2, 3,    // Front
    4, 5, 6,  4, 6, 7,    // Back
    8, 9, 10,  8, 10, 11, // Top
    12, 13, 14,  12, 14, 15, // Bottom
    16, 17, 18,  16, 18, 19, // Right
    20, 21, 22,  20, 22, 23  // Left
  ])
  
  const posBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
  
  const normBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW)
  
  const idxBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)
  
  return {
    position: posBuffer,
    normal: normBuffer,
    index: idxBuffer,
    count: indices.length
  }
}

// Create arrow (cylinder + cone for gumball axes)
export const createArrow = (
  gl: WebGL2RenderingContext,
  length: number = 1,
  radius: number = 0.05
): GeometryBuffers => {
  const segments = 16
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  
  // Shaft (cylinder)
  const shaftLength = length * 0.7
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    
    // Bottom
    positions.push(x, 0, z)
    normals.push(x / radius, 0, z / radius)
    
    // Top
    positions.push(x, shaftLength, z)
    normals.push(x / radius, 0, z / radius)
  }
  
  // Create shaft triangles
  for (let i = 0; i < segments; i++) {
    const base = i * 2
    indices.push(base, base + 1, base + 2)
    indices.push(base + 1, base + 3, base + 2)
  }
  
  // Cone head
  const coneBase = positions.length / 3
  const coneRadius = radius * 2
  const coneHeight = length * 0.3
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    const x = Math.cos(angle) * coneRadius
    const z = Math.sin(angle) * coneRadius
    
    positions.push(x, shaftLength, z)
    normals.push(x, coneHeight * 0.5, z)
  }
  
  // Cone tip
  positions.push(0, length, 0)
  normals.push(0, 1, 0)
  
  const tipIdx = positions.length / 3 - 1
  for (let i = 0; i < segments; i++) {
    indices.push(coneBase + i, tipIdx, coneBase + i + 1)
  }
  
  const posBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)
  
  const normBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW)
  
  const idxBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)
  
  return {
    position: posBuffer,
    normal: normBuffer,
    index: idxBuffer,
    count: indices.length
  }
}
```

## Matrix Math (Column-Major for WebGL)

File: `client/src/math/matrix.ts`

```typescript
// 4x4 matrix in column-major order (WebGL standard)
export type Mat4 = Float32Array // 16 elements

export const mat4Identity = (): Mat4 => new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
])

export const mat4Multiply = (a: Mat4, b: Mat4): Mat4 => {
  const result = new Float32Array(16)
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[col * 4 + k]
      }
      result[col * 4 + row] = sum
    }
  }
  return result
}

export const mat4Translation = (x: number, y: number, z: number): Mat4 => {
  const m = mat4Identity()
  m[12] = x
  m[13] = y
  m[14] = z
  return m
}

export const mat4Scale = (x: number, y: number, z: number): Mat4 => {
  const m = mat4Identity()
  m[0] = x
  m[5] = y
  m[10] = z
  return m
}

export const mat4RotationX = (angleRad: number): Mat4 => {
  const c = Math.cos(angleRad)
  const s = Math.sin(angleRad)
  const m = mat4Identity()
  m[5] = c
  m[6] = s
  m[9] = -s
  m[10] = c
  return m
}

export const mat4RotationY = (angleRad: number): Mat4 => {
  const c = Math.cos(angleRad)
  const s = Math.sin(angleRad)
  const m = mat4Identity()
  m[0] = c
  m[2] = -s
  m[8] = s
  m[10] = c
  return m
}

export const mat4RotationZ = (angleRad: number): Mat4 => {
  const c = Math.cos(angleRad)
  const s = Math.sin(angleRad)
  const m = mat4Identity()
  m[0] = c
  m[1] = s
  m[4] = -s
  m[5] = c
  return m
}

// Perspective projection
export const mat4Perspective = (
  fovRad: number,
  aspect: number,
  near: number,
  far: number
): Mat4 => {
  const f = 1.0 / Math.tan(fovRad / 2)
  const rangeInv = 1.0 / (near - far)
  
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0
  ])
}

// Look-at view matrix
export const mat4LookAt = (
  eyeX: number, eyeY: number, eyeZ: number,
  targetX: number, targetY: number, targetZ: number,
  upX: number, upY: number, upZ: number
): Mat4 => {
  // Forward = normalize(target - eye)
  let fx = targetX - eyeX
  let fy = targetY - eyeY
  let fz = targetZ - eyeZ
  const fLen = Math.sqrt(fx * fx + fy * fy + fz * fz)
  fx /= fLen
  fy /= fLen
  fz /= fLen
  
  // Right = normalize(forward × up)
  let rx = fy * upZ - fz * upY
  let ry = fz * upX - fx * upZ
  let rz = fx * upY - fy * upX
  const rLen = Math.sqrt(rx * rx + ry * ry + rz * rz)
  rx /= rLen
  ry /= rLen
  rz /= rLen
  
  // Up = right × forward
  const ux = ry * fz - rz * fy
  const uy = rz * fx - rx * fz
  const uz = rx * fy - ry * fx
  
  return new Float32Array([
    rx, ux, -fx, 0,
    ry, uy, -fy, 0,
    rz, uz, -fz, 0,
    -(rx * eyeX + ry * eyeY + rz * eyeZ),
    -(ux * eyeX + uy * eyeY + uz * eyeZ),
    -(-fx * eyeX + -fy * eyeY + -fz * eyeZ),
    1
  ])
}
```

## Gumball Implementation

File: `client/src/webgl/gumball.ts`

```typescript
import { GeometryBuffers, createArrow, createBox } from './geometry'
import { Mat4, mat4Identity, mat4Translation, mat4RotationZ, mat4RotationX, mat4Multiply, mat4Scale } from '../math/matrix'

export interface GumballHandles {
  xAxis: GeometryBuffers
  yAxis: GeometryBuffers
  zAxis: GeometryBuffers
  xPlane: GeometryBuffers
  yPlane: GeometryBuffers
  zPlane: GeometryBuffers
}

export interface GumballState {
  position: [number, number, number]
  scale: number
  activeHandle: 'x' | 'y' | 'z' | 'xy' | 'yz' | 'xz' | null
}

export const createGumball = (gl: WebGL2RenderingContext): GumballHandles => {
  return {
    xAxis: createArrow(gl, 1, 0.03),
    yAxis: createArrow(gl, 1, 0.03),
    zAxis: createArrow(gl, 1, 0.03),
    xPlane: createBox(gl, 0.3, 0.3, 0.01),
    yPlane: createBox(gl, 0.3, 0.3, 0.01),
    zPlane: createBox(gl, 0.3, 0.3, 0.01)
  }
}

export const getGumballTransforms = (state: GumballState): {
  xAxis: Mat4
  yAxis: Mat4
  zAxis: Mat4
  xPlane: Mat4
  yPlane: Mat4
  zPlane: Mat4
} => {
  const [px, py, pz] = state.position
  const s = state.scale
  
  const baseTranslation = mat4Translation(px, py, pz)
  const scaleMatrix = mat4Scale(s, s, s)
  
  // X axis (red) - rotate arrow to point along +X
  const xRot = mat4RotationZ(-Math.PI / 2)
  const xAxis = mat4Multiply(baseTranslation, mat4Multiply(scaleMatrix, xRot))
  
  // Y axis (green) - arrow already points up (+Y)
  const yAxis = mat4Multiply(baseTranslation, scaleMatrix)
  
  // Z axis (blue) - rotate arrow to point along +Z
  const zRot = mat4RotationX(Math.PI / 2)
  const zAxis = mat4Multiply(baseTranslation, mat4Multiply(scaleMatrix, zRot))
  
  // Plane handles at corners of axes
  const planeOffset = 0.5 * s
  
  // XY plane (between X and Y)
  const xyTrans = mat4Translation(px + planeOffset, py + planeOffset, pz)
  const xPlane = mat4Multiply(xyTrans, scaleMatrix)
  
  // YZ plane (between Y and Z)
  const yzTrans = mat4Translation(px, py + planeOffset, pz + planeOffset)
  const yzRot = mat4RotationY(Math.PI / 2)
  const yPlane = mat4Multiply(yzTrans, mat4Multiply(scaleMatrix, yzRot))
  
  // XZ plane (between X and Z)
  const xzTrans = mat4Translation(px + planeOffset, py, pz + planeOffset)
  const xzRot = mat4RotationX(Math.PI / 2)
  const zPlane = mat4Multiply(xzTrans, mat4Multiply(scaleMatrix, xzRot))
  
  return { xAxis, yAxis, zAxis, xPlane, yPlane, zPlane }
}

export const renderGumball = (
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  handles: GumballHandles,
  state: GumballState,
  viewProjection: Mat4
) => {
  const transforms = getGumballTransforms(state)
  
  gl.useProgram(program)
  
  const posLoc = gl.getAttribLocation(program, 'position')
  const normLoc = gl.getAttribLocation(program, 'normal')
  const mvpLoc = gl.getUniformLocation(program, 'uModelViewProjection')
  const colorLoc = gl.getUniformLocation(program, 'uColor')
  const alphaLoc = gl.getUniformLocation(program, 'uAlpha')
  const lightLoc = gl.getUniformLocation(program, 'uLightDir')
  const normalMatLoc = gl.getUniformLocation(program, 'uNormalMatrix')
  
  gl.uniform3f(lightLoc, 0.5, 0.7, 0.3)
  
  const renderHandle = (
    geometry: GeometryBuffers,
    transform: Mat4,
    color: [number, number, number],
    isActive: boolean
  ) => {
    const mvp = mat4Multiply(viewProjection, transform)
    
    gl.uniformMatrix4fv(mvpLoc, false, mvp)
    gl.uniformMatrix4fv(normalMatLoc, false, mat4Identity()) // Simplified
    gl.uniform3fv(colorLoc, color)
    gl.uniform1f(alphaLoc, isActive ? 1.0 : 0.7)
    
    gl.bindBuffer(gl.ARRAY_BUFFER, geometry.position)
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0)
    
    gl.bindBuffer(gl.ARRAY_BUFFER, geometry.normal)
    gl.enableVertexAttribArray(normLoc)
    gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0)
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.index)
    gl.drawElements(gl.TRIANGLES, geometry.count, gl.UNSIGNED_SHORT, 0)
  }
  
  // X axis - red
  renderHandle(handles.xAxis, transforms.xAxis, [1, 0, 0], state.activeHandle === 'x')
  
  // Y axis - green
  renderHandle(handles.yAxis, transforms.yAxis, [0, 1, 0], state.activeHandle === 'y')
  
  // Z axis - blue
  renderHandle(handles.zAxis, transforms.zAxis, [0, 0, 1], state.activeHandle === 'z')
  
  // Plane handles with transparency
  renderHandle(handles.xPlane, transforms.xPlane, [1, 1, 0], state.activeHandle === 'xy')
  renderHandle(handles.yPlane, transforms.yPlane, [0, 1, 1], state.activeHandle === 'yz')
  renderHandle(handles.zPlane, transforms.zPlane, [1, 0, 1], state.activeHandle === 'xz')
}
```

## Simple Move Node (Numerica)

File: `client/src/nodes/MoveNode.ts`

```typescript
import { mat4Translation } from '../math/matrix'

export interface MoveNodeData {
  id: string
  type: 'move'
  position: { x: number, y: number }
  parameters: {
    worldX: number
    worldY: number
    worldZ: number
  }
}

export const MoveNodeDefinition = {
  id: 'move',
  label: 'Move',
  category: 'transform',
  
  inputs: [
    { key: 'geometry', label: 'Geometry', type: 'geometry', required: true }
  ],
  
  outputs: [
    { key: 'result', label: 'Result', type: 'geometry' }
  ],
  
  parameters: [
    { key: 'worldX', label: 'World X', type: 'number', default: 0 },
    { key: 'worldY', label: 'World Y', type: 'number', default: 0 },
    { key: 'worldZ', label: 'World Z', type: 'number', default: 0 }
  ],
  
  compute: (inputs: any, params: { worldX: number, worldY: number, worldZ: number }) => {
    const inputGeometry = inputs.geometry
    if (!inputGeometry) return { result: null }
    
    // Create translation matrix
    const transform = mat4Translation(params.worldX, params.worldY, params.worldZ)
    
    // Apply to geometry
    const result = applyTransformToGeometry(inputGeometry, transform)
    
    return { result }
  }
}

// Helper function
const applyTransformToGeometry = (geometry: any, transform: Mat4) => {
  // Transform all vertices by the matrix
  const transformedVertices = geometry.vertices.map((v: [number, number, number]) => {
    const x = transform[0] * v[0] + transform[4] * v[1] + transform[8] * v[2] + transform[12]
    const y = transform[1] * v[0] + transform[5] * v[1] + transform[9] * v[2] + transform[13]
    const z = transform[2] * v[0] + transform[6] * v[1] + transform[10] * v[2] + transform[14]
    return [x, y, z]
  })
  
  return {
    ...geometry,
    vertices: transformedVertices
  }
}
```

## Node Canvas Rendering (WebGL)

File: `client/src/components/NodeCanvas.tsx`

```typescript
import { useEffect, useRef } from 'react'
import { MoveNodeData } from '../nodes/MoveNode'

export const NodeCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGL2RenderingContext | null>(null)
  
  // Node positions
  const nodes: MoveNodeData[] = [
    {
      id: 'node1',
      type: 'move',
      position: { x: 100, y: 100 },
      parameters: { worldX: 0, worldY: 0, worldZ: 0 }
    }
  ]
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const gl = canvas.getContext('webgl2')
    if (!gl) return
    
    glRef.current = gl
    
    // Render loop
    const render = () => {
      gl.clearColor(0.15, 0.15, 0.15, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      
      // Render nodes
      nodes.forEach(node => {
        renderNode(gl, node)
      })
      
      requestAnimationFrame(render)
    }
    render()
  }, [])
  
  return <canvas ref={canvasRef} width={800} height={600} />
}

const renderNode = (gl: WebGL2RenderingContext, node: MoveNodeData) => {
  // Simple rectangle for node
  const { x, y } = node.position
  const width = 200
  const height = 150
  
  // Create rectangle vertices
  const vertices = new Float32Array([
    x, y,
    x + width, y,
    x + width, y + height,
    x, y + height
  ])
  
  // Simple shader for 2D rectangles
  const vertShader = `#version 300 es
    in vec2 position;
    uniform vec2 uCanvasSize;
    void main() {
      vec2 clipSpace = (position / uCanvasSize) * 2.0 - 1.0;
      gl_Position = vec4(clipSpace.x, -clipSpace.y, 0, 1);
    }
  `
  
  const fragShader = `#version 300 es
    precision highp float;
    uniform vec3 uColor;
    out vec4 fragColor;
    void main() {
      fragColor = vec4(uColor, 1.0);
    }
  `
  
  // Compile shaders and render (simplified - cache this in real implementation)
  // ... shader compilation code ...
  
  // Draw filled rectangle with drop shadow
  // 1. Shadow
  // 2. Fill
  // 3. Border
}
```

## Putting It All Together - Main Render Loop

File: `client/src/components/ViewerCanvas.tsx` (complete)

```typescript
import { useEffect, useRef, useState } from 'react'
import { createShaderProgram, basicVertexShader, basicFragmentShader } from '../webgl/shaders'
import { createBox, GeometryBuffers } from '../webgl/geometry'
import { createGumball, renderGumball, GumballState } from '../webgl/gumball'
import { mat4Perspective, mat4LookAt, mat4Multiply, mat4Translation } from '../math/matrix'

export const ViewerCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gumballState, setGumballState] = useState<GumballState>({
    position: [0, 0, 0],
    scale: 1,
    activeHandle: null
  })
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const gl = canvas.getContext('webgl2')
    if (!gl) return
    
    // Setup
    const resize = () => {
      canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1)
      canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    
    gl.clearColor(0.1, 0.1, 0.1, 1)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    
    // Create shader program
    const program = createShaderProgram(gl, basicVertexShader, basicFragmentShader)
    if (!program) return
    
    // Create geometry
    const box = createBox(gl, 1, 1, 1)
    const gumball = createGumball(gl)
    
    // Camera
    let cameraDistance = 5
    let cameraAngleX = 0.5
    let cameraAngleY = 0.5
    
    // Mouse interaction
    let isDragging = false
    let lastX = 0
    let lastY = 0
    
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 2) { // Right click
        isDragging = true
        lastX = e.clientX
        lastY = e.clientY
        e.preventDefault()
      }
    })
    
    canvas.addEventListener('pointermove', (e) => {
      if (isDragging) {
        const deltaX = e.clientX - lastX
        const deltaY = e.clientY - lastY
        
        if (e.shiftKey) {
          // Pan (not implemented in this basic version)
        } else {
          // Orbit
          cameraAngleY += deltaX * 0.01
          cameraAngleX += deltaY * 0.01
          cameraAngleX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraAngleX))
        }
        
        lastX = e.clientX
        lastY = e.clientY
      }
    })
    
    canvas.addEventListener('pointerup', () => {
      isDragging = false
    })
    
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
      cameraDistance *= 1 + e.deltaY * 0.001
      cameraDistance = Math.max(1, Math.min(20, cameraDistance))
    })
    
    // Prevent context menu
    canvas.addEventListener('contextmenu', e => e.preventDefault())
    
    // Render loop
    const render = () => {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      
      // Calculate camera position
      const camX = Math.sin(cameraAngleY) * Math.cos(cameraAngleX) * cameraDistance
      const camY = Math.sin(cameraAngleX) * cameraDistance
      const camZ = Math.cos(cameraAngleY) * Math.cos(cameraAngleX) * cameraDistance
      
      // View and projection matrices
      const view = mat4LookAt(
        camX, camY, camZ,
        0, 0, 0,
        0, 1, 0
      )
      
      const aspect = canvas.width / canvas.height
      const projection = mat4Perspective(Math.PI / 4, aspect, 0.1, 100)
      
      const viewProjection = mat4Multiply(projection, view)
      
      // Render a simple box at origin
      gl.useProgram(program)
      
      const posLoc = gl.getAttribLocation(program, 'position')
      const normLoc = gl.getAttribLocation(program, 'normal')
      const mvpLoc = gl.getUniformLocation(program, 'uModelViewProjection')
      const colorLoc = gl.getUniformLocation(program, 'uColor')
      const alphaLoc = gl.getUniformLocation(program, 'uAlpha')
      const lightLoc = gl.getUniformLocation(program, 'uLightDir')
      const normalMatLoc = gl.getUniformLocation(program, 'uNormalMatrix')
      
      // Box at origin
      const boxTransform = mat4Translation(0, 0, 0)
      const boxMVP = mat4Multiply(viewProjection, boxTransform)
      
      gl.uniformMatrix4fv(mvpLoc, false, boxMVP)
      gl.uniformMatrix4fv(normalMatLoc, false, boxTransform)
      gl.uniform3f(colorLoc, 0.7, 0.7, 0.7)
      gl.uniform1f(alphaLoc, 1.0)
      gl.uniform3f(lightLoc, 0.5, 0.7, 0.3)
      
      gl.bindBuffer(gl.ARRAY_BUFFER, box.position)
      gl.enableVertexAttribArray(posLoc)
      gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0)
      
      gl.bindBuffer(gl.ARRAY_BUFFER, box.normal)
      gl.enableVertexAttribArray(normLoc)
      gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0)
      
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, box.index)
      gl.drawElements(gl.TRIANGLES, box.count, gl.UNSIGNED_SHORT, 0)
      
      // Render gumball
      renderGumball(gl, program, gumball, gumballState, viewProjection)
      
      requestAnimationFrame(render)
    }
    
    render()
    
    return () => {
      window.removeEventListener('resize', resize)
    }
  }, [gumballState])
  
  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        display: 'block'
      }} 
    />
  )
}
```

## Store Integration

File: `client/src/store/useProjectStore.ts`

```typescript
import { create } from 'zustand'
import { Mat4 } from '../math/matrix'

interface GeometryData {
  id: string
  type: 'box' | 'sphere' | 'curve'
  vertices: [number, number, number][]
  transform: Mat4
}

interface ProjectStore {
  geometry: Record<string, GeometryData>
  selectedIds: string[]
  
  addGeometry: (geom: GeometryData) => void
  updateGeometry: (id: string, geom: GeometryData) => void
  selectGeometry: (ids: string[]) => void
  transformSelected: (matrix: Mat4) => void
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  geometry: {},
  selectedIds: [],
  
  addGeometry: (geom) => set((state) => ({
    geometry: { ...state.geometry, [geom.id]: geom }
  })),
  
  updateGeometry: (id, geom) => set((state) => ({
    geometry: { ...state.geometry, [id]: geom }
  })),
  
  selectGeometry: (ids) => set({ selectedIds: ids }),
  
  transformSelected: (matrix) => {
    const state = get()
    const updated: Record<string, GeometryData> = {}
    
    state.selectedIds.forEach(id => {
      const geom = state.geometry[id]
      if (geom) {
        updated[id] = {
          ...geom,
          vertices: geom.vertices.map(v => transformPoint(matrix, v))
        }
      }
    })
    
    set((state) => ({
      geometry: { ...state.geometry, ...updated }
    }))
  }
}))

const transformPoint = (m: Mat4, p: [number, number, number]): [number, number, number] => {
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]
  const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]
  const z = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]
  return [x, y, z]
}
```

This is your **absolute basics** guide. Everything is pure WebGL, simple matrix math, and straightforward implementations. Start with the ViewerCanvas that renders a box and gumball, then add the Move node functionality through the store.