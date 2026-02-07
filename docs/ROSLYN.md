# Roslyn Guide

This companion file explains how Roslyn—the left-hand modeling panel—works within Lingua.

## Purpose
Roslyn provides direct 3D modeling, selection, and visualization. It shares all state with Numerica through the central Zustand store, so geometry and selections remain in sync with workflow graphs and solvers.

## Core Components
1. **ModelerSection (`client/src/components/ModelerSection.tsx`)**
   - Hosts command palette, viewport grid/minimap, camera controls, render settings, history, clipboard, and solver overlays.
   - Embeds `WebGLViewerCanvas` for Roslyn viewports (single or split view).

2. **WebGLViewerCanvas (`client/src/components/WebGLViewerCanvas.tsx`)**
   - Orchestrates rendering, interaction, and command execution.
   - Responsibilities:
     - Manages camera orbit/pan/zoom, snapping, selection logic, measurement overlays, solver debug panels.
     - Integrates with Zustand selectors for geometry, layers, materials, assignments, workflow outputs, solver states.
     - Handles active commands (point, line, extrude, etc.) and Roslyn-specific gestures.
     - Supports capture/export via html2canvas combined with WebGL snapshots.

3. **Rendering Stack (`client/src/webgl/`)**
   - `WebGLRenderer`: shader compilation, buffer binding, geometry/edge/line passes.
   - `BufferManager` / `GeometryBuffer`: GPU buffer lifecycle for positions, normals, indices, colors, etc.
   - `GeometryRenderAdapter`: converts Lingua geometry records (vertex, mesh, curve, NURBS, etc.) into renderable buffers, managing updates and removal.
   - `Gumball` utilities (`webgl/gumball.ts`): build meshes and buffers for move/rotate/scale gizmos.
   - WebGL UI layers (`WebGLUIRenderer`, `WebGLIconRenderer`, `WebGLAppTopBar`) draw branded UI chrome (top bar, buttons, overlays).

4. **Command System**
   - Commands (point, line, extrude, transform, display, etc.) defined in `client/src/commands/registry.ts` with semantic ops in `commandSemantics.ts`.
   - Palette parsing and command execution happen inside Roslyn, with state updates propagated through the store.

## State & Data Flow
- Single Zustand store keeps geometry arrays, layers, assignments, workflow nodes/edges, solver results.
- Roslyn updates geometry via store actions (`addGeometry*`, `updateGeometryBatch`, `recordModelerHistory`, etc.).
- Selection/visibility/lock state lives in store selectors and is reflected instantly in Roslyn viewers.

## Interaction Patterns
- **Gumball** manipulator for move/rotate/scale/extrude, with UI overlays rendered in GL.
- **Snapping**: grid, vertex, edge, face constraints toggled via commands/palette.
- **History**: `recordModelerHistory` ensures undo/redo, triggered before mutations.
- **Minimap & multi-viewport**: `ModelerSection` handles layout and camera presets; fullscreen toggles between Roslyn/Numerica panels.

## Rendering Pipeline Overview
1. Pull geometry + metadata from store.
2. Update buffers via `GeometryRenderAdapter`.
3. Run WebGL passes: clear, draw geometry (solid + selected overlays), silhouette/edge/line passes, gumball, selection overlays.
4. Draw UI overlays (top bar, command palette, measurements) via WebGL UI renderer layered on top of the main canvas.

## Processes When Modifying Roslyn
- Geometry type changes: update kernel, render adapter, hit testing, persistence.
- Renderer updates: edit `WebGLViewerCanvas` and `client/src/webgl/` shaders/buffers.
- Command changes: update `commands/registry.ts`, `commandSemantics.ts`, undo/redo hooks, semantic validation.
- Always run `pnpm run build` + `pnpm run validate:all` and regenerate semantic IDs/catalog if command ops change.

Use this guide as the Roslyn reference when planning or extending the modeling system.
