/**
 * Semantic operation definitions for solver domain
 * 
 * This module defines semantic metadata for solver operations
 * used throughout Lingua nodes.
 */

import type { SemanticOpMeta } from '../semanticOp';

export const SOLVER_OPS: readonly SemanticOpMeta[] = [
  {
    id: 'solver.physics',
    domain: 'solver',
    name: 'Physics Solver',
    category: 'utility',
    tags: ['3d', 'simulation', 'equilibrium'],
    complexity: 'O(n*iterations)',
    cost: 'high',
    pure: false,
    deterministic: true,
    sideEffects: ['geometry', 'state'],
    summary: 'Solves structural mechanics simulation with force equilibrium',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'solver.chemistry',
    domain: 'solver',
    name: 'Chemistry Solver',
    category: 'utility',
    tags: ['3d', 'simulation', 'distribution'],
    complexity: 'O(n*iterations)',
    cost: 'high',
    pure: false,
    deterministic: false,
    sideEffects: ['geometry', 'state', 'random'],
    summary: 'Solves material distribution simulation with particle dynamics',
    stable: true,
    since: '1.0.0'
  },

  {
    id: 'solver.evolutionary',
    domain: 'solver',
    name: 'Evolutionary Solver',
    category: 'utility',
    tags: ['3d', 'simulation', 'optimization'],
    complexity: 'O(population*generations)',
    cost: 'high',
    pure: false,
    deterministic: false,
    sideEffects: ['geometry', 'state', 'random'],
    summary: 'Solves optimization problems using genetic algorithms',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'solver.voxel',
    domain: 'solver',
    name: 'Voxel Solver',
    category: 'conversion',
    tags: ['3d', 'discrete'],
    complexity: 'O(n)',
    cost: 'medium',
    pure: true,
    deterministic: true,
    sideEffects: [],
    summary: 'Converts geometry to voxel field representation',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'solver.topologyOptimization',
    domain: 'solver',
    name: 'Topology Optimization Solver',
    category: 'utility',
    tags: ['3d', 'optimization', 'structural'],
    complexity: 'O(n*iterations)',
    cost: 'high',
    pure: false,
    deterministic: true,
    sideEffects: ['geometry', 'state'],
    summary: 'Optimizes material layout for structural performance',
    stable: false,
    since: '2.0.0'
  },
  {
    id: 'simulator.initialize',
    domain: 'solver',
    name: 'Initialize Simulator',
    category: 'utility',
    tags: ['simulation', 'internal'],
    complexity: 'O(n)',
    cost: 'low',
    pure: false,
    deterministic: true,
    sideEffects: ['state'],
    summary: 'Initializes simulation state',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'simulator.step',
    domain: 'solver',
    name: 'Step Simulator',
    category: 'utility',
    tags: ['simulation', 'internal'],
    complexity: 'O(n)',
    cost: 'medium',
    pure: false,
    deterministic: false,
    sideEffects: ['state'],
    summary: 'Executes single simulation step',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'simulator.converge',
    domain: 'solver',
    name: 'Check Convergence',
    category: 'query',
    tags: ['simulation', 'internal'],
    complexity: 'O(1)',
    cost: 'low',
    pure: true,
    deterministic: true,
    sideEffects: [],
    summary: 'Checks simulation convergence criteria',
    stable: true,
    since: '1.0.0'
  },
  {
    id: 'simulator.finalize',
    domain: 'solver',
    name: 'Finalize Simulator',
    category: 'utility',
    tags: ['simulation', 'internal'],
    complexity: 'O(n)',
    cost: 'medium',
    pure: false,
    deterministic: true,
    sideEffects: ['geometry'],
    summary: 'Finalizes simulation and generates output',
    stable: true,
    since: '1.0.0'
  }
] as const;
