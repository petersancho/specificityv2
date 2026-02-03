import React, { useState, useMemo } from "react";
import styles from "./EvolutionarySimulatorDashboard.module.css";
import { useProjectStore } from "../../../store/useProjectStore";

type EvolutionarySimulatorDashboardProps = {
  nodeId: string;
  onClose: () => void;
};

type TabId = "setup" | "simulator" | "output";

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const EvolutionarySimulatorDashboard = ({
  nodeId,
  onClose,
}: EvolutionarySimulatorDashboardProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("setup");
  const [uiScale, setUiScale] = useState(0.9);

  const scalePercent = Math.round(uiScale * 100);

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

  const populationSize = toNumber(parameters.populationSize, 50);
  const generations = toNumber(parameters.generations, 100);
  const mutationRate = toNumber(parameters.mutationRate, 0.1);
  const crossoverRate = toNumber(parameters.crossoverRate, 0.8);
  const elitismCount = toNumber(parameters.elitismCount, 2);
  const convergenceTolerance = toNumber(parameters.convergenceTolerance, 1e-6);
  const seed = toNumber(parameters.seed, 42);

  const handleParameterChange = (key: string, value: number | string) => {
    updateNodeData(nodeId, {
      parameters: {
        ...parameters,
        [key]: value,
      },
    }, { recalculate: false });
  };

  const handleRun = () => {
    recalculateWorkflow();
  };

  const metadata = outputs.metadata as Record<string, unknown> | undefined;
  const bestFitness = metadata?.bestFitness != null ? toNumber(metadata.bestFitness, 0) : 0;
  const convergenceGeneration = metadata?.convergenceGeneration != null ? toNumber(metadata.convergenceGeneration, 0) : 0;
  const computeTime = metadata?.computeTime != null ? toNumber(metadata.computeTime, 0) : 0;

  return (
    <div className={styles.dashboardOverlay}>
      <div className={styles.dashboardContainer} style={{ transform: `scale(${uiScale})` }}>
        <div className={styles.dashboardHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.solverIcon}>🧬</div>
            <div className={styles.headerText}>
              <h2 className={styles.dashboardTitle}>Evolutionary Solver</h2>
              <p className={styles.dashboardSubtitle}>
                Ἐπιλύτης Ἐξελίξεως (Darwin)
              </p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.scaleButton} onClick={() => setUiScale(Math.max(0.5, uiScale - 0.1))}>
              −
            </button>
            <span className={styles.scaleLabel}>{scalePercent}%</span>
            <button className={styles.scaleButton} onClick={() => setUiScale(Math.min(1.0, uiScale + 0.1))}>
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
            <div className={styles.setupLayout}>
              <div className={styles.parameterSection}>
                <h3 className={styles.sectionTitle}>Algorithm Parameters</h3>
                <div className={styles.parameterGrid}>
                  <label>
                    Population Size
                    <input
                      type="number"
                      value={populationSize}
                      onChange={(e) => handleParameterChange("populationSize", Number(e.target.value))}
                      min={10}
                      max={200}
                    />
                  </label>
                  <label>
                    Generations
                    <input
                      type="number"
                      value={generations}
                      onChange={(e) => handleParameterChange("generations", Number(e.target.value))}
                      min={10}
                      max={1000}
                    />
                  </label>
                  <label>
                    Mutation Rate
                    <input
                      type="number"
                      value={mutationRate}
                      onChange={(e) => handleParameterChange("mutationRate", Number(e.target.value))}
                      min={0}
                      max={1}
                      step={0.01}
                    />
                  </label>
                  <label>
                    Crossover Rate
                    <input
                      type="number"
                      value={crossoverRate}
                      onChange={(e) => handleParameterChange("crossoverRate", Number(e.target.value))}
                      min={0}
                      max={1}
                      step={0.01}
                    />
                  </label>
                  <label>
                    Elitism Count
                    <input
                      type="number"
                      value={elitismCount}
                      onChange={(e) => handleParameterChange("elitismCount", Number(e.target.value))}
                      min={0}
                      max={20}
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
                    Seed
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => handleParameterChange("seed", Number(e.target.value))}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === "simulator" && (
            <div className={styles.simulatorLayout}>
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
                  <div className={styles.statusValue}>
                    {bestFitness > 0 ? "Complete" : "Idle"}
                  </div>
                </div>
                <div className={styles.statusCard}>
                  <div className={styles.statusLabel}>Population Size</div>
                  <div className={styles.statusValue}>{populationSize}</div>
                </div>
                <div className={styles.statusCard}>
                  <div className={styles.statusLabel}>Max Generations</div>
                  <div className={styles.statusValue}>{generations}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "output" && (
            <div className={styles.outputLayout}>
              {evaluationError && (
                <div className={styles.warningBanner}>Error: {evaluationError}</div>
              )}
              <div className={styles.outputGrid}>
                <div className={styles.outputCard}>
                  <div className={styles.outputLabel}>Best Fitness</div>
                  <div className={styles.outputValue}>
                    {bestFitness > 0 ? bestFitness.toFixed(4) : "—"}
                  </div>
                </div>
                <div className={styles.outputCard}>
                  <div className={styles.outputLabel}>Convergence Generation</div>
                  <div className={styles.outputValue}>
                    {convergenceGeneration > 0 ? convergenceGeneration : "—"}
                  </div>
                </div>
                <div className={styles.outputCard}>
                  <div className={styles.outputLabel}>Population Size</div>
                  <div className={styles.outputValue}>{populationSize}</div>
                </div>
                <div className={styles.outputCard}>
                  <div className={styles.outputLabel}>Generations</div>
                  <div className={styles.outputValue}>{generations}</div>
                </div>
                <div className={styles.outputCard}>
                  <div className={styles.outputLabel}>Compute Time</div>
                  <div className={styles.outputValue}>
                    {computeTime > 0 ? `${computeTime.toFixed(1)} ms` : "—"}
                  </div>
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
    </div>
  );
};

export default EvolutionarySimulatorDashboard;
