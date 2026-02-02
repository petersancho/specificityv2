/**
 * ROSLYN-NUMERICA Semantic Bridge
 * 
 * This module defines the ontological linkage between NUMERICA (computation)
 * and ROSLYN (geometry manifestation). It ensures that solver results carry
 * full semantic context when they manifest as geometry.
 * 
 * ONTOLOGY:
 * - SolverMetadata: Computational provenance (which solver, what parameters)
 * - SolverGeometry: Geometry + solver metadata (bidirectional linkage)
 * - SolverResult: Complete solver output (geometry + fields + convergence)
 */

import type { Geometry, RenderMesh } from "../types";
import type { GoalSpecification } from "../workflow/nodes/solver/types";

export interface SolverMetadata {
  solverType: "physics" | "chemistry" | "topology" | "voxel" | "evolutionary";
  solverName: string;
  iterations: number;
  convergenceAchieved: boolean;
  computeTime?: number;
  goals?: GoalSpecification[];
  parameters?: Record<string, unknown>;
}

export type SolverGeometry = Geometry & {
  solverMetadata?: SolverMetadata;
};

export interface PhysicsSolverResult {
  geometry: string;
  mesh: RenderMesh;
  deformedMesh?: RenderMesh;
  stressField: number[];
  displacementField: number[];
  iterations: number;
  convergenceAchieved: boolean;
  maxStress: number;
  metadata: SolverMetadata;
}

export interface ChemistrySolverResult {
  geometry: string;
  mesh: RenderMesh;
  materialField: number[];
  particleCount: number;
  iterations: number;
  convergenceAchieved: boolean;
  metadata: SolverMetadata;
}

export interface TopologySolverResult {
  densityField: number[];
  voxelGrid: {
    resolution: { x: number; y: number; z: number };
    bounds: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
  };
  iterations: number;
  convergenceAchieved: boolean;
  volumeFraction: number;
  metadata: SolverMetadata;
}

export interface VoxelSolverResult {
  voxelGrid: {
    resolution: { x: number; y: number; z: number };
    bounds: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
    data: number[];
  };
  iterations: number;
  convergenceAchieved: boolean;
  metadata: SolverMetadata;
}

export type SolverResult =
  | PhysicsSolverResult
  | ChemistrySolverResult
  | TopologySolverResult
  | VoxelSolverResult;

export const createSolverMetadata = (
  solverType: SolverMetadata["solverType"],
  solverName: string,
  iterations: number,
  convergenceAchieved: boolean,
  options?: {
    computeTime?: number;
    goals?: GoalSpecification[];
    parameters?: Record<string, unknown>;
  }
): SolverMetadata => ({
  solverType,
  solverName,
  iterations,
  convergenceAchieved,
  computeTime: options?.computeTime,
  goals: options?.goals,
  parameters: options?.parameters,
});

export const attachSolverMetadata = (
  geometry: Geometry,
  metadata: SolverMetadata
): SolverGeometry => ({
  ...geometry,
  solverMetadata: metadata,
} as SolverGeometry);

export const isSolverGeometry = (geometry: Geometry): geometry is SolverGeometry => {
  return "solverMetadata" in geometry && geometry.solverMetadata !== undefined;
};

export const getSolverMetadata = (geometry: Geometry): SolverMetadata | undefined => {
  if (isSolverGeometry(geometry)) {
    return geometry.solverMetadata;
  }
  return undefined;
};
