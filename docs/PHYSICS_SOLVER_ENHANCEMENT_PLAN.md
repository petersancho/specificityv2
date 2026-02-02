# Physics Solver Enhancement Plan

## Overview

Enhance the Physics Solver with **interactive point selection** for loads/anchors and **stress gradient visualization** for engineering analysis.

---

## Current State

### What Works ✅
- Physics Solver compute logic (`PhysicsSolver.ts`)
- 3-tab dashboard UI (Setup/Simulator/Output)
- Semantic operations defined
- Outputs: `geometry`, `stressField`, `displacements`
- Material properties input
- Analysis types: static, dynamic, modal

### What's Missing ❌
- **Interactive point selection** - No mouse picking on geometry
- **Stress visualization** - `stressField` output exists but not visualized
- **User-friendly UX** - Manual numeric entry for load/anchor positions
- **Engineering visualization** - No color-coded stress gradient mesh

---

## Peter's Requirements

1. **Easy and simple way for users to select load and anchor points**
   - Click on geometry with mouse to set points
   - Prompt users to select anchor points manually
   - Prompt users to select load points manually

2. **Gradient mesh output showing stress paths with colors**
   - Visual stress analysis
   - Color gradient showing stress distribution (blue → red)
   - Engineering/structural analysis output

3. **Use existing simulation page**
   - Dashboard already exists with 3 tabs
   - Simulation is for analysis, not time-stepping

---

## Implementation Plan

### Phase 1: Interactive Point Selection (3-4 days)

#### Task 1.1: Create Physics Geometry Viewer Component
**File:** `client/src/components/workflow/physics/PhysicsGeometryViewer.tsx`

**Features:**
- Render geometry mesh using Three.js
- Raycast on pointer click to get 3D point
- Display markers for loads (red arrows) and constraints (blue spheres)
- Support pick mode (enabled/disabled)

**API:**
```typescript
type PickResult = {
  point: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  faceIndex: number;
};

type PhysicsGeometryViewerProps = {
  geometry: Geometry;
  stressField?: StressField;
  loads: Load[];
  constraints: Constraint[];
  pickEnabled: boolean;
  onPick: (pick: PickResult) => void;
  showStress: boolean;
  showDeformed: boolean;
};
```

**Implementation:**
- Use Three.js `Raycaster` for point picking
- Use `BufferGeometry` with vertex colors for stress visualization
- Render load markers as arrow helpers
- Render constraint markers as spheres

---

#### Task 1.2: Add Pick Mode to Dashboard
**File:** `client/src/components/workflow/physics/PhysicsSimulatorDashboard.tsx`

**State:**
```typescript
type PickMode = 
  | null 
  | { kind: 'load'; loadType: 'point' | 'distributed' | 'body' }
  | { kind: 'constraint'; constraintType: 'fixed' | 'pinned' | 'roller' };

const [pickMode, setPickMode] = useState<PickMode>(null);
```

**UI Changes:**
- Add "Pick on Geometry" buttons next to manual entry
- Show prompt when pick mode is active: "Click a point on the model to place the load/anchor"
- Highlight active pick mode button
- Cancel pick mode on ESC key

**Pick Handler:**
```typescript
function handlePick(pick: PickResult) {
  if (!pickMode) return;

  if (pickMode.kind === 'load') {
    setLoads(prev => [...prev, {
      type: pickMode.loadType,
      position: pick.point,
      direction: pick.normal, // or default to -Y
      magnitude: 1000,
    }]);
  } else {
    setConstraints(prev => [...prev, {
      type: pickMode.constraintType,
      position: pick.point,
      normal: pick.normal,
    }]);
  }

  setPickMode(null);
}
```

---

#### Task 1.3: Integrate Viewer into Dashboard
**Location:** Simulator tab and Output tab

**Simulator Tab:**
- Show viewer with pick mode enabled
- Display current loads and constraints as markers
- Allow clicking to add new loads/constraints

**Output Tab:**
- Show viewer with stress visualization
- Display deformed mesh (optional)
- Show stress legend

---

### Phase 2: Stress Gradient Visualization (2-3 days)

#### Task 2.1: Define StressField Type
**File:** `client/src/workflow/nodes/solver/types.ts`

```typescript
export type StressField = {
  kind: 'scalar';
  quantity: 'vonMises' | 'sigma1' | 'sigma2' | 'sigma3';
  location: 'vertex' | 'face';
  values: number[];
  min: number;
  max: number;
  unit: 'Pa' | 'MPa' | 'GPa';
};
```

**Update PhysicsSolver.ts:**
- Ensure `stressField` output conforms to this type
- Compute von Mises stress from stress tensor
- Include min/max values for color mapping

---

#### Task 2.2: Implement Stress Color Mapping
**File:** `client/src/components/workflow/physics/stressColor.ts`

```typescript
export function mapScalarToRGB(
  value: number, 
  min: number, 
  max: number
): [number, number, number] {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  
  // Blue → Cyan → Green → Yellow → Red
  if (t < 0.25) {
    const s = t / 0.25;
    return [0, s, 1];
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return [0, 1, 1 - s];
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return [s, 1, 0];
  } else {
    const s = (t - 0.75) / 0.25;
    return [1, 1 - s, 0];
  }
}

export function applyStressColors(
  geometry: THREE.BufferGeometry,
  stressField: StressField
): void {
  const colors = new Float32Array(stressField.values.length * 3);
  
  for (let i = 0; i < stressField.values.length; i++) {
    const [r, g, b] = mapScalarToRGB(
      stressField.values[i],
      stressField.min,
      stressField.max
    );
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}
```

---

#### Task 2.3: Add Stress Legend Component
**File:** `client/src/components/workflow/physics/StressLegend.tsx`

```typescript
type StressLegendProps = {
  min: number;
  max: number;
  unit: string;
};

export const StressLegend: React.FC<StressLegendProps> = ({ min, max, unit }) => {
  return (
    <div className={styles.legend}>
      <div className={styles.legendTitle}>von Mises Stress</div>
      <div className={styles.legendGradient} />
      <div className={styles.legendLabels}>
        <span>{min.toExponential(2)} {unit}</span>
        <span>{max.toExponential(2)} {unit}</span>
      </div>
    </div>
  );
};
```

**CSS:**
```css
.legendGradient {
  width: 200px;
  height: 20px;
  background: linear-gradient(
    to right,
    rgb(0, 0, 255),
    rgb(0, 255, 255),
    rgb(0, 255, 0),
    rgb(255, 255, 0),
    rgb(255, 0, 0)
  );
}
```

---

#### Task 2.4: Update Output Tab
**File:** `PhysicsSimulatorDashboard.tsx`

**Add Controls:**
```typescript
const [showStress, setShowStress] = useState(true);
const [showDeformed, setShowDeformed] = useState(false);
const [stressScale, setStressScale] = useState(1.0);
```

**UI:**
```tsx
<div className={styles.outputTab}>
  <div className={styles.visualizationControls}>
    <label>
      <input
        type="checkbox"
        checked={showStress}
        onChange={(e) => setShowStress(e.target.checked)}
      />
      Show Stress
    </label>
    <label>
      <input
        type="checkbox"
        checked={showDeformed}
        onChange={(e) => setShowDeformed(e.target.checked)}
      />
      Show Deformed Shape
    </label>
    <label>
      Stress Scale:
      <input
        type="range"
        min="0.1"
        max="2"
        step="0.1"
        value={stressScale}
        onChange={(e) => setStressScale(Number(e.target.value))}
      />
      {stressScale.toFixed(1)}x
    </label>
  </div>

  <PhysicsGeometryViewer
    geometry={geometry}
    stressField={stressField}
    loads={loads}
    constraints={constraints}
    pickEnabled={false}
    onPick={() => {}}
    showStress={showStress}
    showDeformed={showDeformed}
  />

  {showStress && stressField && (
    <StressLegend
      min={stressField.min}
      max={stressField.max}
      unit={stressField.unit}
    />
  )}

  <div className={styles.stressStats}>
    <div>Max Stress: {stressField?.max.toExponential(2)} {stressField?.unit}</div>
    <div>Min Stress: {stressField?.min.toExponential(2)} {stressField?.unit}</div>
    <div>Max Displacement: {maxDisplacement.toFixed(3)} m</div>
  </div>
</div>
```

---

### Phase 3: Semantic Integration (1 day)

#### Task 3.1: Add Semantic Operations
**File:** `client/src/semantic/ops/simulator.ts`

```typescript
// Add to existing operations
{
  id: 'simulator.physics.selectAnchorPoint',
  category: OpCategory.Simulator,
  tags: [OpTag.Physics, OpTag.Interactive, OpTag.UI],
  complexity: Complexity.Simple,
  description: 'Select anchor point on geometry with mouse',
},
{
  id: 'simulator.physics.selectLoadPoint',
  category: OpCategory.Simulator,
  tags: [OpTag.Physics, OpTag.Interactive, OpTag.UI],
  complexity: Complexity.Simple,
  description: 'Select load point on geometry with mouse',
},
{
  id: 'simulator.physics.visualizeStress',
  category: OpCategory.Simulator,
  tags: [OpTag.Physics, OpTag.Visualization, OpTag.Analysis],
  complexity: Complexity.Moderate,
  description: 'Visualize stress field with color gradient',
},
{
  id: 'simulator.physics.computeVonMises',
  category: OpCategory.Simulator,
  tags: [OpTag.Physics, OpTag.Math, OpTag.Analysis],
  complexity: Complexity.Moderate,
  description: 'Compute von Mises stress from stress tensor',
},
```

---

### Phase 4: Testing & Polish (1-2 days)

#### Task 4.1: Test Interactive Picking
- Click on various points on geometry
- Verify load markers appear at correct positions
- Verify constraint markers appear at correct positions
- Test with different geometry types (box, sphere, complex mesh)

#### Task 4.2: Test Stress Visualization
- Run physics simulation with known loads
- Verify stress gradient appears correctly
- Verify color mapping is accurate (blue = low, red = high)
- Verify legend matches stress values

#### Task 4.3: Test Integration
- Test full workflow: load geometry → pick anchors → pick loads → run simulation → view stress
- Verify semantic operations are linked
- Verify no performance issues with large meshes

---

## Technical Details

### WebGL Stack
- **Three.js** - Already used in the project
- **React Three Fiber** - Optional, can use vanilla Three.js
- **BufferGeometry** - For efficient mesh rendering
- **Raycaster** - For point picking

### Geometry Format
- Input: OpenCascade BRep → tessellated mesh
- Mesh format: `{ vertices: Float32Array, indices: Uint32Array, normals: Float32Array }`
- Stress field: per-vertex scalar values

### Stress Computation
- Input: Stress tensor (6 components: σxx, σyy, σzz, σxy, σyz, σxz)
- Output: von Mises stress (scalar)
- Formula: `σ_vm = sqrt(0.5 * ((σxx-σyy)² + (σyy-σzz)² + (σzz-σxx)² + 6*(σxy² + σyz² + σxz²)))`

### Point Snapping
- **Option 1:** Exact ray hit (most accurate)
- **Option 2:** Snap to nearest vertex (simpler)
- **Recommendation:** Start with exact ray hit, add vertex snapping if needed

---

## User Experience Flow

### Setting Up Analysis

1. User opens Physics Solver dashboard
2. User goes to Setup tab
3. User sets material properties (Young's modulus, Poisson's ratio, density)
4. User clicks "Pick Anchor Point"
5. **Prompt appears:** "Click a point on the model to place the anchor"
6. User clicks on geometry → anchor marker appears
7. User clicks "Pick Load Point"
8. **Prompt appears:** "Click a point on the model to place the load"
9. User clicks on geometry → load marker appears (red arrow)
10. User sets load magnitude and direction
11. User clicks "Run Simulation"

### Viewing Results

1. Simulation runs (progress bar in Simulator tab)
2. User goes to Output tab
3. **Stress gradient mesh appears** (blue → red colors)
4. **Legend shows stress range** (min/max values)
5. User can toggle "Show Deformed Shape" to see displacement
6. User can adjust stress scale for better visualization
7. User sees max stress, min stress, max displacement stats

---

## Dependencies

### Required
- `three` - Already installed
- No new dependencies needed

### Optional (for future enhancements)
- `@react-three/fiber` - React wrapper for Three.js
- `@react-three/drei` - Helpers for common Three.js patterns
- `lil-gui` - For advanced visualization controls

---

## Semantic Integration

### Operations Added
- `simulator.physics.selectAnchorPoint`
- `simulator.physics.selectLoadPoint`
- `simulator.physics.visualizeStress`
- `simulator.physics.computeVonMises`

### Semantic Stack
```
LINGUA (Semantic Language)
    ↕ command.physics
ROSLYN (Geometry Manifestation)
    ↕ solver.physics
NUMERICA (Computation Engine)
    ↕ simulator.physics.*
MATH ENGINE (Numerical Foundation)
    ↕ math.vector, math.matrix
GEOMETRY KERNEL (OpenCascade)
    ↕ geometry.brep, geometry.mesh
```

---

## Timeline

| Phase | Tasks | Duration |
|-------|-------|----------|
| **Phase 1** | Interactive Point Selection | 3-4 days |
| **Phase 2** | Stress Gradient Visualization | 2-3 days |
| **Phase 3** | Semantic Integration | 1 day |
| **Phase 4** | Testing & Polish | 1-2 days |
| **Total** | | **7-10 days** |

---

## Success Criteria

✅ User can click on geometry to set anchor points  
✅ User can click on geometry to set load points  
✅ Load markers (red arrows) appear at correct positions  
✅ Constraint markers (blue spheres) appear at correct positions  
✅ Stress gradient mesh displays correctly (blue → red)  
✅ Legend shows accurate stress range  
✅ Max/min stress values are displayed  
✅ Semantic operations are linked  
✅ No performance issues with meshes up to 100k vertices  
✅ User experience is simple and intuitive  

---

## Future Enhancements (Optional)

1. **Principal Stress Directions** - Show stress trajectories as streamlines
2. **Deformed Shape Animation** - Animate from undeformed to deformed
3. **Multiple Load Cases** - Compare different loading scenarios
4. **Safety Factor Visualization** - Color by safety factor instead of stress
5. **Export Results** - Export stress field as CSV or VTK format
6. **Advanced Constraints** - Spring supports, elastic foundations
7. **Contact Analysis** - Multi-body contact simulation

---

## Notes

- This enhancement focuses on **user experience** and **visualization**
- The underlying FEA solver logic is already implemented
- The goal is to make the solver **accessible** and **visually powerful**
- Engineering analysis requires **clear visual feedback** - stress gradients are essential
- Interactive point selection makes the tool **intuitive** for architects and engineers

---

## Philosophy Integration

**Love:** Designed with care for engineers and architects who need to understand structural behavior. Beautiful stress visualization reveals the hidden forces within structures.

**Philosophy:** The code is the philosophy - interactive picking and stress visualization embody the principle that computation should be **tangible** and **visual**. Engineers think spatially, so the interface should be spatial.

**Intent:** Clear purpose - enable structural analysis through intuitive interaction. The geometry speaks through color, revealing stress paths and structural behavior. The user doesn't just compute - they **see** and **understand**.

---

**Status:** Ready for implementation  
**Priority:** 🟡 HIGH (Important for architectural modeling)  
**Estimated Time:** 7-10 days  
