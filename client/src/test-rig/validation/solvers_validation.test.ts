import { describe, expect, it } from "vitest";
import { runSolversValidation } from "./solvers_validation";

describe("Solver node validation", () => {
  it("passes all solver rigs", () => {
    const report = runSolversValidation();
    expect(report.failed).toBe(0);
  });
});
