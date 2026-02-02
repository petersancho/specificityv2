import React, { useState, useEffect } from 'react';
import styles from './PhysicsSimulatorDashboard.module.css';

type AnalysisType = 'static' | 'dynamic' | 'modal';

type MaterialProperties = {
  youngsModulus: number;
  poissonsRatio: number;
  density: number;
};

type Load = {
  type: 'point' | 'distributed' | 'body';
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  magnitude: number;
};

type Constraint = {
  type: 'fixed' | 'pinned' | 'roller';
  position: { x: number; y: number; z: number };
  normal?: { x: number; y: number; z: number };
};

type SimulationState = {
  isRunning: boolean;
  isPaused: boolean;
  currentIteration: number;
  maxIterations: number;
  maxStress: number;
  maxDisplacement: number;
  convergence: number;
};

type PhysicsSimulatorDashboardProps = {
  nodeId: string;
  onClose: () => void;
};

export const PhysicsSimulatorDashboard: React.FC<PhysicsSimulatorDashboardProps> = ({
  nodeId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'setup' | 'simulator' | 'output'>('setup');
  const [scale, setScale] = useState(100);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('static');
  const [materialProps, setMaterialProps] = useState<MaterialProperties>({
    youngsModulus: 200e9,
    poissonsRatio: 0.3,
    density: 7850,
  });
  const [loads, setLoads] = useState<Load[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [maxIterations, setMaxIterations] = useState(1000);
  const [convergenceTolerance, setConvergenceTolerance] = useState(1e-6);
  const [timeStep, setTimeStep] = useState(0.01);
  const [animationFrames, setAnimationFrames] = useState(60);
  const [simulationState, setSimulationState] = useState<SimulationState>({
    isRunning: false,
    isPaused: false,
    currentIteration: 0,
    maxIterations: 1000,
    maxStress: 0,
    maxDisplacement: 0,
    convergence: 0,
  });

  const handleStart = () => {
    setSimulationState((prev) => ({ ...prev, isRunning: true, isPaused: false }));
  };

  const handlePause = () => {
    setSimulationState((prev) => ({ ...prev, isPaused: true }));
  };

  const handleResume = () => {
    setSimulationState((prev) => ({ ...prev, isPaused: false }));
  };

  const handleStop = () => {
    setSimulationState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
    }));
  };

  const handleReset = () => {
    setSimulationState({
      isRunning: false,
      isPaused: false,
      currentIteration: 0,
      maxIterations: 1000,
      maxStress: 0,
      maxDisplacement: 0,
      convergence: 0,
    });
  };

  const addLoad = (type: Load['type']) => {
    setLoads([
      ...loads,
      {
        type,
        position: { x: 0, y: 0, z: 0 },
        direction: { x: 0, y: -1, z: 0 },
        magnitude: 1000,
      },
    ]);
  };

  const removeLoad = (index: number) => {
    setLoads(loads.filter((_, i) => i !== index));
  };

  const addConstraint = (type: Constraint['type']) => {
    setConstraints([
      ...constraints,
      {
        type,
        position: { x: 0, y: 0, z: 0 },
        normal: type === 'roller' ? { x: 0, y: 1, z: 0 } : undefined,
      },
    ]);
  };

  const removeConstraint = (index: number) => {
    setConstraints(constraints.filter((_, i) => i !== index));
  };

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
          className={`${styles.tab} ${activeTab === 'setup' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('setup')}
        >
          Setup
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'simulator' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          Simulator
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'output' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('output')}
        >
          Output
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'setup' && (
          <div className={styles.setupTab}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Analysis Type</h3>
              <div className={styles.analysisTypeGrid}>
                <button
                  className={`${styles.analysisTypeButton} ${analysisType === 'static' ? styles.analysisTypeButtonActive : ''}`}
                  onClick={() => setAnalysisType('static')}
                >
                  <div className={styles.analysisTypeIcon}>⚖</div>
                  <div className={styles.analysisTypeName}>Static</div>
                  <div className={styles.analysisTypeDesc}>Equilibrium analysis</div>
                </button>
                <button
                  className={`${styles.analysisTypeButton} ${analysisType === 'dynamic' ? styles.analysisTypeButtonActive : ''}`}
                  onClick={() => setAnalysisType('dynamic')}
                >
                  <div className={styles.analysisTypeIcon}>⚡</div>
                  <div className={styles.analysisTypeName}>Dynamic</div>
                  <div className={styles.analysisTypeDesc}>Time-dependent</div>
                </button>
                <button
                  className={`${styles.analysisTypeButton} ${analysisType === 'modal' ? styles.analysisTypeButtonActive : ''}`}
                  onClick={() => setAnalysisType('modal')}
                >
                  <div className={styles.analysisTypeIcon}>〰</div>
                  <div className={styles.analysisTypeName}>Modal</div>
                  <div className={styles.analysisTypeDesc}>Vibration modes</div>
                </button>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Material Properties</h3>
              <div className={styles.materialPropsGrid}>
                <label>
                  Young's Modulus (Pa):
                  <input
                    type="number"
                    value={materialProps.youngsModulus}
                    onChange={(e) =>
                      setMaterialProps({ ...materialProps, youngsModulus: Number(e.target.value) })
                    }
                    step="1e9"
                  />
                  <span className={styles.hint}>{(materialProps.youngsModulus / 1e9).toFixed(0)} GPa</span>
                </label>
                <label>
                  Poisson's Ratio:
                  <input
                    type="number"
                    value={materialProps.poissonsRatio}
                    onChange={(e) =>
                      setMaterialProps({ ...materialProps, poissonsRatio: Number(e.target.value) })
                    }
                    step="0.01"
                    min="0"
                    max="0.5"
                  />
                </label>
                <label>
                  Density (kg/m³):
                  <input
                    type="number"
                    value={materialProps.density}
                    onChange={(e) =>
                      setMaterialProps({ ...materialProps, density: Number(e.target.value) })
                    }
                    step="100"
                  />
                </label>
              </div>
            </div>

            <div className={styles.twoColumn}>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Load Application</h3>
                <div className={styles.loadButtons}>
                  <button className={styles.addButton} onClick={() => addLoad('point')}>
                    + Point Force
                  </button>
                  <button className={styles.addButton} onClick={() => addLoad('distributed')}>
                    + Distributed Load
                  </button>
                  <button className={styles.addButton} onClick={() => addLoad('body')}>
                    + Body Force
                  </button>
                </div>
                <div className={styles.loadList}>
                  {loads.map((load, index) => (
                    <div key={index} className={styles.loadCard}>
                      <div className={styles.loadHeader}>
                        <span>
                          {load.type.charAt(0).toUpperCase() + load.type.slice(1)} Load {index + 1}
                        </span>
                        <button className={styles.removeButton} onClick={() => removeLoad(index)}>
                          ✕
                        </button>
                      </div>
                      <div className={styles.loadControls}>
                        <label>
                          Magnitude (N):
                          <input
                            type="number"
                            value={load.magnitude}
                            onChange={(e) => {
                              const newLoads = [...loads];
                              newLoads[index].magnitude = Number(e.target.value);
                              setLoads(newLoads);
                            }}
                            step="100"
                          />
                        </label>
                        <div className={styles.vectorInput}>
                          <span>Direction:</span>
                          <input
                            type="number"
                            placeholder="X"
                            value={load.direction.x}
                            onChange={(e) => {
                              const newLoads = [...loads];
                              newLoads[index].direction.x = Number(e.target.value);
                              setLoads(newLoads);
                            }}
                            step="0.1"
                          />
                          <input
                            type="number"
                            placeholder="Y"
                            value={load.direction.y}
                            onChange={(e) => {
                              const newLoads = [...loads];
                              newLoads[index].direction.y = Number(e.target.value);
                              setLoads(newLoads);
                            }}
                            step="0.1"
                          />
                          <input
                            type="number"
                            placeholder="Z"
                            value={load.direction.z}
                            onChange={(e) => {
                              const newLoads = [...loads];
                              newLoads[index].direction.z = Number(e.target.value);
                              setLoads(newLoads);
                            }}
                            step="0.1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Constraint Definition</h3>
                <div className={styles.constraintButtons}>
                  <button className={styles.addButton} onClick={() => addConstraint('fixed')}>
                    + Fixed
                  </button>
                  <button className={styles.addButton} onClick={() => addConstraint('pinned')}>
                    + Pinned
                  </button>
                  <button className={styles.addButton} onClick={() => addConstraint('roller')}>
                    + Roller
                  </button>
                </div>
                <div className={styles.constraintList}>
                  {constraints.map((constraint, index) => (
                    <div key={index} className={styles.constraintCard}>
                      <div className={styles.constraintHeader}>
                        <span>
                          {constraint.type.charAt(0).toUpperCase() + constraint.type.slice(1)}{' '}
                          Constraint {index + 1}
                        </span>
                        <button
                          className={styles.removeButton}
                          onClick={() => removeConstraint(index)}
                        >
                          ✕
                        </button>
                      </div>
                      <div className={styles.constraintInfo}>
                        {constraint.type === 'fixed' && 'All DOF constrained'}
                        {constraint.type === 'pinned' && 'Translation constrained'}
                        {constraint.type === 'roller' && 'Normal constrained'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Solver Parameters</h3>
              <div className={styles.solverParamsGrid}>
                <label>
                  Max Iterations:
                  <input
                    type="number"
                    value={maxIterations}
                    onChange={(e) => setMaxIterations(Number(e.target.value))}
                    min="10"
                    max="100000"
                    step="100"
                  />
                </label>
                <label>
                  Convergence Tolerance:
                  <input
                    type="number"
                    value={convergenceTolerance}
                    onChange={(e) => setConvergenceTolerance(Number(e.target.value))}
                    step="1e-7"
                    min="1e-12"
                    max="1e-2"
                  />
                  <span className={styles.hint}>{convergenceTolerance.toExponential(1)}</span>
                </label>
                {analysisType === 'dynamic' && (
                  <>
                    <label>
                      Time Step (s):
                      <input
                        type="number"
                        value={timeStep}
                        onChange={(e) => setTimeStep(Number(e.target.value))}
                        step="0.001"
                        min="0.001"
                        max="1"
                      />
                    </label>
                    <label>
                      Animation Frames:
                      <input
                        type="number"
                        value={animationFrames}
                        onChange={(e) => setAnimationFrames(Number(e.target.value))}
                        min="10"
                        max="300"
                        step="10"
                      />
                    </label>
                  </>
                )}
                {analysisType === 'modal' && (
                  <label>
                    Animation Frames:
                    <input
                      type="number"
                      value={animationFrames}
                      onChange={(e) => setAnimationFrames(Number(e.target.value))}
                      min="10"
                      max="300"
                      step="10"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'simulator' && (
          <div className={styles.simulatorTab}>
            <div className={styles.controlPanel}>
              <button
                className={styles.controlButton}
                onClick={handleStart}
                disabled={simulationState.isRunning && !simulationState.isPaused}
              >
                ▶ Start
              </button>
              <button
                className={styles.controlButton}
                onClick={handlePause}
                disabled={!simulationState.isRunning || simulationState.isPaused}
              >
                ⏸ Pause
              </button>
              <button
                className={styles.controlButton}
                onClick={handleResume}
                disabled={!simulationState.isPaused}
              >
                ▶ Resume
              </button>
              <button
                className={styles.controlButton}
                onClick={handleStop}
                disabled={!simulationState.isRunning}
              >
                ⏹ Stop
              </button>
              <button className={styles.controlButton} onClick={handleReset}>
                ↻ Reset
              </button>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Iteration</div>
                <div className={styles.statValue}>
                  {simulationState.currentIteration} / {simulationState.maxIterations}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Max Stress</div>
                <div className={styles.statValue}>
                  {(simulationState.maxStress / 1e6).toFixed(2)} MPa
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Max Displacement</div>
                <div className={styles.statValue}>
                  {(simulationState.maxDisplacement * 1000).toFixed(3)} mm
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Convergence</div>
                <div className={styles.statValue}>
                  {(simulationState.convergence * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className={styles.mainVisualization}>
              <div className={styles.visualizationCard}>
                <h4>Stress Visualization</h4>
                <div className={styles.stressPlaceholder}>
                  <div className={styles.placeholderText}>Colored Gradient Mesh</div>
                  <div className={styles.placeholderSubtext}>
                    Von Mises stress distribution (blue → green → yellow → red)
                  </div>
                </div>
                <div className={styles.stressLegend}>
                  <div className={styles.legendBar} />
                  <div className={styles.legendLabels}>
                    <span>0 MPa</span>
                    <span>Max Stress</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.secondaryVisualizationGrid}>
              <div className={styles.visualizationCard}>
                <h4>Stress Distribution</h4>
                <div className={styles.placeholder}>
                  <div className={styles.placeholderText}>Histogram</div>
                  <div className={styles.placeholderSubtext}>Stress value distribution</div>
                </div>
              </div>
              <div className={styles.visualizationCard}>
                <h4>Displacement Vectors</h4>
                <div className={styles.placeholder}>
                  <div className={styles.placeholderText}>Vector Field</div>
                  <div className={styles.placeholderSubtext}>Displacement magnitude and direction</div>
                </div>
              </div>
            </div>

            <div className={styles.criticalPoints}>
              <h4>Critical Points</h4>
              <div className={styles.criticalPointsList}>
                <div className={styles.criticalPointCard}>
                  <div className={styles.criticalPointIcon}>⚠</div>
                  <div className={styles.criticalPointInfo}>
                    <div className={styles.criticalPointLabel}>Max Stress Location</div>
                    <div className={styles.criticalPointValue}>Position: (0.5, 0.3, 0.2)</div>
                  </div>
                </div>
                <div className={styles.criticalPointCard}>
                  <div className={styles.criticalPointIcon}>⚠</div>
                  <div className={styles.criticalPointInfo}>
                    <div className={styles.criticalPointLabel}>Max Displacement Location</div>
                    <div className={styles.criticalPointValue}>Position: (0.8, 0.1, 0.4)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'output' && (
          <div className={styles.outputTab}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Deformed Geometry</h3>
              <div className={styles.deformedPreview}>
                <div className={styles.placeholder}>
                  <div className={styles.placeholderText}>Deformed Mesh</div>
                  <div className={styles.placeholderSubtext}>
                    Overlay with original geometry (deformation scale factor: 10x)
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.twoColumn}>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Stress Field Analysis</h3>
                <div className={styles.analysisCard}>
                  <div className={styles.analysisRow}>
                    <span>Von Mises Stress (Max):</span>
                    <span className={styles.analysisValue}>245.3 MPa</span>
                  </div>
                  <div className={styles.analysisRow}>
                    <span>Principal Stress 1:</span>
                    <span className={styles.analysisValue}>198.7 MPa</span>
                  </div>
                  <div className={styles.analysisRow}>
                    <span>Principal Stress 2:</span>
                    <span className={styles.analysisValue}>-45.2 MPa</span>
                  </div>
                  <div className={styles.analysisRow}>
                    <span>Principal Stress 3:</span>
                    <span className={styles.analysisValue}>-12.8 MPa</span>
                  </div>
                  <div className={styles.analysisRow}>
                    <span>Shear Stress (Max):</span>
                    <span className={styles.analysisValue}>87.4 MPa</span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Displacement Field Analysis</h3>
                <div className={styles.analysisCard}>
                  <div className={styles.analysisRow}>
                    <span>Max Displacement:</span>
                    <span className={styles.analysisValue}>2.34 mm</span>
                  </div>
                  <div className={styles.analysisRow}>
                    <span>X Component (Max):</span>
                    <span className={styles.analysisValue}>0.87 mm</span>
                  </div>
                  <div className={styles.analysisRow}>
                    <span>Y Component (Max):</span>
                    <span className={styles.analysisValue}>1.92 mm</span>
                  </div>
                  <div className={styles.analysisRow}>
                    <span>Z Component (Max):</span>
                    <span className={styles.analysisValue}>0.45 mm</span>
                  </div>
                </div>
              </div>
            </div>

            {analysisType === 'modal' && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Modal Shapes</h3>
                <div className={styles.modalGrid}>
                  {[1, 2, 3, 4, 5, 6].map((mode) => (
                    <div key={mode} className={styles.modalCard}>
                      <h4>Mode {mode}</h4>
                      <div className={styles.placeholder}>
                        <div className={styles.placeholderText}>Mode Shape</div>
                      </div>
                      <div className={styles.modalFrequency}>f = {(mode * 12.5).toFixed(1)} Hz</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Safety Factor Analysis</h3>
              <div className={styles.safetyCard}>
                <div className={styles.safetyRow}>
                  <span>Yield Strength:</span>
                  <span className={styles.safetyValue}>250 MPa</span>
                </div>
                <div className={styles.safetyRow}>
                  <span>Max Stress:</span>
                  <span className={styles.safetyValue}>245.3 MPa</span>
                </div>
                <div className={styles.safetyRow}>
                  <span>Factor of Safety:</span>
                  <span className={`${styles.safetyValue} ${styles.safetyWarning}`}>1.02</span>
                </div>
                <div className={styles.safetyWarningBox}>
                  ⚠ Warning: Factor of safety is below recommended minimum (1.5)
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Export Options</h3>
              <div className={styles.exportButtons}>
                <button className={styles.exportButton}>Export Deformed Mesh (STL)</button>
                <button className={styles.exportButton}>Export Deformed Mesh (OBJ)</button>
                <button className={styles.exportButton}>Export Stress Data (CSV)</button>
                <button className={styles.exportButton}>Export Stress Data (VTK)</button>
                {analysisType === 'dynamic' && (
                  <button className={styles.exportButton}>Export Animation (MP4)</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
