import { generateReport, logValidation, resetValidationLog } from "./validation-log";
import {
  runChemistrySolverRig,
  runPhysicsSolverRig,
  runTopologySolverRig,
} from "../solvers/solver-rigs";
import { buildPhysicsSolverRunReport } from "../solvers/physics-solver-report";
import type { RenderMesh, VoxelGrid } from "../../types";
import type { SolverResult } from "../../workflow/nodes/solver/types";

const CATEGORY = "solvers";

const nowTimestamp = () => new Date().toISOString();

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

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
// Resolution values are conceptually integers; allow small float drift.
const RESOLUTION_ABS_EPS = 1e-4;
const RESOLUTION_REL_EPS = 1e-8;

// Allow tiny numerical drift from [0, 1] due to floating point error.
const DENSITY_EPS = 1e-5;

const computeVolumeToleranceForResolution = (res: number) =>
  Math.max(MIN_VOLUME_TOLERANCE, RESOLUTION_TOLERANCE_SCALE / Math.max(1, res));

const computeResolutionEps = (value: number) => {
  const rounded = Math.round(value);
  const scale = Math.max(1, rounded);
  return Math.max(RESOLUTION_ABS_EPS, RESOLUTION_REL_EPS * scale);
};

type PhysicsSolverOutputs = {
  geometry: string | null;
  result: SolverResult;
  animation: SolverResult["animation"] | null;
  displacements: unknown[];
  stressField: unknown[];
  mesh: RenderMesh;
};

type TopologySolverOutputs = {
  status: string;
  densityField: number[];
  voxelGrid: VoxelGrid | null;
  objective: number;
  constraint: number;
  resolution: number;
};

type ChemistrySolverOutputs = {
  geometry: string | null;
  mesh: RenderMesh | null;
  particles: unknown[];
  field: unknown | null;
  history: unknown[];
  diagnostics: {
    iterations: number;
    convergence: boolean;
    finalEnergy: number;
    warnings: string[];
    errors: string[];
    materials?: unknown[];
  };
};

const validateVoxelGridConsistency = (
  label: string,
  outputs: {
    voxelGrid: VoxelGrid;
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
  const resolutionEps = computeResolutionEps(outputs.resolution);
  ensure(
    Math.abs(outputs.resolution - res) <= resolutionEps,
    `${label}: expected resolution to be an integer (got ${outputs.resolution}, nearest ${res})`
  );
  const densities = outputs.voxelGrid.densities;
  ensure(Array.isArray(densities) && densities.length > 0, `${label}: expected density data`);

  const { x, y, z } = outputs.voxelGrid.resolution;
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rz = Math.round(z);
  const gridResolutionEps = Math.max(computeResolutionEps(x), computeResolutionEps(y), computeResolutionEps(z));
  ensure(
    Math.abs(x - rx) <= gridResolutionEps &&
      Math.abs(y - ry) <= gridResolutionEps &&
      Math.abs(z - rz) <= gridResolutionEps,
    `${label}: expected voxelGrid resolution components to be integers (x=${x}, y=${y}, z=${z})`
  );
  ensure(rx > 0 && ry > 0 && rz > 0, `${label}: expected voxelGrid resolution > 0`);
  ensure(
    Math.abs(x - y) <= gridResolutionEps && Math.abs(y - z) <= gridResolutionEps,
    `${label}: expected voxelGrid resolution to be cubic (x=${x}, y=${y}, z=${z}, tol=${gridResolutionEps})`
  );
  ensure(
    rx === ry && ry === rz,
    `${label}: expected voxelGrid resolution to be cubic (x=${rx}, y=${ry}, z=${rz})`
  );
  const matchResolutionEps = Math.max(resolutionEps, gridResolutionEps);
  ensure(
    Math.abs(outputs.resolution - x) <= matchResolutionEps,
    `${label}: expected resolution (${outputs.resolution}) to match voxelGrid resolution.x (${x}) within tol=${matchResolutionEps}`
  );
  ensure(
    res === rx,
    `${label}: expected resolution (${outputs.resolution}→${res}) to match voxelGrid resolution.x (${x}→${rx})`
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
  const { outputs: rawOutputs, outputGeometry, baseGeometry, goals, config } =
    runPhysicsSolverRig("static");
  const outputs = rawOutputs as unknown as PhysicsSolverOutputs;
  const baseVertexCount = Math.floor(baseGeometry.mesh.positions.length / 3);
  ensure(
    typeof outputs.geometry === "string" && outputs.geometry.length > 0,
    "Expected geometry id output"
  );
  ensure(outputs.result.success === true, "Expected physics solver success");
  ensure(outputs.animation === null, "Expected no animation for static analysis");
  ensure(Array.isArray(outputs.displacements), "Expected displacements array");
  ensure(outputs.displacements.length === baseVertexCount, "Expected displacement per vertex");
  ensure(Array.isArray(outputs.stressField), "Expected stress field array");
  ensureFinite(outputs.result.finalObjectiveValue, "Expected finite objective value");
  ensureMesh(outputs.mesh, "physics static mesh");
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
  const { outputs: rawOutputs, outputGeometry, baseGeometry, parameters, goals, config } =
    runPhysicsSolverRig("dynamic");
  const outputs = rawOutputs as unknown as PhysicsSolverOutputs;
  const baseVertexCount = Math.floor(baseGeometry.mesh.positions.length / 3);
  ensure(
    typeof outputs.geometry === "string" && outputs.geometry.length > 0,
    "Expected geometry id output"
  );
  ensure(outputs.result.success === true, "Expected physics solver success");
  ensure(outputs.result.iterations === parameters.animationFrames, "Expected iterations to match frames");
  ensure(outputs.animation != null, "Expected animation for dynamic analysis");
  ensure(outputs.animation.frames.length === parameters.animationFrames, "Expected frame count");
  ensure(outputs.animation.timeStamps.length === parameters.animationFrames, "Expected timestamp count");
  ensure(outputs.displacements.length === baseVertexCount, "Expected displacement per vertex");
  ensureMesh(outputs.mesh, "physics dynamic mesh");
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
  const { outputs: rawOutputs, outputGeometry, baseGeometry, goals, config } =
    runPhysicsSolverRig("modal");
  const outputs = rawOutputs as unknown as PhysicsSolverOutputs;
  ensure(
    typeof outputs.geometry === "string" && outputs.geometry.length > 0,
    "Expected geometry id output"
  );
  ensure(outputs.result.success === true, "Expected physics solver success");
  ensure(outputs.animation != null, "Expected animation for modal analysis");
  ensure(outputs.animation.frames.length > 0, "Expected modal frames");
  ensureMesh(outputs.mesh, "physics modal mesh");
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
  const {
    outputs: rawOutputs,
    isoOutputs: rawIsoOutputs,
    outputGeometry,
    parameters,
  } = runTopologySolverRig("topologySolver");
  const outputs = rawOutputs as unknown as TopologySolverOutputs;
  const isoOutputs = rawIsoOutputs as unknown as { mesh: RenderMesh | null };
  ensure(outputs.status === "complete", "Expected topology solver complete");
  ensure(Array.isArray(outputs.densityField), "Expected density field array");
  ensure(outputs.densityField.length > 0, "Expected density field data");
  ensure(outputs.voxelGrid !== null, "Expected voxel grid output");
  ensure(outputs.resolution > 0, "Expected resolution > 0");
  ensureFinite(outputs.objective, "Expected objective to be finite");
  ensureFinite(outputs.constraint, "Expected constraint to be finite");
  ensure(outputs.objective >= 0, "Expected objective >= 0");

  if (outputs.voxelGrid) {
    const volumeFraction = (parameters as { volumeFraction?: unknown }).volumeFraction;
    ensure(
      typeof volumeFraction === "number" && Number.isFinite(volumeFraction),
      "Expected volumeFraction parameter to be a finite number"
    );
    const res = validateVoxelGridConsistency(
      "topology",
      {
        voxelGrid: outputs.voxelGrid,
        densityField: outputs.densityField,
        resolution: outputs.resolution,
      },
      { volumeFraction }
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
  ensure(isoOutputs.mesh !== null, "Expected topology iso mesh output");
  ensureMesh(isoOutputs.mesh, "topology iso mesh");
  ensureMesh(outputGeometry.mesh, "topology output geometry");
};

const validateVoxelSolver = () => {
  const {
    outputs: rawOutputs,
    isoOutputs: rawIsoOutputs,
    outputGeometry,
    parameters,
  } = runTopologySolverRig("voxelSolver");
  const outputs = rawOutputs as unknown as {
    voxelGrid: VoxelGrid | null;
    meshData: RenderMesh;
    cellCount: number;
    filledCount: number;
    fillRatio: number;
  };
  const isoOutputs = rawIsoOutputs as unknown as { mesh: RenderMesh | null };
  ensure(outputs.voxelGrid !== null, "Expected voxel grid output");
  ensure(outputs.cellCount > 0, "Expected non-empty voxel grid");
  ensure(outputs.filledCount >= 0, "Expected filled count >= 0");
  ensure(outputs.filledCount <= outputs.cellCount, "Expected filled count <= cell count");
  ensure(outputs.fillRatio >= 0 && outputs.fillRatio <= 1, "Expected fill ratio within [0, 1]");
  ensure(
    outputs.meshData.positions.length > 0,
    "Expected voxel mesh output"
  );

  ensure(isoOutputs.mesh !== null, "Expected voxel iso mesh output for voxelSolver rig");

  if (outputs.voxelGrid) {
    const { x, y, z } = outputs.voxelGrid.resolution;
    ensure(x > 0 && y > 0 && z > 0, "Expected voxel grid resolution > 0");
    ensure(
      outputs.voxelGrid.densities.length === x * y * z,
      "Expected voxel grid densities to match resolution"
    );
  }
  ensureMesh(isoOutputs.mesh, "voxel iso mesh");
  ensureMesh(outputGeometry.mesh, "voxel output geometry");
};

const validateChemistrySolver = () => {
  const { outputs: rawOutputs, outputGeometry, goalRegions, context } =
    runChemistrySolverRig("regions");
  const outputs = rawOutputs as unknown as ChemistrySolverOutputs;
  ensure(outputs.mesh !== null, "Expected chemistry solver mesh");
  ensure(goalRegions.stiffness.length > 0, "Expected stiffness goal regions");
  ensure(goalRegions.transparency.length > 0, "Expected transparency goal regions");
  ensure(goalRegions.thermal.length > 0, "Expected thermal goal regions");
  [...goalRegions.stiffness, ...goalRegions.transparency, ...goalRegions.thermal].forEach((id) => {
    ensure(context.geometryById.has(id), `Expected region geometry ${id}`);
  });
  ensure(outputs.particles.length > 0, "Expected chemistry particles");
  ensure(outputs.field !== null, "Expected chemistry field");
  ensure(Array.isArray(outputs.history), "Expected chemistry history array");
  ensure(outputs.history.length > 0, "Expected chemistry history entries");
  ensureFinite(outputs.diagnostics.finalEnergy, "Expected chemistry energy");

  const materials = outputs.diagnostics.materials ?? [];
  ensure(materials.length > 0, "Expected materials list");

  const field = outputs.field as {
    resolution?: { x?: unknown; y?: unknown; z?: unknown };
    densities?: unknown;
    channels?: unknown;
    materials?: unknown;
  };
  if (field && typeof field === "object") {
    const resolution = field.resolution;
    if (
      resolution &&
      typeof resolution === "object" &&
      typeof resolution.x === "number" &&
      typeof resolution.y === "number" &&
      typeof resolution.z === "number"
    ) {
      const cellCount = resolution.x * resolution.y * resolution.z;
      const densities = field.densities;
      if (Array.isArray(densities)) {
        ensure(densities.length === cellCount, "Expected field density length");
      }

      const channels = field.channels;
      const fieldMaterials = field.materials;
      if (Array.isArray(channels) && Array.isArray(fieldMaterials)) {
        ensure(
          channels.length === fieldMaterials.length,
          "Expected one channel per material"
        );
      }
    }
  }

  const materialNames = materials
    .map((material: unknown) => {
      if (material && typeof material === "object") {
        return (material as { name?: unknown }).name;
      }
      return null;
    })
    .filter((name): name is string => typeof name === "string");
  if (materialNames.length > 0) {
    const particles = (outputs.particles as unknown[]).filter(
      (particle): particle is { materials?: Record<string, unknown> } => {
        if (particle == null || typeof particle !== "object") return false;
        const materials = (particle as any).materials;
        return materials == null || typeof materials === "object";
      }
    );
    const MIN_MAX_CONCENTRATION = 0.05;
    const SAMPLE_LIMIT = 2000;
    const sampledParticles = particles.slice(0, SAMPLE_LIMIT);
    const maxByMaterial: Record<string, number> = {};
    materialNames.forEach((name) => {
      maxByMaterial[name] = 0;
    });
    sampledParticles.forEach((particle) => {
      materialNames.forEach((name) => {
        const raw = particle.materials?.[name];
        const value = typeof raw === "number" ? raw : 0;
        maxByMaterial[name] = Math.max(maxByMaterial[name] ?? 0, value);
      });
    });
    ensure(
      materialNames.some((name) => (maxByMaterial[name] ?? 0) > MIN_MAX_CONCENTRATION),
      "Expected at least one non-trivial material concentration"
    );
  }

  ensureMesh(outputs.mesh, "chemistry mesh");
  ensureMesh(outputGeometry.mesh, "chemistry output geometry");
};

const validateChemistrySolverTextInputs = () => {
  const { outputs: rawOutputs, outputGeometry, goalRegions, context, parameters } =
    runChemistrySolverRig("textInputs");
  const outputs = rawOutputs as unknown as ChemistrySolverOutputs;
  ensure(outputs.mesh !== null, "Expected chemistry solver mesh");
  ensure(goalRegions.stiffness.length > 0, "Expected stiffness goal regions");
  ensure(goalRegions.transparency.length > 0, "Expected transparency goal regions");
  ensure(goalRegions.thermal.length > 0, "Expected thermal goal regions");
  [...goalRegions.stiffness, ...goalRegions.transparency, ...goalRegions.thermal].forEach((id) => {
    ensure(context.geometryById.has(id), `Expected region geometry ${id}`);
  });
  ensure(outputs.particles.length > 0, "Expected chemistry particles");
  ensure(outputs.field !== null, "Expected chemistry field");
  ensure((outputs.diagnostics.materials ?? []).length >= 3, "Expected materials list");

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
    const outputNames = (outputs.diagnostics.materials ?? [])
      .map((material: unknown) => {
        if (material && typeof material === "object") {
          return (material as { name?: unknown }).name;
        }
        return null;
      })
      .filter((name): name is string => typeof name === "string");
    expectedNames.forEach((name) => {
      ensure(outputNames.includes(name), `Expected parsed materialsText to include ${name}`);
    });
  }

  ensureMesh(outputs.mesh, "chemistry mesh");
  ensureMesh(outputGeometry.mesh, "chemistry output geometry");
};

const validateChemistrySolverDisabled = () => {
  const { outputs: rawOutputs } = runChemistrySolverRig("disabled");
  const outputs = rawOutputs as unknown as ChemistrySolverOutputs;
  ensure(outputs.mesh === null, "Expected disabled chemistry mesh to be null");
  ensure(outputs.geometry === null, "Expected disabled chemistry geometry to be null");
  ensure(outputs.particles.length === 0, "Expected no chemistry particles");
  ensure(outputs.field === null, "Expected no chemistry field");
  ensure(outputs.history.length === 0, "Expected no history when disabled");
  ensure(outputs.diagnostics.iterations === 0, "Expected no iterations when disabled");
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

  return generateReport();
};
