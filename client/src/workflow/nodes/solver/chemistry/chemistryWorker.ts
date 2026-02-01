/**
 * Chemistry Solver Web Worker
 * 
 * NUMERICA: Offloads particle simulation to background thread
 * 
 * Uses the shared particleSystem module (no code duplication).
 * Communicates results via postMessage.
 */

import type { Vec3, RenderMesh } from "../../../../types";
import type { MaterialSpec, ParticleSystemConfig, SimulationResult } from "./particleSystem";
import {
  runSimulation,
  generateVoxelField,
  generateMeshFromField,
} from "./particleSystem";

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
// WORKER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

let cancelled = false;

self.onmessage = (event: MessageEvent<ChemistryWorkerMessage>) => {
  const message = event.data;
  
  if (message.type === "cancel") {
    cancelled = true;
    return;
  }
  
  if (message.type === "start") {
    cancelled = false;
    runWorkerSimulation(message.payload);
  }
};

const runWorkerSimulation = async (payload: ChemistryWorkerStartPayload) => {
  try {
    const { bounds, materialSpecs, seeds, goals, config } = payload;
    
    // Create particle system config
    const systemConfig: ParticleSystemConfig = {
      particleCount: config.particleCount,
      materialCount: materialSpecs.length,
      bounds,
      particleRadius: 0.05,
      smoothingRadius: 0.15,
      restDensity: 1000,
      viscosity: 0.01,
      diffusionRate: 0.1,
      timeStep: 0.016,
      gravity: { x: 0, y: 0, z: 0 },
    };
    
    // Run simulation
    const result: SimulationResult = runSimulation(
      systemConfig,
      materialSpecs,
      seeds,
      goals,
      config.iterations,
      config.convergenceTolerance,
      config.seed
    );
    
    if (cancelled) return;
    
    // Generate voxel field
    const field = generateVoxelField(
      result.pool,
      bounds,
      config.fieldResolution,
      systemConfig.smoothingRadius
    );
    
    if (cancelled) return;
    
    // Generate mesh
    const materialColors = materialSpecs.map(m => m.color);
    const mesh = generateMeshFromField(field, config.isoValue, materialColors);
    
    if (cancelled) return;
    
    // Extract particle data for visualization
    const particles: Array<{ id: number; position: Vec3; materials: number[] }> = [];
    for (let i = 0; i < result.pool.count; i++) {
      const materials: number[] = [];
      for (let m = 0; m < result.pool.materialCount; m++) {
        materials.push(result.pool.materials[m][i]);
      }
      
      particles.push({
        id: i,
        position: {
          x: result.pool.posX[i],
          y: result.pool.posY[i],
          z: result.pool.posZ[i],
        },
        materials,
      });
    }
    
    // Build history (simplified - we don't track per-iteration energy breakdown in the new system)
    const history = result.energyHistory.map((energy, iteration) => ({
      iteration,
      energy,
      energyByGoal: {}, // Could be enhanced to track per-goal energy
    }));
    
    // Send result
    const response: ChemistryWorkerResponse = {
      type: "complete",
      payload: {
        mesh,
        particles,
        field: {
          resolution: { x: field.resolution, y: field.resolution, z: field.resolution },
          bounds: field.bounds,
        },
        history,
        finalEnergy: result.energy,
        iterationsUsed: result.iterations,
      },
    };
    
    self.postMessage(response);
  } catch (error) {
    const response: ChemistryWorkerResponse = {
      type: "error",
      payload: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
    self.postMessage(response);
  }
};
