# Geometry Types: Mesh vs NURBS vs B-Rep

This document defines the three core geometry paradigms used in Lingua
(Numerica + Roslyn) and how they should be implemented in primitives,
data models, and workflows. These are not interchangeable formats and
must not be treated as variants of the same thing.

## 0) Why this distinction matters

Each paradigm makes different tradeoffs in:
- precision
- editability
- topology
- fabrication workflows

A robust modeler must support them differently. Treating them as the same
causes brittle booleans, lossy conversions, and incorrect assumptions
about solids.

## 1) Mesh (discrete geometry)

### What it is
A mesh is a discrete approximation of shape using vertices and faces.

Minimal model:
```
Mesh {
  vertices: Vec3[]
  faces: int[][]
}
```

Lingua render model (current):
```
RenderMesh {
  positions: number[] // flat XYZ
  normals: number[]
  uvs: number[]
  indices: number[]
}
```

### Properties
- Piecewise linear
- No exact curvature
- Edges are implicit via faces
- No inherent inside/outside unless explicitly tracked

### Strengths
- Simple
- Fast
- GPU-native
- Ideal for:
  - real-time preview
  - sculpting
  - topology optimization output
  - voxel / field-based modeling
  - 3D printing

### Weaknesses
- Imprecise
- Boolean ops are fragile
- Fillets/chamfers are nontrivial
- Hard to parametrize cleanly

### Use meshes when
- Geometry comes from simulation / fields / topology optimization
- You want speed and flexibility
- You do not need analytic precision

## 2) NURBS (parametric geometry)

### What it is
NURBS define exact curves and surfaces using control points and basis
functions. In Lingua, weights are stored separately from control points.

Curve model (Lingua):
```
NURBSCurve {
  controlPoints: Vec3[]
  knots: number[]
  degree: number
  weights?: number[]
}
```

Surface model (Lingua):
```
NURBSSurface {
  controlPoints: Vec3[][]
  knotsU: number[]
  knotsV: number[]
  degreeU: number
  degreeV: number
  weights?: number[][]
}
```

### Properties
- Continuous
- Exact (circles are actually circles)
- Local control
- Parameter space (u, v)

### Strengths
- Precision
- Ideal for:
  - CAD
  - fabrication
  - smooth analytic forms
  - lightweight curves/surfaces

### Weaknesses
- By themselves, NURBS do not define solids
- A surface is just a sheet
- No inherent topology or inside/outside
- Trimming logic is complex

### Use NURBS when
- You need smooth, editable curves/surfaces
- Geometry is designer-controlled
- You want downstream CAD/CAM compatibility

## 3) B-Rep (boundary representation)

### What it is
A B-Rep is not geometry. It is a topological structure that references
geometry and defines boundaries and solidness.

A B-Rep answers:
"Which surfaces bound this solid, and how are they connected?"

Minimal model:
```
BRep {
  faces: Face[]
  edges: Edge[]
  vertices: Vertex[]
}

Face {
  surface: NURBSSurface | AnalyticSurface
  loops: Loop[]
}

Edge {
  curve: NURBSCurve | AnalyticCurve
  vertices: [Vertex, Vertex]
}

Loop {
  edges: OrientedEdge[]
}
```

### Key idea
B-Rep = topology + geometry
- Geometry: usually NURBS
- Topology: faces, edges, loops, orientation
- This is what makes something a solid

### Strengths
- Exact solids
- Robust boolean operations
- Fillets, chamfers, offsets
- Manufacturing-ready

### Weaknesses
- Complex to implement
- Trim curves are hard
- Heavy data structures
- Slower than meshes

### Critical clarification
B-Reps are NOT owned by Rhino. Rhino uses NURBS-based B-Reps, but B-Rep
is a general CAD concept.

## 4) How they relate (key mental model)

Mesh
  -> discrete approximation

NURBS
  -> exact geometry (curves / surfaces)

B-Rep
  -> topology that references geometry (often NURBS)

Or:
- Mesh = "what it looks like"
- NURBS = "how it is shaped mathematically"
- B-Rep = "what makes it a solid"

## 5) Implementing primitives (must be distinct)

Primitive creation paths should be distinct:

### Mesh primitives
- `createMeshBox()`
- `createMeshSphere()`
- Direct vertex/face generation
- GPU-first
- No topology graph

### NURBS primitives
- `createNurbsCurveCircle()`
- `createNurbsSurfaceRevolved()`
- Parametric definitions
- No solid unless wrapped in a B-Rep

### B-Rep primitives
- `createBRepBox()`
- `createBRepCylinder()`
- Build faces + edges + loops
- Faces reference NURBS surfaces
- Edges reference NURBS curves
- Orientation defines solid

Do NOT fake B-Reps by just grouping surfaces.

## 6) Workflow guidance for Numerica-style tools

Recommended phased approach:
1. Meshes first
   - topology optimization
   - fields
   - robotic / voxel logic
2. Add NURBS
   - curves
   - reference surfaces
   - designer-controlled inputs
3. Add B-Rep layer
   - only when you need:
     - solids
     - booleans
     - fabrication-grade geometry

Hybrid workflow (powerful):
- design logic -> mesh / field
- extract features -> NURBS
- wrap critical parts -> B-Rep
- fabricate

This matches:
- AA EmTech
- graded materials research
- robotic fabrication pipelines

## 7) What Codex must NOT assume
- A mesh is not a solid
- A NURBS surface is not a solid
- A B-Rep is not just NURBS
- Converting mesh -> B-Rep is nontrivial and lossy

## 8) Conversion and Interop Policy

- Conversions are explicit operations and must never replace the source geometry in place.
- Mesh -> NURBS is approximate and should preserve the source mesh as provenance.
- NURBS -> mesh is primarily for rendering or mesh editing; keep the parametric source when possible.
- B-Rep <-> mesh conversions are for export or downstream workflows and may lose topology semantics.
- Record conversion metadata so downstream nodes can trace origins and intent.

## One-sentence summary (Codex-ready)
Meshes approximate shape, NURBS define exact curves and surfaces, and
B-Reps use topology to bind geometry into true solids. They are different
modeling paradigms and must be implemented with distinct data models and
workflows.
