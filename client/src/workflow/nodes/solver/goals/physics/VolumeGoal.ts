import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";
import type { VolumeGoal } from "../../types";
import { clamp, toNumber } from "../../utils";

export const VolumeGoalNode: WorkflowNodeDefinition = {
  type: "volumeGoal",
  label: "Ὄγκος",
  shortLabel: "Vol",
  description: "Constrains or targets material volume.",
  category: "goal",
  iconId: "volumeGoal",
  display: {
    nameGreek: "Ὄγκος",
    nameEnglish: "Volume",
    romanization: "Ónkos",
    description: "Constrains or targets material volume.",
  },
  inputs: [
    {
      key: "targetVolume",
      label: "Target Volume",
      type: "number",
      description: "Target volume (m³).",
    },
    {
      key: "maxVolume",
      label: "Max Volume",
      type: "number",
      description: "Maximum allowed volume (m³).",
    },
    {
      key: "minVolume",
      label: "Min Volume",
      type: "number",
      description: "Minimum allowed volume (m³).",
    },
    {
      key: "materialDensity",
      label: "Density",
      type: "number",
      description: "Material density (kg/m³).",
    },
    {
      key: "allowedDeviation",
      label: "Deviation",
      type: "number",
      description: "Allowed deviation (0-1).",
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
      description: "Volume goal specification.",
    },
  ],
  parameters: [
    {
      key: "targetVolume",
      label: "Target Volume (m³)",
      type: "number",
      defaultValue: 0,
      min: 0,
    },
    {
      key: "maxVolume",
      label: "Max Volume (m³)",
      type: "number",
      defaultValue: 0,
      min: 0,
    },
    {
      key: "minVolume",
      label: "Min Volume (m³)",
      type: "number",
      defaultValue: 0,
      min: 0,
    },
    {
      key: "materialDensity",
      label: "Material Density (kg/m³)",
      type: "number",
      defaultValue: 7850,
      min: 1,
      max: 30000,
    },
    {
      key: "allowedDeviation",
      label: "Allowed Deviation",
      type: "number",
      defaultValue: 0.05,
      min: 0,
      max: 0.5,
      step: 0.01,
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
    const targetVolumeRaw = toNumber(
      inputs.targetVolume,
      toNumber(parameters.targetVolume, Number.NaN)
    );
    const maxVolumeRaw = toNumber(
      inputs.maxVolume,
      toNumber(parameters.maxVolume, Number.NaN)
    );
    const minVolumeRaw = toNumber(
      inputs.minVolume,
      toNumber(parameters.minVolume, Number.NaN)
    );

    const targetVolume =
      Number.isFinite(targetVolumeRaw) && targetVolumeRaw > 0 ? targetVolumeRaw : undefined;
    const maxVolume =
      Number.isFinite(maxVolumeRaw) && maxVolumeRaw > 0 ? maxVolumeRaw : undefined;
    const minVolume =
      Number.isFinite(minVolumeRaw) && minVolumeRaw > 0 ? minVolumeRaw : undefined;

    if (targetVolume != null && (maxVolume != null || minVolume != null)) {
      throw new Error("Cannot specify both target volume and volume constraints.");
    }

    if (minVolume != null && maxVolume != null && minVolume > maxVolume) {
      throw new Error("Minimum volume cannot exceed maximum volume.");
    }

    const materialDensity = toNumber(inputs.materialDensity, toNumber(parameters.materialDensity, 7850));
    const allowedDeviation = clamp(
      toNumber(inputs.allowedDeviation, toNumber(parameters.allowedDeviation, 0.05)),
      0,
      0.5
    );
    const weight = clamp(toNumber(inputs.weight, toNumber(parameters.weight, 1)), 0, 1);

    const goal: VolumeGoal = {
      goalType: "volume",
      weight,
      target: targetVolume,
      constraint: {
        min: minVolume,
        max: maxVolume,
      },
      geometry: {
        elements: [],
      },
      parameters: {
        targetVolume,
        materialDensity,
        allowedDeviation,
      },
    };

    return { goal: goal as unknown as Record<string, unknown> };
  },
};
