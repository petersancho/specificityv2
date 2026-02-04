# Geometry Kernel Reference

**Purpose:** Complete reference for geometry kernel operations, types, and patterns. Use this when developing Numerica nodes that work with geometry.

**Last Updated:** 2026-01-31

---

## Overview

The geometry kernel provides pure functions for creating, transforming, analyzing, and converting geometric data. All functions are side-effect free and return new objects rather than mutating inputs.

### Core Principles

1. **Immutability** - Functions return new geometry; never mutate inputs
2. **Plain data** - Geometry is stored as TypeScript records, not Three.js objects
3. **Discriminated unions** - The `type` field determines geometry variant
4. **GPU-ready output** - RenderMesh format is optimized for WebGL

---

## Geometry Types

### RenderMesh (GPU Format)

The fundamental mesh representation for rendering:

```typescript
type RenderMesh = {
  positions: number[];  // Flat [x,y,z, x,y,z, ...]
  normals: number[];    // Flat [nx,ny,nz, ...]
  uvs: number[];        // Flat [u,v, u,v, ...]
  indices: number[];    // Triangle indices [i0,i1,i2, ...]
  colors?: number[];    // Optional vertex colors [r,g,b, ...]
};
```

**Properties:**
- Vertex count: `positions.length / 3`
- Triangle count: `indices.length / 3`
- All arrays are flat for GPU buffer upload

### Vec3 (Point/Vector)

```typescript
type Vec3 = { x: number; y: number; z: number };
```

Used for positions, directions, normals, and offsets.

### NURBSCurve

```typescript
type NURBSCurve = {
  controlPoints: Vec3[];
  knots: number[];
  degree: number;
  weights?: number[];  // Optional for rational curves
};
```

**Constraints:**
- `knots.length = controlPoints.length + degree + 1`
- Knot values must be non-decreasing
- Degree typically 1-3; clamped to valid range

### NURBSSurface

```typescript
type NURBSSurface = {
  controlPoints: Vec3[][];  // 2D grid [u][v]
  knotsU: number[];
  knotsV: number[];
  degreeU: number;
  degreeV: number;
  weights?: number[][];
};
```

### BRepData (Boundary Representation)

```typescript
type BRepData = {
  vertices: { id: string; position: Vec3 }[];
  edges: {
    id: string;
    curve: BRepCurve;
    vertices: [string, string];
  }[];
  loops: {
    id: string;
    edges: { edgeId: string; reversed: boolean }[];
  }[];
  faces: {
    id: string;
    surface: BRepSurface;
    loops: string[];
    reversed?: boolean;
  }[];
  solids: { id: string; shells: string[] }[];
};
```

**Key concepts:**
- Topology (faces, edges, loops) + Geometry (curves, surfaces)
- Edges reference curves; faces reference surfaces
- Loops define face boundaries with edge orientation

### PlaneDefinition

```typescript
type PlaneDefinition = {
  origin: Vec3;
  normal: Vec3;
  xAxis: Vec3;
  yAxis: Vec3;
};
```

Used for construction planes, projection, and 2D operations.

---

## Source Files

| File | Purpose | Key Exports |
|------|---------|-------------|
| `mesh.ts` | Mesh creation and operations | `generatePrimitiveMesh`, `computeVertexNormals`, `generateLoftMesh`, `generateExtrudeMesh` |
| `nurbs.ts` | NURBS curve/surface math | `createNurbsCurveFromPoints`, `interpolateNurbsCurve`, `evaluateCurve`, `evaluateSurface` |
| `brep.ts` | B-Rep topology operations | `createBRepBox`, `createBRepCylinder`, `createBRepSphere`, `tessellateBRepToMesh`, `brepFromMesh` |
| `tessellation.ts` | Adaptive tessellation | `tessellateCurveAdaptive`, `tessellateSurfaceAdaptive` |
| `meshTessellation.ts` | Advanced mesh ops | `subdivideLoop`, `subdivideCatmullClark`, `decimateMesh`, `meshBoolean` |
| `curves.ts` | Curve utilities | `resampleByArcLength`, `interpolatePolyline` |
| `arc.ts` | Arc/circle creation | `createCircleNurbs`, `createArcNurbs` |
| `math.ts` | Vector/plane math | `add`, `cross`, `normalize`, `dot`, `distance`, `buildPlaneFromNormal` |
| `transform.ts` | Transform matrices | `applyTransform`, `composeTransform` |
| `hitTest.ts` | Raycasting/picking | `hitTestMesh`, `rayTriangleIntersection` |
| `booleans.ts` | 2D boolean ops | `offsetPolyline2D` |
| `physical.ts` | Physical properties | `computeMeshVolume`, `computeCentroid`, `computeInertiaTensor` |
| `renderAdapter.ts` | GPU buffer management | `GeometryRenderAdapter` |

---

## Mesh Operations

### Primitive Generation

```typescript
// Generate a primitive mesh by kind
generatePrimitiveMesh(params: PrimitiveParams): RenderMesh

// Specific primitives with more control
generateBoxMesh(params: BoxParams, segments: number): RenderMesh
generateSphereMesh(params: SphereParams, widthSegments: number, heightSegments: number): RenderMesh
generateCylinderMesh(params: CylinderParams, radialSegments: number): RenderMesh
```

**PrimitiveKind values:** `"box"`, `"sphere"`, `"cylinder"`, `"torus"`, `"capsule"`, `"tetrahedron"`, `"octahedron"`, `"icosahedron"`, `"dodecahedron"`, etc.

### Surface Generation

```typescript
// Loft through section curves
generateLoftMesh(sections: Vec3[][], closed: boolean): RenderMesh

// Extrude profile along direction
generateExtrudeMesh(profile: Vec3[], direction: Vec3, caps: boolean): RenderMesh

// Pipe along path
generatePipeMesh(path: Vec3[], radius: number, segments: number): RenderMesh
```

### Mesh Analysis

```typescript
// Compute area of all triangles
computeMeshArea(positions: number[], indices: number[]): number

// Compute per-vertex normals (weighted by face area)
computeVertexNormals(positions: number[], indices: number[]): number[]
```

### Mesh Transformation

```typescript
// Transform mesh by origin and basis vectors
transformMesh(
  mesh: RenderMesh,
  origin: Vec3,
  basis: { xAxis: Vec3; yAxis: Vec3; normal: Vec3 }
): RenderMesh
```

---

## NURBS Operations

### Curve Creation

```typescript
// Create curve with control points (approximating)
createNurbsCurveFromPoints(
  points: Vec3[],
  degree: number,
  closed?: boolean
): NURBSCurve

// Create curve passing through points (interpolating)
interpolateNurbsCurve(
  points: Vec3[],
  degree: number,
  options?: { parameterization?: "uniform" | "chord" | "centripetal" }
): NURBSCurve

// Create circular arc
createArcNurbs(
  plane: PlaneDefinition,
  center: Vec3,
  radius: number,
  startAngle: number,
  endAngle: number
): NURBSCurve

// Create full circle
createCircleNurbs(
  plane: PlaneDefinition,
  center: Vec3,
  radius: number
): NURBSCurve
```

### Curve Evaluation

```typescript
// Evaluate point at parameter t ∈ [0, 1]
evaluateCurve(curve: NURBSCurve, t: number): Vec3

// Evaluate tangent at parameter t
evaluateCurveTangent(curve: NURBSCurve, t: number): Vec3
```

### Surface Evaluation

```typescript
// Evaluate point at parameters (u, v) ∈ [0, 1]²
evaluateSurface(surface: NURBSSurface, u: number, v: number): Vec3

// Evaluate normal at parameters (u, v)
evaluateSurfaceNormal(surface: NURBSSurface, u: number, v: number): Vec3
```

---

## Tessellation

### Curve Tessellation

```typescript
// Adaptive tessellation based on curvature
tessellateCurveAdaptive(
  curve: NURBSCurve,
  tolerance?: number
): { points: Vec3[]; parameters: number[] }
```

**Algorithm:** Recursively subdivide until screen-space error < tolerance

### Surface Tessellation

```typescript
// Adaptive surface tessellation
tessellateSurfaceAdaptive(
  surface: NURBSSurface,
  tolerance?: number
): {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}
```

---

## B-Rep Operations

### Primitive B-Reps

```typescript
// Create B-Rep box with topology
createBRepBox(
  width: number,
  height: number,
  depth: number,
  center: Vec3
): BRepData

// Create B-Rep cylinder
createBRepCylinder(
  radius: number,
  height: number,
  center: Vec3
): BRepData

// Create B-Rep sphere
createBRepSphere(
  radius: number,
  center: Vec3
): BRepData
```

### Conversion

```typescript
// B-Rep to mesh (for rendering)
tessellateBRepToMesh(brep: BRepData): RenderMesh

// Mesh to B-Rep (topological reconstruction)
brepFromMesh(mesh: RenderMesh): BRepData
```

**Note:** Mesh→B-Rep conversion is approximate and may lose precision.

---

## Advanced Mesh Operations

### Subdivision

```typescript
// Catmull-Clark subdivision (smoothing)
subdivideCatmullClark(mesh: TessellationMesh, iterations: number): TessellationMesh

// Loop subdivision (triangle meshes)
subdivideLoop(mesh: TessellationMesh, iterations: number): TessellationMesh

// Linear subdivision (no smoothing)
subdivideLinear(mesh: TessellationMesh, iterations: number): TessellationMesh

// Adaptive subdivision based on edge length
subdivideAdaptive(mesh: TessellationMesh, maxEdgeLength: number): TessellationMesh
```

### Mesh Repair and Optimization

```typescript
// Repair non-manifold geometry
repairMesh(mesh: TessellationMesh): TessellationMesh

// Reduce triangle count
decimateMesh(mesh: TessellationMesh, targetRatio: number): TessellationMesh

// Quad-dominant remeshing
quadDominantRemesh(mesh: TessellationMesh, targetEdgeLength: number): TessellationMesh
```

### Mesh Booleans

```typescript
// Boolean operations on meshes
meshBoolean(
  meshA: TessellationMesh,
  meshB: TessellationMesh,
  operation: "union" | "difference" | "intersection"
): TessellationMesh
```

### Face Operations

```typescript
// Inset faces (shrink toward center)
insetFaces(mesh: TessellationMesh, distance: number, faceIndices?: number[]): TessellationMesh

// Extrude faces along normals
extrudeFaces(mesh: TessellationMesh, distance: number, faceIndices?: number[]): TessellationMesh

// Create dual mesh (faces become vertices)
dualMesh(mesh: TessellationMesh): TessellationMesh
```

---

## Vector Math

### Basic Operations

```typescript
// Vector addition
add(a: Vec3, b: Vec3): Vec3

// Vector subtraction
sub(a: Vec3, b: Vec3): Vec3

// Scalar multiplication
scale(v: Vec3, s: number): Vec3

// Dot product
dot(a: Vec3, b: Vec3): number

// Cross product
cross(a: Vec3, b: Vec3): Vec3

// Length/magnitude
length(v: Vec3): number

// Normalize to unit length
normalize(v: Vec3): Vec3

// Distance between points
distance(a: Vec3, b: Vec3): number
```

### Plane Operations

```typescript
// Build plane from origin and normal
buildPlaneFromNormal(origin: Vec3, normal: Vec3): PlaneDefinition

// Project 3D point to plane (returns 2D)
projectPointToPlane(point: Vec3, plane: PlaneDefinition): { u: number; v: number }

// Unproject 2D point from plane (returns 3D)
unprojectPointFromPlane(uv: { u: number; v: number }, plane: PlaneDefinition): Vec3

// Compute best-fit plane for points
computeBestFitPlane(points: Vec3[]): PlaneDefinition
```

---

## Physical Properties

```typescript
// Compute mesh volume (signed, assumes closed)
computeMeshVolume(positions: number[], indices: number[]): number

// Compute centroid (center of mass)
computeCentroid(positions: number[], indices: number[]): Vec3

// Compute inertia tensor
computeInertiaTensor(
  positions: number[],
  indices: number[],
  density: number
): { Ixx: number; Iyy: number; Izz: number; Ixy: number; Ixz: number; Iyz: number }

// Volume and centroid together (efficient)
computeMeshVolumeAndCentroid(
  positions: number[],
  indices: number[]
): { volume_m3: number; centroid: Vec3 }
```

---

## Patterns for Node Development

### Reading Geometry in Compute Functions

```typescript
compute: (args) => {
  const { inputs, parameters, context } = args;
  
  // Get geometry ID from input
  const geomId = inputs.geometry as string;
  
  // Look up geometry record
  const geometry = context.geometryById.get(geomId);
  if (!geometry) return null;
  
  // Access mesh based on geometry type
  let mesh: RenderMesh;
  if (geometry.type === "mesh") {
    mesh = geometry.mesh;
  } else if ("mesh" in geometry && geometry.mesh) {
    mesh = geometry.mesh;
  } else {
    // Tessellate if needed
    mesh = tessellateGeometry(geometry);
  }
  
  // Use the mesh...
}
```

### Creating New Geometry

```typescript
compute: (args) => {
  const { parameters, context } = args;
  
  // Generate mesh
  const mesh = generateBoxMesh({
    width: toNumber(parameters.width, 1),
    height: toNumber(parameters.height, 1),
    depth: toNumber(parameters.depth, 1),
  }, 1);
  
  // Create geometry ID
  const geometryId = parameters.geometryId as string ?? `box-${context.nodeId}`;
  
  // Return outputs (store integration happens elsewhere)
  return {
    geometry: geometryId,
    mesh,
    volume: computeMeshVolume(mesh.positions, mesh.indices),
  };
}
```

### Converting Between Types

```typescript
// NURBS curve → Polyline (for rendering)
const tessellated = tessellateCurveAdaptive(nurbsCurve);
const positions = tessellated.points.flatMap(p => [p.x, p.y, p.z]);

// Mesh → B-Rep (for booleans)
const brep = brepFromMesh(mesh);

// B-Rep → Mesh (for rendering)
const mesh = tessellateBRepToMesh(brep);
```

---

## Common Patterns

### Empty Mesh Constant

```typescript
const EMPTY_MESH: RenderMesh = { positions: [], normals: [], uvs: [], indices: [] };
```

### Type Guards

```typescript
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isVec3 = (value: unknown): value is Vec3 =>
  typeof value === "object" &&
  value !== null &&
  "x" in value && "y" in value && "z" in value;
```

### Safe Number Conversion

```typescript
const toNumber = (value: unknown, fallback: number): number => {
  if (isFiniteNumber(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};
```

---

## Performance Guidelines

1. **Avoid repeated tessellation** - Cache tessellation results when geometry hasn't changed
2. **Use typed arrays for large meshes** - `Float32Array` for positions/normals, `Uint32Array` for indices
3. **Batch operations** - Process multiple vertices/faces in single loops
4. **Minimize allocations** - Reuse arrays when possible in tight loops
5. **Profile before optimizing** - Use `performance.now()` to measure actual bottlenecks

---

## See Also

- `types.ts` - All geometry type definitions
- `nodeRegistry.ts` - Example node implementations
- `renderAdapter.ts` - GPU buffer management
- `subsystems_guide.md` - Geometry kernel section
- `geometry_types.md` - Mesh vs NURBS vs B-Rep concepts
