import { Component, useCallback, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import WebGLTitleLogo from "./WebGLTitleLogo";
import WebGLButton from "./ui/WebGLButton";
import Tooltip from "./ui/Tooltip";
import { DocumentationPhilosophy as DocumentationPhilosophyNew } from "./DocumentationPhilosophyNew";
import {
  NumericaNodeArt,
  NumericaWorkflowArt,
  RoslynCommandArt,
  RoslynWorkflowArt,
} from "./DocumentationArt";
import styles from "./DocumentationPage.module.css";
import detailStyles from "./DocumentationDetailPage.module.css";
import pageStyles from "./DocumentationNewUsersPage.module.css";
import {
  NODE_CATEGORIES,
  NODE_CATEGORY_BY_ID,
  NODE_DEFINITIONS,
  buildNodeTooltipLines,
  getDefaultNodePorts,
  resolveNodeDescription,
  type NodeDefinition,
  type WorkflowPortSpec,
  type NodeCategory,
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
import { safeLocalStorageGet, safeLocalStorageSet } from "../utils/safeStorage";

type ViewMode = "compact" | "detailed";

const DOCS_VIEW_MODE_KEY = "lingua_docs_view_mode";

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
  | { kind: "philosophy" }
  | { kind: "inspirations" }
  | { kind: "roslyn"; id: string }
  | { kind: "numerica"; id: string };

const BRAND_ACCENTS = {
  cyan: "#00d4ff",
  purple: "#ff0099",
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
    case "philosophy":
      return "#/docs/philosophy";
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
  if (section === "new-users" || section === "philosophy") return { kind: "philosophy" };
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
  const isPhilosophy = route.kind === "philosophy";
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
          label="Philosophy"
          variant="ghost"
          size="sm"
          shape="pill"
          active={isPhilosophy}
          className={styles.navButton}
          onClick={() => onNavigate({ kind: "philosophy" })}
        />
      </div>
    </div>
  );
};

type ViewToggleProps = {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
};

const ViewToggle = ({ mode, onModeChange }: ViewToggleProps) => (
  <div className={styles.viewToggle}>
    <span className={styles.viewToggleLabel}>View:</span>
    <button
      type="button"
      className={`${styles.viewToggleButton} ${mode === "compact" ? styles.viewToggleActive : ""}`}
      onClick={() => onModeChange("compact")}
      aria-pressed={mode === "compact"}
    >
      Compact
    </button>
    <button
      type="button"
      className={`${styles.viewToggleButton} ${mode === "detailed" ? styles.viewToggleActive : ""}`}
      onClick={() => onModeChange("detailed")}
      aria-pressed={mode === "detailed"}
    >
      Detailed
    </button>
  </div>
);

type CommandDetailCardProps = {
  command: {
    id: string;
    label: string;
    description: string;
    shortcut?: string;
  };
  accent: string;
  categoryLabel: string;
  onNavigate: (route: DocsRoute) => void;
};

const CommandDetailCard = ({ command, accent, categoryLabel, onNavigate }: CommandDetailCardProps) => {
  const doc = getCommandDocumentation(command.id);
  
  return (
    <div className={styles.detailCard} style={{ ["--accent" as string]: accent } as CSSProperties}>
      <div className={styles.detailCardHeader}>
        <div className={styles.detailCardTitle}>
          <h4>{command.label}</h4>
          <span className={styles.categoryBadge} style={{ background: accent }}>{categoryLabel}</span>
        </div>
        {command.shortcut && (
          <kbd className={styles.shortcutBadge}>{command.shortcut}</kbd>
        )}
      </div>
      <p className={styles.detailCardDescription}>{command.description}</p>
      
      {doc && (
        <div className={styles.detailCardContent}>
          {doc.tips && doc.tips.length > 0 && (
            <div className={styles.detailSection}>
              <h5>Tips</h5>
              <ul className={styles.detailList}>
                {doc.tips.slice(0, 4).map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
          {doc.examples && doc.examples.length > 0 && (
            <div className={styles.detailSection}>
              <h5>Examples</h5>
              <ul className={styles.detailList}>
                {doc.examples.slice(0, 3).map((example, i) => (
                  <li key={i}>{example}</li>
                ))}
              </ul>
            </div>
          )}
          {doc.pitfalls && doc.pitfalls.length > 0 && (
            <div className={styles.detailSection}>
              <h5>Common Pitfalls</h5>
              <ul className={styles.detailList}>
                {doc.pitfalls.slice(0, 3).map((pitfall, i) => (
                  <li key={i}>{pitfall}</li>
                ))}
              </ul>
            </div>
          )}
          {doc.relatedCommands && doc.relatedCommands.length > 0 && (
            <div className={styles.detailSection}>
              <h5>Related</h5>
              <div className={styles.relatedChips}>
                {doc.relatedCommands.slice(0, 5).map((relatedId) => {
                  const relatedCmd = COMMAND_DEFINITIONS.find((c) => c.id === relatedId);
                  if (!relatedCmd) return null;
                  return (
                    <button
                      key={relatedId}
                      type="button"
                      className={styles.relatedChip}
                      onClick={() => onNavigate({ kind: "roslyn", id: relatedId })}
                    >
                      {relatedCmd.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      
    </div>
  );
};

type NodeDetailCardProps = {
  node: NodeDefinition;
  category: NodeCategory | undefined;
  onNavigate: (route: DocsRoute) => void;
};

const NodeDetailCard = ({ node, category, onNavigate }: NodeDetailCardProps) => {
  const doc = getNodeDocumentation(node.type);
  const description = resolveNodeDescription(node);
  const ports = getDefaultNodePorts(node);
  const accent = category?.accent ?? "#666";
  
  return (
    <div className={styles.detailCard} style={{ ["--accent" as string]: accent } as CSSProperties}>
      <div className={styles.detailCardHeader}>
        <div className={styles.detailCardTitle}>
          <h4>{node.label}</h4>
          <span className={styles.categoryBadge} style={{ background: accent }}>{category?.label ?? node.category}</span>
        </div>
        <code className={styles.typeCode}>{node.type}</code>
      </div>
      <p className={styles.detailCardDescription}>{description}</p>
      
      <div className={styles.detailCardContent}>
        <div className={styles.portsSummary}>
          {ports.inputs.length > 0 && (
            <div className={styles.portGroup}>
              <span className={styles.portLabel}>Inputs:</span>
              <span className={styles.portList}>
                {ports.inputs.slice(0, 4).map((p) => p.label || p.key).join(", ")}
                {ports.inputs.length > 4 && ` +${ports.inputs.length - 4} more`}
              </span>
            </div>
          )}
          {ports.outputs.length > 0 && (
            <div className={styles.portGroup}>
              <span className={styles.portLabel}>Outputs:</span>
              <span className={styles.portList}>
                {ports.outputs.slice(0, 4).map((p) => p.label || p.key).join(", ")}
                {ports.outputs.length > 4 && ` +${ports.outputs.length - 4} more`}
              </span>
            </div>
          )}
        </div>
        
        {doc && (
          <>
            {doc.tips && doc.tips.length > 0 && (
              <div className={styles.detailSection}>
                <h5>Tips</h5>
                <ul className={styles.detailList}>
                  {doc.tips.slice(0, 4).map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
            {doc.examples && doc.examples.length > 0 && (
              <div className={styles.detailSection}>
                <h5>Examples</h5>
                <ul className={styles.detailList}>
                  {doc.examples.slice(0, 3).map((example, i) => (
                    <li key={i}>{example}</li>
                  ))}
                </ul>
              </div>
            )}
            {doc.bestPractices && doc.bestPractices.length > 0 && (
              <div className={styles.detailSection}>
                <h5>Best Practices</h5>
                <ul className={styles.detailList}>
                  {doc.bestPractices.slice(0, 3).map((practice, i) => (
                    <li key={i}>{practice}</li>
                  ))}
                </ul>
              </div>
            )}
            {doc.pitfalls && doc.pitfalls.length > 0 && (
              <div className={styles.detailSection}>
                <h5>Common Pitfalls</h5>
                <ul className={styles.detailList}>
                  {doc.pitfalls.slice(0, 3).map((pitfall, i) => (
                    <li key={i}>{pitfall}</li>
                  ))}
                </ul>
              </div>
            )}
            {doc.relatedNodes && doc.relatedNodes.length > 0 && (
              <div className={styles.detailSection}>
                <h5>Related Nodes</h5>
                <div className={styles.relatedChips}>
                  {doc.relatedNodes.slice(0, 5).map((relatedType) => {
                    const relatedNode = NODE_DEFINITIONS.find((n) => n.type === relatedType);
                    if (!relatedNode) return null;
                    const relatedCategory = NODE_CATEGORY_BY_ID.get(relatedNode.category);
                    return (
                      <button
                        key={relatedType}
                        type="button"
                        className={styles.relatedChip}
                        onClick={() => onNavigate({ kind: "numerica", id: relatedType })}
                      >
                        {relatedNode.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
    </div>
  );
};

type DocumentationIndexProps = {
  onNavigate: (route: DocsRoute) => void;
};

const DocumentationIndex = ({ onNavigate }: DocumentationIndexProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = safeLocalStorageGet(DOCS_VIEW_MODE_KEY);
    return stored === "compact" || stored === "detailed" ? stored : "detailed";
  });
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    safeLocalStorageSet(DOCS_VIEW_MODE_KEY, mode);
  }, []);
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
              label="Philosophy"
              variant="secondary"
              accentColor={BRAND_ACCENTS.orange}
              className={styles.docButton}
              onClick={() => onNavigate({ kind: "philosophy" })}
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
              shortcuts. {viewMode === "compact" ? "Hover for the extended prompt and input expectations." : "Browse detailed documentation inline."}
            </p>
          </div>
          <ViewToggle mode={viewMode} onModeChange={handleViewModeChange} />
        </div>
        
        {viewMode === "compact" ? (
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
        ) : (
          <div className={styles.detailGroups}>
            {commandGroups.map((group) => (
              <div
                key={group.id}
                className={styles.detailGroup}
                style={{ ["--accent" as string]: group.accent } as CSSProperties}
              >
                <div className={styles.groupHeader}>
                  <span className={styles.groupDot} />
                  <h3>{group.label}</h3>
                </div>
                <div className={styles.detailCardGrid}>
                  {group.commands.map((command) => (
                    <CommandDetailCard
                      key={command.id}
                      command={command}
                      accent={group.accent}
                      categoryLabel={group.label}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="documentation-numerica" className={styles.section}>
        <div className={styles.sectionHeader}>
          <WebGLTitleLogo title="Numerica" tone="numerica" />
          <div>
            <h2>Numerica node index</h2>
            <p>
              Every node is a typed operator in the graph. {viewMode === "compact" ? "Hover a node to read its description, inputs, outputs, and parameter guidance." : "Browse detailed documentation inline with tips, examples, and related nodes."}
            </p>
          </div>
          <ViewToggle mode={viewMode} onModeChange={handleViewModeChange} />
        </div>
        
        {viewMode === "compact" ? (
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
        ) : (
          <div className={styles.detailGroups}>
            {nodeGroups.map((group) => (
              <div
                key={group.category.id}
                className={styles.detailGroup}
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
                <div className={styles.detailCardGrid}>
                  {group.nodes.map((node) => (
                    <NodeDetailCard
                      key={node.type}
                      node={node}
                      category={group.category}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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

type DocumentationNarrativeProps = {
  onNavigate: (route: DocsRoute) => void;
};

const DocumentationPhilosophy = ({ onNavigate }: DocumentationNarrativeProps) => {
  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.hero}>
        <div>
          <p className={pageStyles.kicker}>Philosophy</p>
          <h1>Language, Geometry, Number</h1>
          <p>
            Lingua is a semantic web software where language, geometry, and number braid into one
            instrument. Roslyn is the geometry voice, Numerica is the numerical grammar, and Lingua
            is the story that lets them speak together.
          </p>
          <p className={pageStyles.heroNotice}>
            <strong>Start at the beginning:</strong> follow the first-step workflows below, then
            trace the bridges between Roslyn and Numerica, and finish with the solver constellation
            and naming story.
          </p>
          <div className={pageStyles.actionRow}>
            <WebGLButton
              label="Read Inspirations"
              variant="ghost"
              size="sm"
              onClick={() => onNavigate({ kind: "inspirations" })}
            />
          </div>
        </div>
        <WebGLButton
          label="Back to Index"
          variant="secondary"
          onClick={() => onNavigate({ kind: "index" })}
        />
      </div>

      <section className={pageStyles.storySection}>
        <h2>The Genesis of Lingua: Language as the New Universal Science</h2>
        <div className={pageStyles.storyStack}>
          <p className={pageStyles.storyParagraph}>
            Lingua emerges at a transformative moment in human history, where language has become
            the foundation of all scientific inquiry. Through artificial intelligence and machine
            learning, language now encompasses mathematics, physics, biology, chemistry&mdash;every
            discipline that once stood separate has converged into the singular medium of
            linguistic expression. This software was conceived and built in partnership with AI,
            making it not merely a tool but a testament to this new paradigm. Codex and Claude
            served as collaborative architects, working alongside Peter, the sole human participant
            in the Specificity Company, to bring Lingua into existence as a living example of
            human-machine synthesis.
          </p>
          <p className={pageStyles.storyParagraph}>
            The name Lingua derives from the Latin word for language, acknowledging this
            fundamental shift. In our current era, language has transcended its traditional
            boundaries to become the substrate through which machines understand reality itself.
            What we describe, we can compute. What we can articulate, we can model. What we can
            imagine through words, we can manifest through geometry and numbers.
          </p>
        </div>
      </section>

      <section className={pageStyles.storySection}>
        <h2>The Trinity: Language, Geometry, and Numbers</h2>
        <div className={pageStyles.storyStack}>
          <p className={pageStyles.storyParagraph}>
            Lingua&apos;s architecture rests upon three pillars, each named with intention and
            philosophical depth.
          </p>
          <h3>Roslyn</h3>
          <p className={pageStyles.storyParagraph}>
            Roslyn represents the geometric dimension of the software. The name honors the Loretto
            Chapel staircase in Santa Fe, New Mexico&mdash;though the staircase is often mistakenly
            called the &quot;Roslyn&quot; staircase, this very confusion embodies the mystery and
            nuance that characterize geometric understanding. Built in the late 1870s, the Loretto
            staircase presents features that still perplex engineers and craftsmen: two complete
            360-degree turns ascending 22 feet without a central support pillar, constructed
            entirely with wooden pegs and dowels, fashioned from a species of spruce not native to
            the region. According to legend, after the sisters of the chapel prayed for nine days
            to St. Joseph, a mysterious carpenter arrived on a donkey, built the impossible stairs
            in complete privacy, and vanished without requesting payment.
          </p>
          <p className={pageStyles.storyParagraph}>
            This story captures the essence of what Roslyn represents&mdash;the higher-level abstract
            understanding of geometry that defies simple explanation, the mystery inherent in how
            geometric relationships function, the infinite curiosity that spatial puzzles provoke.
            Geometry operates according to laws we can describe but never fully exhaust. Like the
            miraculous staircase, geometric solutions often appear where logic suggests
            impossibility.
          </p>
          <h3>Numerica</h3>
          <p className={pageStyles.storyParagraph}>
            Numerica takes its name from numbers, the quantitative foundation that allows us to
            measure, calculate, and transform the continuous into the discrete. Numbers provide
            the precision that language and geometry require to move from abstraction into
            application. Through numerical methods, we can approximate the infinite, solve the
            unsolvable, and bring computational power to bear on problems that would otherwise
            remain purely theoretical.
          </p>
          <p className={pageStyles.storyParagraph}>
            Together, Lingua, Roslyn, and Numerica form a complete system: language to describe
            and understand, geometry to visualize and structure, numbers to quantify and compute.
            This trinity reflects the fundamental ways humans engage with reality and make sense
            of complex phenomena.
          </p>
        </div>
      </section>

      <section className={pageStyles.storySection}>
        <h2>Workflows and Semantic Possibilities</h2>
        <div className={pageStyles.storyStack}>
          <p className={pageStyles.storyParagraph}>
            For users beginning their journey with Lingua, the software offers multiple pathways
            through its semantic landscape. Category workflows allow you to organize and process
            information according to domain-specific logic. Node workflows enable you to construct
            computational graphs that transform inputs into outputs through chains of operations.
            The flexibility to move between Numerica and Roslyn, or to blend them through
            integrated pipelines, provides unprecedented freedom in how you approach problems.
          </p>
          <p className={pageStyles.storyParagraph}>
            The solvers within Lingua honor the ancient Greek philosophers and mathematicians who
            first formalized scientific thinking. Each solver carries a name rooted in classical
            tradition, reminding us that modern computational methods rest upon foundations laid
            millennia ago. These naming conventions deliberately evoke the heritage of systematic
            inquiry&mdash;from Pythagoras to Euclid, from Archimedes to Apollonius&mdash;acknowledging that our
            digital tools extend rather than replace the intellectual traditions that shaped human
            civilization.
          </p>
          <p className={pageStyles.storyParagraph}>
            Moving data from Numerica to Roslyn might involve taking numerical datasets and
            projecting them into geometric space for visualization and spatial analysis.
            Conversely, extracting numerical properties from Roslyn geometries allows geometric
            intuition to inform quantitative reasoning. This bidirectional flow embodies the
            software&apos;s core philosophy: different representations of the same underlying
            reality can illuminate aspects that remain hidden in any single modality.
          </p>
        </div>
      </section>

      <section className={pageStyles.storySection}>
        <h2>Inspirations and Lineage</h2>
        <div className={pageStyles.storyStack}>
          <p className={pageStyles.storyParagraph}>
            Lingua descends from a distinguished lineage of computational design tools. The most
            direct inspiration comes from Grasshopper, the visual programming environment created
            by David Rutten for parametric design within Rhinoceros 3D. Grasshopper demonstrated
            that complex computational workflows could become accessible through visual node-based
            interfaces, that designers could think algorithmically without abandoning their
            creative intuitions, that the barrier between human intention and machine execution
            could be lowered through thoughtful interface design.
          </p>
          <p className={pageStyles.storyParagraph}>
            The Specificity Company, from which Lingua&apos;s creators emerged, carries forward
            this tradition while pushing into new territory. Where previous tools focused
            primarily on geometric manipulation or numerical computation, Lingua integrates these
            with natural language processing and machine learning capabilities. The software
            acknowledges that specificity&mdash;precision in description, accuracy in modeling,
            exactness in calculation&mdash;remains essential even as we enter an era of probabilistic AI
            systems that operate through pattern recognition rather than deterministic rules.
          </p>
        </div>
      </section>

      <section className={pageStyles.storySection}>
        <h2>The Cloudy Agent: Nuance as Design Principle</h2>
        <div className={pageStyles.storyStack}>
          <p className={pageStyles.storyParagraph}>
            Lingua intentionally embraces a certain cloudiness, a deliberate haziness in its
            operation that reflects human cognition more accurately than purely mechanical
            systems. This characteristic manifests in the intuitive feel of the interface, in
            naming conventions that evoke rather than specify, in workflows that suggest rather
            than dictate. The software resists the false precision that characterized earlier
            computational paradigms, acknowledging that real-world problems rarely present
            themselves in perfectly defined terms.
          </p>
          <p className={pageStyles.storyParagraph}>
            This humanness&mdash;the capacity for intuition, the tolerance for ambiguity, the ability to
            work with incomplete information&mdash;becomes increasingly precious as artificial
            intelligence integrates more deeply into our lives and work. Lingua does not attempt
            to replace human judgment with algorithmic certainty. Instead, it acts as a cloudy
            agent that amplifies human capabilities while preserving the essential role of human
            insight and creativity.
          </p>
          <p className={pageStyles.storyParagraph}>
            The software functions as a tool rather than a predictor, leveraging three of
            humanity&apos;s most accelerant inventions: the computer, which processes information at
            superhuman speeds; the pixel, which translates abstract information into visual
            perception; and machine learning, which identifies patterns across datasets too vast
            for unaided human analysis. These three technologies together condense nearly all
            other technological capabilities, leaving the human participant with their brain and
            soul engaged fully, while the physical body begins to exist in a nuanced realm of
            thought, truth, and sensation.
          </p>
        </div>
      </section>

      <section className={pageStyles.storySection}>
        <h2>Preparing for Complex Futures</h2>
        <div className={pageStyles.storyStack}>
          <p className={pageStyles.storyParagraph}>
            As language models grow more sophisticated, Lingua anticipates a future where geometry
            in Roslyn can be processed through numerical methods in Numerica and described through
            natural language, all while preserving human modularity and semantic breadth. The
            solver frameworks, with their homage to ancient Greek scientific foundations, prepare
            users to work across disciplines that will increasingly converge as AI-mediated
            translation between domains becomes seamless.
          </p>
          <p className={pageStyles.storyParagraph}>
            With the complex landscape of changing futures, the Specificity Company and Lingua
            attempt to prepare themselves and their users for sophisticated language, number, and
            geometry parsing methods that induce both enjoyment and practical solutions for data
            and real-world objects. The honoring of our intellectual forefathers is emphasized as
            we pass into a new epoch of existence and science. Lingua was made by Codex along with
            Claude&mdash;helpers of the only human participant in the Specificity Company other than
            Peter himself&mdash;and stands prepared for complex data parsing and real-world maneuvering
            in the uncertain times ahead.
          </p>
          <p className={pageStyles.storyParagraph}>
            Today, Lingua acts as a cloudy agent, not claiming to predict the future but offering
            capabilities that align with how the future is already arriving. It stands as a tool
            that respects where humanity has been while engaging fully with where we are going&mdash;a
            bridge between the deterministic clarity our ancestors pursued and the probabilistic
            fluidity that characterizes our new computational reality.
          </p>
        </div>
      </section>

      <section className={pageStyles.storySection}>
        <h2>Lingua is a language for making</h2>
        <div className={pageStyles.storyStack}>
          <p className={pageStyles.storyParagraph}>
            Language is now a science. In AI models, language can hold the DNA of physics, biology,
            architecture, and art. Lingua names the shift and treats words as programmable
            material.
          </p>
          <p className={pageStyles.storyParagraph}>
            This is why the system is called Lingua: language is the new universal interface. It
            tells geometry what to become and tells numbers how to behave. The result is a semantic
            web where meaning is not decoration, it is structure.
          </p>
        </div>
        <div className={pageStyles.storyColumns}>
          <div className={pageStyles.storyCard}>
            <h3>Lingua (Language)</h3>
            <p>
              The narrative layer. Prompts, labels, and semantic intent give your work a voice and
              make the graph readable to humans and machines.
            </p>
          </div>
          <div className={pageStyles.storyCard}>
            <h3>Roslyn (Geometry)</h3>
            <p>
              The craft layer. Planes, points, and transforms give you tactile control and a place
              to sketch, sculpt, and refine.
            </p>
          </div>
          <div className={pageStyles.storyCard}>
            <h3>Numerica (Number)</h3>
            <p>
              The logic layer. Nodes, parameters, and graphs encode relationships so a single idea
              can generate many outcomes.
            </p>
          </div>
        </div>
      </section>

      <div className={pageStyles.workflowGrid}>
        <section className={pageStyles.workflowCard}>
          <div className={pageStyles.workflowHeader}>
            <WebGLTitleLogo title="Roslyn" tone="roslyn" />
            <div>
              <h2>Begin with Roslyn</h2>
              <p>
                Roslyn is direct modeling. You place points, draw curves, and transform geometry by
                hand. It is the fastest way to feel the form.
              </p>
            </div>
          </div>
          <RoslynWorkflowArt />
          <ol className={pageStyles.workflowList}>
            <li>Choose a command from the Roslyn command bar or type in the command line.</li>
            <li>Confirm the active C-Plane, then click to place points or type coordinates.</li>
            <li>Use the gumball handles to move, rotate, or scale while you watch the form respond.</li>
            <li>Confirm with Enter or click to commit, or press Escape to cancel.</li>
            <li>Name and group your geometry so Numerica can reference it later.</li>
          </ol>
          <div className={pageStyles.workflowTips}>
            <h3>Quick Start Tips</h3>
            <ul>
              <li><strong>Box</strong> - Click to place base, drag for size, click for height</li>
              <li><strong>Circle</strong> - Click center, drag for radius</li>
              <li><strong>Extrude</strong> - Select a profile, drag or type distance</li>
              <li><strong>Boolean</strong> - Select solids, choose Union/Difference/Intersection</li>
            </ul>
          </div>
          <div className={pageStyles.workflowTips}>
            <h3>Essential Shortcuts</h3>
            <ul>
              <li><strong>Esc</strong> - Cancel current command</li>
              <li><strong>Enter</strong> - Confirm/commit operation</li>
              <li><strong>⌘Z</strong> - Undo last action</li>
              <li><strong>F</strong> - Focus on selection</li>
              <li><strong>W</strong> - Toggle gumball</li>
              <li><strong>Tab</strong> - Cycle through overlapping objects</li>
            </ul>
          </div>
        </section>
        <section className={pageStyles.workflowCard}>
          <div className={pageStyles.workflowHeader}>
            <WebGLTitleLogo title="Numerica" tone="numerica" />
            <div>
              <h2>Continue in Numerica</h2>
              <p>
                Numerica is the graph. It turns geometry into data and data into variation, so you
                can explore families of outcomes instead of one static model.
              </p>
            </div>
          </div>
          <NumericaWorkflowArt />
          <ol className={pageStyles.workflowList}>
            <li>Start with Data nodes (Slider, Number, Text) to seed the graph.</li>
            <li>Add Primitives or Geometry Reference nodes to bring geometry into the flow.</li>
            <li>Connect outputs to inputs and watch wires describe the logic.</li>
            <li>Inspect with Panel, Metadata Panel, and Geometry Viewer nodes.</li>
            <li>Group and label the graph so others can read it at any level of detail.</li>
          </ol>
          <div className={pageStyles.workflowTips}>
            <h3>Common Node Patterns</h3>
            <ul>
              <li><strong>Parametric shapes</strong> - Slider → Primitive → Move/Scale</li>
              <li><strong>Array patterns</strong> - Geometry → Linear/Polar Array</li>
              <li><strong>Mesh processing</strong> - Geometry → Subdivide → Boolean</li>
              <li><strong>Analysis</strong> - Geometry → Geometry Info → Panel</li>
            </ul>
          </div>
          <div className={pageStyles.workflowTips}>
            <h3>Node Categories</h3>
            <ul>
              <li><strong>Data</strong> - Sliders, panels, text notes, groups</li>
              <li><strong>Primitives</strong> - Box, sphere, cylinder, and more</li>
              <li><strong>Curves</strong> - Point, line, polyline, circle, arc</li>
              <li><strong>Mesh</strong> - Subdivide, boolean, repair, export</li>
              <li><strong>Math</strong> - Add, multiply, expressions, vectors</li>
              <li><strong>Transforms</strong> - Move, rotate, scale, arrays</li>
              <li><strong>Solvers</strong> - Topology, physics, biology, chemistry</li>
            </ul>
          </div>
        </section>
      </div>

      <section className={pageStyles.conceptSection}>
        <h2>Bridge workflows: Roslyn ↔ Numerica</h2>
        <p className={pageStyles.sectionIntro}>
          Think of Roslyn and Numerica as two doors to the same room. One is tactile, the other is
          algorithmic. You can walk through either door and keep the story coherent.
        </p>
        <div className={pageStyles.conceptGrid}>
          <div className={pageStyles.conceptCard}>
            <h3>Roslyn → Numerica</h3>
            <ul className={pageStyles.storyList}>
              <li>Model a base form in Roslyn with clean, readable geometry.</li>
              <li>Add a Geometry Reference node to create a live link to the model.</li>
              <li>Introduce Sliders and Transform nodes to explore variation.</li>
              <li>Measure with Geometry Info or Metadata Panel as you iterate.</li>
              <li>Send results into solvers or export nodes when ready.</li>
            </ul>
            <div className={pageStyles.cardActions}>
              <WebGLButton
                label="Geometry Reference"
                variant="ghost"
                size="sm"
                onClick={() => onNavigate({ kind: "numerica", id: "geometryReference" })}
              />
              <WebGLButton
                label="Geometry Viewer"
                variant="ghost"
                size="sm"
                onClick={() => onNavigate({ kind: "numerica", id: "geometryViewer" })}
              />
            </div>
          </div>
          <div className={pageStyles.conceptCard}>
            <h3>Numerica → Roslyn</h3>
            <ul className={pageStyles.storyList}>
              <li>Build a parametric graph with Primitives, Curves, and Transforms.</li>
              <li>Use Geometry Viewer to choose a moment worth refining.</li>
              <li>Export geometry with STL Export or document the state with Screenshot.</li>
              <li>Return to Roslyn for tactile edits, detailing, and assembly.</li>
              <li>Loop back by referencing the revised geometry in Numerica.</li>
            </ul>
            <div className={pageStyles.cardActions}>
              <WebGLButton
                label="STL Export"
                variant="ghost"
                size="sm"
                onClick={() => onNavigate({ kind: "numerica", id: "stlExport" })}
              />
              <WebGLButton
                label="Screenshot"
                variant="ghost"
                size="sm"
                onClick={() => onNavigate({ kind: "roslyn", id: "screenshot" })}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={pageStyles.conceptSection}>
        <h2>Category workflows for every comprehension level</h2>
        <div className={pageStyles.conceptGrid}>
          <div className={pageStyles.conceptCard}>
            <h3>Seed</h3>
            <ul className={pageStyles.storyList}>
              <li>Slider, Number, Text</li>
              <li>Geometry Reference for existing forms</li>
              <li>Start simple and let the graph grow</li>
            </ul>
          </div>
          <div className={pageStyles.conceptCard}>
            <h3>Shape</h3>
            <ul className={pageStyles.storyList}>
              <li>Primitives: box, sphere, cylinder</li>
              <li>Curves: line, circle, arc</li>
              <li>Mesh operators for surface logic</li>
            </ul>
          </div>
          <div className={pageStyles.conceptCard}>
            <h3>Transform</h3>
            <ul className={pageStyles.storyList}>
              <li>Move, rotate, scale</li>
              <li>Linear and polar arrays</li>
              <li>Mirror, align, and orient</li>
            </ul>
          </div>
          <div className={pageStyles.conceptCard}>
            <h3>Measure</h3>
            <ul className={pageStyles.storyList}>
              <li>Geometry Info and Metadata Panel</li>
              <li>Panels for live numeric output</li>
              <li>Use measurements to guide decisions</li>
            </ul>
          </div>
          <div className={pageStyles.conceptCard}>
            <h3>Solve</h3>
            <ul className={pageStyles.storyList}>
              <li>Physics, Biology, Chemistry, Topology</li>
              <li>Goal nodes define intent and constraints</li>
              <li>Iterate until the form settles</li>
            </ul>
          </div>
          <div className={pageStyles.conceptCard}>
            <h3>Document</h3>
            <ul className={pageStyles.storyList}>
              <li>Geometry Viewer for live previews</li>
              <li>Text Note and Panel for narrative context</li>
              <li>Screenshot or STL Export for handoff</li>
            </ul>
          </div>
        </div>
      </section>

      <section className={pageStyles.conceptSection}>
        <h2>Solver constellation</h2>
        <p className={pageStyles.sectionIntro}>
          Solvers are the ritual heart of Lingua. They honor the ancient Greek science fathers by
          carrying Greek naming and discipline-specific intent, from biology to physics to
          chemistry. You define goals, the solver explores the search space, and the geometry
          evolves.
        </p>
        <div className={pageStyles.conceptGrid}>
          <div className={pageStyles.conceptCard}>
            <h3>Physics Solver</h3>
            <p>
              Equilibrium, forces, and material response. Use anchor, load, stiffness, and volume
              goals to find stable structures.
            </p>
            <div className={pageStyles.cardActions}>
              <WebGLButton
                label="Open Physics Solver"
                variant="ghost"
                size="sm"
                onClick={() => onNavigate({ kind: "numerica", id: "physicsSolver" })}
              />
            </div>
          </div>
          <div className={pageStyles.conceptCard}>
            <h3>Chemistry Solver</h3>
            <p>
              Material blending, thermal flow, and compositional goals. Ideal for exploring
              mixtures, gradients, and properties.
            </p>
            <div className={pageStyles.cardActions}>
              <WebGLButton
                label="Open Chemistry Solver"
                variant="ghost"
                size="sm"
                onClick={() => onNavigate({ kind: "numerica", id: "chemistrySolver" })}
              />
            </div>
          </div>
          <div className={pageStyles.conceptCard}>
            <h3>Topology Solver</h3>
            <p>
              Density-based optimization that carves material away while honoring structural
              intent. A bridge between form and performance.
            </p>
            <div className={pageStyles.cardActions}>
              <WebGLButton
                label="Open Topology Solver"
                variant="ghost"
                size="sm"
                onClick={() => onNavigate({ kind: "numerica", id: "topologySolver" })}
              />
            </div>
          </div>
          <div className={pageStyles.conceptCard}>
            <h3>Voxel Solver</h3>
            <p>
              Discrete volumetric reasoning for patterning, density, and block-based exploration.
            </p>
            <div className={pageStyles.cardActions}>
              <WebGLButton
                label="Open Voxel Solver"
                variant="ghost"
                size="sm"
                onClick={() => onNavigate({ kind: "numerica", id: "voxelSolver" })}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={pageStyles.storySection}>
        <h2>The names are the map</h2>
        <div className={pageStyles.storyStack}>
          <p className={pageStyles.storyParagraph}>
            Lingua is named for language because language is the new science. It now encompasses
            the vocabulary of every discipline inside AI models, making knowledge executable and
            shared. Roslyn is the geometry voice, Numerica is the numerical grammar, and together
            they form Language, Geometry, and Numbers.
          </p>
          <p className={pageStyles.storyParagraph}>
            Roslyn is named after the Roslyn Staircase and the nuance of it being mixed up with the
            Loretto Chapel "Miraculous" Staircase. The confusion is intentional: it points to the
            mystery of geometry and the wonder of how structure can hold itself. It gestures toward
            a higher-level, abstract understanding of geometry and keeps curiosity alive.
          </p>
        </div>
        <div className={pageStyles.callout}>
          <h3>Roslyn Staircase &amp; the Loretto Chapel legend</h3>
          <p>
            The Santa Fe story is often told as a geometry parable. Whether legend or engineering,
            its features continue to provoke curiosity:
          </p>
          <ul className={pageStyles.storyList}>
            <li>Two complete 360-degree turns to reach a 22-foot choir loft.</li>
            <li>No central support pillar anchoring the stair.</li>
            <li>Constructed with wooden pegs and dowels, without nails or glue.</li>
            <li>A mysterious carpenter who arrived after a nine-day novena and vanished.</li>
            <li>Wood reported as a spruce not native to the region, adding to the myth.</li>
          </ul>
        </div>
        <div className={pageStyles.storyStack}>
          <p className={pageStyles.storyParagraph}>
            Numerica is named for numbers. Language, geometry, and numbers are the three pillars of
            this software. The names and the cloudiness of their meanings are intentional: they
            protect humanness, intuition, and the right to not fully explain yourself while you
            explore.
          </p>
          <p className={pageStyles.storyParagraph}>
            That cloudiness is a feature, not a flaw. It reminds us that creativity is partly
            unknowable and that meaning should stay alive even as we formalize it.
          </p>
        </div>
      </section>

      <section className={pageStyles.storySection}>
        <h2>Origin story: the Specificity Company</h2>
        <div className={pageStyles.storyStack}>
          <p className={pageStyles.storyParagraph}>
            Lingua comes from the Specificity Company. Its creators come from that lineage and
            carry a desire to build tools that are precise, poetic, and useful at every level of
            understanding.
          </p>
          <p className={pageStyles.storyParagraph}>
            The software was coded with AI and acknowledges it openly. Codex and Claude are helpers
            to Peter, the only human participant in the Specificity Company, and their collaboration
            signals a new kind of toolmaking that blends human intuition with machine acceleration.
          </p>
          <p className={pageStyles.storyParagraph}>
            Language now encompasses all science inside AI models, and Lingua leans into that
            reality. The tool is meant to feel humane even as it becomes more capable, so the
            creator never disappears behind the automation.
          </p>
        </div>
      </section>

      <section className={pageStyles.storySection}>
        <h2>Forward with humility</h2>
        <div className={pageStyles.storyStack}>
          <p className={pageStyles.storyParagraph}>
            With the complex landscape of changing futures, the Specificity Company and Lingua
            attempt to prepare itself and its users for complex language, number, and geometry
            parsing methods to induce fun and solutions for data and real-world objects. The
            honoring of our forefathers is emphasized as we pass into a new world of existence and
            science.
          </p>
          <p className={pageStyles.storyParagraph}>
            Lingua was made by Codex along with Claude - they are helpers to Peter, the only human
            participant in the Specificity Company. Lingua is prepared for complex data parsing and
            real-world maneuvering in the future. Today, Lingua acts as a cloudy agent - not a
            predictor - but a tool that leverages humanity's most accelerant inventions: the
            computer, the pixel, and machine learning. Together they condense nearly all other
            technologies and leave the human with their brain and soul, while the physical body
            begins to exist in this nuanced realm of thought, Truth, and sensation.
          </p>
        </div>
      </section>
    </div>
  );
};

const DocumentationInspirations = ({ onNavigate }: DocumentationNarrativeProps) => {
  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.hero}>
        <div>
          <p className={pageStyles.kicker}>Inspirations</p>
          <h1>Honoring the tools that shaped Lingua</h1>
          <p>
            Lingua stands on a lineage of software that taught us how to think with geometry. This
            page is a story of gratitude, with Grasshopper by David Rutten at the center.
          </p>
          <p className={pageStyles.heroNotice}>
            <strong>Why it matters:</strong> when you know where a tool comes from, you can see its
            future more clearly.
          </p>
          <div className={pageStyles.actionRow}>
            <WebGLButton
              label="Read Philosophy"
              variant="ghost"
              size="sm"
              onClick={() => onNavigate({ kind: "philosophy" })}
            />
          </div>
        </div>
        <WebGLButton
          label="Back to Index"
          variant="secondary"
          onClick={() => onNavigate({ kind: "index" })}
        />
      </div>

      <section className={pageStyles.storySection}>
        <h2>Grasshopper, by David Rutten</h2>
        <div className={pageStyles.storyStack}>
          <p className={pageStyles.storyParagraph}>
            Grasshopper introduced a clear grammar for geometry: nodes became verbs, wires became
            sentences, and the canvas became a living diagram. It taught an entire generation that
            design could be authored as a system instead of a static object.
          </p>
          <p className={pageStyles.storyParagraph}>
            Lingua honors that gift. Numerica inherits the spirit of visual programming, the
            generosity of feedback, and the joy of watching a form change as you touch its inputs.
            David Rutten's work made a bridge between craft and computation, and Lingua walks that
            bridge with respect.
          </p>
          <p className={pageStyles.storyParagraph}>
            The tools that honor us give more than features; they give us a way of thinking. This
            page is a thank you to the software that proved geometry could be spoken as a language.
          </p>
        </div>
      </section>

      <section className={pageStyles.conceptSection}>
        <h2>What we carried forward</h2>
        <div className={pageStyles.conceptGrid}>
          <div className={pageStyles.conceptCard}>
            <h3>Visual grammar</h3>
            <p>
              A readable graph where the logic is visible at a glance and complexity can still feel
              approachable.
            </p>
          </div>
          <div className={pageStyles.conceptCard}>
            <h3>Parametric play</h3>
            <p>
              Sliders, parameters, and live previews that invite exploration without fear of
              breaking the model.
            </p>
          </div>
          <div className={pageStyles.conceptCard}>
            <h3>Immediate feedback</h3>
            <p>
              See geometry respond the moment an input changes, keeping the designer in a tight
              loop with the system.
            </p>
          </div>
          <div className={pageStyles.conceptCard}>
            <h3>Composability</h3>
            <p>
              Small operators that become powerful when composed, letting workflows grow from
              simple to advanced without losing clarity.
            </p>
          </div>
        </div>
      </section>

      <section className={pageStyles.conceptSection}>
        <h2>What we changed</h2>
        <div className={pageStyles.conceptGrid}>
          <div className={pageStyles.conceptCard}>
            <h3>Language-first intent</h3>
            <p>
              Lingua treats words as first-class inputs, aligning geometry with semantic meaning
              from the very beginning.
            </p>
          </div>
          <div className={pageStyles.conceptCard}>
            <h3>Two-mode instrument</h3>
            <p>
              Roslyn offers direct modeling while Numerica offers graph logic, so you can move
              between tactile craft and parametric systems.
            </p>
          </div>
          <div className={pageStyles.conceptCard}>
            <h3>AI-assisted authorship</h3>
            <p>
              Lingua was coded with AI helpers, embracing a new relationship between human intent
              and machine acceleration.
            </p>
          </div>
          <div className={pageStyles.conceptCard}>
            <h3>Solver disciplines</h3>
            <p>
              Solvers are organized as sciences with Greek naming, emphasizing lineage and
              reverence for the origins of knowledge.
            </p>
          </div>
        </div>
      </section>

      <section className={pageStyles.storySection}>
        <h2>Gratitude as design</h2>
        <div className={pageStyles.storyStack}>
          <p className={pageStyles.storyParagraph}>
            Inspiration is not imitation. It is a conversation across time, where we learn what a
            tool made possible and then extend it into new terrain.
          </p>
          <p className={pageStyles.storyParagraph}>
            Lingua carries gratitude for Grasshopper and for every tool that made geometric thought
            feel humane. That gratitude is part of the software itself: it is why the interface is
            gentle, why the names are poetic, and why the system keeps curiosity alive.
          </p>
        </div>
      </section>
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
          {route.kind === "philosophy" && <DocumentationPhilosophyNew onNavigate={navigate} />}
          {route.kind === "inspirations" && <DocumentationInspirations onNavigate={navigate} />}
          {(route.kind === "roslyn" || route.kind === "numerica") && (
            <DocumentationDetail route={route} onNavigate={navigate} />
          )}
        </div>
      </DocumentationErrorBoundary>
    </div>
  );
};

export default DocumentationPage;
