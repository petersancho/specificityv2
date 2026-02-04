import React, { useRef, useEffect } from "react";
import type { Vec3, RenderMesh } from "../../../types";
import type { SolverFrame, FEModel, GoalMarkers, SimulationHistory } from "./types";
import styles from "./TopologyConvergence.module.css";

// ============================================================================
// TOPOLOGY RENDERER - Canvas-based density field visualization
// ============================================================================

type TopologyRendererProps = {
  fe: FEModel;
  markers: GoalMarkers;
  frame?: SolverFrame;
  width: number;
  height: number;
};

function project(pos: Vec3, bounds: { min: Vec3; max: Vec3 }, width: number, height: number, rotation: number): { x: number; y: number } {
  const cx = (pos.x - bounds.min.x) / (bounds.max.x - bounds.min.x) - 0.5;
  const cy = (pos.y - bounds.min.y) / (bounds.max.y - bounds.min.y) - 0.5;
  const cz = (pos.z - bounds.min.z) / (bounds.max.z - bounds.min.z) - 0.5;
  const cosR = Math.cos(rotation), sinR = Math.sin(rotation);
  const rx = cx * cosR - cz * sinR, rz = cx * sinR + cz * cosR;
  const scale = Math.min(width, height) * 0.8;
  return { x: width / 2 + rx * scale, y: height / 2 - cy * scale + rz * scale * 0.3 };
}

function densityToColor(rho: number): string {
  if (rho < 0.001) return 'rgba(240, 240, 240, 0.1)';
  return `rgba(${Math.floor(rho * 255)}, 100, ${Math.floor((1 - rho) * 255)}, ${0.3 + rho * 0.7})`;
}

export const TopologyRenderer: React.FC<TopologyRendererProps> = ({ fe, markers, frame, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animationRef = useRef<number>();
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const animate = () => {
      rotationRef.current += 0.005;
      render();
      animationRef.current = requestAnimationFrame(animate);
    };
    
    const render = () => {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);
      const rotation = rotationRef.current;
      const { nx, ny, nz, elementSize, bounds } = fe;
      
      if (frame && frame.densities) {
        for (let ez = 0; ez < nz; ez++) {
          for (let ey = 0; ey < ny; ey++) {
            for (let ex = 0; ex < nx; ex++) {
              const rho = frame.densities[ez * nx * ny + ey * nx + ex];
              if (rho < 0.1) continue;
              const cx = bounds.min.x + (ex + 0.5) * elementSize.x;
              const cy = bounds.min.y + (ey + 0.5) * elementSize.y;
              const cz = bounds.min.z + (ez + 0.5) * elementSize.z;
              const pos = project({ x: cx, y: cy, z: cz }, bounds, width, height, rotation);
              ctx.fillStyle = densityToColor(rho);
              ctx.beginPath();
              ctx.arc(pos.x, pos.y, Math.max(2, rho * 8), 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      } else {
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.lineWidth = 1;
        const corners = [
          { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z }, { x: bounds.max.x, y: bounds.min.y, z: bounds.min.z },
          { x: bounds.max.x, y: bounds.max.y, z: bounds.min.z }, { x: bounds.min.x, y: bounds.max.y, z: bounds.min.z },
          { x: bounds.min.x, y: bounds.min.y, z: bounds.max.z }, { x: bounds.max.x, y: bounds.min.y, z: bounds.max.z },
          { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z }, { x: bounds.min.x, y: bounds.max.y, z: bounds.max.z }
        ].map(c => project(c, bounds, width, height, rotation));
        ctx.beginPath();
        [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([i,j]) => { ctx.moveTo(corners[i].x, corners[i].y); ctx.lineTo(corners[j].x, corners[j].y); });
        ctx.stroke();
      }
      
      ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 3;
      for (const anchor of markers.anchors) {
        const pos = project(anchor.position, bounds, width, height, rotation);
        ctx.beginPath(); ctx.moveTo(pos.x - 12, pos.y); ctx.lineTo(pos.x + 12, pos.y); ctx.moveTo(pos.x, pos.y - 12); ctx.lineTo(pos.x, pos.y + 12); ctx.stroke();
      }
      
      ctx.strokeStyle = '#ff0000'; ctx.fillStyle = '#ff0000'; ctx.lineWidth = 2;
      for (const load of markers.loads) {
        const pos = project(load.position, bounds, width, height, rotation);
        const fMag = Math.sqrt(load.force.x ** 2 + load.force.y ** 2 + load.force.z ** 2);
        if (fMag < 1e-10) continue;
        const scale = 50 / fMag;
        const endPos = project({ x: load.position.x + load.force.x * scale, y: load.position.y + load.force.y * scale, z: load.position.z + load.force.z * scale }, bounds, width, height, rotation);
        ctx.beginPath(); ctx.moveTo(pos.x, pos.y); ctx.lineTo(endPos.x, endPos.y); ctx.stroke();
        const angle = Math.atan2(endPos.y - pos.y, endPos.x - pos.x);
        ctx.beginPath(); ctx.moveTo(endPos.x, endPos.y); ctx.lineTo(endPos.x - 10 * Math.cos(angle - Math.PI / 6), endPos.y - 10 * Math.sin(angle - Math.PI / 6)); ctx.lineTo(endPos.x - 10 * Math.cos(angle + Math.PI / 6), endPos.y - 10 * Math.sin(angle + Math.PI / 6)); ctx.closePath(); ctx.fill();
      }
      
      if (frame) {
        ctx.fillStyle = '#ffffff'; ctx.font = '14px monospace';
        ctx.fillText(`Iteration: ${frame.iter}`, 10, 20);
        ctx.fillText(`Compliance: ${frame.compliance.toFixed(2)}`, 10, 40);
        ctx.fillText(`Volume: ${(frame.vol * 100).toFixed(1)}%`, 10, 60);
        ctx.fillText(`Change: ${frame.change.toFixed(4)}`, 10, 80);
        if (frame.converged) { ctx.fillStyle = '#00ff00'; ctx.font = 'bold 16px monospace'; ctx.fillText('CONVERGED', 10, 110); }
      }
    };
    
    animate();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [fe, markers, frame, width, height]);
  
  return <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height: '100%', imageRendering: 'crisp-edges' }} />;
};

// ============================================================================
// TOPOLOGY CONVERGENCE - Real-time convergence graphs
// ============================================================================

type TopologyConvergenceProps = { history: SimulationHistory; width: number; height: number; };

export const TopologyConvergence: React.FC<TopologyConvergenceProps> = ({ history, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, width, height);
    
    if (history.compliance.length === 0) {
      ctx.fillStyle = '#666'; ctx.font = '14px monospace'; ctx.textAlign = 'center';
      ctx.fillText('Waiting for simulation...', width / 2, height / 2);
      return;
    }
    
    const padding = 40, graphWidth = width - 2 * padding, graphHeight = height - 2 * padding;
    const maxC = Math.max(...history.compliance), minC = Math.min(...history.compliance);
    const range = maxC - minC || 1;
    
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(padding, padding); ctx.lineTo(padding, height - padding); ctx.lineTo(width - padding, height - padding); ctx.stroke();
    
    ctx.strokeStyle = '#222'; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) { const y = padding + (graphHeight * i) / 5; ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(width - padding, y); ctx.stroke(); }
    
    if (history.compliance.length > 1) {
      ctx.strokeStyle = '#00aaff'; ctx.lineWidth = 2; ctx.beginPath();
      history.compliance.forEach((c, i) => {
        const x = padding + (graphWidth * i) / (history.compliance.length - 1);
        const y = height - padding - ((c - minC) / range) * graphHeight;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    
    ctx.fillStyle = '#aaa'; ctx.font = '12px monospace'; ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) { ctx.fillText((maxC - (range * i) / 5).toFixed(1), padding - 5, padding + (graphHeight * i) / 5 + 4); }
    ctx.textAlign = 'center'; ctx.fillText('Iteration', width / 2, height - 10);
    ctx.save(); ctx.translate(15, height / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('Compliance', 0, 0); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center'; ctx.fillText('Convergence History', width / 2, 20);
  }, [history, width, height]);
  
  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height: '100%' }} />
      <div className={styles.metrics}>
        <div className={styles.metric}><span className={styles.metricLabel}>Iterations:</span><span className={styles.metricValue}>{history.compliance.length}</span></div>
        <div className={styles.metric}><span className={styles.metricLabel}>Current Compliance:</span><span className={styles.metricValue}>{history.compliance.length > 0 ? history.compliance[history.compliance.length - 1].toFixed(2) : '—'}</span></div>
        <div className={styles.metric}><span className={styles.metricLabel}>Current Volume:</span><span className={styles.metricValue}>{history.vol.length > 0 ? `${(history.vol[history.vol.length - 1] * 100).toFixed(1)}%` : '—'}</span></div>
        <div className={styles.metric}><span className={styles.metricLabel}>Current Change:</span><span className={styles.metricValue}>{history.change.length > 0 ? history.change[history.change.length - 1].toFixed(4) : '—'}</span></div>
      </div>
    </div>
  );
};

// ============================================================================
// TOPOLOGY GEOMETRY PREVIEW - 3D mesh preview
// ============================================================================

interface TopologyGeometryPreviewProps { geometry: RenderMesh | null; width: number; height: number; }

export const TopologyGeometryPreview: React.FC<TopologyGeometryPreviewProps> = ({ geometry, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef({ x: 0.3, y: 0.5 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = width; canvas.height = height;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, width, height);
    
    if (!geometry || !geometry.positions || geometry.positions.length === 0) {
      ctx.fillStyle = '#444'; ctx.font = '14px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Waiting for geometry...', width / 2, height / 2);
      return;
    }
    
    renderGeometry(ctx, geometry, width, height, rotationRef.current);
  }, [geometry, width, height]);

  const handleMouseDown = (e: React.MouseEvent) => { isDraggingRef.current = true; lastMouseRef.current = { x: e.clientX, y: e.clientY }; };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    rotationRef.current.y += (e.clientX - lastMouseRef.current.x) * 0.01;
    rotationRef.current.x += (e.clientY - lastMouseRef.current.y) * 0.01;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    const canvas = canvasRef.current;
    if (!canvas || !geometry) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, width, height);
    renderGeometry(ctx, geometry, width, height, rotationRef.current);
  };
  const handleMouseUp = () => { isDraggingRef.current = false; };

  return <canvas ref={canvasRef} style={{ border: '1px solid #333', cursor: isDraggingRef.current ? 'grabbing' : 'grab', borderRadius: '4px' }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} />;
};

function renderGeometry(ctx: CanvasRenderingContext2D, geometry: RenderMesh, width: number, height: number, rotation: { x: number; y: number }) {
  const positions = geometry.positions, indices = geometry.indices;
  if (!positions || positions.length === 0) return;

  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    if (positions[i] < minX) minX = positions[i]; if (positions[i] > maxX) maxX = positions[i];
    if (positions[i + 1] < minY) minY = positions[i + 1]; if (positions[i + 1] > maxY) maxY = positions[i + 1];
    if (positions[i + 2] < minZ) minZ = positions[i + 2]; if (positions[i + 2] > maxZ) maxZ = positions[i + 2];
  }
  const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2, centerZ = (minZ + maxZ) / 2;
  const scale = Math.min(width, height) / (Math.max(maxX - minX, maxY - minY, maxZ - minZ) * 1.5);

  const projected: Array<{ x: number; y: number; z: number }> = [];
  const cosX = Math.cos(rotation.x), sinX = Math.sin(rotation.x), cosY = Math.cos(rotation.y), sinY = Math.sin(rotation.y);
  for (let i = 0; i < positions.length; i += 3) {
    let x = positions[i] - centerX, y = positions[i + 1] - centerY, z = positions[i + 2] - centerZ;
    const y1 = y * cosX - z * sinX, z1 = y * sinX + z * cosX; y = y1; z = z1;
    const x1 = x * cosY + z * sinY, z2 = -x * sinY + z * cosY; x = x1; z = z2;
    projected.push({ x: width / 2 + x * scale, y: height / 2 - y * scale, z });
  }

  if (indices && indices.length > 0) {
    const triangles: Array<{ indices: [number, number, number]; avgZ: number }> = [];
    for (let i = 0; i < indices.length; i += 3) {
      triangles.push({ indices: [indices[i], indices[i + 1], indices[i + 2]], avgZ: (projected[indices[i]].z + projected[indices[i + 1]].z + projected[indices[i + 2]].z) / 3 });
    }
    triangles.sort((a, b) => a.avgZ - b.avgZ);

    for (const tri of triangles) {
      const [i0, i1, i2] = tri.indices;
      const brightness = Math.max(0.3, Math.min(1.0, 0.5 + tri.avgZ / 10));
      const color = Math.floor(brightness * 255);
      ctx.fillStyle = `rgb(${color}, ${Math.floor(color * 0.8)}, ${Math.floor(color * 0.6)})`;
      ctx.strokeStyle = `rgb(${Math.floor(color * 0.5)}, ${Math.floor(color * 0.4)}, ${Math.floor(color * 0.3)})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(projected[i0].x, projected[i0].y); ctx.lineTo(projected[i1].x, projected[i1].y); ctx.lineTo(projected[i2].x, projected[i2].y); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
}
