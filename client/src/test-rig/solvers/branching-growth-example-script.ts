import { generateBranchingGrowthSolverExample } from "./branching-growth-example";

try {
  const example = generateBranchingGrowthSolverExample();
  console.log(JSON.stringify(example, null, 2));
} catch (error) {
  console.error("Failed to generate branching growth solver example:", error);
  // Let the runtime surface the failure via a non-zero exit.
  throw error;
}
