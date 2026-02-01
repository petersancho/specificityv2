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
 */
export const generateMeshFromField = (
  field: VoxelField,
  isovalue: number,
  materialColors: Array<[number, number, number]>
): RenderMesh => {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  
  const res = field.resolution;
  const { cellSize } = field;
  const materialCount = field.data.length;
  
  // Simplified marching cubes (cube corners)
  for (let z = 0; z < res - 1; z++) {
    for (let y = 0; y < res - 1; y++) {
      for (let x = 0; x < res - 1; x++) {
        const idx000 = x + y * res + z * res * res;
        const idx100 = (x + 1) + y * res + z * res * res;
        const idx010 = x + (y + 1) * res + z * res * res;
        const idx110 = (x + 1) + (y + 1) * res + z * res * res;
        const idx001 = x + y * res + (z + 1) * res * res;
        const idx101 = (x + 1) + y * res + (z + 1) * res * res;
        const idx011 = x + (y + 1) * res + (z + 1) * res * res;
        const idx111 = (x + 1) + (y + 1) * res + (z + 1) * res * res;
        
        const d000 = field.densities[idx000];
        const d100 = field.densities[idx100];
        const d010 = field.densities[idx010];
        const d110 = field.densities[idx110];
        const d001 = field.densities[idx001];
        const d101 = field.densities[idx101];
        const d011 = field.densities[idx011];
        const d111 = field.densities[idx111];
        
        // Check if cell contains isosurface
        const hasInside = d000 >= isovalue || d100 >= isovalue || d010 >= isovalue || d110 >= isovalue ||
                          d001 >= isovalue || d101 >= isovalue || d011 >= isovalue || d111 >= isovalue;
        const hasOutside = d000 < isovalue || d100 < isovalue || d010 < isovalue || d110 < isovalue ||
                           d001 < isovalue || d101 < isovalue || d011 < isovalue || d111 < isovalue;
        
        if (!hasInside || !hasOutside) continue;
        
        // Simplified: create triangles at cell center
        const cx = field.bounds.min.x + (x + 0.5) * cellSize.x;
        const cy = field.bounds.min.y + (y + 0.5) * cellSize.y;
        const cz = field.bounds.min.z + (z + 0.5) * cellSize.z;
        
        // Compute material blend at center
        const centerIdx = Math.floor(x + 0.5) + Math.floor(y + 0.5) * res + Math.floor(z + 0.5) * res * res;
        let r = 0, g = 0, b = 0;
        for (let m = 0; m < materialCount; m++) {
          const conc = field.data[m][centerIdx] || 0;
          r += materialColors[m][0] * conc;
          g += materialColors[m][1] * conc;
          b += materialColors[m][2] * conc;
        }
        
        // Add cube vertices (simplified)
        const baseIdx = positions.length / 3;
        const halfSize = Math.min(cellSize.x, cellSize.y, cellSize.z) * 0.4;
        
        // 8 cube corners
        positions.push(cx - halfSize, cy - halfSize, cz - halfSize);
        positions.push(cx + halfSize, cy - halfSize, cz - halfSize);
        positions.push(cx + halfSize, cy + halfSize, cz - halfSize);
        positions.push(cx - halfSize, cy + halfSize, cz - halfSize);
        positions.push(cx - halfSize, cy - halfSize, cz + halfSize);
        positions.push(cx + halfSize, cy - halfSize, cz + halfSize);
        positions.push(cx + halfSize, cy + halfSize, cz + halfSize);
        positions.push(cx - halfSize, cy + halfSize, cz + halfSize);
        
        // Normals (face normals)
        for (let i = 0; i < 8; i++) {
          normals.push(0, 1, 0);
        }
        
        // Colors
        for (let i = 0; i < 8; i++) {
          colors.push(r, g, b);
        }
        
        // UVs
        for (let i = 0; i < 8; i++) {
          uvs.push(0, 0);
        }
        
        // Indices (12 triangles for cube)
        const faces = [
          [0, 1, 2], [0, 2, 3], // Front
          [4, 6, 5], [4, 7, 6], // Back
          [0, 4, 5], [0, 5, 1], // Bottom
          [2, 6, 7], [2, 7, 3], // Top
          [0, 3, 7], [0, 7, 4], // Left
          [1, 5, 6], [1, 6, 2], // Right
        ];
        
        for (const face of faces) {
          indices.push(baseIdx + face[0], baseIdx + face[1], baseIdx + face[2]);
        }
      }
    }
  }
  
  return { positions, normals, indices, colors, uvs };
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
