import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";

type MaterialAssignment = {
  geometryId: string;
  material: string;
  weight?: number;
};

const normalizeAssignmentEntries = (value: unknown): MaterialAssignment[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const candidate = entry as Record<string, unknown>;
        const geometryId =
          typeof candidate.geometryId === "string"
            ? candidate.geometryId
            : typeof candidate.geometry === "string"
              ? candidate.geometry
              : typeof candidate.geometryID === "string"
                ? candidate.geometryID
                : null;
        const material =
          typeof candidate.material === "string"
            ? candidate.material
            : typeof candidate.materialName === "string"
              ? candidate.materialName
              : typeof candidate.name === "string"
                ? candidate.name
                : null;
        if (!geometryId || !material) return null;
        const weight =
          typeof candidate.weight === "number"
            ? candidate.weight
            : typeof candidate.influence === "number"
              ? candidate.influence
              : typeof candidate.strength === "number"
                ? candidate.strength
                : undefined;
        return { geometryId, material, weight } satisfies MaterialAssignment;
      })
      .filter((entry): entry is MaterialAssignment => Boolean(entry));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.entries(record)
      .map(([geometryId, materialValue]) => {
        if (typeof materialValue !== "string") return null;
        return { geometryId, material: materialValue } satisfies MaterialAssignment;
      })
      .filter((entry): entry is MaterialAssignment => Boolean(entry));
  }
  return [];
};

const buildMaterialsText = (assignments: MaterialAssignment[]) => {
  if (assignments.length === 0) return "";
  const grouped = new Map<string, Set<string>>();
  assignments.forEach((assignment) => {
    const material = assignment.material.trim();
    const geometryId = assignment.geometryId.trim();
    if (!material || !geometryId) return;
    const group = grouped.get(material) ?? new Set<string>();
    group.add(geometryId);
    grouped.set(material, group);
  });
  const lines = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([material, ids]) => `${material}: ${Array.from(ids).sort().join(" ")}`);
  return lines.join("\n");
};

export const ChemistryMaterialGoalNode: WorkflowNodeDefinition = {
  type: "chemistryMaterialGoal",
  label: "Material",
  shortLabel: "Material",
  description: "Assigns materials to connected solver geometry inputs.",
  category: "goal",
  iconId: "goal",
  display: {
    nameGreek: "Ὕλη",
    nameEnglish: "Material",
    romanization: "Hýlē",
    description: "Assigns materials to connected solver geometry inputs.",
  },
  inputs: [],
  outputs: [
    {
      key: "materialsText",
      label: "Materials Text",
      type: "string",
      description: "Line-based material assignment text for the solver.",
    },
  ],
  parameters: [],
  primaryOutputKey: "materialsText",
  compute: ({ parameters }) => {
    const assignments = normalizeAssignmentEntries(parameters.assignments);
    const materialsText = buildMaterialsText(assignments);
    return { materialsText };
  },
};
