/**
 * Chemistry Solver Particle System
 * 
 * NUMERICA: Particle-based material blending using SPH
 * 
 * This module provides a high-level API for the chemistry solver,
 * wrapping the low-level ParticlePool (SoA) implementation.
 * 
 * Architecture:
 * - ParticlePool (SoA) - Cache-efficient particle storage
 * - This module - High-level simulation API
 * - Worker - Offloads computation to background thread
 */

import type { Vec3, RenderMesh } from "../../../../types";
import {
  type ParticlePool,
  createParticlePool,
  initializePool,
  seedParticles as seedParticlesPool,
  createOptimizedSpatialHash,
  findAllNeighbors,
  computeDensitiesBatched,
  diffuseMaterialsBatched,
  applyGoalForcesBatched,
  computeSystemEnergyBatched,
  generateVoxelFieldFromPool,
} from "./particlePool";
import { marchingCubes } from "./marchingCubes";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type MaterialSpec = {
  name: string;
  density: number;
  stiffness: number;
  thermalConductivity: number;
  opticalTransmission: number;
  diffusivity: number;
  color: [number, number, number];
};

export type ParticleSystemConfig = {
  particleCount: number;
  materialCount: number;
  bounds: { min: Vec3; max: Vec3 };
  particleRadius: number;
  smoothingRadius: number;
  restDensity: number;
  viscosity: number;
  diffusionRate: number;
  timeStep: number;
  gravity: Vec3;
};

export type VoxelField = {
  resolution: number;
  bounds: { min: Vec3; max: Vec3 };
  cellSize: Vec3;
  data: Float32Array[];
  densities: Float32Array;
};

export type SimulationResult = {
  pool: ParticlePool;
  energy: number;
  energyHistory: number[];
  converged: boolean;
  iterations: number;
};

// ═══════════════════════════════════════════════════════════════════════════
// SEEDED RANDOM
// ═══════════════════════════════════════════════════════════════════════════

const createSeededRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// PARTICLE SYSTEM API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize particles within the domain
 */
export const initializeParticles = (
  count: number,
  materialCount: number,
  bounds: { min: Vec3; max: Vec3 },
  particleRadius: number,
  seed: number
): ParticlePool => {
  const pool = createParticlePool({ capacity: count, materialCount });
  
  const size = {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z,
  };
  const volume = size.x * size.y * size.z;
  const baseMass = volume / count;
  
  const random = createSeededRandom(seed);
  initializePool(pool, count, bounds, particleRadius, baseMass, random);
  
  return pool;
};

/**
 * Seed particles with initial material concentrations
 */
export const seedParticles = (
  pool: ParticlePool,
  seeds: Array<{
    position: Vec3;
    radius: number;
    materialIndex: number;
    strength: number;
  }>
): void => {
  seedParticlesPool(pool, seeds);
};

/**
 * Compute densities for all particles
 */
export const computeDensities = (
  pool: ParticlePool,
  smoothingRadius: number
): void => {
  computeDensitiesBatched(pool, smoothingRadius);
};

/**
 * Apply material diffusion
 */
export const diffuseMaterials = (
  pool: ParticlePool,
  smoothingRadius: number,
  diffusionRates: Float32Array,
  blendStrength: number,
  dt: number
): void => {
  diffuseMaterialsBatched(pool, smoothingRadius, diffusionRates, blendStrength, dt);
};

/**
 * Apply goal forces to particles
 */
export const applyGoalForces = (
  pool: ParticlePool,
  goals: Array<{
    type: "stiffness" | "mass" | "transparency" | "thermal" | "blend";
    weight: number;
    parameters: Record<string, unknown>;
    region?: { min: Vec3; max: Vec3 };
  }>,
  materialProps: {
    stiffness: Float32Array;
    density: Float32Array;
    thermal: Float32Array;
    optical: Float32Array;
  },
  maxProps: {
    stiffness: number;
    density: number;
    thermal: number;
    optical: number;
  },
  domainCenter: Vec3,
  dt: number
): void => {
  applyGoalForcesBatched(pool, goals, materialProps, maxProps, domainCenter, dt);
};

/**
 * Compute system energy
 */
export const computeSystemEnergy = (
  pool: ParticlePool,
  goals: Array<{
    type: "stiffness" | "mass" | "transparency" | "thermal" | "blend";
    weight: number;
    parameters: Record<string, unknown>;
    region?: { min: Vec3; max: Vec3 };
  }>,
  materialProps: {
    stiffness: Float32Array;
    density: Float32Array;
    thermal: Float32Array;
    optical: Float32Array;
  },
  maxProps: {
    stiffness: number;
    density: number;
    thermal: number;
    optical: number;
  }
): { total: number; byGoal: Record<string, number> } => {
  return computeSystemEnergyBatched(pool, goals, materialProps, maxProps);
};

/**
 * Generate voxel field from particles
 */
export const generateVoxelField = (
  pool: ParticlePool,
  bounds: { min: Vec3; max: Vec3 },
  resolution: number,
  smoothingRadius: number
): VoxelField => {
  const field = generateVoxelFieldFromPool(pool, bounds, resolution, smoothingRadius);
  
  const size = {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z,
  };
  
  return {
    resolution: field.resolution,
    bounds: field.bounds,
    cellSize: {
      x: size.x / resolution,
      y: size.y / resolution,
      z: size.z / resolution,
    },
    data: field.data,
    densities: field.densities,
  };
};

/**
 * Generate mesh from voxel field using marching cubes
 * 
 * Now uses proper marching cubes with edge interpolation (PhD-level implementation)
 */
export const generateMeshFromField = (
  field: VoxelField,
  isovalue: number,
  materialColors: Array<[number, number, number]>
): RenderMesh => {
  return marchingCubes(field, isovalue, materialColors);
};

/**
 * Run full simulation
 */
export const runSimulation = (
  config: ParticleSystemConfig,
  materials: MaterialSpec[],
  seeds: Array<{
    position: Vec3;
    radius: number;
    materialIndex: number;
    strength: number;
  }>,
  goals: Array<{
    type: "stiffness" | "mass" | "transparency" | "thermal" | "blend";
    weight: number;
    parameters: Record<string, unknown>;
    region?: { min: Vec3; max: Vec3 };
  }>,
  maxIterations: number,
  convergenceThreshold: number,
  seed: number
): SimulationResult => {
  // Initialize particles
  let pool = initializeParticles(
    config.particleCount,
    config.materialCount,
    config.bounds,
    config.particleRadius,
    seed
  );
  
  // Seed materials
  seedParticles(pool, seeds);
  
  // Prepare material properties
  const materialProps = {
    stiffness: new Float32Array(materials.map(m => m.stiffness)),
    density: new Float32Array(materials.map(m => m.density)),
    thermal: new Float32Array(materials.map(m => m.thermalConductivity)),
    optical: new Float32Array(materials.map(m => m.opticalTransmission)),
  };
  
  const diffusionRates = new Float32Array(materials.map(m => m.diffusivity));
  
  const maxProps = {
    stiffness: Math.max(...materialProps.stiffness),
    density: Math.max(...materialProps.density),
    thermal: Math.max(...materialProps.thermal),
    optical: Math.max(...materialProps.optical),
  };
  
  const domainCenter = {
    x: (config.bounds.min.x + config.bounds.max.x) * 0.5,
    y: (config.bounds.min.y + config.bounds.max.y) * 0.5,
    z: (config.bounds.min.z + config.bounds.max.z) * 0.5,
  };
  
  const blendGoal = goals.find(g => g.type === "blend");
  const blendStrength = blendGoal ? blendGoal.weight : 1.0;
  
  const energyHistory: number[] = [];
  let converged = false;
  let iterations = 0;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;
    
    // Build spatial hash and find neighbors
    const hash = createOptimizedSpatialHash(pool, config.smoothingRadius);
    findAllNeighbors(pool, hash, config.smoothingRadius);
    
    // Compute densities
    computeDensities(pool, config.smoothingRadius);
    
    // Apply diffusion
    diffuseMaterials(pool, config.smoothingRadius, diffusionRates, blendStrength, config.timeStep);
    
    // Apply goal forces
    applyGoalForces(pool, goals, materialProps, maxProps, domainCenter, config.timeStep);
    
    // Compute energy
    const energyResult = computeSystemEnergy(pool, goals, materialProps, maxProps);
    energyHistory.push(energyResult.total);
    
    // Check convergence
    if (iter > 10) {
      const recentEnergies = energyHistory.slice(-10);
      const avgEnergy = recentEnergies.reduce((a, b) => a + b, 0) / recentEnergies.length;
      const variance = recentEnergies.reduce((sum, e) => sum + (e - avgEnergy) ** 2, 0) / recentEnergies.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev < convergenceThreshold) {
        converged = true;
        break;
      }
    }
  }
  
  return {
    pool,
    energy: energyHistory[energyHistory.length - 1] || 0,
    energyHistory,
    converged,
    iterations,
  };
};
