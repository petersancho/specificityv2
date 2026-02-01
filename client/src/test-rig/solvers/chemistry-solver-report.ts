import type { RenderMesh, Vec3 } from "../../types";
import type { GoalSpecification } from "../../workflow/nodes/solver/types";
import type { ChemistryFixtureConfig } from "./chemistry-solver-fixtures";
import { meshBounds } from "./rig-utils";

const safeFinite = (value: number) => (Number.isFinite(value) ? value : 0);

const summarizeScalarSeries = (values: ArrayLike<number> | null | undefined) => {
  if (!values || values.length === 0) {
    return {
      count: 0,
      finiteCount: 0,
      nonFiniteCount: 0,
      min: 0,
      max: 0,
      mean: 0,
      rms: 0,
    };
  }

  let finiteCount = 0;
  let nonFiniteCount = 0;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let sumSquares = 0;
  for (let i = 0; i < values.length; i += 1) {
    const value = Number(values[i] ?? 0);
    if (!Number.isFinite(value)) {
      nonFiniteCount += 1;
      continue;
    }
    finiteCount += 1;
    if (value < min) min = value;
    if (value > max) max = value;
    sum += value;
    sumSquares += value * value;
  }

  const mean = finiteCount > 0 ? sum / finiteCount : 0;
  const rms = finiteCount > 0 ? Math.sqrt(sumSquares / finiteCount) : 0;

  return {
    count: values.length,
    finiteCount,
    nonFiniteCount,
    min: finiteCount > 0 ? min : 0,
    max: finiteCount > 0 ? max : 0,
    mean,
    rms,
  };
};

const summarizeChemistryGoals = (goals: GoalSpecification[]) =>
  goals.map((goal) => ({
    goalType: goal.goalType,
    weight: safeFinite(goal.weight),
    elementCount: goal.geometry?.elements?.length ?? 0,
    parameters: goal.parameters,
  }));

const summarizeMaterials = (materials: unknown[]) => {
  const materialNames: string[] = [];
  materials.forEach((material) => {
    if (material && typeof material === "object") {
      const name = (material as { name?: unknown }).name;
      if (typeof name === "string") {
        materialNames.push(name);
      }
    }
  });
  return {
    count: materials.length,
    names: materialNames,
  };
};

const summarizeParticles = (particles: unknown[]) => {
  if (!Array.isArray(particles) || particles.length === 0) {
    return {
      count: 0,
      materialConcentrations: {},
    };
  }

  const materialConcentrations: Record<string, { min: number; max: number; mean: number }> = {};
  const materialSums: Record<string, number> = {};
  const materialCounts: Record<string, number> = {};
  const materialMins: Record<string, number> = {};
  const materialMaxs: Record<string, number> = {};

  particles.forEach((particle) => {
    if (!particle || typeof particle !== "object") return;
    const materials = (particle as { materials?: Record<string, unknown> }).materials;
    if (!materials || typeof materials !== "object") return;

    Object.entries(materials).forEach(([name, value]) => {
      if (typeof value !== "number") return;
      if (!materialSums[name]) {
        materialSums[name] = 0;
        materialCounts[name] = 0;
        materialMins[name] = Infinity;
        materialMaxs[name] = -Infinity;
      }
      materialSums[name] += value;
      materialCounts[name] += 1;
      materialMins[name] = Math.min(materialMins[name], value);
      materialMaxs[name] = Math.max(materialMaxs[name], value);
    });
  });

  Object.keys(materialSums).forEach((name) => {
    const count = materialCounts[name] ?? 1;
    materialConcentrations[name] = {
      min: materialMins[name] ?? 0,
      max: materialMaxs[name] ?? 0,
      mean: (materialSums[name] ?? 0) / count,
    };
  });

  return {
    count: particles.length,
    materialConcentrations,
  };
};

const summarizeMaterialField = (field: unknown) => {
  if (!field || typeof field !== "object") {
    return null;
  }

  const typedField = field as {
    resolution?: { x?: number; y?: number; z?: number };
    densities?: number[];
    channels?: unknown[];
    materials?: unknown[];
  };

  const resolution = typedField.resolution;
  const densities = typedField.densities;
  const channels = typedField.channels;
  const materials = typedField.materials;

  if (!resolution || !densities || !channels || !materials) {
    return null;
  }

  const cellCount = (resolution.x ?? 0) * (resolution.y ?? 0) * (resolution.z ?? 0);

  return {
    resolution,
    cellCount,
    densityStats: summarizeScalarSeries(densities),
    channelCount: Array.isArray(channels) ? channels.length : 0,
    materialCount: Array.isArray(materials) ? materials.length : 0,
  };
};

const summarizeHistory = (history: unknown[]) => {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      entryCount: 0,
      iterations: 0,
      energyProgression: null,
    };
  }

  const energies: number[] = [];
  history.forEach((entry) => {
    if (entry && typeof entry === "object") {
      const energy = (entry as { energy?: unknown }).energy;
      if (typeof energy === "number") {
        energies.push(energy);
      }
    }
  });

  return {
    entryCount: history.length,
    iterations: history.length,
    energyProgression: energies.length > 0 ? summarizeScalarSeries(energies) : null,
  };
};

export type ChemistrySolverRunReport = {
  label: string;
  timestamp: string;
  variant: string;
  mesh: {
    vertexCount: number;
    triangleCount: number;
    bounds: { min: Vec3; max: Vec3 };
  };
  goals: ReturnType<typeof summarizeChemistryGoals>;
  config: ChemistryFixtureConfig;
  outputs: {
    status: string;
    totalEnergy: number;
    materials: ReturnType<typeof summarizeMaterials>;
    particles: ReturnType<typeof summarizeParticles>;
    materialField: ReturnType<typeof summarizeMaterialField>;
    history: ReturnType<typeof summarizeHistory>;
  };
};

export const buildChemistrySolverRunReport = (args: {
  label: string;
  timestamp?: string;
  variant: string;
  mesh: RenderMesh;
  goals: GoalSpecification[];
  config: ChemistryFixtureConfig;
  outputs: {
    status: unknown;
    totalEnergy: unknown;
    materials: unknown[];
    materialParticles: unknown[];
    materialField: unknown;
    history: unknown[];
  };
}): ChemistrySolverRunReport => {
  const { label, variant, mesh, goals, config, outputs } = args;
  const timestamp = args.timestamp ?? new Date().toISOString();
  const vertexCount = Math.floor(mesh.positions.length / 3);
  const triangleCount = Math.floor(mesh.indices.length / 3);
  const bounds = meshBounds(mesh);

  return {
    label,
    timestamp,
    variant,
    mesh: {
      vertexCount,
      triangleCount,
      bounds,
    },
    goals: summarizeChemistryGoals(goals),
    config: { ...config },
    outputs: {
      status: typeof outputs.status === "string" ? outputs.status : "unknown",
      totalEnergy: safeFinite(typeof outputs.totalEnergy === "number" ? outputs.totalEnergy : 0),
      materials: summarizeMaterials(outputs.materials),
      particles: summarizeParticles(outputs.materialParticles),
      materialField: summarizeMaterialField(outputs.materialField),
      history: summarizeHistory(outputs.history),
    },
  };
};

export const logChemistrySolverRunReport = (report: ChemistrySolverRunReport) => {
  console.log(`[CHEMISTRY] ${report.label} (${report.variant})`);
  console.log(JSON.stringify(report, null, 2));
};
