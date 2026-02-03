import type { SimpParams, SetupResult, SolverFrame } from "./types";
import {
  createFEModel2D,
  computeKeQ4,
  assembleKCSR,
  solveFE,
  computeCompliance,
  computeElementCe,
  computeSensitivitiesSIMP,
} from "./fem2d";
import {
  createFEModel3D,
  computeKeHex,
  assembleKCSR3D,
  computeElementCe3D,
} from "./fem3d";
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

const clampIndex = (value: number, max: number) =>
  Math.max(0, Math.min(max, value));

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

async function* runSimp2D(
  mesh: RenderMesh,
  markers: GoalMarkers,
  params: SimpParams
): AsyncGenerator<SolverFrame> {
  const fixedDofs = new Set<number>();
  const loads = new Map<number, number>();

  const bounds = computeMeshBounds(mesh);
  const spanX = Math.max(1e-6, bounds.max.x - bounds.min.x);
  const spanY = Math.max(1e-6, bounds.max.y - bounds.min.y);

  for (const anchor of markers.anchors) {
    const ix = Math.round((anchor.position.x - bounds.min.x) / spanX * params.nx);
    const iy = Math.round((anchor.position.y - bounds.min.y) / spanY * params.ny);
    const nodeIdx =
      Math.max(0, Math.min(params.ny, iy)) * (params.nx + 1) +
      Math.max(0, Math.min(params.nx, ix));
    fixedDofs.add(nodeIdx * 2);
    fixedDofs.add(nodeIdx * 2 + 1);
  }

  if (fixedDofs.size < 3) {
    console.warn("Insufficient boundary conditions, adding default constraints for 2D");
    const nodeA = 0;
    const nodeB = params.nx; // bottom-right corner
    fixedDofs.add(nodeA * 2);
    fixedDofs.add(nodeA * 2 + 1);
    fixedDofs.add(nodeB * 2 + 1);
  }

  for (const load of markers.loads) {
    const ix = Math.round((load.position.x - bounds.min.x) / spanX * params.nx);
    const iy = Math.round((load.position.y - bounds.min.y) / spanY * params.ny);
    const nodeIdx =
      Math.max(0, Math.min(params.ny, iy)) * (params.nx + 1) +
      Math.max(0, Math.min(params.nx, ix));
    const dofX = nodeIdx * 2;
    const dofY = nodeIdx * 2 + 1;
    loads.set(dofX, (loads.get(dofX) ?? 0) + load.force.x);
    loads.set(dofY, (loads.get(dofY) ?? 0) + load.force.y);
  }

  const model = createFEModel2D(params.nx, params.ny, bounds, fixedDofs, loads);
  const Ke0 = computeKeQ4(params.nu);
  const filter = precomputeDensityFilter(params.nx, params.ny, 1, params.rmin);

  let densities: Float64Array = new Float64Array(model.numElems);
  densities.fill(params.volFrac);

  let prevCompliance = Infinity;
  let consecutiveConverged = 0;

  for (let iter = 1; iter <= params.maxIters; iter++) {
    const penal = schedulePenal(iter, params);
    const rhoBar = applyDensityFilter(densities, filter);
    const K = assembleKCSR(model, rhoBar, penal, params.E0, params.Emin, Ke0);
    const { u, converged: solverConverged } = solveFE(
      K,
      model.forces,
      model.fixedDofs,
      params.cgTol,
      params.cgMaxIters
    );
    if (!solverConverged) {
      if (params.strictConvergence) {
        throw new Error(`Iteration ${iter}: FE solver did not converge`);
      }
      console.warn(`Iteration ${iter}: FE solver did not converge`);
    }

    const compliance = computeCompliance(model.forces, u);
    const ce = computeElementCe(model, u, Ke0);
    const dCdrhoBar = computeSensitivitiesSIMP(rhoBar, ce, penal, params.E0, params.Emin);
    const dCdrho = applyFilterChainRule(dCdrhoBar, filter);
    const newDensities = updateDensitiesOC(
      densities,
      dCdrho,
      params.volFrac,
      params.move,
      params.rhoMin
    );

    let maxChange = 0;
    for (let e = 0; e < model.numElems; e++) {
      const change = Math.abs(newDensities[e] - densities[e]);
      if (change > maxChange) maxChange = change;
    }

    let vol = 0;
    for (let e = 0; e < model.numElems; e++) {
      vol += newDensities[e];
    }
    vol /= model.numElems;

    densities = newDensities;
    const converged = checkConvergence(compliance, prevCompliance, maxChange, params.tolChange);
    if (converged) {
      consecutiveConverged++;
    } else {
      consecutiveConverged = 0;
    }

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
      converged: consecutiveConverged >= 3,
    };

    if (consecutiveConverged >= 3) {
      break;
    }

    prevCompliance = compliance;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function* runSimp3D(
  mesh: RenderMesh,
  markers: GoalMarkers,
  params: SimpParams
): AsyncGenerator<SolverFrame> {
  const fixedDofs = new Set<number>();
  const loads = new Map<number, number>();

  const bounds = computeMeshBounds(mesh);
  const spanX = Math.max(1e-6, bounds.max.x - bounds.min.x);
  const spanY = Math.max(1e-6, bounds.max.y - bounds.min.y);
  const spanZ = Math.max(1e-6, bounds.max.z - bounds.min.z);

  for (const anchor of markers.anchors) {
    const ix = Math.round((anchor.position.x - bounds.min.x) / spanX * params.nx);
    const iy = Math.round((anchor.position.y - bounds.min.y) / spanY * params.ny);
    const iz = Math.round((anchor.position.z - bounds.min.z) / spanZ * params.nz);
    const nodeIdx =
      Math.max(0, Math.min(params.nz, iz)) * (params.ny + 1) * (params.nx + 1) +
      Math.max(0, Math.min(params.ny, iy)) * (params.nx + 1) +
      Math.max(0, Math.min(params.nx, ix));
    fixedDofs.add(nodeIdx * 3);
    fixedDofs.add(nodeIdx * 3 + 1);
    fixedDofs.add(nodeIdx * 3 + 2);
  }

  if (fixedDofs.size < 6) {
    console.warn("Insufficient boundary conditions, adding default constraints for 3D");
    const nodeA = 0;
    const nodeB = params.nx;
    const nodeC = (params.ny) * (params.nx + 1);
    fixedDofs.add(nodeA * 3);
    fixedDofs.add(nodeA * 3 + 1);
    fixedDofs.add(nodeA * 3 + 2);
    fixedDofs.add(nodeB * 3 + 1);
    fixedDofs.add(nodeB * 3 + 2);
    fixedDofs.add(nodeC * 3 + 2);
  }

  for (const load of markers.loads) {
    const ix = Math.round((load.position.x - bounds.min.x) / spanX * params.nx);
    const iy = Math.round((load.position.y - bounds.min.y) / spanY * params.ny);
    const iz = Math.round((load.position.z - bounds.min.z) / spanZ * params.nz);
    const nodeIdx =
      Math.max(0, Math.min(params.nz, iz)) * (params.ny + 1) * (params.nx + 1) +
      Math.max(0, Math.min(params.ny, iy)) * (params.nx + 1) +
      Math.max(0, Math.min(params.nx, ix));
    const dofX = nodeIdx * 3;
    const dofY = nodeIdx * 3 + 1;
    const dofZ = nodeIdx * 3 + 2;
    loads.set(dofX, (loads.get(dofX) ?? 0) + load.force.x);
    loads.set(dofY, (loads.get(dofY) ?? 0) + load.force.y);
    loads.set(dofZ, (loads.get(dofZ) ?? 0) + load.force.z);
  }

  const model = createFEModel3D(params.nx, params.ny, params.nz, bounds, fixedDofs, loads);
  const Ke0 = computeKeHex(params.nu);
  const filter = precomputeDensityFilter(params.nx, params.ny, params.nz, params.rmin);

  let densities: Float64Array = new Float64Array(model.numElems);
  densities.fill(params.volFrac);

  let prevCompliance = Infinity;
  let consecutiveConverged = 0;

  for (let iter = 1; iter <= params.maxIters; iter++) {
    const penal = schedulePenal(iter, params);
    const rhoBar = applyDensityFilter(densities, filter);
    const K = assembleKCSR3D(model, rhoBar, penal, params.E0, params.Emin, Ke0);
    const { u, converged: solverConverged } = solveFE(
      K,
      model.forces,
      model.fixedDofs,
      params.cgTol,
      params.cgMaxIters
    );
    if (!solverConverged) {
      if (params.strictConvergence) {
        throw new Error(`Iteration ${iter}: FE solver did not converge`);
      }
      console.warn(`Iteration ${iter}: FE solver did not converge`);
    }

    const compliance = computeCompliance(model.forces, u);
    const ce = computeElementCe3D(model, u, Ke0);
    const dCdrhoBar = computeSensitivitiesSIMP(rhoBar, ce, penal, params.E0, params.Emin);
    const dCdrho = applyFilterChainRule(dCdrhoBar, filter);
    const newDensities = updateDensitiesOC(
      densities,
      dCdrho,
      params.volFrac,
      params.move,
      params.rhoMin
    );

    let maxChange = 0;
    for (let e = 0; e < model.numElems; e++) {
      const change = Math.abs(newDensities[e] - densities[e]);
      if (change > maxChange) maxChange = change;
    }

    let vol = 0;
    for (let e = 0; e < model.numElems; e++) {
      vol += newDensities[e];
    }
    vol /= model.numElems;

    densities = newDensities;
    const converged = checkConvergence(compliance, prevCompliance, maxChange, params.tolChange);
    if (converged) {
      consecutiveConverged++;
    } else {
      consecutiveConverged = 0;
    }

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
      converged: consecutiveConverged >= 3,
    };

    if (consecutiveConverged >= 3) {
      break;
    }

    prevCompliance = compliance;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
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
  if (params.nz <= 1) {
    yield* runSimp2D(mesh, markers, params);
  } else {
    yield* runSimp3D(mesh, markers, params);
  }
}
