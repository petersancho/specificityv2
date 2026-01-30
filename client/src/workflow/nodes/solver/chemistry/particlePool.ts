/**
 * High-Performance Particle Pool
 * 
 * Uses Structure of Arrays (SoA) layout for cache-efficient access
 * and SIMD-friendly operations. All particle data is stored in
 * contiguous TypedArrays for maximum performance.
 */

import type { Vec3 } from "../../../../types";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ParticlePoolConfig = {
  capacity: number;
  materialCount: number;
};

export type ParticlePool = {
  capacity: number;
  count: number;
  materialCount: number;
  
  // Position (x, y, z)
  posX: Float32Array;
  posY: Float32Array;
  posZ: Float32Array;
  
  // Velocity (x, y, z)
  velX: Float32Array;
  velY: Float32Array;
  velZ: Float32Array;
  
  // Per-particle scalars
  radius: Float32Array;
  mass: Float32Array;
  pressure: Float32Array;
  temperature: Float32Array;
  
  // Material concentrations (materialCount arrays of length capacity)
  materials: Float32Array[];
  
  // Temporary storage for computations (reused to avoid allocation)
  tempDeltas: Float32Array[];
  neighborCache: Int32Array;
  neighborCounts: Int32Array;
};

// ═══════════════════════════════════════════════════════════════════════════
// POOL CREATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a particle pool with pre-allocated memory
 */
export const createParticlePool = (config: ParticlePoolConfig): ParticlePool => {
  const { capacity, materialCount } = config;
  
  // Pre-allocate all arrays
  const posX = new Float32Array(capacity);
  const posY = new Float32Array(capacity);
  const posZ = new Float32Array(capacity);
  const velX = new Float32Array(capacity);
  const velY = new Float32Array(capacity);
  const velZ = new Float32Array(capacity);
  const radius = new Float32Array(capacity);
  const mass = new Float32Array(capacity);
  const pressure = new Float32Array(capacity);
  const temperature = new Float32Array(capacity);
  
  const materials: Float32Array[] = [];
  const tempDeltas: Float32Array[] = [];
  for (let m = 0; m < materialCount; m++) {
    materials.push(new Float32Array(capacity));
    tempDeltas.push(new Float32Array(capacity));
  }
  
  // Neighbor cache - assuming max ~64 neighbors per particle
  const maxNeighbors = 64;
  const neighborCache = new Int32Array(capacity * maxNeighbors);
  const neighborCounts = new Int32Array(capacity);
  
  return {
    capacity,
    count: 0,
    materialCount,
    posX,
    posY,
    posZ,
    velX,
    velY,
    velZ,
    radius,
    mass,
    pressure,
    temperature,
    materials,
    tempDeltas,
    neighborCache,
    neighborCounts,
  };
};

/**
 * Initialize pool with random particles
 */
export const initializePool = (
  pool: ParticlePool,
  count: number,
  bounds: { min: Vec3; max: Vec3 },
  particleRadius: number,
  baseMass: number,
  random: () => number
): void => {
  pool.count = Math.min(count, pool.capacity);
  
  const sizeX = bounds.max.x - bounds.min.x;
  const sizeY = bounds.max.y - bounds.min.y;
  const sizeZ = bounds.max.z - bounds.min.z;
  
  const uniformConc = 1 / pool.materialCount;
  
  for (let i = 0; i < pool.count; i++) {
    pool.posX[i] = bounds.min.x + random() * sizeX;
    pool.posY[i] = bounds.min.y + random() * sizeY;
    pool.posZ[i] = bounds.min.z + random() * sizeZ;
    pool.velX[i] = 0;
    pool.velY[i] = 0;
    pool.velZ[i] = 0;
    pool.radius[i] = particleRadius;
    pool.mass[i] = baseMass;
    pool.pressure[i] = 0;
    pool.temperature[i] = 293;
    
    // Initialize with uniform material distribution
    for (let m = 0; m < pool.materialCount; m++) {
      pool.materials[m][i] = uniformConc;
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SPATIAL HASHING (Optimized)
// ═══════════════════════════════════════════════════════════════════════════

export type OptimizedSpatialHash = {
  cellSize: number;
  invCellSize: number;
  tableSize: number;
  table: Int32Array; // Hash table storing first particle index per cell
  next: Int32Array;  // Linked list of particles per cell
};

/**
 * Create an optimized spatial hash using a fixed-size hash table
 * with linked lists for collision resolution
 */
export const createOptimizedSpatialHash = (
  pool: ParticlePool,
  cellSize: number
): OptimizedSpatialHash => {
  // Use a power-of-two table size for fast modulo
  const tableSize = Math.max(1024, nextPowerOfTwo(pool.count * 2));
  const tableMask = tableSize - 1;
  
  const table = new Int32Array(tableSize).fill(-1);
  const next = new Int32Array(pool.count).fill(-1);
  const invCellSize = 1 / cellSize;
  
  // Build hash table
  for (let i = 0; i < pool.count; i++) {
    const cx = Math.floor(pool.posX[i] * invCellSize) | 0;
    const cy = Math.floor(pool.posY[i] * invCellSize) | 0;
    const cz = Math.floor(pool.posZ[i] * invCellSize) | 0;
    
    // Use a simple spatial hash function
    const hash = ((cx * 73856093) ^ (cy * 19349663) ^ (cz * 83492791)) & tableMask;
    
    // Insert at head of linked list
    next[i] = table[hash];
    table[hash] = i;
  }
  
  return { cellSize, invCellSize, tableSize, table, next };
};

const nextPowerOfTwo = (n: number): number => {
  n--;
  n |= n >> 1;
  n |= n >> 2;
  n |= n >> 4;
  n |= n >> 8;
  n |= n >> 16;
  return n + 1;
};

/**
 * Find neighbors for all particles using the spatial hash
 */
export const findAllNeighbors = (
  pool: ParticlePool,
  hash: OptimizedSpatialHash,
  radius: number
): void => {
  const radiusSq = radius * radius;
  const cellRadius = Math.ceil(radius * hash.invCellSize);
  const tableMask = hash.tableSize - 1;
  const maxNeighbors = 64;
  
  // Clear neighbor counts
  pool.neighborCounts.fill(0);
  
  for (let i = 0; i < pool.count; i++) {
    const px = pool.posX[i];
    const py = pool.posY[i];
    const pz = pool.posZ[i];
    
    const cx = Math.floor(px * hash.invCellSize) | 0;
    const cy = Math.floor(py * hash.invCellSize) | 0;
    const cz = Math.floor(pz * hash.invCellSize) | 0;
    
    let neighborCount = 0;
    const neighborOffset = i * maxNeighbors;
    
    // Check neighboring cells
    for (let dx = -cellRadius; dx <= cellRadius && neighborCount < maxNeighbors; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius && neighborCount < maxNeighbors; dy++) {
        for (let dz = -cellRadius; dz <= cellRadius && neighborCount < maxNeighbors; dz++) {
          const ncx = cx + dx;
          const ncy = cy + dy;
          const ncz = cz + dz;
          const nhash = ((ncx * 73856093) ^ (ncy * 19349663) ^ (ncz * 83492791)) & tableMask;
          
          // Traverse linked list
          let j = hash.table[nhash];
          while (j >= 0 && neighborCount < maxNeighbors) {
            // Distance check
            const dx2 = pool.posX[j] - px;
            const dy2 = pool.posY[j] - py;
            const dz2 = pool.posZ[j] - pz;
            const distSq = dx2 * dx2 + dy2 * dy2 + dz2 * dz2;
            
            if (distSq <= radiusSq) {
              pool.neighborCache[neighborOffset + neighborCount] = j;
              neighborCount++;
            }
            
            j = hash.next[j];
          }
        }
      }
    }
    
    pool.neighborCounts[i] = neighborCount;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// BATCHED OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

const EPSILON = 1e-10;
const PI = Math.PI;
const POLY6_FACTOR = 315 / (64 * PI);
const VISCOSITY_FACTOR = 45 / PI;

/**
 * Compute densities for all particles (vectorized)
 */
export const computeDensitiesBatched = (
  pool: ParticlePool,
  smoothingRadius: number
): void => {
  const h = smoothingRadius;
  const h2 = h * h;
  const h9 = h2 * h2 * h2 * h2 * h;
  const kernelFactor = POLY6_FACTOR / h9;
  const maxNeighbors = 64;
  
  for (let i = 0; i < pool.count; i++) {
    const neighborCount = pool.neighborCounts[i];
    const neighborOffset = i * maxNeighbors;
    
    let density = 0;
    for (let n = 0; n < neighborCount; n++) {
      const j = pool.neighborCache[neighborOffset + n];
      
      const dx = pool.posX[i] - pool.posX[j];
      const dy = pool.posY[i] - pool.posY[j];
      const dz = pool.posZ[i] - pool.posZ[j];
      const r2 = dx * dx + dy * dy + dz * dz;
      
      if (r2 < h2) {
        const diff = h2 - r2;
        density += pool.mass[j] * kernelFactor * diff * diff * diff;
      }
    }
    
    pool.pressure[i] = density;
  }
};

/**
 * Apply material diffusion for all particles (vectorized)
 */
export const diffuseMaterialsBatched = (
  pool: ParticlePool,
  smoothingRadius: number,
  diffusionRates: Float32Array,
  blendStrength: number,
  dt: number
): void => {
  const h = smoothingRadius;
  const h6 = h * h * h * h * h * h;
  const kernelFactor = VISCOSITY_FACTOR / h6;
  const maxNeighbors = 64;
  const materialCount = pool.materialCount;
  
  // Clear temp deltas
  for (let m = 0; m < materialCount; m++) {
    pool.tempDeltas[m].fill(0);
  }
  
  // Compute diffusion deltas
  for (let i = 0; i < pool.count; i++) {
    const neighborCount = pool.neighborCounts[i];
    const neighborOffset = i * maxNeighbors;
    
    for (let n = 0; n < neighborCount; n++) {
      const j = pool.neighborCache[neighborOffset + n];
      if (j === i) continue;
      
      const dx = pool.posX[j] - pool.posX[i];
      const dy = pool.posY[j] - pool.posY[i];
      const dz = pool.posZ[j] - pool.posZ[i];
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (r < EPSILON || r >= h) continue;
      
      const kernel = kernelFactor * (h - r);
      
      for (let m = 0; m < materialCount; m++) {
        const concDiff = pool.materials[m][j] - pool.materials[m][i];
        const avgDiffusivity = (diffusionRates[m] + diffusionRates[m]) * 0.5;
        pool.tempDeltas[m][i] += pool.mass[j] * concDiff * kernel * avgDiffusivity;
      }
    }
  }
  
  // Apply deltas
  const factor = blendStrength * dt;
  for (let i = 0; i < pool.count; i++) {
    let sum = 0;
    for (let m = 0; m < materialCount; m++) {
      pool.materials[m][i] += pool.tempDeltas[m][i] * factor;
      pool.materials[m][i] = Math.max(0, pool.materials[m][i]);
      sum += pool.materials[m][i];
    }
    
    // Normalize
    if (sum > EPSILON) {
      const invSum = 1 / sum;
      for (let m = 0; m < materialCount; m++) {
        pool.materials[m][i] *= invSum;
      }
    } else {
      const uniform = 1 / materialCount;
      for (let m = 0; m < materialCount; m++) {
        pool.materials[m][i] = uniform;
      }
    }
  }
};

/**
 * Apply goal forces for all particles (vectorized)
 */
export const applyGoalForcesBatched = (
  pool: ParticlePool,
  goals: Array<{
    type: "stiffness" | "mass" | "transparency" | "thermal";
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
  const materialCount = pool.materialCount;
  
  // Clear temp deltas
  for (let m = 0; m < materialCount; m++) {
    pool.tempDeltas[m].fill(0);
  }
  
  for (let i = 0; i < pool.count; i++) {
    const px = pool.posX[i];
    const py = pool.posY[i];
    const pz = pool.posZ[i];
    
    for (const goal of goals) {
      // Region check
      if (goal.region) {
        if (px < goal.region.min.x || px > goal.region.max.x ||
            py < goal.region.min.y || py > goal.region.max.y ||
            pz < goal.region.min.z || pz > goal.region.max.z) {
          continue;
        }
      }
      
      const weight = goal.weight;
      if (weight < EPSILON) continue;
      
      switch (goal.type) {
        case "stiffness": {
          const loadX = ((goal.parameters.loadVector as Vec3)?.x ?? 0);
          const loadY = ((goal.parameters.loadVector as Vec3)?.y ?? -1);
          const loadZ = ((goal.parameters.loadVector as Vec3)?.z ?? 0);
          const loadLen = Math.sqrt(loadX * loadX + loadY * loadY + loadZ * loadZ);
          const normLoadX = loadLen > EPSILON ? loadX / loadLen : 0;
          const normLoadY = loadLen > EPSILON ? loadY / loadLen : -1;
          const normLoadZ = loadLen > EPSILON ? loadZ / loadLen : 0;
          
          const penalty = (goal.parameters.structuralPenalty as number) ?? 1;
          
          const relX = px - domainCenter.x;
          const relY = py - domainCenter.y;
          const relZ = pz - domainCenter.z;
          const relLen = Math.sqrt(relX * relX + relY * relY + relZ * relZ);
          
          const align = relLen > EPSILON
            ? ((relX * normLoadX + relY * normLoadY + relZ * normLoadZ) / relLen + 1) * 0.5
            : 0.5;
          
          for (let m = 0; m < materialCount; m++) {
            const stiffnessRatio = materialProps.stiffness[m] / maxProps.stiffness;
            pool.tempDeltas[m][i] += weight * penalty * align * stiffnessRatio * dt;
          }
          break;
        }
        
        case "mass": {
          const target = (goal.parameters.targetMassFraction as number) ?? 0.6;
          const densityPenalty = (goal.parameters.densityPenalty as number) ?? 1;
          const scale = (1 - target) * densityPenalty;
          
          for (let m = 0; m < materialCount; m++) {
            const densityRatio = materialProps.density[m] / maxProps.density;
            pool.tempDeltas[m][i] -= weight * scale * densityRatio * dt;
          }
          break;
        }
        
        case "transparency": {
          const opticalWeight = (goal.parameters.opticalWeight as number) ?? 1;
          
          for (let m = 0; m < materialCount; m++) {
            const opticalRatio = materialProps.optical[m] / maxProps.optical;
            pool.tempDeltas[m][i] += weight * opticalWeight * opticalRatio * dt;
          }
          break;
        }
        
        case "thermal": {
          const mode = (goal.parameters.mode as string) ?? "conduct";
          const thermalWeight = (goal.parameters.thermalWeight as number) ?? 1;
          
          for (let m = 0; m < materialCount; m++) {
            const thermalRatio = materialProps.thermal[m] / maxProps.thermal;
            const bias = mode === "insulate" ? 1 - thermalRatio : thermalRatio;
            pool.tempDeltas[m][i] += weight * thermalWeight * bias * dt;
          }
          break;
        }
      }
    }
  }
  
  // Apply deltas and normalize
  for (let i = 0; i < pool.count; i++) {
    let sum = 0;
    for (let m = 0; m < materialCount; m++) {
      pool.materials[m][i] = Math.max(0, pool.materials[m][i] + pool.tempDeltas[m][i]);
      sum += pool.materials[m][i];
    }
    
    if (sum > EPSILON) {
      const invSum = 1 / sum;
      for (let m = 0; m < materialCount; m++) {
        pool.materials[m][i] *= invSum;
      }
    } else {
      const uniform = 1 / materialCount;
      for (let m = 0; m < materialCount; m++) {
        pool.materials[m][i] = uniform;
      }
    }
  }
};

/**
 * Compute system energy (vectorized)
 */
export const computeSystemEnergyBatched = (
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
  const byGoal: Record<string, number> = {
    stiffness: 0,
    mass: 0,
    transparency: 0,
    thermal: 0,
    blend: 0,
  };
  
  const materialCount = pool.materialCount;
  const maxNeighbors = 64;
  
  for (let i = 0; i < pool.count; i++) {
    const px = pool.posX[i];
    const py = pool.posY[i];
    const pz = pool.posZ[i];
    
    // Compute weighted material properties
    let stiffnessValue = 0;
    let densityValue = 0;
    let thermalValue = 0;
    let opticalValue = 0;
    
    for (let m = 0; m < materialCount; m++) {
      const conc = pool.materials[m][i];
      stiffnessValue += conc * (materialProps.stiffness[m] / maxProps.stiffness);
      densityValue += conc * (materialProps.density[m] / maxProps.density);
      thermalValue += conc * (materialProps.thermal[m] / maxProps.thermal);
      opticalValue += conc * (materialProps.optical[m] / maxProps.optical);
    }
    
    for (const goal of goals) {
      if (goal.weight < EPSILON) continue;
      
      if (goal.region) {
        if (px < goal.region.min.x || px > goal.region.max.x ||
            py < goal.region.min.y || py > goal.region.max.y ||
            pz < goal.region.min.z || pz > goal.region.max.z) {
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
        case "blend": {
          // Compute local material variation
          const neighborCount = pool.neighborCounts[i];
          const neighborOffset = i * maxNeighbors;
          
          if (neighborCount > 1) {
            let blendEnergy = 0;
            for (let n = 0; n < neighborCount; n++) {
              const j = pool.neighborCache[neighborOffset + n];
              if (j === i) continue;
              for (let m = 0; m < materialCount; m++) {
                blendEnergy += Math.abs(pool.materials[m][i] - pool.materials[m][j]);
              }
            }
            blendEnergy /= (neighborCount - 1) * materialCount;
            byGoal.blend += blendEnergy * goal.weight;
          }
          break;
        }
      }
    }
  }
  
  const total = Object.values(byGoal).reduce((sum, v) => sum + v, 0);
  return { total, byGoal };
};

// ═══════════════════════════════════════════════════════════════════════════
// SEED APPLICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply seed concentrations to particles
 */
export const applySeedsToPool = (
  pool: ParticlePool,
  seeds: Array<{
    position: Vec3;
    radius: number;
    materialIndex: number;
    strength: number;
  }>
): void => {
  for (const seed of seeds) {
    const radiusSq = seed.radius * seed.radius;
    
    for (let i = 0; i < pool.count; i++) {
      const dx = pool.posX[i] - seed.position.x;
      const dy = pool.posY[i] - seed.position.y;
      const dz = pool.posZ[i] - seed.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      
      if (distSq <= radiusSq) {
        const dist = Math.sqrt(distSq);
        const t = 1 - (dist / seed.radius);
        const influence = t * t * seed.strength;
        
        pool.materials[seed.materialIndex][i] = Math.min(
          1,
          pool.materials[seed.materialIndex][i] + influence
        );
        
        // Normalize
        let sum = 0;
        for (let m = 0; m < pool.materialCount; m++) {
          sum += pool.materials[m][i];
        }
        if (sum > EPSILON) {
          const invSum = 1 / sum;
          for (let m = 0; m < pool.materialCount; m++) {
            pool.materials[m][i] *= invSum;
          }
        }
      }
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// VOXEL FIELD GENERATION (Optimized)
// ═══════════════════════════════════════════════════════════════════════════

export type OptimizedVoxelField = {
  resolution: number;
  bounds: { min: Vec3; max: Vec3 };
  cellSize: Vec3;
  data: Float32Array[]; // One per material
  densities: Float32Array;
};

/**
 * Generate voxel field from particle pool using optimized sampling
 */
export const generateVoxelFieldFromPool = (
  pool: ParticlePool,
  bounds: { min: Vec3; max: Vec3 },
  resolution: number,
  smoothingRadius: number
): OptimizedVoxelField => {
  const size = {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z,
  };
  const cellSize = {
    x: size.x / resolution,
    y: size.y / resolution,
    z: size.z / resolution,
  };
  
  const totalCells = resolution * resolution * resolution;
  const materialCount = pool.materialCount;
  
  const data: Float32Array[] = [];
  for (let m = 0; m < materialCount; m++) {
    data.push(new Float32Array(totalCells));
  }
  const densities = new Float32Array(totalCells);
  
  // Build spatial hash for efficient queries
  const hash = createOptimizedSpatialHash(pool, smoothingRadius);
  
  const h = smoothingRadius;
  const h2 = h * h;
  const h9 = h2 * h2 * h2 * h2 * h;
  const kernelFactor = POLY6_FACTOR / h9;
  
  // Sample field at each voxel center
  for (let z = 0; z < resolution; z++) {
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const idx = x + y * resolution + z * resolution * resolution;
        
        const sampleX = bounds.min.x + (x + 0.5) * cellSize.x;
        const sampleY = bounds.min.y + (y + 0.5) * cellSize.y;
        const sampleZ = bounds.min.z + (z + 0.5) * cellSize.z;
        
        // Find neighboring particles
        const cx = Math.floor(sampleX * hash.invCellSize) | 0;
        const cy = Math.floor(sampleY * hash.invCellSize) | 0;
        const cz = Math.floor(sampleZ * hash.invCellSize) | 0;
        const cellRadius = Math.ceil(h * hash.invCellSize);
        const tableMask = hash.tableSize - 1;
        
        let totalWeight = 0;
        const materialWeights = new Float32Array(materialCount);
        
        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
          for (let dy = -cellRadius; dy <= cellRadius; dy++) {
            for (let dz = -cellRadius; dz <= cellRadius; dz++) {
              const ncx = cx + dx;
              const ncy = cy + dy;
              const ncz = cz + dz;
              const nhash = ((ncx * 73856093) ^ (ncy * 19349663) ^ (ncz * 83492791)) & tableMask;
              
              let i = hash.table[nhash];
              while (i >= 0) {
                const pdx = sampleX - pool.posX[i];
                const pdy = sampleY - pool.posY[i];
                const pdz = sampleZ - pool.posZ[i];
                const r2 = pdx * pdx + pdy * pdy + pdz * pdz;
                
                if (r2 < h2) {
                  const diff = h2 - r2;
                  const weight = pool.mass[i] * kernelFactor * diff * diff * diff;
                  
                  totalWeight += weight;
                  for (let m = 0; m < materialCount; m++) {
                    materialWeights[m] += weight * pool.materials[m][i];
                  }
                }
                
                i = hash.next[i];
              }
            }
          }
        }
        
        if (totalWeight > EPSILON) {
          densities[idx] = totalWeight;
          const invWeight = 1 / totalWeight;
          for (let m = 0; m < materialCount; m++) {
            data[m][idx] = materialWeights[m] * invWeight;
          }
        }
      }
    }
  }
  
  return {
    resolution,
    bounds,
    cellSize,
    data,
    densities,
  };
};
