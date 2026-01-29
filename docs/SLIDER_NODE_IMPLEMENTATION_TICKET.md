# Slider Node Implementation Ticket

**Premium Slider Node: Compact, Interaction-First Numeric Control for Numerica**

---

## North Star

The Slider node should feel like a premium instrument: compact, tactile, and fast.
It replaces the current "Number"-style friction with an interaction-first control
that makes Numerica feel alive during parametric exploration.

---

## Summary

Introduce a new **Slider** node type that outputs a single numeric value and offers:

- Smooth, 60fps drag interaction
- Direct numeric editing (click the value to type)
- Configurable min/max/step/snap via a small settings popover
- Support for negative ranges, decimals, and snapping
- Polished microinteractions (hover, drag, focus, edit)
- A **bar-style slider** with **snap bars** (discrete tick marks) to make the range feel tangible

> DO NOT BIKESHED DESIGN: use existing design tokens from `global.css`.
> Keep it neutral. No palette discussions. Focus on interaction quality and correctness.

---

## Current Pain (Repro)

The current "Number" node (`type: "number"`):

- Has no inline slider interaction
- Requires the parameter panel to edit values
- Looks like every other node (no affordance)
- Gives no visual feedback for value magnitude
- Has no drag-to-adjust behavior on the node itself

This makes parametric iteration feel slow. The Slider node fixes that.

---

## Constraints (Non-Negotiable)

1. **No design bikeshedding**: Use existing tokens only (`--sp-*`, `--ink-*`, `--fog-*`,
   `--radius-*`, `--shadow-*` in `global.css`). Neutral defaults only.
2. **Preserve canvas behaviors**: node drag/select, zoom/pan, multi-select still work.
   Slider interactions must not fight the canvas.
3. **Single output only**: `{ key: "value", label: "Value", type: "number" }`.
4. **Surgical changes**: Only touch files related to slider node implementation.
   No unrelated refactors.
5. **State persists**: value/min/max/step/snapMode serialize and deserialize.

---

## Requirements

### 1) Value Model

```ts
interface SliderNodeState {
  value: number;          // Current value
  min: number;            // Range minimum (default: 0)
  max: number;            // Range maximum (default: 100)
  step: number;           // Increment size (default: 1, can be decimal like 0.01)
  snapMode: "off" | "step"; // "step" rounds to nearest step, "off" is continuous
}
```

**Behavior rules:**

- Clamp `value` to `[min, max]` after any edit or drag
- If `min > max`, swap automatically (or show inline error state)
- Support negative ranges (e.g., `-10` to `10`)
- Support decimal step (e.g., `0.1`, `0.01`)
- Display precision derives from step: `step=0.01` -> show 2 decimals

---

### 2) Interaction / Input

**Drag**
- Drag knob/track updates value continuously at 60fps
- Use `pointermove` with pointer capture
- Value from pointer X relative to track bounds
- Apply snap + clamp during drag
- Prevent event propagation so canvas pan does not fight slider drag

**Click Track**
- Clicking track jumps value to that position
- Apply snap + clamp

**Scroll Wheel (Preferred)**
- When slider is hovered/focused, wheel adjusts by `step`
- Use Alt/Option modifier OR only when focused
- Without modifier over unfocused slider, allow canvas zoom

**Keyboard (when focused)**
- ArrowLeft/ArrowRight: nudge by +/- step
- Shift+Arrow: fine control (step/10)
- Ctrl/Cmd+Arrow: coarse control (step*10)
- Home: set to min
- End: set to max

**Direct Numeric Editing**
- Value text is clickable and becomes an inline text input
- Enter commits (respect clamp + snap)
- Escape cancels and reverts
- Blur commits
- Invalid input reverts to previous value

**Settings Editing**
- Small affordance (ellipsis or gear) opens a popover
- Popover fields: min, max, step, snap toggle
- Changes apply immediately
- Close on outside click or Escape

---

### 3) Visual / Layout

**Node Structure**
```
┌──────────────────────────────────────┐
│ [Category Band]           SLIDER     │
├──────────────────────────────────────┤
│  Slider                              │
│  ━━━━━━━━▮━━━━━━━▮━━━━━━━▮━━━━━━━     │  ← bar track with snap bars (ticks)
│       42.5           [⋯]             │
│                           ○ Value    │
└──────────────────────────────────────┘
```

**Sizing**
- Track height: ~6-8px (same as slider in `WebGLControl.module.css`)
- Knob diameter: ~14-16px
- Node width: standard `NODE_WIDTH` (198px in `NumericalCanvas.tsx`)
- Keep compact; do not exceed standard height unless necessary

**Bar + Snap Bars (Visual Core)**
- Slider is a **bar**, not a thin line. Use a rounded rectangle fill that visually reads as a solid control.
- Add **snap bars** (tick marks) along the track to communicate stepping and make the slider feel engineered.
- When `snapMode=step`, show ticks at step intervals (capped to a reasonable count; e.g. max 24 ticks).
- When `snapMode=off`, show a sparse set of ticks (e.g. 5–7) for scale only.
- The filled portion of the bar should stop exactly at the knob center.

**States & Microinteractions**
- Idle: track fill shows current value position
- Hover (track): subtle highlight
- Hover (knob): slight scale or brightness bump
- Drag (active): pressed state, live value updates
- Focus (keyboard): focus ring around track/knob
- Edit mode: inline input visible
- Settings open: affordance highlighted + popover visible

**Transitions**
- Use existing `--fast` (120ms) and `--norm` (200ms) tokens
- Knob motion: smooth but responsive (~100ms or immediate on drag)
- Hover: ~80-100ms

---

### 4) Node Integration

**Registry Definition**
```ts
{
  type: "slider",
  label: "Slider",
  shortLabel: "SLD",
  description: "A draggable slider that outputs a numeric value.",
  category: "math", // or "basics" if preferred
  iconId: "slider", // add icon or reuse existing
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

**NodeType**
- Add `"slider"` to `NodeType` union in `nodeTypes.ts`
- Add to `SUPPORTED_WORKFLOW_NODE_TYPES`

**Canvas Rendering** (`NumericalCanvas.tsx`)
- Add `node.type === "slider"` custom rendering
- Draw track (filled/unfilled), knob, value text, settings affordance
- Knob position from normalized value: `(value - min) / (max - min)`
- Add hit testing for knob, track, value text, settings icon

**Interaction Handling**
- New drag state:
  ```ts
  | { type: "slider"; nodeId: string; startValue: number; trackLeft: number; trackWidth: number; }
  ```
- Pointer down on knob/track starts slider drag (not node drag)
- Pointer move updates value via `updateNodeData`
- Pointer up commits and ends drag
- Stop propagation so canvas does not pan

**Serialization**
- Parameters already serialize with node data flow
- Ensure `updateNodeData` properly updates `node.data.parameters`
- Verify save/load round-trips slider settings

---

## Files to Search/Edit

### Must Edit
| File | Purpose |
|------|---------|
| `client/src/workflow/nodeTypes.ts` | Add `"slider"` to `NodeType` union + supported types |
| `client/src/workflow/nodeRegistry.ts` | Add slider node definition + compute |
| `client/src/components/workflow/NumericalCanvas.tsx` | Render + hit detection + interactions |
| `client/src/components/workflow/WorkflowSection.module.css` | Slider-specific styles if needed |

### May Need to Edit
| File | Purpose |
|------|---------|
| `client/src/store/useProjectStore.ts` | Verify `updateNodeData` for slider parameters |
| `client/src/webgl/ui/WebGLIconRenderer.ts` | Add slider icon if missing |
| `client/src/styles/global.css` | Reference existing tokens; add only if absolutely needed |

### Reference Only
| File | Purpose |
|------|---------|
| `client/src/components/ui/WebGLSlider.tsx` | Toolbar slider (not canvas node) |
| `client/src/components/ui/WebGLControl.module.css` | Existing slider styling reference |

---

## Implementation Plan

### Phase 1: Node Type Registration
1. Add `"slider"` to `NodeType` union
2. Add `"slider"` to `SUPPORTED_WORKFLOW_NODE_TYPES`
3. Add slider node definition in `nodeRegistry.ts`

### Phase 2: Math Utilities
Create helpers (inline or utility file):
```ts
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
1. Add slider branch in `drawNodes`:
   - Bar track background + fill
   - **Snap bars** (ticks) along the track
   - Knob
   - Value text
   - Settings affordance
2. Add slider constants:
```ts
const SLIDER_TRACK_HEIGHT = 6;
const SLIDER_KNOB_RADIUS = 7;
const SLIDER_TRACK_Y_OFFSET = 52;
const SLIDER_TRACK_PADDING = 14;
const SLIDER_VALUE_Y_OFFSET = 72;
```

### Phase 4: Hit Detection
1. Extend `hitTest` in `NumericalCanvas.tsx`:
   - Knob -> `sliderKnob`
   - Track -> `sliderTrack`
   - Tick hit can be treated as track hit (no extra target needed)
   - Value text -> `sliderValue`
   - Settings -> `sliderSettings`
2. Update `HitTarget` union accordingly

### Phase 5: Pointer Interaction
1. Add drag state for slider
2. `pointerdown` on knob/track starts drag + pointer capture
3. `pointermove` updates value (snap + clamp)
4. `pointerup` commits and ends drag

### Phase 6: Value Editing UI
1. Track editing state:
```ts
const [editingSliderValue, setEditingSliderValue] = useState<{
  nodeId: string;
  currentText: string;
} | null>(null);
```
2. Render input overlay at value text position
3. Handle Enter/Escape/Blur

### Phase 7: Settings Popover
1. Track settings state:
```ts
const [sliderSettings, setSliderSettings] = useState<{
  nodeId: string;
  screen: Vec2;
} | null>(null);
```
2. Render popover with min/max/step/snap
3. Apply updates live via `updateNodeData`
4. Close on outside click/Escape

### Phase 8: Keyboard Support
1. Track focused slider node
2. Arrow keys adjust by step (fine/coarse with modifiers)
3. Home/End set min/max

### Phase 9: Polish
1. Hover states for track + knob
2. Focus ring
3. Smooth transitions
4. Test all interactions

---

## Acceptance Criteria

- [ ] Slider node appears in palette under Math (or Basics)
- [ ] Track + knob + value display + settings affordance render correctly
- [ ] Dragging knob updates value continuously at 60fps
- [ ] Clicking track jumps to position
- [ ] Value can be edited inline by typing
- [ ] Settings popover edits min/max/step/snap
- [ ] Negative ranges supported
- [ ] Decimal step supported
- [ ] Snapping works when enabled
- [ ] Value always clamped to [min, max]
- [ ] Node remains draggable outside slider UI
- [ ] Node remains selectable
- [ ] Canvas pan/zoom works normally when not interacting
- [ ] Multi-select works (slider nodes included)
- [ ] Output port renders and connections work
- [ ] State persists after save/load
- [ ] Keyboard navigation works (Arrow keys, Home/End)
- [ ] Microinteractions feel smooth
- [ ] Uses existing design tokens only

---

## Manual Testing Plan

### Test 1: Basic
1. Add Slider node
2. Drag knob -> value updates
3. Click track -> value jumps
4. Verify output port emits value

### Test 2: Negative Range
1. Settings: min=-10, max=10, step=0.1
2. Drag full range
3. Verify negative display and propagation

### Test 3: Decimal Step
1. Set step=0.01
2. Display shows 2 decimals
3. Type 3.14159 -> shows 3.14
4. Snap rounds to nearest 0.01

### Test 4: Snap Off
1. Set snapMode=off
2. Drag -> continuous values
3. Type 3.14159 -> keep precision

### Test 5: Large Range
1. min=-1000, max=1000, step=10
2. Drag -> smooth perf
3. Value formatting stays readable

### Test 6: Canvas Interactions
1. Drag node by header -> moves
2. Click node -> selects
3. Ctrl/Cmd+click -> multi-select
4. Drag slider -> node does not move
5. Pan canvas -> unaffected by slider
6. Zoom -> unaffected by slider

### Test 7: Keyboard
1. Focus slider
2. ArrowRight -> +step
3. Shift+ArrowRight -> +step/10
4. Ctrl/Cmd+ArrowRight -> +step*10
5. Home -> min
6. End -> max

### Test 8: Value Editing
1. Click value
2. Type 42.5 + Enter -> updates
3. Type invalid + Enter -> reverts
4. Escape -> cancel

### Test 9: Persistence
1. Set value=75, min=0, max=150
2. Save
3. Reload
4. Values preserved

### Test 10: Connection
1. Slider -> Add node (A)
2. Number -> Add node (B = 10)
3. Output should be 60 when slider=50
4. Drag slider to 30 -> output 40

---

## Notes

- `WebGLSlider.tsx` is for toolbar/panel UI, not canvas nodes.
- Canvas renders via 2D context; slider must be drawn, not DOM.
- Pointer events require careful separation from node/canvas interaction.
- Settings popover is the only acceptable DOM overlay (same as context menu).
- Performance: avoid full graph recompute on every pixel. Prefer live updates
  with debounced downstream propagation if needed.

## Implementation Anchors

- `client/src/components/workflow/NumericalCanvas.tsx` for drawing and hit testing.
- `client/src/components/workflow/WorkflowSection.tsx` for node palette integration.
- `client/src/workflow/nodeRegistry.ts` for slider node definition and defaults.
- `client/src/store/useProjectStore.ts` for parameter updates and cache invalidation.

## Acceptance Criteria

- Dragging updates output in real time without stutter.
- Slider respects min/max/step and clamps invalid values.
- Undo/redo restores both slider position and connected downstream outputs.

## Performance Constraints

- Maintain 60fps during drag; avoid full canvas reflow.
- Cache text measurements and slider geometry per node.
