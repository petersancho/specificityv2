export type RGB = [number, number, number];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const toHex = (value: number) => value.toString(16).padStart(2, "0").toUpperCase();

export const normalizeHexColor = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  let hex = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => `${char}${char}`)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return `#${hex.toUpperCase()}`;
};

export const hexToRgb = (value?: string | null): RGB | null => {
  const normalized = normalizeHexColor(value);
  if (!normalized) return null;
  const hex = normalized.slice(1);
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return [r, g, b];
};

export const rgbToHex = (rgb: RGB) => {
  const r = Math.round(clamp01(rgb[0]) * 255);
  const g = Math.round(clamp01(rgb[1]) * 255);
  const b = Math.round(clamp01(rgb[2]) * 255);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const normalizeRgbInput = (value: unknown): RGB | null => {
  if (!value) return null;
  if (Array.isArray(value)) {
    const [rRaw, gRaw, bRaw] = value;
    if (
      typeof rRaw === "number" &&
      typeof gRaw === "number" &&
      typeof bRaw === "number"
    ) {
      const max = Math.max(rRaw, gRaw, bRaw);
      const scale = max > 1 ? 1 / 255 : 1;
      return [clamp01(rRaw * scale), clamp01(gRaw * scale), clamp01(bRaw * scale)];
    }
  }
  if (typeof value === "object") {
    const record = value as { x?: unknown; y?: unknown; z?: unknown };
    if (
      typeof record.x === "number" &&
      typeof record.y === "number" &&
      typeof record.z === "number"
    ) {
      const max = Math.max(record.x, record.y, record.z);
      const scale = max > 1 ? 1 / 255 : 1;
      return [
        clamp01(record.x * scale),
        clamp01(record.y * scale),
        clamp01(record.z * scale),
      ];
    }
  }
  return null;
};
