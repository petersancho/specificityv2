/**
 * Chemistry Solver Semantic Metadata
 * 
 * LINGUA: Semantic understanding of chemistry solver outputs
 * 
 * This module provides semantic metadata for all chemistry solver outputs,
 * including physical units, scientific meaning, and relationships.
 */

import type { Vec3 } from "../../../../types";

// ═══════════════════════════════════════════════════════════════════════════
// PHYSICAL UNITS
// ═══════════════════════════════════════════════════════════════════════════

export type PhysicalUnit = {
  dimension: string;
  symbol: string;
  siUnit: string;
  description: string;
};

export const PHYSICAL_UNITS = {
  // Base units
  LENGTH: { dimension: "Length", symbol: "m", siUnit: "m", description: "Meter" },
  MASS: { dimension: "Mass", symbol: "kg", siUnit: "kg", description: "Kilogram" },
  TIME: { dimension: "Time", symbol: "s", siUnit: "s", description: "Second" },
  TEMPERATURE: { dimension: "Temperature", symbol: "K", siUnit: "K", description: "Kelvin" },
  
  // Derived units
  VELOCITY: { dimension: "Velocity", symbol: "m/s", siUnit: "m/s", description: "Meters per second" },
  ACCELERATION: { dimension: "Acceleration", symbol: "m/s²", siUnit: "m/s²", description: "Meters per second squared" },
  FORCE: { dimension: "Force", symbol: "N", siUnit: "N", description: "Newton (kg⋅m/s²)" },
  PRESSURE: { dimension: "Pressure", symbol: "Pa", siUnit: "Pa", description: "Pascal (N/m²)" },
  ENERGY: { dimension: "Energy", symbol: "J", siUnit: "J", description: "Joule (N⋅m)" },
  POWER: { dimension: "Power", symbol: "W", siUnit: "W", description: "Watt (J/s)" },
  DENSITY: { dimension: "Density", symbol: "kg/m³", siUnit: "kg/m³", description: "Kilograms per cubic meter" },
  VISCOSITY: { dimension: "Dynamic Viscosity", symbol: "Pa⋅s", siUnit: "Pa⋅s", description: "Pascal-second" },
  THERMAL_CONDUCTIVITY: { dimension: "Thermal Conductivity", symbol: "W/(m⋅K)", siUnit: "W/(m⋅K)", description: "Watts per meter-kelvin" },
  SPECIFIC_HEAT: { dimension: "Specific Heat", symbol: "J/(kg⋅K)", siUnit: "J/(kg⋅K)", description: "Joules per kilogram-kelvin" },
  DIFFUSIVITY: { dimension: "Diffusivity", symbol: "m²/s", siUnit: "m²/s", description: "Square meters per second" },
  
  // Dimensionless
  CONCENTRATION: { dimension: "Concentration", symbol: "—", siUnit: "—", description: "Dimensionless (0-1)" },
  FRACTION: { dimension: "Fraction", symbol: "—", siUnit: "—", description: "Dimensionless (0-1)" },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC METADATA TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type SemanticMetadata = {
  name: string;
  description: string;
  physicalMeaning: string;
  unit: PhysicalUnit;
  dataType: "scalar" | "vector" | "tensor" | "field";
  spatialDomain: "particle" | "voxel" | "global";
  temporalDomain: "instantaneous" | "time-series" | "cumulative";
  relationships: ReadonlyArray<{
    readonly relatedTo: string;
    readonly relationship: string;
  }>;
};

export type FieldSemantics = {
  field: SemanticMetadata;
  statistics: {
    mean: SemanticMetadata;
    stdDev: SemanticMetadata;
    min: SemanticMetadata;
    max: SemanticMetadata;
    histogram: SemanticMetadata;
  };
  gradients?: {
    magnitude: SemanticMetadata;
    direction: SemanticMetadata;
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export const CHEMISTRY_SEMANTICS = {
  // Particle properties
  PARTICLE_POSITION: {
    name: "Particle Position",
    description: "Spatial coordinates of particle center",
    physicalMeaning: "Location of particle in 3D Euclidean space",
    unit: PHYSICAL_UNITS.LENGTH,
    dataType: "vector" as const,
    spatialDomain: "particle" as const,
    temporalDomain: "instantaneous" as const,
    relationships: [
      { relatedTo: "PARTICLE_VELOCITY", relationship: "time derivative" },
      { relatedTo: "VOXEL_FIELD", relationship: "discretization source" },
    ],
  },
  
  PARTICLE_VELOCITY: {
    name: "Particle Velocity",
    description: "Rate of change of particle position",
    physicalMeaning: "Instantaneous velocity vector of particle motion",
    unit: PHYSICAL_UNITS.VELOCITY,
    dataType: "vector" as const,
    spatialDomain: "particle" as const,
    temporalDomain: "instantaneous" as const,
    relationships: [
      { relatedTo: "PARTICLE_POSITION", relationship: "time integral" },
      { relatedTo: "KINETIC_ENERGY", relationship: "contributes to" },
    ],
  },
  
  PARTICLE_DENSITY: {
    name: "Particle Density",
    description: "Mass per unit volume at particle location",
    physicalMeaning: "Local density computed via SPH kernel summation",
    unit: PHYSICAL_UNITS.DENSITY,
    dataType: "scalar" as const,
    spatialDomain: "particle" as const,
    temporalDomain: "instantaneous" as const,
    relationships: [
      { relatedTo: "PRESSURE", relationship: "determines via equation of state" },
      { relatedTo: "MASS_CONSERVATION", relationship: "conserved quantity" },
    ],
  },
  
  PARTICLE_PRESSURE: {
    name: "Particle Pressure",
    description: "Pressure at particle location",
    physicalMeaning: "Thermodynamic pressure from Tait equation of state",
    unit: PHYSICAL_UNITS.PRESSURE,
    dataType: "scalar" as const,
    spatialDomain: "particle" as const,
    temporalDomain: "instantaneous" as const,
    relationships: [
      { relatedTo: "PARTICLE_DENSITY", relationship: "derived from via Tait EOS" },
      { relatedTo: "PRESSURE_FORCE", relationship: "generates" },
    ],
  },
  
  MATERIAL_CONCENTRATION: {
    name: "Material Concentration",
    description: "Fraction of material at particle location",
    physicalMeaning: "Normalized material concentration (sum = 1)",
    unit: PHYSICAL_UNITS.CONCENTRATION,
    dataType: "scalar" as const,
    spatialDomain: "particle" as const,
    temporalDomain: "instantaneous" as const,
    relationships: [
      { relatedTo: "MATERIAL_DIFFUSION", relationship: "evolves via" },
      { relatedTo: "VOXEL_CONCENTRATION", relationship: "interpolated to" },
    ],
  },
  
  // Voxel field properties
  VOXEL_CONCENTRATION: {
    name: "Voxel Concentration Field",
    description: "Material concentration on regular grid",
    physicalMeaning: "Spatially discretized material distribution",
    unit: PHYSICAL_UNITS.CONCENTRATION,
    dataType: "field" as const,
    spatialDomain: "voxel" as const,
    temporalDomain: "instantaneous" as const,
    relationships: [
      { relatedTo: "MATERIAL_CONCENTRATION", relationship: "interpolated from" },
      { relatedTo: "CONCENTRATION_GRADIENT", relationship: "gradient of" },
      { relatedTo: "ISOSURFACE", relationship: "extracted from" },
    ],
  },
  
  CONCENTRATION_GRADIENT: {
    name: "Concentration Gradient",
    description: "Spatial rate of change of material concentration",
    physicalMeaning: "Vector field indicating direction of steepest concentration increase",
    unit: { dimension: "Concentration Gradient", symbol: "1/m", siUnit: "1/m", description: "Per meter" },
    dataType: "vector" as const,
    spatialDomain: "voxel" as const,
    temporalDomain: "instantaneous" as const,
    relationships: [
      { relatedTo: "VOXEL_CONCENTRATION", relationship: "gradient of" },
      { relatedTo: "DIFFUSION_FLUX", relationship: "drives" },
    ],
  },
  
  VOXEL_DENSITY: {
    name: "Voxel Density Field",
    description: "Density on regular grid",
    physicalMeaning: "Spatially discretized mass density",
    unit: PHYSICAL_UNITS.DENSITY,
    dataType: "field" as const,
    spatialDomain: "voxel" as const,
    temporalDomain: "instantaneous" as const,
    relationships: [
      { relatedTo: "PARTICLE_DENSITY", relationship: "interpolated from" },
      { relatedTo: "MASS_DISTRIBUTION", relationship: "represents" },
    ],
  },
  
  // Energy properties
  KINETIC_ENERGY: {
    name: "Kinetic Energy",
    description: "Energy of particle motion",
    physicalMeaning: "Sum of ½mv² over all particles",
    unit: PHYSICAL_UNITS.ENERGY,
    dataType: "scalar" as const,
    spatialDomain: "global" as const,
    temporalDomain: "instantaneous" as const,
    relationships: [
      { relatedTo: "PARTICLE_VELOCITY", relationship: "derived from" },
      { relatedTo: "TOTAL_ENERGY", relationship: "component of" },
    ],
  },
  
  POTENTIAL_ENERGY: {
    name: "Potential Energy",
    description: "Energy of particle configuration",
    physicalMeaning: "Energy stored in particle interactions and goal constraints",
    unit: PHYSICAL_UNITS.ENERGY,
    dataType: "scalar" as const,
    spatialDomain: "global" as const,
    temporalDomain: "instantaneous" as const,
    relationships: [
      { relatedTo: "GOAL_ENERGY", relationship: "sum of" },
      { relatedTo: "TOTAL_ENERGY", relationship: "component of" },
    ],
  },
  
  TOTAL_ENERGY: {
    name: "Total Energy",
    description: "Sum of kinetic and potential energy",
    physicalMeaning: "Total mechanical energy of the system",
    unit: PHYSICAL_UNITS.ENERGY,
    dataType: "scalar" as const,
    spatialDomain: "global" as const,
    temporalDomain: "time-series" as const,
    relationships: [
      { relatedTo: "KINETIC_ENERGY", relationship: "sum of" },
      { relatedTo: "POTENTIAL_ENERGY", relationship: "sum of" },
      { relatedTo: "ENERGY_CONSERVATION", relationship: "conserved quantity" },
    ],
  },
  
  // Conservation properties
  MASS_CONSERVATION: {
    name: "Mass Conservation",
    description: "Total mass of the system",
    physicalMeaning: "Sum of particle masses (should be constant)",
    unit: PHYSICAL_UNITS.MASS,
    dataType: "scalar" as const,
    spatialDomain: "global" as const,
    temporalDomain: "time-series" as const,
    relationships: [
      { relatedTo: "PARTICLE_DENSITY", relationship: "integral of" },
      { relatedTo: "CONSERVATION_ERROR", relationship: "validates" },
    ],
  },
  
  MOMENTUM_CONSERVATION: {
    name: "Momentum Conservation",
    description: "Total momentum of the system",
    physicalMeaning: "Sum of particle momenta (should be constant without external forces)",
    unit: { dimension: "Momentum", symbol: "kg⋅m/s", siUnit: "kg⋅m/s", description: "Kilogram-meters per second" },
    dataType: "vector" as const,
    spatialDomain: "global" as const,
    temporalDomain: "time-series" as const,
    relationships: [
      { relatedTo: "PARTICLE_VELOCITY", relationship: "derived from" },
      { relatedTo: "CONSERVATION_ERROR", relationship: "validates" },
    ],
  },
  
  ENERGY_CONSERVATION: {
    name: "Energy Conservation",
    description: "Total energy of the system",
    physicalMeaning: "Sum of kinetic and potential energy (should be constant without dissipation)",
    unit: PHYSICAL_UNITS.ENERGY,
    dataType: "scalar" as const,
    spatialDomain: "global" as const,
    temporalDomain: "time-series" as const,
    relationships: [
      { relatedTo: "TOTAL_ENERGY", relationship: "same as" },
      { relatedTo: "CONSERVATION_ERROR", relationship: "validates" },
    ],
  },
  
  // Convergence properties
  CONVERGENCE_RESIDUAL: {
    name: "Convergence Residual",
    description: "Measure of solution convergence",
    physicalMeaning: "Relative change in energy between iterations",
    unit: PHYSICAL_UNITS.FRACTION,
    dataType: "scalar" as const,
    spatialDomain: "global" as const,
    temporalDomain: "time-series" as const,
    relationships: [
      { relatedTo: "TOTAL_ENERGY", relationship: "relative change of" },
      { relatedTo: "CONVERGENCE_ACHIEVED", relationship: "determines" },
    ],
  },
  
  CONVERGENCE_RATE: {
    name: "Convergence Rate",
    description: "Rate of convergence",
    physicalMeaning: "Exponential decay rate of residual",
    unit: { dimension: "Rate", symbol: "1/iteration", siUnit: "1/iteration", description: "Per iteration" },
    dataType: "scalar" as const,
    spatialDomain: "global" as const,
    temporalDomain: "cumulative" as const,
    relationships: [
      { relatedTo: "CONVERGENCE_RESIDUAL", relationship: "decay rate of" },
      { relatedTo: "CONVERGENCE_QUALITY", relationship: "indicates" },
    ],
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// FIELD SEMANTICS
// ═══════════════════════════════════════════════════════════════════════════

export const createFieldSemantics = (
  fieldMetadata: SemanticMetadata,
  hasGradients: boolean = false
): FieldSemantics => {
  const baseUnit = fieldMetadata.unit;
  
  return {
    field: fieldMetadata,
    statistics: {
      mean: {
        ...fieldMetadata,
        name: `Mean ${fieldMetadata.name}`,
        description: `Spatial average of ${fieldMetadata.name.toLowerCase()}`,
        physicalMeaning: `Volume-weighted mean of ${fieldMetadata.physicalMeaning.toLowerCase()}`,
        dataType: "scalar",
        spatialDomain: "global",
      },
      stdDev: {
        ...fieldMetadata,
        name: `Standard Deviation of ${fieldMetadata.name}`,
        description: `Spatial standard deviation of ${fieldMetadata.name.toLowerCase()}`,
        physicalMeaning: `Root-mean-square deviation from mean ${fieldMetadata.physicalMeaning.toLowerCase()}`,
        dataType: "scalar",
        spatialDomain: "global",
      },
      min: {
        ...fieldMetadata,
        name: `Minimum ${fieldMetadata.name}`,
        description: `Minimum value of ${fieldMetadata.name.toLowerCase()}`,
        physicalMeaning: `Smallest ${fieldMetadata.physicalMeaning.toLowerCase()} in domain`,
        dataType: "scalar",
        spatialDomain: "global",
      },
      max: {
        ...fieldMetadata,
        name: `Maximum ${fieldMetadata.name}`,
        description: `Maximum value of ${fieldMetadata.name.toLowerCase()}`,
        physicalMeaning: `Largest ${fieldMetadata.physicalMeaning.toLowerCase()} in domain`,
        dataType: "scalar",
        spatialDomain: "global",
      },
      histogram: {
        ...fieldMetadata,
        name: `Histogram of ${fieldMetadata.name}`,
        description: `Distribution of ${fieldMetadata.name.toLowerCase()} values`,
        physicalMeaning: `Probability density function of ${fieldMetadata.physicalMeaning.toLowerCase()}`,
        dataType: "scalar",
        spatialDomain: "global",
        unit: PHYSICAL_UNITS.FRACTION,
      },
    },
    gradients: hasGradients ? {
      magnitude: {
        name: `${fieldMetadata.name} Gradient Magnitude`,
        description: `Magnitude of spatial gradient of ${fieldMetadata.name.toLowerCase()}`,
        physicalMeaning: `Rate of change of ${fieldMetadata.physicalMeaning.toLowerCase()}`,
        unit: {
          dimension: `${baseUnit.dimension} Gradient`,
          symbol: `${baseUnit.symbol}/m`,
          siUnit: `${baseUnit.siUnit}/m`,
          description: `${baseUnit.description} per meter`,
        },
        dataType: "scalar",
        spatialDomain: "voxel",
        temporalDomain: fieldMetadata.temporalDomain,
        relationships: [
          { relatedTo: fieldMetadata.name, relationship: "gradient magnitude of" },
        ],
      },
      direction: {
        name: `${fieldMetadata.name} Gradient Direction`,
        description: `Direction of steepest increase of ${fieldMetadata.name.toLowerCase()}`,
        physicalMeaning: `Unit vector pointing in direction of maximum ${fieldMetadata.physicalMeaning.toLowerCase()} increase`,
        unit: PHYSICAL_UNITS.FRACTION,
        dataType: "vector",
        spatialDomain: "voxel",
        temporalDomain: fieldMetadata.temporalDomain,
        relationships: [
          { relatedTo: fieldMetadata.name, relationship: "gradient direction of" },
        ],
      },
    } : undefined,
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export const validateSemanticConsistency = (
  outputs: Record<string, unknown>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check that all outputs have semantic metadata
  for (const [key, value] of Object.entries(outputs)) {
    if (value && typeof value === "object" && "semantics" in value) {
      // Valid
    } else {
      errors.push(`Output '${key}' missing semantic metadata`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════
