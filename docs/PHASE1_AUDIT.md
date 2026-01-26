# Phase 1 Audit: WebGL + ETO.forms Architecture Foundation

## Objective
Audit current Three.js and ReactFlow usage to establish migration path for total WebGL and ETO.forms overhaul per architectural documentation.

## Current Three.js Usage Analysis

### ViewerCanvas.tsx Dependencies

**React Three Fiber (R3F) Components:**
- `Canvas` - R3F wrapper around WebGL context
- `useFrame` - Animation loop hook
- `useThree` - Access to Three.js scene/camera/renderer
- `OrbitControls` - Camera control component from @react-three/drei
- `Edges`, `Html`, `Line` - Helper components from @react-three/drei

**Direct Three.js Imports:**
- Geometry: `BufferGeometry`, `SphereGeometry`, `PlaneGeometry`
- Materials: `ShaderMaterial`, `MeshBasicMaterial`, `MeshStandardMaterial`
- Math: `Vector3`, `Matrix4`, `Plane`, `Box3`, `Color`
- Rendering: `MOUSE`, `FrontSide`, `BackSide`, `DoubleSide`, `FogExp2`
- Scene: `Mesh`, `PerspectiveCamera`
- Utilities: `CatmullRomCurve3`, `Float32BufferAttribute`, `Intersection`

### Migration Strategy for ViewerCanvas

**Keep Three.js for:**
1. **Math utilities** - Vector3, Matrix4, Plane, Box3 (proven, optimized)
2. **Raycasting** - Intersection testing (complex algorithm, well-tested)
3. **Curve evaluation** - CatmullRomCurve3 for spline math

**Replace with Direct WebGL:**
1. **Canvas wrapper** - Replace R3F `<Canvas>` with raw `<canvas>` element
2. **Animation loop** - Replace `useFrame` with `requestAnimationFrame`
3. **Scene management** - Replace R3F scene graph with custom render queue
4. **Buffer management** - Direct WebGL buffer creation/updates instead of BufferGeometry wrappers
5. **Shader compilation** - Direct WebGL shader program compilation and uniform management
6. **Camera controls** - Custom orbit/pan implementation replacing OrbitControls component

**Custom Implementation Required:**
1. WebGL context initialization and state management
2. Shader program compilation pipeline
3. Buffer allocation and update system
4. Render queue with material batching
5. Custom camera controller with session-based interaction
6. Direct uniform updates for selection highlighting

### Current Shader Usage

**Location:** Need to audit for existing custom shaders in ViewerCanvas
- Selection highlighting shader
- Preview geometry shader (semi-transparent)
- Line rendering shader (anti-aliased)
- Phong lighting shader for surfaces

**Action:** Extract shader code and document uniform/attribute requirements

## Current ReactFlow Usage Analysis

### WorkflowSection.tsx Dependencies

**ReactFlow Components:**
- `ReactFlow` - Main graph editor component
- `Controls` - Zoom/pan UI controls
- `ConnectionLineType` - Edge routing style
- `MarkerType` - Arrow markers for edges
- `ReactFlowInstance` - API for programmatic control

**Custom Node Types:**
- `GeometryReferenceNode`
- `PointNode`
- `PolylineNode`
- `SurfaceNode`

**Store Integration:**
- `workflow.nodes` - Node data from Zustand
- `workflow.edges` - Edge data from Zustand
- `onNodesChange`, `onEdgesChange`, `onConnect` - Store actions
- `addNode`, `pruneWorkflow`, `undoWorkflow` - Workflow operations

### Migration Strategy for Numerica

**Preserve (Data Model):**
1. Node/edge data structures in Zustand store
2. Workflow evaluation logic (pull-based lazy)
3. Node type registry and compute functions
4. Port validation and type checking
5. Undo/redo integration

**Replace with ETO.forms Canvas:**
1. **Canvas rendering** - Immediate-mode 2D canvas instead of DOM nodes
2. **Manual hit testing** - Geometric calculations for node/port/edge picking
3. **Custom drawing** - Layered rendering (BG → Connections → Nodes → Overlays)
4. **View transform** - Canvas matrix transforms for pan/zoom
5. **Interaction handlers** - Direct pointer events with manual dispatch

### ETO.forms Architecture Specification

Per `docs/specificity_conventions.md:70-80` and `docs/subsystems_guide.md:185-194`:

**Rendering Pipeline:**
```
1. Clear canvas
2. Apply view transform (pan/zoom matrix)
3. Draw background grid
4. Draw connections (bezier curves between ports)
5. Draw nodes (rounded rects with content)
6. Draw overlays (selection highlights, drag preview)
7. Reset transform for UI elements
```

**Hit Testing:**
```
1. Transform pointer coordinates by inverse view matrix
2. Test nodes (point-in-rect for body, point-in-circle for ports)
3. Test edges (distance-to-bezier curve)
4. Return hit target with priority (port > node > edge > background)
```

**Interaction Sessions:**
```
- Node drag: capture start position, update on move, commit to store on release
- Edge creation: start from source port, preview to cursor, validate on target port
- Pan: middle-drag updates view transform
- Zoom: wheel updates scale factor around cursor position
```

## Geometry Kernel Integration

### Current Kernel Implementation

**Location:** `client/src/geometry/`
- `math.ts` - Vector operations (add, sub, dot, cross, normalize, etc.)
- `curves.ts` - Polyline interpolation, closed loop handling
- `mesh.ts` - Tessellation for primitives (box, sphere, cylinder, torus, extrude, loft, surface)
- `transform.ts` - Matrix operations, basis computation, transformations

**Kernel Status:**
- ✅ Basic vector math implemented
- ✅ Polyline operations functional
- ✅ Primitive mesh generation working
- ❌ NURBS curve evaluation (uses Three.js CatmullRomCurve3 as placeholder)
- ❌ NURBS surface evaluation not implemented
- ❌ Boolean operations not implemented
- ❌ Advanced offsetting not implemented

### Kernel Expansion Plan

Per `docs/subsystems_guide.md:3-46`:

**Phase 4 Priorities:**
1. **NURBS Curve Math**
   - Cox-de Boor recursion for basis functions
   - Knot vector validation and manipulation
   - Curve evaluation at parameter t
   - Derivative computation for tangents/curvature
   - Knot insertion, degree elevation, splitting

2. **NURBS Surface Math**
   - Tensor product basis evaluation
   - Surface evaluation at (u,v) parameters
   - Partial derivatives for normals
   - Isoparametric curve extraction
   - Trimming with parameter-space boundaries

3. **Boolean Operations**
   - Polyline intersection/union/difference
   - Plane-curve intersection
   - Surface-surface intersection (advanced)

4. **Tessellation Integration**
   - Adaptive curve tessellation (curvature-based)
   - Quadtree surface subdivision
   - Screen-space error metrics
   - LOD caching and invalidation

## Implementation Sequence

### Phase 1 Deliverables (This Document)
- ✅ Three.js usage audit complete
- ✅ ReactFlow usage audit complete
- ✅ Migration strategies defined
- ✅ ETO.forms spec documented
- ⏳ Shader inventory (next step)

### Phase 2: ETO.forms Canvas for Numerica
**Priority: HIGH** - Replace ReactFlow first to establish canvas rendering patterns

**Steps:**
1. Create `NumericalCanvas.tsx` with 2D canvas element
2. Implement view transform (pan/zoom with matrix)
3. Implement node rendering (rounded rects, text, ports)
4. Implement connection rendering (bezier curves)
5. Implement manual hit testing
6. Wire interaction handlers to Zustand store
7. Remove ReactFlow dependency
8. Test workflow evaluation unchanged

**Success Criteria:**
- All existing workflow features functional
- No ReactFlow dependency
- Performance improvement for large graphs
- Monochrome aesthetic applied

### Phase 3: Direct WebGL for ViewerCanvas
**Priority: HIGH** - Remove R3F abstractions after canvas patterns established

**Steps:**
1. Create raw `<canvas>` element with WebGL context
2. Implement shader compilation pipeline
3. Implement buffer management system
4. Implement custom camera controller
5. Port existing shaders to direct WebGL
6. Implement render queue with batching
7. Remove R3F/drei dependencies
8. Test all viewport features (selection, gizmo, box select)

**Success Criteria:**
- Full WebGL control maintained
- Three.js reduced to math utilities only
- All rendering features functional
- Performance maintained or improved

### Phase 4: Geometry Kernel Expansion
**Priority: HIGH** - Build under custom renderers

**Steps:**
1. Implement NURBS curve evaluation (Cox-de Boor)
2. Implement NURBS surface evaluation
3. Implement adaptive tessellation
4. Implement Boolean operations
5. Integrate with WebGL renderer
6. Test with complex models

**Success Criteria:**
- NURBS math fully custom
- No external CAD library dependencies
- Tessellation quality matches or exceeds current
- All geometry types render correctly

## Next Actions

1. **Extract and document existing shaders** from ViewerCanvas
2. **Create NumericalCanvas.tsx prototype** with basic rendering
3. **Begin Phase 2 implementation** per roadmap

## References

- `docs/specificity_architecture.md` - System architecture and integration
- `docs/specificity_conventions.md` - Code patterns and standards
- `docs/subsystems_guide.md` - Detailed subsystem implementations
- `docs/ai_agent_guide.md` - Development guidance and patterns
