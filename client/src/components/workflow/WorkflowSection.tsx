import { useEffect, useMemo, useRef, useState } from "react";
import { useProjectStore, type NodeType } from "../../store/useProjectStore";
import { NumericalCanvas } from "./NumericalCanvas";
import styles from "./WorkflowSection.module.css";

const nodeOptions: { label: string; value: NodeType }[] = [
  { label: "Geometry Reference", value: "geometryReference" },
  { label: "Point Generator", value: "point" },
  { label: "Polyline", value: "polyline" },
  { label: "Surface", value: "surface" },
  { label: "Box Builder", value: "box" },
  { label: "Sphere", value: "sphere" },
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
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const handleCapture = async () => {
    if (!canvasRef.current || !onCaptureRequest) return;
    const container = canvasRef.current;
    await onCaptureRequest(container);
  };

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
          <p>Drop nodes to build parametric geometry workflows.</p>
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
            <NumericalCanvas width={canvasSize.width} height={canvasSize.height} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;
