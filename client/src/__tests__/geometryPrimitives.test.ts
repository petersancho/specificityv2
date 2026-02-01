import { describe, expect, it } from "vitest";
import { generatePrimitiveMesh } from "../geometry/mesh";
import {
  createBRepBox,
  createBRepCylinder,
  createBRepSphere,
  tessellateBRepToMesh,
} from "../geometry/brep";

const allFinite = (values: number[]) => values.every((value) => Number.isFinite(value));

describe("geometry primitives", () => {
  it("generates mesh primitives with valid data", () => {
    const mesh = generatePrimitiveMesh({ kind: "box", size: 1 });
    expect(mesh.positions.length).toBeGreaterThan(0);
    expect(mesh.indices.length).toBeGreaterThan(0);
    expect(allFinite(mesh.positions)).toBe(true);
  });

  it("builds B-Rep box topology", () => {
    const brep = createBRepBox(1, 2, 3, { x: 0, y: 0, z: 0 });
    expect(brep.vertices.length).toBe(8);
    expect(brep.edges.length).toBe(12);
    expect(brep.faces.length).toBe(6);
    expect(brep.loops.length).toBe(6);
    expect(brep.solids).toBeDefined();
    expect(brep.solids!.length).toBe(1);
  });

  it("tessellates B-Rep sphere and cylinder", () => {
    const sphere = createBRepSphere(1, { x: 0, y: 0, z: 0 });
    const sphereMesh = tessellateBRepToMesh(sphere);
    expect(sphereMesh.positions.length).toBeGreaterThan(0);

    const cylinder = createBRepCylinder(1, 2, { x: 0, y: 0, z: 0 });
    const cylinderMesh = tessellateBRepToMesh(cylinder);
    expect(cylinderMesh.indices.length).toBeGreaterThan(0);
  });
});
