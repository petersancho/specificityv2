# AGENTS.md

## Build & Test
- Install: `pnpm install`
- Dev: `pnpm dev`
- Test: `pnpm test`
- Validate: `pnpm run validate:all`
- Semantic validation: `pnpm run validate:semantic`
- Generate semantic IDs: `pnpm run generate:semantic-ids`

## Code Style
- TypeScript strict mode
- Single quotes, no semicolons
- Functional patterns preferred
- Pure geometry functions (no mutation)

## Architecture
- Zustand store is single source of truth
- WebGL rendering in `client/src/webgl/`
- Geometry kernel in `client/src/geometry/`
- Workflow canvas in `client/src/components/workflow/`
- Semantic ops in `client/src/semantic/ops/`

## Key Files
- Store: `client/src/store/useProjectStore.ts`
- Types: `client/src/types.ts`
- Viewport: `client/src/components/WebGLViewerCanvas.tsx`
- Commands: `client/src/commands/registry.ts`
- Nodes: `client/src/workflow/nodeRegistry.ts`

## Do
- Run `validate:semantic` after adding operations
- Use `recordModelerHistory` before geometry mutations
- Keep store mutations atomic (single `set` call)
- Add `semanticOps` array to nodes that perform computation
- Register commands in both registry and commandSemantics

## Don't
- Commit without running `pnpm run validate:all`
- Use Three.js types in persisted state
- Hard-code tolerances (use config)
- Mutate geometry in place (return new records)
- Add nodes without updating nodeRegistry

## Change Checklist
- **New geometry type**: types.ts → kernel ops → render adapter → hit testing → persistence
- **New command**: registry.ts → commandSemantics.ts → undo/redo hooks
- **New workflow node**: nodeRegistry.ts → validate:semantic → compute function
- **New semantic op**: ops/{domain}Ops.ts → generate:semantic-ids → validate:semantic
