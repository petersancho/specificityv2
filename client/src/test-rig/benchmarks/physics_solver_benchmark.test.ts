import { describe, it } from "vitest";
import { generateBoxMesh } from "../../geometry/mesh";
import type { SolverConfiguration } from "../../workflow/nodes/solver/types";
import { solvePhysicsChunkedSync } from "../../workflow/nodes/solver/solverInterface";
import { runPhysicsWorkerSolve } from "../../workflow/nodes/solver/physicsWorkerClient";
import { buildPhysicsGoals } from "../solvers/physics-solver-fixtures";
import {
  buildPhysicsSolverRunReport,
  logPhysicsSolverRunReport,
} from "../solvers/physics-solver-report";

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

describe("Physics solver benchmark", () => {
  it("logs CPU vs worker timing (if available)", async () => {
    const mesh = generateBoxMesh({ width: 2, height: 1.2, depth: 1.5 }, 24);
    const goals = buildPhysicsGoals(mesh, "static");
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
    let lastCpuResult = solvePhysicsChunkedSync({ mesh, goals, config }, config.chunkSize);
    for (let i = 0; i < 2; i += 1) {
      const start = performance.now();
      const result = solvePhysicsChunkedSync({ mesh, goals, config }, config.chunkSize);
      const end = performance.now();
      if (!result.success && result.errors.length > 0) {
        throw new Error(result.errors.join(", "));
      }
      cpuTimings.push(end - start);
      lastCpuResult = result;
    }

    const cpuAvg = average(cpuTimings);
    console.log(`[BENCH] physics solver CPU avg: ${cpuAvg.toFixed(1)}ms`);

    logPhysicsSolverRunReport(
      buildPhysicsSolverRunReport({
        label: "benchmark/cpu",
        computeMode: "cpu",
        mesh,
        goals,
        config,
        result: lastCpuResult,
      })
    );

    const workerTimings: number[] = [];
    let lastWorkerResult = lastCpuResult;
    let lastWorkerMode: "worker" | "cpu-fallback" = "cpu-fallback";
    for (let i = 0; i < 2; i += 1) {
      const start = performance.now();
      const workerResult = await runPhysicsWorkerSolve({ mesh, goals, config: { ...config, useGPU: true } });
      const end = performance.now();
      if (!workerResult.result.success && workerResult.result.errors.length > 0) {
        throw new Error(workerResult.result.errors.join(", "));
      }
      workerTimings.push(end - start);
      lastWorkerResult = workerResult.result;
      lastWorkerMode = workerResult.computeMode;
    }

    logPhysicsSolverRunReport(
      buildPhysicsSolverRunReport({
        label: "benchmark/worker",
        computeMode: lastWorkerMode,
        mesh,
        goals,
        config: { ...config, useGPU: true },
        result: lastWorkerResult,
      })
    );

    if (lastWorkerMode === "cpu-fallback") {
      console.log("[BENCH] worker unavailable in this environment; skipped worker timing.");
      return;
    }

    const workerAvg = average(workerTimings);
    console.log(`[BENCH] physics solver worker avg: ${workerAvg.toFixed(1)}ms`);
  }, 30000);
});
