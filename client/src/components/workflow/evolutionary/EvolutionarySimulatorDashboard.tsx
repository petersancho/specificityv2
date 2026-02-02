import { useEffect, useState, useCallback, useMemo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import WebGLButton from "../../ui/WebGLButton";
import WorkflowGeometryViewer from "../WorkflowGeometryViewer";
import { useProjectStore } from "../../../store/useProjectStore";
import styles from "./EvolutionarySimulatorDashboard.module.css";
import type { WorkflowNode, Geometry } from "../../../types";

type EvolutionarySimulatorDashboardProps = {
  nodeId: string;
  onClose: () => void;
};

type TabId = "setup" | "simulator" | "output";

type SimulationState = "idle" | "running" | "paused" | "complete";

type Individual = {
  id: string;
  genome: Record<string, number>;
  fitness: number;
  geometryId?: string;
};

type Generation = {
  number: number;
  population: Individual[];
  bestFitness: number;
  avgFitness: number;
  worstFitness: number;
  bestIndividual: Individual;
};

const DASHBOARD_DESCRIPTION =
  "Configure genome parameters, run evolutionary optimization, and export optimized geometry variants. The solver uses genetic algorithms to explore the design space and converge on optimal solutions based on your fitness function.";

const POPUP_ICON_STYLE = "sticker2";

const EvolutionarySimulatorDashboard = ({
  nodeId,
  onClose,
}: EvolutionarySimulatorDashboardProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("setup");
  const [uiScale, setUiScale] = useState(0.9);
  const [simulationState, setSimulationState] = useState<SimulationState>("idle");
  const [currentGeneration, setCurrentGeneration] = useState(0);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selectedGenerationIndex, setSelectedGenerationIndex] = useState<number | null>(null);

  const scalePercent = Math.round(uiScale * 100);

  const nodes = useProjectStore((state) => state.workflow.nodes);
  const updateNodeData = useProjectStore((state) => state.updateNodeData);

  const solverNode = useMemo(
    () => nodes.find((node) => node.id === nodeId),
    [nodes, nodeId]
  );

  // Parameters from solver node
  const parameters = useMemo(() => {
    const params = solverNode?.data?.parameters ?? {};
    return {
      populationSize: params.populationSize ?? 50,
      generations: params.generations ?? 100,
      mutationRate: params.mutationRate ?? 0.1,
      crossoverRate: params.crossoverRate ?? 0.8,
      elitismCount: params.elitismCount ?? 2,
      selectionMethod: params.selectionMethod ?? "tournament",
      crossoverMethod: params.crossoverMethod ?? "uniform",
      mutationMethod: params.mutationMethod ?? "gaussian",
      fitnessFunction: params.fitnessFunction ?? "minimize-area",
      convergenceTolerance: params.convergenceTolerance ?? 1e-6,
      seed: params.seed ?? 42,
    };
  }, [solverNode]);

  // Genome specification (example - would come from connected nodes)
  const genomeSpec = useMemo(() => {
    return [
      { name: "width", min: 0.5, max: 5.0, default: 2.0 },
      { name: "height", min: 0.5, max: 5.0, default: 2.0 },
      { name: "depth", min: 0.5, max: 5.0, default: 2.0 },
      { name: "subdivisions", min: 1, max: 10, default: 3 },
    ];
  }, []);

  const handleParameterChange = useCallback(
    (key: string, value: number | string) => {
      updateNodeData(nodeId, {
        parameters: {
          ...parameters,
          [key]: value,
        },
      });
    },
    [nodeId, parameters, updateNodeData]
  );

  const handleStartSimulation = useCallback(() => {
    setSimulationState("running");
    setCurrentGeneration(0);
    setGenerations([]);
    // TODO: Start actual simulation
  }, []);

  const handlePauseSimulation = useCallback(() => {
    setSimulationState("paused");
  }, []);

  const handleResumeSimulation = useCallback(() => {
    setSimulationState("running");
  }, []);

  const handleStopSimulation = useCallback(() => {
    setSimulationState("idle");
    setCurrentGeneration(0);
  }, []);

  const handleResetSimulation = useCallback(() => {
    setSimulationState("idle");
    setCurrentGeneration(0);
    setGenerations([]);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const renderSetupPage = () => (
    <div className={styles.setupLayout}>
      {/* Algorithm Parameters */}
      <div className={styles.setupSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <div className={styles.sectionIcon}>⚙</div>
            Algorithm Parameters
          </div>
        </div>
        <div className={styles.sectionContent}>
          <div className={styles.parameterGroup}>
            <label className={styles.parameterLabel}>
              Population Size
              <span className={styles.parameterValue}>{parameters.populationSize}</span>
            </label>
            <input
              type="range"
              min="10"
              max="200"
              step="10"
              value={parameters.populationSize}
              onChange={(e) =>
                handleParameterChange("populationSize", parseInt(e.target.value))
              }
              className={styles.parameterSlider}
            />
          </div>

          <div className={styles.parameterGroup}>
            <label className={styles.parameterLabel}>
              Generations
              <span className={styles.parameterValue}>{parameters.generations}</span>
            </label>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={parameters.generations}
              onChange={(e) =>
                handleParameterChange("generations", parseInt(e.target.value))
              }
              className={styles.parameterSlider}
            />
          </div>

          <div className={styles.parameterGroup}>
            <label className={styles.parameterLabel}>
              Mutation Rate
              <span className={styles.parameterValue}>
                {(parameters.mutationRate * 100).toFixed(0)}%
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={parameters.mutationRate}
              onChange={(e) =>
                handleParameterChange("mutationRate", parseFloat(e.target.value))
              }
              className={styles.parameterSlider}
            />
          </div>

          <div className={styles.parameterGroup}>
            <label className={styles.parameterLabel}>
              Crossover Rate
              <span className={styles.parameterValue}>
                {(parameters.crossoverRate * 100).toFixed(0)}%
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={parameters.crossoverRate}
              onChange={(e) =>
                handleParameterChange("crossoverRate", parseFloat(e.target.value))
              }
              className={styles.parameterSlider}
            />
          </div>

          <div className={styles.parameterGroup}>
            <label className={styles.parameterLabel}>
              Elitism Count
              <span className={styles.parameterValue}>{parameters.elitismCount}</span>
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={parameters.elitismCount}
              onChange={(e) =>
                handleParameterChange("elitismCount", parseInt(e.target.value))
              }
              className={styles.parameterSlider}
            />
          </div>

          <div className={styles.parameterGroup}>
            <label className={styles.parameterLabel}>Selection Method</label>
            <select
              value={parameters.selectionMethod}
              onChange={(e) => handleParameterChange("selectionMethod", e.target.value)}
              className={styles.parameterSelect}
            >
              <option value="tournament">Tournament</option>
              <option value="roulette">Roulette Wheel</option>
              <option value="rank">Rank-Based</option>
            </select>
          </div>

          <div className={styles.parameterGroup}>
            <label className={styles.parameterLabel}>Crossover Method</label>
            <select
              value={parameters.crossoverMethod}
              onChange={(e) => handleParameterChange("crossoverMethod", e.target.value)}
              className={styles.parameterSelect}
            >
              <option value="single-point">Single-Point</option>
              <option value="two-point">Two-Point</option>
              <option value="uniform">Uniform</option>
              <option value="arithmetic">Arithmetic</option>
            </select>
          </div>

          <div className={styles.parameterGroup}>
            <label className={styles.parameterLabel}>Mutation Method</label>
            <select
              value={parameters.mutationMethod}
              onChange={(e) => handleParameterChange("mutationMethod", e.target.value)}
              className={styles.parameterSelect}
            >
              <option value="gaussian">Gaussian</option>
              <option value="uniform">Uniform</option>
              <option value="creep">Creep</option>
            </select>
          </div>

          <div className={styles.parameterGroup}>
            <label className={styles.parameterLabel}>Fitness Function</label>
            <select
              value={parameters.fitnessFunction}
              onChange={(e) => handleParameterChange("fitnessFunction", e.target.value)}
              className={styles.parameterSelect}
            >
              <option value="minimize-area">Minimize Surface Area</option>
              <option value="maximize-volume">Maximize Volume</option>
              <option value="minimize-weight">Minimize Weight</option>
              <option value="maximize-strength">Maximize Strength</option>
            </select>
          </div>
        </div>
      </div>

      {/* Genome Specification */}
      <div className={styles.setupSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <div className={styles.sectionIcon}>🧬</div>
            Genome Specification
          </div>
        </div>
        <div className={styles.sectionContent}>
          <div className={styles.genomeList}>
            {genomeSpec.map((gene, index) => (
              <div key={gene.name} className={styles.genomeItem}>
                <div className={styles.genomeIcon}>{index + 1}</div>
                <div className={styles.genomeInfo}>
                  <div className={styles.genomeName}>{gene.name}</div>
                  <div className={styles.genomeRange}>
                    [{gene.min.toFixed(2)}, {gene.max.toFixed(2)}] · default:{" "}
                    {gene.default.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSimulatorPage = () => (
    <div className={styles.simulatorLayout}>
      {/* Control Panel */}
      <div className={styles.controlPanel}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <div className={styles.sectionIcon}>▶</div>
            Controls
          </div>
        </div>

        {simulationState === "idle" && (
          <button
            className={`${styles.controlButton} ${styles.controlButtonPrimary}`}
            onClick={handleStartSimulation}
          >
            ▶ Start Simulation
          </button>
        )}

        {simulationState === "running" && (
          <>
            <button
              className={`${styles.controlButton} ${styles.controlButtonSecondary}`}
              onClick={handlePauseSimulation}
            >
              ⏸ Pause
            </button>
            <button
              className={`${styles.controlButton} ${styles.controlButtonSecondary}`}
              onClick={handleStopSimulation}
            >
              ⏹ Stop
            </button>
          </>
        )}

        {simulationState === "paused" && (
          <>
            <button
              className={`${styles.controlButton} ${styles.controlButtonPrimary}`}
              onClick={handleResumeSimulation}
            >
              ▶ Resume
            </button>
            <button
              className={`${styles.controlButton} ${styles.controlButtonSecondary}`}
              onClick={handleStopSimulation}
            >
              ⏹ Stop
            </button>
          </>
        )}

        {simulationState === "complete" && (
          <button
            className={`${styles.controlButton} ${styles.controlButtonPrimary}`}
            onClick={handleResetSimulation}
          >
            ↻ Reset
          </button>
        )}

        <div className={styles.statusCard}>
          <div className={styles.statusLabel}>Generation</div>
          <div className={styles.statusValue}>
            {currentGeneration} / {parameters.generations}
          </div>
        </div>

        <div className={styles.statusCard}>
          <div className={styles.statusLabel}>Progress</div>
          <div className={styles.statusValue}>
            {((currentGeneration / parameters.generations) * 100).toFixed(1)}%
          </div>
        </div>

        {generations.length > 0 && (
          <div className={styles.statusCard}>
            <div className={styles.statusLabel}>Best Fitness</div>
            <div className={styles.statusValue}>
              {generations[generations.length - 1].bestFitness.toFixed(4)}
            </div>
          </div>
        )}
      </div>

      {/* Viewer Panel */}
      <div className={styles.viewerPanel}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <div className={styles.sectionIcon}>👁</div>
            Live Preview
          </div>
        </div>
        <div className={styles.viewerFrame}>
          {/* TODO: Add WorkflowGeometryViewer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--ink-500)",
              fontSize: "11px",
            }}
          >
            Geometry viewer will display best individual here
          </div>
        </div>
      </div>

      {/* Stats Panel */}
      <div className={styles.statsPanel}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <div className={styles.sectionIcon}>📊</div>
            Statistics
          </div>
        </div>

        <div className={styles.chartContainer}>
          {/* TODO: Add fitness chart */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--ink-500)",
              fontSize: "11px",
            }}
          >
            Fitness evolution chart
          </div>
        </div>

        {generations.length > 0 && (
          <>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Best Fitness</span>
              <span className={styles.statValue}>
                {generations[generations.length - 1].bestFitness.toFixed(4)}
              </span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Avg Fitness</span>
              <span className={styles.statValue}>
                {generations[generations.length - 1].avgFitness.toFixed(4)}
              </span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Worst Fitness</span>
              <span className={styles.statValue}>
                {generations[generations.length - 1].worstFitness.toFixed(4)}
              </span>
            </div>
          </>
        )}

        <div className={styles.sectionHeader} style={{ marginTop: "12px" }}>
          <div className={styles.sectionTitle}>
            <div className={styles.sectionIcon}>👥</div>
            Current Population
          </div>
        </div>

        <div className={styles.populationGrid}>
          {Array.from({ length: parameters.populationSize }).map((_, i) => (
            <div
              key={i}
              className={`${styles.individualCard} ${i === 0 ? styles.individualCardBest : ""}`}
            >
              <div className={styles.individualRank}>#{i + 1}</div>
              <div className={styles.individualFitness}>
                {i === 0 && generations.length > 0
                  ? generations[generations.length - 1].bestFitness.toFixed(2)
                  : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderOutputPage = () => (
    <div className={styles.outputLayout}>
      {/* Generation List */}
      <div className={styles.generationList}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <div className={styles.sectionIcon}>📜</div>
            Generations
          </div>
        </div>
        {generations.map((gen, index) => (
          <div
            key={gen.number}
            className={`${styles.generationItem} ${selectedGenerationIndex === index ? styles.generationItemSelected : ""}`}
            onClick={() => setSelectedGenerationIndex(index)}
          >
            <div className={styles.generationNumber}>Generation {gen.number}</div>
            <div className={styles.generationFitness}>
              Best: {gen.bestFitness.toFixed(4)}
            </div>
          </div>
        ))}
        {generations.length === 0 && (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "var(--ink-500)",
              fontSize: "11px",
            }}
          >
            No generations yet. Run simulation to generate results.
          </div>
        )}
      </div>

      {/* Output Panel */}
      <div className={styles.outputPanel}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <div className={styles.sectionIcon}>🎯</div>
            Best Individuals
          </div>
        </div>
        <div className={styles.outputGrid}>
          {selectedGenerationIndex !== null &&
            generations[selectedGenerationIndex]?.population
              .slice(0, 10)
              .map((individual, index) => (
                <div key={individual.id} className={styles.outputCard}>
                  <div className={styles.outputPreview}>
                    {/* TODO: Add geometry preview */}
                    <div
                      style={{
                        fontSize: "24px",
                        color: "var(--ink-300)",
                      }}
                    >
                      #{index + 1}
                    </div>
                  </div>
                  <div className={styles.outputInfo}>
                    <div className={styles.outputLabel}>Fitness</div>
                    <div className={styles.outputValue}>
                      {individual.fitness.toFixed(4)}
                    </div>
                  </div>
                  <div className={styles.outputInfo}>
                    <div className={styles.outputLabel}>Genome</div>
                    <div
                      className={styles.outputValue}
                      style={{ fontSize: "9px", wordBreak: "break-all" }}
                    >
                      {Object.entries(individual.genome)
                        .map(([k, v]) => `${k}:${v.toFixed(2)}`)
                        .join(" ")}
                    </div>
                  </div>
                </div>
              ))}
          {(selectedGenerationIndex === null || generations.length === 0) && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "40px",
                textAlign: "center",
                color: "var(--ink-500)",
                fontSize: "11px",
              }}
            >
              Select a generation to view best individuals
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const panel = (
    <div
      className={styles.panel}
      style={{ ["--solver-scale" as string]: uiScale.toString() } as CSSProperties}
      onClick={(event) => event.stopPropagation()}
    >
      <div className={styles.panelContent}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.title}>Evolutionary Solver Simulator</div>
            <div className={styles.subtitle}>
              Ἐπιλύτης Ἐξελικτικός · Evolutionary Optimization
            </div>
            <p className={styles.description}>{DASHBOARD_DESCRIPTION}</p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.scaleControl} title="Scale the dashboard UI">
              <span>Scale</span>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={uiScale}
                onChange={(e) => setUiScale(parseFloat(e.target.value))}
                className={styles.scaleRange}
              />
              <span className={styles.scaleValue}>{scalePercent}%</span>
            </div>
            <WebGLButton
              label="Close"
              onClick={onClose}
              iconStyle={POPUP_ICON_STYLE}
              size="small"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabNav}>
          <button
            className={`${styles.tab} ${activeTab === "setup" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("setup")}
          >
            ⚙ Setup
          </button>
          <button
            className={`${styles.tab} ${activeTab === "simulator" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("simulator")}
          >
            ▶ Simulator
          </button>
          <button
            className={`${styles.tab} ${activeTab === "output" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("output")}
          >
            🎯 Output
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {activeTab === "setup" && renderSetupPage()}
          {activeTab === "simulator" && renderSimulatorPage()}
          {activeTab === "output" && renderOutputPage()}
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      {panel}
    </div>,
    document.body
  );
};

export default EvolutionarySimulatorDashboard;
