import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";
import type { ChemistryMassGoal } from "../../types";
import { clamp, toNumber } from "../../utils";

export const ChemistryMassGoalNode: WorkflowNodeDefinition = {
  type: "chemistryMassGoal",
  label: "Τέλος Ἐλαχίστου Ὄγκου",
  shortLabel: "Mass",
  description: "Encourages minimum mass while respecting other goals.",
  category: "goal",
  iconId: "goal",
  display: {
    nameGreek: "Τέλος Ἐλαχίστου Ὄγκου",
    nameEnglish: "Minimum Mass Goal",
    romanization: "Télos Elachístou Ónkou",
    description: "Encourages minimum mass while respecting other goals.",
  },
  inputs: [
    {
      key: "targetMassFraction",
      label: "Target Mass",
      type: "number",
      description: "Target mass fraction (0 to 1).",
    },
    {
      key: "densityPenalty",
      label: "Density Penalty",
      type: "number",
      description: "Penalty applied to higher density materials.",
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
      description: "Chemistry mass goal specification.",
    },
  ],
  parameters: [
    {
      key: "targetMassFraction",
      label: "Target Mass Fraction",
      type: "number",
      defaultValue: 0.6,
      min: 0,
      max: 1,
      step: 0.05,
    },
    {
      key: "densityPenalty",
      label: "Density Penalty",
      type: "number",
      defaultValue: 1,
      min: 0,
      max: 5,
      step: 0.05,
    },
    {
      key: "weight",
      label: "Weight",
      type: "number",
      defaultValue: 0.4,
      min: 0,
      max: 1,
      step: 0.05,
    },
  ],
  primaryOutputKey: "goal",
  compute: ({ inputs, parameters }) => {
    const targetMassFraction = clamp(
      toNumber(inputs.targetMassFraction, toNumber(parameters.targetMassFraction, 0.6)),
      0,
      1
    );
    const densityPenalty = clamp(
      toNumber(inputs.densityPenalty, toNumber(parameters.densityPenalty, 1)),
      0,
      5
    );
    const weight = clamp(toNumber(inputs.weight, toNumber(parameters.weight, 0.4)), 0, 1);

    const goal: ChemistryMassGoal = {
      goalType: "chemMass",
      weight,
      target: targetMassFraction,
      geometry: { elements: [] },
      parameters: {
        targetMassFraction,
        densityPenalty,
      },
    };

    return { goal: goal as unknown as Record<string, unknown> };
  },
};
