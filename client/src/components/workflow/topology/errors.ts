// ============================================================================
// TOPOLOGY OPTIMIZATION - SEMANTIC ERROR TYPES
// ============================================================================

export type ValidationIssueType =
  | 'EMPTY_MESH'
  | 'DEGENERATE_GEOMETRY'
  | 'INVALID_PARAMETER'
  | 'BC_CONFLICT'
  | 'BC_DISTRIBUTION_FAILED'
  | 'ZERO_FORCES'
  | 'UNDER_CONSTRAINED'
  | 'OVER_CONSTRAINED'
  | 'COORDINATE_MISMATCH'
  | 'RESOLUTION_MISMATCH'
  | 'OUT_OF_BOUNDS';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  type: ValidationIssueType;
  severity: ValidationSeverity;
  message: string;
  context?: Record<string, unknown>;
}

export class SimpValidationError extends Error {
  constructor(
    public issues: ValidationIssue[]
  ) {
    const errorMessages = issues
      .filter(i => i.severity === 'error')
      .map(i => `[${i.type}] ${i.message}`)
      .join('\n');
    super(`SIMP Validation Failed:\n${errorMessages}`);
    this.name = 'SimpValidationError';
  }
}

export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some(i => i.severity === 'error');
}

export function createIssue(
  type: ValidationIssueType,
  severity: ValidationSeverity,
  message: string,
  context?: Record<string, unknown>
): ValidationIssue {
  return { type, severity, message, context };
}
