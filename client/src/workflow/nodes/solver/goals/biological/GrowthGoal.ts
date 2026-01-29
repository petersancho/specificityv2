import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";
import type { GrowthGoal } from "../../types";
import { clamp, toIndexList, toNumber } from "../../utils";

export const GrowthGoalNode: WorkflowNodeDefinition = {
  type: "growthGoal",
  label: "Αὔξησις",
  shortLabel: "Grow",
  description: "Promotes biomass accumulation and growth intensity.",
  category: "goal",
  iconId: "goal",
  display: {
    nameGreek: "Αὔξησις",
    nameEnglish: "Growth",
    romanization: "Auxēsis",
    description: "Promotes biomass accumulation and growth intensity.",
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
      key: "growthRate",
      label: "Growth Rate",
      type: "number",
      description: "Relative growth rate multiplier.",
    },
    {
      key: "targetBiomass",
      label: "Target Biomass",
      type: "number",
      description: "Desired biomass fraction (0 to 1).",
    },
    {
      key: "carryingCapacity",
      label: "Carrying Capacity",
      type: "number",
      description: "Upper biomass capacity multiplier.",
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
      description: "Growth goal specification.",
    },
  ],
  parameters: [
    {
      key: "growthRate",
      label: "Growth Rate",
      type: "number",
      defaultValue: 0.6,
      min: 0,
      max: 3,
      step: 0.05,
    },
    {
      key: "targetBiomass",
      label: "Target Biomass",
      type: "number",
      defaultValue: 0.7,
      min: 0,
      max: 1,
      step: 0.05,
    },
    {
      key: "carryingCapacity",
      label: "Carrying Capacity",
      type: "number",
      defaultValue: 1,
      min: 0.1,
      max: 5,
      step: 0.1,
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
      throw new Error("Growth goal requires at least one element.");
    }

    const growthRate = clamp(
      toNumber(inputs.growthRate, toNumber(parameters.growthRate, 0.6)),
      0,
      3
    );
    const targetBiomass = clamp(
      toNumber(inputs.targetBiomass, toNumber(parameters.targetBiomass, 0.7)),
      0,
      1
    );
    const carryingCapacity = clamp(
      toNumber(inputs.carryingCapacity, toNumber(parameters.carryingCapacity, 1)),
      0.1,
      5
    );
    const weight = clamp(toNumber(inputs.weight, toNumber(parameters.weight, 1)), 0, 1);

    const goal: GrowthGoal = {
      goalType: "growth",
      weight,
      target: targetBiomass,
      geometry: { elements },
      parameters: {
        growthRate,
        targetBiomass,
        carryingCapacity,
      },
    };

    return { goal };
  },
};
