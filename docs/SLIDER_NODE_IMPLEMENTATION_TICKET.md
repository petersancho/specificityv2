## Title
**Premium Slider Node: Compact, Interaction-First Numeric Control for Numerica**

---

## Summary

Replace the current "Number" node representation with a new **Slider** node type that provides a premium, compact, interaction-first numeric control. The Slider node outputs a single numeric value and provides:
- Smooth 60fps drag interactions
- Direct numeric editing (click value to type)
- Configurable min/max/step/snap settings via a settings popover
- Support for negative ranges, decimals, and snapping
- Delightful microinteractions (hover, drag, focus states)

**DO NOT BIKESHED DESIGN**: Codex must implement using existing design tokens from `global.css`. Use neutral defaults. No color palette discussions. Focus on interaction quality and correctness.

---

## Repro: Current State

The current "Number" node (`type: "number"`) in the node registry:
- Has no inline slider interaction
- Requires the parameter panel to edit values
- Looks like every other node with no interactive affordance
- No visual feedback for value magnitude
- No drag-to-adjust behavior on the node itself

This creates friction for parametric workflows where sliders are the primary driver of geometry exploration. A dedicated Slider node with premium interactions will make Numerica "feel alive."

---

## Constraints (Non-Negotiable)

1. **DO NOT BIKESHED DESIGN** — Use existing tokens from `--sp-*`, `--ink-*`, `--fog-*`, `--radius-*`, `--shadow-*` in `global.css`. No custom color palette. Keep it neutral and consistent.
2. **Preserve Canvas Behaviors** — Node drag, select, zoom/pan, multi-select must continue working. Slider interaction must not fight with canvas interactions.
3. **Single Output Port Only** — The Slider node emits ONE output: `{ key: "value", label: "Value", type: "number" }`. No inputs.
4. **Surgical Changes** — Only touch files directly related to slider node implementation. No unrelated refactors.
5. **Persist State** — Slider settings (value, min, max, step, snapMode) must serialize/deserialize with the graph save/load.

---

## Requirements

### 1) VALUE MODEL

```typescript
interface SliderNodeState {
  value: number;       // Current value
  min: number;         // Range minimum (default: 0)
  max: number;         // Range maximum (default: 100)
  step: number;        // Increment size (default: 1, can be decimal like 0.01)
  snapMode: "off" | "step"; // "step" rounds to nearest step, "off" is continuous
}
```

**Behaviors:**
- Clamp `value` to `[min, max]` after any edit or drag
- If `min > max`, swap them automatically (or show inline error state)
- Support negative ranges (e.g., `-10` to `10`)
- Support decimal step (e.g., `0.1`, `0.01`)
- Derive display precision from step: `step=0.01` → show 2 decimals

### 2) INTERACTION / INPUT

**Drag:**
- Dragging the knob/track updates value continuously at 60fps
- Use `pointermove` with pointer capture for stable tracking
- Calculate value from pointer X relative to track bounds
- Apply snap/clamp rules during drag
- Prevent event propagation so canvas pan doesn't fight slider drag

**Click Track:**
- Clicking the track (not knob) jumps value to that position
- Apply snap/clamp rules

**Scroll Wheel (Optional but Preferred):**
- When slider is hovered/focused, scroll wheel adjusts value by step
- Use `Alt/Option` modifier OR only when focused to avoid fighting canvas zoom
- Without modifier over unfocused slider → let canvas zoom handle it

**Keyboard:**
- When slider is focused:
  - `ArrowLeft`/`ArrowRight`: nudge by ±step
  - `Shift+Arrow`: fine control (step/10)
  - `Ctrl/Cmd+Arrow`: coarse control (step*10)
  - `Home`: set to min
  - `End`: set to max
- In numeric input:
  - `Enter`: commit typed value
  - `Escape`: cancel edit, revert
  - `Tab`: commit and move focus

**Direct Numeric Editing:**
- Value display is clickable → transforms into inline `<input type="text">`
- Typing a number and pressing Enter sets value (respects clamp + snap)
- Blur commits the value
- Invalid input (NaN) reverts to previous value

**Settings Editing:**
- Small affordance (e.g., `⋯` icon or gear `⚙`) reveals settings popover
- Popover contains: min, max, step, snap toggle
- Settings apply immediately; popover closes on outside click or Escape

### 3) VISUAL / LAYOUT

**Node Structure:**
```
┌──────────────────────────────────────┐
│ [Category Band]           SLIDER     │ ← Category label + icon
├──────────────────────────────────────┤
│  Slider                              │ ← Node label
│  ━━━━━●━━━━━━━━━━━━━━━━━━━━          │ ← Track + Knob
│       42.5           [⋯]             │ ← Value readout + settings
│                           ○ Value    │ ← Output port
└──────────────────────────────────────┘
```

**Sizing:**
- Track height: ~6-8px (same as existing slider in `WebGLControl.module.css`)
- Knob diameter: ~14-16px
- Node width: standard `NODE_WIDTH` (198px per `NumericalCanvas.tsx`)
- Keep node compact; don't exceed standard height unless necessary

**States & Microinteractions:**
- **Idle:** Track shows fill to current value position, knob at position
- **Hover (track):** Subtle highlight on track
- **Hover (knob):** Knob slightly scales up or brightens
- **Drag (active):** Knob has active/pressed state, value updates live
- **Focus (keyboard):** Focus ring around track/knob area
- **Edit Mode (value):** Input field visible with cursor
- **Settings Open:** Popover visible, settings affordance highlighted

**Transitions:**
- Use existing `--fast` (120ms) and `--norm` (200ms) from tokens
- Knob position: smooth but not sluggish (~100ms transition or immediate on drag)
- Hover states: ~80-100ms

### 4) NODE INTEGRATION

**Registry Definition:**
```typescript
{
  type: "slider",
  label: "Slider",
  shortLabel: "SLD",
  description: "A draggable slider that outputs a numeric value.",
  category: "math", // or "basics" if preferred
  iconId: "slider", // need to add icon or reuse existing
  inputs: [],
  outputs: [{ key: "value", label: "Value", type: "number" }],
  parameters: [
    { key: "value", label: "Value", type: "number", defaultValue: 50, step: 1 },
    { key: "min", label: "Min", type: "number", defaultValue: 0 },
    { key: "max", label: "Max", type: "number", defaultValue: 100 },
    { key: "step", label: "Step", type: "number", defaultValue: 1, min: 0.001 },
    { key: "snapMode", label: "Snap", type: "select", defaultValue: "step", options: [
      { value: "off", label: "Off" },
      { value: "step", label: "Step" }
    ]},
  ],
  primaryOutputKey: "value",
  compute: ({ parameters }) => ({
    value: clampAndSnap(parameters.value, parameters.min, parameters.max, parameters.step, parameters.snapMode),
  }),
}
```

**NodeType Addition:**
- Add `"slider"` to `NodeType` union in `nodeTypes.ts`
- Add to `SUPPORTED_WORKFLOW_NODE_TYPES` array

**Canvas Rendering:**
- Slider node needs **custom rendering** in `NumericalCanvas.tsx`'s `drawNodes` function
- Detect `node.type === "slider"` and render:
  - Track (filled portion + unfilled portion)
  - Knob at current value position
  - Value text
  - Settings affordance
- Add hit detection for slider-specific areas (knob, track, value text, settings icon)

**Interaction Handling:**
- Add slider-specific pointer handling in `handlePointerDown`/`Move`/`Up`
- New drag state type: `{ type: "slider"; nodeId: string; startValue: number; }`
- On `pointerdown` over slider track/knob → start slider drag, NOT node drag
- On `pointermove` during slider drag → update value via `updateNodeData`
- On `pointerup` → commit value, end slider drag
- `stopPropagation()` to prevent canvas pan

**Serialization:**
- Parameters already serialize via existing node data flow
- Ensure `updateNodeData` updates `node.data.parameters` correctly
- Verify save/load round-trips slider settings

---

## Files to Search/Edit

### Must Edit
| File | Purpose |
|------|---------|
| `client/src/workflow/nodeTypes.ts` | Add `"slider"` to `NodeType` union and supported types array |
| `client/src/workflow/nodeRegistry.ts` | Add slider node definition with compute function |
| `client/src/components/workflow/NumericalCanvas.tsx` | Add custom rendering + interaction handling for slider nodes |
| `client/src/components/workflow/WorkflowSection.module.css` | Slider-specific styles if needed (prefer inline/canvas for node) |

### May Need to Edit
| File | Purpose |
|------|---------|
| `client/src/store/useProjectStore.ts` | Verify `updateNodeData` works for slider parameters |
| `client/src/webgl/ui/WebGLIconRenderer.ts` | Add slider icon if not present |
| `client/src/styles/global.css` | Reference existing tokens, possibly add slider-specific if absolutely needed |

### Reference Only (Do Not Edit Unless Necessary)
| File | Purpose |
|------|---------|
| `client/src/components/ui/WebGLSlider.tsx` | Existing slider component (for toolbar, NOT node canvas) |
| `client/src/components/ui/WebGLControl.module.css` | Existing slider styles for reference |

---

## Implementation Plan

### Phase 1: Node Type Registration
1. Add `"slider"` to `NodeType` union in `nodeTypes.ts`
2. Add `"slider"` to `SUPPORTED_WORKFLOW_NODE_TYPES` array
3. Add slider node definition in `nodeRegistry.ts` with parameters and compute function

### Phase 2: Math Utilities
1. Create utility functions (can live in `nodeRegistry.ts` or new utils file):
   ```typescript
   const clamp = (value: number, min: number, max: number): number => 
     Math.min(max, Math.max(min, value));
   
   const quantize = (value: number, step: number, snapMode: string): number => {
     if (snapMode === "off" || step <= 0) return value;
     return Math.round(value / step) * step;
   };
   
   const derivePrecisionFromStep = (step: number): number => {
     if (step >= 1) return 0;
     const str = step.toString();
     const decimal = str.indexOf(".");
     return decimal === -1 ? 0 : str.length - decimal - 1;
   };
   
   const formatValue = (value: number, precision: number): string => 
     value.toFixed(precision);
   ```

### Phase 3: Canvas Rendering
1. In `NumericalCanvas.tsx`, modify `drawNodes` function:
   - Add slider-specific branch for `node.type === "slider"`
   - Draw track background, filled portion, knob, value text, settings icon
   - Calculate knob position from normalized value: `(value - min) / (max - min)`

2. Add slider constants:
   ```typescript
   const SLIDER_TRACK_HEIGHT = 6;
   const SLIDER_KNOB_RADIUS = 7;
   const SLIDER_TRACK_Y_OFFSET = 52; // below node label
   const SLIDER_TRACK_PADDING = 14; // left/right padding
   const SLIDER_VALUE_Y_OFFSET = 72; // below track
   ```

### Phase 4: Hit Detection
1. Extend `hitTest` function in `NumericalCanvas.tsx`:
   - For slider nodes, check if pointer is over:
     - Knob → `{ type: "sliderKnob", nodeId, ... }`
     - Track → `{ type: "sliderTrack", nodeId, ... }`
     - Value text → `{ type: "sliderValue", nodeId, ... }`
     - Settings icon → `{ type: "sliderSettings", nodeId, ... }`
   - Return node hit for other areas (standard node drag)

2. Update `HitTarget` type to include slider-specific targets

### Phase 5: Interaction Handling
1. Add new drag state type:
   ```typescript
   | { type: "slider"; nodeId: string; startValue: number; trackLeft: number; trackWidth: number; }
   ```

2. Modify `handlePointerDown`:
   - If hit is `sliderKnob` or `sliderTrack`:
     - Start slider drag state
     - Set pointer capture
     - Prevent default
     - Stop propagation
   - If hit is `sliderValue`:
     - Enter value edit mode (set state)
   - If hit is `sliderSettings`:
     - Open settings popover (set state)

3. Modify `handlePointerMove`:
   - If `dragState.type === "slider"`:
     - Calculate new value from pointer X position
     - Apply snap/clamp
     - Update node data via `updateNodeData`

4. Modify `handlePointerUp`:
   - If `dragState.type === "slider"`:
     - Commit final value
     - End drag state

### Phase 6: Value Editing UI
1. Add state for editing:
   ```typescript
   const [editingSliderValue, setEditingSliderValue] = useState<{
     nodeId: string;
     currentText: string;
   } | null>(null);
   ```

2. When editing:
   - Render an overlay `<input>` positioned at the value text location
   - Handle Enter/Escape/Blur to commit/cancel
   - Parse and validate input on commit

### Phase 7: Settings Popover
1. Add state for settings:
   ```typescript
   const [sliderSettings, setSliderSettings] = useState<{
     nodeId: string;
     screen: Vec2;
   } | null>(null);
   ```

2. When settings open:
   - Render a positioned popover with min/max/step/snap fields
   - Changes apply immediately via `updateNodeData`
   - Close on outside click or Escape

### Phase 8: Keyboard Support
1. Track focused slider node
2. On Arrow keys when slider focused:
   - Adjust value by step (or step/10, step*10 with modifiers)
   - Update via `updateNodeData`

### Phase 9: Polish & Microinteractions
1. Add hover states:
   - Track highlight when hovered
   - Knob scale/brightness on hover
2. Add smooth transitions for knob position (CSS transition or lerp)
3. Add focus ring when keyboard-focused
4. Test all interactions

---

## Acceptance Criteria

- [ ] Slider node appears in node palette under Math (or Basics) category
- [ ] Slider node renders with track, knob, value display, and settings affordance
- [ ] Dragging knob updates value continuously at 60fps
- [ ] Clicking track jumps value to clicked position
- [ ] Value can be edited by clicking the number and typing
- [ ] Settings popover allows editing min/max/step/snap
- [ ] Supports negative ranges (e.g., -10 to +10)
- [ ] Supports decimal step (e.g., 0.01)
- [ ] Snapping works correctly when enabled
- [ ] Value is clamped to [min, max] on all edits
- [ ] Node remains draggable when clicking non-slider areas
- [ ] Node remains selectable
- [ ] Canvas pan/zoom works normally when not interacting with slider
- [ ] Multi-select works (slider nodes included)
- [ ] Single output port renders correctly and connections work
- [ ] State persists after save/load
- [ ] Keyboard navigation works (Arrow keys, Enter, Escape)
- [ ] All microinteractions feel smooth and responsive
- [ ] Uses existing design tokens (no custom colors)

---

## Manual Testing Plan

### Test 1: Basic Functionality
1. Add a Slider node from the palette
2. Drag the knob → value updates live
3. Click the track → value jumps to position
4. Verify output port emits value

### Test 2: Negative Range
1. Open settings, set min=-10, max=10, step=0.1
2. Drag through full range
3. Verify negative values display correctly
4. Connect to a downstream node, verify negative values propagate

### Test 3: Decimal Step
1. Set step=0.01
2. Verify value displays 2 decimal places
3. Type a value like "3.14159" → should show "3.14"
4. Verify snapping rounds to nearest 0.01

### Test 4: Snap Mode Off
1. Set snapMode to "off"
2. Drag slider → value should be continuous (not rounded)
3. Type "3.14159" → should keep more precision

### Test 5: Large Range
1. Set min=-1000, max=1000, step=10
2. Drag through range
3. Verify performance is smooth
4. Verify value formatting is readable

### Test 6: Canvas Interactions
1. With Slider node on canvas:
   - Drag the node by its header → should move node
   - Click node → should select
   - Ctrl/Cmd+click → should multi-select
   - Drag on slider track → should NOT move node
   - Pan canvas (Space+drag or scroll) → should pan, not affect slider
   - Zoom (Ctrl+scroll) → should zoom canvas

### Test 7: Keyboard
1. Click slider to focus
2. Press Right Arrow → value increases by step
3. Shift+Right → value increases by step/10
4. Ctrl+Right → value increases by step*10
5. Home → value goes to min
6. End → value goes to max

### Test 8: Value Editing
1. Click the value number
2. Type "42.5" and press Enter → value updates
3. Click value again, type "invalid" and press Enter → reverts
4. Click value, type new number, press Escape → reverts

### Test 9: Persistence
1. Add Slider node, set value=75, min=0, max=150
2. Save project
3. Reload/reopen project
4. Verify slider shows value=75, settings preserved

### Test 10: Connection
1. Add Slider node (outputs 50)
2. Add "Add" node
3. Connect Slider.value → Add.A
4. Add Number node with value=10, connect to Add.B
5. Verify Add output shows 60
6. Drag Slider to 30 → Add output should update to 40

---

## Notes

- The existing `WebGLSlider.tsx` is for toolbar/panel UI, NOT for canvas nodes. Don't confuse them.
- The canvas renders via 2D context, not React components. Slider must be drawn, not rendered as DOM.
- Pointer events need careful handling to distinguish slider interaction from node/canvas interaction.
- Settings popover is the ONE place where DOM overlay is acceptable (same pattern as context menu).
- Performance: Don't trigger full graph recompute on every pixel of drag. Use throttling if needed, but prefer live updates with debounced downstream propagation.
