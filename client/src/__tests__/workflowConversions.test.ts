import { describe, expect, it } from "vitest";
import type { Geometry, WorkflowEdge, WorkflowNode } from "../types";
import { evaluateWorkflow } from "../workflow/workflowEngine";
import { createCircleNurbs } from "../geometry/arc";
import { createBRepBox } from "../geometry/brep";
import { generateBoxMesh } from "../geometry/mesh";
import { buildPlaneFromNormal } from "../geometry/math";

const makeGeometryRef = (id: string, geometryId: string): WorkflowNode => ({
  id,
  type: "geometryReference",
  position: { x: 0, y: 0 },
  data: {
    label: "Geometry Ref",
    parameters: { geometryId },
  },
});

const makeNode = (id: string, type: WorkflowNode["type"], label: string): WorkflowNode => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: { label },
});

describe("workflow conversions", () => {
  it("evaluates NURBS to mesh, B-Rep to mesh, and mesh to B-Rep nodes", () => {
    const plane = buildPlaneFromNormal({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
    const nurbs = createCircleNurbs(plane, { x: 0, y: 0, z: 0 }, 1);

    const geometry: Geometry[] = [
      {
        id: "geo-nurbs",
        type: "nurbsCurve",
        nurbs,
        closed: true,
        layerId: "layer-default",
      },
      {
        id: "geo-brep",
        type: "brep",
        brep: createBRepBox(1, 1, 1, { x: 0, y: 0, z: 0 }),
        layerId: "layer-default",
      },
      {
        id: "geo-mesh",
        type: "mesh",
        mesh: generateBoxMesh({ width: 1, height: 1, depth: 1 }, 1),
        layerId: "layer-default",
      },
    ];

    const nodes: WorkflowNode[] = [
      makeGeometryRef("ref-nurbs", "geo-nurbs"),
      makeNode("nurbs-to-mesh", "nurbsToMesh", "NURBS to Mesh"),
      makeGeometryRef("ref-brep", "geo-brep"),
      makeNode("brep-to-mesh", "brepToMesh", "B-Rep to Mesh"),
      makeGeometryRef("ref-mesh", "geo-mesh"),
      makeNode("mesh-to-brep", "meshToBrep", "Mesh to B-Rep"),
    ];

    const edges: WorkflowEdge[] = [
      {
        id: "edge-nurbs",
        source: "ref-nurbs",
        target: "nurbs-to-mesh",
        sourceHandle: "geometry",
        targetHandle: "geometry",
      },
      {
        id: "edge-brep",
        source: "ref-brep",
        target: "brep-to-mesh",
        sourceHandle: "geometry",
        targetHandle: "geometry",
      },
      {
        id: "edge-mesh",
        source: "ref-mesh",
        target: "mesh-to-brep",
        sourceHandle: "geometry",
        targetHandle: "geometry",
      },
    ];

    const evaluated = evaluateWorkflow(nodes, edges, geometry).nodes;
    const nurbsToMesh = evaluated.find((node) => node.id === "nurbs-to-mesh");
    const brepToMesh = evaluated.find((node) => node.id === "brep-to-mesh");
    const meshToBrep = evaluated.find((node) => node.id === "mesh-to-brep");

    const nurbsMesh = nurbsToMesh?.data.outputs?.mesh as { positions?: number[] } | undefined;
    expect(nurbsMesh?.positions?.length ?? 0).toBeGreaterThan(0);

    const brepMesh = brepToMesh?.data.outputs?.mesh as { indices?: number[] } | undefined;
    expect(brepMesh?.indices?.length ?? 0).toBeGreaterThan(0);

    const brep = meshToBrep?.data.outputs?.brep as { faces?: unknown[] } | undefined;
    expect(brep?.faces?.length ?? 0).toBeGreaterThan(0);
  });
});
