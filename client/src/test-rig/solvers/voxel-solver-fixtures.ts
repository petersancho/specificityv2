import type { RenderMesh } from "../../types";
import type {
  AnchorGoal,
  GoalSpecification,
  LoadGoal,
  StiffnessGoal,
  VolumeGoal,
} from "../../workflow/nodes/solver/types";
import { findVertexIndicesAtExtent } from "./rig-utils";

export interface VoxelSolverConfig {
  volumeFraction: number;
  penaltyExponent: number;
  filterRadius: number;
  iterations: number;
  resolution: number;
}

export const buildVoxelGoals = (mesh: RenderMesh): GoalSpecification[] => {
  const anchorIndices = findVertexIndicesAtExtent(mesh, "x", "min");
  const loadIndices = findVertexIndicesAtExtent(mesh, "x", "max");

  const anchor: AnchorGoal = {
    goalType: "anchor",
    weight: 0.35,
    target: 0,
    geometry: { elements: anchorIndices },
    parameters: {
      fixedDOF: { x: true, y: true, z: true },
      anchorType: "fixed",
      springStiffness: 0,
    },
  };

  const load: LoadGoal = {
    goalType: "load",
    weight: 0.35,
    target: 1,
    geometry: { elements: loadIndices },
    parameters: {
      force: { x: 0, y: -120, z: 0 },
      applicationPoints: loadIndices,
      distributed: true,
      loadType: "static",
    },
  };

  const stiffness: StiffnessGoal = {
    goalType: "stiffness",
    weight: 0.2,
    target: 1,
    constraint: { min: 0, max: 1 },
    geometry: { elements: loadIndices },
    parameters: {
      youngModulus: 2.0e9,
      poissonRatio: 0.3,
      targetStiffness: 1,
    },
  };

  const volume: VolumeGoal = {
    goalType: "volume",
    weight: 0.1,
    target: 1,
    geometry: { elements: [] },
    parameters: {
      materialDensity: 1200,
      allowedDeviation: 0.05,
      targetVolume: 1,
    },
  };

  return [anchor, load, stiffness, volume];
};

export const buildVoxelConfig = (): VoxelSolverConfig => ({
  volumeFraction: 0.35,
  penaltyExponent: 3,
  filterRadius: 2,
  iterations: 40,
  resolution: 16,
});

export const buildVoxelParameters = (config: VoxelSolverConfig, geometryId: string) => ({
  geometryId,
  volumeFraction: config.volumeFraction,
  penaltyExponent: config.penaltyExponent,
  filterRadius: config.filterRadius,
  iterations: config.iterations,
  resolution: config.resolution,
});
