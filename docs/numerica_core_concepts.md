# Numerica Core Concepts

Updated: 2026-01-30

This document explains how Numerica evaluates graphs, how data types flow, and how to think about parameters versus inputs.

## 1) Graph Anatomy

A Numerica graph is made of:

- **Nodes**: computations (create geometry, analyze, transform, solve)
- **Ports**: typed inputs and outputs
- **Edges**: connections between ports
- **Parameters**: per‑node settings not connected by edges

### Port Types

| Type | Meaning | Example Nodes |
| --- | --- | --- |
| number | Scalar numeric value | Number, Slider, Math nodes |
| vector | 3D vector (x,y,z) | Vector Construct, Move Vector |
| geometry | Reference to Roslyn geometry | Geometry Reference, Loft |
| goal | Solver goal specification | Stiffness Goal, Growth Goal |
| solverResult | Solver output payload | Physics Solver |
| any | Generic value | Panel, Metadata Panel |

## 2) Inputs vs Parameters

- **Inputs** are values coming from upstream nodes.
- **Parameters** are values stored inside the node.
- Many ports are **parameter‑backed**: if no edge is connected, the node will read the parameter value instead.

This means you can wire nodes **or** type values directly.

## 3) Evaluation Order

Numerica evaluates lazily:

1. A node output is requested (by a downstream node or preview)
2. If cached and clean → return cached output
3. If dirty → evaluate upstream dependencies, then compute

Dirty state is propagated when inputs or parameters change.

## 4) Default Output Selection

Each node defines a **primary output**. When a node is connected automatically (e.g., via a helper), Numerica uses the primary output when possible.

## 5) Geometry Ownership

Some nodes generate new geometry in Roslyn (geometry‑owning nodes). These nodes output geometry IDs that reference stored geometry records. Downstream geometry nodes operate on IDs rather than raw meshes.

## 6) Solver Goals Pattern

Solvers accept **goal** inputs. Goals are computed by separate nodes and passed into solver inputs as structured specifications.

```
Stiffness Goal →
Load Goal     →  Physics Solver → Geometry + Result
Anchor Goal   →
```

## 7) Lists and Nested Data

List nodes operate on arrays and nested arrays:

- `List Create` packs values into a list
- `List Flatten` reduces nesting depth
- `List Slice` extracts sub‑ranges

Be explicit about list depth when connecting nodes that expect flat lists.

## 8) Geometry vs Mesh vs B‑Rep

Numerica references geometry that can be:

- Mesh (discrete triangles)
- NURBS (analytic curves/surfaces)
- B‑Rep (solid topology)

Conversions are explicit; see `docs/numerica_interchange.md`.

