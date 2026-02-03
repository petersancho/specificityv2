import React, { useState, useMemo } from "react";
import styles from "./TopologyOptimizationSimulatorDashboard.module.css";
import { useProjectStore } from "../store/useProjectStore";

interface TopologyOptimizationSimulatorDashboardProps {
  nodeId: string;
  onClose: () => void;
}

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

export const TopologyOptimizationSimulatorDashboard: React.FC<
  TopologyOptimizationSimulatorDashboardProps
> = ({ nodeId, onClose }) => {
  const [activeTab, setActiveTab] = useState<"setup" | "simulator" | "output">("setup");
  const [scale, setScale] = useState(75);

  const { nodes, edges, updateNodeData, recalculateWorkflow } = useProjectStore(
    (state) => ({
      nodes: state.workflow.nodes,
      edges: state.workflow.edges,
      updateNodeData: state.updateNodeData,
      recalculateWorkflow: state.recalculateWorkflow,
    })
  );

  const solverNode = useMemo(
    () => nodes.find((node) => node.id === nodeId),
    [nodes, nodeId]
  );

  const parameters = solverNode?.data?.parameters ?? {};
  const outputs = solverNode?.data?.outputs ?? {};
  const evaluationError = solverNode?.data?.evaluationError;

  const pointDensity = toNumber(parameters.pointDensity, 100);
  const maxLinksPerPoint = toNumber(parameters.maxLinksPerPoint, 4);
  const maxSpanLength = toNumber(parameters.maxSpanLength, 1.0);
  const pipeRadius = toNumber(parameters.pipeRadius, 0.05);
  const seed = toNumber(parameters.seed, 42);

  const hasGeometry = edges.some(
    (edge) => edge.target === nodeId && edge.targetHandle === "geometry"
  );
  
  const hasGoals = edges.some(
    (edge) => edge.target === nodeId && edge.targetHandle === "goals"
  );

  const handleParameterChange = (key: string, value: number) => {
    updateNodeData(nodeId, { parameters: { [key]: value } }, { recalculate: false });
  };

  const handleRun = () => {
    recalculateWorkflow();
  };

  const pointCount = toNumber(outputs.pointCount, 0);
  const curveCount = toNumber(outputs.curveCount, 0);
  const volume = toNumber(outputs.volume, 0);
  const surfaceArea = toNumber(outputs.surfaceArea, 0);

  return (
    <div className={styles.dashboardOverlay}>
      <div className={styles.dashboardContainer} style={{ transform: `scale(${scale / 100})` }}>
        <div className={styles.dashboardHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.solverIcon}>🔷</div>
            <div className={styles.headerText}>
              <h2 className={styles.dashboardTitle}>Topology Optimization</h2>
              <p className={styles.dashboardSubtitle}>
                Ἐπιλύτης Τοπολογικῆς Βελτιστοποίησης (Euler)
              </p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.scaleButton} onClick={() => setScale(Math.max(50, scale - 10))}>
              −
            </button>
            <span className={styles.scaleLabel}>{scale}%</span>
            <button className={styles.scaleButton} onClick={() => setScale(Math.min(100, scale + 10))}>
              +
            </button>
            <button className={styles.closeButton} onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className={styles.tabNav}>
          <button
            className={`${styles.tabButton} ${activeTab === "setup" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("setup")}
          >
            Setup
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === "simulator" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("simulator")}
          >
            Simulator
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === "output" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("output")}
          >
            Output
          </button>
        </div>

        <div className={styles.dashboardContent}>
          {activeTab === "setup" && (
            <div className={styles.setupTab}>
              <div className={styles.section}>
                <h3>Optimization Parameters</h3>
                <div className={styles.parameterGrid}>
                  <label>
                    Point Density
                    <input
                      type="number"
                      value={pointDensity}
                      onChange={(e) => handleParameterChange("pointDensity", Number(e.target.value))}
                      min={10}
                      max={1000}
                      step={10}
                    />
                  </label>
                  <label>
                    Max Links Per Point
                    <input
                      type="number"
                      value={maxLinksPerPoint}
                      onChange={(e) => handleParameterChange("maxLinksPerPoint", Number(e.target.value))}
                      min={2}
                      max={8}
                      step={1}
                    />
                  </label>
                  <label>
                    Max Span Length
                    <input
                      type="number"
                      value={maxSpanLength}
                      onChange={(e) => handleParameterChange("maxSpanLength", Number(e.target.value))}
                      min={0.1}
                      max={10.0}
                      step={0.1}
                    />
                  </label>
                  <label>
                    Pipe Radius
                    <input
                      type="number"
                      value={pipeRadius}
                      onChange={(e) => handleParameterChange("pipeRadius", Number(e.target.value))}
                      min={0.01}
                      max={1.0}
                      step={0.01}
                    />
                  </label>
                  <label>
                    Random Seed
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => handleParameterChange("seed", Number(e.target.value))}
                      min={0}
                      max={9999}
                      step={1}
                    />
                  </label>
                </div>
              </div>

              <div className={styles.section}>
                <h3>Connected Inputs</h3>
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryLabel}>Geometry</div>
                    <div className={styles.summaryValue}>{hasGeometry ? "Connected" : "Missing"}</div>
                  </div>
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryLabel}>Goals</div>
                    <div className={styles.summaryValue}>{hasGoals ? "Connected" : "Optional"}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "simulator" && (
            <div className={styles.simulatorTab}>
              <div className={styles.controlPanel}>
                <button className={styles.controlButton} onClick={handleRun}>
                  Run Optimization
                </button>
              </div>
              {evaluationError && (
                <div className={styles.warningBanner}>Error: {evaluationError}</div>
              )}
              <div className={styles.statusGrid}>
                <div className={styles.statusCard}>
                  <div className={styles.statusLabel}>Points Generated</div>
                  <div className={styles.statusValue}>{pointCount > 0 ? pointCount : "—"}</div>
                </div>
                <div className={styles.statusCard}>
                  <div className={styles.statusLabel}>Curves Generated</div>
                  <div className={styles.statusValue}>{curveCount > 0 ? curveCount : "—"}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "output" && (
            <div className={styles.outputTab}>
              {evaluationError && (
                <div className={styles.warningBanner}>Error: {evaluationError}</div>
              )}
              <div className={styles.outputGrid}>
                <div className={styles.outputCard}>
                  <div className={styles.outputLabel}>Point Count</div>
                  <div className={styles.outputValue}>
                    {pointCount > 0 ? pointCount : "—"}
                  </div>
                </div>
                <div className={styles.outputCard}>
                  <div className={styles.outputLabel}>Curve Count</div>
                  <div className={styles.outputValue}>
                    {curveCount > 0 ? curveCount : "—"}
                  </div>
                </div>
                <div className={styles.outputCard}>
                  <div className={styles.outputLabel}>Volume</div>
                  <div className={styles.outputValue}>
                    {volume > 0 ? volume.toFixed(6) : "—"}
                  </div>
                </div>
                <div className={styles.outputCard}>
                  <div className={styles.outputLabel}>Surface Area</div>
                  <div className={styles.outputValue}>
                    {surfaceArea > 0 ? surfaceArea.toFixed(6) : "—"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
