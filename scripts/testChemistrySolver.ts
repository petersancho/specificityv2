/**
 * Chemistry Solver Test Runner
 * 
 * Runs functional tests for the Chemistry Solver to verify:
 * - Input parsing (materials, seeds, goals)
 * - Simulation execution
 * - Output generation
 * - PhD-level analysis and validation
 */

import { runChemistrySolverFunctionalTests } from "../client/src/test-rig/solvers/chemistry-solver-functional-test";

console.log("\n🧪 Starting Chemistry Solver Functional Tests...\n");

try {
  const allPassed = runChemistrySolverFunctionalTests();
  
  if (allPassed) {
    console.log("\n✅ Chemistry Solver is fully functional and semantically integrated!\n");
    process.exit(0);
  } else {
    console.log("\n❌ Some tests failed. Chemistry Solver needs fixes.\n");
    process.exit(1);
  }
} catch (error) {
  console.error("\n❌ Test runner failed:", error);
  process.exit(1);
}
