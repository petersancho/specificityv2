import React, { useState, useEffect } from 'react';
import styles from './VoxelSimulatorDashboard.module.css';

interface VoxelSimulatorDashboardProps {
  nodeId: string;
  parameters: Record<string, unknown>;
  onParameterChange: (key: string, value: unknown) => void;
  onClose: () => void;
}

type TabId = 'setup' | 'simulator' | 'output';

export const VoxelSimulatorDashboard: React.FC<VoxelSimulatorDashboardProps> = ({
  nodeId,
  parameters,
  onParameterChange,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('setup');
  const [scale, setScale] = useState(100);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Voxel parameters
  const resolution = (parameters.resolution as number) ?? 32;
  
  // Simulated voxel data
  const [voxelData, setVoxelData] = useState({
    cellCount: 0,
    filledCount: 0,
    fillRatio: 0,
    voxelSize: 0,
  });
  
  useEffect(() => {
    // Simulate voxel calculation
    const cellCount = Math.pow(resolution, 3);
    const filledCount = Math.floor(cellCount * 0.35); // 35% filled
    const fillRatio = filledCount / cellCount;
    const voxelSize = 10.0 / resolution; // Assuming 10 unit domain
    
    setVoxelData({
      cellCount,
      filledCount,
      fillRatio,
      voxelSize,
    });
  }, [resolution]);
  
  const handleResolutionChange = (value: number) => {
    onParameterChange('resolution', value);
  };
  
  const handleStart = () => {
    setIsRunning(true);
    setProgress(0);
    
    // Simulate voxelization progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRunning(false);
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };
  
  const handleReset = () => {
    setIsRunning(false);
    setProgress(0);
  };
  
  return (
    <div className={styles.dashboard} style={{ fontSize: `${scale}%` }}>
      {/* Header */}
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
      
      {/* Tabs */}
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
      
      {/* Content */}
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
                    onChange={(e) => handleResolutionChange(Number(e.target.value))}
                    className={styles.slider}
                  />
                  <div className={styles.parameterHint}>
                    Number of voxels along longest axis (4-128)
                  </div>
                </div>
              </div>
            </div>
            
            <div className={styles.section}>
              <h3>Voxel Grid Info</h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoCard}>
                  <div className={styles.infoLabel}>Total Cells</div>
                  <div className={styles.infoValue}>{voxelData.cellCount.toLocaleString()}</div>
                </div>
                <div className={styles.infoCard}>
                  <div className={styles.infoLabel}>Voxel Size</div>
                  <div className={styles.infoValue}>{voxelData.voxelSize.toFixed(4)}</div>
                </div>
                <div className={styles.infoCard}>
                  <div className={styles.infoLabel}>Grid Dimensions</div>
                  <div className={styles.infoValue}>{resolution} × {resolution} × {resolution}</div>
                </div>
              </div>
            </div>
            
            <div className={styles.section}>
              <h3>Geometry Preview</h3>
              <div className={styles.geometryPreview}>
                <div className={styles.geometryPlaceholder}>
                  <span>🧊</span>
                  <p>Input geometry will be voxelized</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'simulator' && (
          <div className={styles.simulatorTab}>
            <div className={styles.controlPanel}>
              <button
                onClick={handleStart}
                disabled={isRunning}
                className={`${styles.controlButton} ${styles.startButton}`}
              >
                {isRunning ? 'Running...' : 'Start Voxelization'}
              </button>
              <button
                onClick={handleReset}
                disabled={isRunning}
                className={`${styles.controlButton} ${styles.resetButton}`}
              >
                Reset
              </button>
            </div>
            
            <div className={styles.progressSection}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className={styles.progressLabel}>{progress}% Complete</div>
            </div>
            
            <div className={styles.visualizationGrid}>
              <div className={styles.voxelVisualization}>
                <h4>3D Voxel Grid</h4>
                <div className={styles.voxelGridPlaceholder}>
                  <div className={styles.voxelCube}>
                    <div className={styles.voxelFace} />
                    <div className={styles.voxelFace} />
                    <div className={styles.voxelFace} />
                  </div>
                  <p>Voxel grid visualization</p>
                </div>
              </div>
              
              <div className={styles.sliceViews}>
                <h4>Slice Views</h4>
                <div className={styles.sliceGrid}>
                  <div className={styles.sliceView}>
                    <div className={styles.sliceLabel}>XY Plane</div>
                    <div className={styles.slicePlaceholder}>
                      <div className={styles.slicePattern} />
                    </div>
                  </div>
                  <div className={styles.sliceView}>
                    <div className={styles.sliceLabel}>XZ Plane</div>
                    <div className={styles.slicePlaceholder}>
                      <div className={styles.slicePattern} />
                    </div>
                  </div>
                  <div className={styles.sliceView}>
                    <div className={styles.sliceLabel}>YZ Plane</div>
                    <div className={styles.slicePlaceholder}>
                      <div className={styles.slicePattern} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={styles.statsSection}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Filled Voxels</div>
                <div className={styles.statValue}>{voxelData.filledCount.toLocaleString()}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Fill Ratio</div>
                <div className={styles.statValue}>{(voxelData.fillRatio * 100).toFixed(1)}%</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Memory Usage</div>
                <div className={styles.statValue}>{(voxelData.cellCount * 4 / 1024 / 1024).toFixed(2)} MB</div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'output' && (
          <div className={styles.outputTab}>
            <div className={styles.section}>
              <h3>Voxel Mesh</h3>
              <div className={styles.meshPreview}>
                <div className={styles.meshPlaceholder}>
                  <span>🧊</span>
                  <p>Voxelized mesh output</p>
                </div>
              </div>
            </div>
            
            <div className={styles.section}>
              <h3>Statistics</h3>
              <div className={styles.statsGrid}>
                <div className={styles.statRow}>
                  <span className={styles.statRowLabel}>Total Cells:</span>
                  <span className={styles.statRowValue}>{voxelData.cellCount.toLocaleString()}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statRowLabel}>Filled Cells:</span>
                  <span className={styles.statRowValue}>{voxelData.filledCount.toLocaleString()}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statRowLabel}>Fill Ratio:</span>
                  <span className={styles.statRowValue}>{(voxelData.fillRatio * 100).toFixed(2)}%</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statRowLabel}>Voxel Size:</span>
                  <span className={styles.statRowValue}>{voxelData.voxelSize.toFixed(4)} units</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statRowLabel}>Resolution:</span>
                  <span className={styles.statRowValue}>{resolution} × {resolution} × {resolution}</span>
                </div>
              </div>
            </div>
            
            <div className={styles.section}>
              <h3>Export Options</h3>
              <div className={styles.exportButtons}>
                <button className={styles.exportButton}>Export Voxel Grid (.vox)</button>
                <button className={styles.exportButton}>Export Mesh (.obj)</button>
                <button className={styles.exportButton}>Export Data (.json)</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
