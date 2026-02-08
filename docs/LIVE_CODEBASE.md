# LIVE CODEBASE

Parametric view of Lingua's actual codebase structure. See [LIVE_CODEBASE_DETAILS.md](./LIVE_CODEBASE_DETAILS.md) for file-level references.

## Root Structure
```
specificity-main/
├── client/           React + Vite frontend
├── server/           Express + Socket.IO backend
├── docs/             Documentation (this file lives here)
├── scripts/          Build/validation scripts
├── package.json      Monorepo scripts & dependencies
└── README.md         Project overview
```

## Client Architecture (`client/src/`)

### Core Systems
- `store/useProjectStore.ts` - Zustand state (geometry, workflow, history)
- `types.ts` - Core TypeScript types
- `App.tsx` - Main app component (Roslyn + Numerica panels)

### Roslyn (3D Modeling)
- `components/WebGLViewerCanvas.tsx` - WebGL viewport
- `components/ModelerSection.tsx` - Roslyn UI shell
- `webgl/WebGLRenderer.ts` - Core renderer
- `webgl/BufferManager.ts` - GPU buffers
- `webgl/ShaderManager.ts` - Shader compilation
- `geometry/renderAdapter.ts` - Geometry → WebGL
- `commands/registry.ts` - 90+ commands
- `commands/commandSemantics.ts` - Command → semantic ops

### Numerica (Workflow)
- `components/workflow/NumericalCanvas.tsx` - Node canvas
- `components/workflow/WorkflowSection.tsx` - Numerica shell
- `workflow/nodeRegistry.ts` - 170+ node definitions
- `workflow/workflowEngine.ts` - Node evaluation
- `workflow/nodes/solver/` - Solver nodes (Physics, Chemistry, Topology, Voxel)

### Semantic System
- `semantic/ontology/registry.ts` - LOC ontology registry
- `semantic/ontology/types.ts` - Entity types
- `semantic/ops/*.ts` - 297+ operations (geometry, math, solver, etc.)
- `semantic/operationRegistry.ts` - Operation storage

## Server (`server/src/`)
- `index.ts` - Express + Socket.IO, workflow compute API

## Documentation (`docs/`)
- `AGENTS.md` - Development rules & validation
- `ROSLYN.md` / `NUMERICA.md` - Subsystem guides
- `code_character.md` - Codebase character
- `ontological_map.md` - Full ontology
- `IF_THEN_BECAUSE.md` / `IF_THEN_BECAUSE_WHY.md` - Decision guides
- `memory_operating_guide.md` - Operating reference
- `LIVE_CODEBASE.md` - This file (actual structure)

## Key Relationships
```
UI → Command/Node → semanticOps → Operation → Backend
     ↓              ↓
  ontology ← validate:semantic
```

## Validation Scripts
- `validate:semantic` - Operation/node alignment
- `validate:commands` - Command coverage
- `validate:all` - Full validation suite
- `generate:semantic-ids` - Update operation IDs
- `generate:agent-catalog` - Update agent catalog
