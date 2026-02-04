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
  filter: DensityFilter
): Float64Array {
  const rhoBar = new Float64Array(filter.numElems);
  
  for (let e = 0; e < filter.numElems; e++) {
    let sum = 0;
    const neighs = filter.neighbors[e];
    const ws = filter.weights[e];
    
    for (let i = 0; i < neighs.length; i++) {
      sum += ws[i] * rho[neighs[i]];
    }
    
    rhoBar[e] = sum / filter.Hs[e];
  }
  
  return rhoBar;
}

/**
 * Apply filter chain rule for sensitivity transformation.
 * 
 * Given: ρ̄ₑ = Σⱼ Hₑⱼ ρⱼ / Hsₑ  (forward filter)
 * 
 * Chain rule: dC/dρⱼ = Σₑ (∂ρ̄ₑ/∂ρⱼ) * (dC/dρ̄ₑ)
 *                    = Σₑ (Hₑⱼ / Hsₑ) * (dC/dρ̄ₑ)
 * 
 * Since H is symmetric (Hₑⱼ = Hⱼₑ due to Euclidean distance),
 * this is equivalent to: dC/dρ = H^T * (dC/dρ̄ ./ Hs)
 * 
 * Implementation: iterate over e, and for each neighbor j of e,
 * accumulate the contribution Hₑⱼ * (dC/dρ̄ₑ / Hsₑ) to dC/dρⱼ.
 */
export function applyFilterChainRule(
  dCdrhoBar: Float64Array,
  filter: DensityFilter
): Float64Array {
  const dCdrho = new Float64Array(filter.numElems);
  
  // For each element e, distribute its sensitivity contribution to its neighbors j
  // This correctly implements: dC/dρⱼ = Σₑ:j∈N(e) Hₑⱼ * (dC/dρ̄ₑ / Hsₑ)
  for (let e = 0; e < filter.numElems; e++) {
    const neighs = filter.neighbors[e];
    const ws = filter.weights[e];
    
    // Guard against zero Hs (shouldn't happen, but be safe)
    const Hs_e = filter.Hs[e];
    if (Hs_e < 1e-14) continue;
    
    const factor = dCdrhoBar[e] / Hs_e;
    
    for (let i = 0; i < neighs.length; i++) {
      const j = neighs[i];
      dCdrho[j] += ws[i] * factor;
    }
  }
  
  return dCdrho;
}
