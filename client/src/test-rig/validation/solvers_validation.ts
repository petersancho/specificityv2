import { generateReport, logValidation, resetValidationLog } from "./validation-log";
import {
  runBiologicalSolverRig,
  runTopologySolverRig,
} from "../solvers/solver-rigs";
import {
  runChemistrySolverWorkflowRig,
  runPhysicsSolverWorkflowRig,
} from "../solvers/workflow-solver-rigs";
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

const validatePhysicsSolver = () => {
  const { outputs, outputGeometry, baseGeometry } = runPhysicsSolverWorkflowRig();
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

const validateTopologySolver = () => {
  const { outputs, isoOutputs, outputGeometry } = runTopologySolverRig("topologySolver");
  ensure(outputs.status === "complete", "Expected topology solver complete");
  ensure(Array.isArray(outputs.densityField), "Expected density field array");
  ensure(outputs.densityField.length > 0, "Expected density field data");
  ensure(outputs.voxelGrid !== null, "Expected voxel grid output");
  ensure(outputs.resolution > 0, "Expected resolution > 0");
  ensureMesh(isoOutputs.mesh as RenderMesh, "topology iso mesh");
  ensureMesh(outputGeometry.mesh, "topology output geometry");
};

const validateVoxelSolver = () => {
  const { outputs, isoOutputs, outputGeometry } = runTopologySolverRig("voxelSolver");
  ensure(outputs.status === "complete", "Expected voxel solver complete");
  ensure(Array.isArray(outputs.densityField), "Expected density field array");
  ensure(outputs.densityField.length > 0, "Expected density field data");
  ensure(outputs.voxelGrid !== null, "Expected voxel grid output");
  ensureMesh(isoOutputs.mesh as RenderMesh, "voxel iso mesh");
  ensureMesh(outputGeometry.mesh, "voxel output geometry");
};

const validateChemistrySolver = () => {
  const { outputs, outputGeometry } = runChemistrySolverWorkflowRig();
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

  runNodeValidation("physicsSolver", validatePhysicsSolver);
  runNodeValidation("topologySolver", validateTopologySolver);
  runNodeValidation("voxelSolver", validateVoxelSolver);
  runNodeValidation("chemistrySolver", validateChemistrySolver);
  runNodeValidation("biologicalSolver", validateBiologicalSolver);

  return generateReport();
};
