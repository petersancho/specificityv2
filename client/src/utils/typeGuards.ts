/**
 * Type guard utilities for narrowing undefined/null types
 */

export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

export function assertDefined<T>(value: T | undefined | null, message = "Expected value to be defined"): T {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
  return value;
}

export function withDefault<T>(value: T | undefined | null, defaultValue: T): T {
  return value !== undefined && value !== null ? value : defaultValue;
}
