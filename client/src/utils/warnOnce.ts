/**
 * Utility to warn once per unique key to avoid log spam
 */

const seen = new Set<string>();

export function warnOnce(key: string, message: string): void {
  if (seen.has(key)) return;
  seen.add(key);
  console.warn(message);
}

export function clearWarnOnceCache(): void {
  seen.clear();
}
