import { Component, useCallback, useMemo, type CSSProperties, type ReactNode } from "react";
import WebGLTitleLogo from "./WebGLTitleLogo";
import WebGLButton from "./ui/WebGLButton";
import Tooltip from "./ui/Tooltip";
import {
  NumericaNodeArt,
  NumericaWorkflowArt,
  RoslynCommandArt,
  RoslynWorkflowArt,
} from "./DocumentationArt";
import styles from "./DocumentationPage.module.css";
import detailStyles from "./DocumentationDetailPage.module.css";
import newUsersStyles from "./DocumentationNewUsersPage.module.css";
import {
  NODE_CATEGORIES,
  NODE_CATEGORY_BY_ID,
  NODE_DEFINITIONS,
  buildNodeTooltipLines,
  getDefaultNodePorts,
  resolveNodeDescription,
  type NodeDefinition,
  type WorkflowPortSpec,
} from "./workflow/nodeCatalog";
import {
  COMMAND_DEFINITIONS,
  type CommandDefinition,
} from "../commands/registry";
import { COMMAND_DESCRIPTIONS, COMMAND_SEMANTICS } from "../data/commandDescriptions";
import {
  getCommandDocumentation,
  getNodeDocumentation,
} from "../data/documentationContent";

type CommandGroup = {
  id: string;
  label: string;
  accent: string;
  commands: Array<{
    id: string;
    label: string;
    description: string;
    shortcut?: string;
  }>;
};

type DocsRoute =
  | { kind: "index" }
  | { kind: "new-users" }
  | { kind: "roslyn"; id: string }
  | { kind: "numerica"; id: string };

const BRAND_ACCENTS = {
  cyan: "#0b8a97",
  purple: "#5132c2",
  pink: "#c2166b",
  orange: "#cc5b1a",
  ink: "#3b3b40",
};

const COMMAND_CATEGORY_META: Record<string, { label: string; accent: string }> = {
  geometry: { label: "Geometry", accent: BRAND_ACCENTS.orange },
  transform: { label: "Transform", accent: BRAND_ACCENTS.purple },
  edit: { label: "Edit", accent: BRAND_ACCENTS.pink },
  view: { label: "View", accent: BRAND_ACCENTS.cyan },
  performs: { label: "Commands", accent: BRAND_ACCENTS.ink },
};

const COMMAND_CATEGORY_ORDER = ["geometry", "transform", "edit", "view", "performs"];

const cleanCommandPrompt = (prompt?: string, label?: string) => {
  if (!prompt) return label ?? "";
  const prefix = new RegExp(`^${label}\\s*:\\s*`, "i");
  return prompt.replace(prefix, "").trim();
};

const buildNodeTooltipText = (definition: NodeDefinition) => {
  const ports = getDefaultNodePorts(definition);
  const lines = buildNodeTooltipLines(definition, ports);
  const parameters = definition.parameters ?? [];
  const parameterLines = parameters
    .filter((param) => param.description)
    .map((param) => `${param.label}: ${param.description}`);
  const output: string[] = [definition.label, ...lines];
  if (parameterLines.length > 0) {
    output.push("Parameters:");
    output.push(...parameterLines);
  }
  return output.join("\n");
};

const buildCommandTooltipText = (
  label: string,
  description: string,
  shortcut?: string
) => {
  const lines = [label, description];
  if (shortcut) {
    lines.push(`Shortcut: ${shortcut}`);
  }
  return lines.join("\n");
};

const toDocsHash = (route: DocsRoute) => {
  switch (route.kind) {
    case "new-users":
      return "#/docs/new-users";
    case "roslyn":
      return `#/docs/roslyn/${encodeURIComponent(route.id)}`;
    case "numerica":
      return `#/docs/numerica/${encodeURIComponent(route.id)}`;
    case "index":
    default:
      return "#/docs";
  }
};

const parseHashSegments = (hash: string) => {
  const cleaned = hash.replace(/^#/, "").trim();
  if (!cleaned) return [];
  return cleaned.split("/").filter((part) => part.length > 0);
};

const resolveDocsRoute = (hash: string): DocsRoute => {
  const segments = parseHashSegments(hash);
  const docsIndex = segments.indexOf("docs");
  if (docsIndex === -1) return { kind: "index" };
  const section = segments[docsIndex + 1];
  if (!section) return { kind: "index" };
  if (section === "new-users") return { kind: "new-users" };
  const id = segments[docsIndex + 2];
  if (section === "roslyn" && id) {
    return { kind: "roslyn", id: decodeURIComponent(id) };
  }
  if (section === "numerica" && id) {
    return { kind: "numerica", id: decodeURIComponent(id) };
  }
  return { kind: "index" };
};

const resolveCommandDescription = (command: CommandDefinition) => {
  const meta = COMMAND_DESCRIPTIONS[command.id];
  return meta?.description ?? cleanCommandPrompt(command.prompt, command.label);
};

const resolveCommandCategory = (command: CommandDefinition) => {
  const meta = COMMAND_DESCRIPTIONS[command.id];
  return meta?.category ?? command.category;
};

type DocsNavProps = {
  route: DocsRoute;
  onNavigate: (route: DocsRoute) => void;
};

const DocsTopNav = ({ route, onNavigate }: DocsNavProps) => {
  const isIndex = route.kind === "index";
  const isNewUsers = route.kind === "new-users";
  return (
    <div className={styles.topNav}>
      <div className={styles.topNavBrand}>
        <div>
          <p className={styles.topNavKicker}>Documentation</p>
          <h2 className={styles.topNavTitle}>Lingua Knowledge Base</h2>
        </div>
        <div className={styles.topNavLogos}>
          <WebGLTitleLogo title="Roslyn" tone="roslyn" />
          <WebGLTitleLogo title="Numerica" tone="numerica" />
        </div>
      </div>
      <div className={styles.topNavActions}>
        <WebGLButton
          label="Index"
          variant="ghost"
          size="sm"
          shape="pill"
          active={isIndex}
          className={styles.navButton}
          onClick={() => onNavigate({ kind: "index" })}
        />
        <WebGLButton
          label="New Users"
          variant="ghost"
          size="sm"
          shape="pill"
          active={isNewUsers}
          className={styles.navButton}
          onClick={() => onNavigate({ kind: "new-users" })}
        />
      </div>
    </div>
  );
};

type DocumentationIndexProps = {
  onNavigate: (route: DocsRoute) => void;
};

const DocumentationIndex = ({ onNavigate }: DocumentationIndexProps) => {
  const nodeGroups = useMemo(() => {
    const groupMap = new Map(
      NODE_CATEGORIES.map((category) => [
        category.id,
        { category, nodes: [] as NodeDefinition[] },
      ])
    );
    NODE_DEFINITIONS.forEach((definition) => {
      const entry = groupMap.get(definition.category);
      if (entry) entry.nodes.push(definition);
    });
    return Array.from(groupMap.values())
      .map((group) => ({
        ...group,
        nodes: group.nodes.sort((a, b) => a.label.localeCompare(b.label)),
      }))
      .filter((group) => group.nodes.length > 0);
  }, []);

  const commandGroups = useMemo<CommandGroup[]>(() => {
    const grouped = new Map<string, CommandGroup>();
    COMMAND_DEFINITIONS.forEach((command) => {
      const category = resolveCommandCategory(command);
      const categoryMeta = COMMAND_CATEGORY_META[category] ?? COMMAND_CATEGORY_META.performs;
      const description = resolveCommandDescription(command);
      const group =
        grouped.get(category) ??
        ({
          id: category,
          label: categoryMeta.label,
          accent: categoryMeta.accent,
          commands: [],
        } as CommandGroup);
      group.commands.push({
        id: command.id,
        label: command.label,
        description,
        shortcut: COMMAND_DESCRIPTIONS[command.id]?.shortcut,
      });
      grouped.set(category, group);
    });
    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        commands: group.commands.sort((a, b) => a.label.localeCompare(b.label)),
      }))
      .sort((a, b) => {
        const aIndex = COMMAND_CATEGORY_ORDER.indexOf(a.id);
        const bIndex = COMMAND_CATEGORY_ORDER.indexOf(b.id);
        if (aIndex === -1 && bIndex === -1) return a.label.localeCompare(b.label);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
  }, []);

  const scrollToSection = (id: string) => {
    if (typeof document === "undefined") return;
    const element = document.getElementById(id);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={styles.indexPage}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.heroKicker}>Documentation Paradigm</p>
          <h1 className={styles.heroTitle}>Lingua Documentation</h1>
          <p className={styles.heroBody}>
            Numerica is the graph based system that wires data, geometry, and logic into living
            workflows. Roslyn is the direct modeler driven by a custom TypeScript geometry kernel,
            built to stay precise while you iterate fast. The UI uses WebGL surfaces and GLSL
            shaders, with TypeScript and React orchestrating interaction, CSS shaping the layout,
            and a Node server stack keeping data in sync. The long term goal is simple: keep the
            instrument playful, make experimentation feel safe, and let creativity stay fun.
          </p>
          <div className={styles.heroNotes}>
            <div className={styles.noteCard}>
              <span>Open source target:</span>
              <strong>MIT license (planned)</strong>
            </div>
            <div className={styles.noteCard}>
              <span>Focus:</span>
              <strong>clarity, speed, and joy</strong>
            </div>
          </div>
          <div className={styles.indexRow}>
            <WebGLButton
              label="Roslyn Commands"
              variant="primary"
              accentColor={BRAND_ACCENTS.cyan}
              className={styles.docButton}
              onClick={() => scrollToSection("documentation-roslyn")}
            />
            <WebGLButton
              label="Numerica Nodes"
              variant="primary"
              accentColor={BRAND_ACCENTS.purple}
              className={styles.docButton}
              onClick={() => scrollToSection("documentation-numerica")}
            />
            <WebGLButton
              label="New Users"
              variant="secondary"
              accentColor={BRAND_ACCENTS.orange}
              className={styles.docButton}
              onClick={() => onNavigate({ kind: "new-users" })}
            />
          </div>
        </div>
        <div className={styles.heroPanel}>
          <div className={styles.logoStack}>
            <WebGLTitleLogo title="Roslyn" tone="roslyn" />
            <WebGLTitleLogo title="Numerica" tone="numerica" />
          </div>
          <div className={styles.heroPanelText}>
            <p>
              Hover any entry to read the extended WebGL tooltip. Each tooltip stays within the
              canvas and keeps the full description visible.
            </p>
          </div>
        </div>
      </section>

      <section id="documentation-roslyn" className={styles.section}>
        <div className={styles.sectionHeader}>
          <WebGLTitleLogo title="Roslyn" tone="roslyn" />
          <div>
            <h2>Roslyn command index</h2>
            <p>
              Command buttons map to precision modeling actions, with clear prompts and optional
              shortcuts. Hover for the extended prompt and input expectations.
            </p>
          </div>
        </div>
        <div className={styles.commandGroups}>
          {commandGroups.map((group) => (
            <div
              key={group.id}
              className={styles.commandGroup}
              style={{ ["--accent" as string]: group.accent } as CSSProperties}
            >
              <div className={styles.groupHeader}>
                <span className={styles.groupDot} />
                <h3>{group.label}</h3>
              </div>
              <div className={styles.itemGrid}>
                {group.commands.map((command) => (
                  <Tooltip
                    key={command.id}
                    content={buildCommandTooltipText(
                      command.label,
                      command.description,
                      command.shortcut
                    )}
                    position="top"
                    maxWidth={360}
                    triggerClassName={styles.docTrigger}
                  >
                    <WebGLButton
                      label={command.label}
                      variant="chip"
                      size="sm"
                      accentColor={group.accent}
                      className={styles.docButton}
                      onClick={() => onNavigate({ kind: "roslyn", id: command.id })}
                    />
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="documentation-numerica" className={styles.section}>
        <div className={styles.sectionHeader}>
          <WebGLTitleLogo title="Numerica" tone="numerica" />
          <div>
            <h2>Numerica node index</h2>
            <p>
              Every node is a typed operator in the graph. Hover a node to read its description,
              inputs, outputs, and parameter guidance.
            </p>
          </div>
        </div>
        <div className={styles.nodeGroups}>
          {nodeGroups.map((group) => (
            <div
              key={group.category.id}
              className={styles.nodeGroup}
              style={
                {
                  ["--accent" as string]: group.category.accent,
                  ["--band" as string]: group.category.band,
                  ["--port" as string]: group.category.port,
                } as CSSProperties
              }
            >
              <div className={styles.groupHeader}>
                <span className={styles.groupDot} />
                <div>
                  <h3>{group.category.label}</h3>
                  <p>{group.category.description}</p>
                </div>
              </div>
              <div className={styles.itemGrid}>
                {group.nodes.map((node) => (
                  <Tooltip
                    key={node.type}
                    content={buildNodeTooltipText(node)}
                    position="top"
                    maxWidth={380}
                    triggerClassName={styles.docTrigger}
                  >
                    <WebGLButton
                      label={node.label}
                      variant="chip"
                      size="sm"
                      accentColor={group.category.accent}
                      className={styles.docButton}
                      onClick={() => onNavigate({ kind: "numerica", id: node.type })}
                    />
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

type DocumentationDetailProps = {
  route: DocsRoute;
  onNavigate: (route: DocsRoute) => void;
};

type DocumentationErrorBoundaryProps = {
  onReset: () => void;
  children: ReactNode;
};

type DocumentationErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

class DocumentationErrorBoundary extends Component<
  DocumentationErrorBoundaryProps,
  DocumentationErrorBoundaryState
> {
  state: DocumentationErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("Documentation render error", error);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <div className={detailStyles.notFound}>
        <p>Documentation hit an error. Jump back to the index or refresh the page.</p>
        <WebGLButton
          label="Back to Documentation"
          variant="secondary"
          onClick={this.props.onReset}
        />
      </div>
    );
  }
}

const CommandMetaBadge = ({ label, value }: { label: string; value: string }) => (
  <div className={detailStyles.metaBadge}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const renderPortList = (ports: WorkflowPortSpec[]) => {
  if (!ports.length) return <p className={detailStyles.emptyText}>None</p>;
  return (
    <ul className={detailStyles.list}>
      {ports.map((port) => (
        <li key={port.key}>
          <strong>{port.label || port.key}</strong>
          <span>{port.type}</span>
          {port.description && <em>{port.description}</em>}
        </li>
      ))}
    </ul>
  );
};

const DocumentationDetail = ({ route, onNavigate }: DocumentationDetailProps) => {
  if (route.kind === "roslyn") {
    const command = COMMAND_DEFINITIONS.find((item) => item.id === route.id);
    if (!command) {
      return (
        <div className={detailStyles.notFound}>
          <p>Roslyn command not found.</p>
          <WebGLButton
            label="Back to Documentation"
            variant="secondary"
            onClick={() => onNavigate({ kind: "index" })}
          />
        </div>
      );
    }
    const description = resolveCommandDescription(command);
    const category = resolveCommandCategory(command);
    const categoryMeta = COMMAND_CATEGORY_META[category] ?? COMMAND_CATEGORY_META.performs;
    const semantics = COMMAND_SEMANTICS[category] ?? COMMAND_SEMANTICS.performs;
    const prompt = cleanCommandPrompt(command.prompt, command.label);
    const commandDoc = getCommandDocumentation(command.id);

    return (
      <div className={detailStyles.detailPage}>
        <div className={detailStyles.breadcrumbs}>
          <button type="button" onClick={() => onNavigate({ kind: "index" })}>
            Documentation
          </button>
          <span>/</span>
          <button type="button" onClick={() => onNavigate({ kind: "index" })}>
            Roslyn
          </button>
          <span>/</span>
          <span>{command.label}</span>
        </div>
        <div className={detailStyles.detailHero}>
          <div className={detailStyles.detailInfo}>
            <div className={detailStyles.detailTitleRow}>
              <WebGLTitleLogo title="Roslyn" tone="roslyn" />
              <h1>{command.label}</h1>
            </div>
            <p className={detailStyles.detailLead}>{description}</p>
            <div className={detailStyles.detailMeta}>
              <CommandMetaBadge label="Category" value={categoryMeta.label} />
              {COMMAND_DESCRIPTIONS[command.id]?.shortcut && (
                <CommandMetaBadge
                  label="Shortcut"
                  value={COMMAND_DESCRIPTIONS[command.id].shortcut ?? ""}
                />
              )}
            </div>
            <div className={detailStyles.detailSection}>
              <h2>Command semantics</h2>
              <p>{semantics}</p>
              <p>{prompt}</p>
            </div>
            <div className={detailStyles.detailSection}>
              <h2>How to use</h2>
              <ol className={detailStyles.orderedList}>
                <li>Activate {command.label} from the Roslyn command bar or command line.</li>
                <li>Provide points, directions, or values while watching the live preview.</li>
                <li>Confirm to commit the geometry, or press Esc to cancel.</li>
              </ol>
            </div>
          </div>
          <div className={detailStyles.detailArt}>
            <div className={detailStyles.triptych}>
              <RoslynCommandArt
                commandId={command.id}
                label={command.label}
                description={description}
                prompt={command.prompt}
                accent={categoryMeta.accent}
                category={category}
                stage="input"
              />
              <RoslynCommandArt
                commandId={command.id}
                label={command.label}
                description={description}
                prompt={command.prompt}
                accent={categoryMeta.accent}
                category={category}
                stage="operation"
              />
              <RoslynCommandArt
                commandId={command.id}
                label={command.label}
                description={description}
                prompt={command.prompt}
                accent={categoryMeta.accent}
                category={category}
                stage="output"
              />
            </div>
          </div>
        </div>

        <div className={detailStyles.detailGrid}>
          <div className={detailStyles.detailSection}>
            <h2>Ontological placement</h2>
            <p>
              {command.label} operates inside Roslyn’s direct modeling layer. It changes geometry
              state by listening to cursor input, selection context, and C-Plane orientation.
            </p>
          </div>
          <div className={detailStyles.detailSection}>
            <h2>Workflow context</h2>
            <p>
              {commandDoc?.workflowNotes ?? `Use ${command.label} to author or adjust geometry before handing it to Numerica for graph-driven variation. Keep the action atomic: select targets, run the command, and confirm.`}
            </p>
          </div>
          {commandDoc?.tips && commandDoc.tips.length > 0 && (
            <div className={detailStyles.detailSection}>
              <h2>Tips &amp; Tricks</h2>
              <ul className={detailStyles.list}>
                {commandDoc.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
          {commandDoc?.examples && commandDoc.examples.length > 0 && (
            <div className={detailStyles.detailSection}>
              <h2>Usage Examples</h2>
              <ul className={detailStyles.list}>
                {commandDoc.examples.map((example, index) => (
                  <li key={index}>{example}</li>
                ))}
              </ul>
            </div>
          )}
          {commandDoc?.pitfalls && commandDoc.pitfalls.length > 0 && (
            <div className={detailStyles.detailSection}>
              <h2>Common Pitfalls</h2>
              <ul className={detailStyles.list}>
                {commandDoc.pitfalls.map((pitfall, index) => (
                  <li key={index}>{pitfall}</li>
                ))}
              </ul>
            </div>
          )}
          {commandDoc?.relatedCommands && commandDoc.relatedCommands.length > 0 && (
            <div className={detailStyles.detailSection}>
              <h2>Related Commands</h2>
              <div className={detailStyles.relatedItems}>
                {commandDoc.relatedCommands.map((relatedId) => {
                  const relatedCmd = COMMAND_DEFINITIONS.find((c) => c.id === relatedId);
                  if (!relatedCmd) return null;
                  return (
                    <WebGLButton
                      key={relatedId}
                      label={relatedCmd.label}
                      variant="chip"
                      size="sm"
                      accentColor={categoryMeta.accent}
                      onClick={() => onNavigate({ kind: "roslyn", id: relatedId })}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (route.kind === "numerica") {
    const definition = NODE_DEFINITIONS.find((item) => item.type === route.id);
    if (!definition) {
      return (
        <div className={detailStyles.notFound}>
          <p>Numerica node not found.</p>
          <WebGLButton
            label="Back to Documentation"
            variant="secondary"
            onClick={() => onNavigate({ kind: "index" })}
          />
        </div>
      );
    }

    const category = NODE_CATEGORY_BY_ID.get(definition.category);
    const ports = getDefaultNodePorts(definition);
    const parameters = definition.parameters ?? [];
    const description = resolveNodeDescription(definition);
    const tooltipLines = buildNodeTooltipLines(definition, ports);
    const semanticLines = tooltipLines.filter(
      (line) => !line.startsWith("Inputs:") && !line.startsWith("Outputs:")
    );
    const nodeDoc = getNodeDocumentation(definition.type);

    return (
      <div className={detailStyles.detailPage}>
        <div className={detailStyles.breadcrumbs}>
          <button type="button" onClick={() => onNavigate({ kind: "index" })}>
            Documentation
          </button>
          <span>/</span>
          <button type="button" onClick={() => onNavigate({ kind: "index" })}>
            Numerica
          </button>
          <span>/</span>
          <span>{definition.label}</span>
        </div>
        <div className={detailStyles.detailHero}>
          <div className={detailStyles.detailInfo}>
            <div className={detailStyles.detailTitleRow}>
              <WebGLTitleLogo title="Numerica" tone="numerica" />
              <h1>{definition.label}</h1>
            </div>
            <p className={detailStyles.detailLead}>{description}</p>
            <div className={detailStyles.detailMeta}>
              <CommandMetaBadge label="Category" value={category?.label ?? definition.category} />
              <CommandMetaBadge label="Node Type" value={definition.type} />
            </div>
            <div className={detailStyles.detailSection}>
              <h2>Node semantics</h2>
              {semanticLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div className={detailStyles.detailSection}>
              <h2>How it works</h2>
              <p>
                Inputs are coerced to their declared port types, parameters fill defaults, and the
                node executes inside the TypeScript geometry kernel to produce stable outputs.
              </p>
            </div>
          </div>
          <div className={detailStyles.detailArt}>
            <div className={detailStyles.triptych}>
              <NumericaNodeArt
                label={definition.label}
                category={category}
                inputs={ports.inputs}
                outputs={ports.outputs}
                parameters={parameters}
                nodeType={definition.type}
                stage="input"
              />
              <NumericaNodeArt
                label={definition.label}
                category={category}
                inputs={ports.inputs}
                outputs={ports.outputs}
                parameters={parameters}
                nodeType={definition.type}
                stage="operation"
              />
              <NumericaNodeArt
                label={definition.label}
                category={category}
                inputs={ports.inputs}
                outputs={ports.outputs}
                parameters={parameters}
                nodeType={definition.type}
                stage="output"
              />
            </div>
          </div>
        </div>

        <div className={detailStyles.detailGrid}>
          <div className={detailStyles.detailSection}>
            <h2>Inputs</h2>
            {renderPortList(ports.inputs)}
          </div>
          <div className={detailStyles.detailSection}>
            <h2>Outputs</h2>
            {renderPortList(ports.outputs)}
          </div>
          <div className={detailStyles.detailSection}>
            <h2>Parameters</h2>
            {parameters.length === 0 ? (
              <p className={detailStyles.emptyText}>No parameters.</p>
            ) : (
              <ul className={detailStyles.list}>
                {parameters.map((parameter) => (
                  <li key={parameter.key}>
                    <strong>{parameter.label}</strong>
                    <span>{parameter.type}</span>
                    {parameter.description && <em>{parameter.description}</em>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={detailStyles.detailSection}>
            <h2>Workflow context</h2>
            <p>
              {nodeDoc?.workflowNotes ?? `${definition.label} lives inside Numerica's graph-based system. Keep the script minimal when documenting: connect only the inputs that shape this node's meaning, then pass the output to the next semantic step.`}
            </p>
          </div>
          {nodeDoc?.tips && nodeDoc.tips.length > 0 && (
            <div className={detailStyles.detailSection}>
              <h2>Tips &amp; Tricks</h2>
              <ul className={detailStyles.list}>
                {nodeDoc.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
          {nodeDoc?.examples && nodeDoc.examples.length > 0 && (
            <div className={detailStyles.detailSection}>
              <h2>Usage Examples</h2>
              <ul className={detailStyles.list}>
                {nodeDoc.examples.map((example, index) => (
                  <li key={index}>{example}</li>
                ))}
              </ul>
            </div>
          )}
          {nodeDoc?.bestPractices && nodeDoc.bestPractices.length > 0 && (
            <div className={detailStyles.detailSection}>
              <h2>Best Practices</h2>
              <ul className={detailStyles.list}>
                {nodeDoc.bestPractices.map((practice, index) => (
                  <li key={index}>{practice}</li>
                ))}
              </ul>
            </div>
          )}
          {nodeDoc?.pitfalls && nodeDoc.pitfalls.length > 0 && (
            <div className={detailStyles.detailSection}>
              <h2>Common Pitfalls</h2>
              <ul className={detailStyles.list}>
                {nodeDoc.pitfalls.map((pitfall, index) => (
                  <li key={index}>{pitfall}</li>
                ))}
              </ul>
            </div>
          )}
          {nodeDoc?.relatedNodes && nodeDoc.relatedNodes.length > 0 && (
            <div className={detailStyles.detailSection}>
              <h2>Related Nodes</h2>
              <div className={detailStyles.relatedItems}>
                {nodeDoc.relatedNodes.map((relatedType) => {
                  const relatedNode = NODE_DEFINITIONS.find((n) => n.type === relatedType);
                  if (!relatedNode) return null;
                  const relatedCategory = NODE_CATEGORY_BY_ID.get(relatedNode.category);
                  return (
                    <WebGLButton
                      key={relatedType}
                      label={relatedNode.label}
                      variant="chip"
                      size="sm"
                      accentColor={relatedCategory?.accent ?? category?.accent}
                      onClick={() => onNavigate({ kind: "numerica", id: relatedType })}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

type DocumentationNewUsersProps = {
  onNavigate: (route: DocsRoute) => void;
};

const DocumentationNewUsers = ({ onNavigate }: DocumentationNewUsersProps) => {
  return (
    <div className={newUsersStyles.page}>
      <div className={newUsersStyles.hero}>
        <div>
          <p className={newUsersStyles.kicker}>New Users</p>
          <h1>Workflow schemes</h1>
          <p>
            Start with Roslyn when you want direct geometry control, and switch to Numerica when you
            need graph-driven variation. Both workflows are designed to stay clear, procedural, and
            fun.
          </p>
        </div>
        <WebGLButton
          label="Back to Index"
          variant="secondary"
          onClick={() => onNavigate({ kind: "index" })}
        />
      </div>
      <div className={newUsersStyles.workflowGrid}>
        <section className={newUsersStyles.workflowCard}>
          <div className={newUsersStyles.workflowHeader}>
            <WebGLTitleLogo title="Roslyn" tone="roslyn" />
            <div>
              <h2>Modeling workflow scheme</h2>
              <p>
                Roslyn is a direct modeling instrument. The ontology is built from planes, points,
                and intentional transforms.
              </p>
            </div>
          </div>
          <RoslynWorkflowArt />
          <ol className={newUsersStyles.workflowList}>
            <li>Choose a command from the Roslyn command bar.</li>
            <li>Set points or dimensions in the active C-Plane.</li>
            <li>Use the gumball or numeric fields to refine the form.</li>
            <li>Confirm to commit geometry, or cancel to preserve intent.</li>
          </ol>
        </section>
        <section className={newUsersStyles.workflowCard}>
          <div className={newUsersStyles.workflowHeader}>
            <WebGLTitleLogo title="Numerica" tone="numerica" />
            <div>
              <h2>Graph editor workflow scheme</h2>
              <p>
                Numerica is the graph-based system. Nodes describe operations, edges describe data
                flow, and the graph keeps the ontology readable.
              </p>
            </div>
          </div>
          <NumericaWorkflowArt />
          <ol className={newUsersStyles.workflowList}>
            <li>Add nodes from the palette to define operations.</li>
            <li>Connect ports to wire data between steps.</li>
            <li>Adjust parameters to drive variation or constraints.</li>
            <li>Reference Roslyn geometry for live, iterative updates.</li>
          </ol>
        </section>
      </div>
    </div>
  );
};

type DocumentationPageProps = {
  hash?: string;
};

const DocumentationPage = ({ hash = "" }: DocumentationPageProps) => {
  const route = useMemo(() => resolveDocsRoute(hash), [hash]);
  const navigate = useCallback((next: DocsRoute) => {
    if (typeof window === "undefined") return;
    window.location.hash = toDocsHash(next);
  }, []);
  const errorBoundaryKey =
    route.kind === "roslyn" || route.kind === "numerica"
      ? `${route.kind}-${route.id}`
      : route.kind;

  return (
    <div className={styles.page}>
      <DocsTopNav route={route} onNavigate={navigate} />
      <DocumentationErrorBoundary
        key={errorBoundaryKey}
        onReset={() => navigate({ kind: "index" })}
      >
        <div className={styles.pageContent}>
          {route.kind === "index" && <DocumentationIndex onNavigate={navigate} />}
          {route.kind === "new-users" && <DocumentationNewUsers onNavigate={navigate} />}
          {(route.kind === "roslyn" || route.kind === "numerica") && (
            <DocumentationDetail route={route} onNavigate={navigate} />
          )}
        </div>
      </DocumentationErrorBoundary>
    </div>
  );
};

export default DocumentationPage;
