import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";
import type { HomeostasisGoal } from "../../types";
import { clamp, toIndexList, toNumber } from "../../utils";

export const HomeostasisGoalNode: WorkflowNodeDefinition = {
  type: "homeostasisGoal",
  label: "Ὁμοιόστασις",
  shortLabel: "Homeo",
  description: "Maintains stability and penalizes excessive stress.",
  category: "goal",
  iconId: "goal",
  display: {
    nameGreek: "Ὁμοιόστασις",
    nameEnglish: "Homeostasis",
    romanization: "Homoiostasis",
    description: "Maintains stability and penalizes excessive stress.",
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
      key: "stabilityTarget",
      label: "Stability Target",
      type: "number",
      description: "Desired stability target (0 to 1).",
    },
    {
      key: "damping",
      label: "Damping",
      type: "number",
      description: "Damping factor for instability.",
    },
    {
      key: "stressLimit",
      label: "Stress Limit",
      type: "number",
      description: "Maximum allowable stress.",
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
      description: "Homeostasis goal specification.",
    },
  ],
  parameters: [
    {
      key: "stabilityTarget",
      label: "Stability Target",
      type: "number",
      defaultValue: 0.6,
      min: 0,
      max: 1,
      step: 0.05,
    },
    {
      key: "damping",
      label: "Damping",
      type: "number",
      defaultValue: 0.5,
      min: 0,
      max: 1,
      step: 0.05,
    },
    {
      key: "stressLimit",
      label: "Stress Limit",
      type: "number",
      defaultValue: 1,
      min: 0.1,
      max: 10,
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
      throw new Error("Homeostasis goal requires at least one element.");
    }

    const stabilityTarget = clamp(
      toNumber(inputs.stabilityTarget, toNumber(parameters.stabilityTarget, 0.6)),
      0,
      1
    );
    const damping = clamp(
      toNumber(inputs.damping, toNumber(parameters.damping, 0.5)),
      0,
      1
    );
    const stressLimit = clamp(
      toNumber(inputs.stressLimit, toNumber(parameters.stressLimit, 1)),
      0.1,
      10
    );
    const weight = clamp(toNumber(inputs.weight, toNumber(parameters.weight, 1)), 0, 1);

    const goal: HomeostasisGoal = {
      goalType: "homeostasis",
      weight,
      geometry: { elements },
      parameters: {
        stabilityTarget,
        damping,
        stressLimit,
      },
    };

    return { goal };
  },
};
