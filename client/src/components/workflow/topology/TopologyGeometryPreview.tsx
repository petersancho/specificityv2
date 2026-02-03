import React, { useRef, useEffect } from 'react';
import type { RenderMesh } from '../../../types';

/**
 * 3D Geometry Preview for Topology Optimization
 * Shows the generated multipipe structure in real-time
 */

interface TopologyGeometryPreviewProps {
  geometry: RenderMesh | null;
  width: number;
  height: number;
}

export const TopologyGeometryPreview: React.FC<TopologyGeometryPreviewProps> = ({
  geometry,
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef({ x: 0.3, y: 0.5 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    if (!geometry || !geometry.positions || geometry.positions.length === 0) {
      // Show placeholder
      ctx.fillStyle = '#444';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Waiting for geometry...', width / 2, height / 2);
      return;
    }

    // Render geometry
    renderGeometry(ctx, geometry, width, height, rotationRef.current);
  }, [geometry, width, height]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;

    rotationRef.current.y += dx * 0.01;
    rotationRef.current.x += dy * 0.01;

    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    // Re-render
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !geometry) return;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    renderGeometry(ctx, geometry, width, height, rotationRef.current);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        border: '1px solid #333',
        cursor: isDraggingRef.current ? 'grabbing' : 'grab',
        borderRadius: '4px'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};

/**
 * Render geometry with simple 3D projection
 */
function renderGeometry(
  ctx: CanvasRenderingContext2D,
  geometry: RenderMesh,
  width: number,
  height: number,
  rotation: { x: number; y: number }
) {
  const positions = geometry.positions;
  const indices = geometry.indices;

  if (!positions || positions.length === 0) return;

  // Calculate bounds
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const scale = Math.min(width, height) / (Math.max(maxX - minX, maxY - minY, maxZ - minZ) * 1.5);

  // Project vertices
  const projected: Array<{ x: number; y: number; z: number }> = [];
  for (let i = 0; i < positions.length; i += 3) {
    let x = positions[i] - centerX;
    let y = positions[i + 1] - centerY;
    let z = positions[i + 2] - centerZ;

    // Rotate around X axis
    const cosX = Math.cos(rotation.x);
    const sinX = Math.sin(rotation.x);
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;
    y = y1;
    z = z1;

    // Rotate around Y axis
    const cosY = Math.cos(rotation.y);
    const sinY = Math.sin(rotation.y);
    const x1 = x * cosY + z * sinY;
    const z2 = -x * sinY + z * cosY;
    x = x1;
    z = z2;

    // Project to 2D
    const screenX = width / 2 + x * scale;
    const screenY = height / 2 - y * scale;

    projected.push({ x: screenX, y: screenY, z });
  }

  // Draw triangles (if indexed)
  if (indices && indices.length > 0) {
    // Sort triangles by depth (painter's algorithm)
    const triangles: Array<{ indices: [number, number, number]; avgZ: number }> = [];
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];
      const avgZ = (projected[i0].z + projected[i1].z + projected[i2].z) / 3;
      triangles.push({ indices: [i0, i1, i2], avgZ });
    }
    triangles.sort((a, b) => a.avgZ - b.avgZ);

    // Draw triangles
    for (const tri of triangles) {
      const [i0, i1, i2] = tri.indices;
      const p0 = projected[i0];
      const p1 = projected[i1];
      const p2 = projected[i2];

      // Calculate lighting (simple)
      const brightness = Math.max(0.3, Math.min(1.0, 0.5 + tri.avgZ / 10));
      const color = Math.floor(brightness * 255);

      ctx.fillStyle = `rgb(${color}, ${Math.floor(color * 0.8)}, ${Math.floor(color * 0.6)})`;
      ctx.strokeStyle = `rgb(${Math.floor(color * 0.5)}, ${Math.floor(color * 0.4)}, ${Math.floor(color * 0.3)})`;
      ctx.lineWidth = 0.5;

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // Draw as wireframe
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;

    for (let i = 0; i < projected.length; i += 2) {
      const p0 = projected[i];
      const p1 = projected[i + 1];
      if (!p1) break;

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }
}
