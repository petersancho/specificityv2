# Numerica Rendering & WebGL Previews

Updated: 2026-01-30

Numerica renders all nodes on a canvas. Geometry previews are generated through the workflow evaluation engine and displayed via dedicated viewer nodes.

## 1) Preview Nodes

- **Geometry Viewer** (`geometryViewer`): renders geometry outputs in a mini viewport.
- **Metadata Panel** (`metadataPanel`): inspect geometry attributes.
- **Panel** (`panel`): inspect scalar or string outputs.

## 2) Preview Modes

- Mesh previews use the same mesh pipeline as Roslyn.
- Edge display and shading follow `docs/webgl_rendering_style.md`.

## 3) Selection & Interaction

- Nodes and edges are selected with click.
- Multiple selection uses Ctrl/Cmd.
- Box selection uses click‑drag.

## 4) Performance Notes

- Heavy previews (voxel grids, large meshes) can be slow.
- Use lower resolution or preview nodes sparingly when iterating.

