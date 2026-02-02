import type { RenderMesh } from "../../types";
import { createTestContext, wrapMeshGeometry } from "./rig-utils";
import { buildVoxelGoals, buildVoxelConfig, buildVoxelParameters } from "./voxel-solver-fixtures";
import { buildVoxelSolverRunReport, logVoxelSolverRunReport } from "./voxel-solver-report";
import { buildVoxelHeroGeometry } from "./solver-hero-geometry";
import { getNodeDefinition } from "../utils/test-utils";

export const runVoxelSolverExample = (nodeType: "voxelSolver" | "topologySolver" = "voxelSolver") => {
  const solverNode = getNodeDefinition(nodeType);
  const isoNode = getNodeDefinition("extractIsosurface");
  
  const heroMesh = buildVoxelHeroGeometry();
  const baseGeometry = wrapMeshGeometry(`geo-${nodeType}`, heroMesh);
  const context = createTestContext(`${nodeType}-context`, [baseGeometry]);

  const goals = buildVoxelGoals(baseGeometry.mesh);
  const config = buildVoxelConfig();
  const parameters = buildVoxelParameters(config, `${nodeType}-out`);

  const outputs = solverNode.compute({
    inputs: { domain: baseGeometry.id, goals: goals as any },
    parameters,
    context,
  });

  const isoParams = {
    geometryId: `${nodeType}-iso`,
    isoValue: 0.35,
    resolution: (outputs.resolution as number) ?? 12,
  };

  const isoOutputs = isoNode.compute({
    inputs: { voxelGrid: outputs.voxelGrid ?? outputs.densityField },
    parameters: isoParams,
    context,
  });

  const outputGeometry = wrapMeshGeometry(
    isoParams.geometryId,
    isoOutputs.mesh as RenderMesh
  );

  const report = buildVoxelSolverRunReport({
    label: `example/${nodeType}`,
    mesh: baseGeometry.mesh,
    goals,
    config,
    outputs: {
      status: outputs.status as string,
      densityField: outputs.densityField as number[],
      voxelGrid: outputs.voxelGrid as any,
      resolution: outputs.resolution as number,
      objective: outputs.objective as number,
      constraint: outputs.constraint as number,
      iterations: (outputs.iterations as number) ?? config.iterations,
    },
    isoMesh: isoOutputs.mesh as RenderMesh,
  });

  logVoxelSolverRunReport(report);

  return {
    report,
    outputs,
    isoOutputs,
    outputGeometry,
    baseGeometry,
    context,
  };
};

const main = () => {
  runVoxelSolverExample("voxelSolver");
  runVoxelSolverExample("topologySolver");
};

const maybeMain = (import.meta as ImportMeta & { main?: boolean }).main;
if (maybeMain === true) {
  main();
}
