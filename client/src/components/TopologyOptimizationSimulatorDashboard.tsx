import React, { useState, useEffect } from "react";
import styles from "./TopologyOptimizationSimulatorDashboard.module.css";

interface TopologyOptimizationSimulatorDashboardProps {
  nodeId: string;
  onClose: () => void;
}

type SimulationState = "idle" | "running" | "paused" | "complete";

interface SimulationData {
  pointCount: number;
  curveCount: number;
  volume: number;
  surfaceArea: number;
  progress: number;
  currentStep: "pointCloud" | "curveNetwork" | "multipipe" | "complete";
}

export const TopologyOptimizationSimulatorDashboard: React.FC<
  TopologyOptimizationSimulatorDashboardProps
> = ({ nodeId, onClose }) => {
  const [activeTab, setActiveTab] = useState<"setup" | "simulator" | "output">("setup");
  const [simulationState, setSimulationState] = useState<SimulationState>("idle");
  const [scale, setScale] = useState(75);

  // Simulation parameters
  const [pointDensity, setPointDensity] = useState(100);
  const [connectionRadius, setConnectionRadius] = useState(0.5);
  const [pipeRadius, setPipeRadius] = useState(0.05);
  const [seed, setSeed] = useState(42);

  // Simulation data
  const [simulationData, setSimulationData] = useState<SimulationData>({
    pointCount: 0,
    curveCount: 0,
    volume: 0,
    surfaceArea: 0,
    progress: 0,
    currentStep: "pointCloud",
  });

  const handleStart = () => {
    setSimulationState("running");
    setSimulationData({
      pointCount: 0,
      curveCount: 0,
      volume: 0,
      surfaceArea: 0,
      progress: 0,
      currentStep: "pointCloud",
    });

    // Simulate topology optimization process
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      
      let currentStep: SimulationData["currentStep"] = "pointCloud";
      if (progress > 75) currentStep = "multipipe";
      else if (progress > 50) currentStep = "curveNetwork";
      else if (progress > 25) currentStep = "pointCloud";

      setSimulationData({
        pointCount: Math.min(pointDensity, Math.floor((progress / 100) * pointDensity)),
        curveCount: Math.min(
          Math.floor(pointDensity * 2.5),
          Math.floor((progress / 100) * pointDensity * 2.5)
        ),
        volume: progress > 75 ? Math.random() * 10 + 5 : 0,
        surfaceArea: progress > 75 ? Math.random() * 50 + 25 : 0,
        progress,
        currentStep,
      });

      if (progress >= 100) {
        clearInterval(interval);
        setSimulationState("complete");
      }
    }, 100);
  };

  const handlePause = () => {
    setSimulationState("paused");
  };

  const handleResume = () => {
    setSimulationState("running");
  };

  const handleReset = () => {
    setSimulationState("idle");
    setSimulationData({
      pointCount: 0,
      curveCount: 0,
      volume: 0,
      surfaceArea: 0,
      progress: 0,
      currentStep: "pointCloud",
    });
  };

  return (
    <div className={styles.dashboardOverlay}>
      <div className={styles.dashboardContainer} style={{ transform: `scale(${scale / 100})` }}>
        {/* Header */}
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

        {/* Tab Navigation */}
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

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {/* Setup Tab */}
          {activeTab === "setup" && (
            <div className={styles.setupTab}>
              <div className={styles.setupSection}>
                <h3 className={styles.sectionTitle}>Algorithm Parameters</h3>
                <div className={styles.parameterGrid}>
                  <div className={styles.parameterCard}>
                    <label className={styles.parameterLabel}>Point Density</label>
                    <input
                      type="range"
                      min="10"
                      max="1000"
                      step="10"
                      value={pointDensity}
                      onChange={(e) => setPointDensity(Number(e.target.value))}
                      className={styles.slider}
                    />
                    <span className={styles.parameterValue}>{pointDensity} points</span>
                    <p className={styles.parameterDescription}>
                      Number of points to sample from geometry surface
                    </p>
                  </div>

                  <div className={styles.parameterCard}>
                    <label className={styles.parameterLabel}>Connection Radius</label>
                    <input
                      type="range"
                      min="0.01"
                      max="5.0"
                      step="0.01"
                      value={connectionRadius}
                      onChange={(e) => setConnectionRadius(Number(e.target.value))}
                      className={styles.slider}
                    />
                    <span className={styles.parameterValue}>{connectionRadius.toFixed(2)}</span>
                    <p className={styles.parameterDescription}>
                      3D proximity threshold for connecting points
                    </p>
                  </div>

                  <div className={styles.parameterCard}>
                    <label className={styles.parameterLabel}>Pipe Radius</label>
                    <input
                      type="range"
                      min="0.01"
                      max="1.0"
                      step="0.01"
                      value={pipeRadius}
                      onChange={(e) => setPipeRadius(Number(e.target.value))}
                      className={styles.slider}
                    />
                    <span className={styles.parameterValue}>{pipeRadius.toFixed(2)}</span>
                    <p className={styles.parameterDescription}>
                      Radius for multipipe operation
                    </p>
                  </div>

                  <div className={styles.parameterCard}>
                    <label className={styles.parameterLabel}>Random Seed</label>
                    <input
                      type="number"
                      min="0"
                      max="9999"
                      value={seed}
                      onChange={(e) => setSeed(Number(e.target.value))}
                      className={styles.numberInput}
                    />
                    <p className={styles.parameterDescription}>
                      Random seed for point generation
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.setupSection}>
                <h3 className={styles.sectionTitle}>Algorithm Overview</h3>
                <div className={styles.algorithmSteps}>
                  <div className={styles.algorithmStep}>
                    <div className={styles.stepNumber}>1</div>
                    <div className={styles.stepContent}>
                      <h4 className={styles.stepTitle}>Point Cloud Generation</h4>
                      <p className={styles.stepDescription}>
                        Sample {pointDensity} points from geometry surface using stratified sampling
                      </p>
                    </div>
                  </div>
                  <div className={styles.algorithmStep}>
                    <div className={styles.stepNumber}>2</div>
                    <div className={styles.stepContent}>
                      <h4 className={styles.stepTitle}>Curve Network Generation</h4>
                      <p className={styles.stepDescription}>
                        Connect points within {connectionRadius.toFixed(2)} radius to form curve network
                      </p>
                    </div>
                  </div>
                  <div className={styles.algorithmStep}>
                    <div className={styles.stepNumber}>3</div>
                    <div className={styles.stepContent}>
                      <h4 className={styles.stepTitle}>Multipipe Operation</h4>
                      <p className={styles.stepDescription}>
                        Generate pipes with radius {pipeRadius.toFixed(2)} along curve network
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.setupSection}>
                <h3 className={styles.sectionTitle}>Geometry Preview</h3>
                <div className={styles.geometryPreview}>
                  <div className={styles.previewPlaceholder}>
                    <span className={styles.previewIcon}>🔷</span>
                    <p className={styles.previewText}>Input geometry will be displayed here</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Simulator Tab */}
          {activeTab === "simulator" && (
            <div className={styles.simulatorTab}>
              <div className={styles.controlPanel}>
                <div className={styles.controlButtons}>
                  {simulationState === "idle" && (
                    <button className={styles.startButton} onClick={handleStart}>
                      ▶ Start Optimization
                    </button>
                  )}
                  {simulationState === "running" && (
                    <button className={styles.pauseButton} onClick={handlePause}>
                      ⏸ Pause
                    </button>
                  )}
                  {simulationState === "paused" && (
                    <button className={styles.resumeButton} onClick={handleResume}>
                      ▶ Resume
                    </button>
                  )}
                  {(simulationState === "running" ||
                    simulationState === "paused" ||
                    simulationState === "complete") && (
                    <button className={styles.resetButton} onClick={handleReset}>
                      ⟲ Reset
                    </button>
                  )}
                </div>

                <div className={styles.progressSection}>
                  <div className={styles.progressHeader}>
                    <span className={styles.progressLabel}>Progress</span>
                    <span className={styles.progressPercent}>{simulationData.progress.toFixed(0)}%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${simulationData.progress}%` }}
                    />
                  </div>
                  <div className={styles.currentStep}>
                    Current Step: <strong>{simulationData.currentStep}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.visualizationGrid}>
                <div className={styles.visualizationCard}>
                  <h4 className={styles.visualizationTitle}>Point Cloud</h4>
                  <div className={styles.pointCloudViz}>
                    {Array.from({ length: Math.min(50, simulationData.pointCount) }).map((_, i) => (
                      <div
                        key={i}
                        className={styles.point}
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          animationDelay: `${i * 0.02}s`,
                        }}
                      />
                    ))}
                  </div>
                  <p className={styles.vizStats}>{simulationData.pointCount} points generated</p>
                </div>

                <div className={styles.visualizationCard}>
                  <h4 className={styles.visualizationTitle}>Curve Network</h4>
                  <div className={styles.curveNetworkViz}>
                    <svg className={styles.networkSvg} viewBox="0 0 200 200">
                      {Array.from({ length: Math.min(30, simulationData.curveCount) }).map((_, i) => {
                        const x1 = Math.random() * 200;
                        const y1 = Math.random() * 200;
                        const x2 = Math.random() * 200;
                        const y2 = Math.random() * 200;
                        return (
                          <line
                            key={i}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            className={styles.networkLine}
                            style={{ animationDelay: `${i * 0.03}s` }}
                          />
                        );
                      })}
                    </svg>
                  </div>
                  <p className={styles.vizStats}>{simulationData.curveCount} curves generated</p>
                </div>

                <div className={styles.visualizationCard}>
                  <h4 className={styles.visualizationTitle}>Optimized Structure</h4>
                  <div className={styles.structureViz}>
                    {simulationData.progress > 75 && (
                      <div className={styles.structureMesh}>
                        <div className={styles.meshWireframe} />
                      </div>
                    )}
                    {simulationData.progress <= 75 && (
                      <p className={styles.vizPlaceholder}>Generating structure...</p>
                    )}
                  </div>
                  <p className={styles.vizStats}>
                    {simulationData.progress > 75 ? "Structure complete" : "In progress..."}
                  </p>
                </div>
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Points</div>
                  <div className={styles.statValue}>{simulationData.pointCount}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Curves</div>
                  <div className={styles.statValue}>{simulationData.curveCount}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Volume</div>
                  <div className={styles.statValue}>
                    {simulationData.volume > 0 ? simulationData.volume.toFixed(2) : "—"}
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Surface Area</div>
                  <div className={styles.statValue}>
                    {simulationData.surfaceArea > 0 ? simulationData.surfaceArea.toFixed(2) : "—"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Output Tab */}
          {activeTab === "output" && (
            <div className={styles.outputTab}>
              <div className={styles.outputSection}>
                <h3 className={styles.sectionTitle}>Optimized Structure</h3>
                <div className={styles.outputPreview}>
                  {simulationState === "complete" ? (
                    <div className={styles.previewMesh}>
                      <div className={styles.meshVisualization} />
                      <p className={styles.previewCaption}>Topologically optimized structure</p>
                    </div>
                  ) : (
                    <div className={styles.previewPlaceholder}>
                      <span className={styles.previewIcon}>🔷</span>
                      <p className={styles.previewText}>
                        Run simulation to generate optimized structure
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.outputSection}>
                <h3 className={styles.sectionTitle}>Statistics</h3>
                <div className={styles.outputStatsGrid}>
                  <div className={styles.outputStatCard}>
                    <div className={styles.outputStatLabel}>Point Count</div>
                    <div className={styles.outputStatValue}>{simulationData.pointCount}</div>
                  </div>
                  <div className={styles.outputStatCard}>
                    <div className={styles.outputStatLabel}>Curve Count</div>
                    <div className={styles.outputStatValue}>{simulationData.curveCount}</div>
                  </div>
                  <div className={styles.outputStatCard}>
                    <div className={styles.outputStatLabel}>Volume</div>
                    <div className={styles.outputStatValue}>
                      {simulationData.volume > 0 ? simulationData.volume.toFixed(3) : "—"}
                    </div>
                  </div>
                  <div className={styles.outputStatCard}>
                    <div className={styles.outputStatLabel}>Surface Area</div>
                    <div className={styles.outputStatValue}>
                      {simulationData.surfaceArea > 0 ? simulationData.surfaceArea.toFixed(3) : "—"}
                    </div>
                  </div>
                  <div className={styles.outputStatCard}>
                    <div className={styles.outputStatLabel}>Volume/Surface Ratio</div>
                    <div className={styles.outputStatValue}>
                      {simulationData.volume > 0 && simulationData.surfaceArea > 0
                        ? (simulationData.volume / simulationData.surfaceArea).toFixed(3)
                        : "—"}
                    </div>
                  </div>
                  <div className={styles.outputStatCard}>
                    <div className={styles.outputStatLabel}>Connectivity</div>
                    <div className={styles.outputStatValue}>
                      {simulationData.pointCount > 0
                        ? (simulationData.curveCount / simulationData.pointCount).toFixed(2)
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.outputSection}>
                <h3 className={styles.sectionTitle}>Export Options</h3>
                <div className={styles.exportButtons}>
                  <button
                    className={styles.exportButton}
                    disabled={simulationState !== "complete"}
                  >
                    Export Mesh (.obj)
                  </button>
                  <button
                    className={styles.exportButton}
                    disabled={simulationState !== "complete"}
                  >
                    Export Point Cloud (.xyz)
                  </button>
                  <button
                    className={styles.exportButton}
                    disabled={simulationState !== "complete"}
                  >
                    Export Curve Network (.json)
                  </button>
                  <button
                    className={styles.exportButton}
                    disabled={simulationState !== "complete"}
                  >
                    Export Statistics (.csv)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
