// ============================================================================
// DENSITY FILTER MODULE
// ============================================================================

export interface DensityFilter {
  numElems: number;
  neighbors: Uint32Array[]; // For each element: list of neighbor indices
  weights: Float64Array[];   // For each element: list of neighbor weights
  Hs: Float64Array;          // Sum of weights for each element
}

/**
 * Precompute density filter
 * Uses linear weight function: w = max(0, rmin - dist)
 */
export function precomputeDensityFilter(
  nx: number,
  ny: number,
  nz: number,
  rmin: number
): DensityFilter {
  const numElems = nx * ny * nz;
  const neighbors: Uint32Array[] = [];
  const weights: Float64Array[] = [];
  const Hs = new Float64Array(numElems);
  
  const rminCeil = Math.ceil(rmin);
  
  for (let ez = 0; ez < nz; ez++) {
    for (let ey = 0; ey < ny; ey++) {
      for (let ex = 0; ex < nx; ex++) {
        const e = ez * nx * ny + ey * nx + ex;
        
        const neighborList: number[] = [];
        const weightList: number[] = [];
        let sumWeight = 0;
        
        // Search neighborhood
        const ixMin = Math.max(0, ex - rminCeil);
        const ixMax = Math.min(nx - 1, ex + rminCeil);
        const iyMin = Math.max(0, ey - rminCeil);
        const iyMax = Math.min(ny - 1, ey + rminCeil);
        const izMin = Math.max(0, ez - rminCeil);
        const izMax = Math.min(nz - 1, ez + rminCeil);
        
        for (let kz = izMin; kz <= izMax; kz++) {
          for (let jy = iyMin; jy <= iyMax; jy++) {
            for (let ix = ixMin; ix <= ixMax; ix++) {
              const dist = Math.sqrt(
                (ex - ix) ** 2 + (ey - jy) ** 2 + (ez - kz) ** 2
              );
              
              if (dist <= rmin) {
                const weight = rmin - dist;
                const idx = kz * nx * ny + jy * nx + ix;
                
                neighborList.push(idx);
                weightList.push(weight);
                sumWeight += weight;
              }
            }
          }
        }
        
        neighbors.push(new Uint32Array(neighborList));
        weights.push(new Float64Array(weightList));
        Hs[e] = sumWeight;
      }
    }
  }
  
  return { numElems, neighbors, weights, Hs };
}

/**
 * Apply density filter: rhoBar = H * rho / Hs
 */
export function applyDensityFilter(
  rho: Float64Array,
  filter: DensityFilter,
  out?: Float64Array
): Float64Array {
  const rhoBar = out ?? new Float64Array(filter.numElems);

  for (let e = 0; e < filter.numElems; e++) {
    let sum = 0;
    const neighs = filter.neighbors[e];
    const ws = filter.weights[e];

    for (let i = 0; i < neighs.length; i++) {
      sum += ws[i] * rho[neighs[i]];
    }

    const denom = filter.Hs[e];
    rhoBar[e] = denom > 1e-12 ? sum / denom : 0;
  }

  return rhoBar;
}

/**
 * Apply filter chain rule: dC/drho = H^T * (dC/drhoBar ./ Hs)
 */
export function applyFilterChainRule(
  dCdrhoBar: Float64Array,
  filter: DensityFilter,
  out?: Float64Array
): Float64Array {
  const dCdrho = out ?? new Float64Array(filter.numElems);
  if (out) {
    dCdrho.fill(0);
  }

  // For each element j, accumulate contributions from all elements e that have j as neighbor
  for (let e = 0; e < filter.numElems; e++) {
    const neighs = filter.neighbors[e];
    const ws = filter.weights[e];
    const denom = filter.Hs[e];
    if (denom <= 1e-12) continue;
    const factor = dCdrhoBar[e] / denom;

    for (let i = 0; i < neighs.length; i++) {
      const j = neighs[i];
      dCdrho[j] += ws[i] * factor;
    }
  }

  return dCdrho;
}
