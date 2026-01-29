# Lingua WebGL Rendering Style Spec

This document defines the rendering and UI style for Lingua across both
panels:

- Roslyn: the 3D modeling viewport.
- Numerica: the node graph canvas.

The goal is a single, intentional visual system driven by crisp WebGL rendering
and a TypeScript-first geometry kernel.

## Design Intent

Lingua prioritizes legibility and precision over realism. The rendering
style should make geometric structure obvious at a glance while keeping the
workspace calm and non-distracting.

In short: *soft workspace, crisp geometry, decisive edges*.

## Visual Principles

- Workspace stays quiet: neutral backgrounds and disciplined grids.
- Geometry reads first: edges and silhouettes are always clear.
- Shading supports form, not drama: flat-biased lighting with limited specular.
- Modes are explicit: shaded, shaded-with-edges, ghosted, and wireframe each
  have a clear definition.
- UI matches the viewport: WebGL-rendered icons, text, and panels follow the
  same contrast rules and geometry-forward aesthetic.

## Workspace Style

### Background

- Use a light, neutral workspace tone that reduces glare and supports long
  modeling sessions.
- Avoid tinted gradients that compete with geometry.

### Grid

- Render both:
  1) a screen-space backdrop grid for orientation, and
  2) a world-space ground grid anchored at the origin.
- Minor grid lines should be subtle.
- Major grid lines should be clearly readable but never dominant.

## Geometry Style

### Shaded Surfaces

- Favor flat-shaded or flat-biased rendering so planar faces stay planar.
- Use a strong ambient term plus one primary key light.
- Keep specular response minimal to avoid glossy noise.
- Use consistent base colors that differentiate geometry without becoming a
  palette exercise.

### Edges and Silhouettes

- Edges are a primary readability system, not decoration.
- All meshes should generate a unique edge list.
- Render edges as a separate pass:
  1) visible edges (solid),
  2) hidden edges (dashed/dotted in ghosted and wireframe modes).

## Display Modes (Canonical Definitions)

These definitions must stay aligned across UI copy, command behavior, and the
WebGL pipeline.

### `shaded`

- Renders: mesh + grid.
- Edges: off.
- Hidden edges: off.

### `shaded_edges`

- Renders: mesh + grid + visible edges.
- Hidden edges: off.

### `ghosted`

- Renders: translucent mesh + grid + visible edges + hidden edges (dashed).
- Mesh opacity target: ~0.18–0.30.

### `wireframe`

- Renders: grid + edges only.
- Visible edges: solid.
- Hidden edges: dashed/dotted.

## WebGL Implementation Pattern

### Pipeline Overview

1) Clear to transparent (allow the workspace layer to show through).
2) Render the world-space ground grid.
3) Render meshes (skip in wireframe).
4) Render visible edges.
5) Render hidden edges with depth func = GREATER and dashed patterns.

### Required Systems

- Flat shading adapter: de-index meshes and compute per-face normals when
  needed.
- Edge index builder: extract unique edges per mesh.
- Edge shader: support solid and dashed patterns.
- Depth-function control: hidden-edge pass uses GREATER.

## Numerica Canvas: Matching the Style

Numerica should reuse the same visual grammar:

- Quiet background and disciplined grid.
- Strong borders and crisp drop shadows for node cards.
- Connection lines that are readable at a distance and decisive on hover and
  selection.
- Ports that are small but reliable, with labels that appear when zoomed in.

The graph editor should feel like a computational extension of the modeling
viewport rather than a separate product.

## Implementation Anchors

These modules are the primary integration points:

- `client/src/webgl/WebGLRenderer.ts`
  - display modes
  - edge shader program
  - hidden-edge pass orchestration
- `client/src/geometry/renderAdapter.ts`
  - flat shading adapter
  - edge extraction
- `client/src/components/WebGLViewerCanvas.tsx`
  - grid generation
  - display mode orchestration
- `client/src/components/workflow/NumericalCanvas.tsx`
  - canvas grid, node styling, and interaction ergonomics
- `client/src/webgl/ui/WebGLIconRenderer.ts`
  - icon atlas generation and icon identity system

## Color and Line Tokens

- Use the icon palette tokens in `icon_palette.md` for UI color alignment.
- Edge lines: default 1px, selected 2px; keep dashed hidden edges lighter than visible edges.
- Selection highlight should be high-contrast but limited to a single accent color.

## Performance Guardrails

- Avoid full re-tessellation on every frame; cache tessellations per geometry and invalidate only on changes.
- Keep hidden-edge passes minimal; skip when not in ghosted or wireframe modes.
- Favor instanced rendering for repeated primitives like points or vertex markers.

## Guardrails

- Favor clarity over novelty.
- The grid must aid orientation but never compete with geometry.
- Edges should remain readable under all display modes.
- When uncertain, reduce visual complexity and increase structural contrast.
