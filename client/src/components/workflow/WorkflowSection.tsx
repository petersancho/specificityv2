import { useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  ConnectionLineType,
  Controls,
  MarkerType,
  type ReactFlowInstance,
} from "reactflow";
import { useProjectStore, type NodeType } from "../../store/useProjectStore";
import {
  GeometryReferenceNode,
  PointNode,
  PolylineNode,
  SurfaceNode,
} from "./WorkflowNodes";
import styles from "./WorkflowSection.module.css";

const nodeOptions: { label: string; value: NodeType }[] = [
  { label: "Geometry Reference", value: "geometryReference" },
  { label: "Point", value: "point" },
  { label: "Polyline", value: "polyline" },
  { label: "Surface", value: "surface" },
];

type WorkflowSectionProps = {
  onCaptureRequest?: (element: HTMLElement) => Promise<void> | void;
  captureDisabled?: boolean;
};

const WorkflowSection = ({ onCaptureRequest, captureDisabled }: WorkflowSectionProps) => {
  const [selectedType, setSelectedType] = useState<NodeType>("point");
  const nodes = useProjectStore((state) => state.workflow.nodes);
  const edges = useProjectStore((state) => state.workflow.edges);
  const onNodesChange = useProjectStore((state) => state.onNodesChange);
  const onEdgesChange = useProjectStore((state) => state.onEdgesChange);
  const onConnect = useProjectStore((state) => state.onConnect);
  const addNode = useProjectStore((state) => state.addNode);
  const pruneWorkflow = useProjectStore((state) => state.pruneWorkflow);
  const undoWorkflow = useProjectStore((state) => state.undoWorkflow);

  const nodeTypes = useMemo(
    () => ({
      geometryReference: GeometryReferenceNode,
      point: PointNode,
      polyline: PolylineNode,
      surface: SurfaceNode,
    }),
    []
  );
  const supportedTypes = useMemo(
    () => new Set(nodeOptions.map((option) => option.value)),
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

  const canvasRef = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const handleCapture = async () => {
    if (!canvasRef.current || !onCaptureRequest || !reactFlowInstance) return;
    const container = canvasRef.current;
    const prevStyles = {
      width: container.style.width,
      height: container.style.height,
      position: container.style.position,
      left: container.style.left,
      top: container.style.top,
      zIndex: container.style.zIndex,
    };
    container.classList.add(styles.captureActive);
    container.style.width = "1600px";
    container.style.height = "900px";
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.zIndex = "-1";
    try {
      reactFlowInstance.fitView({ padding: 0.16, duration: 0, includeHiddenNodes: true });
      await onCaptureRequest(container);
    } finally {
      container.classList.remove(styles.captureActive);
      container.style.width = prevStyles.width;
      container.style.height = prevStyles.height;
      container.style.position = prevStyles.position;
      container.style.left = prevStyles.left;
      container.style.top = prevStyles.top;
      container.style.zIndex = prevStyles.zIndex;
    }
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
        <div>
          <h2>Numerica</h2>
          <p>Drop nodes to convert geometry layers into LCA metrics.</p>
        </div>
        <div className={styles.controls}>
          <label>
            Component
            <select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value as NodeType)}
            >
              {nodeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className={styles.primary} onClick={() => addNode(selectedType)}>
            Add Node
          </button>
          <button
            type="button"
            className={styles.capture}
            onClick={handleCapture}
            disabled={captureDisabled}
          >
            {captureDisabled ? "Capturing…" : "Screenshot Canvas"}
          </button>
        </div>
      </div>

      <div className={styles.body}>
        <aside className={styles.palette}>
          <h3>Geometry Palette</h3>
          {nodeOptions.map((option) => (
            <button
              key={option.value}
              className={styles.paletteItem}
              onClick={() => addNode(option.value)}
            >
              {option.label}
            </button>
          ))}
          <p className={styles.paletteHint}>
            Connect nodes to build geometry and semantic relationships.
          </p>
        </aside>
        <div className={styles.canvas} data-panel-drag="true">
          <div className={styles.canvasViewport} ref={canvasRef}>
            <ReactFlow
              nodes={filteredNodes}
              edges={filteredEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              minZoom={0.2}
              defaultEdgeOptions={{
                animated: true,
                style: { stroke: "rgba(107, 114, 128, 0.6)", strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: "#6b7280" },
              }}
              connectionLineStyle={{ stroke: "#f97316", strokeWidth: 2 }}
              connectionLineType={ConnectionLineType.SmoothStep}
              zoomOnScroll
              zoomOnPinch
              panOnDrag={[2]}
              panOnScroll={false}
              onPaneContextMenu={(event) => event.preventDefault()}
              deleteKeyCode={["Backspace", "Delete"]}
              fitView
              onInit={(instance) => setReactFlowInstance(instance)}
            >
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;
