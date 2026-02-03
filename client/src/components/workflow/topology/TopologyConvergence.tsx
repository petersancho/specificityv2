import React from "react";
import type { SimulationHistory } from "./types";
import styles from "./TopologyConvergence.module.css";

// ============================================================================
// CONVERGENCE MONITORING MODULE
// ============================================================================

type TopologyConvergenceProps = {
  history: SimulationHistory;
  width: number;
  height: number;
};

/**
 * Convergence Monitor Component
 * 
 * Displays real-time convergence graphs showing the solver's evolution.
 */
export const TopologyConvergence: React.FC<TopologyConvergenceProps> = ({
  history,
  width,
  height
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    
    if (history.compliance.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for simulation...', width / 2, height / 2);
      return;
    }
    
    const padding = 40;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;
    
    // Find min/max for scaling
    const maxCompliance = Math.max(...history.compliance);
    const minCompliance = Math.min(...history.compliance);
    const complianceRange = maxCompliance - minCompliance || 1;
    
    // Draw axes
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Draw grid
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (graphHeight * i) / 5;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // Draw compliance curve
    if (history.compliance.length > 1) {
      ctx.strokeStyle = '#00aaff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let i = 0; i < history.compliance.length; i++) {
        const x = padding + (graphWidth * i) / (history.compliance.length - 1);
        const normalized = (history.compliance[i] - minCompliance) / complianceRange;
        const y = height - padding - normalized * graphHeight;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
    }
    
    // Draw labels
    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    
    // Y-axis labels
    for (let i = 0; i <= 5; i++) {
      const y = padding + (graphHeight * i) / 5;
      const value = maxCompliance - (complianceRange * i) / 5;
      ctx.fillText(value.toFixed(1), padding - 5, y + 4);
    }
    
    // X-axis label
    ctx.textAlign = 'center';
    ctx.fillText('Iteration', width / 2, height - 10);
    
    // Y-axis label
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Compliance', 0, 0);
    ctx.restore();
    
    // Title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Convergence History', width / 2, 20);
    
  }, [history, width, height]);
  
  return (
    <div className={styles.container}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: '100%' }}
      />
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Iterations:</span>
          <span className={styles.metricValue}>{history.compliance.length}</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Current Compliance:</span>
          <span className={styles.metricValue}>
            {history.compliance.length > 0
              ? history.compliance[history.compliance.length - 1].toFixed(2)
              : '—'}
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Current Volume:</span>
          <span className={styles.metricValue}>
            {history.vol.length > 0
              ? `${(history.vol[history.vol.length - 1] * 100).toFixed(1)}%`
              : '—'}
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Current Change:</span>
          <span className={styles.metricValue}>
            {history.change.length > 0
              ? history.change[history.change.length - 1].toFixed(4)
              : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};
