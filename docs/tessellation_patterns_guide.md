# Complete Guide to Tessellation Patterns in Numerica
## Making Mesh Subdivision and Pattern Generation Accessible

---

## Table of Contents

1. **Foundations: What is Tessellation?**
2. **The Three Core Pattern Types**
3. **Mathematical Foundations (Made Simple)**
4. **Numerica Node Architecture**
5. **Implementation Roadmap**
6. **Pattern Catalog with Examples**
7. **Advanced Topics**

---

## Part 1: Foundations - What is Tessellation?

### The Basic Concept

Tessellation is the process of taking a simple mesh (like a triangle or quad) and subdividing it into smaller, more refined pieces according to a pattern or rule. Think of it like starting with a paper square and folding it into an origami pattern, except we're doing it with 3D geometry.

**Three key ideas:**

1. **Subdivision** - Taking one polygon and splitting it into many smaller ones
2. **Pattern** - The rule that determines where and how to split
3. **Refinement** - Making the mesh smoother or more detailed through subdivision

### Why Tessellation Matters

In parametric design, tessellation gives you:
- **Structural patterns** - Creating geodesic domes, lattices, space frames
- **Surface detail** - Adding complexity to simple base surfaces
- **Fabrication preparation** - Breaking complex surfaces into buildable panels
- **Artistic effects** - Voronoi patterns, organic subdivisions, mathematical tilings

### What nGon and Weaverbird Do

These Grasshopper plugins provide tessellation operations in two categories:

**Subdivision Schemes** (Weaverbird specialty):
- Catmull-Clark - Creates smooth, curved surfaces from angular meshes
- Loop - Optimized for triangular meshes
- Doo-Sabin - Generalizes Catmull-Clark to n-sided faces
- Butterfly - Interpolating subdivision for triangles

**Geometric Patterns** (nGon specialty):
- Dual mesh - Creates faces from vertices, vertices from faces
- Offset patterns - Insets faces to create frames
- Voronoi patterns - Organic cell-based subdivisions
- Geodesic patterns - Spherical subdivisions with uniform edge lengths

---

## Part 2: The Three Core Pattern Types

Let's break tessellation into three fundamental operations that you can implement in Numerica. Master these three, and you can create most architectural and design patterns.

### Type 1: Subdivision (Refinement)

**What it does:** Takes each face and splits it into smaller faces, usually making the surface smoother.

**The simplest version - Quad Subdivision:**
```
Original:        After 1 subdivision:
+-------+        +---+---+
|       |        | | | | |
|       |   →    +---+---+
|       |        | | | | |
+-------+        +---+---+
```

Each quad becomes 4 quads. This is linear subdivision - no curvature added yet.

**Adding smoothness - Catmull-Clark:**
The genius of Catmull-Clark is that it moves the new vertices to create curvature:
- Face points: Average of all face vertices
- Edge points: Average of edge endpoints + adjacent face points
- Vertex points: Weighted average of surrounding geometry

After a few iterations, you get a smooth surface approximating a NURBS surface.

### Type 2: Dual Operations (Topological Transforms)

**What it does:** Creates a new mesh where faces become vertices and vertices become faces. This fundamentally changes the topology.

**Simple example:**
```
Original triangle:        Dual:
    A                    +---+
   /|\                  /  E  \
  / | \                / /   \ \
 /  |  \              / D  F  C \
B   +   C      →     +-----+-----+
 \  |  /              \   /     /
  \ | /                \ /  G  /
   \|/                  +-----+
    D                      B
```

The center point E becomes a vertex, and original vertices A, B, C create faces around it.

**Why it's useful:**
- Creates frame structures (offset + dual = structural frames)
- Generates Voronoi-like patterns
- Allows topology manipulation for fabrication

### Type 3: Face Operations (Geometric Patterns)

**What it does:** Operates on each face individually - insetting, extruding, subdividing by pattern.

**Inset operation:**
```
Original:           Inset by 0.3:
+-------+          +-------+
|       |          |+-----+|
|       |    →     ||     ||
|       |          |+-----+|
+-------+          +-------+
```

This creates a smaller face inside the original, with a border strip around it. Great for paneling, window patterns, and structural grids.

**Extrude operation:**
Each face moves perpendicular to its surface by a distance. Combined with inset, you get complex 3D patterns from flat surfaces.

---

## Part 3: Mathematical Foundations (Made Simple)

You don't need advanced math to implement tessellation, but understanding these concepts helps.

### Mesh Data Structure

A mesh needs three things:
1. **Vertices** - Points in 3D space: `[x, y, z]`
2. **Faces** - Lists of vertex indices: `[0, 1, 2]` means triangle using vertices 0, 1, 2
3. **Edges** (optional but helpful) - Pairs of vertex indices

**Example mesh - a simple quad:**
```javascript
mesh = {
  vertices: [
    [0, 0, 0],  // vertex 0
    [1, 0, 0],  // vertex 1
    [1, 1, 0],  // vertex 2
    [0, 1, 0]   // vertex 3
  ],
  faces: [
    [0, 1, 2, 3]  // quad face using all 4 vertices
  ]
}
```

### Subdivision Math - The Catmull-Clark Formula

For each subdivision iteration:

**1. Face Point** (center of each face):
```
facePoint = average of all vertices in face
```

**2. Edge Point** (midpoint influenced by adjacent faces):
```
edgePoint = (v1 + v2 + f1 + f2) / 4

Where:
- v1, v2 are edge endpoints
- f1, f2 are face points of adjacent faces
```

**3. Vertex Point** (weighted average):
```
newVertex = (F + 2R + (n-3)P) / n

Where:
- F = average of adjacent face points
- R = average of adjacent edge midpoints  
- P = original vertex position
- n = vertex valence (number of edges meeting at vertex)
```

**Don't let the formula intimidate you.** In code, this is just:
1. Loop through faces → calculate averages
2. Loop through edges → calculate averages
3. Loop through vertices → calculate weighted averages
4. Connect them in the right pattern

### Dual Mesh - The Topology Flip

**Algorithm:**
```
1. Calculate center point for each face → these become vertices
2. For each original vertex:
   - Find all adjacent faces
   - Connect their center points
   - This creates a new face
3. Result: face centers → vertices, vertices → faces
```

**Key insight:** The dual of a dual gives you back the original mesh (almost). This is topological reciprocity.

### Face Inset - Shrinking While Maintaining Shape

For a face with vertices `[v0, v1, v2, v3]`:

**1. Find face center:**
```
center = (v0 + v1 + v2 + v3) / 4
```

**2. For each vertex, lerp toward center:**
```
newVertex = vertex + insetAmount * (center - vertex)
```

If `insetAmount = 0.3`, the new vertex is 30% of the way from the original to the center.

**3. Create new faces:**
- Inner face: the new inset vertices
- Border faces: connect original edges to inset edges

---

## Part 4: Numerica Node Architecture

Let's design a clean, modular node structure for tessellation in Numerica.

### Design Philosophy

**Make it compositional:** Each node does one thing well. Complex patterns emerge from combining nodes.

**Three-tier structure:**
1. **Operators** - Core algorithms (subdivide, dual, inset)
2. **Modifiers** - Transform results (smooth, relax, optimize)
3. **Generators** - Create specific patterns (Voronoi, hexagonal, geodesic)

### Core Nodes to Implement

#### Tier 1: Operators (5 essential nodes)

**1. Subdivide Mesh**
```
Inputs:
  - mesh: Mesh (the base mesh)
  - iterations: Number (how many times to subdivide, default 1)
  - scheme: String (type: "linear", "catmull-clark", "loop")

Output:
  - mesh: Mesh (subdivided result)

Settings:
  - preserveBoundary: Boolean (keep edges sharp)
```

**2. Dual Mesh**
```
Inputs:
  - mesh: Mesh

Output:
  - mesh: Mesh (topological dual)
```

**3. Inset Faces**
```
Inputs:
  - mesh: Mesh
  - amount: Number (0.0-1.0, how much to inset)
  - mode: String ("uniform", "per-face")

Output:
  - mesh: Mesh (with inset faces)
  - innerFaces: List<Face> (the inset faces themselves)
  - borderFaces: List<Face> (the border strips)
```

**4. Extrude Faces**
```
Inputs:
  - mesh: Mesh
  - distance: Number (or List<Number> for per-face)
  - direction: String ("normal", "fixed-axis")

Output:
  - mesh: Mesh (extruded result)
```

**5. Mesh Relax** (smoothing without subdivision)
```
Inputs:
  - mesh: Mesh
  - iterations: Number
  - strength: Number (0.0-1.0)

Output:
  - mesh: Mesh (relaxed/smoothed)
```

#### Tier 2: Modifiers (3 utility nodes)

**6. Select Faces**
```
Inputs:
  - mesh: Mesh
  - criteria: String ("area", "normal-direction", "index-pattern")
  - threshold: Number (depends on criteria)

Output:
  - faceIndices: List<Number>
```

**7. Mesh Boolean** (for complex patterns)
```
Inputs:
  - meshA: Mesh
  - meshB: Mesh
  - operation: String ("union", "difference", "intersection")

Output:
  - mesh: Mesh
```

**8. Triangulate Mesh**
```
Inputs:
  - mesh: Mesh

Output:
  - mesh: Mesh (all quads/n-gons converted to triangles)
```

#### Tier 3: Generators (4 pattern nodes)

**9. Geodesic Sphere**
```
Inputs:
  - radius: Number
  - subdivisions: Number (frequency)
  - method: String ("icosahedron", "octahedron")

Output:
  - mesh: Mesh
```

**10. Voronoi Pattern**
```
Inputs:
  - boundaryMesh: Mesh (surface to apply pattern to)
  - numCells: Number (or seed points)
  - relaxIterations: Number (Lloyd's relaxation)

Output:
  - mesh: Mesh (Voronoi cells as faces)
```

**11. Hexagonal Tiling**
```
Inputs:
  - surface: NurbsSurface
  - cellSize: Number
  - orientation: Number (rotation angle)

Output:
  - mesh: Mesh
```

**12. Offset Pattern** (combines inset + extrude)
```
Inputs:
  - mesh: Mesh
  - insetAmount: Number
  - extrudeDepth: Number
  - borderWidth: Number

Output:
  - mesh: Mesh (panelized pattern)
```

### Node Combination Examples

**Creating a geodesic dome:**
```
1. Geodesic Sphere (frequency 3)
   ↓
2. Select Faces (top hemisphere)
   ↓
3. Inset Faces (amount 0.2)
   ↓
4. Extrude Faces (distance -0.05)
   = Panelized dome
```

**Creating a Voronoi facade:**
```
1. Base Surface (NURBS plane)
   ↓
2. Voronoi Pattern (50 cells, relax 3)
   ↓
3. Inset Faces (0.1)
   ↓
4. Select Faces (innerFaces output from inset)
   ↓
5. Extrude Faces (variable depth based on sun analysis)
   = Shading facade
```

**Creating organic subdivision surface:**
```
1. Base Mesh (simple cube)
   ↓
2. Subdivide Mesh (catmull-clark, 3 iterations)
   ↓
3. Mesh Relax (2 iterations, strength 0.5)
   = Smooth organic form
```

---

## Part 5: Implementation Roadmap

Let's implement this step by step, starting simple and building complexity.

### Phase 1: Foundation (Week 1-2)

**Goal:** Get basic mesh operations working

**Tasks:**
1. **Mesh data structure** in `client/src/geometry/mesh.ts`:
   ```typescript
   type Mesh = {
     vertices: Vec3[]
     faces: number[][] // each face is array of vertex indices
     normals?: Vec3[]  // optional face normals
   }
   ```

2. **Helper functions:**
   - `calculateFaceNormal(vertices: Vec3[], face: number[]): Vec3`
   - `calculateFaceCenter(vertices: Vec3[], face: number[]): Vec3`
   - `findAdjacentFaces(mesh: Mesh, vertexIndex: number): number[]`
   - `findAdjacentEdges(mesh: Mesh, vertexIndex: number): [number, number][]`

3. **Basic operators:**
   - Implement `triangulateMesh()`
   - Implement `calculateMeshNormals()`

**Test:** Create a simple quad mesh, triangulate it, verify normals are correct.

### Phase 2: Core Subdivision (Week 3-4)

**Goal:** Implement linear and Catmull-Clark subdivision

**Tasks:**
1. **Linear subdivision:**
   ```typescript
   function subdivideLinear(mesh: Mesh): Mesh {
     // For each face:
     //   - Add face center vertex
     //   - Add edge midpoint vertices
     //   - Connect them to create 4 sub-faces per original face
   }
   ```

2. **Catmull-Clark subdivision:**
   ```typescript
   function subdivideCatmullClark(mesh: Mesh): Mesh {
     // Step 1: Calculate face points (centers)
     // Step 2: Calculate edge points (formula above)
     // Step 3: Calculate new vertex points (weighted average)
     // Step 4: Connect them in Catmull-Clark pattern
   }
   ```

3. **Numerica node:**
   Create `SubdivideMesh` node in `client/src/workflow/nodes/mesh/`

**Test:** 
- Subdivide a cube with linear → should get clean 6x4 subdivision per face
- Subdivide a cube with Catmull-Clark → should get smooth sphere after 3 iterations

### Phase 3: Face Operations (Week 5-6)

**Goal:** Inset and extrude working

**Tasks:**
1. **Inset implementation:**
   ```typescript
   function insetFaces(mesh: Mesh, amount: number): {
     mesh: Mesh
     innerFaces: number[]
     borderFaces: number[]
   } {
     // For each face:
     //   - Calculate inset vertices (lerp toward center)
     //   - Create inner face
     //   - Create border quad strips
   }
   ```

2. **Extrude implementation:**
   ```typescript
   function extrudeFaces(
     mesh: Mesh, 
     faceIndices: number[],
     distance: number
   ): Mesh {
     // For each selected face:
     //   - Duplicate vertices
     //   - Move along face normal by distance
     //   - Create side faces connecting original to new
   }
   ```

3. **Numerica nodes:**
   - `InsetFaces` node
   - `ExtrudeFaces` node

**Test:**
- Inset all faces of cube by 0.3 → should get picture-frame effect on each face
- Extrude top face of cube by 1.0 → should get tower shape

### Phase 4: Dual Operations (Week 7)

**Goal:** Topological transformations

**Tasks:**
1. **Dual mesh:**
   ```typescript
   function dualMesh(mesh: Mesh): Mesh {
     const faceCenters = mesh.faces.map(face => 
       calculateFaceCenter(mesh.vertices, face)
     )
     
     // New vertices = old face centers
     const newVertices = faceCenters
     
     // New faces = connect centers around each old vertex
     const newFaces = mesh.vertices.map((_, vIndex) => {
       const adjacentFaces = findAdjacentFaces(mesh, vIndex)
       return adjacentFaces // these face indices become vertex indices
     })
     
     return { vertices: newVertices, faces: newFaces }
   }
   ```

2. **Numerica node:**
   `DualMesh` node

**Test:**
- Dual of cube → octahedron (8 faces, 6 vertices)
- Dual of octahedron → cube (verify reciprocity)

### Phase 5: Generators (Week 8-9)

**Goal:** Pre-built patterns

**Tasks:**
1. **Geodesic sphere:**
   - Start with icosahedron (20 triangular faces)
   - Subdivide each triangle into smaller triangles
   - Project vertices onto sphere surface
   - Implement as `GeodesicSphere` node

2. **Hexagonal tiling:**
   - Generate hexagon grid in 2D
   - Map onto surface using UV coordinates
   - Implement as `HexagonalTiling` node

3. **Voronoi pattern** (more advanced):
   - Generate seed points on surface
   - Calculate Voronoi cells
   - Lloyd's relaxation for uniform cells
   - Implement as `VoronoiPattern` node

**Test:**
- Geodesic frequency 3 → 180 faces (20 × 9)
- Hexagonal tiling on plane → regular perfect hexagons

### Phase 6: Polish and Optimization (Week 10)

**Goal:** Performance and usability

**Tasks:**
1. **Mesh welding** - Merge duplicate vertices within tolerance
2. **Normal smoothing** - Average normals across shared vertices
3. **Mesh validation** - Check for holes, non-manifold edges
4. **Preview modes** - Wireframe, shaded, vertex display options
5. **Performance** - Optimize for large meshes (1000+ faces)

**Test:**
- Subdivide 3 times (should handle 100K+ faces smoothly)
- Verify no duplicate vertices after complex operations

---

## Part 6: Pattern Catalog with Examples

Here are 12 essential patterns you can create with the above nodes.

### Pattern 1: Geodesic Dome
**Nodes:** GeodesicSphere → SelectFaces → InsetFaces → ExtrudeFaces
**Parameters:**
- Frequency: 4 (higher = more triangles)
- Hemisphere: top half only
- Inset: 0.15
- Extrude: -0.03 (inward for structural depth)

**Result:** Buckminster Fuller style dome with panelized triangles

### Pattern 2: Diagrid Facade
**Nodes:** BaseMesh → Subdivide → Dual → InsetFaces → Triangulate
**Parameters:**
- Subdivide: linear, 2 iterations
- Dual: full mesh
- Inset: 0.2
- Result shows diagonal grid pattern

**Result:** Diamond/diagrid structural pattern

### Pattern 3: Waffle Structure
**Nodes:** BaseMesh → InsetFaces → SelectFaces (alternating) → ExtrudeFaces
**Parameters:**
- Inset: 0.3
- Select: checker pattern
- Extrude: alternate +0.2 and -0.2

**Result:** Egg-crate interlocking structure

### Pattern 4: Voronoi Skin
**Nodes:** BaseSurface → VoronoiPattern → InsetFaces → ExtrudeFaces (variable)
**Parameters:**
- Cells: 60
- Lloyd relaxation: 3 iterations
- Inset: 0.1
- Extrude: attractor-based depth

**Result:** Organic, cell-like facade pattern

### Pattern 5: Catmull-Clark Smooth
**Nodes:** BaseMesh (angular) → Subdivide (catmull-clark, 3×)
**Parameters:**
- Iterations: 3
- Preserve boundary: yes

**Result:** Transforms box into smooth, rounded form

### Pattern 6: Hexagonal Tiles
**Nodes:** BaseSurface → HexagonalTiling → InsetFaces → ExtrudeFaces
**Parameters:**
- Cell size: 0.5
- Rotation: 0° or 30° for variation
- Inset: 0.1
- Extrude: -0.05

**Result:** Honeycomb panel pattern

### Pattern 7: Frame Structure
**Nodes:** BaseMesh → Dual → InsetFaces → ExtrudeFaces
**Parameters:**
- Dual: creates frame topology
- Inset: 0.3 (determines beam width)
- Extrude: 0.1 (beam depth)

**Result:** Structural frame following mesh topology

### Pattern 8: Fractal Subdivision
**Nodes:** BaseMesh → Subdivide → InsetFaces → SelectFaces (inner) → Subdivide (repeat)
**Parameters:**
- Nested iteration: 2-3 times
- Decreasing inset amounts

**Result:** Self-similar fractal-like pattern

### Pattern 9: Perforation Pattern
**Nodes:** BaseMesh → Subdivide → InsetFaces → SelectFaces → Delete
**Parameters:**
- Subdivide: 2× for density
- Inset: 0.4
- Delete inner faces

**Result:** Perforated screen with regular openings

### Pattern 10: Offset Panels
**Nodes:** BaseMesh → InsetFaces → ExtrudeFaces → InsetFaces → ExtrudeFaces
**Parameters:**
- First inset: 0.2, extrude: -0.05 (recess)
- Second inset: 0.3, extrude: 0.03 (panel depth)

**Result:** Multi-level panelization

### Pattern 11: Triangulated Surface
**Nodes:** BaseSurface → IsoTrim → Triangulate → Subdivide (loop) → MeshRelax
**Parameters:**
- Triangulation: quality mesh
- Loop subdivision: 2×
- Relax: 3 iterations, strength 0.4

**Result:** Smooth triangulated surface from NURBS

### Pattern 12: Weaving Pattern
**Nodes:** BaseMesh → Subdivide → SelectFaces (stripe pattern) → ExtrudeFaces (alternating)
**Parameters:**
- Select: every other row
- Extrude: +0.1 / -0.1 alternating

**Result:** Interwoven basket-like pattern

---

## Part 7: Advanced Topics

Once you have the basics working, these advanced techniques will make your tessellation system powerful.

### Adaptive Subdivision

Instead of uniform subdivision, subdivide only where needed based on:
- **Curvature** - More subdivision on highly curved areas
- **Distance to camera** - LOD (Level of Detail) management
- **User-defined masks** - Subdivide only selected regions

**Algorithm:**
```typescript
function subdivideAdaptive(mesh: Mesh, criteria: (face: Face) => boolean): Mesh {
  // Only subdivide faces where criteria returns true
  // Requires edge-matching to prevent cracks
}
```

### Mesh Fairing

Improving mesh quality after subdivision:
- **Vertex repositioning** - Move vertices to minimize energy
- **Edge flipping** - Optimize triangle quality in triangular meshes
- **Laplacian smoothing** - Diffusion-based smoothing

**Simple Laplacian smooth:**
```typescript
function laplacianSmooth(mesh: Mesh, iterations: number): Mesh {
  for (let i = 0; i < iterations; i++) {
    for (let vIndex = 0; vIndex < mesh.vertices.length; vIndex++) {
      const neighbors = findNeighborVertices(mesh, vIndex)
      const avg = average(neighbors)
      mesh.vertices[vIndex] = lerp(mesh.vertices[vIndex], avg, 0.5)
    }
  }
  return mesh
}
```

### Quad-Dominant Remeshing

Converting triangle meshes to quad meshes:
- Start with triangle mesh
- Find vertex pairs to merge
- Convert triangles to quads where possible
- Leave triangles only where necessary (valence-3 or valence-5 vertices)

**Use case:** Better for Catmull-Clark subdivision, which works best on quads.

### UV Coordinate Generation

For texturing tessellated meshes:
- **Planar projection** - Simple UV from bounding box
- **Cylindrical/spherical** - For curved surfaces
- **Conformal mapping** - Preserve angles, minimize distortion
- **ABF (Angle-Based Flattening)** - Advanced minimal distortion

Store UVs alongside vertices:
```typescript
type Mesh = {
  vertices: Vec3[]
  faces: number[][]
  uvs?: Vec2[]  // Same length as vertices
}
```

### Mesh Repair

Fixing problematic meshes:
- **Non-manifold edges** - Edges with more than 2 adjacent faces
- **Holes** - Missing faces
- **Self-intersections** - Faces that pass through each other
- **Degenerate faces** - Zero-area triangles

**Simple hole filling:**
```typescript
function fillHoles(mesh: Mesh): Mesh {
  // 1. Find boundary loops (edges with only 1 adjacent face)
  // 2. Triangulate the loop
  // 3. Add triangles to mesh
}
```

### Performance Optimization

For real-time interaction with large meshes:

1. **Spatial indexing** - Use octree or BVH for fast face lookup
2. **Instancing** - For repeated geometry (hexagon tiles)
3. **Streaming** - Load/display mesh progressively
4. **Simplification** - Reduce face count while preserving shape (mesh decimation)

**Mesh decimation example:**
```typescript
function decimateMesh(mesh: Mesh, targetFaceCount: number): Mesh {
  // Iteratively collapse edges with lowest error cost
  // Quadric error metric (QEM) is gold standard
}
```

---

## Implementation Guidelines for Numerica

### Code Organization

```
client/src/
  geometry/
    mesh.ts              // Core mesh data structure
    meshSubdivision.ts   // Subdivision algorithms
    meshOperations.ts    // Dual, inset, extrude
    meshGenerators.ts    // Geodesic, Voronoi, etc.
    meshUtils.ts         // Normals, validation, repair
    
  workflow/
    nodes/
      mesh/
        SubdivideMesh.ts
        DualMesh.ts
        InsetFaces.ts
        ExtrudeFaces.ts
        GeodesicSphere.ts
        VoronoiPattern.ts
        ... (one file per node)
```

### Node Implementation Template

```typescript
// Example: SubdivideMesh.ts
export const SubdivideMeshNode: WorkflowNode = {
  type: 'subdivideMesh',
  category: 'Mesh',
  
  inputs: {
    mesh: { type: 'mesh', required: true },
    iterations: { type: 'number', default: 1 },
    scheme: { 
      type: 'string', 
      default: 'catmull-clark',
      options: ['linear', 'catmull-clark', 'loop']
    }
  },
  
  outputs: {
    mesh: { type: 'mesh' }
  },
  
  compute: async ({ mesh, iterations, scheme }) => {
    let result = mesh
    for (let i = 0; i < iterations; i++) {
      switch (scheme) {
        case 'linear':
          result = subdivideLinear(result)
          break
        case 'catmull-clark':
          result = subdivideCatmullClark(result)
          break
        case 'loop':
          result = subdivideLoop(result)
          break
      }
    }
    return { mesh: result }
  }
}
```

### Testing Strategy

For each node:
1. **Unit tests** - Pure function testing
2. **Visual tests** - Render result, compare to reference
3. **Topology tests** - Verify Euler characteristic (V - E + F = 2 for closed meshes)
4. **Performance tests** - Benchmark with various mesh sizes

Example test:
```typescript
test('Catmull-Clark subdivision of cube produces sphere', () => {
  const cube = createCubeMesh()
  const result = subdivideCatmullClark(cube, 4)
  
  // After 4 iterations, should be very close to sphere
  const vertices = result.vertices
  const center = [0, 0, 0]
  const radii = vertices.map(v => distance(v, center))
  const avgRadius = average(radii)
  const maxDeviation = Math.max(...radii.map(r => Math.abs(r - avgRadius)))
  
  expect(maxDeviation).toBeLessThan(0.01) // Within 1% of perfect sphere
})
```

### Documentation

Each node needs:
1. **Description** - What it does in simple terms
2. **Inputs/Outputs** - Type and purpose
3. **Example usage** - Show in context
4. **Diagram** - Visual before/after
5. **Performance notes** - Complexity, limitations

### Future Extensions

Once core system works:
1. **Mesh analysis nodes** - Area, volume, curvature
2. **Mesh comparison** - Difference, deviation
3. **Parametric control** - Data-driven subdivision density
4. **Fabrication output** - Unrolling, nesting, labeling panels
5. **Structural analysis** - FEA preparation

---

## Conclusion

This guide gives you a complete path to implementing tessellation in Numerica:

**Week 1-2:** Mesh foundations and helpers  
**Week 3-4:** Core subdivision (linear + Catmull-Clark)  
**Week 5-6:** Face operations (inset + extrude)  
**Week 7:** Dual operations  
**Week 8-9:** Pattern generators  
**Week 10:** Polish and optimization

Start with simple nodes, test thoroughly, then combine them to create the complex patterns that nGon and Weaverbird provide.

**Key advantages over existing tools:**
- **Modular** - Each node does one thing, combine for complexity
- **Visual** - See the graph, understand the logic
- **Parametric** - Change inputs, pattern updates instantly
- **Accessible** - Clear naming, no jargon, good documentation

The patterns in Part 6 show what's possible. With these 12 nodes implemented well, you can create any architectural tessellation pattern currently requiring specialized plugins.

Start coding, and remember: begin with simple linear subdivision on a cube. Once that works perfectly, everything else builds on that foundation.

## Implementation Anchors

- `client/src/geometry/meshTessellation.ts` for subdivision and pattern algorithms.
- `client/src/workflow/nodeRegistry.ts` for tessellation node definitions.
- `client/src/workflow/nodeTypes.ts` for node identifiers and categories.
- `client/src/components/workflow/workflowValidation.ts` for connection checks.

## Output Invariants

- Preserve consistent face winding for normals and shading.
- Avoid duplicate vertices; dedupe when merging faces or after dual operations.
- Maintain manifold edges where possible; flag or isolate non-manifold results.
- Keep attribute arrays (normals, uvs) aligned with positions after subdivision.

## Validation Checklist

- Run linear and Catmull-Clark on a cube and verify expected face counts.
- Verify Loop subdivision on a triangle mesh maintains symmetry.
- Confirm dual/offset operations preserve boundary loops and do not create gaps.
