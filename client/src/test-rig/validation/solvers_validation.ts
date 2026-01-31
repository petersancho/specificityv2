import { generateReport, logValidation, resetValidationLog } from "./validation-log";
import {
  type ChemistrySolverRigMode,
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

const sumMaterialMap = (map: Record<string, number>) =>
  Object.values(map).reduce((sum, value) => sum + value, 0);

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

const validateChemistrySolver = (mode: ChemistrySolverRigMode) => {
  const { outputs, outputGeometry } = runChemistrySolverRig(mode);
  ensure(outputs.status === "complete", "Expected chemistry solver complete");
  ensure(outputs.geometry === "chemistry-out", "Expected geometry output id to match");
  ensure(outputs.materialParticles.length > 0, "Expected chemistry particles");
  ensureFinite(outputs.totalEnergy, "Expected finite totalEnergy");

  ensure(outputs.history.length > 0, "Expected chemistry history");
  const lastHistory = outputs.history[outputs.history.length - 1];
  ensureFinite(lastHistory.totalEnergy, "Expected finite history totalEnergy");
  ensure(
    Math.abs(outputs.totalEnergy - lastHistory.totalEnergy) < 1e-6,
    "Expected totalEnergy to match history tail"
  );

  ensure(outputs.bestState !== null, "Expected bestState snapshot");
  if (outputs.bestState) {
    ensure(outputs.bestState.particles.length === outputs.materialParticles.length, "Expected bestState particles count");
    ensure(outputs.bestState.totalEnergy <= outputs.totalEnergy + 1e-6, "Expected bestState energy <= final");
  }

  const diagnostics = outputs.diagnostics as { iterations?: number };
  ensureFinite(typeof diagnostics.iterations === "number" ? diagnostics.iterations : NaN, "Expected diagnostics iterations");

  ensure(outputs.materialField !== null, "Expected chemistry field");
  if (outputs.materialField) {
    const cellCount =
      outputs.materialField.resolution.x *
      outputs.materialField.resolution.y *
      outputs.materialField.resolution.z;
    ensure(outputs.materialField.densities.length === cellCount, "Expected field density length");
    ensure(outputs.materialField.channels.length === outputs.materialField.materials.length, "Expected field channel count");
  }

  ensure(outputs.materials.length > 0, "Expected materials list");
  const materialNames = outputs.materials.map((material: { name: string }) => material.name);
  ensure(materialNames.length >= 2, "Expected multiple materials");

  const particles = outputs.materialParticles as Array<{ materials: Record<string, number> }>;
  const sampleCount = Math.min(particles.length, 128);
  for (let index = 0; index < sampleCount; index += 1) {
    const particle = particles[index];
    const total = sumMaterialMap(particle.materials);
    ensure(Math.abs(total - 1) < 1e-3, `Particle ${index}: materials must sum to 1`);
    materialNames.forEach((name) => {
      ensureFinite(particle.materials[name] ?? 0, `Particle ${index}: materials missing ${name}`);
    });
  }

  const mesh = outputs.mesh as RenderMesh;
  ensureMesh(mesh, "chemistry mesh");
  ensure(Array.isArray(mesh.colors), "chemistry mesh: colors missing");
  ensure((mesh.colors ?? []).length === mesh.positions.length, "chemistry mesh: color length mismatch");
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
  runNodeValidation("chemistrySolver/structured", () => validateChemistrySolver("structured"));
  runNodeValidation("chemistrySolver/materialsText", () => validateChemistrySolver("materialsText"));
  runNodeValidation("biologicalSolver", validateBiologicalSolver);

  return generateReport();
};
