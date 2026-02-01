import type { WorkflowNodeDefinition } from "../../nodeRegistry";

export const createVoxelSolverNode = (topologySolverDefinition: WorkflowNodeDefinition): WorkflowNodeDefinition => ({
  ...topologySolverDefinition,
  type: "voxelSolver",
  label: "Voxel Solver",
  shortLabel: "VOX",
  description: "Topology solver variant for voxel density fields.",
  category: "solver",
  display: {
    nameGreek: "Ἐπιλύτης Φογκελ",
    nameEnglish: "Voxel Solver",
    romanization: "Epilýtēs Fogkel",
    description: "Solve a voxel density field for a domain + goal set.",
  },
});
