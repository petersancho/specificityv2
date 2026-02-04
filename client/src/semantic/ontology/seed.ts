/**
 * Lingua Ontology Seed Data
 *
 * Core datatypes and units that form the foundation of the ontology.
 * These are registered at startup and referenced by all operations.
 */

import type { DataType, Unit, Solver, Goal } from './types'
import { ontologyRegistry } from './registry'

// =============================================================================
// CORE DATA TYPES
// =============================================================================

export const coreDataTypes: DataType[] = [
  // Primitives
  {
    kind: 'datatype',
    id: 'number',
    name: 'Number',
    description: 'Numeric value (float64)',
    jsType: 'number',
    shape: 'scalar',
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'integer',
    name: 'Integer',
    description: 'Whole number',
    parent: 'number',
    jsType: 'number',
    shape: 'scalar',
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'boolean',
    name: 'Boolean',
    description: 'True or false',
    jsType: 'boolean',
    shape: 'scalar',
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'string',
    name: 'String',
    description: 'Text value',
    jsType: 'string',
    shape: 'scalar',
    stability: 'stable',
  },

  // Vectors
  {
    kind: 'datatype',
    id: 'vec2',
    name: 'Vector2',
    description: '2D vector [x, y]',
    jsType: 'array',
    shape: 'vector',
    schema: {
      type: 'array',
      items: { type: 'number' },
      minItems: 2,
      maxItems: 2,
    },
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'vec3',
    name: 'Vector3',
    description: '3D vector [x, y, z]',
    jsType: 'array',
    shape: 'vector',
    schema: {
      type: 'array',
      items: { type: 'number' },
      minItems: 3,
      maxItems: 3,
    },
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'vec4',
    name: 'Vector4',
    description: '4D vector [x, y, z, w]',
    jsType: 'array',
    shape: 'vector',
    schema: {
      type: 'array',
      items: { type: 'number' },
      minItems: 4,
      maxItems: 4,
    },
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'quaternion',
    name: 'Quaternion',
    description: 'Rotation quaternion [x, y, z, w]',
    parent: 'vec4',
    jsType: 'array',
    shape: 'vector',
    stability: 'stable',
  },

  // Matrices
  {
    kind: 'datatype',
    id: 'mat3',
    name: 'Matrix3x3',
    description: '3x3 transformation matrix',
    jsType: 'array',
    shape: 'grid',
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'mat4',
    name: 'Matrix4x4',
    description: '4x4 transformation matrix',
    jsType: 'array',
    shape: 'grid',
    stability: 'stable',
  },

  // Geometry primitives
  {
    kind: 'datatype',
    id: 'point',
    name: 'Point',
    description: '3D point in space',
    parent: 'vec3',
    jsType: 'array',
    shape: 'vector',
    dimension: { L: 1 }, // Length dimension
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'plane',
    name: 'Plane',
    description: 'Infinite plane (origin + normal)',
    jsType: 'object',
    shape: 'scalar',
    schema: {
      type: 'object',
      properties: {
        origin: { $ref: '#/definitions/vec3' },
        normal: { $ref: '#/definitions/vec3' },
      },
      required: ['origin', 'normal'],
    },
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'line',
    name: 'Line',
    description: 'Infinite line (point + direction)',
    jsType: 'object',
    shape: 'scalar',
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'ray',
    name: 'Ray',
    description: 'Half-line (origin + direction)',
    jsType: 'object',
    shape: 'scalar',
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'segment',
    name: 'Line Segment',
    description: 'Bounded line between two points',
    jsType: 'object',
    shape: 'scalar',
    stability: 'stable',
  },

  // Curves
  {
    kind: 'datatype',
    id: 'curve',
    name: 'Curve',
    description: 'Base curve type',
    jsType: 'object',
    shape: 'scalar',
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'arc',
    name: 'Arc',
    description: 'Circular arc',
    parent: 'curve',
    jsType: 'object',
    shape: 'scalar',
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'circle',
    name: 'Circle',
    description: 'Full circle (plane + radius)',
    parent: 'curve',
    jsType: 'object',
    shape: 'scalar',
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'ellipse',
    name: 'Ellipse',
    description: 'Ellipse (plane + radii)',
    parent: 'curve',
    jsType: 'object',
    shape: 'scalar',
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'polyline',
    name: 'Polyline',
    description: 'Connected line segments',
    parent: 'curve',
    jsType: 'object',
    shape: 'scalar',
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'nurbs_curve',
    name: 'NURBS Curve',
    description: 'Non-uniform rational B-spline curve',
    parent: 'curve',
    jsType: 'object',
    shape: 'scalar',
    stability: 'stable',
  },

  // Surfaces
  {
    kind: 'datatype',
    id: 'surface',
    name: 'Surface',
    description: 'Base surface type',
    jsType: 'object',
    shape: 'scalar',
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'nurbs_surface',
    name: 'NURBS Surface',
    description: 'Non-uniform rational B-spline surface',
    parent: 'surface',
    jsType: 'object',
    shape: 'scalar',
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'mesh',
    name: 'Mesh',
    description: 'Polygonal mesh (vertices + faces)',
    jsType: 'object',
    shape: 'scalar',
    schema: {
      type: 'object',
      properties: {
        vertices: { type: 'array', items: { $ref: '#/definitions/vec3' } },
        faces: { type: 'array', items: { type: 'array', items: { type: 'integer' } } },
        normals: { type: 'array', items: { $ref: '#/definitions/vec3' } },
        uvs: { type: 'array', items: { $ref: '#/definitions/vec2' } },
      },
      required: ['vertices', 'faces'],
    },
    stability: 'stable',
  },

  // Solids
  {
    kind: 'datatype',
    id: 'brep',
    name: 'BRep',
    description: 'Boundary representation solid',
    jsType: 'object',
    shape: 'scalar',
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'box',
    name: 'Box',
    description: 'Axis-aligned bounding box',
    jsType: 'object',
    shape: 'scalar',
    schema: {
      type: 'object',
      properties: {
        min: { $ref: '#/definitions/vec3' },
        max: { $ref: '#/definitions/vec3' },
      },
      required: ['min', 'max'],
    },
    stability: 'stable',
  },

  // Color
  {
    kind: 'datatype',
    id: 'color',
    name: 'Color',
    description: 'RGBA color',
    jsType: 'object',
    shape: 'scalar',
    schema: {
      type: 'object',
      properties: {
        r: { type: 'number', minimum: 0, maximum: 1 },
        g: { type: 'number', minimum: 0, maximum: 1 },
        b: { type: 'number', minimum: 0, maximum: 1 },
        a: { type: 'number', minimum: 0, maximum: 1 },
      },
      required: ['r', 'g', 'b'],
    },
    stability: 'stable',
  },

  // Collections
  {
    kind: 'datatype',
    id: 'list',
    name: 'List',
    description: 'Generic list of items',
    jsType: 'array',
    shape: 'list',
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'tree',
    name: 'Data Tree',
    description: 'Hierarchical data structure (like GH data trees)',
    jsType: 'object',
    shape: 'tree',
    stability: 'stable',
  },

  // Transform
  {
    kind: 'datatype',
    id: 'transform',
    name: 'Transform',
    description: 'Affine transformation',
    jsType: 'object',
    shape: 'scalar',
    stability: 'stable',
  },

  // Solver types
  {
    kind: 'datatype',
    id: 'particle',
    name: 'Particle',
    description: 'Physics particle (position + velocity + mass)',
    jsType: 'object',
    shape: 'scalar',
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'field',
    name: 'Field',
    description: 'Scalar or vector field',
    jsType: 'object',
    shape: 'field',
    stability: 'stable',
  },
  {
    kind: 'datatype',
    id: 'voxel_grid',
    name: 'Voxel Grid',
    description: '3D voxel grid',
    jsType: 'object',
    shape: 'grid',
    stability: 'stable',
  },
]

// =============================================================================
// CORE UNITS
// =============================================================================

export const coreUnits: Unit[] = [
  // Length
  {
    kind: 'unit',
    id: 'unit.m',
    name: 'Meters',
    symbol: 'm',
    dimension: { L: 1 },
    toSI: 1,
    stability: 'stable',
  },
  {
    kind: 'unit',
    id: 'unit.mm',
    name: 'Millimeters',
    symbol: 'mm',
    dimension: { L: 1 },
    toSI: 0.001,
    siUnit: 'unit.m',
    stability: 'stable',
  },
  {
    kind: 'unit',
    id: 'unit.cm',
    name: 'Centimeters',
    symbol: 'cm',
    dimension: { L: 1 },
    toSI: 0.01,
    siUnit: 'unit.m',
    stability: 'stable',
  },
  {
    kind: 'unit',
    id: 'unit.in',
    name: 'Inches',
    symbol: 'in',
    dimension: { L: 1 },
    toSI: 0.0254,
    siUnit: 'unit.m',
    stability: 'stable',
  },
  {
    kind: 'unit',
    id: 'unit.ft',
    name: 'Feet',
    symbol: 'ft',
    dimension: { L: 1 },
    toSI: 0.3048,
    siUnit: 'unit.m',
    stability: 'stable',
  },

  // Area
  {
    kind: 'unit',
    id: 'unit.m2',
    name: 'Square Meters',
    symbol: 'm²',
    dimension: { L: 2 },
    toSI: 1,
    stability: 'stable',
  },

  // Volume
  {
    kind: 'unit',
    id: 'unit.m3',
    name: 'Cubic Meters',
    symbol: 'm³',
    dimension: { L: 3 },
    toSI: 1,
    stability: 'stable',
  },

  // Angle
  {
    kind: 'unit',
    id: 'unit.rad',
    name: 'Radians',
    symbol: 'rad',
    dimension: { A: 1 },
    toSI: 1,
    stability: 'stable',
  },
  {
    kind: 'unit',
    id: 'unit.deg',
    name: 'Degrees',
    symbol: '°',
    dimension: { A: 1 },
    toSI: Math.PI / 180,
    siUnit: 'unit.rad',
    stability: 'stable',
  },

  // Mass
  {
    kind: 'unit',
    id: 'unit.kg',
    name: 'Kilograms',
    symbol: 'kg',
    dimension: { M: 1 },
    toSI: 1,
    stability: 'stable',
  },
  {
    kind: 'unit',
    id: 'unit.g',
    name: 'Grams',
    symbol: 'g',
    dimension: { M: 1 },
    toSI: 0.001,
    siUnit: 'unit.kg',
    stability: 'stable',
  },

  // Time
  {
    kind: 'unit',
    id: 'unit.s',
    name: 'Seconds',
    symbol: 's',
    dimension: { T: 1 },
    toSI: 1,
    stability: 'stable',
  },
  {
    kind: 'unit',
    id: 'unit.ms',
    name: 'Milliseconds',
    symbol: 'ms',
    dimension: { T: 1 },
    toSI: 0.001,
    siUnit: 'unit.s',
    stability: 'stable',
  },

  // Force
  {
    kind: 'unit',
    id: 'unit.N',
    name: 'Newtons',
    symbol: 'N',
    dimension: { M: 1, L: 1, T: -2 },
    toSI: 1,
    stability: 'stable',
  },

  // Stress/Pressure
  {
    kind: 'unit',
    id: 'unit.Pa',
    name: 'Pascals',
    symbol: 'Pa',
    dimension: { M: 1, L: -1, T: -2 },
    toSI: 1,
    stability: 'stable',
  },
  {
    kind: 'unit',
    id: 'unit.MPa',
    name: 'Megapascals',
    symbol: 'MPa',
    dimension: { M: 1, L: -1, T: -2 },
    toSI: 1e6,
    siUnit: 'unit.Pa',
    stability: 'stable',
  },

  // Temperature
  {
    kind: 'unit',
    id: 'unit.K',
    name: 'Kelvin',
    symbol: 'K',
    dimension: { K: 1 },
    toSI: 1,
    stability: 'stable',
  },
  {
    kind: 'unit',
    id: 'unit.C',
    name: 'Celsius',
    symbol: '°C',
    dimension: { K: 1 },
    toSI: 1, // Offset, not multiplier
    siUnit: 'unit.K',
    stability: 'stable',
  },

  // Dimensionless
  {
    kind: 'unit',
    id: 'unit.ratio',
    name: 'Ratio',
    symbol: '',
    dimension: {},
    toSI: 1,
    stability: 'stable',
  },
  {
    kind: 'unit',
    id: 'unit.percent',
    name: 'Percent',
    symbol: '%',
    dimension: {},
    toSI: 0.01,
    siUnit: 'unit.ratio',
    stability: 'stable',
  },
]

// =============================================================================
// CORE SOLVERS
// =============================================================================

export const coreSolvers: Solver[] = [
  {
    kind: 'solver',
    id: 'solver.pythagoras',
    name: 'Pythagoras (Physics)',
    description: 'FEA stress analysis solver',
    type: 'physics',
    goals: ['goal.anchor', 'goal.load', 'goal.spring', 'goal.length'],
    hasSimulator: true,
    semanticOp: 'solver.pythagoras',
    stability: 'stable',
  },
  {
    kind: 'solver',
    id: 'solver.apollonius',
    name: 'Apollonius (Chemistry)',
    description: 'Material blending and reactions',
    type: 'chemistry',
    goals: ['goal.blend', 'goal.reaction'],
    hasSimulator: true,
    semanticOp: 'solver.apollonius',
    stability: 'stable',
  },
  {
    kind: 'solver',
    id: 'solver.euclid',
    name: 'Euclid (Topology)',
    description: 'Topological optimization for weight reduction',
    type: 'topology',
    goals: ['goal.density', 'goal.compliance'],
    hasSimulator: true,
    semanticOp: 'solver.euclid',
    stability: 'stable',
  },
  {
    kind: 'solver',
    id: 'solver.archimedes',
    name: 'Archimedes (Voxel)',
    description: 'Volumetric discretization solver',
    type: 'voxel',
    goals: ['goal.voxelize', 'goal.fill'],
    hasSimulator: true,
    semanticOp: 'solver.archimedes',
    stability: 'stable',
  },
  {
    kind: 'solver',
    id: 'solver.galen',
    name: 'Galen (Biological)',
    description: 'Reaction-diffusion morphogenesis',
    type: 'evolutionary',
    goals: ['goal.turing', 'goal.growth'],
    hasSimulator: true,
    semanticOp: 'solver.galen',
    stability: 'stable',
  },
]

// =============================================================================
// CORE GOALS
// =============================================================================

export const coreGoals: Goal[] = [
  // Physics goals (Pythagoras)
  {
    kind: 'goal',
    id: 'goal.anchor',
    name: 'Anchor',
    description: 'Fix particles/vertices in place',
    solver: 'solver.pythagoras',
    category: 'anchor',
    arity: 'unary',
    stability: 'stable',
    parameters: [
      { name: 'strength', type: 'number', default: 1.0 },
    ],
  },
  {
    kind: 'goal',
    id: 'goal.load',
    name: 'Load',
    description: 'Apply force to particles',
    solver: 'solver.pythagoras',
    category: 'load',
    arity: 'unary',
    stability: 'stable',
    parameters: [
      { name: 'force', type: 'vec3', required: true },
    ],
  },
  {
    kind: 'goal',
    id: 'goal.spring',
    name: 'Spring',
    description: 'Elastic connection between particles',
    solver: 'solver.pythagoras',
    category: 'constraint',
    arity: 'binary',
    conserves: ['energy'],
    stability: 'stable',
    parameters: [
      { name: 'stiffness', type: 'number', default: 1.0 },
      { name: 'restLength', type: 'number' },
    ],
  },
  {
    kind: 'goal',
    id: 'goal.length',
    name: 'Length Constraint',
    description: 'Maintain distance between particles',
    solver: 'solver.pythagoras',
    category: 'constraint',
    arity: 'binary',
    stability: 'stable',
    parameters: [
      { name: 'length', type: 'number', required: true, unit: 'unit.m' },
    ],
  },

  // Chemistry goals (Apollonius)
  {
    kind: 'goal',
    id: 'goal.blend',
    name: 'Blend',
    description: 'Blend materials together',
    solver: 'solver.apollonius',
    category: 'material',
    arity: 'n-ary',
    stability: 'stable',
    parameters: [
      { name: 'ratio', type: 'number', default: 0.5 },
    ],
  },
  {
    kind: 'goal',
    id: 'goal.reaction',
    name: 'Reaction',
    description: 'Chemical reaction between materials',
    solver: 'solver.apollonius',
    category: 'material',
    arity: 'binary',
    stability: 'stable',
  },

  // Topology goals (Euclid)
  {
    kind: 'goal',
    id: 'goal.density',
    name: 'Density Target',
    description: 'Target material density for optimization',
    solver: 'solver.euclid',
    category: 'optimization',
    arity: 'unary',
    stability: 'stable',
    parameters: [
      { name: 'target', type: 'number', default: 0.5 },
    ],
  },
  {
    kind: 'goal',
    id: 'goal.compliance',
    name: 'Compliance Minimization',
    description: 'Minimize structural compliance',
    solver: 'solver.euclid',
    category: 'optimization',
    arity: 'unary',
    stability: 'stable',
  },

  // Voxel goals (Archimedes)
  {
    kind: 'goal',
    id: 'goal.voxelize',
    name: 'Voxelize',
    description: 'Convert geometry to voxels',
    solver: 'solver.archimedes',
    category: 'constraint',
    arity: 'unary',
    stability: 'stable',
    parameters: [
      { name: 'resolution', type: 'integer', default: 32 },
    ],
  },
  {
    kind: 'goal',
    id: 'goal.fill',
    name: 'Fill',
    description: 'Fill enclosed volume',
    solver: 'solver.archimedes',
    category: 'constraint',
    arity: 'unary',
    stability: 'stable',
  },

  // Biological goals (Galen)
  {
    kind: 'goal',
    id: 'goal.turing',
    name: 'Turing Pattern',
    description: 'Reaction-diffusion pattern generation',
    solver: 'solver.galen',
    category: 'constraint',
    arity: 'unary',
    stability: 'stable',
    parameters: [
      { name: 'feed', type: 'number', default: 0.055 },
      { name: 'kill', type: 'number', default: 0.062 },
    ],
  },
  {
    kind: 'goal',
    id: 'goal.growth',
    name: 'Growth',
    description: 'Biological growth simulation',
    solver: 'solver.galen',
    category: 'constraint',
    arity: 'unary',
    stability: 'stable',
    parameters: [
      { name: 'rate', type: 'number', default: 0.1 },
    ],
  },
]

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Register all seed data into the ontology registry
 */
export function seedOntology(): void {
  // Register datatypes
  for (const dt of coreDataTypes) {
    ontologyRegistry.registerDataType(dt)
  }

  // Register units
  for (const unit of coreUnits) {
    ontologyRegistry.registerUnit(unit)
  }

  // Register solvers first (goals reference them)
  for (const solver of coreSolvers) {
    ontologyRegistry.registerSolver(solver)
  }

  // Register goals
  for (const goal of coreGoals) {
    ontologyRegistry.registerGoal(goal)
  }
}

// Auto-seed on import
seedOntology()
