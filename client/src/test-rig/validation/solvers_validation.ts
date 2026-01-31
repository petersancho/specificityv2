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

const ensureFiniteArray = (values: number[], label: string) => {
  for (let i = 0; i < values.length; i += 1) {
    ensureFinite(values[i], `${label}: non-finite value at ${i}`);
  }
};

const ensureFiniteVec3Array = (values: Array<{ x: number; y: number; z: number }>, label: string) => {
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    ensureFinite(value.x, `${label}: non-finite x at ${i}`);
    ensureFinite(value.y, `${label}: non-finite y at ${i}`);
    ensureFinite(value.z, `${label}: non-finite z at ${i}`);
  }
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
  ensure(outputs.stressField.length === baseVertexCount, "Expected stress field per vertex");
  ensureFinite(outputs.result.finalObjectiveValue, "Expected finite objective value");
  ensureFiniteVec3Array(outputs.displacements, "physics static displacements");
  ensureFiniteArray(outputs.stressField, "physics static stress field");
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
  ensure(outputs.stressField.length === baseVertexCount, "Expected stress field per vertex");
  ensureFiniteVec3Array(outputs.displacements, "physics dynamic displacements");
  ensureFiniteArray(outputs.stressField, "physics dynamic stress field");
  ensureMesh(outputs.mesh as RenderMesh, "physics dynamic mesh");
  ensureMesh(outputGeometry.mesh, "physics dynamic geometry");
  ensureStressColors(outputGeometry.mesh, "physics dynamic geometry");
};

const validatePhysicsModal = () => {
  const { outputs, outputGeometry, baseGeometry } = runPhysicsSolverRig("modal");
  const baseVertexCount = Math.floor(baseGeometry.mesh.positions.length / 3);
  ensure(outputs.geometry === "physics-modal-out", "Expected geometry id to match");
  ensure(outputs.result.success === true, "Expected physics solver success");
  ensure(outputs.animation !== null, "Expected animation for modal analysis");
  ensure(outputs.animation.frames.length > 0, "Expected modal frames");
  ensure(outputs.displacements.length === baseVertexCount, "Expected displacement per vertex");
  ensure(outputs.stressField.length === baseVertexCount, "Expected stress field per vertex");
  ensureFiniteVec3Array(outputs.displacements, "physics modal displacements");
  ensureFiniteArray(outputs.stressField, "physics modal stress field");
  ensureMesh(outputs.mesh as RenderMesh, "physics modal mesh");
  ensureMesh(outputGeometry.mesh, "physics modal geometry");
  ensureStressColors(outputGeometry.mesh, "physics modal geometry");
};

const validatePhysicsSafetyWarnings = () => {
  const { outputs } = runPhysicsSolverRig("static", {
    meshSegments: 4,
    maxIterations: 90,
    chunkSize: 128,
    loadForce: { x: 0, y: -25000, z: 0 },
    maxDeformation: 1e-9,
    maxStress: 1e-9,
  });
  ensure(outputs.result.success === true, "Expected physics solver success");
  ensure(
    outputs.result.warnings.some((warning) => warning.includes("Deformation exceeds specified limits")),
    "Expected deformation warning"
  );
  ensure(
    outputs.result.warnings.some((warning) => warning.includes("Stress exceeds specified limits")),
    "Expected stress warning"
  );
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
  runNodeValidation("physicsSolver/safety-warnings", validatePhysicsSafetyWarnings);
  runNodeValidation("topologySolver", validateTopologySolver);
  runNodeValidation("voxelSolver", validateVoxelSolver);
  runNodeValidation("chemistrySolver", validateChemistrySolver);
  runNodeValidation("biologicalSolver", validateBiologicalSolver);

  return generateReport();
};
