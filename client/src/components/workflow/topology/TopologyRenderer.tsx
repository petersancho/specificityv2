import React, { useRef, useEffect } from "react";
import type { Vec3, RenderMesh } from "../../../types";
import type { SolverFrame, FEModel, GoalMarkers } from "./types";
import { generateIsosurfaceMeshFromDensities } from "./isosurface";

// ============================================================================
// RENDERING MODULE - Canvas-based 3D Visualization
// ============================================================================

type TopologyRendererProps = {
  fe: FEModel;
  markers: GoalMarkers;
  frame?: SolverFrame;
  width: number;
  height: number;
  isoValue: number;
  filterRadius: number;
  rampIters: number;
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

type CanvasPalette = {
  surface: string;
  ink: string;
  numeric: string;
  logic: string;
  data: string;
  feedbackSuccess: string;
  feedbackWarning: string;
  feedbackError: string;
  fontMono: string;
};

const readCssVar = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

const getCanvasPalette = (): CanvasPalette => ({
  surface: readCssVar("--ui-white", "#ffffff"),
  ink: readCssVar("--ui-black", "#000000"),
  numeric: readCssVar("--semantic-numeric", "#ffdd00"),
  logic: readCssVar("--semantic-logic", "#ff0099"),
  data: readCssVar("--semantic-data", "#00d4ff"),
  feedbackSuccess: readCssVar("--feedback-success", "#4ade80"),
  feedbackWarning: readCssVar("--feedback-warning", "#fbbf24"),
  feedbackError: readCssVar("--feedback-error", "#ff4444"),
  fontMono: readCssVar("--font-mono", "ui-monospace, monospace"),
});

const clampInt = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const sampleDensityAt = (
  densities: Float32Array,
  fe: FEModel,
  position: Vec3
) => {
  const { nx, ny, nz, bounds, elementSize } = fe;
  const fx = (position.x - bounds.min.x) / (elementSize.x || 1);
  const fy = (position.y - bounds.min.y) / (elementSize.y || 1);
  const fz = nz > 1 ? (position.z - bounds.min.z) / (elementSize.z || 1) : 0;

  const ex = clampInt(Math.floor(fx), 0, Math.max(0, nx - 1));
  const ey = clampInt(Math.floor(fy), 0, Math.max(0, ny - 1));
  const ez = clampInt(Math.floor(fz), 0, Math.max(0, nz - 1));
  const idx = ez * nx * ny + ey * nx + ex;
  return densities[idx] ?? 0;
};

const computeTriangleDensities = (
  mesh: RenderMesh,
  densities: Float32Array,
  fe: FEModel
) => {
  const triCount = Math.floor(mesh.indices.length / 3);
  const values = new Float32Array(triCount);
  for (let i = 0; i < triCount; i++) {
    const i0 = mesh.indices[i * 3] * 3;
    const i1 = mesh.indices[i * 3 + 1] * 3;
    const i2 = mesh.indices[i * 3 + 2] * 3;
    const cx =
      (mesh.positions[i0] + mesh.positions[i1] + mesh.positions[i2]) / 3;
    const cy =
      (mesh.positions[i0 + 1] + mesh.positions[i1 + 1] + mesh.positions[i2 + 1]) / 3;
    const cz =
      (mesh.positions[i0 + 2] + mesh.positions[i1 + 2] + mesh.positions[i2 + 2]) / 3;
    values[i] = sampleDensityAt(densities, fe, { x: cx, y: cy, z: cz });
  }
  return values;
};

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
  height,
  isoValue,
  filterRadius,
  rampIters,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animationRef = useRef<number>();
  const meshRef = useRef<RenderMesh | null>(null);
  const triDensitiesRef = useRef<Float32Array | null>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const palette = getCanvasPalette();

    let stopped = false;

    const render = () => {
      if (stopped) return;
      // Clear canvas
      ctx.fillStyle = palette.surface;
      ctx.fillRect(0, 0, width, height);
      
      rotationRef.current += 0.01;
      const rotation = rotationRef.current;
      const { nx, ny, nz, elementSize, bounds } = fe;

      const mesh = meshRef.current;
      const triDensities = triDensitiesRef.current;

      if (mesh && mesh.positions.length > 0 && mesh.indices.length > 0) {
        const projected: Array<{ x: number; y: number; z: number }> = [];
        for (let i = 0; i < mesh.positions.length; i += 3) {
          const pos = project(
            {
              x: mesh.positions[i],
              y: mesh.positions[i + 1],
              z: mesh.positions[i + 2],
            },
            bounds,
            width,
            height,
            rotation
          );
          projected.push({ ...pos, z: mesh.positions[i + 2] });
        }

        const triangles: Array<{ idx: number; depth: number }> = [];
        for (let i = 0; i < mesh.indices.length; i += 3) {
          const i0 = mesh.indices[i];
          const i1 = mesh.indices[i + 1];
          const i2 = mesh.indices[i + 2];
          const depth = (projected[i0].z + projected[i1].z + projected[i2].z) / 3;
          triangles.push({ idx: i / 3, depth });
        }
        triangles.sort((a, b) => a.depth - b.depth);

        const depthMin = Math.min(...triangles.map((t) => t.depth));
        const depthMax = Math.max(...triangles.map((t) => t.depth));
        const depthRange = Math.max(1e-6, depthMax - depthMin);

        for (const tri of triangles) {
          const baseIdx = tri.idx * 3;
          const i0 = mesh.indices[baseIdx];
          const i1 = mesh.indices[baseIdx + 1];
          const i2 = mesh.indices[baseIdx + 2];
          const p0 = projected[i0];
          const p1 = projected[i1];
          const p2 = projected[i2];

          const density = triDensities ? triDensities[tri.idx] : 0.5;
          const baseColor =
            density > 0.66 ? palette.numeric : density > 0.33 ? palette.data : palette.ink;
          const depthT = (tri.depth - depthMin) / depthRange;
          const alpha = 0.35 + depthT * 0.5;

          ctx.globalAlpha = alpha;
          ctx.fillStyle = baseColor;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.closePath();
          ctx.fill();

          ctx.globalAlpha = 0.2;
          ctx.strokeStyle = palette.ink;
          ctx.lineWidth = 0.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else {
        // Draw grid outline when no frame
        ctx.strokeStyle = palette.ink;
        ctx.globalAlpha = 0.3;
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
        ctx.globalAlpha = 1;
      }
      
      // Draw anchor markers (green crosses)
      ctx.strokeStyle = palette.logic;
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
      
      // Draw load markers (semantic data arrows)
      ctx.strokeStyle = palette.data;
      ctx.fillStyle = palette.data;
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
        ctx.fillStyle = palette.ink;
        ctx.font = `14px ${palette.fontMono}`;
        ctx.fillText(`Iteration: ${frame.iter}`, 10, 20);
        ctx.fillText(`Compliance: ${frame.compliance.toFixed(2)}`, 10, 40);
        ctx.fillText(`Volume: ${(frame.vol * 100).toFixed(1)}%`, 10, 60);
        ctx.fillText(`Change: ${frame.change.toFixed(4)}`, 10, 80);
        
        if (frame.converged) {
          ctx.fillStyle = palette.feedbackSuccess;
          ctx.font = `bold 16px ${palette.fontMono}`;
          ctx.fillText('CONVERGED', 10, 110);
        }
      }
      animationRef.current = requestAnimationFrame(render);
    };

    render();
    
    return () => {
      stopped = true;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [fe, markers, frame, width, height, isoValue, filterRadius, rampIters]);

  useEffect(() => {
    if (!frame || !frame.densities) {
      meshRef.current = null;
      triDensitiesRef.current = null;
      return;
    }

    const field = {
      densities: Float64Array.from(frame.densities),
      nx: fe.nx,
      ny: fe.ny,
      nz: fe.nz,
      bounds: fe.bounds,
    };

    const mesh = generateIsosurfaceMeshFromDensities(field, isoValue, {
      filterRadius,
      iter: frame.iter,
      rampIters,
      betaStart: 2,
      betaEnd: 16,
      eta: 0.5,
      refineFactor: 1,
      smoothing: {
        iterations: 2,
        lambda: 0.5,
        mu: -0.53,
      },
    });

    meshRef.current = mesh;
    triDensitiesRef.current = computeTriangleDensities(
      mesh,
      frame.densities,
      fe
    );
  }, [frame, fe, isoValue, filterRadius, rampIters]);
  
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
