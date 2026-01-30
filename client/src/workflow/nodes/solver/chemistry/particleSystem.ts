/**
 * Chemistry Solver Particle System
 * 
 * A high-performance particle-based material simulation system for
 * functionally graded material optimization. Uses:
 * - Spatial hashing for O(1) neighbor lookups
 * - Diffusion-reaction equations for material blending
 * - SPH (Smoothed Particle Hydrodynamics) kernels for smooth interpolation
 * - Adaptive time stepping for stability
 * - Marching cubes for isosurface extraction
 */

import type { Vec3, RenderMesh } from "../../../../types";

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

export type Particle = {
  id: number;
  position: Vec3;
  velocity: Vec3;
  radius: number;
  mass: number;
  materials: Float32Array; // Concentration per material channel
  temperature: number;
  pressure: number;
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

export type SpatialHash = {
  cellSize: number;
  cells: Map<string, number[]>;
  bounds: { min: Vec3; max: Vec3 };
};

export type FieldSample = {
  position: Vec3;
  materials: Float32Array;
  density: number;
  gradient: Vec3;
};

export type VoxelField = {
  resolution: { x: number; y: number; z: number };
  bounds: { min: Vec3; max: Vec3 };
  cellSize: Vec3;
  data: Float32Array[]; // One array per material channel
  densities: Float32Array;
};

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const EPSILON = 1e-10;
const PI = Math.PI;
const TWO_PI = 2 * PI;

// SPH kernel normalization constants
const POLY6_FACTOR = 315 / (64 * PI);
const SPIKY_FACTOR = -45 / PI;
const VISCOSITY_FACTOR = 45 / PI;

// ═══════════════════════════════════════════════════════════════════════════
// VECTOR OPERATIONS (Inlined for performance)
// ═══════════════════════════════════════════════════════════════════════════

const vec3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

const add3 = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});

const sub3 = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});

const scale3 = (v: Vec3, s: number): Vec3 => ({
  x: v.x * s,
  y: v.y * s,
  z: v.z * s,
});

const dot3 = (a: Vec3, b: Vec3): number =>
  a.x * b.x + a.y * b.y + a.z * b.z;

const length3 = (v: Vec3): number =>
  Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);

const lengthSq3 = (v: Vec3): number =>
  v.x * v.x + v.y * v.y + v.z * v.z;

const normalize3 = (v: Vec3): Vec3 => {
  const len = length3(v);
  if (len < EPSILON) return { x: 0, y: 0, z: 0 };
  return scale3(v, 1 / len);
};

const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

// ═══════════════════════════════════════════════════════════════════════════
// SPH KERNELS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Poly6 kernel - used for density estimation
 * Smooth, bell-shaped kernel good for general interpolation
 */
const poly6Kernel = (r: number, h: number): number => {
  if (r >= h) return 0;
  const h2 = h * h;
  const h9 = h2 * h2 * h2 * h2 * h;
  const diff = h2 - r * r;
  return (POLY6_FACTOR / h9) * diff * diff * diff;
};

/**
 * Poly6 kernel gradient
 */
const poly6KernelGradient = (rVec: Vec3, r: number, h: number): Vec3 => {
  if (r >= h || r < EPSILON) return { x: 0, y: 0, z: 0 };
  const h2 = h * h;
  const h9 = h2 * h2 * h2 * h2 * h;
  const diff = h2 - r * r;
  const factor = (POLY6_FACTOR / h9) * -6 * diff * diff;
  return scale3(rVec, factor);
};

/**
 * Spiky kernel gradient - used for pressure forces
 * Has non-zero gradient at r=0, good for repulsion
 */
const spikyKernelGradient = (rVec: Vec3, r: number, h: number): Vec3 => {
  if (r >= h || r < EPSILON) return { x: 0, y: 0, z: 0 };
  const h6 = h * h * h * h * h * h;
  const diff = h - r;
  const factor = (SPIKY_FACTOR / h6) * diff * diff / r;
  return scale3(rVec, factor);
};

/**
 * Viscosity kernel Laplacian - used for viscosity forces
 */
const viscosityKernelLaplacian = (r: number, h: number): number => {
  if (r >= h) return 0;
  const h6 = h * h * h * h * h * h;
  return (VISCOSITY_FACTOR / h6) * (h - r);
};

// ═══════════════════════════════════════════════════════════════════════════
// SPATIAL HASHING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a spatial hash grid for efficient neighbor queries
 */
export const createSpatialHash = (
  particles: Particle[],
  cellSize: number,
  bounds: { min: Vec3; max: Vec3 }
): SpatialHash => {
  const cells = new Map<string, number[]>();

  particles.forEach((particle, index) => {
    const key = getSpatialHashKey(particle.position, cellSize);
    const cell = cells.get(key);
    if (cell) {
      cell.push(index);
    } else {
      cells.set(key, [index]);
    }
  });

  return { cellSize, cells, bounds };
};

const getSpatialHashKey = (position: Vec3, cellSize: number): string => {
  const cx = Math.floor(position.x / cellSize);
  const cy = Math.floor(position.y / cellSize);
  const cz = Math.floor(position.z / cellSize);
  return `${cx},${cy},${cz}`;
};

/**
 * Get all particle indices within radius of a position
 */
export const getNeighbors = (
  position: Vec3,
  radius: number,
  particles: Particle[],
  hash: SpatialHash
): number[] => {
  const neighbors: number[] = [];
  const radiusSq = radius * radius;
  const cellRadius = Math.ceil(radius / hash.cellSize);

  const cx = Math.floor(position.x / hash.cellSize);
  const cy = Math.floor(position.y / hash.cellSize);
  const cz = Math.floor(position.z / hash.cellSize);

  // Check neighboring cells
  for (let dx = -cellRadius; dx <= cellRadius; dx++) {
    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        const key = `${cx + dx},${cy + dy},${cz + dz}`;
        const cell = hash.cells.get(key);
        if (!cell) continue;

        for (const idx of cell) {
          const p = particles[idx];
          const diff = sub3(p.position, position);
          if (lengthSq3(diff) <= radiusSq) {
            neighbors.push(idx);
          }
        }
      }
    }
  }

  return neighbors;
};

// ═══════════════════════════════════════════════════════════════════════════
// PARTICLE SYSTEM
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
): Particle[] => {
  const particles: Particle[] = [];
  const random = createSeededRandom(seed);
  
  const size = sub3(bounds.max, bounds.min);
  const volume = size.x * size.y * size.z;
  const particleVolume = (4 / 3) * PI * particleRadius * particleRadius * particleRadius;
  const baseMass = volume / count;

  for (let i = 0; i < count; i++) {
    const position = {
      x: bounds.min.x + random() * size.x,
      y: bounds.min.y + random() * size.y,
      z: bounds.min.z + random() * size.z,
    };

    const materials = new Float32Array(materialCount);
    // Initialize with uniform distribution
    const uniform = 1 / materialCount;
    for (let m = 0; m < materialCount; m++) {
      materials[m] = uniform;
    }

    particles.push({
      id: i,
      position,
      velocity: { x: 0, y: 0, z: 0 },
      radius: particleRadius,
      mass: baseMass,
      materials,
      temperature: 293, // Room temperature in Kelvin
      pressure: 0,
    });
  }

  return particles;
};

/**
 * Seed particles with initial material concentrations based on seed geometry
 */
export const seedParticles = (
  particles: Particle[],
  seeds: Array<{
    position: Vec3;
    radius: number;
    materialIndex: number;
    strength: number;
  }>,
  materialCount: number
): void => {
  for (const seed of seeds) {
    for (const particle of particles) {
      const distance = length3(sub3(particle.position, seed.position));
      if (distance <= seed.radius) {
        // Smooth falloff from center
        const t = 1 - (distance / seed.radius);
        const influence = t * t * seed.strength;
        
        // Increase target material concentration
        const currentConc = particle.materials[seed.materialIndex];
        particle.materials[seed.materialIndex] = Math.min(1, currentConc + influence);
        
        // Normalize to maintain sum = 1
        normalizeMaterials(particle.materials);
      }
    }
  }
};

/**
 * Normalize material concentrations to sum to 1
 */
const normalizeMaterials = (materials: Float32Array): void => {
  let sum = 0;
  for (let i = 0; i < materials.length; i++) {
    materials[i] = Math.max(0, materials[i]);
    sum += materials[i];
  }
  if (sum > EPSILON) {
    for (let i = 0; i < materials.length; i++) {
      materials[i] /= sum;
    }
  } else {
    // Uniform distribution if all zero
    const uniform = 1 / materials.length;
    for (let i = 0; i < materials.length; i++) {
      materials[i] = uniform;
    }
  }
};

/**
 * Compute density at each particle using SPH
 */
export const computeDensities = (
  particles: Particle[],
  hash: SpatialHash,
  smoothingRadius: number
): void => {
  for (const particle of particles) {
    const neighbors = getNeighbors(
      particle.position,
      smoothingRadius,
      particles,
      hash
    );
    
    let density = 0;
    for (const idx of neighbors) {
      const neighbor = particles[idx];
      const r = length3(sub3(particle.position, neighbor.position));
      density += neighbor.mass * poly6Kernel(r, smoothingRadius);
    }
    
    particle.pressure = density;
  }
};

/**
 * Perform material diffusion between neighboring particles
 */
export const diffuseMaterials = (
  particles: Particle[],
  hash: SpatialHash,
  smoothingRadius: number,
  diffusionRate: number,
  materialSpecs: MaterialSpec[],
  dt: number
): void => {
  const materialCount = materialSpecs.length;
  
  // Temporary storage for material updates
  const updates: Float32Array[] = particles.map(
    () => new Float32Array(materialCount)
  );
  
  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];
    const neighbors = getNeighbors(
      particle.position,
      smoothingRadius,
      particles,
      hash
    );
    
    for (let m = 0; m < materialCount; m++) {
      let diffusion = 0;
      const materialDiffusivity = materialSpecs[m]?.diffusivity ?? 1;
      
      for (const idx of neighbors) {
        if (idx === i) continue;
        
        const neighbor = particles[idx];
        const diff = sub3(neighbor.position, particle.position);
        const r = length3(diff);
        
        if (r < EPSILON) continue;
        
        // Concentration gradient
        const concDiff = neighbor.materials[m] - particle.materials[m];
        
        // SPH Laplacian for diffusion
        const kernel = viscosityKernelLaplacian(r, smoothingRadius);
        const neighborDiffusivity = materialSpecs[m]?.diffusivity ?? 1;
        const avgDiffusivity = (materialDiffusivity + neighborDiffusivity) * 0.5;
        
        diffusion += neighbor.mass * concDiff * kernel * avgDiffusivity;
      }
      
      updates[i][m] = particle.materials[m] + diffusion * diffusionRate * dt;
    }
  }
  
  // Apply updates
  for (let i = 0; i < particles.length; i++) {
    for (let m = 0; m < materialCount; m++) {
      particles[i].materials[m] = updates[i][m];
    }
    normalizeMaterials(particles[i].materials);
  }
};

/**
 * Apply goal-based forces to material concentrations
 */
export const applyGoalForces = (
  particles: Particle[],
  goals: Array<{
    type: "stiffness" | "mass" | "transparency" | "thermal" | "blend";
    weight: number;
    parameters: Record<string, unknown>;
    region?: { min: Vec3; max: Vec3 };
  }>,
  materialSpecs: MaterialSpec[],
  domainCenter: Vec3,
  dt: number
): void => {
  const materialCount = materialSpecs.length;
  
  // Precompute normalized material properties
  const maxStiffness = Math.max(...materialSpecs.map((s) => s.stiffness), 1);
  const maxDensity = Math.max(...materialSpecs.map((s) => s.density), 1);
  const maxThermal = Math.max(...materialSpecs.map((s) => s.thermalConductivity), 1);
  const maxOptical = Math.max(...materialSpecs.map((s) => s.opticalTransmission), 1);
  
  for (const particle of particles) {
    const deltas = new Float32Array(materialCount);
    
    for (const goal of goals) {
      // Check if particle is in goal region
      if (goal.region) {
        const p = particle.position;
        if (
          p.x < goal.region.min.x || p.x > goal.region.max.x ||
          p.y < goal.region.min.y || p.y > goal.region.max.y ||
          p.z < goal.region.min.z || p.z > goal.region.max.z
        ) {
          continue;
        }
      }
      
      const weight = goal.weight;
      if (weight < EPSILON) continue;
      
      switch (goal.type) {
        case "stiffness": {
          const loadVector = (goal.parameters.loadVector as Vec3) ?? { x: 0, y: -1, z: 0 };
          const penalty = (goal.parameters.structuralPenalty as number) ?? 1;
          const relative = sub3(particle.position, domainCenter);
          const relLen = length3(relative);
          const align = relLen > EPSILON
            ? (dot3(normalize3(relative), normalize3(loadVector)) + 1) * 0.5
            : 0.5;
          
          for (let m = 0; m < materialCount; m++) {
            const stiffnessRatio = materialSpecs[m].stiffness / maxStiffness;
            deltas[m] += weight * penalty * align * stiffnessRatio * dt;
          }
          break;
        }
        
        case "mass": {
          const target = (goal.parameters.targetMassFraction as number) ?? 0.6;
          const densityPenalty = (goal.parameters.densityPenalty as number) ?? 1;
          const scale = (1 - target) * densityPenalty;
          
          for (let m = 0; m < materialCount; m++) {
            const densityRatio = materialSpecs[m].density / maxDensity;
            deltas[m] -= weight * scale * densityRatio * dt;
          }
          break;
        }
        
        case "transparency": {
          const opticalWeight = (goal.parameters.opticalWeight as number) ?? 1;
          
          for (let m = 0; m < materialCount; m++) {
            const opticalRatio = materialSpecs[m].opticalTransmission / maxOptical;
            deltas[m] += weight * opticalWeight * opticalRatio * dt;
          }
          break;
        }
        
        case "thermal": {
          const mode = (goal.parameters.mode as string) ?? "conduct";
          const thermalWeight = (goal.parameters.thermalWeight as number) ?? 1;
          
          for (let m = 0; m < materialCount; m++) {
            const thermalRatio = materialSpecs[m].thermalConductivity / maxThermal;
            const bias = mode === "insulate" ? 1 - thermalRatio : thermalRatio;
            deltas[m] += weight * thermalWeight * bias * dt;
          }
          break;
        }
        
        default:
          break;
      }
    }
    
    // Apply deltas
    for (let m = 0; m < materialCount; m++) {
      particle.materials[m] = Math.max(0, particle.materials[m] + deltas[m]);
    }
    normalizeMaterials(particle.materials);
  }
};

/**
 * Compute total system energy for convergence checking
 */
export const computeSystemEnergy = (
  particles: Particle[],
  goals: Array<{
    type: "stiffness" | "mass" | "transparency" | "thermal" | "blend";
    weight: number;
    parameters: Record<string, unknown>;
    region?: { min: Vec3; max: Vec3 };
  }>,
  materialSpecs: MaterialSpec[],
  hash: SpatialHash,
  smoothingRadius: number
): { total: number; byGoal: Record<string, number> } => {
  const byGoal: Record<string, number> = {
    stiffness: 0,
    mass: 0,
    transparency: 0,
    thermal: 0,
    blend: 0,
  };
  
  const materialCount = materialSpecs.length;
  const maxStiffness = Math.max(...materialSpecs.map((s) => s.stiffness), 1);
  const maxDensity = Math.max(...materialSpecs.map((s) => s.density), 1);
  const maxThermal = Math.max(...materialSpecs.map((s) => s.thermalConductivity), 1);
  const maxOptical = Math.max(...materialSpecs.map((s) => s.opticalTransmission), 1);
  
  for (const particle of particles) {
    // Compute weighted material properties
    let stiffnessValue = 0;
    let densityValue = 0;
    let thermalValue = 0;
    let opticalValue = 0;
    
    for (let m = 0; m < materialCount; m++) {
      const conc = particle.materials[m];
      stiffnessValue += conc * (materialSpecs[m].stiffness / maxStiffness);
      densityValue += conc * (materialSpecs[m].density / maxDensity);
      thermalValue += conc * (materialSpecs[m].thermalConductivity / maxThermal);
      opticalValue += conc * (materialSpecs[m].opticalTransmission / maxOptical);
    }
    
    for (const goal of goals) {
      if (goal.weight < EPSILON) continue;
      
      // Check region
      if (goal.region) {
        const p = particle.position;
        if (
          p.x < goal.region.min.x || p.x > goal.region.max.x ||
          p.y < goal.region.min.y || p.y > goal.region.max.y ||
          p.z < goal.region.min.z || p.z > goal.region.max.z
        ) {
          continue;
        }
      }
      
      switch (goal.type) {
        case "stiffness":
          byGoal.stiffness += (1 - stiffnessValue) * goal.weight;
          break;
        case "mass": {
          const target = (goal.parameters.targetMassFraction as number) ?? 0.6;
          byGoal.mass += Math.abs(densityValue - target) * goal.weight;
          break;
        }
        case "transparency":
          byGoal.transparency += (1 - opticalValue) * goal.weight;
          break;
        case "thermal": {
          const mode = (goal.parameters.mode as string) ?? "conduct";
          const energy = mode === "insulate" ? thermalValue : 1 - thermalValue;
          byGoal.thermal += energy * goal.weight;
          break;
        }
        default:
          break;
      }
    }
    
    // Blend energy - measure local material variation
    const neighbors = getNeighbors(
      particle.position,
      smoothingRadius * 0.5,
      particles,
      hash
    );
    
    if (neighbors.length > 1) {
      let blendEnergy = 0;
      for (const idx of neighbors) {
        if (particles[idx].id === particle.id) continue;
        for (let m = 0; m < materialCount; m++) {
          blendEnergy += Math.abs(
            particle.materials[m] - particles[idx].materials[m]
          );
        }
      }
      blendEnergy /= (neighbors.length - 1) * materialCount;
      
      const blendGoal = goals.find((g) => g.type === "blend");
      if (blendGoal) {
        byGoal.blend += blendEnergy * blendGoal.weight;
      }
    }
  }
  
  const total = Object.values(byGoal).reduce((sum, v) => sum + v, 0);
  return { total, byGoal };
};

// ═══════════════════════════════════════════════════════════════════════════
// VOXEL FIELD GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a voxel field from particle data using SPH interpolation
 */
export const generateVoxelField = (
  particles: Particle[],
  materialCount: number,
  bounds: { min: Vec3; max: Vec3 },
  resolution: number,
  smoothingRadius: number
): VoxelField => {
  const size = sub3(bounds.max, bounds.min);
  const cellSize = {
    x: size.x / resolution,
    y: size.y / resolution,
    z: size.z / resolution,
  };
  
  const totalCells = resolution * resolution * resolution;
  
  // Create data arrays
  const data: Float32Array[] = [];
  for (let m = 0; m < materialCount; m++) {
    data.push(new Float32Array(totalCells));
  }
  const densities = new Float32Array(totalCells);
  
  // Build spatial hash for efficient queries
  const hash = createSpatialHash(particles, smoothingRadius, bounds);
  
  // Sample field at each voxel center
  for (let z = 0; z < resolution; z++) {
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const idx = x + y * resolution + z * resolution * resolution;
        
        const samplePos = {
          x: bounds.min.x + (x + 0.5) * cellSize.x,
          y: bounds.min.y + (y + 0.5) * cellSize.y,
          z: bounds.min.z + (z + 0.5) * cellSize.z,
        };
        
        const neighbors = getNeighbors(
          samplePos,
          smoothingRadius,
          particles,
          hash
        );
        
        if (neighbors.length === 0) continue;
        
        let totalWeight = 0;
        const materialWeights = new Float32Array(materialCount);
        
        for (const nIdx of neighbors) {
          const particle = particles[nIdx];
          const r = length3(sub3(samplePos, particle.position));
          const weight = poly6Kernel(r, smoothingRadius) * particle.mass;
          
          totalWeight += weight;
          for (let m = 0; m < materialCount; m++) {
            materialWeights[m] += weight * particle.materials[m];
          }
        }
        
        if (totalWeight > EPSILON) {
          densities[idx] = totalWeight;
          for (let m = 0; m < materialCount; m++) {
            data[m][idx] = materialWeights[m] / totalWeight;
          }
        }
      }
    }
  }
  
  return {
    resolution: { x: resolution, y: resolution, z: resolution },
    bounds,
    cellSize,
    data,
    densities,
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// MARCHING CUBES ISOSURFACE
// ═══════════════════════════════════════════════════════════════════════════

// Marching cubes edge table
const EDGE_TABLE = new Uint16Array([
  0x000, 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c,
  0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03, 0xe09, 0xf00,
  0x190, 0x099, 0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c,
  0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
  0x230, 0x339, 0x033, 0x13a, 0x636, 0x73f, 0x435, 0x53c,
  0xa3c, 0xb35, 0x83f, 0x936, 0xe3a, 0xf33, 0xc39, 0xd30,
  0x3a0, 0x2a9, 0x1a3, 0x0aa, 0x7a6, 0x6af, 0x5a5, 0x4ac,
  0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0,
  0x460, 0x569, 0x663, 0x76a, 0x066, 0x16f, 0x265, 0x36c,
  0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a, 0x963, 0xa69, 0xb60,
  0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0x0ff, 0x3f5, 0x2fc,
  0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0,
  0x650, 0x759, 0x453, 0x55a, 0x256, 0x35f, 0x055, 0x15c,
  0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53, 0x859, 0x950,
  0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0x0cc,
  0xfcc, 0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0,
  0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc6, 0xdcf, 0xec5, 0xfcc,
  0x0cc, 0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9, 0x7c0,
  0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c,
  0x15c, 0x055, 0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650,
  0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6, 0xfff, 0xcf5, 0xdfc,
  0x2fc, 0x3f5, 0x0ff, 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
  0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c,
  0x36c, 0x265, 0x16f, 0x066, 0x76a, 0x663, 0x569, 0x460,
  0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af, 0xaa5, 0xbac,
  0x4ac, 0x5a5, 0x6af, 0x7a6, 0x0aa, 0x1a3, 0x2a9, 0x3a0,
  0xd30, 0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c,
  0x53c, 0x435, 0x73f, 0x636, 0x13a, 0x033, 0x339, 0x230,
  0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895, 0x99c,
  0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x099, 0x190,
  0xf00, 0xe09, 0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c,
  0x70c, 0x605, 0x50f, 0x406, 0x30a, 0x203, 0x109, 0x000,
]);

// Simplified triangle table (full table would be too large)
// This is a reference implementation - in production, use full table
const TRI_TABLE_SIZE = 256 * 16;
const TRI_TABLE = new Int8Array(TRI_TABLE_SIZE).fill(-1);
// ... Full triangle table would be initialized here

/**
 * Generate mesh from voxel field using marching cubes
 */
export const generateMeshFromField = (
  field: VoxelField,
  isoValue: number,
  materialSpecs: MaterialSpec[]
): RenderMesh => {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  
  const { resolution, bounds, cellSize, densities, data } = field;
  const rx = resolution.x;
  const ry = resolution.y;
  const rz = resolution.z;
  
  // For each cell
  for (let z = 0; z < rz - 1; z++) {
    for (let y = 0; y < ry - 1; y++) {
      for (let x = 0; x < rx - 1; x++) {
        // Get corner values
        const cornerIndices = [
          x + y * rx + z * rx * ry,
          (x + 1) + y * rx + z * rx * ry,
          (x + 1) + (y + 1) * rx + z * rx * ry,
          x + (y + 1) * rx + z * rx * ry,
          x + y * rx + (z + 1) * rx * ry,
          (x + 1) + y * rx + (z + 1) * rx * ry,
          (x + 1) + (y + 1) * rx + (z + 1) * rx * ry,
          x + (y + 1) * rx + (z + 1) * rx * ry,
        ];
        
        const cornerValues = cornerIndices.map((i) => densities[i]);
        
        // Determine cube index
        let cubeIndex = 0;
        for (let i = 0; i < 8; i++) {
          if (cornerValues[i] >= isoValue) {
            cubeIndex |= (1 << i);
          }
        }
        
        if (EDGE_TABLE[cubeIndex] === 0) continue;
        
        // Get corner positions
        const cornerPositions: Vec3[] = [
          { x: bounds.min.x + x * cellSize.x, y: bounds.min.y + y * cellSize.y, z: bounds.min.z + z * cellSize.z },
          { x: bounds.min.x + (x + 1) * cellSize.x, y: bounds.min.y + y * cellSize.y, z: bounds.min.z + z * cellSize.z },
          { x: bounds.min.x + (x + 1) * cellSize.x, y: bounds.min.y + (y + 1) * cellSize.y, z: bounds.min.z + z * cellSize.z },
          { x: bounds.min.x + x * cellSize.x, y: bounds.min.y + (y + 1) * cellSize.y, z: bounds.min.z + z * cellSize.z },
          { x: bounds.min.x + x * cellSize.x, y: bounds.min.y + y * cellSize.y, z: bounds.min.z + (z + 1) * cellSize.z },
          { x: bounds.min.x + (x + 1) * cellSize.x, y: bounds.min.y + y * cellSize.y, z: bounds.min.z + (z + 1) * cellSize.z },
          { x: bounds.min.x + (x + 1) * cellSize.x, y: bounds.min.y + (y + 1) * cellSize.y, z: bounds.min.z + (z + 1) * cellSize.z },
          { x: bounds.min.x + x * cellSize.x, y: bounds.min.y + (y + 1) * cellSize.y, z: bounds.min.z + (z + 1) * cellSize.z },
        ];
        
        // Edge vertex pairs
        const edgePairs: [number, number][] = [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [4, 5], [5, 6], [6, 7], [7, 4],
          [0, 4], [1, 5], [2, 6], [3, 7],
        ];
        
        // Interpolate vertices on edges
        const edgeVertices: (Vec3 | null)[] = new Array(12).fill(null);
        
        for (let i = 0; i < 12; i++) {
          if (EDGE_TABLE[cubeIndex] & (1 << i)) {
            const [a, b] = edgePairs[i];
            const va = cornerValues[a];
            const vb = cornerValues[b];
            const t = Math.abs(va - vb) > EPSILON
              ? (isoValue - va) / (vb - va)
              : 0.5;
            
            edgeVertices[i] = {
              x: lerp(cornerPositions[a].x, cornerPositions[b].x, t),
              y: lerp(cornerPositions[a].y, cornerPositions[b].y, t),
              z: lerp(cornerPositions[a].z, cornerPositions[b].z, t),
            };
          }
        }
        
        // Generate triangles (simplified - uses basic triangulation)
        // In production, use full marching cubes triangle table
        const cellCenter = {
          x: bounds.min.x + (x + 0.5) * cellSize.x,
          y: bounds.min.y + (y + 0.5) * cellSize.y,
          z: bounds.min.z + (z + 0.5) * cellSize.z,
        };
        
        // Get average material at cell center
        const centerIdx = Math.floor(x + 0.5) + 
                         Math.floor(y + 0.5) * rx + 
                         Math.floor(z + 0.5) * rx * ry;
        
        const blendedColor: [number, number, number] = [0, 0, 0];
        for (let m = 0; m < data.length; m++) {
          const conc = data[m][centerIdx] ?? 0;
          const spec = materialSpecs[m];
          if (spec) {
            blendedColor[0] += conc * spec.color[0];
            blendedColor[1] += conc * spec.color[1];
            blendedColor[2] += conc * spec.color[2];
          }
        }
        
        // Add triangles for this cell
        const validEdges = edgeVertices
          .map((v, i) => v ? i : -1)
          .filter((i) => i >= 0);
        
        if (validEdges.length >= 3) {
          // Simple fan triangulation from first vertex
          const baseIdx = positions.length / 3;
          
          for (const edgeIdx of validEdges) {
            const v = edgeVertices[edgeIdx]!;
            positions.push(v.x, v.y, v.z);
            normals.push(0, 1, 0); // Placeholder - compute proper normals
            uvs.push(0, 0);
            colors.push(blendedColor[0], blendedColor[1], blendedColor[2]);
          }
          
          // Create triangles
          for (let i = 1; i < validEdges.length - 1; i++) {
            indices.push(baseIdx, baseIdx + i, baseIdx + i + 1);
          }
        }
      }
    }
  }
  
  // Compute proper normals
  computeNormals(positions, indices, normals);
  
  return {
    positions,
    normals,
    uvs,
    indices,
  };
};

/**
 * Compute vertex normals from face normals
 */
const computeNormals = (
  positions: number[],
  indices: number[],
  normals: number[]
): void => {
  // Reset normals
  for (let i = 0; i < normals.length; i++) {
    normals[i] = 0;
  }
  
  // Accumulate face normals
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;
    
    const v0 = { x: positions[i0], y: positions[i0 + 1], z: positions[i0 + 2] };
    const v1 = { x: positions[i1], y: positions[i1 + 1], z: positions[i1 + 2] };
    const v2 = { x: positions[i2], y: positions[i2 + 1], z: positions[i2 + 2] };
    
    const e1 = sub3(v1, v0);
    const e2 = sub3(v2, v0);
    const n = normalize3({
      x: e1.y * e2.z - e1.z * e2.y,
      y: e1.z * e2.x - e1.x * e2.z,
      z: e1.x * e2.y - e1.y * e2.x,
    });
    
    normals[i0] += n.x;
    normals[i0 + 1] += n.y;
    normals[i0 + 2] += n.z;
    normals[i1] += n.x;
    normals[i1 + 1] += n.y;
    normals[i1 + 2] += n.z;
    normals[i2] += n.x;
    normals[i2 + 1] += n.y;
    normals[i2 + 2] += n.z;
  }
  
  // Normalize
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.sqrt(
      normals[i] * normals[i] +
      normals[i + 1] * normals[i + 1] +
      normals[i + 2] * normals[i + 2]
    );
    if (len > EPSILON) {
      normals[i] /= len;
      normals[i + 1] /= len;
      normals[i + 2] /= len;
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SEEDED RANDOM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a seeded random number generator (xorshift128+)
 */
const createSeededRandom = (seed: number): () => number => {
  let s0 = seed >>> 0;
  let s1 = (seed * 1103515245 + 12345) >>> 0;
  
  if (s0 === 0) s0 = 1;
  if (s1 === 0) s1 = 1;
  
  return () => {
    let x = s0;
    const y = s1;
    s0 = y;
    x ^= x << 23;
    x ^= x >>> 17;
    x ^= y ^ (y >>> 26);
    s1 = x;
    return (s0 + s1) / 4294967296;
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SIMULATION DRIVER
// ═══════════════════════════════════════════════════════════════════════════

export type SimulationConfig = {
  particleCount: number;
  iterations: number;
  fieldResolution: number;
  isoValue: number;
  convergenceTolerance: number;
  blendStrength: number;
  seed: number;
};

export type SimulationResult = {
  particles: Particle[];
  field: VoxelField;
  mesh: RenderMesh;
  history: Array<{ iteration: number; energy: number; energyByGoal: Record<string, number> }>;
  bestState: { particles: Particle[]; energy: number; iteration: number } | null;
  finalEnergy: number;
  iterationsUsed: number;
};

/**
 * Run the full chemistry solver simulation
 */
export const runSimulation = (
  bounds: { min: Vec3; max: Vec3 },
  materialSpecs: MaterialSpec[],
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
  config: SimulationConfig
): SimulationResult => {
  const materialCount = materialSpecs.length;
  
  // Compute domain properties
  const size = sub3(bounds.max, bounds.min);
  const maxDimension = Math.max(size.x, size.y, size.z);
  const particleRadius = maxDimension / Math.cbrt(config.particleCount) * 0.4;
  const smoothingRadius = particleRadius * 2.5;
  
  const domainCenter = {
    x: (bounds.min.x + bounds.max.x) * 0.5,
    y: (bounds.min.y + bounds.max.y) * 0.5,
    z: (bounds.min.z + bounds.max.z) * 0.5,
  };
  
  // Initialize particles
  const particles = initializeParticles(
    config.particleCount,
    materialCount,
    bounds,
    particleRadius,
    config.seed
  );
  
  // Apply seed concentrations
  seedParticles(particles, seeds, materialCount);
  
  // Simulation loop
  const history: SimulationResult["history"] = [];
  let bestState: SimulationResult["bestState"] = null;
  let bestEnergy = Infinity;
  let previousEnergy = Infinity;
  let iterationsUsed = 0;
  
  const dt = 0.1; // Time step
  const historyStride = Math.max(1, Math.floor(config.iterations / 100));
  
  for (let iter = 0; iter < config.iterations; iter++) {
    // Build spatial hash
    const hash = createSpatialHash(particles, smoothingRadius, bounds);
    
    // Compute densities
    computeDensities(particles, hash, smoothingRadius);
    
    // Apply goal forces
    applyGoalForces(
      particles,
      goals,
      materialSpecs,
      domainCenter,
      dt
    );
    
    // Diffuse materials (blend)
    const blendGoal = goals.find((g) => g.type === "blend");
    const blendWeight = blendGoal?.weight ?? 0;
    if (blendWeight > EPSILON) {
      diffuseMaterials(
        particles,
        hash,
        smoothingRadius,
        config.blendStrength * blendWeight,
        materialSpecs,
        dt
      );
    }
    
    // Compute energy
    const energy = computeSystemEnergy(
      particles,
      goals,
      materialSpecs,
      hash,
      smoothingRadius
    );
    
    // Record history
    if (iter % historyStride === 0 || iter === config.iterations - 1) {
      history.push({
        iteration: iter,
        energy: energy.total,
        energyByGoal: energy.byGoal,
      });
    }
    
    // Track best state
    if (energy.total < bestEnergy) {
      bestEnergy = energy.total;
      bestState = {
        particles: particles.map((p) => ({
          ...p,
          materials: new Float32Array(p.materials),
        })),
        energy: energy.total,
        iteration: iter,
      };
    }
    
    iterationsUsed = iter + 1;
    
    // Check convergence
    if (
      iter > 4 &&
      Math.abs(previousEnergy - energy.total) < config.convergenceTolerance
    ) {
      break;
    }
    previousEnergy = energy.total;
  }
  
  // Generate voxel field
  const field = generateVoxelField(
    particles,
    materialCount,
    bounds,
    config.fieldResolution,
    smoothingRadius
  );
  
  // Generate mesh
  const mesh = generateMeshFromField(field, config.isoValue, materialSpecs);
  
  return {
    particles,
    field,
    mesh,
    history,
    bestState,
    finalEnergy: history.length > 0 ? history[history.length - 1].energy : 0,
    iterationsUsed,
  };
};
