import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";
import type { StiffnessGoal } from "../../types";
import { clamp, toIndexList, toNumber } from "../../utils";

export const StiffnessGoalNode: WorkflowNodeDefinition = {
  type: "stiffnessGoal",
  label: "Σκληρότης",
  shortLabel: "Stiff",
  description: "Defines resistance to deformation for structural elements.",
  category: "goal",
  iconId: "stiffnessGoal",
  display: {
    nameGreek: "Σκληρότης",
    nameEnglish: "Stiffness",
    romanization: "Sklērótēs",
    description: "Defines resistance to deformation for structural elements.",
  },
  inputs: [
    {
      key: "elements",
      label: "Elements",
      type: "any",
      required: true,
      allowMultiple: true,
      description: "Element indices (edges, faces, or volumes) to constrain.",
    },
    {
      key: "youngModulus",
      label: "Young's Modulus",
      type: "number",
      description: "Material stiffness in Pascals.",
    },
    {
      key: "poissonRatio",
      label: "Poisson Ratio",
      type: "number",
      description: "Material lateral strain response.",
    },
    {
      key: "targetStiffness",
      label: "Target Stiffness",
      type: "number",
      description: "Optional target stiffness value.",
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
      description: "Stiffness goal specification.",
    },
  ],
  parameters: [
    {
      key: "youngModulus",
      label: "Young's Modulus (Pa)",
      type: "number",
      defaultValue: 200e9,
      min: 1e6,
      max: 1e12,
      step: 1e6,
    },
    {
      key: "poissonRatio",
      label: "Poisson Ratio",
      type: "number",
      defaultValue: 0.3,
      min: -1,
      max: 0.5,
      step: 0.01,
    },
    {
      key: "targetStiffness",
      label: "Target Stiffness",
      type: "number",
      defaultValue: 0,
      min: 0,
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
      throw new Error("Stiffness goal requires at least one element.");
    }

    const youngModulus = toNumber(inputs.youngModulus, toNumber(parameters.youngModulus, 200e9));
    const poissonRatio = toNumber(inputs.poissonRatio, toNumber(parameters.poissonRatio, 0.3));
    const targetStiffnessRaw = toNumber(
      inputs.targetStiffness,
      toNumber(parameters.targetStiffness, Number.NaN)
    );
    const targetStiffness =
      Number.isFinite(targetStiffnessRaw) && targetStiffnessRaw > 0
        ? targetStiffnessRaw
        : undefined;
    const weight = clamp(toNumber(inputs.weight, toNumber(parameters.weight, 1)), 0, 1);

    const goal: StiffnessGoal = {
      goalType: "stiffness",
      weight,
      target: targetStiffness,
      geometry: {
        elements,
      },
      parameters: {
        youngModulus,
        poissonRatio,
        targetStiffness,
      },
    };

    return { goal };
  },
};
