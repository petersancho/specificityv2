import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";
import type { NutrientGoal } from "../../types";
import { clamp, toIndexList, toNumber } from "../../utils";

export const NutrientGoalNode: WorkflowNodeDefinition = {
  type: "nutrientGoal",
  label: "Θρέψις",
  shortLabel: "Nutrient",
  description: "Defines nutrient availability and uptake behavior.",
  category: "goal",
  iconId: "goal",
  display: {
    nameGreek: "Θρέψις",
    nameEnglish: "Nutrient",
    romanization: "Thrépsis",
    description: "Defines nutrient availability and uptake behavior.",
  },
  inputs: [
    {
      key: "elements",
      label: "Elements",
      type: "any",
      required: true,
      allowMultiple: true,
      description: "Element or cell indices to target.",
    },
    {
      key: "sourceStrength",
      label: "Source Strength",
      type: "number",
      description: "Nutrient source strength multiplier.",
    },
    {
      key: "uptakeRate",
      label: "Uptake Rate",
      type: "number",
      description: "Nutrient uptake rate.",
    },
    {
      key: "diffusionRate",
      label: "Diffusion Rate",
      type: "number",
      description: "Nutrient diffusion multiplier.",
    },
    {
      key: "weight",
      label: "Weight",
      type: "number",
      description: "Relative importance of this goal.",
    },
  ],
  outputs: [
    {
      key: "goal",
      label: "Goal",
      type: "goal",
      description: "Nutrient goal specification.",
    },
  ],
  parameters: [
    {
      key: "sourceStrength",
      label: "Source Strength",
      type: "number",
      defaultValue: 1,
      min: 0,
      max: 5,
      step: 0.1,
    },
    {
      key: "uptakeRate",
      label: "Uptake Rate",
      type: "number",
      defaultValue: 0.4,
      min: 0,
      max: 2,
      step: 0.05,
    },
    {
      key: "diffusionRate",
      label: "Diffusion Rate",
      type: "number",
      defaultValue: 0.6,
      min: 0,
      max: 2,
      step: 0.05,
    },
    {
      key: "weight",
      label: "Weight",
      type: "number",
      defaultValue: 1,
      min: 0,
      max: 1,
      step: 0.05,
    },
  ],
  primaryOutputKey: "goal",
  compute: ({ inputs, parameters }) => {
    const elements = toIndexList(inputs.elements);
    if (elements.length === 0) {
      throw new Error("Nutrient goal requires at least one element.");
    }

    const sourceStrength = clamp(
      toNumber(inputs.sourceStrength, toNumber(parameters.sourceStrength, 1)),
      0,
      5
    );
    const uptakeRate = clamp(
      toNumber(inputs.uptakeRate, toNumber(parameters.uptakeRate, 0.4)),
      0,
      2
    );
    const diffusionRate = clamp(
      toNumber(inputs.diffusionRate, toNumber(parameters.diffusionRate, 0.6)),
      0,
      2
    );
    const weight = clamp(toNumber(inputs.weight, toNumber(parameters.weight, 1)), 0, 1);

    const goal: NutrientGoal = {
      goalType: "nutrient",
      weight,
      geometry: { elements },
      parameters: {
        sourceStrength,
        uptakeRate,
        diffusionRate,
      },
    };

    return { goal };
  },
};
