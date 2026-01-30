import { describe, expect, it } from "vitest";
import { runMathValidation } from "./math_validation";

describe("Math node validation", () => {
  it("passes all math nodes", () => {
    const report = runMathValidation();
    expect(report.failed).toBe(0);
  });
});
