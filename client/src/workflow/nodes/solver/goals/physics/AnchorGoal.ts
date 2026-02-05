import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";
import type { AnchorGoal } from "../../types";
import { toIndexList } from "../../utils";

export const AnchorGoalNode: WorkflowNodeDefinition = {
  type: "anchorGoal",
  label: "Ἄγκυρα",
  shortLabel: "Anchor",
  description: "Defines fixed boundary conditions and supports.",
  category: "goal",
  iconId: "anchorGoal",
  display: {
    nameGreek: "Ἄγκυρα",
    nameEnglish: "Anchor",
    romanization: "Ágkyra",
    description: "Defines fixed boundary conditions and supports.",
  },
  inputs: [
    {
      key: "vertices",
      label: "Vertices",
      type: "any",
      allowMultiple: true,
      required: true,
      description: "Vertex indices to anchor (fixes all DOFs).",
    },
  ],
  outputs: [
    {
      key: "goal",
      label: "Goal",
      type: "goal",
      description: "Anchor goal specification.",
    },
  ],
  parameters: [],
  primaryOutputKey: "goal",
  compute: ({ inputs }) => {
    const vertices = toIndexList(inputs.vertices);
    if (vertices.length === 0) {
      throw new Error("Anchor goal requires at least one vertex.");
    }

    const goal: AnchorGoal = {
      goalType: "anchor",
      weight: 1,
      geometry: {
        elements: vertices,
      },
      parameters: {
        fixedDOF: { x: true, y: true, z: true, rotX: true, rotY: true, rotZ: true },
        anchorType: "fixed",
      },
    };

    return { goal: goal as unknown as Record<string, unknown> };
  },
};
