import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { UI_BASE_COLORS, UI_DOMAIN_COLORS, UI_FEEDBACK_COLORS } from "../client/src/semantic/uiColorTokens";
import { resolveStickerMeta } from "../client/src/semantic/uiStickerRegistry";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "../client/src");

const walk = (dir: string, matcher: (file: string) => boolean, out: string[]) => {
  for (const entry of readdirSync(dir)) {
    const absolute = resolve(dir, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      if (absolute.includes(`${resolve(root, "dist")}`) || absolute.includes(`${resolve(root, "output")}`)) {
        continue;
      }
      walk(absolute, matcher, out);
    } else if (matcher(entry)) {
      out.push(absolute);
    }
  }
};

const normalizeHex = (value: string) => {
  const hex = value.replace("#", "").toLowerCase();
  if (hex.length === 3 || hex.length === 4) {
    const [r, g, b] = hex.slice(0, 3).split("");
    return `${r}${r}${g}${g}${b}${b}`;
  }
  if (hex.length >= 6) return hex.slice(0, 6);
  return hex;
};

const allowedBaseColors = new Set(
  [
    ...Object.values(UI_BASE_COLORS),
    ...Object.values(UI_DOMAIN_COLORS),
    ...Object.values(UI_FEEDBACK_COLORS),
  ].map(normalizeHex)
);

const cssFiles: string[] = [];
walk(root, (file) => file.endsWith(".css"), cssFiles);

const hexRegex = /#[0-9a-fA-F]{3,8}/g;
const bkRegex = /--bk-[a-zA-Z0-9-]+/g;

const errors: string[] = [];
const warnings: string[] = [];

for (const file of cssFiles) {
  const rel = file.replace(`${root}/`, "");
  if (rel.startsWith("styles/semantic.css")) continue;

  const text = readFileSync(file, "utf8");
  const matches = text.match(hexRegex) || [];
  for (const match of matches) {
    const normalized = normalizeHex(match);
    if (!allowedBaseColors.has(normalized)) {
      errors.push(`${rel}: disallowed color ${match}`);
    }
  }

  if (!rel.startsWith("styles/brandkit.css")) {
    const bkMatches = text.match(bkRegex) || [];
    if (bkMatches.length > 0) {
      warnings.push(`${rel}: legacy --bk-* usage (${bkMatches.length})`);
    }
  }
}

// Sticker linkage validation
const tsFiles: string[] = [];
walk(root, (file) => file.endsWith(".ts") || file.endsWith(".tsx"), tsFiles);
const iconIds = new Set<string>();
const iconRegex = /iconId:\s*\"([^\"]+)\"|iconId=\"([^\"]+)\"/g;

for (const file of tsFiles) {
  const text = readFileSync(file, "utf8");
  let match: RegExpExecArray | null = null;
  while ((match = iconRegex.exec(text))) {
    const value = match[1] || match[2];
    if (value) iconIds.add(value);
  }
}

for (const iconId of iconIds) {
  const meta = resolveStickerMeta(iconId);
  if (!meta.semanticOps || meta.semanticOps.length === 0) {
    warnings.push(`Sticker ${iconId} has no semanticOps linked`);
  }
}

if (warnings.length > 0) {
  console.warn("UI semantic warnings:");
  warnings.forEach((warn) => console.warn(`- ${warn}`));
}

if (errors.length > 0) {
  console.error("UI semantic errors:");
  errors.forEach((err) => console.error(`- ${err}`));
  process.exit(1);
}

console.log("UI semantic validation passed.");
