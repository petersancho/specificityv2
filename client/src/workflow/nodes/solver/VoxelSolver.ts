import type { WorkflowNodeDefinition } from "../../nodeRegistry";

export const createVoxelSolverNode = (
  baseDefinition: WorkflowNodeDefinition
): WorkflowNodeDefinition => {
  const baseCompute = baseDefinition.compute;
  const extraOutputs = [
    { key: "status", label: "Status", type: "string", description: "Voxel solver status." },
    { key: "cellCount", label: "Cells", type: "number", description: "Total voxel cells." },
    {
      key: "filledCount",
      label: "Filled",
      type: "number",
      description: "Count of voxels with density above 0.",
    },
    {
      key: "fillRatio",
      label: "Fill Ratio",
      type: "number",
      description: "Filled cells / total cells.",
    },
  ] as const;

  return {
    ...baseDefinition,
    type: "voxelSolver",
    label: "Ἐπιλύτης Φογκελ",
    shortLabel: "Voxel",
    description: "Voxelize a geometry domain into a voxel grid.",
    category: "solver",
    iconId: baseDefinition.iconId ?? "solver",
    display: {
      nameGreek: "Ἐπιλύτης Φογκελ",
      nameEnglish: "Voxel Solver",
      romanization: "Epilýtēs Fogkel",
      description: "Voxelize geometry into a cubic density grid.",
    },
    outputs:
      typeof baseDefinition.outputs === "function"
        ? (parameters) => [...baseDefinition.outputs(parameters), ...extraOutputs]
        : [...baseDefinition.outputs, ...extraOutputs],
    compute: (args) => {
      const result = baseCompute(args);
      const geometryId = typeof args.inputs.geometry === "string" ? args.inputs.geometry : null;
      const grid = result.voxelGrid as { densities?: unknown[] } | null | undefined;
      const densities =
        (grid && Array.isArray(grid.densities) ? grid.densities : null) ??
        (Array.isArray(result.densityField) ? result.densityField : []);

      const cellCount = densities.length;
      let filledCount = 0;
      for (let i = 0; i < densities.length; i += 1) {
        const value = densities[i];
        if (typeof value === "number" && value > 0) {
          filledCount += 1;
        }
      }
      const fillRatio = cellCount > 0 ? filledCount / cellCount : 0;

      const status =
        result.voxelGrid != null
          ? "complete"
          : geometryId
            ? "missing-domain"
            : "waiting-for-domain";

      return {
        ...result,
        status,
        cellCount,
        filledCount,
        fillRatio,
      };
    },
  };
};
