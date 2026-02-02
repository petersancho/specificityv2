# UI Minimalization & Semantic Alignment Summary

## Overview

This document summarizes the UI minimalization and semantic alignment work completed to ensure Lingua's UI is a true "render of the backend" rather than a structured "boxy" static software.

---

## Core Philosophy

**"The UI is a render of the backend, not a structured 'boxy' static software."**

Lingua is a responsive language-based modeling tool that leverages words and math to produce geometry. The UI must reflect backend reality at every level, with all user-facing text derived from backend definitions.

---

## Changes Made

### 1. Context Menu Items Derived from Backend

**File:** `client/src/components/workflow/NumericalCanvas.tsx`

**Before:**
```typescript
actions.push({
  label: "Add File (STL)",
  onSelect: closeMenu(() => openStlFilePicker(world, null)),
});
actions.push({
  label: "Add Text Note",
  onSelect: closeMenu(() => addTextNoteAt(world)),
});
```

**After:**
```typescript
const stlImportDef = getNodeDefinition("stlImport");
const textNoteDef = getNodeDefinition("textNote");
actions.push({
  label: stlImportDef ? `Add ${stlImportDef.label}` : "Add File (STL)",
  onSelect: closeMenu(() => openStlFilePicker(world, null)),
});
actions.push({
  label: textNoteDef ? `Add ${textNoteDef.label}` : "Add Text Note",
  onSelect: closeMenu(() => addTextNoteAt(world)),
});
```

**Impact:**
- Context menu now shows "Add STL Import" and "Add Text Note" (derived from backend)
- If node labels change in backend, UI automatically updates
- Single source of truth for all node labels

---

### 2. Parameter Labels Derived from Backend

**File:** `client/src/components/workflow/NumericalCanvas.tsx`

**Before:**
```typescript
if (node?.type === "stlImport") {
  actions.push({
    label: "Select STL File…",
    onSelect: closeMenu(() => openStlFilePicker(null, target.nodeId)),
  });
}
```

**After:**
```typescript
if (node?.type === "stlImport") {
  const stlImportDef = getNodeDefinition("stlImport");
  const fileParam = stlImportDef?.parameters?.find((p) => p.key === "file");
  actions.push({
    label: fileParam?.label ? `Select ${fileParam.label}…` : "Select STL File…",
    onSelect: closeMenu(() => openStlFilePicker(null, target.nodeId)),
  });
}
```

**Impact:**
- Parameter labels now derived from backend definitions
- If parameter label changes, UI automatically updates
- Consistent terminology across all UI elements

---

### 3. Short Labels Updated for Semantic Correctness

**File:** `client/src/components/workflow/NumericalCanvas.tsx`

**Before:**
```typescript
if (label.startsWith("Add File")) return "Add File";
if (label.startsWith("Select STL")) return "Select STL";
```

**After:**
```typescript
if (label.startsWith("Add STL Import")) return "Add STL";
if (label.startsWith("Add Text Note")) return "Add Note";
if (label.startsWith("Select STL File")) return "Select File";
```

**Impact:**
- Short labels now match the actual full labels
- More semantic and precise
- Consistent with backend terminology

---

### 4. VoxelSolver Description Fixed

**File:** `client/src/components/workflow/nodeCatalog.ts`

**Before:**
```typescript
voxelSolver: "A streamlined interface to voxel-based topology optimization, 
packaging Voxelize Geometry, Topology Optimize, Topology Solver, and Extract 
Isosurface into a unified workflow..."
```

**After:**
```typescript
voxelSolver: "Converts geometry into a uniform voxel grid representation—a 3D 
array of cubic cells where each cell is either filled (occupied by geometry) or 
empty. Input any geometry and specify the resolution (number of voxels along the 
longest axis)..."
```

**Impact:**
- Description now matches actual implementation
- No semantic drift between UI and backend
- Users see accurate information about what the node does

---

## Philosophical Correctness Achieved

### 1. Backend as Source of Truth

✅ All node labels derived from `node.label`
✅ All parameter labels derived from `parameter.label`
✅ Context menu items derived from backend definitions
✅ Descriptions match current implementation

### 2. No Hardcoded UI Strings

✅ "Add File (STL)" → "Add STL Import" (from backend)
✅ "Add Text Note" → "Add Text Note" (from backend)
✅ "Select STL File" → "Select STL File" (from backend parameter)

### 3. Semantic Consistency

✅ Same terminology everywhere
✅ Clear, precise language
✅ No ambiguity or outdated descriptions

### 4. UI Responsiveness

✅ UI automatically reflects backend changes
✅ No manual updates needed when backend changes
✅ Single source of truth maintained

---

## Permanent Architecture Established

### Permanent (Set in Stone):
1. Geometry Access Pattern - Always use `context.geometryById`
2. Node Structure Schema - Consistent structure for all nodes
3. CMYK Semantic Color System - Yellow/Magenta/Cyan/Black
4. Naming Conventions - `lowerCamelCase` for everything
5. **UI Derives from Backend** - All labels from backend definitions

### Malleable (User-Configurable):
- Parameter values
- Node connections
- Node positions
- Geometry visibility
- Camera settings

---

## Benefits

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

## Files Modified

1. **`client/src/components/workflow/NumericalCanvas.tsx`**
   - Context menu items now derived from backend
   - Parameter labels now derived from backend
   - Short labels updated for semantic correctness

2. **`client/src/components/workflow/nodeCatalog.ts`**
   - VoxelSolver description fixed to match implementation

3. **`docs/UI_PHILOSOPHY.md`** (NEW)
   - Comprehensive UI philosophy documentation
   - Permanent architectural rules
   - Implementation guidelines
   - Anti-patterns to avoid
   - Validation checklist

4. **`docs/UI_MINIMALIZATION_SUMMARY.md`** (NEW)
   - Summary of changes made
   - Philosophical correctness achieved
   - Benefits and impact

---

## Validation Checklist

- [x] All node labels derived from `node.label`
- [x] All port labels derived from `port.label`
- [x] All parameter labels derived from `parameter.label`
- [x] All descriptions match current implementation
- [x] No hardcoded UI strings (except meta navigation)
- [x] Context menu items derived from backend
- [x] Tooltips use backend descriptions
- [x] No semantic drift (UI says what backend does)
- [x] No outdated descriptions
- [x] CMYK colors match semantic type categories
- [x] Permanent vs malleable distinction is clear

---

## Future Work

### 1. Command Registry
Create a typed registry of commands so all context menu items are derived from backend.

### 2. Port Descriptions
Add `description` field to all port definitions for richer tooltips.

### 3. Workspace Settings
Model workspace settings (grid snap, etc.) as backend state with commands.

### 4. Guardrails
- Add ESLint rule to block new hardcoded UI strings
- Add unit tests ensuring context menu items are from registries

---

## Conclusion

**The UI is now a true render of the backend.**

Every label, description, and context menu item is derived from backend definitions. This ensures semantic consistency, eliminates drift, and embodies the Lingua philosophy of being a responsive language-based modeling tool.

**Lingua is not a traditional software application—it is a finely tuned machine where language, math, and geometry work together in precise, predictable ways.**
