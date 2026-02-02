/**
 * Chemistry Solver Material Database
 * 
 * This file contains the material specifications for the Chemistry Solver's
 * functionally graded material optimization. Each material has physical
 * properties that influence the solver's optimization decisions.
 * 
 * Property Descriptions:
 * - density: kg/m³ (affects mass goal)
 * - stiffness: Pa (Young's modulus, affects stiffness goal)
 * - thermalConductivity: W/(m·K) (affects thermal goal)
 * - opticalTransmission: 0-1 (affects transparency goal)
 * - diffusivity: 0-4 (material mixing rate in blend goal)
 * - color: [R, G, B] normalized 0-1 (preview rendering)
 * - category: classification for UI grouping
 * - description: human-readable material description
 */

export type ChemistryMaterialCategory =
  | "metal"
  | "ceramic"
  | "glass"
  | "polymer"
  | "composite"
  | "natural"
  | "advanced";

export type ChemistryMaterialSpec = {
  name: string;
  density: number;
  stiffness: number;
  thermalConductivity: number;
  opticalTransmission: number;
  diffusivity: number;
  color: [number, number, number];
  category: ChemistryMaterialCategory;
  description: string;
};

/**
 * Comprehensive Material Library
 * 
 * Organized by category with realistic physical properties.
 * Values are placeholder approximations for demonstration.
 */
export const CHEMISTRY_MATERIAL_DATABASE: Record<string, ChemistryMaterialSpec> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // METALS - High stiffness, high density, high thermal conductivity
  // ═══════════════════════════════════════════════════════════════════════════
  
  steel: {
    name: "Steel",
    density: 7850,
    stiffness: 200e9,
    thermalConductivity: 50,
    opticalTransmission: 0,
    diffusivity: 0.18,
    color: [0.55, 0.56, 0.62],
    category: "metal",
    description: "Structural carbon steel with excellent strength-to-cost ratio",
  },
  
  stainlessSteel: {
    name: "Stainless Steel",
    density: 8000,
    stiffness: 193e9,
    thermalConductivity: 16,
    opticalTransmission: 0,
    diffusivity: 0.16,
    color: [0.68, 0.70, 0.75],
    category: "metal",
    description: "Corrosion-resistant austenitic stainless steel (304 grade)",
  },
  
  aluminum: {
    name: "Aluminum",
    density: 2700,
    stiffness: 69e9,
    thermalConductivity: 205,
    opticalTransmission: 0,
    diffusivity: 0.25,
    color: [0.78, 0.80, 0.84],
    category: "metal",
    description: "Lightweight aluminum alloy (6061-T6) for structural applications",
  },
  
  titanium: {
    name: "Titanium",
    density: 4500,
    stiffness: 116e9,
    thermalConductivity: 21,
    opticalTransmission: 0,
    diffusivity: 0.14,
    color: [0.62, 0.65, 0.70],
    category: "metal",
    description: "High strength-to-weight titanium alloy (Ti-6Al-4V)",
  },
  
  copper: {
    name: "Copper",
    density: 8960,
    stiffness: 130e9,
    thermalConductivity: 401,
    opticalTransmission: 0,
    diffusivity: 0.30,
    color: [0.85, 0.55, 0.40],
    category: "metal",
    description: "Pure copper with exceptional thermal and electrical conductivity",
  },
  
  bronze: {
    name: "Bronze",
    density: 8800,
    stiffness: 110e9,
    thermalConductivity: 50,
    opticalTransmission: 0,
    diffusivity: 0.22,
    color: [0.75, 0.55, 0.35],
    category: "metal",
    description: "Phosphor bronze alloy with excellent wear resistance",
  },
  
  brass: {
    name: "Brass",
    density: 8500,
    stiffness: 100e9,
    thermalConductivity: 109,
    opticalTransmission: 0,
    diffusivity: 0.24,
    color: [0.80, 0.70, 0.40],
    category: "metal",
    description: "Yellow brass (C26000) for architectural applications",
  },
  
  inconel: {
    name: "Inconel",
    density: 8440,
    stiffness: 214e9,
    thermalConductivity: 15,
    opticalTransmission: 0,
    diffusivity: 0.12,
    color: [0.58, 0.60, 0.65],
    category: "metal",
    description: "Nickel-chromium superalloy for extreme temperature applications",
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CERAMICS - Very high stiffness, low thermal conductivity, brittle
  // ═══════════════════════════════════════════════════════════════════════════
  
  ceramic: {
    name: "Ceramic",
    density: 3900,
    stiffness: 300e9,
    thermalConductivity: 20,
    opticalTransmission: 0.05,
    diffusivity: 0.15,
    color: [0.92, 0.90, 0.88],
    category: "ceramic",
    description: "General purpose technical ceramic for thermal applications",
  },
  
  alumina: {
    name: "Alumina",
    density: 3950,
    stiffness: 370e9,
    thermalConductivity: 25,
    opticalTransmission: 0.03,
    diffusivity: 0.14,
    color: [0.96, 0.96, 0.98],
    category: "ceramic",
    description: "Aluminum oxide (Al₂O₃) with exceptional hardness",
  },
  
  zirconia: {
    name: "Zirconia",
    density: 6000,
    stiffness: 210e9,
    thermalConductivity: 2.5,
    opticalTransmission: 0.02,
    diffusivity: 0.12,
    color: [0.98, 0.98, 1.0],
    category: "ceramic",
    description: "Yttria-stabilized zirconia with excellent thermal barrier properties",
  },
  
  siliconCarbide: {
    name: "Silicon Carbide",
    density: 3100,
    stiffness: 410e9,
    thermalConductivity: 120,
    opticalTransmission: 0.01,
    diffusivity: 0.10,
    color: [0.25, 0.28, 0.30],
    category: "ceramic",
    description: "SiC ceramic with extreme hardness and thermal conductivity",
  },
  
  siliconNitride: {
    name: "Silicon Nitride",
    density: 3200,
    stiffness: 310e9,
    thermalConductivity: 30,
    opticalTransmission: 0.01,
    diffusivity: 0.11,
    color: [0.35, 0.38, 0.42],
    category: "ceramic",
    description: "Si₃N₄ ceramic with excellent thermal shock resistance",
  },
  
  porcelain: {
    name: "Porcelain",
    density: 2400,
    stiffness: 70e9,
    thermalConductivity: 1.5,
    opticalTransmission: 0.15,
    diffusivity: 0.20,
    color: [0.95, 0.93, 0.90],
    category: "ceramic",
    description: "High-fired vitreous ceramic for architectural cladding",
  },
  
  terracotta: {
    name: "Terracotta",
    density: 1900,
    stiffness: 20e9,
    thermalConductivity: 0.8,
    opticalTransmission: 0.0,
    diffusivity: 0.25,
    color: [0.80, 0.50, 0.35],
    category: "ceramic",
    description: "Traditional fired clay ceramic for facade elements",
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GLASS - High transparency, moderate stiffness, low thermal conductivity
  // ═══════════════════════════════════════════════════════════════════════════
  
  glass: {
    name: "Glass",
    density: 2500,
    stiffness: 70e9,
    thermalConductivity: 1.0,
    opticalTransmission: 0.88,
    diffusivity: 0.35,
    color: [0.75, 0.88, 0.95],
    category: "glass",
    description: "Standard soda-lime float glass for glazing",
  },
  
  borosilicate: {
    name: "Borosilicate",
    density: 2230,
    stiffness: 64e9,
    thermalConductivity: 1.2,
    opticalTransmission: 0.92,
    diffusivity: 0.32,
    color: [0.78, 0.90, 0.96],
    category: "glass",
    description: "Low thermal expansion borosilicate glass (Pyrex-type)",
  },
  
  fusedSilica: {
    name: "Fused Silica",
    density: 2200,
    stiffness: 73e9,
    thermalConductivity: 1.4,
    opticalTransmission: 0.95,
    diffusivity: 0.30,
    color: [0.85, 0.92, 0.98],
    category: "glass",
    description: "Ultra-pure amorphous silicon dioxide for optical applications",
  },
  
  tintedGlass: {
    name: "Tinted Glass",
    density: 2500,
    stiffness: 70e9,
    thermalConductivity: 1.0,
    opticalTransmission: 0.45,
    diffusivity: 0.35,
    color: [0.40, 0.55, 0.60],
    category: "glass",
    description: "Solar control tinted glass reducing heat gain",
  },
  
  lowEGlass: {
    name: "Low-E Glass",
    density: 2500,
    stiffness: 70e9,
    thermalConductivity: 0.7,
    opticalTransmission: 0.80,
    diffusivity: 0.28,
    color: [0.72, 0.82, 0.92],
    category: "glass",
    description: "Low-emissivity coated glass for thermal insulation",
  },
  
  channeledGlass: {
    name: "Channeled Glass",
    density: 2400,
    stiffness: 65e9,
    thermalConductivity: 0.9,
    opticalTransmission: 0.60,
    diffusivity: 0.38,
    color: [0.70, 0.85, 0.90],
    category: "glass",
    description: "U-profile structural glass channel for facades",
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // POLYMERS - Lightweight, low stiffness, good insulators
  // ═══════════════════════════════════════════════════════════════════════════
  
  acrylic: {
    name: "Acrylic (PMMA)",
    density: 1180,
    stiffness: 3.2e9,
    thermalConductivity: 0.2,
    opticalTransmission: 0.92,
    diffusivity: 0.45,
    color: [0.88, 0.92, 0.95],
    category: "polymer",
    description: "Polymethyl methacrylate with excellent optical clarity",
  },
  
  polycarbonate: {
    name: "Polycarbonate",
    density: 1200,
    stiffness: 2.3e9,
    thermalConductivity: 0.2,
    opticalTransmission: 0.88,
    diffusivity: 0.48,
    color: [0.85, 0.88, 0.92],
    category: "polymer",
    description: "Impact-resistant transparent thermoplastic",
  },
  
  etfe: {
    name: "ETFE",
    density: 1700,
    stiffness: 0.8e9,
    thermalConductivity: 0.24,
    opticalTransmission: 0.95,
    diffusivity: 0.55,
    color: [0.92, 0.95, 0.98],
    category: "polymer",
    description: "Ethylene tetrafluoroethylene for pneumatic structures",
  },
  
  ptfe: {
    name: "PTFE (Teflon)",
    density: 2200,
    stiffness: 0.5e9,
    thermalConductivity: 0.25,
    opticalTransmission: 0.20,
    diffusivity: 0.40,
    color: [0.95, 0.95, 0.96],
    category: "polymer",
    description: "Polytetrafluoroethylene for tensile membrane structures",
  },
  
  silicone: {
    name: "Silicone",
    density: 1100,
    stiffness: 0.01e9,
    thermalConductivity: 0.3,
    opticalTransmission: 0.85,
    diffusivity: 0.60,
    color: [0.90, 0.92, 0.94],
    category: "polymer",
    description: "Flexible silicone rubber for seals and gaskets",
  },
  
  neoprene: {
    name: "Neoprene",
    density: 1230,
    stiffness: 0.005e9,
    thermalConductivity: 0.25,
    opticalTransmission: 0.0,
    diffusivity: 0.50,
    color: [0.15, 0.15, 0.18],
    category: "polymer",
    description: "Chloroprene rubber for weatherproof gaskets",
  },
  
  epdm: {
    name: "EPDM Rubber",
    density: 860,
    stiffness: 0.008e9,
    thermalConductivity: 0.25,
    opticalTransmission: 0.0,
    diffusivity: 0.55,
    color: [0.10, 0.10, 0.12],
    category: "polymer",
    description: "Ethylene propylene diene monomer for sealing profiles",
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COMPOSITES - Engineered combinations with tailored properties
  // ═══════════════════════════════════════════════════════════════════════════
  
  carbonFiber: {
    name: "Carbon Fiber",
    density: 1600,
    stiffness: 230e9,
    thermalConductivity: 10,
    opticalTransmission: 0.0,
    diffusivity: 0.08,
    color: [0.12, 0.12, 0.15],
    category: "composite",
    description: "Carbon fiber reinforced polymer with exceptional stiffness",
  },
  
  fiberglass: {
    name: "Fiberglass (GFRP)",
    density: 1800,
    stiffness: 35e9,
    thermalConductivity: 0.3,
    opticalTransmission: 0.40,
    diffusivity: 0.22,
    color: [0.82, 0.85, 0.75],
    category: "composite",
    description: "Glass fiber reinforced polymer for structural panels",
  },
  
  aluminumHoneycomb: {
    name: "Aluminum Honeycomb",
    density: 50,
    stiffness: 1.5e9,
    thermalConductivity: 5,
    opticalTransmission: 0.0,
    diffusivity: 0.35,
    color: [0.75, 0.78, 0.82],
    category: "composite",
    description: "Lightweight honeycomb core for sandwich panels",
  },
  
  grp: {
    name: "GRP Panel",
    density: 1900,
    stiffness: 25e9,
    thermalConductivity: 0.4,
    opticalTransmission: 0.30,
    diffusivity: 0.25,
    color: [0.88, 0.90, 0.85],
    category: "composite",
    description: "Glass reinforced plastic for cladding panels",
  },
  
  phenolicFoam: {
    name: "Phenolic Foam",
    density: 35,
    stiffness: 0.01e9,
    thermalConductivity: 0.022,
    opticalTransmission: 0.0,
    diffusivity: 0.70,
    color: [0.85, 0.75, 0.55],
    category: "composite",
    description: "Closed-cell phenolic insulation foam",
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NATURAL MATERIALS - Sustainable, variable properties
  // ═══════════════════════════════════════════════════════════════════════════
  
  oak: {
    name: "Oak",
    density: 750,
    stiffness: 12e9,
    thermalConductivity: 0.17,
    opticalTransmission: 0.0,
    diffusivity: 0.35,
    color: [0.65, 0.50, 0.35],
    category: "natural",
    description: "European white oak for structural timber",
  },
  
  bamboo: {
    name: "Bamboo",
    density: 700,
    stiffness: 20e9,
    thermalConductivity: 0.15,
    opticalTransmission: 0.0,
    diffusivity: 0.40,
    color: [0.78, 0.72, 0.50],
    category: "natural",
    description: "Laminated bamboo for sustainable construction",
  },
  
  cork: {
    name: "Cork",
    density: 120,
    stiffness: 0.02e9,
    thermalConductivity: 0.04,
    opticalTransmission: 0.0,
    diffusivity: 0.65,
    color: [0.75, 0.60, 0.45],
    category: "natural",
    description: "Natural cork for acoustic and thermal insulation",
  },
  
  limestone: {
    name: "Limestone",
    density: 2700,
    stiffness: 50e9,
    thermalConductivity: 1.5,
    opticalTransmission: 0.0,
    diffusivity: 0.15,
    color: [0.88, 0.85, 0.78],
    category: "natural",
    description: "Natural limestone for cladding and paving",
  },
  
  granite: {
    name: "Granite",
    density: 2750,
    stiffness: 70e9,
    thermalConductivity: 3.0,
    opticalTransmission: 0.0,
    diffusivity: 0.12,
    color: [0.55, 0.52, 0.50],
    category: "natural",
    description: "Natural granite for high-durability surfaces",
  },
  
  marble: {
    name: "Marble",
    density: 2700,
    stiffness: 55e9,
    thermalConductivity: 2.5,
    opticalTransmission: 0.02,
    diffusivity: 0.14,
    color: [0.95, 0.93, 0.90],
    category: "natural",
    description: "Natural marble with translucent veining",
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ADVANCED MATERIALS - Cutting-edge engineered materials
  // ═══════════════════════════════════════════════════════════════════════════
  
  aerogel: {
    name: "Aerogel",
    density: 3,
    stiffness: 0.001e9,
    thermalConductivity: 0.015,
    opticalTransmission: 0.75,
    diffusivity: 0.90,
    color: [0.80, 0.88, 0.95],
    category: "advanced",
    description: "Ultra-low density silica aerogel for thermal insulation",
  },
  
  graphene: {
    name: "Graphene Composite",
    density: 2200,
    stiffness: 1000e9,
    thermalConductivity: 5000,
    opticalTransmission: 0.02,
    diffusivity: 0.05,
    color: [0.15, 0.15, 0.18],
    category: "advanced",
    description: "Graphene-enhanced composite with extreme properties",
  },
  
  shapememory: {
    name: "Shape Memory Alloy",
    density: 6450,
    stiffness: 83e9,
    thermalConductivity: 18,
    opticalTransmission: 0.0,
    diffusivity: 0.08,
    color: [0.60, 0.62, 0.68],
    category: "advanced",
    description: "Nitinol alloy with thermomechanical shape recovery",
  },
  
  vacuumPanel: {
    name: "Vacuum Insulation Panel",
    density: 200,
    stiffness: 0.5e9,
    thermalConductivity: 0.004,
    opticalTransmission: 0.0,
    diffusivity: 0.05,
    color: [0.90, 0.90, 0.92],
    category: "advanced",
    description: "VIP with microporous silica core for super-insulation",
  },
  
  phaseChange: {
    name: "Phase Change Material",
    density: 800,
    stiffness: 0.1e9,
    thermalConductivity: 0.5,
    opticalTransmission: 0.0,
    diffusivity: 0.80,
    color: [0.70, 0.78, 0.85],
    category: "advanced",
    description: "PCM encapsulated for thermal energy storage",
  },
  
  electrochromic: {
    name: "Electrochromic Glass",
    density: 2600,
    stiffness: 70e9,
    thermalConductivity: 1.0,
    opticalTransmission: 0.65,
    diffusivity: 0.25,
    color: [0.55, 0.65, 0.80],
    category: "advanced",
    description: "Switchable smart glass with variable tint",
  },
};

/**
 * Get all materials grouped by category
 */
export const getMaterialsByCategory = (): Map<ChemistryMaterialCategory, ChemistryMaterialSpec[]> => {
  const grouped = new Map<ChemistryMaterialCategory, ChemistryMaterialSpec[]>();
  Object.values(CHEMISTRY_MATERIAL_DATABASE).forEach((material) => {
    const list = grouped.get(material.category) ?? [];
    list.push(material);
    grouped.set(material.category, list);
  });
  return grouped;
};

/**
 * Get material by name (case-insensitive)
 */
export const getMaterialByName = (name: string): ChemistryMaterialSpec | null => {
  const normalized = name.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const key = Object.keys(CHEMISTRY_MATERIAL_DATABASE).find(
    (k) => k.toLowerCase() === normalized
  );
  return key ? CHEMISTRY_MATERIAL_DATABASE[key] : null;
};

/**
 * Resolve material spec by name with fallback to Steel
 */
export const resolveChemistryMaterialSpec = (name: string): ChemistryMaterialSpec => {
  const material = getMaterialByName(name);
  if (material) {
    return material;
  }
  return CHEMISTRY_MATERIAL_DATABASE.steel;
};

/**
 * Category display information
 */
export const CATEGORY_INFO: Record<ChemistryMaterialCategory, { label: string; color: string }> = {
  metal: { label: "Metals", color: "#6B7280" },
  ceramic: { label: "Ceramics", color: "#F59E0B" },
  glass: { label: "Glass", color: "#3B82F6" },
  polymer: { label: "Polymers", color: "#10B981" },
  composite: { label: "Composites", color: "#8B5CF6" },
  natural: { label: "Natural", color: "#84CC16" },
  advanced: { label: "Advanced", color: "#EC4899" },
};

/**
 * Default material order for the solver
 */
export const DEFAULT_MATERIAL_ORDER = ["Steel", "Ceramic", "Glass"];

/**
 * Compute blended color from material concentrations
 */
export const blendMaterialColors = (
  materials: Record<string, number>,
  specs: Map<string, ChemistryMaterialSpec>
): [number, number, number] => {
  let r = 0, g = 0, b = 0;
  let totalWeight = 0;
  
  Object.entries(materials).forEach(([name, concentration]) => {
    const spec = specs.get(name);
    if (spec && concentration > 0) {
      r += spec.color[0] * concentration;
      g += spec.color[1] * concentration;
      b += spec.color[2] * concentration;
      totalWeight += concentration;
    }
  });
  
  if (totalWeight > 0) {
    r /= totalWeight;
    g /= totalWeight;
    b /= totalWeight;
  }
  
  return [
    Math.max(0, Math.min(1, r)),
    Math.max(0, Math.min(1, g)),
    Math.max(0, Math.min(1, b)),
  ];
};
