export type PanelFormatOptions = {
  maxLines: number;
  showIndex: boolean;
  indexStart: number;
  indent: number;
};

type Vec3Value = { x: number; y: number; z: number };

const DEFAULT_PANEL_OPTIONS: PanelFormatOptions = {
  maxLines: 12,
  showIndex: true,
  indexStart: 0,
  indent: 2,
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const coerceNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const coerceBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
};

const isVec3Value = (value: unknown): value is Vec3Value => {
  if (!value || typeof value !== "object") return false;
  const vec = value as Partial<Vec3Value>;
  return (
    typeof vec.x === "number" &&
    Number.isFinite(vec.x) &&
    typeof vec.y === "number" &&
    Number.isFinite(vec.y) &&
    typeof vec.z === "number" &&
    Number.isFinite(vec.z)
  );
};

const formatNumber = (value: number, decimals = 1) => {
  const rounded = Number(value.toFixed(decimals));
  return Number.isInteger(rounded) ? String(Math.trunc(rounded)) : String(rounded);
};

const formatVec3 = (value: Vec3Value) =>
  `(${formatNumber(value.x, 2)}, ${formatNumber(value.y, 2)}, ${formatNumber(
    value.z,
    2
  )})`;

const isInlineValue = (value: unknown) => {
  if (value == null) return true;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
    return true;
  }
  if (isVec3Value(value)) return true;
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    isVec3Value(value[0]) &&
    isVec3Value(value[1])
  ) {
    return true;
  }
  return false;
};

export const formatInlineValue = (value: unknown): string => {
  if (value == null) return "--";
  if (typeof value === "number") return formatNumber(value, Math.abs(value) < 10 ? 3 : 2);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    if (
      value.length === 2 &&
      isVec3Value(value[0]) &&
      isVec3Value(value[1])
    ) {
      return `${formatVec3(value[0])} -> ${formatVec3(value[1])}`;
    }
    if (value.length === 0) return "[]";
    const allNumbers = value.every((entry) => typeof entry === "number");
    if (allNumbers) {
      const entries = value
        .slice(0, 4)
        .map((entry) => formatNumber(entry as number, 2))
        .join(", ");
      return value.length > 4 ? `[${entries}, ...]` : `[${entries}]`;
    }
    const preview = value
      .slice(0, 3)
      .map((entry) => formatInlineValue(entry))
      .join(", ");
    return value.length > 3 ? `[${preview}, ...]` : `[${preview}]`;
  }
  if (isVec3Value(value)) return formatVec3(value);
  if (typeof value === "object") {
    const typed = value as { type?: unknown; id?: unknown };
    if (typeof typed.type === "string") {
      const id = typeof typed.id === "string" ? ` (${typed.id})` : "";
      return `${typed.type}${id}`;
    }
    return "{...}";
  }
  return String(value);
};

export const resolvePanelFormatOptions = (
  parameters: Record<string, unknown>
): PanelFormatOptions => {
  const maxLinesRaw = coerceNumber(parameters.maxLines, DEFAULT_PANEL_OPTIONS.maxLines);
  const indentRaw = coerceNumber(parameters.indent, DEFAULT_PANEL_OPTIONS.indent);
  const indexStartRaw = coerceNumber(parameters.indexStart, DEFAULT_PANEL_OPTIONS.indexStart);

  return {
    maxLines: Math.round(clampNumber(maxLinesRaw, 1, 200)),
    indent: Math.round(clampNumber(indentRaw, 0, 8)),
    indexStart: Math.trunc(indexStartRaw),
    showIndex: coerceBoolean(parameters.showIndex, DEFAULT_PANEL_OPTIONS.showIndex),
  };
};

export const buildPanelLines = (value: unknown, options: PanelFormatOptions) => {
  const lines: string[] = [];
  const seen = new Set<unknown>();
  let truncated = false;

  const indentUnit = Math.max(0, Math.round(options.indent));
  const makeIndent = (depth: number) =>
    indentUnit > 0 ? " ".repeat(depth * indentUnit) : "";

  const pushLine = (line: string) => {
    if (lines.length < options.maxLines) {
      lines.push(line);
    } else {
      truncated = true;
    }
  };

  const pushStringLines = (text: string, depth: number, prefix: string) => {
    const indent = makeIndent(depth);
    const parts = text.split(/\r?\n/);
    if (parts.length === 0) {
      pushLine(`${indent}${prefix}`.trimEnd());
      return;
    }
    const pad = prefix ? " ".repeat(prefix.length) : "";
    parts.forEach((part, index) => {
      if (lines.length >= options.maxLines) {
        truncated = true;
        return;
      }
      const linePrefix = index === 0 ? prefix : pad;
      pushLine(`${indent}${linePrefix}${part.length > 0 ? part : " "}`);
    });
  };

  const formatArray = (entry: unknown[], depth: number) => {
    if (entry.length === 0) {
      pushLine(`${makeIndent(depth)}[]`);
      return;
    }
    entry.forEach((item, index) => {
      if (lines.length >= options.maxLines) {
        truncated = true;
        return;
      }
      const prefix = options.showIndex ? `${options.indexStart + index}: ` : "";
      const complex =
        Array.isArray(item) ||
        (typeof item === "object" && item !== null && !isVec3Value(item));
      const nextDepth = !options.showIndex && complex ? depth + 1 : depth;
      formatValue(item, nextDepth, prefix);
    });
  };

  const formatObject = (entry: Record<string, unknown>, depth: number) => {
    const keys = Object.keys(entry);
    if (keys.length === 0) {
      pushLine(`${makeIndent(depth)}{}`);
      return;
    }
    if (seen.has(entry)) {
      pushLine(`${makeIndent(depth)}[circular]`);
      return;
    }
    seen.add(entry);
    keys.forEach((key) => {
      if (lines.length >= options.maxLines) {
        truncated = true;
        return;
      }
      const value = entry[key];
      const prefix = `${key}: `;
      if (typeof value === "string") {
        pushStringLines(value, depth, prefix);
        return;
      }
      if (isInlineValue(value)) {
        pushLine(`${makeIndent(depth)}${prefix}${formatInlineValue(value)}`);
        return;
      }
      pushLine(`${makeIndent(depth)}${prefix.trimEnd()}`);
      formatValue(value, depth + 1);
    });
  };

  const formatValue = (entry: unknown, depth: number, prefix = "") => {
    const indent = makeIndent(depth);
    if (entry == null) {
      pushLine(`${indent}${prefix}--`);
      return;
    }
    if (typeof entry === "string") {
      pushStringLines(entry, depth, prefix);
      return;
    }
    if (isInlineValue(entry)) {
      pushLine(`${indent}${prefix}${formatInlineValue(entry)}`);
      return;
    }
    if (Array.isArray(entry)) {
      if (prefix) {
        pushLine(`${indent}${prefix}`.trimEnd());
        formatArray(entry, depth + 1);
      } else {
        formatArray(entry, depth);
      }
      return;
    }
    if (typeof entry === "object") {
      if (prefix) {
        pushLine(`${indent}${prefix}`.trimEnd());
        formatObject(entry as Record<string, unknown>, depth + 1);
      } else {
        formatObject(entry as Record<string, unknown>, depth);
      }
      return;
    }
    pushLine(`${indent}${prefix}${String(entry)}`);
  };

  formatValue(value, 0);

  if (lines.length === 0) lines.push("--");
  if (truncated && lines.length > 1) {
    lines[lines.length - 1] = "... (truncated)";
  }

  return lines;
};
