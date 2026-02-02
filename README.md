# Lingua

Lingua is a custom parametric design environment that pairs direct 3D
modeling (Roslyn) with a visual programming canvas (Numerica). Both panels share
one Zustand store so geometry, selection, and workflows stay in sync.

## Philosophy

**Language as Foundation.** Lingua means "language"—the universal substrate through which all knowledge becomes accessible. In an age of AI and machine learning, language is not merely communication; it is the medium through which machines understand reality and humans express intent.

**The Trinity Architecture.** Three equal, sovereign domains work in harmony:
- **Lingua** (Language): Sovereign in meaning, intention, and qualitative understanding
- **Roslyn** (Geometry): Sovereign in space, form, and spatial intuition
- **Numerica** (Numbers): Sovereign in quantity, precision, and calculation

**Ownership Over Convenience.** We build our own geometry kernel, WebGL renderer, and workflow editor. Full ownership means full control—no black boxes, no compromises, no dependencies on external CAD libraries that constrain our vision.

**Specificity in Uncertainty.** Even in a probabilistic AI era, precision and exactness remain essential. Lingua embraces both the "cloudy" ambiguity of human intuition and the sharp specificity of computational geometry.

**Intellectual Continuity.** Our solvers honor ancient traditions—named after Greek mathematicians (Pythagoras, Euclid, Archimedes, Apollonius)—while preparing for convergent futures where disciplines blend and AI enables cross-domain translation.

## Highlights

- Dual-panel workspace: WebGL modeler + canvas-based workflow editor.
- Custom geometry kernel in TypeScript (no external CAD library).
- Raw WebGL renderer with custom GLSL shaders; Three.js used for math and
  primitive mesh generation.
- Command system and node system designed to stay aligned.
- Unified state management with history/undo across modeling and workflow.
- **Complete solver infrastructure** with automatic geometry output and gradient visualization.

## Solver Infrastructure

Lingua includes five production-ready solvers with automatic mesh generation and beautiful gradient-colored visualization. Each solver embodies a different mode of optimization, reflecting diverse approaches to form-finding and material organization.

### Physics Solver (Pythagoras)
- Finite element analysis (FEA) for stress and deformation
- Automatic stress gradient visualization (blue → red)
- Hero geometry: cantilever bracket with stress concentration
- *Honors the tradition of mathematical physics and structural analysis*

### Chemistry Solver (Apollonius)
- Material blending and chemical reactions
- Multi-material particle simulation
- Per-material color visualization
- Hero geometry: multi-material cylindrical vessel
- *Explores material interaction and transformation*

### Topological Optimization Solver (Euclid)
- Topology optimization for weight reduction and structural efficiency
- Density-based material removal guided by stress and load paths
- Density gradient visualization (black → white)
- Hero geometry: perforated lattice structure
- *Discovers optimal material distribution through iterative refinement*

### Voxel Solver (Archimedes)
- Volumetric discretization and voxel-based analysis
- Density field manipulation and spatial optimization
- Gradient visualization for density distribution
- Hero geometry: voxelized structural forms
- *Operates in the discrete spatial domain of volumetric elements*

### Biological Solver (Galen)
- Reaction-diffusion morphogenesis (Gray-Scott model)
- Generates organic, biological patterns through chemical dynamics
- Concentration gradient visualization (blue → red)
- Hero geometry: coral-like structures with emergent patterns
- *Explores emergent pattern formation through computational chemistry*

All solvers automatically produce mesh geometry with gradient-colored vertices for scientific visualization. No manual post-processing required. Each solver represents a distinct philosophical approach to computational design—from the deterministic precision of physics to the emergent complexity of biological morphogenesis.

## Repository Structure

- `client/`: Vite + React + TypeScript application (Roslyn + Numerica).
- `server/`: Express + Socket.IO backend for persistence and project I/O.
- `docs/`: Architecture, conventions, specs, and philosophical foundations.

Key entry points include `client/src/App.tsx`,
`client/src/components/ModelerSection.tsx`,
`client/src/components/WebGLViewerCanvas.tsx`,
`client/src/components/workflow/WorkflowSection.tsx`, and
`client/src/store/useProjectStore.ts`.

The codebase reflects our philosophy of ownership: every major system—from the geometry kernel to the WebGL renderer to the workflow canvas—is custom-built and fully understood.

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

Lingua includes comprehensive test rigs and validation frameworks, reflecting our commitment to specificity and precision:

- **Standalone Test Rigs**: Each solver has a dedicated test rig in `client/src/test-rig/solvers/`
- **Validation Framework**: Robust voxel grid validation with floating-point tolerance and epsilon handling
- **Console Reports**: Beautiful test reports with geometry verification and performance metrics
- **Hero Geometry**: Production-quality test cases for each solver, serving as both validation and demonstration

Run test rigs independently without the UI for rapid development and debugging. Validation prevents silent failures and ensures computational integrity—specificity matters, even in uncertain domains.

## Core Capabilities

Lingua is a complete parametric design environment with powerful computational tools:

- **Dual-Panel Workspace**: Seamless integration between 3D modeling (Roslyn) and visual programming (Numerica)
- **Custom Geometry Kernel**: Full ownership of geometric operations—no external CAD dependencies
- **WebGL Rendering**: Raw WebGL with custom GLSL shaders for pixel-perfect control and performance
- **Four Production Solvers**: Physics, Chemistry, Topological Optimization, and Voxel solvers with automatic mesh output
- **Gradient Visualization**: Scientific visualization with stress, density, and material distribution gradients
- **Real-Time Diagnostics**: Material distribution monitoring, solver convergence tracking, and performance metrics
- **Unified State Management**: Zustand-based store with history/undo across modeling and workflow
- **Validation Framework**: Robust validation with floating-point tolerance prevents silent failures
- **Standalone Test Rigs**: Independent solver testing without UI for rapid development
- **Clean Codebase**: 31,000+ lines of dead code removed for maintainability and clarity

Every capability reflects our philosophy: ownership over convenience, specificity in uncertainty, and tools that amplify human creativity while maintaining full transparency and control.

## Documentation

Start with `docs/README.md` for the full documentation map. Core references:

- **Philosophy**: `docs/philosophy.md` - The linguistic turn, trinity architecture, and intellectual foundations
- **Overview**: `docs/lingua_readme.md` - Project vision and inspirations
- **Architecture**: `docs/lingua_architecture.md` - Technical design and system organization
- **Conventions**: `docs/lingua_conventions.md` - Code style and organizational principles
- **AI Agent Guide**: `docs/ai_agent_guide.md` - Collaboration patterns and agent guidelines
- **Solver Test Rig Setup**: `docs/solver_test_rig_setup.md` - Comprehensive testing guide
- **Ontology Treatise**: `docs/lingua_ontology_comprehensive_prompt_v2.md` - Deep conceptual framework

The documentation reflects our belief that understanding precedes mastery. We document not just *what* and *how*, but *why*—the philosophical foundations that guide every technical decision.
