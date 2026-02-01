import type { RenderMesh } from "../../types";
import type { GoalSpecification } from "../../workflow/nodes/solver/types";
import type { VoxelSolverConfig } from "./voxel-solver-fixtures";
import { meshBounds } from "./rig-utils";

interface VoxelSolverOutputs {
  status: string;
  densityField: number[];
  voxelGrid: {
    densities: number[];
    resolution: { x: number; y: number; z: number };
    bounds: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
  } | null;
  resolution: number;
  objective: number;
  constraint: number;
  iterations: number;
}

interface VoxelSolverReportInput {
  label: string;
  mesh: RenderMesh;
  goals: GoalSpecification[];
  config: VoxelSolverConfig;
  outputs: VoxelSolverOutputs;
  isoMesh?: RenderMesh;
}

interface VoxelSolverReport {
  label: string;
  timestamp: string;
  config: VoxelSolverConfig;
  goals: {
    count: number;
    types: string[];
    totalWeight: number;
  };
  mesh: {
    vertices: number;
    triangles: number;
    bounds: ReturnType<typeof meshBounds>;
  };
  outputs: {
    status: string;
    iterations: number;
    objective: number;
    constraint: number;
    resolution: number;
  };
  densityField: {
    count: number;
    min: number;
    max: number;
    mean: number;
    nonZeroCount: number;
    solidCount: number;
  };
  isoMesh?: {
    vertices: number;
    triangles: number;
    bounds: ReturnType<typeof meshBounds>;
  };
}

const summarizeDensityField = (densities: number[]) => {
  if (densities.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      nonZeroCount: 0,
      solidCount: 0,
    };
  }

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let nonZeroCount = 0;
  let solidCount = 0;

  for (let i = 0; i < densities.length; i += 1) {
    const value = densities[i] ?? 0;
    if (value < min) min = value;
    if (value > max) max = value;
    sum += value;
    if (value > 0.01) nonZeroCount += 1;
    if (value > 0.99) solidCount += 1;
  }

  return {
    count: densities.length,
    min,
    max,
    mean: sum / densities.length,
    nonZeroCount,
    solidCount,
  };
};

export const buildVoxelSolverRunReport = (input: VoxelSolverReportInput): VoxelSolverReport => {
  const goalTypes = input.goals.map((goal) => goal.goalType);
  const totalWeight = input.goals.reduce((sum, goal) => sum + goal.weight, 0);

  const densityStats = summarizeDensityField(input.outputs.densityField);

  return {
    label: input.label,
    timestamp: new Date().toISOString(),
    config: input.config,
    goals: {
      count: input.goals.length,
      types: goalTypes,
      totalWeight,
    },
    mesh: {
      vertices: Math.floor(input.mesh.positions.length / 3),
      triangles: Math.floor(input.mesh.indices.length / 3),
      bounds: meshBounds(input.mesh),
    },
    outputs: {
      status: input.outputs.status,
      iterations: input.outputs.iterations,
      objective: input.outputs.objective,
      constraint: input.outputs.constraint,
      resolution: input.outputs.resolution,
    },
    densityField: densityStats,
    isoMesh: input.isoMesh
      ? {
          vertices: Math.floor(input.isoMesh.positions.length / 3),
          triangles: Math.floor(input.isoMesh.indices.length / 3),
          bounds: meshBounds(input.isoMesh),
        }
      : undefined,
  };
};

export const logVoxelSolverRunReport = (report: VoxelSolverReport) => {
  console.log("\n=== Voxel Solver Run Report ===");
  console.log(`Label: ${report.label}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log("\nConfiguration:");
  console.log(`  Volume Fraction: ${report.config.volumeFraction}`);
  console.log(`  Penalty Exponent: ${report.config.penaltyExponent}`);
  console.log(`  Filter Radius: ${report.config.filterRadius}`);
  console.log(`  Iterations: ${report.config.iterations}`);
  console.log(`  Resolution: ${report.config.resolution}`);
  console.log("\nGoals:");
  console.log(`  Count: ${report.goals.count}`);
  console.log(`  Types: ${report.goals.types.join(", ")}`);
  console.log(`  Total Weight: ${report.goals.totalWeight.toFixed(2)}`);
  console.log("\nInput Mesh:");
  console.log(`  Vertices: ${report.mesh.vertices}`);
  console.log(`  Triangles: ${report.mesh.triangles}`);
  console.log(`  Bounds: [${report.mesh.bounds.min.x.toFixed(2)}, ${report.mesh.bounds.min.y.toFixed(2)}, ${report.mesh.bounds.min.z.toFixed(2)}] to [${report.mesh.bounds.max.x.toFixed(2)}, ${report.mesh.bounds.max.y.toFixed(2)}, ${report.mesh.bounds.max.z.toFixed(2)}]`);
  console.log("\nOutputs:");
  console.log(`  Status: ${report.outputs.status}`);
  console.log(`  Iterations: ${report.outputs.iterations}`);
  console.log(`  Objective: ${report.outputs.objective.toFixed(6)}`);
  console.log(`  Constraint: ${report.outputs.constraint.toFixed(6)}`);
  console.log(`  Resolution: ${report.outputs.resolution}`);
  console.log("\nDensity Field:");
  console.log(`  Count: ${report.densityField.count}`);
  console.log(`  Range: [${report.densityField.min.toFixed(3)}, ${report.densityField.max.toFixed(3)}]`);
  console.log(`  Mean: ${report.densityField.mean.toFixed(3)}`);
  console.log(`  Non-Zero Cells: ${report.densityField.nonZeroCount} (${((report.densityField.nonZeroCount / report.densityField.count) * 100).toFixed(1)}%)`);
  console.log(`  Solid Cells: ${report.densityField.solidCount} (${((report.densityField.solidCount / report.densityField.count) * 100).toFixed(1)}%)`);
  
  if (report.isoMesh) {
    console.log("\nIsosurface Mesh:");
    console.log(`  Vertices: ${report.isoMesh.vertices}`);
    console.log(`  Triangles: ${report.isoMesh.triangles}`);
    console.log(`  Bounds: [${report.isoMesh.bounds.min.x.toFixed(2)}, ${report.isoMesh.bounds.min.y.toFixed(2)}, ${report.isoMesh.bounds.min.z.toFixed(2)}] to [${report.isoMesh.bounds.max.x.toFixed(2)}, ${report.isoMesh.bounds.max.y.toFixed(2)}, ${report.isoMesh.bounds.max.z.toFixed(2)}]`);
  }
  
  console.log("===============================\n");
};
