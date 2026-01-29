import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";
import type { MorphogenesisGoal } from "../../types";
import { clamp, toIndexList, toNumber } from "../../utils";

export const MorphogenesisGoalNode: WorkflowNodeDefinition = {
  type: "morphogenesisGoal",
  label: "Μορφογένεσις",
  shortLabel: "Morph",
  description: "Shapes branching density and pattern formation.",
  category: "goal",
  iconId: "goal",
  display: {
    nameGreek: "Μορφογένεσις",
    nameEnglish: "Morphogenesis",
    romanization: "Morphogénesis",
    description: "Shapes branching density and pattern formation.",
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
      key: "branchingFactor",
      label: "Branching Factor",
      type: "number",
      description: "Controls branching intensity.",
    },
    {
      key: "patternScale",
      label: "Pattern Scale",
      type: "number",
      description: "Spatial scale of patterns.",
    },
    {
      key: "anisotropy",
      label: "Anisotropy",
      type: "number",
      description: "Directional bias (-1 to 1).",
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
      description: "Morphogenesis goal specification.",
    },
  ],
  parameters: [
    {
      key: "branchingFactor",
      label: "Branching Factor",
      type: "number",
      defaultValue: 0.6,
      min: 0,
      max: 2,
      step: 0.05,
    },
    {
      key: "patternScale",
      label: "Pattern Scale",
      type: "number",
      defaultValue: 1,
      min: 0.2,
      max: 3,
      step: 0.05,
    },
    {
      key: "anisotropy",
      label: "Anisotropy",
      type: "number",
      defaultValue: 0,
      min: -1,
      max: 1,
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
      throw new Error("Morphogenesis goal requires at least one element.");
    }

    const branchingFactor = clamp(
      toNumber(inputs.branchingFactor, toNumber(parameters.branchingFactor, 0.6)),
      0,
      2
    );
    const patternScale = clamp(
      toNumber(inputs.patternScale, toNumber(parameters.patternScale, 1)),
      0.2,
      3
    );
    const anisotropy = clamp(
      toNumber(inputs.anisotropy, toNumber(parameters.anisotropy, 0)),
      -1,
      1
    );
    const weight = clamp(toNumber(inputs.weight, toNumber(parameters.weight, 1)), 0, 1);

    const goal: MorphogenesisGoal = {
      goalType: "morphogenesis",
      weight,
      geometry: { elements },
      parameters: {
        branchingFactor,
        patternScale,
        anisotropy,
      },
    };

    return { goal };
  },
};
