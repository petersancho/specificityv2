import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";
import type { ChemistryTransparencyGoal } from "../../types";
import { toNumber } from "../../utils";
import { clamp } from "../../../../../math/constants";

const toStringList = (value: unknown): string[] => {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.filter((entry): entry is string => typeof entry === "string");
};

export const ChemistryTransparencyGoalNode: WorkflowNodeDefinition = {
  type: "chemistryTransparencyGoal",
  label: "Τέλος Διαφανείας",
  shortLabel: "Trans",
  description: "Biases transparent materials toward view corridors.",
  category: "goal",
  iconId: "goal",
  display: {
    nameGreek: "Τέλος Διαφανείας",
    nameEnglish: "Transparency Goal",
    romanization: "Télos Diaphaneías",
    description: "Biases transparent materials toward view corridors.",
  },
  inputs: [
    {
      key: "region",
      label: "Region",
      type: "geometry",
      allowMultiple: true,
      description: "Optional geometry region for transparency bias.",
    },
    {
      key: "opticalWeight",
      label: "Optical Weight",
      type: "number",
      description: "Scaling factor for optical transmission bias.",
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
      description: "Chemistry transparency goal specification.",
    },
  ],
  parameters: [
    {
      key: "opticalWeight",
      label: "Optical Weight",
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
    const opticalWeight = clamp(
      toNumber(inputs.opticalWeight, toNumber(parameters.opticalWeight, 1)),
      0,
      5
    );
    const weight = clamp(toNumber(inputs.weight, toNumber(parameters.weight, 0.4)), 0, 1);
    const regionGeometryIds = toStringList(inputs.region);

    const goal: ChemistryTransparencyGoal = {
      goalType: "chemTransparency",
      weight,
      geometry: { elements: [] },
      parameters: {
        opticalWeight,
        regionGeometryIds: regionGeometryIds.length > 0 ? regionGeometryIds : undefined,
      },
    };

    return { goal: goal as unknown as Record<string, unknown> };
  },
};
