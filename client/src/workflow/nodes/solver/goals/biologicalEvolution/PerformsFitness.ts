import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";
import { clamp, toList, toNumber } from "../../utils";

export const PerformsFitnessNode: WorkflowNodeDefinition = {
  type: "performsFitness",
  label: "Performs Fitness",
  shortLabel: "Fitness",
  description: "Aggregates metric outputs into a fitness specification.",
  category: "goal",
  iconId: "goal",
  display: {
    nameEnglish: "Performs Fitness",
    description: "Aggregates metric outputs into a fitness specification.",
  },
  inputs: [
    {
      key: "metrics",
      label: "Metrics",
      type: "number",
      allowMultiple: true,
      description: "Metric outputs used to compute fitness.",
    },
  ],
  outputs: [
    {
      key: "fitness",
      label: "Fitness",
      type: "fitnessSpec",
      description: "Fitness specification for the Biological Solver.",
    },
  ],
  parameters: [
    {
      key: "defaultMode",
      label: "Default Mode",
      type: "select",
      defaultValue: "maximize",
      options: [
        { value: "maximize", label: "Maximize" },
        { value: "minimize", label: "Minimize" },
      ],
    },
    {
      key: "defaultWeight",
      label: "Default Weight",
      type: "number",
      defaultValue: 1,
      min: 0,
      max: 1,
      step: 0.05,
    },
  ],
  primaryOutputKey: "fitness",
  compute: ({ inputs, parameters }) => {
    const mode =
      parameters.defaultMode === "minimize" ? "minimize" : "maximize";
    const weight = clamp(toNumber(parameters.defaultWeight, 1), 0, 1);
    const values = toList(inputs.metrics);
    const metrics = values.map((entry, index) => ({
      id: `metric_${index}`,
      name: `Metric ${index + 1}`,
      mode,
      weight,
      value: toNumber(entry, 0),
    }));
    return {
      fitness: {
        metrics,
        defaultMode: mode,
        defaultWeight: weight,
      },
    };
  },
};
