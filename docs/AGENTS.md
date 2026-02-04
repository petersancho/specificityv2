# AGENTS.md

## Build & Test
- Install: `pnpm install`
- Dev: `pnpm dev`
- Test: `pnpm test`
- Validate: `pnpm run validate:all`
- Semantic validation: `pnpm run validate:semantic`
- Generate semantic IDs: `pnpm run generate:semantic-ids`
- Generate agent catalog: `pnpm run generate:agent-catalog`
- Validate semantic integration: `pnpm run validate:semantic-integration`

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
- **New solver/simulator**: Create YAML schema → generate:agent-catalog → validate:semantic-integration

## Semantic Integration System

### YAML Schemas
Operations with complex validation can define YAML schemas in `client/src/semantic/schemas/`:
- **Parameters**: Type, unit, default, constraints (range, min, max, enum, custom)
- **Inputs/Outputs**: Type, description, validation rules, postconditions
- **Invariants**: Preconditions, postconditions, mathematical invariants
- **Examples**: Test cases with expected results
- **Versioning**: Semantic versioning with migration paths

### Agent Catalog
AI agents discover operations through `docs/semantic/agent-catalog.json`:
- Generated from YAML schemas via `pnpm run generate:agent-catalog`
- Machine-readable operation metadata
- Parameter constraints and validation rules
- Mathematical invariants and postconditions
- Links to schema files for detailed validation

### Integration Validation
`pnpm run validate:semantic-integration` ensures:
- All schema operations exist in operations.json
- All schema operations exist in agent_capabilities.json
- Schema IDs match catalog keys
- Parameter counts match between schema and catalog
- Invariant counts match between schema and catalog
- Operations have proper ontological completeness

### Benefits for AI Agents
- **Discover operations** through agent-catalog.json
- **Validate parameters** using YAML schemas before execution
- **Understand constraints** via mathematical invariants
- **Navigate codebase** ontologically through semantic links
- **Suggest fixes** based on validation rules and postconditions
- **Verify correctness** through invariant checking
