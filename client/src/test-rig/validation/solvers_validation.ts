import { generateReport, logValidation, resetValidationLog } from "./validation-log";
import {
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
  const resolutionEps = computeResolutionEps(outputs.resolution);
  ensure(
    Math.abs(outputs.resolution - res) <= resolutionEps,
    `${label}: expected resolution to be an integer (got ${outputs.resolution}, nearest ${res})`
  );
  ensure(outputs.voxelGrid !== null, `${label}: expected voxel grid output`);
  const voxelGrid = outputs.voxelGrid!;

  const densities = voxelGrid.densities;
  ensure(Array.isArray(densities) && densities.length > 0, `${label}: expected density data`);

  const gridResolution = voxelGrid.resolution as unknown;
  ensure(
    gridResolution !== null && typeof gridResolution === "object",
    `${label}: expected voxelGrid resolution object`
  );
  const gridRes = gridResolution as { x: number; y: number; z: number };
  const x = gridRes.x;
  const y = gridRes.y;
  const z = gridRes.z;
  ensure(
    typeof x === "number" && Number.isFinite(x) &&
      typeof y === "number" && Number.isFinite(y) &&
      typeof z === "number" && Number.isFinite(z),
    `${label}: expected voxelGrid resolution components to be finite numbers`
  );
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
  const { outputs, outputGeometry, baseGeometry, goals, config } = runPhysicsSolverRig("static");
  const baseVertexCount = Math.floor(baseGeometry.mesh.positions.length / 3);
  ensure(outputs.geometry === "physics-static-out", "Expected geometry id to match");
  const result = outputs.result as any;
  ensure(result.success === true, "Expected physics solver success");
  ensure(outputs.animation === null, "Expected no animation for static analysis");
  const displacements = outputs.displacements as any[];
  ensure(Array.isArray(displacements), "Expected displacements array");
  ensure(displacements.length === baseVertexCount, "Expected displacement per vertex");
  ensure(Array.isArray(outputs.stressField), "Expected stress field array");
  ensureFinite(result.finalObjectiveValue, "Expected finite objective value");
  ensureMesh(outputs.mesh as RenderMesh, "physics static mesh");
  ensureMesh(outputGeometry.mesh, "physics static geometry");
  ensureStressColors(outputGeometry.mesh, "physics static geometry");

  const report = buildPhysicsSolverRunReport({
    label: "validation/physics/static",
    computeMode: "cpu",
    mesh: baseGeometry.mesh,
    goals,
    config,
    result,
  });
  ensure(
    report.stats.displacements.nonFiniteCount === 0,
    "Expected finite displacements"
  );
  ensure(
    (report.stats.stressField as any).nonFiniteCount === 0,
    "Expected finite stress field"
  );
};

const validatePhysicsDynamic = () => {
  const { outputs, outputGeometry, baseGeometry, parameters, goals, config } = runPhysicsSolverRig("dynamic");
  const baseVertexCount = Math.floor(baseGeometry.mesh.positions.length / 3);
  ensure(outputs.geometry === "physics-dynamic-out", "Expected geometry id to match");
  const result = outputs.result as any;
  ensure(result.success === true, "Expected physics solver success");
  ensure(result.iterations === parameters.animationFrames, "Expected iterations to match frames");
  ensure(outputs.animation !== null, "Expected animation for dynamic analysis");
  const animation = outputs.animation as any;
  ensure(animation.frames.length === parameters.animationFrames, "Expected frame count");
  ensure(animation.timeStamps.length === parameters.animationFrames, "Expected timestamp count");
  const displacements = outputs.displacements as any[];
  ensure(displacements.length === baseVertexCount, "Expected displacement per vertex");
  ensureMesh(outputs.mesh as RenderMesh, "physics dynamic mesh");
  ensureMesh(outputGeometry.mesh, "physics dynamic geometry");
  ensureStressColors(outputGeometry.mesh, "physics dynamic geometry");

  const report = buildPhysicsSolverRunReport({
    label: "validation/physics/dynamic",
    computeMode: "cpu",
    mesh: baseGeometry.mesh,
    goals,
    config,
    result,
  });
  ensure(
    report.stats.displacements.nonFiniteCount === 0,
    "Expected finite displacements"
  );
};

const validatePhysicsModal = () => {
  const { outputs, outputGeometry, baseGeometry, goals, config } = runPhysicsSolverRig("modal");
  ensure(outputs.geometry === "physics-modal-out", "Expected geometry id to match");
  const result = outputs.result as any;
  ensure(result.success === true, "Expected physics solver success");
  ensure(outputs.animation !== null, "Expected animation for modal analysis");
  const animation = outputs.animation as any;
  ensure(animation.frames.length > 0, "Expected modal frames");
  ensureMesh(outputs.mesh as RenderMesh, "physics modal mesh");
  ensureMesh(outputGeometry.mesh, "physics modal geometry");
  ensureStressColors(outputGeometry.mesh, "physics modal geometry");

  const report = buildPhysicsSolverRunReport({
    label: "validation/physics/modal",
    computeMode: "cpu",
    mesh: baseGeometry.mesh,
    goals,
    config,
    result,
  });
  ensure(
    report.stats.displacements.nonFiniteCount === 0,
    "Expected finite displacements"
  );
};

const validateVoxelSolver = () => {
  const { outputs, isoOutputs, outputGeometry, parameters } = runTopologySolverRig("voxelSolver");
  ensure(outputs.status === "complete", "Expected voxel solver complete");
  const densityField = outputs.densityField as number[];
  ensure(Array.isArray(densityField), "Expected density field array");
  ensure(densityField.length > 0, "Expected density field data");
  ensure(outputs.voxelGrid !== null, "Expected voxel grid output");
  // In this validation rig, successful voxel solver runs are expected to produce an iso surface mesh.
  ensure(isoOutputs.mesh !== null, "Expected voxel iso mesh output for voxelSolver rig");
  ensureFinite(outputs.objective as number, "Expected objective to be finite");
  ensureFinite(outputs.constraint as number, "Expected constraint to be finite");

  const voxelGrid = outputs.voxelGrid as { densities: number[]; resolution: unknown } | null;
  if (voxelGrid) {
    validateVoxelGridConsistency(
      "voxel",
      {
        voxelGrid,
        densityField,
        resolution: outputs.resolution as number,
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
  const materialParticles = outputs.materialParticles as any[];
  ensure(materialParticles.length > 0, "Expected chemistry particles");
  ensure(outputs.materialField !== null, "Expected chemistry field");
  const history = outputs.history as any[];
  ensure(Array.isArray(history), "Expected chemistry history array");
  ensure(history.length > 0, "Expected chemistry history entries");
  ensure(outputs.bestState !== null, "Expected chemistry best state");
  ensureFinite(outputs.totalEnergy as number, "Expected chemistry energy");
  const materials = outputs.materials as any[];
  ensure(materials.length > 0, "Expected materials list");
  const materialField = outputs.materialField as any;
  if (materialField) {
    const cellCount =
      materialField.resolution.x *
      materialField.resolution.y *
      materialField.resolution.z;
    ensure(materialField.densities.length === cellCount, "Expected field density length");
    ensure(materialField.channels.length === materialField.materials.length, "Expected one channel per material");
  }
  const materialNames = materials
    .map((material: any) => (material && typeof material === "object" ? material.name : null))
    .filter((name: any): name is string => typeof name === "string");
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
  const materialParticles = outputs.materialParticles as any[];
  ensure(materialParticles.length > 0, "Expected chemistry particles");
  ensure(outputs.materialField !== null, "Expected chemistry field");
  const materials = outputs.materials as any[];
  ensure(materials.length >= 3, "Expected materials list");

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
    const outputNames = materials
      .map((material: any) => (material && typeof material === "object" ? material.name : null))
      .filter((name: any): name is string => typeof name === "string");
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
  const materialParticles = outputs.materialParticles as any[];
  ensure(materialParticles.length === 0, "Expected no chemistry particles");
  ensure(outputs.materialField === null, "Expected no chemistry field");
  const materials = outputs.materials as any[];
  ensure(materials.length === 0, "Expected no materials list");
  const history = outputs.history as any[];
  ensure(Array.isArray(history) && history.length === 0, "Expected no history when disabled");
  ensure(outputs.bestState === null, "Expected no best state when disabled");
  ensure((outputs.mesh as RenderMesh).positions.length === 0, "Expected empty disabled mesh");
};

export const runSolversValidation = () => {
  resetValidationLog();

  runNodeValidation("physicsSolver/static", validatePhysicsStatic);
  runNodeValidation("physicsSolver/dynamic", validatePhysicsDynamic);
  runNodeValidation("physicsSolver/modal", validatePhysicsModal);
  runNodeValidation("voxelSolver", validateVoxelSolver);
  runNodeValidation("chemistrySolver/regions", validateChemistrySolver);
  runNodeValidation("chemistrySolver/textInputs", validateChemistrySolverTextInputs);
  runNodeValidation("chemistrySolver/disabled", validateChemistrySolverDisabled);

  return generateReport();
};
