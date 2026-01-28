import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useProjectStore, type NodeType } from "../../store/useProjectStore";
import { NumericalCanvas } from "./NumericalCanvas";
import IconButton from "../ui/IconButton";
import WebGLButton from "../ui/WebGLButton";
import WebGLTitleLogo from "../WebGLTitleLogo";
import {
  NODE_CATEGORIES,
  NODE_CATEGORY_BY_ID,
  NODE_DEFINITIONS,
  getNodeDefinition,
  resolveNodeParameters,
  resolveNodePorts,
  type NodeCategory,
} from "./nodeCatalog";
import styles from "./WorkflowSection.module.css";

const nodeOptions = NODE_DEFINITIONS;

const PALETTE_COLLAPSED_KEY = "specificity.numericaPaletteCollapsed";

const PALETTE_SECTIONS: Array<{
  id: string;
  label: string;
  description: string;
  categories: NodeCategory["id"][];
}> = [
  {
    id: "geometry",
    label: "Geometry",
    description: "Primitives, curves, surfaces",
    categories: ["primitives", "curves", "surfaces"],
  },
  {
    id: "transform",
    label: "Transform",
    description: "Move, rotate, spatial frames",
    categories: ["transforms", "euclidean"],
  },
  {
    id: "data",
    label: "Data",
    description: "Lists, ranges, analysis",
    categories: ["data", "basics", "lists", "ranges", "signals", "analysis", "optimization"],
  },
  {
    id: "logic",
    label: "Math + Logic",
    description: "Expressions, conditions",
    categories: ["math", "logic"],
  },
];

type WorkflowSectionProps = {
  onCaptureRequest?: (element: HTMLElement) => Promise<void> | void;
  captureDisabled?: boolean;
};

const WorkflowSection = ({ onCaptureRequest, captureDisabled }: WorkflowSectionProps) => {
  const [selectedType, setSelectedType] = useState<NodeType>("number");
  const nodes = useProjectStore((state) => state.workflow.nodes);
  const edges = useProjectStore((state) => state.workflow.edges);
  const addNode = useProjectStore((state) => state.addNode);
  const addNodeAt = useProjectStore((state) => state.addNodeAt);
  const pruneWorkflow = useProjectStore((state) => state.pruneWorkflow);
  const undoWorkflow = useProjectStore((state) => state.undoWorkflow);
  const updateNodeData = useProjectStore((state) => state.updateNodeData);
  const [paletteCollapsed, setPaletteCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(PALETTE_COLLAPSED_KEY) === "true";
  });

  const supportedTypes = useMemo(
    () => new Set(nodeOptions.map((option) => option.type)),
    []
  );
  const filteredNodes = useMemo(
    () =>
      nodes.filter(
        (node) => !node.type || supportedTypes.has(node.type as NodeType)
      ),
    [nodes, supportedTypes]
  );
  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((node) => node.id));
    return edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );
  }, [edges, filteredNodes]);

  const paletteSections = useMemo(() => {
    const groupMap = new Map<NodeCategory["id"], typeof nodeOptions>();
    nodeOptions.forEach((definition) => {
      const list = groupMap.get(definition.category);
      if (list) {
        list.push(definition);
      } else {
        groupMap.set(definition.category, [definition]);
      }
    });
    const usedCategories = new Set<NodeCategory["id"]>();
    const sections = PALETTE_SECTIONS.map((section) => {
      const groups = section.categories
        .map((categoryId) => {
          const category = NODE_CATEGORY_BY_ID.get(categoryId);
          if (!category) return null;
          const nodes = groupMap.get(categoryId) ?? [];
          if (nodes.length === 0) return null;
          usedCategories.add(categoryId);
          return { category, nodes };
        })
        .filter((group): group is { category: NodeCategory; nodes: typeof nodeOptions } => Boolean(group));
      return { ...section, groups };
    }).filter((section) => section.groups.length > 0);

    const remainingGroups = NODE_CATEGORIES.map((category) => {
      if (usedCategories.has(category.id)) return null;
      const nodes = groupMap.get(category.id) ?? [];
      if (nodes.length === 0) return null;
      return { category, nodes };
    }).filter((group): group is { category: NodeCategory; nodes: typeof nodeOptions } => Boolean(group));

    if (remainingGroups.length > 0) {
      sections.push({
        id: "other",
        label: "Other",
        description: "Utilities and helpers",
        categories: remainingGroups.map((group) => group.category.id),
        groups: remainingGroups,
      });
    }

    return sections;
  }, []);

  const selectedNode = useMemo(
    () => nodes.filter((node) => node.selected).at(-1) ?? null,
    [nodes]
  );

  const selectedNodeContext = useMemo(() => {
    if (!selectedNode || !selectedNode.type) return null;
    const definition = getNodeDefinition(selectedNode.type);
    const parameters = resolveNodeParameters(selectedNode);
    const ports = resolveNodePorts(selectedNode, parameters);
    return { node: selectedNode, definition, parameters, ports };
  }, [selectedNode]);

  const connectedInputs = useMemo(() => {
    if (!selectedNodeContext) return new Set<string>();
    const defaultInputKey = selectedNodeContext.ports.inputs[0]?.key;
    const connected = new Set<string>();
    edges.forEach((edge) => {
      if (edge.target !== selectedNodeContext.node.id) return;
      const handle = edge.targetHandle ?? defaultInputKey;
      if (handle) connected.add(handle);
    });
    return connected;
  }, [edges, selectedNodeContext]);

  const specKeys = useMemo(
    () => new Set(selectedNodeContext?.definition?.parameters.map((parameter) => parameter.key) ?? []),
    [selectedNodeContext]
  );

  const inputParameterPorts = useMemo(
    () =>
      selectedNodeContext?.ports.inputs.filter(
        (port) => port.parameterKey && !specKeys.has(port.parameterKey)
      ) ?? [],
    [selectedNodeContext, specKeys]
  );

  const readNumber = (value: unknown, fallback: number) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  };

  const readBoolean = (value: unknown, fallback: boolean) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lower = value.trim().toLowerCase();
      if (lower === "true") return true;
      if (lower === "false") return false;
    }
    return fallback;
  };

  const readString = (value: unknown, fallback: string) => {
    if (typeof value === "string") return value;
    if (value === null || value === undefined) return fallback;
    return String(value);
  };

  const parseLooseValue = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return "";
    const lower = trimmed.toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) return numeric;
    return raw;
  };

  const setParameter = (key: string, value: unknown) => {
    if (!selectedNodeContext) return;
    updateNodeData(selectedNodeContext.node.id, {
      parameters: {
        [key]: value,
      },
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PALETTE_COLLAPSED_KEY, String(paletteCollapsed));
  }, [paletteCollapsed]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const paletteDragRef = useRef<{
    type: NodeType | null;
    startX: number;
    startY: number;
    dragging: boolean;
  }>({
    type: null,
    startX: 0,
    startY: 0,
    dragging: false,
  });
  const [paletteDrag, setPaletteDrag] = useState<{ type: NodeType | null; dragging: boolean }>(
    { type: null, dragging: false }
  );

  const handleCapture = async () => {
    if (!canvasRef.current || !onCaptureRequest) return;
    const container = canvasRef.current;
    await onCaptureRequest(container);
  };

  const startPaletteDrag = (type: NodeType, event: React.PointerEvent) => {
    paletteDragRef.current = {
      type,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
    };
    setPaletteDrag({ type, dragging: false });
  };

  useEffect(() => {
    if (!paletteDrag.type) return;

    const handleMove = (event: PointerEvent) => {
      const ref = paletteDragRef.current;
      if (!ref.type) return;
      const dx = event.clientX - ref.startX;
      const dy = event.clientY - ref.startY;
      const distance = Math.hypot(dx, dy);
      if (!ref.dragging && distance > 6) {
        ref.dragging = true;
        setPaletteDrag({ type: ref.type, dragging: true });
      }
    };

    const handleUp = () => {
      const ref = paletteDragRef.current;
      if (!ref.type) return;
      paletteDragRef.current = { type: null, startX: 0, startY: 0, dragging: false };
      setPaletteDrag({ type: null, dragging: false });
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [paletteDrag.type]);

  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleCanvasDrop = (type: NodeType, world: { x: number; y: number }) => {
    addNodeAt(type, { x: world.x, y: world.y });
    paletteDragRef.current = { type: null, startX: 0, startY: 0, dragging: false };
    setPaletteDrag({ type: null, dragging: false });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== "z") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      undoWorkflow();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoWorkflow]);

  useEffect(() => {
    if (
      filteredNodes.length !== nodes.length ||
      filteredEdges.length !== edges.length
    ) {
      pruneWorkflow();
    }
  }, [filteredNodes.length, filteredEdges.length, nodes.length, edges.length, pruneWorkflow]);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerCluster}>
          <WebGLTitleLogo title="Numerica" tone="numerica" />
          <div className={styles.headerSelect}>
            <span className={styles.srOnly}>Component type</span>
            <select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value as NodeType)}
              aria-label="Component type"
            >
              {nodeOptions.map((option) => (
                <option key={option.type} value={option.type}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.headerCluster}>
          <IconButton
            size="sm"
            label="Add selected node type"
            iconId="add"
            variant="primary"
            tooltip="Add selected node type"
            tooltipPosition="bottom"
            onClick={() => addNode(selectedType)}
          />
          <IconButton
            size="sm"
            label="Undo workflow action"
            iconId="undo"
            tooltip="Undo workflow action"
            tooltipPosition="bottom"
            onClick={undoWorkflow}
          />
          <IconButton
            size="sm"
            label="Prune unsupported nodes"
            iconId="prune"
            variant="ghost"
            accentColor="#ef4444"
            tooltip="Prune unsupported nodes"
            tooltipPosition="bottom"
            onClick={pruneWorkflow}
          />
          <IconButton
            size="sm"
            label="Capture workflow canvas"
            iconId="capture"
            tooltip="Capture workflow canvas"
            tooltipPosition="bottom"
            onClick={handleCapture}
            disabled={captureDisabled}
          />
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.canvas} data-panel-drag="true">
          <div className={styles.canvasViewport} ref={canvasRef}>
            <NumericalCanvas
              width={canvasSize.width}
              height={canvasSize.height}
              pendingNodeType={paletteDrag.dragging ? paletteDrag.type : null}
              onDropNode={handleCanvasDrop}
            />
          </div>
          <div
            className={styles.paletteDock}
            data-collapsed={paletteCollapsed ? "true" : "false"}
          >
            {paletteCollapsed ? (
              <WebGLButton
                type="button"
                className={styles.paletteToggle}
                label="Open node palette"
                iconId="brandNumerica"
                hideLabel
                size="sm"
                variant="icon"
                shape="square"
                tooltip="Open node palette"
                tooltipPosition="right"
                onClick={() => setPaletteCollapsed(false)}
              />
            ) : (
              <aside className={styles.palette}>
                <div className={styles.paletteHeader}>
                  <div className={styles.paletteHeaderText}>
                    <span className={styles.paletteTitle}>Node Library</span>
                    <WebGLTitleLogo
                      title="Numerica"
                      tone="numerica"
                      className={styles.paletteSubtitleLogo}
                    />
                  </div>
                  <div className={styles.paletteControls}>
                    <WebGLButton
                      type="button"
                      label="Collapse palette"
                      iconId="chevronDown"
                      hideLabel
                      size="xs"
                      variant="icon"
                      shape="square"
                      onClick={() => setPaletteCollapsed(true)}
                    />
                  </div>
                </div>
                <div className={styles.paletteGroups}>
                  {paletteSections.map((section) => (
                    <div key={section.id} className={styles.paletteSection}>
                      <div className={styles.paletteSectionHeader}>
                        <span className={styles.paletteSectionTitle}>{section.label}</span>
                        <span className={styles.paletteSectionMeta}>{section.description}</span>
                      </div>
                      <div className={styles.paletteSectionGroups}>
                        {section.groups.map((group) => {
                          const accent = NODE_CATEGORY_BY_ID.get(group.category.id)?.accent;
                          return (
                            <div key={group.category.id} className={styles.paletteGroup}>
                              <div className={styles.paletteGroupHeader}>
                                <span
                                  className={styles.paletteGroupDot}
                                  style={{ backgroundColor: accent }}
                                  aria-hidden="true"
                                />
                                <div className={styles.paletteGroupText}>
                                  <span className={styles.paletteGroupTitle}>
                                    {group.category.label}
                                  </span>
                                  <span className={styles.paletteGroupMeta}>
                                    {group.category.description}
                                  </span>
                                </div>
                              </div>
                              <div className={styles.paletteGroupGrid}>
                                {group.nodes.map((option) => {
                                  const iconId = option.iconId ?? "primitive";
                                  return (
                                    <WebGLButton
                                      key={option.type}
                                      type="button"
                                      className={styles.paletteItem}
                                      style={
                                        accent
                                          ? ({
                                              ["--palette-accent" as string]: accent,
                                            } as CSSProperties)
                                          : undefined
                                      }
                                      label={option.label}
                                      shortLabel={option.shortLabel}
                                      iconId={iconId}
                                      variant="palette"
                                      shape="square"
                                      accentColor={accent}
                                      tooltip={option.description}
                                      tooltipPosition="bottom"
                                      onPointerDown={(event) =>
                                        startPaletteDrag(option.type, event)
                                      }
                                      onClick={() => addNode(option.type)}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className={styles.parameterPanel}>
                  {selectedNodeContext ? (
                    <>
                      <div className={styles.parameterHeader}>
                        <span className={styles.parameterTitle}>
                          {selectedNodeContext.definition?.label ??
                            selectedNodeContext.node.data?.label ??
                            "Node"}
                        </span>
                        <span className={styles.parameterSubtitle}>Parameters</span>
                      </div>

                      {selectedNodeContext.definition?.parameters.length === 0 &&
                      inputParameterPorts.length === 0 ? (
                        <p className={styles.parameterEmpty}>
                          No editable parameters for this node.
                        </p>
                      ) : (
                        <div className={styles.parameterGrid}>
                          {selectedNodeContext.definition?.parameters.map((parameter) => {
                            const value =
                              selectedNodeContext.parameters[parameter.key] ??
                              parameter.defaultValue;

                            if (parameter.type === "select") {
                              const selectedValue = String(value ?? parameter.defaultValue);
                              return (
                                <label key={parameter.key} className={styles.parameterRow}>
                                  <span className={styles.parameterLabel}>{parameter.label}</span>
                                  <select
                                    className={styles.parameterControl}
                                    value={selectedValue}
                                    onChange={(event) =>
                                      setParameter(parameter.key, event.target.value)
                                    }
                                  >
                                    {parameter.options?.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              );
                            }

                            if (parameter.type === "boolean") {
                              const checked = readBoolean(value, Boolean(parameter.defaultValue));
                              return (
                                <label
                                  key={parameter.key}
                                  className={styles.parameterRowCheckbox}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) =>
                                      setParameter(parameter.key, event.target.checked)
                                    }
                                  />
                                  <span className={styles.parameterLabel}>{parameter.label}</span>
                                </label>
                              );
                            }

                            if (parameter.type === "number") {
                              const numericValue = readNumber(
                                value,
                                Number(parameter.defaultValue) || 0
                              );
                              return (
                                <label key={parameter.key} className={styles.parameterRow}>
                                  <span className={styles.parameterLabel}>{parameter.label}</span>
                                  <input
                                    className={styles.parameterControl}
                                    type="number"
                                    value={numericValue}
                                    min={parameter.min}
                                    max={parameter.max}
                                    step={parameter.step ?? 0.1}
                                    onChange={(event) => {
                                      const nextValue = Number(event.target.value);
                                      if (Number.isFinite(nextValue)) {
                                        setParameter(parameter.key, nextValue);
                                      }
                                    }}
                                  />
                                </label>
                              );
                            }

                            const stringValue = readString(
                              value,
                              String(parameter.defaultValue ?? "")
                            );
                            return (
                              <label key={parameter.key} className={styles.parameterRow}>
                                <span className={styles.parameterLabel}>{parameter.label}</span>
                                <input
                                  className={styles.parameterControl}
                                  type="text"
                                  value={stringValue}
                                  onChange={(event) =>
                                    setParameter(parameter.key, event.target.value)
                                  }
                                />
                              </label>
                            );
                          })}

                          {inputParameterPorts.map((port) => {
                            const paramKey = port.parameterKey!;
                            const rawValue =
                              selectedNodeContext.parameters[paramKey] ??
                              port.defaultValue ??
                              "";
                            const isConnected = connectedInputs.has(port.key);
                            const rowKey = `${selectedNodeContext.node.id}-${port.key}`;

                            if (port.type === "boolean") {
                              const checked = readBoolean(rawValue, false);
                              return (
                                <label key={rowKey} className={styles.parameterRowCheckbox}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={isConnected}
                                    onChange={(event) =>
                                      setParameter(paramKey, event.target.checked)
                                    }
                                  />
                                  <span className={styles.parameterLabel}>
                                    {port.label}
                                    {isConnected ? " (connected)" : ""}
                                  </span>
                                </label>
                              );
                            }

                            if (port.type === "number") {
                              const numericValue = readNumber(
                                rawValue,
                                Number(port.defaultValue) || 0
                              );
                              return (
                                <label key={rowKey} className={styles.parameterRow}>
                                  <span className={styles.parameterLabel}>
                                    {port.label}
                                    {isConnected ? " (connected)" : ""}
                                  </span>
                                  <input
                                    className={styles.parameterControl}
                                    type="number"
                                    value={numericValue}
                                    disabled={isConnected}
                                    step={0.1}
                                    onChange={(event) => {
                                      const nextValue = Number(event.target.value);
                                      if (Number.isFinite(nextValue)) {
                                        setParameter(paramKey, nextValue);
                                      }
                                    }}
                                  />
                                </label>
                              );
                            }

                            const stringValue = String(rawValue ?? "");
                            return (
                              <label key={rowKey} className={styles.parameterRow}>
                                <span className={styles.parameterLabel}>
                                  {port.label}
                                  {isConnected ? " (connected)" : ""}
                                </span>
                                <input
                                  className={styles.parameterControl}
                                  type="text"
                                  value={stringValue}
                                  disabled={isConnected}
                                  onChange={(event) =>
                                    setParameter(paramKey, parseLooseValue(event.target.value))
                                  }
                                />
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className={styles.parameterEmpty}>
                      Select a node to edit its parameters.
                    </p>
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;
