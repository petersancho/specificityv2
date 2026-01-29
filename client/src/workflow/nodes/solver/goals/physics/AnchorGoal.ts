import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";
import type { AnchorGoal } from "../../types";
import { clamp, toBoolean, toIndexList, toNumber } from "../../utils";

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
      description: "Vertex indices to anchor.",
    },
    {
      key: "anchorType",
      label: "Anchor Type",
      type: "string",
      description: "Fixed, pinned, roller, or custom.",
    },
    { key: "fixX", label: "Fix X", type: "boolean" },
    { key: "fixY", label: "Fix Y", type: "boolean" },
    { key: "fixZ", label: "Fix Z", type: "boolean" },
    { key: "fixRotX", label: "Fix Rot X", type: "boolean" },
    { key: "fixRotY", label: "Fix Rot Y", type: "boolean" },
    { key: "fixRotZ", label: "Fix Rot Z", type: "boolean" },
    {
      key: "springStiffness",
      label: "Spring Stiffness",
      type: "number",
      description: "Spring stiffness (N/m) for elastic anchors.",
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
      description: "Anchor goal specification.",
    },
  ],
  parameters: [
    {
      key: "anchorType",
      label: "Anchor Type",
      type: "select",
      defaultValue: "fixed",
      options: [
        { label: "Fixed", value: "fixed" },
        { label: "Pinned", value: "pinned" },
        { label: "Roller", value: "roller" },
        { label: "Custom", value: "custom" },
      ],
    },
    { key: "fixX", label: "Fix X", type: "boolean", defaultValue: true },
    { key: "fixY", label: "Fix Y", type: "boolean", defaultValue: true },
    { key: "fixZ", label: "Fix Z", type: "boolean", defaultValue: true },
    { key: "fixRotX", label: "Fix Rot X", type: "boolean", defaultValue: false },
    { key: "fixRotY", label: "Fix Rot Y", type: "boolean", defaultValue: false },
    { key: "fixRotZ", label: "Fix Rot Z", type: "boolean", defaultValue: false },
    {
      key: "springStiffness",
      label: "Spring Stiffness (N/m)",
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
    const vertices = toIndexList(inputs.vertices);
    if (vertices.length === 0) {
      throw new Error("Anchor goal requires at least one vertex.");
    }

    const anchorTypeRaw = typeof inputs.anchorType === "string" ? inputs.anchorType : parameters.anchorType;
    const anchorType =
      anchorTypeRaw === "pinned" || anchorTypeRaw === "roller" || anchorTypeRaw === "custom"
        ? anchorTypeRaw
        : "fixed";

    let fixedDOF = {
      x: toBoolean(inputs.fixX, toBoolean(parameters.fixX, true)),
      y: toBoolean(inputs.fixY, toBoolean(parameters.fixY, true)),
      z: toBoolean(inputs.fixZ, toBoolean(parameters.fixZ, true)),
      rotX: toBoolean(inputs.fixRotX, toBoolean(parameters.fixRotX, false)),
      rotY: toBoolean(inputs.fixRotY, toBoolean(parameters.fixRotY, false)),
      rotZ: toBoolean(inputs.fixRotZ, toBoolean(parameters.fixRotZ, false)),
    };

    if (anchorType === "fixed") {
      fixedDOF = { x: true, y: true, z: true, rotX: true, rotY: true, rotZ: true };
    } else if (anchorType === "pinned") {
      fixedDOF = { x: true, y: true, z: true, rotX: false, rotY: false, rotZ: false };
    } else if (anchorType === "roller") {
      fixedDOF = { x: false, y: false, z: true, rotX: false, rotY: false, rotZ: false };
    }

    const anyFixed = Object.values(fixedDOF).some((value) => value === true);
    if (!anyFixed) {
      throw new Error("Anchor must constrain at least one degree of freedom.");
    }

    const springStiffness = toNumber(inputs.springStiffness, toNumber(parameters.springStiffness, 0));
    const weight = clamp(toNumber(inputs.weight, toNumber(parameters.weight, 1)), 0, 1);

    const goal: AnchorGoal = {
      goalType: "anchor",
      weight,
      geometry: {
        elements: vertices,
      },
      parameters: {
        fixedDOF,
        anchorType,
        springStiffness: Number.isFinite(springStiffness) && springStiffness > 0 ? springStiffness : undefined,
      },
    };

    return { goal };
  },
};
