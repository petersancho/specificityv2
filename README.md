# Specificity

Specificity is a custom parametric design environment that combines direct 3D
modeling with visual programming in a dual-panel workspace:

- Roslyn: the WebGL 3D modeling panel.
- Numerica: the canvas-based node graph panel.

Both panels share a single Zustand store so geometry, selection, and workflows
stay in sync.

## What Roslyn and Numerica Do

Roslyn focuses on direct interaction: command-driven geometry creation,
selection (object and component), and transform workflows through a custom
gizmo and WebGL renderer.

Numerica provides the same modeling power through nodes and edges. The workflow
engine uses pull-based lazy evaluation with caching, and node types mirror the
command system so direct and parametric workflows align.

## Architecture Highlights

- Custom geometry kernel in TypeScript (no external CAD library).
- WebGL-first rendering pipeline for viewport and UI surfaces.
- Canvas-based node editor with immediate-mode rendering patterns.
- Centralized state model in Zustand, with history/undo integration.
- Command registry + node registry designed to stay in lockstep.

## Repository Structure

- `client/`: Vite + React + TypeScript application (Roslyn + Numerica).
- `server/`: Express + Socket.IO backend for persistence and project I/O.
- `docs/`: architecture, conventions, command/node references, and specs.

Key entry points include `client/src/App.tsx`, `client/src/components/ModelerSection.tsx`,
`client/src/components/WebGLViewerCanvas.tsx`, `client/src/components/workflow/WorkflowSection.tsx`,
and `client/src/store/useProjectStore.ts`.

## Getting Started

Install dependencies from the repo root:

```bash
npm install
```

Start the full dev environment (server + client):

```bash
npm run dev
```

Useful alternatives:

```bash
npm run dev:server
npm run dev:client
```

Build everything:

```bash
npm run build
```

## Local Ports

- Client: `http://localhost:5173`
- Server: `http://localhost:3001`

The Vite client proxies `/api` and `/socket.io` to the server during
development.

## Environment

Copy `.env.example` to `.env` at the repo root:

```dotenv
SERVER_PORT=3001
CLIENT_PORT=5173
```

- `SERVER_PORT` sets the backend port (and the dev proxy target).
- `CLIENT_PORT` sets the Vite dev server port.
- Optional overrides: `VITE_API_BASE_URL` and `VITE_SOCKET_URL`.

## Documentation Map

Start here:

- Overview: `docs/specificity_readme.md`
- Architecture: `docs/specificity_architecture.md`
- Conventions: `docs/specificity_conventions.md`
- Subsystems: `docs/subsystems_guide.md`

Command and node alignment:

- Commands + nodes reference: `docs/commands_nodes_reference.md`
- Numerica spec: `docs/numerica_technical_spec.md`
- Panel UI spec: `docs/panel_ui_specification.md`

Rendering and geometry specs:

- Rendering style: `docs/GH2_RENDERING_STYLE.md`
- Geometry math: `docs/geometry_mathematics_spec.md`
- NURBS workflow: `docs/nurbs_workflow_spec.md`
