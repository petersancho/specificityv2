import { generateReport, logValidation, resetValidationLog } from "./validation-log";
import {
  runBiologicalSolverRig,
  runChemistrySolverRig,
  runPhysicsSolverRig,
  runTopologySolverRig,
} from "../solvers/solver-rigs";
import { buildPhysicsSolverRunReport } from "../solvers/physics-solver-report";
import type { RenderMesh } from "../../types";

const CATEGORY = "solvers";

const nowTimestamp = () => new Date().toISOString();

const ensure = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const ensureFinite = (value: number, message: string) => {
  ensure(Number.isFinite(value), message);
};

const ensureMesh = (mesh: RenderMesh, label: string) => {
  ensure(mesh.positions.length > 0, `${label}: positions empty`);
  ensure(mesh.indices.length > 0, `${label}: indices empty`);
};

const ensureStressColors = (mesh: RenderMesh, label: string) => {
  ensure(Array.isArray(mesh.colors), `${label}: stress colors missing`);
  ensure(
    (mesh.colors ?? []).length === mesh.positions.length,
    `${label}: stress colors length mismatch`
  );
};

// Shared tolerance parameters for voxel-based solvers; adjust with care.
const MIN_VOLUME_TOLERANCE = 0.05;
const RESOLUTION_TOLERANCE_SCALE = 0.8;

// Allow tiny numerical drift from [0, 1] due to floating point error.
const DENSITY_EPS = 1e-5;

const computeVolumeToleranceForResolution = (res: number) =>
  Math.max(MIN_VOLUME_TOLERANCE, RESOLUTION_TOLERANCE_SCALE / Math.max(1, res));

const validateVoxelGridConsistency = (
  label: string,
  outputs: {
    voxelGrid: { densities: number[]; resolution: unknown } | null;
    densityField: number[];
    resolution: number;
  },
  parameters: { volumeFraction: number }
) => {
  // Assumes the topology/voxel solvers emit a cubic grid where:
  // - `outputs.resolution` matches `voxelGrid.resolution.{x,y,z}`
  // - `densities.length === res^3`
  // - density bounds allow `DENSITY_EPS` drift around [0, 1]
  // - volume fraction tolerance uses inclusive `<=`
  const eps = DENSITY_EPS;

  ensure(
    typeof outputs.resolution === "number" && Number.isFinite(outputs.resolution),
    `${label}: expected resolution to be a finite number`
  );
  ensure(outputs.resolution > 0, `${label}: expected resolution > 0`);
  const res = Math.round(outputs.resolution);
  ensure(
    Math.abs(outputs.resolution - res) < 1e-6,
    `${label}: expected resolution to be an integer (got ${outputs.resolution})`
  );
  ensure(outputs.voxelGrid !== null, `${label}: expected voxel grid output`);

  const densities = outputs.voxelGrid.densities;
  ensure(Array.isArray(densities) && densities.length > 0, `${label}: expected density data`);

  const gridResolution = outputs.voxelGrid.resolution as unknown;
  ensure(
    gridResolution !== null && typeof gridResolution === "object",
    `${label}: expected voxelGrid resolution object`
  );
  const { x, y, z } = gridResolution as {
    x?: unknown;
    y?: unknown;
    z?: unknown;
  };
  ensure(
    typeof x === "number" && Number.isFinite(x) &&
      typeof y === "number" && Number.isFinite(y) &&
      typeof z === "number" && Number.isFinite(z),
    `${label}: expected voxelGrid resolution components to be finite numbers`
  );
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rz = Math.round(z);
  ensure(
    Math.abs(x - rx) < 1e-6 && Math.abs(y - ry) < 1e-6 && Math.abs(z - rz) < 1e-6,
    `${label}: expected voxelGrid resolution components to be integers (x=${x}, y=${y}, z=${z})`
  );
  ensure(rx > 0 && ry > 0 && rz > 0, `${label}: expected voxelGrid resolution > 0`);
  ensure(
    rx === ry && ry === rz,
    `${label}: expected voxelGrid resolution to be cubic (x=${rx}, y=${ry}, z=${rz})`
  );
  ensure(
    res === rx,
    `${label}: expected resolution (${res}) to match voxelGrid resolution.x (${rx})`
  );

  ensure(densities.length === outputs.densityField.length, `${label}: expected density field to match grid`);
  ensure(densities.length === res * res * res, `${label}: expected density length to match resolution`);

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let mean = 0;
  densities.forEach((value) => {
    min = Math.min(min, value);
    max = Math.max(max, value);
    mean += value;
  });
  mean /= Math.max(1, densities.length);

  ensure(Number.isFinite(min) && Number.isFinite(max), `${label}: expected finite density bounds`);
  ensure(
    min >= -eps && max <= 1 + eps,
    `${label}: expected density values ~[0, 1] within eps=${eps} (min=${min.toFixed(6)}, max=${max.toFixed(6)})`
  );

  const volumeTolerance = computeVolumeToleranceForResolution(res);
  ensure(
    Math.abs(mean - parameters.volumeFraction) <= volumeTolerance,
    `${label}: expected mean density ~ volume fraction (mean=${mean.toFixed(6)}, target=${parameters.volumeFraction.toFixed(6)}, tolerance=${volumeTolerance.toFixed(6)})`
  );

  return res;
};

const runNodeValidation = (nodeName: string, fn: () => void) => {
  try {
    fn();
    logValidation({
      category: CATEGORY,
      nodeName,
      status: "PASS",
      timestamp: nowTimestamp(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logValidation({
      category: CATEGORY,
      nodeName,
      status: "FAIL",
      error: message,
      timestamp: nowTimestamp(),
    });
  }
};

const validatePhysicsStatic = () => {
  const { outputs, outputGeometry, baseGeometry, goals, config } = runPhysicsSolverRig("static");
  const baseVertexCount = Math.floor(baseGeometry.mesh.positions.length / 3);
  ensure(outputs.geometry === "physics-static-out", "Expected geometry id to match");
  ensure(outputs.result.success === true, "Expected physics solver success");
  ensure(outputs.animation === null, "Expected no animation for static analysis");
  ensure(Array.isArray(outputs.displacements), "Expected displacements array");
  ensure(outputs.displacements.length === baseVertexCount, "Expected displacement per vertex");
  ensure(Array.isArray(outputs.stressField), "Expected stress field array");
  ensureFinite(outputs.result.finalObjectiveValue, "Expected finite objective value");
  ensureMesh(outputs.mesh as RenderMesh, "physics static mesh");
  ensureMesh(outputGeometry.mesh, "physics static geometry");
  ensureStressColors(outputGeometry.mesh, "physics static geometry");

  const report = buildPhysicsSolverRunReport({
    label: "validation/physics/static",
    computeMode: "cpu",
    mesh: baseGeometry.mesh,
    goals,
    config,
    result: outputs.result,
  });
  ensure(
    report.stats.displacements.nonFiniteCount === 0,
    "Expected finite displacements"
  );
  ensure(
    report.stats.stressField.nonFiniteCount === 0,
    "Expected finite stress field"
  );
};

const validatePhysicsDynamic = () => {
  const { outputs, outputGeometry, baseGeometry, parameters, goals, config } = runPhysicsSolverRig("dynamic");
  const baseVertexCount = Math.floor(baseGeometry.mesh.positions.length / 3);
  ensure(outputs.geometry === "physics-dynamic-out", "Expected geometry id to match");
  ensure(outputs.result.success === true, "Expected physics solver success");
  ensure(outputs.result.iterations === parameters.animationFrames, "Expected iterations to match frames");
  ensure(outputs.animation !== null, "Expected animation for dynamic analysis");
  ensure(outputs.animation.frames.length === parameters.animationFrames, "Expected frame count");
  ensure(outputs.animation.timeStamps.length === parameters.animationFrames, "Expected timestamp count");
  ensure(outputs.displacements.length === baseVertexCount, "Expected displacement per vertex");
  ensureMesh(outputs.mesh as RenderMesh, "physics dynamic mesh");
  ensureMesh(outputGeometry.mesh, "physics dynamic geometry");
  ensureStressColors(outputGeometry.mesh, "physics dynamic geometry");

  const report = buildPhysicsSolverRunReport({
    label: "validation/physics/dynamic",
    computeMode: "cpu",
    mesh: baseGeometry.mesh,
    goals,
    config,
    result: outputs.result,
  });
  ensure(
    report.stats.displacements.nonFiniteCount === 0,
    "Expected finite displacements"
  );
};

const validatePhysicsModal = () => {
  const { outputs, outputGeometry, baseGeometry, goals, config } = runPhysicsSolverRig("modal");
  ensure(outputs.geometry === "physics-modal-out", "Expected geometry id to match");
  ensure(outputs.result.success === true, "Expected physics solver success");
  ensure(outputs.animation !== null, "Expected animation for modal analysis");
  ensure(outputs.animation.frames.length > 0, "Expected modal frames");
  ensureMesh(outputs.mesh as RenderMesh, "physics modal mesh");
  ensureMesh(outputGeometry.mesh, "physics modal geometry");
  ensureStressColors(outputGeometry.mesh, "physics modal geometry");

  const report = buildPhysicsSolverRunReport({
    label: "validation/physics/modal",
    computeMode: "cpu",
    mesh: baseGeometry.mesh,
    goals,
    config,
    result: outputs.result,
  });
  ensure(
    report.stats.displacements.nonFiniteCount === 0,
    "Expected finite displacements"
  );
};

const validateTopologySolver = () => {
  const { outputs, isoOutputs, outputGeometry, parameters } = runTopologySolverRig("topologySolver");
  ensure(outputs.status === "complete", "Expected topology solver complete");
  ensure(Array.isArray(outputs.densityField), "Expected density field array");
  ensure(outputs.densityField.length > 0, "Expected density field data");
  ensure(outputs.voxelGrid !== null, "Expected voxel grid output");
  ensure(outputs.resolution > 0, "Expected resolution > 0");
  ensureFinite(outputs.objective, "Expected objective to be finite");
  ensureFinite(outputs.constraint, "Expected constraint to be finite");
  ensure(outputs.objective >= 0, "Expected objective >= 0");

  if (outputs.voxelGrid) {
    const res = validateVoxelGridConsistency(
      "topology",
      {
        voxelGrid: outputs.voxelGrid,
        densityField: outputs.densityField,
        resolution: outputs.resolution,
      },
      parameters
    );
    const densities = outputs.voxelGrid.densities;

    if (res > 4) {
      const coreThreshold = Math.floor(res * 0.2);
      let coreSum = 0;
      let coreCount = 0;
      let shellSum = 0;
      let shellCount = 0;
      for (let z = 0; z < res; z += 1) {
        for (let y = 0; y < res; y += 1) {
          for (let x = 0; x < res; x += 1) {
            const idx = x + y * res + z * res * res;
            const value = densities[idx] ?? 0;
            const isCore =
              Math.abs(y - (res - 1) / 2) <= coreThreshold &&
              Math.abs(z - (res - 1) / 2) <= coreThreshold;
            const isShell = y < 1 || y >= res - 1 || z < 1 || z >= res - 1;
            if (isCore) {
              coreSum += value;
              coreCount += 1;
            } else if (isShell) {
              shellSum += value;
              shellCount += 1;
            }
          }
        }
      }
      const coreMean = coreCount > 0 ? coreSum / coreCount : 0;
      const shellMean = shellCount > 0 ? shellSum / shellCount : 0;
      ensure(coreMean > shellMean, "Expected load path bias to densify the core");
    }
  }
  ensureMesh(isoOutputs.mesh as RenderMesh, "topology iso mesh");
  ensureMesh(outputGeometry.mesh, "topology output geometry");
};

const validateVoxelSolver = () => {
  const { outputs, isoOutputs, outputGeometry, parameters } = runTopologySolverRig("voxelSolver");
  ensure(outputs.status === "complete", "Expected voxel solver complete");
  ensure(Array.isArray(outputs.densityField), "Expected density field array");
  ensure(outputs.densityField.length > 0, "Expected density field data");
  ensure(outputs.voxelGrid !== null, "Expected voxel grid output");
  ensure(isoOutputs.mesh !== null, "Expected voxel iso mesh output");
  ensureFinite(outputs.objective, "Expected objective to be finite");
  ensureFinite(outputs.constraint, "Expected constraint to be finite");

  if (outputs.voxelGrid) {
    validateVoxelGridConsistency(
      "voxel",
      {
        voxelGrid: outputs.voxelGrid,
        densityField: outputs.densityField,
        resolution: outputs.resolution,
      },
      parameters
    );
  }
  ensureMesh(isoOutputs.mesh as RenderMesh, "voxel iso mesh");
  ensureMesh(outputGeometry.mesh, "voxel output geometry");
};

const validateChemistrySolver = () => {
  const { outputs, outputGeometry, goalRegions, context } = runChemistrySolverRig("regions");
  ensure(outputs.status === "complete", "Expected chemistry solver complete");
  ensure(goalRegions.stiffness.length > 0, "Expected stiffness goal regions");
  ensure(goalRegions.transparency.length > 0, "Expected transparency goal regions");
  ensure(goalRegions.thermal.length > 0, "Expected thermal goal regions");
  [...goalRegions.stiffness, ...goalRegions.transparency, ...goalRegions.thermal].forEach((id) => {
    ensure(context.geometryById.has(id), `Expected region geometry ${id}`);
  });
  ensure(outputs.materialParticles.length > 0, "Expected chemistry particles");
  ensure(outputs.materialField !== null, "Expected chemistry field");
  ensure(Array.isArray(outputs.history), "Expected chemistry history array");
  ensure(outputs.history.length > 0, "Expected chemistry history entries");
  ensure(outputs.bestState !== null, "Expected chemistry best state");
  ensureFinite(outputs.totalEnergy, "Expected chemistry energy");
  ensure(outputs.materials.length > 0, "Expected materials list");
  if (outputs.materialField) {
    const cellCount =
      outputs.materialField.resolution.x *
      outputs.materialField.resolution.y *
      outputs.materialField.resolution.z;
    ensure(outputs.materialField.densities.length === cellCount, "Expected field density length");
    ensure(outputs.materialField.channels.length === outputs.materialField.materials.length, "Expected one channel per material");
  }
  const materialNames = outputs.materials
    .map((material) => (material && typeof material === "object" ? (material as { name?: unknown }).name : null))
    .filter((name): name is string => typeof name === "string");
  if (materialNames.length > 0) {
    const particles = (outputs.materialParticles as unknown[]).filter(
      (particle): particle is { materials?: Record<string, unknown> } => {
        if (particle == null || typeof particle !== "object") return false;
        const materials = (particle as any).materials;
        return materials == null || typeof materials === "object";
      }
    );
    const MIN_MAX_CONCENTRATION = 0.05;
    const SAMPLE_LIMIT = 2000;
    const sampledParticles = particles.slice(0, SAMPLE_LIMIT);
    materialNames.forEach((name) => {
      let max = 0;
      sampledParticles.forEach((particle) => {
        const raw = particle.materials?.[name];
        const value = typeof raw === "number" ? raw : 0;
        if (value > max) max = value;
      });
      ensure(max > MIN_MAX_CONCENTRATION, `Expected non-trivial concentration for ${name}`);
    });
  }

  ensureMesh(outputs.mesh as RenderMesh, "chemistry mesh");
  ensureMesh(outputGeometry.mesh, "chemistry output geometry");
};

const validateChemistrySolverTextInputs = () => {
  const { outputs, outputGeometry, goalRegions, context, parameters } = runChemistrySolverRig("textInputs");
  ensure(outputs.status === "complete", "Expected chemistry solver complete");
  ensure(goalRegions.stiffness.length > 0, "Expected stiffness goal regions");
  ensure(goalRegions.transparency.length > 0, "Expected transparency goal regions");
  ensure(goalRegions.thermal.length > 0, "Expected thermal goal regions");
  [...goalRegions.stiffness, ...goalRegions.transparency, ...goalRegions.thermal].forEach((id) => {
    ensure(context.geometryById.has(id), `Expected region geometry ${id}`);
  });
  ensure(outputs.materialParticles.length > 0, "Expected chemistry particles");
  ensure(outputs.materialField !== null, "Expected chemistry field");
  ensure(outputs.materials.length >= 3, "Expected materials list");

  const expectedMaterialsText = (parameters as { materialsText?: unknown }).materialsText;
  if (typeof expectedMaterialsText === "string" && expectedMaterialsText.trim().length > 0) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(expectedMaterialsText) as unknown;
    } catch (error) {
      ensure(false, `Failed to parse materialsText JSON: ${String(error)}`);
      parsed = [];
    }
    type TextMaterialEntry =
      | { material: { name: string } }
      | { name: string };

    const isTextMaterialEntry = (value: unknown): value is TextMaterialEntry => {
      if (!value || typeof value !== "object") return false;
      const entry = value as Record<string, unknown>;
      const material = entry.material;
      if (material && typeof material === "object") {
        const m = material as Record<string, unknown>;
        return typeof m.name === "string";
      }
      return typeof entry.name === "string";
    };

    const parsedList = Array.isArray(parsed) ? parsed : [];
    ensure(
      parsedList.every(isTextMaterialEntry),
      "materialsText JSON shape did not match expected schema"
    );

    const expectedNames = parsedList
      .filter(isTextMaterialEntry)
      .map((entry) => ("material" in entry ? entry.material.name : entry.name));
    const outputNames = outputs.materials
      .map((material) => (material && typeof material === "object" ? (material as any).name : null))
      .filter((name): name is string => typeof name === "string");
    expectedNames.forEach((name) => {
      ensure(outputNames.includes(name), `Expected parsed materialsText to include ${name}`);
    });
  }

  ensureMesh(outputs.mesh as RenderMesh, "chemistry mesh");
  ensureMesh(outputGeometry.mesh, "chemistry output geometry");
};

const validateChemistrySolverDisabled = () => {
  const { outputs } = runChemistrySolverRig("disabled");
  ensure(outputs.status === "disabled", "Expected chemistry solver disabled");
  ensure(outputs.materialParticles.length === 0, "Expected no chemistry particles");
  ensure(outputs.materialField === null, "Expected no chemistry field");
  ensure(outputs.materials.length === 0, "Expected no materials list");
  ensure(Array.isArray(outputs.history) && outputs.history.length === 0, "Expected no history when disabled");
  ensure(outputs.bestState === null, "Expected no best state when disabled");
  ensure((outputs.mesh as RenderMesh).positions.length === 0, "Expected empty disabled mesh");
};

const validateBiologicalSolver = () => {
  const { biologicalOutputs, evolutionOutputs, best, baseGeometry, config } = runBiologicalSolverRig();

  ensure(biologicalOutputs.bestScore === best.fitness, "Expected best score to match fitness");
  ensure(biologicalOutputs.bestGenome.x === best.genome[0], "Expected genome x");
  ensure(biologicalOutputs.bestGenome.y === best.genome[1], "Expected genome y");
  ensure(biologicalOutputs.bestGenome.z === best.genome[2], "Expected genome z");
  ensure(biologicalOutputs.populationSize === config.populationSize, "Expected population size to match");
  ensure(biologicalOutputs.generations === config.generations, "Expected generations to match");
  ensure(biologicalOutputs.mutationRate === config.mutationRate, "Expected mutation rate to match");

  const historyGenerations = biologicalOutputs.history?.generations ?? [];
  ensure(historyGenerations.length === config.generations, "Expected history generations length");
  const expectedEvaluations = historyGenerations.reduce(
    (sum, generation) => sum + (generation.population?.length ?? 0),
    0
  );
  ensure(
    biologicalOutputs.evaluations === expectedEvaluations,
    "Expected evaluations to match history population sizes"
  );

  ensure(biologicalOutputs.best?.id === best.id, "Expected best id to match");
  ensure(biologicalOutputs.best?.geometry?.length === 1, "Expected best geometry payload");
  ensure(biologicalOutputs.best?.geometry?.[0].id === baseGeometry.id, "Expected geometry id match");
  ensure(biologicalOutputs.selectedGeometry.length > 0, "Expected selected geometry ids");

  ensure(evolutionOutputs.best?.id === best.id, "Expected evolution best id");
  ensure(
    (evolutionOutputs.gallery?.allIndividuals.length ?? 0) >= config.populationSize,
    "Expected gallery entries"
  );
};

export const runSolversValidation = () => {
  resetValidationLog();

  runNodeValidation("physicsSolver/static", validatePhysicsStatic);
  runNodeValidation("physicsSolver/dynamic", validatePhysicsDynamic);
  runNodeValidation("physicsSolver/modal", validatePhysicsModal);
  runNodeValidation("topologySolver", validateTopologySolver);
  runNodeValidation("voxelSolver", validateVoxelSolver);
  runNodeValidation("chemistrySolver/regions", validateChemistrySolver);
  runNodeValidation("chemistrySolver/textInputs", validateChemistrySolverTextInputs);
  runNodeValidation("chemistrySolver/disabled", validateChemistrySolverDisabled);
  runNodeValidation("biologicalSolver", validateBiologicalSolver);

  return generateReport();
};
