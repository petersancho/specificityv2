# Phase 8L: Wire Semantic Operations to Nodes

**Date**: 2026-01-31  
**Status**: In Progress  
**Goal**: Wire semantic operations to nodes, reduce orphan operations, increase semantic coverage

---

## Current State

### Statistics
- **Total Operations**: 195
- **Total Nodes**: 194
- **Nodes with semanticOps**: 47 (24.2% coverage)
- **Orphan Operations**: 132 (67.7%)
- **Dangling References**: 0 (0%)

### Problem
We have defined 195 semantic operations but only 47 nodes (24.2%) use them. This means 132 operations (67.7%) are orphaned - defined but never used. This breaks the semantic linkage that allows Lingua to "speak to itself".

---

## Goal

**Increase semantic coverage from 24.2% to 80%+ by wiring orphan operations to appropriate nodes.**

This will:
1. Reduce orphan operations from 132 to <40
2. Increase node coverage from 47 to 155+ nodes
3. Enable Lingua to fully "speak to itself" through semantic operations
4. Ensure geometry kernel powers commands, nodes, solvers, and simulators

---

## Orphan Operations by Domain

### Math Operations (35 orphans)
- Arithmetic: `add`, `subtract`, `multiply`, `divide`, `modulo`, `power`, `negate`
- Rounding: `floor`, `ceil`, `round`, `abs`
- Trigonometry: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`
- Exponential: `exp`, `log`, `log10`, `sqrt`
- Comparison: `equal`, `notEqual`, `lessThan`, `lessThanOrEqual`, `greaterThan`, `greaterThanOrEqual`
- Utility: `lerp`, `clamp`, `min`, `max`

**Action**: Wire to math nodes (Add, Subtract, Multiply, Divide, Modulo, Power, Floor, Ceil, Round, Abs, Sin, Cos, Tan, etc.)

### Logic Operations (6 orphans)
- `logic.and`, `logic.or`, `logic.not`, `logic.xor`, `logic.if`, `logic.compare`

**Action**: Wire to logic nodes (And, Or, Not, Xor, If, Compare)

### Data Operations (9 orphans)
- `data.collect`, `data.flatten`, `data.filter`, `data.map`, `data.reduce`, `data.sort`, `data.unique`, `data.length`, `data.index`

**Action**: Wire to data nodes (Collect, Flatten, Filter, Map, Reduce, Sort, Unique, Length, Index)

### String Operations (8 orphans)
- `string.concat`, `string.split`, `string.replace`, `string.substring`, `string.length`, `string.toNumber`, `string.format`

**Action**: Wire to string nodes (Concat, Split, Replace, Substring, Length, ToNumber, Format)

### Color Operations (6 orphans)
- `color.hexToRgb`, `color.rgbToHex`, `color.rgbToHsl`, `color.hslToRgb`, `color.blend`, `color.clamp`

**Action**: Wire to color nodes (HexToRgb, RgbToHex, RgbToHsl, HslToRgb, Blend, Clamp)

### Vector Operations (3 orphans)
- `vector.multiply`, `vector.divide`, `vector.distance`

**Action**: Wire to vector nodes (VectorMultiply, VectorDivide, VectorDistance)

### Workflow Operations (2 orphans)
- `workflow.identity`, `workflow.constant`

**Action**: Wire to workflow nodes (Identity, Constant)

### Simulator Operations (12 orphans)
- Chemistry: `simulator.chemistry.initialize`, `simulator.chemistry.step`, `simulator.chemistry.converge`, `simulator.chemistry.finalize`, `simulator.chemistry.blendMaterials`, `simulator.chemistry.evaluateGoals`
- Physics: `simulator.physics.initialize`, `simulator.physics.step`, `simulator.physics.converge`, `simulator.physics.finalize`, `simulator.physics.applyLoads`, `simulator.physics.computeStress`

**Action**: Wire to simulator dashboard components (already created in Phase 8G+8H)

### Command Operations (51 orphans)
- Creation: `command.createPoint`, `command.createLine`, `command.createPolyline`, `command.createRectangle`, `command.createCircle`, `command.createArc`, `command.createCurve`, `command.createPrimitive`, `command.createNurbsBox`, `command.createNurbsSphere`, `command.createNurbsCylinder`
- Operations: `command.boolean`, `command.loft`, `command.surface`, `command.extrude`, `command.meshMerge`, `command.meshFlip`, `command.meshThicken`, `command.morph`
- Conversions: `command.meshConvert`, `command.brepToMesh`, `command.meshToBrep`, `command.nurbsRestore`, `command.interpolate`
- Transforms: `command.move`, `command.rotate`, `command.scale`, `command.offset`, `command.mirror`, `command.array`, `command.transform`
- UI: `command.undo`, `command.redo`, `command.copy`, `command.paste`, `command.duplicate`, `command.delete`, `command.cancel`, `command.confirm`, `command.gumball`, `command.focus`, `command.frameAll`, `command.screenshot`, `command.view`, `command.camera`, `command.pivot`, `command.orbit`, `command.pan`, `command.zoom`, `command.selectionFilter`, `command.cycle`, `command.snapping`, `command.grid`, `command.cplane`, `command.display`, `command.isolate`, `command.outliner`, `command.tolerance`, `command.status`

**Action**: Wire to command handlers in `client/src/commands/` (already exist, just need semantic linkage)

---

## Implementation Strategy

### Phase 1: Wire Math, Logic, Data, String, Color, Vector, Workflow Operations
**Target**: 69 operations → 69 nodes
**Estimated Time**: 2-3 hours

1. Identify all math/logic/data/string/color/vector/workflow nodes in nodeRegistry.ts
2. Add `semanticOps` field to each node definition
3. Validate that operations are correctly wired

### Phase 2: Wire Simulator Operations to Dashboards
**Target**: 12 operations → 3 dashboards
**Estimated Time**: 1-2 hours

1. Update EvolutionarySimulatorDashboard to use `simulator.evolutionary.*` operations
2. Update ChemistrySimulatorDashboard to use `simulator.chemistry.*` operations
3. Update PhysicsSimulatorDashboard to use `simulator.physics.*` operations

### Phase 3: Wire Command Operations to Command Handlers
**Target**: 51 operations → 51 commands
**Estimated Time**: 2-3 hours

1. Update command handlers in `client/src/commands/` to declare `semanticOps`
2. Ensure command registry links to semantic operations

### Phase 4: Validate and Generate Reports
**Target**: 0 errors, <40 orphan operations
**Estimated Time**: 1 hour

1. Run `npm run validate:integrity`
2. Generate updated semantic inventory
3. Verify coverage is 80%+

---

## Success Criteria

1. ✅ Node semantic coverage ≥ 80% (155+ nodes with semanticOps)
2. ✅ Orphan operations ≤ 40 (down from 132)
3. ✅ All validation passing (0 errors, 0 dangling references)
4. ✅ Semantic inventory updated
5. ✅ Lingua can "speak to itself" through semantic operations

---

## Timeline

- **Phase 1**: 2-3 hours
- **Phase 2**: 1-2 hours
- **Phase 3**: 2-3 hours
- **Phase 4**: 1 hour
- **Total**: 6-9 hours

---

## Next Steps After Phase 8L

**Phase 8M**: Connect Solvers to Geometry Kernel
- Ensure all solvers receive geometry through kernel
- Standardize solver input/output contracts
- Wire solver results to renderer

**Phase 8N**: Connect Dashboards to Solvers via Semantic Operations
- Implement semantic runtime executor
- Route dashboard actions through semantic operations
- Subscribe dashboards to solver events

**Phase 8O**: Final Semantic Integration & Validation
- End-to-end testing of semantic linkage
- Performance optimization
- Documentation finalization

---

**Status**: Ready to begin Phase 1
