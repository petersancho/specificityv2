# Solver Architecture and Sub-Category System
## A Guide to Implementing Goal-Based Computational Nodes in Lingua

---

## Table of Contents

1. **Architectural Philosophy and Rationale**
2. **Category Structure and UI Design**
3. **The Ἐπιλύτου Εἰσαγωγαί (Solver Inputs) Pattern**
4. **Implementation Specifications**
5. **The Physics Solver: Ἐπιλύτης Φυσικῆς**
6. **Goal Nodes: Σκληρότης, Ὄγκος, Βάρος, Ἄγκυρα**
7. **C++ Integration and Safety Mechanisms**
8. **Future Extensibility Guidelines**
9. **Code Organization and File Structure**

---

## Part 1: Architectural Philosophy and Rationale

### The Solver Paradigm Shift

The introduction of the Solver category represents a fundamental architectural evolution in Numerica. While traditional nodes perform immediate, deterministic computations (a NURBS curve generates a curve, a transform node transforms geometry), Solvers operate in a different ontological space. They are optimization engines that seek solutions to complex, often physically-grounded problems where no closed-form solution exists.

The transition from "Voxel Optimization" to "Solver" reflects this deeper understanding. Voxel optimization is one specific technique among many optimization strategies. By generalizing to "Solvers," we create space for physics simulation, form-finding, structural optimization, fluid dynamics, and any future computational method that requires iterative solution-finding rather than direct calculation.

### Why Goal Nodes Exist

Solvers are fundamentally different from regular nodes because they require two distinct types of information:

**Primary Parameters:** The basic setup (mesh resolution, time steps, convergence criteria). These are properties of the solver itself and remain as standard node parameters.

**Optimization Goals:** The objectives and constraints that guide the solver toward a solution. These are not simple parameters but rich computational objects that may themselves depend on other geometry, analysis, or data nodes. A stiffness goal might reference specific edges in a mesh. A load goal might derive force vectors from sun analysis or wind simulation data.

Goal nodes solve this architectural challenge elegantly. They are first-class computational entities that can accept inputs from the broader Numerica graph, process them into the specific format the solver needs, and pass that structured objective to the solver. This creates a clean separation of concerns where the solver focuses on optimization mechanics while Goal nodes handle the semantic translation of design intent into mathematical constraints.

### The Ancient Greek Naming Convention

The choice to use Ancient Greek for Solver and Goal node names is not merely aesthetic. It serves several purposes:

**Historical Reverence:** The foundations of geometry, mathematics, and physics were laid by Greek mathematicians and philosophers. Archimedes developed the principles of leverage and buoyancy. Euclid formalized geometric reasoning. This naming honors their intellectual legacy.

**Semantic Clarity Through Etymology:** Greek mathematical terms are often more precise than their modern equivalents. Σκληρότης (hardness/stiffness) captures resistance to deformation in a way that connects directly to physical intuition. Ὄγκος (bulk/volume) is the root of "oncology" because it means mass that occupies space.

**Distinctiveness in the Node Library:** The Greek names immediately signal to users that these nodes operate in a different computational domain. When you see Ἐπιλύτης Φυσικῆς in the node list, you understand immediately that this is not a simple geometric operation but a sophisticated solver requiring careful configuration.

**International Accessibility:** Unlike English, which privileges native speakers, Ancient Greek is equally foreign (or familiar) to all modern users. The required hover tooltips and documentation ensure that the names become learning opportunities rather than barriers.

However, we maintain pragmatism in the implementation. Sub-sub-categories use English ("Physics Goals") to balance heritage with usability. All tooltips provide instant translation. Documentation includes both Greek and English throughout.

### The Sub-Category Innovation

The introduction of sub-categories with dropdown UI represents a new organizational layer in Numerica's node library. This is necessary because Goal nodes exist in a dependent relationship with their parent Solvers. A Stiffness goal makes no sense without a structural solver to apply it to. The sub-category structure makes this dependency explicit in the interface.

The pattern is:

**Main Category:** Solver (contains all solver nodes)  
**Sub-Category:** Ἐπιλύτου Εἰσαγωγαί (contains all goal nodes, organized by solver type)  
**Sub-Sub-Category:** Physics Goals, Voxel Goals, etc. (specific goal sets for specific solvers)

This three-tier structure allows the node library to scale gracefully as new solvers are added. Each solver can define its own set of goals without cluttering the main category view.

---

## Part 2: Category Structure and UI Design

### Node Library Organization

The node library panel requires modification to support the new sub-category pattern. The implementation must maintain visual consistency with existing categories while introducing the dropdown mechanism for sub-categories.

#### Current Category Structure (Before):

```
Categories:
├─ Data
├─ Basics
├─ Lists
├─ Primitives
├─ Curves
├─ Surfaces
├─ Transforms
├─ Euclidean
├─ Ranges
├─ Signals
├─ Analysis
├─ Math
├─ Logic
└─ Voxel Optimization  ← Being replaced
```

#### New Category Structure (After):

```
Categories:
├─ Data
├─ Basics
├─ Lists
├─ Primitives
├─ Curves
├─ Surfaces
├─ Transforms
├─ Euclidean
├─ Ranges
├─ Signals
├─ Analysis
├─ Math
├─ Logic
└─ Solver  ← New main category
    └─ [Ἐπιλύτου Εἰσαγωγαί ▾]  ← Sub-category dropdown
        ├─ Physics Goals
        │   ├─ Σκληρότης (Stiffness)
        │   ├─ Ὄγκος (Volume)
        │   ├─ Βάρος (Load)
        │   └─ Ἄγκυρα (Anchor)
        ├─ Chemistry Goals
        │   ├─ Ὕλη (Material)
        │   ├─ Σκληρότης Χημείας (Stiffness)
        │   ├─ Μᾶζα (Mass)
        │   └─ Κρᾶσις (Blend)
        └─ Voxel Goals
            └─ (Future voxel-specific goals)
```

### UI Layout Specification

#### Main Category View

When the user selects the "Solver" category, they see:

**Top Section - Solver Nodes:**
```
┌─────────────────────────────────────┐
│ SOLVER                              │
├─────────────────────────────────────┤
│                                     │
│  [Ἐπιλύτης Φυσικῆς]                │
│  Physics Solver                     │
│                                     │
│  [Ἐπιλύτης Χημείας]                │
│  Chemistry Solver                   │
│                                     │
│  [Ἐπιλύτης Φογκελ]                 │
│  Voxel Solver                       │
│                                     │
├─────────────────────────────────────┤
```

**Bottom Section - Sub-Category Dropdown:**
```
├─────────────────────────────────────┤
│ Ἐπιλύτου Εἰσαγωγαί ▾               │
│ (Solver Inputs)                     │
└─────────────────────────────────────┘
```

#### Expanded Sub-Category View

When the user clicks the dropdown, it expands to show sub-sub-categories:

```
┌─────────────────────────────────────┐
│ Ἐπιλύτου Εἰσαγωγαί ▴               │
│ (Solver Inputs)                     │
├─────────────────────────────────────┤
│                                     │
│ ▸ Physics Goals                     │
│                                     │
│ ▸ Chemistry Goals                   │
│                                     │
│ ▸ Voxel Goals                       │
│                                     │
└─────────────────────────────────────┘
```

#### Expanded Sub-Sub-Category View

When the user expands "Physics Goals":

```
┌─────────────────────────────────────┐
│ Ἐπιλύτου Εἰσαγωγαί ▴               │
│ (Solver Inputs)                     │
├─────────────────────────────────────┤
│                                     │
│ ▾ Physics Goals                     │
│                                     │
│   [Σκληρότης]                       │
│   Stiffness                         │
│                                     │
│   [Ὄγκος]                           │
│   Volume                            │
│                                     │
│   [Βάρος]                           │
│   Load                              │
│                                     │
│   [Ἄγκυρα]                          │
│   Anchor                            │
│                                     │
│ ▸ Chemistry Goals                   │
│                                     │
│ ▸ Voxel Goals                       │
│                                     │
└─────────────────────────────────────┘
```

### Hover Tooltip System

Every Ancient Greek term must have an immediate translation tooltip. The system should display:

**For Solver Nodes:**
```
┌─────────────────────────────────────┐
│ Ἐπιλύτης Φυσικῆς                    │
│                                     │
│ Physics Solver                      │
│ (Epilýtēs Physikês)                 │
│                                     │
│ Computes physical equilibrium       │
│ states for structural systems       │
└─────────────────────────────────────┘
```

**For Goal Nodes:**
```
┌─────────────────────────────────────┐
│ Σκληρότης                           │
│                                     │
│ Stiffness                           │
│ (Sklērótēs)                         │
│                                     │
│ Defines resistance to deformation   │
│ for structural elements             │
└─────────────────────────────────────┘
```

**For Category Names:**
```
┌─────────────────────────────────────┐
│ Ἐπιλύτου Εἰσαγωγαί                  │
│                                     │
│ Solver Inputs                       │
│ (Epilýtou Eisagōgaí)                │
│                                     │
│ Goal nodes that define optimization │
│ objectives for solvers              │
└─────────────────────────────────────┘
```

### Visual Design Specifications

**Color Coding:**
- Solver nodes: Deep purple background (#7A5CFF from the mesh category palette)
- Goal nodes: Light purple background (#B8A6FF - 40% lighter than solver purple)
- Sub-category dropdown: Subtle gradient from white to light purple

**Typography:**
- Greek text: Use "Noto Serif" or "GFS Didot" font for proper Greek character rendering
- Romanization: Small caps, 80% opacity, 90% font size
- Translation: Regular weight, 70% opacity

**Icon Design:**
- Solver nodes: Ancient Greek capital Epsilon (Ε) with subtle glow effect
- Goal nodes: Lowercase sigma (σ) for mathematical sum/constraint symbolism

**Animation:**
- Dropdown expansion: 200ms ease-out
- Tooltip appearance: 100ms fade-in with 300ms delay
- Node drag initiation: Subtle pulse effect on Greek text

---

## Part 3: The Ἐπιλύτου Εἰσαγωγαί (Solver Inputs) Pattern

### Conceptual Foundation

The Ἐπιλύτου Εἰσαγωγαί pattern establishes a reusable architectural template for any future solver that requires configurable optimization goals. This is not specific to physics simulation but represents a general pattern for how complex optimization problems should be structured in Numerica.

### The Goal Node Contract

Every Goal node must satisfy this interface contract:

```typescript
interface GoalNode {
  // Metadata
  type: string              // e.g., "stiffness", "volume"
  category: 'goal'          // All goal nodes share this category
  solverType: string        // Which solver(s) accept this goal
  
  // Inputs (from other Numerica nodes)
  inputs: {
    [key: string]: {
      type: DataType
      required: boolean
      default?: any
    }
  }
  
  // Output (to solver node)
  outputs: {
    goal: {
      type: 'goal'
      data: GoalSpecification
    }
  }
  
  // Computation
  compute: (inputs: any) => GoalSpecification
}
```

The `GoalSpecification` is a structured data format that the solver understands. It contains:

```typescript
interface GoalSpecification {
  goalType: string           // "stiffness", "volume", etc.
  weight: number             // Relative importance (0.0-1.0)
  target?: number            // Target value for the goal
  constraint?: {             // Optional constraint bounds
    min?: number
    max?: number
  }
  geometry: {                // Geometric context
    elements: number[]       // Which mesh elements this applies to
    region?: BoundingBox     // Spatial region
  }
  parameters: {              // Goal-specific parameters
    [key: string]: any
  }
}
```

### Data Flow Architecture

The complete data flow follows this pattern:

```
Regular Numerica Nodes
        ↓
[Geometry, Analysis, Data]
        ↓
    Goal Nodes  ← Process inputs into goal specifications
        ↓
[Σκληρότης, Ὄγκος, Βάρος, Ἄγκυρα]
        ↓
   Solver Node  ← Accepts only goal inputs
        ↓
[Ἐπιλύτης Φυσικῆς]
        ↓
  C++ Backend   ← Performs optimization
        ↓
   Result Mesh/Animation
```

This creates a clear separation of concerns:
- **Numerica nodes** generate design geometry and data
- **Goal nodes** translate design intent into mathematical objectives
- **Solver nodes** coordinate the optimization process
- **C++ backend** executes computationally intensive calculations

### Type Safety and Validation

The system enforces type safety at multiple levels:

**Level 1 - Input Validation:**
Goal nodes validate that incoming data matches expected types. A Stiffness goal expecting edge indices rejects surface data.

**Level 2 - Goal Compatibility:**
Solver nodes validate that connected Goal nodes are compatible with their solver type. The Physics Solver rejects Voxel and Chemistry goals, while the Chemistry Solver rejects Physics and Voxel goals.

**Level 3 - Specification Validation:**
Before passing to C++, the solver validates that the goal specification is complete and mathematically feasible.

Example validation in the Physics Solver:

```typescript
function validateGoals(goals: GoalSpecification[]): ValidationResult {
  const errors: string[] = []
  
  // Check for conflicting goals
  const volumeGoals = goals.filter(g => g.goalType === 'volume')
  const loadGoals = goals.filter(g => g.goalType === 'load')
  
  if (volumeGoals.length > 1) {
    errors.push("Only one Volume goal allowed per Physics Solver")
  }
  
  if (loadGoals.length > 0 && volumeGoals.length === 0) {
    errors.push("Load goals require a Volume goal to define the material")
  }
  
  // Check geometric validity
  goals.forEach(goal => {
    if (goal.geometry.elements.length === 0) {
      errors.push(`${goal.goalType} goal has no geometric elements`)
    }
  })
  
  return {
    valid: errors.length === 0,
    errors
  }
}
```

### Weight System and Multi-Objective Optimization

When multiple goals are connected to a solver, they may conflict. A structure cannot simultaneously maximize stiffness (requires more material) and minimize volume (requires less material). The solver must balance these competing objectives.

Each Goal node includes a `weight` parameter (0.0 to 1.0) that determines its relative importance. The solver combines goals using weighted optimization:

```
Objective Function = w₁·Goal₁ + w₂·Goal₂ + ... + wₙ·Goalₙ

Where Σwᵢ = 1.0
```

The system automatically normalizes weights if they don't sum to 1.0, but warns the user.

---

## Part 4: Implementation Specifications

### File Structure

```
client/src/
  workflow/
    nodes/
      solver/                     ← New directory
        SolverCategory.ts         ← Category registration
        PhysicsSolver.ts          ← Ἐπιλύτης Φυσικῆς node
        VoxelSolver.ts            ← Existing voxel solver
        goals/                    ← Goal nodes
          physics/
            StiffnessGoal.ts      ← Σκληρότης
            VolumeGoal.ts         ← Ὄγκος
            LoadGoal.ts           ← Βάρος
            AnchorGoal.ts         ← Ἄγκυρα
          voxel/
            (future voxel goals)
        types.ts                  ← Shared types
        validation.ts             ← Goal validation
        
  components/
    workflow/
      NodeLibrary.tsx             ← Modified for sub-categories
      SubCategoryDropdown.tsx     ← New component
      
  cpp/                            ← C++ integration
    solvers/
      PhysicsSolver.cpp
      PhysicsSolver.h
```

### TypeScript Type Definitions

**Core Types (types.ts):**

```typescript
// Goal specification base type
export interface GoalSpecification {
  goalType: string
  weight: number
  target?: number
  constraint?: {
    min?: number
    max?: number
  }
  geometry: {
    elements: number[]
    region?: {
      min: Vec3
      max: Vec3
    }
  }
  parameters: Record<string, any>
}

// Physics-specific goal types
export interface StiffnessGoal extends GoalSpecification {
  goalType: 'stiffness'
  parameters: {
    youngModulus: number      // Material property (Pa)
    poissonRatio: number      // Material property (dimensionless)
    targetStiffness?: number  // Optional target value
  }
}

export interface VolumeGoal extends GoalSpecification {
  goalType: 'volume'
  parameters: {
    targetVolume?: number     // Target volume (m³)
    materialDensity: number   // kg/m³
    allowedDeviation: number  // Percentage
  }
}

export interface LoadGoal extends GoalSpecification {
  goalType: 'load'
  parameters: {
    force: Vec3               // Force vector (N)
    applicationPoints: number[] // Vertex indices
    distributed: boolean      // Point load vs distributed
  }
}

export interface AnchorGoal extends GoalSpecification {
  goalType: 'anchor'
  parameters: {
    fixedDOF: {              // Degrees of freedom
      x: boolean
      y: boolean
      z: boolean
      rotX?: boolean
      rotY?: boolean
      rotZ?: boolean
    }
  }
}

// Solver configuration
export interface SolverConfiguration {
  maxIterations: number
  convergenceTolerance: number
  timeStep?: number          // For dynamic solvers
  safetyLimits: {
    maxDeformation: number   // Prevent unrealistic results
    maxStress: number
  }
}

// Solver result
export interface SolverResult {
  success: boolean
  iterations: number
  convergenceAchieved: boolean
  finalObjectiveValue: number
  
  // Output data
  deformedMesh?: Mesh
  animation?: {
    frames: Mesh[]
    timeStamps: number[]
  }
  
  // Analysis data
  stressField?: number[]     // Per-element stress values
  displacements?: Vec3[]     // Per-vertex displacement
  
  // Diagnostics
  warnings: string[]
  errors: string[]
  performanceMetrics: {
    computeTime: number      // milliseconds
    memoryUsed: number       // bytes
  }
}
```

### Node Library UI Component (SubCategoryDropdown.tsx)

```typescript
import React, { useState } from 'react'

interface SubCategory {
  name: string
  nameGreek?: string
  romanization?: string
  translation?: string
  subSubCategories: SubSubCategory[]
}

interface SubSubCategory {
  name: string
  nodes: NodeDefinition[]
}

interface NodeDefinition {
  type: string
  nameGreek?: string
  nameEnglish: string
  romanization?: string
  description: string
  icon?: string
}

export const SubCategoryDropdown: React.FC<{
  subCategory: SubCategory
}> = ({ subCategory }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedSubSub, setExpandedSubSub] = useState<Set<string>>(new Set())
  
  const toggleSubSub = (name: string) => {
    const newSet = new Set(expandedSubSub)
    if (newSet.has(name)) {
      newSet.delete(name)
    } else {
      newSet.add(name)
    }
    setExpandedSubSub(newSet)
  }
  
  return (
    <div className="sub-category-dropdown">
      <button 
        className="sub-category-header"
        onClick={() => setIsExpanded(!isExpanded)}
        title={subCategory.translation}
      >
        <span className="greek-text">{subCategory.nameGreek}</span>
        <span className="romanization">({subCategory.romanization})</span>
        <span className="translation">{subCategory.translation}</span>
        <span className="arrow">{isExpanded ? '▴' : '▾'}</span>
      </button>
      
      {isExpanded && (
        <div className="sub-category-content">
          {subCategory.subSubCategories.map(subSub => (
            <div key={subSub.name} className="sub-sub-category">
              <button
                className="sub-sub-header"
                onClick={() => toggleSubSub(subSub.name)}
              >
                <span className="arrow">
                  {expandedSubSub.has(subSub.name) ? '▾' : '▸'}
                </span>
                {subSub.name}
              </button>
              
              {expandedSubSub.has(subSub.name) && (
                <div className="node-list">
                  {subSub.nodes.map(node => (
                    <NodeButton key={node.type} node={node} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const NodeButton: React.FC<{ node: NodeDefinition }> = ({ node }) => {
  const [showTooltip, setShowTooltip] = useState(false)
  
  return (
    <button
      className="node-button goal-node"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('nodeType', node.type)
      }}
    >
      <div className="node-name">
        {node.nameGreek && (
          <span className="greek-text">{node.nameGreek}</span>
        )}
        <span className="english-text">{node.nameEnglish}</span>
      </div>
      
      {showTooltip && (
        <div className="node-tooltip">
          {node.nameGreek && (
            <>
              <div className="tooltip-greek">{node.nameGreek}</div>
              <div className="tooltip-romanization">
                ({node.romanization})
              </div>
            </>
          )}
          <div className="tooltip-description">{node.description}</div>
        </div>
      )}
    </button>
  )
}
```

### Category Registration (SolverCategory.ts)

```typescript
import { NodeCategory } from '../types'
import { PhysicsSolverNode } from './PhysicsSolver'
import { ChemistrySolverNode } from './ChemistrySolver'
import { VoxelSolverNode } from './VoxelSolver'
import { StiffnessGoalNode } from './goals/physics/StiffnessGoal'
import { VolumeGoalNode } from './goals/physics/VolumeGoal'
import { LoadGoalNode } from './goals/physics/LoadGoal'
import { AnchorGoalNode } from './goals/physics/AnchorGoal'
import { ChemistryMaterialGoalNode } from './goals/chemistry/ChemistryMaterialGoal'
import { ChemistryStiffnessGoalNode } from './goals/chemistry/ChemistryStiffnessGoal'
import { ChemistryMassGoalNode } from './goals/chemistry/ChemistryMassGoal'
import { ChemistryBlendGoalNode } from './goals/chemistry/ChemistryBlendGoal'

export const SolverCategory: NodeCategory = {
  name: 'Solver',
  color: '#7A5CFF',
  
  nodes: [
    PhysicsSolverNode,
    ChemistrySolverNode,
    VoxelSolverNode
  ],
  
  subCategories: [
    {
      name: 'Solver Inputs',
      nameGreek: 'Ἐπιλύτου Εἰσαγωγαί',
      romanization: 'Epilýtou Eisagōgaí',
      translation: 'Solver Inputs',
      description: 'Goal nodes that define optimization objectives for solvers',
      
      subSubCategories: [
        {
          name: 'Physics Goals',
          nodes: [
            StiffnessGoalNode,
            VolumeGoalNode,
            LoadGoalNode,
            AnchorGoalNode
          ]
        },
        {
          name: 'Chemistry Goals',
          nodes: [
            ChemistryMaterialGoalNode,
            ChemistryStiffnessGoalNode,
            ChemistryMassGoalNode,
            ChemistryBlendGoalNode
          ]
        },
        {
          name: 'Voxel Goals',
          nodes: [
            // Future voxel-specific goals
          ]
        }
      ]
    }
  ]
}
```

---

## Part 5: The Physics Solver - Ἐπιλύτης Φυσικῆς

### Conceptual Overview

The Physics Solver computes equilibrium states for structural systems under applied loads and constraints. It solves the fundamental equation of structural mechanics:

```
Kd = F

Where:
K = Global stiffness matrix (derived from geometry and material properties)
d = Displacement vector (unknown - what we're solving for)
F = Force vector (applied loads)
```

This is a linear elastic analysis in the simplest case, though the system is designed to support nonlinear analysis in future versions.

### Node Specification

**Node Definition (PhysicsSolver.ts):**

```typescript
export const PhysicsSolverNode: WorkflowNode = {
  type: 'physicsSolver',
  category: 'solver',
  
  // Display metadata
  display: {
    nameGreek: 'Ἐπιλύτης Φυσικῆς',
    nameEnglish: 'Physics Solver',
    romanization: 'Epilýtēs Physikês',
    description: 'Computes physical equilibrium states for structural systems',
    icon: 'physics-solver'
  },
  
  // Inputs - ONLY accepts Goal nodes
  inputs: {
    goals: {
      type: 'goal[]',              // Array of goal specifications
      required: true,
      minCount: 2,                 // Need at least anchor + one other goal
      acceptedGoalTypes: [
        'stiffness',
        'volume',
        'load',
        'anchor'
      ],
      validation: (goals) => {
        // Must have at least one anchor
        const hasAnchor = goals.some(g => g.goalType === 'anchor')
        if (!hasAnchor) {
          return {
            valid: false,
            error: 'Physics Solver requires at least one Anchor goal'
          }
        }
        
        // If there are loads, must have volume (to define material)
        const hasLoad = goals.some(g => g.goalType === 'load')
        const hasVolume = goals.some(g => g.goalType === 'volume')
        if (hasLoad && !hasVolume) {
          return {
            valid: false,
            error: 'Load goals require a Volume goal to define material properties'
          }
        }
        
        return { valid: true }
      }
    },
    
    // Base mesh to solve on
    baseMesh: {
      type: 'mesh',
      required: true,
      description: 'The structural mesh to analyze'
    }
  },
  
  // Parameters (solver configuration)
  parameters: {
    maxIterations: {
      type: 'number',
      default: 1000,
      min: 10,
      max: 10000,
      description: 'Maximum solver iterations before termination'
    },
    
    convergenceTolerance: {
      type: 'number',
      default: 1e-6,
      min: 1e-12,
      max: 1e-2,
      description: 'Relative change threshold for convergence'
    },
    
    analysisType: {
      type: 'string',
      options: ['static', 'dynamic', 'modal'],
      default: 'static',
      description: 'Type of structural analysis to perform'
    },
    
    // Animation settings (for dynamic/modal)
    animationFrames: {
      type: 'number',
      default: 60,
      min: 10,
      max: 300,
      enabled: (params) => params.analysisType !== 'static',
      description: 'Number of animation frames to generate'
    },
    
    timeStep: {
      type: 'number',
      default: 0.01,
      min: 0.001,
      max: 1.0,
      enabled: (params) => params.analysisType === 'dynamic',
      description: 'Time step for dynamic analysis (seconds)'
    },
    
    // Safety limits
    maxDeformation: {
      type: 'number',
      default: 10.0,
      min: 0.1,
      max: 100.0,
      description: 'Maximum allowed deformation (prevents instability)'
    },
    
    maxStress: {
      type: 'number',
      default: 1e9,  // 1 GPa
      min: 1e6,
      max: 1e12,
      description: 'Maximum allowed stress (Pa) before termination'
    },
    
    // Computation settings
    useGPU: {
      type: 'boolean',
      default: true,
      description: 'Use GPU acceleration if available'
    },
    
    chunkSize: {
      type: 'number',
      default: 1000,
      min: 100,
      max: 10000,
      description: 'Mesh chunk size for progressive computation'
    }
  },
  
  // Outputs
  outputs: {
    result: {
      type: 'solverResult',
      description: 'Complete solver result with deformed geometry and analysis data'
    },
    
    deformedMesh: {
      type: 'mesh',
      description: 'The mesh in its deformed state'
    },
    
    animation: {
      type: 'animation',
      enabled: (params) => params.analysisType !== 'static',
      description: 'Animation showing deformation over time'
    },
    
    stressField: {
      type: 'number[]',
      description: 'Per-element stress values for visualization'
    },
    
    displacements: {
      type: 'vector3[]',
      description: 'Per-vertex displacement vectors'
    },
    
    diagnostics: {
      type: 'object',
      description: 'Solver performance and convergence information'
    }
  },
  
  // Computation - coordinates C++ backend
  compute: async (inputs, parameters, context) => {
    const { goals, baseMesh } = inputs
    const config = parameters as SolverConfiguration
    
    // Validate goals
    const validation = validatePhysicsGoals(goals)
    if (!validation.valid) {
      throw new Error(`Goal validation failed: ${validation.errors.join(', ')}`)
    }
    
    // Prepare solver input
    const solverInput = {
      mesh: baseMesh,
      goals: goals,
      config: config
    }
    
    // Create progress callback
    const progressCallback = (progress: number, message: string) => {
      context.updateProgress(progress, message)
    }
    
    try {
      // Call C++ backend with chunked processing for safety
      const result = await solvePhysicsChunked(
        solverInput,
        config.chunkSize,
        progressCallback
      )
      
      // Validate result
      if (!result.success) {
        throw new Error(`Solver failed: ${result.errors.join(', ')}`)
      }
      
      // Check safety limits
      const maxDisp = Math.max(...result.displacements.map(d => length(d)))
      if (maxDisp > config.maxDeformation) {
        console.warn(`Maximum deformation ${maxDisp} exceeds limit ${config.maxDeformation}`)
        result.warnings.push('Deformation exceeds specified limits - results may be unrealistic')
      }
      
      const maxStressValue = Math.max(...result.stressField)
      if (maxStressValue > config.maxStress) {
        console.warn(`Maximum stress ${maxStressValue} exceeds limit ${config.maxStress}`)
        result.warnings.push('Stress exceeds specified limits - structure may be failing')
      }
      
      return {
        result: result,
        deformedMesh: result.deformedMesh,
        animation: result.animation,
        stressField: result.stressField,
        displacements: result.displacements,
        diagnostics: {
          iterations: result.iterations,
          convergence: result.convergenceAchieved,
          computeTime: result.performanceMetrics.computeTime,
          memoryUsed: result.performanceMetrics.memoryUsed,
          warnings: result.warnings
        }
      }
      
    } catch (error) {
      // Handle computation errors gracefully
      console.error('Physics solver error:', error)
      throw new Error(`Physics computation failed: ${error.message}`)
    }
  }
}
```

### Physics Solver Capabilities

The solver supports three analysis types:

**Static Analysis:**
Computes the equilibrium deformation under constant loads. This is the fastest and most stable analysis type. Returns a single deformed mesh showing the structure under load.

**Dynamic Analysis:**
Simulates time-dependent response to loads, including vibration and damping effects. Generates an animation showing how the structure responds over time. Requires specification of time step and duration.

**Modal Analysis:**
Computes the natural vibration modes and frequencies of the structure. Returns an animation cycling through the dominant vibration modes. Useful for understanding structural resonance and stability.

### Safety Mechanisms

The solver includes multiple safety layers to prevent crashes and infinite computation:

**Pre-Computation Checks:**
- Mesh validity (no degenerate elements, manifold structure)
- Goal compatibility and completeness
- Parameter sanity (positive values, reasonable ranges)

**Runtime Monitoring:**
- Iteration count tracking with hard limit
- Convergence monitoring (terminate if not progressing)
- Deformation magnitude checking (prevent explosion)
- Memory usage monitoring (prevent allocation failure)

**Chunked Processing:**
Large meshes are processed in chunks to prevent memory overflow and allow progress reporting. If the mesh has more than `chunkSize` elements, it is divided spatially and solved iteratively.

**Error Recovery:**
If the solver fails to converge, it returns the best solution found along with diagnostic information rather than crashing. This allows users to adjust parameters and retry.

---

## Part 6: Goal Nodes - Σκληρότης, Ὄγκος, Βάρος, Ἄγκυρα

### Σκληρότης (Stiffness Goal)

**Conceptual Purpose:**
Defines the material resistance to deformation for specified structural elements. In structural optimization, this often becomes a maximization objective (make the structure as stiff as possible given constraints).

**Node Specification (StiffnessGoal.ts):**

```typescript
export const StiffnessGoalNode: WorkflowNode = {
  type: 'stiffnessGoal',
  category: 'goal',
  solverType: 'physics',
  
  display: {
    nameGreek: 'Σκληρότης',
    nameEnglish: 'Stiffness',
    romanization: 'Sklērótēs',
    description: 'Defines resistance to deformation for structural elements',
    icon: 'stiffness-goal'
  },
  
  inputs: {
    // Geometric elements to apply stiffness to
    elements: {
      type: 'number[]',
      required: true,
      description: 'Element indices (edges, faces, or volumes) to constrain'
    },
    
    // Material properties
    youngModulus: {
      type: 'number',
      default: 200e9,  // Steel: 200 GPa
      min: 1e6,        // Soft materials
      max: 1e12,       // Diamond-like materials
      description: "Young's modulus (Pa) - material stiffness"
    },
    
    poissonRatio: {
      type: 'number',
      default: 0.3,
      min: -1.0,       // Auxetic materials
      max: 0.5,        // Incompressible materials
      description: "Poisson's ratio - lateral strain response"
    },
    
    // Optional target stiffness
    targetStiffness: {
      type: 'number',
      required: false,
      description: 'Target stiffness value (if optimizing to a specific value)'
    },
    
    // Optimization weight
    weight: {
      type: 'number',
      default: 1.0,
      min: 0.0,
      max: 1.0,
      description: 'Relative importance of this goal (0.0-1.0)'
    }
  },
  
  outputs: {
    goal: {
      type: 'goal',
      description: 'Stiffness goal specification for solver'
    }
  },
  
  compute: ({ elements, youngModulus, poissonRatio, targetStiffness, weight }) => {
    // Validate element indices
    if (elements.length === 0) {
      throw new Error('Stiffness goal requires at least one element')
    }
    
    // Build goal specification
    const goal: StiffnessGoal = {
      goalType: 'stiffness',
      weight: weight,
      target: targetStiffness,
      geometry: {
        elements: elements
      },
      parameters: {
        youngModulus: youngModulus,
        poissonRatio: poissonRatio,
        targetStiffness: targetStiffness
      }
    }
    
    return { goal }
  }
}
```

**Usage Example:**
A user wants to maximize stiffness of a bridge deck while minimizing material use. They connect a Stiffness goal to the deck elements with high weight (0.8) and a Volume goal to the entire structure with lower weight (0.2). The solver finds the optimal material distribution.

### Ὄγκος (Volume Goal)

**Conceptual Purpose:**
Constrains or targets the total volume of material in the structure. In optimization, this is typically a constraint (must use less than X volume) or a minimization objective (use as little material as possible while meeting other goals).

**Node Specification (VolumeGoal.ts):**

```typescript
export const VolumeGoalNode: WorkflowNode = {
  type: 'volumeGoal',
  category: 'goal',
  solverType: 'physics',
  
  display: {
    nameGreek: 'Ὄγκος',
    nameEnglish: 'Volume',
    romanization: 'Ónkos',
    description: 'Constrains or targets material volume',
    icon: 'volume-goal'
  },
  
  inputs: {
    // Target volume
    targetVolume: {
      type: 'number',
      required: false,
      min: 0.0,
      description: 'Target volume (m³) - omit to minimize'
    },
    
    // Volume constraint
    maxVolume: {
      type: 'number',
      required: false,
      min: 0.0,
      description: 'Maximum allowed volume (m³)'
    },
    
    minVolume: {
      type: 'number',
      required: false,
      min: 0.0,
      description: 'Minimum allowed volume (m³)'
    },
    
    // Material density (for mass calculations)
    materialDensity: {
      type: 'number',
      default: 7850,   // Steel: 7850 kg/m³
      min: 1,
      max: 30000,
      description: 'Material density (kg/m³)'
    },
    
    // Allowed deviation
    allowedDeviation: {
      type: 'number',
      default: 0.05,   // 5%
      min: 0.0,
      max: 0.5,
      description: 'Allowed deviation from target (0.0-1.0)'
    },
    
    weight: {
      type: 'number',
      default: 1.0,
      min: 0.0,
      max: 1.0,
      description: 'Relative importance of this goal'
    }
  },
  
  outputs: {
    goal: {
      type: 'goal',
      description: 'Volume goal specification'
    }
  },
  
  compute: ({ targetVolume, maxVolume, minVolume, materialDensity, allowedDeviation, weight }) => {
    // Validate constraints
    if (targetVolume !== undefined && (maxVolume !== undefined || minVolume !== undefined)) {
      throw new Error('Cannot specify both target volume and volume constraints')
    }
    
    if (minVolume !== undefined && maxVolume !== undefined && minVolume > maxVolume) {
      throw new Error('Minimum volume cannot exceed maximum volume')
    }
    
    const goal: VolumeGoal = {
      goalType: 'volume',
      weight: weight,
      target: targetVolume,
      constraint: {
        min: minVolume,
        max: maxVolume
      },
      geometry: {
        elements: []  // Applies to entire mesh
      },
      parameters: {
        targetVolume: targetVolume,
        materialDensity: materialDensity,
        allowedDeviation: allowedDeviation
      }
    }
    
    return { goal }
  }
}
```

**Usage Example:**
A user designs a cantilevered roof and wants to minimize material use while maintaining structural integrity. They set a Volume goal with no target (minimization mode) at weight 0.4, a Stiffness goal for the cantilever tip at weight 0.4, and an Anchor goal for the base at weight 0.2.

### Βάρος (Load Goal)

**Conceptual Purpose:**
Defines external forces applied to the structure. This is not an optimization objective but a constraint that defines the loading condition the structure must resist.

**Node Specification (LoadGoal.ts):**

```typescript
export const LoadGoalNode: WorkflowNode = {
  type: 'loadGoal',
  category: 'goal',
  solverType: 'physics',
  
  display: {
    nameGreek: 'Βάρος',
    nameEnglish: 'Load',
    romanization: 'Báros',
    description: 'Defines external forces applied to structure',
    icon: 'load-goal'
  },
  
  inputs: {
    // Force vector
    force: {
      type: 'vector3',
      required: true,
      description: 'Force vector (N) in [x, y, z] format'
    },
    
    // Magnitude alternative (for gravity-like loads)
    forceMagnitude: {
      type: 'number',
      required: false,
      min: 0,
      description: 'Force magnitude (N) - overrides vector if provided'
    },
    
    direction: {
      type: 'vector3',
      required: false,
      default: [0, 0, -1],  // Default: downward (gravity)
      description: 'Force direction (normalized automatically)'
    },
    
    // Application points
    applicationPoints: {
      type: 'number[]',
      required: true,
      description: 'Vertex indices where force is applied'
    },
    
    // Load distribution
    distributed: {
      type: 'boolean',
      default: false,
      description: 'Distribute load across points vs. concentrated at each'
    },
    
    // Load type
    loadType: {
      type: 'string',
      options: ['static', 'dynamic', 'cyclic'],
      default: 'static',
      description: 'Type of load application'
    },
    
    // For dynamic loads
    timeProfile: {
      type: 'number[]',
      required: false,
      enabled: (inputs) => inputs.loadType === 'dynamic',
      description: 'Time-varying load magnitude profile'
    },
    
    // For cyclic loads
    frequency: {
      type: 'number',
      required: false,
      min: 0,
      enabled: (inputs) => inputs.loadType === 'cyclic',
      description: 'Load frequency (Hz) for cyclic loading'
    },
    
    weight: {
      type: 'number',
      default: 1.0,
      min: 0.0,
      max: 1.0,
      description: 'Relative importance'
    }
  },
  
  outputs: {
    goal: {
      type: 'goal',
      description: 'Load goal specification'
    }
  },
  
  compute: ({ force, forceMagnitude, direction, applicationPoints, distributed, loadType, timeProfile, frequency, weight }) => {
    // Validate application points
    if (applicationPoints.length === 0) {
      throw new Error('Load goal requires at least one application point')
    }
    
    // Compute final force vector
    let finalForce: Vec3
    if (forceMagnitude !== undefined) {
      const normalizedDir = normalize(direction)
      finalForce = scale(normalizedDir, forceMagnitude)
    } else {
      finalForce = force
    }
    
    // Validate dynamic load requirements
    if (loadType === 'dynamic' && !timeProfile) {
      throw new Error('Dynamic loads require a time profile')
    }
    
    if (loadType === 'cyclic' && frequency === undefined) {
      throw new Error('Cyclic loads require a frequency specification')
    }
    
    const goal: LoadGoal = {
      goalType: 'load',
      weight: weight,
      geometry: {
        elements: applicationPoints
      },
      parameters: {
        force: finalForce,
        applicationPoints: applicationPoints,
        distributed: distributed,
        loadType: loadType,
        timeProfile: timeProfile,
        frequency: frequency
      }
    }
    
    return { goal }
  }
}
```

**Usage Example:**
A user analyzes a floor slab under furniture loads. They create Load goals for each furniture piece (table: 500N downward at 4 points, sofa: 800N distributed across 6 points) and an Anchor goal at the column supports. The solver shows deflection patterns.

### Ἄγκυρα (Anchor Goal)

**Conceptual Purpose:**
Defines fixed boundary conditions where the structure is supported or attached. Every structural analysis requires at least one anchor to prevent rigid body motion. Anchors can constrain translation and/or rotation in specific degrees of freedom.

**Node Specification (AnchorGoal.ts):**

```typescript
export const AnchorGoalNode: WorkflowNode = {
  type: 'anchorGoal',
  category: 'goal',
  solverType: 'physics',
  
  display: {
    nameGreek: 'Ἄγκυρα',
    nameEnglish: 'Anchor',
    romanization: 'Ágkyra',
    description: 'Defines fixed boundary conditions and supports',
    icon: 'anchor-goal'
  },
  
  inputs: {
    // Vertices to fix
    vertices: {
      type: 'number[]',
      required: true,
      description: 'Vertex indices to anchor'
    },
    
    // Degrees of freedom to constrain
    fixedDOF: {
      type: 'object',
      required: true,
      default: {
        x: true,
        y: true,
        z: true,
        rotX: false,
        rotY: false,
        rotZ: false
      },
      description: 'Which degrees of freedom to fix'
    },
    
    // Anchor type
    anchorType: {
      type: 'string',
      options: ['fixed', 'pinned', 'roller', 'custom'],
      default: 'fixed',
      description: 'Predefined anchor configuration',
      onChange: (value, inputs) => {
        // Update fixedDOF based on anchor type
        switch (value) {
          case 'fixed':
            // All DOF constrained
            inputs.fixedDOF = {
              x: true, y: true, z: true,
              rotX: true, rotY: true, rotZ: true
            }
            break
          case 'pinned':
            // Translation constrained, rotation free
            inputs.fixedDOF = {
              x: true, y: true, z: true,
              rotX: false, rotY: false, rotZ: false
            }
            break
          case 'roller':
            // Only vertical translation constrained
            inputs.fixedDOF = {
              x: false, y: false, z: true,
              rotX: false, rotY: false, rotZ: false
            }
            break
          case 'custom':
            // User specifies manually
            break
        }
      }
    },
    
    // Spring support (elastic anchor)
    springStiffness: {
      type: 'number',
      required: false,
      min: 0,
      description: 'Spring stiffness (N/m) - omit for rigid anchor'
    },
    
    weight: {
      type: 'number',
      default: 1.0,
      min: 0.0,
      max: 1.0,
      description: 'Relative importance'
    }
  },
  
  outputs: {
    goal: {
      type: 'goal',
      description: 'Anchor goal specification'
    }
  },
  
  compute: ({ vertices, fixedDOF, anchorType, springStiffness, weight }) => {
    // Validate vertices
    if (vertices.length === 0) {
      throw new Error('Anchor goal requires at least one vertex')
    }
    
    // Validate DOF
    const anyFixed = Object.values(fixedDOF).some(v => v === true)
    if (!anyFixed) {
      throw new Error('Anchor must constrain at least one degree of freedom')
    }
    
    const goal: AnchorGoal = {
      goalType: 'anchor',
      weight: weight,
      geometry: {
        elements: vertices
      },
      parameters: {
        fixedDOF: fixedDOF,
        anchorType: anchorType,
        springStiffness: springStiffness
      }
    }
    
    return { goal }
  }
}
```

**Usage Example:**
A user models a simply-supported beam. They create Anchor goals at both ends: left end is "pinned" (translation fixed, rotation free) and right end is "roller" (vertical translation fixed, horizontal free, rotation free). This allows the beam to expand thermally without internal stress.

## Part 7: C++ Integration and Safety Mechanisms

### Backend Architecture

The Physics Solver requires high-performance computation that TypeScript cannot provide. The C++ backend handles:

1. **Matrix Assembly** - Building global stiffness matrix K from element properties
2. **Equation Solving** - Solving Kd = F using sparse linear algebra
3. **Stress Calculation** - Computing element stresses from displacements
4. **Iteration Management** - Nonlinear and dynamic analysis iteration loops

### Interface Layer

**TypeScript to C++ Communication (solverInterface.ts):**

```typescript
// WebAssembly interface to C++ solver
interface PhysicsSolverWASM {
  solve(
    meshData: Float32Array,
    goalData: Uint8Array,
    configData: Uint8Array
  ): Promise<ResultData>
  
  solveChunked(
    meshChunks: Float32Array[],
    goalData: Uint8Array,
    configData: Uint8Array,
    progressCallback: (progress: number) => void
  ): Promise<ResultData>
  
  cancel(): void
}

// Load WASM module
let solverModule: PhysicsSolverWASM | null = null

export async function initializeSolver(): Promise<void> {
  if (solverModule) return
  
  try {
    const module = await import('./physics_solver.wasm')
    solverModule = await module.initialize()
    console.log('Physics solver initialized')
  } catch (error) {
    console.error('Failed to initialize physics solver:', error)
    throw new Error('Physics solver unavailable')
  }
}

// Chunked solving for large meshes
export async function solvePhysicsChunked(
  input: SolverInput,
  chunkSize: number,
  progressCallback: (progress: number, message: string) => void
): Promise<SolverResult> {
  if (!solverModule) {
    await initializeSolver()
  }
  
  // Divide mesh into spatial chunks
  const chunks = divideMeshIntoChunks(input.mesh, chunkSize)
  
  progressCallback(0, `Processing ${chunks.length} mesh chunks`)
  
  // Serialize data for WASM
  const meshData = serializeMeshChunks(chunks)
  const goalData = serializeGoals(input.goals)
  const configData = serializeConfig(input.config)
  
  // Create progress handler
  const wasmProgressCallback = (progress: number) => {
    const message = progress < 0.5 
      ? 'Building stiffness matrix'
      : progress < 0.9
      ? 'Solving equations'
      : 'Computing stresses'
    progressCallback(progress, message)
  }
  
  try {
    // Call WASM solver
    const resultData = await solverModule!.solveChunked(
      meshData,
      goalData,
      configData,
      wasmProgressCallback
    )
    
    // Deserialize result
    const result = deserializeResult(resultData)
    
    progressCallback(1.0, 'Complete')
    
    return result
    
  } catch (error) {
    console.error('Solver computation error:', error)
    throw new Error(`C++ solver failed: ${error.message}`)
  }
}

// Cancellation support
export function cancelSolver(): void {
  if (solverModule) {
    solverModule.cancel()
  }
}
```

### Safety Mechanisms

**Memory Management:**

```cpp
// C++ side memory safety
class SafePhysicsSolver {
private:
    size_t maxMemoryMB = 2048;  // 2GB limit
    size_t currentMemoryMB = 0;
    
    bool checkMemory(size_t requestedMB) {
        if (currentMemoryMB + requestedMB > maxMemoryMB) {
            std::cerr << "Memory limit exceeded" << std::endl;
            return false;
        }
        return true;
    }
    
public:
    SolverResult solve(const MeshData& mesh, 
                       const std::vector<Goal>& goals,
                       const Config& config) {
        // Estimate memory requirement
        size_t estimatedMB = estimateMemoryNeed(mesh, config);
        
        if (!checkMemory(estimatedMB)) {
            return SolverResult::error("Insufficient memory for mesh size");
        }
        
        // Proceed with solution
        // ...
    }
};
```

**Iteration Limits:**

```cpp
// Prevent infinite loops
class ConvergenceMonitor {
private:
    int maxIterations;
    int currentIteration = 0;
    double tolerance;
    double previousResidual = std::numeric_limits<double>::max();
    int stagnationCount = 0;
    
public:
    bool shouldContinue(double currentResidual) {
        currentIteration++;
        
        // Hard iteration limit
        if (currentIteration >= maxIterations) {
            return false;
        }
        
        // Convergence check
        double relativeChange = std::abs(
            (currentResidual - previousResidual) / previousResidual
        );
        
        if (relativeChange < tolerance) {
            return false;  // Converged
        }
        
        // Stagnation detection
        if (relativeChange < tolerance * 10) {
            stagnationCount++;
            if (stagnationCount > 10) {
                return false;  // Not making progress
            }
        } else {
            stagnationCount = 0;
        }
        
        previousResidual = currentResidual;
        return true;
    }
};
```

**Deformation Limits:**

```cpp
// Prevent unrealistic deformations
bool validateDeformation(const std::vector<Vec3>& displacements,
                         double maxAllowed) {
    for (const auto& d : displacements) {
        double magnitude = std::sqrt(d.x*d.x + d.y*d.y + d.z*d.z);
        if (magnitude > maxAllowed) {
            std::cerr << "Deformation " << magnitude 
                      << " exceeds limit " << maxAllowed << std::endl;
            return false;
        }
    }
    return true;
}
```

### Graceful Degradation

If the C++ solver fails or is unavailable, the system falls back to simplified computation:

```typescript
export async function solvePhysicsFallback(
  input: SolverInput
): Promise<SolverResult> {
  console.warn('Using fallback solver - results will be approximate')
  
  // Simple linear elastic analysis without optimization
  // Uses TypeScript implementation (slower but functional)
  const result = await simpleLinearElastic(input.mesh, input.goals)
  
  result.warnings.push(
    'C++ solver unavailable - using simplified fallback computation'
  )
  
  return result
}
```

---

## Part 8: Future Extensibility Guidelines

### Adding New Solvers

When adding a new solver type to the Solver category, follow this template:

**Step 1: Define Solver Node**

```typescript
// Example: TopologyOptimizationSolver.ts
export const TopologyOptimizationSolverNode: WorkflowNode = {
  type: 'topologyOptimizationSolver',
  category: 'solver',
  
  display: {
    nameGreek: 'Ἐπιλύτης Τοπολογίας',
    nameEnglish: 'Topology Solver',
    romanization: 'Epilýtēs Topologías',
    description: 'Optimizes material distribution for structural efficiency'
  },
  
  inputs: {
    goals: {
      type: 'goal[]',
      acceptedGoalTypes: ['compliance', 'volume', 'stress']
      // New goal types specific to topology optimization
    },
    // ... other inputs
  },
  
  // ... rest of node definition
}
```

**Step 2: Define Goal Nodes**

Create sub-sub-category for new goal types:

```typescript
// In SolverCategory.ts
subSubCategories: [
  {
    name: 'Physics Goals',
    nodes: [StiffnessGoalNode, VolumeGoalNode, LoadGoalNode, AnchorGoalNode]
  },
  {
    name: 'Voxel Goals',
    nodes: [/* voxel goals */]
  },
  {
    name: 'Topology Goals',  // New sub-sub-category
    nodes: [
      ComplianceGoalNode,
      VolumeGoalNode,  // Can reuse existing goals
      StressGoalNode
    ]
  }
]
```

**Step 3: Implement Goal Validation**

Each solver needs custom validation logic:

```typescript
function validateTopologyGoals(goals: GoalSpecification[]): ValidationResult {
  // Topology-specific validation
  const hasCompliance = goals.some(g => g.goalType === 'compliance')
  const hasVolume = goals.some(g => g.goalType === 'volume')
  
  if (!hasCompliance || !hasVolume) {
    return {
      valid: false,
      error: 'Topology optimization requires both Compliance and Volume goals'
    }
  }
  
  return { valid: true }
}
```

### Ancient Greek Naming Guidelines

When naming new solvers and goals in Ancient Greek:

**Research Etymology:**
Use authoritative sources (Liddell-Scott-Jones Greek-English Lexicon) to find historically accurate terms that match the concept.

**Prefer Classical Over Koine:**
Classical Greek (5th-4th century BCE) is more appropriate for mathematical concepts, as this was the language of Euclid, Archimedes, and Apollonius.

**Consistency in Form:**
- Solvers: Use nominative case with "Ἐπιλύτης" (solver of...)
- Goals: Use nominative singular nouns
- Categories: Use genitive case for possession

**Provide Full Linguistic Information:**
- Greek text in original alphabet
- Romanization in standard scholarly format
- Literal translation
- Contextual explanation

**Example for a new goal:**

```typescript
// Compliance Goal (structural flexibility)
display: {
  nameGreek: 'Εὐκαμψία',
  nameEnglish: 'Compliance',
  romanization: 'Eukampsía',
  description: 'Structural flexibility under load (inverse of stiffness)',
  etymology: 'From εὐ- (eu-, good/easy) + κάμπτω (kámptō, to bend). ' +
             'Literally "bendability" or "flexibility".'
}
```

### Backwards Compatibility

When modifying the Solver category:

**Preserve Existing Nodes:**
The VoxelSolver must continue working exactly as before. Only its category location changes.

**Version Migration:**
```typescript
// When loading old projects
function migrateNodeCategory(node: WorkflowNode): WorkflowNode {
  if (node.category === 'voxelOptimization') {
    // Migrate to new category
    return {
      ...node,
      category: 'solver'
    }
  }
  return node
}
```

**Deprecation Path:**
If replacing old nodes entirely:
1. Mark as deprecated in v1
2. Show migration helper in UI
3. Remove in v2 (at least one major version later)

### Performance Considerations

**Solver Complexity Scaling:**

Document computational complexity for each solver:
- Physics Solver: O(n³) for dense matrix, O(n^1.5) for sparse
- Chemistry Solver: O(n * p) for particle updates (n particles, p iterations)
- Voxel Solver: O(n log n) for most cases
- Future solvers: Specify clearly

**Recommended Mesh Sizes:**
- Physics Solver: Up to 10,000 elements for interactive use
- Chemistry Solver: Up to 50,000 particles for real-time previews
- Use chunking for larger meshes
- Consider GPU acceleration for > 50,000 elements

**Animation Generation:**
Limit frame count based on mesh size:
```typescript
const maxFrames = Math.min(
  requestedFrames,
  Math.floor(100000 / mesh.elementCount)
)
```

---

## Part 9: Code Organization and File Structure

### Complete Directory Structure

```
client/src/
  workflow/
    nodes/
      solver/
        index.ts                      # Export all solver nodes
        SolverCategory.ts             # Category definition with sub-categories
        
        # Solver nodes
        PhysicsSolver.ts              # Ἐπιλύτης Φυσικῆς
        ChemistrySolver.ts            # Ἐπιλύτης Χημείας
        VoxelSolver.ts                # Existing voxel solver
        
        # Goal nodes
        goals/
          index.ts                    # Export all goal nodes
          
          physics/
            index.ts
            StiffnessGoal.ts          # Σκληρότης
            VolumeGoal.ts             # Ὄγκος
            LoadGoal.ts               # Βάρος
            AnchorGoal.ts             # Ἄγκυρα

          chemistry/
            index.ts
            ChemistryMaterialGoal.ts  # Ὕλη
            ChemistryStiffnessGoal.ts # Σκληρότης Χημείας
            ChemistryMassGoal.ts      # Μᾶζα
            ChemistryBlendGoal.ts     # Κρᾶσις
            
          voxel/
            index.ts
            # Future voxel-specific goals
            
        # Shared utilities
        types.ts                      # TypeScript interfaces
        validation.ts                 # Goal validation functions
        solverInterface.ts            # C++ integration layer
        
  components/
    workflow/
      NodeLibrary.tsx                 # Modified for sub-categories
      SubCategoryDropdown.tsx         # New dropdown component
      GoalNodeRenderer.tsx            # Custom rendering for goal nodes
      
  cpp/
    solvers/
      PhysicsSolver.cpp
      PhysicsSolver.h
      MatrixAssembly.cpp
      LinearSolver.cpp
      StressCalculation.cpp
      
  types/
    solver.d.ts                       # Global solver types
    
  styles/
    solver-nodes.css                  # Greek typography, colors
```

### Module Exports

**Main Solver Index (solver/index.ts):**

```typescript
// Solver nodes
export { PhysicsSolverNode } from './PhysicsSolver'
export { ChemistrySolverNode } from './ChemistrySolver'
export { VoxelSolverNode } from './VoxelSolver'

// Goal nodes
export * from './goals'

// Category
export { SolverCategory } from './SolverCategory'

// Types
export * from './types'

// Utilities
export { validatePhysicsGoals, validateChemistryGoals, validateVoxelGoals } from './validation'
export { initializeSolver, solvePhysicsChunked } from './solverInterface'
```

**Goal Nodes Index (goals/index.ts):**

```typescript
export { StiffnessGoalNode } from './physics/StiffnessGoal'
export { VolumeGoalNode } from './physics/VolumeGoal'
export { LoadGoalNode } from './physics/LoadGoal'
export { AnchorGoalNode } from './physics/AnchorGoal'
export { ChemistryMaterialGoalNode } from './chemistry/ChemistryMaterialGoal'
export { ChemistryStiffnessGoalNode } from './chemistry/ChemistryStiffnessGoal'
export { ChemistryMassGoalNode } from './chemistry/ChemistryMassGoal'
export { ChemistryBlendGoalNode } from './chemistry/ChemistryBlendGoal'

// Re-export types
export type {
  GoalSpecification,
  StiffnessGoal,
  VolumeGoal,
  LoadGoal,
  AnchorGoal,
  ChemistryMaterialGoal,
  ChemistryStiffnessGoal,
  ChemistryMassGoal,
  ChemistryBlendGoal
} from '../types'
```

### Styling Guidelines

**CSS for Ancient Greek Typography (solver-nodes.css):**

```css
/* Greek text rendering */
.greek-text {
  font-family: 'Noto Serif', 'GFS Didot', serif;
  font-size: 1.1em;
  letter-spacing: 0.02em;
  color: #2a2a2a;
}

.romanization {
  font-variant: small-caps;
  font-size: 0.9em;
  opacity: 0.8;
  color: #666;
  margin-left: 0.5em;
}

.translation {
  font-weight: 500;
  color: #444;
  font-size: 0.95em;
}

/* Solver node colors */
.node-solver {
  background: linear-gradient(135deg, #7A5CFF 0%, #6B4FE8 100%);
  border: 2px solid #5940C9;
  color: white;
}

.node-goal {
  background: linear-gradient(135deg, #B8A6FF 0%, #A895F7 100%);
  border: 2px solid #9780E8;
  color: #2a2a2a;
}

/* Sub-category dropdown */
.sub-category-dropdown {
  background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%);
  border: 1px solid #d0c9f0;
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
}

.sub-category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  width: 100%;
  transition: background 0.2s;
}

.sub-category-header:hover {
  background: rgba(122, 92, 255, 0.1);
  border-radius: 4px;
}

/* Tooltips */
.node-tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 0.9em;
  max-width: 300px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.tooltip-greek {
  font-family: 'Noto Serif', serif;
  font-size: 1.2em;
  margin-bottom: 4px;
}

.tooltip-romanization {
  font-style: italic;
  opacity: 0.8;
  font-size: 0.9em;
  margin-bottom: 8px;
}

.tooltip-description {
  line-height: 1.5;
}
```

---

## Conclusion

This architecture introduces a sophisticated yet approachable system for complex optimization problems in Numerica. By separating solvers from their configuration goals, establishing clear Ancient Greek naming conventions that honor mathematical heritage, and implementing robust safety mechanisms for computationally intensive operations, the system is positioned for long-term extensibility.

The Physics Solver and its four foundational goal nodes—Σκληρότης (Stiffness), Ὄγκος (Volume), Βάρος (Load), and Ἄγκυρα (Anchor)—provide a complete structural analysis capability while demonstrating the pattern for future solver development. The Chemistry Solver extends this pattern into material optimization workflows through its own goal set: Ὕλη (Material), Σκληρότης Χημείας (Stiffness), Μᾶζα (Mass), and Κρᾶσις (Blend).

The sub-category UI innovation creates a scalable organizational structure that can accommodate an unlimited number of specialized solvers and their associated goal nodes without overwhelming the node library interface. As the Solver category grows to include topology optimization, computational fluid dynamics, thermal analysis, and other physics-based tools, the Ἐπιλύτου Εἰσαγωγαί pattern ensures consistent, intuitive organization.

This is not merely a feature addition but a philosophical statement about how Numerica approaches complex computation: with reverence for mathematical history, commitment to architectural clarity, and pragmatic attention to user safety and system performance.

---

## Implementation Anchors

- `client/src/components/workflow/WorkflowSection.tsx`: category and sub-category UI.
- `client/src/components/workflow/SubCategoryDropdown.tsx`: dropdown UX (if present).
- `client/src/workflow/nodeRegistry.ts`: solver and goal node definitions.
- `client/src/workflow/nodeTypes.ts`: node identifiers and categories.
- `client/src/components/workflow/workflowValidation.ts`: connection validation.

## Validation Checklist

- Solver nodes accept only compatible goal nodes; invalid wiring is blocked with clear errors.
- Goal nodes emit structured parameters that the solver consumes without further parsing.
- Solver execution reports convergence, iteration count, and failure reasons.
- Goals are optional but at least one enabled goal is required to run a solver.
- Undo/redo restores solver node parameters and goal configurations.

## UI Test Cases

- Expand/collapse sub-categories without altering selection or focus state.
- Drag nodes from sub-categories into the canvas and verify correct type ids.
- Tooltips show Greek + English names consistently.
- Category list remains responsive at 100+ nodes.
