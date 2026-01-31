import { generateReport, logValidation, resetValidationLog } from "./validation-log";
import {
  runBiologicalSolverRig,
  runChemistrySolverRig,
  runPhysicsSolverRig,
  runTopologySolverRig,
} from "../solvers/solver-rigs";
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
  const { outputs, outputGeometry, baseGeometry } = runPhysicsSolverRig("static");
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
};

const validatePhysicsDynamic = () => {
  const { outputs, outputGeometry, baseGeometry, parameters } = runPhysicsSolverRig("dynamic");
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
};

const validatePhysicsModal = () => {
  const { outputs, outputGeometry } = runPhysicsSolverRig("modal");
  ensure(outputs.geometry === "physics-modal-out", "Expected geometry id to match");
  ensure(outputs.result.success === true, "Expected physics solver success");
  ensure(outputs.animation !== null, "Expected animation for modal analysis");
  ensure(outputs.animation.frames.length > 0, "Expected modal frames");
  ensureMesh(outputs.mesh as RenderMesh, "physics modal mesh");
  ensureMesh(outputGeometry.mesh, "physics modal geometry");
  ensureStressColors(outputGeometry.mesh, "physics modal geometry");
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
    const densities = outputs.voxelGrid.densities;
    const res = outputs.voxelGrid.resolution.x;
    const volumeTolerance = Math.max(0.05, 0.8 / Math.max(1, res));
    ensure(densities.length === outputs.densityField.length, "Expected density field to match grid");
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let mean = 0;
    densities.forEach((value) => {
      min = Math.min(min, value);
      max = Math.max(max, value);
      mean += value;
    });
    mean /= Math.max(1, densities.length);
    ensure(min >= 0 && max <= 1, "Expected density values clamped to [0, 1]");
    ensure(
      Math.abs(mean - parameters.volumeFraction) < volumeTolerance,
      "Expected mean density ~ volume fraction"
    );

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
  ensureFinite(outputs.objective, "Expected objective to be finite");
  ensureFinite(outputs.constraint, "Expected constraint to be finite");

  if (outputs.voxelGrid) {
    const densities = outputs.voxelGrid.densities;
    const res = outputs.voxelGrid.resolution.x;
    const volumeTolerance = Math.max(0.05, 0.8 / Math.max(1, res));
    let mean = 0;
    densities.forEach((value) => {
      mean += value;
    });
    mean /= Math.max(1, densities.length);
    ensure(
      Math.abs(mean - parameters.volumeFraction) < volumeTolerance,
      "Expected mean density ~ volume fraction"
    );
  }
  ensureMesh(isoOutputs.mesh as RenderMesh, "voxel iso mesh");
  ensureMesh(outputGeometry.mesh, "voxel output geometry");
};

const validateChemistrySolver = () => {
  const { outputs, outputGeometry } = runChemistrySolverRig();
  ensure(outputs.status === "complete", "Expected chemistry solver complete");
  ensure(outputs.materialParticles.length > 0, "Expected chemistry particles");
  ensure(outputs.materialField !== null, "Expected chemistry field");
  if (outputs.materialField) {
    const cellCount =
      outputs.materialField.resolution.x *
      outputs.materialField.resolution.y *
      outputs.materialField.resolution.z;
    ensure(outputs.materialField.densities.length === cellCount, "Expected field density length");
  }
  ensure(outputs.materials.length > 0, "Expected materials list");
  ensureMesh(outputs.mesh as RenderMesh, "chemistry mesh");
  ensureMesh(outputGeometry.mesh, "chemistry output geometry");
};

const validateBiologicalSolver = () => {
  const { biologicalOutputs, evolutionOutputs, individual, baseGeometry } = runBiologicalSolverRig();
  ensure(biologicalOutputs.bestScore === individual.fitness, "Expected best score to match fitness");
  ensure(biologicalOutputs.bestGenome.x === individual.genome[0], "Expected genome x");
  ensure(biologicalOutputs.bestGenome.y === individual.genome[1], "Expected genome y");
  ensure(biologicalOutputs.bestGenome.z === individual.genome[2], "Expected genome z");
  ensure(biologicalOutputs.best?.geometry?.length === 1, "Expected best geometry payload");
  ensure(biologicalOutputs.best?.geometry?.[0].id === baseGeometry.id, "Expected geometry id match");
  ensure(evolutionOutputs.best?.id === individual.id, "Expected evolution best id");
  ensure(evolutionOutputs.gallery?.allIndividuals.length === 1, "Expected gallery entries");
};

export const runSolversValidation = () => {
  resetValidationLog();

  runNodeValidation("physicsSolver/static", validatePhysicsStatic);
  runNodeValidation("physicsSolver/dynamic", validatePhysicsDynamic);
  runNodeValidation("physicsSolver/modal", validatePhysicsModal);
  runNodeValidation("topologySolver", validateTopologySolver);
  runNodeValidation("voxelSolver", validateVoxelSolver);
  runNodeValidation("chemistrySolver", validateChemistrySolver);
  runNodeValidation("biologicalSolver", validateBiologicalSolver);

  return generateReport();
};
