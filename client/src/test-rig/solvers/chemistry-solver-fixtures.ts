import type {
  ChemistryBlendGoal,
  ChemistryMassGoal,
  ChemistryStiffnessGoal,
  ChemistryThermalGoal,
  ChemistryTransparencyGoal,
  GoalSpecification,
} from "../../workflow/nodes/solver/types";
import type { Geometry } from "../../types";

export type ChemistryMaterial = {
  geometryId: string;
  material: { name: string; color: [number, number, number] };
  weight: number;
};

export type ChemistrySeed = {
  position: { x: number; y: number; z: number };
  material: string;
  strength: number;
  radius: number;
};

export type ChemistryFixtureVariant = "basic" | "regions" | "textInputs";

export type ChemistryFixtureConfig = {
  particleCount: number;
  particleDensity: number;
  iterations: number;
  fieldResolution: number;
  isoValue: number;
  convergenceTolerance: number;
  blendStrength: number;
  historyLimit: number;
  seed: number;
  materialOrder: string;
  seedMaterial: string;
  seedStrength: number;
  seedRadius: number;
};

export const buildChemistryMaterials = (baseGeometryId: string): ChemistryMaterial[] => [
  {
    geometryId: baseGeometryId,
    material: { name: "Steel", color: [0.75, 0.75, 0.78] },
    weight: 1,
  },
  {
    geometryId: baseGeometryId,
    material: { name: "Ceramic", color: [0.9, 0.2, 0.2] },
    weight: 0.7,
  },
  {
    geometryId: baseGeometryId,
    material: { name: "Glass", color: [0.2, 0.4, 0.9] },
    weight: 0.6,
  },
];

export const buildChemistrySeedsBasic = (): ChemistrySeed[] => [
  {
    position: { x: 0, y: 0, z: 0 },
    material: "Glass",
    strength: 0.9,
    radius: 0.4,
  },
];

export const buildChemistrySeedsRegions = (): ChemistrySeed[] => [
  { position: { x: 0, y: -0.55, z: 0 }, material: "Steel", strength: 0.9, radius: 0.35 },
  { position: { x: 0, y: 0, z: 0 }, material: "Ceramic", strength: 0.92, radius: 0.3 },
  { position: { x: 0, y: 0, z: 0.55 }, material: "Glass", strength: 0.9, radius: 0.3 },
];

export const buildChemistryGoalsBasic = (): GoalSpecification[] => {
  const blendGoal: ChemistryBlendGoal = {
    goalType: "chemBlend",
    weight: 0.55,
    geometry: { elements: [] },
    parameters: {
      smoothness: 0.75,
      diffusivity: 1.25,
    },
  };

  const massGoal: ChemistryMassGoal = {
    goalType: "chemMass",
    weight: 0.35,
    geometry: { elements: [] },
    parameters: {
      targetMassFraction: 0.6,
      densityPenalty: 1.2,
    },
  };

  const stiffnessGoal: ChemistryStiffnessGoal = {
    goalType: "chemStiffness",
    weight: 0.25,
    geometry: { elements: [] },
    parameters: {
      loadVector: { x: 0, y: 1, z: 0 },
      structuralPenalty: 1.25,
    },
  };

  return [blendGoal, massGoal, stiffnessGoal];
};

export const buildChemistryGoalsRegions = (regions: {
  anchorTop: Geometry;
  anchorBottom: Geometry;
  thermalCore: Geometry;
  visionStrip: Geometry;
}): GoalSpecification[] => {
  const blendGoal: ChemistryBlendGoal = {
    goalType: "chemBlend",
    weight: 0.55,
    geometry: { elements: [] },
    parameters: {
      smoothness: 0.75,
      diffusivity: 1.25,
    },
  };

  const massGoal: ChemistryMassGoal = {
    goalType: "chemMass",
    weight: 0.35,
    geometry: { elements: [] },
    parameters: {
      targetMassFraction: 0.6,
      densityPenalty: 1.2,
    },
  };

  const stiffnessGoal: ChemistryStiffnessGoal = {
    goalType: "chemStiffness",
    weight: 0.45,
    geometry: { elements: [] },
    parameters: {
      loadVector: { x: 0, y: 1, z: 0 },
      structuralPenalty: 1.25,
      regionGeometryIds: [regions.anchorTop.id, regions.anchorBottom.id],
    },
  };

  const transparencyGoal: ChemistryTransparencyGoal = {
    goalType: "chemTransparency",
    weight: 0.35,
    geometry: { elements: [] },
    parameters: {
      opticalWeight: 2.0,
      regionGeometryIds: [regions.visionStrip.id],
    },
  };

  const thermalGoal: ChemistryThermalGoal = {
    goalType: "chemThermal",
    weight: 0.45,
    geometry: { elements: [] },
    parameters: {
      mode: "insulate",
      thermalWeight: 2.5,
      regionGeometryIds: [regions.thermalCore.id],
    },
  };

  return [blendGoal, massGoal, stiffnessGoal, transparencyGoal, thermalGoal];
};

export const buildChemistryConfig = (): ChemistryFixtureConfig => ({
  particleCount: 6000,
  particleDensity: 1.0,
  iterations: 55,
  fieldResolution: 36,
  isoValue: 0.12,
  convergenceTolerance: 0.002,
  blendStrength: 0.7,
  historyLimit: 80,
  seed: 7,
  materialOrder: "Steel, Ceramic, Glass",
  seedMaterial: "Steel",
  seedStrength: 0.85,
  seedRadius: 0.25,
});

export const TEXT_INPUT_MATERIALS_OBJECT = [
  { material: { name: "Steel", color: [0.75, 0.75, 0.78] }, weight: 1 },
  { material: { name: "Ceramic", color: [0.9, 0.2, 0.2] }, weight: 0.7 },
  { material: { name: "Glass", color: [0.2, 0.4, 0.9] }, weight: 0.6 },
] as const;

export const TEXT_INPUT_MATERIALS = JSON.stringify(TEXT_INPUT_MATERIALS_OBJECT);
export const TEXT_INPUT_SEEDS = "0 0 0 0.6 0 0";
