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
import { buildPhysicsSolverReport } from "../solvers/physics-solver-report";

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

    const warmupResult = solvePhysicsChunkedSync({ mesh, goals, config }, config.chunkSize);
    if (!warmupResult.success && warmupResult.errors.length > 0) {
      throw new Error(`Warmup failed: ${warmupResult.errors.join(", ")}`);
    }

    const cpuTimings: number[] = [];
    const cpuComputeTimes: number[] = [];
    let lastCpuResult = warmupResult;
    for (let i = 0; i < 2; i += 1) {
      const start = performance.now();
      const result = solvePhysicsChunkedSync({ mesh, goals, config }, config.chunkSize);
      const end = performance.now();
      if (!result.success && result.errors.length > 0) {
        throw new Error(result.errors.join(", "));
      }
      cpuTimings.push(end - start);
      cpuComputeTimes.push(result.performanceMetrics.computeTime);
      lastCpuResult = result;
    }

    const cpuAvg = average(cpuTimings);
    const cpuComputeAvg = average(cpuComputeTimes);
    console.log(`[BENCH] physics solver CPU wall avg: ${cpuAvg.toFixed(1)}ms`);
    console.log(`[BENCH] physics solver CPU compute avg: ${cpuComputeAvg.toFixed(1)}ms`);

    const cpuReport = buildPhysicsSolverReport({
      name: "physics-bench/cpu",
      inputMesh: mesh,
      outputMesh: lastCpuResult.deformedMesh ?? mesh,
      goals,
      config,
      result: lastCpuResult,
    });

    const workerTimings: number[] = [];
    const workerComputeTimes: number[] = [];
    let lastWorkerReport: ReturnType<typeof buildPhysicsSolverReport> | null = null;
    for (let i = 0; i < 2; i += 1) {
      const start = performance.now();
      const workerResult = await runPhysicsWorkerSolve({ mesh, goals, config: { ...config, useGPU: true } });
      const end = performance.now();
      if (!workerResult.result.success && workerResult.result.errors.length > 0) {
        throw new Error(workerResult.result.errors.join(", "));
      }
      if (workerResult.computeMode === "cpu-fallback") {
        console.log("[BENCH] worker unavailable in this environment; skipped worker timing.");
        console.log("[BENCH_JSON]");
        console.log(
          JSON.stringify(
            {
              cpu: {
                wallTimesMs: cpuTimings,
                wallAvgMs: cpuAvg,
                computeTimesMs: cpuComputeTimes,
                computeAvgMs: cpuComputeAvg,
                report: cpuReport,
              },
              worker: {
                available: false,
              },
            },
            null,
            2
          )
        );
        return;
      }
      workerTimings.push(end - start);
      workerComputeTimes.push(workerResult.result.performanceMetrics.computeTime);
      lastWorkerReport = buildPhysicsSolverReport({
        name: "physics-bench/worker",
        inputMesh: mesh,
        outputMesh: workerResult.result.deformedMesh ?? mesh,
        goals,
        config: { ...config, useGPU: true },
        result: workerResult.result,
      });
    }

    const workerAvg = average(workerTimings);
    const workerComputeAvg = average(workerComputeTimes);
    console.log(`[BENCH] physics solver worker wall avg: ${workerAvg.toFixed(1)}ms`);
    console.log(`[BENCH] physics solver worker compute avg: ${workerComputeAvg.toFixed(1)}ms`);
    console.log("[BENCH_JSON]");
    console.log(
      JSON.stringify(
        {
          cpu: {
            wallTimesMs: cpuTimings,
            wallAvgMs: cpuAvg,
            computeTimesMs: cpuComputeTimes,
            computeAvgMs: cpuComputeAvg,
            report: cpuReport,
          },
          worker: {
            available: true,
            wallTimesMs: workerTimings,
            wallAvgMs: workerAvg,
            computeTimesMs: workerComputeTimes,
            computeAvgMs: workerComputeAvg,
            report: lastWorkerReport,
          },
        },
        null,
        2
      )
    );
  }, 30000);
});
