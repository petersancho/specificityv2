export type ValidationStatus = "PASS" | "FAIL" | "WARN";

export type ValidationResult = {
  category: string;
  nodeName: string;
  status: ValidationStatus;
  error?: string;
  timestamp: string;
};

const validationLog: ValidationResult[] = [];

export const logValidation = (result: ValidationResult) => {
  validationLog.push(result);
  const prefix = result.status === "PASS" ? "PASS" : result.status === "WARN" ? "WARN" : "FAIL";
  const detail = result.error ? ` - ${result.error}` : "";
  console.log(`[${prefix}] [${result.category}] ${result.nodeName}${detail}`);
};

export const generateReport = () => {
  const total = validationLog.length;
  const passed = validationLog.filter((entry) => entry.status === "PASS").length;
  const failed = validationLog.filter((entry) => entry.status === "FAIL").length;
  const warned = validationLog.filter((entry) => entry.status === "WARN").length;

  console.log("\n=== VALIDATION REPORT ===");
  console.log(`Total Nodes: ${total}`);
  console.log(`Passed: ${passed} (${total ? ((passed / total) * 100).toFixed(1) : "0.0"}%)`);
  console.log(`Failed: ${failed}`);
  console.log(`Warnings: ${warned}`);

  if (failed > 0) {
    console.log("\nFailed Nodes:");
    validationLog
      .filter((entry) => entry.status === "FAIL")
      .forEach((entry) => {
        const error = entry.error ? `: ${entry.error}` : "";
        console.log(`  - ${entry.category}/${entry.nodeName}${error}`);
      });
  }

  return { total, passed, failed, warned };
};

export const resetValidationLog = () => {
  validationLog.length = 0;
};
