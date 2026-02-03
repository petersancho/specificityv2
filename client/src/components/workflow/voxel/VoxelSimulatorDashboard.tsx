import React, { useState, useMemo } from 'react';
import styles from './VoxelSimulatorDashboard.module.css';
import { useProjectStore } from '../../../store/useProjectStore';

interface VoxelSimulatorDashboardProps {
  nodeId: string;
  onClose: () => void;
}

type TabId = 'setup' | 'simulator' | 'output';

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

export const VoxelSimulatorDashboard: React.FC<VoxelSimulatorDashboardProps> = ({
  nodeId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('setup');
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

  const resolution = toNumber(parameters.resolution, 32);

  const hasGeometry = edges.some(
    (edge) => edge.target === nodeId && edge.targetHandle === "geometry"
  );

  const handleParameterChange = (key: string, value: unknown) => {
    updateNodeData(nodeId, { parameters: { [key]: value } }, { recalculate: false });
  };

  const handleRun = () => {
    recalculateWorkflow();
  };

  const cellCount = toNumber(outputs.cellCount, 0);
  const filledCount = toNumber(outputs.filledCount, 0);
  const fillRatio = toNumber(outputs.fillRatio, 0);
  const voxelGridResolution = Array.isArray(outputs.voxelGrid)
    ? (outputs.voxelGrid as any).resolution
    : null;

  return (
    <div className={styles.dashboard} style={{ fontSize: `${scale}%` }}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerTitle}>
            <span className={styles.headerIcon}>🧊</span>
            <h2>Voxel Solver</h2>
            <span className={styles.headerSubtitle}>Ἐπιλύτης Φογκελ (Archimedes)</span>
          </div>
          <div className={styles.headerActions}>
            <label className={styles.scaleControl}>
              <span>Scale:</span>
              <input
                type="range"
                min="50"
                max="100"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
              />
              <span>{scale}%</span>
            </label>
            <button onClick={onClose} className={styles.closeButton}>×</button>
          </div>
        </div>
        <div className={styles.headerBar} />
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
              <h3>Voxelization Parameters</h3>
              <div className={styles.parameterGrid}>
                <div className={styles.parameter}>
                  <label>
                    <span>Resolution</span>
                    <span className={styles.parameterValue}>{resolution}</span>
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="128"
                    value={resolution}
                    onChange={(e) => handleParameterChange('resolution', Number(e.target.value))}
                    className={styles.slider}
                  />
                  <div className={styles.parameterHint}>
                    Number of voxels along longest axis (4-128)
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3>Connected Inputs</h3>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Geometry</div>
                  <div className={styles.summaryValue}>{hasGeometry ? "Connected" : "Missing"}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'simulator' && (
          <div className={styles.simulatorTab}>
            <div className={styles.controlPanel}>
              <button className={styles.controlButton} onClick={handleRun}>
                Run Voxelization
              </button>
            </div>
            {evaluationError && (
              <div className={styles.warningBanner}>Error: {evaluationError}</div>
            )}
            <div className={styles.statusGrid}>
              <div className={styles.statusCard}>
                <div className={styles.statusLabel}>Status</div>
                <div className={styles.statusValue}>
                  {cellCount > 0 ? "Complete" : "Idle"}
                </div>
              </div>
              <div className={styles.statusCard}>
                <div className={styles.statusLabel}>Resolution</div>
                <div className={styles.statusValue}>{resolution}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'output' && (
          <div className={styles.outputTab}>
            {evaluationError && (
              <div className={styles.warningBanner}>Error: {evaluationError}</div>
            )}
            <div className={styles.outputGrid}>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Cell Count</div>
                <div className={styles.outputValue}>{cellCount > 0 ? cellCount : "—"}</div>
              </div>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Filled Count</div>
                <div className={styles.outputValue}>{filledCount > 0 ? filledCount : "—"}</div>
              </div>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Fill Ratio</div>
                <div className={styles.outputValue}>
                  {fillRatio > 0 ? `${(fillRatio * 100).toFixed(1)}%` : "—"}
                </div>
              </div>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Voxel Grid Resolution</div>
                <div className={styles.outputValue}>
                  {voxelGridResolution != null ? String(voxelGridResolution) : "—"}
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
  );
};
