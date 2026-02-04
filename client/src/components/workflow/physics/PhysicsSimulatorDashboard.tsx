import React, { useMemo, useRef, useState } from "react";
import styles from "./PhysicsSimulatorDashboard.module.css";
import { useProjectStore } from "../../../store/useProjectStore";
import { semanticOpEnd, semanticOpStart, withSemanticOpSync } from "../../../semantic/semanticTracer";

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

type AnalysisType = "static" | "dynamic" | "modal";

type PhysicsSimulatorDashboardProps = {
  nodeId: string;
  onClose: () => void;
};

export const PhysicsSimulatorDashboard: React.FC<PhysicsSimulatorDashboardProps> = ({
  nodeId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"setup" | "simulator" | "output">("setup");
  const [scale, setScale] = useState(100);
  const semanticRunIdRef = useRef<string | null>(null);

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

  const analysisType = (typeof parameters.analysisType === "string"
    ? parameters.analysisType
    : "static") as AnalysisType;
  const maxIterations = toNumber(parameters.maxIterations, 1000);
  const convergenceTolerance = toNumber(parameters.convergenceTolerance, 1e-6);
  const timeStep = toNumber(parameters.timeStep, 0.01);
  const animationFrames = toNumber(parameters.animationFrames, 60);
  const useGPU = toBoolean(parameters.useGPU, true);
  const chunkSize = Math.round(toNumber(parameters.chunkSize, 1000));

  const hasBaseMesh = edges.some(
    (edge) => edge.target === nodeId && edge.targetHandle === "baseMesh"
  );
  const goalsCount = edges.filter(
    (edge) => edge.target === nodeId && edge.targetHandle === "goals"
  ).length;

  const handleParameterChange = (key: string, value: number | string | boolean) => {
    updateNodeData(nodeId, { parameters: { [key]: value } }, { recalculate: false });
  };

  const handleRun = () => {
    const runId = `${nodeId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
    semanticRunIdRef.current = runId;
    semanticOpStart({ nodeId, runId, opId: "simulator.physics.initialize" });
    semanticOpEnd({ nodeId, runId, opId: "simulator.physics.initialize", ok: true });
    try {
      withSemanticOpSync({ nodeId, runId, opId: "simulator.physics.step" }, () => {
        recalculateWorkflow();
      });
      semanticOpStart({ nodeId, runId, opId: "simulator.physics.finalize" });
      semanticOpEnd({ nodeId, runId, opId: "simulator.physics.finalize", ok: true });
    } catch (error) {
      semanticOpEnd({
        nodeId,
        runId,
        opId: "simulator.physics.finalize",
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const stressField = Array.isArray(outputs.stressField)
    ? (outputs.stressField as number[])
    : [];
  const maxStress = stressField.length > 0 ? Math.max(...stressField) : 0;
  const displacementCount = Array.isArray(outputs.displacements)
    ? (outputs.displacements as unknown[]).length
    : 0;

  return (
    <div className={styles.dashboard} style={{ fontSize: `${scale}%` }}>
      <div className={styles.header}>
        <div className={styles.headerBar} />
        <div className={styles.headerContent}>
          <div className={styles.title}>
            <span className={styles.titleGreek}>Ἐπιλύτης Φυσικῆς</span>
            <span className={styles.titleEnglish}>Physics Solver</span>
            <span className={styles.titleSubtext}>Pythagoras · Stress Analysis</span>
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
          className={`${styles.tab} ${activeTab === "setup" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("setup")}
        >
          Setup
        </button>
        <button
          className={`${styles.tab} ${activeTab === "simulator" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("simulator")}
        >
          Simulator
        </button>
        <button
          className={`${styles.tab} ${activeTab === "output" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("output")}
        >
          Output
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === "setup" && (
          <div className={styles.setupTab}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Analysis Type</h3>
              <div className={styles.analysisTypeGrid}>
                {(["static", "dynamic", "modal"] as AnalysisType[]).map((type) => (
                  <button
                    key={type}
                    className={`${styles.analysisTypeButton} ${analysisType === type ? styles.analysisTypeButtonActive : ""}`}
                    onClick={() => handleParameterChange("analysisType", type)}
                  >
                    <div className={styles.analysisTypeIcon}>
                      {type === "static" ? "⚖" : type === "dynamic" ? "⚡" : "〰"}
                    </div>
                    <div className={styles.analysisTypeName}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </div>
                    <div className={styles.analysisTypeDesc}>
                      {type === "static" ? "Equilibrium analysis" : type === "dynamic" ? "Time-dependent" : "Vibration modes"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Solver Parameters</h3>
              <div className={styles.materialPropsGrid}>
                <label>
                  Max Iterations
                  <input
                    type="number"
                    value={maxIterations}
                    onChange={(e) => handleParameterChange("maxIterations", Number(e.target.value))}
                    min={10}
                    max={100000}
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
                  Time Step
                  <input
                    type="number"
                    value={timeStep}
                    onChange={(e) => handleParameterChange("timeStep", Number(e.target.value))}
                    step="0.001"
                    disabled={analysisType !== "dynamic"}
                  />
                </label>
                <label>
                  Animation Frames
                  <input
                    type="number"
                    value={animationFrames}
                    onChange={(e) => handleParameterChange("animationFrames", Number(e.target.value))}
                    min={10}
                    max={300}
                    disabled={analysisType === "static"}
                  />
                </label>
                <label>
                  Use GPU
                  <input
                    type="checkbox"
                    checked={useGPU}
                    onChange={(e) => handleParameterChange("useGPU", e.target.checked)}
                  />
                </label>
                <label>
                  Chunk Size
                  <input
                    type="number"
                    value={chunkSize}
                    onChange={(e) => handleParameterChange("chunkSize", Number(e.target.value))}
                    min={100}
                    max={100000}
                  />
                </label>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Connected Inputs</h3>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Base Mesh</div>
                  <div className={styles.summaryValue}>{hasBaseMesh ? "Connected" : "Missing"}</div>
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
                Run Solver
              </button>
            </div>
            {evaluationError && (
              <div className={styles.warningBanner}>Error: {evaluationError}</div>
            )}
            <div className={styles.statusGrid}>
              <div className={styles.statusCard}>
                <div className={styles.statusLabel}>Status</div>
                <div className={styles.statusValue}>{String(diagnostics?.status ?? "idle")}</div>
              </div>
              <div className={styles.statusCard}>
                <div className={styles.statusLabel}>Iterations</div>
                <div className={styles.statusValue}>{String(diagnostics?.iterations ?? "—")}</div>
              </div>
              <div className={styles.statusCard}>
                <div className={styles.statusLabel}>Compute Time</div>
                <div className={styles.statusValue}>
                  {diagnostics?.computeTime != null ? `${Number(diagnostics.computeTime).toFixed(1)} ms` : "—"}
                </div>
              </div>
              <div className={styles.statusCard}>
                <div className={styles.statusLabel}>Memory</div>
                <div className={styles.statusValue}>
                  {diagnostics?.memoryUsed != null ? `${Number(diagnostics.memoryUsed).toFixed(1)} MB` : "—"}
                </div>
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
                <div className={styles.outputLabel}>Max Stress</div>
                <div className={styles.outputValue}>{maxStress > 0 ? maxStress.toFixed(2) : "—"}</div>
              </div>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Displacements</div>
                <div className={styles.outputValue}>{displacementCount}</div>
              </div>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Geometry Output</div>
                <div className={styles.outputValue}>
                  {typeof outputs.geometry === "string" ? outputs.geometry : "—"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
