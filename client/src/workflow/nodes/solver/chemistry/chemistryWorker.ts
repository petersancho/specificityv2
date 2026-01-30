/**
 * Chemistry Solver Web Worker
 * 
 * Runs the particle simulation in a separate thread to prevent
 * blocking the main UI thread. Communicates results via postMessage.
 */

import type { Vec3, RenderMesh } from "../../../../types";
import type { MaterialSpec, Particle, VoxelField, SimulationResult } from "./particleSystem";

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ChemistryWorkerMessage =
  | { type: "start"; payload: ChemistryWorkerStartPayload }
  | { type: "cancel" };

export type ChemistryWorkerResponse =
  | { type: "progress"; payload: { iteration: number; energy: number; percent: number } }
  | { type: "complete"; payload: ChemistryWorkerResultPayload }
  | { type: "error"; payload: { message: string } };

export type ChemistryWorkerStartPayload = {
  bounds: { min: Vec3; max: Vec3 };
  materialSpecs: MaterialSpec[];
  seeds: Array<{
    position: Vec3;
    radius: number;
    materialIndex: number;
    strength: number;
  }>;
  goals: Array<{
    type: "stiffness" | "mass" | "transparency" | "thermal" | "blend";
    weight: number;
    parameters: Record<string, unknown>;
    region?: { min: Vec3; max: Vec3 };
  }>;
  config: {
    particleCount: number;
    iterations: number;
    fieldResolution: number;
    isoValue: number;
    convergenceTolerance: number;
    blendStrength: number;
    seed: number;
  };
};

export type ChemistryWorkerResultPayload = {
  mesh: RenderMesh;
  particles: Array<{
    id: number;
    position: Vec3;
    materials: number[];
  }>;
  field: {
    resolution: { x: number; y: number; z: number };
    bounds: { min: Vec3; max: Vec3 };
  };
  history: Array<{ iteration: number; energy: number; energyByGoal: Record<string, number> }>;
  finalEnergy: number;
  iterationsUsed: number;
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKER IMPLEMENTATION (Inline for bundler compatibility)
// ═══════════════════════════════════════════════════════════════════════════

// Note: The actual worker code is duplicated here since we can't import
// modules directly in workers without special bundler configuration.
// In a production setup, you would use a worker bundler plugin.

const EPSILON = 1e-10;
const PI = Math.PI;
const POLY6_FACTOR = 315 / (64 * PI);
const VISCOSITY_FACTOR = 45 / PI;

type WorkerParticle = {
  id: number;
  position: Vec3;
  velocity: Vec3;
  radius: number;
  mass: number;
  materials: Float32Array;
  temperature: number;
  pressure: number;
};

type WorkerSpatialHash = {
  cellSize: number;
  cells: Map<string, number[]>;
};

// Vector operations (inlined for worker)
const sub3 = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const length3 = (v: Vec3): number => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
const lengthSq3 = (v: Vec3): number => v.x * v.x + v.y * v.y + v.z * v.z;
const normalize3 = (v: Vec3): Vec3 => {
  const len = length3(v);
  return len < EPSILON ? { x: 0, y: 0, z: 0 } : { x: v.x / len, y: v.y / len, z: v.z / len };
};
const dot3 = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// Kernel functions
const poly6Kernel = (r: number, h: number): number => {
  if (r >= h) return 0;
  const h2 = h * h;
  const h9 = h2 * h2 * h2 * h2 * h;
  const diff = h2 - r * r;
  return (POLY6_FACTOR / h9) * diff * diff * diff;
};

const viscosityKernelLaplacian = (r: number, h: number): number => {
  if (r >= h) return 0;
  const h6 = h * h * h * h * h * h;
  return (VISCOSITY_FACTOR / h6) * (h - r);
};

// Spatial hashing
const createWorkerSpatialHash = (
  particles: WorkerParticle[],
  cellSize: number
): WorkerSpatialHash => {
  const cells = new Map<string, number[]>();
  particles.forEach((particle, index) => {
    const key = `${Math.floor(particle.position.x / cellSize)},${Math.floor(particle.position.y / cellSize)},${Math.floor(particle.position.z / cellSize)}`;
    const cell = cells.get(key);
    if (cell) cell.push(index);
    else cells.set(key, [index]);
  });
  return { cellSize, cells };
};

const getWorkerNeighbors = (
  position: Vec3,
  radius: number,
  particles: WorkerParticle[],
  hash: WorkerSpatialHash
): number[] => {
  const neighbors: number[] = [];
  const radiusSq = radius * radius;
  const cellRadius = Math.ceil(radius / hash.cellSize);
  const cx = Math.floor(position.x / hash.cellSize);
  const cy = Math.floor(position.y / hash.cellSize);
  const cz = Math.floor(position.z / hash.cellSize);

  for (let dx = -cellRadius; dx <= cellRadius; dx++) {
    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        const key = `${cx + dx},${cy + dy},${cz + dz}`;
        const cell = hash.cells.get(key);
        if (!cell) continue;
        for (const idx of cell) {
          if (lengthSq3(sub3(particles[idx].position, position)) <= radiusSq) {
            neighbors.push(idx);
          }
        }
      }
    }
  }
  return neighbors;
};

// Seeded random
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

// Material normalization
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
    const uniform = 1 / materials.length;
    for (let i = 0; i < materials.length; i++) {
      materials[i] = uniform;
    }
  }
};

// Worker message handler
let cancelled = false;

const runWorkerSimulation = (payload: ChemistryWorkerStartPayload): void => {
  cancelled = false;
  
  try {
    const { bounds, materialSpecs, seeds, goals, config } = payload;
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
    const random = createSeededRandom(config.seed);
    const particles: WorkerParticle[] = [];
    const baseMass = (size.x * size.y * size.z) / config.particleCount;
    
    for (let i = 0; i < config.particleCount; i++) {
      const materials = new Float32Array(materialCount);
      const uniform = 1 / materialCount;
      for (let m = 0; m < materialCount; m++) materials[m] = uniform;
      
      particles.push({
        id: i,
        position: {
          x: bounds.min.x + random() * size.x,
          y: bounds.min.y + random() * size.y,
          z: bounds.min.z + random() * size.z,
        },
        velocity: { x: 0, y: 0, z: 0 },
        radius: particleRadius,
        mass: baseMass,
        materials,
        temperature: 293,
        pressure: 0,
      });
    }
    
    // Apply seeds
    for (const seed of seeds) {
      for (const particle of particles) {
        const distance = length3(sub3(particle.position, seed.position));
        if (distance <= seed.radius) {
          const t = 1 - (distance / seed.radius);
          const influence = t * t * seed.strength;
          particle.materials[seed.materialIndex] = Math.min(1, particle.materials[seed.materialIndex] + influence);
          normalizeMaterials(particle.materials);
        }
      }
    }
    
    // Precompute normalized material properties
    const maxStiffness = Math.max(...materialSpecs.map((s) => s.stiffness), 1);
    const maxDensity = Math.max(...materialSpecs.map((s) => s.density), 1);
    const maxThermal = Math.max(...materialSpecs.map((s) => s.thermalConductivity), 1);
    const maxOptical = Math.max(...materialSpecs.map((s) => s.opticalTransmission), 1);
    
    // Simulation loop
    const history: Array<{ iteration: number; energy: number; energyByGoal: Record<string, number> }> = [];
    let bestEnergy = Infinity;
    let previousEnergy = Infinity;
    let iterationsUsed = 0;
    const dt = 0.1;
    const historyStride = Math.max(1, Math.floor(config.iterations / 100));
    const progressStride = Math.max(1, Math.floor(config.iterations / 50));
    
    for (let iter = 0; iter < config.iterations; iter++) {
      if (cancelled) return;
      
      const hash = createWorkerSpatialHash(particles, smoothingRadius);
      
      // Compute densities
      for (const particle of particles) {
        const neighbors = getWorkerNeighbors(particle.position, smoothingRadius, particles, hash);
        let density = 0;
        for (const idx of neighbors) {
          const r = length3(sub3(particle.position, particles[idx].position));
          density += particles[idx].mass * poly6Kernel(r, smoothingRadius);
        }
        particle.pressure = density;
      }
      
      // Apply goal forces
      for (const particle of particles) {
        const deltas = new Float32Array(materialCount);
        
        for (const goal of goals) {
          if (goal.region) {
            const p = particle.position;
            if (p.x < goal.region.min.x || p.x > goal.region.max.x ||
                p.y < goal.region.min.y || p.y > goal.region.max.y ||
                p.z < goal.region.min.z || p.z > goal.region.max.z) continue;
          }
          
          const weight = goal.weight;
          if (weight < EPSILON) continue;
          
          switch (goal.type) {
            case "stiffness": {
              const loadVector = (goal.parameters.loadVector as Vec3) ?? { x: 0, y: -1, z: 0 };
              const penalty = (goal.parameters.structuralPenalty as number) ?? 1;
              const relative = sub3(particle.position, domainCenter);
              const relLen = length3(relative);
              const align = relLen > EPSILON ? (dot3(normalize3(relative), normalize3(loadVector)) + 1) * 0.5 : 0.5;
              for (let m = 0; m < materialCount; m++) {
                deltas[m] += weight * penalty * align * (materialSpecs[m].stiffness / maxStiffness) * dt;
              }
              break;
            }
            case "mass": {
              const target = (goal.parameters.targetMassFraction as number) ?? 0.6;
              const densityPenalty = (goal.parameters.densityPenalty as number) ?? 1;
              const scale = (1 - target) * densityPenalty;
              for (let m = 0; m < materialCount; m++) {
                deltas[m] -= weight * scale * (materialSpecs[m].density / maxDensity) * dt;
              }
              break;
            }
            case "transparency": {
              const opticalWeight = (goal.parameters.opticalWeight as number) ?? 1;
              for (let m = 0; m < materialCount; m++) {
                deltas[m] += weight * opticalWeight * (materialSpecs[m].opticalTransmission / maxOptical) * dt;
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
          }
        }
        
        for (let m = 0; m < materialCount; m++) {
          particle.materials[m] = Math.max(0, particle.materials[m] + deltas[m]);
        }
        normalizeMaterials(particle.materials);
      }
      
      // Diffuse materials
      const blendGoal = goals.find((g) => g.type === "blend");
      const blendWeight = blendGoal?.weight ?? 0;
      if (blendWeight > EPSILON) {
        const updates: Float32Array[] = particles.map(() => new Float32Array(materialCount));
        
        for (let i = 0; i < particles.length; i++) {
          const particle = particles[i];
          const neighbors = getWorkerNeighbors(particle.position, smoothingRadius, particles, hash);
          
          for (let m = 0; m < materialCount; m++) {
            let diffusion = 0;
            for (const idx of neighbors) {
              if (idx === i) continue;
              const neighbor = particles[idx];
              const r = length3(sub3(neighbor.position, particle.position));
              if (r < EPSILON) continue;
              const concDiff = neighbor.materials[m] - particle.materials[m];
              const kernel = viscosityKernelLaplacian(r, smoothingRadius);
              diffusion += neighbor.mass * concDiff * kernel * materialSpecs[m].diffusivity;
            }
            updates[i][m] = particle.materials[m] + diffusion * config.blendStrength * blendWeight * dt;
          }
        }
        
        for (let i = 0; i < particles.length; i++) {
          for (let m = 0; m < materialCount; m++) {
            particles[i].materials[m] = updates[i][m];
          }
          normalizeMaterials(particles[i].materials);
        }
      }
      
      // Compute energy
      const energyByGoal: Record<string, number> = { stiffness: 0, mass: 0, transparency: 0, thermal: 0, blend: 0 };
      for (const particle of particles) {
        let stiffnessValue = 0, densityValue = 0, thermalValue = 0, opticalValue = 0;
        for (let m = 0; m < materialCount; m++) {
          const conc = particle.materials[m];
          stiffnessValue += conc * (materialSpecs[m].stiffness / maxStiffness);
          densityValue += conc * (materialSpecs[m].density / maxDensity);
          thermalValue += conc * (materialSpecs[m].thermalConductivity / maxThermal);
          opticalValue += conc * (materialSpecs[m].opticalTransmission / maxOptical);
        }
        
        for (const goal of goals) {
          if (goal.weight < EPSILON) continue;
          if (goal.region) {
            const p = particle.position;
            if (p.x < goal.region.min.x || p.x > goal.region.max.x ||
                p.y < goal.region.min.y || p.y > goal.region.max.y ||
                p.z < goal.region.min.z || p.z > goal.region.max.z) continue;
          }
          switch (goal.type) {
            case "stiffness": energyByGoal.stiffness += (1 - stiffnessValue) * goal.weight; break;
            case "mass": {
              const target = (goal.parameters.targetMassFraction as number) ?? 0.6;
              energyByGoal.mass += Math.abs(densityValue - target) * goal.weight;
              break;
            }
            case "transparency": energyByGoal.transparency += (1 - opticalValue) * goal.weight; break;
            case "thermal": {
              const mode = (goal.parameters.mode as string) ?? "conduct";
              energyByGoal.thermal += (mode === "insulate" ? thermalValue : 1 - thermalValue) * goal.weight;
              break;
            }
          }
        }
      }
      const totalEnergy = Object.values(energyByGoal).reduce((sum, v) => sum + v, 0);
      
      if (iter % historyStride === 0 || iter === config.iterations - 1) {
        history.push({ iteration: iter, energy: totalEnergy, energyByGoal });
      }
      
      if (totalEnergy < bestEnergy) {
        bestEnergy = totalEnergy;
      }
      
      iterationsUsed = iter + 1;
      
      // Send progress
      if (iter % progressStride === 0) {
        self.postMessage({
          type: "progress",
          payload: { iteration: iter, energy: totalEnergy, percent: (iter / config.iterations) * 100 },
        } satisfies ChemistryWorkerResponse);
      }
      
      if (iter > 4 && Math.abs(previousEnergy - totalEnergy) < config.convergenceTolerance) {
        break;
      }
      previousEnergy = totalEnergy;
    }
    
    // Generate voxel field
    const resolution = config.fieldResolution;
    const cellSize = { x: size.x / resolution, y: size.y / resolution, z: size.z / resolution };
    const totalCells = resolution * resolution * resolution;
    const fieldData: Float32Array[] = [];
    for (let m = 0; m < materialCount; m++) fieldData.push(new Float32Array(totalCells));
    const fieldDensities = new Float32Array(totalCells);
    
    const fieldHash = createWorkerSpatialHash(particles, smoothingRadius);
    for (let z = 0; z < resolution; z++) {
      for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
          const idx = x + y * resolution + z * resolution * resolution;
          const samplePos = {
            x: bounds.min.x + (x + 0.5) * cellSize.x,
            y: bounds.min.y + (y + 0.5) * cellSize.y,
            z: bounds.min.z + (z + 0.5) * cellSize.z,
          };
          
          const neighbors = getWorkerNeighbors(samplePos, smoothingRadius, particles, fieldHash);
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
            fieldDensities[idx] = totalWeight;
            for (let m = 0; m < materialCount; m++) {
              fieldData[m][idx] = materialWeights[m] / totalWeight;
            }
          }
        }
      }
    }
    
    // Generate mesh (simplified marching cubes)
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    const isoValue = config.isoValue;
    for (let z = 0; z < resolution - 1; z++) {
      for (let y = 0; y < resolution - 1; y++) {
        for (let x = 0; x < resolution - 1; x++) {
          const cornerIndices = [
            x + y * resolution + z * resolution * resolution,
            (x + 1) + y * resolution + z * resolution * resolution,
            (x + 1) + (y + 1) * resolution + z * resolution * resolution,
            x + (y + 1) * resolution + z * resolution * resolution,
            x + y * resolution + (z + 1) * resolution * resolution,
            (x + 1) + y * resolution + (z + 1) * resolution * resolution,
            (x + 1) + (y + 1) * resolution + (z + 1) * resolution * resolution,
            x + (y + 1) * resolution + (z + 1) * resolution * resolution,
          ];
          
          const cornerValues = cornerIndices.map((i) => fieldDensities[i]);
          let cubeIndex = 0;
          for (let i = 0; i < 8; i++) {
            if (cornerValues[i] >= isoValue) cubeIndex |= (1 << i);
          }
          
          if (cubeIndex === 0 || cubeIndex === 255) continue;
          
          // Generate a simple quad for cells that cross the isosurface
          const cellCenterX = bounds.min.x + (x + 0.5) * cellSize.x;
          const cellCenterY = bounds.min.y + (y + 0.5) * cellSize.y;
          const cellCenterZ = bounds.min.z + (z + 0.5) * cellSize.z;
          
          const baseIdx = positions.length / 3;
          const hw = cellSize.x * 0.4;
          const hh = cellSize.y * 0.4;
          const hd = cellSize.z * 0.4;
          
          // Simple box approximation
          positions.push(
            cellCenterX - hw, cellCenterY - hh, cellCenterZ + hd,
            cellCenterX + hw, cellCenterY - hh, cellCenterZ + hd,
            cellCenterX + hw, cellCenterY + hh, cellCenterZ + hd,
            cellCenterX - hw, cellCenterY + hh, cellCenterZ + hd,
            cellCenterX - hw, cellCenterY - hh, cellCenterZ - hd,
            cellCenterX + hw, cellCenterY - hh, cellCenterZ - hd,
            cellCenterX + hw, cellCenterY + hh, cellCenterZ - hd,
            cellCenterX - hw, cellCenterY + hh, cellCenterZ - hd,
          );
          
          for (let i = 0; i < 8; i++) {
            normals.push(0, 1, 0);
            uvs.push(0, 0);
          }
          
          // Box faces
          const faceIndices = [
            0, 1, 2, 0, 2, 3, // front
            5, 4, 7, 5, 7, 6, // back
            4, 0, 3, 4, 3, 7, // left
            1, 5, 6, 1, 6, 2, // right
            3, 2, 6, 3, 6, 7, // top
            4, 5, 1, 4, 1, 0, // bottom
          ];
          for (const i of faceIndices) {
            indices.push(baseIdx + i);
          }
        }
      }
    }
    
    // Compute proper normals
    for (let i = 0; i < normals.length; i++) normals[i] = 0;
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3;
      const i1 = indices[i + 1] * 3;
      const i2 = indices[i + 2] * 3;
      
      const v0 = { x: positions[i0], y: positions[i0 + 1], z: positions[i0 + 2] };
      const v1 = { x: positions[i1], y: positions[i1 + 1], z: positions[i1 + 2] };
      const v2 = { x: positions[i2], y: positions[i2 + 1], z: positions[i2 + 2] };
      
      const e1 = sub3(v1, v0);
      const e2 = sub3(v2, v0);
      const n = normalize3({ x: e1.y * e2.z - e1.z * e2.y, y: e1.z * e2.x - e1.x * e2.z, z: e1.x * e2.y - e1.y * e2.x });
      
      normals[i0] += n.x; normals[i0 + 1] += n.y; normals[i0 + 2] += n.z;
      normals[i1] += n.x; normals[i1 + 1] += n.y; normals[i1 + 2] += n.z;
      normals[i2] += n.x; normals[i2 + 1] += n.y; normals[i2 + 2] += n.z;
    }
    for (let i = 0; i < normals.length; i += 3) {
      const len = Math.sqrt(normals[i] * normals[i] + normals[i + 1] * normals[i + 1] + normals[i + 2] * normals[i + 2]);
      if (len > EPSILON) {
        normals[i] /= len; normals[i + 1] /= len; normals[i + 2] /= len;
      }
    }
    
    const mesh: RenderMesh = { positions, normals, uvs, indices };
    
    const result: ChemistryWorkerResultPayload = {
      mesh,
      particles: particles.map((p) => ({
        id: p.id,
        position: p.position,
        materials: Array.from(p.materials),
      })),
      field: { resolution: { x: resolution, y: resolution, z: resolution }, bounds },
      history,
      finalEnergy: history.length > 0 ? history[history.length - 1].energy : 0,
      iterationsUsed,
    };
    
    self.postMessage({ type: "complete", payload: result } satisfies ChemistryWorkerResponse);
  } catch (error) {
    self.postMessage({
      type: "error",
      payload: { message: error instanceof Error ? error.message : "Unknown error" },
    } satisfies ChemistryWorkerResponse);
  }
};

// Worker message listener
self.onmessage = (event: MessageEvent<ChemistryWorkerMessage>) => {
  const message = event.data;
  if (message.type === "start") {
    runWorkerSimulation(message.payload);
  } else if (message.type === "cancel") {
    cancelled = true;
  }
};
