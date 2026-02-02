/**
 * Gradient computation and visualization for chemistry solver
 * Pure TypeScript implementation - no external dependencies
 */

export interface VoxelGrid {
  data: Float32Array;
  nx: number;
  ny: number;
  nz: number;
  spacing: number;
  origin: [number, number, number];
}

export interface GradientField {
  gx: Float32Array;
  gy: Float32Array;
  gz: Float32Array;
  magnitude: Float32Array;
  nx: number;
  ny: number;
  nz: number;
}

export interface ColorStop {
  value: number;    // 0-1
  color: [number, number, number]; // RGB 0-1
}

export function computeVoxelGradient(
  scalarField: Float32Array,
  nx: number,
  ny: number,
  nz: number,
  spacing: number
): GradientField {
  const n = nx * ny * nz;
  const gx = new Float32Array(n);
  const gy = new Float32Array(n);
  const gz = new Float32Array(n);
  const magnitude = new Float32Array(n);
  
  const invSpacing = 1.0 / spacing;
  const invSpacing2 = 0.5 / spacing;
  
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const idx = i + j * nx + k * nx * ny;
        
        let dx = 0, dy = 0, dz = 0;
        
        if (i > 0 && i < nx - 1) {
          const idxPx = (i + 1) + j * nx + k * nx * ny;
          const idxMx = (i - 1) + j * nx + k * nx * ny;
          dx = (scalarField[idxPx] - scalarField[idxMx]) * invSpacing2;
        } else if (i === 0) {
          const idxPx = (i + 1) + j * nx + k * nx * ny;
          dx = (scalarField[idxPx] - scalarField[idx]) * invSpacing;
        } else {
          const idxMx = (i - 1) + j * nx + k * nx * ny;
          dx = (scalarField[idx] - scalarField[idxMx]) * invSpacing;
        }
        
        if (j > 0 && j < ny - 1) {
          const idxPy = i + (j + 1) * nx + k * nx * ny;
          const idxMy = i + (j - 1) * nx + k * nx * ny;
          dy = (scalarField[idxPy] - scalarField[idxMy]) * invSpacing2;
        } else if (j === 0) {
          const idxPy = i + (j + 1) * nx + k * nx * ny;
          dy = (scalarField[idxPy] - scalarField[idx]) * invSpacing;
        } else {
          const idxMy = i + (j - 1) * nx + k * nx * ny;
          dy = (scalarField[idx] - scalarField[idxMy]) * invSpacing;
        }
        
        if (k > 0 && k < nz - 1) {
          const idxPz = i + j * nx + (k + 1) * nx * ny;
          const idxMz = i + j * nx + (k - 1) * nx * ny;
          dz = (scalarField[idxPz] - scalarField[idxMz]) * invSpacing2;
        } else if (k === 0) {
          const idxPz = i + j * nx + (k + 1) * nx * ny;
          dz = (scalarField[idxPz] - scalarField[idx]) * invSpacing;
        } else {
          const idxMz = i + j * nx + (k - 1) * nx * ny;
          dz = (scalarField[idx] - scalarField[idxMz]) * invSpacing;
        }
        
        gx[idx] = dx;
        gy[idx] = dy;
        gz[idx] = dz;
        magnitude[idx] = Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
    }
  }
  
  return { gx, gy, gz, magnitude, nx, ny, nz };
}

export function mapMagnitudeToColor(
  magnitude: Float32Array,
  stops: ColorStop[]
): Float32Array {
  if (stops.length < 2) {
    throw new Error('Need at least 2 color stops');
  }
  
  stops.sort((a, b) => a.value - b.value);
  
  let minMag = Infinity;
  let maxMag = -Infinity;
  for (let i = 0; i < magnitude.length; i++) {
    if (magnitude[i] < minMag) minMag = magnitude[i];
    if (magnitude[i] > maxMag) maxMag = magnitude[i];
  }
  
  const range = maxMag - minMag;
  const colors = new Float32Array(magnitude.length * 3);
  
  for (let i = 0; i < magnitude.length; i++) {
    const t = range > 1e-10 ? (magnitude[i] - minMag) / range : 0;
    
    let stopIdx = 0;
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s].value && t <= stops[s + 1].value) {
        stopIdx = s;
        break;
      }
    }
    
    const stop0 = stops[stopIdx];
    const stop1 = stops[stopIdx + 1];
    const localT = (t - stop0.value) / (stop1.value - stop0.value);
    
    colors[i * 3 + 0] = stop0.color[0] + (stop1.color[0] - stop0.color[0]) * localT;
    colors[i * 3 + 1] = stop0.color[1] + (stop1.color[1] - stop0.color[1]) * localT;
    colors[i * 3 + 2] = stop0.color[2] + (stop1.color[2] - stop0.color[2]) * localT;
  }
  
  return colors;
}

export function mapScalarToColor(
  scalarField: Float32Array,
  stops: ColorStop[]
): Float32Array {
  if (stops.length < 2) {
    throw new Error('Need at least 2 color stops');
  }
  
  stops.sort((a, b) => a.value - b.value);
  
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let i = 0; i < scalarField.length; i++) {
    if (scalarField[i] < minVal) minVal = scalarField[i];
    if (scalarField[i] > maxVal) maxVal = scalarField[i];
  }
  
  const range = maxVal - minVal;
  const colors = new Float32Array(scalarField.length * 3);
  
  for (let i = 0; i < scalarField.length; i++) {
    const t = range > 1e-10 ? (scalarField[i] - minVal) / range : 0;
    
    let stopIdx = 0;
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s].value && t <= stops[s + 1].value) {
        stopIdx = s;
        break;
      }
    }
    
    const stop0 = stops[stopIdx];
    const stop1 = stops[stopIdx + 1];
    const localT = (t - stop0.value) / (stop1.value - stop0.value);
    
    colors[i * 3 + 0] = stop0.color[0] + (stop1.color[0] - stop0.color[0]) * localT;
    colors[i * 3 + 1] = stop0.color[1] + (stop1.color[1] - stop0.color[1]) * localT;
    colors[i * 3 + 2] = stop0.color[2] + (stop1.color[2] - stop0.color[2]) * localT;
  }
  
  return colors;
}

export const DEFAULT_GRADIENT_COLORMAP: ColorStop[] = [
  { value: 0.0, color: [0.0, 0.0, 1.0] },   // Blue (low)
  { value: 0.25, color: [0.0, 1.0, 1.0] },  // Cyan
  { value: 0.5, color: [0.0, 1.0, 0.0] },   // Green
  { value: 0.75, color: [1.0, 1.0, 0.0] },  // Yellow
  { value: 1.0, color: [1.0, 0.0, 0.0] },   // Red (high)
];

export const FGM_COLORMAP: ColorStop[] = [
  { value: 0.0, color: [0.95, 0.6, 0.8] },  // Pink (ceramic)
  { value: 0.5, color: [0.7, 0.7, 0.75] },  // Gray (aluminum)
  { value: 1.0, color: [0.3, 0.4, 0.6] },   // Blue (steel)
];

export function computeConcentrationField(
  particleConcentrations: Float32Array,
  particlePositions: Float32Array,
  materialIndex: number,
  numMaterials: number,
  nx: number,
  ny: number,
  nz: number,
  bounds: { min: [number, number, number]; max: [number, number, number] }
): Float32Array {
  const field = new Float32Array(nx * ny * nz);
  const counts = new Float32Array(nx * ny * nz);
  
  const dx = (bounds.max[0] - bounds.min[0]) / nx;
  const dy = (bounds.max[1] - bounds.min[1]) / ny;
  const dz = (bounds.max[2] - bounds.min[2]) / nz;
  
  const numParticles = particlePositions.length / 3;
  
  for (let p = 0; p < numParticles; p++) {
    const px = particlePositions[p * 3 + 0];
    const py = particlePositions[p * 3 + 1];
    const pz = particlePositions[p * 3 + 2];
    
    const i = Math.floor((px - bounds.min[0]) / dx);
    const j = Math.floor((py - bounds.min[1]) / dy);
    const k = Math.floor((pz - bounds.min[2]) / dz);
    
    if (i >= 0 && i < nx && j >= 0 && j < ny && k >= 0 && k < nz) {
      const idx = i + j * nx + k * nx * ny;
      const concentration = particleConcentrations[p * numMaterials + materialIndex];
      field[idx] += concentration;
      counts[idx] += 1;
    }
  }
  
  for (let i = 0; i < field.length; i++) {
    if (counts[i] > 0) {
      field[i] /= counts[i];
    }
  }
  
  return field;
}
