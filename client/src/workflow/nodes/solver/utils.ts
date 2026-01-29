import type { Vec3 } from "../../../types";

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const toNumber = (value: unknown, fallback: number) => {
  if (isFiniteNumber(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

export const toBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (isFiniteNumber(value)) return Math.abs(value) > 1e-9;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
    if (lower.length > 0) {
      const parsed = Number(lower);
      if (Number.isFinite(parsed)) return Math.abs(parsed) > 1e-9;
    }
  }
  return fallback;
};

export const isVec3 = (value: unknown): value is Vec3 => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Vec3;
  return (
    isFiniteNumber(candidate.x) &&
    isFiniteNumber(candidate.y) &&
    isFiniteNumber(candidate.z)
  );
};

const flattenList = (value: unknown, target: unknown[]) => {
  if (Array.isArray(value)) {
    value.forEach((entry) => flattenList(entry, target));
    return;
  }
  target.push(value);
};

export const toList = (value: unknown): unknown[] => {
  if (value == null) return [];
  const list: unknown[] = [];
  flattenList(value, list);
  return list;
};

export const toIndexList = (value: unknown): number[] => {
  const list = toList(value);
  const indices: number[] = [];
  list.forEach((entry) => {
    const numeric = toNumber(entry, Number.NaN);
    if (!Number.isFinite(numeric)) return;
    const rounded = Math.round(numeric);
    if (rounded < 0) return;
    indices.push(rounded);
  });
  return indices;
};

export const vectorParameterSpecs = (
  prefix: string,
  labelPrefix: string,
  defaults: Vec3
) => [
  {
    key: `${prefix}X`,
    label: `${labelPrefix} X`,
    type: "number" as const,
    defaultValue: defaults.x,
    step: 0.1,
  },
  {
    key: `${prefix}Y`,
    label: `${labelPrefix} Y`,
    type: "number" as const,
    defaultValue: defaults.y,
    step: 0.1,
  },
  {
    key: `${prefix}Z`,
    label: `${labelPrefix} Z`,
    type: "number" as const,
    defaultValue: defaults.z,
    step: 0.1,
  },
];

export const readVec3Parameters = (
  parameters: Record<string, unknown>,
  prefix: string,
  fallback: Vec3
): Vec3 => ({
  x: toNumber(parameters[`${prefix}X`], fallback.x),
  y: toNumber(parameters[`${prefix}Y`], fallback.y),
  z: toNumber(parameters[`${prefix}Z`], fallback.z),
});

export const resolveVec3Input = (
  inputs: Record<string, unknown>,
  parameters: Record<string, unknown>,
  key: string,
  parameterPrefix: string,
  fallback: Vec3
): Vec3 => {
  const candidate = inputs[key];
  if (isVec3(candidate)) return candidate;
  if (Array.isArray(candidate) && candidate.length >= 3) {
    return {
      x: toNumber(candidate[0], fallback.x),
      y: toNumber(candidate[1], fallback.y),
      z: toNumber(candidate[2], fallback.z),
    };
  }
  return readVec3Parameters(parameters, parameterPrefix, fallback);
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
