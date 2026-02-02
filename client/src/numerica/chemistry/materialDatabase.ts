/**
 * Material property database for chemistry solver
 * PhD-level material properties from scientific literature
 * Pure TypeScript implementation - no external dependencies
 */

import type { Material, MaterialProperties } from './materialTypes';

const defaultMaterials: Record<string, Material> = {
  // ========== CERAMICS ==========
  
  'alumina': {
    id: 'alumina',
    displayName: 'Alumina (Al₂O₃)',
    category: 'ceramic',
    description: 'Aluminum oxide ceramic, high hardness and thermal stability',
    properties: {
      density: 3950,              // kg/m³
      viscosity: 1e6,             // Pa·s (very high - solid-like)
      diffusivity: 1e-12,         // m²/s (very low - ceramic)
      youngsModulus: 370e9,       // Pa (370 GPa)
      poissonRatio: 0.22,
      thermalConductivity: 30,    // W/(m·K)
      thermalExpansion: 8.1e-6,   // 1/K
      specificHeat: 880,          // J/(kg·K)
      meltingPoint: 2345,         // K
      color: [0.95, 0.95, 0.98],  // White-ish
    },
  },
  
  'silicon_carbide': {
    id: 'silicon_carbide',
    displayName: 'Silicon Carbide (SiC)',
    category: 'ceramic',
    description: 'Silicon carbide ceramic, extreme hardness',
    properties: {
      density: 3210,
      viscosity: 1e6,
      diffusivity: 1e-12,
      youngsModulus: 410e9,       // Pa (410 GPa)
      poissonRatio: 0.14,
      thermalConductivity: 120,   // W/(m·K) - high for ceramic
      thermalExpansion: 4.0e-6,
      specificHeat: 750,
      meltingPoint: 3003,         // K
      color: [0.2, 0.25, 0.3],    // Dark gray
    },
  },
  
  'silicon_nitride': {
    id: 'silicon_nitride',
    displayName: 'Silicon Nitride (Si₃N₄)',
    category: 'ceramic',
    description: 'Silicon nitride ceramic, high fracture toughness',
    properties: {
      density: 3440,
      viscosity: 1e6,
      diffusivity: 1e-12,
      youngsModulus: 310e9,       // Pa (310 GPa)
      poissonRatio: 0.27,
      thermalConductivity: 30,
      thermalExpansion: 3.2e-6,
      specificHeat: 680,
      meltingPoint: 2173,         // K
      color: [0.4, 0.4, 0.45],    // Gray
    },
  },
  
  'zirconia': {
    id: 'zirconia',
    displayName: 'Zirconia (ZrO₂)',
    category: 'ceramic',
    description: 'Zirconium dioxide ceramic, high toughness',
    properties: {
      density: 5680,              // Heaviest ceramic
      viscosity: 1e6,
      diffusivity: 1e-12,
      youngsModulus: 210e9,       // Pa (210 GPa)
      poissonRatio: 0.31,
      thermalConductivity: 2.5,   // W/(m·K) - low
      thermalExpansion: 10.5e-6,
      specificHeat: 400,
      meltingPoint: 2988,         // K
      color: [0.98, 0.98, 0.95],  // Off-white
    },
  },
  
  // ========== METALS ==========
  
  'aluminum': {
    id: 'aluminum',
    displayName: 'Aluminum (Al)',
    category: 'metal',
    description: 'Lightweight metal, good thermal/electrical conductivity',
    properties: {
      density: 2700,              // Lightest metal here
      viscosity: 0.001,           // Pa·s (liquid-like for mixing)
      diffusivity: 1e-9,          // m²/s (moderate)
      youngsModulus: 69e9,        // Pa (69 GPa)
      poissonRatio: 0.33,
      thermalConductivity: 237,   // W/(m·K) - high
      thermalExpansion: 23.1e-6,
      specificHeat: 897,
      meltingPoint: 933,          // K
      color: [0.75, 0.75, 0.8],   // Silver-gray
    },
  },
  
  'steel': {
    id: 'steel',
    displayName: 'Steel (Carbon Steel)',
    category: 'metal',
    description: 'Iron-carbon alloy, high strength',
    properties: {
      density: 7850,              // Heavy
      viscosity: 0.001,
      diffusivity: 1e-9,
      youngsModulus: 200e9,       // Pa (200 GPa)
      poissonRatio: 0.30,
      thermalConductivity: 50,    // W/(m·K)
      thermalExpansion: 11.7e-6,
      specificHeat: 490,
      meltingPoint: 1811,         // K
      color: [0.5, 0.5, 0.55],    // Dark gray
    },
  },
  
  'titanium': {
    id: 'titanium',
    displayName: 'Titanium (Ti)',
    category: 'metal',
    description: 'Lightweight, high strength-to-weight ratio',
    properties: {
      density: 4510,
      viscosity: 0.001,
      diffusivity: 1e-9,
      youngsModulus: 116e9,       // Pa (116 GPa)
      poissonRatio: 0.32,
      thermalConductivity: 21.9,  // W/(m·K) - low for metal
      thermalExpansion: 8.6e-6,
      specificHeat: 523,
      meltingPoint: 1941,         // K
      color: [0.6, 0.6, 0.65],    // Light gray
    },
  },
  
  'copper': {
    id: 'copper',
    displayName: 'Copper (Cu)',
    category: 'metal',
    description: 'Excellent thermal/electrical conductivity',
    properties: {
      density: 8960,              // Heaviest metal here
      viscosity: 0.001,
      diffusivity: 1e-9,
      youngsModulus: 130e9,       // Pa (130 GPa)
      poissonRatio: 0.34,
      thermalConductivity: 401,   // W/(m·K) - highest
      thermalExpansion: 16.5e-6,
      specificHeat: 385,
      meltingPoint: 1358,         // K
      color: [0.72, 0.45, 0.20],  // Copper color
    },
  },
  
  // ========== GLASSES ==========
  
  'soda_lime_glass': {
    id: 'soda_lime_glass',
    displayName: 'Soda-Lime Glass',
    category: 'glass',
    description: 'Common window glass, 70% SiO₂',
    properties: {
      density: 2520,
      viscosity: 1e12,            // Pa·s (very high - glass transition)
      diffusivity: 1e-15,         // m²/s (extremely low)
      youngsModulus: 69e9,        // Pa (69 GPa)
      poissonRatio: 0.23,
      thermalConductivity: 1.05,  // W/(m·K) - low
      thermalExpansion: 9.0e-6,
      specificHeat: 840,
      meltingPoint: 1400,         // K (softening point)
      color: [0.85, 0.95, 0.95],  // Slight green tint
    },
  },
  
  'borosilicate_glass': {
    id: 'borosilicate_glass',
    displayName: 'Borosilicate Glass',
    category: 'glass',
    description: 'Low thermal expansion glass (Pyrex)',
    properties: {
      density: 2230,
      viscosity: 1e12,
      diffusivity: 1e-15,
      youngsModulus: 64e9,        // Pa (64 GPa)
      poissonRatio: 0.20,
      thermalConductivity: 1.14,
      thermalExpansion: 3.3e-6,   // Very low - thermal shock resistant
      specificHeat: 830,
      meltingPoint: 1500,         // K
      color: [0.95, 0.95, 0.98],  // Clear
    },
  },
  
  'fused_silica': {
    id: 'fused_silica',
    displayName: 'Fused Silica (SiO₂)',
    category: 'glass',
    description: 'Pure silica glass, ultra-low thermal expansion',
    properties: {
      density: 2200,              // Lightest glass
      viscosity: 1e12,
      diffusivity: 1e-15,
      youngsModulus: 73e9,        // Pa (73 GPa)
      poissonRatio: 0.17,
      thermalConductivity: 1.38,
      thermalExpansion: 0.55e-6,  // Extremely low
      specificHeat: 740,
      meltingPoint: 1986,         // K
      color: [0.98, 0.98, 1.0],   // Clear/white
    },
  },
  
  // ========== POLYMERS ==========
  
  'peek': {
    id: 'peek',
    displayName: 'PEEK (Polyetheretherketone)',
    category: 'polymer',
    description: 'High-performance thermoplastic',
    properties: {
      density: 1320,
      viscosity: 1e3,             // Pa·s (moderate - thermoplastic)
      diffusivity: 1e-10,
      youngsModulus: 3.6e9,       // Pa (3.6 GPa)
      poissonRatio: 0.40,
      thermalConductivity: 0.25,
      thermalExpansion: 47e-6,
      specificHeat: 1340,
      meltingPoint: 616,          // K
      color: [0.8, 0.75, 0.65],   // Tan
    },
  },
  
  'pla': {
    id: 'pla',
    displayName: 'PLA (Polylactic Acid)',
    category: 'polymer',
    description: 'Biodegradable thermoplastic, 3D printing',
    properties: {
      density: 1240,
      viscosity: 1e3,
      diffusivity: 1e-10,
      youngsModulus: 3.5e9,       // Pa (3.5 GPa)
      poissonRatio: 0.36,
      thermalConductivity: 0.13,
      thermalExpansion: 68e-6,
      specificHeat: 1800,
      meltingPoint: 433,          // K
      color: [0.95, 0.95, 0.9],   // Off-white
    },
  },
};

const customMaterials: Record<string, Material> = {};

export function listMaterials(): Material[] {
  return [
    ...Object.values(defaultMaterials),
    ...Object.values(customMaterials),
  ];
}

export function getMaterial(id: string): Material | undefined {
  return customMaterials[id] ?? defaultMaterials[id];
}

export function registerMaterial(material: Material): void {
  if (defaultMaterials[material.id]) {
    console.warn(`Material ${material.id} already exists in default database. Overriding with custom material.`);
  }
  customMaterials[material.id] = material;
}

export function updateMaterialProperties(
  id: string,
  patch: Partial<MaterialProperties>
): void {
  const material = getMaterial(id);
  if (!material) {
    throw new Error(`Material ${id} not found`);
  }
  
  if (defaultMaterials[id]) {
    const customCopy: Material = {
      ...defaultMaterials[id],
      properties: {
        ...defaultMaterials[id].properties,
        ...patch,
      },
    };
    customMaterials[id] = customCopy;
  } else {
    customMaterials[id].properties = {
      ...customMaterials[id].properties,
      ...patch,
    };
  }
}

export function blendMaterialProperties(
  materialIds: string[],
  concentrations: number[]
): MaterialProperties {
  if (materialIds.length !== concentrations.length) {
    throw new Error('Material IDs and concentrations must have same length');
  }
  
  const sum = concentrations.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1.0) > 1e-6) {
    throw new Error(`Concentrations must sum to 1.0, got ${sum}`);
  }
  
  const materials = materialIds.map(id => {
    const mat = getMaterial(id);
    if (!mat) throw new Error(`Material ${id} not found`);
    return mat;
  });
  
  const blended: MaterialProperties = {
    density: 0,
    viscosity: 0,
    diffusivity: 0,
    youngsModulus: 0,
    poissonRatio: 0,
    thermalConductivity: 0,
    thermalExpansion: 0,
    specificHeat: 0,
    meltingPoint: 0,
    color: [0, 0, 0],
  };
  
  for (let i = 0; i < materials.length; i++) {
    const c = concentrations[i];
    const props = materials[i].properties;
    
    blended.density += props.density * c;
    blended.viscosity += props.viscosity * c;
    blended.diffusivity += props.diffusivity * c;
    blended.youngsModulus += props.youngsModulus * c;
    blended.poissonRatio += props.poissonRatio * c;
    blended.thermalConductivity += props.thermalConductivity * c;
    blended.thermalExpansion += props.thermalExpansion * c;
    blended.specificHeat += props.specificHeat * c;
    blended.meltingPoint += props.meltingPoint * c;
    blended.color[0] += props.color[0] * c;
    blended.color[1] += props.color[1] * c;
    blended.color[2] += props.color[2] * c;
  }
  
  return blended;
}

export function getMaterialsByCategory(category: string): Material[] {
  return listMaterials().filter(m => m.category === category);
}

export function getDefaultMaterialIds(): string[] {
  return Object.keys(defaultMaterials);
}
