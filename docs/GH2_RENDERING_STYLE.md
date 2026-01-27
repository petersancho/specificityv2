# Grasshopper 2 "Crystal" Rendering Style Spec

This document codifies the rendering look shown in the Grasshopper 2 Crystal
preview screenshots. The goal is to make Roslyn (3D) and Numerica (node canvas)
feel like a single, intentional visual system driven by crisp WebGL rendering.

## What This Look Is

The GH2 Crystal preview reads as:

- **Light, matte workspace**: an ivory canvas with a subtle gray grid.
- **Flat-ish shading**: faces read as planar, with gentle light variation.
- **Hard black outlines**: silhouettes and feature edges are always legible.
- **Engineering modes**: ghosted and wireframe modes reveal internal structure.

In short: *soft background, hard geometry*.

## Visual Ingredients

### Workspace

- Background: warm off-white / ivory.
- Grid: thin neutral gray, with slightly darker major divisions.
- The grid should exist both as a **screen-space backdrop** and as a **3D ground
  grid** anchored at the origin.

### Shaded Geometry

- Base material: a saturated mid-tone (teal/gold/etc.).
- Lighting: strong ambient term plus a single directional/positional light.
- Specular: minimal or none.
- Normals: treat meshes as **flat shaded by default** to preserve planar reads.

### Outlines and Feature Edges

- All meshes should generate a unique edge list.
- Render edges as a separate pass:
  1) visible edges (solid),
  2) hidden edges (dashed/dotted in ghosted and wireframe).

## Display Modes (Canonical Definitions)

These definitions should be used consistently across UI and code.

### `shaded`

- Renders: mesh + grid.
- Edges: off.
- Hidden edges: off.

### `shaded_edges`

- Renders: mesh + grid + **visible** edges.
- Hidden edges: off.

### `ghosted`

- Renders: translucent mesh + grid + visible edges + hidden edges (dashed).
- Mesh opacity: ~0.18–0.28.

### `wireframe`

- Renders: grid + edges only.
- Visible edges: solid.
- Hidden edges: dashed/dotted.

## WebGL Implementation Pattern

### Pipeline Overview

1) Clear to transparent (let CSS/background grid show through).
2) Render 3D ground grid.
3) Render mesh (unless wireframe).
4) Render visible edges.
5) Render hidden edges (depth func = GREATER, dashed).

### Required Systems

- **Flat shading adapter**: de-index meshes and compute per-face normals.
- **Edge index builder**: extract unique mesh edges for line rendering.
- **Edge shader**: supports dashed patterning for hidden edges.
- **Depth-function control**: render hidden edges with depth func GREATER.

## Numerica Canvas: Matching the Style

Numerica should borrow the same visual grammar:

- Canvas background: ivory.
- Canvas grid: neutral gray with major divisions.
- Nodes: cream fill, black border, crisp black drop shadow.
- Edges: dark gray/black, slightly thicker on hover/selection.
- Ports: small, legible, and labeled when zoomed in.

## Node Categories (Ontologized)

Categories should be explicit and stable so new nodes "drop into" a design
system instead of being one-off additions.

Recommended top-level categories:

- **Data**: references, parameters, constants
- **Primitives**: point, box, sphere
- **Curves**: polyline, curve, arc, circle
- **Surfaces**: surface, loft, extrude, sweep
- **Transforms**: move, rotate, scale, mirror, align
- **Analysis**: measure, evaluate, inspect
- **Optimization**: topology, voxel, evolutionary

Even if some categories are sparsely populated today, the catalog should exist
now so we can scale without redesign.

## Current Implementation Anchors

The following modules are the primary implementation hooks:

- `client/src/webgl/WebGLRenderer.ts`
  - edge shader program
  - dashed hidden-edge pass
  - clear-color control
- `client/src/geometry/renderAdapter.ts`
  - flat shading adapter
  - edge index extraction
- `client/src/components/WebGLViewerCanvas.tsx`
  - grid generation
  - display mode orchestration
- `client/src/components/workflow/NumericalCanvas.tsx`
  - ivory palette + grid
  - node card styling
  - pan/zoom ergonomics

## Notes and Guardrails

- Prioritize **legibility over realism**.
- The grid should help orientation but never compete with geometry.
- Edges are not decoration; they are the primary readability system.
- When in doubt: "soft background, hard geometry."

