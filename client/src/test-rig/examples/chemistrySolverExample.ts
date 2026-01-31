import { runChemistrySolverRig } from "../solvers/solver-rigs";

type CliOptions = {
  mode: "structured" | "materialsText";
  pretty: boolean;
};

const parseArgs = (argv: string[]): CliOptions => {
  const modeArg = argv.find((arg) => arg.startsWith("--mode="));
  const modeValue = modeArg ? modeArg.split("=")[1] : null;
  const mode = modeValue === "materialsText" ? "materialsText" : "structured";
  return {
    mode,
    pretty: argv.includes("--pretty"),
  };
};

const summarizeMesh = (mesh: { positions: number[]; indices: number[]; colors?: number[] }) => {
  const vertexCount = Math.floor(mesh.positions.length / 3);
  const triangleCount = Math.floor(mesh.indices.length / 3);
  return {
    vertexCount,
    triangleCount,
    hasColors: Array.isArray(mesh.colors) && mesh.colors.length === mesh.positions.length,
  };
};

const isNodeRuntime =
  typeof window === "undefined" &&
  typeof (globalThis as unknown as Record<string, unknown>).process === "object";

if (isNodeRuntime) {
  const argv = (globalThis as unknown as { process: { argv?: string[] } }).process.argv ?? [];
  const options = parseArgs(argv.slice(2));
  const { outputs, outputGeometry, baseGeometry, regionGeometry } = runChemistrySolverRig(options.mode);

  const payload = {
    example: "chemistrySolver",
    mode: options.mode,
    domain: {
      id: baseGeometry.id,
      mesh: summarizeMesh(baseGeometry.mesh),
    },
    regions: {
      anchor: { id: regionGeometry.anchor.id, mesh: summarizeMesh(regionGeometry.anchor.mesh) },
      thermalCore: { id: regionGeometry.thermalCore.id, mesh: summarizeMesh(regionGeometry.thermalCore.mesh) },
      vision: { id: regionGeometry.vision.id, mesh: summarizeMesh(regionGeometry.vision.mesh) },
    },
    outputs: {
      geometryId: outputs.geometry,
      status: outputs.status,
      totalEnergy: outputs.totalEnergy,
      iterations: (outputs.diagnostics as { iterations?: number }).iterations ?? null,
      warnings: (outputs.diagnostics as { warnings?: unknown }).warnings ?? [],
      particles: { count: Array.isArray(outputs.materialParticles) ? outputs.materialParticles.length : 0 },
      materials: Array.isArray(outputs.materials)
        ? outputs.materials.map((material: { name: string; color: unknown }) => ({
            name: material.name,
            color: material.color,
          }))
        : [],
      field:
        outputs.materialField && typeof outputs.materialField === "object"
          ? {
              resolution: outputs.materialField.resolution,
              maxDensity: outputs.materialField.maxDensity,
              materials: outputs.materialField.materials,
            }
          : null,
      mesh: summarizeMesh(outputs.mesh as { positions: number[]; indices: number[]; colors?: number[] }),
      outputGeometry: {
        id: outputGeometry.id,
        mesh: summarizeMesh(outputGeometry.mesh),
      },
      history: Array.isArray(outputs.history) ? outputs.history : [],
      bestState:
        outputs.bestState && typeof outputs.bestState === "object"
          ? {
              iteration: outputs.bestState.iteration,
              totalEnergy: outputs.bestState.totalEnergy,
            }
          : null,
    },
  };

  console.log(JSON.stringify(payload, null, options.pretty ? 2 : undefined));
}
