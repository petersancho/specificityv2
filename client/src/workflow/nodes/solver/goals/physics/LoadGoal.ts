import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";
import type { LoadGoal } from "../../types";
import { clamp, resolveVec3Input, toBoolean, toIndexList, toNumber, vectorParameterSpecs } from "../../utils";

const DEFAULT_FORCE = { x: 0, y: 0, z: -1000 };
const DEFAULT_DIRECTION = { x: 0, y: 0, z: -1 };

export const LoadGoalNode: WorkflowNodeDefinition = {
  type: "loadGoal",
  label: "Βάρος",
  shortLabel: "Load",
  description: "Defines external forces applied to the structure.",
  category: "goal",
  iconId: "loadGoal",
  display: {
    nameGreek: "Βάρος",
    nameEnglish: "Load",
    romanization: "Báros",
    description: "Defines external forces applied to the structure.",
  },
  inputs: [
    {
      key: "force",
      label: "Force",
      type: "vector",
      description: "Force vector (N).",
    },
    {
      key: "forceMagnitude",
      label: "Magnitude",
      type: "number",
      description: "Force magnitude (N) overrides vector if provided.",
    },
    {
      key: "direction",
      label: "Direction",
      type: "vector",
      description: "Direction for magnitude-based loads.",
    },
    {
      key: "applicationPoints",
      label: "Application Points",
      type: "any",
      allowMultiple: true,
      description: "Vertex indices where the load is applied.",
    },
    {
      key: "distributed",
      label: "Distributed",
      type: "boolean",
      description: "Distribute load across points.",
    },
    {
      key: "loadType",
      label: "Load Type",
      type: "string",
      description: "Static, dynamic, or cyclic loading.",
    },
    {
      key: "timeProfile",
      label: "Time Profile",
      type: "any",
      description: "Time-varying load profile for dynamic loads.",
    },
    {
      key: "frequency",
      label: "Frequency",
      type: "number",
      description: "Frequency in Hz for cyclic loads.",
    },
    {
      key: "weight",
      label: "Weight",
      type: "number",
      description: "Relative importance.",
    },
  ],
  outputs: [
    {
      key: "goal",
      label: "Goal",
      type: "goal",
      description: "Load goal specification.",
    },
  ],
  parameters: [
    ...vectorParameterSpecs("force", "Force", DEFAULT_FORCE),
    {
      key: "forceMagnitude",
      label: "Force Magnitude (N)",
      type: "number",
      defaultValue: 0,
      min: 0,
    },
    ...vectorParameterSpecs("direction", "Direction", DEFAULT_DIRECTION),
    {
      key: "distributed",
      label: "Distributed",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "loadType",
      label: "Load Type",
      type: "select",
      defaultValue: "static",
      options: [
        { label: "Static", value: "static" },
        { label: "Dynamic", value: "dynamic" },
        { label: "Cyclic", value: "cyclic" },
      ],
    },
    {
      key: "frequency",
      label: "Frequency (Hz)",
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
    const applicationPoints = toIndexList(inputs.applicationPoints);
    if (applicationPoints.length === 0) {
      throw new Error("Load goal requires at least one application point.");
    }

    const forceMagnitude = toNumber(inputs.forceMagnitude, toNumber(parameters.forceMagnitude, Number.NaN));
    const direction = resolveVec3Input(inputs, parameters, "direction", "direction", DEFAULT_DIRECTION);
    const forceVector = resolveVec3Input(inputs, parameters, "force", "force", DEFAULT_FORCE);

    const finalForce = Number.isFinite(forceMagnitude) && forceMagnitude > 0
      ? {
          x: direction.x,
          y: direction.y,
          z: direction.z,
        }
      : forceVector;

    const length = Math.sqrt(finalForce.x ** 2 + finalForce.y ** 2 + finalForce.z ** 2);
    const normalized = length > 1e-9 ? { x: finalForce.x / length, y: finalForce.y / length, z: finalForce.z / length } : { x: 0, y: 0, z: 0 };
    const appliedForce = Number.isFinite(forceMagnitude) && forceMagnitude > 0
      ? { x: normalized.x * forceMagnitude, y: normalized.y * forceMagnitude, z: normalized.z * forceMagnitude }
      : finalForce;

    const distributed = toBoolean(inputs.distributed, toBoolean(parameters.distributed, false));
    const loadTypeRaw = typeof inputs.loadType === "string" ? inputs.loadType : parameters.loadType;
    const loadType = loadTypeRaw === "dynamic" || loadTypeRaw === "cyclic" ? loadTypeRaw : "static";

    const timeProfile = Array.isArray(inputs.timeProfile) ? inputs.timeProfile.map((entry) => toNumber(entry, 0)) : undefined;
    const frequency = toNumber(inputs.frequency, toNumber(parameters.frequency, Number.NaN));

    if (loadType === "dynamic" && (!timeProfile || timeProfile.length === 0)) {
      throw new Error("Dynamic loads require a time profile.");
    }

    if (loadType === "cyclic" && (!Number.isFinite(frequency) || frequency <= 0)) {
      throw new Error("Cyclic loads require a frequency specification.");
    }

    const weight = clamp(toNumber(inputs.weight, toNumber(parameters.weight, 1)), 0, 1);

    const goal: LoadGoal = {
      goalType: "load",
      weight,
      geometry: {
        elements: applicationPoints,
      },
      parameters: {
        force: appliedForce,
        applicationPoints,
        distributed,
        loadType,
        timeProfile: timeProfile && timeProfile.length > 0 ? timeProfile : undefined,
        frequency: Number.isFinite(frequency) && frequency > 0 ? frequency : undefined,
      },
    };

    return { goal: goal as unknown as Record<string, unknown> };
  },
};
