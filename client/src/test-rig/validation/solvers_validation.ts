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
      (particle): particle is { materials?: Record<string, number> } =>
        particle != null && typeof particle === "object"
    );
    const MIN_MAX_CONCENTRATION = 0.05;
    materialNames.forEach((name) => {
      let max = 0;
      particles.forEach((particle) => {
        const value = particle.materials?.[name] ?? 0;
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
    const expectedNames = Array.isArray(parsed)
      ? parsed
          .map((entry) => {
            if (entry && typeof entry === "object") {
              const material = (entry as any).material;
              if (material && typeof material === "object") {
                return typeof material.name === "string" ? material.name : null;
              }
              return typeof (entry as any).name === "string" ? (entry as any).name : null;
            }
            return null;
          })
          .filter((name): name is string => typeof name === "string")
      : [];
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
  runNodeValidation("chemistrySolver/regions", validateChemistrySolver);
  runNodeValidation("chemistrySolver/textInputs", validateChemistrySolverTextInputs);
  runNodeValidation("chemistrySolver/disabled", validateChemistrySolverDisabled);
  runNodeValidation("biologicalSolver", validateBiologicalSolver);

  return generateReport();
};
