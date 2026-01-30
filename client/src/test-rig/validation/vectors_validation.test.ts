import { describe, expect, it } from "vitest";
import { runVectorsValidation } from "./vectors_validation";

describe("Vector node validation", () => {
  it("passes all vector nodes", () => {
    const report = runVectorsValidation();
    expect(report.failed).toBe(0);
  });
});
