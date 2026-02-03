import React, { useRef, useEffect } from "react";
import type { Vec3 } from "../../../types";
import type { SolverFrame, FEModel, GoalMarkers } from "./types";

// ============================================================================
// RENDERING MODULE - Canvas-based 3D Visualization
// ============================================================================

type TopologyRendererProps = {
  fe: FEModel;
  markers: GoalMarkers;
  frame?: SolverFrame;
  width: number;
  height: number;
};

/**
 * Project 3D point to 2D canvas coordinates
 */
function project(
  pos: Vec3,
  bounds: { min: Vec3; max: Vec3 },
  width: number,
  height: number,
  rotation: number
): { x: number; y: number } {
  // Center and normalize
  const cx = (pos.x - bounds.min.x) / (bounds.max.x - bounds.min.x) - 0.5;
  const cy = (pos.y - bounds.min.y) / (bounds.max.y - bounds.min.y) - 0.5;
  const cz = (pos.z - bounds.min.z) / (bounds.max.z - bounds.min.z) - 0.5;
  
  // Apply rotation around Y axis
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);
  const rx = cx * cosR - cz * sinR;
  const rz = cx * sinR + cz * cosR;
  
  // Isometric-style projection
  const scale = Math.min(width, height) * 0.8;
  const x = width / 2 + rx * scale;
  const y = height / 2 - cy * scale + rz * scale * 0.3;
  
  return { x, y };
}

/**
 * Get color for density value (blue = low, red = high)
 */
function densityToColor(rho: number): string {
  if (rho < 0.001) return 'rgba(240, 240, 240, 0.1)';
  
  // Blue to red gradient
  const r = Math.floor(rho * 255);
  const b = Math.floor((1 - rho) * 255);
  const alpha = 0.3 + rho * 0.7;
  
  return `rgba(${r}, 100, ${b}, ${alpha})`;
}

/**
 * Topology Renderer Component
 * 
 * Renders the optimization domain, density field, anchors, and loads
 * directly in a canvas element inside the dashboard.
 */
export const TopologyRenderer: React.FC<TopologyRendererProps> = ({
  fe,
  markers,
  frame,
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animationRef = useRef<number>();
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);
      
      rotationRef.current += 0.01;
      const rotation = rotationRef.current;
      const { nx, ny, nz, elementSize, bounds } = fe;
      
      // Draw density field (voxels)
      if (frame && frame.densities) {
        const totalVoxels = nx * ny * nz;
        const targetVoxels = 15000;
        const step = Math.max(1, Math.ceil(Math.pow(totalVoxels / targetVoxels, 1 / 3)));
        for (let ez = 0; ez < nz; ez += step) {
          for (let ey = 0; ey < ny; ey += step) {
            for (let ex = 0; ex < nx; ex += step) {
              const e = ez * nx * ny + ey * nx + ex;
              const rho = frame.densities[e];
              
              if (rho < 0.1) continue; // Skip very low density elements
              
              // Element center
              const cx = bounds.min.x + (ex + 0.5) * elementSize.x;
              const cy = bounds.min.y + (ey + 0.5) * elementSize.y;
              const cz = bounds.min.z + (ez + 0.5) * elementSize.z;
              
              const pos = project({ x: cx, y: cy, z: cz }, bounds, width, height, rotation);
              
              // Draw element as circle (size based on density)
              const radius = Math.max(2, rho * 8);
              ctx.fillStyle = densityToColor(rho);
              ctx.beginPath();
              ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      } else {
        // Draw grid outline when no frame
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.lineWidth = 1;
        
        // Draw bounding box
        const corners = [
          { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
          { x: bounds.max.x, y: bounds.min.y, z: bounds.min.z },
          { x: bounds.max.x, y: bounds.max.y, z: bounds.min.z },
          { x: bounds.min.x, y: bounds.max.y, z: bounds.min.z },
          { x: bounds.min.x, y: bounds.min.y, z: bounds.max.z },
          { x: bounds.max.x, y: bounds.min.y, z: bounds.max.z },
          { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z },
          { x: bounds.min.x, y: bounds.max.y, z: bounds.max.z }
        ];
        
        const projected = corners.map(c => project(c, bounds, width, height, rotation));
        
        // Draw edges
        const edges = [
          [0, 1], [1, 2], [2, 3], [3, 0], // Bottom
          [4, 5], [5, 6], [6, 7], [7, 4], // Top
          [0, 4], [1, 5], [2, 6], [3, 7]  // Vertical
        ];
        
        ctx.beginPath();
        for (const [i, j] of edges) {
          ctx.moveTo(projected[i].x, projected[i].y);
          ctx.lineTo(projected[j].x, projected[j].y);
        }
        ctx.stroke();
      }
      
      // Draw anchor markers (green crosses)
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      for (const anchor of markers.anchors) {
        const pos = project(anchor.position, bounds, width, height, rotation);
        const size = 12;
        
        ctx.beginPath();
        ctx.moveTo(pos.x - size, pos.y);
        ctx.lineTo(pos.x + size, pos.y);
        ctx.moveTo(pos.x, pos.y - size);
        ctx.lineTo(pos.x, pos.y + size);
        ctx.stroke();
      }
      
      // Draw load markers (red arrows)
      ctx.strokeStyle = '#ff0000';
      ctx.fillStyle = '#ff0000';
      ctx.lineWidth = 2;
      for (const load of markers.loads) {
        const pos = project(load.position, bounds, width, height, rotation);
        
        // Normalize force for display
        const fMag = Math.sqrt(load.force.x ** 2 + load.force.y ** 2 + load.force.z ** 2);
        if (fMag < 1e-10) continue;
        
        const scale = 50 / fMag;
        const fx = load.force.x * scale;
        const fy = load.force.y * scale;
        const fz = load.force.z * scale;
        
        const endPos = project(
          {
            x: load.position.x + fx,
            y: load.position.y + fy,
            z: load.position.z + fz
          },
          bounds,
          width,
          height,
          rotation
        );
        
        // Draw arrow
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(endPos.x, endPos.y);
        ctx.stroke();
        
        // Draw arrowhead
        const angle = Math.atan2(endPos.y - pos.y, endPos.x - pos.x);
        const headLen = 10;
        ctx.beginPath();
        ctx.moveTo(endPos.x, endPos.y);
        ctx.lineTo(
          endPos.x - headLen * Math.cos(angle - Math.PI / 6),
          endPos.y - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          endPos.x - headLen * Math.cos(angle + Math.PI / 6),
          endPos.y - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
      
      // Draw iteration info
      if (frame) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px monospace';
        ctx.fillText(`Iteration: ${frame.iter}`, 10, 20);
        ctx.fillText(`Compliance: ${frame.compliance.toFixed(2)}`, 10, 40);
        ctx.fillText(`Volume: ${(frame.vol * 100).toFixed(1)}%`, 10, 60);
        ctx.fillText(`Change: ${frame.change.toFixed(4)}`, 10, 80);
        
        if (frame.converged) {
          ctx.fillStyle = '#00ff00';
          ctx.font = 'bold 16px monospace';
          ctx.fillText('CONVERGED', 10, 110);
        }
      }
    };
    
    animationRef.current = requestAnimationFrame(render);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [fe, markers, frame, width, height]);
  
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: '100%',
        height: '100%',
        imageRendering: 'crisp-edges'
      }}
    />
  );
};
