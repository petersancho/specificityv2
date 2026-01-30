# Numerica Glossary

Updated: 2026-01-30

## Core Concepts

- **Dirty Flag**: Internal marker indicating a node needs recomputation.
- **Domain**: Geometry defining a solver's spatial scope.
- **Goal Node**: Node that outputs a structured constraint/objective for a solver.
- **Parameter**: Stored node setting used when no input is connected.
- **Port**: Input/output connection point on a node.
- **Solver**: Iterative optimizer that searches for a solution.

## Geometry Terms

- **B-Rep**: Topological solid model referencing surfaces and edges.
- **C-Plane**: Construction plane for geometry creation in Roslyn.
- **Gumball**: Transform gizmo for move/rotate/scale.
- **Isosurface**: Surface extracted from a voxel density field.
- **Mesh**: Triangle representation of geometry.
- **NURBS**: Analytic curves/surfaces defined by control points and knots.
- **Tessellation**: Converting analytic geometry to triangles.
- **Voxel**: Discrete grid cell used for volumetric analysis.

## Biological Solver Terms

- **Fitness**: Numeric score used to rank genomes.
- **Genome**: Vector of parameters evolved by the Biological Solver.
- **Phenotype**: Geometry produced from a genome.

## Physics Solver Terms

- **Anchor Goal**: Fixed boundary condition defining supports (Ἄγκυρα).
- **Boundary Condition**: Constraint on the edge or support of a structural system.
- **Deformed Mesh**: Mesh output from physics solver showing displacement.
- **Displacement**: Per-vertex movement from original position.
- **Equilibrium**: State where internal forces balance external loads (Kd = F).
- **Load Goal**: External force applied to a structure (Βάρος).
- **Stiffness Goal**: Material resistance to deformation (Σκληρότης).
- **Stiffness Matrix (K)**: Global matrix representing structural stiffness.
- **Stress Field**: Per-element stress values from structural analysis.
- **Volume Goal**: Constraint on material volume/mass (Ὄγκος).

## Chemistry Solver Terms

- **Blend Goal**: Enforce smooth material gradients.
- **Material Gradient**: Gradual transition between materials.
- **Mass Goal**: Minimize density/mass in target regions.
- **Thermal Goal**: Balance heat flow in composite materials.
- **Transparency Goal**: Maximize optical transmission.
