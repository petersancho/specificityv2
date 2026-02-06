import { describe, expect, it } from "vitest";
import { buildVoxelHeroGeometry } from "../solvers/solver-hero-geometry";
import { findVertexIndicesAtExtent } from "../solvers/rig-utils";
import { extractGoalMarkers, generateGeometryFromDensities } from "../../components/workflow/topology/geometry";
import { runSimp } from "../../components/workflow/topology/simp";
import { computeBoundsFromMesh } from "../../geometry/bounds";
import type { SimpParams } from "../../components/workflow/topology/types";
import type { RenderMesh } from "../../types";

type GoalBase = {
  goalType: "anchor" | "load";
  geometry: { elements: number[] };
  parameters?: Record<string, unknown>;
};

const buildSimpGoals = (mesh: RenderMesh): GoalBase[] => {
  const anchorIndices = findVertexIndicesAtExtent(mesh, "x", "min");
  const loadIndices = findVertexIndicesAtExtent(mesh, "x", "max");

  return [
    {
      goalType: "anchor",
      geometry: { elements: anchorIndices },
    },
    {
      goalType: "load",
      geometry: { elements: loadIndices },
      parameters: {
        force: { x: 0, y: -1, z: 0 },
      },
    },
  ];
};

describe("Topology optimization SIMP", () => {
  it("runs 3D SIMP and yields geometry output", async () => {
    const mesh = buildVoxelHeroGeometry();
    const goals = buildSimpGoals(mesh);
    const markers = extractGoalMarkers(mesh, goals);
    const bounds = computeBoundsFromMesh(mesh);
    markers.anchors.push(
      { position: { x: bounds.max.x, y: bounds.min.y, z: bounds.min.z }, vertices: [], dofMask: [true, true, true] },
      { position: { x: bounds.min.x, y: bounds.max.y, z: bounds.min.z }, vertices: [], dofMask: [true, true, true] }
    );

    expect(markers.anchors.length).toBeGreaterThan(0);
    expect(markers.loads.length).toBeGreaterThan(0);

    const params: SimpParams = {
      nx: 6,
      ny: 4,
      nz: 3,
      volFrac: 0.5,
      penal: 1.0,
      penalStart: 1.0,
      penalEnd: 3.0,
      penalRampIters: 20,
      rmin: 1.5,
      move: 0.2,
      maxIters: 4,
      tolChange: 1e-3,
      E0: 1.0,
      Emin: 1e-3,
      rhoMin: 1e-3,
      nu: 0.3,
      cgTol: 1e-4,
      cgMaxIters: 2000,
      strictConvergence: true,
    };

    let lastFrame: {
      iter: number;
      compliance: number;
      change: number;
      vol: number;
      densities: Float32Array;
    } | null = null;

    for await (const frame of runSimp(mesh, markers, params)) {
      lastFrame = frame;
      if (frame.iter >= params.maxIters) break;
    }

    expect(lastFrame).not.toBeNull();
    if (!lastFrame) return;

    const { densities } = lastFrame;
    expect(densities.length).toBe(params.nx * params.ny * params.nz);

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let mean = 0;
    for (const value of densities) {
      min = Math.min(min, value);
      max = Math.max(max, value);
      mean += value;
    }
    mean /= Math.max(1, densities.length);

    expect(Number.isFinite(lastFrame.compliance)).toBe(true);
    expect(min).toBeGreaterThanOrEqual(-1e-4);
    expect(max).toBeLessThanOrEqual(1.0 + 1e-4);
    expect(lastFrame.vol).toBeGreaterThan(0);
    expect(lastFrame.vol).toBeLessThanOrEqual(1.0 + 1e-4);
    expect(mean).toBeGreaterThan(0);
    expect(mean).toBeLessThanOrEqual(1.0 + 1e-4);

    const geometry = generateGeometryFromDensities(
      {
        densities: Float64Array.from(densities),
        nx: params.nx,
        ny: params.ny,
        nz: params.nz,
        bounds,
      },
      0.05
    );

    expect(geometry.vertexCount).toBeGreaterThan(0);
    expect(geometry.isosurface.positions.length).toBeGreaterThan(0);
  });
});
