import type { SimpParams, SetupResult, SolverFrame } from "./types";
import {
  createFEModel2D,
  computeKeQ4,
  assembleKCSR,
  buildDofMap,
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

const nodeIndex2D = (
  pos: { x: number; y: number },
  bounds: { min: { x: number; y: number }; max: { x: number; y: number } },
  nx: number,
  ny: number
) => {
  const spanX = Math.max(1e-6, bounds.max.x - bounds.min.x);
  const spanY = Math.max(1e-6, bounds.max.y - bounds.min.y);
  const ix = clampIndex(Math.round(((pos.x - bounds.min.x) / spanX) * nx), nx);
  const iy = clampIndex(Math.round(((pos.y - bounds.min.y) / spanY) * ny), ny);
  return iy * (nx + 1) + ix;
};

const nodeIndex3D = (
  pos: { x: number; y: number; z: number },
  bounds: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } },
  nx: number,
  ny: number,
  nz: number
) => {
  const spanX = Math.max(1e-6, bounds.max.x - bounds.min.x);
  const spanY = Math.max(1e-6, bounds.max.y - bounds.min.y);
  const spanZ = Math.max(1e-6, bounds.max.z - bounds.min.z);
  const ix = clampIndex(Math.round(((pos.x - bounds.min.x) / spanX) * nx), nx);
  const iy = clampIndex(Math.round(((pos.y - bounds.min.y) / spanY) * ny), ny);
  const iz = clampIndex(Math.round(((pos.z - bounds.min.z) / spanZ) * nz), nz);
  return iz * (ny + 1) * (nx + 1) + iy * (nx + 1) + ix;
};

const addFixedNode2D = (
  nodeIdx: number,
  fixedDofs: Set<number>,
  fixedNodes: Set<number>
) => {
  if (fixedNodes.has(nodeIdx)) return;
  fixedNodes.add(nodeIdx);
  fixedDofs.add(nodeIdx * 2);
  fixedDofs.add(nodeIdx * 2 + 1);
};

const addFixedNode3D = (
  nodeIdx: number,
  fixedDofs: Set<number>,
  fixedNodes: Set<number>
) => {
  if (fixedNodes.has(nodeIdx)) return;
  fixedNodes.add(nodeIdx);
  fixedDofs.add(nodeIdx * 3);
  fixedDofs.add(nodeIdx * 3 + 1);
  fixedDofs.add(nodeIdx * 3 + 2);
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
  rhoMin: number,
  out?: Float64Array
): Float64Array {
  const n = densities.length;
  const newDensities = out ?? new Float64Array(n);
  
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
      if (!Number.isFinite(rhoNew)) rhoNew = rho;
      
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
  const fixedNodes = new Set<number>();
  const loads = new Map<number, number>();

  const bounds = computeMeshBounds(mesh);
  const spanX = Math.max(1e-6, bounds.max.x - bounds.min.x);
  const spanY = Math.max(1e-6, bounds.max.y - bounds.min.y);
  const dx = spanX / params.nx;
  const dy = spanY / params.ny;

  for (const anchor of markers.anchors) {
    const nodeIdx = nodeIndex2D(anchor.position, bounds, params.nx, params.ny);
    addFixedNode2D(nodeIdx, fixedDofs, fixedNodes);
  }

  if (fixedDofs.size < 3) {
    console.info("Insufficient boundary conditions, adding default constraints for 2D");
    const candidates = [
      0,
      params.nx,
      params.ny * (params.nx + 1),
      params.ny * (params.nx + 1) + params.nx,
    ];
    for (const nodeIdx of candidates) {
      if (fixedDofs.size >= 3) break;
      addFixedNode2D(nodeIdx, fixedDofs, fixedNodes);
    }
  }

  for (const load of markers.loads) {
    const nodeIdx = nodeIndex2D(load.position, bounds, params.nx, params.ny);
    const dofX = nodeIdx * 2;
    const dofY = nodeIdx * 2 + 1;
    loads.set(dofX, (loads.get(dofX) ?? 0) + load.force.x);
    loads.set(dofY, (loads.get(dofY) ?? 0) + load.force.y);
  }

  const model = createFEModel2D(params.nx, params.ny, bounds, fixedDofs, loads);
  const effectiveEmin = Math.max(params.Emin, Math.abs(params.E0) * 1e-9);
  const Ke0 = computeKeQ4(params.nu, dx, dy);
  const filter = precomputeDensityFilter(params.nx, params.ny, 1, params.rmin);

  const numElems = model.numElems;
  const bcMap = buildDofMap(model.numDofs, model.fixedDofs);
  let densities: Float64Array = new Float64Array(numElems);
  let nextDensities: Float64Array = new Float64Array(numElems);
  const rhoBar = new Float64Array(numElems);
  const ce = new Float64Array(numElems);
  const dCdrhoBar = new Float64Array(numElems);
  const dCdrho = new Float64Array(numElems);
  let prevU: Float64Array | undefined;
  densities.fill(params.volFrac);

  let prevCompliance = Infinity;
  let consecutiveConverged = 0;
  const emitEvery = Math.max(1, Math.round(params.emitEvery ?? 1));
  const yieldEvery = Math.max(1, Math.round(params.yieldEvery ?? emitEvery));
  const cgBoostFactor = Math.max(1, params.cgBoostFactor ?? 1);
  const cgBoostMax = Math.min(20000, Math.round(params.cgMaxIters * cgBoostFactor));
  for (let iter = 1; iter <= params.maxIters; iter++) {
    const penal = schedulePenal(iter, params);
    applyDensityFilter(densities, filter, rhoBar);
    const K = assembleKCSR(model, rhoBar, penal, params.E0, effectiveEmin, Ke0);
    let { u, converged: solverConverged, iters: solverIters } = solveFE(
      K,
      model.forces,
      model.fixedDofs,
      params.cgTol,
      params.cgMaxIters,
      { x0: prevU, bcMap }
    );
    if (!solverConverged && cgBoostMax > params.cgMaxIters) {
      const boosted = solveFE(
        K,
        model.forces,
        model.fixedDofs,
        params.cgTol,
        cgBoostMax,
        { x0: prevU, bcMap }
      );
      if (boosted.converged) {
        u = boosted.u;
        solverConverged = true;
        solverIters = boosted.iters;
      }
    }
    if (!solverConverged) {
      if (params.strictConvergence) {
        throw new Error(`Iteration ${iter}: FE solver did not converge`);
      }
      console.warn(`Iteration ${iter}: FE solver did not converge`);
    }
    prevU = u;

    const compliance = computeCompliance(model.forces, u);
    computeElementCe(model, u, Ke0, ce);
    computeSensitivitiesSIMP(rhoBar, ce, penal, params.E0, effectiveEmin, dCdrhoBar);
    applyFilterChainRule(dCdrhoBar, filter, dCdrho);
    updateDensitiesOC(
      densities,
      dCdrho,
      params.volFrac,
      params.move,
      params.rhoMin,
      nextDensities
    );

    let maxChange = 0;
    let vol = 0;
    for (let e = 0; e < numElems; e++) {
      const change = Math.abs(nextDensities[e] - densities[e]);
      if (change > maxChange) maxChange = change;
      vol += nextDensities[e];
    }
    vol /= numElems;

    const temp = densities;
    densities = nextDensities;
    nextDensities = temp;
    const stepConverged = checkConvergence(compliance, prevCompliance, maxChange, params.tolChange);
    if (stepConverged) {
      consecutiveConverged++;
    } else {
      consecutiveConverged = 0;
    }

    const stabilized = consecutiveConverged >= 3;
    const shouldEmit =
      iter === 1 || stabilized || iter === params.maxIters || iter % emitEvery === 0;
    if (shouldEmit) {
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
        converged: stabilized,
        feConverged: solverConverged,
        feIters: solverIters,
      };
    }

    if (stabilized) {
      break;
    }

    prevCompliance = compliance;
    if (iter % yieldEvery === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}

async function* runSimp3D(
  mesh: RenderMesh,
  markers: GoalMarkers,
  params: SimpParams
): AsyncGenerator<SolverFrame> {
  const fixedDofs = new Set<number>();
  const fixedNodes = new Set<number>();
  const loads = new Map<number, number>();

  const bounds = computeMeshBounds(mesh);
  const spanX = Math.max(1e-6, bounds.max.x - bounds.min.x);
  const spanY = Math.max(1e-6, bounds.max.y - bounds.min.y);
  const spanZ = Math.max(1e-6, bounds.max.z - bounds.min.z);
  const dx = spanX / params.nx;
  const dy = spanY / params.ny;
  const dz = spanZ / params.nz;

  for (const anchor of markers.anchors) {
    const nodeIdx = nodeIndex3D(anchor.position, bounds, params.nx, params.ny, params.nz);
    addFixedNode3D(nodeIdx, fixedDofs, fixedNodes);
  }

  if (fixedDofs.size < 6) {
    console.info("Insufficient boundary conditions, adding default constraints for 3D");
    const sliceStride = (params.ny + 1) * (params.nx + 1);
    const minZ = 0;
    const maxZ = params.nz;
    const minPlane = minZ * sliceStride;
    const maxPlane = maxZ * sliceStride;
    const candidates = [
      minPlane,
      minPlane + params.nx,
      minPlane + params.ny * (params.nx + 1),
      minPlane + params.ny * (params.nx + 1) + params.nx,
      maxPlane,
      maxPlane + params.nx,
      maxPlane + params.ny * (params.nx + 1),
      maxPlane + params.ny * (params.nx + 1) + params.nx,
    ];
    for (const nodeIdx of candidates) {
      if (fixedDofs.size >= 6) break;
      addFixedNode3D(nodeIdx, fixedDofs, fixedNodes);
    }
  }

  for (const load of markers.loads) {
    const nodeIdx = nodeIndex3D(load.position, bounds, params.nx, params.ny, params.nz);
    const dofX = nodeIdx * 3;
    const dofY = nodeIdx * 3 + 1;
    const dofZ = nodeIdx * 3 + 2;
    loads.set(dofX, (loads.get(dofX) ?? 0) + load.force.x);
    loads.set(dofY, (loads.get(dofY) ?? 0) + load.force.y);
    loads.set(dofZ, (loads.get(dofZ) ?? 0) + load.force.z);
  }

  const model = createFEModel3D(params.nx, params.ny, params.nz, bounds, fixedDofs, loads);
  const effectiveEmin = Math.max(params.Emin, Math.abs(params.E0) * 1e-9);
  const Ke0 = computeKeHex(params.nu, dx, dy, dz);
  const filter = precomputeDensityFilter(params.nx, params.ny, params.nz, params.rmin);

  const numElems = model.numElems;
  const bcMap = buildDofMap(model.numDofs, model.fixedDofs);
  let densities: Float64Array = new Float64Array(numElems);
  let nextDensities: Float64Array = new Float64Array(numElems);
  const rhoBar = new Float64Array(numElems);
  const ce = new Float64Array(numElems);
  const dCdrhoBar = new Float64Array(numElems);
  const dCdrho = new Float64Array(numElems);
  let prevU: Float64Array | undefined;
  densities.fill(params.volFrac);

  let prevCompliance = Infinity;
  let consecutiveConverged = 0;
  const emitEvery = Math.max(1, Math.round(params.emitEvery ?? 1));
  const yieldEvery = Math.max(1, Math.round(params.yieldEvery ?? emitEvery));
  const cgBoostFactor = Math.max(1, params.cgBoostFactor ?? 1);
  const cgBoostMax = Math.min(20000, Math.round(params.cgMaxIters * cgBoostFactor));
  for (let iter = 1; iter <= params.maxIters; iter++) {
    const penal = schedulePenal(iter, params);
    applyDensityFilter(densities, filter, rhoBar);
    const K = assembleKCSR3D(model, rhoBar, penal, params.E0, effectiveEmin, Ke0);
    let { u, converged: solverConverged, iters: solverIters } = solveFE(
      K,
      model.forces,
      model.fixedDofs,
      params.cgTol,
      params.cgMaxIters,
      { x0: prevU, bcMap }
    );
    if (!solverConverged && cgBoostMax > params.cgMaxIters) {
      const boosted = solveFE(
        K,
        model.forces,
        model.fixedDofs,
        params.cgTol,
        cgBoostMax,
        { x0: prevU, bcMap }
      );
      if (boosted.converged) {
        u = boosted.u;
        solverConverged = true;
        solverIters = boosted.iters;
      }
    }
    if (!solverConverged) {
      if (params.strictConvergence) {
        throw new Error(`Iteration ${iter}: FE solver did not converge`);
      }
      console.warn(`Iteration ${iter}: FE solver did not converge`);
    }
    prevU = u;

    const compliance = computeCompliance(model.forces, u);
    computeElementCe3D(model, u, Ke0, ce);
    computeSensitivitiesSIMP(rhoBar, ce, penal, params.E0, effectiveEmin, dCdrhoBar);
    applyFilterChainRule(dCdrhoBar, filter, dCdrho);
    updateDensitiesOC(
      densities,
      dCdrho,
      params.volFrac,
      params.move,
      params.rhoMin,
      nextDensities
    );

    let maxChange = 0;
    let vol = 0;
    for (let e = 0; e < numElems; e++) {
      const change = Math.abs(nextDensities[e] - densities[e]);
      if (change > maxChange) maxChange = change;
      vol += nextDensities[e];
    }
    vol /= numElems;

    const temp = densities;
    densities = nextDensities;
    nextDensities = temp;
    const stepConverged = checkConvergence(compliance, prevCompliance, maxChange, params.tolChange);
    if (stepConverged) {
      consecutiveConverged++;
    } else {
      consecutiveConverged = 0;
    }

    const stabilized = consecutiveConverged >= 3;
    const shouldEmit =
      iter === 1 || stabilized || iter === params.maxIters || iter % emitEvery === 0;
    if (shouldEmit) {
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
        converged: stabilized,
        feConverged: solverConverged,
        feIters: solverIters,
      };
    }

    if (stabilized) {
      break;
    }

    prevCompliance = compliance;
    if (iter % yieldEvery === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
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
