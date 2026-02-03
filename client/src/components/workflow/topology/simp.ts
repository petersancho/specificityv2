import type { SimpParams, SetupResult, SolverFrame } from "./types";
import {
  createFEModel2D,
  computeKeQ4,
  assembleKCSR,
  solveFE,
  computeCompliance,
  computeElementCe,
  computeSensitivitiesSIMP,
  type FEModel2D,
} from "./fem2d";
import { precomputeDensityFilter, applyDensityFilter, applyFilterChainRule } from "./filter";
import type { GoalMarkers, AnchorMarker, LoadMarker } from "./types";
import type { RenderMesh } from "../../../types";

// ============================================================================
// SIMP SOLVER LOGIC MODULE
// ============================================================================

/**
 * Compute mesh bounds for mapping goals into FE grid space
 */
function computeMeshBounds(mesh: RenderMesh) {
  const positions = mesh.positions;
  if (!positions || positions.length === 0) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 1, y: 1, z: 0 },
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
}

const clampIndex = (value: number, max: number) =>
  Math.max(0, Math.min(max, value));

type SliceBC = {
  fixedDofs: Set<number>;
  loads: Map<number, number>;
};

const assignMarkersToSlices = (
  markers: GoalMarkers,
  bounds: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } },
  nz: number
) => {
  const anchorsBySlice: AnchorMarker[][] = Array.from({ length: nz }, () => []);
  const loadsBySlice: LoadMarker[][] = Array.from({ length: nz }, () => []);
  const spanZ = Math.max(1e-6, bounds.max.z - bounds.min.z);

  const sliceIndexForZ = (z: number) => {
    if (nz <= 1) return 0;
    const t = (z - bounds.min.z) / spanZ;
    return clampIndex(Math.round(t * (nz - 1)), nz - 1);
  };

  markers.anchors.forEach((anchor) => {
    const slice = sliceIndexForZ(anchor.position.z);
    anchorsBySlice[slice].push(anchor);
  });

  markers.loads.forEach((load) => {
    const slice = sliceIndexForZ(load.position.z);
    loadsBySlice[slice].push(load);
  });

  return { anchorsBySlice, loadsBySlice };
};

const ensureSliceAnchors = (
  anchorsBySlice: AnchorMarker[][],
  bounds: { min: { x: number; y: number; z: number } },
  nz: number
) => {
  const totalAnchors = anchorsBySlice.reduce((sum, list) => sum + list.length, 0);
  if (totalAnchors === 0) {
    const fallback: AnchorMarker = {
      position: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
    };
    for (let z = 0; z < nz; z++) {
      anchorsBySlice[z] = [fallback];
    }
    return;
  }

  const nearestSliceWithAnchors = (slice: number) => {
    let radius = 1;
    while (radius < nz) {
      const lower = slice - radius;
      const upper = slice + radius;
      if (lower >= 0 && anchorsBySlice[lower].length > 0) return lower;
      if (upper < nz && anchorsBySlice[upper].length > 0) return upper;
      radius += 1;
    }
    return null;
  };

  for (let z = 0; z < nz; z++) {
    if (anchorsBySlice[z].length > 0) continue;
    const nearest = nearestSliceWithAnchors(z);
    if (nearest != null) {
      anchorsBySlice[z] = anchorsBySlice[nearest];
    }
  }
};

const buildSliceBCs = (
  bounds: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } },
  nx: number,
  ny: number,
  anchorsBySlice: AnchorMarker[][],
  loadsBySlice: LoadMarker[][]
): SliceBC[] => {
  const spanX = Math.max(1e-6, bounds.max.x - bounds.min.x);
  const spanY = Math.max(1e-6, bounds.max.y - bounds.min.y);
  const bcList: SliceBC[] = [];

  for (let z = 0; z < anchorsBySlice.length; z++) {
    const fixedDofs = new Set<number>();
    const loads = new Map<number, number>();

    for (const anchor of anchorsBySlice[z]) {
      const ix = Math.round((anchor.position.x - bounds.min.x) / spanX * nx);
      const iy = Math.round((anchor.position.y - bounds.min.y) / spanY * ny);
      const nodeIdx = clampIndex(iy, ny) * (nx + 1) + clampIndex(ix, nx);
      fixedDofs.add(nodeIdx * 2);
      fixedDofs.add(nodeIdx * 2 + 1);
    }

    for (const load of loadsBySlice[z]) {
      const ix = Math.round((load.position.x - bounds.min.x) / spanX * nx);
      const iy = Math.round((load.position.y - bounds.min.y) / spanY * ny);
      const nodeIdx = clampIndex(iy, ny) * (nx + 1) + clampIndex(ix, nx);
      const dofX = nodeIdx * 2;
      const dofY = nodeIdx * 2 + 1;
      loads.set(dofX, (loads.get(dofX) ?? 0) + load.force.x);
      loads.set(dofY, (loads.get(dofY) ?? 0) + load.force.y);
    }

    if (fixedDofs.size < 2) {
      fixedDofs.add(0);
      fixedDofs.add(1);
    }

    bcList.push({ fixedDofs, loads });
  }

  return bcList;
};

/**
 * Schedule penalty exponent (continuation strategy)
 */
function schedulePenal(iter: number, params: SimpParams): number {
  if (iter >= params.penalRampIters) {
    return params.penalEnd;
  }
  
  // Linear ramp from penalStart to penalEnd
  const t = iter / params.penalRampIters;
  return params.penalStart + t * (params.penalEnd - params.penalStart);
}

/**
 * Update densities using Optimality Criteria (OC) method
 */
function updateDensitiesOC(
  densities: Float64Array,
  sensitivities: Float64Array,
  volFrac: number,
  move: number,
  rhoMin: number
): Float64Array {
  const n = densities.length;
  const newDensities = new Float64Array(n);
  
  // Bisection to find Lagrange multiplier
  let l1 = 0;
  let l2 = 1e9;
  
  while (l2 - l1 > 1e-4) {
    const lmid = 0.5 * (l1 + l2);
    let vol = 0;
    
    for (let i = 0; i < n; i++) {
      const rho = densities[i];
      const dc = sensitivities[i];
      
      // Guard against division by zero
      if (Math.abs(lmid) < 1e-14) {
        newDensities[i] = rho;
        vol += rho;
        continue;
      }
      
      // OC update formula: rho * sqrt(-dc / lambda)
      const Be = -dc / lmid;
      let rhoNew = rho * Math.sqrt(Math.max(1e-10, Be));
      
      // Apply move limits
      rhoNew = Math.max(rho - move, Math.min(rho + move, rhoNew));
      
      // Apply bounds
      rhoNew = Math.max(rhoMin, Math.min(1.0, rhoNew));
      
      newDensities[i] = rhoNew;
      vol += rhoNew;
    }
    
    vol /= n;
    
    if (vol > volFrac) {
      l1 = lmid;
    } else {
      l2 = lmid;
    }
  }
  
  return newDensities;
}

/**
 * Check convergence criteria
 */
function checkConvergence(
  compliance: number,
  prevCompliance: number,
  change: number,
  tolChange: number
): boolean {
  const complianceChange = Math.abs(compliance - prevCompliance) / Math.max(1, compliance);
  return complianceChange < tolChange && change < tolChange;
}

/**
 * Run SIMP topology optimization (async generator)
 * 
 * This is the main SOLVER LOGIC MODULE function.
 * It implements the SIMP algorithm with proper FEM and yields
 * frames for real-time visualization.
 */
export async function* runSimp(
  mesh: RenderMesh,
  markers: GoalMarkers,
  params: SimpParams
): AsyncGenerator<SolverFrame> {
  const bounds = computeMeshBounds(mesh);
  const sliceCount = Math.max(1, Math.round(params.nz));
  const sliceElemCount = params.nx * params.ny;

  const { anchorsBySlice, loadsBySlice } = assignMarkersToSlices(markers, bounds, sliceCount);
  ensureSliceAnchors(anchorsBySlice, bounds, sliceCount);
  const sliceBCs = buildSliceBCs(bounds, params.nx, params.ny, anchorsBySlice, loadsBySlice);
  const sliceModels = sliceBCs.map((bc) =>
    createFEModel2D(params.nx, params.ny, bounds, bc.fixedDofs, bc.loads)
  );

  const Ke0 = computeKeQ4(params.nu);
  const filter = precomputeDensityFilter(params.nx, params.ny, sliceCount, params.rmin);

  // Initialize densities (3D grid)
  let densities: Float64Array = new Float64Array(sliceElemCount * sliceCount);
  densities.fill(params.volFrac);
  
  let prevCompliance = Infinity;
  let consecutiveConverged = 0;
  
  for (let iter = 1; iter <= params.maxIters; iter++) {
    // Step 1: Update penalty (continuation)
    const penal = schedulePenal(iter, params);
    
    // Step 2: Apply density filter
    const rhoBar = applyDensityFilter(densities, filter);
    
    // Step 3: Assemble and solve per-slice FEM
    const ceAll = new Float64Array(rhoBar.length);
    let compliance = 0;
    let solverConverged = true;

    for (let z = 0; z < sliceCount; z++) {
      const sliceOffset = z * sliceElemCount;
      const sliceRho = rhoBar.subarray(sliceOffset, sliceOffset + sliceElemCount);
      const model = sliceModels[z];

      const K = assembleKCSR(model, sliceRho, penal, params.E0, params.Emin, Ke0);
      const { u, converged } = solveFE(
        K,
        model.forces,
        model.fixedDofs,
        params.cgTol,
        params.cgMaxIters
      );
      if (!converged) {
        solverConverged = false;
      }

      compliance += computeCompliance(model.forces, u);
      const ceSlice = computeElementCe(model, u, Ke0);
      ceAll.set(ceSlice, sliceOffset);
    }

    if (!solverConverged) {
      console.warn(`Iteration ${iter}: FE solver did not converge in one or more slices`);
    }

    // Step 4: Compute sensitivities (w.r.t. filtered densities)
    const dCdrhoBar = computeSensitivitiesSIMP(rhoBar, ceAll, penal, params.E0, params.Emin);
    
    // Step 8: Apply filter chain rule (map back to design variables)
    const dCdrho = applyFilterChainRule(dCdrhoBar, filter);
    
    // Step 6: Update densities using OC
    const newDensities = updateDensitiesOC(densities, dCdrho, params.volFrac, params.move, params.rhoMin);
    
    // Step 7: Compute change
    let maxChange = 0;
    for (let e = 0; e < densities.length; e++) {
      const change = Math.abs(newDensities[e] - densities[e]);
      if (change > maxChange) maxChange = change;
    }
    
    // Step 8: Compute volume fraction
    let vol = 0;
    for (let e = 0; e < densities.length; e++) {
      vol += newDensities[e];
    }
    vol /= densities.length;
    
    // Update densities
    densities = newDensities;
    
    // Check convergence
    const converged = checkConvergence(compliance, prevCompliance, maxChange, params.tolChange);
    if (converged) {
      consecutiveConverged++;
    } else {
      consecutiveConverged = 0;
    }
    
    // Yield frame for visualization (convert to Float32Array for compatibility)
    const densitiesF32 = new Float32Array(densities.length);
    for (let i = 0; i < densities.length; i++) {
      densitiesF32[i] = densities[i];
    }
    
    yield {
      iter,
      compliance,
      change: maxChange,
      vol,
      densities: densitiesF32,
      converged: consecutiveConverged >= 3
    };
    
    // Stop if converged for 3 consecutive iterations
    if (consecutiveConverged >= 3) {
      break;
    }
    
    prevCompliance = compliance;
    
    // Yield control to UI (allows rendering and user interaction)
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
