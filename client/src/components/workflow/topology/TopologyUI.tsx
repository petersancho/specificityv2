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
// TOPOLOGY GEOMETRY PREVIEW - 3D mesh preview
// ============================================================================

interface TopologyGeometryPreviewProps { geometry: RenderMesh | null; width: number; height: number; }

export const TopologyGeometryPreview: React.FC<TopologyGeometryPreviewProps> = ({ geometry, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef({ x: 0.3, y: 0.5 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const [renderError, setRenderError] = React.useState<string | null>(null);

  console.log('[PREVIEW] TopologyGeometryPreview render:', {
    hasGeometry: !!geometry,
    positions: geometry?.positions?.length || 0,
    indices: geometry?.indices?.length || 0,
    width,
    height,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('[PREVIEW] Canvas ref is null!');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[PREVIEW] Could not get 2D context!');
      return;
    }
    
    console.log('[PREVIEW] Drawing canvas:', { width, height, hasGeometry: !!geometry });
    
    canvas.width = width; 
    canvas.height = height;
    ctx.fillStyle = '#f5f2ee'; 
    ctx.fillRect(0, 0, width, height);
    
    if (!geometry || !geometry.positions || geometry.positions.length === 0) {
      console.log('[PREVIEW] No geometry - showing waiting message');
      ctx.fillStyle = '#1f1f22'; 
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif'; 
      ctx.textAlign = 'center'; 
      ctx.textBaseline = 'middle';
      ctx.fillText('Waiting for geometry...', width / 2, height / 2 - 10);
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#6a6661';
      ctx.fillText('(updates every 10 iterations)', width / 2, height / 2 + 15);
      setRenderError(null);
      return;
    }
    
    try {
      // Quick validation of first few positions
      let invalidCount = 0;
      for (let i = 0; i < Math.min(geometry.positions.length, 200); i++) {
        const v = geometry.positions[i];
        if (!Number.isFinite(v)) {
          invalidCount++;
        }
      }
      
      if (invalidCount > 0) {
        const errMsg = `Invalid geometry: ${invalidCount} NaN/Infinity values in first 200 positions`;
        console.error('[PREVIEW]', errMsg);
        ctx.fillStyle = '#8b0000';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Invalid geometry (NaN/Inf)', width / 2, height / 2);
        setRenderError(errMsg);
        return;
      }
      
      console.log('[PREVIEW] Rendering geometry with', geometry.positions.length / 3, 'vertices and', (geometry.indices?.length || 0) / 3, 'triangles');
      renderGeometry(ctx, geometry, width, height, rotationRef.current);
      setRenderError(null);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error('[PREVIEW] Render error:', errMsg, e);
      ctx.fillStyle = '#8b0000';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Error rendering geometry', width / 2, height / 2);
      setRenderError(errMsg);
    }
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
    ctx.fillStyle = '#f5f2ee'; ctx.fillRect(0, 0, width, height);
    renderGeometry(ctx, geometry, width, height, rotationRef.current);
  };
  const handleMouseUp = () => { isDraggingRef.current = false; };

  const vertexCount = geometry?.positions?.length ? Math.floor(geometry.positions.length / 3) : 0;
  const triangleCount = geometry?.indices?.length ? Math.floor(geometry.indices.length / 3) : 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', cursor: isDraggingRef.current ? 'grabbing' : 'grab' }} 
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
        {renderError && <span style={{ color: '#8b0000' }}> • ERROR</span>}
      </div>
    </div>
  );
};

function renderGeometry(ctx: CanvasRenderingContext2D, geometry: RenderMesh, width: number, height: number, rotation: { x: number; y: number }) {
  const positions = geometry.positions;
  const indices = geometry.indices;
  
  if (!positions || positions.length === 0) return;
  if (!indices || indices.length === 0) return;

  // Step 1: Find bounds
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
  
  if (maxDim < 1e-9) return;
  
  const scale = (0.7 * Math.min(width, height)) / maxDim;

  // Step 2: Rotation matrices
  const cosX = Math.cos(rotation.x), sinX = Math.sin(rotation.x);
  const cosY = Math.cos(rotation.y), sinY = Math.sin(rotation.y);

  // Step 3: Project all vertices
  const numVerts = positions.length / 3;
  const screenX = new Float32Array(numVerts);
  const screenY = new Float32Array(numVerts);
  const screenZ = new Float32Array(numVerts);
  
  for (let i = 0; i < numVerts; i++) {
    let x = positions[i * 3] - cx;
    let y = positions[i * 3 + 1] - cy;
    let z = positions[i * 3 + 2] - cz;
    
    // Rotate X
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;
    
    // Rotate Y
    const x1 = x * cosY + z1 * sinY;
    const z2 = -x * sinY + z1 * cosY;
    
    screenX[i] = width / 2 + x1 * scale;
    screenY[i] = height / 2 - y1 * scale;
    screenZ[i] = z2;
  }

  // Step 4: Build triangle list with depth
  const numTris = indices.length / 3;
  const triDepth = new Float32Array(numTris);
  const triOrder = new Uint32Array(numTris);
  
  for (let i = 0; i < numTris; i++) {
    const i0 = indices[i * 3], i1 = indices[i * 3 + 1], i2 = indices[i * 3 + 2];
    triDepth[i] = (screenZ[i0] + screenZ[i1] + screenZ[i2]) / 3;
    triOrder[i] = i;
  }
  
  // Sort back-to-front
  triOrder.sort((a, b) => triDepth[a] - triDepth[b]);

  // Step 5: Draw triangles
  const zMin = triDepth[triOrder[0]];
  const zMax = triDepth[triOrder[numTris - 1]];
  const zRange = Math.max(0.001, zMax - zMin);
  
  for (let t = 0; t < numTris; t++) {
    const ti = triOrder[t];
    const i0 = indices[ti * 3], i1 = indices[ti * 3 + 1], i2 = indices[ti * 3 + 2];
    
    const x0 = screenX[i0], y0 = screenY[i0];
    const x1 = screenX[i1], y1 = screenY[i1];
    const x2 = screenX[i2], y2 = screenY[i2];
    
    // Depth-based shading (darker = further)
    const depth = (triDepth[ti] - zMin) / zRange;
    const shade = Math.round(180 + 75 * depth);
    
    ctx.fillStyle = `rgb(${shade}, 0, ${shade})`;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fill();
  }
}
