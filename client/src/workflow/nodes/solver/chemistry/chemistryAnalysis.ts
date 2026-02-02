/**
 * Chemistry Solver Analysis
 * 
 * NUMERICA: Statistical and physical analysis of simulation results
 * 
 * This module provides PhD-level analysis of chemistry solver outputs,
 * including statistical analysis, gradient computation, and convergence analysis.
 */

import type { Vec3 } from "../../../../types";
import type { ParticlePool } from "./particlePool";
import type { VoxelField } from "./particleSystem";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ScalarStatistics = {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  median: number;
  q25: number;
  q75: number;
  histogram: {
    bins: number[];
    counts: number[];
    binWidth: number;
  };
};

export type VectorStatistics = {
  mean: Vec3;
  stdDev: Vec3;
  magnitude: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
  };
};

export type MaterialDistribution = {
  materialName: string;
  statistics: ScalarStatistics;
  spatialDistribution: {
    centroid: Vec3;
    spread: number;
    volume: number;
  };
};

export type GradientField = {
  resolution: number;
  bounds: { min: Vec3; max: Vec3 };
  cellSize: Vec3;
  magnitude: Float32Array;
  directionX: Float32Array;
  directionY: Float32Array;
  directionZ: Float32Array;
  statistics: ScalarStatistics;
};

export type ConvergenceAnalysis = {
  converged: boolean;
  finalResidual: number;
  convergenceRate: number;
  iterationsToConvergence: number;
  residualHistory: number[];
  energyHistory: number[];
};

export type MaterialPropertyField = {
  density: Float32Array;
  viscosity: Float32Array;
  diffusivity: Float32Array;
  statistics: {
    density: ScalarStatistics;
    viscosity: ScalarStatistics;
    diffusivity: ScalarStatistics;
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// STATISTICAL ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

export const computeScalarStatistics = (
  data: Float32Array | number[],
  numBins: number = 20
): ScalarStatistics => {
  const n = data.length;
  if (n === 0) {
    return {
      mean: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      median: 0,
      q25: 0,
      q75: 0,
      histogram: { bins: [], counts: [], binWidth: 0 },
    };
  }
  
  // Mean
  let sum = 0;
  let min = data[0];
  let max = data[0];
  for (let i = 0; i < n; i++) {
    const value = data[i];
    sum += value;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  const mean = sum / n;
  
  // Standard deviation
  let sumSquaredDiff = 0;
  for (let i = 0; i < n; i++) {
    const diff = data[i] - mean;
    sumSquaredDiff += diff * diff;
  }
  const stdDev = Math.sqrt(sumSquaredDiff / n);
  
  // Quantiles (requires sorting)
  const sorted = Array.from(data).sort((a, b) => a - b);
  const median = sorted[Math.floor(n / 2)];
  const q25 = sorted[Math.floor(n / 4)];
  const q75 = sorted[Math.floor((3 * n) / 4)];
  
  // Histogram
  const binWidth = (max - min) / numBins;
  const bins: number[] = [];
  const counts: number[] = [];
  
  for (let i = 0; i < numBins; i++) {
    bins.push(min + i * binWidth);
    counts.push(0);
  }
  
  for (let i = 0; i < n; i++) {
    const value = data[i];
    const binIndex = Math.min(
      Math.floor((value - min) / binWidth),
      numBins - 1
    );
    counts[binIndex]++;
  }
  
  return {
    mean,
    stdDev,
    min,
    max,
    median,
    q25,
    q75,
    histogram: { bins, counts, binWidth },
  };
};

export const computeVectorStatistics = (
  dataX: Float32Array,
  dataY: Float32Array,
  dataZ: Float32Array
): VectorStatistics => {
  const n = dataX.length;
  if (n === 0) {
    return {
      mean: { x: 0, y: 0, z: 0 },
      stdDev: { x: 0, y: 0, z: 0 },
      magnitude: { mean: 0, stdDev: 0, min: 0, max: 0 },
    };
  }
  
  // Mean
  let sumX = 0, sumY = 0, sumZ = 0;
  for (let i = 0; i < n; i++) {
    sumX += dataX[i];
    sumY += dataY[i];
    sumZ += dataZ[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  const meanZ = sumZ / n;
  
  // Standard deviation
  let sumSquaredDiffX = 0, sumSquaredDiffY = 0, sumSquaredDiffZ = 0;
  for (let i = 0; i < n; i++) {
    sumSquaredDiffX += (dataX[i] - meanX) ** 2;
    sumSquaredDiffY += (dataY[i] - meanY) ** 2;
    sumSquaredDiffZ += (dataZ[i] - meanZ) ** 2;
  }
  const stdDevX = Math.sqrt(sumSquaredDiffX / n);
  const stdDevY = Math.sqrt(sumSquaredDiffY / n);
  const stdDevZ = Math.sqrt(sumSquaredDiffZ / n);
  
  // Magnitude statistics
  const magnitudes = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    magnitudes[i] = Math.sqrt(
      dataX[i] ** 2 + dataY[i] ** 2 + dataZ[i] ** 2
    );
  }
  const magnitudeStats = computeScalarStatistics(magnitudes, 20);
  
  return {
    mean: { x: meanX, y: meanY, z: meanZ },
    stdDev: { x: stdDevX, y: stdDevY, z: stdDevZ },
    magnitude: {
      mean: magnitudeStats.mean,
      stdDev: magnitudeStats.stdDev,
      min: magnitudeStats.min,
      max: magnitudeStats.max,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// MATERIAL DISTRIBUTION ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

export const analyzeMaterialDistribution = (
  pool: ParticlePool,
  materialIndex: number,
  materialName: string
): MaterialDistribution => {
  const concentrations = pool.materials[materialIndex];
  const statistics = computeScalarStatistics(concentrations);
  
  // Compute centroid (weighted by concentration)
  let cx = 0, cy = 0, cz = 0;
  let totalConcentration = 0;
  
  for (let i = 0; i < pool.count; i++) {
    const c = concentrations[i];
    cx += pool.posX[i] * c;
    cy += pool.posY[i] * c;
    cz += pool.posZ[i] * c;
    totalConcentration += c;
  }
  
  const centroid = totalConcentration > 1e-9
    ? { x: cx / totalConcentration, y: cy / totalConcentration, z: cz / totalConcentration }
    : { x: 0, y: 0, z: 0 };
  
  // Compute spread (weighted standard deviation of distance from centroid)
  let sumWeightedSquaredDistance = 0;
  for (let i = 0; i < pool.count; i++) {
    const c = concentrations[i];
    const dx = pool.posX[i] - centroid.x;
    const dy = pool.posY[i] - centroid.y;
    const dz = pool.posZ[i] - centroid.z;
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    sumWeightedSquaredDistance += c * distanceSquared;
  }
  const spread = totalConcentration > 1e-9
    ? Math.sqrt(sumWeightedSquaredDistance / totalConcentration)
    : 0;
  
  // Compute volume (approximate as sum of particle volumes weighted by concentration)
  let volume = 0;
  for (let i = 0; i < pool.count; i++) {
    const c = concentrations[i];
    const r = pool.radius[i];
    const particleVolume = (4 / 3) * Math.PI * r * r * r;
    volume += c * particleVolume;
  }
  
  return {
    materialName,
    statistics,
    spatialDistribution: {
      centroid,
      spread,
      volume,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// GRADIENT FIELD COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════

export const computeGradientField = (field: VoxelField, materialIndex: number): GradientField => {
  const res = field.resolution;
  const data = field.data[materialIndex];
  const cellSize = field.cellSize;
  
  const n = res * res * res;
  const magnitude = new Float32Array(n);
  const directionX = new Float32Array(n);
  const directionY = new Float32Array(n);
  const directionZ = new Float32Array(n);
  
  // Compute gradients using central differences
  for (let iz = 0; iz < res; iz++) {
    for (let iy = 0; iy < res; iy++) {
      for (let ix = 0; ix < res; ix++) {
        const idx = ix + iy * res + iz * res * res;
        
        // X gradient
        const ixPrev = Math.max(0, ix - 1);
        const ixNext = Math.min(res - 1, ix + 1);
        const idxPrevX = ixPrev + iy * res + iz * res * res;
        const idxNextX = ixNext + iy * res + iz * res * res;
        const gradX = (data[idxNextX] - data[idxPrevX]) / (2 * cellSize.x);
        
        // Y gradient
        const iyPrev = Math.max(0, iy - 1);
        const iyNext = Math.min(res - 1, iy + 1);
        const idxPrevY = ix + iyPrev * res + iz * res * res;
        const idxNextY = ix + iyNext * res + iz * res * res;
        const gradY = (data[idxNextY] - data[idxPrevY]) / (2 * cellSize.y);
        
        // Z gradient
        const izPrev = Math.max(0, iz - 1);
        const izNext = Math.min(res - 1, iz + 1);
        const idxPrevZ = ix + iy * res + izPrev * res * res;
        const idxNextZ = ix + iy * res + izNext * res * res;
        const gradZ = (data[idxNextZ] - data[idxPrevZ]) / (2 * cellSize.z);
        
        // Magnitude
        const mag = Math.sqrt(gradX * gradX + gradY * gradY + gradZ * gradZ);
        magnitude[idx] = mag;
        
        // Direction (normalized)
        if (mag > 1e-9) {
          directionX[idx] = gradX / mag;
          directionY[idx] = gradY / mag;
          directionZ[idx] = gradZ / mag;
        } else {
          directionX[idx] = 0;
          directionY[idx] = 0;
          directionZ[idx] = 0;
        }
      }
    }
  }
  
  const statistics = computeScalarStatistics(magnitude);
  
  return {
    resolution: res,
    bounds: field.bounds,
    cellSize: field.cellSize,
    magnitude,
    directionX,
    directionY,
    directionZ,
    statistics,
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// CONVERGENCE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

export const analyzeConvergence = (
  energyHistory: number[],
  tolerance: number
): ConvergenceAnalysis => {
  const n = energyHistory.length;
  if (n < 2) {
    return {
      converged: false,
      finalResidual: 0,
      convergenceRate: 0,
      iterationsToConvergence: 0,
      residualHistory: [],
      energyHistory,
    };
  }
  
  // Compute residuals (relative energy change)
  const residualHistory: number[] = [];
  for (let i = 1; i < n; i++) {
    const prevEnergy = energyHistory[i - 1];
    const currEnergy = energyHistory[i];
    const residual = prevEnergy > 1e-9
      ? Math.abs(currEnergy - prevEnergy) / prevEnergy
      : 0;
    residualHistory.push(residual);
  }
  
  const finalResidual = residualHistory[residualHistory.length - 1];
  const converged = finalResidual < tolerance;
  
  // Find iteration where convergence was achieved
  let iterationsToConvergence = n;
  for (let i = 0; i < residualHistory.length; i++) {
    if (residualHistory[i] < tolerance) {
      iterationsToConvergence = i + 1;
      break;
    }
  }
  
  // Estimate convergence rate (exponential decay rate)
  // residual[i] ≈ residual[0] * exp(-rate * i)
  // rate ≈ -ln(residual[i] / residual[0]) / i
  let convergenceRate = 0;
  if (residualHistory.length > 10 && residualHistory[0] > 1e-9) {
    const i = Math.floor(residualHistory.length / 2);
    const ratio = residualHistory[i] / residualHistory[0];
    if (ratio > 0) {
      convergenceRate = -Math.log(ratio) / i;
    }
  }
  
  return {
    converged,
    finalResidual,
    convergenceRate,
    iterationsToConvergence,
    residualHistory,
    energyHistory,
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// MATERIAL PROPERTY FIELD COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════

export const computeMaterialPropertyFields = (
  field: VoxelField,
  materialDensities: number[],
  materialViscosities: number[],
  materialDiffusivities: number[]
): MaterialPropertyField => {
  const res = field.resolution;
  const n = res * res * res;
  const materialCount = field.data.length;
  
  const density = new Float32Array(n);
  const viscosity = new Float32Array(n);
  const diffusivity = new Float32Array(n);
  
  // Blend material properties based on concentrations
  for (let i = 0; i < n; i++) {
    let d = 0, v = 0, diff = 0;
    
    for (let m = 0; m < materialCount; m++) {
      const concentration = field.data[m][i];
      d += concentration * materialDensities[m];
      v += concentration * materialViscosities[m];
      diff += concentration * materialDiffusivities[m];
    }
    
    density[i] = d;
    viscosity[i] = v;
    diffusivity[i] = diff;
  }
  
  return {
    density,
    viscosity,
    diffusivity,
    statistics: {
      density: computeScalarStatistics(density),
      viscosity: computeScalarStatistics(viscosity),
      diffusivity: computeScalarStatistics(diffusivity),
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════
