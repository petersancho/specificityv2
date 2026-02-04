import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "../client/src");
const files: string[] = [];

const walk = (dir: string) => {
  for (const entry of readdirSync(dir)) {
    const absolute = resolve(dir, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      if (absolute.includes(`${resolve(root, "dist")}`) || absolute.includes(`${resolve(root, "output")}`)) {
        continue;
      }
      walk(absolute);
    } else if (entry.endsWith(".css")) {
      files.push(absolute);
    }
  }
};

walk(root);

const hexRegex = /#[0-9a-fA-F]{3,8}/g;

const report: Record<string, string[]> = {};
const all = new Set<string>();

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const matches = text.match(hexRegex);
  if (matches && matches.length > 0) {
    const unique = Array.from(new Set(matches.map((m) => m.toLowerCase()))).sort();
    report[file.replace(`${root}/`, "")] = unique;
    unique.forEach((color) => all.add(color));
  }
}

console.log(`CSS files scanned: ${files.length}`);
console.log(`Files with hex colors: ${Object.keys(report).length}`);
console.log(`Unique hex colors: ${all.size}`);
console.log("---");

const sortedFiles = Object.entries(report).sort((a, b) => b[1].length - a[1].length);
for (const [file, colors] of sortedFiles) {
  console.log(`${file}: ${colors.length}`);
}

console.log("---\nPalette:");
console.log(Array.from(all).sort().join("\n"));
