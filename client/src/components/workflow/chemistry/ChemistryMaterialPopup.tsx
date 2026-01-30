import { useEffect, useMemo, useState, useCallback, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import WebGLButton from "../../ui/WebGLButton";
import WorkflowGeometryViewer from "../WorkflowGeometryViewer";
import { useProjectStore } from "../../../store/useProjectStore";
import {
  CHEMISTRY_MATERIAL_DATABASE,
  getMaterialsByCategory,
  CATEGORY_INFO,
  type ChemistryMaterialSpec,
  type ChemistryMaterialCategory,
} from "../../../data/chemistryMaterials";
import {
  getNodeDefinition,
  resolveNodeParameters,
  resolveNodePorts,
} from "../nodeCatalog";
import styles from "./ChemistryMaterialPopup.module.css";
import type { WorkflowNode, Geometry } from "../../../types";

type ChemistryMaterialPopupProps = {
  nodeId: string;
  onClose: () => void;
};

const MATERIAL_DESCRIPTION =
  "Assign material species to each geometry input. Materials will display with their characteristic colors in the preview viewport. The Chemistry Solver will diffuse, blend, and fuse them into a functionally graded field.";

const POPUP_ICON_STYLE = "sticker2";

const buildAssignmentMap = (value: unknown) => {
  if (!value) return {} as Record<string, string>;
  if (Array.isArray(value)) {
    const map: Record<string, string> = {};
    value.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const candidate = entry as Record<string, unknown>;
      const geometryId =
        typeof candidate.geometryId === "string"
          ? candidate.geometryId
          : typeof candidate.geometry === "string"
            ? candidate.geometry
            : typeof candidate.geometryID === "string"
              ? candidate.geometryID
              : null;
      const material =
        typeof candidate.material === "string"
          ? candidate.material
          : typeof candidate.materialName === "string"
            ? candidate.materialName
            : typeof candidate.name === "string"
              ? candidate.name
              : null;
      if (geometryId && material) {
        map[geometryId] = material;
      }
    });
    return map;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.entries(record).reduce<Record<string, string>>((acc, [key, val]) => {
      if (typeof val === "string") acc[key] = val;
      return acc;
    }, {});
  }
  return {} as Record<string, string>;
};

const buildMaterialsText = (assignments: Record<string, string>) => {
  const grouped = new Map<string, Set<string>>();
  Object.entries(assignments).forEach(([geometryId, material]) => {
    const trimmedMaterial = material.trim();
    const trimmedGeometry = geometryId.trim();
    if (!trimmedMaterial || !trimmedGeometry) return;
    const group = grouped.get(trimmedMaterial) ?? new Set<string>();
    group.add(trimmedGeometry);
    grouped.set(trimmedMaterial, group);
  });
  if (grouped.size === 0) return "";
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([material, ids]) => `${material}: ${Array.from(ids).sort().join(" ")}`)
    .join("\n");
};

const resolveGeometryOutputKey = (node: Pick<WorkflowNode, "type" | "data">) => {
  if (!node.type) return null;
  const parameters = resolveNodeParameters(node);
  const ports = resolveNodePorts(node, parameters);
  const definition = getNodeDefinition(node.type);
  const primary = definition?.primaryOutputKey;
  if (
    primary &&
    ports.outputs.some((port) => port.key === primary && port.type === "geometry")
  ) {
    return primary;
  }
  return ports.outputs.find((port) => port.type === "geometry")?.key ?? null;
};

const getMaterialSpec = (name: string): ChemistryMaterialSpec | null => {
  const normalized = name.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const key = Object.keys(CHEMISTRY_MATERIAL_DATABASE).find(
    (k) => k.toLowerCase() === normalized
  );
  return key ? CHEMISTRY_MATERIAL_DATABASE[key] : null;
};

const colorToHex = (color: [number, number, number]) => {
  const r = Math.round(color[0] * 255).toString(16).padStart(2, "0");
  const g = Math.round(color[1] * 255).toString(16).padStart(2, "0");
  const b = Math.round(color[2] * 255).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
};

const colorToRgbString = (color: [number, number, number]) => {
  return `rgb(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)})`;
};

type MaterialCardProps = {
  material: ChemistryMaterialSpec;
  isSelected: boolean;
  onClick: () => void;
};

const MaterialCard = ({ material, isSelected, onClick }: MaterialCardProps) => {
  const categoryInfo = CATEGORY_INFO[material.category];
  
  return (
    <button
      className={`${styles.materialCard} ${isSelected ? styles.materialCardSelected : ""}`}
      onClick={onClick}
      title={material.description}
    >
      <div
        className={styles.materialSwatch}
        style={{ backgroundColor: colorToRgbString(material.color) }}
      />
      <div className={styles.materialInfo}>
        <div className={styles.materialName}>{material.name}</div>
        <div
          className={styles.materialCategory}
          style={{ color: categoryInfo.color }}
        >
          {categoryInfo.label}
        </div>
      </div>
      {isSelected && <div className={styles.checkmark}>✓</div>}
    </button>
  );
};

type MaterialPropertiesProps = {
  material: ChemistryMaterialSpec | null;
};

const MaterialProperties = ({ material }: MaterialPropertiesProps) => {
  if (!material) {
    return (
      <div className={styles.propertiesEmpty}>
        Select a material to view properties
      </div>
    );
  }

  const formatNumber = (value: number, decimals = 2) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(decimals)} GPa`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(decimals)} MPa`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(decimals)} kPa`;
    return `${value.toFixed(decimals)}`;
  };

  const properties = [
    { label: "Density", value: `${material.density.toLocaleString()} kg/m³`, icon: "◆" },
    { label: "Stiffness (E)", value: formatNumber(material.stiffness), icon: "▸" },
    { label: "Thermal Cond.", value: `${material.thermalConductivity} W/(m·K)`, icon: "◈" },
    { label: "Optical Trans.", value: `${(material.opticalTransmission * 100).toFixed(0)}%`, icon: "◎" },
    { label: "Diffusivity", value: material.diffusivity.toFixed(2), icon: "◉" },
  ];

  return (
    <div className={styles.propertiesPanel}>
      <div className={styles.propertiesHeader}>
        <div
          className={styles.propertiesColorBlock}
          style={{ backgroundColor: colorToRgbString(material.color) }}
        />
        <div>
          <div className={styles.propertiesTitle}>{material.name}</div>
          <div className={styles.propertiesCategory}>
            {CATEGORY_INFO[material.category].label}
          </div>
        </div>
      </div>
      <p className={styles.propertiesDescription}>{material.description}</p>
      <div className={styles.propertiesGrid}>
        {properties.map((prop) => (
          <div key={prop.label} className={styles.propertyRow}>
            <span className={styles.propertyIcon}>{prop.icon}</span>
            <span className={styles.propertyLabel}>{prop.label}</span>
            <span className={styles.propertyValue}>{prop.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChemistryMaterialPopup = ({ nodeId, onClose }: ChemistryMaterialPopupProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [uiScale, setUiScale] = useState(0.9);
  const [activeCategory, setActiveCategory] = useState<ChemistryMaterialCategory | "all">("all");
  const [selectedGeometryId, setSelectedGeometryId] = useState<string | null>(null);
  const [hoveredMaterial, setHoveredMaterial] = useState<string | null>(null);
  const scalePercent = Math.round(uiScale * 100);
  
  const nodes = useProjectStore((state) => state.workflow.nodes);
  const edges = useProjectStore((state) => state.workflow.edges);
  const geometry = useProjectStore((state) => state.geometry);
  const sceneNodes = useProjectStore((state) => state.sceneNodes);
  const updateNodeData = useProjectStore((state) => state.updateNodeData);
  const updateGeometryMetadata = useProjectStore((state) => state.updateGeometryMetadata);

  const nodesById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const geometryById = useMemo(
    () => new Map(geometry.map((item) => [item.id, item])),
    [geometry]
  );
  const geometryLabelById = useMemo(() => {
    const map = new Map<string, string>();
    sceneNodes.forEach((node) => {
      if (node.geometryId) map.set(node.geometryId, node.name);
    });
    geometry.forEach((item) => {
      if (!map.has(item.id)) map.set(item.id, item.id);
    });
    return map;
  }, [sceneNodes, geometry]);

  const materialNode = nodesById.get(nodeId);
  const assignmentMap = useMemo(
    () => buildAssignmentMap(materialNode?.data?.parameters?.assignments),
    [materialNode]
  );

  const solverConnection = useMemo(() => {
    if (!materialNode) return null;
    const outgoing = edges.filter((edge) => edge.source === materialNode.id);
    for (const edge of outgoing) {
      const targetNode = nodesById.get(edge.target);
      if (targetNode?.type === "chemistrySolver") {
        return { edge, node: targetNode };
      }
    }
    return null;
  }, [edges, materialNode, nodesById]);

  const solverNode = solverConnection?.node ?? null;
  const solverGeometryId = useMemo(() => {
    if (!solverNode) return null;
    const outputs = solverNode.data?.outputs ?? {};
    const geometryOutputKey = resolveGeometryOutputKey(solverNode);
    const outputValue =
      geometryOutputKey && typeof outputs[geometryOutputKey] === "string"
        ? (outputs[geometryOutputKey] as string)
        : null;
    if (outputValue) return outputValue;
    return typeof solverNode.data?.geometryId === "string" ? solverNode.data.geometryId : null;
  }, [solverNode]);

  const connectedGeometryIds = useMemo(() => {
    const ids = new Set<string>();
    if (!solverNode) {
      Object.keys(assignmentMap).forEach((id) => ids.add(id));
      return Array.from(ids);
    }
    const solverEdges = edges.filter((edge) => edge.target === solverNode.id);
    solverEdges.forEach((edge) => {
      const targetHandle = edge.targetHandle ?? "";
      if (!["domain", "materials", "seeds"].includes(targetHandle)) return;
      const sourceNode = nodesById.get(edge.source);
      if (!sourceNode) return;
      const outputKey = edge.sourceHandle ?? resolveGeometryOutputKey(sourceNode);
      const beforeSize = ids.size;
      if (outputKey) {
        const outputValue = sourceNode.data?.outputs?.[outputKey];
        const collect = (value: unknown) => {
          if (typeof value === "string" && geometryById.has(value)) {
            ids.add(value);
            return;
          }
          if (Array.isArray(value)) {
            value.forEach((entry) => collect(entry));
          }
        };
        collect(outputValue);
      }
      if (ids.size === beforeSize && typeof sourceNode.data?.geometryId === "string") {
        ids.add(sourceNode.data.geometryId);
      }
    });
    Object.keys(assignmentMap).forEach((id) => ids.add(id));
    return Array.from(ids);
  }, [assignmentMap, edges, geometryById, nodesById, solverNode]);

  const rows = useMemo(() => {
    return connectedGeometryIds
      .map((id) => ({
        id,
        name: geometryLabelById.get(id) ?? id,
        material: assignmentMap[id] ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [connectedGeometryIds, geometryLabelById, assignmentMap]);

  // Update geometry metadata with material colors for live preview
  const updateGeometryColors = useCallback((assignments: Record<string, string>) => {
    Object.entries(assignments).forEach(([geometryId, materialName]) => {
      const spec = getMaterialSpec(materialName);
      if (spec && geometryById.has(geometryId)) {
        updateGeometryMetadata(geometryId, {
          customMaterial: {
            color: spec.color,
            hex: colorToHex(spec.color),
          },
        });
      }
    });
  }, [geometryById, updateGeometryMetadata]);

  const handleAssignmentChange = useCallback((geometryId: string, material: string | null) => {
    const next = { ...assignmentMap };
    if (!material) {
      delete next[geometryId];
      // Clear material color
      if (geometryById.has(geometryId)) {
        updateGeometryMetadata(geometryId, { customMaterial: undefined });
      }
    } else {
      next[geometryId] = material;
      // Update material color
      const spec = getMaterialSpec(material);
      if (spec && geometryById.has(geometryId)) {
        updateGeometryMetadata(geometryId, {
          customMaterial: {
            color: spec.color,
            hex: colorToHex(spec.color),
          },
        });
      }
    }
    updateNodeData(nodeId, { parameters: { assignments: next } });
  }, [assignmentMap, geometryById, nodeId, updateGeometryMetadata, updateNodeData]);

  // Initialize colors on mount
  useEffect(() => {
    updateGeometryColors(assignmentMap);
  }, []);

  const materialsByCategory = useMemo(() => getMaterialsByCategory(), []);
  
  const filteredMaterials = useMemo(() => {
    if (activeCategory === "all") {
      return Object.values(CHEMISTRY_MATERIAL_DATABASE);
    }
    return materialsByCategory.get(activeCategory) ?? [];
  }, [activeCategory, materialsByCategory]);

  const selectedMaterialSpec = useMemo(() => {
    if (!selectedGeometryId) return null;
    const materialName = assignmentMap[selectedGeometryId];
    if (!materialName) return hoveredMaterial ? getMaterialSpec(hoveredMaterial) : null;
    return getMaterialSpec(materialName);
  }, [selectedGeometryId, assignmentMap, hoveredMaterial]);

  const displayedMaterialSpec = useMemo(() => {
    if (hoveredMaterial) return getMaterialSpec(hoveredMaterial);
    return selectedMaterialSpec;
  }, [hoveredMaterial, selectedMaterialSpec]);

  const materialsText =
    typeof materialNode?.data?.outputs?.materialsText === "string"
      ? (materialNode.data.outputs.materialsText as string)
      : buildMaterialsText(assignmentMap);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Auto-select first geometry if none selected
  useEffect(() => {
    if (!selectedGeometryId && rows.length > 0) {
      setSelectedGeometryId(rows[0].id);
    }
  }, [rows, selectedGeometryId]);

  const categories: Array<{ id: ChemistryMaterialCategory | "all"; label: string }> = [
    { id: "all", label: "All" },
    { id: "metal", label: "Metals" },
    { id: "ceramic", label: "Ceramics" },
    { id: "glass", label: "Glass" },
    { id: "polymer", label: "Polymers" },
    { id: "composite", label: "Composites" },
    { id: "natural", label: "Natural" },
    { id: "advanced", label: "Advanced" },
  ];

  const panel = (
    <div
      className={`${styles.panel} ${isMinimized ? styles.panelMinimized : ""}`}
      style={{ ["--solver-scale" as string]: uiScale.toString() } as CSSProperties}
      onClick={(event) => event.stopPropagation()}
    >
      <div className={styles.panelContent}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Material Assignment Dashboard</div>
            <div className={styles.subtitle}>Ἐπιλύτης Χημείας · Chemistry Solver</div>
            <p className={styles.description}>{MATERIAL_DESCRIPTION}</p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.scaleControl} title="Scale the popup UI">
              <span className={styles.scaleLabel}>Scale</span>
              <input
                className={styles.scaleRange}
                type="range"
                min={0.5}
                max={1.05}
                step={0.05}
                value={uiScale}
                onChange={(event) => setUiScale(Number(event.target.value))}
              />
              <span className={styles.scaleValue}>{scalePercent}%</span>
            </div>
            <WebGLButton
              className={styles.minimizeButton}
              onClick={() => setIsMinimized((prev) => !prev)}
              label={isMinimized ? "Restore" : "Minimize"}
              iconId={isMinimized ? "show" : "hide"}
              iconStyle={POPUP_ICON_STYLE}
              variant="ghost"
              shape="rounded"
              hideLabel
              tooltip={isMinimized ? "Restore popup" : "Minimize popup"}
              title={isMinimized ? "Restore popup" : "Minimize popup"}
            />
            <WebGLButton
              className={styles.closeButton}
              onClick={onClose}
              label="Close"
              iconId="close"
              iconStyle={POPUP_ICON_STYLE}
              variant="ghost"
              shape="rounded"
              hideLabel
              tooltip="Close popup"
              title="Close popup"
            />
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.mainLayout}>
            {/* Left: Geometry List */}
            <div className={styles.geometryPanel}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Geometry Inputs</h3>
                <span className={styles.sectionCount}>{rows.length}</span>
              </div>
              <div className={styles.geometryList}>
                {rows.length === 0 ? (
                  <div className={styles.emptyState}>
                    No geometry inputs detected. Connect geometry to the solver.
                  </div>
                ) : (
                  rows.map((row) => {
                    const materialSpec = row.material ? getMaterialSpec(row.material) : null;
                    const isSelected = selectedGeometryId === row.id;
                    return (
                      <button
                        key={row.id}
                        className={`${styles.geometryRow} ${isSelected ? styles.geometryRowSelected : ""}`}
                        onClick={() => setSelectedGeometryId(row.id)}
                      >
                        <div
                          className={styles.geometryColor}
                          style={{
                            backgroundColor: materialSpec
                              ? colorToRgbString(materialSpec.color)
                              : "transparent",
                            borderColor: materialSpec ? "transparent" : "#ccc",
                          }}
                        />
                        <div className={styles.geometryInfo}>
                          <div className={styles.geometryName}>{row.name}</div>
                          <div className={styles.geometryMaterial}>
                            {row.material ?? "Unassigned"}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Center: Material Picker */}
            <div className={styles.materialPickerPanel}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Material Library</h3>
              </div>
              
              {/* Category Tabs */}
              <div className={styles.categoryTabs}>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    className={`${styles.categoryTab} ${activeCategory === cat.id ? styles.categoryTabActive : ""}`}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Material Grid */}
              <div className={styles.materialGrid}>
                {filteredMaterials.map((material) => {
                  const isAssigned = selectedGeometryId 
                    ? assignmentMap[selectedGeometryId] === material.name
                    : false;
                  return (
                    <MaterialCard
                      key={material.name}
                      material={material}
                      isSelected={isAssigned}
                      onClick={() => {
                        if (selectedGeometryId) {
                          handleAssignmentChange(
                            selectedGeometryId,
                            isAssigned ? null : material.name
                          );
                        }
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Right: Preview & Properties */}
            <div className={styles.rightPanel}>
              {/* Preview Viewport */}
              <div className={styles.previewCard}>
                <div className={styles.previewHeader}>
                  <h3 className={styles.previewTitle}>Live Preview</h3>
                  <span className={styles.previewHint}>
                    {connectedGeometryIds.length > 0
                      ? "Geometry with material colors"
                      : "No geometry to preview"}
                  </span>
                </div>
                <div className={styles.viewerFrame}>
                  {connectedGeometryIds.length > 0 ? (
                    <WorkflowGeometryViewer geometryIds={connectedGeometryIds} />
                  ) : (
                    <div className={styles.previewEmpty}>
                      Connect geometry inputs to see live preview with material colors.
                    </div>
                  )}
                </div>
              </div>

              {/* Material Properties */}
              <MaterialProperties material={displayedMaterialSpec} />

              {/* Output Text */}
              <div className={styles.outputBlock}>
                <div className={styles.outputTitle}>materialsText Output</div>
                <textarea
                  value={materialsText}
                  readOnly
                  className={styles.outputTextarea}
                  title="Material assignments in text format"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const wrapper = isMinimized ? (
    <div className={styles.docked} data-capture-hide="true" role="dialog" aria-modal="false">
      {panel}
    </div>
  ) : (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      data-capture-hide="true"
    >
      {panel}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(wrapper, document.body);
};

export default ChemistryMaterialPopup;
