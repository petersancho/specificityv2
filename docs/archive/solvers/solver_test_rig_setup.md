# Chemistry Solver Test Rig Setup

**Purpose:** Complete guide for using and understanding the chemistry solver test rig in Numerica. This rig demonstrates material transmutation for functionally graded components.

**Last Updated:** 2026-01-31

---

## Overview

The chemistry solver test rig creates a complete material optimization workflow for simulating functionally graded materials (FGM). It's designed around a curtain wall mullion use case requiring:

- **Structural steel** at anchor zones (top/bottom connections)
- **Ceramic thermal break** through the core (condensation prevention)
- **Glass-compatible interface** at glazing contact surfaces
- **Mass optimization** to reduce embodied carbon

---

## Quick Start

### 1. Add the Test Rig

In Numerica, right-click the canvas and select **"Add Chemistry Solver Rig"** or use the command:

```typescript
// In code or console:
useProjectStore.getState().addChemistrySolverRig({ x: 100, y: 100 });
```

### 2. Connect Domain Geometry

1. In Roslyn, create a box or mesh that represents your mullion profile
2. Select the geometry
3. In the rig, click the **"Mullion Domain"** node
4. Use the geometry picker to link your selected geometry

### 3. Run the Solver

1. Ensure the **Toggle Switch** is ON (enabled)
2. The solver will compute automatically
3. Watch the **Geometry Viewer** for the graded result
4. Check the **Diagnostics Panel** for status

### 4. Ontologize to Roslyn

1. Select the **Chemistry Solver** node
2. Press **Ctrl+Enter** or right-click → "Ontologize"
3. The graded mesh with material colors appears in Roslyn

---

## Semantic Group Organization

The rig is organized into **five semantic groups** for clarity:

### 1. Controls Group (Green)
Solver parameters and toggles.

| Node | Purpose |
|------|---------|
| Toggle Switch | Enable/disable solver execution |
| Particle Density Slider | Scale particle count (0.1-1.0) |
| Particle Count | Base particle count (default: 10,000) |
| Iterations | Optimization iterations (default: 40) |
| Field Resolution | Voxel grid resolution (8-96) |
| Iso Value | Isosurface threshold (0-1) |
| Blend Strength | Material diffusion rate (0-2) |
| Convergence | Early stopping threshold |

### 2. Domain Group (Blue)
Geometry references for the solver domain and seed regions.

| Node | Purpose |
|------|---------|
| Mullion Domain | Main spatial boundary (REQUIRED) |
| Anchor Zones (Steel) | Regions biased toward steel |
| Thermal Core (Ceramic) | Regions biased toward ceramic |
| Vision Strip (Glass) | Regions biased toward glass |

### 3. Goals Group (Orange)
Chemistry goal nodes that drive material distribution.

| Node | Greek Name | Purpose |
|------|------------|---------|
| Stiffness Goal | Τέλος Σκληρότητος | Bias high-stiffness materials to load paths |
| Mass Goal | Τέλος Ἐλαχίστου Ὄγκου | Minimize total mass |
| Blend Goal | Τέλος Κράσεως | Smooth gradients for manufacturability |
| Transparency Goal | Τέλος Διαφανείας | Bias glass to optical regions |
| Thermal Goal | Τέλος Ῥοῆς Θερμότητος | Ceramic insulation in core |

### 4. Solver Group (Pink)
The chemistry solver node itself.

| Node | Greek Name | Purpose |
|------|------------|---------|
| Chemistry Solver | Ἐπιλύτης Χημείας | Material transmutation computation |

### 5. Output Group (Purple)
Visualization and monitoring outputs.

| Node | Purpose |
|------|---------|
| Geometry Viewer | Preview graded mesh |
| Diagnostics Panel | Monitor solver status, warnings |

---

## Wire Connections

### Input Flow

```
Domain Geometry ─────────────────────────────→ Chemistry Solver (domain)
Anchor Zones ─────→ Stiffness Goal (region) ─→ Chemistry Solver (goals)
              └───→ Chemistry Solver (seeds, materials)
Thermal Core ─────→ Thermal Goal (region) ───→ Chemistry Solver (goals)
             └────→ Chemistry Solver (seeds, materials)
Vision Strip ─────→ Transparency Goal (region) → Chemistry Solver (goals)
             └────→ Chemistry Solver (seeds, materials)
Mass Goal ─────────────────────────────────────→ Chemistry Solver (goals)
Blend Goal ────────────────────────────────────→ Chemistry Solver (goals)
```

### Control Flow

```
Toggle Switch ────────→ Chemistry Solver (enabled)
Particle Density ─────→ Chemistry Solver (particleDensity)
Particle Count ───────→ Chemistry Solver (particleCount)
Iterations ───────────→ Chemistry Solver (iterations)
Field Resolution ─────→ Chemistry Solver (fieldResolution)
Iso Value ────────────→ Chemistry Solver (isoValue)
Blend Strength ───────→ Chemistry Solver (blendStrength)
Convergence ──────────→ Chemistry Solver (convergenceTolerance)
```

### Output Flow

```
Chemistry Solver (geometry) ────→ Geometry Viewer (geometry)
Chemistry Solver (diagnostics) ─→ Diagnostics Panel (data)
```

---

## Particle System

### Configuration

The solver uses a particle-based simulation:

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| particleCount | 10,000 | 100-20,000 | Base particle count |
| particleDensity | 0.5 | 0.1-1.0 | Scale factor (multiply by particleCount) |
| Effective count | 5,000 | 10-20,000 | particleCount × particleDensity |

### For Production Simulations

Use **8,000-10,000 particles** for production-quality results:

1. Set **Particle Count** = 10,000
2. Set **Particle Density** = 1.0 (full resolution)
3. Increase **Iterations** to 60-100 for convergence
4. Set **Field Resolution** to 48-64 for detailed mesh

### For Fast Preview

Use lower settings during design iteration:

1. Set **Particle Density** = 0.3-0.5
2. Set **Iterations** = 20-30
3. Set **Field Resolution** = 24-32

---

## Materials

### Default Material Library

The rig includes three materials with distinct properties:

| Material | Density | Stiffness | Thermal K | Optical | Color |
|----------|---------|-----------|-----------|---------|-------|
| Steel | 7,850 kg/m³ | 200 GPa | 50 W/(m·K) | 0 (opaque) | Gray |
| Ceramic | 3,900 kg/m³ | 350 GPa | 2 W/(m·K) | 0 (opaque) | Red |
| Glass | 2,500 kg/m³ | 70 GPa | 1 W/(m·K) | 0.9 (clear) | Blue |

### Custom Materials

Modify the **materialsText** parameter in the solver node:

```json
[
  { "material": { "name": "Steel", "color": [0.75, 0.75, 0.78] } },
  { "material": { "name": "Ceramic", "color": [0.9, 0.2, 0.2] } },
  { "material": { "name": "Glass", "color": [0.2, 0.4, 0.9] } }
]
```

---

## Geometry Output to Roslyn

### Automatic Sync

When the solver completes:

1. Mesh is generated from the material field
2. Vertex colors encode material concentrations (gradient)
3. Geometry ID is assigned to the solver node
4. Mesh appears in Geometry Viewer preview

### Manual Ontologize

To push the result to Roslyn's modelspace:

1. **Select** the Chemistry Solver node
2. **Press Ctrl+Enter** or right-click → "Ontologize"
3. The mesh is added to Roslyn with:
   - Vertex colors (material gradients)
   - Metadata (particle count, energy, status)
   - Layer assignment

### Verify Output

Check that geometry appears:

1. Look for the mesh in Roslyn's viewport
2. Colors should show gradients (gray steel, red ceramic, blue glass)
3. Select the mesh and check the Properties panel for metadata

---

## Goal Configuration

### Stiffness Goal (Τέλος Σκληρότητος)

Drives high-stiffness materials to load-bearing regions.

| Parameter | Default | Description |
|-----------|---------|-------------|
| loadVectorX | 0 | X-component of load direction |
| loadVectorY | -1 | Y-component (gravity down) |
| loadVectorZ | 0 | Z-component |
| structuralPenalty | 1.5 | Penalty for low-stiffness in load path |
| weight | 0.7 | Goal importance (0-1) |

**Connect** anchor zones geometry to the **region** input to focus stiffness optimization.

### Mass Goal (Τέλος Ἐλαχίστου Ὄγκου)

Minimizes total mass for embodied carbon reduction.

| Parameter | Default | Description |
|-----------|---------|-------------|
| targetMassFraction | 0.55 | Target fraction of original mass |
| densityPenalty | 1.2 | Penalty multiplier for high-density |
| weight | 0.4 | Goal importance (0-1) |

### Blend Goal (Τέλος Κράσεως)

Ensures smooth material transitions for manufacturability.

| Parameter | Default | Description |
|-----------|---------|-------------|
| smoothness | 0.75 | Gradient smoothness (0-1) |
| diffusivity | 1.2 | Diffusion rate between particles |
| weight | 0.6 | Goal importance (0-1) |

### Transparency Goal (Τέλος Διαφανείας)

Biases transparent materials to optical regions.

| Parameter | Default | Description |
|-----------|---------|-------------|
| opticalWeight | 2.0 | Weight for transparency preference |
| weight | 0.45 | Goal importance (0-1) |

**Connect** vision strip geometry to the **region** input.

### Thermal Goal (Τέλος Ῥοῆς Θερμότητος)

Optimizes thermal conductivity (insulation or conduction).

| Parameter | Default | Description |
|-----------|---------|-------------|
| mode | "insulate" | "insulate" or "conduct" |
| thermalWeight | 2.5 | Thermal preference weight |
| weight | 0.65 | Goal importance (0-1) |

**Connect** thermal core geometry to the **region** input.

---

## Troubleshooting

### No Geometry Appears in Roslyn

**Symptoms:** Solver shows "complete" but no mesh in Roslyn.

**Check:**
1. Is the **domain** geometry connected?
2. Is the **Toggle Switch** enabled?
3. Are **particle count** and **iterations** > 0?
4. Is the **iso value** reasonable (try 0.1-0.4)?

**Solution:**
1. Right-click solver node → "Ontologize"
2. Check Diagnostics Panel for warnings
3. Try lowering iso value (more material visible)

### Empty Mesh (Zero Triangles)

**Symptoms:** Solver runs but mesh has no triangles.

**Cause:** No voxels exceeded the isoValue threshold.

**Solution:**
1. Lower **Iso Value** (try 0.1)
2. Increase **Particle Count**
3. Check field stats in console logs

### Colors Not Showing

**Symptoms:** Mesh appears but is all one color.

**Check:**
1. Does mesh have vertex colors? (Check `mesh.colors.length`)
2. Are materials defined with colors?

**Solution:**
1. Verify materialsText JSON includes color arrays
2. Check that `createFlatShadedMesh` preserves colors in render adapter

### Solver Takes Too Long

**Solutions:**
1. Reduce **Particle Count** (2,000 for preview)
2. Reduce **Iterations** (20-30 for preview)
3. Reduce **Field Resolution** (24 for preview)
4. Use **Particle Density** slider (0.3 for fast)

### Poor Material Distribution

**Symptoms:** Materials not blending smoothly or wrong placement.

**Solutions:**
1. Increase **Iterations** (60-100)
2. Increase **Blend Strength** (0.8-1.2)
3. Add more **seed regions** to guide nucleation
4. Adjust **goal weights** to balance competing objectives

---

## Material Dashboard Node

The **Material Dashboard** node (chemistryMaterialGoal) provides comprehensive monitoring:

### Inputs
- **Solver Status** - Connect to solver's status output
- **Particle Count** - Connect to monitor particle count
- **Total Energy** - Connect to track convergence
- **Diagnostics** - Connect for warnings and iteration info

### Outputs
- **materialsText** - Assignment text for solver
- **distribution** - Per-material percentages
- **assignmentCount** - Total assignments
- **materialCount** - Number of material types
- **dashboardText** - Formatted status display
- **status** - Current goal status

### Dashboard Display

The dashboard shows:
```
═══ Material Dashboard ═══

Total Assignments: 3
Material Types: 3

--- Distribution ---
Ceramic: 33.3% ██████
Glass: 33.3% ██████
Steel: 33.3% ██████

═══ Solver Status ═══
Status: complete
Particles: 10,000
Energy: 0.234567
Iterations: 45
```

---

## Performance Guide

### Particle Count vs Quality

| Particles | Quality | Speed | Use Case |
|-----------|---------|-------|----------|
| 500-1,000 | Low | Fast | Quick preview |
| 2,000-3,000 | Medium | Moderate | Design iteration |
| 5,000-7,000 | High | Slow | Detailed review |
| 8,000-10,000 | Production | Very slow | Final output |

### Field Resolution vs Detail

| Resolution | Voxels | Detail | Memory |
|------------|--------|--------|--------|
| 16 | 4,096 | Low | ~16 KB |
| 32 | 32,768 | Medium | ~128 KB |
| 48 | 110,592 | High | ~430 KB |
| 64 | 262,144 | Very High | ~1 MB |

### Recommended Settings by Phase

**Exploration Phase:**
```
particleCount: 2000
particleDensity: 0.5
iterations: 25
fieldResolution: 24
```

**Design Phase:**
```
particleCount: 5000
particleDensity: 0.7
iterations: 40
fieldResolution: 32
```

**Production Phase:**
```
particleCount: 10000
particleDensity: 1.0
iterations: 80
fieldResolution: 48-64
```

---

## API Reference

### Store Actions

```typescript
// Add chemistry solver test rig
addChemistrySolverRig(position: { x: number; y: number }): void

// Sync solver output to Roslyn
syncWorkflowGeometryToRoslyn(nodeId: string): void
```

### Solver Outputs

```typescript
interface ChemistrySolverOutputs {
  geometry: string;           // Geometry ID
  mesh: RenderMesh;           // Mesh with colors
  materialParticles: Particle[];
  materialField: ChemistryField;
  history: EnergyHistory[];
  bestState: BestState;
  materials: MaterialSpec[];
  totalEnergy: number;
  status: string;
  diagnostics: Diagnostics;
}
```

---

## See Also

- `chemistry_solver_workflow.md` - Complete chemistry solver guide
- `epilytes_chemias_implementation.md` - Implementation details
- `solver_architecture_guide.md` - Solver system architecture
- `geometry_kernel_reference.md` - Mesh generation functions
- `numerica_node_development.md` - Node development patterns
