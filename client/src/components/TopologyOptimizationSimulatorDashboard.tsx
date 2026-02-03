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

  const volumeFraction = toNumber(parameters.volumeFraction, 0.4);
  const penaltyExponent = toNumber(parameters.penaltyExponent, 3);
  const filterRadius = toNumber(parameters.filterRadius, 2);
  const iterations = toNumber(parameters.iterations, 100);
  const resolution = toNumber(parameters.resolution, 32);

  const hasDomain = edges.some(
    (edge) => edge.target === nodeId && edge.targetHandle === "domain"
  );
  const goalsCount = edges.filter(
    (edge) => edge.target === nodeId && edge.targetHandle === "goals"
  ).length;

  const handleParameterChange = (key: string, value: number) => {
    updateNodeData(nodeId, { parameters: { [key]: value } });
  };

  const handleRun = () => {
    recalculateWorkflow();
  };

  const bestScore = toNumber(outputs.bestScore, 0);
  const objective = toNumber(outputs.objective, 0);
  const constraint = toNumber(outputs.constraint, 0);
  const actualIterations = toNumber(outputs.iterations, 0);
  const actualResolution = toNumber(outputs.resolution, 0);
  const status = typeof outputs.status === "string" ? outputs.status : "idle";

  return (
    <div className={styles.dashboardOverlay}>
      <div className={styles.dashboardContainer} style={{ transform: `scale(${scale / 100})` }}>
        <div className={styles.dashboardHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.solverIcon}>🔷</div>
            <div className={styles.headerText}>
              <h2 className={styles.dashboardTitle}>Topology Optimization Simulator</h2>
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
                    Volume Fraction
                    <input
                      type="number"
                      value={volumeFraction}
                      onChange={(e) => handleParameterChange("volumeFraction", Number(e.target.value))}
                      min={0.05}
                      max={0.95}
                      step={0.01}
                    />
                  </label>
                  <label>
                    Penalty Exponent
                    <input
                      type="number"
                      value={penaltyExponent}
                      onChange={(e) => handleParameterChange("penaltyExponent", Number(e.target.value))}
                      min={1}
                      max={6}
                      step={0.1}
                    />
                  </label>
                  <label>
                    Filter Radius
                    <input
                      type="number"
                      value={filterRadius}
                      onChange={(e) => handleParameterChange("filterRadius", Number(e.target.value))}
                      min={0}
                      max={8}
                      step={0.1}
                    />
                  </label>
                  <label>
                    Iterations
                    <input
                      type="number"
                      value={iterations}
                      onChange={(e) => handleParameterChange("iterations", Number(e.target.value))}
                      min={10}
                      max={1000}
                    />
                  </label>
                  <label>
                    Resolution
                    <input
                      type="number"
                      value={resolution}
                      onChange={(e) => handleParameterChange("resolution", Number(e.target.value))}
                      min={8}
                      max={128}
                    />
                  </label>
                </div>
              </div>

              <div className={styles.section}>
                <h3>Connected Inputs</h3>
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryLabel}>Domain</div>
                    <div className={styles.summaryValue}>{hasDomain ? "Connected" : "Missing"}</div>
                  </div>
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryLabel}>Goals</div>
                    <div className={styles.summaryValue}>{goalsCount}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "simulator" && (
            <div className={styles.simulatorTab}>
              <div className={styles.controlPanel}>
                <button className={styles.controlButton} onClick={handleRun}>
                  Run
                </button>
              </div>
              {evaluationError && (
                <div className={styles.warningBanner}>Error: {evaluationError}</div>
              )}
              <div className={styles.statusGrid}>
                <div className={styles.statusCard}>
                  <div className={styles.statusLabel}>Status</div>
                  <div className={styles.statusValue}>{status}</div>
                </div>
                <div className={styles.statusCard}>
                  <div className={styles.statusLabel}>Iterations</div>
                  <div className={styles.statusValue}>{actualIterations > 0 ? actualIterations : "—"}</div>
                </div>
                <div className={styles.statusCard}>
                  <div className={styles.statusLabel}>Resolution</div>
                  <div className={styles.statusValue}>{actualResolution > 0 ? actualResolution : "—"}</div>
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
                  <div className={styles.outputLabel}>Best Score</div>
                  <div className={styles.outputValue}>
                    {bestScore > 0 ? bestScore.toFixed(4) : "—"}
                  </div>
                </div>
                <div className={styles.outputCard}>
                  <div className={styles.outputLabel}>Objective</div>
                  <div className={styles.outputValue}>
                    {objective > 0 ? objective.toFixed(4) : "—"}
                  </div>
                </div>
                <div className={styles.outputCard}>
                  <div className={styles.outputLabel}>Constraint</div>
                  <div className={styles.outputValue}>
                    {constraint !== 0 ? constraint.toFixed(4) : "—"}
                  </div>
                </div>
                <div className={styles.outputCard}>
                  <div className={styles.outputLabel}>Iterations</div>
                  <div className={styles.outputValue}>
                    {actualIterations > 0 ? actualIterations : "—"}
                  </div>
                </div>
                <div className={styles.outputCard}>
                  <div className={styles.outputLabel}>Resolution</div>
                  <div className={styles.outputValue}>
                    {actualResolution > 0 ? actualResolution : "—"}
                  </div>
                </div>
                <div className={styles.outputCard}>
                  <div className={styles.outputLabel}>Status</div>
                  <div className={styles.outputValue}>{status}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
