# UI Philosophy: Lingua as a Responsive Language-Based Modeling Tool

## Core Principle

**"The UI is a render of the backend, not a structured 'boxy' static software."**

Lingua is a responsive language-based modeling tool that leverages words and math to produce geometry with human-induced connective inputs that allow everything to "click" in variable, decimally precise ways. The UI must reflect this philosophy at every level.

---

## Permanent Architectural Rules

### 1. Backend as Source of Truth

**All user-facing text must originate from backend definitions.**

- ✅ **Node labels** → `node.label` from `WorkflowNodeDefinition`
- ✅ **Port labels** → `port.label` from `WorkflowPortSpec`
- ✅ **Parameter labels** → `parameter.label` from `WorkflowParameterSpec`
- ✅ **Descriptions** → `node.description`, `port.description`, `parameter.description`
- ✅ **Context menu items** → Derived from node definitions, not hardcoded

**Example:**
```typescript
// ❌ BAD: Hardcoded UI string
label: "Add Text Note"

// ✅ GOOD: Derived from backend
const textNoteDef = getNodeDefinition("textNote");
label: textNoteDef ? `Add ${textNoteDef.label}` : "Add Text Note"
```

---

### 2. UI Responsiveness to Backend Changes

**The UI must automatically reflect backend changes without code modifications.**

If a node's label changes in the backend, the UI should automatically update everywhere:
- Node palette
- Context menus
- Tooltips
- Documentation
- Search results

**This ensures:**
- Single source of truth
- No semantic drift
- Consistent terminology
- Easier refactoring

---

### 3. Semantic Correctness Over Convenience

**Every UI string must be semantically correct and aligned with backend reality.**

**Example of Semantic Incorrectness:**
- VoxelSolver implementation note said "topology optimization" when it's actually a simple voxelizer
- Fixed by updating the description to match the actual implementation

**Rule:** If the UI says something, the backend must do exactly that. No approximations, no outdated descriptions.

---

### 4. Language as Parameters

**Lingua uses language as parameters for log-scale malleability.**

The UI should expose the linguistic precision of the backend:
- Precise parameter names (not generic "Value" or "Amount")
- Semantic port types (geometry, mesh, voxelGrid, not just "data")
- Clear descriptions that explain mathematical/geometric meaning
- CMYK color system for semantic type categorization

**Example:**
```typescript
// ❌ BAD: Generic, meaningless
{ key: "value", label: "Value", type: "number" }

// ✅ GOOD: Semantic, precise
{ key: "resolution", label: "Resolution", type: "number", 
  description: "Number of voxels along the longest axis (4-128)." }
```

---

## Implementation Guidelines

### Context Menu Items

**All context menu items should be derived from backend definitions.**

**Before:**
```typescript
actions.push({
  label: "Add File (STL)",
  onSelect: closeMenu(() => openStlFilePicker(world, null)),
});
```

**After:**
```typescript
const stlImportDef = getNodeDefinition("stlImport");
actions.push({
  label: stlImportDef ? `Add ${stlImportDef.label}` : "Add File (STL)",
  onSelect: closeMenu(() => openStlFilePicker(world, null)),
});
```

---

### Node Descriptions

**All node descriptions must accurately reflect current implementation.**

**Before (VoxelSolver):**
> "A streamlined interface to voxel-based topology optimization..."

**After (VoxelSolver):**
> "Converts geometry into a uniform voxel grid representation—a 3D array of cubic cells..."

**Rule:** When implementation changes, descriptions must be updated immediately.

---

### Tooltips and Hover Messages

**Tooltips should use backend descriptions, not UI-invented text.**

```typescript
// ✅ GOOD: Use backend description
const tooltip = node.description;

// ❌ BAD: Hardcoded UI text
const tooltip = "This node does something cool";
```

---

### Parameter Labels

**Parameter labels should be derived from parameter definitions.**

```typescript
// ✅ GOOD: Use parameter definition
const fileParam = stlImportDef?.parameters?.find((p) => p.key === "file");
label: fileParam?.label ? `Select ${fileParam.label}…` : "Select STL File…"

// ❌ BAD: Hardcoded
label: "Select STL File…"
```

---

## Philosophical Distinctions

### Permanent vs Malleable

**Permanent (Set in Stone):**
- Geometry access pattern (`context.geometryById`)
- Node structure schema
- CMYK semantic color system
- Naming conventions (`lowerCamelCase`)
- Workflow evaluation order
- Type system semantics

**Malleable (User-Configurable):**
- Parameter values
- Node connections
- Node positions
- Geometry visibility
- Camera settings
- Material properties

**The UI should make this distinction clear:**
- Permanent elements are architectural and unchangeable
- Malleable elements are interactive and user-controlled

---

## Anti-Patterns to Avoid

### 1. Hardcoded UI Strings

❌ **BAD:**
```typescript
label: "Add Text Note"
label: "Select STL File"
label: "Delete Node"
```

✅ **GOOD:**
```typescript
const def = getNodeDefinition("textNote");
label: `Add ${def.label}`
```

---

### 2. Outdated Descriptions

❌ **BAD:**
```typescript
// Description says "topology optimization" but implementation is simple voxelizer
voxelSolver: "A streamlined interface to voxel-based topology optimization..."
```

✅ **GOOD:**
```typescript
// Description matches implementation
voxelSolver: "Converts geometry into a uniform voxel grid representation..."
```

---

### 3. Generic Labels

❌ **BAD:**
```typescript
{ key: "value", label: "Value", type: "number" }
{ key: "data", label: "Data", type: "any" }
```

✅ **GOOD:**
```typescript
{ key: "resolution", label: "Resolution", type: "number" }
{ key: "meshData", label: "Mesh Data", type: "mesh" }
```

---

### 4. UI-Invented Semantics

❌ **BAD:**
```typescript
// UI invents "File" concept when backend only has "STL Import"
label: "Add File"
```

✅ **GOOD:**
```typescript
// UI reflects backend reality
label: "Add STL Import"
```

---

## Validation Checklist

Use this checklist to ensure UI philosophical correctness:

- [ ] All node labels derived from `node.label`
- [ ] All port labels derived from `port.label`
- [ ] All parameter labels derived from `parameter.label`
- [ ] All descriptions match current implementation
- [ ] No hardcoded UI strings (except meta navigation)
- [ ] Context menu items derived from backend
- [ ] Tooltips use backend descriptions
- [ ] No semantic drift (UI says what backend does)
- [ ] No outdated descriptions
- [ ] No generic labels ("Value", "Data", "Amount")
- [ ] CMYK colors match semantic type categories
- [ ] Permanent vs malleable distinction is clear

---

## Benefits of This Approach

### 1. Single Source of Truth
- Backend defines all semantics
- UI automatically reflects changes
- No duplication or drift

### 2. Semantic Consistency
- Same terminology everywhere
- Clear, precise language
- No ambiguity

### 3. Easier Refactoring
- Change backend, UI updates automatically
- No hunting for hardcoded strings
- Safer to rename/reorganize

### 4. Log-Scale Capability Growth
- Adding nodes is guided by ontological rules
- Semantic specificity enables precise feature definition
- Linguistic approach makes capabilities discoverable

### 5. Lingua Philosophy Embodied
- **Narrow:** Focused on geometry and computation
- **Direct:** Clear, unambiguous patterns
- **Precise:** Mathematically sound, semantically correct

---

## Future Work

### Command Registry
Create a typed registry of commands (IDs, labels, descriptions) so context menus and toolbars are rendered from backend-expressed actions.

```typescript
export type CommandId =
  | "node.delete"
  | "node.hide"
  | "node.show"
  | "workspace.gridSnap.toggle";

export const COMMANDS: Record<CommandId, CommandDefinition> = {
  "node.delete": { id: "node.delete", label: "Delete Node" },
  "node.hide": { id: "node.hide", label: "Hide Node" },
  // ...
};
```

### Port Descriptions
Add `description` field to all port definitions for richer tooltips.

```typescript
{
  key: "geometry",
  label: "Geometry",
  type: "geometry",
  description: "Input geometry to voxelize (mesh, solid, or any geometry type)."
}
```

### Workspace Settings
Model workspace settings (grid snap, etc.) as backend state with commands.

---

## Conclusion

**Lingua is not a traditional software application with static UI elements. It is a responsive language-based modeling tool where the UI is a render of the backend.**

Every word, label, description, and tooltip must be semantically correct and derived from backend definitions. This ensures that Lingua remains a finely tuned machine where language, math, and geometry work together in precise, predictable ways.

**The UI is not a separate layer—it is a window into the backend's semantic reality.**
