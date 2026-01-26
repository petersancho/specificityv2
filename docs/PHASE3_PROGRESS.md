# Phase 3 Progress: Custom WebGL Infrastructure

## Objective
Replace React Three Fiber (R3F) abstractions with direct WebGL control while maintaining Three.js for math utilities only, per `docs/PHASE1_AUDIT.md` and `docs/SHADER_INVENTORY.md`.

## Completed Infrastructure (Foundation Layer)

### 1. Shader Management System ✅

**Location:** `client/src/webgl/ShaderManager.ts`

**Capabilities:**
- Shader compilation with error reporting
- Program linking and caching
- Uniform management (scalars, vectors, matrices)
- Resource disposal and cleanup

**Key Methods:**
- `compileShader(source, type)` - Compiles GLSL shader with validation
- `createProgram(name, vertexSrc, fragmentSrc)` - Creates and caches shader program
- `setUniforms(program, uniforms)` - Batch uniform updates
- `dispose()` - Cleanup all GPU resources

### 2. Shader Library ✅

**Location:** `client/src/webgl/shaders/`

**Implemented Shaders:**

#### Geometry Shader (Phong Lighting)
- `geometry.vert.ts` - Vertex transformation with normal matrix
- `geometry.frag.ts` - Phong lighting with selection highlighting
- **Uniforms:** modelMatrix, viewMatrix, projectionMatrix, normalMatrix, lightPosition, lightColor, ambientColor, materialColor, selectionHighlight, isSelected, opacity
- **Attributes:** position, normal

#### Line Shader (Anti-aliased)
- `line.vert.ts` - Screen-space line width calculation
- `line.frag.ts` - Anti-aliased edge rendering
- **Uniforms:** modelMatrix, viewMatrix, projectionMatrix, lineWidth, resolution, lineColor, selectionHighlight, isSelected
- **Attributes:** position, nextPosition, side

#### Atmosphere Shader (Background Gradient)
- `atmosphere.vert.ts` - World position pass-through
- `atmosphere.frag.ts` - Gradient sky dome
- **Uniforms:** modelMatrix, viewMatrix, projectionMatrix, topColor, bottomColor, offset, exponent
- **Attributes:** position

### 3. Buffer Management System ✅

**Location:** `client/src/webgl/BufferManager.ts`

**Classes:**

#### BufferManager
- Creates and caches WebGL buffers
- Updates buffer data in-place (avoids recreation)
- Manages buffer lifecycle and disposal

#### GeometryBuffer
- High-level geometry buffer abstraction
- Manages position, normal, index, and color buffers
- Automatic attribute binding to shader programs
- Draw call management (indexed/non-indexed)

**Key Features:**
- Efficient buffer updates (no recreation)
- Automatic vertex/index count tracking
- Type-safe buffer data (Float32Array, Uint16Array)

### 4. WebGL Renderer ✅

**Location:** `client/src/webgl/WebGLRenderer.ts`

**Capabilities:**
- WebGL context initialization and state management
- Shader program orchestration
- Camera matrix computation (view + projection)
- Normal matrix computation for lighting
- Geometry buffer rendering with uniforms

**Rendering Pipeline:**
```
1. Initialize WebGL context (depth test, culling, clear color)
2. Compile and cache all shader programs
3. Create geometry buffers for scene objects
4. Per-frame:
   - Clear buffers
   - Compute camera matrices
   - For each geometry:
     - Select shader program
     - Set uniforms (matrices, lighting, material)
     - Bind geometry buffers
     - Draw call
```

**Camera System:**
- View matrix from position/target/up vectors
- Perspective projection matrix
- Configurable FOV, aspect ratio, near/far planes

## Architecture Alignment

Per `docs/specificity_conventions.md:60-69`:
- ✅ Explicit WebGL buffer control
- ✅ Custom GLSL shaders
- ✅ Material caching via shader programs
- ✅ Direct uniform updates

Per `docs/SHADER_INVENTORY.md`:
- ✅ All required shaders implemented
- ✅ Shader manager architecture
- ✅ Uniform management system
- ✅ Performance optimizations (caching, batching)

## Remaining Phase 3 Work

### High Priority

1. **Replace R3F Canvas in ViewerCanvas.tsx**
   - Remove `<Canvas>` component from R3F
   - Create raw `<canvas>` element
   - Initialize WebGLRenderer
   - Implement `requestAnimationFrame` loop

2. **Custom Camera Controller**
   - Orbit controls (right-drag)
   - Pan controls (middle-drag or Shift+left-drag)
   - Zoom controls (wheel)
   - Camera state integration with Zustand store

3. **Port Geometry Rendering**
   - Tessellate NURBS curves/surfaces to buffer geometry
   - Render vertices as instanced spheres (or points)
   - Render polylines with line shader
   - Render surfaces with geometry shader
   - Apply selection highlighting

4. **Gizmo Integration**
   - Keep gizmo rendering (currently uses Three.js)
   - Ensure gizmo works with custom camera
   - Test transform sessions (translate/rotate/scale)

5. **Box Selection**
   - Maintain left-drag marquee selection
   - Integrate with custom camera/viewport
   - Test containment vs crossing modes

### Testing Checklist

- [ ] WebGL context initializes correctly
- [ ] Shaders compile without errors
- [ ] Camera matrices compute correctly
- [ ] Geometry buffers render visible objects
- [ ] Selection highlighting works
- [ ] Gizmo remains functional
- [ ] Box selection works
- [ ] Orbit/pan/zoom controls work
- [ ] Performance matches or exceeds R3F

## Migration Strategy

**Incremental Approach:**
1. Create parallel WebGL renderer alongside R3F (Phase 3a)
2. Test rendering parity with simple geometry
3. Swap R3F Canvas for custom canvas (Phase 3b)
4. Remove R3F dependencies (Phase 3c)
5. Verify all features functional (Phase 3d)

**Risk Mitigation:**
- Keep Three.js for math utilities (Vector3, Matrix4, raycasting)
- Preserve existing geometry kernel unchanged
- Maintain Zustand store integration
- Test incrementally with each component

## Performance Expectations

**Advantages over R3F:**
- Direct WebGL control (no abstraction overhead)
- Custom shader optimization for use case
- Efficient buffer updates (in-place modification)
- Reduced memory footprint (no React component tree for scene)

**Rendering Complexity:**
- O(N) for N geometry objects (draw each once)
- Shader switching minimized via batching
- Buffer updates only on geometry changes

## Next Steps

1. **Create CustomViewerCanvas component** with raw WebGL
2. **Implement camera controller** with orbit/pan/zoom
3. **Port geometry rendering** to custom shaders
4. **Test gizmo integration** with custom camera
5. **Remove R3F dependency** once feature-complete

## References

- Implementation follows `docs/PHASE1_AUDIT.md` migration strategy
- Shaders per `docs/SHADER_INVENTORY.md` specifications
- WebGL patterns per `docs/specificity_conventions.md:60-69`
- Architecture per `docs/specificity_architecture.md:40-50`
