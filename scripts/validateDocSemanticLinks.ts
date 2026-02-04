import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SEMANTIC_OP_ID_SET } from "../client/src/semantic/semanticOpIds";

const ROOT = resolve(__dirname, "..");

type DocTarget = {
  path: string;
  label: string;
  minLinks: number;
};

const DOCS: DocTarget[] = [
  { path: "README.md", label: "README", minLinks: 4 },
  { path: "docs/philosophy.md", label: "Philosophy Essay", minLinks: 6 },
];

const linkRegex = /<!--\s*semantic-link\s+file="([^"]+)"\s+ops="([^"]*)"\s*-->/g;

const errors: string[] = [];

const parseOps = (value: string) =>
  value
    .split(",")
    .map((op) => op.trim())
    .filter(Boolean);

for (const doc of DOCS) {
  const absolute = resolve(ROOT, doc.path);
  if (!existsSync(absolute)) {
    errors.push(`${doc.label}: missing file at ${doc.path}`);
    continue;
  }

  const content = readFileSync(absolute, "utf8");
  const matches = [...content.matchAll(linkRegex)];

  if (matches.length < doc.minLinks) {
    errors.push(
      `${doc.label}: expected at least ${doc.minLinks} semantic links, found ${matches.length}`
    );
  }

  for (const match of matches) {
    const filePath = match[1];
    const ops = parseOps(match[2]);
    if (!filePath) {
      errors.push(`${doc.label}: semantic link missing file attribute`);
      continue;
    }
    if (ops.length === 0) {
      errors.push(`${doc.label}: semantic link for ${filePath} has no ops`);
    }

    const target = resolve(ROOT, filePath);
    if (!existsSync(target)) {
      errors.push(`${doc.label}: semantic link file not found -> ${filePath}`);
    }

    for (const op of ops) {
      if (!SEMANTIC_OP_ID_SET.has(op)) {
        errors.push(`${doc.label}: unknown semantic op '${op}' in link for ${filePath}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error("❌ Documentation semantic linkage validation failed:\n");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("✅ Documentation semantic linkage validation passed.");
