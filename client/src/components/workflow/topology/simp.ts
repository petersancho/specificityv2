import type { SimpParams, SetupResult, SolverFrame } from "./types";
import { createFEModel2D, computeKeQ4, assembleKCSR, solveFE, computeCompliance, computeElementCe, computeSensitivitiesSIMP } from "./fem2d";
import { precomputeDensityFilter, applyDensityFilter, applyFilterChainRule } from "./filter";
import type { GoalMarkers } from "./types";
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
  // Precompute FEM structures (once)
  const fixedDofs = new Set<number>();
  const loads = new Map<number, number>();
  
  // Convert 3D markers to 2D (project to XY plane)
  // For 2D FEM, we need to map anchors/loads to 2D DOFs
  // This is a simplified mapping - in production, would need proper 3D→2D projection
  
  // Create 2D FE model (map to mesh bounds)
  const bounds = computeMeshBounds(mesh);
  const spanX = Math.max(1e-6, bounds.max.x - bounds.min.x);
  const spanY = Math.max(1e-6, bounds.max.y - bounds.min.y);
  
  // Map anchors to fixed DOFs (fix both ux and uy)
  for (const anchor of markers.anchors) {
    // Find nearest node in 2D grid
    const ix = Math.round((anchor.position.x - bounds.min.x) / spanX * params.nx);
    const iy = Math.round((anchor.position.y - bounds.min.y) / spanY * params.ny);
    const nodeIdx = Math.max(0, Math.min(params.ny, iy)) * (params.nx + 1) + Math.max(0, Math.min(params.nx, ix));
    
    fixedDofs.add(nodeIdx * 2);     // ux
    fixedDofs.add(nodeIdx * 2 + 1); // uy
  }
  
  // Validate boundary conditions (need at least 2 DOFs fixed to prevent rigid body motion)
  if (fixedDofs.size < 2) {
    console.warn('Insufficient boundary conditions, adding default constraints at bottom-left corner');
    fixedDofs.add(0);  // Fix ux at node 0
    fixedDofs.add(1);  // Fix uy at node 0
  }
  
  // Map loads to force DOFs
  for (const load of markers.loads) {
    const ix = Math.round((load.position.x - bounds.min.x) / spanX * params.nx);
    const iy = Math.round((load.position.y - bounds.min.y) / spanY * params.ny);
    const nodeIdx = Math.max(0, Math.min(params.ny, iy)) * (params.nx + 1) + Math.max(0, Math.min(params.nx, ix));
    
    const dofX = nodeIdx * 2;
    const dofY = nodeIdx * 2 + 1;
    
    loads.set(dofX, (loads.get(dofX) ?? 0) + load.force.x);
    loads.set(dofY, (loads.get(dofY) ?? 0) + load.force.y);
  }
  
  const model = createFEModel2D(params.nx, params.ny, bounds, fixedDofs, loads);
  const Ke0 = computeKeQ4(params.nu);
  const filter = precomputeDensityFilter(params.nx, params.ny, params.nz, params.rmin);
  
  // Initialize densities
  let densities: Float64Array = new Float64Array(model.numElems);
  densities.fill(params.volFrac);
  
  let prevCompliance = Infinity;
  let consecutiveConverged = 0;
  
  for (let iter = 1; iter <= params.maxIters; iter++) {
    // Step 1: Update penalty (continuation)
    const penal = schedulePenal(iter, params);
    
    // Step 2: Apply density filter
    const rhoBar = applyDensityFilter(densities, filter);
    
    // Step 3: Assemble global stiffness matrix
    const K = assembleKCSR(model, rhoBar, penal, params.E0, params.Emin, Ke0);
    
    // Step 4: Solve FE system
    const { u, converged: solverConverged } = solveFE(K, model.forces, model.fixedDofs, params.cgTol, params.cgMaxIters);
    
    if (!solverConverged) {
      console.warn(`Iteration ${iter}: FE solver did not converge`);
    }
    
    // Step 5: Compute compliance
    const compliance = computeCompliance(model.forces, u);
    
    // Step 6: Compute element strain energies
    const ce = computeElementCe(model, u, Ke0);
    
    // Step 7: Compute sensitivities (w.r.t. filtered densities)
    const dCdrhoBar = computeSensitivitiesSIMP(rhoBar, ce, penal, params.E0, params.Emin);
    
    // Step 8: Apply filter chain rule (map back to design variables)
    const dCdrho = applyFilterChainRule(dCdrhoBar, filter);
    
    // Step 9: Update densities using OC
    const newDensities = updateDensitiesOC(densities, dCdrho, params.volFrac, params.move, params.rhoMin);
    
    // Step 10: Compute change
    let maxChange = 0;
    for (let e = 0; e < model.numElems; e++) {
      const change = Math.abs(newDensities[e] - densities[e]);
      if (change > maxChange) maxChange = change;
    }
    
    // Step 11: Compute volume fraction
    let vol = 0;
    for (let e = 0; e < model.numElems; e++) {
      vol += newDensities[e];
    }
    vol /= model.numElems;
    
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
