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
- **Complete solver infrastructure** with automatic geometry output and gradient visualization.

## Solver Infrastructure

Lingua includes four production-ready solvers with automatic mesh generation and beautiful gradient-colored visualization:

### Physics Solver
- Finite element analysis (FEA) for stress and deformation
- Automatic stress gradient visualization (blue → red)
- Hero geometry: cantilever bracket with stress concentration

### Chemistry Solver
- Material blending and chemical reactions
- Multi-material particle simulation
- Per-material color visualization
- Hero geometry: multi-material cylindrical vessel

### Voxel Solver
- Topology optimization for weight reduction
- Density-based material removal
- Density gradient visualization (black → white)
- Hero geometry: perforated lattice structure

### Biological Solver
- Evolution and fitness-based optimization
- Branching growth simulation
- Fitness gradient visualization (red → green)
- Hero geometry: vascular network structure

All solvers automatically produce mesh geometry with gradient-colored vertices for scientific visualization. No manual post-processing required.

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

## Testing & Validation

Lingua includes comprehensive test rigs and validation frameworks:

- **Standalone Test Rigs**: Each solver has a dedicated test rig in `client/src/test-rig/solvers/`
- **Validation Framework**: Robust voxel grid validation with floating-point tolerance
- **Console Reports**: Beautiful test reports with geometry verification and performance metrics
- **Hero Geometry**: Production-quality test cases for each solver

Run test rigs independently without the UI for rapid development and debugging.

## Recent Improvements

- **31,000+ lines of dead code removed** for a cleaner, more maintainable codebase
- **WebGL index validation** prevents rendering errors and provides clear diagnostics
- **Enhanced MaterialGoal diagnostics** with real-time material distribution monitoring
- **Gradient color system** with multiple scientific visualization palettes (stress, density, fitness)
- **Comprehensive documentation** including solver test rig setup guides

## Documentation

Start with `docs/README.md` for the full documentation map. Core references:

- Overview: `docs/lingua_readme.md`
- Architecture: `docs/lingua_architecture.md`
- Conventions: `docs/lingua_conventions.md`
- AI agent notes: `docs/ai_agent_guide.md`
- Solver test rig setup: `docs/solver_test_rig_setup.md`
- Ontology treatise prompt: `docs/lingua_ontology_comprehensive_prompt_v2.md`
