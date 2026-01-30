import { describe, it } from "vitest";
import { generateBoxMesh } from "../../geometry/mesh";
import type { RenderMesh } from "../../types";
import type {
  AnchorGoal,
  GoalSpecification,
  LoadGoal,
  SolverConfiguration,
  StiffnessGoal,
  VolumeGoal,
} from "../../workflow/nodes/solver/types";
import { solvePhysicsChunkedSync } from "../../workflow/nodes/solver/solverInterface";
import { runPhysicsWorkerSolve } from "../../workflow/nodes/solver/physicsWorkerClient";

const buildPhysicsGoals = (mesh: RenderMesh): GoalSpecification[] => {
  const vertexCount = Math.floor(mesh.positions.length / 3);
  const anchorIndices: number[] = [];
  const loadIndices: number[] = [];
  for (let i = 0; i < vertexCount; i += 1) {
    if (i % 7 === 0) anchorIndices.push(i);
    if (i % 11 === 0) loadIndices.push(i);
  }

  const stiffness: StiffnessGoal = {
    goalType: "stiffness",
    weight: 0.3,
    target: 1,
    geometry: { elements: loadIndices },
    parameters: {
      youngModulus: 2.1e9,
      poissonRatio: 0.3,
      targetStiffness: 1,
    },
  };

  const volume: VolumeGoal = {
    goalType: "volume",
    weight: 0.2,
    target: 1,
    geometry: { elements: [] },
    parameters: {
      targetVolume: 1,
      materialDensity: 7800,
      allowedDeviation: 0.1,
    },
  };

  const load: LoadGoal = {
    goalType: "load",
    weight: 0.3,
    target: 1,
    geometry: { elements: loadIndices },
    parameters: {
      force: { x: 0, y: -120, z: 0 },
      applicationPoints: loadIndices,
      distributed: true,
      loadType: "static",
    },
  };

  const anchor: AnchorGoal = {
    goalType: "anchor",
    weight: 0.2,
    target: 0,
    geometry: { elements: anchorIndices },
    parameters: {
      fixedDOF: { x: true, y: true, z: true },
      anchorType: "fixed",
      springStiffness: 0,
    },
  };

  return [stiffness, volume, load, anchor];
};

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

describe("Physics solver benchmark", () => {
  it("logs CPU vs worker timing (if available)", async () => {
    const mesh = generateBoxMesh({ width: 2, height: 1.2, depth: 1.5 }, 24);
    const goals = buildPhysicsGoals(mesh);
    const config: SolverConfiguration = {
      maxIterations: 140,
      convergenceTolerance: 1e-6,
      analysisType: "static",
      chunkSize: 256,
      safetyLimits: {
        maxDeformation: 100,
        maxStress: 1e12,
      },
    };

    solvePhysicsChunkedSync({ mesh, goals, config }, config.chunkSize);

    const cpuTimings: number[] = [];
    for (let i = 0; i < 2; i += 1) {
      const start = performance.now();
      const result = solvePhysicsChunkedSync({ mesh, goals, config }, config.chunkSize);
      const end = performance.now();
      if (!result.success && result.errors.length > 0) {
        throw new Error(result.errors.join(", "));
      }
      cpuTimings.push(end - start);
    }

    const cpuAvg = average(cpuTimings);
    console.log(`[BENCH] physics solver CPU avg: ${cpuAvg.toFixed(1)}ms`);

    const workerTimings: number[] = [];
    for (let i = 0; i < 2; i += 1) {
      const start = performance.now();
      const workerResult = await runPhysicsWorkerSolve({ mesh, goals, config: { ...config, useGPU: true } });
      const end = performance.now();
      if (!workerResult.result.success && workerResult.result.errors.length > 0) {
        throw new Error(workerResult.result.errors.join(", "));
      }
      if (workerResult.computeMode === "cpu-fallback") {
        console.log("[BENCH] worker unavailable in this environment; skipped worker timing.");
        return;
      }
      workerTimings.push(end - start);
    }

    const workerAvg = average(workerTimings);
    console.log(`[BENCH] physics solver worker avg: ${workerAvg.toFixed(1)}ms`);
  }, 30000);
});
