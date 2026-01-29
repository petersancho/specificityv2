import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";
import type { ChemistryStiffnessGoal } from "../../types";
import { clamp, resolveVec3Input, toNumber, vectorParameterSpecs } from "../../utils";

const toStringList = (value: unknown): string[] => {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.filter((entry): entry is string => typeof entry === "string");
};

export const ChemistryStiffnessGoalNode: WorkflowNodeDefinition = {
  type: "chemistryStiffnessGoal",
  label: "Τέλος Σκληρότητος",
  shortLabel: "Stiff",
  description: "Biases high-stiffness materials toward stress-aligned regions.",
  category: "goal",
  iconId: "goal",
  display: {
    nameGreek: "Τέλος Σκληρότητος",
    nameEnglish: "Stiffness Goal",
    romanization: "Télos Sklērótētos",
    description: "Biases high-stiffness materials toward stress-aligned regions.",
  },
  inputs: [
    {
      key: "region",
      label: "Region",
      type: "geometry",
      allowMultiple: true,
      description: "Optional geometry region to focus stiffness bias.",
    },
    {
      key: "loadVector",
      label: "Load Vector",
      type: "vector",
      description: "Principal load direction used to bias stiffness.",
    },
    {
      key: "structuralPenalty",
      label: "Penalty",
      type: "number",
      description: "Scaling factor applied to stiffness bias.",
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
      description: "Chemistry stiffness goal specification.",
    },
  ],
  parameters: [
    ...vectorParameterSpecs("loadVector", "Load", { x: 0, y: -1, z: 0 }),
    {
      key: "structuralPenalty",
      label: "Structural Penalty",
      type: "number",
      defaultValue: 1,
      min: 0,
      max: 10,
      step: 0.05,
    },
    {
      key: "weight",
      label: "Weight",
      type: "number",
      defaultValue: 0.7,
      min: 0,
      max: 1,
      step: 0.05,
    },
  ],
  primaryOutputKey: "goal",
  compute: ({ inputs, parameters }) => {
    const loadVector = resolveVec3Input(
      inputs,
      parameters,
      "loadVector",
      "loadVector",
      { x: 0, y: -1, z: 0 }
    );
    const structuralPenalty = clamp(
      toNumber(inputs.structuralPenalty, toNumber(parameters.structuralPenalty, 1)),
      0,
      10
    );
    const weight = clamp(toNumber(inputs.weight, toNumber(parameters.weight, 0.7)), 0, 1);
    const regionGeometryIds = toStringList(inputs.region);

    const goal: ChemistryStiffnessGoal = {
      goalType: "chemStiffness",
      weight,
      geometry: { elements: [] },
      parameters: {
        loadVector,
        structuralPenalty,
        regionGeometryIds: regionGeometryIds.length > 0 ? regionGeometryIds : undefined,
      },
    };

    return { goal };
  },
};
