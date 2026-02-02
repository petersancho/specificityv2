/**
 * Chemistry Solver - Material Transmutation through Particle Simulation
 * 
 * ONTOLOGY:
 * - NUMERICA: Particle simulation, material concentrations, energy minimization
 * - ROSLYN: Voxel field visualization, isosurface extraction, material blending
 * - LINGUA: Goal specifications, material assignments, semantic constraints
 * 
 * The Chemistry Solver uses particle-based simulation to distribute materials
 * within a spatial domain according to optimization goals. Unlike physics solvers
 * that compute structural deformation, chemistry solvers compute material composition.
 */

import type { WorkflowNodeDefinition, WorkflowComputeContext, WorkflowValue } from "../../nodeRegistry";
import type { Geometry, RenderMesh, Vec3 } from "../../../types";
import type { GoalSpecification } from "./types";
import { validateChemistryGoals } from "./validation";
import { toBoolean, toNumber, isFiniteNumber, isVec3, clamp } from "./utils";
import { resolveMeshFromGeometry } from "../../../geometry/meshTessellation";
import { resolveChemistryMaterialSpec, type ChemistryMaterialSpec } from "../../../data/chemistryMaterials";
import { computeBoundsFromPositions } from "../../../geometry/bounds";
import { createSolverMetadata, attachSolverMetadata } from "../../../numerica/solverGeometry";
import { createSeededRandom, hashStringToSeed } from "../../../utils/random";
import { 
  length as lengthVec3, 
  sub as subtractVec3, 
  normalize as normalizeVec3
} from "../../../geometry/math";
import {
  type ParticleSystemConfig,
  type MaterialSpec,
  runSimulation,
  generateVoxelField,
  generateMeshFromField,
} from "./chemistry/particleSystem";

// Constants
const UNIT_Y_VEC3: Vec3 = { x: 0, y: 1, z: 0 };

// Chemistry-specific types
export type ChemistryMaterialAssignment = {
  geometryId?: string;
  material: ChemistryMaterialSpec;
  weight?: number;
};

export type ChemistrySeed = {
  position: Vec3;
  radius: number;
  material: string;
  strength: number;
};

export type ChemistryParticle = {
  position: Vec3;
  radius: number;
  materials: Record<string, number>;
};

export type ChemistryField = {
  resolution: number;
  bounds: { min: Vec3; max: Vec3 };
  cellSize: Vec3;
  data: Float32Array[];
  densities: Float32Array;
};

export type ChemistrySolverResult = {
  success: boolean;
  iterations: number;
  convergenceAchieved: boolean;
  finalEnergy: number;
  particles: ChemistryParticle[];
  field: ChemistryField | null;
  mesh: RenderMesh;
  history: Array<{ iteration: number; energy: number }>;
  bestState: { particles: ChemistryParticle[]; energy: number; iteration: number } | null;
  materials: ChemistryMaterialSpec[];
  warnings: string[];
  errors: string[];
  performanceMetrics: {
    computeTime: number;
    memoryUsed: number;
  };
};

// Helper functions
const distanceVec3 = (a: Vec3, b: Vec3) => lengthVec3(subtractVec3(a, b));

const normalizeVec3Safe = (vector: Vec3, fallback: Vec3): Vec3 => {
  const length = lengthVec3(vector);
  if (length < 1e-9) return fallback;
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
};

const createMaterialMap = (materialNames: string[]): Record<string, number> => {
  const map: Record<string, number> = {};
  materialNames.forEach((name) => {
    map[name] = 0;
  });
  return map;
};

const normalizeMaterialMap = (materials: Record<string, number>, materialNames: string[]) => {
  const total = materialNames.reduce((sum, name) => sum + (materials[name] ?? 0), 0);
  if (total < 1e-9) {
    const uniform = 1 / Math.max(1, materialNames.length);
    materialNames.forEach((name) => {
      materials[name] = uniform;
    });
    return;
  }
  materialNames.forEach((name) => {
    materials[name] = (materials[name] ?? 0) / total;
  });
};

const collectGeometryPositions = (
  geometry: Geometry,
  context: WorkflowComputeContext,
  maxSamples: number
): Vec3[] => {
  const positions: Vec3[] = [];
  
  if (geometry.type === "mesh" && geometry.mesh) {
    const mesh = geometry.mesh;
    const posArray = mesh.positions;
    const stride = Math.max(1, Math.floor(posArray.length / 3 / maxSamples));
    for (let i = 0; i < posArray.length; i += stride * 3) {
      positions.push({
        x: posArray[i],
        y: posArray[i + 1],
        z: posArray[i + 2],
      });
    }
  }
  
  return positions;
};

const computeBoundsWithFallback = (positions: Vec3[]) => {
  if (positions.length === 0) {
    return {
      min: { x: -1, y: -1, z: -1 },
      max: { x: 1, y: 1, z: 1 },
    };
  }
  return computeBoundsFromPositions(positions);
};

const normalizeVoxelBounds = (bounds: { min: Vec3; max: Vec3 }) => {
  const size = {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z,
  };
  
  const maxSize = Math.max(size.x, size.y, size.z, 1e-6);
  const padding = maxSize * 0.1;
  
  return {
    min: {
      x: bounds.min.x - padding,
      y: bounds.min.y - padding,
      z: bounds.min.z - padding,
    },
    max: {
      x: bounds.max.x + padding,
      y: bounds.max.y + padding,
      z: bounds.max.z + padding,
    },
  };
};

/**
 * Run chemistry solver with particle simulation
 * 
 * This is the core solver function that:
 * 1. Initializes particles within domain bounds
 * 2. Applies material seeds
 * 3. Runs particle simulation with goal-based forces
 * 4. Builds voxel field from particle concentrations
 * 5. Extracts isosurface mesh
 */
const runChemistrySolver = (args: {
  seedKey: string;
  domainGeometryId?: string | null;
  domainGeometry?: Geometry | null;
  goals: GoalSpecification[];
  assignments: ChemistryMaterialAssignment[];
  materials: ChemistryMaterialSpec[];
  materialNames: string[];
  seeds: ChemistrySeed[];
  particleCount: number;
  iterations: number;
  fieldResolution: number;
  isoValue: number;
  convergenceTolerance: number;
  blendStrength: number;
  historyLimit: number;
  context: WorkflowComputeContext;
}): ChemistrySolverResult => {
  const startTime = performance.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Initialize random number generator
  const random = createSeededRandom(hashStringToSeed(args.seedKey));
  
  // Resolve materials
  const materialNames = args.materialNames.length > 0 ? args.materialNames : ["Steel"];
  const materialSpecs = args.materials.length > 0 ? args.materials : [resolveChemistryMaterialSpec("Steel")];
  
  const materialByName = new Map<string, ChemistryMaterialSpec>();
  materialSpecs.forEach((material) => {
    materialByName.set(material.name, material);
  });
  materialNames.forEach((name) => {
    if (!materialByName.has(name)) {
      materialByName.set(name, resolveChemistryMaterialSpec(name));
    }
  });
  
  // Compute domain bounds
  const domainGeometry = args.domainGeometry ?? null;
  const domainPositions = domainGeometry
    ? collectGeometryPositions(domainGeometry, args.context, 20000)
    : [];
  const domainBounds = normalizeVoxelBounds(
    computeBoundsWithFallback(domainPositions)
  );
  const domainCenter = {
    x: (domainBounds.min.x + domainBounds.max.x) * 0.5,
    y: (domainBounds.min.y + domainBounds.max.y) * 0.5,
    z: (domainBounds.min.z + domainBounds.max.z) * 0.5,
  };
  const domainSize = {
    x: domainBounds.max.x - domainBounds.min.x,
    y: domainBounds.max.y - domainBounds.min.y,
    z: domainBounds.max.z - domainBounds.min.z,
  };
  const maxDimension = Math.max(domainSize.x, domainSize.y, domainSize.z, 1);
  const particleRadius = clamp(
    maxDimension / Math.cbrt(Math.max(1, args.particleCount)) * 0.35,
    maxDimension * 0.005,
    maxDimension * 0.2
  );
  
  // Initialize particles
  const assignments = args.assignments.length > 0 ? args.assignments : [{
    geometryId: args.domainGeometryId ?? undefined,
    material: resolveChemistryMaterialSpec(materialNames[0] ?? "Steel"),
  }];
  
  const weights = assignments.map((assignment) =>
    clamp(
      isFiniteNumber(assignment.weight) ? assignment.weight : 1,
      0,
      10
    )
  );
  const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
  const counts = assignments.map((assignment, index) =>
    Math.max(
      1,
      Math.floor((args.particleCount * weights[index]) / totalWeight)
    )
  );
  
  // Distribute particle counts
  let allocated = counts.reduce((sum, value) => sum + value, 0);
  let cursor = 0;
  while (allocated < args.particleCount) {
    counts[cursor % counts.length] += 1;
    allocated += 1;
    cursor += 1;
  }
  cursor = 0;
  while (allocated > args.particleCount && counts.some((count) => count > 1)) {
    const index = cursor % counts.length;
    if (counts[index] > 1) {
      counts[index] -= 1;
      allocated -= 1;
    }
    cursor += 1;
  }
  
  const randomPointInBounds = () => ({
    x: domainBounds.min.x + random() * (domainBounds.max.x - domainBounds.min.x),
    y: domainBounds.min.y + random() * (domainBounds.max.y - domainBounds.min.y),
    z: domainBounds.min.z + random() * (domainBounds.max.z - domainBounds.min.z),
  });
  
  const jitterPosition = (position: Vec3) => {
    const jitter = particleRadius * 0.4;
    return {
      x: clamp(position.x + (random() - 0.5) * jitter, domainBounds.min.x, domainBounds.max.x),
      y: clamp(position.y + (random() - 0.5) * jitter, domainBounds.min.y, domainBounds.max.y),
      z: clamp(position.z + (random() - 0.5) * jitter, domainBounds.min.z, domainBounds.max.z),
    };
  };
  
  const particles: ChemistryParticle[] = [];
  assignments.forEach((assignment, index) => {
    const count = counts[index];
    const geometry = assignment.geometryId
      ? args.context.geometryById.get(assignment.geometryId) ?? null
      : null;
    const basePositions = geometry
      ? collectGeometryPositions(geometry, args.context, Math.max(32, count))
      : [];
    const materialMap = createMaterialMap(materialNames);
    materialMap[assignment.material.name] = 1;
    for (let i = 0; i < count; i += 1) {
      const base = basePositions.length > 0
        ? basePositions[i % basePositions.length]
        : randomPointInBounds();
      particles.push({
        position: jitterPosition(base),
        radius: particleRadius,
        materials: { ...materialMap },
      });
    }
  });
  
  if (particles.length === 0) {
    warnings.push("No particles were initialized; using fallback particles.");
    const fallbackMaterial = materialNames[0] ?? "Steel";
    for (let i = 0; i < Math.max(1, args.particleCount); i += 1) {
      const materials = createMaterialMap(materialNames);
      materials[fallbackMaterial] = 1;
      particles.push({
        position: randomPointInBounds(),
        radius: particleRadius,
        materials,
      });
    }
  }
  
  // Apply seeds
  const seeds = args.seeds;
  if (seeds.length > 0) {
    seeds.forEach((seed) => {
      const materialName = materialByName.has(seed.material)
        ? seed.material
        : materialNames[0] ?? seed.material;
      particles.forEach((particle) => {
        const distance = distanceVec3(particle.position, seed.position);
        if (distance <= seed.radius) {
          particle.materials[materialName] = Math.max(
            particle.materials[materialName] ?? 0,
            seed.strength
          );
          normalizeMaterialMap(particle.materials, materialNames);
        }
      });
    });
  }
  
  // Run particle simulation
  const smoothingRadius = particleRadius * 2.5;
  const restDensity = 1000; // kg/m³
  const viscosity = 0.01;
  const timeStep = 0.016; // ~60 FPS
  
  // Build simulation config
  const simConfig: ParticleSystemConfig = {
    particleCount: particles.length,
    materialCount: materialNames.length,
    bounds: domainBounds,
    particleRadius,
    smoothingRadius,
    restDensity,
    viscosity,
    diffusionRate: args.blendStrength,
    timeStep,
    gravity: { x: 0, y: 0, z: 0 }, // No gravity for material optimization
  };
  
  // Convert materials to MaterialSpec format for simulation
  const simulationMaterials: MaterialSpec[] = Array.from(materialByName.values()).map((mat) => ({
    name: mat.name,
    density: mat.density,
    stiffness: mat.stiffness,
    thermalConductivity: mat.thermalConductivity,
    opticalTransmission: mat.opticalTransmission,
    diffusivity: mat.diffusivity ?? 0.1,
    color: mat.color,
  }));
  
  // Convert seeds to simulation format
  const simSeeds = seeds.map((seed) => {
    const materialIndex = materialNames.indexOf(seed.material);
    return {
      position: seed.position,
      radius: seed.radius,
      materialIndex: materialIndex >= 0 ? materialIndex : 0,
      strength: seed.strength,
    };
  });
  
  // Convert goals to simulation format
  const simGoals = args.goals.map((goal) => ({
    type: goal.goalType as "stiffness" | "mass" | "transparency" | "thermal" | "blend",
    weight: goal.weight ?? 1.0,
    parameters: goal.parameters ?? {},
    region: goal.geometry?.region,
  }));
  
  // Run simulation
  const simResult = runSimulation(
    simConfig,
    simulationMaterials,
    simSeeds,
    simGoals,
    args.iterations,
    args.convergenceTolerance,
    hashStringToSeed(args.seedKey)
  );
  
  // Generate voxel field from particles
  const field = generateVoxelField(
    simResult.pool,
    domainBounds,
    args.fieldResolution,
    smoothingRadius
  );
  
  // Generate mesh from voxel field
  const materialColors = materialSpecs.map((mat) => mat.color);
  const mesh = generateMeshFromField(field, args.isoValue, materialColors);
  
  // Build history
  const history = simResult.energyHistory.map((energy, index) => ({
    iteration: index,
    energy,
  }));
  
  // Find best state (lowest energy)
  let bestState: { particles: ChemistryParticle[]; energy: number; iteration: number } | null = null;
  if (history.length > 0) {
    const minEnergyIndex = simResult.energyHistory.reduce(
      (minIdx, energy, idx, arr) => (energy < arr[minIdx] ? idx : minIdx),
      0
    );
    bestState = {
      particles: particles, // TODO: Store actual best state particles
      energy: simResult.energyHistory[minEnergyIndex],
      iteration: minEnergyIndex,
    };
  }
  
  const computeTime = performance.now() - startTime;
  const memoryUsed = 
    simResult.pool.capacity * (
      3 * 4 + // positions (3 floats)
      3 * 4 + // velocities (3 floats)
      4 * 4 + // radius, mass, pressure, temperature
      materialNames.length * 4 // material concentrations
    ) / (1024 * 1024); // Convert to MB
  
  return {
    success: simResult.iterations > 0,
    iterations: simResult.iterations,
    convergenceAchieved: simResult.converged,
    finalEnergy: simResult.energy,
    particles,
    field,
    mesh,
    history,
    bestState,
    materials: Array.from(materialByName.values()),
    warnings,
    errors,
    performanceMetrics: {
      computeTime,
      memoryUsed,
    },
  };
};

/**
 * Chemistry Solver Node Definition
 * 
 * Integrates with the workflow system to provide material optimization
 * through particle-based simulation.
 */
export const ChemistrySolverNode: WorkflowNodeDefinition = {
  type: "chemistrySolver",
  label: "Ἐπιλύτης Χημείας",
  shortLabel: "Chem",
  description: "Optimizes material distribution within a domain using particle-based simulation and goal specifications.",
  category: "solver",
  semanticOps: [
    'solver.chemistry',
    'simulator.chemistry.initialize',
    'simulator.chemistry.step',
    'simulator.chemistry.converge',
    'simulator.chemistry.finalize',
    'simulator.chemistry.blendMaterials',
    'simulator.chemistry.evaluateGoals',
  ],
  iconId: "solver",
  
  display: {
    nameGreek: "Ἐπιλύτης Χημείας",
    nameEnglish: "Chemistry Solver",
    romanization: "Epilýtēs Chēmeías",
  },
  
  customUI: {
    dashboardButton: {
      label: "Open Simulator",
      component: "ChemistrySimulatorDashboard",
    },
  },
  
  inputs: [
    {
      key: "domain",
      label: "Domain",
      type: "geometry",
      required: true,
      description: "Spatial domain for material distribution.",
    },
    {
      key: "goals",
      label: "Goals",
      type: "goal",
      allowMultiple: true,
      required: false,
      description: "Chemistry optimization goals (stiffness, mass, blend, transparency, thermal).",
    },
    {
      key: "materials",
      label: "Materials",
      type: "any",
      allowMultiple: true,
      required: false,
      description: "Material specifications.",
    },
    {
      key: "seeds",
      label: "Seeds",
      type: "any",
      allowMultiple: true,
      required: false,
      description: "Material seed points.",
    },
  ],
  
  outputs: [
    {
      key: "geometry",
      label: "Geometry",
      type: "geometry",
      description: "Result geometry ID.",
    },
    {
      key: "mesh",
      label: "Mesh",
      type: "any",
      description: "Result mesh with material blending.",
    },
    {
      key: "particles",
      label: "Particles",
      type: "any",
      description: "Final particle state.",
    },
    {
      key: "field",
      label: "Field",
      type: "any",
      description: "Voxel field representation.",
    },
    {
      key: "history",
      label: "History",
      type: "any",
      description: "Energy evolution history.",
    },
    {
      key: "diagnostics",
      label: "Diagnostics",
      type: "any",
      description: "Solver diagnostics and performance metrics.",
    },
  ],
  
  parameters: [
    {
      key: "particleCount",
      label: "Particle Count",
      type: "number",
      defaultValue: 5000,
      min: 100,
      max: 100000,
      step: 100,
    },
    {
      key: "iterations",
      label: "Iterations",
      type: "number",
      defaultValue: 500,
      min: 10,
      max: 10000,
      step: 10,
    },
    {
      key: "fieldResolution",
      label: "Field Resolution",
      type: "number",
      defaultValue: 32,
      min: 8,
      max: 256,
      step: 1,
    },
    {
      key: "convergenceTolerance",
      label: "Convergence Tolerance",
      type: "number",
      defaultValue: 1e-4,
      min: 1e-8,
      max: 1e-2,
      step: 1e-5,
    },
    {
      key: "blendStrength",
      label: "Blend Strength",
      type: "number",
      defaultValue: 1,
      min: 0,
      max: 5,
      step: 0.1,
    },
  ],
  
  primaryOutputKey: "geometry",
  
  compute: ({ inputs, parameters, context }) => {
    // Validate domain input
    const domainId = typeof inputs.domain === "string" ? inputs.domain : null;
    if (!domainId) {
      throw new Error("Domain geometry is required.");
    }
    
    const domainGeometry = context.geometryById.get(domainId);
    if (!domainGeometry) {
      throw new Error("Referenced domain geometry could not be found.");
    }
    
    // Process goals
    const rawGoals = Array.isArray(inputs.goals) ? inputs.goals : inputs.goals ? [inputs.goals] : [];
    const goals = rawGoals.filter(
      (goal) =>
        Boolean(goal) && typeof goal === "object" && "goalType" in (goal as Record<string, unknown>)
    ) as unknown as GoalSpecification[];
    
    const validation = validateChemistryGoals(goals);
    if (!validation.valid) {
      throw new Error(`Goal validation failed: ${validation.errors.join(", ")}`);
    }
    
    const normalizedGoals = validation.normalizedGoals ?? goals;
    
    // Process materials
    const materialNames: string[] = [];
    const materialSpecs: ChemistryMaterialSpec[] = [];
    // TODO: Extract from inputs.materials
    
    // Process seeds
    const seeds: ChemistrySeed[] = [];
    // TODO: Extract from inputs.seeds
    
    // Process assignments
    const assignments: ChemistryMaterialAssignment[] = [];
    // TODO: Extract from inputs.materials or materialsText
    
    // Run solver
    const result = runChemistrySolver({
      seedKey: `${context.nodeId}:${domainId}`,
      domainGeometryId: domainId,
      domainGeometry,
      goals: normalizedGoals,
      assignments,
      materials: materialSpecs,
      materialNames,
      seeds,
      particleCount: Math.round(toNumber(parameters.particleCount, 5000)),
      iterations: Math.round(toNumber(parameters.iterations, 500)),
      fieldResolution: Math.round(toNumber(parameters.fieldResolution, 32)),
      isoValue: 0.5,
      convergenceTolerance: toNumber(parameters.convergenceTolerance, 1e-4),
      blendStrength: toNumber(parameters.blendStrength, 1),
      historyLimit: 1000,
      context,
    });
    
    if (!result.success) {
      throw new Error(`Chemistry solver failed: ${result.errors.join(", ")}`);
    }
    
    // Register the generated mesh as geometry with solver metadata
    const geometryId = `${context.nodeId}:chemistry-mesh:${Date.now()}`;
    
    const solverMetadata = createSolverMetadata(
      "chemistry",
      "ChemistrySolver (Apollonius)",
      result.iterations,
      result.convergenceAchieved,
      {
        goals: normalizedGoals,
        parameters: {
          maxIterations: Math.round(toNumber(parameters.iterations, 500)),
          tolerance: toNumber(parameters.convergenceTolerance, 1e-4),
          particleCount: result.particles.length,
          materialCount: result.materials.length,
        },
      }
    );
    
    const baseGeometry: Geometry = {
      id: geometryId,
      type: "mesh",
      mesh: result.mesh,
      layerId: "default",
      sourceNodeId: context.nodeId,
    };
    
    const meshGeometry = attachSolverMetadata(baseGeometry, solverMetadata);
    context.geometryById.set(geometryId, meshGeometry);
    
    return {
      geometry: geometryId,
      mesh: result.mesh,
      particles: result.particles,
      field: result.field,
      history: result.history,
      diagnostics: {
        iterations: result.iterations,
        convergence: result.convergenceAchieved,
        finalEnergy: result.finalEnergy,
        computeTime: result.performanceMetrics.computeTime,
        memoryUsed: result.performanceMetrics.memoryUsed,
        warnings: result.warnings,
        errors: result.errors,
      },
    };
  },
};
