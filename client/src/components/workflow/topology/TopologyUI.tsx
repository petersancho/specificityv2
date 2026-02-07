import React, { useRef, useEffect } from "react";
import type { RenderMesh } from "../../../types";
import type { SimulationHistory } from "./types";
import styles from "./TopologyConvergence.module.css";

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
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    if (history.compliance.length === 0) {
      ctx.fillStyle = '#6a6661';
      ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for simulation...', width / 2, height / 2);
      return;
    }
    
    const padding = 60, graphWidth = width - 2 * padding, graphHeight = height - 2 * padding;
    const maxC = Math.max(...history.compliance), minC = Math.min(...history.compliance);
    const padY = 0.05 * (maxC - minC || 1);
    const y0 = minC - padY, y1 = maxC + padY;
    const range = y1 - y0 || 1;
    
    const n = history.compliance.length;
    const maxIter = Math.max(1, n - 1);
    
    const xScale = (iter: number) => padding + (graphWidth * iter) / maxIter;
    const yScale = (c: number) => height - padding - ((c - y0) / range) * graphHeight;
    
    ctx.strokeStyle = '#e9e6e2';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (graphHeight * i) / 5;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 10; i++) {
      const x = padding + (graphWidth * i) / 10;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }
    
    ctx.strokeStyle = '#1f1f22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    if (n >= 1) {
      if (n === 1) {
        const x = xScale(0);
        const y = yScale(history.compliance[0]);
        ctx.fillStyle = '#1f1f22';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = '#1f1f22';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        history.compliance.forEach((c, i) => {
          const x = xScale(i);
          const y = yScale(c);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
        
        const bestIdx = history.compliance.indexOf(minC);
        const bestX = xScale(bestIdx);
        const bestY = yScale(minC);
        ctx.fillStyle = '#2a7';
        ctx.beginPath();
        ctx.arc(bestX, bestY, 5, 0, Math.PI * 2);
        ctx.fill();
        
        const lastX = xScale(n - 1);
        const lastY = yScale(history.compliance[n - 1]);
        ctx.fillStyle = '#d33';
        ctx.beginPath();
        ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.fillStyle = '#6a6661';
    ctx.font = '500 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const val = y1 - (range * i) / 5;
      const label = val >= 1000000 ? `${(val / 1000000).toFixed(2)}M` : val >= 1000 ? `${(val / 1000).toFixed(1)}K` : val.toFixed(1);
      ctx.fillText(label, padding - 8, padding + (graphHeight * i) / 5 + 4);
    }
    
    ctx.textAlign = 'center';
    const xTicks = Math.min(10, Math.ceil(maxIter / 100));
    for (let i = 0; i <= xTicks; i++) {
      const iter = Math.round((maxIter * i) / xTicks);
      const x = xScale(iter);
      ctx.fillText(iter.toString(), x, height - padding + 20);
    }
    
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6a6661';
    ctx.font = '600 9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('ITERATION', width / 2, height - 8);
    
    ctx.save();
    ctx.translate(12, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('COMPLIANCE', 0, 0);
    ctx.restore();
    
    ctx.fillStyle = '#1f1f22';
    ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CONVERGENCE HISTORY', width / 2, 24);
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
// TOPOLOGY GEOMETRY PREVIEW - 2D Canvas with depth-sorted triangles
// ============================================================================

interface TopologyGeometryPreviewProps { geometry: RenderMesh | null; width: number; height: number; }

export const TopologyGeometryPreview: React.FC<TopologyGeometryPreviewProps> = ({ geometry, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef({ x: 0.4, y: 0.6 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const [, forceUpdate] = React.useState(0);

  const renderScene = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) { console.log('[PREVIEW] No canvas ref'); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { console.log('[PREVIEW] No 2D context'); return; }

    ctx.fillStyle = '#f5f2ee';
    ctx.fillRect(0, 0, width, height);

    if (!geometry?.positions || !geometry?.indices || geometry.positions.length === 0) {
      console.log('[PREVIEW] No geometry data:', { 
        hasGeometry: !!geometry, 
        hasPositions: !!geometry?.positions, 
        hasIndices: !!geometry?.indices,
        posLength: geometry?.positions?.length 
      });
      return;
    }
    
    console.log('[PREVIEW] Rendering geometry:', {
      vertices: Math.floor(geometry.positions.length / 3),
      triangles: Math.floor(geometry.indices.length / 3)
    });

    const pos = geometry.positions;
    const idx = geometry.indices;
    const numVerts = Math.floor(pos.length / 3);
    const numTris = Math.floor(idx.length / 3);

    if (numVerts === 0 || numTris === 0) return;

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < numVerts; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      if (!isFinite(x) || !isFinite(y) || !isFinite(z)) continue;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }

    if (!isFinite(minX) || !isFinite(maxX)) return;

    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
    const sx = maxX - minX, sy = maxY - minY, sz = maxZ - minZ;
    const maxDim = Math.max(sx, sy, sz);
    if (maxDim < 1e-10) return;
    const scale = 0.7 * Math.min(width, height) / maxDim;

    const cosX = Math.cos(rotationRef.current.x), sinX = Math.sin(rotationRef.current.x);
    const cosY = Math.cos(rotationRef.current.y), sinY = Math.sin(rotationRef.current.y);

    const projected = new Float32Array(numVerts * 3);
    for (let i = 0; i < numVerts; i++) {
      const px = pos[i * 3] - cx, py = pos[i * 3 + 1] - cy, pz = pos[i * 3 + 2] - cz;
      const y1 = py * cosX - pz * sinX, z1 = py * sinX + pz * cosX;
      const x2 = px * cosY + z1 * sinY, z2 = -px * sinY + z1 * cosY;
      projected[i * 3] = width / 2 + x2 * scale;
      projected[i * 3 + 1] = height / 2 - y1 * scale;
      projected[i * 3 + 2] = z2;
    }

    const tris: { i0: number; i1: number; i2: number; z: number }[] = [];
    for (let i = 0; i < numTris; i++) {
      const i0 = idx[i * 3], i1 = idx[i * 3 + 1], i2 = idx[i * 3 + 2];
      if (i0 >= numVerts || i1 >= numVerts || i2 >= numVerts) continue;
      const z = (projected[i0 * 3 + 2] + projected[i1 * 3 + 2] + projected[i2 * 3 + 2]) / 3;
      if (!isFinite(z)) continue;
      tris.push({ i0, i1, i2, z });
    }
    if (tris.length === 0) return;
    tris.sort((a, b) => a.z - b.z);

    const zMin = tris[0].z, zMax = tris[tris.length - 1].z;
    const zRange = Math.max(zMax - zMin, 1e-10);

    for (const tri of tris) {
      const x0 = projected[tri.i0 * 3], y0 = projected[tri.i0 * 3 + 1];
      const x1 = projected[tri.i1 * 3], y1 = projected[tri.i1 * 3 + 1];
      const x2 = projected[tri.i2 * 3], y2 = projected[tri.i2 * 3 + 1];

      const t = (tri.z - zMin) / zRange;
      const r = Math.floor(120 + 135 * t);
      const g = Math.floor(40 * t);
      const b = Math.floor(120 + 135 * t);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.closePath();
      ctx.fill();
    }
  }, [geometry, width, height]);

  useEffect(() => { 
    console.log('[PREVIEW] useEffect triggered - calling renderScene');
    renderScene(); 
  }, [renderScene]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    rotationRef.current.y += (e.clientX - lastMouseRef.current.x) * 0.01;
    rotationRef.current.x += (e.clientY - lastMouseRef.current.y) * 0.01;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    renderScene();
    forceUpdate(n => n + 1);
  };

  const handleMouseUp = () => { isDraggingRef.current = false; };

  const vertexCount = geometry?.positions?.length ? Math.floor(geometry.positions.length / 3) : 0;
  const triangleCount = geometry?.indices?.length ? Math.floor(geometry.indices.length / 3) : 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: '100%', cursor: 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div style={{
        position: 'absolute',
        left: 8,
        bottom: 8,
        font: '10px -apple-system, BlinkMacSystemFont, sans-serif',
        color: '#5a5752',
        background: 'rgba(255,255,255,0.9)',
        padding: '4px 8px',
        borderRadius: 4,
        border: '1px solid rgba(0,0,0,0.1)',
      }}>
        {width}×{height} • {vertexCount} verts • {triangleCount} tris
      </div>
    </div>
  );
};
