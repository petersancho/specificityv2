import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";
import type { LoadGoal } from "../../types";
import { resolveVec3Input, toIndexList, toNumber, vectorParameterSpecs } from "../../utils";

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
      key: "applicationPoints",
      label: "Application Points",
      type: "any",
      allowMultiple: true,
      required: true,
      description: "Vertex indices where the load is applied.",
    },
    {
      key: "forceMagnitude",
      label: "Force Magnitude",
      type: "number",
      description: "Force magnitude in Newtons (N).",
    },
    {
      key: "direction",
      label: "Direction",
      type: "vector",
      description: "Load direction vector (normalized automatically).",
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
    {
      key: "forceMagnitude",
      label: "Force Magnitude (N)",
      type: "number",
      defaultValue: 1000,
      min: 0,
      step: 100,
    },
    ...vectorParameterSpecs("direction", "Direction", DEFAULT_DIRECTION),
  ],
  primaryOutputKey: "goal",
  compute: ({ inputs, parameters }) => {
    const applicationPoints = toIndexList(inputs.applicationPoints);
    if (applicationPoints.length === 0) {
      throw new Error("Load goal requires at least one application point.");
    }

    const forceMagnitude = toNumber(inputs.forceMagnitude, toNumber(parameters.forceMagnitude, 1000));
    const direction = resolveVec3Input(inputs, parameters, "direction", "direction", DEFAULT_DIRECTION);

    const length = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
    const normalized = length > 1e-9 
      ? { x: direction.x / length, y: direction.y / length, z: direction.z / length } 
      : { x: 0, y: 0, z: -1 };

    const appliedForce = {
      x: normalized.x * forceMagnitude,
      y: normalized.y * forceMagnitude,
      z: normalized.z * forceMagnitude,
    };

    const goal: LoadGoal = {
      goalType: "load",
      weight: 1,
      geometry: {
        elements: applicationPoints,
      },
      parameters: {
        force: appliedForce,
        applicationPoints,
        distributed: true,
        loadType: "static",
      },
    };

    return { goal: goal as unknown as Record<string, unknown> };
  },
};
