import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import WebGLButton from "../../ui/WebGLButton";
import WorkflowGeometryViewer from "../WorkflowGeometryViewer";
import { useProjectStore } from "../../../store/useProjectStore";
import { CHEMISTRY_MATERIAL_LIBRARY } from "../../../workflow/nodeRegistry";
import {
  getNodeDefinition,
  resolveNodeParameters,
  resolveNodePorts,
} from "../nodeCatalog";
import styles from "./ChemistryMaterialPopup.module.css";
import type { WorkflowNode } from "../../../types";

type ChemistryMaterialPopupProps = {
  nodeId: string;
  onClose: () => void;
};

const MATERIAL_DESCRIPTION =
  "Assign material species to each geometry input so the Chemistry Solver can diffuse, blend, and fuse them into a graded field. Use this panel to preview the solver output and emit the materialsText mapping.";

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

const ChemistryMaterialPopup = ({ nodeId, onClose }: ChemistryMaterialPopupProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [uiScale, setUiScale] = useState(0.9);
  const scalePercent = Math.round(uiScale * 100);
  const nodes = useProjectStore((state) => state.workflow.nodes);
  const edges = useProjectStore((state) => state.workflow.edges);
  const geometry = useProjectStore((state) => state.geometry);
  const sceneNodes = useProjectStore((state) => state.sceneNodes);
  const updateNodeData = useProjectStore((state) => state.updateNodeData);

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
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [connectedGeometryIds, geometryLabelById]);

  const materialOptions = useMemo(() => {
    const names = new Set<string>();
    Object.values(CHEMISTRY_MATERIAL_LIBRARY).forEach((material) => {
      if (material.name) names.add(material.name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, []);

  const handleAssignmentChange = (geometryId: string, material: string | null) => {
    const next = { ...assignmentMap };
    if (!material) {
      delete next[geometryId];
    } else {
      next[geometryId] = material;
    }
    updateNodeData(nodeId, { parameters: { assignments: next } });
  };

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

  const panel = (
    <div
      className={`${styles.panel} ${isMinimized ? styles.panelMinimized : ""}`}
      style={{ ["--solver-scale" as string]: uiScale.toString() } as CSSProperties}
      onClick={(event) => event.stopPropagation()}
    >
      <div className={styles.panelContent}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Material Assignment</div>
            <div className={styles.subtitle}>Chemistry Solver Materials</div>
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
          <div className={styles.layout}>
            <div
              className={styles.previewCard}
              title="Preview the solver output as you assign materials."
            >
              <div className={styles.previewHeader}>
                <h3 className={styles.previewTitle}>Solver Output Preview</h3>
                <span className={styles.previewHint}>
                  {solverNode ? "Live view updates with assignments" : "Connect to a solver"}
                </span>
              </div>
              <div className={styles.viewerFrame}>
                {solverGeometryId ? (
                  <WorkflowGeometryViewer geometryIds={[solverGeometryId]} />
                ) : (
                  <div className={styles.previewEmpty}>
                    {solverNode
                      ? "Waiting for solver geometry output."
                      : "Connect this Material node to a Chemistry Solver to preview output."}
                  </div>
                )}
              </div>
            </div>

            <div
              className={styles.assignmentPanel}
              title="Assign materials to each connected geometry."
            >
              <div className={styles.assignmentHeader}>
                <h3 className={styles.assignmentTitle}>Geometry Inputs</h3>
                <span className={styles.assignmentSubtitle}>
                  {rows.length > 0
                    ? "Choose a material for each connected geometry."
                    : "No geometry inputs detected yet."}
                </span>
              </div>

              <div className={styles.assignmentList}>
                {rows.map((row) => {
                  const selected = assignmentMap[row.id] ?? "";
                  return (
                    <div
                      key={row.id}
                      className={styles.assignmentRow}
                      title="Assign a material to this geometry."
                    >
                      <div>
                        <div className={styles.assignmentName}>{row.name}</div>
                        <div className={styles.assignmentId}>{row.id}</div>
                      </div>
                      <select
                        className={styles.assignmentSelect}
                        value={selected}
                        onChange={(event) =>
                          handleAssignmentChange(
                            row.id,
                            event.target.value ? event.target.value : null
                          )
                        }
                        title="Select a material for this geometry."
                      >
                        <option value="">Unassigned</option>
                        {materialOptions.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              <div className={styles.materialsTextBlock}>
                <div className={styles.assignmentTitle}>materialsText output</div>
                <textarea
                  value={materialsText}
                  readOnly
                  title="Copy this output into the solver Materials Text input."
                />
                <div className={styles.materialsTextHint}>
                  This text is emitted from the Material node. Connect its output to the
                  solver’s Materials Text input.
                </div>
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
