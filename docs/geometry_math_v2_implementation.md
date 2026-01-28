# Geometric Mathematics Implementation Guide V2

## Architectural Modularity and File Organization

The geometry stack is split into two layers with clean boundaries:

- `client/src/math/` holds pure math primitives with no dependencies on geometry records or application state.
- `client/src/geometry/` implements geometric algorithms that operate on the discriminated geometry types in `client/src/types.ts`.

### Core Module Structure

**Vector Operations Module** (`client/src/math/vector.ts`)

Implementation outline:
- Exports: `add`, `subtract`, `scale`, `dot`, `cross`, `length`, `normalize`, `distance`, `lerp`.
- Inputs and outputs use `Vec3` from `client/src/types.ts`.
- `normalize` uses an `EPSILON` guard and falls back to `[0, 0, 1]` for degenerate vectors.

**Matrix Operations Module** (`client/src/math/matrix.ts`)

Implementation outline:
- 4x4 matrices stored as column-major `Float32Array`.
- Exports: `identity`, `multiply`, `translation`, `scaling`, `rotationFromQuaternion`.
- Transform helpers: `transformPoint`, `transformDirection`.
- Rigid inverse helper: `invertRigid` for rotation + translation only.

**Quaternion Operations Module** (`client/src/math/quaternion.ts`)

Implementation outline:
- Quaternion representation: `[x, y, z, w]`.
- Exports: `identity`, `fromAxisAngle`, `multiply`, `conjugate`, `slerp`, `rotateVector`.
- `slerp` uses shortest-path handling and linear fallback for near-colinear cases.

### Geometry Module Structure

**Curve Evaluation Module** (`client/src/geometry/curveEval.ts`)

Implementation outline:
- Basis evaluation: Cox-de Boor recursion for B-spline basis functions.
- `evaluateAt(curve, u)` returns point on curve for rational and non-rational cases.
- `evaluateTangent(curve, u)` uses derivative basis functions and returns an unnormalized tangent.
- `tessellate(curve, tolerance)` adaptively samples by curvature and returns a polyline.

**Surface Evaluation Module** (`client/src/geometry/surfaceEval.ts`)

Implementation outline:
- Tensor-product evaluation for NURBS surfaces.
- `evaluateAt(surface, u, v)` returns position.
- `evaluateNormal(surface, u, v)` computes partials and normalizes the cross product.
- `tessellate(surface, tolerance)` returns `positions`, `normals`, and `indices` for WebGL.

**Transformation Module** (`client/src/geometry/transform.ts`)

Implementation outline:
- `applyTransform(geometry, matrix)` handles each geometry type.
- Vertices, polylines, curve control points, and surface control points are transformed with `transformPoint`.
- Returns new geometry records without mutation.

**Hit Testing Module** (`client/src/geometry/hitTest.ts`)

Implementation outline:
- Defines `HitResult` with distance, position, optional normals, and component info.
- Ray intersection for vertices, polylines, NURBS curves, surfaces, and meshes.
- Uses tolerance in screen or world space depending on selection mode.
- Returns the closest hit for selection routing.

## Click Interaction Workflow Architecture

The ViewerCanvas is the interaction orchestrator. It routes pointer events into raycasts, hit testing, and command or selection actions without mutating geometry directly.

### Pointer Event Flow in ViewerCanvas

Implementation outline:
- Register `pointerdown`, `pointermove`, `pointerup`, and `contextmenu` listeners on the canvas.
- Use pointer capture to maintain drag sessions.
- Convert screen coordinates to a world ray using camera matrices.
- Route by button and modifiers: left for selection/command, right for orbit/box select, middle for pan.
- When a command is active, delegate to the command interaction pipeline before default selection.

### Screen-to-World Ray Calculation

Implementation outline:
- Convert screen coordinates to NDC.
- Build view and projection matrices from camera state.
- Invert view-projection to unproject near and far points.
- Construct ray origin at near point and direction from near to far.

### Hit Testing Module

Implementation outline:
- Call type-specific ray tests based on geometry type.
- Use object or component selection rules depending on `selectionMode`.
- Return nearest hit by distance along ray.
- Store hover hit and selection hit separately for UI feedback.

### Selection Management

Implementation outline:
- Object selection stores geometry ids only.
- Component selection stores geometry id plus component type and index.
- Multi-select toggles with modifier keys.
- Selection changes flow through the Zustand store to preserve undo/redo.

### Box Selection Implementation

Implementation outline:
- Capture drag rectangle in screen space.
- Determine crossing vs containment by drag direction.
- Project rectangle to world-space bounds using the construction plane.
- Select geometry whose bounds intersect (crossing) or are contained (containment).

## Numerica Computational Graph Integration

### Node Type System

Implementation outline:
- Node types are defined in a registry with categories, ports, and parameter schemas.
- Ports include type constraints for evaluation and for connection validation.
- Node definitions drive both UI rendering and evaluation behavior.

### Graph Evaluation Engine

Implementation outline:
- Pull-based evaluation with caching.
- Dirty flag propagation on parameter change or upstream updates.
- Cycle detection and error reporting.
- Evaluation outputs are stored per node for downstream reuse.

### Geometric Node Implementations

Implementation outline:
- Geometry creation nodes mirror Roslyn commands.
- Transform nodes accept geometry ids and output transformed geometry.
- Evaluation outputs map back into the store through `geometryId` bindings.

## Store Architecture and State Management

### State Schema

Implementation outline:
- Geometry slice: geometry records and scene nodes.
- Selection slice: object and component selection.
- Camera slice: camera position, target, and interaction flags.
- Workflow slice: nodes, edges, and evaluation cache.
- Interaction slice: active command, gizmo session, and drag state.
- History slice: undo/redo snapshots for modeler and workflow.

### Geometric Actions Implementation

Implementation outline:
- Store actions accept inputs, validate them, and apply changes immutably.
- Geometry creation uses kernel helpers, then updates scene nodes and selection.
- Transforms record history before commit to ensure undo correctness.

## Rendering Pipeline Integration

### Geometry to Buffer Conversion

Implementation outline:
- Convert kernel geometry to renderable buffers in `renderAdapter`.
- Polylines become line buffers, NURBS curves and surfaces are tessellated.
- Meshes generate edge lists for outline rendering.
- Display modes orchestrate shaded, edges, ghosted, and wireframe passes.

