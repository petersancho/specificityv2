import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";
import type { ChemistryThermalGoal } from "../../types";
import { clamp, toNumber } from "../../utils";

const toStringList = (value: unknown): string[] => {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.filter((entry): entry is string => typeof entry === "string");
};

export const ChemistryThermalGoalNode: WorkflowNodeDefinition = {
  type: "chemistryThermalGoal",
  label: "Τέλος Ῥοῆς Θερμότητος",
  shortLabel: "Therm",
  description: "Biases materials to conduct or insulate heat.",
  category: "goal",
  iconId: "goal",
  display: {
    nameGreek: "Τέλος Ῥοῆς Θερμότητος",
    nameEnglish: "Thermal Goal",
    romanization: "Télos Rhoês Thermótētos",
    description: "Biases materials to conduct or insulate heat.",
  },
  inputs: [
    {
      key: "region",
      label: "Region",
      type: "geometry",
      allowMultiple: true,
      description: "Optional geometry region for thermal bias.",
    },
    {
      key: "mode",
      label: "Mode",
      type: "string",
      description: "Thermal mode: conduct or insulate.",
    },
    {
      key: "thermalWeight",
      label: "Thermal Weight",
      type: "number",
      description: "Scaling factor for thermal conductivity bias.",
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
      description: "Chemistry thermal goal specification.",
    },
  ],
  parameters: [
    {
      key: "mode",
      label: "Mode",
      type: "select",
      defaultValue: "conduct",
      options: [
        { value: "conduct", label: "Conduct" },
        { value: "insulate", label: "Insulate" },
      ],
    },
    {
      key: "thermalWeight",
      label: "Thermal Weight",
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
    const modeRaw = String(inputs.mode ?? parameters.mode ?? "conduct").toLowerCase();
    const mode = modeRaw === "insulate" ? "insulate" : "conduct";
    const thermalWeight = clamp(
      toNumber(inputs.thermalWeight, toNumber(parameters.thermalWeight, 1)),
      0,
      5
    );
    const weight = clamp(toNumber(inputs.weight, toNumber(parameters.weight, 0.4)), 0, 1);
    const regionGeometryIds = toStringList(inputs.region);

    const goal: ChemistryThermalGoal = {
      goalType: "chemThermal",
      weight,
      geometry: { elements: [] },
      parameters: {
        mode,
        thermalWeight,
        regionGeometryIds: regionGeometryIds.length > 0 ? regionGeometryIds : undefined,
      },
    };

    return { goal };
  },
};
