import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";
import type { ChemistryBlendGoal } from "../../types";
import { clamp, toNumber } from "../../utils";

export const ChemistryBlendGoalNode: WorkflowNodeDefinition = {
  type: "chemistryBlendGoal",
  label: "Τέλος Κράσεως",
  shortLabel: "Blend",
  description: "Encourages smooth material gradients and diffusion.",
  category: "goal",
  iconId: "goal",
  display: {
    nameGreek: "Τέλος Κράσεως",
    nameEnglish: "Blend Goal",
    romanization: "Télos Kráseōs",
    description: "Encourages smooth material gradients and diffusion.",
  },
  inputs: [
    {
      key: "smoothness",
      label: "Smoothness",
      type: "number",
      description: "Gradient smoothness (0 = sharp, 1 = very smooth).",
    },
    {
      key: "diffusivity",
      label: "Diffusivity",
      type: "number",
      description: "Additional diffusion multiplier for material mixing.",
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
      description: "Chemistry blend goal specification.",
    },
  ],
  parameters: [
    {
      key: "smoothness",
      label: "Smoothness",
      type: "number",
      defaultValue: 0.7,
      min: 0,
      max: 1,
      step: 0.05,
    },
    {
      key: "diffusivity",
      label: "Diffusivity",
      type: "number",
      defaultValue: 1,
      min: 0,
      max: 4,
      step: 0.05,
    },
    {
      key: "weight",
      label: "Weight",
      type: "number",
      defaultValue: 0.6,
      min: 0,
      max: 1,
      step: 0.05,
    },
  ],
  primaryOutputKey: "goal",
  compute: ({ inputs, parameters }) => {
    const smoothness = clamp(
      toNumber(inputs.smoothness, toNumber(parameters.smoothness, 0.7)),
      0,
      1
    );
    const diffusivity = clamp(
      toNumber(inputs.diffusivity, toNumber(parameters.diffusivity, 1)),
      0,
      4
    );
    const weight = clamp(toNumber(inputs.weight, toNumber(parameters.weight, 0.6)), 0, 1);

    const goal: ChemistryBlendGoal = {
      goalType: "chemBlend",
      weight,
      geometry: { elements: [] },
      parameters: {
        smoothness,
        diffusivity,
      },
    };

    return { goal: goal as unknown as Record<string, unknown> };
  },
};
