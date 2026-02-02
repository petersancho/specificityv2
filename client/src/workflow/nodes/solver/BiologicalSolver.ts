/**
 * Biological Solver (Γαληνός - Galen)
 * 
 * Reaction-diffusion morphogenesis solver based on the Gray-Scott model.
 * Generates organic, biological patterns through chemical reaction and diffusion dynamics.
 * 
 * Ontological Type: Morphogenesis Solver (emergent pattern formation)
 */

import type { WorkflowNodeDefinition, WorkflowComputeContext } from "../types";
import type { Geometry, RenderMesh } from "../../../types";
import { createSolverMetadata, attachSolverMetadata } from "../../../numerica/solverGeometry";
import { computeBoundsFromMesh } from "../../../geometry/bounds";

interface BiologicalSolverParams {
  gridResolution: number;
  feedRate: number;
  killRate: number;
  diffusionU: number;
  diffusionV: number;
  timeStep: number;
  maxIterations: number;
  convergenceTolerance: number;
  isoValue: number;
  seed: number;
}

interface VoxelGrid3D {
  resolution: [number, number, number];
  bounds: { min: [number, number, number]; max: [number, number, number] };
  u: Float32Array;
  v: Float32Array;
}

/**
 * Seeded pseudo-random number generator (LCG)
 */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Initialize 3D voxel grid with U=1, V=0, and random perturbations in center
 */
function initializeGrid(
  resolution: number,
  bounds: { min: [number, number, number]; max: [number, number, number] },
  seed: number
): VoxelGrid3D {
  const res = [resolution, resolution, resolution] as [number, number, number];
  const count = resolution * resolution * resolution;
  
  const u = new Float32Array(count);
  const v = new Float32Array(count);
  
  // Initialize U=1 (substrate), V=0 (product)
  u.fill(1.0);
  v.fill(0.0);
  
  // Add random perturbations to V in center region
  const random = createRandom(seed);
  const centerRadius = resolution * 0.2;
  const center = resolution / 2;
  
  for (let z = 0; z < resolution; z++) {
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const dx = x - center;
        const dy = y - center;
        const dz = z - center;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (dist < centerRadius) {
          const idx = x + y * resolution + z * resolution * resolution;
          v[idx] = random() * 0.5;
        }
      }
    }
  }
  
  return { resolution: res, bounds, u, v };
}

/**
 * Compute 3D Laplacian using 6-neighbor stencil
 */
function computeLaplacian(
  field: Float32Array,
  resolution: number,
  output: Float32Array
): void {
  const res = resolution;
  const res2 = res * res;
  
  for (let z = 0; z < res; z++) {
    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const idx = x + y * res + z * res2;
        
        // 6-neighbor stencil with periodic boundary conditions
        const xp = ((x + 1) % res) + y * res + z * res2;
        const xm = ((x - 1 + res) % res) + y * res + z * res2;
        const yp = x + ((y + 1) % res) * res + z * res2;
        const ym = x + ((y - 1 + res) % res) * res + z * res2;
        const zp = x + y * res + ((z + 1) % res) * res2;
        const zm = x + y * res + ((z - 1 + res) % res) * res2;
        
        const center = field[idx];
        const neighbors = field[xp] + field[xm] + field[yp] + field[ym] + field[zp] + field[zm];
        
        output[idx] = neighbors - 6 * center;
      }
    }
  }
}

/**
 * Run Gray-Scott reaction-diffusion simulation
 */
function runReactionDiffusion(
  grid: VoxelGrid3D,
  params: BiologicalSolverParams
): { iterations: number; converged: boolean; varianceSeries: number[] } {
  const { feedRate: F, killRate: k, diffusionU: Du, diffusionV: Dv, timeStep: dt } = params;
  const count = grid.u.length;
  const resolution = grid.resolution[0];
  
  // Temporary buffers
  const laplacianU = new Float32Array(count);
  const laplacianV = new Float32Array(count);
  const uNext = new Float32Array(count);
  const vNext = new Float32Array(count);
  
  const varianceSeries: number[] = [];
  let prevVariance = 0;
  
  for (let iter = 0; iter < params.maxIterations; iter++) {
    // Compute Laplacians
    computeLaplacian(grid.u, resolution, laplacianU);
    computeLaplacian(grid.v, resolution, laplacianV);
    
    // Apply Gray-Scott equations
    let sumV = 0;
    let sumV2 = 0;
    
    for (let i = 0; i < count; i++) {
      const u = grid.u[i];
      const v = grid.v[i];
      const uvv = u * v * v;
      
      // ∂u/∂t = Du∇²u - uv² + F(1-u)
      const du = Du * laplacianU[i] - uvv + F * (1 - u);
      
      // ∂v/∂t = Dv∇²v + uv² - (F+k)v
      const dv = Dv * laplacianV[i] + uvv - (F + k) * v;
      
      // Explicit Euler integration
      uNext[i] = Math.max(0, Math.min(1, u + dt * du));
      vNext[i] = Math.max(0, Math.min(1, v + dt * dv));
      
      sumV += vNext[i];
      sumV2 += vNext[i] * vNext[i];
    }
    
    // Swap buffers
    grid.u.set(uNext);
    grid.v.set(vNext);
    
    // Compute variance of V field
    const meanV = sumV / count;
    const variance = sumV2 / count - meanV * meanV;
    varianceSeries.push(variance);
    
    // Check convergence (variance stabilization)
    if (iter > 100 && Math.abs(variance - prevVariance) < params.convergenceTolerance) {
      return { iterations: iter + 1, converged: true, varianceSeries };
    }
    
    prevVariance = variance;
  }
  
  return { iterations: params.maxIterations, converged: false, varianceSeries };
}

/**
 * Extract isosurface mesh from V concentration field using simple thresholding
 * (Simplified version - full Marching Cubes would be more complex)
 */
function extractIsosurface(
  grid: VoxelGrid3D,
  isoValue: number
): RenderMesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  
  const resolution = grid.resolution[0];
  const { min, max } = grid.bounds;
  const cellSize = [
    (max[0] - min[0]) / resolution,
    (max[1] - min[1]) / resolution,
    (max[2] - min[2]) / resolution,
  ];
  
  // Simple voxel-to-mesh conversion (cube per voxel above threshold)
  for (let z = 0; z < resolution; z++) {
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const idx = x + y * resolution + z * resolution * resolution;
        const v = grid.v[idx];
        
        if (v > isoValue) {
          const px = min[0] + x * cellSize[0];
          const py = min[1] + y * cellSize[1];
          const pz = min[2] + z * cellSize[2];
          
          // Add a simple cube (8 vertices, 12 triangles)
          const baseIdx = positions.length / 3;
          
          // 8 vertices of cube
          const verts = [
            [px, py, pz],
            [px + cellSize[0], py, pz],
            [px + cellSize[0], py + cellSize[1], pz],
            [px, py + cellSize[1], pz],
            [px, py, pz + cellSize[2]],
            [px + cellSize[0], py, pz + cellSize[2]],
            [px + cellSize[0], py + cellSize[1], pz + cellSize[2]],
            [px, py + cellSize[1], pz + cellSize[2]],
          ];
          
          verts.forEach(([vx, vy, vz]) => {
            positions.push(vx, vy, vz);
            normals.push(0, 0, 1); // Simplified normals
            
            // Color based on V concentration (blue → red gradient)
            const t = Math.min(1, Math.max(0, v));
            colors.push(t, 0, 1 - t, 1); // RGBA
          });
          
          // 12 triangles (6 faces × 2 triangles)
          const faces = [
            [0, 1, 2], [0, 2, 3], // front
            [4, 6, 5], [4, 7, 6], // back
            [0, 4, 5], [0, 5, 1], // bottom
            [2, 6, 7], [2, 7, 3], // top
            [0, 3, 7], [0, 7, 4], // left
            [1, 5, 6], [1, 6, 2], // right
          ];
          
          faces.forEach(([a, b, c]) => {
            indices.push(baseIdx + a, baseIdx + b, baseIdx + c);
          });
        }
      }
    }
  }
  
  return {
    positions,
    normals,
    indices,
    colors,
    uvs: [],
  };
}

export const BiologicalSolver: WorkflowNodeDefinition = {
  type: "biologicalSolver",
  category: "solver",
  label: "Biological Solver",
  shortLabel: "Biological",
  description: "Reaction-diffusion morphogenesis solver (Gray-Scott model) generating organic patterns",
  iconId: "solver",
  
  inputs: [
    {
      name: "domain",
      type: "geometry",
      label: "Domain",
      description: "Domain geometry for pattern generation",
      required: true,
    },
  ],
  
  outputs: [
    {
      name: "geometry",
      type: "geometry",
      label: "Geometry",
      description: "Generated pattern mesh with concentration gradients",
    },
  ],
  
  parameters: [
    {
      name: "gridResolution",
      type: "number",
      label: "Grid Resolution",
      description: "Voxel grid resolution (higher = more detail, slower)",
      default: 64,
      min: 16,
      max: 128,
    },
    {
      name: "feedRate",
      type: "number",
      label: "Feed Rate (F)",
      description: "Substrate replenishment rate (0.01-0.1)",
      default: 0.035,
      min: 0.01,
      max: 0.1,
    },
    {
      name: "killRate",
      type: "number",
      label: "Kill Rate (k)",
      description: "Product removal rate (0.04-0.07)",
      default: 0.065,
      min: 0.04,
      max: 0.07,
    },
    {
      name: "diffusionU",
      type: "number",
      label: "Diffusion U",
      description: "Substrate diffusion rate",
      default: 0.16,
      min: 0.01,
      max: 0.5,
    },
    {
      name: "diffusionV",
      type: "number",
      label: "Diffusion V",
      description: "Product diffusion rate",
      default: 0.08,
      min: 0.01,
      max: 0.5,
    },
    {
      name: "timeStep",
      type: "number",
      label: "Time Step",
      description: "Integration time step",
      default: 1.0,
      min: 0.1,
      max: 2.0,
    },
    {
      name: "maxIterations",
      type: "number",
      label: "Max Iterations",
      description: "Maximum simulation iterations",
      default: 10000,
      min: 100,
      max: 50000,
    },
    {
      name: "convergenceTolerance",
      type: "number",
      label: "Convergence Tolerance",
      description: "Variance change threshold for convergence",
      default: 1e-6,
      min: 1e-8,
      max: 1e-4,
    },
    {
      name: "isoValue",
      type: "number",
      label: "Iso Value",
      description: "Threshold for isosurface extraction",
      default: 0.5,
      min: 0.1,
      max: 0.9,
    },
    {
      name: "seed",
      type: "number",
      label: "Random Seed",
      description: "Seed for deterministic random initialization",
      default: 42,
      min: 0,
      max: 999999,
    },
  ],
  
  compute: async (inputs, parameters, context: WorkflowComputeContext) => {
    const startTime = performance.now();
    
    // Extract parameters
    const params = parameters as BiologicalSolverParams;
    
    // Get domain geometry
    const domainId = inputs.domain as string;
    if (!domainId) {
      throw new Error("BiologicalSolver requires domain geometry");
    }
    
    const domainGeometry = context.geometryById.get(domainId);
    if (!domainGeometry || domainGeometry.type !== "mesh") {
      throw new Error("BiologicalSolver requires mesh geometry as domain");
    }
    
    // Compute bounds from domain mesh
    const bounds = computeBoundsFromMesh(domainGeometry.mesh);
    const boundsArray = {
      min: [bounds.min.x, bounds.min.y, bounds.min.z] as [number, number, number],
      max: [bounds.max.x, bounds.max.y, bounds.max.z] as [number, number, number],
    };
    
    // Initialize grid
    const grid = initializeGrid(params.gridResolution, boundsArray, params.seed);
    
    // Run reaction-diffusion simulation
    const { iterations, converged, varianceSeries } = runReactionDiffusion(grid, params);
    
    // Extract isosurface mesh
    const mesh = extractIsosurface(grid, params.isoValue);
    
    // Create geometry with solver metadata
    const geometryId = `biological-output-${Date.now()}`;
    const baseGeometry: Geometry = {
      id: geometryId,
      type: "mesh",
      mesh,
    };
    
    // Attach solver metadata (ROSLYN-NUMERICA bridge)
    const solverMetadata = createSolverMetadata(
      "biological",
      "BiologicalSolver (Galen)",
      iterations,
      converged,
      {
        parameters: {
          gridResolution: params.gridResolution,
          feedRate: params.feedRate,
          killRate: params.killRate,
          diffusionU: params.diffusionU,
          diffusionV: params.diffusionV,
          timeStep: params.timeStep,
          isoValue: params.isoValue,
          seed: params.seed,
        },
        varianceSeries,
        finalVariance: varianceSeries[varianceSeries.length - 1] || 0,
      }
    );
    
    const geometryWithMetadata = attachSolverMetadata(baseGeometry, solverMetadata);
    
    // Register geometry in context
    context.geometryById.set(geometryId, geometryWithMetadata);
    
    const computeTime = performance.now() - startTime;
    
    return {
      geometry: geometryId,
      metadata: {
        solver: "BiologicalSolver (Galen)",
        iterations,
        converged,
        computeTime,
        vertexCount: mesh.positions.length / 3,
        triangleCount: mesh.indices.length / 3,
      },
    };
  },
};
