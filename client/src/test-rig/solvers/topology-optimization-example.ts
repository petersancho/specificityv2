import { runTopologySolverRig } from "./solver-rigs";

export const runTopologyOptimizationExample = () => {
  const topology = runTopologySolverRig("topologySolver");
  const voxel = runTopologySolverRig("voxelSolver");

  return {
    generatedAt: new Date().toISOString(),
    runs: [topology.report, voxel.report],
  };
};

const isMain = (import.meta as unknown as { main?: boolean }).main === true;

if (isMain) {
  const report = runTopologyOptimizationExample();
  console.log(JSON.stringify(report, null, 2));
}
