# Lingua

Lingua is a custom parametric design environment that pairs direct 3D
modeling (Roslyn) with a visual programming canvas (Numerica). Both panels share
one Zustand store so geometry, selection, and workflows stay in sync.

## Highlights

- Dual-panel workspace: WebGL modeler + canvas-based workflow editor.
- Custom geometry kernel in TypeScript (no external CAD library).
- Raw WebGL renderer with custom GLSL shaders; Three.js used for math and
  primitive mesh generation.
- Command system and node system designed to stay aligned.
- Unified state management with history/undo across modeling and workflow.

## Repository Structure

- `client/`: Vite + React + TypeScript application (Roslyn + Numerica).
- `server/`: Express + Socket.IO backend for persistence and project I/O.
- `docs/`: architecture, conventions, specs, and references.

Key entry points include `client/src/App.tsx`,
`client/src/components/ModelerSection.tsx`,
`client/src/components/WebGLViewerCanvas.tsx`,
`client/src/components/workflow/WorkflowSection.tsx`, and
`client/src/store/useProjectStore.ts`.

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

## Documentation

Start with `docs/README.md` for the full documentation map. Core references:

- Overview: `docs/lingua_readme.md`
- Architecture: `docs/lingua_architecture.md`
- Conventions: `docs/lingua_conventions.md`
- AI agent notes: `docs/ai_agent_guide.md`
