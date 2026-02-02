import React, { useState, useEffect } from 'react';
import styles from './ChemistrySimulatorDashboard.module.css';

type MaterialSpec = {
  name: string;
  density: number;
  stiffness: number;
  thermalConductivity: number;
  opticalTransmission: number;
  diffusivity: number;
  color: [number, number, number];
};

type Seed = {
  position: { x: number; y: number; z: number };
  radius: number;
  material: string;
  strength: number;
};

type Goal = {
  type: 'stiffness' | 'mass' | 'transparency' | 'thermal' | 'blend';
  weight: number;
  parameters: Record<string, any>;
};

type SimulationState = {
  isRunning: boolean;
  isPaused: boolean;
  currentIteration: number;
  maxIterations: number;
  energy: number;
  convergence: number;
  particles: Array<{
    position: { x: number; y: number; z: number };
    materials: Record<string, number>;
  }>;
};

type ChemistrySimulatorDashboardProps = {
  nodeId: string;
  onClose: () => void;
};

const MATERIAL_LIBRARY: MaterialSpec[] = [
  {
    name: 'Steel',
    density: 7850,
    stiffness: 200e9,
    thermalConductivity: 50,
    opticalTransmission: 0,
    diffusivity: 0.1,
    color: [0.7, 0.7, 0.75],
  },
  {
    name: 'Aluminum',
    density: 2700,
    stiffness: 69e9,
    thermalConductivity: 237,
    opticalTransmission: 0,
    diffusivity: 0.3,
    color: [0.85, 0.85, 0.9],
  },
  {
    name: 'Copper',
    density: 8960,
    stiffness: 130e9,
    thermalConductivity: 401,
    opticalTransmission: 0,
    diffusivity: 0.2,
    color: [0.95, 0.6, 0.4],
  },
  {
    name: 'Glass',
    density: 2500,
    stiffness: 70e9,
    thermalConductivity: 1,
    opticalTransmission: 0.9,
    diffusivity: 0.05,
    color: [0.8, 0.9, 0.95],
  },
  {
    name: 'Ceramic',
    density: 3800,
    stiffness: 300e9,
    thermalConductivity: 20,
    opticalTransmission: 0.1,
    diffusivity: 0.08,
    color: [0.9, 0.85, 0.8],
  },
  {
    name: 'Titanium',
    density: 4500,
    stiffness: 116e9,
    thermalConductivity: 22,
    opticalTransmission: 0,
    diffusivity: 0.15,
    color: [0.75, 0.75, 0.8],
  },
];

export const ChemistrySimulatorDashboard: React.FC<ChemistrySimulatorDashboardProps> = ({
  nodeId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'setup' | 'simulator' | 'output'>('setup');
  const [scale, setScale] = useState(100);
  const [selectedMaterials, setSelectedMaterials] = useState<MaterialSpec[]>([
    MATERIAL_LIBRARY[0],
    MATERIAL_LIBRARY[1],
  ]);
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [particleCount, setParticleCount] = useState(5000);
  const [blendStrength, setBlendStrength] = useState(0.5);
  const [fieldResolution, setFieldResolution] = useState(32);
  const [isoValue, setIsoValue] = useState(0.5);
  const [simulationState, setSimulationState] = useState<SimulationState>({
    isRunning: false,
    isPaused: false,
    currentIteration: 0,
    maxIterations: 100,
    energy: 1000,
    convergence: 0,
    particles: [],
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
      maxIterations: 100,
      energy: 1000,
      convergence: 0,
      particles: [],
    });
  };

  const addSeed = () => {
    setSeeds([
      ...seeds,
      {
        position: { x: 0, y: 0, z: 0 },
        radius: 1,
        material: selectedMaterials[0]?.name || 'Steel',
        strength: 1,
      },
    ]);
  };

  const removeSeed = (index: number) => {
    setSeeds(seeds.filter((_, i) => i !== index));
  };

  const addGoal = (type: Goal['type']) => {
    setGoals([
      ...goals,
      {
        type,
        weight: 1,
        parameters: {},
      },
    ]);
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const toggleMaterial = (material: MaterialSpec) => {
    if (selectedMaterials.find((m) => m.name === material.name)) {
      setSelectedMaterials(selectedMaterials.filter((m) => m.name !== material.name));
    } else {
      setSelectedMaterials([...selectedMaterials, material]);
    }
  };

  return (
    <div className={styles.dashboard} style={{ fontSize: `${scale}%` }}>
      <div className={styles.header}>
        <div className={styles.headerBar} />
        <div className={styles.headerContent}>
          <div className={styles.title}>
            <span className={styles.titleGreek}>Ἐπιλύτης Χημείας</span>
            <span className={styles.titleEnglish}>Chemistry Solver</span>
            <span className={styles.titleSubtext}>Apollonius · Material Distribution</span>
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
              <h3 className={styles.sectionTitle}>Material Library</h3>
              <div className={styles.materialGrid}>
                {MATERIAL_LIBRARY.map((material) => {
                  const isSelected = selectedMaterials.find((m) => m.name === material.name);
                  return (
                    <div
                      key={material.name}
                      className={`${styles.materialCard} ${isSelected ? styles.materialCardSelected : ''}`}
                      onClick={() => toggleMaterial(material)}
                    >
                      <div
                        className={styles.materialColor}
                        style={{
                          backgroundColor: `rgb(${material.color[0] * 255}, ${material.color[1] * 255}, ${material.color[2] * 255})`,
                        }}
                      />
                      <div className={styles.materialName}>{material.name}</div>
                      <div className={styles.materialProps}>
                        <div>ρ: {(material.density / 1000).toFixed(1)} g/cm³</div>
                        <div>E: {(material.stiffness / 1e9).toFixed(0)} GPa</div>
                        <div>k: {material.thermalConductivity.toFixed(0)} W/mK</div>
                        <div>T: {(material.opticalTransmission * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.twoColumn}>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Material Seeds</h3>
                <button className={styles.addButton} onClick={addSeed}>
                  + Add Seed
                </button>
                <div className={styles.seedList}>
                  {seeds.map((seed, index) => (
                    <div key={index} className={styles.seedCard}>
                      <div className={styles.seedHeader}>
                        <span>Seed {index + 1}</span>
                        <button
                          className={styles.removeButton}
                          onClick={() => removeSeed(index)}
                        >
                          ✕
                        </button>
                      </div>
                      <div className={styles.seedControls}>
                        <label>
                          Material:
                          <select
                            value={seed.material}
                            onChange={(e) => {
                              const newSeeds = [...seeds];
                              newSeeds[index].material = e.target.value;
                              setSeeds(newSeeds);
                            }}
                          >
                            {selectedMaterials.map((m) => (
                              <option key={m.name} value={m.name}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Radius:
                          <input
                            type="number"
                            value={seed.radius}
                            onChange={(e) => {
                              const newSeeds = [...seeds];
                              newSeeds[index].radius = Number(e.target.value);
                              setSeeds(newSeeds);
                            }}
                            step="0.1"
                            min="0.1"
                          />
                        </label>
                        <label>
                          Strength:
                          <input
                            type="range"
                            value={seed.strength}
                            onChange={(e) => {
                              const newSeeds = [...seeds];
                              newSeeds[index].strength = Number(e.target.value);
                              setSeeds(newSeeds);
                            }}
                            min="0"
                            max="1"
                            step="0.1"
                          />
                          <span>{seed.strength.toFixed(1)}</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Optimization Goals</h3>
                <div className={styles.goalButtons}>
                  <button className={styles.goalButton} onClick={() => addGoal('stiffness')}>
                    + Stiffness
                  </button>
                  <button className={styles.goalButton} onClick={() => addGoal('mass')}>
                    + Mass
                  </button>
                  <button className={styles.goalButton} onClick={() => addGoal('transparency')}>
                    + Transparency
                  </button>
                  <button className={styles.goalButton} onClick={() => addGoal('thermal')}>
                    + Thermal
                  </button>
                  <button className={styles.goalButton} onClick={() => addGoal('blend')}>
                    + Blend
                  </button>
                </div>
                <div className={styles.goalList}>
                  {goals.map((goal, index) => (
                    <div key={index} className={styles.goalCard}>
                      <div className={styles.goalHeader}>
                        <span>{goal.type.charAt(0).toUpperCase() + goal.type.slice(1)} Goal</span>
                        <button
                          className={styles.removeButton}
                          onClick={() => removeGoal(index)}
                        >
                          ✕
                        </button>
                      </div>
                      <label>
                        Weight:
                        <input
                          type="range"
                          value={goal.weight}
                          onChange={(e) => {
                            const newGoals = [...goals];
                            newGoals[index].weight = Number(e.target.value);
                            setGoals(newGoals);
                          }}
                          min="0"
                          max="2"
                          step="0.1"
                        />
                        <span>{goal.weight.toFixed(1)}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Simulation Parameters</h3>
              <div className={styles.paramGrid}>
                <label>
                  Particle Count:
                  <input
                    type="number"
                    value={particleCount}
                    onChange={(e) => setParticleCount(Number(e.target.value))}
                    min="100"
                    max="50000"
                    step="100"
                  />
                </label>
                <label>
                  Blend Strength:
                  <input
                    type="range"
                    value={blendStrength}
                    onChange={(e) => setBlendStrength(Number(e.target.value))}
                    min="0"
                    max="1"
                    step="0.05"
                  />
                  <span>{blendStrength.toFixed(2)}</span>
                </label>
                <label>
                  Field Resolution:
                  <input
                    type="number"
                    value={fieldResolution}
                    onChange={(e) => setFieldResolution(Number(e.target.value))}
                    min="16"
                    max="128"
                    step="8"
                  />
                </label>
                <label>
                  Iso Value:
                  <input
                    type="range"
                    value={isoValue}
                    onChange={(e) => setIsoValue(Number(e.target.value))}
                    min="0"
                    max="1"
                    step="0.05"
                  />
                  <span>{isoValue.toFixed(2)}</span>
                </label>
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
                <div className={styles.statLabel}>Energy</div>
                <div className={styles.statValue}>{simulationState.energy.toFixed(2)}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Convergence</div>
                <div className={styles.statValue}>
                  {(simulationState.convergence * 100).toFixed(1)}%
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Particles</div>
                <div className={styles.statValue}>{particleCount.toLocaleString()}</div>
              </div>
            </div>

            <div className={styles.visualizationGrid}>
              <div className={styles.visualizationCard}>
                <h4>Particle Visualization</h4>
                <div className={styles.placeholder}>
                  <div className={styles.placeholderText}>3D Particle View</div>
                  <div className={styles.placeholderSubtext}>
                    Real-time particle positions colored by material
                  </div>
                </div>
              </div>
              <div className={styles.visualizationCard}>
                <h4>Material Distribution</h4>
                <div className={styles.placeholder}>
                  <div className={styles.placeholderText}>Concentration Chart</div>
                  <div className={styles.placeholderSubtext}>
                    Material concentration over time
                  </div>
                </div>
              </div>
              <div className={styles.visualizationCard}>
                <h4>Energy Convergence</h4>
                <div className={styles.placeholder}>
                  <div className={styles.placeholderText}>Energy Graph</div>
                  <div className={styles.placeholderSubtext}>Energy vs iteration</div>
                </div>
              </div>
              <div className={styles.visualizationCard}>
                <h4>Voxel Field Preview</h4>
                <div className={styles.placeholder}>
                  <div className={styles.placeholderText}>Voxel Slices</div>
                  <div className={styles.placeholderSubtext}>Material density heatmap</div>
                </div>
              </div>
            </div>

            <div className={styles.materialLegend}>
              <h4>Material Legend</h4>
              <div className={styles.legendGrid}>
                {selectedMaterials.map((material) => (
                  <div key={material.name} className={styles.legendItem}>
                    <div
                      className={styles.legendColor}
                      style={{
                        backgroundColor: `rgb(${material.color[0] * 255}, ${material.color[1] * 255}, ${material.color[2] * 255})`,
                      }}
                    />
                    <span>{material.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'output' && (
          <div className={styles.outputTab}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Final Mesh</h3>
              <div className={styles.meshPreview}>
                <div className={styles.placeholder}>
                  <div className={styles.placeholderText}>Mesh Preview</div>
                  <div className={styles.placeholderSubtext}>
                    Final mesh colored by material composition
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.twoColumn}>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Material Distribution Analysis</h3>
                <div className={styles.analysisCard}>
                  <div className={styles.placeholder}>
                    <div className={styles.placeholderText}>Distribution Histogram</div>
                    <div className={styles.placeholderSubtext}>Material percentage by region</div>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Gradient Quality Metrics</h3>
                <div className={styles.metricsCard}>
                  <div className={styles.metricRow}>
                    <span>Smoothness Score:</span>
                    <span className={styles.metricValue}>0.85</span>
                  </div>
                  <div className={styles.metricRow}>
                    <span>Transition Zone Width:</span>
                    <span className={styles.metricValue}>2.3 mm</span>
                  </div>
                  <div className={styles.metricRow}>
                    <span>Coagulation Detected:</span>
                    <span className={styles.metricValue}>No</span>
                  </div>
                  <div className={styles.metricRow}>
                    <span>Over-dilution Detected:</span>
                    <span className={styles.metricValue}>No</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Voxel Field Slices</h3>
              <div className={styles.sliceGrid}>
                <div className={styles.sliceCard}>
                  <h4>XY Plane</h4>
                  <div className={styles.placeholder}>
                    <div className={styles.placeholderText}>XY Slice</div>
                  </div>
                </div>
                <div className={styles.sliceCard}>
                  <h4>XZ Plane</h4>
                  <div className={styles.placeholder}>
                    <div className={styles.placeholderText}>XZ Slice</div>
                  </div>
                </div>
                <div className={styles.sliceCard}>
                  <h4>YZ Plane</h4>
                  <div className={styles.placeholder}>
                    <div className={styles.placeholderText}>YZ Slice</div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Export Options</h3>
              <div className={styles.exportButtons}>
                <button className={styles.exportButton}>Export Mesh (STL)</button>
                <button className={styles.exportButton}>Export Mesh (OBJ)</button>
                <button className={styles.exportButton}>Export Voxel Field (VTK)</button>
                <button className={styles.exportButton}>Export Material Data (JSON)</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
