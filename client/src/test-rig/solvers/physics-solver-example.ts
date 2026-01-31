import type { AnalysisType } from "../../workflow/nodes/solver/types";
import { solvePhysicsChunkedSync } from "../../workflow/nodes/solver/solverInterface";
import { createBoxGeometry } from "./rig-utils";
import { buildExamplePhysicsConfig, buildPhysicsGoals } from "./physics-solver-fixtures";
import { buildPhysicsSolverRunReport, logPhysicsSolverRunReport } from "./physics-solver-report";

export const runPhysicsSolverExample = (analysisType: AnalysisType) => {
  const baseGeometry = createBoxGeometry(`geo-physics-${analysisType}`, {
    width: 2,
    height: 1.2,
    depth: 1.5,
  });
  // Modal analysis currently reuses the static load pattern so the example stays comparable.
  const loadType = analysisType === "dynamic" ? "dynamic" : "static";
  const goals = buildPhysicsGoals(baseGeometry.mesh, loadType);
  const config = buildExamplePhysicsConfig(analysisType);
  const result = solvePhysicsChunkedSync({ mesh: baseGeometry.mesh, goals, config }, config.chunkSize);

  const report = buildPhysicsSolverRunReport({
    label: `example/${analysisType}`,
    computeMode: "cpu",
    mesh: baseGeometry.mesh,
    goals,
    config,
    result,
  });
  logPhysicsSolverRunReport(report);
  return report;
};

const main = () => {
  runPhysicsSolverExample("static");
  runPhysicsSolverExample("dynamic");
  runPhysicsSolverExample("modal");
};

const maybeMain = (import.meta as ImportMeta & { main?: boolean }).main;
if (maybeMain === true) {
  main();
}
