import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { UISemanticRegistry } from "../client/src/semantic/uiSemanticRegistry";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const registry = UISemanticRegistry.getInstance();
const css = registry.toCSS();
const banner = [
  "/*", 
  " * Semantic CSS (auto-generated)",
  " * Do not edit directly. Run `npm run generate:semantic-css`.",
  " */",
  "",
].join("\n");

const outputPath = resolve(__dirname, "../client/src/styles/semantic.css");
writeFileSync(outputPath, `${banner}\n${css}`, "utf8");

console.log(`Generated semantic CSS -> ${outputPath}`);
