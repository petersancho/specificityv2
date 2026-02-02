# Chemistry Solver Workflow Guide

**Ἐπιλύτης Χημείας (Epilýtēs Chēmeías) - Chemistry Solver**

**Purpose:** Complete guide for using the chemistry solver to create functionally graded material distributions that output complex results to Roslyn.

---

## Overview

The chemistry solver is a **material transmutation system** that:
- Distributes multiple materials across a spatial domain
- Optimizes material concentrations based on competing goals
- Generates geometry with **material-colored visualization**
- Outputs complex results to Roslyn viewport with full metadata

**Key Concept:** Materials exist as **particle concentrations**, not discrete regions. The solver computes continuous gradients through goal-driven optimization.

---

## Semantic Workflow

### 1. Create Domain Geometry in Roslyn

The domain defines WHERE materials can exist:

```
1. In Roslyn viewport, create base geometry:
   - Box, sphere, or custom mesh
   - This becomes the spatial boundary
   
2. Select the geometry
3. Right-click in Numerica → "Add Chemistry Solver Rig"
```

**The rig creates:**
- Geometry Reference nodes (domain + seed regions)
- Goal nodes (stiffness, mass, blend, transparency, thermal)
- Chemistry Solver node
- Geometry Viewer node
- All connections pre-wired

---

## Chemistry Solver Rig Structure

### Node Layout (Auto-Generated)

**Column 0: Controls**
- Density Slider → controls particle count
- Toggle Switch → enable/disable solver

**Column 1: Geometry References**
- Domain → spatial boundary (required)
- Anchor Zones → steel nucleation regions
- Thermal Core → ceramic nucleation regions
- Vision Strip → glass interface regions

**Column 2: Goals**
- Stiffness Goal (Τέλος Σκληρότητος) → bias toward high-stiffness materials
- Mass Goal (Τέλος Ἐλαχίστου Ὄγκου) → minimize total mass
- Blend Goal (Τέλος Κράσεως) → smooth gradients
- Transparency Goal (Τέλος Διαφανείας) → bias toward transparent materials
- Thermal Goal (Τέλος Ῥοῆς Θερμότητος) → thermal insulation/conduction

**Column 3: Solver**
- Chemistry Solver (Ἐπιλύτης Χημείας) → material optimization

**Column 4: Visualization**
- Geometry Viewer → preview result

---

## Input Ports (Chemistry Solver Node)

### 1. Domain (Required)
**Type:** Geometry  
**Purpose:** Spatial boundary for material distribution

**Accepts:**
- Closed meshes (watertight solids)
- Boxes, spheres, cylinders
- Any geometry with volume

**Behavior:**
- Particles initialized within domain bounds
- Field extraction bounded by domain
- Materials cannot exist outside domain

### 2. Materials (Multi-Input)
**Type:** Any (geometry references)  
**Purpose:** Material species and seed regions

**Pattern:**
```
Connect multiple geometry references to "materials" port:
- Geometry 1 → Steel (high stiffness)
- Geometry 2 → Ceramic (thermal insulation)
- Geometry 3 → Glass (optical transmission)
```

**Material Properties:**
```typescript
{
  name: "Steel",
  density: 7850,              // kg/m³
  stiffness: 200e9,           // Pa (Young's modulus)
  thermalConductivity: 50,    // W/(m·K)
  opticalTransmission: 0,     // 0 = opaque, 1 = transparent
  diffusivity: 0.3,           // Blending coefficient
  color: [0.7, 0.7, 0.75]     // RGB visualization
}
```

### 3. Seeds (Multi-Input, Optional)
**Type:** Any (geometry references)  
**Purpose:** Nucleation regions for specific materials

**Behavior:**
- Particles near seed geometry biased toward seed material
- Seed strength controls influence (0-1)
- Seed radius controls spatial extent

### 4. Goals (Multi-Input, Required)
**Type:** Goal specifications  
**Purpose:** Energetic drivers for material optimization

**Available Goals:**
- `chemistryStiffnessGoal` - structural performance
- `chemistryMassGoal` - mass minimization
- `chemistryBlendGoal` - smooth gradients
- `chemistryTransparencyGoal` - optical properties
- `chemistryThermalGoal` - thermal performance

### 5. Enabled (Input)
**Type:** Boolean  
**Purpose:** Toggle solver execution

### 6. Particle Density (Input)
**Type:** Number (0.1 - 1.0)  
**Purpose:** Scale particle count (trades accuracy for speed)

---

## Output Ports (Chemistry Solver Node)

### 1. Geometry (Primary Output)
**Type:** Geometry ID  
**Purpose:** Reference to generated mesh in Roslyn

**Contains:**
- Isosurface extracted from material field
- **Vertex colors** representing material blend
- Metadata with solver results

**Usage:**
```
Connect to Geometry Viewer to visualize
Connect to other nodes for further processing
Click "Ontologize" to sync to Roslyn viewport
```

### 2. Mesh
**Type:** RenderMesh  
**Purpose:** Raw mesh data with material colors

**Structure:**
```typescript
{
  positions: number[],  // [x,y,z, x,y,z, ...]
  normals: number[],    // [nx,ny,nz, nx,ny,nz, ...]
  uvs: number[],        // [u,v, u,v, ...]
  indices: number[],    // [i0,i1,i2, i0,i1,i2, ...]
  colors: number[]      // [r,g,b, r,g,b, ...] ← MATERIAL COLORS!
}
```

### 3. Material Particles
**Type:** Array  
**Purpose:** Particle cloud with material concentrations

**Structure:**
```typescript
[
  {
    id: 0,
    position: { x, y, z },
    materials: { "Steel": 0.8, "Ceramic": 0.15, "Glass": 0.05 }
  },
  // ... more particles
]
```

### 4. Material Field
**Type:** Voxel field  
**Purpose:** 3D grid with per-material channels

**Structure:**
```typescript
{
  resolution: { x: 32, y: 32, z: 32 },
  bounds: { min: Vec3, max: Vec3 },
  cellSize: { x, y, z },
  materials: ["Steel", "Ceramic", "Glass"],
  channels: [
    Float32Array,  // Steel concentrations per voxel
    Float32Array,  // Ceramic concentrations per voxel
    Float32Array,  // Glass concentrations per voxel
  ],
  densities: Float32Array,  // Total density per voxel
}
```

### 5. History
**Type:** Array  
**Purpose:** Energy evolution over iterations

**Structure:**
```typescript
[
  {
    iteration: 0,
    energies: {
      stiffness: 0.5,
      mass: 0.3,
      blend: 0.1,
      transparency: 0.2,
      thermal: 0.4,
    },
    totalEnergy: 1.5,
  },
  // ... more iterations
]
```

### 6. Best State
**Type:** Object  
**Purpose:** Snapshot of lowest-energy particle configuration

### 7. Materials
**Type:** Array  
**Purpose:** Resolved material library used for solve

### 8. Total Energy
**Type:** Number  
**Purpose:** Final energy value (lower = better convergence)

### 9. Status
**Type:** String  
**Purpose:** Solver status ("complete", "disabled", "waiting-for-domain", etc.)

### 10. Diagnostics
**Type:** Object  
**Purpose:** Solver diagnostics and warnings

---

## Parameters (Chemistry Solver Node)

### Particle Count
**Default:** 2000  
**Range:** 100 - 20,000  
**Purpose:** Number of simulation particles (higher = more accurate, slower)

### Particle Density
**Default:** 1.0  
**Range:** 0.1 - 1.0  
**Purpose:** Multiplier for particle count (0.5 = half particles for faster preview)

### Iterations
**Default:** 60  
**Range:** 1 - 500  
**Purpose:** Optimization iterations (more = better convergence)

### Field Resolution
**Default:** 32  
**Range:** 8 - 96  
**Purpose:** Voxel grid resolution for field extraction (higher = finer detail)

### Iso Value
**Default:** 0.35  
**Range:** 0 - 1  
**Purpose:** Threshold for isosurface extraction (lower = more material)

### Convergence Tolerance
**Default:** 0.001  
**Range:** 0.00001 - 0.05  
**Purpose:** Energy change threshold for early stopping

### Blend Strength
**Default:** 0.6  
**Range:** 0 - 2  
**Purpose:** Material diffusion rate (higher = smoother gradients)

### Material Order
**Default:** "Steel, Ceramic, Glass"  
**Purpose:** Comma-separated list of material names

### Materials Text (Advanced)
**Type:** Textarea  
**Purpose:** JSON material specifications

**Format:**
```json
[
  {
    "material": {
      "name": "Steel",
      "density": 7850,
      "stiffness": 200e9,
      "thermalConductivity": 50,
      "opticalTransmission": 0,
      "diffusivity": 0.3,
      "color": [0.75, 0.75, 0.78]
    }
  },
  {
    "material": {
      "name": "Ceramic",
      "density": 3900,
      "stiffness": 350e9,
      "thermalConductivity": 2,
      "opticalTransmission": 0,
      "diffusivity": 0.1,
      "color": [0.85, 0.2, 0.2]
    }
  }
]
```

---

## Goal Nodes (Detailed)

### Chemistry Stiffness Goal
**Purpose:** Bias toward high-stiffness materials in structural regions

**Parameters:**
- `loadVector` - direction of primary load (default: [0, -1, 0] = gravity)
- `structuralPenalty` - weight multiplier (default: 1.5)
- `weight` - goal importance (0-1, default: 0.7)

**Inputs:**
- `region` (optional) - geometry defining where goal applies

**Behavior:**
- Particles aligned with load vector favor high-stiffness materials
- Steel > Ceramic > Glass for structural performance

### Chemistry Mass Goal
**Purpose:** Minimize total mass (embodied carbon reduction)

**Parameters:**
- `targetMassFraction` - target material fraction (default: 0.55 = 45% removal)
- `densityPenalty` - weight multiplier (default: 1.2)
- `weight` - goal importance (0-1, default: 0.4)

**Behavior:**
- Penalizes high-density materials
- Drives toward lighter materials (Glass > Ceramic > Steel)

### Chemistry Blend Goal
**Purpose:** Smooth material gradients for manufacturability

**Parameters:**
- `smoothness` - gradient smoothness (0-1, default: 0.75)
- `diffusivity` - diffusion rate (0-4, default: 1.2)
- `weight` - goal importance (0-1, default: 0.6)

**Behavior:**
- Particles exchange materials with neighbors
- Creates smooth transitions (no sharp boundaries)
- Essential for additive manufacturing

### Chemistry Transparency Goal
**Purpose:** Bias toward transparent materials

**Parameters:**
- `opticalWeight` - weight multiplier (default: 2.0)
- `weight` - goal importance (0-1, default: 0.45)

**Inputs:**
- `region` (optional) - geometry defining where goal applies

**Behavior:**
- Favors materials with high optical transmission
- Glass > Ceramic > Steel for transparency

### Chemistry Thermal Goal
**Purpose:** Control thermal conductivity

**Parameters:**
- `mode` - "conduct" or "insulate" (default: "insulate")
- `thermalWeight` - weight multiplier (default: 2.5)
- `weight` - goal importance (0-1, default: 0.65)

**Inputs:**
- `region` (optional) - geometry defining where goal applies

**Behavior:**
- **Insulate mode:** favors low thermal conductivity (Ceramic > Glass > Steel)
- **Conduct mode:** favors high thermal conductivity (Steel > Glass > Ceramic)

---

## Complete Workflow Example

### Scenario: Curtain Wall Mullion with Thermal Break

**Design Intent:**
- Structural steel at anchor zones (top/bottom connections)
- Ceramic thermal break through core (prevent condensation)
- Glass-compatible interface at glazing contact
- Minimize mass for embodied carbon

**Steps:**

#### 1. Create Domain in Roslyn
```
1. Create box primitive (mullion profile)
   - Width: 0.15m, Height: 3.0m, Depth: 0.08m
2. Select box
3. Right-click in Numerica → "Add Chemistry Solver Rig"
```

#### 2. Create Seed Regions in Roslyn
```
1. Create small boxes for anchor zones:
   - Top anchor: 0.15m × 0.2m × 0.08m at top
   - Bottom anchor: 0.15m × 0.2m × 0.08m at bottom
   
2. Create box for thermal core:
   - 0.05m × 2.6m × 0.08m through center
   
3. Create boxes for vision strips:
   - 0.02m × 3.0m × 0.08m at left edge
   - 0.02m × 3.0m × 0.08m at right edge
```

#### 3. Connect Seed Regions in Numerica
```
1. Create geometry reference nodes for each seed region
2. Connect anchor zones to solver "seeds" port
3. Connect thermal core to solver "seeds" port
4. Connect vision strips to solver "seeds" port
```

#### 4. Configure Materials
```
In Chemistry Solver node parameters:
- Material Order: "Steel, Ceramic, Glass"
- Particle Count: 2000 (interactive)
- Iterations: 60
- Field Resolution: 32
- Iso Value: 0.35
- Blend Strength: 0.6
```

#### 5. Configure Goals
```
Stiffness Goal:
- Load Vector: [0, -1, 0] (gravity)
- Structural Penalty: 1.5
- Weight: 0.7
- Connect anchor zones to "region" port

Mass Goal:
- Target Mass Fraction: 0.55 (45% removal)
- Density Penalty: 1.2
- Weight: 0.4

Blend Goal:
- Smoothness: 0.75
- Diffusivity: 1.2
- Weight: 0.6

Transparency Goal:
- Optical Weight: 2.0
- Weight: 0.45
- Connect vision strips to "region" port

Thermal Goal:
- Mode: "insulate"
- Thermal Weight: 2.5
- Weight: 0.65
- Connect thermal core to "region" port
```

#### 6. Run Solver
```
1. Ensure "Enabled" toggle is ON
2. Workflow evaluates automatically
3. Chemistry Solver computes material distribution
4. Geometry appears in Roslyn viewport with material colors
```

#### 7. Sync to Roslyn
```
1. Right-click Chemistry Solver node → "Ontologize"
   OR
2. Click Chemistry Solver node → press Ctrl+Enter
   OR
3. Geometry Viewer automatically shows result
```

---

## Output to Roslyn (Technical Details)

### Geometry Creation

When chemistry solver completes:

1. **Mesh Generation**
   - Voxel field created from particle concentrations
   - Isosurface extracted at `isoValue` threshold
   - Material colors blended per vertex

2. **Geometry Record Created**
   ```typescript
   {
     id: "mesh-1234567890-42",
     type: "mesh",
     mesh: {
       positions: [...],  // Triangle vertices
       normals: [...],    // Per-vertex normals
       uvs: [...],        // Texture coordinates
       indices: [...],    // Triangle indices
       colors: [...],     // MATERIAL COLORS (r,g,b per vertex)
     },
     layerId: "layer-default",
     sourceNodeId: "node-chemistrySolver-1234567890",
     metadata: {
       label: "Chemistry Solver Result",
       chemistryResult: {
         materials: [
           { name: "Steel", density: 7850, stiffness: 200e9, ... },
           { name: "Ceramic", density: 3900, stiffness: 350e9, ... },
           { name: "Glass", density: 2500, stiffness: 70e9, ... },
         ],
         particleCount: 2000,
         fieldResolution: { x: 32, y: 32, z: 32 },
         totalEnergy: 0.234,
         status: "complete",
         iterations: 45,
         hasColors: true,
       },
     },
   }
   ```

3. **Render Adapter Processing**
   - `GeometryRenderAdapter.updateGeometry()` called
   - `createFlatShadedMesh()` preserves vertex colors
   - GPU buffers created with color attribute
   - WebGL shader renders with material colors

4. **Viewport Display**
   - Mesh appears in Roslyn viewport
   - Material colors visible (Steel = gray, Ceramic = red, Glass = blue)
   - Gradients smooth (from blend goal)
   - Selection/gizmo work normally

---

## Material Color Visualization

### Color Blending Algorithm

```typescript
// From buildChemistryMesh in nodeRegistry.ts
for each vertex:
  // Get voxel at vertex position
  const voxelIndex = computeVoxelIndex(vertex.position);
  
  // Sum material concentrations
  let totalConcentration = 0;
  for each material:
    totalConcentration += field.channels[material][voxelIndex];
  
  // Blend colors weighted by concentration
  let r = 0, g = 0, b = 0;
  for each material:
    const concentration = field.channels[material][voxelIndex];
    const weight = concentration / totalConcentration;
    r += weight * material.color[0];
    g += weight * material.color[1];
    b += weight * material.color[2];
  
  // Assign to vertex
  colors[vertexIndex] = [r, g, b];
```

**Result:** Smooth color gradients representing material transitions

---

## Advanced Usage

### Custom Material Definitions

Create custom materials via `materialsText` parameter:

```json
[
  {
    "material": {
      "name": "Titanium",
      "density": 4500,
      "stiffness": 116e9,
      "thermalConductivity": 21.9,
      "opticalTransmission": 0,
      "diffusivity": 0.25,
      "color": [0.6, 0.6, 0.65]
    }
  },
  {
    "material": {
      "name": "Aerogel",
      "density": 100,
      "stiffness": 1e6,
      "thermalConductivity": 0.015,
      "opticalTransmission": 0.7,
      "diffusivity": 0.8,
      "color": [0.9, 0.95, 1.0]
    }
  }
]
```

### Regional Goals

Apply goals to specific regions:

```
1. Create region geometry in Roslyn (box, sphere, etc.)
2. Create geometry reference node
3. Connect to goal's "region" port
4. Goal only affects particles inside region
```

**Example:**
```
Stiffness Goal with anchor region:
- Only particles in anchor zones favor steel
- Rest of domain unaffected by this goal
```

### Multi-Material Optimization

Optimize for 4+ materials:

```
Material Order: "Steel, Ceramic, Glass, Polymer"

Goals:
- Stiffness → Steel at load paths
- Thermal → Ceramic at thermal break
- Transparency → Glass at vision zones
- Mass → Polymer for filler (lightweight)
- Blend → smooth all transitions
```

---

## Troubleshooting

### No Geometry Appears in Roslyn

**Check:**
1. Domain geometry connected to "domain" port?
2. At least one goal connected to "goals" port?
3. Enabled toggle is ON?
4. Particle count > 0?
5. Iterations > 0?
6. Iso value reasonable (0.2 - 0.5)?

**Solution:**
- Right-click Chemistry Solver node → "Ontologize"
- Check node.data.outputs.mesh has positions
- Verify mesh.positions.length > 0

### Colors Not Showing

**Check:**
1. Materials have color property?
2. mesh.colors array exists?
3. mesh.colors.length === mesh.positions.length?

**Solution:**
- Verify material definitions include `color: [r, g, b]`
- Check `buildChemistryMesh` output includes colors
- Verify `createFlatShadedMesh` preserves colors

### Solver Takes Too Long

**Solutions:**
1. Reduce particle count (2000 → 500)
2. Reduce iterations (60 → 30)
3. Reduce field resolution (32 → 16)
4. Lower particle density (1.0 → 0.5)

### Poor Material Distribution

**Solutions:**
1. Increase iterations (60 → 120)
2. Adjust goal weights (balance competing objectives)
3. Add more seed regions (guide nucleation)
4. Increase blend strength (0.6 → 1.0)
5. Adjust convergence tolerance (0.001 → 0.0001)

### Sharp Boundaries (Not Smooth)

**Solutions:**
1. Increase blend goal weight (0.6 → 0.9)
2. Increase blend strength (0.6 → 1.2)
3. Increase diffusivity in blend goal (1.2 → 2.0)
4. Increase iterations (60 → 100)

---

## Integration with Other Systems

### Workflow → Roslyn
```
Chemistry Solver → Geometry Viewer → Roslyn Viewport
                ↓
           Ontologize (Ctrl+Enter)
                ↓
        Geometry appears with material colors
```

### Roslyn → Workflow
```
Create domain geometry in Roslyn
        ↓
Select geometry
        ↓
Add Chemistry Solver Rig
        ↓
Rig auto-connects domain
```

### Downstream Processing
```
Chemistry Solver → Extract Isosurface → Mesh Operations
                → Material Field → Voxel Analysis
                → Particles → Point Cloud Visualization
```

---

## Performance Considerations

### Particle Count vs Quality

| Particles | Quality | Speed | Use Case |
|-----------|---------|-------|----------|
| 500 | Low | Fast | Quick preview |
| 2000 | Medium | Interactive | Design iteration |
| 5000 | High | Slow | Final result |
| 10000+ | Very High | Very Slow | Production |

### Field Resolution vs Detail

| Resolution | Voxels | Detail | Memory |
|------------|--------|--------|--------|
| 16 | 4,096 | Low | 16 KB |
| 32 | 32,768 | Medium | 128 KB |
| 64 | 262,144 | High | 1 MB |
| 96 | 884,736 | Very High | 3.4 MB |

### Optimization Tips

1. **Start low, refine high**
   - Preview: 500 particles, 16 resolution
   - Final: 5000 particles, 64 resolution

2. **Use particle density slider**
   - Design phase: 0.5 density (fast updates)
   - Final phase: 1.0 density (full quality)

3. **Monitor convergence**
   - Check history output
   - If energy plateaus early, reduce iterations
   - If still changing, increase iterations

---

## Semantic Meaning

### What the Chemistry Solver Represents

**NOT:**
- A shape optimizer
- A topology solver
- A mesh deformer

**IS:**
- A material reasoning system
- A continuous gradation calculator
- A goal-driven transmutation engine

**Philosophy:**
- Materials are continuous, not discrete
- Geometry emerges from material behavior
- Design intent expressed through energetic goals
- Simulation precedes form

**Architectural Application:**
- Curtain wall mullions (steel-ceramic-glass gradients)
- Structural joints (material transitions)
- Thermal breaks (insulation gradients)
- Functionally graded components

---

## Implementation Details (For Developers)

### Solver Algorithm

```typescript
// From runChemistrySolver in nodeRegistry.ts
1. Initialize particles within domain bounds
2. Apply seed regions (bias initial concentrations)
3. For each iteration:
   a. Compute goal forces for each particle
   b. Update material concentrations via gradient descent
   c. Normalize concentrations (sum = 1)
   d. Apply blend diffusion (neighbor exchange)
   e. Compute total energy
   f. Check convergence
4. Build voxel field from final particle state
5. Extract isosurface mesh
6. Blend material colors per vertex
7. Return mesh with colors + metadata
```

### Energy Function

```typescript
totalEnergy = 
  stiffnessEnergy * stiffnessWeight +
  massEnergy * massWeight +
  blendEnergy * blendWeight +
  transparencyEnergy * transparencyWeight +
  thermalEnergy * thermalWeight;

// Lower energy = better goal satisfaction
// Solver minimizes total energy
```

### Material Normalization

```typescript
// After each update, ensure concentrations sum to 1
const normalizeMaterials = (materials: Record<string, number>) => {
  let sum = 0;
  for (const material in materials) {
    materials[material] = Math.max(0, materials[material]);
    sum += materials[material];
  }
  if (sum > 0) {
    for (const material in materials) {
      materials[material] /= sum;
    }
  }
};
```

---

## API Reference

### Store Actions

```typescript
// Add chemistry solver rig
addChemistrySolverRig(position: { x: number; y: number }): void;

// Sync solver output to Roslyn
syncWorkflowGeometryToRoslyn(nodeId: string): void;

// Add mesh with colors
addGeometryMesh(mesh: RenderMesh, options?: {
  geometryId?: string;
  sourceNodeId?: string;
  metadata?: Record<string, unknown>;
  selectIds?: string[];
  recordHistory?: boolean;
}): string;
```

### Node Registry

```typescript
// Chemistry solver node definition
{
  type: "chemistrySolver",
  label: "Ἐπιλύτης Χημείας",
  category: "solver",
  inputs: [
    { key: "domain", type: "geometry", required: true },
    { key: "materials", type: "any", allowMultiple: true },
    { key: "seeds", type: "any", allowMultiple: true },
    { key: "goals", type: "goal", allowMultiple: true },
    // ... more inputs
  ],
  outputs: [
    { key: "geometry", type: "geometry" },  // Primary output
    { key: "mesh", type: "any" },
    { key: "materialParticles", type: "any" },
    { key: "materialField", type: "any" },
    { key: "history", type: "any" },
    // ... more outputs
  ],
  compute: async ({ inputs, parameters, context }) => {
    // Run chemistry solver
    const result = runChemistrySolver({ ... });
    return {
      geometry: geometryId,
      mesh: result.mesh,  // Includes colors!
      materialParticles: result.particles,
      materialField: result.field,
      history: result.history,
      // ... more outputs
    };
  },
}
```

---

## Future Enhancements

### Planned Features
- [ ] Real-time preview during solve (progress updates)
- [ ] Animation of material evolution
- [ ] Export material field for analysis
- [ ] Import material specifications from library
- [ ] GPU-accelerated particle simulation
- [ ] Adaptive particle density (refine near gradients)
- [ ] Multi-objective Pareto optimization
- [ ] Material property interpolation (beyond linear)

### Known Limitations
- Simplified marching cubes (not full implementation)
- No collision detection between particles
- No fluid dynamics (SPH approximation only)
- Limited to 20,000 particles (memory constraint)
- Field resolution capped at 96³ (memory constraint)

---

## References

**Documentation:**
- `docs/epilytes_chemias_implementation.md` - Implementation plan
- `docs/solver_architecture_guide.md` - Solver system architecture
- `docs/numerica_solvers_guide.md` - Solver usage guide

**Code:**
- `client/src/workflow/nodeRegistry.ts` - Chemistry solver node (line 10595)
- `client/src/workflow/nodes/solver/chemistry/chemistryWorker.ts` - Worker implementation
- `client/src/store/useProjectStore.ts` - Rig setup (line 7470), sync handler (line 6725)
- `client/src/geometry/renderAdapter.ts` - Color handling (line 479)

**Theory:**
- "Computational Blends: The Epistemology of Designing with Functionally Graded Materials" (RIBA President's Award 2018)
- CFD-like particle simulations for material fusion
- Materially-oriented design paradigm

---

## Summary

The chemistry solver is a **semantic material reasoning system** that:

✅ **Outputs complex results to Roslyn** via `syncWorkflowGeometryToRoslyn`  
✅ **Generates material-colored meshes** with vertex color attributes  
✅ **Preserves material metadata** in geometry records  
✅ **Integrates with workflow system** through proper node connections  
✅ **Provides rich diagnostics** (particles, field, history, energy)  

**Use it to create functionally graded components where material distribution emerges from competing design goals, not explicit assignment.**
