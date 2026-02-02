/**
 * Material property types for chemistry solver
 * Pure TypeScript implementation - no external dependencies
 */

export interface MaterialProperties {
  density: number;              // kg/m³
  viscosity: number;            // Pa·s (dynamic viscosity)
  diffusivity: number;          // m²/s
  youngsModulus: number;        // Pa
  poissonRatio: number;         // dimensionless (0-0.5)
  thermalConductivity: number;  // W/(m·K)
  thermalExpansion: number;     // 1/K
  specificHeat: number;         // J/(kg·K)
  meltingPoint: number;         // K
  color: [number, number, number]; // RGB (0-1)
}

export type MaterialCategory = 
  | 'ceramic'
  | 'metal'
  | 'glass'
  | 'polymer'
  | 'composite'
  | 'custom';

export interface Material {
  id: string;
  displayName: string;
  category: MaterialCategory;
  properties: MaterialProperties;
  description?: string;
}

export interface MaterialBlend {
  materials: string[];          // Material IDs
  concentrations: number[];     // Sum to 1.0
}

export interface BlendedProperties extends MaterialProperties {
  blend: MaterialBlend;
}
