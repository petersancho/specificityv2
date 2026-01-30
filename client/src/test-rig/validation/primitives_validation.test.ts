import { describe, expect, it } from "vitest";
import { runPrimitivesValidation } from "./primitives_validation";

describe("Primitive node validation", () => {
  it("passes all primitive nodes", () => {
    const report = runPrimitivesValidation();
    expect(report.failed).toBe(0);
  });
});
