# Semantic Linkage Documentation

## Operation Registry

**Total Operations:** 40

### Operations by Category

#### primitive (7)

- **Generate Box Mesh** (`mesh.generateBox`)
  - Creates a box mesh with specified dimensions and optional segmentation
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Generate Sphere Mesh** (`mesh.generateSphere`)
  - Creates a sphere mesh with specified radius and segments
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Generate Cylinder Mesh** (`mesh.generateCylinder`)
  - Creates a cylinder mesh with specified radius, height, and radial segments
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Generate Pipe Mesh** (`mesh.generatePipe`)
  - Creates a hollow pipe mesh with specified inner/outer radius and height
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Generate Geodesic Sphere** (`meshTess.generateGeodesicSphere`)
  - Creates a geodesic sphere by subdividing an icosahedron
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Generate Hexagonal Tiling** (`meshTess.generateHexagonalTiling`)
  - Creates a hexagonal tiling pattern
  - Complexity: O(n)
  - Tags: mesh, 2d

- **Generate Voronoi Pattern** (`meshTess.generateVoronoiPattern`)
  - Creates a Voronoi diagram pattern from random points
  - Complexity: O(n log n)
  - Tags: mesh, 2d

#### modifier (19)

- **Generate Extrude Mesh** (`mesh.generateExtrude`)
  - Extrudes 2D profiles along a direction to create 3D geometry
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Generate Loft Mesh** (`mesh.generateLoft`)
  - Creates a lofted surface between multiple cross-section curves
  - Complexity: O(n^2)
  - Tags: mesh, 3d, surface

- **Subdivide Linear** (`meshTess.subdivideLinear`)
  - Performs linear subdivision on a mesh
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Subdivide Catmull-Clark** (`meshTess.subdivideCatmullClark`)
  - Performs Catmull-Clark subdivision surface algorithm
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Subdivide Loop** (`meshTess.subdivideLoop`)
  - Performs Loop subdivision for triangular meshes
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Subdivide Adaptive** (`meshTess.subdivideAdaptive`)
  - Performs adaptive subdivision based on curvature
  - Complexity: varies
  - Tags: mesh, 3d

- **Dual Mesh** (`meshTess.dualMesh`)
  - Creates the dual mesh (vertices ↔ faces)
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Inset Faces** (`meshTess.insetFaces`)
  - Insets selected faces inward by a specified distance
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Extrude Faces** (`meshTess.extrudeFaces`)
  - Extrudes selected faces outward by a specified distance
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Mesh Relax** (`meshTess.meshRelax`)
  - Smooths mesh by averaging vertex positions
  - Complexity: O(n * iterations)
  - Tags: mesh, 3d

- **Triangulate Mesh** (`meshTess.triangulateMesh`)
  - Converts all mesh faces to triangles
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Offset Pattern** (`meshTess.offsetPattern`)
  - Offsets mesh surface by a specified distance
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Generate Mesh UVs** (`meshTess.generateMeshUVs`)
  - Generates UV texture coordinates for a mesh
  - Complexity: varies
  - Tags: mesh, 3d

- **Repair Mesh** (`meshTess.repairMesh`)
  - Fixes mesh issues like non-manifold edges and holes
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Decimate Mesh** (`meshTess.decimateMesh`)
  - Reduces polygon count while preserving shape
  - Complexity: O(n log n)
  - Tags: mesh, 3d

- **Quad-Dominant Remesh** (`meshTess.quadDominantRemesh`)
  - Remeshes to quad-dominant topology
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Mesh Boolean** (`meshTess.meshBoolean`)
  - Performs boolean operations (union, difference, intersection) on meshes
  - Complexity: O(n^2)
  - Tags: mesh, 3d

- **Resample By Arc Length** (`curve.resampleByArcLength`)
  - Resamples a polyline to have evenly-spaced points by arc length
  - Complexity: O(n)
  - Tags: curve, polyline, 3d

- **Offset Polyline 2D** (`boolean.offsetPolyline2D`)
  - Offsets a 2D polyline by a specified distance
  - Complexity: O(n)
  - Tags: polyline, 2d

#### analysis (3)

- **Compute Vertex Normals** (`mesh.computeVertexNormals`)
  - Computes smooth vertex normals from mesh positions and indices
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Compute Mesh Area** (`mesh.computeArea`)
  - Calculates the total surface area of a mesh
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Compute Best Fit Plane** (`math.computeBestFitPlane`)
  - Computes the best-fit plane from a set of 3D points using PCA
  - Complexity: O(n)
  - Tags: math, 3d

#### utility (2)

- **Select Faces** (`meshTess.selectFaces`)
  - Selects faces matching a predicate function
  - Complexity: O(n)
  - Tags: mesh, 3d

- **Get Tessellation Metadata** (`meshTess.getTessellationMetadata`)
  - Extracts tessellation data from geometry metadata
  - Complexity: O(1)
  - Tags: mesh

#### tessellation (7)

- **To Tessellation Mesh** (`meshTess.toTessellationMesh`)
  - Converts RenderMesh to TessellationMesh format
  - Complexity: O(n)
  - Tags: mesh

- **To Tessellation Mesh Data** (`meshTess.toTessellationMeshData`)
  - Converts TessellationMesh to data format
  - Complexity: O(1)
  - Tags: mesh

- **Tessellation Mesh To Render Mesh** (`meshTess.tessellationMeshToRenderMesh`)
  - Converts TessellationMesh to RenderMesh format
  - Complexity: O(n)
  - Tags: mesh

- **B-Rep From Mesh** (`brep.brepFromMesh`)
  - Converts a triangle mesh to B-Rep representation
  - Complexity: O(n)
  - Tags: brep, mesh, 3d

- **Tessellate B-Rep To Mesh** (`brep.tessellateBRepToMesh`)
  - Tessellates a B-Rep to a triangle mesh
  - Complexity: O(n)
  - Tags: brep, mesh, 3d

- **Tessellate Curve Adaptive** (`tess.tessellateCurveAdaptive`)
  - Adaptively tessellates a NURBS curve based on curvature
  - Complexity: varies
  - Tags: nurbs, curve, 3d

- **Tessellate Surface Adaptive** (`tess.tessellateSurfaceAdaptive`)
  - Adaptively tessellates a NURBS surface based on curvature
  - Complexity: varies
  - Tags: nurbs, surface, 3d

#### transform (2)

- **Project Point To Plane** (`math.projectPointToPlane`)
  - Projects a 3D point onto a plane, returning 2D coordinates
  - Complexity: O(1)
  - Tags: math, 3d

- **Unproject Point From Plane** (`math.unprojectPointFromPlane`)
  - Converts 2D plane coordinates back to 3D world space
  - Complexity: O(1)
  - Tags: math, 3d

## Node Linkages

**Total Nodes:** 0
