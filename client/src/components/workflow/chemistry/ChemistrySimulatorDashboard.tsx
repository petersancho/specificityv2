import React, { useMemo, useState } from "react";
import styles from "./ChemistrySimulatorDashboard.module.css";
import { useProjectStore } from "../../../store/useProjectStore";
import { SemanticOpsPanel } from "../SemanticOpsPanel";

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return fallback;
};

const toBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Math.abs(value) > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
};

type ChemistrySimulatorDashboardProps = {
  nodeId: string;
  onClose: () => void;
};

export const ChemistrySimulatorDashboard: React.FC<ChemistrySimulatorDashboardProps> = ({
  nodeId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"parameters" | "output" | "semantic">("parameters");
  const [scale, setScale] = useState(100);

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
  const diagnostics = outputs.diagnostics as Record<string, unknown> | undefined;

  const particleCount = toNumber(parameters.particleCount, 5000);
  const iterations = toNumber(parameters.iterations, 500);
  const fieldResolution = toNumber(parameters.fieldResolution, 32);
  const convergenceTolerance = toNumber(parameters.convergenceTolerance, 1e-6);
  const blendStrength = toNumber(parameters.blendStrength, 0.5);
  const isoValue = toNumber(parameters.isoValue, 0.5);
  const enabled = toBoolean(parameters.enabled, true);

  const hasDomain = edges.some(
    (edge) => edge.target === nodeId && edge.targetHandle === "domain"
  );
  const materialsCount = edges.filter(
    (edge) => edge.target === nodeId && edge.targetHandle === "materials"
  ).length;
  const goalsCount = edges.filter(
    (edge) => edge.target === nodeId && edge.targetHandle === "goals"
  ).length;

  const handleParameterChange = (key: string, value: number | string | boolean) => {
    updateNodeData(nodeId, { parameters: { [key]: value } });
  };

  const handleRun = () => {
    recalculateWorkflow();
  };

  const particlesArray = Array.isArray(outputs.particles)
    ? (outputs.particles as unknown[])
    : [];
  const historyArray = Array.isArray(outputs.history)
    ? (outputs.history as unknown[])
    : [];
  const finalEnergy = historyArray.length > 0
    ? toNumber((historyArray[historyArray.length - 1] as any)?.energy, 0)
    : 0;
  const convergence = diagnostics?.convergence != null
    ? toNumber(diagnostics.convergence, 0)
    : 0;
  const actualIterations = diagnostics?.iterations != null
    ? toNumber(diagnostics.iterations, 0)
    : 0;

  return (
    <div className={styles.dashboard} style={{ fontSize: `${scale}%` }}>
      <div className={styles.header}>
        <div className={styles.headerBar} />
        <div className={styles.headerContent}>
          <div className={styles.title}>
            <span className={styles.titleGreek}>Ἐπιλύτης Χημείας</span>
            <span className={styles.titleEnglish}>Chemistry Solver</span>
            <span className={styles.titleSubtext}>Empedocles · Material Transmutation</span>
          </div>
          <div className={styles.headerControls}>
            <label className={styles.scaleControl}>
              Scale:
              <input
                type="range"
                min="50"
                max="100"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
              />
              <span>{scale}%</span>
            </label>
            <button className={styles.closeButton} onClick={onClose}>
              ✕
            </button>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "parameters" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("parameters")}
        >
          Parameters
        </button>
        <button
          className={`${styles.tab} ${activeTab === "output" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("output")}
        >
          Output
        </button>
        <button
          className={`${styles.tab} ${activeTab === "semantic" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("semantic")}
        >
          Semantic Ops
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === "parameters" && (
          <div className={styles.parametersTab}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Solver Parameters</h3>
              <div className={styles.materialPropsGrid}>
                <label>
                  Particle Count
                  <input
                    type="number"
                    value={particleCount}
                    onChange={(e) => handleParameterChange("particleCount", Number(e.target.value))}
                    min={100}
                    max={100000}
                    step={100}
                  />
                </label>
                <label>
                  Iterations
                  <input
                    type="number"
                    value={iterations}
                    onChange={(e) => handleParameterChange("iterations", Number(e.target.value))}
                    min={10}
                    max={10000}
                  />
                </label>
                <label>
                  Field Resolution
                  <input
                    type="number"
                    value={fieldResolution}
                    onChange={(e) => handleParameterChange("fieldResolution", Number(e.target.value))}
                    min={8}
                    max={128}
                  />
                </label>
                <label>
                  Convergence Tolerance
                  <input
                    type="number"
                    value={convergenceTolerance}
                    onChange={(e) => handleParameterChange("convergenceTolerance", Number(e.target.value))}
                    step="1e-7"
                  />
                </label>
                <label>
                  Blend Strength
                  <input
                    type="number"
                    value={blendStrength}
                    onChange={(e) => handleParameterChange("blendStrength", Number(e.target.value))}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                </label>
                <label>
                  Iso Value
                  <input
                    type="number"
                    value={isoValue}
                    onChange={(e) => handleParameterChange("isoValue", Number(e.target.value))}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </label>
                <label>
                  Enabled
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => handleParameterChange("enabled", e.target.checked)}
                  />
                </label>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Connected Inputs</h3>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Domain</div>
                  <div className={styles.summaryValue}>{hasDomain ? "Connected" : "Missing"}</div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Materials</div>
                  <div className={styles.summaryValue}>{materialsCount}</div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Goals</div>
                  <div className={styles.summaryValue}>{goalsCount}</div>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.controlPanel}>
                <button className={styles.controlButton} onClick={handleRun}>
                  Run Solver
                </button>
              </div>
              {evaluationError && (
                <div className={styles.warningBanner}>Error: {evaluationError}</div>
              )}
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
                <div className={styles.outputLabel}>Particles</div>
                <div className={styles.outputValue}>{particlesArray.length}</div>
              </div>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Iterations</div>
                <div className={styles.outputValue}>{actualIterations > 0 ? actualIterations : "—"}</div>
              </div>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Final Energy</div>
                <div className={styles.outputValue}>{finalEnergy > 0 ? finalEnergy.toFixed(2) : "—"}</div>
              </div>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Convergence</div>
                <div className={styles.outputValue}>{convergence > 0 ? convergence.toFixed(6) : "—"}</div>
              </div>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Materials</div>
                <div className={styles.outputValue}>{diagnostics?.materialCount != null ? String(diagnostics.materialCount) : "—"}</div>
              </div>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Compute Time</div>
                <div className={styles.outputValue}>
                  {diagnostics?.computeTime != null ? `${Number(diagnostics.computeTime).toFixed(1)} ms` : "—"}
                </div>
              </div>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Geometry Output</div>
                <div className={styles.outputValue}>
                  {typeof outputs.geometry === "string" ? outputs.geometry : "—"}
                </div>
              </div>
            </div>
            {diagnostics?.warnings && Array.isArray(diagnostics.warnings) && diagnostics.warnings.length > 0 ? (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Warnings</h3>
                <div className={styles.warningsList}>
                  {(diagnostics.warnings as string[]).map((warning, idx) => (
                    <div key={idx} className={styles.warningItem}>{String(warning)}</div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {activeTab === "semantic" && (
          <div className={styles.semanticTab}>
            <SemanticOpsPanel nodeId={nodeId} nodeType="chemistrySolver" />
          </div>
        )}
      </div>
    </div>
  );
};
