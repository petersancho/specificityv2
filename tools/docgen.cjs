const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs");
const GENERATED_DIR = path.join(DOCS_DIR, "generated");

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const transpileTs = (source, filename) =>
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;

const registerTsLoader = () => {
  const extensions = [".ts", ".tsx"];
  extensions.forEach((ext) => {
    // eslint-disable-next-line no-underscore-dangle
    require.extensions[ext] = (module, filename) => {
      const source = fs.readFileSync(filename, "utf8");
      const output = transpileTs(source, filename);
      module._compile(output, filename);
    };
  });
};

const toTable = (rows, headers) => {
  const head = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.join(" | ")} |`);
  return [head, divider, ...body].join("\n");
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const buildNodeExample = (node, portSummary) => {
  if (!portSummary.inputs.length) {
    return `Example: ${node.label} → Panel`;
  }
  const inputPort = portSummary.inputs[0];
  const inputHintByType = {
    number: "Number or Slider",
    boolean: "Boolean Toggle",
    string: "Text Note",
    vector: "Vector Construct",
    geometry: "Geometry Reference",
    list: "List Create",
    goal: "Goal Node",
    genomeSpec: "Genome Collector",
    phenotypeSpec: "Geometry Phenotype",
    fitnessSpec: "Performs Fitness",
    solverResult: "Solver Result",
    any: "Panel",
  };
  const upstream = inputHintByType[inputPort.type] ?? "Upstream Node";
  return `Example: ${upstream} → ${node.label} → Panel`;
};

const resolveSubcategory = (node) => {
  if (node.category === "goal") {
    if (node.type.startsWith("chemistry")) return "Chemistry Goals";
    if (node.type.endsWith("Goal")) {
      const physicsGoals = new Set(["stiffnessGoal", "volumeGoal", "loadGoal", "anchorGoal"]);
      const biologicalGoals = new Set([
        "growthGoal",
        "nutrientGoal",
        "morphogenesisGoal",
        "homeostasisGoal",
      ]);
      if (physicsGoals.has(node.type)) return "Physics Goals";
      if (biologicalGoals.has(node.type)) return "Biological Goals";
    }
    if (node.type.includes("genome") || node.type.includes("phenotype") || node.type.includes("performs")) {
      return "Biological Evolution Goals";
    }
  }
  if (node.category === "solver") {
    if (node.type === "physicsSolver") return "Physics Solver";
    if (node.type === "biologicalSolver" || node.type === "biologicalEvolutionSolver")
      return "Biological Solver";
    if (node.type === "chemistrySolver") return "Chemistry Solver";
    if (node.type === "voxelSolver") return "Voxel Solver";
  }
  if (node.category === "voxel") return "Voxel Utilities";
  return null;
};

const buildCommonMistakes = (portSummary) => {
  const mistakes = new Set();
  if (portSummary.inputs.length > 0) {
    mistakes.add("Leaving required inputs unconnected.");
  }
  portSummary.inputs.forEach((port) => {
    if (port.type === "geometry") mistakes.add("Feeding non-geometry data into geometry ports.");
    if (port.type === "number") mistakes.add("Sending strings without numeric values.");
    if (port.type === "vector") mistakes.add("Using zero-length vectors for direction inputs.");
    if (port.type === "goal") mistakes.add("Connecting goals from the wrong solver family.");
  });
  mistakes.add("Forgetting to re-run or re-evaluate after parameter changes.");
  return Array.from(mistakes);
};

const buildPerformanceNotes = (node) => {
  const heavyCategories = new Set(["solver", "voxel", "tessellation", "mesh", "analysis", "interop"]);
  if (heavyCategories.has(node.category)) {
    return "Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.";
  }
  return null;
};

const formatConstraint = (port) => {
  const flags = [];
  if (port.required) flags.push("Required");
  if (port.allowMultiple) flags.push("Multi");
  if (port.parameterKey) flags.push(`Param: ${port.parameterKey}`);
  return flags.length > 0 ? flags.join(", ") : "";
};

const main = () => {
  registerTsLoader();

  // Load registries
  const nodeRegistry = require(path.join(ROOT, "client/src/workflow/nodeRegistry.ts"));
  const commandRegistry = require(path.join(ROOT, "client/src/commands/registry.ts"));
  const commandDescriptions = require(path.join(ROOT, "client/src/data/commandDescriptions.ts"));

  const nodeDefinitions = nodeRegistry.NODE_DEFINITIONS ?? [];
  const resolveNodePorts = nodeRegistry.resolveNodePorts;
  const categoryById = nodeRegistry.NODE_CATEGORY_BY_ID ?? new Map();

  const nodes = nodeDefinitions.map((node) => {
    const parameters = {};
    node.parameters.forEach((param) => {
      parameters[param.key] = param.defaultValue;
    });
    const ports = resolveNodePorts(node, parameters);
    return {
      ...node,
      ports,
      defaultParameters: parameters,
    };
  });

  const commandDefinitions = commandRegistry.COMMAND_DEFINITIONS ?? [];
  const commandMeta = commandDescriptions.COMMAND_DESCRIPTIONS ?? {};
  const commandSemantics = commandDescriptions.COMMAND_SEMANTICS ?? {};

  ensureDir(GENERATED_DIR);

  const nodeJsonPath = path.join(GENERATED_DIR, "nodes.json");
  const commandJsonPath = path.join(GENERATED_DIR, "commands.json");
  fs.writeFileSync(nodeJsonPath, JSON.stringify(nodes, null, 2));
  fs.writeFileSync(commandJsonPath, JSON.stringify(commandDefinitions, null, 2));

  // Build Node Reference Markdown
  const nodeMarkdown = [];
  nodeMarkdown.push("# Numerica Node Library Reference");
  nodeMarkdown.push("");
  nodeMarkdown.push("Updated: 2026-01-29");
  nodeMarkdown.push("");
  nodeMarkdown.push(
    "This reference is generated from the node registry. Each node includes inputs, outputs, defaults, and guidance."
  );
  nodeMarkdown.push("");

  const nodesByCategory = new Map();
  nodes.forEach((node) => {
    const list = nodesByCategory.get(node.category) ?? [];
    list.push(node);
    nodesByCategory.set(node.category, list);
  });

  nodesByCategory.forEach((entries, categoryId) => {
    const category = categoryById.get(categoryId);
    const categoryLabel = category?.label ?? categoryId;
    nodeMarkdown.push(`## ${categoryLabel}`);
    nodeMarkdown.push("");

    entries.forEach((node) => {
      const anchor = slugify(`${node.label}-${node.type}`);
      nodeMarkdown.push(`### ${node.label} (\`${node.type}\`)`);
      nodeMarkdown.push("");
      const subcategory = resolveSubcategory(node);
      nodeMarkdown.push(`- Category: ${categoryLabel}${subcategory ? ` / ${subcategory}` : ""}`);
      if (node.display?.nameGreek || node.display?.nameEnglish) {
        const greek = node.display?.nameGreek ? `Greek: ${node.display.nameGreek}` : null;
        const english = node.display?.nameEnglish ? `English: ${node.display.nameEnglish}` : null;
        const romanization = node.display?.romanization
          ? `Romanization: ${node.display.romanization}`
          : null;
        const line = [greek, english, romanization].filter(Boolean).join(" | ");
        if (line.length > 0) nodeMarkdown.push(`- Display: ${line}`);
      }
      nodeMarkdown.push(`- Purpose: ${node.description}`);
      nodeMarkdown.push("");
      nodeMarkdown.push("When to use it:");
      nodeMarkdown.push(`- ${node.description}`);
      nodeMarkdown.push("");

      const inputs = node.ports.inputs.map((port) => {
        const defaultValue =
          port.defaultValue ??
          (port.parameterKey ? node.defaultParameters[port.parameterKey] : "");
        return [
          port.label,
          port.type,
          defaultValue === undefined ? "" : String(defaultValue),
          formatConstraint(port),
          port.description ?? "",
        ];
      });
      nodeMarkdown.push("Inputs:");
      if (inputs.length === 0) {
        nodeMarkdown.push("- None");
      } else {
        nodeMarkdown.push("");
        nodeMarkdown.push(
          toTable(inputs, ["Input", "Type", "Default", "Constraints", "Semantics"])
        );
      }
      nodeMarkdown.push("");

      const outputs = node.ports.outputs.map((port) => [
        port.label,
        port.type,
        port.description ?? "",
      ]);
      nodeMarkdown.push("Outputs:");
      if (outputs.length === 0) {
        nodeMarkdown.push("- None");
      } else {
        nodeMarkdown.push("");
        nodeMarkdown.push(toTable(outputs, ["Output", "Type", "Semantics"]));
      }
      nodeMarkdown.push("");

      if (node.parameters && node.parameters.length > 0) {
        const params = node.parameters.map((param) => [
          param.label,
          param.type,
          String(param.defaultValue ?? ""),
          [
            param.min != null ? `min ${param.min}` : null,
            param.max != null ? `max ${param.max}` : null,
            param.step != null ? `step ${param.step}` : null,
            param.options ? `options ${param.options.length}` : null,
          ]
            .filter(Boolean)
            .join(", "),
          param.description ?? "",
        ]);
        nodeMarkdown.push("Parameters:");
        nodeMarkdown.push("");
        nodeMarkdown.push(
          toTable(params, ["Parameter", "Type", "Default", "Constraints", "Semantics"])
        );
        nodeMarkdown.push("");
      }

      nodeMarkdown.push("Examples:");
      const example = buildNodeExample(node, node.ports);
      nodeMarkdown.push(`- ${example}`);
      nodeMarkdown.push("");

      const mistakes = buildCommonMistakes(node.ports);
      nodeMarkdown.push("Common mistakes:");
      mistakes.forEach((mistake) => nodeMarkdown.push(`- ${mistake}`));
      nodeMarkdown.push("");

      const perf = buildPerformanceNotes(node);
      if (perf) {
        nodeMarkdown.push(`Performance notes: ${perf}`);
        nodeMarkdown.push("");
      }

      nodeMarkdown.push("Related nodes:");
      nodeMarkdown.push(
        `- See other nodes in the ${categoryLabel} category for adjacent workflows.`
      );
      nodeMarkdown.push("");
      nodeMarkdown.push("---");
      nodeMarkdown.push("");
    });
  });

  fs.writeFileSync(path.join(DOCS_DIR, "numerica_node_library.md"), nodeMarkdown.join("\n"));

  // Build Command Reference Markdown
  const commandMarkdown = [];
  commandMarkdown.push("# Numerica Command Reference");
  commandMarkdown.push("");
  commandMarkdown.push("Updated: 2026-01-29");
  commandMarkdown.push("");
  commandMarkdown.push(
    "This reference is generated from the command registry and command descriptions."
  );
  commandMarkdown.push("");
  commandMarkdown.push("## Command Semantics");
  commandMarkdown.push("");
  Object.entries(commandSemantics).forEach(([key, description]) => {
    commandMarkdown.push(`- **${key}**: ${description}`);
  });
  commandMarkdown.push("");

  const commandsByCategory = new Map();
  commandDefinitions.forEach((command) => {
    const list = commandsByCategory.get(command.category) ?? [];
    list.push(command);
    commandsByCategory.set(command.category, list);
  });

  commandsByCategory.forEach((entries, category) => {
    commandMarkdown.push(`## ${category.charAt(0).toUpperCase() + category.slice(1)}`);
    commandMarkdown.push("");
    entries.forEach((command) => {
      const meta = commandMeta[command.id] ?? {};
      commandMarkdown.push(`### ${command.label} (\`${command.id}\`)`);
      commandMarkdown.push("");
      commandMarkdown.push(`- Where: Command palette / toolbar`);
      if (meta.shortcut) {
        commandMarkdown.push(`- Shortcut: ${meta.shortcut}`);
      }
      commandMarkdown.push(`- Description: ${meta.description ?? command.prompt}`);
      commandMarkdown.push("");
      commandMarkdown.push("Steps:");
      commandMarkdown.push(`- ${command.prompt}`);
      commandMarkdown.push("");
      commandMarkdown.push("Edge cases:");
      commandMarkdown.push("- Cancels with Esc.");
      commandMarkdown.push("- Requires a valid selection where applicable.");
      commandMarkdown.push("");
      commandMarkdown.push("---");
      commandMarkdown.push("");
    });
  });

  fs.writeFileSync(path.join(DOCS_DIR, "numerica_command_reference.md"), commandMarkdown.join("\n"));

  console.log("Generated node and command documentation.");
};

main();
