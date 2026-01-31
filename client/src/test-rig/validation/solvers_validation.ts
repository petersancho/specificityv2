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

const ensureTopologyReport = (
  report: {
    settings: { volumeFraction: number };
    density: {
      cellCount: number;
      mean: number;
      stdDev: number;
      min: number;
      max: number;
      midSlice: number[][] | null;
    };
    isoSurface: { triangleCount: number };
  },
  label: string
) => {
  ensureFinite(report.density.mean, `${label}: mean density not finite`);
  ensureFinite(report.density.stdDev, `${label}: density std dev not finite`);
  ensure(report.density.cellCount > 0, `${label}: density cell count missing`);
  ensure(report.density.min >= 0, `${label}: density min < 0`);
  ensure(report.density.max <= 1, `${label}: density max > 1`);
  ensure(report.density.midSlice !== null, `${label}: density mid-slice unavailable`);

  // Enforce non-trivial variation while scaling thresholds with grid size so the validation
  // stays meaningful across different resolutions.
  const minStdDev = Math.max(1e-4, 0.05 / Math.sqrt(report.density.cellCount));
  ensure(report.density.stdDev > minStdDev, `${label}: density field has no variation`);
  ensure(report.isoSurface.triangleCount > 0, `${label}: iso surface empty`);
  const meanError = Math.abs(report.density.mean - report.settings.volumeFraction);
  const meanTolerance = Math.max(0.1, 4 / Math.sqrt(report.density.cellCount));
  ensure(meanError <= meanTolerance, `${label}: mean density diverged from target volume fraction`);
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
  const { outputs, isoOutputs, outputGeometry, report } = runTopologySolverRig("topologySolver");
  ensure(outputs.status === "complete", "Expected topology solver complete");
  ensure(Array.isArray(outputs.densityField), "Expected density field array");
  ensure(outputs.densityField.length > 0, "Expected density field data");
  ensure(outputs.voxelGrid !== null, "Expected voxel grid output");
  ensure(outputs.resolution > 0, "Expected resolution > 0");
  ensureFinite(outputs.objective, "Expected objective finite");
  ensureFinite(outputs.constraint, "Expected constraint finite");
  ensureMesh(isoOutputs.mesh as RenderMesh, "topology iso mesh");
  ensureMesh(outputGeometry.mesh, "topology output geometry");
  ensureTopologyReport(report, "topology report");
};

const validateVoxelSolver = () => {
  const { outputs, isoOutputs, outputGeometry, report } = runTopologySolverRig("voxelSolver");
  ensure(outputs.status === "complete", "Expected voxel solver complete");
  ensure(Array.isArray(outputs.densityField), "Expected density field array");
  ensure(outputs.densityField.length > 0, "Expected density field data");
  ensure(outputs.voxelGrid !== null, "Expected voxel grid output");
  ensureFinite(outputs.objective, "Expected objective finite");
  ensureFinite(outputs.constraint, "Expected constraint finite");
  ensureMesh(isoOutputs.mesh as RenderMesh, "voxel iso mesh");
  ensureMesh(outputGeometry.mesh, "voxel output geometry");
  ensureTopologyReport(report, "voxel report");
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
