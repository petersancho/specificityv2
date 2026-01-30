import { describe, expect, it } from "vitest";
import { runDataValidation } from "./data_validation";

describe("Data node validation", () => {
  it("passes all data nodes", () => {
    const report = runDataValidation();
    expect(report.failed).toBe(0);
  });
});
