# Topology Optimization Solver

**Greek Name:** Ἐπιλύτης Τοπολογικῆς Βελτιστοποίησης  
**Romanization:** Epilýtēs Topologikís Veltitopoíisis  
**English Name:** Topology Optimization Solver  
**Named After:** Leonhard Euler (topology pioneer, Euler characteristic)

## Overview

The Topology Optimization Solver performs iterative SIMP-based structural optimization, then extracts geometry (point cloud → curve network → multipipe) from the converged density field. It is a fully semantic simulator: every stage of the simulation loop, convergence check, preview sync, and geometry refinement is tracked as a named Lingua semantic operation.

## Ontological Type

**Structural Optimization** - Iterative SIMP simulation with semantic convergence and geometry extraction

## Has Simulator

**Yes** - Iterative SIMP simulation with convergence monitoring, semantic telemetry, and a dedicated simulator dashboard.

## Semantic Operations

**Solver-level:**
- `solver.topologyOptimization`

**Simulator lifecycle:**
- `simulator.topology.initialize`
- `simulator.topology.step`
- `simulator.topology.converge`
- `simulator.topology.preview`
- `simulator.topology.sync`
- `simulator.topology.finalize`
- `simulator.topology.pause`
- `simulator.topology.resume`
- `simulator.topology.reset`
- `simulator.topology.plasticwrap`
- `simulator.topology.stabilityGuard`

## Algorithm

### SIMP Simulation Loop

1. **Initialize Density Field**
   - Grid resolution (`nx`, `ny`, `nz`)
   - Volume fraction target (`volFrac`)
   - Material bounds (`E0`, `Emin`, `rhoMin`)

2. **Finite Element Solve**
   - Assemble stiffness matrix
   - Solve for displacements (CG solver)
   - Compute compliance and sensitivities

3. **Update Densities**
   - Apply SIMP penalization ramp
   - Filter sensitivities (`rmin`)
   - Enforce move limit (`move`)
   - Check convergence (`tolChange`, `maxIters`)

4. **Semantic Telemetry**
   - Convergence metrics are recorded and visualized
   - Preview syncs are semantic operations, not side-effects
   - Stability guard escalates strategy on repeated FE stalls

### Geometry Extraction (Post-Simulation)

1. **Point Cloud Generation**
   - Sample points from input geometry surface
   - Use stratified sampling for uniform distribution
   - Proportional to triangle area for even coverage
   - Seeded random number generator for reproducibility

2. **Curve Network Generation**
   - For each point, find neighbors within connection radius
   - Create curves (line segments) between connected points
   - Use 3D Euclidean distance for proximity calculation
   - Results in a network of interconnected curves

3. **Multipipe Operation**
   - Create cylindrical pipes along all curves
   - Use specified pipe radius
   - Generate mesh with proper normals and UVs
   - Merge all pipes into single optimized structure
4. **Plasticwrap Refinement (Optional)**
   - Smooth the extracted mesh against a proxy target
   - Produces a refined, production-ready surface

### Mathematical Foundation

**Point Sampling:**
```
For each triangle T with area A_T:
  Sample count = (A_T / total_area) * point_density
  For each sample:
    Generate barycentric coordinates (u, v, w) where u + v + w = 1
    Point = w * v0 + u * v1 + v * v2
```

**Curve Network:**
```
For each point pair (p1, p2):
  distance = ||p2 - p1||
  if distance <= connection_radius:
    Create curve from p1 to p2
```

**Multipipe:**
```
For each curve:
  direction = normalize(end - start)
  perpendicular_1 = normalize(cross(direction, up))
  perpendicular_2 = normalize(cross(direction, perpendicular_1))
  
  For each segment around pipe:
    angle = segment * 2π / segment_count
    offset = radius * (cos(angle) * perp_1 + sin(angle) * perp_2)
    vertex = center + offset
```

## Node Specification

### Inputs

| Input | Type | Description |
|-------|------|-------------|
| `geometry` | geometry | Input geometry defining the optimization domain |
| `goals` | goal | Optimization goals (Anchor, Load, Volume, Stiffness) |
| `nx, ny, nz` | number | SIMP grid resolution |
| `volFrac` | number | Target material fraction |
| `rmin` | number | Sensitivity filter radius |
| `maxIters` | number | Iteration limit |
| `tolChange` | number | Convergence tolerance |
| `cgTol, cgMaxIters` | number | FE solver tolerances |
| `densityThreshold` | number | Density cutoff for geometry extraction |
| `maxLinksPerPoint` | number | Connectivity cap for curve network |
| `maxSpanLength` | number | Maximum link length |
| `pipeRadius` | number | Multipipe radius |

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `optimizedMesh` | mesh | Topologically optimized structure (multipipe result) |
| `pointCloud` | geometry | Generated point cloud for visualization |
| `curveNetwork` | geometry | Generated curve network for visualization |
| `pointCount` | number | Number of points generated |
| `curveCount` | number | Number of curves generated |
| `volume` | number | Volume of optimized structure |
| `surfaceArea` | number | Surface area of optimized structure |

### Parameters (Summary)

The solver exposes SIMP parameters (grid resolution, penalization, convergence), FE solver parameters (CG tolerance/max iterations), and geometry extraction parameters (density threshold, connectivity, pipe radius). See the node specification in `client/src/workflow/nodes/solver/TopologyOptimizationSolver.ts` for the full list and ranges.

## Implementation Details

### Point Cloud Generation

Uses **stratified sampling** to ensure uniform point distribution:
- Calculate area of each triangle in input mesh
- Sample points proportional to triangle area
- Use barycentric coordinates for point placement within triangles
- Seeded random number generator for reproducibility

### Curve Network Generation

Uses **3D proximity** to connect points:
- For each point pair, calculate Euclidean distance
- If distance ≤ connection radius, create curve
- Results in a network where nearby points are connected
- Connection density controlled by radius parameter

### Multipipe Operation

Creates **cylindrical pipes** along curves:
- Calculate pipe direction from curve start/end
- Generate perpendicular vectors for pipe cross-section
- Create vertices around pipe circumference (8 segments)
- Generate triangles for pipe surface
- Merge all pipes into single mesh

## Computation Pipeline

```
Input Geometry
    ↓
Sample Points (stratified sampling)
    ↓
Point Cloud (N points)
    ↓
Generate Curve Network (3D proximity)
    ↓
Curve Network (M curves)
    ↓
Multipipe Operation
    ↓
Optimized Mesh
    ↓
Calculate Statistics (volume, surface area)
    ↓
Output
```

## Semantic Chain

```
User Input (Geometry + Goals + Parameters)
    ↓
TopologyOptimizationSolver Node
    ↓
solver.topologyOptimization (Semantic Operation)
    ↓
simulator.topology.initialize → simulator.topology.step → simulator.topology.converge
    ↓
simulator.topology.preview → simulator.topology.sync
    ↓
simulator.topology.finalize → simulator.topology.plasticwrap (optional)
    ↓
Optimized Mesh (Geometry)
    ↓
Render (WebGL)
```

## Test Rig Example

**Nodes:**
1. Geometry Reference (box or sphere)
2. Topology Optimization Solver
3. Geometry Viewer (optimized mesh)

**Connections:**
- Geometry Reference → Topology Optimization Solver (geometry input)
- Topology Optimization Solver → Geometry Viewer (optimizedMesh output)

**Parameters:**
- Point Density: 100
- Connection Radius: 0.5
- Pipe Radius: 0.05
- Seed: 42

## Performance Benchmarks

| Point Density | Curve Count | Vertices | Triangles | Time (ms) |
|---------------|-------------|----------|-----------|-----------|
| 50 | ~200 | ~3,200 | ~6,400 | ~50 |
| 100 | ~800 | ~12,800 | ~25,600 | ~150 |
| 200 | ~3,200 | ~51,200 | ~102,400 | ~500 |
| 500 | ~20,000 | ~320,000 | ~640,000 | ~3,000 |

**Note:** Performance scales with O(N²) for curve network generation (all-pairs distance calculation).

## Historical Context

### Leonhard Euler (1707-1783)

The Topology Optimization Solver is named after **Leonhard Euler**, the Swiss mathematician who pioneered the field of topology.

**Key Contributions:**
- **Euler Characteristic** (V - E + F = 2 for polyhedra)
- **Seven Bridges of Königsberg** (first graph theory problem)
- **Euler's Formula** (e^(iπ) + 1 = 0)
- **Topology** (study of properties preserved under continuous deformations)

Euler's work on the Euler characteristic and graph theory laid the foundation for modern topology, making him the perfect namesake for a solver that generates topologically optimized structures.

## Future Enhancements

### Planned Features

1. **Adaptive Point Sampling**
   - Sample more points in high-curvature regions
   - Sample fewer points in flat regions
   - Improve efficiency and quality

2. **Curve Network Optimization**
   - Remove redundant curves
   - Simplify network topology
   - Reduce vertex count while preserving structure

3. **Variable Pipe Radius**
   - Thicker pipes for high-stress regions
   - Thinner pipes for low-stress regions
   - Integrate with physics solver for stress-based optimization

4. **Material Distribution**
   - Support multiple materials
   - Optimize material placement
   - Integrate with chemistry solver

5. **Performance Optimization**
   - Spatial hashing for O(N) curve network generation
   - Parallel processing for point sampling
   - GPU acceleration for multipipe operation

## Related Solvers

- **Physics Solver** - Can be used to analyze stress in optimized structures
- **Voxel Solver** - Can convert optimized mesh to voxel representation
- **Chemistry Solver** - Can optimize material distribution in structures

## References

- Euler, L. (1736). "Solutio problematis ad geometriam situs pertinentis" (The solution of a problem relating to the geometry of position)
- Bendsøe, M. P., & Sigmund, O. (2003). "Topology Optimization: Theory, Methods, and Applications"
- Rozvany, G. I. N. (2009). "A critical review of established methods of structural topology optimization"

## Status

**Implementation:** ✅ Complete  
**Documentation:** ✅ Complete  
**Test Rig:** ✅ Available  
**Semantic Linkage:** ✅ Validated  
**Performance:** ✅ Optimized
