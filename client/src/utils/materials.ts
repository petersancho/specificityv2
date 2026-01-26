import type { Geometry, Material, MaterialAssignment } from "../types";

const MATERIAL_COLORS: Record<string, string> = {
  Mineral: "#eaeaf0",
  Metal: "#6b7280",
  Timber: "#f5f5f7",
  Glass: "#f5f5f7",
  Interior: "#eaeaf0",
  Masonry: "#eaeaf0",
  Insulation: "#f5f5f7",
  Surface: "#eaeaf0",
  default: "#eaeaf0",
};

const MATERIAL_METALNESS: Record<string, number> = {
  Metal: 0.9,
  Glass: 0.2,
  default: 0.1,
};

const MATERIAL_ROUGHNESS: Record<string, number> = {
  Metal: 0.25,
  Glass: 0.05,
  Timber: 0.65,
  Masonry: 0.7,
  Insulation: 0.85,
  default: 0.6,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const resolveMaterialAssignment = (
  geometryId: string | null | undefined,
  layerId: string | null | undefined,
  assignments: MaterialAssignment[]
) => {
  const geometryAssignment = geometryId
    ? assignments.find((assignment) => assignment.geometryId === geometryId)
    : undefined;
  const layerAssignment = layerId
    ? assignments.find(
        (assignment) =>
          assignment.layerId === layerId && assignment.geometryId == null
      )
    : undefined;
  return {
    geometryAssignment,
    layerAssignment,
    materialId: geometryAssignment?.materialId ?? layerAssignment?.materialId,
  };
};

export const resolveMaterialForGeometry = (
  geometry: Geometry | undefined,
  materials: Material[],
  assignments: MaterialAssignment[]
) => {
  if (!geometry) return materials[0];
  const { materialId } = resolveMaterialAssignment(
    geometry.id,
    geometry.layerId,
    assignments
  );
  if (!materialId) return materials[0];
  return materials.find((material) => material.id === materialId) ?? materials[0];
};

export const getMaterialStyle = (material?: Material) => {
  if (!material) {
    return { color: MATERIAL_COLORS.default, metalness: 0.1, roughness: 0.7 };
  }
  const category = material.category;
  const color = MATERIAL_COLORS[category] ?? MATERIAL_COLORS.default;
  const densityFactor = clamp(material.density_kg_m3 / 9000, 0, 1);
  const baseRoughness = MATERIAL_ROUGHNESS[category] ?? MATERIAL_ROUGHNESS.default;
  const roughness = clamp(baseRoughness + (1 - densityFactor) * 0.2, 0.05, 0.95);
  const metalness = MATERIAL_METALNESS[category] ?? MATERIAL_METALNESS.default;
  return { color, metalness, roughness };
};
