import type { WorkflowComputeContext, WorkflowValue } from "../../../nodeRegistry";
import {
  DEFAULT_MATERIAL_ORDER,
  resolveChemistryMaterialSpec,
  type ChemistryMaterialSpec,
} from "../../../../data/chemistryMaterials";
import { clamp, isFiniteNumber, toNumber } from "../utils";

export type ChemistryMaterialAssignment = {
  geometryId?: string;
  material: ChemistryMaterialSpec;
  weight?: number;
};

type Vec3Value = { x: number; y: number; z: number };

const normalizeChemistryMaterialName = (value: string) => value.trim().toLowerCase();

const coerceChemistryColor = (
  value: unknown,
  fallback: [number, number, number]
): [number, number, number] => {
  const normalizeChannel = (channel: number) => {
    const normalized = channel > 1 ? channel / 255 : channel;
    return clamp(normalized, 0, 1);
  };
  if (Array.isArray(value) && value.length >= 3) {
    const r = toNumber(value[0], fallback[0]);
    const g = toNumber(value[1], fallback[1]);
    const b = toNumber(value[2], fallback[2]);
    return [normalizeChannel(r), normalizeChannel(g), normalizeChannel(b)];
  }
  if (value && typeof value === "object") {
    const candidate = value as Partial<Vec3Value>;
    if (
      isFiniteNumber(candidate.x) &&
      isFiniteNumber(candidate.y) &&
      isFiniteNumber(candidate.z)
    ) {
      return [
        normalizeChannel(candidate.x),
        normalizeChannel(candidate.y),
        normalizeChannel(candidate.z),
      ];
    }
  }
  return fallback;
};

const coerceChemistryMaterialSpec = (
  value: unknown,
  fallbackName: string
): ChemistryMaterialSpec => {
  if (typeof value === "string") {
    return resolveChemistryMaterialSpec(value);
  }
  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    const name =
      typeof candidate.name === "string" && candidate.name.trim().length > 0
        ? candidate.name
        : fallbackName;
    const base = resolveChemistryMaterialSpec(name);
    const density = isFiniteNumber(candidate.density)
      ? candidate.density
      : base.density;
    const stiffness = isFiniteNumber(candidate.stiffness)
      ? candidate.stiffness
      : base.stiffness;
    const thermalConductivity = isFiniteNumber(candidate.thermalConductivity)
      ? candidate.thermalConductivity
      : base.thermalConductivity;
    const opticalTransmission = isFiniteNumber(candidate.opticalTransmission)
      ? clamp(candidate.opticalTransmission, 0, 1)
      : base.opticalTransmission;
    const diffusivity = isFiniteNumber(candidate.diffusivity)
      ? clamp(candidate.diffusivity, 0, 4)
      : base.diffusivity;
    const color = coerceChemistryColor(candidate.color, base.color);
    return {
      name,
      density,
      stiffness,
      thermalConductivity,
      opticalTransmission,
      diffusivity,
      color,
    };
  }
  return resolveChemistryMaterialSpec(fallbackName);
};

const parseMaterialOrder = (value: unknown) => {
  if (typeof value !== "string") return [...DEFAULT_MATERIAL_ORDER];
  const entries = value
    .split(/[,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return entries.length > 0 ? entries : [...DEFAULT_MATERIAL_ORDER];
};

const flattenWorkflowValues = (value: WorkflowValue, target: WorkflowValue[]) => {
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((entry) => flattenWorkflowValues(entry as WorkflowValue, target));
    return;
  }
  target.push(value);
};

export const parseChemistryAssignmentsFromText = (text: string) => {
  const assignments: Array<{ geometryId: string; material: string }> = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) return;
    if (trimmed.includes(":")) {
      const [materialPart, ...rest] = trimmed.split(":");
      const material = materialPart.trim();
      const ids = rest
        .join(":")
        .split(/[\s,]+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      ids.forEach((geometryId) => assignments.push({ geometryId, material }));
      return;
    }
    const separator = trimmed.includes("->")
      ? "->"
      : trimmed.includes("=")
        ? "="
        : trimmed.includes(",")
          ? ","
          : null;
    if (!separator) return;
    const [left, ...right] = trimmed.split(separator);
    const geometryId = left.trim();
    const material = right.join(separator).trim();
    if (geometryId && material) {
      assignments.push({ geometryId, material });
    }
  });
  return assignments;
};

export const resolveChemistryMaterialAssignments = (
  input: WorkflowValue | undefined,
  materialsText: string | undefined,
  parameters: Record<string, unknown>,
  context: WorkflowComputeContext,
  domainGeometryId?: string | null
) => {
  const warnings: string[] = [];
  const materialOrder = parseMaterialOrder(parameters.materialOrder);
  const defaultMaterialName = materialOrder[0] ?? "Steel";
  const inputAssignments: ChemistryMaterialAssignment[] = [];
  const textAssignments: ChemistryMaterialAssignment[] = [];
  const materialsByName = new Map<string, ChemistryMaterialSpec>();

  const addMaterial = (materialInput: unknown) => {
    const material = coerceChemistryMaterialSpec(materialInput, defaultMaterialName);
    const key = normalizeChemistryMaterialName(material.name);
    if (!materialsByName.has(key)) {
      materialsByName.set(key, material);
    }
    return material;
  };

  const pushAssignment = (
    target: ChemistryMaterialAssignment[],
    geometryId: string | undefined,
    materialInput: unknown,
    weight?: number
  ) => {
    const material = addMaterial(materialInput);
    target.push({ geometryId, material, weight });
  };

  const entries: WorkflowValue[] = [];
  flattenWorkflowValues(input ?? [], entries);
  entries.forEach((entry, index) => {
    if (entry == null) return;
    if (typeof entry === "string") {
      if (context.geometryById.has(entry)) {
        const materialName = materialOrder[index % materialOrder.length] ?? defaultMaterialName;
        pushAssignment(inputAssignments, entry, materialName);
      } else {
        pushAssignment(inputAssignments, domainGeometryId ?? undefined, entry);
      }
      return;
    }
    if (typeof entry === "object") {
      const candidate = entry as Record<string, unknown>;
      const geometryId =
        typeof candidate.geometryId === "string"
          ? candidate.geometryId
          : typeof candidate.geometry === "string"
            ? candidate.geometry
            : typeof candidate.geometryID === "string"
              ? candidate.geometryID
              : undefined;
      const materialInput =
        candidate.material ??
        candidate.materialName ??
        candidate.name ??
        defaultMaterialName;
      const weight =
        typeof candidate.weight === "number"
          ? candidate.weight
          : typeof candidate.influence === "number"
            ? candidate.influence
            : typeof candidate.strength === "number"
              ? candidate.strength
              : undefined;
      pushAssignment(
        inputAssignments,
        geometryId ?? (domainGeometryId ?? undefined),
        materialInput,
        weight
      );
    }
  });

  const resolvedText = typeof materialsText === "string" ? materialsText : "";
  if (resolvedText.trim().length > 0) {
    try {
      const parsed = JSON.parse(resolvedText) as WorkflowValue;
      const parsedEntries: WorkflowValue[] = [];
      flattenWorkflowValues(parsed, parsedEntries);
      parsedEntries.forEach((entry, index) => {
        if (entry == null) return;
        if (typeof entry === "string") {
          if (context.geometryById.has(entry)) {
            const materialName = materialOrder[index % materialOrder.length] ?? defaultMaterialName;
            pushAssignment(textAssignments, entry, materialName);
          } else {
            pushAssignment(textAssignments, domainGeometryId ?? undefined, entry);
          }
          return;
        }
        if (typeof entry === "object") {
          const candidate = entry as Record<string, unknown>;
          const geometryId =
            typeof candidate.geometryId === "string"
              ? candidate.geometryId
              : typeof candidate.geometry === "string"
                ? candidate.geometry
                : undefined;
          const materialInput =
            candidate.material ??
            candidate.materialName ??
            candidate.name ??
            defaultMaterialName;
          const weight =
            typeof candidate.weight === "number"
              ? candidate.weight
              : typeof candidate.influence === "number"
                ? candidate.influence
                : typeof candidate.strength === "number"
                  ? candidate.strength
                  : undefined;
          pushAssignment(
            textAssignments,
            geometryId ?? (domainGeometryId ?? undefined),
            materialInput,
            weight
          );
        }
      });
    } catch {
      const parsedAssignments = parseChemistryAssignmentsFromText(resolvedText);
      parsedAssignments.forEach(({ geometryId, material }) => {
        pushAssignment(textAssignments, geometryId, material);
      });
    }
  }

  const DOMAIN_ASSIGNMENT_KEY = "__chemistry_domain__";
  const normalizeAssignmentKey = (geometryId: string | undefined) =>
    geometryId ?? domainGeometryId ?? DOMAIN_ASSIGNMENT_KEY;

  let assignments: ChemistryMaterialAssignment[] = [...inputAssignments];
  if (textAssignments.length > 0) {
    const overridden = new Set(
      textAssignments.map((assignment) => normalizeAssignmentKey(assignment.geometryId))
    );
    assignments = [
      ...textAssignments,
      ...inputAssignments.filter(
        (assignment) => !overridden.has(normalizeAssignmentKey(assignment.geometryId))
      ),
    ];
  }

  if (assignments.length === 0) {
    pushAssignment(assignments, domainGeometryId ?? undefined, defaultMaterialName);
    warnings.push("No materials specified; using default material assignment.");
  }

  const materials = Array.from(materialsByName.values());
  if (materials.length === 0) {
    const fallback = resolveChemistryMaterialSpec(defaultMaterialName);
    materials.push(fallback);
  }

  return {
    assignments,
    materials,
    materialNames: materials.map((material) => material.name),
    warnings,
  };
};
