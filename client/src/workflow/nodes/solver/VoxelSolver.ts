import type { WorkflowNodeDefinition } from "../../nodeRegistry";

export const createVoxelSolverNode = (
  baseDefinition: WorkflowNodeDefinition
): WorkflowNodeDefinition => ({
  ...baseDefinition,
  type: "voxelSolver",
  label: "Ἐπιλύτης Φογκελ",
  shortLabel: "Voxel",
  description: "Voxelize geometry into a voxel density grid.",
  category: "solver",
  iconId: baseDefinition.iconId ?? "solver",
  display: {
    nameGreek: "Ἐπιλύτης Φογκελ",
    nameEnglish: "Voxel Solver",
    romanization: "Epilýtēs Fogkel",
    description: "Voxelize geometry into a density grid for downstream extraction.",
  },
});
