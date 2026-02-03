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

const expectFiniteNumber = (value: unknown, message: string): number => {
  ensure(typeof value === "number" && Number.isFinite(value), message);
  return value;
};

const expectArray = <T = unknown>(value: unknown, message: string): T[] => {
  ensure(Array.isArray(value), message);
  return value as T[];
};

const expectObject = (value: unknown, message: string): Record<string, unknown> => {
  ensure(value !== null && typeof value === "object", message);
  return value as Record<string, unknown>;
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
    voxelGrid: VoxelGrid | null;
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
  const { outputs, outputGeometry, baseGeometry, goals, config } = runPhysicsSolverRig("static");
  const baseVertexCount = Math.floor(baseGeometry.mesh.positions.length / 3);
  ensure(outputs.geometry === outputGeometry.id, "Expected geometry id to match");
  const result = expectObject(outputs.result, "Expected physics solver result") as unknown as SolverResult;
  ensure(result.success === true, "Expected physics solver success");
  ensure(outputs.animation === null, "Expected no animation for static analysis");
  const displacements = expectArray(outputs.displacements, "Expected displacements array");
  ensure(displacements.length === baseVertexCount, "Expected displacement per vertex");
  const stressField = expectArray(outputs.stressField, "Expected stress field array");
  expectFiniteNumber(result.finalObjectiveValue, "Expected finite objective value");
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
  ensure(report.stats.stressField.count === stressField.length, "Expected finite stress field");
};

const validatePhysicsDynamic = () => {
  const { outputs, outputGeometry, baseGeometry, parameters, goals, config } = runPhysicsSolverRig("dynamic");
  const baseVertexCount = Math.floor(baseGeometry.mesh.positions.length / 3);
  ensure(outputs.geometry === outputGeometry.id, "Expected geometry id to match");
  const result = expectObject(outputs.result, "Expected physics solver result") as unknown as SolverResult;
  ensure(result.success === true, "Expected physics solver success");
  ensure(result.iterations === parameters.animationFrames, "Expected iterations to match frames");
  const animation = outputs.animation;
  ensure(animation !== null, "Expected animation for dynamic analysis");
  const animationObj = expectObject(animation, "Expected animation object") as {
    frames?: unknown;
    timeStamps?: unknown;
  };
  const frames = expectArray(animationObj.frames, "Expected animation frames");
  const timeStamps = expectArray(animationObj.timeStamps, "Expected animation timestamps");
  ensure(frames.length === parameters.animationFrames, "Expected frame count");
  ensure(timeStamps.length === parameters.animationFrames, "Expected timestamp count");
  const displacements = expectArray(outputs.displacements, "Expected displacements array");
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
  ensure(outputs.geometry === outputGeometry.id, "Expected geometry id to match");
  const result = expectObject(outputs.result, "Expected physics solver result") as unknown as SolverResult;
  ensure(result.success === true, "Expected physics solver success");
  const animation = outputs.animation;
  ensure(animation !== null, "Expected animation for modal analysis");
  const animationObj = expectObject(animation, "Expected animation object") as { frames?: unknown };
  const frames = expectArray(animationObj.frames, "Expected animation frames");
  ensure(frames.length > 0, "Expected modal frames");
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

const validateTopologySolver = () => {
  const { outputs, isoOutputs, outputGeometry, parameters } = runTopologySolverRig("topologySolver");
  ensure(outputs.status === "complete", "Expected topology solver complete");
  const densityField = expectArray<number>(outputs.densityField, "Expected density field array");
  ensure(densityField.length > 0, "Expected density field data");
  const voxelGrid = outputs.voxelGrid as unknown as VoxelGrid | null;
  ensure(voxelGrid !== null, "Expected voxel grid output");
  const resolution = expectFiniteNumber(outputs.resolution, "Expected resolution to be a finite number");
  ensure(resolution > 0, "Expected resolution > 0");
  const objective = expectFiniteNumber(outputs.objective, "Expected objective to be finite");
  expectFiniteNumber(outputs.constraint, "Expected constraint to be finite");
  ensure(objective >= 0, "Expected objective >= 0");

  if (voxelGrid) {
    const volumeFraction =
      typeof (parameters as { volumeFraction?: unknown }).volumeFraction === "number"
        ? (parameters as { volumeFraction: number }).volumeFraction
        : 0.35;
    const res = validateVoxelGridConsistency(
      "topology",
      {
        voxelGrid,
        densityField,
        resolution,
      },
      { volumeFraction }
    );
    const densities = voxelGrid.densities;

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
  const { outputs, isoOutputs, outputGeometry } = runTopologySolverRig("voxelSolver");
  const voxelGrid = outputs.voxelGrid as unknown as VoxelGrid | null;
  ensure(voxelGrid !== null, "Expected voxel grid output");

  const cellCount = expectFiniteNumber(outputs.cellCount, "Expected cellCount number");
  const filledCount = expectFiniteNumber(outputs.filledCount, "Expected filledCount number");
  const fillRatio = expectFiniteNumber(outputs.fillRatio, "Expected fillRatio number");
  ensure(cellCount >= 0, "Expected non-negative cellCount");
  ensure(filledCount >= 0 && filledCount <= cellCount, "Expected filledCount within cellCount");
  ensure(fillRatio >= 0 && fillRatio <= 1, "Expected fillRatio in [0, 1]");

  if (voxelGrid) {
    ensure(voxelGrid.densities.length === cellCount, "Expected densities length to match cellCount");
    ensure(
      Math.abs(fillRatio - filledCount / Math.max(1, cellCount)) < 1e-6,
      "Expected fillRatio to match filledCount / cellCount"
    );
  }

  const voxelMeshValue = outputs.meshData;
  ensureMesh(voxelMeshValue as RenderMesh, "voxel meshData");

  // This rig also extracts an isosurface from the occupancy grid.
  ensure(isoOutputs.mesh !== null, "Expected voxel iso mesh output for voxelSolver rig");
  ensureMesh(isoOutputs.mesh as RenderMesh, "voxel iso mesh");
  ensureMesh(outputGeometry.mesh, "voxel output geometry");
};

const validateChemistrySolver = () => {
  const { outputs, outputGeometry, goalRegions, context } = runChemistrySolverRig("regions");
  ensure(outputs.geometry === outputGeometry.id, "Expected chemistry geometry id");
  ensure(goalRegions.stiffness.length > 0, "Expected stiffness goal regions");
  ensure(goalRegions.transparency.length > 0, "Expected transparency goal regions");
  ensure(goalRegions.thermal.length > 0, "Expected thermal goal regions");
  [...goalRegions.stiffness, ...goalRegions.transparency, ...goalRegions.thermal].forEach((id) => {
    ensure(context.geometryById.has(id), `Expected region geometry ${id}`);
  });
  const particles = expectArray(outputs.particles, "Expected chemistry particles");
  ensure(particles.length > 0, "Expected chemistry particles");
  ensure(outputs.field !== null, "Expected chemistry field");
  const history = expectArray(outputs.history, "Expected chemistry history array");
  ensure(history.length > 0, "Expected chemistry history entries");

  const diagnostics = expectObject(outputs.diagnostics, "Expected diagnostics object");
  const materials = expectArray(diagnostics.materials, "Expected diagnostics materials");
  ensure(materials.length > 0, "Expected materials list");
  expectFiniteNumber(diagnostics.finalEnergy, "Expected chemistry energy");

  const meshValue = outputs.mesh;
  ensure(meshValue !== null, "Expected chemistry mesh");
  ensureMesh(meshValue as RenderMesh, "chemistry mesh");
  ensureMesh(outputGeometry.mesh, "chemistry output geometry");
};

const validateChemistrySolverTextInputs = () => {
  const { outputs, outputGeometry, goalRegions, context, parameters } = runChemistrySolverRig("textInputs");
  ensure(outputs.geometry === outputGeometry.id, "Expected chemistry geometry id");
  ensure(goalRegions.stiffness.length > 0, "Expected stiffness goal regions");
  ensure(goalRegions.transparency.length > 0, "Expected transparency goal regions");
  ensure(goalRegions.thermal.length > 0, "Expected thermal goal regions");
  [...goalRegions.stiffness, ...goalRegions.transparency, ...goalRegions.thermal].forEach((id) => {
    ensure(context.geometryById.has(id), `Expected region geometry ${id}`);
  });
  const particles = expectArray(outputs.particles, "Expected chemistry particles");
  ensure(particles.length > 0, "Expected chemistry particles");
  ensure(outputs.field !== null, "Expected chemistry field");
  const diagnostics = expectObject(outputs.diagnostics, "Expected diagnostics object");
  const materials = expectArray(diagnostics.materials, "Expected diagnostics materials");
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
      .map((material) => (material && typeof material === "object" ? (material as any).name : null))
      .filter((name): name is string => typeof name === "string");
    expectedNames.forEach((name) => {
      ensure(outputNames.includes(name), `Expected parsed materialsText to include ${name}`);
    });
  }

  const meshValue = outputs.mesh;
  ensure(meshValue !== null, "Expected chemistry mesh");
  ensureMesh(meshValue as RenderMesh, "chemistry mesh");
  ensureMesh(outputGeometry.mesh, "chemistry output geometry");
};

const validateChemistrySolverDisabled = () => {
  const { outputs } = runChemistrySolverRig("disabled");
  ensure(outputs.geometry === null, "Expected no geometry output when disabled");
  const particles = expectArray(outputs.particles, "Expected particles array");
  ensure(particles.length === 0, "Expected no chemistry particles");
  ensure(outputs.field === null, "Expected no chemistry field");
  const history = expectArray(outputs.history, "Expected history array");
  ensure(history.length === 0, "Expected no history when disabled");
  ensure(outputs.mesh === null, "Expected no mesh when disabled");
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
