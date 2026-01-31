type ChemistryExampleScript = {
  schema: "numerica.chemistrySolverResult.v1";
  status: string;
  totalEnergy: number;
  iterationsUsed: number;
  particleCount: number;
  fieldResolution: { x: number; y: number; z: number };
  mesh: {
    vertexCount: number;
    triangleCount: number;
  };
  materials: unknown[];
  history: Array<{ iteration: number; totalEnergy: number }>;
  warnings: string[];
};

const asNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const asString = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const meshCounts = (mesh: unknown) => {
  const candidate = asObject(mesh);
  const positions = Array.isArray(candidate?.positions) ? (candidate?.positions as number[]) : [];
  const indices = Array.isArray(candidate?.indices) ? (candidate?.indices as number[]) : [];
  return {
    vertexCount: Math.floor(positions.length / 3),
    triangleCount: Math.floor(indices.length / 3),
  };
};

const readFieldResolution = (field: unknown) => {
  const candidate = asObject(field);
  const resolution = asObject(candidate?.resolution);
  return {
    x: asNumber(resolution?.x, 0),
    y: asNumber(resolution?.y, 0),
    z: asNumber(resolution?.z, 0),
  };
};

const readHistoryEntries = (history: unknown) => {
  if (!Array.isArray(history)) return [];
  return history
    .map((entry) => {
      const candidate = asObject(entry);
      if (!candidate) return null;
      return {
        iteration: Math.round(asNumber(candidate.iteration, 0)),
        totalEnergy: asNumber(candidate.totalEnergy, 0),
      };
    })
    .filter(Boolean) as Array<{ iteration: number; totalEnergy: number }>;
};

export const buildChemistrySolverExampleScript = (
  outputs: Record<string, unknown>
): { script: string; summary: ChemistryExampleScript } => {
  const diagnostics = asObject(outputs.diagnostics);
  const warningsRaw = diagnostics?.warnings;
  const warnings = Array.isArray(warningsRaw)
    ? warningsRaw
        .map((warning) => (typeof warning === "string" ? warning : null))
        .filter((warning): warning is string => Boolean(warning))
    : [];

  const particleCount = Array.isArray(outputs.materialParticles)
    ? outputs.materialParticles.length
    : 0;
  const meshSummary = meshCounts(outputs.mesh);
  const history = readHistoryEntries(outputs.history);
  const trimmedHistory = history.slice(-12);
  const fieldResolution = readFieldResolution(outputs.materialField);

  const iterationsRaw = diagnostics?.iterations;
  const iterationsNumeric = asNumber(iterationsRaw, Number.NaN);
  const iterationWarnings: string[] = [];
  const iterationsUsed = Number.isFinite(iterationsNumeric)
    ? Math.round(iterationsNumeric)
    : history.length;
  if (!Number.isFinite(iterationsNumeric) && iterationsRaw !== undefined) {
    iterationWarnings.push("diagnostics.iterations was non-numeric; using history length instead");
  }

  const extendedWarnings = [
    ...warnings,
    ...iterationWarnings,
    ...(meshSummary.vertexCount === 0 ? ["No mesh vertices in chemistry result"] : []),
    ...(fieldResolution.x === 0 && fieldResolution.y === 0 && fieldResolution.z === 0
      ? ["No field resolution data in chemistry result"]
      : []),
  ];

  const summary: ChemistryExampleScript = {
    schema: "numerica.chemistrySolverResult.v1",
    status: asString(outputs.status, "unknown"),
    totalEnergy: asNumber(outputs.totalEnergy, 0),
    iterationsUsed,
    particleCount,
    fieldResolution,
    mesh: meshSummary,
    materials: Array.isArray(outputs.materials) ? outputs.materials : [],
    history: trimmedHistory,
    warnings: extendedWarnings,
  };

  return {
    script: JSON.stringify(summary, null, 2),
    summary,
  };
};
