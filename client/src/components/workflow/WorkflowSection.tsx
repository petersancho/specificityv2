import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useProjectStore, type NodeType } from "../../store/useProjectStore";
import { NumericalCanvas } from "./NumericalCanvas";
import IconButton from "../ui/IconButton";
import WebGLButton from "../ui/WebGLButton";
import WebGLSlider from "../ui/WebGLSlider";
import Tooltip from "../ui/Tooltip";
import TooltipCard from "../ui/TooltipCard";
import WebGLTitleLogo from "../WebGLTitleLogo";
import { SubCategoryDropdown } from "./SubCategoryDropdown";
import { createIconSignature } from "./iconSignature";
import { arrayBufferToBase64 } from "../../utils/binary";
import { downloadBlob } from "../../utils/download";
import { normalizeHexColor } from "../../utils/color";
import { safeLocalStorageGet, safeLocalStorageSet } from "../../utils/safeStorage";
import {
  NODE_CATEGORIES,
  NODE_CATEGORY_BY_ID,
  NODE_DEFINITIONS,
  getNodeDefinition,
  resolveNodeParameters,
  resolveNodePorts,
  type NodeCategory,
} from "./nodeCatalog";
import {
  buildPanelLines,
  resolvePanelFormatOptions,
} from "./panelFormat";
import styles from "./WorkflowSection.module.css";

const STICKER_TINTS: Record<string, string> = {
  data: "#00FFFF",
  basics: "#FFFF00",
  lists: "#99FF80",
  primitives: "#FF00FF",
  curves: "#FF33FF",
  nurbs: "#00FF80",
  brep: "#3300FF",
  mesh: "#1AB3FF",
  tessellation: "#4DFFFF",
  modifiers: "#FF331A",
  transforms: "#661AFF",
  arrays: "#B2FF00",
  euclidean: "#00FF00",
  ranges: "#E6FF1A",
  signals: "#B200FF",
  analysis: "#FF0000",
  interop: "#33FFCC",
  measurement: "#FF4D66",
  voxel: "#FF6600",
  solver: "#0000FF",
  goal: "#CC1AE6",
  optimization: "#80FF00",
  math: "#FFCC00",
  logic: "#99FF33",
};

const resolveStickerTint = (categoryId?: string | null) => {
  if (!categoryId) return undefined;
  const color = STICKER_TINTS[categoryId];
  return normalizeHexColor(color) ?? undefined;
};

const nodeOptions = NODE_DEFINITIONS.filter(
  (definition) => definition.type !== "primitive"
);
const legacyNodeTypes = new Set<NodeType>(["primitive"]);

const PALETTE_COLLAPSED_KEY = "lingua.numericaPaletteCollapsed";
const CAPTURE_BACKGROUND_KEY = "lingua.numericaCaptureBackground";

type CaptureBackground = "transparent" | "white";

const PALETTE_SECTIONS: Array<{
  id: string;
  label: string;
  description: string;
  categories: NodeCategory["id"][];
}> = [
  {
    id: "geometry",
    label: "Geometry",
    description: "Primitives, curves, NURBS, BREP",
    categories: ["primitives", "curves", "nurbs", "brep", "modifiers"],
  },
  {
    id: "transform",
    label: "Transform",
    description: "Move, rotate, spatial frames",
    categories: ["transforms", "euclidean"],
  },
  {
    id: "arrays",
    label: "Arrays",
    description: "Linear, polar, grid distributions",
    categories: ["arrays"],
  },
  {
    id: "interop",
    label: "Interchange",
    description: "Import, export, mesh conversion",
    categories: ["interop"],
  },
  {
    id: "data",
    label: "Data",
    description: "Lists, ranges, analysis",
    categories: ["data", "basics", "lists", "ranges", "signals", "analysis", "measurement", "optimization"],
  },
  {
    id: "solver",
    label: "Solver",
    description: "Optimization and simulation engines",
    categories: ["solver"],
  },
  {
    id: "voxel",
    label: "Voxel",
    description: "Voxel grids and utilities",
    categories: ["voxel"],
  },
  {
    id: "logic",
    label: "Math + Logic",
    description: "Expressions, conditions",
    categories: ["math", "logic"],
  },
];

const renderParameterLabel = (label: string, description?: string) => {
  if (!description) {
    return <span className={styles.parameterLabel}>{label}</span>;
  }
  return (
    <Tooltip content={description} position="right">
      <span className={styles.parameterLabel}>{label}</span>
    </Tooltip>
  );
};

type WorkflowSectionProps = {
  onCaptureRequest?: (element: HTMLElement) => Promise<void> | void;
  captureDisabled?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
};

const WorkflowSection = ({
  onCaptureRequest,
  captureDisabled,
  isFullscreen = false,
  onToggleFullscreen,
}: WorkflowSectionProps) => {
  const [selectedType, setSelectedType] = useState<NodeType>("number");
  const [nodeQuery, setNodeQuery] = useState("");
  const nodeSearchRef = useRef<HTMLInputElement>(null);
  const parameterPanelRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const nodes = useProjectStore((state) => state.workflow.nodes);
  const edges = useProjectStore((state) => state.workflow.edges);
  const addNodeAt = useProjectStore((state) => state.addNodeAt);
  const pruneWorkflow = useProjectStore((state) => state.pruneWorkflow);
  const undoWorkflow = useProjectStore((state) => state.undoWorkflow);
  const updateNodeData = useProjectStore((state) => state.updateNodeData);
  const [paletteCollapsed, setPaletteCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return safeLocalStorageGet(PALETTE_COLLAPSED_KEY) === "true";
  });
  const [captureBackground] = useState<CaptureBackground>(() => {
    if (typeof window === "undefined") return "transparent";
    const stored = safeLocalStorageGet(CAPTURE_BACKGROUND_KEY);
    return stored === "white" ? "white" : "transparent";
  });
  const [captureMode, setCaptureMode] = useState<CaptureBackground | null>(null);
  const paletteRef = useRef<HTMLElement | null>(null);
  const [pendingNodeType, setPendingNodeType] = useState<NodeType | null>(null);
  const canvasHoverRef = useRef(false);

  const supportedTypes = useMemo(() => {
    const next = new Set(nodeOptions.map((option) => option.type));
    legacyNodeTypes.forEach((type) => next.add(type));
    return next;
  }, []);
  const filteredNodes = useMemo(
    () =>
      nodes.filter(
        (node) => !node.type || supportedTypes.has(node.type as NodeType)
      ),
    [nodes, supportedTypes]
  );

  const paletteTooltipByType = useMemo(() => {
    const map = new Map<string, ReactNode>();
    nodeOptions.forEach((definition) => {
      const category = NODE_CATEGORY_BY_ID.get(definition.category);
      const description = definition.display?.description ?? definition.description;
      const semantic = category?.description;
      const translation =
        definition.display?.nameEnglish &&
        definition.display?.nameGreek &&
        definition.display.nameEnglish !== definition.label
          ? definition.display.nameEnglish
          : undefined;
      map.set(
        definition.type,
        <TooltipCard
          title={definition.label}
          subtitle={translation}
          kindLabel="Numerica Node"
          categoryLabel={category?.label ?? definition.category}
          semantic={semantic}
          description={description}
          href={`#/docs/numerica/${encodeURIComponent(definition.type)}`}
          accentColor={category?.accent}
        />
      );
    });
    return map;
  }, []);
  const solverInputCategory = useMemo(() => {
    const buildNode = (type: NodeType) => {
      const definition = getNodeDefinition(type);
      if (!definition) return null;
      return {
        type,
        iconId: definition.iconId,
        nameGreek: definition.display?.nameGreek ?? definition.label,
        nameEnglish: definition.display?.nameEnglish ?? definition.label,
        romanization: definition.display?.romanization,
        description: definition.display?.description ?? definition.description,
      };
    };
    const physicsNodes = [
      "stiffnessGoal",
      "volumeGoal",
      "loadGoal",
      "anchorGoal",
    ]
      .map((type) => buildNode(type as NodeType))
      .filter((node): node is NonNullable<ReturnType<typeof buildNode>> => Boolean(node));
    const biologicalNodes = [
      "growthGoal",
      "nutrientGoal",
      "morphogenesisGoal",
      "homeostasisGoal",
    ]
      .map((type) => buildNode(type as NodeType))
      .filter((node): node is NonNullable<ReturnType<typeof buildNode>> => Boolean(node));
    const chemistryNodes = [
      "chemistryMaterialGoal",
      "chemistryStiffnessGoal",
      "chemistryMassGoal",
      "chemistryBlendGoal",
      "chemistryTransparencyGoal",
      "chemistryThermalGoal",
    ]
      .map((type) => buildNode(type as NodeType))
      .filter((node): node is NonNullable<ReturnType<typeof buildNode>> => Boolean(node));

    return {
      nameGreek: "Ἐπιλύτου Εἰσαγωγαί",
      translation: "Solver Inputs",
      romanization: "Epilýtou Eisagōgaí",
      description: "Goal nodes that define optimization objectives for solvers.",
      subSubCategories: [
        { name: "Physics Goals", nodes: physicsNodes },
        { name: "Biological Goals", nodes: biologicalNodes },
        { name: "Chemistry Goals", nodes: chemistryNodes },
        { name: "Voxel Goals", nodes: [] },
      ],
    };
  }, []);
  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((node) => node.id));
    return edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );
  }, [edges, filteredNodes]);

  const paletteSections = useMemo(() => {
    const normalizedQuery = nodeQuery.trim().toLowerCase();
    const paletteDefinitions =
      normalizedQuery.length === 0
        ? nodeOptions
        : nodeOptions.filter((definition) => {
            const categoryLabel =
              NODE_CATEGORY_BY_ID.get(definition.category)?.label.toLowerCase() ?? "";
            const haystack = [
              definition.label,
              definition.shortLabel,
              definition.description,
              definition.type,
              categoryLabel,
            ]
              .filter(Boolean)
              .map((value) => String(value).toLowerCase())
              .join(" ");
            return haystack.includes(normalizedQuery);
          });
    const groupMap = new Map<NodeCategory["id"], typeof nodeOptions>();
    paletteDefinitions.forEach((definition) => {
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
      if (category.id === "goal") return null;
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
  }, [nodeQuery]);

  const normalizedQuery = nodeQuery.trim().toLowerCase();
  const filteredNodeOptions = useMemo(() => {
    if (normalizedQuery.length === 0) return nodeOptions;
    return nodeOptions.filter((definition) => {
      const categoryLabel =
        NODE_CATEGORY_BY_ID.get(definition.category)?.label.toLowerCase() ?? "";
      const haystack = [
        definition.label,
        definition.shortLabel,
        definition.description,
        definition.type,
        categoryLabel,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .join(" ");
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery]);
  const searchPrimaryOption =
    normalizedQuery.length === 0 ? null : filteredNodeOptions[0] ?? null;

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

  const inputParameterKeys = useMemo(() => {
    if (!selectedNodeContext) return new Set<string>();
    return new Set(
      selectedNodeContext.ports.inputs
        .map((port) => port.parameterKey)
        .filter((key): key is string => Boolean(key))
    );
  }, [selectedNodeContext]);

  const editableParameters = useMemo(() => {
    if (!selectedNodeContext?.definition) return [];
    const params = selectedNodeContext.parameters ?? {};
    return selectedNodeContext.definition.parameters.filter((parameter) => {
      if (inputParameterKeys.has(parameter.key)) return false;
      if (parameter.enabled && !parameter.enabled(params)) return false;
      return true;
    });
  }, [selectedNodeContext, inputParameterKeys]);

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

  const setParameter = (key: string, value: unknown) => {
    if (!selectedNodeContext) return;
    updateNodeData(selectedNodeContext.node.id, {
      parameters: {
        [key]: value,
      },
    });
  };

  const handleRequestNodeSettings = (_nodeId: string) => {
    const panel = parameterPanelRef.current;
    if (!panel) return;
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const panelExportText = useMemo(() => {
    if (!selectedNodeContext || selectedNodeContext.node.type !== "panel") return "";
    const outputs = selectedNodeContext.node.data?.outputs ?? {};
    const fallback =
      typeof selectedNodeContext.parameters.text === "string"
        ? selectedNodeContext.parameters.text
        : "";
    const value = outputs.data ?? (fallback.length > 0 ? fallback : null);
    const options = resolvePanelFormatOptions(selectedNodeContext.parameters ?? {});
    return buildPanelLines(value, options).join("\n");
  }, [selectedNodeContext]);

  const panelFilename = useMemo(() => {
    if (!selectedNodeContext || selectedNodeContext.node.type !== "panel") {
      return "panel-output.txt";
    }
    const base =
      selectedNodeContext.node.data?.label ??
      selectedNodeContext.definition?.label ??
      "panel";
    const slug = base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const idSuffix = selectedNodeContext.node.id.slice(0, 6);
    const name = slug.length > 0 ? slug : "panel";
    return `${name}-${idSuffix}.txt`;
  }, [selectedNodeContext]);

  const copyPanelText = async () => {
    if (!panelExportText) return;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(panelExportText);
        return;
      } catch {
        // fall back to execCommand
      }
    }
    if (typeof document === "undefined") return;
    const textarea = document.createElement("textarea");
    textarea.value = panelExportText;
    textarea.style.position = "fixed";
    textarea.style.left = "-1000px";
    textarea.style.top = "-1000px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const exportPanelText = () => {
    if (!panelExportText) return;
    downloadBlob(new Blob([panelExportText], { type: "text/plain" }), panelFilename);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    safeLocalStorageSet(PALETTE_COLLAPSED_KEY, String(paletteCollapsed));
  }, [paletteCollapsed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    safeLocalStorageSet(CAPTURE_BACKGROUND_KEY, captureBackground);
  }, [captureBackground]);

  useEffect(() => {
    if (paletteCollapsed) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (paletteRef.current?.contains(target)) return;
      setPaletteCollapsed(true);
    };
    document.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, { capture: true });
    };
  }, [paletteCollapsed]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    node.dataset.captureBackground = captureBackground;
  }, [captureBackground]);

  const beginNodePlacement = (
    type: NodeType,
    event?: React.PointerEvent | React.MouseEvent
  ) => {
    setPaletteCollapsed(true);
    setPendingNodeType(type);
    if (event) {
      event.preventDefault();
    }
  };

  const handleCapture = async () => {
    if (!canvasRef.current || !onCaptureRequest) return;
    const container = canvasRef.current;
    const mode = captureBackground;
    setCaptureMode(mode);
    container.dataset.captureBackground = mode;
    const nextFrame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await nextFrame();
    await nextFrame();
    try {
      await onCaptureRequest(container);
    } finally {
      setCaptureMode(null);
    }
  };

  const handleAddType = (type: NodeType, event?: React.MouseEvent) => {
    beginNodePlacement(type, event);
    setSelectedType(type);
  };

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setCanvasSize((prev) =>
        prev.width === rect.width && prev.height === rect.height
          ? prev
          : { width: rect.width, height: rect.height }
      );
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleCanvasDrop = (type: NodeType, world: { x: number; y: number }) => {
    addNodeAt(type, { x: world.x, y: world.y });
    setPendingNodeType(null);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== "z") return;
      const section = sectionRef.current;
      if (section) {
        const targetNode = event.target instanceof Node ? event.target : null;
        const activeNode =
          document.activeElement instanceof Node ? document.activeElement : null;
        if (
          (!targetNode || !section.contains(targetNode)) &&
          (!activeNode || !section.contains(activeNode))
        ) {
          return;
        }
      }
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
    const isEditableElement = (element: HTMLElement | null) =>
      Boolean(
        element &&
          (element.tagName === "INPUT" ||
            element.tagName === "TEXTAREA" ||
            element.isContentEditable)
      );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canvasHoverRef.current) return;
      if (event.defaultPrevented) return;
      if (event.isComposing) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key.length !== 1 || event.key === " ") return;
      const target = event.target as HTMLElement | null;
      const activeElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (isEditableElement(target) || isEditableElement(activeElement)) {
        return;
      }
      const input = nodeSearchRef.current;
      if (!input || input.disabled || input.readOnly) return;
      event.preventDefault();
      setNodeQuery((prev) => `${prev}${event.key}`);
      input.focus({ preventScroll: true });
      requestAnimationFrame(() => {
        if (!nodeSearchRef.current) return;
        const length = nodeSearchRef.current.value.length;
        nodeSearchRef.current.setSelectionRange(length, length);
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setNodeQuery]);

  useEffect(() => {
    if (
      filteredNodes.length !== nodes.length ||
      filteredEdges.length !== edges.length
    ) {
      pruneWorkflow();
    }
  }, [filteredNodes.length, filteredEdges.length, nodes.length, edges.length, pruneWorkflow]);

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      data-fullscreen={isFullscreen ? "true" : "false"}
    >
      <div className={styles.header}>
        <div className={styles.headerCluster}>
          <WebGLTitleLogo title="Numerica" tone="numerica" />
          <div className={styles.headerSearch}>
            <span className={styles.srOnly}>Search nodes</span>
            <input
              ref={nodeSearchRef}
              className={styles.headerSearchInput}
              type="search"
              placeholder="Search nodes…"
              value={nodeQuery}
              onChange={(event) => setNodeQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchPrimaryOption) {
                  event.preventDefault();
                  handleAddType(searchPrimaryOption.type);
                }
              }}
              aria-label="Search nodes"
            />
            <span className={styles.headerSearchMeta} aria-live="polite">
              {normalizedQuery.length === 0
                ? "Type to search"
                : searchPrimaryOption
                  ? `Add: ${searchPrimaryOption.label}`
                  : "No matches"}
            </span>
          </div>
        </div>
        <div className={styles.headerCluster}>
          {onToggleFullscreen && (
            <IconButton
              size="sm"
              label={isFullscreen ? "Exit full screen" : "Enter full screen"}
              iconId={isFullscreen ? "close" : "frameAll"}
              tooltip={isFullscreen ? "Exit full screen" : "Full screen"}
              tooltipPosition="bottom"
              onClick={onToggleFullscreen}
            />
          )}
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.canvas} data-panel-drag="true">
          <div
            className={styles.canvasViewport}
            ref={canvasRef}
            onPointerEnter={() => {
              canvasHoverRef.current = true;
            }}
            onPointerLeave={() => {
              canvasHoverRef.current = false;
            }}
          >
            <NumericalCanvas
              width={canvasSize.width}
              height={canvasSize.height}
              pendingNodeType={pendingNodeType}
              onDropNode={handleCanvasDrop}
              onRequestNodeSettings={handleRequestNodeSettings}
              captureMode={captureMode}
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
              <aside className={styles.palette} ref={paletteRef}>
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
                                  const tooltipContent = paletteTooltipByType.get(option.type);
                                  const hasTooltipContent = Boolean(tooltipContent);
                                  const stickerTint = resolveStickerTint(option.category);
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
                                      iconId={iconId}
                                      iconStyle="sticker"
                                      iconTintOverride={stickerTint}
                                      iconSignature={createIconSignature(option.type)}
                                      hideLabel
                                      variant="palette"
                                      shape="square"
                                      accentColor={accent}
                                      tooltip={tooltipContent ?? option.description}
                                      tooltipPosition="bottom"
                                      tooltipMaxWidth={hasTooltipContent ? 300 : undefined}
                                      tooltipInteractive={hasTooltipContent}
                                      onPointerDown={(event) =>
                                        beginNodePlacement(option.type, event)
                                      }
                                      onClick={(event) => handleAddType(option.type, event)}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {section.id === "solver" && (
                        <SubCategoryDropdown
                          subCategory={solverInputCategory}
                          onSelectNode={(type, event) => {
                            beginNodePlacement(type, event);
                            setSelectedType(type);
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className={styles.parameterPanel} ref={parameterPanelRef}>
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

                      {editableParameters.length === 0 ? (
                        <p className={styles.parameterEmpty}>
                          No editable parameters for this node.
                        </p>
                      ) : (
                        <div className={styles.parameterGrid}>
                          {editableParameters.map((parameter) => {
                            const value =
                              selectedNodeContext.parameters[parameter.key] ??
                              parameter.defaultValue;

                            if (parameter.type === "file") {
                              return (
                                <label key={parameter.key} className={styles.parameterRow}>
                                  {renderParameterLabel(
                                    parameter.label,
                                    parameter.description
                                  )}
                                  <input
                                    className={styles.parameterControl}
                                    type="file"
                                    accept={parameter.accept}
                                    onChange={async (event) => {
                                      const file = event.target.files?.[0];
                                      if (!file) return;
                                      const buffer = await file.arrayBuffer();
                                      const payload = {
                                        name: file.name,
                                        type: file.type,
                                        data: arrayBufferToBase64(buffer),
                                      };
                                      if (
                                        selectedNodeContext?.node.type === "stlImport" &&
                                        parameter.key === "file"
                                      ) {
                                        updateNodeData(selectedNodeContext.node.id, {
                                          parameters: {
                                            file: payload,
                                            importNow: true,
                                          },
                                        });
                                      } else {
                                        setParameter(parameter.key, payload);
                                      }
                                    }}
                                  />
                                </label>
                              );
                            }

                            if (parameter.type === "select") {
                              const selectedValue = String(value ?? parameter.defaultValue);
                              return (
                                <label key={parameter.key} className={styles.parameterRow}>
                                  {renderParameterLabel(
                                    parameter.label,
                                    parameter.description
                                  )}
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
                                  {renderParameterLabel(
                                    parameter.label,
                                    parameter.description
                                  )}
                                </label>
                              );
                            }

                            if (parameter.type === "textarea") {
                              const stringValue = readString(
                                value,
                                String(parameter.defaultValue ?? "")
                              );
                              return (
                                <label key={parameter.key} className={styles.parameterRow}>
                                  {renderParameterLabel(
                                    parameter.label,
                                    parameter.description
                                  )}
                                  <textarea
                                    className={`${styles.parameterControl} ${styles.parameterTextArea}`}
                                    value={stringValue}
                                    rows={4}
                                    onChange={(event) =>
                                      setParameter(parameter.key, event.target.value)
                                    }
                                  />
                                </label>
                              );
                            }

                            if (parameter.type === "color") {
                              const stringValue = readString(
                                value,
                                String(parameter.defaultValue ?? "#2EA3A8")
                              );
                              const fallbackHex =
                                normalizeHexColor(
                                  String(parameter.defaultValue ?? "#2EA3A8")
                                ) ?? "#2EA3A8";
                              const normalized =
                                normalizeHexColor(stringValue) ?? fallbackHex;
                              return (
                                <label key={parameter.key} className={styles.parameterRow}>
                                  {renderParameterLabel(
                                    parameter.label,
                                    parameter.description
                                  )}
                                  <div className={styles.parameterColorRow}>
                                    <input
                                      className={styles.parameterColorInput}
                                      type="color"
                                      value={normalized}
                                      onChange={(event) =>
                                        setParameter(parameter.key, event.target.value)
                                      }
                                    />
                                    <input
                                      className={`${styles.parameterControl} ${styles.parameterColorValue}`}
                                      type="text"
                                      value={stringValue}
                                      onChange={(event) =>
                                        setParameter(parameter.key, event.target.value)
                                      }
                                    />
                                  </div>
                                </label>
                              );
                            }

                            if (parameter.type === "slider") {
                              const currentValue = readNumber(
                                value,
                                Number(parameter.defaultValue) || 0
                              );
                              const rawMin = readNumber(
                                (parameter.minKey
                                  ? selectedNodeContext.parameters[parameter.minKey]
                                  : undefined) ?? parameter.min ?? 0,
                                parameter.min ?? 0
                              );
                              const rawMax = readNumber(
                                (parameter.maxKey
                                  ? selectedNodeContext.parameters[parameter.maxKey]
                                  : undefined) ?? parameter.max ?? rawMin + 1,
                                parameter.max ?? rawMin + 1
                              );
                              const minValue = Math.min(rawMin, rawMax);
                              const maxValue = Math.max(rawMin, rawMax);
                              const rawStep = readNumber(
                                (parameter.stepKey
                                  ? selectedNodeContext.parameters[parameter.stepKey]
                                  : undefined) ?? parameter.step ?? 0.01,
                                parameter.step ?? 0.01
                              );
                              const stepValue = rawStep > 0 ? rawStep : 0.01;
                              const clampedValue = Math.min(
                                maxValue,
                                Math.max(minValue, currentValue)
                              );

                              return (
                                <div
                                  key={parameter.key}
                                  className={`${styles.parameterRow} ${styles.parameterRowSlider}`}
                                >
                                  {renderParameterLabel(
                                    parameter.label,
                                    parameter.description
                                  )}
                                  <div className={styles.parameterSliderWrap}>
                                    <WebGLSlider
                                      label={parameter.label}
                                      tooltip={`${parameter.label}: ${clampedValue}`}
                                      value={clampedValue}
                                      min={minValue}
                                      max={maxValue}
                                      step={stepValue}
                                      onChange={(next) => setParameter(parameter.key, next)}
                                      className={styles.parameterSlider}
                                    />
                                    <input
                                      className={`${styles.parameterControl} ${styles.parameterSliderInput}`}
                                      type="number"
                                      value={clampedValue}
                                      min={minValue}
                                      max={maxValue}
                                      step={stepValue}
                                      onChange={(event) => {
                                        const nextValue = Number(event.target.value);
                                        if (Number.isFinite(nextValue)) {
                                          setParameter(parameter.key, nextValue);
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            }

                            if (parameter.type === "number") {
                              const numericValue = readNumber(
                                value,
                                Number(parameter.defaultValue) || 0
                              );
                              return (
                                <label key={parameter.key} className={styles.parameterRow}>
                                  {renderParameterLabel(
                                    parameter.label,
                                    parameter.description
                                  )}
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
                                {renderParameterLabel(
                                  parameter.label,
                                  parameter.description
                                )}
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

                        </div>
                      )}

                      {selectedNodeContext.node.type === "panel" ? (
                        <div className={styles.parameterActions}>
                          <WebGLButton
                            type="button"
                            label="Copy"
                            iconId="copy"
                            size="sm"
                            variant="secondary"
                            onClick={() => void copyPanelText()}
                            disabled={!panelExportText}
                          />
                          <WebGLButton
                            type="button"
                            label="Export"
                            iconId="download"
                            size="sm"
                            variant="secondary"
                            onClick={exportPanelText}
                            disabled={!panelExportText}
                          />
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className={styles.parameterEmpty}>
                      Select a node to edit its parameters.
                    </p>
                  )}
                </div>
                <div className={styles.paletteFooter}>
                  <WebGLButton
                    type="button"
                    label="Screenshot"
                    iconId="capture"
                    hideLabel
                    size="sm"
                    variant="icon"
                    shape="square"
                    tooltip="Screenshot"
                    tooltipPosition="top"
                    onClick={handleCapture}
                    disabled={captureDisabled}
                  />
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
