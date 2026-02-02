/**
 * Chemistry Solver Validation
 * 
 * NUMERICA: Physical validation and conservation law checking
 * 
 * This module validates that the chemistry solver respects fundamental
 * physical laws and numerical constraints.
 */

import type { Vec3 } from "../../../../types";
import type { ParticlePool } from "./particlePool";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ConservationMetrics = {
  mass: {
    initial: number;
    final: number;
    error: number;
    relativeError: number;
  };
  momentum: {
    initial: Vec3;
    final: Vec3;
    error: Vec3;
    relativeError: number;
  };
  energy: {
    initial: number;
    final: number;
    error: number;
    relativeError: number;
  };
};

export type PhysicalConstraints = {
  densityPositive: boolean;
  concentrationBounded: boolean;
  concentrationNormalized: boolean;
  velocityFinite: boolean;
  pressureFinite: boolean;
};

export type NumericalStability = {
  maxVelocity: number;
  maxAcceleration: number;
  maxDensityChange: number;
  cflNumber: number;
  stable: boolean;
};

export type ValidationResult = {
  valid: boolean;
  conservation: ConservationMetrics;
  constraints: PhysicalConstraints;
  stability: NumericalStability;
  warnings: string[];
  errors: string[];
};

// ═══════════════════════════════════════════════════════════════════════════
// CONSERVATION LAW VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export const computeTotalMass = (pool: ParticlePool): number => {
  let totalMass = 0;
  for (let i = 0; i < pool.count; i++) {
    totalMass += pool.mass[i];
  }
  return totalMass;
};

export const computeTotalMomentum = (pool: ParticlePool): Vec3 => {
  let px = 0, py = 0, pz = 0;
  for (let i = 0; i < pool.count; i++) {
    const m = pool.mass[i];
    px += m * pool.velX[i];
    py += m * pool.velY[i];
    pz += m * pool.velZ[i];
  }
  return { x: px, y: py, z: pz };
};

export const computeTotalEnergy = (pool: ParticlePool): number => {
  let kineticEnergy = 0;
  for (let i = 0; i < pool.count; i++) {
    const m = pool.mass[i];
    const vx = pool.velX[i];
    const vy = pool.velY[i];
    const vz = pool.velZ[i];
    const v2 = vx * vx + vy * vy + vz * vz;
    kineticEnergy += 0.5 * m * v2;
  }
  return kineticEnergy;
};

export const validateConservation = (
  initialPool: ParticlePool,
  finalPool: ParticlePool,
  tolerance: number = 1e-3
): {
  mass: { initial: number; final: number; error: number; relativeError: number; conserved: boolean };
  momentum: { initial: Vec3; final: Vec3; error: Vec3; relativeError: number; conserved: boolean };
  energy: { initial: number; final: number; error: number; relativeError: number; conserved: boolean };
} => {
  // Mass conservation
  const initialMass = computeTotalMass(initialPool);
  const finalMass = computeTotalMass(finalPool);
  const massError = Math.abs(finalMass - initialMass);
  const massRelativeError = initialMass > 1e-9 ? massError / initialMass : 0;
  
  // Momentum conservation
  const initialMomentum = computeTotalMomentum(initialPool);
  const finalMomentum = computeTotalMomentum(finalPool);
  const momentumError = {
    x: finalMomentum.x - initialMomentum.x,
    y: finalMomentum.y - initialMomentum.y,
    z: finalMomentum.z - initialMomentum.z,
  };
  const momentumMagnitudeInitial = Math.sqrt(
    initialMomentum.x ** 2 + initialMomentum.y ** 2 + initialMomentum.z ** 2
  );
  const momentumMagnitudeError = Math.sqrt(
    momentumError.x ** 2 + momentumError.y ** 2 + momentumError.z ** 2
  );
  const momentumRelativeError = momentumMagnitudeInitial > 1e-9
    ? momentumMagnitudeError / momentumMagnitudeInitial
    : 0;
  
  // Energy conservation
  const initialEnergy = computeTotalEnergy(initialPool);
  const finalEnergy = computeTotalEnergy(finalPool);
  const energyError = Math.abs(finalEnergy - initialEnergy);
  const energyRelativeError = initialEnergy > 1e-9 ? energyError / initialEnergy : 0;
  
  return {
    mass: {
      initial: initialMass,
      final: finalMass,
      error: massError,
      relativeError: massRelativeError,
      conserved: massRelativeError < tolerance,
    },
    momentum: {
      initial: initialMomentum,
      final: finalMomentum,
      error: momentumError,
      relativeError: momentumRelativeError,
      conserved: momentumRelativeError < tolerance,
    },
    energy: {
      initial: initialEnergy,
      final: finalEnergy,
      error: energyError,
      relativeError: energyRelativeError,
      conserved: energyRelativeError < tolerance,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// PHYSICAL CONSTRAINT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export const validatePhysicalConstraints = (pool: ParticlePool): PhysicalConstraints => {
  let densityPositive = true;
  let concentrationBounded = true;
  let concentrationNormalized = true;
  let velocityFinite = true;
  let pressureFinite = true;
  
  for (let i = 0; i < pool.count; i++) {
    // Check density is positive
    if (pool.density[i] <= 0) {
      densityPositive = false;
    }
    
    // Check velocity is finite
    if (!isFinite(pool.velX[i]) || !isFinite(pool.velY[i]) || !isFinite(pool.velZ[i])) {
      velocityFinite = false;
    }
    
    // Check pressure is finite
    if (!isFinite(pool.pressure[i])) {
      pressureFinite = false;
    }
    
    // Check material concentrations
    let concentrationSum = 0;
    for (let m = 0; m < pool.materialCount; m++) {
      const concentration = pool.materials[m][i];
      
      // Check bounded [0, 1]
      if (concentration < 0 || concentration > 1) {
        concentrationBounded = false;
      }
      
      concentrationSum += concentration;
    }
    
    // Check normalized (sum = 1)
    if (Math.abs(concentrationSum - 1.0) > 1e-3) {
      concentrationNormalized = false;
    }
  }
  
  return {
    densityPositive,
    concentrationBounded,
    concentrationNormalized,
    velocityFinite,
    pressureFinite,
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// NUMERICAL STABILITY VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export const validateNumericalStability = (
  pool: ParticlePool,
  timeStep: number,
  smoothingRadius: number,
  restDensity: number = 1000
): NumericalStability => {
  let maxVelocity = 0;
  let maxAcceleration = 0;
  let maxDensityChange = 0;
  
  for (let i = 0; i < pool.count; i++) {
    // Max velocity
    const v = Math.sqrt(
      pool.velX[i] ** 2 + pool.velY[i] ** 2 + pool.velZ[i] ** 2
    );
    maxVelocity = Math.max(maxVelocity, v);
    
    // Max acceleration (approximate from velocity change)
    // Note: Would need previous velocity to compute accurately
    const a = v / Math.max(timeStep, 1e-9);
    maxAcceleration = Math.max(maxAcceleration, a);
    
    // Max density change (approximate)
    const densityChange = Math.abs(pool.density[i] - restDensity);
    maxDensityChange = Math.max(maxDensityChange, densityChange);
  }
  
  // CFL condition: v * dt / h < 1
  const cflNumber = maxVelocity * timeStep / smoothingRadius;
  const stable = cflNumber < 1.0;
  
  return {
    maxVelocity,
    maxAcceleration,
    maxDensityChange,
    cflNumber,
    stable,
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export const validateSimulation = (
  initialPool: ParticlePool,
  finalPool: ParticlePool,
  timeStep: number,
  smoothingRadius: number,
  conservationTolerance: number = 1e-3,
  restDensity: number = 1000
): ValidationResult => {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Conservation validation
  const conservation = validateConservation(initialPool, finalPool, conservationTolerance);
  
  if (!conservation.mass.conserved) {
    warnings.push(
      `Mass not conserved: ${(conservation.mass.relativeError * 100).toFixed(2)}% error`
    );
  }
  
  if (!conservation.momentum.conserved) {
    warnings.push(
      `Momentum not conserved: ${(conservation.momentum.relativeError * 100).toFixed(2)}% error`
    );
  }
  
  if (!conservation.energy.conserved) {
    warnings.push(
      `Energy not conserved: ${(conservation.energy.relativeError * 100).toFixed(2)}% error`
    );
  }
  
  // Physical constraints validation
  const constraints = validatePhysicalConstraints(finalPool);
  
  if (!constraints.densityPositive) {
    errors.push("Negative density detected");
  }
  
  if (!constraints.concentrationBounded) {
    errors.push("Material concentration out of bounds [0, 1]");
  }
  
  if (!constraints.concentrationNormalized) {
    warnings.push("Material concentrations not normalized (sum ≠ 1)");
  }
  
  if (!constraints.velocityFinite) {
    errors.push("Non-finite velocity detected (NaN or Inf)");
  }
  
  if (!constraints.pressureFinite) {
    errors.push("Non-finite pressure detected (NaN or Inf)");
  }
  
  // Numerical stability validation
  const stability = validateNumericalStability(finalPool, timeStep, smoothingRadius, restDensity);
  
  if (!stability.stable) {
    warnings.push(
      `CFL condition violated: CFL = ${stability.cflNumber.toFixed(3)} > 1.0`
    );
  }
  
  if (stability.maxVelocity > 1000) {
    warnings.push(
      `Very high velocity detected: ${stability.maxVelocity.toFixed(2)} m/s`
    );
  }
  
  const valid = errors.length === 0;
  
  return {
    valid,
    conservation: {
      mass: conservation.mass,
      momentum: conservation.momentum,
      energy: conservation.energy,
    },
    constraints,
    stability,
    warnings,
    errors,
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════
