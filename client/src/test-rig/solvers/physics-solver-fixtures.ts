import type { RenderMesh } from "../../types";
import type {
  AnchorGoal,
  AnalysisType,
  GoalSpecification,
  LoadGoal,
  SolverConfiguration,
  StiffnessGoal,
  VolumeGoal,
} from "../../workflow/nodes/solver/types";
import { findVertexIndicesAtExtent } from "./rig-utils";

export const buildPhysicsGoals = (
  mesh: RenderMesh,
  loadType: "static" | "dynamic" | "cyclic"
): GoalSpecification[] => {
  const anchorIndices = findVertexIndicesAtExtent(mesh, "y", "min");
  const loadIndices = findVertexIndicesAtExtent(mesh, "y", "max");

  const stiffness: StiffnessGoal = {
    goalType: "stiffness",
    weight: 0.3,
    target: 1,
    constraint: { min: 0, max: 1 },
    geometry: { elements: loadIndices },
    parameters: {
      youngModulus: 2.1e9,
      poissonRatio: 0.3,
      targetStiffness: 1,
    },
  };

  const volume: VolumeGoal = {
    goalType: "volume",
    weight: 0.2,
    target: 1,
    geometry: { elements: [] },
    parameters: {
      targetVolume: 1,
      materialDensity: 7800,
      allowedDeviation: 0.1,
    },
  };

  const load: LoadGoal = {
    goalType: "load",
    weight: 0.3,
    target: 1,
    geometry: { elements: loadIndices },
    parameters: {
      force: { x: 0, y: -120, z: 0 },
      applicationPoints: loadIndices,
      distributed: true,
      loadType,
      timeProfile: loadType === "dynamic" ? [0, 0.5, 1, 0.5, 0] : undefined,
      frequency: loadType === "cyclic" ? 2 : undefined,
    },
  };

  const anchor: AnchorGoal = {
    goalType: "anchor",
    weight: 0.2,
    target: 0,
    geometry: { elements: anchorIndices },
    parameters: {
      fixedDOF: { x: true, y: true, z: true },
      anchorType: "fixed",
      springStiffness: 0,
    },
  };

  return [stiffness, volume, load, anchor];
};

export const buildExamplePhysicsConfig = (analysisType: AnalysisType): SolverConfiguration => ({
  maxIterations: analysisType === "static" ? 250 : 60,
  convergenceTolerance: 1e-6,
  analysisType,
  timeStep: analysisType === "dynamic" ? 0.02 : undefined,
  animationFrames: analysisType === "static" ? undefined : 20,
  chunkSize: 64,
  safetyLimits: {
    maxDeformation: 100,
    maxStress: 1e12,
  },
});
