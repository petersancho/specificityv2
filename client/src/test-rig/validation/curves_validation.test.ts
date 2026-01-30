import { describe, expect, it } from "vitest";
import { runCurvesValidation } from "./curves_validation";

describe("Curve node validation", () => {
  it("passes all curve nodes", () => {
    const report = runCurvesValidation();
    expect(report.failed).toBe(0);
  });
});
