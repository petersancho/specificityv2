# Shader Inventory - Phase 1 Audit

> Status: legacy audit. Current shader sources live in `client/src/webgl/shaders`
> and `client/src/webgl/ui`.

## Legacy Shader Implementations in ViewerCanvas.tsx

### 1. Atmosphere Gradient Shader (Scene Background)

**Location:** `ViewerCanvas.tsx:295-324` (SceneAtmosphere component)

**Purpose:** Creates gradient sky dome background

**Uniforms:**
- `topColor: vec3` - Top color of gradient (#010818)
- `bottomColor: vec3` - Bottom color of gradient (#04142b)
- `offset: float` - Vertical offset (600)
- `exponent: float` - Gradient curve exponent (0.9)

**Vertex Shader:**
```glsl
varying vec3 vWorldPosition;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
```

**Fragment Shader:**
```glsl
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;
varying vec3 vWorldPosition;
void main() {
  float h = normalize(vWorldPosition + offset).y;
  float mixValue = max(pow(max(h, 0.0), exponent), 0.0);
  gl_FragColor = vec4(mix(bottomColor, topColor, mixValue), 1.0);
}
```

**Material Properties:**
- `side: BackSide` - Render inside of sphere
- `depthWrite: false` - Don't write to depth buffer

**Migration Notes:**
- Simple gradient shader, easy to port to direct WebGL
- Can be optimized for monochrome UI (grayscale gradient)
- Consider replacing with solid background for performance

---

### 2. Standard Three.js Materials (Implicit Shaders)

**MeshStandardMaterial** - Used for geometry rendering
- Phong lighting model with PBR
- Supports metalness and roughness
- Three.js built-in shader

**MeshBasicMaterial** - Used for unlit geometry
- No lighting calculations
- Flat color rendering
- Three.js built-in shader

**Migration Strategy:**
- Replace with custom Phong shader for lit geometry
- Replace with custom flat shader for unlit geometry
- Add selection highlighting as uniform parameter
- Add preview mode with transparency

---

## Required Custom Shaders for Phase 3

### 1. Geometry Rendering Shader (Phong Lighting)

**Purpose:** Render solid geometry with lighting and selection highlighting

**Required Uniforms:**
- `modelMatrix: mat4` - Model transform
- `viewMatrix: mat4` - Camera view transform
- `projectionMatrix: mat4` - Perspective projection
- `normalMatrix: mat3` - Normal transform (inverse transpose of model)
- `lightPosition: vec3` - Primary light position
- `lightColor: vec3` - Light color
- `ambientColor: vec3` - Ambient light color
- `materialColor: vec3` - Base material color
- `selectionHighlight: vec3` - Selection highlight color (additive)
- `isSelected: float` - Selection state (0.0 or 1.0)
- `opacity: float` - Material opacity (for preview mode)

**Required Attributes:**
- `position: vec3` - Vertex position
- `normal: vec3` - Vertex normal

**Vertex Shader:**
```glsl
attribute vec3 position;
attribute vec3 normal;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
```

**Fragment Shader:**
```glsl
uniform vec3 lightPosition;
uniform vec3 lightColor;
uniform vec3 ambientColor;
uniform vec3 materialColor;
uniform vec3 selectionHighlight;
uniform float isSelected;
uniform float opacity;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  // Phong lighting
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(lightPosition - vPosition);
  float diff = max(dot(normal, lightDir), 0.0);
  
  vec3 ambient = ambientColor * materialColor;
  vec3 diffuse = diff * lightColor * materialColor;
  vec3 color = ambient + diffuse;
  
  // Add selection highlight
  color += selectionHighlight * isSelected;
  
  gl_FragColor = vec4(color, opacity);
}
```

---

### 2. Line Rendering Shader (Anti-aliased)

**Purpose:** Render polylines and curve tessellations with anti-aliasing

**Required Uniforms:**
- `modelMatrix: mat4`
- `viewMatrix: mat4`
- `projectionMatrix: mat4`
- `lineColor: vec3`
- `lineWidth: float` - Width in pixels
- `resolution: vec2` - Viewport resolution
- `selectionHighlight: vec3`
- `isSelected: float`

**Required Attributes:**
- `position: vec3` - Vertex position
- `nextPosition: vec3` - Next vertex in line (for width calculation)
- `side: float` - Side of line (-1.0 or 1.0)

**Vertex Shader:**
```glsl
attribute vec3 position;
attribute vec3 nextPosition;
attribute float side;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float lineWidth;
uniform vec2 resolution;
varying float vSide;

void main() {
  vec4 currentProj = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  vec4 nextProj = projectionMatrix * viewMatrix * modelMatrix * vec4(nextPosition, 1.0);
  
  vec2 currentScreen = currentProj.xy / currentProj.w * resolution;
  vec2 nextScreen = nextProj.xy / nextProj.w * resolution;
  
  vec2 dir = normalize(nextScreen - currentScreen);
  vec2 normal = vec2(-dir.y, dir.x);
  
  vec2 offset = normal * lineWidth * 0.5 * side;
  vec2 finalScreen = currentScreen + offset;
  
  gl_Position = vec4(finalScreen / resolution * currentProj.w, currentProj.z, currentProj.w);
  vSide = side;
}
```

**Fragment Shader:**
```glsl
uniform vec3 lineColor;
uniform vec3 selectionHighlight;
uniform float isSelected;
varying float vSide;

void main() {
  // Anti-aliasing based on distance from center
  float alpha = 1.0 - smoothstep(0.8, 1.0, abs(vSide));
  
  vec3 color = lineColor + selectionHighlight * isSelected;
  gl_FragColor = vec4(color, alpha);
}
```

---

### 3. Vertex Point Rendering Shader (Instanced)

**Purpose:** Render vertex points as instanced spheres or circles

**Required Uniforms:**
- `modelMatrix: mat4`
- `viewMatrix: mat4`
- `projectionMatrix: mat4`
- `vertexColor: vec3`
- `vertexSize: float` - Size in world units
- `selectionHighlight: vec3`
- `instanceSelected: float[]` - Per-instance selection state

**Required Attributes:**
- `position: vec3` - Sphere mesh vertex
- `instancePosition: vec3` - Instance position (vertex location)
- `instanceIndex: float` - Instance index for selection lookup

**Vertex Shader:**
```glsl
attribute vec3 position;
attribute vec3 instancePosition;
attribute float instanceIndex;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float vertexSize;
varying float vInstanceIndex;

void main() {
  vec3 worldPosition = instancePosition + position * vertexSize;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(worldPosition, 1.0);
  vInstanceIndex = instanceIndex;
}
```

**Fragment Shader:**
```glsl
uniform vec3 vertexColor;
uniform vec3 selectionHighlight;
uniform float instanceSelected[256]; // Max instances, use texture for more
varying float vInstanceIndex;

void main() {
  float isSelected = instanceSelected[int(vInstanceIndex)];
  vec3 color = vertexColor + selectionHighlight * isSelected;
  gl_FragColor = vec4(color, 1.0);
}
```

---

### 4. Preview Geometry Shader (Semi-transparent)

**Purpose:** Render preview geometry during command execution

**Based on:** Geometry rendering shader with modifications

**Additional Uniforms:**
- `previewOpacity: float` - Opacity (0.3-0.5)
- `previewColor: vec3` - Preview tint color

**Fragment Shader Modification:**
```glsl
// ... same as geometry shader but:
gl_FragColor = vec4(color * previewColor, previewOpacity);
```

**Material Properties:**
- Enable alpha blending
- Disable depth write
- Render after solid geometry

---

## Gizmo Shaders

**Current Implementation:** Uses Three.js MeshBasicMaterial and MeshStandardMaterial

**Migration Strategy:**
- Gizmo uses simple flat colors, no complex lighting
- Can use basic flat shader with color uniform
- Selection highlighting via color change (already implemented)
- No custom shaders needed initially

---

## WebGL Shader Compilation Pipeline (Phase 3)

### Shader Manager Class

```typescript
class ShaderManager {
  private gl: WebGLRenderingContext;
  private programs: Map<string, WebGLProgram>;
  
  compileShader(source: string, type: GLenum): WebGLShader;
  linkProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram;
  getProgram(name: string): WebGLProgram;
  setUniforms(program: WebGLProgram, uniforms: Record<string, any>): void;
  dispose(): void;
}
```

### Shader Library Structure

```
client/src/shaders/
  ├── geometry.vert.ts       // Geometry vertex shader
  ├── geometry.frag.ts       // Geometry fragment shader
  ├── line.vert.ts           // Line vertex shader
  ├── line.frag.ts           // Line fragment shader
  ├── vertex.vert.ts         // Vertex point shader
  ├── vertex.frag.ts         // Vertex point fragment shader
  ├── preview.frag.ts        // Preview fragment shader
  └── atmosphere.frag.ts     // Background gradient shader
```

**Note:** Store as TypeScript template literals for type safety and IDE support

---

## Migration Checklist

### Phase 3 Shader Tasks:
- [ ] Create shader manager class for compilation/linking
- [ ] Extract atmosphere shader to separate files
- [ ] Implement custom Phong lighting shader
- [ ] Implement anti-aliased line rendering shader
- [ ] Implement instanced vertex point shader
- [ ] Implement preview geometry shader
- [ ] Create uniform management system
- [ ] Test shader compilation and error handling
- [ ] Verify selection highlighting works
- [ ] Verify preview mode works
- [ ] Performance test vs Three.js materials

### Monochrome UI Adaptations:
- [ ] Convert atmosphere gradient to grayscale
- [ ] Define monochrome material palette (shades of gray)
- [ ] Use subtle highlights for selection (light gray on dark gray)
- [ ] Test visual clarity with grayscale only

---

## Performance Considerations

**Shader Switching:**
- Minimize shader program changes per frame
- Batch geometry by shader type
- Use uniform updates for per-object state (selection, color)

**Uniform Updates:**
- Cache uniform locations
- Only update changed uniforms
- Use uniform buffers for shared data (camera, lights)

**Instancing:**
- Use instanced rendering for vertices (many small spheres)
- Store per-instance data in attributes or textures
- Reduces draw calls from N to 1 for N vertices

---

## References

- Current implementation: `client/src/components/WebGLViewerCanvas.tsx`
- Three.js shader reference: https://threejs.org/docs/#api/en/materials/ShaderMaterial
- WebGL shader compilation: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
- Per `docs/lingua_conventions.md:60-69` - Explicit WebGL control patterns

## Update Protocol

- Treat shader sources in `client/src/webgl/shaders` as the source of truth.
- When adding or removing shader programs, update this inventory with new IDs and usage.
- Mark legacy shader notes explicitly to avoid confusion with current pipelines.

## Validation Checklist

- All shaders compile on WebGL2 with no warnings in supported browsers.
- Uniforms and attributes match buffer layouts in `renderAdapter`.
- Selection/hover variants render with identical depth settings to base shaders.

## Implementation Anchors

- `client/src/webgl/WebGLRenderer.ts`
- `client/src/webgl/shaders`
- `client/src/geometry/renderAdapter.ts`
