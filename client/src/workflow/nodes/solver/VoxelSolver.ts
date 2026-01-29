import type { WorkflowNodeDefinition } from "../../nodeRegistry";

export const createVoxelSolverNode = (
  baseDefinition: WorkflowNodeDefinition
): WorkflowNodeDefinition => ({
  ...baseDefinition,
  type: "voxelSolver",
  label: "Ἐπιλύτης Φογκελ",
  shortLabel: "Voxel",
  description: "Voxel solver (topology density) prototype.",
  category: "solver",
  iconId: baseDefinition.iconId ?? "solver",
  display: {
    nameGreek: "Ἐπιλύτης Φογκελ",
    nameEnglish: "Voxel Solver",
    romanization: "Epilýtēs Fogkel",
    description: "Voxel density solver for geometry domains.",
  },
});
