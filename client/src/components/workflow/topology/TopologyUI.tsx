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

function triArea2(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
}

// Compute bounds from positions array with validation
function computeBounds3FromPositions(positions: ArrayLike<number>): {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
  center: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
} | null {
  if (!positions || positions.length < 3) return null;
  
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let hasValidPoint = false;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    
    hasValidPoint = true;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }

  if (!hasValidPoint) return null;

  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  const sx = maxX - minX;
  const sy = maxY - minY;
  const sz = maxZ - minZ;

  if (![minX, minY, minZ, maxX, maxY, maxZ, cx, cy, cz, sx, sy, sz].every(Number.isFinite)) return null;

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    center: { x: cx, y: cy, z: cz },
    size: { x: sx, y: sy, z: sz },
  };
}

function renderGeometry(ctx: CanvasRenderingContext2D, geometry: RenderMesh, width: number, height: number, rotation: { x: number; y: number }) {
  const positions = geometry.positions, indices = geometry.indices;
  if (!positions || positions.length === 0) {
    console.warn('[RENDER] No positions to render');
    return;
  }

  // Reset canvas state to avoid inherited transforms making things invisible
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  // Compute and validate bounds
  const bounds = computeBounds3FromPositions(positions);
  if (!bounds) {
    console.error('[RENDER] ❌ Invalid geometry positions (NaN/Infinity or empty)');
    ctx.fillStyle = '#8b0000';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Invalid geometry positions (NaN/Infinity)', 10, 20);
    ctx.restore();
    return;
  }

  console.log('[RENDER] ⚠️⚠️⚠️ Geometry bounds:', {
    min: bounds.min,
    max: bounds.max,
    center: bounds.center,
    size: bounds.size,
    canvasSize: { width, height },
  });
  
  console.log(`[RENDER] ⚠️⚠️⚠️ EXPLICIT GEOMETRY BOUNDS: min=(${bounds.min.x.toFixed(2)}, ${bounds.min.y.toFixed(2)}, ${bounds.min.z.toFixed(2)}), max=(${bounds.max.x.toFixed(2)}, ${bounds.max.y.toFixed(2)}, ${bounds.max.z.toFixed(2)}), size=(${bounds.size.x.toFixed(2)}, ${bounds.size.y.toFixed(2)}, ${bounds.size.z.toFixed(2)})`);

  // Compute safe scale
  const eps = 1e-9;
  const maxDim = Math.max(bounds.size.x, bounds.size.y, bounds.size.z);
  
  if (!Number.isFinite(maxDim) || maxDim < eps) {
    console.error('[RENDER] ❌ Degenerate mesh (maxDim too small):', maxDim);
    ctx.fillStyle = '#8b0000';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`Degenerate mesh (size=${bounds.size.x.toFixed(3)}, ${bounds.size.y.toFixed(3)}, ${bounds.size.z.toFixed(3)})`, 10, 20);
    ctx.restore();
    return;
  }

  // Scale to fit 80% of canvas with padding
  const scale = 0.8 * Math.min(width, height) / maxDim;
  
  if (!Number.isFinite(scale) || scale <= 0) {
    console.error('[RENDER] ❌ Invalid scale:', scale);
    ctx.fillStyle = '#8b0000';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`Invalid scale: ${scale}`, 10, 20);
    ctx.restore();
    return;
  }

  console.log('[RENDER] Scale calculation:', { maxDim, scale, canvasMin: Math.min(width, height) });

  // Project all vertices
  const projected: Array<{ x: number; y: number; z: number }> = [];
  const cosX = Math.cos(rotation.x), sinX = Math.sin(rotation.x);
  const cosY = Math.cos(rotation.y), sinY = Math.sin(rotation.y);
  
  for (let i = 0; i < positions.length; i += 3) {
    // Center the geometry
    let x = positions[i] - bounds.center.x;
    let y = positions[i + 1] - bounds.center.y;
    let z = positions[i + 2] - bounds.center.z;
    
    // Rotate around X axis
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;
    y = y1; z = z1;
    
    // Rotate around Y axis
    const x1 = x * cosY + z * sinY;
    const z2 = -x * sinY + z * cosY;
    x = x1; z = z2;
    
    // Project to screen (scale and center on canvas)
    const screenX = width / 2 + x * scale;
    const screenY = height / 2 - y * scale; // Flip Y for screen coordinates
    
    projected.push({ x: screenX, y: screenY, z });
  }
  
  // Log first few projected points to verify they're on-screen
  console.log('[RENDER] First 5 projected points:', projected.slice(0, 5).map(p => ({
    x: p.x.toFixed(1),
    y: p.y.toFixed(1),
    z: p.z.toFixed(3),
    onScreen: p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height
  })));

  // Check if any points are on screen
  let onScreenCount = 0;
  for (const p of projected) {
    if (p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height) {
      onScreenCount++;
    }
  }
  console.log('[RENDER] Points on screen:', onScreenCount, '/', projected.length);

  if (onScreenCount === 0) {
    console.error('[RENDER] ❌ All points are off-screen!');
    ctx.fillStyle = '#8b0000';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('All geometry points are off-screen', 10, 20);
    ctx.fillText(`Bounds: (${bounds.min.x.toFixed(1)}, ${bounds.min.y.toFixed(1)}, ${bounds.min.z.toFixed(1)}) to (${bounds.max.x.toFixed(1)}, ${bounds.max.y.toFixed(1)}, ${bounds.max.z.toFixed(1)})`, 10, 40);
    ctx.fillText(`Scale: ${scale.toFixed(3)}, MaxDim: ${maxDim.toFixed(3)}`, 10, 60);
    ctx.restore();
    return;
  }

  // Colors for rendering - USING BRIGHT MAGENTA FOR DEBUGGING
  const BASE = { r: 255, g: 0, b: 255 };      // Bright magenta
  const LIGHT = { r: 200, g: 0, b: 200 };     // Darker magenta
  const STROKE = { r: 150, g: 0, b: 150 };    // Even darker magenta
  const POINT_COLOR = `rgb(${BASE.r}, ${BASE.g}, ${BASE.b})`;

  // Fallback: if no indices, render vertices as points
  if (!indices || indices.length === 0) {
    console.warn('[RENDER] No triangle indices, rendering vertices as points');
    ctx.fillStyle = POINT_COLOR;
    for (const p of projected) {
      if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
        ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      }
    }
    ctx.restore();
    return;
  }

  // Build triangle list with depth sorting
  const triangles: Array<{ indices: [number, number, number]; avgZ: number }> = [];
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i], i1 = indices[i + 1], i2 = indices[i + 2];
    if (i0 >= projected.length || i1 >= projected.length || i2 >= projected.length) continue;
    
    const p0 = projected[i0], p1 = projected[i1], p2 = projected[i2];
    if (!Number.isFinite(p0.x) || !Number.isFinite(p1.x) || !Number.isFinite(p2.x)) continue;
    
    triangles.push({ 
      indices: [i0, i1, i2], 
      avgZ: (p0.z + p1.z + p2.z) / 3 
    });
  }
  
  console.log('[RENDER] Valid triangles:', triangles.length, '/', indices.length / 3);

  if (triangles.length === 0) {
    console.warn('[RENDER] No valid triangles, rendering vertices as points');
    ctx.fillStyle = POINT_COLOR;
    for (const p of projected) {
      if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
        ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      }
    }
    ctx.restore();
    return;
  }
  
  // Sort triangles by depth (back to front)
  triangles.sort((a, b) => a.avgZ - b.avgZ);

  const zMin = triangles[0].avgZ;
  const zMax = triangles[triangles.length - 1].avgZ;
  const zRange = Math.max(0.001, zMax - zMin);

  console.log('[RENDER] Z range:', { zMin: zMin.toFixed(3), zMax: zMax.toFixed(3), zRange: zRange.toFixed(3) });
  console.log('[RENDER] Rendering', triangles.length, 'triangles with z-depth shading');
  
  // Analyze triangle screen space distribution
  const triBounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  const triAreas: number[] = [];
  for (const tri of triangles) {
    const [i0, i1, i2] = tri.indices;
    const p0 = projected[i0], p1 = projected[i1], p2 = projected[i2];
    triBounds.minX = Math.min(triBounds.minX, p0.x, p1.x, p2.x);
    triBounds.maxX = Math.max(triBounds.maxX, p0.x, p1.x, p2.x);
    triBounds.minY = Math.min(triBounds.minY, p0.y, p1.y, p2.y);
    triBounds.maxY = Math.max(triBounds.maxY, p0.y, p1.y, p2.y);
    const area = triArea2(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
    triAreas.push(area);
  }
  triAreas.sort((a, b) => a - b);
  const medianArea = triAreas[Math.floor(triAreas.length / 2)];
  const maxArea = triAreas[triAreas.length - 1];
  
  console.log('[RENDER] ⚠️⚠️⚠️ Triangle screen bounds:', {
    x: `[${triBounds.minX.toFixed(1)}, ${triBounds.maxX.toFixed(1)}]`,
    y: `[${triBounds.minY.toFixed(1)}, ${triBounds.maxY.toFixed(1)}]`,
    width: (triBounds.maxX - triBounds.minX).toFixed(1),
    height: (triBounds.maxY - triBounds.minY).toFixed(1),
    medianArea: medianArea.toFixed(1),
    maxArea: maxArea.toFixed(1),
  });
  
  console.log(`[RENDER] ⚠️⚠️⚠️ EXPLICIT TRIANGLE BOUNDS: x=[${triBounds.minX.toFixed(1)}, ${triBounds.maxX.toFixed(1)}] (width=${(triBounds.maxX - triBounds.minX).toFixed(1)}), y=[${triBounds.minY.toFixed(1)}, ${triBounds.maxY.toFixed(1)}] (height=${(triBounds.maxY - triBounds.minY).toFixed(1)}), canvas=${width}x${height}`);
  
  // ⚠️⚠️⚠️ DEBUG: Log first 5 triangles with their screen coordinates
  console.log('[RENDER] ⚠️⚠️⚠️ First 5 triangles (screen coords):');
  for (let i = 0; i < Math.min(5, triangles.length); i++) {
    const tri = triangles[i];
    const [i0, i1, i2] = tri.indices;
    const p0 = projected[i0], p1 = projected[i1], p2 = projected[i2];
    const area = triArea2(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
    console.log(`  tri${i}: (${p0.x.toFixed(1)}, ${p0.y.toFixed(1)}) -> (${p1.x.toFixed(1)}, ${p1.y.toFixed(1)}) -> (${p2.x.toFixed(1)}, ${p2.y.toFixed(1)}), area=${area.toFixed(1)}`);
  }
  
  // ⚠️⚠️⚠️ DEBUG: Draw a test triangle at the center of the canvas to verify rendering works
  ctx.fillStyle = 'cyan';
  ctx.beginPath();
  ctx.moveTo(width / 2 - 50, height / 2 + 50);
  ctx.lineTo(width / 2 + 50, height / 2 + 50);
  ctx.lineTo(width / 2, height / 2 - 50);
  ctx.closePath();
  ctx.fill();
  console.log('[RENDER] ⚠️⚠️⚠️ Drew test cyan triangle at center');
  
  // First pass: fill all triangles (no stroke) for solid appearance
  let filledCount = 0;
  let skippedCount = 0;
  for (const tri of triangles) {
    const [i0, i1, i2] = tri.indices;
    const p0 = projected[i0], p1 = projected[i1], p2 = projected[i2];
    
    // Skip degenerate triangles (area < 0.5 pixels)
    const area = triArea2(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
    if (area < 0.5) {
      skippedCount++;
      continue;
    }
    
    const t = Math.max(0, Math.min(1, (tri.avgZ - zMin) / zRange));
    const r = Math.round(BASE.r + (LIGHT.r - BASE.r) * t);
    const g = Math.round(BASE.g + (LIGHT.g - BASE.g) * t);
    const b = Math.round(BASE.b + (LIGHT.b - BASE.b) * t);
    
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.closePath();
    ctx.fill();
    filledCount++;
  }
  
  console.log(`[RENDER] ⚠️⚠️⚠️ Filled ${filledCount} triangles, skipped ${skippedCount} degenerate triangles (area < 0.5px)`);
  
  // ⚠️⚠️⚠️ DEBUG: If most triangles were skipped, the geometry is too small
  if (skippedCount > filledCount) {
    console.error(`[RENDER] ❌ Most triangles are degenerate! ${skippedCount} skipped vs ${filledCount} filled`);
    console.error('[RENDER] ❌ This means the geometry is too small or all vertices are at the same position');
  }
  
  // Second pass: stroke only larger triangles for edge definition
  const STROKE_THRESHOLD = 50;
  ctx.strokeStyle = `rgb(${STROKE.r}, ${STROKE.g}, ${STROKE.b})`;
  ctx.lineWidth = 0.8;
  let strokedCount = 0;
  for (const tri of triangles) {
    const [i0, i1, i2] = tri.indices;
    const p0 = projected[i0], p1 = projected[i1], p2 = projected[i2];
    const area2 = triArea2(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
    
    if (area2 > STROKE_THRESHOLD) {
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.closePath();
      ctx.stroke();
      strokedCount++;
    }
  }
  
  console.log('[RENDER] ✅ Rendered', triangles.length, 'filled triangles,', strokedCount, 'with strokes');
  
  // Draw a bright red bounding box around the actual geometry to show where it is
  if (triBounds.minX < Infinity && triBounds.maxX > -Infinity) {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      triBounds.minX - 5,
      triBounds.minY - 5,
      (triBounds.maxX - triBounds.minX) + 10,
      (triBounds.maxY - triBounds.minY) + 10
    );
    
    // Draw a label showing the geometry size
    ctx.fillStyle = 'red';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(
      `Geometry: ${(triBounds.maxX - triBounds.minX).toFixed(0)}x${(triBounds.maxY - triBounds.minY).toFixed(0)}px`,
      triBounds.minX,
      triBounds.minY - 10
    );
  }
  
  ctx.restore();
}
